import { useCallback, useMemo, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { driverService } from "../lib/services/driverService";
import { tripService } from "../lib/services/tripService";
import { vehicleService } from "../lib/services/vehicleService";
import { useFirm } from "../context/FirmContext";
import { useColors } from "../context/ThemeContext";
import Card from "../components/Card";
import { radii, spacing, type } from "../theme";
import type { Driver } from "../lib/types";

function getStatusStyle(colors: ReturnType<typeof useColors>): Record<string, { label: string; bg: string; fg: string }> {
  return {
    available: { label: "Available", bg: colors.successBg, fg: colors.success },
    on_trip: { label: "On Trip", bg: colors.secondaryContainer, fg: colors.onSecondaryContainer },
    inactive: { label: "On Leave", bg: colors.surfaceContainerHighest, fg: colors.onSurfaceVariant },
  };
}

export default function DriversScreen() {
  const navigation = useNavigation<any>();
  const { firmVersion } = useFirm();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const statusStyle = useMemo(() => getStatusStyle(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicleByDriver, setVehicleByDriver] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const [driverRes, tripRes, vehRes] = await Promise.all([
      driverService.getAll(),
      tripService.getAll(),
      vehicleService.getAll(),
    ]);
    if (driverRes.success) setDrivers(driverRes.data ?? []);
    if (tripRes.success && vehRes.success) {
      const vehMap: Record<string, string> = {};
      for (const v of vehRes.data ?? []) vehMap[v.id] = v.registration_number;
      const map: Record<string, string> = {};
      for (const t of tripRes.data ?? []) {
        if (t.status === "in_progress" && t.driver_id) map[t.driver_id] = vehMap[t.vehicle_id] ?? "—";
      }
      setVehicleByDriver(map);
    }
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
    total: drivers.length,
    available: drivers.filter(d => d.status === "available").length,
    onTrip: drivers.filter(d => d.status === "on_trip").length,
    onLeave: drivers.filter(d => d.status === "inactive").length,
  }), [drivers]);

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
        <View>
          <Text style={styles.title}>Drivers</Text>
          <Text style={styles.subtitle}>Manage your fleet drivers.</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate("AddDriver")}>
          <MaterialIcons name="add" size={16} color="white" />
          <Text style={styles.addBtnText}>Add Driver</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={drivers}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View style={styles.statGrid}>
            <StatCell styles={styles} label="Total Drivers" value={stats.total} color={colors.primary} />
            <StatCell styles={styles} label="Available" value={stats.available} color={colors.success} />
            <StatCell styles={styles} label="On Trip" value={stats.onTrip} color={colors.primaryContainer} />
            <StatCell styles={styles} label="On Leave" value={stats.onLeave} color={colors.onSurfaceVariant} />
          </View>
        }
        ListEmptyComponent={<Card><Text style={{ color: colors.onSurfaceVariant }}>No drivers yet.</Text></Card>}
        renderItem={({ item }) => {
          const st = statusStyle[item.status] ?? statusStyle.inactive;
          return (
            <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate("DriverDetail", { driver: item })}>
            <Card>
              <View style={styles.cardTop}>
                <View style={styles.cardTopLeft}>
                  <View style={styles.avatar}>
                    <MaterialIcons name="person" size={22} color={colors.onSurfaceVariant} />
                  </View>
                  <View>
                    <Text style={styles.driverName}>{item.name}</Text>
                    <Text style={styles.driverPhone}>{item.phone}</Text>
                  </View>
                </View>
                <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                  <Text style={[styles.statusPillText, { color: st.fg }]}>{st.label}</Text>
                </View>
              </View>
              <View style={styles.cardBottom}>
                <View style={styles.vehicleRow}>
                  <MaterialIcons name="local-shipping" size={16} color={colors.secondary} />
                  <Text style={styles.vehicleText}>{vehicleByDriver[item.id] ?? "—"}</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate("DriverDetail", { driver: item })}>
                  <Text style={styles.detailsLink}>View Details</Text>
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

function StatCell({ label, value, color, styles }: { label: string; value: number; color: string; styles: ReturnType<typeof makeStyles> }) {
  return (
    <Card style={{ flexBasis: "48%" }}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </Card>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: spacing.containerMargin, paddingTop: 8, paddingBottom: 4 },
  title: { ...type.headlineLgMobile, color: colors.onBackground },
  subtitle: { ...type.bodyMd, color: colors.secondary, marginTop: 2 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.primaryContainer, borderRadius: radii.full, paddingHorizontal: 14, paddingVertical: 10 },
  addBtnText: { ...type.labelMd, color: "white" },
  list: { padding: spacing.containerMargin, gap: spacing.stackGap, paddingBottom: 32 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.stackGap, marginBottom: spacing.sectionGap },
  statLabel: { ...type.labelMd, color: colors.secondary, marginBottom: 4 },
  statValue: { ...type.currencyDisplay },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardTopLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: radii.full, backgroundColor: colors.surfaceContainerHigh, justifyContent: "center", alignItems: "center" },
  driverName: { ...type.headlineSm, color: colors.onBackground },
  driverPhone: { ...type.bodyMd, color: colors.secondary, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.full },
  statusPillText: { ...type.labelMd },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: colors.surfaceContainerHigh, paddingTop: 12, marginTop: 12 },
  vehicleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  vehicleText: { ...type.bodyMd, color: colors.secondary },
  detailsLink: { ...type.labelMd, color: colors.primary },
  });
}
