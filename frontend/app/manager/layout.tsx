"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { TeamAuthProvider, useTeamAuth } from "@/lib/teamAuth";
import { LayoutDashboard, Route, Users, Truck, IndianRupee, AlertTriangle, Wallet, LogOut } from "lucide-react";

const NAV = [
  { label: "Dashboard", href: "/manager/dashboard", icon: LayoutDashboard },
  { label: "Trips",     href: "/manager/trips",     icon: Route },
  { label: "Drivers",   href: "/manager/drivers",   icon: Users },
  { label: "Vehicles",  href: "/manager/vehicles",  icon: Truck },
  { label: "Expenses",  href: "/manager/expenses",  icon: IndianRupee },
  { label: "Payments",  href: "/manager/payments",  icon: Wallet },
  { label: "Issues",    href: "/manager/issues",    icon: AlertTriangle },
];

function ManagerShell({ children }: { children: React.ReactNode }) {
  const { member, loading } = useTeamAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === "/manager/login";

  useEffect(() => {
    if (loading) return;
    if (!member && !isLoginPage) router.replace("/manager/login");
    if (member && isLoginPage) router.replace("/manager/dashboard");
  }, [loading, member, isLoginPage, router]);

  // Render login page without sidebar
  if (isLoginPage) return <>{children}</>;

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f4f5f9", color: "#888", fontSize: 14 }}>
        Loading...
      </div>
    );
  }
  if (!member) return null;

  const logout = async () => {
    await signOut(auth);
    router.replace("/manager/login");
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#f4f5f9" }}>
      {/* Sidebar */}
      <aside style={{
        width: 230, background: "#1E2D8E", color: "white",
        display: "flex", flexDirection: "column", flexShrink: 0,
        height: "100vh", overflowY: "auto",
      }}>
        <div style={{ padding: "22px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.5 }}>FleetSure</div>
          <div style={{ fontSize: 11, opacity: 0.55, marginTop: 2 }}>Manager Portal</div>
        </div>

        <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.92 }}>{member.name}</div>
          <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>{member.job_title || "Fleet Manager"}</div>
        </div>

        <nav style={{ flex: 1, padding: "10px 10px" }}>
          {NAV.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 8, marginBottom: 2,
                background: active ? "rgba(255,255,255,0.15)" : "transparent",
                color: "white", textDecoration: "none",
                fontSize: 13.5, fontWeight: active ? 600 : 400,
                opacity: active ? 1 : 0.7,
                transition: "all 0.15s",
              }}>
                <item.icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button onClick={logout} style={{
          margin: "0 10px 14px", padding: "10px 12px", borderRadius: 8, border: "none",
          background: "rgba(255,255,255,0.08)", color: "white", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 8, fontSize: 13, opacity: 0.7,
        }}>
          <LogOut size={15} /> Sign Out
        </button>
      </aside>

      <main style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {children}
      </main>
    </div>
  );
}

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <TeamAuthProvider requiredRole="manager">
      <ManagerShell>{children}</ManagerShell>
    </TeamAuthProvider>
  );
}
