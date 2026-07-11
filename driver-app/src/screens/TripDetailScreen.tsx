import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { useAuth } from "../context/AuthContext";
import { driverService, TripDetail } from "../services/driverService";
import StatusBadge from "../components/StatusBadge";
import { fmtCurrency, fmtDate, todayISO } from "../utils/format";
import type { TripsStackParamList } from "../navigation";

const PRIMARY = "#1E2D8E";

type Route = RouteProp<TripsStackParamList, "TripDetail">;
type Nav = NativeStackNavigationProp<TripsStackParamList, "TripDetail">;

type ExpTab = "fuel" | "toll" | "misc" | "other";

const MISC_CATS = ["Tyre", "Repair", "Parking", "Cleaning", "Loading", "Unloading", "Other"];
const OTHER_CATS = ["Driver Expense", "Food", "Lodging", "Document", "Police", "Weighbridge", "Other"];

// Categories for the advance-reconciliation claim flow below — distinct
// from the generic MISC_CATS/OTHER_CATS above (this is driver_expenses, not
// misc_expenses).
const CLAIM_CATS: { value: "fuel" | "food" | "loading" | "other"; label: string }[] = [
  { value: "fuel", label: "Fuel" },
  { value: "food", label: "Food" },
  { value: "loading", label: "Loading" },
  { value: "other", label: "Other" },
];
const CLAIM_STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  pending: { bg: "#FFF7ED", color: "#E65100" },
  approved: { bg: "#F0FDF4", color: "#15803D" },
  rejected: { bg: "#FEF2F2", color: "#DC2626" },
};

export default function TripDetailScreen() {
  const { driver } = useAuth();
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { tripId } = route.params;

  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [showExpForm, setShowExpForm] = useState(false);
  const [expTab, setExpTab] = useState<ExpTab>("fuel");
  const [saving, setSaving] = useState(false);

  // Advance-reconciliation expense claims (driver_expenses)
  const [claims, setClaims] = useState<any[]>([]);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [claimAmount, setClaimAmount] = useState("");
  const [claimCategory, setClaimCategory] = useState<"fuel" | "food" | "loading" | "other">("fuel");
  const [claimNote, setClaimNote] = useState("");
  const [claimImageUri, setClaimImageUri] = useState<string | null>(null);
  const [savingClaim, setSavingClaim] = useState(false);

  // Expense form state
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState("");
  const [litres, setLitres] = useState("");
  const [odometer, setOdometer] = useState("");
  const [station, setStation] = useState("");
  const [tollPlaza, setTollPlaza] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [category, setCategory] = useState(MISC_CATS[0]);
  const [description, setDescription] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [tripRes, claimsRes] = await Promise.all([
      driverService.getTripById(tripId, driver?.id),
      driverService.getMyDriverExpenses(tripId),
    ]);
    if (tripRes.success) setTrip(tripRes.data ?? null);
    if (claimsRes.success) setClaims(claimsRes.data ?? []);
    setLoading(false);
  }, [tripId, driver?.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleStart() {
    if (!trip) return;
    setStatusBusy(true);
    await driverService.updateTripStatus(trip.id, "in_progress");
    await load();
    setStatusBusy(false);
  }

  async function handleComplete() {
    if (!trip) return;
    // Goes to pending_review, not completed — the owner confirms on the web
    // app before it's final. Keeps a driver from being able to unilaterally
    // close out a trip.
    Alert.alert("Mark as Delivered?", "The owner will need to confirm this trip before it's marked completed.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Mark Delivered",
        style: "default",
        onPress: async () => {
          setStatusBusy(true);
          await driverService.updateTripStatus(trip.id, "pending_review", {
            end_date: todayISO(),
          });
          await load();
          setStatusBusy(false);
        },
      },
    ]);
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  }

  function resetExpenseForm() {
    setDate(todayISO());
    setAmount("");
    setLitres("");
    setOdometer("");
    setStation("");
    setTollPlaza("");
    setPaymentMode("cash");
    setCategory(MISC_CATS[0]);
    setDescription("");
    setImageUri(null);
    setShowExpForm(false);
  }

  async function handleSaveExpense() {
    if (!trip || !driver || !amount) return;
    setSaving(true);
    try {
      let imgUrl: string | null = null;
      if (imageUri) {
        const uploadRes = await driverService.uploadExpenseImage(
          imageUri, driver.id, trip.id
        );
        if (uploadRes.success) imgUrl = uploadRes.data ?? null;
      }

      if (expTab === "fuel") {
        await driverService.addFuelLog(trip.id, trip.owner_id, trip.vehicle_id, {
          date,
          litres: litres ? Number(litres) : 0,
          amount: Number(amount),
          odometer_km: odometer ? Number(odometer) : null,
          fuel_station: station || null,
          image_url: imgUrl,
        });
      } else if (expTab === "toll") {
        await driverService.addTollLog(trip.id, trip.owner_id, trip.vehicle_id, {
          date,
          amount: Number(amount),
          toll_plaza: tollPlaza || null,
          payment_mode: paymentMode,
        });
      } else {
        await driverService.addMiscExpense(trip.id, trip.owner_id, trip.vehicle_id, {
          date,
          amount: Number(amount),
          category: category.toLowerCase().replace(/ /g, "_"),
          description: description || null,
          image_url: imgUrl,
        });
      }

      resetExpenseForm();
      await load();
    } catch {
      Alert.alert("Error", "Failed to save expense. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function pickClaimImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setClaimImageUri(result.assets[0].uri);
    }
  }

  function resetClaimForm() {
    setClaimAmount("");
    setClaimCategory("fuel");
    setClaimNote("");
    setClaimImageUri(null);
    setShowClaimForm(false);
  }

  async function handleSubmitClaim() {
    if (!trip || !driver || !claimAmount) return;
    setSavingClaim(true);
    try {
      let receiptUrl: string | null = null;
      if (claimImageUri) {
        const uploadRes = await driverService.uploadExpenseImage(claimImageUri, driver.id, trip.id);
        if (uploadRes.success) receiptUrl = uploadRes.data ?? null;
      }
      await driverService.addDriverExpense(trip.id, driver.id, trip.owner_id, {
        amount: Number(claimAmount),
        category: claimCategory,
        note: claimNote || null,
        receipt_url: receiptUrl,
      });
      resetClaimForm();
      await load();
    } catch {
      Alert.alert("Error", "Failed to submit expense claim. Please try again.");
    } finally {
      setSavingClaim(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={PRIMARY} size="large" />
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color="#CBD5E1" />
        <Text style={{ color: "#64748B", fontSize: 15, fontWeight: "600", marginTop: 12, marginBottom: 20 }}>
          Could not load trip details
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: PRIMARY, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 }}
          onPress={() => { setLoading(true); load(); }}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Merge all expenses
  const allExpenses = [
    ...trip.fuel_logs.map((f) => ({
      id: f.id,
      type: "Fuel",
      amount: f.amount,
      date: f.date,
      detail: `${f.litres ? f.litres + "L" : ""}${f.fuel_station ? " · " + f.fuel_station : ""}`,
      color: "#EA580C",
    })),
    ...trip.toll_logs.map((t) => ({
      id: t.id,
      type: "Toll",
      amount: t.amount,
      date: t.date,
      detail: t.toll_plaza ?? "",
      color: "#7C3AED",
    })),
    ...trip.misc_expenses.map((m) => ({
      id: m.id,
      type: m.category,
      amount: m.amount,
      date: m.date,
      detail: m.description ?? "",
      color: "#0891B2",
    })),
    ...trip.expenses.map((e) => ({
      id: e.id,
      type: e.expense_type,
      amount: e.amount,
      date: e.date,
      detail: e.description ?? "",
      color: "#64748B",
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const totalExp = allExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const freight = Number(trip.freight_amount ?? 0);
  const profit = freight - totalExp;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trip Detail</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <Text style={styles.summaryReg}>
              {trip.vehicles?.registration_number ?? "—"}
            </Text>
            <StatusBadge status={trip.status} />
          </View>
          <Text style={styles.summaryRoute}>
            {trip.origin} → {trip.destination}
          </Text>
          <View style={styles.summaryStats}>
            {[
              { label: "Freight", value: fmtCurrency(freight) },
              { label: "Advance", value: fmtCurrency(trip.driver_advance ?? 0) },
              { label: "Expenses", value: fmtCurrency(totalExp) },
            ].map((s) => (
              <View key={s.label} style={styles.summaryStat}>
                <Text style={styles.summaryStatVal}>{s.value}</Text>
                <Text style={styles.summaryStatLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.summaryMeta}>
            <Text style={styles.summaryMetaText}>
              {fmtDate(trip.start_date)}
              {trip.end_date ? ` → ${fmtDate(trip.end_date)}` : ""}
            </Text>
            {trip.material ? (
              <Text style={styles.summaryMetaText}>{trip.material}</Text>
            ) : null}
            {trip.distance_km ? (
              <Text style={styles.summaryMetaText}>{trip.distance_km} km</Text>
            ) : null}
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          {trip.status === "planned" && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.startBtn]}
              onPress={handleStart}
              disabled={statusBusy}
            >
              {statusBusy ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text style={styles.actionBtnText}>▶ Start Trip</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          {trip.status === "in_progress" && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.completeBtn]}
              onPress={handleComplete}
              disabled={statusBusy}
            >
              {statusBusy ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.actionBtnText}>✓ Mark as Delivered</Text>
              )}
            </TouchableOpacity>
          )}
          {trip.status === "pending_review" && (
            <View style={[styles.completedNote, { backgroundColor: "#F3E8FF" }]}>
              <Ionicons name="time-outline" size={16} color="#7E22CE" />
              <Text style={[styles.completedNoteText, { color: "#7E22CE" }]}>Awaiting owner confirmation</Text>
            </View>
          )}
          {trip.status === "completed" && (
            <View style={styles.completedNote}>
              <Ionicons name="checkmark-circle" size={16} color="#15803D" />
              <Text style={styles.completedNoteText}>Trip Completed</Text>
            </View>
          )}
        </View>

        {/* P&L row */}
        <View style={[styles.pnlRow, { borderColor: profit >= 0 ? "#86EFAC" : "#FCA5A5" }]}>
          <Text style={styles.pnlLabel}>
            Net {profit >= 0 ? "Profit" : "Loss"}
          </Text>
          <Text style={[styles.pnlValue, { color: profit >= 0 ? "#15803D" : "#DC2626" }]}>
            {profit < 0 ? "− " : ""}
            {fmtCurrency(Math.abs(profit))}
          </Text>
        </View>

        {/* Trip Advance & Expenses — claim-and-approve flow against the trip's
            driver_advance, distinct from the generic expense log below. */}
        {Number(trip.driver_advance ?? 0) > 0 && (
          <View style={styles.claimsCard}>
            <View style={styles.claimsHeaderRow}>
              <Text style={styles.claimsTitle}>Trip Advance & Expenses</Text>
              <Text style={styles.claimsAdvance}>{fmtCurrency(trip.driver_advance ?? 0)} advance</Text>
            </View>

            {claims.length > 0 ? (
              <View style={{ marginBottom: 10 }}>
                {claims.map((c) => {
                  const s = CLAIM_STATUS_STYLE[c.status] ?? CLAIM_STATUS_STYLE.pending;
                  return (
                    <View key={c.id} style={styles.claimRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.claimCategory}>{c.category}</Text>
                        {c.note ? <Text style={styles.claimNote} numberOfLines={1}>{c.note}</Text> : null}
                      </View>
                      <Text style={styles.claimAmount}>{fmtCurrency(c.amount)}</Text>
                      <View style={[styles.claimStatusPill, { backgroundColor: s.bg }]}>
                        <Text style={[styles.claimStatusText, { color: s.color }]}>{c.status}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.noExpensesText}>No expense claims submitted yet.</Text>
            )}

            {trip.status !== "cancelled" && !showClaimForm && (
              <TouchableOpacity style={styles.addClaimTrigger} onPress={() => setShowClaimForm(true)}>
                <Ionicons name="add-circle-outline" size={18} color={PRIMARY} />
                <Text style={styles.addExpTriggerText}>+ Add Expense Claim</Text>
              </TouchableOpacity>
            )}

            {showClaimForm && (
              <View style={{ marginTop: 6 }}>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>AMOUNT (₹) *</Text>
                  <TextInput style={styles.formInput} value={claimAmount} onChangeText={setClaimAmount} keyboardType="numeric" placeholder="0" />
                </View>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>CATEGORY</Text>
                  <View style={styles.catRow}>
                    {CLAIM_CATS.map((c) => (
                      <TouchableOpacity
                        key={c.value}
                        style={[styles.catBtn, claimCategory === c.value && styles.catBtnActive]}
                        onPress={() => setClaimCategory(c.value)}
                      >
                        <Text style={[styles.catBtnText, claimCategory === c.value && styles.catBtnTextActive]}>{c.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>NOTE</Text>
                  <TextInput
                    style={[styles.formInput, { height: 60 }]}
                    value={claimNote}
                    onChangeText={setClaimNote}
                    placeholder="Optional note..."
                    multiline
                  />
                </View>
                <TouchableOpacity style={styles.imgPicker} onPress={pickClaimImage}>
                  <Ionicons name="camera-outline" size={18} color="#64748B" />
                  <Text style={styles.imgPickerText}>
                    {claimImageUri ? "Receipt selected ✓" : "Attach Receipt (optional)"}
                  </Text>
                </TouchableOpacity>
                {claimImageUri ? <Image source={{ uri: claimImageUri }} style={styles.imgPreview} /> : null}
                <View style={styles.formActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={resetClaimForm}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, !claimAmount && styles.saveBtnDisabled]}
                    onPress={handleSubmitClaim}
                    disabled={savingClaim || !claimAmount}
                  >
                    {savingClaim ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Submit for Review</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Add Expense */}
        {trip.status !== "cancelled" && (
          <TouchableOpacity
            style={styles.addExpTrigger}
            onPress={() => setShowExpForm((v) => !v)}
          >
            <Ionicons name="add-circle-outline" size={20} color={PRIMARY} />
            <Text style={styles.addExpTriggerText}>
              {showExpForm ? "Cancel" : "+ Add Expense"}
            </Text>
          </TouchableOpacity>
        )}

        {/* Expense form */}
        {showExpForm && (
          <View style={styles.expForm}>
            {/* Expense tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.expTabScroll}>
              <View style={styles.expTabRow}>
                {(["fuel", "toll", "misc", "other"] as ExpTab[]).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.expTab, expTab === t && styles.expTabActive]}
                    onPress={() => setExpTab(t)}
                  >
                    <Text style={[styles.expTabText, expTab === t && styles.expTabTextActive]}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Date */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>DATE</Text>
              <TextInput
                style={styles.formInput}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
              />
            </View>

            {/* Amount */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>AMOUNT (₹) *</Text>
              <TextInput
                style={styles.formInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>

            {/* Tab-specific fields */}
            {expTab === "fuel" && (
              <>
                <View style={styles.formRow}>
                  <View style={[styles.formField, { flex: 1 }]}>
                    <Text style={styles.formLabel}>LITRES</Text>
                    <TextInput style={styles.formInput} value={litres} onChangeText={setLitres} keyboardType="numeric" placeholder="0" />
                  </View>
                  <View style={[styles.formField, { flex: 1 }]}>
                    <Text style={styles.formLabel}>ODOMETER (km)</Text>
                    <TextInput style={styles.formInput} value={odometer} onChangeText={setOdometer} keyboardType="numeric" placeholder="0" />
                  </View>
                </View>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>FUEL STATION</Text>
                  <TextInput style={styles.formInput} value={station} onChangeText={setStation} placeholder="Optional" />
                </View>
              </>
            )}

            {expTab === "toll" && (
              <>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>TOLL PLAZA</Text>
                  <TextInput style={styles.formInput} value={tollPlaza} onChangeText={setTollPlaza} placeholder="Optional" />
                </View>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>PAYMENT MODE</Text>
                  <View style={styles.payModeRow}>
                    {["cash", "fastag", "upi"].map((m) => (
                      <TouchableOpacity
                        key={m}
                        style={[styles.payModeBtn, paymentMode === m && styles.payModeBtnActive]}
                        onPress={() => setPaymentMode(m)}
                      >
                        <Text style={[styles.payModeBtnText, paymentMode === m && styles.payModeBtnTextActive]}>
                          {m.charAt(0).toUpperCase() + m.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            )}

            {(expTab === "misc" || expTab === "other") && (
              <>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>CATEGORY</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.catRow}>
                      {(expTab === "misc" ? MISC_CATS : OTHER_CATS).map((c) => (
                        <TouchableOpacity
                          key={c}
                          style={[styles.catBtn, category === c && styles.catBtnActive]}
                          onPress={() => setCategory(c)}
                        >
                          <Text style={[styles.catBtnText, category === c && styles.catBtnTextActive]}>
                            {c}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>NOTES</Text>
                  <TextInput
                    style={[styles.formInput, { height: 70 }]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Optional description..."
                    multiline
                  />
                </View>
              </>
            )}

            {/* Image picker */}
            <TouchableOpacity style={styles.imgPicker} onPress={pickImage}>
              <Ionicons name="camera-outline" size={18} color="#64748B" />
              <Text style={styles.imgPickerText}>
                {imageUri ? "Photo selected ✓" : "Attach Receipt (optional)"}
              </Text>
            </TouchableOpacity>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.imgPreview} />
            ) : null}

            {/* Save / Cancel */}
            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={resetExpenseForm}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, !amount && styles.saveBtnDisabled]}
                onPress={handleSaveExpense}
                disabled={saving || !amount}
              >
                {saving ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Expense</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Expenses list */}
        {allExpenses.length > 0 ? (
          <View style={styles.expList}>
            <Text style={styles.expListTitle}>
              Expenses ({allExpenses.length})
            </Text>
            {allExpenses.map((e, i) => (
              <View key={`${e.id}-${i}`} style={styles.expItem}>
                <View style={[styles.expIconBox, { backgroundColor: e.color + "22" }]}>
                  <Text style={[styles.expIconText, { color: e.color }]}>
                    {e.type.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.expItemInfo}>
                  <Text style={styles.expItemType}>{e.type}</Text>
                  {e.detail ? (
                    <Text style={styles.expItemDetail} numberOfLines={1}>
                      {e.detail}
                    </Text>
                  ) : null}
                  <Text style={styles.expItemDate}>{fmtDate(e.date)}</Text>
                </View>
                <Text style={[styles.expItemAmount, { color: e.color }]}>
                  {fmtCurrency(e.amount)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.noExpenses}>
            <Text style={styles.noExpensesText}>No expenses logged yet</Text>
          </View>
        )}

        {/* Notes */}
        {trip.notes ? (
          <View style={styles.notesCard}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{trip.notes}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F0F4FF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F0F4FF" },
  header: {
    backgroundColor: PRIMARY,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "white" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  summaryCard: {
    backgroundColor: PRIMARY,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },
  summaryTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  summaryReg: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.8)" },
  summaryRoute: { fontSize: 18, fontWeight: "800", color: "white", marginBottom: 14, letterSpacing: -0.3 },
  summaryStats: { flexDirection: "row", gap: 10, marginBottom: 12 },
  summaryStat: { flex: 1, alignItems: "center" },
  summaryStatVal: { fontSize: 15, fontWeight: "800", color: "white" },
  summaryStatLabel: { fontSize: 10, color: "rgba(255,255,255,0.65)", marginTop: 2 },
  summaryMeta: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  summaryMetaText: { fontSize: 11, color: "rgba(255,255,255,0.65)" },
  actionRow: { marginBottom: 12 },
  actionBtn: { borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  startBtn: { backgroundColor: "#059669" },
  completeBtn: { backgroundColor: "#1E293B" },
  actionBtnText: { color: "white", fontSize: 15, fontWeight: "700" },
  completedNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    padding: 10,
  },
  completedNoteText: { color: "#15803D", fontWeight: "700", fontSize: 14 },
  pnlRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1.5,
  },
  pnlLabel: { fontSize: 13, fontWeight: "700", color: "#334155" },
  pnlValue: { fontSize: 18, fontWeight: "900" },
  claimsCard: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  claimsHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  claimsTitle: { fontSize: 13, fontWeight: "700", color: "#334155" },
  claimsAdvance: { fontSize: 12, fontWeight: "700", color: "#E65100" },
  claimRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  claimCategory: { fontSize: 12.5, fontWeight: "700", color: "#1E293B", textTransform: "capitalize" },
  claimNote: { fontSize: 11, color: "#94A3B8", marginTop: 1 },
  claimAmount: { fontSize: 13, fontWeight: "800", color: "#1E293B" },
  claimStatusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  claimStatusText: { fontSize: 10, fontWeight: "700", textTransform: "capitalize" },
  addClaimTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: `${PRIMARY}44`,
    borderStyle: "dashed",
    borderRadius: 10,
    paddingVertical: 11,
    justifyContent: "center",
  },
  addExpTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: `${PRIMARY}44`,
    borderStyle: "dashed",
    borderRadius: 10,
    paddingVertical: 12,
    justifyContent: "center",
    marginBottom: 14,
    backgroundColor: "white",
  },
  addExpTriggerText: { color: PRIMARY, fontSize: 14, fontWeight: "700" },
  expForm: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  expTabScroll: { marginBottom: 12 },
  expTabRow: { flexDirection: "row", gap: 6 },
  expTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  expTabActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  expTabText: { fontSize: 12, fontWeight: "600", color: "#64748B" },
  expTabTextActive: { color: "white" },
  formField: { marginBottom: 10 },
  formRow: { flexDirection: "row", gap: 10 },
  formLabel: { fontSize: 10, fontWeight: "700", color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 },
  formInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 14,
    backgroundColor: "#F8FAFC",
    color: "#1E293B",
  },
  payModeRow: { flexDirection: "row", gap: 8 },
  payModeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  payModeBtnActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  payModeBtnText: { fontSize: 12, fontWeight: "600", color: "#64748B" },
  payModeBtnTextActive: { color: "white" },
  catRow: { flexDirection: "row", gap: 6, paddingVertical: 2 },
  catBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  catBtnActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  catBtnText: { fontSize: 12, fontWeight: "600", color: "#64748B" },
  catBtnTextActive: { color: "white" },
  imgPicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  imgPickerText: { fontSize: 13, color: "#64748B" },
  imgPreview: { width: "100%", height: 100, borderRadius: 8, marginBottom: 10, resizeMode: "cover" },
  formActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: "center",
  },
  cancelBtnText: { color: "#64748B", fontWeight: "600" },
  saveBtn: {
    flex: 2,
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: "center",
  },
  saveBtnDisabled: { backgroundColor: "#C7D2FE" },
  saveBtnText: { color: "white", fontWeight: "700" },
  expList: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  expListTitle: { fontSize: 13, fontWeight: "700", color: "#334155", marginBottom: 12 },
  expItem: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  expIconBox: { width: 36, height: 36, borderRadius: 8, justifyContent: "center", alignItems: "center", marginRight: 10 },
  expIconText: { fontSize: 10, fontWeight: "800" },
  expItemInfo: { flex: 1 },
  expItemType: { fontSize: 13, fontWeight: "600", color: "#1E293B", textTransform: "capitalize" },
  expItemDetail: { fontSize: 11, color: "#94A3B8", marginTop: 1 },
  expItemDate: { fontSize: 11, color: "#CBD5E1", marginTop: 1 },
  expItemAmount: { fontSize: 14, fontWeight: "800" },
  noExpenses: { padding: 20, alignItems: "center" },
  noExpensesText: { color: "#94A3B8", fontSize: 13 },
  notesCard: { backgroundColor: "#FEFCE8", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#FDE68A" },
  notesLabel: { fontSize: 11, fontWeight: "700", color: "#92400E", marginBottom: 4 },
  notesText: { fontSize: 13, color: "#78350F", lineHeight: 19 },
});
