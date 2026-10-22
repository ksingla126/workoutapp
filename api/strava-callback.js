// Strava sends the user back here after they approve; we store their tokens server-side only.
import { admin, readState } from "./_lib.js";
export const config = { runtime: "edge" };
export default async function handler(req) {
  const url = new URL(req.url), back = (q) => Response.redirect(`${url.origin}/?strava=${q}`, 302);
  if (url.searchParams.get("error")) return back("denied");
  const uid = await readState(url.searchParams.get("state"));
  const code = url.searchParams.get("code");
  if (!uid || !code) return back("error");
  if (!(url.searchParams.get("scope") || "").includes("activity:read")) return back("scope");
  const t = await fetch("https://www.strava.com/oauth/token", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ client_id: process.env.STRAVA_CLIENT_ID, client_secret: process.env.STRAVA_CLIENT_SECRET, code, grant_type: "authorization_code" }),
  });
  if (!t.ok) return back("error");
  const j = await t.json();
  const r = await admin("strava_tokens", {
    method: "POST", headers: { prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: uid, athlete_id: j.athlete && j.athlete.id, access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at, updated_at: new Date().toISOString() }),
  });
  return back(r.ok ? "connected" : "error");
}
