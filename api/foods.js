// USDA FoodData Central search, for signed-in users. Returns foods normalized to per-100 g macros.
import { cleanUrl } from "./config.js";
export const config = { runtime: "edge" };

const KEY = () => process.env.USDA_API_KEY || "DEMO_KEY";
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const ENERGY = new Set(["208", "957", "958"]), PROT = "203", CARB = "205", FAT = "204";
function nutr(list, num, ids) {
  for (const n of list || []) {
    const no = String(n.nutrientNumber || (n.nutrient && n.nutrient.number) || "");
    const id = Number(n.nutrientId || (n.nutrient && n.nutrient.id));
    if (no === num || ids.includes(id)) return Number(n.value ?? n.amount) || 0;
  }
  return null;
}
function energy(list) {
  let best = null;
  for (const n of list || []) {
    const no = String(n.nutrientNumber || (n.nutrient && n.nutrient.number) || "");
    const unit = String(n.unitName || (n.nutrient && n.nutrient.unitName) || "").toUpperCase();
    if (ENERGY.has(no) && unit === "KCAL") { const v = Number(n.value ?? n.amount); if (no === "208") return v; if (best == null) best = v; }
  }
  return best;
}
const title = (s) => (s === s.toUpperCase() ? s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()) : s);

export default async function handler(req) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().slice(0, 80);
  if (q.length < 2) return json(200, { foods: [] });

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { code: "not_signed_in" });
  const who = await fetch(`${cleanUrl(process.env.SUPABASE_URL)}/auth/v1/user`, {
    headers: { apikey: (process.env.SUPABASE_ANON_KEY || "").trim(), authorization: `Bearer ${token}` },
  });
  if (!who.ok) return json(401, { code: "not_signed_in" });

  const r = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(KEY())}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: q, pageSize: 30, dataType: ["Foundation", "SR Legacy", "Branded"] }),
  });
  if (r.status === 429) return json(429, { code: "rate_limited" });
  if (!r.ok) return json(502, { code: "usda_error", status: r.status });
  const data = await r.json();

  const foods = (data.foods || []).map((f) => {
    const list = f.foodNutrients || [];
    const p = nutr(list, PROT, [1003]), c = nutr(list, CARB, [1005]), fat = nutr(list, FAT, [1004]);
    let k = energy(list);
    if (k == null && p != null && c != null && fat != null) k = p * 4 + c * 4 + fat * 9;
    if (k == null) return null;
    const sv = [];
    const su = String(f.servingSizeUnit || "").toLowerCase();
    if (f.servingSize && ["g", "grm", "ml", "mlt"].includes(su)) sv.push([f.householdServingFullText ? `1 serving (${f.householdServingFullText})` : `1 serving (${Math.round(f.servingSize)} ${su.startsWith("m") ? "ml" : "g"})`, Number(f.servingSize)]);
    for (const m of f.foodMeasures || []) {
      const label = String(m.disseminationText || "").trim();
      if (label && m.gramWeight && !/^quantity not specified$/i.test(label) && sv.length < 4) sv.push([/^\d|^[½¼¾⅓]/.test(label) ? label : `1 ${label}`, Number(m.gramWeight)]);
    }
    const brand = f.brandName || f.brandOwner;
    return {
      id: `usda_${f.fdcId}`,
      n: title(String(f.description || "Food")) + (brand ? ` · ${title(String(brand))}` : ""),
      k: Math.round(k), p: +(p || 0).toFixed(1), c: +(c || 0).toFixed(1), f: +(fat || 0).toFixed(1),
      sv, src: "usda", dt: f.dataType,
    };
  }).filter(Boolean);

  // Generic foods (Foundation / SR Legacy) first, then branded.
  foods.sort((a, b) => (a.dt === "Branded") - (b.dt === "Branded"));
  return json(200, { foods });
}
