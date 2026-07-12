"use client";
import { useState, useRef, useEffect } from "react";
import { Building2, Check } from "lucide-react";
import { useFirm } from "@/lib/FirmContext";

export default function FirmSwitcher() {
  const { firms, activeFirmId, setActiveFirmId, loading } = useFirm();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (loading) return null;

  const activeFirm = firms.find(f => f.id === activeFirmId);

  // Nothing to switch between — don't show a dropdown for a single firm.
  if (firms.length <= 1) return null;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Switch Firm"
        style={{
          display: "flex", alignItems: "center", gap: 5,
          background: "var(--bg-subtle)", border: "1px solid var(--border-input)",
          borderRadius: 8, padding: "6px 10px", cursor: "pointer",
          color: "var(--text-muted)", fontSize: 13, fontWeight: 600,
          maxWidth: 160,
        }}
      >
        <Building2 size={15} />
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {activeFirm?.name || "Select Firm"}
        </span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0,
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
          zIndex: 9999, minWidth: 220, overflow: "hidden", padding: "6px 0",
        }}>
          <div style={{ padding: "6px 14px 8px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
            Switch Firm
          </div>
          {firms.map(f => (
            <button
              key={f.id}
              onClick={() => { setActiveFirmId(f.id); setOpen(false); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "9px 14px", background: activeFirmId === f.id ? "#f0f1fa" : "transparent",
                border: "none", cursor: "pointer", textAlign: "left",
                borderLeft: activeFirmId === f.id ? "3px solid #1E2D8E" : "3px solid transparent",
              }}
              onMouseEnter={e => { if (activeFirmId !== f.id) e.currentTarget.style.background = "var(--bg-hover)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = activeFirmId === f.id ? "#f0f1fa" : "transparent"; }}
            >
              <span style={{ fontSize: 13, color: "var(--text-main)", fontWeight: activeFirmId === f.id ? 700 : 400 }}>
                {f.name}
              </span>
              {activeFirmId === f.id && <Check size={14} color="#1E2D8E" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
