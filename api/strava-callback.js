// Strava sends the user back here after they approve. Tokens are stored server-side only.
// This answers with a small page instead of jumping into the app: on iPhone the round trip happens in Safari,
// not in the Home Screen app, so the app finds out it's connected by asking /api/strava-status when reopened.
import { admin, readState, appOrigin } from "./_lib.js";
export const config = { runtime: "edge" };
const MSG = {
  connected: ["Strava connected", "Go back to the app. Your runs will import in a few seconds."],
  denied: ["Strava wasn't connected", "You cancelled on Strava. Go back to the app and tap Connect Strava to try again."],
  scope: ["Activity access needed", "Tick “View data about your activities” on the Strava screen so runs can import. Go back to the app and connect again."],
  expired: ["That link expired", "Go back to the app and tap Connect Strava again."],
  error: ["Something went wrong", "Strava didn't finish connecting. Go back to the app and try again."],
};
function page(origin, key) {
  const [title, body] = MSG[key] || MSG.error, ok = key === "connected";
  return new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0F1413;color:#E7ECEA;font:16px/1.5 system-ui,-apple-system,sans-serif;padding:24px;box-sizing:border-box}
main{max-width:360px;text-align:center}.ic{width:64px;height:64px;border-radius:50%;margin:0 auto 16px;display:grid;place-items:center;font-size:32px;background:${ok ? "#1f6b45" : "#6b1f1f"}}
h1{font-size:24px;margin:0 0 8px}p{color:#97A3A0;margin:0 0 20px}a{display:block;background:#E7ECEA;color:#0F1413;text-decoration:none;font-weight:700;padding:14px;border-radius:12px}
small{display:block;margin-top:14px;color:#97A3A0}</style></head><body><main><div class="ic">${ok ? "✓" : "!"}</div><h1>${title}</h1><p>${body}</p>
<a href="${origin}/?strava=${key}">Open the app</a><small>Using the app from your Home Screen? Close this page and open it from there.</small></main></body></html>`,
    { status: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
export default async function handler(req) {
  const url = new URL(req.url), origin = appOrigin(req);
  if (url.searchParams.get("error")) return page(origin, "denied");
  const code = url.searchParams.get("code");
  const uid = await readState(url.searchParams.get("state"));
  if (!code) return page(origin, "error");
  if (!uid) return page(origin, "expired");
  if (!/activity:read/.test(url.searchParams.get("scope") || "")) return page(origin, "scope");
  const t = await fetch("https://www.strava.com/oauth/token", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ client_id: String(process.env.STRAVA_CLIENT_ID).trim(), client_secret: String(process.env.STRAVA_CLIENT_SECRET).trim(), code, grant_type: "authorization_code" }),
  });
  if (!t.ok) return page(origin, "error");
  const j = await t.json();
  const r = await admin("strava_tokens", {
    method: "POST", headers: { prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: uid, athlete_id: j.athlete && j.athlete.id, access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at, updated_at: new Date().toISOString() }),
  });
  return page(origin, r.ok ? "connected" : "error");
}
