import { supabase } from "@/lib/supabase";
import { query, getUid, ok, fail } from "./_base";
import { api } from "@/lib/api";
import type { Document, ServiceResponse } from "@/lib/types";

export const documentService = {
  async getAll(vehicle_id?: string): Promise<ServiceResponse<Document[]>> {
    const uid = getUid();
    const q = supabase
      .from("documents")
      .select("*, vehicles(registration_number)")
      .eq("owner_id", uid)
      .order("created_at", { ascending: false });
    const res = await query<any[]>(vehicle_id ? q.eq("vehicle_id", vehicle_id) : q);
    if (!res.success) return res;
    const data = (res.data || []).map((d: any) => ({
      ...d,
      reg_number: d.vehicles?.registration_number || null,
    }));
    return { success: true, data };
  },

  async upload(data: Omit<Document, "id" | "owner_id" | "created_at">): Promise<ServiceResponse<Document>> {
    return query(
      supabase.from("documents").insert({ ...data, owner_id: getUid() }).select().single()
    );
  },

  async delete(id: string): Promise<ServiceResponse<null>> {
    return query(
      supabase.from("documents").delete().eq("id", id).eq("owner_id", getUid())
    );
  },

  async download(id: string): Promise<ServiceResponse<{ content_b64: string; mime_type: string; file_name: string }>> {
    try {
      const res = await api.get(`/documents/${id}/download`);
      return ok(res.data);
    } catch (e) {
      return fail(e);
    }
  },
};
