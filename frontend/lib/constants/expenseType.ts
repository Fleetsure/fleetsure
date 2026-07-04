// Canonical expense category list. trips/page.tsx previously had an 11-entry
// copy missing "fine" (present here and in expenses/page.tsx), meaning a fine
// couldn't be logged from the trip detail panel.
export const EXPENSE_TYPES = [
  { value: "fuel",              label: "Fuel (HSD)" },
  { value: "toll",              label: "Toll / Bridge" },
  { value: "rto",               label: "RTO" },
  { value: "police_challan",    label: "Police / Naka" },
  { value: "maintenance",       label: "Parts & Repairs" },
  { value: "tyre",              label: "Tyre Repair" },
  { value: "oil",               label: "Oil" },
  { value: "loading_unloading", label: "Loading / Unloading" },
  { value: "driver_payment",    label: "Driver Payment" },
  { value: "telephone",         label: "Telephone" },
  { value: "fine",              label: "Fine" },
  { value: "other",             label: "Other" },
] as const;

export const expenseTypeLabel = (type: string): string =>
  EXPENSE_TYPES.find(e => e.value === type)?.label ?? type;

export const EXPENSE_TYPE_COLOR: Record<string, string> = {
  fuel: "#1E2D8E", toll: "#283593", maintenance: "#e65100",
  driver_payment: "#1a7a34", loading_unloading: "#6a1b9a",
  police_challan: "#b71c1c", fine: "#b71c1c", other: "#666",
};
