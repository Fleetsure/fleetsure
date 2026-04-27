"use client";
import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";
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
  const [gLoading, setGLoading] = useState(false);

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

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setGLoading(true);
    setError("");
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      const res = await axios.post(`${apiBase}/auth/google`, {
        credential: credentialResponse.credential,
      });
      const { access_token, name, user_id } = res.data;
      localStorage.setItem("token", access_token);
      localStorage.setItem("userName", name);
      localStorage.setItem("userId", user_id);
      router.push("/");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Google sign-in failed. Try again.");
    } finally {
      setGLoading(false);
    }
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
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError("Google sign-in failed. Try again.")}
              text="continue_with"
              shape="rectangular"
              size="large"
              width="404"
            />
          </div>
          {gLoading && <p style={{ textAlign: "center", color: "#888", fontSize: 13, marginBottom: 12 }}>Signing in with Google…</p>}

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
