"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { LANGUAGES, LangCode } from "@/lib/translations";
import {
  TrendingUp, ShieldAlert, Users, Droplets, Activity,
  ArrowLeftRight, BarChart2, FolderOpen,
  Truck, Smartphone, HelpCircle, Bell, MessageSquare, MapPin,
  CheckCircle2, X,
} from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";

// ── WhatsApp ──────────────────────────────────────────────────────────────────
const WA_NUMBER = "919606462535";
const WA_MSG = encodeURIComponent(
  "Hi! I manage a truck fleet and I'd like to book a demo for FleetSure. Can we connect?"
);
const WA_URL = `https://wa.me/${WA_NUMBER}?text=${WA_MSG}`;

// ── Palette — portal blue family ─────────────────────────────────────────────
const SAF   = "#1E2D8E";   // portal primary blue (was orange)
const AMB   = "#4361EE";   // lighter blue accent (was amber)
const PEA   = "#1565C0";   // medium blue (was teal)
const PEA_D = "#0D1B4B";   // very dark navy (was dark teal)
const ROSE  = "#3730A3";   // indigo secondary (was rose)
const CRM   = "#EEF0FB";   // light blue-tint bg (was cream)
const DRK   = "#0A1232";   // dark navy text (was dark brown)

// ── Data ──────────────────────────────────────────────────────────────────────
const FEATURES = [
  { Icon: TrendingUp,     title: "Trip P&L",             desc: "Know profit or loss on every run the moment it's logged - per truck, per route.",   color: SAF,       bg: "#EEF0FB" },
  { Icon: ShieldAlert,    title: "Compliance Alerts",     desc: "Insurance, fitness, PUC, permit - automatic reminders before anything expires.",     color: ROSE,      bg: "#E0E7FF" },
  { Icon: Users,          title: "Driver Management",     desc: "Advances, payments, license expiry and contact, all in one driver profile.",         color: PEA,       bg: "#DBEAFE" },
  { Icon: Droplets,       title: "Fuel & Mileage",        desc: "Track litres, cost per km and spot which routes or trucks are burning the most.",     color: AMB,       bg: "#EEF0FB" },
  { Icon: Activity,       title: "Tyre Health",           desc: "Visual health per wheel, rotation reminders, replacement timeline, pressure logs.",   color: "#6A1B9A", bg: "#F3E5F5" },
  { Icon: ArrowLeftRight, title: "Return Load Market",    desc: "Find cargo for your empty trucks on return runs. Cut dead-run costs fast.",          color: "#0277BD", bg: "#DBEAFE" },
  { Icon: BarChart2,      title: "Smart Analytics",       desc: "Fleet-wide revenue, expenses and margin in one dashboard. See who's performing.",     color: PEA,       bg: "#DBEAFE" },
  { Icon: FolderOpen,     title: "Document Vault",        desc: "RC, insurance, permits, stored digitally and accessible anywhere, anytime.",         color: ROSE,      bg: "#E0E7FF" },
];

const PAIN_POINTS = [
  { Icon: HelpCircle,    text: "Which truck actually made money last month? Honestly, no idea.", color: SAF },
  { Icon: Bell,          text: "Insurance expired again. Nobody sent a reminder. Challan paid.", color: ROSE },
  { Icon: MessageSquare, text: "Driver claims ₹8,000 advance. The notebook says ₹5,000. WhatsApp says something else.", color: "#6A1B9A" },
  { Icon: MapPin,        text: "Truck going back empty. No way to find a return load in time.", color: "#0277BD" },
];

const STEPS = [
  { Icon: Truck,      num: "1", color: SAF,  title: "Add your fleet",       desc: "Register vehicles and drivers in minutes. RC, license, insurance, all stored securely. No IT team needed." },
  { Icon: Smartphone, num: "2", color: PEA,  title: "Log as you go",        desc: "Trips, fuel, tolls, expenses, logged from any phone, on the road, even without internet." },
  { Icon: BarChart2,  num: "3", color: ROSE, title: "See profits & alerts", desc: "P&L per truck, compliance reminders, tyre health, driver payments - all live on your dashboard." },
];

const TESTIMONIALS = [
  { quote: "Before FleetSure I had no idea which truck was making money. Now I see it instantly. We cut our loss-making routes in the first month.", name: "Ramesh Choudhary", role: "22 trucks · Rajkot, Gujarat",    init: "R", color: SAF  },
  { quote: "Our insurance and fitness certificates used to expire without warning. FleetSure fixed that completely. Zero compliance issues in 6 months.", name: "Kavitha Reddy",    role: "38 trucks · Pune, Maharashtra", init: "K", color: PEA  },
  { quote: "The return load marketplace alone is worth it. We used to run empty 30–40% of the time. That number is almost zero now.",                name: "Harpreet Singh",  role: "14 trucks · Ludhiana, Punjab",  init: "H", color: ROSE },
];

const FAQS = [
  { q: "How long does setup take?",                   a: "Most fleet owners are fully set up in under an hour. Adding your first vehicle takes less than 5 minutes. No training, no consultants, no IT team needed." },
  { q: "Do I need GPS devices or special hardware?",  a: "None at all. FleetSure runs entirely on your existing smartphone. No hardware to buy, no installation to schedule." },
  { q: "Can my manager or accountant use it too?",    a: "Yes. You can have multiple users on your account. You control who sees what. Drivers don't need access to financial data." },
  { q: "Is my fleet data safe?",                      a: "Absolutely. Your data is encrypted, stored securely, and belongs only to you. We never share or sell your fleet information." },
  { q: "How is FleetSure priced?",                    a: "We offer plans based on fleet size. Book a demo and we'll give you exact pricing. Most fleets pay less than the cost of one empty return run per month." },
  { q: "Does it work in areas with weak network?",    a: "Yes. You can log trips and expenses offline and they sync automatically when connectivity returns, even on 2G." },
];

// ── BookDemo button ───────────────────────────────────────────────────────────
function BookDemo({ large, onDark }: { large?: boolean; onDark?: boolean }) {
  const [hover, setHover] = useState(false);
  return (
    <a href={WA_URL} target="_blank" rel="noreferrer"
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: large ? "17px 36px" : "11px 22px",
        background: onDark ? "white" : SAF,
        color: onDark ? SAF : "white",
        borderRadius: 8, fontWeight: 700,
        fontSize: large ? 17 : 14,
        textDecoration: "none", whiteSpace: "nowrap",
        letterSpacing: "-0.2px",
        boxShadow: hover
          ? `0 10px 32px rgba(30,45,142,${onDark ? 0.25 : 0.45})`
          : `0 4px 18px rgba(30,45,142,${onDark ? 0.15 : 0.3})`,
        transform: hover ? "translateY(-2px)" : "none",
        transition: "all 0.18s",
      }}>
      💬 Book a Free Demo
    </a>
  );
}

// ── App mockup ────────────────────────────────────────────────────────────────
function AppMockup({ isMobile }: { isMobile: boolean }) {
  if (isMobile) {
    // Phone-style mockup for mobile screens
    return (
      <div style={{
        maxWidth: 300, margin: "0 auto",
        borderRadius: 28, overflow: "hidden",
        boxShadow: "0 32px 80px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.1)",
        border: "6px solid #1E2D8E",
        background: "white",
      }}>
        {/* Status bar */}
        <div style={{ background: SAF, padding: "12px 18px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "white", fontSize: 13, fontWeight: 800 }}>FleetSure</span>
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>9:41</span>
        </div>

        {/* App content */}
        <div style={{ background: "#F5F7FF", padding: "16px 14px" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: DRK, marginBottom: 14, letterSpacing: "-0.3px" }}>Fleet Overview</div>

          {/* 2-column stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            {[
              { label: "Monthly Revenue", value: "₹2.4L", delta: "+12%", color: SAF,  bg: "#EEF0FB" },
              { label: "Net Profit",       value: "₹68K",  delta: "+8%",  color: PEA,  bg: "#DBEAFE" },
            ].map(s => (
              <div key={s.label} style={{ background: "white", borderRadius: 10, padding: "12px 10px", border: `1px solid ${s.color}22` }}>
                <div style={{ fontSize: 9, fontWeight: 600, color: "#8899BB", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 9.5, color: "#2e7d32", marginTop: 4, fontWeight: 600 }}>{s.delta} this month</div>
              </div>
            ))}
          </div>

          {/* Recent trips */}
          <div style={{ background: "white", borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#8899BB", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 10 }}>Recent Trips</div>
            {[
              { reg: "MH 04 AB 1234", route: "Mumbai → Pune",  amt: "₹18K",   color: "#2e7d32", bg: "#E8F5E9" },
              { reg: "GJ 05 CD 5678", route: "Surat → Rajkot", amt: "₹22.5K", color: "#2e7d32", bg: "#E8F5E9" },
              { reg: "RJ 14 EF 9012", route: "Jaipur → Delhi", amt: "₹35K",   color: SAF,       bg: "#EEF0FB" },
            ].map((trip, i) => (
              <div key={trip.reg} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderTop: i === 0 ? "none" : "1px solid #F0F2FA" }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: DRK }}>{trip.reg}</div>
                  <div style={{ fontSize: 10, color: "#8899BB" }}>{trip.route}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: DRK }}>{trip.amt}</div>
                  <div style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: trip.bg, color: trip.color, fontWeight: 600 }}>
                    {trip.color === SAF ? "Active" : "Done"}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Compliance alert */}
          <div style={{ background: "#EEF0FB", borderRadius: 8, padding: "9px 11px", display: "flex", gap: 8, alignItems: "flex-start", border: "1px solid rgba(30,45,142,0.2)" }}>
            <ShieldAlert size={13} color={SAF} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 11, color: "#1E2D8E", fontWeight: 500, lineHeight: 1.4 }}>
              Insurance expiring in <strong>8 days</strong> — MH 04 AB 1234
            </div>
          </div>
        </div>

        {/* Bottom nav */}
        <div style={{ background: "white", borderTop: "1px solid #f0f0f5", display: "flex", justifyContent: "space-around", padding: "10px 8px 12px" }}>
          {[
            { icon: "🏠", label: "Home",  active: true },
            { icon: "🚚", label: "Trips",  active: false },
            { icon: "⛽", label: "Fuel",   active: false },
            { icon: "📊", label: "P&L",    active: false },
          ].map(item => (
            <div key={item.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 16 }}>{item.icon}</div>
              <div style={{ fontSize: 9, color: item.active ? SAF : "#aaa", fontWeight: item.active ? 700 : 400, marginTop: 2 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Desktop browser-frame mockup
  return (
    <div style={{
      background: "white", borderRadius: 16, overflow: "hidden",
      boxShadow: "0 32px 80px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)",
      border: "1px solid rgba(0,0,0,0.07)", maxWidth: 860, margin: "0 auto",
    }}>
      {/* Browser chrome */}
      <div style={{ background: "#EAEAEA", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FF5F57" }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FFBD2E" }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#28C840" }} />
        <div style={{ flex: 1, background: "white", borderRadius: 6, padding: "4px 14px", fontSize: 11.5, color: "#999", marginLeft: 12, maxWidth: 280, fontFamily: "monospace" }}>
          app.fleetsure.in/dashboard
        </div>
      </div>

      {/* App layout */}
      <div style={{ display: "flex", height: 400 }}>
        {/* Sidebar */}
        <div style={{ width: 175, background: "#0F1E3C", padding: "20px 14px", flexShrink: 0 }}>
          <div style={{ color: "white", fontWeight: 800, fontSize: 15, marginBottom: 28, paddingLeft: 4 }}>FleetSure</div>
          {[["Dashboard", true], ["Trips", false], ["Vehicles", false], ["Drivers", false], ["Fuel Logs", false], ["Analytics", false]].map(([label, active]) => (
            <div key={label as string} style={{
              padding: "9px 12px", borderRadius: 8, marginBottom: 3,
              background: active ? "rgba(67,97,238,0.22)" : "transparent",
              color: active ? "#93C5FD" : "rgba(255,255,255,0.45)",
              fontSize: 13, fontWeight: active ? 600 : 400,
              borderLeft: active ? `3px solid ${SAF}` : "3px solid transparent",
            }}>
              {label as string}
            </div>
          ))}
        </div>

        {/* Main */}
        <div style={{ flex: 1, background: "#F5F7FF", padding: "22px 24px", overflowY: "auto" }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: DRK, marginBottom: 18, letterSpacing: "-0.4px" }}>Fleet Overview</div>

          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 18 }}>
            {[
              { label: "Monthly Revenue", value: "₹2.4L", delta: "+12%", color: SAF,  bg: "#EEF0FB" },
              { label: "Net Profit",       value: "₹68K",  delta: "+8%",  color: PEA,  bg: "#DBEAFE" },
              { label: "Active Trucks",    value: "8 / 12", delta: "",    color: ROSE, bg: "#E0E7FF" },
            ].map(s => (
              <div key={s.label} style={{ background: "white", borderRadius: 10, padding: "14px 16px", border: `1px solid ${s.color}22`, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: "#8899BB", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                {s.delta && <div style={{ fontSize: 10.5, color: "#2e7d32", marginTop: 4, fontWeight: 600 }}>{s.delta} this month</div>}
              </div>
            ))}
          </div>

          {/* Trip table */}
          <div style={{ background: "white", borderRadius: 10, padding: "14px 16px", marginBottom: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: "#8899BB", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 12 }}>Recent Trips</div>
            {[
              { reg: "MH 04 AB 1234", route: "Mumbai → Pune",   amt: "₹18,000", label: "Completed", color: "#2e7d32", bg: "#E8F5E9" },
              { reg: "GJ 05 CD 5678", route: "Surat → Rajkot",  amt: "₹22,500", label: "Completed", color: "#2e7d32", bg: "#E8F5E9" },
              { reg: "RJ 14 EF 9012", route: "Jaipur → Delhi",  amt: "₹35,000", label: "Active",    color: SAF,       bg: "#EEF0FB" },
            ].map((t, i) => (
              <div key={t.reg} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderTop: i === 0 ? "none" : "1px solid #F0F2FA" }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: DRK }}>{t.reg}</div>
                  <div style={{ fontSize: 11, color: "#8899BB" }}>{t.route}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: DRK }}>{t.amt}</div>
                  <div style={{ fontSize: 10, padding: "3px 8px", borderRadius: 5, background: t.bg, color: t.color, fontWeight: 600 }}>{t.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Compliance alert */}
          <div style={{ background: "#EEF0FB", borderRadius: 8, padding: "10px 14px", display: "flex", gap: 10, alignItems: "center", border: "1px solid rgba(30,45,142,0.2)" }}>
            <ShieldAlert size={16} color={SAF} style={{ flexShrink: 0 }} />
            <div style={{ fontSize: 12, color: "#1E2D8E", fontWeight: 500 }}>
              Insurance expiring in <strong>8 days</strong> for MH 04 AB 1234. Renew before Sept 28.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { lang, setLang, t } = useLanguage();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);


  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap";
    document.head.appendChild(link);
  }, []);

  const font = "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";

  return (
    <div style={{ fontFamily: font, background: CRM, color: DRK, overflowX: "hidden", width: "100%", minHeight: "100vh" }}>

      {/* ── NAVBAR ──────────────────────────────────────────────────────────── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: "rgba(238,240,251,0.97)", backdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(30,45,142,0.12)",
        padding: isMobile ? "0 16px" : "0 32px", height: 66,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: scrolled ? "0 2px 16px rgba(0,0,0,0.10)" : "none",
        transition: "box-shadow 0.2s",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img src="/logo.png" alt="FleetSure" style={{ height: 34, width: "auto", objectFit: "contain" }} />
          <span style={{ fontSize: isMobile ? 18 : 20, fontWeight: 900, color: SAF, letterSpacing: "-0.5px" }}>FleetSure</span>
        </div>

        {/* Desktop nav links */}
        {!isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            {([
              [t("landing.nav_features"), "#features"],
              [t("landing.nav_how"),      "#how-it-works"],
              [t("landing.nav_faq"),      "#faq"],
            ] as [string, string][]).map(([label, href]) => (
              <a key={href} href={href} style={{ fontSize: 14, fontWeight: 600, color: "#334155", textDecoration: "none", letterSpacing: "-0.1px" }}>{label}</a>
            ))}
            <Link href="/login" style={{ fontSize: 14, fontWeight: 700, color: PEA, textDecoration: "none" }}>{t("landing.login")}</Link>

            {/* Language picker */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowLangMenu(v => !v)}
                style={{
                  padding: "7px 12px", background: "transparent",
                  border: "1.5px solid rgba(30,45,142,0.3)", borderRadius: 8,
                  fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#334155",
                  display: "flex", alignItems: "center", gap: 4,
                }}
              >
                {LANGUAGES[lang as LangCode].label} ▾
              </button>
              {showLangMenu && (
                <div
                  style={{
                    position: "absolute", top: "calc(100% + 6px)", right: 0,
                    background: "white", border: "1px solid #c7d2fe",
                    borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                    overflow: "hidden", zIndex: 200, minWidth: 150,
                  }}
                  onMouseLeave={() => setShowLangMenu(false)}
                >
                  {(Object.entries(LANGUAGES) as [LangCode, typeof LANGUAGES[LangCode]][]).map(([code, meta]) => (
                    <button
                      key={code}
                      onClick={() => { setLang(code); setShowLangMenu(false); }}
                      style={{
                        display: "block", width: "100%", textAlign: "left",
                        padding: "10px 16px", background: lang === code ? "#EEF0FB" : "transparent",
                        border: "none", cursor: "pointer", fontSize: 13,
                        fontWeight: lang === code ? 700 : 400, color: "#334155",
                      }}
                    >
                      {meta.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <BookDemo />
          </div>
        )}

        {/* Mobile: Log In + Hamburger */}
        {isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/login" style={{ fontSize: 13, fontWeight: 700, color: PEA, textDecoration: "none", padding: "6px 12px" }}>
              Log In
            </Link>
            <button
              onClick={() => setMenuOpen(v => !v)}
              style={{
                width: 44, height: 44, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 5,
                background: "none", border: "none", cursor: "pointer", padding: 0,
              }}
              aria-label="Menu"
            >
              {menuOpen ? (
                <X size={22} color={SAF} />
              ) : (
                <>
                  <div style={{ width: 22, height: 2, background: SAF, borderRadius: 2 }} />
                  <div style={{ width: 22, height: 2, background: SAF, borderRadius: 2 }} />
                  <div style={{ width: 16, height: 2, background: SAF, borderRadius: 2 }} />
                </>
              )}
            </button>
          </div>
        )}
      </nav>

      {/* ── MOBILE MENU OVERLAY ─────────────────────────────────────────────── */}
      {isMobile && menuOpen && (
        <div style={{
          position: "fixed", top: 66, left: 0, right: 0, bottom: 0,
          background: "rgba(238,240,251,0.98)", backdropFilter: "blur(16px)",
          zIndex: 99, display: "flex", flexDirection: "column",
          padding: "24px 24px 40px", overflowY: "auto",
        }}>
          {/* Nav links */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 28 }}>
            {([
              [t("landing.nav_features"), "#features"],
              [t("landing.nav_how"),      "#how-it-works"],
              [t("landing.nav_faq"),      "#faq"],
            ] as [string, string][]).map(([label, href]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)}
                style={{
                  fontSize: 22, fontWeight: 700, color: DRK, textDecoration: "none",
                  padding: "12px 4px", borderBottom: "1px solid rgba(30,45,142,0.08)",
                  display: "block",
                }}>
                {label}
              </a>
            ))}
          </div>

          {/* Language picker */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#888", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 10 }}>Language</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {(Object.entries(LANGUAGES) as [LangCode, typeof LANGUAGES[LangCode]][]).map(([code, meta]) => (
                <button
                  key={code}
                  onClick={() => { setLang(code); }}
                  style={{
                    padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                    border: `1.5px solid ${lang === code ? SAF : "rgba(30,45,142,0.2)"}`,
                    background: lang === code ? "#EEF0FB" : "white",
                    color: lang === code ? SAF : "#555",
                    cursor: "pointer",
                  }}
                >
                  {meta.label}
                </button>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <a href={WA_URL} target="_blank" rel="noreferrer" onClick={() => setMenuOpen(false)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "16px", background: SAF, color: "white", borderRadius: 10,
                fontWeight: 700, fontSize: 16, textDecoration: "none",
              }}>
              💬 Book a Free Demo
            </a>
            <Link href="/login" onClick={() => setMenuOpen(false)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "14px", border: `1.5px solid ${SAF}`, color: SAF, borderRadius: 10,
                fontWeight: 700, fontSize: 15, textDecoration: "none",
              }}>
              Log In
            </Link>
          </div>
        </div>
      )}

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section style={{
        background: `linear-gradient(140deg, ${PEA_D} 0%, ${SAF} 45%, ${AMB} 100%)`,
        padding: isMobile ? "100px 20px 64px" : "166px 32px 88px",
        textAlign: "center",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 400, height: 400, borderRadius: "50%", background: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -120, left: -60, width: 480, height: 480, borderRadius: "50%", background: "rgba(0,0,0,0.05)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "30%", left: "8%", width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 780, margin: "0 auto", position: "relative" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "rgba(255,255,255,0.16)", backdropFilter: "blur(8px)",
            borderRadius: 6, padding: "7px 18px", fontSize: 12.5, fontWeight: 700,
            color: "white", marginBottom: 30, border: "1px solid rgba(255,255,255,0.28)",
            letterSpacing: "0.5px", textTransform: "uppercase",
          }}>
            🇮🇳 {t("landing.badge")}
          </div>

          <h1 style={{
            margin: "0 0 24px",
            fontSize: "clamp(42px, 7.5vw, 72px)",
            fontWeight: 900, color: "white",
            lineHeight: 1.04, letterSpacing: "-2.5px",
            fontFamily: font,
          }}>
            {t("landing.hero_l1")}<br />{t("landing.hero_l2")}<br />{t("landing.hero_l3")}<br />{t("landing.hero_l4")}
          </h1>

          <p style={{
            margin: "0 auto 42px",
            fontSize: "clamp(16px, 2.2vw, 19px)",
            color: "rgba(255,255,255,0.9)", lineHeight: 1.68, maxWidth: 560,
            fontWeight: 400,
          }}>
            {t("landing.hero_sub")}
          </p>

          <div style={{ display: "flex", gap: isMobile ? 10 : 14, justifyContent: "center", flexWrap: "wrap", marginBottom: isMobile ? 36 : 54, flexDirection: isMobile ? "column" : "row", alignItems: "center" }}>
            <BookDemo large onDark />
            <a href="#how-it-works" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: isMobile ? "14px 28px" : "17px 30px",
              background: "rgba(255,255,255,0.12)",
              border: "1.5px solid rgba(255,255,255,0.4)", borderRadius: 8,
              color: "white", fontWeight: 700, fontSize: isMobile ? 15 : 16, textDecoration: "none", letterSpacing: "-0.2px",
              width: isMobile ? "100%" : "auto", justifyContent: "center",
            }}>
              {t("landing.nav_how")} ↓
            </a>
          </div>

          <div style={{ display: "flex", gap: 32, justifyContent: "center", flexWrap: "wrap" }}>
            {["No hardware needed", "Any smartphone", "5-min setup", "Works across India"].map(t => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 7, color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: 600 }}>
                <div style={{ width: 18, height: 18, borderRadius: 4, background: "rgba(255,255,255,0.22)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <CheckCircle2 size={11} color="white" />
                </div>
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ───────────────────────────────────────────────────────── */}
      <section style={{ background: PEA_D, padding: isMobile ? "24px 20px" : "28px 32px" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? "16px 12px" : "0 48px", justifyItems: "center" }}>
          {([
            ["Real-time P&L",      "per vehicle & trip"],
            ["Compliance alerts",  "before documents expire"],
            ["Return load market", "built right in"],
            ["Smart insights",     "fuel, tyres & drivers"],
          ] as [string, string][]).map(([title, sub]) => (
            <div key={title} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: "white", letterSpacing: "-0.2px" }}>{title}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 3 }}>{sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PAIN POINTS ─────────────────────────────────────────────────────── */}
      <section style={{ padding: isMobile ? "64px 20px" : "96px 32px", background: "white" }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: ROSE, letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 14 }}>Sound familiar?</div>
            <h2 style={{ margin: "0 0 16px", fontSize: "clamp(28px, 4.5vw, 44px)", fontWeight: 900, letterSpacing: "-1.5px", fontFamily: font }}>
              Running a fleet shouldn't feel like this.
            </h2>
            <p style={{ fontSize: 17, color: "#475569", maxWidth: 480, margin: "0 auto", lineHeight: 1.65, fontWeight: 400 }}>
              Most fleet owners are stuck managing crores worth of assets on WhatsApp and notebooks. FleetSure changes that.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 48 }}>
            {PAIN_POINTS.map((p, i) => (
              <div key={p.text} style={{
                padding: "26px 22px", borderRadius: 12,
                background: "#F8F9FF", border: "1.5px solid #E0E7FF",
                position: "relative",
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${p.color}14`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                  <p.Icon size={20} color={p.color} />
                </div>
                <p style={{ margin: 0, fontSize: 14.5, color: "#334155", lineHeight: 1.6, fontWeight: 500 }}>
                  {t(`landing.pain${i + 1}` as any)}
                </p>
                <div style={{ position: "absolute", top: 14, right: 14 }}>
                  <X size={14} color="#DDD" />
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              padding: "14px 28px", background: `${PEA}12`, borderRadius: 10,
              border: `1.5px solid ${PEA}30`, fontSize: 15, fontWeight: 700, color: PEA,
            }}>
              <CheckCircle2 size={18} color={PEA} />
              FleetSure fixes all of this, in one app.
            </div>
          </div>
        </div>
      </section>

      {/* ── APP MOCKUP ──────────────────────────────────────────────────────── */}
      <section style={{ padding: isMobile ? "0 20px 72px" : "0 32px 96px", background: "white" }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: isMobile ? 36 : 48 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: SAF, letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 14 }}>The command centre</div>
            <h2 style={{ margin: "0 0 16px", fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 900, letterSpacing: "-1.5px", fontFamily: font }}>
              Your entire fleet. One screen.
            </h2>
            <p style={{ fontSize: isMobile ? 15 : 16, color: "#475569", maxWidth: 420, margin: "0 auto", lineHeight: 1.65 }}>
              Real-time P&L, compliance alerts, trip tracking and driver payments, all visible the moment you open the app.
            </p>
          </div>
          <AppMockup isMobile={isMobile} />
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: isMobile ? "64px 20px" : "96px 32px", background: CRM }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: SAF, letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 14 }}>Simple by design</div>
            <h2 style={{ margin: "0 0 16px", fontSize: "clamp(28px, 4.5vw, 44px)", fontWeight: 900, letterSpacing: "-1.5px", fontFamily: font }}>Up and running in 3 steps</h2>
            <p style={{ fontSize: 17, color: "#475569", maxWidth: 420, margin: "0 auto", lineHeight: 1.65 }}>No installation. No training. No consultant.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(268px, 1fr))", gap: 22 }}>
            {STEPS.map(s => (
              <div key={s.num} style={{ padding: "38px 30px", borderRadius: 14, background: "white", border: "1.5px solid #E0E7FF" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
                  <div style={{ width: 46, height: 46, borderRadius: 10, background: s.color, color: "white", fontWeight: 900, fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {s.num}
                  </div>
                  <s.Icon size={28} color={s.color} strokeWidth={1.8} />
                </div>
                <h3 style={{ margin: "0 0 10px", fontSize: 19, fontWeight: 800, letterSpacing: "-0.4px" }}>{t(`landing.step_t${s.num}` as any)}</h3>
                <p style={{ margin: 0, fontSize: 14.5, color: "#475569", lineHeight: 1.7 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: isMobile ? "64px 20px" : "96px 32px", background: "#EEF0FB" }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: PEA, letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 14 }}>Everything you need</div>
            <h2 style={{ margin: "0 0 16px", fontSize: "clamp(28px, 4.5vw, 44px)", fontWeight: 900, letterSpacing: "-1.5px", fontFamily: font }}>
              Built for how Indian fleets actually work
            </h2>
            <p style={{ fontSize: 17, color: "#475569", maxWidth: 500, margin: "0 auto", lineHeight: 1.65 }}>
              Every feature was designed around real problems, not a generic SaaS template.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{ padding: "26px 22px", borderRadius: 12, background: "white", border: `1.5px solid ${f.color}18` }}>
                <div style={{ width: 48, height: 48, borderRadius: 10, background: f.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <f.Icon size={22} color={f.color} strokeWidth={1.8} />
                </div>
                <h3 style={{ margin: "0 0 8px", fontSize: 15.5, fontWeight: 800, letterSpacing: "-0.3px" }}>{t(`landing.feat_t${FEATURES.indexOf(f) + 1}` as any)}</h3>
                <p style={{ margin: 0, fontSize: 13.5, color: "#475569", lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────────────────────── */}
      <section style={{ padding: isMobile ? "64px 20px" : "96px 32px", background: `linear-gradient(140deg, ${PEA_D} 0%, ${PEA} 100%)` }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: AMB, letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 14 }}>Real fleet owners</div>
            <h2 style={{ margin: 0, fontSize: "clamp(28px, 4.5vw, 44px)", fontWeight: 900, color: "white", letterSpacing: "-1.5px", fontFamily: font }}>
              What fleet owners are saying
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {TESTIMONIALS.map(t => (
              <div key={t.name} style={{
                padding: "34px 30px", borderRadius: 14,
                background: "rgba(255,255,255,0.09)", backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.14)",
              }}>
                <div style={{ color: AMB, fontSize: 16, marginBottom: 18, letterSpacing: 4 }}>★★★★★</div>
                <p style={{ margin: "0 0 26px", fontSize: 14.5, color: "rgba(255,255,255,0.93)", lineHeight: 1.72, fontStyle: "italic", fontWeight: 400 }}>
                  "{t.quote}"
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: t.color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: 18, flexShrink: 0 }}>
                    {t.init}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: "white", fontSize: 14.5, letterSpacing: "-0.2px" }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 3 }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <section id="faq" style={{ padding: isMobile ? "64px 20px" : "96px 32px", background: "white" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: ROSE, letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 14 }}>Got questions?</div>
            <h2 style={{ margin: 0, fontSize: "clamp(28px, 4.5vw, 44px)", fontWeight: 900, letterSpacing: "-1.5px", fontFamily: font }}>Frequently asked</h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {FAQS.map((f, i) => (
              <div key={i} style={{
                borderRadius: 10,
                border: `1.5px solid ${openFaq === i ? SAF : "#C7D2FE"}`,
                overflow: "hidden", transition: "border-color 0.2s",
              }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    width: "100%", border: "none",
                    background: openFaq === i ? "#EEF0FB" : "white",
                    padding: "19px 22px", display: "flex", justifyContent: "space-between", alignItems: "center",
                    cursor: "pointer", textAlign: "left", gap: 12, transition: "background 0.2s",
                  }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: DRK, letterSpacing: "-0.2px" }}>{f.q}</span>
                  <span style={{ color: SAF, flexShrink: 0, fontSize: 24, lineHeight: 1, fontWeight: 300 }}>{openFaq === i ? "−" : "+"}</span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: "2px 22px 20px", background: "#EEF0FB", fontSize: 14.5, color: "#475569", lineHeight: 1.72 }}>
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ──────────────────────────────────────────────────────── */}
      <section style={{
        padding: isMobile ? "72px 20px" : "100px 32px",
        background: `linear-gradient(140deg, ${ROSE} 0%, ${SAF} 60%, ${AMB} 100%)`,
        textAlign: "center", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -60, right: -60, width: 320, height: 320, borderRadius: "50%", background: "rgba(255,255,255,0.07)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -80, left: -40, width: 280, height: 280, borderRadius: "50%", background: "rgba(0,0,0,0.06)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 620, margin: "0 auto", position: "relative" }}>
          <h2 style={{ margin: "0 0 18px", fontSize: "clamp(30px, 5.5vw, 52px)", fontWeight: 900, color: "white", letterSpacing: "-2px", lineHeight: 1.08, fontFamily: font }}>
            {t("landing.cta_title")}
          </h2>
          <p style={{ margin: "0 0 42px", fontSize: 17.5, color: "rgba(255,255,255,0.87)", lineHeight: 1.65, fontWeight: 400 }}>
            {t("landing.cta_sub")}
          </p>
          <BookDemo large onDark />
          <p style={{ marginTop: 18, fontSize: 13, color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>
            No credit card. No commitment. Just your phone.
          </p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer style={{ background: DRK, padding: isMobile ? "48px 20px 28px" : "56px 32px 32px" }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: isMobile ? 32 : 40, marginBottom: isMobile ? 36 : 48 }}>
            <div style={{ maxWidth: 270 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <img src="/logo.png" alt="FleetSure" style={{ height: 32, width: "auto", objectFit: "contain" }} />
                <span style={{ fontSize: 19, fontWeight: 900, color: "white", letterSpacing: "-0.5px" }}>FleetSure</span>
              </div>
              <p style={{ margin: 0, fontSize: 13.5, color: "rgba(255,255,255,0.42)", lineHeight: 1.7, fontWeight: 400 }}>
                India's fleet management platform for owners running 10–100 trucks.
              </p>
            </div>
            <div style={{ display: "flex", gap: isMobile ? 32 : 56, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.3)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 18 }}>Product</div>
                {([["Features", "#features"], ["How It Works", "#how-it-works"], ["FAQ", "#faq"]] as [string, string][]).map(([label, href]) => (
                  <div key={label} style={{ marginBottom: 12 }}>
                    <a href={href} style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, textDecoration: "none", fontWeight: 500 }}>{label}</a>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.3)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 18 }}>Account</div>
                {([["Log In", "/login"], ["Sign Up", "/register"]] as [string, string][]).map(([label, href]) => (
                  <div key={label} style={{ marginBottom: 12 }}>
                    <Link href={href} style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, textDecoration: "none", fontWeight: 500 }}>{label}</Link>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.3)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 18 }}>Contact</div>
                <div style={{ marginBottom: 12 }}>
                  <a href="mailto:support@fleetsure.co.in" style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, textDecoration: "none", fontWeight: 500 }}>support@fleetsure.co.in</a>
                </div>
                <div>
                  <a href="tel:+919606462535" style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, textDecoration: "none", fontWeight: 500 }}>+91-9606462535</a>
                </div>
              </div>
            </div>
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>© 2025 FleetSure. All rights reserved.</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>Made with ❤️ in India 🇮🇳</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
