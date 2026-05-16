import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const databases = db.prepare("SELECT * FROM databases ORDER BY created_at DESC").all();
  return Response.json(databases);
}

export async function POST(request) {
  const { name } = await request.json();
  if (!name || !name.trim()) {
    return Response.json({ error: "El nombre es requerido" }, { status: 400 });
  }
  const db = getDb();
  const result = db.prepare("INSERT INTO databases (name) VALUES (?)").run(name.trim());
  const created = db.prepare("SELECT * FROM databases WHERE id = ?").get(result.lastInsertRowid);
  return Response.json(created, { status: 201 });
}
