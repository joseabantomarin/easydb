import 'package:flutter/material.dart';

import '../api.dart';

/// Edit a table's name and full field schema. Supports every field type the
/// web supports, including detalle, formula, and agregacion.
///
/// If [tableId] is null the screen creates a new table in [databaseId].
/// Otherwise it loads the existing table for editing.
class TableEditorScreen extends StatefulWidget {
  final int databaseId;
  final int? tableId;
  const TableEditorScreen({
    super.key,
    required this.databaseId,
    this.tableId,
  });

  @override
  State<TableEditorScreen> createState() => _TableEditorScreenState();
}

class _TableEditorScreenState extends State<TableEditorScreen> {
  late final TextEditingController _nameCtrl;
  List<FieldEntry> _fields = [];
  List<TableEntry> _siblingTables = [];
  // Cache of fields for other tables (child tables referenced by detalle).
  final Map<int, List<FieldEntry>> _otherTableFields = {};
  bool _loading = true;
  bool _saving = false;
  String? _error;

  bool get _isEdit => widget.tableId != null;

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController();
    _load();
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final dbDetail = await ApiClient.instance.getDatabase(widget.databaseId);
      _siblingTables = dbDetail.tables
          .where((t) => t.id != widget.tableId)
          .toList();

      if (_isEdit) {
        final t = await ApiClient.instance.getTable(widget.tableId!);
        _nameCtrl.text = t.name;
        _fields = t.fields;
        await _prefetchChildTables();
      } else {
        _nameCtrl.text = '';
        _fields = [FieldEntry(name: 'Nombre', type: FieldType.text, position: 0)];
      }
      setState(() => _loading = false);
    } catch (e) {
      setState(() {
        _loading = false;
        _error = '$e';
      });
    }
  }

  Future<void> _prefetchChildTables() async {
    final ids = <int>{};
    for (final f in _fields) {
      if (f.type == FieldType.detalle) {
        final id = f.options.detalleTableId;
        if (id != null && !_otherTableFields.containsKey(id)) ids.add(id);
      }
    }
    final list = ids.toList();
    final fetched = await Future.wait(list.map((id) =>
        ApiClient.instance.getTable(id).then<TableDetail?>(
          (t) => t,
          onError: (e) {
            debugPrint('Failed to load table $id: $e');
            return null;
          },
        )));
    for (var i = 0; i < list.length; i++) {
      final t = fetched[i];
      if (t != null) _otherTableFields[list[i]] = t.fields;
    }
  }

  Future<void> _ensureTableFields(int tableId) async {
    if (_otherTableFields.containsKey(tableId)) return;
    try {
      final t = await ApiClient.instance.getTable(tableId);
      setState(() => _otherTableFields[tableId] = t.fields);
    } catch (e) {
      debugPrint('Failed to load table $tableId: $e');
    }
  }

  Future<void> _save() async {
    final name = _nameCtrl.text.trim();
    if (name.isEmpty) {
      setState(() => _error = 'El nombre es requerido');
      return;
    }
    for (final f in _fields) {
      if (f.name.trim().isEmpty) {
        setState(() => _error = 'Todos los campos deben tener nombre');
        return;
      }
      final err = _validateFieldOptions(f);
      if (err != null) {
        setState(() => _error = err);
        return;
      }
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      if (_isEdit) {
        await ApiClient.instance.updateTable(
          id: widget.tableId!,
          name: name,
          fields: _fields,
        );
      } else {
        await ApiClient.instance.createTable(
          databaseId: widget.databaseId,
          name: name,
          fields: _fields,
        );
      }
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (e) {
      setState(() {
        _saving = false;
        _error = '$e';
      });
    }
  }

  String? _validateFieldOptions(FieldEntry f) {
    switch (f.type) {
      case FieldType.link:
        if (f.options.linkTableId == null) {
          return 'El campo enlace "${f.name}" necesita una tabla destino';
        }
        break;
      case FieldType.detalle:
        if (f.options.detalleTableId == null) {
          return 'El campo detalle "${f.name}" necesita una tabla hijo';
        }
        if (f.options.detalleLinkFieldId == null) {
          return 'El campo detalle "${f.name}" necesita un campo enlace de regreso';
        }
        break;
      case FieldType.formula:
        if ((f.options.formulaExpr ?? '').trim().isEmpty) {
          return 'La fórmula "${f.name}" necesita una expresión';
        }
        break;
      case FieldType.agregacion:
        if (f.options.aggDetailFieldId == null) {
          return 'La agregación "${f.name}" necesita un campo detalle';
        }
        if (f.options.aggOperation != AggOp.count && f.options.aggTargetFieldId == null) {
          return 'La agregación "${f.name}" necesita un campo destino';
        }
        break;
      default:
        break;
    }
    return null;
  }

  void _addField() {
    setState(() {
      _fields.add(FieldEntry(
        name: '',
        type: FieldType.text,
        position: _fields.length,
      ));
    });
  }

  Future<void> _editField(int index) async {
    final updated = await Navigator.of(context).push<FieldEntry>(
      MaterialPageRoute(
        builder: (_) => _FieldEditorScreen(
          field: _fields[index],
          siblingTables: _siblingTables,
          parentFields: _fields,
          otherTableFields: _otherTableFields,
          onLoadTableFields: _ensureTableFields,
        ),
      ),
    );
    if (updated != null) {
      setState(() => _fields[index] = updated);
      if (updated.type == FieldType.detalle) {
        final id = updated.options.detalleTableId;
        if (id != null) _ensureTableFields(id);
      }
    }
  }

  void _deleteField(int index) {
    setState(() => _fields.removeAt(index));
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: Text(_isEdit ? 'Editar tabla' : 'Nueva tabla')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }
    return Scaffold(
      appBar: AppBar(
        title: Text(_isEdit ? 'Editar tabla' : 'Nueva tabla'),
        actions: [
          if (_saving)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 12),
              child: Center(
                child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
              ),
            )
          else
            IconButton(icon: const Icon(Icons.check), onPressed: _save),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(_error!, style: const TextStyle(color: Colors.red)),
            ),
          TextField(
            controller: _nameCtrl,
            decoration: const InputDecoration(
              labelText: 'Nombre de la tabla',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              const Text('Campos', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
              const Spacer(),
              TextButton.icon(
                onPressed: _addField,
                icon: const Icon(Icons.add),
                label: const Text('Añadir campo'),
              ),
            ],
          ),
          const SizedBox(height: 4),
          ReorderableListView(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            buildDefaultDragHandles: false,
            onReorder: (oldIndex, newIndex) {
              setState(() {
                if (newIndex > oldIndex) newIndex -= 1;
                final item = _fields.removeAt(oldIndex);
                _fields.insert(newIndex, item);
                for (var i = 0; i < _fields.length; i++) {
                  _fields[i].position = i;
                }
              });
            },
            children: [
              for (var i = 0; i < _fields.length; i++)
                Card(
                  key: ValueKey('field-$i-${_fields[i].id ?? i}'),
                  child: ListTile(
                    leading: ReorderableDragStartListener(
                      index: i,
                      child: const Icon(Icons.drag_handle),
                    ),
                    title: Text(
                      _fields[i].name.isEmpty ? '(sin nombre)' : _fields[i].name,
                      style: TextStyle(
                        color: _fields[i].name.isEmpty ? Colors.grey : null,
                      ),
                    ),
                    subtitle: Text('${_fields[i].type.label}${_fieldSummary(_fields[i])}'),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.edit, size: 20),
                          onPressed: () => _editField(i),
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete, size: 20, color: Colors.red),
                          onPressed: () => _deleteField(i),
                        ),
                      ],
                    ),
                    onTap: () => _editField(i),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  String _fieldSummary(FieldEntry f) {
    switch (f.type) {
      case FieldType.dropdown:
        final c = f.options.choices;
        return c.isEmpty ? '' : ' — ${c.join(', ')}';
      case FieldType.link:
        final id = f.options.linkTableId;
        final t = _siblingTables.where((t) => t.id == id).firstOrNull;
        return t == null ? '' : ' → ${t.name}';
      case FieldType.formula:
        final e = f.options.formulaExpr;
        return e == null ? '' : ' = $e';
      case FieldType.agregacion:
        return ' — ${f.options.aggOperation.apiValue}';
      default:
        return '';
    }
  }
}

class _FieldEditorScreen extends StatefulWidget {
  final FieldEntry field;
  final List<TableEntry> siblingTables;
  final List<FieldEntry> parentFields;
  final Map<int, List<FieldEntry>> otherTableFields;
  final Future<void> Function(int tableId) onLoadTableFields;

  const _FieldEditorScreen({
    required this.field,
    required this.siblingTables,
    required this.parentFields,
    required this.otherTableFields,
    required this.onLoadTableFields,
  });

  @override
  State<_FieldEditorScreen> createState() => _FieldEditorScreenState();
}

class _FieldEditorScreenState extends State<_FieldEditorScreen> {
  late final TextEditingController _nameCtrl;
  late FieldType _type;
  late FieldOptions _options;

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController(text: widget.field.name);
    _type = widget.field.type;
    _options = FieldOptions.fromAny(widget.field.options.toWire());
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  void _changeType(FieldType v) {
    setState(() {
      _type = v;
      _options = FieldOptions.empty();
    });
  }

  void _save() {
    final updated = FieldEntry(
      id: widget.field.id,
      name: _nameCtrl.text.trim(),
      type: _type,
      options: _options,
      position: widget.field.position,
      width: widget.field.width,
    );
    Navigator.of(context).pop(updated);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Campo'),
        actions: [IconButton(icon: const Icon(Icons.check), onPressed: _save)],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(
            controller: _nameCtrl,
            decoration: const InputDecoration(
              labelText: 'Nombre',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 16),
          DropdownButtonFormField<FieldType>(
            initialValue: _type,
            isExpanded: true,
            decoration: const InputDecoration(
              labelText: 'Tipo',
              border: OutlineInputBorder(),
            ),
            items: FieldType.values
                .map((t) => DropdownMenuItem(value: t, child: Text(t.label)))
                .toList(),
            onChanged: (v) {
              if (v != null) _changeType(v);
            },
          ),
          const SizedBox(height: 16),
          ..._optionsEditorFor(_type),
        ],
      ),
    );
  }

  List<Widget> _optionsEditorFor(FieldType t) {
    switch (t) {
      case FieldType.dropdown:
        return [_DropdownChoicesEditor(options: _options)];
      case FieldType.decimal:
        return [_DecimalsEditor(options: _options)];
      case FieldType.link:
        return [
          _LinkTargetEditor(
            options: _options,
            tables: widget.siblingTables,
          ),
        ];
      case FieldType.detalle:
        return [
          _DetalleEditor(
            options: _options,
            tables: widget.siblingTables,
            otherTableFields: widget.otherTableFields,
            onLoadTableFields: widget.onLoadTableFields,
            onChanged: () => setState(() {}),
          ),
        ];
      case FieldType.formula:
        return [
          _FormulaEditor(options: _options, parentFields: widget.parentFields),
        ];
      case FieldType.agregacion:
        return [
          _AggregationEditor(
            options: _options,
            parentFields: widget.parentFields,
            otherTableFields: widget.otherTableFields,
            onLoadTableFields: widget.onLoadTableFields,
            onChanged: () => setState(() {}),
          ),
        ];
      default:
        return const [];
    }
  }
}

class _DropdownChoicesEditor extends StatefulWidget {
  final FieldOptions options;
  const _DropdownChoicesEditor({required this.options});

  @override
  State<_DropdownChoicesEditor> createState() => _DropdownChoicesEditorState();
}

class _DropdownChoicesEditorState extends State<_DropdownChoicesEditor> {
  late final TextEditingController _newCtrl;

  @override
  void initState() {
    super.initState();
    _newCtrl = TextEditingController();
  }

  @override
  void dispose() {
    _newCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final choices = widget.options.choices;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Opciones', style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        for (var i = 0; i < choices.length; i++)
          Row(
            children: [
              Expanded(child: Text(choices[i])),
              IconButton(
                icon: const Icon(Icons.delete, size: 20, color: Colors.red),
                onPressed: () {
                  setState(() {
                    final next = List<String>.from(choices)..removeAt(i);
                    widget.options.choices = next;
                  });
                },
              ),
            ],
          ),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _newCtrl,
                decoration: const InputDecoration(hintText: 'Nueva opción'),
                onSubmitted: (_) => _add(),
              ),
            ),
            IconButton(icon: const Icon(Icons.add), onPressed: _add),
          ],
        ),
      ],
    );
  }

  void _add() {
    final v = _newCtrl.text.trim();
    if (v.isEmpty) return;
    setState(() {
      final next = List<String>.from(widget.options.choices)..add(v);
      widget.options.choices = next;
      _newCtrl.clear();
    });
  }
}

class _DecimalsEditor extends StatelessWidget {
  final FieldOptions options;
  const _DecimalsEditor({required this.options});

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      initialValue: (options.decimals ?? 2).toString(),
      decoration: const InputDecoration(
        labelText: 'Decimales',
        border: OutlineInputBorder(),
      ),
      keyboardType: TextInputType.number,
      onChanged: (v) => options.decimals = int.tryParse(v) ?? 2,
    );
  }
}

class _LinkTargetEditor extends StatelessWidget {
  final FieldOptions options;
  final List<TableEntry> tables;
  const _LinkTargetEditor({required this.options, required this.tables});

  @override
  Widget build(BuildContext context) {
    if (tables.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 8),
        child: Text(
          'Para usar enlaces necesitas al menos una tabla más en esta base.',
          style: TextStyle(color: Colors.grey),
        ),
      );
    }
    return DropdownButtonFormField<int>(
      initialValue: options.linkTableId,
      decoration: const InputDecoration(
        labelText: 'Tabla destino',
        border: OutlineInputBorder(),
      ),
      items: tables
          .map((t) => DropdownMenuItem(value: t.id, child: Text(t.name)))
          .toList(),
      onChanged: (v) => options.linkTableId = v,
    );
  }
}

class _DetalleEditor extends StatefulWidget {
  final FieldOptions options;
  final List<TableEntry> tables;
  final Map<int, List<FieldEntry>> otherTableFields;
  final Future<void> Function(int tableId) onLoadTableFields;
  final VoidCallback onChanged;
  const _DetalleEditor({
    required this.options,
    required this.tables,
    required this.otherTableFields,
    required this.onLoadTableFields,
    required this.onChanged,
  });

  @override
  State<_DetalleEditor> createState() => _DetalleEditorState();
}

class _DetalleEditorState extends State<_DetalleEditor> {
  @override
  void initState() {
    super.initState();
    final t = widget.options.detalleTableId;
    if (t != null) widget.onLoadTableFields(t).then((_) => setState(() {}));
  }

  @override
  Widget build(BuildContext context) {
    if (widget.tables.isEmpty) {
      return const Text(
        'Necesitas otra tabla en esta base para usar Detalle.',
        style: TextStyle(color: Colors.grey),
      );
    }
    final childTableId = widget.options.detalleTableId;
    final childFields = childTableId == null ? const <FieldEntry>[] : widget.otherTableFields[childTableId] ?? const <FieldEntry>[];
    final linkFields = childFields.where((f) => f.type == FieldType.link).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        DropdownButtonFormField<int>(
          initialValue: childTableId,
          decoration: const InputDecoration(
            labelText: 'Tabla hijo',
            border: OutlineInputBorder(),
          ),
          items: widget.tables
              .map((t) => DropdownMenuItem(value: t.id, child: Text(t.name)))
              .toList(),
          onChanged: (v) async {
            widget.options.detalleTableId = v;
            widget.options.detalleLinkFieldId = null;
            if (v != null) await widget.onLoadTableFields(v);
            setState(() {});
            widget.onChanged();
          },
        ),
        const SizedBox(height: 12),
        if (childTableId != null)
          DropdownButtonFormField<int>(
            initialValue: widget.options.detalleLinkFieldId,
            decoration: const InputDecoration(
              labelText: 'Campo enlace en tabla hijo',
              helperText: 'Debe ser un campo tipo Enlace en la tabla hijo que apunte de vuelta a esta tabla.',
              border: OutlineInputBorder(),
            ),
            items: linkFields
                .map((f) => DropdownMenuItem(
                      value: f.id,
                      child: Text(f.name),
                    ))
                .toList(),
            onChanged: (v) {
              widget.options.detalleLinkFieldId = v;
              setState(() {});
            },
          ),
        if (childTableId != null && linkFields.isEmpty)
          const Padding(
            padding: EdgeInsets.only(top: 8),
            child: Text(
              'La tabla hijo no tiene campos tipo Enlace. Crea uno allí que apunte a esta tabla, luego vuelve aquí.',
              style: TextStyle(color: Colors.orange),
            ),
          ),
      ],
    );
  }
}

class _FormulaEditor extends StatelessWidget {
  final FieldOptions options;
  final List<FieldEntry> parentFields;
  const _FormulaEditor({required this.options, required this.parentFields});

  @override
  Widget build(BuildContext context) {
    final fieldNames = parentFields
        .where((f) => f.name.isNotEmpty)
        .map((f) => f.name)
        .toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextFormField(
          initialValue: options.formulaExpr ?? '',
          decoration: const InputDecoration(
            labelText: 'Expresión',
            helperText: 'Usa [nombre_campo] para referenciar otros campos. Ej: [cantidad] * [precio]',
            border: OutlineInputBorder(),
          ),
          maxLines: 2,
          onChanged: (v) => options.formulaExpr = v,
        ),
        const SizedBox(height: 12),
        TextFormField(
          initialValue: (options.decimals ?? 2).toString(),
          decoration: const InputDecoration(
            labelText: 'Decimales',
            border: OutlineInputBorder(),
          ),
          keyboardType: TextInputType.number,
          onChanged: (v) => options.decimals = int.tryParse(v) ?? 2,
        ),
        if (fieldNames.isNotEmpty) ...[
          const SizedBox(height: 12),
          const Text(
            'Campos disponibles:',
            style: TextStyle(fontWeight: FontWeight.w600),
          ),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: fieldNames.map((n) => Chip(label: Text('[$n]'))).toList(),
          ),
        ],
      ],
    );
  }
}

class _AggregationEditor extends StatefulWidget {
  final FieldOptions options;
  final List<FieldEntry> parentFields;
  final Map<int, List<FieldEntry>> otherTableFields;
  final Future<void> Function(int tableId) onLoadTableFields;
  final VoidCallback onChanged;
  const _AggregationEditor({
    required this.options,
    required this.parentFields,
    required this.otherTableFields,
    required this.onLoadTableFields,
    required this.onChanged,
  });

  @override
  State<_AggregationEditor> createState() => _AggregationEditorState();
}

class _AggregationEditorState extends State<_AggregationEditor> {
  @override
  void initState() {
    super.initState();
    _ensureChildLoaded();
  }

  void _ensureChildLoaded() {
    final detId = widget.options.aggDetailFieldId;
    if (detId == null) return;
    final det = widget.parentFields.firstWhere(
      (f) => f.id == detId,
      orElse: () => FieldEntry(name: '', type: FieldType.text),
    );
    final child = det.options.detalleTableId;
    if (child != null) widget.onLoadTableFields(child).then((_) => setState(() {}));
  }

  @override
  Widget build(BuildContext context) {
    final detalleOptions = widget.parentFields
        .where((f) => f.type == FieldType.detalle && f.id != null && f.options.detalleTableId != null)
        .toList();
    if (detalleOptions.isEmpty) {
      return const Text(
        'Necesitas al menos un campo Detalle en esta tabla antes de añadir una Agregación.',
        style: TextStyle(color: Colors.orange),
      );
    }

    final selectedDetId = widget.options.aggDetailFieldId;
    final selectedDet = detalleOptions
        .where((f) => f.id == selectedDetId)
        .firstOrNull;
    final childTableId = selectedDet?.options.detalleTableId;
    final childFields = childTableId == null
        ? const <FieldEntry>[]
        : (widget.otherTableFields[childTableId] ?? const <FieldEntry>[]);
    final numericCandidates = childFields
        .where((cf) => const {
              FieldType.number,
              FieldType.decimal,
              FieldType.formula,
              FieldType.agregacion,
              FieldType.boolean,
            }.contains(cf.type))
        .toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        DropdownButtonFormField<int>(
          initialValue: selectedDetId,
          decoration: const InputDecoration(
            labelText: 'Campo detalle',
            border: OutlineInputBorder(),
          ),
          items: detalleOptions
              .map((f) => DropdownMenuItem(value: f.id, child: Text(f.name)))
              .toList(),
          onChanged: (v) async {
            widget.options.aggDetailFieldId = v;
            widget.options.aggTargetFieldId = null;
            final det = detalleOptions.firstWhere(
              (f) => f.id == v,
              orElse: () => FieldEntry(name: '', type: FieldType.text),
            );
            final ct = det.options.detalleTableId;
            if (ct != null) await widget.onLoadTableFields(ct);
            setState(() {});
            widget.onChanged();
          },
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<AggOp>(
          initialValue: widget.options.aggOperation,
          decoration: const InputDecoration(
            labelText: 'Operación',
            border: OutlineInputBorder(),
          ),
          items: AggOp.values
              .map((op) => DropdownMenuItem(value: op, child: Text(op.label)))
              .toList(),
          onChanged: (v) {
            if (v == null) return;
            widget.options.aggOperation = v;
            setState(() {});
          },
        ),
        const SizedBox(height: 12),
        if (widget.options.aggOperation != AggOp.count)
          DropdownButtonFormField<int>(
            initialValue: widget.options.aggTargetFieldId,
            decoration: const InputDecoration(
              labelText: 'Campo a agregar (en tabla hijo)',
              border: OutlineInputBorder(),
            ),
            items: numericCandidates
                .map((cf) => DropdownMenuItem(
                      value: cf.id,
                      child: Text('${cf.name} (${cf.type.label})'),
                    ))
                .toList(),
            onChanged: (v) {
              widget.options.aggTargetFieldId = v;
              setState(() {});
            },
          ),
        const SizedBox(height: 12),
        TextFormField(
          initialValue: (widget.options.decimals ?? 2).toString(),
          decoration: const InputDecoration(
            labelText: 'Decimales',
            border: OutlineInputBorder(),
          ),
          keyboardType: TextInputType.number,
          onChanged: (v) => widget.options.decimals = int.tryParse(v) ?? 2,
        ),
      ],
    );
  }
}
