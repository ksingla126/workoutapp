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
  if (p.type === "row" && typeof ROW_KINDS !== "undefined") { const K = ROW_KINDS[p.kind] || ROW_KINDS.steady, M = ROW_META[K.img]; return { img: K.img, name: M.title, kind: "row", type: p.kind } }
  if (p.type === "gym") { const t = WS_TOWERS[wsHash(k + "|gym|" + (p.name || "")) % WS_TOWERS.length]; return { img: t[0], name: t[1], kind: "gym" } }
  const ty = wsRunType(p), list = WS_TRAILS[ty] || WS_TRAILS.easy, t = list[wsHash(k + "|run|" + ty) % list.length];
  return { img: t[0], name: t[1], kind: "run", type: ty };
}
function wsWeek() { const mon = mondayOf(sel); return [...Array(7)].map((_, i) => addDays(mon, i)) }
// the island wheel: this week plus a week either side, so there is always a neighbour to spin in
function wsWheel() { const mon = mondayOf(sel); return [...Array(21)].map((_, i) => addDays(mon, i - 7)).filter(d => inProgram(d) || d >= START) }
function wsShort(p) { return !p || p.type === "rest" ? "Camp" : p.type === "gym" ? (p.name || "Gym") + " Gate" : p.type === "row" ? (p.name || "Row") : (p.t || "Run") }

function wsDayTxt(d) { return `${DOW[dowOf(d)].toUpperCase()} ${d.getDate()}` }
// the top of the page: eyebrow, title and the Today / Progress chips
function wsTop() {
  const k = ymd(sel), p = inProgram(sel) ? planFor(sel) : null, pk = wsPick(p, k);
  const what = pk.kind === "gym" ? "GATE SELECT" : pk.kind === "run" ? "TRAIL SELECT" : pk.kind === "row" ? "RIVER SELECT" : "CAMP";
  return `<div class="ws-head ws-${pk.kind}"><div><div class="ws-eye">RANKUP · ${what}</div><h1 class="ws-h1">Train</h1></div>
    <div class="ws-chips">${[["today", "TODAY"], ["progress", "PROGRESS"]].map(([v, n]) => `<button type="button" data-trv="${v}" class="${v === "today" ? "on" : ""}" aria-pressed="${v === "today"}">${n}</button>`).join("")}</div></div>`;
}
function viewWorld(openLogger) {
  wsSeenSet();
  if (wsLog) { wsPop = null; wsRun = null; return `<div class="ws-back"><button type="button" class="btn ghost sm" data-wslog="0">‹ Back to the island</button></div>` + viewHome(openLogger) }
  const days = wsWheel(), k = ymd(sel), p = inProgram(sel) ? planFor(sel) : null, pick = wsPick(p, k), idx = wsWeek().findIndex(d => ymd(d) === k), at = days.findIndex(d => ymd(d) === k);
  const slides = days.map((d, i) => {
    const kk = ymd(d), pp = inProgram(d) ? planFor(d) : null, pk = wsPick(pp, kk);
    const lit = wsLitState(pp, kk);
    return `<div class="ws-slide${kk === k ? " on" : ""}${lit === "lit" ? "" : " ws-dark"}" data-wsday="${kk}"${lit === "new" ? ` data-wsign="${pk.img}"` : ""} role="group" aria-label="${DOW[dowOf(d)]} ${d.getDate()} · ${esc(wsShort(pp))}" aria-current="${kk === k}"><div class="ws-zoom"><img src="/world/${pk.img}.webp" alt="" loading="${Math.abs(i - at) <= 2 ? "eager" : "lazy"}" decoding="async" draggable="false"></div></div>`;
  }).join("");
  const pd = addDays(sel, -1), nd = addDays(sel, 1);
  const kind = pick.kind, title = kind === "gym" ? "[SYSTEM] GATE SELECT" : kind === "run" ? "[SYSTEM] TRAIL SELECT" : kind === "row" ? "[SYSTEM] RIVER SELECT" : "[SYSTEM] CAMP";
  let h = `<div class="ws-sky" aria-hidden="true"><i class="ws-shoot"></i></div><div class="ws ws-${kind}">`;
  h += `<div class="ws-frame" role="region" aria-label="${esc(title.replace("[SYSTEM] ", ""))} · day ${idx + 1} of 7">
    <div class="ws-stage"><div class="ws-track" id="wsTrack">${slides}</div><div class="ws-clouds" aria-hidden="true"></div></div></div>`;
  h += `<div class="ws-daybar"><button type="button" data-wsgo="${ymd(pd)}">◀ ${wsDayTxt(pd)}</button><span>${wsDayTxt(sel)} · ${k === ymd(today) ? "TODAY" : kind === "gym" ? "GATE" : kind === "run" ? (WS_RUNTAG[pick.type] || "TRAIL") : kind === "row" ? ((ROW_KINDS[pick.type] || ROW_KINDS.steady).tag) : "CAMP"}</span><button type="button" data-wsgo="${ymd(nd)}">${wsDayTxt(nd)} ▶</button></div>`;
  h += wsCard(p, k, pick);
  if (wsPop && wsPop.k !== k) wsPop = null;
  if (wsPop && p && p.type !== "rest" && p.type !== "row") h += wsbHtml(p, k, pick);
  if (wsRun && wsRun.k !== k) wsRun = null;
  if (wsRun && p && p.type === "run" && !wsPop) h += wsrHtml(p, k, pick);
  return h + `</div>`;
}
const WS_RUNTAG = { easy: "EASY TRAIL", long: "LONG TRAIL", hills: "HILL TRAIL", intervals: "INTERVALS", sprints: "SPRINTS", tempo: "TEMPO", tt: "TIME TRIAL", fartlek: "FARTLEK", recovery: "RECOVERY", race: "RACE DAY" };
function wsCard(p, k, pick) {
  const log = S.logs[k], isToday = k === ymd(today), past = k < ymd(today), d = parseYmd(k), when = wsDayTxt(d);
  const running = TM.start && TM.date === k, M = (pick.kind === "row" ? ROW_META[pick.img] : WS_META[pick.kind === "gym" ? "tw" : pick.img]) || {};
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
      : log ? go("GATE CLEARED ✓ · VIEW REPORT", `data-wsana="${k}"`)
      : running ? go("RETURN TO THE GATE", `data-openlive="1"`)
      : isToday ? go(M.btn, `id="tmStart"`)
      : past ? go("LOG THIS GATE", `data-wslog="1"`)
      : `<button type="button" class="ws-go" disabled>OPENS ${when}</button>`;
    if (log) menu.push(`<button type="button" data-wslog="1">View log</button>`);
    if (!log) menu.push(`<button type="button" data-daymove="${k}|move">Move</button>`, ...(past ? [] : [`<button type="button" data-daymove="${k}|swap">Swap</button>`]), `<button type="button" data-dayskip="${k}">Rest day</button>`);
  } else if (p.type === "row") {
    const rl = typeof rwLoad === "function" && rwLoad(), live = rl && rl.k === k;
    line = log ? `${M.done} CLEARED · ${when}` : isToday ? M.line : `${M.done} · ${when}`;
    sub = `${M.sub} <b>${esc(p.name)}</b> · ${esc(p.d)}`;
    stats = rowStats(p).filter(Boolean);
    btn = log ? go("CLEARED ✓ · VIEW REPORT", `data-wsana="${k}"`)
      : live ? go(`RETURN TO THE ${M.done}`, `data-wsrow="${k}"`)
      : isToday ? go(M.btn, `data-wsrow="${k}"`)
      : past ? go("LOG THIS ROW", `data-wsrowlog="${k}"`)
      : `<button type="button" class="ws-go" disabled>OPENS ${when}</button>`;
    if (log) menu.push(`<button type="button" data-rowlog-edit="${k}">Edit log</button>`);
    if (!log && isToday) menu.push(`<button type="button" data-wsrowlog="${k}">Log by hand</button>`);
    if (!log) menu.push(`<button type="button" data-row-edit="${esc(p.rowId || "")}">Edit row</button>`, `<button type="button" data-daymove="${k}|move">Move</button>`, `<button type="button" data-dayskip="${k}">Rest day</button>`);
  } else {
    line = log ? `TRAIL CLEARED · ${when}` : isToday ? M.line : `TRAIL · ${when}`;
    const parts = String(p.d || "").split(" · "), ty = pick.type;
    sub = `${M.sub || ""}${p.t ? ` <b>${esc(p.t)}</b>${p.d ? ` · ${esc(p.d)}` : ""}` : ""}`;
    stats = [parts[0] ? esc(parts[0]).toUpperCase() : "", WS_RUNTAG[ty] || "", /bpm/.test(p.d || "") ? "ZONE 2" : ""].filter(Boolean);
    btn = log ? go("TRAIL CLEARED ✓ · VIEW REPORT", `data-wsana="${k}"`)
      : running ? go("RETURN TO THE TRAIL", `data-openlive="1"`)
      : isToday ? go(M.btn, `data-wsrun="${k}"`)
      : past ? go("LOG THIS TRAIL", `data-wsrun="${k}"`)
      : `<button type="button" class="ws-go" disabled>OPENS ${when}</button>`;
    if (log) menu.push(`<button type="button" data-wslog="1">View log</button>`);
    if (!log) menu.push(...(!p.race && typeof runNewHtml === "function" ? [`<button type="button" data-runswap="${k}">Edit trail</button>`] : []), `<button type="button" data-daymove="${k}|move">Move</button>`, `<button type="button" data-dayskip="${k}">Rest day</button>`);
  }
  return `<div class="ws-card" id="wsCard"><div class="ws-line"><span class="ws-bang">!</span>[SYSTEM] ${line}</div>
    <div class="ws-title">${esc(title)}</div><div class="ws-sub">${sub}</div>
    ${stats.length ? `<div class="ws-stats">${stats.map(s => s.startsWith("<i") ? s.replace("<i", "<span").replace("</i>", "</span>") : `<span>${s}</span>`).join("")}</div>` : ""}
    ${(() => { if (weekDays(k).filter(d => !S.logs[d] && inProgram(parseYmd(d))).length > 1) menu.push(`<button type="button" data-wsarr="${k}">Arrange week</button>`); return "" })()}${btn}${menu.length ? `<div class="ws-menu">${menu.join('<span class="dot">·</span>')}</div>` : ""}</div>`;
}
// after each render: put the selected island in view and pick the day that ends in the middle after a swipe
// each island's place on the wheel: 0 in the middle, ±1 a full step out to either side
function wsWheelPaint(tr) {
  const mid = tr.scrollLeft + tr.clientWidth / 2;
  for (const s of tr.querySelectorAll(".ws-slide")) {
    const w = s.offsetWidth || 1, d = (s.offsetLeft + w / 2 - mid) / w, a = Math.abs(d);
    if (a > 1.9) { if (s.style.visibility !== "hidden") s.style.visibility = "hidden"; continue }
    const m = Math.min(a, 1), f = Math.max(0, a - 1);
    if (s.style.visibility) s.style.visibility = "";
    // ease the step so the swap feels like a wheel turning, not a slide
    const e = m * m * (3 - 2 * m);
    // side islands sit further back on the wheel: much smaller, a little higher, dimmer
    s.style.transform = `translate3d(${(-Math.sign(d) * (e * 36 + f * 26)).toFixed(2)}%,${(-e * 5).toFixed(2)}%,0) scale(${(1 - .6 * e - .1 * f).toFixed(4)})`;
    s.style.opacity = (1 - .5 * e - .4 * f).toFixed(3);
    const z = String(10 - Math.round(a * 4)); if (s.style.zIndex !== z) s.style.zIndex = z;
  }
}
function wsWheelMid(tr) { const mid = tr.scrollLeft + tr.clientWidth / 2; let best = null, bd = 1e9;
  for (const s of tr.querySelectorAll(".ws-slide")) { const d = Math.abs(s.offsetLeft + s.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = s } } return best }
function wsAfter() {
  wsbAfter();
  const tr = document.getElementById("wsTrack"); if (!tr) return;
  const wk = ymd(mondayOf(sel)), on = tr.querySelector(".ws-slide.on");
  const pos = el => el.offsetLeft - (tr.clientWidth - el.offsetWidth) / 2;
  tr.scrollLeft = wsScroll && wsScroll.wk === wk ? wsScroll.left : (on ? pos(on) : 0);
  wsWheelPaint(tr);
  if (on && Math.abs(tr.scrollLeft - pos(on)) > 4) tr.scrollTo({ left: pos(on), behavior: "smooth" });
  if (on && on.dataset.wsign) setTimeout(() => { if (on.isConnected && on.dataset.wsign) wsIgnite(on) }, wsIgn && wsIgn.k === on.dataset.wsday ? 0 : 450);
  let t = 0;
  // the day only changes once the finger is off the glass and the wheel has come to rest
  let raf = 0, held = false, last = -1;
  const settle = () => {
    if (held || !tr.isConnected) return;
    if (Math.abs(tr.scrollLeft - last) > .5) { last = tr.scrollLeft; t = setTimeout(settle, 90); return }   // still gliding into its slot
    const s = wsWheelMid(tr);
    if (s && s.dataset.wsday !== ymd(sel)) { sel = parseYmd(s.dataset.wsday); wsScroll = { wk, left: tr.scrollLeft }; lastRenderKey = ""; render() }
  };
  const arm = ms => { clearTimeout(t); last = tr.scrollLeft; t = setTimeout(settle, ms) };
  tr.addEventListener("touchstart", () => { held = true; clearTimeout(t) }, { passive: true });
  const up = () => { held = false; arm(160) };
  tr.addEventListener("touchend", up, { passive: true }); tr.addEventListener("touchcancel", up, { passive: true });
  tr.addEventListener("scroll", () => {
    wsScroll = { wk, left: tr.scrollLeft };
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; wsWheelPaint(tr) });
    if (!held) arm(140);
  }, { passive: true });
  if ("onscrollend" in tr) tr.addEventListener("scrollend", () => { if (!held) { clearTimeout(t); last = tr.scrollLeft; settle() } });
}
document.addEventListener("click", e => {
  const g = e.target.closest("[data-wsgo]"); if (!g) return;
  const d = parseYmd(g.dataset.wsgo); if (!inProgram(d) && d < START) return;
  const tr = document.getElementById("wsTrack");
  if (tr) { const s = tr.querySelector(`[data-wsday="${g.dataset.wsgo}"]`); if (s) { tr.scrollTo({ left: s.offsetLeft - (tr.clientWidth - s.offsetWidth) / 2, behavior: "smooth" }); return } }
  sel = d; wsScroll = null; lastRenderKey = ""; render();
});
document.addEventListener("click", e => {
  const b = e.target.closest("[data-wslog]"); if (!b) return;
  wsLog = b.dataset.wslog === "1"; wsPop = null; lastRenderKey = ""; render(); window.scrollTo(0, 0);
});

// Lit islands: a workout day stays grey until it is logged. The first time a logged day is shown,
// it lights up (Ignite): lights climb the island, the beacon flares, colour spreads out from the top.
// Rest days and days outside the plan are always lit. Days already seen lit are kept on this device.
const WS_LITE = {"row1":[59.5,29.9,60.2],"row2":[34.3,26.6,60.2],"row3":[75.6,25.4,59],"row4":[74.9,34.1,60.2],"camp1":[46.9,55.6,69.0],"fart1":[48.5,10.3,73.5],"hill1":[50.0,29.2,71.0],"hill2":[49.9,31.9,70.8],"int1":[50.5,44,69.5],"lab1":[49.9,38.8,70.9],"lab2":[49.9,34.6,74.2],"lab3":[50.1,40.1,72.4],"race1":[50.0,10.8,69.8],"rec1":[50,30,69.9],"road1":[48.8,19.5,77.2],"road3":[55.5,24.9,75.8],"tempo1":[49.7,41.5,64.5],"tw1":[49.9,11.9,71.2],"tw2":[49.9,14.2,69.3],"tw3":[50.0,8.4,66.1],"tw4":[49.9,19.7,71.5],"tw5":[49.9,17.5,68.2],"tw6":[49.9,11.3,68.6]};  // beacon x, beacon y, island rim y (% of the image)
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
  const z = s.querySelector(".ws-zoom") || s, W = z.clientWidth, H = z.clientHeight, ar = 780 / 880; let w = W, h = W / ar; if (h > H) { h = H; w = H * ar }
  const box = document.createElement("div"); box.className = "ws-ign"; box.setAttribute("aria-hidden", "true");
  box.style.cssText = `left:${(W - w) / 2}px;top:${(H - h) / 2}px;width:${w}px;height:${h}px`;
  box.innerHTML = `<img class="c" src="/world/${key}.webp" alt=""><img class="lt" src="/world/lights/${key}.webp" alt=""><i class="bm" style="left:${m[0]}%;height:${m[1]}%;bottom:${100 - m[1]}%"></i><i class="rg" style="top:${m[2]}%"></i><i class="rg" style="top:${m[2]}%"></i><canvas></canvas>`;
  z.appendChild(box);
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
.ws-head{display:flex;justify-content:space-between;align-items:center;color:#F5F1E6;--wc:var(--rk-mid)}
.ws-head.ws-rest{--wc:#C9D4DE}
.ws-eye{white-space:nowrap;font:800 10px/1 var(--display);letter-spacing:.32em;color:var(--wc)}
.ws-h1{font:900 30px/1.1 var(--display);margin:4px 0 0;color:#F5F1E6}
.ws-chips{display:flex;gap:6px}
.ws-chips button{padding:7px 11px;border-radius:10px;border:1px solid rgba(245,241,230,.1);background:none;font:800 11px/1 var(--display);letter-spacing:.14em;color:#97A1B8;cursor:pointer}
.ws-chips button.on{background:color-mix(in srgb,var(--rk) 20%,transparent);border-color:var(--rk-mid);color:var(--rk-core)}
.ws{--wc:var(--rk-mid);--wd:color-mix(in srgb,var(--rk) 75%,transparent);--wg:color-mix(in srgb,var(--rk) 35%,transparent);--wt1:var(--rk-core);--wt2:var(--rk-mid);--wt3:var(--rk-dd);--wb1:var(--rk);--wb2:var(--rk-d);--wbi:var(--rk-ink);color:#F5F1E6;margin:0 -14px}
.ws.ws-rest{--wc:#8FA3B8;--wd:rgba(143,163,184,.7);--wg:rgba(143,163,184,.25);--wt1:#E6ECF2;--wt2:#A9B6C4;--wt3:#5E6B78;--wb1:#5E6B78;--wb2:#3A4450;--wbi:#F5F1E6}
/* Open sky: no frame, the page doesn't scroll, the island grows to fill what the card leaves */
html:has(body.ws-page #view>.ws){height:100%;overflow:hidden;overscroll-behavior:none}
body.ws-page:has(#view>.ws) .wrap{height:100vh;height:100dvh;box-sizing:border-box;padding-bottom:0;display:flex;flex-direction:column}
body.ws-page #view:has(>.ws){flex:1;min-height:0;display:flex;flex-direction:column;gap:0;padding-bottom:calc(80px + env(safe-area-inset-bottom,0px))}
@media (max-height:600px){body.ws-page #view:has(>.ws){overflow-y:auto;scrollbar-width:none}}
body.ws-page #view:has(>.ws)::-webkit-scrollbar{display:none}
.ws{flex:1;min-height:0;display:flex;flex-direction:column}
.ws-frame{flex:1;min-height:0;display:flex;flex-direction:column;position:relative;margin:0}
.ws-stage{flex:1;min-height:210px;position:relative;overflow:visible;margin-top:-64px}
/* the stage reaches up into the gap under the header so tall towers keep their tips; the island itself stays put */
.ws-stage .ws-zoom{top:64px}
body.ws-page:has(#view>.ws) header.top{z-index:3}
.ws-stage{-webkit-mask-image:linear-gradient(180deg,#000 82%,transparent),linear-gradient(90deg,transparent,#000 7%,#000 93%,transparent);-webkit-mask-composite:source-in;mask-image:linear-gradient(180deg,#000 82%,transparent),linear-gradient(90deg,transparent,#000 7%,#000 93%,transparent);mask-composite:intersect}
.ws-zoom{position:absolute;top:0;bottom:0;left:-31%;right:-31%;transform:scale(1.2);transform-origin:50% 62%;pointer-events:none}
.ws-slide{will-change:transform,opacity;transform-origin:50% 62%;backface-visibility:hidden;contain:layout style}
.ws-daybar{margin:-6px 18px 0;position:relative;z-index:6;flex-shrink:0}
.ws-card{flex-shrink:0}
.ws-card .ws-sub{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ws-track{position:absolute;inset:0;z-index:2;display:flex;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.ws-track::before,.ws-track::after{content:"";flex:0 0 19%}
.ws-zoom .ws-ign{pointer-events:auto}
.ws-track::-webkit-scrollbar{display:none}
.ws-slide{flex:0 0 62%;scroll-snap-align:center;scroll-snap-stop:always;position:relative}
.ws-slide img{display:block;width:100%;height:100%;object-fit:contain;user-select:none;-webkit-user-drag:none;pointer-events:none}
.ws-slide.ws-dark .ws-zoom>img{filter:grayscale(1) brightness(.42) contrast(1.08)}
.ws-ign{position:absolute;pointer-events:none;transition:opacity .7s}
.ws-ign img,.ws-ign canvas{position:absolute;inset:0;width:100%;height:100%}
.ws-ign img.c{visibility:hidden;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}
.ws-ign img.lt{opacity:0;mix-blend-mode:screen;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}
.ws-ign .bm{position:absolute;width:22px;margin-left:-11px;opacity:0;background:linear-gradient(0deg,rgba(222,241,233,.9),color-mix(in srgb,var(--rk-mid) 35%,transparent) 40%,transparent);filter:blur(3px);transform-origin:bottom}
.ws-ign .rg{position:absolute;left:50%;width:84%;aspect-ratio:3.2/1;border-radius:50%;border:2px solid var(--rk-core);box-shadow:0 0 18px var(--rk),inset 0 0 14px var(--rk);opacity:0;transform:translate(-50%,-50%) scale(.2)}
.ws-clouds{position:absolute;left:-10%;right:-10%;bottom:-4%;height:34%;z-index:3;pointer-events:none;background:radial-gradient(40% 32% at 20% 70%,rgba(159,179,184,.16),transparent 70%),radial-gradient(45% 30% at 78% 74%,rgba(159,179,184,.14),transparent 70%),radial-gradient(60% 34% at 50% 92%,rgba(120,140,145,.18),transparent 70%);filter:blur(6px);animation:wsCloud 18s ease-in-out infinite alternate}
@keyframes wsCloud{from{transform:translateX(-12px)}to{transform:translateX(12px)}}
.ws-daybar{display:flex;align-items:center;justify-content:space-between;font:800 10.5px/1 var(--display);letter-spacing:.16em}
.ws-daybar button{all:unset;cursor:pointer;padding:6px 0;color:#77736A;font:inherit;letter-spacing:inherit;cursor:pointer}
.ws-daybar span{padding:7px 14px;border:1px solid var(--wc);border-radius:3px;color:#F5F1E6;background:rgba(0,0,0,.4);clip-path:polygon(8px 0,calc(100% - 8px) 0,100% 50%,calc(100% - 8px) 100%,8px 100%,0 50%)}
.ws-card{position:relative;margin:10px 14px 0;padding:12px 14px;border-radius:4px;background:linear-gradient(180deg,rgba(10,14,13,.95),rgba(6,8,8,.95));border:1px solid var(--wc);box-shadow:0 0 0 1px rgba(0,0,0,.6),0 0 28px -10px var(--wc)}
.ws-line{display:flex;align-items:center;gap:8px;font:800 10px/1 var(--display);letter-spacing:.26em;color:var(--wc)}
.ws-bang{padding:4px 6px;border:1px solid var(--wc)}
.ws-title{font:900 28px/1 var(--display);margin-top:8px;letter-spacing:.02em;background:linear-gradient(180deg,var(--wt1),var(--wt2) 50%,var(--wt3));-webkit-background-clip:text;background-clip:text;color:transparent}
.ws-sub{font-size:12.5px;line-height:1.45;color:#CFC9BA;margin-top:5px}.ws-sub b{color:#F5F1E6}
.ws-stats{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}
.ws-stats span{padding:6px 9px;border-radius:3px;background:rgba(0,0,0,.35);border:1px solid var(--wd);font:800 11px/1 var(--display);letter-spacing:.1em;color:var(--wt1)}
.ws.ws-gym .ws-stats span{border-color:color-mix(in srgb,var(--rk) 45%,transparent);color:var(--rk-core)}.ws.ws-run .ws-stats span{border-color:color-mix(in srgb,var(--rk) 45%,transparent);color:var(--mt-l)}
.ws-stats span.boss{border-color:rgba(60,123,244,.55);color:#9DBDFA}
.ws-go{display:grid;place-items:center;width:100%;height:46px;margin-top:10px;border:0;border-radius:4px;cursor:pointer;clip-path:polygon(14px 0,calc(100% - 14px) 0,100% 50%,calc(100% - 14px) 100%,14px 100%,0 50%);background:linear-gradient(180deg,var(--wb1),var(--wb2));box-shadow:inset 0 1px 0 rgba(255,255,255,.3);font:800 16px/1 var(--display);letter-spacing:.22em;color:var(--wbi)}
.ws-go:disabled{background:rgba(255,255,255,.06);color:#97A1B8;cursor:default}
.ws-menu{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:6px;margin-top:8px;font:700 12px/1 var(--display);letter-spacing:.08em;color:#97A1B8}
.ws-menu button{all:unset;cursor:pointer;padding:4px 2px;color:#97A1B8;font:inherit;letter-spacing:inherit;cursor:pointer}
.ws-menu .dot{opacity:.6}
.ws-back{margin-bottom:10px}
body.ws-page .seg{background:rgba(8,12,12,.72);border:1px solid color-mix(in srgb,var(--rk-mid) 20%,transparent);box-shadow:none}
body.ws-page .seg button{color:#97A1B8}
body.ws-page .seg button.on{background:linear-gradient(180deg,color-mix(in srgb,var(--rk) 40%,transparent),color-mix(in srgb,var(--rk) 16%,transparent));color:var(--rk-core);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--rk-mid) 50%,transparent)}`;
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
const WSB_HOLDS = ["plank", "sideplank", "deadhang", "wallsit", "hollow", "farmerhold", "lsit"];
// Rep range in one box: tap the low or high number to pick it, then − / + change only that end
const WSB_END = {};
function wsbRange(lab, id, re) { const end = WSB_END[id] || "lo", hi = re.hi || re.lo;
  const n = (k, v) => `<i role="button" tabindex="0" data-wsbend="${esc(id)}|${k}" class="${end === k ? "on" : ""}" aria-pressed="${end === k}" aria-label="${k === "lo" ? "Low" : "High"} end, ${v}">${v}</i>`;
  return `<div class="wsb-st wsb-rg"><span>${lab}</span><div><button type="button" data-wsbstep="${esc(id)}|${end}|-1" aria-label="Lower the ${end === "lo" ? "low" : "high"} end">−</button><b>${n("lo", re.lo)}–${n("hi", hi)}</b><button type="button" data-wsbstep="${esc(id)}|${end}|1" aria-label="Raise the ${end === "lo" ? "low" : "high"} end">+</button></div></div>` }
function wsbStep(lab, attr, val) { return `<div class="wsb-st"><span>${lab}</span><div><button type="button" data-wsbstep="${attr}|-1" aria-label="Less ${lab.toLowerCase()}">−</button><b>${val}</b><button type="button" data-wsbstep="${attr}|1" aria-label="More ${lab.toLowerCase()}">+</button></div></div>` }
const WSB_HIST_ICON = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 13.5h12"/><path d="M3.5 10.5l3-3 2.5 2 4-5"/><path d="M10.5 4.5H13V7"/></svg>';
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
      let h = `<button type="button" class="wsb-row${open ? " open" : ""}" data-wsbrow="${esc(key)}" aria-expanded="${open}">${wsbDia(b ? "#6EA8FF" : RKT.mm, b)}<span class="wsb-rt"><span class="wsb-l1"><b>${esc(e.name)}</b><em>${e.sets} × ${rr}<i class="wsb-chev">▾</i></em></span>
        <span class="wsb-l2"><span>${esc(e.equip || "")}${e.equip ? " · " : ""}rest ${fmtClock(rest * 1000)}</span>${last ? `<span>last ${esc(last)}</span>` : ""}</span>${b && !open ? `<span class="wsb-boss">♛ GATE BOSS</span>` : ""}${e.once ? `<span class="wsb-swd">⇄ SWAPPED · TODAY ONLY</span>` : ""}</span></button>`;
      const hb = `<button type="button" class="wsb-sw" data-exhist="${esc(e.id)}" aria-label="${esc(e.name)} history">${WSB_HIST_ICON}<span>HISTORY</span></button>`;
      h = `<div class="wsb-hrow">${h}${hb}${!log && !e.fixed && !e.travel ? `<button type="button" class="wsb-sw" data-swap="${esc(e.id)}" aria-label="Swap ${esc(e.name)}">${typeof SWAP_ICON !== "undefined" ? SWAP_ICON : "⇄"}<span>SWAP</span></button>` : ""}</div>`;
      if (open) {
        let pan = "";
        if (log) {
          const cur = log.ex && log.ex[e.id];
          pan = cur && cur.length ? `<div class="wsb-done">${cur.map((s, j) => `<span><i>${s.t ? String(s.t).toUpperCase() : j + 1}</i>${esc(setTxt(fmtOf(e), s, logDb(e.id, log)))}</span>`).join("")}</div>` : `<p class="wsb-note">Not logged in this session.</p>`;
          pan += `<div class="wsb-acts"><button type="button" data-wslog="1">VIEW THE FULL LOG</button></div>`;
        } else {
          const re = R && R.ex.find(x => x.id === e.id);
          const tmd = typeof htCfg === "function" && FMT[fmtOf(e)] && FMT[fmtOf(e)].b === "sec";
          if (re && tmd) { const c = htCfg(e.id); pan += `<div class="wsb-steps">${wsbStep("SETS", `${e.id}|sets`, re.sets)}${wsbRange("HOLD (SEC)", e.id, re)}${wsbStep("REST", `${e.id}|rest`, fmtClock((re.rest || rest) * 1000))}</div>
            <div class="wsb-tm">${wsbStep("SET-UP", `${e.id}|setup`, `${c.setup} s`)}<div class="wsb-tmw"><span>TIMER MODE</span><div class="wsb-seg" role="group" aria-label="Timer mode"><button type="button" data-wsbtm="${esc(e.id)}|timer" class="${c.mode === "timer" ? "on" : ""}" aria-pressed="${c.mode === "timer"}">⏱ TIMER</button><button type="button" data-wsbtm="${esc(e.id)}|watch" class="${c.mode === "watch" ? "on" : ""}" aria-pressed="${c.mode === "watch"}">◷ STOPWATCH</button></div></div></div>
            <p class="wsb-tmn">Timer counts the hold down from the target; Stopwatch counts up until you stop. Set-up gives you time to get into position first.</p>` }
          else if (re) pan += `<div class="wsb-steps">${wsbStep("SETS", `${e.id}|sets`, re.sets)}${wsbRange(isSec(e) ? "SECONDS" : "REPS", e.id, re)}${wsbStep("REST", `${e.id}|rest`, fmtClock((re.rest || rest) * 1000))}</div>`;
          try { pan += exerciseBlock(e, k, null) } catch (err) { pan += `<p class="wsb-note">This exercise can't be shown here.</p>` }
        }
        h += `<div class="wsb-pan${wsPop.fresh === key ? " new" : ""}">${pan}</div>`;
      }
      return `<div class="wsb-item">${h}</div>`;
    });
    if (R && !log && typeof libEx === "function") {
      const have = new Set(ex.map(e => e.id)), opts = WSB_HOLDS.filter(id => !have.has(id) && libEx(id));
      if (opts.length) rows.push(`<div class="wsb-add"><div><b>+ ADD A TIMED HOLD</b><span>TIMER SET UP FOR YOU</span></div><div class="wsb-addc">${opts.map(id => `<button type="button" data-wsbhold="${id}">${esc(libEx(id).name)}</button>`).join("")}</div></div>`);
    }
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
      let h = `<button type="button" class="wsb-row${open ? " open" : ""}" data-wsbrow="${key}" aria-expanded="${open}">${wsbDia(RKT.mm)}<span class="wsb-rt"><span class="wsb-l1"><b>${esc(name)}</b><em>${esc(a)}<i class="wsb-chev">▾</i></em></span><span class="wsb-l2"><span>${esc(s.charAt(0).toUpperCase() + s.slice(1))}</span></span></span></button>`;
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
        h += `<div class="wsb-pan${wsPop.fresh === key ? " new" : ""}">${pan}</div>`;
      }
      return `<div class="wsb-item">${h}</div>`;
    });
    if (p.hint) rows.push(`<p class="wsb-hint">${esc(p.hint)}</p>`);
  }
  const n = rows.filter(x => x.startsWith('<div class="wsb-item')).length;
  const anim = wsPop.anim ? " anim" : "";
  return `<div class="wsb${anim}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><button type="button" class="wsb-bg" data-wsbx="1" aria-label="Close"></button>
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
  const W = document.querySelector("#view .wsb"), old = document.querySelector("body > .wsb");
  // keep the blurred backdrop from the last draw so swapping in the new popup doesn't flash on phones
  if (W && old) { const ob = old.querySelector(".wsb-bg"), nb = W.querySelector(".wsb-bg"); if (ob && nb) nb.replaceWith(ob) }
  document.querySelectorAll("body > .wsb").forEach(x => x.remove());
  if (W) { document.body.appendChild(W);
    W.addEventListener("input", e => { const el = e.target; if (!el.id || el.type === "checkbox" || el.type === "file" || NO_DRAFT.has(el.id)) return; drafts[draftKey(el.id)] = el.value; persistDrafts() }) }
  if (wsRun) wsRun.anim = false;
  const L = document.getElementById("wsbList"); if (!L || !wsPop) return;
  L.scrollTop = wsPop.top || 0;
  if (wsPop.reveal != null) { const rb = L.querySelector(`[data-wsbrow="${CSS.escape(wsPop.reveal)}"]`), it = rb && rb.parentElement; wsPop.reveal = null;
    if (it) { const lo = it.offsetTop - 6, hi = it.offsetTop + it.offsetHeight - L.clientHeight + 6; if (L.scrollTop > lo) L.scrollTop = lo; else if (L.scrollTop < hi) L.scrollTop = Math.min(lo, hi) } }
  wsPop.top = L.scrollTop; wsPop.anim = false; wsPop.fresh = null; wsbPaintBar();
  L.addEventListener("scroll", () => { if (wsPop) wsPop.top = L.scrollTop; wsbPaintBar() }, { passive: true });
}
function wsbClose() { if (typeof exScopeReset === "function") exScopeReset(); wsPop = null; document.querySelectorAll("body > .wsb").forEach(x => x.remove()); if (typeof closeStMenu === "function") closeStMenu(); lastRenderKey = ""; render() }
document.addEventListener("click", e => {
  if (!WS_ON || tab !== "home" || wsLog) return;
  const t = e.target;
  if (t.closest("[data-wsbx]")) { wsbClose(); return }
  const row = t.closest("[data-wsbrow]");
  if (row) { const i = row.dataset.wsbrow; wsPop.open = wsPop.open === i ? null : i; wsPop.reveal = wsPop.open; wsPop.fresh = wsPop.open; lastRenderKey = ""; render(); return }
  const tmb = t.closest("[data-wsbtm]");
  if (tmb) { const [id, m] = tmb.dataset.wsbtm.split("|"); htCfgSet(id, { mode: m }); return }
  const hb = t.closest("[data-wsbhold]");
  if (hb) { const id = hb.dataset.wsbhold, L = libEx(id), p = planFor(sel), tw = L && L.type === "tw";
    suMut(su => { const r = wsbRoutine(su, p); if (r && !r.ex.some(e => e.id === id)) r.ex.push({ id, sets: 3, lo: tw ? 20 : 30, hi: tw ? 30 : 60, rest: 60 }) });
    wsPop.open = id; wsPop.fresh = id; toast(`${L ? L.name : "Hold"} added, with a timer`); return }
  const en = t.closest("[data-wsbend]");
  if (en) { const [id, k] = en.dataset.wsbend.split("|"); WSB_END[id] = k; const box = en.closest(".wsb-rg");
    box.querySelectorAll("[data-wsbend]").forEach(x => { const on = x === en; x.classList.toggle("on", on); x.setAttribute("aria-pressed", on) });
    box.querySelectorAll("[data-wsbstep]").forEach(x => { const d = x.dataset.wsbstep.split("|"); x.dataset.wsbstep = `${d[0]}|${k}|${d[2]}`; x.setAttribute("aria-label", `${+d[2] < 0 ? "Lower" : "Raise"} the ${k === "lo" ? "low" : "high"} end`) }); return }
  const st = t.closest("[data-wsbstep]");
  if (st && st.dataset.wsbstep.split("|")[1] === "setup") { const [id, , dir] = st.dataset.wsbstep.split("|"), c = htCfg(id), j = Math.max(0, HT_SETUPS.indexOf(c.setup));
    htCfgSet(id, { setup: HT_SETUPS[Math.max(0, Math.min(HT_SETUPS.length - 1, j + (+dir)))] }); return }
  if (st) { const [id, f, dir] = st.dataset.wsbstep.split("|"), s = +dir, p = planFor(sel);
    const r0 = wsbRoutine(CUSTOM && CUSTOM.su, p); if (r0 && f !== "rest" && typeof exScopeEdit === "function") return exScopeEdit(r0.id, id, f === "sets" ? ["sets"] : ["lo", "hi"], x => {
      const st_ = isSec(x) ? 5 : 1;
      if (f === "sets") x.sets = Math.max(1, Math.min(10, (x.sets || 3) + s));
      else if (f === "reps") { const w = Math.max(0, (x.hi || x.lo) - x.lo); x.lo = Math.max(1, x.lo + s * st_); x.hi = x.lo + w }
      else if (f === "lo") { const hi = x.hi || x.lo; x.lo = Math.max(1, x.lo + s * st_); x.hi = hi < x.lo ? x.lo : hi }
      else if (f === "hi") { x.hi = Math.max(1, (x.hi || x.lo) + s * st_); if (x.lo > x.hi) x.lo = x.hi } });
    suMut(su => { const r = wsbRoutine(su, p), x = r && r.ex.find(e => e.id === id); if (!x) return;
      if (f === "sets") x.sets = Math.max(1, Math.min(10, (x.sets || 3) + s));
      else if (f === "reps") { const w = Math.max(0, (x.hi || x.lo) - x.lo), st_ = isSec(x) ? 5 : 1; x.lo = Math.max(1, x.lo + s * st_); x.hi = x.lo + w }
      // min and max each move on their own, like the plan editor; the other end follows only when they would cross
      else if (f === "lo" || f === "hi") { const st_ = isSec(x) ? 5 : 1, hi = x.hi || x.lo;
        if (f === "lo") { x.lo = Math.max(1, x.lo + s * st_); if (hi < x.lo) x.hi = x.lo; else x.hi = hi }
        else { x.hi = Math.max(1, hi + s * st_); if (x.lo > x.hi) x.lo = x.hi } }
      else if (f === "rest") { const cur = Number(x.rest) || (typeof restFor === "function" ? restFor(id) : 90), i = WSB_REST.findIndex(v => v >= cur); x.rest = WSB_REST[Math.max(0, Math.min(WSB_REST.length - 1, (i < 0 ? WSB_REST.length - 1 : i) + s))] } });
    return }
  const sl = t.closest(".ws-slide");
  if (sl && !t.closest(".ws-ign") && sl.dataset.wsday !== ymd(sel)) { const tr = document.getElementById("wsTrack"); if (tr) tr.scrollTo({ left: sl.offsetLeft - (tr.clientWidth - sl.offsetWidth) / 2, behavior: "smooth" }); return }
  if (sl && !t.closest(".ws-ign")) { const k = sl.dataset.wsday, p = inProgram(parseYmd(k)) ? planFor(parseYmd(k)) : null;
    if (!p || p.type === "rest" || (p.type === "gym" && !(p.ex || []).length)) return;
    if (k !== ymd(sel)) return;
    if (p.type === "row") { if (S.logs[k] && S.logs[k].type === "row") wsnOpen(k); return }
    const lg = S.logs[k]; if (lg && (lg.type === "gym" || lg.type === "run") && lg.type === p.type) { wsnOpen(k); return }
    wsPop = { k, open: null, top: 0, anim: true }; lastRenderKey = ""; render() }
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && wsPop && !document.querySelector(".st-menu")) wsbClose() });
{ const st = document.createElement("style"); st.id = "wsbCss"; st.textContent = `body:has(.wsb){overflow:hidden}
.wsb.anim{animation:wsbIn .22s ease-out}.wsb.anim .wsb-card{animation:wsbUp .26s cubic-bezier(.2,.9,.3,1)}
.wsb{position:fixed;inset:0;z-index:880;display:flex;flex-direction:column;padding:calc(env(safe-area-inset-top,0px) + 72px) max(16px,env(safe-area-inset-left,0px)) calc(env(safe-area-inset-bottom,0px) + 18px) max(16px,env(safe-area-inset-right,0px));--m0:var(--mt-d);--m1:var(--mt-m);--m2:var(--mt-l);--mid:var(--rk-mid);--core:var(--rk-core);--mut:#8F97A6;--boss:#6EA8FF}
@keyframes wsbIn{from{opacity:0}to{opacity:1}}
.wsb-bg{all:unset;position:absolute;inset:0;background:rgba(2,4,8,.8);-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);cursor:default}
.wsb-card{position:relative;flex:1;min-height:0;max-width:480px;width:100%;margin:0 auto;border-radius:22px;padding:3px;background:linear-gradient(90deg,var(--m0),var(--m1) 40%,var(--m2) 60%,var(--m0));box-shadow:0 30px 60px #000}
@keyframes wsbUp{from{transform:translateY(18px) scale(.98)}to{transform:none}}
.wsb-in{height:100%;box-sizing:border-box;border-radius:19px;padding:18px 18px 12px;display:flex;flex-direction:column;color:#F5F1E6;font-family:Barlow,system-ui,sans-serif;background:radial-gradient(70% 60% at 90% 0%,color-mix(in srgb,var(--rk) 18%,transparent),transparent 65%),repeating-linear-gradient(135deg,color-mix(in srgb,var(--rk) 3%,transparent) 0 1px,transparent 1px 7px),#0A0A0D}
.wsb-top{flex-shrink:0}
.wsb-eb{display:flex;justify-content:space-between;align-items:center;font:800 10px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.3em;color:var(--m2)}
.wsb-x{all:unset;cursor:pointer;width:30px;height:30px;border-radius:50%;border:1px solid color-mix(in srgb,var(--mt-l) 35%,transparent);display:grid;place-items:center;color:var(--m2);font-size:13px;letter-spacing:0}
.wsb-title{margin-top:8px;font:900 30px/1.05 "Barlow Semi Condensed",sans-serif;background:linear-gradient(180deg,var(--core),var(--mid) 55%,var(--rk-dd));-webkit-background-clip:text;background-clip:text;color:transparent;text-wrap:balance}
.wsb-plain{font-size:13px;color:#B9BFCA;margin:4px 0 14px}
.wsb-boxes{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.wsb-boxes div{padding:10px 6px;text-align:center;border-radius:10px;background:linear-gradient(180deg,#1A140E,#0D0A07);border:1px solid var(--m0);min-width:0}
.wsb-boxes b{display:block;font:900 18px/1 "Barlow Semi Condensed",sans-serif;color:var(--m2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wsb-boxes span{display:block;font:700 9px/1.2 "Barlow Semi Condensed",sans-serif;letter-spacing:.14em;color:var(--mt-t);margin-top:5px;text-transform:uppercase}
.wsb-obj{display:flex;justify-content:space-between;align-items:center;margin-top:16px;padding-bottom:6px;border-bottom:1px solid color-mix(in srgb,var(--mt-m) 45%,transparent);font:800 9.5px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.3em;color:var(--mid)}
.wsb-obj span+span{color:#6E6960;letter-spacing:.2em}
.wsb-lw{position:relative;flex:1;min-height:0}
.wsb-list{height:100%;overflow-y:auto;overscroll-behavior:contain;padding-right:12px;scrollbar-width:none;-webkit-mask-image:linear-gradient(180deg,transparent,#000 18px,#000 calc(100% - 30px),transparent);mask-image:linear-gradient(180deg,transparent,#000 18px,#000 calc(100% - 30px),transparent)}
.wsb-list::-webkit-scrollbar{display:none}
.wsb-tm{display:grid;grid-template-columns:1fr 1.5fr;gap:8px;margin-top:10px}
.wsb-tmw{min-width:0;display:flex;flex-direction:column}.wsb-tmw>span{display:block;margin-bottom:6px;font:800 9px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.2em;color:var(--mt-t)}.wsb-tmw .wsb-seg{flex:1}.wsb-seg{display:flex;height:100%;min-height:38px;border:1px solid color-mix(in srgb,var(--mt-m) 55%,transparent);border-radius:10px;overflow:hidden}
.wsb-seg button{flex:1;border:0;background:none;color:#8F97A6;font:800 9.5px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.06em;white-space:nowrap;cursor:pointer}
.wsb-seg button.on{background:color-mix(in srgb,var(--rk) 22%,transparent);color:var(--rk-core)}
.wsb-tmn{margin:8px 0 0;font:600 11.5px/1.35 Barlow,sans-serif;color:#8F97A6}
.wsb-add{margin:12px 0 4px;border-radius:12px;border:1px dashed color-mix(in srgb,var(--mt-l) 50%,transparent);padding:12px}
.wsb-add>div:first-child{display:flex;justify-content:space-between;align-items:center;gap:8px}
.wsb-add b{font:800 11px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.2em;color:var(--mt-l)}.wsb-add span{font:700 9.5px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.12em;color:#8F97A6}
.wsb-addc{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.wsb-addc button{padding:8px 11px;border-radius:999px;border:1px solid rgba(245,241,230,.18);background:none;color:#E6E2D8;font:700 12px/1 Barlow,sans-serif;cursor:pointer}
.wsb-addc button:focus-visible,.wsb-seg button:focus-visible{outline:2px solid var(--mt-l);outline-offset:2px}

.wsb-list.at-top{-webkit-mask-image:linear-gradient(180deg,#000,#000 calc(100% - 30px),transparent);mask-image:linear-gradient(180deg,#000,#000 calc(100% - 30px),transparent)}
.wsb-list.at-end{-webkit-mask-image:linear-gradient(180deg,transparent,#000 18px);mask-image:linear-gradient(180deg,transparent,#000 18px)}
.wsb-list.at-top.at-end{-webkit-mask-image:none;mask-image:none}
.wsb-bar{position:absolute;right:0;top:6px;bottom:6px;width:3px;border-radius:2px;background:color-mix(in srgb,var(--mt-m) 12%,transparent);pointer-events:none;transition:opacity .2s}
.wsb-bar i{position:absolute;left:0;right:0;border-radius:2px;background:linear-gradient(180deg,var(--m2),var(--m1))}
.wsb-item{border-bottom:1px solid color-mix(in srgb,var(--mt-m) 18%,transparent)}
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
.wsb-pan{margin:0 0 12px 24px;padding:12px;border-radius:12px;background:linear-gradient(180deg,#121014,#0B0B0E);border:1px solid color-mix(in srgb,var(--mt-m) 40%,transparent)}.wsb-pan.new{animation:wsbIn .18s ease-out}
.wsb-steps{display:flex;gap:8px;margin-bottom:12px}.wsb-rg b{display:flex;justify-content:center;align-items:center;gap:1px;color:var(--mut)}.wsb-rg i{font-style:normal;cursor:pointer;padding:5px 3px;border-radius:5px;color:#F5F1E6;opacity:.55;-webkit-tap-highlight-color:transparent}.wsb-rg i.on{opacity:1;color:var(--core);box-shadow:inset 0 -2px 0 var(--mid)}.wsb-rg i:focus-visible{outline:2px solid var(--m2)}
.wsb-st{flex:1;min-width:0}
.wsb-st>span{display:block;font:800 8.5px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.18em;color:var(--mt-t);margin-bottom:5px}
.wsb-st>div{display:flex;align-items:center;height:34px;border-radius:9px;border:1px solid color-mix(in srgb,var(--mt-m) 35%,transparent);background:#0B0B0E}
.wsb-st button{all:unset;cursor:pointer;width:26px;height:100%;text-align:center;color:var(--m2);font:700 16px/34px "Barlow Semi Condensed",sans-serif}
.wsb-st b{flex:1;text-align:center;font:800 14px/1 "Barlow Semi Condensed",sans-serif;white-space:nowrap}
.wsb-note{margin:4px 0 0;font-size:12px;color:var(--mut)}
.wsb-hint{margin:14px 0 6px;font-size:12.5px;line-height:1.5;color:#B9BFCA}
.wsb-hint2{position:relative;text-align:center;margin-top:12px;font:700 10px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.22em;color:#6E6960;pointer-events:none}
.wsb-acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.wsb-acts button,.wsb .setbtns .link{all:unset;cursor:pointer;font:800 10.5px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.14em;color:var(--m2);padding:8px 10px;border-radius:8px;border:1px solid color-mix(in srgb,var(--mt-m) 28%,transparent);text-transform:uppercase}
.wsb-done{display:flex;flex-wrap:wrap;gap:6px}
.wsb-done span{display:flex;gap:6px;align-items:center;padding:6px 9px;border-radius:8px;border:1px solid rgba(245,241,230,.12);font:700 12.5px/1 "Barlow Semi Condensed",sans-serif}
.wsb-done i{font-style:normal;color:var(--m1);font-size:10px}
/* the old exercise card, restyled inside the panel */
.wsb .ex{margin:0;padding:0;border:0;background:none;box-shadow:none}
.wsb .exhead{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 10px}
.wsb .exname{all:unset;cursor:pointer;font-size:0;padding:8px 10px;border-radius:8px;border:1px solid color-mix(in srgb,var(--mt-m) 28%,transparent)}
.wsb .exname::after{content:"HISTORY";font:800 10.5px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.14em;color:var(--m2)}
.wsb-hrow{display:flex;align-items:flex-start;gap:6px}.wsb-sw[data-exhist]{width:48px}.wsb-hrow>.wsb-row{flex:1;min-width:0}
.wsb-sw{all:unset;cursor:pointer;flex-shrink:0;margin-top:9px;display:flex;flex-direction:column;align-items:center;gap:3px;width:40px;padding:6px 0 5px;border-radius:9px;border:1px solid color-mix(in srgb,var(--mt-m) 30%,transparent);background:linear-gradient(180deg,#16120D,#0B0907);color:var(--m2)}
.wsb-sw svg{width:15px;height:15px}.wsb-sw span{font:800 8px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.14em}
.wsb-sw:active{transform:scale(.95)}.wsb-sw:focus-visible{outline:2px solid var(--m2);outline-offset:2px}
.wsb-swd{display:block;margin-top:5px;font:800 10px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.16em;color:var(--mid)}
.wsb-pan .exhead .swapb{display:none}
#xsheet.xs-ws{--m0:var(--mt-d);--m1:var(--mt-m);--m2:var(--mt-l);--bg:#0A0A0D;--line:rgba(245,241,230,.08);--ink:#F5F1E6;--muted:#8F97A6;--surface:#121014;--surface-2:#121014}
#xsheet.xs-ws .xs-back{background:rgba(2,4,8,.72)}
#xsheet.xs-ws .xs-panel{background:radial-gradient(70% 40% at 90% 0%,color-mix(in srgb,var(--rk) 16%,transparent),transparent 65%),#0A0A0D;color:#F5F1E6;border-top:2px solid var(--m1);box-shadow:0 -1px 0 var(--m0),0 -20px 50px #000;font-family:Barlow,system-ui,sans-serif}
#xsheet.xs-ws .xs-head{background:#0A0A0D}
#xsheet.xs-ws .xs-head h2{font:900 24px/1.05 "Barlow Semi Condensed",sans-serif;text-transform:uppercase;letter-spacing:.02em;background:linear-gradient(180deg,var(--rk-core),var(--rk-mid) 60%,var(--rk-dd));-webkit-background-clip:text;background-clip:text;color:transparent}
#xsheet.xs-ws .xs-head .btn{all:unset;cursor:pointer;font:800 10.5px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--m2);padding:9px 11px;border-radius:8px;border:1px solid color-mix(in srgb,var(--mt-m) 35%,transparent)}
#xsheet.xs-ws .xs-search{background:#121014;border:1px solid color-mix(in srgb,var(--mt-m) 30%,transparent);color:#F5F1E6}
#xsheet.xs-ws.xs-tall .xs-search[type=search]{box-shadow:0 -10px 0 0 #0A0A0D,0 10px 8px -6px #0A0A0D}
#xsheet.xs-ws .xs-chips button{background:transparent;border:1px solid rgba(245,241,230,.14);color:#8F97A6;font:800 10.5px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.14em;text-transform:uppercase;padding:8px 11px}
#xsheet.xs-ws .xs-chips button.on{background:color-mix(in srgb,var(--rk) 16%,transparent);border-color:var(--rk-mid);color:var(--rk-core)}
#xsheet.xs-ws .xs-item{border-bottom:1px solid rgba(245,241,230,.07);color:#F5F1E6}
#xsheet.xs-ws .xs-item b{font:700 14.5px/1.25 Barlow,sans-serif}
#xsheet.xs-ws .xs-plus{border-radius:8px;border-color:color-mix(in srgb,var(--mt-m) 30%,transparent);color:var(--m2)}
#xsheet.xs-ws .swapfrom{font:800 15px/1.2 "Barlow Semi Condensed",sans-serif;padding:12px;border-radius:12px;background:linear-gradient(180deg,#121014,#0B0B0E);border:1px solid color-mix(in srgb,var(--mt-m) 40%,transparent)}
#xsheet.xs-ws .swapfrom span:first-child{color:#8F97A6;text-decoration:line-through}#xsheet.xs-ws .swapfrom span:last-child{color:var(--rk-core)}#xsheet.xs-ws .swapfrom svg{color:var(--m2)}
#xsheet.xs-ws .swapopt{background:linear-gradient(180deg,#14110D,#0B0907);border:1px solid color-mix(in srgb,var(--mt-m) 35%,transparent);color:#F5F1E6}
#xsheet.xs-ws .swapopt b{font:800 15px/1.2 "Barlow Semi Condensed",sans-serif;letter-spacing:.04em}
#xsheet.xs-ws .swapopt:active{border-color:var(--rk-mid)}
#xsheet.xs-ws .xs-live{padding:10px 12px;border-radius:10px;border:1px solid color-mix(in srgb,var(--rk) 45%,transparent);background:color-mix(in srgb,var(--rk) 10%,transparent);font:600 12.5px/1.4 Barlow,sans-serif;color:var(--rk-core)}
#xsheet.xs-ws .xs-live b{font:800 10px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.2em;display:block;margin-bottom:4px}
.wsb .swapb{width:32px;height:30px;border-radius:8px;border:1px solid color-mix(in srgb,var(--mt-m) 28%,transparent);background:transparent;color:var(--m2)}
.wsb .exmeta{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;font-size:12px;color:var(--mut)}
.wsb .exmeta .muted,.wsb .small.muted{color:var(--mut)}
.wsb .dbt{display:flex;align-items:center;gap:6px;font:800 10px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.12em;color:var(--core);text-transform:uppercase}
.wsb .dbt input{accent-color:var(--rk)}
.wsb .prev{display:flex;flex-wrap:wrap;gap:5px;align-items:center;margin:0 0 10px;font-size:12px;color:var(--mut)}
.wsb .prev .pl{font:800 9px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.16em;color:var(--mt-t);text-transform:uppercase;margin-right:2px}
.wsb .prev .pill{padding:4px 7px;border-radius:6px;border:1px solid rgba(245,241,230,.1);background:transparent;color:#C9CED7;font-size:11.5px}
.wsb .gate-banner{display:flex;gap:8px;align-items:flex-start;padding:8px 10px;border-radius:9px;background:rgba(110,168,255,.08);border:1px solid rgba(110,168,255,.35);font-size:12px;line-height:1.4;color:#C9D8F5;margin:0 0 10px}
.wsb .gate-banner .gb-sys{display:block;font:800 9px/1.4 "Barlow Semi Condensed",sans-serif;letter-spacing:.18em;color:var(--boss)}
.wsb .gate-banner b{color:var(--boss)}
.wsb .cnote,.wsb .target{padding:8px 10px;border-radius:9px;background:color-mix(in srgb,var(--rk) 7%,transparent);border:1px solid color-mix(in srgb,var(--rk) 25%,transparent);font-size:12px;color:#BFD8CC;margin:0 0 10px;line-height:1.4}
.wsb .cnote .ch{display:flex;gap:8px;align-items:center;margin-bottom:3px}
.wsb .cnote .who{font:800 9.5px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.18em;color:var(--mid);text-transform:uppercase}
.wsb .cnote .mode{font:800 9px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.14em;color:var(--rk-ink);background:var(--mid);padding:3px 6px;border-radius:4px;text-transform:uppercase}
.wsb .cnote .tgt{margin-left:auto;font:800 12.5px/1 "Barlow Semi Condensed",sans-serif;color:var(--core)}
.wsb .fmt-chip{all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:5px;padding:6px 9px;border-radius:8px;border:1px solid color-mix(in srgb,var(--mt-m) 35%,transparent);font:800 10px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.12em;color:var(--m2);text-transform:uppercase}.wsb .fmt-chip svg{width:9px;height:6px}
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
.wsb .chk.on{background:var(--rk);border-color:var(--rk);color:var(--rk-ink)}
.wsb .plates{margin-top:8px;font:700 12px/1.3 "Barlow Semi Condensed",sans-serif;letter-spacing:.06em;color:var(--m2)}
.wsb .plates:not(:empty){padding:8px 10px;border-radius:9px;border:1px dashed color-mix(in srgb,var(--mt-m) 35%,transparent)}
.wsb .plates button{all:unset;cursor:pointer}
.wsb .setbtns{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.wsb .dbnote{font-size:11.5px;color:var(--mut);margin-bottom:8px}
.wsb .target.first{color:#BFD8CC}
.wsb .swapped{font-size:11px;color:var(--mut)}
/* run fields */
.wsb .runf{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end;margin-bottom:10px}
.wsb .runf label{display:flex;flex-direction:column;gap:5px;font:800 8.5px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.18em;color:var(--mt-t);text-transform:uppercase;flex:1;min-width:110px}
.wsb .runf label.rk-check{flex-direction:row;align-items:center;font-size:10px;color:var(--core);min-width:0;flex:none}
.wsb .runf select,.wsb .runf input:not([type=checkbox]){height:34px;box-sizing:border-box;border-radius:9px;border:1px solid color-mix(in srgb,var(--mt-m) 35%,transparent);background:#0B0B0E;color:#F5F1E6;font:700 13.5px/1 Barlow,sans-serif;padding:0 8px;letter-spacing:0;text-transform:none}
.wsb .runf .step{display:flex;align-items:center;height:34px;border-radius:9px;border:1px solid color-mix(in srgb,var(--mt-m) 35%,transparent);background:#0B0B0E}
.wsb .runf .step button{all:unset;cursor:pointer;width:28px;text-align:center;color:var(--m2);font:700 16px/34px "Barlow Semi Condensed",sans-serif}
.wsb .runf .step b{flex:1;text-align:center;font:800 14px/1 "Barlow Semi Condensed",sans-serif;color:#F5F1E6;letter-spacing:0;white-space:nowrap}
/* the set-type menu, while the bounty is open */
body:has(.wsb) .st-menu{background:radial-gradient(70% 60% at 90% 0%,color-mix(in srgb,var(--rk) 18%,transparent),transparent 65%),repeating-linear-gradient(135deg,color-mix(in srgb,var(--rk) 3%,transparent) 0 1px,transparent 1px 7px),#0A0A0D;border:2px solid var(--mt-m);border-radius:14px;box-shadow:0 16px 34px #000;padding:6px;color:#F5F1E6}
body:has(.wsb) .st-menu::before{content:"SET TYPE";display:block;padding:6px 8px 8px;border-bottom:1px solid color-mix(in srgb,var(--mt-m) 35%,transparent);font:800 9px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.3em;color:var(--mt-l)}
body:has(.wsb) .st-menu button{color:#F5F1E6;border-radius:0;border-top:1px solid color-mix(in srgb,var(--mt-m) 16%,transparent)}
body:has(.wsb) .st-menu button:first-of-type{border-top:0}
body:has(.wsb) .st-menu button.on{background:linear-gradient(90deg,rgba(224,176,74,.14),transparent);box-shadow:inset 2px 0 0 #E0B04A}
body:has(.wsb) .st-menu .small.muted{color:#8F97A6}
body:has(.wsb) .st-menu .st-del b{color:#E0675A}
body:has(.wsb) .st-menu .st-del .setno{color:#E0675A;background:none;border:0}
@media (prefers-reduced-motion:reduce){.wsb.anim,.wsb.anim .wsb-card,.wsb-pan.new{animation:none}}
`; document.head.appendChild(st) }

/* ---------- Entering a run island: run it live, or upload the run file ----------
   The choice opens from the run card's button. Uploading reads the GPX/TCX, works out which app or watch made it
   (Strava, Garmin, Apple Watch apps, COROS, Polar, Suunto…) and reads it the way that app reports a run, then
   checks it against the plan before saving it to the day. */
let wsRun = null;  // {k, stage: "pick" | "read", st, src, map, err, busy}
const WSR_SRC = [
  [/strava/i, "strava", "Strava"], [/garmin|forerunner|fenix|f[eē]nix|venu|vivoactive|epix|instinct|enduro|edge \d/i, "garmin", "Garmin"],
  [/healthfit/i, "apple", "Apple Watch · HealthFit"], [/rungap/i, "apple", "Apple Watch · RunGap"], [/workoutdoors/i, "apple", "Apple Watch · WorkOutDoors"], [/apple|watchos|health/i, "apple", "Apple Watch"],
  [/coros/i, "coros", "COROS"], [/polar/i, "polar", "Polar"], [/suunto/i, "suunto", "Suunto"], [/nike|nrc/i, "nike", "Nike Run Club"], [/runkeeper|asics/i, "runkeeper", "Runkeeper"],
  [/wahoo/i, "wahoo", "Wahoo"], [/zepp|amazfit|huami/i, "amazfit", "Amazfit"], [/fitbit/i, "fitbit", "Fitbit"]];
// which app or watch wrote the file, and how to read its numbers
function wsrSource(text, fname) {
  const tcx = /<TrainingCenterDatabase/i.test(text.slice(0, 3000));
  const creator = (text.slice(0, 3000).match(/<gpx[^>]*\bcreator="([^"]+)"/i) || [])[1] || (text.match(/<Creator[^>]*>[\s\S]{0,400}?<Name>([^<]+)<\/Name>/i) || [])[1] || (text.match(/<Author[^>]*>[\s\S]{0,400}?<Name>([^<]+)<\/Name>/i) || [])[1] || "";
  let id = "file", name = tcx ? "GPS watch" : "GPS file";
  for (const [re, i, n] of WSR_SRC) if (re.test(creator)) { id = i; name = n; break }
  if (id === "file" && /<(?:\w+:)?TrackPointExtension/i.test(text)) { id = "watch"; name = "GPS watch" }
  const src = { id, name, fmt: tcx ? "TCX" : "GPX", creator: creator.slice(0, 60) };
  // Garmin and other TCX files carry the watch's own lap totals: timer time (pauses left out), distance and calories
  if (tcx) { let s = 0, m = 0, c = 0, n = 0; text.replace(/<Lap\b[\s\S]*?<\/Lap>/gi, lap => { const body = lap.replace(/<Track>[\s\S]*<\/Track>/i, "");
      const ts = Number((body.match(/<TotalTimeSeconds>([\d.]+)</) || [])[1]), dm = Number((body.match(/<DistanceMeters>([\d.]+)</) || [])[1]), ca = Number((body.match(/<Calories>(\d+)</) || [])[1]);
      if (ts > 0) { s += ts; n++ } if (dm > 0) m += dm; if (ca > 0) c += ca; return "" });
    if (n) src.timerMin = +(s / 60).toFixed(2); if (m > 0) src.watchMi = +(m / M_PER_MI).toFixed(2); if (c > 0) src.kcal = c }
  return src;
}
// the route, squeezed into a 300 × 150 box
function wsrRoute(text) {
  const P = []; text.replace(/<trkpt[^>]*?lat="([-\d.]+)"[^>]*?lon="([-\d.]+)"|<trkpt[^>]*?lon="([-\d.]+)"[^>]*?lat="([-\d.]+)"|<LatitudeDegrees>([-\d.]+)<\/LatitudeDegrees>\s*<LongitudeDegrees>([-\d.]+)</g,
    (m, a, b, c, d, e, f) => { const la = +(a || d || e), lo = +(b || c || f); if (isFinite(la) && isFinite(lo)) P.push([la, lo]); return "" });
  if (P.length < 5) return null;
  const step = Math.max(1, Math.floor(P.length / 260)), Q = P.filter((_, i) => i % step === 0);
  const la = Q.map(p => p[0]), lo = Q.map(p => p[1]), mid = (Math.min(...la) + Math.max(...la)) / 2, kx = Math.cos(mid * Math.PI / 180);
  const w = (Math.max(...lo) - Math.min(...lo)) * kx || 1e-6, h = (Math.max(...la) - Math.min(...la)) || 1e-6, s = Math.min(250 / w, 100 / h);
  const ox = 25 + (250 - w * s) / 2, oy = 25 + (100 - h * s) / 2;
  return Q.map(([a, b]) => `${(ox + (b - Math.min(...lo)) * kx * s).toFixed(1)},${(oy + (Math.max(...la) - a) * s).toFixed(1)}`).join(" ");
}
// the numbers the way the source app shows them
function wsrNums(st, src) {
  const watch = src.timerMin > 0 && src.watchMi > 0;
  const mi = watch ? src.watchMi : st.mi, min = watch ? src.timerMin : (st.movingMin || st.elapsedMin);
  const tLab = watch ? "Timer" : src.id === "apple" ? "Workout" : "Moving";
  const dNote = watch ? `distance and timer from your ${src.id === "garmin" ? "Garmin" : "watch"}` : st.src === "gpx" && src.fmt === "TCX" ? "distance from your watch" : `distance measured from GPS${src.id === "strava" ? ", smoothed the way Strava does" : ""}`;
  const tNote = watch ? "pauses left out" : src.id === "strava" ? "moving time, like Strava shows" : src.id === "apple" ? "workout time without pauses" : "moving time, stops left out";
  return { mi, min, tLab, read: `${src.name} ${src.fmt} · ${dNote} · ${tNote}${src.kcal ? ` · ${src.kcal} kcal` : ""}` };
}
function wsrPace(m) { if (!(m > 0)) return "—"; const s = Math.round(m * 60); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` }
function wsrPortal(icon, title, sub, on, attrs, label) {
  const inner = `<span class="wsr-orb"><span>${icon}</span></span><b>${title}</b><span class="wsr-ps">${sub}</span>`;
  return label ? `<label class="wsr-portal${on ? " on" : ""}" ${attrs}>${inner}${label}</label>` : `<button type="button" class="wsr-portal${on ? " on" : ""}" ${attrs}>${inner}</button>`;
}
const WSR_LIVE = `<svg width="38" height="38" viewBox="0 0 30 30" fill="none" style="stroke:var(--rk-core)" stroke-width="2" stroke-linecap="round"><circle cx="15" cy="17" r="10"/><path d="M15 11v6l4 2M12 3h6M15 3v4"/></svg>`;
const WSR_UP = `<svg width="38" height="38" viewBox="0 0 30 30" fill="none" style="stroke:var(--rk-core)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h10l6 6v16H8z"/><path d="M18 4v6h6M16 22v-8M12.5 17.5 16 14l3.5 3.5"/></svg>`;
function wsrHtml(p, k, pick) {
  const d = parseYmd(k), isToday = k === ymd(today), when = isToday ? "TODAY" : wsDayTxt(d), dayTxt = isToday ? "today" : wsDayTxt(d).replace(/^(\w)(\w+)/, (m, a, b) => a + b.toLowerCase());
  const wrap = (inner, cls = "") => `<div class="wsb wsr${wsRun.anim ? " anim" : ""}" role="dialog" aria-modal="true" aria-label="Run"><button type="button" class="wsb-bg" data-wsrx="1" aria-label="Close"></button>
    <div class="wsb-card wsr-card ${cls}"><div class="wsb-in"><div class="wsr-scroll">${inner}</div></div></div><div class="wsb-hint2">TAP OUTSIDE TO CLOSE</div></div>`;
  const top = (eb, title, sub) => `<div class="wsb-eb"><span>${eb}</span><button type="button" class="wsb-x" data-wsrx="1" aria-label="Close">✕</button></div><div class="wsb-title">${esc(title)}</div><div class="wsb-plain">${sub}</div>`;
  const rule = t => `<div class="wsr-rule"><i></i><span>${t}</span><i></i></div>`;
  const file = `<input type="file" id="wsrFile" accept=".gpx,.tcx,application/gpx+xml,application/vnd.garmin.tcx+xml,application/xml,text/xml" hidden>`;
  if (wsRun.stage !== "read" || !wsRun.st) {
    const live = isToday ? wsrPortal(WSR_LIVE, "RUN LIVE", "Timer and run/walk cues while you run", true, `data-wsrlive="${k}"`)
      : wsrPortal(WSR_LIVE, "RUN LIVE", `Only on the day of the run`, false, `disabled aria-disabled="true"`);
    const up = wsrPortal(WSR_UP, "UPLOAD", "GPX or TCX from Strava, Garmin or your watch", !isToday, `for="wsrFile"`, file);
    const status = wsRun.busy ? `<div class="wsr-status"><span class="pulse"></span> Reading the file…</div>` : wsRun.err ? `<div class="wsr-status bad">${esc(wsRun.err)}</div>` : "";
    return wrap(top(`TRAIL · ${when}`, String(pick.name || "Trail").toUpperCase(), `${esc(p.t || "Run")}${p.d ? ` · ${esc(String(p.d).split(", ")[0])}` : ""}`)
      + rule("CHOOSE YOUR PATH") + `<div class="wsr-portals">${live}${up}</div>${status}`
      + `<div class="wsr-tip">${isToday ? "Running live? Keep Strava or your watch recording too, then upload the file afterwards to get your map, splits and heart rate." : "Upload the run from your watch or Strava, or type the distance and time in by hand."}</div>`
      + `<details class="wsr-how"><summary>HOW TO GET THE FILE</summary>${[["Strava", "Open the run on strava.com (a phone browser works), tap ⋯ → Export GPX."], ["Garmin Connect", "Open the activity → ⚙ → Export to GPX or TCX."], ["Apple Watch", "Export the workout as GPX with HealthFit or RunGap."], ["COROS · Polar · Suunto", "Open the activity in their app or site and export GPX."]].map(([a, b]) => `<div><i class="wsb-dia" style="--c:${RKT.mm}"></i><span><b>${a}</b>${b}</span></div>`).join("")}</details>`
      + `<button type="button" class="wsr-hand" data-wslog="1">OR LOG IT BY HAND</button>`);
  }
  // the run read from the file
  const st = wsRun.st, src = wsRun.src, N = wsrNums(st, src), spec = typeof runSpec === "function" ? runSpec(null, p) : {}, fmt = typeof rxFmt === "function" ? rxFmt(p, null).fmt : "steady";
  const tiles = [[`${Math.round(N.mi * 100) / 100}`, "Miles"], [fmtMin(N.min), N.tLab], [wsrPace(N.min / N.mi), "Pace /mi"]];
  tiles.push(st.avgHr ? [st.avgHr, "Avg HR"] : st.elevFt != null ? [st.elevFt, "Elev ft"] : st.cad ? [st.cad, "Cadence"] : [src.kcal || "—", "Kcal"]);
  const checks = [], ck = (s, a, b) => checks.push(`<div class="wsr-ck ${s}"><span>${s === "ok" ? "✓" : s === "warn" ? "!" : "i"}</span><div><b>${a}</b><em>${b}</em></div></div>`);
  if (spec.by === "dist" && spec.v > 0) { const v = typeof dU === "function" ? spec.v : spec.v; ck(N.mi >= spec.v * .9 ? "ok" : "warn", `Distance: ${Math.round(N.mi * 100) / 100} of ${v} mi`, `Planned ${esc(p.t || "run")}${N.mi < spec.v * .9 ? ". Short of the plan, it still counts." : ""}`) }
  else if (spec.by === "time" && spec.v > 0) { const tot = spec.v + (spec.warm || 0) + (spec.cool || 0); ck(N.min >= tot * .9 ? "ok" : "warn", `Time on feet: ${Math.round(N.min)} of ${tot} min`, `Planned ${esc(String(p.d || p.t || "").split(", ")[0])}`) }
  if (spec.runwalk && st.runMin) ck("info", `Ran ${Math.round(st.runMin)} min, walked ${Math.round(st.walkMin || 0)} min`, "Split from your speed in the file");
  if (st.avgHr && isHrRun(k)) { const r = hrRange(st.series), pct = r ? Math.round(r.pctIn) : null;
    ck(pct != null && pct >= 60 ? "ok" : "warn", pct != null && pct >= 60 ? `Heart rate in zone ${pct}% of the run` : `Heart rate mostly ${r && r.above > r.below ? "above" : "outside"} Zone 2`, `Average ${st.avgHr} bpm, peak ${st.maxHr}. Aim for ${HR_LO}–${HR_HI}${r && r.above > r.below ? " by walking sooner" : ""}.`) }
  else if (!st.avgHr) ck("info", "No heart rate in this file", src.id === "strava" ? "Strava only adds heart rate when the run was recorded with a watch or strap." : "Your effort can still be judged from pace.");
  else ck("info", `Average heart rate ${st.avgHr} bpm`, `Peak ${st.maxHr} bpm`);
  if (st.date && st.date !== k) ck("warn", "Recorded on a different day", `This file is from ${esc(fmtShort(parseYmd(st.date)))}. It will be saved to ${esc(dayTxt)}.`);
  else ck("ok", `Recorded ${isToday ? "today" : `on ${esc(dayTxt)}`}`, st.name ? esc(st.name) : "Matches this trail's day");
  const rep = fmt === "reps" || fmt === "short";
  const map = wsRun.map ? `<div class="wsr-map"><div><span class="wsr-ml">${esc((wsRun.fname || "run").toUpperCase())}</span><span class="wsr-mr">${src.name.toUpperCase()}</span>
    <svg viewBox="0 0 300 150" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><polyline points="${wsRun.map}" class="g"/><polyline points="${wsRun.map}" class="l"/><circle cx="${wsRun.map.split(" ")[0].split(",")[0]}" cy="${wsRun.map.split(" ")[0].split(",")[1]}" r="5"/></svg></div></div>` : "";
  return wrap(`<div class="wsb-eb"><span>UPLOAD · FROM ${esc(src.name.toUpperCase())}</span><button type="button" class="wsb-x" data-wsrx="1" aria-label="Close">✕</button></div>
    <div class="wsb-title">TRAIL CLEARED?</div><div class="wsb-plain">Check it, then save it to ${esc(pick.name || "this trail")}.</div>${map}
    <div class="wsb-boxes wsr-tiles">${tiles.map(([v, l]) => `<div><b>${esc(String(v))}</b><span>${esc(l)}</span></div>`).join("")}</div>
    <div class="wsr-read">${esc(N.read)}</div>${rule("AGAINST THE PLAN")}<div class="wsr-cks">${checks.join("")}</div>
    <div class="wsr-btns"><label class="wsr-ghost" for="wsrFile">ANOTHER FILE${file}</label><button type="button" class="wsr-save" data-wsrsave="${k}">${rep ? "ADD YOUR REPS" : `SAVE TO ${esc((isToday ? "today" : dayTxt).toUpperCase())}`}</button></div>
    ${rep ? `<div class="wsr-read">This trail logs each rep, so the next screen keeps the file and asks for your rep times.</div>` : ""}`, "read");
}
async function wsrRead(f) {
  if (!wsRun) return;
  const fail = m => { wsRun.busy = false; wsRun.err = m; wsRun.stage = wsRun.st ? "read" : "pick"; if (wsRun.st) toast(m); lastRenderKey = ""; render() };
  if (f.size > 30 * 1024 * 1024) return fail("That file is too large. Export a single activity as GPX.");
  if (/\.fit(\.gz)?$/i.test(f.name)) return fail("FIT files aren't supported yet. Export the run as GPX or TCX instead.");
  if (/\.gz$/i.test(f.name)) return fail("That file is compressed (.gz). Unzip it first, or use Export GPX.");
  wsRun.busy = true; wsRun.err = ""; lastRenderKey = ""; render();
  let text = ""; try { text = f.text ? await f.text() : await new Promise((ok, no) => { const rd = new FileReader(); rd.onload = () => ok(String(rd.result)); rd.onerror = () => no(rd.error); rd.readAsText(f) }) }
  catch (err) { return fail("That file couldn't be opened. Save it to Files first, then pick it again.") }
  let st; try { st = parseTrack(text) } catch (err) { return fail((err && err.message) || "That file couldn't be read.") }
  if (!wsRun) return;
  const src = wsrSource(text, f.name);
  st.app = src.name; if (src.kcal) st.cal = st.cal || src.kcal;
  wsRun = { ...wsRun, stage: "read", st, src, map: wsrRoute(text), fname: f.name.replace(/\.(gpx|tcx|xml)$/i, "") + "." + src.fmt.toLowerCase(), busy: false, err: "", anim: false };
  lastRenderKey = ""; render();
}
function wsrClose() { wsRun = null; document.querySelectorAll("body > .wsb").forEach(x => x.remove()); lastRenderKey = ""; render() }
function wsrSave(k) {
  const p = planFor(parseYmd(k)); if (!wsRun || !wsRun.st || !p) return;
  const st = cleanJSON(wsRun.st), N = wsrNums(st, wsRun.src), fmt = typeof rxFmt === "function" ? rxFmt(p, null).fmt : "steady";
  if (fmt === "reps" || fmt === "short") {  // the rep times are entered in the full log, with the file kept
    if (N.mi) st.mi = N.mi; finishImport(k, st); wsRun = null; wsLog = true; document.querySelectorAll("body > .wsb").forEach(x => x.remove()); lastRenderKey = ""; render(); window.scrollTo(0, 0); return }
  if (TM.start && TM.date === k) stopWorkout();
  delete imports[k]; delete drafts[k + "|strava"]; persistDrafts();
  const spec = runSpec(null, p), extra = spec.runwalk ? { reps: rxRepN(k, p, null, spec) } : {};
  wsRun = null; document.querySelectorAll("body > .wsb").forEach(x => x.remove());
  const old = S.logs[k] && S.logs[k].type === "run" ? S.logs[k] : null;
  saveLog(k, { type: "run", key: p.key, rpe: old ? old.rpe || null : null, ...extra, mi: Math.round(N.mi * 1000) / 1000, min: Math.round(N.min * 100) / 100, notes: old ? old.notes || "" : "", st, analysis: null, savedAt: Date.now() })
    .then(() => { lastRenderKey = ""; render(); setTimeout(() => { wsnOpen(k, "coach"); analyzeRun(k) }, 300); setTimeout(maybeAutoAdvice, 20000) });
}
document.addEventListener("click", e => {
  if (!WS_ON || tab !== "home" || wsLog) return;
  const t = e.target;
  const open = t.closest("[data-wsrun]");
  if (open) { e.preventDefault(); wsPop = null; wsRun = { k: open.dataset.wsrun, stage: "pick", anim: true }; lastRenderKey = ""; render(); return }
  if (!wsRun) return;
  if (t.closest("[data-wsrx]")) { wsrClose(); return }
  const live = t.closest("[data-wsrlive]");
  if (live) { const k = live.dataset.wsrlive; wsRun = null; document.querySelectorAll("body > .wsb").forEach(x => x.remove()); sel = parseYmd(k); startWorkout(); lastRenderKey = ""; render(); openLive(); return }
  const sv = t.closest("[data-wsrsave]"); if (sv) { wsrSave(sv.dataset.wsrsave); return }
});
document.addEventListener("change", e => { if (e.target && e.target.id === "wsrFile" && wsRun) { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (f) wsrRead(f) } });
document.addEventListener("keydown", e => { if (e.key === "Escape" && wsRun) wsrClose() });
{ const st = document.createElement("style"); st.id = "wsrCss"; st.textContent = `.wsr .wsr-card{flex:0 1 auto;max-height:100%;margin-top:auto;margin-bottom:auto}
.wsr .wsb-in{height:auto;max-height:100%;padding:0;overflow:hidden}
.wsr .wsr-card.read{flex:1}
.wsr .wsr-card.read .wsb-in{height:100%}
.wsr-scroll{max-height:100%;height:100%;overflow-y:auto;overscroll-behavior:contain;padding:18px;box-sizing:border-box;scrollbar-width:none}
.wsr-scroll::-webkit-scrollbar{display:none}
.wsr-rule{display:flex;align-items:center;gap:10px;margin:18px 0 12px}
.wsr-rule i{flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--mt-m))}
.wsr-rule i:last-child{background:linear-gradient(90deg,var(--mt-m),transparent)}
.wsr-rule span{font:800 9.5px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.3em;color:var(--mid)}
.wsr-portals{display:flex;gap:10px}
.wsr-portal{all:unset;box-sizing:border-box;cursor:pointer;flex:1;min-width:0;border-radius:18px;padding:18px 12px 16px;text-align:center;display:flex;flex-direction:column;align-items:center;border:2px solid #3A2A1C;background:radial-gradient(70% 60% at 90% 0%,color-mix(in srgb,var(--rk) 14%,transparent),transparent 65%),#0A0A0D;transition:border-color .2s,transform .15s}
.wsr-portal.on{border-color:var(--mt-m);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--mt-l) 25%,transparent)}
.wsr-portal:active{transform:scale(.98)}
.wsr-portal:focus-visible{outline:2px solid var(--m2);outline-offset:3px}
.wsr-portal[disabled]{cursor:default;opacity:.55}
.wsr-orb{width:86px;height:86px;border-radius:50%;padding:3px;box-sizing:border-box;background:linear-gradient(90deg,var(--m0),var(--m1) 40%,var(--m2) 60%,var(--m0))}
.wsr-orb>span{width:100%;height:100%;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 50% 40%,color-mix(in srgb,var(--rk) 25%,transparent),#070708 70%);box-shadow:inset 0 0 18px rgba(0,0,0,.8)}
.wsr-portal.on .wsr-orb>span{background:radial-gradient(circle at 50% 40%,color-mix(in srgb,var(--rk) 55%,transparent),#070708 70%);box-shadow:inset 0 0 18px rgba(0,0,0,.8),0 0 30px -6px var(--rk)}
.wsr-portal b{margin-top:14px;font:900 18px/1.05 "Barlow Semi Condensed",sans-serif;letter-spacing:.06em;color:#F5F1E6}
.wsr-ps{font:400 12px/1.4 Barlow,sans-serif;color:#B9BFCA;margin-top:6px}
.wsr-status{margin-top:12px;font-size:12.5px;color:#C9CED7;display:flex;gap:8px;align-items:center}
.wsr-status.bad{color:#F0B4AC;padding:10px 12px;border-radius:10px;border:1px solid rgba(224,103,90,.4);background:rgba(224,103,90,.08);line-height:1.45}
.wsr-tip{margin-top:14px;padding:10px 12px;border-radius:10px;background:color-mix(in srgb,var(--rk) 7%,transparent);border:1px solid color-mix(in srgb,var(--rk) 25%,transparent);font-size:12px;line-height:1.45;color:#BFD8CC}
.wsr-how{margin-top:12px}
.wsr-how summary{cursor:pointer;list-style:none;font:800 10px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.2em;color:var(--m2);padding:6px 0}
.wsr-how summary::-webkit-details-marker{display:none}
.wsr-how summary::after{content:" ▾"}
.wsr-how[open] summary::after{content:" ▴"}
.wsr-how>div{display:flex;gap:12px;align-items:flex-start;padding:9px 0;border-bottom:1px solid color-mix(in srgb,var(--mt-m) 16%,transparent);font-size:12px;line-height:1.4;color:var(--mut)}
.wsr-how>div b{display:block;font:700 13.5px/1.2 Barlow,sans-serif;color:#F5F1E6;margin-bottom:2px}
.wsr-hand{all:unset;cursor:pointer;display:block;width:100%;text-align:center;margin-top:14px;padding:6px 0;font:800 10.5px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.16em;color:var(--m2)}
.wsr-map{margin-top:12px;border-radius:14px;padding:2px;background:linear-gradient(90deg,var(--m0),var(--m1) 40%,var(--m2) 60%,var(--m0))}
.wsr-map>div{position:relative;border-radius:12px;overflow:hidden;background:radial-gradient(70% 80% at 50% 50%,color-mix(in srgb,var(--rk) 12%,transparent),transparent 70%),repeating-linear-gradient(0deg,color-mix(in srgb,var(--rk-mid) 5%,transparent) 0 1px,transparent 1px 22px),repeating-linear-gradient(90deg,color-mix(in srgb,var(--rk-mid) 5%,transparent) 0 1px,transparent 1px 22px),#08090B}
.wsr-map svg{display:block;width:100%;height:auto;aspect-ratio:2/1}
.wsr-map .g{fill:none;stroke:color-mix(in srgb,var(--rk) 35%,transparent);stroke-width:7;stroke-linejoin:round;stroke-linecap:round}
.wsr-map .l{fill:none;stroke:var(--core);stroke-width:2;stroke-linejoin:round;stroke-linecap:round}
.wsr-map circle{fill:var(--rk);stroke:#08090B;stroke-width:2}
.wsr-ml,.wsr-mr{position:absolute;top:10px;font:800 8.5px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.24em;color:var(--m2);max-width:55%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wsr-ml{left:10px}.wsr-mr{right:10px;color:var(--mut);letter-spacing:.14em}
.wsr-tiles{grid-template-columns:repeat(4,1fr);margin-top:12px}
.wsr-tiles b{font-size:17px}
.wsr-read{margin-top:8px;font-size:11.5px;line-height:1.4;color:var(--mut)}
.wsr-ck{display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-bottom:1px solid color-mix(in srgb,var(--mt-m) 16%,transparent)}
.wsr-ck>span{width:18px;height:18px;flex-shrink:0;display:grid;place-items:center;border-radius:50%;font:900 11px/1 "Barlow Semi Condensed",sans-serif;background:color-mix(in srgb,var(--rk-mid) 12%,transparent);color:var(--mid)}
.wsr-ck.ok>span{background:var(--rk);color:var(--rk-ink)}
.wsr-ck.warn>span{background:rgba(232,194,122,.15);color:#E8C27A}
.wsr-ck b{display:block;font:700 13.5px/1.25 Barlow,sans-serif;color:#F5F1E6}
.wsr-ck em{display:block;font-style:normal;font-size:11.5px;color:var(--mut);margin-top:2px;line-height:1.4}
.wsr-btns{display:flex;gap:8px;margin-top:16px}
.wsr-ghost{all:unset;box-sizing:border-box;cursor:pointer;height:50px;padding:0 16px;border-radius:14px;display:grid;place-items:center;border:1px solid rgba(245,241,230,.16);font:800 12.5px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.18em;color:#C9CED7;white-space:nowrap}
.wsr-save{all:unset;box-sizing:border-box;cursor:pointer;flex:1;height:50px;border-radius:14px;padding:2px;background:linear-gradient(90deg,var(--m0),var(--m1) 40%,var(--m2) 60%,var(--m0));text-align:center}
.wsr-save{display:grid;place-items:center;background:linear-gradient(180deg,var(--rk),var(--rk-d)) padding-box,linear-gradient(90deg,var(--m0),var(--m1) 40%,var(--m2) 60%,var(--m0)) border-box;border:2px solid transparent;box-shadow:inset 0 1px 0 rgba(255,255,255,.3);font:800 13px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.2em;color:var(--rk-ink)}
.wsr-save:focus-visible,.wsr-ghost:focus-visible,.wsr-hand:focus-visible{outline:2px solid var(--m2);outline-offset:2px}
`; document.head.appendChild(st) }

/* ---------- Arrange the week: drag days into a new order ----------
   Only logged days are locked. Missed days can be moved like any other. Dragging a day opens a slot where it will
   land and slides the days between along; locked days stay where they are. Colour shows effort, a load meter and a
   recovery check update as you drag, and nothing changes until Save. */
let wsArr = null;  // {days: [k…7], lock: [bool…], order: [src|null…], start: [...], el, drag}
const WSA_HARD = { intervals: 1, sprints: 1, hills: 1, tempo: 1, tt: 1, race: 1 };
function wsaInfo(src, k) {
  const pb = src ? basePlan(parseYmd(src)) : { type: "rest" }, pick = wsPick(pb && pb.type !== "rest" ? pb : null, k);
  if (!pb || pb.type === "rest") return { kind: "rest", eff: "r", name: "The Camp", sub: "Rest", img: "camp1", label: "Rest" };
  if (pb.type === "gym") return { kind: "gym", eff: "h", name: `${pb.name || "Gym"} Gate`, sub: pb.name || "Gym", img: pick.img, label: pb.name || "Gym", legs: /leg|lower|full/i.test(pb.name || "") };
  const ty = wsRunType(pb);
  return { kind: "run", eff: ty === "long" ? "m" : WSA_HARD[ty] ? "h" : "e", name: pick.name, sub: pb.t || "Run", img: pick.img, label: pb.t || "Run", long: ty === "long" };
}
function wsaOpen(k) {
  const days = weekDays(k), td = ymd(today);
  const lock = days.map(d => !!S.logs[d] || !inProgram(parseYmd(d)));
  const order = days.map(d => srcOf(d));
  wsArr = { days, lock, order, start: order.slice(), base: days.map(d => { const b = basePlan(parseYmd(d)); return b && b.type !== "rest" ? d : null }) };
  wsPop = null; wsRun = null; lastRenderKey = ""; render();
  const el = document.createElement("div"); el.className = "wsb wsa anim"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", "Arrange the week");
  wsArr.el = el; document.body.appendChild(el); wsaPaint(); setTimeout(() => { el.classList.remove("anim"); const h = el.querySelector(".wsa-h"); h && h.focus() }, 280);
}
function wsaClose() { if (wsArr && wsArr.el) wsArr.el.remove(); wsArr = null }
// recovery check for an order of sessions across the week
function wsaChecks(info) {
  const out = [], n = info.length, rest = info.filter(x => x.kind === "rest").length;
  for (let i = 0; i < n - 1; i++) { const a = info[i], b = info[i + 1], A = DOW[i], Bd = DOW[i + 1];
    if (a.eff === "h" && b.eff === "h") out.push(["warn", `${a.label} ${A}, then ${b.label} ${Bd}: two hard days back to back.`]);
    if (a.legs && b.long) out.push(["warn", `${a.label} ${A}, then the long run ${Bd}: tired legs for the run. A rest or easy day between them would help.`]);
    if (a.long && b.legs) out.push(["warn", `Long run ${A}, then ${b.label} ${Bd}: your legs won't be fresh for ${b.label}.`]);
  }
  if (!rest) out.push(["warn", "No rest day this week. Keep at least one."]);
  let run = 0, mx = 0; info.forEach(x => { run = x.kind === "rest" ? 0 : run + 1; mx = Math.max(mx, run) }); if (mx >= 5 && rest) out.push(["warn", `${mx} training days in a row before a rest.`]);
  if (!out.length) out.push(["ok", "Hard days are spaced out and there's a rest day. This week works."]);
  return out.slice(0, 3);
}
function wsaPaint() {
  const A = wsArr; if (!A || !A.el) return;
  const td = ymd(today), info = A.order.map((s, i) => wsaInfo(s, A.days[i])), D = A.drag;
  const changed = A.order.some((s, i) => s !== A.start[i]);
  const row = (i, ghost) => { const d = A.days[i], x = info[i], lock = A.lock[i], logged = !!S.logs[d], dt = parseYmd(d);
    const status = logged ? "Done" : d < td && x.kind !== "rest" ? "Missed" : d === td ? "Today" : x.sub;
    const moved = A.order[i] !== A.start[i];
    return `<div class="wsa-row${lock ? " lock" : ""}${ghost ? " src" : ""}${d === td ? " today" : ""}" data-i="${i}"><i class="wsa-eff e-${x.eff}"></i>
      <span class="wsa-d">${DOW[dowOf(dt)].toUpperCase()}<br>${dt.getDate()}</span><img src="/world/${x.img}.webp" alt="" class="${logged ? "" : "dim"}">
      <span class="wsa-t"><b>${esc(x.name)}</b><em class="${status === "Missed" ? "miss" : ""}">${esc(status)}${moved && !lock ? ` <span class="mv">· moved</span>` : ""}</em></span>
      ${lock ? `<span class="wsa-lk" aria-label="Logged, can't move">🔒</span>` : `<button type="button" class="wsa-h" data-wsah="${i}" aria-label="Move ${esc(x.name)}, ${DOW[dowOf(dt)]}. Drag, or use the arrow keys">⋮⋮</button>`}</div>` };
  let list = "";
  A.days.forEach((d, i) => { if (D && D.to === i && D.from !== i) list += `<div class="wsa-slot" style="height:${D.h}px">${esc(info[D.from].label)} goes here · ${DOW[dowOf(parseYmd(d))]} ${parseYmd(d).getDate()}</div>`; list += row(i, D && D.from === i) });
  const bars = info.map((x, i) => `<div><i class="e-${x.eff}" style="height:${{ h: 26, m: 20, e: 10, r: 4 }[x.eff]}px"></i><span>${DOW[i].charAt(0)}</span></div>`).join("");
  const ck = wsaChecks(D ? D.preview : info).map(([s, t]) => `<div class="wsa-ck ${s}"><span>${s === "ok" ? "✓" : "!"}</span>${esc(t)}</div>`).join("");
  A.el.innerHTML = `<button type="button" class="wsb-bg" data-wsax="1" aria-label="Close"></button><div class="wsb-card wsa-card"><div class="wsb-in"><div class="wsr-scroll">
    <div class="wsb-eb"><span>ARRANGE THE WEEK</span><button type="button" class="wsb-x" data-wsax="1" aria-label="Close">✕</button></div>
    <div class="wsb-title">DRAG TO REORDER</div><div class="wsb-plain">Colour shows effort: red hard, gold long, green easy. Logged days stay put.</div>
    <div class="wsa-list">${list}</div>
    <div class="wsa-lab">LOAD THIS WEEK</div><div class="wsa-meter">${bars}</div>${ck}
    <div class="wsr-btns"><button type="button" class="wsr-ghost" data-wsareset="1">RESET</button><button type="button" class="wsr-save" data-wsasave="1"${changed ? "" : " disabled"}>${changed ? "SAVE THE WEEK" : "NO CHANGES YET"}</button></div>
    <button type="button" class="wsr-hand" data-wsaplan="1">PUT THE WEEK BACK TO MY PLAN</button></div></div></div>`;
}
// move the session at slot `from` to slot `to`; locked slots don't move, the open ones in between slide along
function wsaMove(order, lock, from, to) {
  const free = order.map((_, i) => i).filter(i => !lock[i]), a = free.indexOf(from), b = free.indexOf(to);
  if (a < 0 || b < 0 || a === b) return order.slice();
  const seq = free.map(i => order[i]); const [m] = seq.splice(a, 1); seq.splice(b, 0, m);
  const out = order.slice(); free.forEach((i, j) => out[i] = seq[j]); return out;
}
function wsaSave() {
  const A = wsArr; if (!A) return;
  const before = JSON.stringify(S.profile.moves || {});
  A.days.forEach((d, i) => { if (!A.lock[i]) setSrc(d, A.order[i]) });
  saveProfile(); if (typeof commitPlan === "function") try { commitPlan() } catch (_) { }
  const prev = JSON.parse(before); wsaClose(); lastRenderKey = ""; render();
  wsaUndo(prev);
}
// a short bronze bar with Undo after saving
function wsaUndo(prev) {
  document.querySelectorAll(".wsa-toast").forEach(x => x.remove());
  const el = document.createElement("div"); el.className = "wsa-toast"; el.setAttribute("role", "status");
  el.innerHTML = `<div><span>[SYSTEM] SCHEDULE CHANGED</span><b>Your week has been rearranged.</b></div><button type="button">UNDO<i></i></button>`;
  document.body.appendChild(el);
  const t = setTimeout(() => el.remove(), 8000);
  el.querySelector("button").onclick = () => { clearTimeout(t); el.remove(); S.profile.moves = prev; saveProfile(); if (typeof commitPlan === "function") try { commitPlan() } catch (_) { } lastRenderKey = ""; render(); toast("Undone. Your week is back.") };
}
// dragging by the handle (pointer), or with the arrow keys
document.addEventListener("pointerdown", e => {
  const h = e.target.closest && e.target.closest(".wsa .wsa-h"); if (!h || !wsArr) return;
  e.preventDefault(); const A = wsArr, from = +h.dataset.wsah, rowEl = h.closest(".wsa-row"), r = rowEl.getBoundingClientRect();
  const ghost = rowEl.cloneNode(true); ghost.classList.add("wsa-float"); ghost.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px`;
  document.body.appendChild(ghost);
  A.drag = { from, to: from, h: r.height, dy: e.clientY - r.top, ghost, preview: A.order.map((s, i) => wsaInfo(s, A.days[i])), pid: e.pointerId };
  wsaPaint(); try { navigator.vibrate && navigator.vibrate(10) } catch (_) { }
});
document.addEventListener("pointermove", e => {
  const A = wsArr; if (!A || !A.drag || e.pointerId !== A.drag.pid) return; e.preventDefault();
  const D = A.drag; D.ghost.style.top = (e.clientY - D.dy) + "px";
  // the slot under the pointer, among the days that can move
  const rows = [...A.el.querySelectorAll(".wsa-row")]; let to = D.from;
  for (const rw of rows) { const i = +rw.dataset.i, rr = rw.getBoundingClientRect(); if (A.lock[i]) continue; if (e.clientY > rr.top + rr.height / 2 || i === D.from) to = i; if (e.clientY < rr.top + rr.height / 2 && i !== D.from) { to = i; break } }
  // auto-scroll near the edges of the sheet
  const sc = A.el.querySelector(".wsr-scroll"), sr = sc.getBoundingClientRect(); if (e.clientY < sr.top + 40) sc.scrollTop -= 8; else if (e.clientY > sr.bottom - 40) sc.scrollTop += 8;
  if (to !== D.to) { D.to = to; const next = wsaMove(A.order, A.lock, D.from, to); D.preview = next.map((s, i) => wsaInfo(s, A.days[i])); const st = sc.scrollTop; wsaPaint(); A.el.querySelector(".wsr-scroll").scrollTop = st }
}, { passive: false });
const wsaDrop = e => { const A = wsArr; if (!A || !A.drag || (e && e.pointerId !== A.drag.pid)) return; const D = A.drag; D.ghost.remove();
  if (e && e.type !== "pointercancel") A.order = wsaMove(A.order, A.lock, D.from, D.to); A.drag = null;
  const st = A.el.querySelector(".wsr-scroll").scrollTop; wsaPaint(); A.el.querySelector(".wsr-scroll").scrollTop = st };
document.addEventListener("pointerup", wsaDrop); document.addEventListener("pointercancel", wsaDrop);
document.addEventListener("keydown", e => {
  if (!wsArr) return;
  if (e.key === "Escape") { if (wsArr.drag) { wsaDrop(null) } else wsaClose(); return }
  const h = e.target.closest && e.target.closest(".wsa .wsa-h"); if (!h || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
  e.preventDefault(); const A = wsArr, from = +h.dataset.wsah, free = A.order.map((_, i) => i).filter(i => !A.lock[i]), j = free.indexOf(from) + (e.key === "ArrowUp" ? -1 : 1);
  if (j < 0 || j >= free.length) return; A.order = wsaMove(A.order, A.lock, from, free[j]); wsaPaint(); const nh = A.el.querySelector(`[data-wsah="${free[j]}"]`); nh && nh.focus();
});
document.addEventListener("click", e => {
  const t = e.target;
  const open = t.closest && t.closest("[data-wsarr]"); if (open) { e.preventDefault(); wsaOpen(open.dataset.wsarr); return }
  if (!wsArr || !t.closest(".wsa")) return;
  if (t.closest("[data-wsax]")) { wsaClose(); return }
  if (t.closest("[data-wsareset]")) { wsArr.order = wsArr.start.slice(); wsaPaint(); return }
  if (t.closest("[data-wsaplan]")) { wsArr.order = wsArr.order.map((s, i) => wsArr.lock[i] ? s : wsArr.base[i]); wsaPaint(); return }
  if (t.closest("[data-wsasave]")) { wsaSave(); return }
});
{ const st = document.createElement("style"); st.id = "wsaCss"; st.textContent = `.wsa .wsa-card{flex:0 1 auto;max-height:100%;margin-top:auto;margin-bottom:auto}
.wsa .wsb-in{height:auto;max-height:100%;padding:0;overflow:hidden}
.wsa-list{margin-top:12px;display:flex;flex-direction:column;gap:5px}
.wsa-row{display:flex;align-items:center;gap:10px;height:48px;padding-right:4px;border-radius:12px;overflow:hidden;background:#0C0F10;border:1px solid rgba(245,241,230,.06);touch-action:pan-y}
.wsa-row.today .wsa-d{color:var(--core)}
.wsa-row.src{opacity:.35}
.wsa-row.lock{background:#0A0B0C}
.wsa-eff{align-self:stretch;width:4px;flex-shrink:0}
.e-h{background:#E0675A}.e-m{background:#E8C27A}.e-e{background:var(--rk-mid)}.e-r{background:#5A6070}
.wsa-d{width:34px;flex-shrink:0;font:800 10px/1.2 "Barlow Semi Condensed",sans-serif;letter-spacing:.1em;color:var(--mut)}
.wsa-row img{width:36px;height:40px;object-fit:contain;flex-shrink:0}
.wsa-row img.dim{filter:grayscale(1) brightness(.5)}
.wsa-t{flex:1;min-width:0;display:flex;flex-direction:column}
.wsa-t b{font:700 14px/1.2 Barlow,sans-serif;color:#F5F1E6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wsa-t em{font-style:normal;font-size:11.5px;color:var(--mut)}
.wsa-t em.miss{color:#E0675A}
.wsa-t .mv{color:var(--m2)}
.wsa-lk{width:40px;text-align:center;font-size:13px;opacity:.7}
.wsa-h{all:unset;cursor:grab;width:40px;height:44px;display:grid;place-items:center;color:var(--m2);font:900 15px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:-2px;touch-action:none;border-radius:8px}
.wsa-h:focus-visible{outline:2px solid var(--m2)}
.wsa-slot{border-radius:12px;border:1.5px dashed var(--m2);background:color-mix(in srgb,var(--mt-l) 6%,transparent);display:grid;place-items:center;font:800 10px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.2em;color:var(--m2);text-transform:uppercase}
.wsa-float{position:fixed;z-index:1000;pointer-events:none;transform:rotate(-1.5deg) scale(1.03);background:#17201D !important;border:1.5px solid var(--mt-l) !important;box-shadow:0 18px 30px rgba(0,0,0,.8),0 0 24px -6px var(--mt-l);--m2:var(--mt-l);--mut:#8F97A6;--core:var(--rk-core);opacity:1}
.wsa-float .wsa-h{cursor:grabbing}
body:has(.wsa-float){cursor:grabbing;user-select:none;-webkit-user-select:none}
.wsa-lab{margin-top:14px;font:800 9.5px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.3em;color:var(--mid)}
.wsa-meter{display:flex;gap:3px;margin-top:8px}
.wsa-meter div{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:42px}
.wsa-meter i{display:block;width:100%;border-radius:3px;transition:height .2s}
.wsa-meter span{font:800 8px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.1em;color:var(--mut);margin-top:4px}
.wsa-ck{display:flex;gap:10px;align-items:flex-start;padding:9px 11px;border-radius:10px;font-size:12px;line-height:1.45;color:#D9D4C8;margin-top:8px;border:1px solid rgba(232,194,122,.35);background:rgba(232,194,122,.07)}
.wsa-ck>span{width:17px;height:17px;flex-shrink:0;border-radius:50%;display:grid;place-items:center;font:900 10.5px/1 "Barlow Semi Condensed",sans-serif;background:rgba(232,194,122,.15);color:#E8C27A}
.wsa-ck.ok{border-color:color-mix(in srgb,var(--rk-mid) 35%,transparent);background:color-mix(in srgb,var(--rk-mid) 7%,transparent)}
.wsa-ck.ok>span{background:color-mix(in srgb,var(--rk-mid) 15%,transparent);color:var(--rk-mid)}
.wsa-toast{position:fixed;z-index:950;left:max(16px,env(safe-area-inset-left,0px));right:max(16px,env(safe-area-inset-right,0px));bottom:calc(env(safe-area-inset-bottom,0px) + 84px);max-width:460px;margin:0 auto;display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:16px;color:#F5F1E6;border:2px solid transparent;background:linear-gradient(#0C0D10,#0C0D10) padding-box,linear-gradient(90deg,var(--mt-d),var(--mt-m) 40%,var(--mt-l) 60%,var(--mt-d)) border-box;box-shadow:0 14px 30px #000;animation:wsbIn .2s ease-out}
.wsa-toast>div{flex:1;min-width:0}
.wsa-toast span{display:block;font:800 9px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.24em;color:var(--rk-mid)}
.wsa-toast b{display:block;font:700 13.5px/1.3 Barlow,sans-serif;margin-top:4px}
.wsa-toast button{all:unset;cursor:pointer;position:relative;overflow:hidden;width:64px;height:36px;border-radius:10px;border:1px solid var(--mt-l);text-align:center;font:900 12px/36px "Barlow Semi Condensed",sans-serif;letter-spacing:.14em;color:var(--mt-l)}
.wsa-toast button i{position:absolute;left:0;bottom:0;height:3px;width:100%;background:var(--mt-l);transform-origin:left;animation:wsaT 8s linear forwards}
@keyframes wsaT{to{transform:scaleX(0)}}
.wsa .wsr-save[disabled]{opacity:.5;cursor:default;filter:grayscale(.5)}
@media (prefers-reduced-motion:reduce){.wsa-meter i{transition:none}}
`; document.head.appendChild(st) }

/* ---------- Run report: the analysis of a logged run as a pop-up ----------
   Runs with a file (GPX, TCX…) get the tabs: Effort, Pace, Intervals, Elevation, Vs. last, Coach, each with the
   full breakdown's charts. Runs typed in by hand or read from screenshots get no charts: the coach's read, and a
   prompt to upload the file. Opens from a cleared run island, and right after an upload is saved. */
let wsAna = null;  // {k, tab, el}
const WSN_Z = ["#7E8AA0", "#7FC8A9", "#E8C27A", "#E39A5A", "#E0675A"];
function wsnTabs(l) {
  const st = l.st || {}, S2 = st.series, t = [];
  if (S2 && S2.t && S2.t.length > 3) {
    if (S2.hr && S2.hr.some(x => x)) t.push(["effort", "EFFORT"]);
    t.push(["pace", "PACE"]);
    if (segmentsOf(st).length > 1) t.push(["intervals", "INTERVALS"]);
    if (S2.e && S2.e.filter(x => x != null).length > 3) t.push(["elev", "ELEVATION"]);
  }
  const prev = runList().find(([kk, ll]) => kk < wsAna.k && ll.key === l.key); if (prev) t.push(["vs", "VS. LAST"]);
  t.push(["coach", "COACH"]);
  return t;
}
function wsnVerdict(k, l) {
  const tx = l.analysis && l.analysis.text, m = tx && tx.match(/\*\*Verdict\*\*\s*[—–-]?\s*([\s\S]*?)(?:\n\s*\*\*|$)/);
  if (m && m[1].trim()) return m[1].trim().replace(/\*\*/g, "");
  try { const c = runCheck(k, l); if (c && c.verdict) return c.verdict } catch (_) { }
  return "";
}
function wsnFrame(title, right, body) { return `<div class="wsn-fr"><div><span>${title}</span><em>${right || ""}</em></div>${body}</div>` }
function wsnTiles(list, n) { return `<div class="wsb-boxes wsn-tiles" style="grid-template-columns:repeat(${n || list.length},1fr)">${list.map(([v, l]) => `<div><b>${esc(String(v))}</b><span>${esc(l)}</span></div>`).join("")}</div>` }
function wsnTab(k, l, tab) {
  const st = l.st || {}, S2 = st.series;
  if (tab === "effort") {
    let h = "";
    if (isHrRun(k)) { const r = hrRange(S2); if (r) h += wsnTiles([[`${Math.round(r.pctIn)}%`, `In ${HR_LO}–${HR_HI}`], [fmtMin(r.above), `Above ${HR_HI}`], [fmtMin(r.below), `Below ${HR_LO}`]]) }
    h += wsnFrame("HEART RATE", st.avgHr ? `AVG ${st.avgHr} · MAX ${st.maxHr}` : "", tsChart({ xs: S2.t, ys: S2.hr, color: RKT.core, fmtY: v => Math.round(v), hlines: isHrRun(k) ? [HR_LO, HR_HI] : null,
      hbands: [0, .6, .7, .8, .9].map((f, i) => ({ y0: i ? f * HR_MAX_EST : 0, y1: i < 4 ? [.6, .7, .8, .9][i] * HR_MAX_EST : 400, color: WSN_Z[i], op: .16, label: "Z" + (i + 1) })) }));
    const z = zoneTimes(S2); if (z) { const zt = z.reduce((a, b) => a + b, 0);
      h += wsnFrame("TIME IN ZONES", "", `<div class="wsn-zbar">${z.map((m, i) => m ? `<i style="width:${m / zt * 100}%;background:${WSN_Z[i]}"></i>` : "").join("")}</div>
        <div class="wsn-zg">${z.map((m, i) => `<div><span style="color:${WSN_Z[i]}">Z${i + 1}</span><b>${fmtMin(m)}</b><em>${Math.round(m / zt * 100)}%</em></div>`).join("")}</div>`) }
    try { const c = runCheck(k, l), r = c && runCoach(k, l, c); if (r && r.items.length) h += `<div class="wsn-items">${r.items.map(([t, a, b]) => `<div class="${t}"><span>${{ good: "✓", watch: "!", fix: "↻" }[t]}</span><div><b>${esc(a)}</b><em>${esc(b)}</em></div></div>`).join("")}</div>` } catch (_) { }
    return h;
  }
  if (tab === "pace") {
    const segs = segmentsOf(st), pv = S2.p, lo = pct(pv, .03), hi = pct(pv, .97);
    const bands = segs.filter(x => x.r !== 0).map(x => ({ x0: x.t0, x1: x.t1, color: x.r === 1 ? RKT.c : "#8F97A6", op: x.r === 1 ? .2 : .25 }));
    let h = wsnFrame("PACE", "HIGHER = FASTER", tsChart({ xs: S2.t, ys: pv, color: RKT.mid, invert: true, fmtY: v => fmtMin(v), bands, yMin: lo != null ? Math.max(6, lo) : null, yMax: hi != null ? Math.min(30, hi) : null }))
      + `<div class="wsn-leg"><span><i style="background:color-mix(in srgb,var(--rk) 45%,transparent)"></i>RUNNING</span><span><i style="background:transparent;border:1px solid #3A3D44"></i>WALKING</span><span><i style="background:rgba(143,151,166,.5)"></i>STOPPED</span></div>`;
    const sp = (st.splits || []).filter(x => x.pace > 0);
    if (sp.length) { const fast = Math.min(...sp.map(x => x.pace)), hasHr = sp.some(x => x.hr), hasEl = sp.some(x => x.elev != null);
      h += wsnFrame("SPLITS", "", `<div class="wsn-sp hd"><span>${RU() === "km" ? "KM" : "MILE"}</span><span></span><span>PACE</span><span>${[hasHr ? "HR" : "", hasEl ? "ELEV" : ""].filter(Boolean).join(" · ")}</span></div>`
        + sp.map(x => `<div class="wsn-sp"><span>${x.mi < 1 ? x.mi.toFixed(2) : x.n}</span><span class="b"><i style="width:${Math.max(8, fast / x.pace * 100)}%"></i></span><b>${fmtMin(x.pace)}</b><span>${[x.hr ? x.hr : "", x.elev != null ? `${x.elev > 0 ? "+" : ""}${x.elev} ft` : ""].filter(Boolean).join(" · ")}</span></div>`).join("")) }
    return h;
  }
  if (tab === "intervals") {
    const segs = segmentsOf(st), tot = S2.t[S2.t.length - 1] || 1, runs = segs.filter(x => x.r === 1);
    let h = wsnFrame("RUN AND WALK", `${runs.length} RUN SEGMENT${runs.length === 1 ? "" : "S"}`, `<div class="wsn-strip">${segs.map(x => `<i style="width:${(x.t1 - x.t0) / tot * 100}%;background:${x.r === 1 ? RKT.c : x.r === 0 ? "color-mix(in srgb,var(--mt-m) 45%,transparent)" : "#3A3D44"}"></i>`).join("")}</div>
      <div class="wsn-iv hd"><span>SEGMENT</span><span>TIME</span><span>PACE</span><span>HR</span></div>${segs.map(x => `<div class="wsn-iv ${x.r === 1 ? "run" : ""}"><span>${x.r === 1 ? "●" : "○"} ${x.type}</span><span>${fmtMin(x.dur)}</span><span>${x.pace ? fmtMin(x.pace) : "–"}</span><span>${x.hr || "–"}</span></div>`).join("")}`);
    if (typeof runCheckHtml === "function") { const rc = runCheckHtml(k, l); if (rc) h += `<div class="wsn-rc">${rc}</div>` }
    return h;
  }
  if (tab === "elev") {
    const ev = S2.e.filter(x => x != null), rng = Math.max(...ev) - Math.min(...ev);
    return wsnFrame("ELEVATION", `+${st.elevFt || 0} FT GAIN`, rng < 12 ? `<p class="wsn-p">Flat route: ${Math.round(rng)} ft between the highest and lowest point.</p>` : tsChart({ xs: S2.t, ys: S2.e, color: RKT.ml, fmtY: v => Math.round(v) + " ft" }));
  }
  if (tab === "vs") {
    const [pk, pl] = runList().find(([kk, ll]) => kk < k && ll.key === l.key), ps = pl.st || {}, cs = st, pace = l.mi && l.min ? l.min / l.mi : null;
    const rows = [["Distance", l.mi, pl.mi, v => dTxt(v, 2), 1], ["Avg pace", pace, pl.mi && pl.min ? pl.min / pl.mi : null, v => paceTxt(v), -1], ["Avg HR", cs.avgHr, ps.avgHr, v => v + " bpm", -1], ["Running time", cs.runMin, ps.runMin, v => fmtMin(v), 1]].filter(r => r[1] != null && r[2] != null);
    const pd = parseYmd(pk);
    return wsnFrame(`VS. ${fmtShort(pd).toUpperCase()}`, "", `<div class="wsn-vs hd"><span></span><span>THIS RUN</span><span>${DOW[dowOf(pd)].toUpperCase()} ${pd.getDate()}</span><span>CHANGE</span></div>`
      + rows.map(([n, a, b, f, good]) => { const d = a - b, better = d * good > 0, tx = n === "Avg pace" ? `${d > 0 ? "+" : "−"}${fmtMin(Math.abs(d))}` : n === "Distance" ? `${d >= 0 ? "+" : "−"}${Math.abs(d).toFixed(2)}` : n === "Running time" ? `${d >= 0 ? "+" : "−"}${fmtMin(Math.abs(d))}` : `${d >= 0 ? "+" : "−"}${Math.abs(Math.round(d))}`;
        return `<div class="wsn-vs"><span>${n}</span><b>${esc(f(a))}</b><span>${esc(f(b))}</span><em class="${Math.abs(d) < 1e-6 ? "" : better ? "up" : ""}">${tx}</em></div>` }).join(""));
  }
  // coach: the written analysis, streamed in while it's being written
  return `<div class="wsn-ana ana" id="ana-${k}">${anaHtml(k)}</div><div class="wsn-acts"><button type="button" id="anaBtn" data-ana="${k}" ${anaBusy[k] != null || !sampleFn ? "disabled" : ""}>${l.analysis ? "RE-ANALYZE" : "ANALYZE RUN"}</button><button type="button" data-wsnlog="${k}">OPEN THE FULL LOG</button></div>`;
}

/* ---------- Gate report: a logged gym day, built like the run report (tiles, then tabs) ---------- */
const WSG_TABS = [["sets", "SETS"], ["volume", "VOLUME"], ["progress", "PROGRESS"], ["ranks", "RANKS"], ["coach", "COACH"]];
const WSG_MUS = { back: "Back", chest: "Chest", shoulders: "Shoulders", arms: "Arms", core: "Core", quads: "Quads", glutes: "Glutes", hamstrings: "Hamstrings", calves: "Calves" };
function wsgNext(k) { return ymd(addDays(parseYmd(k), 1)) }
// the previous logged session of the same routine day (for volume and muscle comparisons)
function wsgPrevDay(k, l) { const dk = x => /^[ABC]$/.test(x || "") ? "r" + x : x;
  const e = Object.entries(S.logs).filter(([kk, x]) => kk < k && x.type === "gym" && x.ex && dk(x.day) === dk(l.day)).sort((a, b) => a[0] < b[0] ? 1 : -1)[0];
  return e ? { k: e[0], l: e[1] } : null }
function wsgVol(id, l, sets) { const f = logFmt(id, l), F = FMT[f] || {}; if (!(F.b === "reps" && F.w)) return 0; return WS(sets).reduce((t, x) => t + setVolW(x, w => loadW(id, l, w)), 0) }
function wsgLogVol(l) { return Object.entries(l.ex || {}).reduce((t, [id, sets]) => t + wsgVol(id, l, sets), 0) }
function wsgData(k, l) {
  const d = parseYmd(k), p = planFor(d), plan = p && p.type === "gym" ? (p.ex || []) : [];
  const ids = [...plan.map(e => e.id).filter(id => l.ex && WS(l.ex[id]).length), ...Object.keys(l.ex || {}).filter(id => WS(l.ex[id]).length && !plan.some(e => e.id === id))];
  const ex = ids.map(id => { const cfg = plan.find(e => e.id === id) || { id, name: rkExName(id), sets: WS(l.ex[id]).length }, f = logFmt(id, l), F = FMT[f] || {}, all = l.ex[id] || [], ws = WS(all);
    const h = exHistory(id, k, f)[0], pl = h ? S.logs[h.k] : null;
    return { id, cfg, name: cfg.name || rkExName(id), f, wr: F.b === "reps" && !!F.w, db: logDb(id, l), all, ws, vol: wsgVol(id, l, all), pr: (l.prs || []).includes(id),
      best: sessBest(id, l), prev: h ? { k: h.k, l: pl, sets: h.sets, vol: wsgVol(id, pl, h.sets), best: sessBest(id, pl) } : null } });
  const planned = plan.filter(e => !e.fixed && ids.includes(e.id)).reduce((t, e) => t + (e.sets || 0), 0) + plan.filter(e => !e.fixed && !ids.includes(e.id)).reduce((t, e) => t + (e.sets || 0), 0);
  const done = ex.reduce((t, e) => t + e.ws.length, 0), vol = ex.reduce((t, e) => t + e.vol, 0), pd = wsgPrevDay(k, l);
  return { d, p, plan, ex, planned, done, vol, pd, pvol: pd ? wsgLogVol(pd.l) : 0 };
}
function wsgW(v) { return Math.round(toU(v)).toLocaleString() }
function wsgSum(e) {
  if (!e.ws.length) return "Not logged";
  const same = e.wr && e.ws.every(x => Number(x.w) === Number(e.ws[0].w));
  if (same) { const w = Number(e.ws[0].w) || 0; return `${w ? `${+toU(w).toFixed(1)}${e.db ? "/DB" : ""} ${uL()}` : "BW"} × ${e.ws.map(x => x.r).join(", ")}` }
  return e.ws.map(x => setTxt(e.f, x, e.db)).join(" · ") }
function wsgVerdict(D, l) {
  const prs = (l.prs || []).length, miss = Math.max(0, D.planned - D.done);
  let a = !D.planned || !miss ? "Every set done" : `${D.done} of ${D.planned} sets`;
  a += prs ? `, ${WS_NUM[prs] || prs} PR${prs === 1 ? "" : "s"}.` : ".";
  if (D.pvol && D.vol) { const c = Math.round((D.vol - D.pvol) / D.pvol * 100); a += c >= 3 ? ` Volume up ${c}% on last ${l.day ? esc(D.p && D.p.name || "time") : "time"}.` : c <= -3 ? ` Volume down ${-c}% on last time.` : " Volume level with last time." }
  return a }
function wsgSpark(vals) {
  if (vals.length < 2) return `<span class="wsg-new">NEW THIS BLOCK</span>`;
  const w = 104, h = 30, lo = Math.min(...vals), hi = Math.max(...vals), sp = hi - lo || 1;
  const pts = vals.map((v, i) => [i * w / (vals.length - 1), h - (v - lo) / sp * h]);
  return `<svg class="wsg-spark" width="${w + 8}" height="${h + 8}" viewBox="-4 -4 ${w + 8} ${h + 8}" aria-hidden="true"><polyline points="${pts.map(q => q.map(n => n.toFixed(1)).join(",")).join(" ")}" fill="none" style="stroke:var(--rk-mid)" stroke-width="2" stroke-linejoin="round"/><circle cx="${pts.at(-1)[0].toFixed(1)}" cy="${pts.at(-1)[1].toFixed(1)}" r="3.5" fill="#E8C27A"/></svg>` }
function wsgTab(k, l, tab, D) {
  const A = wsAna;
  if (tab === "sets") {
    const rows = D.ex.map(e => { const open = A.open === e.id, n = e.cfg.sets && !e.cfg.fixed ? `${e.ws.length}/${e.cfg.sets}` : `${e.ws.length}`;
      let tb = "";
      if (open) { let wi = 0; const ps = e.prev ? WS(e.prev.sets) : [];
        tb = `<div class="wsg-tb${e.wr ? "" : " one"}"><div class="wsg-tr hd">${e.wr ? "<span>Set</span><span>Weight</span><span>Reps</span><span>Last time</span>" : "<span>Set</span><span>Result</span><span>Last time</span>"}</div>` +
          e.all.map(x => { const w = x.t === "w", lbl = w ? "W" : String(++wi), pv = w ? null : ps[wi - 1], last = pv ? esc(setTxt(e.f, pv, logDb(e.id, e.prev.l))) : "–";
            const ty = !w && x.t && typeof SET_TYPES !== "undefined" && SET_TYPES[x.t] ? `<em>${esc(SET_TYPES[x.t].l)}</em>` : "";
            return e.wr ? `<div class="wsg-tr${w ? " wu" : ""}"><span>${lbl}${ty}</span><b>${x.lr ? (x.lr[0][0] === x.lr[1][0] ? (Number(x.lr[0][0]) ? `${+toU(Number(x.lr[0][0])).toFixed(1)}${e.db ? "/DB" : ""} ${uL()}` : "BW") : `L ${+toU(Number(x.lr[0][0])).toFixed(1)} · R ${+toU(Number(x.lr[1][0])).toFixed(1)}`) : Number(x.w) ? `${+toU(Number(x.w)).toFixed(1)}${e.db ? "/DB" : ""} ${uL()}` : "BW"}</b><b>${x.lr ? `${x.lr[0][1]} L · ${x.lr[1][1]} R` : esc(String(x.r ?? "–"))}</b><span>${last}</span></div>`
              : `<div class="wsg-tr${w ? " wu" : ""}"><span>${lbl}${ty}</span><b>${esc(setTxt(e.f, x, e.db))}</b><span>${last}</span></div>` }).join("") + `</div>` }
      return `<div class="wsg-ex${open ? " open" : ""}"><button type="button" class="wsg-h" data-wsgx="${esc(e.id)}" aria-expanded="${open}"><i class="wsg-d" aria-hidden="true"></i><span class="wsg-nm"><b>${esc(e.name)}${e.cfg.ss ? `<small class="ss">SS ${esc(String(e.cfg.ss))}</small>` : ""}${e.pr ? `<small class="pr">PR</small>` : ""}</b><span>${esc(wsgSum(e))}</span></span><span class="wsg-n">${n}</span><span class="wsg-car" aria-hidden="true">▾</span></button>${tb}</div>` }).join("");
    return rows + `<div class="wsn-leg"><span>TAP AN EXERCISE FOR EVERY SET</span></div>`;
  }
  if (tab === "volume") {
    const W = D.ex.filter(e => e.wr);
    if (!W.length || !D.vol) return `<p class="wsn-p" style="margin-top:12px">Volume counts weight × reps, and nothing in this session was logged that way.</p>`;
    const mx = Math.max(...W.map(e => Math.max(e.vol, e.prev ? e.prev.vol : 0))) || 1;
    const bars = W.map(e => `<div class="wsg-vb"><span>${esc(e.name)}</span><div><i style="width:${(e.vol / mx * 100).toFixed(1)}%"></i>${e.prev && e.prev.vol ? `<u style="left:${(e.prev.vol / mx * 100).toFixed(1)}%"></u>` : ""}</div><b>${(toU(e.vol) / 1000).toFixed(1)}k</b></div>`).join("");
    const mus = (lg, pick) => { const m = {}; Object.entries(lg.ex || {}).forEach(([id, sets]) => { const v = wsgVol(id, lg, sets), mm = EX_MUSCLES[id]; if (!v || !mm) return; Object.entries(mm).forEach(([g, sh]) => m[g] = (m[g] || 0) + v * sh) }); return m };
    const a = mus(l), b = D.pd ? mus(D.pd.l) : {}, gs = Object.keys(a).sort((x, y) => a[y] - a[x]), mm = Math.max(...gs.map(g => a[g]), 1);
    const mrows = gs.map(g => { const c = b[g] ? Math.round((a[g] - b[g]) / b[g] * 100) : null;
      return `<div class="wsg-mu"><div><span>${esc(WSG_MUS[g] || g)}</span><span><b>${wsgW(a[g])}</b>${c == null ? "" : c >= 0 ? ` <em class="up">▲ ${c}%</em>` : ` <em class="dn">▼ ${-c}%</em>`}</span></div><i><u style="width:${(a[g] / mm * 100).toFixed(0)}%"></u></i></div>` }).join("");
    const ch = D.pvol ? Math.round((D.vol - D.pvol) / D.pvol * 100) : null;
    return wsnTiles([[wsgW(D.vol), `${uL()} today`], [D.pvol ? wsgW(D.pvol) : "–", "Last time"], [ch == null ? "–" : `${ch >= 0 ? "+" : "−"}${Math.abs(ch)}%`, "Change"]], 3)
      + wsnFrame("VOLUME BY EXERCISE", D.ex.some(e => e.prev && e.prev.vol) ? "LINE = LAST TIME" : "", bars)
      + (mrows ? wsnFrame("BY MUSCLE", D.pd ? `VS. ${fmtShort(parseYmd(D.pd.k)).toUpperCase()}` : "", mrows) : "")
      + `<p class="wsn-p" style="margin-top:10px">Volume is weight × reps over working sets${D.ex.some(e => e.db) ? ", both dumbbells counted" : ""}. Warm-ups are left out.</p>`;
  }
  if (tab === "progress") {
    const nk = wsgNext(k);
    const rows = D.ex.map(e => { const top = e.ws.reduce((a, x) => !a || setScore(e.f, e.id, l, x) > setScore(e.f, e.id, l, a) ? x : a, null);
      const pt = e.prev ? WS(e.prev.sets).reduce((a, x) => !a || setScore(e.f, e.id, e.prev.l, x) > setScore(e.f, e.id, e.prev.l, a) ? x : a, null) : null;
      const hist = exHistory(e.id, nk, e.f).slice(0, 6).reverse().map(h => sessBest(e.id, S.logs[h.k]));
      let delta = "";
      if (e.prev && e.prev.best) { const dv = e.best - e.prev.best;
        delta = e.wr ? (Math.abs(dv) < 0.5 ? `<em>= same</em>` : dv > 0 ? `<em class="up">▲ ${Math.round(toU(dv))} ${uL()}</em>` : `<em class="dn">▼ ${Math.round(toU(-dv))} ${uL()}</em>`)
          : (Math.abs(dv) < 1e-6 ? `<em>= same</em>` : dv > 0 ? `<em class="up">▲ better</em>` : `<em class="dn">▼ lower</em>`) }
      return `<div class="wsg-pg"><div><b>${esc(e.name)}${e.pr ? `<small class="pr">PR</small>` : ""}</b><span>Top set ${top ? esc(setTxt(e.f, top, e.db)) : "–"}${pt ? ` · last ${esc(setTxt(e.f, pt, logDb(e.id, e.prev.l)))}` : ""}</span>${e.wr ? `<span class="em">EST. MAX ${Math.round(toU(e.best))} ${delta}</span>` : delta ? `<span class="em">${delta}</span>` : ""}</div>${wsgSpark(hist)}</div>` }).join("");
    return wsnFrame(`${D.ex.some(e => e.wr) ? "ESTIMATED MAX" : "BEST SET"} · LAST 6 SESSIONS`, "GOLD = THIS DAY", rows)
      + `<p class="wsn-p" style="margin-top:10px">Estimated max comes from your best working set (weight × reps), the same number the Ranks use.</p>`;
  }
  if (tab === "ranks") {
    let R = null, C = null; try { R = rankState(); C = RKC() } catch (_) { }
    if (!R || !C) return `<p class="wsn-p" style="margin-top:12px">Ranks aren't available yet.</p>`;
    const parts = []; D.ex.forEach(e => (C.conv[e.id] || []).forEach(c => { if (c.cap == null && R.part[c.p] && !parts.includes(c.p)) parts.push(c.p) }));
    let gate = "";
    for (const pp of parts) { const P = R.part[pp]; if (!P.gate || !P.gate.open || P.excl) continue;
      const own = D.ex.find(e => { try { const g = rkGateInfo(e.id); return g && g.p === pp } catch (_) { return false } }), g = own ? rkGateInfo(own.id) : null;
      const opener = P.src && P.src.e ? rkExName(P.src.e.ex) : "";
      gate = `<div class="wsg-gate"><span aria-hidden="true">♛</span><div><b>[SYSTEM] GATE OPEN · ${esc(C.parts[pp].name.toUpperCase())} → ${esc(rkLetter(P.gate.to))}</b><em>${g ? `${esc(own.name)} is at that level. Clear it with ${esc(g.txt)}.` : `${esc(opener || "Another lift")} reached that level. Clear it there with a heavy set.`}</em></div></div>`; break }
    const bars = parts.map(pp => { const P = R.part[pp], name = C.parts[pp].name;
      if (P.num == null || P.excl) return "";
      const mine = (R.byPart[pp] || []).filter(e => e.d === k && !e.flag);
      const today = P.src && P.src.e && P.src.e.d === k, pct = Math.max(0, Math.min(1, P.prog || 0)) * 100, top = P.rank >= 5;
      const note = today ? `This session set your score: ${esc(rkExName(P.src.e.ex))}.` : P.src && P.src.e ? `Score held by ${esc(rkExName(P.src.e.ex))} on ${esc(fmtShort(parseYmd(P.src.e.d)))}.` : "";
      return `<div class="wsg-rk"><div><b>${esc(name)}</b>${today ? `<em class="up">NEW BEST</em>` : mine.length ? `<em>COUNTED</em>` : ""}</div><div class="wsg-bar"><span>${esc(rkLetter(P.rank))}</span><i><u class="${today ? "t" : ""}" style="width:${top ? 100 : pct.toFixed(0)}%"></u></i><span class="n">${top ? "" : esc(rkLetter(P.rank + 1))}</span></div>${note ? `<p>${note}</p>` : ""}</div>` }).join("");
    const prs = D.ex.filter(e => e.pr).map(e => { const top = e.ws.reduce((a, x) => !a || setScore(e.f, e.id, l, x) > setScore(e.f, e.id, l, a) ? x : a, null);
      return `<div><span>PR</span><b>${esc(e.name)}</b><em>${top ? esc(setTxt(e.f, top, e.db)) : ""}${e.wr ? ` · est. ${Math.round(toU(e.best))}` : ""}</em></div>` }).join("");
    return gate + (bars ? wsnFrame("WHERE YOU STAND", "BAR = WAY TO THE NEXT RANK", bars) : `<p class="wsn-p" style="margin-top:12px">None of these lifts count toward a rank.</p>`) + (prs ? `<div class="wsg-prs">${prs}</div>` : "");
  }
  // coach: plain checks from the sets, then what to aim for next time
  const items = [], prs = D.ex.filter(e => e.pr);
  if (D.planned) items.push(D.done >= D.planned ? ["good", "Every set done", `${D.done} of ${D.planned} sets${l.durMin ? `, in ${Math.round(l.durMin)} minutes` : ""}.`] : ["watch", `${D.done} of ${D.planned} sets`, `${D.planned - D.done} planned set${D.planned - D.done === 1 ? "" : "s"} weren't logged.`]);
  if (prs.length) items.push(["good", `${WS_NUM[prs.length] ? WS_NUM[prs.length][0].toUpperCase() + WS_NUM[prs.length].slice(1) : prs.length} PR${prs.length === 1 ? "" : "s"}`, `${prs.map(e => e.name).join(" and ")} set${prs.length === 1 ? "s a" : ""} new best${prs.length === 1 ? "" : "s"}.`]);
  D.ex.forEach(e => { if (!e.wr || e.cfg.fixed || !e.ws.length) return; const rs = e.ws.map(x => Number(x.r) || 0), lo = e.cfg.lo, hi = e.cfg.hi;
    const tw = Math.max(...e.ws.map(x => Number(x.w) || 0)), pw = e.prev ? Math.max(...WS(e.prev.sets).map(x => Number(x.w) || 0)) : 0;
    if (lo && rs.every(r => r < lo)) items.push(["fix", `${e.name} under the range`, `${rs.join(", ")} against ${lo}–${hi}. Drop a step so every set lands in range.`]);
    else if (lo && pw && tw > pw && rs.every(r => r <= lo + 1)) items.push(["watch", `${e.name} at the bottom of the range`, `Up ${Math.round(toU(tw - pw))} ${uL()}, landed on ${rs.join(", ")}. Stay there until you reach ${Math.min(hi, lo + 2)}.`]);
    else if (hi && rs.length >= (e.cfg.sets || rs.length) && rs.every(r => r >= hi)) items.push(["good", `${e.name} topped the range`, `${rs.join(", ")}: time to add weight.`]);
    if (rs.length >= 3 && rs[0] - rs.at(-1) >= 2) items.push(["fix", `${e.name} faded`, `${rs.join(", ")}. A longer rest before the last set would help.`]) });
  const nk = wsgNext(k), next = D.ex.filter(e => !e.cfg.fixed && D.plan.some(x => x.id === e.id)).slice(0, 4).map(e => { try { const t = targetFor(e.cfg, nk); if (!t || t.first) return "";
    const tg = e.wr && t.w != null ? `${+toU(Number(t.w)).toFixed(1)}${e.db ? "/DB" : ""} ${uL()} × ${t.reps.join(", ")}` : t.reps ? t.reps.join(", ") : "";
    return `<b>${esc(e.name)}</b>${tg ? ` · ${esc(tg)}` : ""}<br><span>${esc(t.msg || "")}</span>` } catch (_) { return "" } }).filter(Boolean);
  return (items.length ? `<div class="wsn-items">${items.map(([t, a, b]) => `<div class="${t}"><span>${{ good: "✓", watch: "!", fix: "↻" }[t]}</span><div><b>${esc(a)}</b><em>${esc(b)}</em></div></div>`).join("")}</div>` : "")
    + (l.notes ? `<div class="wsr-rule"><i></i><span>YOUR NOTE</span><i></i></div><p class="wsn-p">“${esc(l.notes)}”</p>` : "")
    + (next.length ? `<div class="wsr-rule"><i></i><span>NEXT TIME</span><i></i></div><ol class="wsg-next">${next.map(x => `<li>${x}</li>`).join("")}</ol>` : "")
    + `<div class="wsn-acts"><button type="button" data-wsnlog="${k}">OPEN THE FULL LOG</button></div>`;
}
function wsgPaint() {
  const A = wsAna, k = A.k, l = S.logs[k], D = wsgData(k, l), pick = wsPick(D.p && D.p.type === "gym" ? D.p : { type: "gym", name: l.day || "Gym" }, k);
  if (!WSG_TABS.some(t => t[0] === A.tab)) A.tab = "sets";
  const when = `${DOW[dowOf(D.d)].toUpperCase()} ${fmtShort(D.d).toUpperCase()}`;
  const tiles = [[D.done, "Sets"], [D.vol ? wsgW(D.vol) : "–", `${uL()} moved`], [l.durMin ? fmtClock(l.durMin * 60000) : "–", "Time"], [(l.prs || []).length, "PRs"]];
  const keep = A.el.querySelector(".wsr-scroll"), top = keep ? keep.scrollTop : 0;
  A.el.innerHTML = `<button type="button" class="wsb-bg" data-wsnx="1" aria-label="Close"></button><div class="wsb-card wsn-card"><div class="wsb-in"><div class="wsr-scroll">
    <div class="wsb-eb"><span>GATE REPORT · ${when}${D.p && D.p.name ? ` · ${esc(String(D.p.name).toUpperCase())}` : ""}</span><button type="button" class="wsb-x" data-wsnx="1" aria-label="Close">✕</button></div>
    <div class="wsn-head"><div><div class="wsb-title">${esc(String(pick.name || "Gate").toUpperCase())}</div><div class="wsb-plain">${wsgVerdict(D, l)}</div></div></div>
    ${wsnTiles(tiles)}<div class="wsn-tabs" role="tablist">${WSG_TABS.map(([id, n]) => `<button type="button" role="tab" aria-selected="${id === A.tab}" data-wsntab="${id}">${n}</button>`).join("")}</div><div class="wsn-pane" role="tabpanel">${wsgTab(k, l, A.tab, D)}</div></div></div></div>`;
  const sc = A.el.querySelector(".wsr-scroll"); if (sc) sc.scrollTop = top;
}
function wsnPaint() {
  const A = wsAna; if (!A || !A.el) return;
  const k = A.k, l = S.logs[k]; if (!l || (l.type !== "run" && l.type !== "gym" && l.type !== "row")) { wsnClose(); return }
  if (l.type === "row") { try { rowRepPaint(A) } catch (err) { console.error(err); wsnClose() } return }
  if (l.type === "gym") { try { wsgPaint() } catch (err) { console.error(err); wsnClose() } return }
  const d = parseYmd(k), p = planFor(d), pick = wsPick(p && p.type === "run" ? p : { type: "run", t: "Run" }, k), st = l.st || {};
  const hasFile = !!(st.series && st.series.t && st.series.t.length > 3);
  const from = st.app || (st.src === "gpx" ? "GPX FILE" : st.src === "strava" ? "SCREENSHOTS" : "");
  const when = `${DOW[dowOf(d)].toUpperCase()} ${fmtShort(d).toUpperCase()}`;
  const pace = l.mi && l.min ? l.min / l.mi : null, verdict = wsnVerdict(k, l);
  const tiles = [[dTxt(l.mi, 2).replace(/ (mi|km)$/, ""), RU() === "km" ? "Km" : "Miles"], [fmtMin(st.movingMin || l.min), st.movingMin ? "Moving" : "Time"], [pace ? fmtMin(pace) : "–", RU() === "km" ? "Pace /km" : "Pace /mi"],
    st.avgHr ? [st.avgHr, "Avg HR"] : l.rpe ? [`${l.rpe}/10`, "Effort"] : st.elevFt != null ? [`+${st.elevFt}`, "Elev ft"] : [l.reps || "–", "Reps"]];
  let body;
  if (hasFile) {
    const tabs = wsnTabs(l); if (!tabs.some(t => t[0] === A.tab)) A.tab = tabs[0][0];
    body = `<div class="wsn-tabs" role="tablist">${tabs.map(([id, n]) => `<button type="button" role="tab" aria-selected="${id === A.tab}" data-wsntab="${id}">${n}</button>`).join("")}</div><div class="wsn-pane" role="tabpanel">${wsnTab(k, l, A.tab)}</div>`;
  } else {
    let c = null; try { c = runCheck(k, l) } catch (_) { }
    const grade = c ? { good: "A", ok: "B", bad: "C" }[c.tone] || "B" : "B";
    body = `<label class="wsn-up" for="wsnFile"><svg width="34" height="34" viewBox="0 0 30 30" fill="none" style="stroke:var(--mt-l)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 24l6-8 5 4 6-10 5 6"/><path d="M4 4v20h22"/></svg>
        <span><b>CHARTS NEED THE RUN FILE</b><em>Upload the GPX or TCX to add pace, heart rate, zones, splits, run/walk and elevation.</em></span><i>UPLOAD</i><input type="file" id="wsnFile" accept=".gpx,.tcx,application/gpx+xml,application/vnd.garmin.tcx+xml,application/xml,text/xml" hidden></label>
      <div class="wsr-rule"><i></i><span>COACH'S READ</span><i></i></div>${c && c.notes && c.notes.length ? `<ul class="wsn-notes">${c.notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
      <div class="wsn-ana ana" id="ana-${k}">${anaHtml(k)}</div><div class="wsn-acts"><button type="button" id="anaBtn" data-ana="${k}" ${anaBusy[k] != null || !sampleFn ? "disabled" : ""}>${l.analysis ? "RE-ANALYZE" : "ANALYZE RUN"}</button><button type="button" data-wsnlog="${k}">OPEN THE FULL LOG</button></div>`;
    A.grade = grade;
  }
  const seal = hasFile ? "" : `<div class="wsn-seal"><span><b>${A.grade}</b><em>${({ A: "ON PLAN", B: "FINISHED", C: "OFF PLAN" })[A.grade]}</em></span></div>`;
  const keep = A.el.querySelector(".wsr-scroll"), top = keep ? keep.scrollTop : 0;
  A.el.innerHTML = `<button type="button" class="wsb-bg" data-wsnx="1" aria-label="Close"></button><div class="wsb-card wsn-card"><div class="wsb-in"><div class="wsr-scroll">
    <div class="wsb-eb"><span>${hasFile ? "RUN ANALYSIS" : "TRAIL REPORT"} · ${when}${from ? ` · ${esc(hasFile ? "FROM " + from.toUpperCase() : "LOGGED " + (st.src === "strava" ? "FROM SCREENSHOTS" : "BY HAND"))}` : hasFile ? "" : " · LOGGED BY HAND"}</span><button type="button" class="wsb-x" data-wsnx="1" aria-label="Close">✕</button></div>
    <div class="wsn-head">${seal}<div><div class="wsb-title">${esc(String(pick.name || "Run").toUpperCase())}</div>${verdict ? `<div class="wsb-plain">${esc(verdict)}</div>` : ""}</div></div>
    ${wsnTiles(tiles)}${body}</div></div></div>`;
  const sc = A.el.querySelector(".wsr-scroll"); if (sc) sc.scrollTop = top;
}
function wsnOpen(k, tab) {
  wsnClose(); wsPop = null; wsRun = null; document.querySelectorAll("body > .wsb:not(.wsn)").forEach(x => x.remove());
  const el = document.createElement("div"); el.className = "wsb wsn anim"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", S.logs[k] && S.logs[k].type === "gym" ? "Gate report" : S.logs[k] && S.logs[k].type === "row" ? "Row report" : "Run report");
  wsAna = { k, tab: tab || (S.logs[k] && S.logs[k].type === "gym" ? "sets" : "effort"), el, open: null }; document.body.appendChild(el); wsnPaint(); setTimeout(() => el.classList.remove("anim"), 300);
}
function wsnClose() { if (wsAna && wsAna.el) wsAna.el.remove(); wsAna = null }
// keep the report in step while the coach writes, or when the log changes
const _wsnPaintAna = typeof paintAna === "function" ? paintAna : null;
if (_wsnPaintAna) paintAna = function (k) { _wsnPaintAna(k); if (wsAna && wsAna.k === k && anaBusy[k] == null) wsnPaint() };
document.addEventListener("click", e => {
  const t = e.target;
  const o = t.closest && t.closest("[data-wsana]"); if (o) { e.preventDefault(); wsnOpen(o.dataset.wsana); return }
  if (!wsAna || !t.closest(".wsn")) return;
  if (t.closest("[data-wsnx]")) { wsnClose(); return }
  if (t.closest("[data-rowlog-edit]")) { wsnClose(); return } // rows.js opens the log sheet
  const an = t.closest("[data-ana]"); if (an && !an.disabled) { analyzeRun(an.dataset.ana); return }
  const gx = t.closest("[data-wsgx]"); if (gx) { wsAna.open = wsAna.open === gx.dataset.wsgx ? null : gx.dataset.wsgx; wsnPaint(); return }
  const tb = t.closest("[data-wsntab]"); if (tb) { wsAna.tab = tb.dataset.wsntab; const sc = wsAna.el.querySelector(".wsr-scroll"); wsnPaint(); const s2 = wsAna.el.querySelector(".wsr-scroll"); if (s2) s2.scrollTop = 0; return }
  const lg = t.closest("[data-wsnlog]"); if (lg) { const k = lg.dataset.wsnlog; wsnClose(); sel = parseYmd(k); tab = "home"; wsLog = true; wsPop = null; lastRenderKey = ""; render(); window.scrollTo(0, 0); return }
});
// a run typed in by hand: upload its file from the report, then save it over the log
document.addEventListener("change", e => { if (e.target && e.target.id === "wsnFile" && wsAna) { const f = e.target.files && e.target.files[0], k = wsAna.k; e.target.value = ""; if (!f) return;
  wsnClose(); sel = parseYmd(k); wsRun = { k, stage: "pick", anim: false, keep: true }; lastRenderKey = ""; render(); wsrRead(f) } });
document.addEventListener("keydown", e => { if (e.key === "Escape" && wsAna) wsnClose() });
{ const st = document.createElement("style"); st.id = "wsnCss"; st.textContent = `.wsn .wsn-card{flex:1;max-height:100%}
.wsn .wsb-in{height:100%;padding:0;overflow:hidden}
.wsn-head{display:flex;gap:14px;align-items:center;margin-top:8px}
.wsn-head .wsb-title{margin-top:0;font-size:26px}
.wsn-head .wsb-plain{margin:4px 0 0;line-height:1.45}
.wsn .wsn-tiles{margin-top:12px}
.wsn .wsn-tiles b{font-size:17px}
.wsn-seal{width:74px;height:74px;flex-shrink:0;border-radius:50%;padding:3px;box-sizing:border-box;background:linear-gradient(90deg,var(--m0),var(--m1) 40%,var(--m2) 60%,var(--m0));box-shadow:0 8px 20px rgba(0,0,0,.7)}
.wsn-seal>span{width:100%;height:100%;border-radius:50%;display:grid;place-content:center;text-align:center;background:radial-gradient(circle at 40% 35%,#1E2A24,#0A0A0D)}
.wsn-seal b{font:900 30px/1 "Barlow Semi Condensed",sans-serif;background:linear-gradient(180deg,var(--core),var(--mid));-webkit-background-clip:text;background-clip:text;color:transparent}
.wsn-seal em{font:800 7.5px/1 "Barlow Semi Condensed",sans-serif;font-style:normal;letter-spacing:.16em;color:var(--m2);margin-top:2px}
.wsn-tabs{position:sticky;top:-18px;z-index:2;display:flex;gap:16px;margin:14px -18px 0;padding:10px 18px 0;background:#0A0A0D;border-bottom:1px solid color-mix(in srgb,var(--mt-m) 30%,transparent);overflow-x:auto;scrollbar-width:none}
.wsn-tabs::-webkit-scrollbar{display:none}
.wsn-tabs button{all:unset;cursor:pointer;padding-bottom:9px;white-space:nowrap;font:800 10.5px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.16em;color:#6E7480;border-bottom:2px solid transparent}
.wsn-tabs button[aria-selected="true"]{color:var(--core);border-bottom-color:var(--m2)}
.wsn-tabs button:focus-visible{outline:2px solid var(--m2);outline-offset:2px}
.wsg-ex{margin-top:8px;border-radius:12px;padding:1.5px;background:linear-gradient(90deg,var(--m0),var(--m1) 40%,var(--m2) 60%,var(--m0))}
.wsg-h{width:100%;display:flex;align-items:center;gap:10px;padding:11px 10px;border:0;border-radius:11px;background:#08090B;color:inherit;text-align:left;cursor:pointer;font:inherit;touch-action:manipulation}
.wsg-ex.open .wsg-h{border-radius:11px 11px 0 0}
.wsg-d{width:10px;height:10px;flex-shrink:0;transform:rotate(45deg);border:1.5px solid var(--mid);background:color-mix(in srgb,var(--rk-mid) 35%,transparent)}
.wsg-nm{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.wsg-nm b{font:800 12px/1.15 "Barlow Semi Condensed",sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#F5F1E6}
.wsg-nm>span{font:700 12px/1.25 "Barlow Semi Condensed",sans-serif;color:#C9CED7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wsg-ex small,.wsg-pg small{margin-left:6px;padding:2px 5px;border-radius:4px;font:800 8px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.14em;vertical-align:1px}
.wsg-ex small.ss{border:1px solid rgba(110,168,255,.4);color:#6EA8FF}small.pr{background:rgba(232,194,122,.16);color:#E8C27A}
.wsg-n{font:800 11px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.1em;color:var(--mid)}
.wsg-car{color:var(--m2);font-size:11px;transition:transform .18s}.wsg-ex.open .wsg-car{transform:rotate(180deg)}
.wsg-tb{padding:0 10px 8px;border-radius:0 0 11px 11px;background:#08090B}
.wsg-tr{display:grid;grid-template-columns:38px 1fr 1fr 1fr;gap:6px;align-items:center;padding:6px 2px;border-top:1px solid rgba(245,241,230,.06);font:700 12.5px/1.1 "Barlow Semi Condensed",sans-serif;color:#F5F1E6}
.wsg-tb.one .wsg-tr{grid-template-columns:38px 1fr 1fr}
.wsg-tr>span:first-child{color:#8F97A6}.wsg-tr>span:last-child{text-align:right;color:var(--mut)}.wsg-tr em{margin-left:3px;font-style:normal;font-size:9px;color:#E8C27A}
.wsg-tr.hd{padding:4px 2px;border-top:1px solid color-mix(in srgb,var(--mt-m) 25%,transparent);font:800 8px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--mt-t)}.wsg-tr.hd>span{color:var(--mt-t)}
.wsg-tr.wu{color:#6E7480}
.wsg-vb{display:grid;grid-template-columns:minmax(0,96px) 1fr 40px;gap:8px;align-items:center;padding:5px 4px}
.wsg-vb>span{font:700 11px/1.15 "Barlow Semi Condensed",sans-serif;color:#C9CED7;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wsg-vb>div{position:relative;height:14px}.wsg-vb i{position:absolute;left:0;top:0;height:14px;border-radius:3px;background:linear-gradient(90deg,var(--m1),var(--m2))}.wsg-vb u{position:absolute;top:-2px;height:18px;width:2px;background:var(--core)}
.wsg-vb b{text-align:right;font:800 11px/1 "Barlow Semi Condensed",sans-serif;color:var(--m2)}
.wsg-mu{padding:6px 4px}.wsg-mu>div{display:flex;justify-content:space-between;font:700 11.5px/1 "Barlow Semi Condensed",sans-serif;color:#C9CED7}.wsg-mu b{color:var(--core)}
.wsg-mu>i{display:block;height:6px;border-radius:3px;background:rgba(245,241,230,.07);margin-top:6px}.wsg-mu>i u{display:block;height:6px;border-radius:3px;background:var(--mid)}
.wsg-mu em,.wsg-pg em,.wsg-rk em{font-style:normal}.wsn em.up,.wsg-pg em.up,.wsg-mu em.up,.wsg-rk em.up{color:var(--mid)}.wsg-mu em.dn,.wsg-pg em.dn{color:#E8C27A}
.wsg-pg{display:flex;align-items:center;gap:10px;padding:9px 4px;border-top:1px solid rgba(245,241,230,.06)}.wsg-pg:first-of-type{border-top:0}
.wsg-pg>div{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}.wsg-pg b{font:700 13px/1.2 Barlow,sans-serif;color:#F5F1E6}
.wsg-pg span{font:700 11.5px/1.3 "Barlow Semi Condensed",sans-serif;color:var(--mut)}.wsg-pg .em{font:800 11px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.06em;color:#F5F1E6}.wsg-pg .em em{color:var(--mut)}
.wsg-spark{flex-shrink:0}.wsg-new{flex-shrink:0;font:700 9.5px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.1em;color:#5C6370}
.wsg-gate{margin-top:12px;padding:12px;border-radius:14px;border:1px solid rgba(110,168,255,.45);background:linear-gradient(180deg,rgba(60,123,244,.14),rgba(10,12,20,.6));display:flex;gap:12px;align-items:center}
.wsg-gate>span{font:900 24px/1 "Barlow Semi Condensed",sans-serif;color:#7B9CFF}.wsg-gate b{display:block;font:800 10.5px/1.3 "Barlow Semi Condensed",sans-serif;letter-spacing:.18em;color:#9DB8FF}.wsg-gate em{display:block;font-style:normal;font-size:12px;color:#C9CED7;margin-top:5px;line-height:1.4}
.wsg-rk{padding:10px 4px;border-top:1px solid rgba(245,241,230,.06)}.wsg-rk:first-of-type{border-top:0}
.wsg-rk>div:first-child{display:flex;justify-content:space-between;align-items:center}.wsg-rk b{font:700 13.5px/1 Barlow,sans-serif;color:#F5F1E6}.wsg-rk>div:first-child em{font:800 9.5px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.14em;color:var(--mut)}
.wsg-rk .wsg-bar{display:flex;align-items:center;gap:8px;margin-top:8px}.wsg-rk .wsg-bar span{font:900 14px/1 "Barlow Semi Condensed",sans-serif;color:#7B9CFF;width:12px}.wsg-rk .wsg-bar .n{color:#5C6370}
.wsg-rk .wsg-bar i{flex:1;height:8px;border-radius:4px;background:rgba(245,241,230,.08);overflow:hidden}.wsg-rk .wsg-bar u{display:block;height:100%;background:#3C7BF4}.wsg-rk .wsg-bar u.t{background:linear-gradient(90deg,#3C7BF4 70%,#E8C27A)}
.wsg-rk p{margin:6px 0 0;font-size:11.5px;color:var(--mut)}
.wsg-prs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.wsg-prs>div{min-width:0;box-sizing:border-box;padding:10px;border-radius:12px;border:1px solid rgba(232,194,122,.45);background:rgba(232,194,122,.07);text-align:center}
.wsg-prs span{display:block;font:900 10px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.2em;color:#E8C27A}.wsg-prs b{display:block;font:800 12.5px/1.2 Barlow,sans-serif;margin-top:5px;color:#F5F1E6}.wsg-prs em{display:block;font:700 11px/1.2 "Barlow Semi Condensed",sans-serif;font-style:normal;color:var(--mut);margin-top:4px}
.wsg-next{margin:0;padding-left:20px;font-size:12.5px;line-height:1.45;color:#D9D4C8}.wsg-next li{margin-top:8px}.wsg-next li::marker{color:var(--m2);font-weight:900}.wsg-next b{color:#F5F1E6}.wsg-next span{color:var(--mut);font-size:12px}
@media (prefers-reduced-motion:reduce){.wsg-car{transition:none}}
.wsn-pane{padding-top:4px}
.wsn-pane>.wsb-boxes{margin-top:12px}
.wsn-fr{margin-top:12px;border-radius:14px;padding:10px 8px 8px;border:2px solid transparent;background:linear-gradient(#08090B,#08090B) padding-box,linear-gradient(90deg,var(--m0),var(--m1) 40%,var(--m2) 60%,var(--m0)) border-box}
.wsn-fr>div:first-child{display:flex;justify-content:space-between;align-items:center;padding:0 4px 6px;gap:8px}
.wsn-fr>div:first-child span{font:800 8.5px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.3em;color:var(--m2)}
.wsn-fr>div:first-child em{font:800 9px/1 "Barlow Semi Condensed",sans-serif;font-style:normal;letter-spacing:.12em;color:var(--mid)}
.wsn .chart text{fill:#6E7480;font:600 9px "Barlow Semi Condensed",sans-serif}
.wsn .chart .grid-line{stroke:rgba(245,241,230,.06)}
.wsn .chart line:not(.grid-line){stroke:var(--rk-mid)}
.wsn-p{margin:4px;font-size:12.5px;color:#B9BFCA}
.wsn-leg{display:flex;gap:12px;margin-top:8px;font:700 9.5px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.1em;color:var(--mut)}
.wsn-leg i{display:inline-block;width:10px;height:8px;margin-right:5px;vertical-align:-1px}
.wsn-zbar{display:flex;height:12px;border-radius:6px;overflow:hidden;margin:2px 4px 0}
.wsn-zg{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin-top:8px;text-align:center}
.wsn-zg span{display:block;font:800 8.5px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.1em}
.wsn-zg b{display:block;font:800 12.5px/1 "Barlow Semi Condensed",sans-serif;margin-top:4px;color:#F5F1E6}
.wsn-zg em{display:block;font-style:normal;font-size:9.5px;color:var(--mut);margin-top:2px}
.wsn-sp,.wsn-iv,.wsn-vs{display:grid;gap:8px;align-items:center;padding:7px 4px;border-top:1px solid rgba(245,241,230,.06);font:700 12px/1 "Barlow Semi Condensed",sans-serif;color:#F5F1E6}
.wsn-sp{grid-template-columns:34px 1fr 44px 74px}
.wsn-sp span:first-child{color:var(--mut)}.wsn-sp span:last-child{text-align:right;color:var(--mut)}
.wsn-sp .b{height:8px;border-radius:4px;background:#14181A;overflow:hidden}.wsn-sp .b i{display:block;height:100%;background:var(--mid)}
.wsn-iv{grid-template-columns:1fr 50px 54px 34px;color:var(--mut)}.wsn-iv.run{color:var(--core)}.wsn-iv span:last-child{text-align:right}
.wsn-vs{grid-template-columns:1fr 66px 66px 54px}.wsn-vs span:first-child{font:500 12px/1.2 Barlow,sans-serif;color:var(--mut)}.wsn-vs span{color:var(--mut)}.wsn-vs em{font-style:normal;text-align:right;color:var(--mut)}.wsn-vs em.up{color:var(--mid)}
.wsn-sp.hd,.wsn-iv.hd,.wsn-vs.hd{border-top:0;padding-bottom:4px;font:800 8.5px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.14em;color:var(--mt-t)}
.wsn-vs.hd span,.wsn-vs.hd em{color:var(--mt-t)}
.wsn-strip{display:flex;height:14px;border-radius:5px;overflow:hidden;gap:1px;margin:2px 4px 6px}
.wsn-items{margin-top:10px}
.wsn-items>div{display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-top:1px solid rgba(245,241,230,.06)}
.wsn-items>div>span{width:18px;height:18px;flex-shrink:0;border-radius:50%;display:grid;place-items:center;font:900 10.5px/1 "Barlow Semi Condensed",sans-serif;background:color-mix(in srgb,var(--rk-mid) 15%,transparent);color:var(--mid)}
.wsn-items .watch>span{background:rgba(232,194,122,.15);color:#E8C27A}.wsn-items .fix>span{background:color-mix(in srgb,var(--mt-l) 15%,transparent);color:var(--m2)}
.wsn-items b{display:block;font:700 13px/1.25 Barlow,sans-serif;color:#F5F1E6}.wsn-items em{display:block;font-style:normal;font-size:11.5px;color:var(--mut);margin-top:2px;line-height:1.4}
.wsn-rc{margin-top:12px;font-size:12.5px;color:#C9CED7}
.wsn-rc .eyebrow{font:800 9px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.24em;color:var(--mid);margin-bottom:6px}
.wsn-rc .rc-v{margin:6px 0;padding-left:10px;border-left:3px solid var(--mid);color:#F5F1E6;line-height:1.45}
.wsn-rc .stv{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:8px 0}
.wsn-rc .stv>div{padding:8px 6px;border-radius:9px;background:#0C0F10;border:1px solid rgba(245,241,230,.06);text-align:center}
.wsn-rc .stv .l{display:block;font:700 8.5px/1.2 "Barlow Semi Condensed",sans-serif;letter-spacing:.12em;color:var(--mut);text-transform:uppercase}
.wsn-rc .stv .v{display:block;font:800 14px/1 "Barlow Semi Condensed",sans-serif;color:var(--m2);margin-top:4px}
.wsn-rc .rc-r{display:grid;grid-template-columns:24px 1fr 1fr 1fr 1fr;gap:6px;padding:6px 0;border-top:1px solid rgba(245,241,230,.06);font:700 12px/1 "Barlow Semi Condensed",sans-serif}
.wsn-rc .rc-n{margin:8px 0 0;padding-left:18px;color:var(--mut);line-height:1.5}
.wsn-rc .rc-coach{display:none}
.wsn-ana{margin-top:12px;font-size:13px;line-height:1.55;color:#D2CCBF}
.wsn-ana p{margin:0 0 10px}
.wsn-ana strong,.wsn-ana b{color:var(--m2)}
.wsn-ana p>strong:first-child,.wsn-ana p>b:first-child{display:block;font:800 9.5px/1.4 "Barlow Semi Condensed",sans-serif;letter-spacing:.22em;text-transform:uppercase;color:var(--mid)}
.wsn-ana ul,.wsn-ana ol{margin:4px 0 10px;padding-left:18px}
.wsn-ana .muted{color:var(--mut)}
.wsn-notes{margin:0 0 6px;padding-left:18px;font-size:12.5px;line-height:1.5;color:#C9CED7}
.wsn-acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
.wsn-acts button{all:unset;cursor:pointer;font:800 10.5px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.14em;color:var(--m2);padding:9px 11px;border-radius:8px;border:1px solid color-mix(in srgb,var(--mt-m) 35%,transparent)}
.wsn-acts button[disabled]{opacity:.5;cursor:default}
.wsn-acts button:focus-visible,.wsn-up:focus-within{outline:2px solid var(--m2);outline-offset:2px}
.wsn-up{margin-top:14px;padding:14px;border-radius:14px;border:1.5px dashed color-mix(in srgb,var(--mt-l) 45%,transparent);background:color-mix(in srgb,var(--mt-m) 5%,transparent);display:flex;gap:12px;align-items:center;cursor:pointer}
.wsn-up>span{flex:1;min-width:0}
.wsn-up b{display:block;font:800 13px/1.2 "Barlow Semi Condensed",sans-serif;letter-spacing:.06em;color:#F5F1E6}
.wsn-up em{display:block;font-style:normal;font-size:11.5px;color:var(--mut);margin-top:3px;line-height:1.4}
.wsn-up>i{font:800 10px/1 "Barlow Semi Condensed",sans-serif;font-style:normal;letter-spacing:.14em;color:var(--m2);padding:8px 10px;border-radius:8px;border:1px solid color-mix(in srgb,var(--mt-l) 40%,transparent)}
`; document.head.appendChild(st) }
