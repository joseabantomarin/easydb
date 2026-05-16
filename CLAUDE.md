# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project Overview

**EasyDB** is a portable database application inspired by [PortDB for Android](https://www.youtube.com/watch?v=FBdx1SNb-b0). It lets non-technical users create databases, define tables with typed fields, add records, and link records across tables — all without writing code.

### Core Requirements (from `explicaciones.md`)

- Define a database by name, then add tables with typed fields
- Supported field types: text, date, dropdown (combo), image, link (foreign key to another table's record), and more
- Create records and relate them across tables via link fields
- Initial target platform: **web**; future targets: Android and iOS
- Must match PortDB's simplicity for creating and managing tables

## Tech Stack

- **Framework**: Next.js 16 (App Router, JavaScript)
- **UI**: React 19 + Tailwind CSS 4
- **Database**: SQLite via better-sqlite3
- **Linting**: ESLint 9

## Commands

- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run start` — Start production server
- `npm run lint` — Run ESLint

## Architecture

```
app/
├── page.js                    # Home: list of databases
├── layout.js                  # Root layout
├── databases/[id]/page.js     # Tables view for a database
├── databases/[id]/tables/[tableId]/page.js  # Records view
├── api/
│   ├── databases/             # CRUD for databases
│   ├── tables/                # CRUD for tables + fields
│   └── records/               # CRUD for records
lib/
└── db.js                      # SQLite connection singleton + schema init
```

### Data Model

- **databases**: user-created databases (id, name, created_at)
- **tables**: tables within a database (id, database_id, name)
- **fields**: typed columns for a table (id, table_id, name, type, options)
- **records**: rows in a table (id, table_id, created_at)
- **record_values**: individual cell values (id, record_id, field_id, value)

Field types: `text`, `number`, `date`, `dropdown`, `image`, `link`

### Key Design Decisions

- **EAV pattern for records**: Records use an Entity-Attribute-Value model (`records` + `record_values`) so tables can have dynamic fields without schema migrations
- **SQLite table named `tables_`**: Avoids conflict with SQL reserved word
- **`options` column in `fields`**: Stores JSON — dropdown choices as array, link target table ID as string
- **All pages are client components** (`"use client"`) fetching from API routes — keeps architecture simple and consistent
- **SQLite file**: `easydb.sqlite` in project root (gitignored)
