"use client";
import { useState } from "react";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Role = "manager" | "accountant";

const ROLE_CONFIG: Record<Role, {
  portalLabel: string;
  bg: string;
  gradient: string;
  accent: string;
  dashboardPath: string;
  otherRole: Role;
  otherDashboardPath: string;
  deniedMessage: string;
}> = {
  manager: {
    portalLabel: "Manager Portal",
    bg: "#f4f5f9",
    gradient: "linear-gradient(135deg, #1E2D8E 0%, #1565c0 100%)",
    accent: "#1E2D8E",
    dashboardPath: "/manager/dashboard",
    otherRole: "accountant",
    otherDashboardPath: "/accountant/dashboard",
    deniedMessage: "You are not registered as a manager. Contact your fleet owner.",
  },
  accountant: {
    portalLabel: "Accountant Portal",
    bg: "#f0f4f8",
    gradient: "linear-gradient(135deg, #1a3a5c 0%, #1565c0 100%)",
    accent: "#1a3a5c",
    dashboardPath: "/accountant/dashboard",
    otherRole: "manager",
    otherDashboardPath: "/manager/dashboard",
    deniedMessage: "You are not registered as an accountant. Contact your fleet owner.",
  },
};

export default function RoleLoginPage({ role }: { role: Role }) {
  const cfg = ROLE_CONFIG[role];
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const redirectIfTeamMember = async () => {
    const { data } = await supabase.rpc("get_team_role");
    if (data === role) router.replace(cfg.dashboardPath);
    else if (data === cfg.otherRole) router.replace(cfg.otherDashboardPath);
    else setError(cfg.deniedMessage);
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      await redirectIfTeamMember();
    } catch (err: any) {
      setError(err.message?.replace("Firebase: ", "") || "Sign in failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true); setError("");
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      await redirectIfTeamMember();
    } catch (err: any) {
      setError(err.message?.replace("Firebase: ", "") || "Google sign in failed.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "11px 14px",
    border: "1.5px solid #e0e0ee", borderRadius: 10,
    fontSize: 14, boxSizing: "border-box", outline: "none",
  };

  return (
    <div style={{
      minHeight: "100vh", background: cfg.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Header */}
        <div style={{
          background: cfg.gradient,
          borderRadius: "16px 16px 0 0", padding: "28px 32px 24px",
        }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "white", marginBottom: 4 }}>
            FleetSure
          </div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>
            {cfg.portalLabel} — Sign in to continue
          </div>
        </div>

        {/* Form */}
        <div style={{ background: "white", borderRadius: "0 0 16px 16px", padding: "28px 32px", boxShadow: "0 8px 32px rgba(0,0,0,0.1)" }}>
          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", color: "#dc2626", fontSize: 13, marginBottom: 18 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleEmail} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
                padding: "12px", background: loading ? "#9ba4c4" : cfg.accent,
                color: "white", border: "none", borderRadius: 10,
                fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                marginTop: 4,
              }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
            <div style={{ flex: 1, height: 1, background: "#e8e8f0" }} />
            <span style={{ fontSize: 12, color: "#aaa" }}>or</span>
            <div style={{ flex: 1, height: 1, background: "#e8e8f0" }} />
          </div>

          <button
            onClick={handleGoogle}
            disabled={loading}
            style={{
              width: "100%", padding: "11px", background: "white",
              border: "1.5px solid #e0e0ee", borderRadius: 10,
              fontSize: 14, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <p style={{ fontSize: 12, color: "#aaa", textAlign: "center", marginTop: 20, lineHeight: 1.6 }}>
            Only registered {role}s can access this portal.<br />
            Contact your fleet owner if you need access.
          </p>
        </div>
      </div>
    </div>
  );
}
