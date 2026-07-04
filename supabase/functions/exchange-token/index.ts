const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, apikey, Authorization, x-client-info",
  "Content-Type": "application/json",
};

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  base64 += "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    buffer[i] = binary.charCodeAt(i);
  }
  return buffer;
}

function base64UrlToString(base64Url: string): string {
  return new TextDecoder().decode(base64UrlToUint8Array(base64Url));
}

function base64UrlEncode(data: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function verifyFirebaseToken(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = JSON.parse(base64UrlToString(encodedHeader)) as Record<string, unknown>;
  const payload = JSON.parse(base64UrlToString(encodedPayload)) as Record<string, unknown>;

  if (header.alg !== "RS256") throw new Error("Unsupported JWT alg");
  if (typeof header.kid !== "string") throw new Error("Missing JWT kid");
  if (typeof payload.aud !== "string" || payload.aud !== "fleetsure-fc010") {
    throw new Error("Invalid token audience");
  }
  if (typeof payload.iss !== "string" || payload.iss !== "https://securetoken.google.com/fleetsure-fc010") {
    throw new Error("Invalid token issuer");
  }
  if (typeof payload.exp !== "number" || payload.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error("Expired Firebase token");
  }
  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new Error("Missing Firebase UID");
  }

  const jwksResponse = await fetch(
    "https://www.googleapis.com/robot/v1/metadata/jwk/securetoken@system.gserviceaccount.com"
  );
  if (!jwksResponse.ok) {
    throw new Error("Failed to fetch Firebase JWKS");
  }
  const jwks = await jwksResponse.json();
  const key = Array.isArray(jwks.keys)
    ? jwks.keys.find((entry: any) => entry.kid === header.kid)
    : undefined;

  if (!key) throw new Error("Firebase JWK not found");
  if (key.kty !== "RSA" || key.use !== "sig") throw new Error("Invalid JWK");

  const publicKey = await crypto.subtle.importKey(
    "jwk",
    {
      kty: key.kty,
      e: key.e,
      n: key.n,
      alg: "RS256",
      ext: false,
      use: "sig",
    },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const signature = base64UrlToUint8Array(encodedSignature);
  const data = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, signature, data);
  if (!valid) throw new Error("Firebase token signature verification failed");

  return payload;
}

async function createSupabaseJwt(firebaseUid: string, email?: string, phoneNumber?: string) {
  const secret = Deno.env.get("JWT_SIGNING_SECRET");
  if (!secret) throw new Error("Missing JWT_SIGNING_SECRET");

  const now = Math.floor(Date.now() / 1000);
  const payload: Record<string, unknown> = {
    sub: firebaseUid,
    role: "authenticated",
    aud: "authenticated",
    iss: "supabase",
    exp: now + 3600,
    iat: now,
  };
  if (email) payload.email = email;
  if (phoneNumber) payload.phone_number = phoneNumber;

  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsigned = `${encodedHeader}.${encodedPayload}`;

  const signingKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", signingKey, new TextEncoder().encode(unsigned)));
  const encodedSignature = base64UrlEncode(signature);
  return `${unsigned}.${encodedSignature}`;
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: CORS_HEADERS,
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (!body || typeof body.firebase_token !== "string") {
    return jsonResponse({ error: "Missing firebase_token" }, 400);
  }

  try {
    const payload = await verifyFirebaseToken(body.firebase_token);
    const supabaseToken = await createSupabaseJwt(
      payload.sub as string,
      typeof payload.email === "string" ? payload.email : undefined,
      typeof payload.phone_number === "string" ? payload.phone_number : undefined
    );
    return jsonResponse({ token: supabaseToken });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Authentication failed";
    return jsonResponse({ error: message }, 401);
  }
});
