# EasyDB Mobile

Flutter client for the [EasyDB](../README.md) Next.js API. Authenticates via
Google Sign-In and hits the same REST endpoints as the web app, with full
parity: databases, tables, fields (all 12 types including detalle / formula /
agregación), records (with horizontal data-grid view, sort, group-by,
date-range filter, pagination, grand totals, CSV export, image upload +
lightbox), and templates.

## Platforms

| Platform | Status |
| --- | --- |
| **Android** | Primary target. Builds a release APK that works against production. |
| **iOS** | Scaffold only — runs but not configured for App Store distribution. No icon assets, no signing config, no entitlements. |

## Quick start

### 1. Install Flutter

You need Flutter 3.x with the Android SDK. Verify:

```bash
flutter doctor
```

### 2. Install dependencies

```bash
cd mobile
flutter pub get
```

### 3. Build for production

The repo ships a one-command script that builds against the production
deployment with the right OAuth client baked in:

```bash
./build_release.sh
```

That runs:

```bash
flutter build apk --release \
  --dart-define=EASYDB_API_BASE_URL=https://easydb.openlinks.app \
  --dart-define=EASYDB_GOOGLE_SERVER_CLIENT_ID=823603281404-l0mphibc3hh2ombq5dka31qibqr3vlsi.apps.googleusercontent.com
```

You can override either value with an env var before invoking:

```bash
EASYDB_API_BASE_URL=https://staging.example.com ./build_release.sh
```

The APK lands at:

```
mobile/build/app/outputs/flutter-apk/app-release.apk
```

Install it on a device:

```bash
adb install build/app/outputs/flutter-apk/app-release.apk
```

### 4. Build for development / a different backend

To point the app at a custom backend (e.g. your own Next.js dev server running
on the host machine), pass the dart-defines manually:

```bash
flutter build apk --release \
  --dart-define=EASYDB_API_BASE_URL=http://10.0.2.2:3001 \
  --dart-define=EASYDB_GOOGLE_SERVER_CLIENT_ID=<your-web-client-id>.apps.googleusercontent.com
```

`10.0.2.2` is the Android emulator's alias for the host. For a real device on
the same Wi-Fi, use your machine's LAN IP. The default values in
`lib/config.dart` already point at `http://10.0.2.2:3001` so `flutter run`
on the emulator works out of the box.

### 5. Run on a connected device or emulator

```bash
flutter run --dart-define=EASYDB_GOOGLE_SERVER_CLIENT_ID=<web-client-id>.apps.googleusercontent.com
```

## Configuration reference

Two compile-time values, both passed via `--dart-define`:

| Var | What | Default |
| --- | --- | --- |
| `EASYDB_API_BASE_URL` | Base URL of the EasyDB backend, e.g. `https://easydb.openlinks.app` or `http://10.0.2.2:3001`. No trailing slash. | `http://10.0.2.2:3001` |
| `EASYDB_GOOGLE_SERVER_CLIENT_ID` | The **Web** OAuth 2.0 client ID from Google Cloud Console — same value the Next.js server validates as `GOOGLE_CLIENT_ID`. | empty (sign-in will fail) |

## Google Sign-In setup

For Google Sign-In to work at runtime (not just compile), the Google Cloud
project that owns your Web OAuth client must also have an **Android** OAuth
client configured for this app:

- Package name: `app.openlinks.easydb`
- SHA-1 certificate fingerprint of the keystore that signs the APK

The release build is currently **debug-signed** (TODO in
`android/app/build.gradle.kts`). Its SHA-1 is:

```
18:51:F2:93:10:5E:79:5A:86:47:06:B9:ED:E6:41:16:76:ED:2A:98
```

To get the SHA-1 of any keystore yourself:

```bash
keytool -list -v -keystore ~/.android/debug.keystore \
  -alias androiddebugkey -storepass android -keypass android
```

When you generate a proper release upload key, register **its** SHA-1 against
the same Android OAuth client (you can list multiple). If you publish via the
Play Store with Play App Signing, also add Play's app-signing SHA-1.

### Error `[16] Account reauth failed.`

Almost always means the Android OAuth client is missing or its SHA-1 doesn't
match the keystore that signed the APK. Double-check that:

1. Web client id passed as `EASYDB_GOOGLE_SERVER_CLIENT_ID` and the Android
   client are in the **same** Google Cloud project.
2. The signing key's SHA-1 is on the Android client.
3. The device has at least one Google account signed in.
4. If your OAuth consent screen is in Testing mode, your Google account is
   listed as a test user.

## How authentication works

The web app uses NextAuth (cookie + JWT session). The mobile app uses a
parallel Bearer-token scheme on the same backend:

1. Flutter calls `google_sign_in` with `serverClientId` = the Web OAuth client
   ID and obtains a Google `id_token`.
2. It POSTs `{ id_token }` to `/api/auth/mobile`.
3. The Next.js server verifies the token via Google's `tokeninfo` endpoint,
   upserts the user, and returns a long-lived HS256 JWT signed with
   `NEXTAUTH_SECRET`.
4. Flutter stores the JWT in `flutter_secure_storage` and sends it as
   `Authorization: Bearer <jwt>` on every subsequent request.
5. The Next.js `middleware.js` lets Bearer-tokened `/api/*` requests through;
   `lib/authz.js` `requireUserId()` validates the token and returns the user id
   exactly as it does for the cookie session, so every existing API route
   accepts both clients without changes.

## Code layout

```
lib/
├── main.dart                       # Loads token from secure storage, routes to Login or Databases
├── config.dart                     # --dart-define values
├── auth.dart                       # AuthService + Google sign-in + token storage
├── api.dart                        # REST client (Bearer); re-exports models.dart
├── models.dart                     # FieldType, FieldOptions, enums, DTOs
├── computed.dart                   # Formula evaluator + aggregation runner + link label helper
├── ui.dart                         # Shared dialogs and snackbar helpers
└── screens/
    ├── login_screen.dart
    ├── databases_screen.dart       # list / create / rename / delete / templates entry
    ├── templates_picker_screen.dart
    ├── tables_screen.dart          # list of tables in a database
    ├── table_editor_screen.dart    # full field schema editor (12 field types)
    ├── records_screen.dart         # horizontal data grid (sort / group / totals / CSV / lightbox)
    └── record_editor_screen.dart   # per-type editors + detalle sub-grid editor
android/                            # AndroidManifest, gradle config, launcher icons
ios/                                # Scaffold only
assets/                             # logo.png, logo-transparent.png, logo-white.png
```

## Useful commands

```bash
# Static analysis
flutter analyze

# Update dependencies
flutter pub upgrade

# Clean build artifacts (do this when changing Android/iOS native config)
flutter clean && flutter pub get

# Inspect what's actually in the built APK (label, icon, permissions, etc.)
$ANDROID_SDK/build-tools/35.0.0/aapt dump badging \
  build/app/outputs/flutter-apk/app-release.apk
```

## Known limitations

- The release APK is debug-signed. Add a proper signing config in
  `android/app/build.gradle.kts` before distribution.
- iOS is scaffold-only. No launcher icons, no signing, no entitlements.
- Image grid cells fetch via `Image.network` without disk caching. The backend
  middleware excludes image extensions from auth, so these requests don't need
  the Bearer header — but on slow networks the thumbnails will refetch on each
  scroll. Adding `cached_network_image` is the obvious next step.
