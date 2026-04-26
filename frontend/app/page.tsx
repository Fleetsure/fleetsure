"use client";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { getVehicles, getTrips, getDrivers, getVehiclePnL } from "@/lib/api";
import {
  Truck, Users, Route, TrendingUp, CheckCircle, ChevronRight,
  TrendingDown, AlertTriangle, IndianRupee, BarChart2
} from "lucide-react";
import Link from "next/link";

const GREETING_EMOJIS = ["🚀", "💪", "🌟", "⚡", "🔥", "✨", "🎯", "💼", "🏆", "😎"];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function fmt(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function MarginBar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const color   = pct < 0 ? "#e53935" : pct < 15 ? "#f57c00" : "#2e7d32";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: "#f0f0f5", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${clamped}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.4s" }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 36, textAlign: "right" }}>
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

export default function Dashboard() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [trips, setTrips]       = useState<any[]>([]);
  const [drivers, setDrivers]   = useState<any[]>([]);
  const [pnlData, setPnlData]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [userName, setUserName] = useState("Fleet Owner");
  const [emoji, setEmoji]       = useState("🚀");

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
    Promise.all([getVehicles(), getTrips(), getDrivers()])
      .then(([v, t, d]) => {
        setVehicles(v.data);
        setTrips(t.data);
        setDrivers(d.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // P&L loads separately — if it fails, rest of dashboard still works
    getVehiclePnL()
      .then(p => setPnlData(p.data || []))
      .catch(() => {});
  }, []);

  const activeVehicles = vehicles.filter(v => v.status === "active").length;
  const inTripVehicles = vehicles.filter(v => v.status === "in_trip").length;
  const completedTrips = trips.filter(t => t.status === "completed").length;
  const totalRevenue   = trips.filter(t => t.status === "completed").reduce((s, t) => s + parseFloat(t.freight_amount || 0), 0);
  const availDrivers   = drivers.filter(d => d.status === "available").length;

  // Fleet-level P&L aggregates
  const fleetRevenue   = pnlData.reduce((s, v) => s + v.total_revenue, 0);
  const fleetExpenses  = pnlData.reduce((s, v) => s + v.total_expenses, 0);
  const fleetProfit    = pnlData.reduce((s, v) => s + v.profit, 0);
  const fleetMargin    = fleetRevenue > 0 ? (fleetProfit / fleetRevenue) * 100 : 0;
  const worstVehicle   = pnlData.length > 0 ? pnlData[pnlData.length - 1] : null;

  const setupSteps = [
    { label: "Add your first vehicle", done: vehicles.length > 0, href: "/vehicles", cta: "Add Vehicle" },
    { label: "Add a driver",           done: drivers.length > 0,  href: "/drivers",  cta: "Add Driver" },
    { label: "Log your first trip",    done: trips.length > 0,    href: "/trips",    cta: "Log Trip" },
  ];

  return (
    <div>
      <Header title={`${getGreeting()}, ${userName} ${emoji}`} subtitle="Here's your fleet overview" />
      <div style={{ padding: "24px 28px" }}>

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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Total Vehicles", value: vehicles.length, sub: `${activeVehicles} Active · ${inTripVehicles} On Trip`, icon: Truck },
            { label: "Total Drivers",  value: drivers.length,  sub: `${availDrivers} Available`,        icon: Users },
            { label: "Total Trips",    value: trips.length,    sub: `${completedTrips} Completed`,      icon: Route },
            { label: "Revenue",        value: `₹${(totalRevenue/1000).toFixed(1)}K`, sub: "Completed trips", icon: TrendingUp },
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

        {/* ── P&L Per Truck Section ─────────────────────────────────── */}
        {pnlData.length > 0 && (
          <div className="card" style={{ marginBottom: 24 }}>
            {/* Section header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                  <BarChart2 size={17} color="#1E2D8E" /> P&amp;L per Truck
                </h2>
                <p style={{ margin: 0, fontSize: 12, color: "#888" }}>Revenue, expenses and profit margin per vehicle</p>
              </div>
              {/* Fleet summary pills */}
              <div style={{ display: "flex", gap: 10 }}>
                {[
                  { label: "Revenue",  value: fmt(fleetRevenue),  color: "#1565c0", bg: "#e3f2fd" },
                  { label: "Expenses", value: fmt(fleetExpenses), color: "#b71c1c", bg: "#fce4ec" },
                  { label: "Profit",   value: fmt(fleetProfit),   color: fleetProfit >= 0 ? "#2e7d32" : "#e53935", bg: fleetProfit >= 0 ? "#e8f5e9" : "#fce4ec" },
                ].map(p => (
                  <div key={p.label} style={{ textAlign: "center", padding: "8px 14px", borderRadius: 10, background: p.bg }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: p.color }}>{p.value}</div>
                    <div style={{ fontSize: 10, color: "#888", marginTop: 1 }}>{p.label}</div>
                  </div>
                ))}
                <div style={{ textAlign: "center", padding: "8px 14px", borderRadius: 10, background: fleetMargin >= 15 ? "#e8f5e9" : fleetMargin >= 0 ? "#fff3e0" : "#fce4ec" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: fleetMargin >= 15 ? "#2e7d32" : fleetMargin >= 0 ? "#e65100" : "#e53935" }}>{fleetMargin.toFixed(1)}%</div>
                  <div style={{ fontSize: 10, color: "#888", marginTop: 1 }}>Margin</div>
                </div>
              </div>
            </div>

            {/* Worst performer alert */}
            {worstVehicle && worstVehicle.profit < 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 9, background: "#fff3e0", border: "1px solid #ffcc80", marginBottom: 16 }}>
                <AlertTriangle size={16} color="#e65100" />
                <span style={{ fontSize: 13, color: "#bf360c" }}>
                  <strong>{worstVehicle.reg_number}</strong> is running at a loss of {fmt(Math.abs(worstVehicle.profit))} — review its trip costs.
                </span>
              </div>
            )}

            {/* Table */}
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
                              <div style={{ fontWeight: 700, color: "#1a1a2e", fontSize: 13.5 }}>{v.reg_number}</div>
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
                        <td style={{ padding: "12px 10px", textAlign: "right", fontWeight: 700, color: "#1565c0" }}>{fmt(v.total_revenue)}</td>
                        <td style={{ padding: "12px 10px", textAlign: "right", color: "#b71c1c" }}>
                          <div>{fmt(v.total_expenses)}</div>
                          {v.total_fuel_cost > 0 && <div style={{ fontSize: 10.5, color: "#aaa" }}>Fuel: {fmt(v.total_fuel_cost)}</div>}
                        </td>
                        <td style={{ padding: "12px 10px", textAlign: "right" }}>
                          <span style={{ fontWeight: 800, fontSize: 14, color: v.profit >= 0 ? "#2e7d32" : "#e53935", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 3 }}>
                            {v.profit >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                            {fmt(Math.abs(v.profit))}
                          </span>
                        </td>
                        <td style={{ padding: "12px 10px" }}>
                          <MarginBar pct={v.margin_percent} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

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
          ) : (
            <table>
              <thead><tr><th>Route</th><th>Driver</th><th>Date</th><th>Revenue</th><th>Status</th></tr></thead>
              <tbody>
                {trips.slice(0, 5).map((t: any) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>{t.origin} → {t.destination}</td>
                    <td>{t.driver_name}</td>
                    <td>{t.start_date}</td>
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
