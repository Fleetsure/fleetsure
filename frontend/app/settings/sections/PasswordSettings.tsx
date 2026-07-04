"use client";
import { useState } from "react";
import { Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";

// ─── Login & Password ─────────────────────────────────────────────────────────
export default function PasswordSettings() {
  const [form, setForm]   = useState({ current: "", newPw: "", confirm: "" });
  const [show, setShow]   = useState({ current: false, newPw: false, confirm: false });
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  const set = (k: string, v: string) => { setForm(p => ({ ...p, [k]: v })); setStatus("idle"); };
  const toggleShow = (k: string) => setShow(p => ({ ...p, [k]: !p[k as keyof typeof p] }));

  // Strength calculation
  const strength = (() => {
    const p = form.newPw;
    let score = 0;
    if (p.length >= 8)  score++;
    if (p.length >= 12) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  })();
  const strengthLabel = ["", "Weak", "Weak", "Fair", "Strong", "Very Strong"][strength];
  const strengthColor = ["#ddd", "#e53935", "#e53935", "#f57c00", "#1a7a34", "#1a7a34"][strength];

  const handleSave = () => {
    if (!form.current) { setErrMsg("Enter your current password"); setStatus("error"); return; }
    if (form.newPw.length < 8) { setErrMsg("New password must be at least 8 characters"); setStatus("error"); return; }
    if (form.newPw !== form.confirm) { setErrMsg("Passwords do not match"); setStatus("error"); return; }
    // TODO: wire to real API when auth is added
    setStatus("success");
    setForm({ current: "", newPw: "", confirm: "" });
    setTimeout(() => setStatus("idle"), 3000);
  };

  const field = (key: "current" | "newPw" | "confirm", label: string) => (
    <div>
      <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={show[key] ? "text" : "password"}
          value={form[key]}
          placeholder="••••••••"
          onChange={e => set(key, e.target.value)}
          style={{ width: "100%", padding: "9px 40px 9px 12px", border: "1.5px solid var(--border-input)", borderRadius: 8, fontSize: 13.5, background: "var(--bg-card)", color: "var(--text-main)" }}
        />
        <button onClick={() => toggleShow(key)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0 }}>
          {show[key] ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700 }}>Login & Password</h2>
      <p style={{ margin: "0 0 24px", fontSize: 13, color: "var(--text-muted)" }}>Update your password to keep your account secure</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 420 }}>
        {field("current", "Current Password")}
        {field("newPw", "New Password")}

        {/* Strength bar */}
        {form.newPw.length > 0 && (
          <div>
            <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
              {[1,2,3,4,5].map(i => (
                <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= strength ? strengthColor : "#e8e8f0", transition: "background 0.2s" }} />
              ))}
            </div>
            <div style={{ fontSize: 11.5, color: strengthColor, fontWeight: 600 }}>{strengthLabel}</div>
          </div>
        )}

        {field("confirm", "Confirm New Password")}

        {/* Match indicator */}
        {form.confirm.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
            {form.newPw === form.confirm
              ? <><CheckCircle size={14} color="#1a7a34" /><span style={{ color: "#1a7a34" }}>Passwords match</span></>
              : <><XCircle size={14} color="#e53935" /><span style={{ color: "#e53935" }}>Passwords do not match</span></>
            }
          </div>
        )}
      </div>

      {/* Status messages */}
      {status === "error" && (
        <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 8, background: "#fce4ec", color: "#b71c1c", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
          <XCircle size={15} /> {errMsg}
        </div>
      )}
      {status === "success" && (
        <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 8, background: "#e6f4ea", color: "#1a7a34", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle size={15} /> Password updated successfully!
        </div>
      )}

      <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
        <button className="btn-primary" onClick={handleSave}>Update Password</button>
        <button className="btn-outline" onClick={() => { setForm({ current: "", newPw: "", confirm: "" }); setStatus("idle"); }}>Cancel</button>
      </div>
    </div>
  );
}

