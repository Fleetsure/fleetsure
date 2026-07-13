import { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { partyService } from "../lib/services/partyService";
import ScreenHeader from "../components/ScreenHeader";
import Card from "../components/Card";
import FormField from "../components/FormField";
import ChipPicker from "../components/ChipPicker";
import DeleteButton from "../components/DeleteButton";
import { colors, radii, spacing, type, formatCurrency } from "../theme";
import type { Party } from "../lib/types";

const PARTY_TYPES = ["customer", "transporter", "vendor"];
const PARTY_LABELS: Record<string, string> = { customer: "Customer", transporter: "Transporter", vendor: "Vendor" };

export default function PartiesScreen() {
  const [loading, setLoading] = useState(true);
  const [parties, setParties] = useState<Party[]>([]);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gstin, setGstin] = useState("");
  const [partyType, setPartyType] = useState("customer");
  const [openingBalance, setOpeningBalance] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    const res = await partyService.getAll();
    if (res.success) setParties(res.data ?? []);
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load]));

  const filtered = useMemo(() => (filterType ? parties.filter((p) => p.party_type === filterType) : parties), [parties, filterType]);

  function resetForm() {
    setEditingId(null);
    setName(""); setPhone(""); setGstin(""); setPartyType("customer"); setOpeningBalance(""); setAddress(""); setNotes("");
  }

  function openEdit(p: Party) {
    setEditingId(p.id);
    setName(p.name); setPhone(p.phone ?? ""); setGstin(p.gstin ?? ""); setPartyType(p.party_type);
    setOpeningBalance(p.opening_balance != null ? String(p.opening_balance) : "");
    setAddress(p.address ?? ""); setNotes(p.notes ?? "");
    setShowAdd(true);
  }

  async function handleSave() {
    if (!name.trim()) return Alert.alert("Name required", "Enter a party name.");
    setSaving(true);
    const payload = {
      name: name.trim(), phone: phone || null, gstin: gstin ? gstin.toUpperCase() : null,
      party_type: partyType as any, opening_balance: openingBalance ? Number(openingBalance) : 0,
      address: address || null, notes: notes || null,
    };
    const res = editingId ? await partyService.update(editingId, payload) : await partyService.create(payload);
    setSaving(false);
    if (res.success) { resetForm(); setShowAdd(false); load(); } else Alert.alert("Couldn't save", res.error ?? "Please try again.");
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <ScreenHeader title="Parties" />
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title="Parties" />
      <ScrollView contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.stackGap, paddingBottom: 32 }}>
        <TouchableOpacity style={styles.addBtn} onPress={() => { if (showAdd) resetForm(); setShowAdd((v) => !v); }}>
          <MaterialIcons name={showAdd ? "close" : "add"} size={16} color={colors.onPrimaryContainer} />
          <Text style={styles.addBtnText}>{showAdd ? "Cancel" : "Add Party"}</Text>
        </TouchableOpacity>

        {showAdd ? (
          <Card>
            <ChipPicker label="Type" options={PARTY_TYPES.map((t) => PARTY_LABELS[t])} value={PARTY_LABELS[partyType]} onChange={(v) => setPartyType(PARTY_TYPES.find((t) => PARTY_LABELS[t] === v) ?? "customer")} />
            <FormField label="Name" required value={name} onChangeText={setName} placeholder="Party name" />
            <FormField label="Phone" value={phone} onChangeText={setPhone} placeholder="Optional" keyboardType="phone-pad" />
            <FormField label="GSTIN" value={gstin} onChangeText={setGstin} placeholder="Optional" autoCapitalize="characters" />
            <FormField label="Opening Balance (₹)" value={openingBalance} onChangeText={setOpeningBalance} placeholder="0 — positive if they owe you" keyboardType="numeric" />
            <FormField label="Address" value={address} onChangeText={setAddress} placeholder="Optional" />
            <FormField label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional" />
            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>{editingId ? "Save Changes" : "Save Party"}</Text>}
            </TouchableOpacity>
          </Card>
        ) : null}

        <View style={styles.chipRow}>
          <TouchableOpacity style={[styles.chip, filterType === null && styles.chipActive]} onPress={() => setFilterType(null)}>
            <Text style={[styles.chipText, filterType === null && styles.chipTextActive]}>All ({parties.length})</Text>
          </TouchableOpacity>
          {PARTY_TYPES.map((t) => (
            <TouchableOpacity key={t} style={[styles.chip, filterType === t && styles.chipActive]} onPress={() => setFilterType(t)}>
              <Text style={[styles.chipText, filterType === t && styles.chipTextActive]}>{PARTY_LABELS[t]} ({parties.filter((p) => p.party_type === t).length})</Text>
            </TouchableOpacity>
          ))}
        </View>

        {filtered.length === 0 ? (
          <Card><Text style={{ color: colors.onSurfaceVariant }}>No parties yet.</Text></Card>
        ) : (
          <View style={{ gap: spacing.stackGap }}>
            {filtered.map((p) => {
              const balance = p.opening_balance ?? 0;
              return (
                <Card key={p.id}>
                  <View style={styles.row}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => openEdit(p)}>
                      <Text style={styles.docName}>{p.name}</Text>
                      <Text style={styles.docMeta}>{PARTY_LABELS[p.party_type]}{p.phone ? ` · ${p.phone}` : ""}</Text>
                    </TouchableOpacity>
                    {balance !== 0 ? (
                      <Text style={[styles.balanceText, { color: balance > 0 ? colors.success : colors.error }]}>
                        {balance > 0 ? "+" : "−"}{formatCurrency(Math.abs(balance))}
                      </Text>
                    ) : null}
                    <DeleteButton label="party" onDelete={() => partyService.delete(p.id)} onDeleted={load} />
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: colors.primaryContainer, borderRadius: radii.md, paddingVertical: 12 },
  addBtnText: { ...type.labelMd, color: colors.onPrimaryContainer },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: 12, alignItems: "center", marginTop: 4 },
  saveBtnText: { color: "white", fontWeight: "700" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.full, borderWidth: 1, borderColor: colors.outlineVariant, backgroundColor: colors.surfaceContainerLowest },
  chipActive: { backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.onSurfaceVariant },
  chipTextActive: { color: colors.onPrimaryContainer },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  docName: { ...type.bodyLg, fontWeight: "600", color: colors.onSurface },
  docMeta: { fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
  balanceText: { fontWeight: "700", fontSize: 14 },
});
