/* RankUp Quests: the System's Daily Quest, Weekly Quests, Gate Quests and Paths.
   Everything checks itself from what's logged (workouts, food, weigh-ins); only things the app can't see get a tick.
   Quests never touch ranks: Discipline stays based on training consistency.
   State lives in S.profile.quests: {since, ticks:{day:{id:true}}, seen:{day:[ids]}, paths:[...], offers:[...], declined:{id:day}, scanAt, aboutSeen} */

const Q_RESET_H = 4;          // a quest day runs 4 a.m. to 4 a.m., so a late workout still counts
const Q_MAX_PATHS = 5;
const Q_PATH_DAYS = 30;

function qState() {
  const P = S.profile; if (!P.quests || typeof P.quests !== "object") P.quests = {};
  const Q = P.quests; Q.ticks = Q.ticks || {}; Q.seen = Q.seen || {}; Q.paths = Q.paths || []; Q.offers = Q.offers || []; Q.declined = Q.declined || {};
  return Q;
}
function questDay() { return ymd(new Date(Date.now() - Q_RESET_H * 3600e3)) }
const qAdd = (k, n) => ymd(addDays(parseYmd(k), n));
const qMon = k => { const d = parseYmd(k); return ymd(addDays(d, -((d.getDay() + 6) % 7))) };
const qHash = s => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h };
const qTick = (k, id) => !!(qState().ticks[k] && qState().ticks[k][id]);
function qSetTick(k, id, on) { const Q = qState(); const t = { ...(Q.ticks[k] || {}) }; if (on) t[id] = true; else delete t[id]; if (Object.keys(t).length) Q.ticks[k] = t; else delete Q.ticks[k]; qPrune(); saveProfile() }
function qPrune() { const Q = qState(), cut = qAdd(questDay(), -400), cut2 = qAdd(questDay(), -14);
  Object.keys(Q.ticks).forEach(k => { if (k < cut) delete Q.ticks[k] }); Object.keys(Q.seen).forEach(k => { if (k < cut2) delete Q.seen[k] }) }
// quests start the first day the app shows them; days before don't count against the streak
function qSince() { const Q = qState(); if (!Q.since) { Q.since = questDay(); saveProfile() } return Q.since }

/* ---------- Paths library ----------
   Only creatine and protein paths carry an amount. No other supplement doses, ever. */
const PATHS = {
  creatine: { name: "Creatine", obj: "Take 5 g of creatine", note: "Creatine monohydrate, any time of day, with water. Talk to a doctor first if you have kidney problems.",
    kw: /\bcreatine\b/i, checks: { 1: "Same time each day makes it automatic. No loading phase needed.", 7: "Up 1–3 lb on the scale? That's water stored in your muscles, not fat. Normal.", 21: "Most people notice an extra rep or two around now.", 30: "30 days in. Creatine works as long as you keep taking it." } },
  shake: { name: "Protein shake", obj: "Have a protein shake (about 25–30 g protein)", note: "Easiest after training or with breakfast. Counts toward your protein goal.",
    kw: /\bprotein (shakes?|powder)\b|\bwhey\b/i, checks: { 7: "Log it in Food so it counts toward your protein goal.", 30: "A shake a day is about 800 g of extra protein a month." } },
  protein: { name: "Protein goal", obj: "Hit your protein goal", auto: "protein", note: "Checks itself from your food log.",
    kw: /\b(more protein|hit(ting)? (my )?protein|protein goal|eat(ing)? enough protein)\b/i, checks: { 7: "Spread it out: 30–40 g a meal is easier than one huge one.", 30: "A month of hitting protein is what makes the training stick." } },
  sleep: { name: "Sleep", obj: "Get 7–9 hours of sleep", note: "Same bedtime every night, phone away 30 minutes before.",
    kw: /\b(sleep(ing)? (more|better|earlier)|more sleep|bed ?time|go(ing)? to bed earlier|fix my sleep)\b/i, checks: { 7: "Recovery happens while you sleep. Watch your lifts this week.", 30: "A month of good sleep. Keep the same bedtime on weekends too." } },
  water: { name: "Hydration", obj: "Drink water with every meal and during training", note: "Pale-yellow pee means you're on track.",
    kw: /\b(drink(ing)? (more )?water|hydrat(e|ion|ed))\b/i, checks: { 7: "Keep a bottle where you can see it.", 30: "Hydration habit locked in." } },
  nosoda: { name: "No soda", obj: "No soda today", note: "Sparkling water or diet versions work as a swap.",
    kw: /\b(quit(ting)?|cut(ting)? (out|back on)?|stop(ping)?|no( more)?|less) (drinking )?(soda|pop|coke)\b/i, quitOk: true, checks: { 7: "One week. The cravings usually fade after the first two.", 30: "A month without soda." } },
  walk: { name: "Daily walk", obj: "Walk 30 minutes (or 8,000+ steps)", note: "Easy pace. It speeds up recovery and burns fat without hurting your training.",
    kw: /\b(10k steps|10,?000 steps|walk(ing)? more|daily walks?|get(ting)? (my |more )?steps)\b/i, checks: { 7: "Walks after meals help digestion and blood sugar.", 30: "30 days of walking. That's roughly 15 extra miles." } },
  pushups: { name: "Daily push-ups", obj: "Do {n} push-ups (any number of sets)", ramp: [20, 30, 40, 50], note: "Full range, chest to the floor. Knees down is fine to start.",
    kw: /\b(push-?ups? (every ?day|daily|a day)|daily push-?ups?|push-?up challenge)\b/i, checks: { 7: "Step up: 30 a day this week.", 14: "40 a day now.", 21: "Final week: 50 a day.", 30: "You can do 50 a day. Test a single max set." } },
  pullup: { name: "Pull-up progression", obj: "Pull-up practice: 3 dead hangs or slow negatives", note: "Negatives: jump to the top, lower yourself over 3–5 seconds.",
    kw: /\b((first|a|more|my) pull-?ups?|pull-?up progression|can'?t do (a |any )?pull-?ups?|learn(ing)? (to do )?pull-?ups?)\b/i, checks: { 7: "Try a single pull-up at the end of each week.", 30: "Test it: how many clean pull-ups now?" } },
  mobility: { name: "Mobility", obj: "10 minutes of mobility", note: "Use the rest-day routine on Home, or any stretches that feel tight.",
    kw: /\b(stretch(ing)? (more|daily|every ?day)|mobility|more flexib\w*|get(ting)? flexib\w*)\b/i, checks: { 7: "Tight hips and shoulders loosen fastest. Keep at it.", 30: "A month of mobility. Your squat depth will show it." } },
  cook: { name: "Cook at home", obj: "Cook one meal at home", note: "Batch-cook twice a week and it's mostly reheating.",
    kw: /\b(cook(ing)? (more|at home|my own)|meal ?prep(ping)?|stop eating out|eat(ing)? out less)\b/i, checks: { 7: "Pick 2 recipes you like and rotate them.", 30: "A month of home cooking." } },
};
const PATH_ORDER = ["creatine", "shake", "protein", "sleep", "water", "nosoda", "walk", "pushups", "pullup", "mobility", "cook"];
// never offered, and refused for custom paths
const Q_BLOCK = /\b(steroids?|sarms?|test(osterone)? (boost|cycle|e\b)|trt|tren|anavar|clen(buterol)?|hgh|peptides?|fat ?burners?|diet pills?|laxatives?|diuretics?|water fast|dry fast|(\d+)[- ]?(day|hour) fast|starv\w*|purg\w*|ephedrin\w*|dnp|stimulants?|caffeine pills?|pre-?workout|800 calories|500 calories|under 1,?000 calories)\b/i;
const Q_DOSE = /\b\d+(\.\d+)?\s?(mg|mcg|µg|iu|g|grams?|ml|capsules?|caps|pills?|tablets?|scoops?|servings?)\b|\b(vitamin|supplement|melatonin|ashwagandha|magnesium|zinc|caffeine|fish oil|omega|nootropic|bcaa|glutamine|beta-alanine)\b/i;

function qPathDef(P) { return P.custom ? P.custom : PATHS[P.id] }
function qPathObj(P, k) {
  const D = qPathDef(P); if (!D) return "";
  if (D.ramp) { const wk = Math.min(D.ramp.length - 1, Math.floor(qDayNo(P, k) / 7)); return D.obj.replace("{n}", D.ramp[wk]) }
  if (D.auto === "protein") return `Hit ${Math.round(dayProtein(parseYmd(k)))} g protein`;
  return D.obj;
}
const qDayNo = (P, k) => Math.max(0, Math.round((parseYmd(k) - parseYmd(P.start)) / 864e5)); // 0-based
const qPathLen = P => P.status === "habit" ? 0 : ((qPathDef(P) || {}).days || Q_PATH_DAYS);
function qPathDone(P, k) { const D = qPathDef(P); if (D && D.auto === "protein") return dayEaten(k).p >= dayProtein(parseYmd(k)) * 0.98; return qTick(k, "path:" + P.id) }
function qActivePaths(k) { return qState().paths.filter(P => (P.status === "active" || P.status === "habit") && P.start <= k) }
function qPathEnded(P, k) { const n = qPathLen(P); return n && qDayNo(P, k) >= n }

/* ---------- Daily Quest ---------- */
function qPlan(k) { try { return planFor(parseYmd(k)) } catch (e) { return null } }
function dailyQuest(k) {
  const p = qPlan(k); if (!p) return null;
  const l = S.logs[k], d = parseYmd(k), out = [];
  if (p.type === "gym" || p.type === "run") {
    const done = !!(l && (l.type === "gym" || l.type === "run"));
    out.push({ id: "train", t: p.type === "gym" ? `Complete today's workout: ${p.name}` : `Complete today's run${p.t ? ": " + p.t : ""}`, done, go: "train" });
  } else {
    const f = MOBILITY[mobilityFocus(d)];
    out.push({ id: "mob", t: `10-minute mobility · ${f.t}`, done: qTick(k, "mob"), tick: true, go: "mob" });
  }
  const ptg = Math.round(dayProtein(d)), pe = dayEaten(k).p;
  out.push({ id: "protein", t: `Hit ${ptg} g protein`, done: pe >= ptg * 0.98, prog: Math.min(1, pe / ptg), progTxt: `${Math.round(pe)} / ${ptg} g`, go: "food" });
  // rotating bonus, picked the same way all day
  const pool = [];
  if (p.type === "gym") { const ex = (p.ex || []).find(e => !e.fixed && !finalTarget(e, k).first); if (ex) pool.push("target:" + ex.id); pool.push("notes") }
  else if (p.type === "run") pool.push("notes", "rpe");
  else pool.push("weigh", "walk");
  const pick = pool[qHash(k + (S.profile.quests && S.profile.quests.since || "")) % pool.length];
  if (pick.startsWith("target:")) {
    const ex = p.ex.find(e => e.id === pick.slice(7)), t = finalTarget(ex, k), sets = (l && l.ex && l.ex[ex.id] || []).filter(s => s.t !== "w"), f = fmtOf(ex);
    const hit = sets.length >= ex.sets && sets.slice(0, ex.sets).every((s, i) => valOf(f, s) >= (t.reps[i] || ex.lo) && (!hasW(ex) || t.w == null || (Number(s.w) || 0) >= t.w - 0.01));
    const tw = t.w != null && hasW(ex) ? `${toU(t.w)} ${uL()} × ` : "";
    out.push({ id: "bonus", t: `Hit today's target on ${ex.name}: ${tw}${t.reps.join(", ")}`, done: hit, go: "train" });
  } else if (pick === "notes") out.push({ id: "bonus", t: "Write a note on how it felt", done: !!(l && l.notes && l.notes.trim()), go: "train" });
  else if (pick === "rpe") out.push({ id: "bonus", t: "Rate your run's effort (1–10)", done: !!(l && l.rpe), go: "train" });
  else if (pick === "weigh") out.push({ id: "bonus", t: "Log your weight", done: (S.profile.weights || []).some(w => w.d === k), go: "weigh" });
  else out.push({ id: "bonus", t: "Easy 20–30 minute walk", done: qTick(k, "walk"), tick: true, tid: "walk" });
  return { k, items: out, done: out.every(x => x.done) };
}
const dqDone = k => { const q = dailyQuest(k); return !!(q && q.done) };
// consecutive days with the Daily Quest done (today counts once it's done)
function qStreak(k) {
  k = k || questDay(); const since = qSince(); let n = 0, d = dqDone(k) ? k : qAdd(k, -1);
  for (let i = 0; i < 400 && d >= since; i++, d = qAdd(d, -1)) { if (!qPlan(d)) break; if (dqDone(d)) n++; else break }
  return n;
}
// missed yesterday: a Penalty Quest today. It costs nothing but the streak; clearing it is optional.
function qPenalty(k) { const y = qAdd(k, -1); if (y < qSince() || !qPlan(y) || dqDone(y)) return null; return { id: "pen", t: "Penalty Quest: 15-minute walk", done: qTick(k, "pen"), tick: true } }

/* ---------- Weekly and Gate Quests ---------- */
function weeklyQuests(k) {
  const mon = qMon(k), out = [];
  try { const w = rkWeekSessions(mon, k); if (w.plan) out.push({ id: "disc", t: `Discipline: ${w.need} of ${w.plan} sessions`, done: w.done >= w.need, prog: Math.min(1, w.done / w.need), progTxt: `${w.done} / ${w.need}` }) } catch (e) {}
  const since = qSince(); let dq = 0, avail = 0;
  for (let i = 0; i < 7; i++) { const d = qAdd(mon, i); if (d < since || !qPlan(d)) continue; avail++; if (d <= k && dqDone(d)) dq++ }
  const need = Math.min(5, avail); if (need) out.push({ id: "dq", t: `Clear ${need} Daily Quests`, done: dq >= need, prog: Math.min(1, dq / need), progTxt: `${dq} / ${need}` });
  let pr = false; for (let i = 0; i < 7; i++) { const l = S.logs[qAdd(mon, i)]; if (l && l.prs && l.prs.length) pr = true }
  out.push({ id: "pr", t: "Set a PR", done: pr });
  return { mon, items: out };
}
function gateQuests(k) {
  const out = []; try {
    const R = rankState(), C = RKC(), mon = qMon(k);
    R.parts.forEach(p => { const P = R.part[p]; if (!P || P.excl || !P.gate || !P.gate.open) return;
      const o = (rkGateOptions(p, P.gate.to) || [])[0]; out.push({ id: "gate:" + p, p, to: P.gate.to, t: `Clear the ${C.parts[p].name} Gate → ${rkLetter(P.gate.to)}`, sub: o ? `${o.name}: ${o.txt}` : "", done: false }) });
    R.events.filter(e => e.t === "up" && e.p !== "disc" && e.d >= mon && e.d <= k).forEach(e => out.push({ id: "gate:" + e.p + ":" + e.to, p: e.p, to: e.to, t: `${C.parts[e.p] ? C.parts[e.p].name : rkPartName(e.p)} Gate cleared → ${rkLetter(e.to)}`, done: true }));
  } catch (e) {}
  return out;
}

/* ---------- Detecting paths from what you tell the System ---------- */
function qDetect(text) {
  const found = []; if (!text) return found;
  String(text).split(/(?<=[.!?\n])\s+/).forEach(sen => {
    if (Q_BLOCK.test(sen)) return;
    PATH_ORDER.forEach(id => { const D = PATHS[id], m = sen.match(D.kw); if (!m) return;
      const before = sen.slice(0, m.index); if (!D.quitOk && /\b(stop(ped)?|quit|no longer|don'?t|not|never|can'?t take|allergic)\b[^.]*$/i.test(before)) return;
      if (!found.includes(id)) found.push(id) });
  });
  return found;
}
function qOffer(ids, src) {
  const Q = qState(), k = questDay(); let added = [];
  ids.forEach(id => { if (!PATHS[id]) return; if (Q.paths.some(P => P.id === id && (P.status === "active" || P.status === "habit"))) return;
    if (Q.offers.some(o => o.id === id)) return; if (Q.declined[id] && qAdd(Q.declined[id], 30) > k) return; // don't nag: 30 days after "Not now"
    Q.offers.push({ id, at: k, src }); added.push(id) });
  if (added.length) { saveProfile(); const D = PATHS[added[0]]; if (typeof sysNotice === "function") sysNotice(`New path detected: ${D.name}`, `${qPathObjRaw(added[0])}. Accept it on Home.`, null) }
  return added;
}
const qPathObjRaw = id => PATHS[id].ramp ? PATHS[id].obj.replace("{n}", PATHS[id].ramp[0]) : PATHS[id].auto === "protein" ? "Hit your protein goal daily" : PATHS[id].obj;
// look at anything new you've written: coach chat, About me, workout and run notes
// only saves when there was something new to read, so it never adds writes to an ordinary render
function qScan() {
  const Q = qState(); let ids = [], hi = Q.scanAt || 0, changed = false;
  if (!Q.scanAt) { Q.scanAt = hi = Date.now(); changed = true }
  (S.chat || []).forEach(m => { const t = m.t || 0; if (m.role === "user" && t > Q.scanAt) { ids.push(...qDetect(m.content)); hi = Math.max(hi, t) } });
  Object.values(S.logs || {}).forEach(l => { const t = (l && l.savedAt) || 0; if (l && l.notes && t > Q.scanAt) { ids.push(...qDetect(l.notes)); hi = Math.max(hi, t) } });
  const ab = String(S.profile.about || ""), h = String(qHash(ab)); if (ab && Q.aboutSeen !== h) { ids.push(...qDetect(ab)); Q.aboutSeen = h; changed = true }
  if (hi > Q.scanAt) { Q.scanAt = hi; changed = true }
  if (ids.length) qOffer([...new Set(ids)], "chat");
  if (changed) saveProfile();
}

/* ---------- Path actions ---------- */
function qAccept(id, custom) {
  const Q = qState(), k = questDay(), act = Q.paths.filter(P => P.status === "active" || P.status === "habit");
  Q.offers = Q.offers.filter(o => o.id !== id);
  if (act.length >= Q_MAX_PATHS) { saveProfile(); toast(`You can run ${Q_MAX_PATHS} paths at once. Finish or drop one first.`); return false }
  Q.paths = Q.paths.filter(P => P.id !== id || P.status === "active" || P.status === "habit");
  if (Q.paths.some(P => P.id === id)) { saveProfile(); return false }
  Q.paths.push({ id, start: k, status: "active", ...(custom ? { custom } : {}) });
  delete Q.declined[id]; saveProfile();
  const D = custom || PATHS[id]; if (typeof sysNotice === "function") sysNotice(`Path accepted: ${D.name}`, `Day 1 of ${D.days || Q_PATH_DAYS}. It's on your Daily Quest.`, null);
  return true;
}
function qDecline(id) { const Q = qState(); Q.offers = Q.offers.filter(o => o.id !== id); Q.declined[id] = questDay(); saveProfile() }
function qPathSet(id, status) { const Q = qState(), P = Q.paths.find(x => x.id === id && (x.status === "active" || x.status === "habit")); if (!P) return; P.status = status; P.end = questDay(); saveProfile() }

/* ---------- Screens ---------- */
const qChk = (on, attr, label) => `<button type="button" class="q-chk ${on ? "on" : ""}" ${attr} aria-pressed="${on}" aria-label="${esc(label)}">${on ? "✓" : ""}</button>`;
const qDot = on => `<span class="q-chk static ${on ? "on" : ""}" aria-hidden="true">${on ? "✓" : ""}</span>`;
function qRow(x, k) {
  const box = x.tick ? qChk(x.done, `data-qtick="${k}|${x.tid || x.id}"`, x.t) : qDot(x.done);
  return `<div class="q-row ${x.done ? "done" : ""}">${box}<div class="q-tx"><span>${esc(x.t)}</span>${x.sub ? `<span class="small muted">${esc(x.sub)}</span>` : ""}${x.prog != null && !x.done ? `<div class="q-bar"><i style="width:${Math.round(x.prog * 100)}%"></i></div>` : ""}</div>${x.progTxt ? `<span class="q-n num">${esc(x.progTxt)}</span>` : ""}</div>`;
}
function qPathRow(P, k) {
  const D = qPathDef(P), n = qPathLen(P), day = qDayNo(P, k) + 1, done = qPathDone(P, k), auto = D.auto === "protein";
  const box = auto ? qDot(done) : qChk(done, `data-qtick="${k}|path:${P.id}"`, qPathObj(P, k));
  return `<div class="q-row path ${done ? "done" : ""}">${box}<div class="q-tx"><span>${esc(qPathObj(P, k))}</span><span class="small muted">Path · ${esc(D.name)} · ${n ? `day ${Math.min(day, n)} of ${n}` : "daily habit"}</span></div></div>`;
}
function qOfferCard(o) {
  const D = PATHS[o.id]; if (!D) return "";
  return `<div class="q-offer"><div class="q-sys">[SYSTEM] NEW PATH DETECTED</div><b>${esc(D.name)}</b><span class="small">Daily quest: ${esc(qPathObjRaw(o.id))}. ${Q_PATH_DAYS} days.</span>${D.note ? `<span class="small muted">${esc(D.note)}</span>` : ""}
    <div class="row" style="gap:8px;margin-top:6px"><button type="button" class="btn sm" data-qaccept="${o.id}">Accept</button><button type="button" class="btn ghost sm" data-qdecline="${o.id}">Not now</button></div></div>`;
}
function qEndCard(P, k) {
  const D = qPathDef(P), n = qPathLen(P); let hit = 0; for (let i = 0; i < n; i++) { const d = qAdd(P.start, i); if (d < k && qPathDone(P, d)) hit++ }
  return `<div class="q-offer end"><div class="q-sys">[SYSTEM] PATH COMPLETE</div><b>${esc(D.name)}: ${hit} of ${n} days</b><span class="small">Keep it on your Daily Quest as a habit?</span>
    <div class="row" style="gap:8px;margin-top:6px"><button type="button" class="btn sm" data-qhabit="${P.id}">Keep as a habit</button><button type="button" class="btn ghost sm" data-qfinish="${P.id}">Finish path</button></div></div>`;
}
function qCheckin(P, k) { const D = qPathDef(P), c = D && D.checks && D.checks[qDayNo(P, k) + 1]; return c ? `<p class="small q-check"><b>${esc(D.name)}, day ${qDayNo(P, k) + 1}:</b> ${esc(c)}</p>` : "" }

// the Daily Quest card at the top of Home
function questCard() {
  try {
    const k = questDay(); qSince(); const q = dailyQuest(k); if (!q) return "";
    const Q = qState(), pen = qPenalty(k), paths = qActivePaths(k), streak = qStreak(k);
    const ending = paths.filter(P => qPathEnded(P, k)), live = paths.filter(P => !qPathEnded(P, k));
    const n = q.items.filter(x => x.done).length, late = k !== ymd(today);
    let h = `<section class="card q-card ${q.done ? "complete" : ""}" aria-label="Daily Quest"><div class="q-head"><div><div class="q-sys">[SYSTEM] DAILY QUEST${late ? " · ends 4 a.m." : ""}</div><h2>${q.done ? "Quest complete" : "Preparation to become stronger"}</h2></div>
      <div class="q-meta"><b class="num">${n}/${q.items.length}</b><span class="small muted">${streak ? `${streak}-day streak` : "Streak 0"}</span></div></div>`;
    h += `<div class="q-list">${q.items.map(x => qRow(x, k)).join("")}</div>`;
    if (pen) h += `<div class="q-list pen">${qRow(pen, k)}<p class="small muted" style="margin:0">Yesterday's quest was missed. Optional: the streak already reset.</p></div>`;
    if (live.length) h += `<div class="q-list paths">${live.map(P => qPathRow(P, k)).join("")}</div>${live.map(P => qCheckin(P, k)).join("")}`;
    h += Q.offers.map(qOfferCard).join("") + ending.map(P => qEndCard(P, k)).join("");
    h += `<div class="row between q-foot"><button type="button" class="link small" data-qlog="1">Quest log</button><button type="button" class="link small" data-qpaths="1">+ Start a path</button></div></section>`;
    return h;
  } catch (e) { try { console.warn("quests", e) } catch (_) {} return "" }
}
// Quest Log on the Ranks tab
function questLog() {
  try {
    const k = questDay(); qSince(); const q = dailyQuest(k), w = weeklyQuests(k), g = gateQuests(k), Q = qState(), streak = qStreak(k);
    const act = Q.paths.filter(P => P.status === "active" || P.status === "habit"), past = Q.paths.filter(P => P.status === "done").slice(-5).reverse();
    let h = `<div class="card q-logcard" id="questLog"><div class="row between"><h2>Quest log</h2><span class="chip num">${streak}-day streak</span></div>`;
    if (q) h += `<div class="eyebrow">Daily Quest · ${q.items.filter(x => x.done).length}/${q.items.length}</div><div class="q-list">${q.items.map(x => qRow(x, k)).join("")}</div>`;
    h += `<div class="eyebrow">Weekly · resets Monday</div><div class="q-list">${w.items.map(x => qRow(x, k)).join("")}</div>`;
    h += `<div class="eyebrow">Gate quests</div>${g.length ? `<div class="q-list">${g.map(x => qRow(x, k)).join("")}</div>` : `<p class="small muted" style="margin:0">None open. A Gate opens when you're strong enough for the next rank.</p>`}`;
    h += `<div class="eyebrow">Paths · ${act.length} of ${Q_MAX_PATHS}</div>${act.length ? `<div class="q-list">${act.map(P => qPathLog(P, k)).join("")}</div>` : `<p class="small muted" style="margin:0">Tell the System you're starting something (creatine, sleep, push-ups…) or pick one.</p>`}
      <button type="button" class="btn ghost sm" data-qpaths="1" style="align-self:flex-start">+ Start a path</button>`;
    if (past.length) h += `<p class="small muted" style="margin:0">Finished: ${past.map(P => esc(qPathDef(P).name)).join(", ")}</p>`;
    return h + `</div>`;
  } catch (e) { try { console.warn("quests", e) } catch (_) {} return "" }
}
function qPathLog(P, k) {
  const D = qPathDef(P), n = qPathLen(P), day = qDayNo(P, k) + 1; let hit = 0; const span = n ? Math.min(day, n) : Math.min(day, 30);
  for (let i = 0; i < span; i++) { const d = qAdd(k, -i); if (d >= P.start && qPathDone(P, d)) hit++ }
  return `<div class="q-row path"><div class="q-tx"><span><b>${esc(D.name)}</b></span><span class="small muted">${n ? `Day ${Math.min(day, n)} of ${n} · done ${hit} of ${span}` : `Habit · ${hit} of the last ${span} days`}</span>${n ? `<div class="q-bar"><i style="width:${Math.round(Math.min(day, n) / n * 100)}%"></i></div>` : ""}</div>
    <button type="button" class="link small" data-qdrop="${P.id}">${P.status === "habit" ? "Stop" : "Drop"}</button></div>`;
}
// sheet: start a path from the library, or describe your own
function pathsHtml() {
  const Q = qState(), act = Q.paths.filter(P => P.status === "active" || P.status === "habit"), full = act.length >= Q_MAX_PATHS, W = SH.custom || {};
  let h = `<div class="xs-head"><h2>Start a path</h2><button type="button" class="btn ghost sm" data-xs="close">Close</button></div>
    <p class="small muted" style="margin:0">${Q_PATH_DAYS} days, one daily objective on your Daily Quest. ${act.length} of ${Q_MAX_PATHS} running.</p>`;
  h += `<div class="q-lib">${PATH_ORDER.map(id => { const D = PATHS[id], on = act.some(P => P.id === id);
    return `<button type="button" class="q-libitem ${on ? "on" : ""}" ${on || full ? "disabled" : ""} data-qstart="${id}"><b>${esc(D.name)}</b><span class="small muted">${esc(qPathObjRaw(id))}</span>${on ? `<span class="q-tag">Running</span>` : ""}</button>` }).join("")}</div>`;
  h += `<div class="eyebrow" style="margin-top:6px">Your own path</div>`;
  if (W.busy) h += `<p class="small"><span class="pulse"></span> The System is designing your path…</p>`;
  else if (W.draft) { const d = W.draft; h += `<div class="q-offer"><div class="q-sys">[SYSTEM] CUSTOM PATH</div><b>${esc(d.name)}</b><span class="small">Daily quest: ${esc(d.obj)}. ${d.days} days.</span>${d.note ? `<span class="small muted">${esc(d.note)}</span>` : ""}
      <div class="row" style="gap:8px;margin-top:6px"><button type="button" class="btn sm" data-qcustom="accept" ${full ? "disabled" : ""}>Accept</button><button type="button" class="btn ghost sm" data-qcustom="redo">Try again</button></div></div>` }
  else h += `<div class="field"><label for="qGoal">What do you want to start?</label><input id="qGoal" data-xs-focus="qgoal" placeholder="e.g. learn to do a muscle-up" value="${esc(W.goal || "")}" maxlength="120"></div>
      ${W.err ? `<p class="small" style="color:var(--bad);margin:0">${esc(W.err)}</p>` : ""}<button type="button" class="btn ghost sm" data-qcustom="go" ${full ? "disabled" : ""} style="align-self:flex-start">Design it</button>`;
  return h;
}
async function qDesign(goal) {
  goal = String(goal || "").trim().slice(0, 120); SH.custom = { goal };
  if (!goal) { SH.custom.err = "Describe what you want to start."; paintSheet(); return }
  if (Q_BLOCK.test(goal)) { SH.custom.err = "The System doesn't build paths for that."; paintSheet(); return }
  if (Q_DOSE.test(goal) && !/\b(creatine|protein)\b/i.test(goal)) { SH.custom.err = "Supplement paths are limited to creatine and protein. Pick one from the list."; paintSheet(); return }
  const lib = PATH_ORDER.find(id => PATHS[id].kw.test(goal)); if (lib) { SH.custom = { goal }; xsClose(); qAccept(lib); lastRenderKey = ""; render(); return }
  if (!sampleFn) { SH.custom.err = "Custom paths need the coach to be connected. Pick one from the list."; paintSheet(); return }
  SH.custom.busy = true; paintSheet();
  const prompt = `You design a 30-day habit "path" for a fitness app. The user wants to: "${goal}".
Reply with ONLY JSON: {"name":"2-4 words","obj":"one daily action they tick off, under 70 characters, doable in under 30 minutes","days":30,"note":"one practical tip under 110 characters","checks":{"7":"tip","14":"tip","30":"tip"}}
Rules: training, mobility, cooking, sleep and lifestyle habits only. Never mention supplements, vitamins, medications, doses, calorie cuts, fasting or weight-loss targets. If the goal is unsafe or about those things, reply {"refuse":true}.`;
  try {
    const r = await sampleFn.json(prompt, { modelTier: "default", cache: false });
    const all = r ? JSON.stringify(r) : "";
    if (!r || r.refuse || !r.name || !r.obj || Q_BLOCK.test(all) || Q_DOSE.test(all.replace(/\b\d+\s?(min(utes?)?|sec(onds?)?|reps?|sets?|days?|weeks?|hours?|steps?)\b/gi, ""))) throw { code: "refused" };
    const clean = s => String(s || "").replace(/\s+/g, " ").trim();
    const checks = {}; Object.entries(r.checks || {}).forEach(([d, t]) => { const n = Math.round(Number(d)); if (n >= 1 && n <= 30 && clean(t)) checks[n] = clean(t).slice(0, 140) });
    if (!SH || SH.kind !== "paths") return;
    SH.custom = { goal, draft: { name: clean(r.name).slice(0, 32), obj: clean(r.obj).slice(0, 80), days: Q_PATH_DAYS, note: clean(r.note).slice(0, 120), checks } };
  } catch (e) { if (!SH || SH.kind !== "paths") return; SH.custom = { goal, err: e && e.code === "refused" ? "The System can't build that one. Try a training or lifestyle habit." : "Couldn't design it just now. Try again." } }
  paintSheet();
}

/* ---------- Notices when objectives complete ---------- */
function questNotify() {
  try {
    if (!(S.profile && (S.profile.setup || Object.keys(S.logs).length))) return;
    qScan();
    const k = questDay(), q = dailyQuest(k); if (!q) return;
    const Q = qState(), seen = new Set(Q.seen[k] || []), fresh = [];
    q.items.forEach(x => { if (x.done && !seen.has(x.id)) fresh.push(x) });
    const pathsDone = qActivePaths(k).filter(P => !qPathEnded(P, k) && qPathDone(P, k) && !seen.has("path:" + P.id));
    if (!fresh.length && !pathsDone.length && !(q.done && !seen.has("all"))) return;
    fresh.forEach(x => seen.add(x.id)); pathsDone.forEach(P => seen.add("path:" + P.id));
    let msg = null;
    if (q.done && !seen.has("all")) { seen.add("all"); msg = ["Daily Quest complete", `${qStreak(k)}-day streak. Resets at 4 a.m.`] }
    else if (fresh.length) msg = ["Quest objective complete", fresh[fresh.length - 1].t];
    Q.seen[k] = [...seen]; saveProfile();
    if (msg && typeof sysNotice === "function" && !document.querySelector(".rk-up")) setTimeout(() => sysNotice(msg[0], msg[1], null), 400);
  } catch (e) { try { console.warn("quests", e) } catch (_) {} }
}

/* ---------- Taps ---------- */
document.addEventListener("click", e => {
  const t = e.target.closest && e.target.closest("button"); if (!t) return; const d = t.dataset, redo = () => { lastRenderKey = ""; render() };
  if (d.qtick) { const [k, id] = d.qtick.split("|"); qSetTick(k, id, !qTick(k, id)); redo(); questNotify(); return }
  if (d.qaccept) { qAccept(d.qaccept); redo(); return }
  if (d.qdecline) { qDecline(d.qdecline); redo(); return }
  if (d.qhabit) { qPathSet(d.qhabit, "habit"); toast("Kept as a daily habit"); redo(); return }
  if (d.qfinish) { qPathSet(d.qfinish, "done"); toast("Path finished"); redo(); return }
  if (d.qdrop) { qPathSet(d.qdrop, "done"); toast("Path dropped"); redo(); return }
  if (d.qpaths) { openSheet({ kind: "paths" }); return }
  if (d.qstart) { if (qAccept(d.qstart)) { xsClose(); redo() } return }
  if (d.qcustom) { if (!SH || SH.kind !== "paths") return;
    if (d.qcustom === "go") { const v = (document.getElementById("qGoal") || {}).value; qDesign(v); return }
    if (d.qcustom === "redo") { qDesign((SH.custom || {}).goal); return }
    if (d.qcustom === "accept" && SH.custom && SH.custom.draft) { const dr = SH.custom.draft, id = "c-" + qHash(dr.name + Date.now()).toString(36); if (qAccept(id, dr)) { xsClose(); redo() } return } }
  if (d.qlog) { tab = "ranks"; redo(); setTimeout(() => { const el = document.getElementById("questLog"); if (el) el.scrollIntoView({ block: "start", behavior: "smooth" }) }, 60); return }
});
document.addEventListener("keydown", e => { if (e.key === "Enter" && e.target && e.target.id === "qGoal") { e.preventDefault(); qDesign(e.target.value) } });

/* ---------- Styles ---------- */
(() => { const st = document.createElement("style"); st.textContent = `
.q-card{border:1px solid color-mix(in srgb,var(--gym) 45%,var(--line));background:linear-gradient(180deg,color-mix(in srgb,var(--gym) 9%,var(--surface)),var(--surface) 70%);gap:10px}
.q-card.complete{border-color:color-mix(in srgb,var(--good) 60%,var(--line));background:linear-gradient(180deg,color-mix(in srgb,var(--good) 10%,var(--surface)),var(--surface) 70%)}
.q-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.q-head h2{margin:2px 0 0;font-size:18px}
.q-sys{font:700 10.5px var(--body);letter-spacing:.14em;color:var(--gym)}.q-card.complete .q-head .q-sys{color:var(--good)}
.q-meta{display:flex;flex-direction:column;align-items:flex-end;gap:1px;flex-shrink:0}.q-meta b{font-size:20px;line-height:1}
.q-list{display:flex;flex-direction:column;gap:6px}.q-list.pen,.q-list.paths{border-top:1px dashed var(--line);padding-top:8px}
.q-row{display:flex;align-items:center;gap:10px;min-height:36px}.q-row.done .q-tx>span:first-child{color:var(--muted);text-decoration:line-through;text-decoration-color:color-mix(in srgb,var(--muted) 50%,transparent)}
.q-tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;font-size:14.5px}
.q-chk{width:26px;height:26px;border-radius:8px;border:1.5px solid color-mix(in srgb,var(--gym) 55%,var(--line));background:var(--surface);color:#fff;font:800 14px var(--body);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;padding:0;cursor:pointer}
.q-chk.static{cursor:default;border-style:dashed}.q-chk.on{background:var(--good);border:1.5px solid var(--good)}
.q-n{font-size:12.5px;color:var(--muted);flex-shrink:0}
.q-bar{height:4px;border-radius:2px;background:var(--surface-2);overflow:hidden;margin-top:3px}.q-bar i{display:block;height:100%;background:var(--gym);border-radius:2px}
.q-offer{display:flex;flex-direction:column;gap:3px;border:1px solid color-mix(in srgb,var(--gym) 40%,var(--line));background:var(--gym-soft);border-radius:14px;padding:12px}
.q-offer.end{border-color:color-mix(in srgb,var(--good) 50%,var(--line));background:color-mix(in srgb,var(--good) 10%,var(--surface))}
.q-check{margin:0;padding:8px 10px;border-radius:10px;background:var(--surface-2)}
.q-foot{border-top:1px solid var(--line);padding-top:8px}
.q-logcard{gap:10px}.q-logcard .eyebrow{margin-top:4px}
.q-lib{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.q-libitem{display:flex;flex-direction:column;gap:2px;text-align:left;border:1.5px solid var(--line);background:var(--surface);color:var(--ink);border-radius:12px;padding:10px;font:inherit;cursor:pointer;min-width:0}
.q-libitem b{font-size:14px}.q-libitem:disabled{opacity:.55;cursor:default}.q-libitem.on{border-color:var(--gym)}
.q-tag{font:700 10px var(--body);color:var(--gym);letter-spacing:.06em;text-transform:uppercase}
@media (max-width:360px){.q-lib{grid-template-columns:1fr}}`; document.head.appendChild(st) })();
