/* Appearance: light/dark mode and color-scheme presets. Loaded in <head> so the saved look applies before the first paint. */
(function () {
  "use strict";
  // Each preset: accents for gym / run / food / coach, plus page colors, for light and dark.
  const P = {
    classic: { name: "Classic", light: null, dark: null, dots: ["#4B48E8", "#EE4F2A", "#0F9D57", "#C98A06"] },
    ocean: { name: "Ocean",
      light: { bg: "#EEF2F6", surface: "#FFFFFF", s2: "#F4F7FA", line: "#D3DCE6", ink: "#0F1B2A", muted: "#56657A", gym: "#1F5FAD", run: "#0E8C8C", food: "#4C7A34", coach: "#7A5AC2" },
      dark: { bg: "#0D131A", surface: "#151E28", s2: "#1B2633", line: "#2A3646", ink: "#E4ECF5", muted: "#93A3B8", gym: "#7FA8F0", run: "#4FC9C4", food: "#9BCB7A", coach: "#B39AF2" } },
    sunset: { name: "Sunset",
      light: { bg: "#FBF3EE", surface: "#FFFFFF", s2: "#FDF7F3", line: "#EBD9CF", ink: "#2A1810", muted: "#7A6056", gym: "#C2410C", run: "#BE185D", food: "#A16207", coach: "#7C3AED" },
      dark: { bg: "#17110F", surface: "#211816", s2: "#2A1F1C", line: "#3A2C27", ink: "#F6E9E2", muted: "#B49C92", gym: "#FB923C", run: "#F472B6", food: "#EAB308", coach: "#A78BFA" } },
    forest: { name: "Forest",
      light: { bg: "#EFF2EC", surface: "#FFFFFF", s2: "#F5F7F2", line: "#D5DCCF", ink: "#16200F", muted: "#5D6A55", gym: "#2F6B3B", run: "#8A5A2B", food: "#5F7F1A", coach: "#B07D10" },
      dark: { bg: "#0F140F", surface: "#172017", s2: "#1D281D", line: "#2C3A2C", ink: "#E5EDE2", muted: "#9AA894", gym: "#6FC283", run: "#D19A63", food: "#A9CF54", coach: "#E3B547" } },
    grape: { name: "Grape",
      light: { bg: "#F4F2F8", surface: "#FFFFFF", s2: "#F8F7FB", line: "#DDD8E8", ink: "#1C1530", muted: "#655D7A", gym: "#6D28D9", run: "#DB2777", food: "#0F766E", coach: "#B45309" },
      dark: { bg: "#12101A", surface: "#1B1826", s2: "#221E30", line: "#322D44", ink: "#ECE8F6", muted: "#A39CB8", gym: "#A78BFA", run: "#F472B6", food: "#2DD4BF", coach: "#FBBF24" } },
    graphite: { name: "Graphite",
      light: { bg: "#F3F4F6", surface: "#FFFFFF", s2: "#F9FAFB", line: "#E1E3E7", ink: "#111827", muted: "#5F6672", gym: "#1F2937", run: "#6B7280", food: "#374151", coach: "#9CA3AF" },
      dark: { bg: "#0B0B0C", surface: "#161618", s2: "#1E1E21", line: "#2C2C30", ink: "#F3F4F6", muted: "#9CA0A8", gym: "#F3F4F6", run: "#9CA3AF", food: "#D1D5DB", coach: "#6B7280" } }
  };
  ["ocean", "sunset", "forest", "grape", "graphite"].forEach((k) => (P[k].dots = [P[k].light.gym, P[k].light.run, P[k].light.food, P[k].light.coach]));

  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => "#" + hex(a).map((v, i) => Math.round(v * t + hex(b)[i] * (1 - t)).toString(16).padStart(2, "0")).join("");
  function vars(c, dark) {
    const soft = (x) => mix(x, c.surface, dark ? 0.2 : 0.13);
    return `--bg:${c.bg};--surface:${c.surface};--surface-2:${c.s2};--line:${c.line};--ink:${c.ink};--muted:${c.muted};` +
      `--gym:${c.gym};--run:${c.run};--food:${c.food};--coach:${c.coach};` +
      `--gym-soft:${soft(c.gym)};--run-soft:${soft(c.run)};--food-soft:${soft(c.food)};--coach-soft:${soft(c.coach)};`;
  }
  function read() { try { return JSON.parse(localStorage.getItem("rd25-look") || "{}") || {}; } catch (e) { return {}; } }
  function apply(prefs) {
    prefs = prefs || read();
    const root = document.documentElement, mode = prefs.mode || "system", key = P[prefs.palette] ? prefs.palette : "classic";
    if (mode === "light" || mode === "dark") root.setAttribute("data-theme", mode); else root.removeAttribute("data-theme");
    let el = document.getElementById("paletteStyle");
    const p = P[key];
    const css = p.light ? `:root{${vars(p.light, false)}}@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${vars(p.dark, true)}}}:root[data-theme="dark"]{${vars(p.dark, true)}}` : "";
    if (!el) { el = document.createElement("style"); el.id = "paletteStyle"; document.head.appendChild(el); }
    el.textContent = css;
    const isDark = mode === "dark" || (mode === "system" && window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches);
    const bg = p.light ? (isDark ? p.dark.bg : p.light.bg) : (isDark ? "#0C1120" : "#EDF0F4");
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", bg);
  }
  function save(prefs) { const cur = { ...read(), ...prefs }; try { localStorage.setItem("rd25-look", JSON.stringify(cur)); } catch (e) {} apply(cur); return cur; }
  window.LOOK = { presets: P, read, apply, save };
  apply();
  if (window.matchMedia) matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => apply());
})();
