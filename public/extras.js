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
    ...(runs ? [{ id: "strava", t: "Connect Strava so runs import themselves", done: !!(st.connected || ck.strava), go: "settings", skip: "I don't use Strava" }] : []),
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
    <button type="button" class="btn" data-xs="close">Let's go</button></div>`;
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
  if (!on) return `<div class="card" id="friends"><h2>Friends</h2><p class="small muted">Compare ranks with friends. They see your name, your rank letters and how many sessions you did this week. Nothing else.</p><button type="button" class="btn sm" data-fr-on="1" style="align-self:flex-start">Turn on friends</button></div>`;
  if (FR.list == null) { setTimeout(() => friendsLoad(), 0); return `<div class="card" id="friends"><h2>Friends</h2><p class="small muted"><span class="pulse"></span> Loading…</p></div>` }
  const L = (x) => x == null ? "?" : rkLetter(x), me = myCard(), rows = [{ name: hubName() + " (you)", card: me, you: true }, ...FR.list].sort((a, b) => ((b.card && b.card.ov) ?? -1) - ((a.card && a.card.ov) ?? -1));
  return `<div class="card" id="friends"><div class="row between"><h2>Friends</h2>${FR.me ? `<button type="button" class="btn ghost sm" data-fr-share="1">Your code: <b class="num">${esc(FR.me.code)}</b></button>` : ""}</div>
    ${FR.err ? `<p class="note">${esc(FR.err)}</p>` : ""}
    <div class="fr-list">${rows.map(f => { const c = f.card || {}; return `<div class="fr-row ${f.you ? "you" : ""}"><span class="fr-rank" style="background:${c.ov == null ? "#5B6378" : RK_COL[Math.min(5, Math.floor(c.ov))]}">${L(c.ov == null ? null : Math.floor(c.ov))}</span>
      <span class="fr-who"><b>${esc(f.name || "Friend")}</b><span class="fr-gs">${["upper", "lower", "core", "speed", "endur"].map(g => `<span>${RK_SHORT[g] === "Endurance" ? "Endur." : RK_SHORT[g]} <b>${c.g && c.g[g] != null ? rkLetter(Math.floor(c.g[g])) : "–"}</b></span>`).join("")}</span><span class="small muted num">${c.wk ? `${c.wk.done}/${c.wk.plan} this week` : ""}${c.streak ? ` · ${c.streak}-day streak` : ""}</span></span>
      ${f.you ? "" : `<button type="button" class="fp-x" data-fr-del="${esc(f.code)}" aria-label="Remove ${esc(f.name || "friend")}">×</button>`}</div>` }).join("")}</div>
    <div class="row" style="gap:8px;flex-wrap:nowrap"><input id="frCode" class="xs-search" autocomplete="off" autocapitalize="characters" placeholder="Friend's code" maxlength="8" style="flex:1;min-width:0"><button type="button" class="btn sm" data-fr-add="1">Add</button></div>
    <p class="small muted" style="margin:0">Share your code; when a friend adds it, you both see each other. <button type="button" class="link small" data-fr-off="1">Turn off friends</button></p></div>`;
}

/* ======================= sheets + taps ======================= */
function extraSheetHtml() { return SH.kind === "recap" ? recapHtml() : SH.kind === "rimport" ? rimportHtml() : "" }
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
