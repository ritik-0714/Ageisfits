import { Router } from "express";
import jwt from "jsonwebtoken";
import { WearableConnection, PROVIDERS } from "../models/WearableConnection.js";
import { User } from "../models/User.js";
import { env } from "../config/env.js";
import { authMiddleware, requireVerified } from "../middleware/authMiddleware.js";
import { asyncHandler, httpError } from "../middleware/common.js";
import { PROVIDER_DEFS, PROVIDER_META, PROVIDER_ORDER, isConfigured } from "../services/providers.js";
import { syncProvider } from "../services/wearableSync.js";
import { encrypt, sha256, randomCode } from "../services/crypto.js";
import { getAcwr } from "../services/acwrService.js";

const r = Router();
const OAUTH = ["strava", "fitbit", "garmin"], DEVICE = ["apple_health", "health_connect"];
const checkProvider = p => { if (!PROVIDERS.includes(p)) throw httpError(404, "Unknown provider"); return p; };

// ---- public endpoints (no Bearer header: browser redirects / companion apps) --------------------------
// OAuth redirect target. `state` is a short-lived signed JWT that carries the user id.
r.get("/:provider/callback", asyncHandler(async (req, res) => {
  const provider = checkProvider(req.params.provider), def = PROVIDER_DEFS[provider];
  const back = q => res.redirect(`${env.frontendUrl}/devices?${q}`);
  if (!OAUTH.includes(provider) || req.query.error) return back(`error=${encodeURIComponent(req.query.error || "unsupported")}`);
  let st; try { st = jwt.verify(String(req.query.state || ""), env.jwtSecret); } catch { return back("error=bad_state"); }
  if (st.provider !== provider) return back("error=bad_state");
  try {
    const t = await def.exchange(String(req.query.code || ""));
    await WearableConnection.findOneAndUpdate({ userId: st.uid, provider }, { $set: { mode: "oauth", accessTokenEnc: encrypt(t.accessToken), refreshTokenEnc: encrypt(t.refreshToken),
      tokenExpiresAt: t.expiresAt, externalUserId: t.externalUserId } }, { upsert: true, new: true });
    back(`connected=${provider}`);
  } catch (e) { console.error(`[${provider}] token exchange failed:`, e.message); back("error=token_exchange_failed"); }
}));

// Device push from the Android Health Connect companion (or an iOS companion for Apple Health). Authenticated by pairing code.
async function deviceSync(provider, req, res) {
  const { code, steps = 0, calories = 0, avgHeartRate = null, device = "Android" } = req.body || {};
  if (!/^\d{6}$/.test(String(code || ""))) throw httpError(401, "Invalid or expired pairing code. Generate a new code in AegisFit Devices.");
  const conn = await WearableConnection.findOne({ provider, "pairing.codeHash": sha256(code), "pairing.expiresAt": { $gt: new Date() } });
  if (!conn) throw httpError(401, "Invalid or expired pairing code. Generate a new code in AegisFit Devices.");
  const num = v => Math.max(0, Number(v) || 0);
  conn.latestMetrics = { steps: num(steps), calories: num(calories), avgHeartRate: avgHeartRate == null ? null : num(avgHeartRate), device: String(device).slice(0, 60), syncedAt: new Date() };
  conn.lastSyncedAt = new Date(); await conn.save();
  res.json({ ok: true, syncedAt: conn.lastSyncedAt, data: conn.latestMetrics });
}
r.post("/healthconnect/sync", asyncHandler((req, res) => deviceSync("health_connect", req, res)));      // used by android/ companion
r.post("/applehealth/sync", asyncHandler((req, res) => deviceSync("apple_health", req, res)));

// ---- authenticated endpoints --------------------------------------------------------------------------
r.use(authMiddleware, requireVerified);

r.get("/", asyncHandler(async (req, res) => {
  const conns = await WearableConnection.find({ userId: req.user.id }).lean(), by = Object.fromEntries(conns.map(c => [c.provider, c]));
  res.json({ providers: PROVIDER_ORDER.map(p => ({ provider: p, label: PROVIDER_DEFS[p].label, kind: PROVIDER_DEFS[p].kind, ...PROVIDER_META[p], configured: isConfigured(p),
    demoAvailable: PROVIDER_DEFS[p].kind === "oauth" && !isConfigured(p) && env.allowDemoWearables,
    connected: !!by[p] && (by[p].mode !== "device" || !!by[p].lastSyncedAt || !!by[p].pairing?.codeHash), mode: by[p]?.mode || null,
    lastSyncedAt: by[p]?.lastSyncedAt || null, syncedCount: by[p]?.syncedActivityIds?.length || 0, metrics: by[p]?.latestMetrics || null })) });
}));

// Step 1 of OAuth: returns the provider consent URL (the SPA then navigates to it).
r.post("/:provider/connect", asyncHandler(async (req, res) => {
  const provider = checkProvider(req.params.provider), def = PROVIDER_DEFS[provider];
  if (!OAUTH.includes(provider)) throw httpError(400, `${def.label} uses device pairing, not OAuth.`);
  if (!isConfigured(provider)) {
    if (!env.allowDemoWearables) throw httpError(501, `${def.label} OAuth credentials are not configured on the server.`);
    await WearableConnection.findOneAndUpdate({ userId: req.user.id, provider }, { $set: { mode: "demo" } }, { upsert: true, new: true });
    return res.json({ demo: true, message: `${def.label} credentials not configured - connected in sandbox mode with sample activities.` });
  }
  const state = jwt.sign({ uid: req.user.id, provider }, env.jwtSecret, { expiresIn: "10m" });
  res.json({ url: def.authUrl(state) });
}));

r.post("/:provider/sync", asyncHandler(async (req, res) => {
  const provider = checkProvider(req.params.provider);
  const conn = await WearableConnection.findOne({ userId: req.user.id, provider });
  if (!conn || conn.mode === "device") throw httpError(400, conn ? "Device-paired providers push their own data." : "Connect this provider first.");
  const user = await User.findById(req.user.id).select("profile");
  const result = await syncProvider(conn, { age: user?.profile?.age });
  res.json({ status: "SUCCESS", ...result, acwr: await getAcwr(req.user.id) });
}));

r.delete("/:provider", asyncHandler(async (req, res) => {
  await WearableConnection.deleteOne({ userId: req.user.id, provider: checkProvider(req.params.provider) });   // WorkoutLogs are kept
  res.json({ disconnected: true });
}));

// Pairing code for device-push providers (valid 10 minutes).
r.post("/:provider/pair", asyncHandler(async (req, res) => {
  const provider = checkProvider(req.params.provider);
  if (!DEVICE.includes(provider)) throw httpError(400, "Pairing is only used for Health Connect and Apple Health.");
  const code = randomCode(), expiresAt = new Date(Date.now() + 10 * 60e3);
  await WearableConnection.findOneAndUpdate({ userId: req.user.id, provider }, { $set: { mode: "device", pairing: { codeHash: sha256(code), expiresAt } } }, { upsert: true, new: true });
  res.json({ code, expiresAt, message: `Enter this code in the AegisFit ${PROVIDER_DEFS[provider].label} companion app.` });
}));

export default r;
