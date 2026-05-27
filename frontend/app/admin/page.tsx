"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { supabase } from "@/lib/supabase";

// Emails with admin access. Also checked against admin_users table in Supabase.
const HARDCODED_ADMIN_EMAILS = (
  process.env.NEXT_PUBLIC_ADMIN_EMAILS || ""
).split(",").map(e => e.trim()).filter(Boolean);

interface Metrics {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  totalVehicles: number;
  totalTrips: number;
  tripsThisMonth: number;
  totalFuelLogs: number;
}

interface RecentUser {
  id: string;
  email: string;
  name: string;
  org_name: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
}

export default function AdminPage() {
  const router = useRouter();
  const [access, setAccess] = useState<"checking" | "allowed" | "denied">("checking");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace("/login"); return; }

      const isHardcoded = HARDCODED_ADMIN_EMAILS.includes(user.email || "");
      if (isHardcoded) {
        setAccess("allowed");
        loadMetrics();
        return;
      }

      // Fall back to admin_users table in Supabase
      const { data } = await supabase
        .from("admin_users")
        .select("id")
        .eq("email", user.email)
        .maybeSingle();

      if (data) {
        setAccess("allowed");
        loadMetrics();
      } else {
        setAccess("denied");
      }
    });
    return () => unsub();
  }, []);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthStartISO = monthStart.toISOString();

      const [
        { count: totalUsers },
        { count: activeUsers },
        { count: newUsersThisMonth },
        { count: totalVehicles },
        { count: totalTrips },
        { count: tripsThisMonth },
        { count: totalFuelLogs },
        { data: recent },
      ] = await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("users").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("users").select("*", { count: "exact", head: true }).gte("created_at", monthStartISO),
        supabase.from("vehicles").select("*", { count: "exact", head: true }),
        supabase.from("trips").select("*", { count: "exact", head: true }),
        supabase.from("trips").select("*", { count: "exact", head: true }).gte("created_at", monthStartISO),
        supabase.from("fuel_logs").select("*", { count: "exact", head: true }),
        supabase
          .from("users")
          .select("id, email, name, org_name, phone, is_active, created_at, last_login_at")
          .order("created_at", { ascending: false })
          .limit(12),
      ]);

      setMetrics({
        totalUsers: totalUsers ?? 0,
        activeUsers: activeUsers ?? 0,
        newUsersThisMonth: newUsersThisMonth ?? 0,
        totalVehicles: totalVehicles ?? 0,
        totalTrips: totalTrips ?? 0,
        tripsThisMonth: tripsThisMonth ?? 0,
        totalFuelLogs: totalFuelLogs ?? 0,
      });
      setRecentUsers((recent as RecentUser[]) ?? []);
    } finally {
      setLoading(false);
    }
  };

  if (access === "checking") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f9ff" }}>
        <span style={{ color: "#888", fontSize: 14 }}>Verifying access…</span>
      </div>
    );
  }

  if (access === "denied") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8f9ff", gap: 16 }}>
        <div style={{ fontSize: 48 }}>🔒</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1a2e" }}>Access Denied</div>
        <div style={{ fontSize: 14, color: "#888" }}>You don't have permission to view this page.</div>
        <button
          onClick={() => router.push("/")}
          style={{ marginTop: 8, padding: "10px 24px", background: "#1E2D8E", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  const monthName = new Date().toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9ff", padding: "0 0 48px" }}>
      {/* Top bar */}
      <div style={{
        background: "white", borderBottom: "1px solid #e8eaf6",
        padding: "16px 32px", display: "flex", alignItems: "center",
        justifyContent: "space-between", gap: 16,
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => router.push("/")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: 13, display: "flex", alignItems: "center", gap: 4, padding: 0 }}
          >
            ← Dashboard
          </button>
          <span style={{ color: "#ddd" }}>|</span>
          <span style={{ fontSize: 17, fontWeight: 800, color: "#1a1a2e" }}>Admin Dashboard</span>
        </div>
        <button
          onClick={loadMetrics}
          disabled={loading}
          style={{
            padding: "8px 16px", background: loading ? "#e8eaf6" : "#1E2D8E",
            color: loading ? "#888" : "white", border: "none",
            borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>

        {/* Section: Platform Overview */}
        <SectionHeader title="Platform Overview" subtitle="All-time totals" />

        {loading ? (
          <SkeletonGrid count={7} />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 40 }}>
            <StatCard label="Total Users" value={metrics?.totalUsers ?? 0} icon="👥" color="#1E2D8E" />
            <StatCard label="Active Users" value={metrics?.activeUsers ?? 0} icon="✅" color="#16a34a" />
            <StatCard label="Inactive Users" value={(metrics?.totalUsers ?? 0) - (metrics?.activeUsers ?? 0)} icon="🚫" color="#dc2626" />
            <StatCard label="New This Month" value={metrics?.newUsersThisMonth ?? 0} icon="🆕" color="#7c3aed" sub={monthName} />
            <StatCard label="Total Vehicles" value={metrics?.totalVehicles ?? 0} icon="🚛" color="#0891b2" />
            <StatCard label="Total Trips" value={metrics?.totalTrips ?? 0} icon="🗺️" color="#d97706" />
            <StatCard label="Fuel Logs" value={metrics?.totalFuelLogs ?? 0} icon="⛽" color="#64748b" />
          </div>
        )}

        {/* Section: This Month */}
        <SectionHeader title="This Month" subtitle={monthName} />

        {loading ? (
          <SkeletonGrid count={2} />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 40 }}>
            <StatCard label="New Sign-ups" value={metrics?.newUsersThisMonth ?? 0} icon="✨" color="#1E2D8E" />
            <StatCard label="Trips This Month" value={metrics?.tripsThisMonth ?? 0} icon="🗺️" color="#d97706" />
          </div>
        )}

        {/* Section: Recent Sign-ups */}
        <SectionHeader title="Recent Sign-ups" subtitle="Latest 12 registrations" />

        <div style={{
          background: "white", borderRadius: 12,
          border: "1px solid #e8eaf6", overflow: "hidden",
        }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: "center", color: "#bbb", fontSize: 14 }}>Loading users…</div>
          ) : recentUsers.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "#bbb", fontSize: 14 }}>No users yet.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8f9ff" }}>
                    {["Name", "Email", "Phone", "Company", "Status", "Joined", "Last Login"].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, color: "#555", borderBottom: "1px solid #e8eaf6", whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((u, i) => (
                    <tr key={u.id} style={{ borderBottom: i < recentUsers.length - 1 ? "1px solid #f1f3f9" : "none" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: "#1a1a2e" }}>
                        {u.name || "—"}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#555" }}>
                        {u.email}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#555" }}>
                        {u.phone || <span style={{ color: "#ccc" }}>—</span>}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#555" }}>
                        {u.org_name || <span style={{ color: "#ccc" }}>Not set</span>}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          display: "inline-block",
                          padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                          background: u.is_active ? "#dcfce7" : "#fee2e2",
                          color: u.is_active ? "#16a34a" : "#dc2626",
                        }}>
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", color: "#888", whiteSpace: "nowrap" }}>
                        {formatDate(u.created_at)}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#888", whiteSpace: "nowrap" }}>
                        {u.last_login_at ? formatDate(u.last_login_at) : <span style={{ color: "#ddd" }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e" }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>{subtitle}</div>}
    </div>
  );
}

function StatCard({ label, value, icon, color, sub }: { label: string; value: number; icon: string; color: string; sub?: string }) {
  return (
    <div style={{
      background: "white", borderRadius: 12, padding: "20px 20px",
      border: "1px solid #e8eaf6",
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ fontSize: 24 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value.toLocaleString()}</div>
      <div style={{ fontSize: 13, color: "#888", fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "#bbb" }}>{sub}</div>}
    </div>
  );
}

function SkeletonGrid({ count }: { count: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 40 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ background: "#e8eaf6", borderRadius: 12, height: 110, animation: "pulse 1.4s ease-in-out infinite" }} />
      ))}
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
