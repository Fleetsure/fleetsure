import React, { useState } from "react";
import { View, Text, Switch, TouchableOpacity, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import ScreenHeader from "../components/ScreenHeader";
import Card from "../components/Card";
import { colors, spacing, type, radii } from "../theme";

export default function GeneralSettingsScreen() {
  const [tripReminders, setTripReminders] = useState(true);
  const [complianceAlerts, setComplianceAlerts] = useState(true);
  const [fuelAlerts, setFuelAlerts] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [whatsappNotifs, setWhatsappNotifs] = useState(false);

  function handleSave() {
    Alert.alert("Saved", "General settings updated.");
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScreenHeader title="General Settings" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.stackGap, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

        <Text style={styles.sectionLabel}>Notifications</Text>
        <Card style={styles.menuCard}>
          <ToggleRow
            icon="notifications-active"
            label="Trip Reminders"
            description="Get notified when a trip is due"
            value={tripReminders}
            onChange={setTripReminders}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon="policy"
            label="Compliance Alerts"
            description="Insurance, fitness & PUC expiry reminders"
            value={complianceAlerts}
            onChange={setComplianceAlerts}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon="local-gas-station"
            label="Fuel Threshold Alerts"
            description="Alert when mileage drops below average"
            value={fuelAlerts}
            onChange={setFuelAlerts}
          />
        </Card>

        <Text style={styles.sectionLabel}>Reports</Text>
        <Card style={styles.menuCard}>
          <ToggleRow
            icon="bar-chart"
            label="Weekly Summary Report"
            description="Auto-send P&L summary every Monday"
            value={weeklyReport}
            onChange={setWeeklyReport}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon="chat"
            label="WhatsApp Notifications"
            description="Receive reports via WhatsApp"
            value={whatsappNotifs}
            onChange={setWhatsappNotifs}
          />
        </Card>

        <Text style={styles.sectionLabel}>Data</Text>
        <Card>
          <InfoRow icon="language" label="Currency" value="INR (₹)" />
          <View style={styles.divider} />
          <InfoRow icon="place" label="Country" value="India 🇮🇳" />
          <View style={styles.divider} />
          <InfoRow icon="receipt" label="Tax Scheme" value="GST" />
        </Card>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Save Settings</Text>
        </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ToggleRow({ icon, label, description, value, onChange }: {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <MaterialIcons name={icon} size={20} color={colors.primary} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDesc}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.outlineVariant, true: colors.primaryContainer }}
        thumbColor={value ? colors.primary : colors.onSurfaceVariant}
      />
    </View>
  );
}

function InfoRow({ icon, label, value }: {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <MaterialIcons name={icon} size={18} color={colors.onSurfaceVariant} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: colors.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, marginLeft: 4 },
  menuCard: { padding: 0 },
  divider: { height: 1, backgroundColor: colors.outlineVariant, marginHorizontal: spacing.cardPadding },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: spacing.cardPadding },
  rowLabel: { ...type.bodyMd, color: colors.onSurface, fontWeight: "600" },
  rowDesc: { fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  infoLabel: { ...type.bodyMd, color: colors.onSurfaceVariant, flex: 1 },
  infoValue: { ...type.bodyMd, color: colors.onSurface, fontWeight: "600" },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "white", fontSize: 15, fontWeight: "700" },
});
