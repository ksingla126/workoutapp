// Public client config (the anon key is designed to be public; row-level security protects the data).
export const config = { runtime: "edge" };

// Accept the URL however it was pasted: trailing slash, /rest/v1, or a dashboard link.
export function cleanUrl(u) {
  u = String(u || "").trim();
  const ref = u.match(/supabase\.com\/dashboard\/project\/([a-z0-9]+)/i);
  if (ref) return `https://${ref[1]}.supabase.co`;
  const m = u.match(/^(https?:\/\/[^/?#\s]+)/i);
  return m ? m[1] : "";
}

export default function handler() {
  return new Response(
    JSON.stringify({
      supabaseUrl: cleanUrl(process.env.SUPABASE_URL),
      supabaseAnonKey: (process.env.SUPABASE_ANON_KEY || "").trim(),
    }),
    { headers: { "content-type": "application/json", "cache-control": "no-store" } }
  );
}
