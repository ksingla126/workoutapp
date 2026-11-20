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
    <div class="lvt-title"><b>${esc(gateName)}</b><button type="button" class="lvt-pz" id="lvPause" aria-label="Pause the workout"><i aria-hidden="true"><em></em><em></em></i><span>${cur ? `Floor ${fi + 1} of ${p.ex.length}` : "Every floor cleared"} · <span id="lvEl">${fmtClock(tmEl())}</span></span></button></div><button type="button" class="lvt-cancel" id="lvCancel" aria-label="Cancel this workout">Cancel</button></div>`;
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
    const cells = [["Sets", done.length], ["Volume", vol ? `${Math.round(toU(vol)).toLocaleString()} ${uL()}` : "–"], ["Time", fmtClock(tmEl())], ["Floors", `${p.ex.length}/${p.ex.length}`]]
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
  const ntN = typeof ntList === "function" ? ntList(cur.ex.id).length : 0;
  const ntBtn = `<button type="button" class="lvt-nt" id="lvtNt" data-ntopen="${esc(cur.ex.id)}" aria-label="Notes for ${esc(cur.ex.name)}${ntN ? `, ${ntN} saved` : ""}"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 2.5l2.5 2.5L6 12.5 3 13l.5-3z"/></svg>${ntN ? `<b>${ntN}</b>` : ""}</button>`;
  const doneHere = K.own.filter(s => s.done).length, left = K.own.length - doneHere;
  const sysT = boss ? "A Gate has opened on this floor." : !doneHere ? `Floor ${fi + 1}: ${cur.ex.name}. ${K.own.length} mob${K.own.length === 1 ? "" : "s"}${Object.keys(K.gate).length ? ", a Gate boss among them" : ""}.`
    : kind === "elite" ? `${doneHere === 1 ? "One" : doneHere === 2 ? "Two" : doneHere} down. The elite is next.` : `${doneHere} down, ${left} to go.`;
  const body = `${tag}${card}${queue}`;
  // timed sets: a floating HP bar over the mob runs the set-up, the hold, the 3 s grace and any overkill
  if (F.b === "sec" && typeof htView === "function") {
    const target = parseInt(v.r, 10) || parseInt(cur.ex.lo, 10) || 30, c = htCfg(cur.ex.id);
    const run = !!(HOLD && HOLD.where === "live" && HOLD.k === k && HOLD.id === cur.ex.id && HOLD.i === cur.i), vw = run ? htView() : htView(target);
    const ctl = run ? (HOLD.phase === "grace" ? `<div class="htnote">Tap <b>STOP</b> now to log <b>${HOLD.target} s</b>. Keep holding and overkill starts counting.</div>`
        : HOLD.phase === "setup" ? `<span class="lvt-sub">The bar fills as you get set. When it's full the hold starts.</span>` : HOLD.pz ? `<span class="lvt-sub">Paused</span>` : "")
      : `<div class="htc"><div class="htseg" role="group" aria-label="Timer mode"><button type="button" data-htmode="timer" class="${c.mode === "timer" ? "on" : ""}" aria-pressed="${c.mode === "timer"}">⏱ TIMER</button><button type="button" data-htmode="watch" class="${c.mode === "watch" ? "on" : ""}" aria-pressed="${c.mode === "watch"}">◷ STOPWATCH</button></div>
        <div class="htrow"><button type="button" class="htchip" data-htsetup aria-label="Set-up time ${c.setup} seconds, tap to change">SET-UP <b>${c.setup} s</b></button><span class="htchip ro">HOLD <b>${target} s</b></span><button type="button" class="htchip end" data-htsound aria-pressed="${htSoundOn()}" aria-label="Timer sound">${htSoundOn() ? "🔔 <b>ON</b>" : "🔕 <b>OFF</b>"}</button></div></div>`;
    let cardT = card.replace('<div class="lv-main lvt-card', `<div ${run ? "data-htrun " : ""}class="lv-main lvt-card`).replace("</span>", "</span>" + htBar(vw))
      .replace(/<b class="lvt-amt" id="lvtAmt">[\s\S]*?<\/b>/, `<b class="lvt-amt" id="lvtAmt" data-ht="amt">${run ? vw.amt : esc(amount(cur))}</b>`);
    cardT = /<span class="lvt-sub">/.test(cardT) ? cardT.replace(/<span class="lvt-sub">[\s\S]*?<\/span>/, `<span class="lvt-sub" data-ht="sub">${run ? vw.sub : esc(sub)}</span>`) : cardT;
    cardT = cardT.replace(/<\/div>\s*$/, ctl + "</div>");
    let foot;
    if (!run) foot = `<div class="lvt-ins">${ins}${ntBtn}</div>${big(`▶ Start set ${cur.i + 1}`, "htGo", boss ? "blue" : "")}<button type="button" class="htlink" id="lvDone">Log it by hand instead</button>`;
    else if (HOLD.phase === "setup") foot = `<div class="htduo"><button type="button" id="htSkip">Skip set-up</button><button type="button" class="x" data-htcancel>✕ Stop</button></div>`;
    else if (HOLD.phase === "hold") foot = `<div class="htduo"><button type="button" id="htPz">${HOLD.pz ? "▶ Resume" : "❚❚ Pause"}</button><button type="button" data-htstop id="htEnd">${vw.end}</button></div><span class="htlink" style="text-decoration:none">Logs at 0:00. Keep holding past it and overkill counts.</span>`;
    else if (HOLD.phase === "watch") foot = `<button type="button" class="lvt-big" data-htstop id="htEnd">${vw.end}</button><span class="htlink" style="text-decoration:none">Counts up until you stop · target ${HOLD.target} s</span>`;
    else foot = `<button type="button" class="htgold" data-htstop id="htEnd">${vw.end}</button><span class="htlink" style="text-decoration:none">${HOLD.phase === "grace" ? "No tap in 3 s means you're still holding" : "Overkill counts from 0:00"}</span>`;
    return page(sysT + (cur.inSS && !cur.ssLast ? " Superset: no rest before the next one." : ""), boss, `${tag}${cardT}${queue}`, foot);
  }
  return page(sysT + (cur.inSS && !cur.ssLast ? " Superset: no rest before the next one." : ""), boss, body, `<div class="lvt-ins">${ins}${ntBtn}</div>${big(boss ? "Challenge the boss" : "Strike · log set", "lvDone", boss ? "blue" : "")}`);
}

// rest ring: runes go dark as the rest runs out
function lvtTick(restLeft, restDur) { lvtRingPaint(); if (!lvtTick.raf) lvtTick.raf = requestAnimationFrame(lvtRingLoop) }
// each rune holds a twelfth of the rest; the light drains out of it smoothly, one rune after the next, like a clock hand
function lvtRingPaint() {
  const r = document.getElementById("lvtRing"); if (!r) return false;
  const left = TM.restEnd ? Math.max(0, TM.restEnd - Date.now()) : 0, dur = Math.max(1, (TM.restDur || 1) * 1000), f = Math.min(1, left / dur);
  r.querySelectorAll("span").forEach((s, i) => { const lv = Math.max(0, Math.min(1, f * 12 - i)); s.style.setProperty("--lv", lv.toFixed(3)); s.classList.toggle("off", lv <= 0); s.classList.toggle("edge", lv > 0 && lv < 1) });
  return true;
}
function lvtRingLoop() { lvtTick.raf = 0; if (!lvtRingPaint() || !TM.restEnd || TM.restEnd <= Date.now()) return; lvtTick.raf = requestAnimationFrame(lvtRingLoop) }
/* ---------- Exercise notes: one timeline per exercise, across every workout it's in ---------- */
let NT = null;  // {id, name}
function ntList(id) { const m = (S.profile && S.profile.exNotes) || {}; return (m[id] || []).slice().sort((a, b) => (b.at || 0) - (a.at || 0)) }
function ntSets(k, id) {  // that day's sets: logged, or done so far in today's live workout
  const l = S.logs[k]; let sets = l && l.ex && l.ex[id];
  if (!sets && typeof drafts !== "undefined" && typeof dkey === "function") { sets = [];
    for (let i = 0; i < 30; i++) if (drafts[dkey(k, `c-${id}-${i}`)]) sets.push({ w: Number(drafts[dkey(k, `w-${id}-${i}`)]) || 0, r: drafts[dkey(k, `r-${id}-${i}`)] || "", u: 1 }) }
  sets = (sets || []).filter(x => x && x.t !== "w"); if (!sets.length) return "";
  const top = Math.max(...sets.map(x => Number(x.w) || 0)); let sec = false; try { const ex = (typeof ALLEX !== "undefined" && ALLEX.find(x => x.id === id)) || { id }; sec = FMT[fmtOf(ex)].b === "sec" } catch (_) {}
  const w = top ? `${sets[0].u ? top : (typeof toU === "function" ? toU(top) : top)} × ` : "";
  return w + sets.map(x => x.r).join(" · ") + (sec ? " s" : "") }
function ntDay(k) { const d = parseYmd(k); return k === ymd(today) ? "TODAY" : `${DOW[(d.getDay() + 6) % 7].toUpperCase()} ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase()}` }
function ntHtml() {
  const L = ntList(NT.id);
  const items = L.map(n => `<div class="ntit"><i></i><div><div class="ntm"><span>${ntDay(n.k)}</span><em>${esc(ntSets(n.k, NT.id))}</em></div><p>${esc(n.t)}</p></div><button type="button" class="ntdel" data-ntdel="${n.at}" aria-label="Delete this note">✕</button></div>`).join("");
  return `<div class="ntw" role="dialog" aria-modal="true" aria-label="Notes for ${esc(NT.name)}"><button type="button" class="ntbg" data-ntx aria-label="Close"></button><div class="ntcard"><div class="ntin">
    <div class="nteb"><span>EXERCISE LOG</span><button type="button" class="ntxx" data-ntx aria-label="Close">✕</button></div>
    <div class="ntt">${esc(NT.name)}</div>
    <div class="ntadd"><textarea id="ntIn" rows="1" placeholder="Add a note for today…" aria-label="Note for today"></textarea><button type="button" class="ntgo" data-ntadd disabled>+ ADD</button></div>
    <div class="nthd"><span>TIMELINE</span><span>${L.length ? `${L.length} NOTE${L.length === 1 ? "" : "S"}` : ""}</span></div>
    <div class="ntlist">${items || `<p class="ntnone">No notes yet. Cues, setup, how it felt: anything you want to see next time you do this exercise.</p>`}</div></div></div></div>` }
function ntPaint(focus) { document.querySelectorAll("body > .ntw").forEach(x => x.remove()); if (!NT) return;
  document.body.insertAdjacentHTML("beforeend", ntHtml()); const b = document.getElementById("lvtNt");
  if (b && b.dataset.ntopen === NT.id) { const n = ntList(NT.id).length; b.querySelector("b")?.remove(); if (n) b.insertAdjacentHTML("beforeend", `<b>${n}</b>`) }
  if (focus) setTimeout(() => document.getElementById("ntIn")?.focus(), 60) }
function ntOpen(id) { const c = typeof liveCtx === "function" && liveCtx(), e = c && c.p.ex && c.p.ex.find(x => x.id === id); NT = { id, name: e ? e.name : id, k: c ? c.k : ymd(today) }; ntPaint(false) }
function ntClose() { NT = null; ntPaint() }
function ntAdd() { const el = document.getElementById("ntIn"), t = el && el.value.trim(); if (!t || !NT) return;
  S.profile.exNotes = S.profile.exNotes || {}; (S.profile.exNotes[NT.id] = S.profile.exNotes[NT.id] || []).push({ k: NT.k, t: t.slice(0, 600), at: Date.now() });
  saveProfile(); ntPaint(); toast("Note saved") }
function ntDel(at) { const m = S.profile.exNotes, a = m && m[NT.id]; if (!a) return; const i = a.findIndex(n => String(n.at) === String(at)); if (i < 0) return;
  const [gone] = a.splice(i, 1); if (!a.length) delete m[NT.id]; saveProfile(); ntPaint();
  toast("Note deleted") }
document.addEventListener("click", e => {
  const t = e.target.closest && e.target.closest("[data-ntopen],[data-ntx],[data-ntadd],[data-ntdel]"); if (!t) return;
  if (t.dataset.ntopen) { ntOpen(t.dataset.ntopen); return }
  if (t.hasAttribute("data-ntx")) { ntClose(); return }
  if (t.hasAttribute("data-ntadd")) { ntAdd(); return }
  if (t.dataset.ntdel) ntDel(t.dataset.ntdel);
});
document.addEventListener("input", e => { if (e.target && e.target.id === "ntIn") { const el = e.target, b = document.querySelector("[data-ntadd]"); if (b) b.disabled = !el.value.trim(); el.style.height = "auto"; el.style.height = Math.min(120, el.scrollHeight) + "px" } });
document.addEventListener("keydown", e => { if (!NT) return; if (e.key === "Escape") ntClose(); else if (e.key === "Enter" && !e.shiftKey && e.target && e.target.id === "ntIn") { e.preventDefault(); ntAdd() } });
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
html .live.lvt-on{background:radial-gradient(90% 50% at 50% 0%,color-mix(in srgb,var(--lvt-r,var(--rk)) 16%,transparent),transparent 70%),repeating-linear-gradient(135deg,color-mix(in srgb,var(--lvt-r,var(--rk)) 3%,transparent) 0 1px,transparent 1px 8px),#0B0C10!important;color:#F5F1E6;padding-left:14px;padding-right:14px}
#liveIn.lvt{--ink:#F5F1E6;--mut:#A8A396;--fnt:var(--display);gap:12px;color:#F5F1E6;font-family:var(--body);height:100%;min-height:0;overflow:hidden}.live:has(#liveIn.lvt){overflow:hidden;overscroll-behavior:none}.lvt-cancel{justify-self:end;height:32px;padding:0 12px;border-radius:999px;border:1px solid rgba(224,103,90,.45);background:none;color:#F0B4AC;font:800 10.5px/1 var(--fnt);letter-spacing:.16em;text-transform:uppercase;cursor:pointer}.lvt-cancel:focus-visible{outline:2px solid var(--mt-l);outline-offset:2px}#liveIn.lvt>.lvt-sys{flex-shrink:0}
#liveIn.lvt .lv-main{min-height:0!important}
.lvt-pz{display:inline-flex;align-items:center;gap:7px;margin:4px auto 0;padding:4px 10px 4px 5px;border-radius:999px;border:1px solid color-mix(in srgb,var(--mt-l) 45%,transparent);background:color-mix(in srgb,var(--mt-m) 12%,transparent);color:var(--rk-core);font:600 12px/1 var(--body);cursor:pointer;max-width:100%;touch-action:manipulation}.lvt-pz>i{width:16px;height:16px;flex-shrink:0;border-radius:50%;border:1px solid var(--mt-l);display:flex;align-items:center;justify-content:center;gap:2px;box-sizing:border-box}.lvt-pz>i>em{width:2px;height:6px;border-radius:1px;background:var(--mt-l)}.lvt-pz>span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.lvt-pz:focus-visible{outline:2px solid var(--mt-l);outline-offset:2px}.lvt-top{display:grid;grid-template-columns:78px minmax(0,1fr) 78px;align-items:center;gap:8px;flex-shrink:0}.lvt-top>.lvt-icon{justify-self:start}
.lvt-icon{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;border:1px solid rgba(245,241,230,.14);background:none;color:var(--mut);font-size:16px;cursor:pointer;flex-shrink:0}.lvt-icon.ghost{border-color:transparent}
.lvt-title{text-align:center;display:flex;flex-direction:column;gap:4px;min-width:0}.lvt-title b{font:800 11px/1 var(--fnt);letter-spacing:.32em;color:var(--lvt-rmid);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.lvt-title>span{font-size:12px;color:var(--mut)}
.lvt-sys{padding:9px 12px;border-radius:10px;border:1px solid color-mix(in srgb,var(--lvt-r) 35%,transparent);background:linear-gradient(90deg,color-mix(in srgb,var(--lvt-r) 14%,transparent),transparent);font-size:12.5px;color:#D8D2C2}
.lvt-sys b{font:800 10px/1 var(--fnt);letter-spacing:.24em;color:var(--lvt-rmid);margin-right:7px}
.lvt-sys.blue{border-color:color-mix(in srgb,var(--lvt) 50%,transparent);background:linear-gradient(90deg,color-mix(in srgb,var(--lvt) 18%,transparent),transparent);color:#E2E8F5}.lvt-sys.blue b{color:var(--lvt-mid)}
.lvt-row{display:flex;gap:14px;align-items:stretch;flex:1;min-height:0}.lvt-col{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;gap:12px;overflow:hidden}
.lvt-tower{width:52px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:5px;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none;padding-bottom:4px;-webkit-overflow-scrolling:touch}.lvt-tower::-webkit-scrollbar{display:none}.lvt-tower>*{flex-shrink:0}
.lvt-spire{width:52px;height:28px}.lvt-base{display:block;width:52px;height:9px;border-radius:2px;background:linear-gradient(90deg,var(--mt-d),var(--mt-l) 40%,var(--mt-m) 60%,var(--mt-d))}
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
.lvt-foot{flex-shrink:0;padding:4px 0 2px;display:flex;flex-direction:column;gap:12px}@media (max-height:780px){.lvt-rw{transform:scale(.84);margin:-12px 0}.lvt-name{font-size:22px}.lvt-floor{height:46px}#liveIn.lvt{gap:9px}}@media (max-height:680px){.lvt-rw{transform:scale(.72);margin:-24px 0}.lvt-sys{display:none}}
.lvt-ins{display:flex;gap:10px;position:relative}
#liveIn.lvt .lvt-ins:has(.lvt-nt) .lvt-step>span:first-child{height:34px;display:flex;align-items:center}
#liveIn.lvt .lvt-ins:has(.lvt-nt) .lvt-step{gap:8px}
#liveIn.lvt .lvt-nt{all:unset;box-sizing:border-box;cursor:pointer;position:absolute;right:0;top:0;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:rgba(245,241,230,.07);color:var(--mut)}
#liveIn.lvt .lvt-nt svg{width:15px;height:15px}#liveIn.lvt .lvt-nt b{position:absolute;top:-6px;left:-7px;min-width:16px;height:16px;padding:0 3px;box-sizing:border-box;border-radius:5px;background:var(--rk);color:var(--rk-ink);font:900 10px/16px "Barlow Semi Condensed",sans-serif;text-align:center}
#liveIn.lvt .lvt-nt:active{background:rgba(245,241,230,.12)}
#liveIn.lvt .lvt-nt:focus-visible{outline:2px solid var(--lvt-rmid);outline-offset:2px}
.ntw{position:fixed;inset:0;z-index:950;display:flex;flex-direction:column;justify-content:flex-end}
.ntbg{all:unset;position:absolute;inset:0;background:rgba(2,4,8,.72);-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px)}
.ntcard{position:relative;max-width:520px;width:100%;margin:0 auto;border-radius:22px 22px 0 0;padding:3px 3px 0;background:linear-gradient(90deg,var(--mt-d),var(--mt-m) 40%,var(--mt-l) 60%,var(--mt-d));animation:ntUp .2s ease-out}
@keyframes ntUp{from{transform:translateY(30px);opacity:0}}
.ntin{box-sizing:border-box;border-radius:19px 19px 0 0;padding:18px 18px calc(18px + env(safe-area-inset-bottom,0px));background:radial-gradient(70% 50% at 90% 0%,color-mix(in srgb,var(--rk) 16%,transparent),transparent 65%),#0A0A0D;color:#F5F1E6;font-family:Barlow,system-ui,sans-serif;display:flex;flex-direction:column;gap:12px;max-height:min(78vh,calc(var(--vvh,100dvh) - 60px))}
.nteb{display:flex;justify-content:space-between;align-items:center;font:800 10px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.3em;color:var(--mt-l)}
.ntxx{all:unset;cursor:pointer;width:30px;height:30px;border-radius:50%;border:1px solid color-mix(in srgb,var(--mt-l) 35%,transparent);display:grid;place-items:center;font-size:12px;letter-spacing:0;color:var(--mt-l)}
.ntt{font:900 24px/1.05 "Barlow Semi Condensed",sans-serif;text-transform:uppercase;background:linear-gradient(180deg,var(--rk-core),var(--rk-mid) 60%,var(--rk-dd));-webkit-background-clip:text;background-clip:text;color:transparent;margin-top:-4px}
.ntadd{display:flex;gap:8px;align-items:stretch}
.ntadd textarea{flex:1;min-width:0;box-sizing:border-box;min-height:46px;max-height:120px;resize:none;padding:12px;border-radius:12px;border:1px solid color-mix(in srgb,var(--rk) 50%,transparent);background:#0E0F12;color:#F5F1E6;font:500 16px/1.35 Barlow,sans-serif;outline:none}
.ntadd textarea:focus{box-shadow:0 0 0 3px color-mix(in srgb,var(--rk) 18%,transparent)}
.ntadd textarea::placeholder{color:#5E6470}
.ntgo{all:unset;cursor:pointer;align-self:center;padding:12px 14px;border-radius:9px;background:linear-gradient(180deg,var(--rk),var(--rk-d));color:#F3FFF9;font:900 12px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.2em;white-space:nowrap}
.ntgo[disabled]{opacity:.4;cursor:default}
.nthd{display:flex;justify-content:space-between;font:800 10px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.24em;color:var(--mt-l);border-top:1px solid color-mix(in srgb,var(--mt-m) 30%,transparent);padding-top:12px}
.nthd span:last-child{color:#8F97A6}
.ntlist{overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;margin:0 -4px;padding:0 4px;min-height:60px}
.ntit{display:flex;gap:10px;padding:10px 0;border-bottom:1px solid rgba(245,241,230,.06)}
.ntit>i{width:8px;height:8px;margin-top:5px;transform:rotate(45deg);border:1.5px solid var(--rk-mid);flex-shrink:0}.ntit:first-child>i{background:var(--rk-mid);box-shadow:0 0 8px var(--rk-mid)}
.ntit>div{flex:1;min-width:0}.ntm{display:flex;justify-content:space-between;gap:8px;font:800 9.5px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.16em;color:#8F97A6}.ntm em{font-style:normal;color:var(--mt-l);letter-spacing:.06em;white-space:nowrap}
.ntit p{margin:5px 0 0;font:500 14px/1.4 Barlow,sans-serif;color:#E6E2D8;white-space:pre-wrap;overflow-wrap:anywhere}
.ntdel{all:unset;cursor:pointer;flex-shrink:0;align-self:flex-start;width:26px;height:26px;display:grid;place-items:center;border-radius:6px;color:#5E6470;font-size:12px}
.ntnone{padding:14px 0;font:500 13px/1.4 Barlow,sans-serif;color:#8F97A6}
.lvt-step{flex:1;display:flex;flex-direction:column;gap:6px;min-width:0}.lvt-step>span:first-child{font:800 10px/1 var(--fnt);letter-spacing:.24em;color:var(--mut)}
.lvt-sbox{display:flex;align-items:center;height:54px;padding:0 6px;border-radius:14px;background:#0B0B0E;border:1px solid rgba(245,241,230,.12)}
.lvt-sbox button{width:36px;height:36px;flex-shrink:0;border-radius:10px;border:0;background:rgba(245,241,230,.07);color:var(--mut);font-size:20px;cursor:pointer}
#liveIn.lvt .lvt-sbox input{flex:1;min-width:0;width:100%;border:0;background:none;box-shadow:none;text-align:center;color:#F5F1E6;font:800 24px/1 var(--fnt);padding:0;height:auto}
#liveIn.lvt .lvt-sbox input:focus{outline:none}.lvt-sbox:focus-within{border-color:var(--lvt-mid)}
#liveIn.lvt .lvt-big{width:100%;height:58px;border-radius:14px;border:0;cursor:pointer;font:800 17px/1 var(--fnt);letter-spacing:.16em;text-transform:uppercase;color:var(--rk-ink);
  background:linear-gradient(180deg,var(--lvt-r),color-mix(in srgb,var(--lvt-r) 68%,black));box-shadow:0 12px 28px -12px var(--lvt-r),inset 0 1px 0 rgba(255,255,255,.25)}
#liveIn.lvt .lvt-big.blue{color:#F2F6FF;background:linear-gradient(180deg,var(--lvt),color-mix(in srgb,var(--lvt) 68%,black));box-shadow:0 12px 28px -12px var(--lvt)}
.lvt-rw{position:relative;width:184px;height:184px;display:grid;place-items:center;align-content:center;gap:4px;margin:4px 0}
.lvt-ring{position:absolute;inset:0}.lvt-ring span{position:absolute;left:50%;top:50%;width:14px;height:22px;margin:-11px 0 0 -7px}
.lvt-ring span{--lv:1}.lvt-ring .lvt-rune{width:14px;height:22px;opacity:calc(.22 + .78 * var(--lv));filter:drop-shadow(0 0 calc(4px * var(--lv)) var(--lvt-rmid))}.lvt-ring path{stroke:color-mix(in srgb,var(--lvt-rmid) calc(var(--lv) * 100%),#4A443D)}.lvt-ring span.edge .lvt-rune{filter:drop-shadow(0 0 calc(7px * var(--lv)) var(--lvt-rcore))}.lvt-ring span.off .lvt-rune{filter:none;opacity:.22}.lvt-ring span.off path{stroke:#4A443D}
.lvt-tower{position:relative}.lvt-row{position:relative}
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
