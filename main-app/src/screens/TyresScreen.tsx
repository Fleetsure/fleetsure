import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Modal, ScrollView, RefreshControl, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import {
  ChevronDown, Check, Plus, X, Trash2, Circle, AlertTriangle, Info,
  RotateCcw, Settings,
} from "lucide-react-native";

import { tyreService } from "../services/tyreService";
import { getTyreSetup, saveTyreSetup } from "../services/tyreSetupService";
import { vehicleService } from "../services/vehicleService";
import { tripService } from "../services/tripService";
import type { TyreLog, Vehicle } from "../types";
import {
  VehicleTyreSetup, TyreUnit, TYRE_COUNTS, TYRE_BRANDS, ISSUE_TYPES,
  calcHealth, healthColor, genPositions, buildSetup, predictReplacement, getInsights,
} from "../utils/tyreCalc";
import { DateField, dateToIso } from "../components/DateField";
import TruckDiagram from "../components/TruckDiagram";
import { fmtDate } from "../utils/format";

import { PRIMARY, BG, CARD, TEXT, MUTED, BORDER, DANGER, SUCCESS, WARNING } from "../theme";

const TYRE_TYPES = [
  { value: "new",       label: "New Tyre" },
  { value: "recap",     label: "Recap / Retread" },
  { value: "repair",    label: "Repair / Puncture" },
  { value: "balance",   label: "Wheel Balancing" },
  { value: "alignment", label: "Wheel Alignment" },
];
const TYPE_COLORS: Record<string, { color: string; bg: string }> = {
  new:       { color: "#2e7d32", bg: "#e8f5e9" },
  recap:     { color: "#0277bd", bg: "#e1f5fe" },
  repair:    { color: "#e65100", bg: "#fff3e0" },
  balance:   { color: "#6a1b9a", bg: "#f3e5f5" },
  alignment: { color: PRIMARY,   bg: "#eef0fb" },
};
const emptyLogForm = () => ({
  vehicle_id: "", date: dateToIso(new Date()), amount: "",
  tyre_brand: "", tyre_count: "1", tyre_type: "new",
  tyre_position: "", odometer_km: "", notes: "",
});

// ── Shared small pieces ─────────────────────────────────────────────────────

function EntityPicker({ label, value, options, onSelect, placeholder }: {
  label: string; value: string;
  options: { id: string; label: string }[];
  onSelect: (id: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.id === value);
  return (
    <View style={f.fieldGroup}>
      <Text style={f.label}>{label}</Text>
      <TouchableOpacity style={f.pickerBtn} onPress={() => setOpen(true)}>
        <Text style={[f.pickerText, !selected && { color: MUTED }]} numberOfLines={1}>
          {selected?.label ?? placeholder ?? "Select…"}
        </Text>
        <ChevronDown size={16} color={MUTED} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity style={f.overlay} onPress={() => setOpen(false)} activeOpacity={1}>
          <View style={f.sheet}>
            <Text style={f.sheetTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={i => i.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[f.sheetOption, item.id === value && f.sheetOptionActive]}
                  onPress={() => { onSelect(item.id); setOpen(false); }}
                >
                  <Text style={[f.sheetOptionText, item.id === value && { color: PRIMARY, fontWeight: "700" }]} numberOfLines={1}>
                    {item.label}
                  </Text>
                  {item.id === value && <Check size={16} color={PRIMARY} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType }: any) {
  return (
    <View style={f.fieldGroup}>
      <Text style={f.label}>{label}</Text>
      <TextInput
        style={f.input} value={value} onChangeText={onChangeText}
        placeholder={placeholder} placeholderTextColor={MUTED}
        keyboardType={keyboardType ?? "default"}
      />
    </View>
  );
}

// ── Setup modal (configure tyre layout) ─────────────────────────────────────

function SetupModal({ existing, onSave, onClose }: {
  existing: VehicleTyreSetup | null;
  onSave: (s: VehicleTyreSetup) => void;
  onClose: () => void;
}) {
  const [count, setCount] = useState(existing?.tyre_count ?? 10);
  const [hasSpare, setHasSpare] = useState(existing?.has_spare ?? true);
  const [maxKm, setMaxKm] = useState(String(existing?.tyres[0]?.max_lifespan_km ?? 80000));

  const save = () => {
    const setup = buildSetup(count, hasSpare, parseInt(maxKm) || 80000);
    if (existing) {
      const map: Record<string, TyreUnit> = {};
      existing.tyres.forEach(t => { map[t.position] = t; });
      setup.tyres = setup.tyres.map(t => map[t.position] ? { ...map[t.position], position: t.position, is_spare: t.is_spare } : t);
      setup.synced_trip_ids = existing.synced_trip_ids;
    }
    onSave(setup);
  };

  const preview = [...genPositions(count), ...(hasSpare ? ["Spare"] : [])];

  return (
    <Modal visible transparent animationType="fade">
      <View style={m.overlay}>
        <View style={m.card}>
          <TouchableOpacity style={m.closeBtn} onPress={onClose}><X size={18} color={MUTED} /></TouchableOpacity>
          <Text style={m.title}>Configure Tyre Layout</Text>
          <Text style={m.subtitle}>Set up tyre positions for this vehicle</Text>

          <Text style={f.label}>Number of Tyres</Text>
          <View style={su.countRow}>
            {TYRE_COUNTS.map(n => (
              <TouchableOpacity key={n} onPress={() => setCount(n)} style={[su.countBtn, count === n && su.countBtnActive]}>
                <Text style={[su.countBtnText, count === n && su.countBtnTextActive]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={su.spareRow} onPress={() => setHasSpare(!hasSpare)}>
            <View style={[su.checkbox, hasSpare && su.checkboxChecked]}>
              {hasSpare && <Check size={14} color="#fff" />}
            </View>
            <Text style={su.spareLabel}>Include spare tyre</Text>
          </TouchableOpacity>

          <Field label="Default Max Lifespan per Tyre (km)" value={maxKm} onChangeText={setMaxKm} placeholder="80000" keyboardType="numeric" />
          <Text style={su.hint}>Typical: 60,000–100,000 km. Adjustable per tyre.</Text>

          <View style={su.previewBox}>
            <Text style={su.previewText}><Text style={{ fontWeight: "800" }}>{count + (hasSpare ? 1 : 0)} positions: </Text>{preview.join(" · ")}</Text>
          </View>

          <View style={m.footerRow}>
            <TouchableOpacity style={m.cancelBtn} onPress={onClose}><Text style={m.cancelBtnText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={m.saveBtn} onPress={save}>
              <Text style={m.saveBtnText}>{existing ? "Update Layout" : "Setup Tyres"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Edit tyre modal (details + pressure/issue logs) ─────────────────────────

function EditTyreModal({ tyre, onSave, onClose }: {
  tyre: TyreUnit;
  onSave: (t: TyreUnit) => void;
  onClose: () => void;
}) {
  const [t, setT] = useState<TyreUnit>({ ...tyre, pressure_logs: [...(tyre.pressure_logs || [])], issue_logs: [...(tyre.issue_logs || [])] });
  const [newPsi, setNewPsi] = useState("");
  const [newIssueType, setNewIssueType] = useState("puncture_minor");
  const [newIssueImpact, setNewIssueImpact] = useState("5");
  const [newIssueDesc, setNewIssueDesc] = useState("");
  const set = (k: keyof TyreUnit, v: any) => setT(p => ({ ...p, [k]: v }));

  const h = calcHealth(t);
  const { color, bg, label: hlabel } = healthColor(h);
  const pred = predictReplacement(t);

  const addPressure = () => {
    if (!newPsi) return;
    set("pressure_logs", [...t.pressure_logs, { date: dateToIso(new Date()), psi: parseFloat(newPsi) }]);
    setNewPsi("");
  };

  const addIssue = () => {
    const impact = parseFloat(newIssueImpact) || 0;
    if (impact <= 0) return;
    const kmsToAdd = Math.round((impact / 100) * t.max_lifespan_km);
    const found = ISSUE_TYPES.find(i => i.value === newIssueType);
    setT(p => ({
      ...p,
      kms_run: Math.min(p.kms_run + kmsToAdd, p.max_lifespan_km),
      issue_logs: [...(p.issue_logs || []), {
        date: dateToIso(new Date()), type: newIssueType, label: found?.label ?? newIssueType,
        health_impact: impact, description: newIssueDesc,
      }],
    }));
    setNewIssueType("puncture_minor"); setNewIssueImpact("5"); setNewIssueDesc("");
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <SafeAreaView style={f.safe} edges={["top", "bottom"]}>
          <View style={f.header}>
            <Text style={f.headerTitle}>{t.position}</Text>
            <TouchableOpacity onPress={onClose}><X size={24} color={TEXT} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={f.scroll}>
            <View style={et.healthRow}>
              <View style={[et.healthPill, { backgroundColor: bg }]}>
                <Text style={[et.healthPillText, { color }]}>{h}%</Text>
              </View>
              <View>
                <Text style={et.healthLabel}>{hlabel} · {t.is_spare ? "Spare" : "Active"}</Text>
              </View>
            </View>

            {pred && (
              <View style={[et.predBox, { backgroundColor: pred.days < 30 ? "#fce4ec" : "#f0f4ff" }]}>
                <Text style={[et.predText, { color: pred.days < 30 ? DANGER : PRIMARY }]}>
                  Predicted replacement: ~{pred.days} days ({fmtDate(pred.date)})
                </Text>
              </View>
            )}

            <View style={f.row}>
              <View style={{ flex: 1 }}>
                <EntityPicker label="Brand" value={t.brand} options={TYRE_BRANDS.map(b => ({ id: b, label: b }))} onSelect={v => set("brand", v)} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Purchase Cost (₹)" value={String(t.cost)} onChangeText={(v: string) => set("cost", parseFloat(v) || 0)} keyboardType="numeric" />
              </View>
            </View>

            <View style={f.row}>
              <View style={{ flex: 1 }}>
                <Field label="Max Lifespan (km)" value={String(t.max_lifespan_km)} onChangeText={(v: string) => set("max_lifespan_km", parseInt(v) || 80000)} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Retread Count" value={String(t.retread_count)} onChangeText={(v: string) => set("retread_count", parseInt(v) || 0)} keyboardType="numeric" />
              </View>
            </View>

            <DateField label="Install Date" value={t.install_date} onChangeIso={v => set("install_date", v)} />
            <Field label="Install Odometer (km)" value={String(t.install_odometer)} onChangeText={(v: string) => set("install_odometer", parseFloat(v) || 0)} keyboardType="numeric" />

            <Field label="Total KMs Run on this Tyre" value={String(t.kms_run)} onChangeText={(v: string) => set("kms_run", parseFloat(v) || 0)} keyboardType="numeric" />
            <Text style={su.hint}>Auto-updated from trip sync. Adjust manually if needed.</Text>

            <DateField label="Last Rotation Date" value={t.last_rotation_date} onChangeIso={v => set("last_rotation_date", v)} />
            <Field label="Rotation Odometer (km)" value={String(t.last_rotation_odometer)} onChangeText={(v: string) => set("last_rotation_odometer", parseFloat(v) || 0)} keyboardType="numeric" />

            {/* Pressure logs */}
            <View style={et.section}>
              <Text style={et.sectionTitle}>Air Pressure Logs (PSI)</Text>
              {t.pressure_logs.length > 0 ? (
                [...t.pressure_logs].reverse().slice(0, 6).map((p, ri) => {
                  const origIdx = t.pressure_logs.length - 1 - ri;
                  return (
                    <View key={origIdx} style={et.logRow}>
                      <Text style={et.logRowDate}>{fmtDate(p.date)}</Text>
                      <Text style={et.logRowValue}>{p.psi} PSI</Text>
                      <TouchableOpacity onPress={() => set("pressure_logs", t.pressure_logs.filter((_, i) => i !== origIdx))}>
                        <Trash2 size={13} color={MUTED} />
                      </TouchableOpacity>
                    </View>
                  );
                })
              ) : (
                <Text style={et.emptyLogText}>No pressure logs yet.</Text>
              )}
              <View style={f.row}>
                <View style={{ flex: 1 }}>
                  <Field label="PSI" value={newPsi} onChangeText={setNewPsi} placeholder="90" keyboardType="numeric" />
                </View>
                <TouchableOpacity style={et.addSmallBtn} onPress={addPressure}>
                  <Text style={et.addSmallBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Issue logs */}
            <View style={et.section}>
              <Text style={et.sectionTitle}>Issue / Damage Log</Text>
              {(t.issue_logs || []).length > 0 ? (
                [...(t.issue_logs || [])].reverse().map((issue, i) => (
                  <View key={i} style={et.issueRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={et.issueLabel}>{issue.label}</Text>
                      {issue.description ? <Text style={et.issueDesc}>{issue.description}</Text> : null}
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={et.issueImpact}>−{issue.health_impact}% health</Text>
                      <Text style={et.issueDate}>{fmtDate(issue.date)}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={et.emptyLogText}>No issues logged yet.</Text>
              )}

              <View style={et.issueForm}>
                <Text style={et.issueFormTitle}>Log New Issue</Text>
                <EntityPicker
                  label="Issue Type" value={newIssueType}
                  options={ISSUE_TYPES.map(i => ({ id: i.value, label: i.label }))}
                  onSelect={v => {
                    const found = ISSUE_TYPES.find(i => i.value === v);
                    setNewIssueType(v); setNewIssueImpact(String(found?.impact ?? 5));
                  }}
                />
                <View style={f.row}>
                  <View style={{ flex: 1 }}>
                    <Field label="Health Impact (%)" value={newIssueImpact} onChangeText={setNewIssueImpact} keyboardType="numeric" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="Description" value={newIssueDesc} onChangeText={setNewIssueDesc} placeholder="e.g. NH-48 pothole" />
                  </View>
                </View>
                <Text style={et.issueHint}>
                  Reduces health by {newIssueImpact || 0}% — equivalent to {Math.round((parseFloat(newIssueImpact || "0") / 100) * t.max_lifespan_km).toLocaleString("en-IN")} km of wear
                </Text>
                <TouchableOpacity style={et.logIssueBtn} onPress={addIssue}>
                  <Text style={et.logIssueBtnText}>Log Issue</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
          <View style={f.footer}>
            <TouchableOpacity style={f.saveBtn} onPress={() => onSave(t)}>
              <Text style={f.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────

export default function TyresScreen() {
  const [tab, setTab] = useState<"health" | "logs">("health");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [logs, setLogs] = useState<TyreLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Health tab
  const [selVehicleId, setSelVehicleId] = useState("");
  const [setup, setSetup] = useState<VehicleTyreSetup | null>(null);
  const [selectedPos, setSelectedPos] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [editingTyre, setEditingTyre] = useState<TyreUnit | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  // Logs tab
  const [modalVisible, setModalVisible] = useState(false);
  const [logForm, setLogForm] = useState(emptyLogForm());
  const [saving, setSaving] = useState(false);
  const [filterVehicle, setFilterVehicle] = useState("");

  const load = useCallback(async () => {
    const [l, v] = await Promise.all([tyreService.getAll(), vehicleService.getAll()]);
    if (l.success) setLogs(l.data ?? []);
    if (v.success) setVehicles(v.data ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const loadSetup = useCallback(async (vehicleId: string) => {
    if (!vehicleId) { setSetup(null); return; }
    const s = await getTyreSetup(vehicleId);
    setSetup(s);
    setSelectedPos(null);
  }, []);

  const selectVehicle = (id: string) => { setSelVehicleId(id); loadSetup(id); };

  const syncTrips = async () => {
    if (!selVehicleId || !setup) return;
    setSyncing(true);
    try {
      const r = await tripService.getAll();
      const newTrips = (r.data || []).filter((trip: any) =>
        trip.vehicle_id === selVehicleId &&
        trip.status === "completed" &&
        trip.distance_km &&
        !setup.synced_trip_ids.includes(trip.id)
      );
      if (newTrips.length === 0) {
        setSyncMsg("All trips already synced — no new km to add.");
      } else {
        const addedKm = newTrips.reduce((s: number, trip: any) => s + parseFloat(trip.distance_km || 0), 0);
        const updated: VehicleTyreSetup = {
          ...setup,
          tyres: setup.tyres.map(ty => ty.is_spare ? ty : { ...ty, kms_run: ty.kms_run + addedKm }),
          synced_trip_ids: [...setup.synced_trip_ids, ...newTrips.map((trip: any) => trip.id)],
        };
        await saveTyreSetup(selVehicleId, updated);
        setSetup(updated);
        setSyncMsg(`Synced ${newTrips.length} trip(s) — +${Math.round(addedKm).toLocaleString("en-IN")} km added.`);
      }
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(""), 5000);
    }
  };

  const saveTyreEdit = async (updated: TyreUnit) => {
    if (!setup || !selVehicleId) return;
    const newSetup = { ...setup, tyres: setup.tyres.map(ty => ty.position === updated.position ? updated : ty) };
    await saveTyreSetup(selVehicleId, newSetup);
    setSetup(newSetup);
    setEditingTyre(null);
  };

  const saveSetup = async (s: VehicleTyreSetup) => {
    await saveTyreSetup(selVehicleId, s);
    setSetup(s);
    setShowSetup(false);
  };

  const setLF = (k: string, v: string) => setLogForm(p => ({ ...p, [k]: v }));

  const handleSaveLog = async () => {
    if (!logForm.vehicle_id) { Alert.alert("Required", "Select a vehicle."); return; }
    if (!logForm.amount) { Alert.alert("Required", "Amount is required."); return; }
    setSaving(true);
    const res = await tyreService.add({
      vehicle_id: logForm.vehicle_id,
      date: logForm.date,
      amount: parseFloat(logForm.amount),
      tyre_count: parseInt(logForm.tyre_count) || 1,
      tyre_type: logForm.tyre_type,
      odometer_km: logForm.odometer_km ? parseFloat(logForm.odometer_km) : null,
      tyre_brand: logForm.tyre_brand || null,
      tyre_position: logForm.tyre_position || null,
      notes: logForm.notes || null,
    });
    if (res.success) { setModalVisible(false); setLogForm(emptyLogForm()); load(); }
    else Alert.alert("Error", res.error ?? "Could not save entry.");
    setSaving(false);
  };

  const handleDeleteLog = (id: string) => {
    Alert.alert("Delete", "Remove this entry?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { await tyreService.delete(id); load(); } },
    ]);
  };

  const vehicleName = (id: string) => vehicles.find(v => v.id === id)?.registration_number || "—";
  const filtered = filterVehicle ? logs.filter(l => l.vehicle_id === filterVehicle) : logs;
  const totalSpend = logs.reduce((s, l) => s + parseFloat(String(l.amount || 0)), 0);
  const insights = setup ? getInsights(setup.tyres) : [];
  const fleetAvgHealth = setup && setup.tyres.length > 0
    ? Math.round(setup.tyres.filter(ty => !ty.is_spare).reduce((s, ty) => s + calcHealth(ty), 0) / Math.max(1, setup.tyres.filter(ty => !ty.is_spare).length))
    : null;

  const vehicleOptions = [{ id: "", label: "All Vehicles" }, ...vehicles.map(v => ({ id: v.id, label: v.registration_number }))];

  if (loading) return <View style={s.center}><ActivityIndicator color={PRIMARY} size="large" /></View>;

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <Text style={s.title}>Tyre Intelligence</Text>
        <Text style={s.sub}>{logs.length} expense entries · ₹{totalSpend.toLocaleString("en-IN")} total</Text>
      </View>

      <View style={s.tabRow}>
        {(["health", "logs"] as const).map(key => (
          <TouchableOpacity key={key} style={[s.tabBtn, tab === key && s.tabBtnActive]} onPress={() => setTab(key)}>
            <Text style={[s.tabBtnText, tab === key && s.tabBtnTextActive]}>
              {key === "health" ? "Tyre Health" : "Expense Logs"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "health" ? (
        <ScrollView
          contentContainerStyle={s.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
        >
          <EntityPicker
            label="Vehicle"
            value={selVehicleId}
            options={vehicles.map(v => ({ id: v.id, label: `${v.registration_number} — ${v.make} ${v.model}` }))}
            onSelect={selectVehicle}
            placeholder="Select a vehicle"
          />

          {selVehicleId && (
            <View style={s.actionRow}>
              <TouchableOpacity style={s.actionBtn} onPress={() => setShowSetup(true)}>
                <Settings size={14} color={MUTED} />
                <Text style={s.actionBtnText}>{setup ? "Reconfigure" : "Setup Tyres"}</Text>
              </TouchableOpacity>
              {setup && (
                <TouchableOpacity style={[s.actionBtn, s.syncBtn, syncing && { opacity: 0.6 }]} onPress={syncTrips} disabled={syncing}>
                  <RotateCcw size={14} color={SUCCESS} />
                  <Text style={[s.actionBtnText, { color: SUCCESS }]}>{syncing ? "Syncing…" : "Sync Trips"}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {!!syncMsg && (
            <View style={s.syncMsgBox}><Text style={s.syncMsgText}>✓ {syncMsg}</Text></View>
          )}

          {!selVehicleId ? (
            <View style={s.emptyCard}>
              <Circle size={32} color={PRIMARY} style={{ opacity: 0.5 }} />
              <Text style={s.emptyTitle}>Select a vehicle to view tyre health</Text>
              <Text style={s.emptyDesc}>Track health, predict replacement, and sync trip distances per vehicle.</Text>
            </View>
          ) : !setup ? (
            <View style={s.emptyCard}>
              <Text style={{ fontSize: 40, marginBottom: 8 }}>🛞</Text>
              <Text style={s.emptyTitle}>No tyre layout configured</Text>
              <Text style={s.emptyDesc}>Set up the number of tyres to start tracking health, km, and insights.</Text>
              <TouchableOpacity style={s.addBtn} onPress={() => setShowSetup(true)}>
                <Plus size={14} color="#fff" /><Text style={s.addBtnText}>Setup Tyres</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <View style={s.summaryGrid}>
                <MiniStat value={`${fleetAvgHealth}%`} label="Fleet Avg Health" color={healthColor(fleetAvgHealth ?? 0).color} />
                <MiniStat value={setup.tyres.length} label="Tyres Tracked" color={PRIMARY} />
                <MiniStat value={setup.tyres.filter(ty => calcHealth(ty) < 30).length} label="Need Replacement" color={DANGER} />
                <MiniStat value={setup.synced_trip_ids.length} label="Trips Synced" color={SUCCESS} />
              </View>

              {insights.length > 0 && (
                <View style={s.card}>
                  <Text style={s.cardTitle}>Smart Insights ({insights.length})</Text>
                  {insights.map((ins, i) => {
                    const cfg = {
                      critical: { Icon: AlertTriangle, color: DANGER, bg: "#fce4ec" },
                      warning:  { Icon: AlertTriangle, color: WARNING, bg: "#fff3e0" },
                      info:     { Icon: Info,          color: "#1565c0", bg: "#e3f2fd" },
                    }[ins.type];
                    return (
                      <View key={i} style={[s.insightRow, { backgroundColor: cfg.bg }]}>
                        <cfg.Icon size={13} color={cfg.color} />
                        <Text style={[s.insightText, { color: cfg.color }]}>{ins.msg}</Text>
                      </View>
                    );
                  })}
                </View>
              )}

              <View style={s.card}>
                <Text style={s.diagramCaption}>Tyre Layout — {setup.tyre_count} wheels{setup.has_spare ? " + spare" : ""}</Text>
                <TruckDiagram
                  tyres={setup.tyres}
                  selectedPos={selectedPos}
                  onSelect={ty => { setSelectedPos(ty.position); setEditingTyre(ty); }}
                />
                <Text style={s.diagramHint}>Tap a tyre to edit</Text>
              </View>

              <View style={s.tyreGrid}>
                {setup.tyres.map(ty => {
                  const h = calcHealth(ty);
                  const { color, bg } = healthColor(h);
                  const pred = predictReplacement(ty);
                  const cpk = ty.kms_run > 0 ? `₹${(ty.cost / ty.kms_run).toFixed(2)}/km` : "—";
                  return (
                    <TouchableOpacity
                      key={ty.position}
                      style={[s.tyreCard, { backgroundColor: bg, borderColor: color + "44" }, selectedPos === ty.position && { borderColor: color, borderWidth: 2 }]}
                      onPress={() => { setSelectedPos(ty.position); setEditingTyre(ty); }}
                    >
                      <Text style={s.tyreCardPos}>{ty.is_spare ? "↻ " : ""}{ty.position}</Text>
                      <Text style={[s.tyreCardHealth, { color }]}>{h}%</Text>
                      <View style={s.tyreCardBar}><View style={[s.tyreCardBarFill, { width: `${h}%`, backgroundColor: color }]} /></View>
                      <Text style={s.tyreCardKm}>{ty.kms_run.toLocaleString("en-IN")} / {ty.max_lifespan_km.toLocaleString("en-IN")} km</Text>
                      <Text style={s.tyreCardBrand}>{ty.brand} · {ty.retread_count}x retread</Text>
                      {pred && <Text style={[s.tyreCardPred, { color: pred.days < 30 ? DANGER : MUTED }]}>Replace in ~{pred.days}d</Text>}
                      <Text style={s.tyreCardCpk}>{cpk}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={s.summaryGrid}>
            <MiniStat value={logs.length} label="Total Entries" color={PRIMARY} />
            <MiniStat value={`₹${totalSpend.toLocaleString("en-IN")}`} label="Total Spend" color={SUCCESS} />
            <MiniStat value={logs.filter(l => l.tyre_type === "new").length} label="New Tyres" color={WARNING} />
            <MiniStat value={logs.filter(l => l.tyre_type === "repair").length} label="Repairs" color="#e65100" />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
            {vehicleOptions.map(opt => (
              <TouchableOpacity key={opt.id} style={[s.filterChip, filterVehicle === opt.id && s.filterChipActive]} onPress={() => setFilterVehicle(opt.id)}>
                <Text style={[s.filterChipText, filterVehicle === opt.id && s.filterChipTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <FlatList
            data={filtered}
            keyExtractor={i => i.id}
            contentContainerStyle={s.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
            ListEmptyComponent={
              <View style={s.empty}>
                <Circle size={48} color={MUTED} />
                <Text style={s.emptyText}>No expense entries yet.</Text>
              </View>
            }
            renderItem={({ item: l }) => {
              const tc = TYPE_COLORS[l.tyre_type ?? "new"] || TYPE_COLORS.new;
              return (
                <View style={s.logCard}>
                  <View style={s.logCardLeft}>
                    <View style={[s.logTypeBadge, { backgroundColor: tc.bg }]}>
                      <Text style={[s.logTypeBadgeText, { color: tc.color }]}>
                        {TYRE_TYPES.find(ty => ty.value === l.tyre_type)?.label || l.tyre_type}
                      </Text>
                    </View>
                    <Text style={s.logVehicle}>{vehicleName(l.vehicle_id)}</Text>
                    <Text style={s.logMeta}>
                      {[l.tyre_brand, l.tyre_count && l.tyre_count > 1 ? `${l.tyre_count} tyres` : null, l.tyre_position].filter(Boolean).join(" · ") || "—"}
                    </Text>
                    {l.odometer_km ? <Text style={s.logOdo}>{parseFloat(String(l.odometer_km)).toLocaleString("en-IN")} km</Text> : null}
                  </View>
                  <View style={s.logCardRight}>
                    <Text style={s.logAmount}>₹{parseFloat(String(l.amount)).toLocaleString("en-IN")}</Text>
                    <Text style={s.logDate}>{fmtDate(l.date)}</Text>
                    <TouchableOpacity onPress={() => handleDeleteLog(l.id)} style={{ marginTop: 4 }}>
                      <Trash2 size={14} color={MUTED} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />

          <TouchableOpacity style={s.fab} onPress={() => { setLogForm(emptyLogForm()); setModalVisible(true); }}>
            <Plus size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Add expense log modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <SafeAreaView style={f.safe} edges={["top", "bottom"]}>
            <View style={f.header}>
              <Text style={f.headerTitle}>Add Tyre Expense</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><X size={24} color={TEXT} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={f.scroll}>
              <EntityPicker
                label="Vehicle *" value={logForm.vehicle_id}
                options={vehicles.map(v => ({ id: v.id, label: `${v.registration_number} — ${v.make} ${v.model}` }))}
                onSelect={v => setLF("vehicle_id", v)} placeholder="Select vehicle"
              />
              <DateField label="Date *" value={logForm.date} onChangeIso={v => setLF("date", v)} />
              <View style={f.row}>
                <View style={{ flex: 1 }}>
                  <EntityPicker label="Type *" value={logForm.tyre_type} options={TYRE_TYPES.map(ty => ({ id: ty.value, label: ty.label }))} onSelect={v => setLF("tyre_type", v)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Amount (₹) *" value={logForm.amount} onChangeText={(v: string) => setLF("amount", v)} placeholder="12000" keyboardType="numeric" />
                </View>
              </View>
              <View style={f.row}>
                <View style={{ flex: 1 }}>
                  <EntityPicker label="Brand" value={logForm.tyre_brand} options={TYRE_BRANDS.map(b => ({ id: b, label: b }))} onSelect={v => setLF("tyre_brand", v)} placeholder="Select brand" />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Tyre Count" value={logForm.tyre_count} onChangeText={(v: string) => setLF("tyre_count", v)} keyboardType="numeric" />
                </View>
              </View>
              <View style={f.row}>
                <View style={{ flex: 1 }}>
                  <Field label="Position" value={logForm.tyre_position} onChangeText={(v: string) => setLF("tyre_position", v)} placeholder="Front L, Rear R…" />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Odometer (km)" value={logForm.odometer_km} onChangeText={(v: string) => setLF("odometer_km", v)} placeholder="142500" keyboardType="numeric" />
                </View>
              </View>
              <Field label="Notes" value={logForm.notes} onChangeText={(v: string) => setLF("notes", v)} placeholder="Any additional info…" />
            </ScrollView>
            <View style={f.footer}>
              <TouchableOpacity style={[f.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSaveLog} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={f.saveBtnText}>Save Entry</Text>}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {showSetup && selVehicleId && (
        <SetupModal existing={setup} onSave={saveSetup} onClose={() => setShowSetup(false)} />
      )}
      {editingTyre && (
        <EditTyreModal tyre={editingTyre} onSave={saveTyreEdit} onClose={() => setEditingTyre(null)} />
      )}
    </SafeAreaView>
  );
}

function MiniStat({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <View style={s.miniStat}>
      <Text style={[s.miniStatValue, { color }]}>{value}</Text>
      <Text style={s.miniStatLabel}>{label}</Text>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: "800", color: TEXT },
  sub: { fontSize: 13, color: MUTED },
  tabRow: { flexDirection: "row", gap: 4, backgroundColor: "#F0F1FA", borderRadius: 10, padding: 4, marginHorizontal: 16, marginBottom: 12, alignSelf: "flex-start" },
  tabBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 7 },
  tabBtnActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  tabBtnText: { fontSize: 13, fontWeight: "600", color: MUTED },
  tabBtnTextActive: { color: PRIMARY },
  scrollContent: { padding: 16, paddingBottom: 40 },
  actionRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, borderWidth: 1.5, borderColor: BORDER },
  syncBtn: { backgroundColor: "#e8f5e9", borderWidth: 0 },
  actionBtnText: { fontSize: 13, fontWeight: "600", color: MUTED },
  syncMsgBox: { backgroundColor: "#e8f5e9", borderRadius: 8, padding: 12, marginBottom: 14 },
  syncMsgText: { color: SUCCESS, fontSize: 13, fontWeight: "500" },
  emptyCard: { backgroundColor: CARD, borderRadius: 14, padding: 40, alignItems: "center" },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: TEXT, marginTop: 8, marginBottom: 6, textAlign: "center" },
  emptyDesc: { fontSize: 13, color: MUTED, textAlign: "center", marginBottom: 16 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: PRIMARY, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14, paddingHorizontal: 16 },
  miniStat: { flex: 1, minWidth: "22%", backgroundColor: CARD, borderRadius: 12, padding: 10, alignItems: "center" },
  miniStatValue: { fontSize: 18, fontWeight: "800" },
  miniStatLabel: { fontSize: 10, color: MUTED, marginTop: 2, textAlign: "center" },
  card: { backgroundColor: CARD, borderRadius: 14, padding: 16, marginBottom: 14 },
  cardTitle: { fontSize: 13, fontWeight: "700", color: TEXT, marginBottom: 10 },
  insightRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 9, borderRadius: 8, marginBottom: 6 },
  insightText: { fontSize: 12.5, flex: 1 },
  diagramCaption: { fontSize: 11, fontWeight: "700", color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, textAlign: "center" },
  diagramHint: { fontSize: 11, color: MUTED, textAlign: "center", marginTop: 8 },
  tyreGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tyreCard: { width: "31%", padding: 12, borderRadius: 10, borderWidth: 1.5 },
  tyreCardPos: { fontSize: 10.5, fontWeight: "700", color: "#555", marginBottom: 4 },
  tyreCardHealth: { fontSize: 22, fontWeight: "900", marginBottom: 2 },
  tyreCardBar: { height: 5, borderRadius: 3, backgroundColor: "#e0e0e0", marginBottom: 6, overflow: "hidden" },
  tyreCardBarFill: { height: "100%", borderRadius: 3 },
  tyreCardKm: { fontSize: 9.5, color: "#666", marginBottom: 2 },
  tyreCardBrand: { fontSize: 9.5, color: "#888" },
  tyreCardPred: { fontSize: 9, marginTop: 4 },
  tyreCardCpk: { fontSize: 9, marginTop: 2, color: PRIMARY, fontWeight: "700" },
  filterRow: { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
  filterChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  filterChipText: { fontSize: 12, fontWeight: "600", color: MUTED },
  filterChipTextActive: { color: "#fff" },
  list: { paddingHorizontal: 16, gap: 10, paddingBottom: 80 },
  logCard: { backgroundColor: CARD, borderRadius: 12, padding: 14, flexDirection: "row", justifyContent: "space-between", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  logCardLeft: { flex: 1 },
  logCardRight: { alignItems: "flex-end", marginLeft: 12 },
  logTypeBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginBottom: 4 },
  logTypeBadgeText: { fontSize: 11, fontWeight: "700" },
  logVehicle: { fontSize: 13, fontWeight: "700", color: PRIMARY, marginBottom: 2 },
  logMeta: { fontSize: 12, color: MUTED },
  logOdo: { fontSize: 11, color: MUTED, marginTop: 1 },
  logAmount: { fontSize: 15, fontWeight: "700", color: PRIMARY },
  logDate: { fontSize: 11, color: MUTED, marginTop: 2 },
  empty: { padding: 60, alignItems: "center", gap: 12 },
  emptyText: { fontSize: 14, color: MUTED, textAlign: "center" },
  fab: { position: "absolute", bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center", shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
});

const f = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  headerTitle: { fontSize: 18, fontWeight: "800", color: TEXT },
  scroll: { padding: 16 },
  row: { flexDirection: "row", gap: 12 },
  fieldGroup: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: "600", color: MUTED, marginBottom: 6 },
  input: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: BORDER, borderRadius: 10, padding: 12, fontSize: 14, color: TEXT },
  pickerBtn: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: BORDER, borderRadius: 10, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pickerText: { fontSize: 14, color: TEXT, flex: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "60%" as any },
  sheetTitle: { fontSize: 16, fontWeight: "700", color: TEXT, marginBottom: 16, textAlign: "center" },
  sheetOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  sheetOptionActive: { backgroundColor: "#F0F4FF" },
  sheetOptionText: { fontSize: 14, color: TEXT, flex: 1 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: BORDER },
  saveBtn: { backgroundColor: PRIMARY, borderRadius: 12, padding: 16, alignItems: "center" },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});

const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: 20 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 20, width: "100%", maxWidth: 440, maxHeight: "85%" as any },
  closeBtn: { position: "absolute", top: 16, right: 16, zIndex: 1 },
  title: { fontSize: 16, fontWeight: "700", color: TEXT, marginBottom: 4 },
  subtitle: { fontSize: 12.5, color: MUTED, marginBottom: 18 },
  footerRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  cancelBtn: { flex: 1, alignItems: "center", padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: BORDER },
  cancelBtnText: { fontWeight: "700", color: MUTED },
  saveBtn: { flex: 1, alignItems: "center", padding: 12, borderRadius: 10, backgroundColor: PRIMARY },
  saveBtnText: { fontWeight: "700", color: "#fff" },
});

const su = StyleSheet.create({
  countRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  countBtn: { width: 48, height: 40, borderRadius: 8, borderWidth: 2, borderColor: BORDER, alignItems: "center", justifyContent: "center" },
  countBtnActive: { borderColor: PRIMARY, backgroundColor: PRIMARY },
  countBtnText: { fontWeight: "700", fontSize: 14, color: "#555" },
  countBtnTextActive: { color: "#fff" },
  spareRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: BORDER, alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  spareLabel: { fontSize: 14, fontWeight: "600", color: TEXT },
  hint: { fontSize: 11, color: MUTED, marginTop: -6, marginBottom: 12 },
  previewBox: { backgroundColor: "#F0F4FF", borderRadius: 8, padding: 12, marginBottom: 16 },
  previewText: { fontSize: 12, color: PRIMARY, lineHeight: 18 },
});

const et = StyleSheet.create({
  healthRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  healthPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  healthPillText: { fontWeight: "800", fontSize: 18 },
  healthLabel: { fontSize: 12, color: MUTED },
  predBox: { padding: 10, borderRadius: 8, marginBottom: 14 },
  predText: { fontSize: 12.5, fontWeight: "600" },
  section: { borderTopWidth: 1, borderTopColor: "#F0F0F8", paddingTop: 14, marginTop: 4 },
  sectionTitle: { fontSize: 12, fontWeight: "700", color: "#555", marginBottom: 8 },
  logRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 10, backgroundColor: "#F8F9FF", borderRadius: 8, marginBottom: 4 },
  logRowDate: { fontSize: 12.5, color: MUTED },
  logRowValue: { fontSize: 12.5, fontWeight: "700", color: PRIMARY },
  emptyLogText: { fontSize: 12, color: "#ccc", marginBottom: 8 },
  addSmallBtn: { backgroundColor: PRIMARY, borderRadius: 10, paddingHorizontal: 16, justifyContent: "center", marginTop: 22, height: 44 },
  addSmallBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  issueRow: { flexDirection: "row", justifyContent: "space-between", padding: 10, backgroundColor: "#fff3e0", borderRadius: 8, marginBottom: 4 },
  issueLabel: { fontWeight: "700", color: "#e65100", fontSize: 12.5 },
  issueDesc: { color: MUTED, fontSize: 11.5, marginTop: 1 },
  issueImpact: { fontSize: 11.5, color: DANGER, fontWeight: "700" },
  issueDate: { fontSize: 10.5, color: MUTED },
  issueForm: { backgroundColor: "#fff8f0", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#ffe0b2", marginTop: 8 },
  issueFormTitle: { fontSize: 11.5, fontWeight: "700", color: "#e65100", marginBottom: 10 },
  issueHint: { fontSize: 11, color: "#e65100", marginTop: -4, marginBottom: 10 },
  logIssueBtn: { backgroundColor: "#e65100", borderRadius: 8, padding: 12, alignItems: "center" },
  logIssueBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
