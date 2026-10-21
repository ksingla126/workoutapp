// Coach endpoint: signed-in users only. Calls the Claude API and streams the answer back as plain text.
export const config = { runtime: "edge" };

const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5-5";
const DAILY_LIMIT = Number(process.env.COACH_DAILY_LIMIT || 60);
const MAX_TOKENS = 4096;
const MAX_TEXT = 200_000; // characters across all turns
const MAX_IMAGES = 5;

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

async function supa(path, token, init = {}) {
  return fetch(`${process.env.SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: process.env.SUPABASE_ANON_KEY,
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
}

export default async function handler(req) {
  if (req.method !== "POST") return json(405, { code: "method_not_allowed" });
  if (!process.env.ANTHROPIC_API_KEY || !process.env.SUPABASE_URL) return json(500, { code: "not_configured" });

  // 1. Who is asking?
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { code: "not_signed_in" });
  const who = await supa("/auth/v1/user", token);
  if (!who.ok) return json(401, { code: "not_signed_in" });

  // 2. Daily limit per user.
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const used = await supa(`/rest/v1/coach_usage?select=id&at=gte.${encodeURIComponent(since)}`, token, {
    method: "HEAD",
    headers: { prefer: "count=exact" },
  });
  const count = Number((used.headers.get("content-range") || "").split("/")[1] || 0);
  if (count >= DAILY_LIMIT) return json(429, { code: "rate_limited" });

  // 3. Validate the request.
  let body;
  try { body = await req.json(); } catch { return json(400, { code: "invalid_request" }); }
  let msgs = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content }));
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  // Merge back-to-back turns from the same side.
  msgs = msgs.reduce((out, m) => {
    const last = out[out.length - 1];
    if (last && last.role === m.role) last.content += "\n\n" + m.content; else out.push({ ...m });
    return out;
  }, []);
  if (!msgs.length || msgs[msgs.length - 1].role !== "user") return json(400, { code: "invalid_request" });
  if (msgs.reduce((n, m) => n + m.content.length, 0) > MAX_TEXT) return json(413, { code: "prompt_too_large" });

  const images = (Array.isArray(body.images) ? body.images : []).slice(0, MAX_IMAGES)
    .filter((i) => i && /^image\/(jpeg|png|webp|gif)$/.test(i.media_type) && typeof i.data === "string");
  const last = msgs[msgs.length - 1];
  const apiMsgs = msgs.map((m) => ({ role: m.role, content: m.content }));
  if (images.length) {
    apiMsgs[apiMsgs.length - 1] = {
      role: "user",
      content: [
        ...images.map((i) => ({ type: "image", source: { type: "base64", media_type: i.media_type, data: i.data } })),
        { type: "text", text: last.content },
      ],
    };
  }
  const system = body.json
    ? "Reply with only valid JSON exactly as requested: no code fences, no text before or after."
    : undefined;

  // 4. Count this request, then call Claude.
  await supa("/rest/v1/coach_usage", token, { method: "POST", body: "{}", headers: { prefer: "return=minimal" } });

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, max_tokens: MAX_TOKENS, stream: true, messages: apiMsgs, ...(system ? { system } : {}) }),
    signal: req.signal,
  });
  if (!upstream.ok || !upstream.body) {
    const status = upstream.status === 429 || upstream.status === 529 ? 429 : 502;
    return json(status, { code: status === 429 ? "rate_limited" : "upstream_error", detail: (await upstream.text()).slice(0, 300) });
  }

  // 5. Turn Claude's event stream into plain text.
  const dec = new TextDecoder(), enc = new TextEncoder();
  let buf = "";
  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop();
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            let ev; try { ev = JSON.parse(line.slice(5)); } catch { continue; }
            if (ev.type === "content_block_delta" && ev.delta && ev.delta.type === "text_delta") controller.enqueue(enc.encode(ev.delta.text));
            if (ev.type === "message_delta" && ev.delta && ev.delta.stop_reason === "max_tokens") controller.enqueue(enc.encode("\u0000TRUNCATED"));
          }
        }
      } catch (e) { /* client went away */ }
      controller.close();
    },
  });
  return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}
