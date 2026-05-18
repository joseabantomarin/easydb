import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { headers } from "next/headers";
import { verifyMobileToken } from "@/lib/mobile-token";

export async function requireUserId() {
  const h = await headers();
  const authHeader = h.get("authorization") || h.get("Authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    const decoded = verifyMobileToken(token);
    if (decoded) return decoded.userId;
  }
  const session = await auth();
  const id = session?.user?.dbId;
  if (!id) return null;
  return Number(id);
}

export function userOwnsDatabase(databaseId, userId) {
  const row = getDb()
    .prepare("SELECT id FROM databases WHERE id = ? AND user_id = ?")
    .get(databaseId, userId);
  return !!row;
}

export function userOwnsTable(tableId, userId) {
  const row = getDb()
    .prepare(
      "SELECT t.id FROM tables_ t JOIN databases d ON d.id = t.database_id WHERE t.id = ? AND d.user_id = ?"
    )
    .get(tableId, userId);
  return !!row;
}

export function userOwnsRecord(recordId, userId) {
  const row = getDb()
    .prepare(
      "SELECT r.id FROM records r JOIN tables_ t ON t.id = r.table_id JOIN databases d ON d.id = t.database_id WHERE r.id = ? AND d.user_id = ?"
    )
    .get(recordId, userId);
  return !!row;
}

export function unauthorized() {
  return Response.json({ error: "No autenticado" }, { status: 401 });
}

export function forbidden() {
  return Response.json({ error: "No autorizado" }, { status: 403 });
}
