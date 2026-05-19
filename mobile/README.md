# EasyDB Mobile

Flutter client for the EasyDB Next.js API. Authenticates via Google Sign-In and
talks to the same REST endpoints (`/api/databases`, `/api/tables`, `/api/records`)
as the web app. Read-only viewer for v1 — list databases, drill into tables,
inspect records.

## Platforms

- **Android** — primary target, builds a release APK
- **iOS** — scaffold only, not configured for distribution

## Configuration

Edit `lib/config.dart` or pass `--dart-define` at build time:

| Var | What |
| --- | --- |
| `EASYDB_API_BASE_URL` | Base URL of the deployed EasyDB server (e.g. `https://easydb.example.com`). Defaults to `http://10.0.2.2:3001` (Android emulator → host machine). |
| `EASYDB_GOOGLE_SERVER_CLIENT_ID` | The **Web** OAuth 2.0 Client ID from Google Cloud Console — the same value the Next.js app uses as `GOOGLE_CLIENT_ID`. |

For Google Sign-In to actually work at runtime you also need to:

1. Create an **Android** OAuth 2.0 Client in Google Cloud Console for package
   `app.openlinks.easydb`, with your signing key's SHA-1
   fingerprint.
2. Make sure the **Web** client ID (used as `serverClientId`) is in the same
   project and is the audience that the Next.js server validates.

## Build

```bash
flutter pub get
flutter build apk --release \
  --dart-define=EASYDB_API_BASE_URL=https://your-easydb.example.com \
  --dart-define=EASYDB_GOOGLE_SERVER_CLIENT_ID=xxx.apps.googleusercontent.com
```

The APK lands at `build/app/outputs/flutter-apk/app-release.apk`.

## How auth works

1. Flutter triggers Google Sign-In via `google_sign_in` and receives an ID token.
2. The token is POSTed to `/api/auth/mobile` on the Next.js server.
3. The server verifies the token via Google's `tokeninfo` endpoint, upserts the
   user, and returns a long-lived JWT signed with `NEXTAUTH_SECRET`.
4. The Flutter app stores that JWT in `flutter_secure_storage` and sends it as
   `Authorization: Bearer <jwt>` on every subsequent request. The Next.js
   middleware and `requireUserId()` recognize Bearer tokens alongside the
   existing cookie-based session.
