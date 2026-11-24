/* Rowing: the first cardio type besides running (rowing machine).
 * su.rows: the user's rows [{id, name, kind, ...}]  ·  su.week[i] === "row" with su.rowWeek[i] = row id
 * Kinds: steady (minutes), int (pieces × metres with rest), long (metres), test (metres, all-out).
 * Pace is the split: seconds per 500 m. A row log: {type:"row", kind, pieces:[{m, sec, spm}], m, sec}.
 * Each kind has its own island: The River, The Rapids, The Long Canal, The Regatta.
 * Loaded after runs.js; world.js, ranks.js and custom.js call in here when a day is a row. */
const ROW_KINDS = {
  steady: { n: "Steady row", img: "row1", tag: "STEADY ROW", make: () => ({ min: 30, split: 140, grow: true }) },
  int: { n: "Row intervals", img: "row2", tag: "ROW INTERVALS", make: () => ({ reps: 8, m: 500, rest: 90, split: 115 }) },
  long: { n: "Long row", img: "row3", tag: "LONG ROW", make: () => ({ m: 5000, split: 145 }) },
  test: { n: "Row test (2k)", img: "row4", tag: "ROW TEST", make: () => ({ m: 2000 }) }
};
const ROW_META = {
  row1: { line: "THE RIVER RUNS", title: "THE RIVER", btn: "ROW THE RIVER", sub: "A slow river through the reeds to the lit boathouse.", done: "RIVER" },
  row2: { line: "THE RAPIDS ROAR", title: "THE RAPIDS", btn: "SHOOT THE RAPIDS", sub: "White water in short bursts. Drive hard through each gate, rest in the pools between.", done: "RAPIDS" },
  row3: { line: "THE CANAL OPENS", title: "THE LONG CANAL", btn: "ROW TO THE LIGHT", sub: "One straight canal to the lighthouse at the far end. Settle in and hold one rhythm.", done: "CANAL" },
  row4: { line: "THE REGATTA IS CALLED", title: "THE REGATTA", btn: "TAKE YOUR LANE", sub: "Four lanes, one race against your best.", done: "REGATTA" }
};
const ROW_DEFAULTS = () => [["row_steady", "steady"], ["row_int", "int"], ["row_long", "long"], ["row_test", "test"]].map(([id, k]) => ({ id, name: ROW_KINDS[k].n, kind: k, ...ROW_KINDS[k].make() }));
let ROWSCHED = Array(7).fill(null);

const rowSplitTxt = s => { if (!(s > 0)) return "–"; const m = Math.floor(s / 60), x = s - m * 60; return `${m}:${x.toFixed(1).padStart(4, "0")}`.replace(/\.0$/, "") };
const rowClock = s => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return h ? `${h}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}` : `${m}:${String(x).padStart(2, "0")}` };
const rowM = m => `${Math.round(m).toLocaleString("en-US")} m`;
function suRows() { const su = CUSTOM && CUSTOM.su; return su && Array.isArray(su.rows) && su.rows.length ? su.rows : ROW_DEFAULTS() }
function rowById(id) { return suRows().find(r => r.id === id) || null }
function rowsEnsure(su) { if (!Array.isArray(su.rows) || !su.rows.length) su.rows = ROW_DEFAULTS(); su.rowWeek = su.rowWeek || Array(7).fill(null) }
function rowBest(kind, m) { // fastest logged time for this distance (whole row or a single piece)
  let b = null; Object.entries(S.logs || {}).forEach(([k, l]) => { if (!l || l.type !== "row") return; (l.pieces || []).forEach(p => { if (Math.abs(p.m - m) <= m * 0.01 && p.sec > 0 && (!b || p.sec < b.sec)) b = { sec: p.sec, k } }) });
  return b }
// this week's version of a row: steady rows grow 2 min a week (to 60), with a lighter week every 4th
function rowThisWeek(r, w) { const x = { ...r };
  if (r.kind === "steady" && r.grow) { const n = Math.max(0, w - (r.w0 || w)); x.min = Math.min(60, r.min + 2 * n); if (w % 4 === 0 && n > 0) x.min = Math.max(r.min, x.min - 6) }
  return x }
function rowDesc(r) {
  const sp = r.split ? `about ${rowSplitTxt(r.split)} /500 m` : "";
  if (r.kind === "steady") return `${r.min} min · easy${sp ? ", " + sp : ""}. You can talk the whole way.`;
  if (r.kind === "int") return `${r.reps} × ${r.by === "time" ? rowClock(r.sec) : rowM(r.m)}, ${rowClock(r.rest)} rest · hard${sp ? ", " + sp : ""}`;
  if (r.kind === "long") return `${rowM(r.m)} · steady${sp ? ", " + sp : ""}`;
  const b = rowBest("test", r.m); return `${rowM(r.m)} all-out${b ? ` · your best ${rowClock(b.sec)}` : " · sets your Rowing speed"}`;
}
function rowPlanFor(r, d, w) { const x = rowThisWeek(r, w); return { type: "row", rowId: r.id, kind: r.kind, name: r.name, t: r.name, d: rowDesc(x), min: x.min, m: x.m, reps: x.reps, rest: x.rest, split: x.split, by: x.by || "m", sec: x.sec } }
function scheduledRow(i, d, w) { const id = ROWSCHED[i] || (CUSTOM && (CUSTOM.su.rowWeek || [])[i]); const r = id && rowById(id); return r ? rowPlanFor(r, d, w) : rowPlanFor(ROW_DEFAULTS()[0], d, w) }
// the plan's total distance (or minutes) for the island card
function rowStats(p) {
  if (p.kind === "steady") return [`${p.min} MIN`, ROW_KINDS.steady.tag, p.split ? `~${rowSplitTxt(p.split)} /500M` : ""];
  if (p.kind === "int") return [`${p.reps} × ${p.by === "time" ? rowClock(p.sec) : p.m + " M"}`, "INTERVALS", p.split ? `~${rowSplitTxt(p.split)} /500M` : ""];
  if (p.kind === "long") return [`${(p.m || 0).toLocaleString("en-US")} M`, ROW_KINDS.long.tag, p.split ? `~${rowSplitTxt(p.split)} /500M` : ""];
  const b = rowBest("test", p.m); return [`${(p.m || 0).toLocaleString("en-US")} M`, ROW_KINDS.test.tag, b ? `BEST ${rowClock(b.sec)}` : "FIRST TEST"];
}

/* ---------- schedule + plan editor ---------- */
function schedOptsRows(v, wr) { const rs = suRows(), cur = v === "row" ? "row:" + (wr || "") : "";
  return `<optgroup label="Rows">${rs.map(r => `<option value="row:${esc(r.id)}" ${cur === "row:" + r.id ? "selected" : ""}>${esc(r.name)}</option>`).join("")}<option value="rownew">New row…</option></optgroup>` }
function rowsEditor() {
  const su = CUSTOM.su, rs = suRows(), w = weekOf(today);
  const where = id => (su.rowWeek || []).map((x, i) => x === id && su.week[i] === "row" ? DOW[i] : null).filter(Boolean);
  let h = `<div class="card" id="rowsCard"><h2>Rows</h2><p class="small muted">For a rowing machine. Pace is your split: time per 500 m. Put rows on any day in the schedule above. Steady rows grow a little each week.</p></div>`;
  rs.forEach(r => { const on = where(r.id), x = rowThisWeek(r, w);
    h += `<div class="card routine rowr"><div class="row between" style="gap:8px"><div style="min-width:0"><div class="eyebrow" style="color:var(--row)">${esc(ROW_KINDS[r.kind].n)} · ${on.length ? on.join(", ") : "not scheduled"}</div><h2>${esc(r.name)}</h2></div><button type="button" class="btn ghost sm" data-row-edit="${esc(r.id)}">Edit</button></div>
      <div class="small"><span class="muted">This week:</span> ${esc(rowDesc(x))}</div><div class="small muted">${r.kind === "steady" && r.grow ? "Auto · grows 2 min a week" : r.kind === "int" ? "Live: the timer counts each piece and rest" : r.kind === "test" ? "Add it to a day when you want to test" : "Live: tap when your monitor hits the distance"}</div></div>` });
  return h + `<div class="card"><button type="button" class="btn ghost" data-row-new="1">+ New row</button></div>`;
}
function rowSheetHtml() {
  if (SH.kind === "rowedit") return rowEditHtml();
  if (SH.kind === "rowlog") return rowLogHtml();
  if (SH.kind === "rowrep") return rowRepHtml();
  return "";
}
function rowEditHtml() {
  const d = SH.d, num = (f, lab, step, unit) => `<div class="field"><label>${lab}</label><div class="row" style="gap:6px;align-items:center"><input class="setnum" inputmode="decimal" data-row-f="${f}" value="${esc(d[f] ?? "")}" style="max-width:110px"><span class="small muted">${unit || ""}</span></div></div>`;
  const splitF = `<div class="field"><label>Target split (/500 m)</label><input class="setnum" data-row-f="splitT" value="${esc(d.split ? rowSplitTxt(d.split) : "")}" placeholder="2:20" style="max-width:110px"></div>`;
  let f = "";
  if (d.kind === "steady") f = num("min", "Minutes", 1, "min") + splitF + `<label class="row" style="gap:8px;align-items:center;margin-top:6px"><input type="checkbox" data-row-f="grow" ${d.grow ? "checked" : ""}> <span class="small">Grow 2 min a week (up to 60)</span></label>`;
  else if (d.kind === "int") f = `<div class="field"><label>Pieces by</label><div class="xs-chips">${[["m", "Distance"], ["time", "Time"]].map(([v, n]) => `<button type="button" class="${(d.by || "m") === v ? "on" : ""}" data-row-by="${v}">${n}</button>`).join("")}</div></div>`
    + num("reps", "Pieces", 1) + (d.by === "time" ? num("secT", "Each piece", 15, "min:sec") : num("m", "Each piece", 50, "m")) + num("rest", "Rest", 15, "sec") + splitF;
  else if (d.kind === "long") f = num("m", "Distance", 500, "m") + splitF;
  else f = `<div class="field"><label>Test distance</label><div class="xs-chips">${[500, 2000, 5000].map(m => `<button type="button" class="${d.m === m ? "on" : ""}" data-row-tm="${m}">${m.toLocaleString("en-US")} m</button>`).join("")}</div></div>`;
  return `<div class="xs-head"><h2>${SH.isNew ? "New row" : "Edit row"}</h2><button type="button" class="btn ghost sm" data-xs="close">Cancel</button></div>
    <div class="field"><label>Name</label><input class="xs-search" data-row-f="name" value="${esc(d.name)}" maxlength="40"></div>
    <div class="field"><label>Type</label><div class="xs-chips">${Object.entries(ROW_KINDS).map(([k, K]) => `<button type="button" class="${d.kind === k ? "on" : ""}" data-row-kind="${k}">${esc(K.n.replace(" (2k)", ""))}</button>`).join("")}</div></div>
    <div class="rowf">${f}</div>
    <button type="button" class="btn" style="width:100%;margin-top:10px" data-row-save="1">Save</button>
    ${SH.isNew ? "" : `<button type="button" class="btn ghost" style="width:100%;margin-top:8px" data-row-del="1">Delete this row</button>`}`;
}
// past days and "log it by hand": distance, time, stroke rate
function rowLogHtml() { const d = SH.d;
  return `<div class="xs-head"><h2>Log ${esc(SH.name || "row")}</h2><button type="button" class="btn ghost sm" data-xs="close">Cancel</button></div>
    <p class="small muted">${esc(fmtDate(parseYmd(SH.k)))}. From your rowing machine's monitor.</p>
    <div class="row" style="gap:10px"><div class="field" style="flex:1"><label>Distance</label><input class="xs-search" inputmode="numeric" data-rowlog="m" value="${esc(d.m || "")}" placeholder="5000"><span class="small muted">metres</span></div>
    <div class="field" style="flex:1"><label>Time</label><input class="xs-search" data-rowlog="t" value="${esc(d.t || "")}" placeholder="22:30"><span class="small muted">min:sec</span></div></div>
    <div class="field"><label>Stroke rate (optional)</label><input class="xs-search" inputmode="numeric" data-rowlog="spm" value="${esc(d.spm || "")}" placeholder="24" style="max-width:120px"></div>
    <p class="small muted rowlog-split">${rowLogSplit(d)}</p>
    <button type="button" class="btn" style="width:100%" data-rowlog-save="1">Save</button>` }
function rowLogSplit(d) { const m = Number(d.m), s = rowParseTime(d.t); return m > 0 && s > 0 ? `Average split ${rowSplitTxt(s / (m / 500))} /500 m` : "" }
function rowParseTime(t) { const s = String(t || "").trim(); if (!s) return null; const p = s.split(":").map(Number); if (p.some(isNaN)) return null; return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p.length === 2 ? p[0] * 60 + p[1] : p[0] * 60 }
function rowRepHtml() { const l = S.logs[SH.k]; if (!l) return "";
  const P = l.plan || {}, img = ROW_KINDS[l.kind || P.kind] ? ROW_KINDS[l.kind || P.kind].img : "row1", M = ROW_META[img], pcs = l.pieces || [];
  const avg = l.m > 0 && l.sec > 0 ? l.sec / (l.m / 500) : 0, best = pcs.length > 1 ? pcs.reduce((a, p) => p.sec / p.m < a.sec / a.m ? p : a) : null;
  return `<div class="xs-head"><h2>${esc(M.title.replace(/^THE /, "The ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase()))}</h2><button type="button" class="btn ghost sm" data-xs="close">Done</button></div>
    <div class="hx"><div class="hx-sys">[SYSTEM] ${M.done} CLEARED · ${esc(fmtDate(parseYmd(SH.k)).toUpperCase())}</div>
    <div class="hx-vs"><div><span class="hx-cap">Distance</span><b>${rowM(l.m)}</b><em>${rowClock(l.sec)}</em></div><div class="best"><span class="hx-cap" style="color:#9FD3EE">Average split</span><b>${rowSplitTxt(avg)}</b><em>/500 m${l.spm ? ` · ${l.spm} spm` : ""}</em></div></div>
    ${pcs.length > 1 ? `<div><div class="hx-cap" style="margin-bottom:2px">Pieces</div><div class="hx-ses">${pcs.map((p, i) => `<div class="hx-s"><div class="h"><b>PIECE ${i + 1}</b>${p === best ? `<span class="hx-pr">BEST</span>` : ""}</div><div class="hx-chips"><span class="${p === best ? "top" : ""}">${rowM(p.m)} · ${rowClock(p.sec)}</span><span>${rowSplitTxt(p.sec / (p.m / 500))} /500 m</span>${p.spm ? `<span>${p.spm} spm</span>` : ""}</div></div>`).join("")}</div></div>` : ""}
    <button type="button" class="btn ghost" style="width:100%" data-rowlog-edit="${SH.k}">Edit</button></div>` }

/* ---------- live rowing ---------- */
// RW = {k, plan, i (piece index), ph: "row"|"rest"|"enter"|"done", t0 (phase start ms), pieces:[{m,sec,spm}], draft:{split|m, spm}, paused}
let RW = null, rwTimer = 0;
function rwSave() { try { localStorage.setItem("rowlive", RW ? JSON.stringify(RW) : "") } catch (_) { } }
function rwLoad() { if (RW) return RW; try { const x = JSON.parse(localStorage.getItem("rowlive") || "null"); if (x && x.k === ymd(today)) RW = x } catch (_) { } return RW }
function rwPieces(p) { return p.kind === "int" ? p.reps : 1 }
function rwSec(p) { return p.kind === "steady" ? p.min * 60 : p.kind === "int" && p.by === "time" ? p.sec : null }  // a timed piece: its length in seconds
function rwTimed(p) { return rwSec(p) != null }        // the piece is a time, not a distance
function rwPieceM(p) { return p.kind === "int" ? p.m : p.m }
function rowStart(k) { const p = planFor(parseYmd(k)); if (!p || p.type !== "row") return;
  if (typeof unlockAudio === "function") unlockAudio(); if (typeof keepAwake === "function") keepAwake(true);
  if (!rwLoad() || RW.k !== k) RW = { k, plan: p, i: 0, ph: "row", t0: Date.now(), pieces: [], draft: {} };
  rwSave(); rowLiveOpen() }
function rowLiveOpen() { let el = document.getElementById("rowlive"); if (!el) { el = document.createElement("div"); el.id = "rowlive"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); document.body.appendChild(el) }
  el.hidden = false; document.body.classList.add("rl-open"); rwPaint(); clearInterval(rwTimer); rwTimer = setInterval(rwTick, 250) }
function rowLiveClose() { const el = document.getElementById("rowlive"); if (el) el.hidden = true; document.body.classList.remove("rl-open"); clearInterval(rwTimer); lastRenderKey = ""; render() }
function rwElapsed() { return RW.paused ? (RW.paused - RW.t0) / 1000 : (Date.now() - RW.t0) / 1000 }
function rwTick() { if (!RW) return; const p = RW.plan, e = rwElapsed();
  if (RW.ph === "row" && rwTimed(p) && e >= rwSec(p)) { rwEndTimed(); return }
  if (RW.ph === "rest" && e >= (p.rest || 60) && !RW.beeped) { RW.beeped = 1; if (typeof beep === "function") beep() }
  const t = document.getElementById("rlT"); if (t) t.textContent = rwClockTxt(); const ring = document.getElementById("rlRing"); if (ring) ring.setAttribute("stroke-dashoffset", rwRingOff());
  const c = document.getElementById("rlChip"); if (c) c.textContent = rwChipTxt() }
function rwClockTxt() { const p = RW.plan, e = rwElapsed();
  if (RW.ph === "rest") return rowClock(Math.max(0, (p.rest || 60) - e));
  if (RW.ph === "row" && rwTimed(p)) return rowClock(Math.max(0, rwSec(p) - e));
  return rowClock(e) }
function rwFrac() { const p = RW.plan, e = rwElapsed();
  if (RW.ph === "rest") return Math.min(1, e / (p.rest || 60));
  if (RW.ph === "row" && rwTimed(p)) return Math.min(1, e / rwSec(p));
  if (RW.ph === "row" && p.split) return Math.min(1, e / (p.split * rwPieceM(p) / 500));
  return 0 }
const RW_C = 2 * Math.PI * 86;
function rwRingOff() { return (RW_C * (1 - rwFrac())).toFixed(1) }
function rwChipTxt() { const p = RW.plan, n = rwPieces(p), tot = RW.pieces.reduce((t, x) => t + x.sec, 0) + (RW.ph === "row" ? rwElapsed() : 0);
  if (RW.ph === "rest") return `Rest · piece ${RW.i + 1} next · ${rowClock(tot)}`;
  return n > 1 ? `Piece ${Math.min(RW.i + 1, n)} of ${n} · ${rowClock(tot)}` : `${rowClock(tot)}` }
function rwPaint() { const el = document.getElementById("rowlive"); if (!el || !RW) return;
  const p = RW.plan, img = ROW_KINDS[p.kind].img, M = ROW_META[img], n = rwPieces(p), pm = rwPieceM(p), last = RW.pieces[RW.pieces.length - 1];
  const sys = RW.ph === "done" ? `${M.done[0] + M.done.slice(1).toLowerCase()} cleared. Save it to your log.` : RW.ph === "rest" ? `Piece ${RW.i} cleared. Rest, then piece ${RW.i + 1}.` : RW.ph === "enter" ? (rwTimed(p) ? "Time. Enter the distance from your monitor." : `Piece ${RW.i + 1} done. Enter your split from the monitor.`)
    : rwTimed(p) && n === 1 ? `${p.min} min steady${p.split ? `. Hold about ${rowSplitTxt(p.split)} /500 m` : ""}.` : rwTimed(p) ? `Piece ${RW.i + 1}: ${rowClock(rwSec(p))} hard${p.split ? `. Hold ${rowSplitTxt(p.split)} /500 m` : ""}.` : `${n > 1 ? `Piece ${RW.i + 1}: ` : ""}${rowM(pm)}${p.kind === "test" ? " all-out" : p.kind === "int" ? " hard" : ""}${p.split ? `. Hold ${rowSplitTxt(p.split)} /500 m` : ""}.`;
  const col = n > 1 ? `<div class="rl-col">${Array.from({ length: n }, (_, i) => { const d = RW.pieces[i]; return `<div class="rl-pc${d ? " done" : ""}${i === RW.i && RW.ph !== "done" ? " on" : ""}">${i + 1}${d ? `<small>${rowSplitTxt(d.sec / (d.m / 500))}</small>` : ""}</div>` }).join("")}</div>` : "";
  const ph = RW.ph === "rest" ? "REST" : RW.ph === "row" ? "ROW" : RW.ph === "enter" ? "ENTER" : "CLEARED";
  const sub = RW.ph === "rest" ? `until piece ${RW.i + 1}` : RW.ph === "row" ? (rwTimed(p) ? (n > 1 ? "left in this piece" : "left") : p.split ? `target ${rowClock(p.split * pm / 500)}` : "rowing") : "";
  const ringCol = RW.ph === "rest" ? "#CFE9F7" : "#4FB3E8";
  const tags = [p.split ? `TARGET <b>${rowSplitTxt(p.split)} /500M</b>` : "", last ? `LAST <b>${rowSplitTxt(last.sec / (last.m / 500))}</b>` : (p.kind === "test" && rowBest("test", p.m) ? `BEST <b>${rowClock(rowBest("test", p.m).sec)}</b>` : "")].filter(Boolean);
  const card = RW.ph === "done" ? rwDoneCard() : `<div class="rl-ph">${ph}</div><div class="rl-ring"><svg viewBox="0 0 190 190" aria-hidden="true"><circle cx="95" cy="95" r="86" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="9"/><circle id="rlRing" cx="95" cy="95" r="86" fill="none" stroke="${ringCol}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${RW_C.toFixed(1)}" stroke-dashoffset="${rwRingOff()}" transform="rotate(-90 95 95)"/></svg><div class="c"><div class="big" id="rlT" aria-live="off">${rwClockTxt()}</div><div class="sub">${sub}</div></div></div>
    ${tags.length ? `<div class="rl-tg">${tags.map(t => `<span>${t}</span>`).join("")}</div>` : ""}
    ${RW.ph === "row" && !rwTimed(p) ? `<p class="rl-note">Row until your monitor shows ${rowM(pm)}, then tap below.${n > 1 ? " The rest timer starts on its own." : ""}</p>` : ""}
    ${n > 1 ? `<div class="rl-waves">${Array.from({ length: n }, (_, i) => `<i class="${i < RW.pieces.length ? "d" : i === RW.i ? "o" : ""}"></i>`).join("")}</div>` : ""}`;
  // bottom: buttons and the split / distance entry
  let foot = "";
  const ent = RW.ph === "enter" || (RW.ph === "rest" && RW.draft && RW.draft.pending);
  if (ent) { const tm = rwTimed(p), d = RW.draft, pn = RW.ph === "rest" ? RW.i : RW.i + 1, lab = tm ? (n > 1 ? `PIECE ${pn} · METRES` : "DISTANCE") : `PIECE ${pn} · SPLIT /500 M`;
    if (tm && n > 1 && p.split && d.m > 0) d.split = +((d.sec || rwSec(p)) / (d.m / 500)).toFixed(1);
    const cmp = (!tm || n > 1) && p.split && d.split ? (d.split <= p.split ? `<div class="rl-cmp"><b>BEAT</b><span>${(p.split - d.split).toFixed(1)} s faster than target.</span></div>` : `<div class="rl-cmp slow"><b>MISS</b><span>${(d.split - p.split).toFixed(1)} s slower than target.</span></div>`) : "";
    foot += `<div class="rl-in"><div class="fl"><label>${lab}</label><div class="rl-step on"><button type="button" data-rl-adj="${tm ? "m|-10" : "split|-0.5"}" aria-label="Less">−</button><input id="rlVal" inputmode="decimal" value="${tm ? d.m : rowSplitTxt(d.split)}" aria-label="${lab}"><button type="button" data-rl-adj="${tm ? "m|10" : "split|0.5"}" aria-label="More">+</button></div></div>
      <div class="fl sm"><label>SPM</label><div class="rl-step"><button type="button" data-rl-adj="spm|-1" aria-label="Lower stroke rate">−</button><b id="rlSpm">${d.spm || 24}</b><button type="button" data-rl-adj="spm|1" aria-label="Higher stroke rate">+</button></div></div></div>${cmp}`;
  }
  if (RW.ph === "row") foot += `<button type="button" class="rl-go${rwTimed(p) ? " ghost" : ""}" data-rl="done">${rwTimed(p) ? (n > 1 ? "END PIECE EARLY" : "END EARLY") : n > 1 ? "PIECE DONE" : "FINISHED"}</button>${rwTimed(p) ? `<p class="rl-mini">The timer ends ${n > 1 ? "each piece" : "the row"} on its own${n > 1 ? " and starts the rest" : ""}.</p>` : ""}`;
  else if (RW.ph === "enter") foot += `<button type="button" class="rl-go" data-rl="confirm">${RW.i + 1 >= n ? "SAVE PIECE" : "SAVE · START REST"}</button>`;
  else if (RW.ph === "rest") foot += `<div class="rl-row2"><button type="button" class="rl-go ghost" data-rl="next">SKIP REST</button><button type="button" class="rl-go" data-rl="next">START PIECE ${RW.i + 1}</button></div>`;
  else foot += `<button type="button" class="rl-go" data-rl="save">SAVE TO LOG</button>`;
  el.innerHTML = `<div class="rl-top"><button type="button" class="rl-c" data-rl="min" aria-label="Minimise">⌄</button><div class="rl-mid"><div class="t">${M.title}</div><div class="rl-chip"><button type="button" data-rl="pause" aria-label="${RW.paused ? "Resume" : "Pause"}">${RW.paused ? "▶" : "❚❚"}</button><span id="rlChip">${rwChipTxt()}</span></div></div><button type="button" class="rl-c" data-rl="menu" aria-label="More">•••</button></div>
    ${RW.menu ? `<div class="rl-menu"><button type="button" data-rl="handlog">Log it by hand instead</button><button type="button" data-rl="quit">End without saving</button><button type="button" data-rl="menu">Close</button></div>` : ""}
    <div class="rl-sys"><b>SYSTEM</b><span>${esc(sys)}</span></div>
    <div class="rl-wrap">${col}<div class="rl-main"><div class="rl-lab"><b>${n > 1 && RW.ph !== "done" ? `PIECE ${Math.min(RW.i + 1, n)} · ${rwTimed(p) ? rowClock(rwSec(p)) : rowM(pm).toUpperCase()}` : esc(p.name.toUpperCase())}</b><span>${RW.ph === "rest" ? "Resting" : RW.ph === "row" ? "Rowing" : ""}</span></div><div class="rl-card">${card}</div></div></div>
    <div class="rl-foot">${foot}</div>`;
}
function rwDoneCard() { const m = RW.pieces.reduce((t, x) => t + x.m, 0), s = RW.pieces.reduce((t, x) => t + x.sec, 0);
  return `<div class="rl-ph">CLEARED</div><div class="rl-sum"><div><span>DISTANCE</span><b>${rowM(m)}</b></div><div><span>TIME</span><b>${rowClock(s)}</b></div><div><span>SPLIT</span><b>${rowSplitTxt(s / (m / 500))}</b></div></div>
    ${RW.pieces.length > 1 ? `<div class="rl-tg">${RW.pieces.map((x, i) => `<span>${i + 1} <b>${rowSplitTxt(x.sec / (x.m / 500))}</b></span>`).join("")}</div>` : ""}` }
function rwEndTimed() { const p = RW.plan, e = Math.min(rwElapsed(), rwSec(p)), n = rwPieces(p), guess = Math.round(e / (p.split || 140) * 500 / 10) * 10;
  RW.draft = { m: guess, sec: Math.round(e), spm: RW.draft.spm || (n > 1 ? 28 : 22) };
  if (n > 1 && RW.i + 1 < n) { RW.pieces[RW.i] = { m: guess, sec: Math.round(e), spm: RW.draft.spm }; RW.i++; RW.ph = "rest"; RW.t0 = Date.now(); RW.draft.pending = true }
  else RW.ph = "enter";
  if (typeof beep === "function") beep(); rwSave(); rwPaint() }
function rwConfirm() { const p = RW.plan, d = RW.draft, tm = rwTimed(p), n = rwPieces(p);
  const v = document.getElementById("rlVal"); if (v) { if (tm) d.m = Math.max(0, Math.round(Number(v.value) || 0)); else { const s = rowParseSplit(v.value); if (s) d.split = s } }
  const pm = rwPieceM(p), piece = tm ? { m: d.m, sec: d.sec || Math.round(Math.min(rwElapsed(), rwSec(p))), spm: d.spm } : { m: pm, sec: +(d.split * pm / 500).toFixed(1), spm: d.spm };
  if (!(piece.m > 0 && piece.sec > 0)) { toast(tm ? "Enter the distance from your monitor" : "Enter your split"); return }
  RW.pieces[RW.i] = piece; RW.i++; RW.draft = { spm: d.spm };
  if (RW.i >= n) RW.ph = "done";
  rwSave(); rwPaint() }
function rowParseSplit(s) { s = String(s || "").trim(); const m = s.match(/^(\d+):(\d+(?:\.\d+)?)$/); if (m) return +m[1] * 60 + +m[2]; const n = Number(s); return n > 0 ? (n < 10 ? n * 60 : n) : null }
function rowSaveLog(k, pieces, plan) { const m = pieces.reduce((t, x) => t + x.m, 0), sec = +pieces.reduce((t, x) => t + x.sec, 0).toFixed(1), spms = pieces.map(x => x.spm).filter(Boolean);
  const l = { type: "row", kind: plan.kind, pieces, m, sec, ...(spms.length ? { spm: Math.round(spms.reduce((a, b) => a + b, 0) / spms.length) } : {}), plan, savedAt: Date.now() };
  saveLog(k, l); if (typeof RK_CACHE !== "undefined") RK_CACHE.sig = "" }
document.addEventListener("click", e => {
  const t = e.target.closest("[data-rl],[data-rl-adj],[data-row-by],[data-row-edit],[data-row-new],[data-row-kind],[data-row-tm],[data-row-save],[data-row-del],[data-rowlog-save],[data-rowlog-edit],[data-wsrow],[data-wsrowlog],[data-wsrowrep]"); if (!t) return;
  const d = t.dataset;
  if (d.wsrow) { rowStart(d.wsrow); return }
  if (d.wsrowlog) { const p = planFor(parseYmd(d.wsrowlog)); openSheet({ kind: "rowlog", k: d.wsrowlog, name: p && p.name, plan: p, d: {} }); return }
  if (d.wsrowrep) { openSheet({ kind: "rowrep", k: d.wsrowrep, ws: true }); return }
  if (d.rowlogEdit) { const l = S.logs[d.rowlogEdit]; openSheet({ kind: "rowlog", k: d.rowlogEdit, name: l.plan && l.plan.name, plan: l.plan, d: { m: l.m, t: rowClock(l.sec), spm: l.spm || "" }, edit: true }); return }
  if (d.rowlogSave) { const D = SH.d, m = Math.round(Number(D.m)), s = rowParseTime(D.t); if (!(m > 0 && s > 0)) { toast("Enter the distance and time"); return }
    const old = S.logs[SH.k], keep = SH.edit && old && old.pieces && old.pieces.length > 1 && old.m === m ? old.pieces : null;
    rowSaveLog(SH.k, keep || [{ m, sec: s, ...(Number(D.spm) > 0 ? { spm: Math.round(Number(D.spm)) } : {}) }], SH.plan || (old && old.plan) || planFor(parseYmd(SH.k)));
    xsClose(); lastRenderKey = ""; render(); toast("Row saved"); return }
  if (d.rowEdit || d.rowNew) { const r = d.rowEdit ? rowById(d.rowEdit) : null; openSheet({ kind: "rowedit", id: r ? r.id : null, isNew: !r, day: d.rowNew && d.rowNew !== "1" ? +d.rowNew : null, d: r ? { ...r, ...(r.sec ? { secT: rowClock(r.sec) } : {}) } : { name: ROW_KINDS.steady.n, kind: "steady", ...ROW_KINDS.steady.make() } }); return }
  if (d.rowKind && SH) { const nm = SH.d.name, wasDef = Object.values(ROW_KINDS).some(K => K.n === nm); SH.d = { ...ROW_KINDS[d.rowKind].make(), name: wasDef ? ROW_KINDS[d.rowKind].n : nm, kind: d.rowKind }; paintSheet(); return }
  if (d.rowBy && SH) { SH.d.by = d.rowBy; if (d.rowBy === "time" && !SH.d.sec) { SH.d.sec = 60; SH.d.secT = "1:00" } paintSheet(); return }
  if (d.rowTm && SH) { SH.d.m = +d.rowTm; SH.d.name = SH.d.name === ROW_KINDS.test.n || /^Row test/.test(SH.d.name) ? `Row test (${+d.rowTm >= 1000 ? +d.rowTm / 1000 + "k" : d.rowTm + " m"})` : SH.d.name; paintSheet(); return }
  if (d.rowSave && SH) { const x = SH.d; ["min", "reps", "m", "rest"].forEach(f => { if (x[f] != null) x[f] = Math.max(1, Math.round(Number(x[f]) || 0)) });
    if (x.secT != null) { const v = rowParseTime(String(x.secT).includes(":") ? x.secT : "0:" + x.secT); if (v > 0) x.sec = Math.round(v); delete x.secT }
    if (x.kind === "int" && x.by === "time" && !(x.sec > 0)) x.sec = 60;
    if (x.splitT != null) { const s = rowParseSplit(x.splitT); if (s) x.split = s; else if (!String(x.splitT).trim()) delete x.split; delete x.splitT }
    x.name = String(x.name || "").trim().slice(0, 40) || ROW_KINDS[x.kind].n;
    const id = SH.id || "row_" + Date.now().toString(36), day = SH.day;
    suMut(su => { rowsEnsure(su); const i = su.rows.findIndex(r => r.id === id); const row = { ...x, id, ...(x.grow && !x.w0 ? { w0: weekOf(today) } : {}) }; if (i >= 0) su.rows[i] = row; else su.rows.push(row);
      if (day != null) { su.week[day] = "row"; su.rowWeek[day] = id } });
    xsClose(); toast("Row saved"); return }
  if (d.rowDel && SH) { const id = SH.id; suMut(su => { rowsEnsure(su); su.rows = su.rows.filter(r => r.id !== id); (su.rowWeek || []).forEach((x, i) => { if (x === id) { su.rowWeek[i] = null; su.week[i] = "rest" } }); if (!su.rows.length) su.rows = ROW_DEFAULTS() }); xsClose(); toast("Row deleted"); return }
  if (!RW) return;
  if (d.rlAdj) { const [f, s] = d.rlAdj.split("|"), D = RW.draft, v = document.getElementById("rlVal");
    if (f === "spm") { D.spm = Math.max(10, Math.min(50, (D.spm || 24) + +s)); const b = document.getElementById("rlSpm"); if (b) b.textContent = D.spm }
    else if (f === "m") { D.m = Math.max(0, (Number(v && v.value) || D.m || 0) + +s); if (v) v.value = D.m; if (rwPieces(RW.plan) > 1) { rwSave(); rwPaint() } }
    else { D.split = Math.max(60, +(((v && rowParseSplit(v.value)) || D.split || 120) + +s).toFixed(1)); if (v) v.value = rowSplitTxt(D.split); rwSave(); rwPaint() }
    rwSave(); return }
  const a = d.rl, p = RW.plan;
  if (a === "min") { rowLiveClose(); return }
  if (a === "menu") { RW.menu = !RW.menu; rwPaint(); return }
  if (a === "pause") { if (RW.paused) { RW.t0 += Date.now() - RW.paused; RW.paused = 0 } else RW.paused = Date.now(); rwSave(); rwPaint(); return }
  if (a === "quit") { RW = null; rwSave(); if (typeof keepAwake === "function") keepAwake(false); rowLiveClose(); return }
  if (a === "handlog") { const k = RW.k, pl = RW.plan; RW = null; rwSave(); rowLiveClose(); openSheet({ kind: "rowlog", k, name: pl.name, plan: pl, d: {} }); return }
  if (a === "done") { const e = rwElapsed(), pm = rwPieceM(p);
    if (rwTimed(p)) { rwEndTimed(); return }
    else { RW.draft = { split: +(e / (pm / 500)).toFixed(1), spm: RW.draft.spm || (p.kind === "int" ? 28 : 24) };
      if (rwPieces(p) > 1 && RW.i + 1 < rwPieces(p)) { // log the split during the rest
        const piece = { m: pm, sec: +e.toFixed(1), spm: RW.draft.spm }; RW.pieces[RW.i] = piece; RW.i++; RW.ph = "rest"; RW.t0 = Date.now(); RW.draft.pending = true }
      else RW.ph = "enter" }
    if (typeof beep === "function") beep(); rwSave(); rwPaint(); return }
  if (a === "confirm") { rwConfirm(); return }
  if (a === "next") { // leaving the rest: keep any split typed for the piece just rowed
    if (RW.draft && RW.draft.pending) { const v = document.getElementById("rlVal"), last = RW.pieces[RW.i - 1]; if (rwTimed(p)) { const m = Math.round(Number(v && v.value)); if (m > 0 && last) last.m = m } else { const s = v && rowParseSplit(v.value); if (s && last) last.sec = +(s * last.m / 500).toFixed(1) } if (last) last.spm = RW.draft.spm }
    RW.ph = "row"; RW.t0 = Date.now(); RW.beeped = 0; RW.draft = { spm: RW.draft.spm }; rwSave(); rwPaint(); return }
  if (a === "save") { const k = RW.k; rowSaveLog(k, RW.pieces, RW.plan); const M = ROW_META[ROW_KINDS[RW.plan.kind].img]; RW = null; rwSave(); if (typeof keepAwake === "function") keepAwake(false); rowLiveClose(); toast(`${M.title.replace(/^THE /, "The ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())} cleared`); return }
});
document.addEventListener("input", e => { const t = e.target;
  if (t.dataset && t.dataset.rowF && SH && SH.kind === "rowedit") { SH.d[t.dataset.rowF] = t.type === "checkbox" ? t.checked : t.value; return }
  if (t.dataset && t.dataset.rowlog && SH && SH.kind === "rowlog") { SH.d[t.dataset.rowlog] = t.value; const s = document.querySelector("#xsheet .rowlog-split"); if (s) s.textContent = rowLogSplit(SH.d); return }
  if (t.id === "rlVal" && RW) { if (rwTimed(RW.plan)) RW.draft.m = Math.round(Number(t.value) || 0); else { const s = rowParseSplit(t.value); if (s) RW.draft.split = s } rwSave() } });
document.addEventListener("change", e => { const t = e.target; if (t.dataset && t.dataset.rowF && t.type === "checkbox" && SH) SH.d[t.dataset.rowF] = t.checked });
(function () { if (document.getElementById("rowCss")) return; const st = document.createElement("style"); st.id = "rowCss"; st.textContent = `
:root{--row:#4FB3E8}
.ws-head.ws-row{--wc:#7CCBF2}
.ws.ws-row{--wc:#4FB3E8;--wd:rgba(79,179,232,.75);--wg:rgba(79,179,232,.3);--wt1:#CFE9F7;--wt2:#7CCBF2;--wt3:#2C6F9A;--wb1:#7CCBF2;--wb2:#2C8FC8;--wbi:#061018}
.ws.ws-row .ws-stats span{border-color:rgba(79,179,232,.45);color:#CFE9F7}
#rowlive{position:fixed;inset:0;z-index:850;background:radial-gradient(120% 60% at 50% 0%,#0F2A3A 0%,#0A0D12 55%),#0A0D12;color:#F5F1E6;font-family:Barlow,sans-serif;display:flex;flex-direction:column;padding:env(safe-area-inset-top,0px) max(14px,env(safe-area-inset-right,0px)) env(safe-area-inset-bottom,0px) max(14px,env(safe-area-inset-left,0px));overflow:auto}
#rowlive[hidden]{display:none}
body.rl-open{overflow:hidden}
#rowlive .rl-top{display:flex;align-items:center;justify-content:space-between;padding-top:12px}
#rowlive .rl-c{width:38px;height:38px;border-radius:50%;border:1px solid rgba(245,241,230,.14);background:none;color:#F5F1E6;font-size:15px;cursor:pointer}
#rowlive .rl-mid{text-align:center}#rowlive .rl-mid .t{font:800 11px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.32em;color:#C9D6E2}
#rowlive .rl-chip{display:inline-flex;gap:8px;align-items:center;margin-top:8px;padding:5px 12px 5px 6px;border-radius:20px;border:1.5px solid #D9B26A;background:rgba(217,178,106,.12);font:600 12.5px Barlow,sans-serif}
#rowlive .rl-chip button{width:22px;height:22px;border-radius:50%;border:1.5px solid #D9B26A;background:none;color:#F5F1E6;font-size:8px;cursor:pointer}
#rowlive .rl-menu{display:flex;flex-direction:column;gap:6px;margin:10px 0 0}#rowlive .rl-menu button{padding:11px;border-radius:12px;border:1px solid rgba(245,241,230,.14);background:rgba(255,255,255,.04);color:#F5F1E6;font:600 14px Barlow,sans-serif;cursor:pointer}
#rowlive .rl-sys{margin-top:12px;border:1px solid rgba(245,241,230,.14);border-radius:12px;padding:10px 12px;display:flex;gap:12px;align-items:center;background:rgba(255,255,255,.025);font-size:13px}
#rowlive .rl-sys b{font:800 10px "Barlow Semi Condensed",sans-serif;letter-spacing:.28em;color:#C9D6E2}
#rowlive .rl-wrap{display:flex;gap:12px;margin-top:12px}
#rowlive .rl-col{width:50px;display:flex;flex-direction:column-reverse;gap:6px;flex-shrink:0}
#rowlive .rl-pc{min-height:40px;border-radius:8px;border:1px solid rgba(245,241,230,.14);display:flex;flex-direction:column;align-items:center;justify-content:center;font:800 13px "Barlow Semi Condensed",sans-serif;color:#5E6675}
#rowlive .rl-pc small{font:600 9.5px Barlow,sans-serif;color:#9FD3EE}
#rowlive .rl-pc.done{color:#4FB3E8;border-color:rgba(79,179,232,.35);background:rgba(79,179,232,.06)}
#rowlive .rl-pc.on{border:1.5px solid #CFE9F7;color:#F5F1E6;background:rgba(79,179,232,.16);box-shadow:0 0 14px rgba(79,179,232,.35)}
#rowlive .rl-main{flex:1;min-width:0}
#rowlive .rl-lab{display:flex;justify-content:space-between;font:800 10.5px "Barlow Semi Condensed",sans-serif;letter-spacing:.24em;color:#C9D6E2;margin:2px 0 8px}#rowlive .rl-lab span{font:500 12px Barlow,sans-serif;letter-spacing:0;color:#8F97A6}
#rowlive .rl-card{border:1.5px solid rgba(207,233,247,.35);border-radius:22px;padding:14px;background:linear-gradient(180deg,rgba(79,179,232,.08),rgba(0,0,0,.25));text-align:center}
#rowlive .rl-ph{font:800 11px "Barlow Semi Condensed",sans-serif;letter-spacing:.3em;color:#9FD3EE}
#rowlive .rl-ring{width:190px;max-width:100%;aspect-ratio:1;margin:8px auto 0;position:relative}#rowlive .rl-ring svg{position:absolute;inset:0;width:100%;height:100%}
#rowlive .rl-ring .c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
#rowlive .big{font:800 50px/1 "Barlow Semi Condensed",sans-serif;font-variant-numeric:tabular-nums}#rowlive .sub{font:600 12px Barlow,sans-serif;color:#8F97A6;margin-top:4px}
#rowlive .rl-tg{display:flex;justify-content:center;gap:8px;margin-top:10px;flex-wrap:wrap}#rowlive .rl-tg span{border:1px solid rgba(245,241,230,.14);border-radius:8px;padding:5px 8px;font:700 11px "Barlow Semi Condensed",sans-serif;letter-spacing:.08em;color:#C9D6E2}#rowlive .rl-tg b{color:#F5F1E6}
#rowlive .rl-note{font-size:12.5px;color:#C9D6E2;margin:10px 4px 0;line-height:1.35}
#rowlive .rl-waves{display:flex;justify-content:center;gap:6px;margin-top:10px}#rowlive .rl-waves i{width:22px;height:4px;border-radius:2px;background:rgba(255,255,255,.12)}#rowlive .rl-waves i.d{background:#4FB3E8}#rowlive .rl-waves i.o{background:#CFE9F7}
#rowlive .rl-sum{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}#rowlive .rl-sum span{display:block;font:800 10px "Barlow Semi Condensed",sans-serif;letter-spacing:.2em;color:#8F97A6}#rowlive .rl-sum b{font:800 22px "Barlow Semi Condensed",sans-serif}
#rowlive .rl-foot{margin-top:auto;padding:14px 0 14px}
#rowlive .rl-in{display:flex;gap:10px;align-items:flex-end;margin-bottom:10px}#rowlive .rl-in .fl{flex:1;min-width:0}#rowlive .rl-in .fl.sm{flex:.7}
#rowlive .rl-in label{display:block;font:800 10.5px "Barlow Semi Condensed",sans-serif;letter-spacing:.2em;color:#C9D6E2;margin-bottom:6px}
#rowlive .rl-step{display:flex;align-items:center;justify-content:space-between;gap:4px;border:1.5px solid rgba(245,241,230,.14);border-radius:14px;padding:6px}
#rowlive .rl-step.on{border-color:#CFE9F7;box-shadow:0 0 0 3px rgba(79,179,232,.15)}
#rowlive .rl-step button{width:38px;height:38px;flex-shrink:0;border-radius:10px;border:0;background:rgba(255,255,255,.07);color:#C9D6E2;font-size:20px;cursor:pointer}
#rowlive .rl-step input,#rowlive .rl-step b{flex:1;min-width:0;width:100%;text-align:center;background:none;border:0;color:#F5F1E6;font:800 24px "Barlow Semi Condensed",sans-serif}
#rowlive .rl-cmp{border:1px solid rgba(87,201,138,.35);background:rgba(87,201,138,.08);border-radius:12px;padding:9px 12px;font-size:12.5px;margin-bottom:10px;display:flex;gap:10px;align-items:center}#rowlive .rl-cmp b{font:800 10px "Barlow Semi Condensed",sans-serif;letter-spacing:.24em;color:#57C98A}
#rowlive .rl-cmp.slow{border-color:rgba(232,194,122,.35);background:rgba(232,194,122,.08)}#rowlive .rl-cmp.slow b{color:#E8C27A}
#rowlive .rl-go{width:100%;height:58px;border:0;font:800 16px "Barlow Semi Condensed",sans-serif;letter-spacing:.24em;color:#061018;background:linear-gradient(180deg,#7CCBF2,#2C8FC8);clip-path:polygon(4% 0,96% 0,100% 50%,96% 100%,4% 100%,0 50%);cursor:pointer}
#rowlive .rl-go.ghost{background:none;color:#F5F1E6;border:1.5px dashed rgba(245,241,230,.45);clip-path:none;border-radius:14px}
#rowlive .rl-row2{display:flex;gap:10px}#rowlive .rl-row2 .rl-go{flex:1;font-size:14px;letter-spacing:.14em}#rowlive .rl-row2 .ghost{flex:.8}
#rowlive .rl-mini{font:600 11.5px Barlow,sans-serif;color:#8F97A6;text-align:center;margin:8px 0 0}
`; document.head.appendChild(st) })();
