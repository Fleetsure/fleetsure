"use client";

// ─── Integrations ─────────────────────────────────────────────────────────────
export default function IntegrationsSettings() {
  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700 }}>Integrations</h2>
      <p style={{ margin: "0 0 24px", fontSize: 13, color: "var(--text-muted)" }}>Services connected to your FleetSure account</p>

      {/* ── Vahan RC Lookup ── */}
      <div style={{ border: "1.5px solid var(--border-input)", borderRadius: 12, marginBottom: 16, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, background: "var(--bg-subtle)" }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#e8eaf6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🚗</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-main)" }}>Vahan RC Lookup</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 8, background: "#fff3e0", color: "#e65100" }}>Coming Soon</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              Auto-fill make, model, fuel type, insurance & PUC expiry from any registration number
            </div>
          </div>
        </div>
      </div>

      {/* ── Coming soon ── */}
      {[
        { icon: "🏷️", label: "FASTag Integration", desc: "Auto-import toll transactions from your FASTag account" },
        { icon: "📍", label: "GPS Tracking",        desc: "Live vehicle location from Jio GPS, Tracksolid, and others" },
      ].map(item => (
        <div key={item.label} style={{ border: "1.5px solid var(--border-input)", borderRadius: 12, overflow: "hidden", opacity: 0.6, marginBottom: 10 }}>
          <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 14, background: "var(--bg-subtle)" }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "#f0f0f8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{item.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-main)" }}>{item.label}</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 8, background: "#fff3e0", color: "#e65100" }}>Coming Soon</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{item.desc}</div>
            </div>
          </div>
        </div>
      ))}

    </div>
  );
}

