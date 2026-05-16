import NextAuth from "next-auth";
import authConfig from "./auth.config";
import { getDb, claimOrphanDatabases } from "@/lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    async signIn({ user, account }) {
      if (!account || account.provider !== "google") return false;
      const sub = account.providerAccountId;
      if (!sub) return false;

      const db = getDb();
      const existing = db.prepare("SELECT id FROM users WHERE google_sub = ?").get(sub);

      let userId;
      if (existing) {
        userId = existing.id;
        db.prepare("UPDATE users SET email = ?, name = ?, image = ? WHERE id = ?").run(
          user.email ?? null,
          user.name ?? null,
          user.image ?? null,
          userId
        );
      } else {
        const r = db
          .prepare("INSERT INTO users (google_sub, email, name, image) VALUES (?, ?, ?, ?)")
          .run(sub, user.email ?? null, user.name ?? null, user.image ?? null);
        userId = r.lastInsertRowid;
        claimOrphanDatabases(db, userId);
      }
      user.dbId = userId;
      return true;
    },
    async jwt({ token, user }) {
      if (user?.dbId) token.dbId = user.dbId;
      return token;
    },
    async session({ session, token }) {
      if (token?.dbId && session.user) {
        session.user.dbId = Number(token.dbId);
      }
      return session;
    },
  },
});
