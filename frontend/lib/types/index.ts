// ── Shared response wrapper ───────────────────────────────
export interface ServiceResponse<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

// ── User / Auth ───────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  org_name?: string;
  org_logo?: string;
  google_picture?: string;
  gst_number?: string;
  is_active: boolean;
  created_at?: string;
  last_login_at?: string;
}

// ── Vehicle ───────────────────────────────────────────────
export interface Vehicle {
  id: string;
  owner_id: string;
  registration_number: string;
  make: string;
  model: string;
  year?: number;
  vehicle_type?: string;
  fuel_type?: string;
  status?: string;
  insurance_expiry?: string;
  fitness_expiry?: string;
  permit_expiry?: string;
  puc_expiry?: string;
  avg_mileage_kmpl?: number | null;
  created_at?: string;
}

// ── Driver ────────────────────────────────────────────────
export interface Driver {
  id: string;
  owner_id: string;
  name: string;
  phone: string;
  alternate_phone?: string | null;
  address?: string | null;
  license_number?: string | null;
  license_expiry?: string | null;
  transport_validity?: string | null;
  badge_issue_date?: string | null;
  dob?: string | null;
  blood_group?: string | null;
  license_class?: string;
  status?: string;
  created_at?: string;
}

export interface DriverPayment {
  id: string;
  owner_id: string;
  driver_id: string;
  date: string;
  type: string;
  amount: number;
  notes?: string;
  trip_id?: string;
}

// ── Trip ──────────────────────────────────────────────────
export interface Trip {
  id: string;
  owner_id: string;
  vehicle_id: string;
  driver_id?: string | null;
  driver_name: string;
  driver_phone?: string | null;
  origin: string;
  destination: string;
  distance_km?: number | null;
  start_date: string;
  end_date?: string | null;
  doc_number?: string | null;
  material?: string | null;
  weight_tonnes?: number | null;
  freight_amount: number;
  driver_advance?: number | null;
  status: string;
  notes?: string;
  expenses?: Expense[];
  fuel_logs?: FuelLog[];
  toll_logs?: TollLog[];
  misc_expenses?: MiscExpense[];
}

export interface Expense {
  id: string;
  trip_id: string;
  expense_type: string;
  amount: number;
  date: string;
  description?: string | null;
}

// ── Fuel Log ──────────────────────────────────────────────
export interface FuelLog {
  id: string;
  owner_id: string;
  vehicle_id: string;
  trip_id?: string | null;
  date: string;
  odometer_km?: number | null;
  litres: number;
  amount: number;
  fuel_station?: string | null;
  notes?: string | null;
}

// ── Toll Log ──────────────────────────────────────────────
export interface TollLog {
  id: string;
  owner_id: string;
  vehicle_id: string;
  trip_id?: string;
  date: string;
  amount: number;
  toll_plaza?: string;
  route?: string;
  payment_mode?: string;
  notes?: string;
}

// ── Tyre Log ──────────────────────────────────────────────
export interface TyreLog {
  id: string;
  owner_id: string;
  vehicle_id: string;
  date: string;
  amount: number;
  tyre_brand?: string;
  tyre_count?: number;
  tyre_type?: string;
  tyre_position?: string;
  odometer_km?: number;
  notes?: string;
}

// ── Misc Expense ──────────────────────────────────────────
export interface MiscExpense {
  id: string;
  owner_id: string;
  vehicle_id?: string;
  trip_id?: string;
  date: string;
  amount: number;
  category: string;
  description?: string;
  notes?: string;
}

// ── Insurance Policy ──────────────────────────────────────
export interface InsurancePolicy {
  id: string;
  owner_id: string;
  vehicle_id: string;
  policy_type: string;
  policy_number?: string;
  insurer?: string;
  start_date?: string;
  expiry_date: string;
  premium?: number;
  notes?: string;
  // enriched fields
  days_left?: number;
  status?: string;
  reg_number?: string;
}

// ── Document ──────────────────────────────────────────────
export interface Document {
  id: string;
  owner_id: string;
  vehicle_id?: string;
  name: string;
  doc_type?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  content_b64?: string;
  notes?: string;
  created_at?: string;
  reg_number?: string;
}

// ── Party ─────────────────────────────────────────────────
export interface Party {
  id: string;
  owner_id: string;
  name: string;
  phone?: string;
  gstin?: string;
  address?: string;
  party_type: string;
  opening_balance?: number;
  notes?: string;
}

// ── Marketplace ───────────────────────────────────────────
export interface ReturnLoad {
  id: string;
  owner_id: string;
  from_city: string;
  to_city: string;
  available_date: string;
  vehicle_type?: string;
  capacity_tonnes?: number;
  contact_phone?: string;
  contact_name?: string;
  notes?: string;
  status?: string;
  created_at?: string;
}

export interface LoadInterest {
  id: string;
  return_load_id: string;
  interested_user_id: string;
  message?: string;
  status?: string;
  rating?: number;
  created_at?: string;
  marketplace_return_loads?: ReturnLoad;
}

// ── Insight ───────────────────────────────────────────────
export interface Insight {
  id: string;
  owner_id: string;
  insight_type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  body?: string | null;
  is_read: boolean;
  is_dismissed: boolean;
  vehicle_id?: string;
  trip_id?: string;
  meta?: Record<string, any>;
  created_at?: string;
}
