/* Plan: its own tab. WEEK sets the template week (seven days, each Strength, Cardio, Rest or uncharted);
 * WORKOUTS is the library where people make and edit their own gym routines, runs and rows.
 * Data is the same setup as before: su.week[i] = routine id | "run" | "row" | "rest" | "none" (uncharted),
 * with su.runWeek / su.rowWeek holding which run or row. Editing writes through suMut like the old editor.
 * Loaded after rows.js and world.js. */
const PL = { seg: "week", filter: "all", pop: null, edit: null, open: -1, end: {}, del: "" };
const PL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const PL_TPL = () => [["ppl3", 0], ["ppl3", 1], ["ppl3", 2], ["ul4", 0], ["ul4", 1], ["abc3", 0]].map(([k, i]) => ({ ...SPLITS[k].routines[i], name: SPLITS[k].routines[i].name.replace(/ A$/, "") }));
const plSu = () => CUSTOM && CUSTOM.su;
const plTower = id => (typeof WS_TOWERS !== "undefined" ? WS_TOWERS[wsHash(String(id)) % WS_TOWERS.length][0] : "tw1");
const plTrail = r => { const t = r && r.type && WS_TRAILS[r.type] ? r.type : r && r.type === "steady" ? "easy" : r && r.type === "tt" ? "tempo" : "easy"; return (WS_TRAILS[t] || WS_TRAILS.easy)[0][0] };
const plImg = k => `world/${k}.webp`;
function plDay(i) { // what's on weekday i
  const su = plSu(), w = su.week[i];
  if (!w || w === "none") return { kind: "none" };
  if (w === "rest") return { kind: "rest", img: "camp1", n: "Rest", s: "Recover" };
  if (w === "run") { const r = runById((su.runWeek || [])[i]); const p = r ? runPlanFor(r, today) : null; return { kind: "run", id: r && r.id, img: plTrail(r), n: r ? r.name : "Run", s: p ? plD(p.d).split(" · ")[0] : "" } }
  if (w === "row") { const r = rowById((su.rowWeek || [])[i]); return { kind: "row", id: r && r.id, img: r ? ROW_KINDS[r.kind].img : "row1", n: r ? r.name : "Row", s: r ? rowStats(rowThisWeek(r, weekOf(today))).filter(Boolean).slice(0, 1).join("").toLowerCase().replace(/ m\b/, " m") : "" } }
  const r = routineById(w); if (!r) return { kind: "none" };
  return { kind: "gym", id: r.id, img: plTower(r.id), n: r.name, s: `${r.ex.length} exercise${r.ex.length === 1 ? "" : "s"} · ~${estMin(r.ex.map(toPlanEx))} min` };
}
const PL_COL = { gym: "var(--pl-gym)", run: "var(--pl-run)", row: "var(--pl-row)", rest: "var(--pl-rest)", none: "var(--pl-gold)" };
function plDaysOf(kind, id) { const su = plSu(); return su.week.map((w, i) => (kind === "gym" ? w === id : kind === "run" ? w === "run" && (su.runWeek || [])[i] === id : w === "row" && (su.rowWeek || [])[i] === id) ? i : -1).filter(i => i >= 0) }
function plSetDay(i, v) { // v: routine id | "run:<id>" | "row:<id>" | "rest" | "none"
  suMut(su => { su.runWeek = su.runWeek || Array(7).fill(null); su.rowWeek = su.rowWeek || Array(7).fill(null); su.runWeek[i] = null; su.rowWeek[i] = null;
    if (/^run:/.test(v)) { su.week[i] = "run"; su.runWeek[i] = v.slice(4) } else if (/^row:/.test(v)) { rowsEnsure(su); su.week[i] = "row"; su.rowWeek[i] = v.slice(4) } else su.week[i] = v }) }
function plSwap(a, b) { if (a === b) return; suMut(su => { ["week", "runWeek", "rowWeek"].forEach(k => { if (!su[k]) su[k] = Array(7).fill(k === "week" ? "rest" : null); const x = su[k][a]; su[k][a] = su[k][b]; su[k][b] = x }) }) }

const plD = t => descU(String(t || "")).replace(/NaN (mi|km) · /, "").replace(/^NaN (mi|km)$/, "");
/* ---------- page ---------- */
function planTop() {
  const su = plSu(), n = (su.routines || []).length + suRuns().length + (Array.isArray(su.rows) ? su.rows.length : 0);
  return `<div class="pl-top"><div><div class="pl-eye">RANKUP · PLAN</div><h1 class="pl-h1">Plan</h1><div class="pl-subt">${PL.seg === "week" ? "Your template week · repeats every week" : "Your workouts · tap one to edit"}</div></div><span class="pl-chipb">${PL.seg === "week" ? "EVERY WEEK" : `${n} WORKOUT${n === 1 ? "" : "S"}`}</span></div>`;
}
function viewPlanX() {
  if (!CUSTOM) return `<div class="card"><p>Set up your plan first.</p></div>`;
  if (PL.edit) return plEditor();
  const su = plSu(), n = (su.routines || []).length + suRuns().length + (Array.isArray(su.rows) ? su.rows.length : 0);
  let h = `<div class="pl-seg" role="tablist"><button type="button" role="tab" class="${PL.seg === "week" ? "on" : ""}" aria-selected="${PL.seg === "week"}" data-pl-seg="week">WEEK</button><button type="button" role="tab" class="${PL.seg === "workouts" ? "on" : ""}" aria-selected="${PL.seg === "workouts"}" data-pl-seg="workouts">WORKOUTS<i>${n}</i></button></div>`;
  h += PL.seg === "week" ? plWeek() : plLib();
  if (PL.pop) h += plPop();
  return `<div class="pl">${h}</div>`;
}
function plWeek() {
  const days = [0, 1, 2, 3, 4, 5, 6].map(plDay);
  let h = `<div class="pl-list" id="plList">` + days.map((d, i) => d.kind === "none"
    ? `<button type="button" class="pl-row empty${PL.pop && PL.pop.day === i ? " sel" : ""}" data-pl-day="${i}" style="--c:${PL_COL.none}"><span class="pl-dw">${DOW[i].toUpperCase()}</span><span class="pl-plot">+</span><span class="pl-t"><b class="pl-unch">UNCHARTED</b><span>Tap to claim this day</span></span></button>`
    : `<div class="pl-row${PL.pop && PL.pop.day === i ? " sel" : ""}" data-pl-row="${i}" style="--c:${PL_COL[d.kind]}"><button type="button" class="pl-hit" data-pl-day="${i}" aria-label="${PL_DAYS[i]}: ${esc(d.n)}. Change"></button><span class="pl-dw">${DOW[i].toUpperCase()}</span><img src="${plImg(d.img)}" alt=""><span class="pl-t"><b>${esc(d.kind === "gym" ? d.n.toUpperCase() + " GATE" : d.n.toUpperCase())}</b><span>${esc(d.s)}</span></span><span class="pl-grip" data-pl-grip="${i}" aria-label="Drag to move ${PL_DAYS[i]}" role="button" tabindex="0">⋮⋮</span></div>`).join("") + `</div>`;
  // week check: counts and a couple of warnings
  const c = { gym: 0, run: 0, row: 0, rest: 0, none: 0 }; days.forEach(d => c[d.kind]++);
  const warn = []; let run = 0, best = 0, bs = 0, st = 0;
  days.forEach((d, i) => { if (d.kind === "gym" || d.kind === "run" || d.kind === "row") { if (!run) st = i; run++; if (run > best) { best = run; bs = st } } else run = 0 });
  if (!c.rest && !c.none) warn.push("No rest day. Your body grows on the days off.");
  else if (best >= 5) warn.push(`${best} training days in a row (${DOW[bs]} to ${DOW[bs + best - 1]}). Think about a rest day in between.`);
  days.forEach((d, i) => { const e = days[i + 1]; if (e && d.kind === "gym" && e.kind === "gym" && d.id === e.id) warn.push(`${d.n} on ${DOW[i]} and ${DOW[i + 1]}, back to back. The same muscles need a day off.`) });
  h += `<div class="pl-check"><div class="pl-k"><span>WEEK CHECK</span><span>${c.none ? `${c.none} DAY${c.none > 1 ? "S" : ""} UNCHARTED` : "WEEK CHARTED"}</span></div><div class="pl-pills">
    <span style="--c:var(--pl-gym)"><i></i>${c.gym} STRENGTH</span><span style="--c:var(--pl-run)"><i></i>${c.run} RUN</span><span style="--c:var(--pl-row)"><i></i>${c.row} ROW</span><span style="--c:var(--pl-rest)"><i></i>${c.rest} REST</span></div>
    ${warn.slice(0, 2).map(w => `<div class="pl-warn">⚠ <span>${esc(w)}</span></div>`).join("")}</div>`;
  return h;
}
function plLib() {
  const su = plSu(), F = PL.filter, strip = (kind, id) => { const on = plDaysOf(kind, id); return `<span class="pl-dy" aria-label="${on.length ? "On " + on.map(i => DOW[i]).join(", ") : "Not on your week"}">${"MTWTFSS".split("").map((x, i) => `<i class="${on.includes(i) ? "on" : ""}">${x}</i>`).join("")}</span>` };
  const card = (kind, id, img, n, s) => `<button type="button" class="pl-wk" style="--c:${PL_COL[kind]}" data-pl-edit="${kind}|${esc(id)}"><img src="${plImg(img)}" alt=""><span class="pl-t"><b>${esc(n)}</b><span>${esc(s)}</span></span>${strip(kind, id)}</button>`;
  const rs = su.routines || [], runs = suRuns(), rows = Array.isArray(su.rows) && su.rows.length ? su.rows : [];
  let h = `<div class="pl-fchips">${[["all", "ALL"], ["gym", "STRENGTH"], ["run", "RUNNING"], ["row", "ROWING"]].map(([v, n]) => `<button type="button" class="${F === v ? "on" : ""}" data-pl-filter="${v}">${n}</button>`).join("")}</div><div class="pl-lib">`;
  if (F === "all" || F === "gym") h += `<div class="pl-lsec" style="--c:var(--pl-gym)"><span>STRENGTH · ${rs.length}</span><button type="button" data-pl-new="gym">+ NEW</button></div>` + (rs.length ? rs.map(r => card("gym", r.id, plTower(r.id), r.name, `${r.ex.length} exercise${r.ex.length === 1 ? "" : "s"} · ~${estMin(r.ex.map(toPlanEx))} min`)).join("") : `<p class="pl-none">No gym workouts yet.</p>`);
  if (F === "all" || F === "run") h += `<div class="pl-lsec" style="--c:var(--pl-run)"><span>RUNNING · ${runs.length}</span><button type="button" data-pl-new="run">+ NEW</button></div>` + (runs.length ? runs.map(r => { const p = runPlanFor(r, today); return card("run", r.id, plTrail(r), r.name, p ? plD(p.d).split(" · ").slice(0, 2).join(" · ") : "") }).join("") : `<p class="pl-none">No runs yet.</p>`);
  if (F === "all" || F === "row") h += `<div class="pl-lsec" style="--c:var(--pl-row)"><span>ROWING · ${rows.length}</span><button type="button" data-pl-new="row">+ NEW</button></div>` + (rows.length ? rows.map(r => card("row", r.id, ROW_KINDS[r.kind].img, r.name, rowDesc(rowThisWeek(r, weekOf(today))).split(" · ")[0])).join("") : `<p class="pl-none">No rows yet.</p>`);
  return h + `</div>`;
}

/* ---------- claim-a-day popup (island-popup style) ---------- */
function plPop() {
  const P = PL.pop, i = P.day, dn = i == null ? "" : PL_DAYS[i].toUpperCase(), su = plSu();
  const crumb = (...xs) => [i == null ? "NEW" : "CLAIM · " + dn, ...xs].map((x, k, a) => k === a.length - 1 ? `<b>${x}</b>` : x).join(" › ");
  const row = o => `<button type="button" class="pl-prow${o.big ? " big" : ""}${o.lock ? " lock" : ""}${o.pk ? " pk" : ""}" style="--c:${o.c || "#AEB6C2"}" ${o.attr || ""}${o.lock ? " disabled" : ""}><span class="pl-dia"></span>${o.img ? `<img src="${plImg(o.img)}" alt="">` : ""}<span class="pl-t">${o.e ? `<span class="pl-te">${o.e}</span>` : ""}<b>${esc(o.n)}</b><span>${esc(o.m || "")}</span></span>${o.tag ? `<span class="pl-tag${o.free ? " free" : ""}">${o.tag}</span>` : ""}${o.chev ? `<span class="pl-chev">›</span>` : ""}</button>`;
  const onTag = (kind, id) => { const on = plDaysOf(kind, id); return on.length ? { tag: "ON " + on.map(x => DOW[x].toUpperCase()).join(" "), pk: i != null && on.includes(i) } : { tag: "UNUSED", free: 1 } };
  let eye = "", title = "", sub = "", tot = null, sec = null, body = "", back = P.step !== "pick" && i != null || (i == null && P.step !== P.root);
  if (P.step === "pick") {
    eye = crumb(); title = PL_DAYS[i].toUpperCase(); sub = "What happens on this day, every week?"; sec = ["CHOOSE ONE", "3"];
    body = row({ big: 1, img: "tw5", e: "GATE", n: "STRENGTH", m: "One of your gym workouts, or forge a new one.", c: "var(--pl-gym)", chev: 1, attr: `data-pl-step="str"` })
      + row({ big: 1, img: "road1", e: "TRAIL · RIVER", n: "CARDIO", m: "Running or rowing: easy, long, intervals and more.", c: "var(--pl-run)", chev: 1, attr: `data-pl-step="cardio"` })
      + row({ big: 1, img: "camp1", e: "CAMP", n: "REST", m: "Recover. Your Daily Seals still count.", c: "var(--pl-rest)", chev: 1, attr: `data-pl-set="rest"` })
      + (plDay(i).kind !== "none" ? `<button type="button" class="pl-clear" data-pl-set="none">Leave ${PL_DAYS[i]} uncharted</button>` : "");
  } else if (P.step === "str") {
    const rs = su.routines || [], used = rs.filter(r => plDaysOf("gym", r.id).length).length;
    eye = crumb("STRENGTH"); title = "STRENGTH"; sub = i == null ? "Pick a workout to edit." : `Pick a workout for ${PL_DAYS[i]}.`;
    if (!rs.length) { P.step = "forge"; return plPop() }
    tot = [[rs.length, "WORKOUTS"], [used, "ON THE WEEK"], [rs.length - used, "UNUSED"]]; sec = ["YOUR WORKOUTS", rs.length];
    body = rs.map(r => row({ img: plTower(r.id), n: r.name, m: `${r.ex.length} exercises · ~${estMin(r.ex.map(toPlanEx))} min`, c: "var(--pl-gym)", ...onTag("gym", r.id), attr: `data-pl-set="${esc(r.id)}"` })).join("")
      + `<button type="button" class="pl-padd" data-pl-step="forge"><b>+ FORGE A NEW WORKOUT</b><span>FROM SCRATCH OR A TEMPLATE</span></button>`;
  } else if (P.step === "forge") {
    eye = crumb("STRENGTH", "FORGE"); title = (su.routines || []).length ? "FORGE A WORKOUT" : "NO WORKOUTS YET"; sub = "Start from a template or from scratch. You can change everything after."; sec = ["START FROM A TEMPLATE", PL_TPL().length];
    body = PL_TPL().map((t, k) => row({ img: plTower(t.name), n: t.name, m: t.ex.slice(0, 4).map(e => (libEx(e.id) || { name: e.id }).name.replace(/ \(.*\)$/, "")).join(", ") + (t.ex.length > 4 ? "…" : ""), c: "var(--pl-gym)", chev: 1, attr: `data-pl-forge="${k}"` })).join("")
      + `<button type="button" class="pl-padd" data-pl-forge="new"><b>+ FORGE FROM SCRATCH</b><span>NAME IT, THEN ADD EXERCISES</span></button>`;
  } else if (P.step === "cardio") {
    eye = crumb("CARDIO"); title = "CARDIO"; sub = "Each type has its own places to train."; sec = ["CARDIO TYPES", "4"];
    body = row({ big: 1, img: "lab1", e: `TRAILS · ${RUN_ORDER.length} TYPES`, n: "RUNNING", m: "Easy, long, intervals, tempo, hills, fartlek and more.", c: "var(--pl-run)", chev: 1, attr: `data-pl-step="run"` })
      + row({ big: 1, img: "row1", e: "RIVERS · 4 TYPES", n: "ROWING", m: "Steady, intervals, long row, 2k test.", c: "var(--pl-row)", chev: 1, attr: `data-pl-step="row"` })
      + row({ img: "road3", n: "Cycling", m: "Bike and spin.", tag: "LATER", lock: 1 }) + row({ img: "rec1", n: "Swimming", m: "Pool sessions.", tag: "LATER", lock: 1 });
  } else if (P.step === "run") {
    const rs = suRuns(); eye = crumb("CARDIO", "RUNNING"); title = "RUNNING"; sub = i == null ? "Pick a type to make a new run." : "Your runs, or a new one by type.";
    if (rs.length && i != null) body += `<div class="pl-pobj"><span>YOUR RUNS</span><span>${rs.length}</span></div>` + rs.map(r => row({ img: plTrail(r), n: r.name, m: plD((runPlanFor(r, today) || { d: "" }).d), c: "var(--pl-run)", ...onTag("run", r.id), attr: `data-pl-set="run:${esc(r.id)}"` })).join("");
    body += `<div class="pl-pobj"><span>NEW RUN FROM A TYPE</span><span>${RUN_ORDER.length}</span></div>` + RUN_ORDER.map(t => { const T = RUN_TYPES[t], r = { id: "x", name: T.n, type: t, ...T.make() }; return row({ img: plTrail(r), n: T.n, m: descU(runDesc(r, { main: r.main }, today)), c: "var(--pl-run)", chev: 1, attr: `data-pl-newrun="${t}"` }) }).join("");
  } else if (P.step === "row") {
    const rs = Array.isArray(su.rows) ? su.rows : []; eye = crumb("CARDIO", "ROWING"); title = "ROWING"; sub = i == null ? "Pick a type to make a new row." : "Your rows, or a new one by type.";
    if (rs.length && i != null) body += `<div class="pl-pobj"><span>YOUR ROWS</span><span>${rs.length}</span></div>` + rs.map(r => row({ img: ROW_KINDS[r.kind].img, n: r.name, m: rowDesc(rowThisWeek(r, weekOf(today))), c: "var(--pl-row)", ...onTag("row", r.id), attr: `data-pl-set="row:${esc(r.id)}"` })).join("");
    body += `<div class="pl-pobj"><span>NEW ROW FROM A TYPE</span><span>4</span></div>` + Object.entries(ROW_KINDS).map(([k, K]) => row({ img: K.img, n: K.n, m: rowDesc({ kind: k, ...K.make() }), c: "var(--pl-row)", chev: 1, attr: `data-pl-newrow="${k}"` })).join("");
  }
  return `<div class="pl-pop" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="pl-dim" data-pl-close="1"></div><div class="pl-pcard"><div class="pl-pin">
    <div class="pl-phead"><div class="pl-peye">${eye}</div><div class="pl-pbtns">${back ? `<button type="button" class="pl-pback" data-pl-back="1">‹ BACK</button>` : ""}<button type="button" class="pl-px" data-pl-close="1" aria-label="Close">✕</button></div></div>
    <div class="pl-ptitle">${title}</div><div class="pl-psub">${sub}</div>
    ${tot ? `<div class="pl-ptot">${tot.map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join("")}</div>` : ""}
    ${sec ? `<div class="pl-pobj"><span>${sec[0]}</span><span>${sec[1]}</span></div>` : ""}
    <div class="pl-plist">${body}</div></div></div><div class="pl-pfoot" data-pl-close="1">TAP OUTSIDE TO CLOSE</div></div>`;
}

/* ---------- editors ---------- */
function plEditor() {
  const E = PL.edit;
  if (E.kind === "gym") return plGymEd(routineById(E.id));
  if (E.kind === "run") return plRunEd(runById(E.id));
  return plRowEd(rowById(E.id));
}
function plEdTop(label) { return `<div class="pl-edtop"><button type="button" class="pl-cbtn" data-pl-done="1">‹ PLAN</button><span class="pl-edlab">${label}</span><button type="button" class="pl-cbtn gold" data-pl-done="1">DONE</button></div>` }
function plDaysTxt(kind, id) { const on = plDaysOf(kind, id); return on.length ? "On " + on.map(i => PL_DAYS[i]).join(", ") : "Not on your week yet" }
function plDelBtn(kind, id, what) { return `<button type="button" class="pl-btn2" data-pl-del="${kind}|${esc(id)}">${PL.del === kind + "|" + id ? "TAP AGAIN TO DELETE" : "DELETE " + what}</button>` }
function plGymEd(r) {
  if (!r) { PL.edit = null; return viewPlanX() }
  const ex = r.ex.map(toPlanEx), sets = r.ex.reduce((t, e) => t + (e.sets || 0), 0), mus = [...new Set(r.ex.map(e => (libEx(e.id) || {}).muscle).filter(Boolean))].slice(0, 3);
  let h = `<div class="pl-ed" style="--c:var(--pl-gym)">${plEdTop("STRENGTH · GATE")}
    <div class="pl-hero"><img src="${plImg(plTower(r.id))}" alt=""><div style="min-width:0;flex:1"><input class="pl-name" data-pl-name="gym|${esc(r.id)}" value="${esc(r.name)}" maxlength="40" aria-label="Workout name"><div class="pl-ms">${esc(mus.join(" · ") || "No exercises yet")}<br>${plDaysTxt("gym", r.id)}</div></div></div>
    <div class="pl-tot"><div><b>${r.ex.length}</b><span>FLOORS</span></div><div><b>${sets}</b><span>SETS</span></div><div><b>~${estMin(ex)}m</b><span>ESTIMATED</span></div></div>
    <div class="pl-sec"><span>FLOORS · IN ORDER</span><span>${r.ex.length ? "TAP TO EDIT · DRAG ⋮⋮" : ""}</span></div><div class="pl-floors" id="plFloors">`;
  r.ex.forEach((e, i) => { const L = libEx(e.id) || { name: e.id }, sec = L.type === "t" || L.type === "tw", open = PL.open === i, end = PL.end[i] || "lo";
    if (i > 0 && r.ex[i - 1].ss) h += `<div class="pl-sslink">SUPERSET</div>`;
    h += `<div class="pl-fl${e.ss || (i > 0 && r.ex[i - 1].ss) ? " ss" : ""}${open ? " open" : ""}" data-pl-fl="${i}"><div class="pl-flh"><button type="button" class="pl-flhit" data-pl-open="${i}" aria-expanded="${open}" aria-label="${esc(L.name)}, ${e.sets} sets of ${e.lo} to ${e.hi}"></button><span class="pl-no">${i + 1}</span><span class="pl-t"><b>${esc(L.name)}</b><span>${esc(L.equip || "")}${L.equip ? " · " : ""}rest ${fmtClock((e.rest || 90) * 1000)}</span></span><span class="pl-rx">${e.sets} × ${e.lo}${e.hi !== e.lo ? "–" + e.hi : ""}${sec ? "s" : ""}</span><span class="pl-grip" data-pl-fgrip="${i}" aria-label="Drag to reorder" role="button" tabindex="0">⋮⋮</span></div>`;
    if (open) h += `<div class="pl-flb"><div class="pl-steps">
        <div class="pl-st"><span>SETS</span><div><button type="button" data-pl-x="${i}|sets|-1" aria-label="Fewer sets">−</button><b>${e.sets}</b><button type="button" data-pl-x="${i}|sets|1" aria-label="More sets">+</button></div></div>
        <div class="pl-st rg"><span>${sec ? "SECONDS" : "REPS"}</span><div><button type="button" data-pl-x="${i}|${end}|-1" aria-label="Lower">−</button><b><i class="${end === "lo" ? "on" : ""}" data-pl-end="${i}|lo" role="button" tabindex="0">${e.lo}</i>–<i class="${end === "hi" ? "on" : ""}" data-pl-end="${i}|hi" role="button" tabindex="0">${e.hi}</i></b><button type="button" data-pl-x="${i}|${end}|1" aria-label="Higher">+</button></div></div>
        <div class="pl-st"><span>REST</span><div><button type="button" data-pl-x="${i}|rest|-1" aria-label="Less rest">−</button><b>${fmtClock((e.rest || 90) * 1000)}</b><button type="button" data-pl-x="${i}|rest|1" aria-label="More rest">+</button></div></div></div>
      <div class="pl-flact">${i < r.ex.length - 1 || e.ss ? `<button type="button" class="${e.ss ? "on" : ""}" data-c-ss="${esc(r.id)}|${i}">${e.ss ? "⛓ UNLINK SUPERSET" : "⛓ SUPERSET WITH NEXT"}</button>` : ""}<button type="button" data-pl-rm="${i}">REMOVE</button></div></div>`;
    h += `</div>` });
  h += `</div><button type="button" class="pl-addf" data-c-add="${esc(r.id)}"><b>+ ADD A FLOOR</b><span>SEARCH ${typeof exLib === "function" ? Math.floor(exLib().length / 50) * 50 + "+" : ""} EXERCISES</span></button>
    <div class="pl-edfoot">${plDelBtn("gym", r.id, "WORKOUT")}<button type="button" class="pl-btn1" data-pl-done="1">SAVE WORKOUT</button></div></div>`;
  return h;
}
// the shape of a session: warm-up, the main part (one block, or reps with recoveries), cool-down
function plRouteBar(blocks) { const tot = blocks.reduce((t, b) => t + b.w, 0) || 1;
  return `<div class="pl-route" aria-hidden="true">${blocks.map(b => `<i class="${b.k}" style="flex:${(b.w / tot * 100).toFixed(2)}"></i>`).join("")}</div>
    <div class="pl-rlab">${blocks.length ? blocks.filter(b => b.lab).map(b => `<span>${esc(b.lab)}</span>`).join("") : ""}</div>` }
function plRunEd(r) {
  if (!r) { PL.edit = null; return viewPlanX() }
  const m = r.main, b = [];
  if (r.warm) b.push({ k: "w", w: r.warm * 60, lab: `WARM-UP ${r.warm}:00` });
  if (m.kind === "rep") { const wv = m.work.by === "dist" ? m.work.v / 4 : m.work.v, rv = m.rest.by === "time" ? m.rest.v : wv * 1.2; for (let k = 0; k < Math.min(m.n, 12); k++) { b.push({ k: "h", w: wv, lab: k === 0 ? `${m.n} × ${m.work.by === "dist" ? m.work.v + " m" : fmtClock(m.work.v * 1000)}` : "" }); if (k < m.n - 1) b.push({ k: "e", w: rv }) } }
  else b.push({ k: r.effort === "easy" ? "s" : "h", w: m.by === "dist" ? m.v * 600 : m.v * 60, lab: m.by === "dist" ? descU(`${m.v} mi`) : `${m.v} MIN` });
  if (r.cool) b.push({ k: "w", w: r.cool * 60, lab: `COOL ${r.cool}:00` });
  return `<div class="pl-ed pl-edrun" style="--c:var(--pl-run)">${plEdTop("RUNNING · " + (RUN_TYPES[r.type] || RUN_TYPES.easy).n.toUpperCase())}
    <div class="pl-hero"><img src="${plImg(plTrail(r))}" alt=""><div style="min-width:0;flex:1"><input class="pl-name" data-run-name="${esc(r.id)}" value="${esc(r.name)}" maxlength="40" aria-label="Run name"><div class="pl-ms">${esc(plD((runPlanFor(r, today) || { d: "" }).d))}<br>${plDaysTxt("run", r.id)}</div></div></div>
    <div class="pl-chips">${RUN_ORDER.map(t => `<button type="button" class="${r.type === t ? "on" : ""}" data-pl-runtype="${esc(r.id)}|${t}">${esc(RUN_TYPES[t].n.replace(/ run$/, "").toUpperCase())}</button>`).join("")}</div>
    ${plRouteBar(b)}
    <div class="pl-sec"><span>BLOCKS</span><span>${r.follow ? "FOLLOWS YOUR PROGRAM" : r.prog && r.prog.on ? "AUTO · GROWS WEEKLY" : "FIXED"}</span></div>
    <div class="pl-fields">${r.follow ? `<p class="small">This run follows your program, which sets it week by week.</p><button type="button" class="pl-btn2" data-run-custom="${esc(r.id)}">CUSTOMIZE IT</button>` : runFields(r)}</div>
    <div class="pl-edfoot">${plDelBtn("run", r.id, "RUN")}<button type="button" class="pl-btn1" data-pl-done="1">SAVE RUN</button></div></div>`;
}
function plRowEd(r) {
  if (!r) { PL.edit = null; return viewPlanX() }
  const x = rowThisWeek(r, weekOf(today)), b = [];
  if (r.kind === "int") { const wv = r.by === "time" ? r.sec : (r.m || 500) / 500 * (r.split || 120); for (let k = 0; k < Math.min(r.reps, 12); k++) { b.push({ k: "h", w: wv, lab: k === 0 ? `${r.reps} × ${r.by === "time" ? rowClock(r.sec) : rowM(r.m)}` : "" }); if (k < r.reps - 1) b.push({ k: "e", w: r.rest || 60 }) } }
  else b.push({ k: r.kind === "test" ? "h" : "s", w: 1, lab: r.kind === "steady" ? `${x.min} MIN` : rowM(r.m).toUpperCase() });
  const f = (fld, lab, unit, v) => `<label class="pl-f"><span>${lab}</span><span class="pl-fin"><input inputmode="decimal" data-pl-rowf="${esc(r.id)}|${fld}" value="${esc(v ?? "")}"><em>${unit || ""}</em></span></label>`;
  let fields = "";
  if (r.kind === "steady") fields = f("min", "Minutes", "min", r.min) + `<label class="pl-chk"><input type="checkbox" data-pl-rowck="${esc(r.id)}|grow" ${r.grow ? "checked" : ""}> Grow 2 min a week (up to 60)</label>`;
  else if (r.kind === "int") fields = `<div class="pl-seg2">${[["m", "BY DISTANCE"], ["time", "BY TIME"]].map(([v, n]) => `<button type="button" class="${(r.by || "m") === v ? "on" : ""}" data-pl-rowby="${esc(r.id)}|${v}">${n}</button>`).join("")}</div>` + f("reps", "Pieces", "", r.reps) + (r.by === "time" ? f("secT", "Each piece", "min:sec", rowClock(r.sec || 60)) : f("m", "Each piece", "m", r.m)) + f("rest", "Rest", "sec", r.rest);
  else if (r.kind === "long") fields = f("m", "Distance", "m", r.m);
  else fields = `<div class="pl-seg2">${[500, 2000, 5000].map(m => `<button type="button" class="${r.m === m ? "on" : ""}" data-pl-rowtm="${esc(r.id)}|${m}">${m.toLocaleString("en-US")} M</button>`).join("")}</div>`;
  if (r.kind !== "test") fields += `<label class="pl-chk"><input type="checkbox" data-pl-rowck="${esc(r.id)}|pace" ${r.split ? "checked" : ""}> Target pace</label>` + (r.split ? f("splitT", "Split", "/500 m", rowSplitTxt(r.split)) : `<p class="pl-hint">No target. Just row ${r.kind === "steady" || r.by === "time" ? "for the time" : "the distance"} at whatever pace feels right.</p>`);
  return `<div class="pl-ed pl-edrow" style="--c:var(--pl-row)">${plEdTop("ROWING · " + ROW_KINDS[r.kind].n.toUpperCase())}
    <div class="pl-hero"><img src="${plImg(ROW_KINDS[r.kind].img)}" alt=""><div style="min-width:0;flex:1"><input class="pl-name" data-pl-name="row|${esc(r.id)}" value="${esc(r.name)}" maxlength="40" aria-label="Row name"><div class="pl-ms">${esc(rowDesc(x))}<br>${plDaysTxt("row", r.id)}</div></div></div>
    <div class="pl-chips">${Object.entries(ROW_KINDS).map(([k, K]) => `<button type="button" class="${r.kind === k ? "on" : ""}" data-pl-rowkind="${esc(r.id)}|${k}">${esc(K.n.replace(/^Row |Row test \(2k\)/, m => m === "Row " ? "" : "2K TEST").replace(" row", "").toUpperCase())}</button>`).join("")}</div>
    ${plRouteBar(b)}
    <div class="pl-sec"><span>THE ROW</span><span>${r.kind === "steady" && r.grow ? "AUTO · GROWS WEEKLY" : ""}</span></div>
    <div class="pl-fields">${fields}</div>
    <div class="pl-edfoot">${plDelBtn("row", r.id, "ROW")}<button type="button" class="pl-btn1" data-pl-done="1">SAVE ROW</button></div></div>`;
}
function plRowMut(id, fn) { suMut(su => { rowsEnsure(su); const r = su.rows.find(x => x.id === id); if (r) fn(r) }) }

/* ---------- events ---------- */
function plGo(fn) { fn(); lastRenderKey = ""; render() }
document.addEventListener("click", e => {
  if (typeof tab === "undefined" || tab !== "plan") return;
  const t = e.target.closest("[data-pl-seg],[data-pl-filter],[data-pl-day],[data-pl-step],[data-pl-back],[data-pl-close],[data-pl-set],[data-pl-forge],[data-pl-newrun],[data-pl-newrow],[data-pl-new],[data-pl-edit],[data-pl-done],[data-pl-del],[data-pl-open],[data-pl-x],[data-pl-end],[data-pl-rm],[data-pl-runtype],[data-pl-rowkind],[data-pl-rowby],[data-pl-rowtm]");
  if (!t) return; const d = t.dataset;
  if (d.plSeg) return plGo(() => { PL.seg = d.plSeg; PL.pop = null });
  if (d.plFilter) return plGo(() => { PL.filter = d.plFilter });
  if (d.plDay != null && !d.plGrip) return plGo(() => { PL.pop = { day: +d.plDay, step: "pick", root: "pick", hist: [] } });
  if (d.plClose) return plGo(() => { PL.pop = null });
  if (d.plStep) return plGo(() => { PL.pop.hist.push(PL.pop.step); PL.pop.step = d.plStep });
  if (d.plBack) return plGo(() => { PL.pop.step = PL.pop.hist.pop() || "pick" });
  if (d.plSet) { const i = PL.pop.day, v = d.plSet; plSetDay(i, v); PL.pop = null; toast(v === "rest" ? `${PL_DAYS[i]}: rest` : v === "none" ? `${PL_DAYS[i]} is uncharted` : `${PL_DAYS[i]} is set`); return }
  if (d.plForge) { const i = PL.pop && PL.pop.day, id = newId("r"), T = d.plForge === "new" ? { name: "New workout", ex: [] } : PL_TPL()[+d.plForge];
    suMut(su => { let nm = T.name, k = 2; while (su.routines.some(r => r.name === nm)) nm = T.name + " " + k++; su.routines.push({ id, name: nm, ex: T.ex.map(x => ({ ...x })) }); if (i != null) { su.week[i] = id; if (su.runWeek) su.runWeek[i] = null; if (su.rowWeek) su.rowWeek[i] = null } });
    PL.pop = null; PL.edit = { kind: "gym", id }; PL.open = -1; lastRenderKey = ""; render(); window.scrollTo(0, 0); return }
  if (d.plNewrun) { const i = PL.pop && PL.pop.day, id = addRun(d.plNewrun, i == null ? null : i); PL.pop = null; PL.edit = { kind: "run", id }; lastRenderKey = ""; render(); window.scrollTo(0, 0); return }
  if (d.plNewrow) { const i = PL.pop && PL.pop.day, K = ROW_KINDS[d.plNewrow], id = "row_" + Date.now().toString(36);
    suMut(su => { rowsEnsure(su); const n = su.rows.filter(r => r.kind === d.plNewrow).length; su.rows.push({ id, name: K.n + (n ? " " + (n + 1) : ""), kind: d.plNewrow, ...K.make(), w0: weekOf(today) }); if (i != null) { su.week[i] = "row"; su.rowWeek[i] = id; if (su.runWeek) su.runWeek[i] = null } });
    PL.pop = null; PL.edit = { kind: "row", id }; lastRenderKey = ""; render(); window.scrollTo(0, 0); return }
  if (d.plNew) { if (d.plNew === "gym") return plGo(() => { PL.pop = { day: null, step: "forge", root: "forge", hist: [] } }); return plGo(() => { PL.pop = { day: null, step: d.plNew, root: d.plNew, hist: [] } }) }
  if (d.plEdit) { const [k, id] = d.plEdit.split("|"); PL.edit = { kind: k, id }; PL.open = -1; PL.del = ""; lastRenderKey = ""; render(); window.scrollTo(0, 0); return }
  if (d.plDone) return plGo(() => { PL.edit = null; PL.open = -1; PL.del = "" });
  if (d.plDel) { if (PL.del !== d.plDel) return plGo(() => { PL.del = d.plDel }); const [k, id] = d.plDel.split("|");
    suMut(su => { if (k === "gym") { su.routines = su.routines.filter(r => r.id !== id); su.week = su.week.map(w => w === id ? "none" : w) }
      else if (k === "run") { su.runs = (su.runs || []).filter(r => r.id !== id); (su.runWeek || []).forEach((x, i) => { if (x === id) { su.runWeek[i] = null; su.week[i] = "none" } }) }
      else { rowsEnsure(su); su.rows = su.rows.filter(r => r.id !== id); (su.rowWeek || []).forEach((x, i) => { if (x === id) { su.rowWeek[i] = null; su.week[i] = "none" } }); if (!su.rows.length) su.rows = ROW_DEFAULTS() } });
    PL.edit = null; PL.del = ""; lastRenderKey = ""; render(); toast("Deleted"); return }
  if (d.plOpen != null) return plGo(() => { PL.open = PL.open === +d.plOpen ? -1 : +d.plOpen });
  if (d.plEnd) { const [i, k] = d.plEnd.split("|"); return plGo(() => { PL.end[i] = k }) }
  if (d.plX && PL.edit) { const [i, f, s] = d.plX.split("|"), dir = +s, id = PL.edit.id;
    suMut(su => { const r = su.routines.find(x => x.id === id), x = r && r.ex[+i]; if (!x) return; const L = libEx(x.id) || {}, st = L.type === "t" || L.type === "tw" ? 5 : 1;
      if (f === "sets") x.sets = Math.max(1, Math.min(10, x.sets + dir));
      else if (f === "rest") { const R = [30, 45, 60, 75, 90, 120, 150, 180, 240, 300], c = x.rest || 90, k = R.findIndex(v => v >= c); x.rest = R[Math.max(0, Math.min(R.length - 1, (k < 0 ? R.length - 1 : k) + dir))] }
      else if (f === "lo") { x.lo = Math.max(1, x.lo + dir * st); if (x.hi < x.lo) x.hi = x.lo }
      else if (f === "hi") { x.hi = Math.max(1, x.hi + dir * st); if (x.lo > x.hi) x.lo = x.hi } }); return }
  if (d.plRm != null && PL.edit) { const i = +d.plRm, id = PL.edit.id; PL.open = -1; suMut(su => { const r = su.routines.find(x => x.id === id); if (r) { if (i > 0 && r.ex[i - 1].ss && !r.ex[i].ss) delete r.ex[i - 1].ss; r.ex.splice(i, 1) } }); return }
  if (d.plRuntype) { const [id, v] = d.plRuntype.split("|"); runMut(id, r => { const keep = { id: r.id, name: r.name === (RUN_TYPES[r.type] || {}).n ? RUN_TYPES[v].n : r.name }; Object.keys(r).forEach(k => delete r[k]); Object.assign(r, { ...keep, type: v, ...RUN_TYPES[v].make(), w0: weekOf(today) }) }); return }
  if (d.plRowkind) { const [id, k] = d.plRowkind.split("|"); plRowMut(id, r => { const nm = Object.values(ROW_KINDS).some(K => K.n === r.name) ? ROW_KINDS[k].n : r.name; Object.keys(r).forEach(x => { if (x !== "id") delete r[x] }); Object.assign(r, { name: nm, kind: k, ...ROW_KINDS[k].make(), w0: weekOf(today) }) }); return }
  if (d.plRowby) { const [id, v] = d.plRowby.split("|"); plRowMut(id, r => { r.by = v; if (v === "time" && !r.sec) r.sec = 60 }); return }
  if (d.plRowtm) { const [id, m] = d.plRowtm.split("|"); plRowMut(id, r => { r.m = +m; if (/^Row test/.test(r.name)) r.name = `Row test (${+m >= 1000 ? +m / 1000 + "k" : m + " m"})` }); return }
});
document.addEventListener("change", e => { const t = e.target, d = t.dataset || {};
  if (d.plName) { const [k, id] = d.plName.split("|"), v = t.value.trim().slice(0, 40); if (!v) return; if (k === "gym") suMut(su => { const r = su.routines.find(x => x.id === id); if (r) r.name = v }); else plRowMut(id, r => { r.name = v }); return }
  if (d.plRowf) { const [id, f] = d.plRowf.split("|"), v = t.value;
    plRowMut(id, r => { if (f === "secT") { const s = rowParseTime(String(v).includes(":") ? v : "0:" + v); if (s > 0) r.sec = Math.round(s) } else if (f === "splitT") { const s = rowParseSplit(v); if (s) r.split = s } else { const n = Math.round(Number(v)); if (n > 0) r[f] = n } }); return }
  if (d.plRowck) { const [id, f] = d.plRowck.split("|"); plRowMut(id, r => { if (f === "grow") { r.grow = t.checked; if (t.checked && !r.w0) r.w0 = weekOf(today) } else if (t.checked) r.split = r.split || ROW_KINDS[r.kind].make().split || 140; else delete r.split }); return }
});
// drag: the ⋮⋮ grip moves a day up or down the week, or a floor within a workout
let PLD = null;
document.addEventListener("pointerdown", e => { if (typeof tab === "undefined" || tab !== "plan") return;
  const g = e.target.closest("[data-pl-grip],[data-pl-fgrip]"); if (!g) return; e.preventDefault();
  const fl = g.dataset.plFgrip != null, el = g.closest(fl ? ".pl-fl" : ".pl-row"), box = document.getElementById(fl ? "plFloors" : "plList"); if (!el || !box) return;
  PLD = { fl, from: +(fl ? g.dataset.plFgrip : g.dataset.plGrip), el, box, y0: e.clientY, to: null }; el.classList.add("drag"); try { g.setPointerCapture(e.pointerId) } catch (_) { } });
document.addEventListener("pointermove", e => { if (!PLD) return; PLD.el.style.transform = `translateY(${e.clientY - PLD.y0}px)`;
  const rows = [...PLD.box.querySelectorAll(PLD.fl ? ".pl-fl" : ".pl-row")]; let to = null;
  rows.forEach((r, i) => { r.classList.remove("over"); if (r === PLD.el) return; const b = r.getBoundingClientRect(); if (e.clientY >= b.top && e.clientY <= b.bottom) { to = i; r.classList.add("over") } });
  PLD.to = to });
function plDrop() { if (!PLD) return; const { fl, from, to, el } = PLD; PLD = null; el.classList.remove("drag"); el.style.transform = "";
  if (to == null || to === from) { lastRenderKey = ""; render(); return }
  if (fl) { const id = PL.edit && PL.edit.id; suMut(su => { const r = su.routines.find(x => x.id === id); if (!r) return; const [x] = r.ex.splice(from, 1); r.ex.splice(to, 0, x); r.ex.forEach((e, i) => { if (e.ss && i === r.ex.length - 1) delete e.ss }) }); PL.open = -1 }
  else { plSwap(from, to); toast(`${PL_DAYS[from]} and ${PL_DAYS[to]} swapped`) } }
document.addEventListener("pointerup", plDrop); document.addEventListener("pointercancel", plDrop);

(function () { if (document.getElementById("plCss")) return; const st = document.createElement("style"); st.id = "plCss"; st.textContent = `
:root{--pl-gym:#8B7CFF;--pl-run:#4FD08A;--pl-row:#4FB3E8;--pl-rest:#A9B6C4;--pl-gold:#D9B26A;--pl-cd:"Barlow Semi Condensed",sans-serif}
body.pl-page{background:radial-gradient(60% 30% at 25% 20%,rgba(60,110,140,.16),transparent 70%),radial-gradient(50% 30% at 80% 70%,rgba(80,70,150,.14),transparent 70%),linear-gradient(rgba(150,190,220,.045) 1px,transparent 1px) 0 0/28px 28px,linear-gradient(90deg,rgba(150,190,220,.045) 1px,transparent 1px) 0 0/28px 28px,#070B13;background-attachment:fixed}
body.pl-page #top{color:#F5F1E6}
.pl-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;color:#F5F1E6}
.pl-eye{font:800 10px/1 var(--pl-cd);letter-spacing:.32em;color:var(--pl-gold)}
.pl-h1{font:900 30px/1.05 var(--pl-cd);margin:5px 0 0;color:#F5F1E6}
.pl-subt{font:600 12.5px Barlow,sans-serif;color:#8F97A6;margin-top:4px}
.pl-chipb{border:1px solid rgba(217,178,106,.45);color:var(--pl-gold);border-radius:10px;padding:7px 10px;font:800 10.5px/1 var(--pl-cd);letter-spacing:.16em;background:rgba(217,178,106,.08);white-space:nowrap}
.pl{color:#F5F1E6;padding-bottom:16px}
.pl-seg{display:flex;border:1px solid rgba(245,241,230,.13);border-radius:12px;padding:3px;background:rgba(7,11,19,.8);margin:4px 0 10px}
.pl-seg button{all:unset;cursor:pointer;flex:1;text-align:center;padding:9px 0;border-radius:9px;font:800 11px/1 var(--pl-cd);letter-spacing:.22em;color:#7E8796}
.pl-seg button.on{background:linear-gradient(180deg,rgba(217,178,106,.22),rgba(217,178,106,.08));color:var(--pl-gold);box-shadow:inset 0 0 0 1px rgba(217,178,106,.45)}
.pl-seg i{font-style:normal;color:#5E6675;margin-left:5px}
.pl-list{display:flex;flex-direction:column;gap:7px}
.pl-row{all:unset;box-sizing:border-box;cursor:pointer;display:flex;align-items:center;gap:10px;min-height:76px;border:1px solid rgba(245,241,230,.13);border-radius:14px;background:rgba(7,11,19,.86);padding-right:10px;position:relative;overflow:hidden;width:100%;touch-action:pan-y}
.pl-row:before{content:"";position:absolute;left:0;top:10px;bottom:10px;width:3px;border-radius:2px;background:var(--c)}
.pl-row.drag{z-index:5;box-shadow:0 14px 30px rgba(0,0,0,.6);border-color:var(--pl-gold);transition:none}
.pl-row.over{border-color:rgba(217,178,106,.7)}
.pl-row.sel{border-color:var(--pl-gold);box-shadow:0 0 0 3px rgba(217,178,106,.2)}
.pl-hit{all:unset;cursor:pointer;position:absolute;inset:0}
.pl-dw{width:46px;flex-shrink:0;text-align:center;font:900 12px/1.1 var(--pl-cd);letter-spacing:.14em;color:var(--c);position:relative;pointer-events:none}
.pl-row img{width:84px;height:84px;object-fit:cover;object-position:50% 58%;margin-left:-6px;pointer-events:none;flex-shrink:0}
.pl-t{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1;pointer-events:none}
.pl-t b{font:900 17px/1.05 var(--pl-cd);letter-spacing:.02em;overflow:hidden;text-overflow:ellipsis}
.pl-t>span{font:500 11.5px/1.3 Barlow,sans-serif;color:#8F97A6}
.pl-unch{color:#C9B48A!important;letter-spacing:.1em!important;font-size:15px!important}
.pl-row.empty{border-style:dashed;border-color:rgba(217,178,106,.45);background:rgba(217,178,106,.04)}
.pl-plot{width:72px;height:46px;flex-shrink:0;border-radius:50%;border:2px dashed rgba(217,178,106,.5);display:grid;place-items:center;color:var(--pl-gold);font:900 22px var(--pl-cd);margin-left:6px}
.pl-grip{position:relative;margin-left:auto;padding:14px 4px 14px 10px;color:#4D5566;font-size:16px;letter-spacing:-2px;cursor:grab;touch-action:none}
.pl-check{margin-top:10px;border:1px solid rgba(245,241,230,.13);background:rgba(7,11,19,.9);border-radius:12px;padding:9px 12px}
.pl-k{font:800 10px var(--pl-cd);letter-spacing:.22em;color:#8F97A6;margin-bottom:6px;display:flex;justify-content:space-between}
.pl-pills{display:flex;gap:6px;flex-wrap:wrap}.pl-pills span{display:inline-flex;align-items:center;gap:5px;padding:4px 8px;border-radius:7px;border:1px solid rgba(245,241,230,.13);font:700 11.5px var(--pl-cd);letter-spacing:.06em}.pl-pills i{width:7px;height:7px;border-radius:2px;background:var(--c)}
.pl-warn{margin-top:7px;font:600 12px/1.35 Barlow,sans-serif;color:#E8C27A;display:flex;gap:6px}
.pl-fchips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}.pl-fchips button{all:unset;cursor:pointer;border:1px solid rgba(245,241,230,.13);border-radius:999px;padding:6px 11px;font:800 10.5px var(--pl-cd);letter-spacing:.14em;color:#9AA2AE;background:rgba(7,11,19,.7)}.pl-fchips button.on{color:#F5F1E6;border-color:rgba(245,241,230,.4)}
.pl-lib{display:flex;flex-direction:column;gap:6px}
.pl-lsec{display:flex;justify-content:space-between;align-items:center;margin:8px 2px 0;font:800 9.5px var(--pl-cd);letter-spacing:.28em;color:var(--c)}
.pl-lsec button{all:unset;cursor:pointer;font:800 10px var(--pl-cd);letter-spacing:.2em;color:var(--pl-gold);padding:6px 2px}
.pl-none{margin:2px 4px 6px;font:500 12.5px Barlow,sans-serif;color:#7E8796}
.pl-wk{all:unset;box-sizing:border-box;cursor:pointer;display:flex;align-items:center;gap:10px;min-height:70px;border:1px solid rgba(245,241,230,.13);border-radius:14px;background:rgba(7,11,19,.86);padding-right:12px;position:relative;overflow:hidden;width:100%}
.pl-wk:before{content:"";position:absolute;left:0;top:10px;bottom:10px;width:3px;border-radius:2px;background:var(--c)}
.pl-wk img{width:76px;height:76px;object-fit:cover;object-position:50% 58%;margin-left:2px;flex-shrink:0}
.pl-wk .pl-t b{font-size:16px}
.pl-dy{display:flex;gap:2px;flex-shrink:0}.pl-dy i{font-style:normal;font:800 9px var(--pl-cd);color:#5E6675;width:13px;text-align:center}.pl-dy i.on{color:var(--c)}
/* popup */
body:has(.pl-pop){overflow:hidden}
.pl-pop{position:fixed;inset:0;z-index:880;display:flex;flex-direction:column;justify-content:center;padding:calc(env(safe-area-inset-top,0px) + 56px) max(16px,env(safe-area-inset-right,0px)) calc(env(safe-area-inset-bottom,0px) + 14px) max(16px,env(safe-area-inset-left,0px));--m0:#3A3F48;--m1:#8E96A3;--m2:#D7DCE3;animation:plIn .2s ease-out}
@keyframes plIn{from{opacity:0}to{opacity:1}}
.pl-dim{position:absolute;inset:0;background:rgba(3,5,10,.72);backdrop-filter:blur(2px)}
.pl-pcard{position:relative;flex:0 1 auto;min-height:0;max-height:100%;display:flex;max-width:480px;width:100%;margin:0 auto;border-radius:22px;padding:3px;background:linear-gradient(90deg,var(--m0),var(--m1) 40%,var(--m2) 60%,var(--m0));box-shadow:0 30px 60px #000}
.pl-pin{flex:1;min-height:0;border-radius:19px;background:repeating-linear-gradient(135deg,rgba(255,255,255,.018) 0 2px,transparent 2px 9px),linear-gradient(180deg,#121317,#0A0A0C);padding:18px 18px 14px;display:flex;flex-direction:column;overflow:hidden;color:#F5F1E6}
.pl-phead{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
.pl-peye{font:800 10px/1.4 var(--pl-cd);letter-spacing:.28em;color:#B9C0CA}.pl-peye b{color:var(--pl-gold)}
.pl-pbtns{display:flex;gap:8px;flex-shrink:0}
.pl-px,.pl-pback{all:unset;cursor:pointer;height:32px;border-radius:16px;border:1px solid rgba(215,220,227,.35);display:grid;place-items:center;color:#D7DCE3}
.pl-px{width:32px;font-size:13px}.pl-pback{padding:0 11px;font:800 10px var(--pl-cd);letter-spacing:.18em;white-space:nowrap}
.pl-ptitle{margin-top:8px;font:900 28px/1.05 var(--pl-cd);background:linear-gradient(180deg,#F4F6F8,#AEB6C2 55%,#5E6672);-webkit-background-clip:text;background-clip:text;color:transparent}
.pl-psub{font:500 13px/1.35 Barlow,sans-serif;color:#B8BEC8;margin-top:4px}
.pl-ptot{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:12px}
.pl-ptot div,.pl-tot div{border:1px solid rgba(217,178,106,.28);border-radius:12px;padding:8px 4px;text-align:center;background:linear-gradient(180deg,rgba(60,44,22,.45),rgba(20,16,10,.5))}
.pl-ptot b,.pl-tot b{display:block;font:900 20px/1 var(--pl-cd)}.pl-ptot span,.pl-tot span{display:block;font:800 8.5px var(--pl-cd);letter-spacing:.22em;color:#B9AE98;margin-top:4px}
.pl-pobj,.pl-sec{display:flex;justify-content:space-between;margin-top:14px;padding-bottom:6px;border-bottom:1px solid rgba(142,150,163,.45);font:800 9.5px/1 var(--pl-cd);letter-spacing:.3em;color:#AEB6C2}.pl-pobj span+span,.pl-sec span+span{color:#6E6960;letter-spacing:.2em}
.pl-plist{min-height:0;overflow:auto;overscroll-behavior:contain;margin-right:-6px;padding-right:6px}
.pl-prow{all:unset;box-sizing:border-box;cursor:pointer;display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(245,241,230,.07);width:100%}
.pl-dia{flex-shrink:0;width:11px;height:11px;transform:rotate(45deg);border:1.5px solid var(--c)}
.pl-prow.pk .pl-dia{background:var(--c)}.pl-prow.pk{background:linear-gradient(90deg,rgba(217,178,106,.12),transparent);border-radius:10px}
.pl-prow img{width:74px;height:62px;object-fit:cover;object-position:50% 58%;flex-shrink:0}
.pl-prow.big img{width:96px;height:78px}.pl-prow.big .pl-t b{font-size:21px;letter-spacing:.06em}
.pl-te{font:800 9px var(--pl-cd)!important;letter-spacing:.24em;color:var(--c)!important}
.pl-tag{font:800 9px var(--pl-cd);letter-spacing:.14em;color:#9AA2AE;border:1px solid rgba(245,241,230,.14);border-radius:7px;padding:4px 7px;white-space:nowrap;flex-shrink:0}
.pl-tag.free{color:var(--pl-gold);border-color:rgba(217,178,106,.5)}
.pl-chev{color:#AEB6C2;font:900 20px var(--pl-cd)}
.pl-prow.lock{opacity:.42;filter:grayscale(.7);cursor:default}
.pl-padd{all:unset;box-sizing:border-box;cursor:pointer;width:100%;margin-top:10px;border:1.5px dashed rgba(217,178,106,.55);border-radius:14px;padding:11px 12px;display:flex;flex-direction:column;gap:4px}
.pl-padd b{font:800 13px var(--pl-cd);letter-spacing:.24em;color:var(--pl-gold)}.pl-padd span{font:800 9.5px var(--pl-cd);letter-spacing:.18em;color:#9C8D6C}
.pl-clear{all:unset;cursor:pointer;display:block;text-align:center;margin:12px auto 0;font:600 12.5px Barlow,sans-serif;color:#8F97A6;text-decoration:underline}
.pl-pfoot{position:relative;text-align:center;font:800 10px var(--pl-cd);letter-spacing:.3em;color:#6E7686;margin-top:12px;cursor:pointer}
/* editors */
.pl-ed{color:#F5F1E6;margin:0 -14px;padding:0 14px 20px;min-height:100%}
.pl-edtop{display:flex;justify-content:space-between;align-items:center;gap:8px;padding-top:2px}
.pl-edlab{font:800 10px var(--pl-cd);letter-spacing:.26em;color:var(--c);text-align:center}
.pl-cbtn{all:unset;cursor:pointer;height:34px;padding:0 12px;border-radius:17px;border:1px solid rgba(245,241,230,.16);display:grid;place-items:center;font:800 10.5px var(--pl-cd);letter-spacing:.18em;color:#C9D6E2;white-space:nowrap}
.pl-cbtn.gold{border-color:var(--pl-gold);color:var(--pl-gold);background:rgba(217,178,106,.1)}
.pl-hero{display:flex;gap:12px;align-items:center;margin-top:6px}
.pl-hero img{width:104px;height:104px;object-fit:cover;object-position:50% 55%;flex-shrink:0;filter:drop-shadow(0 10px 14px rgba(0,0,0,.6))}
.pl-name{all:unset;box-sizing:border-box;width:100%;font:900 26px/1.1 var(--pl-cd);color:#F5F1E6;border-bottom:1px dashed rgba(245,241,230,.25);padding:2px 0}
.pl-name:focus{border-bottom-color:var(--pl-gold)}
.pl-ms{font:500 12px/1.4 Barlow,sans-serif;color:#8F97A6;margin-top:5px}
.pl-tot{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:12px}
.pl-floors{display:flex;flex-direction:column}
.pl-fl{border-bottom:1px solid rgba(245,241,230,.07);background:#0A0B10;position:relative}
.pl-fl.drag{z-index:5;box-shadow:0 14px 30px rgba(0,0,0,.6);outline:1px solid var(--pl-gold);border-radius:10px}.pl-fl.over{outline:1px solid rgba(217,178,106,.6)}
.pl-flh{display:flex;align-items:center;gap:10px;padding:9px 0;position:relative}
.pl-flhit{all:unset;cursor:pointer;position:absolute;inset:0}
.pl-no{width:26px;height:26px;border-radius:7px;border:1px solid rgba(139,124,255,.45);display:grid;place-items:center;font:800 12px var(--pl-cd);color:#B9AEFF;flex-shrink:0;pointer-events:none}
.pl-fl.ss .pl-no{border-color:rgba(217,178,106,.6);color:var(--pl-gold)}
.pl-fl .pl-t b{font-size:15px}
.pl-rx{pointer-events:none;border:1px solid rgba(245,241,230,.14);border-radius:8px;padding:5px 7px;font:800 11.5px var(--pl-cd);color:#E4E7EC;white-space:nowrap}
.pl-fl.open .pl-rx{border-color:var(--pl-gold);color:var(--pl-gold)}
.pl-sslink{margin:-1px 0 -1px 12px;height:13px;border-left:2px solid rgba(217,178,106,.6);font:800 8.5px var(--pl-cd);letter-spacing:.2em;color:var(--pl-gold);padding-left:8px;line-height:13px}
.pl-flb{padding:2px 0 12px 36px}
.pl-steps{display:flex;gap:6px}
.pl-st{flex:1;min-width:0;border:1px solid rgba(245,241,230,.13);border-radius:10px;padding:5px;text-align:center}
.pl-st>span{font:800 8.5px var(--pl-cd);letter-spacing:.2em;color:#8F97A6}
.pl-st>div{display:flex;align-items:center;justify-content:space-between;gap:2px;margin-top:3px}
.pl-st button{all:unset;cursor:pointer;width:24px;height:26px;border-radius:7px;background:rgba(255,255,255,.07);display:grid;place-items:center;color:#C9D6E2;font-size:15px}
.pl-st b{font:800 15px var(--pl-cd);display:flex;gap:1px;align-items:center;color:#8F97A6}
.pl-st b i{font-style:normal;cursor:pointer;padding:3px 2px;color:#F5F1E6;opacity:.55}.pl-st b i.on{opacity:1;color:var(--pl-gold);box-shadow:inset 0 -2px 0 var(--pl-gold)}
.pl-flact{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}
.pl-flact button{all:unset;cursor:pointer;border:1px solid rgba(245,241,230,.14);border-radius:8px;padding:7px 10px;font:800 10px var(--pl-cd);letter-spacing:.16em;color:#C9D6E2}
.pl-flact button.on{color:var(--pl-gold);border-color:rgba(217,178,106,.5)}
.pl-addf{all:unset;box-sizing:border-box;cursor:pointer;width:100%;margin-top:10px;border:1.5px dashed rgba(217,178,106,.55);border-radius:14px;padding:12px;display:flex;justify-content:space-between;align-items:center;gap:8px}
.pl-addf b{font:800 12.5px var(--pl-cd);letter-spacing:.22em;color:var(--pl-gold)}.pl-addf span{font:800 9.5px var(--pl-cd);letter-spacing:.16em;color:#9C8D6C}
.pl-edfoot{display:flex;gap:10px;margin-top:16px}
.pl-btn1{all:unset;cursor:pointer;flex:1;height:52px;display:grid;place-items:center;font:800 14px var(--pl-cd);letter-spacing:.22em;color:#14100A;background:linear-gradient(180deg,#F0D398,#B88D45);clip-path:polygon(4% 0,96% 0,100% 50%,96% 100%,4% 100%,0 50%)}
.pl-edrun .pl-btn1{background:linear-gradient(180deg,#8FF0BE,#2E9A62);color:#06140C}.pl-edrow .pl-btn1{background:linear-gradient(180deg,#9FDCF8,#2C8FC8);color:#061018}
.pl-btn2{all:unset;cursor:pointer;height:52px;padding:0 14px;display:grid;place-items:center;border:1.5px dashed rgba(245,241,230,.35);border-radius:14px;font:800 11px var(--pl-cd);letter-spacing:.18em;color:#C9D6E2;white-space:nowrap}
.pl-chips{display:flex;gap:6px;margin-top:12px;flex-wrap:wrap}
.pl-chips button{all:unset;cursor:pointer;border:1px solid rgba(245,241,230,.13);border-radius:999px;padding:6px 10px;font:800 10.5px var(--pl-cd);letter-spacing:.12em;color:#9AA2AE}
.pl-chips button.on{color:var(--c);border-color:color-mix(in srgb,var(--c) 55%,transparent);background:color-mix(in srgb,var(--c) 10%,transparent)}
.pl-route{display:flex;gap:3px;height:58px;align-items:flex-end;margin-top:14px}
.pl-route i{display:block;border-radius:5px 5px 2px 2px;min-width:3px}
.pl-route i.w{background:color-mix(in srgb,var(--c) 30%,#1E2A26);height:24px}.pl-route i.e{background:color-mix(in srgb,var(--c) 25%,#1A2520);height:18px}
.pl-route i.s{background:linear-gradient(180deg,color-mix(in srgb,var(--c) 75%,#fff 0%),color-mix(in srgb,var(--c) 55%,#000));height:38px}
.pl-route i.h{background:linear-gradient(180deg,color-mix(in srgb,var(--c) 85%,#fff),color-mix(in srgb,var(--c) 60%,#000));height:56px;box-shadow:0 0 10px color-mix(in srgb,var(--c) 40%,transparent)}
.pl-rlab{display:flex;justify-content:space-between;gap:6px;margin-top:5px;font:800 9px var(--pl-cd);letter-spacing:.14em;color:#7E8796}
.pl-fields{margin-top:8px;display:flex;flex-direction:column;gap:8px}
.pl-fields .runf{display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;border:1px solid rgba(245,241,230,.1);border-radius:12px;padding:10px;background:rgba(255,255,255,.025)}
.pl-fields label{font:800 9.5px var(--pl-cd);letter-spacing:.14em;color:#8F97A6;display:flex;flex-direction:column;gap:5px;text-transform:uppercase}
.pl-fields select,.pl-fields input:not([type=checkbox]){background:#11151D;color:#F5F1E6;border:1px solid rgba(245,241,230,.16);border-radius:9px;padding:8px 9px;font:600 14px Barlow,sans-serif;text-transform:none;letter-spacing:0}
.pl-fields .step{display:flex;align-items:center;gap:6px}.pl-fields .step button{background:rgba(255,255,255,.07);color:#C9D6E2;border:0;border-radius:8px;width:30px;height:30px;font-size:16px}
.pl-fields .step b{color:#F5F1E6;font:800 15px var(--pl-cd);min-width:44px;text-align:center}
.pl-fields .plan-box{background:rgba(255,255,255,.03);border:1px solid rgba(245,241,230,.1);border-radius:10px;padding:9px 10px;color:#C9D6E2}
.pl-fields .seg{background:rgba(7,11,19,.8);border-color:rgba(245,241,230,.13)}
.pl-fields .small,.pl-fields p{color:#9AA2AE}
.pl-f{flex-direction:row!important;justify-content:space-between;align-items:center!important;border:1px solid rgba(245,241,230,.1);border-radius:12px;padding:10px 12px;background:rgba(255,255,255,.025)}
.pl-fin{display:flex;align-items:center;gap:6px}.pl-fin input{width:90px;text-align:right}.pl-fin em{font-style:normal;color:#7E8796;font:700 11px var(--pl-cd);letter-spacing:.1em;min-width:44px}
.pl-chk{flex-direction:row!important;align-items:center!important;gap:8px!important;font:600 13px Barlow,sans-serif!important;letter-spacing:0!important;text-transform:none!important;color:#C9D6E2!important;padding:4px 2px}
.pl-hint{font:500 12.5px Barlow,sans-serif;color:#8F97A6;margin:0 2px}
.pl-seg2{display:flex;gap:6px}.pl-seg2 button{all:unset;cursor:pointer;flex:1;text-align:center;border:1px solid rgba(245,241,230,.14);border-radius:10px;padding:9px 0;font:800 10.5px var(--pl-cd);letter-spacing:.16em;color:#9AA2AE}.pl-seg2 button.on{color:var(--c);border-color:color-mix(in srgb,var(--c) 55%,transparent);background:color-mix(in srgb,var(--c) 10%,transparent)}
`; document.head.appendChild(st) })();
