import {
  Document, Page, Text, View, StyleSheet, pdf,
} from "@react-pdf/renderer";

const BLUE  = "#1E2D8E";
const GREY  = "#666666";
const LIGHT = "#f0f3ff";
const GREEN = "#2e7d32";
const RED   = "#c62828";

const styles = StyleSheet.create({
  page:    { fontFamily: "Helvetica", fontSize: 10, padding: 36, color: "#1a1a2e" },
  header:  { backgroundColor: BLUE, padding: "14 18", marginBottom: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orgName: { color: "white", fontSize: 16, fontFamily: "Helvetica-Bold" },
  docMeta: { color: "#c9cfe8", fontSize: 9, textAlign: "right" },
  title:   { color: "white", fontSize: 11, fontFamily: "Helvetica-Bold", textAlign: "right" },

  routeBox:   { backgroundColor: LIGHT, padding: "10 14", marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  routeText:  { fontSize: 13, fontFamily: "Helvetica-Bold", color: BLUE },
  routeArrow: { fontSize: 13, color: GREY },

  section:    { marginBottom: 12 },
  sectionHdr: { backgroundColor: BLUE, color: "white", fontFamily: "Helvetica-Bold", fontSize: 8.5, padding: "4 10", marginBottom: 0, textTransform: "uppercase", letterSpacing: 1 },
  row:        { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e8eaf6", padding: "5 10" },
  rowAlt:     { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e8eaf6", padding: "5 10", backgroundColor: "#fafbff" },
  label:      { width: "40%", color: GREY, fontSize: 9 },
  value:      { flex: 1, fontFamily: "Helvetica-Bold", fontSize: 9 },

  expRow:     { flexDirection: "row", padding: "5 10", borderBottomWidth: 0.5, borderBottomColor: "#f0f0f8" },
  expRowAlt:  { flexDirection: "row", padding: "5 10", borderBottomWidth: 0.5, borderBottomColor: "#f0f0f8", backgroundColor: "#fafbff" },
  expLabel:   { flex: 1, fontSize: 9 },
  expAmt:     { width: 80, textAlign: "right", fontFamily: "Helvetica-Bold", fontSize: 9 },

  totalRow:   { flexDirection: "row", padding: "7 10", backgroundColor: BLUE },
  totalLabel: { flex: 1, color: "white", fontFamily: "Helvetica-Bold", fontSize: 10 },
  totalAmt:   { color: "white", fontFamily: "Helvetica-Bold", fontSize: 10 },

  profitBox:  { margin: "10 0", padding: "10 14", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footer:     { marginTop: 20, borderTopWidth: 0.5, borderTopColor: "#e0e0e0", paddingTop: 8, color: GREY, fontSize: 8, textAlign: "center" },
});

const fmt  = (n: number) => "₹" + Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const fmtD = (s?: string | null) => s ? new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const EXP_LABELS: Record<string, string> = {
  fuel: "Fuel (HSD)", toll: "Toll / FASTag", rto: "RTO",
  police_challan: "Police / Naka", maintenance: "Parts & Repairs",
  tyre: "Tyre Repair", oil: "Oil", loading_unloading: "Loading / Unloading",
  driver_payment: "Driver Payment", telephone: "Telephone", other: "Other",
};

export interface TripPdfData {
  orgName:    string;
  trip:       any;
  detail:     any;
  vehicleReg: string;
  showProfit: boolean;
  expTypes:   string[]; // ["all"] or specific categories
}

function TripSheet({ data }: { data: TripPdfData }) {
  const { orgName, trip, detail, vehicleReg, showProfit, expTypes } = data;

  const allExpenses: any[] = detail?.expenses || [];
  const filtered = expTypes.includes("all") || expTypes.length === 0
    ? allExpenses
    : allExpenses.filter((e: any) => expTypes.includes(e.expense_type));

  const freight     = parseFloat(trip.freight_amount || 0);
  const totalExpAmt = filtered.reduce((s: number, e: any) => s + parseFloat(e.amount || 0), 0);
  const profit      = freight - totalExpAmt;

  const detailRows = [
    { label: "Vehicle",         value: vehicleReg },
    { label: "Driver",          value: `${trip.driver_name || "—"}${trip.driver_phone ? `  |  ${trip.driver_phone}` : ""}` },
    { label: "Start Date",      value: fmtD(trip.start_date) },
    { label: "End Date",        value: fmtD(trip.end_date) },
    { label: "Distance",        value: trip.distance_km ? `${trip.distance_km} km` : "—" },
    { label: "LR / Doc No.",    value: trip.doc_number || "—" },
    { label: "Material",        value: trip.material || "—" },
    { label: "Weight",          value: trip.weight_tonnes ? `${trip.weight_tonnes} tonnes` : "—" },
  ].filter(r => r.value !== "—");

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.orgName}>{orgName}</Text>
          <View>
            <Text style={styles.title}>TRIP SHEET</Text>
            {trip.doc_number && <Text style={styles.docMeta}>LR: {trip.doc_number}</Text>}
            <Text style={styles.docMeta}>{new Date().toLocaleDateString("en-IN")}</Text>
          </View>
        </View>

        {/* Route */}
        <View style={styles.routeBox}>
          <Text style={styles.routeText}>{trip.origin}</Text>
          <Text style={styles.routeArrow}> → </Text>
          <Text style={styles.routeText}>{trip.destination}</Text>
        </View>

        {/* Trip Details */}
        <View style={styles.section}>
          <Text style={styles.sectionHdr}>Trip Details</Text>
          {detailRows.map((r, i) => (
            <View key={r.label} style={i % 2 === 0 ? styles.row : styles.rowAlt}>
              <Text style={styles.label}>{r.label}</Text>
              <Text style={styles.value}>{r.value}</Text>
            </View>
          ))}
        </View>

        {/* Charges */}
        <View style={styles.section}>
          <Text style={styles.sectionHdr}>Charges</Text>

          {/* Freight */}
          <View style={styles.row}>
            <Text style={styles.label}>Freight Amount</Text>
            <Text style={styles.value}>{fmt(freight)}</Text>
          </View>

          {/* Expenses */}
          {filtered.length > 0 && (
            <View>
              {filtered.map((e: any, i: number) => (
                <View key={e.id || i} style={i % 2 === 0 ? styles.expRow : styles.expRowAlt}>
                  <Text style={styles.expLabel}>
                    {EXP_LABELS[e.expense_type] || e.expense_type}
                    {e.description ? `  — ${e.description}` : ""}
                  </Text>
                  <Text style={styles.expAmt}>{fmt(parseFloat(e.amount || 0))}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Total expenses */}
          {filtered.length > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Expenses</Text>
              <Text style={styles.totalAmt}>{fmt(totalExpAmt)}</Text>
            </View>
          )}
        </View>

        {/* Net Profit */}
        {showProfit && (
          <View style={[styles.profitBox, { backgroundColor: profit >= 0 ? "#e8f5e9" : "#fce4ec" }]}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11, color: profit >= 0 ? GREEN : RED }}>
              Net {profit >= 0 ? "Profit" : "Loss"}
            </Text>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 13, color: profit >= 0 ? GREEN : RED }}>
              {profit < 0 ? "−" : ""}{fmt(Math.abs(profit))}
            </Text>
          </View>
        )}

        {/* Notes */}
        {trip.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionHdr}>Notes</Text>
            <View style={styles.row}>
              <Text style={{ fontSize: 9, color: GREY }}>{trip.notes}</Text>
            </View>
          </View>
        )}

        <Text style={styles.footer}>
          Generated by FleetSure  •  {new Date().toLocaleString("en-IN")}
        </Text>
      </Page>
    </Document>
  );
}

export async function downloadTripPdf(data: TripPdfData): Promise<void> {
  const blob = await pdf(<TripSheet data={data} />).toBlob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `tripsheet_${data.trip.origin}_${data.trip.destination}.pdf`.replace(/\s+/g, "_");
  a.click();
  URL.revokeObjectURL(url);
}
