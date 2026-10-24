/* Rank system tuning. Every number the rank engine (ranks.js) uses lives here, so ladders and conversion
 * rates can be tuned without touching scoring code. Spec: "Fitness Rank System — Design Spec v2" (Oct 24, 2026).
 * Weights are one-rep maxes in lb, times are seconds. Ladders list the minimum for D, C, B, A, S (E is anything below D). */
window.RANK_CFG = {
  version: 1,
  letters: ["E", "D", "C", "B", "A", "S"],
  refBW: { male: 200, female: 170 },          // raw ladders are written for these body weights
  scaleExp: 0.67,                             // scaled mode: target × (bodyweight ÷ reference)^0.67

  // kind: load = lb (higher is better) · reps = strict reps · hold = seconds held · time = seconds (lower is better)
  ladders: {
    chest:     { kind: "load", male: [95, 165, 225, 275, 335],  female: [55, 85, 115, 145, 180] },
    pull:      { kind: "reps", male: [1, 5, 10, 15, 20],        female: [1, 3, 6, 9, 12] },
    row:       { kind: "load", male: [85, 135, 185, 235, 285],  female: [55, 80, 105, 135, 165] },
    shoulders: { kind: "load", male: [65, 100, 135, 170, 205],  female: [35, 55, 75, 95, 115] },
    biceps:    { kind: "load", male: [45, 75, 105, 135, 165],   female: [25, 40, 55, 70, 85] },
    triceps:   { kind: "load", male: [85, 145, 200, 250, 300],  female: [45, 75, 100, 125, 155] },
    quads:     { kind: "load", male: [135, 225, 315, 395, 475], female: [95, 150, 205, 255, 315] },
    hams:      { kind: "load", male: [185, 275, 365, 455, 545], female: [125, 185, 245, 305, 365] },
    calves:    { kind: "load", male: [100, 160, 225, 290, 360], female: [60, 95, 140, 185, 235] },
    core:      { kind: "reps", male: [3, 7, 12, 16, 20],        female: [2, 5, 9, 13, 17] },
    mile:      { kind: "time", male: [630, 540, 465, 400, 345], female: [750, 630, 540, 465, 405] },
    m400:      { kind: "time", male: [125, 110, 95, 84, 72],    female: [145, 127, 110, 97, 83] },
    endur:     { kind: "time", male: [2040, 1740, 1500, 1350, 1185], female: [2400, 2040, 1740, 1530, 1350] },
    // exercise-specific ladders
    plank:     { kind: "hold", male: [60, 90, 120, 180, 240],   female: [60, 90, 120, 180, 240] },
    pushup:    { kind: "reps", male: [10, 25, 40, 55, 70],      female: [3, 12, 25, 35, 45] },
    cablecrunch: { kind: "load", male: [50, 80, 110, 140, 170], female: [30, 50, 65, 85, 100] }
  },

  // The parts that get ranked, the reference lift for each, and the basic Gate options when a split has none.
  parts: {
    chest:     { name: "Chest",               ref: "Bench press",         basic: ["bench"] },
    pull:      { name: "Back (pull)",         ref: "Pull-ups",            basic: ["pullup"] },
    row:       { name: "Back (row)",          ref: "Barbell row",         basic: ["bbrow"] },
    shoulders: { name: "Shoulders",           ref: "Overhead press",      basic: ["ohp"] },
    biceps:    { name: "Biceps",              ref: "Barbell curl",        basic: ["bbcurl"] },
    triceps:   { name: "Triceps",             ref: "Close-grip bench",    basic: ["cgbench"] },
    quads:     { name: "Quads",               ref: "Back squat",          basic: ["squat"] },
    hams:      { name: "Hamstrings & glutes", ref: "Deadlift",            basic: ["deadlift"] },
    calves:    { name: "Calves",              ref: "Calf raise",          basic: ["calfraise"] },
    core:      { name: "Core",                ref: "Hanging leg raise",   basic: ["hangleg"] },
    mile:      { name: "Mile",                ref: "Mile time",           cap: 3, run: true },
    m400:      { name: "400 m",               ref: "400 m time",          run: true },
    endur:     { name: "5K equivalent",       ref: "5K time",             run: true }
  },

  // The five main ranks. Upper and Lower are weighted averages of their parts; the others take the best part.
  groups: [
    { id: "upper", name: "Upper Body", parts: { chest: 0.25, pull: 0.15, row: 0.15, shoulders: 0.2, biceps: 0.125, triceps: 0.125 } },
    { id: "lower", name: "Lower Body", parts: { quads: 0.45, hams: 0.45, calves: 0.1 } },
    { id: "core",  name: "Core",       parts: { core: 1 } },
    { id: "speed", name: "Speed",      parts: { mile: 1, m400: 1 }, best: true },
    { id: "endur", name: "Endurance",  parts: { endur: 1 } }
  ],
  overallRoundAt: 0.7, // the Overall moves up a rank once the average is 70% of the way there

  // How each exercise counts. p = part, r = conversion rate (exercise ≈ r × reference lift),
  // k: load (weight × reps) · bw (bodyweight + added weight) · assist (bodyweight − assistance) · hold (seconds),
  // cap = highest rank it can reach on its own (3 = B, 2 = C); capped exercises are never Gate options,
  // and their rates lean conservative because machines and cable stacks vary between gyms.
  // ladder = use an exercise-specific ladder instead of the part's. Loads are the total moved (both dumbbells).
  conv: {
    bench: [{ p: "chest", r: 1 }], dbbench: [{ p: "chest", r: 0.8 }], incline: [{ p: "chest", r: 0.7 }], inclinebb: [{ p: "chest", r: 0.8 }],
    declinebench: [{ p: "chest", r: 1.05 }], smithbench: [{ p: "chest", r: 1.05 }], chestpress: [{ p: "chest", r: 1.1 }],
    fly: [{ p: "chest", r: 0.6, cap: 3 }], dbfly: [{ p: "chest", r: 0.4, cap: 3 }], cablecross: [{ p: "chest", r: 0.5, cap: 3 }],
    pushup: [{ p: "chest", k: "bw", r: 1, ladder: "pushup", cap: 3 }],
    dips: [{ p: "chest", k: "bw", r: 1.3 }, { p: "triceps", k: "bw", r: 1.45 }],

    pullup: [{ p: "pull", k: "bw", r: 1 }], chinup: [{ p: "pull", k: "bw", r: 1.05 }], pulldown: [{ p: "pull", r: 0.9 }],
    assistpull: [{ p: "pull", k: "assist", r: 1, cap: 2 }],

    bbrow: [{ p: "row", r: 1 }], tbarrow: [{ p: "row", r: 1.1 }], cablerow: [{ p: "row", r: 1 }], dbrow: [{ p: "row", r: 0.8 }],
    onearmrow: [{ p: "row", r: 0.45 }], machinerow: [{ p: "row", r: 1, cap: 3 }], facepull: [{ p: "row", r: 0.6, cap: 3 }],
    straightarm: [{ p: "row", r: 0.5, cap: 3 }], shrug: [{ p: "row", r: 1.0, cap: 3 }],

    ohp: [{ p: "shoulders", r: 1 }], dbpress: [{ p: "shoulders", r: 0.9 }], arnold: [{ p: "shoulders", r: 0.8 }], machpress: [{ p: "shoulders", r: 1.1 }],
    lateral: [{ p: "shoulders", r: 0.3, cap: 3 }], cablelat: [{ p: "shoulders", r: 0.15, cap: 3 }], frontraise: [{ p: "shoulders", r: 0.3, cap: 3 }],
    revfly: [{ p: "shoulders", r: 0.6, cap: 3 }], dbrevfly: [{ p: "shoulders", r: 0.25, cap: 3 }], uprow: [{ p: "shoulders", r: 0.7, cap: 3 }],

    bbcurl: [{ p: "biceps", r: 1 }], ezcurl: [{ p: "biceps", r: 1 }], preacher: [{ p: "biceps", r: 0.85 }], curl: [{ p: "biceps", r: 0.9 }],
    hammer: [{ p: "biceps", r: 1 }], conc: [{ p: "biceps", r: 0.45 }], inclinecurl: [{ p: "biceps", r: 0.8 }], cablecurl: [{ p: "biceps", r: 0.9, cap: 3 }],

    cgbench: [{ p: "triceps", r: 1 }], skull: [{ p: "triceps", r: 0.45 }], tridip: [{ p: "triceps", k: "bw", r: 1.45 }],
    pushdown: [{ p: "triceps", r: 0.6, cap: 3 }], ropepush: [{ p: "triceps", r: 0.55, cap: 3 }], ohtri: [{ p: "triceps", r: 0.5, cap: 3 }],
    dbohtri: [{ p: "triceps", r: 0.3, cap: 3 }], kickback: [{ p: "triceps", r: 0.15, cap: 3 }],

    squat: [{ p: "quads", r: 1 }], frontsquat: [{ p: "quads", r: 0.85 }], hack: [{ p: "quads", r: 1.2 }], smithsquat: [{ p: "quads", r: 1.1 }],
    split: [{ p: "quads", r: 0.4 }], lunge: [{ p: "quads", r: 0.45, cap: 3 }], stepup: [{ p: "quads", r: 0.45, cap: 3 }], goblet: [{ p: "quads", r: 0.35, cap: 3 }],
    legpress: [{ p: "quads", r: 2.5, cap: 3 }], legpress45: [{ p: "quads", r: 2.5, cap: 3 }], legext: [{ p: "quads", r: 0.7, cap: 3 }], legext1: [{ p: "quads", r: 0.35, cap: 3 }],

    deadlift: [{ p: "hams", r: 1 }], tbdl: [{ p: "hams", r: 1.05 }], rdl: [{ p: "hams", r: 0.75 }], dbrdl: [{ p: "hams", r: 0.6 }],
    goodmorning: [{ p: "hams", r: 0.55, cap: 3 }], hipthrust: [{ p: "hams", r: 1.4, cap: 3 }], machthrust: [{ p: "hams", r: 1.4, cap: 3 }],
    legcurl: [{ p: "hams", r: 0.45, cap: 3 }], lyingcurl: [{ p: "hams", r: 0.45, cap: 3 }],

    calfraise: [{ p: "calves", r: 1 }], tiltcalf: [{ p: "calves", r: 1 }], seatedcalf: [{ p: "calves", r: 0.8 }], legpresscalf: [{ p: "calves", r: 1.3 }],

    hangleg: [{ p: "core", k: "bw", r: 1 }], abwheel: [{ p: "core", k: "bw", r: 1 }], cablecrunch: [{ p: "core", r: 1, ladder: "cablecrunch" }],
    plank: [{ p: "core", k: "hold", r: 1, ladder: "plank", cap: 3 }], sideplank: [{ p: "core", k: "hold", r: 0.6, ladder: "plank", cap: 3 }]
  },
  // Older built-in exercises that were sometimes done with dumbbells: score them as the dumbbell version when they were.
  dbVariant: { bench: "dbbench", ohp: "dbpress", rdl: "dbrdl", inclinebb: "incline", fly: "dbfly", revfly: "dbrevfly", ohtri: "dbohtri" },
  // Library muscles → part, for the consistency bar (any exercise for that muscle counts, rated or not)
  muscleParts: { Chest: "chest", Back: "row", Shoulders: "shoulders", Biceps: "biceps", Triceps: "triceps", Quads: "quads", Hamstrings: "hams", Glutes: "hams", Calves: "calves", Core: "core" },

  maxReps: 12,              // sets above this are left out of one-rep-max estimates (rep ladders have no limit)
  gateReps: [1, 5],         // a weighted Gate set must be 1–5 reps
  placementDays: 7, placementCap: 3,   // placement uses one week of training and can't go above B
  consistencyWeeks: 8, consistencySets: 3, gateWeeks: 5, momentumWeeks: 6, fastRetryWeeks: 8,
  retryDays: 7, fastRetryDays: 4,
  fade: { graceDays: 30, perMonth: 0.05, maxDays: 180 },
  demotion: { days: 30, warnDay: 23 }, reclaimDays: 90,
  pauseDaysPerYear: 56, excludeAskDays: 84,
  typo: { jumpRanks: 2, jumpPct: 0.2, jumpDays: 14 },
  // above these (load ÷ bodyweight, or reps / seconds) an entry is beyond world-record level and needs a confirm
  worldRecord: { chest: 3.6, row: 3, shoulders: 2.4, biceps: 1.7, triceps: 3.3, quads: 5, hams: 5.2, calves: 9, pull: 70, core: 100, plank: 3600, pushup: 200, cablecrunch: 4 },
  runRecord: { m400: 43, mile: 223, endur: 755 },  // seconds; anything faster is a GPS glitch or a typo
  // strength targets × this after 40 (ages 18–39 use the ladders as written)
  ageStrength: [[0, 1], [40, 0.97], [45, 0.93], [50, 0.89], [55, 0.84], [60, 0.78], [65, 0.72], [70, 0.65]],
  // running target times get longer with age: × (1 + rate per year past each age) — about 7:45 → 8:15 for a 50-year-old's B mile
  ageRun: [[35, 0.0043], [55, 0.007], [65, 0.01]]
};
