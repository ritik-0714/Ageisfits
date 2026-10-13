// The 8 exercises shown in the report's AI Form Check screen (Fig 4.7). Landmark indices follow MediaPipe Pose (33 landmarks);
// the right side is always index + 1.
//  joints : [A, B, C] with B the vertex of the measured angle (left-side indices)
//  mode   : "down" = rep when the angle dips below `threshold`; "up" = rep when it rises above; "hold" = isometric (plank)
//  rom    : [rest angle, peak angle] used to turn the measured range into a 0-100 ROM score
//  tempo  : acceptable seconds per rep
//  align  : which alignment rule applies (see analyzerCore.alignmentScore)
export const EXERCISES = [
  { name: "Squat", setup: "Stand side-on or front-on about 2 m from the camera with hips, knees and ankles in frame.", hint: "Knee Depth (<100°)", joints: [23, 25, 27], mode: "down", threshold: 100, rom: [170, 90], tempo: [1.5, 5], align: "torso", cue: "Keep chest upright, hips below knee level." },
  { name: "Push-up", setup: "Place the camera to your side at floor height so shoulder, elbow and wrist are visible.", hint: "Elbow Flexion (<90°)", joints: [11, 13, 15], mode: "down", threshold: 90, rom: [165, 80], tempo: [1.2, 4], align: "bodyline", cue: "Keep your body in one straight line." },
  { name: "Bicep Curl", setup: "Stand 1.5-2 m back with both arms and shoulders in frame. Either arm is tracked.", hint: "Full Flexion (<55°)", joints: [11, 13, 15], mode: "down", threshold: 55, rom: [160, 45], tempo: [1.5, 5], align: "elbowPin", cue: "Pin your elbows to your sides, curl to full flexion." },
  { name: "Plank", setup: "Camera to your side, whole body visible from shoulder to ankle.", hint: "Spine Line (165°-185°)", joints: [11, 23, 27], mode: "hold", threshold: 165, rom: [180, 165], tempo: [0, 0], align: "bodyline", cue: "Squeeze glutes, keep a straight spine line." },
  { name: "Lunge", setup: "Stand side-on about 2 m away with hips, knees and ankles in frame.", hint: "Lead Knee (<105°)", joints: [23, 25, 27], mode: "down", threshold: 105, rom: [170, 95], tempo: [1.5, 5], align: "torso", cue: "Lead knee over toes, torso upright." },
  { name: "Shoulder Press", setup: "Stand 1.5-2 m back facing the camera with both arms fully in frame, even overhead.", hint: "Lockout (>155°)", joints: [11, 13, 15], mode: "up", threshold: 155, rom: [85, 170], tempo: [1.2, 4], align: "torsoStrict", cue: "Press to full lockout without leaning back." },
  { name: "Deadlift", setup: "Stand side-on about 2 m away with shoulders, hips and knees in frame.", hint: "Hip Lockout (>160°)", joints: [11, 23, 25], mode: "up", threshold: 160, rom: [100, 172], tempo: [1.5, 6], align: "symmetry", cue: "Hinge at the hips, lock out tall at the top." },
  { name: "Jumping Jack", setup: "Stand 2-3 m back facing the camera with both arms and hands in frame.", hint: "Arm Abduction (>140°)", joints: [23, 11, 13], mode: "up", threshold: 140, rom: [25, 165], tempo: [0.5, 2.5], align: "symmetry", bilateral: true, cue: "Full arm range each rep, land softly." },
];
// Movement-quality weights shown in the UI (ROM 25%, Alignment 25%, Stability 20%, Tempo 15%) + Consistency 15%.
export const WEIGHTS = { rom: 0.25, alignment: 0.25, stability: 0.2, tempo: 0.15, consistency: 0.15 };

// Rep detection is deliberately forgiving: a rep is COUNTED when the joint gets within COUNT_TOLERANCE degrees of the target,
// and the range-of-motion score then tells you how complete it was (shallow reps are flagged "Partial rep").
export const COUNT_TOLERANCE = 20;
export const countThreshold = e => (e.mode === "down" ? e.threshold + COUNT_TOLERANCE : e.mode === "up" ? e.threshold - COUNT_TOLERANCE : e.threshold);