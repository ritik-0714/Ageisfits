// Wearable provider adapters. Each adapter knows how to (1) build the OAuth URL, (2) exchange/refresh tokens and
// (3) fetch recent activities normalised to { externalId, type, startTime, durationSeconds, avgHeartRate }.
// Strava and Fitbit follow their public OAuth2 docs. Garmin's activity API is partner-gated: endpoints are configurable
// and that adapter has NOT been exercised against a live Garmin account.
import { env } from "../config/env.js";

const form = o => new URLSearchParams(o).toString();
const redirectUri = p => `${env.serverUrl}/api/integrations/${p}/callback`;

async function postForm(url, body, headers = {}) {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", ...headers }, body: form(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.message || j.error_description || j.errors?.[0]?.message || `Token request failed (${r.status})`);
  return j;
}
const getJson = async (url, token) => {
  const r = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`Provider API error ${r.status}`);
  return r.json();
};

export const PROVIDER_DEFS = {
  strava: {
    label: "Strava", kind: "oauth",
    id: () => process.env.STRAVA_CLIENT_ID, secret: () => process.env.STRAVA_CLIENT_SECRET,
    authUrl: state => `https://www.strava.com/oauth/authorize?${form({ client_id: process.env.STRAVA_CLIENT_ID, redirect_uri: redirectUri("strava"), response_type: "code", approval_prompt: "auto", scope: "activity:read_all", state })}`,
    async exchange(code) {
      const j = await postForm("https://www.strava.com/oauth/token", { client_id: process.env.STRAVA_CLIENT_ID, client_secret: process.env.STRAVA_CLIENT_SECRET, code, grant_type: "authorization_code" });
      return { accessToken: j.access_token, refreshToken: j.refresh_token, expiresAt: new Date(j.expires_at * 1000), externalUserId: String(j.athlete?.id ?? "") };
    },
    async refresh(refreshToken) {
      const j = await postForm("https://www.strava.com/oauth/token", { client_id: process.env.STRAVA_CLIENT_ID, client_secret: process.env.STRAVA_CLIENT_SECRET, grant_type: "refresh_token", refresh_token: refreshToken });
      return { accessToken: j.access_token, refreshToken: j.refresh_token, expiresAt: new Date(j.expires_at * 1000) };
    },
    async fetchActivities(token, since) {
      const a = await getJson(`https://www.strava.com/api/v3/athlete/activities?after=${Math.floor(since / 1000)}&per_page=50`, token);
      return a.map(x => ({ externalId: String(x.id), type: x.sport_type || x.type, startTime: x.start_date, durationSeconds: x.moving_time || x.elapsed_time, avgHeartRate: x.average_heartrate }));
    },
  },
  fitbit: {
    label: "Fitbit", kind: "oauth",
    id: () => process.env.FITBIT_CLIENT_ID, secret: () => process.env.FITBIT_CLIENT_SECRET,
    authUrl: state => `https://www.fitbit.com/oauth2/authorize?${form({ response_type: "code", client_id: process.env.FITBIT_CLIENT_ID, redirect_uri: redirectUri("fitbit"), scope: "activity heartrate profile", state })}`,
    async _token(body) {
      const basic = Buffer.from(`${process.env.FITBIT_CLIENT_ID}:${process.env.FITBIT_CLIENT_SECRET}`).toString("base64");
      const j = await postForm("https://api.fitbit.com/oauth2/token", body, { authorization: `Basic ${basic}` });
      return { accessToken: j.access_token, refreshToken: j.refresh_token, expiresAt: new Date(Date.now() + j.expires_in * 1000), externalUserId: j.user_id };
    },
    exchange(code) { return this._token({ grant_type: "authorization_code", code, redirect_uri: redirectUri("fitbit") }); },
    refresh(rt) { return this._token({ grant_type: "refresh_token", refresh_token: rt }); },
    async fetchActivities(token, since) {
      const d = new Date(since).toISOString().slice(0, 10);
      const j = await getJson(`https://api.fitbit.com/1/user/-/activities/list.json?afterDate=${d}&sort=asc&offset=0&limit=50`, token);
      return (j.activities || []).map(x => ({ externalId: String(x.logId), type: x.activityName, startTime: x.startTime, durationSeconds: Math.round((x.duration || 0) / 1000), avgHeartRate: x.averageHeartRate }));
    },
  },
  garmin: {
    label: "Garmin Connect", kind: "oauth",
    id: () => process.env.GARMIN_CLIENT_ID, secret: () => process.env.GARMIN_CLIENT_SECRET,
    authUrl: state => `${process.env.GARMIN_AUTH_URL || "https://connect.garmin.com/oauth2Confirm"}?${form({ response_type: "code", client_id: process.env.GARMIN_CLIENT_ID, redirect_uri: redirectUri("garmin"), state })}`,
    async exchange(code) {
      const j = await postForm(process.env.GARMIN_TOKEN_URL || "https://diauth.garmin.com/di-oauth2-service/oauth/token", { grant_type: "authorization_code", client_id: process.env.GARMIN_CLIENT_ID, client_secret: process.env.GARMIN_CLIENT_SECRET, code, redirect_uri: redirectUri("garmin") });
      return { accessToken: j.access_token, refreshToken: j.refresh_token, expiresAt: new Date(Date.now() + (j.expires_in || 3600) * 1000) };
    },
    async refresh(rt) {
      const j = await postForm(process.env.GARMIN_TOKEN_URL || "https://diauth.garmin.com/di-oauth2-service/oauth/token", { grant_type: "refresh_token", client_id: process.env.GARMIN_CLIENT_ID, client_secret: process.env.GARMIN_CLIENT_SECRET, refresh_token: rt });
      return { accessToken: j.access_token, refreshToken: j.refresh_token || rt, expiresAt: new Date(Date.now() + (j.expires_in || 3600) * 1000) };
    },
    async fetchActivities(token, since) {   // Garmin allows <=24h windows per request
      const base = process.env.GARMIN_API_BASE || "https://apis.garmin.com", out = [], end = Math.floor(Date.now() / 1000);
      for (let s = Math.max(Math.floor(since / 1000), end - 7 * 86400); s < end; s += 86400) {
        const a = await getJson(`${base}/wellness-api/rest/activities?uploadStartTimeInSeconds=${s}&uploadEndTimeInSeconds=${Math.min(s + 86400, end)}`, token);
        for (const x of a) out.push({ externalId: String(x.summaryId || x.activityId), type: x.activityType, startTime: new Date(x.startTimeInSeconds * 1000).toISOString(), durationSeconds: x.durationInSeconds, avgHeartRate: x.averageHeartRateInBeatsPerMinute });
      }
      return out;
    },
  },
  apple_health: { label: "Apple Health", kind: "device" },       // needs an iOS companion app (HealthKit is not reachable from the web)
  health_connect: { label: "Android Health Connect", kind: "device" },
};

export const isConfigured = p => PROVIDER_DEFS[p]?.kind === "oauth" ? !!(PROVIDER_DEFS[p].id() && PROVIDER_DEFS[p].secret()) : true;

// Sandbox activities used only when a provider has no OAuth credentials and ALLOW_DEMO_WEARABLES=true.
export const demoActivities = (now = Date.now()) => [
  { externalId: "demo-a1", type: "Run", startTime: new Date(now - 1 * 864e5).toISOString(), durationSeconds: 42 * 60, avgHeartRate: 148 },
  { externalId: "demo-a2", type: "WeightTraining", startTime: new Date(now - 3 * 864e5).toISOString(), durationSeconds: 55 * 60, avgHeartRate: 132 },
  { externalId: "demo-a3", type: "Ride", startTime: new Date(now - 5 * 864e5).toISOString(), durationSeconds: 30 * 60 },
];

// Display metadata for the Devices page (order and wording follow the report's Fig 4.9).
export const PROVIDER_META = {
  strava: { icon: "run", category: "WEARABLE GPS", tags: ["RUN", "CYCLE", "SWIM", "WALK", "HIKE", "STRENGTH"] },
  apple_health: { icon: "heart", category: "NATIVE ECOSYSTEM", tags: ["STEPS", "HEART_RATE", "RESTING_HEART_RATE", "SLEEP", "ACTIVE_CALORIES", "WORKOUTS"] },
  health_connect: { icon: "phone", category: "NATIVE ECOSYSTEM", tags: ["STEPS", "HEART_RATE", "SLEEP", "ACTIVE_CALORIES", "WORKOUTS"] },
  garmin: { icon: "watch", category: "WEARABLE GPS", tags: ["RUN", "CYCLE", "SWIM", "STEPS", "HEART_RATE", "SLEEP", "VO2_MAX"] },
  fitbit: { icon: "bolt", category: "WEARABLE HEALTH", tags: ["STEPS", "HEART_RATE", "RESTING_HEART_RATE", "SLEEP", "ACTIVE_MINUTES"] },
};
export const PROVIDER_ORDER = ["strava", "apple_health", "health_connect", "garmin", "fitbit"];
