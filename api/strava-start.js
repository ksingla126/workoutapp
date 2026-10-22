// Starts "Connect Strava": returns the Strava authorization URL for this user.
import { json, userFrom, signState } from "./_lib.js";
export const config = { runtime: "edge" };
export default async function handler(req) {
  if (!process.env.STRAVA_CLIENT_ID || !process.env.STRAVA_CLIENT_SECRET || !process.env.SUPABASE_SERVICE_ROLE_KEY) return json(500, { code: "not_configured" });
  const user = await userFrom(req); if (!user) return json(401, { code: "not_signed_in" });
  const origin = new URL(req.url).origin;
  const u = new URL("https://www.strava.com/oauth/mobile/authorize");
  u.searchParams.set("client_id", process.env.STRAVA_CLIENT_ID);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("redirect_uri", `${origin}/api/strava-callback`);
  u.searchParams.set("approval_prompt", "auto");
  u.searchParams.set("scope", "activity:read_all");
  u.searchParams.set("state", await signState(user.id));
  return json(200, { url: u.toString() });
}
