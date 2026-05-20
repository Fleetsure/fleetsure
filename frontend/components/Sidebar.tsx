"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Truck, Users, Route,
  Wrench, Fuel, HeartPulse, ReceiptText, Circle, PackageOpen, BarChart2, TrendingUp,
  ShieldCheck, FileText, ChevronDown, ChevronUp, Settings,
  PlusCircle, UserCircle, LogOut, Building2, Upload,
  Menu, X, IndianRupee, ArrowLeftRight,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useLanguage } from "@/lib/LanguageContext";

const PROFILE_MENU_KEYS = [
  { labelKey: "common.profile" as const, icon: UserCircle, href: "/settings", tab: "profile" },
  { divider: true },
  { labelKey: "common.logout" as const, icon: LogOut, href: "/logout", danger: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const [openGroups, setOpenGroups] = useState<string[]>(["EXPENSES", "COMPLIANCE"]);

  const NAV = [
    { label: t("nav.home"),     href: "/",         icon: LayoutDashboard },
    { label: t("nav.vehicles"), href: "/vehicles", icon: Truck },
    { label: t("nav.drivers"),  href: "/drivers",  icon: Users },
    { label: t("nav.trips"),    href: "/trips",    icon: Route },
    {
      label: t("nav.expenses"), group: true,
      children: [
        { label: t("nav.services"),      href: "/expenses",      icon: Wrench },
        { label: t("nav.fuel"),          href: "/fuel",          icon: Fuel },
        { label: t("nav.tolls"),         href: "/tolls",         icon: ReceiptText },
        { label: t("nav.tyres"),         href: "/tyres",         icon: Circle },
        { label: t("nav.misc_expenses"), href: "/misc-expenses", icon: PackageOpen },
      ]
    },
    {
      label: t("nav.compliance"), group: true,
      children: [
        { label: t("nav.fleet_health"), href: "/fleet-health", icon: HeartPulse },
        { label: t("nav.insurance"),    href: "/insurance",    icon: ShieldCheck },
      ]
    },
    { label: t("nav.analytics"),   href: "/analytics",   icon: TrendingUp },
    { label: t("nav.marketplace"), href: "/marketplace", icon: ArrowLeftRight },
    { label: t("nav.parties"),     href: "/parties",     icon: Building2 },
    { label: t("nav.documents"),   href: "/documents",   icon: FileText },
    { label: t("nav.reports"),     href: "/reports",     icon: BarChart2 },
    { label: t("nav.import"),      href: "/import",      icon: Upload },
    { label: t("nav.settings"),    href: "/settings",    icon: Settings },
  ];

  const BOTTOM_NAV = [
    { label: t("nav.home"),     href: "/",         icon: LayoutDashboard },
    { label: t("nav.trips"),    href: "/trips",    icon: Route },
    { label: t("nav.vehicles"), href: "/vehicles", icon: Truck },
    { label: t("nav.expenses"), href: "/expenses", icon: IndianRupee },
    { label: "More",            href: null,        icon: Menu },
  ];

  const [profileOpen, setProfileOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [orgName, setOrgName]   = useState("");
  const [orgLogo, setOrgLogo]   = useState("");
  const [userName, setUserName] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const loadProfile = async () => {
    const fbUser = auth.currentUser;
    if (!fbUser) return;

    setUserName(fbUser.displayName || fbUser.email || "");

    const { data } = await supabase.from("users").select("org_name, org_logo, name").eq("id", fbUser.uid).single();
    if (data) {
      setOrgName(data.org_name || "");
      setOrgLogo(data.org_logo || "");
      if (data.name) setUserName(data.name);
    }
  };

  useEffect(() => {
    loadProfile();
    window.addEventListener("orgSettingsUpdated", loadProfile);
    return () => window.removeEventListener("orgSettingsUpdated", loadProfile);
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

  // ── MOBILE LAYOUT ─────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {drawerOpen && (
          <div
            onClick={() => setDrawerOpen(false)}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
              zIndex: 998, backdropFilter: "blur(2px)",
            }}
          />
        )}

        <div style={{
          position: "fixed", left: 0, right: 0, bottom: 60,
          height: drawerOpen ? "75vh" : 0,
          background: "#1E2D8E",
          borderRadius: "20px 20px 0 0",
          overflow: "hidden",
          transition: "height 0.3s cubic-bezier(0.4,0,0.2,1)",
          zIndex: 999,
          display: "flex", flexDirection: "column",
        }}>
          <div style={{ padding: "16px 20px 10px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {orgLogo
                ? <img src={orgLogo} alt="Logo" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,255,255,0.3)" }} />
                : <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 13 }}>
                    {(orgName || userName || "F")[0].toUpperCase()}
                  </div>
              }
              <div>
                <div style={{ color: "white", fontSize: 13, fontWeight: 700 }}>{orgName || "My Fleet"}</div>
                <div style={{ color: "#8fa0d8", fontSize: 11 }}>{userName || "Fleet Owner"}</div>
              </div>
            </div>
            <button onClick={() => setDrawerOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "white", padding: 4 }}>
              <X size={20} />
            </button>
          </div>

          <nav style={{ flex: 1, overflowY: "auto", padding: "8px 12px" }}>
            {NAV.map((item: any) => {
              if (item.group) {
                const open = openGroups.includes(item.label);
                return (
                  <div key={item.label} style={{ marginTop: 4 }}>
                    <button onClick={() => setOpenGroups(prev => prev.includes(item.label) ? prev.filter(g => g !== item.label) : [...prev, item.label])}
                      style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 14px", color: "#8fa0d8", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      {item.label}
                      {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    {open && item.children.map((child: any) => (
                      <Link key={child.href} href={child.href}
                        className={`sidebar-link ${pathname === child.href ? "active" : ""}`}
                        style={{ fontSize: 14, padding: "10px 14px" }}>
                        <child.icon size={16} />{child.label}
                      </Link>
                    ))}
                  </div>
                );
              }
              return (
                <Link key={item.href} href={item.href}
                  className={`sidebar-link ${pathname === item.href ? "active" : ""}`}
                  style={{ fontSize: 14, padding: "10px 14px" }}>
                  <item.icon size={16} />{item.label}
                </Link>
              );
            })}

            <button onClick={handleLogout}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "none", border: "none", cursor: "pointer", color: "#ff8a80", fontSize: 14, fontWeight: 500, marginTop: 8 }}>
              <LogOut size={16} /> {t("common.logout")}
            </button>
          </nav>

          <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.1)", flexShrink: 0 }}>
            <Link href="/trips" style={{ textDecoration: "none" }}>
              <button style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                <PlusCircle size={16} /> Log Trip
              </button>
            </Link>
          </div>
        </div>

        <nav style={{
          position: "fixed", bottom: 0, left: 0, right: 0, height: 60,
          background: "#1E2D8E",
          display: "flex", alignItems: "stretch",
          zIndex: 1000,
          borderTop: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.2)",
        }}>
          {BOTTOM_NAV.map(tab => {
            const isMore = tab.href === null;
            const isActive = isMore ? drawerOpen : (tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href!));
            const Icon = tab.icon;
            return (
              <button
                key={tab.label}
                onClick={() => {
                  if (isMore) { setDrawerOpen(d => !d); }
                  else { router.push(tab.href!); }
                }}
                style={{
                  flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
                  background: "none", border: "none", cursor: "pointer",
                  color: isActive ? "white" : "rgba(255,255,255,0.45)",
                  transition: "color 0.15s",
                  position: "relative",
                }}
              >
                {isActive && (
                  <div style={{ position: "absolute", top: 0, left: "20%", right: "20%", height: 2, background: "white", borderRadius: "0 0 2px 2px" }} />
                )}
                <Icon size={20} />
                <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500 }}>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </>
    );
  }

  // ── DESKTOP LAYOUT ────────────────────────────────────────────────────────────
  return (
    <aside style={{ width: 220, minHeight: "100vh", background: "#1E2D8E", display: "flex", flexDirection: "column", padding: "0 10px 20px", position: "relative" }}>

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

      <div ref={profileRef} style={{ position: "relative" }}>
        <div onClick={() => setProfileOpen(p => !p)}
          style={{ padding: "10px 6px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: 8, cursor: "pointer", borderRadius: 8, transition: "background 0.15s" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              {orgLogo
                ? <img src={orgLogo} alt="Org Logo" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,255,255,0.3)", flexShrink: 0 }} />
                : <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                    {(orgName || userName || "F")[0].toUpperCase()}
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

        {profileOpen && (
          <div style={{ position: "absolute", top: "100%", left: -10, right: -10, zIndex: 999, background: "white", borderRadius: 12, boxShadow: "0 12px 40px rgba(0,0,0,0.2)", padding: "6px 0 8px", marginTop: 4 }}>
            <div style={{ padding: "12px 16px 12px", borderBottom: "1px solid #f0f0f5", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {orgLogo
                  ? <img src={orgLogo} alt="Logo" style={{ width: 34, height: 34, borderRadius: 8, objectFit: "cover", border: "1.5px solid #e8eaf6" }} />
                  : <div style={{ width: 34, height: 34, borderRadius: 8, background: "#e8eaf6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#1E2D8E" }}>
                      {(orgName || userName || "F")[0].toUpperCase()}
                    </div>
                }
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1a1a2e", lineHeight: 1.2 }}>{orgName || "My Fleet"}</div>
                  <div style={{ fontSize: 11.5, color: "#888", marginTop: 2 }}>{userName || "Fleet Owner"}</div>
                </div>
              </div>
            </div>
            {PROFILE_MENU_KEYS.map((item: any, i) => {
              if (item.divider) return <div key={i} style={{ height: 1, background: "#f0f0f5", margin: "6px 0" }} />;
              const label = t(item.labelKey);
              if (item.danger) return (
                <button key={label} onClick={() => { setProfileOpen(false); handleLogout(); }}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", width: "100%", background: "none", border: "none", cursor: "pointer", color: "#e53935", fontSize: 13, fontWeight: 500 }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#fff5f5")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <item.icon size={15} color="#e53935" />
                  <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
                </button>
              );
              const href = item.tab ? `${item.href}?tab=${item.tab}` : item.href;
              return (
                <Link key={label} href={href} onClick={() => setProfileOpen(false)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", textDecoration: "none", color: "#2a2a4a", fontSize: 13, fontWeight: 500 }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#f8f9ff")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <item.icon size={15} color="#888" />
                  <span style={{ flex: 1 }}>{label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <nav style={{ flex: 1 }}>
        {NAV.map((item: any) => {
          if (item.group) {
            const open = openGroups.includes(item.label);
            return (
              <div key={item.label} style={{ marginTop: 6 }}>
                <button onClick={() => setOpenGroups(prev => prev.includes(item.label) ? prev.filter(g => g !== item.label) : [...prev, item.label])}
                  style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 14px", color: "#8fa0d8", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {item.label}
                  {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
                {open && item.children.map((child: any) => (
                  <Link key={child.href} href={child.href} className={`sidebar-link ${pathname === child.href ? "active" : ""}`}>
                    <child.icon size={16} />{child.label}
                  </Link>
                ))}
              </div>
            );
          }
          return (
            <Link key={item.href} href={item.href} className={`sidebar-link ${pathname === item.href ? "active" : ""}`}>
              <item.icon size={16} />{item.label}
            </Link>
          );
        })}
      </nav>

      <Link href="/trips" style={{ margin: "0 4px" }}>
        <button className="btn-primary" style={{ width: "100%", justifyContent: "center", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)" }}>
          <PlusCircle size={15} /> Log Trip
        </button>
      </Link>
    </aside>
  );
}
