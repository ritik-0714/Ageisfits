import { NavLink, useNavigate } from "react-router-dom";
import { LayoutGrid, Users, Clock3, Camera, ShieldCheck, ShoppingBag } from "lucide-react";
import { Brand } from "./Logo.jsx";
import { useAuth } from "../lib/AuthContext.jsx";

const NAV = [["/dashboard", "Dashboard", LayoutGrid], ["/connect", "Connect", Users], ["/devices", "Devices", Clock3], ["/form-check", "AI Form Check", Camera], ["/injury-map", "3D Injury Map", ShieldCheck], ["/store", "Equipment Store", ShoppingBag]];

export default function Layout({ children }) {
  const { logout } = useAuth(), nav = useNavigate();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1260px] flex-wrap items-center justify-between gap-3 px-5 py-3 xl:flex-nowrap">
          <button onClick={() => nav("/dashboard")} aria-label="AegisFit home" className="shrink-0 text-left"><Brand size={44} /></button>
          <nav className="flex max-w-full items-center gap-0.5 overflow-x-auto">
            {NAV.map(([to, label, Icon]) => (
              <NavLink key={to} to={to} className={({ isActive }) => `flex items-center gap-2 whitespace-nowrap rounded-xl border px-3 py-2 text-[12.5px] transition ${isActive ? "border-[#262f3e] bg-[#171c26] font-semibold text-paper" : "border-transparent text-mute hover:text-paper"}`}>
                <Icon size={15} />{label}
              </NavLink>
            ))}
            <button onClick={() => { logout(); nav("/login"); }} className="ml-1 whitespace-nowrap rounded-xl border border-[#1c2a45] bg-[#0f1a2e] px-4 py-2 text-[12.5px] font-medium text-paper hover:bg-[#14223b]">Logout</button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1180px] space-y-5 px-5 py-6">{children}</main>
    </div>
  );
}
