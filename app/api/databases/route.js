import { getDb } from "@/lib/db";
import { requireUserId, unauthorized } from "@/lib/authz";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  const db = getDb();
  const databases = db
    .prepare("SELECT * FROM databases WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId);
  return Response.json(databases);
}

export async function POST(request) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  const { name } = await request.json();
  if (!name || !name.trim()) {
    return Response.json({ error: "El nombre es requerido" }, { status: 400 });
  }
  const db = getDb();
  const result = db
    .prepare("INSERT INTO databases (name, user_id) VALUES (?, ?)")
    .run(name.trim(), userId);
  const created = db.prepare("SELECT * FROM databases WHERE id = ?").get(result.lastInsertRowid);
  return Response.json(created, { status: 201 });
}
