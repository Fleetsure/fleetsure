import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "./firebase";

const SUPABASE_URL = "https://hjtamxpydneuykkcwpfn.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqdGFteHB5ZG5ldXlra2N3cGZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNTg1NDksImV4cCI6MjA5NDgzNDU0OX0.iCOE8H4sTkqkyRW1UdKDVwwL7tj_PNjKjeA5ab6-SrI";
const EXCHANGE_PATH = "/functions/v1/exchange-token";
const TOKEN_EXPIRY_BUFFER = 60;

// Wait for @react-native-firebase/auth to restore the persisted session before
// any Supabase request fires — otherwise auth.currentUser is null and the
// token exchange has nothing to exchange.
const authReady: Promise<void> = new Promise((resolve) => {
  const unsub = auth.onAuthStateChanged(() => { unsub(); resolve(); });
});

let cachedSupabaseToken: string | null = null;
let cachedSupabaseTokenExpiry = 0;
let currentFirebaseIdToken: string | null = null;

function parseJwtPayload(token: string): Record<string, any> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");
  const decoded = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
  try {
    return JSON.parse(decoded);
  } catch {
    throw new Error("Invalid JWT payload");
  }
}

async function exchangeFirebaseToken(firebaseToken: string): Promise<string> {
  const response = await fetch(`${SUPABASE_URL}${EXCHANGE_PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
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

async function getSupabaseToken(): Promise<string | null> {
  await authReady;
  const user = auth.currentUser;
  if (!user) {
    cachedSupabaseToken = null;
    cachedSupabaseTokenExpiry = 0;
    currentFirebaseIdToken = null;
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

  // One retry for the exchange call — a transient network blip or edge
  // function cold start shouldn't be able to silently drop an entire
  // session down to the anonymous role (see authFetch's catch below for
  // what happens if this still fails after the retry).
  let supabaseToken: string;
  try {
    supabaseToken = await exchangeFirebaseToken(firebaseToken);
  } catch (firstError) {
    console.error("[supabase] token exchange failed, retrying once:", (firstError as any)?.message ?? firstError);
    supabaseToken = await exchangeFirebaseToken(firebaseToken);
  }
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

async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  await authReady;
  const headers = new Headers((init.headers as HeadersInit) ?? {});
  try {
    const token = await getSupabaseToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  } catch (e: any) {
    // Previously silent regardless of cause. A signed-in user whose token
    // exchange fails (network blip, exchange-token edge function error,
    // JWKS fetch failure) fell through to this same catch as "not logged
    // in yet" — the request then went out with NO Authorization header at
    // all, i.e. as the anonymous role. auth.jwt() is then null server-side,
    // and every owner-scoped RPC/query silently returns zero rows — not an
    // error, so nothing in the app ever surfaced it. Only log when a
    // Firebase user actually exists, since that's the case that indicates a
    // real failure rather than the expected pre-login state.
    if (auth.currentUser) {
      console.error("[supabase] token exchange failed while signed in — request will go out unauthenticated:", {
        firebaseUid: auth.currentUser.uid,
        url: typeof input === "string" ? input : (input as any)?.url ?? input,
        error: e?.message ?? e,
      });
    }
  }
  return fetch(input as RequestInfo, { ...init, headers });
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: { fetch: authFetch },
});
