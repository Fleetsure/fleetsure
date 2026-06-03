"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, Truck, Plus, AlertTriangle, Clock, ChevronRight, CheckCircle2 } from "lucide-react";
import { useDriverAuth } from "@/lib/driverAuth";
import { driverPortalService, DriverTrip } from "@/lib/services/driverPortalService";

const PRIMARY = "#1E2D8E";
const GREEN   = "#059669";
const AMBER   = "#D97706";

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function statusColor(s: string) {
  if (s === "in_progress") return { bg: "#DCFCE7", text: GREEN, label: "In Progress" };
  if (s === "planned")     return { bg: "#EEF0FB", text: PRIMARY, label: "Planned" };
  return { bg: "#F1F5F9", text: "#64748B", label: s };
}

export default function DriverDashboard() {
  const { driver } = useDriverAuth();
  const [trips,   setTrips]   = useState<DriverTrip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!driver) return;
    driverPortalService.getActiveTrips(driver.id).then(r => {
      if (r.success && r.data) setTrips(r.data);
      setLoading(false);
    });
  }, [driver]);

  const activeTrip  = trips.find(t => t.status === "in_progress");
  const plannedTrips = trips.filter(t => t.status === "planned");
  const totalAdvance = trips.reduce((s, t) => s + (t.driver_advance ?? 0), 0);

  return (
    <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Greeting */}
      <div style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, #3749C0 100%)`, borderRadius: 16, padding: "20px 20px", color: "white" }}>
        <div style={{ fontSize: 13, opacity: 0.75, fontWeight: 500, marginBottom: 4 }}>Good day,</div>
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.5px", marginBottom: 16 }}>{driver?.name?.split(" ")[0]} 👋</div>
        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 10, padding: "12px 16px", flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Active Trips</div>
            <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4 }}>{activeTrip ? 1 : 0}</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 10, padding: "12px 16px", flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Advance</div>
            <div style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }}>{fmt(totalAdvance)}</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 10, padding: "12px 16px", flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Upcoming</div>
            <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4 }}>{plannedTrips.length}</div>
          </div>
        </div>
      </div>

      {/* Active trip */}
      {activeTrip && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>Current Trip</div>
          <Link href={`/driver/trips/${activeTrip.id}`} style={{ textDecoration: "none" }}>
            <div style={{ background: "white", borderRadius: 14, padding: "18px 16px", border: `2px solid ${GREEN}`, boxShadow: `0 4px 16px ${GREEN}20` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Truck size={16} color={GREEN} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: GREEN }}>IN PROGRESS</div>
                    <div style={{ fontSize: 11, color: "#64748B" }}>{activeTrip.vehicles?.registration_number}</div>
                  </div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#0F172A" }}>{fmt(activeTrip.freight_amount)}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <MapPin size={14} color="#64748B" />
                <span style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{activeTrip.origin}</span>
                <span style={{ color: "#94A3B8", fontSize: 14 }}>→</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{activeTrip.destination}</span>
              </div>
              {activeTrip.material && (
                <div style={{ fontSize: 12, color: "#64748B" }}>Load: {activeTrip.material}{activeTrip.weight_tonnes ? ` · ${activeTrip.weight_tonnes}T` : ""}</div>
              )}
              <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                <div style={{ flex: 1, textAlign: "center", padding: "8px", background: "#F0FDF4", borderRadius: 8, border: "1px solid #BBF7D0", fontSize: 12, fontWeight: 700, color: GREEN }}>
                  + Add Expense
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, color: PRIMARY, fontSize: 13, fontWeight: 700 }}>
                  View <ChevronRight size={14} />
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>Quick Actions</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { href: "/driver/trips",   icon: Truck,        label: "My Trips",     bg: "#EEF0FB", color: PRIMARY  },
            { href: "/driver/issues",  icon: AlertTriangle, label: "Report Issue", bg: "#FEF9C3", color: "#854D0E" },
            { href: "/driver/history", icon: Clock,         label: "Trip History", bg: "#F0FDF4", color: GREEN    },
            activeTrip
              ? { href: `/driver/trips/${activeTrip.id}`, icon: Plus, label: "Log Expense", bg: "#DCFCE7", color: GREEN }
              : { href: "/driver/trips", icon: CheckCircle2, label: "All Trips",   bg: "#EDE9FE", color: "#6D28D9" },
          ].map(({ href, icon: Icon, label, bg, color }) => (
            <Link key={label} href={href} style={{ textDecoration: "none" }}>
              <div style={{ background: "white", borderRadius: 12, padding: "16px 14px", border: "1.5px solid #E2E8F0", display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start" }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={18} color={color} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{label}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Upcoming trips */}
      {plannedTrips.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>Upcoming Trips</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {plannedTrips.slice(0, 3).map(trip => {
              const s = statusColor(trip.status);
              return (
                <Link key={trip.id} href={`/driver/trips/${trip.id}`} style={{ textDecoration: "none" }}>
                  <div style={{ background: "white", borderRadius: 12, padding: "14px 16px", border: "1.5px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{trip.origin} → {trip.destination}</div>
                      <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{trip.start_date} · {trip.vehicles?.registration_number}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ fontSize: 11, padding: "3px 8px", borderRadius: 5, background: s.bg, color: s.text, fontWeight: 700 }}>{s.label}</div>
                      <ChevronRight size={14} color="#94A3B8" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {!loading && trips.length === 0 && (
        <div style={{ background: "white", borderRadius: 14, padding: "40px 24px", textAlign: "center", border: "1.5px solid #E2E8F0" }}>
          <Truck size={40} color="#C7D2FE" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: "#334155", marginBottom: 6 }}>No trips assigned yet</div>
          <div style={{ fontSize: 13, color: "#64748B" }}>Your fleet manager will assign trips to you. Check back soon.</div>
        </div>
      )}
    </div>
  );
}
