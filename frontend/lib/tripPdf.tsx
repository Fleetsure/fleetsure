const EXP_LABELS: Record<string, string> = {
  fuel: "Fuel (HSD)", toll: "Toll / FASTag", rto: "RTO",
  police_challan: "Police / Naka", maintenance: "Parts & Repairs",
  tyre: "Tyre Repair", oil: "Oil", loading_unloading: "Loading / Unloading",
  driver_payment: "Driver Payment", telephone: "Telephone", other: "Other",
};

export interface TripPdfData {
  orgName:    string;
  orgLogo?:   string; // base64 data URL or regular URL from localStorage "orgLogo"
  trip:       any;
  detail:     any;
  vehicleReg: string;
  showProfit: boolean;
  expTypes:   string[]; // ["all"] or specific categories
}

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmt(n: number): string {
  return "₹" + Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function fmtD(s?: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function or(v: any): string {
  return (v !== undefined && v !== null && v !== "") ? String(v) : "—";
}

function buildHtml(data: TripPdfData): string {
  const { orgName, orgLogo, trip, detail, vehicleReg, showProfit, expTypes } = data;

  const allExp: any[] = detail?.expenses || [];
  const filtered = expTypes.includes("all") || expTypes.length === 0
    ? allExp
    : allExp.filter((e: any) => expTypes.includes(e.expense_type));

  const freight     = parseFloat(trip.freight_amount || 0);
  const totalExpAmt = filtered.reduce((s: number, e: any) => s + parseFloat(e.amount || 0), 0);
  const profit      = freight - totalExpAmt;
  const now         = new Date().toLocaleString("en-IN");

  const detailRows: [string, string][] = [
    ["Vehicle",      or(vehicleReg)],
    ["Driver",       trip.driver_name
      ? `${trip.driver_name}${trip.driver_phone ? "  |  " + trip.driver_phone : ""}` : "—"],
    ["Start Date",   fmtD(trip.start_date)],
    ["End Date",     fmtD(trip.end_date)],
    ["Distance",     trip.distance_km ? `${trip.distance_km} km` : "—"],
    ["LR / Doc No.", or(trip.doc_number)],
    ["Material",     or(trip.material)],
    ["Weight",       trip.weight_tonnes ? `${trip.weight_tonnes} tonnes` : "—"],
  ];

  const rowsHtml = detailRows.map(([label, value], i) =>
    `<div class="row${i % 2 === 1 ? " alt" : ""}">` +
    `<div class="lbl">${esc(label)}</div>` +
    `<div class="val">${esc(value)}</div>` +
    `</div>`
  ).join("\n");

  const expRowsHtml = filtered.map((e: any, i: number) => {
    const label = EXP_LABELS[e.expense_type] || e.expense_type || "Expense";
    const desc  = e.description ? ` — ${e.description}` : "";
    return (
      `<div class="exp-row${i % 2 === 1 ? " alt" : ""}">` +
      `<div class="exp-lbl">${esc(label + desc)}</div>` +
      `<div class="exp-amt">${fmt(parseFloat(e.amount || 0))}</div>` +
      `</div>`
    );
  }).join("\n");

  const expSection = filtered.length > 0 ? `
  <div class="section">
    <div class="shdr">Expenses</div>
    ${expRowsHtml}
    <div class="total-row">
      <div class="total-lbl">Total Expenses</div>
      <div class="total-amt">${fmt(totalExpAmt)}</div>
    </div>
  </div>` : "";

  const profitSection = showProfit ? `
  <div class="profit-box" style="background:${profit >= 0 ? "#e8f5e9" : "#fce4ec"}">
    <div style="font-size:11pt;font-weight:700;color:${profit >= 0 ? "#2e7d32" : "#c62828"}">
      Net ${profit >= 0 ? "Profit" : "Loss"}
    </div>
    <div style="font-size:13pt;font-weight:800;color:${profit >= 0 ? "#2e7d32" : "#c62828"}">
      ${profit < 0 ? "&minus;" : ""}${fmt(Math.abs(profit))}
    </div>
  </div>` : "";

  const notesSection = trip.notes ? `
  <div class="section">
    <div class="shdr">Notes</div>
    <div class="row"><div style="font-size:9pt;color:#555;flex:1">${esc(trip.notes)}</div></div>
  </div>` : "";

  // orgLogo is a data URL or regular URL — safe to embed directly in src (base64 has no HTML-special chars)
  const logoTag = orgLogo
    ? `<img src="${orgLogo}" class="org-logo" alt="" onerror="this.style.display='none'">`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Trip Sheet — ${esc(or(trip.origin))} to ${esc(or(trip.destination))}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:10pt;color:#1a1a2e;background:#fff}
.page{max-width:780px;margin:0 auto;padding:24px}
.header{background:#1E2D8E;color:#fff;padding:14px 20px;display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;gap:12px}
.hdr-left{display:flex;align-items:center;gap:12px}
.org-logo{height:46px;width:46px;object-fit:contain;border-radius:5px;background:#fff;padding:2px;flex-shrink:0}
.org-name{font-size:15pt;font-weight:700;line-height:1.2;color:#fff}
.hdr-right{text-align:right;flex-shrink:0}
.title{font-size:11pt;font-weight:700;color:#fff}
.doc-meta{font-size:8.5pt;color:#c9cfe8;line-height:1.8}
.route-box{background:#f0f3ff;padding:10px 16px;margin-bottom:13px;display:flex;align-items:center;gap:10px}
.route-text{font-size:13pt;font-weight:700;color:#1E2D8E}
.route-arrow{font-size:18pt;color:#555;font-weight:300;line-height:1;padding:0 2px}
.section{margin-bottom:12px}
.shdr{background:#1E2D8E;color:#fff;font-weight:700;font-size:8pt;padding:4px 12px;text-transform:uppercase;letter-spacing:1px}
.row{display:flex;border-bottom:.5px solid #e8eaf6;padding:6px 12px;align-items:baseline}
.row.alt{background:#fafbff}
.lbl{width:40%;color:#666;font-size:9pt}
.val{flex:1;font-weight:700;font-size:9pt}
.exp-row{display:flex;border-bottom:.5px solid #f0f0f8;padding:6px 12px;align-items:baseline}
.exp-row.alt{background:#fafbff}
.exp-lbl{flex:1;font-size:9pt;color:#333}
.exp-amt{font-weight:700;font-size:9pt;width:110px;text-align:right;flex-shrink:0}
.total-row{display:flex;padding:7px 12px;background:#1E2D8E}
.total-lbl{flex:1;color:#fff;font-weight:700;font-size:10pt}
.total-amt{color:#fff;font-weight:700;font-size:10pt}
.profit-box{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;margin:12px 0;border-radius:5px}
.footer{margin-top:24px;border-top:.5px solid #e0e0e0;padding-top:8px;color:#888;font-size:8pt;text-align:center;line-height:1.8}
@media print{
  body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  @page{margin:14mm;size:A4 portrait}
  .page{padding:0;max-width:100%}
}
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div class="hdr-left">
      ${logoTag}
      <div class="org-name">${esc(orgName)}</div>
    </div>
    <div class="hdr-right">
      <div class="title">TRIP SHEET</div>
      ${trip.doc_number ? `<div class="doc-meta">LR: ${esc(trip.doc_number)}</div>` : ""}
      <div class="doc-meta">${new Date().toLocaleDateString("en-IN")}</div>
    </div>
  </div>

  <div class="route-box">
    <div class="route-text">${esc(or(trip.origin))}</div>
    <div class="route-arrow">&#8594;</div>
    <div class="route-text">${esc(or(trip.destination))}</div>
  </div>

  <div class="section">
    <div class="shdr">Trip Details</div>
    ${rowsHtml}
  </div>

  <div class="section">
    <div class="shdr">Charges</div>
    <div class="row">
      <div class="lbl">Freight Amount</div>
      <div class="val">${fmt(freight)}</div>
    </div>
  </div>

  ${expSection}
  ${profitSection}
  ${notesSection}

  <div class="footer">
    Generated by FleetSure &bull; ${esc(orgName)} &bull; ${now}
  </div>

</div>
<script>window.addEventListener('load',function(){setTimeout(function(){window.print()},400)});</script>
</body>
</html>`;
}

export async function downloadTripPdf(data: TripPdfData): Promise<void> {
  const win = window.open("", "_blank");
  if (!win) {
    alert("Please allow pop-ups for this site to open the trip sheet.");
    return;
  }
  win.document.open();
  win.document.write(buildHtml(data));
  win.document.close();
}
