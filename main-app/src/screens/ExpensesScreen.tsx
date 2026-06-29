import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Modal, FlatList, ActivityIndicator, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { tripService } from "../services/tripService";
import type { Trip } from "../types";

const PRIMARY = "#1E2D8E";
const BG      = "#F5F6FA";
const CARD    = "#ffffff";
const TEXT    = "#1A1A2E";
const MUTED   = "#6B7280";
const BORDER  = "#E9EBF0";
const DANGER  = "#DC2626";
const SUCCESS = "#15803D";

function fmt(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const TYPE_LABEL: Record<string, string> = {
  fuel: "Fuel", toll: "Toll", rto: "RTO", police_challan: "Police / Naka",
  maintenance: "Parts & Repairs", tyre: "Tyre Repair", oil: "Oil",
  loading_unloading: "Loading / Unloading", driver_payment: "Driver Payment",
  telephone: "Telephone", other: "Other",
};

export default function ExpensesScreen() {
  const [trips,         setTrips]         = useState<Trip[]>([]);
  const [selectedId,    setSelectedId]    = useState<string | null>(null);
  const [tripDetails,   setTripDetails]   = useState<any | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [loadingExp,    setLoadingExp]    = useState(false);
  const [refreshing,    setRefreshing]    = useState(false);
  const [pickerOpen,    setPickerOpen]    = useState(false);

  const load = useCallback(async () => {
    const res = await tripService.getAll(200);
    if (res.success) setTrips(res.data ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const selectTrip = async (trip: Trip) => {
    setSelectedId(trip.id);
    setPickerOpen(false);
    setLoadingExp(true);
    const res = await tripService.getById(trip.id);
    if (res.success) setTripDetails(res.data);
    setLoadingExp(false);
  };

  const selectedTrip = trips.find(t => t.id === selectedId);

  const expenseRows: { type: string; amount: number; date: string; desc: string | null }[] =
    tripDetails ? [
      ...(tripDetails.expenses ?? []).map((e: any) => ({
        type: TYPE_LABEL[e.type] ?? e.type,
        amount: Number(e.amount),
        date: e.date,
        desc: e.description ?? null,
      })),
      ...(tripDetails.fuel_logs ?? []).map((f: any) => ({
        type: "Fuel",
        amount: Number(f.amount ?? (f.litres * f.rate_per_litre)),
        date: f.date,
        desc: f.litres ? `${f.litres}L` : null,
      })),
      ...(tripDetails.toll_logs ?? []).map((t: any) => ({
        type: "Toll",
        amount: Number(t.amount),
        date: t.date,
        desc: t.location ?? null,
      })),
      ...(tripDetails.misc_expenses ?? []).map((m: any) => ({
        type: TYPE_LABEL[m.category] ?? m.category ?? "Other",
        amount: Number(m.amount),
        date: m.date,
        desc: m.description ?? null,
      })),
    ] : [];

  const totalExp  = expenseRows.reduce((s, e) => s + e.amount, 0);
  const freight   = selectedTrip ? Number(selectedTrip.freight_amount) : 0;
  const profit    = freight - totalExp;
  const margin    = freight > 0 ? (profit / freight) * 100 : 0;

  if (loading) return <View style={s.center}><ActivityIndicator color={PRIMARY} size="large" /></View>;

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Trip Expenses</Text>
          <Text style={s.sub}>Consolidated trip P&L view</Text>
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.iconBtn}>
            <Ionicons name="notifications-outline" size={20} color={MUTED} />
          </TouchableOpacity>
          <TouchableOpacity style={s.searchBtn}>
            <Ionicons name="search-outline" size={15} color={MUTED} />
            <Text style={s.searchBtnText}>Search</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Info banner */}
      <View style={s.infoBanner}>
        <Ionicons name="information-circle-outline" size={18} color="#1E40AF" style={{ marginTop: 1 }} />
        <Text style={s.infoBannerText}>
          This is a <Text style={{ fontWeight: "700" }}>read-only view</Text>. To add or manage
          expenses, open the trip from the{" "}
          <Text style={{ fontWeight: "700", textDecorationLine: "underline" }}>Trips page</Text>
          {" "}— fuel, tolls, and other costs can be added there and will appear here automatically.
        </Text>
      </View>

      {/* Trip selector */}
      <View style={s.selectorSection}>
        <Text style={s.selectorLabel}>Select Trip</Text>
        <TouchableOpacity style={s.pickerBtn} onPress={() => setPickerOpen(true)}>
          <Text style={[s.pickerText, !selectedId && { color: MUTED }]} numberOfLines={1}>
            {selectedTrip
              ? `${selectedTrip.origin} → ${selectedTrip.destination}`
              : "— Choose a trip —"}
          </Text>
          <Ionicons name="chevron-down" size={16} color={MUTED} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
        showsVerticalScrollIndicator={false}
      >
        {!selectedId ? (
          <View style={s.empty}>
            <Ionicons name="git-branch-outline" size={48} color={MUTED} />
            <Text style={s.emptyText}>Select a trip above to view its expenses</Text>
          </View>
        ) : loadingExp ? (
          <ActivityIndicator color={PRIMARY} style={{ marginTop: 40 }} size="large" />
        ) : (
          <>
            {/* P&L Summary */}
            <View style={s.pnlGrid}>
              <PnLChip label="Revenue"  value={fmt(freight)}  bg="#EEF2FF" color={PRIMARY} />
              <PnLChip label="Expenses" value={fmt(totalExp)} bg="#FEF2F2" color={DANGER} />
              <PnLChip label="Profit"   value={fmt(profit)}   bg={profit >= 0 ? "#F0FDF4" : "#FEF2F2"} color={profit >= 0 ? SUCCESS : DANGER} />
              <PnLChip label="Margin"   value={`${margin.toFixed(1)}%`} bg={margin >= 10 ? "#F0FDF4" : "#FEF2F2"} color={margin >= 10 ? SUCCESS : DANGER} />
            </View>

            {/* Expense rows */}
            {expenseRows.length === 0 ? (
              <View style={s.emptySmall}>
                <Text style={s.emptySmallText}>No expenses logged for this trip.</Text>
              </View>
            ) : (
              <View style={s.expList}>
                {expenseRows.map((e, idx) => (
                  <View key={idx} style={[s.expRow, idx === expenseRows.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={s.expLeft}>
                      <Text style={s.expType}>{e.type}</Text>
                      {e.desc ? <Text style={s.expDesc}>{e.desc}</Text> : null}
                      <Text style={s.expDate}>{fmtDate(e.date)}</Text>
                    </View>
                    <Text style={s.expAmount}>₹{e.amount.toLocaleString("en-IN")}</Text>
                  </View>
                ))}
              </View>
            )}

            <Text style={s.footNote}>
              Expenses include trip-level costs (fuel, tolls, etc.) + standalone fuel fill-ups. Driver payments tracked separately in ledger.
            </Text>
          </>
        )}
      </ScrollView>

      {/* Trip picker modal */}
      <Modal visible={pickerOpen} transparent animationType="fade">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setPickerOpen(false)}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Select Trip</Text>
            <FlatList
              data={trips}
              keyExtractor={t => t.id}
              renderItem={({ item: t }) => (
                <TouchableOpacity
                  style={[s.sheetOption, t.id === selectedId && s.sheetOptionActive]}
                  onPress={() => selectTrip(t)}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[s.sheetOptionText, t.id === selectedId && { color: PRIMARY, fontWeight: "700" }]}
                      numberOfLines={1}
                    >
                      {t.origin} → {t.destination}
                    </Text>
                    <Text style={s.sheetOptionSub}>{t.driver_name} · {t.start_date}</Text>
                  </View>
                  {t.id === selectedId && <Ionicons name="checkmark" size={16} color={PRIMARY} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function PnLChip({ label, value, bg, color }: { label: string; value: string; bg: string; color: string }) {
  return (
    <View style={[pc.chip, { backgroundColor: bg }]}>
      <Text style={[pc.val, { color }]}>{value}</Text>
      <Text style={pc.lbl}>{label}</Text>
    </View>
  );
}

const pc = StyleSheet.create({
  chip: { flex: 1, borderRadius: 10, padding: 10, alignItems: "center" },
  val:  { fontSize: 14, fontWeight: "800" },
  lbl:  { fontSize: 10, color: MUTED, marginTop: 2 },
});

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: BG },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  header:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  title:         { fontSize: 22, fontWeight: "800", color: TEXT },
  sub:           { fontSize: 13, color: MUTED },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: CARD, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: BORDER },
  searchBtn:     { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: CARD, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: BORDER },
  searchBtnText: { fontSize: 13, color: MUTED },

  infoBanner:     { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "#EFF6FF", borderRadius: 12, marginHorizontal: 16, marginBottom: 8, padding: 12, borderWidth: 1, borderColor: "#BFDBFE" },
  infoBannerText: { fontSize: 13, color: "#1E40AF", flex: 1, lineHeight: 18 },

  selectorSection: { paddingHorizontal: 16, paddingBottom: 10 },
  selectorLabel:   { fontSize: 14, fontWeight: "600", color: TEXT, marginBottom: 6 },
  pickerBtn:       { backgroundColor: CARD, borderRadius: 10, borderWidth: 1, borderColor: BORDER, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pickerText:      { fontSize: 14, color: TEXT, flex: 1, marginRight: 8 },

  content:       { padding: 16, gap: 12, paddingBottom: 40 },
  empty:         { alignItems: "center", justifyContent: "center", paddingVertical: 80, gap: 12 },
  emptyText:     { fontSize: 14, color: MUTED, textAlign: "center" },
  emptySmall:    { alignItems: "center", paddingVertical: 24 },
  emptySmallText:{ fontSize: 13, color: MUTED },

  pnlGrid: { flexDirection: "row", gap: 8 },

  expList:   { backgroundColor: CARD, borderRadius: 12, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  expRow:    { flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: 1, borderBottomColor: BORDER, gap: 12 },
  expLeft:   { flex: 1 },
  expType:   { fontSize: 14, fontWeight: "700", color: TEXT },
  expDesc:   { fontSize: 12, color: MUTED, marginTop: 1 },
  expDate:   { fontSize: 11, color: MUTED, marginTop: 2 },
  expAmount: { fontSize: 15, fontWeight: "800", color: TEXT },
  footNote:  { fontSize: 11, color: MUTED, textAlign: "center", lineHeight: 16 },

  overlay:         { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet:           { backgroundColor: CARD, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "60%" as any },
  sheetTitle:      { fontSize: 16, fontWeight: "700", color: TEXT, marginBottom: 16, textAlign: "center" },
  sheetOption:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  sheetOptionActive:{ backgroundColor: "#F0F4FF" },
  sheetOptionText: { fontSize: 14, color: TEXT },
  sheetOptionSub:  { fontSize: 11, color: MUTED, marginTop: 2 },
});
