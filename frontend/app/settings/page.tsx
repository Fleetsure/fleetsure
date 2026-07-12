"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import { useLanguage } from "@/lib/LanguageContext";
import { authService } from "@/lib/services/authService";
import {
  UserCircle, Bell, Lock, Palette,
  Settings, CreditCard, Download,
  Users, Globe, Receipt, Plug, AlertTriangle,
  Search, Upload, Phone, Building2,
} from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";
import ManageUsers from "./sections/ManageUsers";
import ManageFirms from "./sections/ManageFirms";
import ExportSettings from "./sections/ExportSettings";
import BillingSettings from "./sections/BillingSettings";
import IntegrationsSettings from "./sections/IntegrationsSettings";
import AppearanceSettings from "./sections/AppearanceSettings";
import PasswordSettings from "./sections/PasswordSettings";
import NotificationSettings from "./sections/NotificationSettings";

// ─── Sidebar sections ────────────────────────────────────────────────────────
const SECTIONS = [
  {
    label: "My Account",
    items: [
      { id: "profile",       label: "User Profile",          icon: UserCircle, desc: "Your name, email, and personal details" },
      { id: "notifications", label: "Notification Settings", icon: Bell,       desc: "How and when you get notified" },
      { id: "password",      label: "Login & Password",      icon: Lock,       desc: "Change your password securely" },
      { id: "appearance",    label: "Appearance & Theme",    icon: Palette,    desc: "Day / night mode and display preferences" },
    ]
  },
  {
    label: "Fleet Settings",
    items: [
      { id: "general",  label: "General Settings",        icon: Settings,    desc: "Organization name, timezone, currency" },
      { id: "firms",    label: "My Firms",                icon: Building2,   desc: "Manage multiple firms and switch between them" },
      { id: "billing",  label: "Billing & Subscriptions", icon: CreditCard,  desc: "Plan, invoices, and payment methods" },
      { id: "export",   label: "Export Account Data",     icon: Download,    desc: "Download all your fleet data" },
    ]
  },
  {
    label: "User Access",
    items: [
      { id: "manage-users", label: "Manage Users", icon: Users, desc: "Invite team members and set permissions" },
    ]
  },
  {
    label: "Recommended for India 🇮🇳",
    items: [
      { id: "language",     label: "Language & Region",  icon: Globe,         desc: "Hindi, regional language and date format support" },
      { id: "gst",          label: "GST & Tax Settings", icon: Receipt,       desc: "GST number, tax rates for invoicing" },
      { id: "integrations", label: "Integrations",       icon: Plug,          desc: "Vahan API, FASTag, GPS device connections" },
      { id: "alerts",       label: "Alert Thresholds",   icon: AlertTriangle, desc: "Set limits for fuel cost, maintenance due, expiry warnings" },
    ]
  },
];

// ─── Generic form content ─────────────────────────────────────────────────────
const CONTENT: any = {
  profile: {
    title: "User Profile",
    fields: [
      { label: "Full Name",    key: "name",  type: "text",  placeholder: "Fleet Owner" },
      { label: "Email Address",key: "email", type: "email", placeholder: "owner@example.com" },
      { label: "Phone Number", key: "phone", type: "tel",   placeholder: "+91 98765 43210" },
    ]
  },
  general: {
    title: "General Settings",
    fields: [
      { label: "Organization Name", key: "org_name", type: "text",   placeholder: "My Transport Co." },
      { label: "Organization Logo", key: "org_logo", type: "logo_upload" },
      { label: "Timezone",          key: "timezone", type: "select", options: ["Asia/Kolkata (IST)", "Asia/Dubai", "UTC"] },
      { label: "Currency",          key: "currency", type: "select", options: ["INR (₹)", "USD ($)", "AED"] },
      { label: "Distance Unit",     key: "distance", type: "select", options: ["Kilometers (km)", "Miles (mi)"] },
      { label: "Fuel Unit",         key: "fuel",     type: "select", options: ["Litres", "Gallons"] },
    ]
  },
  // password handled by <PasswordSettings> component below

  gst: {
    title: "GST & Tax Settings",
    fields: [
      { label: "GST Number",       key: "gstin",    type: "text",   placeholder: "22AAAAA0000A1Z5" },
      { label: "Business Name",    key: "biz_name", type: "text",   placeholder: "As per GST registration" },
      { label: "State",            key: "state",    type: "text",   placeholder: "Maharashtra" },
      { label: "Default Tax Rate", key: "tax_rate", type: "select", options: ["5%", "12%", "18%", "28%", "None"] },
    ]
  },
  alerts: {
    title: "Alert Thresholds",
    fields: [
      { label: "Fuel Cost Alert (₹ per litre above)", key: "fuel_alert",   type: "number", placeholder: "100" },
      { label: "Maintenance Due (days before)",       key: "maint_alert",  type: "number", placeholder: "7" },
      { label: "Insurance Expiry Warning (days)",     key: "ins_alert",    type: "number", placeholder: "30" },
      { label: "License Expiry Warning (days)",       key: "lic_alert",    type: "number", placeholder: "30" },
      { label: "Low FASTag Balance (₹)",              key: "fastag_alert", type: "number", placeholder: "500" },
    ]
  },
  language: {
    title: "Language & Region",
    fields: [
      { label: "Language",      key: "lang",   type: "select", options: ["English", "Hindi (हिंदी)", "Marathi", "Gujarati", "Tamil", "Telugu"] },
      { label: "Date Format",   key: "date",   type: "select", options: ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"] },
      { label: "Number Format", key: "number", type: "select", options: ["Indian (1,00,000)", "International (100,000)"] },
    ]
  },
};

// ─── Main settings page ───────────────────────────────────────────────────────
function SettingsInner() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(() => searchParams.get("tab") || "profile");
  const [search, setSearch] = useState("");

  // Sync active tab when URL param changes (e.g. clicking dropdown links)
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) setActive(tab);
  }, [searchParams]);
  const [saved, setSaved]         = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [orgLogo, setOrgLogo]     = useState<string>("");
  const logoInputRef              = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = useState<"nav" | "content">("nav");


  useEffect(() => {
    authService.getProfile()
      .then(r => {
        const data = r.data;
        if (!data) return;
        setFormValues(prev => ({
          ...prev,
          name:     data.name     || "",
          email:    data.email    || "",
          phone:    data.phone    || "",
          org_name: data.org_name || "",
        }));
        if (data.org_logo) setOrgLogo(data.org_logo);
        if (data.org_name) localStorage.setItem("orgName", data.org_name);
        if (data.org_logo) localStorage.setItem("orgLogo", data.org_logo);
        if (data.name)     localStorage.setItem("userName", data.name);
        window.dispatchEvent(new Event("orgSettingsUpdated"));
      })
      .catch(() => {
        setFormValues(prev => ({
          ...prev,
          name:     localStorage.getItem("userName") || "",
          org_name: localStorage.getItem("orgName")  || "",
        }));
        setOrgLogo(localStorage.getItem("orgLogo") || "");
      });
  }, []);

  const content = CONTENT[active];

  const filteredSections = SECTIONS.map(s => ({
    ...s,
    items: s.items.filter(i =>
      i.label.toLowerCase().includes(search.toLowerCase()) ||
      i.desc.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(s => s.items.length > 0);

  // Auto-navigate handled directly in handleSearch below

  const handleSave = async () => {
    try {
      await authService.updateProfile({
        name:     formValues.name     || undefined,
        phone:    formValues.phone    || undefined,
        org_name: formValues.org_name || undefined,
        org_logo: orgLogo             || undefined,
      });
    } catch (_) {}

    if (formValues.org_name !== undefined) localStorage.setItem("orgName", formValues.org_name);
    if (orgLogo)                           localStorage.setItem("orgLogo", orgLogo);
    if (formValues.name !== undefined)     localStorage.setItem("userName", formValues.name);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    window.dispatchEvent(new Event("orgSettingsUpdated"));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setOrgLogo(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <Header title={t("nav.settings")} subtitle={t("settings.subtitle")} />
      <div style={{ display: "flex", padding: isMobile ? "14px" : "24px 28px", gap: 16, alignItems: "flex-start", flexDirection: isMobile ? "column" : "row" }}>

        {/* ── Left sidebar ── */}
        <div className="card" style={{ width: isMobile ? "100%" : 260, flexShrink: 0, padding: "12px 8px", color: "var(--text-main)", display: isMobile && mobileView === "content" ? "none" : "block" }}>
          <div style={{ position: "relative", marginBottom: 12, padding: "0 6px" }}>
            <Search size={14} style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input value={search} onChange={e => {
                const val = e.target.value;
                setSearch(val);
                if (val.trim()) {
                  const q = val.toLowerCase();
                  const match = SECTIONS.flatMap(s => s.items).find(i =>
                    i.label.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q)
                  );
                  if (match) setActive(match.id);
                }
              }} placeholder="Search settings..."
              style={{ width: "100%", padding: "7px 10px 7px 32px", border: "1.5px solid var(--border-input)", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} />
          </div>

          {filteredSections.map(section => (
            <div key={section.label} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", padding: "6px 12px" }}>
                {section.label === "My Account" ? t("settings.my_account") :
                 section.label === "Fleet Settings" ? t("settings.fleet_settings") :
                 section.label === "User Access" ? t("settings.user_access") :
                 section.label}
              </div>
              {section.items.map(item => (
                <button key={item.id} onClick={() => { setActive(item.id); if (isMobile) setMobileView("content"); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer", textAlign: "left",
                    background: active === item.id ? "var(--bg-hover)" : "transparent", transition: "background 0.15s" }}
                  onMouseEnter={e => { if (active !== item.id) e.currentTarget.style.background = "var(--bg-hover)"; }}
                  onMouseLeave={e => { if (active !== item.id) e.currentTarget.style.background = "transparent"; }}>
                  <item.icon size={15} color={active === item.id ? "#1E2D8E" : "var(--text-muted)"} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: active === item.id ? "#1E2D8E" : "var(--text-sub)", flex: 1 }}>
                    {item.id === "notifications" ? t("settings.notifications") :
                     item.id === "password" ? t("settings.login_password") :
                     item.id === "appearance" ? t("settings.appearance") :
                     item.id === "billing" ? t("settings.billing") :
                     item.id === "export" ? t("settings.export") :
                     item.id === "manage-users" ? t("settings.manage_users") :
                     item.id === "firms" ? t("settings.firms") :
                     item.id === "language" ? t("settings.language_region") :
                     item.id === "gst" ? t("settings.gst") :
                     item.id === "integrations" ? t("settings.integrations") :
                     item.id === "alerts" ? t("settings.alerts") :
                     item.label}
                  </span>
                  {(item as any).badge && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 10,
                      background: (item as any).badge === "Recommended" ? "#e8f5e9" : "#fff3e0",
                      color: (item as any).badge === "Recommended" ? "#2e7d32" : "#e65100" }}>
                      {(item as any).badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* ── Right content ── */}
        <div className="card" style={{ flex: 1, color: "var(--text-main)", width: "100%", display: isMobile && mobileView === "nav" ? "none" : "block" }}>

          {/* Mobile back button */}
          {isMobile && (
            <button onClick={() => setMobileView("nav")} style={{
              display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
              cursor: "pointer", color: "#1E2D8E", fontSize: 14, fontWeight: 600,
              marginBottom: 16, padding: 0,
            }}>
              ← All Settings
            </button>
          )}

          {/* Custom panels */}
          {active === "notifications" ? (
            <NotificationSettings />
          ) : active === "appearance" ? (
            <AppearanceSettings />
          ) : active === "password" ? (
            <PasswordSettings />
          ) : active === "export" ? (
            <ExportSettings />
          ) : active === "manage-users" ? (
            <ManageUsers />
          ) : active === "firms" ? (
            <ManageFirms />
          ) : active === "billing" ? (
            <BillingSettings />
          ) : active === "integrations" ? (
            <IntegrationsSettings />

          ) : content ? (
            <>
              <h2 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 700 }}>{content.title}</h2>
              <p style={{ margin: "0 0 24px", fontSize: 13, color: "var(--text-muted)" }}>
                {SECTIONS.flatMap(s => s.items).find(i => i.id === active)?.desc}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 480 }}>
                {content.fields.map((f: any) => (
                  <div key={f.key}>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                      {f.key === "name" ? t("settings.full_name") :
                       f.key === "email" ? t("settings.email") :
                       f.key === "phone" ? t("settings.phone") :
                       f.label}
                    </label>

                    {f.type === "logo_upload" ? (
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                          {orgLogo
                            ? <img src={orgLogo} alt="Logo preview" style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover", border: "2px solid #e8e8f0" }} />
                            : <div style={{ width: 56, height: 56, borderRadius: 10, background: "#e8eaf6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: "#1E2D8E" }}>F</div>
                          }
                          <div>
                            <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 4 }}>{orgLogo ? "Logo uploaded ✓" : "No logo uploaded yet"}</div>
                            <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>PNG, JPG or SVG. Recommended 64×64px.</div>
                          </div>
                        </div>
                        <input ref={logoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoUpload} />
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="btn-outline" onClick={() => logoInputRef.current?.click()}
                            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                            <Upload size={13} /> Upload Logo
                          </button>
                          {orgLogo && (
                            <button className="btn-outline" onClick={() => { setOrgLogo(""); localStorage.removeItem("orgLogo"); window.dispatchEvent(new Event("orgSettingsUpdated")); }}
                              style={{ fontSize: 13, color: "#e53935", borderColor: "#e53935" }}>
                              Remove
                            </button>
                          )}
                        </div>
                      </div>

                    ) : f.type === "select" ? (
                      <select style={{ width: "100%", padding: "9px 12px", border: "1.5px solid var(--border-input)", borderRadius: 8, fontSize: 13.5, color: "var(--text-main)", background: "var(--bg-card)" }}>
                        {f.options.map((o: string) => <option key={o}>{o}</option>)}
                      </select>

                    ) : (
                      <input type={f.type} placeholder={f.placeholder}
                        value={formValues[f.key] ?? ""}
                        onChange={e => setFormValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                        style={{ width: "100%", padding: "9px 12px", border: "1.5px solid var(--border-input)", borderRadius: 8, fontSize: 13.5, color: "var(--text-main)", background: "var(--bg-card)" }} />
                    )}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 28, display: "flex", gap: 10 }}>
                <button className="btn-primary" onClick={handleSave}>{saved ? "✓ " + t("common.save") + "!" : t("settings.save_changes")}</button>
                <button className="btn-outline">{t("common.cancel")}</button>
              </div>
            </>

          ) : (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <Settings size={40} color="#e8eaf6" style={{ margin: "0 auto 12px", display: "block" }} />
              <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Select a setting from the left to configure it.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Wrap in Suspense — required by Next.js App Router when using useSearchParams()
export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "var(--text-muted)", fontSize: 14 }}>
        Loading settings...
      </div>
    }>
      <SettingsInner />
    </Suspense>
  );
}
