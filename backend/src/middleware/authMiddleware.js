import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";

// Validates the Bearer JWT. Invalid / missing / expired -> 401. Valid -> req.user = { id, email }.
export function authMiddleware(req, res, next) {
  const h = req.headers.authorization || "";
  if (!h.startsWith("Bearer ")) return res.status(401).json({ error: "Login required" });
  try {
    const p = jwt.verify(h.slice(7), env.jwtSecret);
    req.user = { id: p.uid, email: p.email };
    next();
  } catch { res.status(401).json({ error: "Invalid or expired token" }); }
}

// Loads the signed-in user's account (req.dbUser). Email verification has been removed: this never blocks anyone.
export async function requireVerified(req, res, next) {
  try {
    const u = await User.findById(req.user.id).select("isVerified profile name");
    if (!u) return res.status(401).json({ error: "Account not found" });
    req.dbUser = u;
    next();
  } catch (e) { next(e); }
}