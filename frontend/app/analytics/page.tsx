"use client";
import { useEffect, useState, useCallback } from "react";
import Header from "@/components/Header";
import { useLanguage } from "@/lib/LanguageContext";
import { analyticsService } from "@/lib/services/analyticsService";
import { TrendingUp, TrendingDown, Truck, Route, BarChart2, PieChart } from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  "₹" + Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const fmtShort = (n: number): string => {
  if (n >= 1_00_00_000) return "₹" + (n / 1_00_00_000).toFixed(1) + "Cr";
  if (n >= 1_00_000)    return "₹" + (n / 1_00_000).toFixed(1) + "L";
  if (n >= 1_000)       return "₹" + (n / 1_000).toFixed(1) + "K";
  return "₹" + n.toFixed(0);
};

// Donut segment colors for expense categories
const CAT_COLORS = [
  "#1E2D8E", "#2196F3", "#4CAF50", "#FF9800",
  "#E91E63", "#9C27B0", "#00BCD4", "#FF5722",
  "#607D8B", "#795548",
];

// ── SVG Bar Chart ─────────────────────────────────────────────────────────────

function BarChart({ data }: { data: any[] }) {
  if (!data.length) return null;

  const W = 560, H = 200, PAD_L = 60, PAD_B = 32, PAD_T = 16, PAD_R = 16;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_B - PAD_T;

  const maxVal = Math.max(...data.map(d => Math.max(d.revenue, d.expenses)), 1);
  const barGroupW = chartW / data.length;
  const barW = Math.min(barGroupW * 0.32, 26);

  // Y axis ticks
  const ticks = 4;
  const tickStep = maxVal / ticks;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
      {/* Grid lines */}
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const y = PAD_T + chartH - (i / ticks) * chartH;
        return (
          <g key={i}>
            <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#f0f0f8" strokeWidth={1} />
            <text x={PAD_L - 6} y={y + 4} textAnchor="end" fontSize={9} fill="#aaa">
              {fmtShort(tickStep * i)}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const cx = PAD_L + i * barGroupW + barGroupW / 2;
        const revH = (d.revenue / maxVal) * chartH;
        const expH = (d.expenses / maxVal) * chartH;
        const profitPositive = d.profit >= 0;

        return (
          <g key={d.month_key}>
            {/* Revenue bar */}
            <rect
              x={cx - barW - 2} y={PAD_T + chartH - revH}
              width={barW} height={revH}
              fill="#1E2D8E" rx={3}
              opacity={0.85}
            />
            {/* Expense bar */}
            <rect
              x={cx + 2} y={PAD_T + chartH - expH}
              width={barW} height={expH}
              fill={profitPositive ? "#ef5350" : "#b71c1c"}
              rx={3} opacity={0.75}
            />
            {/* Month label */}
            <text x={cx} y={H - 6} textAnchor="middle" fontSize={9.5} fill="#888">
              {d.month.split(" ")[0]}
            </text>
            {/* Profit/loss dot */}
            <circle
              cx={cx} cy={PAD_T + chartH - Math.max(revH, expH) - 10}
              r={4}
              fill={profitPositive ? "#4CAF50" : "#ef5350"}
            />
          </g>
        );
      })}

      {/* Legend */}
      <rect x={PAD_L} y={2} width={10} height={10} fill="#1E2D8E" rx={2} />
      <text x={PAD_L + 13} y={11} fontSize={9} fill="#666">Revenue</text>
      <rect x={PAD_L + 68} y={2} width={10} height={10} fill="#ef5350" rx={2} />
      <text x={PAD_L + 81} y={11} fontSize={9} fill="#666">Expenses</text>
      <circle cx={PAD_L + 150} cy={7} r={4} fill="#4CAF50" />
      <text x={PAD_L + 157} y={11} fontSize={9} fill="#666">Profitable</text>
    </svg>
  );
}

// ── SVG Donut Chart ───────────────────────────────────────────────────────────

function DonutChart({ categories }: { categories: any[] }) {
  if (!categories.length) return <div style={{ textAlign: "center", color: "#aaa", padding: 32 }}>No expense data</div>;

  const R = 70, CX = 90, CY = 90, stroke = 36;
  const circumference = 2 * Math.PI * R;

  let cumPct = 0;
  const segments = categories.slice(0, 8).map((c, i) => {
    const pct = c.pct / 100;
    const dashArray = `${pct * circumference} ${circumference}`;
    const rotation = cumPct * 360 - 90;
    cumPct += pct;
    return { ...c, dashArray, rotation, color: CAT_COLORS[i % CAT_COLORS.length] };
  });

  const total = categories.reduce((s, c) => s + c.amount, 0);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
      <svg viewBox="0 0 180 180" style={{ width: 160, height: 160, flexShrink: 0 }}>
        {segments.map((s, i) => (
          <circle
            key={i}
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke}
            strokeDasharray={s.dashArray}
            strokeDashoffset={0}
            transform={`rotate(${s.rotation} ${CX} ${CY})`}
            style={{ transition: "stroke-dasharray 0.4s ease" }}
          />
        ))}
        {/* Center label */}
        <text x={CX} y={CY - 8} textAnchor="middle" fontSize={10} fill="#888">Total</text>
        <text x={CX} y={CY + 8} textAnchor="middle" fontSize={12} fontWeight="700" fill="#1a1a2e">
          {fmtShort(total)}
        </text>
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 140 }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11.5, color: "#555" }}>{s.label}</span>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: "#333" }}>{s.pct}%</span>
              </div>
              <div style={{ fontSize: 10.5, color: "#aaa" }}>{fmt(s.amount)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  { label: "Last 30 days", value: 30 },
  { label: "Last 90 days", value: 90 },
  { label: "Last 6 months", value: 180 },
];

export default function AnalyticsPage() {
  const { t } = useLanguage();
  const [period, setPeriod]       = useState(30);
  const [isMobile, setIsMobile]   = useState(false);
  const [loading, setLoading]     = useState(true);

  const [overview, setOverview]   = useState<any>(null);
  const [monthly, setMonthly]     = useState<any[]>([]);
  const [vehicles, setVehicles]   = useState<any[]>([]);
  const [expenses, setExpenses]   = useState<any[]>([]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const load = useCallback((days: number) => {
    setLoading(true);
    Promise.all([
      analyticsService.getOverview(days),
      analyticsService.getMonthly(),
      analyticsService.getVehicles(days),
      analyticsService.getExpenses(days),
    ])
      .then(([ov, mo, ve, ex]) => {
        setOverview(ov.data);
        setMonthly(mo.data?.months || []);
        setVehicles(ve.data?.vehicles || []);
        setExpenses(ex.data?.categories || []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(period); }, [period, load]);

  const pad = isMobile ? "14px" : "24px 28px";

  return (
    <div>
      <Header title={t("analytics.title")} subtitle={t("analytics.subtitle")} />

      <div style={{ padding: pad }}>

        {/* Period selector */}
        <div style={{ display: "flex", gap: 8, marginBottom: isMobile ? 14 : 20, flexWrap: "wrap" }}>
          {PERIOD_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setPeriod(opt.value)}
              style={{
                padding: "6px 16px", borderRadius: 20, fontSize: 12.5, fontWeight: 600,
                border: "none", cursor: "pointer",
                background: period === opt.value ? "#1E2D8E" : "#f0f1fa",
                color:      period === opt.value ? "#fff" : "#666",
              }}>
              {opt.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", color: "#aaa", padding: "60px 0", fontSize: 14 }}>{t("common.loading")}</div>
        ) : (
          <>
            {/* ── KPI Cards ──────────────────────────────────────────────── */}
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
              gap: isMobile ? 10 : 14,
              marginBottom: isMobile ? 16 : 24,
            }}>
              {[
                {
                  label: t("analytics.revenue"),
                  value: fmtShort(overview?.total_revenue || 0),
                  sub: `${overview?.total_trips || 0} trips`,
                  color: "#1E2D8E", bg: "#eef0fb",
                  icon: <TrendingUp size={18} color="#1E2D8E" />,
                },
                {
                  label: t("analytics.expenses"),
                  value: fmtShort(overview?.total_expenses || 0),
                  sub: `₹${overview?.avg_cost_per_km || 0}/km avg`,
                  color: "#c62828", bg: "#fce4ec",
                  icon: <TrendingDown size={18} color="#c62828" />,
                },
                {
                  label: t("analytics.net_profit"),
                  value: fmtShort(Math.abs(overview?.net_profit || 0)),
                  sub: `${overview?.margin_pct || 0}% margin`,
                  color: (overview?.net_profit || 0) >= 0 ? "#2e7d32" : "#c62828",
                  bg:    (overview?.net_profit || 0) >= 0 ? "#e8f5e9" : "#fce4ec",
                  icon:  (overview?.net_profit || 0) >= 0
                    ? <TrendingUp size={18} color="#2e7d32" />
                    : <TrendingDown size={18} color="#c62828" />,
                  prefix: (overview?.net_profit || 0) < 0 ? "−" : "",
                },
                {
                  label: t("analytics.trips_completed"),
                  value: `${overview?.utilization_pct || 0}%`,
                  sub: `${overview?.active_vehicles || 0} active trucks`,
                  color: "#e65100", bg: "#fff3e0",
                  icon: <Truck size={18} color="#e65100" />,
                },
              ].map(k => (
                <div key={k.label} className="card" style={{ padding: isMobile ? "14px" : "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ fontSize: 11.5, color: "#888", fontWeight: 600 }}>{k.label}</div>
                    <div style={{ background: k.bg, borderRadius: 8, padding: "5px 6px", display: "flex" }}>{k.icon}</div>
                  </div>
                  <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: k.color }}>
                    {k.prefix}{k.value}
                  </div>
                  <div style={{ fontSize: 11.5, color: "#aaa", marginTop: 4 }}>{k.sub}</div>
                </div>
              ))}
            </div>

            {/* ── Monthly P&L + Expense Breakdown ────────────────────────── */}
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1.6fr 1fr",
              gap: isMobile ? 12 : 16,
              marginBottom: isMobile ? 12 : 16,
            }}>

              {/* Monthly P&L chart */}
              <div className="card">
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <BarChart2 size={16} color="#1E2D8E" />
                  <span style={{ fontWeight: 700, fontSize: 14, color: "#1a1a2e" }}>Monthly P&L</span>
                  <span style={{ fontSize: 11.5, color: "#aaa", marginLeft: 4 }}>Last 6 months</span>
                </div>
                {monthly.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#aaa", padding: "32px 0", fontSize: 13 }}>No completed trips yet</div>
                ) : (
                  <>
                    <BarChart data={monthly} />
                    {/* Monthly table below chart */}
                    <div style={{ marginTop: 14, borderTop: "1px solid #f0f0f8", paddingTop: 10 }}>
                      <div style={{
                        display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr",
                        gap: 4, fontSize: 10.5, fontWeight: 700, color: "#aaa",
                        padding: "0 4px", marginBottom: 4,
                      }}>
                        <span>Month</span><span style={{ textAlign: "right" }}>Revenue</span>
                        <span style={{ textAlign: "right" }}>Expenses</span>
                        <span style={{ textAlign: "right" }}>Profit</span>
                        <span style={{ textAlign: "right" }}>Trips</span>
                      </div>
                      {monthly.map(m => (
                        <div key={m.month_key} style={{
                          display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr",
                          gap: 4, fontSize: 11.5, padding: "5px 4px",
                          borderRadius: 6,
                          background: m.profit >= 0 ? "transparent" : "#fff5f5",
                        }}>
                          <span style={{ fontWeight: 600, color: "#444" }}>{m.month}</span>
                          <span style={{ textAlign: "right", color: "#1E2D8E", fontWeight: 600 }}>{fmtShort(m.revenue)}</span>
                          <span style={{ textAlign: "right", color: "#ef5350" }}>{fmtShort(m.expenses)}</span>
                          <span style={{ textAlign: "right", fontWeight: 700, color: m.profit >= 0 ? "#2e7d32" : "#c62828" }}>
                            {m.profit < 0 ? "−" : ""}{fmtShort(Math.abs(m.profit))}
                          </span>
                          <span style={{ textAlign: "right", color: "#888" }}>{m.trips}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Expense breakdown donut */}
              <div className="card">
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <PieChart size={16} color="#1E2D8E" />
                  <span style={{ fontWeight: 700, fontSize: 14, color: "#1a1a2e" }}>Expense Breakdown</span>
                </div>
                <DonutChart categories={expenses} />
              </div>
            </div>

            {/* ── Vehicle Profitability Table ─────────────────────────────── */}
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Route size={16} color="#1E2D8E" />
                <span style={{ fontWeight: 700, fontSize: 14, color: "#1a1a2e" }}>Vehicle Profitability</span>
                <span style={{ fontSize: 11.5, color: "#aaa", marginLeft: 4 }}>Ranked by net profit</span>
              </div>

              {vehicles.length === 0 ? (
                <div style={{ textAlign: "center", color: "#aaa", padding: "32px 0", fontSize: 13 }}>No vehicle data for this period</div>
              ) : isMobile ? (
                // Mobile: stacked cards
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {vehicles.map((v: any, idx: number) => (
                    <div key={v.vehicle_id} style={{
                      border: "1.5px solid #f0f0f8", borderRadius: 10, padding: "12px 14px",
                      background: idx === 0 && v.trips > 0 ? "#f0faf2" : idx === vehicles.filter((x: any) => x.trips > 0).length - 1 && v.trips > 0 ? "#fff8f8" : "white",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: 13.5, color: "#1a1a2e" }}>{v.registration_number}</span>
                          <span style={{ fontSize: 11, color: "#aaa", marginLeft: 8 }}>{v.make} {v.model}</span>
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: v.profit >= 0 ? "#2e7d32" : "#c62828" }}>
                          {v.profit < 0 ? "−" : ""}{fmtShort(Math.abs(v.profit))}
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
                        {[
                          { label: "Revenue", value: fmtShort(v.revenue), color: "#1E2D8E" },
                          { label: "Expenses", value: fmtShort(v.expenses), color: "#ef5350" },
                          { label: "Trips", value: v.trips, color: "#555" },
                          { label: "₹/km", value: v.cost_per_km > 0 ? `₹${v.cost_per_km}` : "—", color: v.cost_per_km > 45 ? "#c62828" : v.cost_per_km > 30 ? "#e65100" : "#2e7d32" },
                        ].map(s => (
                          <div key={s.label} style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.value}</div>
                            <div style={{ fontSize: 10, color: "#aaa" }}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                      {/* Profit bar */}
                      {v.revenue > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <div style={{ height: 4, borderRadius: 2, background: "#f0f0f8", overflow: "hidden" }}>
                            <div style={{
                              height: "100%", borderRadius: 2,
                              width: `${Math.min(Math.max((v.profit / v.revenue) * 100, 0), 100)}%`,
                              background: v.profit >= 0 ? "#4CAF50" : "#ef5350",
                            }} />
                          </div>
                          <div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>{v.margin_pct}% margin</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                // Desktop: table
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #f0f0f8" }}>
                      {["#", "Vehicle", "Trips", "Revenue", "Expenses", "Net Profit", "Margin", "₹/km", "Performance"].map(h => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: h === "#" || h === "Trips" ? "center" : h === "Vehicle" ? "left" : "right", fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.map((v: any, idx: number) => {
                      const rankColor = idx === 0 && v.trips > 0 ? "#2e7d32" : idx === vehicles.filter((x: any) => x.trips > 0).length - 1 && v.trips > 0 ? "#c62828" : "#888";
                      const cpkColor  = v.cost_per_km > 45 ? "#c62828" : v.cost_per_km > 30 ? "#e65100" : v.cost_per_km > 0 ? "#2e7d32" : "#aaa";
                      return (
                        <tr key={v.vehicle_id} style={{
                          borderBottom: "1px solid #f8f8fc",
                          background: idx % 2 === 0 ? "white" : "#fafafa",
                        }}>
                          <td style={{ padding: "10px", textAlign: "center" }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: rankColor }}>
                              {v.trips > 0 ? idx + 1 : "—"}
                            </span>
                          </td>
                          <td style={{ padding: "10px" }}>
                            <div style={{ fontWeight: 700, color: "#1a1a2e" }}>{v.registration_number}</div>
                            <div style={{ fontSize: 11, color: "#aaa" }}>{v.make} {v.model}</div>
                          </td>
                          <td style={{ padding: "10px", textAlign: "center", fontWeight: 600, color: "#555" }}>{v.trips}</td>
                          <td style={{ padding: "10px", textAlign: "right", fontWeight: 600, color: "#1E2D8E" }}>{fmtShort(v.revenue)}</td>
                          <td style={{ padding: "10px", textAlign: "right", color: "#ef5350" }}>{fmtShort(v.expenses)}</td>
                          <td style={{ padding: "10px", textAlign: "right", fontWeight: 800, fontSize: 14, color: v.profit >= 0 ? "#2e7d32" : "#c62828" }}>
                            {v.profit < 0 ? "−" : ""}{fmtShort(Math.abs(v.profit))}
                          </td>
                          <td style={{ padding: "10px", textAlign: "right", color: v.margin_pct >= 20 ? "#2e7d32" : v.margin_pct >= 10 ? "#e65100" : "#c62828" }}>
                            {v.trips > 0 ? `${v.margin_pct}%` : "—"}
                          </td>
                          <td style={{ padding: "10px", textAlign: "right", fontWeight: 600, color: cpkColor }}>
                            {v.cost_per_km > 0 ? `₹${v.cost_per_km}` : "—"}
                          </td>
                          <td style={{ padding: "10px 14px 10px 10px", minWidth: 90 }}>
                            {v.revenue > 0 ? (
                              <div>
                                <div style={{ height: 6, borderRadius: 3, background: "#f0f0f8", overflow: "hidden" }}>
                                  <div style={{
                                    height: "100%", borderRadius: 3,
                                    width: `${Math.min(Math.max((v.profit / v.revenue) * 100, 0), 100)}%`,
                                    background: v.profit >= 0 ? "#4CAF50" : "#ef5350",
                                  }} />
                                </div>
                              </div>
                            ) : (
                              <span style={{ fontSize: 11, color: "#ccc" }}>No trips</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

          </>
        )}
      </div>
    </div>
  );
}
