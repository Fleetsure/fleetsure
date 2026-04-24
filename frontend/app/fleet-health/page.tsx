"use client";
import Header from "@/components/Header";
import { HeartPulse, FileText, Bell, Wrench } from "lucide-react";

export default function FleetHealthPage() {
  return (
    <div>
      <Header title="Fleet Health" subtitle="Documents, alerts, and repair logs in one place" />
      <div style={{ padding: "24px 28px" }}>

        {/* Health Score */}
        <div className="card" style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#e8eaf6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: "#1E2D8E" }}>—</span>
          </div>
          <div>
            <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>Fleet Health Score</h3>
            <p style={{ margin: 0, fontSize: 13.5, color: "#888" }}>Add vehicles and upload documents to see your fleet health score.</p>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 32 }}>
            {["Documents", "Alerts", "Repairs"].map(l => (
              <div key={l} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#1E2D8E" }}>0</div>
                <div style={{ fontSize: 12, color: "#aaa" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs placeholder */}
        <div className="card">
          <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid #f0f0f5", paddingBottom: 12 }}>
            {["Documents", "Alerts", "Repairs"].map((t, i) => (
              <button key={t} style={{ padding: "6px 16px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 600, background: i === 0 ? "#e8eaf6" : "none", color: i === 0 ? "#1E2D8E" : "#888" }}>{t}</button>
            ))}
            <button className="btn-primary" style={{ marginLeft: "auto", fontSize: 12, padding: "6px 12px" }}>+ Add</button>
          </div>
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <FileText size={36} color="#ddd" style={{ margin: "0 auto 10px", display: "block" }} />
            <p style={{ color: "#aaa", fontSize: 13.5, margin: 0 }}>No documents tracked yet. Add RC, insurance, permits for each vehicle.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
