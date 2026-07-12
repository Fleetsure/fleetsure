import React, { useCallback, useMemo, useRef, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Animated, PanResponder } from "react-native";
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

const FILTERS = [
  { key: "all", label: "All" },
  { key: "planned", label: "Planned" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
] as const;

function getStatusStyle(colors: ReturnType<typeof useColors>): Record<string, { label: string; bg: string; fg: string; dot: string }> {
  return {
    in_progress: { label: "In Progress", bg: colors.secondaryContainer, fg: colors.onSecondaryContainer, dot: colors.primary },
    planned: { label: "Planned", bg: colors.surfaceContainerHighest, fg: colors.onSurfaceVariant, dot: colors.outline },
    completed: { label: "Completed", bg: colors.successBg, fg: colors.success, dot: colors.success },
  };
}

// Only planned/in_progress trips can be advanced; completed/cancelled are terminal.
const STATUS_NEXT: Record<string, string | undefined> = {
  planned: "in_progress",
  in_progress: "completed",
};

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
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");

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

  async function handleAdvance(id: string, nextStatus: string) {
    setTrips((prev) => prev.map((t) => (t.id === id ? { ...t, status: nextStatus as any } : t)));
    const res = await tripService.update(id, { status: nextStatus as any });
    if (!res.success) load();
  }

  const stats = useMemo(() => ({
    total: trips.length,
    planned: trips.filter(t => t.status === "planned").length,
    in_progress: trips.filter(t => t.status === "in_progress").length,
    completed: trips.filter(t => t.status === "completed").length,
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

      <View style={styles.statRow}>
        <StatCell styles={styles} label="Total" value={stats.total} />
        <StatCell styles={styles} label="Planned" value={stats.planned} />
        <StatCell styles={styles} label="In Progress" value={stats.in_progress} color={colors.primary} />
        <StatCell styles={styles} label="Completed" value={stats.completed} color={colors.secondary} />
      </View>

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
            onAdvance={handleAdvance}
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
  onAdvance,
  colors,
  styles,
  statusStyle,
}: {
  item: Trip;
  vehicleReg: string;
  onPress: () => void;
  onAdvance: (id: string, nextStatus: string) => void;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof makeStyles>;
  statusStyle: Record<string, { label: string; bg: string; fg: string; dot: string }>;
}) {
  const pan = useRef(new Animated.Value(0)).current;
  const nextStatus = STATUS_NEXT[item.status];
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        !!nextStatus && gesture.dx > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 2,
      onPanResponderMove: (_evt, gesture) => {
        if (gesture.dx > 0) pan.setValue(Math.min(gesture.dx, 140));
      },
      onPanResponderRelease: (_evt, gesture) => {
        if (nextStatus && gesture.dx > 80) onAdvance(item.id, nextStatus);
        Animated.spring(pan, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(pan, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
      },
    })
  ).current;

  const st = statusStyle[item.status] ?? { label: item.status, bg: colors.surfaceContainerHighest, fg: colors.onSurfaceVariant, dot: colors.outline };
  const nextLabel = nextStatus ? statusStyle[nextStatus]?.label ?? nextStatus : null;

  return (
    <View>
      {nextLabel ? (
        <View style={styles.swipeBackdrop}>
          <MaterialIcons name="arrow-forward" size={18} color="white" />
          <Text style={styles.swipeBackdropText}>Advance to {nextLabel}</Text>
        </View>
      ) : null}
      <Animated.View style={{ transform: [{ translateX: pan }] }} {...panResponder.panHandlers}>
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
              <View style={styles.cardHeadRight}>
                <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                  <View style={[styles.statusDot, { backgroundColor: st.dot }]} />
                  <Text style={[styles.statusPillText, { color: st.fg }]}>{st.label}</Text>
                </View>
                <Text style={styles.freightValue} numberOfLines={1} ellipsizeMode="tail">{formatCurrency(item.freight_amount)}</Text>
              </View>
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
      </Animated.View>
    </View>
  );
}

function StatCell({ label, value, color, styles }: { label: string; value: number; color?: string; styles: ReturnType<typeof makeStyles> }) {
  return (
    <Card style={{ flex: 1 }}>
      <Text style={styles.statLabel}>{label}</Text>
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
  statRow: { flexDirection: "row", gap: 8, paddingHorizontal: spacing.containerMargin, marginTop: 8 },
  statLabel: { ...type.labelMd, color: colors.onSurfaceVariant, marginBottom: 4 },
  statValue: { ...type.headlineMd, color: colors.onBackground },
  filterRow: { marginTop: spacing.sectionGap - 8, marginBottom: 4 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radii.full, borderWidth: 1, borderColor: colors.outlineVariant, backgroundColor: colors.surfaceContainerLowest },
  filterChipActive: { backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer },
  filterChipText: { ...type.labelMd, color: colors.onSurfaceVariant },
  filterChipTextActive: { color: colors.onPrimaryContainer },
  list: { padding: spacing.containerMargin, gap: spacing.stackGap, paddingBottom: 32 },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: spacing.cardPadding, borderBottomWidth: 1, borderBottomColor: colors.surfaceContainer },
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
  swipeBackdrop: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: colors.success, borderRadius: radii.xl,
    flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 20,
  },
    swipeBackdropText: { color: "white", fontWeight: "700", fontSize: 14 },
  });
}
