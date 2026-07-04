// Canonical driver_payments.type values. Matches what teamService.addDriverPayment
// actually writes — accountant/payments previously read a nonexistent
// `payment_type` field and had its own, differently-colored, differently-keyed map.
export const PAYMENT_TYPES = ["advance", "salary", "settlement", "deduction", "bonus", "other"] as const;

export const PAYMENT_TYPE_COLOR: Record<string, string> = {
  advance:    "#1565c0",
  salary:     "#2e7d32",
  settlement: "#7b1fa2",
  deduction:  "#c62828",
  bonus:      "#e65100",
  other:      "#555",
};
