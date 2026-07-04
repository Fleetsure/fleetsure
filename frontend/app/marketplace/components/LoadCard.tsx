import { MapPin, Package, IndianRupee, Truck, MessageCircle, CheckCircle, ChevronRight } from "lucide-react";
import { fmtDate } from "@/lib/date";
import Badge from "./Badge";

const fmt = (n: number) => "₹" + n.toLocaleString("en-IN");

export default function LoadCard({
  load, isMine, onInterest, onCancel,
}: {
  load: any;
  isMine: boolean;
  onInterest: (load: any) => void;
  onCancel: (id: string) => void;
  currentUserId: string;
}) {
  const alreadyInterested = !!load.my_interest_id;

  const openWhatsApp = () => {
    const phone = load.contact_phone
      ? `91${load.contact_phone.replace(/\D/g, "").replace(/^91/, "")}`
      : "";
    const msg = encodeURIComponent(
      `Hi ${load.contact_name || load.owner_name}, I saw your return load listing on FleetSure — ${load.from_city} → ${load.to_city} on ${fmtDate(load.available_date)}. I'm interested. Can we discuss?`
    );
    const url = phone ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(url, "_blank");
  };

  return (
    <div style={{
      background: "white", border: "1px solid #eee", borderRadius: 12,
      padding: "16px", marginBottom: 12,
      borderLeft: isMine ? "3px solid #1E2D8E" : "1px solid #eee",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <MapPin size={14} color="#1E2D8E" />
            <span style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e" }}>
              {load.from_city} → {load.to_city}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "#888" }}>
            Available: {fmtDate(load.available_date)}
            {load.owner_name && !isMine && (
              <span style={{ marginLeft: 8 }}>· {load.owner_name}</span>
            )}
            {load.owner_trips != null && !isMine && (
              <span style={{ marginLeft: 6, color: "#1E2D8E", fontWeight: 600 }}>
                {load.owner_trips} trips completed
              </span>
            )}
          </div>
        </div>
        <Badge status={load.status} />
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
        {[
          { label: "Capacity", value: load.capacity_tonnes ? `${load.capacity_tonnes}T` : "—", icon: Package },
          { label: "Asking", value: load.asking_price ? fmt(load.asking_price) : "Negotiable", icon: IndianRupee },
          { label: "Truck", value: load.vehicle_reg || "—", icon: Truck },
        ].map(s => (
          <div key={s.label} style={{ background: "#f8f9ff", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>{s.value}</div>
            <div style={{ fontSize: 10, color: "#aaa", marginTop: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {load.cargo_accepted && (
        <p style={{ fontSize: 12, color: "#666", margin: "0 0 10px", background: "#f8f9ff", padding: "6px 10px", borderRadius: 6 }}>
          Accepts: {load.cargo_accepted}
        </p>
      )}
      {load.notes && (
        <p style={{ fontSize: 12, color: "#888", margin: "0 0 10px", fontStyle: "italic" }}>{load.notes}</p>
      )}

      {/* Interest count */}
      {load.interest_count > 0 && (
        <p style={{ fontSize: 11.5, color: "#888", margin: "0 0 10px" }}>
          {load.interest_count} fleet owner{load.interest_count !== 1 ? "s" : ""} interested
        </p>
      )}

      {/* Action buttons */}
      {isMine ? (
        load.status === "open" && (
          <button
            onClick={() => onCancel(load.id)}
            style={{ fontSize: 12, color: "#c62828", background: "none", border: "1px solid #fca5a5", borderRadius: 6, padding: "6px 12px", cursor: "pointer" }}>
            Cancel Listing
          </button>
        )
      ) : load.status === "open" ? (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={openWhatsApp}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              background: "#25D366", color: "white", border: "none", borderRadius: 8,
              padding: "9px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>
            <MessageCircle size={15} /> WhatsApp
          </button>
          <button
            onClick={() => !alreadyInterested && onInterest(load)}
            disabled={alreadyInterested}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              background: alreadyInterested ? "#f0f1fa" : "#1E2D8E",
              color: alreadyInterested ? "#888" : "white",
              border: "none", borderRadius: 8,
              padding: "9px 14px", fontSize: 13, fontWeight: 700,
              cursor: alreadyInterested ? "not-allowed" : "pointer",
            }}>
            {alreadyInterested ? <CheckCircle size={15} /> : <ChevronRight size={15} />}
            {alreadyInterested ? "Interested" : "Express Interest"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
