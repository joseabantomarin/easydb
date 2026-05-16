import { getDb } from "@/lib/db";
import { requireUserId, unauthorized, forbidden, userOwnsTable } from "@/lib/authz";

export async function GET(request, { params }) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  const { id } = await params;
  if (!userOwnsTable(id, userId)) return forbidden();

  const db = getDb();
  const table = db.prepare("SELECT * FROM tables_ WHERE id = ?").get(id);
  if (!table) {
    return Response.json({ error: "Tabla no encontrada" }, { status: 404 });
  }
  const fields = db.prepare("SELECT * FROM fields WHERE table_id = ? ORDER BY position").all(id);
  return Response.json({ ...table, fields });
}

export async function PUT(request, { params }) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  const { id } = await params;
  if (!userOwnsTable(id, userId)) return forbidden();
  const { name, fields } = await request.json();
  const db = getDb();

  const table = db.prepare("SELECT * FROM tables_ WHERE id = ?").get(id);
  if (!table) {
    return Response.json({ error: "Tabla no encontrada" }, { status: 404 });
  }

  const transaction = db.transaction(() => {
    if (name && name.trim()) {
      db.prepare("UPDATE tables_ SET name = ? WHERE id = ?").run(name.trim(), id);
    }

    if (fields && Array.isArray(fields)) {
      const existing = db.prepare("SELECT id FROM fields WHERE table_id = ?").all(id);
      const existingIds = new Set(existing.map((f) => f.id));
      const keptIds = new Set();

      const updateField = db.prepare(
        "UPDATE fields SET name = ?, type = ?, options = ?, position = ?, width = ? WHERE id = ? AND table_id = ?"
      );
      const insertField = db.prepare(
        "INSERT INTO fields (table_id, name, type, options, position, width) VALUES (?, ?, ?, ?, ?, ?)"
      );

      fields.forEach((field, i) => {
        const optionsJson = field.options ? JSON.stringify(field.options) : null;
        const width = Number.isFinite(field.width) ? field.width : null;
        if (field.id && existingIds.has(field.id)) {
          updateField.run(field.name, field.type || "text", optionsJson, i, width, field.id, id);
          keptIds.add(field.id);
        } else {
          insertField.run(id, field.name, field.type || "text", optionsJson, i, width);
        }
      });

      const deleteField = db.prepare("DELETE FROM fields WHERE id = ?");
      existingIds.forEach((fid) => {
        if (!keptIds.has(fid)) deleteField.run(fid);
      });
    }
  });

  transaction();
  const updated = db.prepare("SELECT * FROM tables_ WHERE id = ?").get(id);
  const updatedFields = db.prepare("SELECT * FROM fields WHERE table_id = ? ORDER BY position").all(id);
  return Response.json({ ...updated, fields: updatedFields });
}

export async function DELETE(request, { params }) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  const { id } = await params;
  if (!userOwnsTable(id, userId)) return forbidden();
  const db = getDb();
  db.prepare("DELETE FROM tables_ WHERE id = ?").run(id);
  return Response.json({ ok: true });
}
