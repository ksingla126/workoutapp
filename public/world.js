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
  if (wsLog) return `<div class="ws-back"><button type="button" class="btn ghost sm" data-wslog="0">‹ Back to the island</button></div>` + viewHome(openLogger);
  const days = wsWeek(), k = ymd(sel), p = inProgram(sel) ? planFor(sel) : null, pick = wsPick(p, k), idx = days.findIndex(d => ymd(d) === k);
  const slides = days.map((d, i) => {
    const kk = ymd(d), pp = inProgram(d) ? planFor(d) : null, pk = wsPick(pp, kk);
    return `<div class="ws-slide${kk === k ? " on" : ""}" data-wsday="${kk}" role="group" aria-label="${DOW[i]} ${d.getDate()} · ${esc(wsShort(pp))}" aria-current="${kk === k}"><img src="/world/${pk.img}.webp" alt="" loading="${Math.abs(i - idx) <= 1 ? "eager" : "lazy"}" decoding="async" draggable="false"></div>`;
  }).join("");
  const pd = addDays(sel, -1), nd = addDays(sel, 1);
  const side = (d, cls) => { const kk = ymd(d), pp = inProgram(d) ? planFor(d) : null, pk = wsPick(pp, kk), c = pk.kind === "gym" ? "pg" : pk.kind === "run" ? "pa" : "ps";
    return `<button type="button" class="ws-peek ${cls}" data-wsgo="${kk}" aria-label="Go to ${wsDayTxt(d)}"><img src="/world/${pk.img}.webp" alt="" loading="lazy" draggable="false"></button><span class="ws-plab ${cls} ${c}"><b>${wsDayTxt(d)}</b>${esc(pk.kind === "gym" ? wsShort(pp) : pk.kind === "run" ? (pp && pp.t || "Trail") : "Camp")}</span>` };
  const kind = pick.kind, title = kind === "gym" ? "[SYSTEM] GATE SELECT" : kind === "run" ? "[SYSTEM] TRAIL SELECT" : "[SYSTEM] CAMP";
  let h = `<div class="ws-sky" aria-hidden="true"><i class="ws-shoot"></i></div><div class="ws ws-${kind}">`;
  h += `<div class="ws-frame"><span class="ws-c tl"></span><span class="ws-c tr"></span><span class="ws-c bl"></span><span class="ws-c br"></span>
    <div class="ws-bar"><span>${title}</span><span class="ws-idx">DAY ${idx + 1} / 7</span></div>
    <div class="ws-stage">${side(pd, "l")}${side(nd, "r")}<div class="ws-track" id="wsTrack">${slides}</div><div class="ws-clouds" aria-hidden="true"></div></div></div>`;
  h += `<div class="ws-daybar"><button type="button" data-wsgo="${ymd(pd)}">◀ ${wsDayTxt(pd)}</button><span>${wsDayTxt(sel)} · ${k === ymd(today) ? "TODAY" : kind === "gym" ? "GATE" : kind === "run" ? (WS_RUNTAG[pick.type] || "TRAIL") : "CAMP"}</span><button type="button" data-wsgo="${ymd(nd)}">${wsDayTxt(nd)} ▶</button></div>`;
  h += wsCard(p, k, pick);
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
  const tr = document.getElementById("wsTrack"); if (!tr) return;
  const wk = ymd(mondayOf(sel)), on = tr.querySelector(".ws-slide.on");
  const pos = el => el.offsetLeft;
  tr.scrollLeft = wsScroll && wsScroll.wk === wk ? wsScroll.left : (on ? pos(on) : 0);
  if (on && Math.abs(tr.scrollLeft - pos(on)) > 4) tr.scrollTo({ left: pos(on), behavior: "smooth" });
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
  wsLog = b.dataset.wslog === "1"; lastRenderKey = ""; render(); window.scrollTo(0, 0);
});

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
