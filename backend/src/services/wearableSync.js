import { WorkoutLog } from "../models/WorkoutLog.js";
import { WearableConnection } from "../models/WearableConnection.js";
import { PROVIDER_DEFS, demoActivities } from "./providers.js";
import { encrypt, decrypt } from "./crypto.js";

export const compositeId = (provider, externalId) => `${provider}_${externalId}`;

// Heart-rate -> estimated session RPE (Borg CR10 style). Falls back to 6 when HR is unknown.
export function estimateRpe({ avgHeartRate, age = 30 } = {}) {
  if (!avgHeartRate) return 6;
  const pct = avgHeartRate / (220 - age);
  return pct < 0.6 ? 3 : pct < 0.7 ? 4 : pct < 0.78 ? 6 : pct < 0.87 ? 7 : pct < 0.93 ? 8 : 9;
}

const TYPE_MAP = { run: "Run", ride: "Cycle", virtualride: "Cycle", cycling: "Cycle", walk: "Brisk Walk", weighttraining: "Strength", workout: "Workout", swim: "Swim", hike: "Hike", yoga: "Yoga" };
export const mapActivityType = t => TYPE_MAP[String(t || "").toLowerCase().replace(/\s/g, "")] || String(t || "Workout");

// ---- idempotent ingest (pure w.r.t. storage: depends only on the `store` interface) -------------------
// store = { isSynced(id): Promise<bool>, createLog(doc): Promise<{_id}>, markSynced(id): Promise<void> }
export async function ingestActivity(store, { userId, provider, activity, age }) {
  const cid = compositeId(provider, activity.externalId);
  if (await store.isSynced(cid)) return { status: "SKIPPED", message: "Activity already ingested." };
  const durationMinutes = Math.max(1, Math.round((activity.durationSeconds || 0) / 60));
  const rpe = activity.estimatedRpe || estimateRpe({ avgHeartRate: activity.avgHeartRate, age });
  try {
    const log = await store.createLog({ userId, date: new Date(activity.startTime), exerciseType: mapActivityType(activity.type), durationMinutes, rpe, source: "wearable", provider, externalId: cid });
    await store.markSynced(cid);
    return { status: "SUCCESS", logId: log._id };
  } catch (e) {
    if (e?.code === 11000) { await store.markSynced(cid); return { status: "SKIPPED", message: "Activity already ingested." }; }   // unique-index race
    throw e;
  }
}

export function mongoStore(conn) {
  return {
    isSynced: async id => conn.syncedActivityIds.includes(id) || !!(await WorkoutLog.exists({ userId: conn.userId, externalId: id })),
    createLog: doc => WorkoutLog.create(doc),
    markSynced: async id => { if (!conn.syncedActivityIds.includes(id)) conn.syncedActivityIds.push(id); },
  };
}

export async function ensureFreshToken(conn) {
  const def = PROVIDER_DEFS[conn.provider];
  if (conn.mode !== "oauth" || !conn.tokenExpiresAt || conn.tokenExpiresAt > new Date(Date.now() + 60e3)) return decrypt(conn.accessTokenEnc);
  const t = await def.refresh(decrypt(conn.refreshTokenEnc));
  conn.accessTokenEnc = encrypt(t.accessToken); if (t.refreshToken) conn.refreshTokenEnc = encrypt(t.refreshToken); conn.tokenExpiresAt = t.expiresAt;
  return t.accessToken;
}

export async function syncProvider(conn, { age } = {}) {
  const since = conn.lastSyncedAt ? +conn.lastSyncedAt - 864e5 : Date.now() - 28 * 864e5;     // 1-day overlap is safe: ingest is idempotent
  const activities = conn.mode === "demo" ? demoActivities() : await PROVIDER_DEFS[conn.provider].fetchActivities(await ensureFreshToken(conn), since);
  const store = mongoStore(conn); let imported = 0, skipped = 0;
  for (const activity of activities) {
    const r = await ingestActivity(store, { userId: conn.userId, provider: conn.provider, activity, age });
    r.status === "SUCCESS" ? imported++ : skipped++;
  }
  conn.lastSyncedAt = new Date(); await conn.save();
  return { imported, skipped, total: activities.length };
}

export async function findConnection(userId, provider) { return WearableConnection.findOne({ userId, provider }); }
