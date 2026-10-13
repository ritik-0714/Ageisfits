export function Heatmap({ data = [] }) {
  const max = Math.max(1, ...data.map(d => d.load));
  return (
    <div className="grid grid-cols-7 gap-1.5" role="img" aria-label="28-day training load heatmap">
      {data.map(d => <div key={d.date} title={`${d.date}: load ${d.load} AU`} className="aspect-square rounded-md border border-line" style={{ background: d.load ? `rgba(52,211,153,${0.18 + 0.82 * (d.load / max)})` : "#070a0f" }} />)}
    </div>
  );
}
// Minimal SVG line chart. bands: [{from,to,color}] drawn behind the line.
export function LineChart({ points = [], height = 130, min, max, bands = [], color = "#34d399", label = "chart" }) {
  const w = 600, pad = 8;
  if (!points.length) return <div className="font-mono text-xs text-mute">No data yet.</div>;
  const ys = points.map(p => p.y), lo = min ?? Math.min(...ys), hi = max ?? Math.max(...ys), span = hi - lo || 1;
  const X = i => pad + (i * (w - 2 * pad)) / Math.max(1, points.length - 1), Y = v => height - pad - ((v - lo) / span) * (height - 2 * pad);
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" role="img" aria-label={label} preserveAspectRatio="none">
      {bands.map((b, i) => <rect key={i} x="0" width={w} y={Y(Math.min(hi, b.to))} height={Math.max(0, Y(Math.max(lo, b.from)) - Y(Math.min(hi, b.to)))} fill={b.color} opacity="0.12" />)}
      <polyline fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" points={points.map((p, i) => `${X(i)},${Y(p.y)}`).join(" ")} />
      {points.map((p, i) => <circle key={i} cx={X(i)} cy={Y(p.y)} r="2.8" fill={color}><title>{`${p.x}: ${p.y}`}</title></circle>)}
    </svg>
  );
}
