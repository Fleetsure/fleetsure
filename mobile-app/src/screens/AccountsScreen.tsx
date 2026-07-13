import { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { tripService } from "../lib/services/tripService";
import { vehicleService } from "../lib/services/vehicleService";
import { driverService } from "../lib/services/driverService";
import { fuelService } from "../lib/services/fuelService";
import { tollService } from "../lib/services/tollService";
import { miscExpenseService } from "../lib/services/miscExpenseService";
import { tyreService, tyreScrapService } from "../lib/services/tyreService";
import { maintenanceService } from "../lib/services/maintenanceService";
import { useFirm } from "../context/FirmContext";
import ScreenHeader from "../components/ScreenHeader";
import Card from "../components/Card";
import { colors, radii, spacing, type, formatCurrency } from "../theme";
import type { Trip, Vehicle, Driver, FuelLog, TollLog, MiscExpense, TyreLog, TyreScrap, DriverPayment } from "../lib/types";
import type { MaintenanceSchedule } from "../lib/services/maintenanceService";

const TABS = [
  { key: "freight", label: "Freight" },
  { key: "expenses", label: "Expenses" },
  { key: "payments", label: "Driver Pay" },
  { key: "pl", label: "P&L" },
] as const;

const EXPENSE_VIEWS = [{ key: "vehicle", label: "By Vehicle" }, { key: "month", label: "By Month" }] as const;

function monthKey(offset: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - offset);
  return d.toISOString().slice(0, 7);
}

export default function AccountsScreen() {
  const { firmVersion } = useFirm();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("freight");
  const [expenseView, setExpenseView] = useState<(typeof EXPENSE_VIEWS)[number]["key"]>("vehicle");
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [fuel, setFuel] = useState<FuelLog[]>([]);
  const [tolls, setTolls] = useState<TollLog[]>([]);
  const [misc, setMisc] = useState<MiscExpense[]>([]);
  const [tyres, setTyres] = useState<TyreLog[]>([]);
  const [scraps, setScraps] = useState<TyreScrap[]>([]);
  const [payments, setPayments] = useState<DriverPayment[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceSchedule[]>([]);
  const [updatingTripId, setUpdatingTripId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [t, v, d, f, tl, m, ty, sc, p, mt] = await Promise.all([
      tripService.getAll(500), vehicleService.getAll(), driverService.getAll(),
      fuelService.getAll(), tollService.getAll(), miscExpenseService.getAll(),
      tyreService.getAll(), tyreScrapService.getAll(), driverService.getPayments(), maintenanceService.getAll(),
    ]);
    if (t.success) setTrips(t.data ?? []);
    if (v.success) setVehicles(v.data ?? []);
    if (d.success) setDrivers(d.data ?? []);
    if (f.success) setFuel(f.data ?? []);
    if (tl.success) setTolls(tl.data ?? []);
    if (m.success) setMisc(m.data ?? []);
    if (ty.success) setTyres(ty.data ?? []);
    if (sc.success) setScraps(sc.data ?? []);
    if (p.success) setPayments(p.data ?? []);
    if (mt.success) setMaintenance(mt.data ?? []);
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load, firmVersion]));

  const vehicleMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const v of vehicles) m[v.id] = v.registration_number;
    return m;
  }, [vehicles]);

  const receivedTotal = useMemo(() => trips.filter((t) => t.payment_status === "received").reduce((s, t) => s + (t.freight_amount || 0), 0), [trips]);
  const pendingTotal = useMemo(() => trips.filter((t) => t.payment_status !== "received").reduce((s, t) => s + (t.freight_amount || 0), 0), [trips]);

  const byVehicle = useMemo(() => {
    const m: Record<string, { fuel: number; toll: number; misc: number; tyre: number }> = {};
    const bump = (vid: string | null, key: "fuel" | "toll" | "misc" | "tyre", amt: number) => {
      if (!vid) return;
      if (!m[vid]) m[vid] = { fuel: 0, toll: 0, misc: 0, tyre: 0 };
      m[vid][key] += amt;
    };
    for (const f of fuel) bump(f.vehicle_id, "fuel", f.amount);
    for (const t of tolls) bump(t.vehicle_id, "toll", t.amount);
    for (const e of misc) bump(e.vehicle_id, "misc", e.amount);
    for (const t of tyres) bump(t.vehicle_id, "tyre", t.amount);
    return m;
  }, [fuel, tolls, misc, tyres]);

  const byMonthExpenses = useMemo(() => {
    const m: Record<string, { fuel: number; toll: number; misc: number; tyre: number }> = {};
    const bump = (dateStr: string, key: "fuel" | "toll" | "misc" | "tyre", amt: number) => {
      const monthKey2 = dateStr.slice(0, 7);
      if (!m[monthKey2]) m[monthKey2] = { fuel: 0, toll: 0, misc: 0, tyre: 0 };
      m[monthKey2][key] += amt;
    };
    for (const f of fuel) bump(f.date, "fuel", f.amount);
    for (const t of tolls) bump(t.date, "toll", t.amount);
    for (const e of misc) bump(e.date, "misc", e.amount);
    for (const t of tyres) bump(t.date, "tyre", t.amount);
    return Object.entries(m).sort((a, b) => b[0].localeCompare(a[0]));
  }, [fuel, tolls, misc, tyres]);

  const driverPaySummary = useMemo(() => {
    return drivers.map((d) => {
      const mine = payments.filter((p) => p.driver_id === d.id);
      const advances = mine.filter((p) => p.type === "advance").reduce((s, p) => s + p.amount, 0);
      const settled = mine.filter((p) => p.type === "settlement").reduce((s, p) => s + p.amount, 0);
      return { driver: d, advances, settled, outstanding: advances - settled };
    }).filter((r) => r.advances > 0 || r.settled > 0);
  }, [drivers, payments]);

  const monthlyPL = useMemo(() => {
    const byMonth: Record<string, { fuel: number; toll: number; misc: number; tyre: number }> = {};
    const bumpM = (dateStr: string, key: "fuel" | "toll" | "misc" | "tyre", amt: number) => {
      const key2 = dateStr.slice(0, 7);
      if (!byMonth[key2]) byMonth[key2] = { fuel: 0, toll: 0, misc: 0, tyre: 0 };
      byMonth[key2][key] += amt;
    };
    for (const f of fuel) bumpM(f.date, "fuel", f.amount);
    for (const t of tolls) bumpM(t.date, "toll", t.amount);
    for (const e of misc) bumpM(e.date, "misc", e.amount);
    for (const t of tyres) bumpM(t.date, "tyre", t.amount);

    const monthlyMaintTotal = maintenance.filter((m) => m.frequency === "monthly").reduce((s, m) => s + m.amount, 0);

    return [3, 2, 1, 0].map((offset) => {
      const key = monthKey(offset);
      const oneTimeMaint = maintenance
        .filter((m) => m.frequency === "one_time" && m.last_done_date?.slice(0, 7) === key)
        .reduce((s, m) => s + m.amount, 0);
      const income =
        trips.filter((t) => t.payment_status === "received" && t.start_date.slice(0, 7) === key).reduce((s, t) => s + (t.freight_amount || 0), 0) +
        scraps.filter((s) => s.date.slice(0, 7) === key).reduce((s, sc) => s + sc.scrap_amount, 0);
      const bucket = byMonth[key] ?? { fuel: 0, toll: 0, misc: 0, tyre: 0 };
      const expense = bucket.fuel + bucket.toll + bucket.misc + bucket.tyre + monthlyMaintTotal + oneTimeMaint;
      return { month: key, income, expense, net: income - expense };
    });
  }, [trips, scraps, maintenance, fuel, tolls, misc, tyres]);

  async function togglePaymentStatus(trip: Trip) {
    const next = trip.payment_status === "received" ? "pending" : "received";
    setUpdatingTripId(trip.id);
    const res = await tripService.update(trip.id, { payment_status: next });
    setUpdatingTripId(null);
    if (res.success) load();
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <ScreenHeader title="Accounts" />
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title="Accounts" />
      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.stackGap, paddingBottom: 32 }}>
        {tab === "freight" ? (
          <>
            <View style={styles.statRow}>
              <StatCell label="Received" value={formatCurrency(receivedTotal)} color={colors.success} />
              <StatCell label="Pending" value={formatCurrency(pendingTotal)} color={colors.warning} />
              <StatCell label="Total" value={formatCurrency(receivedTotal + pendingTotal)} />
            </View>
            {trips.length === 0 ? <Card><Text style={{ color: colors.onSurfaceVariant }}>No trips yet.</Text></Card> : null}
            {trips.slice(0, 100).map((t) => (
              <Card key={t.id}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.primaryText}>{t.origin} → {t.destination}</Text>
                    <Text style={styles.metaText}>{vehicleMap[t.vehicle_id] ?? "—"}{t.driver_name ? ` · ${t.driver_name}` : ""} · {new Date(t.start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.amountText}>{formatCurrency(t.freight_amount)}</Text>
                    <TouchableOpacity
                      style={[styles.statusPill, t.payment_status === "received" ? styles.statusReceived : styles.statusPending]}
                      onPress={() => togglePaymentStatus(t)}
                      disabled={updatingTripId === t.id}
                    >
                      <Text style={styles.statusPillText}>{updatingTripId === t.id ? "…" : t.payment_status === "received" ? "Received" : "Pending"}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            ))}
          </>
        ) : null}

        {tab === "expenses" ? (
          <>
            <View style={styles.tabRow}>
              {EXPENSE_VIEWS.map((v) => (
                <TouchableOpacity key={v.key} style={[styles.tab, expenseView === v.key && styles.tabActive]} onPress={() => setExpenseView(v.key)}>
                  <Text style={[styles.tabText, expenseView === v.key && styles.tabTextActive]}>{v.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {expenseView === "vehicle" ? (
              <>
                {Object.keys(byVehicle).length === 0 ? <Card><Text style={{ color: colors.onSurfaceVariant }}>No expenses logged yet.</Text></Card> : null}
                {Object.entries(byVehicle).map(([vid, v]) => (
                  <Card key={vid}>
                    <Text style={styles.primaryText}>{vehicleMap[vid] ?? "—"}</Text>
                    <View style={styles.checkGrid}>
                      <MiniStat label="Fuel" value={v.fuel} />
                      <MiniStat label="Tolls" value={v.toll} />
                      <MiniStat label="Misc" value={v.misc} />
                      <MiniStat label="Tyres" value={v.tyre} />
                    </View>
                    <Text style={styles.totalLine}>Total: {formatCurrency(v.fuel + v.toll + v.misc + v.tyre)}</Text>
                  </Card>
                ))}
              </>
            ) : (
              <>
                {byMonthExpenses.length === 0 ? <Card><Text style={{ color: colors.onSurfaceVariant }}>No expenses logged yet.</Text></Card> : null}
                {byMonthExpenses.map(([month, v]) => (
                  <Card key={month}>
                    <Text style={styles.primaryText}>{new Date(month + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</Text>
                    <View style={styles.checkGrid}>
                      <MiniStat label="Fuel" value={v.fuel} />
                      <MiniStat label="Tolls" value={v.toll} />
                      <MiniStat label="Misc" value={v.misc} />
                      <MiniStat label="Tyres" value={v.tyre} />
                    </View>
                    <Text style={styles.totalLine}>Total: {formatCurrency(v.fuel + v.toll + v.misc + v.tyre)}</Text>
                  </Card>
                ))}
              </>
            )}
          </>
        ) : null}

        {tab === "payments" ? (
          <>
            {driverPaySummary.length === 0 ? <Card><Text style={{ color: colors.onSurfaceVariant }}>No driver payments recorded yet.</Text></Card> : null}
            {driverPaySummary.map(({ driver, advances, settled, outstanding }) => (
              <Card key={driver.id}>
                <Text style={styles.primaryText}>{driver.name}</Text>
                <View style={styles.checkGrid}>
                  <MiniStat label="Advances" value={advances} />
                  <MiniStat label="Settled" value={settled} />
                </View>
                <Text style={[styles.totalLine, { color: outstanding > 0 ? colors.warning : colors.success }]}>
                  Outstanding: {formatCurrency(outstanding)}
                </Text>
              </Card>
            ))}
          </>
        ) : null}

        {tab === "pl" ? (
          <>
            {monthlyPL.map((m) => (
              <Card key={m.month}>
                <Text style={styles.primaryText}>{new Date(m.month + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</Text>
                <View style={styles.checkGrid}>
                  <MiniStat label="Income" value={m.income} />
                  <MiniStat label="Expense" value={m.expense} />
                </View>
                <Text style={[styles.totalLine, { color: m.net >= 0 ? colors.success : colors.error }]}>
                  Net: {formatCurrency(m.net)}
                </Text>
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
    <Card style={{ flex: 1 }}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.checkCell}>
      <Text style={styles.checkLabel}>{label}</Text>
      <Text style={styles.checkValue}>{formatCurrency(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  tabRow: { flexDirection: "row", gap: 8, paddingHorizontal: spacing.containerMargin, marginBottom: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: radii.full, borderWidth: 1, borderColor: colors.outlineVariant, backgroundColor: colors.surfaceContainerLowest, alignItems: "center" },
  tabActive: { backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer },
  tabText: { fontSize: 11, fontWeight: "700", color: colors.onSurfaceVariant },
  tabTextActive: { color: colors.onPrimaryContainer },
  statRow: { flexDirection: "row", gap: 8 },
  statLabel: { ...type.labelMd, color: colors.onSurfaceVariant, marginBottom: 4 },
  statValue: { ...type.headlineSm, color: colors.onBackground },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  primaryText: { ...type.bodyLg, fontWeight: "600", color: colors.onSurface, marginBottom: 8 },
  metaText: { fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
  amountText: { ...type.bodyLg, fontWeight: "700", color: colors.onBackground, marginBottom: 4 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.full },
  statusReceived: { backgroundColor: colors.successBg },
  statusPending: { backgroundColor: colors.surfaceContainerHighest },
  statusPillText: { fontSize: 11, fontWeight: "700", color: colors.onSurface },
  checkGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  checkCell: { gap: 2 },
  checkLabel: { fontSize: 10, color: colors.onSurfaceVariant, textTransform: "uppercase", fontWeight: "600" },
  checkValue: { ...type.bodyMd, fontWeight: "700", color: colors.onSurface },
  totalLine: { ...type.bodyMd, fontWeight: "700", color: colors.onSurface, marginTop: 10 },
});
