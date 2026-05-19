import 'dart:convert';

/// All field types supported by the EasyDB API.
enum FieldType {
  text,
  memo,
  number,
  decimal,
  boolean,
  date,
  dropdown,
  image,
  link,
  detalle,
  formula,
  agregacion,
}

extension FieldTypeX on FieldType {
  String get apiValue {
    switch (this) {
      case FieldType.text:
        return 'text';
      case FieldType.memo:
        return 'memo';
      case FieldType.number:
        return 'number';
      case FieldType.decimal:
        return 'decimal';
      case FieldType.boolean:
        return 'boolean';
      case FieldType.date:
        return 'date';
      case FieldType.dropdown:
        return 'dropdown';
      case FieldType.image:
        return 'image';
      case FieldType.link:
        return 'link';
      case FieldType.detalle:
        return 'detalle';
      case FieldType.formula:
        return 'formula';
      case FieldType.agregacion:
        return 'agregacion';
    }
  }

  String get label {
    switch (this) {
      case FieldType.text:
        return 'Texto';
      case FieldType.memo:
        return 'Memo';
      case FieldType.number:
        return 'Número';
      case FieldType.decimal:
        return 'Decimal';
      case FieldType.boolean:
        return 'Sí/No';
      case FieldType.date:
        return 'Fecha';
      case FieldType.dropdown:
        return 'Desplegable';
      case FieldType.image:
        return 'Imagen';
      case FieldType.link:
        return 'Enlace';
      case FieldType.detalle:
        return 'Detalle';
      case FieldType.formula:
        return 'Fórmula';
      case FieldType.agregacion:
        return 'Agregación';
    }
  }

  /// Whether a record value of this type can be set/edited by the user.
  /// Detalle is a derived child-record list, formula/agregacion are computed.
  bool get isValueEditable {
    switch (this) {
      case FieldType.formula:
      case FieldType.agregacion:
      case FieldType.detalle:
        return false;
      default:
        return true;
    }
  }
}

enum SortDir { asc, desc }

enum GroupMode { day, month, year }

extension GroupModeX on GroupMode {
  String get label {
    switch (this) {
      case GroupMode.day:
        return 'Día';
      case GroupMode.month:
        return 'Mes';
      case GroupMode.year:
        return 'Año';
    }
  }
}

enum AggOp { sum, avg, min, max, count }

extension AggOpX on AggOp {
  String get apiValue {
    switch (this) {
      case AggOp.sum:
        return 'SUM';
      case AggOp.avg:
        return 'AVG';
      case AggOp.min:
        return 'MIN';
      case AggOp.max:
        return 'MAX';
      case AggOp.count:
        return 'COUNT';
    }
  }

  String get label {
    switch (this) {
      case AggOp.sum:
        return 'SUM (suma)';
      case AggOp.avg:
        return 'AVG (promedio)';
      case AggOp.min:
        return 'MIN (mínimo)';
      case AggOp.max:
        return 'MAX (máximo)';
      case AggOp.count:
        return 'COUNT (cantidad)';
    }
  }
}

AggOp parseAggOp(String raw) {
  switch (raw.toUpperCase()) {
    case 'AVG':
      return AggOp.avg;
    case 'MIN':
      return AggOp.min;
    case 'MAX':
      return AggOp.max;
    case 'COUNT':
      return AggOp.count;
    case 'SUM':
    default:
      return AggOp.sum;
  }
}

FieldType parseFieldType(String? raw) {
  switch (raw) {
    case 'memo':
      return FieldType.memo;
    case 'number':
      return FieldType.number;
    case 'decimal':
      return FieldType.decimal;
    case 'boolean':
      return FieldType.boolean;
    case 'date':
      return FieldType.date;
    case 'dropdown':
      return FieldType.dropdown;
    case 'image':
      return FieldType.image;
    case 'link':
      return FieldType.link;
    case 'detalle':
      return FieldType.detalle;
    case 'formula':
      return FieldType.formula;
    case 'agregacion':
      return FieldType.agregacion;
    case 'text':
    default:
      return FieldType.text;
  }
}

class DatabaseEntry {
  final int id;
  final String name;
  final String? createdAt;

  DatabaseEntry({required this.id, required this.name, this.createdAt});

  factory DatabaseEntry.fromJson(Map<String, dynamic> j) => DatabaseEntry(
        id: j['id'] as int,
        name: (j['name'] ?? '') as String,
        createdAt: j['created_at'] as String?,
      );
}

class TableEntry {
  final int id;
  final String name;
  TableEntry({required this.id, required this.name});

  factory TableEntry.fromJson(Map<String, dynamic> j) => TableEntry(
        id: j['id'] as int,
        name: (j['name'] ?? '') as String,
      );
}

class DatabaseDetail {
  final DatabaseEntry database;
  final List<TableEntry> tables;
  DatabaseDetail({required this.database, required this.tables});

  factory DatabaseDetail.fromJson(Map<String, dynamic> j) {
    final tables = (j['tables'] as List<dynamic>? ?? [])
        .map((e) => TableEntry.fromJson(e as Map<String, dynamic>))
        .toList();
    return DatabaseDetail(database: DatabaseEntry.fromJson(j), tables: tables);
  }
}

/// Parsed shape of a field's `options` JSON. The server stores it as TEXT and
/// the wire format varies by type:
///   dropdown:   bare JSON array     `["a","b"]`
///   link:       bare JSON string    `"5"`
///   decimal:    object              `{"decimals": 2}`
///   detalle:    object              `{"table_id":7,"link_field_id":42}`
///   formula:    object              `{"expr":"[a]*[b]","decimals":2}`
///   agregacion: object              `{"detail_field_id":..,"operation":"SUM",
///                                     "target_field_id":..,"decimals":2}`
/// The class keeps the original `raw` value and exposes typed accessors per
/// shape. Mutations rewrite `raw` to match the type's wire format.
class FieldOptions {
  Object? raw;
  FieldOptions(this.raw);

  factory FieldOptions.empty() => FieldOptions(null);

  /// `incoming` is what the server returned in the `options` column — usually
  /// a JSON-encoded string, but the API sometimes hands us the already-parsed
  /// shape on POST/PUT responses.
  factory FieldOptions.fromAny(dynamic incoming) {
    if (incoming == null) return FieldOptions(null);
    if (incoming is String) {
      if (incoming.isEmpty) return FieldOptions(null);
      try {
        return FieldOptions(jsonDecode(incoming));
      } catch (_) {
        return FieldOptions(incoming);
      }
    }
    return FieldOptions(incoming);
  }

  Map<String, dynamic> get _map {
    if (raw is Map<String, dynamic>) return raw as Map<String, dynamic>;
    final m = <String, dynamic>{};
    raw = m;
    return m;
  }

  // dropdown
  List<String> get choices {
    final r = raw;
    if (r is List) return r.map((e) => e.toString()).toList();
    return const [];
  }

  set choices(List<String> v) {
    raw = List<String>.from(v);
  }

  // link → table id stored as bare string
  int? get linkTableId {
    final r = raw;
    if (r is num) return r.toInt();
    if (r is String) return int.tryParse(r);
    if (r is Map && r['linkTable'] != null) {
      final v = r['linkTable'];
      if (v is num) return v.toInt();
      if (v is String) return int.tryParse(v);
    }
    return null;
  }

  set linkTableId(int? v) {
    raw = v?.toString();
  }

  // decimal / formula / agregacion → "decimals"
  int? get decimals {
    final r = raw;
    if (r is Map && r['decimals'] != null) {
      final v = r['decimals'];
      if (v is int) return v;
      if (v is num) return v.toInt();
      if (v is String) return int.tryParse(v);
    }
    return null;
  }

  set decimals(int? v) {
    if (v == null) {
      _map.remove('decimals');
    } else {
      _map['decimals'] = v;
    }
  }

  // detalle
  int? get detalleTableId {
    final r = raw;
    if (r is Map) {
      final v = r['table_id'];
      if (v is num) return v.toInt();
      if (v is String) return int.tryParse(v);
    }
    return null;
  }

  set detalleTableId(int? v) {
    if (v == null) {
      _map.remove('table_id');
    } else {
      _map['table_id'] = v;
    }
  }

  int? get detalleLinkFieldId {
    final r = raw;
    if (r is Map) {
      final v = r['link_field_id'];
      if (v is num) return v.toInt();
      if (v is String) return int.tryParse(v);
    }
    return null;
  }

  set detalleLinkFieldId(int? v) {
    if (v == null) {
      _map.remove('link_field_id');
    } else {
      _map['link_field_id'] = v;
    }
  }

  // formula
  String? get formulaExpr {
    final r = raw;
    if (r is Map) return r['expr']?.toString();
    return null;
  }

  set formulaExpr(String? v) {
    if (v == null) {
      _map.remove('expr');
    } else {
      _map['expr'] = v;
    }
  }

  // agregacion
  int? get aggDetailFieldId {
    final r = raw;
    if (r is Map) {
      final v = r['detail_field_id'];
      if (v is num) return v.toInt();
      if (v is String) return int.tryParse(v);
    }
    return null;
  }

  set aggDetailFieldId(int? v) {
    if (v == null) {
      _map.remove('detail_field_id');
    } else {
      _map['detail_field_id'] = v;
    }
  }

  AggOp get aggOperation {
    final r = raw;
    if (r is Map && r['operation'] is String) return parseAggOp(r['operation'] as String);
    return AggOp.sum;
  }

  set aggOperation(AggOp v) => _map['operation'] = v.apiValue;

  int? get aggTargetFieldId {
    final r = raw;
    if (r is Map) {
      final v = r['target_field_id'];
      if (v is num) return v.toInt();
      if (v is String) return int.tryParse(v);
    }
    return null;
  }

  set aggTargetFieldId(int? v) {
    if (v == null) {
      _map.remove('target_field_id');
    } else {
      _map['target_field_id'] = v;
    }
  }

  /// Returns the value to send back to the server in the `options` field.
  /// The server expects shape per type — array for dropdown, string for link,
  /// object for the rest. Returns null when empty (server stores NULL).
  Object? toWire() {
    final r = raw;
    if (r == null) return null;
    if (r is List) return r.isEmpty ? null : r;
    if (r is String) return r.isEmpty ? null : r;
    if (r is Map) return r.isEmpty ? null : r;
    return r;
  }
}

class FieldEntry {
  final int? id;
  String name;
  FieldType type;
  FieldOptions options;
  int position;
  int? width;

  FieldEntry({
    this.id,
    required this.name,
    required this.type,
    FieldOptions? options,
    this.position = 0,
    this.width,
  }) : options = options ?? FieldOptions.empty();

  factory FieldEntry.fromJson(Map<String, dynamic> j) => FieldEntry(
        id: j['id'] as int?,
        name: (j['name'] ?? '') as String,
        type: parseFieldType(j['type'] as String?),
        options: FieldOptions.fromAny(j['options']),
        position: (j['position'] as int?) ?? 0,
        width: j['width'] as int?,
      );

  Map<String, dynamic> toJsonForCreate() {
    final w = options.toWire();
    return {
      'name': name,
      'type': type.apiValue,
      if (w != null) 'options': w,
      if (width != null) 'width': width,
    };
  }

  Map<String, dynamic> toJsonForUpdate() => {
        if (id != null) 'id': id,
        ...toJsonForCreate(),
      };
}

class TableDetail {
  final int id;
  final int databaseId;
  final String name;
  final List<FieldEntry> fields;

  TableDetail({
    required this.id,
    required this.databaseId,
    required this.name,
    required this.fields,
  });

  factory TableDetail.fromJson(Map<String, dynamic> j) => TableDetail(
        id: j['id'] as int,
        databaseId: j['database_id'] as int,
        name: (j['name'] ?? '') as String,
        fields: (j['fields'] as List<dynamic>? ?? [])
            .map((e) => FieldEntry.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class RecordEntry {
  final int id;
  final Map<String, String> values; // keyed by field id (as string)
  RecordEntry({required this.id, required this.values});

  factory RecordEntry.fromJson(Map<String, dynamic> j) {
    final raw = (j['values'] as Map<String, dynamic>? ?? {});
    final values = <String, String>{};
    raw.forEach((k, v) => values[k] = v?.toString() ?? '');
    return RecordEntry(id: j['id'] as int, values: values);
  }
}

class TableRecords {
  final List<FieldEntry> fields;
  final List<RecordEntry> records;
  TableRecords({required this.fields, required this.records});

  factory TableRecords.fromJson(Map<String, dynamic> j) => TableRecords(
        fields: (j['fields'] as List<dynamic>? ?? [])
            .map((e) => FieldEntry.fromJson(e as Map<String, dynamic>))
            .toList(),
        records: (j['records'] as List<dynamic>? ?? [])
            .map((e) => RecordEntry.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class TemplateSummary {
  final String id;
  final String name;
  final String? description;
  TemplateSummary({required this.id, required this.name, this.description});

  factory TemplateSummary.fromJson(Map<String, dynamic> j) => TemplateSummary(
        id: j['id'] as String,
        name: (j['name'] ?? '') as String,
        description: j['description'] as String?,
      );
}
