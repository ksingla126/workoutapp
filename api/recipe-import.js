// Reads a recipe page and returns its name, servings, ingredient lines and steps, from the schema.org Recipe
// data most recipe sites embed (JSON-LD). Signed-in users only, public http(s) pages only.
import { json, userFrom } from "./_lib.js";
export const config = { runtime: "edge" };

const PRIVATE = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[?::1\]?|\[?f[cd]|\[?fe80)/i;
const strip = (s) => String(s || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&frac12;/g, "½").replace(/&frac14;/g, "¼").replace(/&frac34;/g, "¾").replace(/\s+/g, " ").trim();

function findRecipe(node, depth = 0) {
  if (!node || depth > 6) return null;
  if (Array.isArray(node)) { for (const x of node) { const r = findRecipe(x, depth + 1); if (r) return r } return null }
  if (typeof node !== "object") return null;
  const t = node["@type"]; if (t === "Recipe" || (Array.isArray(t) && t.includes("Recipe"))) return node;
  if (node["@graph"]) return findRecipe(node["@graph"], depth + 1);
  if (node.mainEntity) return findRecipe(node.mainEntity, depth + 1);
  return null;
}
function steps(ins) {
  const out = [];
  const walk = (x) => { if (!x) return; if (typeof x === "string") { out.push(strip(x)); return } if (Array.isArray(x)) { x.forEach(walk); return }
    if (x.itemListElement) { walk(x.itemListElement); return } if (x.text) out.push(strip(x.text)); else if (x.name) out.push(strip(x.name)) };
  walk(ins); return out.filter(Boolean).slice(0, 40);
}
function servings(y) { const v = Array.isArray(y) ? y.find((x) => /\d/.test(String(x))) || y[0] : y; const m = String(v || "").match(/\d+/); return m ? Number(m[0]) : null }

export default async function handler(req) {
  if (req.method !== "POST") return json(405, { code: "method" });
  const user = await userFrom(req); if (!user) return json(401, { code: "not_signed_in" });
  let url; try { const b = await req.json(); url = new URL(String(b.url || "").trim()) } catch (e) { return json(400, { code: "bad_url" }) }
  if (!/^https?:$/.test(url.protocol) || PRIVATE.test(url.hostname) || !url.hostname.includes(".")) return json(400, { code: "bad_url" });
  let html = "";
  try {
    const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 9000);
    const r = await fetch(url.toString(), { signal: ctl.signal, redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (compatible; RankUpRecipeImport/1.0)", accept: "text/html,application/xhtml+xml" } });
    clearTimeout(tm);
    if (!r.ok) return json(502, { code: "fetch_failed" });
    const reader = r.body.getReader(); let got = 0; const chunks = [];
    while (got < 3_000_000) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); got += value.length }
    html = new TextDecoder().decode(chunks.reduce((a, c) => { const n = new Uint8Array(a.length + c.length); n.set(a); n.set(c, a.length); return n }, new Uint8Array()));
  } catch (e) { return json(502, { code: "fetch_failed" }) }
  let rec = null;
  for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { rec = findRecipe(JSON.parse(m[1].trim())); } catch (e) { rec = null } if (rec) break;
  }
  if (!rec || !Array.isArray(rec.recipeIngredient) || !rec.recipeIngredient.length) return json(404, { code: "no_recipe" });
  return json(200, { name: strip(rec.name).slice(0, 120), servings: servings(rec.recipeYield), ingredients: rec.recipeIngredient.map(strip).filter(Boolean).slice(0, 80), steps: steps(rec.recipeInstructions), url: url.toString() });
}
