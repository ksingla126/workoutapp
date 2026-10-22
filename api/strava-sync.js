// Returns this user's Strava runs since `after` (epoch seconds), oldest first, with the streams the app
// needs for its run breakdown. At most 8 runs per call to stay inside Strava's rate limits; `more` says call again
// with after=`next`.
import { json, userFrom, stravaToken, StravaError } from "./_lib.js";
export const config = { runtime: "edge" };
const RUN = /^(Run|TrailRun|VirtualRun)$/;
export default async function handler(req) {
  const user = await userFrom(req); if (!user) return json(401, { code: "not_signed_in" });
  let tok;
  try { tok = await stravaToken(user.id); } catch (e) { return json(e instanceof StravaError ? e.status : 502, { code: e.code || "strava_error" }); }
  if (!tok) return json(404, { code: "not_connected" });
  const after = Math.max(0, Number(new URL(req.url).searchParams.get("after")) || Math.floor(Date.now() / 1000) - 14 * 86400);
  const h = { authorization: `Bearer ${tok}` };
  // `after` lists oldest first; read up to 3 pages so a long gap isn't cut short
  let acts = [];
  for (let page = 1; page <= 3; page++) {
    const r = await fetch(`https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=50&page=${page}`, { headers: h });
    if (r.status === 429) return json(429, { code: "rate_limited" });
    if (r.status === 401) return json(404, { code: "revoked" });
    if (!r.ok) return json(502, { code: "strava_error" });
    const list = await r.json(); acts = acts.concat(list); if (list.length < 50) break;
  }
  acts.sort((a, b) => Date.parse(a.start_date) - Date.parse(b.start_date));
  const runs = acts.filter((a) => RUN.test(a.sport_type || a.type || ""));
  const batch = runs.slice(0, 8), out = [];
  for (const a of batch) {
    let streams = {};
    if (!a.manual) {
      const s = await fetch(`https://www.strava.com/api/v3/activities/${a.id}/streams?keys=time,latlng,distance,heartrate,altitude,cadence&key_by_type=true`, { headers: h });
      if (s.status === 429) break; // keep what we have; the app will ask again later
      if (s.ok) { const st = await s.json(); const g = (k) => (st[k] && st[k].data) || null; streams = { time: g("time"), latlng: g("latlng"), distance: g("distance"), heartrate: g("heartrate"), altitude: g("altitude"), cadence: g("cadence") }; }
    }
    out.push({ id: a.id, name: a.name, type: a.sport_type || a.type, start: a.start_date, startLocal: a.start_date_local, distance: a.distance, moving: a.moving_time, elapsed: a.elapsed_time,
      avgHr: a.average_heartrate || null, maxHr: a.max_heartrate || null, elevM: a.total_elevation_gain ?? null, cadence: a.average_cadence || null, manual: !!a.manual, streams });
  }
  const last = out[out.length - 1];
  const more = out.length < runs.length;
  return json(200, { runs: out, more, next: more && last ? Math.floor(Date.parse(last.start) / 1000) : null });
}
