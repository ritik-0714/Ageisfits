import { useCallback, useEffect, useRef, useState } from "react";

// Assets are served locally first (public/mediapipe, public/models) so the camera works offline and never depends on a CDN.
const WASM_SOURCES = ["/mediapipe/wasm", "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"];
const MODEL_SOURCES = [
  "/models/pose_landmarker_full.task",
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
];
const pick = p => p.map(({ x, y, z, visibility }) => ({ x, y, z, visibility }));

export function cameraErrorMessage(e) {
  switch (e?.name) {
    case "NotAllowedError": case "PermissionDeniedError": return "Camera permission was blocked. Click the camera icon in the address bar, choose Allow, then press Start again.";
    case "NotFoundError": case "DevicesNotFoundError": return "No camera was found. Plug in a webcam or check that it is enabled in Windows privacy settings.";
    case "NotReadableError": case "TrackStartError": return "The camera is being used by another app (Zoom, Teams, another tab). Close it and try again.";
    case "OverconstrainedError": return "This camera does not support the requested resolution. Retrying with defaults…";
    case "SecurityError": return "The browser blocked camera access. Open the app on http://localhost (or https).";
    default: return e?.message || "Unknown camera error.";
  }
}

async function openCamera() {
  if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error("This browser has no camera API. Use Chrome or Edge on http://localhost."), { name: "SecurityError" });
  try { return await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 }, facingMode: "user" }, audio: false }); }
  catch (e) { if (e.name === "OverconstrainedError") return navigator.mediaDevices.getUserMedia({ video: true, audio: false }); throw e; }
}

// Main thread: camera + MediaPipe inference + drawing. Worker thread: angles, rep FSM, metrics, fatigue.
export function useVisionTrainer({ videoRef, canvasRef, exerciseIndex }) {
  const [status, setStatus] = useState("idle");          // idle | loading | running | error
  const [message, setMessage] = useState("Camera is off.");
  const [result, setResult] = useState(null);
  const [diag, setDiag] = useState("");
  const refs = useRef({ worker: null, lm: null, stream: null, raf: 0, last: -1, okColor: "#34d399", lastUi: 0, utils: null, mp: null, summaryResolve: null, running: false, exercise: exerciseIndex, fails: 0 });
  refs.current.exercise = exerciseIndex;

  const stop = useCallback(() => {
    const r = refs.current; r.running = false; cancelAnimationFrame(r.raf);
    r.stream?.getTracks().forEach(t => t.stop()); r.stream = null;
    try { r.lm?.close?.(); } catch { /* already closed */ } r.lm = null; r.utils = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus(s => (s === "error" ? s : "idle")); setMessage(m => (m.startsWith("Error") || m.startsWith("Camera permission") ? m : "Camera is off."));
  }, [videoRef]);

  useEffect(() => {                                  // one worker for the lifetime of the page
    const w = new Worker(new URL("./analyzer.worker.js", import.meta.url), { type: "module" });
    w.onerror = e => { setDiag(`Analysis worker error: ${e.message}`); };
    w.onmessage = ({ data }) => {
      if (data.type === "summary") { refs.current.summaryResolve?.(data); return; }
      refs.current.okColor = data.noBody || data.lowVis ? "#64748b" : data.ok === false ? "#f43f5e" : "#34d399";
      const now = performance.now();
      if (now - refs.current.lastUi > 90 || data.repDone || data.ready) { refs.current.lastUi = now; setResult(data); }
      if (refs.current.running) setMessage(data.lowVis ? "Low visibility on tracked joints - face the camera and clear the frame." : data.noBody ? "No body detected - step back so your upper body and arms are in frame." : "Tracking…");
    };
    w.postMessage({ type: "init", exercise: refs.current.exercise });
    refs.current.worker = w;
    return () => { w.terminate(); refs.current.worker = null; stop(); };
  }, [stop]);

  useEffect(() => { refs.current.worker?.postMessage({ type: "init", exercise: exerciseIndex }); setResult(null); }, [exerciseIndex]);   // switching exercise is allowed at any time, even with the camera on

  const loop = useCallback(() => {
    const r = refs.current; if (!r.running) return;
    const v = videoRef.current, c = canvasRef.current;
    if (v && c && r.lm && v.readyState >= 2 && v.currentTime !== r.last) {
      r.last = v.currentTime;
      try {
        const ctx = c.getContext("2d"); ctx.clearRect(0, 0, c.width, c.height);
        const res = r.lm.detectForVideo(v, performance.now()), p = res.landmarks?.[0];
        if (p) {
          r.worker?.postMessage({ type: "frame", lm: pick(p), wl: res.worldLandmarks?.[0] ? pick(res.worldLandmarks[0]) : null, t: performance.now() });
          const du = r.utils || (r.utils = new r.mp.DrawingUtils(ctx));
          du.drawConnectors(p, r.mp.PoseLandmarker.POSE_CONNECTIONS, { color: r.okColor, lineWidth: 4 }); du.drawLandmarks(p, { color: "#ffffff", radius: 3 });
        } else r.worker?.postMessage({ type: "noBody" });
        r.fails = 0;
      } catch (e) { if (++r.fails > 30) { stop(); setStatus("error"); setMessage(`Error: pose detection stopped - ${e.message}`); return; } }
    }
    r.raf = requestAnimationFrame(loop);
  }, [videoRef, canvasRef, stop]);

  const start = useCallback(async () => {
    const r = refs.current; if (r.running) return;
    setStatus("loading"); setDiag(""); setResult(null);
    try {
      setMessage("Step 1/3 · Loading pose engine…");
      r.mp = await import("@mediapipe/tasks-vision");
      const { PoseLandmarker, FilesetResolver } = r.mp;
      let fileset, wasmUsed = "";
      for (const base of WASM_SOURCES) { try { fileset = await FilesetResolver.forVisionTasks(base); wasmUsed = base; break; } catch { /* try next source */ } }
      if (!fileset) throw new Error("Could not load the MediaPipe runtime (public/mediapipe/wasm missing and the CDN is unreachable).");

      setMessage("Step 2/3 · Loading pose model…");
      let used = "";
      outer: for (const model of MODEL_SOURCES) for (const delegate of ["GPU", "CPU"]) {
        try { r.lm = await PoseLandmarker.createFromOptions(fileset, { baseOptions: { modelAssetPath: model, delegate }, runningMode: "VIDEO", numPoses: 1, minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5 }); used = `${model.startsWith("/") ? "local" : "CDN"} model · ${delegate}`; break outer; } catch { /* next combination */ }
      }
      if (!r.lm) throw new Error("Could not load the pose model. Check that frontend/public/models/pose_landmarker_full.task exists, or connect to the internet.");

      setMessage("Step 3/3 · Starting camera…");
      r.stream = await openCamera();
      const v = videoRef.current; v.srcObject = r.stream; await v.play();
      canvasRef.current.width = v.videoWidth || 640; canvasRef.current.height = v.videoHeight || 480; r.utils = null; r.last = -1; r.fails = 0;
      r.worker?.postMessage({ type: "init", exercise: r.exercise });
      r.running = true; setStatus("running"); setMessage("Tracking…"); setDiag(`${used} · runtime ${wasmUsed.startsWith("/") ? "local" : "CDN"} · ${v.videoWidth}×${v.videoHeight}`); loop();
    } catch (e) {
      stop(); setStatus("error"); setMessage(`Error: ${cameraErrorMessage(e)}`);
    }
  }, [loop, stop, videoRef, canvasRef]);

  const summary = useCallback(() => new Promise(res => { const w = refs.current.worker; if (!w) return res(null); refs.current.summaryResolve = res; w.postMessage({ type: "summary" }); }), []);
  const reset = useCallback(() => { refs.current.worker?.postMessage({ type: "init", exercise: refs.current.exercise }); setResult(null); }, []);
  return { status, message, result, diag, start, stop, summary, reset };
}
