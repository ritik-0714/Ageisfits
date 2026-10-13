// Canonical anatomy used by the 3D mapper: ids, breadcrumb hierarchy and search aliases for every clickable mesh.
const side = k => (k.endsWith("_l") ? "Left" : "Right");
const A = (crumbs, aliases = []) => ({ crumbs, aliases });
export const ANATOMY = {
  head: A(["Upper Body", "Head & Neck", "Head", "Cranial", "Skull"], ["skull", "cranium", "neck"]),
  chest: A(["Upper Body", "Torso", "Chest", "Anterior", "Thoracic Cage"], ["ribs", "sternum", "thorax", "pec"]),
  lumbar: A(["Core", "Spine", "Lumbar Spine", "Posterior", "L1-L5 Vertebrae"], ["lower back", "spine", "back"]),
  ...Object.fromEntries(["l", "r"].flatMap(s => {
    const S = s === "l" ? "Left" : "Right";
    return [
      [`sh_${s}`, A(["Upper Body", "Shoulder", `${S} Shoulder`, "Lateral", "Glenohumeral Joint"], ["shoulder", "deltoid", "rotator cuff"])],
      [`humerus_${s}`, A(["Upper Body", "Arm", `${S} Humerus`, "Lateral", "Humeral Shaft"], ["upper arm", "bicep", "tricep"])],
      [`el_${s}`, A(["Upper Body", "Arm", `${S} Elbow`, "Anterior", "Cubital Fossa"], ["elbow", "tennis elbow"])],
      [`wr_${s}`, A(["Upper Body", "Hand", `${S} Wrist`, "Anterior", "Carpal Region"], ["wrist", "hand", "carpal"])],
      [`hip_${s}`, A(["Lower Body", "Hip", `${S} Hip`, "Lateral", "Acetabulofemoral Joint"], ["hip", "groin", "glute"])],
      [`femur_${s}`, A(["Lower Body", "Thigh", `${S} Femur`, "Anterior", "Femoral Shaft"], ["thigh", "quad", "hamstring"])],
      [`knee_${s}`, A(["Lower Body", "Knee", `${S} Knee`, "Anterior", "Patellar Region"], ["knee", "patella", "kneecap", "acl", "meniscus"])],
      [`tibia_${s}`, A(["Lower Body", "Leg", `${S} Tibia`, "Anterior", "Tibial Shaft"], ["shin", "calf", "lower leg"])],
      [`ank_${s}`, A(["Lower Body", "Ankle", `${S} Ankle`, "Lateral", "Talocrural Joint"], ["ankle", "foot", "achilles"])],
    ];
  })),
};
export const REGION_LABEL = Object.fromEntries(Object.entries(ANATOMY).map(([k, v]) => [k, v.crumbs[2]]));
export const canonicalId = key => { const l = REGION_LABEL[key] || key; return l.toLowerCase().replace(/\s+/g, "_").replace("lumbar_spine", "lumbar"); };
export const JOINT_KEYS = ["sh", "el", "wr", "hip", "knee", "ank"].flatMap(j => [`${j}_l`, `${j}_r`]);
export const BONE_KEYS = ["head", "chest", "lumbar", ...["femur", "tibia", "humerus"].flatMap(b => [`${b}_l`, `${b}_r`])];
export function searchRegions(q) {
  const t = q.toLowerCase().trim().replace(/_/g, " "); if (!t) return [];
  return Object.entries(ANATOMY).filter(([k, v]) => `${REGION_LABEL[k]} ${k.replace(/_/g, " ")} ${canonicalId(k).replace(/_/g, " ")} ${v.aliases.join(" ")}`.toLowerCase().includes(t)).map(([k]) => k).slice(0, 8);
}
