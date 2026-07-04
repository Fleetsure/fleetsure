"use client";
import { useEffect, useState } from "react";
import { useTeamAuth } from "@/lib/teamAuth";
import { teamService } from "@/lib/services/teamService";
import { Route, Users, Truck, AlertTriangle, ChevronRight } from "lucide-react";
import Link from "next/link";
import { TRIP_STATUS_COLOR as STATUS_COLOR, TRIP_STATUS_BG as STATUS_BG } from "@/lib/constants/tripStatus";

export default function ManagerDashboard() {
  const { member } = useTeamAuth();
  const [trips, setTrips]   = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [issues, setIssues]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      teamService.getTrips(),
      teamService.getDrivers(),
      teamService.getVehicles(),
      teamService.getVehicleIssues(),
    ]).then(([t, d, v, i]) => {
      setTrips(t.data  ?? []);
      setDrivers(d.data ?? []);
      setVehicles(v.data ?? []);
      setIssues(i.data  ?? []);
      setLoading(false);
    });
  }, []);

  const activeTrips  = trips.filter(t => t.status === "in_progress");
  const openIssues   = issues.filter(i => i.status !== "resolved");
  const recentTrips  = [...trips].slice(0, 8);

  const stats = [
    { label: "Active Trips",   value: activeTrips.length,  icon: Route,       color: "#1565c0", bg: "#e3f2fd" },
    { label: "Total Drivers",  value: drivers.length,       icon: Users,       color: "#2e7d32", bg: "#e8f5e9" },
    { label: "Fleet Size",     value: vehicles.length,      icon: Truck,       color: "#7b1fa2", bg: "#f3e5f5" },
    { label: "Open Issues",    value: openIssues.length,    icon: AlertTriangle, color: openIssues.length > 0 ? "#c62828" : "#555", bg: openIssues.length > 0 ? "#ffebee" : "#f5f5f5" },
  ];

  return (
    <div style={{ padding: "28px 32px" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#1a1a2e" }}>
          Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {member?.name?.split(" ")[0]}
        </div>
        <div style={{ fontSize: 14, color: "#888", marginTop: 4 }}>
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: "white", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
              <s.icon size={18} color={s.color} />
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#1a1a2e" }}>{loading ? "—" : s.value}</div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
        {/* Recent trips */}
        <div style={{ background: "white", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <div style={{ padding: "18px 20px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f0f0f8" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e" }}>Recent Trips</span>
            <Link href="/manager/trips" style={{ fontSize: 12, color: "#1E2D8E", textDecoration: "none", fontWeight: 600 }}>View all</Link>
          </div>
          {loading ? (
            <div style={{ padding: "32px 20px", color: "#aaa", fontSize: 14 }}>Loading...</div>
          ) : recentTrips.length === 0 ? (
            <div style={{ padding: "32px 20px", color: "#aaa", fontSize: 14 }}>No trips yet.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8f8ff" }}>
                  {["Route", "Vehicle", "Driver", "Freight", "Status"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentTrips.map((t, i) => (
                  <tr key={t.id} style={{ borderTop: i > 0 ? "1px solid #f0f0f8" : "none" }}>
                    <td style={{ padding: "11px 16px", fontSize: 13, color: "#1a1a2e", fontWeight: 500 }}>
                      {t.origin} → {t.destination}
                    </td>
                    <td style={{ padding: "11px 16px", fontSize: 12, color: "#555" }}>
                      {t.vehicles?.registration_number || "—"}
                    </td>
                    <td style={{ padding: "11px 16px", fontSize: 12, color: "#555" }}>
                      {t.drivers?.name || "—"}
                    </td>
                    <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 600, color: "#2e7d32" }}>
                      ₹{Number(t.freight_amount || 0).toLocaleString("en-IN")}
                    </td>
                    <td style={{ padding: "11px 16px" }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 8,
                        background: STATUS_BG[t.status] || "#f5f5f5",
                        color: STATUS_COLOR[t.status] || "#555",
                        textTransform: "capitalize",
                      }}>
                        {t.status?.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Open issues */}
        <div style={{ background: "white", borderRadius: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <div style={{ padding: "18px 20px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f0f0f8" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e" }}>Open Issues</span>
            <Link href="/manager/issues" style={{ fontSize: 12, color: "#1E2D8E", textDecoration: "none", fontWeight: 600 }}>View all</Link>
          </div>
          {loading ? (
            <div style={{ padding: "24px 20px", color: "#aaa", fontSize: 14 }}>Loading...</div>
          ) : openIssues.length === 0 ? (
            <div style={{ padding: "24px 20px", textAlign: "center" }}>
              <AlertTriangle size={28} color="#ddd" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 13, color: "#aaa" }}>No open issues</div>
            </div>
          ) : (
            <div style={{ padding: "8px 0" }}>
              {openIssues.slice(0, 6).map(issue => {
                const sev = issue.severity;
                const sevColor = sev === "critical" ? "#c62828" : sev === "high" ? "#e65100" : sev === "medium" ? "#f57c00" : "#555";
                return (
                  <div key={issue.id} style={{ padding: "10px 20px", borderBottom: "1px solid #f9f9ff", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: sevColor, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {issue.issue_type}
                      </div>
                      <div style={{ fontSize: 11, color: "#888" }}>{issue.vehicles?.registration_number || "—"} · {issue.drivers?.name || "—"}</div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: sevColor, textTransform: "capitalize", flexShrink: 0 }}>{sev}</span>
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
