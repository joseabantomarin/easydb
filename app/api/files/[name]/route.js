import { readFile } from "fs/promises";
import { getFilePath, mimeFor } from "@/lib/uploads";

export async function GET(request, { params }) {
  const { name } = await params;
  const filepath = getFilePath(name);
  if (!filepath) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const data = await readFile(filepath);
    return new Response(data, {
      headers: {
        "Content-Type": mimeFor(name),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
