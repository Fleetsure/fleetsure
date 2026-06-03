"use client";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { vehicleService } from "@/lib/services/vehicleService";
import { tripService } from "@/lib/services/tripService";
import { driverService } from "@/lib/services/driverService";
import { analyticsService } from "@/lib/services/analyticsService";
import {
  Truck, Users, Route, TrendingUp, CheckCircle, ChevronRight,
  TrendingDown, AlertTriangle, IndianRupee, BarChart2, MessageCircle, Sparkles, ChevronLeft
} from "lucide-react";
import Link from "next/link";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import { useLanguage } from "@/lib/LanguageContext";
import { todayISO, fmtDate as fmtDateStr } from "@/lib/date";

const GREETING_EMOJIS = ["🚀", "💪", "🌟", "⚡", "🔥", "✨", "🎯", "💼", "🏆", "😎"];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function fmt(n: number | null | undefined) {
  const safe = n ?? 0;
  if (safe >= 100000) return `₹${(safe / 100000).toFixed(1)}L`;
  if (safe >= 1000)   return `₹${(safe / 1000).toFixed(1)}K`;
  return `₹${safe.toLocaleString("en-IN")}`;
}

function MarginBar({ pct }: { pct: number | null | undefined }) {
  const safe    = pct ?? 0;
  const clamped = Math.max(0, Math.min(100, safe));
  const color   = safe < 0 ? "#e53935" : safe < 15 ? "#f57c00" : "#2e7d32";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: "#f0f0f5", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${clamped}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.4s" }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 36, textAlign: "right" }}>
        {safe.toFixed(1)}%
      </span>
    </div>
  );
}

export default function Dashboard() {
  const { t } = useLanguage();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [trips, setTrips]       = useState<any[]>([]);
  const [drivers, setDrivers]   = useState<any[]>([]);
  const [pnlData, setPnlData]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [userName, setUserName]       = useState("Fleet Owner");
  const [emoji, setEmoji]             = useState("🚀");
  const [isMobile, setIsMobile]       = useState(false);
  const [waLoading, setWaLoading]     = useState(false);
  const [insightIdx, setInsightIdx]   = useState(0);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("userName");
    if (stored) setUserName(stored);
    setEmoji(GREETING_EMOJIS[Math.floor(Math.random() * GREETING_EMOJIS.length)]);
    const refresh = () => {
      const updated = localStorage.getItem("userName");
      if (updated) setUserName(updated);
    };
    window.addEventListener("orgSettingsUpdated", refresh);
    return () => window.removeEventListener("orgSettingsUpdated", refresh);
  }, []);

  useEffect(() => {
    // Load core data independently from P&L so a backend error on one doesn't blank everything
    Promise.all([vehicleService.getAll(), tripService.getAll(), driverService.getAll()])
      .then(([v, t, d]) => {
        setVehicles(v.data || []);
        setTrips(t.data || []);
        setDrivers(d.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // P&L loads separately — if it fails, rest of dashboard still works
    analyticsService.getVehiclePnL()
      .then(p => setPnlData(p.data || []))
      .catch(() => {});
  }, []);

  const activeVehicles = vehicles.filter(v => v.status === "active").length;
  const inTripVehicles = vehicles.filter(v => v.status === "in_trip").length;
  const completedTrips = trips.filter(t => t.status === "completed").length;
  const totalRevenue   = trips.filter(t => t.status === "completed").reduce((s, t) => s + parseFloat(t.freight_amount || 0), 0);
  const availDrivers   = drivers.filter(d => d.status === "active").length;

  // Fleet-level P&L aggregates
  const fleetRevenue   = pnlData.reduce((s, v) => s + (v.revenue  ?? 0), 0);
  const fleetExpenses  = pnlData.reduce((s, v) => s + (v.expenses ?? 0), 0);
  const fleetProfit    = pnlData.reduce((s, v) => s + (v.profit   ?? 0), 0);
  const fleetMargin    = fleetRevenue > 0 ? (fleetProfit / fleetRevenue) * 100 : 0;
  const worstVehicle   = pnlData.length > 0 ? pnlData[pnlData.length - 1] : null;

  // ── WhatsApp daily summary ──────────────────────────────────
  const handleWhatsAppSummary = async () => {
    setWaLoading(true);
    try {
      const res = await analyticsService.getDailySummary();
      const d = res.data;

      const today = fmtDateStr(todayISO());
      const lines: string[] = [];

      lines.push(`*FleetSure Daily Report*`);
      lines.push(`Date: ${today}`);
      lines.push(``);

      // Fleet status
      lines.push(`*FLEET STATUS*`);
      if (d.active_trips.length > 0) {
        lines.push(`On Road: ${d.active_trips.length} trip${d.active_trips.length !== 1 ? "s" : ""}`);
        d.active_trips.forEach((t: any) => {
          lines.push(`   • ${t.reg_number || "—"} → ${t.origin} to ${t.destination}${t.driver_name ? ` (${t.driver_name})` : ""}`);
        });
      } else {
        lines.push(`No active trips right now`);
      }
      if (d.planned_trips_count > 0) lines.push(`Planned: ${d.planned_trips_count} trip${d.planned_trips_count !== 1 ? "s" : ""} ready to dispatch`);
      lines.push(``);

      // Today's numbers
      lines.push(`*TODAY'S NUMBERS*`);
      lines.push(`Completed: ${d.completed_today} trip${d.completed_today !== 1 ? "s" : ""}`);
      if (d.revenue_today > 0) {
        lines.push(`Revenue: Rs.${d.revenue_today.toLocaleString("en-IN")}`);
      } else {
        lines.push(`Revenue: Rs.0`);
      }
      lines.push(``);

      // Compliance alerts
      if (d.compliance_alerts.length > 0) {
        lines.push(`*COMPLIANCE ALERTS*`);
        d.compliance_alerts.forEach((a: any) => {
          const level = a.severity === "critical" ? "[CRITICAL]" : "[WARNING]";
          lines.push(`${level} ${a.title}`);
        });
        lines.push(``);
      }

      // Idle vehicles
      if (d.idle_vehicles.length > 0) {
        lines.push(`*IDLE VEHICLES*`);
        d.idle_vehicles.forEach((v: any) => {
          const days = v.idle_days !== null ? `${v.idle_days} days idle` : "no trips yet";
          lines.push(`• ${v.registration_number} — ${days}`);
        });
        lines.push(``);
      }

      lines.push(`_Powered by FleetSure_`);

      const message = lines.join("\n");
      const encoded = encodeURIComponent(message);

      // Route to owner's own number if phone saved, else open picker
      const phone = d.owner_phone ? `91${d.owner_phone.replace(/\D/g, "").replace(/^91/, "")}` : "";
      const url = phone
        ? `https://wa.me/${phone}?text=${encoded}`
        : `https://wa.me/?text=${encoded}`;

      window.open(url, "_blank");
    } catch {
      alert("Could not load summary. Please try again.");
    } finally {
      setWaLoading(false);
    }
  };

  const setupSteps = [
    { label: "Add your first vehicle", done: vehicles.length > 0, href: "/vehicles", cta: "Add Vehicle" },
    { label: "Add a driver",           done: drivers.length > 0,  href: "/drivers",  cta: "Add Driver" },
    { label: "Log your first trip",    done: trips.length > 0,    href: "/trips",    cta: "Log Trip" },
  ];

  // ── Smart Insights (Variable Reward) ──────────────────────────
  const insights = (() => {
    const list: { emoji: string; headline: string; detail: string; color: string; bg: string }[] = [];

    if (completedTrips >= 3) {
      const avg = Math.round(totalRevenue / completedTrips);
      list.push({
        emoji: "📊",
        headline: `Based on your ${completedTrips} trips`,
        detail: `Your average freight per trip is ₹${avg.toLocaleString("en-IN")} — keep logging to sharpen this number.`,
        color: "#1E2D8E", bg: "#eef0fb",
      });
    }

    if (pnlData.length > 0 && pnlData[0].profit > 0) {
      const best = pnlData[0];
      list.push({
        emoji: "🏆",
        headline: `${best.reg_number} is your star truck`,
        detail: `${(best.margin_pct ?? 0).toFixed(1)}% profit margin across ${best.completed_trips} trips — highest in your fleet.`,
        color: "#2e7d32", bg: "#e8f5e9",
      });
    }

    if (fleetProfit > 0 && pnlData.length > 0) {
      list.push({
        emoji: "💰",
        headline: `Fleet is running profitable`,
        detail: `${fmt(fleetProfit)} total profit at ${fleetMargin.toFixed(1)}% margin. Every trip logged makes this more accurate.`,
        color: "#1565c0", bg: "#e3f2fd",
      });
    }

    if (pnlData.length > 1) {
      const worst = pnlData[pnlData.length - 1];
      if (worst.profit < 0) {
        list.push({
          emoji: "⚠️",
          headline: `${worst.registration_number} needs attention`,
          detail: `Running at a loss of ${fmt(Math.abs(worst.profit))}. Check fuel costs and trip freight on this truck.`,
          color: "#c62828", bg: "#fce4ec",
        });
      }
    }

    if (vehicles.length > 0 && completedTrips > 0) {
      const ratio = (completedTrips / vehicles.length).toFixed(1);
      list.push({
        emoji: "🚛",
        headline: `${completedTrips} trips across ${vehicles.length} trucks`,
        detail: `${ratio} trips per vehicle on average. The more you log, the better your route insights.`,
        color: "#e65100", bg: "#fff3e0",
      });
    }

    return list;
  })();

  const currentInsight = insights[insightIdx % Math.max(insights.length, 1)];

  // Brand new user — show full onboarding screen
  if (!loading && vehicles.length === 0) {
    return (
      <div style={{ flex: 1, overflowY: "auto" }}>
        <Header title={`${getGreeting()}, ${userName} ${emoji}`} subtitle="Let's get your fleet set up" />
        <OnboardingChecklist
          userName={userName}
          hasVehicles={false}
          hasDrivers={drivers.length > 0}
          hasTrips={trips.length > 0}
        />
      </div>
    );
  }

  return (
    <div>
      <Header title={`${getGreeting()}, ${userName} ${emoji}`} subtitle={t("analytics.subtitle")} />
      <div style={{ padding: isMobile ? "14px" : "24px 28px" }}>

        {/* Setup Guide */}
        {!setupSteps.every(s => s.done) && (
          <div className="card" style={{ marginBottom: 24, borderLeft: "4px solid #1E2D8E" }}>
            <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: "#1E2D8E" }}>Set up your fleet in 3 steps</h3>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "#888" }}>Complete these once. Daily work becomes one tap.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {setupSteps.map((step, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {step.done
                      ? <CheckCircle size={18} color="#1a7a34" />
                      : <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid #ccc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#aaa", fontWeight: 700 }}>{i+1}</div>
                    }
                    <span style={{ fontSize: 13.5, color: step.done ? "#aaa" : "#1a1a2e", textDecoration: step.done ? "line-through" : "none" }}>{step.label}</span>
                  </div>
                  {!step.done && <Link href={step.href}><button className="btn-primary" style={{ fontSize: 12, padding: "5px 12px" }}>{step.cta}</button></Link>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Stats */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: isMobile ? 10 : 16, marginBottom: isMobile ? 16 : 24 }}>
          {[
            { label: t("vehicle.total"),  value: vehicles.length, sub: `${activeVehicles} ${t("driver.available")} · ${inTripVehicles} ${t("vehicle.on_trip")}`, icon: Truck },
            { label: t("driver.total"),  value: drivers.length,  sub: `${availDrivers} ${t("driver.available")}`,        icon: Users },
            { label: t("dash.total_trips"), value: trips.length, sub: `${completedTrips} ${t("status.completed")}`,      icon: Route },
            { label: t("dash.revenue"),  value: `₹${(totalRevenue/1000).toFixed(1)}K`, sub: t("status.completed"), icon: TrendingUp },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "#e8eaf6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <s.icon size={20} color="#1E2D8E" />
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#1a1a2e", lineHeight: 1.1 }}>{loading ? "—" : s.value}</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: "#bbb", marginTop: 1 }}>{s.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── WhatsApp Daily Summary ───────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "#e7fce8", border: "1.5px solid #a5d6a7", borderRadius: 12,
          padding: isMobile ? "12px 14px" : "14px 20px",
          marginBottom: isMobile ? 16 : 24,
          flexWrap: "wrap", gap: 10,
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#1b5e20", display: "flex", alignItems: "center", gap: 8 }}>
              <MessageCircle size={16} color="#2e7d32" />
              WhatsApp Daily Report
            </div>
            <div style={{ fontSize: 12, color: "#4caf50", marginTop: 2 }}>
              Active trips · revenue · compliance alerts · idle vehicles — sent to your WhatsApp
            </div>
          </div>
          <button
            onClick={handleWhatsAppSummary}
            disabled={waLoading}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: waLoading ? "#a5d6a7" : "#25D366",
              color: "white", border: "none", borderRadius: 8,
              padding: "9px 18px", fontSize: 13.5, fontWeight: 700,
              cursor: waLoading ? "not-allowed" : "pointer",
              boxShadow: "0 2px 8px rgba(37,211,102,0.3)",
              whiteSpace: "nowrap",
            }}>
            <MessageCircle size={15} />
            {waLoading ? "Loading…" : "Send Summary"}
          </button>
        </div>

        {/* ── Smart Insight Card ──────────────────────────────────── */}
        {insights.length > 0 && currentInsight && (
          <div style={{
            display: "flex", alignItems: "center", gap: 16,
            background: currentInsight.bg,
            border: `1.5px solid ${currentInsight.color}22`,
            borderRadius: 12,
            padding: isMobile ? "14px" : "16px 20px",
            marginBottom: isMobile ? 16 : 24,
            transition: "background 0.3s",
          }}>
            <div style={{ fontSize: 32, flexShrink: 0 }}>{currentInsight.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                <Sparkles size={13} color={currentInsight.color} />
                <span style={{ fontSize: 11, fontWeight: 700, color: currentInsight.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>Fleet Insight</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: currentInsight.color, marginBottom: 3 }}>{currentInsight.headline}</div>
              <div style={{ fontSize: 13, color: "#555", lineHeight: 1.5 }}>{currentInsight.detail}</div>
            </div>
            {insights.length > 1 && (
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button onClick={() => setInsightIdx(i => (i - 1 + insights.length) % insights.length)}
                  style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${currentInsight.color}44`, background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ChevronLeft size={14} color={currentInsight.color} />
                </button>
                <button onClick={() => setInsightIdx(i => (i + 1) % insights.length)}
                  style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${currentInsight.color}44`, background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ChevronRight size={14} color={currentInsight.color} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── P&L Per Truck Section ─────────────────────────────────── */}
        {pnlData.length > 0 && (
          <div className="card" style={{ marginBottom: 24 }}>
            {/* Section header */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <h2 style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                    <BarChart2 size={17} color="#1E2D8E" /> P&amp;L per Truck
                  </h2>
                  {!isMobile && <p style={{ margin: 0, fontSize: 12, color: "#888" }}>Revenue, expenses and profit margin per vehicle</p>}
                </div>
              </div>
              {/* Fleet summary pills — always wrap-friendly */}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 8 }}>
                {[
                  { label: "Revenue",  value: fmt(fleetRevenue),  color: "#1565c0", bg: "#e3f2fd" },
                  { label: "Expenses", value: fmt(fleetExpenses), color: "#b71c1c", bg: "#fce4ec" },
                  { label: "Profit",   value: fmt(fleetProfit),   color: fleetProfit >= 0 ? "#2e7d32" : "#e53935", bg: fleetProfit >= 0 ? "#e8f5e9" : "#fce4ec" },
                  { label: "Margin",   value: `${fleetMargin.toFixed(1)}%`, color: fleetMargin >= 15 ? "#2e7d32" : fleetMargin >= 0 ? "#e65100" : "#e53935", bg: fleetMargin >= 15 ? "#e8f5e9" : fleetMargin >= 0 ? "#fff3e0" : "#fce4ec" },
                ].map(p => (
                  <div key={p.label} style={{ textAlign: "center", padding: isMobile ? "8px 4px" : "8px 14px", borderRadius: 10, background: p.bg }}>
                    <div style={{ fontSize: isMobile ? 13 : 15, fontWeight: 800, color: p.color }}>{p.value}</div>
                    <div style={{ fontSize: 10, color: "#888", marginTop: 1 }}>{p.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Worst performer alert */}
            {worstVehicle && worstVehicle.profit < 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 9, background: "#fff3e0", border: "1px solid #ffcc80", marginBottom: 16 }}>
                <AlertTriangle size={16} color="#e65100" />
                <span style={{ fontSize: 13, color: "#bf360c" }}>
                  <strong>{worstVehicle.registration_number}</strong> is running at a loss of {fmt(Math.abs(worstVehicle.profit))} — review its trip costs.
                </span>
              </div>
            )}

            {/* Table / Cards */}
            {isMobile ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {pnlData.map((v: any, i: number) => {
                  const isWorst = i === pnlData.length - 1 && v.profit < 0 && pnlData.length > 1;
                  const isBest  = i === 0 && v.profit > 0;
                  return (
                    <div key={v.vehicle_id} style={{ padding: "12px 14px", borderRadius: 10, background: isWorst ? "#fff8f8" : isBest ? "#f6fff6" : "var(--bg-subtle)", border: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a2e" }}>{v.registration_number}</div>
                          <div style={{ fontSize: 11, color: "#aaa" }}>{v.make} {v.model}</div>
                        </div>
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          {isBest  && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: "#e8f5e9", color: "#2e7d32" }}>★ Best</span>}
                          {isWorst && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: "#fce4ec", color: "#b71c1c" }}>↓ Worst</span>}
                          <span style={{ fontSize: 11, color: "#aaa" }}>{v.completed_trips}/{v.total_trips} trips</span>
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 8 }}>
                        <div style={{ textAlign: "center", padding: "6px 4px", borderRadius: 8, background: "#e3f2fd" }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#1565c0" }}>{fmt(v.revenue)}</div>
                          <div style={{ fontSize: 10, color: "#888" }}>Revenue</div>
                        </div>
                        <div style={{ textAlign: "center", padding: "6px 4px", borderRadius: 8, background: "#fce4ec" }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#b71c1c" }}>{fmt(v.expenses)}</div>
                          <div style={{ fontSize: 10, color: "#888" }}>Expenses</div>
                        </div>
                        <div style={{ textAlign: "center", padding: "6px 4px", borderRadius: 8, background: v.profit >= 0 ? "#e8f5e9" : "#fce4ec" }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: v.profit >= 0 ? "#2e7d32" : "#e53935", display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>
                            {v.profit >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {fmt(Math.abs(v.profit))}
                          </div>
                          <div style={{ fontSize: 10, color: "#888" }}>Profit</div>
                        </div>
                      </div>
                      <MarginBar pct={v.margin_pct} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #f0f0f8" }}>
                      <th style={{ textAlign: "left", padding: "8px 10px", color: "#aaa", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>Vehicle</th>
                      <th style={{ textAlign: "center", padding: "8px 10px", color: "#aaa", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>Trips</th>
                      <th style={{ textAlign: "right", padding: "8px 10px", color: "#aaa", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>Revenue</th>
                      <th style={{ textAlign: "right", padding: "8px 10px", color: "#aaa", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>Expenses</th>
                      <th style={{ textAlign: "right", padding: "8px 10px", color: "#aaa", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>Profit</th>
                      <th style={{ padding: "8px 10px", color: "#aaa", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", minWidth: 140 }}>Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pnlData.map((v: any, i: number) => {
                      const isWorst = i === pnlData.length - 1 && v.profit < 0 && pnlData.length > 1;
                      const isBest  = i === 0 && v.profit > 0;
                      return (
                        <tr key={v.vehicle_id} style={{ borderBottom: "1px solid #f5f5fa", background: isWorst ? "#fff8f8" : isBest ? "#f6fff6" : "transparent" }}>
                          <td style={{ padding: "12px 10px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#e8eaf6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Truck size={15} color="#1E2D8E" />
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: "#1a1a2e", fontSize: 13.5 }}>{v.registration_number}</div>
                                <div style={{ fontSize: 11, color: "#aaa" }}>{v.make} {v.model}</div>
                              </div>
                              {isBest  && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: "#e8f5e9", color: "#2e7d32" }}>★ Best</span>}
                              {isWorst && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: "#fce4ec", color: "#b71c1c" }}>↓ Worst</span>}
                            </div>
                          </td>
                          <td style={{ padding: "12px 10px", textAlign: "center", color: "#555" }}>
                            <span style={{ fontWeight: 600 }}>{v.completed_trips}</span>
                            <span style={{ color: "#bbb", fontSize: 11 }}>/{v.total_trips}</span>
                          </td>
                          <td style={{ padding: "12px 10px", textAlign: "right", fontWeight: 700, color: "#1565c0" }}>{fmt(v.revenue)}</td>
                          <td style={{ padding: "12px 10px", textAlign: "right", color: "#b71c1c" }}>
                            <div>{fmt(v.expenses)}</div>
                          </td>
                          <td style={{ padding: "12px 10px", textAlign: "right" }}>
                            <span style={{ fontWeight: 800, fontSize: 14, color: v.profit >= 0 ? "#2e7d32" : "#e53935", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 3 }}>
                              {v.profit >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                              {fmt(Math.abs(v.profit))}
                            </span>
                          </td>
                          <td style={{ padding: "12px 10px" }}>
                            <MarginBar pct={v.margin_pct} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footnote */}
            <p style={{ margin: "12px 0 0", fontSize: 11, color: "#ccc" }}>
              Expenses include trip-level costs (fuel, tolls, etc.) + standalone fuel fill-ups. Driver payments tracked separately in ledger.
            </p>
          </div>
        )}

        {/* Recent Trips */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Recent Trips</h2>
            <Link href="/trips" style={{ fontSize: 13, color: "#1E2D8E", textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>View all <ChevronRight size={14} /></Link>
          </div>
          {trips.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#ccc" }}>
              <Route size={36} style={{ margin: "0 auto 10px", display: "block" }} />
              <p style={{ margin: "0 0 12px", fontSize: 13.5, color: "#aaa" }}>No trips logged yet</p>
              <Link href="/trips"><button className="btn-primary">Log First Trip</button></Link>
            </div>
          ) : isMobile ? (
            // Mobile: card list
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {trips.slice(0, 5).map((t: any) => (
                <div key={t.id} style={{ padding: "12px 14px", borderRadius: 10, background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-main)" }}>{t.origin} → {t.destination}</div>
                    <span className={`badge badge-${t.status}`} style={{ flexShrink: 0, marginLeft: 8 }}>{t.status.replace("_", " ")}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-muted)" }}>
                    <span>{t.driver_name} · {t.start_date}</span>
                    <span style={{ fontWeight: 700, color: "#1E2D8E" }}>₹{Number(t.freight_amount).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Desktop: table
            <table>
              <thead><tr><th>Route</th><th>Driver</th><th>Date</th><th>Revenue</th><th>Status</th></tr></thead>
              <tbody>
                {trips.slice(0, 5).map((t: any) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>{t.origin} → {t.destination}</td>
                    <td>{t.driver_name}</td>
                    <td>{fmtDateStr(t.start_date)}</td>
                    <td style={{ fontWeight: 600, color: "#1E2D8E" }}>₹{Number(t.freight_amount).toLocaleString("en-IN")}</td>
                    <td><span className={`badge badge-${t.status}`}>{t.status.replace("_", " ")}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
