import { useRef, useState } from "react";
import { Camera, Square, Save, RotateCcw } from "lucide-react";
import { EXERCISES, WEIGHTS, countThreshold } from "../biomechanics/exercises.js";
import { useVisionTrainer } from "../biomechanics/useVisionTrainer.js";
import { api, errMsg } from "../lib/api.js";
import { Hero } from "../components/ui.jsx";

const grade = c => (c == null ? "Not enough data" : c >= 85 ? `${c}% · Excellent` : c >= 70 ? `${c}% · Good` : c >= 50 ? `${c}% · Needs work` : `${c}% · Poor form`);
const Metric = ({ label, w, v }) => <div className="tile flex items-center justify-between px-3 py-2.5 text-xs text-mute"><span>{label} ({Math.round(w * 100)}%):</span><b className="font-mono text-paper">{v == null ? "–" : `${v}%`}</b></div>;

export default function FormCheck() {
  const [ex, setEx] = useState(0), [rpe, setRpe] = useState(6), [note, setNote] = useState(null);
  const video = useRef(null), canvas = useRef(null);
  const { status, message, result, diag, start, stop, summary, reset } = useVisionTrainer({ videoRef: video, canvasRef: canvas, exerciseIndex: ex });
  const e = EXERCISES[ex], hold = e.mode === "hold", live = result?.live || {}, running = status === "running";
  const phase = result?.phase ?? "READY";
  const tracking = running && !result?.noBody && !result?.lowVis;
  const pose = status === "loading" ? "Loading pose engine…" : !running ? "Camera idle - press Start Camera." : result?.noBody ? "No body detected." : result?.lowVis ? "Low pose confidence." : "Optimal pose confidence.";
  const headline = status === "error" ? message : !running ? "Get in frame & start exercise" : result?.noBody || result?.lowVis ? message : result?.ok === false ? "Form deviation detected" : result?.fatigue?.detected ? "Fatigue detected" : "Tracking - keep going";

  const save = async () => {
    setNote(null);
    try { const s = await summary(); if (!s || (!s.reps && !s.holdSeconds)) throw new Error("Complete at least one rep (or a plank hold) before saving."); await api.post("/vision", { ...s, rpe }); setNote({ ok: true, text: `Saved ${hold ? `${s.holdSeconds}s hold` : `${s.reps} reps`} to your workload.` }); stop(); reset(); }
    catch (x) { setNote({ ok: false, text: errMsg(x) }); }
  };

  return (
    <>
      <Hero pill="AI Form Checker" title="Live Form, Movement Quality & Fatigue Engine" sub="Real-time MediaPipe 3D landmark tracking, rep-by-rep biomechanics, measured movement quality scoring, and fatigue degradation trends." />
      <section className="grid grid-cols-2 gap-3.5 lg:grid-cols-4" aria-label="Choose exercise">
        {EXERCISES.map((x, i) => (
          <button key={x.name} onClick={() => { setEx(i); setNote(null); }} aria-pressed={i === ex}
            className={`rounded-2xl border px-4 py-3.5 text-left transition ${i === ex ? "border-emerald/70 bg-emerald/10" : "border-line bg-card hover:border-mute/40"}`}>
            <div className="text-[13px] font-bold">{x.name}</div><div className="mt-1.5 font-mono text-[10px] text-mute">{x.hint}</div></button>))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <div className="relative mx-auto aspect-[4/3] w-full max-w-[640px] overflow-hidden rounded-3xl border border-line bg-[#04060a]">
            <video ref={video} playsInline muted className="absolute inset-0 h-full w-full -scale-x-100 object-cover" />
            <canvas ref={canvas} className="absolute inset-0 h-full w-full -scale-x-100 object-cover" />
            <div className="absolute left-3.5 top-3.5 z-10 flex items-center gap-2 rounded-full border border-line bg-black/70 px-3 py-1.5 font-mono text-[11px]"><span className={`dot ${tracking ? "" : "!bg-mute"}`} />{pose}</div>
            {!running && <div className="absolute inset-0 grid place-items-center"><button className="btn-mint" onClick={start} disabled={status === "loading"}><Camera size={16} />{status === "loading" ? "Loading…" : "Start Camera"}</button></div>}
          </div>
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-emerald/40 bg-emerald/5 px-5 py-4" aria-live="polite">
            <div className="flex items-center gap-3.5"><span className={`dot !h-2.5 !w-2.5 ${status === "error" ? "!bg-rose" : ""}`} /><div><div className="mono-label">Live Form Status</div><div className="mt-1 text-[15px] font-bold">{headline}</div></div></div>
            <div className="font-mono text-xs text-mute">Phase: <b className="text-mint">{phase}</b></div>
          </div>
          <p className="font-mono text-[11px] leading-relaxed text-mute"><b className="text-paper/80">Camera setup:</b> {e.setup}</p>
          {running && result?.angle != null && !result?.noBody && !result?.lowVis && (
            <p className="tile px-4 py-2.5 font-mono text-[11px] text-mute" aria-live="off">
              Tracking <b className="text-mint">{result.side === 0 ? "left" : "right"}</b> side · angle <b className="text-paper">{Math.round(result.angle)}°</b> · confidence <b className="text-paper">{Math.round((result.vis || 0) * 100)}%</b>
              {e.mode !== "hold" && <> · a rep counts when the angle {e.mode === "down" ? "drops below" : "rises above"} <b className="text-mint">{countThreshold(e)}°</b> (full target {e.hint})</>}
            </p>)}
          <div className="flex flex-wrap items-center gap-2.5">
            {running ? <button className="btn-dark" onClick={stop}><Square size={15} />Stop Camera</button> : <button className="btn-mint" onClick={start} disabled={status === "loading"}><Camera size={15} />Start Camera</button>}
            <button className="btn-dark" onClick={() => { reset(); setNote(null); }}><RotateCcw size={15} />Reset Counter</button>
            <label className="ml-auto flex items-center gap-3 text-xs text-mute">Effort (RPE) <b className="w-4 font-mono text-paper">{rpe}</b><input type="range" className="range !w-28" min="1" max="10" value={rpe} onChange={x => setRpe(+x.target.value)} /></label>
            <button className="btn-teal" onClick={save}><Save size={15} />Save Session</button>
          </div>
          {note && <p role={note.ok ? "status" : "alert"} className={`text-sm ${note.ok ? "text-mint" : "text-rose"}`}>{note.text}</p>}
          {diag && <p className="font-mono text-[10.5px] text-mute">Engine: {diag}</p>}
        </div>

        <aside className="space-y-4">
          <div className="card flex items-center justify-between p-6">
            <div><div className="mono-label">{hold ? "Seconds Held" : "Completed Reps"}</div><div className="mt-2 font-mono text-[56px] font-bold leading-none text-mint">{hold ? Math.round(result?.holdSeconds ?? 0) : result?.reps ?? 0}</div></div>
            <div className="grid h-16 w-16 place-items-center rounded-2xl border border-emerald/40 bg-emerald/10 font-mono text-xl font-bold text-mint">#{hold ? "—" : result?.reps ?? 0}</div>
          </div>
          <div className="card p-6">
            <div className="flex items-center justify-between gap-2"><span className="text-[13px] font-extrabold uppercase tracking-wide">Movement Quality</span><span className="font-mono text-[13px] font-bold text-mint">{grade(live.composite)}</span></div>
            <div className="mt-4 h-2 rounded-full bg-[#101722]"><div className="h-full rounded-full bg-mint transition-all" style={{ width: `${live.composite ?? 0}%` }} /></div>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              {!hold && <Metric label="ROM" w={WEIGHTS.rom} v={live.rom} />}<Metric label="Alignment" w={WEIGHTS.alignment} v={live.alignment} />
              <Metric label="Stability" w={WEIGHTS.stability} v={live.stability} />{!hold && <Metric label="Tempo" w={WEIGHTS.tempo} v={live.tempo} />}
              {!hold && <div className="col-span-2"><Metric label="Consistency" w={WEIGHTS.consistency} v={live.consistency} /></div>}
            </div>
            {result?.fatigue?.detected && <p className="mt-3 rounded-lg border border-rose/40 bg-rose/10 px-3 py-2 font-mono text-[11px] text-rose">Fatigue: quality down {Math.max(0, result.fatigue.drop)} pts{result.fatigue.slower ? ", tempo slowing" : ""}.</p>}
          </div>
          <div className="card p-6"><div className="font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-mint">Biomechanical Cue</div><p className="mt-3 text-sm">{result?.cue || e.cue}</p></div>
        </aside>
      </section>
    </>
  );
}
