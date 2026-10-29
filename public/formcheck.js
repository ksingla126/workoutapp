/* =======================================================================================
   Form check, on the phone.
   A pose model (MediaPipe Pose Landmarker, served from /pose/) tracks 33 body points in every
   sampled frame of the person's video. The points become joint angles over time, the set is split
   into reps, and each rep is checked against simple rules for that movement pattern. Nothing is
   uploaded and no AI service is called: it's free, private and works offline once cached.
   ======================================================================================= */
(function (G) {
"use strict";
const POSE_VER = "0.10.21";
const POSE_FILES = ["/pose/vision_bundle.mjs", "/pose/wasm/vision_wasm_internal.js", "/pose/wasm/vision_wasm_internal.wasm", "/pose/pose_landmarker_lite.task"];
const FPS = 10, MAX_SEC = 30;

/* ---------- which rules each exercise gets ---------- */
const PATTERN_OF = {};
const P = (pat, ids) => ids.split(" ").forEach(id => PATTERN_OF[id] = pat);
P("squat", "squat frontsquat goblet hack smithsquat");
P("hinge", "deadlift tbdl rdl dbrdl goodmorning kbswing backext");
P("bridge", "hipthrust machthrust glutebridge");
P("lunge", "split lunge stepup");
P("hpress", "bench dbbench incline inclinebb declinebench smithbench cgbench pushup");
P("dip", "dips tridip");
P("vpress", "ohp dbpress arnold");
P("row", "bbrow tbarrow onearmrow dbrow cablerow invrow");
P("vpull", "pullup chinup pulldown assistpull");
P("curl", "curl bbcurl ezcurl hammer conc preacher cablecurl inclinecurl");
P("tri", "pushdown ropepush ohtri dbohtri skull kickback");
P("raise", "lateral cablelat frontraise dbrevfly revfly uprow facepull");
P("legraise", "hangleg legraise");
P("hold", "plank sideplank");
P("none", "wristcurl pallof pallofhold cablecrunch rowerg jumprope deadhang");
// everything else (machines, accessories, custom exercises) gets the basic checks
const MUSCLE_BASIC = { Cardio: "none", Forearms: "none" };
function patternFor(id, muscle) { return PATTERN_OF[id] || MUSCLE_BASIC[muscle] || "basic"; }

// sig: the signal that cycles once per rep; turn: whether the turnaround is its max or min;
// concFirst: the lifting part comes before the turnaround (curls, rows) or after it (squats, bench)
const CFG = {
  squat:   { sig: "hipY",       turn: "max", concFirst: false, need: ["S", "H", "K", "A"], view: "side" },
  lunge:   { sig: "hipY",       turn: "max", concFirst: false, need: ["S", "H", "K", "A"], view: "side" },
  hinge:   { sig: "hipAng",     turn: "min", concFirst: false, need: ["S", "H", "K", "A"], view: "side" },
  bridge:  { sig: "hipAng",     turn: "max", concFirst: true,  need: ["S", "H", "K"],      view: "side" },
  hpress:  { sig: "elbowAng",   turn: "min", concFirst: false, need: ["S", "E", "W"],      view: "side" },
  dip:     { sig: "elbowAng",   turn: "min", concFirst: false, need: ["S", "E", "W"],      view: "side" },
  vpress:  { sig: "wristY",     turn: "min", concFirst: true,  need: ["S", "E", "W", "H"], view: "side" },
  row:     { sig: "elbowAng",   turn: "min", concFirst: true,  need: ["S", "E", "W", "H"], view: "side" },
  vpull:   { sig: "elbowAng",   turn: "min", concFirst: true,  need: ["S", "E", "W"],      view: "any" },
  curl:    { sig: "elbowAng",   turn: "min", concFirst: true,  need: ["S", "E", "W", "H"], view: "side" },
  tri:     { sig: "elbowAng",   turn: "max", concFirst: true,  need: ["S", "E", "W"],      view: "side" },
  raise:   { sig: "shoulderAng",turn: "max", concFirst: true,  need: ["S", "E", "H"],      view: "any" },
  legraise:{ sig: "hipAng",     turn: "min", concFirst: true,  need: ["S", "H", "K"],      view: "side" },
  hold:    { hold: true,                                       need: ["S", "H", "A"],      view: "side" },
  basic:   { auto: true,                                       need: [],                   view: "any" }
};
const JOINT_NAME = { S: "shoulders", E: "elbows", W: "wrists", H: "hips", K: "knees", A: "ankles" };
const IDX = { l: { S: 11, E: 13, W: 15, H: 23, K: 25, A: 27, He: 29, F: 31 }, r: { S: 12, E: 14, W: 16, H: 24, K: 26, A: 28, He: 30, F: 32 } };

/* ---------- geometry ---------- */
const deg = r => r * 180 / Math.PI;
function ang(a, b, c) { // angle at b, degrees
  const v1x = a.x - b.x, v1y = a.y - b.y, v2x = c.x - b.x, v2y = c.y - b.y;
  const d = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y); if (!d) return null;
  return deg(Math.acos(Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / d))));
}
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const fromVertical = (top, bottom) => deg(Math.atan2(Math.abs(top.x - bottom.x), bottom.y - top.y)); // 0 = top straight above bottom
function pct(arr, p) { const a = arr.filter(x => x != null).sort((x, y) => x - y); if (!a.length) return null; return a[Math.min(a.length - 1, Math.max(0, Math.round((p / 100) * (a.length - 1))))]; }
const median = a => pct(a, 50);
function smooth(arr, w) { // centred moving average that skips gaps
  return arr.map((_, i) => { let s = 0, n = 0; for (let j = i - w; j <= i + w; j++) if (arr[j] != null) { s += arr[j]; n++; } return n ? s / n : null; });
}
function fill(arr) { // carry values across short gaps so reps don't split on a missed frame
  const out = arr.slice(); let last = null;
  for (let i = 0; i < out.length; i++) { if (out[i] == null) out[i] = last; else last = out[i]; }
  let next = null; for (let i = out.length - 1; i >= 0; i--) { if (out[i] == null) out[i] = next; else next = out[i]; }
  return out;
}

/* ---------- per-frame features ---------- */
// frames: [{t, lm:[{x,y,v}] in pixels | null}]
function features(frames, side) {
  const I = IDX[side], O = IDX[side === "l" ? "r" : "l"];
  return frames.map(f => {
    if (!f.lm) return { t: f.t, ok: false };
    const p = k => f.lm[I[k]], q = k => f.lm[O[k]];
    const S = p("S"), E = p("E"), W = p("W"), H = p("H"), K = p("K"), A = p("A"), He = p("He"), F = p("F");
    const torso = dist(S, H) || 1;
    return {
      t: f.t, ok: true, S, E, W, H, K, A, He, F, N: f.lm[0], torso, vis: { S: S.v, E: E.v, W: W.v, H: H.v, K: K.v, A: A.v },
      hipY: H.y, wristY: W.y, shY: S.y,
      kneeAng: ang(H, K, A), hipAng: ang(S, H, K), elbowAng: ang(S, E, W), shoulderAng: ang(H, S, E),
      torsoLean: fromVertical(S, H), bodyLine: ang(S, H, A),
      shWidth: Math.abs(f.lm[11].x - f.lm[12].x), kneeGap: Math.abs(f.lm[25].x - f.lm[26].x), ankleGap: Math.abs(f.lm[27].x - f.lm[28].x),
      oS: q("S"), oK: q("K")
    };
  });
}
function pickSide(frames) {
  let L = 0, R = 0;
  frames.forEach(f => { if (!f.lm) return; [11, 13, 15, 23, 25, 27].forEach(i => L += f.lm[i].v || 0); [12, 14, 16, 24, 26, 28].forEach(i => R += f.lm[i].v || 0); });
  return L >= R ? "l" : "r";
}
function viewOf(F) { // side-on, front-on or in between, from how wide the shoulders look against the torso
  const r = median(F.filter(f => f.ok).map(f => f.shWidth / f.torso));
  return r == null ? "side" : r < 0.38 ? "side" : r > 0.62 ? "front" : "angled";
}

/* ---------- rep detection ---------- */
function findReps(t, sig, turn, minRange) {
  const s = smooth(fill(sig), 2);
  const lo = pct(s, 5), hi = pct(s, 95); if (lo == null || hi - lo < minRange) return { reps: [], s, lo, hi };
  const r = hi - lo, isTurn = turn === "max" ? v => v > lo + 0.3 * r : v => v < hi - 0.3 * r, isBack = turn === "max" ? v => v < lo + 0.15 * r : v => v > hi - 0.15 * r;
  const better = turn === "max" ? (a, b) => a > b : (a, b) => a < b, startBetter = turn === "max" ? (a, b) => a < b : (a, b) => a > b;
  const reps = []; let phase = "out", startI = 0, turnI = -1;
  for (let i = 0; i < s.length; i++) {
    const v = s[i]; if (v == null) continue;
    if (phase === "out") {
      if (reps.length && reps[reps.length - 1].end == null) { const last = reps[reps.length - 1]; if (last.endCand == null || startBetter(v, s[last.endCand])) last.endCand = i; }
      if (startBetter(v, s[startI]) || isBack(v) && !isBack(s[startI])) startI = i;
      if (isTurn(v)) {
        if (reps.length && reps[reps.length - 1].end == null) { reps[reps.length - 1].end = reps[reps.length - 1].endCand; startI = reps[reps.length - 1].end; }
        phase = "in"; turnI = i;
      }
    } else {
      if (better(v, s[turnI])) turnI = i;
      if (isBack(v)) { reps.push({ start: startI, turn: turnI, end: null, endCand: i }); phase = "out"; startI = i; }
    }
  }
  if (reps.length && reps[reps.length - 1].end == null) reps[reps.length - 1].end = reps[reps.length - 1].endCand;
  const out = reps.filter(x => x.end != null && t[x.end] - t[x.start] >= 0.4).map(x => ({ start: x.start, turn: x.turn, end: x.end }));
  return { reps: out, s, lo, hi };
}

/* ---------- the analysis ---------- */
function analyze(frames, opt) {
  opt = opt || {};
  const pat = opt.pattern || "basic", C = CFG[pat] || CFG.basic, id = opt.id || "";
  const seen = frames.filter(f => f.lm).length;
  const res = { pattern: pat, reps: [], findings: [], verdict: "unclear", dur: frames.length ? frames[frames.length - 1].t : 0, frames: frames.length, seen };
  if (!frames.length || seen < frames.length * 0.5) { res.findings.push({ level: "fix", text: "Couldn't find a person in most of the video.", cue: "Film one set with your whole body in frame, in good light." }); return res; }
  const side = pickSide(frames), F = features(frames, side), view = viewOf(F); res.side = side; res.view = view;
  const ok = F.filter(f => f.ok);
  const H = opt.height || 1000;
  // can we see what these rules need?
  const hidden = C.need.filter(j => (median(ok.map(f => f.vis[j])) || 0) < 0.5);
  if (hidden.length) { res.findings.push({ level: "fix", text: `Couldn't see your ${hidden.map(j => JOINT_NAME[j]).join(" and ")} clearly.`, cue: "Film from the side, phone at hip height, with your whole body and the weight in frame." }); return res; }
  const add = (level, text, cue, rep) => res.findings.push({ level, text, cue: cue || "", rep: rep || null, t: rep ? res.reps[rep - 1].tt : null });
  const t = F.map(f => f.t), val = k => F.map(f => f.ok ? f[k] : null);
  const at = (i, k) => F[i] && F[i].ok ? F[i][k] : null;
  const viewNote = () => { if (C.view === "side" && view === "front") add("tip", "This looks like a front view, so depth and back angle are rough.", "For this lift, film from the side."); };

  /* holds (plank): no reps, just the body line */
  if (C.hold) {
    const lines = ok.map(f => { const sagSign = signedHip(f); return { dev: 180 - (f.bodyLine || 180), sag: sagSign }; }).filter(x => x.dev != null);
    const held = ok.length / FPS; res.hold = { sec: Math.round(held) };
    const devMed = median(lines.map(x => x.dev)) || 0, sagMed = median(lines.map(x => x.sag)) || 0;
    if (devMed > 12) { if (sagMed > 0) add("fix", `Hips sagging about ${Math.round(devMed)}° below a straight line.`, "Squeeze your glutes and brace like you're about to be poked in the stomach."); else add("fix", `Hips piked about ${Math.round(devMed)}° above a straight line.`, "Lower your hips until shoulders, hips and ankles line up."); }
    else add("good", `Straight body line held for about ${Math.round(held)} s.`);
    viewNote(); res.verdict = verdict(res); return res;
  }

  /* pick the signal: fixed per pattern, or whichever moves most (basic) */
  let sigKey = C.sig, turn = C.turn, concFirst = C.concFirst;
  if (C.auto) {
    const cands = [["elbowAng", 180], ["kneeAng", 180], ["hipAng", 180], ["shoulderAng", 180], ["hipY", H], ["wristY", H]];
    let best = null;
    cands.forEach(([k, scale]) => { const v = val(k), r = (pct(v, 95) - pct(v, 5)) / scale; if (isFinite(r) && (!best || r > best.r)) best = { k, r }; });
    sigKey = best ? best.k : "elbowAng";
    const v = val(sigKey), first = median(v.slice(0, Math.max(3, Math.round(FPS * 0.6)))), lo = pct(v, 5), hi = pct(v, 95);
    turn = first != null && Math.abs(first - hi) < Math.abs(first - lo) ? "min" : "max"; concFirst = null;
  }
  const isAng = /Ang$/.test(sigKey), minRange = isAng ? 18 : H * 0.04;
  const R = findReps(t, val(sigKey), turn, minRange); res.series = { t, s: R.s, key: sigKey };
  res.reps = R.reps.map((r, i) => {
    const p1 = t[r.turn] - t[r.start], p2 = t[r.end] - t[r.turn];
    const rom = Math.abs(R.s[r.turn] - (R.s[r.start] + R.s[r.end]) / 2);
    return { n: i + 1, i0: r.start, it: r.turn, i1: r.end, t0: t[r.start], tt: t[r.turn], t1: t[r.end], conc: concFirst == null ? null : concFirst ? p1 : p2, ecc: concFirst == null ? null : concFirst ? p2 : p1, total: t[r.end] - t[r.start], rom, flags: [] };
  });
  const reps = res.reps, n = reps.length;
  if (!n) { add("fix", "Couldn't find clear reps.", "Film one set of 2–5 reps from the side, with your whole body in frame."); return res; }
  add("good", `${n} rep${n === 1 ? "" : "s"} tracked, about ${(reps.reduce((a, r) => a + r.total, 0) / n).toFixed(1)} s each.`);
  const flag = (r, f) => { if (!r.flags.includes(f)) r.flags.push(f); };
  const list = a => a.length === 1 ? `rep ${a[0]}` : `reps ${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`;

  /* checks every lift gets */
  if (n >= 3) {
    const ref = Math.max(reps[0].rom, reps[1].rom), short = reps.filter((r, i) => i >= 2 && r.rom < ref * 0.78).map(r => r.n);
    if (short.length) { short.forEach(k => flag(reps[k - 1], "Short range")); add("fix", `Range of motion shrank on ${list(short)}.`, "Keep the same depth every rep, or take a little weight off.", short[0]); }
    if (concFirst != null) {
      const fast = Math.min(reps[0].conc, reps[1].conc), slow = reps.filter(r => r.conc > Math.max(1.2, fast * 1.7)).map(r => r.n);
      if (slow.length) { slow.forEach(k => flag(reps[k - 1], "Slowed down")); add("tip", `The lifting part slowed down a lot by ${list(slow)} (${reps[slow[slow.length - 1] - 1].conc.toFixed(1)} s vs ${fast.toFixed(1)} s): that set was close to failure.`, "Good effort set. If form broke down there too, stop a rep earlier next time."); }
    }
  }
  if (["squat", "hinge", "hpress", "dip", "lunge"].includes(pat)) {
    const drop = reps.filter(r => r.ecc != null && r.ecc < 0.35).map(r => r.n);
    if (drop.length) { drop.forEach(k => flag(reps[k - 1], "Fast lowering")); add("tip", `Lowering took under half a second on ${list(drop)}.`, "Control the way down: about 1–2 seconds."); }
  }

  /* pattern rules */
  const facing = Math.sign(median(ok.map(f => f.F.x - f.He.x)) || 1); // which way the person faces
  const leanBack = i => { const f = F[i]; return f && f.ok ? deg(Math.atan2((f.H.x - f.S.x) * facing, f.H.y - f.S.y)) : null; }; // + = shoulders behind hips
  const rangeOf = (key, from, to) => { const v = []; for (let i = from; i <= to; i++) if (F[i] && F[i].ok && F[i][key] != null) v.push(F[i][key]); return v.length ? Math.max(...v) - Math.min(...v) : 0; };
  const whole = (key) => rangeOf(key, reps[0].i0, reps[n - 1].i1);
  const tops = r => [r.i0, r.i1];

  if (pat === "squat") {
    const thigh = median(ok.map(f => dist(f.H, f.K))) || 1;
    if (view !== "front") {
      const shallow = reps.filter(r => { const hY = at(r.it, "hipY"), kY = F[r.it].ok ? F[r.it].K.y : null; return hY != null && kY != null && hY < kY - 0.04 * thigh; }).map(r => r.n);
      shallow.forEach(k => flag(reps[k - 1], "Above parallel"));
      if (shallow.length) add(shallow.length >= Math.ceil(n / 2) ? "fix" : "tip", `Above parallel on ${list(shallow)}.`, "Sit down until your hip crease drops below the top of your knee.", shallow[0]);
      else add("good", `Hit depth on all ${n} reps.`);
      const early = reps.filter(r => hipsFirst(F, r, H)).map(r => r.n);
      early.forEach(k => flag(reps[k - 1], "Hips first"));
      if (early.length) add(early.length >= 2 ? "fix" : "tip", `Hips rose before your chest on ${list(early)}.`, "Drive your chest and hips up together. Lighter weight if it keeps happening.", early[0]);
      const lean = Math.max(...reps.map(r => at(r.it, "torsoLean") || 0)), limit = ["frontsquat", "goblet"].includes(id) ? 35 : 55;
      if (lean > limit) add("tip", `Leaning about ${Math.round(lean)}° forward at the bottom.`, "Brace before you go down and keep your chest up.");
      add("tip", "Film from the front sometimes to check that your knees track over your toes.");
    } else {
      const cave = reps.filter(r => { const f = F[r.it]; return f.ok && f.ankleGap > 0 && f.kneeGap < f.ankleGap * 0.82; }).map(r => r.n);
      cave.forEach(k => flag(reps[k - 1], "Knees in"));
      if (cave.length) add("fix", `Knees caved in at the bottom on ${list(cave)}.`, "Push your knees out over your toes on the way up.", cave[0]);
      else add("good", "Knees stayed out over your feet.");
      viewNote(); add("tip", "Film from the side to check depth and hips.");
    }
  }
  if (pat === "lunge") {
    const lean = Math.max(...reps.map(r => at(r.it, "torsoLean") || 0));
    if (lean > 25) add("tip", `Torso leaning about ${Math.round(lean)}° forward.`, "Stay tall, chest up, and drop straight down.");
    const shallow = reps.filter(r => (at(r.it, "kneeAng") || 0) > 112).map(r => r.n);
    if (shallow.length) { shallow.forEach(k => flag(reps[k - 1], "Shallow")); add("tip", `Not very deep on ${list(shallow)}.`, "Lower until your back knee nearly touches the floor.", shallow[0]); }
    viewNote();
  }
  if (pat === "hinge") {
    const shin = median(ok.map(f => dist(f.K, f.A))) || 1;
    if (["rdl", "dbrdl", "goodmorning"].includes(id)) {
      const squatty = reps.filter(r => (at(r.it, "kneeAng") || 180) < 125).map(r => r.n);
      if (squatty.length) { squatty.forEach(k => flag(reps[k - 1], "Knees bent")); add("fix", `Knees bent a lot on ${list(squatty)}, so it turned into a squat.`, "Soft knees that stay put; push your hips back.", squatty[0]); }
    }
    if (!["backext", "kbswing", "goodmorning"].includes(id)) {
      const far = reps.filter(r => { const f = F[r.it]; return f.ok && Math.abs(f.W.x - f.A.x) > 0.4 * shin; }).map(r => r.n);
      if (far.length) { far.forEach(k => flag(reps[k - 1], "Bar away")); add("fix", `The weight drifted away from your legs on ${list(far)}.`, "Keep the bar close: drag it along your thighs and shins.", far[0]); }
      else add("good", "Weight stayed close to your legs.");
    }
    if (["deadlift", "tbdl"].includes(id)) {
      const early = reps.filter(r => hipsFirst(F, r, H)).map(r => r.n);
      if (early.length) { early.forEach(k => flag(reps[k - 1], "Hips first")); add("fix", `Hips shot up before the bar moved on ${list(early)}.`, "Push the floor away; chest and hips rise together.", early[0]); }
    }
    const soft = reps.filter(r => Math.max(...tops(r).map(i => at(i, "hipAng") || 0)) < 160).map(r => r.n);
    if (soft.length && id !== "kbswing") { soft.forEach(k => flag(reps[k - 1], "No lockout")); add("tip", `Didn't fully stand up on ${list(soft)}.`, "Finish each rep: squeeze your glutes and stand tall.", soft[0]); }
    const back = Math.max(...reps.flatMap(r => tops(r).map(i => leanBack(i) || 0)));
    if (back > 15) add("tip", `Leaning back about ${Math.round(back)}° at the top.`, "Stand straight up at lockout; no need to lean back.");
    viewNote();
  }
  if (pat === "bridge") {
    const low = reps.filter(r => (at(r.it, "hipAng") || 180) < 160).map(r => r.n);
    if (low.length) { low.forEach(k => flag(reps[k - 1], "Hips low")); add("fix", `Hips didn't reach full extension on ${list(low)}.`, "Drive through your heels until knees, hips and shoulders line up, then pause.", low[0]); }
    else add("good", "Full hip extension at the top.");
  }
  if (pat === "hpress" || pat === "dip") {
    const lim = pat === "dip" ? 100 : 105;
    const high = reps.filter(r => (at(r.it, "elbowAng") || 0) > lim).map(r => r.n);
    if (high.length) { high.forEach(k => flag(reps[k - 1], "Partial rep")); add(high.length >= Math.ceil(n / 2) ? "fix" : "tip", `Didn't go all the way down on ${list(high)}.`, pat === "dip" ? "Lower until your upper arms are level with the floor." : id === "pushup" ? "Lower until your chest is a fist's height from the floor." : "Bring the weight down to your chest.", high[0]); }
    else add("good", "Full range at the bottom.");
    const soft = reps.filter(r => Math.min(...tops(r).map(i => at(i, "elbowAng") || 180)) < 150).map(r => r.n);
    if (soft.length) add("tip", `Elbows not quite straight at the top on ${list(soft)}.`, "Press all the way to lockout.");
    if (id === "pushup") {
      const sag = median(reps.map(r => signedHip(F[r.it]))) || 0, dev = median(reps.map(r => 180 - (at(r.it, "bodyLine") || 180))) || 0;
      if (dev > 15) add("fix", sag > 0 ? "Hips sagging at the bottom." : "Hips piked up.", "Keep a straight line from shoulders to ankles: squeeze glutes and brace.");
    }
    viewNote();
  }
  if (pat === "vpress") {
    const soft = reps.filter(r => { const f = F[r.it]; return f.ok && ((f.elbowAng || 0) < 158 || f.W.y > f.N.y); }).map(r => r.n);
    if (soft.length) { soft.forEach(k => flag(reps[k - 1], "No lockout")); add("fix", `Didn't lock out overhead on ${list(soft)}.`, "Finish with arms straight and biceps by your ears.", soft[0]); }
    else add("good", "Full lockout overhead.");
    const back = Math.max(...reps.map(r => leanBack(r.it) || 0));
    if (back > 12) add("fix", `Leaning back about ${Math.round(back)}° to press.`, "Squeeze your glutes and keep your ribs down.");
    viewNote();
  }
  if (pat === "row") {
    const swing = whole("torsoLean"), lim = ["cablerow", "machinerow"].includes(id) ? 20 : ["dbrow", "onearmrow", "invrow"].includes(id) ? 99 : 15;
    if (swing > lim) add("fix", `Your torso moved about ${Math.round(swing)}° during the set.`, "Hold your back angle and pull with your elbows, not your body.");
    const short = reps.filter(r => (at(r.it, "elbowAng") || 0) > 100).map(r => r.n);
    if (short.length) { short.forEach(k => flag(reps[k - 1], "Short pull")); add("tip", `Short pull on ${list(short)}.`, "Pull until your elbows pass your torso.", short[0]); }
    if (id === "invrow") { const dev = median(reps.map(r => 180 - (at(r.it, "bodyLine") || 180))) || 0; if (dev > 15) add("fix", "Hips sagging as you pull.", "Squeeze your glutes and keep a straight line."); }
    viewNote();
  }
  if (pat === "vpull") {
    const low = reps.filter(r => (at(r.it, "elbowAng") || 0) > 85).map(r => r.n);
    if (low.length) { low.forEach(k => flag(reps[k - 1], "Not high enough")); add("fix", `Didn't pull high enough on ${list(low)}.`, id === "pulldown" ? "Bring the bar to your upper chest." : "Get your chin over the bar.", low[0]); }
    else add("good", "Full pull at the top.");
    const hang = reps.filter(r => Math.max(...tops(r).map(i => at(i, "elbowAng") || 0)) < 150).map(r => r.n);
    if (hang.length) add("tip", `Not reaching a full hang on ${list(hang)}.`, "Straighten your arms at the bottom of each rep.");
    if (["pullup", "chinup", "assistpull"].includes(id)) { const torso = median(ok.map(f => f.torso)) || 1; const sw = rangeOf("hipY", 0, F.length - 1) && (Math.max(...ok.map(f => f.H.x)) - Math.min(...ok.map(f => f.H.x))) / torso; if (sw > 0.35) add("tip", "Swinging during the set.", "Squeeze your glutes, legs slightly forward, and pull straight up."); }
    if (id === "pulldown") { const lean = Math.max(...reps.map(r => leanBack(r.it) || 0)); if (lean > 30) add("tip", `Leaning back about ${Math.round(lean)}° to pull.`, "A slight lean is fine; stay under 20–30°."); }
  }
  if (pat === "curl") {
    if (!["preacher", "inclinecurl", "conc"].includes(id)) {
      const drift = reps.filter(r => (at(r.it, "shoulderAng") || 0) > 32).map(r => r.n);
      if (drift.length) { drift.forEach(k => flag(reps[k - 1], "Elbows forward")); add("fix", `Elbows drifted forward on ${list(drift)}.`, "Pin your elbows to your sides.", drift[0]); }
      const swing = whole("torsoLean"); if (swing > 10) add("fix", `Swinging your body about ${Math.round(swing)}° to lift.`, "Stand tall and use a weight you can curl without swinging.");
    }
    const part = reps.filter(r => Math.max(...tops(r).map(i => at(i, "elbowAng") || 0)) < 150).map(r => r.n);
    if (part.length) add("tip", `Not straightening your arms at the bottom on ${list(part)}.`, "Let your arms go fully straight between reps.");
    viewNote();
  }
  if (pat === "tri") {
    const part = reps.filter(r => (at(r.it, "elbowAng") || 180) < 158).map(r => r.n);
    if (part.length) { part.forEach(k => flag(reps[k - 1], "No lockout")); add("tip", `Elbows not fully straight on ${list(part)}.`, "Finish each rep with your arms straight.", part[0]); }
    else add("good", "Full extension every rep.");
    if (["pushdown", "ropepush"].includes(id)) { const mv = whole("shoulderAng"); if (mv > 25) add("fix", "Elbows moving during the set.", "Keep your elbows pinned at your sides; only your forearms move."); }
  }
  if (pat === "raise") {
    if (["lateral", "cablelat", "frontraise"].includes(id)) {
      const low = reps.filter(r => (at(r.it, "shoulderAng") || 0) < 70).map(r => r.n), high = reps.filter(r => (at(r.it, "shoulderAng") || 0) > 110).map(r => r.n);
      if (low.length) add("tip", `Not reaching shoulder height on ${list(low)}.`, "Raise until your arms are level with your shoulders.", low[0]);
      if (high.length) add("tip", `Going higher than shoulder height on ${list(high)}.`, "Stop at shoulder height so your traps don't take over.", high[0]);
      if (!low.length && !high.length) add("good", "Good height every rep.");
    }
    const swing = whole("torsoLean"); if (swing > 10) add("fix", `Swinging your body about ${Math.round(swing)}° to lift.`, "Go lighter and raise slowly.");
  }
  if (pat === "legraise") {
    const low = reps.filter(r => (at(r.it, "hipAng") || 0) > 110).map(r => r.n);
    if (low.length) add("tip", `Legs not coming up very high on ${list(low)}.`, "Raise your legs to at least hip height.", low[0]); else add("good", "Good height every rep.");
    if (id === "hangleg") { const torso = median(ok.map(f => f.torso)) || 1, sw = (Math.max(...ok.map(f => f.H.x)) - Math.min(...ok.map(f => f.H.x))) / torso; if (sw > 0.4) add("tip", "Swinging between reps.", "Pause at the bottom until you're still."); }
  }
  res.verdict = verdict(res);
  return res;
}
// did the hips rise much faster than the shoulders at the start of the way up?
function hipsFirst(F, r, H) {
  const conc = F.slice(r.it, r.i1 + 1).filter(f => f.ok); if (conc.length < 3) return false;
  const k = conc[Math.max(1, Math.round(conc.length * 0.4))], b = conc[0];
  const dHip = b.H.y - k.H.y, dSh = b.S.y - k.S.y;
  return dHip > H * 0.03 && dHip > 1.6 * Math.max(dSh, 0.001 * H);
}
// + when the hips sit below the shoulder–ankle line (sagging), − when above (piked)
function signedHip(f) { if (!f || !f.ok) return 0; const { S, A, H } = f; const t = (H.x - S.x) / ((A.x - S.x) || 1e-6); return H.y - (S.y + t * (A.y - S.y)); }
function verdict(res) {
  if (!res.reps.length && !res.hold) return "unclear";
  const fixes = res.findings.filter(f => f.level === "fix").length;
  return fixes === 0 ? "good" : fixes === 1 ? "minor" : "fix";
}

/* ---------- loading the model ---------- */
let landmarker = null, loading = null, tsBase = 0;
async function load(onStep) {
  if (landmarker) return landmarker; if (loading) return loading;
  loading = (async () => {
    onStep && onStep("Loading the body tracker…");
    const vision = await import("/pose/vision_bundle.mjs");
    const files = await vision.FilesetResolver.forVisionTasks("/pose/wasm");
    const make = delegate => vision.PoseLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: "/pose/pose_landmarker_lite.task", delegate }, runningMode: "VIDEO", numPoses: 1, minPoseDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
    const pref = G.__fcDelegate || "GPU";
    try { landmarker = await make(pref); } catch (e) { landmarker = await make("CPU"); }
    return landmarker;
  })();
  try { return await loading; } catch (e) { loading = null; throw e; }
}
// background download right after the app loads, so form check is ready (and works offline) later
function precache() {
  try {
    const c = navigator.connection; if (c && c.saveData) return;
    if (!("caches" in window)) return;
    caches.open("pose-" + POSE_VER).then(cache => Promise.all(POSE_FILES.map(u => cache.match(u).then(hit => hit || cache.add(u))))).catch(() => {});
  } catch (e) {}
}

/* ---------- running it on a video ---------- */
async function track(file, onProgress) {
  const url = URL.createObjectURL(file), v = document.createElement("video");
  v.muted = true; v.playsInline = true; v.setAttribute("playsinline", ""); v.preload = "auto"; v.src = url;
  await new Promise((ok, no) => { v.onloadeddata = ok; v.onerror = () => no(Object.assign(new Error("decode"), { code: "decode" })); setTimeout(() => no(Object.assign(new Error("timeout"), { code: "timeout" })), 20000); v.load(); });
  try { await v.play(); v.pause(); } catch (e) {}
  const dur = v.duration; if (!isFinite(dur) || dur <= 0 || !v.videoWidth) throw Object.assign(new Error("decode"), { code: "decode" });
  const lm = await load(s => onProgress && onProgress({ step: s, p: 0 }));
  const span = Math.min(dur, MAX_SEC), W = v.videoWidth, H = v.videoHeight, n = Math.max(2, Math.floor(span * FPS)), frames = [];
  tsBase += 1e7;
  for (let i = 0; i < n; i++) {
    const t = Math.min(dur - 0.02, i / FPS);
    await new Promise(ok => { const done = () => { v.removeEventListener("seeked", done); ok(); }; v.addEventListener("seeked", done); setTimeout(() => { v.removeEventListener("seeked", done); ok(); }, 3000); v.currentTime = t; });
    let r = null; try { r = lm.detectForVideo(v, tsBase + Math.round(t * 1000)); } catch (e) {}
    const p = r && r.landmarks && r.landmarks[0];
    frames.push({ t, lm: p ? p.map(q => ({ x: q.x * W, y: q.y * H, v: q.visibility == null ? 1 : q.visibility })) : null });
    if (onProgress && i % 3 === 0) onProgress({ step: "Tracking your movement…", p: (i + 1) / n });
  }
  return { url, video: v, frames, W, H, dur, span, cut: dur > MAX_SEC };
}

/* ---------- skeleton drawing for the replay ---------- */
const BONES = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28], [27, 29], [29, 31], [27, 31], [28, 30], [30, 32], [28, 32]];
function drawSkeleton(ctx, lm, scale, side, color) {
  if (!lm) return; const s = scale; ctx.lineWidth = Math.max(2, 4 * s); ctx.lineCap = "round";
  const sideIdx = new Set(Object.values(IDX[side || "l"]));
  BONES.forEach(([a, b]) => { const A = lm[a], B = lm[b]; if (!A || !B || A.v < 0.3 || B.v < 0.3) return; const strong = sideIdx.has(a) && sideIdx.has(b);
    ctx.strokeStyle = strong ? color : "rgba(255,255,255,.55)"; ctx.beginPath(); ctx.moveTo(A.x * s, A.y * s); ctx.lineTo(B.x * s, B.y * s); ctx.stroke(); });
  for (let i = 11; i < 33; i++) { const p = lm[i]; if (!p || p.v < 0.3) continue; ctx.fillStyle = sideIdx.has(i) ? "#fff" : "rgba(255,255,255,.6)"; ctx.beginPath(); ctx.arc(p.x * s, p.y * s, Math.max(2.5, 5 * s), 0, Math.PI * 2); ctx.fill(); }
}

G.FC = { analyze, track, load, precache, patternFor, drawSkeleton, PATTERN_OF, CFG, FPS, MAX_SEC, POSE_FILES, POSE_VER, _findReps: findReps };
if (typeof window !== "undefined" && window.addEventListener) window.addEventListener("load", () => setTimeout(precache, 4000));
})(typeof window !== "undefined" ? window : globalThis);
