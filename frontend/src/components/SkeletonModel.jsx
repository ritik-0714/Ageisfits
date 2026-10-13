import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, extend, useLoader, useThree, useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as THREE from "three";
import { REGION_LABEL, JOINT_KEYS, BONE_KEYS } from "../lib/anatomy.js";
import { sevColor } from "../lib/constants.js";

extend({ OrbitControls });
const VIEWS = { front: [0, 0.2, 15], back: [0, 0.2, -15], left: [15, 0.2, 0], right: [-15, 0.2, 0], reset: [0, 0.2, 15] };   // model's left side is +x
const BONE = new THREE.Color("#a9bdd3"), MUSCLE = new THREE.Color("#c2524a"), GLASS = ["chest", "lumbar", "head"];
const kindOf = n => (n.startsWith("muscle_") ? "muscles" : JOINT_KEYS.includes(n) ? "joints" : BONE_KEYS.includes(n) || n.startsWith("bone_") ? "skeleton" : null);

function Rig({ view }) {
  const { camera, gl } = useThree(), ref = useRef();
  useFrame(() => ref.current?.update());
  useEffect(() => { const p = VIEWS[view.name] || VIEWS.front; camera.position.set(...p); ref.current?.target.set(0, 0, 0); ref.current?.update(); }, [view, camera]);
  return <orbitControls ref={ref} args={[camera, gl.domElement]} enablePan={false} minDistance={8} maxDistance={24} />;
}

// skeleton.glb: every region mesh is named after its anatomy key (knee_l, femur_r ...). R3F raycasts the pointer through the
// scene graph, so e.object is the mesh under the cursor.
function Body({ layers, selected, severities, onPick, onHover, debug }) {
  const gltf = useLoader(GLTFLoader, "/models/skeleton.glb");
  const scene = useMemo(() => {
    const s = gltf.scene.clone(true);
    s.traverse(o => { if (!o.isMesh) return;
      const muscle = o.name.startsWith("muscle_"), glass = GLASS.includes(o.name);
      o.material = new THREE.MeshStandardMaterial({ color: muscle ? MUSCLE : BONE, roughness: muscle ? 0.8 : 0.35, metalness: muscle ? 0 : 0.25, transparent: muscle || glass, opacity: muscle ? 0.3 : glass ? 0.6 : 1, depthWrite: !(muscle || glass) });
    });
    return s;
  }, [gltf]);

  useEffect(() => {
    scene.traverse(o => {
      if (!o.isMesh) return;
      const kind = kindOf(o.name); o.visible = kind ? !!layers[kind] : true;
      if (o.name.startsWith("muscle_")) { o.raycast = () => {}; return; }          // muscles are visual only
      const sev = layers.pain ? severities[o.name] || 0 : 0, sel = o.name === selected;
      o.material.color.set(sev ? sevColor(sev) : BONE);
      o.material.emissive.set(sel ? "#34d399" : "#000000"); o.material.emissiveIntensity = sel ? 0.55 : 0;
      o.material.wireframe = debug; o.scale.setScalar(sel ? 1.12 : 1);
    });
  }, [scene, layers, selected, severities, debug]);

  return (
    <primitive object={scene}
      onClick={e => { const n = e.object.name; if (REGION_LABEL[n]) { e.stopPropagation(); onPick(n); } }}
      onPointerOver={e => { const n = e.object.name; if (REGION_LABEL[n]) { e.stopPropagation(); document.body.style.cursor = "pointer"; onHover(n); } }}
      onPointerOut={() => { document.body.style.cursor = "auto"; onHover(null); }} />
  );
}

export default function SkeletonModel({ layers, selected, severities, onPick, view, debug, hover, onHover }) {
  return (
    <div className="relative h-[470px] w-full md:h-[560px]">
      <Canvas camera={{ position: VIEWS.front, fov: 40 }} dpr={[1, 2]} gl={{ antialias: true }}>
        <ambientLight intensity={1.2} /><directionalLight position={[5, 8, 8]} intensity={2.2} /><directionalLight position={[-6, -2, -6]} intensity={0.8} />
        {debug && <axesHelper args={[4]} />}
        <Suspense fallback={null}><Body layers={layers} selected={selected} severities={severities} onPick={onPick} onHover={onHover} debug={debug} /></Suspense>
        <Rig view={view} />
      </Canvas>
      <div className="pointer-events-none absolute bottom-2 left-3 font-mono text-[10.5px] text-mute">
        {hover ? `${REGION_LABEL[hover]}${debug ? `  [mesh: ${hover}]` : ""}` : "Drag to rotate · scroll to zoom · click a structure"}
      </div>
    </div>
  );
}
