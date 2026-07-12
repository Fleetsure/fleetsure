import React, { useCallback, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { miscExpenseService } from "../../lib/services/miscExpenseService";
import { vehicleService } from "../../lib/services/vehicleService";
import { tripService } from "../../lib/services/tripService";
import { useFirm } from "../../context/FirmContext";
import Card from "../../components/Card";
import FormField from "../../components/FormField";
import DateField from "../../components/DateField";
import ChipPicker from "../../components/ChipPicker";
import DeleteButton from "../../components/DeleteButton";
import { colors, radii, spacing, type, formatCurrency } from "../../theme";
import type { MiscExpense, Vehicle, Trip } from "../../lib/types";

const CATEGORIES = ["fine", "parking", "halting", "loading_unloading", "cleaning", "battery", "weighbridge", "other"];
const CATEGORY_LABELS: Record<string, string> = {
  fine: "Fine / Penalty", parking: "Parking", halting: "Halting / Stay", loading_unloading: "Loading / Unloading",
  cleaning: "Cleaning / Washing", battery: "Battery", weighbridge: "Weighbridge", other: "Other",
};

export default function MiscExpensesScreen() {
  const { firmVersion } = useFirm();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<MiscExpense[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const [vehicleReg, setVehicleReg] = useState<string | null>(null);
  const [tripLabel, setTripLabel] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("other");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    const [logRes, vehRes, tripRes] = await Promise.all([miscExpenseService.getAll(), vehicleService.getAll(), tripService.getAll()]);
    if (logRes.success) setLogs(logRes.data ?? []);
    if (vehRes.success) setVehicles(vehRes.data ?? []);
    if (tripRes.success) setTrips(tripRes.data ?? []);
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load, firmVersion]));

  const vehicleMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const v of vehicles) m[v.id] = v.registration_number;
    return m;
  }, [vehicles]);

  const totalSpend = useMemo(() => logs.reduce((s, l) => s + l.amount, 0), [logs]);

  const thisMonthSpend = useMemo(() => {
    const key = new Date().toISOString().slice(0, 7);
    return logs.filter((l) => l.date.startsWith(key)).reduce((s, l) => s + l.amount, 0);
  }, [logs]);

  const topCategory = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const l of logs) totals[l.category] = (totals[l.category] || 0) + l.amount;
    const top = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
    return top ? CATEGORY_LABELS[top[0]] ?? top[0] : "—";
  }, [logs]);

  const selectedVehicle = vehicles.find((v) => v.registration_number === vehicleReg);
  const tripOptions = useMemo(
    () => trips.filter((t) => !selectedVehicle || t.vehicle_id === selectedVehicle.id)
      .map((t) => ({ id: t.id, label: `${t.origin} → ${t.destination}` })),
    [trips, selectedVehicle]
  );

  function resetForm() {
    setVehicleReg(null); setTripLabel(null); setDate(new Date().toISOString().slice(0, 10));
    setAmount(""); setCategory("other"); setDescription(""); setNotes("");
  }

  async function handleSave() {
    if (!amount) return Alert.alert("Missing details", "Amount is required.");
    const vehicle = vehicles.find((v) => v.registration_number === vehicleReg);
    const trip = tripOptions.find((t) => t.label === tripLabel);
    setSaving(true);
    const res = await miscExpenseService.add({
      vehicle_id: vehicle?.id ?? null,
      trip_id: trip?.id ?? null,
      date,
      amount: Number(amount),
      category,
      description: description || null,
      notes: notes || null,
    });
    setSaving(false);
    if (res.success) {
      resetForm();
      setShowAdd(false);
      load();
    } else {
      Alert.alert("Couldn't save", res.error ?? "Please try again.");
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View>
      <View style={styles.statRow}>
        <StatCell label="Entries" value={String(logs.length)} />
        <StatCell label="Total Spend" value={formatCurrency(totalSpend)} />
      </View>
      <View style={styles.statRow}>
        <StatCell label="This Month" value={formatCurrency(thisMonthSpend)} />
        <StatCell label="Top Category" value={topCategory} />
      </View>

      <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd((v) => !v)}>
        <MaterialIcons name={showAdd ? "close" : "add"} size={16} color={colors.onPrimaryContainer} />
        <Text style={styles.addBtnText}>{showAdd ? "Cancel" : "Add Expense"}</Text>
      </TouchableOpacity>

      {showAdd ? (
        <Card style={{ marginBottom: spacing.stackGap }}>
          <ChipPicker
            label="Category"
            options={CATEGORIES}
            value={category}
            onChange={setCategory}
          />
          <DateField label="Date" required value={date} onChange={setDate} />
          <FormField label="Amount (₹)" required value={amount} onChangeText={setAmount} placeholder="0" keyboardType="numeric" />
          {vehicles.length > 0 ? (
            <ChipPicker label="Vehicle (optional)" options={vehicles.map((v) => v.registration_number)} value={vehicleReg} onChange={(v) => { setVehicleReg(v); setTripLabel(null); }} />
          ) : null}
          {tripOptions.length > 0 ? (
            <ChipPicker label="Link to Trip (optional)" options={tripOptions.map((t) => t.label)} value={tripLabel} onChange={setTripLabel} />
          ) : null}
          <FormField label="Description" value={description} onChangeText={setDescription} placeholder="Optional" />
          <FormField label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional" />
          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Save</Text>}
          </TouchableOpacity>
        </Card>
      ) : null}

      {logs.length === 0 ? (
        <Card><Text style={{ color: colors.onSurfaceVariant }}>No misc expenses yet.</Text></Card>
      ) : (
        <View style={{ gap: spacing.stackGap }}>
          {logs.map((l) => (
            <Card key={l.id}>
              <View style={styles.row}>
                <View>
                  <Text style={styles.primaryText}>{CATEGORY_LABELS[l.category] ?? l.category}</Text>
                  <Text style={styles.metaText}>
                    {new Date(l.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    {l.vehicle_id ? ` · ${vehicleMap[l.vehicle_id] ?? "—"}` : ""}
                    {l.description ? ` · ${l.description}` : ""}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Text style={styles.amountText}>{formatCurrency(l.amount)}</Text>
                  <DeleteButton label="expense" onDelete={() => miscExpenseService.delete(l.id)} onDeleted={load} />
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}
    </View>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <Card style={{ flex: 1 }}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  center: { paddingVertical: 40, alignItems: "center" },
  statRow: { flexDirection: "row", gap: 8, marginBottom: spacing.stackGap },
  statLabel: { ...type.labelMd, color: colors.onSurfaceVariant, marginBottom: 4 },
  statValue: { ...type.headlineSm, color: colors.onBackground },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: colors.primaryContainer, borderRadius: radii.md, paddingVertical: 10, marginBottom: spacing.stackGap },
  addBtnText: { ...type.labelMd, color: colors.onPrimaryContainer },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: 12, alignItems: "center", marginTop: 4 },
  saveBtnText: { color: "white", fontWeight: "700" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  primaryText: { ...type.bodyLg, fontWeight: "600", color: colors.onSurface },
  metaText: { fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
  amountText: { ...type.bodyLg, fontWeight: "700", color: colors.primary },
});
