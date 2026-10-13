import test from "node:test";
import assert from "node:assert/strict";
import { evaluateDailyRecommendation as decide } from "../src/services/decisionEngine.js";
import { computeAcwr, computeEwmaAcwr, riskBand, toDailySeries, acwrTrend, sessionLoad } from "../src/services/acwrService.js";
import { computeStatus, severityOf, analyzeTrainingImpact, countEpisodes, suggestModification, dominantSymptom, affectedMap } from "../src/services/discomfortEngine.js";
import { computePerformance, readinessLabel, recoveryStatus } from "../src/services/performanceService.js";
import { filterProducts, PRODUCTS, ACTIVITIES, retailerLink } from "../src/data/storeCatalog.js";
import { weeklyConsistency } from "../src/services/recoveryService.js";

const ok = { sleepHours: 8, soreness: 2, pain: 1, readinessScore: 80 };
const band = b => ({ riskBand: b, ratio: 1 });

test("decision engine: canonical rules", () => {
  assert.equal(decide(band("OPTIMAL"), ok, []).recommendation, "TRAIN");
  assert.equal(decide(band("OPTIMAL"), { ...ok, pain: 7 }, []).recommendation, "RECOVERY");
  assert.equal(decide(band("OPTIMAL"), ok, [{ severity: 8 }]).recommendation, "RECOVERY");
  assert.equal(decide(band("HIGH"), ok, []).recommendation, "POSTPONE");
  assert.equal(decide(band("OPTIMAL"), { ...ok, sleepHours: 4.5 }, []).recommendation, "POSTPONE");
  assert.equal(decide(band("OPTIMAL"), { ...ok, readinessScore: 39 }, []).recommendation, "POSTPONE");
  assert.equal(decide(band("ELEVATED"), ok, []).recommendation, "MODIFY");
  assert.equal(decide(band("OPTIMAL"), { ...ok, soreness: 6 }, []).recommendation, "MODIFY");
  assert.equal(decide(band("OPTIMAL"), ok, [{ severity: 6 }]).recommendation, "POSTPONE");
  assert.equal(decide(band("OPTIMAL"), ok, [{ severity: 4 }]).recommendation, "MODIFY");
});

test("decision engine: no check-in still returns a result and flags it", () => {
  const r = decide(band("OPTIMAL"), null, []);
  assert.equal(r.recommendation, "TRAIN"); assert.equal(r.factors.hasCheckIn, false);
});

test("decision engine: matrix of 400+ combinations obeys priority order and is deterministic", () => {
  let n = 0;
  for (const b of ["LOW", "OPTIMAL", "ELEVATED", "HIGH"]) for (const sleep of [3, 4.9, 5, 7, 9]) for (const sore of [0, 5, 6, 10])
    for (const pain of [0, 6, 7, 10]) for (const ready of [20, 39, 40, 90]) for (const sev of [0, 3, 4, 6, 8]) {
      const ci = { sleepHours: sleep, soreness: sore, pain, readinessScore: ready }, inj = sev ? [{ severity: sev }] : [];
      const r = decide(band(b), ci, inj); n++;
      assert.deepEqual(r, decide(band(b), ci, inj));                        // deterministic
      assert.ok(["TRAIN", "MODIFY", "POSTPONE", "RECOVERY"].includes(r.recommendation));
      if (sev >= 8 || pain >= 7) assert.equal(r.recommendation, "RECOVERY");
      else if (b === "HIGH" || sleep < 5 || ready < 40 || sev >= 6) assert.equal(r.recommendation, "POSTPONE");
      else if (b === "ELEVATED" || sore >= 6 || sev >= 4) assert.equal(r.recommendation, "MODIFY");
      else assert.equal(r.recommendation, "TRAIN");
      assert.ok(r.rule && r.reason && r.factors);                            // traceable
    }
  assert.ok(n >= 400, `ran ${n}`);
});

test("ACWR: zero chronic load -> ratio 1.0 OPTIMAL (initial training period)", () => {
  assert.deepEqual(computeAcwr(0, 0), { acuteLoad: 0, chronicLoad: 0, ratio: 1.0, riskBand: "OPTIMAL" });
});
test("ACWR: sRPE and the worked example from the report", () => assert.equal(sessionLoad(60, 7), 420));
test("ACWR: band edges 0.8 / 1.3 / 1.5", () => {
  assert.equal(riskBand(0.79), "LOW"); assert.equal(riskBand(0.8), "OPTIMAL"); assert.equal(riskBand(1.3), "OPTIMAL");
  assert.equal(riskBand(1.31), "ELEVATED"); assert.equal(riskBand(1.5), "ELEVATED"); assert.equal(riskBand(1.51), "HIGH");
});
test("ACWR: steady training sits at 1.0, a sudden spike goes HIGH", () => {
  assert.equal(computeAcwr(7 * 400, 28 * 400).ratio, 1);
  const spike = computeAcwr(7 * 900, 7 * 900 + 21 * 300);                         // acute avg 900/day vs chronic avg 450/day
  assert.equal(spike.riskBand, "HIGH"); assert.ok(spike.ratio > 1.5);
});
test("ACWR: EWMA agrees with rolling on constant load and reacts to a spike", () => {
  const flat = Array(120).fill(300); assert.ok(Math.abs(computeEwmaAcwr(flat).ratio - 1) < 0.01);
  assert.ok(computeEwmaAcwr([...Array(77).fill(200), ...Array(7).fill(900)]).ratio > 1.5);
  assert.equal(computeEwmaAcwr([]).riskBand, "OPTIMAL");
});
test("ACWR: missing sessions fill with zero; trend length matches", () => {
  const s = toDailySeries({ "2026-10-09": 100 }, "2026-10-10T12:00:00Z", 56);
  assert.equal(s.length, 56); assert.equal(s[54].load, 100); assert.equal(s[55].load, 0);
  assert.equal(acwrTrend(s, 28).length, 28);
});

test("discomfort: severity = max metric; status transitions", () => {
  assert.equal(severityOf({ pain: 2, soreness: 7, stiffness: 1 }), 7);
  assert.equal(computeStatus(null, 5), "new"); assert.equal(computeStatus(4, 6), "worsening"); assert.equal(computeStatus(6, 3), "improving");
  assert.equal(computeStatus(5, 5), "unchanged"); assert.equal(computeStatus(5, 0), "resolved");
});
test("discomfort: a 7/10 knee is HIGH for Squat/Lunge/Leg Press, MODERATE for Calf Raise (secondary), none for upper body", () => {
  const imp = analyzeTrainingImpact([{ bodyRegion: "knee_l", severity: 7 }], ["Squat", "Lunge", "Leg Press", "Calf Raise", "Bench Press", "Bicep Curl"]);
  const by = Object.fromEntries(imp.map(i => [i.name, i]));
  for (const n of ["Squat", "Lunge", "Leg Press"]) assert.equal(by[n].level, "HIGH", n);
  assert.equal(by["Calf Raise"].level, "MODERATE"); assert.equal(by["Calf Raise"].severity, 6);
  assert.equal(by["Bench Press"].level, "NONE"); assert.equal(by["Bicep Curl"].level, "NONE");
  assert.ok(by["Squat"].regions.includes("femur_l"), "knee pain spreads to the femur");
  assert.ok(by["Squat"].alternatives.includes("Glute Bridge")); assert.ok(!by["Squat"].alternatives.includes("Leg Curl"), "alternative must not load the knee");
  assert.equal(analyzeTrainingImpact([{ bodyRegion: "knee_l", severity: 4 }], ["Squat"])[0].level, "MODERATE");
  assert.equal(analyzeTrainingImpact([{ bodyRegion: "knee_l", severity: 2 }], ["Squat"])[0].level, "NONE");
  assert.deepEqual(affectedMap([{ bodyRegion: "knee_l", severity: 5 }]), { knee_l: 5, femur_l: 4, tibia_l: 4 });
});
test("discomfort: elbow pain flags Bicep Curl but leaves Squat alone", () => {
  const by = Object.fromEntries(analyzeTrainingImpact([{ bodyRegion: "el_l", severity: 8 }], ["Bicep Curl", "Squat"]).map(i => [i.name, i]));
  assert.equal(by["Bicep Curl"].level, "HIGH"); assert.equal(by["Squat"].level, "NONE");
});
test("workout modification text matches the report (4x10 -> 2x8 / 3x10 / unchanged)", () => {
  assert.deepEqual(suggestModification({ sets: 4, reps: "10" }, "HIGH"), { status: "MODIFIED", before: "4\u00d710", after: "2\u00d78", note: "REDUCE VOLUME & INTENSITY" });
  assert.equal(suggestModification({ sets: 4, reps: "10" }, "MODERATE").after, "3\u00d710");
  assert.equal(suggestModification({ sets: 4, reps: "8-12" }, "NONE").status, "UNCHANGED");
  assert.equal(suggestModification({ sets: 3, reps: "30-60 s" }, "HIGH").status, "MODIFIED");
  assert.deepEqual(dominantSymptom({ metrics: { pain: 2, soreness: 7, stiffness: 0, tenderness: 1 } }), { name: "Soreness", value: 7 });
  assert.equal(dominantSymptom({ metrics: { pain: 0, soreness: 0, stiffness: 0, tenderness: 0 } }), null);
});
test("performance score: needs 3+ sessions; consistency, movement quality and strength trend", () => {
  const now = Date.parse("2026-10-10T12:00:00Z"), d = n => new Date(now - n * 864e5);
  assert.equal(computePerformance({ logs: [{ date: d(1), exerciseType: "Run", calculatedLoad: 200 }], now }).label, "Baseline Building");
  const logs = [[1, 300], [3, 300], [5, 300], [8, 300], [16, 200], [20, 200]].map(([n, l]) => ({ date: d(n), exerciseType: "Strength", calculatedLoad: l }));
  const p = computePerformance({ logs, visionComposites: [80, 90], now });
  assert.equal(p.ready, true); assert.equal(p.consistency, 50); assert.equal(p.movementQuality, 85); assert.equal(p.strengthProgress, 200 > 0 ? 100 : 0);
  assert.ok(p.overall > 0 && p.overall <= 100); assert.ok(["Developing", "Solid", "Strong"].includes(p.label));
  assert.equal(readinessLabel(64), "Prime Training Readiness"); assert.equal(recoveryStatus({ sleepHours: 7.5, soreness: 2, fatigue: 2 }), "Well Rested");
  assert.equal(recoveryStatus({ sleepHours: 4, soreness: 2, fatigue: 2 }), "Under-recovered");
});
test("store: filters by activity, category, budget and skill; every retailer link is a search URL", () => {
  assert.ok(PRODUCTS.length >= 60 && ACTIVITIES.length === 12);
  const gym = filterProducts({ activity: "Gym & Weightlifting" }); assert.ok(gym.length >= 10 && gym.every(p => p.activity === "Gym & Weightlifting"));
  assert.ok(filterProducts({ activity: "Gym & Weightlifting", maxPrice: 1000 }).every(p => p.ref <= 1000));
  assert.ok(filterProducts({ category: "Footwear" }).every(p => p.category === "Footwear"));
  assert.ok(filterProducts({ skill: "Beginner" }).every(p => p.skill === "Beginner" || p.skill === "All Levels"));
  assert.ok(filterProducts({ q: "whey" }).length >= 1); assert.match(retailerLink("Amazon", "foam roller"), /amazon\.in\/s\?k=foam%20roller/);
});
test("discomfort: recurrence counts separate episodes", () => assert.equal(countEpisodes([{ status: "new" }, { status: "worsening" }, { status: "new" }]), 2));

test("recovery: weekly consistency buckets sessions", () => {
  const now = Date.parse("2026-10-10T12:00:00Z"), d = n => new Date(now - n * 864e5);
  const w = weeklyConsistency([{ date: d(1) }, { date: d(1.2) }, { date: d(9) }], 4, now);
  assert.equal(w.length, 4); assert.equal(w[3].sessions, 2); assert.equal(w[2].sessions, 1); assert.equal(w[3].activeDays, 1);
});
