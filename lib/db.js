import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "easydb.sqlite");

let db;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema(db);
  }
  return db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      google_sub TEXT UNIQUE NOT NULL,
      email TEXT,
      name TEXT,
      image TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS databases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      user_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tables_ (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      database_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (database_id) REFERENCES databases(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS fields (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      options TEXT,
      position INTEGER DEFAULT 0,
      width INTEGER,
      FOREIGN KEY (table_id) REFERENCES tables_(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (table_id) REFERENCES tables_(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS record_values (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_id INTEGER NOT NULL,
      field_id INTEGER NOT NULL,
      value TEXT,
      UNIQUE(record_id, field_id),
      FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE,
      FOREIGN KEY (field_id) REFERENCES fields(id) ON DELETE CASCADE
    );
  `);

  migrateFieldsCheck(db);
  migrateFieldsWidth(db);
  migrateDatabasesUserId(db);
}

function migrateDatabasesUserId(db) {
  const cols = db.prepare("PRAGMA table_info(databases)").all();
  if (cols.some((c) => c.name === "user_id")) return;
  db.exec("ALTER TABLE databases ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE");
}

// Asigna todas las bases sin dueño a este usuario (solo si todavía no hay otros dueños).
// Útil para que el primer usuario que loguee reclame la data existente del modo solo-local.
export function claimOrphanDatabases(db, userId) {
  const orphan = db.prepare("SELECT COUNT(*) as n FROM databases WHERE user_id IS NULL").get();
  const owned = db.prepare("SELECT COUNT(*) as n FROM databases WHERE user_id IS NOT NULL").get();
  if (orphan.n > 0 && owned.n === 0) {
    db.prepare("UPDATE databases SET user_id = ? WHERE user_id IS NULL").run(userId);
    return orphan.n;
  }
  return 0;
}

function migrateFieldsCheck(db) {
  const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='fields'").get();
  if (!row || !row.sql.includes("CHECK")) return;

  db.exec(`
    PRAGMA foreign_keys = OFF;
    BEGIN;
    CREATE TABLE fields_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      options TEXT,
      position INTEGER DEFAULT 0,
      FOREIGN KEY (table_id) REFERENCES tables_(id) ON DELETE CASCADE
    );
    INSERT INTO fields_new (id, table_id, name, type, options, position)
      SELECT id, table_id, name, type, options, position FROM fields;
    DROP TABLE fields;
    ALTER TABLE fields_new RENAME TO fields;
    COMMIT;
    PRAGMA foreign_keys = ON;
  `);
}

function migrateFieldsWidth(db) {
  const cols = db.prepare("PRAGMA table_info(fields)").all();
  if (cols.some((c) => c.name === "width")) return;
  db.exec("ALTER TABLE fields ADD COLUMN width INTEGER");
}
