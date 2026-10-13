// AI Plan Engine: profile -> BMR (Mifflin-St Jeor) -> TDEE -> macros/micros -> Indian meals + weekly workout split.
// Plans are generated deterministically from templates; if ANTHROPIC_API_KEY is set the meal list and a coach note
// are additionally personalised by a generative model (validated, and silently discarded if malformed).

export const ACTIVITY = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, athlete: 1.9 };

export const bmrMifflin = ({ weight, height, age, gender }) => 10 * weight + 6.25 * height - 5 * age + (gender === "female" ? -161 : 5);
export const tdeeFrom = (bmr, activity) => bmr * (ACTIVITY[activity] || ACTIVITY.moderate);

export function macroTargets({ weight, goal }, tdee) {
  const kcal = Math.round(goal === "fatloss" ? tdee * 0.82            // ~18% deficit (15-20% band)
    : goal === "hypertrophy" || goal === "strength" ? tdee * 1.1 : goal === "endurance" ? tdee * 1.05 : tdee);
  const gPerKg = goal === "strength" ? 2.2 : goal === "endurance" ? 1.6 : 2.0;
  const protein = Math.round(weight * gPerKg), fat = Math.round((kcal * 0.25) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, carbs, fat, fibre: Math.round((kcal / 1000) * 14) };
}

// NOTE: reference intakes follow ICMR-NIN 2020 adult guidance (approximate) - verify against current tables before clinical use.
export function micronutrientPlan({ diet, gender }) {
  const f = gender === "female";
  const plant = diet === "veg" || diet === "vegan";
  return [
    { name: "Vitamin B12", target: "2.2 µg/day", sources: plant ? ["fortified foods", "milk & curd (veg)", "B12 supplement (vegan)"] : ["eggs", "fish", "chicken", "dairy"],
      note: plant ? "Common shortfall on plant-based diets; test serum B12." : "Usually adequate with animal foods." },
    { name: "Vitamin D", target: "600 IU/day", sources: ["15-20 min midday sun", "fortified milk", "egg yolk", "supplement if deficient"], note: "Widely low in India; confirm with a blood test before supplementing." },
    { name: "Iron", target: f ? "~29 mg/day" : "~19 mg/day", sources: plant ? ["rajma", "chana", "dal", "spinach + lemon", "jaggery"] : ["chicken", "fish", "eggs", "dal"], note: "Pair with vitamin C; avoid tea with meals." },
    { name: "Zinc", target: f ? "~13 mg/day" : "~17 mg/day", sources: plant ? ["pumpkin seeds", "chickpeas", "cashews", "whole grains"] : ["chicken", "eggs", "dairy", "pulses"], note: "Soaking/sprouting pulses improves absorption." },
  ];
}

// ---- Indian meals: 3 options per slot per diet, rotated across the week ----------------------
const MEAL_BANK = {
  veg: [
    ["Paneer bhurji + 2 roti", "Besan chilla + curd", "Moong dal cheela + mint chutney"],
    ["Dal, rice, sabzi, curd", "Rajma + jeera rice + salad", "Chole + 2 roti + cucumber raita"],
    ["Roasted chana + milk", "Sprouts chaat", "Peanut chikki + banana"],
    ["Soya chunks curry + roti + salad", "Paneer tikka + roti + sabzi", "Palak dal + 2 roti + curd"],
  ],
  egg: [
    ["3-egg bhurji + 2 roti", "Egg omelette + paratha (light ghee)", "Boiled eggs + poha"],
    ["Dal, rice, sabzi, curd", "Egg curry + rice + salad", "Rajma + rice + curd"],
    ["Boiled eggs + fruit", "Sprouts + boiled egg", "Roasted chana + milk"],
    ["Egg curry + roti + salad", "Soya chunks curry + roti", "Paneer bhurji + roti + sabzi"],
  ],
  nonveg: [
    ["3-egg omelette + 2 roti", "Egg bhurji + toast", "Chicken keema paratha (light) + curd"],
    ["Chicken curry, rice, dal", "Fish curry + rice + sabzi", "Chicken biryani (small) + raita + salad"],
    ["Boiled eggs + banana", "Chicken tikka (4 pcs) + chutney", "Roasted chana + milk"],
    ["Grilled fish/chicken + sabzi + roti", "Egg curry + roti + salad", "Chicken stew + 2 roti"],
  ],
  vegan: [
    ["Tofu scramble + 2 roti", "Besan chilla + mint chutney", "Poha with peanuts + soy milk"],
    ["Rajma/chole, rice, sabzi", "Dal tadka + rice + salad", "Soya pulao + salad"],
    ["Sprouts + peanut chikki", "Roasted chana + fruit", "Hummus + carrot sticks + roti"],
    ["Soya chunks curry + roti + salad", "Tofu bhurji + roti + sabzi", "Chana masala + 2 roti"],
  ],
};
const SLOTS = [["Breakfast", 0.25], ["Lunch", 0.35], ["Snacks", 0.15], ["Dinner", 0.25]];

export function buildMeals(diet, kcal, dayIndex = 0) {
  const bank = MEAL_BANK[diet] || MEAL_BANK.veg;
  return SLOTS.map(([meal, share], i) => ({ meal, food: bank[i][(dayIndex + i) % 3], kcal: Math.round(kcal * share) }));
}

// ---- workouts ----------------------------------------------------------------------------------
const DAYS = {
  FULL_A: ["Full Body A", ["Squat", "Bench Press", "Row", "Plank"]],
  FULL_B: ["Full Body B", ["Deadlift", "Shoulder Press", "Lat Pulldown", "Lunge"]],
  FULL_C: ["Full Body C", ["Leg Press", "Incline Press", "Row", "Bicep Curl"]],
  UPPER: ["Upper Body", ["Bench Press", "Row", "Shoulder Press", "Pull-ups", "Bicep Curl"]],
  LOWER: ["Lower Body", ["Squat", "Romanian Deadlift", "Leg Press", "Leg Curl", "Calf Raise"]],
  PUSH: ["Push", ["Bench Press", "Shoulder Press", "Incline Press", "Lateral Raise", "Triceps Pushdown"]],
  PULL: ["Pull", ["Deadlift", "Pull-ups", "Row", "Face Pull", "Bicep Curl"]],
  LEGS: ["Legs", ["Squat", "Lunge", "Leg Press", "Romanian Deadlift", "Calf Raise"]],
};
const SPLITS = { beginner: ["FULL_A", "FULL_B", "FULL_C"], intermediate: ["UPPER", "LOWER", "UPPER", "LOWER"], advanced: ["PUSH", "PULL", "LEGS", "UPPER", "LOWER"] };
const ENDURANCE = {
  beginner: [["Easy Run 25 min (Zone 2)", ["Run"]], ["Circuit 3 rounds", ["Circuit"]], ["Cycle 35 min easy", ["Cycle"]]],
  intermediate: [["Easy Run 40 min (Zone 2)", ["Run"]], ["Circuit 4 rounds", ["Circuit"]], ["Tempo Run 25 min", ["Run"]], ["Cycle/Row 45 min", ["Cycle"]]],
  advanced: [["Long Run 60 min", ["Run"]], ["Intervals 6 x 3 min", ["HIIT"]], ["Tempo Run 35 min", ["Run"]], ["Cycle 60 min", ["Cycle"]], ["Row Erg 40 min", ["Row Erg"]]],
};
const FATLOSS = {
  beginner: [["Full Body A", ["Squat", "Bench Press", "Row", "Plank"]], ["Brisk Walk 40 min", ["Brisk Walk"]], ["Full Body B", ["Deadlift", "Shoulder Press", "Lat Pulldown", "Lunge"]]],
  intermediate: [["Full Body A", ["Squat", "Bench Press", "Row", "Plank"]], ["HIIT 20 min + core", ["HIIT", "Plank"]], ["Full Body B", ["Deadlift", "Shoulder Press", "Lat Pulldown", "Lunge"]], ["Brisk Walk 45 min", ["Brisk Walk"]]],
  advanced: [["Upper Body", DAYS.UPPER[1]], ["HIIT 20 min + core", ["HIIT", "Plank"]], ["Lower Body", DAYS.LOWER[1]], ["Brisk Walk 45 min", ["Brisk Walk"]], ["Circuit 4 rounds", ["Circuit"]]],
};
const CARDIO = new Set(["Run", "Cycle", "Row Erg", "Brisk Walk", "HIIT", "Circuit"]);

function prescription(name, goal, level, isFirst) {
  if (CARDIO.has(name)) return { sets: 1, reps: name === "HIIT" ? "20 min" : "as planned", rest: "-" };
  if (name === "Plank") return { sets: 3, reps: "30-60 s", rest: "45 s" };
  const sets = level === "beginner" ? 3 : level === "intermediate" ? (isFirst ? 4 : 3) : isFirst ? 5 : 4;
  if (goal === "strength") return isFirst ? { sets: level === "beginner" ? 3 : 5, reps: "5", rest: "3 min" } : { sets: 3, reps: "6-8", rest: "2 min" };
  if (goal === "fatloss") return { sets: 3, reps: "12-15", rest: "60 s" };
  return { sets, reps: isFirst ? "6-10" : "8-12", rest: isFirst ? "2 min" : "90 s" };            // hypertrophy default
}

export function buildWorkouts({ goal, experience = "beginner" }) {
  const level = SPLITS[experience] ? experience : "beginner";
  let days;
  if (goal === "endurance") days = ENDURANCE[level];
  else if (goal === "fatloss") days = FATLOSS[level];
  else days = SPLITS[level].map(k => DAYS[k]);
  return days.map(([focus, names], i) => ({
    day: `Day ${i + 1}`, focus,
    exercises: names.map((name, j) => ({ name, ...prescription(name, goal, level, j === 0) })),
  }));
}

// ---- assemble ----------------------------------------------------------------------------------
export function generatePlan(p) {
  const profile = { age: +p.age, height: +p.height, weight: +p.weight, gender: p.gender, goal: p.fitnessGoal || p.goal || "hypertrophy",
    diet: p.dietType || p.diet || "veg", activity: p.activityLevel || p.activity || "moderate", experience: p.experience || "beginner" };
  const bmr = bmrMifflin(profile), tdee = tdeeFrom(bmr, profile.activity), targets = macroTargets(profile, tdee);
  const weeklyMeals = Object.fromEntries(Array.from({ length: 7 }, (_, d) => [`Day ${d + 1}`, buildMeals(profile.diet, targets.kcal, d)]));
  return { profileSnapshot: profile, bmr: Math.round(bmr), tdee: Math.round(tdee), targets, micronutrients: micronutrientPlan(profile),
    meals: weeklyMeals["Day 1"], weeklyMeals, workouts: buildWorkouts(profile), generator: "template" };
}

// ---- optional generative personalisation -------------------------------------------------------
export async function personalizeWithLLM(plan, extra = {}) {
  const key = process.env.ANTHROPIC_API_KEY; if (!key) return plan;
  try {
    const prompt = `You are a sports-nutrition assistant for Indian users. Profile: ${JSON.stringify(plan.profileSnapshot)}. Calorie target ${plan.targets.kcal} kcal, protein ${plan.targets.protein} g. ` +
      `Notes from user: ${extra.notes || "none"}. Reply with ONLY JSON: {"meals":[{"meal":"Breakfast","food":"..."},{"meal":"Lunch","food":"..."},{"meal":"Snacks","food":"..."},{"meal":"Dinner","food":"..."}],"coachNote":"<=60 words"}. ` +
      `Use common Indian foods strictly matching the diet type (${plan.profileSnapshot.diet}).`;
    const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5", max_tokens: 600, messages: [{ role: "user", content: prompt }] }),
      signal: AbortSignal.timeout(15000) });
    if (!r.ok) return plan;
    const text = (await r.json()).content?.map(c => c.text || "").join("") || "";
    const j = JSON.parse(text.replace(/```json|```/g, "").trim());
    const slots = SLOTS.map(s => s[0]);
    if (!Array.isArray(j.meals) || j.meals.length !== 4 || !j.meals.every((m, i) => m.meal === slots[i] && typeof m.food === "string" && m.food.length < 140)) return plan;
    const meals = j.meals.map((m, i) => ({ meal: m.meal, food: m.food, kcal: plan.meals[i].kcal }));
    return { ...plan, meals, weeklyMeals: { ...plan.weeklyMeals, "Day 1": meals }, coachNote: typeof j.coachNote === "string" ? j.coachNote.slice(0, 400) : undefined, generator: "template+llm" };
  } catch { return plan; }
}
