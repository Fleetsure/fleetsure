import { useCallback, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { tyreService, tyreRotationService, tyreScrapService } from "../../lib/services/tyreService";
import { getTyreSetup, saveTyreSetup, createDefaultSetup, type VehicleTyreSetup, type TyreUnit } from "../../lib/services/tyreSetupService";
import { vehicleService } from "../../lib/services/vehicleService";
import { useFirm } from "../../context/FirmContext";
import ScreenHeader from "../../components/ScreenHeader";
import Card from "../../components/Card";
import FormField from "../../components/FormField";
import DateField from "../../components/DateField";
import ChipPicker from "../../components/ChipPicker";
import DeleteButton from "../../components/DeleteButton";
import { colors, radii, spacing, type, formatCurrency } from "../../theme";
import type { TyreLog, TyreRotation, TyreScrap, Vehicle } from "../../lib/types";

const TYRE_TYPES = ["new", "recap", "repair", "balance", "alignment"];
const TYRE_TYPE_LABELS: Record<string, string> = { new: "New Tyre", recap: "Recap/Retread", repair: "Repair/Puncture", balance: "Wheel Balancing", alignment: "Wheel Alignment" };
const TYRE_COUNTS = ["4", "6", "8", "10", "12", "14", "16", "18"];
const CONSTRUCTIONS = ["nylon", "radial"];
const CONDITIONS = ["new", "remould"];
const TYRE_BRANDS = ["MRF", "Apollo", "Bridgestone", "CEAT", "JK Tyre", "Goodyear", "Michelin", "Other"];
const SUB_TABS = [{ key: "setup", label: "Tyre Setup" }, { key: "logs", label: "Expense Logs" }] as const;

export default function TyresScreen() {
  const { firmVersion } = useFirm();
  const [subTab, setSubTab] = useState<(typeof SUB_TABS)[number]["key"]>("setup");
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [logs, setLogs] = useState<TyreLog[]>([]);
  const [rotations, setRotations] = useState<TyreRotation[]>([]);
  const [scraps, setScraps] = useState<TyreScrap[]>([]);

  const load = useCallback(async () => {
    const [vehRes, logRes, rotRes, scrapRes] = await Promise.all([
      vehicleService.getAll(), tyreService.getAll(), tyreRotationService.getAll(), tyreScrapService.getAll(),
    ]);
    if (vehRes.success) setVehicles(vehRes.data ?? []);
    if (logRes.success) setLogs(logRes.data ?? []);
    if (rotRes.success) setRotations(rotRes.data ?? []);
    if (scrapRes.success) setScraps(scrapRes.data ?? []);
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load, firmVersion]));

  const vehicleMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const v of vehicles) m[v.id] = v.registration_number;
    return m;
  }, [vehicles]);

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <ScreenHeader title="Tyres" />
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title="Tyres" />
      <ScrollView contentContainerStyle={{ padding: spacing.containerMargin, paddingBottom: 32 }}>
      <View style={styles.subTabRow}>
        {SUB_TABS.map((t) => (
          <TouchableOpacity key={t.key} style={[styles.subTab, subTab === t.key && styles.subTabActive]} onPress={() => setSubTab(t.key)}>
            <Text style={[styles.subTabText, subTab === t.key && styles.subTabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {subTab === "setup" ? (
        <TyreSetupPanel vehicles={vehicles} />
      ) : (
        <TyreLogsPanel
          vehicles={vehicles}
          vehicleMap={vehicleMap}
          logs={logs}
          rotations={rotations}
          scraps={scraps}
          onChanged={load}
        />
      )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TyreSetupPanel({ vehicles }: { vehicles: Vehicle[] }) {
  const [vehicleReg, setVehicleReg] = useState<string | null>(vehicles[0]?.registration_number ?? null);
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [setup, setSetup] = useState<VehicleTyreSetup | null>(null);
  const [showNewSetup, setShowNewSetup] = useState(false);
  const [tyreCount, setTyreCount] = useState("6");
  const [hasSpare, setHasSpare] = useState("Yes");
  const [maxLifespan, setMaxLifespan] = useState("80000");
  const [saving, setSaving] = useState(false);

  // Reconfigure edits the existing tyres array in place (position/brand/
  // condition/construction/odometer per tyre) — distinct from "Setup Tyres"
  // above, which regenerates the array from a tyre count and would wipe
  // this per-tyre data.
  const [editTyres, setEditTyres] = useState<TyreUnit[] | null>(null);

  const vehicle = vehicles.find((v) => v.registration_number === vehicleReg);

  useFocusEffect(
    useCallback(() => {
      if (!vehicle) return;
      setLoadingSetup(true);
      setEditTyres(null);
      getTyreSetup(vehicle.id).then(setSetup).finally(() => setLoadingSetup(false));
    }, [vehicle?.id])
  );

  async function handleSaveSetup() {
    if (!vehicle) return;
    setSaving(true);
    try {
      const next = createDefaultSetup(vehicle.id, Number(tyreCount), hasSpare === "Yes", Number(maxLifespan) || 80000);
      await saveTyreSetup(next);
      setSetup(next);
      setShowNewSetup(false);
    } catch (e: any) {
      Alert.alert("Couldn't save setup", e?.message ?? "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function openReconfigure() {
    if (!setup) return;
    setEditTyres(setup.tyres.map((t) => ({ ...t, condition: t.condition ?? null, construction: t.construction ?? null })));
  }

  function updateEditTyre(i: number, patch: Partial<TyreUnit>) {
    setEditTyres((prev) => prev ? prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)) : prev);
  }

  async function handleSaveReconfigure() {
    if (!setup || !editTyres) return;
    setSaving(true);
    try {
      const next = { ...setup, tyres: editTyres };
      await saveTyreSetup(next);
      setSetup(next);
      setEditTyres(null);
    } catch (e: any) {
      Alert.alert("Couldn't save changes", e?.message ?? "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (vehicles.length === 0) {
    return <Card><Text style={{ color: colors.onSurfaceVariant }}>Add a vehicle first to configure tyres.</Text></Card>;
  }

  return (
    <View>
      <ChipPicker label="Vehicle" options={vehicles.map((v) => v.registration_number)} value={vehicleReg} onChange={(v) => { setVehicleReg(v); setEditTyres(null); }} />

      {loadingSetup ? (
        <ActivityIndicator color={colors.primary} />
      ) : !setup ? (
        <Card>
          <Text style={{ color: colors.onSurfaceVariant, marginBottom: 12 }}>No tyre setup configured for this vehicle yet.</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowNewSetup(true)}>
            <Text style={styles.addBtnText}>Setup Tyres</Text>
          </TouchableOpacity>
        </Card>
      ) : editTyres ? (
        <View style={{ gap: spacing.stackGap }}>
          {editTyres.map((t, i) => (
            <Card key={i}>
              <Text style={styles.primaryText}>{t.is_spare ? "Spare" : `Tyre ${i + 1}`}</Text>
              <FormField label="Position" value={t.position} onChangeText={(v) => updateEditTyre(i, { position: v })} placeholder="e.g. Front Left" />
              <ChipPicker label="Brand" options={TYRE_BRANDS} value={t.brand} onChange={(v) => updateEditTyre(i, { brand: v })} />
              <ChipPicker label="Condition" options={CONDITIONS} value={t.condition} onChange={(v) => updateEditTyre(i, { condition: v })} />
              <ChipPicker label="Construction" options={CONSTRUCTIONS} value={t.construction} onChange={(v) => updateEditTyre(i, { construction: v })} />
              <FormField
                label="Odometer / KMs Run"
                value={String(t.kms_run)}
                onChangeText={(v) => updateEditTyre(i, { kms_run: Number(v) || 0 })}
                placeholder="0"
                keyboardType="numeric"
              />
            </Card>
          ))}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity style={[styles.cancelBtn, { flex: 1 }]} onPress={() => setEditTyres(null)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, { flex: 1, marginTop: 0 }, saving && { opacity: 0.6 }]} onPress={handleSaveReconfigure} disabled={saving}>
              {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={{ gap: spacing.stackGap }}>
          <TouchableOpacity style={styles.addBtn} onPress={openReconfigure}>
            <Text style={styles.addBtnText}>Reconfigure</Text>
          </TouchableOpacity>
          {setup.tyres.map((t, i) => {
            const health = Math.max(0, Math.round(100 - (t.kms_run / (t.max_lifespan_km || 1)) * 100));
            return (
              <Card key={i}>
                <View style={styles.row}>
                  <Text style={styles.primaryText}>{t.position}</Text>
                  <Text style={[styles.healthText, { color: health < 30 ? colors.error : health < 60 ? colors.warning : colors.success }]}>{health}% health</Text>
                </View>
                <Text style={styles.metaText}>
                  {t.brand ?? "No brand set"} · {t.kms_run.toLocaleString("en-IN")} / {t.max_lifespan_km.toLocaleString("en-IN")} km
                  {t.condition ? ` · ${t.condition === "new" ? "New" : "Remould"}` : ""}
                  {t.construction ? ` · ${t.construction === "nylon" ? "Nylon" : "Radial"}` : ""}
                </Text>
              </Card>
            );
          })}
        </View>
      )}

      {showNewSetup ? (
        <Card style={{ marginTop: spacing.stackGap }}>
          <ChipPicker label="Tyre Count" options={TYRE_COUNTS} value={tyreCount} onChange={setTyreCount} />
          <ChipPicker label="Has Spare?" options={["Yes", "No"]} value={hasSpare} onChange={setHasSpare} />
          <FormField label="Default Max Lifespan (km)" value={maxLifespan} onChangeText={setMaxLifespan} placeholder="80000" keyboardType="numeric" />
          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSaveSetup} disabled={saving}>
            {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Save Setup</Text>}
          </TouchableOpacity>
        </Card>
      ) : null}
    </View>
  );
}

function TyreLogsPanel({
  vehicles, vehicleMap, logs, rotations, scraps, onChanged,
}: {
  vehicles: Vehicle[]; vehicleMap: Record<string, string>; logs: TyreLog[]; rotations: TyreRotation[]; scraps: TyreScrap[]; onChanged: () => void;
}) {
  const [mode, setMode] = useState<"none" | "log" | "rotation" | "scrap">("none");
  const [saving, setSaving] = useState(false);
  const [vehicleReg, setVehicleReg] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [tyreType, setTyreType] = useState("new");
  const [tyreBrand, setTyreBrand] = useState("");
  const [tyreCount, setTyreCount] = useState("1");
  const [tyrePosition, setTyrePosition] = useState("");
  const [odometer, setOdometer] = useState("");
  const [notes, setNotes] = useState("");
  const [construction, setConstruction] = useState<string | null>(null);
  const [condition, setCondition] = useState<string | null>(null);
  const [positions, setPositions] = useState("");
  const [rotationOdometer, setRotationOdometer] = useState("");
  const [dealerName, setDealerName] = useState("");
  const [scrapConstruction, setScrapConstruction] = useState<string | null>(null);

  const totalSpend = useMemo(() => logs.reduce((s, l) => s + l.amount, 0), [logs]);
  const totalScrapIncome = useMemo(() => scraps.reduce((s, l) => s + l.scrap_amount, 0), [scraps]);

  function resetForm() {
    setVehicleReg(null); setDate(new Date().toISOString().slice(0, 10)); setAmount("");
    setTyreType("new"); setTyreBrand(""); setTyreCount("1"); setTyrePosition(""); setOdometer("");
    setNotes(""); setConstruction(null); setCondition(null);
    setPositions(""); setRotationOdometer(""); setDealerName(""); setScrapConstruction(null);
  }

  async function handleSaveLog() {
    const vehicle = vehicles.find((v) => v.registration_number === vehicleReg);
    if (!vehicle || !amount) return Alert.alert("Missing details", "Vehicle and amount are required.");
    setSaving(true);
    const res = await tyreService.add({
      vehicle_id: vehicle.id, date, amount: Number(amount), tyre_type: tyreType,
      tyre_brand: tyreBrand || null, tyre_count: Number(tyreCount) || 1,
      tyre_position: tyrePosition || null, odometer_km: odometer ? Number(odometer) : null,
      notes: notes || null, tyre_construction: construction, tyre_condition: condition,
    });
    setSaving(false);
    if (res.success) { resetForm(); setMode("none"); onChanged(); } else Alert.alert("Couldn't save", res.error ?? "Please try again.");
  }

  async function handleSaveRotation() {
    const vehicle = vehicles.find((v) => v.registration_number === vehicleReg);
    if (!vehicle || !positions.trim()) return Alert.alert("Missing details", "Vehicle and positions rotated are required.");
    setSaving(true);
    const res = await tyreRotationService.add({
      vehicle_id: vehicle.id, date, positions_rotated: positions.trim(),
      odometer_km: rotationOdometer ? Number(rotationOdometer) : null,
    });
    setSaving(false);
    if (res.success) { resetForm(); setMode("none"); onChanged(); } else Alert.alert("Couldn't save", res.error ?? "Please try again.");
  }

  async function handleSaveScrap() {
    const vehicle = vehicles.find((v) => v.registration_number === vehicleReg);
    if (!vehicle) return Alert.alert("Vehicle required", "Select a vehicle.");
    setSaving(true);
    const res = await tyreScrapService.add({
      vehicle_id: vehicle.id, date, tyre_count: Number(tyreCount) || 1,
      scrap_amount: Number(amount) || 0, dealer_name: dealerName || null,
      tyre_construction: scrapConstruction,
    });
    setSaving(false);
    if (res.success) { resetForm(); setMode("none"); onChanged(); } else Alert.alert("Couldn't save", res.error ?? "Please try again.");
  }

  return (
    <View>
      <View style={styles.statRow}>
        <StatCell label="Entries" value={String(logs.length)} />
        <StatCell label="Total Spend" value={formatCurrency(totalSpend)} />
        <StatCell label="Scrap Income" value={formatCurrency(totalScrapIncome)} />
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setMode(mode === "log" ? "none" : "log")}>
          <MaterialIcons name="add" size={16} color={colors.onPrimaryContainer} />
          <Text style={styles.addBtnText}>Log Expense</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setMode(mode === "rotation" ? "none" : "rotation")}>
          <MaterialIcons name="sync" size={16} color={colors.onPrimaryContainer} />
          <Text style={styles.addBtnText}>Rotation</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setMode(mode === "scrap" ? "none" : "scrap")}>
          <MaterialIcons name="delete-outline" size={16} color={colors.onPrimaryContainer} />
          <Text style={styles.addBtnText}>Scrap</Text>
        </TouchableOpacity>
      </View>

      {mode === "log" ? (
        <Card style={{ marginBottom: spacing.stackGap }}>
          <ChipPicker label="Vehicle" options={vehicles.map((v) => v.registration_number)} value={vehicleReg} onChange={setVehicleReg} />
          <DateField label="Date" required value={date} onChange={setDate} />
          <ChipPicker label="Type" options={TYRE_TYPES.map((t) => TYRE_TYPE_LABELS[t])} value={TYRE_TYPE_LABELS[tyreType]} onChange={(v) => setTyreType(TYRE_TYPES.find((t) => TYRE_TYPE_LABELS[t] === v) ?? "new")} />
          <FormField label="Amount (₹)" required value={amount} onChangeText={setAmount} placeholder="0" keyboardType="numeric" />
          <FormField label="Brand" value={tyreBrand} onChangeText={setTyreBrand} placeholder="e.g. MRF" />
          <FormField label="Tyre Count" value={tyreCount} onChangeText={setTyreCount} placeholder="1" keyboardType="numeric" />
          <ChipPicker label="Construction" options={CONSTRUCTIONS} value={construction} onChange={setConstruction} />
          <ChipPicker label="Condition" options={CONDITIONS} value={condition} onChange={setCondition} />
          <FormField label="Position" value={tyrePosition} onChangeText={setTyrePosition} placeholder="e.g. Front L, Rear R" />
          <FormField label="Odometer (km)" value={odometer} onChangeText={setOdometer} placeholder="0" keyboardType="numeric" />
          <FormField label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional" />
          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSaveLog} disabled={saving}>
            {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Save</Text>}
          </TouchableOpacity>
        </Card>
      ) : null}

      {mode === "rotation" ? (
        <Card style={{ marginBottom: spacing.stackGap }}>
          <ChipPicker label="Vehicle" options={vehicles.map((v) => v.registration_number)} value={vehicleReg} onChange={setVehicleReg} />
          <DateField label="Date" required value={date} onChange={setDate} />
          <FormField label="Positions Rotated" required value={positions} onChangeText={setPositions} placeholder="Front-Left ↔ Rear-Left" />
          <FormField label="Odometer (km)" value={rotationOdometer} onChangeText={setRotationOdometer} placeholder="0" keyboardType="numeric" />
          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSaveRotation} disabled={saving}>
            {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Save</Text>}
          </TouchableOpacity>
        </Card>
      ) : null}

      {mode === "scrap" ? (
        <Card style={{ marginBottom: spacing.stackGap }}>
          <ChipPicker label="Vehicle" options={vehicles.map((v) => v.registration_number)} value={vehicleReg} onChange={setVehicleReg} />
          <DateField label="Date" required value={date} onChange={setDate} />
          <FormField label="Tyre Count" value={tyreCount} onChangeText={setTyreCount} placeholder="1" keyboardType="numeric" />
          <FormField label="Scrap Amount (₹)" value={amount} onChangeText={setAmount} placeholder="0" keyboardType="numeric" />
          <ChipPicker label="Construction" options={CONSTRUCTIONS} value={scrapConstruction} onChange={setScrapConstruction} />
          <FormField label="Dealer Name" value={dealerName} onChangeText={setDealerName} placeholder="Optional" />
          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSaveScrap} disabled={saving}>
            {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Save</Text>}
          </TouchableOpacity>
        </Card>
      ) : null}

      <Text style={styles.historyTitle}>Expense Logs</Text>
      {logs.length === 0 ? (
        <Card><Text style={{ color: colors.onSurfaceVariant }}>No tyre expense logs yet.</Text></Card>
      ) : (
        <View style={{ gap: spacing.stackGap }}>
          {logs.map((l) => (
            <Card key={l.id}>
              <View style={styles.row}>
                <View>
                  <Text style={styles.primaryText}>{vehicleMap[l.vehicle_id] ?? "—"} · {TYRE_TYPE_LABELS[l.tyre_type] ?? l.tyre_type}</Text>
                  <Text style={styles.metaText}>
                    {new Date(l.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}{l.tyre_brand ? ` · ${l.tyre_brand}` : ""} · {l.tyre_count}x
                    {l.tyre_position ? ` · ${l.tyre_position}` : ""}{l.odometer_km != null ? ` · ${l.odometer_km}km` : ""}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Text style={styles.amountText}>{formatCurrency(l.amount)}</Text>
                  <DeleteButton label="tyre log" onDelete={() => tyreService.delete(l.id)} onDeleted={onChanged} />
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}

      <Text style={styles.historyTitle}>Rotation History</Text>
      {rotations.length === 0 ? (
        <Card><Text style={{ color: colors.onSurfaceVariant }}>No rotations logged yet.</Text></Card>
      ) : (
        <View style={{ gap: spacing.stackGap }}>
          {rotations.map((r) => (
            <Card key={r.id}>
              <View style={styles.row}>
                <View>
                  <Text style={styles.primaryText}>{vehicleMap[r.vehicle_id] ?? "—"}</Text>
                  <Text style={styles.metaText}>
                    {new Date(r.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {r.positions_rotated}
                    {r.odometer_km != null ? ` · ${r.odometer_km}km` : ""}
                  </Text>
                </View>
                <DeleteButton label="rotation" onDelete={() => tyreRotationService.delete(r.id)} onDeleted={onChanged} />
              </View>
            </Card>
          ))}
        </View>
      )}

      <Text style={styles.historyTitle}>Scrap History</Text>
      {scraps.length === 0 ? (
        <Card><Text style={{ color: colors.onSurfaceVariant }}>No scrap sales logged yet.</Text></Card>
      ) : (
        <View style={{ gap: spacing.stackGap }}>
          {scraps.map((s) => (
            <Card key={s.id}>
              <View style={styles.row}>
                <View>
                  <Text style={styles.primaryText}>{vehicleMap[s.vehicle_id] ?? "—"} · {s.tyre_count}x</Text>
                  <Text style={styles.metaText}>
                    {new Date(s.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}{s.dealer_name ? ` · ${s.dealer_name}` : ""}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Text style={styles.amountText}>{formatCurrency(s.scrap_amount)}</Text>
                  <DeleteButton label="scrap entry" onDelete={() => tyreScrapService.delete(s.id)} onDeleted={onChanged} />
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
  root: { flex: 1, backgroundColor: colors.background },
  center: { paddingVertical: 40, alignItems: "center" },
  subTabRow: { flexDirection: "row", gap: 8, marginBottom: spacing.stackGap },
  subTab: { flex: 1, paddingVertical: 10, borderRadius: radii.md, backgroundColor: colors.surfaceContainerLowest, borderWidth: 1, borderColor: colors.outlineVariant, alignItems: "center" },
  subTabActive: { backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer },
  subTabText: { ...type.labelMd, color: colors.onSurfaceVariant },
  subTabTextActive: { color: colors.onPrimaryContainer },
  statRow: { flexDirection: "row", gap: 8, marginBottom: spacing.stackGap },
  statLabel: { ...type.labelMd, color: colors.onSurfaceVariant, marginBottom: 4 },
  statValue: { ...type.headlineSm, color: colors.onBackground },
  actionRow: { flexDirection: "row", gap: 8, marginBottom: spacing.stackGap },
  historyTitle: { ...type.headlineSm, color: colors.onBackground, marginBottom: spacing.stackGap, marginTop: 4 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: colors.primaryContainer, borderRadius: radii.md, paddingVertical: 10 },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: colors.primaryContainer, borderRadius: radii.md, paddingVertical: 10 },
  addBtnText: { ...type.labelMd, color: colors.onPrimaryContainer },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: 12, alignItems: "center", marginTop: 4 },
  saveBtnText: { color: "white", fontWeight: "700" },
  cancelBtn: { borderWidth: 1.5, borderColor: colors.outlineVariant, borderRadius: radii.md, paddingVertical: 12, alignItems: "center" },
  cancelBtnText: { color: colors.onSurfaceVariant, fontWeight: "700" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  primaryText: { ...type.bodyLg, fontWeight: "600", color: colors.onSurface },
  metaText: { fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
  amountText: { ...type.bodyLg, fontWeight: "700", color: colors.primary },
  healthText: { fontWeight: "700" },
});
