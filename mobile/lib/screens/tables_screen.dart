import 'package:flutter/material.dart';

import '../api.dart';
import '../ui.dart';
import 'records_screen.dart';
import 'table_editor_screen.dart';

class TablesScreen extends StatefulWidget {
  final int databaseId;
  final String databaseName;
  const TablesScreen({
    super.key,
    required this.databaseId,
    required this.databaseName,
  });

  @override
  State<TablesScreen> createState() => _TablesScreenState();
}

class _TablesScreenState extends State<TablesScreen> {
  late Future<DatabaseDetail> _future;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() {
    setState(() {
      _future = ApiClient.instance.getDatabase(widget.databaseId);
    });
  }

  Future<void> _createTable() async {
    final created = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => TableEditorScreen(databaseId: widget.databaseId),
      ),
    );
    if (created == true) _reload();
  }

  Future<void> _editTable(TableEntry t) async {
    final saved = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => TableEditorScreen(databaseId: widget.databaseId, tableId: t.id),
      ),
    );
    if (saved == true) _reload();
  }

  Future<void> _deleteTable(TableEntry t) async {
    final ok = await confirmDelete(
      context,
      title: 'Eliminar “${t.name}”',
      body: 'También se borrarán todos sus registros. ¿Continuar?',
    );
    if (ok != true) return;
    try {
      await ApiClient.instance.deleteTable(t.id);
      _reload();
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.databaseName)),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _createTable,
        icon: const Icon(Icons.add),
        label: const Text('Nueva tabla'),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          _reload();
          await _future;
        },
        child: FutureBuilder<DatabaseDetail>(
          future: _future,
          builder: (context, snap) {
            if (snap.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snap.hasError) {
              return ListView(children: [
                Padding(padding: const EdgeInsets.all(24), child: Text('Error: ${snap.error}')),
              ]);
            }
            final tables = snap.data?.tables ?? [];
            if (tables.isEmpty) {
              return ListView(children: const [
                Padding(
                  padding: EdgeInsets.all(24),
                  child: Text('Esta base de datos aún no tiene tablas.'),
                ),
              ]);
            }
            return ListView.separated(
              itemCount: tables.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (_, i) {
                final t = tables[i];
                return ListTile(
                  leading: const Icon(Icons.table_chart),
                  title: Text(t.name),
                  trailing: PopupMenuButton<String>(
                    onSelected: (v) {
                      if (v == 'edit') _editTable(t);
                      if (v == 'delete') _deleteTable(t);
                    },
                    itemBuilder: (_) => const [
                      PopupMenuItem(value: 'edit', child: Text('Editar campos')),
                      PopupMenuItem(value: 'delete', child: Text('Eliminar')),
                    ],
                  ),
                  onTap: () {
                    Navigator.of(context).push(MaterialPageRoute(
                      builder: (_) => RecordsScreen(tableId: t.id, tableName: t.name),
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
