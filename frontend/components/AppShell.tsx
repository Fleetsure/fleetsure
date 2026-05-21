"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";

const PUBLIC_ROUTES = ["/login", "/register"];

function OnboardingModal({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ name: "", org_name: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.org_name.trim()) {
      setError("Name and fleet/business name are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const uid = auth.currentUser?.uid;
      const fbUser = auth.currentUser;
      if (!uid || !fbUser) throw new Error("Not logged in");

      // Try update first; if no row exists yet, insert
      const { data: existing } = await supabase.from("users").select("id").eq("id", uid).single();
      let error;
      if (existing) {
        ({ error } = await supabase.from("users").update({
          name: form.name.trim(),
          org_name: form.org_name.trim(),
          phone: form.phone.trim() || null,
        }).eq("id", uid));
      } else {
        ({ error } = await supabase.from("users").insert({
          id: uid,
          email: fbUser.email,
          name: form.name.trim(),
          org_name: form.org_name.trim(),
          phone: form.phone.trim() || null,
          google_picture: fbUser.photoURL || null,
          is_active: true,
        }));
      }
      if (error) throw error;
      onDone();
    } catch (err: any) {
      setError(err.message || "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 20 }}>
      <div style={{ background: "white", borderRadius: 16, padding: "36px 32px", width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#1a1a2e", marginBottom: 6 }}>Welcome to FleetSure! 🚛</div>
          <div style={{ fontSize: 14, color: "#888" }}>Tell us a bit about you and your fleet to get started.</div>
        </div>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 12px", color: "#dc2626", fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 5 }}>Your Name <span style={{ color: "#e53935" }}>*</span></label>
            <input
              type="text" required
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Ravi Kumar"
              style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e0e0ee", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 5 }}>Fleet / Business Name <span style={{ color: "#e53935" }}>*</span></label>
            <input
              type="text" required
              value={form.org_name}
              onChange={e => setForm(p => ({ ...p, org_name: e.target.value }))}
              placeholder="Ravi Transports"
              style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e0e0ee", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 5 }}>Phone Number</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              placeholder="+91 98765 43210"
              style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e0e0ee", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{ marginTop: 8, padding: "12px", background: "#1E2D8E", color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "Saving…" : "Get Started"}
          </button>
        </form>
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
    const { data: existing } = await supabase
      .from("users")
      .select("id, org_name, name, is_active")
      .eq("id", firebaseUser.uid)
      .single();

    if (!existing) {
      // New user — insert basic row and show onboarding
      await supabase.from("users").insert({
        id: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || firebaseUser.email,
        google_picture: firebaseUser.photoURL || null,
        is_active: true,
      });
      setShowOnboarding(true);
    } else if (!existing.is_active) {
      // Deactivated/deleted user — sign out
      await signOut(auth);
      router.replace("/login");
    } else if (!existing.org_name) {
      // Has row but no org_name — show onboarding
      setShowOnboarding(true);
    }
    // else: fully onboarded, do nothing
  };

  useEffect(() => {
    const isPublic = PUBLIC_ROUTES.includes(pathname);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (!checked) {
          // Only run the upsert check once on initial auth, not on every navigation
          await checkAndUpsertUser(user);
        }
        setChecked(true);
      } else {
        if (!isPublic) router.replace("/login");
        else setChecked(true);
      }
    });

    return () => unsubscribe();
  }, [pathname]);

  if (PUBLIC_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  if (!checked) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-page)",
        color: "var(--text-muted)",
        fontSize: 14,
      }}>
        Loading...
      </div>
    );
  }

  return (
    <>
      <Sidebar />
      <main style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        overflow: "auto",
        background: "var(--bg-page)",
        color: "var(--text-main)",
        paddingBottom: isMobile ? 60 : 0,
      }}>
        {children}
      </main>
      {showOnboarding && (
        <OnboardingModal onDone={() => {
          setShowOnboarding(false);
          window.dispatchEvent(new Event("orgSettingsUpdated"));
        }} />
      )}
    </>
  );
}
