import 'package:flutter/material.dart';

import 'auth.dart';
import 'screens/databases_screen.dart';
import 'screens/login_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AuthService.instance.loadFromStorage();
  runApp(const EasyDbApp());
}

class EasyDbApp extends StatelessWidget {
  const EasyDbApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'EasyDB',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF1E88E5)),
      ),
      home: AuthService.instance.isAuthenticated
          ? const DatabasesScreen()
          : const LoginScreen(),
    );
  }
}
