"use client";
import { useEffect, useState } from "react";
import { teamService } from "@/lib/services/teamService";
import { TrendingUp, TrendingDown, IndianRupee, Route, Download } from "lucide-react";

type Summary = Awaited<ReturnType<typeof teamService.getFinancialSummary>>["data"];

export default function AccountantDashboard() {
  const [data, setData]     = useState<NonNullable<Summary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays]     = useState(30);

  useEffect(() => {
    setLoading(true);
    teamService.getFinancialSummary(days).then(r => {
      if (r.success && r.data) setData(r.data);
      setLoading(false);
    });
  }, [days]);

  const fmt = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

  const maxBar = data
    ? Math.max(...data.monthlyData.map(m => Math.max(m.revenue, m.expenses)), 1)
    : 1;

  return (
    <div style={{ padding: "28px 32px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e" }}>Financial Overview</div>
          <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>Read-only view of fleet financials</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)} style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 12.5, fontWeight: 600, cursor: "pointer", border: "none",
              background: days === d ? "#1a3a5c" : "#f0f0f8",
              color: days === d ? "white" : "#555",
            }}>
              {d}d
            </button>
          ))}
          <button
            onClick={async () => {
              if (!data) return;
              const XLSX = await import("xlsx");
              const wb   = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
                { Metric: "Total Revenue",   Value: data.totalRevenue  },
                { Metric: "Total Expenses",  Value: data.totalExpenses },
                { Metric: "Net Profit",      Value: data.netProfit     },
                { Metric: "Trips Completed", Value: data.tripCount     },
              ]), "Summary");
              XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
                data.monthlyData.map(m => ({ Month: m.month, "Revenue (₹)": m.revenue, "Expenses (₹)": m.expenses, "Profit (₹)": m.revenue - m.expenses }))
              ), "Monthly");
              XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
                data.expenseBreakdown.map(e => ({ Category: e.category, "Amount (₹)": e.amount, "Share %": `${e.pct}%` }))
              ), "Expense Breakdown");
              XLSX.writeFile(wb, `financial_overview_${new Date().toISOString().slice(0, 10)}.xlsx`);
            }}
            disabled={loading || !data}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 20, fontSize: 12.5, fontWeight: 600, cursor: "pointer", border: "none",
              background: "#1a3a5c", color: "white",
              opacity: loading || !data ? 0.5 : 1,
            }}
          >
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Total Revenue",   value: data?.totalRevenue,   icon: TrendingUp,   color: "#2e7d32", bg: "#e8f5e9" },
          { label: "Total Expenses",  value: data?.totalExpenses,  icon: TrendingDown, color: "#c62828", bg: "#ffebee" },
          { label: "Net Profit",      value: data?.netProfit,      icon: IndianRupee,  color: (data?.netProfit ?? 0) >= 0 ? "#2e7d32" : "#c62828", bg: (data?.netProfit ?? 0) >= 0 ? "#e8f5e9" : "#ffebee" },
          { label: "Trips Completed", value: data?.tripCount,      icon: Route,        color: "#1565c0", bg: "#e3f2fd", isCount: true },
        ].map(s => (
          <div key={s.label} style={{ background: "white", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
              <s.icon size={18} color={s.color} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>
              {loading ? "—" : s.isCount ? s.value : fmt(s.value ?? 0)}
            </div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{s.label}</div>
            {!s.isCount && !loading && (
              <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>Last {days} days</div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20 }}>
        {/* Monthly chart */}
        <div style={{ background: "white", borderRadius: 14, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e", marginBottom: 20 }}>Revenue vs Expenses (Monthly)</div>
          {loading ? (
            <div style={{ padding: "32px", textAlign: "center", color: "#aaa", fontSize: 14 }}>Loading...</div>
          ) : (
            <>
              {/* Legend */}
              <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#555" }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: "#2e7d32" }} /> Revenue
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#555" }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: "#c62828" }} /> Expenses
                </div>
              </div>
              {/* Bars */}
              <div style={{ display: "flex", gap: 12, alignItems: "flex-end", height: 160 }}>
                {data?.monthlyData.map(m => (
                  <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 130 }}>
                      <div style={{
                        width: 16, background: "#2e7d32", borderRadius: "4px 4px 0 0",
                        height: `${Math.round((m.revenue / maxBar) * 130)}px`,
                        transition: "height 0.5s ease",
                        minHeight: m.revenue > 0 ? 2 : 0,
                      }} title={fmt(m.revenue)} />
                      <div style={{
                        width: 16, background: "#c62828", borderRadius: "4px 4px 0 0",
                        height: `${Math.round((m.expenses / maxBar) * 130)}px`,
                        transition: "height 0.5s ease",
                        minHeight: m.expenses > 0 ? 2 : 0,
                      }} title={fmt(m.expenses)} />
                    </div>
                    <div style={{ fontSize: 10, color: "#aaa", textAlign: "center" }}>
                      {new Date(m.month + "-01").toLocaleDateString("en-IN", { month: "short" })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Expense breakdown */}
        <div style={{ background: "white", borderRadius: 14, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e", marginBottom: 16 }}>Expense Breakdown</div>
          {loading ? (
            <div style={{ padding: "32px", textAlign: "center", color: "#aaa", fontSize: 14 }}>Loading...</div>
          ) : !data?.expenseBreakdown.length ? (
            <div style={{ padding: "32px", textAlign: "center", color: "#aaa", fontSize: 14 }}>No expense data.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {data.expenseBreakdown.slice(0, 7).map((cat, idx) => {
                const colors = ["#1565c0", "#c62828", "#2e7d32", "#e65100", "#7b1fa2", "#00838f", "#555"];
                const color = colors[idx % colors.length];
                return (
                  <div key={cat.category}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12.5, color: "#333", fontWeight: 500 }}>{cat.category}</span>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: "#888" }}>{cat.pct}%</span>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: "#c62828" }}>{fmt(cat.amount)}</span>
                      </div>
                    </div>
                    <div style={{ height: 6, background: "#f0f0f8", borderRadius: 3 }}>
                      <div style={{ height: "100%", width: `${cat.pct}%`, background: color, borderRadius: 3, transition: "width 0.5s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
