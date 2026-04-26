"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Truck, Users, Route,
  Wrench, Fuel, CreditCard, HeartPulse,
  ShieldCheck, FileText, ChevronDown, ChevronUp, Settings,
  PlusCircle, UserCog, Upload, Zap, UserCircle, Bell, Lock, LogOut
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";

const NAV = [
  { label: "Home",     href: "/",         icon: LayoutDashboard },
  { label: "Vehicles", href: "/vehicles", icon: Truck },
  { label: "Drivers",  href: "/drivers",  icon: Users },
  { label: "Trips",    href: "/trips",    icon: Route },
  {
    label: "EXPENSES", group: true,
    children: [
      { label: "Services", href: "/expenses", icon: Wrench },
      { label: "Fuel",     href: "/fuel",     icon: Fuel },
      { label: "FASTag",   href: "/fastag",   icon: CreditCard },
    ]
  },
  {
    label: "COMPLIANCE", group: true,
    children: [
      { label: "Fleet Health",         href: "/fleet-health", icon: HeartPulse },
      { label: "Insurance & Renewals", href: "/insurance",    icon: ShieldCheck },
    ]
  },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Settings",  href: "/settings",  icon: Settings },
];

// ── Profile dropdown menu definition ─────────────────────────────────────────
// href → navigates to /settings?tab=X
// soon → renders as disabled "Coming Soon" pill instead of a link
// danger → red styling (Log Out)

const PROFILE_MENU = [
  // ── Fleet
  { section: "Fleet" },
  { label: "Settings",               icon: Settings,    href: "/settings",              tab: "general" },
  { label: "Billing & Subscriptions",icon: CreditCard,  href: "/settings",              tab: "billing" },
  { label: "User Management",        icon: UserCog,     href: "/settings",              tab: "manage-users" },
  // ── Tools
  { section: "Tools" },
  { label: "Imports",                icon: Upload,      soon: "Soon", soonNote: "OCR for handwritten documents — coming soon" },
  { label: "Automations",            icon: Zap,         soon: "Soon", soonNote: "Rule-based automation — coming soon" },
  // ── My Account
  { section: "My Account" },
  { label: "User Profile",           icon: UserCircle,  href: "/settings",              tab: "profile" },
  { label: "Notification Settings",  icon: Bell,        href: "/settings",              tab: "notifications" },
  { label: "Login & Password",       icon: Lock,        href: "/settings",              tab: "password" },
  // ── Danger
  { divider: true },
  { label: "Log Out",                icon: LogOut,      href: "/logout",                danger: true },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [openGroups, setOpenGroups] = useState<string[]>(["EXPENSES", "COMPLIANCE"]);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [orgName, setOrgName]   = useState("");
  const [orgLogo, setOrgLogo]   = useState("");
  const [userName, setUserName] = useState("");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    localStorage.removeItem("userId");
    router.push("/login");
  };

  const loadOrgSettings = () => {
    setOrgName(localStorage.getItem("orgName") || "");
    setOrgLogo(localStorage.getItem("orgLogo") || "");
    setUserName(localStorage.getItem("userName") || "");
  };

  const toggleGroup = (label: string) =>
    setOpenGroups(prev =>
      prev.includes(label) ? prev.filter(g => g !== label) : [...prev, label]
    );

  useEffect(() => {
    loadOrgSettings();
    window.addEventListener("orgSettingsUpdated", loadOrgSettings);
    window.addEventListener("storage", loadOrgSettings);
    return () => {
      window.removeEventListener("orgSettingsUpdated", loadOrgSettings);
      window.removeEventListener("storage", loadOrgSettings);
    };
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <aside style={{ width: 220, minHeight: "100vh", background: "#1E2D8E", display: "flex", flexDirection: "column", padding: "0 10px 20px", position: "relative" }}>

      {/* Logo */}
      <Link href="/" style={{ textDecoration: "none" }}>
        <div style={{ padding: "20px 6px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)", marginBottom: 8, cursor: "pointer", borderRadius: 8, transition: "background 0.15s" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Image src="/logo.png" alt="FleetSure Logo" width={36} height={36} style={{ borderRadius: 8 }} />
            <div>
              <div style={{ color: "white", fontWeight: 700, fontSize: 15, lineHeight: 1 }}>FleetSure</div>
              <div style={{ color: "#8fa0d8", fontSize: 11 }}>Fleet Management</div>
            </div>
          </div>
        </div>
      </Link>

      {/* User / profile trigger */}
      <div ref={profileRef} style={{ position: "relative" }}>
        <div
          onClick={() => setProfileOpen(p => !p)}
          style={{ padding: "10px 6px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: 8, cursor: "pointer", borderRadius: 8, transition: "background 0.15s" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              {orgLogo
                ? <img src={orgLogo} alt="Org Logo" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,255,255,0.3)", flexShrink: 0 }} />
                : <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                    {(orgName || "F")[0].toUpperCase()}
                  </div>
              }
              <div style={{ minWidth: 0 }}>
                <div style={{ color: "white", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {orgName || "My Fleet"}
                </div>
                <div style={{ color: "#8fa0d8", fontSize: 11 }}>{userName || "Fleet Owner"}</div>
              </div>
            </div>
            <ChevronDown size={13} color="#8fa0d8" style={{ transform: profileOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s", flexShrink: 0 }} />
          </div>
        </div>

        {/* ── Profile dropdown ── */}
        {profileOpen && (
          <div style={{
            position: "absolute", top: "100%", left: -10, right: -10, zIndex: 999,
            background: "white", borderRadius: 12, boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
            padding: "6px 0 8px", marginTop: 4,
          }}>
            {/* Header — org name + user name */}
            <div style={{ padding: "12px 16px 12px", borderBottom: "1px solid #f0f0f5", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {orgLogo
                  ? <img src={orgLogo} alt="Logo" style={{ width: 34, height: 34, borderRadius: 8, objectFit: "cover", border: "1.5px solid #e8eaf6" }} />
                  : <div style={{ width: 34, height: 34, borderRadius: 8, background: "#e8eaf6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#1E2D8E" }}>
                      {(orgName || "F")[0].toUpperCase()}
                    </div>
                }
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1a1a2e", lineHeight: 1.2 }}>{orgName || "My Fleet"}</div>
                  <div style={{ fontSize: 11.5, color: "#888", marginTop: 2 }}>{userName || "Fleet Owner"}</div>
                </div>
              </div>
            </div>

            {/* Menu items */}
            {PROFILE_MENU.map((item: any, i) => {

              // Section label
              if (item.section) return (
                <div key={i} style={{ fontSize: 10, fontWeight: 700, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.07em", padding: "8px 16px 3px" }}>
                  {item.section}
                </div>
              );

              // Divider
              if (item.divider) return <div key={i} style={{ height: 1, background: "#f0f0f5", margin: "6px 0" }} />;

              // Coming Soon — disabled row with tooltip
              if (item.soon && !item.href) return (
                <div key={item.label} title={item.soonNote || "Coming soon"}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", opacity: 0.5, cursor: "not-allowed" }}>
                  <item.icon size={15} color="#bbb" />
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#aaa", flex: 1 }}>{item.label}</span>
                  <span style={{ fontSize: 9.5, fontWeight: 700, padding: "2px 6px", borderRadius: 6, background: "#fff3e0", color: "#e65100" }}>Soon</span>
                </div>
              );

              // Logout — special handler
              if (item.danger) return (
                <button key={item.label}
                  onClick={() => { setProfileOpen(false); handleLogout(); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 16px",
                    width: "100%", background: "none", border: "none", cursor: "pointer",
                    color: "#e53935", fontSize: 13, fontWeight: 500, transition: "background 0.12s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#fff5f5")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <item.icon size={15} color="#e53935" />
                  <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
                </button>
              );

              // Coming Soon but has href (e.g. Billing) — clickable but badged
              const href = item.tab ? `${item.href}?tab=${item.tab}` : item.href;

              return (
                <Link key={item.label} href={href}
                  onClick={() => setProfileOpen(false)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 16px",
                    textDecoration: "none", color: "#2a2a4a",
                    fontSize: 13, fontWeight: 500, transition: "background 0.12s"
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#f8f9ff")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <item.icon size={15} color="#888" />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.soon && (
                    <span style={{ fontSize: 9.5, fontWeight: 700, padding: "2px 6px", borderRadius: 6, background: "#fff3e0", color: "#e65100" }}>Soon</span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1 }}>
        {NAV.map((item: any) => {
          if (item.group) {
            const open = openGroups.includes(item.label);
            return (
              <div key={item.label} style={{ marginTop: 6 }}>
                <button onClick={() => toggleGroup(item.label)}
                  style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 14px", color: "#8fa0d8", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {item.label}
                  {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
                {open && item.children.map((child: any) => (
                  <Link key={child.href} href={child.href} className={`sidebar-link ${pathname === child.href ? "active" : ""}`}>
                    <child.icon size={16} />
                    {child.label}
                  </Link>
                ))}
              </div>
            );
          }
          return (
            <Link key={item.href} href={item.href} className={`sidebar-link ${pathname === item.href ? "active" : ""}`}>
              <item.icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Log Trip CTA */}
      <Link href="/trips" style={{ margin: "0 4px" }}>
        <button className="btn-primary" style={{ width: "100%", justifyContent: "center", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)" }}>
          <PlusCircle size={15} />
          Log Trip
        </button>
      </Link>
    </aside>
  );
}
