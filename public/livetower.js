/* Live mode for gym workouts, tower style (design F). The whole screen is drawn here; Live mode's logic is untouched:
   renderLive() asks lvtHtml() for the markup, and bindLive() wires the same ids it always has
   (lvBack, lvEl, lvW, lvR, lvM, lvDone, lvRest, lvSkip, lvStart, lvFinish, data-lvjump).
   Exercises are floors of a tower, sets are mobs. Warm-ups are small mobs, the floor's heaviest working set is an elite,
   and a set that would clear a rank Gate is the Gate boss, drawn in the colour of the rank it unlocks. */
const LVT_SHADE = "M0 -20 C9 -20 14 -12 14 -2 C14 7 15 13 18 18 C12 16 9 19 5 15.5 C2 19 -2 19 -5 15.5 C-9 19 -12 16 -18 18 C-15 13 -14 7 -14 -2 C-14 -12 -9 -20 0 -20 Z";
const LVT_HOOD = "M-9 -6 C-9 -15 9 -15 9 -6 C9 -1 5 2 0 2 C-5 2 -9 -1 -9 -6 Z";
const LVT_HORNS = "M-9 -15 C-13 -20 -15 -25 -13 -30 C-11 -24 -7 -21 -4 -19 Z M9 -15 C13 -20 15 -25 13 -30 C11 -24 7 -21 4 -19 Z";
const LVT_CROWN = "M-11 -18 L-13 -31 L-6 -23 L0 -34 L6 -23 L13 -31 L11 -18 Z";
const LVT_RUNES = ["M-1 -9 V9 M-1 -9 L5 -4 M-1 -2 L5 3", "M0 -9 V9 M-5 -5 L5 5", "M-5 9 L0 -9 L5 9 M-3 2 H3", "M-4 -9 V9 M-4 -9 L4 -3 L-4 3", "M0 -9 V9 M-5 -9 L0 -3 L5 -9", "M-5 -9 L5 9 M5 -9 L-5 9",
  "M-4 -9 V9 M4 -9 V9 M-4 -6 L4 6", "M0 -9 L5 0 L0 9 L-5 0 Z", "M-4 -9 V9 M-4 0 L4 -9 M-4 0 L4 9", "M0 -9 V9 M0 0 L5 -5 M0 4 L-5 -1", "M-5 -9 H5 M0 -9 V9 M-4 9 H4", "M-5 -6 L0 -9 L5 -6 M0 -9 V9"];
const LVT_KIND = { imp: "Warm-up", mob: "Mob", elite: "Elite", boss: "Gate boss" };

function lvtMix(a, b, t) { const h = x => [1, 3, 5].map(i => parseInt(x.slice(i, i + 2), 16)), A = h(a), B = h(b); return "#" + A.map((x, i) => Math.round(x + (B[i] - x) * t).toString(16).padStart(2, "0")).join("") }
function lvtRank() { try { const H = hubRank(); return H.un ? 0 : Math.min(5, H.ov) } catch (e) { return 1 } }
function lvtPal(i) { const c = (typeof RK_COL !== "undefined" && RK_COL[i]) || "#22A06B"; return { c, mid: lvtMix(c, "#ffffff", .42), core: lvtMix(c, "#ffffff", .85), dim: lvtMix(c, "#121216", .8) } }
function lvtRune(i, col, w) { return `<svg class="lvt-rune" viewBox="-7 -11 14 22" aria-hidden="true"><path d="${LVT_RUNES[i % LVT_RUNES.length]}" stroke="${col}" stroke-width="${w || 2.2}" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>` }
function lvtMob(kind, state, size, P) {
  const h = Math.round(size * 58 / 44), sc = kind === "imp" ? .82 : 1;
  if (state === "dead") {
    const deco = kind === "elite" ? `<path d="${LVT_HORNS}" fill="#1A1816" stroke="#2E2A26" stroke-width="1"/>` : kind === "boss" ? `<path d="${LVT_CROWN}" fill="#1A1816" stroke="#2E2A26" stroke-width="1"/>` : "";
    return `<svg class="lvt-mob dead" viewBox="-22 -36 44 58" width="${size}" height="${h}" aria-hidden="true"><g transform="scale(${sc})">${deco}<path d="${LVT_SHADE}" fill="#1A1816" stroke="#2E2A26" stroke-width="1.2"/><path d="${LVT_HOOD}" fill="#0E0D0C"/></g><path d="M-16 12 L16 -14" stroke="${P.mid}" stroke-width="2.2" stroke-linecap="round" opacity=".85"/></svg>`;
  }
  const now = state === "now", edge = now ? P.mid : "#4A443D", fill = kind === "boss" ? "#0D1220" : now ? "#101815" : "#0E0E10", eye = now ? P.core : "#5A3A2A";
  const deco = kind === "elite" ? `<path d="${LVT_HORNS}" fill="${fill}" stroke="${edge}" stroke-width="1.2" stroke-linejoin="round"/>` : kind === "boss" ? `<path d="${LVT_CROWN}" fill="${fill}" stroke="${edge}" stroke-width="1.3" stroke-linejoin="round"/>` : "";
  return `<svg class="lvt-mob ${now ? "now" : ""}" viewBox="-22 -36 44 58" width="${size}" height="${h}" aria-hidden="true" style="--m:${P.mid}">${now ? `<ellipse class="lvt-aura" cx="0" cy="18" rx="17" ry="4" fill="${P.c}"/>` : ""}<g transform="scale(${sc})">${deco}<path class="lvt-body" d="${LVT_SHADE}" fill="${fill}" stroke="${edge}" stroke-width="1.4"/><path d="${LVT_HOOD}" fill="#050506"/><ellipse cx="-4" cy="-7" rx="2" ry="1.4" fill="${eye}"/><ellipse cx="4" cy="-7" rx="2" ry="1.4" fill="${eye}"/></g></svg>`;
}

// what each set of an exercise is
function lvtKinds(k, ex, steps) {
  const own = steps.filter(s => s.ex.id === ex.id), out = {}, gate = {}; let best = -1, bestW = -1;
  own.forEach(s => {
    if (setTypeK(k, ex.id, s.i) === "w") { out[s.i] = "imp"; return }
    const v = setValsK(k, s), w = Number(v.w) || 0, r = Number(v.r) || 0; out[s.i] = "mob";
    if (!Object.keys(gate).length && !s.done && FMT[fmtOf(ex)].b === "reps" && r > 0 && typeof rkSetGate === "function" && typeof fmtRanks === "function" && fmtRanks(ex.id, fmtOf(ex))) {
      try { const g = rkSetGate(ex.id, fromU(w), r, k, fmtOf(ex)); if (g && g.heavy) { gate[s.i] = g } } catch (e) {}
    }
    if (w >= bestW) { bestW = w; best = s.i }
  });
  if (best >= 0 && own.length > 1 && out[best] === "mob") out[best] = "elite";
  Object.keys(gate).forEach(i => out[i] = "boss");
  return { kinds: out, own, gate };
}

function lvtHtml(k, p, now, resting, justDone) {
  const steps = gymSteps(k, p), idx = liveIdx(steps), cur = idx >= 0 ? steps[idx] : null, rank = lvtPal(lvtRank());
  const floorOf = id => p.ex.findIndex(e => e.id === id), F = cur ? FMT[fmtOf(cur.ex)] : null;
  const K = cur ? lvtKinds(k, cur.ex, steps) : null, kind = cur ? K.kinds[cur.i] : null, g = cur && K.gate[cur.i];
  const boss = kind === "boss", P = boss ? lvtPal(Math.min(5, g.to)) : rank, fi = cur ? floorOf(cur.ex.id) : p.ex.length;
  const gateName = `${String(p.name || "Today").toUpperCase()} GATE`;
  const state = `${idx}|${resting ? "r" : justDone ? "g" : "x"}`;   // must match liveTick's, or it redraws forever

  // previous floor finished just now → a floor-cleared screen while you rest
  const prevEx = cur && cur.i === 0 && fi > 0 ? p.ex[fi - 1] : null, prevSteps = prevEx ? steps.filter(x => x.ex.id === prevEx.id) : [];
  const floorCleared = (resting || justDone) && prevEx && prevSteps.length && prevSteps.every(x => x.done) && !steps.filter(x => x.ex.id === cur.ex.id).some(x => x.done);

  const top = `<div class="lvt-top"><button type="button" class="lvt-icon" id="lvBack" aria-label="Back to the app">✕</button>
    <div class="lvt-title"><b>${esc(gateName)}</b><span>${cur ? `Floor ${fi + 1} of ${p.ex.length}` : "Every floor cleared"} · <span id="lvEl">${fmtClock(now - TM.start)}</span></span></div><span class="lvt-icon ghost" aria-hidden="true"></span></div>`;
  const sys = (t, blue) => `<div class="lvt-sys ${blue ? "blue" : ""}" role="status"><b>SYSTEM</b>${esc(t)}</div>`;

  // the tower: one floor per exercise, top floor last; tap a floor to go there
  const tower = `<nav class="lvt-tower" aria-label="Tower: one floor per exercise"><svg class="lvt-spire" viewBox="0 0 56 30" aria-hidden="true"><path d="M28 2 L50 28 H6 Z" fill="#0E0F12" stroke="#2E2A26" stroke-width="1.5"/><path d="M28 10 V22" stroke="#77736A" stroke-width="2" stroke-linecap="round"/></svg><div class="lvt-floors">${p.ex.map((ex, i) => {
      const n = steps.filter(x => x.ex.id === ex.id && x.done).length, tot = steps.filter(x => x.ex.id === ex.id).length, done = tot && n === tot, on = cur && cur.ex.id === ex.id, nxt = floorCleared && on;
      return `<button type="button" class="lvt-floor ${done ? "done" : ""} ${on && !nxt ? "on" : ""} ${nxt ? "next" : ""}" data-lvjump="${esc(ex.id)}" ${done ? "disabled" : ""} ${on ? 'aria-current="step"' : ""} aria-label="Floor ${i + 1}: ${esc(ex.name)}, ${n} of ${tot} sets${done ? ", cleared" : on ? ", current" : ". Tap to go there"}">${on && !nxt ? `<i class="lvt-em"></i><i class="lvt-em b"></i>` : ""}${lvtRune(i, done || on ? rank.core : "#3A3631")}<span>${i + 1}</span></button>`;
    }).reverse().join("")}</div><i class="lvt-base"></i></nav>`;
  const page = (sysT, blue, body, foot) => ({ state, style: `--lvt:${P.c};--lvt-mid:${P.mid};--lvt-core:${P.core};--lvt-dim:${P.dim};--lvt-r:${rank.c};--lvt-rmid:${rank.mid};--lvt-rcore:${rank.core}`,
    html: `${top}${sys(sysT, blue)}<div class="lvt-row">${tower}<div class="lvt-col">${body}</div></div><div class="lvt-foot">${foot}</div>` });
  const big = (txt, id, col) => `<button type="button" class="lvt-big ${col || ""}" id="${id}"${id === "lvFinish" || id === "lvStart" ? ' data-go="1"' : ""}>${txt}</button>`;

  /* ---------- every floor cleared ---------- */
  if (!cur) {
    const done = steps.filter(x => x.done); let vol = 0;
    done.forEach(s => { const v = setValsK(k, s), w = fromU(Number(v.w) || 0), r = Number(v.r) || 0; if (FMT[fmtOf(s.ex)].b === "reps" && w > 0 && r > 0) vol += w * r });
    const bosses = p.ex.reduce((t, ex) => t + Object.keys(lvtKinds(k, ex, steps.map(s => ({ ...s, done: false }))).gate).length, 0);
    const cells = [["Sets", done.length], ["Volume", vol ? `${Math.round(toU(vol)).toLocaleString()} ${uL()}` : "–"], ["Time", fmtClock(now - TM.start)], ["Floors", `${p.ex.length}/${p.ex.length}`]]
      .map(([a, b]) => `<div><b>${esc(String(b))}</b><span>${a}</span></div>`).join("");
    const floors = p.ex.map((ex, i) => { const tot = steps.filter(x => x.ex.id === ex.id).length; return `<div class="lvt-fl">${lvtRune(i, rank.core, 2.2)}<span>F${i + 1} · ${esc(ex.name)}</span><small>${tot}/${tot}</small></div>` }).join("");
    const body = `<div class="lv-main lvt-card lvt-sum"><span class="lvt-tag">${esc(gateName)} · CLEARED</span><b class="lvt-foil">${p.ex.length} / ${p.ex.length} FLOORS</b>
      <span class="lvt-sub">${done.length} mobs${bosses ? ` · ${bosses} Gate boss${bosses === 1 ? "" : "es"} faced` : ""}</span><div class="lvt-stats">${cells}</div></div><div class="lvt-fls">${floors}</div>`;
    return page("Every floor cleared. Review and save to bank it.", false, body, big("Review &amp; save", "lvFinish"));
  }

  const v = setValsK(k, cur), unit = F.b === "sec" ? "sec" : F.b === "m" ? "m" : "reps", db = dbNow(cur.ex.id, S.logs[k]);
  const amount = st => { const x = setValsK(k, st), f = FMT[fmtOf(st.ex)], w = f.w && x.w !== "" && Number(x.w) ? `${f.w === "add" ? "+" : f.w === "assist" ? "−" : ""}${x.w} ${uL()} × ` : "";
    return fmtOf(st.ex) === "dt" ? `${x.m || st.ex.lo} m${x.r ? ` in ${x.r}` : ""}` : `${w}${(f.b === "m" ? x.m : x.r) || st.ex.lo}${f.b === "reps" ? "" : " " + (f.b === "sec" ? "s" : "m")}` };
  const tag = `<div class="lvt-tagrow"><span class="lvt-tag">FLOOR ${fi + 1} · ${esc(cur.ex.name.toUpperCase())}${cur.inSS ? " · SUPERSET" : ""}</span><span class="lvt-of">Mob ${cur.i + 1} of ${cur.n}</span></div>`;
  const queue = `<div class="lvt-queue" aria-hidden="true">${K.own.map(s => { const kk = K.kinds[s.i], pp = kk === "boss" && K.gate[s.i] ? lvtPal(Math.min(5, K.gate[s.i].to)) : rank; return `<span>${lvtMob(kk, s.done ? "dead" : s.i === cur.i ? "now" : "up", 28, pp)}</span>` }).join("")}</div>`;

  /* ---------- resting / floor cleared ---------- */
  if (resting || justDone) {
    const nk = kind, nP = P, ready = resting ? big(floorCleared ? `Climb to floor ${fi + 1}` : "Ready", "lvSkip") : big(floorCleared ? `Climb to floor ${fi + 1}` : "Ready", "lvStart");
    const clock = `<span class="lvt-clock" id="lvRest">${resting ? fmtClock(TM.restEnd - now) : "Go"}</span>`;
    const nextCard = `<div class="lvt-next">${lvtMob(nk, "now", 44, nP)}<div><span class="lvt-tag ${boss ? "blue" : ""}">NEXT · ${LVT_KIND[nk].toUpperCase()}</span><b>${esc(amount(cur))}</b><small>${esc(cur.ex.name)}${cur.inSS ? " · superset" : ""}</small></div></div>`;
    const chips = resting ? `<div class="lvt-chips"><button type="button" id="lvtMinus">−15 s</button><button type="button" id="lvtPlus">+15 s</button></div>` : "";
    if (floorCleared) {
      const kills = prevSteps.map(s => `<div>${lvtMob(lvtKinds(k, prevEx, steps.map(x => ({ ...x, done: false }))).kinds[s.i] || "mob", "dead", 32, rank)}</div>`).join("");
      const body = `<div class="lv-main lvt-card lvt-clr"><i class="lvt-spark"></i><i class="lvt-spark b"></i><i class="lvt-spark c"></i>${lvtRune(fi - 1, rank.core, 2.4)}<span class="lvt-tag">FLOOR ${fi} CLEARED</span><b class="lvt-foil">${esc(prevEx.name)}</b>
        <span class="lvt-sub">${prevSteps.length} mob${prevSteps.length === 1 ? "" : "s"} struck</span><div class="lvt-kills">${kills}</div></div>
        <div class="lvt-climb">${lvtRune(fi, rank.mid, 2.2)}<div><span class="lvt-tag">CLIMBING TO FLOOR ${fi + 1}</span><b>${esc(cur.ex.name)} · ${cur.n} mob${cur.n === 1 ? "" : "s"}</b><small>Rest ${clock}</small></div></div>${chips}`;
      return page("Floor cleared. Rest, then climb.", false, body, ready);
    }
    const ring = `<div class="lvt-rw"><div class="lvt-ring" id="lvtRing" aria-hidden="true">${Array.from({ length: 12 }, (_, i) => `<span style="transform:rotate(${i * 30}deg) translateY(-76px)">${lvtRune(i, rank.mid, 2.6)}</span>`).join("")}</div>${clock}<span class="lvt-rl">${resting ? "RECOVERING" : "READY"}</span></div>`;
    const body = `${tag}<b class="lvt-name">${esc(cur.ex.name)}</b><div class="lv-main lvt-card lvt-rest">${ring}${chips}</div>${nextCard}`;
    const doneHere = K.own.filter(s => s.done).length;
    return page(boss ? "A Gate has opened on this floor. Recover first." : `${doneHere ? `Set ${doneHere} down` : "Rest"}. Recover, then face the ${LVT_KIND[kind].toLowerCase()}.`, boss, body, ready);
  }

  /* ---------- the fight ---------- */
  const reps = F.b === "reps" ? (parseInt(v.r, 10) || parseInt(cur.ex.lo, 10) || 0) : 0;
  const sub = boss ? `Clear it and ${g.name} rises to ${rkLetter(g.to)}` : (cur.t.first ? cur.t.msg : cur.t.msg) || "";
  const hp = reps ? `<div class="lvt-hp" id="lvtHp" aria-hidden="true">${Array.from({ length: Math.min(reps, 20) }, () => "<i></i>").join("")}</div><div class="lvt-hpl"><span>HP = REPS</span><span id="lvtHpN">${reps} / ${reps}</span></div>` : "";
  const card = `<div class="lv-main lvt-card ${boss ? "boss" : ""}"><span class="lvt-tag ${boss ? "blue" : ""}">${boss ? `GATE BOSS · ${rkLetter(g.to)} RANK` : LVT_KIND[kind].toUpperCase()}</span>
    ${lvtMob(kind, "now", boss ? 118 : 112, P)}<b class="lvt-amt" id="lvtAmt">${esc(amount(cur))}</b>${sub ? `<span class="lvt-sub">${esc(sub)}</span>` : ""}${hp}</div>`;
  const stepper = (id, val, ph, lab, mode, step, aria) => `<label class="lvt-step"><span>${lab}</span><span class="lvt-sbox"><button type="button" data-lvt-step="${id}|-${step}" aria-label="Less ${esc(aria)}">−</button><input id="${id}" inputmode="${mode}" value="${esc(val)}" placeholder="${esc(ph)}" aria-label="${esc(aria)}"><button type="button" data-lvt-step="${id}|${step}" aria-label="More ${esc(aria)}">+</button></span></label>`;
  const wStep = UNIT() === "kg" ? 2.5 : 5;
  const ins = (F.w ? stepper("lvW", v.w, uL(), F.w === "assist" ? "ASSIST" : F.w === "add" ? "ADDED" : db ? "PER DB" : "WEIGHT", "decimal", wStep, "Weight") : "")
    + (F.b === "m" ? stepper("lvM", v.m, cur.ex.lo, "METRES", "decimal", 50, "Metres") : "")
    + (F.b !== "m" || F.time ? (F.time ? `<label class="lvt-step"><span>TIME</span><span class="lvt-sbox"><input id="lvR" inputmode="decimal" value="${esc(v.r)}" placeholder="${esc(cur.t.time ? fmtDur(cur.t.time) : "min")}" aria-label="Time"></span></label>`
      : stepper("lvR", v.r, cur.ex.lo, F.b === "sec" ? "SECONDS" : "REPS", "numeric", F.b === "sec" ? 5 : 1, unit)) : "");
  const doneHere = K.own.filter(s => s.done).length, left = K.own.length - doneHere;
  const sysT = boss ? "A Gate has opened on this floor." : !doneHere ? `Floor ${fi + 1}: ${cur.ex.name}. ${K.own.length} mob${K.own.length === 1 ? "" : "s"}${Object.keys(K.gate).length ? ", a Gate boss among them" : ""}.`
    : kind === "elite" ? `${doneHere === 1 ? "One" : doneHere === 2 ? "Two" : doneHere} down. The elite is next.` : `${doneHere} down, ${left} to go.`;
  const body = `${tag}${card}${queue}`;
  return page(sysT + (cur.inSS && !cur.ssLast ? " Superset: no rest before the next one." : ""), boss, body, `<div class="lvt-ins">${ins}</div>${big(boss ? "Challenge the boss" : "Strike · log set", "lvDone", boss ? "blue" : "")}`);
}

// rest ring: runes go dark as the rest runs out
function lvtTick(restLeft, restDur) {
  const r = document.getElementById("lvtRing"); if (!r) return;
  const lit = restDur > 0 ? Math.ceil(Math.max(0, restLeft) / (restDur * 1000) * 12) : 0;
  r.querySelectorAll("span").forEach((s, i) => s.classList.toggle("off", i >= lit));
}
// steppers, ±15 s, and the live numbers on the card
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("#liveIn.lvt button"); if (!b) return;
  if (b.dataset.lvtStep) { const [id, d] = b.dataset.lvtStep.split("|"), inp = document.getElementById(id); if (!inp) return;
    const v = Math.max(0, Math.round(((parseFloat(inp.value) || 0) + Number(d)) * 100) / 100); inp.value = String(v); inp.dispatchEvent(new Event("input", { bubbles: true })); return }
  if (b.id === "lvtMinus" || b.id === "lvtPlus") { if (!TM.restEnd) return; const d = b.id === "lvtPlus" ? 15 : -15;
    TM.restEnd = Math.max(Date.now() + 1000, TM.restEnd + d * 1000); TM.restDur = Math.max(1, TM.restDur + d); saveTM(); liveTick(); return }
});
document.addEventListener("input", e => {
  const t = e.target; if (!t || !t.closest || !t.closest("#liveIn.lvt") || !/^lv[WRM]$/.test(t.id)) return;
  const W = document.getElementById("lvW"), R = document.getElementById("lvR"), a = document.getElementById("lvtAmt");
  if (a && R && /^\d+$/.test(R.value || "x")) a.textContent = `${W && W.value ? `${W.value} ${uL()} × ` : ""}${R.value}`;
  const hp = document.getElementById("lvtHp"), n = document.getElementById("lvtHpN"), r = parseInt(R && R.value, 10);
  if (hp && r > 0) { hp.innerHTML = Array.from({ length: Math.min(r, 20) }, () => "<i></i>").join(""); if (n) n.textContent = `${r} / ${r}` }
});

(() => { const st = document.createElement("style"); st.textContent = `
html .live.lvt-on{background:radial-gradient(90% 50% at 50% 0%,color-mix(in srgb,var(--lvt-r,#22A06B) 16%,transparent),transparent 70%),repeating-linear-gradient(135deg,color-mix(in srgb,var(--lvt-r,#22A06B) 3%,transparent) 0 1px,transparent 1px 8px),#0B0C10!important;color:#F5F1E6;padding-left:14px;padding-right:14px}
#liveIn.lvt{--ink:#F5F1E6;--mut:#A8A396;--fnt:var(--display);gap:12px;color:#F5F1E6;font-family:var(--body);min-height:calc(100dvh - 40px)}
#liveIn.lvt .lv-main{min-height:0!important}
.lvt-top{display:flex;align-items:center;justify-content:space-between;gap:10px}
.lvt-icon{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;border:1px solid rgba(245,241,230,.14);background:none;color:var(--mut);font-size:16px;cursor:pointer;flex-shrink:0}.lvt-icon.ghost{border-color:transparent}
.lvt-title{text-align:center;display:flex;flex-direction:column;gap:4px;min-width:0}.lvt-title b{font:800 11px/1 var(--fnt);letter-spacing:.32em;color:var(--lvt-rmid);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.lvt-title>span{font-size:12px;color:var(--mut)}
.lvt-sys{padding:9px 12px;border-radius:10px;border:1px solid color-mix(in srgb,var(--lvt-r) 35%,transparent);background:linear-gradient(90deg,color-mix(in srgb,var(--lvt-r) 14%,transparent),transparent);font-size:12.5px;color:#D8D2C2}
.lvt-sys b{font:800 10px/1 var(--fnt);letter-spacing:.24em;color:var(--lvt-rmid);margin-right:7px}
.lvt-sys.blue{border-color:color-mix(in srgb,var(--lvt) 50%,transparent);background:linear-gradient(90deg,color-mix(in srgb,var(--lvt) 18%,transparent),transparent);color:#E2E8F5}.lvt-sys.blue b{color:var(--lvt-mid)}
.lvt-row{display:flex;gap:14px;align-items:flex-start}.lvt-col{flex:1;min-width:0;display:flex;flex-direction:column;gap:12px}
.lvt-tower{position:sticky;top:6px;width:52px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:5px}
.lvt-spire{width:52px;height:28px}.lvt-base{display:block;width:52px;height:9px;border-radius:2px;background:linear-gradient(90deg,#6B3F17,#F4C48E 40%,#B47A3F 60%,#6B3F17)}
.lvt-floors{width:100%;display:flex;flex-direction:column;gap:5px}
.lvt-floor{position:relative;height:54px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;border:1.5px solid #24221F;border-radius:6px;background:#0E0F12;color:#77736A;font:800 10px/1 var(--fnt);padding:0;cursor:pointer}
.lvt-floor .lvt-rune{width:11px;height:17px}
.lvt-floor.done{border-color:var(--lvt-r);background:linear-gradient(180deg,color-mix(in srgb,var(--lvt-r) 30%,transparent),color-mix(in srgb,var(--lvt-r) 12%,transparent));color:var(--lvt-rmid);cursor:default}
.lvt-floor.on{border-color:var(--lvt-rmid);background:linear-gradient(180deg,color-mix(in srgb,var(--lvt-r) 45%,transparent),color-mix(in srgb,var(--lvt-r) 18%,transparent));box-shadow:0 0 16px -2px var(--lvt-r);color:var(--lvt-rcore)}
.lvt-floor.next{border-style:dashed;border-color:color-mix(in srgb,var(--lvt-r) 50%,transparent);color:var(--lvt-rmid);animation:lvtPulse 1.8s infinite ease-in-out}
.lvt-floor:focus-visible,.lvt-big:focus-visible,.lvt-sbox button:focus-visible{outline:2px solid var(--lvt-rmid);outline-offset:2px}
.lvt-em{position:absolute;left:50%;top:-4px;width:3px;height:3px;border-radius:50%;background:var(--lvt-rcore);box-shadow:0 0 6px var(--lvt-rmid);animation:lvtRise 2.2s infinite ease-out}.lvt-em.b{left:34%;width:2px;height:2px;animation-delay:-.9s}
@keyframes lvtRise{0%{transform:translateY(0);opacity:0}15%{opacity:1}100%{transform:translateY(-24px);opacity:0}}
@keyframes lvtPulse{0%,100%{opacity:.55}50%{opacity:1}}
.lvt-tagrow{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
.lvt-tag{font:800 10px/1.2 var(--fnt);letter-spacing:.28em;color:var(--lvt-rmid)}.lvt-tag.blue{color:var(--lvt-mid)}.lvt-of{font-size:11.5px;color:var(--mut);white-space:nowrap}
.lvt-name{font:800 26px/1.05 var(--fnt);margin-top:-4px}
#liveIn.lvt .lvt-card{position:relative;overflow:hidden;display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;padding:16px 12px;border-radius:20px;color:#F5F1E6;
  background:radial-gradient(70% 60% at 50% 35%,color-mix(in srgb,var(--lvt) 22%,transparent),transparent 70%),#0D0F0E;border:1.5px solid color-mix(in srgb,var(--lvt) 62%,transparent);
  box-shadow:inset 0 0 0 6px #0D0F0E,inset 0 0 0 7px color-mix(in srgb,var(--lvt) 24%,transparent),0 0 36px -14px var(--lvt);animation:none}
#liveIn.lvt .lvt-card.boss{background:radial-gradient(80% 70% at 50% 32%,color-mix(in srgb,var(--lvt) 26%,transparent),transparent 70%),#0A0D16;border-color:color-mix(in srgb,var(--lvt) 80%,transparent)}
.lvt-mob{overflow:visible}.lvt-mob.now .lvt-body{filter:drop-shadow(0 0 3px var(--m))}
.lvt-aura{opacity:.45;filter:blur(2.5px);animation:lvtPulse 1.8s infinite ease-in-out}.lvt-mob.dead{opacity:.72}
.lvt-amt{font:900 30px/1 var(--fnt)}.lvt-sub{font-size:12.5px;color:#C9C3B5;line-height:1.35}
.lvt-hp{display:flex;gap:3px;width:100%;margin-top:6px}.lvt-hp i{flex:1;height:9px;border-radius:2px;background:linear-gradient(180deg,var(--lvt-mid),var(--lvt));box-shadow:0 0 6px var(--lvt)}
.lvt-hpl{display:flex;justify-content:space-between;width:100%;font:800 9px/1 var(--fnt);letter-spacing:.2em;color:var(--mut)}
.lvt-queue{display:flex;justify-content:center;gap:12px;align-items:flex-end}
.lvt-foot{margin-top:auto;position:sticky;bottom:0;padding:12px 0 2px;background:linear-gradient(180deg,transparent,#0B0C10 22%);display:flex;flex-direction:column;gap:12px}
.lvt-ins{display:flex;gap:10px}
.lvt-step{flex:1;display:flex;flex-direction:column;gap:6px;min-width:0}.lvt-step>span:first-child{font:800 10px/1 var(--fnt);letter-spacing:.24em;color:var(--mut)}
.lvt-sbox{display:flex;align-items:center;height:54px;padding:0 6px;border-radius:14px;background:#0B0B0E;border:1px solid rgba(245,241,230,.12)}
.lvt-sbox button{width:36px;height:36px;flex-shrink:0;border-radius:10px;border:0;background:rgba(245,241,230,.07);color:var(--mut);font-size:20px;cursor:pointer}
#liveIn.lvt .lvt-sbox input{flex:1;min-width:0;width:100%;border:0;background:none;box-shadow:none;text-align:center;color:#F5F1E6;font:800 24px/1 var(--fnt);padding:0;height:auto}
#liveIn.lvt .lvt-sbox input:focus{outline:none}.lvt-sbox:focus-within{border-color:var(--lvt-mid)}
#liveIn.lvt .lvt-big{width:100%;height:58px;border-radius:14px;border:0;cursor:pointer;font:800 17px/1 var(--fnt);letter-spacing:.16em;text-transform:uppercase;color:#04140C;
  background:linear-gradient(180deg,var(--lvt-r),color-mix(in srgb,var(--lvt-r) 68%,black));box-shadow:0 12px 28px -12px var(--lvt-r),inset 0 1px 0 rgba(255,255,255,.25)}
#liveIn.lvt .lvt-big.blue{color:#F2F6FF;background:linear-gradient(180deg,var(--lvt),color-mix(in srgb,var(--lvt) 68%,black));box-shadow:0 12px 28px -12px var(--lvt)}
.lvt-rw{position:relative;width:184px;height:184px;display:grid;place-items:center;align-content:center;gap:4px;margin:4px 0}
.lvt-ring{position:absolute;inset:0}.lvt-ring span{position:absolute;left:50%;top:50%;width:14px;height:22px;margin:-11px 0 0 -7px}
.lvt-ring .lvt-rune{width:14px;height:22px;filter:drop-shadow(0 0 3px var(--lvt-rmid))}.lvt-ring span.off .lvt-rune{filter:none;opacity:.22}.lvt-ring span.off path{stroke:#4A443D}
.lvt-clock{position:relative;font:900 46px/1 var(--fnt);font-variant-numeric:tabular-nums}.lvt-rl{position:relative;font:800 9.5px/1 var(--fnt);letter-spacing:.26em;color:var(--mut)}
.lvt-chips{display:flex;gap:8px;justify-content:center}.lvt-chips button{padding:9px 14px;border-radius:10px;border:1px solid rgba(245,241,230,.14);background:none;color:var(--mut);font:700 13px/1 var(--fnt);cursor:pointer}
.lvt-next,.lvt-climb{display:flex;align-items:center;gap:12px;padding:12px;border-radius:14px;background:color-mix(in srgb,var(--lvt-r) 7%,transparent);border:1px solid color-mix(in srgb,var(--lvt-r) 30%,transparent)}
.lvt-climb{border-style:dashed;background:none}.lvt-climb .lvt-rune{width:16px;height:25px}
.lvt-next>div,.lvt-climb>div{display:flex;flex-direction:column;gap:4px;min-width:0}.lvt-next b,.lvt-climb b{font:800 19px/1.15 var(--fnt)}.lvt-next small,.lvt-climb small{font-size:12px;color:var(--mut)}
.lvt-climb .lvt-clock{font-size:12px;font-weight:700;font-family:inherit}
.lvt-foil{font:900 30px/1.05 var(--fnt);background:linear-gradient(180deg,var(--lvt-rcore),var(--lvt-rmid) 45%,color-mix(in srgb,var(--lvt-r) 70%,black));-webkit-background-clip:text;background-clip:text;color:transparent}
#liveIn.lvt .lvt-clr{border-color:color-mix(in srgb,var(--lvt-r) 75%,transparent);background:radial-gradient(70% 60% at 50% 25%,color-mix(in srgb,var(--lvt-r) 32%,transparent),transparent 70%),#0A0A0D}
.lvt-clr>.lvt-rune{width:26px;height:40px;filter:drop-shadow(0 0 8px var(--lvt-rmid))}
.lvt-kills{display:flex;gap:10px;justify-content:center;margin-top:6px}
.lvt-spark{position:absolute;left:30%;top:45%;width:3px;height:3px;border-radius:50%;background:var(--lvt-rcore);box-shadow:0 0 8px var(--lvt-rmid);animation:lvtRise 2.2s infinite ease-out}.lvt-spark.b{left:58%;top:35%;animation-delay:-.7s}.lvt-spark.c{left:70%;top:50%;animation-delay:-1.4s}
.lvt-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;width:100%;margin-top:8px}.lvt-stats div{padding:10px 6px;border-radius:12px;background:rgba(245,241,230,.04);border:1px solid rgba(245,241,230,.07);display:flex;flex-direction:column;gap:5px}
.lvt-stats b{font:800 18px/1 var(--fnt)}.lvt-stats span{font:800 9px/1 var(--fnt);letter-spacing:.2em;color:var(--mut);text-transform:uppercase}
.lvt-fls{display:flex;flex-direction:column}.lvt-fl{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(245,241,230,.06);font:700 14px/1.2 var(--fnt)}.lvt-fl .lvt-rune{width:11px;height:17px;flex-shrink:0}.lvt-fl span{flex:1;min-width:0}.lvt-fl small{color:var(--lvt-rmid);font-size:12px}
@media (prefers-reduced-motion:reduce){.lvt-em,.lvt-aura,.lvt-spark,.lvt-floor.next{animation:none}}
`; document.head.appendChild(st) })();
