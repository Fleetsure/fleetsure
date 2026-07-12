import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Image, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Alert, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { useFirm } from "../context/FirmContext";
import { useColors } from "../context/ThemeContext";
import { analyticsService } from "../lib/services/analyticsService";
import { tripService } from "../lib/services/tripService";
import Card from "../components/Card";
import StatusBadge from "../components/StatusBadge";
import { radii, spacing, type, formatCurrency } from "../theme";
import type { Trip } from "../lib/types";

const TRIP_STATUS_TONE: Record<string, { label: string; tone: "success" | "warning" | "neutral" | "info" }> = {
  completed: { label: "Completed", tone: "success" },
  in_progress: { label: "In Progress", tone: "info" },
  planned: { label: "Planned", tone: "warning" },
};

export default function HomeScreen() {
  const { user } = useAuth();
  const { firms, activeFirmId, setActiveFirmId, firmVersion } = useFirm();
  const navigation = useNavigation<any>();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overview, setOverview] = useState<any>(null);
  const [topVehicles, setTopVehicles] = useState<any[]>([]);
  const [recentTrips, setRecentTrips] = useState<Trip[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const load = useCallback(async () => {
    const [ovRes, vehRes, tripRes] = await Promise.all([
      analyticsService.getOverview(30),
      analyticsService.getVehicles(30),
      tripService.getAll(2),
    ]);
    if (ovRes.success) setOverview(ovRes.data);
    if (vehRes.success) setTopVehicles((vehRes.data?.vehicles ?? []).slice(0, 2));
    if (tripRes.success) setRecentTrips(tripRes.data ?? []);
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load, firmVersion]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleWhatsAppReport() {
    const message =
      `*FleetSure Daily Report*\n` +
      `Vehicles: ${overview?.total_vehicles ?? 0} (${overview?.active_vehicles ?? 0} active)\n` +
      `Drivers: ${overview?.total_drivers ?? 0} (${overview?.drivers_on_leave ?? 0} on leave)\n` +
      `Trips (30d): ${overview?.total_trips ?? 0}\n` +
      `Revenue (30d): ${formatCurrency(overview?.total_revenue ?? 0)}`;
    const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("WhatsApp not available", "Install WhatsApp to share your daily report.");
    }
  }

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return recentTrips.filter((t) =>
      t.origin?.toLowerCase().includes(q) ||
      t.destination?.toLowerCase().includes(q) ||
      t.driver_name?.toLowerCase().includes(q)
    );
  }, [recentTrips, searchQuery]);

  function closeSearch() {
    setSearchOpen(false);
    setSearchQuery("");
  }

  // Jumps straight to Analytics, not a push — resets the More stack so
  // MoreMenu is still there underneath (back button hidden) instead of
  // stacking Analytics on top of whatever was already on that tab.
  function handleOpenInsights() {
    navigation.dispatch(
      CommonActions.reset({
        routes: [
          {
            name: "MoreTab",
            state: {
              routes: [
                { name: "MoreMenu" },
                { name: "Analytics" },
              ],
              index: 1,
            },
          },
        ],
      })
    );
  }

  function handleSwitchFirm() {
    if (firms.length < 2) return;
    const idx = firms.findIndex(f => f.id === activeFirmId);
    const next = firms[(idx + 1) % firms.length];
    setActiveFirmId(next.id);
  }

  const starTruck = topVehicles[0];
  const activeFirm = firms.find((f) => f.id === activeFirmId);
  const activeFirmLogo = (activeFirm as any)?.logo_url as string | undefined;

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          {activeFirmLogo ? (
            <Image source={{ uri: activeFirmLogo }} style={styles.firmLogo} />
          ) : (
            <View style={styles.avatar}>
              <MaterialIcons name="person" size={22} color={colors.onSurfaceVariant} />
            </View>
          )}
          <View>
            <Text style={styles.brand}>FleetSure</Text>
            {activeFirm ? <Text style={styles.firmNameText} numberOfLines={1}>{activeFirm.name}</Text> : null}
          </View>
        </View>
        <View style={styles.topBarRight}>
          <TouchableOpacity onPress={() => setSearchOpen((v) => !v)} style={{ marginRight: 12 }}>
            <MaterialIcons name={searchOpen ? "close" : "search"} size={22} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleOpenInsights} style={{ marginRight: 12 }}>
            <MaterialIcons name="insights" size={22} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
          {firms.length > 1 && (
            <TouchableOpacity style={styles.switchFirmBtn} onPress={handleSwitchFirm}>
              <Text style={styles.switchFirmText}>Switch Firm</Text>
              <MaterialIcons name="swap-horiz" size={14} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {searchOpen ? (
          <View>
            <View style={styles.searchBar}>
              <MaterialIcons name="search" size={18} color={colors.onSurfaceVariant} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search trips by route or driver…"
                placeholderTextColor={colors.outline}
                autoFocus
              />
              <TouchableOpacity onPress={closeSearch}>
                <MaterialIcons name="close" size={18} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
            {searchQuery.trim() ? (
              <View style={{ gap: spacing.stackGap, marginTop: spacing.stackGap }}>
                {searchResults.length === 0 ? (
                  <EmptyRow text="No matching trips." colors={colors} styles={styles} />
                ) : (
                  searchResults.map((t) => {
                    const st = TRIP_STATUS_TONE[t.status] ?? { label: t.status, tone: "neutral" as const };
                    return (
                      <Card key={t.id} style={{ padding: 12 }}>
                        <View style={styles.tripRow}>
                          <View>
                            <Text style={styles.tripRoute}>{t.origin} → {t.destination}</Text>
                            <Text style={styles.tripMeta}>{t.driver_name} · {new Date(t.start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</Text>
                          </View>
                          <View style={{ alignItems: "flex-end", gap: 4 }}>
                            <Text style={styles.tripAmount}>{formatCurrency(t.freight_amount)}</Text>
                            <StatusBadge label={st.label} tone={st.tone} />
                          </View>
                        </View>
                      </Card>
                    );
                  })
                )}
              </View>
            ) : null}
          </View>
        ) : (
          <View>
            <Text style={styles.greeting}>Namaste, {user?.name?.split(" ")[0] ?? "there"}!</Text>
            <Text style={styles.greetingSub}>Here is your fleet overview for today.</Text>
          </View>
        )}

        <View style={styles.statGrid}>
          <StatCard colors={colors} styles={styles} icon="directions-bus" label="Total Vehicles" value={overview?.total_vehicles ?? 0}
            deltaLabel={`${overview?.active_vehicles ?? 0} Active`} tone="success" />
          <StatCard colors={colors} styles={styles} icon="group" label="Total Drivers" value={overview?.total_drivers ?? 0}
            deltaLabel={`${overview?.drivers_on_leave ?? 0} On Leave`} tone="warning" />
          <StatCard colors={colors} styles={styles} icon="local-shipping" label="Total Trips" value={overview?.total_trips ?? 0} deltaLabel="This Month" tone="success" />
          <StatCard colors={colors} styles={styles} icon="account-balance-wallet" label="Revenue" value={formatCurrency(overview?.total_revenue ?? 0)} deltaLabel="Last 30 Days" tone="success" />
        </View>

        {starTruck && starTruck.margin_pct > 0 && (
          <View style={styles.starBanner}>
            <Text style={{ fontSize: 16 }}>⭐</Text>
            <Text style={styles.starText}>
              <Text style={{ fontWeight: "700" }}>{starTruck.registration_number}</Text> is your star truck — {starTruck.margin_pct}% profit margin
            </Text>
          </View>
        )}

        <View>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Profit &amp; Loss per Truck</Text>
            <TouchableOpacity onPress={() => navigation.navigate("VehiclesTab")}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={{ gap: spacing.stackGap }}>
            {topVehicles.length === 0 && <EmptyRow text="No trips in the last 30 days yet." colors={colors} styles={styles} />}
            {topVehicles.map((v) => (
              <Card key={v.vehicle_id}>
                <View style={styles.truckRow}>
                  <View style={styles.truckRowLeft}>
                    <View style={styles.truckIconBox}>
                      <MaterialIcons name="local-shipping" size={20} color={colors.secondary} />
                    </View>
                    <View style={{ flexShrink: 1 }}>
                      <Text style={styles.truckReg} numberOfLines={1} ellipsizeMode="tail">{v.registration_number}</Text>
                      <StatusBadge
                        label={v.status === "in_trip" ? "On Trip" : v.status === "maintenance" ? "Service Required" : "Available"}
                        tone={v.status === "maintenance" ? "warning" : "success"}
                      />
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end", flexShrink: 0 }}>
                    <Text style={styles.netProfitLabel}>Net Profit</Text>
                    <Text
                      style={[styles.netProfitValue, { color: v.profit >= 0 ? colors.success : colors.error }]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {formatCurrency(v.profit)}
                    </Text>
                  </View>
                </View>
                <MiniBar styles={styles} label="Revenue" value={v.revenue} max={Math.max(v.revenue, v.expenses, 1)} color={colors.primary} />
                <MiniBar styles={styles} label="Expense" value={v.expenses} max={Math.max(v.revenue, v.expenses, 1)} color={colors.error} />
              </Card>
            ))}
          </View>
        </View>

        <View>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Trips</Text>
            <TouchableOpacity onPress={() => navigation.navigate("TripsTab")} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={styles.viewAll}>View All</Text>
              <MaterialIcons name="arrow-forward" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={{ gap: spacing.stackGap }}>
            {recentTrips.length === 0 && <EmptyRow text="No trips logged yet." colors={colors} styles={styles} />}
            {recentTrips.map((t) => {
              const st = TRIP_STATUS_TONE[t.status] ?? { label: t.status, tone: "neutral" as const };
              return (
                <Card key={t.id} style={{ padding: 12 }}>
                  <View style={styles.tripRow}>
                    <View>
                      <Text style={styles.tripRoute}>{t.origin} → {t.destination}</Text>
                      <Text style={styles.tripMeta}>{t.driver_name} · {new Date(t.start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      <Text style={styles.tripAmount}>{formatCurrency(t.freight_amount)}</Text>
                      <StatusBadge label={st.label} tone={st.tone} />
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        </View>

        <View style={styles.whatsappCard}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.whatsappTitle}>Get Daily Report</Text>
            <Text style={styles.whatsappSub}>Receive fleet updates directly on WhatsApp.</Text>
          </View>
          <TouchableOpacity style={styles.whatsappBtn} onPress={handleWhatsAppReport}>
            <Text style={styles.whatsappBtnText}>Subscribe</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, label, value, deltaLabel, tone, colors, styles }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; value: string | number; deltaLabel: string; tone: "success" | "warning"; colors: ReturnType<typeof useColors>; styles: ReturnType<typeof makeStyles> }) {
  return (
    <Card style={{ gap: 8, flexBasis: "48%" }}>
      <View style={styles.statHead}>
        <Text style={styles.statLabel}>{label}</Text>
        <View style={styles.statIconBox}>
          <MaterialIcons name={icon} size={16} color={colors.primary} />
        </View>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <StatusBadge label={deltaLabel} tone={tone} />
    </Card>
  );
}

function MiniBar({ label, value, max, color, styles }: { label: string; value: number; max: number; color: string; styles: ReturnType<typeof makeStyles> }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <View style={styles.miniBarRow}>
      <Text style={styles.miniBarLabel}>{label}</Text>
      <View style={styles.miniBarTrack}>
        <View style={[styles.miniBarFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.miniBarValue}>{Math.round(value / 1000)}k</Text>
    </View>
  );
}

function EmptyRow({ text, colors, styles }: { text: string; colors: ReturnType<typeof useColors>; styles: ReturnType<typeof makeStyles> }) {
  return (
    <Card>
      <Text style={{ color: colors.onSurfaceVariant, ...type.bodyMd }}>{text}</Text>
    </Card>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.containerMargin, paddingVertical: 12 },
  topBarLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: radii.full, backgroundColor: colors.surfaceContainerHigh, borderWidth: 1, borderColor: colors.outlineVariant, justifyContent: "center", alignItems: "center" },
  firmLogo: { width: 40, height: 40, borderRadius: radii.md },
  brand: { ...type.headlineLgMobile, color: colors.primary },
  firmNameText: { fontSize: 11, color: colors.onSurfaceVariant, marginTop: -2, maxWidth: 160 },
  topBarRight: { flexDirection: "row", alignItems: "center" },
  switchFirmBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.surfaceContainerLowest, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: radii.full, paddingHorizontal: 14, paddingVertical: 8 },
  switchFirmText: { ...type.labelMd, color: colors.onSurfaceVariant },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: radii.md, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, ...type.bodyMd, color: colors.onSurface, padding: 0 },
  scroll: { padding: spacing.containerMargin, gap: spacing.sectionGap, paddingBottom: 32 },
  greeting: { ...type.headlineMd, color: colors.onBackground, marginBottom: 2 },
  greetingSub: { ...type.bodyMd, color: colors.onSurfaceVariant },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.stackGap, justifyContent: "space-between" },
  statHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statLabel: { ...type.labelMd, color: colors.onSurfaceVariant },
  statIconBox: { width: 32, height: 32, borderRadius: radii.full, backgroundColor: colors.secondaryContainer, justifyContent: "center", alignItems: "center" },
  statValue: { ...type.currencyDisplay, color: colors.onBackground },
  starBanner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: radii.xl, padding: 12 },
  starText: { ...type.bodyMd, color: colors.onBackground, flexShrink: 1 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.stackGap },
  sectionTitle: { ...type.headlineSm, color: colors.onBackground },
  viewAll: { ...type.labelMd, color: colors.primary },
  truckRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  truckRowLeft: { flexDirection: "row", alignItems: "center", gap: 12, flexShrink: 1 },
  truckIconBox: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.surfaceContainer, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  truckReg: { ...type.bodyLg, fontWeight: "600", color: colors.onBackground, marginBottom: 4 },
  netProfitLabel: { ...type.labelMd, color: colors.onSurfaceVariant },
  netProfitValue: { fontSize: 18, fontWeight: "700", maxWidth: 130 },
  miniBarRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  miniBarLabel: { width: 56, fontSize: 10, color: colors.onSurfaceVariant },
  miniBarTrack: { flex: 1, height: 8, borderRadius: radii.full, backgroundColor: colors.surfaceContainerHigh, overflow: "hidden" },
  miniBarFill: { height: "100%", borderRadius: radii.full },
  miniBarValue: { width: 48, fontSize: 10, color: colors.onBackground, textAlign: "right" },
  tripRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  tripRoute: { ...type.bodyLg, fontWeight: "600", color: colors.onBackground },
  tripMeta: { fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
  tripAmount: { ...type.bodyLg, fontWeight: "700", color: colors.onBackground },
  whatsappCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.surfaceContainerLowest, borderWidth: 1, borderColor: colors.whatsapp, borderRadius: radii.xl, padding: spacing.cardPadding, gap: 12 },
  whatsappTitle: { ...type.headlineSm, color: colors.onBackground },
  whatsappSub: { ...type.labelMd, color: colors.onSurfaceVariant, textTransform: "none", fontWeight: "400" },
  whatsappBtn: { backgroundColor: colors.whatsapp, borderRadius: radii.md, paddingHorizontal: 16, paddingVertical: 10 },
  whatsappBtnText: { color: "white", ...type.labelMd },
  });
}
