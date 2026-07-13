import { useState, useRef } from "react";
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, type, radii } from "../theme";

interface Suggestion { place_id?: number; display_name: string; lat: string; lon: string; }
interface LatLng { lat: number; lng: number; }

interface Props {
  label: string;
  required?: boolean;
  value: string;
  onChange: (text: string) => void;
  onSelect: (description: string, latLng: LatLng) => void;
}

export default function PlacesAutocomplete({ label, required, value, onChange, onSelect }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [focused, setFocused] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(text: string) {
    onChange(text);
    if (timer.current) clearTimeout(timer.current);
    if (text.length < 3) { setSuggestions([]); return; }
    timer.current = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&countrycodes=in&format=json&addressdetails=1&limit=5`;
        const res = await fetch(url, { headers: { "User-Agent": "FleetSure/1.0 dilip.25017@ssb.scaler.com" } });
        const json = await res.json();
        setSuggestions(json ?? []);
      } catch { setSuggestions([]); }
    }, 350);
  }

  function handleSelect(s: Suggestion) {
    setSuggestions([]);
    onChange(s.display_name);
    onSelect(s.display_name, { lat: Number(s.lat), lng: Number(s.lon) });
  }

  return (
    <View style={[styles.wrap, { zIndex: focused ? 999 : 1 }]}>
      <Text style={styles.label}>
        {label.toUpperCase()}
        {required ? <Text style={styles.asterisk}> *</Text> : null}
      </Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 200)}
        placeholder={`Enter ${label.toLowerCase()}`}
        placeholderTextColor={colors.outline}
      />
      {suggestions.length > 0 && focused && (
        <View style={styles.dropdown}>
          {suggestions.map((s) => (
            <TouchableOpacity key={s.place_id ?? s.display_name} style={styles.suggestion} onPress={() => handleSelect(s)}>
              <MaterialIcons name="location-on" size={14} color={colors.onSurfaceVariant} />
              <Text style={styles.suggestionText} numberOfLines={2}>{s.display_name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14, position: "relative" },
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
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    zIndex: 9999,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    maxHeight: 200,
  },
  suggestion: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  suggestionText: { ...type.bodyMd, color: colors.onSurface, flex: 1 },
});
