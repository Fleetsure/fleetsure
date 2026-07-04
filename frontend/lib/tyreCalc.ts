import { todayISO } from "./date";

export interface PressureLog { date: string; psi: number; }

export interface IssueLog {
  date: string;
  type: string;
  label: string;
  health_impact: number;
  description: string;
}

export interface TyreUnit {
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

export interface VehicleTyreSetup {
  tyre_count: number;
  has_spare: boolean;
  tyres: TyreUnit[];
  synced_trip_ids: string[];
}

export const TYRE_COUNTS = [4, 6, 8, 10, 12, 14, 16, 18];
export const TYRE_BRANDS = ["MRF", "Apollo", "Bridgestone", "CEAT", "JK Tyre", "Goodyear", "Michelin", "Other"];

export const ISSUE_TYPES = [
  { value: "puncture_minor",  label: "Puncture (minor)",          impact: 5  },
  { value: "puncture_major",  label: "Puncture (major/sidewall)", impact: 15 },
  { value: "blowout",         label: "Blowout",                   impact: 35 },
  { value: "cut_bulge",       label: "Cut / Bulge",               impact: 20 },
  { value: "crack",           label: "Crack / Splitting",         impact: 15 },
  { value: "excessive_wear",  label: "Excessive wear",            impact: 10 },
  { value: "other",           label: "Other damage",              impact: 5  },
];

export function calcHealth(t: TyreUnit): number {
  return Math.max(0, Math.round(100 - (t.kms_run / Math.max(1, t.max_lifespan_km)) * 100));
}

export function healthColor(pct: number) {
  if (pct >= 60) return { color: "#2e7d32", bg: "#e8f5e9", label: "Good" };
  if (pct >= 30) return { color: "#f57f17", bg: "#fffde7", label: "Fair" };
  return { color: "#c62828", bg: "#fce4ec", label: "Critical" };
}

export function genPositions(count: number): string[] {
  const rows = count / 2;
  const out: string[] = [];
  for (let r = 0; r < rows; r++) {
    const name = r === 0 ? "Front" : r === rows - 1 ? "Rear" : `Mid ${r}`;
    out.push(`${name} L`, `${name} R`);
  }
  return out;
}

export function makeDefault(position: string, is_spare: boolean, maxKm: number): TyreUnit {
  return {
    position, is_spare, brand: "MRF", max_lifespan_km: maxKm,
    install_date: todayISO(), install_odometer: 0, kms_run: 0,
    retread_count: 0, last_rotation_date: "", last_rotation_odometer: 0,
    cost: 0, pressure_logs: [], issue_logs: [],
  };
}

export function buildSetup(count: number, hasSpare: boolean, maxKm: number): VehicleTyreSetup {
  const tyres = genPositions(count).map(p => makeDefault(p, false, maxKm));
  if (hasSpare) tyres.push(makeDefault("Spare", true, maxKm));
  return { tyre_count: count, has_spare: hasSpare, tyres, synced_trip_ids: [] };
}

export function predictReplacement(t: TyreUnit): { days: number; date: string } | null {
  if (t.kms_run < 50) return null;
  const daysSince = Math.max(1, Math.floor((Date.now() - new Date(t.install_date).getTime()) / 86400000));
  const avgPerDay = t.kms_run / daysSince;
  const remaining = t.max_lifespan_km - t.kms_run;
  if (remaining <= 0) return { days: 0, date: todayISO() };
  const days = Math.ceil(remaining / avgPerDay);
  const d = new Date(); d.setDate(d.getDate() + days);
  return { days, date: d.toISOString().slice(0, 10) };
}

export type InsightSeverity = "critical" | "warning" | "info";

export function getInsights(tyres: TyreUnit[]): { type: InsightSeverity; msg: string }[] {
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
