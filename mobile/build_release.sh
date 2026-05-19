#!/usr/bin/env bash
# Release build for EasyDB mobile. Uses the production API and the shared
# Google OAuth Web Client ID so the resulting APK works against
# easydb.openlinks.app out of the box.
#
# Usage: ./build_release.sh
# APK output: build/app/outputs/flutter-apk/app-release.apk

set -euo pipefail

cd "$(dirname "$0")"

EASYDB_API_BASE_URL="${EASYDB_API_BASE_URL:-https://easydb.openlinks.app}"
EASYDB_GOOGLE_SERVER_CLIENT_ID="${EASYDB_GOOGLE_SERVER_CLIENT_ID:-823603281404-l0mphibc3hh2ombq5dka31qibqr3vlsi.apps.googleusercontent.com}"

echo "Building EasyDB mobile release"
echo "  API base : $EASYDB_API_BASE_URL"
echo "  Google ID: $EASYDB_GOOGLE_SERVER_CLIENT_ID"

flutter build apk --release \
  --dart-define=EASYDB_API_BASE_URL="$EASYDB_API_BASE_URL" \
  --dart-define=EASYDB_GOOGLE_SERVER_CLIENT_ID="$EASYDB_GOOGLE_SERVER_CLIENT_ID"

echo
echo "APK: $(pwd)/build/app/outputs/flutter-apk/app-release.apk"
