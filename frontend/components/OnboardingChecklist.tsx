"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle, Circle, Truck, Users, Route, IndianRupee, ArrowRight } from "lucide-react";

type Step = {
  icon: any;
  title: string;
  desc: string;
  href: string;
  done: boolean;
  cta: string;
};

type Props = {
  userName: string;
  hasVehicles: boolean;
  hasDrivers: boolean;
  hasTrips: boolean;
};

export default function OnboardingChecklist({ userName, hasVehicles, hasDrivers, hasTrips }: Props) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const steps: Step[] = [
    {
      icon: Truck,
      title: "Add your first vehicle",
      desc: "Register your truck with number plate, make and model.",
      href: "/vehicles",
      done: hasVehicles,
      cta: "Add Vehicle",
    },
    {
      icon: Users,
      title: "Add a driver",
      desc: "Add drivers so you can assign them to trips.",
      href: "/drivers",
      done: hasDrivers,
      cta: "Add Driver",
    },
    {
      icon: Route,
      title: "Log your first trip",
      desc: "Record a trip with origin, destination and freight amount.",
      href: "/trips",
      done: hasTrips,
      cta: "Log Trip",
    },
    {
      icon: IndianRupee,
      title: "Track expenses & P&L",
      desc: "Add fuel, tolls and repairs to see real profitability per truck.",
      href: "/trips",
      done: false,
      cta: "View Trips",
    },
  ];

  const completed = steps.filter(s => s.done).length;
  const pct = Math.round((completed / steps.length) * 100);

  return (
    <div style={{ padding: isMobile ? "14px" : "28px" }}>
      {/* Welcome header */}
      <div className="card" style={{
        background: "linear-gradient(135deg, #1E2D8E 0%, #2d3eb5 100%)",
        color: "white", marginBottom: 20, padding: isMobile ? "20px 18px" : "28px",
      }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
          Welcome to FleetSure, {userName}! 👋
        </div>
        <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 20 }}>
          Let's get your fleet set up. Follow the steps below to unlock your dashboard.
        </div>

        {/* Progress bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,0.2)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{
              width: `${pct}%`, height: "100%", borderRadius: 99,
              background: "#F5A623", transition: "width 0.5s ease",
            }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>
            {completed}/{steps.length} done
          </span>
        </div>
      </div>

      {/* Steps */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
        {steps.map((step, i) => (
          <div key={i} className="card" style={{
            display: "flex", gap: 14, alignItems: "flex-start",
            opacity: step.done ? 0.75 : 1,
            border: step.done ? "1px solid #e8f5e9" : "1px solid #e8eaf6",
            background: step.done ? "#f9fffe" : "white",
          }}>
            {/* Step icon */}
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: step.done ? "#e8f5e9" : "#f0f2ff",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <step.icon size={20} color={step.done ? "#2e7d32" : "#1E2D8E"} strokeWidth={1.8} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                {step.done
                  ? <CheckCircle size={14} color="#2e7d32" />
                  : <Circle size={14} color="#ccc" />
                }
                <span style={{ fontSize: 13.5, fontWeight: 700, color: step.done ? "#2e7d32" : "#1a1a2e" }}>
                  {step.title}
                </span>
              </div>
              <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "#888", lineHeight: 1.5 }}>
                {step.desc}
              </p>
              {!step.done && (
                <Link href={step.href}>
                  <button style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "6px 12px", background: "#1E2D8E", color: "white",
                    border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700,
                    cursor: "pointer",
                  }}>
                    {step.cta} <ArrowRight size={12} />
                  </button>
                </Link>
              )}
              {step.done && (
                <span style={{ fontSize: 12, color: "#2e7d32", fontWeight: 600 }}>✓ Completed</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Skip note */}
      <p style={{ marginTop: 16, fontSize: 12, color: "#bbb", textAlign: "center" }}>
        Your dashboard will unlock once you add vehicles and log trips.
      </p>
    </div>
  );
}
