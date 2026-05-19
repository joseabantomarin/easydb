import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:http/http.dart' as http;

import 'config.dart';

class AuthUser {
  final int id;
  final String? email;
  final String? name;
  final String? image;

  const AuthUser({required this.id, this.email, this.name, this.image});

  factory AuthUser.fromJson(Map<String, dynamic> json) => AuthUser(
        id: json['id'] as int,
        email: json['email'] as String?,
        name: json['name'] as String?,
        image: json['image'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'name': name,
        'image': image,
      };
}

class AuthService {
  AuthService._();
  static final AuthService instance = AuthService._();

  static const _kToken = 'easydb_token';
  static const _kUser = 'easydb_user';

  final _storage = const FlutterSecureStorage();

  String? _token;
  AuthUser? _user;

  String? get token => _token;
  AuthUser? get user => _user;
  bool get isAuthenticated => _token != null;

  Future<void> loadFromStorage() async {
    _token = await _storage.read(key: _kToken);
    final userJson = await _storage.read(key: _kUser);
    if (userJson != null) {
      _user = AuthUser.fromJson(jsonDecode(userJson) as Map<String, dynamic>);
    }
  }

  Future<void> signInWithGoogle() async {
    final google = GoogleSignIn.instance;
    await google.initialize(serverClientId: AppConfig.googleServerClientId);

    final account = await google.authenticate();
    final auth = account.authentication;
    final idToken = auth.idToken;
    if (idToken == null) {
      throw Exception('Google no devolvió un id_token. Verifica el serverClientId.');
    }

    final res = await http.post(
      Uri.parse('${AppConfig.apiBaseUrl}/api/auth/mobile'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'id_token': idToken}),
    );
    if (res.statusCode != 200) {
      throw Exception('Login falló (${res.statusCode}): ${res.body}');
    }
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    _token = data['token'] as String;
    _user = AuthUser.fromJson(data['user'] as Map<String, dynamic>);
    await _storage.write(key: _kToken, value: _token);
    await _storage.write(key: _kUser, value: jsonEncode(_user!.toJson()));
  }

  Future<void> signOut() async {
    _token = null;
    _user = null;
    await _storage.delete(key: _kToken);
    await _storage.delete(key: _kUser);
    try {
      await GoogleSignIn.instance.signOut();
    } catch (_) {}
  }
}
