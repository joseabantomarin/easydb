import { getDb, claimOrphanDatabases } from "@/lib/db";
import { signMobileToken } from "@/lib/mobile-token";

// POST /api/auth/mobile
// Body: { id_token: string }
// Verifies the Google ID token, upserts the user, returns { token, user }.
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }
  const idToken = body?.id_token;
  if (!idToken || typeof idToken !== "string") {
    return Response.json({ error: "id_token requerido" }, { status: 400 });
  }

  const tokenInfoUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
  const res = await fetch(tokenInfoUrl, { cache: "no-store" });
  if (!res.ok) {
    return Response.json({ error: "Token de Google inválido" }, { status: 401 });
  }
  const info = await res.json();

  const expectedAud = process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID;
  if (expectedAud && info.aud && info.aud !== expectedAud) {
    return Response.json({ error: "Audiencia no coincide" }, { status: 401 });
  }
  if (info.iss !== "https://accounts.google.com" && info.iss !== "accounts.google.com") {
    return Response.json({ error: "Emisor no válido" }, { status: 401 });
  }
  const sub = info.sub;
  if (!sub) {
    return Response.json({ error: "Token sin sub" }, { status: 401 });
  }

  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE google_sub = ?").get(sub);
  let userId;
  if (existing) {
    userId = existing.id;
    db.prepare("UPDATE users SET email = ?, name = ?, image = ? WHERE id = ?").run(
      info.email ?? null,
      info.name ?? null,
      info.picture ?? null,
      userId
    );
  } else {
    const r = db
      .prepare("INSERT INTO users (google_sub, email, name, image) VALUES (?, ?, ?, ?)")
      .run(sub, info.email ?? null, info.name ?? null, info.picture ?? null);
    userId = r.lastInsertRowid;
    claimOrphanDatabases(db, userId);
  }

  const token = signMobileToken(userId);
  return Response.json({
    token,
    user: { id: userId, email: info.email, name: info.name, image: info.picture },
  });
}
