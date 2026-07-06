export interface ServiceResponse<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  org_name?: string;
  org_logo?: string;
  google_picture?: string;
  is_active: boolean;
  created_at?: string;
}

export interface Vehicle {
  id: string;
  owner_id: string;
  registration_number: string;
  make: string;
  model: string;
  year?: number | null;
  vehicle_type?: string | null;
  fuel_type?: string | null;
  status?: string | null;
  color?: string | null;
  chassis_number?: string | null;
  engine_number?: string | null;
  owner_name?: string | null;
  rto_code?: string | null;
  insurance_expiry?: string | null;
  fitness_expiry?: string | null;
  permit_expiry?: string | null;
  puc_expiry?: string | null;
  avg_mileage_kmpl?: number | null;
  created_at?: string;
}

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
  license_class?: string | null;
  status?: string | null;
  created_at?: string;
}

export interface DriverPayment {
  id: string;
  owner_id: string;
  driver_id: string;
  date: string;
  type: string;
  amount: number;
  notes?: string | null;
  trip_id?: string | null;
}

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
  notes?: string | null;
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

export interface TollLog {
  id: string;
  owner_id: string;
  vehicle_id: string;
  trip_id?: string | null;
  date: string;
  amount: number;
  toll_plaza?: string | null;
  route?: string | null;
  payment_mode?: string | null;
  notes?: string | null;
}

export interface MiscExpense {
  id: string;
  owner_id: string;
  vehicle_id?: string | null;
  trip_id?: string | null;
  date: string;
  amount: number;
  category: string;
  description?: string | null;
  notes?: string | null;
}

export interface TyreLog {
  id: string;
  owner_id: string;
  vehicle_id: string;
  date: string;
  amount: number;
  tyre_brand?: string | null;
  tyre_count?: number | null;
  tyre_type?: string | null;
  tyre_position?: string | null;
  odometer_km?: number | null;
  notes?: string | null;
}
