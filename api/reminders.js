// Sends due reminders. Called every 15 minutes by a Supabase cron job (see supabase/reminders-cron.sql).
import webpush from "web-push";
import { admin } from "./_lib.js";

const TYPES = {
  workout: { text: (s) => s.type === "gym" ? `${s.name} today. Tap to start your workout.` : `${s.name || "Run"} today. Tap to see the plan.`, title: "Training today" },
  weighin: { text: () => "Monday weigh-in: step on the scale before breakfast.", title: "Weigh-in" },
  food: { text: () => "You haven't logged much food today. Add your meals before bed.", title: "Food diary" },
};
function localNow(tz) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: tz || "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false });
  const p = Object.fromEntries(f.formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, mins: (Number(p.hour) % 24) * 60 + Number(p.minute), dow: p.weekday };
}
const toMins = (hhmm) => { const [h, m] = String(hhmm || "").split(":").map(Number); return isFinite(h) ? h * 60 + (m || 0) : null; };
async function doc(uid, path) { const r = await admin(`docs?user_id=eq.${uid}&path=eq.${encodeURIComponent(path)}&select=data`); const j = r.ok ? await r.json() : []; return j[0] ? j[0].data : null; }

export default async function handler(req, res) {
  const auth = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!process.env.CRON_SECRET || auth !== process.env.CRON_SECRET) return res.status(401).json({ code: "unauthorized" });
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return res.status(500).json({ code: "vapid_not_configured" });
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

  const r = await admin("push_subs?select=*");
  const subs = r.ok ? await r.json() : [];
  let sent = 0, removed = 0;
  for (const s of subs) {
    const now = localNow(s.tz), set = s.settings || {}, last = { ...(s.last_sent || {}) };
    const day = (s.schedule || {})[now.date] || { type: "rest" };
    const due = [];
    for (const type of Object.keys(TYPES)) {
      const cfg = set[type]; if (!cfg || !cfg.on) continue;
      const at = toMins(cfg.time); if (at == null || now.mins < at || now.mins >= at + 30 || last[type] === now.date) continue;
      if (type === "workout") { if (day.type !== "gym" && day.type !== "run") continue; if (await doc(s.user_id, `profile/logs/${now.date}`)) { last[type] = now.date; continue; } }
      if (type === "weighin") { if (now.dow !== "Mon") continue; const prof = await doc(s.user_id, "profile"); if (((prof && prof.weights) || []).some((w) => w.d === now.date)) { last[type] = now.date; continue; } }
      if (type === "food") { const m = await doc(s.user_id, `profile/meals/${now.date}`); const n = ((m && m.items) || []).length + Object.values((m && m.eaten) || {}).filter(Boolean).length; if (n >= 2) { last[type] = now.date; continue; } }
      due.push(type);
    }
    let gone = false;
    for (const type of due) {
      try {
        await webpush.sendNotification(s.sub, JSON.stringify({ title: TYPES[type].title, body: TYPES[type].text(day), url: "/", tag: type }));
        last[type] = now.date; sent++;
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) { gone = true; break; }
      }
    }
    if (gone) { await admin(`push_subs?endpoint=eq.${encodeURIComponent(s.endpoint)}`, { method: "DELETE" }); removed++; }
    else if (JSON.stringify(last) !== JSON.stringify(s.last_sent || {})) await admin(`push_subs?endpoint=eq.${encodeURIComponent(s.endpoint)}`, { method: "PATCH", body: JSON.stringify({ last_sent: last }) });
  }
  res.status(200).json({ checked: subs.length, sent, removed });
}
