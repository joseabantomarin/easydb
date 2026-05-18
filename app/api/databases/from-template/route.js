import { getDb } from "@/lib/db";
import { requireUserId, unauthorized } from "@/lib/authz";
import { getTemplate, materializeTemplate } from "@/lib/templates";

export async function POST(request) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();

  const { template_id, name } = await request.json();
  if (!template_id) {
    return Response.json({ error: "template_id es requerido" }, { status: 400 });
  }
  const template = getTemplate(template_id);
  if (!template) {
    return Response.json({ error: "Plantilla no encontrada" }, { status: 404 });
  }

  const finalName = (name && name.trim()) || template.name;
  const db = getDb();

  try {
    const dbId = materializeTemplate(db, template, finalName, userId);
    const created = db.prepare("SELECT * FROM databases WHERE id = ?").get(dbId);
    return Response.json(created, { status: 201 });
  } catch (err) {
    return Response.json({ error: err.message || "Error creando plantilla" }, { status: 500 });
  }
}
