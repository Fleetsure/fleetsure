"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, ChevronRight, MapPin, TrendingDown, TrendingUp, IndianRupee } from "lucide-react";
import { useDriverAuth } from "@/lib/driverAuth";
import { driverPortalService, DriverTrip } from "@/lib/services/driverPortalService";

const PRIMARY = "#1E2D8E";
const GREEN   = "#059669";
const RED     = "#DC2626";

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function PaymentBadge({ type }: { type: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    advance:    { bg: "#EEF0FB", color: PRIMARY  },
    salary:     { bg: "#DCFCE7", color: GREEN    },
    settlement: { bg: "#DCFCE7", color: GREEN    },
    deduction:  { bg: "#FEE2E2", color: RED      },
    bonus:      { bg: "#FFFBEB", color: "#92400E" },
  };
  const m = map[type] ?? { bg: "#F1F5F9", color: "#64748B" };
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: m.bg, color: m.color, textTransform: "uppercase" }}>
      {type}
    </span>
  );
}

export default function HistoryPage() {
  const { driver } = useDriverAuth();
  const [trips,    setTrips]    = useState<DriverTrip[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState<"trips" | "payments">("trips");

  useEffect(() => {
    if (!driver) return;
    Promise.all([
      driverPortalService.getCompletedTrips(),
      driverPortalService.getPayments(driver.id),
    ]).then(([tr, pr]) => {
      if (tr.success && tr.data) setTrips(tr.data);
      if (pr.success && pr.data) setPayments(pr.data);
      setLoading(false);
    });
  }, [driver]);

  const totalFreight  = trips.reduce((s, t) => s + t.freight_amount, 0);
  const totalAdvance  = trips.reduce((s, t) => s + (t.driver_advance ?? 0), 0);
  const totalReceived = payments.filter(p => ["salary","settlement","bonus","advance"].includes(p.type)).reduce((s, p) => s + Number(p.amount), 0);
  const totalDeducted = payments.filter(p => p.type === "deduction").reduce((s, p) => s + Number(p.amount), 0);
  const netBalance    = totalReceived - totalDeducted;

  return (
    <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
      <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#0F172A" }}>History</h1>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ background: "white", borderRadius: 12, padding: "14px", border: "1.5px solid #E2E8F0" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Trips Done</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: PRIMARY, marginTop: 4 }}>{trips.length}</div>
        </div>
        <div style={{ background: "white", borderRadius: 12, padding: "14px", border: "1.5px solid #E2E8F0" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Advance Taken</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: AMBER, marginTop: 4 }}>{fmt(totalAdvance)}</div>
        </div>
        <div style={{ background: "white", borderRadius: 12, padding: "14px", border: "1.5px solid #E2E8F0" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Received</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: GREEN, marginTop: 4 }}>{fmt(totalReceived)}</div>
        </div>
        <div style={{ background: "white", borderRadius: 12, padding: "14px", border: "1.5px solid #E2E8F0" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Net Balance</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: netBalance >= 0 ? GREEN : RED, marginTop: 4 }}>
            {netBalance >= 0 ? "+" : ""}{fmt(netBalance)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", background: "white", borderRadius: 10, padding: 4, border: "1.5px solid #E2E8F0", gap: 4 }}>
        {([["trips", "Trip History", trips.length], ["payments", "Payments", payments.length]] as const).map(([key, label, count]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ flex: 1, padding: "9px 8px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13,
              background: tab === key ? PRIMARY : "transparent", color: tab === key ? "white" : "#64748B" }}>
            {label} {count > 0 && <span style={{ background: tab === key ? "rgba(255,255,255,0.25)" : "#E2E8F0", borderRadius: 10, padding: "1px 7px", fontSize: 11, marginLeft: 4 }}>{count}</span>}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: "32px", color: "#94A3B8" }}>Loading…</div>}

      {/* Trip history */}
      {tab === "trips" && !loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {trips.map(trip => (
            <Link key={trip.id} href={`/driver/trips/${trip.id}`} style={{ textDecoration: "none" }}>
              <div style={{ background: "white", borderRadius: 12, padding: "14px 16px", border: "1.5px solid #E2E8F0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{trip.origin} → {trip.destination}</div>
                    <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                      {trip.start_date}{trip.end_date ? ` → ${trip.end_date}` : ""} · {trip.vehicles?.registration_number ?? "—"}
                    </div>
                  </div>
                  <ChevronRight size={14} color="#94A3B8" />
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 700, color: GREEN }}>
                    <TrendingUp size={13} /> {fmt(trip.freight_amount)}
                  </div>
                  {(trip.driver_advance ?? 0) > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#92400E" }}>
                      <IndianRupee size={12} /> Advance: {fmt(trip.driver_advance!)}
                    </div>
                  )}
                  {trip.distance_km && <div style={{ fontSize: 12, color: "#94A3B8" }}>{trip.distance_km} km</div>}
                </div>
              </div>
            </Link>
          ))}
          {trips.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 24px", background: "white", borderRadius: 14, border: "1.5px solid #E2E8F0" }}>
              <Clock size={36} color="#C7D2FE" style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: "#334155" }}>No completed trips yet</div>
            </div>
          )}
        </div>
      )}

      {/* Payment history */}
      {tab === "payments" && !loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {payments.map((p: any) => {
            const isCredit = ["salary", "settlement", "bonus", "advance"].includes(p.type);
            return (
              <div key={p.id} style={{ background: "white", borderRadius: 12, padding: "14px 16px", border: "1.5px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <PaymentBadge type={p.type} />
                    <span style={{ fontSize: 12, color: "#94A3B8" }}>{p.date}</span>
                  </div>
                  {p.notes && <div style={{ fontSize: 12, color: "#64748B" }}>{p.notes}</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 16, fontWeight: 800, color: isCredit ? GREEN : RED }}>
                  {isCredit ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {fmt(Number(p.amount))}
                </div>
              </div>
            );
          })}
          {payments.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 24px", background: "white", borderRadius: 14, border: "1.5px solid #E2E8F0" }}>
              <IndianRupee size={36} color="#C7D2FE" style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: "#334155" }}>No payment records</div>
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>Advances and payments will appear here.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const AMBER = "#D97706";
