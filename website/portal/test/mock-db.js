/* In-browser stand-in for the artifact runtime (window.claude.use) used by the portal tests in shared mode.
   Mirrors the runtime contract 0.2.91 db / user / assets shapes closely enough for ZZsync (stream A1):
     db.doc(path) / db.collection(path)   path grammar checked (TypeError), nested paths (photos/<owner>/items/<id>)
     DocumentReference  get, set, update (must exist; nested objects merge, arrays replace), delete,
                        acquire({holder, ttlMs, data}), onSnapshot(next, error), collection(sub)
     Query              where(field, op, value), orderBy(field, dir), limit(n), get, onSnapshot
     CollectionReference doc(id?), add(data)
     snapshots          {docs, size, empty, docChanges(), metadata:{fromCache, hasPendingWrites}}; frozen data
   The store lives in localStorage '__mockdb' ({docPath: body}), so pages in one browser context share it
   (two pages = two devices; changes reach the other page through the storage event).

   Options, set before this script runs: window.__MOCK = {
     caps: ['db','user','assets'],   // which namespaces claude.use() answers (others resolve null)
     isOwner: true, canEdit: true,
     can: true,                     // user.can('data.write'): true | false | null
     userId: 'u_test',
     canWrite: true,                // false: every write rejects invalid_argument (read-only viewer)
     cachedFirst: false,            // every new listener first gets a cached, EMPTY snapshot (fromCache:true)
     serverDelay: 15,               // ms before the server (fromCache:false) snapshot
     neverServer: false,            // never send a server snapshot (offline start)
     writeDelay: 10,                // ms a write takes
     seed: null                     // {docPath: body} written once if the store is empty
   }
   Test hooks: window.__mockdb = {dump(), writes, reset(seed), failNext(code, n, op?), leases(), opts} */
(function () {
  'use strict';
  var opts = Object.assign({ caps: ['db', 'user', 'assets'], isOwner: true, canEdit: true, can: true, userId: 'u_test', canWrite: true,
    cachedFirst: false, serverDelay: 15, neverServer: false, writeDelay: 10, seed: null }, window.__MOCK || {});
  var KEY = '__mockdb', LKEY = '__mockdb_leases', MAX = 256 * 1024;
  function load(k) { try { return JSON.parse(localStorage.getItem(k || KEY) || 'null'); } catch (e) { return null; } }
  function persist(s, k) { localStorage.setItem(k || KEY, JSON.stringify(s)); }
  function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
  function deepFreeze(o) { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); Object.keys(o).forEach(function (k) { deepFreeze(o[k]); }); } return o; }
  function err(code, msg) { var e = new Error(msg || code); e.code = code; return e; }
  var store = load();
  if (!store) { store = opts.seed ? clone(opts.seed) : {}; persist(store); }
  var writes = [], fails = [], listeners = [], seq = 0;

  /* ---------- paths ---------- */
  var SEG = /^[A-Za-z0-9_\-.~:@+]+$/;
  function parts(path) {
    if (typeof path !== 'string' || !path) throw new TypeError('path must be a non-empty string');
    var p = path.split('/');
    if (p.length > 16 || path.length > 1000) throw new TypeError('path too long: ' + path);
    p.forEach(function (s) { if (!SEG.test(s) || s === '.' || s === '..' || s.length > 200) throw new TypeError('bad path segment "' + s + '" in ' + path); });
    return p;
  }
  function docPath(path) { var p = parts(path); if (p.length % 2) throw new TypeError('a document path needs an even number of segments (' + p.length + '): ' + path); return path; }
  function collPath(path) { var p = parts(path); if (!(p.length % 2)) throw new TypeError('a collection path needs an odd number of segments (' + p.length + '): ' + path); return path; }
  function parentOf(path) { return path.split('/').slice(0, -1).join('/'); }
  function idOf(path) { var p = path.split('/'); return p[p.length - 1]; }

  /* ---------- writes ---------- */
  function depth(v, d) { if (!v || typeof v !== 'object') return d; var m = d; Object.keys(v).forEach(function (k) { m = Math.max(m, depth(v[k], d + 1)); }); return m; }
  function checkBody(data, op, path) {
    var f = fails.length && fails[0];
    if (f && (!f.op || f.op === op)) { f.n--; if (f.n <= 0) fails.shift(); return err(f.code, 'injected ' + f.code); }
    if (opts.canWrite === false) return err('invalid_argument', 'viewer cannot write');
    if (op === 'delete') return null;
    if (!data || typeof data !== 'object' || Array.isArray(data)) return err('invalid_argument', 'body must be an object');
    var bytes = JSON.stringify(data).length;
    if (bytes > MAX) return err('invalid_argument', 'document over 256 KiB: ' + path + ' (' + bytes + ' bytes)');
    if (depth(data, 0) > 32) return err('invalid_argument', 'document more than 32 levels deep');
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
  function commit(op, path, body) {
    store = load() || {};
    if (op === 'delete') delete store[path]; else store[path] = body;
    persist(store);
    writes.push({ op: op, path: path, bytes: body ? JSON.stringify(body).length : 0, at: Date.now(), data: clone(body) });
    deliverAll(true);
  }
  function write(op, path, data) {
    var e = checkBody(data, op, path);
    if (e) return new Promise(function (res, rej) { setTimeout(function () { rej(e); }, 1); });
    return new Promise(function (res, rej) {
      setTimeout(function () {
        store = load() || {};
        if (op === 'update') {
          if (!store[path]) return rej(err('invalid_argument', 'update needs an existing document: ' + path));
          commit(op, path, merge(store[path], data));
        } else if (op === 'set') commit(op, path, clone(data));
        else commit(op, path, null);
        res();
      }, opts.writeDelay);
    });
  }
  window.addEventListener('storage', function (e) { if (e.key === KEY) { store = load() || {}; deliverAll(false); } });

  /* ---------- snapshots ---------- */
  function docSnap(path, meta) {
    var d = store[path];
    var body = d === undefined ? undefined : deepFreeze(clone(d));
    return Object.freeze({ id: idOf(path), exists: d !== undefined, data: function () { return body; }, metadata: meta });
  }
  function getField(o, f) { return f.split('.').reduce(function (a, k) { return a == null ? undefined : a[k]; }, o); }
  function test(v, op, x) {
    switch (op) {
      case '==': return JSON.stringify(v) === JSON.stringify(x);
      case '!=': return v !== undefined && JSON.stringify(v) !== JSON.stringify(x);
      case '<': return v < x; case '<=': return v <= x; case '>': return v > x; case '>=': return v >= x;
      case 'in': return Array.isArray(x) && x.some(function (y) { return JSON.stringify(y) === JSON.stringify(v); });
      case 'not-in': return Array.isArray(x) && v !== undefined && !x.some(function (y) { return JSON.stringify(y) === JSON.stringify(v); });
      case 'array-contains': return Array.isArray(v) && v.some(function (y) { return JSON.stringify(y) === JSON.stringify(x); });
    }
    throw err('invalid_argument', 'unknown operator ' + op);
  }
  function runQuery(q) {
    var paths = Object.keys(store).filter(function (p) { return parentOf(p) === q.coll; });
    paths = paths.filter(function (p) { return q.filters.every(function (f) { return test(getField(store[p], f[0]), f[1], f[2]); }); });
    if (q.order) {
      var f = q.order[0], dir = q.order[1] === 'desc' ? -1 : 1;
      paths.sort(function (a, b) {
        var x = getField(store[a], f), y = getField(store[b], f);
        if (x === undefined && y === undefined) return idOf(a) < idOf(b) ? -1 : 1;
        if (x === undefined) return 1; if (y === undefined) return -1;
        return x < y ? -dir : x > y ? dir : (idOf(a) < idOf(b) ? -1 : 1);
      });
    } else paths.sort(function (a, b) { return idOf(a) < idOf(b) ? -1 : idOf(a) > idOf(b) ? 1 : 0; });
    if (q.lim) paths = paths.slice(0, q.lim);
    return paths;
  }
  function querySnap(l, paths, meta) {
    var prev = l.prev || {}, prevOrder = l.prevOrder || [], next = {}, docs = [], changes = [];
    paths.forEach(function (p, i) {
      var json = JSON.stringify(store[p]);
      var s = prev[p] && prev[p].json === json ? prev[p].snap : docSnap(p, meta);
      next[p] = { json: json, snap: s };
      docs.push(s);
      if (!prev[p]) changes.push({ type: 'added', doc: s, oldIndex: -1, newIndex: i });
      else if (prev[p].json !== json) changes.push({ type: 'modified', doc: s, oldIndex: prevOrder.indexOf(p), newIndex: i });
    });
    prevOrder.forEach(function (p, i) { if (!next[p]) changes.push({ type: 'removed', doc: prev[p].snap, oldIndex: i, newIndex: -1 }); });
    l.prev = next; l.prevOrder = paths.slice();
    return { snap: Object.freeze({ docs: docs, size: docs.length, empty: !docs.length, docChanges: function () { return changes.slice(); }, metadata: meta }), changed: changes.length > 0 };
  }
  function deliver(l, meta, force) {
    if (l.dead || !l.server) return;
    store = load() || {};
    try {
      if (l.kind === 'doc') {
        var json = JSON.stringify(store[l.path]);
        if (!force && json === l.last && l.lastMeta === JSON.stringify(meta)) return;
        l.last = json; l.lastMeta = JSON.stringify(meta);
        l.next(docSnap(l.path, meta));
      } else {
        var r = querySnap(l, runQuery(l.q), meta);
        if (!force && !r.changed && l.lastMeta === JSON.stringify(meta)) return;
        l.lastMeta = JSON.stringify(meta);
        l.next(r.snap);
      }
    } catch (e) { setTimeout(function () { throw e; }); }
  }
  function deliverAll(own) {
    listeners.forEach(function (l) {
      if (own) { deliver(l, { fromCache: false, hasPendingWrites: true }); setTimeout(function () { deliver(l, { fromCache: false, hasPendingWrites: false }); }, 5); }
      else setTimeout(function () { deliver(l, { fromCache: false, hasPendingWrites: false }); }, 5);
    });
  }
  function subscribe(l, next, error) {
    if (listeners.filter(function (x) { return !x.dead; }).length >= 64) { setTimeout(function () { error && error({ code: 'resource_exhausted', message: 'too many subscriptions' }); }, 1); return function () {}; }
    l.next = next; l.error = error; l.id = ++seq;
    listeners.push(l);
    if (opts.cachedFirst) setTimeout(function () {
      if (l.dead) return;
      var empty = { fromCache: true, hasPendingWrites: false };
      if (l.kind === 'doc') next(Object.freeze({ id: idOf(l.path), exists: false, data: function () { return undefined; }, metadata: empty }));
      else next(Object.freeze({ docs: [], size: 0, empty: true, docChanges: function () { return []; }, metadata: empty }));
    }, 5);
    if (!opts.neverServer) setTimeout(function () { if (l.dead) return; l.server = true; deliver(l, { fromCache: false, hasPendingWrites: false }, true); }, opts.serverDelay);
    return function () { l.dead = true; };
  }

  /* ---------- refs ---------- */
  function docRef(path) {
    docPath(path);
    return {
      id: idOf(path), path: path,
      get: function () { return new Promise(function (r) { setTimeout(function () { store = load() || {}; r(docSnap(path, { fromCache: false, hasPendingWrites: false })); }, 3); }); },
      set: function (data) { return write('set', path, data); },
      update: function (data) { return write('update', path, data); },
      delete: function () { return write('delete', path); },
      acquire: function (o) {
        o = o || {};
        return new Promise(function (res, rej) {
          if (!o.holder) return rej(err('invalid_argument', 'acquire needs a holder'));
          if (opts.canWrite === false) return rej(err('invalid_argument', 'viewer cannot write'));
          setTimeout(function () {
            var L = load(LKEY) || {}, now = Date.now(), cur = L[path], ttl = Math.min(600000, Math.max(1000, o.ttlMs || 30000));
            if (cur && cur.expiresAt > now && cur.holder !== o.holder) return res({ acquired: false, expiresAt: new Date(cur.expiresAt).toISOString() });
            L[path] = { holder: o.holder, expiresAt: now + ttl, version: ((cur && cur.version) || 0) + 1 };
            persist(L, LKEY);
            if (o.data) { store = load() || {}; commit('set', path, merge(store[path] || {}, o.data)); }
            res({ acquired: true, version: L[path].version, expiresAt: new Date(now + ttl).toISOString(), holder: o.holder });
          }, 3);
        });
      },
      onSnapshot: function (next, error) { return subscribe({ kind: 'doc', path: path }, next, error); },
      collection: function (sub) { return collRef(path + '/' + sub); }
    };
  }
  function query(coll, filters, order, lim) {
    var q = { coll: coll, filters: filters, order: order, lim: lim };
    return {
      where: function (f, op, v) { if (filters.length >= 10) throw err('invalid_argument', 'too many filters'); return query(coll, filters.concat([[f, op, v]]), order, lim); },
      orderBy: function (f, dir) { return query(coll, filters, [f, dir || 'asc'], lim); },
      limit: function (n) { if (!(n >= 1 && n <= 1000)) throw err('invalid_argument', 'limit 1-1000'); return query(coll, filters, order, n); },
      get: function () { return new Promise(function (r) { setTimeout(function () { store = load() || {}; r(querySnap({}, runQuery(q), { fromCache: false, hasPendingWrites: false }).snap); }, 3); }); },
      onSnapshot: function (next, error) { return subscribe({ kind: 'query', q: q }, next, error); }
    };
  }
  function collRef(path) {
    collPath(path);
    var base = query(path, [], null, 0);
    base.path = path;
    base.doc = function (id) { return docRef(path + '/' + (id || ('m' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)))); };
    base.add = function (data) { var r = base.doc(); return r.set(data).then(function () { return r; }); };
    return base;
  }
  var db = Object.freeze({ doc: docRef, collection: collRef });

  /* ---------- user, assets ---------- */
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
  var blobs = {}, n = 0;
  var assets = Object.freeze({
    upload: function (blob, o) {
      if (!blob) return Promise.reject(err('invalid_argument'));
      var id = 'asset' + (++n) + Date.now().toString(36); blobs[id] = blob;
      return new Promise(function (r) { setTimeout(function () { r({ id: id, url: '/_blob/' + id, sizeBytes: blob.size || 0, contentType: (o && o.type) || blob.type }); }, 20); });
    },
    list: function () { return Promise.resolve({ assets: Object.keys(blobs).map(function (id) { return { id: id }; }), usage: {} }); },
    delete: function (id) { delete blobs[id]; return Promise.resolve(); }
  });
  var ns = { db: db, user: user, assets: assets };

  window.__mockdb = {
    opts: opts, writes: writes,
    dump: function () { return clone(load() || {}); },
    reset: function (seed) { store = clone(seed || {}); persist(store); persist({}, LKEY); deliverAll(false); },
    failNext: function (code, count, op) { fails.push({ code: code, n: count || 1, op: op || null }); },
    leases: function () { return clone(load(LKEY) || {}); },
    listeners: function () { return listeners.filter(function (l) { return !l.dead; }).length; }
  };
  window.claude = Object.freeze({ use: function (name) { return new Promise(function (r) { setTimeout(function () { r(opts.caps.indexOf(name) >= 0 ? ns[name] || null : null); }, 20); }); } });
})();
