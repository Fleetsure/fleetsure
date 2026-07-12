import React from "react";
import { View, StyleSheet, ViewProps } from "react-native";
import { colors, radii, spacing, shadow } from "../theme";

export default function Card({ style, ...props }: ViewProps) {
  return <View style={[styles.card, style]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.cardPadding,
    ...shadow.card,
  },
});
