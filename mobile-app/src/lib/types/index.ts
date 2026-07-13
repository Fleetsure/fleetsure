import type { Database } from "../database.types";

// ── Shared response wrapper ───────────────────────────────
export interface ServiceResponse<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

// Every domain type below is a direct alias of the generated Supabase Row
// type instead of a hand-maintained copy — hand-rolled versions had drifted
// from the live schema (wrong nullability, a couple of renamed/missing
// columns caught a real bug in authService.getBillingStatus). Extra fields
// below are for query-time joins/enrichment that aren't part of the table
// itself.

export type User = Database["public"]["Tables"]["users"]["Row"];
export type Firm = Database["public"]["Tables"]["firms"]["Row"];
export type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];
export type Driver = Database["public"]["Tables"]["drivers"]["Row"];
export type DriverPayment = Database["public"]["Tables"]["driver_payments"]["Row"];
export type DriverExpense = Database["public"]["Tables"]["driver_expenses"]["Row"];
export type DriverSalary = Database["public"]["Tables"]["driver_salary"]["Row"];
export type Expense = Database["public"]["Tables"]["expenses"]["Row"];
export type FuelLog = Database["public"]["Tables"]["fuel_logs"]["Row"];
export type TollLog = Database["public"]["Tables"]["toll_logs"]["Row"];
export type TyreLog = Database["public"]["Tables"]["tyre_logs"]["Row"];
export type TyreRotation = Database["public"]["Tables"]["tyre_rotations"]["Row"];
export type TyreScrap = Database["public"]["Tables"]["tyre_scraps"]["Row"];
export type VehicleBattery = Database["public"]["Tables"]["vehicle_batteries"]["Row"];
export type MaintenanceSchedule = Database["public"]["Tables"]["maintenance_schedules"]["Row"];
export type MiscExpense = Database["public"]["Tables"]["misc_expenses"]["Row"];
export type Party = Database["public"]["Tables"]["parties"]["Row"];
export type TeamMember = Database["public"]["Tables"]["team_members"]["Row"];
export type Insight = Database["public"]["Tables"]["operational_insights"]["Row"];

export type Trip = Database["public"]["Tables"]["trips"]["Row"] & {
  // Joined per-trip expense sources (tripService.getById)
  expenses?: Expense[];
  fuel_logs?: FuelLog[];
  toll_logs?: TollLog[];
  misc_expenses?: MiscExpense[];
  // Weighbridge columns — not in database.types.ts yet, see the migration
  // comment at the top of tripService.ts. Safe to keep optional here even
  // after the migration lands and codegen picks them up for real.
  loaded_weight_kg?: number | null;
  empty_weight_kg?: number | null;
  weighbridge_location?: string | null;
  weighbridge_receipt?: string | null;
};

export type InsurancePolicy = Database["public"]["Tables"]["insurance_policies"]["Row"] & {
  // Enriched client-side for the compliance dashboard, not DB columns
  days_left?: number;
  status?: string;
  reg_number?: string;
};

export type Document = Database["public"]["Tables"]["documents"]["Row"] & {
  reg_number?: string;
  linked_label?: string | null;
};

export type ReturnLoad = Database["public"]["Tables"]["marketplace_return_loads"]["Row"];

export type LoadInterest = Database["public"]["Tables"]["marketplace_load_interests"]["Row"] & {
  marketplace_return_loads?: ReturnLoad;
};
