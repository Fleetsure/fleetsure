import * as XLSX from "xlsx";
import { vehicleService } from "@/lib/services/vehicleService";
import { tripService } from "@/lib/services/tripService";
import { driverService } from "@/lib/services/driverService";
import { fuelService } from "@/lib/services/fuelService";
import { tollService } from "@/lib/services/tollService";
import { tyreService } from "@/lib/services/tyreService";
import { miscExpenseService } from "@/lib/services/miscExpenseService";
import { supabase } from "@/lib/supabase";
import { getUid } from "@/lib/services/_base";

const s = (v: any) => (v === null || v === undefined) ? "" : String(v);
const n = (v: any) => parseFloat(v) || 0;

export async function buildWorkbook(selected: string[], _orgName: string): Promise<XLSX.WorkBook> {
  const uid = getUid();
  const wb  = XLSX.utils.book_new();

  const [vRes, dRes, tRes, fRes, tlRes, tyRes, mRes] = await Promise.all([
    vehicleService.getAll(), driverService.getAll(), tripService.getAll(),
    fuelService.getAll(), tollService.getAll(), tyreService.getAll(), miscExpenseService.getAll(),
  ]);

  const vehicles = vRes.data || [];
  const drivers  = dRes.data || [];
  const trips    = tRes.data || [];
  const fuels    = fRes.data || [];
  const tolls    = tlRes.data || [];
  const tyres    = tyRes.data || [];
  const misc     = mRes.data || [];

  const vMap: Record<string, string> = {};
  for (const v of vehicles) vMap[v.id] = v.registration_number;

  let allExpenses: any[] = [];
  if (selected.includes("profit_loss")) {
    const { data } = await supabase.from("expenses").select("*").eq("owner_id", uid);
    allExpenses = data || [];
  }

  const add = (name: string, rows: Record<string, any>[]) => {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{}]), name);
  };

  if (selected.includes("vehicles")) {
    add("Vehicles", vehicles.map(v => ({
      "Reg Number": s(v.registration_number), "Make": s(v.make), "Model": s(v.model),
      "Year": s(v.year), "Type": s(v.vehicle_type), "Fuel": s(v.fuel_type),
      "Status": s(v.status), "Insurance Expiry": s(v.insurance_expiry),
      "Fitness Expiry": s(v.fitness_expiry), "PUC Expiry": s(v.puc_expiry), "Permit Expiry": s(v.permit_expiry),
    })));
  }
  if (selected.includes("drivers")) {
    add("Drivers", drivers.map(d => ({
      "Name": s(d.name), "Phone": s(d.phone), "Alt Phone": s(d.alternate_phone),
      "License No": s(d.license_number), "License Class": s(d.license_class),
      "License Expiry": s(d.license_expiry), "Transport Validity": s(d.transport_validity),
      "Blood Group": s(d.blood_group), "Status": s(d.status),
    })));
  }
  if (selected.includes("trips")) {
    add("Trips", trips.map(t => ({
      "Date": s(t.start_date), "Origin": s(t.origin), "Destination": s(t.destination),
      "Driver": s(t.driver_name), "Vehicle": s(vMap[t.vehicle_id]),
      "Distance (km)": n(t.distance_km), "Freight (₹)": n(t.freight_amount),
      "Status": s(t.status), "LR No": s(t.doc_number), "Material": s(t.material),
      "Weight (T)": n(t.weight_tonnes), "Notes": s(t.notes),
    })));
  }
  if (selected.includes("fuel")) {
    add("Fuel", fuels.map(f => ({
      "Date": s(f.date), "Vehicle": s(vMap[f.vehicle_id]),
      "Litres": n(f.litres), "Amount (₹)": n(f.amount),
      "Odometer (km)": n(f.odometer_km), "Station": s(f.fuel_station), "Notes": s(f.notes),
    })));
  }
  if (selected.includes("tolls")) {
    add("Tolls", tolls.map(t => ({
      "Date": s(t.date), "Vehicle": s(vMap[t.vehicle_id]),
      "Plaza": s(t.toll_plaza), "Route": s(t.route),
      "Payment Mode": s(t.payment_mode), "Amount (₹)": n(t.amount), "Notes": s(t.notes),
    })));
  }
  if (selected.includes("tyres")) {
    add("Tyres", tyres.map(t => ({
      "Date": s(t.date), "Vehicle": s(vMap[t.vehicle_id]),
      "Type": s(t.tyre_type), "Brand": s(t.tyre_brand), "Count": n(t.tyre_count),
      "Position": s(t.tyre_position), "Odometer (km)": n(t.odometer_km),
      "Amount (₹)": n(t.amount), "Notes": s(t.notes),
    })));
  }
  if (selected.includes("misc")) {
    add("Misc Expenses", misc.map(m => ({
      "Date": s(m.date), "Vehicle": s(vMap[m.vehicle_id || ""]),
      "Category": s(m.category), "Description": s(m.description),
      "Amount (₹)": n(m.amount), "Notes": s(m.notes),
    })));
  }
  if (selected.includes("profit_loss")) {
    const expByTrip: Record<string, number> = {};
    for (const e of allExpenses) expByTrip[e.trip_id] = (expByTrip[e.trip_id] || 0) + n(e.amount);
    add("Profit & Loss", trips.filter(t => t.status === "completed").map(t => {
      const freight = n(t.freight_amount);
      const expenses = expByTrip[t.id] || 0;
      const profit = freight - expenses;
      return {
        "Date": s(t.start_date), "Origin": s(t.origin), "Destination": s(t.destination),
        "Vehicle": s(vMap[t.vehicle_id]), "Driver": s(t.driver_name),
        "Freight (₹)": freight, "Expenses (₹)": expenses, "Profit (₹)": profit,
        "Margin %": freight > 0 ? Math.round((profit / freight) * 100) : 0,
      };
    }));
  }

  return wb;
}
