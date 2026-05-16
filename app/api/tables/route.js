import { getDb } from "@/lib/db";
import { requireUserId, unauthorized, forbidden, userOwnsDatabase } from "@/lib/authz";

export async function POST(request) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  const { database_id, name, fields } = await request.json();
  if (!database_id || !name || !name.trim()) {
    return Response.json({ error: "database_id y name son requeridos" }, { status: 400 });
  }
  if (!userOwnsDatabase(database_id, userId)) return forbidden();
  const db = getDb();

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
