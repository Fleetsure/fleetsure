"use client";
import Header from "@/components/Header";
import { ShieldCheck, Plus } from "lucide-react";

export default function InsurancePage() {
  return (
    <div>
      <Header title="Insurance & Renewals" subtitle="Track insurance, permits, and fitness certificates" />
      <div style={{ padding: "24px 28px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
          {["Total Policies", "Expiring Soon", "Expired", "Active"].map(label => (
            <div key={label} className="stat-card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#1E2D8E" }}>0</div>
              <div style={{ fontSize: 12.5, color: "#888", marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
        <div className="card" style={{ textAlign: "center", padding: "60px 0" }}>
          <ShieldCheck size={48} color="#e8eaf6" style={{ margin: "0 auto 16px", display: "block" }} />
          <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>No insurance records yet</h3>
          <p style={{ margin: "0 0 20px", fontSize: 13.5, color: "#aaa", maxWidth: 380, marginLeft: "auto", marginRight: "auto" }}>
            Add insurance policies, fitness certificates, and permits. Get alerts before they expire.
          </p>
          <button className="btn-primary" style={{ margin: "0 auto" }}><Plus size={15} />Add Insurance Record</button>
        </div>
      </div>
    </div>
  );
}
