// AegisFit mark: rounded tile, double-outline shield, white athlete and a rising green arrow (redrawn from the report's logo).
export function LogoMark({ size = 46 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="AegisFit logo">
      <defs><linearGradient id="ag" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#22c55e" /><stop offset="1" stopColor="#6ee77a" /></linearGradient></defs>
      <rect x="1" y="1" width="62" height="62" rx="16" fill="#0e1524" stroke="#1b263a" />
      <path d="M32 11 L47 17 V33 C47 43 40 50 32 54 C24 50 17 43 17 33 V17 Z" fill="#101a2c" stroke="#33445f" strokeWidth="1.6" />
      <path d="M32 15 L43.5 19.6 V33 C43.5 41 38 46.5 32 50 C26 46.5 20.5 41 20.5 33 V19.6 Z" fill="none" stroke="#25344c" strokeWidth="1" />
      <circle cx="29" cy="24" r="2.6" fill="#f3f6fa" /><path d="M23.5 27.5 Q29 26 33 28.5 L31.5 36 H26 Z" fill="#f3f6fa" /><path d="M23 27.5 l-2.2 4 M34 28 l2 -3" stroke="#f3f6fa" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M22.5 41.5 L38.5 25.5 L36.2 24.6 L42.2 22.3 L41.4 28.7 L39.8 27.2 L24.2 43.3 Z" fill="url(#ag)" />
      <path d="M27.5 43.5 q-1.5 3 .6 4.5 M33 42.5 q2 2.6 .2 5" stroke="#86d62b" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  );
}
export function Brand({ size = 46, center = false, big = false }) {
  return (
    <div className={`flex items-center gap-3 ${center ? "justify-center" : ""}`}>
      <LogoMark size={size} />
      <div className="leading-none">
        <div className={`${big ? "text-[26px]" : "text-[18px]"} font-extrabold tracking-tight`}>AEGIS<span className="italic text-lime">FIT</span></div>
        <div className={`mt-1.5 font-mono ${big ? "text-[10px]" : "text-[9px]"} uppercase tracking-[0.12em] text-mute`}>Personal Fitness &amp; Health Companion</div>
      </div>
    </div>
  );
}
