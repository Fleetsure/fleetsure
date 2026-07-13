import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radii, shadow, type } from "../theme";
import type { MainTabParamList } from "../navigation";

const ITEMS: { key: keyof MainTabParamList; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { key: "HomeTab", label: "Home", icon: "home" },
  { key: "TripsTab", label: "Trips", icon: "local-shipping" },
  { key: "VehiclesTab", label: "Vehicles", icon: "directions-bus" },
  { key: "DriversTab", label: "Drivers", icon: "people" },
  { key: "MoreTab", label: "More", icon: "menu" },
];

// Custom tabBar so it matches the Stitch mockups exactly (pill highlight
// behind the active icon) instead of the default RN Navigation tab bar look.
export default function BottomNav({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.nav, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {ITEMS.map((item, i) => {
        const focused = state.index === i;
        return (
          <TouchableOpacity
            key={item.key}
            style={styles.item}
            onPress={() => navigation.navigate(item.key)}
            activeOpacity={0.7}
          >
            <View style={focused ? styles.iconPill : undefined}>
              <MaterialIcons name={item.icon} size={24} color={focused ? colors.primaryContainer : colors.outline} />
            </View>
            <Text style={[styles.label, { color: focused ? colors.primaryContainer : colors.outline }]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    minHeight: 60,
    paddingTop: 6,
    backgroundColor: colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    ...shadow.nav,
  },
  item: { flex: 1, justifyContent: "center", alignItems: "center", gap: 2 },
  iconPill: {
    backgroundColor: colors.secondaryContainer,
    borderRadius: radii.full,
    paddingHorizontal: 16,
    paddingVertical: 2,
    marginBottom: 2,
  },
  label: { ...type.labelMd },
});
