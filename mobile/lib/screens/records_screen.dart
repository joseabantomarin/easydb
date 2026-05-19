import 'dart:io';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

import '../api.dart';
import '../computed.dart';
import '../ui.dart';
import 'record_editor_screen.dart';

/// Horizontally scrolling data grid with sort, search, group-by, date-range
/// filter, pagination, totals row, image lightbox, row selection, and CSV
/// export. Mirrors the web's records page.
class RecordsScreen extends StatefulWidget {
  final int tableId;
  final String tableName;
  const RecordsScreen({super.key, required this.tableId, required this.tableName});

  @override
  State<RecordsScreen> createState() => _RecordsScreenState();
}

class _RecordsScreenState extends State<RecordsScreen> {
  late Future<TableRecords> _future;
  final Map<int, TableRecords> _linkedCache = {};

  final TextEditingController _searchCtrl = TextEditingController();
  int? _groupById;
  GroupMode _groupMode = GroupMode.day;
  DateTime? _dateFrom;
  DateTime? _dateTo;
  int? _sortFieldId;
  SortDir _sortDir = SortDir.asc;
  int _pageSize = 25;
  int _page = 1;
  int? _selectedRecordId;

  String get _search => _searchCtrl.text;

  // NumberFormat is surprisingly expensive to allocate; reuse per decimals.
  final Map<int, NumberFormat> _numberFormatCache = {};

  @override
  void initState() {
    super.initState();
    _reload();
    _searchCtrl.addListener(_onSearchChanged);
  }

  @override
  void dispose() {
    _searchCtrl.removeListener(_onSearchChanged);
    _searchCtrl.dispose();
    super.dispose();
  }

  void _onSearchChanged() {
    setState(() {
      _page = 1;
      _selectedRecordId = null;
    });
  }

  void _reload() {
    setState(() {
      _future = _loadAll();
    });
  }

  Future<TableRecords> _loadAll() async {
    final t = await ApiClient.instance.getRecords(widget.tableId);
    final toLoad = <int>{};
    for (final f in t.fields) {
      if (f.type == FieldType.link) {
        final id = f.options.linkTableId;
        if (id != null) toLoad.add(id);
      } else if (f.type == FieldType.detalle) {
        final id = f.options.detalleTableId;
        if (id != null) toLoad.add(id);
      }
    }
    final missing = toLoad.where((id) => !_linkedCache.containsKey(id)).toList();
    final fetched = await Future.wait(
      missing.map((id) => ApiClient.instance.getRecords(id).then<TableRecords?>(
            (r) => r,
            onError: (e) {
              debugPrint('Failed to preload linked table $id: $e');
              return null;
            },
          )),
    );
    for (var i = 0; i < missing.length; i++) {
      final r = fetched[i];
      if (r != null) _linkedCache[missing[i]] = r;
    }
    return t;
  }

  // ---------- field helpers ----------

  bool _isNumericColumn(FieldEntry f) =>
      f.type == FieldType.decimal ||
      f.type == FieldType.formula ||
      f.type == FieldType.agregacion;

  double _columnWidth(FieldEntry f) {
    if (f.width != null && f.width! > 0) return f.width!.toDouble();
    switch (f.type) {
      case FieldType.date:
      case FieldType.number:
      case FieldType.decimal:
      case FieldType.formula:
      case FieldType.agregacion:
        return 110;
      case FieldType.boolean:
        return 70;
      case FieldType.text:
      case FieldType.memo:
        return 200;
      case FieldType.dropdown:
        return 160;
      case FieldType.image:
      case FieldType.link:
        return 160;
      case FieldType.detalle:
        return 100;
    }
  }

  int _decimalsFor(FieldEntry f) => f.options.decimals ?? 2;

  String _formatDecimal(double n, int decimals) {
    final f = _numberFormatCache.putIfAbsent(
      decimals,
      () => NumberFormat.decimalPattern('es_PE')
        ..minimumFractionDigits = decimals
        ..maximumFractionDigits = decimals,
    );
    return f.format(n);
  }

  String _displayString(FieldEntry field, RecordEntry record, ComputeContext ctx) {
    if (field.type == FieldType.formula) {
      final v = evalFormula(field.options.formulaExpr, record, ctx);
      if (v == null || !v.isFinite) return '-';
      return _formatDecimal(v, _decimalsFor(field));
    }
    if (field.type == FieldType.agregacion) {
      final v = computeAggregation(field, record, ctx);
      if (v == null) return '0';
      return _formatDecimal(v, _decimalsFor(field));
    }
    if (field.type == FieldType.detalle) {
      final childId = field.options.detalleTableId;
      final linkId = field.options.detalleLinkFieldId;
      final child = childId == null ? null : _linkedCache[childId];
      if (child == null || linkId == null) return '—';
      final count = child.records.where((cr) {
        final pid = cr.values[linkId.toString()] ?? '';
        return int.tryParse(pid) == record.id;
      }).length;
      return count == 0 ? '—' : '$count';
    }
    final raw = field.id == null ? '' : (record.values[field.id.toString()] ?? '');
    if (raw.isEmpty) return '—';
    switch (field.type) {
      case FieldType.boolean:
        return raw == '1' || raw.toLowerCase() == 'true' ? '✓' : '—';
      case FieldType.date:
        try {
          final d = DateTime.parse(raw);
          return DateFormat('yyyy-MM-dd').format(d);
        } catch (_) {
          return raw;
        }
      case FieldType.decimal:
        final n = double.tryParse(raw);
        if (n == null) return raw;
        return _formatDecimal(n, _decimalsFor(field));
      case FieldType.link:
        return _linkedLabel(field, raw);
      case FieldType.image:
        return ''; // image cell rendered as widget
      default:
        return raw;
    }
  }

  String _linkedLabel(FieldEntry field, String raw) {
    final linkId = field.options.linkTableId;
    if (linkId == null) return raw;
    final linked = _linkedCache[linkId];
    if (linked == null) return raw;
    final id = int.tryParse(raw);
    if (id == null) return raw;
    final target = linked.records.where((r) => r.id == id).firstOrNull;
    if (target == null) return '#$raw';
    return linkRecordLabel(linked, target);
  }

  String _searchableText(FieldEntry field, RecordEntry record, ComputeContext ctx) {
    if (field.type == FieldType.image) return '';
    return _displayString(field, record, ctx).toLowerCase();
  }

  // ---------- numeric helpers for sort/sum ----------

  double _cellNumeric(FieldEntry f, RecordEntry r, ComputeContext ctx) {
    if (f.type == FieldType.boolean) {
      final raw = f.id == null ? '' : (r.values[f.id.toString()] ?? '');
      return raw == '1' || raw.toLowerCase() == 'true' ? 1.0 : 0.0;
    }
    if (f.type == FieldType.formula) {
      return evalFormula(f.options.formulaExpr, r, ctx) ?? double.nan;
    }
    if (f.type == FieldType.agregacion) {
      return computeAggregation(f, r, ctx) ?? double.nan;
    }
    final raw = f.id == null ? '' : (r.values[f.id.toString()] ?? '');
    return double.tryParse(raw) ?? double.nan;
  }

  Map<int, double> _decimalSums(List<RecordEntry> rows, List<FieldEntry> fields, ComputeContext ctx) {
    final sums = <int, double>{};
    for (final f in fields) {
      if (!_isNumericColumn(f) || f.id == null) continue;
      double s = 0;
      for (final r in rows) {
        final n = _cellNumeric(f, r, ctx);
        if (n.isFinite) s += n;
      }
      sums[f.id!] = s;
    }
    return sums;
  }

  // ---------- filter + sort + group ----------

  List<RecordEntry> _filtered(TableRecords data, ComputeContext ctx) {
    final q = _search.trim().toLowerCase();
    final groupField = _groupById == null
        ? null
        : data.fields.where((f) => f.id == _groupById).firstOrNull;
    final useRange = groupField != null &&
        groupField.type == FieldType.date &&
        (_dateFrom != null || _dateTo != null);
    final filtered = data.records.where((r) {
      if (q.isNotEmpty &&
          !data.fields.any((f) => _searchableText(f, r, ctx).contains(q))) {
        return false;
      }
      if (useRange) {
        final raw = (r.values[groupField.id.toString()] ?? '');
        if (raw.isEmpty) return false;
        DateTime? d;
        try {
          d = DateTime.parse(raw);
        } catch (_) {
          return false;
        }
        if (_dateFrom != null && d.isBefore(_dateFrom!)) return false;
        if (_dateTo != null && d.isAfter(_dateTo!)) return false;
      }
      return true;
    }).toList();

    if (_sortFieldId != null) {
      final f = data.fields.where((x) => x.id == _sortFieldId).firstOrNull;
      if (f != null) {
        final sign = _sortDir == SortDir.desc ? -1 : 1;
        filtered.sort((a, b) => sign * _compareForSort(f, a, b, ctx));
      }
    }
    return filtered;
  }

  int _compareForSort(FieldEntry f, RecordEntry a, RecordEntry b, ComputeContext ctx) {
    if (f.type == FieldType.boolean ||
        f.type == FieldType.formula ||
        f.type == FieldType.agregacion) {
      final na = _cellNumeric(f, a, ctx);
      final nb = _cellNumeric(f, b, ctx);
      final aE = !na.isFinite, bE = !nb.isFinite;
      if (aE && bE) return 0;
      if (aE) return 1;
      if (bE) return -1;
      return na.compareTo(nb);
    }
    final va = f.id == null ? '' : (a.values[f.id.toString()] ?? '');
    final vb = f.id == null ? '' : (b.values[f.id.toString()] ?? '');
    final ae = va.isEmpty, be = vb.isEmpty;
    if (ae && be) return 0;
    if (ae) return 1;
    if (be) return -1;
    if (f.type == FieldType.number || f.type == FieldType.decimal) {
      final na = double.tryParse(va);
      final nb = double.tryParse(vb);
      if (na != null && nb != null) return na.compareTo(nb);
    }
    final sa = f.type == FieldType.link ? _linkedLabel(f, va) : va;
    final sb = f.type == FieldType.link ? _linkedLabel(f, vb) : vb;
    return sa.toLowerCase().compareTo(sb.toLowerCase());
  }

  String _groupKey(RecordEntry r, FieldEntry f) {
    final raw = f.id == null ? '' : (r.values[f.id.toString()] ?? '');
    if (raw.isEmpty) return '(vacío)';
    if (f.type == FieldType.date) {
      final maxLen = switch (_groupMode) {
        GroupMode.year => 4,
        GroupMode.month => 7,
        GroupMode.day => 10,
      };
      return raw.substring(0, raw.length >= maxLen ? maxLen : raw.length);
    }
    if (f.type == FieldType.link) return _linkedLabel(f, raw);
    return raw;
  }

  List<_Group>? _buildGroups(List<RecordEntry> rows, List<FieldEntry> fields, ComputeContext ctx) {
    final f = _groupById == null
        ? null
        : fields.where((x) => x.id == _groupById).firstOrNull;
    if (f == null) return null;
    final map = <String, List<RecordEntry>>{};
    for (final r in rows) {
      map.putIfAbsent(_groupKey(r, f), () => []).add(r);
    }
    final groups = map.entries
        .map((e) => _Group(
              key: e.key,
              records: e.value,
              sums: _decimalSums(e.value, fields, ctx),
            ))
        .toList();
    groups.sort((a, b) => b.key.compareTo(a.key));
    return groups;
  }

  void _toggleSort(int fieldId) {
    setState(() {
      if (_sortFieldId != fieldId) {
        _sortFieldId = fieldId;
        _sortDir = SortDir.asc;
      } else if (_sortDir == SortDir.asc) {
        _sortDir = SortDir.desc;
      } else {
        _sortFieldId = null;
        _sortDir = SortDir.asc;
      }
    });
  }

  Future<void> _pickDate(bool from) async {
    final initial = from
        ? (_dateFrom ?? DateTime.now())
        : (_dateTo ?? DateTime.now());
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(1900),
      lastDate: DateTime(DateTime.now().year + 30),
    );
    if (picked == null) return;
    setState(() {
      if (from) {
        _dateFrom = picked;
      } else {
        _dateTo = picked;
      }
      _page = 1;
    });
  }

  Future<void> _exportCsv(TableRecords data, ComputeContext ctx, List<RecordEntry> rows) async {
    final cols = data.fields;
    final buf = StringBuffer();
    String escape(String s) {
      if (s.contains(',') || s.contains('"') || s.contains('\n')) {
        return '"${s.replaceAll('"', '""')}"';
      }
      return s;
    }
    buf.write(cols.map((f) => escape(f.name)).join(','));
    buf.write('\n');
    for (final r in rows) {
      buf.write(cols.map((f) {
        if (f.type == FieldType.image) return '';
        return escape(_displayString(f, r, ctx));
      }).join(','));
      buf.write('\n');
    }
    try {
      final dir = await getTemporaryDirectory();
      final stamp = DateFormat('yyyyMMdd_HHmm').format(DateTime.now());
      final safeName = widget.tableName.replaceAll(RegExp(r'[^a-zA-Z0-9_-]'), '_');
      final f = File('${dir.path}/${safeName}_$stamp.csv');
      await f.writeAsString(buf.toString());
      await SharePlus.instance.share(ShareParams(files: [XFile(f.path)], text: widget.tableName));
    } catch (e) {
      if (mounted) showErrorSnack(context, 'No se pudo exportar: $e');
    }
  }

  Future<void> _addRecord(TableRecords data) async {
    final saved = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => RecordEditorScreen(
          tableId: widget.tableId,
          fields: data.fields,
          childCache: _linkedCache,
        ),
      ),
    );
    if (saved == true) _reload();
  }

  Future<void> _editRecord(TableRecords data, RecordEntry record) async {
    final saved = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => RecordEditorScreen(
          tableId: widget.tableId,
          fields: data.fields,
          existing: record,
          childCache: _linkedCache,
        ),
      ),
    );
    if (saved == true) _reload();
  }

  Future<void> _deleteRecord(RecordEntry r) async {
    final ok = await confirmDelete(
      context,
      title: 'Eliminar registro',
      body: '¿Confirmas eliminar este registro?',
    );
    if (ok != true) return;
    try {
      await ApiClient.instance.deleteRecord(r.id);
      setState(() => _selectedRecordId = null);
      _reload();
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.tableName)),
      body: FutureBuilder<TableRecords>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return Padding(padding: const EdgeInsets.all(24), child: Text('Error: ${snap.error}'));
          }
          final data = snap.data!;
          final ctx = ComputeContext(fields: data.fields, childCache: _linkedCache);
          return _buildBody(data, ctx);
        },
      ),
      floatingActionButton: FutureBuilder<TableRecords>(
        future: _future,
        builder: (context, snap) {
          if (!snap.hasData) return const SizedBox.shrink();
          return FloatingActionButton.extended(
            onPressed: () => _addRecord(snap.data!),
            icon: const Icon(Icons.add),
            label: const Text('Nuevo'),
          );
        },
      ),
    );
  }

  Widget _buildBody(TableRecords data, ComputeContext ctx) {
    final filtered = _filtered(data, ctx);
    final groupField = _groupById == null
        ? null
        : data.fields.where((f) => f.id == _groupById).firstOrNull;
    final groups = _buildGroups(filtered, data.fields, ctx);
    final totalUnits = groups != null ? groups.length : filtered.length;
    final pageCount = (totalUnits / _pageSize).ceil().clamp(1, 1 << 30);
    final currentPage = _page.clamp(1, pageCount);
    final start = (currentPage - 1) * _pageSize;
    final end = (start + _pageSize).clamp(0, totalUnits);
    final pagedGroups = groups?.sublist(start, end);
    final pagedRecords = groups != null ? null : filtered.sublist(start, end);
    final grandSums = _decimalSums(filtered, data.fields, ctx);
    final hasNumeric = data.fields.any(_isNumericColumn);
    final selected = _selectedRecordId == null
        ? null
        : data.records.where((r) => r.id == _selectedRecordId).firstOrNull;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _Toolbar(
          searchCtrl: _searchCtrl,
          fields: data.fields,
          groupById: _groupById,
          groupMode: _groupMode,
          dateFrom: _dateFrom,
          dateTo: _dateTo,
          pageSize: _pageSize,
          selected: selected,
          isGroupDate: groupField?.type == FieldType.date,
          onGroupBy: (id) => setState(() {
            _groupById = id;
            _dateFrom = null;
            _dateTo = null;
            _page = 1;
          }),
          onGroupMode: (m) => setState(() => _groupMode = m),
          onPickDate: _pickDate,
          onClearDateRange: () => setState(() {
            _dateFrom = null;
            _dateTo = null;
          }),
          onPageSize: (n) => setState(() {
            _pageSize = n;
            _page = 1;
          }),
          onEditSelected: () => _editRecord(data, selected!),
          onDeleteSelected: () => _deleteRecord(selected!),
          onClearSelection: () => setState(() => _selectedRecordId = null),
          onExport: filtered.isEmpty ? null : () => _exportCsv(data, ctx, filtered),
        ),
        if (data.records.isEmpty)
          const Expanded(
            child: Center(
              child: Text('No hay registros. Toca "Nuevo" para añadir uno.'),
            ),
          )
        else
          Expanded(
            child: _DataGrid(
              fields: data.fields,
              groups: pagedGroups,
              groupField: groupField,
              pagedRecords: pagedRecords,
              startNumber: start,
              grandSums: hasNumeric ? grandSums : null,
              selectedRecordId: _selectedRecordId,
              onSelectRecord: (id) => setState(() {
                _selectedRecordId = _selectedRecordId == id ? null : id;
              }),
              onTapHeader: _toggleSort,
              sortFieldId: _sortFieldId,
              sortDir: _sortDir,
              columnWidth: _columnWidth,
              displayString: (f, r) => _displayString(f, r, ctx),
              isNumericColumn: _isNumericColumn,
              decimalsFor: _decimalsFor,
              fileUrl: ApiClient.instance.fileUrl,
              onOpenImage: _openImageLightbox,
              onEditRecord: (r) => _editRecord(data, r),
              formatDecimal: _formatDecimal,
              search: _search,
              filteredTotal: filtered.length,
            ),
          ),
        if (data.records.isNotEmpty)
          _PaginationBar(
            start: totalUnits == 0 ? 0 : start + 1,
            end: end,
            total: totalUnits,
            isGroups: groups != null,
            filteredCount: filtered.length,
            page: currentPage,
            pageCount: pageCount,
            onPrev: currentPage <= 1 ? null : () => setState(() => _page = currentPage - 1),
            onNext: currentPage >= pageCount ? null : () => setState(() => _page = currentPage + 1),
          ),
      ],
    );
  }

  void _openImageLightbox(String filename) {
    final url = ApiClient.instance.fileUrl(filename);
    showDialog(
      context: context,
      barrierColor: Colors.black87,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(0),
        child: GestureDetector(
          onTap: () => Navigator.of(ctx).pop(),
          child: InteractiveViewer(
            child: Center(child: Image.network(url)),
          ),
        ),
      ),
    );
  }
}

class _Group {
  final String key;
  final List<RecordEntry> records;
  final Map<int, double> sums;
  _Group({required this.key, required this.records, required this.sums});
}

class _Toolbar extends StatelessWidget {
  final TextEditingController searchCtrl;
  final List<FieldEntry> fields;
  final int? groupById;
  final GroupMode groupMode;
  final DateTime? dateFrom;
  final DateTime? dateTo;
  final int pageSize;
  final RecordEntry? selected;
  final bool isGroupDate;
  final ValueChanged<int?> onGroupBy;
  final ValueChanged<GroupMode> onGroupMode;
  final void Function(bool from) onPickDate;
  final VoidCallback onClearDateRange;
  final ValueChanged<int> onPageSize;
  final VoidCallback onEditSelected;
  final VoidCallback onDeleteSelected;
  final VoidCallback onClearSelection;
  final VoidCallback? onExport;

  const _Toolbar({
    required this.searchCtrl,
    required this.fields,
    required this.groupById,
    required this.groupMode,
    required this.dateFrom,
    required this.dateTo,
    required this.pageSize,
    required this.selected,
    required this.isGroupDate,
    required this.onGroupBy,
    required this.onGroupMode,
    required this.onPickDate,
    required this.onClearDateRange,
    required this.onPageSize,
    required this.onEditSelected,
    required this.onDeleteSelected,
    required this.onClearSelection,
    required this.onExport,
  });

  @override
  Widget build(BuildContext context) {
    final groupableFields = fields
        .where((f) => f.type != FieldType.image && f.type != FieldType.memo)
        .toList();
    return Material(
      color: Theme.of(context).colorScheme.surfaceContainerLow,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(8, 8, 8, 4),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (selected != null) ...[
              Row(
                children: [
                  const Icon(Icons.radio_button_checked, size: 16, color: Colors.blue),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'Fila seleccionada #${selected!.id}',
                      style: const TextStyle(fontWeight: FontWeight.w600),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.edit, color: Colors.blue),
                    tooltip: 'Editar',
                    onPressed: onEditSelected,
                  ),
                  IconButton(
                    icon: const Icon(Icons.delete, color: Colors.red),
                    tooltip: 'Eliminar',
                    onPressed: onDeleteSelected,
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    tooltip: 'Quitar selección',
                    onPressed: onClearSelection,
                  ),
                ],
              ),
              const Divider(height: 8),
            ],
            Wrap(
              spacing: 8,
              runSpacing: 6,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                SizedBox(
                  width: 220,
                  child: TextField(
                    controller: searchCtrl,
                    decoration: const InputDecoration(
                      isDense: true,
                      prefixIcon: Icon(Icons.search, size: 18),
                      hintText: 'Buscar...',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
                _wrapInLabel('Agrupar:', DropdownButton<int?>(
                  isDense: true,
                  value: groupById,
                  hint: const Text('Ninguno'),
                  onChanged: onGroupBy,
                  items: [
                    const DropdownMenuItem<int?>(value: null, child: Text('Ninguno')),
                    ...groupableFields.map((f) => DropdownMenuItem<int?>(
                          value: f.id,
                          child: Text(f.name),
                        )),
                  ],
                )),
                if (isGroupDate)
                  _wrapInLabel('Por:', DropdownButton<GroupMode>(
                    isDense: true,
                    value: groupMode,
                    onChanged: (v) {
                      if (v != null) onGroupMode(v);
                    },
                    items: GroupMode.values
                        .map((m) => DropdownMenuItem(value: m, child: Text(m.label)))
                        .toList(),
                  )),
                if (isGroupDate) ...[
                  OutlinedButton.icon(
                    onPressed: () => onPickDate(true),
                    icon: const Icon(Icons.calendar_today, size: 14),
                    label: Text(dateFrom == null
                        ? 'Del'
                        : 'Del ${DateFormat('yyyy-MM-dd').format(dateFrom!)}'),
                  ),
                  OutlinedButton.icon(
                    onPressed: () => onPickDate(false),
                    icon: const Icon(Icons.calendar_today, size: 14),
                    label: Text(dateTo == null
                        ? 'Al'
                        : 'Al ${DateFormat('yyyy-MM-dd').format(dateTo!)}'),
                  ),
                  if (dateFrom != null || dateTo != null)
                    TextButton(
                      onPressed: onClearDateRange,
                      child: const Text('limpiar'),
                    ),
                ],
                _wrapInLabel('Por página:', DropdownButton<int>(
                  isDense: true,
                  value: pageSize,
                  onChanged: (v) {
                    if (v != null) onPageSize(v);
                  },
                  items: const [10, 25, 50, 100]
                      .map((n) => DropdownMenuItem(value: n, child: Text('$n')))
                      .toList(),
                )),
                OutlinedButton.icon(
                  onPressed: onExport,
                  icon: const Icon(Icons.file_download, size: 16),
                  label: const Text('Exportar CSV'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _wrapInLabel(String label, Widget child) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(label, style: const TextStyle(fontSize: 13)),
        const SizedBox(width: 4),
        child,
      ],
    );
  }
}

class _DataGrid extends StatefulWidget {
  final List<FieldEntry> fields;
  final List<_Group>? groups;
  final FieldEntry? groupField;
  final List<RecordEntry>? pagedRecords;
  final int startNumber;
  final Map<int, double>? grandSums;
  final int? selectedRecordId;
  final ValueChanged<int> onSelectRecord;
  final ValueChanged<int> onTapHeader;
  final int? sortFieldId;
  final SortDir sortDir;
  final double Function(FieldEntry) columnWidth;
  final String Function(FieldEntry, RecordEntry) displayString;
  final bool Function(FieldEntry) isNumericColumn;
  final int Function(FieldEntry) decimalsFor;
  final String Function(String filename) fileUrl;
  final ValueChanged<String> onOpenImage;
  final ValueChanged<RecordEntry> onEditRecord;
  final String Function(double, int) formatDecimal;
  final String search;
  final int filteredTotal;

  const _DataGrid({
    required this.fields,
    required this.groups,
    required this.groupField,
    required this.pagedRecords,
    required this.startNumber,
    required this.grandSums,
    required this.selectedRecordId,
    required this.onSelectRecord,
    required this.onTapHeader,
    required this.sortFieldId,
    required this.sortDir,
    required this.columnWidth,
    required this.displayString,
    required this.isNumericColumn,
    required this.decimalsFor,
    required this.fileUrl,
    required this.onOpenImage,
    required this.onEditRecord,
    required this.formatDecimal,
    required this.search,
    required this.filteredTotal,
  });

  @override
  State<_DataGrid> createState() => _DataGridState();
}

class _DataGridState extends State<_DataGrid> {
  static const double _rowHeight = 44;
  static const double _numColWidth = 50;

  final ScrollController _vCtrl = ScrollController();
  final ScrollController _hCtrl = ScrollController();

  @override
  void dispose() {
    _vCtrl.dispose();
    _hCtrl.dispose();
    super.dispose();
  }

  double get _totalWidth =>
      _numColWidth + widget.fields.fold<double>(0, (acc, f) => acc + widget.columnWidth(f));

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Scrollbar(
      controller: _vCtrl,
      thumbVisibility: false,
      child: SingleChildScrollView(
        controller: _vCtrl,
        scrollDirection: Axis.vertical,
        child: SingleChildScrollView(
          controller: _hCtrl,
          scrollDirection: Axis.horizontal,
          child: SizedBox(
            width: _totalWidth,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _headerRow(cs),
                if (widget.filteredTotal == 0)
                  Container(
                    height: 60,
                    color: cs.surface,
                    alignment: Alignment.center,
                    child: Text(
                      widget.search.isEmpty
                          ? 'Sin resultados.'
                          : 'Sin resultados para "${widget.search}"',
                      style: TextStyle(color: cs.onSurfaceVariant),
                    ),
                  )
                else if (widget.groups != null)
                  ..._groupedRows(cs)
                else
                  ..._recordRows(widget.pagedRecords!, widget.startNumber, cs),
                if (widget.grandSums != null && widget.filteredTotal > 0)
                  _totalsRow(cs),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _headerRow(ColorScheme cs) {
    return Container(
      decoration: BoxDecoration(
        color: cs.surfaceContainerHigh,
        border: Border(bottom: BorderSide(color: cs.outlineVariant)),
      ),
      height: _rowHeight,
      child: Row(
        children: [
          _cellBox(
            width: _numColWidth,
            child: const Text('#', style: TextStyle(fontWeight: FontWeight.bold)),
            cs: cs,
          ),
          for (final f in widget.fields)
            InkWell(
              onTap: f.id == null ? null : () => widget.onTapHeader(f.id!),
              child: _cellBox(
                width: widget.columnWidth(f),
                cs: cs,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Flexible(
                      child: Text(
                        f.name,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: f.id == widget.sortFieldId ? Colors.blue : null,
                        ),
                      ),
                    ),
                    if (f.id == widget.sortFieldId)
                      Icon(
                        widget.sortDir == SortDir.asc ? Icons.arrow_drop_up : Icons.arrow_drop_down,
                        size: 18,
                        color: Colors.blue,
                      ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  List<Widget> _groupedRows(ColorScheme cs) {
    final rows = <Widget>[];
    int n = widget.startNumber;
    for (final g in widget.groups!) {
      rows.add(_groupHeaderRow(g, cs));
      for (final r in g.records) {
        n += 1;
        rows.add(_recordRow(r, n, cs));
      }
      if (widget.fields.any(widget.isNumericColumn)) {
        rows.add(_groupSumsRow(g, cs));
      }
    }
    return rows;
  }

  Widget _groupHeaderRow(_Group g, ColorScheme cs) {
    final name = widget.groupField?.name ?? '';
    return Container(
      color: const Color(0xFFFFF8E1),
      width: _totalWidth,
      height: _rowHeight,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      alignment: Alignment.centerLeft,
      child: Text(
        '$name: ${g.key}  (${g.records.length} ${g.records.length == 1 ? 'registro' : 'registros'})',
        style: const TextStyle(
          fontWeight: FontWeight.w600,
          color: Color(0xFF7C5800),
        ),
      ),
    );
  }

  Widget _groupSumsRow(_Group g, ColorScheme cs) {
    return Container(
      color: const Color(0xFFFFFAEC),
      height: _rowHeight,
      child: Row(
        children: [
          _cellBox(
            width: _numColWidth,
            cs: cs,
            child: const Text('Σ', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF7C5800))),
          ),
          for (final f in widget.fields)
            _cellBox(
              width: widget.columnWidth(f),
              cs: cs,
              child: widget.isNumericColumn(f) && f.id != null
                  ? Text(
                      widget.formatDecimal(g.sums[f.id!] ?? 0, widget.decimalsFor(f)),
                      textAlign: TextAlign.right,
                      style: const TextStyle(
                        fontFamily: 'monospace',
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF7C5800),
                      ),
                    )
                  : const SizedBox.shrink(),
              alignRight: widget.isNumericColumn(f),
            ),
        ],
      ),
    );
  }

  List<Widget> _recordRows(List<RecordEntry> rows, int start, ColorScheme cs) {
    final out = <Widget>[];
    for (var i = 0; i < rows.length; i++) {
      out.add(_recordRow(rows[i], start + i + 1, cs));
    }
    return out;
  }

  Widget _recordRow(RecordEntry r, int rowNum, ColorScheme cs) {
    final selected = widget.selectedRecordId == r.id;
    return InkWell(
      onTap: () => widget.onSelectRecord(r.id),
      onDoubleTap: () => widget.onEditRecord(r),
      child: Container(
        color: selected ? const Color(0xFFE3F2FD) : null,
        height: _rowHeight,
        child: Row(
          children: [
            _cellBox(
              width: _numColWidth,
              cs: cs,
              child: Text(
                '$rowNum',
                style: TextStyle(
                  color: selected ? Colors.blue : cs.onSurfaceVariant,
                  fontWeight: selected ? FontWeight.w700 : FontWeight.normal,
                ),
              ),
            ),
            for (final f in widget.fields) _bodyCell(f, r, cs),
          ],
        ),
      ),
    );
  }

  Widget _bodyCell(FieldEntry f, RecordEntry r, ColorScheme cs) {
    final w = widget.columnWidth(f);
    if (f.type == FieldType.image) {
      final fname = f.id == null ? '' : (r.values[f.id.toString()] ?? '');
      return _cellBox(
        width: w,
        cs: cs,
        child: fname.isEmpty
            ? const SizedBox.shrink()
            : GestureDetector(
                onTap: () => widget.onOpenImage(fname),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: Image.network(
                    widget.fileUrl(fname),
                    width: 36,
                    height: 36,
                    fit: BoxFit.cover,
                    cacheWidth: 72,
                    cacheHeight: 72,
                    errorBuilder: (_, __, ___) => const Icon(Icons.broken_image, size: 24),
                  ),
                ),
              ),
      );
    }
    final isNumber =
        widget.isNumericColumn(f) || f.type == FieldType.number;
    final value = widget.displayString(f, r);
    return _cellBox(
      width: w,
      cs: cs,
      alignRight: isNumber,
      child: Text(
        value,
        overflow: TextOverflow.ellipsis,
        maxLines: f.type == FieldType.memo ? 2 : 1,
        textAlign: isNumber ? TextAlign.right : TextAlign.left,
        style: TextStyle(
          fontFamily: isNumber ? 'monospace' : null,
        ),
      ),
    );
  }

  Widget _totalsRow(ColorScheme cs) {
    return Container(
      color: const Color(0xFFE3F2FD),
      height: _rowHeight,
      child: Row(
        children: [
          _cellBox(
            width: _numColWidth,
            cs: cs,
            child: const Text('Σ', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0D47A1))),
          ),
          for (final f in widget.fields)
            _cellBox(
              width: widget.columnWidth(f),
              cs: cs,
              alignRight: widget.isNumericColumn(f),
              child: widget.isNumericColumn(f) && f.id != null
                  ? Text(
                      widget.formatDecimal(widget.grandSums![f.id!] ?? 0, widget.decimalsFor(f)),
                      textAlign: TextAlign.right,
                      style: const TextStyle(
                        fontFamily: 'monospace',
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF0D47A1),
                      ),
                    )
                  : const SizedBox.shrink(),
            ),
        ],
      ),
    );
  }

  Widget _cellBox({
    required double width,
    required Widget child,
    required ColorScheme cs,
    bool alignRight = false,
  }) {
    return Container(
      width: width,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      decoration: BoxDecoration(
        border: Border(
          right: BorderSide(color: cs.outlineVariant, width: 0.5),
          bottom: BorderSide(color: cs.outlineVariant, width: 0.5),
        ),
      ),
      alignment: alignRight ? Alignment.centerRight : Alignment.centerLeft,
      child: child,
    );
  }
}

class _PaginationBar extends StatelessWidget {
  final int start;
  final int end;
  final int total;
  final bool isGroups;
  final int filteredCount;
  final int page;
  final int pageCount;
  final VoidCallback? onPrev;
  final VoidCallback? onNext;

  const _PaginationBar({
    required this.start,
    required this.end,
    required this.total,
    required this.isGroups,
    required this.filteredCount,
    required this.page,
    required this.pageCount,
    required this.onPrev,
    required this.onNext,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      color: cs.surfaceContainerLow,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Row(
        children: [
          Expanded(
            child: Text(
              isGroups
                  ? 'Mostrando $start-$end de $total grupos ($filteredCount registros)'
                  : 'Mostrando $start-$end de $total registros',
              style: const TextStyle(fontSize: 12),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          IconButton(
            icon: const Icon(Icons.chevron_left),
            tooltip: 'Anterior',
            onPressed: onPrev,
          ),
          Text('$page / $pageCount', style: const TextStyle(fontSize: 12)),
          IconButton(
            icon: const Icon(Icons.chevron_right),
            tooltip: 'Siguiente',
            onPressed: onNext,
          ),
        ],
      ),
    );
  }
}
