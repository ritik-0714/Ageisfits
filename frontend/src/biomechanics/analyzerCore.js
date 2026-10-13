// Pure, DOM-free analysis pipeline: landmarks -> joint angle -> smoothing -> repetition FSM -> movement-quality metrics.
// Runs inside a Web Worker in the app (analyzer.worker.js) and directly in the unit tests.
import { EXERCISES, WEIGHTS, COUNT_TOLERANCE } from "./exercises.js";
import { jointAngle, angleFromVertical, sub, len, clamp, mean, stdev } from "./geometry.js";

export const VIS_MIN = 0.45, CONFIRM_FRAMES = 2, EMA_ALPHA = 0.4;     // tuned for ~30 fps webcam input
const round = v => (v == null ? null : Math.round(v));
// Weighted mean over whichever metrics are available (weights are renormalised so a missing metric does not drag the score down).
export function weighted(values, weights = WEIGHTS) {
  let num = 0, den = 0;
  for (const [k, w] of Object.entries(weights)) if (values[k] != null) { num += values[k] * w; den += w; }
  return den ? num / den : null;
}

export class ExerciseAnalyzer {
  constructor(exIndex = 0) { this.setExercise(exIndex); }

  setExercise(i) {
    this.ex = EXERCISES[i] || EXERCISES[0];
    this.reps = []; this.holdSeconds = 0; this.phase = "READY"; this.smooth = null; this.pending = null; this.confirmN = 0;
    this.lowVisN = 0; this.side = 0; this.act = [0, 0]; this.prevA = [null, null]; this.cur = this._blankRep(); this.lastT = null; this.startT = null; this.plankHips = []; this.plankAlign = []; this.plankStab = [];
  }
  _blankRep() { return { t0: null, minA: Infinity, maxA: -Infinity, align: [], hipX: [] }; }

  // Pick the usable side (hysteresis keeps it from flipping mid-rep). Bilateral exercises average both sides.
  _angleFor(pts, lm, side) {
    const [a, b, c] = this.ex.joints, p = i => pts[i + side];
    return { A: jointAngle(p(a), p(b), p(c)), vis: Math.min(lm[a + side].visibility ?? 0, lm[b + side].visibility ?? 0, lm[c + side].visibility ?? 0) };
  }
  _measure(pts, lm) {
    const L = this._angleFor(pts, lm, 0), R = this._angleFor(pts, lm, 1);
    if (this.ex.bilateral) {
      if (L.vis >= VIS_MIN && R.vis >= VIS_MIN) return { A: (L.A + R.A) / 2, vis: (L.vis + R.vis) / 2, side: 0 };
      return L.vis >= R.vis ? { ...L, side: 0 } : { ...R, side: 1 };
    }
    // Unilateral movement: follow whichever limb is actually moving (so curling the right OR left arm both count).
    const ok = [L.vis >= VIS_MIN, R.vis >= VIS_MIN];
    [L, R].forEach((m, i) => { if (this.prevA[i] != null) this.act[i] = 0.9 * this.act[i] + 0.1 * Math.abs(m.A - this.prevA[i]); this.prevA[i] = m.A; });
    let side = this.side;
    if (ok[0] && !ok[1]) side = 0; else if (!ok[0] && ok[1]) side = 1;
    else if (this.act[1] > this.act[0] * 1.6 + 0.5) side = 1; else if (this.act[0] > this.act[1] * 1.6 + 0.5) side = 0;
    if (side !== this.side) { this.side = side; this.smooth = null; this.pending = null; this.confirmN = 0; }      // restart smoothing on a side switch
    return { ...(side === 0 ? L : R), side };
  }

  // 0-100 form score for one frame (geometry from world landmarks when available, else image landmarks).
  alignmentScore(pts, side) {
    const p = i => pts[i + side], sh = p(11), hip = p(23), torso = len(sub(sh, hip)) || 1;
    switch (this.ex.align) {
      case "torso": return 100 - Math.max(0, angleFromVertical(sh, hip) - 35) * 2.5;
      case "torsoStrict": return 100 - Math.max(0, angleFromVertical(sh, hip) - 15) * 3;
      case "bodyline": return 100 - Math.max(0, 180 - jointAngle(sh, hip, p(27)) - 10) * 4;
      case "elbowPin": { const d = sub(p(13), sh); return 100 - Math.max(0, Math.hypot(d.x, d.z) / torso - 0.2) * 250; }
      case "symmetry": { const w = Math.abs(pts[11].x - pts[12].x) || 1; return 100 - Math.max(0, Math.abs(pts[11].y - pts[12].y) / w - 0.1) * 200; }
      default: return 100;
    }
  }

  noBody() { this.smooth = null; this.lastT = null; return { ...this._snapshot(), noBody: true }; }

  // frame = { lm: 33 image landmarks, wl?: 33 world landmarks, t: ms }
  process({ lm, wl, t }) {
    const pts = wl && wl.length === 33 ? wl : lm, m = this._measure(pts, lm), ex = this.ex;
    if (this.startT == null) this.startT = t;
    const dt = this.lastT == null ? 0 : Math.min(0.5, (t - this.lastT) / 1000);
    if (m.vis < VIS_MIN) { this.lowVisN++; this.lastT = t; return { ...this._snapshot(), lowVis: this.lowVisN >= CONFIRM_FRAMES }; }
    this.lowVisN = 0; this.lastT = t;

    this.smooth = this.smooth == null ? m.A : this.smooth * (1 - EMA_ALPHA) + m.A * EMA_ALPHA;
    const A = this.smooth, T = ex.threshold, align = clamp(this.alignmentScore(pts, m.side), 0, 100);
    const hipMid = { x: (lm[23].x + lm[24].x) / 2, y: (lm[23].y + lm[24].y) / 2 }, torsoLen = len(sub(lm[11 + m.side], lm[23 + m.side])) || 1;
    let want = this.phase, cue = null, repDone = null;

    if (ex.mode === "hold") {
      want = A >= T ? "HOLD" : "SAG";
      if (want === "HOLD") this.holdSeconds += dt;
      this.plankAlign.push(align); this.plankHips.push(hipMid); if (this.plankHips.length > 90) this.plankHips.shift();
      if (this.plankHips.length >= 10) this.plankStab.push(this._swayScore(this.plankHips.map(h => h.x), this.plankHips.map(h => h.y), torsoLen));
    } else {
      const down = ex.mode === "down", peakZone = down ? A < T + COUNT_TOLERANCE : A > T - COUNT_TOLERANCE, restZone = down ? A > T + 50 : A < T - 50, moving = down ? A < T + 50 : A > T - 50;
      want = peakZone ? "PEAK" : restZone ? "RESET" : this.phase;
      // ROM is measured over the WHOLE cycle (rest position -> peak), so a full rep scores 100% instead of only seeing the flexed half.
      this.cur.minA = Math.min(this.cur.minA, A); this.cur.maxA = Math.max(this.cur.maxA, A);
      if (moving) {                                           // tempo / alignment / stability only while the limb is away from rest
        if (this.cur.t0 == null) this.cur.t0 = t;
        this.cur.align.push(align); this.cur.hipX.push(hipMid.x);
      }
    }

    // finite-state machine: act only on a phase seen for CONFIRM_FRAMES in a row (a single noisy frame can't count a rep)
    if (want === this.pending) this.confirmN++; else { this.pending = want; this.confirmN = 1; }
    if (this.confirmN >= CONFIRM_FRAMES && want !== this.phase) {
      if (ex.mode !== "hold" && want === "RESET" && this.phase === "PEAK") { repDone = this._finishRep(t, torsoLen); }
      if (want === "RESET") this.cur = this._blankRep();
      this.phase = want;
    }

    const snap = this._snapshot();
    const ok = ex.mode === "hold" ? this.phase !== "SAG" && align >= 55 : align >= 55;
    cue = this._cue(ok, repDone, snap);
    return { ...snap, angle: A, side: m.side, vis: m.vis, ok, cue, align: Math.round(align), repDone, lowVis: false };
  }

  _swayScore(xs, ys, torso) { return clamp(100 - (Math.hypot(stdev(xs), stdev(ys)) / torso) * 600, 0, 100); }

  _finishRep(t, torsoLen) {
    const c = this.cur, ex = this.ex, refRange = Math.abs(ex.rom[0] - ex.rom[1]);
    const rom = clamp(((c.maxA - c.minA) / refRange) * 100, 0, 100);
    const alignment = mean(c.align), stability = clamp(100 - (stdev(c.hipX) / torsoLen) * 600, 0, 100);
    const dur = c.t0 == null ? 0 : (t - c.t0) / 1000, [lo, hi] = ex.tempo;
    const tempo = dur < lo ? clamp((dur / lo) * 100, 20, 100) : dur > hi ? clamp((hi / dur) * 100, 20, 100) : 100;
    const composite = weighted({ rom, alignment, stability, tempo });
    const rep = { rom, alignment, stability, tempo, composite, dur };
    this.reps.push(rep); return rep;
  }

  _consistency() {
    if (this.reps.length < 2) return null;
    const durs = this.reps.map(r => r.dur), cv = mean(durs) ? stdev(durs) / mean(durs) : 0;
    return clamp(100 - (stdev(this.reps.map(r => r.rom)) * 1.5 + cv * 60), 0, 100);
  }

  // Fatigue: last 3 reps clearly worse than first 3 (quality drop > 12 pts) or > 30% slower.
  _fatigue() {
    const r = this.reps; if (r.length < 6) return { detected: false, drop: 0 };
    const e = r.slice(0, 3), l = r.slice(-3), drop = mean(e.map(x => x.composite)) - mean(l.map(x => x.composite));
    const slower = mean(l.map(x => x.dur)) > mean(e.map(x => x.dur)) * 1.3;
    return { detected: drop > 12 || slower, drop: Math.round(drop), slower };
  }

  _snapshot() {
    const r = this.reps, hold = this.ex.mode === "hold";
    const rom = r.length ? mean(r.map(x => x.rom)) : null;
    const alignment = hold ? (this.plankAlign.length ? mean(this.plankAlign) : null) : r.length ? mean(r.map(x => x.alignment)) : null;
    const stability = hold ? (this.plankStab.length ? mean(this.plankStab) : null) : r.length ? mean(r.map(x => x.stability)) : null;
    const tempo = r.length ? mean(r.map(x => x.tempo)) : null, consistency = this._consistency();
    const composite = hold ? weighted({ alignment, stability }, { alignment: 0.5, stability: 0.5 }) : weighted({ rom, alignment, stability, tempo, consistency });
    return { phase: this.phase, reps: r.length, holdSeconds: Math.round(this.holdSeconds * 10) / 10, fatigue: this._fatigue(),
      live: { rom: round(rom), alignment: round(alignment), stability: round(stability), tempo: round(tempo), consistency: round(consistency), composite: round(composite) },
      repScores: r.map(x => Math.round(x.composite)) };
  }

  _cue(ok, rep, snap) {
    if (snap.fatigue.detected) return `Fatigue detected - quality dropped ${Math.max(0, snap.fatigue.drop)} pts${snap.fatigue.slower ? " and tempo slowed" : ""}. Consider resting.`;
    if (rep) {
      if (rep.rom < 70) return "Partial rep - aim for a fuller range of motion.";
      if (rep.tempo < 60) return rep.dur < this.ex.tempo[0] ? "Too fast - control the movement." : "Too slow - keep a steady tempo.";
    }
    return ok ? this.ex.cue : "Form deviation - check your alignment.";
  }

  // Session summary sent to the API when the athlete saves.
  summary() {
    const s = this._snapshot(), elapsed = this.startT == null || this.lastT == null ? 0 : Math.round((this.lastT - this.startT) / 1000);
    return { exercise: this.ex.name, reps: s.reps, holdSeconds: Math.round(s.holdSeconds), durationSec: elapsed, composite: s.live.composite, metrics: { rom: s.live.rom, alignment: s.live.alignment, stability: s.live.stability, tempo: s.live.tempo, consistency: s.live.consistency },
      repScores: s.repScores, fatigueDetected: s.fatigue.detected };
  }
}