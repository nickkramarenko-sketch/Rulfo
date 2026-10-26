/* In-browser stand-in for the artifact runtime (window.claude.use) used by the Playwright tests.
   db: realtime JSON store kept in localStorage '__mockdb', shared live across pages in one browser context.
   assets: keeps uploads in memory; tests route /_blob/* to a placeholder image.
   Options (set before this script runs): window.__MOCK = {caps: ['db','user','assets'], canWrite: true, seed: {...}} */
(function () {
  'use strict';
  var opts = window.__MOCK || {};
  var caps = opts.caps || ['db', 'user', 'assets'];
  var KEY = '__mockdb';
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function persist(s) { localStorage.setItem(KEY, JSON.stringify(s)); }
  var store = load();
  if (!store) { store = opts.seed ? JSON.parse(JSON.stringify(opts.seed)) : {}; persist(store); }
  var listeners = {};   // collection -> [fn]
  var writes = [];      // log for tests: {op, path, data}
  window.__mockdb = {
    dump: function () { return JSON.parse(JSON.stringify(load() || {})); },
    writes: writes,
    reset: function (seed) { store = JSON.parse(JSON.stringify(seed || {})); persist(store); fireAll(); }
  };
  function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
  function err(code, msg) { var e = new Error(msg || code); e.code = code; return e; }
  function snap(coll) {
    var m = store[coll] || {};
    return { docs: Object.keys(m).map(function (id) { return { id: id, exists: true, data: function () { return clone(m[id]); } }; }), size: Object.keys(m).length, empty: !Object.keys(m).length };
  }
  function fire(coll) { (listeners[coll] || []).forEach(function (l) { setTimeout(function () { l.fn(snap(coll)); }, 5); }); }
  function fireAll() { Object.keys(listeners).forEach(fire); }
  window.addEventListener('storage', function (e) { if (e.key === KEY) { store = load() || {}; fireAll(); } });
  function merge(base, patch) {
    var out = clone(base) || {};
    Object.keys(patch).forEach(function (k) {
      var v = patch[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) out[k] = merge(out[k], v);
      else out[k] = clone(v);
    });
    return out;
  }
  function checkWrite(data) {
    if (opts.canWrite === false) return err('invalid_argument', 'viewer cannot write');
    if (!data || typeof data !== 'object' || Array.isArray(data)) return err('invalid_argument', 'body must be an object');
    if (JSON.stringify(data).length > 256 * 1024) return err('invalid_argument', 'document over 256 KiB');
    return null;
  }
  function docRef(path) {
    var parts = path.split('/');
    if (parts.length !== 2) throw err('invalid_argument', 'mock supports coll/doc paths only: ' + path);
    var coll = parts[0], id = parts[1];
    return {
      id: id, path: path,
      get: function () { var d = (store[coll] || {})[id]; return Promise.resolve({ id: id, exists: !!d, data: function () { return clone(d); } }); },
      set: function (data) {
        var e = checkWrite(data); if (e) return Promise.reject(e);
        store = load() || {}; store[coll] = store[coll] || {}; store[coll][id] = clone(data); persist(store);
        writes.push({ op: 'set', path: path, data: clone(data) }); fire(coll); return new Promise(function (r) { setTimeout(r, 10); });
      },
      update: function (data) {
        var e = checkWrite(data); if (e) return Promise.reject(e);
        store = load() || {};
        if (!store[coll] || !store[coll][id]) return Promise.reject(err('invalid_argument', 'update needs an existing document'));
        store[coll][id] = merge(store[coll][id], data); persist(store);
        writes.push({ op: 'update', path: path, data: clone(data) }); fire(coll); return new Promise(function (r) { setTimeout(r, 10); });
      },
      delete: function () {
        if (opts.canWrite === false) return Promise.reject(err('invalid_argument'));
        store = load() || {}; if (store[coll]) delete store[coll][id]; persist(store);
        writes.push({ op: 'delete', path: path }); fire(coll); return Promise.resolve();
      }
    };
  }
  var db = {
    doc: docRef,
    collection: function (coll) {
      return {
        doc: function (id) { return docRef(coll + '/' + id); },
        onSnapshot: function (fn) {
          var l = { fn: fn }; (listeners[coll] = listeners[coll] || []).push(l);
          setTimeout(function () { fn(snap(coll)); }, 15);
          return function () { listeners[coll] = (listeners[coll] || []).filter(function (x) { return x !== l; }); };
        },
        get: function () { return Promise.resolve(snap(coll)); }
      };
    }
  };
  var blobs = {}, n = 0;
  var assets = {
    upload: function (blob, o) {
      if (!blob) return Promise.reject(err('invalid_argument'));
      var id = 'asset' + (++n) + Date.now().toString(36);
      blobs[id] = blob;
      return new Promise(function (r) { setTimeout(function () { r({ id: id, url: '/_blob/' + id, sizeBytes: blob.size || 0, contentType: (o && o.type) || blob.type }); }, 30); });
    },
    list: function () { return Promise.resolve({ assets: Object.keys(blobs).map(function (id) { return { id: id }; }), usage: {} }); },
    delete: function (id) { delete blobs[id]; return Promise.resolve(); }
  };
  var user = {
    id: function () { return 'u_test'; }, me: function () { return { id: 'u_test', name: 'Test User' }; },
    can: function () { return opts.canWrite !== false; }, canEdit: function () { return true; }, isOwner: function () { return true; },
    profiles: function () { return Promise.resolve({}); }
  };
  var ns = { db: db, assets: assets, user: user };
  window.claude = { use: function (name) { return new Promise(function (r) { setTimeout(function () { r(caps.indexOf(name) >= 0 ? ns[name] || null : null); }, 20); }); } };
})();
