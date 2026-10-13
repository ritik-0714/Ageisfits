// Decision Engine - deterministic, rule-based, auditable. Pure function: no I/O.
// Rules are evaluated top-down; the first match wins. Every result carries the rule id and the
// numeric factors that were read, so the recommendation is traceable to recorded data.

export const RECOMMENDATIONS = ["TRAIN", "MODIFY", "POSTPONE", "RECOVERY"];

export function evaluateDailyRecommendation(acwrResult, checkIn, activeInjuries = []) {
  const maxSev = Math.max(0, ...activeInjuries.map(i => i.severity ?? 0));
  const ci = checkIn || null;
  const factors = {
    acwr: acwrResult?.ratio ?? null, acwrBand: acwrResult?.riskBand ?? null,
    sleepHours: ci?.sleepHours ?? null, soreness: ci?.soreness ?? null, pain: ci?.pain ?? null,
    readinessScore: ci?.readinessScore ?? null, maxInjurySeverity: maxSev, hasCheckIn: !!ci,
  };
  const out = (recommendation, rule, reason) => ({ recommendation, rule, reason, factors });

  // 1. RECOVERY
  if (maxSev >= 8 || (ci && ci.pain >= 7))
    return out("RECOVERY", "R1_SEVERE_PAIN", "High pain or severe active injury reported.");
  // 2. POSTPONE
  if (acwrResult?.riskBand === "HIGH" || (ci && (ci.sleepHours < 5 || ci.readinessScore < 40)))
    return out("POSTPONE", "P1_LOAD_SPIKE_OR_DEFICIT", "High workload spike or severe sleep/readiness deficit detected.");
  if (maxSev >= 6)
    return out("POSTPONE", "P2_ACTIVE_DISCOMFORT_HIGH", `High discomfort (${maxSev}/10) in an active region. Postpone heavy loading of the affected area.`);
  // 3. MODIFY
  if (acwrResult?.riskBand === "ELEVATED" || (ci && ci.soreness >= 6))
    return out("MODIFY", "M1_ELEVATED_LOAD_OR_SORENESS", "Elevated workload ratio or soreness. Reduce intensity by 20-30%.");
  if (maxSev >= 4)
    return out("MODIFY", "M2_ACTIVE_DISCOMFORT_MODERATE", `Moderate discomfort (${maxSev}/10). Swap exercises that load the affected region.`);
  // 4. TRAIN
  return out("TRAIN", "T1_WITHIN_OPTIMAL_ZONE", ci ? "Workload and recovery metrics within optimal training zone."
    : "Workload within range. Complete today's check-in for a sharper recommendation.");
}
