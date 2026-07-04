"use client";
import { useState, useEffect } from "react";
import { Sun, Moon, CheckCircle } from "lucide-react";

// ─── Appearance & Theme ───────────────────────────────────────────────────────
export default function AppearanceSettings() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [saved, setSaved]  = useState(false);

  useEffect(() => {
    const stored = (localStorage.getItem("theme") as "light" | "dark") || "light";
    setTheme(stored);
  }, []);

  const apply = (t: "light" | "dark") => {
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("theme", t);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const card = (mode: "light" | "dark") => {
    const active = theme === mode;
    return (
      <div onClick={() => apply(mode)} style={{
        flex: 1, borderRadius: 14, border: active ? "2.5px solid #1E2D8E" : "2px solid #e8e8f0",
        background: mode === "dark" ? "#1a1d2e" : "#f4f5f9",
        padding: "24px 20px 18px", cursor: "pointer", transition: "all 0.18s",
        boxShadow: active ? "0 0 0 3px rgba(30,45,142,0.12)" : "none",
        position: "relative"
      }}>
        {active && (
          <div style={{ position: "absolute", top: 10, right: 10, background: "#1E2D8E", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle size={13} color="white" />
          </div>
        )}
        {/* Mini UI preview */}
        <div style={{ borderRadius: 8, background: mode === "dark" ? "#0f1117" : "#fff", padding: "10px 12px", marginBottom: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
          <div style={{ height: 8, width: "60%", borderRadius: 4, background: mode === "dark" ? "#2a2d42" : "#e8eaf6", marginBottom: 6 }} />
          <div style={{ height: 6, width: "40%", borderRadius: 4, background: mode === "dark" ? "#1e2235" : "#f0f0f5" }} />
          <div style={{ marginTop: 10, height: 24, borderRadius: 6, background: "#1E2D8E", width: "50%", opacity: 0.8 }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {mode === "light" ? <Sun size={15} color="#e65100" /> : <Moon size={15} color="#7c8ef0" />}
          <span style={{ fontSize: 13.5, fontWeight: 600, color: mode === "dark" ? "#e8e8f2" : "#1a1a2e" }}>
            {mode === "light" ? "Day Mode" : "Night Mode"}
          </span>
        </div>
        <div style={{ fontSize: 11.5, color: mode === "dark" ? "#6b7280" : "#999", marginTop: 4 }}>
          {mode === "light" ? "Clean white interface" : "Easy on the eyes at night"}
        </div>
      </div>
    );
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700 }}>Appearance & Theme</h2>
      <p style={{ margin: "0 0 24px", fontSize: 13, color: "var(--text-muted)" }}>Choose how FleetSure looks for you</p>

      <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)", marginBottom: 12 }}>THEME</div>
      <div style={{ display: "flex", gap: 16, maxWidth: 400 }}>
        {card("light")}
        {card("dark")}
      </div>

      {saved && (
        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 6, color: "#1a7a34", fontSize: 13, fontWeight: 500 }}>
          <CheckCircle size={15} /> Theme applied instantly
        </div>
      )}
    </div>
  );
}
