"use client";
import { useState, useEffect } from "react";
import { Truck, CheckCircle } from "lucide-react";
import { authService } from "@/lib/services/authService";
import { useIsMobile } from "@/hooks/useIsMobile";

// ─── Billing & Subscriptions ──────────────────────────────────────────────────
const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 799,
    trucks: "Up to 5 trucks",
    color: "#1E2D8E",
    bg: "#eef0fb",
    border: "#c5caf5",
    features: [
      "Vehicle & driver management",
      "Trip sheet & expense logging",
      "Compliance date tracking",
      "Basic P&L per trip",
      "Data export (Excel / CSV)",
      "Email support",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    price: 1999,
    trucks: "6 – 20 trucks",
    color: "#1565c0",
    bg: "#e3f2fd",
    border: "#90caf9",
    popular: true,
    features: [
      "Everything in Starter",
      "Monthly P&L report per truck",
      "Driver payment ledger",
      "Fuel theft detection (km/L analysis)",
      "Compliance alerts (SMS / WhatsApp)",
      "Priority support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 3999,
    trucks: "21 – 50 trucks",
    color: "#6a1b9a",
    bg: "#f3e5f5",
    border: "#ce93d8",
    features: [
      "Everything in Growth",
      "WhatsApp trip sheet sharing",
      "Customer / party ledger",
      "Accounts receivable tracker",
      "Multi-user access with roles",
      "Dedicated account manager",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: null,
    trucks: "50+ trucks",
    color: "#2e7d32",
    bg: "#e8f5e9",
    border: "#a5d6a7",
    features: [
      "Everything in Pro",
      "Custom integrations (GPS, ERP)",
      "SLA-backed uptime guarantee",
      "Bulk data migration support",
      "Custom reporting & dashboards",
      "On-site onboarding",
    ],
  },
];

export default function BillingSettings() {
  const [hoveredPlan, setHoveredPlan]   = useState<string | null>(null);
  const [upgrading, setUpgrading]       = useState<string | null>(null);
  const [billingStatus, setBillingStatus] = useState<any>(null);
  const [error, setError]               = useState("");
  const isMobile = useIsMobile();


  useEffect(() => {
    authService.getBillingStatus()
      .then(r => { if (r.success && r.data) setBillingStatus(r.data); })
      .catch(() => {});
  }, []);

  const handleUpgrade = (_planId: string) => {
    const msg = encodeURIComponent("Hi, I'm interested in upgrading my FleetSure plan. Please share more details.");
    window.open(`https://wa.me/919606462535?text=${msg}`, "_blank");
  };

  const currentPlan = billingStatus?.plan || "trial";
  const daysLeft    = billingStatus?.days_left;
  const status      = billingStatus?.status || "trial";

  const bannerText = status === "active"
    ? `${billingStatus?.plan_name} Plan - Active`
    : status === "cancelled"
    ? "Subscription Cancelled - Access until period end"
    : status === "past_due"
    ? "Payment Overdue - Please update payment method"
    : status === "created"
    ? daysLeft != null
      ? `Free Trial - ${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining (payment pending)`
      : "Free Trial - Payment pending"
    : daysLeft != null
    ? `Free Trial - ${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining`
    : "Free Trial - Explore all features. Upgrade anytime.";

  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700 }}>Billing & Subscriptions</h2>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--text-muted)" }}>
        Choose the plan that fits your fleet size. All plans include a 60-day free trial, no credit card required.
      </p>

      {/* Current plan banner */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "13px 18px", borderRadius: 12, marginBottom: 24,
        background: status === "past_due"
          ? "linear-gradient(135deg, #b71c1c 0%, #e53935 100%)"
          : "linear-gradient(135deg, #1E2D8E 0%, #3949ab 100%)",
        color: "white",
      }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.7, marginBottom: 2 }}>Current Plan</div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{bannerText}</div>
        </div>
        {status === "active" && (
          <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 8, background: "rgba(255,255,255,0.18)", color: "white" }}>
            ✓ Active
          </span>
        )}
      </div>

      {error && (
        <div style={{ background: "#fce4ec", borderRadius: 8, padding: "10px 14px", color: "#b71c1c", fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Plan cards */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)", gap: isMobile ? 12 : 14, marginBottom: 24 }}>
        {PLANS.map(plan => {
          const isHovered   = hoveredPlan === plan.id;
          const isCurrent   = currentPlan === plan.id;
          const isUpgrading = upgrading === plan.id;

          return (
          <div
            key={plan.id}
            onMouseEnter={() => setHoveredPlan(plan.id)}
            onMouseLeave={() => setHoveredPlan(null)}
            style={{
              border: `2px solid ${isCurrent ? plan.color : isHovered || plan.popular ? plan.color : plan.border}`,
              borderRadius: 14, padding: "18px 16px 16px",
              background: isCurrent ? plan.bg : isHovered ? plan.bg : "var(--bg-card)",
              position: "relative", cursor: "default",
              transform: isHovered && !isCurrent ? "translateY(-6px) scale(1.02)" : "translateY(0) scale(1)",
              boxShadow: isHovered ? `0 16px 40px ${plan.color}33` : plan.popular ? `0 4px 16px ${plan.color}22` : "none",
              transition: "all 0.2s ease",
              display: "flex", flexDirection: "column",
            }}>
            {isCurrent && (
              <div style={{
                position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)",
                background: plan.color, color: "white",
                fontSize: 9.5, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap",
              }}>
                Current Plan
              </div>
            )}
            {!isCurrent && plan.popular && (
              <div style={{
                position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)",
                background: plan.color, color: "white",
                fontSize: 9.5, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap",
              }}>
                Most Popular
              </div>
            )}

            {/* Plan header */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: plan.color, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>
                {plan.name}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 3, marginBottom: 10 }}>
                <Truck size={10} style={{ flexShrink: 0 }} /> {plan.trucks}
              </div>
              {plan.price ? (
                <div>
                  <span style={{ fontSize: 26, fontWeight: 800, color: plan.color }}>₹{plan.price.toLocaleString("en-IN")}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}> /mo</span>
                </div>
              ) : (
                <span style={{ fontSize: 20, fontWeight: 800, color: plan.color }}>Custom</span>
              )}
            </div>
            <div style={{ height: 1, background: `${plan.color}22`, marginBottom: 14 }} />

            {/* Features */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16, flex: 1 }}>
              {plan.features.map(f => (
                <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 11.5, color: "var(--text-main)", lineHeight: 1.4 }}>
                  <CheckCircle size={12} color={plan.color} style={{ flexShrink: 0, marginTop: 1 }} />
                  {f}
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={() => !isCurrent && handleUpgrade(plan.id)}
              disabled={isCurrent || isUpgrading}
              style={{
                width: "100%", padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 700,
                border: `1.5px solid ${plan.color}`,
                background: isCurrent ? `${plan.color}22` : isHovered || plan.popular ? plan.color : "transparent",
                color: isCurrent ? plan.color : isHovered || plan.popular ? "white" : plan.color,
                cursor: isCurrent ? "default" : "pointer",
                transition: "all 0.2s ease",
                opacity: isUpgrading ? 0.7 : 1,
              }}>
              {isCurrent ? "Current Plan" : isUpgrading ? "Opening…" : plan.price ? `Upgrade to ${plan.name}` : "Contact Us"}
            </button>
          </div>
          );
        })}
      </div>

      {/* FAQ strip */}
      <div style={{ borderRadius: 12, background: "var(--bg-subtle)", border: "1px solid var(--border)", padding: "18px 20px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
          Common Questions
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 12 : "12px 24px" }}>
          {[
            { q: "Is billing per truck or per fleet?", a: "Per fleet, one flat price regardless of how many trucks you manage within the plan limit." },
            { q: "Can I change plans later?", a: "Yes. Upgrade or downgrade anytime. Prorated billing will be applied." },
            { q: "What payment methods are accepted?", a: "UPI, cards, net banking via Razorpay. GST invoice provided automatically." },
            { q: "What happens after the free trial?", a: "You'll be prompted to pick a plan. Your data is never deleted. We give you 7 days grace period." },
          ].map(item => (
            <div key={item.q}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-main)", marginBottom: 3 }}>{item.q}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>{item.a}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
