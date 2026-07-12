import { supabase } from "@/lib/supabase";
import { query, getUid, getFirmId, scopeToFirm } from "./_base";
import { documentService } from "./documentService";
import type { Vehicle, ServiceResponse } from "@/lib/types";

export const VEHICLE_DOC_LABELS: Record<string, string> = {
  rc: "RC Book",
  insurance: "Insurance",
  fitness: "Fitness Certificate",
  puc: "Pollution Certificate",
  national_permit: "National Permit",
  state_permit: "State Permit",
  road_tax: "Road Tax",
};

export const vehicleService = {
  async getAll(): Promise<ServiceResponse<Vehicle[]>> {
    const uid = getUid();
    return query(
      scopeToFirm(supabase.from("vehicles").select("*").eq("owner_id", uid)).order("created_at", { ascending: false })
    );
  },

  async create(data: Omit<Vehicle, "id" | "owner_id" | "created_at">): Promise<ServiceResponse<Vehicle>> {
    return query(
      supabase.from("vehicles").insert({ ...data, owner_id: getUid(), firm_id: getFirmId() }).select().single()
    );
  },

  async update(id: string, data: Partial<Vehicle>): Promise<ServiceResponse<Vehicle>> {
    return query(
      supabase.from("vehicles").update(data).eq("id", id).eq("owner_id", getUid()).select().single()
    );
  },

  async delete(id: string): Promise<ServiceResponse<null>> {
    return query(
      supabase.from("vehicles").delete().eq("id", id).eq("owner_id", getUid())
    );
  },

  // Deliberately not firm-scoped — a registration number is a physical
  // vehicle identity and must stay unique across the whole owner's fleet,
  // not just within the currently active firm.
  async existsByRegistration(registrationNumber: string): Promise<boolean> {
    const { data } = await supabase.from("vehicles").select("id")
      .eq("owner_id", getUid()).eq("registration_number", registrationNumber).maybeSingle();
    return !!data;
  },

  // ── Compliance documents ─────────────────────────────────────────────────
  // Uploads to the shared fleet-documents bucket and logs the upload into
  // the Documents Portal tagged to this vehicle — there's no per-type URL
  // column on `vehicles` itself, the `documents` table is the only record.
  async uploadVehicleDocument(file: File, vehicleId: string, docType: string, expiryDate?: string | null): Promise<ServiceResponse<string>> {
    const uid = getUid();
    const uploadRes = await documentService.upload(file, uid, `vehicles/${vehicleId}`);
    if (!uploadRes.success || !uploadRes.data) return uploadRes;
    await documentService.logDocument({
      ownerId: uid,
      name: VEHICLE_DOC_LABELS[docType] || docType,
      category: "Vehicle Documents",
      file_url: uploadRes.data,
      linked_type: "vehicle",
      linked_id: vehicleId,
      expiry_date: expiryDate ?? null,
    });
    return uploadRes;
  },
};
