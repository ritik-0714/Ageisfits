import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { env } from "../config/env.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { asyncHandler, httpError, loginLimiter } from "../middleware/common.js";
import { sendVerificationEmail } from "../services/mailer.js";
import { randomCode, sha256 } from "../services/crypto.js";

const r = Router();
const token = u => jwt.sign({ uid: String(u._id), email: u.email }, env.jwtSecret, { expiresIn: "7d" });
const pub = u => ({ id: u._id, name: u.name, email: u.email, isVerified: u.isVerified, profile: u.profile });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function issueCode(user) {
  const code = randomCode();
  user.verification = { codeHash: sha256(code), expiresAt: new Date(Date.now() + 15 * 60e3), attempts: 0 };
  await user.save();
  try { return await sendVerificationEmail(user.email, user.name, code); } catch (e) { console.error("mail failed:", e.message); return { previewUrl: null, mailError: true }; }
}

r.post("/register", asyncHandler(async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !EMAIL.test(email || "") || !password || password.length < 8) throw httpError(400, "Name, a valid email and a password of 8+ characters are required");
  if (await User.exists({ email: email.toLowerCase() })) throw httpError(409, "Email already registered");
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10) });      // bcrypt, 10 salt rounds
  const mail = await issueCode(user);
  res.status(201).json({ token: token(user), user: pub(user), emailPreviewUrl: env.isProd ? undefined : mail.previewUrl });
}));

r.post("/verify", authMiddleware, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw httpError(404, "User not found");
  const v = user.verification || {};
  if (user.isVerified) return res.json({ verified: true, user: pub(user) });
  if (!v.codeHash || !v.expiresAt || v.expiresAt < new Date()) throw httpError(400, "Code expired. Request a new one.");
  if (v.attempts >= 5) throw httpError(429, "Too many attempts. Request a new code.");
  if (sha256(String(req.body?.code || "").trim()) !== v.codeHash) { user.verification.attempts += 1; await user.save(); throw httpError(400, "Incorrect verification code"); }
  user.isVerified = true; user.verification = undefined; await user.save();
  res.json({ verified: true, user: pub(user) });
}));

r.post("/resend", authMiddleware, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw httpError(404, "User not found");
  if (user.isVerified) return res.json({ verified: true });
  const mail = await issueCode(user);
  res.json({ sent: true, emailPreviewUrl: env.isProd ? undefined : mail.previewUrl });
}));

r.post("/login", loginLimiter, asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  const user = await User.findOne({ email: String(email || "").toLowerCase() });
  if (!user || !(await bcrypt.compare(String(password || ""), user.passwordHash))) throw httpError(401, "Wrong email or password");
  res.json({ token: token(user), user: pub(user) });
}));

r.get("/me", authMiddleware, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw httpError(401, "Account not found");
  res.json({ user: pub(user) });
}));

export default r;
