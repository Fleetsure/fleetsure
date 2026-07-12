import React, { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { tripService } from "../lib/services/tripService";
import { vehicleService } from "../lib/services/vehicleService";
import { driverService } from "../lib/services/driverService";
import { fuelService } from "../lib/services/fuelService";
import { tollService } from "../lib/services/tollService";
import { miscExpenseService } from "../lib/services/miscExpenseService";
import { tyreService } from "../lib/services/tyreService";
import { maintenanceService, type MaintenanceSchedule } from "../lib/services/maintenanceService";
import { useFirm } from "../context/FirmContext";
import ScreenHeader from "../components/ScreenHeader";
import Card from "../components/Card";
import FormField from "../components/FormField";
import DateField from "../components/DateField";
import ChipPicker from "../components/ChipPicker";
import { colors, radii, spacing, type, formatCurrency } from "../theme";
import type { Trip, Vehicle, Driver, FuelLog, TollLog, MiscExpense, TyreLog } from "../lib/types";

const REPORT_TYPES = [
  { key: "trip", label: "Freight by Segment" },
  { key: "expense", label: "Expenses by Segment" },
  { key: "pl", label: "P&L by Segment" },
  { key: "tyre", label: "Tyre Cost by Segment" },
] as const;
const SEGMENTS = [
  { key: "all", label: "All" },
  { key: "vehicle", label: "Vehicle" },
  { key: "driver", label: "Driver" },
  { key: "route", label: "Route" },
] as const;

function monthStartISO(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function inRange(d: string, from: string, to: string): boolean {
  return d >= from && d <= to;
}

export default function ReportsScreen() {
  const { firmVersion } = useFirm();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [fuel, setFuel] = useState<FuelLog[]>([]);
  const [tolls, setTolls] = useState<TollLog[]>([]);
  const [misc, setMisc] = useState<MiscExpense[]>([]);
  const [tyres, setTyres] = useState<TyreLog[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceSchedule[]>([]);

  const [dateFrom, setDateFrom] = useState(monthStartISO());
  const [dateTo, setDateTo] = useState(todayISO());
  const [reportType, setReportType] = useState<(typeof REPORT_TYPES)[number]["key"]>("trip");
  const [segment, setSegment] = useState<(typeof SEGMENTS)[number]["key"]>("vehicle");

  const load = useCallback(async () => {
    const [t, v, d, f, tl, m, ty, mt] = await Promise.all([
      tripService.getAll(500), vehicleService.getAll(), driverService.getAll(),
      fuelService.getAll(), tollService.getAll(), miscExpenseService.getAll(), tyreService.getAll(),
      maintenanceService.getAll(),
    ]);
    if (t.success) setTrips(t.data ?? []); else console.error("ReportsScreen: tripService.getAll failed", t.error);
    if (v.success) setVehicles(v.data ?? []); else console.error("ReportsScreen: vehicleService.getAll failed", v.error);
    if (d.success) setDrivers(d.data ?? []); else console.error("ReportsScreen: driverService.getAll failed", d.error);
    if (f.success) setFuel(f.data ?? []); else console.error("ReportsScreen: fuelService.getAll failed", f.error);
    if (tl.success) setTolls(tl.data ?? []); else console.error("ReportsScreen: tollService.getAll failed", tl.error);
    if (m.success) setMisc(m.data ?? []); else console.error("ReportsScreen: miscExpenseService.getAll failed", m.error);
    if (ty.success) setTyres(ty.data ?? []); else console.error("ReportsScreen: tyreService.getAll failed", ty.error);
    if (mt.success) setMaintenance(mt.data ?? []); else console.error("ReportsScreen: maintenanceService.getAll failed", mt.error);
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load, firmVersion]));

  const vehicleMap = useMemo(() => { const m: Record<string, string> = {}; for (const v of vehicles) m[v.id] = v.registration_number; return m; }, [vehicles]);
  const driverMap = useMemo(() => { const m: Record<string, string> = {}; for (const d of drivers) m[d.id] = d.name; return m; }, [drivers]);
  const tripsById = useMemo(() => { const m: Record<string, Trip> = {}; for (const t of trips) m[t.id] = t; return m; }, [trips]);

  function segmentKey(vehicleId: string | null, tripId: string | null): string {
    if (segment === "all") return "all";
    if (segment === "vehicle") return vehicleId ?? "unassigned";
    const trip = tripId ? tripsById[tripId] : null;
    if (segment === "driver") return trip?.driver_id ?? "unassigned";
    if (segment === "route") return trip ? `${trip.origin} → ${trip.destination}` : "unassigned";
    return "all";
  }

  function segmentLabel(key: string): string {
    if (key === "all") return "All";
    if (key === "unassigned") return "Unassigned";
    if (segment === "vehicle") return vehicleMap[key] ?? key;
    if (segment === "driver") return driverMap[key] ?? key;
    return key;
  }

  const rows = useMemo(() => {
    const totals: Record<string, number> = {};
    const bump = (key: string, amt: number) => { totals[key] = (totals[key] || 0) + amt; };

    if (reportType === "trip") {
      for (const t of trips) if (inRange(t.start_date, dateFrom, dateTo)) bump(segmentKey(t.vehicle_id, t.id), t.freight_amount || 0);
    } else if (reportType === "expense") {
      for (const f of fuel) if (inRange(f.date, dateFrom, dateTo)) bump(segmentKey(f.vehicle_id, f.trip_id), f.amount);
      for (const t of tolls) if (inRange(t.date, dateFrom, dateTo)) bump(segmentKey(t.vehicle_id, t.trip_id), t.amount);
      for (const m of misc) if (inRange(m.date, dateFrom, dateTo)) bump(segmentKey(m.vehicle_id, m.trip_id), m.amount);
    } else if (reportType === "tyre") {
      for (const t of tyres) if (inRange(t.date, dateFrom, dateTo)) bump(segmentKey(t.vehicle_id, null), t.amount);
    } else if (reportType === "pl") {
      for (const t of trips) if (t.payment_status === "received" && inRange(t.start_date, dateFrom, dateTo)) bump(segmentKey(t.vehicle_id, t.id), t.freight_amount || 0);
      for (const f of fuel) if (inRange(f.date, dateFrom, dateTo)) bump(segmentKey(f.vehicle_id, f.trip_id), -f.amount);
      for (const t of tolls) if (inRange(t.date, dateFrom, dateTo)) bump(segmentKey(t.vehicle_id, t.trip_id), -t.amount);
      for (const m of misc) if (inRange(m.date, dateFrom, dateTo)) bump(segmentKey(m.vehicle_id, m.trip_id), -m.amount);
      for (const t of tyres) if (inRange(t.date, dateFrom, dateTo)) bump(segmentKey(t.vehicle_id, null), -t.amount);
    }

    return Object.entries(totals)
      .map(([key, amount]) => ({ key, label: segmentLabel(key), amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [reportType, segment, trips, fuel, tolls, misc, tyres, dateFrom, dateTo, vehicleMap, driverMap, tripsById]);

  const expenseBreakdown = useMemo(() => {
    const totals: Record<string, number> = {
      fuel: fuel.filter((f) => inRange(f.date, dateFrom, dateTo)).reduce((s, f) => s + f.amount, 0),
      toll: tolls.filter((t) => inRange(t.date, dateFrom, dateTo)).reduce((s, t) => s + t.amount, 0),
      tyre: tyres.filter((t) => inRange(t.date, dateFrom, dateTo)).reduce((s, t) => s + t.amount, 0),
      maintenance: maintenance
        .filter((m) => m.last_done_date && inRange(m.last_done_date, dateFrom, dateTo))
        .reduce((s, m) => s + m.amount, 0),
      misc: misc.filter((m) => inRange(m.date, dateFrom, dateTo)).reduce((s, m) => s + m.amount, 0),
    };
    const total = Object.values(totals).reduce((s, v) => s + v, 0);
    const labels: Record<string, string> = { fuel: "Fuel", toll: "Toll", tyre: "Tyres", maintenance: "Maintenance", misc: "Misc" };
    return Object.entries(totals)
      .map(([key, amount]) => ({ key, label: labels[key], amount, pct: total > 0 ? Math.round((amount / total) * 100) : 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [fuel, tolls, tyres, maintenance, misc, dateFrom, dateTo]);

  async function handleExportCsv() {
    if (rows.length === 0) return Alert.alert("Nothing to export", "No data in the selected range.");
    setExporting(true);
    try {
      const reportLabel = REPORT_TYPES.find((r) => r.key === reportType)!.label;
      const lines = ["Segment,Amount", ...rows.map((r) => `"${r.label.replace(/"/g, '""')}",${r.amount}`)];
      const csv = lines.join("\n");
      const filename = `${reportLabel.replace(/\s+/g, "_")}_${dateFrom}_to_${dateTo}.csv`;
      const file = new File(Paths.cache, filename);
      if (file.exists) file.delete();
      file.create();
      file.write(csv);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: "text/csv", dialogTitle: reportLabel });
      } else {
        Alert.alert("Saved", `Report saved to ${file.uri}`);
      }
    } catch (e: any) {
      Alert.alert("Couldn't export", e?.message ?? "Please try again.");
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <ScreenHeader title="Reports" />
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title="Reports" />
      <ScrollView contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.stackGap, paddingBottom: 32 }}>
        <Card>
          <ChipPicker label="Report Type" options={REPORT_TYPES.map((r) => r.label)} value={REPORT_TYPES.find((r) => r.key === reportType)!.label} onChange={(v) => setReportType(REPORT_TYPES.find((r) => r.label === v)!.key)} />
          <ChipPicker label="Segment (group by)" options={SEGMENTS.map((s) => s.label)} value={SEGMENTS.find((s) => s.key === segment)!.label} onChange={(v) => setSegment(SEGMENTS.find((s) => s.label === v)!.key)} />
          <DateField label="From" value={dateFrom} onChange={setDateFrom} />
          <DateField label="To" value={dateTo} onChange={setDateTo} />
          <TouchableOpacity style={[styles.exportBtn, exporting && { opacity: 0.6 }]} onPress={handleExportCsv} disabled={exporting}>
            {exporting ? <ActivityIndicator color="white" /> : (
              <>
                <MaterialIcons name="file-download" size={16} color="white" />
                <Text style={styles.exportBtnText}>Export CSV</Text>
              </>
            )}
          </TouchableOpacity>
        </Card>

        <Card>
          <Text style={styles.sectionHeading}>Expense Breakdown</Text>
          {expenseBreakdown.every((e) => e.amount === 0) ? (
            <Text style={{ color: colors.onSurfaceVariant }}>No expenses in this range.</Text>
          ) : (
            <View style={{ gap: 12 }}>
              {expenseBreakdown.map((e) => (
                <View key={e.key}>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>{e.label}</Text>
                    <Text style={styles.breakdownAmount}>{formatCurrency(e.amount)} · {e.pct}%</Text>
                  </View>
                  <View style={styles.breakdownBarTrack}>
                    <View style={[styles.breakdownBarFill, { width: `${e.pct}%` }]} />
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>

        {rows.length === 0 ? (
          <Card><Text style={{ color: colors.onSurfaceVariant }}>No data in this range.</Text></Card>
        ) : (
          <View style={{ gap: spacing.stackGap }}>
            {rows.map((r) => (
              <Card key={r.key}>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>{r.label}</Text>
                  <Text style={[styles.rowValue, r.amount < 0 ? { color: colors.error } : null]}>{formatCurrency(r.amount)}</Text>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  exportBtn: { flexDirection: "row", gap: 6, backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: 12, alignItems: "center", justifyContent: "center", marginTop: 4 },
  exportBtnText: { color: "white", fontWeight: "700" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowLabel: { ...type.bodyLg, fontWeight: "600", color: colors.onSurface },
  rowValue: { ...type.bodyLg, fontWeight: "700", color: colors.onBackground },
  sectionHeading: { ...type.labelMd, color: colors.onSurfaceVariant, textTransform: "uppercase", marginBottom: 12 },
  breakdownRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  breakdownLabel: { ...type.bodyMd, fontWeight: "600", color: colors.onSurface },
  breakdownAmount: { ...type.bodyMd, color: colors.onSurfaceVariant },
  breakdownBarTrack: { height: 6, borderRadius: radii.full, backgroundColor: colors.surfaceContainerHighest, overflow: "hidden" },
  breakdownBarFill: { height: 6, borderRadius: radii.full, backgroundColor: colors.primary },
});
