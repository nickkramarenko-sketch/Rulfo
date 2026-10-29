/* In-browser stand-in for the artifact runtime (window.claude.use) used by the portal tests in shared mode.
   Follows the runtime contract 0.2.91 (claude.d.ts, db.d.ts, user.d.ts, assets.d.ts) for what ZZsync (stream A1) uses:
     claude.use(name)       memoized promise per served name; a name not served (or not in opts.caps) resolves null
     db.doc(path) / db.collection(path) / ref.collection(sub) / coll.doc(id)
                            path grammar checked synchronously (TypeError): even segments = document, odd = collection,
                            segments of letters, digits and _ - . ~ : @ + only (never "." or ".."), <= 200 bytes,
                            <= 1000 bytes and 16 segments per path
     DocumentReference      get, set (whole document), update (must exist; nested objects merge, arrays replace),
                            delete, acquire({holder, ttlMs, data}), onSnapshot(next, error), collection(sub)
     Query                  where (<= 10, ops == != < <= > >= in not-in array-contains, in/not-in arrays <= 30),
                            orderBy (one), limit (1..1000); a bad builder argument does NOT throw: the query carries
                            the error and get() rejects / onSnapshot calls error() with invalid_argument
     CollectionReference    doc(id?), add(data)
     snapshots              {docs, size, empty, docChanges(), metadata:{fromCache, hasPendingWrites}}; frozen data;
                            an unchanged document is the same object across deliveries
     own writes             appear at once in this page's listeners (hasPendingWrites:true), then confirmed
     errors                 plain {code, message} objects (DbError); bodies over 256 KiB (UTF-8) or 32 levels reject
                            invalid_argument; 64 subscriptions per page max (resource_exhausted on the error callback)
   The "server" is IndexedDB '__mockdb_idb' (one atomic read-modify-write per write, like a real server, even when two
   pages write the same document at the same moment), mirrored to localStorage '__mockdb' ({docPath: body}). Pages in
   one browser context share it (two pages = two devices); a BroadcastChannel tells the other pages what changed.

   Options, set before this script runs: window.__MOCK = {
     caps: ['db','user'],           // which namespaces claude.use() serves (add 'assets' to test asset photos)
     isOwner: true, canEdit: true,
     can: true,                     // user.can('data.write'): true | false | null (null = the platform says nothing)
     userId: 'u_test',
     canWrite: true,                // false: every write and acquire rejects invalid_argument (a read-only viewer)
     cachedFirst: false,            // every new listener first gets a cached, EMPTY snapshot (fromCache:true)
     serverDelay: 15,               // ms before the first server (fromCache:false) snapshot
     neverServer: false,            // never send a server snapshot (offline start)
     writeDelay: 10,                // ms a write takes
     ackDelay: 0,                   // ms between the server storing a write and the call resolving (other pages may hear first)
     useDelay: 20, useNever: false, // claude.use() answer time; useNever: resolves null after 10 s (host never answers)
     seed: null                     // {docPath: body} written once if the store is empty
   }
   Test hooks: window.__mockdb = {dump() (Promise), writes ([{op, path, bytes, data, sent}] of this page), overlaps, stats(),
     reset(seed), failNext(code, n, op?) (op: set | update | delete | get | listen; none = any write), leases() (Promise),
     listeners(), setOffline(bool), killListeners(code), opts} */
(function () {
  'use strict';
  var opts = Object.assign({ caps: ['db', 'user'], isOwner: true, canEdit: true, can: true, userId: 'u_test', canWrite: true,
    cachedFirst: false, serverDelay: 15, neverServer: false, writeDelay: 10, useDelay: 20, useNever: false, seed: null }, window.__MOCK || {});
  var KEY = '__mockdb', IDB = '__mockdb_idb', MAX = 256 * 1024;
  var OPS = ['==', '!=', '<', '<=', '>', '>=', 'in', 'not-in', 'array-contains'];
  function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
  function deepFreeze(o) { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); Object.keys(o).forEach(function (k) { deepFreeze(o[k]); }); } return o; }
  function dbErr(code, msg) { return { code: code, message: msg || code }; }
  function later(fn, ms) { setTimeout(fn, ms || 0); }
  function utf8(s) { try { return new TextEncoder().encode(s).length; } catch (e) { return s.length; } }
  var writes = [], overlaps = [], fails = [], listeners = [], seq = 0, overlay = {}, wseq = 0;
  var stat = { inflight: 0, maxInflight: 0, busy: {} };

  /* ---------- the server: IndexedDB, mirrored to localStorage ---------- */
  var store = {};   // this page's copy of the server store
  try { store = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { store = {}; }
  function mirror() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }
  var idbP = null, bc = null;
  try { bc = new BroadcastChannel('__mockdb'); } catch (e) {}
  function idb() {
    return idbP || (idbP = new Promise(function (res, rej) {
      var r = indexedDB.open(IDB, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('docs'); r.result.createObjectStore('leases'); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    }));
  }
  function txn(os, mode, body) {   // body(objectStore) issues requests and returns a getter for the result
    return idb().then(function (d) { return new Promise(function (res, rej) {
      var t = d.transaction(os, mode), out = body(t.objectStore(os));
      t.oncomplete = function () { res(out()); };
      t.onerror = t.onabort = function () { rej(t.error); };
    }); });
  }
  /* one atomic read-modify-write of one key: fn(current) -> {put: value} | {del: true} | anything else (no change) */
  function rmw(os, key, fn) {
    return txn(os, 'readwrite', function (st) {
      var out = null, g = st.get(key);
      g.onsuccess = function () { out = fn(g.result); if (out && out.put !== undefined) st.put(out.put, key); else if (out && out.del) st.delete(key); };
      return function () { return out; };
    });
  }
  function readAll(os) {
    return txn(os, 'readonly', function (st) {
      var ks = st.getAllKeys(), vs = st.getAll();
      return function () { var o = {}; ks.result.forEach(function (k, i) { o[k] = vs.result[i]; }); return o; };
    });
  }
  function loadAll() { return readAll('docs').then(function (o) { store = o; mirror(); return o; }); }
  var ready = txn('docs', 'readwrite', function (st) {   // seed once, even when several pages start together
    var seed = opts.seed ? clone(opts.seed) : null, c = st.count();
    c.onsuccess = function () { if (!c.result && seed) Object.keys(seed).forEach(function (k) { st.put(seed[k], k); }); };
    return function () {};
  }).then(loadAll).catch(function (e) { console.error('mock-db', e); });
  function announce(paths) { try { bc && bc.postMessage({ paths: paths }); } catch (e) {} }
  if (bc) bc.onmessage = function (ev) {   // another page committed: refresh those documents
    var m = ev.data || {};
    if (m.all) return loadAll().then(function () { deliverAll(); });
    if (!m.paths) return;
    txn('docs', 'readonly', function (st) {
      var got = {};
      m.paths.forEach(function (p) { var r = st.get(p); r.onsuccess = function () { got[p] = r.result; }; });
      return function () { return got; };
    }).then(function (got) { m.paths.forEach(function (p) { if (got[p] === undefined) delete store[p]; else store[p] = got[p]; }); mirror(); deliverAll(); });
  };

  /* ---------- paths (TypeError at build time, as the contract says) ---------- */
  var SEG = /^[A-Za-z0-9_\-.~:@+]+$/;
  function parts(path) {
    if (typeof path !== 'string' || !path) throw new TypeError('path must be a non-empty string');
    var p = path.split('/');
    if (p.length > 16) throw new TypeError('more than 16 segments: ' + path);
    if (utf8(path) > 1000) throw new TypeError('path over 1000 bytes');
    p.forEach(function (s) {
      if (!s) throw new TypeError('empty segment in ' + path);
      if (s === '.' || s === '..') throw new TypeError('segment "' + s + '" is not allowed: ' + path);
      if (!SEG.test(s)) throw new TypeError('segment "' + s + '" has a character outside letters, digits and _ - . ~ : @ +: ' + path);
      if (utf8(s) > 200) throw new TypeError('segment over 200 bytes: ' + path);
    });
    return p;
  }
  function docPath(path) { var p = parts(path); if (p.length % 2) throw new TypeError('a document path needs an even number of segments (got ' + p.length + '): ' + path); return path; }
  function collPath(path) { var p = parts(path); if (!(p.length % 2)) throw new TypeError('a collection path needs an odd number of segments (got ' + p.length + '): ' + path); return path; }
  function parentOf(path) { return path.split('/').slice(0, -1).join('/'); }
  function idOf(path) { var p = path.split('/'); return p[p.length - 1]; }

  /* this page's view: the server store plus this page's own writes that are not confirmed yet */
  function view() {
    var s = Object.assign({}, store);
    Object.keys(overlay).forEach(function (p) { if (overlay[p].del) delete s[p]; else s[p] = overlay[p].body; });
    return s;
  }

  /* ---------- writes ---------- */
  function depth(v, d) { if (!v || typeof v !== 'object') return d; var m = d; Object.keys(v).forEach(function (k) { m = Math.max(m, depth(v[k], d + 1)); }); return m; }
  /* failNext(code, n, op): the next n calls of that kind reject with code. op: set | update | delete (writes; no op =
     any write), get (one-time reads), listen (new subscriptions end at once on their error callback) */
  function injected(op) {
    for (var k = 0; k < fails.length; k++) {
      var f = fails[k];
      var hit = f.op ? f.op === op : (op === 'set' || op === 'update' || op === 'delete');
      if (hit) { f.n--; if (f.n <= 0) fails.splice(k, 1); return dbErr(f.code, 'injected ' + f.code); }
    }
    return null;
  }
  function checkBody(data, op, path) {
    var inj = injected(op);
    if (inj) return inj;
    if (opts.canWrite === false) return dbErr('invalid_argument', 'this viewer cannot write shared documents');
    if (op === 'delete') return null;
    if (!data || typeof data !== 'object' || Array.isArray(data)) return dbErr('invalid_argument', 'body must be a plain object');
    var bytes = utf8(JSON.stringify(data));
    if (bytes > MAX) return dbErr('invalid_argument', 'document over 256 KiB: ' + path + ' (' + bytes + ' bytes)');
    if (depth(data, 0) > 32) return dbErr('invalid_argument', 'document more than 32 levels deep');
    return null;
  }
  function merge(base, patch) {
    var out = clone(base) || {};
    Object.keys(patch).forEach(function (k) {
      var v = patch[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) out[k] = merge(out[k], v);
      else out[k] = clone(v);
    });
    return out;
  }
  /* after the server stored it: this page's copy, the mirror, the other pages, and the writes log
     (data = the stored document after the write, sent = what the caller passed; update: only the changed fields) */
  function committed(op, path, body, sent) {
    if (op === 'delete') delete store[path]; else store[path] = body;
    mirror(); announce([path]);
    writes.push({ op: op, path: path, bytes: body ? utf8(JSON.stringify(body)) : 0, at: Date.now(), data: clone(body), sent: sent === undefined ? undefined : clone(sent) });
  }
  function write(op, path, data) {
    var e = checkBody(data, op, path);
    if (e) return new Promise(function (res, rej) { later(function () { rej(e); }, 1); });
    if (stat.busy[path]) overlaps.push({ op: op, path: path, at: Date.now() });   // a second write to one document while the first is in flight
    stat.busy[path] = (stat.busy[path] || 0) + 1;
    stat.inflight++; stat.maxInflight = Math.max(stat.maxInflight, stat.inflight);
    var done = function () { stat.busy[path]--; if (!stat.busy[path]) delete stat.busy[path]; stat.inflight--; };
    var my = ++wseq, cur = view()[path];
    if (!opts.offline && !(op === 'update' && cur === undefined)) {
      overlay[path] = { del: op === 'delete', body: op === 'update' ? merge(cur, data) : op === 'set' ? clone(data) : null, seq: my };
      later(function () { deliverAll(); });   // latency compensation: this page sees its own write at once
    }
    return new Promise(function (res, rej) {
      later(function () {
        var drop = function () { if (overlay[path] && overlay[path].seq === my) delete overlay[path]; };
        if (opts.offline) { drop(); done(); deliverAll(); return rej(dbErr('unavailable', 'offline')); }
        rmw('docs', path, function (cur) {
          if (op === 'update' && cur === undefined) return { missing: true };
          return op === 'delete' ? { del: true } : { put: op === 'update' ? merge(cur, data) : clone(data) };
        }).then(function (out) {
          if (out.missing) { drop(); done(); deliverAll(); return rej(dbErr('invalid_argument', 'update needs an existing document: ' + path)); }
          committed(op, path, out.del ? null : out.put, data);
          drop(); done();
          deliverAll();
          if (opts.ackDelay) later(res, opts.ackDelay); else res();
        }, function (e) { drop(); done(); deliverAll(); rej(dbErr('unavailable', String(e))); });
      }, opts.writeDelay);
    });
  }

  /* ---------- snapshots ---------- */
  function meta(pending) { return { fromCache: !!opts.offline, hasPendingWrites: !!pending }; }
  function makeDocSnap(id, body, md) {
    var b = body === undefined ? undefined : deepFreeze(clone(body));
    return Object.freeze({ id: id, exists: body !== undefined, data: function () { return b; }, metadata: md });
  }
  function getField(o, f) { return f.split('.').reduce(function (a, k) { return a == null ? undefined : a[k]; }, o); }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function test(v, op, x) {
    switch (op) {
      case '==': return same(v, x);
      case '!=': return v !== undefined && !same(v, x);
      case '<': return v !== undefined && v < x; case '<=': return v !== undefined && v <= x;
      case '>': return v !== undefined && v > x; case '>=': return v !== undefined && v >= x;
      case 'in': return x.some(function (y) { return same(y, v); });
      case 'not-in': return v !== undefined && !x.some(function (y) { return same(y, v); });
      case 'array-contains': return Array.isArray(v) && v.some(function (y) { return same(y, x); });
    }
    return false;
  }
  function runQuery(q, s) {
    var paths = Object.keys(s).filter(function (p) { return parentOf(p) === q.coll; });
    paths = paths.filter(function (p) { return q.filters.every(function (f) { return test(getField(s[p], f[0]), f[1], f[2]); }); });
    if (q.order) {
      var f = q.order[0], dir = q.order[1] === 'desc' ? -1 : 1;
      paths.sort(function (a, b) {
        var x = getField(s[a], f), y = getField(s[b], f);
        if (x === undefined && y === undefined) return idOf(a) < idOf(b) ? -1 : 1;
        if (x === undefined) return 1; if (y === undefined) return -1;
        return x < y ? -dir : x > y ? dir : (idOf(a) < idOf(b) ? -1 : 1);
      });
    } else paths.sort(function (a, b) { return idOf(a) < idOf(b) ? -1 : idOf(a) > idOf(b) ? 1 : 0; });
    if (q.lim) paths = paths.slice(0, q.lim);
    return paths;
  }
  function querySnap(l, paths, s, md) {
    var prev = l.prev || {}, prevOrder = l.prevOrder || [], next = {}, docs = [], changes = [];
    paths.forEach(function (p, i) {
      var json = JSON.stringify(s[p]);
      var d = prev[p] && prev[p].json === json ? prev[p].snap : makeDocSnap(idOf(p), s[p], md);
      next[p] = { json: json, snap: d };
      docs.push(d);
      if (!prev[p]) changes.push({ type: 'added', doc: d, oldIndex: -1, newIndex: i });
      else if (prev[p].json !== json) changes.push({ type: 'modified', doc: d, oldIndex: prevOrder.indexOf(p), newIndex: i });
    });
    prevOrder.forEach(function (p, i) { if (!next[p]) changes.push({ type: 'removed', doc: prev[p].snap, oldIndex: i, newIndex: -1 }); });
    l.prev = next; l.prevOrder = paths.slice();
    return { snap: Object.freeze({ docs: docs, size: docs.length, empty: !docs.length, docChanges: function () { return changes.slice(); }, metadata: md }), changed: changes.length > 0 };
  }
  function deliver(l, force) {
    if (l.dead || !l.server) return;
    var s = view(), pending = Object.keys(overlay), md;
    try {
      if (l.kind === 'doc') {
        md = meta(pending.indexOf(l.path) >= 0);
        var json = JSON.stringify(s[l.path]), mk = JSON.stringify(md);
        if (!force && json === l.last && l.lastMeta === mk) return;
        l.last = json; l.lastMeta = mk;
        l.next(makeDocSnap(idOf(l.path), s[l.path], md));
      } else {
        var paths = runQuery(l.q, s);
        md = meta(paths.some(function (p) { return pending.indexOf(p) >= 0; }));
        var r = querySnap(l, paths, s, md), mk2 = JSON.stringify(md);
        if (!force && !r.changed && l.lastMeta === mk2) return;
        l.lastMeta = mk2;
        l.next(r.snap);
      }
    } catch (e) { later(function () { throw e; }); }
  }
  function deliverAll(force) { listeners.forEach(function (l) { deliver(l, force); }); }
  function subscribe(l, next, error) {
    if (listeners.filter(function (x) { return !x.dead; }).length >= 64) { later(function () { error && error(dbErr('resource_exhausted', 'more than 64 subscriptions in this view')); }, 1); return function () {}; }
    l.next = next; l.error = error; l.id = ++seq;
    var inj = injected('listen');
    if (inj) { l.dead = true; later(function () { if (error) error(inj); }, 2); return function () {}; }
    listeners.push(l);
    if (opts.cachedFirst) later(function () {
      if (l.dead || l.server) return;
      var md = { fromCache: true, hasPendingWrites: false };
      if (l.kind === 'doc') next(Object.freeze({ id: idOf(l.path), exists: false, data: function () { return undefined; }, metadata: md }));
      else next(Object.freeze({ docs: [], size: 0, empty: true, docChanges: function () { return []; }, metadata: md }));
    }, 5);
    if (!opts.neverServer) ready.then(function () { later(function () { if (l.dead) return; l.server = true; deliver(l, true); }, opts.serverDelay); });
    return function () { l.dead = true; };
  }

  /* ---------- refs ---------- */
  function docRef(path) {
    docPath(path);
    return {
      id: idOf(path), path: path,
      get: function () { return new Promise(function (r, rej) { later(function () {
        if (opts.offline) return rej(dbErr('unavailable', 'offline'));
        var inj = injected('get'); if (inj) return rej(inj);
        ready.then(loadAll).then(function () { r(makeDocSnap(idOf(path), view()[path], meta(!!overlay[path]))); }, function () { rej(dbErr('unavailable', 'store')); });
      }, 3); }); },
      set: function (data) { return write('set', path, data); },
      update: function (data) { return write('update', path, data); },
      delete: function () { return write('delete', path); },
      acquire: function (o) {
        o = o || {};
        return new Promise(function (res, rej) {
          if (!o.holder || typeof o.holder !== 'string') return later(function () { rej(dbErr('invalid_argument', 'acquire needs a holder')); }, 1);
          if (opts.canWrite === false) return later(function () { rej(dbErr('invalid_argument', 'this viewer cannot write shared documents')); }, 1);
          later(function () {
            if (opts.offline) return rej(dbErr('unavailable', 'offline'));
            var ttl = Math.min(600000, Math.max(1000, o.ttlMs || 30000));
            rmw('leases', path, function (cur) {   // set-if-not-busy, atomic across pages
              var now = Date.now();
              if (cur && cur.expiresAt > now && cur.holder !== o.holder) return { busy: cur };
              return { put: { holder: o.holder, expiresAt: now + ttl, version: ((cur && cur.version) || 0) + 1 } };
            }).then(function (out) {
              if (out.busy) return res({ acquired: false, expiresAt: new Date(out.busy.expiresAt).toISOString() });
              var granted = { acquired: true, version: out.put.version, expiresAt: new Date(out.put.expiresAt).toISOString(), holder: o.holder };
              if (!o.data) return res(granted);
              rmw('docs', path, function (cur) { return { put: merge(cur || {}, o.data) }; }).then(function (o2) { committed('set', path, o2.put, o.data); deliverAll(); res(granted); });
            }, function (e) { rej(dbErr('unavailable', String(e))); });
          }, 3);
        });
      },
      onSnapshot: function (next, error) { return subscribe({ kind: 'doc', path: path }, next, error); },
      collection: function (sub) { return collRef(path + '/' + sub); }
    };
  }
  function query(coll, filters, order, lim, bad) {
    var q = { coll: coll, filters: filters, order: order, lim: lim };
    function build(f) {   // builder errors travel with the query (get rejects / onSnapshot errors), never thrown here
      if (bad) return query(coll, filters, order, lim, bad);
      try { return f(); } catch (e) { return query(coll, filters, order, lim, e && e.code ? e : dbErr('invalid_argument', String(e && e.message || e))); }
    }
    return {
      where: function (f, op, v) { return build(function () {
        if (typeof f !== 'string' || !f) throw dbErr('invalid_argument', 'where() needs a field name');
        if (OPS.indexOf(op) < 0) throw dbErr('invalid_argument', 'unknown operator ' + op);
        if ((op === 'in' || op === 'not-in') && (!Array.isArray(v) || v.length > 30)) throw dbErr('invalid_argument', op + ' needs an array of at most 30 values');
        if (filters.length >= 10) throw dbErr('invalid_argument', 'more than 10 filters');
        return query(coll, filters.concat([[f, op, v]]), order, lim);
      }); },
      orderBy: function (f, dir) { return build(function () {
        if (order) throw dbErr('invalid_argument', 'at most one orderBy');
        if (typeof f !== 'string' || !f) throw dbErr('invalid_argument', 'orderBy() needs a field name');
        if (dir !== undefined && dir !== 'asc' && dir !== 'desc') throw dbErr('invalid_argument', 'orderBy direction is asc or desc');
        return query(coll, filters, [f, dir || 'asc'], lim);
      }); },
      limit: function (n) { return build(function () {
        if (!(typeof n === 'number' && Math.floor(n) === n && n >= 1 && n <= 1000)) throw dbErr('invalid_argument', 'limit must be 1-1000');
        return query(coll, filters, order, n);
      }); },
      get: function () { return new Promise(function (r, rej) { later(function () {
        if (bad) return rej(bad);
        if (opts.offline) return rej(dbErr('unavailable', 'offline'));
        var inj = injected('get'); if (inj) return rej(inj);
        ready.then(loadAll).then(function () { var s = view(), paths = runQuery(q, s); r(querySnap({}, paths, s, meta(false)).snap); }, function () { rej(dbErr('unavailable', 'store')); });
      }, 3); }); },
      onSnapshot: function (next, error) {
        if (bad) { later(function () { if (error) error(bad); else console.error('onSnapshot', bad); }, 1); return function () {}; }
        return subscribe({ kind: 'query', q: q }, next, error);
      }
    };
  }
  function collRef(path) {
    collPath(path);
    var base = query(path, [], null, 0);
    base.path = path;
    base.doc = function (id) { return docRef(path + '/' + (id === undefined ? ('m' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)) : id)); };
    base.add = function (data) { var r = base.doc(); return r.set(data).then(function () { return r; }); };
    return base;
  }
  var db = Object.freeze({ doc: docRef, collection: collRef });

  /* ---------- user ---------- */
  var me = { id: opts.userId, name: 'Test User', avatarUrl: 'data:image/png;base64,iVBORw0KGgo=', color: '#c2410c', email: null, isOwner: !!opts.isOwner, canEdit: !!opts.canEdit };
  var user = Object.freeze({
    isOwner: function () { return Promise.resolve(!!opts.isOwner); },
    canEdit: function () { return Promise.resolve(!!opts.canEdit); },
    can: function (name) { return Promise.resolve(opts.can === null ? null : name === 'data.write' ? !!opts.can : false); },
    id: function () { return Promise.resolve(opts.userId); },
    me: function () { return Promise.resolve(Object.assign({}, me)); },
    name: function () { return Promise.resolve(me.name); },
    avatarUrl: function () { return Promise.resolve(me.avatarUrl); },
    email: function () { return Promise.resolve(null); },
    profiles: function (ids) { var o = {}; [].concat(ids).forEach(function (i) { o[i] = { id: i, name: i === opts.userId ? me.name : '', avatarUrl: me.avatarUrl, color: '#888', email: null, isMe: i === opts.userId, guest: false }; }); return Promise.resolve(o); },
    search: function () { return Promise.resolve([]); }
  });

  /* ---------- assets ---------- */
  var blobs = {}, an = 0, TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml', 'application/pdf', 'text/plain', 'application/json', 'text/csv'];
  function aid() { var s = ''; while (s.length < 32) s += Math.random().toString(16).slice(2); return s.slice(0, 32); }
  var assets = Object.freeze({
    upload: function (blob, o) {
      if (!(blob instanceof Blob) || !blob.size) return Promise.reject({ code: 'invalid_request', message: 'upload needs a non-empty Blob' });
      var type = (o && o.type) || blob.type;
      if (TYPES.indexOf(type) < 0) return Promise.reject({ code: 'unsupported_type', message: 'type ' + type });
      if (blob.size > 20 * 1024 * 1024) return Promise.reject({ code: 'too_large', message: 'over 20 MiB' });
      var id = aid(); blobs[id] = { size: blob.size, type: type, at: new Date().toISOString() }; an++;
      return new Promise(function (r) { later(function () { r({ id: id, url: '/_blob/' + id, sizeBytes: blob.size, contentType: type }); }, 20); });
    },
    list: function () {
      var ids = Object.keys(blobs);
      return Promise.resolve({ assets: ids.map(function (id) { return { id: id, url: '/_blob/' + id, contentType: blobs[id].type, sizeBytes: blobs[id].size, createdAt: blobs[id].at }; }),
        usage: { files: ids.length, bytes: ids.reduce(function (n, id) { return n + blobs[id].size; }, 0), maxFiles: 10000, maxBytes: 1e9 } });
    },
    delete: function (ref) { var id = String(ref || '').replace(/^.*\/_blob\//, ''); var had = !!blobs[id]; delete blobs[id]; return Promise.resolve({ deleted: had }); }
  });
  var ns = { db: db, user: user, assets: assets }, memo = {};

  window.__mockdb = {
    opts: opts, writes: writes, overlaps: overlaps,
    stats: function () { return { inflight: stat.inflight, maxInflight: stat.maxInflight, assets: an }; },
    dump: function () { return ready.then(loadAll).then(clone); },
    reset: function (seed) {
      seed = clone(seed || {});
      return Promise.all([txn('docs', 'readwrite', function (st) { st.clear(); Object.keys(seed).forEach(function (k) { st.put(seed[k], k); }); return function () {}; }),
        txn('leases', 'readwrite', function (st) { st.clear(); return function () {}; })])
        .then(loadAll).then(function () { try { bc && bc.postMessage({ all: true }); } catch (e) {} deliverAll(); });
    },
    failNext: function (code, count, op) { fails.push({ code: code, n: count || 1, op: op || null }); },
    leases: function () { return readAll('leases'); },
    listeners: function () { return listeners.filter(function (l) { return !l.dead; }).length; },
    setOffline: function (on) { opts.offline = !!on; deliverAll(true); },
    killListeners: function (code) { listeners.forEach(function (l) { if (!l.dead) { l.dead = true; if (l.error) l.error(dbErr(code || 'unavailable', 'listener ended')); } }); }
  };
  window.claude = Object.freeze({
    use: function (name) {
      if (opts.caps.indexOf(name) < 0 || !ns[name]) return new Promise(function (r) { later(function () { r(null); }, opts.useDelay); });
      return memo[name] || (memo[name] = new Promise(function (r) { later(function () { r(opts.useNever ? null : ns[name]); }, opts.useNever ? 10000 : opts.useDelay); }));
    }
  });
})();
