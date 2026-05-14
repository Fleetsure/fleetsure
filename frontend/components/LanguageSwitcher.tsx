"use client";
import { useState, useRef, useEffect } from "react";
import { Languages, Check } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { LANGUAGES, LangCode } from "@/lib/translations";

export default function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const langList = Object.entries(LANGUAGES) as [LangCode, typeof LANGUAGES[LangCode]][];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Change Language"
        style={{
          display: "flex", alignItems: "center", gap: 5,
          background: "var(--bg-subtle)", border: "1px solid var(--border-input)",
          borderRadius: 8, padding: "6px 10px", cursor: "pointer",
          color: "var(--text-muted)", fontSize: 13, fontWeight: 600,
        }}
      >
        <Languages size={15} />
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)" }}>
          {LANGUAGES[lang].label}
        </span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0,
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
          zIndex: 9999, minWidth: 180, overflow: "hidden", padding: "6px 0",
        }}>
          <div style={{ padding: "6px 14px 8px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
            Select Language
          </div>
          {langList.map(([code, meta]) => (
            <button
              key={code}
              onClick={() => { setLang(code); setOpen(false); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "9px 14px", background: lang === code ? "#f0f1fa" : "transparent",
                border: "none", cursor: "pointer", textAlign: "left",
                borderLeft: lang === code ? "3px solid #1E2D8E" : "3px solid transparent",
              }}
              onMouseEnter={e => { if (lang !== code) e.currentTarget.style.background = "var(--bg-hover)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = lang === code ? "#f0f1fa" : "transparent"; }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 16, width: 24, textAlign: "center", fontWeight: 700, color: "#1E2D8E" }}>
                  {meta.label}
                </span>
                <span style={{ fontSize: 13, color: "var(--text-main)", fontWeight: lang === code ? 700 : 400 }}>
                  {meta.name}
                </span>
              </div>
              {lang === code && <Check size={14} color="#1E2D8E" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
