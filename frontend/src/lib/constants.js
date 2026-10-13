export const VERDICT = {
  TRAIN: { text: "text-mint", badge: "badge-ok", bg: "bg-mint/10", ring: "border-mint/40" },
  MODIFY: { text: "text-amber", badge: "badge-warn", bg: "bg-amber/10", ring: "border-amber/40" },
  POSTPONE: { text: "text-flare", badge: "badge-warn", bg: "bg-flare/10", ring: "border-flare/40" },
  RECOVERY: { text: "text-rose", badge: "badge-bad", bg: "bg-rose/10", ring: "border-rose/40" },
};
export const BAND_TEXT = { LOW: "Under-training range", OPTIMAL: "Normal monitoring range", ELEVATED: "Elevated - monitor load", HIGH: "High spike - reduce load" };
export const BAND_STYLE = { LOW: "text-mute border-line", OPTIMAL: "text-mint border-emerald/40 bg-emerald/10", ELEVATED: "text-amber border-amber/40 bg-amber/10", HIGH: "text-rose border-rose/40 bg-rose/10" };
export const sevColor = s => (s >= 7 ? "#f43f5e" : s >= 3 ? "#f5b23d" : "#34d399");
export const GOALS = [["strength", "Strength & Power", "Heavy compound lifts, low reps"], ["hypertrophy", "Muscle & Weight Gain", "Moderate reps, higher volume"], ["endurance", "Endurance & Stamina", "Running, cycling and conditioning"], ["fatloss", "Fat Loss & Lean Build", "Calorie deficit with strength and cardio"]];
export const DIETS = [["veg", "Pure Vegetarian"], ["egg", "Eggetarian"], ["nonveg", "Non-Vegetarian"], ["vegan", "Vegan"]];
export const ACTIVITY = [["sedentary", "Desk job, little exercise"], ["light", "Light - 1-3 sessions a week"], ["moderate", "Moderate - 3-5 sessions"], ["active", "Active - 6-7 sessions"], ["athlete", "Athlete - twice-daily training"]];
