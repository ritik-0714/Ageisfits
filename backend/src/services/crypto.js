import crypto from "node:crypto";
import { env } from "../config/env.js";

// AES-256-GCM for wearable OAuth tokens at rest. Key = TOKEN_ENC_KEY (64 hex chars) or derived from JWT_SECRET.
const key = process.env.TOKEN_ENC_KEY && process.env.TOKEN_ENC_KEY.length === 64
  ? Buffer.from(process.env.TOKEN_ENC_KEY, "hex")
  : crypto.scryptSync(env.jwtSecret, "aegisfit-token-salt", 32);

export function encrypt(plain) {
  if (plain == null || plain === "") return "";
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([c.update(String(plain), "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map(b => b.toString("base64")).join(".");
}
export function decrypt(blob) {
  if (!blob) return "";
  const [iv, tag, enc] = blob.split(".").map(s => Buffer.from(s, "base64"));
  const d = crypto.createDecipheriv("aes-256-gcm", key, iv); d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
}
export const sha256 = s => crypto.createHash("sha256").update(String(s)).digest("hex");
export const randomCode = () => String(crypto.randomInt(100000, 1000000));
