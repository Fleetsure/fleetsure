import AsyncStorage from "@react-native-async-storage/async-storage";
import { ServiceResponse } from "../types";
import { auth } from "../firebase";

const FIRM_STORAGE_KEY = "fleetsure_active_firm";

export function getUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");
  return uid;
}

// AsyncStorage is async, unlike web's localStorage, so scopeToFirm (called
// synchronously while building a query) can't read storage directly. This
// caches the active firm id in memory, hydrated once at boot by
// FirmContext via loadCachedFirmId(), and kept in sync on every switch via
// setCachedFirmId() — same pattern src/lib/supabase.ts already uses for
// caching the exchanged Supabase token.
let cachedFirmId: string | null = null;

export async function loadCachedFirmId(): Promise<string | null> {
  cachedFirmId = await AsyncStorage.getItem(FIRM_STORAGE_KEY);
  return cachedFirmId;
}

export async function setCachedFirmId(firmId: string | null): Promise<void> {
  cachedFirmId = firmId;
  if (firmId) await AsyncStorage.setItem(FIRM_STORAGE_KEY, firmId);
  else await AsyncStorage.removeItem(FIRM_STORAGE_KEY);
}

// Unlike getUid(), this doesn't throw when absent — firm_id is an
// application-level filter, not a security boundary (owner_id already
// scopes every row), so "no firm selected yet" just means "don't filter".
export function getFirmId(): string | null {
  return cachedFirmId;
}

// Chains .eq("firm_id", ...) onto a query already scoped by owner_id, only
// when a firm is actually selected — every firm-aware service passes its
// query through this instead of repeating the same null check inline.
// Untyped (not generic over the builder type): under this project's pinned
// TS 6 (~6.0.3, matching driver-app), a generic constrained against
// supabase-js's PostgrestFilterBuilder blows the compiler's instantiation
// depth limit once callers chain further methods after this — the same
// generic version compiles fine on frontend's TS 5.9. Every caller already
// consumes results loosely via query()/.data, so nothing downstream relies
// on this being generic.
export function scopeToFirm(q: any): any {
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
