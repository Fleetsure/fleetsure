"use client";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { getVehicles, getTrips, getDrivers } from "@/lib/api";
import { Truck, Users, Route, TrendingUp, CheckCircle, ChevronRight } from "lucide-react";
import Link from "next/link";

const GREETING_EMOJIS = ["🚀", "💪", "🌟", "⚡", "🔥", "✨", "🎯", "💼", "🏆", "😎"];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [trips, setTrips]       = useState<any[]>([]);
  const [drivers, setDrivers]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [userName, setUserName] = useState("Fleet Owner");
  const [emoji, setEmoji]       = useState("🚀");

  useEffect(() => {
    // Load user name from localStorage (set in Settings > User Profile)
    const stored = localStorage.getItem("userName");
    if (stored) setUserName(stored);
    // Pick a random emoji once on mount
    setEmoji(GREETING_EMOJIS[Math.floor(Math.random() * GREETING_EMOJIS.length)]);

    // Listen for settings updates in same tab
    const refresh = () => {
      const updated = localStorage.getItem("userName");
      if (updated) setUserName(updated);
    };
    window.addEventListener("orgSettingsUpdated", refresh);
    return () => window.removeEventListener("orgSettingsUpdated", refresh);
  }, []);

  useEffect(() => {
    Promise.all([getVehicles(), getTrips(), getDrivers()])
      .then(([v, t, d]) => { setVehicles(v.data); setTrips(t.data); setDrivers(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activeVehicles = vehicles.filter(v => v.status === "active").length;
  const inTripVehicles = vehicles.filter(v => v.status === "in_trip").length;
  const completedTrips = trips.filter(t => t.status === "completed").length;
  const totalRevenue   = trips.filter(t => t.status === "completed").reduce((s, t) => s + parseFloat(t.freight_amount || 0), 0);
  const availDrivers   = drivers.filter(d => d.status === "available").length;

  const setupSteps = [
    { label: "Add your first vehicle", done: vehicles.length > 0, href: "/vehicles", cta: "Add Vehicle" },
    { label: "Add a driver",           done: drivers.length > 0,  href: "/drivers",  cta: "Add Driver" },
    { label: "Log your first trip",    done: trips.length > 0,    href: "/trips",    cta: "Log Trip" },
  ];

  return (
    <div>
      <Header title={`${getGreeting()}, ${userName} ${emoji}`} subtitle="Here's your fleet overview" />
      <div style={{ padding: "24px 28px" }}>

        {/* Setup Guide */}
        {!setupSteps.every(s => s.done) && (
          <div className="card" style={{ marginBottom: 24, borderLeft: "4px solid #1E2D8E" }}>
            <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: "#1E2D8E" }}>Set up your fleet in 3 steps</h3>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "#888" }}>Complete these once. Daily work becomes one tap.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {setupSteps.map((step, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {step.done
                      ? <CheckCircle size={18} color="#1a7a34" />
                      : <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid #ccc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#aaa", fontWeight: 700 }}>{i+1}</div>
                    }
                    <span style={{ fontSize: 13.5, color: step.done ? "#aaa" : "#1a1a2e", textDecoration: step.done ? "line-through" : "none" }}>{step.label}</span>
                  </div>
                  {!step.done && <Link href={step.href}><button className="btn-primary" style={{ fontSize: 12, padding: "5px 12px" }}>{step.cta}</button></Link>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Total Vehicles", value: vehicles.length, sub: `${activeVehicles} Active · ${inTripVehicles} On Trip`, icon: Truck },
            { label: "Total Drivers",  value: drivers.length,  sub: `${availDrivers} Available`,        icon: Users },
            { label: "Total Trips",    value: trips.length,    sub: `${completedTrips} Completed`,      icon: Route },
            { label: "Revenue",        value: `₹${(totalRevenue/1000).toFixed(1)}K`, sub: "Completed trips", icon: TrendingUp },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "#e8eaf6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <s.icon size={20} color="#1E2D8E" />
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#1a1a2e", lineHeight: 1.1 }}>{loading ? "—" : s.value}</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: "#bbb", marginTop: 1 }}>{s.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Trips */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Recent Trips</h2>
            <Link href="/trips" style={{ fontSize: 13, color: "#1E2D8E", textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>View all <ChevronRight size={14} /></Link>
          </div>
          {trips.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#ccc" }}>
              <Route size={36} style={{ margin: "0 auto 10px", display: "block" }} />
              <p style={{ margin: "0 0 12px", fontSize: 13.5, color: "#aaa" }}>No trips logged yet</p>
              <Link href="/trips"><button className="btn-primary">Log First Trip</button></Link>
            </div>
          ) : (
            <table>
              <thead><tr><th>Route</th><th>Driver</th><th>Date</th><th>Revenue</th><th>Status</th></tr></thead>
              <tbody>
                {trips.slice(0, 5).map((t: any) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>{t.origin} → {t.destination}</td>
                    <td>{t.driver_name}</td>
                    <td>{t.start_date}</td>
                    <td style={{ fontWeight: 600, color: "#1E2D8E" }}>₹{Number(t.freight_amount).toLocaleString("en-IN")}</td>
                    <td><span className={`badge badge-${t.status}`}>{t.status.replace("_", " ")}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
