"use client";
import { Search, X, Truck, Users, Route, Building2, ArrowLeft, Bell } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { vehicleService } from "@/lib/services/vehicleService";
import { driverService } from "@/lib/services/driverService";
import { tripService } from "@/lib/services/tripService";
import { partyService } from "@/lib/services/partyService";

const InsightsPanel = dynamic(() => import("@/components/InsightsPanel"), { ssr: false });

type Result = {
  id: string; label: string; sub: string;
  type: "vehicle" | "driver" | "trip" | "party"; href: string;
};

const TYPE_META = {
  vehicle: { label: "Vehicles", icon: Truck,     color: "#1E2D8E" },
  driver:  { label: "Drivers",  icon: Users,     color: "#2e7d32" },
  trip:    { label: "Trips",    icon: Route,     color: "#e65100" },
  party:   { label: "Parties",  icon: Building2, color: "#6d4c41" },
};

export default function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const router = useRouter();
  const [query, setQuery]     = useState("");
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [cache, setCache]     = useState<{ vehicles: any[]; drivers: any[]; trips: any[]; parties: any[] } | null>(null);
  const [cursor, setCursor]   = useState(-1);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false); setCursor(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchAll = useCallback(async () => {
    if (cache) return;
    setLoading(true);
    try {
      const [v, d, t, p] = await Promise.all([
        vehicleService.getAll(),
        driverService.getAll(),
        tripService.getAll(),
        partyService.getAll(),
      ]);
      setCache({
        vehicles: v.data || [],
        drivers:  d.data || [],
        trips:    t.data || [],
        parties:  p.data || [],
      });
    } catch (_) {} finally { setLoading(false); }
  }, [cache]);

  useEffect(() => {
    if (!query.trim() || !cache) { setResults([]); return; }
    const q = query.toLowerCase();
    const vehicleResults: Result[] = (cache.vehicles || [])
      .filter((v: any) => v.registration_number?.toLowerCase().includes(q) || v.make?.toLowerCase().includes(q) || v.model?.toLowerCase().includes(q))
      .slice(0, 4).map((v: any) => ({ id: v.id, type: "vehicle" as const, label: v.registration_number || "Unknown", sub: [v.make, v.model].filter(Boolean).join(" ") || "Vehicle", href: "/vehicles" }));
    const driverResults: Result[] = (cache.drivers || [])
      .filter((d: any) => d.name?.toLowerCase().includes(q) || d.phone?.toLowerCase().includes(q))
      .slice(0, 4).map((d: any) => ({ id: d.id, type: "driver" as const, label: d.name || "Unknown", sub: d.phone || "Driver", href: "/drivers" }));
    const tripResults: Result[] = (cache.trips || [])
      .filter((t: any) => t.trip_number?.toLowerCase().includes(q) || t.origin?.toLowerCase().includes(q) || t.destination?.toLowerCase().includes(q))
      .slice(0, 4).map((t: any) => ({ id: t.id, type: "trip" as const, label: t.trip_number || "Trip", sub: [t.origin, t.destination].filter(Boolean).join(" → ") || "Trip", href: "/trips" }));
    const partyResults: Result[] = (cache.parties || [])
      .filter((p: any) => p.name?.toLowerCase().includes(q) || p.phone?.toLowerCase().includes(q))
      .slice(0, 3).map((p: any) => ({ id: p.id, type: "party" as const, label: p.name || "Unknown", sub: p.phone || "Party", href: "/parties" }));
    setResults([...vehicleResults, ...driverResults, ...tripResults, ...partyResults]);
    setCursor(-1);
  }, [query, cache]);

  const handleSelect = (r: Result) => {
    router.push(r.href); setQuery(""); setOpen(false); setMobileSearchOpen(false); setCursor(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setCursor(c => Math.max(c - 1, -1)); }
    if (e.key === "Enter" && cursor >= 0) handleSelect(results[cursor]);
    if (e.key === "Escape") { setOpen(false); setCursor(-1); }
  };

  const grouped = (["vehicle", "driver", "trip", "party"] as const)
    .map(type => ({ type, items: results.filter(r => r.type === type) }))
    .filter(g => g.items.length > 0);

  const SearchDropdown = () => (
    <div style={{
      position: isMobile ? "fixed" : "absolute",
      top: isMobile ? 56 : "calc(100% + 6px)",
      left: isMobile ? 0 : "auto",
      right: 0,
      width: isMobile ? "100vw" : 320,
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: isMobile ? "0 0 16px 16px" : 10,
      boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
      zIndex: 9999, overflow: "hidden",
    }}>
      {loading && <div style={{ padding: "14px 16px", fontSize: 14, color: "var(--text-muted)", textAlign: "center" }}>Searching…</div>}
      {!loading && query.trim() === "" && <div style={{ padding: "14px 16px", fontSize: 14, color: "var(--text-muted)", textAlign: "center" }}>Search vehicles, drivers, trips…</div>}
      {!loading && query.trim() !== "" && results.length === 0 && <div style={{ padding: "14px 16px", fontSize: 14, color: "var(--text-muted)", textAlign: "center" }}>No results for "{query}"</div>}
      {grouped.map(({ type, items }) => {
        const meta = TYPE_META[type];
        const Icon = meta.icon;
        return (
          <div key={type}>
            <div style={{ padding: "8px 14px 4px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", borderTop: "1px solid var(--border)" }}>
              {meta.label}
            </div>
            {items.map(r => {
              const globalIdx = results.indexOf(r);
              const isActive = globalIdx === cursor;
              return (
                <div key={r.id} onClick={() => handleSelect(r)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: isMobile ? "12px 16px" : "9px 14px", cursor: "pointer", background: isActive ? "var(--bg-hover)" : "transparent" }}
                  onMouseEnter={() => setCursor(globalIdx)} onMouseLeave={() => setCursor(-1)}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: meta.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={15} color={meta.color} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-main)" }}>{r.label}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );

  // ── MOBILE HEADER ─────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {/* Full-screen search overlay on mobile */}
        {mobileSearchOpen && (
          <div style={{ position: "fixed", inset: 0, background: "var(--bg-page)", zIndex: 9998, display: "flex", flexDirection: "column" }}>
            {/* Search bar row */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
              <button onClick={() => { setMobileSearchOpen(false); setQuery(""); setOpen(false); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-main)", padding: 4, flexShrink: 0 }}>
                <ArrowLeft size={22} />
              </button>
              <input
                ref={inputRef}
                autoFocus
                value={query}
                placeholder="Search vehicles, drivers, trips…"
                onChange={e => { setQuery(e.target.value); setOpen(true); fetchAll(); }}
                onKeyDown={handleKeyDown}
                style={{
                  flex: 1, padding: "10px 14px", border: "1.5px solid var(--border-input)",
                  borderRadius: 10, fontSize: 15, color: "var(--text-main)",
                  background: "var(--bg-subtle)", outline: "none",
                }}
              />
              {query && (
                <button onClick={() => { setQuery(""); setResults([]); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, flexShrink: 0 }}>
                  <X size={18} />
                </button>
              )}
            </div>
            {/* Results */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {loading && <div style={{ padding: "20px", fontSize: 14, color: "var(--text-muted)", textAlign: "center" }}>Searching…</div>}
              {!loading && query.trim() === "" && (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
                  Type to search across your fleet
                </div>
              )}
              {!loading && query.trim() !== "" && results.length === 0 && (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>No results for "{query}"</div>
              )}
              {grouped.map(({ type, items }) => {
                const meta = TYPE_META[type];
                const Icon = meta.icon;
                return (
                  <div key={type}>
                    <div style={{ padding: "14px 16px 6px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
                      {meta.label}
                    </div>
                    {items.map(r => (
                      <div key={r.id} onClick={() => handleSelect(r)}
                        style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", cursor: "pointer", borderBottom: "1px solid var(--border)" }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: meta.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Icon size={18} color={meta.color} />
                        </div>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-main)" }}>{r.label}</div>
                          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{r.sub}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Mobile top bar — minimal */}
        <header style={{
          background: "var(--bg-card)", borderBottom: "1px solid var(--border)",
          padding: "12px 16px", display: "flex", alignItems: "center",
          justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100,
        }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text-main)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</h1>
            {subtitle && <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>{subtitle}</p>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {/* Bell */}
            <button
              onClick={() => setInsightsOpen(true)}
              style={{ position: "relative", background: "none", border: "none", cursor: "pointer", padding: 6, color: "var(--text-muted)" }}>
              <Bell size={20} />
              {unreadCount > 0 && (
                <span style={{ position: "absolute", top: 2, right: 2, width: 16, height: 16, borderRadius: "50%", background: "#e53935", color: "white", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => { setMobileSearchOpen(true); fetchAll(); }}
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-input)", borderRadius: 10, padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: "var(--text-muted)" }}>
              <Search size={16} />
              <span style={{ fontSize: 13 }}>Search</span>
            </button>
          </div>
        </header>

        {insightsOpen && (
          <InsightsPanel onClose={() => setInsightsOpen(false)} onUnreadChange={setUnreadCount} />
        )}
      </>
    );
  }

  // ── DESKTOP HEADER ────────────────────────────────────────────────────────────
  return (
    <>
      <header style={{
        background: "var(--bg-card)", borderBottom: "1px solid var(--border)",
        padding: "14px 28px", display: "flex", alignItems: "center",
        justifyContent: "space-between", position: "relative", zIndex: 100,
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--text-main)" }}>{title}</h1>
          {subtitle && <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{subtitle}</p>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div ref={wrapRef} style={{ position: "relative" }}>
            <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", zIndex: 1 }} />
            <input ref={inputRef} value={query} placeholder="Search vehicles, drivers, trips…"
              style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7, border: `1px solid ${open ? "#1E2D8E" : "var(--border-input)"}`, borderRadius: 8, fontSize: 13, width: open ? 280 : 220, color: "var(--text-main)", background: "var(--bg-subtle)", transition: "width 0.2s, border-color 0.15s", outline: "none" }}
              onFocus={() => { setOpen(true); fetchAll(); }}
              onChange={e => { setQuery(e.target.value); setOpen(true); }}
              onKeyDown={handleKeyDown}
            />
            {open && <SearchDropdown />}
          </div>

          {/* Bell — Insights */}
          <button
            onClick={() => setInsightsOpen(true)}
            title="Fleet Intelligence"
            style={{ position: "relative", background: "var(--bg-subtle)", border: "1px solid var(--border-input)", borderRadius: 8, padding: "7px 10px", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
            <Bell size={16} />
            {unreadCount > 0 && (
              <span style={{ position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, borderRadius: "50%", background: "#e53935", color: "white", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          <LanguageSwitcher />
          <button onClick={() => window.location.reload()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 6 }}>
            ↺
          </button>
        </div>
      </header>

      {insightsOpen && (
        <InsightsPanel onClose={() => setInsightsOpen(false)} onUnreadChange={setUnreadCount} />
      )}
    </>
  );
}
