import React, { useCallback, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { tollService } from "../../lib/services/tollService";
import { vehicleService } from "../../lib/services/vehicleService";
import { tripService } from "../../lib/services/tripService";
import { useFirm } from "../../context/FirmContext";
import ScreenHeader from "../../components/ScreenHeader";
import Card from "../../components/Card";
import FormField from "../../components/FormField";
import DateField from "../../components/DateField";
import ChipPicker from "../../components/ChipPicker";
import DeleteButton from "../../components/DeleteButton";
import { colors, radii, spacing, type, formatCurrency } from "../../theme";
import type { TollLog, Vehicle, Trip } from "../../lib/types";

const PAYMENT_MODES = ["cash", "fastag"];

export default function TollsScreen() {
  const { firmVersion } = useFirm();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<TollLog[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const [vehicleReg, setVehicleReg] = useState<string | null>(null);
  const [tripLabel, setTripLabel] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [tollPlaza, setTollPlaza] = useState("");
  const [route, setRoute] = useState("");
  const [notes, setNotes] = useState("");
  const [receipt, setReceipt] = useState<{ uri: string; name: string; mimeType: string | null } | null>(null);

  const load = useCallback(async () => {
    const [logRes, vehRes, tripRes] = await Promise.all([tollService.getAll(), vehicleService.getAll(), tripService.getAll()]);
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

  const selectedVehicle = vehicles.find((v) => v.registration_number === vehicleReg);
  const tripOptions = useMemo(
    () => trips.filter((t) => !selectedVehicle || t.vehicle_id === selectedVehicle.id)
      .map((t) => ({ id: t.id, label: `${t.origin} → ${t.destination}` })),
    [trips, selectedVehicle]
  );

  function resetForm() {
    setVehicleReg(null); setTripLabel(null); setDate(new Date().toISOString().slice(0, 10));
    setAmount(""); setPaymentMode("cash"); setTollPlaza(""); setRoute(""); setNotes(""); setReceipt(null);
  }

  async function handlePickReceipt() {
    const res = await DocumentPicker.getDocumentAsync({ type: ["image/*", "application/pdf"], copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    setReceipt({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? null });
  }

  async function handleSave() {
    const vehicle = vehicles.find((v) => v.registration_number === vehicleReg);
    if (!vehicle) return Alert.alert("Vehicle required", "Select a vehicle.");
    if (!amount) return Alert.alert("Missing details", "Amount is required.");
    setSaving(true);
    let receiptUrl: string | null = null;
    if (receipt) {
      const uploadRes = await tollService.uploadReceipt(receipt);
      if (!uploadRes.success) { setSaving(false); return Alert.alert("Couldn't upload receipt", uploadRes.error ?? "Please try again."); }
      receiptUrl = uploadRes.data ?? null;
    }
    const trip = tripOptions.find((t) => t.label === tripLabel);
    const res = await tollService.add({
      vehicle_id: vehicle.id,
      trip_id: trip?.id ?? null,
      date,
      amount: Number(amount),
      payment_mode: paymentMode,
      toll_plaza: tollPlaza || null,
      route: route || null,
      notes: notes || null,
      receipt_url: receiptUrl,
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
    return (
      <SafeAreaView style={styles.root}>
        <ScreenHeader title="Tolls" />
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title="Tolls" />
      <ScrollView contentContainerStyle={{ padding: spacing.containerMargin, paddingBottom: 32 }}>
      <View style={styles.statRow}>
        <StatCell label="Entries" value={String(logs.length)} />
        <StatCell label="Total Spend" value={formatCurrency(totalSpend)} />
      </View>

      <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd((v) => !v)}>
        <MaterialIcons name={showAdd ? "close" : "add"} size={16} color={colors.onPrimaryContainer} />
        <Text style={styles.addBtnText}>{showAdd ? "Cancel" : "Add Toll Entry"}</Text>
      </TouchableOpacity>

      {showAdd ? (
        <Card style={{ marginBottom: spacing.stackGap }}>
          <ChipPicker label="Vehicle" options={vehicles.map((v) => v.registration_number)} value={vehicleReg} onChange={(v) => { setVehicleReg(v); setTripLabel(null); }} />
          {tripOptions.length > 0 ? (
            <ChipPicker label="Link to Trip (optional)" options={tripOptions.map((t) => t.label)} value={tripLabel} onChange={setTripLabel} />
          ) : null}
          <DateField label="Date" required value={date} onChange={setDate} />
          <FormField label="Amount (₹)" required value={amount} onChangeText={setAmount} placeholder="0" keyboardType="numeric" />
          <ChipPicker label="Payment Mode" options={PAYMENT_MODES} value={paymentMode} onChange={setPaymentMode} />
          <FormField label="Toll Plaza" value={tollPlaza} onChangeText={setTollPlaza} placeholder="e.g. Kherki Daula" />
          <FormField label="Route / Highway" value={route} onChangeText={setRoute} placeholder="e.g. NH48" />
          <FormField label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional" />
          <TouchableOpacity style={styles.pickBtn} onPress={handlePickReceipt}>
            <MaterialIcons name="attach-file" size={18} color={colors.primary} />
            <Text style={styles.pickBtnText}>{receipt ? receipt.name : "Attach receipt (optional)"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Save</Text>}
          </TouchableOpacity>
        </Card>
      ) : null}

      {logs.length === 0 ? (
        <Card><Text style={{ color: colors.onSurfaceVariant }}>No toll entries yet.</Text></Card>
      ) : (
        <View style={{ gap: spacing.stackGap }}>
          {logs.map((l) => (
            <Card key={l.id}>
              <View style={styles.row}>
                <View>
                  <Text style={styles.primaryText}>{vehicleMap[l.vehicle_id] ?? "—"}</Text>
                  <Text style={styles.metaText}>
                    {new Date(l.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {l.payment_mode === "fastag" ? "FASTag" : "Cash"}{l.toll_plaza ? ` · ${l.toll_plaza}` : ""}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Text style={styles.amountText}>{formatCurrency(l.amount)}</Text>
                  <DeleteButton label="toll entry" onDelete={() => tollService.delete(l.id)} onDeleted={load} />
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}
      </ScrollView>
    </SafeAreaView>
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
  root: { flex: 1, backgroundColor: colors.background },
  center: { paddingVertical: 40, alignItems: "center" },
  statRow: { flexDirection: "row", gap: 8, marginBottom: spacing.stackGap },
  statLabel: { ...type.labelMd, color: colors.onSurfaceVariant, marginBottom: 4 },
  statValue: { ...type.headlineSm, color: colors.onBackground },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: colors.primaryContainer, borderRadius: radii.md, paddingVertical: 10, marginBottom: spacing.stackGap },
  addBtnText: { ...type.labelMd, color: colors.onPrimaryContainer },
  pickBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1.5, borderColor: colors.outlineVariant, borderStyle: "dashed", borderRadius: radii.md, padding: 12, marginBottom: 4 },
  pickBtnText: { ...type.bodyMd, color: colors.onSurfaceVariant, flexShrink: 1 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: 12, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "white", fontWeight: "700" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  primaryText: { ...type.bodyLg, fontWeight: "600", color: colors.onSurface },
  metaText: { fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
  amountText: { ...type.bodyLg, fontWeight: "700", color: colors.primary },
});
