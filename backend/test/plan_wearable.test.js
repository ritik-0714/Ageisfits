import test from "node:test";
import assert from "node:assert/strict";
import { generatePlan, bmrMifflin, buildWorkouts, macroTargets } from "../src/services/aiPlanEngine.js";
import { EXERCISE_MAP } from "../src/data/exerciseMap.js";
import { ingestActivity, compositeId, estimateRpe, mapActivityType } from "../src/services/wearableSync.js";
import { demoActivities, isConfigured, PROVIDER_DEFS } from "../src/services/providers.js";
import { encrypt, decrypt } from "../src/services/crypto.js";

const base = { age: 25, height: 180, weight: 80, gender: "male", fitnessGoal: "hypertrophy", activityLevel: "moderate", experience: "intermediate", dietType: "veg" };

test("plan: Mifflin-St Jeor matches hand calculation", () => {
  assert.equal(bmrMifflin({ weight: 80, height: 180, age: 25, gender: "male" }), 1805);
  assert.equal(bmrMifflin({ weight: 60, height: 165, age: 30, gender: "female" }), 600 + 1031.25 - 150 - 161);
});
test("plan: goals shape calories and protein (2.0-2.2 g/kg, ~18% deficit)", () => {
  const maint = generatePlan({ ...base, fitnessGoal: "endurance" }), cut = generatePlan({ ...base, fitnessGoal: "fatloss" }), st = generatePlan({ ...base, fitnessGoal: "strength" });
  assert.ok(cut.targets.kcal < cut.tdee && cut.targets.kcal > cut.tdee * 0.78);
  assert.equal(st.targets.protein, Math.round(80 * 2.2)); assert.equal(cut.targets.protein, 160);
  assert.ok(maint.targets.fibre > 0 && st.targets.carbs > 0);
});
test("plan: every diet yields 4 meals that respect the diet and sum to the calorie target", () => {
  const banned = { veg: /egg|chicken|fish|keema|biryani|stew/i, egg: /chicken|fish|keema|biryani|stew/i, vegan: /paneer|curd|raita|ghee|egg|chicken|fish|(?<!soy )milk/i, nonveg: /$^/ };
  for (const dietType of ["veg", "nonveg", "egg", "vegan"]) {
    const p = generatePlan({ ...base, dietType });
    assert.deepEqual(p.meals.map(m => m.meal), ["Breakfast", "Lunch", "Snacks", "Dinner"]);
    assert.ok(Math.abs(p.meals.reduce((s, m) => s + m.kcal, 0) - p.targets.kcal) <= 2);
    for (const day of Object.values(p.weeklyMeals)) for (const m of day) assert.ok(!banned[dietType].test(m.food), `${dietType}: ${m.food}`);
    assert.equal(Object.keys(p.weeklyMeals).length, 7);
  }
});
test("plan: micronutrients cover B12, D, iron, zinc; vegans are told to supplement B12", () => {
  const p = generatePlan({ ...base, dietType: "vegan" });
  assert.deepEqual(p.micronutrients.map(m => m.name), ["Vitamin B12", "Vitamin D", "Iron", "Zinc"]);
  assert.ok(p.micronutrients[0].sources.some(s => /supplement/i.test(s)));
});
test("plan: every workout exercise is known to the exercise->anatomy map (so injuries can flag it)", () => {
  for (const goal of ["strength", "hypertrophy", "endurance", "fatloss"]) for (const experience of ["beginner", "intermediate", "advanced"]) {
    const w = buildWorkouts({ goal, experience }); assert.ok(w.length >= 3);
    for (const d of w) for (const e of d.exercises) assert.ok(EXERCISE_MAP[e.name], `${goal}/${experience}: ${e.name}`);
  }
  assert.ok(buildWorkouts({ goal: "hypertrophy", experience: "advanced" }).length > buildWorkouts({ goal: "hypertrophy", experience: "beginner" }).length);
});

// ---- idempotent wearable ingest ---------------------------------------------------------------------------
function memoryStore() {
  const synced = new Set(), logs = [];
  return { logs, isSynced: async id => synced.has(id), markSynced: async id => void synced.add(id),
    createLog: async d => { logs.push(d); return { _id: logs.length }; } };
}
test("wearable: same Strava payload submitted 10 times creates exactly one WorkoutLog", async () => {
  const store = memoryStore(), activity = { externalId: "123456", type: "Run", startTime: "2026-10-01T06:00:00Z", durationSeconds: 2700, avgHeartRate: 150 };
  const results = []; for (let i = 0; i < 10; i++) results.push(await ingestActivity(store, { userId: "u1", provider: "strava", activity }));
  assert.equal(results[0].status, "SUCCESS"); assert.ok(results.slice(1).every(r => r.status === "SKIPPED"));
  assert.equal(store.logs.length, 1); assert.equal(store.logs[0].externalId, "strava_123456"); assert.equal(store.logs[0].source, "wearable");
});
test("wearable: duplicate-key race from the unique index is reported as SKIPPED, not an error", async () => {
  const store = memoryStore(); store.createLog = async () => { throw Object.assign(new Error("dup"), { code: 11000 }); };
  assert.equal((await ingestActivity(store, { userId: "u", provider: "fitbit", activity: { externalId: "9", durationSeconds: 600, startTime: new Date() } })).status, "SKIPPED");
});
test("wearable: provider namespaces keep ids apart; demo set is stable", async () => {
  assert.equal(compositeId("strava", "1"), "strava_1"); assert.notEqual(compositeId("strava", "1"), compositeId("fitbit", "1"));
  const store = memoryStore();
  for (let pass = 0; pass < 3; pass++) for (const a of demoActivities()) await ingestActivity(store, { userId: "u", provider: "strava", activity: a });
  assert.equal(store.logs.length, 3);
});
test("wearable: RPE estimate and type mapping", () => {
  assert.equal(estimateRpe({}), 6); assert.ok(estimateRpe({ avgHeartRate: 175, age: 25 }) >= 8); assert.ok(estimateRpe({ avgHeartRate: 105, age: 25 }) <= 4);
  assert.equal(mapActivityType("Ride"), "Cycle"); assert.equal(mapActivityType("WeightTraining"), "Strength");
});
test("providers: unconfigured OAuth providers are flagged; device providers need no keys", () => {
  assert.equal(isConfigured("strava"), false); assert.equal(isConfigured("apple_health"), true);
  process.env.STRAVA_CLIENT_ID = "abc"; process.env.STRAVA_CLIENT_SECRET = "def";
  assert.equal(isConfigured("strava"), true); assert.match(PROVIDER_DEFS.strava.authUrl("S"), /client_id=abc.*state=S/);
});
test("crypto: tokens round-trip and ciphertext is not plaintext", () => {
  const c = encrypt("secret-token"); assert.notEqual(c, "secret-token"); assert.equal(decrypt(c), "secret-token"); assert.equal(decrypt(""), "");
});
