"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/api";
import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";

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
  const [gLoading, setGLoading] = useState(false);

  const storeSession = (data: any) => {
    // Clear ALL stale data from any previous account before writing new session
    localStorage.clear();
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("userName", data.name);
    localStorage.setItem("userId", data.user_id);
    if (data.org_name) localStorage.setItem("orgName", data.org_name);
    if (data.org_logo) localStorage.setItem("orgLogo", data.org_logo);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await login(form);
      storeSession(res.data);
      router.push("/");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setGLoading(true);
    setError("");
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      const res = await axios.post(`${apiBase}/auth/google`, {
        credential: credentialResponse.credential,
      });
      storeSession(res.data);
      router.push("/");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Google sign-in failed. Try again.");
    } finally {
      setGLoading(false);
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
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8f9ff",
        padding: "40px 48px",
      }}>
        <div style={{ width: "100%", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
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
          <div style={{ display: "flex", justifyContent: "center" }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError("Google sign-in failed. Try again.")}
              useOneTap
              text="continue_with"
              shape="rectangular"
              size="large"
              width="384"
            />
          </div>
          {gLoading && <p style={{ textAlign: "center", color: "#888", fontSize: 13 }}>Signing in with Google…</p>}

          <p style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "#888" }}>
            Don&apos;t have an account?{" "}
            <Link href="/register" style={{ color: "#1E2D8E", fontWeight: 700, textDecoration: "none" }}>Create one free</Link>
          </p>
        </div>

        {/* Footer */}
        <p style={{ textAlign: "center", fontSize: 13, color: "#888", marginTop: 24, marginBottom: 0 }}>
          Made with ❤️ in Bengaluru
        </p>
      </div>
    </div>
  );
}
