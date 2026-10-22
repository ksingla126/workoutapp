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
// Public base URL for OAuth redirects: APP_URL if set (keeps one fixed domain for Strava), else the request's own.
export const appOrigin = (req) => (process.env.APP_URL || "").trim().replace(/\/+$/, "") || new URL(req.url).origin;
// Checks the server-only settings Strava needs; returns a problem code or "".
export async function stravaSetupProblem() {
  if (!process.env.STRAVA_CLIENT_ID || !process.env.STRAVA_CLIENT_SECRET) return "strava_keys_missing";
  if (!/^\d+$/.test(String(process.env.STRAVA_CLIENT_ID).trim())) return "strava_client_id_invalid";
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!key) return "service_key_missing";
  if (key === (process.env.SUPABASE_ANON_KEY || "").trim() || /^sb_publishable_/.test(key)) return "service_key_is_anon";
  const r = await admin("strava_tokens?select=user_id&limit=1");
  if (r.status === 401 || r.status === 403) return "service_key_invalid";
  if (r.status === 404) return "table_missing";
  if (!r.ok) { const t = await r.text(); return /does not exist|PGRST205|42P01/.test(t) ? "table_missing" : "database_error"; }
  return "";
}
export class StravaError extends Error { constructor(code, status) { super(code); this.code = code; this.status = status; } }
// A valid Strava access token for this user, refreshed if needed.
// Returns null when the user hasn't connected; throws StravaError("revoked") if Strava refuses the refresh.
export async function stravaToken(uid) {
  const r = await admin(`strava_tokens?user_id=eq.${uid}&select=*`);
  if (!r.ok) throw new StravaError("database_error", 502);
  const row = (await r.json())[0];
  if (!row) return null;
  if (row.expires_at * 1000 > Date.now() + 60000) return row.access_token;
  const t = await fetch("https://www.strava.com/oauth/token", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ client_id: process.env.STRAVA_CLIENT_ID, client_secret: process.env.STRAVA_CLIENT_SECRET, grant_type: "refresh_token", refresh_token: row.refresh_token }),
  });
  if (t.status === 400 || t.status === 401) { await admin(`strava_tokens?user_id=eq.${uid}`, { method: "DELETE" }); throw new StravaError("revoked", 404); }
  if (!t.ok) throw new StravaError("strava_error", 502);
  const j = await t.json();
  await admin(`strava_tokens?user_id=eq.${uid}`, { method: "PATCH", body: JSON.stringify({ access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at, updated_at: new Date().toISOString() }) });
  return j.access_token;
}
