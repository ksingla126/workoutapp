/* RankUp effects layer: rank emblems with auras that grow with the rank, the rank-up cinematic, XP-gain pop-ups after
   a workout moves a bar, rank-tinted rank cards and Gate portals. Everything respects Reduce Motion. */

const fxCalm = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches } catch (e) { return false } };

/* ---------- shard burst for the rank-up (canvas, ~1.4 s) ---------- */
function fxShards(cv, col) {
  if (!cv || fxCalm()) return;
  const dpr = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight; if (!W || !H) return;
  cv.width = W * dpr; cv.height = H * dpr; const g = cv.getContext("2d"); g.scale(dpr, dpr);
  const cx = W / 2, cy = H * 0.44, P = [];
  for (let i = 0; i < 70; i++) { const a = Math.random() * Math.PI * 2, v = 3 + Math.random() * 9;
    P.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, r: 2 + Math.random() * 5, rot: Math.random() * 6, vr: (Math.random() - .5) * .4, c: Math.random() < .3 ? "#fff" : col, life: 1 }) }
  const t0 = performance.now();
  (function step(t) {
    const k = (t - t0) / 1400; g.clearRect(0, 0, W, H); if (k > 1 || !cv.isConnected) return;
    P.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .22; p.vx *= .985; p.rot += p.vr; p.life = 1 - k;
      g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.c; g.shadowColor = col; g.shadowBlur = 12;
      g.beginPath(); g.moveTo(0, -p.r * 1.6); g.lineTo(p.r, 0); g.lineTo(0, p.r * 1.6); g.lineTo(-p.r, 0); g.closePath(); g.fill(); g.restore() });
    requestAnimationFrame(step);
  })(t0);
}

/* ---------- XP pop-ups: when a workout moves a group's bar, show how far ---------- */
let fxPrev = null;
function fxSnap() {
  try { if (typeof rankState !== "function" || !(S.profile && (S.profile.setup || Object.keys(S.logs).length))) return null;
    const R = rankState(); if (!R.place || R.place.pending) return null;
    const o = {}; R.groups.forEach(g => { if (g.num != null) o[g.id] = { v: g.num, name: g.name } }); return o } catch (e) { return null }
}
function fxXp() {
  const now = fxSnap(); if (!now) return; const before = fxPrev; fxPrev = now; if (!before) return;
  const ups = Object.keys(now).filter(k => before[k] && Math.floor(now[k].v) === Math.floor(before[k].v) && now[k].v - before[k].v >= 0.01 && now[k].v < 5);
  if (!ups.length || document.querySelector(".rk-up")) return;
  document.querySelectorAll(".fx-xpbox").forEach(e => e.remove());
  const box = document.createElement("div"); box.className = "fx-xpbox"; box.setAttribute("role", "status");
  box.innerHTML = ups.slice(0, 3).map((k, i) => { const a = before[k].v, b = now[k].v, f0 = a - Math.floor(a), f1 = b - Math.floor(b), r = Math.floor(b), col = RK_COL[Math.min(5, r + 1)];
    return `<div class="fx-xp" style="--rc:${col};--f0:${f0};--f1:${f1};animation-delay:${i * 120}ms">${rkBadge(b)}<div class="fx-xp-m"><div class="fx-xp-t"><b>${esc(now[k].name)}</b><span>+${Math.max(1, Math.round((b - a) * 100))}% XP</span></div><div class="fx-xp-bar"><i></i></div><div class="fx-xp-s">${Math.round(f1 * 100)}% to ${rkLetter(r + 1)}</div></div></div>` }).join("");
  document.body.appendChild(box);
  try { if (typeof gTone === "function") gTone([[660, 0, .08], [990, .07, .1], [1320, .14, .14]], .07) } catch (e) {}
  const close = () => { box.classList.add("out"); setTimeout(() => box.remove(), 350) }; box.onclick = close; setTimeout(close, 4200);
}
(function wrapNotify() {
  const go = () => { if (typeof rankNotify !== "function" || rankNotify.__fx) return; const orig = rankNotify;
    window.rankNotify = function () { orig.apply(this, arguments); try { fxXp() } catch (e) {} }; window.rankNotify.__fx = true };
  if (document.readyState === "complete") go(); else addEventListener("load", go); setTimeout(go, 1200);
})();

/* ---------- styles ---------- */
(() => { const st = document.createElement("style"); st.id = "fxStyles"; st.textContent = `
@property --fxa{syntax:"<angle>";inherits:false;initial-value:0deg}
/* emblems */
.fx-em{position:relative;display:inline-grid;place-items:center;flex:none;isolation:isolate}
.fx-em>i{position:absolute;pointer-events:none}
.fx-em .fx-aura{inset:-22%;border-radius:50%;background:radial-gradient(closest-side,color-mix(in srgb,var(--rc) 55%,transparent),transparent 75%);z-index:-1;opacity:.75}
.fx-em .fx-ring{inset:-16%;border-radius:50%;border:1.5px dashed color-mix(in srgb,var(--rc) 80%,#fff);opacity:.55;z-index:-1}
.fx-em .fx-rays{inset:-48%;z-index:-2;border-radius:50%;background:repeating-conic-gradient(from 0deg,color-mix(in srgb,var(--rc) 55%,transparent) 0 6deg,transparent 6deg 24deg);
  -webkit-mask:radial-gradient(closest-side,#000 25%,transparent 100%);mask:radial-gradient(closest-side,#000 25%,transparent 100%)}
.fx-em .fx-emb{inset:-10% -5% 10%;z-index:1}
.fx-em .fx-emb b{position:absolute;bottom:0;width:4px;height:4px;border-radius:50%;background:color-mix(in srgb,var(--rc) 60%,#fff);box-shadow:0 0 6px var(--rc);opacity:0}
.fx-em .fx-emb b:nth-child(1){left:18%}.fx-em .fx-emb b:nth-child(2){left:42%}.fx-em .fx-emb b:nth-child(3){left:64%}.fx-em .fx-emb b:nth-child(4){left:84%}
.fx-em .rk-l.big{position:relative;overflow:hidden}
.rk-l.g1,.rk-l.g2{filter:drop-shadow(0 0 3px color-mix(in srgb,var(--rc) 60%,transparent))}
.rk-l.g3,.rk-l.g4{filter:drop-shadow(0 0 5px color-mix(in srgb,var(--rc) 75%,transparent))}
.rk-l.g5{filter:drop-shadow(0 0 7px #F5C531)}
.fx-em .rk-l.big::after{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.55) 48%,transparent 62%);transform:translateX(-130%)}
/* rank cards: tinted by their rank, with a big ghost letter */
html .rk-group.tint{overflow:hidden;background:radial-gradient(130% 90% at 0% 0%,color-mix(in srgb,var(--tc) 20%,transparent),transparent 60%),linear-gradient(180deg,color-mix(in srgb,var(--gym) 5%,var(--surface)),var(--surface));
  border-color:color-mix(in srgb,var(--tc) 40%,var(--line))}
html .rk-group.tint::before{--c:var(--tc)}
.fx-wm{position:absolute;right:12px;bottom:-26px;font:900 104px/1 var(--display);color:transparent;-webkit-text-stroke:1.5px color-mix(in srgb,var(--tc) 40%,transparent);opacity:.5;pointer-events:none;letter-spacing:-.04em}
.rk-group .rk-head{position:relative;z-index:1}
.fx-chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:2px}
.fx-chip{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--muted);padding:2px 8px 2px 2px;border-radius:99px;background:color-mix(in srgb,var(--rc) 10%,transparent);border:1px solid color-mix(in srgb,var(--rc) 30%,transparent)}
.fx-chip b{display:grid;place-items:center;width:18px;height:18px;border-radius:50%;font:800 11px/1 var(--display);color:#fff;background:var(--rc)}
.fx-chip.gate{border-color:var(--coach);color:var(--ink)}.fx-chip.gate::after{content:"";width:7px;height:7px;border-radius:50%;background:var(--coach);box-shadow:0 0 6px var(--coach)}
/* Gate portals */
html .rk-alert.gate{position:relative;border:1.5px solid transparent;background:linear-gradient(var(--surface),var(--surface)) padding-box,conic-gradient(from var(--fxa),var(--coach),#7DE3FF,transparent 40%,var(--coach) 60%,#7DE3FF,transparent 90%,var(--coach)) border-box;padding-left:44px}
html .rk-alert.gate::before{content:"";position:absolute;left:12px;top:50%;width:22px;height:22px;margin-top:-11px;border-radius:50%;
  background:radial-gradient(circle,#0B1024 30%,transparent 32%),conic-gradient(from var(--fxa),var(--coach),#7DE3FF,#6A5CFF,var(--coach));box-shadow:0 0 12px color-mix(in srgb,var(--coach) 70%,transparent)}
html .rk-gate.open{position:relative;border:1.5px solid transparent;background:linear-gradient(var(--coach-soft),var(--coach-soft)) padding-box,conic-gradient(from var(--fxa),var(--coach),#7DE3FF,transparent 45%,var(--coach)) border-box}
/* XP pop-ups */
.fx-xpbox{position:fixed;left:50%;top:calc(12px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:58;width:min(420px,calc(100% - 24px));display:flex;flex-direction:column;gap:8px;pointer-events:auto}
.fx-xp{display:flex;gap:12px;align-items:center;padding:10px 14px;border-radius:14px;background:linear-gradient(135deg,#17205C,#0B1024);color:#E6ECFF;border:1px solid color-mix(in srgb,var(--rc) 60%,transparent);
  box-shadow:0 0 24px color-mix(in srgb,var(--rc) 35%,transparent),0 10px 24px rgba(0,0,0,.35)}
.fx-xp-m{flex:1;min-width:0}.fx-xp-t{display:flex;justify-content:space-between;gap:8px;font-size:14px}.fx-xp-t b{color:#fff}.fx-xp-t span{font:800 13px/1.4 var(--display);color:var(--rc);text-shadow:0 0 8px var(--rc)}
.fx-xp-bar{height:6px;border-radius:99px;background:rgba(255,255,255,.12);overflow:hidden;margin:6px 0 3px}.fx-xp-bar i{display:block;height:100%;width:calc(var(--f1) * 100%);border-radius:99px;background:linear-gradient(90deg,color-mix(in srgb,var(--rc) 70%,#fff),var(--rc));box-shadow:0 0 10px var(--rc)}
.fx-xp-s{font-size:11.5px;color:#9FB0D8}
.fx-xpbox.out{opacity:0;transform:translate(-50%,-20px);transition:all .3s}
/* rank-up cinematic */
.rk-up.fx-cine{background:radial-gradient(circle at 50% 44%,color-mix(in srgb,var(--rc) 30%,#05080C) 0%,rgba(5,8,12,.94) 60%);overflow:hidden}
.rk-up.fx-cine.out{opacity:0}
.fx-cine .fx-cv{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.fx-cine .fx-pillar{position:absolute;left:50%;top:-10%;bottom:-10%;width:180px;margin-left:-90px;background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--rc) 45%,transparent),rgba(255,255,255,.35),color-mix(in srgb,var(--rc) 45%,transparent),transparent);filter:blur(8px);opacity:0;pointer-events:none}
.fx-cine .fx-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}
.fx-cine .fx-sys{font:800 12px/1 var(--display);letter-spacing:.28em;color:#9FC2FF;text-transform:uppercase;text-shadow:0 0 10px rgba(110,160,255,.8)}
.fx-cine .fx-big{font:900 40px/1 var(--display);letter-spacing:.14em;color:#fff;text-shadow:0 0 18px var(--rc),0 0 40px var(--rc)}
.fx-cine .fx-swap{position:relative;width:200px;height:200px;display:grid;place-items:center}
.fx-cine .fx-swap>span{grid-area:1/1}
.fx-cine .fx-old{opacity:0}
.fx-cine .fx-wave{position:absolute;left:50%;top:50%;width:140px;height:140px;margin:-70px 0 0 -70px;border-radius:50%;border:3px solid var(--rc);box-shadow:0 0 30px var(--rc),inset 0 0 30px var(--rc);opacity:0}
.fx-cine h2{font-size:24px}.fx-cine .fx-arrow{opacity:.55;font-weight:600}
.fx-cine .btn{opacity:0}
.fx-cine .rk-up-in{transform:none}
@media (prefers-reduced-motion:no-preference){
  .fx-em.e3 .fx-ring,.fx-em.e4 .fx-ring,.fx-em.e5 .fx-ring{animation:fx-spin 12s linear infinite}
  .fx-em .fx-aura{animation:fx-breathe 3.2s ease-in-out infinite}
  .fx-em .fx-rays{animation:fx-spin 18s linear infinite}
  .fx-em .fx-emb b{animation:fx-rise 2.4s ease-out infinite}.fx-em .fx-emb b:nth-child(2){animation-delay:.6s}.fx-em .fx-emb b:nth-child(3){animation-delay:1.2s}.fx-em .fx-emb b:nth-child(4){animation-delay:1.8s}
  .fx-em .rk-l.big::after{animation:fx-sheen 4.5s ease-in-out 1.2s infinite}
  html .rk-alert.gate,html .rk-alert.gate::before,html .rk-gate.open{animation:fx-turn 3s linear infinite}
  .fx-xp{animation:fx-drop .45s cubic-bezier(.2,1.3,.4,1) both}.fx-xp-bar i{animation:fx-fill 1.1s cubic-bezier(.3,.9,.3,1) .35s both}
  .fx-xp .rk-l{animation:fx-pop .5s cubic-bezier(.2,1.6,.4,1) .2s both}
  .fx-cine .fx-pillar{animation:fx-pillar 1.6s ease-out .15s both}
  .fx-cine .fx-sys{animation:fx-in .4s ease-out .1s both}
  .fx-cine .fx-big{animation:fx-slam .5s cubic-bezier(.2,1.5,.4,1) 1s both}
  .fx-cine .fx-old{animation:fx-old 1s ease-in .05s both}
  .fx-cine .fx-new{animation:fx-new .55s cubic-bezier(.15,1.6,.35,1) .95s both}
  .fx-cine .fx-flash{animation:fx-flash .5s ease-out .92s both}
  .fx-cine .fx-wave{animation:fx-wave .8s ease-out 1s both}
  .fx-cine .rk-up-in{animation:fx-shake .35s linear 1s}
  .fx-cine h2,.fx-cine .rk-up-in>p{animation:fx-in .45s ease-out 1.25s both}
  .fx-cine .btn{animation:fx-in .4s ease-out 1.7s both}
}
@media (prefers-reduced-motion:reduce){.fx-cine .fx-old,.fx-cine .fx-wave{display:none}.fx-cine .btn{opacity:1}}
@keyframes fx-spin{to{transform:rotate(360deg)}}
@keyframes fx-turn{to{--fxa:360deg}}
@keyframes fx-breathe{50%{transform:scale(1.12);opacity:1}}
@keyframes fx-rise{0%{transform:translateY(0);opacity:0}15%{opacity:1}100%{transform:translateY(-46px);opacity:0}}
@keyframes fx-sheen{0%,70%{transform:translateX(-130%)}100%{transform:translateX(130%)}}
@keyframes fx-drop{from{transform:translateY(-30px) scale(.92);opacity:0}}
@keyframes fx-fill{from{width:calc(var(--f0) * 100%)}}
@keyframes fx-pop{from{transform:scale(.3);opacity:0}}
@keyframes fx-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes fx-pillar{0%{opacity:0;transform:scaleX(.2)}40%{opacity:.9;transform:scaleX(1)}100%{opacity:.35;transform:scaleX(.7)}}
@keyframes fx-old{0%{opacity:1;transform:scale(1)}60%{opacity:1;transform:scale(1.05) rotate(-3deg)}75%{transform:scale(1.08) rotate(3deg)}90%{transform:scale(1.12) rotate(-4deg);opacity:1}100%{opacity:0;transform:scale(1.6);filter:brightness(3) blur(4px)}}
@keyframes fx-new{from{opacity:0;transform:scale(2.6)}to{opacity:1;transform:scale(1)}}
@keyframes fx-flash{0%{opacity:0}20%{opacity:.85}100%{opacity:0}}
@keyframes fx-wave{0%{opacity:.9;transform:scale(.5)}100%{opacity:0;transform:scale(2.6)}}
@keyframes fx-slam{from{opacity:0;transform:scale(1.8);letter-spacing:.5em}to{opacity:1;transform:scale(1)}}
@keyframes fx-shake{0%,100%{transform:translate(0)}20%{transform:translate(-6px,3px)}40%{transform:translate(5px,-4px)}60%{transform:translate(-4px,2px)}80%{transform:translate(3px,-2px)}}
`; document.head.appendChild(st) })();
