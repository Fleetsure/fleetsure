import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { colors, radii, type } from "../theme";

export default function ScreenHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  const navigation = useNavigation();
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <MaterialIcons name="arrow-back" size={22} color={colors.onSurface} />
      </TouchableOpacity>
      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 8, padding: 16 },
  backBtn: { width: 36, height: 36, borderRadius: radii.full, justifyContent: "center", alignItems: "center", backgroundColor: colors.surfaceContainerLow },
  headerTitle: { ...type.headlineSm, color: colors.onBackground, flex: 1 },
  right: { flexDirection: "row", alignItems: "center" },
});
