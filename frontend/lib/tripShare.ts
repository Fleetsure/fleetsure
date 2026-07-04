import { fmtDate } from "./date";

export function shareOnWhatsApp(trip: any, detail: any, vehicleReg: string) {
  const fmtDateLocal = (d: string | null) => d ? fmtDate(d) : "—";
  const fmtMoney = (n: number) => "₹" + n.toLocaleString("en-IN");

  const expenses = detail?.expenses || [];
  const totalExp = expenses.reduce((s: number, e: any) => s + parseFloat(e.amount || 0), 0);
  const freight  = parseFloat(trip.freight_amount || 0);
  const profit   = freight - totalExp;

  const statusLabel: Record<string, string> = {
    planned: "Planned", in_progress: "In Progress",
    completed: "Completed", cancelled: "Cancelled",
  };

  const lines: string[] = [
    `*Trip Sheet*`,
    `*${trip.origin} → ${trip.destination}*`,
    ``,
    `*Vehicle:* ${vehicleReg}`,
    `*Driver:* ${trip.driver_name}${trip.driver_phone ? `  |  ${trip.driver_phone}` : ""}`,
    `*Dates:* ${fmtDateLocal(trip.start_date)} → ${fmtDateLocal(trip.end_date)}`,
  ];

  if (detail?.doc_number)    lines.push(`*LR No:* ${detail.doc_number}`);
  if (detail?.material)      lines.push(`*Material:* ${detail.material}${detail.weight_tonnes ? `  |  ${detail.weight_tonnes} T` : ""}`);

  lines.push(``);
  lines.push(`*Freight:* ${fmtMoney(freight)}`);
  if (totalExp > 0) lines.push(`*Expenses:* ${fmtMoney(totalExp)}`);
  if (totalExp > 0) lines.push(`*Net:* ${profit >= 0 ? "" : "-"}${fmtMoney(Math.abs(profit))}`);
  lines.push(`*Status:* ${statusLabel[trip.status] || trip.status}`);
  lines.push(``);
  lines.push(`_FleetSure_`);

  const url = `https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`;
  window.open(url, "_blank");
}
