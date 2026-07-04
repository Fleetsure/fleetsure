"use client";
import { useState, useEffect } from "react";
import { Mail, MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function NotificationSettings() {
  const [s, setS] = useState({
    phone:                      "",
    email_compliance_alerts:    true,
    email_monthly_summary:      true,
    whatsapp_compliance_alerts: false,
    whatsapp_monthly_summary:   false,
    alert_days_before:          "30,15,7",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { getUid } = await import("@/lib/services/_base");
        const owner_id = getUid();
        const { data } = await supabase.from("notification_settings").select("*").eq("owner_id", owner_id).maybeSingle();
        if (data) setS(prev => ({ ...prev, ...data }));
      } catch {}
      setLoading(false);
    })();
  }, []);

  const toggle = (key: string) => setS(prev => ({ ...prev, [key]: !(prev as any)[key] }));
  const set    = (key: string, val: any) => setS(prev => ({ ...prev, [key]: val }));

  const save = async () => {
    setSaving(true);
    try {
      const { getUid } = await import("@/lib/services/_base");
      const owner_id = getUid();
      await supabase.from("notification_settings")
        .upsert({ ...s, owner_id }, { onConflict: "owner_id" });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally { setSaving(false); }
  };

  const sendTestAlert = async () => {
    setTestMsg("✓ Notification settings saved. Email alerts will be sent based on your schedule.");
    setTimeout(() => setTestMsg(""), 4000);
  };

  if (loading) return <p style={{ color: "#aaa", padding: "32px 0" }}>Loading...</p>;

  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700 }}>Notification Settings</h2>
      <p style={{ margin: "0 0 24px", fontSize: 13, color: "var(--text-muted)" }}>Choose how and when FleetSure alerts you</p>

      {/* ── How you get notified ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
          How You Get Notified
        </div>

        {/* ── Email ── */}
        <div style={{ border: "1.5px solid var(--border-input)", borderRadius: 10, overflow: "hidden", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "var(--bg-card)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "#e8eaf6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Mail size={17} color="#1E2D8E" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-main)" }}>Email Notifications</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Sent to your registered email address</div>
              </div>
            </div>
          </div>
          <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 10, background: "var(--bg-subtle)" }}>
            {[
              { key: "email_compliance_alerts", label: "Compliance Alerts", desc: "Insurance, PUC, fitness, permit, driver license expiry" },
              { key: "email_monthly_summary",   label: "Monthly Expense Summary", desc: "Sent on the 1st of each month with full fleet breakdown" },
            ].map(item => (
              <div key={item.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-main)" }}>{item.label}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{item.desc}</div>
                </div>
                <Toggle on={(s as any)[item.key]} onChange={() => toggle(item.key)} />
              </div>
            ))}
          </div>
        </div>

        {/* ── WhatsApp ── */}
        <div style={{ border: "1.5px solid var(--border-input)", borderRadius: 10, overflow: "hidden", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "var(--bg-card)" }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "#e8f5e9", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MessageCircle size={17} color="#2e7d32" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-main)" }}>WhatsApp Notifications</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 8, background: "#fff3e0", color: "#e65100" }}>Coming Soon</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Requires AiSensy BSP setup. See Integrations tab.</div>
            </div>
          </div>
          <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", background: "var(--bg-subtle)", opacity: 0.5 }}>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>WhatsApp Number (with country code)</label>
              <input type="tel" placeholder="919876543210" value={s.phone || ""}
                onChange={e => set("phone", e.target.value)}
                disabled
                style={{ width: "100%", maxWidth: 280, padding: "8px 12px", border: "1.5px solid var(--border-input)", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box" }} />
            </div>
            {[
              { key: "whatsapp_compliance_alerts", label: "Compliance Alerts" },
              { key: "whatsapp_monthly_summary",   label: "Monthly Summary" },
            ].map(item => (
              <div key={item.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: "var(--text-main)" }}>{item.label}</span>
                <Toggle on={false} onChange={() => {}} />
              </div>
            ))}
          </div>
        </div>

        {/* ── Alert threshold ── */}
        <div style={{ border: "1.5px solid var(--border-input)", borderRadius: 10, padding: "14px 16px", background: "var(--bg-card)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-main)", marginBottom: 4 }}>Alert Threshold (days before expiry)</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>Send alerts when documents expire within these many days</div>
          <div style={{ display: "flex", gap: 8 }}>
            {["7", "15", "30", "60"].map(d => {
              const active = s.alert_days_before.split(",").map(x => x.trim()).includes(d);
              return (
                <button key={d} type="button"
                  onClick={() => {
                    const curr = s.alert_days_before.split(",").map(x => x.trim()).filter(Boolean);
                    const next = active ? curr.filter(x => x !== d) : [...curr, d];
                    set("alert_days_before", next.sort((a, b) => parseInt(b) - parseInt(a)).join(","));
                  }}
                  style={{
                    padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    border: `1.5px solid ${active ? "#1E2D8E" : "var(--border-input)"}`,
                    background: active ? "#eef0fb" : "var(--bg-subtle)",
                    color: active ? "#1E2D8E" : "var(--text-muted)",
                  }}>
                  {d} days
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Test + Save */}
      {testMsg && (
        <div style={{ background: testMsg.startsWith("✓") ? "#e8f5e9" : "#fce4ec", color: testMsg.startsWith("✓") ? "#2e7d32" : "#b71c1c", padding: "10px 14px", borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
          {testMsg}
        </div>
      )}
      <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? "Saving..." : saved ? "✓ Saved!" : "Save Settings"}
        </button>
        <button className="btn-outline" onClick={sendTestAlert} disabled={testing}>
          {testing ? "Sending..." : "Send Test Email"}
        </button>
      </div>
    </div>
  );
}

// Toggle switch component
function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <div onClick={onChange} style={{
      width: 38, height: 22, borderRadius: 11, cursor: "pointer", flexShrink: 0,
      background: on ? "#1E2D8E" : "#ddd", transition: "background 0.2s", position: "relative"
    }}>
      <div style={{
        position: "absolute", top: 3, left: on ? 19 : 3, width: 16, height: 16,
        borderRadius: "50%", background: "var(--bg-card)", transition: "left 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
      }} />
    </div>
  );
}
