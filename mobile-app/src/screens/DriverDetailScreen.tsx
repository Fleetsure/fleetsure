import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRoute, useNavigation, RouteProp, useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import { driverService } from "../lib/services/driverService";
import { documentService, expiryStatus } from "../lib/services/documentService";
import ScreenHeader from "../components/ScreenHeader";
import Card from "../components/Card";
import StatusBadge from "../components/StatusBadge";
import DeleteButton from "../components/DeleteButton";
import FormField from "../components/FormField";
import DateField from "../components/DateField";
import ChipPicker from "../components/ChipPicker";
import { colors, radii, spacing, type } from "../theme";
import type { DriversStackParamList } from "../navigation";
import type { Document } from "../lib/types";

const STATUS_TONE: Record<string, { label: string; tone: "success" | "warning" | "neutral" | "info" }> = {
  available: { label: "Available", tone: "success" },
  on_trip: { label: "On Trip", tone: "info" },
  inactive: { label: "On Leave", tone: "neutral" },
};

// Mandatory driver document categories
const DRIVER_DOC_CATEGORIES = [
  "Driving Licence",
  "Aadhar Card",
  "PAN Card",
  "Passport Photo",
  "Medical Certificate",
  "Police Verification",
  "Other",
];

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function DriverDetailScreen() {
  const { params } = useRoute<RouteProp<DriversStackParamList, "DriverDetail">>();
  const navigation = useNavigation();
  const d = params.driver;
  const st = STATUS_TONE[d.status] ?? { label: d.status, tone: "neutral" as const };

  const [docs, setDocs] = useState<Document[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [saving, setSaving] = useState(false);

  // Upload form state
  const [pickedFile, setPickedFile] = useState<{ uri: string; name: string; mimeType: string | null } | null>(null);
  const [docName, setDocName] = useState("");
  const [docCategory, setDocCategory] = useState(DRIVER_DOC_CATEGORIES[0]);
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");

  const loadDocs = useCallback(async () => {
    const res = await documentService.getByLinked("driver", d.id);
    if (res.success) setDocs(res.data ?? []);
    setDocsLoading(false);
  }, [d.id]);

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
      linked_type: "driver",
      linked_id: d.id,
    });
    setSaving(false);
    if (res.success) {
      setPickedFile(null); setDocName(""); setExpiryDate(""); setNotes("");
      setDocCategory(DRIVER_DOC_CATEGORIES[0]);
      setShowUpload(false);
      loadDocs();
    } else {
      Alert.alert("Couldn't upload", res.error ?? "Please try again.");
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader
        title={d.name}
        right={
          <DeleteButton
            label="driver"
            onDelete={() => driverService.delete(d.id)}
            onDeleted={() => navigation.goBack()}
          />
        }
      />
      <ScrollView contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.stackGap, paddingBottom: 40 }}>

        {/* Identity card */}
        <Card>
          <View style={styles.topRow}>
            <View style={styles.avatar}>
              <MaterialIcons name="person" size={28} color={colors.onSurfaceVariant} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{d.name}</Text>
              <StatusBadge label={st.label} tone={st.tone} />
            </View>
            <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${d.phone}`)}>
              <MaterialIcons name="call" size={18} color="white" />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Details */}
        <Card>
          <Row label="Phone" value={d.phone} />
          {d.alternate_phone ? <Row label="Alternate Phone" value={d.alternate_phone} /> : null}
          {d.license_number ? <Row label="License Number" value={d.license_number} /> : null}
          {d.license_class ? <Row label="License Class" value={d.license_class} /> : null}
          {d.license_expiry ? <Row label="License Expiry" value={formatDate(d.license_expiry)} /> : null}
          {d.address ? <Row label="Current Address" value={d.address} /> : null}
        </Card>

        {/* Emergency contact */}
        {(d.emergency_contact_name || d.emergency_contact_phone) ? (
          <Card>
            <Text style={styles.sectionLabel}>Emergency Contact</Text>
            <Row label="Name" value={d.emergency_contact_name ?? "—"} />
            {d.emergency_contact_phone ? <Row label="Phone" value={d.emergency_contact_phone} /> : null}
          </Card>
        ) : null}

        {/* Documents */}
        <View>
          <View style={styles.docSectionHeader}>
            <Text style={styles.sectionHeading}>Documents</Text>
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
              <FormField label="Document Name" required value={docName} onChangeText={setDocName} placeholder="e.g. Aadhar Card" />
              <ChipPicker label="Category *" options={DRIVER_DOC_CATEGORIES} value={docCategory} onChange={(v) => setDocCategory(v ?? DRIVER_DOC_CATEGORIES[0])} />
              <DateField label="Expiry Date" value={expiryDate} onChange={setExpiryDate} placeholder="Optional (for Licence, etc.)" />
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
              {docs.map((doc) => {
                const docSt = expiryStatus(doc.expiry_date);
                return (
                  <Card key={doc.id}>
                    <View style={styles.docRow}>
                      <TouchableOpacity style={{ flex: 1 }} onPress={() => doc.file_url && Linking.openURL(doc.file_url)}>
                        <Text style={styles.docName}>{doc.name}</Text>
                        <Text style={styles.docMeta}>
                          {doc.category ?? "Other"}
                          {doc.expiry_date
                            ? ` · ${new Date(doc.expiry_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                            : ""}
                        </Text>
                      </TouchableOpacity>
                      {docSt ? <StatusBadge label={docSt === "expired" ? "Expired" : "Expiring"} tone="warning" /> : null}
                      <DeleteButton label="document" onDelete={() => documentService.delete(doc.id)} onDeleted={loadDocs} />
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
  topRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: radii.full, backgroundColor: colors.surfaceContainerHigh, justifyContent: "center", alignItems: "center" },
  name: { ...type.headlineSm, color: colors.onBackground, marginBottom: 4 },
  callBtn: { width: 40, height: 40, borderRadius: radii.full, backgroundColor: colors.success, justifyContent: "center", alignItems: "center" },
  sectionLabel: { ...type.labelMd, color: colors.onSurfaceVariant, textTransform: "uppercase", marginBottom: 8 },
  sectionHeading: { ...type.headlineSm, color: colors.onBackground },
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
