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
import { Download, FileSpreadsheet, FileText, CheckSquare, Square } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import * as XLSX from "xlsx";
import { buildWorkbook } from "./exportHelper";

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
  const [selected, setSelected] = useState<string[]>(EXPORT_TYPES.map(e => e.key));
  const [format, setFormat]     = useState<"xlsx" | "csv">("xlsx");
  const [downloading, setDownloading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [counts, setCounts]     = useState<Record<string, number>>({});
  const [loadingCounts, setLoadingCounts] = useState(true);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check(); window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    Promise.all([
      vehicleService.getAll(), tripService.getAll(), driverService.getAll(),
      fuelService.getAll(), tollService.getAll(), tyreService.getAll(), miscExpenseService.getAll(),
    ]).then(([v, tr, d, f, tl, ty, m]) => {
      const completed = (tr.data || []).filter((t: any) => t.status === "completed").length;
      setCounts({
        vehicles: (v.data || []).length, trips: (tr.data || []).length,
        drivers: (d.data || []).length, fuel: (f.data || []).length,
        tolls: (tl.data || []).length, tyres: (ty.data || []).length,
        misc: (m.data || []).length, profit_loss: completed,
      });
      setLoadingCounts(false);
    }).catch(() => setLoadingCounts(false));
  }, []);

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
      <Header title={t("nav.reports")} subtitle="Download your fleet data as Excel or CSV" />
      <div style={{ padding: isMobile ? "14px" : "24px 28px" }}>
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
