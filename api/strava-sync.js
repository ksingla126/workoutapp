// Returns this user's recent Strava runs with the streams the app needs for its run breakdown.
import { json, userFrom, stravaToken } from "./_lib.js";
export const config = { runtime: "edge" };
export default async function handler(req) {
  const user = await userFrom(req); if (!user) return json(401, { code: "not_signed_in" });
  const tok = await stravaToken(user.id); if (!tok) return json(404, { code: "not_connected" });
  const after = Number(new URL(req.url).searchParams.get("after")) || Math.floor(Date.now() / 1000) - 14 * 86400;
  const h = { authorization: `Bearer ${tok}` };
  const r = await fetch(`https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=30`, { headers: h });
  if (r.status === 429) return json(429, { code: "rate_limited" });
  if (!r.ok) return json(502, { code: "strava_error" });
  const runs = (await r.json()).filter((a) => /Run/i.test(a.sport_type || a.type || "")).slice(0, 8);
  const out = [];
  for (const a of runs) {
    const s = await fetch(`https://www.strava.com/api/v3/activities/${a.id}/streams?keys=time,latlng,distance,heartrate,altitude,cadence&key_by_type=true`, { headers: h });
    const st = s.ok ? await s.json() : {};
    const g = (k) => (st[k] && st[k].data) || null;
    out.push({ id: a.id, name: a.name, start: a.start_date, startLocal: a.start_date_local, distance: a.distance, moving: a.moving_time, elapsed: a.elapsed_time,
      streams: { time: g("time"), latlng: g("latlng"), distance: g("distance"), heartrate: g("heartrate"), altitude: g("altitude"), cadence: g("cadence") } });
  }
  return json(200, { runs: out });
}
