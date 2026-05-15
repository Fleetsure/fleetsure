"use client";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { getVehicles, getDrivers } from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";
import { HeartPulse, AlertTriangle, CheckCircle, Clock, Truck, Users, ChevronUp, ChevronDown } from "lucide-react";

type Vehicle = {
  id: string;
  registration_number: string;
  make: string;
  model: string;
  insurance_expiry: string | null;
  fitness_expiry: string | null;
  puc_expiry: string | null;
  permit_expiry: string | null;
  status: string;
};

type DriverRecord = {
  id: string;
  name: string;
  phone: string;
  license_number: string | null;
  license_expiry: string | null;
  transport_validity: string | null;
  status: string;
};

type ComplianceStatus = "expired" | "expiring_soon" | "ok" | "missing";

const CHECKS = [
  { key: "insurance_expiry", label: "Insurance" },
  { key: "fitness_expiry",   label: "Fitness" },
  { key: "puc_expiry",       label: "PUC" },
  { key: "permit_expiry",    label: "Permit" },
] as const;

function getStatus(dateStr: string | null): { status: ComplianceStatus; daysLeft: number | null } {
  if (!dateStr) return { status: "missing", daysLeft: null };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(dateStr);
  const diff = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0)  return { status: "expired",       daysLeft: diff };
  if (diff <= 30) return { status: "expiring_soon", daysLeft: diff };
  return { status: "ok", daysLeft: diff };
}

const STATUS_COLOR: Record<ComplianceStatus, string> = {
  expired:       "#fff0f0",
  expiring_soon: "#fff8e1",
  ok:            "#f0faf4",
  missing:       "#f5f5f5",
};
const STATUS_TEXT_COLOR: Record<ComplianceStatus, string> = {
  expired:       "#c62828",
  expiring_soon: "#e65100",
  ok:            "#2e7d32",
  missing:       "#aaa",
};
const STATUS_BORDER: Record<ComplianceStatus, string> = {
  expired:       "#ffcdd2",
  expiring_soon: "#ffe082",
  ok:            "#c8e6c9",
  missing:       "#e0e0e0",
};

function StatusBadge({ dateStr }: { dateStr: string | null }) {
  const { status, daysLeft } = getStatus(dateStr);
  const label =
    status === "missing"       ? "No date" :
    status === "expired"       ? `${Math.abs(daysLeft!)}d ago` :
    status === "expiring_soon" ? `${daysLeft}d left` :
                                 `${daysLeft}d`;
  return (
    <div style={{
      padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600,
      background: STATUS_COLOR[status], color: STATUS_TEXT_COLOR[status],
      border: `1px solid ${STATUS_BORDER[status]}`, textAlign: "center", whiteSpace: "nowrap",
    }}>
      {label}
    </div>
  );
}

export default function FleetHealthPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers]   = useState<DriverRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortAsc, setSortAsc]     = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    Promise.all([getVehicles(), getDrivers()])
      .then(([v, d]) => { setVehicles(v.data); setDrivers(d.data || []); })
      .finally(() => setLoading(false));
  }, []);

  // Compute per-vehicle compliance
  const rows = vehicles.map(v => {
    const checks = CHECKS.map(c => ({
      ...c,
      dateStr: v[c.key as keyof Vehicle] as string | null,
      ...getStatus(v[c.key as keyof Vehicle] as string | null),
    }));
    const okCount    = checks.filter(c => c.status === "ok").length;
    // Use total checks (4) as denominator — missing dates count against the score
    const score      = checks.some(c => c.status !== "missing")
      ? Math.round((okCount / checks.length) * 100)
      : null;
    const worstStatus: ComplianceStatus =
      checks.some(c => c.status === "expired")       ? "expired" :
      checks.some(c => c.status === "expiring_soon") ? "expiring_soon" :
      checks.some(c => c.status === "ok")            ? "ok" : "missing";
    return { ...v, checks, score, worstStatus };
  });

  // Driver compliance rows
  const DRIVER_CHECKS = [
    { key: "license_expiry",    label: "DL Expiry" },
    { key: "transport_validity", label: "Transport Endorsement" },
  ] as const;

  const driverRows = drivers
    .filter(d => d.status !== "inactive")
    .map(d => {
      const checks = DRIVER_CHECKS.map(c => ({
        ...c,
        dateStr: d[c.key as keyof DriverRecord] as string | null,
        ...getStatus(d[c.key as keyof DriverRecord] as string | null),
      }));
      const worstStatus: ComplianceStatus =
        checks.some(c => c.status === "expired")        ? "expired" :
        checks.some(c => c.status === "expiring_soon")  ? "expiring_soon" :
        checks.some(c => c.status === "ok")             ? "ok" : "missing";
      return { ...d, checks, worstStatus };
    });

  // Fleet-level stats (vehicles + drivers combined)
  const allChecks   = rows.flatMap(r => r.checks);
  const driverAllChecks = driverRows.flatMap(r => r.checks);
  const combinedChecks = [...allChecks, ...driverAllChecks];
  const expired     = combinedChecks.filter(c => c.status === "expired").length;
  const expiringSoon= combinedChecks.filter(c => c.status === "expiring_soon").length;
  const ok          = allChecks.filter(c => c.status === "ok").length;
  const total       = allChecks.filter(c => c.status !== "missing").length;
  const fleetScore  = total ? Math.round((ok / total) * 100) : null;

  const scoreColor =
    fleetScore === null ? "#aaa" :
    fleetScore >= 80    ? "#2e7d32" :
    fleetScore >= 50    ? "#e65100" : "#c62828";

  // Alerts: all expired or expiring_soon items (vehicles + drivers)
  const vehicleAlerts = rows.flatMap(r =>
    r.checks
      .filter(c => c.status === "expired" || c.status === "expiring_soon")
      .map(c => ({ entity: r.registration_number, sub: `${r.make} ${r.model}`, type: "vehicle" as const, ...c }))
  );
  const driverAlerts = driverRows.flatMap(r =>
    r.checks
      .filter(c => c.status === "expired" || c.status === "expiring_soon")
      .map(c => ({ entity: r.name, sub: r.phone, type: "driver" as const, ...c }))
  );
  const alerts = [...vehicleAlerts, ...driverAlerts]
    .sort((a, b) => (a.daysLeft ?? -9999) - (b.daysLeft ?? -9999));

  // Sorting
  const handleSort = (field: string) => {
    if (sortField === field) setSortAsc(a => !a);
    else { setSortField(field); setSortAsc(true); }
  };
  const SortIcon = ({ field }: { field: string }) =>
    sortField === field
      ? (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
      : <span style={{ opacity: 0.3 }}><ChevronDown size={12} /></span>;

  const sorted = [...rows].sort((a, b) => {
    if (!sortField) return 0;
    const checkKey = CHECKS.find(c => c.key === sortField);
    if (checkKey) {
      const da = a.checks.find(c => c.key === sortField)!.daysLeft ?? -9999;
      const db = b.checks.find(c => c.key === sortField)!.daysLeft ?? -9999;
      return sortAsc ? da - db : db - da;
    }
    if (sortField === "score") return sortAsc ? (a.score ?? -1) - (b.score ?? -1) : (b.score ?? -1) - (a.score ?? -1);
    if (sortField === "reg")   return sortAsc ? a.registration_number.localeCompare(b.registration_number) : b.registration_number.localeCompare(a.registration_number);
    return 0;
  });

  if (loading) return (
    <div>
      <Header title="Fleet Health" subtitle="Compliance status across your fleet" />
      <div style={{ padding: "40px 28px", textAlign: "center", color: "#aaa" }}>Loading...</div>
    </div>
  );

  return (
    <div>
      <Header title="Fleet Health" subtitle="Compliance status across your fleet" />
      <div style={{ padding: isMobile ? "14px" : "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Score + Stats */}
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
          {/* Score circle */}
          <div style={{ position: "relative", width: 90, height: 90, flexShrink: 0 }}>
            <svg width="90" height="90" viewBox="0 0 90 90">
              <circle cx="45" cy="45" r="38" fill="none" stroke="#f0f0f5" strokeWidth="8" />
              {fleetScore !== null && (
                <circle cx="45" cy="45" r="38" fill="none" stroke={scoreColor} strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 38}`}
                  strokeDashoffset={`${2 * Math.PI * 38 * (1 - fleetScore / 100)}`}
                  strokeLinecap="round" transform="rotate(-90 45 45)" />
              )}
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>
                {fleetScore !== null ? fleetScore : "—"}
              </span>
              {fleetScore !== null && <span style={{ fontSize: 10, color: "#aaa" }}>/ 100</span>}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2e", marginBottom: 4 }}>Fleet Health Score</div>
            <div style={{ fontSize: 13, color: "#888" }}>
              {vehicles.length === 0 ? "Add vehicles with compliance dates to see your score." :
               fleetScore === null ? "Add compliance dates to your vehicles." :
               fleetScore >= 80 ? "Fleet is mostly compliant. Stay on top of renewals." :
               fleetScore >= 50 ? "Some items need attention." : "Critical compliance issues need immediate action."}
            </div>
          </div>

          <div style={{ marginLeft: isMobile ? 0 : "auto", display: "flex", gap: isMobile ? 16 : 28, flexWrap: "wrap", justifyContent: isMobile ? "flex-start" : undefined }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#c62828" }}>{expired}</div>
              <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>Expired</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#e65100" }}>{expiringSoon}</div>
              <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>Expiring Soon</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#2e7d32" }}>{ok}</div>
              <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>Compliant</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#1E2D8E" }}>{vehicles.length}</div>
              <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>Vehicles</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#1565c0" }}>{drivers.filter(d => d.status !== "inactive").length}</div>
              <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>Drivers</div>
            </div>
          </div>
        </div>

        {/* Alerts banner */}
        {alerts.length > 0 && (
          <div style={{ background: "#fff8e1", border: "1px solid #ffe082", borderRadius: 12, padding: "14px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <AlertTriangle size={16} color="#e65100" />
              <span style={{ fontWeight: 700, fontSize: 13.5, color: "#e65100" }}>
                {alerts.length} compliance {alerts.length === 1 ? "item" : "items"} need attention
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {alerts.map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, flexWrap: "wrap" }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                    background: a.status === "expired" ? "#c62828" : "#e65100"
                  }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: "white", background: a.type === "driver" ? "#1565c0" : "#555", padding: "1px 6px", borderRadius: 4 }}>
                    {a.type === "driver" ? "DRIVER" : "VEHICLE"}
                  </span>
                  <span style={{ fontWeight: 600, color: "#1a1a2e" }}>{a.entity}</span>
                  <span style={{ color: "#888", fontSize: 12 }}>{a.sub}</span>
                  <span style={{ color: "#777" }}>— {a.label}</span>
                  <span style={{
                    marginLeft: "auto", fontWeight: 700,
                    color: a.status === "expired" ? "#c62828" : "#e65100"
                  }}>
                    {a.status === "expired" ? `Expired ${Math.abs(a.daysLeft!)}d ago` : `${a.daysLeft}d left`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Compliance table */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f5", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Vehicle Compliance</div>
              {isMobile && <div style={{ fontSize: 11, color: "#aaa" }}>← Scroll to see all</div>}
            </div>
            {!isMobile && (
              <div style={{ fontSize: 12, color: "#aaa" }}>
                🟢 OK &nbsp; 🟡 Expiring ≤30 days &nbsp; 🔴 Expired &nbsp; ⬜ No date
              </div>
            )}
          </div>

          {vehicles.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <Truck size={40} color="#e0e0e0" style={{ display: "block", margin: "0 auto 12px" }} />
              <p style={{ color: "#aaa", fontSize: 13.5, margin: 0 }}>No vehicles found. Add vehicles first.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#fafafa" }}>
                    {[
                      { label: "Vehicle", field: "reg" },
                      { label: "Insurance", field: "insurance_expiry" },
                      { label: "Fitness Cert", field: "fitness_expiry" },
                      { label: "PUC", field: "puc_expiry" },
                      { label: "Permit", field: "permit_expiry" },
                      { label: "Score", field: "score" },
                    ].map(col => (
                      <th key={col.field}
                        onClick={() => handleSort(col.field)}
                        style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          {col.label} <SortIcon field={col.field} />
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row, i) => (
                    <tr key={row.id} style={{ borderTop: "1px solid #f5f5f5", background: i % 2 === 0 ? "white" : "#fafbff" }}>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: "#1a1a2e" }}>{row.registration_number}</div>
                        <div style={{ fontSize: 12, color: "#aaa" }}>{row.make} {row.model}</div>
                      </td>
                      {row.checks.map(c => (
                        <td key={c.key} style={{ padding: "12px 16px" }}>
                          <StatusBadge dateStr={c.dateStr} />
                          {c.dateStr && (
                            <div style={{ fontSize: 11, color: "#bbb", marginTop: 3, textAlign: "center" }}>
                              {new Date(c.dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                            </div>
                          )}
                        </td>
                      ))}
                      <td style={{ padding: "12px 16px" }}>
                        {row.score !== null ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ flex: 1, height: 6, background: "#f0f0f5", borderRadius: 3, overflow: "hidden" }}>
                              <div style={{ width: `${row.score}%`, height: "100%", borderRadius: 3, background: row.score >= 75 ? "#4caf50" : row.score >= 50 ? "#ff9800" : "#f44336" }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: row.score >= 75 ? "#2e7d32" : row.score >= 50 ? "#e65100" : "#c62828", minWidth: 32 }}>
                              {row.score}%
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: "#ccc" }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Driver License Compliance ──────────────────────── */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f5", display: "flex", alignItems: "center", gap: 10 }}>
            <Users size={16} color="#1565c0" />
            <div style={{ fontWeight: 700, fontSize: 15 }}>Driver License Compliance</div>
          </div>

          {drivers.filter(d => d.status !== "inactive").length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <Users size={36} color="#e0e0e0" style={{ display: "block", margin: "0 auto 10px" }} />
              <p style={{ color: "#aaa", fontSize: 13 }}>No active drivers found.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#fafafa" }}>
                    {["Driver", "License No.", "DL Expiry", "Transport Endorsement", "Status"].map(h => (
                      <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {driverRows.map((d, i) => (
                    <tr key={d.id} style={{ borderTop: "1px solid #f5f5f5", background: i % 2 === 0 ? "white" : "#fafbff" }}>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: "#1a1a2e" }}>{d.name}</div>
                        <div style={{ fontSize: 12, color: "#aaa" }}>{d.phone}</div>
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "#555" }}>
                        {d.license_number || <span style={{ color: "#ccc" }}>—</span>}
                      </td>
                      {d.checks.map(c => (
                        <td key={c.key} style={{ padding: "12px 16px" }}>
                          <StatusBadge dateStr={c.dateStr} />
                          {c.dateStr && (
                            <div style={{ fontSize: 11, color: "#bbb", marginTop: 3, textAlign: "center" }}>
                              {new Date(c.dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                            </div>
                          )}
                        </td>
                      ))}
                      <td style={{ padding: "12px 16px" }}>
                        {d.worstStatus === "expired" ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: "#c62828" }}>
                            <AlertTriangle size={12} /> Expired
                          </span>
                        ) : d.worstStatus === "expiring_soon" ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: "#e65100" }}>
                            <Clock size={12} /> Renew Soon
                          </span>
                        ) : d.worstStatus === "ok" ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: "#2e7d32" }}>
                            <CheckCircle size={12} /> Valid
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: "#ccc" }}>No dates</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
