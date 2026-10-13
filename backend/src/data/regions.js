// Anatomical regions. Keys equal the mesh names inside frontend/public/models/skeleton.glb.
export const REGIONS = {
  head: { label: "Head", group: "Upper Body" }, chest: { label: "Chest", group: "Upper Body" }, lumbar: { label: "Lumbar Spine", group: "Core" },
  sh_l: { label: "Left Shoulder", group: "Upper Body" }, sh_r: { label: "Right Shoulder", group: "Upper Body" },
  humerus_l: { label: "Left Humerus", group: "Upper Body" }, humerus_r: { label: "Right Humerus", group: "Upper Body" },
  el_l: { label: "Left Elbow", group: "Upper Body" }, el_r: { label: "Right Elbow", group: "Upper Body" },
  wr_l: { label: "Left Wrist", group: "Upper Body" }, wr_r: { label: "Right Wrist", group: "Upper Body" },
  hip_l: { label: "Left Hip", group: "Lower Body" }, hip_r: { label: "Right Hip", group: "Lower Body" },
  femur_l: { label: "Left Femur", group: "Lower Body" }, femur_r: { label: "Right Femur", group: "Lower Body" },
  knee_l: { label: "Left Knee", group: "Lower Body" }, knee_r: { label: "Right Knee", group: "Lower Body" },
  tibia_l: { label: "Left Tibia", group: "Lower Body" }, tibia_r: { label: "Right Tibia", group: "Lower Body" },
  ank_l: { label: "Left Ankle", group: "Lower Body" }, ank_r: { label: "Right Ankle", group: "Lower Body" },
};
export const REGION_KEYS = Object.keys(REGIONS);
export const DISCOMFORT_STATUS = ["new", "worsening", "improving", "unchanged", "resolved"];

// A reported region also loads its neighbours: a sore knee is a femur/tibia problem for exercise-selection purposes.
const link = (m, a, b) => { (m[a] ||= []).push(b); (m[b] ||= []).push(a); };
export const ADJACENT = (() => {
  const m = {};
  for (const s of ["l", "r"]) {
    link(m, `knee_${s}`, `femur_${s}`); link(m, `knee_${s}`, `tibia_${s}`); link(m, `hip_${s}`, `femur_${s}`);
    link(m, `ank_${s}`, `tibia_${s}`); link(m, `sh_${s}`, `humerus_${s}`); link(m, `el_${s}`, `humerus_${s}`);
  }
  return m;
})();
