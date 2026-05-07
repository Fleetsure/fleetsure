"use client";
import { useEffect, useState, useCallback } from "react";
import { X, RefreshCw, Bell, AlertTriangle, Info, TrendingUp, Truck, ReceiptText } from "lucide-react";
import { getInsights, refreshInsights, markInsightRead, dismissInsight, markAllRead } from "@/lib/api";

type Insight = {
  id: string;
  insight_type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  body: string | null;
  meta: Record<string, any> | null;
  vehicle_id: string | null;
  trip_id: string | null;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
};

const SEVERITY_STYLES: Record<string, { bg: string; border: string; color: string; label: string }> = {
  info:     { bg: "#f0f4ff", border: "#c5cef9", color: "#1E2D8E", label: "Info"     },
  warning:  { bg: "#fff8e1", border: "#ffe082", color: "#e65100", label: "Watch"    },
  critical: { bg: "#fce4ec", border: "#f48fb1", color: "#b71c1c", label: "Critical" },
};

const TYPE_META: Record<string, { icon: any; label: string }> = {
  idle_vehicle:        { icon: Truck,       label: "Idle Vehicle"        },
  unrecorded_expense:  { icon: ReceiptText, label: "Missing Expense"     },
  cost_per_km:         { icon: TrendingUp,  label: "Cost Analysis"       },
  fuel_anomaly:        { icon: AlertTriangle, label: "Fuel Anomaly"      },
  driver_fatigue:      { icon: AlertTriangle, label: "Driver Fatigue"    },
  maintenance_due:     { icon: AlertTriangle, label: "Maintenance Due"   },
  empty_run:           { icon: Truck,       label: "Empty Run Alert"     },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface Props {
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
}

export default function InsightsPanel({ onClose, onUnreadChange }: Props) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await getInsights();
      const data = res.data;
      setInsights(data.insights || []);
      setTotal(data.total || 0);
      setUnread(data.unread || 0);
      onUnreadChange?.(data.unread || 0);
    } catch (_) {}
  }, [onUnreadChange]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshInsights();
      await load();
    } finally { setRefreshing(false); }
  };

  const handleDismiss = async (id: string) => {
    try {
      await dismissInsight(id);
      setInsights(prev => prev.filter(i => i.id !== id));
      setTotal(t => t - 1);
    } catch (_) {}
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      setInsights(prev => prev.map(i => ({ ...i, is_read: true })));
      setUnread(0);
      onUnreadChange?.(0);
    } catch (_) {}
  };

  const handleRead = async (id: string) => {
    const ins = insights.find(i => i.id === id);
    if (!ins || ins.is_read) return;
    try {
      await markInsightRead(id);
      setInsights(prev => prev.map(i => i.id === id ? { ...i, is_read: true } : i));
      const newUnread = Math.max(0, unread - 1);
      setUnread(newUnread);
      onUnreadChange?.(newUnread);
    } catch (_) {}
  };

  const grouped = ["warning", "critical", "info"].map(sev => ({
    sev,
    items: insights.filter(i => i.severity === sev),
  })).filter(g => g.items.length > 0);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 1100 }}
      />

      {/* Slide-over panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "min(420px, 100vw)",
        background: "var(--bg-card)",
        borderLeft: "1px solid var(--border)",
        boxShadow: "-8px 0 40px rgba(0,0,0,0.12)",
        zIndex: 1200,
        display: "flex", flexDirection: "column",
        animation: "slideInRight 0.22s ease",
      }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Bell size={18} color="#1E2D8E" />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-main)" }}>
                Fleet Intelligence
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {loading ? "Loading…" : `${total} insight${total !== 1 ? "s" : ""}${unread > 0 ? ` · ${unread} new` : ""}`}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={handleRefresh}
              title="Refresh insights"
              disabled={refreshing}
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
              <RefreshCw size={13} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
              {refreshing ? "Running…" : "Refresh"}
            </button>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 6 }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
          {loading && (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)", fontSize: 14 }}>
              Analysing your fleet…
            </div>
          )}

          {!loading && insights.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <Bell size={40} color="#e0e0e0" style={{ margin: "0 auto 14px", display: "block" }} />
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-main)", marginBottom: 6 }}>All clear!</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
                No operational issues detected. Hit Refresh to run a fresh analysis.
              </div>
              <button onClick={handleRefresh} className="btn-primary" style={{ margin: "0 auto" }}>
                <RefreshCw size={13} /> Run Analysis
              </button>
            </div>
          )}

          {!loading && insights.length > 0 && (
            <>
              {unread > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#1E2D8E", fontWeight: 600, marginBottom: 12, padding: 0 }}>
                  Mark all as read
                </button>
              )}

              {grouped.map(({ sev, items }) => (
                <div key={sev} style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: 8 }}>
                    {SEVERITY_STYLES[sev].label} · {items.length}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {items.map(ins => {
                      const s = SEVERITY_STYLES[ins.severity];
                      const typeMeta = TYPE_META[ins.insight_type] || { icon: Info, label: ins.insight_type };
                      const Icon = typeMeta.icon;
                      return (
                        <div
                          key={ins.id}
                          onClick={() => handleRead(ins.id)}
                          style={{
                            padding: "12px 14px",
                            borderRadius: 10,
                            border: `1.5px solid ${ins.is_read ? "var(--border)" : s.border}`,
                            background: ins.is_read ? "var(--bg-subtle)" : s.bg,
                            cursor: "default",
                            position: "relative",
                            transition: "all 0.15s",
                          }}
                        >
                          {/* Unread dot */}
                          {!ins.is_read && (
                            <div style={{ position: "absolute", top: 12, right: 14, width: 7, height: 7, borderRadius: "50%", background: s.color }} />
                          )}

                          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
                            <div style={{ width: 30, height: 30, borderRadius: 8, background: s.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                              <Icon size={14} color={s.color} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: s.color, marginBottom: 2 }}>{typeMeta.label}</div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-main)", lineHeight: 1.35 }}>{ins.title}</div>
                            </div>
                          </div>

                          {ins.body && (
                            <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5, marginLeft: 40, marginBottom: 8 }}>
                              {ins.body}
                            </div>
                          )}

                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginLeft: 40 }}>
                            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{timeAgo(ins.created_at)}</span>
                            <button
                              onClick={e => { e.stopPropagation(); handleDismiss(ins.id); }}
                              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "var(--text-muted)", padding: "2px 6px", borderRadius: 4 }}
                              onMouseEnter={e => (e.currentTarget.style.color = "#e53935")}
                              onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}>
                              Dismiss
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && insights.length > 0 && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
            <p style={{ margin: 0, fontSize: 11.5, color: "var(--text-muted)", textAlign: "center", lineHeight: 1.5 }}>
              Insights are auto-generated from your fleet data.<br />
              Click Refresh to run a fresh analysis at any time.
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
