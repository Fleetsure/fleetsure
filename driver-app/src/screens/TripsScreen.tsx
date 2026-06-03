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
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../context/AuthContext";
import { driverService, DriverTrip } from "../services/driverService";
import TripCard from "../components/TripCard";
import type { TripsStackParamList } from "../navigation";

const PRIMARY = "#1E2D8E";
type Nav = NativeStackNavigationProp<TripsStackParamList, "TripsList">;

export default function TripsScreen() {
  const { driver } = useAuth();
  const navigation = useNavigation<Nav>();
  const [trips, setTrips] = useState<DriverTrip[]>([]);
  const [tab, setTab] = useState<"in_progress" | "planned">("in_progress");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!driver) return;
    const res = await driverService.getActiveTrips(driver.id);
    if (res.success) setTrips(res.data ?? []);
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

  const filtered = trips.filter((t) => t.status === tab);
  const activeCount = trips.filter((t) => t.status === "in_progress").length;
  const plannedCount = trips.filter((t) => t.status === "planned").length;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Trips</Text>
        <Text style={styles.headerSub}>{trips.length} total assigned</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === "in_progress" && styles.tabActive]}
          onPress={() => setTab("in_progress")}
        >
          <Text style={[styles.tabText, tab === "in_progress" && styles.tabTextActive]}>
            In Progress ({activeCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "planned" && styles.tabActive]}
          onPress={() => setTab("planned")}
        >
          <Text style={[styles.tabText, tab === "planned" && styles.tabTextActive]}>
            Upcoming ({plannedCount})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={PRIMARY} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <TripCard
              trip={item}
              onPress={() =>
                navigation.navigate("TripDetail", { tripId: item.id })
              }
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="car-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>
                {tab === "in_progress"
                  ? "No active trips right now"
                  : "No upcoming trips assigned"}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F0F4FF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "white", letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 2 },
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
  list: { padding: 16, paddingBottom: 32 },
  empty: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 15, color: "#64748B", fontWeight: "600" },
});
