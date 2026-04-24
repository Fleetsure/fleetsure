"use client";
import { Bell, Search, RefreshCw } from "lucide-react";

export default function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header style={{
      background: "var(--bg-card)",
      borderBottom: "1px solid var(--border)",
      padding: "14px 28px",
      display: "flex", alignItems: "center", justifyContent: "space-between"
    }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--text-main)" }}>{title}</h1>
        {subtitle && <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{subtitle}</p>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ position: "relative" }}>
          <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            placeholder="Search..."
            style={{
              paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7,
              border: "1px solid var(--border-input)", borderRadius: 8, fontSize: 13,
              width: 200, color: "var(--text-main)", background: "var(--bg-subtle)"
            }}
          />
        </div>
        <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 6 }}>
          <Bell size={18} />
        </button>
        <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 6 }}>
          <RefreshCw size={16} />
        </button>
      </div>
    </header>
  );
}
