/* Daily Seals: three daily seals on Home — Stride (steps), Rite (guided mobility), Rest (in bed by your bedtime).
   Each side of the triangle is one seal made of 7 runes that catch fire (in your rank colour) as it fills.
   Seals never affect ranks. Data lives in S.profile.seals and resets with the quest day (4 a.m.). */
const SL_RUNES = ["M-1 -9 V9 M-1 -9 L5 -4 M-1 -2 L5 3", "M0 -9 V9 M-5 -5 L5 5", "M-5 9 L0 -9 L5 9 M-3 2 H3", "M-4 -9 V9 M-4 -9 L4 -3 L-4 3",
  "M0 -9 V9 M-5 -9 L0 -3 L5 -9", "M-5 -9 L5 9 M5 -9 L-5 9", "M-4 -9 V9 M4 -9 V9 M-4 -6 L4 6", "M0 -9 L5 0 L0 9 L-5 0 Z",
  "M-4 -9 V9 M-4 0 L4 -9 M-4 0 L4 9", "M0 -9 V9 M0 0 L5 -5 M0 4 L-5 -1", "M-5 -9 H5 M0 -9 V9 M-4 9 H4", "M-5 -6 L0 -9 L5 -6 M0 -9 V9"];
const SL_A = [150, 26], SL_B = [274, 240], SL_C = [26, 240], SL_N = 7;
const SL_CEN = [(SL_A[0] + SL_B[0] + SL_C[0]) / 3, (SL_A[1] + SL_B[1] + SL_C[1]) / 3];
const SL_SIDES = [["S", SL_C, SL_A], ["R", SL_A, SL_B], ["T", SL_B, SL_C]];      // Stride up the left, Rite down the right, Rest along the bottom
const SL_CORNER = { S: SL_A, R: SL_B, T: SL_C };
const SL_NAME = { S: "Stride", R: "Rite", T: "Rest" };
// icons, centred on their own bounds so they sit in the middle of each sigil
const SL_IC = {
  S: ["stroke", "M-6 -6.5 L0.5 0 L-6 6.5 M0.5 -6.5 L7 0 L0.5 6.5", "M-11 -3.2 H-7.5 M-12.5 0 H-8.6 M-11 3.2 H-7.5", -2.63, 0, 21.16],
  R: ["fill", "M0 5.5 C-3 2 -3.2 -3 0 -7.5 C3.2 -3 3 2 0 5.5 Z M-0.6 6 C-5 5.6 -8.4 2 -8.6 -2.6 C-4.6 -2 -2.2 1 -0.6 6 Z M0.6 6 C5 5.6 8.4 2 8.6 -2.6 C4.6 -2 2.2 1 0.6 6 Z", "M-6.5 8.3 H6.5", 0, .76, 17.2],
  T: ["fill", "M1 -7.8 A7.8 7.8 0 1 0 7.6 3.6 A6.2 6.2 0 1 1 1 -7.8 Z M6.6 -7.4 L7.3 -5.6 L9.1 -4.9 L7.3 -4.2 L6.6 -2.4 L5.9 -4.2 L4.1 -4.9 L5.9 -5.6 Z", "", .99, -.01, 16.22 / 1.04]};
const SL_HOLD = [1.6, 2, 2.2, 2.5, 2.8, 3.2];                                     // Rite holds get longer as you rank up

/* ---------- data ---------- */
function slStore() { const P = S.profile; if (!P.seals || typeof P.seals !== "object") P.seals = {}; const Z = P.seals; if (!Z.d) Z.d = {}; if (!Z.goal) Z.goal = { steps: 8000, bed: "23:30" }; return Z }
function slKey() { return typeof questDay === "function" ? questDay() : ymd(today) }
function slDay(k) { const Z = slStore(); return Z.d[k] || (Z.d[k] = {}) }
function slSave() { const Z = slStore(), cut = ymd(addDays(today, -60)); Object.keys(Z.d).forEach(k => { if (k < cut) delete Z.d[k] }); saveProfile() }
function slRankIdx() { try { const H = hubRank(); return H.un ? 0 : Math.min(5, H.ov) } catch (e) { return 0 } }
function slRite(k) {                                                             // today's routine, scaled by rank
  const d = parseYmd(k), key = typeof mobilityFocus === "function" ? mobilityFocus(d) : "full", f = MOBILITY[key] || MOBILITY.full, m = SL_HOLD[slRankIdx()];
  const moves = f.moves.map(([n, a]) => ({ n, a, s: Math.round(slSec(a) * m / 5) * 5 }));
  return { key, t: f.t, moves, total: moves.reduce((t, x) => t + x.s, 0) };
}
function slSec(a) {                                                              // "45 s each side" → 90, "10 each side" → 60, "3 × 20 s" → 80
  const s = String(a).toLowerCase(), side = /each/.test(s) ? 2 : 1;
  let m = s.match(/(\d+)\s*[×x]\s*(\d+)\s*s/); if (m) return +m[1] * +m[2] + (+m[1] - 1) * 10;
  m = s.match(/(\d+)\s*min/); if (m) return +m[1] * 60 * side;
  m = s.match(/(\d+)\s*s\b/); if (m) return +m[1] * side;
  m = s.match(/(\d+)/); if (m) return +m[1] * (/slow/.test(s) ? 4 : 3) * side;
  return 45;
}
function slBedTarget(k) { const [h, mi] = String(slStore().goal.bed || "23:30").split(":").map(Number), d = parseYmd(k); d.setHours(h, mi, 0, 0); if (h < 12) d.setDate(d.getDate() + 1); return d }
function slState(k) {
  const Z = slStore(), r = slDay(k), goal = Math.max(1000, +Z.goal.steps || 8000), R = slRite(k);
  const st = Math.max(0, +r.st || 0), ri = Math.max(0, +r.ri || 0);
  let bedOk = false, bedT = null; if (r.bed) { bedT = new Date(r.bed); bedOk = bedT.getTime() <= slBedTarget(k).getTime() + 30 * 60e3 }
  const v = { S: Math.min(1, st / goal), R: R.total ? Math.min(1, ri / R.total) : 0, T: r.bed ? (bedOk ? 1 : 0) : 0 };
  return { k, r, goal, st, ri, R, v, bedT, bedOk, done: ["S", "R", "T"].filter(s => v[s] >= 1).length, claimed: !!r.cl };
}
function slSealedCount() { const Z = slStore(); return Object.values(Z.d).filter(r => r.cl).length }

/* ---------- drawing ---------- */
function slMix(a, b, t) { const h = x => [1, 3, 5].map(i => parseInt(x.slice(i, i + 2), 16)), A = h(a), B = h(b); return "#" + A.map((x, i) => Math.round(x + (B[i] - x) * t).toString(16).padStart(2, "0")).join("") }
function slPal(i) {
  const c = RK_COL[i] || RK_COL[0], met = (typeof RK_METAL !== "undefined" && RK_METAL[i]) || ["#3A4049", "#B4BBC5", "#707884"];
  return { core: slMix(c, "#ffffff", .85), mid: slMix(c, "#ffffff", .42), outer: c, dim: slMix(c, "#121216", .82), dimhi: slMix(c, "#121216", .66), m0: met[0], m1: met[1], m2: met[2], deep: slMix(met[0], "#000000", .45) };
}
function slIcon(s, col, sc, extra) {
  const [kind, d, d2, cx, cy, w] = SL_IC[s], k = 17 / w * sc, tcol = col.startsWith("url(") ? "var(--sl-m2)" : col;
  const main = kind === "stroke" ? `<path d="${d}" fill="none" stroke="${col}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" ${extra || ""}/>` : `<path d="${d}" fill="${col}" ${extra || ""}/>`;
  return `<g transform="scale(${k.toFixed(3)}) translate(${-cx} ${-cy})">${main}${d2 ? `<path d="${d2}" fill="none" stroke="${tcol}" stroke-width="1.45" stroke-linecap="round" ${extra || ""}/>` : ""}</g>`;
}
function slRot(P, Q) { const mx = (P[0] + Q[0]) / 2, my = (P[1] + Q[1]) / 2; let nx = SL_CEN[0] - mx, ny = SL_CEN[1] - my; const L = Math.hypot(nx, ny); nx /= L; ny /= L; return Math.atan2(nx, -ny) * 180 / Math.PI }
function slDefs() {
  const burn = (id, seed, blur, steps, scale, dur) => {
    let ups = "", merge = ""; for (let k = 1; k <= steps; k++) { ups += `<feOffset in="b" dy="-${k * 4}" result="u${k}"/><feComponentTransfer in="u${k}" result="f${k}"><feFuncA type="linear" slope="${Math.max(.15, 1 - k * .22).toFixed(2)}"/></feComponentTransfer>`; merge = `<feMergeNode in="f${k}"/>` + merge }
    return `<filter id="${id}" filterUnits="userSpaceOnUse" x="-40" y="-50" width="380" height="390" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceGraphic" stdDeviation="${blur}" result="b"/>${ups}<feMerge result="plume">${merge}<feMergeNode in="b"/></feMerge>
      <feTurbulence type="fractalNoise" baseFrequency="0.045 0.1" numOctaves="2" seed="${seed}" stitchTiles="stitch" result="n"/>
      <feOffset in="n" dy="0" result="n1"><animate attributeName="dy" values="0;-390" dur="${dur}s" repeatCount="indefinite"/></feOffset>
      <feOffset in="n" dy="390" result="n2"><animate attributeName="dy" values="390;0" dur="${dur}s" repeatCount="indefinite"/></feOffset>
      <feMerge result="ns"><feMergeNode in="n1"/><feMergeNode in="n2"/></feMerge><feDisplacementMap in="plume" in2="ns" scale="${scale}" xChannelSelector="R" yChannelSelector="G" result="fl"/><feGaussianBlur in="fl" stdDeviation=".5"/></filter>`;
  };
  let d = "";
  ["S", "R", "T"].forEach((s, i) => { d += burn("slBO" + s, 11 + i * 7, 1.3, 3, 15, 2.6 + i * .3) + burn("slBI" + s, 23 + i * 5, .8, 2, 9, 1.9 + i * .2) });
  d += `<filter id="slGlow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="slSoft" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation=".55" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="slHalo" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="5"/></filter>
    <filter id="slHalo2" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.6"/></filter>
    <filter id="slDrop" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="#000" flood-opacity=".7"/></filter>
    <radialGradient id="slBloom"><stop offset="0" stop-color="var(--sl-mid)" stop-opacity=".55"/><stop offset=".5" stop-color="var(--sl-outer)" stop-opacity=".18"/><stop offset="1" stop-color="var(--sl-outer)" stop-opacity="0"/></radialGradient>
    <linearGradient id="slMetal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--sl-m1)"/><stop offset=".45" stop-color="var(--sl-m2)"/><stop offset="1" stop-color="var(--sl-m0)"/></linearGradient>
    <linearGradient id="slMetalRev" x1="1" y1="1" x2="0" y2="0"><stop offset="0" stop-color="var(--sl-m1)"/><stop offset=".5" stop-color="var(--sl-m2)"/><stop offset="1" stop-color="var(--sl-m0)"/></linearGradient>
    <radialGradient id="slEnamel" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="var(--sl-dim)"/><stop offset="1" stop-color="#0B0B0D"/></radialGradient>`;
  return d;
}
function slSvg(X) {
  const v = X.v, pos = (P, Q, t) => [P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t], tAt = i => .13 + i * (.74 / (SL_N - 1));
  let g = `<circle cx="${SL_CEN[0]}" cy="${SL_CEN[1]}" r="96" fill="url(#slBloom)" opacity="${X.done === 3 ? 1 : X.done * .22}"/>
    <circle cx="${SL_CEN[0]}" cy="${SL_CEN[1]}" r="128" fill="none" stroke="var(--sl-dim)" stroke-width="1"/><circle cx="${SL_CEN[0]}" cy="${SL_CEN[1]}" r="122" fill="none" stroke="var(--sl-dim)" stroke-width="3" pathLength="360" stroke-dasharray="0.6 5.4"/>`;
  SL_SIDES.forEach(([s, P, Q]) => {
    const r = slRot(P, Q), lit = v[s] * SL_N, op = i => { const f = Math.max(0, Math.min(1, lit - i)); return f >= 1 ? 1 : f > 0 ? .35 + f * .65 : 0 };
    g += `<line x1="${P[0]}" y1="${P[1]}" x2="${Q[0]}" y2="${Q[1]}" stroke="var(--sl-dim)" stroke-width="1" stroke-dasharray="2 5"/>`;
    let fo = "", fi = "", runes = "";
    for (let i = 0; i < SL_N; i++) {
      const [x, y] = pos(P, Q, tAt(i)), d = SL_RUNES[(i * 5 + s.charCodeAt(0)) % SL_RUNES.length], o = op(i), tr = `transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${r.toFixed(1)}) scale(1.05)"`;
      if (o) { fo += `<path d="${d}" ${tr} stroke="var(--sl-outer)" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${o}"/>`; fi += `<path d="${d}" ${tr} stroke="var(--sl-mid)" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${o}"/>` }
      const delay = ((i * 37 + s.charCodeAt(0) * 13) % 23) / 10, sx = ((i * 7 + s.charCodeAt(0)) % 5 - 2) * 2;
      runes += `<g ${tr}><path d="${d}" stroke="var(--sl-dim)" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" stroke="var(--sl-dimhi)" stroke-width=".6" fill="none" stroke-linecap="round" transform="translate(-.4 -.5)"/>`
        + (o ? `<g opacity="${o}"><g class="${o < 1 ? "sl-ig" : "sl-fl"}" style="animation-delay:-${delay}s"><path d="${d}" stroke="var(--sl-outer)" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round" filter="url(#slGlow)" opacity=".7"/><path d="${d}" stroke="var(--sl-mid)" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" stroke="var(--sl-core)" stroke-width="1" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`
          + `<g transform="rotate(${(-r).toFixed(1)})">${[0, 1].map(k => `<circle r="${[.9, 1.2][k]}" fill="var(--sl-${k ? "mid" : "core"})" filter="url(#slSoft)" class="sl-em" transform="translate(${[-3, 2][k]} -12)" style="--dx:${[sx, -sx - 2][k]}px;--dx2:${[-2, 3][k]}px;animation-delay:-${(delay + k * .9).toFixed(1)}s;animation-duration:${(2.4 + ((i + s.charCodeAt(0) + k) % 4) * .5).toFixed(2)}s"/>`).join("")}</g></g>` : "") + `</g>`;
    }
    if (fo) g += `<g filter="url(#slBO${s})" opacity=".72" class="sl-fl">${fo}</g><g filter="url(#slBI${s})" opacity=".6">${fi}</g>`;
    g += runes;
    if (v[s] > 0 && v[s] < 1) { const t = .13 + Math.min(SL_N - 1, Math.max(0, lit - .5)) * (.74 / (SL_N - 1)), [x, y] = pos(P, Q, t);
      g += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><circle r="5" fill="var(--sl-mid)" opacity=".16" filter="url(#slGlow)" class="sl-ig"/>${[0, 1, 2, 3].map(k => `<circle r="${[1, 1.3, .8, 1.1][k]}" fill="var(--sl-${k % 2 ? "core" : "mid"})" filter="url(#slSoft)" class="sl-em" transform="translate(${[-3, 2, 0, 4][k]} -10)" style="--dx:${[-6, 4, -2, 7][k]}px;--dx2:${[3, -3, 4, -5][k]}px;animation-delay:-${(k * .42).toFixed(2)}s;animation-duration:${(1.7 + k * .25).toFixed(2)}s"/>`).join("")}</g>` }
  });
  // enamel sigils in your rank's blade metal
  ["S", "R", "T"].forEach(s => {
    const [x, y] = SL_CORNER[s], on = v[s] >= 1, r = 19;
    g += `<g class="sl-sig" transform="translate(${x} ${y})"><g filter="url(#slDrop)"><circle r="${r}" fill="url(#slMetal)"/><circle r="${r - 1.2}" fill="none" stroke="url(#slMetalRev)" stroke-width="1.2"/><circle r="${r - 4}" fill="url(#slEnamel)" stroke="var(--sl-deep)" stroke-width="1.2"/><circle r="${r - 6.5}" fill="none" stroke="var(--sl-m2)" stroke-width=".5" stroke-dasharray="1 2.2" opacity=".55"/></g>`
      + (on ? `<g class="sl-glow"><circle r="${r + 10}" fill="var(--sl-outer)" opacity=".3" filter="url(#slHalo)"/></g>${slIcon(s, "var(--sl-mid)", .86, `filter="url(#slHalo2)"`)}${slIcon(s, "var(--sl-core)", .86)}` : slIcon(s, "url(#slMetal)", .86)) + `</g>`;
  });
  g += `<text x="${SL_CEN[0]}" y="${SL_CEN[1] + 6}" text-anchor="middle" class="sl-n" ${X.done === 3 ? `style="fill:var(--sl-core)"` : ""}>${X.done}/3</text><text x="${SL_CEN[0]}" y="${SL_CEN[1] + 22}" text-anchor="middle" class="sl-nl">${X.done === 3 ? "DAY SEALED" : "SEALED"}</text>`;
  return `<svg class="sl-svg" viewBox="0 0 300 262" role="img" aria-label="${X.done} of 3 seals done today"><defs>${slDefs()}</defs>${g}</svg>`;
}
function slFmtT(d) { return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toLowerCase() }
function slBedStr() { const d = new Date(); const [h, m] = String(slStore().goal.bed || "23:30").split(":").map(Number); d.setHours(h, m, 0, 0); return slFmtT(d) }
function hubSeals() {
  if (typeof MOBILITY === "undefined") return "";
  const X = slState(slKey()), P = slPal(slRankIdx()), mins = Math.floor(X.ri / 60), tmin = Math.round(X.R.total / 60);
  const col = (s, val, sub) => `<button type="button" class="sl-col ${X.v[s] >= 1 ? "on" : ""}" data-seal="${s}" aria-label="${SL_NAME[s]}: ${esc(val)} ${esc(sub)}${X.v[s] >= 1 ? ", sealed" : ""}"><svg viewBox="-12 -11 24 22" aria-hidden="true">${slIcon(s, "var(--sl-mid)", .85)}</svg><span class="sl-lbl">${SL_NAME[s].toUpperCase()}</span><b>${esc(val)}</b><small>${esc(sub)}</small></button>`;
  const rest = X.r.bed ? [slFmtT(X.bedT), X.bedOk ? "in bed on time" : "after bedtime"] : [slBedStr(), "bedtime target"];
  const sealed = X.done === 3, paint = h => h.replace(/var\(--sl-(\w+)\)/g, (m, k) => P[k] || m);
  return paint(`<section class="sl-card ${sealed ? "sealed" : ""}" aria-label="Today's seals" style="--sl-core:${P.core};--sl-mid:${P.mid};--sl-outer:${P.outer};--sl-dim:${P.dim};--sl-dimhi:${P.dimhi};--sl-m0:${P.m0};--sl-m1:${P.m1};--sl-m2:${P.m2};--sl-deep:${P.deep}">
    <div class="sl-head"><span class="sl-title">TODAY'S SEALS</span><span class="sl-reset">Resets at 4 a.m.</span></div>
    <div class="sl-art">${slSvg(X)}${["S", "R", "T"].map(s => `<button type="button" class="sl-hit sl-hit-${s}" data-seal="${s}" aria-label="Open ${SL_NAME[s]}"></button>`).join("")}</div>
    <div class="sl-cols">${col("S", X.st.toLocaleString(), `of ${X.goal.toLocaleString()} steps`)}${col("R", `${mins} min`, `of ${tmin} · ${X.R.t}`)}${col("T", rest[0], rest[1])}</div>
    ${sealed ? (X.claimed ? `<div class="sl-gate done"><span><b>DAY SEALED</b><small>${slSealedCount()} day${slSealedCount() === 1 ? "" : "s"} sealed so far</small></span><span class="sl-ok">✓</span></div>`
      : `<div class="sl-gate"><span><b>ALL THREE SEALS DONE</b><small>Seal the day to bank it</small></span><button type="button" class="sl-claim" data-seal-claim="1">Seal the day</button></div>`) : ""}
  </section>`).replace(/style="--sl-core:[^"]*"/, `style="--sl-core:${P.core};--sl-mid:${P.mid};--sl-outer:${P.outer};--sl-dim:${P.dim};--sl-dimhi:${P.dimhi};--sl-m0:${P.m0};--sl-m1:${P.m1};--sl-m2:${P.m2};--sl-deep:${P.deep}"`);
}

/* ---------- sheets ---------- */
function slSheetHtml() {
  const X = slState(slKey()), Z = slStore(), close = `<button type="button" class="link small" data-xs-done="1">Done</button>`;
  if (SH.kind === "sealS") {
    const pct = Math.round(X.v.S * 100);
    return `<div class="xs-head row" style="justify-content:space-between;align-items:center"><h3 style="margin:0">Stride · steps</h3>${close}</div>
      <p class="small muted" style="margin:0">${X.st.toLocaleString()} of ${X.goal.toLocaleString()} steps today (${pct}%).</p>
      <label class="field"><span>Today's steps</span><input type="number" inputmode="numeric" min="0" max="200000" id="slSteps" value="${X.st || ""}" placeholder="e.g. 6400"></label>
      <div class="row" style="gap:8px;flex-wrap:wrap"><button type="button" class="btn ghost small" data-sl-add="1000">+1,000</button><button type="button" class="btn ghost small" data-sl-add="2500">+2,500</button><button type="button" class="btn ghost small" data-sl-paste="1">Paste from Shortcut</button></div>
      <button type="button" class="btn" data-sl-steps="1">Save steps</button>
      <label class="field"><span>Daily goal</span><input type="number" inputmode="numeric" min="1000" max="50000" step="500" id="slGoal" value="${X.goal}"></label>
      <details class="sl-how"><summary>Fill it from your iPhone's Health app</summary><ol class="small">
        <li>Open <b>Shortcuts</b> and make a new shortcut.</li><li>Add <b>Find Health Samples</b>: Steps, where Start Date is Today.</li><li>Add <b>Calculate Statistics</b>: Sum.</li><li>Add <b>Copy to Clipboard</b>.</li>
        <li>Run it (or tap it from a home-screen widget), then open RankUp and tap <b>Paste from Shortcut</b>.</li></ol>
        <p class="small muted" style="margin:0">Automatic syncing without the paste needs a native app, which comes later.</p></details>`;
  }
  if (SH.kind === "sealR") {
    const R = X.R, P = SH.play;
    if (P) {
      const m = R.moves[P.i], left = Math.max(0, Math.ceil(P.left));
      return `<div class="xs-head row" style="justify-content:space-between;align-items:center"><h3 style="margin:0">Rite · ${esc(R.t)}</h3>${close}</div>
        <div class="sl-play"><span class="sl-step">Move ${P.i + 1} of ${R.moves.length}</span><b class="sl-move">${esc(m.n)}</b><span class="small muted">${esc(m.a)}</span>
          <span class="sl-time" id="slTime">${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}</span>
          <span class="sl-pbar"><i id="slPbar" style="width:${Math.min(100, X.ri / R.total * 100).toFixed(1)}%"></i></span>
          <div class="row" style="gap:8px;justify-content:center"><button type="button" class="btn ghost small" data-sl-prev="1" ${P.i ? "" : "disabled"}>Back</button><button type="button" class="btn small" data-sl-pause="1">${P.run ? "Pause" : "Resume"}</button><button type="button" class="btn ghost small" data-sl-next="1">${P.i < R.moves.length - 1 ? "Next" : "Finish"}</button></div></div>
        ${R.moves[P.i + 1] ? `<p class="small muted" style="margin:0;text-align:center">Up next: ${esc(R.moves[P.i + 1].n)}</p>` : ""}`;
    }
    const doneMin = Math.floor(X.ri / 60);
    return `<div class="xs-head row" style="justify-content:space-between;align-items:center"><h3 style="margin:0">Rite · ${esc(R.t)}</h3>${close}</div>
      <p class="small muted" style="margin:0">Picked from what you trained the last two days. ${Math.round(R.total / 60)} minutes${slRankIdx() > 1 ? ", with longer holds for your rank" : ""}.</p>
      <ol class="sl-moves">${R.moves.map(m => `<li><b>${esc(m.n)}</b><span>${esc(m.a)}</span></li>`).join("")}</ol>
      <button type="button" class="btn" data-sl-start="1">${X.v.R >= 1 ? "Do it again" : X.ri ? `Resume (${doneMin} min done)` : "Start the Rite"}</button>`;
  }
  if (SH.kind === "sealT") {
    const now = new Date(), h = now.getHours(), evening = h >= 18 || h < 4;
    return `<div class="xs-head row" style="justify-content:space-between;align-items:center"><h3 style="margin:0">Rest · bedtime</h3>${close}</div>
      <p class="small muted" style="margin:0">Tap when you're getting into bed. In bed within 30 minutes of your bedtime seals Rest.</p>
      ${X.r.bed ? `<p style="margin:0"><b>In bed at ${slFmtT(X.bedT)}</b> · ${X.bedOk ? "on time ✓" : "after your bedtime"}</p><button type="button" class="link small" data-sl-unbed="1">Undo</button>`
        : evening ? `<button type="button" class="btn" data-sl-bed="1">I'm going to bed</button>` : `<p class="small muted" style="margin:0">The button shows up from 6 p.m.</p>`}
      <label class="field"><span>Bedtime</span><input type="time" id="slBed" value="${esc(Z.goal.bed || "23:30")}"></label>`;
  }
  return "";
}
if (typeof extraSheetHtml === "function") { const _x = extraSheetHtml; extraSheetHtml = function () { return /^seal[SRT]$/.test(SH && SH.kind) ? slSheetHtml() : _x() } }
function slRefresh() { if (typeof tab !== "undefined" && tab === "hub") { lastRenderKey = ""; render() } }
function slOpen(s) { openSheet({ kind: "seal" + s }) }

/* Rite player: the clock runs from timestamps, so it stays right if the screen sleeps */
let slTimer = null;
function slTick() {
  if (!SH || SH.kind !== "sealR" || !SH.play) { clearInterval(slTimer); slTimer = null; return }
  const P = SH.play; if (!P.run) return;
  const now = Date.now(), dt = (now - P.last) / 1000; P.last = now; P.left -= dt;
  const r = slDay(slKey()), R = slRite(slKey()); r.ri = Math.min(R.total, (+r.ri || 0) + dt); P.acc = (P.acc || 0) + dt;
  if (P.left <= 0) { if (navigator.vibrate) try { navigator.vibrate(60) } catch (e) {} if (P.i < R.moves.length - 1) { P.i++; P.left = R.moves[P.i].s; paintSheet() } else slFinish(); return }
  if (P.acc > 5) { P.acc = 0; slSave() }
  const t = document.getElementById("slTime"), b = document.getElementById("slPbar"), left = Math.max(0, Math.ceil(P.left));
  if (t) t.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`; if (b) b.style.width = Math.min(100, r.ri / R.total * 100).toFixed(1) + "%";
}
function slFinish() {
  const k = slKey(), r = slDay(k), R = slRite(k); r.ri = R.total; SH.play = null; clearInterval(slTimer); slTimer = null; slSave();
  if (typeof qSetTick === "function") try { qSetTick(questDay(), "mob", true) } catch (e) {}
  paintSheet(); slRefresh(); toast("Rite sealed");
}

document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("button"); if (!b) return; const d = b.dataset;
  if (d.seal) { slOpen(d.seal); return }
  if (d.sealClaim) { const r = slDay(slKey()), X = slState(slKey()); if (X.done === 3 && !r.cl) { r.cl = 1; slSave(); slRefresh(); toast("Day sealed") } return }
  if (!SH || !/^seal[SRT]$/.test(SH.kind)) return;
  const k = slKey(), r = slDay(k), Z = slStore();
  if (d.slAdd) { const inp = document.getElementById("slSteps"); r.st = Math.min(200000, (+r.st || 0) + +d.slAdd); slSave(); paintSheet(); slRefresh(); return }
  if (d.slSteps) { const v = parseInt((document.getElementById("slSteps") || {}).value, 10); r.st = isFinite(v) ? Math.max(0, Math.min(200000, v)) : 0; slSave(); paintSheet(); slRefresh(); if (slState(k).v.S >= 1) toast("Stride sealed"); return }
  if (d.slPaste) { (navigator.clipboard && navigator.clipboard.readText ? navigator.clipboard.readText() : Promise.reject()).then(t => { const v = parseInt(String(t).replace(/[^\d]/g, ""), 10); if (!isFinite(v) || v > 200000) { toast("No step count on the clipboard"); return } r.st = v; slSave(); paintSheet(); slRefresh(); toast(`${v.toLocaleString()} steps added`) }).catch(() => toast("Couldn't read the clipboard")); return }
  if (d.slStart) { const R = slRite(k); let i = 0, acc = 0; const done = slState(k).v.R >= 1 ? 0 : +r.ri || 0; if (slState(k).v.R >= 1) r.ri = 0;
    while (i < R.moves.length - 1 && acc + R.moves[i].s <= done) { acc += R.moves[i].s; i++ }
    SH.play = { i, left: R.moves[i].s - Math.max(0, done - acc), run: true, last: Date.now() }; paintSheet(); clearInterval(slTimer); slTimer = setInterval(slTick, 250); return }
  if (d.slPause) { const P = SH.play; if (!P) return; P.run = !P.run; P.last = Date.now(); slSave(); paintSheet(); return }
  if (d.slNext) { const P = SH.play, R = slRite(k); if (!P) return; if (P.i < R.moves.length - 1) { r.ri = Math.min(R.total, R.moves.slice(0, P.i + 1).reduce((t, m) => t + m.s, 0)); P.i++; P.left = R.moves[P.i].s; P.last = Date.now(); slSave(); paintSheet() } else slFinish(); return }
  if (d.slPrev) { const P = SH.play, R = slRite(k); if (!P || !P.i) return; P.i--; P.left = R.moves[P.i].s; r.ri = R.moves.slice(0, P.i).reduce((t, m) => t + m.s, 0); P.last = Date.now(); slSave(); paintSheet(); return }
  if (d.slBed) { r.bed = new Date().toISOString(); slSave(); paintSheet(); slRefresh(); toast(slState(k).bedOk ? "Rest sealed · sleep well" : "Logged · past your bedtime tonight"); return }
  if (d.slUnbed) { delete r.bed; slSave(); paintSheet(); slRefresh(); return }
  if (d.xsDone) { if (SH.play) { SH.play = null; slSave() } xsClose(); slRefresh(); return }
}, true);
document.addEventListener("change", e => {
  if (!SH || !/^seal[SRT]$/.test(SH.kind)) return; const Z = slStore();
  if (e.target.id === "slGoal") { const v = parseInt(e.target.value, 10); if (isFinite(v)) { Z.goal.steps = Math.max(1000, Math.min(50000, v)); slSave(); paintSheet(); slRefresh() } }
  if (e.target.id === "slBed" && /^\d{2}:\d{2}$/.test(e.target.value)) { Z.goal.bed = e.target.value; slSave(); paintSheet(); slRefresh() }
});

/* ---------- styles ---------- */
(() => { const st = document.createElement("style"); st.textContent = `
.sl-card{position:relative;padding:16px 14px 16px;border-radius:20px;background:radial-gradient(80% 60% at 50% 45%,color-mix(in srgb,var(--sl-outer) 9%,transparent),transparent 70%),#121216;border:1px solid rgba(245,241,230,.07);color:#F5F1E6;font-family:var(--body)}
.sl-card.sealed{border-color:color-mix(in srgb,var(--sl-mid) 40%,transparent)}
.sl-head{display:flex;justify-content:space-between;align-items:center;padding:0 4px}
.sl-title{font:800 11px/1 var(--display);letter-spacing:.3em;color:var(--sl-mid)}.sl-reset{font-size:12px;color:#8E897C}
.sl-art{position:relative;width:min(100%,300px);margin:6px auto 0;aspect-ratio:300/262}
.sl-svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.sl-n{font:900 34px var(--display);fill:#F5F1E6}.sl-nl{font:700 8.5px var(--display);letter-spacing:.3em;fill:#8E897C}
.sl-hit{position:absolute;width:20%;aspect-ratio:1;border:0;background:none;border-radius:50%;transform:translate(-50%,-50%);cursor:pointer;-webkit-tap-highlight-color:transparent}
.sl-hit-S{left:50%;top:9.9%}.sl-hit-R{left:91.3%;top:91.6%}.sl-hit-T{left:8.7%;top:91.6%}
.sl-hit:focus-visible{outline:2px solid var(--sl-mid);outline-offset:2px}
.sl-cols{display:flex;margin-top:8px}
.sl-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;border:0;background:none;color:inherit;font:inherit;padding:6px 2px;border-radius:12px;cursor:pointer;min-width:0}
.sl-col svg{width:20px;height:18px}.sl-lbl{font:800 10px/1 var(--display);letter-spacing:.24em;color:#A8A396}
.sl-col b{font:800 15px/1.1 var(--display);color:#F5F1E6}.sl-col.on b{color:var(--sl-mid)}.sl-col small{font-size:10.5px;color:#77736A;text-align:center;line-height:1.25;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sl-col:focus-visible{outline:2px solid var(--sl-mid)}
.sl-gate{margin-top:12px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 14px;border-radius:12px;border:1px solid color-mix(in srgb,var(--sl-mid) 35%,transparent);background:linear-gradient(90deg,color-mix(in srgb,var(--sl-outer) 14%,transparent),transparent)}
.sl-gate span{display:flex;flex-direction:column;gap:3px}.sl-gate b{font:800 11px/1 var(--display);letter-spacing:.28em;color:var(--sl-mid)}.sl-gate small{font-size:12px;color:#D8D2C2}
.sl-claim{padding:10px 14px;border-radius:10px;border:0;background:var(--sl-mid);color:#0B0B0D;font:800 13px/1 var(--display);letter-spacing:.08em;cursor:pointer}
.sl-ok{font:800 18px/1 var(--display);color:var(--sl-mid)}
@keyframes slFlick{0%,100%{opacity:1}23%{opacity:.84}41%{opacity:.97}58%{opacity:.8}77%{opacity:.93}}.sl-fl{animation:slFlick 1.9s infinite}
@keyframes slIg{0%,100%{opacity:.35}50%{opacity:1}}.sl-ig{animation:slIg .7s infinite ease-in-out}
.sl-em{transform-box:fill-box;transform-origin:center}
@keyframes slEm{0%{translate:0 0;opacity:0;scale:1}8%{opacity:1}30%{translate:var(--dx2) -12px;opacity:.9}55%{translate:calc(var(--dx)*.6) -24px;opacity:.55}62%{opacity:.85}100%{translate:var(--dx) -44px;opacity:0;scale:.4}}.sl-em{animation:slEm 2.6s infinite ease-out}
@keyframes slGl{0%,100%{opacity:1}50%{opacity:.7}}.sl-glow{animation:slGl 3.2s infinite ease-in-out}
@media (prefers-reduced-motion:reduce){.sl-fl,.sl-ig,.sl-em,.sl-glow{animation:none}.sl-em{opacity:0}}
.sl-moves{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:8px}.sl-moves li{display:flex;flex-direction:column}.sl-moves span{font-size:13px;color:var(--muted)}
.sl-play{display:flex;flex-direction:column;align-items:center;gap:8px;padding:10px 0;text-align:center}
.sl-step{font:800 11px/1 var(--display);letter-spacing:.24em;color:var(--muted)}.sl-move{font:800 24px/1.15 var(--display)}
.sl-time{font:900 54px/1 var(--display);font-variant-numeric:tabular-nums}
.sl-pbar{width:100%;height:6px;border-radius:3px;background:var(--line);overflow:hidden}.sl-pbar i{display:block;height:100%;background:var(--gym)}
.sl-how summary{cursor:pointer;font-weight:600}.sl-how ol{padding-left:20px;display:flex;flex-direction:column;gap:4px}
`; document.head.appendChild(st) })();
