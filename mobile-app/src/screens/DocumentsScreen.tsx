import React, { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { documentService, DOCUMENT_CATEGORIES, expiryStatus } from "../lib/services/documentService";
import { vehicleService } from "../lib/services/vehicleService";
import { driverService } from "../lib/services/driverService";
import { tripService } from "../lib/services/tripService";
import { useFirm } from "../context/FirmContext";
import ScreenHeader from "../components/ScreenHeader";
import Card from "../components/Card";
import StatusBadge from "../components/StatusBadge";
import FormField from "../components/FormField";
import DateField from "../components/DateField";
import ChipPicker from "../components/ChipPicker";
import DeleteButton from "../components/DeleteButton";
import { colors, radii, spacing, type } from "../theme";
import type { Document, Vehicle, Driver, Trip } from "../lib/types";

const LINK_TYPES = ["none", "driver", "vehicle", "trip"];

export default function DocumentsScreen() {
  const { firmVersion } = useFirm();
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<Document[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [linkedTypeFilter, setLinkedTypeFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const [pickedFile, setPickedFile] = useState<{ uri: string; name: string; mimeType: string | null } | null>(null);
  const [name, setName] = useState("");
  const [uploadCategory, setUploadCategory] = useState<string>(DOCUMENT_CATEGORIES[0]);
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [linkedType, setLinkedType] = useState("none");
  const [linkedLabel, setLinkedLabel] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [docRes, vehRes, drvRes, tripRes] = await Promise.all([
      documentService.getAll(), vehicleService.getAll(), driverService.getAll(), tripService.getAll(),
    ]);
    if (docRes.success) setDocs(docRes.data ?? []);
    if (vehRes.success) setVehicles(vehRes.data ?? []);
    if (drvRes.success) setDrivers(drvRes.data ?? []);
    if (tripRes.success) setTrips(tripRes.data ?? []);
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load, firmVersion]));

  const filtered = useMemo(() => {
    let result = docs;
    if (category) result = result.filter((d) => d.category === category);
    if (linkedTypeFilter) result = result.filter((d) => d.linked_type === linkedTypeFilter);
    if (statusFilter === "expired") result = result.filter((d) => expiryStatus(d.expiry_date) === "expired");
    else if (statusFilter === "expiring_soon") result = result.filter((d) => expiryStatus(d.expiry_date) === "expiring_soon");
    return result;
  }, [docs, category, linkedTypeFilter, statusFilter]);

  const expirySummary = useMemo(() => {
    let expiringSoon = 0, expired = 0;
    for (const d of docs) {
      const st = expiryStatus(d.expiry_date);
      if (st === "expiring_soon") expiringSoon++;
      else if (st === "expired") expired++;
    }
    return { expiringSoon, expired };
  }, [docs]);

  const linkOptions = useMemo(() => {
    if (linkedType === "driver") return drivers.map((d) => ({ id: d.id, label: d.name }));
    if (linkedType === "vehicle") return vehicles.map((v) => ({ id: v.id, label: v.registration_number }));
    if (linkedType === "trip") return trips.map((t) => ({ id: t.id, label: `${t.origin} → ${t.destination}` }));
    return [];
  }, [linkedType, drivers, vehicles, trips]);

  async function handlePickFile() {
    const res = await DocumentPicker.getDocumentAsync({ type: ["image/*", "application/pdf"], copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    setPickedFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? null });
    if (!name) setName(asset.name.replace(/\.[^.]+$/, ""));
  }

  async function handleUpload() {
    if (!pickedFile) return Alert.alert("Choose a file", "Pick a file to upload first.");
    if (!name.trim()) return Alert.alert("Name required", "Give the document a name.");
    const linkedId = linkedType !== "none" ? linkOptions.find((o) => o.label === linkedLabel)?.id ?? null : null;
    setSaving(true);
    const res = await documentService.create(pickedFile, {
      name: name.trim(), category: uploadCategory, expiry_date: expiryDate || null, notes: notes || null,
      linked_type: linkedType !== "none" ? linkedType : null, linked_id: linkedId,
    });
    setSaving(false);
    if (res.success) {
      setPickedFile(null); setName(""); setExpiryDate(""); setUploadCategory(DOCUMENT_CATEGORIES[0]);
      setNotes(""); setLinkedType("none"); setLinkedLabel(null);
      setShowAdd(false);
      load();
    } else {
      Alert.alert("Couldn't upload", res.error ?? "Please try again.");
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <ScreenHeader title="Documents" />
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title="Documents" />
      <ScrollView contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.stackGap, paddingBottom: 32 }}>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd((v) => !v)}>
          <MaterialIcons name={showAdd ? "close" : "upload-file"} size={16} color={colors.onPrimaryContainer} />
          <Text style={styles.addBtnText}>{showAdd ? "Cancel" : "Upload Document"}</Text>
        </TouchableOpacity>

        {showAdd ? (
          <Card>
            <TouchableOpacity style={styles.pickBtn} onPress={handlePickFile}>
              <MaterialIcons name="attach-file" size={18} color={colors.primary} />
              <Text style={styles.pickBtnText}>{pickedFile ? pickedFile.name : "Choose file (image or PDF)"}</Text>
            </TouchableOpacity>
            <FormField label="Name" required value={name} onChangeText={setName} placeholder="e.g. Insurance Policy" />
            <ChipPicker label="Category" options={DOCUMENT_CATEGORIES as unknown as string[]} value={uploadCategory} onChange={setUploadCategory} />
            <ChipPicker label="Linked To" options={LINK_TYPES} value={linkedType} onChange={(v) => { setLinkedType(v); setLinkedLabel(null); }} />
            {linkedType !== "none" ? (
              <ChipPicker label={`Select ${linkedType}`} options={linkOptions.map((o) => o.label)} value={linkedLabel} onChange={setLinkedLabel} />
            ) : null}
            <DateField label="Expiry Date" value={expiryDate} onChange={setExpiryDate} placeholder="Optional" />
            <FormField label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional" />
            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleUpload} disabled={saving}>
              {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Upload</Text>}
            </TouchableOpacity>
          </Card>
        ) : null}

        {expirySummary.expired + expirySummary.expiringSoon > 0 ? (
          <Card style={styles.alertCard}>
            <MaterialIcons name="warning" size={16} color={colors.warning} />
            <Text style={styles.alertText}>
              {expirySummary.expired > 0 ? `${expirySummary.expired} expired` : ""}
              {expirySummary.expired > 0 && expirySummary.expiringSoon > 0 ? " · " : ""}
              {expirySummary.expiringSoon > 0 ? `${expirySummary.expiringSoon} expiring within 30 days` : ""}
            </Text>
          </Card>
        ) : null}

        {/* Linked-to filter */}
        <View>
          <Text style={styles.filterLabel}>Linked To</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {[null, "vehicle", "driver", "trip"].map((t) => (
                <TouchableOpacity key={String(t)} style={[styles.chip, linkedTypeFilter === t && styles.chipActive]} onPress={() => setLinkedTypeFilter(t)}>
                  <Text style={[styles.chipText, linkedTypeFilter === t && styles.chipTextActive]}>
                    {t === null ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Status filter */}
        <View>
          <Text style={styles.filterLabel}>Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {([null, "expiring_soon", "expired"] as const).map((s) => (
                <TouchableOpacity key={String(s)} style={[styles.chip, statusFilter === s && styles.chipActive]} onPress={() => setStatusFilter(s ?? null)}>
                  <Text style={[styles.chipText, statusFilter === s && styles.chipTextActive]}>
                    {s === null ? "All" : s === "expiring_soon" ? "Expiring Soon" : "Expired"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Category filter */}
        <View>
          <Text style={styles.filterLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              <TouchableOpacity style={[styles.chip, category === null && styles.chipActive]} onPress={() => setCategory(null)}>
                <Text style={[styles.chipText, category === null && styles.chipTextActive]}>All ({docs.length})</Text>
              </TouchableOpacity>
              {DOCUMENT_CATEGORIES.map((c) => {
                const count = docs.filter((d) => d.category === c).length;
                return (
                  <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
                    <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c} ({count})</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {filtered.length === 0 ? (
          <Card><Text style={{ color: colors.onSurfaceVariant }}>No documents in this category yet.</Text></Card>
        ) : (
          <View style={{ gap: spacing.stackGap }}>
            {filtered.map((d) => {
              const st = expiryStatus(d.expiry_date);
              return (
                <Card key={d.id}>
                  <View style={styles.row}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => d.file_url && Linking.openURL(d.file_url)}>
                      <Text style={styles.docName}>{d.name}</Text>
                      <Text style={styles.docMeta}>{d.category ?? "Other"}{d.expiry_date ? ` · Expires ${new Date(d.expiry_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}</Text>
                      {d.notes ? <Text style={styles.docMeta}>{d.notes}</Text> : null}
                    </TouchableOpacity>
                    {st ? <StatusBadge label={st === "expired" ? "Expired" : "Expiring Soon"} tone="warning" /> : null}
                    <DeleteButton label="document" onDelete={() => documentService.delete(d.id)} onDeleted={load} />
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
  pickBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1.5, borderColor: colors.outlineVariant, borderStyle: "dashed", borderRadius: radii.md, padding: 14, marginBottom: 14 },
  alertCard: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.errorContainer },
  alertText: { ...type.bodyMd, color: colors.onErrorContainer, flexShrink: 1 },
  pickBtnText: { ...type.bodyMd, color: colors.onSurfaceVariant, flexShrink: 1 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: 12, alignItems: "center", marginTop: 4 },
  saveBtnText: { color: "white", fontWeight: "700" },
  filterLabel: { fontSize: 11, fontWeight: "700", color: colors.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, marginLeft: 2 },
  chipRow: { flexDirection: "row", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.full, borderWidth: 1, borderColor: colors.outlineVariant, backgroundColor: colors.surfaceContainerLowest },
  chipActive: { backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.onSurfaceVariant },
  chipTextActive: { color: colors.onPrimaryContainer },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  docName: { ...type.bodyLg, fontWeight: "600", color: colors.onSurface },
  docMeta: { fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
});
