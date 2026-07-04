import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Share,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Share2, TrendingUp, TrendingDown, Wallet, BarChart2, Map, Truck, type LucideIcon } from "lucide-react-native";

import { analyticsService } from "../services/analyticsService";

import { PRIMARY, BG, CARD, TEXT, TEXT_MUTED, BORDER, DANGER, SUCCESS, WARNING } from "../theme";
import { fmt } from "../utils/format";

const PERIODS = [
  { label: "30d", days: 30 },
  { label: "60d", days: 60 },
  { label: "90d", days: 90 },
  { label: "1yr", days: 365 },
];

export default function ReportsScreen() {
  const [period, setPeriod] = useState(30);
  const [overview, setOverview] = useState<any>(null);
  const [pnl, setPnl] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [ov, p] = await Promise.all([
      analyticsService.getOverview(period),
      analyticsService.getVehiclePnL(),
    ]);
    if (ov.success) setOverview(ov.data);
    if (p.success) setPnl(p.data ?? []);
    setLoading(false);
  }, [period]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const exportReport = async () => {
    if (!overview) return;
    try {
      const lines = [
        `FleetSure Report — Last ${period} days`,
        `Generated: ${new Date().toLocaleDateString("en-IN")}`,
        ``,
        `OVERVIEW`,
        `Total Trips: ${overview.total_trips}`,
        `Revenue: ${fmt(overview.total_revenue)}`,
        `Expenses: ${fmt(overview.total_expenses)}`,
        `Net Profit: ${fmt(overview.net_profit)}`,
        `Margin: ${overview.margin_pct}%`,
        ``,
        `VEHICLE P&L`,
        ...pnl.map(
          (v: any) =>
            `${v.registration_number}: Rev ${fmt(v.revenue)} | Exp ${fmt(v.expenses)} | Profit ${fmt(v.profit)} (${v.margin_pct}%)`
        ),
        ``,
        `_FleetSure Fleet Management_`,
      ];
      await Share.share({ message: lines.join("\n"), title: "FleetSure Report" });
    } catch {
      Alert.alert("Error", "Could not share report.");
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={PRIMARY} size="large" /></View>;
  }

  const margin = overview?.margin_pct ?? 0;
  const marginColor = margin < 0 ? DANGER : margin < 15 ? WARNING : SUCCESS;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Reports</Text>
          <Text style={styles.headerSub}>Fleet performance summary</Text>
        </View>
        <TouchableOpacity style={styles.shareBtn} onPress={exportReport}>
          <Share2 size={18} color={PRIMARY} />
          <Text style={styles.shareBtnText}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* Period Selector */}
      <View style={styles.periodRow}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p.days}
            style={[styles.periodBtn, period === p.days && styles.periodBtnActive]}
            onPress={() => { setPeriod(p.days); setLoading(true); }}
          >
            <Text style={[styles.periodBtnText, period === p.days && styles.periodBtnTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
      >
        {/* KPI Cards */}
        {overview && (
          <>
            <View style={styles.kpiRow}>
              <KpiCard label="Revenue" value={fmt(overview.total_revenue)} color={SUCCESS} icon={TrendingUp} />
              <KpiCard label="Expenses" value={fmt(overview.total_expenses)} color={DANGER} icon={TrendingDown} />
            </View>
            <View style={styles.kpiRow}>
              <KpiCard label="Net Profit" value={fmt(overview.net_profit)} color={overview.net_profit >= 0 ? SUCCESS : DANGER} icon={Wallet} />
              <KpiCard label="Margin" value={`${margin}%`} color={marginColor} icon={BarChart2} />
            </View>
            <View style={styles.kpiRow}>
              <KpiCard label="Total Trips" value={String(overview.total_trips)} color={PRIMARY} icon={Map} />
              <KpiCard label="Vehicles" value={String(overview.total_vehicles)} color="#0E7490" icon={Truck} />
            </View>

            {/* Margin Bar */}
            <View style={styles.marginCard}>
              <Text style={styles.marginTitle}>Overall Margin</Text>
              <View style={styles.marginRow}>
                <View style={styles.marginBarBg}>
                  <View
                    style={[
                      styles.marginBarFill,
                      {
                        width: `${Math.max(0, Math.min(100, margin))}%` as any,
                        backgroundColor: marginColor,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.marginPct, { color: marginColor }]}>{margin}%</Text>
              </View>
              <Text style={styles.marginDesc}>
                {margin >= 20
                  ? "Excellent — your fleet is performing well."
                  : margin >= 10
                  ? "Good — room to improve cost efficiency."
                  : margin >= 0
                  ? "Thin margins — review expenses closely."
                  : "Loss-making — urgent review needed."}
              </Text>
            </View>
          </>
        )}

        {/* Vehicle P&L */}
        {pnl.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vehicle P&L (12 months)</Text>
            {pnl.map((v: any) => {
              const mc = v.margin_pct < 0 ? DANGER : v.margin_pct < 15 ? WARNING : SUCCESS;
              return (
                <View key={v.vehicle_id} style={styles.pnlRow}>
                  <View style={styles.pnlHeader}>
                    <View>
                      <Text style={styles.pnlReg}>{v.registration_number}</Text>
                      <Text style={styles.pnlTrips}>{v.total_trips} trips</Text>
                    </View>
                    <Text style={[styles.pnlProfit, { color: mc }]}>
                      {v.profit >= 0 ? "+" : ""}{fmt(v.profit)}
                    </Text>
                  </View>
                  <View style={styles.pnlAmounts}>
                    <Text style={styles.pnlAmt}>Rev: {fmt(v.revenue)}</Text>
                    <Text style={styles.pnlAmt}>Exp: {fmt(v.expenses)}</Text>
                    <Text style={[styles.pnlAmt, { color: mc, fontWeight: "700" }]}>{v.margin_pct}%</Text>
                  </View>
                  <View style={styles.pnlBarBg}>
                    <View
                      style={[
                        styles.pnlBarFill,
                        {
                          width: `${Math.max(0, Math.min(100, v.margin_pct))}%` as any,
                          backgroundColor: mc,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function KpiCard({ label, value, color, icon: Icon }: { label: string; value: string; color: string; icon: LucideIcon }) {
  return (
    <View style={[kpiStyles.card, { borderLeftColor: color }]}>
      <Icon size={16} color={color} />
      <Text style={[kpiStyles.value, { color }]}>{value}</Text>
      <Text style={kpiStyles.label}>{label}</Text>
    </View>
  );
}

const kpiStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  value: { fontSize: 18, fontWeight: "800" },
  label: { fontSize: 12, color: TEXT_MUTED, fontWeight: "500" },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: TEXT },
  headerSub: { fontSize: 13, color: TEXT_MUTED },
  shareBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#EEF2FF", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  shareBtnText: { color: PRIMARY, fontWeight: "700", fontSize: 13 },
  periodRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, alignItems: "center" },
  periodBtnActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  periodBtnText: { fontSize: 13, fontWeight: "700", color: TEXT_MUTED },
  periodBtnTextActive: { color: "#fff" },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  kpiRow: { flexDirection: "row", gap: 12 },
  marginCard: { backgroundColor: CARD, borderRadius: 14, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  marginTitle: { fontSize: 14, fontWeight: "800", color: TEXT, marginBottom: 12 },
  marginRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  marginBarBg: { flex: 1, height: 8, backgroundColor: "#F0F0F5", borderRadius: 9, overflow: "hidden" },
  marginBarFill: { height: "100%", borderRadius: 9 },
  marginPct: { fontSize: 14, fontWeight: "800", minWidth: 40, textAlign: "right" },
  marginDesc: { fontSize: 12, color: TEXT_MUTED, lineHeight: 18 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: TEXT, marginBottom: 4 },
  pnlRow: { backgroundColor: CARD, borderRadius: 12, padding: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  pnlHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  pnlReg: { fontSize: 14, fontWeight: "800", color: TEXT },
  pnlTrips: { fontSize: 11, color: TEXT_MUTED },
  pnlProfit: { fontSize: 15, fontWeight: "800" },
  pnlAmounts: { flexDirection: "row", gap: 12, marginBottom: 8 },
  pnlAmt: { fontSize: 12, color: TEXT_MUTED },
  pnlBarBg: { height: 4, backgroundColor: "#F0F0F5", borderRadius: 9, overflow: "hidden" },
  pnlBarFill: { height: "100%", borderRadius: 9 },
});
