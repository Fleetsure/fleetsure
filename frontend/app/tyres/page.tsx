"use client";
import React, { useEffect, useState } from "react";
import { getTyreSetup as _getTyreSetup, saveTyreSetup } from "@/lib/tyreStore";
import Header from "@/components/Header";
import { tyreService } from "@/lib/services/tyreService";
import { vehicleService } from "@/lib/services/vehicleService";
import { tripService } from "@/lib/services/tripService";
import { fmtDate, todayISO } from "@/lib/date";
import { Plus, X, Trash2, Circle, AlertTriangle, Info, RotateCcw, Settings } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PressureLog { date: string; psi: number; }

interface IssueLog {
  date: string;
  type: string;
  label: string;
  health_impact: number;
  description: string;
}

interface TyreUnit {
  position: string;
  is_spare: boolean;
  brand: string;
  max_lifespan_km: number;
  install_date: string;
  install_odometer: number;
  kms_run: number;
  retread_count: number;
  last_rotation_date: string;
  last_rotation_odometer: number;
  cost: number;
  pressure_logs: PressureLog[];
  issue_logs: IssueLog[];
}

interface VehicleTyreSetup {
  tyre_count: number;
  has_spare: boolean;
  tyres: TyreUnit[];
  synced_trip_ids: string[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TYRE_COUNTS = [4, 6, 8, 10, 12, 14, 16, 18];
const TYRE_BRANDS = ["MRF", "Apollo", "Bridgestone", "CEAT", "JK Tyre", "Goodyear", "Michelin", "Other"];
const TYRE_TYPES = [
  { value: "new",       label: "New Tyre" },
  { value: "recap",     label: "Recap / Retread" },
  { value: "repair",    label: "Repair / Puncture" },
  { value: "balance",   label: "Wheel Balancing" },
  { value: "alignment", label: "Wheel Alignment" },
];
const TYPE_COLORS: Record<string, { color: string; bg: string }> = {
  new:       { color: "#2e7d32", bg: "#e8f5e9" },
  recap:     { color: "#0277bd", bg: "#e1f5fe" },
  repair:    { color: "#e65100", bg: "#fff3e0" },
  balance:   { color: "#6a1b9a", bg: "#f3e5f5" },
  alignment: { color: "#1E2D8E", bg: "#eef0fb" },
};
const EMPTY_LOG = {
  vehicle_id: "", date: todayISO(), amount: "",
  tyre_brand: "", tyre_count: "1", tyre_type: "new",
  tyre_position: "", odometer_km: "", notes: "",
};

const ISSUE_TYPES = [
  { value: "puncture_minor",  label: "Puncture (minor)",          impact: 5  },
  { value: "puncture_major",  label: "Puncture (major/sidewall)", impact: 15 },
  { value: "blowout",         label: "Blowout",                   impact: 35 },
  { value: "cut_bulge",       label: "Cut / Bulge",               impact: 20 },
  { value: "crack",           label: "Crack / Splitting",         impact: 15 },
  { value: "excessive_wear",  label: "Excessive wear",            impact: 10 },
  { value: "other",           label: "Other damage",              impact: 5  },
];

// ── LocalStorage ──────────────────────────────────────────────────────────────

function getTyreSetup(vid: string): VehicleTyreSetup | null {
  return _getTyreSetup(vid) as VehicleTyreSetup | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcHealth(t: TyreUnit): number {
  return Math.max(0, Math.round(100 - (t.kms_run / Math.max(1, t.max_lifespan_km)) * 100));
}

function healthColor(pct: number) {
  if (pct >= 60) return { color: "#2e7d32", bg: "#e8f5e9", label: "Good" };
  if (pct >= 30) return { color: "#f57f17", bg: "#fffde7", label: "Fair" };
  return { color: "#c62828", bg: "#fce4ec", label: "Critical" };
}

function genPositions(count: number): string[] {
  const rows = count / 2;
  const out: string[] = [];
  for (let r = 0; r < rows; r++) {
    const name = r === 0 ? "Front" : r === rows - 1 ? "Rear" : `Mid ${r}`;
    out.push(`${name} L`, `${name} R`);
  }
  return out;
}

function makeDefault(position: string, is_spare: boolean, maxKm: number): TyreUnit {
  return {
    position, is_spare, brand: "MRF", max_lifespan_km: maxKm,
    install_date: todayISO(), install_odometer: 0, kms_run: 0,
    retread_count: 0, last_rotation_date: "", last_rotation_odometer: 0,
    cost: 0, pressure_logs: [], issue_logs: [],
  };
}

function buildSetup(count: number, hasSpare: boolean, maxKm: number): VehicleTyreSetup {
  const tyres = genPositions(count).map(p => makeDefault(p, false, maxKm));
  if (hasSpare) tyres.push(makeDefault("Spare", true, maxKm));
  return { tyre_count: count, has_spare: hasSpare, tyres, synced_trip_ids: [] };
}

function predictReplacement(t: TyreUnit): { days: number; date: string } | null {
  if (t.kms_run < 50) return null;
  const daysSince = Math.max(1, Math.floor((Date.now() - new Date(t.install_date).getTime()) / 86400000));
  const avgPerDay = t.kms_run / daysSince;
  const remaining = t.max_lifespan_km - t.kms_run;
  if (remaining <= 0) return { days: 0, date: todayISO() };
  const days = Math.ceil(remaining / avgPerDay);
  const d = new Date(); d.setDate(d.getDate() + days);
  return { days, date: d.toISOString().slice(0, 10) };
}

type InsightSeverity = "critical" | "warning" | "info";

function getInsights(tyres: TyreUnit[]): { type: InsightSeverity; msg: string }[] {
  const out: { type: InsightSeverity; msg: string }[] = [];
  const main = tyres.filter(t => !t.is_spare);

  main.forEach(t => {
    const h = calcHealth(t);
    if (h < 15) out.push({ type: "critical", msg: `${t.position}: Replace immediately — only ${h}% life left` });
    else if (h < 30) out.push({ type: "warning", msg: `${t.position}: Low health (${h}%) — plan replacement soon` });

    const kmSinceRot = t.last_rotation_date
      ? t.kms_run - (t.last_rotation_odometer || 0)
      : t.kms_run;
    if (kmSinceRot >= 25000)
      out.push({ type: "info", msg: `${t.position}: Rotation due — ${kmSinceRot.toLocaleString("en-IN")} km since last rotation` });

    const lastPressure = t.pressure_logs[t.pressure_logs.length - 1];
    if (lastPressure) {
      const days = Math.floor((Date.now() - new Date(lastPressure.date).getTime()) / 86400000);
      if (days > 30) out.push({ type: "info", msg: `${t.position}: Pressure check overdue (${days} days ago)` });
    }
  });

  // Uneven wear detection
  if (main.length >= 2) {
    const vals = main.map(calcHealth);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    main.forEach(t => {
      if (Math.abs(calcHealth(t) - avg) > 20)
        out.push({ type: "warning", msg: `${t.position}: Uneven wear — ${calcHealth(t)}% vs fleet avg ${Math.round(avg)}%` });
    });
  }

  const spareTyre = tyres.find(t => t.is_spare);
  if (spareTyre && spareTyre.kms_run > 0)
    out.push({ type: "info", msg: `Spare has been used (${spareTyre.kms_run.toLocaleString("en-IN")} km) — consider replacing` });

  return out;
}

// ── TruckDiagram ──────────────────────────────────────────────────────────────

function TruckDiagram({ tyres, selectedPos, onSelect }: {
  tyres: TyreUnit[];
  selectedPos: string | null;
  onSelect: (t: TyreUnit) => void;
}) {
  const main = tyres.filter(t => !t.is_spare);
  const spare = tyres.find(t => t.is_spare);
  const rows = Math.max(1, main.length / 2);

  const W = 300; const CX = W / 2;

  // Wide cabin — fills the full vehicle width
  const CAB_W = 152; const CAB_X = CX - CAB_W / 2;  // 74..226
  const CAB_TOP = 16; const CAB_H = 62;

  // Body slightly narrower
  const BODY_W = 122; const BODY_X = CX - BODY_W / 2; // 89..211
  const BODY_TOP = CAB_TOP + CAB_H + 4;                // 82

  const TW = 22; const TH = 42;
  const TL_X = BODY_X - TW - 5;    // 62
  const TR_X = BODY_X + BODY_W + 5; // 216

  const FIRST_AXY = BODY_TOP + 28;
  const ROW_H = 62;

  const BODY_BOT = FIRST_AXY + (rows - 1) * ROW_H + 28;
  const svgH = BODY_BOT + (spare ? 90 : 22);

  return (
    <svg viewBox={`0 0 ${W} ${svgH}`} style={{ width: "100%", maxWidth: 280, display: "block", margin: "0 auto" }}>

      {/* ── CABIN ── */}
      {/* Cabin roof */}
      <rect x={CAB_X} y={CAB_TOP} width={CAB_W} height={CAB_H} rx={10}
        fill="#1e3a5f" stroke="#152b47" strokeWidth={2} />
      {/* Front bumper / valance */}
      <rect x={CAB_X + 4} y={CAB_TOP} width={CAB_W - 8} height={10} rx={5}
        fill="#2d5282" />
      {/* Headlights — wide amber strips at front corners */}
      <rect x={CAB_X + 4} y={CAB_TOP + 1} width={26} height={9} rx={4}
        fill="#fde68a" stroke="#f6ad55" strokeWidth={1} />
      <rect x={CAB_X + CAB_W - 30} y={CAB_TOP + 1} width={26} height={9} rx={4}
        fill="#fde68a" stroke="#f6ad55" strokeWidth={1} />
      {/* Grille (horizontal bar + vertical slats) */}
      <rect x={CAB_X + 34} y={CAB_TOP + 2} width={CAB_W - 68} height={8} rx={2}
        fill="#0f1f35" />
      {[0, 1, 2].map(i => (
        <line key={i}
          x1={CAB_X + 40 + i * 22} y1={CAB_TOP + 2}
          x2={CAB_X + 40 + i * 22} y2={CAB_TOP + 10}
          stroke="#2d5282" strokeWidth={2} />
      ))}
      {/* Windshield */}
      <rect x={CAB_X + 12} y={CAB_TOP + 14} width={CAB_W - 24} height={CAB_H - 26} rx={6}
        fill="#7ec8e3" opacity={0.5} stroke="#56adc7" strokeWidth={0.8} />
      {/* Windshield glare */}
      <ellipse cx={CX - 8} cy={CAB_TOP + 21} rx={24} ry={3.5}
        fill="white" opacity={0.35} />
      {/* Dashboard strip */}
      <rect x={CAB_X + 12} y={CAB_TOP + CAB_H - 14} width={CAB_W - 24} height={5} rx={2}
        fill="#0f1f35" opacity={0.45} />
      {/* Side mirrors — small stubby rectangles, NOT tapered paths */}
      <rect x={CAB_X - 15} y={CAB_TOP + 20} width={14} height={22} rx={3}
        fill="#2d5282" stroke="#152b47" strokeWidth={1} />
      <rect x={CAB_X - 14} y={CAB_TOP + 22} width={12} height={10} rx={2}
        fill="#90cdf4" opacity={0.55} />
      <rect x={CAB_X + CAB_W + 1} y={CAB_TOP + 20} width={14} height={22} rx={3}
        fill="#2d5282" stroke="#152b47" strokeWidth={1} />
      <rect x={CAB_X + CAB_W + 2} y={CAB_TOP + 22} width={12} height={10} rx={2}
        fill="#90cdf4" opacity={0.55} />

      {/* ── TRUCK BODY ── */}
      <rect x={BODY_X} y={BODY_TOP} width={BODY_W} height={BODY_BOT - BODY_TOP} rx={4}
        fill="#dde5f8" stroke="#9daae8" strokeWidth={1.5} />
      {/* Chassis side rails */}
      <rect x={BODY_X} y={BODY_TOP} width={9} height={BODY_BOT - BODY_TOP} fill="#b8c4e4" />
      <rect x={BODY_X + BODY_W - 9} y={BODY_TOP} width={9} height={BODY_BOT - BODY_TOP} fill="#b8c4e4" />
      {/* Cross-member panel dividers */}
      {Array.from({ length: rows - 1 }).map((_, ri) => {
        const y = FIRST_AXY + ri * ROW_H + ROW_H / 2;
        return (
          <line key={ri}
            x1={BODY_X + 9} y1={y} x2={BODY_X + BODY_W - 9} y2={y}
            stroke="#9daae8" strokeWidth={1} strokeDasharray="7,5" />
        );
      })}

      {/* ── AXLES ── */}
      {Array.from({ length: rows }).map((_, r) => {
        const y = FIRST_AXY + r * ROW_H;
        return (
          <g key={r}>
            <line x1={TL_X + TW} y1={y} x2={TR_X} y2={y}
              stroke="#4a5568" strokeWidth={3.5} strokeLinecap="round" />
            <circle cx={TL_X + TW} cy={y} r={4} fill="#4a5568" />
            <circle cx={TR_X} cy={y} r={4} fill="#4a5568" />
          </g>
        );
      })}

      {/* ── TYRES ── */}
      {main.map((tyre, i) => {
        const r = Math.floor(i / 2);
        const isL = i % 2 === 0;
        const yC = FIRST_AXY + r * ROW_H;
        const x = isL ? TL_X : TR_X;
        const h = calcHealth(tyre);
        const { color, bg } = healthColor(h);
        const sel = selectedPos === tyre.position;
        const barH = Math.max(0, (TH - 14) * h / 100);
        return (
          <g key={tyre.position} onClick={() => onSelect(tyre)} style={{ cursor: "pointer" }}>
            {/* Shadow */}
            <rect x={x + 2} y={yC - TH / 2 + 2} width={TW} height={TH} rx={5}
              fill="rgba(0,0,0,0.16)" />
            {/* Outer tyre (dark rubber) */}
            <rect x={x} y={yC - TH / 2} width={TW} height={TH} rx={5}
              fill="#1a202c" stroke={sel ? "#3182ce" : "#0d1117"} strokeWidth={sel ? 2.5 : 1.5} />
            {/* Tread grooves */}
            <line x1={x + 2} y1={yC - 13} x2={x + TW - 2} y2={yC - 13}
              stroke="#2d3748" strokeWidth={1.5} />
            <line x1={x + 2} y1={yC + 13} x2={x + TW - 2} y2={yC + 13}
              stroke="#2d3748" strokeWidth={1.5} />
            {/* Rim */}
            <rect x={x + 4} y={yC - TH / 2 + 6} width={TW - 8} height={TH - 12} rx={3}
              fill={bg} />
            {/* Health fill bar */}
            <rect x={x + 6} y={yC + TH / 2 - 8 - barH} width={TW - 12} height={barH} rx={2}
              fill={color} opacity={0.8} />
            {/* Hub bolt */}
            <circle cx={x + TW / 2} cy={yC} r={3} fill={color} />
            {/* Selection ring */}
            {sel && (
              <rect x={x - 3} y={yC - TH / 2 - 3} width={TW + 6} height={TH + 6} rx={8}
                fill="none" stroke="#3182ce" strokeWidth={2} strokeDasharray="4,3" />
            )}
            {/* Labels */}
            {isL ? (
              <>
                <text x={TL_X - 5} y={yC - 7} textAnchor="end" fontSize={8.5} fontWeight="600" fill="#4a5568">{tyre.position}</text>
                <text x={TL_X - 5} y={yC + 6} textAnchor="end" fontSize={10} fontWeight="700" fill={color}>{h}%</text>
              </>
            ) : (
              <>
                <text x={TR_X + TW + 5} y={yC - 7} textAnchor="start" fontSize={8.5} fontWeight="600" fill="#4a5568">{tyre.position}</text>
                <text x={TR_X + TW + 5} y={yC + 6} textAnchor="start" fontSize={10} fontWeight="700" fill={color}>{h}%</text>
              </>
            )}
          </g>
        );
      })}

      {/* ── SPARE ── */}
      {spare && (() => {
        const cy = BODY_BOT + 46;
        const h = calcHealth(spare);
        const { color, bg } = healthColor(h);
        const sel = selectedPos === "Spare";
        return (
          <g onClick={() => onSelect(spare)} style={{ cursor: "pointer" }}>
            <circle cx={CX + 2} cy={cy + 2} r={22} fill="rgba(0,0,0,0.12)" />
            <circle cx={CX} cy={cy} r={21} fill="#1a202c"
              stroke={sel ? "#3182ce" : "#0d1117"} strokeWidth={sel ? 2.5 : 1.8} />
            <circle cx={CX} cy={cy} r={13} fill={bg} />
            <circle cx={CX} cy={cy} r={5} fill={color} />
            {sel && <circle cx={CX} cy={cy} r={24} fill="none" stroke="#3182ce" strokeWidth={2} strokeDasharray="4,3" />}
            <text x={CX} y={cy + 35} textAnchor="middle" fontSize={9} fontWeight="600" fill="#4a5568">Spare</text>
            <text x={CX} y={cy + 48} textAnchor="middle" fontSize={11} fontWeight="700" fill={color}>{h}%</text>
          </g>
        );
      })()}
    </svg>
  );
}

// ── SetupModal ────────────────────────────────────────────────────────────────

function SetupModal({ existing, onSave, onClose }: {
  existing: VehicleTyreSetup | null;
  onSave: (s: VehicleTyreSetup) => void;
  onClose: () => void;
}) {
  const [count, setCount] = useState(existing?.tyre_count ?? 10);
  const [hasSpare, setHasSpare] = useState(existing?.has_spare ?? true);
  const [maxKm, setMaxKm] = useState(String(existing?.tyres[0]?.max_lifespan_km ?? 80000));

  const save = () => {
    const setup = buildSetup(count, hasSpare, parseInt(maxKm) || 80000);
    if (existing) {
      const map: Record<string, TyreUnit> = {};
      existing.tyres.forEach(t => { map[t.position] = t; });
      setup.tyres = setup.tyres.map(t => map[t.position] ? { ...map[t.position], position: t.position, is_spare: t.is_spare } : t);
      setup.synced_trip_ids = existing.synced_trip_ids;
    }
    onSave(setup);
  };

  const preview = [...genPositions(count), ...(hasSpare ? ["Spare"] : [])];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: 20 }}>
      <div className="card" style={{ width: "100%", maxWidth: 440, position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#888" }}><X size={18} /></button>
        <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>Configure Tyre Layout</h2>
        <p style={{ margin: "0 0 20px", fontSize: 12.5, color: "#888" }}>Set up tyre positions for this vehicle</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={lbl}>Number of Tyres (even numbers only)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {TYRE_COUNTS.map(n => (
                <button key={n} type="button" onClick={() => setCount(n)}
                  style={{ width: 48, height: 40, borderRadius: 8, border: "2px solid", cursor: "pointer", fontWeight: 700, fontSize: 14,
                    borderColor: count === n ? "#1E2D8E" : "#e0e0f0",
                    background: count === n ? "#1E2D8E" : "white",
                    color: count === n ? "white" : "#555" }}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={hasSpare} onChange={e => setHasSpare(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: "#1E2D8E", cursor: "pointer" }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: "#333" }}>Include spare tyre</span>
          </label>

          <div>
            <label style={lbl}>Default Max Lifespan per Tyre (km)</label>
            <input type="number" value={maxKm} min={10000} max={300000} step={5000}
              onChange={e => setMaxKm(e.target.value)} style={inp} />
            <div style={{ fontSize: 11, color: "#aaa", marginTop: 3 }}>Typical: 60,000–100,000 km. Adjustable per tyre.</div>
          </div>

          <div style={{ background: "#f0f4ff", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#1E2D8E", fontWeight: 500, lineHeight: 1.6 }}>
            <strong>{count + (hasSpare ? 1 : 0)} positions:</strong> {preview.join(" · ")}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="button" className="btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={save}>
              {existing ? "Update Layout" : "Setup Tyres"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── EditTyreModal ─────────────────────────────────────────────────────────────

function EditTyreModal({ tyre, onSave, onClose }: {
  tyre: TyreUnit;
  onSave: (t: TyreUnit) => void;
  onClose: () => void;
}) {
  const [t, setT] = useState<TyreUnit>({ ...tyre, pressure_logs: [...(tyre.pressure_logs || [])], issue_logs: [...(tyre.issue_logs || [])] });
  const [newP, setNewP] = useState({ date: todayISO(), psi: "" });
  const [newIssue, setNewIssue] = useState({ date: todayISO(), type: "puncture_minor", health_impact: "5", description: "" });
  const set = (k: keyof TyreUnit, v: any) => setT(p => ({ ...p, [k]: v }));

  const addIssue = () => {
    const impact = parseFloat(newIssue.health_impact) || 0;
    if (impact <= 0) return;
    const kmsToAdd = Math.round((impact / 100) * t.max_lifespan_km);
    const found = ISSUE_TYPES.find(i => i.value === newIssue.type);
    const entry: IssueLog = { date: newIssue.date, type: newIssue.type, label: found?.label ?? newIssue.type, health_impact: impact, description: newIssue.description };
    setT(p => ({
      ...p,
      kms_run: Math.min(p.kms_run + kmsToAdd, p.max_lifespan_km),
      issue_logs: [...(p.issue_logs || []), entry],
    }));
    setNewIssue({ date: todayISO(), type: "puncture_minor", health_impact: "5", description: "" });
  };
  const h = calcHealth(t);
  const { color, bg, label: hlabel } = healthColor(h);
  const pred = predictReplacement(t);

  const addPressure = () => {
    if (!newP.psi) return;
    set("pressure_logs", [...t.pressure_logs, { date: newP.date, psi: parseFloat(newP.psi) }]);
    setNewP({ date: todayISO(), psi: "" });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200, padding: 20 }}>
      <div className="card" style={{ width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#888" }}><X size={18} /></button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <div style={{ padding: "5px 14px", borderRadius: 20, background: bg, color, fontWeight: 800, fontSize: 18 }}>{h}%</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{t.position}</div>
            <div style={{ fontSize: 12, color: "#888" }}>{hlabel} · {t.is_spare ? "Spare" : "Active"}</div>
          </div>
        </div>

        {pred && (
          <div style={{ padding: "7px 12px", background: pred.days < 30 ? "#fce4ec" : "#f0f4ff", borderRadius: 8, fontSize: 12.5, marginBottom: 14, color: pred.days < 30 ? "#c62828" : "#1E2D8E" }}>
            Predicted replacement: ~{pred.days} days ({fmtDate(pred.date)})
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={lbl}>Brand</label>
              <select value={t.brand} onChange={e => set("brand", e.target.value)} style={inp}>
                {TYRE_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Purchase Cost (₹)</label>
              <input type="number" min={0} value={t.cost} onChange={e => set("cost", parseFloat(e.target.value) || 0)} style={inp} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={lbl}>Max Lifespan (km)</label>
              <input type="number" min={10000} step={5000} value={t.max_lifespan_km} onChange={e => set("max_lifespan_km", parseInt(e.target.value) || 80000)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Retread Count</label>
              <input type="number" min={0} max={5} value={t.retread_count} onChange={e => set("retread_count", parseInt(e.target.value) || 0)} style={inp} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={lbl}>Install Date</label>
              <input type="date" value={t.install_date} onChange={e => set("install_date", e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Install Odometer (km)</label>
              <input type="number" min={0} value={t.install_odometer} onChange={e => set("install_odometer", parseFloat(e.target.value) || 0)} style={inp} />
            </div>
          </div>

          <div>
            <label style={lbl}>Total KMs Run on this Tyre</label>
            <input type="number" min={0} value={t.kms_run} onChange={e => set("kms_run", parseFloat(e.target.value) || 0)} style={inp} />
            <div style={{ fontSize: 11, color: "#aaa", marginTop: 3 }}>Auto-updated from trip sync. Adjust manually if needed.</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={lbl}>Last Rotation Date</label>
              <input type="date" value={t.last_rotation_date} onChange={e => set("last_rotation_date", e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Rotation Odometer (km)</label>
              <input type="number" min={0} value={t.last_rotation_odometer} onChange={e => set("last_rotation_odometer", parseFloat(e.target.value) || 0)} style={inp} />
            </div>
          </div>

          {/* Pressure logs */}
          <div style={{ borderTop: "1px solid #f0f0f8", paddingTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 8 }}>Air Pressure Logs (PSI)</div>
            {t.pressure_logs.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
                {[...t.pressure_logs].reverse().slice(0, 6).map((p, ri) => {
                  const origIdx = t.pressure_logs.length - 1 - ri;
                  return (
                    <div key={origIdx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 10px", background: "#f8f9ff", borderRadius: 6, fontSize: 12.5 }}>
                      <span style={{ color: "#888" }}>{fmtDate(p.date)}</span>
                      <span style={{ fontWeight: 700, color: "#1E2D8E" }}>{p.psi} PSI</span>
                      <button onClick={() => set("pressure_logs", t.pressure_logs.filter((_, i) => i !== origIdx))}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", padding: 2 }}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "#ccc", marginBottom: 8 }}>No pressure logs yet.</div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end" }}>
              <div>
                <label style={lbl}>Date</label>
                <input type="date" value={newP.date} onChange={e => setNewP(p => ({ ...p, date: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={lbl}>PSI</label>
                <input type="number" min={0} max={250} placeholder="90" value={newP.psi}
                  onChange={e => setNewP(p => ({ ...p, psi: e.target.value }))} style={inp} />
              </div>
              <button type="button" onClick={addPressure}
                style={{ padding: "8px 14px", background: "#1E2D8E", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                Add
              </button>
            </div>
          </div>

          {/* Issue logs */}
          <div style={{ borderTop: "1px solid #f0f0f8", paddingTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 8 }}>Issue / Damage Log</div>

            {(t.issue_logs || []).length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
                {[...(t.issue_logs || [])].reverse().map((issue, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "#fff3e0", borderRadius: 6, fontSize: 12.5 }}>
                    <div>
                      <span style={{ fontWeight: 700, color: "#e65100" }}>{issue.label}</span>
                      {issue.description && <span style={{ color: "#888", marginLeft: 6 }}>· {issue.description}</span>}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                      <div style={{ fontSize: 11.5, color: "#c62828", fontWeight: 700 }}>−{issue.health_impact}% health</div>
                      <div style={{ fontSize: 10.5, color: "#aaa" }}>{fmtDate(issue.date)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "#ccc", marginBottom: 8 }}>No issues logged yet.</div>
            )}

            {/* Log new issue form */}
            <div style={{ background: "#fff8f0", borderRadius: 8, padding: "12px", border: "1px solid #ffe0b2" }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "#e65100", marginBottom: 10 }}>Log New Issue</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div>
                  <label style={lbl}>Issue Type</label>
                  <select value={newIssue.type}
                    onChange={e => {
                      const found = ISSUE_TYPES.find(i => i.value === e.target.value);
                      setNewIssue(p => ({ ...p, type: e.target.value, health_impact: String(found?.impact ?? 5) }));
                    }} style={inp}>
                    {ISSUE_TYPES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Date</label>
                  <input type="date" value={newIssue.date} onChange={e => setNewIssue(p => ({ ...p, date: e.target.value }))} style={inp} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end" }}>
                <div>
                  <label style={lbl}>Health Impact (%)</label>
                  <input type="number" min={1} max={100} value={newIssue.health_impact}
                    onChange={e => setNewIssue(p => ({ ...p, health_impact: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Description (optional)</label>
                  <input type="text" placeholder="e.g. NH-48 pothole" value={newIssue.description}
                    onChange={e => setNewIssue(p => ({ ...p, description: e.target.value }))} style={inp} />
                </div>
                <button type="button" onClick={addIssue}
                  style={{ padding: "8px 14px", background: "#e65100", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                  Log
                </button>
              </div>
              <div style={{ fontSize: 11, color: "#e65100", marginTop: 7 }}>
                Reduces health by {newIssue.health_impact}% — equivalent to {Math.round(parseFloat(newIssue.health_impact || "0") / 100 * t.max_lifespan_km).toLocaleString("en-IN")} km of wear
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="button" className="btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={() => onSave(t)}>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TyresPage() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<"health" | "logs">("health");
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Health tab state
  const [selVehicleId, setSelVehicleId] = useState("");
  const [setup, setSetup] = useState<VehicleTyreSetup | null>(null);
  const [selectedPos, setSelectedPos] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [editingTyre, setEditingTyre] = useState<TyreUnit | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  // Expense log state
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ ...EMPTY_LOG });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filterVehicle, setFilterVehicle] = useState("");
  const [filterType, setFilterType] = useState("");

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const load = async () => {
    const [l, v] = await Promise.all([tyreService.getAll(), vehicleService.getAll()]);
    setLogs(l.data || []); setVehicles(v.data || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!selVehicleId) { setSetup(null); return; }
    setSetup(getTyreSetup(selVehicleId));
    setSelectedPos(null);
  }, [selVehicleId]);

  // ── Trip sync ───────────────────────────────────────────────────────────────

  const syncTrips = async () => {
    if (!selVehicleId || !setup) return;
    setSyncing(true);
    try {
      const r = await tripService.getAll();
      const newTrips = (r.data || []).filter((trip: any) =>
        trip.vehicle_id === selVehicleId &&
        trip.status === "completed" &&
        trip.distance_km &&
        !setup.synced_trip_ids.includes(trip.id)
      );
      if (newTrips.length === 0) {
        setSyncMsg("All trips already synced — no new km to add.");
      } else {
        const addedKm = newTrips.reduce((s: number, trip: any) => s + parseFloat(trip.distance_km || 0), 0);
        const updated: VehicleTyreSetup = {
          ...setup,
          tyres: setup.tyres.map(ty => ty.is_spare ? ty : { ...ty, kms_run: ty.kms_run + addedKm }),
          synced_trip_ids: [...setup.synced_trip_ids, ...newTrips.map((trip: any) => trip.id)],
        };
        saveTyreSetup(selVehicleId, updated);
        setSetup(updated);
        setSyncMsg(`Synced ${newTrips.length} trip(s) — +${Math.round(addedKm).toLocaleString("en-IN")} km added to ${updated.tyres.filter(ty => !ty.is_spare).length} tyres.`);
      }
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(""), 5000);
    }
  };

  // ── Tyre edit ───────────────────────────────────────────────────────────────

  const saveTyreEdit = (updated: TyreUnit) => {
    if (!setup || !selVehicleId) return;
    const newSetup = { ...setup, tyres: setup.tyres.map(ty => ty.position === updated.position ? updated : ty) };
    saveTyreSetup(selVehicleId, newSetup);
    setSetup(newSetup);
    setEditingTyre(null);
  };

  const saveSetup = (s: VehicleTyreSetup) => {
    saveTyreSetup(selVehicleId, s);
    setSetup(s);
    setShowSetup(false);
  };

  // ── Expense log ─────────────────────────────────────────────────────────────

  const setF = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: any) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      await tyreService.add({
        ...form,
        amount: parseFloat(form.amount),
        tyre_count: parseInt(form.tyre_count) || 1,
        odometer_km: form.odometer_km ? parseFloat(form.odometer_km) : null,
        tyre_brand: form.tyre_brand || null,
        tyre_position: form.tyre_position || null,
        notes: form.notes || null,
      });
      setShowForm(false); setForm({ ...EMPTY_LOG }); load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to save");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    await tyreService.delete(id); load();
  };

  // ── Derived ─────────────────────────────────────────────────────────────────

  const vehicleName = (id: string) => vehicles.find(v => v.id === id)?.registration_number || "—";
  const filtered = logs.filter(l => (!filterVehicle || l.vehicle_id === filterVehicle) && (!filterType || l.tyre_type === filterType));
  const totalSpend = logs.reduce((s, l) => s + parseFloat(l.amount || 0), 0);
  const thisMonth = logs.filter(l => l.date?.slice(0, 7) === todayISO().slice(0, 7)).reduce((s, l) => s + parseFloat(l.amount || 0), 0);
  const insights = setup ? getInsights(setup.tyres) : [];

  const fleetAvgHealth = setup && setup.tyres.length > 0
    ? Math.round(setup.tyres.filter(ty => !ty.is_spare).reduce((s, ty) => s + calcHealth(ty), 0) / setup.tyres.filter(ty => !ty.is_spare).length)
    : null;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      <Header title={t("tyre.title")} subtitle={`${logs.length} expense entries · ₹${totalSpend.toLocaleString("en-IN")} total`} />
      <div style={{ padding: isMobile ? "14px" : "24px 28px" }}>

        {/* Tab switcher */}
        <div style={{ display: "flex", gap: 4, marginBottom: 22, background: "#f0f1fa", borderRadius: 10, padding: 4, width: "fit-content" }}>
          {(["health", "logs"] as const).map(key => (
            <button key={key} onClick={() => setTab(key)}
              style={{ padding: "7px 20px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                background: tab === key ? "white" : "transparent",
                color: tab === key ? "#1E2D8E" : "#888",
                boxShadow: tab === key ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}>
              {key === "health" ? "🔧 Tyre Health" : "📋 Expense Logs"}
            </button>
          ))}
        </div>

        {/* ── TYRE HEALTH TAB ─────────────────────────────────────────────────── */}
        {tab === "health" && (
          <div>
            {/* Vehicle selector bar */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
              <select value={selVehicleId} onChange={e => setSelVehicleId(e.target.value)}
                style={{ flex: "1 1 200px", maxWidth: 260, padding: "8px 12px", border: "1.5px solid var(--border-input)", borderRadius: 8, fontSize: 13.5, background: "var(--bg-card)", color: "var(--text-main)" }}>
                <option value="">— Select a vehicle —</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number} — {v.make} {v.model}</option>)}
              </select>
              {selVehicleId && (
                <>
                  <button onClick={() => setShowSetup(true)}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "none", border: "1.5px solid #e0e0f0", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#555", cursor: "pointer" }}>
                    <Settings size={14} /> {setup ? "Reconfigure" : "Setup Tyres"}
                  </button>
                  {setup && (
                    <button onClick={syncTrips} disabled={syncing}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: syncing ? "#f5f5f5" : "#e8f5e9", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, color: syncing ? "#aaa" : "#2e7d32", cursor: syncing ? "not-allowed" : "pointer" }}>
                      <RotateCcw size={14} /> {syncing ? "Syncing…" : "Sync Trips"}
                    </button>
                  )}
                </>
              )}
            </div>

            {syncMsg && (
              <div style={{ padding: "8px 14px", background: "#e8f5e9", color: "#2e7d32", borderRadius: 8, fontSize: 13, fontWeight: 500, marginBottom: 16 }}>
                ✓ {syncMsg}
              </div>
            )}

            {!selVehicleId ? (
              <div className="card" style={{ textAlign: "center", padding: "52px 20px" }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#eef0fb", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <Circle size={32} color="#1E2D8E" style={{ opacity: 0.5 }} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Select a vehicle to view tyre health</div>
                <div style={{ fontSize: 13, color: "#aaa" }}>Track health, predict replacement, and sync trip distances per vehicle.</div>
              </div>
            ) : !setup ? (
              <div className="card" style={{ textAlign: "center", padding: "52px 20px" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🛞</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>No tyre layout configured</div>
                <div style={{ fontSize: 13, color: "#aaa", marginBottom: 20 }}>Set up the number of tyres to start tracking health, km, and insights.</div>
                <button className="btn-primary" onClick={() => setShowSetup(true)}>
                  <Plus size={14} /> Setup Tyres
                </button>
              </div>
            ) : (
              <div>
                {/* Fleet summary stats */}
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
                  {[
                    { label: "Fleet Avg Health", value: `${fleetAvgHealth}%`, color: healthColor(fleetAvgHealth ?? 0).color },
                    { label: "Tyres Tracked", value: setup.tyres.length, color: "#1E2D8E" },
                    { label: "Need Replacement", value: setup.tyres.filter(ty => calcHealth(ty) < 30).length, color: "#c62828" },
                    { label: "Trips Synced", value: setup.synced_trip_ids.length, color: "#2e7d32" },
                  ].map(s => (
                    <div key={s.label} className="stat-card" style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Insights */}
                {insights.length > 0 && (
                  <div className="card" style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "#333" }}>
                      Smart Insights ({insights.length})
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {insights.map((ins, i) => {
                        const cfg = {
                          critical: { icon: <AlertTriangle size={13} />, color: "#c62828", bg: "#fce4ec" },
                          warning:  { icon: <AlertTriangle size={13} />, color: "#e65100", bg: "#fff3e0" },
                          info:     { icon: <Info size={13} />,          color: "#1565c0", bg: "#e3f2fd" },
                        }[ins.type];
                        return (
                          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "7px 12px", borderRadius: 8, background: cfg.bg, color: cfg.color, fontSize: 12.5 }}>
                            <span style={{ flexShrink: 0, marginTop: 1 }}>{cfg.icon}</span>
                            {ins.msg}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Truck diagram + tyre cards */}
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "auto 1fr", gap: 20, alignItems: "start" }}>

                  {/* Truck diagram */}
                  <div className="card" style={{ minWidth: 240, padding: "20px 16px" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#888", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Tyre Layout — {setup.tyre_count} wheels{setup.has_spare ? " + spare" : ""}
                    </div>
                    <TruckDiagram
                      tyres={setup.tyres}
                      selectedPos={selectedPos}
                      onSelect={ty => { setSelectedPos(ty.position); setEditingTyre(ty); }}
                    />
                    <div style={{ fontSize: 11, color: "#aaa", textAlign: "center", marginTop: 10 }}>
                      Click a tyre to edit
                    </div>
                  </div>

                  {/* Tyre cards */}
                  <div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: 10 }}>
                      {setup.tyres.map(ty => {
                        const h = calcHealth(ty);
                        const { color, bg } = healthColor(h);
                        const pred = predictReplacement(ty);
                        const cpk = ty.kms_run > 0 ? `₹${(ty.cost / ty.kms_run).toFixed(2)}/km` : "—";
                        return (
                          <div key={ty.position}
                            onClick={() => { setSelectedPos(ty.position); setEditingTyre(ty); }}
                            style={{ padding: "14px", borderRadius: 10, background: bg,
                              border: `1.5px solid ${color}44`,
                              cursor: "pointer",
                              outline: selectedPos === ty.position ? `2px solid ${color}` : "none" }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#555", marginBottom: 4 }}>
                              {ty.is_spare ? "🔄 " : ""}{ty.position}
                            </div>
                            <div style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1.1, marginBottom: 2 }}>{h}%</div>
                            <div style={{ height: 5, borderRadius: 3, background: "#e0e0e0", marginBottom: 6 }}>
                              <div style={{ height: "100%", borderRadius: 3, background: color, width: `${h}%`, transition: "width 0.4s" }} />
                            </div>
                            <div style={{ fontSize: 10.5, color: "#666", marginBottom: 2 }}>
                              {ty.kms_run.toLocaleString("en-IN")} / {ty.max_lifespan_km.toLocaleString("en-IN")} km
                            </div>
                            <div style={{ fontSize: 10.5, color: "#888" }}>{ty.brand} · {ty.retread_count}x retread</div>
                            {pred && (
                              <div style={{ fontSize: 10, marginTop: 4, color: pred.days < 30 ? "#c62828" : "#888" }}>
                                Replace in ~{pred.days}d
                              </div>
                            )}
                            <div style={{ fontSize: 10, marginTop: 2, color: "#1E2D8E", fontWeight: 600 }}>{cpk}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── EXPENSE LOGS TAB ────────────────────────────────────────────────── */}
        {tab === "logs" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Total Entries", value: logs.length,                                             color: "#1E2D8E" },
                { label: "Total Spend",   value: `₹${totalSpend.toLocaleString("en-IN")}`,               color: "#2e7d32" },
                { label: "This Month",    value: `₹${thisMonth.toLocaleString("en-IN")}`,                 color: "#0277bd" },
                { label: "New / Repairs", value: `${logs.filter(l => l.tyre_type === "new").length} / ${logs.filter(l => l.tyre_type === "repair").length}`, color: "#e65100" },
              ].map(s => (
                <div key={s.label} className="stat-card" style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div className="card">
              <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "stretch" : "center", marginBottom: 16, gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{t("tyre.title")}</h2>
                <div style={{ display: "flex", gap: 8 }}>
                  <select value={filterVehicle} onChange={e => setFilterVehicle(e.target.value)}
                    style={{ padding: "7px 10px", border: "1.5px solid var(--border-input)", borderRadius: 8, fontSize: 13, background: "var(--bg-subtle)", color: "var(--text-main)" }}>
                    <option value="">All Vehicles</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number}</option>)}
                  </select>
                  <select value={filterType} onChange={e => setFilterType(e.target.value)}
                    style={{ padding: "7px 10px", border: "1.5px solid var(--border-input)", borderRadius: 8, fontSize: 13, background: "var(--bg-subtle)", color: "var(--text-main)" }}>
                    <option value="">All Types</option>
                    {TYRE_TYPES.map(ty => <option key={ty.value} value={ty.value}>{ty.label}</option>)}
                  </select>
                  <button className="btn-primary" onClick={() => { setForm({ ...EMPTY_LOG }); setError(""); setShowForm(true); }} style={{ whiteSpace: "nowrap" }}>
                    <Plus size={15} /> {t("tyre.add")}
                  </button>
                </div>
              </div>

              {loading ? (
                <p style={{ color: "#aaa", textAlign: "center", padding: "32px 0" }}>{t("common.loading")}</p>
              ) : filtered.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 20px" }}>
                  <Circle size={32} color="#1E2D8E" style={{ opacity: 0.3, marginBottom: 12 }} />
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>No expense entries</div>
                  <div style={{ fontSize: 13, color: "#aaa" }}>{filterVehicle || filterType ? "Try clearing filters." : "Log tyre purchases, repairs and maintenance."}</div>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Date</th><th>Vehicle</th><th>Type</th><th>Brand</th>
                      <th>Count</th><th>Position</th><th>Odometer</th><th>Amount</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((l: any) => {
                      const tc = TYPE_COLORS[l.tyre_type] || TYPE_COLORS.new;
                      return (
                        <tr key={l.id}>
                          <td style={{ fontSize: 13 }}>{fmtDate(l.date)}</td>
                          <td style={{ fontWeight: 600, color: "#1E2D8E" }}>{vehicleName(l.vehicle_id)}</td>
                          <td><span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: tc.bg, color: tc.color }}>{TYRE_TYPES.find(ty => ty.value === l.tyre_type)?.label || l.tyre_type}</span></td>
                          <td>{l.tyre_brand || <span style={{ color: "#ccc" }}>—</span>}</td>
                          <td style={{ textAlign: "center" }}>{l.tyre_count}</td>
                          <td style={{ fontSize: 12.5, color: "#666" }}>{l.tyre_position || <span style={{ color: "#ccc" }}>—</span>}</td>
                          <td style={{ fontSize: 12.5, color: "#888" }}>{l.odometer_km ? `${parseFloat(l.odometer_km).toLocaleString("en-IN")} km` : <span style={{ color: "#ccc" }}>—</span>}</td>
                          <td style={{ fontWeight: 700, color: "#1E2D8E" }}>₹{parseFloat(l.amount).toLocaleString("en-IN")}</td>
                          <td>
                            <button onClick={() => handleDelete(l.id)}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", padding: 4 }}
                              onMouseEnter={e => (e.currentTarget.style.color = "#e53935")}
                              onMouseLeave={e => (e.currentTarget.style.color = "#ccc")}>
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showSetup && selVehicleId && (
        <SetupModal existing={setup} onSave={saveSetup} onClose={() => setShowSetup(false)} />
      )}

      {editingTyre && (
        <EditTyreModal tyre={editingTyre} onSave={saveTyreEdit} onClose={() => setEditingTyre(null)} />
      )}

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div className="card" style={{ width: "100%", maxWidth: 480, position: "relative", maxHeight: "90vh", overflowY: "auto" }}>
            <button onClick={() => setShowForm(false)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#888" }}><X size={18} /></button>
            <h2 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 700 }}>{t("tyre.add")}</h2>
            {error && <div style={{ background: "#fce4ec", color: "#b71c1c", padding: "8px 12px", borderRadius: 8, marginBottom: 14, fontSize: 13 }}>{error}</div>}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Vehicle *</label>
                  <select required value={form.vehicle_id} onChange={e => setF("vehicle_id", e.target.value)} style={inp}>
                    <option value="">{t("form.select_vehicle")}</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Date *</label>
                  <input type="date" required value={form.date} onChange={e => setF("date", e.target.value)} style={inp} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Type *</label>
                  <select value={form.tyre_type} onChange={e => setF("tyre_type", e.target.value)} style={inp}>
                    {TYRE_TYPES.map(ty => <option key={ty.value} value={ty.value}>{ty.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Amount (₹) *</label>
                  <input type="number" required min="0" step="0.01" placeholder="12000" value={form.amount} onChange={e => setF("amount", e.target.value)} style={inp} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Brand</label>
                  <select value={form.tyre_brand} onChange={e => setF("tyre_brand", e.target.value)} style={inp}>
                    <option value="">Select brand</option>
                    {TYRE_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Tyre Count</label>
                  <input type="number" min="1" max="20" value={form.tyre_count} onChange={e => setF("tyre_count", e.target.value)} style={inp} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Position</label>
                  <input type="text" placeholder="Front L, Rear R…" value={form.tyre_position} onChange={e => setF("tyre_position", e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Odometer (km)</label>
                  <input type="number" min="0" placeholder="142500" value={form.odometer_km} onChange={e => setF("odometer_km", e.target.value)} style={inp} />
                </div>
              </div>
              <div>
                <label style={lbl}>Notes</label>
                <input type="text" placeholder="Any additional info…" value={form.notes} onChange={e => setF("notes", e.target.value)} style={inp} />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setShowForm(false)}>{t("common.cancel")}</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: "center" }} disabled={saving}>
                  {saving ? t("common.loading") : t("tyre.add")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Style constants ───────────────────────────────────────────────────────────
const lbl: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4,
};
const inp: React.CSSProperties = {
  width: "100%", padding: "8px 12px", border: "1.5px solid var(--border-input)",
  borderRadius: 8, fontSize: 13.5, background: "var(--bg-card)", color: "var(--text-main)",
  boxSizing: "border-box",
};
