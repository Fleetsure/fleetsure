"use client";
import { Bell, Search, RefreshCw, Truck, Users, Route, Building2 } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

type Result = {
  id: string;
  label: string;
  sub: string;
  type: "vehicle" | "driver" | "trip" | "party";
  href: string;
};

const TYPE_META = {
  vehicle: { label: "Vehicles",  icon: Truck,      color: "#1E2D8E" },
  driver:  { label: "Drivers",   icon: Users,      color: "#2e7d32" },
  trip:    { label: "Trips",     icon: Route,      color: "#e65100" },
  party:   { label: "Parties",   icon: Building2,  color: "#6d4c41" },
};

export default function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const router = useRouter();
  const [query, setQuery]       = useState("");
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [results, setResults]   = useState<Result[]>([]);
  const [cache, setCache]       = useState<{ vehicles: any[]; drivers: any[]; trips: any[]; parties: any[] } | null>(null);
  const [cursor, setCursor]     = useState(-1);
  const inputRef  = useRef<HTMLInputElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCursor(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch all data once on first focus
  const fetchAll = useCallback(async () => {
    if (cache) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("token") || "";
      const headers = { Authorization: `Bearer ${token}` };
      const [vRes, dRes, tRes, pRes] = await Promise.all([
        fetch(`${API}/vehicles`,  { headers }),
        fetch(`${API}/drivers`,   { headers }),
        fetch(`${API}/trips`,     { headers }),
        fetch(`${API}/parties`,   { headers }),
      ]);
      const [vehicles, drivers, trips, parties] = await Promise.all([
        vRes.ok ? vRes.json() : [],
        dRes.ok ? dRes.json() : [],
        tRes.ok ? tRes.json() : [],
        pRes.ok ? pRes.json() : [],
      ]);
      setCache({ vehicles, drivers, trips, parties });
    } catch (_) {}
    finally { setLoading(false); }
  }, [cache]);

  // Filter cached data against query
  useEffect(() => {
    if (!query.trim() || !cache) { setResults([]); return; }
    const q = query.toLowerCase();

    const vehicleResults: Result[] = (cache.vehicles || [])
      .filter((v: any) => v.reg_number?.toLowerCase().includes(q) || v.make?.toLowerCase().includes(q) || v.model?.toLowerCase().includes(q))
      .slice(0, 4)
      .map((v: any) => ({
        id: v.id, type: "vehicle" as const,
        label: v.reg_number || "Unknown",
        sub: [v.make, v.model].filter(Boolean).join(" ") || "Vehicle",
        href: "/vehicles",
      }));

    const driverResults: Result[] = (cache.drivers || [])
      .filter((d: any) => d.name?.toLowerCase().includes(q) || d.phone?.toLowerCase().includes(q) || d.license_number?.toLowerCase().includes(q))
      .slice(0, 4)
      .map((d: any) => ({
        id: d.id, type: "driver" as const,
        label: d.name || "Unknown Driver",
        sub: d.phone || d.license_number || "Driver",
        href: "/drivers",
      }));

    const tripResults: Result[] = (cache.trips || [])
      .filter((t: any) => t.trip_number?.toLowerCase().includes(q) || t.origin?.toLowerCase().includes(q) || t.destination?.toLowerCase().includes(q) || t.vehicle_reg?.toLowerCase().includes(q))
      .slice(0, 4)
      .map((t: any) => ({
        id: t.id, type: "trip" as const,
        label: t.trip_number || `Trip`,
        sub: [t.origin, t.destination].filter(Boolean).join(" → ") || t.vehicle_reg || "Trip",
        href: "/trips",
      }));

    const partyResults: Result[] = (cache.parties || [])
      .filter((p: any) => p.name?.toLowerCase().includes(q) || p.phone?.toLowerCase().includes(q) || p.gst_number?.toLowerCase().includes(q))
      .slice(0, 3)
      .map((p: any) => ({
        id: p.id, type: "party" as const,
        label: p.name || "Unknown Party",
        sub: p.phone || p.gst_number || "Party",
        href: "/parties",
      }));

    setResults([...vehicleResults, ...driverResults, ...tripResults, ...partyResults]);
    setCursor(-1);
  }, [query, cache]);

  const handleSelect = (r: Result) => {
    router.push(r.href);
    setQuery("");
    setOpen(false);
    setCursor(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setCursor(c => Math.max(c - 1, -1)); }
    if (e.key === "Enter" && cursor >= 0) handleSelect(results[cursor]);
    if (e.key === "Escape") { setOpen(false); setCursor(-1); }
  };

  // Group results by type
  const grouped = (["vehicle", "driver", "trip", "party"] as const)
    .map(type => ({ type, items: results.filter(r => r.type === type) }))
    .filter(g => g.items.length > 0);

  return (
    <header style={{
      background: "var(--bg-card)",
      borderBottom: "1px solid var(--border)",
      padding: "14px 28px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      position: "relative", zIndex: 100,
    }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--text-main)" }}>{title}</h1>
        {subtitle && <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{subtitle}</p>}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* ── Global search ── */}
        <div ref={wrapRef} style={{ position: "relative" }}>
          <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", zIndex: 1 }} />
          <input
            ref={inputRef}
            value={query}
            placeholder="Search vehicles, drivers, trips…"
            style={{
              paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7,
              border: `1px solid ${open ? "#1E2D8E" : "var(--border-input)"}`,
              borderRadius: 8, fontSize: 13,
              width: open ? 280 : 220,
              color: "var(--text-main)", background: "var(--bg-subtle)",
              transition: "width 0.2s, border-color 0.15s",
              outline: "none",
            }}
            onFocus={() => { setOpen(true); fetchAll(); }}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onKeyDown={handleKeyDown}
          />

          {/* Dropdown */}
          {open && (
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", right: 0,
              width: 320, background: "var(--bg-card)",
              border: "1px solid var(--border)", borderRadius: 10,
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
              zIndex: 9999, overflow: "hidden",
            }}>
              {loading && (
                <div style={{ padding: "14px 16px", fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>
                  Loading…
                </div>
              )}

              {!loading && query.trim() === "" && (
                <div style={{ padding: "14px 16px", fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>
                  Type to search vehicles, drivers, trips…
                </div>
              )}

              {!loading && query.trim() !== "" && results.length === 0 && (
                <div style={{ padding: "14px 16px", fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>
                  No results for "{query}"
                </div>
              )}

              {grouped.map(({ type, items }) => {
                const meta = TYPE_META[type];
                const Icon = meta.icon;
                return (
                  <div key={type}>
                    <div style={{ padding: "8px 14px 4px", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", borderTop: "1px solid var(--border)" }}>
                      {meta.label}
                    </div>
                    {items.map((r, i) => {
                      const globalIdx = results.indexOf(r);
                      const isActive = globalIdx === cursor;
                      return (
                        <div key={r.id}
                          onClick={() => handleSelect(r)}
                          style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "9px 14px", cursor: "pointer",
                            background: isActive ? "var(--bg-hover)" : "transparent",
                            transition: "background 0.1s",
                          }}
                          onMouseEnter={() => setCursor(globalIdx)}
                          onMouseLeave={() => setCursor(-1)}
                        >
                          <div style={{ width: 28, height: 28, borderRadius: 7, background: meta.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Icon size={14} color={meta.color} />
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-main)" }}>{r.label}</div>
                            <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{r.sub}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 6 }}>
          <Bell size={18} />
        </button>
        <button onClick={() => window.location.reload()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 6 }}>
          <RefreshCw size={16} />
        </button>
      </div>
    </header>
  );
}
