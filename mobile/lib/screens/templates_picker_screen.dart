import 'package:flutter/material.dart';

import '../api.dart';
import '../ui.dart';

class TemplatesPickerScreen extends StatefulWidget {
  const TemplatesPickerScreen({super.key});

  @override
  State<TemplatesPickerScreen> createState() => _TemplatesPickerScreenState();
}

class _TemplatesPickerScreenState extends State<TemplatesPickerScreen> {
  late Future<List<TemplateSummary>> _future;
  TextEditingController? _activeNameCtrl;

  @override
  void initState() {
    super.initState();
    _future = ApiClient.instance.listTemplates();
  }

  @override
  void dispose() {
    _activeNameCtrl?.dispose();
    super.dispose();
  }

  Future<void> _create(TemplateSummary t) async {
    _activeNameCtrl?.dispose();
    final nameCtrl = TextEditingController(text: t.name);
    _activeNameCtrl = nameCtrl;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Crear desde plantilla'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (t.description != null) Text(t.description!),
            const SizedBox(height: 12),
            TextField(
              controller: nameCtrl,
              autofocus: true,
              decoration: const InputDecoration(labelText: 'Nombre de la base'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Cancelar')),
          FilledButton(onPressed: () => Navigator.of(ctx).pop(true), child: const Text('Crear')),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    try {
      await ApiClient.instance.createFromTemplate(t.id, name: nameCtrl.text.trim());
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) showErrorSnack(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Plantillas')),
      body: FutureBuilder<List<TemplateSummary>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return Padding(padding: const EdgeInsets.all(24), child: Text('Error: ${snap.error}'));
          }
          final templates = snap.data ?? [];
          return ListView.separated(
            itemCount: templates.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (_, i) {
              final t = templates[i];
              return ListTile(
                leading: const Icon(Icons.auto_awesome),
                title: Text(t.name),
                subtitle: t.description != null ? Text(t.description!) : null,
                trailing: const Icon(Icons.add),
                onTap: () => _create(t),
              );
            },
          );
        },
      ),
    );
  }
}
