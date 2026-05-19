import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';

import '../api.dart';
import '../computed.dart';
import '../ui.dart';

/// One-record editor. Per-type widgets for editable fields (text, number,
/// date, image, link, etc.) and live previews for formula / agregacion.
/// Detalle fields render as an embedded sub-list of linked child records,
/// but only after the parent record has been saved (we need its id for the
/// child link).
class RecordEditorScreen extends StatefulWidget {
  final int tableId;
  final List<FieldEntry> fields;
  final RecordEntry? existing;
  final Map<int, TableRecords> childCache;

  const RecordEditorScreen({
    super.key,
    required this.tableId,
    required this.fields,
    this.existing,
    required this.childCache,
  });

  @override
  State<RecordEditorScreen> createState() => _RecordEditorScreenState();
}

class _RecordEditorScreenState extends State<RecordEditorScreen> {
  late Map<int, String> _values;
  int? _recordId;
  bool _saving = false;
  String? _error;
  bool _dirty = false;

  @override
  void initState() {
    super.initState();
    _recordId = widget.existing?.id;
    _values = {};
    for (final f in widget.fields) {
      if (f.id == null) continue;
      _values[f.id!] = widget.existing?.values[f.id.toString()] ?? '';
    }
  }

  RecordEntry _currentRecord() => RecordEntry(
        id: _recordId ?? -1,
        values: _values.map((k, v) => MapEntry(k.toString(), v)),
      );

  Map<int, String> _cleanValues() {
    // Strip values for computed/derived fields, matching the web behavior.
    final clean = <int, String>{};
    for (final entry in _values.entries) {
      final f = widget.fields.firstWhere(
        (x) => x.id == entry.key,
        orElse: () => FieldEntry(name: '', type: FieldType.text),
      );
      if (!f.type.isValueEditable) continue;
      clean[entry.key] = entry.value;
    }
    return clean;
  }

  Future<void> _save({bool pop = true}) async {
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final values = _cleanValues();
      if (_recordId == null) {
        final created = await ApiClient.instance.createRecord(widget.tableId, values);
        _recordId = created.id;
      } else {
        await ApiClient.instance.updateRecord(_recordId!, values);
      }
      _dirty = true;
      if (!mounted) return;
      if (pop) {
        Navigator.of(context).pop(true);
      } else {
        setState(() => _saving = false);
      }
    } catch (e) {
      setState(() {
        _saving = false;
        _error = '$e';
      });
    }
  }

  void _setValue(int fieldId, String v) {
    setState(() => _values[fieldId] = v);
  }

  @override
  Widget build(BuildContext context) {
    final ctx = ComputeContext(fields: widget.fields, childCache: widget.childCache);
    final detalleFields = widget.fields.where((f) => f.type == FieldType.detalle).toList();
    final hasDetalle = detalleFields.isNotEmpty;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) Navigator.of(context).pop(_dirty);
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(_recordId == null ? 'Nuevo registro' : 'Editar registro'),
          actions: [
            if (_saving)
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 12),
                child: Center(
                  child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
                ),
              )
            else
              IconButton(icon: const Icon(Icons.check), onPressed: () => _save()),
          ],
        ),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(_error!, style: const TextStyle(color: Colors.red)),
              ),
            for (final f in widget.fields.where((f) => f.type != FieldType.detalle)) ...[
              _fieldEditor(f, ctx),
              const SizedBox(height: 16),
            ],
            if (hasDetalle) ...[
              const Divider(),
              const SizedBox(height: 8),
              if (_recordId == null)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Column(
                    children: [
                      const Text(
                        'Guarda este registro primero para añadir su detalle.',
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 8),
                      FilledButton.icon(
                        onPressed: _saving ? null : () => _save(pop: false),
                        icon: const Icon(Icons.save),
                        label: const Text('Guardar para continuar'),
                      ),
                    ],
                  ),
                )
              else
                for (final f in detalleFields)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: _DetalleSubgrid(
                      field: f,
                      parentRecordId: _recordId!,
                      childCache: widget.childCache,
                      onChanged: () => setState(() {
                        _dirty = true;
                      }),
                    ),
                  ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _fieldEditor(FieldEntry f, ComputeContext ctx) {
    final fid = f.id;
    if (fid == null) return const SizedBox.shrink();
    final value = _values[fid] ?? '';
    final current = _currentRecord();

    switch (f.type) {
      case FieldType.formula:
        return _ComputedPreview(
          label: f.name,
          hint: 'Fórmula: ${f.options.formulaExpr ?? ''}',
          value: () {
            final v = evalFormula(f.options.formulaExpr, current, ctx);
            if (v == null || !v.isFinite) return '-';
            return v.toStringAsFixed(f.options.decimals ?? 2);
          }(),
        );
      case FieldType.agregacion:
        return _ComputedPreview(
          label: f.name,
          hint: 'Agregación ${f.options.aggOperation.apiValue}',
          value: () {
            final v = computeAggregation(f, current, ctx);
            if (v == null) return '0';
            return v.toStringAsFixed(f.options.decimals ?? 2);
          }(),
        );
      case FieldType.memo:
        return _TextLikeField(
          label: f.name,
          initial: value,
          minLines: 3,
          maxLines: 6,
          onChanged: (v) => _setValue(fid, v),
        );
      case FieldType.number:
      case FieldType.decimal:
        return _TextLikeField(
          label: f.name,
          initial: value,
          keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
          onChanged: (v) => _setValue(fid, v),
        );
      case FieldType.boolean:
        return _BooleanField(
          label: f.name,
          value: value,
          onChanged: (v) => _setValue(fid, v),
        );
      case FieldType.date:
        return _DateField(
          label: f.name,
          value: value,
          onChanged: (v) => _setValue(fid, v),
        );
      case FieldType.dropdown:
        return _DropdownField(
          label: f.name,
          value: value,
          choices: f.options.choices,
          onChanged: (v) => _setValue(fid, v),
        );
      case FieldType.image:
        return _ImageField(
          label: f.name,
          value: value,
          onChanged: (v) => _setValue(fid, v),
        );
      case FieldType.link:
        return _LinkField(
          label: f.name,
          value: value,
          linkTableId: f.options.linkTableId,
          childCache: widget.childCache,
          onChanged: (v) => _setValue(fid, v),
        );
      case FieldType.detalle:
        return const SizedBox.shrink();
      case FieldType.text:
        return _TextLikeField(
          label: f.name,
          initial: value,
          onChanged: (v) => _setValue(fid, v),
        );
    }
  }
}

class _ComputedPreview extends StatelessWidget {
  final String label;
  final String hint;
  final String value;
  const _ComputedPreview({required this.label, required this.hint, required this.value});

  @override
  Widget build(BuildContext context) {
    return InputDecorator(
      decoration: InputDecoration(
        labelText: label,
        helperText: hint,
        border: const OutlineInputBorder(),
        suffixIcon: const Icon(Icons.functions),
      ),
      child: Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
    );
  }
}

class _TextLikeField extends StatefulWidget {
  final String label;
  final String initial;
  final TextInputType? keyboardType;
  final int minLines;
  final int maxLines;
  final ValueChanged<String> onChanged;
  const _TextLikeField({
    required this.label,
    required this.initial,
    this.keyboardType,
    this.minLines = 1,
    this.maxLines = 1,
    required this.onChanged,
  });
  @override
  State<_TextLikeField> createState() => _TextLikeFieldState();
}

class _TextLikeFieldState extends State<_TextLikeField> {
  late final TextEditingController _ctrl;
  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController(text: widget.initial);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: _ctrl,
      keyboardType: widget.keyboardType,
      minLines: widget.minLines,
      maxLines: widget.maxLines,
      decoration: InputDecoration(
        labelText: widget.label,
        border: const OutlineInputBorder(),
      ),
      onChanged: widget.onChanged,
    );
  }
}

class _BooleanField extends StatelessWidget {
  final String label;
  final String value;
  final ValueChanged<String> onChanged;
  const _BooleanField({
    required this.label,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final on = value == '1' || value.toLowerCase() == 'true';
    return SwitchListTile(
      title: Text(label),
      value: on,
      onChanged: (v) => onChanged(v ? '1' : '0'),
      shape: RoundedRectangleBorder(
        side: BorderSide(color: Theme.of(context).colorScheme.outline),
        borderRadius: BorderRadius.circular(4),
      ),
    );
  }
}

class _DateField extends StatelessWidget {
  final String label;
  final String value;
  final ValueChanged<String> onChanged;
  const _DateField({
    required this.label,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    DateTime? parsed;
    if (value.isNotEmpty) {
      try {
        parsed = DateTime.parse(value);
      } catch (_) {}
    }
    return InkWell(
      onTap: () async {
        final now = DateTime.now();
        final picked = await showDatePicker(
          context: context,
          initialDate: parsed ?? now,
          firstDate: DateTime(1900),
          lastDate: DateTime(now.year + 30),
        );
        if (picked != null) {
          onChanged(DateFormat('yyyy-MM-dd').format(picked));
        }
      },
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          border: const OutlineInputBorder(),
          suffixIcon: const Icon(Icons.calendar_today),
        ),
        child: Text(value.isEmpty ? 'Seleccionar fecha' : value),
      ),
    );
  }
}

class _DropdownField extends StatelessWidget {
  final String label;
  final String value;
  final List<String> choices;
  final ValueChanged<String> onChanged;
  const _DropdownField({
    required this.label,
    required this.value,
    required this.choices,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return DropdownButtonFormField<String>(
      initialValue: choices.contains(value) ? value : null,
      isExpanded: true,
      decoration: InputDecoration(
        labelText: label,
        border: const OutlineInputBorder(),
      ),
      items: [
        const DropdownMenuItem<String>(value: null, child: Text('—')),
        ...choices.map((c) => DropdownMenuItem(value: c, child: Text(c))),
      ],
      onChanged: (v) => onChanged(v ?? ''),
    );
  }
}

class _ImageField extends StatefulWidget {
  final String label;
  final String value;
  final ValueChanged<String> onChanged;
  const _ImageField({
    required this.label,
    required this.value,
    required this.onChanged,
  });
  @override
  State<_ImageField> createState() => _ImageFieldState();
}

class _ImageFieldState extends State<_ImageField> {
  bool _uploading = false;

  Future<void> _pick(ImageSource source) async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: source, imageQuality: 90);
    if (picked == null) return;
    setState(() => _uploading = true);
    try {
      final filename = await ApiClient.instance.uploadImage(File(picked.path));
      widget.onChanged(filename);
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final url = widget.value.isEmpty ? null : ApiClient.instance.fileUrl(widget.value);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.label, style: const TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            if (url != null)
              ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: Image.network(
                  url,
                  height: 160,
                  fit: BoxFit.cover,
                  cacheHeight: 320,
                  errorBuilder: (_, __, ___) => const SizedBox(
                    height: 80,
                    child: Center(child: Text('No se pudo cargar la imagen')),
                  ),
                ),
              ),
            const SizedBox(height: 8),
            Row(
              children: [
                TextButton.icon(
                  onPressed: _uploading ? null : () => _pick(ImageSource.camera),
                  icon: const Icon(Icons.camera_alt),
                  label: const Text('Cámara'),
                ),
                TextButton.icon(
                  onPressed: _uploading ? null : () => _pick(ImageSource.gallery),
                  icon: const Icon(Icons.photo_library),
                  label: const Text('Galería'),
                ),
                const Spacer(),
                if (url != null)
                  TextButton.icon(
                    onPressed: _uploading ? null : () => widget.onChanged(''),
                    icon: const Icon(Icons.close, color: Colors.red),
                    label: const Text('Quitar', style: TextStyle(color: Colors.red)),
                  ),
                if (_uploading)
                  const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _LinkField extends StatefulWidget {
  final String label;
  final String value;
  final int? linkTableId;
  final Map<int, TableRecords> childCache;
  final ValueChanged<String> onChanged;
  const _LinkField({
    required this.label,
    required this.value,
    required this.linkTableId,
    required this.childCache,
    required this.onChanged,
  });

  @override
  State<_LinkField> createState() => _LinkFieldState();
}

class _LinkFieldState extends State<_LinkField> {
  TableRecords? _linked;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final id = widget.linkTableId;
    if (id == null) {
      setState(() => _loading = false);
      return;
    }
    if (widget.childCache.containsKey(id)) {
      setState(() {
        _linked = widget.childCache[id];
        _loading = false;
      });
      return;
    }
    try {
      final data = await ApiClient.instance.getRecords(id);
      widget.childCache[id] = data;
      setState(() {
        _linked = data;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  String _labelFor(RecordEntry r) {
    if (_linked == null) return '#${r.id}';
    return linkRecordLabel(_linked!, r);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return InputDecorator(
        decoration: InputDecoration(
          labelText: widget.label,
          border: const OutlineInputBorder(),
        ),
        child: const Text('Cargando…'),
      );
    }
    if (widget.linkTableId == null || _linked == null) {
      return InputDecorator(
        decoration: InputDecoration(
          labelText: widget.label,
          helperText: 'Sin tabla destino configurada',
          border: const OutlineInputBorder(),
        ),
        child: Text(widget.value.isEmpty ? '—' : widget.value),
      );
    }
    final currentId = int.tryParse(widget.value);
    return DropdownButtonFormField<int?>(
      initialValue: currentId,
      isExpanded: true,
      decoration: InputDecoration(
        labelText: widget.label,
        border: const OutlineInputBorder(),
      ),
      items: [
        const DropdownMenuItem<int?>(value: null, child: Text('—')),
        ..._linked!.records.map(
          (r) => DropdownMenuItem<int?>(value: r.id, child: Text(_labelFor(r))),
        ),
      ],
      onChanged: (v) => widget.onChanged(v?.toString() ?? ''),
    );
  }
}

/// Embedded list editor for a detalle field: shows linked child records and
/// lets the user add / edit / delete them inline. New child records get the
/// parent's link field pre-filled so they appear in this list immediately.
class _DetalleSubgrid extends StatefulWidget {
  final FieldEntry field;
  final int parentRecordId;
  final Map<int, TableRecords> childCache;
  final VoidCallback onChanged;

  const _DetalleSubgrid({
    required this.field,
    required this.parentRecordId,
    required this.childCache,
    required this.onChanged,
  });

  @override
  State<_DetalleSubgrid> createState() => _DetalleSubgridState();
}

class _DetalleSubgridState extends State<_DetalleSubgrid> {
  TableRecords? _child;
  bool _loading = true;

  int? get _childTableId => widget.field.options.detalleTableId;
  int? get _linkFieldId => widget.field.options.detalleLinkFieldId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final id = _childTableId;
    if (id == null) {
      setState(() => _loading = false);
      return;
    }
    try {
      final data = await ApiClient.instance.getRecords(id);
      widget.childCache[id] = data;
      setState(() {
        _child = data;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  List<RecordEntry> get _myChildren {
    if (_child == null || _linkFieldId == null) return const [];
    return _child!.records.where((cr) {
      final pid = cr.values[_linkFieldId.toString()] ?? '';
      return int.tryParse(pid) == widget.parentRecordId;
    }).toList();
  }

  Future<void> _addChild() async {
    if (_child == null || _linkFieldId == null || _childTableId == null) return;
    // Stub a record with the link field pre-set to this parent. The editor
    // shows the link as a normal field — the user can leave it alone.
    final stub = RecordEntry(
      id: -1,
      values: {_linkFieldId.toString(): widget.parentRecordId.toString()},
    );
    final saved = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => RecordEditorScreen(
          tableId: _childTableId!,
          fields: _child!.fields,
          existing: stub,
          childCache: widget.childCache,
        ),
      ),
    );
    // We always reload — even if the saved flag isn't true — because the
    // editor's PopScope returns the dirty flag instead.
    if (saved == true || saved == null) await _load();
    widget.onChanged();
  }

  Future<void> _editChild(RecordEntry r) async {
    if (_child == null || _childTableId == null) return;
    final saved = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => RecordEditorScreen(
          tableId: _childTableId!,
          fields: _child!.fields,
          existing: r,
          childCache: widget.childCache,
        ),
      ),
    );
    if (saved == true || saved == null) await _load();
    widget.onChanged();
  }

  Future<void> _deleteChild(RecordEntry r) async {
    final ok = await confirmDelete(
      context,
      title: 'Eliminar item',
      body: '¿Confirmas eliminar este item del detalle?',
    );
    if (ok != true) return;
    try {
      await ApiClient.instance.deleteRecord(r.id);
      await _load();
      widget.onChanged();
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    }
  }

  String _summary(RecordEntry r) {
    if (_child == null) return 'Item #${r.id}';
    for (final f in _child!.fields) {
      if (f.id == _linkFieldId) continue;
      if (f.type == FieldType.image || f.type == FieldType.detalle) continue;
      final v = r.values[f.id.toString()];
      if (v != null && v.isNotEmpty) return '${f.name}: $v';
    }
    return 'Item #${r.id}';
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(widget.field.name,
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
                ),
                TextButton.icon(
                  onPressed: _child == null ? null : _addChild,
                  icon: const Icon(Icons.add),
                  label: const Text('Añadir'),
                ),
              ],
            ),
            const SizedBox(height: 4),
            if (_loading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 12),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_child == null || _linkFieldId == null)
              const Text(
                'Este detalle no está configurado correctamente.',
                style: TextStyle(color: Colors.orange),
              )
            else if (_myChildren.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 12),
                child: Text(
                  'Aún no hay items.',
                  style: TextStyle(color: Colors.grey),
                ),
              )
            else
              for (final r in _myChildren)
                ListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  title: Text(_summary(r)),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.edit, size: 20),
                        onPressed: () => _editChild(r),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete, size: 20, color: Colors.red),
                        onPressed: () => _deleteChild(r),
                      ),
                    ],
                  ),
                  onTap: () => _editChild(r),
                ),
          ],
        ),
      ),
    );
  }
}
