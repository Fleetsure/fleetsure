// Canonical category list for the Documents Portal (frontend/app/documents).
// `linkedType` is the `documents.linked_type` value that category's
// auto-flowed uploads carry — used to pre-select the right "linked to" type
// in the manual upload modal for that category.
export const DOCUMENT_CATEGORY_CONFIG: Record<
  string,
  { color: string; bg: string; linkedType: "driver" | "vehicle" | "trip" | "business" | "other" | null }
> = {
  "Driver Documents":  { color: "#1565c0", bg: "#e3f2fd", linkedType: "driver" },
  "Vehicle Documents": { color: "#6a1b9a", bg: "#f3e5f5", linkedType: "vehicle" },
  "Trip Documents":    { color: "#00838f", bg: "#e0f7fa", linkedType: "trip" },
  "Expense Receipts":  { color: "#e65100", bg: "#fff3e0", linkedType: null },
  "Business Documents":{ color: "#2e7d32", bg: "#e8f5e9", linkedType: "business" },
  "Other":             { color: "#616161", bg: "#f5f5f5", linkedType: "other" },
};

export const DOCUMENT_CATEGORIES = Object.keys(DOCUMENT_CATEGORY_CONFIG);
