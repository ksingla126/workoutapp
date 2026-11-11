/* World select: the Train page. Each day of the week is an island: gym days are towers (Gates),
   runs are trails, rest days are camps. Swipe sideways through the week; the card below acts on the day in the middle. */
let WS_ON = !window.__noWorld;   // the test suites turn the island view off to reach the full day log directly
let wsLog = false;         // true = show the full day log (sets, notes, save) for the selected day
let wsScroll = null;       // keeps the carousel where it was across renders: {wk, left}

const WS_TOWERS = [["tw1", "Obsidian Spire"], ["tw2", "Pagoda of Lanterns"], ["tw3", "The Keep"], ["tw4", "Floating Floors"], ["tw5", "The Ruin"], ["tw6", "Crystal Spire"]];
const WS_TRAILS = {
  easy: [["lab1", "The Hedge Labyrinth"], ["lab2", "The Spiral"], ["lab3", "Wisp's Labyrinth"]],
  long: [["road1", "The King's Road"], ["road3", "The Sky Road"]],
  hills: [["hill1", "The Pass"], ["hill2", "The Stairway"]],
  intervals: [["int1", "The Arena"]], sprints: [["int1", "The Arena"]],
  tempo: [["tempo1", "The Rift Bridge"]], tt: [["tempo1", "The Rift Bridge"]],
  fartlek: [["fart1", "The Storm Fields"]], recovery: [["rec1", "The Moon Spring"]], race: [["race1", "The Citadel"]]
};
// per island: the System line, the button and one line of flavour (no mile markers or flights)
const WS_META = {
  tw: { line: "A GATE HAS OPENED", btn: "ENTER THE GATE" },
  lab1: { line: "A LABYRINTH HAS APPEARED", title: "HEDGE LABYRINTH", btn: "ENTER THE MAZE", sub: "A garden maze. Follow the lit path to the pavilion at the centre." },
  lab2: { line: "A SPIRAL HAS BEEN CARVED", title: "THE SPIRAL", btn: "WALK THE SPIRAL", sub: "One path wound into the sandstone, no wrong turns. It ends at the flame." },
  lab3: { line: "A WISP IS WAITING", title: "WISP'S LABYRINTH", btn: "FOLLOW THE WISP", sub: "Stone walls, no map. A wisp leads at an easy pace; push too hard and it waits for you." },
  road1: { line: "THE ROAD IS OPEN", title: "THE KING'S ROAD", btn: "BEGIN THE JOURNEY", sub: "Through the gate and across the isles to the citadel." },
  road3: { line: "THE BRIDGES ARE LIT", title: "THE SKY ROAD", btn: "CROSS THE FIRST BRIDGE", sub: "Five isles, four bridges of light. The shrine waits at the end." },
  hill1: { line: "A PASS HAS OPENED", title: "THE PASS", btn: "START THE CLIMB", sub: "Sprint up the switchbacks, walk back down, climb again." },
  hill2: { line: "THE STAIRS ARE LIT", title: "THE STAIRWAY", btn: "TAKE THE FIRST FLIGHT", sub: "Sprint a flight, walk down, go again. The shrine is at the top." },
  int1: { line: "THE ARENA AWAITS", title: "THE ARENA", btn: "STEP INTO THE ARENA", sub: "Run hard round the track, jog the recovery, repeat." },
  tempo1: { line: "THE RIFT HAS OPENED", title: "RIFT BRIDGE", btn: "STEP ONTO THE BRIDGE", sub: "One long bridge over the rift. Hold a steady, comfortably hard pace." },
  fart1: { line: "A STORM IS GATHERING", title: "STORM FIELDS", btn: "WALK INTO THE STORM", sub: "Easy running across the plain; when lightning strikes, surge, then settle." },
  rec1: { line: "THE SPRING IS STILL", title: "MOON SPRING", btn: "LOOP THE SPRING", sub: "Slow and short, no pace to chase. Stay easy." },
  race1: { line: "THE CITADEL IS OPEN", title: "THE CITADEL", btn: "TAKE THE STARTING LINE", sub: "Race day. Everything you trained for." },
  camp1: { line: "YOU HAVE MADE CAMP", title: "THE CAMP", btn: "TEND THE DAILY SEALS", sub: "Rest day. Recovery is part of the climb; your Daily Seals still count." }
};
const WS_NUM = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
function wsHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
function wsRunType(p) {
  if (p.race) return "race";
  const t = p.spec && p.spec.type;
  if (t && WS_TRAILS[t]) return t;
  if (t === "steady") return "easy";
  return p.key === "sat" ? "long" : p.key === "thu" ? "intervals" : "easy";
}
// which island a day gets: chosen at random, but the same every time for that day
function wsPick(p, k) {
  if (!p || p.type === "rest") return { img: "camp1", name: "The Camp", kind: "rest" };
  if (p.type === "gym") { const t = WS_TOWERS[wsHash(k + "|gym|" + (p.name || "")) % WS_TOWERS.length]; return { img: t[0], name: t[1], kind: "gym" } }
  const ty = wsRunType(p), list = WS_TRAILS[ty] || WS_TRAILS.easy, t = list[wsHash(k + "|run|" + ty) % list.length];
  return { img: t[0], name: t[1], kind: "run", type: ty };
}
function wsWeek() { const mon = mondayOf(sel); return [...Array(7)].map((_, i) => addDays(mon, i)) }
function wsShort(p) { return !p || p.type === "rest" ? "Camp" : p.type === "gym" ? (p.name || "Gym") + " Gate" : (p.t || "Run") }

function wsDayTxt(d) { return `${DOW[dowOf(d)].toUpperCase()} ${d.getDate()}` }
// the top of the page: eyebrow, title and the Today / Progress chips
function wsTop() {
  const k = ymd(sel), p = inProgram(sel) ? planFor(sel) : null, pk = wsPick(p, k);
  const what = pk.kind === "gym" ? "GATE SELECT" : pk.kind === "run" ? "TRAIL SELECT" : "CAMP";
  return `<div class="ws-head ws-${pk.kind}"><div><div class="ws-eye">RANKUP · ${what}</div><h1 class="ws-h1">Train</h1></div>
    <div class="ws-chips">${[["today", "TODAY"], ["progress", "PROGRESS"]].map(([v, n]) => `<button type="button" data-trv="${v}" class="${v === "today" ? "on" : ""}" aria-pressed="${v === "today"}">${n}</button>`).join("")}</div></div>`;
}
function viewWorld(openLogger) {
  wsSeenSet();
  if (wsLog) { wsPop = null; return `<div class="ws-back"><button type="button" class="btn ghost sm" data-wslog="0">‹ Back to the island</button></div>` + viewHome(openLogger) }
  const days = wsWeek(), k = ymd(sel), p = inProgram(sel) ? planFor(sel) : null, pick = wsPick(p, k), idx = days.findIndex(d => ymd(d) === k);
  const slides = days.map((d, i) => {
    const kk = ymd(d), pp = inProgram(d) ? planFor(d) : null, pk = wsPick(pp, kk);
    const lit = wsLitState(pp, kk);
    return `<div class="ws-slide${kk === k ? " on" : ""}${lit === "lit" ? "" : " ws-dark"}" data-wsday="${kk}"${lit === "new" ? ` data-wsign="${pk.img}"` : ""} role="group" aria-label="${DOW[i]} ${d.getDate()} · ${esc(wsShort(pp))}" aria-current="${kk === k}"><img src="/world/${pk.img}.webp" alt="" loading="${Math.abs(i - idx) <= 1 ? "eager" : "lazy"}" decoding="async" draggable="false"></div>`;
  }).join("");
  const pd = addDays(sel, -1), nd = addDays(sel, 1);
  const side = (d, cls) => { const kk = ymd(d), pp = inProgram(d) ? planFor(d) : null, pk = wsPick(pp, kk), c = pk.kind === "gym" ? "pg" : pk.kind === "run" ? "pa" : "ps";
    return `<button type="button" class="ws-peek ${cls}${wsLitState(pp, kk) === "lit" ? "" : " ws-dark"}" data-wsgo="${kk}" aria-label="Go to ${wsDayTxt(d)}"><img src="/world/${pk.img}.webp" alt="" loading="lazy" draggable="false"></button><span class="ws-plab ${cls} ${c}"><b>${wsDayTxt(d)}</b>${esc(pk.kind === "gym" ? wsShort(pp) : pk.kind === "run" ? (pp && pp.t || "Trail") : "Camp")}</span>` };
  const kind = pick.kind, title = kind === "gym" ? "[SYSTEM] GATE SELECT" : kind === "run" ? "[SYSTEM] TRAIL SELECT" : "[SYSTEM] CAMP";
  let h = `<div class="ws-sky" aria-hidden="true"><i class="ws-shoot"></i></div><div class="ws ws-${kind}">`;
  h += `<div class="ws-frame"><span class="ws-c tl"></span><span class="ws-c tr"></span><span class="ws-c bl"></span><span class="ws-c br"></span>
    <div class="ws-bar"><span>${title}</span><span class="ws-idx">DAY ${idx + 1} / 7</span></div>
    <div class="ws-stage">${side(pd, "l")}${side(nd, "r")}<div class="ws-track" id="wsTrack">${slides}</div><div class="ws-clouds" aria-hidden="true"></div></div></div>`;
  h += `<div class="ws-daybar"><button type="button" data-wsgo="${ymd(pd)}">◀ ${wsDayTxt(pd)}</button><span>${wsDayTxt(sel)} · ${k === ymd(today) ? "TODAY" : kind === "gym" ? "GATE" : kind === "run" ? (WS_RUNTAG[pick.type] || "TRAIL") : "CAMP"}</span><button type="button" data-wsgo="${ymd(nd)}">${wsDayTxt(nd)} ▶</button></div>`;
  h += wsCard(p, k, pick);
  if (wsPop && wsPop.k !== k) wsPop = null;
  if (wsPop && p && p.type !== "rest") h += wsbHtml(p, k, pick);
  return h + `</div>`;
}
const WS_RUNTAG = { easy: "EASY TRAIL", long: "LONG TRAIL", hills: "HILL TRAIL", intervals: "INTERVALS", sprints: "SPRINTS", tempo: "TEMPO", tt: "TIME TRIAL", fartlek: "FARTLEK", recovery: "RECOVERY", race: "RACE DAY" };
function wsCard(p, k, pick) {
  const log = S.logs[k], isToday = k === ymd(today), past = k < ymd(today), d = parseYmd(k), when = wsDayTxt(d);
  const running = TM.start && TM.date === k, M = WS_META[pick.kind === "gym" ? "tw" : pick.img] || {};
  let line = M.line || "", title = M.title || "", sub = M.sub || "", stats = [], btn = "", menu = [];
  const go = (txt, attr) => `<button type="button" class="ws-go" ${attr}>${txt}</button>`;
  if (!p) {
    line = "THE ROAD AHEAD"; title = "THE CAMP"; sub = `Your plan starts ${fmtDate(START)}.`;
  } else if (p.type === "rest") {
    if (!isToday) line = `CAMP · ${when}`;
    stats = ["NO GATE TODAY", "SEALS STILL BURN"];
    btn = go(M.btn, `data-goto-tab="hub"`);
    if (!past && !log) menu.push(`<button type="button" data-daymove="${k}|swap">Swap a workout into today</button>`);
  } else if (p.type === "gym") {
    const ex = p.ex || [], sets = ex.reduce((t, e) => t + (e.sets || 0), 0);
    const boss = typeof rkGateFor === "function" ? ex.filter(e => { try { return rkGateFor(e.id) } catch (_) { return false } }).length : 0;
    const H = typeof hubRank === "function" ? hubRank() : null, L = H && !H.un && typeof rkLetter === "function" ? rkLetter(H.ov) : "";
    line = log ? `GATE CLEARED · ${when}` : isToday ? M.line : `GATE · ${when}`;
    title = `${String(p.name || "Gym").toUpperCase()} GATE`;
    sub = ex.length ? `${L ? `Rank ${L} · ` : ""}${WS_NUM[ex.length] || ex.length} floor${ex.length === 1 ? "" : "s"}${boss ? `, ${WS_NUM[boss] || boss} Gate boss${boss === 1 ? "" : "es"} inside` : ""}.` : "This routine has no exercises yet.";
    stats = ex.length ? [`${ex.length} FLOORS`, `${sets} MOBS`, `~${typeof estMin === "function" ? estMin(ex) : 50} MIN`, ...(boss ? [`<i class="boss">♛ ${boss} BOSS${boss === 1 ? "" : "ES"}</i>`] : [])] : [];
    btn = !ex.length ? go("ADD EXERCISES", `data-c-gotoplan="1"`)
      : log ? go("GATE CLEARED ✓ · VIEW LOG", `data-wslog="1"`)
      : running ? go("RETURN TO THE GATE", `data-openlive="1"`)
      : isToday ? go(M.btn, `id="tmStart"`)
      : past ? go("LOG THIS GATE", `data-wslog="1"`)
      : `<button type="button" class="ws-go" disabled>OPENS ${when}</button>`;
    if (!log) menu.push(`<button type="button" data-daymove="${k}|move">Move</button>`, ...(past ? [] : [`<button type="button" data-daymove="${k}|swap">Swap</button>`]), `<button type="button" data-dayskip="${k}">Rest day</button>`);
  } else {
    line = log ? `TRAIL CLEARED · ${when}` : isToday ? M.line : `TRAIL · ${when}`;
    const parts = String(p.d || "").split(" · "), ty = pick.type;
    sub = `${M.sub || ""}${p.t ? ` <b>${esc(p.t)}</b>${p.d ? ` · ${esc(p.d)}` : ""}` : ""}`;
    stats = [parts[0] ? esc(parts[0]).toUpperCase() : "", WS_RUNTAG[ty] || "", /bpm/.test(p.d || "") ? "ZONE 2" : ""].filter(Boolean);
    btn = log ? go("TRAIL CLEARED ✓ · VIEW LOG", `data-wslog="1"`)
      : running ? go("RETURN TO THE TRAIL", `data-openlive="1"`)
      : isToday ? go(M.btn, `id="tmStart"`)
      : past ? go("LOG THIS TRAIL", `data-wslog="1"`)
      : `<button type="button" class="ws-go" disabled>OPENS ${when}</button>`;
    if (!log) menu.push(...(!p.race && typeof runNewHtml === "function" ? [`<button type="button" data-runswap="${k}">Edit trail</button>`] : []), `<button type="button" data-daymove="${k}|move">Move</button>`, `<button type="button" data-dayskip="${k}">Rest day</button>`);
  }
  return `<div class="ws-card" id="wsCard"><div class="ws-line"><span class="ws-bang">!</span>[SYSTEM] ${line}</div>
    <div class="ws-title">${esc(title)}</div><div class="ws-sub">${sub}</div>
    ${stats.length ? `<div class="ws-stats">${stats.map(s => s.startsWith("<i") ? s.replace("<i", "<span").replace("</i>", "</span>") : `<span>${s}</span>`).join("")}</div>` : ""}
    ${btn}${menu.length ? `<div class="ws-menu">${menu.join('<span class="dot">·</span>')}</div>` : ""}</div>`;
}
// after each render: put the selected island in view and pick the day that ends in the middle after a swipe
function wsAfter() {
  wsbAfter();
  const tr = document.getElementById("wsTrack"); if (!tr) return;
  const wk = ymd(mondayOf(sel)), on = tr.querySelector(".ws-slide.on");
  const pos = el => el.offsetLeft;
  tr.scrollLeft = wsScroll && wsScroll.wk === wk ? wsScroll.left : (on ? pos(on) : 0);
  if (on && Math.abs(tr.scrollLeft - pos(on)) > 4) tr.scrollTo({ left: pos(on), behavior: "smooth" });
  if (on && on.dataset.wsign) setTimeout(() => { if (on.isConnected && on.dataset.wsign) wsIgnite(on) }, wsIgn && wsIgn.k === on.dataset.wsday ? 0 : 450);
  let t = 0;
  tr.addEventListener("scroll", () => {
    wsScroll = { wk, left: tr.scrollLeft }; clearTimeout(t);
    t = setTimeout(() => {
      const i = Math.round(tr.scrollLeft / tr.clientWidth), s = tr.querySelectorAll(".ws-slide")[i];
      if (s && s.dataset.wsday !== ymd(sel)) { sel = parseYmd(s.dataset.wsday); wsScroll = { wk, left: tr.scrollLeft }; lastRenderKey = ""; render() }
    }, 140);
  }, { passive: true });
}
document.addEventListener("click", e => {
  const g = e.target.closest("[data-wsgo]"); if (!g) return;
  const d = parseYmd(g.dataset.wsgo); if (!inProgram(d) && d < START) return;
  const tr = document.getElementById("wsTrack"), same = ymd(mondayOf(d)) === ymd(mondayOf(sel));
  if (tr && same) { const s = tr.querySelector(`[data-wsday="${g.dataset.wsgo}"]`); if (s) { tr.scrollTo({ left: s.offsetLeft, behavior: "smooth" }); return } }
  sel = d; wsScroll = null; lastRenderKey = ""; render();
});
document.addEventListener("click", e => {
  const b = e.target.closest("[data-wslog]"); if (!b) return;
  wsLog = b.dataset.wslog === "1"; wsPop = null; lastRenderKey = ""; render(); window.scrollTo(0, 0);
});

// Lit islands: a workout day stays grey until it is logged. The first time a logged day is shown,
// it lights up (Ignite): lights climb the island, the beacon flares, colour spreads out from the top.
// Rest days and days outside the plan are always lit. Days already seen lit are kept on this device.
const WS_LITE = {"camp1":[46.9,55.6,69.0],"fart1":[48.5,10.3,73.5],"hill1":[50.0,29.2,71.0],"hill2":[49.9,31.9,70.8],"int1":[50.5,44,69.5],"lab1":[49.9,38.8,70.9],"lab2":[49.9,34.6,74.2],"lab3":[50.1,40.1,72.4],"race1":[50.0,10.8,69.8],"rec1":[50,30,69.9],"road1":[48.8,19.5,77.2],"road3":[55.5,24.9,75.8],"tempo1":[49.7,41.5,64.5],"tw1":[49.9,11.9,71.2],"tw2":[49.9,14.2,69.3],"tw3":[50.0,8.4,66.1],"tw4":[49.9,19.7,71.5],"tw5":[49.9,17.5,68.2],"tw6":[49.9,11.3,68.6]};  // beacon x, beacon y, island rim y (% of the image)
let wsSeen = null, wsIgn = null;  // wsIgn: the island lighting up right now {k, t0}, so a re-render mid-animation picks it back up
function wsSeenSet() {
  if (wsSeen) return wsSeen;
  let a = null; try { a = JSON.parse(localStorage.getItem("ws-lit") || "null") } catch (_) { }
  if (!Array.isArray(a)) { const td = ymd(today); wsSeen = new Set(Object.keys(S.logs || {}).filter(k => k < td)); wsSaveSeen() }  // first run: earlier days already logged are simply lit
  else wsSeen = new Set(a);
  return wsSeen;
}
function wsSaveSeen() { try { localStorage.setItem("ws-lit", JSON.stringify([...wsSeen].sort().slice(-400))) } catch (_) { } }
// "lit", "dark" (not logged yet) or "new" (logged, not yet seen lit: play Ignite)
function wsLitState(pp, kk) {
  if (!pp || pp.type === "rest") return "lit";
  if (!(S.logs && S.logs[kk])) return "dark";
  if (wsIgn && wsIgn.k === kk && (!wsIgn.t0 || performance.now() - wsIgn.t0 < 3250)) return "new";
  return wsSeenSet().has(kk) ? "lit" : "new";
}
function wsIgnite(s) {
  const key = s.dataset.wsign, m = WS_LITE[key] || [50, 20, 70];
  const kk = s.dataset.wsday, resume = wsIgn && wsIgn.k === kk && wsIgn.t0 ? wsIgn.t0 : 0;
  delete s.dataset.wsign; wsSeenSet().add(kk); wsSaveSeen(); if (!resume) wsIgn = { k: kk, t0: 0 };
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || s.querySelector(".ws-ign")) { s.classList.remove("ws-dark"); wsIgn = null; return }
  const W = s.clientWidth, H = s.clientHeight, ar = 780 / 880; let w = W, h = W / ar; if (h > H) { h = H; w = H * ar }
  const box = document.createElement("div"); box.className = "ws-ign"; box.setAttribute("aria-hidden", "true");
  box.style.cssText = `left:${(W - w) / 2}px;top:${(H - h) / 2}px;width:${w}px;height:${h}px`;
  box.innerHTML = `<img class="c" src="/world/${key}.webp" alt=""><img class="lt" src="/world/lights/${key}.webp" alt=""><i class="bm" style="left:${m[0]}%;height:${m[1]}%;bottom:${100 - m[1]}%"></i><i class="rg" style="top:${m[2]}%"></i><i class="rg" style="top:${m[2]}%"></i><canvas></canvas>`;
  s.appendChild(box);
  const [col, lit] = box.querySelectorAll("img"), bm = box.querySelector(".bm"), [r1, r2] = box.querySelectorAll(".rg"), cv = box.querySelector("canvas"), cx = cv.getContext("2d");
  const cl = x => Math.min(1, Math.max(0, x)), seg = (t, a, b) => cl((t - a) / (b - a)), eo = x => 1 - Math.pow(1 - x, 3), eio = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  const noise = t => { const v = Math.sin(Math.floor(t * 16) * 12.9898 + 78.233) * 43758.5453; return v - Math.floor(v) };
  const ring = (el, k, a, b, o) => { if (k < 0) { el.style.opacity = 0; return } el.style.opacity = (1 - k) * o; el.style.transform = `translate(-50%,-50%) scale(${a + (b - a) * eo(k)})` };
  const pts = []; let burst = false, t0 = 0;
  const frame = now => {
    if (!box.isConnected) return;  // re-rendered: the new island carries on from wsIgn
    const t = (now - t0) / 1000;
    const p = eio(seg(t, .4, 2.3)) * 118;                             // lights climb, bottom to top
    let lo = .8 * seg(t, .4, .7); if (t < 2.3) lo *= .55 + .45 * noise(t);  // flicker while they catch
    lo *= 1 - .68 * seg(t, 3.3, 4.2);
    const fl = t < 2.6 ? eo(seg(t, 2.15, 2.6)) : 1 - seg(t, 2.6, 3.4);  // the beacon flares
    const r = eio(seg(t, 2.35, 3.6)) * 170;                            // colour spreads out from the beacon
    lit.style.webkitMaskImage = lit.style.maskImage = p >= 118 ? "none" : `linear-gradient(0deg,#000 ${p - 10}%,transparent ${p}%)`;
    lit.style.opacity = lo; lit.style.filter = `brightness(${1 + fl * .3})`;
    col.style.visibility = r > 0 ? "visible" : "hidden";
    col.style.webkitMaskImage = col.style.maskImage = r >= 170 ? "none" : `radial-gradient(circle at ${m[0]}% ${m[1]}%,#000 ${Math.max(0, r - 22)}%,transparent ${r}%)`;
    bm.style.opacity = fl * .9; bm.style.transform = `scaleY(${.6 + fl * .6})`;
    ring(r1, t < .8 ? seg(t, 0, .8) : -1, .25, .9, .8); ring(r2, t > 3.2 ? seg(t, 3.2, 4.1) : -1, .4, 1.7, 1);
    if (t >= 3.25 && !burst) {                                         // shockwave and rising embers
      burst = true; cv.width = w * 2; cv.height = h * 2; s.classList.remove("ws-dark");
      for (let i = 0; i < 40; i++) { const a = Math.random() * Math.PI * 2; pts.push({ x: w + Math.cos(a) * w * .72 * Math.random(), y: h * 2 * m[2] / 100 + Math.sin(a) * h * .1, vx: (Math.random() - .5) * 1.2, vy: -(1.2 + Math.random() * 2.6), l: 0, L: 60 + Math.random() * 70, r: 1.5 + Math.random() * 2.5, c: Math.random() < .7 ? "222,241,233" : "244,196,142" }) }
    }
    if (burst) {
      cx.clearRect(0, 0, cv.width, cv.height); cx.globalCompositeOperation = "lighter";
      for (const q of pts) { q.l++; q.x += q.vx; q.y += q.vy; q.vy *= .985; const a = Math.max(0, 1 - q.l / q.L); cx.fillStyle = `rgba(${q.c},${a})`; cx.beginPath(); cx.arc(q.x, q.y, q.r, 0, 7); cx.fill() }
    }
    if (t < 5.6) requestAnimationFrame(frame);
    else { box.style.opacity = 0; setTimeout(() => box.remove(), 700); if (wsIgn && wsIgn.k === kk) wsIgn = null }
  };
  const go = () => { t0 = resume || performance.now(); if (wsIgn && wsIgn.k === kk) wsIgn.t0 = t0; requestAnimationFrame(frame) };
  (lit.decode ? lit.decode() : Promise.resolve()).then(go, go);
}

// a fixed star field behind the Train page
const WS_SKY = (() => {
  let s = 7; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280; let st = "";
  for (let i = 0; i < 220; i++) st += `<circle cx="${(r() * 390).toFixed(0)}" cy="${(r() * 700).toFixed(0)}" r="${[.5, .6, .8, 1, 1.2][Math.floor(r() * 5)]}" fill="#EAF4EF" opacity="${(.25 + r() * .6).toFixed(2)}"/>`;
  for (let i = 0; i < 7; i++) { const x = (r() * 390).toFixed(0), y = (r() * 500).toFixed(0); st += `<path transform="translate(${x} ${y})" d="M0 -6 L.9 -.9 L6 0 L.9 .9 L0 6 L-.9 .9 L-6 0 L-.9 -.9Z" fill="#F2FBF7" opacity=".85"/>` }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#02040A"/><stop offset=".4" stop-color="#06101A"/><stop offset=".7" stop-color="#081613"/><stop offset="1" stop-color="#040706"/></linearGradient><filter id="b"><feGaussianBlur stdDeviation="18"/></filter></defs><rect width="390" height="844" fill="url(#g)"/><ellipse cx="200" cy="300" rx="320" ry="44" transform="rotate(-32 200 300)" fill="#9CC8D8" opacity=".07" filter="url(#b)"/><path d="M-20 150 C60 90 120 190 200 130 S330 90 420 150 L420 210 C330 160 280 230 200 190 S60 170 -20 220Z" fill="#22A06B" opacity=".09" filter="url(#b)"/>${st}</svg>`;
  return "url(\"data:image/svg+xml," + encodeURIComponent(svg) + "\")";
})();
(function wsStyle() {
  const css = `
.ws-sky{position:fixed;inset:0;z-index:0;pointer-events:none;background:#03050A ${WS_SKY} center top/cover no-repeat;overflow:hidden}
.ws-shoot{position:absolute;left:10%;top:12%;width:70px;height:1.4px;background:linear-gradient(90deg,transparent,#fff);transform:rotate(18deg);opacity:0;animation:wsShoot 9s linear infinite}
@keyframes wsShoot{0%{opacity:0;transform:translate(0,0) rotate(18deg)}4%{opacity:1}12%{opacity:0;transform:translate(260px,84px) rotate(18deg)}100%{opacity:0;transform:translate(260px,84px) rotate(18deg)}}
@media (prefers-reduced-motion:reduce){.ws-shoot,.ws-clouds{animation:none}}
body.ws-page{background:#03050A}
body.ws-page #view>*:not(.ws-sky){position:relative;z-index:1}
body.ws-page #top{position:relative;z-index:1}
.ws-head{display:flex;justify-content:space-between;align-items:center;color:#F5F1E6;--wc:#7FC8A9}
.ws-head.ws-run{--wc:#F4C48E}.ws-head.ws-rest{--wc:#C9D4DE}
.ws-eye{white-space:nowrap;font:800 10px/1 var(--display);letter-spacing:.32em;color:var(--wc)}
.ws-h1{font:900 30px/1.1 var(--display);margin:4px 0 0;color:#F5F1E6}
.ws-chips{display:flex;gap:6px}
.ws-chips button{padding:7px 11px;border-radius:10px;border:1px solid rgba(245,241,230,.1);background:none;font:800 11px/1 var(--display);letter-spacing:.14em;color:#97A1B8;cursor:pointer}
.ws-chips button.on{background:rgba(34,160,107,.2);border-color:#7FC8A9;color:#DEF1E9}
.ws{--wc:#7FC8A9;--wd:rgba(34,160,107,.75);--wg:rgba(34,160,107,.35);--wt1:#DEF1E9;--wt2:#7FC8A9;--wt3:#18704B;--wb1:#22A06B;--wb2:#1C7A52;--wbi:#04140C;color:#F5F1E6;margin:0 -14px}
.ws.ws-run{--wc:#E0A867;--wd:rgba(224,168,103,.75);--wg:rgba(224,168,103,.32);--wt1:#FFF1DC;--wt2:#F4C48E;--wt3:#A06A2C;--wb1:#E0A867;--wb2:#9C6A2E;--wbi:#1A0E02}
.ws.ws-rest{--wc:#8FA3B8;--wd:rgba(143,163,184,.7);--wg:rgba(143,163,184,.25);--wt1:#E6ECF2;--wt2:#A9B6C4;--wt3:#5E6B78;--wb1:#5E6B78;--wb2:#3A4450;--wbi:#F5F1E6}
.ws-frame{position:relative;margin:0 10px;border:1px solid rgba(127,200,169,.2);border-radius:6px;background:rgba(4,10,10,.18);overflow:hidden}
.ws-frame::after{content:"";position:absolute;inset:0;z-index:4;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(255,255,255,.02) 0 1px,transparent 1px 3px)}
.ws-c{position:absolute;width:22px;height:22px;border:0 solid var(--wc);z-index:5}
.ws-c.tl{left:10px;top:10px;border-left-width:2px;border-top-width:2px}.ws-c.tr{right:10px;top:10px;border-right-width:2px;border-top-width:2px}
.ws-c.bl{left:10px;bottom:10px;border-left-width:2px;border-bottom-width:2px}.ws-c.br{right:10px;bottom:10px;border-right-width:2px;border-bottom-width:2px}
.ws-bar{position:absolute;left:22px;right:22px;top:18px;z-index:5;display:flex;justify-content:space-between;align-items:center;padding-bottom:9px;border-bottom:1px solid;border-image:linear-gradient(90deg,var(--wc),transparent) 1;font:800 10px/1 var(--display);letter-spacing:.26em;color:var(--wc);text-shadow:0 0 8px var(--wc)}
.ws-idx{color:#97A1B8;text-shadow:none}
.ws-stage{position:relative;aspect-ratio:390/440;overflow:hidden}
.ws-peek{all:unset;position:absolute;top:30%;width:46%;cursor:pointer;z-index:1;opacity:.6;filter:brightness(.75) saturate(.85)}
.ws-peek.l{left:-19%}.ws-peek.r{right:-19%}
.ws-peek img{display:block;width:100%;aspect-ratio:780/880}
.ws-plab{position:absolute;top:40%;z-index:3;display:flex;flex-direction:column;gap:3px;font:700 11px/1.15 var(--display);pointer-events:none;text-shadow:0 1px 3px #000}
.ws-plab b{font-weight:800;font-size:9.5px;letter-spacing:.16em}
.ws-plab.l{left:12px}.ws-plab.r{right:12px;text-align:right}
.ws-plab.pg{color:#7FC8A9}.ws-plab.pa{color:#E0A867}.ws-plab.ps{color:#77736A}
.ws-track{position:absolute;inset:0;z-index:2;display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.ws-track::-webkit-scrollbar{display:none}
.ws-slide{flex:0 0 100%;scroll-snap-align:center;position:relative}
.ws-slide img{display:block;width:100%;height:100%;object-fit:contain;user-select:none;-webkit-user-drag:none;pointer-events:none}
.ws-slide.ws-dark>img{filter:grayscale(1) brightness(.42) contrast(1.08)}
.ws-peek.ws-dark img{filter:grayscale(1) brightness(.6)}
.ws-ign{position:absolute;pointer-events:none;transition:opacity .7s}
.ws-ign img,.ws-ign canvas{position:absolute;inset:0;width:100%;height:100%}
.ws-ign img.c{visibility:hidden;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}
.ws-ign img.lt{opacity:0;mix-blend-mode:screen;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}
.ws-ign .bm{position:absolute;width:22px;margin-left:-11px;opacity:0;background:linear-gradient(0deg,rgba(222,241,233,.9),rgba(127,200,169,.35) 40%,transparent);filter:blur(3px);transform-origin:bottom}
.ws-ign .rg{position:absolute;left:50%;width:84%;aspect-ratio:3.2/1;border-radius:50%;border:2px solid #DEF1E9;box-shadow:0 0 18px #22A06B,inset 0 0 14px #22A06B;opacity:0;transform:translate(-50%,-50%) scale(.2)}
.ws-clouds{position:absolute;left:-10%;right:-10%;bottom:-4%;height:34%;z-index:3;pointer-events:none;background:radial-gradient(40% 32% at 20% 70%,rgba(159,179,184,.16),transparent 70%),radial-gradient(45% 30% at 78% 74%,rgba(159,179,184,.14),transparent 70%),radial-gradient(60% 34% at 50% 92%,rgba(120,140,145,.18),transparent 70%);filter:blur(6px);animation:wsCloud 18s ease-in-out infinite alternate}
@keyframes wsCloud{from{transform:translateX(-12px)}to{transform:translateX(12px)}}
.ws-daybar{display:flex;align-items:center;justify-content:space-between;margin:10px 18px 0;font:800 10.5px/1 var(--display);letter-spacing:.16em}
.ws-daybar button{all:unset;cursor:pointer;padding:6px 0;color:#77736A;font:inherit;letter-spacing:inherit;cursor:pointer}
.ws-daybar span{padding:7px 14px;border:1px solid var(--wc);border-radius:3px;color:#F5F1E6;background:rgba(0,0,0,.4);clip-path:polygon(8px 0,calc(100% - 8px) 0,100% 50%,calc(100% - 8px) 100%,8px 100%,0 50%)}
.ws-card{position:relative;margin:12px 14px 0;padding:14px;border-radius:4px;background:linear-gradient(180deg,rgba(10,14,13,.95),rgba(6,8,8,.95));border:1px solid var(--wc);box-shadow:0 0 0 1px rgba(0,0,0,.6),0 0 28px -10px var(--wc)}
.ws-line{display:flex;align-items:center;gap:8px;font:800 10px/1 var(--display);letter-spacing:.26em;color:var(--wc)}
.ws-bang{padding:4px 6px;border:1px solid var(--wc)}
.ws-title{font:900 34px/1 var(--display);margin-top:10px;letter-spacing:.02em;background:linear-gradient(180deg,var(--wt1),var(--wt2) 50%,var(--wt3));-webkit-background-clip:text;background-clip:text;color:transparent}
.ws-sub{font-size:12.5px;line-height:1.45;color:#CFC9BA;margin-top:5px}.ws-sub b{color:#F5F1E6}
.ws-stats{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px}
.ws-stats span{padding:6px 9px;border-radius:3px;background:rgba(0,0,0,.35);border:1px solid var(--wd);font:800 11px/1 var(--display);letter-spacing:.1em;color:var(--wt1)}
.ws.ws-gym .ws-stats span{border-color:rgba(34,160,107,.45);color:#DEF1E9}.ws.ws-run .ws-stats span{border-color:rgba(224,168,103,.45);color:#F4C48E}
.ws-stats span.boss{border-color:rgba(60,123,244,.55);color:#9DBDFA}
.ws-go{display:grid;place-items:center;width:100%;height:52px;margin-top:12px;border:0;border-radius:4px;cursor:pointer;clip-path:polygon(14px 0,calc(100% - 14px) 0,100% 50%,calc(100% - 14px) 100%,14px 100%,0 50%);background:linear-gradient(180deg,var(--wb1),var(--wb2));box-shadow:inset 0 1px 0 rgba(255,255,255,.3);font:800 16px/1 var(--display);letter-spacing:.22em;color:var(--wbi)}
.ws-go:disabled{background:rgba(255,255,255,.06);color:#97A1B8;cursor:default}
.ws-menu{display:flex;justify-content:center;align-items:center;gap:6px;margin-top:10px;font:700 12px/1 var(--display);letter-spacing:.08em;color:#97A1B8}
.ws-menu button{all:unset;cursor:pointer;padding:4px 2px;color:#97A1B8;font:inherit;letter-spacing:inherit;cursor:pointer}
.ws-menu .dot{opacity:.6}
.ws-back{margin-bottom:10px}
body.ws-page .seg{background:rgba(8,12,12,.72);border:1px solid rgba(127,200,169,.2);box-shadow:none}
body.ws-page .seg button{color:#97A1B8}
body.ws-page .seg button.on{background:linear-gradient(180deg,rgba(34,160,107,.4),rgba(34,160,107,.16));color:#DEF1E9;box-shadow:inset 0 0 0 1px rgba(127,200,169,.5)}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
})();

/* ---------- Bounty: tap the island to see the day's workout or run plan ----------
   A view over the Train page. The header (title, totals, "Objectives") stays put; only the list scrolls.
   Tapping a row opens it in place: for gym days the old exercise card (target, Gate banner, sets with
   their types, dumbbells, plates, add/remove set, swap, form check, history) plus sets/reps/rest for the
   routine; for runs the matching fields of the run. */
let wsPop = null;  // {k, open: row index or null, top: list scroll}
const WSB_REST = [30, 45, 60, 75, 90, 120, 150, 180, 240];
const WSB_EFF = { easy: "Easy", tempo: "Tempo", hard: "Hard", allout: "All-out", hr: "Zone 2", race: "Race pace" };
function wsbRoutine(su, p) { const rs = (su && su.routines) || []; return rs.find(r => r.id === p.day) || rs.find(r => r.name === p.name) || null }
function wsbLast(ex, k) {
  try { const h = exHistory(ex.id, k, fmtOf(ex)); if (!h.length) return ""; const s = h[0].sets.filter(x => x.t !== "w"), l = S.logs[h[0].k];
    const top = (s.length ? s : h[0].sets).reduce((a, b) => (Number(b.w) || 0) > (Number(a.w) || 0) ? b : a);
    return setTxt(fmtOf(ex), top, logDb(ex.id, l)) } catch (_) { return "" }
}
function wsbDia(c, fill) { return `<i class="wsb-dia" style="--c:${c}"${fill ? ' data-fill="1"' : ""}></i>` }
function wsbStep(lab, attr, val) { return `<div class="wsb-st"><span>${lab}</span><div><button type="button" data-wsbstep="${attr}|-1" aria-label="Less ${lab.toLowerCase()}">−</button><b>${val}</b><button type="button" data-wsbstep="${attr}|1" aria-label="More ${lab.toLowerCase()}">+</button></div></div>` }
function wsbHtml(p, k, pick) {
  const d = parseYmd(k), when = k === ymd(today) ? "TODAY" : wsDayTxt(d), log = S.logs[k];
  let title, plain, boxes, rows = [];
  if (p.type === "gym") {
    const ex = p.ex || [], sets = ex.reduce((t, e) => t + (e.sets || 0), 0);
    const boss = id => { try { return typeof rkGateFor === "function" && rkGateFor(id) } catch (_) { return false } };
    const nb = ex.filter(e => !e.fixed && boss(e.id)).length, mins = typeof estMin === "function" ? estMin(ex) : 50;
    const su = typeof CUSTOM !== "undefined" && CUSTOM && S.profile && S.profile.setup, R = su ? wsbRoutine(su, p) : null;
    title = `${String(p.name || "Gym").toUpperCase()} GATE`;
    plain = `${esc(p.name || "Gym")} · ${ex.length} exercise${ex.length === 1 ? "" : "s"} · ${sets} sets · ~${mins} min`;
    boxes = [[sets, "Sets"], [nb, nb === 1 ? "Gate boss" : "Gate bosses"], [`~${mins}m`, "Estimated"]];
    rows = ex.map((e, i) => {
      const b = !e.fixed && boss(e.id), last = wsbLast(e, k), rr = e.lo === e.hi ? e.lo : `${e.lo}–${e.hi}`, key = e.id, open = wsPop.open === key;
      const rest = typeof restFor === "function" ? restFor(e.id) : e.rest || 90;
      let h = `<button type="button" class="wsb-row${open ? " open" : ""}" data-wsbrow="${esc(key)}" aria-expanded="${open}">${wsbDia(b ? "#6EA8FF" : "#B47A3F", b)}<span class="wsb-rt"><span class="wsb-l1"><b>${esc(e.name)}</b><em>${e.sets} × ${rr}<i class="wsb-chev">▾</i></em></span>
        <span class="wsb-l2"><span>${esc(e.equip || "")}${e.equip ? " · " : ""}rest ${fmtClock(rest * 1000)}</span>${last ? `<span>last ${esc(last)}</span>` : ""}</span>${b && !open ? `<span class="wsb-boss">♛ GATE BOSS</span>` : ""}</span></button>`;
      if (open) {
        let pan = "";
        if (log) {
          const cur = log.ex && log.ex[e.id];
          pan = cur && cur.length ? `<div class="wsb-done">${cur.map((s, j) => `<span><i>${s.t ? String(s.t).toUpperCase() : j + 1}</i>${esc(setTxt(fmtOf(e), s, logDb(e.id, log)))}</span>`).join("")}</div>` : `<p class="wsb-note">Not logged in this session.</p>`;
          pan += `<div class="wsb-acts"><button type="button" data-wslog="1">VIEW THE FULL LOG</button></div>`;
        } else {
          const re = R && R.ex.find(x => x.id === e.id);
          if (re) pan += `<div class="wsb-steps">${wsbStep("SETS", `${e.id}|sets`, re.sets)}${wsbStep(isSec(e) ? "SECONDS" : "REPS", `${e.id}|reps`, re.lo === re.hi ? re.lo : `${re.lo}–${re.hi}`)}${wsbStep("REST", `${e.id}|rest`, fmtClock((re.rest || rest) * 1000))}</div>`;
          try { pan += exerciseBlock(e, k, null) } catch (err) { pan += `<p class="wsb-note">This exercise can't be shown here.</p>` }
        }
        h += `<div class="wsb-pan">${pan}</div>`;
      }
      return `<div class="wsb-item">${h}</div>`;
    });
  } else {
    const spec = p.spec || {}, parts = [];
    String(p.d || "").split(", ").forEach((s, i) => { if (i && parts.length && !/^(\d|then \d+ strides)|to finish$/.test(s)) parts[parts.length - 1] += `, ${s}`; else parts.push(s) });  // a new stage starts with an amount
    const r = p.rid && typeof runById === "function" ? runById(p.rid) : null, swapped = (S.profile.runSwap || {})[k];
    const auto = r && typeof isAuto === "function" && isAuto(r), edit = r && !r.follow && !auto && !swapped && !log;
    const amt = (String(p.d).match(/(\d+(?:\.\d+)?) ?(mi|km|min)\b/) || [])[0] || "";
    title = String(pick.name || "Trail").toUpperCase();
    plain = `${esc(p.t || "Run")}${p.tag ? ` · ${esc(p.tag)}` : ""}`;
    boxes = [[spec.n ? `×${spec.n}` : amt || "—", spec.n ? "Reps" : /min/.test(amt) ? "Main part" : "Distance"], [WSB_EFF[spec.effort] || "Easy", "Effort"], [(WS_RUNTAG[pick.type] || "TRAIL").replace(" TRAIL", ""), "Type"]];
    const sel_ = (attr, v, opts) => `<select data-run-sel="${r.id}|${attr}">${opts.map(([a, n]) => `<option value="${a}" ${String(v) === String(a) ? "selected" : ""}>${esc(n)}</option>`).join("")}</select>`;
    rows = parts.map((s, i) => {
      const kind = i === 0 && /^\d+-min (walk|easy jog)$/.test(s) ? "warm" : /to finish$/.test(s) ? "cool" : /^then \d+ strides/.test(s) ? "strides" : "main";
      const name = { warm: "Warm-up", cool: "Cool-down", strides: "Strides", main: p.t || "Main part" }[kind];
      const a = kind === "strides" ? `${(s.match(/\d+/) || [""])[0]} strides` : (s.match(/^(\d+ × |\d+(?:\.\d+)? ?(?:mi|km|min)\b|\d+-min)/) || [""])[0].replace("-min", " min").replace(" × ", " reps");
      const key = kind, open = wsPop.open === key;
      let h = `<button type="button" class="wsb-row${open ? " open" : ""}" data-wsbrow="${key}" aria-expanded="${open}">${wsbDia("#B47A3F")}<span class="wsb-rt"><span class="wsb-l1"><b>${esc(name)}</b><em>${esc(a)}<i class="wsb-chev">▾</i></em></span><span class="wsb-l2"><span>${esc(s.charAt(0).toUpperCase() + s.slice(1))}</span></span></span></button>`;
      if (open) {
        let pan = "";
        if (edit) {
          const m = r.main;
          if (kind === "warm") pan += `<div class="runf">${stepper("Warm-up", `${r.id}|warm`, r.warm, " min")}<label>As${sel_("warmHow", r.warmHow || "jog", [["jog", "Easy jog"], ["walk", "Walk"]])}</label></div>`;
          else if (kind === "cool") pan += `<div class="runf">${stepper("Cool-down", `${r.id}|cool`, r.cool, " min")}</div>`;
          else if (kind === "strides") pan += `<div class="runf">${stepper("Strides", `${r.id}|strides`, r.strides || 0)}</div>`;
          else {
            if (m.kind === "rep") pan += `<div class="runf">${stepper("Reps", `${r.id}|n`, m.n)}<label>Each rep${sel_("workBy", m.work.by, [["time", "By time"], ["dist", "By distance"]])}</label><label>${m.work.by === "dist" ? "Metres" : "Seconds"}<input inputmode="numeric" data-run-in="${r.id}|work" value="${m.work.v}"></label></div>
              <div class="runf"><label>Recovery${sel_("restBy", m.rest.by, [["time", "By time"], ...(r.type === "hills" ? [["back", "Back down the hill"]] : r.type === "sprints" ? [["back", "Back to the start"]] : [])])}</label>${m.rest.by === "time" ? `<label>Seconds<input inputmode="numeric" data-run-in="${r.id}|rest" value="${m.rest.v}"></label>` : ""}<label>As${sel_("restHow", m.rest.how || "jog", [["jog", "Easy jog"], ["walk", "Walk"]])}</label></div>`;
            else pan += `<div class="runf"><label>Main part${sel_("by", m.by, [["time", "By time"], ["dist", "By distance"]])}</label><label>${m.by === "dist" ? (RU() === "km" ? "Kilometres" : "Miles") : "Minutes"}<input inputmode="decimal" data-run-in="${r.id}|v" value="${m.by === "dist" ? dU(m.v) : m.v}"></label></div>
              <div class="runf"><label class="rk-check"><input type="checkbox" data-run-rw="${r.id}" ${m.rw && m.rw.run > 0 ? "checked" : ""}> Run/walk</label>${m.rw && m.rw.run > 0 ? `${stepper("Run", `${r.id}|rwrun`, m.rw.run, " min")}${stepper("Walk", `${r.id}|rwwalk`, m.rw.walk, " min")}` : ""}</div>`;
            pan += `<div class="runf"><label>Effort${sel_("effort", r.effort, EFFORTS)}</label></div>`;
            if (!(r.warm > 0)) pan += `<div class="runf">${stepper("Warm-up", `${r.id}|warm`, 0, " min")}</div>`;
            if (!(r.cool > 0)) pan += `<div class="runf">${stepper("Cool-down", `${r.id}|cool`, 0, " min")}</div>`;
            if (m.kind !== "rep" && !(r.strides > 0)) pan += `<div class="runf">${stepper("Strides after", `${r.id}|strides`, 0)}</div>`;
          }
          pan += `<p class="wsb-note">Changes apply to ${esc(r.name || "this run")} every week.</p>`;
        } else {
          pan += `<p class="wsb-note">${log ? "This run is logged." : r && r.follow ? "Your program sets this run week by week." : auto ? "Auto run: the structure is read from your recording." : swapped ? "Changed for this day only." : "This run comes from your program."}</p>`;
        }
        const acts = [];
        if (log) acts.push(`<button type="button" data-wslog="1">VIEW THE FULL LOG</button>`);
        else {
          if (r && r.follow) acts.push(`<button type="button" data-run-custom="${r.id}">CUSTOMIZE THIS RUN</button>`);
          if (!p.race && typeof runNewHtml === "function") acts.push(`<button type="button" data-runswap="${k}">CHANGE FOR THIS DAY</button>`);
        }
        if (acts.length) pan += `<div class="wsb-acts">${acts.join("")}</div>`;
        h += `<div class="wsb-pan">${pan}</div>`;
      }
      return `<div class="wsb-item">${h}</div>`;
    });
    if (p.hint) rows.push(`<p class="wsb-hint">${esc(p.hint)}</p>`);
  }
  const n = rows.filter(x => x.startsWith('<div class="wsb-item')).length;
  return `<div class="wsb" role="dialog" aria-modal="true" aria-label="${esc(title)}"><button type="button" class="wsb-bg" data-wsbx="1" aria-label="Close"></button>
    <div class="wsb-card"><div class="wsb-in"><div class="wsb-top"><div class="wsb-eb"><span>BOUNTY · ${when}</span><button type="button" class="wsb-x" data-wsbx="1" aria-label="Close">✕</button></div>
      <div class="wsb-title">${esc(title)}</div><div class="wsb-plain">${plain}</div>
      <div class="wsb-boxes">${boxes.map(([v, l]) => `<div><b>${esc(String(v))}</b><span>${esc(l)}</span></div>`).join("")}</div>
      <div class="wsb-obj"><span>OBJECTIVES</span><span>${n}</span></div></div>
      <div class="wsb-lw"><div class="wsb-list" id="wsbList">${rows.join("") || `<p class="wsb-note">Nothing planned yet.</p>`}</div><div class="wsb-bar" aria-hidden="true"><i id="wsbThumb"></i></div></div></div></div>
    <div class="wsb-hint2">TAP OUTSIDE TO CLOSE</div></div>`;
}
function wsbPaintBar() {
  const L = document.getElementById("wsbList"), t = document.getElementById("wsbThumb"); if (!L || !t) return;
  const over = L.scrollHeight - L.clientHeight; t.parentElement.style.opacity = over > 4 ? 1 : 0;
  const h = Math.max(.12, L.clientHeight / L.scrollHeight); t.style.height = h * 100 + "%"; t.style.top = (over > 0 ? L.scrollTop / over : 0) * (1 - h) * 100 + "%";
  L.classList.toggle("at-top", L.scrollTop < 4); L.classList.toggle("at-end", L.scrollTop > over - 4);
}
function wsbAfter() {
  // the popup is drawn with the page, then lifted onto <body> so it sits above the tab bar
  document.querySelectorAll("body > .wsb").forEach(x => x.remove());
  const W = document.querySelector("#view .wsb"); if (W) { document.body.appendChild(W);
    W.addEventListener("input", e => { const el = e.target; if (!el.id || el.type === "checkbox" || el.type === "file" || NO_DRAFT.has(el.id)) return; drafts[draftKey(el.id)] = el.value; persistDrafts() }) }
  const L = document.getElementById("wsbList"); if (!L || !wsPop) return;
  L.scrollTop = wsPop.top || 0;
  if (wsPop.reveal != null) { const rb = L.querySelector(`[data-wsbrow="${CSS.escape(wsPop.reveal)}"]`), it = rb && rb.parentElement; wsPop.reveal = null;
    if (it) { const lo = it.offsetTop - 6, hi = it.offsetTop + it.offsetHeight - L.clientHeight + 6; if (L.scrollTop > lo) L.scrollTop = lo; else if (L.scrollTop < hi) L.scrollTop = Math.min(lo, hi) } }
  wsPop.top = L.scrollTop; wsbPaintBar();
  L.addEventListener("scroll", () => { if (wsPop) wsPop.top = L.scrollTop; wsbPaintBar() }, { passive: true });
}
function wsbClose() { wsPop = null; document.querySelectorAll("body > .wsb").forEach(x => x.remove()); if (typeof closeStMenu === "function") closeStMenu(); lastRenderKey = ""; render() }
document.addEventListener("click", e => {
  if (!WS_ON || tab !== "home" || wsLog) return;
  const t = e.target;
  if (t.closest("[data-wsbx]")) { wsbClose(); return }
  const row = t.closest("[data-wsbrow]");
  if (row) { const i = row.dataset.wsbrow; wsPop.open = wsPop.open === i ? null : i; wsPop.reveal = wsPop.open; lastRenderKey = ""; render(); return }
  const st = t.closest("[data-wsbstep]");
  if (st) { const [id, f, dir] = st.dataset.wsbstep.split("|"), s = +dir, p = planFor(sel);
    suMut(su => { const r = wsbRoutine(su, p), x = r && r.ex.find(e => e.id === id); if (!x) return;
      if (f === "sets") x.sets = Math.max(1, Math.min(10, (x.sets || 3) + s));
      else if (f === "reps") { const w = Math.max(0, (x.hi || x.lo) - x.lo), st_ = isSec(x) ? 5 : 1; x.lo = Math.max(1, x.lo + s * st_); x.hi = x.lo + w }
      else if (f === "rest") { const cur = Number(x.rest) || (typeof restFor === "function" ? restFor(id) : 90), i = WSB_REST.findIndex(v => v >= cur); x.rest = WSB_REST[Math.max(0, Math.min(WSB_REST.length - 1, (i < 0 ? WSB_REST.length - 1 : i) + s))] } });
    return }
  const sl = t.closest(".ws-slide");
  if (sl && !t.closest(".ws-ign")) { const k = sl.dataset.wsday, p = inProgram(parseYmd(k)) ? planFor(parseYmd(k)) : null;
    if (!p || p.type === "rest" || (p.type === "gym" && !(p.ex || []).length)) return;
    if (k !== ymd(sel)) return;
    wsPop = { k, open: null, top: 0 }; lastRenderKey = ""; render() }
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && wsPop && !document.querySelector(".st-menu")) wsbClose() });
{ const st = document.createElement("style"); st.id = "wsbCss"; st.textContent = `body:has(.wsb){overflow:hidden}
.wsb{position:fixed;inset:0;z-index:880;display:flex;flex-direction:column;padding:calc(env(safe-area-inset-top,0px) + 72px) max(16px,env(safe-area-inset-left,0px)) calc(env(safe-area-inset-bottom,0px) + 18px) max(16px,env(safe-area-inset-right,0px));--m0:#6B3F17;--m1:#B47A3F;--m2:#F4C48E;--mid:#7FC8A9;--core:#DEF1E9;--mut:#8F97A6;--boss:#6EA8FF;animation:wsbIn .22s ease-out}
@keyframes wsbIn{from{opacity:0}to{opacity:1}}
.wsb-bg{all:unset;position:absolute;inset:0;background:rgba(2,4,8,.8);-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);cursor:default}
.wsb-card{position:relative;flex:1;min-height:0;max-width:480px;width:100%;margin:0 auto;border-radius:22px;padding:3px;background:linear-gradient(90deg,var(--m0),var(--m1) 40%,var(--m2) 60%,var(--m0));box-shadow:0 30px 60px #000;animation:wsbUp .26s cubic-bezier(.2,.9,.3,1)}
@keyframes wsbUp{from{transform:translateY(18px) scale(.98)}to{transform:none}}
.wsb-in{height:100%;box-sizing:border-box;border-radius:19px;padding:18px 18px 12px;display:flex;flex-direction:column;color:#F5F1E6;font-family:Barlow,system-ui,sans-serif;background:radial-gradient(70% 60% at 90% 0%,rgba(34,160,107,.18),transparent 65%),repeating-linear-gradient(135deg,rgba(34,160,107,.03) 0 1px,transparent 1px 7px),#0A0A0D}
.wsb-top{flex-shrink:0}
.wsb-eb{display:flex;justify-content:space-between;align-items:center;font:800 10px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.3em;color:var(--m2)}
.wsb-x{all:unset;cursor:pointer;width:30px;height:30px;border-radius:50%;border:1px solid rgba(244,196,142,.35);display:grid;place-items:center;color:var(--m2);font-size:13px;letter-spacing:0}
.wsb-title{margin-top:8px;font:900 30px/1.05 "Barlow Semi Condensed",sans-serif;background:linear-gradient(180deg,var(--core),var(--mid) 55%,#18704B);-webkit-background-clip:text;background-clip:text;color:transparent;text-wrap:balance}
.wsb-plain{font-size:13px;color:#B9BFCA;margin:4px 0 14px}
.wsb-boxes{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.wsb-boxes div{padding:10px 6px;text-align:center;border-radius:10px;background:linear-gradient(180deg,#1A140E,#0D0A07);border:1px solid var(--m0);min-width:0}
.wsb-boxes b{display:block;font:900 18px/1 "Barlow Semi Condensed",sans-serif;color:var(--m2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wsb-boxes span{display:block;font:700 9px/1.2 "Barlow Semi Condensed",sans-serif;letter-spacing:.14em;color:#A08060;margin-top:5px;text-transform:uppercase}
.wsb-obj{display:flex;justify-content:space-between;align-items:center;margin-top:16px;padding-bottom:6px;border-bottom:1px solid rgba(180,122,63,.45);font:800 9.5px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.3em;color:var(--mid)}
.wsb-obj span+span{color:#6E6960;letter-spacing:.2em}
.wsb-lw{position:relative;flex:1;min-height:0}
.wsb-list{height:100%;overflow-y:auto;overscroll-behavior:contain;padding-right:12px;scrollbar-width:none;-webkit-mask-image:linear-gradient(180deg,transparent,#000 18px,#000 calc(100% - 30px),transparent);mask-image:linear-gradient(180deg,transparent,#000 18px,#000 calc(100% - 30px),transparent)}
.wsb-list::-webkit-scrollbar{display:none}
.wsb-list.at-top{-webkit-mask-image:linear-gradient(180deg,#000,#000 calc(100% - 30px),transparent);mask-image:linear-gradient(180deg,#000,#000 calc(100% - 30px),transparent)}
.wsb-list.at-end{-webkit-mask-image:linear-gradient(180deg,transparent,#000 18px);mask-image:linear-gradient(180deg,transparent,#000 18px)}
.wsb-list.at-top.at-end{-webkit-mask-image:none;mask-image:none}
.wsb-bar{position:absolute;right:0;top:6px;bottom:6px;width:3px;border-radius:2px;background:rgba(180,122,63,.12);pointer-events:none;transition:opacity .2s}
.wsb-bar i{position:absolute;left:0;right:0;border-radius:2px;background:linear-gradient(180deg,var(--m2),var(--m1))}
.wsb-item{border-bottom:1px solid rgba(180,122,63,.18)}
.wsb-row{all:unset;box-sizing:border-box;cursor:pointer;display:flex;gap:12px;align-items:flex-start;width:100%;padding:11px 0}
.wsb-row:focus-visible{outline:2px solid var(--m2);outline-offset:2px;border-radius:6px}
.wsb-dia{flex-shrink:0;margin-top:4px;width:12px;height:12px;transform:rotate(45deg);border:1.5px solid var(--c)}
.wsb-dia[data-fill]{background:rgba(110,168,255,.25)}
.wsb-rt{flex:1;min-width:0;display:flex;flex-direction:column}
.wsb-l1{display:flex;justify-content:space-between;gap:8px;align-items:baseline}
.wsb-l1 b{font:700 14.5px/1.25 Barlow,sans-serif;color:#F5F1E6}
.wsb-row.open .wsb-l1 b{color:var(--core)}
.wsb-l1 em{font:800 13px/1.25 "Barlow Semi Condensed",sans-serif;font-style:normal;white-space:nowrap;color:#F5F1E6}
.wsb-chev{font-style:normal;display:inline-block;margin-left:6px;font-size:11px;color:#6E6960;transition:transform .2s}
.wsb-row.open .wsb-chev{transform:rotate(180deg);color:var(--m2)}
.wsb-l2{display:flex;justify-content:space-between;gap:8px;font-size:12px;color:var(--mut);margin-top:2px}
.wsb-l2 span:last-child{text-align:right}
.wsb-boss{margin-top:5px;font:800 10px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.16em;color:var(--boss)}
.wsb-pan{margin:0 0 12px 24px;padding:12px;border-radius:12px;background:linear-gradient(180deg,#121014,#0B0B0E);border:1px solid rgba(180,122,63,.4);animation:wsbIn .18s ease-out}
.wsb-steps{display:flex;gap:8px;margin-bottom:12px}
.wsb-st{flex:1;min-width:0}
.wsb-st>span{display:block;font:800 8.5px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.18em;color:#A08060;margin-bottom:5px}
.wsb-st>div{display:flex;align-items:center;height:34px;border-radius:9px;border:1px solid rgba(180,122,63,.35);background:#0B0B0E}
.wsb-st button{all:unset;cursor:pointer;width:26px;height:100%;text-align:center;color:var(--m2);font:700 16px/34px "Barlow Semi Condensed",sans-serif}
.wsb-st b{flex:1;text-align:center;font:800 14px/1 "Barlow Semi Condensed",sans-serif;white-space:nowrap}
.wsb-note{margin:4px 0 0;font-size:12px;color:var(--mut)}
.wsb-hint{margin:14px 0 6px;font-size:12.5px;line-height:1.5;color:#B9BFCA}
.wsb-hint2{position:relative;text-align:center;margin-top:12px;font:700 10px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.22em;color:#6E6960;pointer-events:none}
.wsb-acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.wsb-acts button,.wsb .setbtns .link{all:unset;cursor:pointer;font:800 10.5px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.14em;color:var(--m2);padding:8px 10px;border-radius:8px;border:1px solid rgba(180,122,63,.28);text-transform:uppercase}
.wsb-done{display:flex;flex-wrap:wrap;gap:6px}
.wsb-done span{display:flex;gap:6px;align-items:center;padding:6px 9px;border-radius:8px;border:1px solid rgba(245,241,230,.12);font:700 12.5px/1 "Barlow Semi Condensed",sans-serif}
.wsb-done i{font-style:normal;color:var(--m1);font-size:10px}
/* the old exercise card, restyled inside the panel */
.wsb .ex{margin:0;padding:0;border:0;background:none;box-shadow:none}
.wsb .exhead{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 10px}
.wsb .exname{all:unset;cursor:pointer;font-size:0;padding:8px 10px;border-radius:8px;border:1px solid rgba(180,122,63,.28)}
.wsb .exname::after{content:"HISTORY";font:800 10.5px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.14em;color:var(--m2)}
.wsb .swapb{width:32px;height:30px;border-radius:8px;border:1px solid rgba(180,122,63,.28);background:transparent;color:var(--m2)}
.wsb .exmeta{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;font-size:12px;color:var(--mut)}
.wsb .exmeta .muted,.wsb .small.muted{color:var(--mut)}
.wsb .dbt{display:flex;align-items:center;gap:6px;font:800 10px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.12em;color:var(--core);text-transform:uppercase}
.wsb .dbt input{accent-color:#22A06B}
.wsb .prev{display:flex;flex-wrap:wrap;gap:5px;align-items:center;margin:0 0 10px;font-size:12px;color:var(--mut)}
.wsb .prev .pl{font:800 9px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.16em;color:#A08060;text-transform:uppercase;margin-right:2px}
.wsb .prev .pill{padding:4px 7px;border-radius:6px;border:1px solid rgba(245,241,230,.1);background:transparent;color:#C9CED7;font-size:11.5px}
.wsb .gate-banner{display:flex;gap:8px;align-items:flex-start;padding:8px 10px;border-radius:9px;background:rgba(110,168,255,.08);border:1px solid rgba(110,168,255,.35);font-size:12px;line-height:1.4;color:#C9D8F5;margin:0 0 10px}
.wsb .gate-banner .gb-sys{display:block;font:800 9px/1.4 "Barlow Semi Condensed",sans-serif;letter-spacing:.18em;color:var(--boss)}
.wsb .gate-banner b{color:var(--boss)}
.wsb .cnote,.wsb .target{padding:8px 10px;border-radius:9px;background:rgba(34,160,107,.07);border:1px solid rgba(34,160,107,.25);font-size:12px;color:#BFD8CC;margin:0 0 10px;line-height:1.4}
.wsb .cnote .ch{display:flex;gap:8px;align-items:center;margin-bottom:3px}
.wsb .cnote .who{font:800 9.5px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.18em;color:var(--mid);text-transform:uppercase}
.wsb .cnote .mode{font:800 9px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.14em;color:#04140C;background:var(--mid);padding:3px 6px;border-radius:4px;text-transform:uppercase}
.wsb .cnote .tgt{margin-left:auto;font:800 12.5px/1 "Barlow Semi Condensed",sans-serif;color:var(--core)}
.wsb .fmt-chip{all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:5px;padding:6px 9px;border-radius:8px;border:1px solid rgba(180,122,63,.35);font:800 10px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.12em;color:var(--m2);text-transform:uppercase}.wsb .fmt-chip svg{width:9px;height:6px}
.wsb .exmeta-l{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.wsb .tip summary{font:800 10px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.14em;color:var(--m2);cursor:pointer;margin-bottom:8px;text-transform:uppercase}
.wsb .sets{display:flex;flex-direction:column;gap:6px}
.wsb .set{display:flex;align-items:center;gap:6px;background:none;border:0;padding:0}
.wsb .set input{flex:1;min-width:0;height:34px;box-sizing:border-box;border-radius:9px;border:1px solid rgba(245,241,230,.12);background:#0B0B0E;color:#F5F1E6;font:800 15px/1 "Barlow Semi Condensed",sans-serif;text-align:center}
.wsb .set input:focus{outline:none;border-color:var(--m2)}
.wsb .set.gate-hit input{border-color:rgba(110,168,255,.55)}
.wsb .set span{color:#6E7480;font:700 11px/1 "Barlow Semi Condensed",sans-serif}
.wsb .set.done input{color:var(--core)}
.wsb .setno,.st-menu .setno{position:relative;width:30px;height:34px;border:0;background:none;color:var(--mid);font:900 11px/1 "Barlow Semi Condensed",sans-serif;display:grid;place-items:center;cursor:pointer;flex-shrink:0;z-index:0}
.wsb .setno::before,.st-menu .setno::before{content:"";position:absolute;width:15px;height:15px;transform:rotate(45deg);border:1.5px solid currentColor;background:#0A0A0D;z-index:-1}
.wsb .setno.w,.st-menu .setno.w{color:#E0B04A}.wsb .setno.d,.st-menu .setno.d{color:#C07BE0}.wsb .setno.f,.st-menu .setno.f{color:#E0675A}
.wsb .chk{width:34px;height:34px;border-radius:9px;border:1px solid rgba(245,241,230,.15);background:transparent;color:#6E7480}
.wsb .chk.on{background:#22A06B;border-color:#22A06B;color:#04140C}
.wsb .plates{margin-top:8px;font:700 12px/1.3 "Barlow Semi Condensed",sans-serif;letter-spacing:.06em;color:var(--m2)}
.wsb .plates:not(:empty){padding:8px 10px;border-radius:9px;border:1px dashed rgba(180,122,63,.35)}
.wsb .plates button{all:unset;cursor:pointer}
.wsb .setbtns{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.wsb .dbnote{font-size:11.5px;color:var(--mut);margin-bottom:8px}
.wsb .target.first{color:#BFD8CC}
.wsb .swapped{font-size:11px;color:var(--mut)}
/* run fields */
.wsb .runf{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end;margin-bottom:10px}
.wsb .runf label{display:flex;flex-direction:column;gap:5px;font:800 8.5px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.18em;color:#A08060;text-transform:uppercase;flex:1;min-width:110px}
.wsb .runf label.rk-check{flex-direction:row;align-items:center;font-size:10px;color:var(--core);min-width:0;flex:none}
.wsb .runf select,.wsb .runf input:not([type=checkbox]){height:34px;box-sizing:border-box;border-radius:9px;border:1px solid rgba(180,122,63,.35);background:#0B0B0E;color:#F5F1E6;font:700 13.5px/1 Barlow,sans-serif;padding:0 8px;letter-spacing:0;text-transform:none}
.wsb .runf .step{display:flex;align-items:center;height:34px;border-radius:9px;border:1px solid rgba(180,122,63,.35);background:#0B0B0E}
.wsb .runf .step button{all:unset;cursor:pointer;width:28px;text-align:center;color:var(--m2);font:700 16px/34px "Barlow Semi Condensed",sans-serif}
.wsb .runf .step b{flex:1;text-align:center;font:800 14px/1 "Barlow Semi Condensed",sans-serif;color:#F5F1E6;letter-spacing:0;white-space:nowrap}
/* the set-type menu, while the bounty is open */
body:has(.wsb) .st-menu{background:radial-gradient(70% 60% at 90% 0%,rgba(34,160,107,.18),transparent 65%),repeating-linear-gradient(135deg,rgba(34,160,107,.03) 0 1px,transparent 1px 7px),#0A0A0D;border:2px solid #B47A3F;border-radius:14px;box-shadow:0 16px 34px #000;padding:6px;color:#F5F1E6}
body:has(.wsb) .st-menu::before{content:"SET TYPE";display:block;padding:6px 8px 8px;border-bottom:1px solid rgba(180,122,63,.35);font:800 9px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.3em;color:#F4C48E}
body:has(.wsb) .st-menu button{color:#F5F1E6;border-radius:0;border-top:1px solid rgba(180,122,63,.16)}
body:has(.wsb) .st-menu button:first-of-type{border-top:0}
body:has(.wsb) .st-menu button.on{background:linear-gradient(90deg,rgba(224,176,74,.14),transparent);box-shadow:inset 2px 0 0 #E0B04A}
body:has(.wsb) .st-menu .small.muted{color:#8F97A6}
body:has(.wsb) .st-menu .st-del b{color:#E0675A}
body:has(.wsb) .st-menu .st-del .setno{color:#E0675A;background:none;border:0}
@media (prefers-reduced-motion:reduce){.wsb,.wsb-card,.wsb-pan{animation:none}}
`; document.head.appendChild(st) }
