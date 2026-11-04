/* Run routines: easy runs, intervals, hill sprints, tempo, long runs… built from blocks, placed on the weekly schedule
 * like gym routines, with Auto (grows week to week) or Fixed progression, an optional race, and a mi/km toggle.
 * Loaded before the main app script; everything here runs lazily, at call time.
 *
 * su.runs:    [{id,name,type,warm,warmHow,cool,main,effort,strides,prog:{on,cap},w0,follow}]
 *   main:     {kind:"steady",by:"time"|"dist",v,rw:{run,walk}|null}   v = minutes or miles
 *          or {kind:"rep",n,work:{by:"time"|"dist",v},rest:{by:"time"|"back",v,how}}  work v = seconds or metres
 *   follow:   "tue"|"thu"|"sat" → the run follows the built-in program for that slot (your original plan)
 * su.runWeek: per weekday, the run routine id for days scheduled as "run"
 * su.race:    {date,dist (mi),label,target (min)} optional
 * S.profile.distU: "mi" | "km"
 */
const KM = 1.609344;
const RU = () => (typeof S !== "undefined" && S.profile && S.profile.distU) === "km" ? "km" : "mi";
const trimN = (x, dp = 1) => { const f = 10 ** dp, v = Math.round((Number(x) || 0) * f) / f; return String(v) };
const dU = (mi, dp = 1) => trimN(RU() === "km" ? mi * KM : mi, dp);          // a distance stored in miles, in the user's unit
const dTxt = (mi, dp = 1) => `${dU(mi, dp)} ${RU()}`;
const pU = minPerMi => RU() === "km" ? minPerMi / KM : minPerMi;             // pace, minutes per user unit
const paceTxt = minPerMi => `${fmtMin(pU(minPerMi))}/${RU()}`;
const fromDU = v => RU() === "km" ? Number(v) / KM : Number(v);               // typed in the user's unit → miles
// text written in miles ("4.5 mi") shown in km when that's the unit
const descU = t => RU() === "km" ? String(t || "").replace(/([\d.]+) mi\b/g, (_, n) => `${trimN(Number(n) * KM)} km`) : String(t || "");

const RUN_TYPES = {
  easy:      { n: "Easy run", role: "tue", hint: "Easy and conversational: you could talk in full sentences. Pace doesn't matter.",
               make: () => ({ warm: 0, cool: 0, main: { kind: "steady", by: "time", v: 30, rw: null }, effort: "easy", strides: 0, prog: { on: true, cap: 50 } }) },
  recovery:  { n: "Recovery run", role: "tue", hint: "Slower than easy. Short and gentle, to loosen up the day after a hard session.",
               make: () => ({ warm: 0, cool: 0, main: { kind: "steady", by: "time", v: 20, rw: null }, effort: "easy", strides: 0, prog: { on: false, cap: 30 } }) },
  long:      { n: "Long run", role: "sat", hint: "Finish the distance. Slow and steady; time on feet is the point.",
               make: () => ({ warm: 0, cool: 0, main: { kind: "steady", by: "dist", v: 4, rw: null }, effort: "easy", strides: 0, prog: { on: true, cap: 10 } }) },
  tempo:     { n: "Tempo run", role: "thu", hint: "Comfortably hard: you can say a few words, not sentences. Hold it steady; don't race it.",
               make: () => ({ warm: 10, warmHow: "jog", cool: 10, main: { kind: "steady", by: "time", v: 20, rw: null }, effort: "tempo", strides: 0, prog: { on: true, cap: 40 } }) },
  intervals: { n: "Intervals", role: "thu", hint: "Hard but even: your last rep should be as fast as your first. Keep the recoveries easy.",
               make: () => ({ warm: 10, warmHow: "jog", cool: 10, main: { kind: "rep", n: 5, work: { by: "time", v: 180 }, rest: { by: "time", v: 120, how: "jog" } }, effort: "hard", strides: 0, prog: { on: true, cap: 8 } }) },
  hills:     { n: "Hill sprints", role: "thu", hint: "Find a moderate hill. Drive the knees and pump the arms up, then walk all the way down so every sprint is fast.",
               make: () => ({ warm: 10, warmHow: "jog", cool: 10, main: { kind: "rep", n: 6, work: { by: "time", v: 20 }, rest: { by: "back", v: 0, how: "walk" } }, effort: "allout", strides: 0, prog: { on: true, cap: 12 } }) },
  fartlek:   { n: "Fartlek", role: "thu", hint: "Speed play: surge on the fast parts, float on the easy parts. No need to be precise.",
               make: () => ({ warm: 10, warmHow: "jog", cool: 10, main: { kind: "rep", n: 8, work: { by: "time", v: 60 }, rest: { by: "time", v: 90, how: "jog" } }, effort: "hard", strides: 0, prog: { on: true, cap: 12 } }) },
  tt:        { n: "Time trial", role: "thu", hint: "An honest all-out effort over the distance. Log it as your Speed gate when one is open.",
               make: () => ({ warm: 10, warmHow: "jog", cool: 10, main: { kind: "steady", by: "dist", v: 1, rw: null }, effort: "allout", strides: 0, prog: { on: false, cap: 1 } }) }
};
const RUN_ORDER = ["easy", "long", "intervals", "hills", "tempo", "fartlek", "recovery", "tt"];
const EFFORTS = [["easy", "Easy"], ["hr", "Heart-rate zone"], ["tempo", "Tempo (comfortably hard)"], ["race", "Goal race pace"], ["hard", "Hard"], ["allout", "All-out"]];
const RUN_RACES = [["5K", 3.107], ["10K", 6.214], ["Half marathon", 13.109], ["Marathon", 26.219]];
const FOLLOW_NAME = { tue: "Easy run", thu: "Intervals", sat: "Long run" };

function suRuns() { const su = CUSTOM && CUSTOM.su; return (su && su.runs) || [] }
function runById(id) { return suRuns().find(r => r.id === id) || null }
function runRole(r) { return r.follow || (RUN_TYPES[r.type] || RUN_TYPES.easy).role }
function activeRace(d) { const su = CUSTOM && CUSTOM.su, R = su && su.race; if (!R || !R.date || !(R.dist > 0)) return null; return ymd(d || today) <= R.date ? R : null }
function racePace(R) { return R && R.target > 0 && R.dist > 0 ? R.target / R.dist : null }
function raceLongPeak(R) { const d = R.dist; return d < 4 ? 5 : d < 8 ? 8 : d < 15 ? 11 : d < 27 ? 20 : Math.min(22, d * 0.8) }

/* ----- one run routine → a week's prescription ----- */
const fmtSec = s => s < 60 ? `${s} s` : s % 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : `${s / 60} min`;
const fmtWorkDist = m => RU() === "km" || m < 1600 ? (m >= 1000 && m % 100 === 0 ? `${trimN(m / 1000, 1)} km` : `${m} m`) : `${trimN(m / 1609.344, 2)} mi`;
function effortTxt(e, d) {
  if (e === "hr") return `heart rate ${HR_LO}–${HR_HI} bpm`;
  if (e === "race") { const p = racePace(activeRace(d)); return p ? `at race pace (${paceTxt(p)})` : "at goal race pace" }
  return { easy: "easy, conversational pace", tempo: "comfortably hard", hard: "hard", allout: "all-out" }[e] || "easy";
}
function runDesc(r, x, d) {
  const parts = [];
  if (r.warm > 0) parts.push(`${r.warm}-min ${r.warmHow === "walk" ? "walk" : "easy jog"}`);
  const m = x.main;
  if (m.kind === "rep") {
    const work = m.work.by === "dist" ? fmtWorkDist(m.work.v) : fmtSec(m.work.v);
    const rest = m.rest.by === "back" ? `${m.rest.how === "jog" ? "jog" : "walk"} back down` : `${fmtSec(m.rest.v)} ${m.rest.how === "walk" ? "walk" : "easy jog"}`;
    parts.push(`${m.n} × (${work} ${r.type === "hills" ? "uphill, " : ""}${effortTxt(r.effort, d)} / ${rest})`);
  } else {
    const amt = m.by === "dist" ? dTxt(m.v) : `${m.v} min`;
    parts.push(`${amt} ${effortTxt(r.effort, d)}${m.rw && m.rw.run > 0 ? ` · run ${m.rw.run} / walk ${m.rw.walk}` : ""}`);
  }
  if (r.strides > 0) parts.push(`then ${r.strides} strides`);
  if (r.cool > 0) parts.push(`${r.cool}-min ${r.warmHow === "walk" ? "walk" : "easy jog"} to finish`);
  return parts.join(", ");
}
// how much this routine has grown by week w
function runProgress(r, w, d) {
  const main = JSON.parse(JSON.stringify(r.main)), k = Math.max(0, w - (r.w0 || 1)), on = r.prog && r.prog.on, cap = Number(r.prog && r.prog.cap) || 0;
  const R = activeRace(d), rw = R ? weekOf(parseYmd(R.date)) : 0, role = runRole(r);
  let tag = "", f = 1;
  if (on) {
    if (main.kind === "rep") main.n = Math.min(Math.max(cap, main.n), main.n + Math.floor(k / 2));
    else if (main.by === "dist") {
      const step = RU() === "km" ? 1 / KM : 0.5;
      if (R && role === "sat") { const peak = raceLongPeak(R), pw = Math.max((r.w0 || 1) + 1, rw - 3);
        main.v = main.v >= peak ? main.v : main.v + (peak - main.v) * Math.min(1, k / Math.max(1, pw - (r.w0 || 1))) }
      else main.v = Math.min(Math.max(cap, main.v), main.v + step * k);
    } else main.v = Math.min(Math.max(cap, main.v), main.v + 5 * Math.floor(k / 2));
    if (k > 0 && w % 4 === 0 && !(R && w >= rw - 3)) { f = 0.8; tag = "Recovery week" }
  }
  if (R && w === rw) { f = role === "sat" ? 0.5 : 0.7; tag = "Race week" } else if (R && w === rw - 1) { f = role === "sat" ? 0.7 : 0.85; tag = "Taper" }
  if (f !== 1) { if (main.kind === "rep") main.n = Math.max(2, Math.round(main.n * f)); else main.v *= f }
  if (main.kind !== "rep") main.v = main.by === "dist" ? (RU() === "km" ? Math.round(main.v * KM * 2) / 2 / KM : Math.round(main.v * 2) / 2) : Math.max(5, Math.round(main.v / 5) * 5);
  return { main, tag };
}
function runPlanFor(r, d, w) {
  w = w || weekOf(d);
  const role = runRole(r);
  if (r.follow) {
    const b = runWeek(w)[r.follow]; if (!b) return null;
    let desc = b.d; const R = activeRace(d), rw = R ? weekOf(parseYmd(R.date)) : 0;
    let tag = b.tag || "";
    if (R && (w === rw || w === rw - 1)) { const f = w === rw ? (role === "sat" ? 0.5 : 0.7) : (role === "sat" ? 0.7 : 0.85); tag = w === rw ? "Race week" : "Taper";
      desc = desc.replace(/([\d.]+) (mi|min)\b/, (_, n, u) => `${u === "mi" ? Math.round(n * f * 2) / 2 : Math.max(5, Math.round(n * f / 5) * 5)} ${u}`).replace(/(\d+) × \(/, (_, n) => `${Math.max(2, Math.round(n * f))} × (`) }
    const n = (desc.match(/(\d+) × \(/) || [])[1];
    return { type: "run", key: r.follow, rid: r.id, t: r.name || b.t, d: descU(desc), tag, ...(n ? { reps: +n } : {}) };
  }
  const x = runProgress(r, w, d), T = RUN_TYPES[r.type] || RUN_TYPES.easy;
  const out = { type: "run", key: role, rid: r.id, t: r.name || T.n, d: runDesc(r, x, d), hint: T.hint, tag: x.tag };
  if (x.main.kind === "rep") out.reps = x.main.n;
  if (r.effort === "hr") out.hint = `Keep your heart rate between ${HR_LO} and ${HR_HI}: slow down or walk when it climbs past ${HR_HI}.`;
  if (r.effort === "race") { const p = racePace(activeRace(d)); if (p) out.hint += ` Goal race pace: ${paceTxt(p)}.` }
  if (r.strides > 0) out.hint += " Strides: 15–20 s smooth and fast (about 85%), walking 60–90 s between each.";
  if (r.type === "tt") out.tt = true;
  return out;
}
// race day replaces whatever was planned
function racePlan(d) {
  const R = activeRace(d); if (!R || R.date !== ymd(d)) return null;
  const p = racePace(R);
  return { type: "run", key: "sat", w: weekOf(d), i: dowOf(d), race: true, t: `Race day · ${R.label || dTxt(R.dist)}`,
    d: `${dTxt(R.dist, 2)}${R.target ? ` · goal ${fmtMin(R.target)}${p ? ` (${paceTxt(p)})` : ""}` : ""}`,
    hint: "Start slower than feels right for the first mile, settle into goal pace, and save anything left for the last stretch.", tag: "Race week" };
}
// the scheduled run for a weekday (null = fall back to the built-in program)
function scheduledRun(i, d, w) { const id = typeof RUNSCHED !== "undefined" && RUNSCHED[i]; const r = id && runById(id); return r ? runPlanFor(r, d, w) : null }
function runTagFor(w) {
  const rs = suRuns().filter(r => (CUSTOM.su.runWeek || []).includes(r.id)); const mon = monOf(w);
  const R = activeRace(mon) || activeRace(addDays(mon, 6)), rw = R ? weekOf(parseYmd(R.date)) : 0;
  if (R && w === rw) return "Race week"; if (R && w === rw - 1) return "Taper";
  if (!rs.length || rs.some(r => r.follow)) return runWeek(w).tag || "";
  return rs.some(r => r.prog && r.prog.on && w > (r.w0 || 1)) && w % 4 === 0 ? "Recovery week" : "";
}
// a one-day change of run: S.profile.runSwap[ymd] = routine id or "type:<preset>"
function swappedRun(p, k) {
  const sw = (S.profile.runSwap || {})[k]; if (!sw || !p || p.type !== "run" || p.logged) return p;
  const d = parseYmd(k); let r = runById(sw);
  if (!r && /^type:/.test(sw)) { const t = sw.slice(5), T = RUN_TYPES[t]; if (T) r = { id: sw, name: T.n, type: t, ...T.make(), w0: weekOf(d), prog: { on: false } } }
  if (!r) return p; const x = runPlanFor(r, d); return x ? { ...p, ...x, swapped: true, from: p.t } : p;
}

/* ----- migration: the old Tue/Thu/Sat program becomes three editable routines ----- */
function maybeRunRoutines() {
  const su = S.profile && S.profile.setup; if (!su || !su.week) return false;
  let ch = false; su.runs = su.runs || (ch = true, []); su.runWeek = su.runWeek || (ch = true, Array(7).fill(null));
  const days = su.week.map((w, i) => w === "run" ? i : -1).filter(i => i >= 0);
  const kinds = days.length === 1 ? ["sat"] : days.length === 2 ? ["tue", "sat"] : ["tue", "thu", "sat"];
  days.forEach((d, j) => { if (su.runWeek[d] && su.runs.some(r => r.id === su.runWeek[d])) return;
    const key = kinds[Math.min(j, 2)]; let r = su.runs.find(x => x.follow === key);
    if (!r) { const b = runWeek(Math.max(1, typeof weekOf === "function" && START ? weekOf(today) : 1))[key];
      r = { id: "run_" + key, name: (b && b.t || FOLLOW_NAME[key]).replace(/ · heart rate$/, ""), type: key === "sat" ? "long" : key === "thu" ? "intervals" : "easy", follow: key, prog: { on: true } };
      su.runs.push(r) }
    su.runWeek[d] = r.id; ch = true });
  return ch;
}

/* ----- a program run → an editable one, seeded from this week's prescription ----- */
function unfollow(r) {
  const w = weekOf(today), b = (runWeek(w).tag ? runWeek(w + 1) : runWeek(w))[r.follow] || { d: "" }, t = b.d, T = RUN_TYPES[r.type] || RUN_TYPES.easy, x = T.make();
  const num = re => { const m = t.match(re); return m ? Number(m[1]) : null };
  if (r.type === "long") { const mi = num(/([\d.]+) mi/); if (mi) x.main.v = mi; x.prog.cap = Math.max(x.prog.cap, Math.ceil((x.main.v || 4) + 4)) }
  else if (r.type === "intervals") { const m = t.match(/(\d+) × \((?:run )?(\d+) min (?:hard )?\/ (?:walk )?(\d+)/);
    if (m) { x.main.n = +m[1]; x.main.work = { by: "time", v: +m[2] * 60 }; x.main.rest = { by: "time", v: +m[3] * 60, how: /walk \d/.test(t) ? "walk" : "jog" } }
    const wu = num(/^(\d+)-min/); if (wu) { x.warm = wu; x.cool = wu; x.warmHow = /^\d+-min walk/.test(t) ? "walk" : "jog" } }
  else { const mn = num(/(\d+) min/); if (mn) x.main.v = mn; if (/bpm/.test(t)) x.effort = "hr"; const s = num(/(\d+) strides/); if (s) x.strides = s }
  const rw = t.match(/run (\d+) \/ walk (\d+)/); if (rw && x.main.kind === "steady") x.main.rw = { run: +rw[1], walk: +rw[2] };
  return { id: r.id, name: r.name, type: r.type, ...x, w0: weekOf(today) };
}

/* ======================= Plan → Training: runs ======================= */
let RUN_OPEN = new Set();
function schedOptsRuns(v, wr) {
  const rs = suRuns(); const cur = v === "run" ? "run:" + (wr || "") : "";
  return `<optgroup label="Runs">${rs.map(r => `<option value="run:${esc(r.id)}" ${cur === "run:" + r.id ? "selected" : ""}>${esc(r.name)}</option>`).join("")}
    ${v === "run" && !rs.some(r => r.id === wr) ? `<option value="run:" selected>Run</option>` : ""}<option value="runnew">New run…</option></optgroup>`;
}
function runsEditor() {
  const su = CUSTOM.su, rs = suRuns(), R = su.race, u = RU();
  const where = id => (su.runWeek || []).map((x, i) => x === id && su.week[i] === "run" ? DOW[i] : null).filter(Boolean);
  let h = `<div class="card"><div class="row between" style="gap:8px"><h2>Runs</h2><div class="seg sm" role="group" aria-label="Distance unit">${["mi", "km"].map(x => `<button type="button" class="${u === x ? "on" : ""}" data-run-unit="${x}">${x}</button>`).join("")}</div></div>
    <p class="small muted">Build your own runs, then put them on days in the schedule above. Auto runs grow a little each week, with a lighter week every 4th week.</p></div>`;
  rs.forEach(r => {
    const T = RUN_TYPES[r.type] || RUN_TYPES.easy, on = where(r.id), p = runPlanFor(r, today) || { d: "" };
    if (!RUN_OPEN.has(r.id)) { h += `<div class="card routine runr"><div class="row between" style="gap:8px"><div style="min-width:0"><div class="eyebrow" style="color:var(--run)">${esc(T.n)}${on.length ? " · " + on.join(", ") : " · not scheduled"}</div><h2>${esc(r.name)}</h2></div><button type="button" class="btn ghost sm" data-run-open="${r.id}">Edit</button></div>
      <div class="small"><span class="muted">This week:</span> ${esc(p.d)}</div><div class="small muted">${r.follow ? "Auto · follows your program" : r.prog && r.prog.on ? `Auto · ${progTxt(r)}` : "Fixed"}</div></div>`; return }
    h += `<div class="card routine runr"><div class="row between" style="gap:8px"><input class="rname" data-run-name="${r.id}" value="${esc(r.name)}" aria-label="Run name"><button type="button" class="btn sm" data-run-open="${r.id}">Done</button></div>`;
    if (r.follow) h += `<p class="small"><b>This week:</b> ${esc(p.d)}</p><p class="small muted">This run follows your program, which sets it week by week. Customize it to change the type, distance, reps or effort yourself.</p>
      <div class="row" style="gap:8px"><button type="button" class="btn sm" data-run-custom="${r.id}">Customize</button></div>`;
    else h += runFields(r);
    h += `<div class="row" style="gap:8px;flex-wrap:wrap"><button type="button" class="btn ghost sm" data-run-dup="${r.id}">Duplicate</button><button type="button" class="btn ghost sm" data-run-del="${r.id}">${RUN_DEL === r.id ? "Tap again to delete" : "Delete run"}</button></div></div>`;
  });
  h += `<div class="card"><button type="button" class="btn ghost" data-run-new="1">+ New run</button></div>`;
  const rp = R && R.dist > 0 && R.target > 0 ? paceTxt(R.target / R.dist) : "";
  h += `<div class="card"><h2>Race <span class="muted small" style="font-family:var(--body);font-weight:500">optional</span></h2>
    ${R && R.date ? `<p class="small"><b>${esc(R.label || dTxt(R.dist))}</b> on ${fmtDate(parseYmd(R.date))}${R.target ? ` · goal ${fmtMin(R.target)} (${rp})` : ""}</p>
      <p class="small muted">${R.date < ymd(today) ? "This race is done. Set a new one or remove it." : "Auto long runs build toward it, peak 3 weeks out, then taper. Race day shows on your plan."}</p>
      <div class="row" style="gap:8px"><button type="button" class="btn ghost sm" data-run-race="1">Edit race</button><button type="button" class="btn ghost sm" data-run-racedel="1">Remove race</button></div>`
      : `<p class="small muted">Training for a race? Add its date, distance and goal time, and your long runs will build toward it and taper before race day.</p><button type="button" class="btn ghost sm" data-run-race="1" style="align-self:flex-start">Add a race</button>`}</div>`;
  return h;
}
let RUN_DEL = "";
function progTxt(r) {
  const m = r.main, cap = r.prog.cap;
  if (m.kind === "rep") return `+1 rep every 2 weeks, up to ${cap}`;
  if (m.by === "dist") return activeRace() && runRole(r) === "sat" ? "builds toward your race" : `+${RU() === "km" ? "1 km" : "0.5 mi"} a week, up to ${dTxt(cap)}`;
  return `+5 min every 2 weeks, up to ${cap} min`;
}
const stepper = (lbl, attr, v, unit) => `<label>${lbl}<span class="step"><button type="button" data-run-step="${attr}|-1">−</button><b class="num">${v}${unit || ""}</b><button type="button" data-run-step="${attr}|1">+</button></span></label>`;
function runFields(r) {
  const m = r.main, id = r.id, u = RU();
  const sel = (attr, v, opts) => `<select data-run-sel="${id}|${attr}">${opts.map(([k, n]) => `<option value="${k}" ${String(v) === String(k) ? "selected" : ""}>${esc(n)}</option>`).join("")}</select>`;
  let h = `<div class="runf"><label>Type${sel("type", r.type, RUN_ORDER.map(t => [t, RUN_TYPES[t].n]))}</label><label>Effort${sel("effort", r.effort, EFFORTS)}</label></div>`;
  h += `<div class="runf">${stepper("Warm-up", `${id}|warm`, r.warm, " min")}${r.warm > 0 || r.cool > 0 ? `<label>As${sel("warmHow", r.warmHow || "jog", [["jog", "Easy jog"], ["walk", "Walk"]])}</label>` : ""}</div>`;
  if (m.kind === "rep") {
    h += `<div class="runf">${stepper("Reps", `${id}|n`, m.n)}<label>Each rep${sel("workBy", m.work.by, [["time", "By time"], ["dist", "By distance"]])}</label>
      <label>${m.work.by === "dist" ? "Metres" : "Seconds"}<input inputmode="numeric" data-run-in="${id}|work" value="${m.work.v}"></label></div>
      <div class="runf"><label>Recovery${sel("restBy", m.rest.by, [["time", "By time"], ...(r.type === "hills" ? [["back", "Back down the hill"]] : [])])}</label>
      ${m.rest.by === "time" ? `<label>Seconds<input inputmode="numeric" data-run-in="${id}|rest" value="${m.rest.v}"></label>` : ""}<label>As${sel("restHow", m.rest.how || "jog", [["jog", "Easy jog"], ["walk", "Walk"]])}</label></div>`;
  } else {
    h += `<div class="runf"><label>Main part${sel("by", m.by, [["time", "By time"], ["dist", "By distance"]])}</label>
      <label>${m.by === "dist" ? u === "km" ? "Kilometres" : "Miles" : "Minutes"}<input inputmode="decimal" data-run-in="${id}|v" value="${m.by === "dist" ? dU(m.v) : m.v}"></label></div>
      <div class="runf"><label class="rk-check"><input type="checkbox" data-run-rw="${id}" ${m.rw && m.rw.run > 0 ? "checked" : ""}> Run/walk</label>
      ${m.rw && m.rw.run > 0 ? `${stepper("Run", `${id}|rwrun`, m.rw.run, " min")}${stepper("Walk", `${id}|rwwalk`, m.rw.walk, " min")}` : ""}</div>
      <div class="runf">${stepper("Strides after", `${id}|strides`, r.strides || 0)}</div>`;
  }
  h += `<div class="runf">${stepper("Cool-down", `${id}|cool`, r.cool, " min")}</div>`;
  const capLbl = m.kind === "rep" ? "Up to (reps)" : m.by === "dist" ? `Up to (${u})` : "Up to (min)";
  h += `<div class="runf"><div class="seg sm" role="group" aria-label="Progression">${[["1", "Auto"], ["0", "Fixed"]].map(([v, n]) => `<button type="button" class="${(r.prog && r.prog.on ? "1" : "0") === v ? "on" : ""}" data-run-prog="${id}|${v}">${n}</button>`).join("")}</div>
    ${r.prog && r.prog.on ? `<label>${capLbl}<input inputmode="decimal" data-run-in="${id}|cap" value="${m.kind !== "rep" && m.by === "dist" ? dU(r.prog.cap) : r.prog.cap}"></label>` : ""}</div>
    <p class="small muted">${r.prog && r.prog.on ? `Auto: ${progTxt(r)}, lighter every 4th week.` : "Fixed: the same every week."}</p>`;
  return h + `<div class="plan-box small"><b>This week:</b> ${esc((runPlanFor(r, today) || { d: "" }).d)}</div>`;
}

/* ----- sheets: new run, change today's run, race ----- */
function runNewHtml() {
  const day = SH.day, has = suRuns();
  return `<div class="xs-head"><h2>${SH.swap ? "Change this run" : "New run"}</h2><button type="button" class="btn ghost sm" data-xs="close">Cancel</button></div>
    ${SH.swap ? `<p class="small muted">Just for ${fmtDate(parseYmd(SH.swap))}. Your plan stays the same.</p>` : day != null ? `<p class="small muted">For ${DOW[day]}s.</p>` : ""}
    ${SH.swap && has.length ? `<div class="eyebrow">Your runs</div><div class="xs-list">${has.map(r => `<button type="button" class="xs-item" data-run-pick="${r.id}"><span><b>${esc(r.name)}</b><span class="small muted">${esc((runPlanFor(r, parseYmd(SH.swap)) || { d: "" }).d)}</span></span><span class="xs-plus">›</span></button>`).join("")}</div><div class="eyebrow" style="margin-top:12px">Or a different kind</div>` : ""}
    <div class="xs-list">${RUN_ORDER.map(t => { const T = RUN_TYPES[t], r = { id: "x", name: T.n, type: t, ...T.make() };
      return `<button type="button" class="xs-item" data-run-pick="type:${t}"><span><b>${esc(T.n)}</b><span class="small muted">${esc(runDesc(r, { main: r.main }, today))}</span></span><span class="xs-plus">${SH.swap ? "›" : "+"}</span></button>` }).join("")}</div>
    ${SH.swap && (S.profile.runSwap || {})[SH.swap] ? `<button type="button" class="btn ghost" data-run-unswap="1" style="margin-top:12px">Back to the planned run</button>` : ""}`;
}
function raceHtml() {
  const d = SH.d, u = RU(), pre = RUN_RACES.find(([n]) => n === d.label);
  return `<div class="xs-head"><h2>Race</h2><button type="button" class="btn ghost sm" data-xs="close">Cancel</button></div>
    <div class="stack" style="gap:12px">
      <div class="field"><label for="raceDate">Date</label><input id="raceDate" type="date" data-run-rf="date" value="${esc(d.date || "")}" min="${ymd(today)}"></div>
      <div class="field"><span class="lbl">Distance</span><div class="xs-chips" style="flex-wrap:wrap">${RUN_RACES.map(([n]) => `<button type="button" class="${d.label === n ? "on" : ""}" data-run-rdist="${n}">${n}</button>`).join("")}<button type="button" class="${!pre && d.label !== undefined ? "on" : ""}" data-run-rdist="">Other</button></div></div>
      ${!pre ? `<div class="field"><label for="raceMi">Distance (${u})</label><input id="raceMi" inputmode="decimal" data-run-rf="dist" value="${d.dist ? dU(d.dist, 2) : ""}" placeholder="${u === "km" ? "e.g. 15" : "e.g. 10"}"></div>` : ""}
      <div class="field"><label for="raceT">Goal time (optional)</label><input id="raceT" inputmode="numeric" data-run-rf="target" value="${d.target ? fmtMin(d.target) : ""}" placeholder="e.g. 2:30:00 or 25:00"></div>
      <p class="small muted" data-run-rpace>${racePaceLine(d)}</p>
      <button type="button" class="btn" data-run-rsave="1">Save race</button></div>`;
}
function racePaceLine(d) { const t = parseTime(String(d.targetTxt != null ? d.targetTxt : d.target ? fmtMin(d.target) : "")); return t > 0 && d.dist > 0 ? `Goal pace ${paceTxt(t / d.dist)}` : "" }
function runSheetHtml() { return SH.kind === "runnew" ? runNewHtml() : raceHtml() }

/* ----- events ----- */
function runMut(id, fn) { suMut(su => { const r = (su.runs || []).find(x => x.id === id); if (r) fn(r, su) }) }
const newRunId = () => "run_" + Math.random().toString(36).slice(2, 8);
function addRun(type, day) {
  const T = RUN_TYPES[type] || RUN_TYPES.easy, id = newRunId(), base = suRuns().filter(r => r.type === type).length;
  RUN_OPEN.add(id);
  suMut(su => { su.runs = su.runs || []; su.runs.push({ id, name: T.n + (base ? " " + (base + 1) : ""), type, ...T.make(), w0: weekOf(today) });
    if (day != null) { su.week[day] = "run"; su.runWeek = su.runWeek || Array(7).fill(null); su.runWeek[day] = id } });
  return id;
}
document.addEventListener("click", e => {
  const t = e.target.closest("[data-run-open],[data-run-new],[data-run-custom],[data-run-dup],[data-run-del],[data-run-step],[data-run-prog],[data-run-unit],[data-run-pick],[data-run-unswap],[data-run-race],[data-run-racedel],[data-run-rdist],[data-run-rsave],[data-runswap]");
  if (!t) return; const d = t.dataset;
  if (d.runOpen) { RUN_OPEN.has(d.runOpen) ? RUN_OPEN.delete(d.runOpen) : RUN_OPEN.add(d.runOpen); RUN_DEL = ""; render(); return }
  if (d.runNew) { openSheet({ kind: "runnew", day: null }); return }
  if (d.runswap) { openSheet({ kind: "runnew", swap: d.runswap }); return }
  if (d.runCustom) { suMut(su => { const i = su.runs.findIndex(x => x.id === d.runCustom); if (i >= 0) su.runs[i] = unfollow(su.runs[i]) }); toast("You can edit this run now"); return }
  if (d.runDup) { const r = runById(d.runDup); if (!r) return; const id = newRunId(); RUN_OPEN.add(id); suMut(su => { const src = su.runs.find(x => x.id === d.runDup); su.runs.push({ ...(src.follow ? unfollow(src) : JSON.parse(JSON.stringify(src))), id, name: (src.name + " copy").slice(0, 40), w0: weekOf(today) }) }); return }
  if (d.runDel) { if (RUN_DEL !== d.runDel) { RUN_DEL = d.runDel; render(); return } RUN_DEL = ""; const id = d.runDel;
    suMut(su => { su.runs = su.runs.filter(r => r.id !== id); (su.runWeek || []).forEach((x, i) => { if (x === id) { su.runWeek[i] = null; su.week[i] = "rest" } }) }); toast("Run deleted"); return }
  if (d.runStep) { const [id, f, dir] = d.runStep.split("|"), s = +dir;
    runMut(id, r => { const m = r.main;
      if (f === "warm" || f === "cool") r[f] = Math.max(0, Math.min(30, (r[f] || 0) + 5 * s));
      else if (f === "n") m.n = Math.max(1, Math.min(30, m.n + s));
      else if (f === "strides") r.strides = Math.max(0, Math.min(10, (r.strides || 0) + 2 * s));
      else if (f === "rwrun") m.rw.run = Math.max(1, Math.min(15, m.rw.run + s));
      else if (f === "rwwalk") m.rw.walk = Math.max(0.5, Math.min(5, m.rw.walk + (m.rw.walk < 1 || (m.rw.walk === 1 && s < 0) ? 0.5 : 1) * s)) }); return }
  if (d.runProg) { const [id, v] = d.runProg.split("|"); runMut(id, r => { r.prog = { ...(r.prog || {}), on: v === "1" }; r.w0 = weekOf(today); if (!(r.prog.cap > 0)) r.prog.cap = RUN_TYPES[r.type].make().prog.cap }); return }
  if (d.runUnit) { S.profile.distU = d.runUnit; saveProfile(); lastRenderKey = ""; render(); return }
  if (d.runPick) { const v = d.runPick;
    if (SH.swap) { const k = SH.swap; S.profile.runSwap = { ...(S.profile.runSwap || {}), [k]: v }; saveProfile(); xsClose(); lastRenderKey = ""; render(); toast("Changed for this day only"); return }
    const day = SH.day; xsClose(); if (/^type:/.test(v)) addRun(v.slice(5), day); return }
  if (d.runUnswap) { const k = SH.swap, sw = { ...(S.profile.runSwap || {}) }; delete sw[k]; S.profile.runSwap = sw; saveProfile(); xsClose(); lastRenderKey = ""; render(); return }
  if (d.runRace) { const R = CUSTOM.su.race || {}; openSheet({ kind: "race", d: { label: R.date ? R.label : "Half marathon", dist: R.date ? R.dist : 13.109, date: R.date || "", target: R.target || null } }); return }
  if (d.runRacedel) { suMut(su => { delete su.race }); toast("Race removed"); return }
  if (d.runRdist != null) { const pre = RUN_RACES.find(([n]) => n === d.runRdist); SH.d.label = pre ? pre[0] : ""; SH.d.dist = pre ? pre[1] : null; paintSheet(); return }
  if (d.runRsave) { const x = SH.d, t = parseTime(x.targetTxt != null ? x.targetTxt : x.target ? fmtMin(x.target) : "");
    if (!x.date) { toast("Pick the race date"); return } if (!(x.dist > 0)) { toast("Enter the race distance"); return }
    suMut(su => { su.race = { date: x.date, dist: Math.round(x.dist * 1000) / 1000, label: x.label || "", ...(t > 0 ? { target: Math.round(t * 100) / 100 } : {}) } }); xsClose(); toast("Race saved"); return }
});
document.addEventListener("change", e => {
  const t = e.target, d = t.dataset || {};
  if (d.runName) { runMut(d.runName, r => { r.name = t.value.trim().slice(0, 40) || r.name }); return }
  if (d.runRw) { runMut(d.runRw, r => { r.main.rw = t.checked ? { run: 2, walk: 1 } : null }); return }
  if (d.runSel) { const [id, f] = d.runSel.split("|"), v = t.value;
    runMut(id, r => { const m = r.main;
      if (f === "type") { const keep = { id: r.id, name: r.name === RUN_TYPES[r.type].n ? RUN_TYPES[v].n : r.name }; Object.keys(r).forEach(k => delete r[k]); Object.assign(r, { ...keep, type: v, ...RUN_TYPES[v].make(), w0: weekOf(today) }) }
      else if (f === "effort" || f === "warmHow") r[f] = v;
      else if (f === "by") { m.by = v; m.v = v === "dist" ? 3 : 30; r.prog.cap = v === "dist" ? 10 : 50 }
      else if (f === "workBy") m.work = v === "dist" ? { by: "dist", v: 400 } : { by: "time", v: 60 };
      else if (f === "restBy") m.rest = v === "back" ? { by: "back", v: 0, how: "walk" } : { by: "time", v: 90, how: m.rest.how || "jog" };
      else if (f === "restHow") m.rest.how = v }); return }
  if (d.runIn) { const [id, f] = d.runIn.split("|"), n = Number(String(t.value).replace(",", "."));
    if (!(n > 0)) { toast("Enter a number"); render(); return }
    runMut(id, r => { const m = r.main;
      if (f === "v") { m.v = m.by === "dist" ? Math.min(50, fromDU(n)) : Math.min(300, Math.round(n)); r.w0 = weekOf(today) }
      else if (f === "work") m.work.v = Math.min(m.work.by === "dist" ? 10000 : 1800, Math.round(n));
      else if (f === "rest") m.rest.v = Math.min(900, Math.round(n));
      else if (f === "cap") r.prog.cap = m.kind !== "rep" && m.by === "dist" ? Math.min(50, fromDU(n)) : Math.round(n) }); return }
  if (d.runRf && SH && SH.kind === "race") { const f = d.runRf; if (f === "dist") SH.d.dist = fromDU(t.value); else if (f === "target") SH.d.targetTxt = t.value; else SH.d[f] = t.value; const p = document.querySelector("[data-run-rpace]"); if (p) p.textContent = racePaceLine(SH.d); return }
});
document.addEventListener("input", e => { const t = e.target; if (t.dataset && t.dataset.runRf && SH && SH.kind === "race") { const f = t.dataset.runRf; if (f === "dist") SH.d.dist = fromDU(t.value); else if (f === "target") SH.d.targetTxt = t.value; const p = document.querySelector("[data-run-rpace]"); if (p) p.textContent = racePaceLine(SH.d) } });
