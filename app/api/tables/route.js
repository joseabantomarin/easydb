import { getDb } from "@/lib/db";

export async function POST(request) {
  const { database_id, name, fields } = await request.json();
  if (!database_id || !name || !name.trim()) {
    return Response.json({ error: "database_id y name son requeridos" }, { status: 400 });
  }
  const db = getDb();

  const dbExists = db.prepare("SELECT id FROM databases WHERE id = ?").get(database_id);
  if (!dbExists) {
    return Response.json({ error: "Base de datos no encontrada" }, { status: 404 });
  }

  const insertTable = db.prepare("INSERT INTO tables_ (database_id, name) VALUES (?, ?)");
  const insertField = db.prepare(
    "INSERT INTO fields (table_id, name, type, options, position, width) VALUES (?, ?, ?, ?, ?, ?)"
  );

  const transaction = db.transaction(() => {
    const result = insertTable.run(database_id, name.trim());
    const tableId = result.lastInsertRowid;

    if (fields && Array.isArray(fields)) {
      fields.forEach((field, i) => {
        insertField.run(
          tableId,
          field.name,
          field.type || "text",
          field.options ? JSON.stringify(field.options) : null,
          i,
          Number.isFinite(field.width) ? field.width : null
        );
      });
    }

    return tableId;
  });

  const tableId = transaction();
  const table = db.prepare("SELECT * FROM tables_ WHERE id = ?").get(tableId);
  const tableFields = db.prepare("SELECT * FROM fields WHERE table_id = ? ORDER BY position").all(tableId);
  return Response.json({ ...table, fields: tableFields }, { status: 201 });
}
