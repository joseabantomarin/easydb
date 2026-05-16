import { writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { requireUserId, unauthorized } from "@/lib/authz";
import { getUploadsDir, makeFilename } from "@/lib/uploads";

const TARGET_BYTES = 2 * 1024 * 1024;
const MAX_DIMENSION = 2000;
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

async function compressToTarget(buffer) {
  let img = sharp(buffer, { failOn: "none" }).rotate();
  const meta = await img.metadata();
  if (meta.width > MAX_DIMENSION || meta.height > MAX_DIMENSION) {
    img = img.resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true });
  }

  let quality = 85;
  let out;
  while (quality >= 30) {
    out = await img.jpeg({ quality, mozjpeg: true }).toBuffer();
    if (out.length <= TARGET_BYTES) return out;
    quality -= 10;
  }
  // Si todavía es muy grande, bajar resolución agresivamente.
  let dim = MAX_DIMENSION;
  while (dim >= 600) {
    dim = Math.floor(dim * 0.8);
    out = await sharp(buffer, { failOn: "none" })
      .rotate()
      .resize({ width: dim, height: dim, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 75, mozjpeg: true })
      .toBuffer();
    if (out.length <= TARGET_BYTES) return out;
  }
  return out;
}

export async function POST(request) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();

  const formData = await request.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return Response.json({ error: "Archivo requerido" }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return Response.json({ error: "El archivo supera 25 MB" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return Response.json({ error: "Solo se permiten imágenes" }, { status: 400 });
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());
  let outputBuffer;
  try {
    outputBuffer = await compressToTarget(inputBuffer);
  } catch (e) {
    return Response.json({ error: "No se pudo procesar la imagen: " + e.message }, { status: 400 });
  }

  const filename = makeFilename(file.name).replace(/\.[a-z0-9]+$/i, ".jpg");
  const filepath = path.join(getUploadsDir(), filename);
  await writeFile(filepath, outputBuffer);

  return Response.json({
    filename,
    size: outputBuffer.length,
    original_size: inputBuffer.length,
  });
}
