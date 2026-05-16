import fs from "fs";
import path from "path";
import crypto from "crypto";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

export const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

export const MAX_BYTES = 2 * 1024 * 1024;

export function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

export function getUploadsDir() {
  ensureUploadsDir();
  return UPLOADS_DIR;
}

export function makeFilename(originalName) {
  const ext = (path.extname(originalName || "").toLowerCase() || ".bin").slice(0, 6);
  const rand = crypto.randomBytes(6).toString("hex");
  return `${Date.now()}-${rand}${ext}`;
}

export function getFilePath(filename) {
  if (!filename || filename.includes("/") || filename.includes("..") || filename.includes("\\")) {
    return null;
  }
  return path.join(getUploadsDir(), filename);
}

const MIME_BY_EXT = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".heif": "image/heif",
};

export function mimeFor(filename) {
  return MIME_BY_EXT[path.extname(filename).toLowerCase()] || "application/octet-stream";
}
