import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../context/AuthContext";
import { driverService, DriverTrip } from "../services/driverService";
import TripCard from "../components/TripCard";
import { fmtCurrency, fmtDate } from "../utils/format";

const PRIMARY = "#1E2D8E";

const PAYMENT_COLORS: Record<string, { color: string; bg: string }> = {
  advance:    { color: "#92400E", bg: "#FEF3C7" },
  salary:     { color: "#1D4ED8", bg: "#DBEAFE" },
  bonus:      { color: "#15803D", bg: "#DCFCE7" },
  deduction:  { color: "#DC2626", bg: "#FEE2E2" },
  settlement: { color: "#7E22CE", bg: "#F3E8FF" },
};

type TabType = "trips" | "payments";

export default function HistoryScreen() {
  const { driver } = useAuth();
  const navigation = useNavigation();
  const [trips, setTrips] = useState<DriverTrip[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [tab, setTab] = useState<TabType>("trips");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!driver) return;
    const [tripsRes, paymentsRes] = await Promise.all([
      driverService.getCompletedTrips(driver.id),
      driverService.getPayments(driver.id),
    ]);
    if (tripsRes.success) setTrips(tripsRes.data ?? []);
    if (paymentsRes.success) setPayments(paymentsRes.data ?? []);
    setLoading(false);
  }, [driver]);

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

  // Summary stats
  const totalFreight = trips.reduce((s, t) => s + Number(t.freight_amount ?? 0), 0);
  const totalAdvance = trips.reduce((s, t) => s + Number(t.driver_advance ?? 0), 0);
  const totalReceived = payments
    .filter((p) => p.type !== "deduction")
    .reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const totalDeducted = payments
    .filter((p) => p.type === "deduction")
    .reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const netBalance = totalReceived - totalAdvance - totalDeducted;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={PRIMARY} size="large" />
      </View>
    );
  }

  const renderPayment = ({ item }: { item: any }) => {
    const cfg = PAYMENT_COLORS[item.type] ?? { color: "#64748B", bg: "#F1F5F9" };
    const isCredit = item.type !== "deduction";
    return (
      <View style={styles.paymentCard}>
        <View style={[styles.payTypeBadge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.payTypeText, { color: cfg.color }]}>
            {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
          </Text>
        </View>
        <View style={styles.payInfo}>
          <Text style={styles.payDate}>{fmtDate(item.date)}</Text>
          {item.notes ? (
            <Text style={styles.payNotes} numberOfLines={1}>{item.notes}</Text>
          ) : null}
        </View>
        <View style={styles.payAmountRow}>
          <Ionicons
            name={isCredit ? "trending-up" : "trending-down"}
            size={12}
            color={isCredit ? "#15803D" : "#DC2626"}
          />
          <Text style={[styles.payAmount, { color: isCredit ? "#15803D" : "#DC2626" }]}>
            {fmtCurrency(item.amount)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>History</Text>
        <Text style={styles.headerSub}>{trips.length} completed trips</Text>
      </View>

      {/* Summary stats */}
      <View style={styles.statsGrid}>
        {[
          { label: "Trips Done", value: String(trips.length), color: PRIMARY },
          { label: "Advance Taken", value: fmtCurrency(totalAdvance), color: "#92400E" },
          { label: "Total Received", value: fmtCurrency(totalReceived), color: "#15803D" },
          { label: "Net Balance", value: fmtCurrency(Math.abs(netBalance)), color: netBalance >= 0 ? "#15803D" : "#DC2626" },
        ].map((s) => (
          <View key={s.label} style={styles.statCard}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === "trips" && styles.tabActive]}
          onPress={() => setTab("trips")}
        >
          <Text style={[styles.tabText, tab === "trips" && styles.tabTextActive]}>
            Trips ({trips.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "payments" && styles.tabActive]}
          onPress={() => setTab("payments")}
        >
          <Text style={[styles.tabText, tab === "payments" && styles.tabTextActive]}>
            Payments ({payments.length})
          </Text>
        </TouchableOpacity>
      </View>

      {tab === "trips" ? (
        <FlatList
          data={trips}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <TripCard
              trip={item}
              onPress={() =>
                (navigation as any).navigate("TripsTab", {
                  screen: "TripDetail",
                  params: { tripId: item.id },
                })
              }
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="time-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No completed trips yet</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={payments}
          keyExtractor={(p, i) => p.id ?? String(i)}
          renderItem={renderPayment}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="wallet-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No payment records yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F0F4FF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F0F4FF" },
  header: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "white" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 2 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: 12,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  statCard: {
    width: "47%",
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statValue: { fontSize: 16, fontWeight: "800", marginBottom: 2 },
  statLabel: { fontSize: 10, color: "#94A3B8", fontWeight: "600" },
  tabRow: {
    flexDirection: "row",
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: PRIMARY },
  tabText: { fontSize: 13, fontWeight: "600", color: "#94A3B8" },
  tabTextActive: { color: PRIMARY },
  list: { padding: 16, paddingBottom: 40 },
  paymentCard: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  payTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  payTypeText: { fontSize: 11, fontWeight: "700" },
  payInfo: { flex: 1 },
  payDate: { fontSize: 12, color: "#64748B", fontWeight: "600" },
  payNotes: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  payAmountRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  payAmount: { fontSize: 14, fontWeight: "800" },
  empty: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 15, color: "#64748B", fontWeight: "600" },
});
