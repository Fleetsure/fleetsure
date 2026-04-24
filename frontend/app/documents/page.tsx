"use client";
import Header from "@/components/Header";
import { FileText, Upload } from "lucide-react";

export default function DocumentsPage() {
  return (
    <div>
      <Header title="Documents" subtitle="All vehicle and fleet documents in one place" />
      <div style={{ padding: "24px 28px" }}>
        <div className="card" style={{ textAlign: "center", padding: "60px 0" }}>
          <FileText size={48} color="#e8eaf6" style={{ margin: "0 auto 16px", display: "block" }} />
          <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>No documents uploaded yet</h3>
          <p style={{ margin: "0 0 20px", fontSize: 13.5, color: "#aaa", maxWidth: 380, marginLeft: "auto", marginRight: "auto" }}>
            Upload RC books, insurance papers, permits, and PUC certificates. Access them anytime.
          </p>
          <button className="btn-primary" style={{ margin: "0 auto" }}><Upload size={15} />Upload Document</button>
        </div>
      </div>
    </div>
  );
}
