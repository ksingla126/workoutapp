/* RankUp Home: the game screen. One obvious thing to do today (the Main Quest), the Daily Quest, and your ranks.
   Everything else lives one tap away: Train (today's sets, other days, plan, progress), Food, Ranks, System.
   A brand-new user gets a welcome, one glowing Start button and a short tour of the tabs. */

const HUB_TOUR = [
  { sel: "[data-hub-start]", t: "Start here", b: "This starts today's workout. The app walks you through every set, with rest timers." },
  { sel: '[data-tab="home"]', t: "Train", b: "Your full plan: today's sets, other days, editing your routine and your progress." },
  ...(FOOD_ON ? [{ sel: '[data-tab="food"]', t: "Food", b: "Log meals, track protein, and auto-generate a meal plan with a grocery list." }] : []),
  { sel: '[data-tab="ranks"]', t: "Ranks", b: "Your E–S ranks in six categories, plus your quest log." },
  { sel: '[data-tab="advice"]', t: "System", b: "Ask the coach anything, or see where your training is heading." },
];

const HUB_SHORT = { upper: "Upper", lower: "Lower", core: "Core", speed: "Speed", endur: "Endur.", disc: "Disc." };
function hubName() { const su = S.profile && S.profile.setup; const n = (su && su.name) || (S.profile && S.profile.name) || ""; return String(n).trim().split(/\s+/)[0] || "You" }
function hubMuscles(p) {
  const out = []; (p.ex || []).forEach(e => { const L = typeof libEx === "function" && libEx(e.id), m = L && L.muscle; if (m && !["Core", "Cardio", "Forearms"].includes(m) && !out.includes(m)) out.push(m) });
  return out.slice(0, 3);
}
function hubRank() {
  try { const R = rankState(), un = !R.place || R.place.pending, fresh = !Object.values(S.logs).some(l => l && (l.type === "gym" || l.type === "run"));
    const V = rkShown(R); return { R, V, un, fresh, ov: V.ov, ovn: V.ovn, prog: un ? 0 : rkOverallProg(V.avg, V.ov) } } catch (e) { return { R: null, un: true, fresh: true, ov: 0, ovn: 0, prog: 0 } }
}
function hubWeek() { const k = ymd(today), d = parseYmd(k), mon = addDays(d, -((d.getDay() + 6) % 7)); let plan = 0, done = 0;
  for (let i = 0; i < 7; i++) { const x = addDays(mon, i), p = planFor(x); if (p && p.type !== "rest") { plan++; if (S.logs[ymd(x)]) done++ } } return { plan, done } }

/* Home header: a strip in the black ID card's style (name + badge). Tap or swipe down to slide out the full rank ID card. */
let hubIdOpen = false;
const HUB_METAL = ["No blades yet", "Bronze blades", "Iron blades", "Silver blades", "Gold blades", "Platinum blades"];
const HUB_PCT = [0, 5, 25, 50, 80, 95];                     // D is the 5th percentile, C the 25th, B the median, A the 80th, S the 95th
function hubSince(H) {                                      // the month you reached your current letter (tracked from when this header first sees it)
  if (H.un) return ""; const D = rkData(), L = rkLetter(H.ov);
  if (!D.ovSince || D.ovSince.L !== L) { D.ovSince = { L, d: ymd(today) }; try { saveProfile() } catch (e) {} }
  const d = parseYmd(D.ovSince.d); return d.toLocaleDateString([], { month: "short", year: "numeric" }).toUpperCase();
}
function hubIdHead(H) {
  const i = H.un ? 0 : Math.min(5, H.ov), c = RK_COL[i], step = H.un ? "?" : rkStep(H.ovn), L = H.un ? "" : rkLetter(H.ov);
  const lt = rkMix(c, "#ffffff", .45), rg = a => { const x = [1, 3, 5].map(k => parseInt(c.slice(k, k + 2), 16)); return `rgba(${x.join(",")},${a})` };
  const name = hubName(), streak = typeof qStreak === "function" ? qStreak() : 0;
  if (typeof rkbDefs === "function") rkbDefs();
  const emb = H.un ? `<svg class="hid-hex" viewBox="0 0 62 68" aria-hidden="true"><path d="M31 1l29 16v34L31 67 2 51V17z"/><text x="31" y="44" text-anchor="middle">?</text></svg>` : rkbSvg(i, rkDiv(H.ovn), true);
  let standing, sub;
  if (H.un) { const R = H.R; standing = !H.fresh && R && R.place && R.place.first ? `Placement · day ${Math.min(RKC().placementDays, rkDays(R.place.first, R.td) + 1)} of ${RKC().placementDays}` : "Train this week to get your rank"; sub = H.fresh ? "Unranked" : "Placement week" }
  else { const pct = i >= 5 ? 95 : Math.floor(HUB_PCT[i] + H.prog * (HUB_PCT[i + 1] - HUB_PCT[i]));
    standing = i === 0 && pct < 1 ? "Every hunter starts here" : i >= 5 ? "Top 5% of lifters" : `Stronger than ${pct}% of lifters`;
    sub = `${step} · ${HUB_METAL[i]}` }
  const code = typeof FR !== "undefined" && FR.me && FR.me.code, since = hubSince(H);
  const foil = `linear-gradient(180deg,${rkMix(c, "#ffffff", .7)},${rkMix(c, "#ffffff", .15)} 45%,${rkMix(c, "#000000", .3)})`;
  return `<section class="hub-id ${hubIdOpen ? "open" : ""}" style="--hc:${c};--hl:${lt};--hg:${rg(.28)};--hs:${rg(.035)};--ht:${rg(.75)};--hts:${rg(.25)};--hf:${foil}">
    <button type="button" class="hid-tap" data-hub-id="1" aria-expanded="${hubIdOpen}" aria-controls="hidCard" aria-label="Rank ID for ${esc(name)}${H.un ? ", unranked" : `, rank ${step}`}. ${hubIdOpen ? "Close" : "Open"} the full ID">
      <span class="hid-row"><span class="hid-in"><span class="hid-rc"><span class="hid-emb">${emb}</span>
        <span class="hid-who"><span class="hid-lbl">RANKUP</span><b>${esc(name)}</b><span>${esc(sub)}</span></span>
        ${streak ? `<span class="hub-streak hid-streak" aria-label="${streak}-day streak"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-6 1-9.5z"/></svg>${streak}</span>` : ""}
        <svg class="hid-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></span></span></span>
      <span class="hid-open" id="hidCard"><span class="hid-in"><span class="hid-pad">        <span class="hid-card"><span class="hid-l">
          <span class="hid-top"><span class="hid-lbl">RANKUP</span><span class="hid-title">${H.un ? "UNRANKED" : `${L}-RANK`}</span></span>
          <span class="hid-mid"><span class="hid-step">${esc(step)}</span><span class="hid-txt"><b>${esc(name)}</b><span>${esc(standing)}</span><span class="hid-metal">${H.un ? "Rank unlocks after placement" : HUB_METAL[i]}</span></span></span>
          <span class="hid-foot">${code ? `<span>ID <b>${esc(code)}</b></span>` : ""}${since ? `<span>${L} since <b>${since}</b></span>` : ""}</span>
        </span><span class="hid-r">${emb}</span></span>
      </span></span></span>
    </button>
    </section>`;
}
function hubIdSet(open) {
  hubIdOpen = open; const el = document.querySelector(".hub-id"); if (!el) return;
  el.classList.toggle("open", open); const b = el.querySelector(".hid-tap"); if (b) { b.setAttribute("aria-expanded", open); b.setAttribute("aria-label", b.getAttribute("aria-label").replace(/(Open|Close) the full ID/, (open ? "Close" : "Open") + " the full ID")) }
  if (open && typeof friendsLoad === "function" && S.profile.friendsOn && !(FR.me && FR.me.code)) friendsLoad().then(() => { const f = el.querySelector(".hid-foot"); if (f && FR.me && FR.me.code && !f.querySelector(".hid-code")) f.insertAdjacentHTML("afterbegin", `<span class="hid-code">ID <b>${esc(FR.me.code)}</b></span>`) }).catch(() => {});
}
// swipe down on the header to open it, up to close it; a tap toggles
(() => { let y0 = null, x0 = 0, moved = false;
  document.addEventListener("touchstart", e => { const h = e.target.closest && e.target.closest(".hid-tap"); y0 = h ? e.touches[0].clientY : null; x0 = h ? e.touches[0].clientX : 0; moved = false }, { passive: true });
  document.addEventListener("touchmove", e => { if (y0 == null || moved) return; const dy = e.touches[0].clientY - y0, dx = e.touches[0].clientX - x0;
    if (Math.abs(dy) > 28 && Math.abs(dy) > Math.abs(dx)) { if (dy > 0 && !hubIdOpen) { moved = true; hubIdSet(true) } else if (dy < 0 && hubIdOpen) { moved = true; hubIdSet(false) } } }, { passive: true });
  document.addEventListener("touchend", () => { if (moved) { hubIdSwiped = Date.now() } y0 = null }, { passive: true });
})();
let hubIdSwiped = 0;
document.addEventListener("click", e => { const t = e.target.closest && e.target.closest("[data-hub-id]"); if (!t) return; if (Date.now() - hubIdSwiped < 400) return; hubIdSet(!hubIdOpen) });
// a workout already running today: the Start button becomes "Return to activity"
const hubLive = () => !!(TM && TM.start && TM.date === ymd(today));
const HUB_PLAY = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z"/></svg>`, HUB_BACK = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v4.5h4.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
function hubBtn(kind, label, first) { const live = hubLive();
  return `<button type="button" class="hub-go ${first && !live ? "glow" : ""} ${live ? "live" : ""}" data-hub-start="${kind}"><span class="hub-go-in">${live ? HUB_BACK + "Return to activity" : HUB_PLAY + label}</span></button>${live ? `<span class="hub-inprog"><i></i>In progress · started ${new Date(TM.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>` : ""}` }
function hubMain(H) {
  const d = today, k = ymd(d), p = planFor(d), l = S.logs[k];
  if (!p) return `<section class="hub-main"><span class="hub-sys">[SYSTEM] MAIN QUEST</span><h2>Your plan starts ${fmtShort(START)}</h2><p class="hub-sub">Check back then for your first workout.</p></section>`;
  const first = H.fresh;
  if (p.type === "rest") {
    const f = MOBILITY[mobilityFocus(d)], tp = planFor(addDays(d, 1)), done = typeof qTick === "function" && qTick(typeof questDay === "function" ? questDay() : k, "mob");
    const tom = !tp ? "" : tp.type === "rest" ? "Another rest day" : tp.type === "gym" ? `${tp.name} · ${tp.ex.length} exercises` : `${tp.t}`;
    return `<section class="hub-main rest"><span class="hub-sys">[SYSTEM] RECOVERY DAY</span><h2>Rest &amp; recover</h2><p class="hub-sub">Muscle rebuilds today. Light work only.</p>
      <div class="hub-tile"><div><b>10-minute mobility</b><span>${esc(f.t)} · ${f.moves.length} moves</span></div>${done ? `<span class="hub-done">Done ✓</span>` : ""}</div>
      <button type="button" class="hub-go" data-hub-mob="1"><span class="hub-go-in">${HUB_PLAY}${done ? "See the moves" : "Start mobility"}</span></button>
      ${tom ? `<div class="hub-tom"><span>Tomorrow</span><b>${esc(tom)}</b></div>` : ""}</section>`;
  }
  if (l) {
    const t = p.type === "gym" ? p.name : p.t, prs = (l.prs || []).length;
    return `<section class="hub-main clear"><span class="hub-sys">[SYSTEM] MAIN QUEST CLEARED</span><h2>${esc(t)}</h2><p class="hub-sub">${l.durMin ? `${Math.round(l.durMin)} min` : "Logged"}${prs ? ` · ${prs} PR${prs > 1 ? "s" : ""}` : ""}${l.type === "run" && l.mi ? ` · ${l.mi} mi` : ""}</p>
      <button type="button" class="hub-go ghost" data-hub-train="1"><span class="hub-go-in">View workout</span></button></section>`;
  }
  if (p.type === "run") {
    return `<section class="hub-main run"><span class="hub-sys">[SYSTEM] MAIN QUEST</span><h2>${esc(p.t)}</h2><p class="hub-sub">${esc(p.d)}</p>
      ${hubBtn("run", "Start run")}
      <button type="button" class="link small hub-alt" data-hub-train="1">Log a run you already did</button></section>`;
  }
  const mus = hubMuscles(p), sets = (p.ex || []).reduce((t, e) => t + (e.sets || 0), 0), min = typeof estMin === "function" ? estMin(p.ex) : 50;
  let gate = ""; try { const R = H.R, C = RKC(); if (R && !H.un) { const g = R.parts.find(pt => R.part[pt].gate && R.part[pt].gate.open && (p.ex || []).some(e => (C.conv[e.id] || []).some(c => c.p === pt && c.cap == null))); if (g) gate = `<span class="hub-gate">Gate open · ${esc(C.parts[g].name)} → ${rkLetter(R.part[g].gate.to)}</span>` } } catch (e) {}
  const tv = typeof tvDay === "function" && tvDay(k);
  return `<section class="hub-main"><div class="hub-row"><span class="hub-sys">[SYSTEM] ${first ? "FIRST QUEST" : "MAIN QUEST"}</span>${gate}</div>
    <h2>${esc(p.name)}</h2><p class="hub-sub">${first ? `${p.ex.length} exercises · ~${min} min · we'll guide every set` : esc(mus.join(" · ") || "Full body")}${tv ? ` · ${tv.mode === "db" ? "dumbbells" : "bodyweight"}` : ""}</p>
    ${first ? "" : `<div class="hub-stats"><div><b>${p.ex.length}</b><span>exercises</span></div><div><b>~${min} min</b><span>long</span></div><div><b>${sets}</b><span>sets</span></div></div>`}
    ${hubBtn("gym", first ? "Start your first workout" : "Start workout", first)}
    ${first ? `<p class="hub-tip">No idea what weight to use? Pick one you could lift about 10 times. The app adjusts from there.</p>` : `<button type="button" class="link small hub-alt" data-hub-travel="1">Not at your gym? Switch to dumbbells or bodyweight</button>`}</section>`;
}
function hubQuest() {
  if (typeof dailyQuest !== "function") return "";
  try {
    const k = questDay(); qSince(); const q = dailyQuest(k); if (!q) return "";
    const Q = qState(), pen = qPenalty(k), paths = qActivePaths(k), live = paths.filter(P => !qPathEnded(P, k)), ending = paths.filter(P => qPathEnded(P, k));
    const n = q.items.filter(x => x.done).length;
    return `<section class="hub-card q-card ${q.done ? "complete" : ""}" aria-label="Daily Quest"><div class="hub-row"><span class="hub-sys">${q.done ? "DAILY QUEST COMPLETE" : "DAILY QUEST"}${k !== ymd(today) ? " · ends 4 a.m." : ""}</span><b class="hub-n">${n} / ${q.items.length}</b></div>
      <div class="q-list">${q.items.map(x => qRow(x, k)).join("")}</div>
      ${pen ? `<div class="q-list pen">${qRow(pen, k)}</div>` : ""}
      ${live.length ? `<div class="q-list paths">${live.map(P => qPathRow(P, k)).join("")}</div>${live.map(P => qCheckin(P, k)).join("")}` : ""}
      ${Q.offers.map(qOfferCard).join("")}${ending.map(P => qEndCard(P, k)).join("")}
      <div class="hub-row q-foot"><button type="button" class="link small" data-qlog="1">Quest log</button><button type="button" class="link small" data-qpaths="1">+ Start a path</button></div></section>`;
  } catch (e) { return "" }
}
function hubStatus(H) {
  if (!H.R) return "";
  const gs = H.R.groups, w = hubWeek();
  const tiles = gs.map(g => { const n = H.V.group(g), r = n == null ? null : Math.floor(Math.min(5, n)), L = H.un || r == null ? "?" : rkStep(Math.min(5, n)), col = H.un || r == null ? "var(--muted)" : RK_COL[r];
    return `<button type="button" class="hub-stat" data-hub-rank="${g.id}" aria-label="${esc(g.name)}: ${H.un || r == null ? "unranked" : L}"><b style="color:${col}">${L}</b><span>${esc(HUB_SHORT[g.id] || g.name)}</span></button>` }).join("");
  const bars = w.plan ? Array.from({ length: w.plan }, (_, i) => `<i class="${i < w.done ? "on" : ""}"></i>`).join("") : "";
  return `<section class="hub-block"><div class="hub-row"><span class="hub-sys">STATUS</span><button type="button" class="link small" data-tab-go="ranks">All ranks</button></div>
    <div class="hub-stats6">${tiles}</div>
    ${w.plan ? `<div class="hub-week"><div class="hub-row"><span class="small muted">This week</span><b class="num">${w.done}/${w.plan} sessions</b></div><div class="hub-wbar" aria-hidden="true">${bars}</div></div>` : ""}</section>`;
}
// first open: what placement means and which workouts count
function hubPlacement(H) {
  const out = []; for (let i = 0; i < 7 && out.length < 3; i++) { const d = addDays(today, i), p = planFor(d); if (p && p.type !== "rest") out.push({ d, p, done: !!S.logs[ymd(d)] }) }
  if (!out.length) return "";
  return `<section class="hub-block"><span class="hub-sys">PLACEMENT · ${out.filter(x => x.done).length} OF ${out.length} WORKOUTS</span>
    <div class="hub-place">${out.map((x, i) => `<div class="${i === 0 ? "now" : ""} ${x.done ? "done" : ""}"><b>${esc(x.p.type === "gym" ? x.p.name : x.p.t)}</b><span>${i === 0 && ymd(x.d) === ymd(today) ? "Today" : DOW[dowOf(x.d)]}${x.done ? " ✓" : ""}</span></div>`).join("")}</div>
    <p class="small muted" style="margin:0">Your rank, stats and full quests unlock after placement.</p></section>`;
}
function viewHub() {
  const H = hubRank();
  let h = hubIdHead(H);
  if (H.fresh) h += `<section class="hub-welcome"><span class="hub-sys">[SYSTEM] WELCOME, ${esc(hubName().toUpperCase())}</span><p>Train this week and the System will rank you from E to S. Your first workout is ready below. Just press start.</p></section>`;
  const seals = typeof hubSeals === "function" ? hubSeals() : "";
  if (!H.fresh) h += seals;                                   // your day first, then today's workout
  h += hubMain(H);
  if (H.fresh) h += hubPlacement(H);
  if (typeof hubChecklist === "function") h += hubChecklist();
  if (H.fresh) h += seals;
  if (!H.fresh) h += hubQuest();                              // rank letters now live on the Ranks tab
  if (!H.fresh && typeof weekRecap === "function" && CUSTOM && CUSTOM.su.firstDay && CUSTOM.su.firstDay < ymd(mondayOf(today))) h += `<button type="button" class="link small hub-recap" data-recap="1">Last week's recap ›</button>`;
  return `<div class="hub">${h}</div>`;
}

/* ---------- taps ---------- */
function hubGoTrain(k, after) { tab = "home"; sel = parseYmd(k || ymd(today)); try { localStorage.setItem("rd25-tab", tab) } catch (e) {} lastRenderKey = ""; render(); window.scrollTo(0, 0); if (after) setTimeout(after, 60) }
document.addEventListener("click", e => {
  const t = e.target.closest && e.target.closest("button"); if (!t) return; const d = t.dataset;
  if (d.hubStart) { const k = ymd(today); sel = today;
    if (!TM.start) startWorkout();
    if (d.hubStart === "gym") { tab = "home"; lastRenderKey = ""; render(); openLive() }
    else { tab = "home"; lastRenderKey = ""; render(); openLive() }
    hubTourEnd(); return }
  if (d.hubTrain) { hubGoTrain(); return }
  if (d.hubMob) { hubGoTrain(null, () => { const m = document.querySelector("details.mob"); if (m) { m.open = true; m.scrollIntoView({ block: "center", behavior: "smooth" }) } }); return }
  if (d.hubTravel) { hubGoTrain(null, () => { const b = document.querySelector(".tv-bar"); if (b) { b.scrollIntoView({ block: "center", behavior: "smooth" }); b.classList.add("hub-flash"); setTimeout(() => b.classList.remove("hub-flash"), 1600) } }); return }
  if (d.hubRank) { if (typeof rkOpen !== "undefined") rkOpen = d.hubRank; tab = "ranks"; lastRenderKey = ""; render(); window.scrollTo(0, 0); setTimeout(() => { const el = document.querySelector(`[data-rkgroup="${d.hubRank}"]`); if (el) el.scrollIntoView({ block: "start", behavior: "smooth" }) }, 60); return }
  if (d.trv) { const v = d.trv; if (v === "food") { tab = "food" } else { tab = v === "today" ? "home" : v; if (v === "plan") planView = "training" } try { localStorage.setItem("rd25-tab", tab) } catch (_) {} lastRenderKey = ""; render(); window.scrollTo(0, 0); return }
  if (d.tour === "next") { hubTourStep(HT.i + 1); return }
  if (d.tour === "skip") { hubTourEnd(); return }
});
// Train's sub-switch: Today · Plan · Progress
function trainSwitch() {
  const cur = tab === "progress" ? "progress" : tab === "plan" ? "plan" : "today";
  return `<div class="seg three" role="tablist" aria-label="Train view">${[["today", "Today"], ["plan", "Plan"], ["progress", "Progress"]].map(([v, n]) => `<button role="tab" data-trv="${v}" aria-selected="${cur === v}" class="${cur === v ? "on" : ""}">${n}</button>`).join("")}</div>`;
}

/* ---------- first-open tour ---------- */
const HT = { i: -1 };
function hubTourDone() { return !!((S.profile && S.profile.tourDone) || (() => { try { return localStorage.getItem("ru-tour") === "1" } catch (e) { return false } })()) }
function hubTourEnd() { HT.i = -1; document.querySelectorAll(".tour-tip,.tour-dim").forEach(x => x.remove()); document.querySelectorAll(".tour-on").forEach(x => x.classList.remove("tour-on"));
  if (S.profile && !S.profile.tourDone) { S.profile.tourDone = true; saveProfile() } try { localStorage.setItem("ru-tour", "1") } catch (e) {} }
function hubTourStep(i) {
  document.querySelectorAll(".tour-tip").forEach(x => x.remove()); document.querySelectorAll(".tour-on").forEach(x => x.classList.remove("tour-on"));
  if (i >= HUB_TOUR.length || tab !== "hub") { hubTourEnd(); return }
  const s = HUB_TOUR[i], el = document.querySelector(s.sel); if (!el) { hubTourStep(i + 1); return }
  HT.i = i; if (!document.querySelector(".tour-dim")) { const dim = document.createElement("div"); dim.className = "tour-dim"; document.body.appendChild(dim) }
  el.classList.add("tour-on"); if (i === 0) el.scrollIntoView({ block: "center" });
  const tip = document.createElement("div"); tip.className = "tour-tip"; tip.setAttribute("role", "dialog"); tip.setAttribute("aria-label", s.t);
  tip.innerHTML = `<span class="hub-sys">[SYSTEM] ${i + 1} / ${HUB_TOUR.length}</span><b>${esc(s.t)}</b><p>${esc(s.b)}</p><div class="hub-row"><button type="button" class="link small" data-tour="skip">Skip</button><button type="button" class="btn sm" data-tour="next">${i === HUB_TOUR.length - 1 ? "Got it" : "Next"}</button></div>`;
  document.body.appendChild(tip);
  const r = el.getBoundingClientRect(), tw = Math.min(300, innerWidth - 32); tip.style.width = tw + "px";
  tip.style.left = Math.max(16, Math.min(r.left + r.width / 2 - tw / 2, innerWidth - tw - 16)) + "px";
  const th = tip.offsetHeight, below = r.bottom + 12; tip.style.top = (below + th < innerHeight - 8 ? below : Math.max(8, r.top - th - 12)) + "px";
  tip.dataset.arrow = below + th < innerHeight - 8 ? "up" : "down";
  const nb = tip.querySelector('[data-tour="next"]'); if (nb) nb.focus({ preventScroll: true });
}
function hubMaybeTour() { if (tab !== "hub" || hubTourDone() || HT.i >= 0) return; const H = hubRank(); if (!H.fresh) return; setTimeout(() => { if (tab === "hub" && HT.i < 0 && document.querySelector("[data-hub-start]")) hubTourStep(0) }, 500) }
addEventListener("resize", () => { if (HT.i >= 0) hubTourStep(HT.i) });

(() => { const st = document.createElement("style"); st.textContent = `
.hub{display:flex;flex-direction:column;gap:14px}
.hub-id{position:relative;margin:-46px -24px 0;color:#F5F1E6;font-family:var(--body);border:1.5px solid var(--ht);border-top:0;border-radius:0 0 28px 28px;overflow:hidden;background-color:#0A0A0D;background-image:radial-gradient(60% 120% at 82% 30%,var(--hg),transparent 65%),repeating-linear-gradient(135deg,var(--hs) 0 1px,transparent 1px 7px),linear-gradient(160deg,#17161C,#07070A 70%);box-shadow:0 18px 40px -24px var(--hg)}
.hub-id::after{content:"";position:absolute;left:5px;right:5px;bottom:5px;top:-2px;border:1px solid var(--hts);border-top:0;border-radius:0 0 23px 23px;pointer-events:none}
@media (min-width:672px){.hub-id{margin-inline:0;border-top:1.5px solid var(--ht);border-radius:28px}.hub-id::after{top:5px;border-top:1px solid var(--hts);border-radius:23px}}
.hid-tap{display:block;width:100%;border:0;padding:env(safe-area-inset-top,0px) 0 0;margin:0;background:none;color:inherit;font:inherit;text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:pan-y}
.hid-row,.hid-open{display:grid;transition:grid-template-rows .5s cubic-bezier(.2,.8,.25,1),opacity .35s ease}
.hid-row{grid-template-rows:1fr}.hid-open{grid-template-rows:0fr;opacity:0}
.hub-id.open .hid-row{grid-template-rows:0fr;opacity:0}.hub-id.open .hid-open{grid-template-rows:1fr;opacity:1}
.hid-in{min-height:0;overflow:hidden;display:block}
.hid-rc{display:flex;align-items:center;gap:14px;padding:22px 24px 20px}
.hid-emb{flex-shrink:0;width:60px;height:62px;filter:drop-shadow(0 0 10px var(--hg))}.hid-emb svg,.hid-r svg{width:100%;height:100%;display:block}
.hid-hex{fill:#2A2F3D;stroke:#5B6378;stroke-width:2}.hid-hex text{fill:#F5F1E6;stroke:none;font:800 30px var(--display)}
.hid-who{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.hid-lbl{font:800 10.5px/1 var(--display);letter-spacing:.34em;color:var(--hl)}
.hid-who b{font:800 26px/1.05 var(--display);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hid-who>span:last-child{font-size:13px;color:#D8D2C2}
.hid-chev{width:22px;height:22px;flex-shrink:0;fill:none;stroke:var(--hl);stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.hid-streak{height:32px;padding:0 10px;font-size:14px;background:rgba(10,10,13,.6);border-color:var(--hts)}
.hid-pad{display:block;transform:translateY(-28px);transition:transform .55s cubic-bezier(.2,.8,.25,1)}
.hub-id.open .hid-pad{transform:none}
.hid-card{container-type:inline-size;position:relative;display:flex;aspect-ratio:640/404}
.hid-l{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:space-between;padding:5.3cqw 0 5cqw 5.9cqw}
.hid-top{display:flex;flex-direction:column;gap:.95cqw}.hid-top .hid-lbl{font-size:1.9cqw;letter-spacing:.4em}
.hid-title{font:600 1.9cqw/1 var(--body);letter-spacing:.24em;color:#A8A396}
.hid-mid{display:flex;align-items:center;gap:2.8cqw}
.hid-step{font:900 20cqw/.78 var(--display);letter-spacing:-.03em;background:var(--hf);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 2.8cqw var(--hg))}
.hid-txt{display:flex;flex-direction:column;gap:.95cqw;min-width:0}.hid-txt b{font:800 4.7cqw/1.05 var(--display);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hid-txt span{font-size:2.1cqw;line-height:1.35;color:#D8D2C2}.hid-txt .hid-metal{color:var(--hl)}
.hid-foot{display:flex;gap:4cqw;font-size:1.9cqw;color:#A8A396;min-height:1.5em}.hid-foot b{color:#F5F1E6;letter-spacing:.08em}
.hid-r{width:36cqw;flex-shrink:0;display:grid;place-items:center;padding:0 2cqw}.hid-r svg{width:31cqw;height:32cqw}
.hub-id{transition:background-position .5s}.hub-id.open{background-image:radial-gradient(60% 80% at 78% 45%,var(--hg),transparent 65%),repeating-linear-gradient(135deg,var(--hs) 0 1px,transparent 1px 7px),linear-gradient(160deg,#17161C,#07070A 70%)}
@media (prefers-reduced-motion:reduce){.hid-row,.hid-open,.hid-pad{transition:none}}

.hub-sys{font:700 11px var(--body);letter-spacing:.16em;color:var(--gym);text-transform:uppercase}
.hub-row{display:flex;align-items:center;justify-content:space-between;gap:8px}
.hub-player{display:flex;align-items:center;gap:12px}
.hub-emb{flex-shrink:0;border:0;padding:0;background:none;cursor:pointer;display:grid;place-items:center;width:66px;height:68px}.hub-emb .rk-l.rk-b.big{width:62px;height:64px}
.hub-hex{width:54px;height:60px;flex-shrink:0;border:0;padding:0;cursor:pointer;clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%);background:linear-gradient(160deg,color-mix(in srgb,var(--rc) 70%,#fff),var(--rc));color:#fff;font:800 27px var(--display)}
.hub-who{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}.hub-who>div:first-child{display:flex;align-items:baseline;gap:8px;min-width:0}
.hub-who b{font:700 19px var(--display);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hub-who span{font-size:13px;color:var(--muted);white-space:nowrap}.hub-who small{font-size:12px;color:var(--muted)}
.hub-xp{height:6px;border-radius:3px;background:var(--surface-2);overflow:hidden}.hub-xp i{display:block;height:100%;border-radius:3px;background:linear-gradient(90deg,color-mix(in srgb,var(--gym) 80%,#000),var(--gym))}
.hub-streak{display:inline-flex;align-items:center;gap:3px;height:40px;padding:0 11px;border-radius:20px;border:1px solid var(--line);background:var(--surface);color:var(--warn);font:700 15px var(--body);flex-shrink:0}.hub-streak svg{width:15px;height:15px;fill:currentColor}
.hub-welcome{border:1px solid color-mix(in srgb,var(--gym) 45%,var(--line));background:var(--gym-soft);border-radius:18px;padding:14px 16px;display:flex;flex-direction:column;gap:6px}.hub-welcome p{margin:0;font-size:15px;line-height:1.4}
.hub-main{border-radius:22px;padding:18px;display:flex;flex-direction:column;gap:12px;border:1px solid color-mix(in srgb,var(--gym) 45%,var(--line));background:linear-gradient(165deg,color-mix(in srgb,var(--gym) 16%,var(--surface)),var(--surface) 65%)}
.hub-main.rest{border-color:color-mix(in srgb,var(--good) 45%,var(--line));background:linear-gradient(165deg,color-mix(in srgb,var(--good) 13%,var(--surface)),var(--surface) 65%)}.hub-main.rest .hub-sys{color:var(--good)}
.hub-main.run{border-color:color-mix(in srgb,var(--run) 45%,var(--line));background:linear-gradient(165deg,color-mix(in srgb,var(--run) 13%,var(--surface)),var(--surface) 65%)}.hub-main.run .hub-sys{color:var(--run)}
.hub-main.clear .hub-sys{color:var(--good)}
.hub-main h2{margin:0;font:800 34px/1 var(--display);letter-spacing:-.01em}.hub-sub{margin:-6px 0 0;font-size:15px;color:var(--muted)}
.hub-gate{font:600 12px var(--body);color:var(--warn);border:1px solid color-mix(in srgb,var(--warn) 40%,var(--line));background:var(--coach-soft);border-radius:999px;padding:3px 9px;white-space:nowrap}
.hub-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.hub-stats>div{background:var(--surface-2);border-radius:12px;padding:9px 10px;display:flex;flex-direction:column}.hub-stats b{font:700 18px var(--display)}.hub-stats span{font-size:12px;color:var(--muted)}
.hub-go{height:56px;border:0;border-radius:16px;background:var(--ink);color:var(--bg);font:800 18px var(--body);display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer}.hub-go svg{width:18px;height:18px;fill:currentColor}
.hub-go.ghost{background:var(--surface-2);color:var(--ink);border:1px solid var(--line)}
.hub-go.glow{box-shadow:0 0 0 4px color-mix(in srgb,var(--gym) 45%,transparent),0 0 28px color-mix(in srgb,var(--gym) 55%,transparent)}
.hub-alt{align-self:center}
/* iPhone Safari won't center content inside a <button>, so the label is its own layer filling the button */
.hub-go{position:relative;padding:0;box-sizing:border-box;min-height:56px;-webkit-appearance:none;appearance:none}
.hub-go-in{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:8px;line-height:1;z-index:1}
.hub-go-in>svg{margin-left:-26px;flex-shrink:0} /* the icon hangs left of the words, so the words themselves sit dead center */
.hub-go.live{background:linear-gradient(180deg,#2FCB7F,#16955A)!important;filter:drop-shadow(0 6px 16px color-mix(in srgb,#2FCB7F 45%,transparent))!important}
.hub-go svg path[fill="none"]{fill:none}
.hub-inprog{display:inline-flex;align-items:center;justify-content:center;gap:7px;margin-top:-4px;font-size:13px;font-weight:600;color:var(--good)}
.hub-inprog i{width:8px;height:8px;border-radius:50%;background:var(--good);box-shadow:0 0 8px var(--good);animation:hub-blink 1.4s ease-in-out infinite}
@keyframes hub-blink{50%{opacity:.35}}.hub-tip{margin:0;font-size:13px;line-height:1.4;color:var(--muted);background:var(--surface-2);border-radius:12px;padding:10px 12px}
.hub-tile{display:flex;align-items:center;justify-content:space-between;gap:10px;background:var(--surface-2);border-radius:14px;padding:12px}.hub-tile>div{display:flex;flex-direction:column;gap:1px}.hub-tile span{font-size:13px;color:var(--muted)}.hub-done{color:var(--good)!important;font-weight:700}
.hub-tom{display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--line);padding-top:10px}.hub-tom span{font-size:14px;color:var(--muted)}
.hub-card{border-radius:18px;background:var(--surface);border:1px solid var(--line);padding:14px 16px;display:flex;flex-direction:column;gap:10px}.hub-n{font:700 14px var(--body);color:var(--muted)}
.hub-block{display:flex;flex-direction:column;gap:8px}
.hub-stats6{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px}
.hub-stat{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:8px 0;display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;color:var(--ink);font:inherit;min-height:56px}.hub-stat b{font:800 20px var(--display)}.hub-stat span{font-size:11px;color:var(--muted)}
.hub-week{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:10px 12px;display:flex;flex-direction:column;gap:7px}
.hub-wbar{display:flex;gap:5px}.hub-wbar i{flex:1;height:7px;border-radius:4px;background:var(--line)}.hub-wbar i.on{background:var(--gym)}
.hub-place{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.hub-place>div{border:1px solid var(--line);background:var(--surface);border-radius:14px;padding:10px;display:flex;flex-direction:column;gap:2px;min-width:0}
.hub-place>div.now{border:1.5px solid var(--gym);background:var(--gym-soft)}.hub-place b{font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.hub-place span{font-size:12px;color:var(--muted)}.hub-place .now span{color:var(--gym)}
.seg.three{display:grid;grid-template-columns:repeat(3,1fr)}
.hub-flash{animation:hubflash 1.6s ease}@keyframes hubflash{0%,60%{box-shadow:0 0 0 3px var(--gym);border-radius:12px}100%{box-shadow:none}}
.tour-dim{position:fixed;inset:0;background:rgba(5,8,16,.62);z-index:960}
.tour-on{position:relative;z-index:961!important;box-shadow:0 0 0 4px var(--gym),0 0 24px color-mix(in srgb,var(--gym) 60%,transparent)!important;border-radius:14px}
#tabs .tour-on{background:var(--surface)}
.tour-tip{position:fixed;z-index:962;background:var(--surface);border:1px solid color-mix(in srgb,var(--gym) 55%,var(--line));border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:6px;box-shadow:0 16px 40px rgba(0,0,0,.35)}
.tour-tip b{font:700 17px var(--display)}.tour-tip p{margin:0;font-size:14.5px;line-height:1.4;color:var(--ink)}
@media (prefers-reduced-motion:reduce){.hub-flash{animation:none}}`; document.head.appendChild(st) })();
