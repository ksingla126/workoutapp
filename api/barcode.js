// Barcode lookup for signed-in users. Sources, checked together:
// 1) USDA FoodData Central branded foods (matched on the UPC/GTIN): nutrition per 100 g plus the package size.
// 2) Open Food Facts: nutrition per 100 g plus the package size.
// 3) RankUp users: products other people entered by hand after a scan found nothing (name, size, label nutrition).
// 4) UPCitemdb (free tier), only for a missing name or size.
// GET returns { food, cfood, product: { name, pack: { qty, unit: "g" | "ml" | "count", txt } }, src: [...] }.
//   food = per-100 g nutrition (USDA / Open Food Facts); cfood = per-serving label nutrition a user entered.
// POST { code, name, pack?, food? } shares a hand-entered product with everyone (one entry per user per barcode;
// written with the service-role key, so SUPABASE_SERVICE_ROLE_KEY must be set, as it is for Strava).
import { cleanUrl } from "./config.js";
import { nutr, energy, title } from "./foods.js";
import { admin } from "./_lib.js";
export const config = { runtime: "edge" };
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const num = (v) => (v == null || v === "" || !isFinite(Number(v)) ? null : Number(v));
const SB = () => cleanUrl(process.env.SUPABASE_URL), ANON = () => (process.env.SUPABASE_ANON_KEY || "").trim();
const USDA_KEY = () => process.env.USDA_API_KEY || "DEMO_KEY";

// "32 oz (907 g)", "2 lb", "1.5 kg", "64 fl oz", "6 x 330 ml", "12 eggs", "12 ct" → { qty, unit } in g / ml / count
const UNIT = [
  [/^(kg|kilo(gram)?s?)$/, "g", 1000], [/^(g|gr|grm|grams?|gramm)$/, "g", 1], [/^(mg)$/, "g", 0.001],
  [/^(lbs?|pounds?)$/, "g", 453.592], [/^(oz|ounces?|onz)$/, "g", 28.3495],
  [/^(fl\.?\s?oz|fluid ounces?)$/, "ml", 29.5735], [/^(l|lt|ltr|liters?|litres?)$/, "ml", 1000], [/^(ml|mlt|millilit(er|re)s?)$/, "ml", 1], [/^(cl)$/, "ml", 10],
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
const hasSize = (pk) => !!(pk && pk.qty > 0);
function packOf(p) {
  const txt = String(p.quantity || "").slice(0, 40).trim();
  const q = num(p.product_quantity), u = String(p.product_quantity_unit || "").toLowerCase();
  const parsed = parseQty(txt);
  if (parsed) return { ...parsed, txt };
  if (q && q > 0 && (u === "g" || u === "ml" || !u)) return { qty: q, unit: u || "g", txt: txt || `${q} ${u || "g"}` };
  return txt ? { txt } : null;
}

// --- USDA branded foods, matched on the barcode (leading zeros differ between UPC-A, EAN-13 and GTIN-14)
const bare = (c) => String(c || "").replace(/\D/g, "").replace(/^0+/, "");
export function usdaPick(foods, code) {
  const want = bare(code);
  return (foods || []).find((f) => f && f.dataType === "Branded" && bare(f.gtinUpc) === want) || null;
}
export function usdaToResult(f) {
  const list = f.foodNutrients || [];
  const p = nutr(list, "203", [1003]), c = nutr(list, "205", [1005]), fat = nutr(list, "204", [1004]);
  let k = energy(list);
  if (k == null && (p != null || c != null || fat != null)) k = (p || 0) * 4 + (c || 0) * 4 + (fat || 0) * 9;
  const brand = f.brandName || f.brandOwner;
  const name = (title(String(f.description || "Scanned item")) + (brand ? ` · ${title(String(brand))}` : "")).slice(0, 120);
  let food = null;
  if (k != null) {
    const sv = [], su = String(f.servingSizeUnit || "").toLowerCase();
    if (f.servingSize && ["g", "grm", "ml", "mlt"].includes(su)) sv.push([f.householdServingFullText ? `1 serving (${String(f.householdServingFullText).slice(0, 40)})` : `1 serving (${Math.round(f.servingSize)} ${su.startsWith("m") ? "ml" : "g"})`, Number(f.servingSize)]);
    food = { id: `usda_${f.fdcId}`, n: name, k: Math.round(k), p: +(p || 0).toFixed(1), c: +(c || 0).toFixed(1), f: +(fat || 0).toFixed(1), sv, src: "usda" };
  }
  const pw = String(f.packageWeight || "").slice(0, 40).trim(), parsed = parseQty(pw);
  return { food, product: { name, pack: parsed ? { ...parsed, txt: pw } : pw ? { txt: pw } : null } };
}
async function usdaLookup(code) {
  const tries = [...new Set([code, bare(code), bare(code).padStart(14, "0")])].filter((x) => x.length >= 6);
  for (const q of tries.slice(0, 3)) {
    const r = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(USDA_KEY())}`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: q, dataType: ["Branded"], pageSize: 10 }),
    });
    if (!r.ok) return null; // rate limit or outage: the other sources still answer
    const d = await r.json().catch(() => ({}));
    const f = usdaPick(d.foods, code);
    if (f) return usdaToResult(f);
  }
  return null;
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
    const t = String(it.title).slice(0, 80), size = String(it.size || "").slice(0, 40);
    const parsed = parseQty(size) || parseQty(t);
    const name = t + (it.brand && !t.toLowerCase().includes(String(it.brand).toLowerCase()) ? ` · ${String(it.brand).slice(0, 40)}` : "");
    return { food: null, product: { name, pack: parsed ? { ...parsed, txt: size || "" } : size ? { txt: size } : null } };
  } catch (e) { return null }
}

// --- RankUp users' entries (table shared_barcodes; missing table = no entries)
const rest = (path, token, init = {}) => fetch(`${SB()}/rest/v1/${path}`, { ...init, headers: { apikey: ANON(), authorization: `Bearer ${token}`, "content-type": "application/json", ...(init.headers || {}) } });
export function sharedMerge(rows) {
  // newest first; the name and size come from the newest entry that has a size, nutrition from the newest that has it
  if (!rows || !rows.length) return null;
  const withSize = rows.find((r) => hasSize(r.pack)), withFood = rows.find((r) => r.food && r.food.k != null);
  const base = withSize || rows[0];
  return { food: null, cfood: withFood ? withFood.food : null, product: { name: base.name, pack: base.pack || null }, n: rows.length };
}
async function sharedLookup(code, token) {
  try {
    const r = await rest(`shared_barcodes?code=eq.${code}&select=name,pack,food,updated_at&order=updated_at.desc&limit=10`, token);
    if (!r.ok) return null;
    return sharedMerge(await r.json());
  } catch (e) { return null }
}
const clampNum = (v, lo, hi) => { const n = num(v); return n == null ? null : Math.max(lo, Math.min(hi, n)) };
export function cleanShare(body) {
  const code = String(body && body.code || "").replace(/\D/g, "");
  const name = String(body && body.name || "").replace(/\s+/g, " ").trim().slice(0, 120);
  if (code.length < 6 || code.length > 14 || name.length < 2) return null;
  let pack = null;
  if (body.pack && clampNum(body.pack.qty, 0, 1e6) > 0 && ["g", "ml", "count"].includes(body.pack.unit))
    pack = { qty: clampNum(body.pack.qty, 0, 1e6), unit: body.pack.unit, txt: String(body.pack.txt || "").slice(0, 40) };
  let food = null;
  const f = body.food;
  if (f && clampNum(f.k, 0, 5000) != null)
    food = { n: String(f.n || name).slice(0, 120), serving: String(f.serving || "1 serving").slice(0, 40), k: clampNum(f.k, 0, 5000), p: clampNum(f.p, 0, 500) || 0, c: clampNum(f.c, 0, 1000) || 0, f: clampNum(f.f, 0, 500) || 0 };
  if (!pack && !food) return null;
  return { code, name, pack, food };
}

export function combine(usda, off, shared) {
  const all = [["USDA", usda], ["Open Food Facts", off], ["RankUp users", shared]].filter(([, x]) => x);
  if (!all.length) return null;
  const food = (usda && usda.food) || (off && off.food) || null;
  const named = all.find(([, x]) => x.product && x.product.name);
  const sized = all.find(([, x]) => x.product && hasSize(x.product.pack));
  const product = { name: named ? named[1].product.name : "Scanned item", pack: sized ? sized[1].product.pack : (named && named[1].product.pack) || null };
  const src = [...new Set([food && (usda && usda.food ? "USDA" : "Open Food Facts"), named && named[0], sized && sized[0]].filter(Boolean))];
  return { food, cfood: !food && shared ? shared.cfood : null, product, src };
}

export default async function handler(req) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { code: "not_signed_in" });
  const who = await fetch(`${SB()}/auth/v1/user`, { headers: { apikey: ANON(), authorization: `Bearer ${token}` } });
  if (!who.ok) return json(401, { code: "not_signed_in" });

  if (req.method === "POST") {
    const row = cleanShare(await req.json().catch(() => null));
    if (!row) return json(400, { code: "bad_entry" });
    // written server-side so the row is always tied to the verified user and other people never see who added it
    if (!(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim()) return json(501, { code: "not_set_up" });
    const uid = (await who.json().catch(() => ({}))).id;
    if (!uid) return json(401, { code: "not_signed_in" });
    const r = await admin("shared_barcodes?on_conflict=code,user_id", { method: "POST", headers: { prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ ...row, user_id: uid, updated_at: new Date().toISOString() }) });
    if (!r.ok) return json(r.status === 404 ? 501 : 502, { code: r.status === 404 ? "not_set_up" : "save_failed" });
    return json(200, { ok: true });
  }

  const code = (new URL(req.url).searchParams.get("code") || "").replace(/\D/g, "");
  if (code.length < 6 || code.length > 14) return json(400, { code: "bad_barcode" });
  let offErr = false;
  const [usda, off, shared] = await Promise.all([
    usdaLookup(code).catch(() => null),
    offLookup(code).catch(() => { offErr = true; return null }),
    sharedLookup(code, token),
  ]);
  let out = combine(usda, off, shared);
  if (!out || !hasSize(out.product.pack)) {
    const u = await upcLookup(code);
    if (u && out && hasSize(u.product.pack)) { out.product.pack = u.product.pack; out.src = [...new Set([...out.src, "UPCitemdb"])] }
    else if (u && !out) out = { food: null, cfood: null, product: u.product, src: ["UPCitemdb"] };
  }
  if (out) return json(200, out);
  return json(offErr ? 502 : 404, { code: offErr ? "lookup_error" : "not_found" });
}
