// Exercise -> anatomical regions it loads. `primary` = main working/loaded structures, `secondary` = stabilisers (counted one
// severity point lower). `alternatives` = lower-impact swaps. Used by the Discomfort Engine and the impact-analysis panel.
const both = (...names) => names.flatMap(n => [`${n}_l`, `${n}_r`]);
const mk = (primary, secondary, alternatives) => ({ primary, secondary, alternatives, regions: [...primary, ...secondary] });
export const EXERCISE_MAP = {
  "Squat": mk([...both("knee", "femur", "hip")], [...both("ank", "tibia"), "lumbar"], ["Glute Bridge", "Leg Curl", "Wall Sit"]),
  "Lunge": mk([...both("knee", "femur", "hip")], [...both("ank", "tibia"), "lumbar"], ["Glute Bridge", "Leg Curl", "Step-up (low)"]),
  "Leg Press": mk([...both("knee", "femur", "hip")], [...both("ank", "tibia")], ["Leg Curl", "Glute Bridge"]),
  "Romanian Deadlift": mk(["lumbar", ...both("hip", "femur")], [...both("knee", "wr")], ["Glute Bridge", "Back Extension (bodyweight)"]),
  "Deadlift": mk(["lumbar", ...both("hip", "femur")], [...both("knee", "wr", "sh")], ["Glute Bridge", "Cable Pull-through"]),
  "Calf Raise": mk([...both("ank", "tibia")], [...both("knee")], ["Seated Calf Raise", "Ankle Mobility Drills"]),
  "Leg Curl": mk([...both("knee")], [...both("femur", "hip")], ["Glute Bridge"]),
  "Glute Bridge": mk([...both("hip")], ["lumbar"], ["Clamshell"]),
  "Bench Press": mk(["chest", ...both("sh", "el")], [...both("wr", "humerus")], ["Machine Chest Press", "Cable Fly"]),
  "Incline Press": mk(["chest", ...both("sh", "el")], [...both("wr", "humerus")], ["Machine Chest Press", "Cable Fly"]),
  "Push-up": mk(["chest", ...both("sh", "el", "wr")], [...both("humerus"), "lumbar"], ["Incline Push-up", "Cable Fly"]),
  "Shoulder Press": mk([...both("sh", "el")], [...both("wr", "humerus"), "lumbar"], ["Landmine Press", "Lateral Raise (light)"]),
  "Lateral Raise": mk([...both("sh")], [...both("humerus")], ["Cable Lateral Raise (light)"]),
  "Row": mk(["lumbar", ...both("sh")], [...both("el", "humerus", "wr")], ["Chest-supported Row", "Lat Pulldown"]),
  "Pull-ups": mk([...both("sh", "el")], [...both("wr", "humerus")], ["Lat Pulldown", "Assisted Pull-up"]),
  "Lat Pulldown": mk([...both("sh", "el")], [...both("humerus")], ["Straight-arm Pulldown"]),
  "Bicep Curl": mk([...both("el", "humerus")], [...both("wr")], ["Hammer Curl (light)", "Isometric Curl Hold"]),
  "Triceps Pushdown": mk([...both("el")], [...both("wr", "humerus")], ["Close-grip Push-up (incline)"]),
  "Face Pull": mk([...both("sh")], [...both("humerus")], ["Band Pull-apart (light)"]),
  "Plank": mk(["lumbar", ...both("sh", "wr")], ["chest", ...both("el")], ["Dead Bug", "Bird Dog"]),
  "Jumping Jack": mk([...both("knee", "ank")], [...both("hip", "sh", "tibia")], ["Marching in Place", "Seated Arm Raises"]),
  "Run": mk([...both("knee", "ank", "tibia")], [...both("hip", "femur")], ["Cycling", "Swimming", "Brisk Walk"]),
  "HIIT": mk([...both("knee", "ank")], [...both("hip", "sh", "femur", "tibia")], ["Cycling Intervals", "Rowing Intervals"]),
  "Cycle": mk([...both("knee", "hip")], [...both("femur", "ank")], ["Swimming", "Upper-body Ergometer"]),
  "Row Erg": mk(["lumbar", ...both("knee")], [...both("sh", "hip")], ["Cycling", "Brisk Walk"]),
  "Brisk Walk": mk([...both("ank")], [...both("knee", "tibia")], ["Seated Cardio", "Swimming"]),
  "Circuit": mk([...both("knee", "sh")], ["lumbar", ...both("hip")], ["Upper-body Circuit (seated)", "Cycling"]),
};
// AI Vision Trainer exercises (8, as shown in the report's Fig 4.7) -> keys in EXERCISE_MAP
export const VISION_EXERCISES = ["Squat", "Push-up", "Bicep Curl", "Plank", "Lunge", "Shoulder Press", "Deadlift", "Jumping Jack"];
