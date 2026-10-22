// Barcode lookup via Open Food Facts, for signed-in users. Returns one food normalized to per-100 g macros.
import { cleanUrl } from "./config.js";
export const config = { runtime: "edge" };
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export default async function handler(req) {
  const code = (new URL(req.url).searchParams.get("code") || "").replace(/\D/g, "");
  if (code.length < 6 || code.length > 14) return json(400, { code: "bad_barcode" });
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { code: "not_signed_in" });
  const who = await fetch(`${cleanUrl(process.env.SUPABASE_URL)}/auth/v1/user`, {
    headers: { apikey: (process.env.SUPABASE_ANON_KEY || "").trim(), authorization: `Bearer ${token}` },
  });
  if (!who.ok) return json(401, { code: "not_signed_in" });

  const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,brands,nutriments,serving_quantity,serving_size`, {
    headers: { "user-agent": "WorkoutApp/1.0 (personal fitness app)" },
  });
  if (!r.ok && r.status !== 404) return json(502, { code: "lookup_error" });
  const d = await r.json().catch(() => ({}));
  const p = d && d.product;
  if (!p || d.status === 0) return json(404, { code: "not_found" });
  const n = p.nutriments || {};
  const num = (v) => (v == null || v === "" ? null : Number(v));
  let k = num(n["energy-kcal_100g"]);
  if (k == null && num(n["energy_100g"]) != null) k = num(n["energy_100g"]) / 4.184;
  const pr = num(n.proteins_100g) || 0, c = num(n.carbohydrates_100g) || 0, f = num(n.fat_100g) || 0;
  if (k == null) k = pr * 4 + c * 4 + f * 9;
  const sv = [];
  const sq = num(p.serving_quantity);
  if (sq && sq > 0) sv.push([`1 serving${p.serving_size ? ` (${String(p.serving_size).slice(0, 40)})` : ""}`, sq]);
  const name = String(p.product_name || "Scanned food").slice(0, 80) + (p.brands ? ` · ${String(p.brands).split(",")[0].trim().slice(0, 40)}` : "");
  return json(200, { food: { id: `off_${code}`, n: name, k: Math.round(k), p: +pr.toFixed(1), c: +c.toFixed(1), f: +f.toFixed(1), sv, src: "off" } });
}
