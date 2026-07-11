import { supabase } from "@/lib/supabase";
import { query, ok, fail, getUid } from "./_base";
import { daysUntil } from "@/lib/date";
import type { Document, ServiceResponse } from "@/lib/types";

export type LinkedType = "driver" | "vehicle" | "trip" | "business" | "other";

export type DocumentFilters = {
  category?: string;
  linked_type?: LinkedType;
  linked_id?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type LogDocumentInput = {
  ownerId?: string;
  name: string;
  category: string;
  file_url: string;
  linked_type?: LinkedType | null;
  linked_id?: string | null;
  expiry_date?: string | null;
  notes?: string | null;
};

export const documentService = {
  // Uploads to the shared fleet-documents bucket and returns a public URL.
  // `folder` is the path prefix under the owner/driver id, e.g. "drivers/<id>",
  // "vehicles/<id>", "manual" — kept a plain string so every call site can
  // organize its own files without documentService needing to know about
  // drivers/vehicles/trips.
  async upload(file: File, rootId: string, folder: string): Promise<ServiceResponse<string>> {
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${rootId}/${folder}/${Date.now()}_${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("fleet-documents").upload(path, file, { upsert: false });
    if (error) return fail(error);
    const { data: { publicUrl } } = supabase.storage.from("fleet-documents").getPublicUrl(path);
    return ok(publicUrl);
  },

  // Records a row in the `documents` table for the Documents Portal. Every
  // auto-flow upload site (driver docs, vehicle docs, weighbridge slips,
  // fuel/toll/expense receipts) calls this after `upload()` succeeds.
  // `ownerId` is only needed when the caller isn't authenticated as the
  // fleet owner (the driver-app's own logDocument equivalent passes it
  // explicitly since the driver app authenticates as the driver, not owner).
  async logDocument(input: LogDocumentInput): Promise<ServiceResponse<Document>> {
    return query(
      supabase.from("documents").insert({
        owner_id: input.ownerId ?? getUid(),
        name: input.name,
        category: input.category,
        file_url: input.file_url,
        linked_type: input.linked_type ?? null,
        linked_id: input.linked_id ?? null,
        expiry_date: input.expiry_date ?? null,
        notes: input.notes ?? null,
      }).select().single()
    );
  },

  // Manual "+ Upload Document" flow — upload then log in one call.
  async create(
    file: File,
    data: { name: string; category: string; linked_type?: LinkedType | null; linked_id?: string | null; expiry_date?: string | null; notes?: string | null }
  ): Promise<ServiceResponse<Document>> {
    const uid = getUid();
    const uploadRes = await this.upload(file, uid, "manual");
    if (!uploadRes.success || !uploadRes.data) return uploadRes as unknown as ServiceResponse<Document>;
    return this.logDocument({ ...data, file_url: uploadRes.data });
  },

  async getAll(filters: DocumentFilters = {}): Promise<ServiceResponse<Document[]>> {
    const uid = getUid();
    let q = supabase
      .from("documents")
      .select("*, vehicles(registration_number)")
      .eq("owner_id", uid)
      .order("created_at", { ascending: false });

    if (filters.category)    q = q.eq("category", filters.category);
    if (filters.linked_type) q = q.eq("linked_type", filters.linked_type);
    if (filters.linked_id)   q = q.eq("linked_id", filters.linked_id);
    if (filters.search)      q = q.ilike("name", `%${filters.search}%`);
    if (filters.dateFrom)    q = q.gte("created_at", filters.dateFrom);
    if (filters.dateTo)      q = q.lte("created_at", filters.dateTo);

    const res = await query<any[]>(q);
    if (!res.success) return res;
    const rows = res.data || [];

    // Enrich driver/trip labels client-side (vehicle already joined above) —
    // batches one query per linked_type instead of one per row.
    const driverIds = [...new Set(rows.filter(r => r.linked_type === "driver" && r.linked_id).map(r => r.linked_id))];
    const tripIds    = [...new Set(rows.filter(r => r.linked_type === "trip"   && r.linked_id).map(r => r.linked_id))];

    const [driversRes, tripsRes] = await Promise.all([
      driverIds.length
        ? query<{ id: string; name: string }[]>(supabase.from("drivers").select("id, name").in("id", driverIds))
        : Promise.resolve(ok([] as { id: string; name: string }[])),
      tripIds.length
        ? query<{ id: string; origin: string; destination: string; start_date: string }[]>(
            supabase.from("trips").select("id, origin, destination, start_date").in("id", tripIds)
          )
        : Promise.resolve(ok([] as { id: string; origin: string; destination: string; start_date: string }[])),
    ]);
    const driverMap = new Map((driversRes.data || []).map(d => [d.id, d.name]));
    const tripMap   = new Map((tripsRes.data || []).map(t => [t.id, `${t.origin} → ${t.destination} (${t.start_date})`]));

    const data = rows.map((d: any) => {
      let linked_label: string | null = null;
      if (d.linked_type === "vehicle") linked_label = d.vehicles?.registration_number ?? d.reg_number ?? null;
      else if (d.linked_type === "driver") linked_label = driverMap.get(d.linked_id) ?? null;
      else if (d.linked_type === "trip") linked_label = tripMap.get(d.linked_id) ?? null;
      return {
        ...d,
        reg_number: d.vehicles?.registration_number || null,
        linked_label,
      };
    });
    return { success: true, data };
  },

  async getExpirySummary(): Promise<ServiceResponse<{ expiringSoon: number; expired: number }>> {
    const uid = getUid();
    const res = await query<{ expiry_date: string | null }[]>(
      supabase.from("documents").select("expiry_date").eq("owner_id", uid).not("expiry_date", "is", null)
    );
    if (!res.success) return res as unknown as ServiceResponse<{ expiringSoon: number; expired: number }>;
    let expiringSoon = 0, expired = 0;
    for (const row of res.data || []) {
      const days = daysUntil(row.expiry_date);
      if (days === null) continue;
      if (days < 0) expired++;
      else if (days <= 30) expiringSoon++;
    }
    return ok({ expiringSoon, expired });
  },

  // Legacy base64 download path stays for old rows never migrated to
  // file_url; everything new downloads straight from the public file_url.
  download(doc: Document): void {
    if (doc.file_url) {
      const link = document.createElement("a");
      link.href = doc.file_url;
      link.download = doc.name;
      link.target = "_blank";
      link.click();
      return;
    }
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

export function expiryStatus(expiry_date: string | null | undefined): "expired" | "expiring_soon" | null {
  const days = daysUntil(expiry_date);
  if (days === null) return null;
  if (days < 0) return "expired";
  if (days <= 30) return "expiring_soon";
  return null;
}
