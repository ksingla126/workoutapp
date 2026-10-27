// Barcode lookup for signed-in users.
// 1) Open Food Facts: nutrition (normalized to per-100 g macros) plus the package size.
// 2) If Open Food Facts doesn't know the code, UPCitemdb (free tier) for the product name and size, with no nutrition.
// Returns { food, product: { name, pack: { qty, unit: "g" | "ml" | "count", txt } } }; food is null when there's no nutrition.
import { cleanUrl } from "./config.js";
export const config = { runtime: "edge" };
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const num = (v) => (v == null || v === "" || !isFinite(Number(v)) ? null : Number(v));

// "32 oz (907 g)", "2 lb", "1.5 kg", "64 fl oz", "6 x 330 ml", "12 eggs", "12 ct" → { qty, unit } in g / ml / count
const UNIT = [
  [/^(kg|kilo(gram)?s?)$/, "g", 1000], [/^(g|gr|grams?|gramm)$/, "g", 1], [/^(mg)$/, "g", 0.001],
  [/^(lbs?|pounds?)$/, "g", 453.592], [/^(oz|ounces?|onz)$/, "g", 28.3495],
  [/^(fl\.?\s?oz|fluid ounces?)$/, "ml", 29.5735], [/^(l|lt|ltr|liters?|litres?)$/, "ml", 1000], [/^(ml|millilit(er|re)s?)$/, "ml", 1], [/^(cl)$/, "ml", 10],
  [/^(gal|gallons?)$/, "ml", 3785.41], [/^(qt|quarts?)$/, "ml", 946.353], [/^(pt|pints?)$/, "ml", 473.176],
  [/^(ct|count|pcs?|pieces?|eggs?|units?|pack|tortillas?|each)$/, "count", 1], [/^(dozen|dz)$/, "count", 12],
];
export function parseQty(txt) {
  const s = String(txt || "").toLowerCase().replace(/,/g, ".");
  const re = /(?:(\d+(?:\.\d+)?)\s*[x×]\s*)?(\d+(?:\.\d+)?)\s*(fl\.?\s?oz|fluid ounces?|[a-z]+)/g;
  let m;
  while ((m = re.exec(s))) {
    const u = UNIT.find(([r]) => r.test(m[3].trim()));
    if (!u) continue;
    const qty = Number(m[2]) * u[2] * (m[1] ? Number(m[1]) : 1);
    if (qty > 0) return { qty: +qty.toFixed(2), unit: u[1] };
  }
  return null;
}
function packOf(p) {
  const txt = String(p.quantity || "").slice(0, 40).trim();
  const q = num(p.product_quantity), u = String(p.product_quantity_unit || "").toLowerCase();
  const parsed = parseQty(txt);
  if (parsed) return { ...parsed, txt };
  if (q && q > 0 && (u === "g" || u === "ml" || !u)) return { qty: q, unit: u || "g", txt: txt || `${q} ${u || "g"}` };
  return txt ? { txt } : null;
}

async function offLookup(code) {
  const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,brands,nutriments,serving_quantity,serving_size,quantity,product_quantity,product_quantity_unit`, {
    headers: { "user-agent": "RankUp/1.0 (fitness app)" },
  });
  if (!r.ok && r.status !== 404) throw new Error("lookup_error");
  const d = await r.json().catch(() => ({}));
  const p = d && d.product;
  if (!p || d.status === 0) return null;
  const n = p.nutriments || {};
  let k = num(n["energy-kcal_100g"]);
  if (k == null && num(n["energy_100g"]) != null) k = num(n["energy_100g"]) / 4.184;
  const pr = num(n.proteins_100g), c = num(n.carbohydrates_100g), f = num(n.fat_100g);
  const name = String(p.product_name || "Scanned item").slice(0, 80) + (p.brands ? ` · ${String(p.brands).split(",")[0].trim().slice(0, 40)}` : "");
  let food = null;
  if (k != null || pr != null || c != null || f != null) {
    const P = pr || 0, C = c || 0, F = f || 0;
    if (k == null) k = P * 4 + C * 4 + F * 9;
    const sv = [];
    const sq = num(p.serving_quantity);
    if (sq && sq > 0) sv.push([`1 serving${p.serving_size ? ` (${String(p.serving_size).slice(0, 40)})` : ""}`, sq]);
    food = { id: `off_${code}`, n: name, k: Math.round(k), p: +P.toFixed(1), c: +C.toFixed(1), f: +F.toFixed(1), sv, src: "off" };
  }
  return { food, product: { name, pack: packOf(p) } };
}
async function upcLookup(code) {
  try {
    const r = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${code}`, { headers: { accept: "application/json" } });
    if (!r.ok) return null;
    const d = await r.json().catch(() => ({}));
    const it = d && Array.isArray(d.items) && d.items[0];
    if (!it || !it.title) return null;
    const title = String(it.title).slice(0, 80), size = String(it.size || "").slice(0, 40);
    const parsed = parseQty(size) || parseQty(title);
    const name = title + (it.brand && !title.toLowerCase().includes(String(it.brand).toLowerCase()) ? ` · ${String(it.brand).slice(0, 40)}` : "");
    return { food: null, product: { name, pack: parsed ? { ...parsed, txt: size || "" } : size ? { txt: size } : null } };
  } catch (e) { return null }
}

export default async function handler(req) {
  const code = (new URL(req.url).searchParams.get("code") || "").replace(/\D/g, "");
  if (code.length < 6 || code.length > 14) return json(400, { code: "bad_barcode" });
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { code: "not_signed_in" });
  const who = await fetch(`${cleanUrl(process.env.SUPABASE_URL)}/auth/v1/user`, {
    headers: { apikey: (process.env.SUPABASE_ANON_KEY || "").trim(), authorization: `Bearer ${token}` },
  });
  if (!who.ok) return json(401, { code: "not_signed_in" });

  let off = null, offErr = false;
  try { off = await offLookup(code) } catch (e) { offErr = true }
  // a product Open Food Facts knows but without a size: ask UPCitemdb for the size
  if (off && !(off.product.pack && off.product.pack.qty)) {
    const u = await upcLookup(code);
    if (u && u.product.pack && u.product.pack.qty) off.product.pack = u.product.pack;
  }
  if (off) return json(200, off);
  const u = await upcLookup(code);
  if (u) return json(200, u);
  return json(offErr ? 502 : 404, { code: offErr ? "lookup_error" : "not_found" });
}
