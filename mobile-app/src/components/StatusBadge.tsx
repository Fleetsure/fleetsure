import { View, Text, StyleSheet } from "react-native";
import { colors, radii, type } from "../theme";

export type BadgeTone = "success" | "warning" | "neutral" | "info";

const TONES: Record<BadgeTone, { bg: string; fg: string }> = {
  success: { bg: colors.successBg, fg: colors.success },
  warning: { bg: colors.warningBg, fg: colors.warning },
  neutral: { bg: colors.surfaceContainerHighest, fg: colors.onSurfaceVariant },
  info: { bg: colors.secondaryContainer, fg: colors.onSecondaryContainer },
};

export default function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: BadgeTone }) {
  const t = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={[styles.text, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  text: { ...type.labelMd, fontSize: 11 },
});
