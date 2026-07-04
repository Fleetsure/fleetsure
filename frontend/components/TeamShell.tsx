"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useTeamAuth } from "@/lib/teamAuth";
import { LogOut, LucideIcon } from "lucide-react";

export interface TeamNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

type Role = "manager" | "accountant";

const ROLE_CONFIG: Record<Role, {
  portalLabel: string;
  sidebarBg: string;
  jobTitleFallback: string;
  loginPath: string;
  dashboardPath: string;
  showAccessBanner: boolean;
}> = {
  manager: {
    portalLabel: "Manager Portal",
    sidebarBg: "#1E2D8E",
    jobTitleFallback: "Fleet Manager",
    loginPath: "/manager/login",
    dashboardPath: "/manager/dashboard",
    showAccessBanner: false,
  },
  accountant: {
    portalLabel: "Accountant Portal",
    sidebarBg: "#1a3a5c",
    jobTitleFallback: "Accountant",
    loginPath: "/accountant/login",
    dashboardPath: "/accountant/dashboard",
    showAccessBanner: true,
  },
};

export default function TeamShell({ role, navItems, children }: {
  role: Role;
  navItems: TeamNavItem[];
  children: React.ReactNode;
}) {
  const cfg = ROLE_CONFIG[role];
  const { member, loading } = useTeamAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === cfg.loginPath;

  useEffect(() => {
    if (loading) return;
    if (!member && !isLoginPage) router.replace(cfg.loginPath);
    if (member && isLoginPage) router.replace(cfg.dashboardPath);
  }, [loading, member, isLoginPage, router, cfg.loginPath, cfg.dashboardPath]);

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
    router.replace(cfg.loginPath);
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#f4f5f9" }}>
      {/* Sidebar */}
      <aside style={{
        width: 230, background: cfg.sidebarBg, color: "white",
        display: "flex", flexDirection: "column", flexShrink: 0,
        height: "100vh", overflowY: "auto",
      }}>
        <div style={{ padding: "22px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.5 }}>FleetSure</div>
          <div style={{ fontSize: 11, opacity: 0.55, marginTop: 2 }}>{cfg.portalLabel}</div>
        </div>

        <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.92 }}>{member.name}</div>
          <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>{member.job_title || cfg.jobTitleFallback}</div>
        </div>

        <nav style={{ flex: 1, padding: "10px 10px" }}>
          {navItems.map(item => {
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

        {cfg.showAccessBanner ? (
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
        ) : (
          <button onClick={logout} style={{
            margin: "0 10px 14px", padding: "10px 12px", borderRadius: 8, border: "none",
            background: "rgba(255,255,255,0.08)", color: "white", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8, fontSize: 13, opacity: 0.7,
          }}>
            <LogOut size={15} /> Sign Out
          </button>
        )}
      </aside>

      <main style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {children}
      </main>
    </div>
  );
}
