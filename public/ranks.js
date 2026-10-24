/* Rank system: E–S ranks for Upper Body, Lower Body, Core, Speed and Endurance, earned from logged lifts and runs.
 * Spec: "Fitness Rank System — Design Spec v2". Every tunable number is in rank-config.js (RANK_CFG).
 * Loaded before the main app script; everything here runs lazily, at call time.
 *
 * How it works: logs → entries (one per working set or run effort, converted onto its part's reference lift)
 * → a part's value on a given day (best entry after fading; 0–5, e.g. 3.4 = B, 40% of the way to A)
 * → a replay from the placement day to today that applies Gates, demotion and reclaim in order.
 * Rank state is never stored, only its inputs (placement, pauses, exclusions, confirmations, time trials),
 * so editing or deleting a log re-checks everything automatically. */

const RKC = () => window.RANK_CFG;
const RK_PARTS = () => Object.keys(RKC().parts);
const rkLetter = n => RKC().letters[Math.max(0, Math.min(5, Math.floor(n)))];
const rkDays = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 86400000);
const rkAdd = (k, n) => ymd(addDays(parseYmd(k), n));
const rkMon = k => ymd(addDays(parseYmd(k), -((parseYmd(k).getDay() + 6) % 7)));
function rkData() { const p = S.profile || (S.profile = {}); if (!p.ranks || typeof p.ranks !== "object") p.ranks = {}; return p.ranks }
function rkSu() { return (S.profile && S.profile.setup) || {} }
function rkSex() { return rkSu().sex === "female" ? "female" : "male" }
function rkAgeAt(k) {
  const su = rkSu();
  if (su.birth && /^\d{4}-\d{2}$/.test(su.birth)) { const [y, m] = su.birth.split("-").map(Number), d = parseYmd(k); let a = d.getFullYear() - y; if (d.getMonth() + 1 < m) a--; if (a >= 10 && a < 110) return a }
  return Number(su.age) || 30;
}
function rkAgeStrength(a) { let f = 1; RKC().ageStrength.forEach(([x, v]) => { if (a >= x) f = v }); return f }
function rkAgeRun(a) { let m = 1; const t = RKC().ageRun; t.forEach(([from, rate], i) => { const to = i + 1 < t.length ? t[i + 1][0] : 200; if (a > from) m += rate * (Math.min(a, to) - from) }); return m }

/* ---------- ladders and values ---------- */
let RK_W = null; // sorted weigh-ins for the current compute
function rkBW(k) {
  const ws = RK_W || (S.profile.weights || []).filter(w => w && w.lb > 0).sort((a, b) => a.d < b.d ? -1 : 1);
  let v = null; for (const w of ws) { if (w.d <= k) v = w.lb; else break }
  if (v == null && ws.length) v = ws[0].lb;
  return v || Number(rkSu().weight) || RKC().refBW[rkSex()];
}
const RK_LCACHE = {};
function rkLadder(key, k, mode) {
  const ck = key + k + mode; if (RK_LCACHE[ck]) return RK_LCACHE[ck];
  const L = RKC().ladders[key], sx = rkSex(), a = rkAgeAt(k);
  let th = L[sx].map(x => L.kind === "time" ? x * rkAgeRun(a) : x * rkAgeStrength(a));
  if (mode === "scaled" && L.kind === "load") { const f = Math.pow(rkBW(k) / RKC().refBW[sx], RKC().scaleExp); th = th.map(x => x * f) }
  return RK_LCACHE[ck] = { th, kind: L.kind };
}
// metric → 0–5 (E = 0…1, D = 1…2, … S = 5)
function rkVal(m, L) {
  const t = L.th; if (!(m > 0)) return 0;
  if (L.kind === "time") { if (m > t[0]) return Math.max(0, (2 * t[0] - m) / t[0]); for (let i = 0; i < 4; i++) if (m > t[i + 1]) return i + 1 + (t[i] - m) / (t[i] - t[i + 1]); return 5 }
  if (m < t[0]) return m / t[0]; for (let i = 0; i < 4; i++) if (m < t[i + 1]) return i + 1 + (m - t[i]) / (t[i + 1] - t[i]); return 5;
}
const rkCap = (v, cap) => cap == null ? v : Math.min(v, cap + 0.999);
const rkPartCap = p => RKC().parts[p].cap;

/* ---------- entries ---------- */
function rkConv(id, l) {
  const C = RKC(); let eid = id;
  if (C.dbVariant[id] && typeof logDb === "function" && logDb(id, l)) eid = C.dbVariant[id];
  if (C.conv[eid]) return { eid, list: C.conv[eid] };
  const map = (rkData().maps || {})[id];
  if (map && C.conv[map]) return { eid: map, list: C.conv[map].map(c => ({ ...c, cap: Math.min(c.cap == null ? 3 : c.cap, 3), custom: true })) };
  return null;
}
function rkTotal(id, l, w) {
  if (typeof DBCFG !== "undefined" && DBCFG[id]) return loadW(id, l, w);
  const L = typeof libEx === "function" && libEx(id);
  return (Number(w) || 0) * (L && L.equip === "Dumbbell" ? (L.uni ? 1 : 2) : 1);
}
function rkExName(id) { const L = typeof libEx === "function" && libEx(id); if (L) return L.name; try { return exName(id) } catch (e) { return id } }
// one set → entries (one per part it counts for)
function rkSetEntries(k, l, id, s, i) {
  const out = [], cv = rkConv(id, l); if (!cv || !s || s.t === "w" || s.t === "d") return out;
  const B = rkBW(k), r = Number(s.r) || 0, w = Number(s.w) || 0, C = RKC();
  cv.list.forEach(c => {
    const lad = c.ladder || c.p, LK = C.ladders[lad].kind, rate = c.r || 1; let m = null, kind = c.k || "load";
    if (kind === "hold") { if (r > 0) m = r / rate }
    else if (kind === "bw" || kind === "assist") {
      if (r < 1) return; const load = kind === "assist" ? Math.max(0, B - w) : B + w;
      if (LK === "reps") m = Math.max(0, 30 * (load * (1 + r / 30) / rate / B - 1));
      else { if (r > C.maxReps) return; m = (r <= 1 ? load : load * (1 + r / 30)) / rate }
    } else {
      if (!(w > 0) || r < 1) return; const tot = rkTotal(id, l, w);
      if (LK === "reps") { if (r > C.maxReps) return; m = Math.max(0, 30 * (tot * (1 + r / 30) / rate / B - 1)) }
      else { if (r > C.maxReps) return; m = (r <= 1 ? tot : tot * (1 + r / 30)) / rate }
    }
    if (m == null || !isFinite(m)) return;
    const gateReps = kind === "hold" ? false : LK === "reps" ? true : (r >= C.gateReps[0] && r <= C.gateReps[1]);
    out.push({ p: c.p, lad, d: k, m, cap: c.cap, gateable: c.cap == null && !c.custom, gateReps, g: s.t === "g", ex: id, eid: cv.eid, set: { w: s.w, r, db: typeof logDb === "function" && logDb(id, l) }, key: `${k}|${id}|${i}`, bw: B, kind });
  });
  return out;
}
// fastest 400 m and mile inside a run's GPS breakdown (series of time/distance samples, or whole-mile splits)
function rkBestFromSt(st) {
  if (!st) return null; if (st.best) return st.best;
  const out = {}; const rec = RKC().runRecord;
  if (st.series && st.series.t && st.series.d && st.series.t.length > 3) {
    const T = st.series.t.map(x => x * 60), D = st.series.d.map(x => x * M_PER_MI);
    [["m400", 400], ["mile", M_PER_MI]].forEach(([key, dist]) => {
      let i = 0, best = null;
      for (let j = 1; j < D.length; j++) {
        if (D[j] - D[0] < dist) continue;
        while (i + 1 < j && D[j] - D[i + 1] >= dist) i++;
        const need = D[j] - dist, f = D[i + 1] > D[i] ? (need - D[i]) / (D[i + 1] - D[i]) : 0, t0 = T[i] + Math.max(0, Math.min(1, f)) * (T[i + 1] - T[i]), sec = T[j] - t0;
        if (sec > rec[key] && (best == null || sec < best)) best = sec;
      }
      if (best) out[key] = Math.round(best);
    });
  }
  (st.splits || []).forEach(sp => { if (sp && sp.mi >= 0.99 && sp.mi <= 1.01 && sp.pace > 0) { const sec = sp.pace * 60; if (sec > rec.mile && (!out.mile || sec < out.mile)) out.mile = Math.round(sec) } });
  return Object.keys(out).length ? out : null;
}
function rkRunEntries(k, run, key, gate) {
  const out = [], rec = RKC().runRecord; let t = run.min;
  if (run.st && run.st.movingMin > 0 && run.st.elapsedMin > 0) { const stop = run.st.elapsedMin - run.st.movingMin; t = stop / run.st.elapsedMin < 0.1 ? run.st.movingMin : run.st.elapsedMin }
  const mi = Number(run.mi) || 0; if (!(mi > 0 && t > 0)) return out;
  const base = { d: k, key, g: !!gate, gateable: true, gateReps: true, run: true };
  if (mi >= 3.1) { const eq = solveRace(vdot(mi * M_PER_MI, t), 3.107) * 60; out.push({ ...base, p: "endur", lad: "endur", m: eq, src: `${mi} mi in ${fmtMin(t)}`, whole: true }) }
  const st = run.st, gps = st && (st.src === "gpx" || st.src === "strava") && st.gps !== false && !st.treadmill;
  const b = gps ? rkBestFromSt(st) : null;
  if (b) { if (b.mile > rec.mile) out.push({ ...base, p: "mile", lad: "mile", m: b.mile, src: "fastest mile in a run" }); if (b.m400 > rec.m400) out.push({ ...base, p: "m400", lad: "m400", m: b.m400, src: "fastest 400 m in a run" }) }
  if (Math.abs(mi - 1) <= 0.03) out.push({ ...base, p: "mile", lad: "mile", m: t * 60, src: "mile run", whole: true });
  if (Math.abs(mi * M_PER_MI - 400) <= 12) out.push({ ...base, p: "m400", lad: "m400", m: t * 60, src: "400 m run", whole: true });
  return out;
}
function rkAllEntries() {
  const E = [], trained = {}; // trained[part] = Set of week keys
  const mark = (p, k) => { (trained[p] = trained[p] || new Set()).add(rkMon(k)) };
  const C = RKC(), td = ymd(today);
  Object.keys(S.logs).sort().forEach(k => {
    if (k > td) return; const l = S.logs[k]; if (!l) return;
    if (l.type === "gym" && l.ex) {
      const cnt = {};
      Object.entries(l.ex).forEach(([id, sets]) => {
        const cv = rkConv(id, l), L = typeof libEx === "function" && libEx(id), parts = cv ? [...new Set(cv.list.map(c => c.p))] : (L && C.muscleParts[L.muscle] ? [C.muscleParts[L.muscle]] : []);
        (sets || []).forEach((s, i) => { if (!s || s.t === "w") return; parts.forEach(p => cnt[p] = (cnt[p] || 0) + 1); E.push(...rkSetEntries(k, l, id, s, i)) });
      });
      Object.entries(cnt).forEach(([p, n]) => { if (n >= C.consistencySets) mark(p, k) });
    }
    const runs = [];
    if (l.type === "run" && l.mi > 0 && l.min > 0) runs.push({ run: { mi: l.mi, min: l.min, st: l.st }, key: k + "|run", gate: l.gate || l.race });
    (l.extraRuns || []).forEach((x, i) => { if (x && x.mi > 0 && x.min > 0) runs.push({ run: { mi: x.mi, min: x.min, st: x.best ? { best: x.best, src: "strava" } : null }, key: k + "|xr" + i }) });
    runs.forEach(r => { ["mile", "m400", "endur"].forEach(p => mark(p, k)); E.push(...rkRunEntries(k, r.run, r.key, r.gate)) });
  });
  (rkData().trials || []).forEach(t => {
    if (!t || !(t.sec > 0) || !t.d || t.d > td) return; if (t.surface === "treadmill" && !t.incline) return;
    const p = t.dist === "400" ? "m400" : t.dist === "mile" ? "mile" : "endur";
    ["mile", "m400", "endur"].forEach(x => mark(x, t.d));
    E.push({ p, lad: p, d: t.d, m: t.sec, key: "trial|" + t.id, g: !!t.gate, gateable: true, gateReps: true, run: true, whole: true, trial: true, src: `${t.dist === "400" ? "400 m" : t.dist === "mile" ? "Mile" : "5K"} time trial${t.surface ? " · " + t.surface : ""}` });
  });
  E.sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : 0);
  return { E, trained };
}

/* ---------- frozen days (Pause, injury exclusion) ---------- */
function rkPauses() {
  // each pause runs from its start until ended, but never past the yearly allowance
  const out = [], td = ymd(today), cap = RKC().pauseDaysPerYear;
  (rkData().pauses || []).filter(x => x && x.from).sort((a, b) => a.from < b.from ? -1 : 1).forEach(x => {
    const used = out.filter(o => rkDays(o.to, x.from) < 365).reduce((t, o) => t + rkDays(o.from, o.to) + 1, 0);
    const left = Math.max(0, cap - used); if (!left) return;
    let to = x.to || td; if (rkDays(x.from, to) + 1 > left) to = rkAdd(x.from, left - 1);
    out.push({ from: x.from, to, open: !x.to && to >= td });
  });
  return out;
}
function rkExcl(p) { return ((rkData().excl || {})[p] || []).filter(x => x && x.from).map(x => ({ from: x.from, to: x.to || ymd(today), open: !x.to })) }
function rkFrozenIv(p) { return [...RK_PAUSE, ...rkExcl(p)] }
let RK_PAUSE = [];
function rkFrozenBetween(iv, a, b) { // days in (a, b] covered by any interval
  let n = 0; iv.forEach(x => { const s = x.from > a ? x.from : rkAdd(a, 1), e = x.to < b ? x.to : b; if (e >= s) n += rkDays(s, e) + 1 }); return n;
}
const rkFrozenOn = (iv, d) => iv.some(x => x.from <= d && d <= x.to);

/* ---------- consistency ---------- */
function rkConsistency(R, p, d) {
  const C = RKC(), set = R.trained[p] || new Set(), iv = R.frozen[p]; let w = rkMon(d), n = 0, seen = 0, back = 0;
  const weeks = [];
  while (seen < C.consistencyWeeks && back < 20) {
    let fz = 0; for (let i = 0; i < 7; i++) if (rkFrozenOn(iv, rkAdd(w, i))) fz++;
    if (fz < 4) { const hit = set.has(w); weeks.push(hit); if (hit) n++; seen++ }
    w = rkAdd(w, -7); back++;
  }
  return { n, weeks: weeks.reverse() };
}

/* ---------- part value on a day ---------- */
function rkFade(R, p, e, d) {
  const C = RKC().fade, age = rkDays(e.d, d) - rkFrozenBetween(R.frozen[p], e.d, d);
  if (age > C.maxDays) return null;
  if (age <= C.graceDays || R.momentum(p, d)) return 1;
  return Math.pow(1 - C.perMonth, (age - C.graceDays) / 30.44);
}
function rkValue(R, p, d, mode, opts) {
  let best = 0, src = null; const list = R.byPart[p] || [];
  for (const e of list) {
    if (e.d > d) break; if (e.flag) continue; if (opts && opts.from && e.d < opts.from) continue;
    const f = opts && opts.noFade ? 1 : rkFade(R, p, e, d); if (f == null) continue;
    const L = rkLadder(e.lad, d, mode), m = L.kind === "time" ? e.m / f : e.m * f;
    let v = rkCap(rkVal(m, L), e.cap); v = rkCap(v, rkPartCap(p));
    if (v > best) { best = v; src = { e, m, fade: f } }
  }
  return { v: best, src };
}

/* ---------- typo / implausible-entry checks ---------- */
function rkFlags(R, placeWin) {
  const C = RKC(), conf = rkData().confirmed || {}, prevBest = {}, prevEx = {};
  // compare each entry with earlier days only, so ramping up within a session never trips the checks
  let day = null, pend = [];
  const flush = () => { pend.forEach(f => f()); pend = [] };
  R.E.forEach(e => {
    if (e.d !== day) { flush(); day = e.d }
    let why = null; const L = rkLadder(e.lad, e.d, "raw");
    if (L.kind === "time") { if (!e.run || e.whole) { if (e.m < (C.runRecord[e.p] || 0)) why = "faster than the world record" } }
    else if (L.kind === "load") { if (e.m / (e.bw || rkBW(e.d)) > (C.worldRecord[e.lad] || C.worldRecord[e.p] || 99)) why = "beyond world-record strength for your body weight" }
    else if (e.m > (C.worldRecord[e.lad] || C.worldRecord[e.p] || 999)) why = "beyond world-record level";
    const inPlace = placeWin && e.d >= placeWin.from && e.d <= placeWin.to;
    if (!why && !inPlace && !e.run) {
      const v = rkVal(e.m, L), pb = prevBest[e.p];
      if (pb != null && Math.floor(v) - Math.floor(pb) >= C.typo.jumpRanks) why = `jumps ${Math.floor(v) - Math.floor(pb)} ranks at once`;
      const px = prevEx[e.ex + "|" + e.p];
      if (!why && px && rkDays(px.d, e.d) <= C.typo.jumpDays && e.m > px.m * (1 + C.typo.jumpPct)) why = `more than ${Math.round(C.typo.jumpPct * 100)}% above your best from ${fmtShort(parseYmd(px.d))}`;
    }
    if (why && !conf[e.key]) { e.flag = why; return }
    pend.push(() => {
      const v = rkVal(e.m, L); if (prevBest[e.p] == null || v > prevBest[e.p]) prevBest[e.p] = v;
      if (!e.run) { const kx = e.ex + "|" + e.p; if (!prevEx[kx] || e.m >= prevEx[kx].m || rkDays(prevEx[kx].d, e.d) > C.typo.jumpDays) prevEx[kx] = { d: e.d, m: e.m } }
    });
  });
  flush();
}

/* ---------- placement ---------- */
function rkPlacementWindow() {
  const D = rkData(); if (D.placement && D.placement.at) return D.placement;
  const td = ymd(today), keys = Object.keys(S.logs).filter(k => k <= td && S.logs[k] && (S.logs[k].type === "gym" || S.logs[k].type === "run")).sort();
  if (!keys.length) return null; const first = keys[0], since = rkDays(first, td);
  if (since < RKC().placementDays) return { pending: true, first, ready: rkAdd(first, RKC().placementDays) };
  if (since < 14) return { at: rkAdd(first, RKC().placementDays), from: first, to: rkAdd(first, RKC().placementDays - 1) };
  // existing users: the most recent full Mon–Sun week with training
  let mon = rkAdd(rkMon(td), -7);
  for (let i = 0; i < 8; i++) { const sun = rkAdd(mon, 6); if (keys.some(k => k >= mon && k <= sun)) return { at: td, from: mon, to: sun }; mon = rkAdd(mon, -7) }
  return { at: td, from: first, to: rkAdd(first, 6) };
}

/* ---------- the full computation ---------- */
let RK_CACHE = { sig: "", R: null };
function rkSig() {
  const L = Object.keys(S.logs).sort().map(k => k + ":" + ((S.logs[k] && S.logs[k].savedAt) || 0)).join(",");
  const su = rkSu();
  return [ymd(today), L, JSON.stringify({ ...rkData(), seen: 0 }), typeof loaded !== "undefined" && loaded.logs && loaded.profile, (S.profile.weights || []).length, (S.profile.weights || []).map(w => w.d + w.lb).join(), su.sex, su.age, su.birth, su.weight, RKC().version, typeof CUSTOM !== "undefined" && CUSTOM ? JSON.stringify(rkSplitIds()) : ""].join("|");
}
function rkSplitIds() { try { const ph = curPhase(); return [...new Set(Object.values(ph).flatMap(d => (d.ex || []).map(e => e.id)))] } catch (e) { return [] } }
function rankState() {
  const sig = rkSig(); if (RK_CACHE.sig === sig && RK_CACHE.R) return RK_CACHE.R;
  for (const k in RK_LCACHE) delete RK_LCACHE[k];
  RK_W = (S.profile.weights || []).filter(w => w && w.lb > 0).sort((a, b) => a.d < b.d ? -1 : 1);
  RK_PAUSE = rkPauses();
  const C = RKC(), td = ymd(today), { E, trained } = rkAllEntries(), parts = RK_PARTS();
  const R = { E, trained, frozen: {}, byPart: {}, td, events: [], st: {}, warn: [], parts };
  parts.forEach(p => { R.frozen[p] = rkFrozenIv(p); R.byPart[p] = [] });
  const momo = {}; R.momentum = (p, d) => { const kk = p + d; if (!(kk in momo)) momo[kk] = rkConsistency(R, p, d).n >= C.momentumWeeks; return momo[kk] };
  const place = rkPlacementWindow(); R.place = place;
  rkFlags(R, place && !place.pending ? place : null);
  E.forEach(e => { if (R.byPart[e.p]) R.byPart[e.p].push(e) });
  parts.forEach(p => R.st[p] = { rank: 0, below: 0, lost: null, lastFail: null, warnDay: 0 });
  if (place && !place.pending) {
    if (!rkData().placement && typeof saveProfile === "function" && typeof loaded !== "undefined" && loaded.logs && loaded.profile && (S.profile.setup || typeof isLegacy !== "function" || isLegacy())) { rkData().placement = { at: place.at, from: place.from, to: place.to }; saveProfile() }
    parts.forEach(p => { const v = rkValue(R, p, place.to, "raw", { from: place.from, noFade: true }).v; R.st[p].rank = Math.min(C.placementCap, Math.floor(v)); R.st[p].placedAt = place.at });
    const attempts = E.filter(e => e.g && e.d >= place.at && !e.flag);
    for (let d = place.at; d <= td; d = rkAdd(d, 1)) {
      attempts.filter(a => a.d === d).forEach(a => {
        const s = R.st[a.p], g = rkGateStatus(R, a.p, d, true);
        if (!g.open) return;
        const L = rkLadder(a.lad, d, "raw"), v = rkCap(rkCap(rkVal(a.m, L), a.cap), rkPartCap(a.p)), to = s.rank + 1;
        const pass = a.gateable && a.gateReps && v >= to;
        R.events.push({ id: a.key + "|" + a.p + "|" + to, t: pass ? "up" : "fail", p: a.p, d, to, from: s.rank, ex: a.ex, why: !a.gateable ? "capped" : !a.gateReps ? "reps" : "" });
        if (pass) { s.rank = to; s.below = 0; s.lost = null } else s.lastFail = d;
      });
      parts.forEach(p => {
        const s = R.st[p]; if (rkFrozenOn(R.frozen[p], d)) return;
        const v = rkValue(R, p, d, "raw").v;
        if (s.lost && rkDays(s.lost.at, d) <= C.reclaimDays && v >= s.lost.rank) { R.events.push({ id: `reclaim|${p}|${d}|${s.lost.rank}`, t: "reclaim", p, d, to: s.lost.rank }); s.rank = s.lost.rank; s.lost = null; s.below = 0; return }
        if (s.lost && rkDays(s.lost.at, d) > C.reclaimDays) s.lost = null;
        if (s.rank > 0 && v < s.rank) { s.below++; if (s.below >= C.demotion.days) { R.events.push({ id: `down|${p}|${d}|${s.rank}`, t: "down", p, d, to: s.rank - 1 }); s.lost = { rank: s.rank, at: d }; s.rank--; s.below = 0 } }
        else s.below = 0;
      });
    }
  }
  // today's picture per part
  R.part = {};
  parts.forEach(p => {
    const s = R.st[p], cur = rkValue(R, p, td, "raw"), sc = rkValue(R, p, td, "scaled"), cons = rkConsistency(R, p, td), excl = rkExcl(p).some(x => x.open);
    const placed = !!(place && !place.pending);
    const rank = placed ? s.rank : Math.min(C.placementCap, Math.floor(cur.v));
    const prog = rank >= 5 ? 1 : Math.max(0, Math.min(0.999, cur.v - rank));
    R.part[p] = { p, rank, prog, num: rank + prog, v: cur.v, src: cur.src, scaled: sc, cons, excl, gate: placed ? rkGateStatus(R, p, td, false) : { open: false, why: "placement" },
      warn: s.below >= C.demotion.warnDay ? C.demotion.days - s.below : 0, lost: s.lost, has: (R.byPart[p] || []).some(e => !e.flag) };
  });
  R.groups = C.groups.map(g => {
    const ps = Object.keys(g.parts).filter(p => !R.part[p].excl); let num = 0;
    if (!ps.length) return { ...g, num: null, excluded: true };
    if (g.best) num = Math.max(...ps.map(p => R.part[p].num));
    else { const tw = ps.reduce((t, p) => t + g.parts[p], 0); num = ps.reduce((t, p) => t + g.parts[p] * R.part[p].num, 0) / tw }
    const scaled = g.best ? Math.max(...ps.map(p => R.part[p].scaled.v)) : ps.reduce((t, p) => t + g.parts[p] * R.part[p].scaled.v, 0) / ps.reduce((t, p) => t + g.parts[p], 0);
    return { ...g, num, scaled };
  });
  const gs = R.groups.filter(g => g.num != null);
  R.overall = gs.length ? Math.min(5, Math.floor(gs.reduce((t, g) => t + g.num, 0) / gs.length + (1 - C.overallRoundAt))) : 0;
  R.overallScaled = gs.length ? Math.min(5, Math.floor(gs.reduce((t, g) => t + Math.min(5, g.scaled), 0) / gs.length + (1 - C.overallRoundAt))) : 0;
  R.flagged = E.filter(e => e.flag);
  RK_CACHE = { sig, R };
  return R;
}
// Gate status for a part on day d (before = use yesterday's value, so a Gate set can't unlock its own Gate)
function rkGateStatus(R, p, d, before) {
  const C = RKC(), s = R.st[p], maxR = rkPartCap(p) != null ? rkPartCap(p) : 5;
  if (s.rank >= maxR) return { open: false, why: p === "mile" ? "milecap" : "top" };
  if (rkExcl(p).some(x => x.from <= d && d <= x.to)) return { open: false, why: "excluded" };
  const v = rkValue(R, p, before ? rkAdd(d, -1) : d, "raw").v;
  if (v < s.rank + 1) return { open: false, why: "bar", need: s.rank + 1 - v };
  const cons = rkConsistency(R, p, d).n;
  if (cons < C.gateWeeks) return { open: false, why: "consistency", cons };
  if (s.lastFail) { const wait = cons >= C.fastRetryWeeks ? C.fastRetryDays : C.retryDays, left = wait - rkDays(s.lastFail, d); if (left > 0) return { open: false, why: "cooldown", left } }
  return { open: true, to: s.rank + 1 };
}

/* ---------- Gate options and targets ---------- */
function rkTargetMetric(p, rankTo, lad) { const L = rkLadder(lad || p, ymd(today), "raw"); return L.th[rankTo - 1] }
function rkFmtSec(s) { s = Math.round(s); const m = Math.floor(s / 60), x = s % 60; return m + ":" + String(x).padStart(2, "0") }
function rkExTarget(p, id, c, rankTo) {
  const lad = c.ladder || c.p, L = rkLadder(lad, ymd(today), "raw"), T = L.th[rankTo - 1], B = rkBW(ymd(today)), rate = c.r || 1, kind = c.k || "load";
  const L0 = typeof libEx === "function" && libEx(id), pair = L0 && L0.equip === "Dumbbell" && !L0.uni;
  const r5 = n => Math.ceil(n / 5) * 5;
  if (L.kind === "reps") {
    if (kind === "bw") { const reps = Math.ceil(30 * ((T / 30 + 1) * rate - 1)); return { txt: `${Math.max(1, reps)} strict reps in one set`, need: reps } }
    const tot = B * (1 + T / 30) * rate; return { txt: `${toU(r5(tot / 1.1))} ${uL()} × 3 (or a 1–5 rep set worth ${toU(r5(tot))} ${uL()} for 1)` };
  }
  if (kind === "bw") { const tot = T * rate, add = tot / (1 + 3 / 30) - B; return { txt: add > 0 ? `bodyweight + ${toU(r5(add))} ${uL()} × 3` : `bodyweight × ${Math.max(1, Math.ceil(30 * (tot / B - 1)))}` } }
  const tot = T * rate, w3 = tot / 1.1;
  return { txt: pair ? `2× ${toU(r5(w3 / 2))} ${uL()} × 3 (est. max ${toU(r5(tot))} ${uL()} total)` : `${toU(r5(w3))} ${uL()} × 3 (est. max ${toU(r5(tot))} ${uL()})` };
}
function rkGateOptions(p, rankTo) {
  const C = RKC();
  if (C.parts[p].run) { const T = rkTargetMetric(p, rankTo); return [{ id: p, name: p === "endur" ? "5K, or a longer run or race" : p === "mile" ? "Mile" : "400 m", txt: p === "endur" ? `5K-equivalent under ${rkFmtSec(T)} (a 5K, 10K or half marathon counts)` : `under ${rkFmtSec(T)}`, run: true }] }
  const ids = rkSplitIds(), opt = [];
  ids.forEach(id => { const c = (C.conv[id] || []).find(x => x.p === p && x.cap == null); if (c) opt.push({ id, name: rkExName(id), ...rkExTarget(p, id, c, rankTo) }) });
  if (opt.length) return opt;
  return (C.parts[p].basic || []).map(id => { const c = (C.conv[id] || []).find(x => x.p === p); return c ? { id, name: rkExName(id), basic: true, ...rkExTarget(p, id, c, rankTo) } : null }).filter(Boolean);
}
// can this exercise's set be marked as a Gate set today? (used by the set-type button)
function rkGateFor(id) {
  try { const R = rankState(), C = RKC(); return (C.conv[id] || []).some(c => c.cap == null && R.part[c.p] && R.part[c.p].gate.open) } catch (e) { return false }
}
function rkRunGateOpen() { try { const R = rankState(); return ["mile", "m400", "endur"].some(p => R.part[p].gate.open) } catch (e) { return false } }
function rkAlertCount() {
  try { const R = rankState(); return R.parts.filter(p => R.part[p].gate.open || R.part[p].warn).length + R.flagged.length } catch (e) { return 0 }
}

/* ---------- screen ---------- */
let rkOpen = null, rkMode = "raw", rkTrialOpen = false;
try { const v = localStorage.getItem("rd25-rkmode"); if (v === "raw" || v === "scaled") rkMode = v } catch (e) {}
const RK_COL = ["var(--muted)", "#4E9A6B", "var(--gym)", "#8B5CF6", "#E07B1F", "#D4A017"];
const rkBadge = (n, big) => `<span class="rk-l${big ? " big" : ""}" style="--rc:${RK_COL[Math.max(0, Math.min(5, Math.floor(n)))]}">${rkLetter(n)}</span>`;
const rkBar = (prog, col) => `<div class="rk-bar"><i style="width:${Math.round(Math.max(0, Math.min(1, prog)) * 100)}%;background:${col || "var(--gym)"}"></i></div>`;
function rkSrcText(P) {
  const s = P.src; if (!s) return "";
  const e = s.e, faded = s.fade < 0.999 ? ` · faded to ${Math.round(s.fade * 100)}%` : "";
  if (e.run) return `${esc(e.src)} · ${rkFmtSec(e.m)}${e.p === "endur" ? " 5K-equivalent" : ""} (${fmtShort(parseYmd(e.d))})${faded}`;
  const set = e.kind === "hold" ? `${e.set.r} s` : e.kind === "bw" ? `${e.set.w > 0 ? `BW + ${toU(e.set.w)} ${uL()}` : "BW"} × ${e.set.r}` : e.kind === "assist" ? `assisted (−${toU(e.set.w)} ${uL()}) × ${e.set.r}` : `${toU(e.set.w)} ${uL()}${e.set.db ? "/DB" : ""} × ${e.set.r}`;
  const L = RKC().ladders[e.lad].kind, eq = L === "reps" ? `≈ ${Math.round(e.m)} ${e.lad === "pull" ? "pull-up" : e.lad === "core" ? "leg-raise" : ""} reps` : L === "hold" ? "" : `≈ ${toU(Math.round(e.m))} ${uL()} ${RKC().parts[e.p].ref.toLowerCase()}`;
  return `${esc(rkExName(e.eid && e.eid !== e.ex && RKC().conv[e.eid] ? e.eid : e.ex))} ${set}${eq ? " " + eq : ""} (${fmtShort(parseYmd(e.d))})${e.cap != null ? ` · counts up to ${rkLetter(e.cap)}` : ""}${faded}`;
}
function rkNextText(p, P) {
  if (P.rank >= 5) return "Top rank";
  const L = rkLadder(p, ymd(today), rkMode), t = L.th[P.rank], k = L.kind;
  const nx = rkLetter(P.rank + 1);
  if (k === "time") return `${nx} at ${rkFmtSec(t)}`;
  if (k === "reps") { const n = Math.ceil(t); return `${nx} at ${n} ${p === "pull" ? (n === 1 ? "pull-up" : "pull-ups") : n === 1 ? "strict rep" : "strict reps"}` }
  return `${nx} at ${toU(Math.round(t))} ${uL()} ${RKC().parts[p].ref.toLowerCase()}`;
}
function rkGateText(p, P) {
  const g = P.gate; if (!g) return "";
  if (g.open) return `<div class="rk-gate open"><b>Gate open: reach ${rkLetter(g.to)}</b><span class="small">${RKC().parts[p].run ? "Tick “Count as a Gate attempt” when you log the run, or log a time trial below." : "In a workout, tap a set's number until it shows <b>G</b>, then lift one of these for 1–5 reps:"}</span>
    ${rkGateOptions(p, g.to).map(o => `<div class="rk-opt"><span>${esc(o.name)}${o.basic ? ' <span class="muted small">(basic lift)</span>' : ""}</span><span class="num">${esc(o.txt)}</span></div>`).join("")}</div>`;
  const W = { bar: "Fill the bar to unlock the next Gate.", consistency: `Gate needs training in ${RKC().gateWeeks} of the last ${RKC().consistencyWeeks} weeks (now ${g.cons}).`, cooldown: `Gate failed. Retry in ${g.left} day${g.left > 1 ? "s" : ""}.`, excluded: "Excluded for injury. Fading and demotion are paused.", milecap: "The mile counts up to B. A and S come from the 400 m.", top: "Top rank reached.", placement: "Ranks are set after placement week." };
  return W[g.why] && g.why !== "bar" ? `<div class="small muted">${W[g.why]}</div>` : "";
}
function rkPartRow(p, R) {
  const P = R.part[p], C = RKC(), sc = rkMode === "scaled", num = sc ? Math.min(5, P.scaled.v) : P.num;
  const cons = P.cons.weeks.map(h => `<i class="${h ? "on" : ""}"></i>`).join("");
  const exBtn = C.parts[p].run ? "" : `<button type="button" class="rk-excl" data-rkexcl="${p}">${P.excl ? "Include again" : "Injured? Exclude this part"}</button>`;
  return `<div class="rk-part ${P.excl ? "excl" : ""}"><div class="row between" style="align-items:center;gap:10px">${rkBadge(num)}<div style="flex:1;min-width:0"><div class="row between"><b>${esc(C.parts[p].name)}</b><span class="small muted num">${P.rank >= 5 && !sc ? "" : Math.round((sc ? num - Math.floor(num) : P.prog) * 100) + "%"}</span></div>
    ${rkBar(sc ? num - Math.floor(num) : P.prog, RK_COL[Math.min(5, Math.floor(num) + 1)])}</div></div>
    <div class="small">${P.has ? rkSrcText(sc ? P.scaled : P) : `<span class="muted">Not trained yet${C.parts[p].run ? "" : " — counts as E"}.</span>`}</div>
    <div class="row between small"><span class="muted">${rkNextText(p, sc ? { rank: Math.floor(num) } : P)}</span><span class="rk-cons" title="Weeks trained, last ${C.consistencyWeeks}" aria-label="Trained ${P.cons.n} of the last ${C.consistencyWeeks} weeks">${cons}</span></div>
    ${P.warn ? `<div class="rk-warn">Below ${rkLetter(P.rank)} — drops a rank in ${P.warn} day${P.warn > 1 ? "s" : ""} unless you lift your numbers again.</div>` : ""}
    ${P.lost ? `<div class="small muted">Lost ${rkLetter(P.lost.rank)} on ${fmtShort(parseYmd(P.lost.at))}. Hit your old numbers by ${fmtShort(parseYmd(rkAdd(P.lost.at, C.reclaimDays)))} to get it back.</div>` : ""}
    ${sc ? "" : rkGateText(p, P)}${exBtn}</div>`;
}
function rkGroupCard(g, R) {
  const sc = rkMode === "scaled", num = g.num == null ? null : sc ? Math.min(5, g.scaled) : g.num, open = rkOpen === g.id;
  let h = `<div class="card rk-group"><button type="button" class="rk-head" data-rkgroup="${g.id}" aria-expanded="${open}">${num == null ? '<span class="rk-l" style="--rc:var(--muted)">–</span>' : rkBadge(num, true)}<span style="flex:1;min-width:0;text-align:left"><span class="row between"><b class="rk-name">${esc(g.name)}</b><span class="small muted">${open ? "Hide" : "Details"} ›</span></span>
    ${num == null ? '<span class="small muted">Excluded</span>' : rkBar(num >= 5 ? 1 : num - Math.floor(num), RK_COL[Math.min(5, Math.floor(num) + 1)])}
    <span class="small muted">${Object.keys(g.parts).map(p => { const P = R.part[p]; return `${esc(RKC().parts[p].name)} ${rkLetter(sc ? Math.min(5, P.scaled.v) : P.num)}${P.gate.open && !sc ? " ⚑" : ""}` }).join(" · ")}</span></span></button>`;
  if (open) { h += `<div class="stack" style="gap:10px">${Object.keys(g.parts).map(p => rkPartRow(p, R)).join("")}</div>`; if (g.id === "speed" || g.id === "endur") h += rkTrialBlock() }
  return h + `</div>`;
}
function rkTrialBlock() {
  const T = (rkData().trials || []).slice().sort((a, b) => a.d < b.d ? 1 : -1).slice(0, 6);
  let h = `<div class="rk-trials"><div class="row between"><b>Time trials</b>${rkTrialOpen ? "" : '<button type="button" class="btn ghost sm" data-rktrial="1">+ Log a time trial</button>'}</div>`;
  if (rkTrialOpen) h += `<div class="stack" style="gap:8px"><div class="row"><div class="field"><label for="rkTd">Distance</label><select id="rkTd"><option value="400">400 m</option><option value="mile">Mile</option><option value="5k">5K</option></select></div>
    <div class="field"><label for="rkTt">Time (m:ss)</label><input id="rkTt" inputmode="numeric" placeholder="1:45"></div></div>
    <div class="row"><div class="field"><label for="rkTdate">Date</label><input id="rkTdate" type="date" value="${ymd(today)}" max="${ymd(today)}"></div><div class="field"><label for="rkTs">Surface</label><select id="rkTs"><option value="track">Track</option><option value="road">Road</option><option value="treadmill">Treadmill</option></select></div></div>
    <label class="rk-check"><input type="checkbox" id="rkTinc"> Treadmill set to 1% incline or more</label>
    <label class="rk-check"><input type="checkbox" id="rkTg" ${rkRunGateOpen() ? "" : "disabled"}> Count as a Gate attempt${rkRunGateOpen() ? "" : " (no Gate open)"}</label>
    <p class="small muted">Before an all-out 400 m: 5–10 min easy jog, leg swings and skips, then 2–3 build-up runs. All-out sprints are when hamstrings get pulled.</p>
    <div class="row"><button type="button" class="btn sm" id="rkTsave">Save time trial</button><button type="button" class="btn ghost sm" data-rktrial="0">Cancel</button></div></div>`;
  if (T.length) h += T.map(t => `<div class="rk-opt"><span>${t.dist === "400" ? "400 m" : t.dist === "mile" ? "Mile" : "5K"} · ${fmtShort(parseYmd(t.d))}${t.surface ? " · " + t.surface : ""}${t.gate ? " · Gate" : ""}</span><span class="num">${rkFmtSec(t.sec)} <button type="button" class="link small" data-rktdel="${t.id}">Delete</button></span></div>`).join("");
  return h + `</div>`;
}
function rkAlerts(R) {
  const C = RKC(), out = [];
  R.flagged.slice(-5).forEach(e => out.push(`<div class="rk-alert"><div><b>Check this entry:</b> ${e.run ? esc(e.src) + " " + rkFmtSec(e.m) : `${esc(rkExName(e.ex))} ${e.kind === "hold" ? e.set.r + " s" : (e.set.w ? toU(e.set.w) + " " + uL() + " × " : "") + e.set.r}`} on ${fmtShort(parseYmd(e.d))} — ${esc(e.flag)}. It won't count until you confirm it. If it's a typo, fix it in that day's log.</div><button type="button" class="btn sm" data-rkconf="${esc(e.key)}">It's right</button></div>`));
  R.parts.forEach(p => { const P = R.part[p]; if (P.gate.open) out.push(`<div class="rk-alert gate"><b>Gate open:</b> ${esc(C.parts[p].name)} → ${rkLetter(P.gate.to)}<button type="button" class="link small" data-rkgo="${p}">See how</button></div>`); if (P.warn) out.push(`<div class="rk-alert warn"><b>${esc(C.parts[p].name)}</b> drops from ${rkLetter(P.rank)} in ${P.warn} day${P.warn > 1 ? "s" : ""}.</div>`) });
  R.events.filter(e => (e.t === "down" || e.t === "reclaim") && rkDays(e.d, R.td) <= 7).forEach(e => out.push(`<div class="rk-alert ${e.t === "down" ? "warn" : ""}"><b>${esc(C.parts[e.p].name)}</b> ${e.t === "down" ? "dropped" : "reclaimed"} to ${rkLetter(e.to)} on ${fmtShort(parseYmd(e.d))}.</div>`));
  Object.entries(rkData().excl || {}).forEach(([p, list]) => { const x = (list || []).find(y => y && !y.to); if (x && rkDays(x.ask || x.from, R.td) >= C.excludeAskDays) out.push(`<div class="rk-alert"><div><b>Still injured?</b> ${esc(C.parts[p].name)} has been excluded for 12 weeks.</div><div class="row"><button type="button" class="btn sm" data-rkkeep="${p}">Keep excluded</button><button type="button" class="btn ghost sm" data-rkexcl="${p}">Include again</button></div></div>`) });
  return out.join("");
}
function rkPauseCard(R) {
  const C = RKC(), P = rkPauses(), open = P.find(x => x.open), used = P.filter(x => rkDays(x.to, R.td) < 365).reduce((t, x) => t + rkDays(x.from, x.to) + 1, 0), left = Math.max(0, C.pauseDaysPerYear - used);
  return `<div class="card"><div class="row between"><h2>Pause</h2><span class="small muted num">${left} of ${C.pauseDaysPerYear} days left this year</span></div>
    <p class="small muted">Going away or ill? Pausing freezes fading and demotion. Turn it on before or during the break — it can't be added afterwards.</p>
    ${open ? `<div class="row between"><b>Paused since ${fmtShort(parseYmd(open.from))}</b><button type="button" class="btn sm" id="rkPauseEnd">End pause</button></div>` : `<button type="button" class="btn ghost sm" id="rkPause" ${left ? "" : "disabled"} style="align-self:flex-start">Pause from today</button>`}</div>`;
}
function rkUnrated() {
  const td = ymd(today), from = rkAdd(td, -RKC().fade.maxDays), seen = new Map();
  Object.entries(S.logs).forEach(([k, l]) => { if (k < from || !l || l.type !== "gym" || !l.ex) return; Object.keys(l.ex).forEach(id => { const L = typeof libEx === "function" && libEx(id); if (L && L.custom && !rkConv(id, l)) seen.set(id, L) }) });
  return [...seen.entries()];
}
function viewRanks() {
  const R = rankState(), C = RKC(), sc = rkMode === "scaled", su = rkSu();
  let h = `<div class="card rk-top"><div class="row between" style="align-items:center"><div><div class="eyebrow">Overall rank</div><h2 style="margin:0">${sc ? "For your size" : "Your ranks"}</h2></div>${rkBadge(sc ? R.overallScaled : R.overall, true)}</div>
    <div class="seg two" role="tablist" aria-label="Rank view"><button role="tab" data-rkmode="raw" class="${!sc ? "on" : ""}" aria-selected="${!sc}">Raw</button><button role="tab" data-rkmode="scaled" class="${sc ? "on" : ""}" aria-selected="${sc}">For your size</button></div>
    <p class="small muted">${sc ? "What your lifts are worth at your body weight. Gates and rank-ups always use raw ranks." : "Ranks come from your best recent lifts and runs. Each rank-up needs a Gate."}</p>`;
  if (R.place && R.place.pending) h += `<div class="rk-alert"><b>Placement week.</b> Your starting ranks are set on ${fmtShort(parseYmd(R.place.ready))}, after a week of training. Bars below are a preview.</div>`;
  else if (R.place) h += `<p class="small muted">Placed ${fmtShort(parseYmd(R.place.at))} from your training ${fmtShort(parseYmd(R.place.from))}–${fmtShort(parseYmd(R.place.to))} (placement caps at B).</p>`;
  h += `</div>`;
  const al = rkAlerts(R); if (al) h += `<div class="stack" style="gap:8px">${al}</div>`;
  R.groups.forEach(g => h += rkGroupCard(g, R));
  const un = rkUnrated();
  if (un.length) h += `<div class="card"><h2>Unrated exercises</h2><p class="small muted">Pick a similar exercise so these count. They count up to B and can't be Gates.</p>${un.map(([id, L]) => `<div class="row between" style="align-items:center"><span>${esc(L.name)}</span><select data-rkmap="${esc(id)}"><option value="">Counts like…</option>${Object.keys(C.conv).map(x => `<option value="${x}">${esc(rkExName(x))}</option>`).join("")}</select></div>`).join("")}</div>`;
  h += rkPauseCard(R);
  h += `<div class="card"><h2>Your details</h2><p class="small muted">${su.sex === "female" ? "Female" : "Male"} · age ${rkAgeAt(R.td)}${su.birth ? "" : " (set your birth month so this stays current)"}. Ranks adjust after 40.</p>
    <div class="field" style="max-width:220px"><label for="rkBirth">Birth month</label><input id="rkBirth" type="month" value="${esc(su.birth || "")}" max="${ymd(today).slice(0, 7)}"></div></div>`;
  return h;
}
function bindRanks() {
  const D = rkData(), redo = () => { lastRenderKey = ""; render() };
  document.querySelectorAll("[data-rkmode]").forEach(b => b.onclick = () => { rkMode = b.dataset.rkmode; try { localStorage.setItem("rd25-rkmode", rkMode) } catch (e) {} redo() });
  document.querySelectorAll("[data-rkgroup]").forEach(b => b.onclick = () => { rkOpen = rkOpen === b.dataset.rkgroup ? null : b.dataset.rkgroup; rkTrialOpen = false; redo() });
  document.querySelectorAll("[data-rkgo]").forEach(b => b.onclick = () => { const p = b.dataset.rkgo; rkOpen = (RKC().groups.find(g => p in g.parts) || {}).id; redo(); setTimeout(() => { const el = document.querySelector(`[data-rkgroup="${rkOpen}"]`); if (el) el.scrollIntoView({ block: "start", behavior: "smooth" }) }, 50) });
  document.querySelectorAll("[data-rkconf]").forEach(b => b.onclick = () => { D.confirmed = { ...(D.confirmed || {}), [b.dataset.rkconf]: 1 }; saveProfile(); toast("Confirmed. It counts now."); redo() });
  document.querySelectorAll("[data-rkexcl]").forEach(b => b.onclick = () => { const p = b.dataset.rkexcl, ex = { ...(D.excl || {}) }, list = [...(ex[p] || [])], open = list.find(x => x && !x.to);
    if (open) open.to = ymd(today); else list.push({ from: ymd(today) }); ex[p] = list; D.excl = ex; saveProfile(); toast(open ? "Included again" : "Excluded. Fading and demotion are paused for this part."); redo() });
  document.querySelectorAll("[data-rkkeep]").forEach(b => b.onclick = () => { const list = (D.excl || {})[b.dataset.rkkeep] || [], open = list.find(x => x && !x.to); if (open) open.ask = ymd(today); saveProfile(); redo() });
  document.querySelectorAll("[data-rkmap]").forEach(s => s.onchange = () => { D.maps = { ...(D.maps || {}), [s.dataset.rkmap]: s.value || undefined }; if (!s.value) delete D.maps[s.dataset.rkmap]; saveProfile(); redo() });
  document.querySelectorAll("[data-rktrial]").forEach(b => b.onclick = () => { rkTrialOpen = b.dataset.rktrial === "1"; redo() });
  document.querySelectorAll("[data-rktdel]").forEach(b => b.onclick = function () { if (!this.dataset.armed) { this.dataset.armed = "1"; this.textContent = "Tap again"; return } D.trials = (D.trials || []).filter(t => t.id !== b.dataset.rktdel); saveProfile(); redo() });
  $("#rkTsave")?.addEventListener("click", () => {
    const dist = $("#rkTd").value, m = parseTime($("#rkTt").value), d = $("#rkTdate").value || ymd(today), surface = $("#rkTs").value, incline = $("#rkTinc").checked, gate = $("#rkTg").checked;
    if (!(m > 0)) { toast("Enter the time, like 1:45 or 7:30"); return }
    if (d > ymd(today)) { toast("That date is in the future"); return }
    if (surface === "treadmill" && !incline) { toast("Treadmill time trials count at 1% incline or more"); return }
    D.trials = [...(D.trials || []), { id: "t" + Date.now().toString(36), d, dist, sec: Math.round(m * 60), surface, incline: surface === "treadmill" ? incline : undefined, gate: gate || undefined }];
    rkTrialOpen = false; saveProfile(); toast("Time trial saved"); redo();
  });
  $("#rkPause")?.addEventListener("click", () => { D.pauses = [...(D.pauses || []), { from: ymd(today) }]; saveProfile(); toast("Paused. Fading and demotion are frozen."); redo() });
  $("#rkPauseEnd")?.addEventListener("click", () => { const P = (D.pauses || []).find(x => x && !x.to); if (P) P.to = ymd(today); saveProfile(); toast("Pause ended"); redo() });
  $("#rkBirth")?.addEventListener("change", e => { const v = e.target.value; if (!/^\d{4}-\d{2}$/.test(v)) return; const [y] = v.split("-").map(Number), a = new Date().getFullYear() - y; if (a < 18 || a > 100) { toast("Enter a birth month for an adult (18+)"); return }
    if (!S.profile.setup) { toast("Finish setup first"); return } S.profile.setup.birth = v; S.profile.setup.age = rkAgeAt(ymd(today)); saveProfile(); toast("Saved"); redo() });
}

/* ---------- rank-up moment and other notices ---------- */
function rankNotify() {
  try {
    if (!(S.profile && (S.profile.setup || Object.keys(S.logs).length))) return;
    const R = rankState(), D = rkData(), seen = new Set(D.seen || []), fresh = R.events.filter(e => !seen.has(e.id));
    if (!fresh.length) return;
    // first run on this device/account: mark history seen without celebrating it all
    const recent = fresh.filter(e => rkDays(e.d, R.td) <= 2);
    D.seen = [...seen, ...fresh.map(e => e.id)].slice(-400); saveProfile();
    const up = recent.filter(e => e.t === "up" || e.t === "reclaim"), fail = recent.filter(e => e.t === "fail");
    if (up.length) rkCelebrate(up[up.length - 1], up.length);
    else if (fail.length) { const f = fail[fail.length - 1]; toast(f.why === "reps" ? "Gate set didn't count: weighted Gate sets must be 1–5 reps" : f.why === "capped" ? "That exercise can't be a Gate" : `Gate not passed. Retry ${RKC().parts[f.p].name} in ${rkConsistency(R, f.p, R.td).n >= RKC().fastRetryWeeks ? RKC().fastRetryDays : RKC().retryDays} days`) }
  } catch (e) { try { console.warn("ranks", e) } catch (_) {} }
}
function rkCelebrate(ev, n) {
  const C = RKC(), el = document.createElement("div"); el.className = "rk-up"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Rank up");
  el.innerHTML = `<div class="rk-up-in"><div class="eyebrow">${ev.t === "reclaim" ? "Rank reclaimed" : "Gate cleared"}</div>${rkBadge(ev.to, true)}<h2>${esc(C.parts[ev.p].name)} → ${rkLetter(ev.to)}</h2>${n > 1 ? `<p class="small">+${n - 1} more</p>` : ""}<button type="button" class="btn">Continue</button></div>`;
  document.body.appendChild(el); const close = () => el.remove(); el.onclick = close; setTimeout(() => el.classList.add("on"), 20);
}

/* ---------- styles ---------- */
(function () {
  const css = `.rk-l{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:9px;font:800 20px/1 var(--display);color:#fff;background:var(--rc);flex:none;letter-spacing:.02em}
.rk-l.big{width:54px;height:54px;font-size:34px;border-radius:12px;box-shadow:0 0 0 3px color-mix(in srgb,var(--rc) 25%,transparent)}
.rk-bar{height:8px;border-radius:5px;background:var(--surface-2);border:1px solid var(--line);overflow:hidden;margin:6px 0 4px}.rk-bar i{display:block;height:100%;border-radius:5px;transition:width .4s}
.rk-head{all:unset;display:flex;gap:12px;align-items:center;cursor:pointer;width:100%;box-sizing:border-box}.rk-head:focus-visible{outline:2px solid var(--gym);outline-offset:4px;border-radius:8px}
.rk-name{font:700 22px/1.1 var(--display);letter-spacing:.01em}
.rk-part{border:1px solid var(--line);border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:6px;background:var(--surface-2)}.rk-part.excl{opacity:.6}
.rk-cons{display:inline-flex;gap:3px;flex:none}.rk-cons i{width:8px;height:8px;border-radius:2px;background:var(--line)}.rk-cons i.on{background:var(--food)}
.rk-gate{border-radius:8px;padding:8px 10px;display:flex;flex-direction:column;gap:6px}.rk-gate.open{background:var(--coach-soft);border:1px solid var(--coach)}
.rk-opt{display:flex;justify-content:space-between;gap:10px;font-size:14px;flex-wrap:wrap}.rk-opt .num{text-align:right}
.rk-alert{border:1px solid var(--line);background:var(--surface);border-radius:10px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;font-size:14px}
.rk-alert.gate{border-color:var(--coach);background:var(--coach-soft)}.rk-alert.warn,.rk-warn{border-color:var(--bad);background:var(--run-soft)}.rk-warn{border:1px solid var(--bad);border-radius:8px;padding:6px 8px;font-size:13px}
.rk-excl{all:unset;cursor:pointer;font-size:12px;color:var(--muted);text-decoration:underline;align-self:flex-start}.rk-trials{border-top:1px solid var(--line);padding-top:10px;display:flex;flex-direction:column;gap:8px}.rk-check{display:flex;gap:8px;align-items:center;font-size:14px}
.rk-up{position:fixed;inset:0;z-index:50;background:rgba(5,8,12,.82);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .3s}.rk-up.on{opacity:1}
.rk-up-in{display:flex;flex-direction:column;align-items:center;gap:12px;color:#fff;text-align:center;padding:24px;transform:scale(.8);transition:transform .45s cubic-bezier(.2,1.4,.4,1)}.rk-up.on .rk-up-in{transform:scale(1)}
.rk-up .rk-l.big{width:110px;height:110px;font-size:72px;border-radius:22px;box-shadow:0 0 40px var(--rc)}.rk-up h2{color:#fff;margin:0}
.setno.g{background:var(--coach);color:#fff;border-color:var(--coach)}`;
  const s = document.createElement("style"); s.id = "rankStyles"; s.textContent = css; (document.head || document.documentElement).appendChild(s);
})();
