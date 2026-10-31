/* Travel mode: turn a day's gym workout into a dumbbell-only or bodyweight-only one.
   Each exercise is swapped for one with the same movement pattern (a press stays a press, a row stays a row),
   and the version is picked from your own numbers: your best recent lifts against your body weight.
   Benching 100 lb at 250 lb body weight → incline or wall push-ups, not regular ones.
   Rule-based and on the phone: no API credits, works offline.
   State: S.profile.travel = {days:{date:{mode:"db"|"bw", bar, express, max}}, max, adj:{pattern:±n}} */

// [id, name, muscle, equipment, type, one dumbbell]   type br = bodyweight reps (no weight box)
const TRAVEL_LIB = [
  ["dbfloor", "Floor Press (Dumbbell)", "Chest", "Dumbbell", "w"],
  ["wallpu", "Wall Push-Up", "Chest", "Bodyweight", "br"], ["inclpu", "Incline Push-Up (hands on bench)", "Chest", "Bodyweight", "br"],
  ["kneepu", "Knee Push-Up", "Chest", "Bodyweight", "br"], ["declpu", "Decline Push-Up (feet on bench)", "Chest", "Bodyweight", "br"],
  ["archerpu", "Archer Push-Up", "Chest", "Bodyweight", "br"], ["inclwide", "Wide Incline Push-Up (slow)", "Chest", "Bodyweight", "br"],
  ["widepu", "Wide Push-Up (slow)", "Chest", "Bodyweight", "br"],
  ["pikebench", "Pike Push-Up (hands on bench)", "Shoulders", "Bodyweight", "br"], ["pike", "Pike Push-Up", "Shoulders", "Bodyweight", "br"],
  ["elevpike", "Feet-Elevated Pike Push-Up", "Shoulders", "Bodyweight", "br"], ["hspuneg", "Wall Handstand Push-Up Negative", "Shoulders", "Bodyweight", "br"],
  ["proney", "Prone Y-Raise", "Shoulders", "Bodyweight", "br"], ["wallslide", "Wall Slide (slow)", "Shoulders", "Bodyweight", "br"],
  ["pronet", "Prone T-Raise", "Shoulders", "Bodyweight", "br"], ["dbuprow", "Upright Row (Dumbbell)", "Shoulders", "Dumbbell", "w"],
  ["doorrow", "Door Towel Row", "Back", "Bodyweight", "br"], ["tablerow", "Table Row (knees bent)", "Back", "Bodyweight", "br"],
  ["tablerowst", "Table Row (legs straight)", "Back", "Bodyweight", "br"], ["tablerowfe", "Table Row (feet raised)", "Back", "Bodyweight", "br"],
  ["doorrowlat", "Door Towel Row, Elbows Down (lats)", "Back", "Bodyweight", "br"], ["floorpull", "Sliding Floor Pulldown", "Back", "Bodyweight", "br"],
  ["pullneg", "Pull-Up Negative (5-sec lower)", "Back", "Bodyweight", "br"], ["dbpullover", "Pullover (Dumbbell)", "Back", "Dumbbell", "w", 1],
  ["scappu", "Scapular Push-Up", "Back", "Bodyweight", "br"], ["superman", "Superman Hold", "Back", "Bodyweight", "t"],
  ["doorcurl", "Doorframe Towel Curl", "Biceps", "Bodyweight", "br"], ["towelcurl", "Towel Curl Hold (isometric)", "Biceps", "Bodyweight", "t"],
  ["benchdipb", "Bench Dip (knees bent)", "Triceps", "Bodyweight", "br"], ["benchdip", "Bench Dip (legs straight)", "Triceps", "Bodyweight", "br"],
  ["diamondpu", "Diamond Push-Up", "Triceps", "Bodyweight", "br"], ["dbskull", "Skull Crusher (Dumbbell)", "Triceps", "Dumbbell", "w"],
  ["boxsquat", "Bodyweight Squat to Box", "Quads", "Bodyweight", "br"], ["bwsquat", "Bodyweight Squat (3-sec lower)", "Quads", "Bodyweight", "br"],
  ["splitsq", "Split Squat (bodyweight)", "Quads", "Bodyweight", "br"], ["bss", "Bulgarian Split Squat (bodyweight)", "Quads", "Bodyweight", "br"],
  ["pistolbox", "Pistol Squat to Box", "Quads", "Bodyweight", "br"], ["pistol", "Pistol Squat", "Quads", "Bodyweight", "br"],
  ["heelsq", "Heels-Elevated Squat (slow)", "Quads", "Bodyweight", "br"], ["sissyassist", "Assisted Sissy Squat", "Quads", "Bodyweight", "br"],
  ["sissy", "Sissy Squat", "Quads", "Bodyweight", "br"], ["heelgoblet", "Heels-Elevated Goblet Squat", "Quads", "Dumbbell", "w", 1],
  ["gmbw", "Bodyweight Good Morning (slow)", "Hamstrings", "Bodyweight", "br"], ["slrdl", "Single-Leg RDL (bodyweight)", "Hamstrings", "Bodyweight", "br"],
  ["dbslrdl", "Single-Leg RDL (Dumbbell)", "Hamstrings", "Dumbbell", "w", 1], ["slidecurl", "Sliding Leg Curl (towel)", "Hamstrings", "Bodyweight", "br"],
  ["slidecurl1", "Single-Leg Sliding Leg Curl", "Hamstrings", "Bodyweight", "br"], ["nordicneg", "Nordic Curl Negative", "Hamstrings", "Bodyweight", "br"],
  ["dblegcurl", "Lying Leg Curl (Dumbbell)", "Hamstrings", "Dumbbell", "w", 1],
  ["slbridge", "Single-Leg Glute Bridge", "Glutes", "Bodyweight", "br"], ["slthrust", "Single-Leg Hip Thrust", "Glutes", "Bodyweight", "br"],
  ["dbthrust", "Hip Thrust (Dumbbell)", "Glutes", "Dumbbell", "w", 1], ["sidelegraise", "Side-Lying Leg Raise", "Glutes", "Bodyweight", "br"],
  ["donkeykick", "Donkey Kick", "Glutes", "Bodyweight", "br"], ["copenhagen", "Copenhagen Plank", "Glutes", "Bodyweight", "t"],
  ["dbswing", "Dumbbell Swing", "Glutes", "Dumbbell", "w", 1],
  ["bwcalf", "Calf Raise (bodyweight, pause at top)", "Calves", "Bodyweight", "br"], ["slcalf", "Single-Leg Calf Raise", "Calves", "Bodyweight", "br"],
  ["dbslcalf", "Single-Leg Calf Raise (Dumbbell)", "Calves", "Dumbbell", "w", 1],
  ["suitcase", "Suitcase Hold (Dumbbell)", "Core", "Dumbbell", "tw", 1], ["farmerhold", "Farmer's Hold (Dumbbell)", "Forearms", "Dumbbell", "tw"]
];

/* Movement patterns. part/rate: which strength (from the rank engine, in reference-lift pounds) the variants are
   judged against, and how much of it this movement can use. ladder: bodyweight versions, easiest first, with the
   share of body weight each one moves. db: dumbbell versions in order of preference; dbHeavy: the single-limb one
   to switch to when the heaviest dumbbells are too light. def: strength ÷ body weight to assume with no history. */
const TV_PAT = {
  hpush: { name: "chest press", part: "chest", rate: 1, def: 0.75, db: ["dbbench", "dbfloor", "incline"], ladder: [["wallpu", .25], ["inclpu", .41], ["kneepu", .49], ["pushup", .64], ["declpu", .70], ["archerpu", .85]] },
  fly: { name: "chest fly", part: "chest", rate: 1, def: 0.75, db: ["dbfly", "dbfloor"], ladder: [["inclwide", .38], ["widepu", .6]], reps: [12, 20] },
  vpush: { name: "overhead press", part: "shoulders", rate: 1, def: 0.5, db: ["dbpress", "arnold"], ladder: [["pikebench", .33], ["pike", .45], ["elevpike", .6], ["hspuneg", .85]] },
  side: { name: "side delts", db: ["lateral", "dbuprow", "frontraise"], bw: ["proney", "wallslide"], reps: [12, 20] },
  rear: { name: "rear delts", db: ["dbrevfly", "lateral"], bw: ["pronet", "proney"], reps: [12, 20] },
  hpull: { name: "row", part: "row", rate: 1, def: 0.6, db: ["onearmrow", "dbrow"], ladder: [["doorrow", .3], ["tablerow", .45], ["tablerowst", .6], ["tablerowfe", .72]] },
  vpull: { name: "pulldown", part: "pull", db: ["dbpullover", "onearmrow"], bw: ["doorrowlat", "floorpull", "doorrow"], reps: [8, 15] },
  shrug: { name: "traps", db: ["shrug"], bw: ["scappu"], reps: [10, 15] },
  biceps: { name: "biceps", db: ["curl", "hammer", "inclinecurl", "conc"], bw: ["doorcurl", "towelcurl"], reps: [10, 15] },
  triceps: { name: "triceps", part: "triceps", rate: 1, def: 0.6, db: ["dbohtri", "kickback", "dbskull"], ladder: [["benchdipb", .4], ["benchdip", .55], ["diamondpu", .62]] },
  squat: { name: "squat", part: "quads", rate: 1, def: 0.9, db: ["goblet", "split", "lunge", "stepup"], dbHeavy: "split", ladder: [["boxsquat", .55], ["bwsquat", .65], ["splitsq", .85], ["bss", 1.0], ["pistolbox", 1.2], ["pistol", 1.4]] },
  kneeext: { name: "quads", part: "quads", rate: 0.7, def: 0.9, db: ["heelgoblet", "split", "stepup"], ladder: [["heelsq", .35], ["sissyassist", .5], ["sissy", .7]] },
  hinge: { name: "hinge", part: "hams", rate: 1, def: 1.1, db: ["dbrdl", "dbslrdl"], dbHeavy: "dbslrdl", ladder: [["gmbw", .3], ["slrdl", .55]] },
  hamcurl: { name: "hamstring curl", part: "hams", rate: 0.45, def: 1.1, db: ["dblegcurl", "dbslrdl"], ladder: [["slidecurl", .25], ["slidecurl1", .45], ["nordicneg", .7]] },
  glute: { name: "glutes", part: "hams", rate: 1.4, def: 1.1, db: ["dbthrust", "dbslrdl"], ladder: [["glutebridge", .7], ["slbridge", 1.2], ["slthrust", 1.5]] },
  hipside: { name: "hips", db: ["sidelegraise", "donkeykick", "copenhagen"], bw: ["sidelegraise", "donkeykick", "copenhagen"], reps: [12, 20] },
  calves: { name: "calves", part: "calves", rate: 1, def: 1.0, db: ["dbslcalf"], ladder: [["bwcalf", 1.0], ["slcalf", 2.0]] },
  crunch: { name: "abs", db: ["crunch", "legraise"], bw: ["crunch", "legraise"] },
  antirot: { name: "core", db: ["suitcase", "sideplank", "deadbug"], bw: ["sideplank", "deadbug", "russian"] },
  hang: { name: "hanging core", bar: true, db: ["legraise", "deadbug"], bw: ["legraise", "deadbug"] },
  grip: { name: "grip", bar: true, db: ["farmerhold", "wristcurl"], bw: ["plank"] },
  backext: { name: "lower back", db: ["superman", "dbslrdl"], bw: ["superman"] },
  cardio: { name: "conditioning", db: ["burpee", "mountain"], bw: ["burpee", "mountain"] },
};
const TV_OF = {
  bench: "hpush", dbbench: "hpush", inclinebb: "hpush", incline: "hpush", declinebench: "hpush", smithbench: "hpush", chestpress: "hpush", pushup: "hpush", dips: "hpush", dbfloor: "hpush",
  fly: "fly", dbfly: "fly", cablecross: "fly",
  ohp: "vpush", dbpress: "vpush", machpress: "vpush", arnold: "vpush",
  lateral: "side", cablelat: "side", uprow: "side", frontraise: "side", dbuprow: "side",
  revfly: "rear", dbrevfly: "rear", facepull: "rear",
  cablerow: "hpull", dbrow: "hpull", onearmrow: "hpull", bbrow: "hpull", tbarrow: "hpull", machinerow: "hpull", invrow: "hpull",
  pulldown: "vpull", pullup: "vpull", chinup: "vpull", assistpull: "vpull", straightarm: "vpull", dbpullover: "vpull",
  shrug: "shrug",
  curl: "biceps", bbcurl: "biceps", ezcurl: "biceps", hammer: "biceps", conc: "biceps", preacher: "biceps", cablecurl: "biceps", inclinecurl: "biceps",
  pushdown: "triceps", ropepush: "triceps", ohtri: "triceps", dbohtri: "triceps", skull: "triceps", cgbench: "triceps", tridip: "triceps", kickback: "triceps",
  squat: "squat", frontsquat: "squat", goblet: "squat", hack: "squat", smithsquat: "squat", legpress: "squat", legpress45: "squat", split: "squat", lunge: "squat", stepup: "squat",
  legext: "kneeext", legext1: "kneeext",
  rdl: "hinge", dbrdl: "hinge", deadlift: "hinge", tbdl: "hinge", goodmorning: "hinge", kbswing: "hinge",
  legcurl: "hamcurl", lyingcurl: "hamcurl", nordic: "hamcurl",
  hipthrust: "glute", machthrust: "glute", glutebridge: "glute",
  cablekick: "hipside", abductor: "hipside", adductor: "hipside",
  calfraise: "calves", seatedcalf: "calves", tiltcalf: "calves", legpresscalf: "calves",
  cablecrunch: "crunch", declinecrunch: "crunch",
  pallof: "antirot", pallofhold: "antirot", woodchop: "antirot", abwheel: "antirot",
  hangleg: "hang", deadhang: "grip", wristcurl: "grip",
  backext: "backext", rowerg: "cardio",
};
// fine anywhere: kept as they are
const TV_KEEP = new Set(["plank", "sideplank", "crunch", "legraise", "deadbug", "russian", "burpee", "mountain", "jumprope", "rope"]);
const TV_MUSCLE = { Chest: "hpush", Back: "hpull", Shoulders: "vpush", Biceps: "biceps", Triceps: "triceps", Quads: "squat", Hamstrings: "hinge", Glutes: "glute", Calves: "calves", Core: "crunch", Forearms: "grip", Cardio: "cardio" };
const TV_DB_EQUIP = new Set(["Dumbbell", "Bodyweight"]);
const TV_BAR_ONLY = new Set(["pullup", "chinup", "hangleg", "deadhang", "pullneg"]);

if (typeof EXLIB_RAW !== "undefined") TRAVEL_LIB.forEach(r => { if (!EXLIB_RAW.some(x => x[0] === r[0])) EXLIB_RAW.push(r) });
const TV_REST = {}; // "date|id" → rest seconds for swapped exercises
function tvState() { const P = S.profile; if (!P.travel || typeof P.travel !== "object") P.travel = {}; const T = P.travel; T.days = T.days || {}; T.adj = T.adj || {}; return T }
function tvDay(k) { const T = (S.profile && S.profile.travel) || null; return T && T.days && T.days[k] || null }
function tvLib(id) { return typeof libEx === "function" ? libEx(id) : null }
function tvBW(k) { let b = null; try { b = typeof rkBW === "function" ? rkBW(k) : null } catch (e) {} const su = S.profile && S.profile.setup; return Number(b) || Number(su && su.weight) || 180 }
const TV_SC = { key: "", at: 0, v: null };
// your best recent strength per rank part, in reference-lift terms (bench-equivalent pounds for chest, strict reps for pull-ups…)
function tvStrength(k) {
  const key = k + "|" + Object.keys(S.logs || {}).length; if (TV_SC.key === key && Date.now() - TV_SC.at < 4000) return TV_SC.v;
  const from = ymd(addDays(parseYmd(k), -120)), best = {};
  if (typeof rkSetEntries === "function") Object.entries(S.logs || {}).forEach(([d, l]) => {
    if (d >= k || d < from || !l || l.type !== "gym" || !l.ex) return;
    Object.entries(l.ex).forEach(([id, sets]) => (sets || []).forEach((s, i) => { try { rkSetEntries(d, l, id, s, i).forEach(e => { if (e.lad !== e.p) return; if (!(best[e.p] >= e.m)) best[e.p] = e.m }) } catch (_) {} }));
  });
  TV_SC.key = key; TV_SC.at = Date.now(); TV_SC.v = best; return best;
}
const tvReps = (cap, load) => load > 0 ? 30 * (cap / load - 1) : 99; // reps you could do at a load (Epley, turned around)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const tvRound = (w, step) => Math.max(step, Math.floor(w / step) * step);

function tvPatternOf(ex) { if (TV_OF[ex.id]) return TV_OF[ex.id]; const L = tvLib(ex.id); return L && TV_MUSCLE[L.muscle] || null }
// does this exercise already fit the mode?
function tvFits(ex, mode, bar) {
  if (TV_KEEP.has(ex.id) || ex.fixed) return true;
  if (TV_BAR_ONLY.has(ex.id)) return !!bar;
  if (mode === "db") { const L = tvLib(ex.id); return !!(L && TV_DB_EQUIP.has(L.equip) && L.equip === "Dumbbell") }
  return false;
}
// pick the swap for one exercise
function tvPick(ex, k, cfg, used) {
  const pat = tvPatternOf(ex), P = pat && TV_PAT[pat]; if (!P) return null;
  const mode = cfg.mode, bw = tvBW(k), str = tvStrength(k), adj = Number((tvState().adj || {})[mode + ":" + pat]) || 0;
  const out = { pat, adjustable: false };
  const free = ids => ids.filter(id => !used.has(id) && tvLib(id) && !(TV_BAR_ONLY.has(id) && !cfg.bar));
  // a pull-up bar opens the real thing
  if (cfg.bar && (pat === "vpull" || pat === "hang" || pat === "grip" || (pat === "biceps" && mode === "bw"))) {
    if (pat === "hang") return { ...out, id: "hangleg", lo: 8, hi: 15 };
    if (pat === "grip") return { ...out, id: "deadhang", lo: 30, hi: 60 };
    const pr = str.pull, P2 = pr == null ? 0 : pr, ids = pat === "biceps" ? ["chinup"] : P2 >= 5 ? ["pullup", "chinup", "pullneg"] : P2 >= 2 ? ["chinup", "pullneg", "pullup"] : ["pullneg", "chinup"];
    const id = free(ids)[0]; if (id) { const lo = id === "pullneg" ? 3 : clamp(Math.round(P2 * 0.6), 3, 12), hi = id === "pullneg" ? 5 : Math.max(lo + 2, clamp(Math.round(P2 * 0.85), 4, 15));
      return { ...out, id, lo, hi, guess: pr == null, why: pr == null ? "No pull-up history yet: start here" : `About ${Math.round(P2)} strict pull-ups in you` } }
  }
  if (mode === "bw" && P.ladder) {
    const lad = P.ladder.filter(([id]) => !used.has(id) && tvLib(id)); if (!lad.length) return null;
    let E = P.part ? str[P.part] : null; const guess = E == null; if (guess) E = P.def * bw;
    const cap = E * P.rate, R = lad.map(([, f]) => tvReps(cap, f * bw));
    let i = 0; R.forEach((r, j) => { if (r >= 8) i = j }); i = clamp(i + adj, 0, lad.length - 1);
    const r = Math.max(1, R[i]); let lo = clamp(Math.round(r * 0.55), 4, 20), hi = clamp(Math.round(r * 0.8), lo + 3, 25);
    if (P.reps) { lo = Math.max(lo, P.reps[0]); hi = Math.max(hi, lo + 3) }
    const top = i === lad.length - 1 && R[i] > 25, easy = i === 0 && R[0] < 6;
    return { ...out, id: lad[i][0], lo, hi, guess, adjustable: lad.length > 1, step: i, steps: lad.length,
      why: guess ? `No ${P.name} history yet, so this is a starting guess` : `Matched to your ${P.name} strength at ${Math.round(toU(bw))} ${uL()}`,
      tempo: top ? "Too easy even at the hardest version: 3 seconds down, 1-second pause at the bottom." : easy ? "Still tough? Cut the range a little and build up." : "" };
  }
  if (mode === "bw") { const id = free(P.bw || [])[0]; if (!id) return null; const L = tvLib(id), t = L && (L.type === "t" || L.type === "tw");
    return { ...out, id, lo: t ? 30 : (P.reps || [10, 15])[0], hi: t ? 60 : (P.reps || [10, 15])[1] } }
  // dumbbells
  let ids = free(P.db || []); if (!ids.length) return null; let id = ids[0];
  const res = { ...out, id, lo: ex.lo, hi: ex.hi };
  const max = Number(cfg.max) || Number(tvState().max) || 0, E = P.part ? str[P.part] : null;
  const rate = id => { const c = (RKC().conv[id] || []).find(c => c.p === P.part); return c ? c.r : null };
  const sug = id => { const r = rate(id), L = tvLib(id); if (E == null || r == null || !L) return null; const per = E * r / (L.uni ? 1 : 2); return { per, w: per / (1 + ex.lo / 30) } };
  let s = sug(id);
  if (s && max > 0 && s.w > max + 0.01) {
    let R = tvReps(s.per, max);
    if (R > 20 && P.dbHeavy && !used.has(P.dbHeavy) && P.dbHeavy !== id && sug(P.dbHeavy)) { id = res.id = P.dbHeavy; s = sug(id); R = tvReps(s.per, max); res.swapHeavy = true }
    if (s.w > max + 0.01) { res.lo = clamp(Math.round(R * 0.6), ex.lo, 20); res.hi = clamp(Math.round(R * 0.8), res.lo + 3, 25); res.sugW = max;
      res.tempo = `Your heaviest dumbbells are ${toU(max)} ${uL()}: more reps and a 3-second lower to match the effort.`; }
    else res.sugW = tvRound(s.w, UNIT() === "kg" ? fromU(2) : 5);
  } else if (s) res.sugW = Math.min(max > 0 ? max : 1e9, tvRound(s.w, UNIT() === "kg" ? fromU(2) : 5));
  if (res.sugW) res.why = `Converted from your ${P.name} strength`;
  return res;
}
// rebuild a gym day for travel. Exercises you've already logged that day stay as logged.
function travelPlan(p, k) {
  const cfg = tvDay(k); if (!cfg || !cfg.mode || !p || p.type !== "gym" || !p.ex) return p;
  const l = S.logs[k], logged = new Set(l && l.type === "gym" && l.ex ? Object.keys(l.ex) : []), used = new Set();
  p.ex.forEach(e => { if (logged.has(e.id) || tvFits(e, cfg.mode, cfg.bar)) used.add(e.id) });
  let ex = p.ex.map(e => {
    if (logged.has(e.id) || tvFits(e, cfg.mode, cfg.bar)) return e;
    const c = tvPick(e, k, cfg, used); if (!c) return e;
    used.add(c.id);
    const rest0 = e.rest || (CUSTOM && CUSTOM.rest && CUSTOM.rest[e.id]) || (typeof REST !== "undefined" && REST[e.id]) || 90;
    const L = tvLib(c.id), base = typeof toPlanEx === "function" ? toPlanEx({ id: c.id, sets: e.sets, lo: c.lo, hi: c.hi, rest: rest0 }) : { id: c.id, name: L.name, sets: e.sets, lo: c.lo, hi: c.hi, rest: rest0 };
    TV_REST[k + "|" + c.id] = rest0;
    const msg = [c.sugW ? `Start around ${toU(c.sugW)} ${uL()}${L && L.equip === "Dumbbell" && !L.uni ? " per dumbbell" : ""}.` : "", c.why ? c.why + "." : "", c.tempo || ""].filter(Boolean).join(" ");
    return { ...base, ...(e.ss ? { ss: e.ss } : {}), lo: c.lo != null ? c.lo : base.lo, hi: c.hi != null ? c.hi : base.hi, sets: e.sets,
      travel: { mode: cfg.mode, from: e.id, fromName: e.name, pat: c.pat, adjustable: c.adjustable, step: c.step, steps: c.steps, guess: !!c.guess, msg }, sugW: c.sugW || null };
  });
  if (cfg.express) {
    const PRI = ["hpush", "vpush", "hpull", "vpull", "squat", "hinge", "glute"];
    const pri = e => { const pt = e.travel ? e.travel.pat : tvPatternOf(e); return PRI.includes(pt) ? 0 : 1 };
    if (ex.length > 5) { const keep = new Set(ex.map((e, i) => [pri(e), i]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).slice(0, 5).map(x => x[1])); ex = ex.filter((e, i) => keep.has(i) || logged.has(e.id)) }
    ex = ex.map(e => { if (logged.has(e.id)) return e; const r = pri(e) ? 45 : 60; TV_REST[k + "|" + e.id] = r; return { ...e, sets: Math.min(e.sets, 2), rest: r, express: true } });
  }
  return { ...p, ex, travel: cfg };
}
const tvRest = (k, id) => tvDay(k) ? TV_REST[k + "|" + id] || null : null; // rest timer follows the swapped / express rests

/* ---------- Screens ---------- */
function travelBar(p, k, log) {
  const cfg = tvDay(k) || {}, mode = cfg.mode || "", locked = !!log;
  const seg = [["", "Gym"], ["db", "Dumbbells"], ["bw", "Bodyweight"]].map(([m, n]) => `<button type="button" class="${mode === m ? "on" : ""}" data-tvmode="${m}" aria-pressed="${mode === m}" ${locked && mode !== m ? "disabled" : ""}>${n}</button>`).join("");
  let h = `<div class="tv-bar"><span class="small muted">Training at</span><div class="tv-seg" role="group" aria-label="Where you're training today">${seg}</div></div>`;
  if (mode) {
    const max = cfg.max || tvState().max || "";
    h += `<div class="tv-opts">${mode === "db" ? `<label class="tv-max"><span>Heaviest dumbbells</span><input id="tvMax" inputmode="decimal" value="${max ? esc(toU(max)) : ""}" placeholder="e.g. 50" ${locked ? "disabled" : ""}><span>${uL()}</span></label>` : ""}
      <label class="dbt ${cfg.bar ? "on" : ""}"><input type="checkbox" data-tvopt="bar" ${cfg.bar ? "checked" : ""} ${locked ? "disabled" : ""}>Pull-up bar</label>
      <label class="dbt ${cfg.express ? "on" : ""}"><input type="checkbox" data-tvopt="express" ${cfg.express ? "checked" : ""} ${locked ? "disabled" : ""}>Express ~30 min</label></div>`;
    h += `<p class="small muted" style="margin:0">${mode === "db" ? "Dumbbell-only" : "No-equipment"} version of ${esc(p.name)}: same muscles, same order${cfg.express ? ", 2 sets each and shorter rests" : ""}.${mode === "db" && !max ? " Add your heaviest dumbbells to get starting weights." : ""}</p>`;
  }
  return h;
}
function travelExLine(ex) {
  const t = ex.travel; if (!t) return "";
  const adj = t.adjustable ? `<span class="tv-adj"><button type="button" class="link small" data-tvadj="${t.mode}:${t.pat}|-1" ${t.step === 0 ? "disabled" : ""}>Easier</button><button type="button" class="link small" data-tvadj="${t.mode}:${t.pat}|1" ${t.step === t.steps - 1 ? "disabled" : ""}>Harder</button></span>` : "";
  return `<div class="tv-from"><span class="small">Instead of <b>${esc(t.fromName)}</b></span>${adj}</div>` }

/* ---------- Taps ---------- */
function tvSet(k, patch) { const T = tvState(), cur = { ...(T.days[k] || {}) }; Object.assign(cur, patch); if (!cur.mode) delete T.days[k]; else T.days[k] = cur;
  const cut = ymd(addDays(today, -45)); Object.keys(T.days).forEach(d => { if (d < cut && !S.logs[d]) delete T.days[d] }); saveProfile() }
document.addEventListener("click", e => {
  const t = e.target.closest && e.target.closest("button"); if (!t) return; const d = t.dataset, redo = () => { lastRenderKey = ""; render() };
  if (d.tvmode != null) { const k = ymd(sel); if (S.logs[k]) return; const T = tvState(), cur = T.days[k] || {};
    tvSet(k, d.tvmode ? { mode: d.tvmode, max: cur.max || T.max || undefined } : { mode: "" });
    Object.keys(drafts).forEach(x => { if (x.startsWith(k + "|") && /^(w|r|m|c|st|xs)-/.test(x.slice(k.length + 1))) delete drafts[x] }); persistDrafts();
    redo(); if (d.tvmode) toast(d.tvmode === "db" ? "Dumbbell workout: same muscles as your gym day" : "Bodyweight workout: same muscles as your gym day"); return }
  if (d.tvadj) { const [key, n] = d.tvadj.split("|"), T = tvState(); T.adj[key] = clamp((Number(T.adj[key]) || 0) + Number(n), -5, 5); saveProfile(); redo(); return }
});
document.addEventListener("change", e => {
  const el = e.target; if (!el) return; const k = ymd(sel);
  if (el.dataset && el.dataset.tvopt) { tvSet(k, { [el.dataset.tvopt]: el.checked }); lastRenderKey = ""; render(); return }
  if (el.id === "tvMax") { const v = fromU(Number(el.value) || 0); const T = tvState(); if (v > 0) T.max = v; tvSet(k, { max: v > 0 ? v : undefined }); lastRenderKey = ""; render() }
});

(() => { const st = document.createElement("style"); st.textContent = `
.tv-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:6px 0 2px}
.tv-seg{display:inline-flex;background:var(--surface-2);border:1px solid var(--line);border-radius:999px;padding:3px;gap:2px}
.tv-seg button{border:0;background:none;color:var(--muted);font:650 13px var(--body);padding:6px 12px;border-radius:999px;cursor:pointer}
.tv-seg button.on{background:var(--surface);color:var(--ink);box-shadow:0 1px 3px rgba(10,16,30,.15)}.tv-seg button:disabled{opacity:.45;cursor:default}
.tv-opts{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:4px 0}
.tv-max{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:999px;padding:3px 10px;background:var(--surface);font:600 12.5px var(--body)}
.tv-max input{width:52px;border:0;background:transparent;font:700 15px var(--body);color:var(--ink);text-align:center;padding:2px 0}
.tv-from{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin:-2px 0 2px;color:var(--muted)}
.tv-adj{display:inline-flex;gap:12px}.tv-adj button:disabled{opacity:.4}`; document.head.appendChild(st) })();
