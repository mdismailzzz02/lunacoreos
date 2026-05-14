import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://dfpngowpkozggqiyrtrr.supabase.co",
  "https://lunacoreos.onrender.com"
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, prefer, cache-control, pragma, expires, if-modified-since",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Expose-Headers": "content-length, x-json",
    "Vary": "Origin",
  };
}

// Helper to convert PEM to CryptoKey (Very robust version)
async function importPrivateKey(pem: string) {
  // 1. Remove headers, footers, and ALL whitespace (newlines, spaces, tabs)
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");

  // 2. Decode base64
  const binaryDerString = atob(pemContents);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }

  // 3. Import as PKCS8
  return await crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

// Helper to create JWT
async function createJWT(payload: any, privateKey: CryptoKey) {
  const header = { alg: "RS256", typ: "JWT" };
  const encode = (obj: any) => btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  
  const encodedHeader = encode(header);
  const encodedPayload = encode(payload);
  
  const data = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, data);
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    
  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const jsonKey = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!jsonKey) throw new Error("Missing secret GOOGLE_SERVICE_ACCOUNT_JSON");

    const sa = JSON.parse(jsonKey);
    const privateKey = await importPrivateKey(sa.private_key);

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/drive",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    };

    const jwt = await createJWT(payload, privateKey);

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    const data = await response.json();
    if (!data.access_token) {
      console.error("[Auth] Google API Response:", data);
      throw new Error(data.error_description || "Token exchange failed");
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[Auth] Fatal Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
