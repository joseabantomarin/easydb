import { getDb } from "@/lib/db";
import { requireUserId, unauthorized, forbidden, userOwnsDatabase } from "@/lib/authz";

export async function GET(request, { params }) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  const { id } = await params;
  if (!userOwnsDatabase(id, userId)) return forbidden();

  const db = getDb();
  const database = db.prepare("SELECT * FROM databases WHERE id = ?").get(id);
  if (!database) {
    return Response.json({ error: "Base de datos no encontrada" }, { status: 404 });
  }
  const tables = db.prepare("SELECT * FROM tables_ WHERE database_id = ? ORDER BY created_at DESC").all(id);
  return Response.json({ ...database, tables });
}

export async function PUT(request, { params }) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  const { id } = await params;
  if (!userOwnsDatabase(id, userId)) return forbidden();

  const { name } = await request.json();
  if (!name || !name.trim()) {
    return Response.json({ error: "El nombre es requerido" }, { status: 400 });
  }
  const db = getDb();
  db.prepare("UPDATE databases SET name = ? WHERE id = ?").run(name.trim(), id);
  const updated = db.prepare("SELECT * FROM databases WHERE id = ?").get(id);
  return Response.json(updated);
}

export async function DELETE(request, { params }) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  const { id } = await params;
  if (!userOwnsDatabase(id, userId)) return forbidden();

  const db = getDb();
  db.prepare("DELETE FROM databases WHERE id = ?").run(id);
  return Response.json({ ok: true });
}
