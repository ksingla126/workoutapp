/*
 * Platform layer: gives the app the same `window.claude.use("db" | "user" | "sample")` interface it
 * had on claude.ai, backed by Supabase (sign-in + storage) and our own /api/coach endpoint (Claude).
 */
(function () {
  "use strict";

  /* ---------- Sign-in ---------- */
  let sb = null, session = null, resolveReady;
  const ready = new Promise((r) => (resolveReady = r));

  function authScreen(msg) {
    let el = document.getElementById("authGate");
    if (!el) {
      el = document.createElement("div");
      el.id = "authGate";
      el.innerHTML = `
        <form class="ag-card" autocomplete="on">
          <div class="ag-mark">25</div>
          <h1>Road to Dec 25</h1>
          <p class="ag-sub">Sign in to sync your training across devices.</p>
          <label>Email<input name="email" type="email" autocomplete="email" required></label>
          <label>Password<input name="password" type="password" autocomplete="current-password" minlength="6" required></label>
          <button type="submit" data-act="in">Sign in</button>
          <button type="button" class="ag-ghost" data-act="up">Create account</button>
          <button type="button" class="ag-link" data-act="reset">Forgot password?</button>
          <p class="ag-msg" role="status"></p>
        </form>`;
      document.body.appendChild(el);
      const f = el.querySelector("form"), out = el.querySelector(".ag-msg");
      const say = (t) => (out.textContent = t);
      const busy = (b) => f.querySelectorAll("button").forEach((x) => (x.disabled = b));
      const go = async (act) => {
        const email = f.email.value.trim(), password = f.password.value;
        if (!email) return say("Enter your email.");
        busy(true); say(act === "in" ? "Signing in…" : "");
        const timer = setTimeout(() => { say("This is taking too long. The app can't reach your Supabase project: check SUPABASE_URL and SUPABASE_ANON_KEY in Vercel, then redeploy."); busy(false); }, 15000);
        try {
          if (act === "reset") {
            const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin });
            if (error) throw error;
            say("Check your email for a reset link.");
          } else if (act === "up") {
            if (password.length < 6) throw new Error("Use a password with at least 6 characters.");
            const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin } });
            if (error) throw error;
            if (!data.session) say("Check your email to confirm your account, then sign in here.");
          } else {
            const { error } = await sb.auth.signInWithPassword({ email, password });
            if (error) throw error;
          }
        } catch (e) { say(e.message || "Something went wrong. Try again."); }
        clearTimeout(timer);
        busy(false);
      };
      f.addEventListener("submit", (e) => { e.preventDefault(); go("in"); });
      f.querySelector('[data-act="up"]').onclick = () => go("up");
      f.querySelector('[data-act="reset"]').onclick = () => go("reset");
    }
    el.hidden = false;
    if (msg) el.querySelector(".ag-msg").textContent = msg;
  }

  async function initAuth() {
    let cfg;
    try { cfg = await (await fetch("/api/config")).json(); if (cfg.supabaseUrl) localStorage.setItem("rd25-config", JSON.stringify(cfg)); }
    catch (e) { try { cfg = JSON.parse(localStorage.getItem("rd25-config") || "{}") || {}; } catch (e2) { cfg = {}; } }
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || !window.supabase) {
      authScreen("The app isn't configured yet (missing Supabase settings).");
      return;
    }
    if (cfg.problem) { authScreen(cfg.problem); return; }
    // No cross-tab lock: avoids sign-in hanging in some iPhone/home-screen contexts.
    const lock = async (_name, _timeout, fn) => fn();
    sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, lock } });
    // Work in this callback is deferred: calling Supabase inside it can deadlock sign-in.
    sb.auth.onAuthStateChange((event, s) => setTimeout(() => onAuth(event, s), 0));
    function onAuth(event, s) {
      if (event === "PASSWORD_RECOVERY") {
        const pw = prompt("Choose a new password (at least 6 characters):");
        if (pw) sb.auth.updateUser({ password: pw }).then(({ error }) => alert(error ? error.message : "Password updated."));
      }
      if (s && !session) {
        session = s;
        const g = document.getElementById("authGate"); if (g) g.hidden = true;
        resolveReady(s);
      } else if (s) session = s;
      else if (session) location.reload(); // signed out
    }
    const { data } = await sb.auth.getSession();
    if (!data.session) authScreen();
  }

  window.appUserEmail = () => (session && session.user && session.user.email) || "";
  window.appAuthToken = async () => { if (!sb) return null; const { data } = await sb.auth.getSession(); return data.session ? data.session.access_token : null; };

  window.appSignOut = async () => {
    if (!sb) return;
    if (syncState.pending && !confirm(`${syncState.pending} change${syncState.pending > 1 ? "s haven't" : " hasn't"} synced yet and will be lost if you sign out now. Sign out anyway?`)) return;
    try {
      ["rd25-data", "rd25-photos", "rd25-drafts"].forEach((k) => localStorage.removeItem(k));
      Object.keys(localStorage).filter((k) => /^rd25-(cache|pending)-/.test(k)).forEach((k) => localStorage.removeItem(k));
    } catch (e) {}
    await sb.auth.signOut();
    location.reload();
  };

  /* ---------- Storage: document/collection API over the `docs` table ----------
     Works offline: reads come from a local copy first, and writes that can't reach the server
     wait in a local queue and are sent when the connection is back. */
  const isNetErr = (e) => !navigator.onLine || /fetch|network|load failed|timed? ?out/i.test(String((e && e.message) || e || ""));
  let syncState = { pending: 0, offline: !navigator.onLine };
  function setSync(patch) { syncState = { ...syncState, ...patch }; paintSync(); }
  function paintSync() {
    let el = document.getElementById("syncPill");
    const show = syncState.offline || syncState.pending > 0;
    if (!el) { if (!show) return; el = document.createElement("div"); el.id = "syncPill"; document.body.appendChild(el); }
    el.hidden = !show;
    el.textContent = syncState.offline ? (syncState.pending ? `Offline · ${syncState.pending} change${syncState.pending > 1 ? "s" : ""} will sync` : "Offline · showing saved data") : `Syncing ${syncState.pending} change${syncState.pending > 1 ? "s" : ""}…`;
  }
  window.appSyncState = () => ({ ...syncState });

  function makeDb(uid) {
    const prefix = "data/users/" + uid + "/";
    const rel = (p) => (p.startsWith(prefix) ? p.slice(prefix.length) : p);
    const LS = "rd25-cache-" + uid, LQ = "rd25-pending-" + uid;
    const cache = new Map(); // relPath -> data
    const fetchedCols = new Set();
    const docSubs = new Map(), colSubs = new Map();
    const err = (e) => Object.assign(new Error((e && e.message) || "Storage error"), { code: (e && e.code) || "storage_error" });
    const big = (p) => p.startsWith("profile/photos/"); // photos are too large for the local copy

    // local copy
    try { const j = JSON.parse(localStorage.getItem(LS) || "null"); if (j) { Object.entries(j.docs || {}).forEach(([k, v]) => cache.set(k, v)); (j.cols || []).forEach((c) => fetchedCols.add(c)); } } catch (e) {}
    let saveT = null;
    function persist() { clearTimeout(saveT); saveT = setTimeout(() => { try { const docs = {}; cache.forEach((v, k) => { if (!big(k)) docs[k] = v; }); localStorage.setItem(LS, JSON.stringify({ docs, cols: [...fetchedCols].filter((c) => !big(c + "/")) })); } catch (e) {} }, 400); }
    // pending writes, one per path (last write wins)
    let queue = []; try { queue = JSON.parse(localStorage.getItem(LQ) || "[]") || []; } catch (e) {}
    const saveQ = () => { try { localStorage.setItem(LQ, JSON.stringify(queue)); } catch (e) {} setSync({ pending: queue.length }); };
    function enqueue(op) { queue = queue.filter((q) => q.path !== op.path); queue.push(op); saveQ(); }
    function overlay(paths) { queue.forEach((q) => { if (!paths || paths(q.path)) { if (q.op === "del") cache.delete(q.path); else cache.set(q.path, q.data); } }); }
    async function send(op) {
      const { error } = op.op === "del" ? await sb.from("docs").delete().eq("path", op.path)
        : await sb.from("docs").upsert({ user_id: uid, path: op.path, data: op.data, updated_at: new Date().toISOString() });
      if (error) throw error;
    }
    let flushing = false;
    async function flush() {
      if (flushing || !queue.length || !navigator.onLine) return; flushing = true;
      try { while (queue.length) { const op = queue[0]; try { await send(op); } catch (e) { if (isNetErr(e)) break; console.error("dropped write", op.path, e); } queue = queue.filter((q) => q !== op); saveQ(); } }
      finally { flushing = false; setSync({ offline: !navigator.onLine }); }
    }
    window.addEventListener("online", () => { setSync({ offline: false }); flush(); refreshAll(); });
    window.addEventListener("offline", () => setSync({ offline: true }));
    setInterval(flush, 30000); setTimeout(flush, 1500); setSync({ pending: queue.length });

    const snapDoc = (p) => ({ id: p.split("/").pop(), exists: cache.has(p), data: () => (cache.has(p) ? structuredClone(cache.get(p)) : undefined) });
    const childrenOf = (c) => [...cache.keys()].filter((k) => k.startsWith(c + "/") && !k.slice(c.length + 1).includes("/"));
    const snapCol = (c) => ({ docs: childrenOf(c).sort().map(snapDoc), size: childrenOf(c).length });
    function notify(p) {
      (docSubs.get(p) || []).forEach((cb) => cb(snapDoc(p)));
      const parent = p.slice(0, p.lastIndexOf("/"));
      (colSubs.get(parent) || []).forEach((cb) => cb(snapCol(parent)));
    }
    async function fetchDoc(p) {
      const { data, error } = await sb.from("docs").select("data").eq("path", p).maybeSingle();
      if (error) throw err(error);
      if (data) cache.set(p, data.data); else cache.delete(p);
      overlay((x) => x === p); persist(); setSync({ offline: false });
    }
    async function fetchCol(c) {
      const { data, error } = await sb.from("docs").select("path,data").like("path", c.replace(/[%_\\]/g, "\\$&") + "/%");
      if (error) throw err(error);
      childrenOf(c).forEach((k) => cache.delete(k));
      (data || []).forEach((r) => { if (!r.path.slice(c.length + 1).includes("/")) cache.set(r.path, r.data); });
      overlay((x) => x.startsWith(c + "/")); fetchedCols.add(c); persist(); setSync({ offline: false });
    }
    async function write(p, value) {
      const clean = JSON.parse(JSON.stringify(value));
      cache.set(p, clean); notify(p); persist();
      if (queue.length || !navigator.onLine) { enqueue({ op: "set", path: p, data: clean }); flush(); return; }
      try { await send({ op: "set", path: p, data: clean }); }
      catch (e) { if (isNetErr(e)) { enqueue({ op: "set", path: p, data: clean }); setSync({ offline: true }); return; } throw err(e); }
    }
    async function remove(p) {
      cache.delete(p); notify(p); persist();
      if (queue.length || !navigator.onLine) { enqueue({ op: "del", path: p }); flush(); return; }
      try { await send({ op: "del", path: p }); }
      catch (e) { if (isNetErr(e)) { enqueue({ op: "del", path: p }); setSync({ offline: true }); return; } throw err(e); }
    }
    // first answer from the local copy (instant, works offline), then from the server
    function subscribe(map, key, cb, onErr, fetcher, snap, hasLocal) {
      if (!map.has(key)) map.set(key, new Set());
      map.get(key).add(cb);
      if (hasLocal) setTimeout(() => cb(snap(key)), 0);
      fetcher(key).then(() => cb(snap(key)), (e) => { if (isNetErr(e)) { setSync({ offline: true }); if (!hasLocal) cb(snap(key)); } else if (onErr) onErr(err(e)); });
      return () => map.get(key).delete(cb);
    }
    function docRef(path) {
      const p = rel(path);
      return {
        id: p.split("/").pop(), path: p,
        collection: (name) => colRef(path + "/" + name),
        async get() { try { await fetchDoc(p); } catch (e) { if (!isNetErr(e)) throw e; } return snapDoc(p); },
        set: (v) => write(p, v),
        async update(patch) { if (!cache.has(p)) { try { await fetchDoc(p); } catch (e) {} } return write(p, { ...(cache.get(p) || {}), ...patch }); },
        delete: () => remove(p),
        onSnapshot: (cb, onErr) => subscribe(docSubs, p, cb, onErr, fetchDoc, snapDoc, cache.has(p)),
      };
    }
    function colRef(path) {
      const c = rel(path);
      return {
        path: c,
        doc: (id) => docRef(path + "/" + id),
        async get() { try { await fetchCol(c); } catch (e) { if (!isNetErr(e)) throw e; } return snapCol(c); },
        onSnapshot: (cb, onErr) => subscribe(colSubs, c, cb, onErr, fetchCol, snapCol, fetchedCols.has(c)),
      };
    }
    async function refreshAll() {
      try {
        for (const c of colSubs.keys()) { await fetchCol(c); (colSubs.get(c) || []).forEach((cb) => cb(snapCol(c))); }
        for (const p of docSubs.keys()) { await fetchDoc(p); (docSubs.get(p) || []).forEach((cb) => cb(snapDoc(p))); }
      } catch (e) {}
    }
    // Pick up changes made on another device when the app comes back to the foreground.
    let last = Date.now();
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible" || Date.now() - last < 15000) return;
      last = Date.now(); flush().then(refreshAll);
    });

    return { doc: docRef, collection: colRef };
  }

  /* ---------- Coach: Claude via /api/coach ---------- */
  async function toImagePart(blob) {
    const bmp = await createImageBitmap(blob);
    const s = Math.min(1, 1568 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    const url = c.toDataURL("image/jpeg", 0.85);
    return { media_type: "image/jpeg", data: url.slice(url.indexOf(",") + 1) };
  }
  const sErr = (code, extra) => Object.assign(new Error(code), { code }, extra || {});

  async function callCoach(input, opts, asJson) {
    opts = opts || {};
    const messages = typeof input === "string" ? [{ role: "user", content: input }] : (input || []).map((m) => ({ role: m.role, content: m.content }));
    const images = opts.images ? await Promise.all([...opts.images].map(toImagePart)) : [];
    const { data } = await sb.auth.getSession();
    if (!data.session) throw sErr("not_granted");
    let res;
    try {
      res = await fetch("/api/coach", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Bearer " + data.session.access_token },
        body: JSON.stringify({ messages, images, json: !!asJson }),
        signal: opts.signal,
      });
    } catch (e) {
      throw sErr(opts.signal && opts.signal.aborted ? "cancelled" : "network_error");
    }
    if (!res.ok) {
      let b = {}; try { b = await res.json(); } catch (e) {}
      throw sErr(res.status === 429 ? "rate_limited" : res.status === 401 ? "not_granted" : b.code || "server_error");
    }
    const reader = res.body.getReader(), dec = new TextDecoder();
    let text = "", truncated = false;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        let chunk = dec.decode(value, { stream: true });
        if (chunk.includes("\u0000TRUNCATED")) { truncated = true; chunk = chunk.replace("\u0000TRUNCATED", ""); }
        if (!chunk) continue;
        text += chunk;
        if (opts.onText && text.trim()) { try { opts.onText({ text, delta: chunk }); } catch (e) {} }
      }
    } catch (e) {
      if (opts.signal && opts.signal.aborted) throw sErr("cancelled", { text });
      throw sErr("network_error", { text });
    }
    if (!text.trim()) throw sErr("empty_completion");
    return { text, truncated, modelTierApplied: "default" };
  }
  function parseJson(t) {
    t = t.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    try { return JSON.parse(t); } catch (e) {}
    const i = t.search(/[[{]/), j = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
    if (i >= 0 && j > i) { try { return JSON.parse(t.slice(i, j + 1)); } catch (e) {} }
    throw sErr("invalid_json", { text: t });
  }
  function makeSample() {
    const sample = (input, opts) => callCoach(input, opts, false);
    sample.json = async (input, opts) => parseJson((await callCoach(input, { ...(opts || {}), onText: undefined }, true)).text);
    sample.limits = async () => ({ images: { maxCount: 5 } });
    return sample;
  }

  /* ---------- The interface the app uses ---------- */
  window.claude = {
    async use(name) {
      const s = await ready;
      const uid = s.user.id;
      if (name === "user") return { id: async () => uid, email: async () => s.user.email };
      if (name === "db") return makeDb(uid);
      if (name === "sample") return makeSample();
      throw sErr("not_declared");
    },
  };

  window.__platform = true;
  if ("serviceWorker" in navigator && location.protocol === "https:") window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAuth);
  else initAuth();
})();
