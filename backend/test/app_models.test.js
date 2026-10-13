import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { authMiddleware } from "../src/middleware/authMiddleware.js";
import { env } from "../src/config/env.js";
import { createApp } from "../src/app.js";
import { WorkoutLog } from "../src/models/WorkoutLog.js";
import { CheckIn } from "../src/models/CheckIn.js";
import { DiscomfortReport } from "../src/models/DiscomfortReport.js";
import { User } from "../src/models/User.js";
import { VisionSession } from "../src/models/VisionSession.js";
import { haversineKm, matchScore } from "../src/routes/community.js";
import { buildSeed } from "../src/data/communitySeed.js";
import { CITIES } from "../src/data/cities.js";

const run = headers => new Promise(resolve => {
  const req = { headers }, res = { status(c) { this.code = c; return this; }, json(b) { resolve({ code: this.code, body: b, req }); } };
  authMiddleware(req, res, () => resolve({ code: 200, req }));
});

test("auth middleware: missing, malformed, wrong-secret and expired tokens -> 401", async () => {
  assert.equal((await run({})).code, 401);
  assert.equal((await run({ authorization: "Token abc" })).code, 401);
  assert.equal((await run({ authorization: "Bearer not.a.jwt" })).code, 401);
  assert.equal((await run({ authorization: "Bearer " + jwt.sign({ uid: "1" }, "other-secret") })).code, 401);
  assert.equal((await run({ authorization: "Bearer " + jwt.sign({ uid: "1" }, env.jwtSecret, { expiresIn: -10 }) })).code, 401);
});
test("auth middleware: valid token authenticates and populates req.user", async () => {
  const r = await run({ authorization: "Bearer " + jwt.sign({ uid: "abc123", email: "a@b.co" }, env.jwtSecret, { expiresIn: "7d" }) });
  assert.equal(r.code, 200); assert.deepEqual(r.req.user, { id: "abc123", email: "a@b.co" });
  const { exp, iat } = jwt.decode(jwt.sign({ uid: "x" }, env.jwtSecret, { expiresIn: "7d" })); assert.equal(exp - iat, 7 * 86400);
});

test("HTTP: health is open; every protected route answers 401 without a token; unknown API path is 404", async () => {
  const server = createApp().listen(0), base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(base + "/api/health")).status, 200);
    for (const [m, p] of [["GET", "/api/plans/current"], ["POST", "/api/plans"], ["GET", "/api/injury"], ["POST", "/api/discomfort"], ["GET", "/api/acwr"], ["POST", "/api/check-ins"],
      ["GET", "/api/performance/today"], ["POST", "/api/vision"], ["GET", "/api/integrations"], ["GET", "/api/community"], ["GET", "/api/cart"], ["GET", "/api/performance/dashboard"], ["GET", "/api/shop/products"], ["POST", "/api/acwr/seed-demo"], ["POST", "/api/discomfort/clear"], ["GET", "/api/shop/prices?q=x"], ["GET", "/api/auth/me"]])
      assert.equal((await fetch(base + p, { method: m, headers: { "content-type": "application/json" }, body: m === "POST" ? "{}" : undefined })).status, 401, `${m} ${p}`);
    assert.equal((await fetch(base + "/api/nope")).status, 404);
    const meta = await (await fetch(base + "/api/community/meta")).json(); assert.equal(meta.cities.length, 22);
    assert.equal((await fetch(base + "/api/shop/meta")).status, 200);
    assert.equal((await fetch(base + "/api/auth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "x", email: "bad", password: "123" }) })).status, 400);
  } finally { server.close(); }
});

test("models: WorkoutLog computes sRPE load and rejects out-of-range RPE", async () => {
  const ok = new WorkoutLog({ userId: new User()._id, durationMinutes: 60, rpe: 7 }); await ok.validate(); assert.equal(ok.calculatedLoad, 420);
  assert.ok(new WorkoutLog({ userId: new User()._id, durationMinutes: 30, rpe: 11 }).validateSync().errors.rpe);
  assert.ok(new WorkoutLog({ userId: new User()._id, durationMinutes: 30, rpe: 5, source: "teleport" }).validateSync().errors.source);
});
test("models: CheckIn / DiscomfortReport / VisionSession enforce ranges and enums", () => {
  const u = new User()._id;
  assert.equal(new CheckIn({ userId: u, dateKey: "2026-10-10", sleepHours: 7, soreness: 3, pain: 2, readinessScore: 80, computedRecommendation: "TRAIN" }).validateSync(), undefined);
  assert.ok(new CheckIn({ userId: u, dateKey: "2026-10-10", sleepHours: 7, soreness: 11, pain: 2, readinessScore: 80 }).validateSync().errors.soreness);
  assert.ok(new CheckIn({ userId: u, dateKey: "d", sleepHours: 7, soreness: 1, pain: 2, readinessScore: 80, computedRecommendation: "MAYBE" }).validateSync().errors.computedRecommendation);
  assert.ok(new DiscomfortReport({ userId: u, bodyRegion: "elbow_x", severity: 3, status: "new" }).validateSync().errors.bodyRegion);
  assert.equal(new DiscomfortReport({ userId: u, bodyRegion: "knee_l", severity: 3, status: "new" }).validateSync(), undefined);
  assert.ok(new VisionSession({ userId: u, exercise: "Burpee", reps: 3 }).validateSync().errors.exercise);
  for (const e of ["Squat", "Push-up", "Bicep Curl", "Plank", "Lunge", "Shoulder Press", "Deadlift", "Jumping Jack"]) assert.equal(new VisionSession({ userId: u, exercise: e, reps: 1 }).validateSync(), undefined, e);
  assert.ok(new DiscomfortReport({ userId: u, bodyRegion: "knee_l", severity: 3, status: "new", trend: "sideways" }).validateSync().errors.trend);
  assert.ok(new User({ name: "A", email: "a@b.co", passwordHash: "x", profile: { weight: 5 } }).validateSync().errors["profile.weight"]);
});

test("community: haversine distance, match scoring and the 22-city / 12-sport seed", () => {
  const d = haversineKm(22.3072, 73.1812, 23.0225, 72.5714); assert.ok(d > 95 && d < 108, String(d));
  assert.equal(haversineKm(1, 1, 1, 1), 0);
  const near = matchScore({ interests: ["Running"], sport: "Running", distanceKm: 1 }), far = matchScore({ interests: ["Running"], sport: "Running", distanceKm: 30 }), off = matchScore({ interests: ["Running"], sport: "Yoga", distanceKm: 1 });
  assert.ok(near > far && far > off && near <= 100);
  const seed = buildSeed(); assert.equal(CITIES.length, 22); assert.equal(new Set(seed.map(s => s.city)).size, 22); assert.ok(seed.every(s => s.isSample));
  const vad = seed.filter(s => s.city === "Vadodara"); assert.equal(vad.length, 12); assert.equal(vad.filter(s => s.kind === "club").length, 6); assert.equal(vad.filter(s => s.kind === "event").length, 6);
  assert.equal(new Set(vad.map(s => s.sport)).size, 12, "one item per sport"); assert.equal(vad[0].state, "Gujarat");
  const c = CITIES.find(x => x.name === "Vadodara"); const km = vad.map(s => haversineKm(c.lat, c.lng, s.lat, s.lng)); assert.ok(Math.min(...km) > 0.9 && Math.max(...km) < 15, `${Math.min(...km)}-${Math.max(...km)}`);
});
