/*
 * Smooth redraws: instead of throwing a screen away and rebuilding it (which restarts every animation,
 * snaps bars and checkmarks, and loses scroll positions inside the page), patch only what changed.
 *
 *   morph(el, html)        update el's children to match html
 *   viewBind(el, fn)       run a bind step; listeners it adds inside el are removed before the next one,
 *                          so elements that survive a patch never get the same handler twice
 *
 * Elements with data-keep keep their children (e.g. the 3D body canvas). Matching is by id or data-key
 * when present, otherwise by position and tag.
 */
(function () {
  "use strict";
  const keyOf = (n) => n.nodeType === 1 ? (n.id || n.getAttribute("data-key") || null) : null;
  const same = (a, b) => a.nodeType === b.nodeType && a.nodeName === b.nodeName && keyOf(a) === keyOf(b);

  function syncAttrs(a, b) {
    const A = a.attributes, B = b.attributes;
    for (let i = A.length - 1; i >= 0; i--) { const n = A[i].name; if (!b.hasAttribute(n)) a.removeAttribute(n) }
    for (let i = 0; i < B.length; i++) { const { name, value } = B[i]; if (a.getAttribute(name) !== value) a.setAttribute(name, value) }
  }
  function syncForm(a, b) {
    const focused = a === document.activeElement;
    if (a.nodeName === "INPUT") {
      if (a.type === "checkbox" || a.type === "radio") a.checked = b.hasAttribute("checked");
      else if (a.type !== "file" && !focused) { const v = b.getAttribute("value") || ""; if (a.value !== v) a.value = v }
    } else if (a.nodeName === "TEXTAREA" && !focused) { if (a.value !== b.value) a.value = b.value }
  }
  function morphNode(a, b) {
    if (a.nodeType === 3 || a.nodeType === 8) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return }
    syncAttrs(a, b);
    if (a.nodeName === "INPUT" || a.nodeName === "TEXTAREA") { syncForm(a, b); if (a.nodeName === "TEXTAREA") return }
    if (a.hasAttribute("data-keep") && a.firstChild) return;
    morphKids(a, b);
    if (a.nodeName === "SELECT") { const i = [...b.options].findIndex((o) => o.hasAttribute("selected")); a.selectedIndex = i >= 0 ? i : 0 }
    if (a.nodeName === "DETAILS") a.open = b.hasAttribute("open");
  }
  function morphKids(a, b) {
    const keyed = new Map();
    for (let c = a.firstChild; c; c = c.nextSibling) { const k = keyOf(c); if (k) keyed.set(k, c) }
    let cur = a.firstChild;
    for (let nb = b.firstChild; nb;) {
      const next = nb.nextSibling, k = keyOf(nb);
      let match = null;
      if (k) { const m = keyed.get(k); if (m && same(m, nb)) match = m }
      else if (cur && same(cur, nb)) match = cur;
      if (match) {
        if (match !== cur) a.insertBefore(match, cur);
        else cur = cur.nextSibling;
        if (k) keyed.delete(k);
        morphNode(match, nb);
      } else {
        a.insertBefore(nb, cur); // moves the new node over from the template
      }
      nb = next;
    }
    while (cur) { const n = cur.nextSibling; a.removeChild(cur); cur = n }
  }
  const tpl = document.createElement("template");
  function morph(el, html) {
    if (!el) return;
    tpl.innerHTML = html;
    morphKids(el, tpl.content);
    tpl.innerHTML = "";
  }

  // listeners added by a bind step to elements inside a container: cleared before that container's next bind
  const scopes = new WeakMap(), add = EventTarget.prototype.addEventListener;
  let active = null;
  EventTarget.prototype.addEventListener = function (type, fn, opt) {
    if (active && this !== active.el && this.nodeType === 1 && active.el.contains(this)) active.list.push([this, type, fn, opt]);
    return add.call(this, type, fn, opt);
  };
  function viewBind(el, fn) {
    const old = scopes.get(el); if (old) old.forEach(([t, ty, f, o]) => t.removeEventListener(ty, f, o));
    const prev = active, rec = { el, list: [] }; active = rec;
    try { return fn() } finally { active = prev; scopes.set(el, prev && prev.el === el ? prev.list.concat(rec.list) : rec.list) }
  }
  window.morph = morph;
  window.viewBind = viewBind;
})();
