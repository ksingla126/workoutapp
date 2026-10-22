// Is this user's Strava connected? The app asks on open and when it comes back from the Strava screen.
import { json, userFrom, admin } from "./_lib.js";
export const config = { runtime: "edge" };
export default async function handler(req) {
  const user = await userFrom(req); if (!user) return json(401, { code: "not_signed_in" });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return json(200, { connected: false });
  const r = await admin(`strava_tokens?user_id=eq.${user.id}&select=athlete_id`);
  if (!r.ok) return json(502, { code: "database_error" });
  const row = (await r.json())[0];
  return json(200, { connected: !!row, athleteId: row ? row.athlete_id : null });
}
