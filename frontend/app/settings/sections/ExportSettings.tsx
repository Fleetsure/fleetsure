"use client";
import { useState } from "react";
import { Download, CheckCircle, XCircle } from "lucide-react";

// ─── Export Account Data ─────────────────────────────────────────────────────
const EXPORT_TYPES = [
  { key: "vehicles",    label: "Vehicles",             desc: "Registration, make, model, status" },
  { key: "drivers",     label: "Drivers",              desc: "Name, phone, license details, expiry" },
  { key: "trips",       label: "Trips",                desc: "Routes, freight amounts, dates" },
  { key: "expenses",    label: "All Expenses",         desc: "Every expense: fuel, toll, maintenance, etc." },
  { key: "fuel",        label: "Fuel Log",             desc: "Only fuel entries with amounts" },
  { key: "profit_loss", label: "Profit & Loss Report", desc: "Trip-wise revenue, expenses, profit & margin" },
];

export default function ExportSettings() {
  const [selected, setSelected] = useState<Record<string,boolean>>({
    vehicles: true, drivers: true, trips: true,
    expenses: true, fuel: true, profit_loss: true,
  });
  const [format, setFormat]       = useState<"xlsx"|"csv">("xlsx");
  const [exporting, setExporting] = useState(false);
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState("");

  const toggle = (key: string) => setSelected(p => ({ ...p, [key]: !p[key] }));
  const allOn  = Object.values(selected).every(Boolean);
  const toggleAll = () => {
    const val = !allOn;
    setSelected(Object.fromEntries(EXPORT_TYPES.map(t => [t.key, val])));
  };

  const handleExport = async () => {
    const typesList = Object.entries(selected).filter(([,v]) => v).map(([k]) => k);
    if (!typesList.length) { setError("Select at least one data type."); return; }
    setError(""); setExporting(true); setDone(false);
    const orgName = localStorage.getItem("orgName") || "My Fleet";
    try {
      const { buildWorkbook } = await import("@/app/reports/exportHelper");
      const XLSX = await import("xlsx");
      const wb   = await buildWorkbook(typesList, orgName);
      const date = new Date().toISOString().slice(0, 10);
      if (format === "xlsx") {
        XLSX.writeFile(wb, `fleetsure_export_${date}.xlsx`);
      } else {
        for (const sheetName of wb.SheetNames) {
          const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sheetName]);
          const a = document.createElement("a");
          a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
          a.download = `${sheetName.replace(/\s+/g, "_")}_${date}.csv`;
          a.click();
          URL.revokeObjectURL(a.href);
        }
      }
      setDone(true);
      setTimeout(() => setDone(false), 4000);
    } catch {
      setError("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700 }}>Export Account Data</h2>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--text-muted)" }}>
        Download your fleet data for accounting, backup, or reporting.
      </p>

      {/* Info banner */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 10, background: "var(--bg-subtle)", border: "1px solid var(--border-input)", marginBottom: 24 }}>
        <span style={{ fontSize: 16, marginTop: 1 }}>💡</span>
        <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.6 }}>
          XLSX format includes all data in one file with multiple sheets, best for sharing with your accountant.
          CSV exports a ZIP folder, useful for large datasets or importing into other software.
        </div>
      </div>

      {/* Select Data */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Select Data to Include</span>
          <button onClick={toggleAll} style={{ fontSize: 12, color: "#1E2D8E", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
            {allOn ? "Deselect All" : "Select All"}
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {EXPORT_TYPES.map(t => (
            <label key={t.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 10, border: `1.5px solid ${selected[t.key] ? "#1E2D8E" : "var(--border-input)"}`, background: selected[t.key] ? "var(--bg-hover)" : "var(--bg-card)", cursor: "pointer", transition: "all 0.15s" }}>
              <input
                type="checkbox"
                checked={selected[t.key]}
                onChange={() => toggle(t.key)}
                style={{ width: 16, height: 16, accentColor: "#1E2D8E", cursor: "pointer", flexShrink: 0 }}
              />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-main)" }}>{t.label}</div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 1 }}>{t.desc}</div>
              </div>
              {selected[t.key] && <CheckCircle size={15} color="#1E2D8E" style={{ marginLeft: "auto", flexShrink: 0 }} />}
            </label>
          ))}
        </div>
      </div>

      {/* Export Format */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Export Format</div>
        <div style={{ display: "flex", gap: 12 }}>
          {[
            { val: "xlsx", label: "Excel (.xlsx)", icon: "📊", desc: "One file, multiple sheets. Best for accountants." },
            { val: "csv",  label: "CSV (.zip)",    icon: "📁", desc: "Multiple CSV files in a ZIP. For large data." },
          ].map(f => (
            <label key={f.val} onClick={() => setFormat(f.val as any)} style={{
              flex: 1, padding: "14px 16px", borderRadius: 12, cursor: "pointer",
              border: `2px solid ${format === f.val ? "#1E2D8E" : "var(--border-input)"}`,
              background: format === f.val ? "var(--bg-hover)" : "var(--bg-card)",
              transition: "all 0.15s"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <input type="radio" checked={format === f.val} onChange={() => setFormat(f.val as any)} style={{ accentColor: "#1E2D8E" }} />
                <span style={{ fontSize: 15 }}>{f.icon}</span>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-main)" }}>{f.label}</span>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)", paddingLeft: 26 }}>{f.desc}</div>
            </label>
          ))}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 8 }}>
          For large fleets, use CSV to avoid Excel row limits.
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: "#fce4ec", color: "#b71c1c", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
          <XCircle size={15} /> {error}
        </div>
      )}

      {/* Success */}
      {done && (
        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: "#e6f4ea", color: "#1a7a34", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle size={15} /> Export downloaded successfully!
        </div>
      )}

      {/* CTA */}
      <button
        className="btn-primary"
        onClick={handleExport}
        disabled={exporting}
        style={{ fontSize: 14, padding: "10px 24px", opacity: exporting ? 0.7 : 1, gap: 8 }}
      >
        <Download size={16} />
        {exporting ? "Preparing export..." : "Export Data"}
      </button>
    </div>
  );
}
