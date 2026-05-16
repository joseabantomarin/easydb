import { writeFile } from "fs/promises";
import path from "path";
import { requireUserId, unauthorized } from "@/lib/authz";
import { getUploadsDir, makeFilename, ALLOWED_MIME, MAX_BYTES } from "@/lib/uploads";

export async function POST(request) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();

  const formData = await request.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return Response.json({ error: "Archivo requerido" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: `Archivo demasiado grande (máx ${MAX_BYTES / 1024 / 1024} MB)` },
      { status: 400 }
    );
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return Response.json(
      { error: "Tipo no permitido. Usa JPG, PNG, WEBP, GIF o HEIC." },
      { status: 400 }
    );
  }

  const filename = makeFilename(file.name);
  const filepath = path.join(getUploadsDir(), filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  return Response.json({ filename });
}
