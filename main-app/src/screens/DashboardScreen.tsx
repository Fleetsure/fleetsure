import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Linking, Alert, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../context/AuthContext";
import { vehicleService } from "../services/vehicleService";
import { driverService } from "../services/driverService";
import { tripService } from "../services/tripService";
import { analyticsService } from "../services/analyticsService";
import type { Vehicle, Driver, Trip } from "../types";

const PRIMARY   = "#1E2D8E";
const BG        = "#F5F6FA";
const CARD      = "#ffffff";
const TEXT      = "#1A1A2E";
const MUTED     = "#6B7280";
const BORDER    = "#E9EBF0";
const SUCCESS   = "#15803D";
const DANGER    = "#DC2626";
const WARNING   = "#D97706";

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
function fmt(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  planned:     { bg: "#EEF2FF", color: PRIMARY },
  in_progress: { bg: "#FFF7ED", color: WARNING },
  completed:   { bg: "#F0FDF4", color: SUCCESS },
  cancelled:   { bg: "#FEF2F2", color: DANGER },
};

export default function DashboardScreen() {
  const { user, signOut } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers,  setDrivers]  = useState<Driver[]>([]);
  const [trips,    setTrips]    = useState<Trip[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [pnl,      setPnl]      = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [waLoading,  setWaLoading]  = useState(false);
  const [insightIdx, setInsightIdx] = useState(0);

  const load = useCallback(async () => {
    try {
      const [v, d, t, ov, p] = await Promise.all([
        vehicleService.getAll(),
        driverService.getAll(),
        tripService.getAll(20),
        analyticsService.getOverview(30),
        analyticsService.getVehiclePnL(),
      ]);
      if (v.success) setVehicles(v.data ?? []);
      if (d.success) setDrivers(d.data ?? []);
      if (t.success) setTrips(t.data ?? []);
      if (ov.success) setOverview(ov.data);
      if (p.success) setPnl(p.data ?? []);
    } catch {}
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const sendWhatsApp = async () => {
    setWaLoading(true);
    try {
      const res = await analyticsService.getDailySummary();
      if (!res.success || !res.data) return;
      const d = res.data;
      const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
      const lines = [
        `*FleetSure Daily Summary*`,
        `_${today}_`, ``,
        `*Active Trips:* ${d.active_trips?.length ?? 0}`,
        ...(d.active_trips ?? []).map((t: any) => `  • ${t.reg_number}: ${t.origin} → ${t.destination} (${t.driver_name})`),
        `*Planned:* ${d.planned_trips_count} trip(s)`,
        `*Completed Today:* ${d.completed_today} trip(s)`,
        d.revenue_today > 0 ? `*Revenue Today:* ₹${d.revenue_today.toLocaleString("en-IN")}` : "",
        ``,
        ...(d.compliance_alerts ?? []).map((a: any) => `⚠️ ${a.title}`),
        ``, `_Sent via FleetSure_`,
      ].filter(Boolean);
      await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`);
    } catch { Alert.alert("Error", "Could not open WhatsApp"); }
    setWaLoading(false);
  };

  // Computed stats
  const activeVehicles  = vehicles.filter(v => v.status === "active").length;
  const inTripVehicles  = vehicles.filter(v => v.status === "in_trip").length;
  const activeDrivers   = drivers.filter(d => d.status === "active").length;
  const completedTrips  = trips.filter(t => t.status === "completed").length;
  const inProgressTrips = trips.filter(t => t.status === "in_progress").length;
  const recentTrips     = trips.slice(0, 5);

  // Fleet insights
  const insights: { emoji: string; title: string; body: string }[] = [];
  if (pnl.length > 0 && pnl[0].revenue > 0) {
    insights.push({
      emoji: "🏆",
      title: `${pnl[0].registration_number} is your star truck`,
      body: `${pnl[0].margin_pct?.toFixed(1)}% profit margin across ${pnl[0].total_trips} trips — highest in your fleet.`,
    });
  }
  if (overview?.margin_pct !== undefined) {
    const m = overview.margin_pct;
    if (m >= 20) insights.push({ emoji: "🚀", title: "Fleet is profitable!", body: `${m}% margin this month — great work!` });
    else if (m >= 10) insights.push({ emoji: "📈", title: "Room to grow", body: `${m}% margin. Review fuel & toll expenses to improve.` });
    else if (m >= 0) insights.push({ emoji: "⚠️", title: "Thin margins", body: `Only ${m}% margin. Time to review trip costs closely.` });
    else insights.push({ emoji: "🔴", title: "Fleet running at a loss", body: `Net loss this month. Check expense categories urgently.` });
  }
  if (vehicles.length > 0 && inTripVehicles === 0) {
    insights.push({ emoji: "💡", title: "All trucks idle", body: "No vehicle is currently on a trip. Log new trips to track revenue." });
  }
  const currentInsight = insights[insightIdx % Math.max(insights.length, 1)];

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={PRIMARY} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image source={require("../../assets/logo.png")} style={styles.logo} resizeMode="contain" />
            <View>
              <Text style={styles.greeting}>{getGreeting()}, {user?.name?.split(" ")[0] ?? "Owner"} ✨</Text>
              <Text style={styles.orgName}>{user?.org_name || "Fleet performance overview"}</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={signOut} style={styles.iconBtn}>
              <Ionicons name="log-out-outline" size={20} color={MUTED} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 2×2 Stats Grid ── */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="car-outline" iconBg="#EEF2FF" iconColor={PRIMARY}
            value={String(vehicles.length)} label="Total Vehicles"
            sub={`${activeVehicles} Available · ${inTripVehicles} On Trip`}
          />
          <StatCard
            icon="people-outline" iconBg="#E0F2FE" iconColor="#0E7490"
            value={String(drivers.length)} label="Total Drivers"
            sub={`${activeDrivers} Available`}
          />
          <StatCard
            icon="map-outline" iconBg="#FFF7ED" iconColor={WARNING}
            value={String(trips.length)} label="Total Trips"
            sub={`${completedTrips} Completed`}
          />
          <StatCard
            icon="trending-up-outline" iconBg="#F0FDF4" iconColor={SUCCESS}
            value={fmt(overview?.total_revenue ?? 0)} label="Revenue"
            sub="Completed"
          />
        </View>

        {/* ── WhatsApp Daily Report ── */}
        <View style={styles.waCard}>
          <View style={styles.waCardTop}>
            <View style={styles.waCardLeft}>
              <View style={styles.waIconBox}>
                <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
              </View>
              <View>
                <Text style={styles.waTitle}>WhatsApp Daily Report</Text>
                <Text style={styles.waDesc}>Active trips · revenue · compliance alerts · idle vehicles — sent to your WhatsApp</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.waSendBtn} onPress={sendWhatsApp} disabled={waLoading}>
            <Ionicons name="logo-whatsapp" size={16} color="#fff" />
            <Text style={styles.waSendBtnText}>{waLoading ? "Preparing…" : "Send Summary"}</Text>
            {waLoading && <ActivityIndicator size="small" color="#fff" />}
          </TouchableOpacity>
        </View>

        {/* ── Fleet Insights ── */}
        {insights.length > 0 && currentInsight && (
          <View style={styles.insightCard}>
            <Text style={styles.insightLabel}>FLEET INSIGHT</Text>
            <View style={styles.insightBody}>
              <View style={styles.insightContent}>
                <Text style={styles.insightEmoji}>{currentInsight.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.insightTitle}>{currentInsight.title}</Text>
                  <Text style={styles.insightDesc}>{currentInsight.body}</Text>
                </View>
              </View>
              {insights.length > 1 && (
                <View style={styles.insightNav}>
                  <TouchableOpacity
                    style={styles.insightNavBtn}
                    onPress={() => setInsightIdx((i) => (i - 1 + insights.length) % insights.length)}
                  >
                    <Ionicons name="chevron-back" size={16} color={SUCCESS} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.insightNavBtn}
                    onPress={() => setInsightIdx((i) => (i + 1) % insights.length)}
                  >
                    <Ionicons name="chevron-forward" size={16} color={SUCCESS} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── P&L Per Truck ── */}
        {pnl.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>P&L Per Truck (12 months)</Text>
            {pnl.slice(0, 5).map((v: any) => {
              const mc = v.margin_pct < 0 ? DANGER : v.margin_pct < 15 ? WARNING : SUCCESS;
              return (
                <View key={v.vehicle_id} style={styles.pnlRow}>
                  <View style={styles.pnlHeader}>
                    <View>
                      <Text style={styles.pnlReg}>{v.registration_number}</Text>
                      <Text style={styles.pnlMake}>{v.make} {v.model}</Text>
                    </View>
                    <Text style={[styles.pnlProfit, { color: mc }]}>
                      {v.profit >= 0 ? "+" : ""}{fmt(v.profit)}
                    </Text>
                  </View>
                  <View style={styles.pnlAmounts}>
                    <PnLChip label="Revenue"  value={fmt(v.revenue)}  color="#EEF2FF"   textColor={PRIMARY} />
                    <PnLChip label="Expenses" value={fmt(v.expenses)} color="#FEF2F2"   textColor={DANGER} />
                    <PnLChip label="Profit"   value={fmt(v.profit)}   color={v.profit >= 0 ? "#F0FDF4" : "#FEF2F2"} textColor={mc} />
                  </View>
                  <View style={styles.pnlBarRow}>
                    <View style={styles.pnlBarBg}>
                      <View style={[styles.pnlBarFill, {
                        width: `${Math.max(0, Math.min(100, v.margin_pct))}%` as any,
                        backgroundColor: mc,
                      }]} />
                    </View>
                    <Text style={[styles.pnlPct, { color: mc }]}>{v.margin_pct?.toFixed(1)}%</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Recent Trips ── */}
        {recentTrips.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Trips</Text>
              <Text style={styles.sectionSub}>View all</Text>
            </View>
            {recentTrips.map((t) => {
              const ss = STATUS_STYLE[t.status] ?? STATUS_STYLE.planned;
              const veh = vehicles.find(v => v.id === t.vehicle_id);
              return (
                <View key={t.id} style={styles.tripCard}>
                  <View style={styles.tripRow1}>
                    <Text style={styles.tripRoute} numberOfLines={1}>
                      {t.origin} → {t.destination}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: ss.bg }]}>
                      <Text style={[styles.badgeText, { color: ss.color }]}>
                        {t.status.replace("_", " ")}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.tripRow2}>
                    <Text style={styles.tripMeta}>
                      {t.driver_name} · {veh?.registration_number ?? "—"} · {fmtDate(t.start_date)}
                    </Text>
                    <Text style={styles.tripFreight}>
                      {fmt(Number(t.freight_amount))}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, iconBg, iconColor, value, label, sub }: {
  icon: string; iconBg: string; iconColor: string;
  value: string; label: string; sub: string;
}) {
  return (
    <View style={sc.card}>
      <View style={[sc.iconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon as any} size={20} color={iconColor} />
      </View>
      <Text style={sc.value}>{value}</Text>
      <Text style={sc.label}>{label}</Text>
      <Text style={sc.sub} numberOfLines={2}>{sub}</Text>
    </View>
  );
}

function PnLChip({ label, value, color, textColor }: {
  label: string; value: string; color: string; textColor: string;
}) {
  return (
    <View style={[pc.chip, { backgroundColor: color }]}>
      <Text style={[pc.val, { color: textColor }]}>{value}</Text>
      <Text style={pc.lbl}>{label}</Text>
    </View>
  );
}

const sc = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  value: { fontSize: 22, fontWeight: "800", color: TEXT, marginBottom: 2 },
  label: { fontSize: 12, fontWeight: "600", color: TEXT, marginBottom: 2 },
  sub: { fontSize: 11, color: MUTED, lineHeight: 15 },
});

const pc = StyleSheet.create({
  chip: { flex: 1, borderRadius: 8, padding: 8, alignItems: "center" },
  val: { fontSize: 13, fontWeight: "800" },
  lbl: { fontSize: 10, color: MUTED, marginTop: 2 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: BG },

  // Header
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  logo: { width: 38, height: 38, borderRadius: 10 },
  greeting: { fontSize: 14, fontWeight: "700", color: TEXT },
  orgName: { fontSize: 12, color: MUTED, marginTop: 1 },
  headerActions: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: CARD, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: BORDER,
  },

  // Stats
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },

  // WhatsApp
  waCard: {
    backgroundColor: "#F0FFF4",
    borderWidth: 1,
    borderColor: "#86EFAC",
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  waCardTop: { flexDirection: "row", alignItems: "flex-start" },
  waCardLeft: { flexDirection: "row", gap: 10, flex: 1 },
  waIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center",
  },
  waTitle: { fontSize: 14, fontWeight: "700", color: "#14532D", marginBottom: 2 },
  waDesc: { fontSize: 12, color: "#166534", lineHeight: 17 },
  waSendBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: "#16A34A", borderRadius: 10, padding: 11,
  },
  waSendBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Fleet Insights
  insightCard: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 14,
    padding: 14,
  },
  insightLabel: {
    fontSize: 10, fontWeight: "700", color: SUCCESS,
    letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8,
  },
  insightBody: { flexDirection: "row", alignItems: "center", gap: 10 },
  insightContent: { flexDirection: "row", alignItems: "flex-start", gap: 10, flex: 1 },
  insightEmoji: { fontSize: 24, marginTop: 2 },
  insightTitle: { fontSize: 13, fontWeight: "700", color: "#14532D", marginBottom: 3 },
  insightDesc: { fontSize: 12, color: "#166534", lineHeight: 17 },
  insightNav: { flexDirection: "row", gap: 4 },
  insightNavBtn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center",
  },

  // P&L
  section: { gap: 10 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: TEXT },
  sectionSub: { fontSize: 13, color: PRIMARY, fontWeight: "600" },
  pnlRow: {
    backgroundColor: CARD, borderRadius: 14, padding: 14, gap: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  pnlHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  pnlReg: { fontSize: 15, fontWeight: "800", color: TEXT },
  pnlMake: { fontSize: 11, color: MUTED },
  pnlProfit: { fontSize: 16, fontWeight: "800" },
  pnlAmounts: { flexDirection: "row", gap: 8 },
  pnlBarRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  pnlBarBg: { flex: 1, height: 5, backgroundColor: "#F0F0F5", borderRadius: 9, overflow: "hidden" },
  pnlBarFill: { height: "100%", borderRadius: 9 },
  pnlPct: { fontSize: 12, fontWeight: "700", minWidth: 44, textAlign: "right" },

  // Recent Trips
  tripCard: {
    backgroundColor: CARD, borderRadius: 12, padding: 14, gap: 6,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  tripRow1: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  tripRoute: { fontSize: 14, fontWeight: "700", color: PRIMARY, flex: 1, marginRight: 8 },
  tripRow2: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  tripMeta: { fontSize: 12, color: MUTED, flex: 1 },
  tripFreight: { fontSize: 14, fontWeight: "800", color: TEXT },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 10, fontWeight: "700", textTransform: "capitalize" },
});
