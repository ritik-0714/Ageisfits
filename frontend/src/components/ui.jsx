import { X } from "lucide-react";

export function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={title} onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={`card max-h-[90vh] w-full overflow-y-auto p-6 shadow-card ${wide ? "max-w-2xl" : "max-w-md"}`}>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2><button onClick={onClose} aria-label="Close" className="text-mute hover:text-paper"><X size={18} /></button></div>
        {children}
      </div>
    </div>
  );
}
export const Hero = ({ pill, title, sub, right, children }) => (
  <section className="card p-7 md:p-8"><div className="flex flex-wrap items-start justify-between gap-5"><div className="max-w-4xl">
    {pill && <span className="pill"><span className="dot" />{pill}</span>}
    <h1 className="mt-4 text-[26px] font-extrabold leading-[1.15] tracking-tight md:text-[29px]">{title}</h1>
    {sub && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-mute">{sub}</p>}</div>{right}</div>{children}</section>
);
export function Slider({ label, value, set, min = 0, max = 10, step = 1, unit = "", color = "#34d399" }) {
  return (
    <label className="block"><span className="mb-1.5 flex justify-between text-xs font-semibold"><span>{label}</span><span className="font-mono text-mint">{value}{unit}</span></span>
      <input type="range" className="range" style={{ "--c": color }} min={min} max={max} step={step} value={value} onChange={e => set(+e.target.value)} /></label>
  );
}
