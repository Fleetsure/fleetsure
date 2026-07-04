import { useState } from "react";
import { FileDown } from "lucide-react";
import { downloadTripPdf } from "@/lib/tripPdf";

export default function PdfOptionsModal({ trip, detail, vehicles, isMobile, onClose }: {
  trip: any;
  detail: any;
  vehicles: any[];
  isMobile: boolean;
  onClose: () => void;
}) {
  const [showProfit, setShowProfit] = useState(false);
  const [expTypes, setExpTypes] = useState({
    all: true, fuel: false, toll: false, maintenance: false, driver_payment: false, loading: false, other: false,
  });

  const handleDownload = async () => {
    const selected = Object.entries(expTypes).filter(([, v]) => v).map(([k]) => k);
    const vehicleReg = vehicles.find((v: any) => v.id === trip.vehicle_id)?.registration_number || trip.vehicle_id;
    const orgName = (typeof window !== "undefined" && localStorage.getItem("orgName")) || "FleetSure";
    const orgLogo = (typeof window !== "undefined" && localStorage.getItem("orgLogo")) || "";
    try {
      await downloadTripPdf({
        orgName, orgLogo, trip, detail,
        vehicleReg, showProfit,
        expTypes: selected.length > 0 ? selected : ["all"],
      });
      onClose();
    } catch {
      alert("Failed to generate PDF. Please try again.");
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? 12 : 20 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: "white", borderRadius: 16, padding: isMobile ? "20px 16px" : 28, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: "#1a1a2e", marginBottom: 4 }}>Download Trip Sheet PDF</div>
        <div style={{ fontSize: 12.5, color: "#888", marginBottom: 20 }}>{trip.origin} → {trip.destination}</div>

        {/* Expense types */}
        <div style={{ fontWeight: 700, fontSize: 12, color: "#555", marginBottom: 10 }}>Include in PDF</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {[
            { key: "all",            label: "All expenses" },
            { key: "fuel",           label: "Fuel expenses only" },
            { key: "toll",           label: "Toll / FASTag charges" },
            { key: "maintenance",    label: "Maintenance / Repairs" },
            { key: "driver_payment", label: "Driver payments" },
            { key: "loading",        label: "Loading / Unloading" },
            { key: "other",          label: "Other expenses" },
          ].map(opt => (
            <label key={opt.key} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13 }}>
              <input type="checkbox"
                checked={!!(expTypes as any)[opt.key]}
                onChange={e => setExpTypes(p => ({ ...p, [opt.key]: e.target.checked }))}
                style={{ width: 16, height: 16, accentColor: "#1E2D8E" }} />
              {opt.label}
            </label>
          ))}
        </div>

        {/* Show profit toggle */}
        <div style={{ borderTop: "1px solid #f0f0f5", paddingTop: 14, marginBottom: 20 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13 }}>
            <input type="checkbox"
              checked={showProfit}
              onChange={e => setShowProfit(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: "#1E2D8E" }} />
            <div>
              <div style={{ fontWeight: 600 }}>Include net profit section</div>
              <div style={{ fontSize: 11, color: "#aaa" }}>Internal use only — don&apos;t share with customers</div>
            </div>
          </label>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: "10px 0", border: "1px solid #e0e0e0", borderRadius: 8, background: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#555" }}>
            Cancel
          </button>
          <button onClick={handleDownload}
            style={{ flex: 2, padding: "10px 0", border: "none", borderRadius: 8, background: "#1E2D8E", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <FileDown size={14} /> Generate & Download
          </button>
        </div>
      </div>
    </div>
  );
}
