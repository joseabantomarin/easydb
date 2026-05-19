# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project Overview

**EasyDB** is a portable database app inspired by [PortDB for Android](https://www.youtube.com/watch?v=FBdx1SNb-b0). Non-technical users create databases, define tables with typed fields, add records, and link records across tables — no code.

The repository contains two clients sharing one backend:
- `app/`, `lib/`, `middleware.js`, `auth*.js` — Next.js web app and REST API (the source of truth).
- `mobile/` — Flutter app (Android + iOS scaffold) that talks to the same REST API.

## Commands

### Web (root of repo)
- `npm run dev` — dev server on **port 3001** (not 3000; configured in `package.json`)
- `npm run build` / `npm run start`
- `npm run lint`

### Mobile (`mobile/`)
- `flutter pub get`
- `flutter analyze`
- `./build_release.sh` — release APK against production (bakes the dart-defines for `EASYDB_API_BASE_URL` and `EASYDB_GOOGLE_SERVER_CLIENT_ID`)
- Manual release: `flutter build apk --release --dart-define=EASYDB_API_BASE_URL=… --dart-define=EASYDB_GOOGLE_SERVER_CLIENT_ID=…`
- APK lands at `mobile/build/app/outputs/flutter-apk/app-release.apk`

## Tech Stack

- Backend / web: Next.js 16 (App Router, JavaScript), React 19, Tailwind 4, SQLite via better-sqlite3, NextAuth v5 (Google provider), `sharp` for image processing.
- Mobile: Flutter 3.x, Dart 3.x, `google_sign_in` 7.x, `flutter_secure_storage`, `image_picker`, `share_plus`.

## Architecture

### Web / API

```
app/
├── page.js                                       # Home: list of databases
├── login/page.js                                 # Login (NextAuth signIn)
├── layout.js                                     # Root layout
├── databases/[id]/page.js                        # Tables + field schema editor
├── databases/[id]/tables/[tableId]/page.js       # Records grid (sort/group/totals/CSV/lightbox)
├── api/
│   ├── auth/[...nextauth]/route.js               # NextAuth (cookie session)
│   ├── auth/mobile/route.js                      # Mobile bearer-token issuance (see Auth)
│   ├── databases/                                # CRUD; from-template/
│   ├── tables/                                   # CRUD; PUT also rewrites fields
│   ├── records/                                  # CRUD over EAV values
│   ├── templates/route.js                        # List templates
│   ├── upload/route.js                           # Image upload (sharp compresses to ~2 MB JPEG)
│   └── files/[name]/route.js                     # Serve uploaded files
lib/
├── db.js                                         # SQLite singleton + schema init + migrations
├── authz.js                                      # requireUserId(); validates cookie OR bearer
├── mobile-token.js                               # HS256 JWT sign/verify (NEXTAUTH_SECRET)
├── templates.js                                  # Built-in templates + materializeTemplate()
└── uploads.js                                    # makeFilename(), getFilePath(), mime types
middleware.js                                     # Auth gate; lets bearer-tokened /api/* through
auth.js, auth.config.js                           # NextAuth setup + Google signIn callback
```

### Data model (SQLite)

- `users` — Google sub + profile (created on first sign-in)
- `databases` — owned by a user (user_id, name)
- `tables_` — name `tables` is reserved by SQLite, so it's `tables_`
- `fields` — typed columns; `options TEXT` stores JSON whose shape depends on `type`
- `records` — one row per logical record
- `record_values` — EAV cells: `(record_id, field_id, value TEXT)`, unique per pair

The EAV pattern (`records` + `record_values`) lets tables have dynamic fields without schema migrations. `value` is always stored as TEXT — typing is enforced by `fields.type`. Schema init + migrations live in `lib/db.js` (`migrateFieldsCheck`, `migrateFieldsWidth`, `migrateDatabasesUserId`).

### Field types and their `options` wire format

These are the 12 types the system supports. The mobile and web must serialize / parse `options` identically — getting this wrong was a recurring bug, so write it down:

| type | `options` JSON shape | Notes |
| --- | --- | --- |
| `text`, `memo`, `number`, `date`, `boolean`, `image` | `null` | no config |
| `decimal` | `{ "decimals": 2 }` | |
| `dropdown` | bare array `["a","b","c"]` | NOT `{choices: [...]}` |
| `link` | bare string `"5"` (target table id) | NOT `{linkTable: ...}` |
| `detalle` | `{ "table_id": 7, "link_field_id": 42 }` | child table id + back-ref field id |
| `formula` | `{ "expr": "[cantidad]*[precio]", "decimals": 2 }` | `[name]` references other fields by display name |
| `agregacion` | `{ "detail_field_id": .., "operation": "SUM"\|"AVG"\|"MIN"\|"MAX"\|"COUNT", "target_field_id": .., "decimals": 2 }` | aggregates a detalle's children |

When materializing templates (`lib/templates.js`) the slug-based template format is resolved to ids by `serializeOptions()`.

### Auth — dual scheme

The web uses NextAuth (cookie + JWT session). For the mobile app a parallel bearer-token path was added:

1. Flutter calls `google_sign_in` with `serverClientId` = the **web** OAuth client id, gets a Google `id_token`.
2. `POST /api/auth/mobile` verifies the token via Google's `tokeninfo` endpoint, upserts the user, returns an HS256 JWT signed with `NEXTAUTH_SECRET` (1-year exp).
3. Flutter stores the JWT in `flutter_secure_storage` and sends `Authorization: Bearer <jwt>` on every request.
4. `middleware.js` passes through any `/api/*` request that has a Bearer header (without verifying — the route handler does).
5. `lib/authz.js` `requireUserId()` checks the Bearer header **first**, falls back to the NextAuth cookie session.

Don't add a new auth path. Anything that calls `requireUserId()` automatically works for both clients.

### Image uploads

`POST /api/upload` accepts multipart `file`, compresses to ≤2 MB JPEG via `sharp` (`lib/uploads.js` controls quality / max dimension), writes to a uploads dir, returns `{ filename }`. `GET /api/files/<name>` serves the file. The middleware matcher excludes `*.jpg|jpeg|png|svg|webp|gif|ico` so file serving is public-by-extension — this is intentional and is what makes `Image.network` work without sending the Bearer token.

### Templates

Built-in templates live in `lib/templates.js`. `materializeTemplate(db, template, name, userId)` does it in a transaction: creates tables → resolves slug-based options to ids → inserts records, resolving link slugs to record ids.

## Mobile (Flutter)

Read `mobile/README.md` for the high-level setup. Key things to know:

```
mobile/lib/
├── main.dart                  # AuthService.loadFromStorage() then routes to Login or Databases
├── config.dart                # EASYDB_API_BASE_URL / EASYDB_GOOGLE_SERVER_CLIENT_ID via --dart-define
├── auth.dart                  # AuthService (singleton), Google sign-in, secure storage
├── api.dart                   # REST client (Bearer); re-exports models.dart
├── models.dart                # FieldType, FieldOptions (typed accessors per wire format above),
│                              #   SortDir/GroupMode/AggOp enums, DatabaseEntry, TableDetail, etc.
├── computed.dart              # evalFormula, computeAggregation, linkRecordLabel
├── ui.dart                    # showErrorSnack, confirmDelete, promptText
└── screens/
    ├── login_screen.dart
    ├── databases_screen.dart        # list + create + rename + delete + templates entry
    ├── templates_picker_screen.dart
    ├── tables_screen.dart           # list + delete; opens table_editor or records
    ├── table_editor_screen.dart     # full field schema editor (incl. detalle/formula/agregacion)
    ├── records_screen.dart          # horizontally-scrolling data grid
    └── record_editor_screen.dart    # per-type editors + detalle sub-grid
```

`mobile/lib/models.dart` `FieldOptions` is the canonical place for the per-type option shapes — when in doubt about `options` JSON, look there. The Dart code mirrors the JS exactly.

`mobile/lib/computed.dart` mirrors the web's formula evaluator (`evalFormula` in `app/databases/.../page.js`) and aggregation runner (`loadAggregations`). Pure-Dart arithmetic parser — kept in sync with the web's regex-then-`Function(...)` approach.

The records screen renders the grid manually (`Column` of `Row`s in a 2-axis `SingleChildScrollView`) rather than using `DataTable` because group headers + per-group sums + sticky `#` column don't fit the `DataTable` shape.

The release APK is currently **debug-signed** (TODO in `mobile/android/app/build.gradle.kts`). Google sign-in works because the debug-keystore SHA-1 is registered against the Android OAuth client in Google Cloud. When generating a real upload key, add its SHA-1 to the same Android OAuth client (you can list multiple).

## Key Design Decisions

- **EAV records** (`records` + `record_values`) — dynamic fields without schema migrations. All values are TEXT; typing is in `fields.type`.
- **`tables_` name** — avoids SQLite reserved word collision.
- **`options` column shape varies by type** — see the table above; both clients must agree.
- **All web pages are client components** (`"use client"`) fetching from API routes — single architectural pattern.
- **Dual-auth (cookie + Bearer JWT)** at the `requireUserId()` boundary — adding new API routes that use it inherits both.
- **SQLite file** `easydb.sqlite` at project root (gitignored).
- **Image files are public** via the middleware matcher; bearer auth would be needed otherwise on the mobile app's `Image.network` calls.

## Common pitfalls

- The mobile app is **not** vendored Flutter code — running `flutter pub get` is required after pulling. New Dart files won't compile until then.
- When changing `lib/db.js` schema, add a migration function and call it from `initSchema()`; don't rely on `CREATE TABLE IF NOT EXISTS` to retroactively add columns.
- When adding a new field type, update **both** `app/databases/[id]/page.js` (`FIELD_TYPES`, `saveTable` serialization, the display/edit branches in the records page) **and** `mobile/lib/models.dart` (`FieldType`, `FieldTypeX`, `parseFieldType`, `FieldOptions` accessors if it has options).
- `formula` expressions allow only `[name]`, digits, whitespace, parens, `+ - * /`. Anything else → null result. Same regex on both clients.
