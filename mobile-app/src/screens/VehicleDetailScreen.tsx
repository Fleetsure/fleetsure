import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Linking, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRoute, useNavigation, RouteProp, useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import { pickImageFromGallery } from "../lib/pickImage";
import { vehicleService } from "../lib/services/vehicleService";
import { documentService, expiryStatus } from "../lib/services/documentService";
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
const STATUS_KEYS = Object.keys(STATUS_TONE);
const VEHICLE_TYPES = ["truck", "mini_truck", "trailer", "tanker", "container", "other"] as const;
const FUEL_TYPES = ["Diesel", "Petrol", "CNG", "Electric", "LNG", "Other"];

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

// Subset that must be on file for compliance — checked against uploaded doc categories.
const VEHICLE_REQUIRED_CATEGORIES = [
  "Registration Certificate (RC)",
  "Insurance Policy",
  "Fitness Certificate",
  "Pollution Under Control (PUC)",
  "Road Permit",
];

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function VehicleDetailScreen() {
  const { params } = useRoute<RouteProp<VehiclesStackParamList, "VehicleDetail">>();
  const navigation = useNavigation();
  const [v, setVehicle] = useState(params.vehicle);
  const st = STATUS_TONE[v.status] ?? { label: v.status, tone: "neutral" as const };

  const [docs, setDocs] = useState<Document[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [regNumber, setRegNumber] = useState(v.registration_number);
  const [make, setMake] = useState(v.make);
  const [model, setModel] = useState(v.model);
  const [year, setYear] = useState(v.year != null ? String(v.year) : "");
  const [vehicleType, setVehicleType] = useState<string | null>(v.vehicle_type);
  const [fuelType, setFuelType] = useState<string | null>(v.fuel_type);
  const [status, setStatus] = useState<string>(v.status);
  const [insuranceExpiry, setInsuranceExpiry] = useState(v.insurance_expiry ?? "");
  const [fitnessExpiry, setFitnessExpiry] = useState(v.fitness_expiry ?? "");
  const [pucExpiry, setPucExpiry] = useState(v.puc_expiry ?? "");
  const [permitExpiry, setPermitExpiry] = useState(v.permit_expiry ?? "");
  const [chassisNumber, setChassisNumber] = useState(v.chassis_number ?? "");
  const [engineNumber, setEngineNumber] = useState(v.engine_number ?? "");
  const [vehicleClass, setVehicleClass] = useState(v.vehicle_class ?? "");
  const [ownerName, setOwnerName] = useState(v.owner_name ?? "");
  const [rtoCode, setRtoCode] = useState(v.rto_code ?? "");
  const [color, setColor] = useState(v.color ?? "");
  const [avgMileage, setAvgMileage] = useState(v.avg_mileage_kmpl != null ? String(v.avg_mileage_kmpl) : "");

  function openEdit() {
    setRegNumber(v.registration_number); setMake(v.make); setModel(v.model);
    setYear(v.year != null ? String(v.year) : ""); setVehicleType(v.vehicle_type); setFuelType(v.fuel_type);
    setStatus(v.status); setInsuranceExpiry(v.insurance_expiry ?? ""); setFitnessExpiry(v.fitness_expiry ?? "");
    setPucExpiry(v.puc_expiry ?? ""); setPermitExpiry(v.permit_expiry ?? ""); setChassisNumber(v.chassis_number ?? "");
    setEngineNumber(v.engine_number ?? ""); setVehicleClass(v.vehicle_class ?? ""); setOwnerName(v.owner_name ?? "");
    setRtoCode(v.rto_code ?? ""); setColor(v.color ?? ""); setAvgMileage(v.avg_mileage_kmpl != null ? String(v.avg_mileage_kmpl) : "");
    setEditMode(true);
  }

  async function handleSaveEdit() {
    if (!regNumber.trim() || !make.trim() || !model.trim()) {
      return Alert.alert("Missing details", "Registration number, make and model are required.");
    }
    setEditSaving(true);
    const res = await vehicleService.update(v.id, {
      registration_number: regNumber.trim().toUpperCase().replace(/\s+/g, ""),
      make: make.trim(),
      model: model.trim(),
      year: year ? Number(year) : null,
      vehicle_type: (vehicleType ?? "truck") as any,
      fuel_type: fuelType,
      status: status as any,
      insurance_expiry: insuranceExpiry || null,
      fitness_expiry: fitnessExpiry || null,
      puc_expiry: pucExpiry || null,
      permit_expiry: permitExpiry || null,
      chassis_number: chassisNumber || null,
      engine_number: engineNumber || null,
      vehicle_class: vehicleClass || null,
      owner_name: ownerName || null,
      rto_code: rtoCode || null,
      color: color || null,
      avg_mileage_kmpl: avgMileage ? Number(avgMileage) : null,
    });
    setEditSaving(false);
    if (res.success && res.data) {
      setVehicle(res.data);
      setEditMode(false);
    } else {
      Alert.alert("Couldn't save", res.error ?? "Please try again.");
    }
  }

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

  async function handlePickFromGallery() {
    const asset = await pickImageFromGallery();
    if (!asset) return;
    setPickedFile(asset);
    if (!docName) setDocName(docCategory);
  }

  function openUploadFor(category: string) {
    setDocCategory(category);
    setShowUpload(true);
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
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScreenHeader
        title={v.registration_number}
        right={
          editMode ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <TouchableOpacity style={styles.headerBtn} onPress={() => setEditMode(false)}>
                <Text style={styles.headerBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.headerBtn, styles.headerBtnPrimary]} onPress={handleSaveEdit} disabled={editSaving}>
                {editSaving ? <ActivityIndicator size="small" color="white" /> : <Text style={[styles.headerBtnText, { color: "white" }]}>Save</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <TouchableOpacity style={styles.iconBtn} onPress={openEdit}>
                <MaterialIcons name="edit" size={20} color={colors.primary} />
              </TouchableOpacity>
              <DeleteButton
                label="vehicle"
                onDelete={() => vehicleService.delete(v.id)}
                onDeleted={() => navigation.goBack()}
              />
            </View>
          )
        }
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.stackGap, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {editMode ? (
          <Card>
            <FormField label="Registration Number" required value={regNumber} onChangeText={setRegNumber} autoCapitalize="characters" />
            <FormField label="Make" required value={make} onChangeText={setMake} />
            <FormField label="Model" required value={model} onChangeText={setModel} />
            <FormField label="Year" value={year} onChangeText={setYear} keyboardType="numeric" />
            <ChipPicker label="Vehicle Type" options={VEHICLE_TYPES} value={vehicleType} onChange={setVehicleType} />
            <ChipPicker label="Fuel Type" options={FUEL_TYPES} value={fuelType} onChange={setFuelType} />
            <ChipPicker
              label="Status"
              options={STATUS_KEYS.map((k) => STATUS_TONE[k].label)}
              value={STATUS_TONE[status]?.label ?? null}
              onChange={(val) => setStatus(STATUS_KEYS.find((k) => STATUS_TONE[k].label === val) ?? "active")}
            />
            <DateField label="Insurance Expiry" value={insuranceExpiry} onChange={setInsuranceExpiry} />
            <DateField label="Fitness Expiry" value={fitnessExpiry} onChange={setFitnessExpiry} />
            <DateField label="PUC Expiry" value={pucExpiry} onChange={setPucExpiry} />
            <DateField label="Permit Expiry" value={permitExpiry} onChange={setPermitExpiry} />
            <FormField label="Chassis Number" value={chassisNumber} onChangeText={setChassisNumber} placeholder="Optional" />
            <FormField label="Engine Number" value={engineNumber} onChangeText={setEngineNumber} placeholder="Optional" />
            <FormField label="Vehicle Class" value={vehicleClass} onChangeText={setVehicleClass} placeholder="Optional" />
            <FormField label="Owner Name" value={ownerName} onChangeText={setOwnerName} placeholder="Optional" />
            <FormField label="RTO Code" value={rtoCode} onChangeText={setRtoCode} placeholder="Optional" />
            <FormField label="Color" value={color} onChangeText={setColor} placeholder="Optional" />
            <FormField label="Avg. Mileage (km/l)" value={avgMileage} onChangeText={setAvgMileage} placeholder="Optional" keyboardType="numeric" />
          </Card>
        ) : (
          <>
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
        </>
        )}

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
              <View style={styles.pickRow}>
                <TouchableOpacity style={[styles.pickBtn, { flex: 1, marginBottom: 0 }]} onPress={handlePickFile}>
                  <MaterialIcons name="attach-file" size={18} color={colors.primary} />
                  <Text style={styles.pickBtnText} numberOfLines={1}>Pick File (PDF/Doc)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.pickBtn, { flex: 1, marginBottom: 0 }]} onPress={handlePickFromGallery}>
                  <MaterialIcons name="photo-library" size={18} color={colors.primary} />
                  <Text style={styles.pickBtnText} numberOfLines={1}>Pick from Gallery</Text>
                </TouchableOpacity>
              </View>
              {pickedFile ? <Text style={styles.pickedFileText}>{pickedFile.name}</Text> : null}
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

        {/* Required documents checklist */}
        <Card>
          <Text style={styles.sectionHeading}>Required Documents</Text>
          {VEHICLE_REQUIRED_CATEGORIES.map((cat, i) => {
            const uploaded = docs.some((d) => d.category === cat);
            return (
              <React.Fragment key={cat}>
                {i > 0 ? <View style={styles.checklistDivider} /> : null}
                <TouchableOpacity
                  style={styles.checklistRow}
                  onPress={() => { if (!uploaded) openUploadFor(cat); }}
                  disabled={uploaded}
                >
                  <MaterialIcons
                    name={uploaded ? "check-circle" : "warning"}
                    size={18}
                    color={uploaded ? colors.success : colors.danger}
                  />
                  <Text style={styles.checklistLabel}>{cat}</Text>
                  {!uploaded ? <Text style={styles.checklistAction}>Upload</Text> : null}
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </Card>
      </ScrollView>
      </KeyboardAvoidingView>
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
  iconBtn: { width: 36, height: 36, borderRadius: radii.full, justifyContent: "center", alignItems: "center", backgroundColor: colors.surfaceContainerLow },
  headerBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.full, backgroundColor: colors.surfaceContainerLow },
  headerBtnPrimary: { backgroundColor: colors.primary },
  headerBtnText: { ...type.labelMd, color: colors.onSurfaceVariant },
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
  pickRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  pickBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1.5, borderColor: colors.outlineVariant, borderStyle: "dashed", borderRadius: radii.md, padding: 12, marginBottom: 14 },
  pickBtnText: { ...type.bodyMd, color: colors.onSurfaceVariant, flexShrink: 1 },
  pickedFileText: { fontSize: 12, color: colors.primary, marginBottom: 14, marginTop: -6 },
  checklistRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  checklistDivider: { height: 1, backgroundColor: colors.outlineVariant },
  checklistLabel: { ...type.bodyMd, color: colors.onSurface, flex: 1 },
  checklistAction: { ...type.labelMd, color: colors.primary },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: 12, alignItems: "center", marginTop: 4 },
  saveBtnText: { color: "white", fontWeight: "700" },
  docRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  docName: { ...type.bodyLg, fontWeight: "600", color: colors.onSurface },
  docMeta: { fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
});
