// EasyDB mobile configuration.
//
// IMPORTANT — to make Google Sign-In actually work at runtime you must:
//   1. Set `googleServerClientId` below to the SAME Google OAuth Web Client ID
//      that is used by the Next.js server (env var GOOGLE_CLIENT_ID).
//   2. Register your Android app's SHA-1 fingerprint in the Google Cloud
//      Console under the same OAuth 2.0 client (Android client type).
//   3. Point `apiBaseUrl` to your deployed EasyDB instance.
//
// You can override these at build time, for example:
//   flutter build apk --dart-define=EASYDB_API_BASE_URL=https://example.com \
//                     --dart-define=EASYDB_GOOGLE_SERVER_CLIENT_ID=xxx.apps.googleusercontent.com

class AppConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    'EASYDB_API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3001',
  );

  static const String googleServerClientId = String.fromEnvironment(
    'EASYDB_GOOGLE_SERVER_CLIENT_ID',
    defaultValue: '',
  );
}
