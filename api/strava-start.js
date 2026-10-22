// Starts "Connect Strava": checks the server setup, then returns the Strava authorization URL for this user.
import { json, userFrom, signState, appOrigin, stravaSetupProblem } from "./_lib.js";
export const config = { runtime: "edge" };
export default async function handler(req) {
  const user = await userFrom(req); if (!user) return json(401, { code: "not_signed_in" });
  const problem = await stravaSetupProblem(); if (problem) return json(500, { code: problem });
  const u = new URL("https://www.strava.com/oauth/authorize");
  u.searchParams.set("client_id", String(process.env.STRAVA_CLIENT_ID).trim());
  u.searchParams.set("response_type", "code");
  u.searchParams.set("redirect_uri", `${appOrigin(req)}/api/strava-callback`);
  u.searchParams.set("approval_prompt", "auto");
  u.searchParams.set("scope", "read,activity:read_all");
  u.searchParams.set("state", await signState(user.id));
  return json(200, { url: u.toString() });
}
