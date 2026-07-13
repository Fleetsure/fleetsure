import React, { useCallback, useMemo, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { tripService } from "../lib/services/tripService";
import { vehicleService } from "../lib/services/vehicleService";
import { useFirm } from "../context/FirmContext";
import { useColors } from "../context/ThemeContext";
import Card from "../components/Card";
import { radii, spacing, type, formatCurrency } from "../theme";
import type { Trip } from "../lib/types";

type TripFilter = "all" | "planned" | "in_progress" | "completed" | "cancelled" | "pending_review";

const FILTERS: { key: TripFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "planned", label: "Planned" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "pending_review", label: "Pending" },
];

const STAT_BOXES = [
  { key: "total", label: "Total" },
  { key: "planned", label: "Planned" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
] as const;

const STATUS_OPTIONS: { key: string; label: string }[] = [
  { key: "planned", label: "Mark Planned" },
  { key: "in_progress", label: "Mark In Progress" },
  { key: "completed", label: "Mark Completed" },
  { key: "cancelled", label: "Mark Cancelled" },
  { key: "pending_review", label: "Pending Review" },
];

function getStatusStyle(colors: ReturnType<typeof useColors>): Record<string, { label: string; bg: string; fg: string; dot: string }> {
  return {
    in_progress: { label: "In Progress", bg: colors.secondaryContainer, fg: colors.onSecondaryContainer, dot: colors.primary },
    planned: { label: "Planned", bg: colors.surfaceContainerHighest, fg: colors.onSurfaceVariant, dot: colors.outline },
    completed: { label: "Completed", bg: colors.successBg, fg: colors.success, dot: colors.success },
    cancelled: { label: "Cancelled", bg: colors.errorContainer, fg: colors.onErrorContainer, dot: colors.error },
    pending_review: { label: "Pending", bg: colors.amberBg, fg: colors.amber, dot: colors.amber },
  };
}

export default function TripsScreen() {
  const navigation = useNavigation<any>();
  const { firmVersion } = useFirm();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const statusStyle = useMemo(() => getStatusStyle(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicleMap, setVehicleMap] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<TripFilter>("all");

  const load = useCallback(async () => {
    const [tripRes, vehRes] = await Promise.all([tripService.getAll(), vehicleService.getAll()]);
    if (tripRes.success) setTrips(tripRes.data ?? []);
    if (vehRes.success) {
      const map: Record<string, string> = {};
      for (const v of vehRes.data ?? []) map[v.id] = v.registration_number;
      setVehicleMap(map);
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

  async function updateStatus(id: string, newStatus: string) {
    setTrips((prev) => prev.map((t) => (t.id === id ? { ...t, status: newStatus as any } : t)));
    const res = await tripService.update(id, { status: newStatus as any });
    if (!res.success) load();
  }

  const stats = useMemo(() => ({
    total: trips.length,
    planned: trips.filter(t => t.status === "planned").length,
    in_progress: trips.filter(t => t.status === "in_progress").length,
    completed: trips.filter(t => t.status === "completed").length,
    cancelled: trips.filter(t => t.status === "cancelled").length,
    pending_review: trips.filter(t => t.status === "pending_review").length,
  }), [trips]);

  const filtered = useMemo(
    () => (filter === "all" ? trips : trips.filter(t => t.status === filter)),
    [trips, filter]
  );

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
        <Text style={styles.title}>Trips</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate("AddTrip")}>
          <MaterialIcons name="add" size={16} color={colors.onPrimaryContainer} />
          <Text style={styles.addBtnText}>Add Trip</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={STAT_BOXES}
        keyExtractor={(s) => s.key}
        style={styles.statRow}
        contentContainerStyle={{ gap: 8, paddingHorizontal: spacing.containerMargin }}
        renderItem={({ item }) => (
          <StatCell
            styles={styles}
            label={item.label}
            value={stats[item.key]}
            color={item.key === "in_progress" ? colors.primary : item.key === "completed" ? colors.secondary : undefined}
          />
        )}
      />

      <View style={styles.filterRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTERS}
          keyExtractor={(f) => f.key}
          contentContainerStyle={{ gap: 8, paddingHorizontal: spacing.containerMargin }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, filter === item.key && styles.filterChipActive]}
              onPress={() => setFilter(item.key)}
            >
              <Text style={[styles.filterChipText, filter === item.key && styles.filterChipTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Card><Text style={{ color: colors.onSurfaceVariant }}>No trips match this filter.</Text></Card>}
        renderItem={({ item }) => (
          <TripCard
            item={item}
            vehicleReg={vehicleMap[item.vehicle_id] ?? "—"}
            onPress={() => navigation.navigate("TripDetail", { id: item.id })}
            onChangeStatus={updateStatus}
            colors={colors}
            styles={styles}
            statusStyle={statusStyle}
          />
        )}
      />
    </SafeAreaView>
  );
}

function TripCard({
  item,
  vehicleReg,
  onPress,
  onChangeStatus,
  colors,
  styles,
  statusStyle,
}: {
  item: Trip;
  vehicleReg: string;
  onPress: () => void;
  onChangeStatus: (id: string, newStatus: string) => void;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof makeStyles>;
  statusStyle: Record<string, { label: string; bg: string; fg: string; dot: string }>;
}) {
  const st = statusStyle[item.status] ?? { label: item.status, bg: colors.surfaceContainerHighest, fg: colors.onSurfaceVariant, dot: colors.outline };

  function handleMenuPress() {
    Alert.alert(
      "Change Status",
      `Current: ${st.label}`,
      [
        ...STATUS_OPTIONS.map((opt) => ({
          text: opt.label,
          style: opt.key === "cancelled" ? ("destructive" as const) : undefined,
          onPress: () => onChangeStatus(item.id, opt.key),
        })),
        { text: "Cancel", style: "cancel" as const },
      ]
    );
  }

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <View style={styles.cardHead}>
          <View style={styles.cardHeadLeft}>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{new Date(item.start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</Text>
            </View>
            <View style={styles.routeRow}>
              <Text style={styles.routeText} numberOfLines={1} ellipsizeMode="tail">{item.origin}</Text>
              <MaterialIcons name="arrow-right-alt" size={18} color={colors.outline} />
              <Text style={styles.routeText} numberOfLines={1} ellipsizeMode="tail">{item.destination}</Text>
            </View>
          </View>
          <View style={[styles.cardHeadRight, { paddingRight: 26 }]}>
            <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: st.dot }]} />
              <Text style={[styles.statusPillText, { color: st.fg }]}>{st.label}</Text>
            </View>
            <Text style={styles.freightValue} numberOfLines={1} ellipsizeMode="tail">{formatCurrency(item.freight_amount)}</Text>
          </View>
          <TouchableOpacity style={styles.menuBtn} onPress={handleMenuPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialIcons name="more-vert" size={18} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.bodyCol}>
            <Text style={styles.bodyLabel}>Driver</Text>
            <Text style={styles.bodyValue} numberOfLines={1} ellipsizeMode="tail">{item.driver_name}</Text>
          </View>
          <View style={styles.bodyCol}>
            <Text style={styles.bodyLabel}>Vehicle</Text>
            <Text style={styles.bodyValue} numberOfLines={1} ellipsizeMode="tail">{vehicleReg}</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

function StatCell({ label, value, color, styles }: { label: string; value: number; color?: string; styles: ReturnType<typeof makeStyles> }) {
  return (
    <Card style={styles.statCell}>
      <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{label}</Text>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
    </Card>
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
  statRow: { flexGrow: 0, marginTop: 8 },
  statCell: { minWidth: 92, alignItems: "flex-start" },
  statLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", color: colors.onSurfaceVariant, marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: "700", color: colors.primary },
  filterRow: { marginTop: spacing.sectionGap - 8, marginBottom: 4 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radii.full, borderWidth: 1, borderColor: colors.outlineVariant, backgroundColor: colors.surfaceContainerLowest },
  filterChipActive: { backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer },
  filterChipText: { ...type.labelMd, color: colors.onSurfaceVariant },
  filterChipTextActive: { color: colors.onPrimaryContainer },
  list: { padding: spacing.containerMargin, gap: spacing.stackGap, paddingBottom: 32 },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: spacing.cardPadding, borderBottomWidth: 1, borderBottomColor: colors.surfaceContainer, position: "relative" },
  menuBtn: { position: "absolute", top: 4, right: 4, padding: 8, zIndex: 1 },
  cardHeadLeft: { flexShrink: 1, flexGrow: 1, paddingRight: 8 },
  cardHeadRight: { flexShrink: 0, alignItems: "flex-end", gap: 6 },
  metaRow: { flexDirection: "row", gap: 6, marginBottom: 4 },
  metaText: { ...type.labelMd, color: colors.onSurfaceVariant },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  routeText: { ...type.headlineSm, color: colors.onBackground, flexShrink: 1 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.full },
  statusDot: { width: 8, height: 8, borderRadius: radii.full },
  statusPillText: { ...type.labelMd },
  cardBody: { flexDirection: "row", flexWrap: "wrap", gap: 16, padding: spacing.cardPadding, backgroundColor: colors.surfaceBright },
  bodyCol: { flexBasis: "45%" },
  bodyLabel: { fontSize: 10, color: colors.onSurfaceVariant, textTransform: "uppercase", fontWeight: "600", marginBottom: 2 },
  bodyValue: { ...type.bodyMd, fontWeight: "600", color: colors.onSurface },
  freightValue: { ...type.currencyDisplay, color: colors.primary, maxWidth: 140 },
  });
}
