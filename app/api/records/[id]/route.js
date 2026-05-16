import { getDb } from "@/lib/db";

export async function PUT(request, { params }) {
  const { id } = await params;
  const { values } = await request.json();
  const db = getDb();

  const record = db.prepare("SELECT * FROM records WHERE id = ?").get(id);
  if (!record) {
    return Response.json({ error: "Registro no encontrado" }, { status: 404 });
  }

  const transaction = db.transaction(() => {
    if (values && typeof values === "object") {
      const upsert = db.prepare(`
        INSERT INTO record_values (record_id, field_id, value) VALUES (?, ?, ?)
        ON CONFLICT(record_id, field_id) DO UPDATE SET value = excluded.value
      `);
      for (const [fieldId, value] of Object.entries(values)) {
        upsert.run(id, parseInt(fieldId), value ?? "");
      }
    }
  });

  transaction();
  return Response.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const db = getDb();
  const result = db.prepare("DELETE FROM records WHERE id = ?").run(id);
  if (result.changes === 0) {
    return Response.json({ error: "Registro no encontrado" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
