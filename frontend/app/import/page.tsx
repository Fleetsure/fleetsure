"use client";
import Header from "@/components/Header";
import { Upload } from "lucide-react";

export default function ImportPage() {
  return (
    <div>
      <Header title="Import Data" subtitle="Bulk import vehicles, drivers, trips from Excel" />
      <div style={{ padding: "40px 28px", textAlign: "center" }}>
        <Upload size={48} color="#e0e0e0" style={{ margin: "0 auto 16px", display: "block" }} />
        <div style={{ fontSize: 16, fontWeight: 700, color: "#555", marginBottom: 8 }}>Coming Soon</div>
        <div style={{ fontSize: 13.5, color: "#aaa", maxWidth: 400, margin: "0 auto" }}>
          Bulk import is being rebuilt. In the meantime, add vehicles, drivers, and trips manually from their respective pages.
        </div>
      </div>
    </div>
  );
}
