/* First-week checklist, weekly recap, recipe import and friends.
 * Loaded before the main app script; everything here runs lazily, at call time. */

async function xApi(path, body) {
  const tok = window.appAuthToken ? await appAuthToken() : null; let r;
  try { r = await fetch(path, { method: body ? "POST" : "GET", headers: { ...(tok ? { authorization: "Bearer " + tok } : {}), ...(body ? { "content-type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }) }
  catch (e) { throw Object.assign(new Error("network"), { code: "network" }) }
  const j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(j.code || "error"), { status: r.status, code: j.code || "error" }); return j;
}
const xEsc = s => String(s == null ? "" : s);

/* ======================= First steps checklist (Home) ======================= */
function ckItems() {
  const su = (CUSTOM && CUSTOM.su) || {}, L = Object.values(S.logs), ck = S.profile.ck || {}, runs = (su.runDays || []).length > 0, K = typeof kitchen === "function" ? kitchen() : { recipes: [], plan: {} };
  const ate = Object.values(S.meals || {}).some(m => m && m.items && m.items.length) || K.recipes.length > 0 || Object.values(K.plan || {}).some(a => a && a.length);
  const st = typeof stravaState === "function" ? stravaState() : {};
  return [
    { id: "gym", t: "Log your first workout", done: L.some(l => l && l.type === "gym"), go: "train" },
    ...(runs ? [{ id: "run", t: "Log your first run", done: L.some(l => l && l.type === "run"), go: "run" }] : []),
    { id: "food", t: "Plan a meal or log what you ate", done: ate, go: "food" },
    ...(runs && typeof STRAVA_ON !== "undefined" && STRAVA_ON ? [{ id: "strava", t: "Connect Strava so runs import themselves", done: !!(st.connected || ck.strava), go: "settings", skip: "I don't use Strava" }] : []),
    { id: "birth", t: "Add your birth month", done: !!su.birth, go: "settings" },
    { id: "friend", t: "Add a friend to compare ranks", done: !!(FR.list && FR.list.length) || !!ck.friend, go: "friends", skip: "Not now" }
  ];
}
function hubChecklist() {
  const su = CUSTOM && CUSTOM.su, ck = S.profile.ck || {}; if (!su || ck.hide) return "";
  if (su.firstDay && typeof rkDays === "function" && rkDays(su.firstDay, ymd(today)) > 30) return "";
  const it = ckItems(), n = it.filter(x => x.done).length; if (n === it.length) return "";
  return `<section class="hub-block ck"><div class="row between"><span class="hub-sys">FIRST STEPS · ${n} OF ${it.length}</span><button type="button" class="link small" data-ck-hide="1">Hide</button></div>
    <div class="hub-xp ck-bar"><i style="width:${Math.round(n / it.length * 100)}%"></i></div>
    <div class="ck-list">${it.map(x => `<div class="ck-row ${x.done ? "done" : ""}"><button type="button" class="ck-go" data-ck-go="${x.go}" ${x.done ? "disabled" : ""}><span class="ck-box" aria-hidden="true">${x.done ? "✓" : ""}</span><span>${esc(x.t)}</span>${x.done ? "" : `<span class="ck-ar" aria-hidden="true">›</span>`}</button>${!x.done && x.skip ? `<button type="button" class="link small" data-ck-skip="${x.id}">${esc(x.skip)}</button>` : ""}</div>`).join("")}</div></section>`;
}
function ckGo(g) {
  if (g === "settings") { const b = document.querySelector("[data-acct]"); if (b) b.click(); return }
  if (g === "food") { tab = "food"; if (typeof foodView !== "undefined") foodView = "plan"; lastRenderKey = ""; render(); scrollTo(0, 0); return }
  if (g === "friends") { tab = "ranks"; lastRenderKey = ""; render(); setTimeout(() => { const el = document.getElementById("friends"); if (el) el.scrollIntoView({ block: "start", behavior: "smooth" }) }, 300); return }
  if (g === "run") { let d = today; for (let i = 0; i < 8; i++) { const x = addDays(today, i), p = planFor(x); if (p && p.type === "run") { d = x; break } } tab = "home"; sel = d; lastRenderKey = ""; render(); scrollTo(0, 0); return }
  tab = "home"; sel = today; lastRenderKey = ""; render(); scrollTo(0, 0);
}

/* ======================= Weekly recap ======================= */
function xE1rm(w, r) { return w > 0 && r > 0 && r <= 15 ? w * (1 + r / 30) : 0 }
function weekRecap(mon) {
  const days = [...Array(7)].map((_, i) => ymd(addDays(mon, i))), sun = days[6], w = weekOf(mon);
  let gp = 0, gd = 0, rp = 0, rd = 0, mi = 0, vol = 0, q = 0;
  days.forEach(k => { const d = parseYmd(k), p = planFor(d), l = S.logs[k];
    if (p && !(typeof preStart === "function" && preStart(d))) { if (p.type === "gym") { gp++; if (l) gd++ } if (p.type === "run") { rp++; if (l) rd++ } }
    if (l && l.type === "run" && !p) rd++;
    if (l && l.type === "run") mi += Number(l.mi) || 0;
    if (l && l.type === "gym" && l.ex) Object.values(l.ex).forEach(sets => (sets || []).forEach(s => { vol += (Number(s.w) || 0) * (Number(s.r) || 0) }));
    if (typeof dqDone === "function" && dqDone(k)) q++ });
  // lift PRs: best estimated 1RM this week vs everything before
  const best = {}, prs = [];
  Object.keys(S.logs).sort().forEach(k => { const l = S.logs[k]; if (!l || l.type !== "gym" || !l.ex || k > sun) return;
    Object.entries(l.ex).forEach(([id, sets]) => { const b = Math.max(0, ...(sets || []).map(s => xE1rm(Number(s.w) || 0, Number(s.r) || 0)));
      if (!b) return; if (k >= days[0]) { if (best[id] && b > best[id] * 1.005 && !prs.some(x => x.id === id)) prs.push({ id, b }) } if (!best[id] || b > best[id]) best[id] = b }) });
  const name = id => { const e = typeof libEx === "function" && libEx(id); return e ? e.name : id };
  let moves = []; try { const R = rankState(); moves = (R.events || []).filter(e => e.d >= days[0] && e.d <= sun && (e.t === "up" || e.t === "down" || e.t === "reclaim")).map(e => ({ p: e.p, t: e.t, to: e.to })) } catch (e) {}
  const plan = gp + rp, done = gd + rd, need = Math.ceil(plan * 0.75);
  return { w, mon: days[0], sun, gp, gd, rp, rd, mi, vol, q, prs: prs.map(x => name(x.id)), moves, plan, done, hit: plan > 0 && done >= need };
}
function recapHtml() {
  const x = SH.rec, G = { upper: "Upper Body", lower: "Lower Body", core: "Core", speed: "Speed", endur: "Endurance", disc: "Discipline" };
  const nextMon = addDays(parseYmd(x.mon), 7); let nn = 0; for (let i = 0; i < 7; i++) { const p = planFor(addDays(nextMon, i)); if (p && p.type !== "rest") nn++ }
  const tile = (l, v) => `<div><span class="l">${l}</span><span class="v num">${v}</span></div>`;
  return `<div class="recap"><span class="hub-sys">[SYSTEM] WEEK ${x.w} ${x.hit ? "CLEARED" : "COMPLETE"}</span>
    <h2>${x.hit ? "Week cleared" : x.done ? "Week done" : "A quiet week"}</h2><p class="small muted" style="margin:0">${fmtShort(parseYmd(x.mon))} – ${fmtShort(parseYmd(x.sun))}</p>
    <div class="recap-big num"><b>${x.done}</b><span>/ ${x.plan} sessions</span></div><div class="hub-xp"><i style="width:${x.plan ? Math.min(100, Math.round(x.done / x.plan * 100)) : 0}%"></i></div>
    <p class="small" style="margin:0">${x.hit ? "On target: Discipline counts this week." : x.plan ? `Discipline needed ${Math.ceil(x.plan * 0.75)}. This week is a fresh start.` : ""}</p>
    <div class="stv">${tile("Workouts", `${x.gd}/${x.gp}`)}${x.rp || x.rd ? tile("Runs", `${x.rd}/${x.rp}`) : ""}${x.mi ? tile("Distance", dTxt(x.mi)) : ""}${x.vol ? tile("Lifted", `${fmtN(Math.round(typeof toUd === "function" ? toUd(x.vol) : x.vol))} ${typeof uL === "function" ? uL() : "lb"}`) : ""}${tile("Daily quests", `${x.q}/7`)}</div>
    ${x.prs.length ? `<div><div class="eyebrow">New personal bests</div><ul class="recap-list">${x.prs.slice(0, 5).map(n => `<li>${esc(n)}</li>`).join("")}</ul></div>` : ""}
    ${x.moves.length ? `<div><div class="eyebrow">Rank changes</div><ul class="recap-list">${x.moves.map(m => `<li>${esc(G[m.p] || m.p)}: ${m.t === "down" ? "down to" : "up to"} <b>${rkLetter(m.to)}</b></li>`).join("")}</ul></div>` : ""}
    <p class="small muted" style="margin:0">This week: ${nn} session${nn === 1 ? "" : "s"} planned.</p>
    <div class="row" style="gap:8px"><button type="button" class="btn" data-xs="close" style="flex:1">Let's go</button><button type="button" class="btn ghost" data-share="recap">Share</button></div></div>`;
}
function maybeRecap() {
  const su = CUSTOM && CUSTOM.su; if (!su || tab !== "hub" || (SH && !document.getElementById("xsheet").hidden) || (typeof HT !== "undefined" && HT.i >= 0)) return;
  const prevMon = addDays(mondayOf(today), -7), pm = ymd(prevMon); if (su.firstDay && su.firstDay > ymd(addDays(prevMon, 6))) return;
  if (S.profile.recapSeen && S.profile.recapSeen >= pm) return;
  const rec = weekRecap(prevMon); S.profile.recapSeen = pm; saveProfile(); if (!rec.plan && !rec.done) return;
  openSheet({ kind: "recap", rec });
}
function openRecap() { openSheet({ kind: "recap", rec: weekRecap(addDays(mondayOf(today), -7)) }) }

/* ======================= Recipe import ======================= */
const FRAC2 = { "½": .5, "⅓": 1 / 3, "⅔": 2 / 3, "¼": .25, "¾": .75, "⅛": .125, "⅜": .375, "⅝": .625, "⅞": .875 };
const UNIT_W = [[/^(cups?|c)$/, "cup"], [/^(tablespoons?|tbsps?|tbs|tbl|T)$/, "tbsp"], [/^(teaspoons?|tsps?|t)$/, "tsp"], [/^(ounces?|oz)$/, "oz"], [/^(fl\.? ?oz|fluid ounces?)$/, "floz"],
  [/^(pounds?|lbs?)$/, "lb"], [/^(grams?|g|gr)$/, "g"], [/^(kilograms?|kgs?)$/, "kg"], [/^(milliliters?|millilitres?|ml)$/, "ml"], [/^(liters?|litres?|l)$/, "l"],
  [/^(cans?|tins?)$/, "can"], [/^(jars?)$/, "jar"], [/^(cloves?)$/, "clove"], [/^(slices?)$/, "slice"], [/^(packages?|pkgs?|packs?|bags?|boxes?)$/, "package"],
  [/^(pinch(es)?|dash(es)?)$/, "pinch"], [/^(large|medium|small|whole)$/, "each"], [/^(sticks?)$/, "stick"], [/^(heads?|bunch(es)?|sprigs?|stalks?)$/, "each"]];
const VOL = { cup: 48, tbsp: 3, tsp: 1, floz: 6 };          // in teaspoons
function parseIngLine(raw) {
  let s = String(raw || "").replace(/[\u2009\u00a0]/g, " ").replace(/\s+/g, " ").trim(); if (!s) return null;
  s = s.replace(/^[-•*▢□◻️\d]+\.\s+/, "").replace(/^[-•*▢□]\s*/, "");
  s = s.replace(/(\d)\s*([½⅓⅔¼¾⅛⅜⅝⅞])/g, (_, a, b) => String(Number(a) + FRAC2[b])).replace(/[½⅓⅔¼¾⅛⅜⅝⅞]/g, m => String(FRAC2[m]));
  let qty = null; const m = s.match(/^(\d+(?:\.\d+)?)(?:\s+(\d+)\/(\d+))?(?:\/(\d+))?(?:\s*(?:-|–|to)\s*(\d+(?:\.\d+)?))?\s*/);
  if (m) { qty = Number(m[1]); if (m[2]) qty += Number(m[2]) / Number(m[3]); if (m[4]) qty = Number(m[1]) / Number(m[4]); if (m[5]) qty = (qty + Number(m[5])) / 2; s = s.slice(m[0].length) }
  let unit = null; const w = s.match(/^([A-Za-z.]+(?: ?oz)?)\.?\s+/);
  if (w) { const u = UNIT_W.find(([re]) => re.test(w[1].replace(/\.$/, ""))); if (u) { unit = u[1]; s = s.slice(w[0].length) } }
  s = s.replace(/^of\s+/i, "");
  const name = s.replace(/\([^)]*\)/g, "").split(/,| - | – /)[0].replace(/\b(chopped|diced|minced|sliced|fresh|freshly|ground|to taste|optional|divided|softened|melted|packed|large|medium|small|boneless|skinless|cooked|uncooked|raw|finely|roughly|thinly)\b/gi, "").replace(/\s+/g, " ").trim();
  return { raw: String(raw).trim(), qty, unit, name };
}
const ING_STOP = new Set(["and", "or", "the", "a", "of", "for", "with", "to", "in", "plus", "about", "cup", "cups"]);
const toks = s => String(s || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(w => w.length > 1 && !ING_STOP.has(w)).map(w => w.replace(/(es|s)$/, ""));
function matchFood(name) {
  const q = toks(name); if (!q.length) return null; let best = null, bs = 0;
  foodDb().forEach(f => { const ft = toks(String(f.n).split(" · ")[0].split(",")[0]); if (!ft.length) return; const hit = ft.filter(t => q.includes(t)).length; if (!hit) return;
    const sc = hit / ft.length * 0.7 + hit / q.length * 0.3 + (f.custom ? 0.05 : 0); if (sc > bs) { bs = sc; best = f } });
  return bs >= 0.6 ? best : null;
}
// turn "2 cups cooked rice" into a recipe line for the matched food
function toItem(f, P) {
  const U = unitsOf(f), qty = P.qty || 1, per = lbl => { const m = String(lbl).match(/^([\d.]+)\s+(cups?|tbsp|tsp)\b/); return m ? { n: Number(m[1]), u: m[2].replace(/s$/, "") } : null };
  if (["g", "oz", "lb"].includes(P.unit) && !f.custom) return { f: f.id, amt: qty, unit: P.unit };
  if (P.unit === "kg" && !f.custom) return { f: f.id, amt: Math.round(qty * 1000), unit: "g" };
  if ((P.unit === "ml" || P.unit === "l") && !f.custom) return { f: f.id, amt: Math.round(qty * (P.unit === "l" ? 1000 : 1)), unit: "g" };
  if (VOL[P.unit]) { const u = U.find(([l]) => { const x = per(l); return x && VOL[x.u] }); if (u) { const x = per(u[0]); return { f: f.id, amt: Math.round(qty * VOL[P.unit] / (VOL[x.u] * x.n) * 100) / 100, unit: u[0] } }
    if (!f.custom) return { f: f.id, amt: Math.round(qty * VOL[P.unit] * 5), unit: "g" } }
  const pc = pieceUnit(f); if (pc && (!P.unit || P.unit === "each" || P.unit === "slice" || P.unit === "clove")) return { f: f.id, amt: qty, unit: pc };
  const named = P.unit && U.find(([l]) => new RegExp("^1 " + P.unit).test(l)); if (named) return { f: f.id, amt: qty, unit: named[0] };
  if (f.custom && (!P.unit || P.unit === "package" || P.unit === "can" || P.unit === "jar")) return { f: f.id, amt: qty, unit: U[0][0] };
  return null;
}
function buildImported(d) {
  const items = [], pending = [];
  (d.ingredients || []).slice(0, 60).forEach(line => { const P = parseIngLine(line); if (!P || !P.name) return; if (/^(salt|pepper|salt and pepper|water|ice|cooking spray)$/i.test(P.name)) return;
    const f = matchFood(P.name), it = f && toItem(f, P); if (it && it.amt > 0) items.push(it); else pending.push(P.raw) });
  return { id: newId("rc"), name: String(d.name || "").slice(0, 80) || "Imported recipe", servings: Math.max(1, Math.min(40, Math.round(Number(d.servings) || 4))), items,
    method: Array.isArray(d.steps) ? d.steps.join("\n") : (d.steps || ""), ...(pending.length ? { pending } : {}), ...(d.url ? { src: d.url } : {}) };
}
function rimportHtml() {
  const m = SH.mode || "link", busy = SH.busy;
  return `<div class="xs-head"><h2>Import a recipe</h2><button type="button" class="btn ghost sm" data-xs="close">Cancel</button></div>
    <div class="seg three" role="tablist">${[["link", "Link"], ["photo", "Photo"], ["text", "Paste"]].map(([k, n]) => `<button type="button" role="tab" class="${m === k ? "on" : ""}" aria-selected="${m === k}" data-ri-mode="${k}">${n}</button>`).join("")}</div>
    ${m === "link" ? `<div class="field"><label for="riUrl">Recipe page link</label><input id="riUrl" type="url" inputmode="url" autocomplete="off" placeholder="https://…" value="${esc(SH.url || "")}" data-ri-f="url"></div><p class="small muted">Most recipe sites work. The ingredients come in and get matched to foods; you check anything it couldn't match.</p>`
      : m === "photo" ? `<label class="btn ghost filebtn" style="align-self:flex-start">${busy ? "Reading…" : "Choose photos"}<input type="file" id="riPhoto" accept="image/*" multiple ${busy || !(typeof sampleFn !== "undefined" && sampleFn) ? "disabled" : ""}></label><p class="small muted">A photo or screenshot of the ingredient list (a cookbook page works). Up to 3 photos.</p>`
      : `<div class="field"><label for="riName">Recipe name</label><input id="riName" data-ri-f="name" value="${esc(SH.name || "")}" placeholder="e.g. Turkey chili"></div><div class="field"><label for="riText">Ingredients, one per line</label><textarea id="riText" rows="8" data-ri-f="text" placeholder="2 lb ground turkey&#10;1 can black beans&#10;1 cup salsa">${esc(SH.text || "")}</textarea></div><div class="field" style="max-width:160px"><label for="riServ">Servings</label><input id="riServ" inputmode="numeric" data-ri-f="servings" value="${esc(SH.servings || "4")}"></div>`}
    ${SH.err ? `<p class="note" role="alert">${esc(SH.err)}</p>` : ""}
    ${m === "photo" ? "" : `<button type="button" class="btn" data-ri-go="1" ${busy ? "disabled" : ""}>${busy ? "Reading…" : "Import"}</button>`}`;
}
function pendingHtml() {
  const P = SH && SH.r && SH.r.pending; if (!P || !P.length) return "";
  return `<div class="ri-pend"><b class="small">Couldn't match ${P.length} ingredient${P.length > 1 ? "s" : ""}: pick the food for each</b>${P.map((x, i) => `<div class="ri-p"><span>${esc(x)}</span><button type="button" class="btn ghost sm" data-ri-find="${i}">Find</button><button type="button" class="fp-x" data-ri-drop="${i}" aria-label="Skip ${esc(x)}">×</button></div>`).join("")}</div>`;
}
async function runImport(kind, payload) {
  SH.busy = true; SH.err = ""; paintSheet();
  try {
    let d;
    if (kind === "link") d = await xApi("/api/recipe-import", { url: payload });
    else if (kind === "photo") { if (!(typeof sampleFn !== "undefined" && sampleFn)) throw new Error("Photo import needs the coach to be available."); const r = await sampleFn.json(`These images show ONE recipe (a cookbook page, a screenshot or a recipe card). Extract it.
Reply with ONLY a JSON object: {"name":string,"servings":number|null,"ingredients":[string],"steps":[string]}
Each ingredient is one line exactly as written, with its amount and unit (e.g. "2 cups cooked rice"). Use null or [] for anything not visible. Never invent ingredients.`, { images: payload, cache: false });
      if (!r || !Array.isArray(r.ingredients) || !r.ingredients.length) throw new Error("Couldn't find an ingredient list in that photo."); d = r }
    else d = payload;
    if (!d || !(d.ingredients || []).length) throw new Error("No ingredients found.");
    const rec = buildImported(d); SH.busy = false;
    openSheet({ kind: "recipe", isNew: true, r: rec });
    toast(rec.pending ? `Imported ${rec.items.length} of ${rec.items.length + rec.pending.length} ingredients. Match the rest below.` : `Imported ${rec.items.length} ingredients. Check the amounts, then save.`);
  } catch (e) { if (!SH || SH.kind !== "rimport") return; SH.busy = false;
    SH.err = e.code === "no_recipe" ? "Couldn't find a recipe on that page. Try a screenshot of it with Photo, or paste the ingredients." : e.code === "fetch_failed" ? "That site didn't let the app read the page. Try Photo or Paste instead." : e.code === "bad_url" ? "That doesn't look like a web link." : e.code === "network" ? "You're offline. Try again when you're connected." : e.message && !/^error$/.test(e.message) ? e.message : "Import didn't work. Try Photo or Paste."; paintSheet() }
}
function foodStartHtml() {
  const K = kitchen(); if (K.recipes.length || Object.values(K.plan || {}).some(a => a && a.length)) return "";
  return `<div class="card fp-start"><span class="hub-sys">[SYSTEM] START HERE</span><h2>Build your food plan</h2>
    <p class="small muted" style="margin:0">Add the meals you actually cook and the app works out the macros and your shopping list. Not ready? Just log what you eat today.</p>
    <div class="fp-start-btns"><button type="button" class="btn" data-ri-open="1">Import a recipe</button><button type="button" class="btn ghost" data-c-rec="">Type one in</button><button type="button" class="btn ghost" data-fp-logtoday="1">Log today's food</button></div></div>`;
}

/* ======================= Friends ======================= */
const FR = { list: null, me: null, at: 0, busy: false, err: "" };
function myCard() {
  let R = null; try { R = rankState() } catch (e) {}
  const V = R ? rkShown(R) : null, un = !R || !R.place || R.place.pending;
  return { ov: un ? null : V.ov, g: R ? Object.fromEntries(R.groups.map(g => [g.id, g.num == null ? null : Math.round(g.num * 10) / 10])) : {}, wk: typeof hubWeek === "function" ? hubWeek() : null,
    streak: typeof qStreak === "function" ? qStreak() : 0 };
}
async function friendsLoad(force) {
  if (!S.profile.friendsOn || FR.busy || (!force && Date.now() - FR.at < 120000)) return; FR.busy = true;
  try { const card = myCard(), sig = JSON.stringify(card) + hubName();
    const j = await xApi("/api/friends", { action: "sync", name: hubName(), card: sig !== FR.sig ? card : undefined }); FR.sig = sig;
    FR.me = j.me; FR.list = j.friends || []; FR.err = ""; FR.at = Date.now() }
  catch (e) { FR.err = e.code === "network" ? "You're offline." : e.code === "not_set_up" ? "Friends needs a one-time database setup (see the app's README)." : "Couldn't load friends right now."; FR.at = Date.now() }
  FR.busy = false; if (tab === "ranks") { const el = document.getElementById("friends"); if (el) el.outerHTML = friendsCard() }
}
function friendsCard() {
  const on = !!S.profile.friendsOn;
  if (!on) return `<div class="card" id="friends"><h2>Friends</h2><p class="small muted">Compare ranks with friends. They see your name, your rank letters and how many sessions you did this week. Nothing else.</p><div class="row" style="gap:8px"><button type="button" class="btn sm" data-fr-on="1">Turn on friends</button><button type="button" class="btn ghost sm" data-share="">Invite with a link</button></div></div>`;
  if (FR.list == null) { setTimeout(() => friendsLoad(), 0); return `<div class="card" id="friends"><h2>Friends</h2><p class="small muted"><span class="pulse"></span> Loading…</p></div>` }
  const L = (x) => x == null ? "?" : rkLetter(x), me = myCard(), rows = [{ name: hubName() + " (you)", card: me, you: true }, ...FR.list].sort((a, b) => ((b.card && b.card.ov) ?? -1) - ((a.card && a.card.ov) ?? -1));
  return `<div class="card" id="friends"><div class="row between"><h2>Friends</h2>${FR.me ? `<button type="button" class="btn ghost sm" data-fr-share="1">Your code: <b class="num">${esc(FR.me.code)}</b></button>` : ""}</div>
    ${FR.err ? `<p class="note">${esc(FR.err)}</p>` : ""}
    <div class="fr-list">${rows.map(f => { const c = f.card || {}; return `<div class="fr-row ${f.you ? "you" : ""}"><span class="fr-rank" style="background:${c.ov == null ? "#5B6378" : RK_COL[Math.min(5, Math.floor(c.ov))]}">${L(c.ov == null ? null : Math.floor(c.ov))}</span>
      <span class="fr-who"><b>${esc(f.name || "Friend")}</b><span class="fr-gs">${["upper", "lower", "core", "speed", "endur"].map(g => `<span>${RK_SHORT[g] === "Endurance" ? "Endur." : RK_SHORT[g]} <b>${c.g && c.g[g] != null ? rkLetter(Math.floor(c.g[g])) : "–"}</b></span>`).join("")}</span><span class="small muted num">${c.wk ? `${c.wk.done}/${c.wk.plan} this week` : ""}${c.streak ? ` · ${c.streak}-day streak` : ""}</span></span>
      ${f.you ? "" : `<button type="button" class="fp-x" data-fr-del="${esc(f.code)}" aria-label="Remove ${esc(f.name || "friend")}">×</button>`}</div>` }).join("")}</div>
    <div class="row" style="gap:8px;flex-wrap:nowrap"><input id="frCode" class="xs-search" autocomplete="off" autocapitalize="characters" placeholder="Friend's code" maxlength="8" style="flex:1;min-width:0"><button type="button" class="btn sm" data-fr-add="1">Add</button></div>
    <button type="button" class="btn ghost sm" data-share="" style="align-self:flex-start">Invite with a link</button>
    <p class="small muted" style="margin:0">Share your code or a link; when a friend adds you, you both see each other. <button type="button" class="link small" data-fr-off="1">Turn off friends</button></p></div>`;
}

/* ======================= sheets + taps ======================= */
function extraSheetHtml() { return SH.kind === "recap" ? recapHtml() : SH.kind === "rimport" ? rimportHtml() : SH.kind === "share" ? shareHtml() : SH.kind === "invite" ? inviteHtml() : SH.kind === "rtask" ? rtaskHtml() : "" }
document.addEventListener("click", e => {
  const t = e.target.closest("[data-ck-go],[data-ck-skip],[data-ck-hide],[data-recap],[data-ri-open],[data-ri-mode],[data-ri-go],[data-ri-find],[data-ri-drop],[data-fp-logtoday],[data-fr-on],[data-fr-off],[data-fr-add],[data-fr-del],[data-fr-share]");
  if (!t) return; const d = t.dataset;
  if (d.ckGo) { ckGo(d.ckGo); return }
  if (d.ckSkip) { S.profile.ck = { ...(S.profile.ck || {}), [d.ckSkip]: 1 }; saveProfile(); lastRenderKey = ""; render(); return }
  if (d.ckHide) { S.profile.ck = { ...(S.profile.ck || {}), hide: 1 }; saveProfile(); lastRenderKey = ""; render(); toast("Hidden. Everything's still in Settings."); return }
  if (d.recap) { openRecap(); return }
  if (d.riOpen) { openSheet({ kind: "rimport", mode: "link" }); return }
  if (d.riMode) { SH.mode = d.riMode; SH.err = ""; paintSheet(); return }
  if (d.riGo) { const m = SH.mode || "link";
    if (m === "link") { const u = (document.getElementById("riUrl") || {}).value || SH.url || ""; if (!/^https?:\/\/\S+\.\S+/.test(u.trim())) { SH.err = "Paste the full link, starting with https://"; paintSheet(); return } SH.url = u.trim(); runImport("link", SH.url) }
    else { const txt = (document.getElementById("riText") || {}).value || "", nm = (document.getElementById("riName") || {}).value || "", sv = (document.getElementById("riServ") || {}).value || 4;
      const lines = txt.split(/\n/).map(x => x.trim()).filter(Boolean); if (!lines.length) { SH.err = "Paste at least one ingredient line."; paintSheet(); return } SH.text = txt; SH.name = nm; runImport("text", { name: nm, servings: sv, ingredients: lines }) } return }
  if (d.riFind != null && SH && SH.r) { const line = SH.r.pending[+d.riFind], P = parseIngLine(line); SH.pendI = +d.riFind; SH.adding = true; SH.swap = null; SH.pick = null; SH.q = P ? P.name : line; SH.view = null; paintSheet(true); return }
  if (d.riDrop != null && SH && SH.r) { SH.r.pending.splice(+d.riDrop, 1); if (!SH.r.pending.length) delete SH.r.pending; paintSheet(); return }
  if (d.fpLogtoday) { if (typeof foodView !== "undefined") foodView = "today"; sel = today; lastRenderKey = ""; render(); const h = new Date().getHours();
    openSheet({ kind: "food", mode: "diary", k: ymd(today), slot: h < 10 ? "b" : h < 15 ? "l" : h < 20 ? "d" : "s", q: "", tab: "foods" }); return }
  if (d.frOn) { S.profile.friendsOn = 1; saveProfile(); FR.list = null; FR.at = 0; lastRenderKey = ""; render(); return }
  if (d.frOff) { S.profile.friendsOn = 0; saveProfile(); xApi("/api/friends", { action: "hide" }).catch(() => {}); FR.list = null; lastRenderKey = ""; render(); return }
  if (d.frShare) { const c = FR.me && FR.me.code; if (!c) return; const txt = `Add me on RankUp: my friend code is ${c}`;
    if (navigator.share) navigator.share({ text: txt, url: location.origin }).catch(() => {}); else if (navigator.clipboard) navigator.clipboard.writeText(c).then(() => toast("Code copied")).catch(() => toast(`Your code: ${c}`)); else toast(`Your code: ${c}`); return }
  if (d.frAdd) { const el = document.getElementById("frCode"), code = String(el && el.value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (code.length < 5) { toast("Friend codes are 6 letters and numbers"); return } if (FR.me && code === FR.me.code) { toast("That's your own code"); return }
    t.disabled = true; xApi("/api/friends", { action: "add", code }).then(j => { FR.list = j.friends || FR.list; toast("Friend added"); const c = document.getElementById("friends"); if (c) c.outerHTML = friendsCard() })
      .catch(e => { t.disabled = false; toast(e.code === "not_found" ? "No one has that code" : e.code === "network" ? "You're offline" : "Couldn't add that friend") }); return }
  if (d.frDel) { if (t.dataset.armed !== "1") { t.dataset.armed = "1"; t.textContent = "Remove?"; t.classList.add("armed"); return }
    xApi("/api/friends", { action: "remove", code: d.frDel }).then(j => { FR.list = j.friends || []; const c = document.getElementById("friends"); if (c) c.outerHTML = friendsCard() }).catch(() => toast("Couldn't remove right now")); return }
});
document.addEventListener("change", e => {
  const t = e.target;
  if (t.dataset && t.dataset.riF && SH && SH.kind === "rimport") { SH[t.dataset.riF] = t.value; return }
  if (t.id === "riPhoto" && SH && SH.kind === "rimport") { const fs = [...(t.files || [])].slice(0, 3); if (fs.length) runImport("photo", fs) }
});
document.addEventListener("input", e => { const t = e.target; if (t.dataset && t.dataset.riF && SH && SH.kind === "rimport") SH[t.dataset.riF] = t.value });

(function css() {
  const s = document.createElement("style"); s.textContent = `
.ck{display:flex;flex-direction:column;gap:8px}.ck-bar{margin:0}.ck-list{display:flex;flex-direction:column;gap:2px}
.ck-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.ck-go{all:unset;cursor:pointer;flex:1;display:flex;align-items:center;gap:10px;padding:8px 2px;min-width:0;font-weight:600;font-size:14px}
.ck-go:focus-visible{outline:2px solid var(--accent,#8F8BFF);border-radius:8px}.ck-box{flex:none;width:22px;height:22px;border-radius:7px;border:1.5px solid var(--line);display:grid;place-items:center;font-size:13px;font-weight:800;color:var(--bg)}
.ck-row.done .ck-box{background:var(--good);border-color:var(--good)}.ck-row.done .ck-go{color:var(--muted);text-decoration:line-through;cursor:default}.ck-ar{margin-left:auto;color:var(--muted)}
.recap{display:flex;flex-direction:column;gap:12px}.recap h2{margin:0;font-size:28px}.recap-big{display:flex;align-items:baseline;gap:8px}.recap-big b{font:800 48px/1 var(--display)}.recap-big span{color:var(--muted);font-weight:600}
.recap-list{margin:4px 0 0;padding-left:18px;display:flex;flex-direction:column;gap:2px}
.ri-pend{display:flex;flex-direction:column;gap:6px;border:1px dashed var(--line);border-radius:12px;padding:10px 12px;margin-top:8px}.ri-p{display:flex;align-items:center;gap:8px}.ri-p span{flex:1;min-width:0;font-size:14px}
.fp-start{gap:10px}.fp-start h2{margin:0}.fp-start-btns{display:flex;flex-wrap:wrap;gap:8px}
.fr-list{display:flex;flex-direction:column;gap:6px}.fr-row{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--line);border-radius:12px}.fr-row.you{border-color:color-mix(in srgb,var(--accent,#8F8BFF) 60%,var(--line))}
.fr-rank{flex:none;width:34px;height:38px;clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%);display:grid;place-items:center;font:800 17px var(--display);color:#fff}
.fr-who{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.fr-gs{display:flex;flex-wrap:wrap;gap:2px 10px;font-size:12px;color:var(--muted)}.fr-gs b{color:var(--ink)}.fr-who b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.fp-x.armed{width:auto;padding:0 8px;font-size:12px}
`; document.head.appendChild(s);
})();

/* ======================= Share links ======================= */
// A link to the app carrying your friend code, your name and a short message. Opening it shows the message, and
// after sign-up (or right away, if they already use the app) offers to add you as a friend.
const INV_KEY = "ru-invite";
const cleanTxt = (s, n) => String(s || "").replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
(function readInvite() {
  try { const q = new URLSearchParams(location.search), code = (q.get("invite") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    if (!code && !q.get("from")) return;
    localStorage.setItem(INV_KEY, JSON.stringify({ code, from: cleanTxt(q.get("from"), 30), m: cleanTxt(q.get("m"), 280), at: Date.now() }));
    ["invite", "from", "m"].forEach(k => q.delete(k)); history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : "") + location.hash) } catch (e) {}
})();
function pendingInvite() { try { const v = JSON.parse(localStorage.getItem(INV_KEY) || "null"); return v && Date.now() - v.at < 30 * 864e5 ? v : null } catch (e) { return null } }
function dropInvite() { try { localStorage.removeItem(INV_KEY) } catch (e) {} const b = document.getElementById("inviteBar"); if (b) b.remove() }
// a banner over the sign-in and setup screens until the app is set up
function inviteBar() {
  const v = pendingInvite(), set = typeof CUSTOM !== "undefined" && CUSTOM; let b = document.getElementById("inviteBar");
  if (!v || set) { if (b) b.remove(); return }
  if (!b) { b = document.createElement("div"); b.id = "inviteBar"; b.setAttribute("role", "status"); document.body.appendChild(b) }
  b.innerHTML = `<b>${esc(v.from || "A friend")} invited you to RankUp</b>${v.m ? `<span>“${esc(v.m)}”</span>` : ""}<span class="ib-s">Create an account and you'll be friends.</span>`;
}
setTimeout(inviteBar, 300); setInterval(inviteBar, 1500);
function maybeInvite() {
  const v = pendingInvite(); if (!v || !CUSTOM || tab !== "hub" || (SH && !document.getElementById("xsheet").hidden) || (typeof HT !== "undefined" && HT.i >= 0) || !(S.profile.tourDone || (typeof hubTourDone === "function" && hubTourDone()))) return;
  if (FR.me && v.code === FR.me.code) { dropInvite(); return }
  openSheet({ kind: "invite", v });
}
function inviteHtml() {
  const v = SH.v;
  return `<div class="recap"><span class="hub-sys">[SYSTEM] INVITE</span><h2>${esc(v.from || "A friend")} invited you</h2>
    ${v.m ? `<blockquote class="inv-m">“${esc(v.m)}”</blockquote>` : ""}
    ${v.code ? `<p class="small muted" style="margin:0">Add ${esc(v.from || "them")} as a friend to compare ranks. You'll both see each other's rank letters and sessions this week.</p>
      <button type="button" class="btn" data-inv-add="1" ${SH.busy ? "disabled" : ""}>${SH.busy ? "Adding…" : `Add ${esc(v.from || "friend")}`}</button>` : ""}
    <button type="button" class="btn ghost" data-inv-no="1">Not now</button></div>`;
}
function myRankWord() { try { const R = rankState(), V = rkShown(R); return R.place && !R.place.pending ? rkLetter(Math.floor(V.ov)) : null } catch (e) { return null } }
function defaultShareMsg(kind) {
  const L = myRankWord();
  if (kind === "recap" && SH && SH.rec) { const x = SH.rec; return `Week ${x.w} on RankUp: ${x.done} of ${x.plan} sessions${x.mi ? `, ${dTxt(x.mi)} run` : ""}${x.prs.length ? `, ${x.prs.length} new PR${x.prs.length > 1 ? "s" : ""}` : ""}. Join me and let's see who ranks up first.` }
  return `I'm training on RankUp${L ? ` and I'm ${L}-rank so far` : ""}. Add me as a friend and let's see who ranks up first.`;
}
function shareLink(msg) {
  const u = new URL(location.origin + "/"), code = FR.me && FR.me.code;
  if (code) u.searchParams.set("invite", code); u.searchParams.set("from", cleanTxt(hubName(), 30)); if (msg) u.searchParams.set("m", cleanTxt(msg, 280));
  return u.toString();
}
async function openShare(kind) {
  const msg = defaultShareMsg(kind);
  openSheet({ kind: "share", msg, loading: !FR.me });
  if (!FR.me) { if (!S.profile.friendsOn) { S.profile.friendsOn = 1; saveProfile() } await friendsLoad(true); if (SH && SH.kind === "share") { SH.loading = false; paintSheet() } }
}
function shareHtml() {
  const msg = SH.msg, link = shareLink(msg), full = `${msg}\n${link}`;
  return `<div class="xs-head"><h2>Share RankUp</h2><button type="button" class="btn ghost sm" data-xs="close">Cancel</button></div>
    <div class="field"><label for="shMsg">Your message</label><textarea id="shMsg" rows="3" maxlength="280" data-sh-msg="1">${esc(msg)}</textarea><span class="small muted" id="shCount">${msg.length}/280</span></div>
    <p class="small muted" style="margin:0">${SH.loading ? "Getting your link…" : FR.me ? "Your friend sees this message when they open the link, and you become friends when they sign up." : "Your friend sees this message when they open the link."}</p>
    <div class="sh-link"><span id="shLink">${esc(link)}</span></div>
    <div class="sh-btns">${navigator.share ? `<button type="button" class="btn" data-sh="native">Share…</button>` : ""}
      <a class="btn ghost" data-sh="sms" href="sms:?&body=${encodeURIComponent(full)}">Text</a>
      <a class="btn ghost" data-sh="wa" href="https://wa.me/?text=${encodeURIComponent(full)}" target="_blank" rel="noopener">WhatsApp</a>
      <a class="btn ghost" data-sh="mail" href="mailto:?subject=${encodeURIComponent("Join me on RankUp")}&body=${encodeURIComponent(full)}">Email</a>
      <button type="button" class="btn ghost" data-sh="copy">Copy</button></div>`;
}
function shareRefresh() {
  const link = shareLink(SH.msg), full = `${SH.msg}\n${link}`, L = document.getElementById("shLink"), c = document.getElementById("shCount");
  if (L) L.textContent = link; if (c) c.textContent = `${SH.msg.length}/280`;
  const set = (k, h) => { const a = document.querySelector(`[data-sh="${k}"]`); if (a) a.href = h };
  set("sms", `sms:?&body=${encodeURIComponent(full)}`); set("wa", `https://wa.me/?text=${encodeURIComponent(full)}`); set("mail", `mailto:?subject=${encodeURIComponent("Join me on RankUp")}&body=${encodeURIComponent(full)}`);
}
document.addEventListener("input", e => { const t = e.target; if (t.dataset && t.dataset.shMsg && SH && SH.kind === "share") { SH.msg = t.value.slice(0, 280); shareRefresh() } });
document.addEventListener("click", e => {
  const t = e.target.closest("[data-share],[data-sh],[data-inv-add],[data-inv-no]"); if (!t) return; const d = t.dataset;
  if (d.share != null) { openShare(d.share || ""); return }
  if (d.sh) { const link = shareLink(SH.msg), full = `${SH.msg}\n${link}`;
    if (d.sh === "native") { navigator.share({ title: "RankUp", text: SH.msg, url: link }).catch(() => {}); return }
    if (d.sh === "copy") { (navigator.clipboard ? navigator.clipboard.writeText(full) : Promise.reject()).then(() => toast("Message and link copied")).catch(() => { const L = document.getElementById("shLink"); if (L) { const r = document.createRange(); r.selectNodeContents(L); const s = getSelection(); s.removeAllRanges(); s.addRange(r) } toast("Select the link and copy it") }); return }
    return }
  if (d.invNo) { dropInvite(); xsClose(); return }
  if (d.invAdd) { const v = SH.v; SH.busy = true; paintSheet(); S.profile.friendsOn = 1; saveProfile();
    xApi("/api/friends", { action: "add", code: v.code }).then(j => { FR.list = j.friends || FR.list; FR.me = j.me || FR.me; dropInvite(); xsClose(); toast(`You and ${v.from || "your friend"} are friends`); if (tab === "ranks") { lastRenderKey = ""; render() } })
      .catch(e => { SH.busy = false; if (e.code === "not_found") { dropInvite(); xsClose(); toast("That invite link has expired") } else { paintSheet(); toast(e.code === "network" ? "You're offline. Try again later." : "Couldn't add right now") } }); return }
});
(function css2() { const s = document.createElement("style"); s.textContent = `
#inviteBar{position:fixed;left:12px;right:12px;top:calc(env(safe-area-inset-top,0px) + 10px);z-index:10001;display:flex;flex-direction:column;gap:2px;padding:10px 14px;border-radius:14px;background:#191C3E;border:1px solid #3B3C8A;color:#ECEFF7;font:500 14px/1.35 var(--body,system-ui);box-shadow:0 8px 30px rgba(0,0,0,.35);max-width:520px;margin:0 auto}
#inviteBar span{color:#C3C9D9}#inviteBar .ib-s{font-size:12px;color:#97A1B8}
.inv-m{margin:0;padding:10px 14px;border-left:3px solid var(--accent,#8F8BFF);background:var(--surface-2);border-radius:0 10px 10px 0;font-size:15px}
.sh-link{padding:10px 12px;border:1px dashed var(--line);border-radius:10px;font-size:12px;color:var(--muted);word-break:break-all;user-select:all}
.sh-btns{display:grid;grid-template-columns:1fr 1fr;gap:8px}.sh-btns .btn{text-align:center;text-decoration:none;justify-content:center}.sh-btns [data-sh="native"]{grid-column:1/-1}
`; document.head.appendChild(s) })();

/* ======================= After a workout: keep the changes? ======================= */
// Like Hevy's "update routine?": exercises added just for today, and a different number of working sets than the
// routine has (an extra set), can be saved into the routine (or left as a one-off). Swaps already ask when you make them.
function routineChanges(k) {
  const l = S.logs[k], su = CUSTOM && CUSTOM.su; if (!l || l.type !== "gym" || !l.ex || !su) return null;
  const rt = (S.profile.setup.routines || []).find(r => r.id === l.day); if (!rt) return null;
  const work = id => (l.ex[id] || []).filter(s => s && s.t !== "w").length, out = [];
  const add = ((S.profile.swaps || {}).add || {})[k] || [];
  add.forEach(a => { const n = work(a.id); if (n && !rt.ex.some(e => e.id === a.id)) out.push({ kind: "add", id: a.id, sets: n, lo: a.lo, hi: a.hi, rest: a.rest, name: (libEx(a.id) || { name: a.id }).name }) });
  const once = ((S.profile.swaps || {}).once || {})[k] || {};
  rt.ex.forEach(e => { if (once[e.id]) return; const n = work(e.id); if (n > e.sets) out.push({ kind: "sets", id: e.id, from: e.sets, sets: n, name: (libEx(e.id) || { name: e.id }).name }) });
  return out.length ? { rid: rt.id, rname: rt.name, list: out } : null;
}
function routineAsk(k, n = 0) {
  const asked = S.profile.rtAsked || {}; if (asked[k]) return;
  if (document.querySelector(".rk-up") && n < 120) { setTimeout(() => routineAsk(k, n + 1), 500); return }   // after the rank-up moment
  const c = routineChanges(k); if (!c || (SH && !document.getElementById("xsheet").hidden)) return;
  openSheet({ kind: "rtask", k, c, on: c.list.map(() => true) });
}
function rtaskHtml() {
  const c = SH.c;
  return `<div class="xs-head"><h2>Update ${esc(c.rname)}?</h2></div>
    <p class="small muted" style="margin:0">You changed this workout. Keep the changes for next time, or keep them to today only.</p>
    <div class="rt-list">${c.list.map((x, i) => `<label class="rt-row"><input type="checkbox" data-rt-on="${i}" ${SH.on[i] ? "checked" : ""}><span>${x.kind === "add" ? `Add <b>${esc(x.name)}</b> (${x.sets} set${x.sets > 1 ? "s" : ""})` : `<b>${esc(x.name)}</b>: ${x.sets} sets instead of ${x.from}`}</span></label>`).join("")}</div>
    <button type="button" class="btn" data-rt-save="1" ${SH.on.some(Boolean) ? "" : "disabled"}>Update routine</button>
    <button type="button" class="btn ghost" data-rt-no="1">Just today</button>`;
}
document.addEventListener("change", e => { const t = e.target; if (t.dataset && t.dataset.rtOn != null && SH && SH.kind === "rtask") { SH.on[+t.dataset.rtOn] = t.checked; const b = document.querySelector("[data-rt-save]"); if (b) b.disabled = !SH.on.some(Boolean) } });
document.addEventListener("click", e => {
  const t = e.target.closest("[data-rt-save],[data-rt-no]"); if (!t || !SH || SH.kind !== "rtask") return;
  const k = SH.k, c = SH.c; S.profile.rtAsked = { ...(S.profile.rtAsked || {}), [k]: 1 };
  if (t.dataset.rtNo) { saveProfile(); xsClose(); return }
  const pick = c.list.filter((x, i) => SH.on[i]); xsClose();
  suMut(su => { const r = su.routines.find(x => x.id === c.rid); if (!r) return;
    pick.forEach(x => { if (x.kind === "add" && !r.ex.some(e => e.id === x.id)) r.ex.push({ id: x.id, sets: x.sets, lo: x.lo || 8, hi: x.hi || 12, rest: x.rest || 90 });
      if (x.kind === "sets") { const e = r.ex.find(e => e.id === x.id); if (e) e.sets = x.sets } }) });
  toast(`${c.rname} updated`);
});
(function css3() { const s = document.createElement("style"); s.textContent = `.rt-list{display:flex;flex-direction:column;gap:6px}.rt-row{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:1px solid var(--line);border-radius:12px;font-size:14px;cursor:pointer}.rt-row input{margin-top:2px;width:18px;height:18px;flex:none}`; document.head.appendChild(s) })();
