import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import 'auth.dart';
import 'config.dart';
import 'models.dart';

export 'models.dart';

class ApiException implements Exception {
  final int status;
  final String message;
  ApiException(this.status, this.message);
  @override
  String toString() => 'ApiException($status): $message';
}

class ApiClient {
  ApiClient._();
  static final ApiClient instance = ApiClient._();

  Map<String, String> _headers({bool json = true}) {
    final token = AuthService.instance.token;
    return {
      if (token != null) 'Authorization': 'Bearer $token',
      if (json) 'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  Uri _uri(String path) => Uri.parse('${AppConfig.apiBaseUrl}$path');

  String fileUrl(String filename) => '${AppConfig.apiBaseUrl}/api/files/$filename';

  Future<dynamic> _decode(http.Response res) async {
    if (res.statusCode < 200 || res.statusCode >= 300) {
      String msg = res.body;
      try {
        final m = jsonDecode(res.body) as Map<String, dynamic>;
        msg = (m['error'] ?? res.body).toString();
      } catch (_) {}
      throw ApiException(res.statusCode, msg);
    }
    if (res.body.isEmpty) return null;
    return jsonDecode(res.body);
  }

  // --- Databases ---

  Future<List<DatabaseEntry>> listDatabases() async {
    final res = await http.get(_uri('/api/databases'), headers: _headers());
    final data = await _decode(res) as List<dynamic>;
    return data
        .map((e) => DatabaseEntry.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<DatabaseEntry> createDatabase(String name) async {
    final res = await http.post(
      _uri('/api/databases'),
      headers: _headers(),
      body: jsonEncode({'name': name}),
    );
    return DatabaseEntry.fromJson(await _decode(res) as Map<String, dynamic>);
  }

  Future<DatabaseEntry> renameDatabase(int id, String name) async {
    final res = await http.put(
      _uri('/api/databases/$id'),
      headers: _headers(),
      body: jsonEncode({'name': name}),
    );
    return DatabaseEntry.fromJson(await _decode(res) as Map<String, dynamic>);
  }

  Future<void> deleteDatabase(int id) async {
    final res = await http.delete(_uri('/api/databases/$id'), headers: _headers());
    await _decode(res);
  }

  Future<DatabaseDetail> getDatabase(int id) async {
    final res = await http.get(_uri('/api/databases/$id'), headers: _headers());
    return DatabaseDetail.fromJson(await _decode(res) as Map<String, dynamic>);
  }

  // --- Templates ---

  Future<List<TemplateSummary>> listTemplates() async {
    final res = await http.get(_uri('/api/templates'), headers: _headers());
    final data = await _decode(res) as List<dynamic>;
    return data
        .map((e) => TemplateSummary.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<DatabaseEntry> createFromTemplate(String templateId, {String? name}) async {
    final res = await http.post(
      _uri('/api/databases/from-template'),
      headers: _headers(),
      body: jsonEncode({
        'template_id': templateId,
        if (name != null && name.isNotEmpty) 'name': name,
      }),
    );
    return DatabaseEntry.fromJson(await _decode(res) as Map<String, dynamic>);
  }

  // --- Tables ---

  Future<TableDetail> getTable(int id) async {
    final res = await http.get(_uri('/api/tables/$id'), headers: _headers());
    return TableDetail.fromJson(await _decode(res) as Map<String, dynamic>);
  }

  Future<TableDetail> createTable({
    required int databaseId,
    required String name,
    required List<FieldEntry> fields,
  }) async {
    final res = await http.post(
      _uri('/api/tables'),
      headers: _headers(),
      body: jsonEncode({
        'database_id': databaseId,
        'name': name,
        'fields': fields.map((f) => f.toJsonForCreate()).toList(),
      }),
    );
    return TableDetail.fromJson(await _decode(res) as Map<String, dynamic>);
  }

  Future<TableDetail> updateTable({
    required int id,
    String? name,
    List<FieldEntry>? fields,
  }) async {
    final res = await http.put(
      _uri('/api/tables/$id'),
      headers: _headers(),
      body: jsonEncode({
        if (name != null) 'name': name,
        if (fields != null)
          'fields': fields.map((f) => f.toJsonForUpdate()).toList(),
      }),
    );
    return TableDetail.fromJson(await _decode(res) as Map<String, dynamic>);
  }

  Future<void> deleteTable(int id) async {
    final res = await http.delete(_uri('/api/tables/$id'), headers: _headers());
    await _decode(res);
  }

  // --- Records ---

  Future<TableRecords> getRecords(int tableId) async {
    final res = await http.get(
      _uri('/api/records?table_id=$tableId'),
      headers: _headers(),
    );
    return TableRecords.fromJson(await _decode(res) as Map<String, dynamic>);
  }

  Future<RecordEntry> createRecord(int tableId, Map<int, String> values) async {
    final res = await http.post(
      _uri('/api/records'),
      headers: _headers(),
      body: jsonEncode({
        'table_id': tableId,
        'values': values.map((k, v) => MapEntry(k.toString(), v)),
      }),
    );
    final j = await _decode(res) as Map<String, dynamic>;
    return RecordEntry(
      id: j['id'] as int,
      values: values.map((k, v) => MapEntry(k.toString(), v)),
    );
  }

  Future<void> updateRecord(int recordId, Map<int, String> values) async {
    final res = await http.put(
      _uri('/api/records/$recordId'),
      headers: _headers(),
      body: jsonEncode({
        'values': values.map((k, v) => MapEntry(k.toString(), v)),
      }),
    );
    await _decode(res);
  }

  Future<void> deleteRecord(int id) async {
    final res = await http.delete(_uri('/api/records/$id'), headers: _headers());
    await _decode(res);
  }

  // --- Uploads ---

  Future<String> uploadImage(File file) async {
    final req = http.MultipartRequest('POST', _uri('/api/upload'))
      ..headers.addAll(_headers(json: false))
      ..files.add(await http.MultipartFile.fromPath('file', file.path));
    final streamed = await req.send();
    final res = await http.Response.fromStream(streamed);
    final j = await _decode(res) as Map<String, dynamic>;
    return j['filename'] as String;
  }
}
