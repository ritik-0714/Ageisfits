import "dotenv/config";

const bool = (v, d) => (v === undefined || v === "" ? d : !["false", "0", "no"].includes(String(v).toLowerCase()));

export const env = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/aegisfit",
  jwtSecret: process.env.JWT_SECRET || "dev-only-secret-change-me",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  serverUrl: process.env.SERVER_URL || "http://localhost:5000",
  requireVerification: bool(process.env.REQUIRE_EMAIL_VERIFICATION, true),
  allowDemoWearables: bool(process.env.ALLOW_DEMO_WEARABLES, false),
  isProd: process.env.NODE_ENV === "production",
};
if (env.isProd && !process.env.JWT_SECRET) throw new Error("JWT_SECRET must be set in production");
