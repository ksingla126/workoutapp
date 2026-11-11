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
const WS_LINE = {
  lab1: "Easy run. A garden maze; the lit path leads to the pavilion.", lab2: "Easy run. One path wound into the sandstone, no wrong turns.", lab3: "Easy run. A wisp leads at an easy pace and waits if you push too hard.",
  road1: "Long run. Through the gate and across the isles to the citadel.", road3: "Long run. Five isles joined by bridges of light; the shrine is the end.",
  hill1: "Hill sprints. Up the switchbacks, flag to flag, and walk back down.", hill2: "Hill sprints. Flight by flight up the pinnacle to the shrine.",
  int1: "Hard repeats round the arena, easy between them.", tempo1: "Hold a steady, comfortably hard pace across the bridge.",
  fart1: "Easy running across the plain; surge when the storm strikes.", rec1: "Slow and short. No pace to chase.", race1: "Race day. The final gate."
};
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

function viewWorld(openLogger) {
  if (wsLog) return `<div class="ws-back"><button type="button" class="btn ghost sm" data-wslog="0">‹ Back to the island</button></div>` + viewHome(openLogger);
  const days = wsWeek(), k = ymd(sel), p = planFor(sel), pick = wsPick(p, k), idx = days.findIndex(d => ymd(d) === k);
  const slides = days.map((d, i) => {
    const kk = ymd(d), pp = inProgram(d) ? planFor(d) : null, pk = wsPick(pp, kk), on = kk === k, done = !!S.logs[kk];
    return `<button type="button" class="ws-slide${on ? " on" : ""}${pk.kind === "run" ? " run" : pk.kind === "rest" ? " rest" : ""}" data-wsday="${kk}" aria-label="${DOW[i]} ${d.getDate()} · ${esc(wsShort(pp))}" aria-current="${on}">
      <img src="/world/${pk.img}.webp" alt="" loading="${Math.abs(i - idx) <= 1 ? "eager" : "lazy"}" decoding="async" draggable="false">
      <span class="ws-cap"><b>${DOW[i].toUpperCase()} ${d.getDate()}${kk === ymd(today) ? " · TODAY" : ""}</b><span>${esc(wsShort(pp))}${done ? " · cleared ✓" : ""}</span></span></button>`;
  }).join("");
  const kind = pick.kind, col = kind === "run" ? "run" : kind === "rest" ? "rest" : "gym";
  const title = kind === "gym" ? `[SYSTEM] GATE SELECT` : kind === "run" ? `[SYSTEM] TRAIL SELECT` : `[SYSTEM] CAMP`;
  let h = `<div class="ws-sky" aria-hidden="true"></div><div class="ws ws-${col}">`;
  h += `<div class="ws-frame"><span class="ws-c tl"></span><span class="ws-c tr"></span><span class="ws-c bl"></span><span class="ws-c br"></span>
    <div class="ws-bar"><span>${title}</span><span class="ws-wk"><button type="button" data-wk="-1" aria-label="Previous week" ${weekOf(sel) <= 1 ? "disabled" : ""}>‹</button>WEEK ${weekOf(sel)}<button type="button" data-wk="1" aria-label="Next week" ${weekOf(sel) >= WEEKS ? "disabled" : ""}>›</button></span></div>
    <div class="ws-track" id="wsTrack">${slides}</div></div>`;
  h += wsCard(p, k, pick);
  return h + `</div>`;
}
function wsCard(p, k, pick) {
  const log = S.logs[k], isToday = k === ymd(today), d = parseYmd(k), when = `${DOW[dowOf(d)].toUpperCase()} ${d.getDate()}${isToday ? " · TODAY" : ""}`;
  const running = TM.start && TM.date === k;
  let line, title, sub = "", stats = [], btn = "";
  if (!p) {
    line = "THE CAMP"; title = "THE CAMP"; sub = `Your plan starts ${fmtDate(START)}.`;
  } else if (p.type === "rest") {
    line = isToday ? "YOU HAVE MADE CAMP" : `CAMP · ${when}`; title = "THE CAMP"; sub = "Rest day. Recovery is part of the climb; your Daily Seals still count.";
    stats = ["NO GATE TODAY"];
    btn = `<button type="button" class="ws-go" data-goto-tab="hub">TEND THE DAILY SEALS</button>`;
  } else if (p.type === "gym") {
    const ex = p.ex || [], sets = ex.reduce((t, e) => t + (e.sets || 0), 0);
    line = log ? `GATE CLEARED · ${when}` : isToday ? "A GATE HAS OPENED" : `GATE · ${when}`;
    title = `${String(p.name || "Gym").toUpperCase()} GATE`; sub = `${pick.name}. ${ex.length ? `Each floor is an exercise, each mob a set.` : "This routine has no exercises yet."}`;
    stats = ex.length ? [`${ex.length} FLOORS`, `${sets} MOBS`, `~${typeof estMin === "function" ? estMin(ex) : 50} MIN`] : [];
    btn = !ex.length ? `<button type="button" class="ws-go" data-c-gotoplan="1">ADD EXERCISES</button>`
      : log ? `<button type="button" class="ws-go done" data-wslog="1">GATE CLEARED ✓ · VIEW LOG</button>`
      : running ? `<button type="button" class="ws-go" data-openlive="1">RETURN TO THE GATE</button>`
      : isToday ? `<button type="button" class="ws-go" id="tmStart">ENTER THE GATE</button>`
      : k < ymd(today) ? `<button type="button" class="ws-go ghost" data-wslog="1">LOG THIS GATE</button>`
      : `<button type="button" class="ws-go ghost" disabled>OPENS ${when}</button>`;
  } else {
    line = log ? `TRAIL CLEARED · ${when}` : isToday ? "A TRAIL HAS OPENED" : `TRAIL · ${when}`;
    title = pick.name.toUpperCase(); sub = `${WS_LINE[pick.img] || ""} ${p.t ? `<b>${esc(p.t)}</b>` : ""}${p.d ? ` · ${esc(p.d)}` : ""}`;
    btn = log ? `<button type="button" class="ws-go done" data-wslog="1">TRAIL CLEARED ✓ · VIEW LOG</button>`
      : running ? `<button type="button" class="ws-go" data-openlive="1">RETURN TO THE TRAIL</button>`
      : isToday ? `<button type="button" class="ws-go" id="tmStart">BEGIN THE TRAIL</button>`
      : k < ymd(today) ? `<button type="button" class="ws-go ghost" data-wslog="1">LOG THIS TRAIL</button>`
      : `<button type="button" class="ws-go ghost" disabled>OPENS ${when}</button>`;
  }
  const menu = p && typeof dayMenu === "function" ? dayMenu(p, k, log) : "";
  return `<div class="ws-card" id="wsCard"><div class="ws-line"><span class="ws-bang">!</span>[SYSTEM] ${line}</div>
    <div class="ws-title">${esc(title)}</div><div class="ws-sub">${sub}</div>
    ${stats.length ? `<div class="ws-stats">${stats.map(s => `<span>${s}</span>`).join("")}</div>` : ""}
    ${btn}<div class="ws-menu">${menu}${p ? `<button type="button" class="link small" data-wslog="1">${log ? "View the log" : "Open the full log"}</button>` : ""}</div></div>`;
}
// after each render: keep the carousel where it was, centre the selected island, and pick the day that ends in the middle
function wsAfter() {
  const tr = document.getElementById("wsTrack"); if (!tr) return;
  const wk = ymd(mondayOf(sel)), on = tr.querySelector(".ws-slide.on");
  const centre = el => el.offsetLeft - (tr.clientWidth - el.offsetWidth) / 2;
  tr.scrollLeft = wsScroll && wsScroll.wk === wk ? wsScroll.left : (on ? centre(on) : 0);
  if (on && Math.abs(tr.scrollLeft - centre(on)) > 4) tr.scrollTo({ left: centre(on), behavior: "smooth" });
  let t = 0;
  tr.addEventListener("scroll", () => {
    wsScroll = { wk, left: tr.scrollLeft }; clearTimeout(t);
    t = setTimeout(() => {
      const mid = tr.scrollLeft + tr.clientWidth / 2; let best = null, bd = 1e9;
      tr.querySelectorAll(".ws-slide").forEach(s => { const c = s.offsetLeft + s.offsetWidth / 2, dd = Math.abs(c - mid); if (dd < bd) { bd = dd; best = s } });
      if (best && best.dataset.wsday !== ymd(sel)) { sel = parseYmd(best.dataset.wsday); wsScroll = { wk, left: tr.scrollLeft }; render() }
    }, 140);
  }, { passive: true });
  tr.querySelectorAll(".ws-slide").forEach(s => s.onclick = () => { if (s.dataset.wsday === ymd(sel)) return; tr.scrollTo({ left: centre(s), behavior: "smooth" }) });
}
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
.ws-sky{position:fixed;inset:0;z-index:0;pointer-events:none;background:#03050A ${WS_SKY} center top/cover no-repeat}
body.ws-page{background:#03050A}
body.ws-page #view>*:not(.ws-sky){position:relative;z-index:1}
body.ws-page #top{position:relative;z-index:1}
.ws{--wc:#7FC8A9;--wd:rgba(34,160,107,.7);--wg:rgba(34,160,107,.35);color:#F5F1E6;display:flex;flex-direction:column;gap:12px;margin:0 -14px}
.ws.ws-run{--wc:#F4C48E;--wd:rgba(224,168,103,.7);--wg:rgba(224,168,103,.32)}
.ws.ws-rest{--wc:#C9D4DE;--wd:rgba(143,163,184,.6);--wg:rgba(143,163,184,.25)}
.ws-frame{position:relative;border:1px solid rgba(127,200,169,.2);border-radius:6px;background:rgba(4,10,10,.18);overflow:hidden}
.ws-frame::after{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(255,255,255,.02) 0 1px,transparent 1px 3px)}
.ws-c{position:absolute;width:20px;height:20px;border:0 solid var(--wc);z-index:2}
.ws-c.tl{left:8px;top:8px;border-left-width:2px;border-top-width:2px}.ws-c.tr{right:8px;top:8px;border-right-width:2px;border-top-width:2px}
.ws-c.bl{left:8px;bottom:8px;border-left-width:2px;border-bottom-width:2px}.ws-c.br{right:8px;bottom:8px;border-right-width:2px;border-bottom-width:2px}
.ws-bar{display:flex;justify-content:space-between;align-items:center;margin:16px 20px 0;padding-bottom:8px;border-bottom:1px solid;border-image:linear-gradient(90deg,var(--wc),transparent) 1;font:800 10px/1 var(--display);letter-spacing:.24em;color:var(--wc);text-shadow:0 0 8px var(--wg)}
.ws-wk{display:flex;align-items:center;gap:6px;color:#97A1B8;text-shadow:none}
.ws-wk button{background:none;border:0;color:#F5F1E6;font:700 16px/1 var(--display);padding:2px 6px;cursor:pointer}.ws-wk button:disabled{opacity:.25}
.ws-track{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding:0 9%;gap:0;-webkit-overflow-scrolling:touch}
.ws-track::-webkit-scrollbar{display:none}
.ws-slide{flex:0 0 82%;scroll-snap-align:center;position:relative;background:none;border:0;padding:0;margin:0;cursor:pointer;color:inherit;opacity:.5;transform:scale(.86);transition:opacity .3s,transform .3s}
.ws-slide.on{opacity:1;transform:none}
.ws-slide img{display:block;width:100%;aspect-ratio:780/880;height:auto;user-select:none;-webkit-user-drag:none}
.ws-cap{position:absolute;left:0;right:0;bottom:6px;display:flex;flex-direction:column;align-items:center;gap:2px;font:800 10px/1.2 var(--display);letter-spacing:.16em;color:#7FC8A9;text-shadow:0 1px 4px #000}
.ws-slide.run .ws-cap{color:#F4C48E}.ws-slide.rest .ws-cap{color:#A9B6C4}
.ws-cap span{font:600 11px/1.2 var(--body);letter-spacing:0;color:#CFC9BA}
.ws-card{margin:0 2px;padding:14px;border-radius:4px;background:linear-gradient(180deg,rgba(10,14,13,.95),rgba(6,8,8,.95));border:1px solid var(--wd);box-shadow:0 0 0 1px rgba(0,0,0,.6),0 0 28px -10px var(--wd)}
.ws-line{display:flex;align-items:center;gap:8px;font:800 10px/1 var(--display);letter-spacing:.24em;color:var(--wc)}
.ws-bang{padding:3px 6px;border:1px solid var(--wc)}
.ws-title{font:900 32px/1 var(--display);margin-top:10px;letter-spacing:.02em;color:var(--wc);text-shadow:0 0 18px var(--wg)}
.ws-sub{font-size:13px;line-height:1.45;color:#CFC9BA;margin-top:6px}.ws-sub b{color:#F5F1E6}
.ws-stats{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px}
.ws-stats span{padding:6px 9px;border-radius:3px;background:rgba(0,0,0,.35);border:1px solid var(--wd);font:800 11px/1 var(--display);letter-spacing:.1em;color:var(--wc)}
.ws-go{display:block;width:100%;height:52px;margin-top:12px;border:0;cursor:pointer;clip-path:polygon(14px 0,calc(100% - 14px) 0,100% 50%,calc(100% - 14px) 100%,14px 100%,0 50%);background:linear-gradient(180deg,#22A06B,#1C7A52);font:800 16px/1 var(--display);letter-spacing:.2em;color:#04140C}
.ws-run .ws-go{background:linear-gradient(180deg,#E0A867,#9C6A2E);color:#1A0E02}.ws-rest .ws-go{background:linear-gradient(180deg,#5E6B78,#3A4450);color:#F5F1E6}
.ws-go.ghost,.ws-go:disabled{background:rgba(255,255,255,.06);color:#97A1B8}.ws-go.done{background:rgba(34,160,107,.15);color:#7FC8A9}
.ws-run .ws-go.done{background:rgba(224,168,103,.15);color:#F4C48E}
.ws-menu{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 14px;margin-top:10px}
.ws-menu .daymenu{display:contents}.ws-menu .link{color:#97A1B8}
.ws-back{margin-bottom:10px}
body.ws-page .seg{background:rgba(8,12,12,.72);border:1px solid rgba(127,200,169,.2);box-shadow:none}
body.ws-page .seg button{color:#97A1B8}
body.ws-page .seg button.on{background:linear-gradient(180deg,rgba(34,160,107,.4),rgba(34,160,107,.16));color:#DEF1E9;box-shadow:inset 0 0 0 1px rgba(127,200,169,.5)}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
})();
