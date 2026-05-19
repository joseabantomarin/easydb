import 'package:flutter/material.dart';

import '../auth.dart';
import 'databases_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  bool _loading = false;
  String? _error;

  Future<void> _handleSignIn() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await AuthService.instance.signInWithGoogle();
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const DatabasesScreen()),
      );
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'EasyDB',
                style: TextStyle(fontSize: 36, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              const Text('Tus bases de datos, en el bolsillo.'),
              const SizedBox(height: 32),
              ElevatedButton.icon(
                onPressed: _loading ? null : _handleSignIn,
                icon: const Icon(Icons.login),
                label: Text(_loading ? 'Iniciando sesión…' : 'Entrar con Google'),
              ),
              if (_error != null) ...[
                const SizedBox(height: 16),
                Text(
                  _error!,
                  style: const TextStyle(color: Colors.red),
                  textAlign: TextAlign.center,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
