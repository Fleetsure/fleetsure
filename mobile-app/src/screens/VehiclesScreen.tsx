import React, { useCallback, useMemo, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { vehicleService } from "../lib/services/vehicleService";
import { useFirm } from "../context/FirmContext";
import Card from "../components/Card";
import { colors, radii, spacing, type } from "../theme";
import type { Vehicle } from "../lib/types";

const STATUS_STYLE: Record<string, { label: string; bg: string; fg: string; icon: keyof typeof MaterialIcons.glyphMap }> = {
  active: { label: "Available", bg: colors.successBg, fg: colors.success, icon: "check-circle" },
  in_trip: { label: "On Trip", bg: colors.secondaryContainer, fg: colors.onSecondaryContainer, icon: "local-shipping" },
  maintenance: { label: "In Maintenance", bg: colors.errorContainer, fg: colors.onErrorContainer, icon: "build" },
  inactive: { label: "Inactive", bg: colors.surfaceContainerHighest, fg: colors.onSurfaceVariant, icon: "block" },
};

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

export default function VehiclesScreen() {
  const navigation = useNavigation<any>();
  const { firmVersion } = useFirm();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const load = useCallback(async () => {
    const res = await vehicleService.getAll();
    if (res.success) setVehicles(res.data ?? []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load, firmVersion])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const stats = useMemo(() => {
    const insuranceDue = vehicles.filter(v => {
      const d = daysUntil(v.insurance_expiry);
      return d !== null && d <= 30;
    }).length;
    return {
      total: vehicles.length,
      available: vehicles.filter(v => v.status === "active").length,
      onTrip: vehicles.filter(v => v.status === "in_trip").length,
      maintenance: vehicles.filter(v => v.status === "maintenance").length,
      insuranceDue,
    };
  }, [vehicles]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Fleet</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate("AddVehicle")}>
          <MaterialIcons name="add" size={16} color={colors.onPrimaryContainer} />
          <Text style={styles.addBtnText}>Add Vehicle</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={vehicles}
        keyExtractor={(v) => v.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View style={styles.statBento}>
            <View style={styles.statRowTop}>
              <Card style={{ flex: 1 }}>
                <Text style={styles.bentoLabel}>Total Fleet</Text>
                <Text style={styles.bentoValueLg}>{stats.total}</Text>
              </Card>
              <Card style={{ flex: 1, backgroundColor: colors.secondaryContainer }}>
                <Text style={[styles.bentoLabel, { color: colors.onSecondaryContainer }]}>Available</Text>
                <Text style={styles.bentoValueLg}>{stats.available}</Text>
              </Card>
            </View>
            <View style={styles.statRowBottom}>
              <MiniStat icon="local-shipping" value={stats.onTrip} label="On Trip" color={colors.primary} />
              <MiniStat icon="build" value={stats.maintenance} label="Maintenance" color={colors.amber} bg={colors.amberBg} />
              <MiniStat icon="policy" value={stats.insuranceDue} label="Ins. Due" color={colors.danger} bg={colors.dangerBg} />
            </View>
            <Text style={styles.listHeading}>Your Fleet</Text>
          </View>
        }
        ListEmptyComponent={<Card><Text style={{ color: colors.onSurfaceVariant }}>No vehicles yet.</Text></Card>}
        renderItem={({ item }) => {
          const st = STATUS_STYLE[item.status] ?? STATUS_STYLE.inactive;
          const insDays = daysUntil(item.insurance_expiry);
          return (
            <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate("VehicleDetail", { vehicle: item })}>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <View style={styles.cardHead}>
                <View>
                  <Text style={styles.regNumber}>{item.registration_number}</Text>
                  <Text style={styles.makeModel}>{item.make} {item.model}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                  <MaterialIcons name={st.icon} size={12} color={st.fg} />
                  <Text style={[styles.statusPillText, { color: st.fg }]}>{st.label}</Text>
                </View>
              </View>
              <View style={styles.cardBody}>
                <View style={styles.bodyCol}>
                  <Text style={styles.bodyLabel}>Fuel Type</Text>
                  <Text style={styles.bodyValue}>{item.fuel_type ?? "—"}</Text>
                </View>
                <View style={styles.bodyCol}>
                  <Text style={styles.bodyLabel}>Insurance</Text>
                  <Text style={[styles.bodyValue, insDays !== null && insDays <= 30 ? { color: colors.error } : null]}>
                    {insDays === null ? "—" : insDays < 0 ? "Expired" : `${insDays}d left`}
                  </Text>
                </View>
              </View>
              <View style={styles.cardFooter}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <IconBtn icon="description" onPress={() => navigation.navigate("VehicleDetail", { vehicle: item })} />
                  <IconBtn icon="build" onPress={() => Alert.alert("Coming soon", "Maintenance log isn't available in the app yet.")} />
                </View>
                <TouchableOpacity onPress={() => navigation.navigate("VehicleDetail", { vehicle: item })}>
                  <Text style={styles.detailsLink}>Details</Text>
                </TouchableOpacity>
              </View>
            </Card>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

function MiniStat({ icon, value, label, color, bg }: { icon: keyof typeof MaterialIcons.glyphMap; value: number; label: string; color: string; bg?: string }) {
  return (
    <Card style={[{ flex: 1, alignItems: "center", paddingVertical: 12 }, bg ? { backgroundColor: bg } : null]}>
      <MaterialIcons name={icon} size={20} color={color} style={{ marginBottom: 4 }} />
      <Text style={[styles.miniStatValue, { color }]}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </Card>
  );
}

function IconBtn({ icon, onPress }: { icon: keyof typeof MaterialIcons.glyphMap; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.iconBtn} onPress={onPress}>
      <MaterialIcons name={icon} size={20} color={colors.onSurfaceVariant} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.containerMargin, paddingTop: 8, paddingBottom: 4 },
  title: { ...type.headlineLgMobile, color: colors.primary },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.primaryContainer, borderRadius: radii.full, paddingHorizontal: 12, paddingVertical: 8 },
  addBtnText: { ...type.labelMd, color: colors.onPrimaryContainer },
  list: { padding: spacing.containerMargin, gap: spacing.stackGap, paddingBottom: 32 },
  statBento: { gap: spacing.stackGap, marginBottom: spacing.sectionGap },
  statRowTop: { flexDirection: "row", gap: 8 },
  statRowBottom: { flexDirection: "row", gap: 8 },
  bentoLabel: { ...type.labelMd, color: colors.onSurfaceVariant, textTransform: "uppercase", marginBottom: 4 },
  bentoValueLg: { ...type.headlineLgMobile, color: colors.primary },
  miniStatValue: { ...type.headlineSm },
  miniStatLabel: { fontSize: 10, fontWeight: "600", color: colors.onSurfaceVariant, textTransform: "uppercase", marginTop: 2 },
  listHeading: { ...type.headlineMd, color: colors.onSurface, marginTop: 4 },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: spacing.cardPadding, borderBottomWidth: 1, borderBottomColor: colors.surfaceContainer },
  regNumber: { ...type.headlineSm, color: colors.onSurface },
  makeModel: { ...type.bodyMd, color: colors.onSurfaceVariant, marginTop: 2 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.full },
  statusPillText: { fontSize: 11, fontWeight: "700" },
  cardBody: { flexDirection: "row", gap: 24, padding: spacing.cardPadding, backgroundColor: colors.surfaceBright },
  bodyCol: {},
  bodyLabel: { fontSize: 10, color: colors.onSurfaceVariant, textTransform: "uppercase", fontWeight: "600", marginBottom: 2 },
  bodyValue: { ...type.bodyMd, color: colors.onSurface },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.cardPadding, borderTopWidth: 1, borderTopColor: colors.surfaceContainer },
  iconBtn: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.surfaceContainer, justifyContent: "center", alignItems: "center" },
  detailsLink: { ...type.labelMd, color: colors.primary, fontWeight: "700" },
});
