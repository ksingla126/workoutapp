// Public client config (the anon key is designed to be public; row-level security protects the data).
export const config = { runtime: "edge" };

export default function handler() {
  return new Response(
    JSON.stringify({
      supabaseUrl: process.env.SUPABASE_URL || "",
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
    }),
    { headers: { "content-type": "application/json", "cache-control": "no-store" } }
  );
}
