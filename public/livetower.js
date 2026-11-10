/* Live mode, tower style (design F). Presentation only: Live mode's own logic (sets, rest, jumps, Gates, supersets, saving)
   is untouched. Exercises are floors of a tower, sets are mobs; your top set is an elite, a set that would clear a rank Gate
   is the Gate boss. renderLive() asks lvtInfo() for the pieces and wraps its own markup with them. */
const LVT_SHADE = "M0 -20 C9 -20 14 -12 14 -2 C14 7 15 13 18 18 C12 16 9 19 5 15.5 C2 19 -2 19 -5 15.5 C-9 19 -12 16 -18 18 C-15 13 -14 7 -14 -2 C-14 -12 -9 -20 0 -20 Z";
const LVT_HOOD = "M-9 -6 C-9 -15 9 -15 9 -6 C9 -1 5 2 0 2 C-5 2 -9 -1 -9 -6 Z";
const LVT_HORNS = "M-9 -15 C-13 -20 -15 -25 -13 -30 C-11 -24 -7 -21 -4 -19 Z M9 -15 C13 -20 15 -25 13 -30 C11 -24 7 -21 4 -19 Z";
const LVT_CROWN = "M-11 -18 L-13 -31 L-6 -23 L0 -34 L6 -23 L13 -31 L11 -18 Z";
const LVT_RUNES = ["M-1 -9 V9 M-1 -9 L5 -4 M-1 -2 L5 3", "M0 -9 V9 M-5 -5 L5 5", "M-5 9 L0 -9 L5 9 M-3 2 H3", "M-4 -9 V9 M-4 -9 L4 -3 L-4 3", "M0 -9 V9 M-5 -9 L0 -3 L5 -9", "M-5 -9 L5 9 M5 -9 L-5 9",
  "M-4 -9 V9 M4 -9 V9 M-4 -6 L4 6", "M0 -9 L5 0 L0 9 L-5 0 Z", "M-4 -9 V9 M-4 0 L4 -9 M-4 0 L4 9", "M0 -9 V9 M0 0 L5 -5 M0 4 L-5 -1", "M-5 -9 H5 M0 -9 V9 M-4 9 H4", "M-5 -6 L0 -9 L5 -6 M0 -9 V9"];
function lvtMix(a, b, t) { const h = x => [1, 3, 5].map(i => parseInt(x.slice(i, i + 2), 16)), A = h(a), B = h(b); return "#" + A.map((x, i) => Math.round(x + (B[i] - x) * t).toString(16).padStart(2, "0")).join("") }
function lvtRank() { try { const H = hubRank(); return H.un ? 0 : Math.min(5, H.ov) } catch (e) { return 1 } }
function lvtPal(i) { const c = (typeof RK_COL !== "undefined" && RK_COL[i]) || "#22A06B"; return { c, mid: lvtMix(c, "#ffffff", .42), core: lvtMix(c, "#ffffff", .85), dim: lvtMix(c, "#121216", .82) } }
function lvtMob(kind, state, size, col) {           // kind: imp (warm-up) · mob · elite · boss; state: dead · now · up
  const P = col || lvtPal(lvtRank()), h = Math.round(size * 58 / 44), sc = kind === "imp" ? .82 : 1;
  if (state === "dead") {
    const extra = kind === "elite" ? `<path d="${LVT_HORNS}" fill="#1A1816" stroke="#2E2A26" stroke-width="1"/>` : kind === "boss" ? `<path d="${LVT_CROWN}" fill="#1A1816" stroke="#2E2A26" stroke-width="1"/>` : "";
    return `<svg class="lvt-mob dead" viewBox="-22 -36 44 58" width="${size}" height="${h}" aria-hidden="true"><g transform="scale(${sc})">${extra}<path d="${LVT_SHADE}" fill="#1A1816" stroke="#2E2A26" stroke-width="1.2"/><path d="${LVT_HOOD}" fill="#0E0D0C"/></g><path d="M-16 12 L16 -14" stroke="${P.mid}" stroke-width="2.2" stroke-linecap="round" opacity=".85"/></svg>`;
  }
  const now = state === "now", edge = now ? P.mid : "#4A443D", fill = kind === "boss" ? "#0D1220" : now ? "#101815" : "#0E0E10", eye = now ? P.core : "#5A3A2A";
  const deco = kind === "elite" ? `<path d="${LVT_HORNS}" fill="${fill}" stroke="${edge}" stroke-width="1.2" stroke-linejoin="round"/>` : kind === "boss" ? `<path d="${LVT_CROWN}" fill="${fill}" stroke="${edge}" stroke-width="1.3" stroke-linejoin="round"/>` : "";
  return `<svg class="lvt-mob ${now ? "now" : ""}" viewBox="-22 -36 44 58" width="${size}" height="${h}" aria-hidden="true">${now ? `<ellipse class="lvt-aura" cx="0" cy="18" rx="17" ry="4" fill="${P.c}"/>` : ""}<g transform="scale(${sc})">${deco}<path d="${LVT_SHADE}" fill="${fill}" stroke="${edge}" stroke-width="1.4"/><path d="${LVT_HOOD}" fill="#050506"/><ellipse cx="-4" cy="-7" rx="2" ry="1.4" fill="${eye}"/><ellipse cx="4" cy="-7" rx="2" ry="1.4" fill="${eye}"/></g></svg>`;
}
function lvtRune(i, col, w) { return `<svg class="lvt-rune" viewBox="-7 -11 14 22" aria-hidden="true"><path d="${LVT_RUNES[i % LVT_RUNES.length]}" stroke="${col}" stroke-width="${w || 2.2}" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>` }

// what each set of an exercise is: warm-up imp, normal mob, the floor's elite (its heaviest working set), or a Gate boss
function lvtKinds(k, ex, steps) {
  const own = steps.filter(s => s.ex.id === ex.id), out = {}; let best = -1, bestW = -1, boss = -1, bossTo = null;
  own.forEach(s => {
    const ty = setTypeK(k, ex.id, s.i); if (ty === "w") { out[s.i] = "imp"; return }
    const v = setValsK(k, s), w = Number(v.w) || 0, r = Number(v.r) || 0;
    if (boss < 0 && FMT[fmtOf(ex)].b === "reps" && r > 0 && typeof rkSetGate === "function" && typeof fmtRanks === "function" && fmtRanks(ex.id, fmtOf(ex))) {
      try { const g = rkSetGate(ex.id, fromU(w), r, k, fmtOf(ex)); if (g && g.heavy) { boss = s.i; bossTo = g.to } } catch (e) {}
    }
    if (w >= bestW) { bestW = w; best = s.i }
    out[s.i] = "mob";
  });
  if (best >= 0 && own.length > 1 && out[best] === "mob") out[best] = "elite";
  if (boss >= 0) out[boss] = "boss";
  return { kinds: out, own, bossTo };
}

function lvtInfo(k, p, steps, idx) {
  if (p.type !== "gym") return null;
  const P = lvtPal(lvtRank()), cur = idx >= 0 ? steps[idx] : null;
  const floorOf = id => p.ex.findIndex(e => e.id === id);
  const K = cur ? lvtKinds(k, cur.ex, steps) : null, kind = cur ? K.kinds[cur.i] : null;
  const bossCol = K && K.bossTo != null ? lvtPal(Math.min(5, K.bossTo)) : null;
  const I = {
    pal: P, kind, boss: kind === "boss", bossCol,
    // the tower: one floor per exercise, top floor last; tap a floor to jump (same data-lvjump as the list)
    tower() {
      const fl = p.ex.map((ex, i) => {
        const n = steps.filter(x => x.ex.id === ex.id && x.done).length, tot = steps.filter(x => x.ex.id === ex.id).length, done = tot && n === tot, on = cur && cur.ex.id === ex.id;
        return `<button type="button" class="lvt-floor ${done ? "done" : ""} ${on ? "on" : ""}" data-lvjump="${esc(ex.id)}" ${done ? "disabled" : ""} aria-label="Floor ${i + 1}: ${esc(ex.name)}, ${n} of ${tot} sets${done ? ", cleared" : on ? ", current" : ". Tap to go there"}">${on ? `<i class="lvt-em"></i><i class="lvt-em b"></i>` : ""}${lvtRune(i, done || on ? P.core : "#3A3631")}<span>${i + 1}</span></button>`;
      }).reverse().join("");
      return `<nav class="lvt-tower" aria-label="Tower: one floor per exercise"><svg class="lvt-spire" viewBox="0 0 56 30" aria-hidden="true"><path d="M28 2 L50 28 H6 Z" fill="#0E0F12" stroke="#2E2A26" stroke-width="1.5"/><path d="M28 10 V22" stroke="#77736A" stroke-width="2" stroke-linecap="round"/></svg><div class="lvt-floors">${fl}</div><i class="lvt-base"></i></nav>`;
    },
    // the mob you're fighting: a big figure with its reps as an HP bar
    mob(reps) {
      if (!cur) return "";
      const col = I.boss && bossCol ? bossCol : P, r = Math.max(0, Math.min(30, parseInt(reps, 10) || 0));
      const lab = { imp: "Warm-up", mob: "Mob", elite: "Elite", boss: `Gate boss · ${rkLetter(Math.min(5, K.bossTo))} rank` }[kind] || "Mob";
      const hp = r ? `<div class="lvt-hp" aria-hidden="true">${Array.from({ length: Math.min(r, 20) }, () => "<i></i>").join("")}</div><div class="lvt-hpl"><span>HP = reps</span><span>${r}</span></div>` : "";
      return `<div class="lvt-foe"><span class="lvt-kind">${lab}</span>${lvtMob(kind === "boss" ? "boss" : kind, "now", I.boss ? 116 : 104, col)}${hp}</div>`;
    },
    // the rest of this floor, in order: struck, current, waiting
    queue() {
      if (!cur) return "";
      return `<div class="lvt-queue" aria-hidden="true">${K.own.map(s => `<span class="${s.done ? "dead" : s.i === cur.i ? "now" : ""}">${lvtMob(K.kinds[s.i], s.done ? "dead" : s.i === cur.i ? "now" : "up", 28, K.kinds[s.i] === "boss" && bossCol ? bossCol : P)}</span>`).join("")}</div>`;
    },
    // rest timer: a ring of runes that go dark as the rest runs out (liveTick updates it)
    ring() { return `<div class="lvt-ring" id="lvtRing" aria-hidden="true">${Array.from({ length: 12 }, (_, i) => `<span style="transform:rotate(${i * 30}deg) translateY(-74px)">${lvtRune(i, P.mid, 2.6)}</span>`).join("")}</div>` },
    // a floor that just fell: shown during the rest after its last set
    cleared() {
      if (!cur || cur.i !== 0) return "";
      const fi = floorOf(cur.ex.id), prev = fi > 0 ? p.ex[fi - 1] : null; if (!prev) return "";
      const all = steps.filter(x => x.ex.id === prev.id); if (!all.length || !all.every(x => x.done)) return "";
      return `<div class="lvt-cleared">${lvtRune(fi - 1, P.core, 2.4)}<span><b>Floor ${fi} cleared</b><small>${esc(prev.name)} · ${all.length} mob${all.length === 1 ? "" : "s"}</small></span></div>`;
    },
    floorLabel() { return cur ? `Floor ${floorOf(cur.ex.id) + 1} of ${p.ex.length}` : `${p.ex.length} floors` },
    style() { const c = I.boss && bossCol ? bossCol : P; return `--lvt:${c.c};--lvt-mid:${c.mid};--lvt-core:${c.core};--lvt-dim:${c.dim};--lvt-rank:${P.c};--lvt-rmid:${P.mid};--lvt-rcore:${P.core}` }
  };
  return I;
}
function lvtTick(restLeft, restDur) {
  const r = document.getElementById("lvtRing"); if (!r) return;
  const lit = restDur > 0 ? Math.ceil(Math.max(0, restLeft) / (restDur * 1000) * 12) : 0;
  r.querySelectorAll("span").forEach((s, i) => s.classList.toggle("off", i >= lit));
}

(() => { const st = document.createElement("style"); st.textContent = `
#liveIn.lvt{--lvt-ink:#F5F1E6}
#liveIn.lvt .lvt-row{display:flex;gap:12px;align-items:flex-start}
#liveIn.lvt .lvt-col{flex:1;min-width:0;display:flex;flex-direction:column;gap:12px}
.lvt-tower{position:sticky;top:8px;width:52px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:5px}
.lvt-spire{width:52px;height:28px}.lvt-base{display:block;width:52px;height:9px;border-radius:2px;background:linear-gradient(90deg,#6B3F17,#F4C48E 40%,#B47A3F 60%,#6B3F17)}
.lvt-floors{width:100%;display:flex;flex-direction:column;gap:5px}
.lvt-floor{position:relative;height:52px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;border:1.5px solid #24221F;border-radius:6px;background:#0E0F12;color:#77736A;font:800 10px/1 var(--display);padding:0;cursor:pointer}
.lvt-floor .lvt-rune{width:11px;height:17px}
.lvt-floor.done{border-color:var(--lvt-rank);background:linear-gradient(180deg,color-mix(in srgb,var(--lvt-rank) 30%,transparent),color-mix(in srgb,var(--lvt-rank) 12%,transparent));color:var(--lvt-rmid);cursor:default}
.lvt-floor.on{border-color:var(--lvt-rmid);background:linear-gradient(180deg,color-mix(in srgb,var(--lvt-rank) 45%,transparent),color-mix(in srgb,var(--lvt-rank) 18%,transparent));box-shadow:0 0 16px -2px var(--lvt-rank);color:var(--lvt-rcore)}
.lvt-floor:focus-visible{outline:2px solid var(--lvt-rmid);outline-offset:2px}
.lvt-em{position:absolute;left:50%;top:-4px;width:3px;height:3px;border-radius:50%;background:var(--lvt-rcore);box-shadow:0 0 6px var(--lvt-rmid);animation:lvtRise 2.2s infinite ease-out}.lvt-em.b{left:34%;width:2px;height:2px;animation-delay:-.9s}
@keyframes lvtRise{0%{transform:translateY(0);opacity:0}15%{opacity:1}100%{transform:translateY(-24px);opacity:0}}
#liveIn.lvt .lv-main.lvt-enc{display:flex;flex-direction:column;justify-content:center;text-align:center;background:radial-gradient(70% 60% at 50% 32%,color-mix(in srgb,var(--lvt) 22%,transparent),transparent 70%),#0D0F0E!important;border:1.5px solid color-mix(in srgb,var(--lvt) 65%,transparent)!important;box-shadow:inset 0 0 0 6px #0D0F0E,inset 0 0 0 7px color-mix(in srgb,var(--lvt) 25%,transparent),0 0 36px -14px var(--lvt)!important;color:var(--lvt-ink)}
#liveIn.lvt .lv-main.lvt-enc.boss{background:radial-gradient(80% 70% at 50% 30%,color-mix(in srgb,var(--lvt) 26%,transparent),transparent 70%),#0A0D16!important}
#liveIn.lvt .lv-main .lv-label{color:var(--lvt-mid)}
.lvt-foe{display:flex;flex-direction:column;align-items:center;gap:6px;margin:4px 0 2px}
.lvt-kind{font:800 10.5px/1 var(--display);letter-spacing:.3em;text-transform:uppercase;color:var(--lvt-mid)}
.lvt-mob{overflow:visible}.lvt-mob.now path:nth-of-type(1){filter:drop-shadow(0 0 3px var(--lvt-mid))}
.lvt-aura{opacity:.45;filter:blur(2.5px);animation:lvtPulse 1.8s infinite ease-in-out}@keyframes lvtPulse{0%,100%{opacity:.3}50%{opacity:.7}}
.lvt-hp{display:flex;gap:3px;width:100%;max-width:280px;margin-top:4px}.lvt-hp i{flex:1;height:9px;border-radius:2px;background:linear-gradient(180deg,var(--lvt-mid),var(--lvt));box-shadow:0 0 6px var(--lvt)}
.lvt-hpl{display:flex;justify-content:space-between;width:100%;max-width:280px;font:800 9px/1 var(--display);letter-spacing:.2em;text-transform:uppercase;color:#A8A396}
.lvt-queue{display:flex;justify-content:center;gap:12px;align-items:flex-end}.lvt-queue span{display:block}.lvt-queue span.dead{opacity:.75}
.lvt-mob.dead{opacity:.7}
.lvt-rw{position:relative;width:170px;height:170px;margin:6px auto 4px;display:grid;place-items:center}#liveIn.lvt .lvt-rw .lv-clock{position:relative;z-index:1;margin:0;font-size:44px!important;line-height:1;color:var(--lvt-ink)!important;text-shadow:0 0 18px color-mix(in srgb,var(--lvt) 50%,transparent)!important}.lvt-ring{position:absolute;inset:0}
.lvt-ring span{position:absolute;left:50%;top:50%;width:14px;height:22px;margin:-11px 0 0 -7px;transform-origin:center}
.lvt-ring span .lvt-rune{width:14px;height:22px;filter:drop-shadow(0 0 3px var(--lvt-mid))}
.lvt-ring span.off .lvt-rune{filter:none;opacity:.25}.lvt-ring span.off path{stroke:#4A443D}
.lvt-cleared{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:14px;text-align:left;border:1.5px solid color-mix(in srgb,var(--lvt-rank) 70%,transparent);background:radial-gradient(80% 100% at 0% 50%,color-mix(in srgb,var(--lvt-rank) 26%,transparent),transparent 70%),#0A0A0D;box-shadow:0 0 30px -12px var(--lvt-rank);color:var(--lvt-ink)}
.lvt-cleared .lvt-rune{width:22px;height:34px;filter:drop-shadow(0 0 6px var(--lvt-rmid))}
.lvt-cleared span{display:flex;flex-direction:column;gap:3px}.lvt-cleared b{font:800 11px/1 var(--display);letter-spacing:.28em;text-transform:uppercase;color:var(--lvt-rmid)}.lvt-cleared small{font-size:13px;color:#D8D2C2}
#liveIn.lvt .lv-list{margin-top:6px}
@media (prefers-reduced-motion:reduce){.lvt-em,.lvt-aura{animation:none}}
`; document.head.appendChild(st) })();
