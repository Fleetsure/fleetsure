"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

const FEATURES = [
  { icon: "🚛", title: "Track Every Trip", desc: "Log trips, freight amounts, and routes in seconds." },
  { icon: "💰", title: "Real-time P&L", desc: "Know instantly if each trip is profitable or not." },
  { icon: "📋", title: "Digital Trip Sheets", desc: "Replace paper with digital trip sheets your drivers love." },
  { icon: "📊", title: "Fleet Dashboard", desc: "See all vehicles, compliance dates, and status at a glance." },
];

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    // If already signed in via Firebase, go straight to app
    if (auth.currentUser) router.replace("/");
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    try {
      await signInWithPopup(auth, googleProvider);
      // AppShell will handle upsert into users table on next render
      router.replace("/");
    } catch (err: any) {
      if (err?.code !== "auth/popup-closed-by-user") {
        setError(err?.message || "Google sign-in failed. Try again.");
      }
    } finally {
      setLoading(false);
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
          <p style={{ color: "#888", fontSize: 14, margin: "0 0 28px" }}>Sign in with your Google account to continue</p>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", color: "#dc2626", fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
              gap: 10, padding: "15px 16px", borderRadius: 10, border: "1.5px solid #e0e0ee",
              background: "white", color: "#1a1a2e", fontSize: 15, fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            {loading ? "Signing in…" : "Continue with Google"}
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
