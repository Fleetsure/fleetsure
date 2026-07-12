import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { supabase } from "../supabase";
import { query, getUid, getFirmId, scopeToFirm, ok, fail } from "./_base";
import type { Document, ServiceResponse } from "../types";

export const DOCUMENT_CATEGORIES = [
  "Driver Documents",
  "Vehicle Documents",
  "Trip Documents",
  "Expense Receipts",
  "Business Documents",
  "Other",
] as const;

export function expiryStatus(expiryDate: string | null): "expired" | "expiring_soon" | null {
  if (!expiryDate) return null;
  const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return "expired";
  if (days <= 30) return "expiring_soon";
  return null;
}

interface PickedFile {
  uri: string;
  name: string;
  mimeType: string | null;
}

async function upload(file: PickedFile, folder = "manual"): Promise<ServiceResponse<string>> {
  try {
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${getUid()}/${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    // fetch(uri).blob() doesn't work in React Native/Hermes ("Creating
    // blobs from ArrayBuffer not supported") — read the file as base64 and
    // decode to an ArrayBuffer instead, which supabase-js's storage upload
    // accepts directly.
    const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
    const arrayBuffer = decode(base64);
    const { error } = await supabase.storage
      .from("fleet-documents")
      .upload(path, arrayBuffer, { contentType: file.mimeType ?? "application/octet-stream", upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from("fleet-documents").getPublicUrl(path);
    return ok(data.publicUrl);
  } catch (e) {
    return fail(e);
  }
}

export const documentService = {
  upload,

  async getAll(): Promise<ServiceResponse<Document[]>> {
    const uid = getUid();
    return query(
      scopeToFirm(supabase.from("documents").select("*").eq("owner_id", uid)).order("created_at", { ascending: false })
    );
  },

  async getByLinked(linkedType: string, linkedId: string): Promise<ServiceResponse<Document[]>> {
    const uid = getUid();
    return query(
      scopeToFirm(
        supabase.from("documents").select("*").eq("owner_id", uid).eq("linked_type", linkedType).eq("linked_id", linkedId)
      ).order("created_at", { ascending: false })
    );
  },

  async create(
    file: PickedFile,
    data: {
      name: string; category: string; expiry_date?: string | null; notes?: string | null;
      vehicle_id?: string | null; linked_type?: string | null; linked_id?: string | null;
    }
  ): Promise<ServiceResponse<Document>> {
    const uploadRes = await upload(file);
    if (!uploadRes.success || !uploadRes.data) return fail(uploadRes.error ?? "Upload failed");
    return query(
      supabase
        .from("documents")
        .insert({
          ...data,
          file_url: uploadRes.data,
          file_name: file.name,
          mime_type: file.mimeType,
          owner_id: getUid(),
          firm_id: getFirmId(),
        })
        .select()
        .single()
    );
  },

  async delete(id: string): Promise<ServiceResponse<null>> {
    return query<null>(supabase.from("documents").delete().eq("id", id).eq("owner_id", getUid()));
  },
};
