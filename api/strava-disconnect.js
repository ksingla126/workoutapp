// Disconnects Strava: revokes access and deletes the stored tokens.
import { json, userFrom, admin, stravaToken } from "./_lib.js";
export const config = { runtime: "edge" };
export default async function handler(req) {
  const user = await userFrom(req); if (!user) return json(401, { code: "not_signed_in" });
  const tok = await stravaToken(user.id).catch(() => null);
  if (tok) await fetch("https://www.strava.com/oauth/deauthorize", { method: "POST", headers: { authorization: `Bearer ${tok}` } }).catch(() => {});
  await admin(`strava_tokens?user_id=eq.${user.id}`, { method: "DELETE" });
  return json(200, { ok: true });
}
