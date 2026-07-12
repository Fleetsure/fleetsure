"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, sendPasswordResetEmail, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { supabase } from "@/lib/supabase";
import { useIsMobile } from "@/hooks/useIsMobile";

const SUPPORT_EMAIL = "support@fleetsure.co.in";
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px",
  border: "1.5px solid #e0e0ee", borderRadius: 10,
  fontSize: 14, boxSizing: "border-box", outline: "none",
};

const FEATURES = [
  { icon: "🚛", title: "Track Every Trip", desc: "Log trips, freight amounts, and routes in seconds." },
  { icon: "💰", title: "Real-time P&L", desc: "Know instantly if each trip is profitable or not." },
  { icon: "📋", title: "Digital Trip Sheets", desc: "Replace paper with digital trip sheets your drivers love." },
  { icon: "📊", title: "Fleet Dashboard", desc: "See all vehicles, compliance dates, and status at a glance." },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();


  useEffect(() => {
    // If already signed in via Firebase, go straight to app
    if (auth.currentUser) router.replace("/");
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResetSent(false);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const { data } = await supabase.from("users").select("id").eq("id", cred.user.uid).single();
      if (!data) {
        await signOut(auth);
        setError(`Access not granted. Contact us at ${SUPPORT_EMAIL} to request access.`);
        return;
      }
      router.replace("/");
    } catch (err: any) {
      setError(err?.message?.replace("Firebase: ", "") || "Sign in failed. Check your email and password.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Enter your email above first, then click \"Forgot password?\" again.");
      return;
    }
    setError("");
    setResetSent(false);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err: any) {
      setError(err?.message?.replace("Firebase: ", "") || "Failed to send reset link.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", width: "100%", display: "flex" }}>

      {/* Left Panel — Branding (hidden on mobile) */}
      <div style={{
        flex: 1,
        background: "linear-gradient(145deg, #1a237e 0%, #283593 50%, #1565c0 100%)",
        display: isMobile ? "none" : "flex",
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
          Run your fleet smarter. Know your profits daily.
        </h1>
        <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 16, lineHeight: 1.6, margin: "0 0 48px", maxWidth: 400 }}>
          Built for Indian fleet owners — track trips, expenses, and compliance without the paperwork chaos.
        </p>

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

        <div style={{ marginTop: 56, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "6px 14px", display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80" }} />
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: 600 }}>Trusted by fleet owners across India</span>
          </div>
        </div>
      </div>

      {/* Right Panel — Sign In */}
      <div style={{
        width: isMobile ? "100%" : 480,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: isMobile ? "flex-start" : "center",
        background: "#f8f9ff",
        padding: 0,
        minHeight: "100vh",
      }}>
        {/* Mobile: full-width branded header */}
        {isMobile && (
          <div style={{
            width: "100%",
            background: "linear-gradient(145deg, #1a237e 0%, #283593 60%, #1565c0 100%)",
            padding: "52px 28px 40px",
            textAlign: "center",
            marginBottom: 32,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16 }}>
              <img src="/logo.png" alt="FleetSure" style={{ width: 44, height: 44, borderRadius: 10 }} />
              <span style={{ color: "white", fontWeight: 900, fontSize: 24, letterSpacing: "-0.5px" }}>FleetSure</span>
            </div>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 15, margin: 0, lineHeight: 1.5 }}>
              Track every trip. Know every rupee.
            </p>
          </div>
        )}

        {/* Form content */}
        <div style={{ width: "100%", maxWidth: isMobile ? "100%" : 400, padding: isMobile ? "0 24px" : "0", flex: isMobile ? "unset" : 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h2 style={{ fontSize: isMobile ? 22 : 26, fontWeight: 800, color: "#1a1a2e", margin: "0 0 6px" }}>Welcome to FleetSure</h2>
          <p style={{ color: "#888", fontSize: 14, margin: "0 0 28px" }}>Sign in to continue</p>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", color: "#dc2626", fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}
          {resetSent && (
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 14px", color: "#15803d", fontSize: 13, marginBottom: 16 }}>
              Reset link sent to your email.
            </div>
          )}

          <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: "#555", display: "block", marginBottom: 6 }}>
                Email Address
              </label>
              <input
                type="email" required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: "#555", display: "block", marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password" required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={inputStyle}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "13px", background: loading ? "#9ba4c4" : "#1E2D8E",
                color: "white", border: "none", borderRadius: 10,
                fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                marginTop: 4,
              }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <button
            type="button"
            onClick={handleForgotPassword}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#1E2D8E", fontSize: 13, fontWeight: 600, marginTop: 14, padding: 0 }}
          >
            Forgot password?
          </button>

          <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#aaa", lineHeight: 1.6 }}>
            By signing in you agree to our Terms of Service.
          </p>
        </div>

        <p style={{ textAlign: "center", fontSize: 13, color: "#888", margin: isMobile ? "32px 0" : "24px 0 0" }}>
          Made with ❤️ in Bengaluru
        </p>
      </div>
    </div>
  );
}
