import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { supabase } from "../supabase";
import { query, getUid, ok, fail } from "./_base";
import type { Firm, ServiceResponse } from "../types";

interface PickedFile {
  uri: string;
  name: string;
  mimeType: string | null;
}

export const firmService = {
  async getAll(): Promise<ServiceResponse<Firm[]>> {
    return query(supabase.from("firms").select("*").eq("owner_id", getUid()).order("created_at", { ascending: true }));
  },

  async create(data: Omit<Firm, "id" | "owner_id" | "created_at">): Promise<ServiceResponse<Firm>> {
    return query(supabase.from("firms").insert({ ...data, owner_id: getUid() }).select().single());
  },

  async update(id: string, data: Partial<Omit<Firm, "id" | "owner_id" | "created_at">>): Promise<ServiceResponse<Firm>> {
    return query(supabase.from("firms").update(data).eq("id", id).eq("owner_id", getUid()).select().single());
  },

  // Fixed path per firm (upsert: true) so re-uploading a logo replaces the
  // old one at the same URL instead of accumulating orphaned files.
  async uploadLogo(firmId: string, file: PickedFile): Promise<ServiceResponse<string>> {
    try {
      const path = `${getUid()}/${firmId}.jpg`;
      // Same fetch(uri).blob() incompatibility as documentService.upload —
      // read as base64 and decode to ArrayBuffer instead.
      const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
      const arrayBuffer = decode(base64);
      const { error } = await supabase.storage
        .from("firm-logos")
        .upload(path, arrayBuffer, { contentType: file.mimeType ?? "image/jpeg", upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("firm-logos").getPublicUrl(path);
      return ok(`${data.publicUrl}?v=${Date.now()}`);
    } catch (e) {
      return fail(e);
    }
  },
};
