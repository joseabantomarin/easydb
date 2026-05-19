import 'package:flutter/material.dart';

import '../api.dart';
import '../auth.dart';
import '../ui.dart';
import 'login_screen.dart';
import 'tables_screen.dart';
import 'templates_picker_screen.dart';

class DatabasesScreen extends StatefulWidget {
  const DatabasesScreen({super.key});

  @override
  State<DatabasesScreen> createState() => _DatabasesScreenState();
}

class _DatabasesScreenState extends State<DatabasesScreen> {
  late Future<List<DatabaseEntry>> _future;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() {
    setState(() {
      _future = ApiClient.instance.listDatabases();
    });
  }

  Future<void> _refresh() async {
    _reload();
    await _future;
  }

  Future<void> _signOut() async {
    await AuthService.instance.signOut();
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
    );
  }

  Future<void> _createDatabase() async {
    final name = await promptText(context, title: 'Nueva base de datos');
    if (name == null || name.trim().isEmpty) return;
    try {
      await ApiClient.instance.createDatabase(name.trim());
      _reload();
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    }
  }

  Future<void> _openTemplates() async {
    final created = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => const TemplatesPickerScreen()),
    );
    if (created == true) _reload();
  }

  Future<void> _renameDatabase(DatabaseEntry d) async {
    final name = await promptText(context, title: 'Renombrar', initial: d.name);
    if (name == null || name.trim().isEmpty) return;
    try {
      await ApiClient.instance.renameDatabase(d.id, name.trim());
      _reload();
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    }
  }

  Future<void> _deleteDatabase(DatabaseEntry d) async {
    final ok = await confirmDelete(
      context,
      title: 'Eliminar “${d.name}”',
      body: 'Se borrarán también todas sus tablas y registros. ¿Continuar?',
    );
    if (ok != true) return;
    try {
      await ApiClient.instance.deleteDatabase(d.id);
      _reload();
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = AuthService.instance.user;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mis bases de datos'),
        actions: [
          IconButton(
            tooltip: 'Plantillas',
            icon: const Icon(Icons.auto_awesome),
            onPressed: _openTemplates,
          ),
          IconButton(
            tooltip: user?.name ?? user?.email ?? 'Cerrar sesión',
            icon: const Icon(Icons.logout),
            onPressed: _signOut,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _createDatabase,
        icon: const Icon(Icons.add),
        label: const Text('Nueva'),
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: FutureBuilder<List<DatabaseEntry>>(
          future: _future,
          builder: (context, snap) {
            if (snap.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snap.hasError) {
              return ListView(children: [
                Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text('Error: ${snap.error}'),
                ),
              ]);
            }
            final dbs = snap.data ?? [];
            if (dbs.isEmpty) {
              return ListView(children: const [
                Padding(
                  padding: EdgeInsets.all(24),
                  child: Text(
                    'Aún no tienes bases de datos.\nUsa el botón "Nueva" o el menú de plantillas.',
                  ),
                ),
              ]);
            }
            return ListView.separated(
              itemCount: dbs.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (_, i) {
                final d = dbs[i];
                return ListTile(
                  leading: const Icon(Icons.storage),
                  title: Text(d.name),
                  subtitle: d.createdAt != null ? Text(d.createdAt!) : null,
                  trailing: PopupMenuButton<String>(
                    onSelected: (v) {
                      if (v == 'rename') _renameDatabase(d);
                      if (v == 'delete') _deleteDatabase(d);
                    },
                    itemBuilder: (_) => const [
                      PopupMenuItem(value: 'rename', child: Text('Renombrar')),
                      PopupMenuItem(value: 'delete', child: Text('Eliminar')),
                    ],
                  ),
                  onTap: () {
                    Navigator.of(context).push(MaterialPageRoute(
                      builder: (_) => TablesScreen(databaseId: d.id, databaseName: d.name),
                    ));
                  },
                );
              },
            );
          },
        ),
      ),
    );
  }
}

