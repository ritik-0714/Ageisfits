// Vector helpers. Landmarks are { x, y, z?, visibility? }.
export const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: (a.z ?? 0) - (b.z ?? 0) });
export const len = v => Math.hypot(v.x, v.y, v.z);
export const dot = (u, v) => u.x * v.x + u.y * v.y + u.z * v.z;
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// theta = acos( (A-B).(C-B) / (|A-B||C-B|) )   - the dot-product joint-angle formula from the report (3D, degrees).
export function jointAngle(A, B, C) {
  const u = sub(A, B), v = sub(C, B), m = len(u) * len(v);
  if (m === 0) return 0;
  return (Math.acos(clamp(dot(u, v) / m, -1, 1)) * 180) / Math.PI;
}
// Angle between segment B->A and the vertical "up" direction (image / world y axes point down).
export function angleFromVertical(top, bottom) {
  const v = sub(top, bottom), m = len(v);
  return m === 0 ? 0 : (Math.acos(clamp(-v.y / m, -1, 1)) * 180) / Math.PI;
}
export const mean = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
export const stdev = a => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) ** 2))); };
