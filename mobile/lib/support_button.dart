import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';

const _supportGreen = Color(0xFF16A34A);
const _supportGreenDark = Color(0xFF22C55E);
const _paypalUrl = 'https://www.paypal.com/ncp/payment/VZ3CFJK4YDBML';
const _supportName = 'José Abanto';

Color _green(BuildContext context) =>
    Theme.of(context).brightness == Brightness.dark
        ? _supportGreenDark
        : _supportGreen;

class SupportButton extends StatelessWidget {
  const SupportButton({super.key});

  @override
  Widget build(BuildContext context) {
    final green = _green(context);
    return OutlinedButton(
      style: OutlinedButton.styleFrom(
        foregroundColor: green,
        side: BorderSide(color: green, width: 2),
        shape: const StadiumBorder(),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      ).copyWith(
        overlayColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.hovered) ||
              states.contains(WidgetState.pressed)) {
            return green.withValues(alpha: 0.12);
          }
          return null;
        }),
      ),
      onPressed: () => showSupportDialog(context),
      child: const Text('💚 Apóyanos voluntariamente 🙏'),
    );
  }
}

Future<void> showSupportDialog(BuildContext context) {
  return showDialog<void>(
    context: context,
    builder: (ctx) => const _SupportDialog(),
  );
}

class _SupportDialog extends StatelessWidget {
  const _SupportDialog();

  @override
  Widget build(BuildContext context) {
    final green = _green(context);
    final theme = Theme.of(context);
    final mutedStyle = theme.textTheme.bodyMedium?.copyWith(
      color: theme.colorScheme.onSurfaceVariant,
    );
    final smallMutedStyle = theme.textTheme.bodySmall?.copyWith(
      color: theme.colorScheme.onSurfaceVariant,
    );
    final labelStyle = theme.textTheme.labelSmall?.copyWith(
      color: green,
      fontWeight: FontWeight.w700,
      letterSpacing: 1.0,
    );

    return Dialog(
      insetPadding: const EdgeInsets.all(16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 360),
        child: Stack(
          children: [
            SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Apóyanos voluntariamente',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Tu apoyo es totalmente voluntario y ayuda a mantener la app. ¡Gracias! 🙏',
                    textAlign: TextAlign.center,
                    style: mutedStyle,
                  ),
                  const SizedBox(height: 20),
                  Text('YAPE (PERÚ)', style: labelStyle),
                  const SizedBox(height: 12),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.asset(
                      'assets/yape-qr.png',
                      width: 240,
                      fit: BoxFit.contain,
                      semanticLabel: 'Código QR de Yape — $_supportName',
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Escanéalo desde otro dispositivo con la app Yape.',
                    textAlign: TextAlign.center,
                    style: smallMutedStyle,
                  ),
                  const SizedBox(height: 20),
                  const Divider(),
                  const SizedBox(height: 12),
                  Text('INTERNACIONAL', style: labelStyle),
                  const SizedBox(height: 12),
                  FilledButton(
                    style: FilledButton.styleFrom(
                      backgroundColor: green,
                      foregroundColor: Colors.white,
                      shape: const StadiumBorder(),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 24,
                        vertical: 12,
                      ),
                    ),
                    onPressed: () async {
                      await SharePlus.instance.share(
                        ShareParams(uri: Uri.parse(_paypalUrl)),
                      );
                    },
                    child: const Text('Donar con PayPal'),
                  ),
                  const SizedBox(height: 8),
                ],
              ),
            ),
            Positioned(
              top: 4,
              right: 4,
              child: IconButton(
                tooltip: 'Cerrar',
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
