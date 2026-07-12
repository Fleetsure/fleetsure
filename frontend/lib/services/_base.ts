import { ServiceResponse } from "@/lib/types";
import { auth } from "@/lib/firebase";

export function getUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");
  return uid;
}

// Active firm, chosen via the navbar FirmSwitcher and persisted by
// FirmContext. Unlike getUid(), this doesn't throw when absent — firm_id is
// an application-level filter, not a security boundary (owner_id already
// scopes every row), so "no firm selected yet" just means "don't filter".
export function getFirmId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("fleetsure_active_firm");
}

// Chains .eq("firm_id", ...) onto a query already scoped by owner_id, only
// when a firm is actually selected — every firm-aware service passes its
// query through this instead of repeating the same null check inline.
export function scopeToFirm<T extends { eq: (col: string, val: string) => T }>(q: T): T {
  const firmId = getFirmId();
  return firmId ? q.eq("firm_id", firmId) : q;
}

export function ok<T>(data: T): ServiceResponse<T> {
  return { success: true, data };
}

export function fail(error: unknown): ServiceResponse<never> {
  if (error && typeof error === "object" && "message" in error) {
    return { success: false, error: (error as { message: string }).message };
  }
  return { success: false, error: String(error) };
}

// Wraps a supabase query: throws on error, returns data
export async function query<T>(
  promise: PromiseLike<{ data: T | null; error: unknown }>
): Promise<ServiceResponse<T>> {
  try {
    const { data, error } = await promise;
    if (error) throw error;
    return ok(data as T);
  } catch (e) {
    return fail(e);
  }
}
