import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import ScreenHeader from "../components/ScreenHeader";
import Card from "../components/Card";
import { colors, spacing, type, radii } from "../theme";
import { vehicleService } from "../lib/services/vehicleService";
import { useFirm } from "../context/FirmContext";

const PRICE_PER_TRUCK = 79;
const TRIAL_DAYS = 60;

export default function BillingScreen() {
  const { firmVersion } = useFirm();
  const [truckCount, setTruckCount] = useState(0);

  useEffect(() => {
    vehicleService.getAll().then((res) => {
      if (res.success) setTruckCount(res.data?.length ?? 0);
    });
  }, [firmVersion]);

  // Compute trial end date — we hardcode the trial as starting from account creation.
  // In practice, this would come from a billing record in Supabase.
  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + TRIAL_DAYS);
  const monthlyTotal = truckCount * PRICE_PER_TRUCK;

  function handleContactSupport() {
    Linking.openURL("mailto:support@fleetsure.co.in?subject=Billing%20Query");
  }

  function handleUpgrade() {
    Alert.alert("Upgrade", "Our team will contact you to set up billing. Would you like to email us?", [
      { text: "Cancel", style: "cancel" },
      { text: "Email Us", onPress: handleContactSupport },
    ]);
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title="Billing & Subscription" />
      <ScrollView contentContainerStyle={{ padding: spacing.containerMargin, gap: spacing.stackGap, paddingBottom: 40 }}>

        {/* Trial Banner */}
        <Card style={styles.trialCard}>
          <View style={styles.trialHeader}>
            <MaterialIcons name="card-giftcard" size={28} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.trialTitle}>Free Trial Active</Text>
              <Text style={styles.trialSub}>You are on a {TRIAL_DAYS}-day free trial</Text>
            </View>
          </View>
          <View style={styles.trialMeta}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Trial Ends</Text>
              <Text style={styles.metaValue}>
                {trialEndDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Days Left</Text>
              <Text style={[styles.metaValue, { color: colors.success }]}>{TRIAL_DAYS}</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Status</Text>
              <Text style={[styles.metaValue, { color: colors.success }]}>Active ✓</Text>
            </View>
          </View>
        </Card>

        {/* Pricing */}
        <Text style={styles.sectionLabel}>Your Plan</Text>
        <Card>
          <View style={styles.planRow}>
            <View style={styles.planIcon}>
              <MaterialIcons name="local-shipping" size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.planName}>FleetSure Standard</Text>
              <Text style={styles.planDesc}>Per-truck pricing — pay only for what you use</Text>
            </View>
          </View>

          <View style={styles.priceBreakdown}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Price per truck / month</Text>
              <Text style={styles.priceValue}>₹{PRICE_PER_TRUCK}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Your fleet size</Text>
              <Text style={styles.priceValue}>{truckCount} truck{truckCount !== 1 ? "s" : ""}</Text>
            </View>
            <View style={[styles.priceRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Estimated monthly total</Text>
              <Text style={styles.totalValue}>₹{monthlyTotal.toLocaleString("en-IN")}</Text>
            </View>
          </View>
        </Card>

        {/* Included */}
        <Text style={styles.sectionLabel}>What's Included</Text>
        <Card>
          {[
            "Unlimited trips and expense tracking",
            "Real-time P&L per vehicle",
            "Driver management & portal",
            "Document storage (insurance, RC, etc.)",
            "Compliance date tracking & alerts",
            "WhatsApp daily reports",
            "Multi-firm support",
          ].map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <MaterialIcons name="check-circle" size={16} color={colors.success} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </Card>

        {/* CTA */}
        <TouchableOpacity style={styles.upgradeBtn} onPress={handleUpgrade}>
          <MaterialIcons name="star" size={18} color="white" />
          <Text style={styles.upgradeBtnText}>Activate Paid Plan</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.supportBtn} onPress={handleContactSupport}>
          <Text style={styles.supportBtnText}>Questions? Contact support@fleetsure.co.in</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: colors.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, marginLeft: 4 },
  trialCard: { backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer },
  trialHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  trialTitle: { fontSize: 17, fontWeight: "700", color: "white" },
  trialSub: { fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 2 },
  trialMeta: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: radii.md, padding: 12 },
  metaItem: { flex: 1, alignItems: "center" },
  metaDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)", marginVertical: 2 },
  metaLabel: { fontSize: 10, color: "rgba(255,255,255,0.65)", fontWeight: "600", textTransform: "uppercase", marginBottom: 4 },
  metaValue: { fontSize: 14, fontWeight: "700", color: "white" },
  planRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  planIcon: { width: 48, height: 48, borderRadius: radii.lg, backgroundColor: colors.surfaceContainer, justifyContent: "center", alignItems: "center" },
  planName: { ...type.bodyLg, fontWeight: "700", color: colors.onSurface },
  planDesc: { fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
  priceBreakdown: { borderTopWidth: 1, borderTopColor: colors.outlineVariant, paddingTop: 12, gap: 10 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  priceLabel: { ...type.bodyMd, color: colors.onSurfaceVariant },
  priceValue: { ...type.bodyMd, color: colors.onSurface, fontWeight: "600" },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.outlineVariant, paddingTop: 10, marginTop: 2 },
  totalLabel: { ...type.bodyLg, fontWeight: "700", color: colors.onSurface },
  totalValue: { fontSize: 20, fontWeight: "800", color: colors.primary },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  featureText: { ...type.bodyMd, color: colors.onSurface },
  upgradeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: 14 },
  upgradeBtnText: { color: "white", fontSize: 15, fontWeight: "700" },
  supportBtn: { alignItems: "center", paddingVertical: 8 },
  supportBtnText: { fontSize: 13, color: colors.onSurfaceVariant, textDecorationLine: "underline" },
});
