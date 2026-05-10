import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB

export class UploadError extends Error {}

export async function saveAvatar(file: File, ownerId: string): Promise<string> {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new UploadError("Use a JPEG, PNG, or WebP image");
  }
  if (file.size > MAX_BYTES) {
    throw new UploadError("Image must be under 4 MB");
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const hash = crypto.randomBytes(6).toString("hex");
  const filename = `${ownerId}-${hash}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(UPLOAD_DIR, filename), buffer);
  return `/uploads/${filename}`;
}
