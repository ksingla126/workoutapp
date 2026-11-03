/* Food, plan-first. Three views:
   Plan  — your own recipes on a daily meal plan (the main screen).
   Today — the food diary, with one-tap logging from the plan.
   Shop  — a weekly list built from the recipes on your plan, split across rotating weeks (Week A, Week B…).
           Tap an item's week chip to move it: buy it every week, or all at once on one week of the rotation.
   Cooking mode opens a recipe card where you change amounts, drop or add ingredients, then choose whether that's
   just for this week or for good. Macros follow whatever you actually made.
   State: kitchen().shop2 = {weeks:[names], day, start, assign:{key: "*"|weekIndex}, extras:[...], notes:[...], seen}
          kitchen().cookWeek = {recipeId: {items, servings, until}} */

let foodView = "plan"; try { const v = localStorage.getItem("ru-foodview"); if (["plan", "today", "shop"].includes(v)) foodView = v } catch (e) {}
let fpShopWeek = null; // which week of the rotation the Shop view is showing

/* ---------- this week's version of a recipe ---------- */
// cooking changes "just for this week" last until the day before your next shopping day
function fpWeekEnd() { const sh = fpShop(), d0 = new Date(today); let d = addDays(d0, 1); while (d.getDay() !== (sh.day || 0)) d = addDays(d, 1); return ymd(addDays(d, -1)) }
function recipeWeek(rid) { const K = kitchen(), cw = K.cookWeek && K.cookWeek[rid]; if (!cw) return null; if (cw.until < ymd(today)) { delete K.cookWeek[rid]; return null } return cw }
function fpEffItems(r) { const ov = recipeWeek(r.id); return ov ? ov.items : scaledItems(r) }

/* ---------- shopping weeks ---------- */
function fpShop() {
  const K = kitchen();
  if (!K.shop2) K.shop2 = fpMigrate(K) || { weeks: ["This week"], day: 0, start: ymd(nextShopDay({ day: 0 })), assign: {}, extras: [], notes: [] };
  const s = K.shop2; s.weeks = s.weeks && s.weeks.length ? s.weeks : ["This week"]; s.assign = s.assign || {}; s.extras = s.extras || []; s.notes = s.notes || [];
  return s;
}
// the old Week A / Week B lists become the rotation: an item on only one list gets bought on that week
function fpMigrate(K) {
  const old = K.shop; if (!old || !old.lists || !old.lists.length) return null;
  const ids = (old.cycle || []).filter(id => old.lists.some(l => l.id === id)); if (!ids.length) return null;
  const lists = ids.map(id => old.lists.find(l => l.id === id)), need = groceryList();
  const words = s => String(s || "").toLowerCase().replace(/[^a-z ]/g, " ").split(/\s+/).filter(w => w.length > 2 && !["lean", "ground", "fresh", "frozen", "large", "breast", "liquid", "whole", "raw", "dry", "cooked"].includes(w)).map(w => w.replace(/(es|s)$/, "").slice(0, 7));
  const match = name => { const w = words(name); return need.find(g => w.length && w.some(x => x.length > 2 && g.n.toLowerCase().includes(x))) };
  // alias keeps each item's old key, so products you scanned (and recipes sized to them) carry over
  const s = { weeks: lists.map(l => l.name || "Week"), day: old.day || 0, start: old.start || ymd(nextShopDay({ day: 0 })), assign: {}, extras: [], alias: {}, notes: lists.map(l => (l.steps || []).join("\n")), migrated: true };
  const seen = {};
  lists.forEach((l, wi) => (l.items || []).forEach(it => { const g = match(it.name), key = g ? "f:" + g.id : "x:" + (it.name || "").toLowerCase(); (seen[key] = seen[key] || { it, g, weeks: new Set() }).weeks.add(wi) }));
  Object.entries(seen).forEach(([key, v]) => { const wk = v.weeks.size === lists.length ? "*" : [...v.weeks][0];
    if (v.g) { s.assign[key] = wk; if (v.it.id) s.alias[key] = v.it.id }
    else { const id = newId("ex"); s.extras.push({ id, name: v.it.name, amt: v.it.amt, unit: v.it.unit || "", note: v.it.note || "", week: wk }); if (v.it.id) s.alias["x:" + id] = v.it.id } });
  return s;
}
function fpWeekIdx(s, d) { const n = s.weeks.length; if (n < 2) return 0; const st = parseYmd(s.start || ymd(d)); const w = Math.floor(Math.round((d - st) / 864e5) / 7); return ((w % n) + n) % n }
function fpNextShop(s) { return nextShopDay({ day: s.day || 0 }) }
// what to buy on week w: weekly needs from the plan (×N when an item is bought once per rotation) plus extras
function fpShopItems(s, w) {
  const N = s.weeks.length, out = [], need = groceryList(), uses = fpUses();
  need.forEach(g => { const key = "f:" + g.id, a = s.assign[key] == null ? "*" : s.assign[key]; if (a !== "*" && Number(a) !== w) return;
    const mult = a === "*" ? 1 : N, gr = g.gr * mult;
    const ea = fpEach(g.id), need = ea ? { q: Math.ceil(gr / ea[1] - 0.05), u: "count" } : gr / 28.3495 >= 16 ? { q: +(gr / 453.6).toFixed(2), u: "lb" } : { q: +(gr / 28.3495).toFixed(1), u: "oz" };
    out.push({ key, name: g.n, gr, qty: fpQty(g.id, gr), need, a, mult, uses: uses[g.id] || [] }) });
  s.extras.forEach(x => { const a = x.week == null ? "*" : x.week; if (a !== "*" && Number(a) !== w) return;
    out.push({ key: "x:" + x.id, name: x.name, qty: x.note || (x.amt ? `${fmtQ(x.amt)}${x.unit && x.unit !== "count" ? " " + x.unit : ""}` : ""), need: x.amt > 0 && GU[x.unit] ? { q: +x.amt, u: x.unit } : null, a, extra: x }) });
  return out.sort((a, b) => (a.extra ? 1 : 0) - (b.extra ? 1 : 0) || a.name.localeCompare(b.name));
}
// things you buy by the piece (eggs, tortillas, cans); meat and produce are bought by weight
function fpEach(id) { const f = foodById(id); return f && !f.custom ? (f.sv || []).find(([l]) => /^1 (large|medium|bagel|bun|tortilla|avocado|clove|cake|bar|can|block|package|bottle)/.test(l)) : null }
function fpQty(id, gr) { const f = foodById(id); if (!f) return ""; if (f.custom) return `${fmtQ(Math.round(gr / 100 * 10) / 10)} × ${f.serving || "serving"}`;
  const each = fpEach(id);
  return each ? `${Math.ceil(gr / each[1] - 0.05)} × ${each[0].replace(/^1 /, "")}` : gr >= 454 ? `${fmtQ(+(gr / 453.6).toFixed(1))} lb` : `${Math.ceil(gr / 28.35)} oz` }
function fpUses() { const K = kitchen(), out = {}; SLOTS.forEach(([sk]) => (K.plan[sk] || []).forEach(e => { if (e.t !== "r") return; const r = K.recipes.find(x => x.id === e.id); if (!r) return; (r.items || []).forEach(it => { (out[it.f] = out[it.f] || []); if (!out[it.f].includes(r.name)) out[it.f].push(r.name) }) })); return out }
const fpWkName = (s, a) => a === "*" || a == null ? "Every week" : `${s.weeks[a] || "Week " + (Number(a) + 1)} only`;

/* ---------- screens ---------- */
function foodTab() {
  const seg = `<div class="seg three fp-seg" role="tablist" aria-label="Food">${[["plan", "Plan"], ["today", "Today"], ["shop", "Shop"]].map(([v, n]) => `<button role="tab" data-fpv="${v}" aria-selected="${foodView === v}" class="${foodView === v ? "on" : ""}">${n}</button>`).join("")}</div>`;
  return seg + (foodView === "today" ? fpToday() : foodView === "shop" ? fpShopView() : fpPlan());
}
function fpPlan() {
  const K = kitchen(), g = foodGoals(); let day = { ...ZERO }, h = "";
  SLOTS.forEach(([sk]) => (K.plan[sk] || []).forEach(e => { const M = entryMacros(e); if (M) day = addM(day, M.m) }));
  const pk = Math.min(100, day.kcal / g.kcal * 100), pp = Math.min(100, day.p / g.p * 100);
  h += `<div class="card fp-head"><div class="row between"><div><span class="hub-sys">MEAL PLAN</span><h2>Every day</h2></div><button type="button" class="btn ghost sm" data-fp-goals="1">Goals</button></div>
    <div class="fp-tot"><div><div class="row between"><span>Calories</span><b class="num">${fmtN(day.kcal)} <small>/ ${fmtN(g.kcal)}</small></b></div><div class="bar food"><i style="width:${pk}%"></i></div></div>
      <div><div class="row between"><span>Protein</span><b class="num">${Math.round(day.p)} <small>/ ${g.p} g</small></b></div><div class="bar food"><i style="width:${pp}%"></i></div></div></div>
    <p class="small muted" style="margin:0">${day.kcal ? `Carbs ${Math.round(day.c)} g · Fat ${Math.round(day.f)} g a day.${g.kcal - day.kcal > g.kcal * 0.15 ? ` About ${fmtN(Math.round((g.kcal - day.kcal) / 50) * 50)} kcal short: add a snack or another serving.` : ""}` : "Add your recipes to each meal. Your shopping list builds itself from this plan."}</p></div>`;
  SLOTS.forEach(([sk, sn]) => {
    const its = K.plan[sk] || [];
    h += `<div class="card fp-slot"><div class="row between"><h3>${sn}</h3><button type="button" class="btn ghost sm" data-c-padd="${sk}">+ Add</button></div>`;
    if (!its.length) h += `<p class="small muted" style="margin:0">Nothing planned.</p>`;
    its.forEach((e, i) => { const M = entryMacros(e); if (!M) return;
      if (e.t === "r") { const r = K.recipes.find(x => x.id === e.id), wk = recipeWeek(e.id);
        h += `<div class="fp-rec"><div class="fp-rec-top"><div class="fp-rec-name"><b>${esc(r.name)}</b><span class="small muted num">${esc(M.amount)} a day · ${fmtN(M.m.kcal)} kcal · ${Math.round(M.m.p)} g protein</span>${wk ? `<span class="fp-tag">Changed this week</span>` : typeof recipeScales === "function" && recipeScales(r).length ? `<span class="fp-tag">Adjusted to your packages</span>` : ""}</div>
          <button type="button" class="fp-x" data-c-prm="${sk}|${i}" aria-label="Remove ${esc(r.name)} from ${sn}">×</button></div>
          <div class="fp-rec-btns"><button type="button" class="btn sm" data-fp-cook="${r.id}">Cook</button><button type="button" class="btn ghost sm" data-c-rec="${r.id}">Edit recipe</button>${wk ? `<button type="button" class="link small" data-fp-reset="${r.id}">Undo this week's changes</button>` : ""}</div></div>` }
      else h += `<div class="extra"><span>${esc(M.name)} <span class="muted small num">· ${esc(M.amount)} · ${fmtN(M.m.kcal)} kcal</span></span><button type="button" data-c-prm="${sk}|${i}" aria-label="Remove ${esc(M.name)}">×</button></div>` });
    h += `</div>` });
  // all recipes, planned or not
  h += `<div class="card"><div class="row between"><h2>My recipes</h2><button type="button" class="btn sm" data-c-rec="">+ New recipe</button></div>`;
  h += K.recipes.length ? K.recipes.map(r => { const T = recipeTotals(r); return `<div class="fp-recrow"><button type="button" class="dayline rec" data-c-rec="${r.id}"><span class="txt"><b>${esc(r.name)}</b><br><span class="small muted num">Makes ${T.n} · ${fmtN(T.per.kcal)} kcal · ${Math.round(T.per.p)} g protein per serving</span></span></button><button type="button" class="btn ghost sm" data-fp-cook="${r.id}">Cook</button></div>` }).join("")
    : `<p class="small muted" style="margin:0">Add the meals you cook: every ingredient in the batch and how many servings it makes. The app works out macros per serving, then put them on your plan.</p>`;
  h += `</div>`;
  h += `<details class="card fp-foods" ${K.foods.length ? "open" : ""}><summary><b>My foods</b> <span class="small muted">· packaged foods from their label</span></summary>${K.foods.map(f => `<button type="button" class="dayline" data-c-cf="${f.id}"><span class="txt"><b>${esc(f.n)}</b> <span class="small muted num">${esc(f.serving)} · ${fmtN(f.k)} kcal · ${f.p} g P</span></span></button>`).join("")}<button type="button" class="btn ghost sm" data-c-cf="" style="align-self:flex-start">+ New food</button></details>`;
  return h;
}
function fpToday() {
  const k = ymd(sel), isT = k === ymd(today);
  return `<div class="row between fp-daynav"><button type="button" class="btn ghost sm" data-fp-day="-1" aria-label="Previous day">‹</button><b>${isT ? "Today" : fmtDate(sel)}</b><button type="button" class="btn ghost sm" data-fp-day="1" aria-label="Next day" ${isT ? "disabled" : ""}>›</button></div>` + diaryCard(sel);
}
function fpShopView() {
  const s = fpShop(), N = s.weeks.length, nd = fpNextShop(s), next = fpWeekIdx(s, nd);
  if (fpShopWeek == null || fpShopWeek >= N) fpShopWeek = next;
  const w = fpShopWeek, items = fpShopItems(s, w), g = S.profile.grocery || {}, ck = it => `w${w}:${it.key}`;
  let h = `<div class="card fp-shophead"><div class="row between"><div><span class="hub-sys">SHOPPING</span><h2>${DAYS7[s.day || 0]}s</h2></div><button type="button" class="btn ghost sm" data-fp-sched="1">Schedule</button></div>
    <p class="small muted" style="margin:0">Next shop ${fmtShort(nd)}: <b>${esc(s.weeks[next])}</b>.${N > 1 ? ` Weeks rotate ${s.weeks.map(esc).join(" → ")}.` : " Add a second week in Schedule to shop on a rotation (big shop, quick shop)."}</p>
    ${N > 1 ? `<div class="seg fp-wseg" style="grid-template-columns:repeat(${N},1fr)" role="tablist" aria-label="Shopping week">${s.weeks.map((n, i) => `<button role="tab" data-fp-wk="${i}" aria-selected="${i === w}" class="${i === w ? "on" : ""}">${esc(n)}${i === next ? " · next" : ""}</button>`).join("")}</div>` : ""}
    ${storeBar()}</div>`;
  h += `<div class="card fp-list"><div class="row between"><h3>${esc(s.weeks[w])}${w === next ? ` <span class="chip food">${fmtShort(nd)}</span>` : ""}</h3><span class="small muted">${items.length} item${items.length === 1 ? "" : "s"}</span></div>`;
  if (!items.length) h += `<p class="small muted" style="margin:0">${kitchen().recipes.length ? "Nothing to buy this week. Put recipes on your plan, or add items below." : "Add recipes to your plan and this list fills in by itself."}</p>`;
  items.forEach(it => { const chip = `<button type="button" class="fp-mv" data-fp-mv="${esc(it.key)}" aria-haspopup="menu" aria-label="${esc(it.name)}: ${esc(fpWkName(s, it.a))}. Tap to move">${esc(N > 1 ? (it.a === "*" ? "Every week" : s.weeks[it.a]) : "Move")}<svg viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>`;
    h += `<div class="fp-item">${shopRow((s.alias && s.alias[it.key]) || it.key, ck(it), it.name, it.qty, it.need)}<div class="fp-item-sub">${it.uses && it.uses.length ? `<span class="small muted">${esc(it.uses.join(", "))}${it.mult > 1 ? ` · covers ${it.mult} weeks` : ""}</span>` : it.extra ? `<button type="button" class="link small" data-fp-xedit="${esc(it.extra.id)}">Edit</button>` : "<span></span>"}${N > 1 ? chip : ""}</div></div>` });
  h += `<div class="row" style="gap:8px;margin-top:6px"><button type="button" class="btn ghost sm" data-fp-xadd="1">+ Add item</button><button type="button" class="link small" data-fp-unck="${w}">Uncheck all</button></div>`;
  if (s.notes[w]) h += `<div class="eyebrow" style="margin-top:10px">Cooking order</div><ol class="steps small">${s.notes[w].split("\n").filter(Boolean).map(x => `<li>${esc(x)}</li>`).join("")}</ol>`;
  return h + `</div>`;
}

/* ---------- sheets ---------- */
function fpGoalsHtml() { const g = foodGoals();
  return `<div class="xs-head"><h2>Daily goals</h2><button type="button" class="btn ghost sm" data-xs="close">Done</button></div>
    <div class="row">${[["kcal", "Calories", g.kcal], ["protein", "Protein g", g.p], ["carbs", "Carbs g", g.c], ["fat", "Fat g", g.f]].map(([k, l, v]) => `<div class="field"><label>${l}</label><input inputmode="numeric" data-c-goal="${k}" value="${v}"></div>`).join("")}</div>
    <p class="small muted">Carbs fill whatever calories protein and fat leave, unless you set them.</p>` }
function fpSchedHtml() { const W = SH;
  return `<div class="xs-head"><h2>Shopping schedule</h2><button type="button" class="btn ghost sm" data-xs="close">Cancel</button></div>
    <div class="field"><label for="fpDay">Shopping day</label><select id="fpDay" data-fps="day">${DAYS7.map((d, i) => `<option value="${i}" ${i === W.day ? "selected" : ""}>${d}</option>`).join("")}</select></div>
    <p class="small muted" style="margin:0">Your weeks repeat in this order. Items you buy every week show up on all of them; move an item to one week to buy it all at once.</p>
    ${W.weeks.map((n, i) => `<div class="row fp-wkrow" style="flex-wrap:nowrap"><input aria-label="Week ${i + 1} name" data-fps="wk" data-i="${i}" value="${esc(n)}" style="flex:1;min-width:0">${W.weeks.length > 1 ? `<button type="button" class="btn ghost sm" data-fps-rm="${i}">Remove</button>` : ""}</div>`).join("")}
    ${W.weeks.length < 4 ? `<button type="button" class="btn ghost sm" data-fps-add="1" style="align-self:flex-start">+ Add a week</button>` : ""}
    ${W.weeks.length > 1 ? `<div class="field"><label for="fpPos">Your next shopping day (${fmtShort(nextShopDay({ day: W.day }))}) is</label><select id="fpPos" data-fps="pos">${W.weeks.map((n, i) => `<option value="${i}" ${i === W.pos ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></div>` : ""}
    <button type="button" class="btn" data-fps-save="1">Save schedule</button>` }
function fpExtraHtml() { const W = SH, s = fpShop();
  return `<div class="xs-head"><h2>${W.id ? "Edit item" : "Add item"}</h2><button type="button" class="btn ghost sm" data-xs="close">Cancel</button></div>
    <p class="small muted" style="margin:0">For things that aren't in a recipe: snacks, coffee, paper towels.</p>
    <div class="field"><label for="fpxName">Item</label><input id="fpxName" data-fpx="name" value="${esc(W.name || "")}" data-xs-focus="fpxname" placeholder="e.g. Bananas"></div>
    <div class="field"><label for="fpxNote">Amount (optional)</label><input id="fpxNote" data-fpx="note" value="${esc(W.note || "")}" data-xs-focus="fpxnote" placeholder="e.g. 6, or 1 bag"></div>
    ${s.weeks.length > 1 ? `<div class="field"><label for="fpxWk">Buy it</label><select id="fpxWk" data-fpx="week"><option value="*" ${W.week === "*" ? "selected" : ""}>Every week</option>${s.weeks.map((n, i) => `<option value="${i}" ${String(W.week) === String(i) ? "selected" : ""}>${esc(n)} only</option>`).join("")}</select></div>` : ""}
    <div class="row"><button type="button" class="btn" data-fpx-save="1">${W.id ? "Save" : "Add"}</button>${W.id ? `<button type="button" class="btn ghost" data-fpx-del="1">${W.delConfirm ? "Tap again to delete" : "Delete"}</button>` : ""}</div>` }
// cooking: the recipe card you work from, with this week's changes
function fpCookHtml() {
  const r = SH.r, o = SH.orig, T = recipeTotals(r, true), O = recipeTotals(o, true), dk = Math.round(T.per.kcal - O.per.kcal), dp = Math.round(T.per.p - O.per.p);
  const same = (a, b) => a && b && a.f === b.f && Number(a.amt) === Number(b.amt) && a.unit === b.unit;
  let h = `<div class="xs-head"><div><span class="hub-sys">COOKING</span><h2 style="margin:2px 0 0">${esc(r.name)}</h2></div><button type="button" class="btn ghost sm" data-xs="close">Close</button></div>`;
  if (SH.ask) return h + `<div class="fp-ask"><b>Keep these changes?</b><p class="small muted">${SH.diff.map(esc).join(" · ")}</p>
      <button type="button" class="btn" data-fp-save="week">Just this week</button><button type="button" class="btn ghost" data-fp-save="perm">Make it permanent</button><button type="button" class="link small" data-fp-save="back">Back to the recipe</button>
      <p class="small muted" style="margin:0">This week lasts until your next shopping day (${fmtShort(addDays(parseYmd(fpWeekEnd()), 1))}). Permanent changes update the recipe and your shopping list.</p></div>`;
  h += `<p class="small muted" style="margin:0">Change anything you're doing differently today. Macros update as you go.</p>
    <div class="field" style="max-width:160px"><label for="fpServ">Makes (servings)</label><input id="fpServ" inputmode="numeric" data-fp-serv="1" value="${esc(r.servings)}" data-xs-focus="fpserv"></div>
    <div class="fp-ings">${r.items.map((it, i) => { const f = foodById(it.f); if (!f) return ""; const was = o.items.find(x => x.f === it.f), changed = !was ? "new" : !same(it, was) ? "chg" : "";
      return `<div class="fp-ing ${changed}"><span class="fp-ing-n">${esc(f.n)}${changed === "new" ? ` <span class="fp-tag">Added</span>` : ""}</span><span class="fp-ing-a"><input inputmode="decimal" aria-label="${esc(f.n)} amount" data-fp-amt="${i}" value="${esc(it.amt)}" data-xs-focus="fpa${i}"><span class="small muted">${esc(it.unit)}</span></span><button type="button" class="fp-x" data-fp-rm="${i}" aria-label="Remove ${esc(f.n)} this time">×</button></div>` }).join("")}</div>
    ${(SH.removed || []).length ? `<div class="fp-removed small">Not using: ${SH.removed.map((it, i) => { const f = foodById(it.f); return `${esc(f ? f.n : it.f)} <button type="button" class="link small" data-fp-undo="${i}">Put back</button>` }).join(" · ")}</div>` : ""}
    <button type="button" class="btn ghost sm" data-xs="ingnew" style="align-self:flex-start">+ Add ingredient</button>
    <div class="note num rtot fp-ctot"><b>Per serving:</b> ${fmtN(T.per.kcal)} kcal · ${Math.round(T.per.p)} g protein · ${Math.round(T.per.c)} g carbs · ${Math.round(T.per.f)} g fat${dk || dp ? `<br><span class="small">${dk >= 0 ? "+" : ""}${dk} kcal, ${dp >= 0 ? "+" : ""}${dp} g protein vs the recipe</span>` : ""}</div>
    ${r.method ? `<details class="fp-method"><summary><b>Method</b></summary><ol class="steps small">${String(r.method).split("\n").filter(Boolean).map(x => `<li>${esc(x)}</li>`).join("")}</ol></details>` : ""}
    <button type="button" class="btn" data-fp-done="1">Done cooking</button>`;
  return h;
}
function fpDiff(o, r) {
  const out = [], nm = id => { const f = foodById(id); return f ? f.n.split(",")[0] : id };
  if (Number(o.servings) !== Number(r.servings)) out.push(`makes ${r.servings} (was ${o.servings})`);
  o.items.forEach(a => { const b = r.items.find(x => x.f === a.f); if (!b) out.push(`no ${nm(a.f)}`); else if (Number(a.amt) !== Number(b.amt) || a.unit !== b.unit) out.push(`${nm(a.f)} ${fmtQ(b.amt)} ${b.unit} (was ${fmtQ(a.amt)})`) });
  r.items.forEach(b => { if (!o.items.some(a => a.f === b.f)) out.push(`+ ${nm(b.f)} ${fmtQ(b.amt)} ${b.unit}`) });
  return out;
}

/* ---------- taps ---------- */
function fpRedo() { lastRenderKey = ""; render() }
let fpMenu = null;
function fpCloseMenu() { if (fpMenu) { fpMenu.remove(); fpMenu = null } }
document.addEventListener("click", e => {
  const t = e.target.closest && e.target.closest("button"); if (!t) { if (fpMenu && !e.target.closest(".fp-menu")) fpCloseMenu(); return } const d = t.dataset;
  if (d.fpv) { foodView = d.fpv; try { localStorage.setItem("ru-foodview", foodView) } catch (_) {} fpRedo(); window.scrollTo(0, 0); return }
  if (d.fpDay) { const n = addDays(sel, Number(d.fpDay)); if (n <= today) { sel = n; fpRedo() } return }
  if (d.fpGoals) { openSheet({ kind: "fpgoals" }); return }
  if (d.fpCook) { const K = kitchen(), r = K.recipes.find(x => x.id === d.fpCook); if (!r) return; const items = JSON.parse(JSON.stringify(fpEffItems(r))), ov = recipeWeek(r.id);
    const base = { id: r.id, name: r.name, servings: ov ? ov.servings : r.servings, items, method: r.method };
    openSheet({ kind: "recipe", cook: true, r: JSON.parse(JSON.stringify(base)), orig: { ...JSON.parse(JSON.stringify(base)), servings: r.servings, items: JSON.parse(JSON.stringify(scaledItems(r))) }, removed: [] }); return }
  if (d.fpReset) { const K = kitchen(); if (K.cookWeek) delete K.cookWeek[d.fpReset]; saveProfile(); fpRedo(); toast("Back to the usual recipe"); return }
  if (d.fpRm != null && SH && SH.cook) { const [it] = SH.r.items.splice(+d.fpRm, 1); if (it) SH.removed.push(it); paintSheet(); return }
  if (d.fpUndo != null && SH && SH.cook) { const [it] = SH.removed.splice(+d.fpUndo, 1); if (it) SH.r.items.push(it); paintSheet(); return }
  if (d.fpDone && SH && SH.cook) { SH.r.servings = Math.max(1, Math.round(numIn(SH.r.servings)) || 1); SH.r.items = SH.r.items.filter(it => numIn(it.amt) > 0).map(it => ({ ...it, amt: numIn(it.amt) }));
    const diff = fpDiff(SH.orig, SH.r); if (!diff.length) { xsClose(); toast("Enjoy your meal prep"); return } SH.diff = diff; SH.ask = true; paintSheet(true); return }
  if (d.fpSave && SH && SH.cook) { if (d.fpSave === "back") { SH.ask = false; paintSheet(); return }
    const K = kitchen(), r = K.recipes.find(x => x.id === SH.r.id); if (!r) { xsClose(); return }
    if (d.fpSave === "perm") { r.items = JSON.parse(JSON.stringify(SH.r.items)); r.servings = SH.r.servings; if (K.cookWeek) delete K.cookWeek[r.id]; if (typeof RECIPE_SCALE !== "undefined") Object.keys(RECIPE_SCALE).forEach(k => { if (RECIPE_SCALE[k].uses.some(([rid]) => rid === r.id) && S.profile.scales) delete S.profile.scales[k] }) }
    else { K.cookWeek = K.cookWeek || {}; K.cookWeek[r.id] = { items: JSON.parse(JSON.stringify(SH.r.items)), servings: SH.r.servings, until: fpWeekEnd() } }
    const wk = d.fpSave === "week"; xsClose(); commitPlan(); toast(wk ? `Changed for this week. Macros updated until ${fmtShort(parseYmd(fpWeekEnd()))}.` : "Recipe updated for good. Your shopping list follows it."); return }
  // shopping
  if (d.fpWk != null) { fpShopWeek = Number(d.fpWk); fpRedo(); return }
  if (d.fpUnck != null) { const g = { ...(S.profile.grocery || {}) }; Object.keys(g).forEach(k => { if (k.startsWith("w" + d.fpUnck + ":")) delete g[k] }); S.profile.grocery = g; saveProfile(); fpRedo(); return }
  if (d.fpMv) { fpOpenMove(t, d.fpMv); return }
  if (d.fpMvTo != null) { const s = fpShop(), key = fpMenu && fpMenu.dataset.key; fpCloseMenu(); if (!key) return; const to = d.fpMvTo === "*" ? "*" : Number(d.fpMvTo);
    if (key.startsWith("x:")) { const x = s.extras.find(z => "x:" + z.id === key); if (x) x.week = to } else s.assign[key] = to;
    saveProfile(); fpRedo(); toast(to === "*" ? "Buying it every week" : `Moved to ${s.weeks[to]}: buying ${s.weeks.length} weeks' worth there`); return }
  if (d.fpSched) { const s = fpShop(); openSheet({ kind: "fpsched", day: s.day || 0, weeks: [...s.weeks], pos: fpWeekIdx(s, fpNextShop(s)) }); return }
  if (d.fpsAdd && SH) { SH.weeks.push(SH.weeks.length === 1 && SH.weeks[0] === "This week" ? "Week B" : "Week " + String.fromCharCode(65 + SH.weeks.length)); if (SH.weeks[0] === "This week") SH.weeks[0] = "Week A"; paintSheet(); return }
  if (d.fpsRm != null && SH) { SH.weeks.splice(+d.fpsRm, 1); if (SH.pos >= SH.weeks.length) SH.pos = 0; if (SH.weeks.length === 1 && /^Week A$/.test(SH.weeks[0])) SH.weeks[0] = "This week"; paintSheet(); return }
  if (d.fpsSave && SH) { const s = fpShop(), N = SH.weeks.length, nd = nextShopDay({ day: SH.day });
    s.day = SH.day; s.weeks = SH.weeks.map((n, i) => String(n || "").trim().slice(0, 30) || `Week ${String.fromCharCode(65 + i)}`); s.start = ymd(addDays(nd, -7 * (SH.pos || 0)));
    Object.keys(s.assign).forEach(k => { if (s.assign[k] !== "*" && s.assign[k] >= N) s.assign[k] = "*" }); s.extras.forEach(x => { if (x.week !== "*" && x.week >= N) x.week = "*" }); s.notes = s.notes.slice(0, N);
    fpShopWeek = null; xsClose(); saveProfile(); fpRedo(); toast("Schedule saved"); return }
  if (d.fpXadd) { openSheet({ kind: "fpextra", name: "", note: "", week: fpShop().weeks.length > 1 ? String(fpShopWeek ?? "*") : "*" }); return }
  if (d.fpXedit) { const x = fpShop().extras.find(z => z.id === d.fpXedit); if (x) openSheet({ kind: "fpextra", id: x.id, name: x.name, note: x.note || (x.amt ? `${fmtQ(x.amt)} ${x.unit || ""}`.trim() : ""), week: x.week == null ? "*" : String(x.week) }); return }
  if (d.fpxSave && SH) { const s = fpShop(), name = String(SH.name || "").trim().slice(0, 60); if (!name) { toast("Name the item"); return }
    const week = SH.week === "*" || SH.week == null ? "*" : Number(SH.week);
    if (SH.id) { const x = s.extras.find(z => z.id === SH.id); if (x) Object.assign(x, { name, note: String(SH.note || "").trim(), amt: null, unit: "", week }) }
    else s.extras.push({ id: newId("ex"), name, note: String(SH.note || "").trim(), week });
    xsClose(); saveProfile(); fpRedo(); return }
  if (d.fpxDel && SH) { if (!SH.delConfirm) { SH.delConfirm = true; paintSheet(); return } const s = fpShop(); s.extras = s.extras.filter(z => z.id !== SH.id); xsClose(); saveProfile(); fpRedo(); return }
});
function fpOpenMove(btn, key) {
  const open = fpMenu && fpMenu.dataset.key === key; fpCloseMenu(); if (open) return;
  const s = fpShop(), cur = key.startsWith("x:") ? ((s.extras.find(z => "x:" + z.id === key) || {}).week ?? "*") : (s.assign[key] ?? "*");
  const m = document.createElement("div"); m.className = "st-menu fp-menu"; m.setAttribute("role", "menu"); m.dataset.key = key; m.dataset.at = Date.now();
  m.innerHTML = [["*", "Every week", "Buy a week's worth each time"], ...s.weeks.map((n, i) => [String(i), `${n} only`, `Buy ${s.weeks.length} weeks' worth on ${n}`])]
    .map(([v, n, dd]) => `<button type="button" role="menuitemradio" aria-checked="${String(cur) === v}" class="${String(cur) === v ? "on" : ""}" data-fp-mv-to="${v}"><span><b>${esc(n)}</b><span class="small muted">${esc(dd)}</span></span></button>`).join("");
  document.body.appendChild(m); fpMenu = m; const r = btn.getBoundingClientRect(), mw = Math.min(260, innerWidth - 24); m.style.width = mw + "px"; m.style.left = Math.max(12, Math.min(r.right - mw, innerWidth - mw - 12)) + "px";
  const h = m.offsetHeight; m.style.top = (r.bottom + 8 + h > innerHeight - 12 ? Math.max(12, r.top - h - 8) : r.bottom + 8) + "px";
  const f = m.querySelector("button.on") || m.querySelector("button"); if (f) f.focus({ preventScroll: true });
}
addEventListener("scroll", () => { if (fpMenu && Date.now() - Number(fpMenu.dataset.at) > 400) fpCloseMenu() }, { passive: true });
document.addEventListener("keydown", e => { if (e.key === "Escape") fpCloseMenu() });
document.addEventListener("input", e => { const t = e.target, d = (t && t.dataset) || {}; if (!SH) return;
  if (d.fpAmt != null && SH.cook) { const it = SH.r.items[+d.fpAmt]; if (it) { it.amt = t.value; paintPart(".fp-ctot") } return }
  if (d.fpServ && SH.cook) { SH.r.servings = t.value; paintPart(".fp-ctot"); return }
  if (d.fps === "wk" && SH.kind === "fpsched") { SH.weeks[+d.i] = t.value; return }
  if (d.fpx && SH.kind === "fpextra") { SH[d.fpx] = t.value; return }
});
document.addEventListener("change", e => { const t = e.target, d = (t && t.dataset) || {}; if (!SH) return;
  if (d.fps === "day") { SH.day = Number(t.value); paintSheet(); return } if (d.fps === "pos") { SH.pos = Number(t.value); return }
  if (d.fpx === "week") { SH.week = t.value; return }
});

(() => { const st = document.createElement("style"); st.textContent = `
.fp-seg{margin-bottom:2px}
.fp-head h2{margin:2px 0 0}.fp-tot{display:grid;grid-template-columns:1fr 1fr;gap:12px}.fp-tot .row{flex-direction:column;align-items:flex-start;gap:0}.fp-tot span{font-size:13px;color:var(--muted)}.fp-tot b{font-size:15px}.fp-tot small{font-size:12px;color:var(--muted);font-weight:600}
.fp-slot h3{margin:0;font:700 17px var(--display)}
.fp-rec{border:1px solid var(--line);border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:10px;background:var(--surface-2)}
.fp-rec-top{display:flex;align-items:flex-start;gap:8px}.fp-rec-name{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.fp-rec-name b{font-size:16px}
.fp-rec-btns{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.fp-x{width:36px;height:36px;flex-shrink:0;border:1px solid var(--line);background:var(--surface);color:var(--muted);border-radius:10px;font-size:18px;cursor:pointer}
.fp-tag{align-self:flex-start;font:700 10.5px var(--body);letter-spacing:.06em;text-transform:uppercase;color:var(--warn);background:var(--coach-soft);border-radius:999px;padding:2px 8px}
.fp-recrow{display:flex;align-items:center;gap:8px}.fp-recrow .dayline{flex:1;min-width:0}
.fp-foods summary{cursor:pointer}.fp-foods[open]{gap:8px}
.fp-daynav{align-items:center}.fp-daynav b{font:700 17px var(--display)}
.fp-shophead h2{margin:2px 0 0}.fp-wseg{display:grid;gap:4px}
.fp-list h3{margin:0;font:700 17px var(--display);display:flex;align-items:center;gap:8px}
.fp-item{display:flex;flex-direction:column;gap:2px;border-bottom:1px solid var(--line);padding-bottom:6px}
.fp-item .shoprow{border:0}
.fp-item-sub{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-left:30px;min-height:28px}
.fp-mv{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font:650 12px var(--body);border-radius:999px;padding:4px 10px;cursor:pointer;white-space:nowrap;min-height:30px}
.fp-mv svg{width:9px;height:6px;opacity:.6}
.fp-ings{display:flex;flex-direction:column;gap:6px}
.fp-ing{display:flex;align-items:center;gap:8px;border:1px solid var(--line);border-radius:12px;padding:8px 8px 8px 12px;background:var(--surface)}
.fp-ing.chg{border-color:color-mix(in srgb,var(--warn) 55%,var(--line))}.fp-ing.new{border-color:color-mix(in srgb,var(--good) 55%,var(--line))}
.fp-ing-n{flex:1;min-width:0;font-size:14.5px}.fp-ing-a{display:flex;align-items:center;gap:6px;flex-shrink:0}
.fp-ing-a input{width:64px;text-align:center;font:700 16px var(--body);border:1px solid var(--line);border-radius:9px;padding:6px 4px;background:var(--surface-2);color:var(--ink)}
.fp-ing-a span{max-width:70px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fp-removed{color:var(--muted)}
.fp-ask{display:flex;flex-direction:column;gap:10px}.fp-ask b{font-size:17px}.fp-ask p{margin:0}
.fp-method summary{cursor:pointer}`; document.head.appendChild(st) })();
