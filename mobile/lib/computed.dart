import 'models.dart';

/// Display label for a record from a linked table — first up to [parts]
/// non-empty field values joined by `|`, falling back to `#<id>`. Mirrors the
/// web's `linkedLabel`.
String linkRecordLabel(TableRecords linked, RecordEntry target, {int parts = 2}) {
  final out = <String>[];
  for (final f in linked.fields.take(parts)) {
    final v = target.values[f.id.toString()];
    if (v != null && v.isNotEmpty) out.add(v);
  }
  return out.isEmpty ? '#${target.id}' : out.join(' | ');
}

/// Evaluates `formula` and `agregacion` fields. Mirrors the web's
/// `evalFormula` / `loadAggregations`. Expressions look like
/// `[campo1] * [precio] + 5`; after `[name]` substitution the remaining
/// string must contain only digits, whitespace, parens, and `+ - * /`.
class ComputeContext {
  final List<FieldEntry> fields;
  final Map<int, TableRecords> childCache;

  ComputeContext({required this.fields, required this.childCache});

  FieldEntry? fieldByName(String name) {
    for (final f in fields) {
      if (f.name == name) return f;
    }
    return null;
  }

  FieldEntry? fieldById(int id) {
    for (final f in fields) {
      if (f.id == id) return f;
    }
    return null;
  }
}

double? evalFormula(String? expr, RecordEntry record, ComputeContext ctx) {
  if (expr == null || expr.isEmpty) return null;
  final replaced = expr.replaceAllMapped(RegExp(r'\[([^\]]+)\]'), (m) {
    final name = m.group(1)!;
    final f = ctx.fieldByName(name);
    if (f == null) return '0';
    final v = _numericValueFor(f, record, ctx);
    return v.isFinite ? v.toString() : '0';
  });
  if (!RegExp(r'^[\d\s+\-*/().]+$').hasMatch(replaced)) return null;
  try {
    final r = _evalArithmetic(replaced);
    if (r.isFinite) return r;
  } catch (_) {}
  return null;
}

double _numericValueFor(FieldEntry f, RecordEntry record, ComputeContext ctx) {
  if (f.id == null) return double.nan;
  if (f.type == FieldType.boolean) {
    final raw = record.values[f.id.toString()] ?? '';
    return (raw == '1' || raw.toLowerCase() == 'true') ? 1.0 : 0.0;
  }
  if (f.type == FieldType.formula) {
    final v = evalFormula(f.options.formulaExpr, record, ctx);
    return v ?? double.nan;
  }
  if (f.type == FieldType.agregacion) {
    final v = computeAggregation(f, record, ctx);
    return v ?? double.nan;
  }
  final raw = record.values[f.id.toString()] ?? '';
  return double.tryParse(raw) ?? double.nan;
}

double? computeAggregation(
  FieldEntry aggField,
  RecordEntry parent,
  ComputeContext ctx,
) {
  final detFieldId = aggField.options.aggDetailFieldId;
  if (detFieldId == null) return null;
  final detField = ctx.fieldById(detFieldId);
  if (detField == null || detField.type != FieldType.detalle) return null;

  final childTableId = detField.options.detalleTableId;
  final linkFieldId = detField.options.detalleLinkFieldId;
  if (childTableId == null || linkFieldId == null) return null;

  final child = ctx.childCache[childTableId];
  if (child == null) return null;

  final relevant = child.records.where((cr) {
    final pid = cr.values[linkFieldId.toString()] ?? '';
    return int.tryParse(pid) == parent.id;
  }).toList();

  final operation = aggField.options.aggOperation;
  if (operation == AggOp.count) return relevant.length.toDouble();

  final targetId = aggField.options.aggTargetFieldId;
  if (targetId == null) return 0;
  final targetField = child.fields.firstWhere(
    (f) => f.id == targetId,
    orElse: () => FieldEntry(name: '', type: FieldType.text),
  );

  final nums = <double>[];
  final childCtx = ComputeContext(fields: child.fields, childCache: ctx.childCache);
  for (final cr in relevant) {
    final v = _numericValueFor(targetField, cr, childCtx);
    if (v.isFinite) nums.add(v);
  }
  if (nums.isEmpty) return 0;

  switch (operation) {
    case AggOp.avg:
      return nums.reduce((a, b) => a + b) / nums.length;
    case AggOp.min:
      return nums.reduce((a, b) => a < b ? a : b);
    case AggOp.max:
      return nums.reduce((a, b) => a > b ? a : b);
    case AggOp.sum:
      return nums.reduce((a, b) => a + b);
    case AggOp.count:
      return relevant.length.toDouble();
  }
}

/// Recursive-descent arithmetic over `+ - * /`, unary minus, parens, and
/// floating-point literals. Throws on syntax error so callers can fall back.
double _evalArithmetic(String src) {
  final p = _Parser(src);
  final r = p._expr();
  p._skipWs();
  if (!p._atEnd) throw FormatException('Unexpected at ${p._i}');
  return r;
}

class _Parser {
  final String src;
  int _i = 0;
  _Parser(this.src);

  bool get _atEnd => _i >= src.length;

  void _skipWs() {
    while (!_atEnd && (src.codeUnitAt(_i) == 0x20 || src.codeUnitAt(_i) == 0x09)) {
      _i++;
    }
  }

  bool _match(String c) {
    _skipWs();
    if (!_atEnd && src[_i] == c) {
      _i++;
      return true;
    }
    return false;
  }

  double _expr() {
    double left = _term();
    while (true) {
      if (_match('+')) {
        left += _term();
      } else if (_match('-')) {
        left -= _term();
      } else {
        return left;
      }
    }
  }

  double _term() {
    double left = _unary();
    while (true) {
      if (_match('*')) {
        left *= _unary();
      } else if (_match('/')) {
        final r = _unary();
        left = r == 0 ? double.nan : left / r;
      } else {
        return left;
      }
    }
  }

  double _unary() {
    if (_match('-')) return -_unary();
    if (_match('+')) return _unary();
    return _primary();
  }

  double _primary() {
    if (_match('(')) {
      final v = _expr();
      if (!_match(')')) throw const FormatException('missing )');
      return v;
    }
    _skipWs();
    final start = _i;
    while (!_atEnd) {
      final c = src.codeUnitAt(_i);
      final isDigit = c >= 0x30 && c <= 0x39;
      final isDot = c == 0x2E;
      if (isDigit || isDot) {
        _i++;
      } else {
        break;
      }
    }
    if (_i == start) throw FormatException('Expected number at $start');
    return double.parse(src.substring(start, _i));
  }
}
