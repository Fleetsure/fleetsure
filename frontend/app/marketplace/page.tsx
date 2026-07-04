"use client";
import { useEffect, useState, useCallback } from "react";
import Header from "@/components/Header";
import LocationInput from "@/components/LocationInput";
import EmptyState from "@/components/EmptyState";
import { marketplaceService } from "@/lib/services/marketplaceService";
import { vehicleService } from "@/lib/services/vehicleService";
import {
  Truck, Plus, X, MessageCircle, Search, CheckCircle, Clock, RefreshCw,
} from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { fmtDate } from "@/lib/date";
import { useIsMobile } from "@/hooks/useIsMobile";
import Badge from "./components/Badge";
import StarRating from "./components/StarRating";
import LoadCard from "./components/LoadCard";
import PostForm from "./components/PostForm";
import InterestModal from "./components/InterestModal";


// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = "browse" | "my_loads" | "received" | "sent";

export default function MarketplacePage() {
  const { t } = useLanguage();
  const [tab, setTab]               = useState<Tab>("browse");
  const [loads, setLoads]           = useState<any[]>([]);
  const [myLoads, setMyLoads]       = useState<any[]>([]);
  const [received, setReceived]     = useState<any[]>([]);
  const [sent, setSent]             = useState<any[]>([]);
  const [vehicles, setVehicles]     = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showPost, setShowPost]     = useState(false);
  const [interestLoad, setInterestLoad] = useState<any>(null);
  const isMobile = useIsMobile();
  const [currentUserId, setCurrentUserId] = useState("");

  // Filters
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo]     = useState("");

  useEffect(() => {
    const uid = localStorage.getItem("userId") || "";
    setCurrentUserId(uid);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [l, ml, r, s, v] = await Promise.all([
        marketplaceService.getLoads(),
        marketplaceService.getMyLoads(),
        marketplaceService.getInterestsReceived(),
        marketplaceService.getInterestsSent(),
        vehicleService.getAll(),
      ]);
      setLoads(l.data || []);
      setMyLoads(ml.data || []);
      setReceived(r.data || []);
      setSent(s.data || []);
      setVehicles(v.data || []);
    } catch { /* non-blocking */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this listing?")) return;
    await marketplaceService.cancel(id);
    loadAll();
  };

  const handleInterestAction = async (interestId: string, action: "accepted" | "rejected") => {
    await marketplaceService.updateInterest(interestId, { status: action });
    loadAll();
  };

  const filteredLoads = loads.filter(l =>
    (!filterFrom || l.from_city.toLowerCase().includes(filterFrom.toLowerCase())) &&
    (!filterTo   || l.to_city.toLowerCase().includes(filterTo.toLowerCase()))
  );

  const pendingReceivedCount = received.filter(i => i.status === "pending").length;

  const pad = isMobile ? "14px" : "24px 28px";

  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: "browse",   label: t("market.browse") },
    { key: "my_loads", label: t("market.post") },
    { key: "received", label: "Received", badge: pendingReceivedCount },
    { key: "sent",     label: "Sent" },
  ];

  return (
    <div>
      <Header
        title={t("market.title")}
        subtitle="Find backhaul loads · kill empty return trips"
      />

      {/* Tabs */}
      <div style={{ padding: `0 ${isMobile ? "14px" : "28px"}`, borderBottom: "1px solid #f0f0f8", display: "flex", gap: 4, overflowX: "auto", WebkitOverflowScrolling: "touch" as any }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: "10px 14px", fontSize: 13, fontWeight: tab === t.key ? 700 : 500,
              color: tab === t.key ? "#1E2D8E" : "#888", background: "none", border: "none",
              borderBottom: tab === t.key ? "2px solid #1E2D8E" : "2px solid transparent",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              flexShrink: 0, minHeight: 44,
            }}>
            {t.label}
            {t.badge ? (
              <span style={{ background: "#e53935", color: "white", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 99 }}>
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
        <div style={{ flex: 1, minWidth: 8 }} />
        <button
          onClick={() => setShowPost(true)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "#1E2D8E", color: "white", border: "none",
            borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 700,
            cursor: "pointer", margin: "6px 0", flexShrink: 0, minHeight: 44,
          }}>
          <Plus size={15} /> Post Return
        </button>
      </div>

      <div style={{ padding: pad }}>

        {/* ── Browse tab ── */}
        {tab === "browse" && (
          <>
            {/* Filters */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
              <LocationInput
                value={filterFrom}
                onChange={setFilterFrom}
                placeholder="Filter by From city…"
                style={{ flex: 1, minWidth: 140 }}
              />
              <LocationInput
                value={filterTo}
                onChange={setFilterTo}
                placeholder="Filter by To city…"
                style={{ flex: 1, minWidth: 140 }}
              />
              <button onClick={loadAll} style={{ background: "#f0f1fa", border: "none", borderRadius: 8, padding: "9px 12px", cursor: "pointer", flexShrink: 0 }}>
                <RefreshCw size={15} color="#555" />
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", color: "#aaa", padding: "40px 0" }}>Loading loads…</div>
            ) : filteredLoads.length === 0 ? (
              <EmptyState icon={Truck} title="No open loads right now" subtitle="Be the first — post your return availability above" />
            ) : (
              filteredLoads.map(l => (
                <LoadCard key={l.id} load={l} isMine={false} currentUserId={currentUserId}
                  onInterest={setInterestLoad} onCancel={handleCancel} />
              ))
            )}
          </>
        )}

        {/* ── My Listings tab ── */}
        {tab === "my_loads" && (
          <>
            {loading ? (
              <div style={{ textAlign: "center", color: "#aaa", padding: "40px 0" }}>Loading…</div>
            ) : myLoads.length === 0 ? (
              <EmptyState icon={Truck} title="No listings yet" subtitle="Post your first return availability to start getting enquiries" />
            ) : (
              myLoads.map(l => (
                <LoadCard key={l.id} load={l} isMine={true} currentUserId={currentUserId}
                  onInterest={setInterestLoad} onCancel={handleCancel} />
              ))
            )}
          </>
        )}

        {/* ── Received Interests tab ── */}
        {tab === "received" && (
          <>
            {loading ? (
              <div style={{ textAlign: "center", color: "#aaa", padding: "40px 0" }}>Loading…</div>
            ) : received.length === 0 ? (
              <EmptyState icon={Clock} title="No interests received yet" subtitle="When someone shows interest in your load, it appears here" />
            ) : (
              received.map(i => (
                <div key={i.id} style={{ background: "white", border: "1px solid #eee", borderRadius: 12, padding: "14px 16px", marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a2e" }}>
                        {i.load_from_city} → {i.load_to_city}
                      </div>
                      <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                        {i.interested_user_name || "Fleet owner"} is interested
                        {i.load_date && ` · ${fmtDate(i.load_date)}`}
                      </div>
                    </div>
                    <Badge status={i.status} />
                  </div>
                  {i.message && (
                    <p style={{ fontSize: 13, color: "#555", margin: "0 0 10px", background: "#f8f9ff", padding: "8px 10px", borderRadius: 6, fontStyle: "italic" }}>
                      "{i.message}"
                    </p>
                  )}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {i.interested_user_phone && (
                      <button
                        onClick={() => {
                          const ph = `91${i.interested_user_phone.replace(/\D/g, "").replace(/^91/, "")}`;
                          window.open(`https://wa.me/${ph}`, "_blank");
                        }}
                        style={{ display: "flex", alignItems: "center", gap: 5, background: "#25D366", color: "white", border: "none", borderRadius: 7, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        <MessageCircle size={13} /> WhatsApp
                      </button>
                    )}
                    {i.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleInterestAction(i.id, "accepted")}
                          style={{ display: "flex", alignItems: "center", gap: 5, background: "#e8f5e9", color: "#2e7d32", border: "none", borderRadius: 7, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          <CheckCircle size={13} /> Accept
                        </button>
                        <button
                          onClick={() => handleInterestAction(i.id, "rejected")}
                          style={{ display: "flex", alignItems: "center", gap: 5, background: "#fce4ec", color: "#c62828", border: "none", borderRadius: 7, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          <X size={13} /> Decline
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* ── Sent Interests tab ── */}
        {tab === "sent" && (
          <>
            {loading ? (
              <div style={{ textAlign: "center", color: "#aaa", padding: "40px 0" }}>Loading…</div>
            ) : sent.length === 0 ? (
              <EmptyState icon={Search} title="No interests sent yet" subtitle="Browse loads and express interest to connect with other fleet owners" />
            ) : (
              sent.map(i => (
                <div key={i.id} style={{ background: "white", border: "1px solid #eee", borderRadius: 12, padding: "14px 16px", marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a2e" }}>
                        {i.load_from_city} → {i.load_to_city}
                      </div>
                      <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                        Owner: {i.load_owner_name || "—"}
                        {i.load_date && ` · ${fmtDate(i.load_date)}`}
                      </div>
                    </div>
                    <Badge status={i.status} />
                  </div>
                  {i.message && (
                    <p style={{ fontSize: 13, color: "#555", margin: "0 0 10px", fontStyle: "italic" }}>"{i.message}"</p>
                  )}
                  {i.status === "accepted" && i.load_owner_phone && (
                    <button
                      onClick={() => {
                        const ph = `91${i.load_owner_phone.replace(/\D/g, "").replace(/^91/, "")}`;
                        window.open(`https://wa.me/${ph}`, "_blank");
                      }}
                      style={{ display: "flex", alignItems: "center", gap: 5, background: "#25D366", color: "white", border: "none", borderRadius: 7, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      <MessageCircle size={13} /> Connect on WhatsApp
                    </button>
                  )}
                  {i.status === "accepted" && !i.rating && (
                    <div style={{ marginTop: 10 }}>
                      <p style={{ fontSize: 12, color: "#888", margin: "0 0 4px" }}>Rate this match:</p>
                      <StarRating
                        value={0}
                        onChange={async (v) => {
                          await marketplaceService.updateInterest(i.id, { rating: v });
                          loadAll();
                        }}
                      />
                    </div>
                  )}
                  {i.rating && (
                    <div style={{ marginTop: 8 }}>
                      <StarRating value={i.rating} />
                    </div>
                  )}
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showPost && (
        <PostForm
          vehicles={vehicles}
          onSuccess={() => { setShowPost(false); loadAll(); setTab("my_loads"); }}
          onClose={() => setShowPost(false)}
        />
      )}
      {interestLoad && (
        <InterestModal
          load={interestLoad}
          onSuccess={() => { setInterestLoad(null); loadAll(); setTab("sent"); }}
          onClose={() => setInterestLoad(null)}
        />
      )}
    </div>
  );
}
