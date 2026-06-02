import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

import { useAuth } from "../context/AuthContext";
import { driverService, DriverTrip } from "../services/driverService";
import StatusBadge from "../components/StatusBadge";
import TripCard from "../components/TripCard";
import { fmtCurrency, fmtDate, getGreeting } from "../utils/format";
import type { MainTabParamList } from "../navigation";

const PRIMARY = "#1E2D8E";

type Nav = BottomTabNavigationProp<MainTabParamList>;

export default function DashboardScreen() {
  const { driver, logout } = useAuth();
  const navigation = useNavigation<Nav>();
  const [trips, setTrips] = useState<DriverTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const res = await driverService.getActiveTrips();
    if (res.success) setTrips(res.data ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const inProgress = trips.filter((t) => t.status === "in_progress");
  const planned = trips.filter((t) => t.status === "planned");
  const currentTrip = inProgress[0] ?? null;

  const totalAdvance = trips.reduce(
    (s, t) => s + Number(t.driver_advance ?? 0),
    0
  );

  const firstName = driver?.name.split(" ")[0] ?? "Driver";

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={PRIMARY} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>FleetSure Driver</Text>
          <Text style={styles.headerName}>{driver?.name ?? ""}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={16} color="white" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View style={styles.greetingRow}>
          <Text style={styles.greeting}>
            {getGreeting()}, {firstName} 👋
          </Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { label: "Active Trips", value: String(inProgress.length) },
            { label: "Advance", value: fmtCurrency(totalAdvance) },
            { label: "Upcoming", value: String(planned.length) },
          ].map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Current trip */}
        {currentTrip ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Trip</Text>
            <View style={styles.currentCard}>
              <View style={styles.currentTop}>
                <View style={styles.currentRegBox}>
                  <Ionicons name="car" size={18} color="#15803D" />
                  <Text style={styles.currentReg}>
                    {currentTrip.vehicles?.registration_number ?? "—"}
                  </Text>
                </View>
                <StatusBadge status={currentTrip.status} />
              </View>
              <Text style={styles.currentRoute}>
                {currentTrip.origin} → {currentTrip.destination}
              </Text>
              <Text style={styles.currentFreight}>
                {fmtCurrency(currentTrip.freight_amount)}
              </Text>
              {currentTrip.material ? (
                <Text style={styles.currentMeta}>{currentTrip.material}</Text>
              ) : null}
              <View style={styles.currentActions}>
                <TouchableOpacity
                  style={styles.viewBtn}
                  onPress={() =>
                    navigation.navigate("TripsTab", {
                      screen: "TripDetail",
                      params: { tripId: currentTrip.id },
                    } as any)
                  }
                >
                  <Text style={styles.viewBtnText}>View Trip →</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.addExpBtn}
                  onPress={() =>
                    navigation.navigate("TripsTab", {
                      screen: "TripDetail",
                      params: { tripId: currentTrip.id },
                    } as any)
                  }
                >
                  <Ionicons name="add" size={14} color="white" />
                  <Text style={styles.addExpText}>Add Expense</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : null}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {[
              { icon: "car-outline" as const, label: "My Trips", tab: "TripsTab" as const },
              { icon: "warning-outline" as const, label: "Report Issue", tab: "IssuesTab" as const },
              { icon: "time-outline" as const, label: "Trip History", tab: "HistoryTab" as const },
              { icon: "wallet-outline" as const, label: "Payments", tab: "HistoryTab" as const },
            ].map((a) => (
              <TouchableOpacity
                key={a.label}
                style={styles.actionCard}
                onPress={() => navigation.navigate(a.tab)}
              >
                <Ionicons name={a.icon} size={24} color={PRIMARY} />
                <Text style={styles.actionLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Upcoming trips */}
        {planned.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Trips</Text>
            {planned.slice(0, 3).map((t) => (
              <TripCard
                key={t.id}
                trip={t}
                onPress={() =>
                  navigation.navigate("TripsTab", {
                    screen: "TripDetail",
                    params: { tripId: t.id },
                  } as any)
                }
              />
            ))}
          </View>
        ) : null}

        {/* Empty state */}
        {trips.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="car-outline" size={56} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No trips assigned yet</Text>
            <Text style={styles.emptySub}>
              Your fleet manager will assign trips to you here.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F0F4FF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F0F4FF" },
  header: {
    backgroundColor: PRIMARY,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerSub: {
    fontSize: 10,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  headerName: {
    fontSize: 17,
    fontWeight: "800",
    color: "white",
    letterSpacing: -0.3,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  logoutText: { color: "white", fontSize: 12, fontWeight: "600" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  greetingRow: { marginBottom: 16 },
  greeting: { fontSize: 20, fontWeight: "800", color: "#1E293B", letterSpacing: -0.4 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statValue: { fontSize: 18, fontWeight: "800", color: PRIMARY, marginBottom: 2 },
  statLabel: { fontSize: 10, color: "#64748B", fontWeight: "600", textAlign: "center" },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  currentCard: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#86EFAC",
    backgroundColor: "#F0FFF4",
  },
  currentTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  currentRegBox: { flexDirection: "row", alignItems: "center", gap: 6 },
  currentReg: { fontSize: 13, fontWeight: "700", color: "#15803D" },
  currentRoute: { fontSize: 16, fontWeight: "800", color: "#1E293B", marginBottom: 4 },
  currentFreight: { fontSize: 22, fontWeight: "900", color: PRIMARY, marginBottom: 4 },
  currentMeta: { fontSize: 12, color: "#64748B", marginBottom: 12 },
  currentActions: { flexDirection: "row", gap: 10 },
  viewBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: "center",
  },
  viewBtnText: { color: PRIMARY, fontSize: 13, fontWeight: "700" },
  addExpBtn: {
    flex: 1,
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
  },
  addExpText: { color: "white", fontSize: 13, fontWeight: "700" },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  actionCard: {
    width: "47%",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  actionLabel: { fontSize: 13, fontWeight: "600", color: "#334155", textAlign: "center" },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#64748B" },
  emptySub: { fontSize: 13, color: "#94A3B8", textAlign: "center", lineHeight: 19 },
});
