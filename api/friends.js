// Friends: each player who turns friends on gets a 6-character code and a small public card (name, rank letters,
// sessions this week, quest streak). Adding a code makes both people friends. Everything goes through this
// server with the service role; the tables aren't readable from the app directly.
import { json, userFrom, admin } from "./_lib.js";
export const config = { runtime: "edge" };

const ABC = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => ABC[b % ABC.length]).join("");
const num = (v, lo, hi) => (typeof v === "number" && isFinite(v) ? Math.max(lo, Math.min(hi, Math.floor(v * 1000) / 1000)) : null); // 3 decimals so divisions (thirds) come through intact
function cleanCard(c) {
  if (!c || typeof c !== "object") return null;
  const g = {}; ["upper", "lower", "core", "speed", "endur", "disc"].forEach((k) => { g[k] = num(c.g && c.g[k], 0, 5) });
  const wk = c.wk && typeof c.wk === "object" ? { done: num(c.wk.done, 0, 14), plan: num(c.wk.plan, 0, 14) } : null;
  return { ov: num(c.ov, 0, 5), ovn: num(c.ovn, 0, 5), g, wk, streak: num(c.streak, 0, 3650) };
}
async function rows(path) { const r = await admin(path); if (r.status === 404 || r.status === 400) { const t = await r.text(); if (/does not exist|relation|schema cache/i.test(t)) throw Object.assign(new Error("not_set_up"), { code: "not_set_up" }) } if (!r.ok) throw new Error("db"); return r.json() }
async function friendsOf(uid) {
  const f = await rows(`friendships?user_id=eq.${uid}&select=friend_id`);
  if (!f.length) return [];
  const ids = f.map((x) => x.friend_id).join(",");
  const cards = await rows(`player_cards?user_id=in.(${ids})&visible=eq.true&select=code,name,card,updated_at`);
  return cards.map((c) => ({ code: c.code, name: c.name, card: c.card, at: c.updated_at }));
}

export default async function handler(req) {
  if (req.method !== "POST") return json(405, { code: "method" });
  const user = await userFrom(req); if (!user) return json(401, { code: "not_signed_in" });
  if (!(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim()) return json(500, { code: "not_set_up" });
  let b = {}; try { b = await req.json() } catch (e) {}
  const uid = user.id;
  try {
    let me = (await rows(`player_cards?user_id=eq.${uid}&select=code,name,visible`))[0];
    if (b.action === "hide") { if (me) await admin(`player_cards?user_id=eq.${uid}`, { method: "PATCH", body: JSON.stringify({ visible: false }) }); return json(200, { ok: true }) }
    if (!me || b.action === "sync") {
      const name = String(b.name || (me && me.name) || "Player").replace(/[<>]/g, "").trim().slice(0, 30) || "Player";
      const patch = { name, visible: true, updated_at: new Date().toISOString(), ...(b.card ? { card: cleanCard(b.card) } : {}) };
      if (!me) {
        for (let i = 0; i < 5 && !me; i++) {
          const code = newCode();
          const r = await admin("player_cards", { method: "POST", headers: { prefer: "return=representation" }, body: JSON.stringify({ user_id: uid, code, ...patch, card: patch.card || null }) });
          if (r.ok) me = (await r.json())[0]; else if (r.status !== 409) { const t = await r.text(); if (/does not exist|relation/i.test(t)) return json(500, { code: "not_set_up" }); return json(502, { code: "db" }) }
        }
        if (!me) return json(502, { code: "db" });
      } else await admin(`player_cards?user_id=eq.${uid}`, { method: "PATCH", body: JSON.stringify(patch) });
    }
    if (b.action === "add") {
      const code = String(b.code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
      const them = (await rows(`player_cards?code=eq.${code}&select=user_id`))[0];
      if (!them || them.user_id === uid) return json(404, { code: "not_found" });
      const n = (await rows(`friendships?user_id=eq.${uid}&select=friend_id`)).length; if (n >= 100) return json(400, { code: "too_many" });
      await admin("friendships", { method: "POST", headers: { prefer: "resolution=ignore-duplicates" }, body: JSON.stringify([{ user_id: uid, friend_id: them.user_id }, { user_id: them.user_id, friend_id: uid }]) });
    }
    if (b.action === "remove") {
      const code = String(b.code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
      const them = (await rows(`player_cards?code=eq.${code}&select=user_id`))[0];
      if (them) { await admin(`friendships?user_id=eq.${uid}&friend_id=eq.${them.user_id}`, { method: "DELETE" }); await admin(`friendships?user_id=eq.${them.user_id}&friend_id=eq.${uid}`, { method: "DELETE" }) }
    }
    return json(200, { me: { code: me.code }, friends: await friendsOf(uid) });
  } catch (e) { return json(e.code === "not_set_up" ? 500 : 502, { code: e.code || "db" }) }
}
