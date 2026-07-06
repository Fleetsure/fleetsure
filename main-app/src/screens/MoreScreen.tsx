import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Users, Droplets, BarChart2, Settings, LogOut, ChevronRight, type LucideIcon } from "lucide-react-native";

import { useAuth } from "../context/AuthContext";
import type { MoreStackParamList } from "../navigation";

import { PRIMARY, BG, CARD, TEXT, TEXT_MUTED, BORDER, DANGER } from "../theme";

type Nav = NativeStackNavigationProp<MoreStackParamList>;

// Grouping mirrors the web app's mobile "More" menu (Fleet items, then an
// Expenses group, then a Compliance group). Web has several more entries
// (Tolls, Tyres, Fleet Health, Insurance & Renewals, Marketplace, Parties,
// Documents, Import Data) that don't have a mobile screen yet.
const MENU_ITEMS: { group: string; items: { screen: keyof MoreStackParamList; label: string; desc: string; icon: LucideIcon; color: string }[] }[] = [
  {
    group: "Fleet",
    items: [
      { screen: "Drivers", label: "Drivers", desc: "Manage drivers assigned to your fleet", icon: Users, color: "#1E2D8E" },
    ],
  },
  {
    group: "Expenses",
    items: [
      { screen: "Fuel", label: "Fuel Logs", desc: "Track fuel fill-ups per vehicle", icon: Droplets, color: "#0E7490" },
    ],
  },
  {
    group: "Compliance",
    items: [
      { screen: "Reports", label: "Reports & Analytics", desc: "P&L summary and vehicle performance", icon: BarChart2, color: "#7C3AED" },
      { screen: "Settings", label: "Settings", desc: "Profile, organisation and preferences", icon: Settings, color: TEXT_MUTED },
    ],
  },
];

export default function MoreScreen() {
  const navigation = useNavigation<Nav>();
  const { user, signOut } = useAuth();

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: signOut },
    ]);
  };

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
                    <item.icon size={20} color={item.color} />
                  </View>
                  <View style={styles.menuText}>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    <Text style={styles.menuDesc}>{item.desc}</Text>
                  </View>
                  <ChevronRight size={16} color={TEXT_MUTED} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.logoutRow} onPress={handleLogout} activeOpacity={0.7}>
          <LogOut size={18} color={DANGER} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

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
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 16,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutText: { fontSize: 15, fontWeight: "700", color: DANGER },
  footer: { textAlign: "center", fontSize: 12, color: TEXT_MUTED },
});
