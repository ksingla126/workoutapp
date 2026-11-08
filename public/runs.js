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
  sprints:   { n: "Sprints", role: "thu", hint: "Flat and fast but relaxed: build to top speed over the first few seconds, hold it, then walk back so every rep is as fast as the first. Stop when your form falls apart.",
               make: () => ({ warm: 10, warmHow: "jog", cool: 10, main: { kind: "rep", n: 6, work: { by: "dist", v: 100 }, rest: { by: "back", v: 0, how: "walk" } }, effort: "allout", strides: 0, prog: { on: true, cap: 10 } }) },
  tt:        { n: "Time trial", role: "thu", hint: "An honest all-out effort over the distance. Log it as your Speed gate when one is open.",
               make: () => ({ warm: 10, warmHow: "jog", cool: 10, main: { kind: "steady", by: "dist", v: 1, rw: null }, effort: "allout", strides: 0, prog: { on: false, cap: 1 } }) }
};
const RUN_ORDER = ["easy", "long", "intervals", "sprints", "hills", "tempo", "fartlek", "recovery", "tt"];
// "Auto" structure: run the session your way and the reps, recoveries and warm-up are read from the recording
const AUTO_TYPES = ["intervals", "sprints", "hills", "fartlek", "tempo", "tt"];
const isAuto = r => !!(r && r.auto && AUTO_TYPES.includes(r.type) && !r.follow);
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
  if (isAuto(r)) { const last = autoLast(r.id); return `Auto · run it your way; the ${["tempo", "tt"].includes(r.type) ? "hard part and warm-up are" : "reps, recoveries and warm-up are"} read from your recording${last ? `. Last time: ${last}` : ""}` }
  const parts = [];
  if (r.warm > 0) parts.push(`${r.warm}-min ${r.warmHow === "walk" ? "walk" : "easy jog"}`);
  const m = x.main;
  if (m.kind === "rep") {
    const work = m.work.by === "dist" ? fmtWorkDist(m.work.v) : fmtSec(m.work.v);
    const rest = m.rest.by === "back" ? `${m.rest.how === "jog" ? "jog" : "walk"} back ${r.type === "hills" ? "down" : "to the start"}` : `${fmtSec(m.rest.v)} ${m.rest.how === "walk" ? "walk" : "easy jog"}`;
    if ((r.effort === "easy" || r.effort === "hr") && m.rest.by === "time" && m.rest.how === "walk" && m.work.by === "time") parts.push(`${m.n} × (run ${fmtSec(m.work.v)} / walk ${fmtSec(m.rest.v)})${r.effort === "hr" ? `, heart rate ${HR_LO}–${HR_HI}` : ""}`);
    else parts.push(`${m.n} × (${work} ${r.type === "hills" ? "uphill, " : ""}${effortTxt(r.effort, d)} / ${rest})`);
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
    return { type: "run", key: r.follow, rid: r.id, t: r.name || b.t, d: descU(desc), tag, ...(n ? { reps: +n } : {}), spec: specFromText(r.follow, desc, r.type) };
  }
  if (isAuto(r)) { const T = RUN_TYPES[r.type];
    return { type: "run", key: role, rid: r.id, t: r.name || T.n, d: runDesc(r, null, d), hint: T.hint + " Warm up, run the session however you like and record it; the structure is worked out afterwards.", tag: "Auto",
      spec: { type: r.type, effort: r.effort, auto: true }, ...(r.type === "tt" ? { tt: true } : {}) } }
  const x = runProgress(r, w, d), T = RUN_TYPES[r.type] || RUN_TYPES.easy;
  const out = { type: "run", key: role, rid: r.id, t: r.name || T.n, d: runDesc(r, x, d), hint: T.hint, tag: x.tag };
  if (x.main.kind === "rep") out.reps = x.main.n;
  const rwi = x.main.kind === "rep" && (r.effort === "easy" || r.effort === "hr") && x.main.rest.by === "time" && x.main.rest.how === "walk" && x.main.work.by === "time";
  out.spec = { type: r.type, effort: r.effort, ...(rwi ? { runwalk: true, rw: { run: x.main.work.v / 60, walk: x.main.rest.v / 60 } } : {}), ...(x.main.kind === "rep" ? { n: x.main.n, work: x.main.work, rest: x.main.rest } : { by: x.main.by, v: +Number(x.main.v).toFixed(3), rw: x.main.rw || null }), strides: r.strides || 0, warm: r.warm || 0 };
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
    spec: { type: "race", by: "dist", v: R.dist, target: R.target || null },
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
    if (m) { x.main.n = +m[1]; x.main.work = { by: "time", v: +m[2] * 60 }; x.main.rest = { by: "time", v: +m[3] * 60, how: /walk \d/.test(t) ? "walk" : "jog" }; if (/× \(run \d/.test(t)) x.effort = "easy" }
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
  if (AUTO_TYPES.includes(r.type)) {
    h += `<div class="runf"><span class="lbl small">Structure</span><div class="seg sm" role="group" aria-label="Structure">${[["0", "Set it"], ["1", "Auto"]].map(([v, n]) => `<button type="button" class="${(isAuto(r) ? "1" : "0") === v ? "on" : ""}" data-run-auto="${id}|${v}" aria-pressed="${(isAuto(r) ? "1" : "0") === v}">${n}</button>`).join("")}</div></div>`;
    if (isAuto(r)) return h + `<p class="small muted">${["tempo", "tt"].includes(r.type) ? "Warm up, run the hard part, cool down. From your GPX recording the app finds the hard block, how long it was and your pace, and checks it." : "Warm up and run the reps your way. From your GPX recording the app works out how many reps you did, how long each was (time, or distance if they were round like 400 m), the recoveries and whether you walked or jogged them, plus your warm-up and cool-down, then checks the session."} Your set structure is kept if you switch back.</p>
      <div class="plan-box small"><b>This week:</b> ${esc(runDesc(r, null, today))}</div>`;
  }
  h += `<div class="runf">${stepper("Warm-up", `${id}|warm`, r.warm, " min")}${r.warm > 0 || r.cool > 0 ? `<label>As${sel("warmHow", r.warmHow || "jog", [["jog", "Easy jog"], ["walk", "Walk"]])}</label>` : ""}</div>`;
  if (m.kind === "rep") {
    h += `<div class="runf">${stepper("Reps", `${id}|n`, m.n)}<label>Each rep${sel("workBy", m.work.by, [["time", "By time"], ["dist", "By distance"]])}</label>
      <label>${m.work.by === "dist" ? "Metres" : "Seconds"}<input inputmode="numeric" data-run-in="${id}|work" value="${m.work.v}"></label></div>
      <div class="runf"><label>Recovery${sel("restBy", m.rest.by, [["time", "By time"], ...(r.type === "hills" ? [["back", "Back down the hill"]] : r.type === "sprints" ? [["back", "Back to the start"]] : [])])}</label>
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
  const t = e.target.closest("[data-run-open],[data-run-new],[data-run-custom],[data-run-dup],[data-run-del],[data-run-step],[data-run-prog],[data-run-auto],[data-run-unit],[data-run-pick],[data-run-unswap],[data-run-race],[data-run-racedel],[data-run-rdist],[data-run-rsave],[data-runswap]");
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
  if (d.runAuto) { const [id, v] = d.runAuto.split("|"); runMut(id, r => { r.auto = v === "1" }); return }
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


/* ======================= Reading a recorded run for its format ======================= */
// What the planned session asked for, recovered from its text (program runs and runs logged before specs existed)
function specFromText(key, d, type) {
  d = String(d || ""); const num = re => { const m = d.match(re); return m ? Number(m[1]) : null };
  const rep = d.match(/(\d+) × \((?:run )?(\d+(?:\.\d+)?) ?(min|s)\b(?: hard)?\s*\/\s*(?:walk )?(\d+)? ?(min)?/);
  if ((type && /intervals|fartlek/.test(type)) || key === "thu" && rep) {
    if (rep) { const rw = /× \(run \d/.test(d); return { type: type || "intervals", n: +rep[1], work: { by: "time", v: rep[3] === "s" ? +rep[2] : +rep[2] * 60 }, rest: { by: "time", v: rep[4] ? +rep[4] * 60 : 120, how: /walk \d/.test(d) ? "walk" : "jog" }, warm: num(/^(\d+)-min/) || 0, ...(rw ? { runwalk: true, rw: { run: rep[3] === "s" ? +rep[2] / 60 : +rep[2], walk: rep[4] ? +rep[4] : 2 } } : {}) } }
  }
  const rw = d.match(/run (\d+) \/ walk (\d+)/), rwo = rw ? { run: +rw[1], walk: +rw[2] } : null;
  if (key === "sat" || type === "long") { const mi = num(/([\d.]+) mi/); return { type: type || "long", by: "dist", v: mi || null, rw: rwo, effort: /bpm/.test(d) ? "hr" : "easy" } }
  return { type: type || "easy", by: "time", v: num(/(\d+) min/), rw: rwo, effort: /bpm/.test(d) ? "hr" : "easy", strides: num(/(\d+) strides/) || 0 };
}
function runSpec(l, p) {
  const pl = (l && l.plan) || p || {};
  if (pl.spec) return pl.spec;
  const r = pl.rid && runById(pl.rid);
  if (r && !r.follow) { const x = runPlanFor(r, today); if (x && x.spec) return x.spec }
  return specFromText(pl.key || (l && l.key) || "tue", pl.d || "", r && r.type);
}

// Fast stretches in a run, from the full second-by-second track: sprints, reps, surges. Stored with the import so
// short efforts (a 15 s sprint) survive; the saved chart series is only every 10 s or more.
function findEfforts(pts) {
  if (!pts || pts.length < 30) return null;
  const t0 = pts[0].t, T = Math.floor((pts[pts.length - 1].t - t0) / 1000); if (T < 60 || T > 6 * 3600) return null;
  const C = new Float64Array(T + 1), H = new Array(T + 1).fill(null), E = new Array(T + 1).fill(null), gap = new Uint8Array(T + 1);
  let j = 0;
  for (let s = 0; s <= T; s++) { const tt = t0 + s * 1000; while (j < pts.length - 2 && pts[j + 1].t <= tt) j++;
    const a = pts[j], b = pts[j + 1] || a, f = b.t > a.t ? Math.min(1, Math.max(0, (tt - a.t) / (b.t - a.t))) : 0;
    C[s] = a.c + f * (b.c - a.c); const hr = f < 0.5 ? a.hr : b.hr; H[s] = hr > 30 ? hr : null; E[s] = a.ele != null && b.ele != null ? a.ele + f * (b.ele - a.ele) : null; gap[s] = b.t - a.t > 10000 ? 1 : 0 }
  const V = new Float64Array(T + 1);
  for (let s = 0; s <= T; s++) { const a = Math.max(0, s - 2), b = Math.min(T, s + 2); let v = b > a ? (C[b] - C[a]) / (b - a) : 0; if (gap[s] || v > 12) v = 0; V[s] = v }
  const mv = []; for (let s = 0; s <= T; s++) if (V[s] >= 0.5) mv.push(V[s]); if (mv.length < 60) return null;
  // two-cluster split (Otsu) of moving speed, 0.1 m/s bins
  const bins = new Array(100).fill(0); mv.forEach(v => bins[Math.min(99, Math.floor(v * 10))]++);
  const tot = mv.length, sumAll = bins.reduce((a, b, i) => a + b * i, 0); let wB = 0, sB = 0, best = 0, bi = -1;
  for (let i = 0; i < 100; i++) { wB += bins[i]; if (!wB) continue; const wF = tot - wB; if (!wF) break; sB += bins[i] * i; const between = wB * wF * (sB / wB - (sumAll - sB) / wF) ** 2; if (between > best) { best = between; bi = i } }
  if (bi < 0) return [];
  const thr = (bi + 1) / 10, hiV = mv.filter(v => v >= thr), loV = mv.filter(v => v < thr);
  if (!hiV.length || !loV.length || avgOf(hiV) / avgOf(loV) < 1.25) return [];          // one steady pace: no efforts
  const raw = []; let s0 = -1;
  for (let s = 0; s <= T + 1; s++) { const on = s <= T && V[s] >= thr; if (on && s0 < 0) s0 = s; if (!on && s0 >= 0) { raw.push([s0, s - 1]); s0 = -1 } }
  const merged = []; raw.forEach(g => { const p = merged[merged.length - 1]; if (p && g[0] - p[1] <= 4) p[1] = g[1]; else merged.push([...g]) });
  // smoothing rounds off the start and end of each effort: widen back out to where speed is halfway up
  const half = (thr + avgOf(loV)) / 2; merged.forEach(g => { for (let i = 0; i < 3 && g[0] > 0 && V[g[0] - 1] >= half; i++) g[0]--; for (let i = 0; i < 3 && g[1] < T && V[g[1] + 1] >= half; i++) g[1]++ });
  const out = merged.filter(([a, b]) => b - a + 1 >= 6).slice(0, 80).map(([a, b]) => {
    let vx = 0, g = 0, hs = [], hx = 0; for (let s = a; s <= b; s++) { vx = Math.max(vx, V[s]); if (H[s]) hs.push(H[s]); if (s > a && E[s] != null && E[s - 1] != null && E[s] > E[s - 1]) g += E[s] - E[s - 1] }
    for (let s = a; s <= Math.min(T, b + 30); s++) if (H[s]) hx = Math.max(hx, H[s]);          // heart rate peaks just after the effort
    const m = C[b] - C[a], d = b - a + 1;
    return { s: a, d, m: Math.round(m), vx: +vx.toFixed(2), hr: hs.length ? Math.round(avgOf(hs)) : null, hx: hx || null, g: E[a] != null ? Math.round(g * 10) / 10 : null } });
  return out;
}

const mph = v => `${trimN(RU() === "km" ? v * 3.6 : v * 2.23694, 1)} ${RU() === "km" ? "km/h" : "mph"}`;
const paceOfV = v => v > 0 ? 1609.344 / v / 60 : null;                                       // m/s → min per mile
const cv = a => { if (a.length < 2) return 0; const m = avgOf(a); return Math.sqrt(avgOf(a.map(x => (x - m) ** 2))) / m };
const FMT_OF = { easy: "steady", recovery: "steady", long: "steady", tempo: "tempo", intervals: "reps", fartlek: "reps", hills: "short", sprints: "short", tt: "tt", race: "tt" };

// Laps from the watch, when they look like a structured session rather than automatic 1 mi / 1 km splits
function structuredLaps(st) {
  const L = st.laps; if (!L || L.length < 3) return null;
  const auto = L.slice(0, -1).every(x => Math.abs(x.m - 1609) < 40 || Math.abs(x.m - 1000) < 25);
  return auto ? null : L;
}
// The efforts to judge: watch laps first, then fine-grained efforts, then the coarse chart segments
function repsFrom(st, spec) {
  const short = FMT_OF[spec.type] === "short";
  const laps = structuredLaps(st);
  if (laps) { const vs = laps.map(x => x.v).filter(v => v > 0).sort((a, b) => a - b), mid = vs[Math.floor(vs.length / 2)] || 0;
    const fast = laps.filter(x => x.v > mid * 1.12 || (short && x.d <= 60 && x.v >= mid));
    if (fast.length >= 2) return { src: "laps", list: fast.map(x => ({ s: x.s, d: x.d, m: x.m, v: x.v, vx: x.vx || x.v, hr: x.hr, hx: x.hx, g: x.g })) } }
  if (st.efforts) return { src: "track", list: st.efforts.map(x => ({ ...x, v: x.m / x.d })) };
  const segs = typeof segmentsOf === "function" ? segmentsOf(st) : [];
  const runs = segs.filter(x => x.r === 1);
  if (runs.length >= 2 && segs.some(x => x.r === 0)) return { src: "chart", coarse: true, list: runs.map(x => ({ s: Math.round(x.t0 * 60), d: Math.round(x.dur * 60), m: Math.round(x.dist * 1609.344), v: x.dist * 1609.344 / (x.dur * 60), vx: x.dist * 1609.344 / (x.dur * 60), hr: x.hr, hx: x.hr, g: null })) };
  return { src: "none", list: [] };
}
// keep the efforts that look like the planned reps
function matchReps(list, spec) {
  const w = spec.work || {}, n = spec.n || 0, short = FMT_OF[spec.type] === "short";
  let c = list.filter(x => w.by === "dist" ? x.m >= w.v * 0.5 && x.m <= w.v * 1.8 + 30 : w.v ? x.d >= Math.max(5, w.v * 0.5) && x.d <= w.v * 1.8 + 10 : true);
  if (short) c = c.filter(x => x.d <= 75);
  if (n && c.length > n + 2) { const keep = new Set(c.slice().sort((a, b) => b.v - a.v).slice(0, n + 2)); c = c.filter(x => keep.has(x)) }
  return c;
}

/* ----- Auto: work out a session's structure from the recording ----- */
const AUTO_DISTS = [100, 150, 200, 300, 400, 500, 600, 800, 1000, 1200, 1500, 1609, 2000, 3000];
const snapDist = m => { let b = null; AUTO_DISTS.forEach(x => { if (Math.abs(m - x) / x <= 0.1 && (!b || Math.abs(m - x) < Math.abs(m - b))) b = x }); return b };
const roundSec = s => s >= 60 ? Math.round(s / 5) * 5 : Math.round(s);
const median = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor((b.length - 1) / 2)] : 0 };
function gapSpeed(st, s0, s1) { // m/s between two moments (seconds from the start), from the chart series
  const S2 = st.series; if (!S2 || !S2.t || S2.t.length < 4 || s1 <= s0) return null;
  const at = sec => { const m = sec / 60; for (let i = 1; i < S2.t.length; i++) if (S2.t[i] >= m) { const f = (m - S2.t[i - 1]) / ((S2.t[i] - S2.t[i - 1]) || 1); return S2.d[i - 1] + f * (S2.d[i] - S2.d[i - 1]) } return S2.d[S2.d.length - 1] };
  return (at(s1) - at(s0)) * 1609.344 / (s1 - s0);
}
function autoDetect(st, spec) {
  const type = spec.type, totS = st.series && st.series.t ? Math.round(st.series.t[st.series.t.length - 1] * 60) : (st.min ? st.min * 60 : null);
  if (["tempo", "tt"].includes(type)) return autoBlock(st, spec, totS);
  const R = repsFrom(st, { type }); let L = R.list.slice();
  const short = type === "sprints" || type === "hills";
  L = L.filter(x => short ? x.d >= 5 && x.d <= 75 : type === "fartlek" ? x.d >= 10 && x.d <= 600 : x.d >= 30 && x.d <= 1500);
  if (L.length >= 3) { const key = x => short ? (x.vx || x.v) : x.v, mv = median(L.map(key)); L = L.filter(x => key(x) >= mv * (short ? 0.8 : 0.85)) }
  if (L.length < 2) return null;
  L.sort((a, b) => a.s - b.s);
  const n = L.length, durs = L.map(x => x.d), ms = L.map(x => x.m).filter(x => x > 0);
  let work;
  // a round distance (400 m) or a round time (3 min), whichever the reps fit more cleanly
  const dm = ms.length === n ? median(ms) : 0, snapped = dm ? snapDist(dm) : null, td = median(durs), unit = td >= 60 ? 30 : 5, tr = Math.max(unit, Math.round(td / unit) * unit);
  const eD = snapped ? Math.abs(dm - snapped) / snapped : 1, eT = Math.abs(td - tr) / tr;
  if (snapped && (type === "intervals" || type === "sprints") && cv(ms) < 0.15 && (eD <= eT || type === "sprints")) work = { by: "dist", v: snapped };
  else work = { by: "time", v: roundSec(td) };
  const gaps = L.slice(1).map((x, i) => x.s - (L[i].s + L[i].d)).filter(g => g > 0);
  let rest = null, how = "jog";
  if (gaps.length) { const sp = L.slice(1).map((x, i) => gapSpeed(st, L[i].s + L[i].d, x.s)).filter(v => v != null); how = sp.length && median(sp) < 1.7 ? "walk" : "jog";
    rest = short && how === "walk" && cv(gaps) > 0.25 ? { by: "back", v: 0, how } : { by: "time", v: roundSec(median(gaps)), how } }
  const warm = Math.round(L[0].s / 60), cool = totS ? Math.max(0, Math.round((totS - (L[n - 1].s + L[n - 1].d)) / 60)) : 0;
  const wTxt = work.by === "dist" ? fmtWorkDist(work.v) : fmtSec(work.v), rTxt = !rest ? "" : rest.by === "back" ? ` / ${how} back` : ` / ${fmtSec(rest.v)} ${how}`;
  const text = `${warm ? `${warm} min warm-up · ` : ""}${n} × ${wTxt}${rTxt}${cool ? ` · ${cool} min cool-down` : ""}`;
  return { spec: { n, work, rest: rest || { by: "time", v: 0, how }, warm }, text, short: `${n} × ${wTxt}${rTxt}`, src: R.src };
}
// tempo / time trial: the longest hard stretch (brief dips under 30 s don't break it)
function autoBlock(st, spec, totS) {
  const S2 = st.series; if (!S2 || !S2.t || S2.t.length < 8) return null;
  const N = S2.t.length, stepM = (S2.step || 10) / 60, v = [];
  for (let i = 0; i < N; i++) { const a = Math.max(0, i - 2), b = Math.min(N - 1, i + 2), dt = S2.t[b] - S2.t[a]; v.push(dt > 0 ? (S2.d[b] - S2.d[a]) / dt : 0) }   // mi per min
  const mov = v.filter(x => x > 0.03).sort((a, b) => a - b); if (mov.length < 8) return null;
  const lo = mov[Math.floor(mov.length * 0.2)], hi = mov[Math.floor(mov.length * 0.85)];
  let thr = (lo + hi) / 2; const steady = hi / lo < 1.12;
  let best = null;
  if (steady) best = [0, N - 1];
  else { let a = -1, dip = 0; const gapPts = Math.max(1, Math.round(0.5 / stepM));
    for (let i = 0; i <= N; i++) { const on = i < N && v[i] >= thr;
      if (on) { if (a < 0) a = i; dip = 0 } else if (a >= 0) { dip++; if (dip > gapPts || i === N) { const b = i - dip; if (!best || S2.t[b] - S2.t[a] > S2.t[best[1]] - S2.t[best[0]]) best = [a, b]; a = -1; dip = 0 } } } }
  if (!best) return null;
  const [a, b] = best, min = S2.t[b] - S2.t[Math.max(0, a - 1)], mi = S2.d[b] - S2.d[Math.max(0, a - 1)];
  if (min < (spec.type === "tt" ? 1.5 : 5)) return null;
  const warm = Math.round(S2.t[Math.max(0, a - 1)]), cool = Math.max(0, Math.round(S2.t[N - 1] - S2.t[b]));
  const what = spec.type === "tt" ? `${dTxt(mi, 2)} hard in ${fmtMin(min)}` : `${Math.round(min)} min tempo`;
  const text = `${warm ? `${warm} min warm-up · ` : ""}${what} at ${paceTxt(min / mi)}${cool ? ` · ${cool} min cool-down` : ""}`;
  return { spec: spec.type === "tt" ? { by: "dist", v: mi, ttStart: Math.max(0, a - 1), warm } : { by: "time", v: Math.max(5, Math.round(min)), warm }, text, short: spec.type === "tt" ? `${dTxt(mi, 2)} in ${fmtMin(min)}` : `${Math.round(min)} min at ${paceTxt(min / mi)}`, block: { min, mi } };
}
// what the last Auto run of this routine turned out to be, for the plan description
const AUTO_MEMO = {};
function autoLast(rid) {
  const e = Object.entries(S.logs || {}).filter(([, l]) => l && l.type === "run" && l.plan && l.plan.rid === rid && l.st).sort().pop(); if (!e) return "";
  const [k, l] = e, key = k + "|" + ((l.st.series && l.st.series.t && l.st.series.t.length) || 0);
  if (!(key in AUTO_MEMO)) { let t = ""; try { const sp = runSpec(l, l.plan); if (sp && sp.auto) { const A = autoDetect(l.st, sp); t = A ? A.short : "" } } catch (e2) {} AUTO_MEMO[key] = t }
  return AUTO_MEMO[key];
}

function runCheck(k, l) {
  const st = l && l.st; if (!l || l.type !== "run") return null;
  const p = (l.plan && l.plan.type === "run") ? l.plan : planFor(parseYmd(k));
  let spec = runSpec(l, p && p.type === "run" ? p : null); const fmt = l.race ? "tt" : spec.runwalk ? "steady" : FMT_OF[spec.type] || "steady";
  if (!st || (!st.series && !st.efforts && !st.laps && (l.repLog || l.tempo))) return l.mi > 0 || l.repLog ? manualCheck(k, l, spec, fmt) : null;
  let auto = null;
  if (spec.auto) { try { auto = autoDetect(st, spec) } catch (e) { auto = null }
    if (!auto) return { fmt, spec, stats: [], notes: ["Run the reps or hard part clearly faster than your warm-up and recoveries so they stand out."], reps: null, tone: "ok", auto: null,
      verdict: st.series || st.efforts ? "Auto couldn't find a structure in this run." : "This import has no second-by-second data, so Auto can't read the session. Import the run's GPX file." };
    spec = { ...spec, ...auto.spec } }
  const S2 = st.series, out = { fmt, spec, stats: [], notes: [], reps: null, tone: "good", verdict: "", auto: auto && auto.text };
  const add = (a, b) => b != null && b !== "" && out.stats.push([a, b]);
  const warn = (t, tone = "warn") => { out.notes.push(t); if (tone === "warn" || out.tone === "good") out.tone = tone };
  const hrOK = S2 && S2.hr && S2.hr.some(x => x);

  if (fmt === "reps" || fmt === "short") {
    const R = repsFrom(st, spec), reps = matchReps(R.list, spec), n = spec.auto ? reps.length : spec.n || reps.length;
    if (!R.list.length || !reps.length) { out.verdict = st.series || st.efforts ? "Couldn't find the fast reps in this run." : "This import has no second-by-second data, so the reps can't be checked."; out.tone = "ok";
      if (!st.series) out.notes.push("Import the run's GPX file to check each rep."); return out }
    if (R.coarse && fmt === "short") out.notes.push("Sprint check is rough: this run was saved before the app kept second-by-second data.");
    const sp = reps.map(x => fmt === "short" ? x.vx || x.v : x.v), first = avgOf(sp.slice(0, 2)), last = avgOf(sp.slice(-2)), fade = first > 0 ? (first - last) / first : 0;
    const rests = reps.slice(1).map((x, i) => x.s - (reps[i].s + reps[i].d));
    out.reps = reps.map((x, i) => ({ n: i + 1, dur: x.d, m: x.m, pace: paceOfV(x.v), top: x.vx, hr: x.hx || x.hr, rest: i ? rests[i - 1] : null, g: x.g }));
    out.src = R.src;
    add("Reps", `${reps.length}${n ? ` of ${n}` : ""}`);
    if (fmt === "short") add("Top speed", mph(Math.max(...reps.map(x => x.vx || x.v))));
    else add("Avg rep pace", paceTxt(paceOfV(avgOf(reps.map(x => x.v)))));
    { const fp = Math.round(fade * 100); add(fmt === "short" ? "Speed drop" : "Fade", fp === 0 ? "none" : fp > 0 ? `${fp}% slower` : `${-fp}% faster`) }
    if (rests.length) add("Avg recovery", fmtSec(Math.round(avgOf(rests))));
    if (spec.type === "hills") { const gs = reps.map(x => x.g).filter(x => x != null); if (gs.length) { const gft = avgOf(gs) * 3.28084, grade = avgOf(reps.map(x => x.g != null && x.m ? x.g / x.m : 0)) * 100;
      add("Climb per rep", `${Math.round(gft)} ft${grade > 0.5 ? ` (~${Math.round(grade)}%)` : ""}`); if (gft < 6) warn("These reps barely climbed. Were they on a hill? A 4–8% grade works best.", "ok") } }
    if (hrOK) add("Peak HR", `${Math.max(...reps.map(x => x.hx || x.hr || 0)) || "–"} bpm`);
    const pw = spec.work || {};
    if (pw.by === "time" && pw.v && fmt !== "short") { const sh = reps.filter(x => x.d < pw.v * 0.8).length; if (sh) warn(`${sh} rep${sh > 1 ? "s were" : " was"} more than 20% shorter than the planned ${fmtSec(pw.v)}.`, "ok") }
    if (spec.rest && spec.rest.by === "time" && rests.length) { const long = rests.filter(x => x > spec.rest.v * 1.5 + 15).length; if (long) warn(`${long} recover${long > 1 ? "ies ran" : "y ran"} well past the planned ${fmtSec(spec.rest.v)}.`, "ok") }
    const sd = cv(sp);
    out.m = { fade, sd, sp, rests, n, done: reps.length, dur: reps.map(x => x.d), dist: reps.map(x => x.m), hx: reps.map(x => x.hx || x.hr || null), g: reps.map(x => x.g), avgV: avgOf(reps.map(x => x.v)), topV: Math.max(...reps.map(x => x.vx || x.v)) };
    if (n && reps.length < n) { out.tone = "warn"; out.verdict = `${reps.length} of ${n} reps done${fade > 0.08 ? `, fading ${Math.round(fade * 100)}%` : ""}.` }
    else if (fade > 0.1) { out.tone = "warn"; out.verdict = `All ${reps.length} reps, but you slowed ${Math.round(fade * 100)}% from the first to the last. Start the first two a touch easier.` }
    else if (fade > 0.05 || sd > 0.08) { out.tone = out.tone === "warn" ? "warn" : "ok"; out.verdict = `All ${reps.length} reps with some fade (${Math.round(fade * 100)}%). Aim for even reps.` }
    else out.verdict = `All ${reps.length} reps and even${fade < -0.02 ? ", finishing faster than you started" : ""}. ${fmt === "short" ? "Speed held up well." : "Well paced."}`;
    return out;
  }

  // steady, tempo, time trial: work from the chart series
  if (!S2 || !S2.t || S2.t.length < 6) {
    const pace = l.mi && l.min ? l.min / l.mi : null; add("Avg pace", pace ? paceTxt(pace) : null);
    out.tone = "ok"; out.verdict = "Only the totals came through, so pacing and heart rate can't be checked."; out.notes.push("Import the run's GPX file for a full check."); return out }
  const N = S2.t.length, tAt = d => { for (let i = 1; i < N; i++) if (S2.d[i] >= d) { const f = (d - S2.d[i - 1]) / ((S2.d[i] - S2.d[i - 1]) || 1); return S2.t[i - 1] + f * (S2.t[i] - S2.t[i - 1]) } return null };
  const D = S2.d[N - 1], T = S2.t[N - 1];
  const half = tAt(D / 2), p1 = half ? half / (D / 2) : null, p2 = half ? (T - half) / (D / 2) : null;
  const sp = (st.splits || []).filter(x => x.pace > 0 && x.mi >= 0.9).map(x => x.pace);
  if (fmt === "tt") {
    const goal = spec.by === "dist" && spec.v ? spec.v : D, tt = auto && auto.block ? auto.block.min : D >= goal ? tAt(goal) : D >= goal * 0.97 ? T : null;          // GPS often reads a race a little short
    if (tt) { add(`${l.race ? "Finish" : "Time"} for ${dTxt(goal, 2)}`, fmtMin(tt)); add("Pace", paceTxt(tt / goal)) }
    if (!auto && p1 && p2) add("2nd half vs 1st", Math.abs(p2 - p1) * 60 < 2 ? "even" : `${p2 < p1 ? "−" : "+"}${fmtMin(Math.abs(pU(p2 - p1)))}/${RU()}`);
    const tgt = spec.target || (l.race && CUSTOM.su.race && CUSTOM.su.race.target);
    if (tt && tgt) { const diff = tt - tgt; add("Vs goal", `${diff <= 0 ? "−" : "+"}${fmtMin(Math.abs(diff))}`); out.verdict = diff <= 0 ? `Goal beaten by ${fmtMin(-diff)}.` : `${fmtMin(diff)} off your goal.`; out.tone = diff <= 0 ? "good" : diff < tgt * 0.03 ? "ok" : "warn" }
    else if (!tt) { out.tone = "warn"; out.verdict = `The run was ${dTxt(D, 2)}, shorter than the planned ${dTxt(goal, 2)}.` }
    if (!auto && p1 && p2) { const neg = p2 < p1, d = Math.abs(p2 - p1) / p1;
      out.verdict = (out.verdict ? out.verdict + " " : "") + (neg ? "Negative split: you finished stronger." : d > 0.04 ? `Second half ${Math.round(d * 100)}% slower: start more conservatively next time.` : "Evenly paced.");
      if (!neg && d > 0.04 && out.tone === "good") out.tone = "ok" }
    if (hrOK) add("Avg / max HR", `${st.avgHr || "–"} / ${st.maxHr || "–"}`);
    out.m = { tt, goal, p1: auto ? null : p1, p2: auto ? null : p2, sp, tgt: tgt || null, maxHr: st.maxHr || null };
    return out;
  }
  if (fmt === "tempo") {
    const L = Math.max(5, (spec.by === "time" && spec.v) || 20), stp = S2.step / 60, w = Math.max(2, Math.round(L / stp));
    let bi = -1, bd = 0; for (let i = 0; i + w < N; i++) { const dd = S2.d[i + w] - S2.d[i]; if (dd > bd) { bd = dd; bi = i } }
    if (bi < 0 || !(bd > 0)) { out.tone = "ok"; out.verdict = "Run too short to find the tempo block."; return out }
    const bp = (S2.t[bi + w] - S2.t[bi]) / bd, mid = bi + Math.floor(w / 2), a = (S2.t[mid] - S2.t[bi]) / ((S2.d[mid] - S2.d[bi]) || 1), b = (S2.t[bi + w] - S2.t[mid]) / ((S2.d[bi + w] - S2.d[mid]) || 1);
    add(`Best ${L} min`, paceTxt(bp)); add("Warm-up before it", fmtMin(S2.t[bi])); add("Block drift", `${b > a ? "+" : "−"}${Math.round(Math.abs(b - a) / a * 100)}%`);
    const hs = S2.hr.slice(bi, bi + w + 1).filter(x => x); if (hs.length) add("Block HR", `${Math.round(avgOf(hs))} bpm`);
    const rp = racePace(activeRace(parseYmd(k))); if (rp) add("Vs race pace", `${bp <= rp ? "−" : "+"}${fmtMin(Math.abs(bp - rp))}`);
    const drift = (b - a) / a; out.m = { bp, drift, L, warmMin: S2.t[bi], hr: hs.length ? avgOf(hs) : null, rp: rp || null };
    out.verdict = drift > 0.05 ? `Tempo faded ${Math.round(drift * 100)}% in the second half. Start it a little slower.` : drift < -0.05 ? "You sped up a lot during the tempo; the start may have been too cautious." : `Steady tempo at ${paceTxt(bp)}.`;
    out.tone = Math.abs(drift) > 0.05 ? "ok" : "good";
    if (S2.t[bi] < 5 && spec.warm) warn("The fast part started within 5 minutes. Warm up longer before tempo work.", "ok");
    return out;
  }
  // steady: easy, recovery, long
  const pace = l.mi && l.min ? l.min / l.mi : null; add("Avg pace", pace ? paceTxt(pace) : null);
  if (sp.length >= 3) add("Split spread", `${Math.round(cv(sp) * 100)}%`);
  if (p1 && p2) add("2nd half", `${p2 <= p1 ? "faster" : `${Math.round((p2 - p1) / p1 * 100)}% slower`}`);
  if (spec.type === "long" && spec.v) { const pct = D / spec.v; add("Distance", `${dTxt(D, 2)} of ${dTxt(spec.v)}`); if (pct < 0.9) warn(`Stopped ${dTxt(spec.v - D)} short of the planned ${dTxt(spec.v)}.`) }
  if (spec.type !== "long" && spec.by === "time" && spec.v && T < spec.v * 0.85) warn(`Ran ${Math.round(T)} of the planned ${spec.v} minutes.`, "ok");
  let decoup = null;
  if (hrOK) {
    const half2 = Math.floor(N / 2), ef = (i0, i1) => { const vs = [], hs = []; for (let i = i0; i < i1; i++) if (S2.r[i] >= 0 && S2.hr[i] && S2.p[i]) { vs.push(1 / S2.p[i]); hs.push(S2.hr[i]) } return vs.length > 3 ? avgOf(vs) / avgOf(hs) : null };
    const e1 = ef(Math.floor(N * 0.1), half2), e2 = ef(half2, N);
    if (e1 && e2) { decoup = (e1 - e2) / e1 * 100; add("HR drift", `${decoup > 0 ? "+" : ""}${Math.round(decoup)}%`) }
    if (spec.effort === "hr" && typeof hrRange === "function") { const r = hrRange(S2); if (r) { add(`In ${HR_LO}–${HR_HI}`, `${Math.round(r.pctIn)}%`); if (r.pctAbove > 30) warn(`${Math.round(r.pctAbove)}% of the run was above ${HR_HI} bpm. Walk sooner when it climbs.`) } }
    else { let hi = 0, tt = 0; S2.hr.forEach(v => { if (!v) return; tt++; if (v > HR_HI) hi++ }); if (tt && hi / tt > 0.35 && spec.type !== "long") warn(`${Math.round(hi / tt * 100)}% of this easy run was above ${HR_HI} bpm. Slow down to keep it easy.`, "ok") }
    if (decoup != null && decoup > 10) warn(`Your heart rate climbed ${Math.round(decoup)}% against your pace in the second half: a sign of fatigue, heat or under-fuelling.`, "ok");
  }
  if (spec.rw && spec.rw.run && typeof segmentsOf === "function") { const rs = segmentsOf(st).filter(x => x.r === 1 && x.dur >= 0.5).map(x => x.dur);
    if (rs.length >= 2) { const m = avgOf(rs); add("Avg run segment", fmtMin(m)); if (m < spec.rw.run * 0.75) warn(`Run segments averaged ${fmtMin(m)} against the planned ${spec.rw.run} min.`, "ok") } }
  const surges = (st.efforts || []).filter(x => x.d >= 15 && x.d <= 120).length;
  if (spec.strides) add("Strides found", `${(st.efforts || []).filter(x => x.d <= 30).length} of ${spec.strides}`);
  else if (surges >= 3 && !spec.rw && spec.type !== "long") warn(`${surges} fast surges in an easy run. Keep it steady unless strides are planned.`, "ok");
  out.m = { pace, p1, p2, decoup, D, T, sp, surges, hrIn: spec.effort === "hr" && typeof hrRange === "function" ? hrRange(S2) : null, aboveEasy: (() => { let hi = 0, tt = 0; (S2.hr || []).forEach(v => { if (!v) return; tt++; if (v > HR_HI) hi++ }); return tt ? hi / tt : null })(), avgHr: st.avgHr || null, cad: st.cad || null, elev: st.elevFt || null };
  if (!out.verdict) out.verdict = out.tone === "good" ? (p1 && p2 && p2 <= p1 * 1.03 ? "Steady, controlled run." : "Done. The second half slowed a little, which is normal on longer runs.") : out.notes[0];
  if (out.tone !== "good" && out.notes[0] === out.verdict) out.notes.shift();
  return out;
}
function runCheckHtml(k, l) {
  let c = null; try { c = runCheck(k, l) } catch (e) { c = null } if (!c) return "";
  const col = c.tone === "good" ? "var(--good)" : c.tone === "ok" ? "var(--warn,#E0A100)" : "var(--bad)";
  const lbl = { steady: "Steady run", tempo: "Tempo", reps: "Intervals", short: c.spec.type === "hills" ? "Hill sprints" : "Sprints", tt: l.race ? "Race" : "Time trial" }[c.fmt];
  let h = `<div class="runchk"><div class="eyebrow">Session check · ${esc(lbl)}${c.src === "laps" ? " · from your watch laps" : c.manual ? " · from what you entered" : ""}</div>${c.auto ? `<p class="rc-auto small"><b>Auto found:</b> ${esc(c.auto)}</p>` : ""}<p class="rc-v" style="border-left-color:${col}">${esc(c.verdict)}</p>`;
  if (c.stats.length) h += `<div class="stv">${c.stats.map(([a, b]) => `<div><span class="l">${esc(a)}</span><span class="v num">${esc(String(b))}</span></div>`).join("")}</div>`;
  if (c.reps && c.reps.length) { const short = c.fmt === "short", hills = c.spec.type === "hills";
    h += `<div class="rc-reps"><div class="rc-r hd small muted"><span>#</span><span>Time</span><span>${short ? "Top speed" : "Pace"}</span><span>${hills ? "Climb" : "Dist"}</span><span>Rest</span></div>${c.reps.map(r => `<div class="rc-r num"><span>${r.n}</span><span>${r.dur != null ? fmtSec(r.dur) : "–"}</span><span>${short ? (r.top ? mph(r.top) : "–") : r.pace ? paceTxt(r.pace) : "–"}</span><span>${hills ? (r.g != null ? Math.round(r.g * 3.28084) + " ft" : "–") : !r.m ? "–" : r.m >= 1000 ? dTxt(r.m / 1609.344, 2) : r.m + " m"}</span><span>${r.rest != null ? fmtSec(r.rest) : "–"}</span></div>`).join("")}</div>` }
  if (c.notes.length) h += `<ul class="rc-n small">${c.notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul>`;
  try { h += runCoachHtml(k, l, c) } catch (e) {}
  return h + `</div>`;
}
// plain-text version for the coach's written analysis
function runCheckText(k, l) {
  let c = null; try { c = runCheck(k, l) } catch (e) { return "" } if (!c) return "";
  let co = ""; try { const r = runCoach(k, l, c); if (r) co = ` Coach notes already shown to the user: ${r.items.map(([, h, x]) => `${h}: ${x}`).join(" ")} ${r.next.join(" ")}` } catch (e) {}
  return co + ` Session check (computed from ${c.manual ? "what they typed in" : "the recording"}${c.auto ? `; structure detected automatically: ${c.auto}` : ""}, format ${c.fmt}${c.src ? `, reps from ${c.src}` : ""}): ${c.verdict} ${c.stats.map(([a, b]) => `${a}: ${b}`).join("; ")}.${c.reps ? ` Reps: ${c.reps.map(r => `#${r.n}${r.dur != null ? " " + fmtSec(r.dur) : ""}${r.m ? ` ${r.m} m` : ""}${r.pace ? ` @ ${fmtMin(r.pace)}/mi` : ""}${r.top ? ` top ${trimN(r.top * 2.23694)} mph` : ""}${r.hr ? ` HR ${r.hr}` : ""}${r.rest != null ? ` rest ${fmtSec(r.rest)}` : ""}${r.g != null ? ` climb ${Math.round(r.g * 3.28084)} ft` : ""}`).join("; ")}.` : ""} ${c.notes.join(" ")}`;
}

/* ======================= Typing a run in by hand ======================= */
// "30", "30:00", "3000", "1:05:30", "30m", "1h 5m", "45 min" → minutes
function smartMin(s) {
  s = String(s || "").trim().toLowerCase().replace(",", "."); if (!s) return null;
  if (/[a-z]/.test(s)) { let m = 0, hit = false; s.replace(/([\d.]+)\s*(h|hr|hrs|hours?|m|mins?|minutes?|s|secs?|seconds?)\b/g, (_, n, u) => { hit = true; n = Number(n); m += u[0] === "h" ? n * 60 : u[0] === "s" ? n / 60 : n }); return hit && m > 0 ? m : null }
  const v = parseTime(s); return v > 0 ? v : null;
}
// rep time: "14.2" or "14.2s" → s, "1:20" → 80, "2m" / "2 min" → 120
function smartSec(s) {
  s = String(s || "").trim().toLowerCase().replace(",", "."); if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s) > 0 ? Number(s) : null;
  if (/^\d+:\d{1,2}(\.\d+)?$/.test(s)) { const [a, b] = s.split(":"); return Number(a) * 60 + Number(b) }
  const m = smartMin(s); return m ? Math.round(m * 600) / 10 : null;
}
// distance in miles: "3.1" (your unit), "5k", "5 km", "3.1 mi", "800m", "800" (metres when 20 or more and `metresOK`)
function smartMi(s, metresOK) {
  s = String(s || "").trim().toLowerCase().replace(",", "."); if (!s) return null;
  const m = s.match(/^([\d.]+)\s*(k|km|kms|kilometers?|kilometres?|mi|mile|miles|m|meters?|metres?)?$/); if (!m) return null;
  const n = Number(m[1]); if (!(n > 0)) return null; const u = m[2] || "";
  if (/^k/.test(u)) return n / KM; if (/^mi/.test(u)) return n; if (/^m/.test(u)) return n / 1609.344;
  if (metresOK && n >= 20) return n / 1609.344;
  return fromDU(n);
}
const rxD = (k, id) => drafts[dkey(k, id)];
function rxFmt(p, log) { const spec = runSpec(log, p); return { spec, fmt: (p.race || (log && log.race)) ? "tt" : spec.runwalk ? "steady" : FMT_OF[spec.type] || "steady" } }
function rxRepN(k, p, log, spec) { const d = rxD(k, "rx-n"); if (d != null) return Math.max(0, Math.min(40, Number(d) || 0)); return (log && (log.repLog ? log.repLog.length : log.reps)) || spec.n || p.reps || 4 }
function runLogHtml(p, k, log) {
  const { spec, fmt } = rxFmt(p, log), u = RU(), rep = fmt === "reps" || fmt === "short", tt = fmt === "tt";
  const f = (id, lbl, val, ph, mode = "decimal", hint = "") => `<div class="field"><label for="${id}">${lbl}</label><input id="${id}" inputmode="${mode}" autocomplete="off" value="${esc(val ?? "")}" placeholder="${esc(ph)}">${hint ? `<span class="small muted">${hint}</span>` : ""}</div>`;
  const plannedMi = spec.by === "dist" && spec.v ? spec.v : null, plannedMin = spec.by === "time" && spec.v ? spec.v : null;
  let h = `<div class="rx-quick row" style="gap:8px;flex-wrap:wrap">${log ? "" : `<button type="button" class="btn ghost sm" data-rx-fill="${k}">Fill in as planned</button>`}<span class="small muted">Times: 30:00, 3000 or 30m · Distances: 3.1, 5k or 800m</span></div>`;
  h += `<div class="row rx-tot" style="align-items:flex-start">
    ${f("rmi", rep ? `Total distance (${u})` : `Distance (${u})`, log && log.mi && !log.est ? dU(log.mi, 2) : "", rep ? "optional" : tt && plannedMi ? dU(plannedMi, 2) : u === "km" ? "e.g. 5" : "e.g. 3.1")}
    ${f("rtime", tt ? "Finish time" : rep ? "Total time" : "Time", log && log.min && log.est !== "both" ? fmtMin(log.min) : "", rep ? "optional" : plannedMin ? `${plannedMin}:00` : "30:00", "text")}
    ${f("rrpe", "Effort 1–10", log ? log.rpe : "", "6", "numeric")}</div>${rep ? `<span class="small muted" style="margin-top:-6px">No watch totals? Leave them blank and they're estimated from your plan.</span>` : ""}`;
  if (rep) {
    const n = rxRepN(k, p, log, spec), w = spec.work || {}, byDist = w.by === "dist", hills = spec.type === "hills";
    const lbl = byDist ? "Time" : hills ? "Time (optional)" : `Distance`, ph = byDist ? (w.v <= 200 ? "e.g. 14.5" : "e.g. 1:32") : hills ? (w.v ? `${w.v} s` : "") : "800m";
    h += `<div class="rx-reps"><div class="row between"><b class="small">Reps ${spec.n ? `<span class="muted">· planned ${spec.n} × ${byDist ? fmtWorkDist(w.v) : w.v ? fmtSec(w.v) : "rep"}</span>` : ""}</b>
      <span class="step"><button type="button" data-rx-n="${k}|-1" aria-label="One rep fewer">−</button><b class="num">${n}</b><button type="button" data-rx-n="${k}|1" aria-label="One rep more">+</button></span></div>
      <p class="small muted" style="margin:0">${byDist ? "Each rep's time, if you know it." : hills ? "Count the reps you did; times are optional." : "How far each rep went, if you know it."} Blanks are fine.</p>
      <div class="rx-grid">${[...Array(n)].map((_, i) => { const r = log && log.repLog && log.repLog[i]; const v = r ? (byDist || hills ? (r.t != null ? String(r.t) : "") : (r.m != null ? (r.m < 1000 ? r.m + "m" : dU(r.m / 1609.344, 2)) : "")) : "";
        return `<label class="rx-r"><span class="num">${i + 1}</span><input id="rx-r${i}" inputmode="${byDist || hills ? "decimal" : "text"}" autocomplete="off" value="${esc(v)}" placeholder="${esc(ph)}" aria-label="Rep ${i + 1} ${lbl.toLowerCase()}"></label>` }).join("")}</div></div>`;
  }
  if (spec.runwalk) { const n = rxRepN(k, p, log, spec);
    h += `<div class="rx-reps"><div class="row between"><b class="small">Rounds finished <span class="muted">· planned ${spec.n}</span></b><span class="step"><button type="button" data-rx-n="${k}|-1" aria-label="One round fewer">−</button><b class="num">${n}</b><button type="button" data-rx-n="${k}|1" aria-label="One round more">+</button></span></div></div>` }
  if (fmt === "tempo") {
    const tp = log && log.tempo;
    h += `<div class="rx-sub"><b class="small">Tempo part</b><div class="row" style="align-items:flex-start">${f("rx-tmin", "Time", tp ? fmtMin(tp.min) : "", plannedMin ? `${plannedMin}:00` : "20:00", "text")}${f("rx-tdist", `Distance (${u})`, tp && tp.mi ? dU(tp.mi, 2) : "", "optional")}</div><span class="small muted" id="rx-tpace"></span></div>`;
  }
  h += `<div class="row" style="align-items:flex-start">${f("rx-hr", "Avg heart rate", log && log.hr ? log.hr : "", "optional", "numeric")}</div>`;
  h += `<p class="small rx-err" id="rx-err" role="alert" hidden></p>`;
  return h;
}
// what was typed → the log fields, or the first problem to fix
function runLogCollect(p, k, log, timerMin) {
  const { spec, fmt } = rxFmt(p, log), rep = fmt === "reps" || fmt === "short", val = id => { const el = document.getElementById(id); return el ? el.value.trim() : "" };
  const bad = (id, msg) => ({ err: msg, el: id });
  const miTxt = val("rmi"), tTxt = val("rtime");
  let mi = miTxt ? smartMi(miTxt) : null, min = tTxt ? smartMin(tTxt) : null;
  if (miTxt && !(mi > 0)) return bad("rmi", `Couldn't read “${miTxt}” as a distance. Try 3.1, 5k or 800m.`);
  if (tTxt && !(min > 0)) return bad("rtime", `Couldn't read “${tTxt}” as a time. Try 30:00, 3000 or 30m.`);
  if (!min && timerMin > 0) min = timerMin;
  const rpeT = val("rrpe"), rpe = rpeT ? Number(rpeT) : null; if (rpeT && !(rpe >= 1 && rpe <= 10)) return bad("rrpe", "Effort is 1 to 10.");
  const hrT = val("rx-hr"), hr = hrT ? Math.round(Number(hrT)) : null; if (hrT && !(hr >= 60 && hr <= 230)) return bad("rx-hr", "Heart rate should be between 60 and 230.");
  const out = { rpe, ...(hr ? { hr } : {}) };
  if (rep) {
    const n = rxRepN(k, p, log, spec), w = spec.work || {}, byDist = w.by === "dist", hills = spec.type === "hills", list = [];
    for (let i = 0; i < n; i++) { const t = val("rx-r" + i);
      if (!t) { list.push({ t: null, m: byDist ? w.v : null }); continue }
      if (byDist || hills) { const s = smartSec(t); if (!(s > 0) || s > 3600) return bad("rx-r" + i, `Rep ${i + 1}: couldn't read “${t}” as a time. Try 14.5 or 1:32.`); list.push({ t: s, m: byDist ? w.v : null }) }
      else { const m2 = smartMi(t, true); if (!(m2 > 0) || m2 > 10) return bad("rx-r" + i, `Rep ${i + 1}: couldn't read “${t}” as a distance. Try 800m or 0.5.`); list.push({ t: w.v || null, m: Math.round(m2 * 1609.344) }) } }
    if (!n) return bad("rx-r0", "Add at least one rep, or log it as a different run with Change run.");
    out.repLog = list; out.reps = n;
    // totals from the plan when left blank (marked as estimates; estimates don't count toward your rank)
    if (!mi || !min) { const R = p.rid && runById(p.rid), warm = (R && R.warm) || spec.warm || 0, cool = (R && R.cool) || warm, easyP = recentEasyPace() || 12;
      const work = list.reduce((a, x) => a + (x.t || w.v || (byDist ? w.v / 3.5 : 60)), 0), restS = spec.rest && spec.rest.by === "time" ? spec.rest.v : byDist ? (w.v || 100) / 1.3 : (w.v || 20) * 3.5;
      const estMin = warm + cool + work / 60 + Math.max(0, n - 1) * restS / 60;
      const repMi = list.reduce((a, x) => a + (x.m || (x.t ? x.t * 3.5 : (w.v || 60) * 3.5)), 0) / 1609.344, restMi = spec.rest && spec.rest.how === "jog" ? Math.max(0, n - 1) * restS / 60 / easyP : Math.max(0, n - 1) * restS / 60 / 20;
      if (!min) { min = Math.round(estMin * 10) / 10; out.est = "both" } else out.est = "mi";
      if (!mi) mi = Math.round(((warm + cool) / easyP + repMi + restMi) * 100) / 100; else if (out.est === "mi") delete out.est }
  } else {
    if (spec.runwalk) out.reps = rxRepN(k, p, log, spec);
    if (!mi) return bad("rmi", fmt === "tt" ? "Enter the race or time trial distance." : "Enter how far you ran.");
    if (!min) return bad("rtime", fmt === "tt" ? "Enter your finish time." : "Enter how long it took.");
    if (fmt === "tempo") { const tm = val("rx-tmin"), td = val("rx-tdist");
      if (tm || td) { const a = tm ? smartMin(tm) : null, b = td ? smartMi(td) : null;
        if (tm && !(a > 0)) return bad("rx-tmin", `Couldn't read “${tm}” as a time.`); if (td && !(b > 0)) return bad("rx-tdist", `Couldn't read “${td}” as a distance.`);
        if (a > min + 0.01) return bad("rx-tmin", "The tempo part can't be longer than the whole run."); if (b && b > mi + 0.01) return bad("rx-tdist", "The tempo part can't be farther than the whole run.");
        out.tempo = { min: a || null, mi: b || null } } }
  }
  const pace = min / mi;
  if (!out.est && (pace < 3.6 || pace > 30) && RX_CONFIRM !== k + "|" + mi + "|" + min) { RX_CONFIRM = k + "|" + mi + "|" + min;
    const other = RU() === "km" ? pace * KM : pace / KM, hint = other >= 3.6 && other <= 30 ? ` If that was ${miTxt} ${RU() === "km" ? "mi" : "km"}, switch the unit in Plan → Runs.` : "";
    return bad("rmi", `That works out to ${paceTxt(pace)}, which looks off. Check the distance and time.${hint} Tap Save again to keep it.`) }
  out.mi = Math.round(mi * 1000) / 1000; out.min = Math.round(min * 100) / 100;
  return { data: out };
}
let RX_CONFIRM = "";
function recentEasyPace() { const L = Object.values(S.logs).filter(l => l.type === "run" && l.mi > 0 && l.min > 0 && !l.est && (l.key === "tue" || l.key === "sat")).slice(-6).map(l => l.min / l.mi).filter(x => x > 6 && x < 20); return L.length ? avgOf(L) : null }
function rxFill(k, p) {
  const { spec, fmt } = rxFmt(p, S.logs[k]); const set = (id, v) => { drafts[dkey(k, id)] = v };
  if (fmt === "reps" || fmt === "short") { set("rx-n", spec.n || p.reps || 4); [...Array(40)].forEach((_, i) => delete drafts[dkey(k, "rx-r" + i)]) }
  else if (spec.runwalk) { const tot = (spec.warm || 0) * 2 + spec.n * (spec.rw.run + spec.rw.walk); set("rx-n", spec.n); set("rtime", fmtMin(tot)); if (!rxD(k, "rmi")) set("rmi", dU(tot / (recentEasyPace() || 14), 2)) }
  else { const pace = recentEasyPace() || 11;
    if (spec.by === "dist" && spec.v) { set("rmi", dU(spec.v, 2)); if (!rxD(k, "rtime")) set("rtime", fmtMin(spec.v * pace)) }
    else if (spec.by === "time" && spec.v) { set("rtime", `${spec.v}:00`); if (!rxD(k, "rmi")) set("rmi", dU(spec.v / pace, 2)) }
    if (fmt === "tempo" && spec.v) set("rx-tmin", `${spec.v}:00`) }
  drafts[dkey(k, "open-trainLog")] = true; persistDrafts(); lastRenderKey = ""; render();
  setTimeout(() => { const el = document.getElementById(fmt === "reps" || fmt === "short" ? "rx-r0" : "rtime"); if (el) el.focus() }, 50);
}
function rxPreview(k, p) {
  const v = id => { const el = document.getElementById(id); return el ? el.value : "" }, mi = smartMi(v("rmi")), m = smartMin(v("rtime")), pe = document.getElementById("pace");
  if (pe) pe.textContent = mi > 0 && m > 0 ? paceTxt(m / mi) : "–";
  const tp = document.getElementById("rx-tpace"); if (tp) { const a = smartMin(v("rx-tmin")), b = smartMi(v("rx-tdist")); tp.textContent = a > 0 && b > 0 ? `Tempo pace ${paceTxt(a / b)}${racePace(activeRace()) ? ` · race pace ${paceTxt(racePace(activeRace()))}` : ""}` : "" }
}
document.addEventListener("click", e => {
  const t = e.target.closest("[data-rx-fill],[data-rx-n]"); if (!t) return; const d = t.dataset;
  if (d.rxFill) { const k = d.rxFill, p = planFor(parseYmd(k)); if (p) rxFill(k, p); return }
  if (d.rxN) { const [k, s] = d.rxN.split("|"), p = planFor(parseYmd(k)), { spec } = rxFmt(p, S.logs[k]); drafts[dkey(k, "rx-n")] = Math.max(0, Math.min(40, rxRepN(k, p, S.logs[k], spec) + Number(s))); drafts[dkey(k, "open-trainLog")] = true; persistDrafts(); lastRenderKey = ""; render() }
});
document.addEventListener("input", e => { const t = e.target; if (t && t.id && /^(rmi|rtime|rx-tmin|rx-tdist)$/.test(t.id) && typeof sel !== "undefined") { const k = ymd(sel), p = planFor(sel); if (p && p.type === "run") rxPreview(k, p) }
  if (t && t.id && /^(rmi|rtime|rrpe|rx-)/.test(t.id)) { const er = document.getElementById("rx-err"); if (er && !er.hidden) { er.hidden = true; document.querySelectorAll(".rx-bad").forEach(x => x.classList.remove("rx-bad")) } } });

/* ----- the session check for a run typed in by hand ----- */
function manualCheck(k, l, spec, fmt) {
  const out = { fmt, spec, stats: [], notes: [], reps: null, tone: "good", verdict: "", manual: true };
  const add = (a, b) => b != null && b !== "" && out.stats.push([a, b]);
  const pace = l.mi > 0 && l.min > 0 ? l.min / l.mi : null;
  if (fmt === "reps" || fmt === "short") {
    const L = l.repLog || (l.reps ? [...Array(l.reps)].map(() => ({})) : []), n = spec.n || L.length;
    if (!L.length) { out.tone = "ok"; out.verdict = "No reps were entered."; return out }
    const withV = L.map((x, i) => ({ ...x, i, v: x.t > 0 && x.m > 0 ? x.m / x.t : null }));
    out.reps = withV.map(x => ({ n: x.i + 1, dur: x.t ? Math.round(x.t * 10) / 10 : null, m: x.m || null, pace: x.v ? paceOfV(x.v) : null, top: x.v, hr: null, rest: null, g: null }));
    add("Reps", `${L.length}${n ? ` of ${n}` : ""}`);
    const vs = withV.filter(x => x.v).map(x => x.v);
    if (vs.length) { if (fmt === "short") add("Fastest rep", mph(Math.max(...vs))); else add("Avg rep pace", paceTxt(paceOfV(avgOf(vs)))) }
    let fade = 0; if (vs.length >= 3) { const a = avgOf(vs.slice(0, 2)), b = avgOf(vs.slice(-2)); fade = (a - b) / a; const fp = Math.round(fade * 100); add(fmt === "short" ? "Speed drop" : "Fade", fp === 0 ? "none" : fp > 0 ? `${fp}% slower` : `${-fp}% faster`) }
    if (l.est) out.notes.push("Totals were estimated from the plan, so this run doesn't count toward your rank.");
    if (n && L.length < n) { out.tone = "warn"; out.verdict = `${L.length} of ${n} reps done.` }
    else if (fade > 0.1) { out.tone = "warn"; out.verdict = `All ${L.length} reps, but the last ones were ${Math.round(fade * 100)}% slower. Start a touch easier.` }
    else if (fade > 0.05) { out.tone = "ok"; out.verdict = `All ${L.length} reps with some fade.` }
    else out.verdict = vs.length >= 3 ? `All ${L.length} reps and even.` : `All ${L.length} reps done.${vs.length ? "" : " Add rep times next time to see your fade."}`;
    return out;
  }
  add(fmt === "tt" ? "Pace" : "Avg pace", pace ? paceTxt(pace) : null);
  if (l.hr) add("Avg HR", `${l.hr} bpm`);
  if (spec.runwalk && l.reps) { add("Rounds", `${l.reps} of ${spec.n}`); if (l.reps < spec.n) { out.tone = "ok"; out.verdict = `${l.reps} of ${spec.n} run/walk rounds done.` } }
  if (fmt === "tt") { const tgt = spec.target || (l.race && CUSTOM.su.race && CUSTOM.su.race.target), goal = spec.by === "dist" && spec.v;
    add("Time", fmtMin(l.min));
    if (tgt && goal && Math.abs(l.mi - goal) / goal < 0.03) { const diff = l.min - tgt; add("Vs goal", `${diff <= 0 ? "−" : "+"}${fmtMin(Math.abs(diff))}`); out.verdict = diff <= 0 ? `Goal beaten by ${fmtMin(-diff)}.` : `${fmtMin(diff)} off your goal.`; out.tone = diff <= 0 ? "good" : diff < tgt * 0.03 ? "ok" : "warn" }
    else out.verdict = `${dTxt(l.mi, 2)} in ${fmtMin(l.min)}.`; return out }
  if (fmt === "tempo" && l.tempo && l.tempo.min && l.tempo.mi) { const tp = l.tempo.min / l.tempo.mi, rp = racePace(activeRace(parseYmd(k))); add("Tempo pace", paceTxt(tp)); if (rp) add("Vs race pace", `${tp <= rp ? "−" : "+"}${fmtMin(Math.abs(pU(tp - rp)))}`) }
  const prev = Object.entries(S.logs).filter(([kk, x]) => kk < k && x.type === "run" && x.mi > 0 && x.min > 0 && ((x.plan && x.plan.rid && x.plan.rid === (l.plan && l.plan.rid)) || x.key === l.key)).sort().pop();
  if (prev && pace) { const pp = prev[1].min / prev[1].mi, d = pace - pp; add("Vs last time", Math.abs(d) * 60 < 3 ? "same pace" : `${d < 0 ? "−" : "+"}${fmtMin(Math.abs(pU(d)))}/${RU()}`) }
  if (spec.type === "long" && spec.v && l.mi < spec.v * 0.9) { out.tone = "warn"; out.verdict = `${dTxt(spec.v - l.mi)} short of the planned ${dTxt(spec.v)}.` }
  if (l.hr && fmt === "steady" && spec.type !== "long" && l.hr > HR_HI + 5) { out.tone = out.tone === "warn" ? "warn" : "ok"; out.notes.push(`Average heart rate ${l.hr} is above your easy zone (${HR_LO}–${HR_HI}). Slow down to keep easy runs easy.`) }
  if (!out.verdict) out.verdict = out.tone === "good" ? (fmt === "tempo" ? "Tempo logged." : "Run logged. Steady work.") : out.notes.shift();
  if (!l.st) out.notes.push("Import the run's GPX file for pacing and heart-rate detail.");
  return out;
}

// Nobody's first run should be intervals or sprints: the first run is an easy one, so you learn your pace
function firstRunEasy(p, k) {
  if (!p || p.type !== "run" || p.logged || p.race || p.swapped || p.key !== "thu") return p;
  if (Object.entries(S.logs).some(([kk, l]) => l && l.type === "run" && kk < k)) return p;
  const d = parseYmd(k), r = suRuns().find(x => runRole(x) === "tue");
  const x = r ? runPlanFor(r, d) : runPlanFor({ id: "type:easy", name: "Easy run", type: "easy", ...RUN_TYPES.easy.make(), w0: weekOf(d), prog: { on: false } }, d);
  if (!x) return p;
  return { ...p, ...x, firstRun: true, from: p.t, tag: "First run", hint: `Your first run is an easy one so you can find your pace. ${p.t} starts with your next run. ` + (x.hint || "") };
}

/* ======================= Guided run (live view) ======================= */
// Steps from the planned run: warm-up, each rep and recovery (or run/walk round), cool-down. Timed steps count
// down and move on by themselves with a beep; distance steps (100 m, a mile) run a stopwatch until you tap Done.
function buildRunSteps(p) {
  if (p.spec && p.spec.auto) { const T = RUN_TYPES[p.spec.type] || {};
    return [{ k: "work", t: `${p.t}`, s: `Auto: warm up, run ${p.spec.type === "tt" ? "it all-out" : "the session your way"}, cool down. Tap Done when you finish; the structure is read from your recording.`, dur: null, lap: true }] }
  const spec = runSpec(null, p), r = p.rid && runById(p.rid), out = [], warm = spec.warm || (r && r.warm) || 0, cool = (r && r.cool) || spec.warm || 0, how = r && r.warmHow === "walk" ? "walk" : "easy jog";
  const eff = spec.effort ? effortTxt(spec.effort, today) : "";
  if (warm) out.push({ k: "warm", t: "Warm-up", s: `${warm} min ${how}`, dur: warm * 60 });
  if (spec.runwalk && spec.rw) { for (let i = 0; i < (spec.n || 1); i++) { out.push({ k: "work", t: `Run · round ${i + 1} of ${spec.n}`, s: "Easy, steady jog", dur: Math.round(spec.rw.run * 60), rep: i }); out.push({ k: "rest", t: `Walk · round ${i + 1} of ${spec.n}`, s: "Brisk walk", dur: Math.round(spec.rw.walk * 60) }) } }
  else if (spec.n && spec.work) { const w = spec.work, R = spec.rest || {}, hills = spec.type === "hills";
    for (let i = 0; i < spec.n; i++) {
      out.push({ k: "work", t: `${hills ? "Hill sprint" : spec.type === "sprints" ? "Sprint" : "Rep"} ${i + 1} of ${spec.n}`, s: `${w.by === "dist" ? fmtWorkDist(w.v) : fmtSec(w.v)}${hills ? " uphill" : ""} · ${eff}`, dur: w.by === "time" ? w.v : null, rep: i, lap: w.by === "dist" });
      if (i < spec.n - 1) out.push(R.by === "time" ? { k: "rest", t: "Recover", s: `${R.how === "walk" ? "Walk" : "Easy jog"}`, dur: R.v } : { k: "rest", t: hills ? "Walk back down" : "Walk back", s: "Tap Go when you're ready for the next one", dur: null }) } }
  else if (spec.rw && spec.rw.run) { const tot = spec.by === "time" && spec.v ? spec.v : 60, n = Math.max(1, Math.ceil(tot / (spec.rw.run + spec.rw.walk)));
    for (let i = 0; i < n; i++) { out.push({ k: "work", t: `Run · round ${i + 1}`, s: eff, dur: Math.round(spec.rw.run * 60) }); out.push({ k: "rest", t: `Walk · round ${i + 1}`, s: "Brisk walk", dur: Math.round(spec.rw.walk * 60) }) } }
  else if (spec.type === "tempo" && spec.by === "time") out.push({ k: "work", t: "Tempo", s: eff, dur: (spec.v || 20) * 60 });
  else if (spec.by === "time" && spec.v) out.push({ k: "work", t: p.t, s: eff, dur: spec.v * 60 });
  else out.push({ k: "work", t: spec.by === "dist" && spec.v ? `${p.race ? "Race" : "Run"} ${dTxt(spec.v, 2)}` : p.t, s: eff || "Tap Done when you finish", dur: null, lap: true });
  for (let i = 0; i < (spec.strides || 0); i++) { out.push({ k: "work", t: `Stride ${i + 1} of ${spec.strides}`, s: "Smooth and fast, about 85%", dur: 20 }); out.push({ k: "rest", t: "Walk", s: "Shake it out", dur: 60 }) }
  if (cool) out.push({ k: "cool", t: "Cool-down", s: `${cool} min ${how}`, dur: cool * 60 });
  return out;
}
let RL = null; try { RL = JSON.parse(localStorage.getItem("ru-runlive") || "null") } catch (e) { RL = null }
const rlSave = () => { try { localStorage.setItem("ru-runlive", JSON.stringify(RL)) } catch (e) {} };
function rlState(k, p) {
  if (!RL || RL.k !== k || RL.start !== TM.start) { RL = { k, start: TM.start, steps: buildRunSteps(p), i: 0, t0: TM.start, laps: [], pause: null }; rlSave() }
  return RL;
}
const rlNow = () => RL && RL.pause ? RL.pause : Date.now();
function rlGo(i, skipped) {
  if (!RL) return; const cur = RL.steps[RL.i], took = Math.round((rlNow() - RL.t0) / 100) / 10;
  if (cur && !skipped) RL.laps[RL.i] = took; else if (cur) RL.laps[RL.i] = null;
  RL.i = Math.max(0, Math.min(RL.steps.length, i)); RL.t0 = rlNow(); rlSave();
  try { navigator.vibrate && navigator.vibrate(RL.i < RL.steps.length ? [120, 60, 120] : [300]) } catch (e) {} if (typeof beep === "function") beep();
  renderLive();
}
function runLiveParts(k, p) {
  const R = rlState(k, p), st = R.steps, cur = st[R.i], el = (rlNow() - R.t0) / 1000;
  const done = R.i >= st.length;
  let main, next;
  if (done) main = `<div class="lv-main go"><div class="lv-label">All ${st.length} parts done</div><div class="lv-ex">Run complete</div><button class="btn lv-cta" id="lvRunDone" data-go="1">Review &amp; save</button></div>`;
  else { const left = cur.dur ? Math.max(0, cur.dur - el) : null;
    main = `<div class="lv-main ${cur.k === "rest" ? "rest" : ""} rl-${cur.k}"><div class="lv-label">${R.pause ? "Paused · " : ""}${esc(cur.t)}</div>
      <div class="lv-clock" id="rlClock">${left != null ? fmtClock(left * 1000) : fmtClock(el * 1000)}</div>${cur.dur ? `<div class="lv-ring"><i id="rlFill" style="width:${Math.min(100, el / cur.dur * 100)}%"></i></div>` : ""}
      <p class="small lv-note">${esc(cur.s || "")}</p>
      <div class="row lv-btns">${cur.dur ? `<button class="btn ghost" id="rlSkip">Skip</button>` : `<button class="btn lv-cta" id="rlLap" data-go="1">${cur.k === "rest" ? "Go" : "Done ✓"}</button>`}<button class="btn ghost" id="rlPause">${R.pause ? "Resume" : "Pause"}</button></div>
      <button class="link small" id="lvRunDone" style="align-self:center">Finish run</button></div>`;
  }
  const nx = st[R.i + 1];
  next = done ? `<div class="lv-next"><span class="lv-label">Next</span><span>Your time${st.some(s => s.lap && s.k === "work") ? " and rep times fill" : " fills"} in. Add your distance, then Save.</span></div>`
    : nx ? `<div class="lv-next"><span class="lv-label">Then</span><span class="nm">${esc(nx.t)}</span><span>${nx.dur ? fmtClock(nx.dur * 1000) : esc(nx.s || "")}</span></div>` : `<div class="lv-next"><span class="lv-label">Then</span><span class="nm">Done</span><span>Review and save your run.</span></div>`;
  const list = `<div class="lv-list" aria-label="Run parts: tap one to jump to it">${st.map((s, i) => `<button type="button" class="lv-row ${i < R.i ? "done" : ""} ${i === R.i ? "cur" : ""}" data-rljump="${i}" ${i === R.i ? 'aria-current="step"' : ""}><span>${esc(s.t)}</span><span class="num">${R.laps[i] != null && i < R.i ? fmtSec(Math.round(R.laps[i])) : s.dur ? fmtClock(s.dur * 1000) : "–"}</span></button>`).join("")}</div>`;
  const prog = `<div class="lv-xp" role="progressbar" aria-label="Run progress" aria-valuemin="0" aria-valuemax="${st.length}" aria-valuenow="${R.i}"><i style="width:${st.length ? Math.round(R.i / st.length * 100) : 0}%"></i></div>`;
  return { main: prog + main, next, list, state: `run|${R.i}|${!!R.pause}` };
}
function runLiveTick(k, p) {
  if (!RL || RL.k !== k) return; const cur = RL.steps[RL.i]; if (!cur) return;
  const el = (rlNow() - RL.t0) / 1000, c = document.getElementById("rlClock"), f = document.getElementById("rlFill");
  if (cur.dur) { const left = cur.dur - el; if (c) c.textContent = fmtClock(Math.max(0, left) * 1000); if (f) f.style.width = Math.min(100, el / cur.dur * 100) + "%";
    if (!RL.pause && left <= 3 && left > 0 && RL.cd !== Math.ceil(left)) { RL.cd = Math.ceil(left); try { navigator.vibrate && navigator.vibrate(40) } catch (e) {} }
    if (!RL.pause && left <= 0) rlGo(RL.i + 1) }
  else if (c) c.textContent = fmtClock(el * 1000);
}
document.addEventListener("click", e => {
  const t = e.target.closest("#rlSkip,#rlLap,#rlPause,[data-rljump],#lvRunDone"); if (!t || !RL) return;
  if (t.id === "rlSkip") { rlGo(RL.i + 1, true); return }
  if (t.id === "rlLap") { rlGo(RL.i + 1); return }
  if (t.id === "rlPause") { if (RL.pause) { RL.t0 += Date.now() - RL.pause; RL.pause = null } else RL.pause = Date.now(); rlSave(); renderLive(); return }
  if (t.dataset.rljump != null) { const i = +t.dataset.rljump; if (i !== RL.i) rlGo(i, true); return }
  if (t.id === "lvRunDone") rlFinish();       // runs before the app's own finish handler, which fills the time and opens the log
}, true);
function rlFinish() {
  const k = RL.k; if (RL.i < RL.steps.length && RL.steps[RL.i]) RL.laps[RL.i] = Math.round((rlNow() - RL.t0) / 100) / 10;
  const work = RL.steps.map((s, i) => ({ s, lap: RL.laps[i] })).filter(x => x.s.k === "work" && x.s.rep != null), done = work.filter(x => x.lap != null && x.lap > 2);
  if (work.length) { drafts[dkey(k, "rx-n")] = done.length; done.forEach((x, j) => { if (x.s.lap) drafts[dkey(k, "rx-r" + j)] = String(x.lap) }) }
  persistDrafts(); RL = null; rlSave();
}

/* ======================= Run coach (free, on the phone) =======================
   Reads the session check and comments on what matters for that kind of run, with numbers for next time.
   Easy/recovery: was it actually easy, aerobic decoupling, cadence. Long: finishing, even pacing, decoupling, fuel.
   Tempo: threshold pace, holding it steady, HR. Intervals/fartlek: even reps, first-rep discipline, recoveries,
   quality volume. Sprints/hills: speed kept, full recovery, rep length, grade. Time trial/race: pacing, goal,
   equivalent race times and training paces. */
const RIEGEL = (t, d1, d2) => t * Math.pow(d2 / d1, 1.06);
const pctTxt = x => `${Math.round(Math.abs(x) * 100)}%`;
const COACH_MEMO = {};
// training paces (min per mile) from the best recent time trial or race, else the race goal
function trainPaces(beforeK) {
  const key = beforeK + "|" + Object.keys(S.logs || {}).length; if (COACH_MEMO[key]) return COACH_MEMO[key];
  let best = null;
  Object.entries(S.logs || {}).forEach(([k, l]) => {
    if (!l || l.type !== "run" || k > beforeK || !(l.mi > 0.9) || !(l.min > 0) || l.est) return;
    if (parseYmd(beforeK) - parseYmd(k) > 150 * 864e5) return;
    const sp = (() => { try { return runSpec(l, l.plan) } catch (e) { return {} } })();
    if (!(l.race || sp.type === "tt" || sp.type === "race")) return;
    let t = l.min, d = l.mi; try { const c = runCheck(k, l); if (c && c.m && c.m.tt) { t = c.m.tt; d = c.m.goal } } catch (e) {}
    const t5 = RIEGEL(t, d, 3.107); if (!best || t5 < best.t5) best = { t5, k, d, t };
  });
  let src = best ? "best" : null;
  if (!best) { const R = activeRace(parseYmd(beforeK)); if (R && R.target > 0) { best = { t5: RIEGEL(R.target, R.dist, 3.107) }; src = "goal" } }
  if (!best) return COACH_MEMO[key] = null;
  const p5 = best.t5 / 3.107;
  return COACH_MEMO[key] = { src, p5, easy: [p5 * 1.3, p5 * 1.43], tempo: p5 * 1.07, interval: p5 * 0.985, t5: best.t5,
    eq: [["5K", 3.107], ["10K", 6.214], ["Half", 13.109], ["Marathon", 26.219]].map(([n, d]) => [n, RIEGEL(best.t5, 3.107, d)]) };
}
function lastSame(k, l, fn) { // the previous log of the same routine (or the same run type), with its check
  const rid = l.plan && l.plan.rid, type = (() => { try { return runSpec(l, l.plan).type } catch (e) { return null } })();
  const e = Object.entries(S.logs || {}).filter(([kk, x]) => kk < k && x && x.type === "run" && x !== l && ((rid && x.plan && x.plan.rid === rid) || (type && (() => { try { return runSpec(x, x.plan).type === type } catch (e2) { return false } })()))).sort().pop();
  if (!e) return null; let c = null; try { c = runCheck(e[0], e[1]) } catch (e3) {} return c && c.m ? { k: e[0], l: e[1], c } : null;
}
function runCoach(k, l, c) {
  if (!c) return null;
  const items = [], next = [], spec = c.spec || {}, m = c.m || {}, type = l.race ? "race" : spec.type || "easy", P = trainPaces(k);
  const good = (h, t) => items.push(["good", h, t]), watch = (h, t) => items.push(["watch", h, t]), fix = (h, t) => items.push(["fix", h, t]);
  const pc = x => paceTxt(x), range = (a, b) => `${pc(a)}–${pc(b)}`;
  const maxHr = Math.max(0, ...Object.values(S.logs || {}).map(x => (x && x.st && x.st.maxHr) || 0)) || null;

  if (c.manual) {
    if ((c.fmt === "reps" || c.fmt === "short") && c.reps) {
      const vs = c.reps.filter(r => r.top).map(r => r.top);
      if (vs.length >= 3) { const f = (avgOf(vs.slice(0, 2)) - avgOf(vs.slice(-2))) / avgOf(vs.slice(0, 2)); f > 0.06 ? fix("Reps faded", `Your last reps were ${pctTxt(f)} slower than the first. Start the first two a little easier so all of them land within about 3%.`) : good("Even reps", "Your rep times stayed close together, which is the main goal of this session.") }
      else watch("Add rep times", "Type in each rep's time next time and the coach can check how even they were.");
    } else if (l.hr && (type === "easy" || type === "recovery" || type === "long")) {
      l.hr > HR_HI + 3 ? fix("Too hard for an easy run", `Average heart rate ${l.hr} is above your easy ceiling of ${HR_HI}. Slow down or take walk breaks until it settles under ${HR_HI}.`) : good("Easy effort", `Average heart rate ${l.hr} sits in your easy zone. That's what builds your aerobic base.`);
    }
    if (!l.st) next.push("Import the run's GPX file for pacing, heart-rate drift and rep-by-rep detail.");
    return items.length || next.length ? { items, next } : null;
  }

  if (c.fmt === "steady") {
    const easyRun = type === "easy" || type === "recovery";
    if (m.hrIn) { m.hrIn.pctIn >= 70 ? good("Stayed in your zone", `${Math.round(m.hrIn.pctIn)}% of the run was in ${HR_LO}–${HR_HI} bpm.`) : fix("Drifted out of your zone", `Only ${Math.round(m.hrIn.pctIn)}% was in ${HR_LO}–${HR_HI} bpm. Walk as soon as you pass ${HR_HI} and jog again under ${HR_LO}.`) }
    else if (m.aboveEasy != null && type !== "long") {
      if (m.aboveEasy > 0.35) fix(type === "recovery" ? "Too hard for a recovery run" : "Easy day ran hard", `${pctTxt(m.aboveEasy)} of it was above ${HR_HI} bpm. Easy runs build your aerobic engine and let your hard days be hard; slow down 30–60 s per ${RU()} or walk the hills.`);
      else if (m.aboveEasy < 0.15) good("Kept it easy", `Only ${pctTxt(m.aboveEasy)} above ${HR_HI} bpm, so this counted as real easy running.`);
    } else if (P && m.pace && easyRun) {
      m.pace < P.easy[0] * 0.97 ? watch("Quicker than easy pace", `${pc(m.pace)} is faster than your easy range of ${range(P.easy[0], P.easy[1])}. Fine if you could talk in full sentences; otherwise ease off.`) : good("Right pace for easy", `${pc(m.pace)} is inside your easy range (${range(P.easy[0], P.easy[1])}).`);
    }
    if (type === "recovery" && m.pace) { const ls = lastSame(k, l) || null; const ez = Object.entries(S.logs).filter(([kk, x]) => kk < k && x.type === "run" && x.key === "tue" && x.mi > 0 && x.min > 0).slice(-4).map(([, x]) => x.min / x.mi);
      if (ez.length && m.pace < avgOf(ez) * 0.98) fix("Recovery should be your slowest run", `${pc(m.pace)} was quicker than your recent easy runs (${pc(avgOf(ez))}). Go slower; the point is blood flow, not fitness.`) }
    if (m.decoup != null && m.T > 25) {
      if (m.decoup < 5) good("Aerobic base looks solid", `Heart-rate drift was ${Math.round(m.decoup)}%. Under 5% means your aerobic fitness held for the whole run${type === "long" ? ", so you're ready to go a little longer" : ""}.`);
      else if (m.decoup <= 10) watch("Some heart-rate drift", `Your heart rate drifted ${Math.round(m.decoup)}% against your pace. Common in heat or when the run is near your current limit.`);
      else fix("Big heart-rate drift", `Drift of ${Math.round(m.decoup)}% says fatigue, heat or low fuel. Start slower, drink, and ${m.T > 70 ? "take carbs during the run" : "check you're sleeping and eating enough"}.`);
    }
    if (type === "long") {
      if (spec.v && m.D < spec.v * 0.9) fix("Stopped short", `You covered ${dTxt(m.D, 1)} of ${dTxt(spec.v)}. Next time start 15–30 s per ${RU()} slower so the distance is there at the end.`);
      if (m.p1 && m.p2) { const f = (m.p2 - m.p1) / m.p1; f > 0.05 ? fix("Faded in the second half", `The second half was ${pctTxt(f)} slower. Long runs should finish as strong as they start; begin 15–20 s per ${RU()} slower.`) : f < -0.01 ? good("Negative split", "You finished faster than you started, which is ideal long-run pacing.") : good("Even pacing", "Both halves were within a few percent of each other.") }
      if (m.T > 75) watch("Fuel for long runs", `At ${fmtMin(m.T)} you need fuel: about 30–60 g of carbs an hour from 30–45 min in, plus fluids to thirst. Practise it now so race day isn't the first time.`);
      if (spec.v && m.D >= spec.v * 0.95 && (m.decoup == null || m.decoup < 7)) next.push(`Next long run: ${dTxt(Math.round(Math.min(m.D * 1.1, m.D + 1) * 2) / 2)}, same easy effort.`);
      else next.push(`Repeat ${dTxt(spec.v || m.D)} next time and start slower until it feels controlled to the end.`);
    }
    if (m.cad && m.cad < 155) watch("Low cadence", `${m.cad} steps a minute. Shorter, quicker steps (aim for about ${Math.round(m.cad * 1.05)}) reduce impact and overstriding.`);
    if (easyRun) next.push(P ? `Next easy run: ${range(P.easy[0], P.easy[1])}, or whatever keeps your heart rate under ${HR_HI}.` : `Next easy run: keep your heart rate under ${HR_HI} and the pace conversational.`);
  }

  if (c.fmt === "tempo" && m.bp) {
    if (P) { const d = (m.bp - P.tempo) / P.tempo;
      d < -0.04 ? fix("Tempo ran too fast", `${pc(m.bp)} is quicker than your threshold pace of about ${pc(P.tempo)}. Tempo should feel comfortably hard; faster turns it into a race and costs recovery.`)
        : d > 0.06 ? watch("Easier than threshold", `${pc(m.bp)} is slower than your threshold pace of about ${pc(P.tempo)}. Fine on a hot or hilly day; otherwise push a little.`)
        : good("Right on threshold pace", `${pc(m.bp)} sits close to your threshold pace (${pc(P.tempo)}).`) }
    Math.abs(m.drift) <= 0.03 ? good("Held it steady", `Pace changed ${pctTxt(m.drift)} through the block. Even is the point of tempo work.`)
      : m.drift > 0.05 ? fix("Tempo faded", `You slowed ${pctTxt(m.drift)} through the block. Start 5–10 s per ${RU()} slower.`) : m.drift < -0.05 ? watch("Sped up a lot", `You finished ${pctTxt(m.drift)} faster than you started; the start was probably too cautious.`) : null;
    if (m.hr && maxHr) { const r = m.hr / maxHr; r > 0.93 ? fix("Heart rate too high for tempo", `About ${Math.round(r * 100)}% of your max. Threshold work usually sits around 85–90%.`) : r >= 0.82 ? good("Tempo heart rate", `About ${Math.round(r * 100)}% of your max, right for threshold work.`) : null }
    if (m.warmMin < 8) watch("Short warm-up", `Only ${Math.round(m.warmMin)} min before the hard part. 10–15 min easy plus a few strides makes the first minutes of tempo smoother.`);
    next.push(Math.abs(m.drift) <= 0.03 ? `Next tempo: ${m.L + 3} min at ${pc(P ? P.tempo : m.bp)}.` : `Next tempo: ${m.L} min again at ${pc(P ? P.tempo : m.bp * 1.01)}, aiming to hold it evenly.`);
  }

  if ((c.fmt === "reps" || c.fmt === "short") && m.sp && m.sp.length) {
    const short = c.fmt === "short", hills = type === "hills", first = m.sp[0], avg = avgOf(m.sp);
    if (!short) {
      m.sd <= 0.03 && m.fade <= 0.04 ? good("Even reps", `Your reps stayed within ${Math.max(1, Math.round(m.sd * 100))}% of each other. That's the skill this session trains.`)
        : m.fade > 0.08 ? fix("Reps faded", `The last reps were ${pctTxt(m.fade)} slower than the first. Run the first two at the pace you can hold for all of them.`)
        : watch("Some unevenness", `Rep pace varied ${Math.round(m.sd * 100)}%. Aim for every rep within about 3%.`);
      if (first > avg * 1.04 && m.sp.length >= 3) fix("First rep too fast", `Rep 1 was ${pctTxt(first / avg - 1)} faster than your average. A fast first rep is the most common reason later reps fade.`);
      if (P && type === "intervals") { const rp = paceOfV(avg), d = (rp - P.interval) / P.interval;
        d < -0.04 ? watch("Faster than interval pace", `Average ${pc(rp)} beat your interval pace (${pc(P.interval)}). Great if they stayed even; if not, slow down to it.`) : d > 0.06 ? watch("Slower than interval pace", `Average ${pc(rp)} vs. interval pace of ${pc(P.interval)}. Normal early on; it should come down as you get fitter.`) : good("On interval pace", `Average ${pc(rp)}, right around your interval pace (${pc(P.interval)}).`) }
      const workMin = m.dur.reduce((a, b) => a + b, 0) / 60;
      if (type === "intervals") workMin < 10 ? watch("Light on quality", `${Math.round(workMin)} min of hard running. Most interval sessions aim for 12–20 min in total.`) : workMin > 28 ? watch("A lot of hard running", `${Math.round(workMin)} min of reps is a big session. Make sure the next day is easy.`) : good("Good amount of work", `${Math.round(workMin)} min of hard running, a solid interval session.`);
      if (m.rests && m.rests.length) { const rr = avgOf(m.rests) / avgOf(m.dur); if (rr < 0.4 && m.fade > 0.05) fix("Recoveries too short", `Recoveries were ${Math.round(rr * 100)}% of the rep length and the reps faded. Try recoveries about half to equal to the rep time.`) }
      if (type === "fartlek") good("Speed play", "Fartlek is meant to be loose. The goal is a clear change of gear on each surge, then a relaxed float.");
      const ls = lastSame(k, l); if (ls && ls.c.m && ls.c.m.avgV && m.avgV) { const d = m.avgV / ls.c.m.avgV - 1; Math.abs(d) >= 0.015 && (d > 0 ? good("Faster than last time", `Average rep speed up ${pctTxt(d)} on the same session.`) : watch("Slower than last time", `Average rep speed down ${pctTxt(d)} on the same session. Check sleep, heat and how hard the days before were.`)) }
      next.push(m.fade <= 0.04 && m.sd <= 0.04 ? `Next time: ${m.done + 1} reps at the same pace and recovery.` : `Next time: the same ${m.done} reps, first two a touch slower, aiming for all within 3%.`);
    } else {
      m.fade <= 0.05 ? good("Speed held up", `Speed dropped only ${pctTxt(Math.max(0, m.fade))} from first to last. You kept every sprint high quality.`)
        : fix("Speed dropped off", `Your last sprints were ${pctTxt(m.fade)} slower. Sprint training only works at top speed; stop the set when you drop more than about 5–7% or rest longer.`);
      const repS = avgOf(m.dur); if (repS > 30) watch(hills ? "Long hill reps" : "Long sprints", `Reps averaged ${Math.round(repS)} s. True ${hills ? "hill sprints" : "sprints"} are 8–20 s; longer reps train speed endurance instead.`);
      if (m.rests && m.rests.length) { const ratio = avgOf(m.rests) / repS, need = hills ? 3 : 8;
        ratio < need && m.fade > 0.03 ? fix("Not enough rest", `You rested about ${Math.round(ratio)}× the sprint time. For full speed every rep, rest ${hills ? "3–6×" : "10–20×"} as long (${fmtSec(Math.round(repS * (hills ? 4 : 12)))} or more).`)
          : good("Full recoveries", `About ${Math.round(ratio)}× the sprint time, enough to sprint fresh each rep.`) }
      if (hills) { const gs = m.g.filter(x => x != null), dd = m.dist.filter(x => x > 0); if (gs.length && dd.length) { const grade = avgOf(gs) / avgOf(dd) * 100;
        grade < 3 ? watch("Shallow hill", `About ${Math.round(grade)}% grade. A 4–8% hill gives the strength benefit without wrecking form.`) : grade > 10 ? watch("Very steep hill", `About ${Math.round(grade)}%. Steep hills shorten your stride; a 4–8% grade lets you run with good form.`) : good("Good hill", `About ${Math.round(grade)}% grade, in the ideal range.`) } }
      const prevTop = Math.max(0, ...Object.entries(S.logs || {}).filter(([kk, x]) => kk < k && x.type === "run" && x.st && x.st.efforts).map(([, x]) => Math.max(0, ...x.st.efforts.map(e => e.vx || 0))));
      if (m.topV && prevTop && m.topV > prevTop * 1.01) good("New top speed", `${mph(m.topV)}, your fastest recorded.`);
      next.push(m.fade <= 0.05 ? `Next time: ${m.done + 1} reps with the same full recoveries.` : `Next time: ${Math.max(3, m.done - 1)} reps with longer walk-backs, and stop if you slow by more than 5%.`);
    }
  }

  if (c.fmt === "tt" && m.tt) {
    if (m.p1 && m.p2) { const d = (m.p2 - m.p1) / m.p1;
      d < -0.01 ? good("Negative split", "You ran the second half faster, the best way to race.")
        : d <= 0.02 ? good("Even pacing", `Halves within ${pctTxt(d)} of each other.`)
        : fix("Went out too fast", `The second half was ${pctTxt(d)} slower. Start about ${fmtMin(Math.abs(pU(m.p2 - m.p1)) / 2)} per ${RU()} slower than you think you can hold.`) }
    const eq = [["5K", 3.107], ["10K", 6.214], ["Half", 13.109], ["Marathon", 26.219]].filter(([, d]) => Math.abs(d - m.goal) / m.goal > 0.05).map(([n, d]) => `${n} ${fmtMin(RIEGEL(m.tt, m.goal, d))}`);
    if (eq.length) good("What this predicts", `${eq.join(" · ")} (on matching training).`);
    const p5 = RIEGEL(m.tt, m.goal, 3.107) / 3.107;
    next.push(`Training paces from this: easy ${range(p5 * 1.3, p5 * 1.43)}, tempo ${pc(p5 * 1.07)}, intervals ${pc(p5 * 0.985)}.`);
  }

  if (!items.length && !next.length) return null;
  return { items: items.filter(Boolean).slice(0, 5), next, P };
}
function runCoachHtml(k, l, c) {
  const r = runCoach(k, l, c); if (!r) return "";
  const ic = { good: "✓", watch: "!", fix: "↻" };
  return `<div class="rc-coach"><div class="eyebrow">Coach notes · ${esc(({ steady: "what matters on this run", tempo: "tempo", reps: "intervals", short: "speed work", tt: "time trial" })[c.fmt] || "this run")}</div>
    ${r.items.map(([t, h, x]) => `<div class="rcc-i ${t}"><span class="rcc-ic" aria-hidden="true">${ic[t]}</span><div><b>${esc(h)}</b><span>${esc(x)}</span></div></div>`).join("")}
    ${r.next.length ? `<div class="rcc-next"><b>Next time</b>${r.next.map(x => `<span>${esc(x)}</span>`).join("")}</div>` : ""}</div>`;
}
