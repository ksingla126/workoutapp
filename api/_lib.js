// Shared helpers for server functions (files starting with "_" aren't routes).
import { cleanUrl } from "./config.js";
export const SB = () => cleanUrl(process.env.SUPABASE_URL);
export const json = (status, body, headers = {}) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

// Who is calling? Returns the Supabase user or null.
export async function userFrom(req) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const r = await fetch(`${SB()}/auth/v1/user`, { headers: { apikey: (process.env.SUPABASE_ANON_KEY || "").trim(), authorization: `Bearer ${token}` } });
  return r.ok ? r.json() : null;
}
// Service-role REST call (bypasses row-level security; server only).
export function admin(path, init = {}) {
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  return fetch(`${SB()}/rest/v1/${path}`, { ...init, headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json", ...(init.headers || {}) } });
}
// Signed state for OAuth round trips.
async function hmac(text) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(process.env.STRAVA_CLIENT_SECRET || "x"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/[+/=]/g, (c) => ({ "+": "-", "/": "_", "=": "" }[c]));
}
export async function signState(uid) { const t = Date.now().toString(36); return `${uid}.${t}.${await hmac(uid + "." + t)}`; }
export async function readState(state) {
  const [uid, t, sig] = String(state || "").split(".");
  if (!uid || !t || !sig) return null;
  if (Date.now() - parseInt(t, 36) > 15 * 60 * 1000) return null;
  return (await hmac(uid + "." + t)) === sig ? uid : null;
}
// A valid Strava access token for this user, refreshed if needed.
export async function stravaToken(uid) {
  const r = await admin(`strava_tokens?user_id=eq.${uid}&select=*`);
  const row = r.ok ? (await r.json())[0] : null;
  if (!row) return null;
  if (row.expires_at * 1000 > Date.now() + 60000) return row.access_token;
  const t = await fetch("https://www.strava.com/oauth/token", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ client_id: process.env.STRAVA_CLIENT_ID, client_secret: process.env.STRAVA_CLIENT_SECRET, grant_type: "refresh_token", refresh_token: row.refresh_token }),
  });
  if (!t.ok) return null;
  const j = await t.json();
  await admin(`strava_tokens?user_id=eq.${uid}`, { method: "PATCH", body: JSON.stringify({ access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at, updated_at: new Date().toISOString() }) });
  return j.access_token;
}
