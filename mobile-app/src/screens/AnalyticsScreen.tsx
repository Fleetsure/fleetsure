import { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { analyticsService } from "../lib/services/analyticsService";
import { useFirm } from "../context/FirmContext";
import ScreenHeader from "../components/ScreenHeader";
import Card from "../components/Card";
import { colors, radii, spacing, type, formatCurrency } from "../theme";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "trips", label: "Trip P&L" },
  { key: "drivers", label: "By Driver" },
] as const;

const PERIOD_DAYS = 30;

export default function AnalyticsScreen() {
  const { firmVersion } = useFirm();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("overview");
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [monthly, setMonthly] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<{ category: string; label: string; amount: number; pct: number }[]>([]);
  const [tripPnl, setTripPnl] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);

  const load = useCallback(async () => {
    const [ov, mo, ve, ex, tp, dr] = await Promise.all([
      analyticsService.getOverview(PERIOD_DAYS),
      analyticsService.getMonthly(),
      analyticsService.getVehicles(PERIOD_DAYS),
      analyticsService.getExpenses(PERIOD_DAYS),
      analyticsService.getTripProfitability(PERIOD_DAYS),
      analyticsService.getDriverSummary(PERIOD_DAYS),
    ]);
    if (ov.success) setOverview(ov.data);
    if (mo.success) setMonthly(mo.data ?? []);
    if (ve.success) setVehicles(ve.data?.vehicles ?? []);
    if (ex.success) setExpenses(ex.data ?? []);
    if (tp.success) setTripPnl(tp.data ?? []);
    if (dr.success) setDrivers(dr.data ?? []);
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load, firmVersion]));

  const maxExpense = useMemo(() => Math.max(1, ...expenses.map((e) => e.amount)), [expenses]);
  const maxMonthlyValue = useMemo(() => Math.max(1, ...monthly.flatMap((m) => [m.revenue, m.expenses])), [monthly]);

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <ScreenHeader title="Analytics" />
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title="Analytics" />
      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.stackGap, paddingBottom: 32 }}>
        {tab === "overview" ? (
          <>
            <View style={styles.statGrid}>
              <StatCell label="Revenue" value={formatCurrency(overview?.total_revenue ?? 0)} />
              <StatCell label="Expenses" value={formatCurrency(overview?.total_expenses ?? 0)} color={colors.error} />
              <StatCell label="Net Profit" value={formatCurrency(overview?.net_profit ?? 0)} color={overview?.net_profit >= 0 ? colors.success : colors.error} />
              <StatCell label="Utilization" value={`${overview?.utilization_pct ?? 0}%`} />
            </View>

            <Text style={styles.sectionTitle}>Monthly P&L</Text>
            {monthly.length === 0 ? <Card><Text style={{ color: colors.onSurfaceVariant }}>No completed trips yet.</Text></Card> : null}
            {monthly.map((m) => (
              <Card key={m.month}>
                <Text style={styles.primaryText}>{new Date(m.month + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</Text>
                <Bar label="Revenue" value={m.revenue} max={maxMonthlyValue} color={colors.primary} />
                <Bar label="Expenses" value={m.expenses} max={maxMonthlyValue} color={colors.error} />
                <Text style={[styles.netText, { color: m.net >= 0 ? colors.success : colors.error }]}>Net: {formatCurrency(m.net)}</Text>
              </Card>
            ))}

            <Text style={styles.sectionTitle}>Expense Breakdown</Text>
            {expenses.length === 0 ? <Card><Text style={{ color: colors.onSurfaceVariant }}>No trip-linked expenses yet.</Text></Card> : null}
            <Card>
              {expenses.map((e) => (
                <View key={e.category} style={styles.barRow}>
                  <Text style={styles.barLabel} numberOfLines={1}>{e.label}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${Math.min(100, Math.round((e.amount / maxExpense) * 100))}%`, backgroundColor: colors.secondary }]} />
                  </View>
                  <Text style={styles.barValue}>{formatCurrency(e.amount)} ({e.pct}%)</Text>
                </View>
              ))}
            </Card>

            <Text style={styles.sectionTitle}>Vehicle Profitability</Text>
            {vehicles.length === 0 ? <Card><Text style={{ color: colors.onSurfaceVariant }}>No trips in this period.</Text></Card> : null}
            {vehicles.map((v) => (
              <Card key={v.vehicle_id}>
                <View style={styles.row}>
                  <View>
                    <Text style={styles.primaryText}>{v.registration_number}</Text>
                    <Text style={styles.metaText}>{v.make} {v.model} · {v.total_trips} trips · ₹{v.cost_per_km ?? 0}/km avg</Text>
                  </View>
                  <Text style={[styles.amountText, { color: v.profit >= 0 ? colors.success : colors.error }]}>{formatCurrency(v.profit)}</Text>
                </View>
              </Card>
            ))}
          </>
        ) : null}

        {tab === "trips" ? (
          <>
            {tripPnl.length === 0 ? <Card><Text style={{ color: colors.onSurfaceVariant }}>No trips in this period.</Text></Card> : null}
            {tripPnl.map((t) => (
              <Card key={t.trip_id}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.primaryText}>{t.origin} → {t.destination}</Text>
                    <Text style={styles.metaText}>{t.registration_number} · {t.driver_name}</Text>
                  </View>
                  <Text style={[styles.amountText, { color: t.profit >= 0 ? colors.success : colors.error }]}>{formatCurrency(t.profit)}</Text>
                </View>
              </Card>
            ))}
          </>
        ) : null}

        {tab === "drivers" ? (
          <>
            {drivers.length === 0 ? <Card><Text style={{ color: colors.onSurfaceVariant }}>No trips in this period.</Text></Card> : null}
            {drivers.map((d) => (
              <Card key={d.driver_id}>
                <View style={styles.row}>
                  <View>
                    <Text style={styles.primaryText}>{d.driver_name}</Text>
                    <Text style={styles.metaText}>{d.total_trips} trips · avg {formatCurrency(d.avg_freight ?? 0)}/trip</Text>
                  </View>
                  <Text style={[styles.amountText, { color: d.profit >= 0 ? colors.success : colors.error }]}>{formatCurrency(d.profit)}</Text>
                </View>
              </Card>
            ))}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Card style={{ flexBasis: "48%" }}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
    </Card>
  );
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.barValue}>{formatCurrency(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  tabRow: { flexDirection: "row", gap: 8, paddingHorizontal: spacing.containerMargin, marginBottom: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: radii.full, borderWidth: 1, borderColor: colors.outlineVariant, backgroundColor: colors.surfaceContainerLowest, alignItems: "center" },
  tabActive: { backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer },
  tabText: { fontSize: 12, fontWeight: "700", color: colors.onSurfaceVariant },
  tabTextActive: { color: colors.onPrimaryContainer },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statLabel: { ...type.labelMd, color: colors.onSurfaceVariant, marginBottom: 4 },
  statValue: { ...type.headlineSm, color: colors.onBackground },
  sectionTitle: { ...type.headlineSm, color: colors.onBackground, marginTop: 4 },
  primaryText: { ...type.bodyLg, fontWeight: "600", color: colors.onSurface, marginBottom: 8 },
  metaText: { fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  amountText: { ...type.bodyLg, fontWeight: "700" },
  netText: { ...type.bodyMd, fontWeight: "700", marginTop: 4 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  barLabel: { width: 72, fontSize: 11, color: colors.onSurfaceVariant },
  barTrack: { flex: 1, height: 8, borderRadius: radii.full, backgroundColor: colors.surfaceContainerHigh, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: radii.full },
  barValue: { width: 108, fontSize: 11, color: colors.onBackground, textAlign: "right" },
});
