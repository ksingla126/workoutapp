/* Rank system tuning. Every number the rank engine (ranks.js) uses lives here, so ladders and conversion
 * rates can be tuned without touching scoring code. Spec: "Fitness Rank System — Design Spec v2" (Oct 24, 2026).
 * Weights are one-rep maxes in lb, times are seconds. Ladders list the minimum for D, C, B, A, S (E is anything below D). */
window.RANK_CFG = {
  version: 4,
  letters: ["E", "D", "C", "B", "A", "S"],
  refBW: { male: 200, female: 170 },          // raw ladders are written for these body weights
  scaleExp: 0.67,                             // size scaling for ladders without data: target × (bodyweight ÷ reference)^0.67
  // Letters sit at these percentiles of people who log their lifts (Symmetric Strength member data via FitnessVolt,
  // CC BY 4.0): D = 5th, C = 25th, B = median, A = 80th, S = 95th, for your sex and body weight.
  pctAt: [5, 25, 50, 80, 95],
  // [band midpoint body weight lb, 25th, median, 75th, 90th] estimated 1RM in lb (pull-ups: body weight + added).
  // Source: symmetricstrength.com/standards, logged member lifts, Nov 2026. null = fewer than 200 lifters.
  std: {
    chest: { male: [[136,129,157,187,213],[154.5,157,185,216,244],[173,174,206,239,270],[194,187,225,263,298],[218,196,239,280,325],[248,200,249,298,348],[285,193,254,319,380]],
             female: [[108,65,80,98,115],[120.5,76,90,114,133],[132.5,82,103,122,143],[149,85,105,130,154],[172,90,111,141,171],[200,93,120,147,198]] },
    quads: { male: [[136,163,204,252,296],[154.5,198,243,289,335],[173,221,270,321,371],[194,240,297,353,408],[218,256,315,379,443],[248,262,332,405,485],[285,252,334,426,536]],
             female: [[108,99,128,160,199],[120.5,119,154,190,220],[132.5,129,164,204,239],[149,135,175,220,258],[172,143,187,243,290],[200,135,195,250,324]] },
    hams:  { male: [[136,193,244,297,345],[154.5,239,289,343,396],[173,267,321,381,437],[194,289,354,416,478],[218,303,375,444,510],[248,311,395,472,550],[285,296,392,495,594]],
             female: [[108,117,158,198,246],[120.5,143,181,223,262],[132.5,159,199,239,286],[149,165,209,256,300],[172,178,225,280,331],[200,180,243,297,365]] },
    shoulders: { male: [[136,83,101,119,136],[154.5,99,117,135,154],[173,110,130,150,169],[194,120,141,162,185],[218,126,151,175,198],[248,129,157,186,216],[285,125,157,202,243]],
             female: [[108,44,56,68,77],[120.5,52,64,76,87],[132.5,57,68,81,90],[149,59,73,85,100],[172,63,77,93,110],[200,64,82,104,127]] },
    row:   { male: [[136,115,141,169,195],[154.5,134,162,192,221],[173,154,180,211,244],[194,161,193,227,264],[218,169,206,245,289],[248,172,216,262,308],[285,159,211,271,332]],
             female: [[120.5,74,93,111,128],[132.5,77,96,115,134],[149,82,100,122,141],[172,87,106,128,157]] },
    pull:  { male: [[136,168,186,205,227],[154.5,196,211,231,253],[173,214,232,252,278],[194,232,252,274,300],[218,245,272,296,321],[248,256,284,316,340],[285,273,314,360,431]],
             female: [[120.5,121,134,150,163],[132.5,130,146,164,176],[149,132,155,175,194]] }
  },
  // parts without public data: a share of another part's standards (close-grip bench ≈ 89% of bench, barbell curl ≈ 47%)
  derived: { triceps: { from: "chest", r: 0.89 }, biceps: { from: "chest", r: 0.47 } },

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
  // Discipline: the 6th category, from consistency rather than strength. A week is "on target" when you
  // log at least hitPct of its planned sessions; the rank comes from on-target weeks in the last \`weeks\`.
  // No Gates: it rises and falls on its own. th = on-target weeks needed for D, C, B, A, S.
  discipline: { weeks: 16, hitPct: 0.75, th: [2, 4, 7, 10, 14], overallWeight: 0.1 }, // 10% of the Overall
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

    dbfloor: [{ p: "chest", r: 0.7, cap: 3 }], heelgoblet: [{ p: "quads", r: 0.35, cap: 3 }], dbslrdl: [{ p: "hams", r: 0.3, cap: 3 }], dbthrust: [{ p: "hams", r: 0.7, cap: 3 }],
    dbslcalf: [{ p: "calves", r: 0.5, cap: 3 }],
    // added with the bigger library (conservative; machines and cables capped at B)
    inclinesmith: [{ p: "chest", r: 0.85 }], inclinemach: [{ p: "chest", r: 1, cap: 3 }], declinedb: [{ p: "chest", r: 0.85 }],
    lowcablefly: [{ p: "chest", r: 0.4, cap: 3 }], inclinedbfly: [{ p: "chest", r: 0.35, cap: 3 }],
    closepull: [{ p: "pull", r: 0.9 }], singlepull: [{ p: "pull", r: 0.45, cap: 3 }],
    pendlay: [{ p: "row", r: 1 }], meadows: [{ p: "row", r: 0.5, cap: 3 }], isorow: [{ p: "row", r: 1, cap: 3 }], highrow: [{ p: "row", r: 1, cap: 3 }], bbshrug: [{ p: "row", r: 1, cap: 3 }],
    rackpull: [{ p: "hams", r: 1.2, cap: 3 }], sldl: [{ p: "hams", r: 0.8 }], sumodl: [{ p: "hams", r: 1 }], pullthrough: [{ p: "hams", r: 0.6, cap: 3 }], smithhip: [{ p: "hams", r: 1.4, cap: 3 }],
    smithohp: [{ p: "shoulders", r: 1.05 }], machlateral: [{ p: "shoulders", r: 0.3, cap: 3 }], revcablefly: [{ p: "shoulders", r: 0.3, cap: 3 }],
    bbupright: [{ p: "shoulders", r: 0.7, cap: 3 }], landmine: [{ p: "shoulders", r: 0.5, cap: 3 }],
    spider: [{ p: "biceps", r: 0.8 }], machpreacher: [{ p: "biceps", r: 0.85, cap: 3 }], dbpreacher: [{ p: "biceps", r: 0.4 }], bayesian: [{ p: "biceps", r: 0.4, cap: 3 }],
    ropehammer: [{ p: "biceps", r: 0.9, cap: 3 }], revcurl: [{ p: "biceps", r: 0.75 }],
    machdip: [{ p: "triceps", r: 1, cap: 3 }], singlepush: [{ p: "triceps", r: 0.3, cap: 3 }], ezohtri: [{ p: "triceps", r: 0.5 }],
    pendulum: [{ p: "quads", r: 1.2, cap: 3 }], beltsquat: [{ p: "quads", r: 1.1, cap: 3 }], revlunge: [{ p: "quads", r: 0.45, cap: 3 }], bblunge: [{ p: "quads", r: 0.5, cap: 3 }],
    smithcalf: [{ p: "calves", r: 1 }], donkeycalf: [{ p: "calves", r: 1, cap: 3 }],
    kneeraise: [{ p: "core", k: "bw", r: 0.7, cap: 3 }], toestobar: [{ p: "core", k: "bw", r: 1.2 }],
    calfraise: [{ p: "calves", r: 1 }], tiltcalf: [{ p: "calves", r: 1 }], seatedcalf: [{ p: "calves", r: 0.8 }], legpresscalf: [{ p: "calves", r: 1.3 }],

    hangleg: [{ p: "core", k: "bw", r: 1 }], abwheel: [{ p: "core", k: "bw", r: 1 }], cablecrunch: [{ p: "core", r: 1, ladder: "cablecrunch" }], machcrunch: [{ p: "core", r: 0.9, ladder: "cablecrunch", cap: 3 }],
    plank: [{ p: "core", k: "hold", r: 1, ladder: "plank", cap: 3 }], sideplank: [{ p: "core", k: "hold", r: 0.6, ladder: "plank", cap: 3 }]
  },
  // Older built-in exercises that were sometimes done with dumbbells: score them as the dumbbell version when they were.
  dbVariant: { bench: "dbbench", ohp: "dbpress", rdl: "dbrdl", inclinebb: "incline", fly: "dbfly", revfly: "dbrevfly", ohtri: "dbohtri" },
  // Library muscles → part, for the consistency bar (any exercise for that muscle counts, rated or not)
  muscleParts: { Chest: "chest", Back: "row", Shoulders: "shoulders", Biceps: "biceps", Triceps: "triceps", Quads: "quads", Hamstrings: "hams", Glutes: "hams", Calves: "calves", Core: "core" },

  maxReps: 12,              // sets above this are left out of one-rep-max estimates (rep ladders have no limit)
  gateReps: [1, 5],         // Gate sets are scored as lifted for 1–5 reps; more reps at a weight count as that weight × 5
  placementDays: 7, placementCap: 3,   // placement uses one week of training and can't go above B
  // Gates are strength-only: any open bar can be attempted. Consistency feeds Discipline, and training a part
  // in momentumWeeks of the last consistencyWeeks still stops its lifts from fading.
  consistencyWeeks: 8, consistencySets: 3, momentumWeeks: 6,
  retryDays: 7,
  fade: { graceDays: 30, perMonth: 0.05, maxDays: 180 },
  demotion: { days: 30, warnDay: 23 }, reclaimDays: 90,
  pauseDaysPerYear: 56, excludeAskDays: 84,
  typo: { jumpRanks: 2, jumpPct: 0.2, jumpDays: 14 },
  // above these (load ÷ bodyweight, or reps / seconds) an entry is beyond world-record level and needs a confirm
  worldRecord: { chest: 3.6, row: 3, shoulders: 2.4, biceps: 1.7, triceps: 3.3, quads: 5, hams: 5.2, calves: 9, pull: 70, core: 100, plank: 3600, pushup: 200, cablecrunch: 4 },
  runRecord: { m400: 43, mile: 223, endur: 755 },  // seconds; anything faster is a GPS glitch or a typo
  // strength targets × this after 40 (ages 18–39 use the ladders as written)
  // McCulloch masters' age multiples (as used by APF/WPC), age 40–80: strength standards are divided by these
  ageMAM: [1.000,1.010,1.020,1.031,1.043,1.055,1.068,1.082,1.097,1.113,1.130,1.147,1.165,1.184,1.204,1.225,1.246,1.268,1.291,1.315,1.340,1.366,1.393,1.421,1.450,1.480,1.511,1.543,1.576,1.610,1.645,1.681,1.718,1.756,1.795,1.835,1.876,1.918,1.961,2.005,2.050],
  // running target times get longer with age: × (1 + rate per year past each age) — about 7:45 → 8:15 for a 50-year-old's B mile
  ageRun: [[35, 0.0043], [55, 0.007], [65, 0.01]]
};
