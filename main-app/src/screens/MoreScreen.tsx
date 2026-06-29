import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../context/AuthContext";
import type { MoreStackParamList } from "../navigation";

const PRIMARY = "#1E2D8E";
const BG = "#F0F4FF";
const CARD = "#ffffff";
const TEXT = "#1A1A2E";
const TEXT_MUTED = "#6B7280";
const BORDER = "#E5E7EB";
const DANGER = "#DC2626";

type Nav = NativeStackNavigationProp<MoreStackParamList>;

const MENU_ITEMS = [
  {
    group: "Fleet",
    items: [
      { screen: "Drivers" as const, label: "Drivers", desc: "Manage drivers assigned to your fleet", icon: "people", color: "#1E2D8E" },
      { screen: "Fuel" as const, label: "Fuel Logs", desc: "Track fuel fill-ups per vehicle", icon: "water", color: "#0E7490" },
    ],
  },
  {
    group: "Insights",
    items: [
      { screen: "Reports" as const, label: "Reports & Analytics", desc: "P&L summary and vehicle performance", icon: "bar-chart", color: "#7C3AED" },
    ],
  },
  {
    group: "Account",
    items: [
      { screen: "Settings" as const, label: "Settings", desc: "Profile, organisation and preferences", icon: "settings", color: TEXT_MUTED },
    ],
  },
];

export default function MoreScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile mini-card */}
        <View style={styles.profileCard}>
          <Image
            source={require("../../assets/logo.png")}
            style={styles.avatar}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.profileName}>{user?.name ?? "Fleet Owner"}</Text>
            {user?.org_name ? (
              <Text style={styles.profileOrg}>{user.org_name}</Text>
            ) : null}
            <Text style={styles.profileEmail} numberOfLines={1}>{user?.id?.slice(0, 16) ?? "—"}…</Text>
          </View>
        </View>

        {/* Menu Groups */}
        {MENU_ITEMS.map((group) => (
          <View key={group.group} style={styles.group}>
            <Text style={styles.groupTitle}>{group.group}</Text>
            <View style={styles.groupCard}>
              {group.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.screen}
                  style={[
                    styles.menuItem,
                    idx < group.items.length - 1 && styles.menuItemBorder,
                  ]}
                  onPress={() => navigation.navigate(item.screen)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuIcon, { backgroundColor: item.color + "1A" }]}>
                    <Ionicons name={item.icon as any} size={20} color={item.color} />
                  </View>
                  <View style={styles.menuText}>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    <Text style={styles.menuDesc}>{item.desc}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={TEXT_MUTED} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <Text style={styles.footer}>FleetSure v1.0.0 · Made with ❤️ in Bengaluru</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  profileName: { fontSize: 16, fontWeight: "800", color: TEXT },
  profileOrg: { fontSize: 13, color: PRIMARY, fontWeight: "600" },
  profileEmail: { fontSize: 11, color: TEXT_MUTED, marginTop: 1 },
  group: { gap: 8 },
  groupTitle: { fontSize: 12, fontWeight: "700", color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: 0.5, paddingHorizontal: 4 },
  groupCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: "700", color: TEXT },
  menuDesc: { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
  footer: { textAlign: "center", fontSize: 12, color: TEXT_MUTED },
});
