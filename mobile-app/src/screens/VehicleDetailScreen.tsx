import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRoute, useNavigation, RouteProp, useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import { vehicleService } from "../lib/services/vehicleService";
import { documentService, DOCUMENT_CATEGORIES, expiryStatus } from "../lib/services/documentService";
import ScreenHeader from "../components/ScreenHeader";
import Card from "../components/Card";
import StatusBadge from "../components/StatusBadge";
import DeleteButton from "../components/DeleteButton";
import FormField from "../components/FormField";
import DateField from "../components/DateField";
import ChipPicker from "../components/ChipPicker";
import { colors, radii, spacing, type } from "../theme";
import type { VehiclesStackParamList } from "../navigation";
import type { Document } from "../lib/types";

const STATUS_TONE: Record<string, { label: string; tone: "success" | "warning" | "neutral" | "info" }> = {
  active: { label: "Available", tone: "success" },
  in_trip: { label: "On Trip", tone: "info" },
  maintenance: { label: "In Maintenance", tone: "warning" },
  inactive: { label: "Inactive", tone: "neutral" },
};

// Mandatory vehicle document categories
const VEHICLE_DOC_CATEGORIES = [
  "Registration Certificate (RC)",
  "Insurance Policy",
  "Fitness Certificate",
  "Pollution Under Control (PUC)",
  "Road Permit",
  "Load Challan",
  "Other",
];

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function VehicleDetailScreen() {
  const { params } = useRoute<RouteProp<VehiclesStackParamList, "VehicleDetail">>();
  const navigation = useNavigation();
  const v = params.vehicle;
  const st = STATUS_TONE[v.status] ?? { label: v.status, tone: "neutral" as const };

  const [docs, setDocs] = useState<Document[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [saving, setSaving] = useState(false);

  // Upload form state
  const [pickedFile, setPickedFile] = useState<{ uri: string; name: string; mimeType: string | null } | null>(null);
  const [docName, setDocName] = useState("");
  const [docCategory, setDocCategory] = useState(VEHICLE_DOC_CATEGORIES[0]);
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");

  const loadDocs = useCallback(async () => {
    const res = await documentService.getByLinked("vehicle", v.id);
    if (res.success) setDocs(res.data ?? []);
    setDocsLoading(false);
  }, [v.id]);

  useFocusEffect(useCallback(() => { loadDocs(); }, [loadDocs]));

  async function handlePickFile() {
    const res = await DocumentPicker.getDocumentAsync({ type: ["image/*", "application/pdf"], copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    setPickedFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? null });
    if (!docName) setDocName(asset.name.replace(/\.[^.]+$/, ""));
  }

  async function handleUpload() {
    if (!pickedFile) return Alert.alert("Choose a file", "Pick a file to upload first.");
    if (!docName.trim()) return Alert.alert("Name required", "Give the document a name.");
    setSaving(true);
    const res = await documentService.create(pickedFile, {
      name: docName.trim(),
      category: docCategory,
      expiry_date: expiryDate || null,
      notes: notes || null,
      linked_type: "vehicle",
      linked_id: v.id,
    });
    setSaving(false);
    if (res.success) {
      setPickedFile(null); setDocName(""); setExpiryDate(""); setNotes("");
      setDocCategory(VEHICLE_DOC_CATEGORIES[0]);
      setShowUpload(false);
      loadDocs();
    } else {
      Alert.alert("Couldn't upload", res.error ?? "Please try again.");
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader
        title={v.registration_number}
        right={
          <DeleteButton
            label="vehicle"
            onDelete={() => vehicleService.delete(v.id)}
            onDeleted={() => navigation.goBack()}
          />
        }
      />
      <ScrollView contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.stackGap, paddingBottom: 40 }}>

        {/* Identity */}
        <Card>
          <Text style={styles.regNumber}>{v.registration_number}</Text>
          <Text style={styles.makeModel}>{v.make} {v.model}{v.year ? ` · ${v.year}` : ""}</Text>
          <View style={{ marginTop: 8 }}>
            <StatusBadge label={st.label} tone={st.tone} />
          </View>
        </Card>

        {/* Details */}
        <Card>
          <Row label="Vehicle Type" value={v.vehicle_type} />
          {v.vehicle_class ? <Row label="Vehicle Class" value={v.vehicle_class} /> : null}
          <Row label="Fuel Type" value={v.fuel_type ?? "—"} />
          {v.color ? <Row label="Color" value={v.color} /> : null}
          <Row label="Chassis Number" value={v.chassis_number ?? "—"} />
          <Row label="Engine Number" value={v.engine_number ?? "—"} />
          <Row label="Owner Name" value={v.owner_name ?? "—"} />
          <Row label="RTO Code" value={v.rto_code ?? "—"} />
          <Row label="Avg. Mileage" value={v.avg_mileage_kmpl != null ? `${v.avg_mileage_kmpl} km/l` : "—"} />
        </Card>

        {/* Compliance dates */}
        <Card>
          <Text style={styles.sectionHeading}>Compliance Dates</Text>
          <Row label="Insurance Expiry" value={formatDate(v.insurance_expiry)} />
          <Row label="Fitness Expiry" value={formatDate(v.fitness_expiry)} />
          <Row label="PUC Expiry" value={formatDate(v.puc_expiry)} />
          <Row label="Permit Expiry" value={formatDate(v.permit_expiry)} />
        </Card>

        {/* Documents */}
        <View>
          <View style={styles.docSectionHeader}>
            <Text style={styles.sectionHeadingStandalone}>Documents</Text>
            <TouchableOpacity style={styles.uploadBtn} onPress={() => setShowUpload((v) => !v)}>
              <MaterialIcons name={showUpload ? "close" : "upload-file"} size={14} color={colors.onPrimaryContainer} />
              <Text style={styles.uploadBtnText}>{showUpload ? "Cancel" : "Upload"}</Text>
            </TouchableOpacity>
          </View>

          {showUpload ? (
            <Card>
              <TouchableOpacity style={styles.pickBtn} onPress={handlePickFile}>
                <MaterialIcons name="attach-file" size={18} color={colors.primary} />
                <Text style={styles.pickBtnText}>{pickedFile ? pickedFile.name : "Choose file (image or PDF) *"}</Text>
              </TouchableOpacity>
              <FormField label="Document Name" required value={docName} onChangeText={setDocName} placeholder="e.g. Insurance Policy" />
              <ChipPicker label="Category *" options={VEHICLE_DOC_CATEGORIES} value={docCategory} onChange={(v) => setDocCategory(v ?? VEHICLE_DOC_CATEGORIES[0])} />
              <DateField label="Expiry Date" value={expiryDate} onChange={setExpiryDate} placeholder="Optional" />
              <FormField label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional" />
              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleUpload} disabled={saving}>
                {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Upload Document</Text>}
              </TouchableOpacity>
            </Card>
          ) : null}

          {docsLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />
          ) : docs.length === 0 ? (
            <Card>
              <Text style={{ color: colors.onSurfaceVariant, ...type.bodyMd }}>No documents uploaded yet.</Text>
            </Card>
          ) : (
            <View style={{ gap: spacing.stackGap }}>
              {docs.map((d) => {
                const st = expiryStatus(d.expiry_date);
                return (
                  <Card key={d.id}>
                    <View style={styles.docRow}>
                      <TouchableOpacity style={{ flex: 1 }} onPress={() => d.file_url && Linking.openURL(d.file_url)}>
                        <Text style={styles.docName}>{d.name}</Text>
                        <Text style={styles.docMeta}>
                          {d.category ?? "Other"}
                          {d.expiry_date
                            ? ` · ${new Date(d.expiry_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                            : ""}
                        </Text>
                      </TouchableOpacity>
                      {st ? <StatusBadge label={st === "expired" ? "Expired" : "Expiring"} tone="warning" /> : null}
                      <DeleteButton label="document" onDelete={() => documentService.delete(d.id)} onDeleted={loadDocs} />
                    </View>
                  </Card>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  regNumber: { ...type.headlineSm, color: colors.onSurface },
  makeModel: { ...type.bodyMd, color: colors.onSurfaceVariant, marginTop: 2 },
  sectionHeading: { ...type.labelMd, color: colors.onSurfaceVariant, textTransform: "uppercase", marginBottom: 8 },
  sectionHeadingStandalone: { ...type.headlineSm, color: colors.onBackground },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  rowLabel: { ...type.bodyMd, color: colors.onSurfaceVariant },
  rowValue: { ...type.bodyMd, color: colors.onSurface, fontWeight: "600", maxWidth: "55%", textAlign: "right" },
  docSectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.stackGap },
  uploadBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.primaryContainer, borderRadius: radii.full, paddingHorizontal: 12, paddingVertical: 7 },
  uploadBtnText: { ...type.labelMd, color: colors.onPrimaryContainer },
  pickBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1.5, borderColor: colors.outlineVariant, borderStyle: "dashed", borderRadius: radii.md, padding: 14, marginBottom: 14 },
  pickBtnText: { ...type.bodyMd, color: colors.onSurfaceVariant, flexShrink: 1 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: 12, alignItems: "center", marginTop: 4 },
  saveBtnText: { color: "white", fontWeight: "700" },
  docRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  docName: { ...type.bodyLg, fontWeight: "600", color: colors.onSurface },
  docMeta: { fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
});
