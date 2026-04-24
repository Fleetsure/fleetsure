"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/api";

const FEATURES = [
  { icon: "🚛", title: "Track Every Trip", desc: "Log trips, freight amounts, and routes in seconds." },
  { icon: "💰", title: "Real-time P&L", desc: "Know instantly if each trip is profitable or not." },
  { icon: "📋", title: "Digital Trip Sheets", desc: "Replace paper with digital trip sheets your drivers love." },
  { icon: "📊", title: "Fleet Dashboard", desc: "See all vehicles, compliance dates, and status at a glance." },
];

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await login(form);
      const { access_token, name, user_id } = res.data;
      localStorage.setItem("token", access_token);
      localStorage.setItem("userName", name);
      localStorage.setItem("userId", user_id);
      router.push("/");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex" }}>

      {/* ── Left Panel — Branding ── */}
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
        {/* Background pattern */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.05, backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 56 }}>
          <img src="/logo.png" alt="FleetSure" style={{ width: 48, height: 48, borderRadius: 12 }} />
          <div>
            <div style={{ color: "white", fontWeight: 800, fontSize: 24, lineHeight: 1 }}>FleetSure</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 3 }}>Fleet Management Platform</div>
          </div>
        </div>

        {/* Headline */}
        <h1 style={{ color: "white", fontSize: 36, fontWeight: 800, lineHeight: 1.25, margin: "0 0 16px", maxWidth: 420 }}>
          Run your fleet smarter. Know your profits daily.
        </h1>
        <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 16, lineHeight: 1.6, margin: "0 0 48px", maxWidth: 400 }}>
          Built for Indian fleet owners — track trips, expenses, and compliance without the paperwork chaos.
        </p>

        {/* Feature list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
              <div style={{ fontSize: 24, flexShrink: 0, marginTop: 2 }}>{f.icon}</div>
              <div>
                <div style={{ color: "white", fontWeight: 700, fontSize: 15 }}>{f.title}</div>
                <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 13.5, marginTop: 2 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom badge */}
        <div style={{ marginTop: 56, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "6px 14px", display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80" }} />
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: 600 }}>Trusted by fleet owners across India</span>
          </div>
        </div>
      </div>

      {/* ── Right Panel — Form ── */}
      <div style={{
        width: 480,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8f9ff",
        padding: "40px 48px",
      }}>
        <div style={{ width: "100%" }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: "#1a1a2e", margin: "0 0 6px" }}>Welcome back</h2>
          <p style={{ color: "#888", fontSize: 14, margin: "0 0 32px" }}>Sign in to your fleet account</p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 6 }}>Email Address</label>
              <input
                type="email" required
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                style={{ width: "100%", padding: "11px 14px", borderRadius: 8, border: "1.5px solid #e0e0ee", background: "white", color: "#1a1a2e", fontSize: 14, boxSizing: "border-box", outline: "none" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 6 }}>Password</label>
              <input
                type="password" required
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                style={{ width: "100%", padding: "11px 14px", borderRadius: 8, border: "1.5px solid #e0e0ee", background: "white", color: "#1a1a2e", fontSize: 14, boxSizing: "border-box", outline: "none" }}
              />
            </div>

            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", color: "#dc2626", fontSize: 13 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{ background: "#1E2D8E", color: "white", border: "none", borderRadius: 8, padding: "13px", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, marginTop: 4 }}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
            <div style={{ flex: 1, height: 1, background: "#e0e0ee" }} />
            <span style={{ color: "#aaa", fontSize: 12, fontWeight: 500 }}>or</span>
            <div style={{ flex: 1, height: 1, background: "#e0e0ee" }} />
          </div>

          {/* Google button — placeholder until OAuth is configured */}
          <button
            onClick={() => alert("Google login coming soon! Register with email for now.")}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "11px 14px", borderRadius: 8, border: "1.5px solid #e0e0ee", background: "white", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#1a1a2e" }}>
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.5 35.5 26.9 36 24 36c-5.2 0-9.6-2.9-11.3-7.1l-6.6 5C9.6 39.6 16.3 44 24 44z"/><path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.6 4.6-4.8 6l6.2 5.2C40.5 35.5 44 30.2 44 24c0-1.3-.1-2.7-.4-4z"/></svg>
            Continue with Google
          </button>

          <p style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "#888" }}>
            Don&apos;t have an account?{" "}
            <Link href="/register" style={{ color: "#1E2D8E", fontWeight: 700, textDecoration: "none" }}>Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
