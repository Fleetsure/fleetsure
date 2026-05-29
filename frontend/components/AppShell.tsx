"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { onIdTokenChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { supabase, setSupabaseAuthToken } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";


const PUBLIC_ROUTES = ["/login", "/register", "/landing"];
const DRIVER_PREFIX = "/driver";
const TEAM_PREFIXES = ["/manager", "/accountant"];
const isTeamRoute = (p: string) => TEAM_PREFIXES.some(pre => p.startsWith(pre));

function OnboardingModal({ onDone, onSkip }: { onDone: () => void; onSkip: () => void }) {
  const [form, setForm] = useState({ name: "", org_name: "", phone: "", gst_number: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.org_name.trim()) {
      setError("Name and company/business name are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const uid = auth.currentUser?.uid;
      const fbUser = auth.currentUser;
      if (!uid || !fbUser) throw new Error("Not logged in");

      const { data: existing } = await supabase.from("users").select("id").eq("id", uid).single();
      let dbError;
      if (existing) {
        ({ error: dbError } = await supabase.from("users").update({
          name: form.name.trim(),
          org_name: form.org_name.trim(),
          phone: form.phone.trim() || null,
          gst_number: form.gst_number.trim() || null,
        }).eq("id", uid));
      } else {
        ({ error: dbError } = await supabase.from("users").insert({
          id: uid,
          email: fbUser.email,
          name: form.name.trim(),
          org_name: form.org_name.trim(),
          phone: form.phone.trim() || null,
          gst_number: form.gst_number.trim() || null,
          google_picture: fbUser.photoURL || null,
          is_active: true,
        }));
      }
      if (dbError) throw dbError;
      // Clear any skip flag since user has now fully onboarded
      localStorage.removeItem(`fleetsure_ob_skipped_${uid}`);
      onDone();
    } catch (err: any) {
      setError(err.message || "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    border: "1.5px solid #e0e0ee",
    borderRadius: 8,
    fontSize: 14,
    boxSizing: "border-box",
    outline: "none",
    fontFamily: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#555",
    marginBottom: 5,
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 2000, padding: 20,
    }}>
      <div style={{
        background: "white", borderRadius: 20,
        width: "100%", maxWidth: 480,
        boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #1E2D8E 0%, #1565c0 100%)",
          padding: "28px 32px 24px",
        }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "white", marginBottom: 6 }}>
            Welcome to FleetSure!
          </div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>
            Set up your fleet profile to get started. You can always update these details later in Settings.
          </div>
        </div>

        {/* Form */}
        <div style={{ padding: "28px 32px" }}>
          {error && (
            <div style={{
              background: "#fef2f2", border: "1px solid #fecaca",
              borderRadius: 8, padding: "10px 12px",
              color: "#dc2626", fontSize: 13, marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={labelStyle}>
                Your Name <span style={{ color: "#e53935" }}>*</span>
              </label>
              <input
                type="text" required
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Ravi Kumar"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Company / Business Name <span style={{ color: "#e53935" }}>*</span>
              </label>
              <input
                type="text" required
                value={form.org_name}
                onChange={e => setForm(p => ({ ...p, org_name: e.target.value }))}
                placeholder="Ravi Transports Pvt Ltd"
                style={inputStyle}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Phone Number</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>GST Number</label>
                <input
                  type="text"
                  value={form.gst_number}
                  onChange={e => setForm(p => ({ ...p, gst_number: e.target.value.toUpperCase() }))}
                  placeholder="29ABCDE1234F1Z5"
                  maxLength={15}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: "13px",
                  background: saving ? "#9ba4c4" : "#1E2D8E",
                  color: "white", border: "none", borderRadius: 8,
                  fontSize: 15, fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer",
                  transition: "background 0.15s",
                }}
              >
                {saving ? "Saving…" : "Get Started"}
              </button>

              <button
                type="button"
                onClick={onSkip}
                style={{
                  padding: "11px",
                  background: "transparent", color: "#888",
                  border: "1.5px solid #e0e0ee", borderRadius: 8,
                  fontSize: 14, fontWeight: 500, cursor: "pointer",
                }}
              >
                Skip for now
              </button>
            </div>

            <p style={{ fontSize: 12, color: "#bbb", textAlign: "center", margin: 0 }}>
              Phone and GST are optional — you can add them later in Settings.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const checkAndUpsertUser = async (firebaseUser: any) => {
    const uid = firebaseUser.uid;

    // Detect team members (manager / accountant) and route them to their dashboard
    try {
      const { data: teamMember } = await supabase
        .from("team_members")
        .select("role, is_active")
        .or(`firebase_uid.eq.${uid},email.eq.${firebaseUser.email}`)
        .eq("is_active", true)
        .maybeSingle();

      if (teamMember) {
        if (teamMember.role === "manager")    router.replace("/manager/dashboard");
        else if (teamMember.role === "accountant") router.replace("/accountant/dashboard");
        setChecked(true);
        return;
      }
    } catch { /* team_members table may not exist yet */ }

    const { data: existing } = await supabase
      .from("users")
      .select("id, org_name, name, is_active")
      .eq("id", uid)
      .single();

    if (!existing) {
      // New user — insert basic row and show onboarding
      await supabase.from("users").insert({
        id: uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || firebaseUser.email,
        google_picture: firebaseUser.photoURL || null,
        is_active: true,
        last_login_at: new Date().toISOString(),
      });
      setShowOnboarding(true);
    } else if (!existing.is_active) {
      await signOut(auth);
      router.replace("/login");
    } else {
      // Update last login timestamp on every sign-in
      supabase.from("users").update({ last_login_at: new Date().toISOString() }).eq("id", uid);

      // Show onboarding if org_name is missing and user hasn't explicitly skipped
      const skipped = localStorage.getItem(`fleetsure_ob_skipped_${uid}`);
      if (!existing.org_name && !skipped) {
        setShowOnboarding(true);
      }
    }
  };

  useEffect(() => {
    // Driver/team portals manage their own auth — skip fleet-owner auth entirely
    if (pathname.startsWith(DRIVER_PREFIX) || isTeamRoute(pathname)) { setChecked(true); return; }

    const isPublic = PUBLIC_ROUTES.includes(pathname);

    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      if (user) {
        // Pass the Firebase ID token directly — Supabase Third-Party Auth
        // verifies it against Google's JWKS, no token exchange needed.
        const idToken = await user.getIdToken();
        setSupabaseAuthToken(idToken);

        if (!checked) {
          await checkAndUpsertUser(user);
        }
        setChecked(true);
      } else {
        setSupabaseAuthToken(null);
        if (!isPublic) router.replace("/landing");
        else setChecked(true);
      }
    });

    return () => unsubscribe();
  }, [pathname]);

  if (PUBLIC_ROUTES.includes(pathname) || pathname.startsWith(DRIVER_PREFIX + "/") || pathname === DRIVER_PREFIX || isTeamRoute(pathname)) {
    return <div style={{ width: "100%", minHeight: "100vh" }}>{children}</div>;
  }

  if (!checked) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--bg-page)", color: "var(--text-muted)", fontSize: 14,
      }}>
        Loading...
      </div>
    );
  }

  const handleSkip = () => {
    const uid = auth.currentUser?.uid;
    if (uid) localStorage.setItem(`fleetsure_ob_skipped_${uid}`, "1");
    setShowOnboarding(false);
  };

  return (
    <>
      <Sidebar />
      <main style={{
        flex: 1, display: "flex", flexDirection: "column",
        minHeight: "100vh", overflow: "auto",
        background: "var(--bg-page)", color: "var(--text-main)",
        paddingBottom: isMobile ? 60 : 0,
      }}>
        {children}
      </main>
      {showOnboarding && (
        <OnboardingModal
          onDone={() => {
            setShowOnboarding(false);
            window.dispatchEvent(new Event("orgSettingsUpdated"));
          }}
          onSkip={handleSkip}
        />
      )}
    </>
  );
}
