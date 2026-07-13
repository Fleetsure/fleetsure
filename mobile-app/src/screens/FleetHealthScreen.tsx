import { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { vehicleService } from "../lib/services/vehicleService";
import { driverService } from "../lib/services/driverService";
import { batteryService } from "../lib/services/batteryService";
import { maintenanceService } from "../lib/services/maintenanceService";
import { useFirm } from "../context/FirmContext";
import ScreenHeader from "../components/ScreenHeader";
import Card from "../components/Card";
import StatusBadge from "../components/StatusBadge";
import FormField from "../components/FormField";
import DateField from "../components/DateField";
import ChipPicker from "../components/ChipPicker";
import DeleteButton from "../components/DeleteButton";
import { colors, radii, spacing, type, formatCurrency } from "../theme";
import type { Vehicle, Driver, VehicleBattery } from "../lib/types";
import type { MaintenanceSchedule } from "../lib/services/maintenanceService";

const CHECKS = [
  { key: "insurance_expiry", label: "Insurance" },
  { key: "fitness_expiry", label: "Fitness" },
  { key: "puc_expiry", label: "PUC" },
  { key: "permit_expiry", label: "Permit" },
] as const;

const CONDITIONS = ["good", "weak", "dead"];
const FREQUENCIES = ["monthly", "quarterly", "yearly", "one_time"];

function daysLeft(d: string | null): number | null {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
}

function statusOf(d: string | null): { label: string; tone: "success" | "warning" | "neutral" | "info" } {
  const days = daysLeft(d);
  if (days === null) return { label: "Missing", tone: "neutral" };
  if (days < 0) return { label: "Expired", tone: "warning" };
  if (days <= 30) return { label: `${days}d left`, tone: "warning" };
  return { label: "OK", tone: "success" };
}

export default function FleetHealthScreen() {
  const { firmVersion } = useFirm();
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [batteries, setBatteries] = useState<VehicleBattery[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceSchedule[]>([]);
  const [showBatteryForm, setShowBatteryForm] = useState(false);
  const [showMaintForm, setShowMaintForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [vehicleReg, setVehicleReg] = useState<string | null>(null);
  const [brand, setBrand] = useState("");
  const [capacity, setCapacity] = useState("");
  const [condition, setCondition] = useState("good");
  const [installDate, setInstallDate] = useState(new Date().toISOString().slice(0, 10));
  const [warrantyExpiry, setWarrantyExpiry] = useState("");
  const [batteryCost, setBatteryCost] = useState("");

  const [maintVehicleReg, setMaintVehicleReg] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [amount, setAmount] = useState("");
  const [lastDone, setLastDone] = useState(new Date().toISOString().slice(0, 10));
  const [nextDue, setNextDue] = useState("");

  const load = useCallback(async () => {
    const [vehRes, drvRes, battRes, maintRes] = await Promise.all([
      vehicleService.getAll(), driverService.getAll(), batteryService.getAll(), maintenanceService.getAll(),
    ]);
    if (vehRes.success) setVehicles(vehRes.data ?? []);
    if (drvRes.success) setDrivers(drvRes.data ?? []);
    if (battRes.success) setBatteries(battRes.data ?? []);
    if (maintRes.success) setMaintenance(maintRes.data ?? []);
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load, firmVersion]));

  const vehicleMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const v of vehicles) m[v.id] = v.registration_number;
    return m;
  }, [vehicles]);

  const fleetStats = useMemo(() => {
    let expired = 0, expiring = 0, compliant = 0;
    for (const v of vehicles) {
      const statuses = CHECKS.map((c) => statusOf((v as any)[c.key]));
      if (statuses.some((s) => s.label === "Expired")) expired++;
      else if (statuses.some((s) => s.label.endsWith("d left"))) expiring++;
      else if (statuses.every((s) => s.label === "OK")) compliant++;
    }
    return { expired, expiring, compliant, total: vehicles.length };
  }, [vehicles]);

  function complianceScore(v: Vehicle): number {
    const statuses = CHECKS.map((c) => statusOf((v as any)[c.key]));
    const ok = statuses.filter((s) => s.label === "OK").length;
    return Math.round((ok / CHECKS.length) * 100);
  }

  async function handleSaveBattery() {
    const vehicle = vehicles.find((v) => v.registration_number === vehicleReg);
    if (!vehicle) return Alert.alert("Vehicle required", "Select a vehicle.");
    setSaving(true);
    const res = await batteryService.add({
      vehicle_id: vehicle.id, brand: brand || null, capacity_ah: capacity ? Number(capacity) : null,
      condition, installation_date: installDate || null,
      warranty_expiry: warrantyExpiry || null, cost: batteryCost ? Number(batteryCost) : null, notes: null,
    });
    setSaving(false);
    if (res.success) {
      setVehicleReg(null); setBrand(""); setCapacity(""); setCondition("good");
      setInstallDate(new Date().toISOString().slice(0, 10)); setWarrantyExpiry(""); setBatteryCost("");
      setShowBatteryForm(false);
      load();
    } else Alert.alert("Couldn't save", res.error ?? "Please try again.");
  }

  async function handleSaveMaintenance() {
    const vehicle = vehicles.find((v) => v.registration_number === maintVehicleReg);
    if (!vehicle || !description.trim() || !amount) return Alert.alert("Missing details", "Vehicle, description and amount are required.");
    setSaving(true);
    const res = await maintenanceService.add({
      vehicle_id: vehicle.id, description: description.trim(), frequency, amount: Number(amount),
      last_done_date: lastDone || null, next_due_date: nextDue || null,
    });
    setSaving(false);
    if (res.success) {
      setMaintVehicleReg(null); setDescription(""); setFrequency("monthly"); setAmount("");
      setLastDone(new Date().toISOString().slice(0, 10)); setNextDue("");
      setShowMaintForm(false);
      load();
    } else Alert.alert("Couldn't save", res.error ?? "Please try again.");
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <ScreenHeader title="Fleet Health" />
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title="Fleet Health" />
      <ScrollView contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.sectionGap, paddingBottom: 32 }}>
        <View style={styles.statGrid}>
          <StatCell label="Compliant" value={String(fleetStats.compliant)} color={colors.success} />
          <StatCell label="Expiring" value={String(fleetStats.expiring)} color={colors.warning} />
          <StatCell label="Expired" value={String(fleetStats.expired)} color={colors.error} />
        </View>

        <View>
          <Text style={styles.sectionTitle}>Vehicle Compliance</Text>
          <View style={{ gap: spacing.stackGap }}>
            {vehicles.length === 0 ? <Card><Text style={{ color: colors.onSurfaceVariant }}>No vehicles yet.</Text></Card> : null}
            {vehicles.map((v) => {
              const score = complianceScore(v);
              return (
                <Card key={v.id}>
                  <View style={styles.row}>
                    <Text style={styles.cardTitle}>{v.registration_number}</Text>
                    <Text style={[styles.scoreText, { color: score === 100 ? colors.success : score >= 50 ? colors.warning : colors.error }]}>{score}%</Text>
                  </View>
                  <View style={styles.checkGrid}>
                    {CHECKS.map((c) => {
                      const st = statusOf((v as any)[c.key]);
                      return (
                        <View key={c.key} style={styles.checkCell}>
                          <Text style={styles.checkLabel}>{c.label}</Text>
                          <StatusBadge label={st.label} tone={st.tone} />
                        </View>
                      );
                    })}
                  </View>
                </Card>
              );
            })}
          </View>
        </View>

        <View>
          <Text style={styles.sectionTitle}>Driver License Compliance</Text>
          <View style={{ gap: spacing.stackGap }}>
            {drivers.length === 0 ? <Card><Text style={{ color: colors.onSurfaceVariant }}>No drivers yet.</Text></Card> : null}
            {drivers.map((d) => {
              const licSt = statusOf(d.license_expiry);
              const transSt = statusOf(d.transport_validity);
              return (
                <Card key={d.id}>
                  <Text style={styles.cardTitle}>{d.name}</Text>
                  <View style={styles.checkGrid}>
                    <View style={styles.checkCell}>
                      <Text style={styles.checkLabel}>License</Text>
                      <StatusBadge label={licSt.label} tone={licSt.tone} />
                    </View>
                    <View style={styles.checkCell}>
                      <Text style={styles.checkLabel}>Transport Validity</Text>
                      <StatusBadge label={transSt.label} tone={transSt.tone} />
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        </View>

        <View>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Battery Status</Text>
            <TouchableOpacity onPress={() => setShowBatteryForm((v) => !v)}>
              <MaterialIcons name={showBatteryForm ? "close" : "add-circle"} size={22} color={colors.primaryContainer} />
            </TouchableOpacity>
          </View>
          {showBatteryForm ? (
            <Card style={{ marginBottom: spacing.stackGap }}>
              <ChipPicker label="Vehicle" options={vehicles.map((v) => v.registration_number)} value={vehicleReg} onChange={setVehicleReg} />
              <FormField label="Brand" value={brand} onChangeText={setBrand} placeholder="e.g. Exide" />
              <FormField label="Capacity (Ah)" value={capacity} onChangeText={setCapacity} placeholder="150" keyboardType="numeric" />
              <ChipPicker label="Condition" options={CONDITIONS} value={condition} onChange={setCondition} />
              <DateField label="Installation Date" value={installDate} onChange={setInstallDate} />
              <DateField label="Warranty Expiry" value={warrantyExpiry} onChange={setWarrantyExpiry} placeholder="Optional" />
              <FormField label="Cost (₹)" value={batteryCost} onChangeText={setBatteryCost} placeholder="Optional" keyboardType="numeric" />
              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSaveBattery} disabled={saving}>
                {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Save Battery</Text>}
              </TouchableOpacity>
            </Card>
          ) : null}
          <View style={{ gap: spacing.stackGap }}>
            {batteries.length === 0 ? <Card><Text style={{ color: colors.onSurfaceVariant }}>No batteries logged yet.</Text></Card> : null}
            {batteries.map((b) => {
              const warrSt = statusOf(b.warranty_expiry);
              return (
                <Card key={b.id}>
                  <View style={styles.row}>
                    <View>
                      <Text style={styles.cardTitle}>{vehicleMap[b.vehicle_id] ?? "—"}</Text>
                      <Text style={styles.metaText}>
                        {b.brand ?? "—"}{b.capacity_ah ? ` · ${b.capacity_ah}Ah` : ""} · {b.condition ?? "—"}{b.cost ? ` · ${formatCurrency(b.cost)}` : ""}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      {b.warranty_expiry ? <StatusBadge label={warrSt.label} tone={warrSt.tone} /> : null}
                      <DeleteButton label="battery" onDelete={() => batteryService.delete(b.id)} onDeleted={load} />
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        </View>

        <View>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Scheduled Maintenance</Text>
            <TouchableOpacity onPress={() => setShowMaintForm((v) => !v)}>
              <MaterialIcons name={showMaintForm ? "close" : "add-circle"} size={22} color={colors.primaryContainer} />
            </TouchableOpacity>
          </View>
          {showMaintForm ? (
            <Card style={{ marginBottom: spacing.stackGap }}>
              <ChipPicker label="Vehicle" options={vehicles.map((v) => v.registration_number)} value={maintVehicleReg} onChange={setMaintVehicleReg} />
              <FormField label="Description" required value={description} onChangeText={setDescription} placeholder="e.g. Oil Change" />
              <ChipPicker label="Frequency" options={FREQUENCIES} value={frequency} onChange={setFrequency} />
              <FormField label="Amount (₹)" required value={amount} onChangeText={setAmount} placeholder="0" keyboardType="numeric" />
              <DateField label="Last Done Date" value={lastDone} onChange={setLastDone} />
              <DateField label="Next Due Date" value={nextDue} onChange={setNextDue} placeholder="Optional" />
              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSaveMaintenance} disabled={saving}>
                {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Save Item</Text>}
              </TouchableOpacity>
            </Card>
          ) : null}
          <View style={{ gap: spacing.stackGap }}>
            {maintenance.length === 0 ? <Card><Text style={{ color: colors.onSurfaceVariant }}>No maintenance items yet.</Text></Card> : null}
            {maintenance.map((m) => {
              const dueSt = statusOf(m.next_due_date);
              return (
                <Card key={m.id}>
                  <View style={styles.row}>
                    <View>
                      <Text style={styles.cardTitle}>{vehicleMap[m.vehicle_id] ?? "—"} · {m.description}</Text>
                      <Text style={styles.metaText}>{m.frequency} · {formatCurrency(m.amount)}</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      {m.next_due_date ? <StatusBadge label={dueSt.label} tone={dueSt.tone} /> : null}
                      <DeleteButton label="maintenance item" onDelete={() => maintenanceService.delete(m.id)} onDeleted={load} />
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Card style={{ flex: 1 }}>
      <Text style={styles.checkLabel}>{label}</Text>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  statGrid: { flexDirection: "row", gap: 8 },
  statValue: { ...type.headlineSm, color: colors.onBackground, marginTop: 4 },
  scoreText: { fontWeight: "800", fontSize: 15 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.stackGap },
  sectionTitle: { ...type.headlineSm, color: colors.onBackground, marginBottom: spacing.stackGap },
  cardTitle: { ...type.bodyLg, fontWeight: "600", color: colors.onSurface, marginBottom: 8 },
  checkGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  checkCell: { gap: 4 },
  checkLabel: { fontSize: 10, color: colors.onSurfaceVariant, textTransform: "uppercase", fontWeight: "600" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  metaText: { fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: 12, alignItems: "center", marginTop: 4 },
  saveBtnText: { color: "white", fontWeight: "700" },
});
