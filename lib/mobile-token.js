import crypto from "crypto";

function getSecret() {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET / AUTH_SECRET is not configured");
  return secret;
}

function base64url(input) {
  return Buffer.from(input).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64urlJson(obj) {
  return base64url(JSON.stringify(obj));
}

function fromBase64Url(str) {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

// Sign a minimal JWT (HS256) embedding { sub: userId, iat, exp }.
// Long-lived (1 year) — the mobile app stores it in secure storage.
export function signMobileToken(userId, { expiresInSeconds = 60 * 60 * 24 * 365 } = {}) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { sub: String(userId), iat: now, exp: now + expiresInSeconds };
  const signingInput = `${base64urlJson(header)}.${base64urlJson(payload)}`;
  const signature = crypto.createHmac("sha256", getSecret()).update(signingInput).digest("base64")
    .replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${signingInput}.${signature}`;
}

export function verifyMobileToken(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;
  const expectedSig = crypto.createHmac("sha256", getSecret())
    .update(`${headerB64}.${payloadB64}`).digest("base64")
    .replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const a = Buffer.from(sigB64);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  let payload;
  try {
    payload = JSON.parse(fromBase64Url(payloadB64).toString("utf8"));
  } catch {
    return null;
  }
  if (typeof payload.exp === "number" && Math.floor(Date.now() / 1000) > payload.exp) return null;
  const userId = Number(payload.sub);
  if (!Number.isInteger(userId) || userId <= 0) return null;
  return { userId, exp: payload.exp };
}
