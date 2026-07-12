"use client";
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { vehicleService } from "@/lib/services/vehicleService";
import { tripService } from "@/lib/services/tripService";
import { driverService } from "@/lib/services/driverService";
import { fuelService } from "@/lib/services/fuelService";
import { tollService } from "@/lib/services/tollService";
import { tyreService } from "@/lib/services/tyreService";
import { miscExpenseService } from "@/lib/services/miscExpenseService";
import { Download, FileSpreadsheet, FileText, CheckSquare, Square, Printer } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import * as XLSX from "xlsx";
import { buildWorkbook } from "./exportHelper";
import { useIsMobile } from "@/hooks/useIsMobile";
import { todayISO } from "@/lib/date";
import { useFirm } from "@/lib/FirmContext";

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

const SEGMENTS = [
  { key: "all",     label: "All" },
  { key: "vehicle", label: "By Vehicle" },
  { key: "driver",  label: "By Driver" },
  { key: "route",   label: "By Route" },
] as const;
type Segment = typeof SEGMENTS[number]["key"];

const REPORT_TYPES = [
  { key: "trip",    label: "Trip Report" },
  { key: "expense", label: "Expense Report" },
  { key: "pl",      label: "P&L Report" },
  { key: "tyre",    label: "Tyre Report" },
] as const;
type ReportType = typeof REPORT_TYPES[number]["key"];

const REPORT_COLUMNS: Record<ReportType, { key: string; label: string }[]> = {
  trip:    [{ key: "group", label: "Segment" }, { key: "count", label: "Trips" },   { key: "income",  label: "Freight (₹)" }],
  expense: [{ key: "group", label: "Segment" }, { key: "count", label: "Entries" }, { key: "expense", label: "Expense (₹)" }],
  pl:      [{ key: "group", label: "Segment" }, { key: "income", label: "Income (₹)" }, { key: "expense", label: "Expense (₹)" }, { key: "net", label: "Net (₹)" }],
  tyre:    [{ key: "group", label: "Segment" }, { key: "count", label: "Tyres" },   { key: "expense", label: "Amount (₹)" }],
};

function monthStartISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

// A row can be a trip (has start_date/driver_id/origin/destination) or an
// expense-like log (has date/vehicle_id/trip_id, no direct driver/route —
// those come from the linked trip, when there is one).
function segmentKey(kind: "trip" | "expense", segment: Segment, row: any, tripsById: Record<string, any>): string {
  if (segment === "all") return "all";
  if (segment === "vehicle") return row.vehicle_id || "unassigned";
  const linkedTrip = kind === "trip" ? row : (row.trip_id ? tripsById[row.trip_id] : null);
  if (segment === "driver") return linkedTrip?.driver_id || "unassigned";
  if (segment === "route") return linkedTrip ? `${linkedTrip.origin} → ${linkedTrip.destination}` : "unassigned";
  return "all";
}

const EXPORT_TYPES = [
  { key: "vehicles",    label: "Vehicles",          desc: "All vehicle details + compliance dates" },
  { key: "drivers",     label: "Drivers",           desc: "Driver details, DL info, status" },
  { key: "trips",       label: "Trips",             desc: "All trip records with freight amounts" },
  { key: "fuel",        label: "Fuel Logs",         desc: "Fuel fill-ups with litres and amount" },
  { key: "tolls",       label: "Toll Logs",         desc: "All toll entries with payment mode" },
  { key: "tyres",       label: "Tyre Records",      desc: "Tyre purchases, recaps and repairs" },
  { key: "misc",        label: "Misc Expenses",     desc: "Fines, parking, halting and other costs" },
  { key: "profit_loss", label: "Profit & Loss",     desc: "Per-trip P&L with expense breakdown" },
];

export default function ReportsPage() {
  const { t } = useLanguage();
  const { activeFirmId } = useFirm();
  const [selected, setSelected] = useState<string[]>(EXPORT_TYPES.map(e => e.key));
  const [format, setFormat]     = useState<"xlsx" | "csv">("xlsx");
  const [downloading, setDownloading] = useState(false);
  const isMobile = useIsMobile();
  const [counts, setCounts]     = useState<Record<string, number>>({});
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [raw, setRaw] = useState<{ vehicles: any[]; trips: any[]; drivers: any[]; fuel: any[]; tolls: any[]; tyres: any[]; misc: any[] }>({
    vehicles: [], trips: [], drivers: [], fuel: [], tolls: [], tyres: [], misc: [],
  });

  useEffect(() => {
    if (!activeFirmId) {
      setCounts({}); setRaw({ vehicles: [], trips: [], drivers: [], fuel: [], tolls: [], tyres: [], misc: [] });
      setLoadingCounts(false);
      return;
    }
    Promise.all([
      vehicleService.getAll(), tripService.getAll(), driverService.getAll(),
      fuelService.getAll(), tollService.getAll(), tyreService.getAll(), miscExpenseService.getAll(),
    ]).then(([v, tr, d, f, tl, ty, m]) => {
      const vehicles = v.data || [], trips = tr.data || [], drivers = d.data || [];
      const fuel = f.data || [], tolls = tl.data || [], tyres = ty.data || [], misc = m.data || [];
      const completed = trips.filter((t: any) => t.status === "completed").length;
      setCounts({
        vehicles: vehicles.length, trips: trips.length, drivers: drivers.length,
        fuel: fuel.length, tolls: tolls.length, tyres: tyres.length,
        misc: misc.length, profit_loss: completed,
      });
      setRaw({ vehicles, trips, drivers, fuel, tolls, tyres, misc });
      setLoadingCounts(false);
    }).catch(() => setLoadingCounts(false));
  }, [activeFirmId]);

  // ── Custom Report filters ────────────────────────────────────────────────
  const [dateFrom, setDateFrom] = useState(monthStartISO());
  const [dateTo, setDateTo]     = useState(todayISO());
  const [segment, setSegment]   = useState<Segment>("all");
  const [reportType, setReportType] = useState<ReportType>("trip");

  const vehicleName = (id: string) => raw.vehicles.find(v => v.id === id)?.registration_number || "Unassigned";
  const driverName  = (id: string) => raw.drivers.find(d => d.id === id)?.name || "Unassigned";
  const groupLabel = (key: string) => {
    if (key === "unassigned" || key === "all") return key === "all" ? "All" : "Unassigned";
    if (segment === "vehicle") return vehicleName(key);
    if (segment === "driver")  return driverName(key);
    return key; // route: the key already is the "origin → destination" label
  };

  const tripsById = Object.fromEntries(raw.trips.map(t => [t.id, t]));
  const inRange = (d: string | null | undefined) => !!d && d >= dateFrom && d <= dateTo;

  const previewRows = (() => {
    const groups: Record<string, { income: number; expense: number; count: number }> = {};
    const add = (key: string, income: number, expense: number) => {
      if (!groups[key]) groups[key] = { income: 0, expense: 0, count: 0 };
      groups[key].income += income; groups[key].expense += expense; groups[key].count += 1;
    };

    if (reportType === "trip") {
      raw.trips.filter(t => inRange(t.start_date)).forEach(t =>
        add(segmentKey("trip", segment, t, tripsById), parseFloat(t.freight_amount || 0), 0));
    } else if (reportType === "expense") {
      [...raw.fuel, ...raw.tolls, ...raw.misc].filter(x => inRange(x.date)).forEach(x =>
        add(segmentKey("expense", segment, x, tripsById), 0, parseFloat(x.amount || 0)));
    } else if (reportType === "pl") {
      raw.trips.filter(t => inRange(t.start_date) && t.payment_status === "received").forEach(t =>
        add(segmentKey("trip", segment, t, tripsById), parseFloat(t.freight_amount || 0), 0));
      [...raw.fuel, ...raw.tolls, ...raw.misc, ...raw.tyres].filter(x => inRange(x.date)).forEach(x =>
        add(segmentKey("expense", segment, x, tripsById), 0, parseFloat(x.amount || 0)));
    } else if (reportType === "tyre") {
      raw.tyres.filter(t => inRange(t.date)).forEach(t =>
        add(segmentKey("expense", segment, t, tripsById), 0, parseFloat(t.amount || 0)));
    }

    return Object.entries(groups)
      .map(([key, v]) => ({ group: groupLabel(key), count: v.count, income: v.income, expense: v.expense, net: v.income - v.expense }))
      .sort((a, b) => (b.income + b.expense) - (a.income + a.expense));
  })();

  const columns = REPORT_COLUMNS[reportType];
  const fmtCell = (row: any, key: string) =>
    key === "group" || key === "count" ? row[key] : inr(row[key]);

  const exportCSV = () => {
    const rows = previewRows.map(r => Object.fromEntries(columns.map(c => [c.label, fmtCell(r, c.key)])));
    const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
    const csv = XLSX.utils.sheet_to_csv(sheet);
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${REPORT_TYPES.find(r => r.key === reportType)?.label.replace(/\s+/g, "_")}_${dateFrom}_to_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const toggle = (key: string) =>
    setSelected(p => p.includes(key) ? p.filter(k => k !== key) : [...p, key]);
  const toggleAll = () =>
    setSelected(selected.length === EXPORT_TYPES.length ? [] : EXPORT_TYPES.map(e => e.key));

  const handleDownload = async () => {
    if (!selected.length) return;
    setDownloading(true);
    try {
      const orgName = localStorage.getItem("orgName") || "My Fleet";
      const wb      = await buildWorkbook(selected, orgName);
      const date    = new Date().toISOString().slice(0, 10);

      if (format === "xlsx") {
        XLSX.writeFile(wb, `fleetsure_export_${date}.xlsx`);
      } else {
        // CSV: one sheet at a time, all combined into a single zip-like multi-file download
        for (const sheetName of wb.SheetNames) {
          const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sheetName]);
          const blob = new Blob([csv], { type: "text/csv" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `${sheetName.replace(/\s+/g, "_")}_${date}.csv`;
          a.click();
          URL.revokeObjectURL(a.href);
        }
      }
    } catch {
      alert("Export failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-report, #printable-report * { visibility: visible; }
          #printable-report { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
      <Header title={t("nav.reports")} subtitle="Download your fleet data as Excel or CSV" />
      <div style={{ padding: isMobile ? "14px" : "24px 28px" }}>

        {/* ── Custom Report ────────────────────────────────────────────── */}
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>Custom Report</h2>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                style={{ padding: "7px 10px", border: "1.5px solid var(--border-input)", borderRadius: 8, fontSize: 13, background: "var(--bg-card)", color: "var(--text-main)" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                style={{ padding: "7px 10px", border: "1.5px solid var(--border-input)", borderRadius: 8, fontSize: 13, background: "var(--bg-card)", color: "var(--text-main)" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Report Type</label>
              <select value={reportType} onChange={e => setReportType(e.target.value as ReportType)}
                style={{ padding: "7px 10px", border: "1.5px solid var(--border-input)", borderRadius: 8, fontSize: 13, background: "var(--bg-card)", color: "var(--text-main)" }}>
                {REPORT_TYPES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Segment</label>
              <select value={segment} onChange={e => setSegment(e.target.value as Segment)}
                style={{ padding: "7px 10px", border: "1.5px solid var(--border-input)", borderRadius: 8, fontSize: 13, background: "var(--bg-card)", color: "var(--text-main)" }}>
                {SEGMENTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              <button className="btn-outline" onClick={() => window.print()}><Printer size={14} /> Print / PDF</button>
              <button className="btn-outline" onClick={exportCSV}><Download size={14} /> Download CSV</button>
            </div>
          </div>

          <div id="printable-report" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}</tr>
              </thead>
              <tbody>
                {previewRows.length === 0 ? (
                  <tr><td colSpan={columns.length} style={{ textAlign: "center", color: "#aaa", padding: "24px 0" }}>No data in this date range.</td></tr>
                ) : previewRows.map((r, i) => (
                  <tr key={i}>{columns.map(c => <td key={c.key} style={c.key === "group" ? { fontWeight: 600, color: "#1E2D8E" } : undefined}>{fmtCell(r, c.key)}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 340px", gap: isMobile ? 16 : 24, alignItems: "start" }}>

          {/* Left — data selector */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Select Data to Export</h2>
              <button onClick={toggleAll}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "#1E2D8E", display: "flex", alignItems: "center", gap: 5 }}>
                {selected.length === EXPORT_TYPES.length
                  ? <><CheckSquare size={14} /> Deselect All</>
                  : <><Square size={14} /> Select All</>}
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {EXPORT_TYPES.map(et => {
                const isSelected = selected.includes(et.key);
                const count = counts[et.key];
                return (
                  <div key={et.key} onClick={() => toggle(et.key)}
                    style={{
                      display: "flex", alignItems: "center", gap: 14, padding: "12px 14px",
                      borderRadius: 10, cursor: "pointer", transition: "all 0.15s",
                      border: `1.5px solid ${isSelected ? "#1E2D8E" : "var(--border)"}`,
                      background: isSelected ? "#eef0fb" : "var(--bg-subtle)",
                    }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                      border: `2px solid ${isSelected ? "#1E2D8E" : "#ccc"}`,
                      background: isSelected ? "#1E2D8E" : "white",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {isSelected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: isSelected ? "#1E2D8E" : "var(--text-main)" }}>{et.label}</div>
                      <div style={{ fontSize: 12, color: "#aaa", marginTop: 1 }}>{et.desc}</div>
                    </div>
                    {count !== undefined && (
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                        background: count > 0 ? "#e8f5e9" : "#f5f5f5",
                        color: count > 0 ? "#2e7d32" : "#bbb",
                      }}>
                        {count > 0 ? `${count} records` : "No data"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right — format + download */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "#aaa", marginBottom: 4 }}>Ready to export</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: "#1E2D8E" }}>{selected.length}</div>
              <div style={{ fontSize: 13, color: "#888" }}>of {EXPORT_TYPES.length} data sheets</div>
              {!loadingCounts && (
                <div style={{ fontSize: 12, color: "#aaa", marginTop: 6 }}>
                  ~{selected.filter(k => counts[k] > 0).reduce((s, k) => s + (counts[k] || 0), 0)} records total
                </div>
              )}
            </div>

            <div className="card">
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "var(--text-main)" }}>Export Format</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { val: "xlsx", Icon: FileSpreadsheet, label: "Excel (.xlsx)", desc: "All sheets in one file — best for accountants" },
                  { val: "csv",  Icon: FileText,        label: "CSV (individual files)", desc: "One .csv per sheet, works everywhere" },
                ].map(f => (
                  <div key={f.val} onClick={() => setFormat(f.val as any)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                      borderRadius: 10, cursor: "pointer", transition: "all 0.15s",
                      border: `1.5px solid ${format === f.val ? "#1E2D8E" : "var(--border)"}`,
                      background: format === f.val ? "#eef0fb" : "var(--bg-subtle)",
                    }}>
                    <f.Icon size={20} color={format === f.val ? "#1E2D8E" : "#bbb"} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: format === f.val ? "#1E2D8E" : "var(--text-main)" }}>{f.label}</div>
                      <div style={{ fontSize: 11.5, color: "#aaa" }}>{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button className="btn-primary" onClick={handleDownload}
              disabled={downloading || selected.length === 0}
              style={{ width: "100%", justifyContent: "center", padding: "13px 20px", fontSize: 14, fontWeight: 700, opacity: selected.length === 0 ? 0.5 : 1 }}>
              <Download size={16} />
              {downloading ? "Preparing…" : `Download ${format === "xlsx" ? "Excel" : "CSV"}`}
            </button>

            {selected.length === 0 && (
              <div style={{ fontSize: 12.5, color: "#e65100", textAlign: "center" }}>
                Select at least one data type to export.
              </div>
            )}
            <div style={{ fontSize: 11.5, color: "#aaa", textAlign: "center", lineHeight: 1.6 }}>
              Export is filtered to your account only.<br />All amounts in ₹ (Indian Rupees).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
