"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Truck, AlertTriangle, Clock, LogOut, Globe } from "lucide-react";
import { DriverAuthProvider, useDriverAuth } from "@/lib/driverAuth";
import { LANGUAGES, LangCode } from "@/lib/translations";
import { useLanguage } from "@/lib/LanguageContext";

const PRIMARY = "#1E2D8E";
const NAV_ITEMS = [
  { href: "/driver/dashboard", icon: Home,          label: "Home"    },
  { href: "/driver/trips",     icon: Truck,          label: "Trips"   },
  { href: "/driver/issues",    icon: AlertTriangle,  label: "Issues"  },
  { href: "/driver/history",   icon: Clock,          label: "History" },
];

// Driver-specific label translations for the bottom nav
const NAV_LABELS: Record<LangCode, [string, string, string, string]> = {
  en: ["Home",   "Trips",      "Issues",      "History"  ],
  hi: ["होम",    "यात्राएं",    "समस्याएं",   "इतिहास"   ],
  kn: ["ಮನೆ",   "ಪ್ರಯಾಣ",     "ಸಮಸ್ಯೆ",     "ಇತಿಹಾಸ"   ],
  ta: ["முகப்பு","பயணங்கள்",   "சிக்கல்",    "வரலாறு"   ],
  te: ["హోమ్",  "ప్రయాణాలు",  "సమస్యలు",    "చరిత్ర"   ],
  mr: ["मुख्य", "प्रवास",     "समस्या",      "इतिहास"   ],
  gu: ["હોમ",   "યાત્રા",     "સમસ્યા",     "ઇતિહાસ"   ],
  pa: ["ਹੋਮ",   "ਯਾਤਰਾਵਾਂ",   "ਸਮੱਸਿਆਵਾਂ", "ਇਤਿਹਾਸ"   ],
  ml: ["ഹോം",   "യാത്രകൾ",    "പ്രശ്നങ്ങൾ", "ചരിത്രം"  ],
};

function Shell({ children }: { children: React.ReactNode }) {
  const { driver, loading, logout } = useDriverAuth();
  const { lang, setLang }           = useLanguage();
  const router    = useRouter();
  const pathname  = usePathname();
  const isLogin   = pathname === "/driver/login";
  const [showLang, setShowLang] = useState(false);

  useEffect(() => {
    if (!loading && !driver && !isLogin) router.replace("/driver/login");
    if (!loading && driver && isLogin)  router.replace("/driver/dashboard");
  }, [loading, driver, isLogin, router]);

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F0F4FF" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 36, height: 36, border: `3px solid ${PRIMARY}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 10px" }} />
          <p style={{ color: PRIMARY, fontWeight: 600, fontSize: 13, margin: 0 }}>Loading…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (isLogin) return <>{children}</>;
  if (!driver)  return null;

  const navLabels = NAV_LABELS[lang as LangCode] ?? NAV_LABELS.en;

  return (
    <div style={{
      minHeight: "100dvh", background: "#F0F4FF",
      display: "flex", flexDirection: "column",
      maxWidth: 480, margin: "0 auto",
      position: "relative",
      fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
    }}>
      {/* Header */}
      <header style={{
        background: PRIMARY, color: "white", padding: "12px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 50,
        boxShadow: "0 2px 12px rgba(30,45,142,0.3)",
      }}>
        <div>
          <div style={{ fontSize: 11, opacity: 0.65, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>FleetSure Driver</div>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.3px", lineHeight: 1.2 }}>{driver.name}</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Language picker */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowLang(v => !v)}
              style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, padding: "6px 10px", color: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700 }}
            >
              <Globe size={14} />
              {LANGUAGES[lang as LangCode]?.label ?? "EN"}
            </button>

            {showLang && (
              <div
                onMouseLeave={() => setShowLang(false)}
                style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "white", border: "1px solid #E2E8F0", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", overflow: "hidden", zIndex: 200, minWidth: 160 }}
              >
                {(Object.entries(LANGUAGES) as [LangCode, typeof LANGUAGES[LangCode]][]).map(([code, meta]) => (
                  <button
                    key={code}
                    onClick={() => { setLang(code); setShowLang(false); }}
                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "11px 16px", border: "none", background: lang === code ? "#EEF0FB" : "white", cursor: "pointer", fontSize: 13, fontWeight: lang === code ? 700 : 400, color: lang === code ? PRIMARY : "#334155", textAlign: "left" }}
                  >
                    <span style={{ fontSize: 15, fontWeight: 700, minWidth: 24 }}>{meta.label}</span>
                    <span>{meta.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sign out */}
          <button
            onClick={logout}
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, padding: "6px 10px", color: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600 }}
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </header>

      {/* Page */}
      <main style={{ flex: 1, overflowY: "auto", paddingBottom: 72 }}>
        {children}
      </main>

      {/* Bottom nav */}
      <nav style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480,
        background: "white", borderTop: "1px solid #E0E7FF",
        display: "flex", zIndex: 50,
        boxShadow: "0 -4px 20px rgba(30,45,142,0.08)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}>
        {NAV_ITEMS.map(({ href, icon: Icon }, idx) => {
          const active = pathname.startsWith(href);
          const label  = navLabels[idx];
          return (
            <Link key={href} href={href} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 0 8px", textDecoration: "none", color: active ? PRIMARY : "#94A3B8", gap: 3 }}>
              <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <DriverAuthProvider>
      <Shell>{children}</Shell>
    </DriverAuthProvider>
  );
}
