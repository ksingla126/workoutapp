/* RankUp game skin: makes the app feel like a game without changing its colors.
   Look: System-window panels with corner brackets, a faint HUD grid, glowing XP bars, chamfered glowing buttons.
   Feel: bars fill when a screen opens, screens slide in, ticks burst with particles and a soft blip,
   quest and rank moments get a fanfare. Respects Reduce Motion and the Sound setting. */

/* ---------- sound and haptics ---------- */
let GX = null;
function gSoundOn() { try { return typeof userPrefs !== "function" || userPrefs().sound !== false } catch (e) { return true } }
function gTone(notes, vol) {
  if (!gSoundOn()) return;
  try { GX = GX || (typeof actx !== "undefined" && actx) || new (window.AudioContext || window.webkitAudioContext)(); if (GX.state === "suspended") GX.resume();
    const t = GX.currentTime; notes.forEach(([f, at, len, type]) => { const g = GX.createGain(), o = GX.createOscillator(); o.type = type || "triangle"; o.frequency.value = f;
      o.connect(g); g.connect(GX.destination); g.gain.setValueAtTime(.0001, t + at); g.gain.exponentialRampToValueAtTime(vol || .12, t + at + .015); g.gain.exponentialRampToValueAtTime(.0001, t + at + len); o.start(t + at); o.stop(t + at + len + .02) });
  } catch (e) {}
}
const gBlip = () => gTone([[880, 0, .09], [1320, .06, .12]], .08);
const gFanfare = () => gTone([[523, 0, .16], [659, .12, .16], [784, .24, .16], [1047, .36, .42]], .12);
const gBuzz = ms => { try { navigator.vibrate && navigator.vibrate(ms) } catch (e) {} };
const gCalm = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches } catch (e) { return false } };

/* ---------- particles ---------- */
function gBurst(el, opts) {
  if (!el || gCalm()) return; opts = opts || {};
  const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, n = opts.n || 10;
  const box = document.createElement("div"); box.className = "g-burst"; box.style.left = cx + "px"; box.style.top = cy + "px";
  for (let i = 0; i < n; i++) { const p = document.createElement("i"), a = (Math.PI * 2 * i) / n + Math.random() * .5, d = 22 + Math.random() * (opts.spread || 26);
    p.style.setProperty("--dx", Math.cos(a) * d + "px"); p.style.setProperty("--dy", Math.sin(a) * d + "px"); p.style.animationDelay = Math.random() * 60 + "ms"; if (opts.color) p.style.background = opts.color; box.appendChild(p) }
  if (opts.text) { const t = document.createElement("b"); t.textContent = opts.text; box.appendChild(t) }
  document.body.appendChild(box); setTimeout(() => box.remove(), 900);
}

/* ---------- reward moments ---------- */
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest(".chk,.q-chk:not(.static),[data-chk]"); if (!b) return;
  // the handlers flip the state first; look after they've run
  setTimeout(() => { const on = b.classList.contains("on") || b.getAttribute("aria-pressed") === "true" || (b.isConnected === false);
    const tgt = b.isConnected ? b : document.querySelector(`[data-qtick="${b.dataset.qtick}"],[data-chk="${b.dataset.chk}"]`);
    if (on && tgt) { gBurst(tgt, { text: b.dataset.qtick ? "+1" : "", n: 9 }); gBlip(); gBuzz(15) } }, 30);
}, true);
// louder for the big ones: quest complete, path accepted, Gate-level sets, rank-ups
(function wrapNotice() {
  const go = () => { if (typeof sysNotice !== "function" || sysNotice.__g) return; const orig = sysNotice;
    window.sysNotice = sysNotice = function (title, body, rank) { orig(title, body, rank);
      const big = /complete|cleared|accepted|Gate-level/i.test(title || ""); const n = document.querySelector(".sys-note:last-of-type");
      if (n) { n.classList.add("g-note"); if (big) n.classList.add("g-big") }
      if (big) { gFanfare(); gBuzz([40, 30, 60]); setTimeout(() => n && gBurst(n, { n: 18, spread: 60 }), 250) } };
    sysNotice.__g = true };
  if (document.readyState === "complete") go(); else addEventListener("load", go); setTimeout(go, 1500);
})();
const _gRankObs = new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.classList && n.classList.contains("rk-up")) { gFanfare(); gBuzz([60, 40, 80]); setTimeout(() => { const b = n.querySelector(".rk-l"); if (b) gBurst(b, { n: 24, spread: 90 }) }, 350) } })));
_gRankObs.observe(document.documentElement, { childList: true, subtree: false }); try { _gRankObs.observe(document.body, { childList: true }) } catch (e) { addEventListener("DOMContentLoaded", () => _gRankObs.observe(document.body, { childList: true })) }

/* ---------- screens slide in and bars fill when a tab opens ---------- */
let gLastTab = null;
function gameAfterRender() {
  const v = document.getElementById("view"); if (!v || typeof tab === "undefined") return;
  if (tab === gLastTab) return; gLastTab = tab;
  v.classList.remove("g-enter"); void v.offsetWidth; v.classList.add("g-enter");
  clearTimeout(gameAfterRender.t); gameAfterRender.t = setTimeout(() => v.classList.remove("g-enter"), 1400);
}

/* ---------- live workout ---------- */
const gLiveSeen = {};
function gameLive(box, info) {
  if (!box || info.type !== "gym") return;
  if (String(info.state || "").startsWith("-1|") && !gLiveSeen[info.k]) { gLiveSeen[info.k] = 1; gFanfare(); gBuzz([40, 30, 80]); setTimeout(() => { const m = box.querySelector(".lv-main"); if (m) gBurst(m, { n: 26, spread: 110, text: "WORKOUT CLEAR" }) }, 120) }
}
document.addEventListener("click", e => { const b = e.target.closest && e.target.closest("#lvDone"); if (!b) return; const r = b.getBoundingClientRect(), ghost = document.createElement("div");
  ghost.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;pointer-events:none`; document.body.appendChild(ghost);
  // after the tap the live view redraws as the rest card, so burst over that card's top edge, clear of "Up next"
  setTimeout(() => { const m = document.querySelector(".lv-main"); if (m) { const q = m.getBoundingClientRect(); ghost.style.cssText = `position:fixed;left:${q.left}px;top:${q.top - 6}px;width:${q.width}px;height:24px;pointer-events:none`; gBurst(ghost, { n: 14, spread: 50, text: "SET CLEAR" }); gBlip(); gBuzz(20) } ghost.remove() }, 20) }, true);

/* ---------- the skin ---------- */
(() => { const st = document.createElement("style"); st.id = "gameSkin"; st.textContent = `
:root{--g-glow:color-mix(in srgb,var(--gym) 55%,transparent);--g-edge:color-mix(in srgb,var(--gym) 38%,var(--line));--g-btn1:#6763F5;--g-btn2:#3E3BD3}
/* HUD backdrop: a faint grid and a glow from the top */
html body{background-color:var(--bg);background-image:radial-gradient(120% 60% at 50% -10%,color-mix(in srgb,var(--gym) 16%,transparent),transparent 60%),
  linear-gradient(color-mix(in srgb,var(--ink) 3.5%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in srgb,var(--ink) 3.5%,transparent) 1px,transparent 1px);
  background-size:100% 100%,28px 28px,28px 28px;background-attachment:fixed}
/* System windows: every panel gets a glassy edge and a top highlight */
html .card,html .hub-card,html .hub-week,html .hub-stat,html .hub-place>div{background:linear-gradient(180deg,color-mix(in srgb,var(--gym) 5%,var(--surface)),var(--surface));border-color:var(--g-edge);
  box-shadow:inset 0 1px 0 color-mix(in srgb,#fff 7%,transparent),0 0 0 1px color-mix(in srgb,var(--gym) 6%,transparent),0 10px 30px -18px var(--g-glow)}
/* corner brackets on the important windows */
html .hub-main,html .hub-card,html .card.gymcard,html .rk-group,html .q-logcard,html .tour-tip,html .hub-welcome{position:relative}
html .hub-main::before,html .hub-card::before,html .card.gymcard::before,html .rk-group::before,html .q-logcard::before,html .tour-tip::before,html .hub-welcome::before{content:"";position:absolute;inset:-1px;pointer-events:none;border-radius:inherit;
  --c:var(--gym);--l:14px;--w:2px;
  background:linear-gradient(var(--c),var(--c)) top left/var(--l) var(--w),linear-gradient(var(--c),var(--c)) top left/var(--w) var(--l),
  linear-gradient(var(--c),var(--c)) top right/var(--l) var(--w),linear-gradient(var(--c),var(--c)) top right/var(--w) var(--l),
  linear-gradient(var(--c),var(--c)) bottom left/var(--l) var(--w),linear-gradient(var(--c),var(--c)) bottom left/var(--w) var(--l),
  linear-gradient(var(--c),var(--c)) bottom right/var(--l) var(--w),linear-gradient(var(--c),var(--c)) bottom right/var(--w) var(--l);background-repeat:no-repeat;opacity:.9;filter:drop-shadow(0 0 4px var(--g-glow))}
html .hub-main.rest::before{--c:var(--good)}html .hub-main.run::before{--c:var(--run)}html .hub-main.clear::before,html .hub-card.complete::before{--c:var(--good)}
html .hub-main{box-shadow:0 0 0 1px color-mix(in srgb,var(--gym) 18%,transparent),0 18px 50px -24px var(--g-glow),inset 0 1px 0 color-mix(in srgb,#fff 8%,transparent)}
/* section labels: a diamond marker and a little glow */
html .hub-sys,html .q-sys{display:inline-flex;align-items:center;gap:7px;text-shadow:0 0 12px var(--g-glow)}
html .hub-sys::before,html .q-sys::before{content:"";width:6px;height:6px;background:currentColor;transform:rotate(45deg);box-shadow:0 0 8px currentColor;flex-shrink:0}
html .card h2,html .hub-main h2,html .rk-name,html .top-week{font-family:var(--display);letter-spacing:.01em}
html .hub-main h2{text-shadow:0 0 24px color-mix(in srgb,var(--gym) 35%,transparent)}
/* buttons: chamfered, glowing, they press in */
html .btn:not(.ghost),html .hub-go:not(.ghost),html .lv-cta{background:linear-gradient(180deg,var(--g-btn1),var(--g-btn2));border:0;color:#fff;
  clip-path:polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px);border-radius:0;box-shadow:none;filter:drop-shadow(0 6px 14px color-mix(in srgb,#4B48E8 45%,transparent));
  text-shadow:0 1px 0 rgba(0,0,0,.25);transition:transform .08s ease,filter .15s ease}
html .btn:not(.ghost):focus-visible,html .hub-go:focus-visible,html .lv-cta:focus-visible{outline:none;filter:drop-shadow(0 0 2px #fff) drop-shadow(0 0 2px #fff)}
html .btn.sm:not(.ghost){clip-path:polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)}
html .btn:not(.ghost):active,html .hub-go:active,html .lv-cta:active,html .hub-stat:active,html .seg button:active{transform:translateY(1px) scale(.98);filter:brightness(1.15) drop-shadow(0 2px 8px var(--g-glow))}
html .btn.ghost,html .hub-go.ghost{border:1px solid var(--g-edge);background:color-mix(in srgb,var(--gym) 8%,transparent);color:var(--ink);border-radius:10px}
html .hub-go{position:relative;overflow:hidden;letter-spacing:.02em}
html .hub-go:not(.ghost)::after{content:"";position:absolute;inset:0;background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.35) 50%,transparent 65%);transform:translateX(-120%);animation:g-sheen 3.6s ease-in-out 1s infinite}
html .hub-go.glow{filter:drop-shadow(0 0 18px color-mix(in srgb,#6763F5 75%,transparent));box-shadow:none;animation:g-pulse 2.2s ease-in-out infinite}
html .hub-go svg{fill:#fff}
/* segmented controls look like game menu tabs */
html .seg{background:color-mix(in srgb,var(--gym) 6%,var(--surface));border-color:var(--g-edge)}
html .seg button.on{background:linear-gradient(180deg,var(--g-btn1),var(--g-btn2));color:#fff;box-shadow:0 0 14px -2px var(--g-glow)}
/* XP bars: a groove, a glowing fill, segment ticks and a slow sheen */
html .bar,html .hub-xp,html .q-bar,html .rk-bar{position:relative;background:color-mix(in srgb,var(--ink) 9%,transparent);box-shadow:inset 0 1px 2px rgba(0,0,0,.35)}
html .bar i,html .hub-xp i,html .q-bar i,html .rk-bar i{position:relative;box-shadow:0 0 10px var(--g-glow);transform-origin:left center}
html .hub-xp{height:8px}
html .hub-xp::after,html .bar::after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 calc(10% - 1px),color-mix(in srgb,var(--bg) 70%,transparent) calc(10% - 1px) 10%);pointer-events:none}
html .hub-xp i::after,html .rk-bar i::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.45),transparent);background-size:40% 100%;background-repeat:no-repeat;animation:g-run 2.8s linear infinite}
html .hub-wbar i.on{box-shadow:0 0 8px var(--g-glow)}
/* the rank hexagon: a spinning ring around it */
html .hub-hexwrap{position:relative;width:62px;height:68px;display:grid;place-items:center;flex-shrink:0}
html .hub-hexwrap svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;animation:g-spin 14s linear infinite;pointer-events:none}
html .hub-hexwrap svg path{fill:none;stroke:var(--rc);stroke-width:1.2;stroke-dasharray:5 4;opacity:.8;filter:drop-shadow(0 0 3px var(--rc))}
html .hub-hex{filter:drop-shadow(0 0 12px color-mix(in srgb,var(--rc) 70%,transparent));text-shadow:0 0 10px rgba(255,255,255,.6)}
html .hub-stat b,html .rk-l{text-shadow:0 0 12px currentColor}
/* checkboxes glow when done */
html .q-chk.on,html .chk.on{box-shadow:0 0 0 3px color-mix(in srgb,var(--good) 25%,transparent),0 0 14px color-mix(in srgb,var(--good) 55%,transparent)}
html .q-card.complete .hub-sys{color:var(--good)}
/* the tab bar: a HUD dock with a glowing active slot */
html nav.tabs{background:color-mix(in srgb,var(--surface) 88%,transparent);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-color:var(--g-edge);box-shadow:0 -10px 30px -20px var(--g-glow)}
html nav.tabs button{transition:transform .1s ease,color .15s}
html nav.tabs button:active{transform:scale(.92)}
html nav.tabs button.on{color:var(--ink);background:radial-gradient(70% 90% at 50% 0%,color-mix(in srgb,var(--gym) 30%,transparent),transparent 75%),var(--surface-2)}
html nav.tabs button.on svg{color:var(--gym);filter:drop-shadow(0 0 6px var(--g-glow))}
html nav.tabs button.on::after{content:"";position:absolute;bottom:3px;left:50%;width:6px;height:6px;margin-left:-3px;background:var(--gym);transform:rotate(45deg);box-shadow:0 0 8px var(--gym)}
/* System notices look like the anime's blue windows */
html .sys-note.g-note{border:1px solid var(--g-edge);box-shadow:0 0 0 1px color-mix(in srgb,var(--gym) 25%,transparent),0 10px 40px -10px var(--g-glow)}
html .sys-note.g-big{animation:g-shake .45s ease 1}
/* live workout: the same HUD */
html .live{background-color:var(--bg);background-image:radial-gradient(120% 50% at 50% -10%,color-mix(in srgb,var(--gym) 20%,transparent),transparent 60%),
  linear-gradient(color-mix(in srgb,var(--ink) 3.5%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in srgb,var(--ink) 3.5%,transparent) 1px,transparent 1px);background-size:100% 100%,28px 28px,28px 28px}
html .lv-back{width:42px;height:42px;padding:0;display:grid;place-items:center;font-size:26px;border:1px solid var(--g-edge);background:color-mix(in srgb,var(--gym) 10%,var(--surface));clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)}
html .lv-title .eyebrow{display:inline-flex;align-items:center;gap:6px;font:700 11px var(--body);letter-spacing:.16em;text-transform:uppercase;color:var(--gym)}
html .lv-title .eyebrow::before,html .lv-label::before,html .lv-next .lv-label::before{content:"";width:6px;height:6px;background:currentColor;transform:rotate(45deg);box-shadow:0 0 8px currentColor;flex-shrink:0}
html .lv-el{color:var(--ink);text-shadow:0 0 14px var(--g-glow)}
html .lv-xp{position:relative;height:10px;border-radius:5px;background:color-mix(in srgb,var(--ink) 9%,transparent);box-shadow:inset 0 1px 2px rgba(0,0,0,.35);overflow:hidden;margin-top:-4px}
html .lv-xp i{display:block;height:100%;border-radius:5px;background:linear-gradient(90deg,var(--g-btn2),var(--gym));box-shadow:0 0 12px var(--g-glow);transition:width .5s cubic-bezier(.2,.8,.3,1)}
html .lv-xp::after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 calc(10% - 1px),color-mix(in srgb,var(--bg) 70%,transparent) calc(10% - 1px) 10%)}
html .lv-main{position:relative;color:var(--ink);border:1px solid var(--g-edge);border-radius:20px;background:linear-gradient(170deg,color-mix(in srgb,var(--gym) 16%,var(--surface)),var(--surface) 70%);
  box-shadow:0 0 0 1px color-mix(in srgb,var(--gym) 15%,transparent),0 20px 50px -25px var(--g-glow),inset 0 1px 0 color-mix(in srgb,#fff 8%,transparent)}
html .lv-main::before,html .lv-next::before{content:"";position:absolute;inset:-1px;pointer-events:none;border-radius:inherit;--c:var(--gym);--l:16px;--w:2px;
  background:linear-gradient(var(--c),var(--c)) top left/var(--l) var(--w),linear-gradient(var(--c),var(--c)) top left/var(--w) var(--l),linear-gradient(var(--c),var(--c)) top right/var(--l) var(--w),linear-gradient(var(--c),var(--c)) top right/var(--w) var(--l),
  linear-gradient(var(--c),var(--c)) bottom left/var(--l) var(--w),linear-gradient(var(--c),var(--c)) bottom left/var(--w) var(--l),linear-gradient(var(--c),var(--c)) bottom right/var(--l) var(--w),linear-gradient(var(--c),var(--c)) bottom right/var(--w) var(--l);background-repeat:no-repeat;filter:drop-shadow(0 0 4px var(--g-glow))}
html .lv-next::before{--l:10px;opacity:.7}
html .lv-label{display:inline-flex;align-items:center;gap:7px;font:700 12px var(--body);letter-spacing:.16em;text-transform:uppercase;color:var(--gym);opacity:1;text-shadow:0 0 12px var(--g-glow)}
html .lv-ex{text-shadow:0 0 26px color-mix(in srgb,var(--gym) 40%,transparent)}
html .lv-inputs input{border:1px solid var(--g-edge);background:color-mix(in srgb,var(--bg) 60%,var(--surface));border-radius:0;clip-path:polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px);box-shadow:inset 0 0 18px -8px var(--g-glow);color:var(--ink)}
html .lv-inputs input:focus{outline:none;border-color:var(--gym);box-shadow:inset 0 0 22px -6px var(--g-glow)}
html .lv-inputs label span{letter-spacing:.08em;text-transform:uppercase;font-size:11px}
html .lv-inputs b{color:var(--gym);text-shadow:0 0 10px var(--g-glow)}
html .lv-note{color:var(--muted)}
/* rest: gold countdown that drains */
html .lv-main.rest{--c2:var(--warn);color:var(--ink);border-color:color-mix(in srgb,var(--warn) 40%,var(--line));background:linear-gradient(170deg,color-mix(in srgb,var(--warn) 12%,var(--surface)),var(--surface) 70%);box-shadow:0 20px 50px -25px color-mix(in srgb,var(--warn) 50%,transparent)}
html .lv-main.rest::before{--c:var(--warn)}html .lv-main.rest .lv-label{color:var(--warn);text-shadow:0 0 12px color-mix(in srgb,var(--warn) 50%,transparent)}
html .lv-main.rest .lv-clock{color:var(--warn);text-shadow:0 0 30px color-mix(in srgb,var(--warn) 55%,transparent)}
html .lv-ring{height:10px;border-radius:5px;background:color-mix(in srgb,var(--ink) 9%,transparent);box-shadow:inset 0 1px 2px rgba(0,0,0,.35)}
html .lv-ring i{background:linear-gradient(90deg,color-mix(in srgb,var(--warn) 70%,#000),var(--warn));box-shadow:0 0 12px color-mix(in srgb,var(--warn) 60%,transparent);border-radius:5px}
html .lv-main.rest .btn.ghost{color:var(--ink);border-color:color-mix(in srgb,var(--warn) 40%,var(--line));background:color-mix(in srgb,var(--warn) 8%,transparent)}
/* go / complete: green */
html .lv-main.go{color:var(--ink);border-color:color-mix(in srgb,var(--good) 45%,var(--line));background:linear-gradient(170deg,color-mix(in srgb,var(--good) 14%,var(--surface)),var(--surface) 70%);box-shadow:0 20px 50px -25px color-mix(in srgb,var(--good) 55%,transparent)}
html .lv-main.go::before{--c:var(--good)}html .lv-main.go .lv-label{color:var(--good);text-shadow:0 0 12px color-mix(in srgb,var(--good) 50%,transparent)}
html .lv-main.go .lv-clock,html .lv-main.go .lv-ex{color:var(--good);text-shadow:0 0 30px color-mix(in srgb,var(--good) 55%,transparent)}
html .lv-main.go .lv-clock{animation:g-beat 1s ease-in-out infinite}
html .lv-main [data-go]{background:linear-gradient(180deg,#2FCB7F,#16955A)!important;color:#fff!important;filter:drop-shadow(0 6px 16px color-mix(in srgb,#2FCB7F 45%,transparent))}
/* up next and the exercise list read like a quest log */
html .lv-next{position:relative;border-color:var(--g-edge);background:linear-gradient(180deg,color-mix(in srgb,var(--gym) 6%,var(--surface)),var(--surface))}
html .lv-next .lv-label{display:inline-flex}
html .lv-list .lv-row{border-top-color:color-mix(in srgb,var(--gym) 18%,var(--line));align-items:center}
html .lv-list .lv-row span:first-child{display:inline-flex;align-items:center;gap:9px}
html .lv-list .lv-row span:first-child::before{content:"";width:7px;height:7px;border:1.5px solid currentColor;transform:rotate(45deg);flex-shrink:0;opacity:.7}
html .lv-list .lv-row.done span:first-child::before{background:var(--good);border-color:var(--good);box-shadow:0 0 8px var(--good);opacity:1}
html .lv-list .lv-row.cur{color:var(--ink);text-shadow:0 0 12px var(--g-glow)}html .lv-list .lv-row:not(:disabled):not(.cur):active{background:color-mix(in srgb,var(--gym) 10%,transparent)}html .lv-list .lv-row.cur span:first-child::before{background:var(--gym);border-color:var(--gym);box-shadow:0 0 10px var(--gym);opacity:1;animation:g-beat 1.4s ease-in-out infinite}
html .lv-list .lv-row.done span:first-child::after{content:""}
html .live .lv-main,html .live .lv-next,html .live .lv-list{animation:g-in .35s cubic-bezier(.2,.8,.3,1) both}html .live .lv-next{animation-delay:.05s}html .live .lv-list{animation-delay:.1s}
@keyframes g-beat{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
@media (prefers-reduced-motion:reduce){html .live *{animation:none!important;transition:none!important}}
/* particles */
.g-burst{position:fixed;width:0;height:0;z-index:3000;pointer-events:none}
.g-burst i{position:absolute;left:-3px;top:-3px;width:6px;height:6px;background:var(--gym);transform:rotate(45deg);box-shadow:0 0 8px var(--gym);animation:g-fly .7s cubic-bezier(.2,.7,.3,1) forwards}
.g-burst i:nth-child(3n){background:var(--good);box-shadow:0 0 8px var(--good)}.g-burst i:nth-child(4n){background:var(--warn);box-shadow:0 0 8px var(--warn)}
.g-burst b{position:absolute;left:0;top:-10px;transform:translateX(-50%);font:800 18px var(--display);color:var(--good);text-shadow:0 0 10px var(--good);animation:g-up .8s ease-out forwards;white-space:nowrap}
/* a screen slides in, its parts one after another, and its bars fill */
#view.g-enter>*{animation:g-in .42s cubic-bezier(.2,.8,.3,1) both}
#view.g-enter>.hub>*{animation:g-in .42s cubic-bezier(.2,.8,.3,1) both}
#view.g-enter>*:nth-child(2),#view.g-enter>.hub>*:nth-child(2){animation-delay:.05s}#view.g-enter>*:nth-child(3),#view.g-enter>.hub>*:nth-child(3){animation-delay:.1s}
#view.g-enter>*:nth-child(4),#view.g-enter>.hub>*:nth-child(4){animation-delay:.15s}#view.g-enter>*:nth-child(n+5),#view.g-enter>.hub>*:nth-child(n+5){animation-delay:.2s}
#view.g-enter .bar i,#view.g-enter .hub-xp i,#view.g-enter .q-bar i,#view.g-enter .rk-bar i{animation:g-fill .9s cubic-bezier(.2,.8,.3,1) .25s both}
#view.g-enter .hub-wbar i.on{animation:g-pop .3s ease both}#view.g-enter .hub-wbar i.on:nth-child(2){animation-delay:.08s}#view.g-enter .hub-wbar i.on:nth-child(3){animation-delay:.16s}#view.g-enter .hub-wbar i.on:nth-child(n+4){animation-delay:.24s}
@keyframes g-in{from{opacity:0;transform:translateY(10px)}}
@keyframes g-fill{from{transform:scaleX(0)}}
@keyframes g-pop{from{transform:scaleY(0)}}
@keyframes g-sheen{0%{transform:translateX(-120%)}35%,100%{transform:translateX(120%)}}
@keyframes g-run{from{background-position:-60% 0}to{background-position:160% 0}}
@keyframes g-spin{to{transform:rotate(360deg)}}
@keyframes g-pulse{0%,100%{filter:drop-shadow(0 0 10px color-mix(in srgb,#6763F5 55%,transparent))}50%{filter:drop-shadow(0 0 22px color-mix(in srgb,#8F8BFF 85%,transparent))}}
@keyframes g-fly{0%{transform:translate(0,0) rotate(45deg) scale(1);opacity:1}100%{transform:translate(var(--dx),var(--dy)) rotate(45deg) scale(.2);opacity:0}}
@keyframes g-up{0%{opacity:0;transform:translate(-50%,6px)}25%{opacity:1}100%{opacity:0;transform:translate(-50%,-30px)}}
@keyframes g-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}50%{transform:translateX(4px)}75%{transform:translateX(-2px)}}
@media (prefers-reduced-motion:reduce){#view.g-enter *,html .hub-go::after,html .hub-go.glow,html .hub-hexwrap svg,html .hub-xp i::after,html .rk-bar i::after,html .sys-note.g-big{animation:none!important}}
`; document.head.appendChild(st) })();
