/* ================= Storage layer (stream A): ZZsync, the mode badge and the shared-data card =================
   A normal statement block. build2 puts it right before `var Xj=e=>"cdweb:"+e;` (patch A01), so it runs once at
   load, before the root render; every bundle name it uses (tx, CQ, ZZt10, Rj, Gi, Ce, ye, m, H, R, de, Z, ve, ...)
   is read only when a function runs.

   Two modes behind one interface (PLAN 1.6, 2.8, 3.A):
   - local (everyone by default, and always on the public link): today's behavior, byte for byte. The whole doc
     lives in this browser (cdweb:cd6:doc), photos in cdweb:cd6:photos:<owner>.
   - shared ('db'), only when ALL of these hold: claude.use("db") and claude.use("user") answer; the viewer is the
     owner, can edit, or can("data.write") === true; and every listener has had a server answer
     (metadata.fromCache === false). No server answer within 20 s: 'db-offline' (look only, never seeds).

     mode         'local' | 'db' | 'db-offline'
     start()      -> Promise<mode>. Patch A02 sets window.ZZready = ZZsync.start(); the first load waits for it.
     read()       -> a copy of the live doc (shared mode; null when shared data is not set up); local mode: null
     write(next)  -> shared: compares the live copy with next, updates the copy at once and queues field-level
                     writes (one at a time per document, 4 at most in flight). Local: writes cdweb:cd6:doc.
     seed()       -> local: tx(), the demo, exactly as today. Shared: waits until shared data exists; only the owner
                     writes the first data, once, holding the locks/bootstrap lease (ZZSYNC_SEED picks what).
     fresh()      -> tx() in local mode; throws in shared mode so bQ can never write a demo over shared data
     failed(err, kind?)  -> show why a save failed in the red banner (event cd6:sync {text, kind})
     lease(name, fn)     -> run fn while holding locks/<name> (local: just runs fn); 'doors' re-reads the trucks at doors
     photoGet(key) / photoSet(key, value) -> photos for window.storage in shared mode (photos/<owner>/items/<id>)
     importLocal(onProgress?) -> owner only: make the shared data match this computer's saved data
     flush(ms?)   -> resolves true when every queued write is saved;  stats() -> what the card shows
   Events: cd6:sync {text, kind, slot} (banner; text "" clears it; kind "doc" / "photo" = that save failed just now),
   cd6:remote (data changed elsewhere), cd6:mode (mode or look-only changed), cd6:queue {pending}.

   Shared database layout (PLAN 2.8):
     customers/<id> trailers/<id> shipments/<id> invoices/<id> requests/<id> (zzRequests) gear/<id> (zzGear)
       one document per record, plus a hidden _o sort field; a save writes only the changed top-level fields
     portal/meta      every other top-level key (v, rates, settings, dayClosed, zzT10, demoCleared, ...), field by field;
                      rev and touchedAt are never written
     portal/chat {items} last 300 · portal/activity {items} last 200 · portal/outbox {items} last 300 (zzOutbox)
     accountChat/<cid> {cid, items} last 500 — lists are joined by id with the live copy before each write
     photos/<owner>/items/<photoId> {id, src | assetId, at, by} · locks/bootstrap, locks/doors (acquire leases)
   Listeners: portal, customers, trailers, shipments, invoices, requests, gear, accountChat (8 of 64). */

/* What the owner's first visit writes into an EMPTY shared database (one switch):
   "demo"  = staging: today's demo without the 396 filler accounts cu_004..cu_399
   "empty" = production: settings, rates and logins only (the same as Setup > Clear demo data) */
var ZZSYNC_SEED = "demo";

var ZZsync = (() => {
  /* ---------- banner ---------- */
  /* failVer: the write counter when a save last failed. A later good save clears the "NOT saved" banner only if it
     was made after that failure: the activity line saved by the same action must not hide a refused change. */
  let bad = {}, shown = null, failVer = 0;
  const said = {};   /* the last text shown for each kind, so it can come back after the offline banner */
  const fire = (name, detail) => { try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch (e) {} };
  const isFull = err => {
    if (!err) return false;
    const n = String(err.name || ""), c = err.code, msg = String(err.message || err);
    return n === "QuotaExceededError" || n === "NS_ERROR_DOM_QUOTA_REACHED" || c === 22 || c === 1014 || /quota|storage.*full|exceeded/i.test(msg);
  };
  /* cd6:sync {text, kind, slot}: kind is "doc" or "photo" only when a save of the dock data or of a photo failed just
     now (the kiosk listens for that, so a driver is never told "checked in" when nothing was saved); otherwise "net"
     (connection notice), "ro" (look-only notice) or "again" (an earlier failure shown again). slot is the banner's own
     bookkeeping. text "" clears the banner. */
  const banner = (slot, text, kind) => { bad[slot] = true; shown = slot; said[slot] = text; fire("cd6:sync", { text, kind: kind || slot, slot }); return text; };
  const unbanner = slot => { if (bad[slot]) { bad[slot] = false; if (shown === slot) { shown = null; fire("cd6:sync", { text: "", kind: slot, slot }); } } };

  /* ---------- words people see ---------- */
  const TXT = {
    ro: "You can look but not change shared data.",
    off: "Shared data is offline right now. You can look, but changes are paused until it reconnects.",
    revoked: "Shared data was switched off for this login. You can look but not change it.",
    notReady: "Shared data is not ready yet, so your change was NOT saved.",
    notSaved: "Your last change was NOT saved to the shared data. Please try again.",
    tooBig: "That change is too big for the shared data (over 240 KB), so it was NOT saved. Shorten the long text (notes, messages) and try again.",
    full: "The shared data is full, so your last change was NOT saved. Tell the owner: old trucks need to be archived.",
    photo: "Photo NOT saved to the shared data. Please try again.",
    photoBig: "Photo NOT saved: it is too big even after shrinking. Try another photo."
  };
  const NOTE = {
    wait: ["Waiting for the office to set up shared data", "The owner needs to open this staff page once. This page opens by itself when the data is ready."],
    seeding: ["Setting up shared data for the first time…", "This takes a few seconds. Keep this page open."],
    busy: ["Shared data is being set up on another tab or device…", "This page opens by itself when it is ready."],
    failed: ["Shared data could not be set up yet", "Trying again in a moment. Keep this page open."],
    offline: ["Can't reach the shared data right now", "Check the internet connection. This page keeps trying and opens by itself."],
    revoked: ["This login can't open the shared data right now", "Ask the owner to check who has access to this staff page, then open it again."]
  };

  /* ---------- small tools ---------- */
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rand = (a, b) => a + Math.floor(Math.random() * (b - a));
  const safe = f => Promise.resolve().then(f).catch(() => null);
  const soon = (p, ms) => Promise.race([p, sleep(ms).then(() => null)]);
  const codeOf = e => (e && typeof e.code === "string" && e.code) || "unavailable";
  const KNOWN = new Set(["invalid_argument", "resource_exhausted", "quota_exceeded", "unavailable", "revoked", "not_granted", "capability_disabled", "capability_removed", "transform_error"]);
  const REVOKE = new Set(["revoked", "not_granted", "capability_disabled", "capability_removed"]);
  const bytes = s => { try { return new TextEncoder().encode(s).length; } catch (e) { return s.length * 3; } };
  /* JSON with object keys sorted: two bodies compare equal whatever order the server returns keys in */
  const stable = v => v === undefined ? undefined : JSON.stringify(v, (k, x) => x && typeof x === "object" && !Array.isArray(x) ? Object.keys(x).sort().reduce((o, kk) => (o[kk] = x[kk], o), {}) : x);
  const norm = v => { if (v === undefined) return undefined; try { return JSON.parse(JSON.stringify(v)); } catch (e) { return undefined; } };
  const isObj = v => !!v && typeof v === "object" && !Array.isArray(v);
  const hash = s => { let h = 2166136261; for (let k = 0; k < s.length; k++) { h ^= s.charCodeAt(k); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  /* one safe path segment: letters, digits and _ . : @ + - pass; everything else (and ~ itself) becomes ~xxxx */
  const enc = s => {
    s = String(s == null ? "" : s);
    let o = "";
    for (let k = 0; k < s.length; k++) { const c = s[k]; o += /[A-Za-z0-9_.:@+-]/.test(c) ? c : "~" + s.charCodeAt(k).toString(16).padStart(4, "0"); }
    if (!o) o = "~0000";
    if (o === "." || o === "..") o = o.replace(/\./g, "~002e");
    if (o.length > 200) o = o.slice(0, 160) + "~h" + hash(s);
    return o;
  };
  const tabId = "tab-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

  /* ---------- layout ---------- */
  const COLL = { customers: "customers", trailers: "trailers", shipments: "shipments", invoices: "invoices", zzRequests: "requests", zzGear: "gear" };
  const ALWAYS = new Set(["customers", "trailers", "shipments", "invoices"]);
  const LISTS = { chat: { path: "portal/chat", max: 300, dir: 1 }, activity: { path: "portal/activity", max: 200, dir: -1 }, zzOutbox: { path: "portal/outbox", max: 300, dir: -1 } };
  const META = "portal/meta", INTERNAL = ["_layout"];
  const SKIP = new Set(["rev", "touchedAt", "accountChat", ...Object.keys(COLL), ...Object.keys(LISTS)]);
  const NAMES = ["portal", "customers", "trailers", "shipments", "invoices", "requests", "gear", "accountChat"];
  const LIMIT = 240000, PHOTO_MAX = 200000, FLY = 4, DOC_CAP = 25000;
  const listInfo = (path, cid) => path === "portal/chat" ? LISTS.chat : path === "portal/activity" ? LISTS.activity : path === "portal/outbox" ? LISTS.zzOutbox : { max: 500, dir: 1, cid };
  const isList = path => path === "portal/chat" || path === "portal/activity" || path === "portal/outbox" || path.startsWith("accountChat/");

  /* ---------- state ---------- */
  let db = null, owner = false, readOnly = false, revoked = false, phase = "idle", abandon = false;
  let startP = null, startRes = null, t0 = 0, offlineMs = 20000, retryMs = 1000, tick = null;
  let rev = 1, touchedAt = null, vc = 0, built = null, rt = 0, qT = 0, fails = 0, oks = 0, importing = false;
  const srv = new Map();   // path -> body last delivered by the server (or written by us and confirmed)
  const sver = new Map();  // path -> how many server copies arrived (a write only stores its own body if none came meanwhile)
  const pend = new Map();  // path -> local change not confirmed yet
  const lc = new Map();    // path -> {b, j}: live body cache (server + pending), j = stable JSON
  const subs = {};         // listener name -> state
  const wait = [], queued = new Set(), busy = new Set();
  let flying = 0, idleW = [], wakers = [];
  const photoN = new Map();

  /* ---------- live copy = server data + this page's pending changes ---------- */
  const keyOf = x => x && typeof x === "object" && x.id != null ? "i:" + x.id : "j:" + stable(x);
  function mergeList(path, s, e) {
    const L = listInfo(path, e.cid != null ? e.cid : s && s.cid);
    const items = s && Array.isArray(s.items) ? s.items : [], out = [];
    for (const x of items) { const k = keyOf(x); if (e.dels.has(k) || e.confDel.has(k)) continue; const a = e.adds.get(k); out.push(a ? a.item : x); }
    const have = new Set(out.map(keyOf)), fresh = [];
    e.conf.forEach((a, k) => { if (!have.has(k) && !e.adds.has(k)) { fresh.push(a); have.add(k); } });
    e.adds.forEach((a, k) => { if (!have.has(k)) fresh.push(a); });
    fresh.sort((p, q) => p.pos - q.pos);
    let all = L.dir > 0 ? out.concat(fresh.map(a => a.item)) : fresh.map(a => a.item).concat(out);
    all = L.dir > 0 ? all.slice(-L.max) : all.slice(0, L.max);
    const b = { ...(s || {}), items: all };
    if (L.cid != null) b.cid = L.cid;
    return b;
  }
  function calc(path) {
    const s = srv.get(path), e = pend.get(path);
    if (!e) return s;
    if (e.del) return undefined;
    if (e.kind === "list") return mergeList(path, s, e);
    if (e.full || !s) return e.body;
    if (!e.fields.size) return s;
    const b = { ...s };
    e.fields.forEach((v, f) => { b[f] = e.body[f]; });
    return b;
  }
  const lv = path => { let c = lc.get(path); if (!c) { c = { b: calc(path), j: null }; lc.set(path, c); } return c; };
  const live = path => lv(path).b;
  const liveJ = path => { const c = lv(path); if (c.j === null) c.j = c.b === undefined ? undefined : stable(c.b); return c.j; };
  const touch = path => { lc.delete(path); built = null; };
  const pathsOf = coll => {
    const pre = coll + "/", out = new Set(), add = (v, p) => { if (p.startsWith(pre) && p.indexOf("/", pre.length) < 0) out.add(p); };
    srv.forEach(add); pend.forEach(add);
    return [...out];
  };
  function build() {
    const mb = live(META);
    if (!mb) return null;
    const d = {};
    Object.keys(mb).forEach(k => { if (INTERNAL.indexOf(k) < 0) d[k] = mb[k]; });
    Object.keys(COLL).forEach(key => {
      const rows = [];
      pathsOf(COLL[key]).forEach(p => { const b = live(p); if (b) rows.push(b); });
      if (!rows.length && !ALWAYS.has(key)) return;
      rows.sort((a, b) => (typeof a._o === "number" ? a._o : Infinity) - (typeof b._o === "number" ? b._o : Infinity) || String(a.id).localeCompare(String(b.id)));
      d[key] = rows.map(b => { const { _o, ...r } = b; return r; });
    });
    Object.keys(LISTS).forEach(key => { const b = live(LISTS[key].path); if (b && Array.isArray(b.items)) d[key] = b.items; else if (key !== "zzOutbox") d[key] = []; });
    const ac = {};
    pathsOf("accountChat").forEach(p => { const b = live(p); if (b && Array.isArray(b.items)) ac[b.cid != null ? b.cid : p.slice(12)] = b.items; });
    d.accountChat = ac;
    d.rev = rev;
    if (touchedAt) d.touchedAt = touchedAt;
    return d;
  }

  /* ---------- diff: what changed between the live copy and the doc an action produced ---------- */
  /* sort keys for one collection: keep the longest run of existing _o values that is already in order, place the rest between */
  function ords(order, cur) {
    const n = order.length, o = order.map(p => { const v = cur.get(p); return typeof v === "number" && isFinite(v) ? v : null; });
    const tails = [], tailIdx = [], prev = new Array(n).fill(-1);
    for (let i = 0; i < n; i++) {
      if (o[i] === null) continue;
      let lo = 0, hi = tails.length;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (tails[mid] < o[i]) lo = mid + 1; else hi = mid; }
      tails[lo] = o[i]; tailIdx[lo] = i; prev[i] = lo > 0 ? tailIdx[lo - 1] : -1;
    }
    const keep = new Array(n).fill(false);
    if (tails.length) for (let k = tailIdx[tails.length - 1]; k >= 0; k = prev[k]) keep[k] = true;
    const out = new Array(n);
    for (let i = 0; i < n;) {
      if (keep[i]) { out[i] = o[i]; i++; continue; }
      let j = i; while (j < n && !keep[j]) j++;
      const lo = i > 0 ? out[i - 1] : null, hi = j < n ? o[j] : null, cnt = j - i;
      for (let q = 0; q < cnt; q++) out[i + q] = lo === null && hi === null ? q : lo === null ? hi - (cnt - q) : hi === null ? lo + q + 1 : lo + (hi - lo) * (q + 1) / (cnt + 1);
      i = j;
    }
    for (let q = 1; q < n; q++) if (!(out[q] > out[q - 1])) return order.map((p, z) => z);
    return out;
  }
  /* an update() merges nested objects, so it cannot drop a key: true when b lost a key that a has, at any depth */
  const dropsKey = (a, b) => {
    if (!isObj(a) || !isObj(b)) return false;
    for (const k in a) { if (!(k in b) || dropsKey(a[k], b[k])) return true; }
    return false;
  };
  function fieldDiff(a, b) {
    const ch = [];
    let full = false;
    Object.keys(b).forEach(k => { if (stable(a[k]) !== stable(b[k])) { ch.push(k); if (dropsKey(a[k], b[k])) full = true; } });
    Object.keys(a).forEach(k => { if (!(k in b)) full = true; });
    return { ch, full };
  }
  function recPend(path, body, v, fields, full) {
    let e = pend.get(path);
    if (!e || e.kind !== "rec") { e = { kind: "rec", body: null, fields: new Map(), full: 0, del: 0 }; pend.set(path, e); }
    e.body = body; e.del = 0;
    if (full || !fields) { e.full = v; e.fields.clear(); } else fields.forEach(f => e.fields.set(f, v));
    touch(path); enqueue(path);
  }
  /* a list document's pending change: adds / dels not sent yet, conf / confDel sent and waiting to show up in a
     server copy (another device writing the same list at the same moment can drop them; then they are sent again) */
  const newList = cid => ({ kind: "list", adds: new Map(), dels: new Map(), dt: new Map(), conf: new Map(), confDel: new Map(), del: 0, create: 0, cid });
  function delPend(path, v) {
    let e = pend.get(path);
    if (!e) { e = isList(path) ? newList() : { kind: "rec", body: null, fields: new Map(), full: 0, del: 0 }; pend.set(path, e); }
    e.del = v;
    if (e.kind === "list") { e.adds.clear(); e.dels.clear(); e.dt.clear(); e.conf.clear(); e.confDel.clear(); e.create = 0; } else { e.body = null; e.fields.clear(); e.full = 0; }
    touch(path); enqueue(path);
  }
  function diffColl(coll, rows, v, apply) {
    const rowOf = new Map(), order = [];
    rows.forEach(r => {
      r = norm(r);
      if (!isObj(r)) return;
      const p = coll + "/" + (r.id != null && r.id !== "" ? enc(r.id) : "~n" + hash(stable(r)));
      if (!rowOf.has(p)) order.push(p);
      rowOf.set(p, r);
    });
    const curPaths = pathsOf(coll).filter(p => live(p) !== undefined), curO = new Map(curPaths.map(p => [p, live(p)._o]));
    const o = ords(order, curO), seen = new Set(order);
    let n = 0;
    order.forEach((p, k) => {
      const body = { ...rowOf.get(p), _o: o[k] }, cur = live(p);
      if (cur === undefined) { n++; if (apply) recPend(p, body, v, null, true); return; }
      if (stable(body) === liveJ(p)) return;
      const d = fieldDiff(cur, body);
      if (!d.ch.length && !d.full) return;
      n++; if (apply) recPend(p, body, v, d.ch, d.full);
    });
    curPaths.forEach(p => { if (!seen.has(p)) { n++; if (apply) delPend(p, v); } });
    return n;
  }
  function listDiff(path, items, v, apply, info) {
    items = (norm(items) || []).filter(x => x !== undefined && x !== null);
    const curB = live(path), cur = curB && Array.isArray(curB.items) ? curB.items : [];
    const curMap = new Map(cur.map(x => [keyOf(x), stable(x)]));
    let e = pend.get(path), n = 0;
    const mk = () => { if (!e || e.kind !== "list") { e = newList(info.cid); if (apply) pend.set(path, e); } return e; };
    const nextKeys = new Set();
    items.forEach((x, pos) => {
      const k = keyOf(x);
      nextKeys.add(k);
      if (curMap.get(k) !== stable(x)) { n++; if (apply) { mk().adds.set(k, { item: x, ver: v, pos, tries: 0 }); e.dels.delete(k); e.confDel.delete(k); } }
      else if (apply && e && e.kind === "list") { const a = e.adds.get(k) || e.conf.get(k); if (a) a.pos = pos; }
    });
    curMap.forEach((j, k) => { if (!nextKeys.has(k)) { n++; if (apply) { mk().dels.set(k, v); e.adds.delete(k); e.conf.delete(k); } } });
    if (curB === undefined) { n++; if (apply) { mk().create = v; e.del = 0; } }
    if (n && apply) { e.del = 0; touch(path); enqueue(path); }
    return n;
  }
  function diffAcct(map, v, apply) {
    let n = 0;
    const want = new Set();
    Object.keys(map).forEach(cid => {
      if (!Array.isArray(map[cid])) return;
      const p = "accountChat/" + enc(cid);
      want.add(p);
      n += listDiff(p, map[cid], v, apply, { max: 500, dir: 1, cid });
    });
    pathsOf("accountChat").forEach(p => { if (!want.has(p) && live(p) !== undefined) { n++; if (apply) delPend(p, v); } });
    return n;
  }
  function diffMeta(next, v, apply) {
    const curB = live(META), cur = curB || {}, body = {};
    Object.keys(next).forEach(k => { if (!SKIP.has(k) && INTERNAL.indexOf(k) < 0 && next[k] !== undefined) { const x = norm(next[k]); if (x !== undefined) body[k] = x; } });
    INTERNAL.forEach(k => { if (cur[k] !== undefined) body[k] = cur[k]; });
    if (!curB) { body._layout = 1; if (apply) recPend(META, body, v, null, true); return 1; }
    if (stable(body) === liveJ(META)) return 0;
    const d = fieldDiff(cur, body);
    if (!d.ch.length && !d.full) return 0;
    if (apply) recPend(META, body, v, d.ch, d.full);
    return 1;
  }
  function diffAll(next, v, apply, noMeta) {
    let n = 0;
    Object.keys(COLL).forEach(key => { if (Array.isArray(next[key])) n += diffColl(COLL[key], next[key], v, apply); });
    Object.keys(LISTS).forEach(key => { if (Array.isArray(next[key])) n += listDiff(LISTS[key].path, next[key], v, apply, LISTS[key]); });
    if (isObj(next.accountChat)) n += diffAcct(next.accountChat, v, apply);
    if (!noMeta) n += diffMeta(next, v, apply);
    if (n && apply) built = null;
    return n;
  }

  /* ---------- write queue: one write at a time per document, 4 at most in flight ---------- */
  const hasWork = e => !!e && !!(e.del || (e.kind === "list" ? e.adds.size || e.dels.size || e.create : e.full || e.fields.size));
  const work = () => { let n = 0; pend.forEach(e => { if (hasWork(e)) n++; }); return n; };
  const qEvt = () => { if (!qT) qT = setTimeout(() => { qT = 0; fire("cd6:queue", { pending: work() }); }, 150); };
  /* list items this page sent stay watched for 10 s: when a newer copy of the document arrives (`changed`) without
     them, another device wrote the list at the same moment from an older copy, so they are sent again (3 tries at most) */
  const WATCH = 10000;
  function confirmList(path, e, changed) {
    const s = srv.get(path), have = new Set((s && Array.isArray(s.items) ? s.items : []).map(keyOf)), now = Date.now();
    let again = false;
    e.conf.forEach((c, k) => {
      if (now > c.until) e.conf.delete(k);
      else if (changed && !have.has(k)) { e.conf.delete(k); if (c.tries < 3 && !e.adds.has(k)) { e.adds.set(k, { item: c.item, ver: ++vc, pos: c.pos, tries: c.tries + 1 }); again = true; } }
    });
    e.confDel.forEach((c, k) => {
      if (now > c.until) e.confDel.delete(k);
      else if (changed && have.has(k)) { e.confDel.delete(k); if (c.tries < 3) { e.dels.set(k, ++vc); e.dt.set(k, c.tries + 1); again = true; } }
    });
    if (!hasWork(e) && !e.conf.size && !e.confDel.size) pend.delete(path);
    touch(path);
    if (again) enqueue(path);
  }
  function enqueue(path) { if (!busy.has(path) && !queued.has(path)) { queued.add(path); wait.push(path); } qEvt(); Promise.resolve().then(pump); }
  function pump() {
    while (flying < FLY && wait.length) {
      const path = wait.shift();
      queued.delete(path);
      if (busy.has(path) || !hasWork(pend.get(path))) continue;
      run(path);
    }
    if (!flying && !wait.length) idleW.slice().forEach(f => f());
  }
  function revert() { rev++; built = null; setTimeout(() => fire("cd6:remote", {}), 30); }
  function failPath(path, text) { fails++; failVer = vc; if (pend.delete(path)) touch(path); banner("doc", text); revert(); }
  function goReadOnly(text, kind) {
    fails++;
    readOnly = true;
    pend.clear(); lc.clear(); built = null; wait.length = 0; queued.clear();
    banner("ro", text || TXT.ro, kind || "doc");   /* reached when a save was refused */
    fire("cd6:mode", { mode: api.mode, readOnly: true });
    revert(); wake();
  }
  function goRevoked(fromSave) {
    if (revoked) return;
    revoked = true;
    goReadOnly(TXT.revoked, fromSave ? "doc" : "ro");
    setMode("db-offline");
  }
  const tooBig = () => ({ code: "too_big", zzTooBig: true, message: "over " + LIMIT + " bytes" });
  async function retry(fn) {
    let u = 0, r = 0;
    for (;;) {
      try { return await fn(); }
      catch (err) {
        const c = codeOf(err);
        if ((c === "unavailable" || !KNOWN.has(c)) && u < 1) { u++; await sleep(rand(250, 1000)); continue; }
        if (c === "resource_exhausted" && r < 2) { r++; await sleep(rand(1000, 3000)); continue; }
        throw err;
      }
    }
  }
  /* a list document that grew past the size limit drops its oldest items until it fits */
  function fitList(b, path) {
    const L = listInfo(path, b.cid);
    let items = b.items.slice(), body = { ...b, items };
    while (items.length && bytes(JSON.stringify(body)) > LIMIT) { items = L.dir > 0 ? items.slice(Math.max(1, Math.floor(items.length / 10))) : items.slice(0, -Math.max(1, Math.floor(items.length / 10))); body = { ...b, items }; }
    return bytes(JSON.stringify(body)) > LIMIT ? null : body;
  }
  async function send(path) {
    const e = pend.get(path), sv = vc, ref = db.doc(path), v0 = sver.get(path) || 0;
    /* keep what this write stored as the server copy, unless a server copy arrived while it was on its way
       (that copy is newer: it already has this write, or another device's change made after it) */
    const quiet = () => (sver.get(path) || 0) === v0;
    let kept = null;
    if (e.del) { await retry(() => ref.delete()); if (quiet()) srv.delete(path); }
    else if (e.kind === "list") {
      const b = fitList(live(path), path);
      if (!b) throw tooBig();
      kept = new Set(b.items.map(keyOf));   /* items dropped to fit the size limit are not sent again */
      await retry(() => ref.set(b));
    } else {
      const b = live(path);
      if (bytes(JSON.stringify(b)) > LIMIT) throw tooBig();
      if (e.full || !srv.has(path)) { await retry(() => ref.set(b)); if (quiet()) srv.set(path, b); }
      else {
        const f = {};
        e.fields.forEach((ver, k) => { f[k] = e.body[k]; });
        try { await retry(() => ref.update(f)); if (quiet()) srv.set(path, { ...srv.get(path), ...f }); }
        catch (err) {
          if (codeOf(err) !== "invalid_argument") throw err;
          /* update() needs the document to exist: someone removed it, so write it whole (last writer wins) */
          const g = await retry(() => ref.get());
          if (g && g.exists) throw err;
          await retry(() => ref.set(b));
          if (quiet()) srv.set(path, b);
        }
      }
    }
    /* drop what this write covered; changes made while it was in flight stay pending for the next write */
    const before = liveJ(path);
    if (pend.get(path) === e) {
      if (e.del && e.del <= sv) e.del = 0;
      if (e.kind === "list") {
        const until = Date.now() + WATCH;
        e.adds.forEach((a, k) => { if (a.ver <= sv) { e.adds.delete(k); if (!kept || kept.has(k)) e.conf.set(k, { ...a, until }); } });
        e.dels.forEach((ver, k) => { if (ver <= sv) { e.dels.delete(k); e.confDel.set(k, { tries: e.dt.get(k) || 0, until }); e.dt.delete(k); } });
        if (e.create <= sv) e.create = 0;
        confirmList(path, e, false);
        setTimeout(() => { const e2 = pend.get(path); if (e2 && e2.kind === "list") confirmList(path, e2, false); }, WATCH + 100);
      } else { if (e.full <= sv) e.full = 0; e.fields.forEach((ver, k) => { if (ver <= sv) e.fields.delete(k); }); if (!hasWork(e)) pend.delete(path); }
    }
    touch(path);
    if (liveJ(path) !== before) remoteChanged();
    return sv;
  }
  function run(path) {
    busy.add(path); flying++;
    send(path).then(sv => { oks++; if (sv > failVer) unbanner("doc"); }, err => {
      const c = codeOf(err);
      console.error("ZZsync write failed", path, c, err && err.message);
      if (err && err.zzTooBig) failPath(path, TXT.tooBig);
      else if (c === "invalid_argument" || c === "transform_error") goReadOnly(TXT.ro);
      else if (c === "quota_exceeded") failPath(path, TXT.full + (err && err.message ? " Details: " + String(err.message).slice(0, 120) : ""));
      else if (REVOKE.has(c)) goRevoked(true);
      else failPath(path, TXT.notSaved);
    }).then(() => {
      busy.delete(path); flying--;
      if (hasWork(pend.get(path))) enqueue(path);
      qEvt(); pump();
    });
  }
  function flush(ms) {
    const f0 = fails;
    return new Promise(res => {
      let t = 0;
      const check = () => { if (!flying && !wait.length && !work()) done(true); };
      const done = ok => { clearTimeout(t); idleW = idleW.filter(x => x !== check); res(ok && fails === f0); };
      if (ms) t = setTimeout(() => done(false), ms);
      idleW.push(check); check();
    });
  }

  /* ---------- listeners ---------- */
  const wake = () => { const w = wakers; wakers = []; w.forEach(f => f()); };
  const waitChange = ms => new Promise(r => { const t = setTimeout(r, ms); wakers.push(() => { clearTimeout(t); r(); }); });
  function remoteChanged() {
    built = null; rev++; wake();
    if (phase !== "running") return;
    clearTimeout(rt);
    rt = setTimeout(() => fire("cd6:remote", {}), 50);
  }
  function setMode(md) {
    if (api.mode === md) return md;
    const prev = api.mode;
    api.mode = md;
    if (md === "db-offline") banner("net", revoked ? TXT.revoked : TXT.off);
    else if (prev === "db-offline") {
      unbanner("net");
      /* back online: still look only, or a change that failed while the line was down was never saved */
      if (!shown && readOnly) banner("ro", revoked ? TXT.revoked : TXT.ro, "ro");
      else if (!shown && bad.doc && said.doc) banner("doc", said.doc, "again");
    }
    fire("cd6:mode", { mode: md, readOnly });
    wake();
    if (phase === "running" && md !== "local") { rev++; built = null; fire("cd6:remote", {}); }
    return md;
  }
  function applyDoc(path, data) {
    const before = liveJ(path);
    sver.set(path, (sver.get(path) || 0) + 1);
    if (data === undefined) srv.delete(path); else srv.set(path, data);
    touch(path);
    const e = pend.get(path);
    if (e && e.kind === "list") confirmList(path, e, true);
    return liveJ(path) !== before;
  }
  function onSnap(s, snap) {
    const fc = !!(snap.metadata && snap.metadata.fromCache);
    let changed = false;
    if (s.needSync && !fc) {   /* first server answer of this (re)subscription: take the whole set, drop what is gone */
      const seen = new Set();
      snap.docs.forEach(d => { const p = s.name + "/" + d.id; seen.add(p); const b = d.data(); if (b !== srv.get(p) && applyDoc(p, b)) changed = true; });
      [...srv.keys()].forEach(p => { if (p.startsWith(s.name + "/") && p.indexOf("/", s.name.length + 1) < 0 && !seen.has(p) && applyDoc(p, undefined)) changed = true; });
      s.needSync = false;
    } else {
      snap.docChanges().forEach(ch => { if (applyDoc(s.name + "/" + ch.doc.id, ch.type === "removed" ? undefined : ch.doc.data())) changed = true; });
    }
    s.fromCache = fc;
    if (fc) { if (!s.since) s.since = Date.now(); } else { s.ready = true; s.since = 0; s.tries = 0; }
    if (changed) remoteChanged();
    evaluate();
  }
  function listen(name) {
    const s = subs[name] || (subs[name] = { name, ready: false, fromCache: true, since: Date.now(), dead: false, tries: 0, unsub: null, needSync: true });
    s.dead = false; s.needSync = true; s.since = s.since || Date.now();
    try {
      s.unsub = db.collection(name).onSnapshot(snap => { try { onSnap(s, snap); } catch (e) { console.error("ZZsync snapshot", name, e); } }, err => onListenErr(s, err));
    } catch (e) { onListenErr(s, { code: "invalid_argument", message: String((e && e.message) || e) }); }
  }
  function onListenErr(s, err) {
    if (s.dead) return;
    s.dead = true; s.fromCache = true; s.since = s.since || Date.now();
    try { s.unsub && s.unsub(); } catch (e) {}
    const c = codeOf(err);
    console.warn("ZZsync listener ended", s.name, c, err && err.message);
    if (REVOKE.has(c) || c === "invalid_argument" || c === "transform_error") {
      if (phase === "starting") { abandon = true; evaluate(); return; }
      goRevoked();
      return;
    }
    /* unavailable (the bridge stopped), resource_exhausted, unknown: a fresh subscription is the only way back.
       Keep trying for the whole visit (the screens promise "it keeps trying"), waiting longer each time, 30 s at most. */
    s.tries++;
    setTimeout(() => { if (!revoked && phase !== "idle" && s.dead) listen(s.name); }, Math.min(30 * retryMs, rand(retryMs, 3 * retryMs) * Math.min(s.tries, 15)));
    evaluate();
  }
  function stopAll() { Object.values(subs).forEach(s => { s.dead = true; try { s.unsub && s.unsub(); } catch (e) {} }); clearInterval(tick); }
  function finishStart(md) {
    phase = md === "local" ? "idle" : "running";
    if (md === "local") { stopAll(); db = null; srv.clear(); lc.clear(); console.warn("ZZsync: shared data did not start; this page keeps its data on this device"); }
    setMode(md);
    const r = startRes; startRes = null; r && r(md);
  }
  function evaluate() {
    const list = Object.values(subs);
    if (!list.length) return;
    const now = Date.now(), allOk = list.every(s => s.ready && !s.fromCache && !s.dead);
    if (phase === "starting") {
      if (abandon) return finishStart("local");
      if (allOk) return finishStart("db");
      if (now - t0 >= offlineMs) return finishStart("db-offline");
      return;
    }
    if (phase !== "running") return;
    if (revoked) { if (api.mode !== "db-offline") setMode("db-offline"); return; }
    if (allOk) { if (api.mode === "db-offline") setMode("db"); return; }
    if (api.mode === "db" && list.some(s => s.dead || (s.fromCache && now - (s.since || now) >= offlineMs))) setMode("db-offline");
  }

  /* ---------- first run ---------- */
  let noteEl = null;
  function note(which) {
    try {
      const [title, sub] = NOTE[which];
      if (!noteEl) {
        noteEl = document.createElement("div");
        noteEl.setAttribute("data-zz", "sync-wait");
        noteEl.setAttribute("role", "status");
        Object.assign(noteEl.style, { position: "fixed", left: "16px", right: "16px", top: "calc(50% + 44px)", margin: "0 auto", maxWidth: "420px", boxSizing: "border-box",
          padding: "14px 16px", borderRadius: "10px", background: m.panel, color: m.text, border: `1px solid ${m.line}`, borderLeft: `3px solid ${which === "offline" ? m.red : m.amber}`,
          fontSize: "14px", lineHeight: "1.4", textAlign: "left", zIndex: "40" });
        document.body.appendChild(noteEl);
      }
      noteEl.style.borderLeft = `3px solid ${which === "offline" || which === "failed" || which === "revoked" ? m.red : m.amber}`;
      noteEl.setAttribute("data-note", which);
      noteEl.textContent = "";
      const a = document.createElement("div"), b = document.createElement("div");
      a.textContent = title; a.style.fontWeight = "700";
      b.textContent = sub; b.style.color = m.mut; b.style.fontSize = "12px"; b.style.marginTop = "4px";
      noteEl.appendChild(a); noteEl.appendChild(b);
    } catch (e) {}
  }
  const unnote = () => { try { noteEl && noteEl.remove(); } catch (e) {} noteEl = null; };
  function seedDoc() {
    const d = tx();
    if (ZZSYNC_SEED === "empty") {
      Object.assign(d, { customers: [], trailers: [], shipments: [], invoices: [], chat: [], accountChat: {}, dayClosed: {}, demoCleared: !0,
        activity: [{ id: Ce(), ts: ye(Date.now()), actor: "Office", kind: "setup", text: "Shared data started" }] });
    } else {
      d.customers = (d.customers || []).filter(c => { const k = /^cu_(\d{3})$/.exec(String(c.id)); return !k || +k[1] < 4 || +k[1] > 399; });
    }
    return d;
  }
  async function trySeed() {
    const ref = db.doc("locks/bootstrap");
    let r = null;
    try { r = await retry(() => ref.acquire({ holder: tabId, ttlMs: 60000 })); } catch (e) { return { wait: 3000, failed: true }; }
    if (!r || !r.acquired) { const ms = r && r.expiresAt ? Date.parse(r.expiresAt) - Date.now() : 2000; return { busy: true, wait: Math.max(500, Math.min(5000, ms || 2000)) }; }
    let keep = true;
    (async () => { while (keep) { await sleep(20000); if (keep) try { await ref.acquire({ holder: tabId, ttlMs: 60000 }); } catch (e) {} } })();
    try {
      const m0 = await retry(() => db.doc(META).get());
      if (m0 && m0.exists) { applyDoc(META, m0.data()); return { done: true }; }
      note("seeding");
      const d = seedDoc();
      diffAll(d, ++vc, true, true);          // records and lists first (this also replaces a half-finished earlier try)
      if (!(await flush()) || readOnly || api.mode !== "db") return { wait: 3000, failed: true };
      diffMeta(d, ++vc, true);               // portal/meta last: once it exists, the data is complete
      return (await flush()) ? { done: true } : { wait: 3000, failed: true };
    } catch (e) { console.error("ZZsync seed", e); return { wait: 3000, failed: true }; }
    finally { keep = false; }
  }
  async function waitForData() {
    for (;;) {
      if (api.mode === "local") { unnote(); try { const r = await window.ZZlocal.get(Rj); return ZZt10(JSON.parse(r.value)); } catch (e) { return tx(); } }
      if (live(META) !== undefined) { unnote(); return api.read(); }
      if (api.mode === "db" && !readOnly && owner) {
        const r = await trySeed();
        if (r.done) continue;
        note(r.busy ? "busy" : "failed");
        /* someone else holds the setup lease: wait it out (or until their data shows up), do not keep asking */
        const until = Date.now() + (r.wait || 2000);
        while (Date.now() < until && live(META) === undefined && api.mode === "db") await waitChange(until - Date.now());
        continue;
      }
      note(revoked ? "revoked" : api.mode === "db-offline" ? "offline" : "wait");
      await waitChange(5000);
    }
  }

  /* ---------- photos ---------- */
  const pdir = key => "photos/" + enc(String(key).replace(/^cd6:photos:/, "")) + "/items";
  const pchain = {}, seenP = {};   /* seenP[key]: photo documents this page has seen; only those can be removed from here */
  let assetsNs;
  const getAssets = async () => { if (assetsNs === undefined) { assetsNs = null; const cl = window.claude; if (cl && cl.use) assetsNs = await soon(safe(() => cl.use("assets")), 5000); } return assetsNs; };
  const shrink = (src, px, q) => new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => { try { const k = Math.min(1, px / Math.max(im.width, im.height)), c = document.createElement("canvas"); c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k)); c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL("image/jpeg", q)); } catch (e) { rej(e); } };
    im.onerror = () => rej(new Error("decode failed"));
    im.src = src;
  });
  const toBlob = src => { const k = src.indexOf(","), meta = src.slice(5, k), bin = atob(src.slice(k + 1)), u = new Uint8Array(bin.length); for (let q = 0; q < bin.length; q++) u[q] = bin.charCodeAt(q); return new Blob([u], { type: meta.split(";")[0] || "image/jpeg" }); };
  async function photoBody(p) {
    const body = { ...p };
    delete body.src;
    let src = typeof p.src === "string" ? p.src : "";
    if (src.startsWith("data:image/") && bytes(src) > PHOTO_MAX) {   /* big photos are re-encoded at 700 px */
      src = await shrink(src, 700, .62);
      if (bytes(src) > PHOTO_MAX) src = await shrink(src, 560, .5);
    }
    const a = src.startsWith("data:image/") ? await getAssets() : null;
    if (a) {
      try { const up = await a.upload(toBlob(src), { type: src.slice(5, src.indexOf(";")) || "image/jpeg" }); if (up && up.id) { body.assetId = up.id; return body; } }
      catch (e) { console.warn("ZZsync photo upload failed, keeping it in the database", e && e.code); }
    }
    body.src = src;
    if (bytes(JSON.stringify(body)) > LIMIT) throw { code: "too_big", zzTooBig: true };
    return body;
  }
  const readPhotos = snap => snap.docs.map(d => { const b = { ...d.data() }; if (b.id == null) b.id = d.id; if (!b.src && b.assetId) b.src = "/_blob/" + b.assetId; return b; })
    .sort((x, y) => String(x.at || "").localeCompare(String(y.at || "")) || String(x.id).localeCompare(String(y.id)));

  /* ---------- the interface ---------- */
  const refuse = (text, kind) => { const e = new Error(text); e.zzText = text; e.zzKind = kind; e.code = "zz_refused"; return e; };
  const api = {
    mode: "local",
    start: () => startP || (startP = (async () => {
      t0 = Date.now();
      offlineMs = (window.__ZZTEST && +window.__ZZSYNC_OFFLINE_MS) || 20000;
      retryMs = (window.__ZZTEST && +window.__ZZSYNC_RETRY_MS) || 1000;   /* tests only: shorter waits between listener retries */
      const cl = window.claude;
      if (!cl || typeof cl.use !== "function") return setMode("local");
      /* ask for both at once (the public link answers null fast; a host that never answers gives null after 10 s) */
      const dbP = soon(safe(() => cl.use("db")), 12000), unP = soon(safe(() => cl.use("user")), 12000);
      const dbn = await dbP;
      if (!dbn) return setMode("local");
      const un = await unP;
      if (!un) return setMode("local");
      const who = (await soon(Promise.all([safe(() => un.isOwner()), safe(() => un.canEdit()), safe(() => un.can("data.write"))]), 8000)) || [];
      if (!(who[0] === true || who[1] === true || who[2] === true)) return setMode("local");
      db = dbn; owner = who[0] === true; phase = "starting";
      t0 = Date.now();   /* the 20 s without a server answer count from the moment the listeners start */
      return new Promise(res => { startRes = res; NAMES.forEach(listen); tick = setInterval(evaluate, 500); evaluate(); });
    })()),
    read: () => {
      if (api.mode === "local" || live(META) === undefined) return null;
      if (!built) built = build();
      return built ? structuredClone(built) : null;
    },
    write: async next => {
      if (api.mode === "local") { await window.ZZlocal.set(Rj, JSON.stringify(next), true); return next; }
      if (!next || typeof next !== "object") return next;
      if (api.mode !== "db" || readOnly || live(META) === undefined) {
        if (!diffAll(next, 0, false)) return next;   /* nothing changed: nothing to refuse */
        throw readOnly ? refuse(revoked ? TXT.revoked : TXT.ro, "ro") : api.mode === "db-offline" ? refuse(TXT.off, "net") : refuse(TXT.notReady, "doc");
      }
      rev = Math.max(rev, +next.rev || 0);
      if (next.touchedAt) touchedAt = next.touchedAt;
      diffAll(next, ++vc, true);
      return next;
    },
    seed: async () => api.mode === "local" ? tx() : waitForData(),
    fresh: () => { if (api.mode !== "local") throw new Error("ZZsync.fresh: no demo over shared data"); return tx(); },
    failed: (err, kind) => {
      const asked = kind || "doc";
      kind = (err && err.zzKind) || asked;
      const full = isFull(err), shared = api.mode !== "local";
      const text = err && err.zzText ? err.zzText
        : kind === "photo"
          ? (shared ? (err && err.zzTooBig ? TXT.photoBig : TXT.photo)
            : full ? "Photo NOT saved: storage on this device is full. Delete old photos or use another device, and tell the office."
              : "Photo NOT saved on this device. Please try again.")
          : (shared ? TXT.notSaved
            : full ? "Storage on this device is full: your last change was NOT saved. Delete old photos or use another device, and tell the office."
              : "Your last change was NOT saved on this device. Please try again.");
      bad[kind] = true; shown = kind; said[kind] = text;
      if (kind === "doc") failVer = vc;
      fire("cd6:sync", { text, kind: asked, slot: kind, full });
      if (shared && asked === "doc") revert();   /* put the screen back to what is really saved */
      return text;
    },
    /* internal: a save of this kind worked again, so clear the banner if it is still showing that kind's message */
    ok: kind => unbanner(kind || "doc"),
    lease: async (name, fn) => {
      if (api.mode !== "db" || readOnly || !db) return fn();
      const ref = db.doc("locks/" + enc(name)), until = Date.now() + 8000;
      let got = false;
      while (!got && Date.now() < until) {
        let r = null;
        try { r = await ref.acquire({ holder: tabId, ttlMs: 4000 }); } catch (e) { break; }
        got = !!(r && r.acquired);
        if (!got) await sleep(rand(150, 400));
      }
      /* see what the other device just saved before deciding (a free door) */
      /* see what the other device just saved before deciding (a free door); also when the lease could not be had */
      if (name === "doors") {
        try {
          const s = await retry(() => db.collection("trailers").where("dock", "in", Gi.slice(0, 30)).get());
          let ch = false;
          s.docs.forEach(d => { if (applyDoc("trailers/" + d.id, d.data())) ch = true; });
          if (ch) remoteChanged();
        } catch (e) {}
      }
      let keep = got, renew = null;
      (async () => { while (keep) { await sleep(2500); if (keep) { renew = ref.acquire({ holder: tabId, ttlMs: 4000 }).catch(() => null); await renew; } } })();
      try { const r = await fn(); await flush(6000); return r; }
      finally {
        /* let the lease run out in 1 s (there is no release call); wait for a renewal on its way so it cannot lengthen it again */
        if (keep) { keep = false; try { await renew; await ref.acquire({ holder: tabId, ttlMs: 1000 }); } catch (e) {} }
      }
    },
    photoGet: async key => {
      if (api.mode === "local" || !db) return window.ZZlocal.get(key);
      let snap;
      /* a read that fails shows no photos; forget what this page saw, so the next save there cannot delete
         photos the screen could not show (only photos seen on screen are ever removed from here) */
      try { snap = await retry(() => db.collection(pdir(key)).get()); }
      catch (e) { seenP[key] = new Set(); throw e; }
      const items = readPhotos(snap);
      photoN.set(key, items.length);
      seenP[key] = new Set(snap.docs.map(d => d.id));
      if (!items.length) throw new Error("absent");
      return { value: JSON.stringify(items) };
    },
    photoSet: (key, value) => (pchain[key] = (pchain[key] || Promise.resolve()).catch(() => {}).then(async () => {
      if (api.mode === "local" || !db) return window.ZZlocal.set(key, value);
      if (api.mode !== "db" || readOnly) throw readOnly ? refuse(revoked ? TXT.revoked : TXT.ro, "ro") : refuse(TXT.off, "net");
      let want = JSON.parse(value);
      if (!Array.isArray(want)) want = [];
      const col = db.collection(pdir(key)), snap = await retry(() => col.get()), have = new Map();
      snap.docs.forEach(d => have.set(d.id, d.data()));
      const keepIds = new Set();
      for (const p of want) {
        if (!p || typeof p !== "object") continue;
        const id = p.id != null ? String(p.id) : Ce(), did = enc(id);
        keepIds.add(did);
        if (have.has(did)) continue;
        const body = await photoBody({ ...p, id, at: p.at || ye(Date.now()) });
        await retry(() => col.doc(did).set(body));
      }
      /* remove only photos this page had seen: one another device added a moment ago stays */
      const seen = seenP[key] || new Set();
      for (const [did, b] of have) if (!keepIds.has(did)) {
        if (!seen.has(did)) { keepIds.add(did); continue; }
        await retry(() => col.doc(did).delete());
        if (b && b.assetId) { const a = await getAssets(); if (a) try { await a.delete(b.assetId); } catch (e) {} }
      }
      seenP[key] = new Set(keepIds);
      photoN.set(key, keepIds.size);
      unbanner("photo");
    })),
    importLocal: async onProgress => {
      const no = reason => ({ ok: false, done: 0, total: 0, reason });
      if (api.mode === "local" || !db) return no("Shared data is not switched on for this page.");
      if (api.mode !== "db") return no(TXT.off);
      if (readOnly) return no(TXT.ro);
      if (!owner) return no("Only the owner can move a computer's data into the shared database.");
      if (importing) return no("Already moving data. Wait for it to finish.");
      let d;
      try { const r = await window.ZZlocal.get(Rj); d = CQ(ZZt10(JSON.parse(r.value))); } catch (e) { return no("This computer has no saved dock data to move."); }
      const pkeys = [];
      try { Object.keys(localStorage).forEach(k => { if (k.startsWith("cdweb:cd6:photos:")) pkeys.push(k.slice(6)); }); } catch (e) {}
      importing = true;
      const tell = (done, total) => { try { onProgress && onProgress({ done, total }); } catch (e) {} fire("cd6:queue", { pending: work() }); };
      try {
        const o0 = oks;
        diffAll(d, ++vc, true);
        const total = work() + pkeys.length;
        let done = 0;
        tell(0, total);
        const timer = setInterval(() => tell(Math.min(total, done + oks - o0), total), 250);
        const ok = await flush();
        clearInterval(timer);
        done = Math.min(total - pkeys.length, oks - o0);
        let pbad = 0;
        for (const k of pkeys) {
          try { const r = await window.ZZlocal.get(k); await api.photoSet(k, r.value); } catch (e) { pbad++; console.error("ZZsync photo import", k, e); }
          done++; tell(done, total);
        }
        revert();
        tell(total, total);
        const failed = !ok || pbad;
        return { ok: !failed, done: total, total, trucks: (d.trailers || []).length, loads: (d.shipments || []).length, accounts: (d.customers || []).length,
          reason: failed ? (pbad ? `${pbad} photo group(s) could not be moved. ` : "") + (ok ? "" : "Some records could not be saved. Try again.") : "" };
      } finally { importing = false; }
    },
    flush,
    stats: () => ({ mode: api.mode, readOnly, owner, importing, docs: srv.size + [...photoN.values()].reduce((a, b) => a + b, 0), cap: DOC_CAP, pending: work() + flying }),
    /* owner's card: what this computer has saved (read once, on demand) */
    localSummary: () => {
      try {
        const raw = localStorage.getItem("cdweb:" + Rj);
        if (!raw) return null;
        const d = JSON.parse(raw);
        let photos = 0;
        Object.keys(localStorage).forEach(k => { if (k.startsWith("cdweb:cd6:photos:")) photos++; });
        /* the untouched demo has the numbered sample accounts cu_000..cu_399; real accounts never look like that */
        const demo = !d.demoCleared && (d.customers || []).some(c => c && /^cu_\d{3}$/.test(String(c.id)));
        return { trucks: (d.trailers || []).length, loads: (d.shipments || []).length, accounts: (d.customers || []).length, photos, demo };
      } catch (e) { return null; }
    }
  };
  return api;
})();

var ZZs_h = (t, p, ...c) => H.createElement(t, p, ...c);

/* "Live · shared" / "Saved on this device only" strip on staff screens (office and crew), patch A08 */
var ZZModeBadge = ({ role }) => {
  const [md, setMd] = (0, H.useState)(() => ZZsync.mode + (ZZsync.stats().readOnly ? ":ro" : ""));
  (0, H.useEffect)(() => {
    const f = () => setMd(ZZsync.mode + (ZZsync.stats().readOnly ? ":ro" : ""));
    window.addEventListener("cd6:mode", f);
    f();
    return () => window.removeEventListener("cd6:mode", f);
  }, []);
  if (role !== "office" && role !== "crew") return null;
  const ro = md.endsWith(":ro"), mode = md.replace(":ro", ""), live = mode === "db" && !ro, look = mode === "db-offline" || ro;
  return (0, i.jsx)("div", {
    "data-zz": "mode",
    "data-mode": mode,
    className: "text-[11px] text-center",
    style: { padding: "2px 8px", color: live ? m.green : look ? m.amber : m.dim, background: m.panel, borderBottom: `1px solid ${m.line}`, letterSpacing: ".02em" },
    children: mode === "db" ? (ro ? R("Live \xB7 shared \xB7 look only") : R("Live \xB7 shared")) : mode === "db-offline" ? R("Shared data offline \xB7 look only") : R("Saved on this device only")
  });
};

/* Setup card (stream E renders it when it exists): mode, record count, saving state, the owner's import button */
var ZZSyncCard = () => {
  const [st, setSt] = (0, H.useState)(() => ZZsync.stats());
  const [ask, setAsk] = (0, H.useState)(false), [prog, setProg] = (0, H.useState)(null), [res, setRes] = (0, H.useState)(null), [here, setHere] = (0, H.useState)(null);
  (0, H.useEffect)(() => {
    const f = () => setSt(ZZsync.stats()), ev = ["cd6:mode", "cd6:queue", "cd6:remote"];
    ev.forEach(n => window.addEventListener(n, f));
    const t = setInterval(f, 3000);
    return () => { ev.forEach(n => window.removeEventListener(n, f)); clearInterval(t); };
  }, []);
  const canMove = st.owner && st.mode === "db" && !st.readOnly;
  (0, H.useEffect)(() => { if (canMove) setHere(ZZsync.localSummary()); }, [canMove]);
  const h = ZZs_h, shared = st.mode !== "local", n = x => Number(x || 0).toLocaleString("en-US");
  const pill = st.mode === "db" ? (st.readOnly ? ["Live \xB7 look only", m.amber] : ["Live \xB7 shared", m.green]) : st.mode === "db-offline" ? ["Offline \xB7 look only", m.amber] : ["This device only", m.mut];
  const about = st.mode === "db"
    ? (st.readOnly ? "Everyone on this staff page sees the same trucks, loads and chats, live. This login can look but not change shared data."
      : "Everyone signed in on this staff page sees the same trucks, loads and chats, live. Every change is saved to the shared data.")
    : st.mode === "db-offline" ? "The shared data can't be reached right now. You can look, but changes are paused until it reconnects. It keeps trying by itself."
      : "This page keeps its data on this device only. Phones and tablets each keep their own copy. To share one board between the office, crew phones, the kiosk and the TV, use the staff page with shared data switched on.";
  const box = (label, value, sub, color) => h("div", { className: "rounded-lg p-3", style: { ...ne, minWidth: 0 } },
    h("div", { className: "text-xs font-semibold", style: { color: m.mut } }, label),
    h("div", { className: "text-lg font-bold", style: { color: color || m.text } }, value),
    sub ? h("div", { className: "text-xs mt-0.5", style: { color: m.dim } }, sub) : null);
  const pct = Math.min(100, Math.round(st.docs / st.cap * 100)), near = st.docs > st.cap * .8;
  const go = async () => {
    setAsk(false); setRes(null); setProg({ done: 0, total: 0 });
    let r = null;
    try { r = await ZZsync.importLocal(p => setProg(p)); } catch (e) { r = { ok: false, reason: "Something went wrong. Try again." }; }
    setProg(null); setRes(r); setSt(ZZsync.stats());
  };
  const bar = (done, total) => h("div", { className: "rounded-full overflow-hidden", style: { height: 6, background: m.raised, border: `1px solid ${m.line}` } },
    h("div", { style: { width: `${total ? Math.round(done / total * 100) : 0}%`, height: "100%", background: m.orange, transition: "width .2s" } }));
  return h(de, { className: "p-4 space-y-3", style: { color: m.text } },
    h("div", { "data-zz": "sync-card", className: "space-y-3" },
      h("div", { className: "flex items-start justify-between gap-2 flex-wrap" },
        h("div", { className: "min-w-0" },
          h("div", { className: "font-bold" }, "Shared data"),
          h("div", { className: "text-xs mt-0.5", style: { color: m.mut } }, about)),
        h(ve, { label: pill[0], color: pill[1] })),
      shared ? h("div", { className: "grid grid-cols-2 gap-2" },
        box("Records in the shared data", n(st.docs), `of ${n(st.cap)} allowed${near ? " \xB7 getting full" : ""}`, near ? m.amber : null),
        box("Changes", st.pending ? `Saving ${n(st.pending)}…` : "All saved", st.pending ? "Keep this page open" : "Nothing waiting", st.pending ? m.amber : m.green)) : null,
      shared ? h("div", { className: "text-xs", style: { color: m.dim } }, "Each photo is one record too. Photos are counted here once they have been opened on this device.") : null,
      shared && near ? h("div", { className: "text-xs", style: { color: m.amber } }, `The shared data is ${pct}% full. Old trucks and loads need to be archived before it reaches the limit.`) : null,
      canMove ? h("div", { className: "rounded-lg p-3 space-y-2", style: { ...ne } },
        h("div", { className: "font-semibold text-sm" }, "Move this computer's data into the shared database"),
        h("div", { className: "text-xs", style: { color: m.mut } },
          "Copies the trucks, loads, accounts, invoices, chats, settings and photos saved in this browser into the shared data, so every staff device sees them. It replaces what the shared data has now."),
        here ? h("div", { className: "text-xs", style: { color: m.text } }, `This computer has ${n(here.trucks)} trucks, ${n(here.loads)} loads and ${n(here.accounts)} accounts${here.photos ? `, plus photos for ${n(here.photos)} items` : ""}.`)
          : h("div", { className: "text-xs", style: { color: m.dim } }, "This computer has no saved dock data to move."),
        here && here.demo ? h("div", { className: "text-xs font-semibold", style: { color: m.amber } }, "This computer's copy is the demo (sample trucks and accounts), not real dock data.") : null,
        prog ? h("div", { className: "space-y-1", role: "status" }, bar(prog.done, prog.total),
          h("div", { className: "text-xs", style: { color: m.mut } }, prog.total ? `Moving… ${n(prog.done)} of ${n(prog.total)} steps. Keep this page open.` : "Getting ready…"))
          : ask ? h("div", { className: "space-y-2" },
            h("div", { className: "text-sm", style: { color: m.amber } }, "Replace the shared data with this computer's copy? Everyone on the staff page sees the change at once."),
            h("div", { className: "flex gap-2 flex-wrap" },
              h(Z, { kind: "danger", onClick: go }, "Yes, replace the shared data"),
              h(Z, { kind: "ghost", onClick: () => setAsk(false) }, "Cancel")))
            : h(Z, { kind: "primary", icon: Bd, disabled: !here, onClick: () => { setRes(null); setAsk(true); } }, "Move this computer's data…"),
        res ? h("div", { className: "text-sm font-semibold", role: "status", style: { color: res.ok ? m.green : m.red } },
          res.ok ? `Done. The shared data now has this computer's ${n(res.trucks)} trucks, ${n(res.loads)} loads and ${n(res.accounts)} accounts.` : `Not finished: ${res.reason || "try again."}`) : null)
        : shared && !st.owner ? h("div", { className: "text-xs", style: { color: m.dim } }, "Only the owner can move a computer's data into the shared database.") : null));
};

/* tests only (the harness sets window.__ZZTEST): mount the card on its own, for builds without stream E */
if (window.__ZZTEST) { try { window.__zzsync = { api: ZZsync, mount: el => { const r = Zj.createRoot(el); r.render(H.createElement(ZZSyncCard, {})); return r; } }; } catch (e) {} }
