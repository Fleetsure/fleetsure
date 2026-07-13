import React from "react";
import { View, Text, TextInput, StyleSheet, TextInputProps } from "react-native";
import { colors, radii } from "../theme";

type Props = TextInputProps & { label: string; required?: boolean };

export default function FormField({ label, required, style, ...props }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {label.toUpperCase()}
        {required ? <Text style={styles.asterisk}> *</Text> : null}
      </Text>
      <TextInput style={[styles.input, style]} placeholderTextColor={colors.outline} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 11, fontWeight: "700", color: colors.onSurfaceVariant, letterSpacing: 0.8, marginBottom: 8 },
  asterisk: { color: colors.danger },
  input: {
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.onSurface,
  },
});
