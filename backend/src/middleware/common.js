import rateLimit from "express-rate-limit";

export const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export const httpError = (status, message) => Object.assign(new Error(message), { status });

// Brute-force protection: 5 failed logins per 15 minutes per IP (successful logins are not counted).
export const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false,
  skipSuccessfulRequests: true, message: { error: "Too many login attempts. Try again in 15 minutes." } });

export function notFound(req, res) { res.status(404).json({ error: "Not found" }); }
export function errorHandler(err, req, res, _next) {
  if (err.name === "ValidationError") return res.status(400).json({ error: Object.values(err.errors).map(e => e.message).join("; ") });
  if (err.name === "CastError") return res.status(400).json({ error: "Invalid id" });
  if (err.code === 11000) return res.status(409).json({ error: "Duplicate record" });
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? "Server error" : err.message });
}

export const dateKeyFrom = v => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? v : new Date().toISOString().slice(0, 10));
