"use client";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { tripService } from "@/lib/services/tripService";
import { vehicleService } from "@/lib/services/vehicleService";
import { driverService } from "@/lib/services/driverService";
import { fuelService } from "@/lib/services/fuelService";
import { tollService } from "@/lib/services/tollService";
import { miscExpenseService } from "@/lib/services/miscExpenseService";
import { tyreService, tyreScrapService } from "@/lib/services/tyreService";
import { maintenanceService } from "@/lib/services/maintenanceService";
import { fmtDate } from "@/lib/date";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useFirm } from "@/lib/FirmContext";

const TABS = [
  { key: "freight",         label: "Freight" },
  { key: "expenses",        label: "Expenses" },
  { key: "driver_payments", label: "Driver Payments" },
  { key: "pl",              label: "P&L Summary" },
] as const;
type Tab = typeof TABS[number]["key"];

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}
function lastMonths(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    d.setMonth(d.getMonth() - 1);
  }
  return out;
}

export default function AccountsPage() {
  const { activeFirmId } = useFirm();
  const [tab, setTab] = useState<Tab>("freight");
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [fuel, setFuel] = useState<any[]>([]);
  const [tolls, setTolls] = useState<any[]>([]);
  const [misc, setMisc] = useState<any[]>([]);
  const [tyres, setTyres] = useState<any[]>([]);
  const [scraps, setScraps] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [expenseView, setExpenseView] = useState<"vehicle" | "month">("vehicle");
  const isMobile = useIsMobile();

  const load = async () => {
    if (!activeFirmId) {
      setTrips([]); setVehicles([]); setDrivers([]); setFuel([]); setTolls([]); setMisc([]);
      setTyres([]); setScraps([]); setPayments([]); setMaintenance([]); setLoading(false);
      return;
    }
    const [tr, v, d, f, tl, m, ty, sc, p, mt] = await Promise.all([
      tripService.getAll(500), vehicleService.getAll(), driverService.getAll(),
      fuelService.getAll(), tollService.getAll(), miscExpenseService.getAll(),
      tyreService.getAll(), tyreScrapService.getAll(), driverService.getPayments(),
      maintenanceService.getAll(),
    ]);
    setTrips(tr.data || []); setVehicles(v.data || []); setDrivers(d.data || []);
    setFuel(f.data || []); setTolls(tl.data || []); setMisc(m.data || []);
    setTyres(ty.data || []); setScraps(sc.data || []); setPayments(p.data || []);
    setMaintenance(mt.data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [activeFirmId]);

  const vehicleName = (id: string) => vehicles.find(v => v.id === id)?.registration_number || "—";

  const toggleFreightStatus = async (trip: any) => {
    const next = trip.payment_status === "received" ? "pending" : "received";
    await tripService.update(trip.id, { payment_status: next });
    load();
  };

  // ── Freight ─────────────────────────────────────────────────────────────
  const receivedTotal = trips.filter(t => t.payment_status === "received").reduce((s, t) => s + parseFloat(t.freight_amount || 0), 0);
  const pendingTotal  = trips.filter(t => t.payment_status !== "received").reduce((s, t) => s + parseFloat(t.freight_amount || 0), 0);

  // ── Expenses rollup ─────────────────────────────────────────────────────
  type Bucket = { fuel: number; toll: number; misc: number; tyre: number };
  const emptyBucket = (): Bucket => ({ fuel: 0, toll: 0, misc: 0, tyre: 0 });
  const bump = (map: Record<string, Bucket>, key: string, field: keyof Bucket, amount: number) => {
    if (!map[key]) map[key] = emptyBucket();
    map[key][field] += amount;
  };
  const byVehicle: Record<string, Bucket> = {};
  const byMonth: Record<string, Bucket> = {};
  fuel.forEach(x => { bump(byVehicle, x.vehicle_id, "fuel", parseFloat(x.amount || 0)); bump(byMonth, x.date?.slice(0, 7), "fuel", parseFloat(x.amount || 0)); });
  tolls.forEach(x => { bump(byVehicle, x.vehicle_id, "toll", parseFloat(x.amount || 0)); bump(byMonth, x.date?.slice(0, 7), "toll", parseFloat(x.amount || 0)); });
  misc.forEach(x => { if (x.vehicle_id) bump(byVehicle, x.vehicle_id, "misc", parseFloat(x.amount || 0)); bump(byMonth, x.date?.slice(0, 7), "misc", parseFloat(x.amount || 0)); });
  tyres.forEach(x => { bump(byVehicle, x.vehicle_id, "tyre", parseFloat(x.amount || 0)); bump(byMonth, x.date?.slice(0, 7), "tyre", parseFloat(x.amount || 0)); });
  const bucketTotal = (b: Bucket) => b.fuel + b.toll + b.misc + b.tyre;
  const vehicleRows = Object.entries(byVehicle).sort((a, b) => bucketTotal(b[1]) - bucketTotal(a[1]));
  const monthRows = Object.entries(byMonth).sort((a, b) => b[0].localeCompare(a[0]));

  // ── Driver payments ─────────────────────────────────────────────────────
  const driverRows = drivers.map(d => {
    const dp = payments.filter(p => p.driver_id === d.id);
    const advances = dp.filter(p => p.type === "advance").reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    const settled  = dp.filter(p => p.type === "settlement").reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    return { ...d, advances, settled, outstanding: advances - settled };
  }).filter(d => d.advances > 0 || d.settled > 0);

  // ── P&L: current month + last 3 ────────────────────────────────────────
  // Scheduled maintenance: monthly-frequency items recur every month; a
  // one-time item is booked only in the month it was actually done.
  const monthlyMaintenanceTotal = maintenance.filter(m => m.frequency === "monthly").reduce((s, m) => s + parseFloat(m.amount || 0), 0);
  const oneTimeMaintenanceForMonth = (key: string) =>
    maintenance.filter(m => m.frequency === "one_time" && m.last_done_date?.slice(0, 7) === key)
      .reduce((s, m) => s + parseFloat(m.amount || 0), 0);

  const months = lastMonths(4);
  const plRows = months.map(key => {
    const income = trips.filter(t => t.payment_status === "received" && t.start_date?.slice(0, 7) === key)
      .reduce((s, t) => s + parseFloat(t.freight_amount || 0), 0)
      + scraps.filter(s => s.date?.slice(0, 7) === key).reduce((s, x) => s + parseFloat(x.scrap_amount || 0), 0);
    const maintenanceExpense = monthlyMaintenanceTotal + oneTimeMaintenanceForMonth(key);
    const expense = bucketTotal(byMonth[key] || emptyBucket()) + maintenanceExpense;
    return { key, income, expense, maintenanceExpense, net: income - expense };
  });
  const maxAbsNet = Math.max(1, ...plRows.map(r => Math.abs(r.net)));

  if (loading) return (
    <div>
      <Header title="Accounts" subtitle="Freight, expenses, driver payments & P&L" />
      <div style={{ padding: "40px 28px", textAlign: "center", color: "#aaa" }}>Loading...</div>
    </div>
  );

  return (
    <div>
      <Header title="Accounts" subtitle="Freight, expenses, driver payments & P&L" />
      <div style={{ padding: isMobile ? "14px" : "24px 28px" }}>

        <div style={{ display: "flex", gap: 4, marginBottom: 22, background: "#f0f1fa", borderRadius: 10, padding: 4, width: "fit-content", flexWrap: "wrap" }}>
          {TABS.map(tb => (
            <button key={tb.key} onClick={() => setTab(tb.key)}
              style={{ padding: "7px 16px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                background: tab === tb.key ? "white" : "transparent",
                color: tab === tb.key ? "#1E2D8E" : "#888",
                boxShadow: tab === tb.key ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}>
              {tb.label}
            </button>
          ))}
        </div>

        {/* ── FREIGHT ─────────────────────────────────────────────────── */}
        {tab === "freight" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Received",     value: inr(receivedTotal), color: "#2e7d32" },
                { label: "Pending",      value: inr(pendingTotal),  color: "#e65100" },
                { label: "Total Freight", value: inr(receivedTotal + pendingTotal), color: "#1E2D8E" },
              ].map(s => (
                <div key={s.label} className="stat-card" style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div className="card">
              {trips.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#aaa", fontSize: 13 }}>No trips yet.</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr><th>Trip</th><th>Route</th><th>Date</th><th>Amount</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {trips.map((t: any) => (
                        <tr key={t.id}>
                          <td style={{ fontWeight: 600, color: "#1E2D8E" }}>{vehicleName(t.vehicle_id)}{t.driver_name ? ` · ${t.driver_name}` : ""}</td>
                          <td style={{ fontSize: 12.5, color: "#666" }}>{t.origin} → {t.destination}</td>
                          <td style={{ fontSize: 13 }}>{fmtDate(t.start_date)}</td>
                          <td style={{ fontWeight: 700, color: "#1E2D8E" }}>{inr(parseFloat(t.freight_amount || 0))}</td>
                          <td>
                            <button onClick={() => toggleFreightStatus(t)}
                              style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6, border: "none", cursor: "pointer",
                                background: t.payment_status === "received" ? "#e8f5e9" : "#fff3e0",
                                color: t.payment_status === "received" ? "#2e7d32" : "#e65100" }}>
                              {t.payment_status === "received" ? "Received" : "Pending"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── EXPENSES ────────────────────────────────────────────────── */}
        {tab === "expenses" && (
          <div>
            <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "#f0f1fa", borderRadius: 10, padding: 4, width: "fit-content" }}>
              {(["vehicle", "month"] as const).map(v => (
                <button key={v} onClick={() => setExpenseView(v)}
                  style={{ padding: "6px 14px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600,
                    background: expenseView === v ? "white" : "transparent",
                    color: expenseView === v ? "#1E2D8E" : "#888" }}>
                  {v === "vehicle" ? "By Vehicle" : "By Month"}
                </button>
              ))}
            </div>

            <div className="card">
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th>{expenseView === "vehicle" ? "Vehicle" : "Month"}</th>
                      <th>Fuel</th><th>Toll</th><th>Misc (incl. maintenance)</th><th>Tyre</th><th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(expenseView === "vehicle" ? vehicleRows : monthRows).map(([key, b]) => (
                      <tr key={key}>
                        <td style={{ fontWeight: 600, color: "#1E2D8E" }}>{expenseView === "vehicle" ? vehicleName(key) : monthLabel(key)}</td>
                        <td>{inr(b.fuel)}</td><td>{inr(b.toll)}</td><td>{inr(b.misc)}</td><td>{inr(b.tyre)}</td>
                        <td style={{ fontWeight: 700 }}>{inr(bucketTotal(b))}</td>
                      </tr>
                    ))}
                    {(expenseView === "vehicle" ? vehicleRows : monthRows).length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: "center", color: "#aaa", padding: "24px 0" }}>No expenses logged yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── DRIVER PAYMENTS ─────────────────────────────────────────── */}
        {tab === "driver_payments" && (
          <div className="card">
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr><th>Driver</th><th>Advances Given</th><th>Settled</th><th>Outstanding</th></tr>
                </thead>
                <tbody>
                  {driverRows.map(d => (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 600, color: "#1E2D8E" }}>{d.name}</td>
                      <td>{inr(d.advances)}</td>
                      <td>{inr(d.settled)}</td>
                      <td style={{ fontWeight: 700, color: d.outstanding > 0 ? "#e65100" : "#2e7d32" }}>{inr(d.outstanding)}</td>
                    </tr>
                  ))}
                  {driverRows.length === 0 && (
                    <tr><td colSpan={4} style={{ textAlign: "center", color: "#aaa", padding: "24px 0" }}>No driver advances or settlements yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── P&L SUMMARY ─────────────────────────────────────────────── */}
        {tab === "pl" && (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)", gap: 12 }}>
            {plRows.map((r, i) => (
              <div key={r.key} className="card">
                <div style={{ fontSize: 12, color: "#888", fontWeight: 700, marginBottom: 8 }}>{i === 0 ? "This Month" : monthLabel(r.key)}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: r.net >= 0 ? "#2e7d32" : "#c62828" }}>{inr(r.net)}</div>
                <div style={{ fontSize: 11, color: "#aaa", marginBottom: 10 }}>{r.net >= 0 ? "net profit" : "net loss"}</div>
                <div style={{ height: 6, borderRadius: 3, background: "#f0f0f5", overflow: "hidden", marginBottom: 10 }}>
                  <div style={{ height: "100%", borderRadius: 3, width: `${Math.min(100, (Math.abs(r.net) / maxAbsNet) * 100)}%`, background: r.net >= 0 ? "#4caf50" : "#f44336" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: "#2e7d32" }}>+{inr(r.income)}</span>
                  <span style={{ color: "#c62828" }}>−{inr(r.expense)}</span>
                </div>
                {r.maintenanceExpense > 0 && (
                  <div style={{ fontSize: 11, color: "#aaa" }}>incl. {inr(r.maintenanceExpense)} scheduled maintenance</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
