// Client-side mirror of backend/src/services/decisionEngine.js, used ONLY by the landing-page demo (no account needed).
export const bandOf = r => (r < 0.8 ? "LOW" : r <= 1.3 ? "OPTIMAL" : r <= 1.5 ? "ELEVATED" : "HIGH");
export function demoDecide({ acwr, sleep, soreness, pain, readiness, injury }) {
  const band = bandOf(acwr);
  if (injury >= 8 || pain >= 7) return { rec: "RECOVERY", why: "High pain or severe injury reported." };
  if (band === "HIGH" || sleep < 5 || readiness < 40) return { rec: "POSTPONE", why: "Workload spike or a severe sleep/readiness deficit." };
  if (injury >= 6) return { rec: "POSTPONE", why: "High discomfort in an active region." };
  if (band === "ELEVATED" || soreness >= 6) return { rec: "MODIFY", why: "Elevated load or soreness - cut intensity 20-30%." };
  if (injury >= 4) return { rec: "MODIFY", why: "Moderate discomfort - swap exercises that load that region." };
  return { rec: "TRAIN", why: "Workload and recovery are inside the optimal zone." };
}
