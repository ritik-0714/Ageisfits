import test from "node:test";
import assert from "node:assert/strict";
import { ExerciseAnalyzer, CONFIRM_FRAMES, weighted } from "../src/biomechanics/analyzerCore.js";
import { jointAngle } from "../src/biomechanics/geometry.js";
import { EXERCISES, WEIGHTS } from "../src/biomechanics/exercises.js";

const rad = d => (d * Math.PI) / 180;
const blank = (vis = 0.99) => Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: vis }));
const idx = n => EXERCISES.findIndex(e => e.name === n);

// Build a pose whose measured joint has exactly `angle` degrees. Vertex at V, 'c' hangs straight down, 'a' sits `angle` away from it.
function pose(exName, angle, { vis = 0.99, shoulderOffset = true } = {}) {
  const ex = EXERCISES[idx(exName)], [a, b, c] = ex.joints, lm = blank(vis);
  for (const side of [0, 1]) {
    const V = { x: 0.5 + (side ? -0.1 : 0.1), y: 0.5, z: 0 };
    lm[b + side] = { ...V, visibility: vis };
    lm[c + side] = { x: V.x, y: V.y + 0.4, z: 0, visibility: vis };
    lm[a + side] = { x: V.x + 0.4 * Math.sin(rad(angle)), y: V.y + 0.4 * Math.cos(rad(angle)), z: 0, visibility: vis };
  }
  if (shoulderOffset && ex.align === "torso") for (const s of [0, 1]) lm[11 + s] = { ...lm[23 + s], y: lm[23 + s].y - 0.5 };           // upright torso
  return lm;
}
const run = (an, name, angleAt, seconds, { fps = 30, t0 = 0, vis } = {}) => {
  let last; for (let f = 0; f < seconds * fps; f++) { const t = t0 + (f * 1000) / fps; last = an.process({ lm: pose(name, angleAt(f / fps), { vis }), t }); } return last;
};

test("joint angle formula: right angle, straight line, folded", () => {
  assert.ok(Math.abs(jointAngle({ x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }) - 90) < 1e-9);
  assert.ok(Math.abs(jointAngle({ x: -1, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }) - 180) < 1e-9);
  assert.equal(jointAngle({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }), 0);          // degenerate guard
  assert.ok(Math.abs(jointAngle({ x: 1, y: 0, z: 1 }, { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: -1 }) - 90) < 1e-9);   // true 3-D
});

test("8 exercises are defined with the shape the analyzer needs", () => {
  assert.equal(EXERCISES.length, 8);
  assert.deepEqual(EXERCISES.map(e => e.name), ["Squat", "Push-up", "Bicep Curl", "Plank", "Lunge", "Shoulder Press", "Deadlift", "Jumping Jack"]);
  for (const e of EXERCISES) { assert.equal(e.joints.length, 3); assert.ok(["down", "up", "hold"].includes(e.mode)); assert.equal(e.rom.length, 2); }
});

test("squat: 5 full-depth cycles -> exactly 5 reps, all five metrics + composite populated", () => {
  const an = new ExerciseAnalyzer(idx("Squat"));
  const r = run(an, "Squat", t => 120 + 50 * Math.cos((2 * Math.PI * t) / 3), 15.5);            // 170 -> 70 degrees, 3 s per rep
  assert.equal(r.reps, 5);
  for (const k of ["rom", "alignment", "stability", "tempo", "consistency", "composite"]) assert.ok(r.live[k] >= 0 && r.live[k] <= 100, `${k}=${r.live[k]}`);
  assert.ok(r.live.rom > 90 && r.live.tempo === 100 && r.live.consistency > 90);
  const s = an.summary(); assert.equal(s.exercise, "Squat"); assert.equal(s.reps, 5); assert.equal(s.repScores.length, 5); assert.equal(s.fatigueDetected, false);
});

test("squat: half-depth movement never reaches the threshold -> 0 reps", () => {
  const an = new ExerciseAnalyzer(idx("Squat"));
  assert.equal(run(an, "Squat", t => 140 + 30 * Math.cos((2 * Math.PI * t) / 3), 12).reps, 0);
});

test("squat: a single noisy frame cannot register a rep (needs CONFIRM_FRAMES)", () => {
  const an = new ExerciseAnalyzer(idx("Squat")); assert.equal(CONFIRM_FRAMES, 3);
  run(an, "Squat", () => 170, 1);
  let t = 2000; an.process({ lm: pose("Squat", 60), t }); t += 33;                                     // 1 bad frame
  const r = run(an, "Squat", () => 170, 1, { t0: t + 33 }); assert.equal(r.reps, 0);
});

test("low-visibility frames are ignored and flagged", () => {
  const an = new ExerciseAnalyzer(idx("Squat")), r = run(an, "Squat", () => 100, 1, { vis: 0.2 });
  assert.equal(r.lowVis, true); assert.equal(r.reps, 0);
});

test("fatigue: later reps shallower and slower than early ones -> fatigue flagged with cue", () => {
  const an = new ExerciseAnalyzer(idx("Squat")); let t = 0, last;
  // crisp early reps: 170 -> 70 in 3 s
  for (let i = 0; i < 3; i++) for (let f = 0; f < 90; f++, t += 1000 / 30) last = an.process({ lm: pose("Squat", 120 + 50 * Math.cos((2 * Math.PI * (f / 30)) / 3)), t });
  // tired late reps: 170 -> 95 (just past threshold) in 5 s
  for (let i = 0; i < 4; i++) for (let f = 0; f < 150; f++, t += 1000 / 30) last = an.process({ lm: pose("Squat", 132.5 + 37.5 * Math.cos((2 * Math.PI * (f / 30)) / 5)), t });
  last = run(an, "Squat", () => 170, 1, { t0: t });
  assert.ok(last.reps >= 6); assert.equal(last.fatigue.detected, true); assert.match(last.cue, /Fatigue/);
});

test("plank: hold time accumulates only while the body line is straight", () => {
  const an = new ExerciseAnalyzer(idx("Plank"));
  let r = run(an, "Plank", () => 175, 5);
  assert.ok(r.holdSeconds >= 4.5 && r.holdSeconds <= 5.2, String(r.holdSeconds)); assert.equal(r.phase, "HOLD");
  const before = r.holdSeconds; r = run(an, "Plank", () => 140, 3, { t0: 6000 });
  assert.equal(r.phase, "SAG"); assert.ok(r.holdSeconds - before < 0.2);
  assert.equal(an.summary().reps, 0); assert.ok(an.summary().holdSeconds >= 4);
});

test("jumping jack (bilateral): 4 arm raises -> 4 reps", () => {
  const an = new ExerciseAnalyzer(idx("Jumping Jack"));
  const r = run(an, "Jumping Jack", t => 95 + 70 * Math.sin((2 * Math.PI * t) / 1.2 - Math.PI / 2), 5.2);   // 25 <-> 165 degrees, 1.2 s per rep
  assert.equal(r.reps, 4);
});

test("exercise switch resets all state", () => {
  const an = new ExerciseAnalyzer(idx("Squat")); run(an, "Squat", t => 120 + 50 * Math.cos((2 * Math.PI * t) / 3), 7);
  an.setExercise(idx("Plank")); const s = an.summary(); assert.equal(s.reps, 0); assert.equal(s.exercise, "Plank");
});

test("bicep curl: 4 full curls (160 -> 40 degrees) -> exactly 4 reps; a half curl (160 -> 90) counts nothing", () => {
  const an = new ExerciseAnalyzer(idx("Bicep Curl"));
  assert.equal(run(an, "Bicep Curl", t => 100 + 60 * Math.cos((2 * Math.PI * t) / 3), 12.5).reps, 4);
  const half = new ExerciseAnalyzer(idx("Bicep Curl"));
  assert.equal(run(half, "Bicep Curl", t => 125 + 35 * Math.cos((2 * Math.PI * t) / 3), 12.5).reps, 0);
});
test("shoulder press and deadlift count lockout reps", () => {
  const sp = new ExerciseAnalyzer(idx("Shoulder Press")), dl = new ExerciseAnalyzer(idx("Deadlift"));
  assert.equal(run(sp, "Shoulder Press", t => 125 + 45 * Math.sin((2 * Math.PI * t) / 3 - Math.PI / 2) * -1, 9.5).reps >= 2, true);
  assert.equal(run(dl, "Deadlift", t => 135 + 45 * Math.cos((2 * Math.PI * t) / 3.5), 11).reps >= 2, true);
});
test("composite uses the report's weights (ROM 25, Alignment 25, Stability 20, Tempo 15, Consistency 15)", () => {
  assert.deepEqual(WEIGHTS, { rom: 0.25, alignment: 0.25, stability: 0.2, tempo: 0.15, consistency: 0.15 });
  assert.equal(Math.round(Object.values(WEIGHTS).reduce((a, b) => a + b, 0) * 100), 100);
  assert.equal(weighted({ rom: 100, alignment: 100, stability: 100, tempo: 100, consistency: 100 }), 100);
  assert.ok(Math.abs(weighted({ rom: 80, alignment: 60, stability: 100, tempo: 40, consistency: 90 }) - (80 * 0.25 + 60 * 0.25 + 100 * 0.2 + 40 * 0.15 + 90 * 0.15)) < 1e-9);
  assert.equal(weighted({ rom: 80 }), 80);                                     // missing metrics are renormalised
});
