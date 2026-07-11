import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface Props {
  status: string;
}

const CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  planned:        { bg: "#DBEAFE", color: "#1D4ED8", label: "Planned" },
  in_progress:    { bg: "#DCFCE7", color: "#15803D", label: "In Progress" },
  pending_review: { bg: "#F3E8FF", color: "#7E22CE", label: "Awaiting Confirmation" },
  completed:      { bg: "#F1F5F9", color: "#475569", label: "Completed" },
  cancelled:      { bg: "#FEE2E2", color: "#B91C1C", label: "Cancelled" },
};

export default function StatusBadge({ status }: Props) {
  const cfg = CONFIG[status] ?? { bg: "#F1F5F9", color: "#475569", label: status };
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.text, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 11,
    fontWeight: "700",
  },
});
