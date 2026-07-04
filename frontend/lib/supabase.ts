import { createClient } from "@supabase/supabase-js";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import type { Database } from "@/lib/database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const EXCHANGE_PATH = "/functions/v1/exchange-token";
const TOKEN_EXPIRY_BUFFER = 60;

const authReady: Promise<void> = new Promise((resolve) => {
  const unsubscribe = onAuthStateChanged(auth, () => {
    unsubscribe();
    resolve();
  });
});

let cachedSupabaseToken: string | null = null;
let cachedSupabaseTokenExpiry = 0;
let currentFirebaseIdToken: string | null = null;

function parseJwtPayload(token: string): Record<string, any> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");
  const payload = parts[1];
  const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
  try {
    return JSON.parse(decoded);
  } catch {
    throw new Error("Invalid JWT payload");
  }
}

async function exchangeFirebaseToken(firebaseToken: string): Promise<string> {
  const response = await fetch(`${url}${EXCHANGE_PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
    },
    body: JSON.stringify({ firebase_token: firebaseToken }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload || typeof payload.token !== "string") {
    const error = payload?.error ?? "Failed to exchange Firebase token";
    throw new Error(error);
  }
  return payload.token;
}

export async function getSupabaseToken(): Promise<string | null> {
  await authReady;
  const user = auth.currentUser;
  if (!user) {
    clearSupabaseTokenCache();
    return null;
  }

  const firebaseToken = await user.getIdToken();
  const now = Math.floor(Date.now() / 1000);

  if (
    cachedSupabaseToken &&
    cachedSupabaseTokenExpiry - TOKEN_EXPIRY_BUFFER > now &&
    currentFirebaseIdToken === firebaseToken
  ) {
    return cachedSupabaseToken;
  }

  const supabaseToken = await exchangeFirebaseToken(firebaseToken);
  const supabasePayload = parseJwtPayload(supabaseToken);
  const exp = Number(supabasePayload.exp ?? 0);
  if (!exp || exp <= now) {
    throw new Error("Received invalid Supabase token");
  }

  cachedSupabaseToken = supabaseToken;
  cachedSupabaseTokenExpiry = exp;
  currentFirebaseIdToken = firebaseToken;

  return supabaseToken;
}

export function clearSupabaseTokenCache(): void {
  cachedSupabaseToken = null;
  cachedSupabaseTokenExpiry = 0;
  currentFirebaseIdToken = null;
}

export function setSupabaseAuthToken(token: string | null): void {
  if (!token) {
    clearSupabaseTokenCache();
    return;
  }

  if (currentFirebaseIdToken !== token) {
    currentFirebaseIdToken = token;
    cachedSupabaseToken = null;
    cachedSupabaseTokenExpiry = 0;
  }
}

async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  await authReady;
  const headers = new Headers(init.headers ?? {});
  const token = await getSupabaseToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(input as RequestInfo, { ...init, headers });
}

export const supabase = createClient<Database>(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: {
    fetch: authFetch,
  },
});
