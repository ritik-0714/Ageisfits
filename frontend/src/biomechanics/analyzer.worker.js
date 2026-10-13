// Web Worker: all per-frame biomechanical analysis happens here, off the React/UI thread.
// Main thread -> worker: { type: "init"|"frame"|"noBody"|"summary", ... }   worker -> main: { type: "result"|"summary", ... }
import { ExerciseAnalyzer } from "./analyzerCore.js";

const analyzer = new ExerciseAnalyzer(0);
self.onmessage = ({ data }) => {
  switch (data.type) {
    case "init": analyzer.setExercise(data.exercise); self.postMessage({ type: "result", ...analyzer._snapshot(), ready: true }); break;
    case "frame": self.postMessage({ type: "result", ...analyzer.process(data) }); break;
    case "noBody": self.postMessage({ type: "result", ...analyzer.noBody() }); break;
    case "summary": self.postMessage({ type: "summary", ...analyzer.summary() }); break;
    default: break;
  }
};
