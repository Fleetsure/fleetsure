"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { TeamAuthProvider, useTeamAuth } from "@/lib/teamAuth";
import { LayoutDashboard, Route, IndianRupee, LogOut, FileText, Wallet } from "lucide-react";

const NAV = [
  { label: "Dashboard",        href: "/accountant/dashboard", icon: LayoutDashboard },
  { label: "P&L Report",       href: "/accountant/reports",   icon: FileText },
  { label: "Trips",            href: "/accountant/trips",     icon: Route },
  { label: "Expenses",         href: "/accountant/expenses",  icon: IndianRupee },
  { label: "Driver Payments",  href: "/accountant/payments",  icon: Wallet },
];

function AccountantShell({ children }: { children: React.ReactNode }) {
  const { member, loading } = useTeamAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isLoginPage = pathname === "/accountant/login";

  useEffect(() => {
    if (loading) return;
    if (!member && !isLoginPage) router.replace("/accountant/login");
    if (member && isLoginPage) router.replace("/accountant/dashboard");
  }, [loading, member, isLoginPage, router]);

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
    router.replace("/accountant/login");
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#f4f5f9" }}>
      {/* Sidebar */}
      <aside style={{
        width: 230, background: "#1a3a5c", color: "white",
        display: "flex", flexDirection: "column", flexShrink: 0,
        height: "100vh", overflowY: "auto",
      }}>
        <div style={{ padding: "22px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.5 }}>FleetSure</div>
          <div style={{ fontSize: 11, opacity: 0.55, marginTop: 2 }}>Accountant Portal</div>
        </div>

        <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.92 }}>{member.name}</div>
          <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>{member.job_title || "Accountant"}</div>
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

        <div style={{ padding: "8px 10px 10px" }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.06)", marginBottom: 8 }}>
            <div style={{ fontSize: 10, opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Access level</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>View-only — no edits</div>
          </div>
          <button onClick={logout} style={{
            width: "100%", padding: "10px 12px", borderRadius: 8, border: "none",
            background: "rgba(255,255,255,0.08)", color: "white", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8, fontSize: 13, opacity: 0.7,
          }}>
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {children}
      </main>
    </div>
  );
}

export default function AccountantLayout({ children }: { children: React.ReactNode }) {
  return (
    <TeamAuthProvider requiredRole="accountant">
      <AccountantShell>{children}</AccountantShell>
    </TeamAuthProvider>
  );
}
