"use client";
import { useState, useRef, useCallback } from "react";
import Header from "@/components/Header";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, ChevronDown, X, ArrowRight, Loader2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const ENTITY_LABELS: Record<string, string> = {
  vehicles: "🚛 Vehicles",
  drivers:  "👤 Drivers",
  trips:    "🗺️ Trips",
  fuel:     "⛽ Fuel Logs",
  unknown:  "❓ Unknown",
};

const ENTITY_COLORS: Record<string, string> = {
  vehicles: "#1E2D8E",
  drivers:  "#7B3FC4",
  trips:    "#0891b2",
  fuel:     "#e65100",
  unknown:  "#888",
};

// All mappable fields per entity
const ENTITY_FIELDS: Record<string, string[]> = {
  vehicles: ["registration_number", "make", "model", "year", "vehicle_type", "fuel_type", "chassis_number", "engine_number"],
  drivers:  ["name", "phone", "alternate_phone", "license_number", "license_expiry", "address", "blood_group", "dob"],
  trips:    ["registration_number", "driver_name", "driver_phone", "origin", "destination", "start_date", "end_date", "freight_amount", "material", "weight_tonnes", "doc_number", "notes"],
  fuel:     ["registration_number", "date", "litres", "amount", "odometer_km", "fuel_station", "notes"],
  unknown:  [],
};

const FIELD_LABELS: Record<string, string> = {
  registration_number: "Vehicle Reg No",
  make: "Make (Brand)",
  model: "Model",
  year: "Year",
  vehicle_type: "Vehicle Type",
  fuel_type: "Fuel Type",
  chassis_number: "Chassis No",
  engine_number: "Engine No",
  name: "Driver Name",
  phone: "Phone",
  alternate_phone: "Alt Phone",
  license_number: "License No (DL)",
  license_expiry: "License Expiry",
  address: "Address",
  blood_group: "Blood Group",
  dob: "Date of Birth",
  driver_name: "Driver Name",
  driver_phone: "Driver Phone",
  origin: "Origin (From)",
  destination: "Destination (To)",
  start_date: "Start Date",
  end_date: "End Date",
  freight_amount: "Freight Amount (₹)",
  material: "Material / Cargo",
  weight_tonnes: "Weight (Tonnes)",
  doc_number: "LR / Doc No",
  notes: "Notes",
  date: "Date",
  litres: "Litres",
  amount: "Amount (₹)",
  odometer_km: "Odometer (KM)",
  fuel_station: "Fuel Station",
};

interface SheetPreview {
  sheet_name: string;
  entity_type: string;
  headers: string[];
  column_map: Record<string, string>;
  rows: Record<string, string>[];
  total_rows: number;
}

interface ImportResult {
  entity_type: string;
  sheet_name: string;
  inserted: number;
  skipped: number;
  errors: string[];
}

function ResultsPanel({ results, onReset }: { results: ImportResult[]; onReset: () => void }) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const toggle = (i: number) => setExpanded(p => ({ ...p, [i]: !p[i] }));
  const totalInserted = results.reduce((s, r) => s + r.inserted, 0);

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e" }}>Import Complete</div>
        <div style={{ fontSize: 13, color: "#2e7d32", background: "#e8f5e9", padding: "4px 12px", borderRadius: 20, fontWeight: 600 }}>
          {totalInserted} records added
        </div>
      </div>

      {results.map((r, i) => {
        const hasErrors = r.errors.length > 0;
        const isExpanded = expanded[i];
        const showToggle = r.errors.length > 5;
        const visibleErrors = isExpanded ? r.errors : r.errors.slice(0, 5);

        return (
          <div key={i} style={{ background: "white", borderRadius: 12, padding: 20, marginBottom: 12, border: `1px solid ${hasErrors ? "#ffccbc" : "#c8e6c9"}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              {!hasErrors
                ? <CheckCircle size={18} color="#2e7d32" />
                : <AlertCircle size={18} color="#e65100" />
              }
              <span style={{ fontWeight: 700, fontSize: 15 }}>{ENTITY_LABELS[r.entity_type] || r.entity_type}</span>
              <span style={{ color: "#888", fontSize: 13 }}>({r.sheet_name})</span>
            </div>

            <div style={{ display: "flex", gap: 20, fontSize: 13, flexWrap: "wrap" }}>
              <span style={{ color: "#2e7d32", fontWeight: 600 }}>✓ {r.inserted} imported</span>
              {r.skipped > 0 && <span style={{ color: "#666" }}>⟳ {r.skipped} skipped (already exist)</span>}
              {r.errors.length > 0 && <span style={{ color: "#b71c1c" }}>✗ {r.errors.length} failed</span>}
            </div>

            {hasErrors && (
              <div style={{ marginTop: 12, background: "#fff8f5", borderRadius: 8, padding: "10px 14px", border: "1px solid #ffe0d0" }}>
                {visibleErrors.map((e, j) => (
                  <div key={j} style={{ fontSize: 12, color: "#b71c1c", padding: "2px 0", display: "flex", gap: 6 }}>
                    <span style={{ flexShrink: 0 }}>•</span>
                    <span>{e}</span>
                  </div>
                ))}
                {showToggle && (
                  <button
                    onClick={() => toggle(i)}
                    style={{ marginTop: 8, fontSize: 12, color: "#1E2D8E", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 }}>
                    {isExpanded ? "▲ Show less" : `▼ Show all ${r.errors.length} errors`}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      <button
        onClick={onReset}
        style={{ marginTop: 8, padding: "10px 24px", background: "#1E2D8E", color: "white", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
        Import Another File
      </button>
    </div>
  );
}

export default function ImportPage() {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previews, setPreviews] = useState<SheetPreview[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [columnMaps, setColumnMaps] = useState<Record<number, Record<string, string>>>({});
  const [entityTypes, setEntityTypes] = useState<Record<number, string>>({});
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;
    setError("");
    setResults(null);
    setPreviews([]);
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API}/import/preview`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Preview failed");

      setPreviews(data);
      setActiveSheet(0);

      // Init column maps and entity types from server detection
      const maps: Record<number, Record<string, string>> = {};
      const types: Record<number, string> = {};
      data.forEach((s: SheetPreview, i: number) => {
        maps[i] = { ...s.column_map };
        types[i] = s.entity_type;
      });
      setColumnMaps(maps);
      setEntityTypes(types);
    } catch (e: any) {
      setError(e.message || "Failed to read file");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const setColMapping = (sheetIdx: number, col: string, field: string) => {
    setColumnMaps(prev => ({
      ...prev,
      [sheetIdx]: { ...prev[sheetIdx], [col]: field },
    }));
  };

  const setEntityType = (sheetIdx: number, type: string) => {
    setEntityTypes(prev => ({ ...prev, [sheetIdx]: type }));
    // Re-map all columns for the new entity type
    const s = previews[sheetIdx];
    const newMap: Record<string, string> = {};
    s.headers.forEach(h => { newMap[h] = ""; });
    setColumnMaps(prev => ({ ...prev, [sheetIdx]: newMap }));
  };

  const handleImport = async () => {
    setImporting(true);
    setError("");
    try {
      // previews[i].rows contains ALL rows (backend returns full data, frontend shows first 5 in table)
      const confirmSheets = previews.map((s, i) => ({
        sheet_name: s.sheet_name,
        entity_type: entityTypes[i] || s.entity_type,
        column_map: columnMaps[i] || s.column_map,
        rows: s.rows,
      }));

      const res = await fetch(`${API}/import/confirm`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sheets: confirmSheets }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Import failed");
      setResults(data);
    } catch (e: any) {
      setError(e.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const currentSheet = previews[activeSheet];
  const currentMap = columnMaps[activeSheet] || {};
  const currentEntityType = entityTypes[activeSheet] || currentSheet?.entity_type || "unknown";
  const availableFields = ENTITY_FIELDS[currentEntityType] || [];

  const mappedCount = Object.values(currentMap).filter(v => v).length;
  const totalCols = currentSheet?.headers.length || 0;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f8f9ff", minHeight: "100vh" }}>
      <Header title="Import Data" subtitle="Upload Excel or CSV to bulk-import vehicles, drivers, trips, or fuel logs" />

      <div style={{ flex: 1, padding: "24px 32px", maxWidth: 1200, margin: "0 auto", width: "100%" }}>

        {/* ── Upload zone ─────────────────────────────────────────────────── */}
        {!previews.length && !loading && (
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2.5px dashed ${dragging ? "#1E2D8E" : "#c5cae9"}`,
              borderRadius: 16,
              background: dragging ? "#f0f3ff" : "white",
              padding: "64px 32px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
              cursor: "pointer",
              transition: "all 0.2s",
              textAlign: "center",
            }}
          >
            <div style={{ width: 72, height: 72, borderRadius: 20, background: "#eef0ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Upload size={32} color="#1E2D8E" />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e", marginBottom: 6 }}>
                Drop your Excel or CSV file here
              </div>
              <div style={{ fontSize: 14, color: "#888" }}>
                Supports <strong>.xlsx</strong>, <strong>.xls</strong>, <strong>.csv</strong> — any format, any column names
              </div>
            </div>
            <div style={{ fontSize: 13, color: "#1E2D8E", fontWeight: 600, background: "#eef0ff", padding: "8px 20px", borderRadius: 20 }}>
              Browse File
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={onFileChange} />
          </div>
        )}

        {/* ── Loading ─────────────────────────────────────────────────────── */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: 80 }}>
            <Loader2 size={40} color="#1E2D8E" style={{ animation: "spin 1s linear infinite" }} />
            <div style={{ color: "#555", fontSize: 15 }}>Reading file and detecting columns…</div>
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {error && (
          <div style={{ background: "#fce4ec", borderRadius: 10, padding: "12px 16px", color: "#b71c1c", fontSize: 14, display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* ── Results ─────────────────────────────────────────────────────── */}
        {results && <ResultsPanel results={results} onReset={() => { setPreviews([]); setResults(null); setColumnMaps({}); setEntityTypes({}); }} />}

        {/* ── Preview + column mapping ─────────────────────────────────────── */}
        {previews.length > 0 && !results && (
          <div>
            {/* Sheet tabs */}
            {previews.length > 1 && (
              <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                {previews.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveSheet(i)}
                    style={{
                      padding: "8px 16px", borderRadius: 8, border: "none",
                      background: activeSheet === i ? "#1E2D8E" : "white",
                      color: activeSheet === i ? "white" : "#555",
                      fontWeight: activeSheet === i ? 700 : 400,
                      cursor: "pointer", fontSize: 13,
                      boxShadow: activeSheet === i ? "0 2px 8px rgba(30,45,142,0.3)" : "0 1px 3px rgba(0,0,0,0.08)",
                    }}>
                    <FileSpreadsheet size={13} style={{ marginRight: 6, verticalAlign: "middle" }} />
                    {s.sheet_name}
                  </button>
                ))}
              </div>
            )}

            {currentSheet && (
              <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20 }}>

                {/* ── Left panel: settings ────────────────────────────────── */}
                <div>
                  {/* Entity type selector */}
                  <div style={{ background: "white", borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#555", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Data Type</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {Object.keys(ENTITY_LABELS).filter(e => e !== "unknown").map(et => (
                        <label key={et} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, cursor: "pointer", background: currentEntityType === et ? "#eef0ff" : "transparent", border: currentEntityType === et ? "1.5px solid #1E2D8E" : "1.5px solid transparent", transition: "all 0.15s" }}>
                          <input type="radio" name={`et-${activeSheet}`} value={et} checked={currentEntityType === et} onChange={() => setEntityType(activeSheet, et)} style={{ accentColor: "#1E2D8E" }} />
                          <span style={{ fontSize: 14, fontWeight: currentEntityType === et ? 700 : 400, color: currentEntityType === et ? "#1E2D8E" : "#333" }}>
                            {ENTITY_LABELS[et]}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Column mapping */}
                  <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em" }}>Column Mapping</div>
                      <div style={{ fontSize: 12, color: mappedCount === totalCols ? "#2e7d32" : "#888" }}>
                        {mappedCount}/{totalCols} mapped
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {currentSheet.headers.map(col => (
                        <div key={col} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, fontSize: 12, color: "#444", background: "#f5f5f5", padding: "6px 10px", borderRadius: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={col}>
                            {col}
                          </div>
                          <ArrowRight size={12} color="#ccc" style={{ flexShrink: 0 }} />
                          <select
                            value={currentMap[col] || ""}
                            onChange={e => setColMapping(activeSheet, col, e.target.value)}
                            style={{ flex: 1, fontSize: 12, padding: "5px 8px", borderRadius: 6, border: currentMap[col] ? "1.5px solid #1E2D8E" : "1.5px solid #e0e0e0", background: currentMap[col] ? "#f0f3ff" : "white", color: currentMap[col] ? "#1E2D8E" : "#888", cursor: "pointer", outline: "none" }}>
                            <option value="">— skip —</option>
                            {availableFields.map(f => (
                              <option key={f} value={f}>{FIELD_LABELS[f] || f}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Right panel: preview table ──────────────────────────── */}
                <div>
                  <div style={{ background: "white", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
                    <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e" }}>Preview</span>
                        <span style={{ color: "#888", fontSize: 13, marginLeft: 8 }}>Showing first 5 of {currentSheet.rows.length} rows</span>
                      </div>
                      <div style={{ fontSize: 12, padding: "4px 10px", borderRadius: 20, background: "#eef0ff", color: ENTITY_COLORS[currentEntityType] || "#888", fontWeight: 700 }}>
                        {ENTITY_LABELS[currentEntityType]}
                      </div>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: "#f8f9ff" }}>
                            {currentSheet.headers.map(h => (
                              <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#555", fontWeight: 600, borderBottom: "1px solid #f0f0f5", whiteSpace: "nowrap" }}>
                                <div style={{ fontSize: 11, color: currentMap[h] ? "#1E2D8E" : "#bbb", fontWeight: 700 }}>
                                  {currentMap[h] ? FIELD_LABELS[currentMap[h]] || currentMap[h] : "—"}
                                </div>
                                <div style={{ fontSize: 12, color: "#333", marginTop: 2 }}>{h}</div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {currentSheet.rows.slice(0, 5).map((row, ri) => (
                            <tr key={ri} style={{ borderBottom: "1px solid #f8f9ff" }}
                              onMouseEnter={e => (e.currentTarget.style.background = "#fafbff")}
                              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                              {currentSheet.headers.map(h => (
                                <td key={h} style={{ padding: "8px 14px", color: row[h] ? "#333" : "#ddd", whiteSpace: "nowrap", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {String(row[h] ?? "—")}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 12, marginTop: 20, justifyContent: "flex-end", alignItems: "center" }}>
                    <button
                      onClick={() => { setPreviews([]); setColumnMaps({}); setEntityTypes({}); }}
                      style={{ padding: "10px 20px", background: "white", color: "#555", border: "1px solid #e0e0e0", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
                      Cancel
                    </button>
                    <button
                      onClick={handleImport}
                      disabled={importing}
                      style={{
                        padding: "10px 28px",
                        background: importing ? "#9fa8da" : "#1E2D8E",
                        color: "white", border: "none", borderRadius: 8,
                        fontWeight: 700, cursor: importing ? "not-allowed" : "pointer",
                        fontSize: 14, display: "flex", alignItems: "center", gap: 8,
                      }}>
                      {importing
                        ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Importing…</>
                        : <>Import {previews.reduce((sum, s) => sum + s.rows.length, 0)} Records</>
                      }
                    </button>
                  </div>

                  {/* Tip */}
                  <div style={{ marginTop: 16, background: "#fffde7", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#795548", border: "1px solid #fff9c4" }}>
                    <strong>Tips:</strong> Trips and Fuel logs require vehicles to exist first. Duplicate registrations and phone numbers are skipped automatically.
                  </div>
                </div>

              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
