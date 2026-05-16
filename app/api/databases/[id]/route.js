import { getDb } from "@/lib/db";

export async function GET(request, { params }) {
  const { id } = await params;
  const db = getDb();
  const database = db.prepare("SELECT * FROM databases WHERE id = ?").get(id);
  if (!database) {
    return Response.json({ error: "Base de datos no encontrada" }, { status: 404 });
  }
  const tables = db.prepare("SELECT * FROM tables_ WHERE database_id = ? ORDER BY created_at DESC").all(id);
  return Response.json({ ...database, tables });
}

export async function PUT(request, { params }) {
  const { id } = await params;
  const { name } = await request.json();
  if (!name || !name.trim()) {
    return Response.json({ error: "El nombre es requerido" }, { status: 400 });
  }
  const db = getDb();
  const result = db.prepare("UPDATE databases SET name = ? WHERE id = ?").run(name.trim(), id);
  if (result.changes === 0) {
    return Response.json({ error: "Base de datos no encontrada" }, { status: 404 });
  }
  const updated = db.prepare("SELECT * FROM databases WHERE id = ?").get(id);
  return Response.json(updated);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const db = getDb();
  const result = db.prepare("DELETE FROM databases WHERE id = ?").run(id);
  if (result.changes === 0) {
    return Response.json({ error: "Base de datos no encontrada" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
