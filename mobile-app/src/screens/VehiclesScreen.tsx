import { useCallback, useMemo, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { vehicleService } from "../lib/services/vehicleService";
import { useFirm } from "../context/FirmContext";
import { useColors } from "../context/ThemeContext";
import Card from "../components/Card";
import { radii, spacing, type } from "../theme";
import type { Vehicle } from "../lib/types";

function getStatusStyle(colors: ReturnType<typeof useColors>): Record<string, { label: string; bg: string; fg: string; icon: keyof typeof MaterialIcons.glyphMap }> {
  return {
    active: { label: "Available", bg: colors.successBg, fg: colors.success, icon: "check-circle" },
    in_trip: { label: "On Trip", bg: colors.secondaryContainer, fg: colors.onSecondaryContainer, icon: "local-shipping" },
    maintenance: { label: "In Maintenance", bg: colors.errorContainer, fg: colors.onErrorContainer, icon: "build" },
    inactive: { label: "Inactive", bg: colors.surfaceContainerHighest, fg: colors.onSurfaceVariant, icon: "block" },
  };
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

function isDue(dateStr: string | null): boolean {
  const d = daysUntil(dateStr);
  return d !== null && d <= 30;
}

function complianceTone(colors: ReturnType<typeof useColors>, days: number | null): { bg: string; fg: string; label: string } {
  if (days === null) return { bg: colors.surfaceContainerHighest, fg: colors.onSurfaceVariant, label: "—" };
  if (days < 0) return { bg: colors.dangerBg, fg: colors.danger, label: "Expired" };
  if (days <= 30) return { bg: colors.amberBg, fg: colors.amber, label: `${days}d left` };
  return { bg: colors.successBg, fg: colors.success, label: `${days}d left` };
}

type VehicleFilter =
  | "all" | "active" | "in_trip" | "maintenance"
  | "insurance_due" | "fitness_due" | "puc_due" | "permit_due" | "rc_expiry";

export default function VehiclesScreen() {
  const navigation = useNavigation<any>();
  const { firmVersion } = useFirm();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const statusStyle = useMemo(() => getStatusStyle(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filter, setFilter] = useState<VehicleFilter>("all");

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

  const stats = useMemo(() => ({
    total: vehicles.length,
    available: vehicles.filter(v => v.status === "active").length,
    onTrip: vehicles.filter(v => v.status === "in_trip").length,
    maintenance: vehicles.filter(v => v.status === "maintenance").length,
    insuranceDue: vehicles.filter(v => isDue(v.insurance_expiry)).length,
    fitnessDue: vehicles.filter(v => isDue(v.fitness_expiry)).length,
    pucDue: vehicles.filter(v => isDue(v.puc_expiry)).length,
    permitDue: vehicles.filter(v => isDue(v.permit_expiry)).length,
    rcDue: 0,
  }), [vehicles]);

  const filtered = useMemo(() => {
    if (filter === "all") return vehicles;
    if (filter === "insurance_due") return vehicles.filter(v => isDue(v.insurance_expiry));
    if (filter === "fitness_due") return vehicles.filter(v => isDue(v.fitness_expiry));
    if (filter === "puc_due") return vehicles.filter(v => isDue(v.puc_expiry));
    if (filter === "permit_due") return vehicles.filter(v => isDue(v.permit_expiry));
    if (filter === "rc_expiry") return vehicles.filter(v => isDue((v as any).rc_expiry ?? null));
    return vehicles.filter((v) => v.status === filter);
  }, [vehicles, filter]);

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
        data={filtered}
        keyExtractor={(v) => v.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View style={styles.statBento}>
            <View style={styles.statRowTop}>
              <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.8} onPress={() => setFilter("all")}>
                <Card style={[filter === "all" && styles.statCardActive]}>
                  <Text style={styles.bentoLabel}>Total Fleet</Text>
                  <Text style={styles.bentoValueLg}>{stats.total}</Text>
                </Card>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.8} onPress={() => setFilter("active")}>
                <Card style={[{ backgroundColor: colors.secondaryContainer }, filter === "active" && styles.statCardActive]}>
                  <Text style={[styles.bentoLabel, { color: colors.onSecondaryContainer }]}>Available</Text>
                  <Text style={styles.bentoValueLg}>{stats.available}</Text>
                </Card>
              </TouchableOpacity>
            </View>
            <View style={styles.statRowBottom}>
              <MiniStat styles={styles} icon="local-shipping" value={stats.onTrip} label="On Trip" color={colors.primary} active={filter === "in_trip"} onPress={() => setFilter("in_trip")} />
              <MiniStat styles={styles} icon="build" value={stats.maintenance} label="Maintenance" color={colors.amber} bg={colors.amberBg} active={filter === "maintenance"} onPress={() => setFilter("maintenance")} />
            </View>

            <Text style={styles.complianceSectionLabel}>Compliance Alerts</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.complianceTabRow}>
              <ComplianceTab styles={styles} colors={colors} label="Insurance Due" icon="policy" count={stats.insuranceDue} active={filter === "insurance_due"} onPress={() => setFilter("insurance_due")} />
              <ComplianceTab styles={styles} colors={colors} label="Fitness Due" icon="medical-services" count={stats.fitnessDue} active={filter === "fitness_due"} onPress={() => setFilter("fitness_due")} />
              <ComplianceTab styles={styles} colors={colors} label="PUC Due" icon="air" count={stats.pucDue} active={filter === "puc_due"} onPress={() => setFilter("puc_due")} />
              <ComplianceTab styles={styles} colors={colors} label="Permit Due" icon="assignment" count={stats.permitDue} active={filter === "permit_due"} onPress={() => setFilter("permit_due")} />
              <ComplianceTab styles={styles} colors={colors} label="RC Expiry" icon="description" count={stats.rcDue} active={filter === "rc_expiry"} onPress={() => setFilter("rc_expiry")} />
            </ScrollView>

            <Text style={styles.listHeading}>Your Fleet</Text>
          </View>
        }
        ListEmptyComponent={<Card><Text style={{ color: colors.onSurfaceVariant }}>No vehicles match this filter.</Text></Card>}
        renderItem={({ item }) => {
          const st = statusStyle[item.status] ?? statusStyle.inactive;
          const insDays = daysUntil(item.insurance_expiry);
          const insurance = complianceTone(colors, insDays);
          const fitness = complianceTone(colors, daysUntil(item.fitness_expiry));
          const puc = complianceTone(colors, daysUntil(item.puc_expiry));
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
                <View style={styles.complianceRow}>
                  <ComplianceChip styles={styles} label="Insurance" tone={insurance} />
                  <ComplianceChip styles={styles} label="Fitness" tone={fitness} />
                  <ComplianceChip styles={styles} label="PUC" tone={puc} />
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

function MiniStat({
  icon, value, label, color, bg, active, onPress, styles,
}: { icon: keyof typeof MaterialIcons.glyphMap; value: number; label: string; color: string; bg?: string; active?: boolean; onPress?: () => void; styles: ReturnType<typeof makeStyles> }) {
  return (
    <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.8} onPress={onPress}>
      <Card style={[{ alignItems: "center", paddingVertical: 12 }, bg ? { backgroundColor: bg } : null, active && styles.statCardActive]}>
        <MaterialIcons name={icon} size={20} color={color} style={{ marginBottom: 4 }} />
        <Text style={[styles.miniStatValue, { color }]}>{value}</Text>
        <Text style={styles.miniStatLabel}>{label}</Text>
      </Card>
    </TouchableOpacity>
  );
}

function ComplianceTab({
  label, icon, count, active, onPress, colors, styles,
}: {
  label: string; icon: keyof typeof MaterialIcons.glyphMap; count: number; active: boolean; onPress: () => void;
  colors: ReturnType<typeof useColors>; styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.compTab, active && styles.compTabActive]}>
      <MaterialIcons name={icon} size={16} color={active ? colors.onPrimaryContainer : colors.onSurfaceVariant} />
      <Text style={[styles.compTabLabel, active && styles.compTabLabelActive]}>{label}</Text>
      {count > 0 && (
        <View style={[styles.compTabBadge, active && styles.compTabBadgeActive]}>
          <Text style={[styles.compTabBadgeText, active && { color: colors.onPrimaryContainer }]}>{count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function ComplianceChip({ label, tone, styles }: { label: string; tone: { bg: string; fg: string; label: string }; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={[styles.complianceChip, { backgroundColor: tone.bg }]}>
      <Text style={[styles.complianceChipText, { color: tone.fg }]}>{label} · {tone.label}</Text>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
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
  cardFooter: { padding: spacing.cardPadding, borderTopWidth: 1, borderTopColor: colors.surfaceContainer, gap: 10 },
  complianceRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  complianceChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.full },
  complianceChipText: { fontSize: 11, fontWeight: "700" },
  detailsLink: { ...type.labelMd, color: colors.primary, fontWeight: "700", textAlign: "right" },
  statCardActive: { borderWidth: 2, borderColor: colors.primary },
  complianceSectionLabel: { fontSize: 11, fontWeight: "700", color: colors.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, marginTop: 4 },
  complianceTabRow: { gap: 8, paddingBottom: 4 },
  compTab: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surfaceContainer, borderWidth: 1, borderColor: colors.surfaceContainerHighest },
  compTabActive: { backgroundColor: colors.primaryContainer, borderColor: colors.primary },
  compTabLabel: { fontSize: 12, fontWeight: "600", color: colors.onSurfaceVariant },
  compTabLabelActive: { color: colors.onPrimaryContainer },
  compTabBadge: { backgroundColor: colors.dangerBg, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  compTabBadgeActive: { backgroundColor: colors.primary },
  compTabBadgeText: { fontSize: 10, fontWeight: "700", color: colors.danger },
  });
}
