"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, Truck, ChevronRight, Calendar } from "lucide-react";
import { useDriverAuth } from "@/lib/driverAuth";
import { driverPortalService, DriverTrip } from "@/lib/services/driverPortalService";

const PRIMARY = "#1E2D8E";
const GREEN   = "#059669";

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  planned:     { label: "Planned",     bg: "#EEF0FB", color: PRIMARY  },
  in_progress: { label: "In Progress", bg: "#DCFCE7", color: GREEN    },
  completed:   { label: "Completed",   bg: "#F1F5F9", color: "#64748B" },
  cancelled:   { label: "Cancelled",   bg: "#FEE2E2", color: "#991B1B" },
};

function TripCard({ trip }: { trip: DriverTrip }) {
  const meta = STATUS_META[trip.status] ?? STATUS_META.planned;
  return (
    <Link href={`/driver/trips/${trip.id}`} style={{ textDecoration: "none" }}>
      <div style={{ background: "white", borderRadius: 14, padding: "16px", border: trip.status === "in_progress" ? `2px solid ${GREEN}` : "1.5px solid #E2E8F0", boxShadow: trip.status === "in_progress" ? `0 2px 12px ${GREEN}18` : "none" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Truck size={16} color={meta.color} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: meta.color }}>{meta.label.toUpperCase()}</div>
              <div style={{ fontSize: 11, color: "#94A3B8" }}>{trip.vehicles?.registration_number ?? "—"}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#0F172A" }}>{fmt(trip.freight_amount)}</div>
            <ChevronRight size={14} color="#94A3B8" />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <MapPin size={13} color="#64748B" />
          <span style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{trip.origin}</span>
          <span style={{ color: "#CBD5E1" }}>→</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{trip.destination}</span>
        </div>

        <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#64748B" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Calendar size={11} /> {trip.start_date}
          </div>
          {trip.material && <div>{trip.material}{trip.weight_tonnes ? ` · ${trip.weight_tonnes}T` : ""}</div>}
          {trip.distance_km && <div>{trip.distance_km} km</div>}
        </div>

        {trip.driver_advance != null && trip.driver_advance > 0 && (
          <div style={{ marginTop: 10, padding: "6px 10px", background: "#FFF7ED", borderRadius: 6, fontSize: 12, color: "#92400E", fontWeight: 600, display: "inline-block", border: "1px solid #FDE68A" }}>
            Advance: {fmt(trip.driver_advance)}
          </div>
        )}
      </div>
    </Link>
  );
}

export default function DriverTripsPage() {
  const { driver } = useDriverAuth();
  const [trips,   setTrips]   = useState<DriverTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [tab,     setTab]     = useState<"active" | "planned">("active");

  useEffect(() => {
    if (!driver) { setLoading(false); return; }
    setError(null);
    driverPortalService.getActiveTrips(driver.id).then(r => {
      if (r.success) {
        setTrips(r.data ?? []);
      } else {
        setError(r.error ?? "Failed to load trips. Please try again.");
      }
      setLoading(false);
    });
  }, [driver]);

  const active  = trips.filter(t => t.status === "in_progress");
  const planned = trips.filter(t => t.status === "planned");
  const shown   = tab === "active" ? active : planned;

  return (
    <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
      <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#0F172A", letterSpacing: "-0.4px" }}>My Trips</h1>

      {/* Tabs */}
      <div style={{ display: "flex", background: "white", borderRadius: 10, padding: 4, border: "1.5px solid #E2E8F0", gap: 4 }}>
        {([["active", "In Progress", active.length], ["planned", "Upcoming", planned.length]] as const).map(([key, label, count]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ flex: 1, padding: "9px 8px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13,
              background: tab === key ? PRIMARY : "transparent",
              color: tab === key ? "white" : "#64748B" }}>
            {label} {count > 0 && <span style={{ background: tab === key ? "rgba(255,255,255,0.25)" : "#E2E8F0", borderRadius: 10, padding: "1px 7px", fontSize: 11, marginLeft: 4 }}>{count}</span>}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#94A3B8" }}>Loading trips…</div>
      )}

      {error && (
        <div style={{ background: "#FEE2E2", border: "1px solid #FCA5A5", borderRadius: 12, padding: "14px 16px", fontSize: 13, color: "#991B1B", fontWeight: 500 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {shown.map(trip => <TripCard key={trip.id} trip={trip} />)}
      </div>

      {!loading && shown.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 24px", background: "white", borderRadius: 14, border: "1.5px solid #E2E8F0" }}>
          <Truck size={36} color="#C7D2FE" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 14, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
            {tab === "active" ? "No active trips" : "No upcoming trips"}
          </div>
          <div style={{ fontSize: 12, color: "#64748B" }}>
            {tab === "active" ? "Start a planned trip to see it here." : "Your manager will assign upcoming trips."}
          </div>
        </div>
      )}
    </div>
  );
}
