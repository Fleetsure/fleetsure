import { supabase } from "@/lib/supabase";
import { query, getUid, ok } from "./_base";
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

  // Download uses base64 already fetched by getAll — no network call needed
  download(doc: Document): void {
    if (!doc.content_b64) return;
    const link = document.createElement("a");
    link.href = `data:${doc.mime_type || "application/octet-stream"};base64,${doc.content_b64}`;
    link.download = doc.file_name || doc.name;
    link.click();
  },

  async delete(id: string): Promise<ServiceResponse<null>> {
    return query(
      supabase.from("documents").delete().eq("id", id).eq("owner_id", getUid())
    );
  },
};
