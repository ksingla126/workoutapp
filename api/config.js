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

function problemWith(url, key) {
  if (!url) return "SUPABASE_URL is missing in Vercel. Add it, then redeploy.";
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) return `SUPABASE_URL looks wrong (${url}). It should look like https://abcd1234.supabase.co`;
  if (!key) return "SUPABASE_ANON_KEY is missing in Vercel. Add it, then redeploy.";
  if (/^sb_secret_/.test(key)) return "SUPABASE_ANON_KEY is set to a SECRET key. Replace it with the anon public key, then redeploy.";
  if (/^sk-ant-/.test(key)) return "SUPABASE_ANON_KEY is set to your Anthropic key. Put the Supabase anon public key there instead.";
  if (!/^eyJ/.test(key) && !/^sb_publishable_/.test(key)) return "SUPABASE_ANON_KEY doesn't look like a Supabase key. Use the anon public key (starts with eyJ).";
  return "";
}

export default function handler() {
  const supabaseUrl = cleanUrl(process.env.SUPABASE_URL);
  const supabaseAnonKey = (process.env.SUPABASE_ANON_KEY || "").trim();
  const problem = problemWith(supabaseUrl, supabaseAnonKey);
  return new Response(
    JSON.stringify(problem ? { problem } : { supabaseUrl, supabaseAnonKey, strava: !!process.env.STRAVA_CLIENT_ID }),
    { headers: { "content-type": "application/json", "cache-control": "no-store" } }
  );
}
