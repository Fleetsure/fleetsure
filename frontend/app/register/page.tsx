"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { register } from "@/lib/api";

const STATS = [
  { value: "₹0", label: "Setup cost — free forever" },
  { value: "2 min", label: "To log your first trip" },
  { value: "100%", label: "Data stays yours" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);
    try {
      const res = await register({ name: form.name, email: form.email, password: form.password });
      const { access_token, name, user_id } = res.data;
      localStorage.setItem("token", access_token);
      localStorage.setItem("userName", name);
      localStorage.setItem("userId", user_id);
      router.push("/");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (typeof detail === "string") {
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(detail.map((d: any) => d.msg).join(", "));
      } else {
        setError("Registration failed. Please check your details and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "11px 14px",
    borderRadius: 8,
    border: "1.5px solid #e0e0ee",
    background: "white",
    color: "#1a1a2e",
    fontSize: 14,
    boxSizing: "border-box" as const,
    outline: "none",
  };

  const labelStyle = {
    display: "block",
    fontSize: 13,
    fontWeight: 600 as const,
    color: "#555",
    marginBottom: 6,
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex" }}>

      {/* ── Left Panel ── */}
      <div style={{
        flex: 1,
        background: "linear-gradient(145deg, #1a237e 0%, #283593 50%, #1565c0 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "60px 56px",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.05, backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 56 }}>
          <img src="/logo.png" alt="FleetSure" style={{ width: 48, height: 48, borderRadius: 12 }} />
          <div>
            <div style={{ color: "white", fontWeight: 800, fontSize: 24, lineHeight: 1 }}>FleetSure</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 3 }}>Fleet Management Platform</div>
          </div>
        </div>

        <h1 style={{ color: "white", fontSize: 36, fontWeight: 800, lineHeight: 1.25, margin: "0 0 16px", maxWidth: 420 }}>
          Your fleet, fully under control — starting today.
        </h1>
        <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 16, lineHeight: 1.6, margin: "0 0 48px", maxWidth: 400 }}>
          Stop losing money on trips you can&apos;t track. FleetSure gives every fleet owner a simple, powerful way to manage operations.
        </p>

        <div style={{ display: "flex", gap: 32, marginBottom: 48 }}>
          {STATS.map(s => (
            <div key={s.label}>
              <div style={{ color: "white", fontWeight: 800, fontSize: 28 }}>{s.value}</div>
              <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12.5, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 12, padding: "20px 24px", maxWidth: 420 }}>
          <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 14.5, lineHeight: 1.6, margin: "0 0 12px", fontStyle: "italic" }}>
            &ldquo;Finally I know which trips are making money and which are not. This is what every fleet owner needs.&rdquo;
          </p>
          <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, fontWeight: 600 }}>— Ramesh S., 12-truck fleet owner, Maharashtra</div>
        </div>
      </div>

      {/* ── Right Panel — Form ── */}
      <div style={{ width: 500, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f9ff", padding: "40px 48px", overflowY: "auto" }}>
        <div style={{ width: "100%" }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: "#1a1a2e", margin: "0 0 6px" }}>Create your account</h2>
          <p style={{ color: "#888", fontSize: 14, margin: "0 0 28px" }}>Start managing your fleet for free</p>

          {/* Google button */}
          <button
            onClick={() => alert("Google login coming soon! Register with email for now.")}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "11px 14px", borderRadius: 8, border: "1.5px solid #e0e0ee", background: "white", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#1a1a2e", marginBottom: 20 }}>
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.5 35.5 26.9 36 24 36c-5.2 0-9.6-2.9-11.3-7.1l-6.6 5C9.6 39.6 16.3 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.6 4.6-4.8 6l6.2 5.2C40.5 35.5 44 30.2 44 24c0-1.3-.1-2.7-.4-4z"/>
            </svg>
            Continue with Google
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: "#e0e0ee" }} />
            <span style={{ color: "#aaa", fontSize: 12, fontWeight: 500 }}>or register with email</span>
            <div style={{ flex: 1, height: 1, background: "#e0e0ee" }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>Your Name</label>
              <input type="text" required value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Ramesh Kumar" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Email Address</label>
              <input type="email" required value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Password</label>
              <input type="password" required value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="Min. 6 characters" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Confirm Password</label>
              <input type="password" required value={form.confirmPassword}
                onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder="Re-enter your password"
                style={{
                  ...inputStyle,
                  borderColor: form.confirmPassword && form.password !== form.confirmPassword ? "#fca5a5" : "#e0e0ee",
                }} />
              {form.confirmPassword && form.password !== form.confirmPassword && (
                <p style={{ color: "#dc2626", fontSize: 12, margin: "4px 0 0" }}>Passwords do not match</p>
              )}
            </div>

            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", color: "#dc2626", fontSize: 13 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ background: "#1E2D8E", color: "white", border: "none", borderRadius: 8, padding: "13px", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, marginTop: 4 }}>
              {loading ? "Creating account..." : "Create Free Account"}
            </button>

            <p style={{ textAlign: "center", fontSize: 11.5, color: "#aaa", margin: "2px 0 0" }}>
              By creating an account, you agree to our Terms of Service.
            </p>
          </form>

          <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "#888" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "#1E2D8E", fontWeight: 700, textDecoration: "none" }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
