import { getDb } from "@/lib/db";
import { requireUserId, unauthorized, forbidden, userOwnsRecord } from "@/lib/authz";

export async function PUT(request, { params }) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  const { id } = await params;
  if (!userOwnsRecord(id, userId)) return forbidden();
  const { values } = await request.json();
  const db = getDb();

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
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  const { id } = await params;
  if (!userOwnsRecord(id, userId)) return forbidden();
  const db = getDb();
  db.prepare("DELETE FROM records WHERE id = ?").run(id);
  return Response.json({ ok: true });
}
