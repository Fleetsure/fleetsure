"use client";
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { CreditCard, Link2 } from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";

export default function FASTagPage() {
  const isMobile = useIsMobile();

  return (
    <div>
      <Header title="FASTag Management" subtitle="Track FASTag balances and transactions" />
      <div style={{ padding: isMobile ? "14px" : "24px 28px" }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: isMobile ? 10 : 14, marginBottom: isMobile ? 16 : 24 }}>
          {["Linked Vehicles", "Total Balance", "Low Balance", "Total Recharged"].map(label => (
            <div key={label} className="stat-card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#1E2D8E" }}>0</div>
              <div style={{ fontSize: 12.5, color: "#888", marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>

        <div className="card" style={{ textAlign: "center", padding: "60px 0" }}>
          <CreditCard size={48} color="#e8eaf6" style={{ margin: "0 auto 16px", display: "block" }} />
          <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: "#1a1a2e" }}>No FASTags linked yet</h3>
          <p style={{ margin: "0 0 20px", fontSize: 13.5, color: "#aaa", maxWidth: 360, marginLeft: "auto", marginRight: "auto" }}>
            Link your vehicle FASTags to track balances, get low-balance alerts, and view transaction history.
          </p>
          <button className="btn-primary" style={{ margin: "0 auto" }}>
            <Link2 size={15} /> Link Your First FASTag
          </button>
          <p style={{ margin: "16px 0 0", fontSize: 12, color: "#ccc" }}>FASTag integration coming soon via NETC / bank APIs</p>
        </div>
      </div>
    </div>
  );
}
