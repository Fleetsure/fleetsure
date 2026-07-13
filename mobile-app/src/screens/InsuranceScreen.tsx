import { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { insuranceService } from "../lib/services/insuranceService";
import { vehicleService } from "../lib/services/vehicleService";
import { useFirm } from "../context/FirmContext";
import ScreenHeader from "../components/ScreenHeader";
import Card from "../components/Card";
import StatusBadge from "../components/StatusBadge";
import FormField from "../components/FormField";
import DateField from "../components/DateField";
import ChipPicker from "../components/ChipPicker";
import DeleteButton from "../components/DeleteButton";
import { colors, radii, spacing, type, formatCurrency } from "../theme";
import type { InsurancePolicy, Vehicle } from "../lib/types";

const POLICY_TYPES = ["insurance", "fitness", "permit", "puc", "road_tax", "other"];
const POLICY_LABELS: Record<string, string> = { insurance: "Insurance", fitness: "Fitness", permit: "Permit", puc: "PUC", road_tax: "Road Tax", other: "Other" };

const STATUS_TONE: Record<string, "success" | "warning" | "neutral"> = { active: "success", expiring_soon: "warning", expired: "warning" };
const STATUS_LABEL: Record<string, string> = { active: "Active", expiring_soon: "Expiring Soon", expired: "Expired" };

export default function InsuranceScreen() {
  const { firmVersion } = useFirm();
  const [loading, setLoading] = useState(true);
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const [vehicleReg, setVehicleReg] = useState<string | null>(null);
  const [policyType, setPolicyType] = useState("insurance");
  const [policyNumber, setPolicyNumber] = useState("");
  const [insurer, setInsurer] = useState("");
  const [startDate, setStartDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [premium, setPremium] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    const [polRes, vehRes] = await Promise.all([insuranceService.getAll(), vehicleService.getAll()]);
    if (polRes.success) setPolicies(polRes.data ?? []);
    if (vehRes.success) setVehicles(vehRes.data ?? []);
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load, firmVersion]));

  const vehicleMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const v of vehicles) m[v.id] = v.registration_number;
    return m;
  }, [vehicles]);

  const filtered = useMemo(() => (filterType ? policies.filter((p) => p.policy_type === filterType) : policies), [policies, filterType]);

  const stats = useMemo(() => ({
    total: policies.length,
    active: policies.filter((p) => p.status === "active").length,
    expiringSoon: policies.filter((p) => p.status === "expiring_soon").length,
    expired: policies.filter((p) => p.status === "expired").length,
  }), [policies]);

  function resetForm() {
    setVehicleReg(null); setPolicyType("insurance"); setPolicyNumber(""); setInsurer("");
    setStartDate(""); setExpiryDate(""); setPremium(""); setNotes("");
  }

  async function handleSave() {
    const vehicle = vehicles.find((v) => v.registration_number === vehicleReg);
    if (!vehicle || !expiryDate) return Alert.alert("Missing details", "Vehicle and expiry date are required.");
    setSaving(true);
    const res = await insuranceService.create({
      vehicle_id: vehicle.id, policy_type: policyType as any, policy_number: policyNumber || null,
      insurer: insurer || null, start_date: startDate || null, expiry_date: expiryDate,
      premium: premium ? Number(premium) : null, notes: notes || null,
    });
    setSaving(false);
    if (res.success) { resetForm(); setShowAdd(false); load(); } else Alert.alert("Couldn't save", res.error ?? "Please try again.");
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <ScreenHeader title="Insurance & Renewals" />
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title="Insurance & Renewals" />
      <ScrollView contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.stackGap, paddingBottom: 32 }}>
        <View style={styles.statGrid}>
          <StatCell label="Total" value={String(stats.total)} />
          <StatCell label="Active" value={String(stats.active)} color={colors.success} />
          <StatCell label="Expiring" value={String(stats.expiringSoon)} color={colors.warning} />
          <StatCell label="Expired" value={String(stats.expired)} color={colors.error} />
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd((v) => !v)}>
          <MaterialIcons name={showAdd ? "close" : "add"} size={16} color={colors.onPrimaryContainer} />
          <Text style={styles.addBtnText}>{showAdd ? "Cancel" : "Add Policy"}</Text>
        </TouchableOpacity>

        {showAdd ? (
          <Card>
            <ChipPicker label="Vehicle" options={vehicles.map((v) => v.registration_number)} value={vehicleReg} onChange={setVehicleReg} />
            <ChipPicker label="Policy Type" options={POLICY_TYPES.map((t) => POLICY_LABELS[t])} value={POLICY_LABELS[policyType]} onChange={(v) => setPolicyType(POLICY_TYPES.find((t) => POLICY_LABELS[t] === v) ?? "insurance")} />
            <FormField label="Policy Number" value={policyNumber} onChangeText={setPolicyNumber} placeholder="Optional" />
            <FormField label="Insurer" value={insurer} onChangeText={setInsurer} placeholder="Optional" />
            <DateField label="Start Date" value={startDate} onChange={setStartDate} placeholder="Optional" />
            <DateField label="Expiry Date" required value={expiryDate} onChange={setExpiryDate} />
            <FormField label="Premium (₹)" value={premium} onChangeText={setPremium} placeholder="Optional" keyboardType="numeric" />
            <FormField label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional" />
            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Save Policy</Text>}
            </TouchableOpacity>
          </Card>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            <TouchableOpacity style={[styles.chip, filterType === null && styles.chipActive]} onPress={() => setFilterType(null)}>
              <Text style={[styles.chipText, filterType === null && styles.chipTextActive]}>All</Text>
            </TouchableOpacity>
            {POLICY_TYPES.map((t) => (
              <TouchableOpacity key={t} style={[styles.chip, filterType === t && styles.chipActive]} onPress={() => setFilterType(t)}>
                <Text style={[styles.chipText, filterType === t && styles.chipTextActive]}>{POLICY_LABELS[t]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {filtered.length === 0 ? (
          <Card><Text style={{ color: colors.onSurfaceVariant }}>No policies yet.</Text></Card>
        ) : (
          <View style={{ gap: spacing.stackGap }}>
            {filtered.map((p) => (
              <Card key={p.id}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docName}>{vehicleMap[p.vehicle_id] ?? "—"} · {POLICY_LABELS[p.policy_type] ?? p.policy_type}</Text>
                    <Text style={styles.docMeta}>
                      {p.insurer ?? "—"}{p.policy_number ? ` · ${p.policy_number}` : ""} · Expires {new Date(p.expiry_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </Text>
                    {p.premium ? <Text style={styles.docMeta}>Premium: {formatCurrency(p.premium)}</Text> : null}
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <StatusBadge label={STATUS_LABEL[p.status ?? "active"] ?? "—"} tone={STATUS_TONE[p.status ?? "active"] ?? "neutral"} />
                    <DeleteButton label="policy" onDelete={() => insuranceService.delete(p.id)} onDeleted={load} />
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

function StatCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Card style={{ flexBasis: "48%" }}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statLabel: { ...type.labelMd, color: colors.onSurfaceVariant, marginBottom: 4 },
  statValue: { ...type.headlineSm, color: colors.onBackground },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: colors.primaryContainer, borderRadius: radii.md, paddingVertical: 12 },
  addBtnText: { ...type.labelMd, color: colors.onPrimaryContainer },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: 12, alignItems: "center", marginTop: 4 },
  saveBtnText: { color: "white", fontWeight: "700" },
  chipRow: { flexDirection: "row", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.full, borderWidth: 1, borderColor: colors.outlineVariant, backgroundColor: colors.surfaceContainerLowest },
  chipActive: { backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.onSurfaceVariant },
  chipTextActive: { color: colors.onPrimaryContainer },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  docName: { ...type.bodyLg, fontWeight: "600", color: colors.onSurface },
  docMeta: { fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
});
