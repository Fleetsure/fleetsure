import React, { useState } from "react";
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useFirm } from "../context/FirmContext";
import { firmService } from "../lib/services/firmService";
import { pickImageFromGallery } from "../lib/pickImage";
import ScreenHeader from "../components/ScreenHeader";
import Card from "../components/Card";
import FormField from "../components/FormField";
import { colors, radii, spacing, type } from "../theme";
import type { Firm } from "../lib/types";

export default function MyFirmsScreen() {
  const { firms, activeFirmId, setActiveFirmId, loading, refreshFirms } = useFirm();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [address, setAddress] = useState("");
  const [pickedLogo, setPickedLogo] = useState<{ uri: string; name: string; mimeType: string | null } | null>(null);
  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null);

  function resetForm() {
    setEditingId(null);
    setName(""); setGstin(""); setPan(""); setAddress("");
    setPickedLogo(null); setExistingLogoUrl(null);
  }

  function openAdd() {
    resetForm();
    setShowForm(true);
  }

  function openEdit(firm: Firm) {
    setEditingId(firm.id);
    setName(firm.name);
    setGstin(firm.gstin ?? "");
    setPan(firm.pan ?? "");
    setAddress(firm.address ?? "");
    setPickedLogo(null);
    setExistingLogoUrl((firm as any).logo_url ?? null);
    setShowForm(true);
  }

  async function handlePickLogo() {
    const asset = await pickImageFromGallery();
    if (asset) setPickedLogo(asset);
  }

  function toggleForm() {
    if (showForm) { resetForm(); setShowForm(false); } else { openAdd(); }
  }

  async function handleSave() {
    if (!name.trim()) return Alert.alert("Name required", "Enter a firm name.");
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        gstin: gstin || null,
        pan: pan || null,
        address: address || null,
      };
      const firmId = editingId
        ? (await firmService.update(editingId, payload)).success ? editingId : null
        : (await firmService.create(payload as any)).data?.id ?? null;

      if (!firmId) throw new Error("Couldn't save firm details.");

      if (pickedLogo) {
        const uploadRes = await firmService.uploadLogo(firmId, pickedLogo);
        if (uploadRes.success && uploadRes.data) {
          await firmService.update(firmId, { logo_url: uploadRes.data } as any);
        } else {
          Alert.alert("Firm saved, logo failed", uploadRes.error ?? "Couldn't upload the logo.");
        }
      }

      await refreshFirms();
      resetForm();
      setShowForm(false);
    } catch (e: any) {
      Alert.alert("Couldn't save firm", e?.message ?? "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title="My Firms" />
      <ScrollView contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.stackGap, paddingBottom: 40 }}>
        <TouchableOpacity style={styles.addBtn} onPress={toggleForm}>
          <MaterialIcons name={showForm ? "close" : "add"} size={16} color={colors.onPrimaryContainer} />
          <Text style={styles.addBtnText}>{showForm ? "Cancel" : "Add Firm"}</Text>
        </TouchableOpacity>

        {showForm ? (
          <Card>
            <TouchableOpacity style={styles.logoPickBtn} onPress={handlePickLogo}>
              {pickedLogo ? (
                <Image source={{ uri: pickedLogo.uri }} style={styles.logoPreview} />
              ) : existingLogoUrl ? (
                <Image source={{ uri: existingLogoUrl }} style={styles.logoPreview} />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <MaterialIcons name="business" size={22} color={colors.onSurfaceVariant} />
                </View>
              )}
              <Text style={styles.logoPickText}>{pickedLogo || existingLogoUrl ? "Change Logo" : "Pick Logo (optional)"}</Text>
            </TouchableOpacity>

            <FormField label="Firm Name" required value={name} onChangeText={setName} placeholder="e.g. Sharma Transports" />
            <FormField label="GST Number" value={gstin} onChangeText={setGstin} placeholder="Optional" autoCapitalize="characters" />
            <FormField label="PAN Number" value={pan} onChangeText={setPan} placeholder="Optional" autoCapitalize="characters" />
            <FormField label="Address" value={address} onChangeText={setAddress} placeholder="Optional" />

            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>{editingId ? "Save Changes" : "Create Firm"}</Text>}
            </TouchableOpacity>
          </Card>
        ) : null}

        {!loading && firms.length === 0 ? (
          <Card>
            <Text style={{ color: colors.onSurfaceVariant }}>No firms yet. Add one above to get started.</Text>
          </Card>
        ) : (
          <View style={{ gap: spacing.stackGap }}>
            {firms.map((firm) => (
              <Card key={firm.id}>
                <View style={styles.firmRow}>
                  {(firm as any).logo_url ? (
                    <Image source={{ uri: (firm as any).logo_url }} style={styles.firmLogo} />
                  ) : (
                    <View style={styles.iconBox}>
                      <MaterialIcons name="business" size={20} color={colors.primaryContainer} />
                    </View>
                  )}
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => setActiveFirmId(firm.id)}>
                    <Text style={styles.firmName}>{firm.name}</Text>
                    {firm.gstin ? <Text style={styles.firmMeta}>GSTIN: {firm.gstin}</Text> : null}
                    {firm.pan ? <Text style={styles.firmMeta}>PAN: {firm.pan}</Text> : null}
                  </TouchableOpacity>
                  {firm.id === activeFirmId ? (
                    <MaterialIcons name="check-circle" size={20} color={colors.primaryContainer} />
                  ) : (
                    <TouchableOpacity onPress={() => setActiveFirmId(firm.id)}>
                      <MaterialIcons name="radio-button-unchecked" size={20} color={colors.outline} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(firm)}>
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: colors.primaryContainer, borderRadius: radii.md, paddingVertical: 12 },
  addBtnText: { ...type.labelMd, color: colors.onPrimaryContainer },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: 12, alignItems: "center", marginTop: 4 },
  saveBtnText: { color: "white", fontWeight: "700" },
  logoPickBtn: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  logoPreview: { width: 56, height: 56, borderRadius: radii.md },
  logoPlaceholder: { width: 56, height: 56, borderRadius: radii.md, backgroundColor: colors.surfaceContainer, justifyContent: "center", alignItems: "center" },
  logoPickText: { ...type.labelMd, color: colors.primary },
  firmRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.surfaceContainer, justifyContent: "center", alignItems: "center" },
  firmLogo: { width: 40, height: 40, borderRadius: radii.md },
  firmName: { ...type.bodyMd, color: colors.onSurface, fontWeight: "600" },
  firmMeta: { fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
  editBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  editBtnText: { ...type.labelMd, color: colors.primary },
});
