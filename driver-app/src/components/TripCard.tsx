import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import StatusBadge from "./StatusBadge";
import { fmtCurrency, fmtDate } from "../utils/format";
import type { DriverTrip } from "../services/driverService";

interface Props {
  trip: DriverTrip;
  onPress: () => void;
}

const PRIMARY = "#1E2D8E";

export default function TripCard({ trip, onPress }: Props) {
  const isActive = trip.status === "in_progress";
  return (
    <TouchableOpacity
      style={[styles.card, isActive && styles.cardActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.top}>
        <View style={styles.iconBox}>
          <Ionicons
            name="car"
            size={20}
            color={isActive ? "#15803D" : PRIMARY}
          />
        </View>
        <View style={styles.info}>
          <Text style={styles.route} numberOfLines={1}>
            {trip.origin} → {trip.destination}
          </Text>
          <Text style={styles.reg}>
            {trip.vehicles?.registration_number ?? "—"}
          </Text>
        </View>
        <Text style={styles.freight}>{fmtCurrency(trip.freight_amount)}</Text>
      </View>

      <View style={styles.meta}>
        <StatusBadge status={trip.status} />
        <Text style={styles.date}>{fmtDate(trip.start_date)}</Text>
        {trip.material ? (
          <Text style={styles.metaText} numberOfLines={1}>
            {trip.material}
          </Text>
        ) : null}
        {trip.driver_advance && Number(trip.driver_advance) > 0 ? (
          <View style={styles.advBadge}>
            <Text style={styles.advText}>
              Adv {fmtCurrency(trip.driver_advance)}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  cardActive: {
    borderColor: "#86EFAC",
    backgroundColor: "#F0FFF4",
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#EEF0FB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  info: {
    flex: 1,
  },
  route: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  reg: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  freight: {
    fontSize: 15,
    fontWeight: "800",
    color: PRIMARY,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  date: {
    fontSize: 11,
    color: "#94A3B8",
  },
  metaText: {
    fontSize: 11,
    color: "#64748B",
  },
  advBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  advText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#92400E",
  },
});
