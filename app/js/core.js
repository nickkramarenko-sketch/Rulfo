/* 24 HR Dock: core. Live data store, router, rendering and shared helpers.
   Role modules (client.js, kiosk.js, crew.js, office.js) register views and actions on App.
   Read app/CONTRACT.md before changing anything here. */
(function () {
  'use strict';

  var COLLS = ['customers', 'trucks', 'damage', 'gear', 'settings', 'outbox', 'photos'];

  var App = window.App = {
    state: {
      role: null,          // 'client' | 'kiosk' | 'crew' | 'office' | 'driver'
      customerId: null,    // client view: which company is signed in
      crewName: null,      // forklift view: who is using the phone
      view: null, params: {},
      sheet: null,         // {view, params} bottom sheet on top of the view
      lang: 'en',          // kiosk / driver language
      forms: {},           // form drafts, see App.form()
      toast: null,
      mode: 'starting',    // 'live' (shared db) | 'local' (this device only) | 'starting'
      canWrite: true,
      uid: null
    },
    data: {},              // collection name -> {id: doc}
    views: {},             // 'role.name' -> function(params) returning an HTML string
    actions: {},           // 'role.name' -> function(el, event)
    homes: { client: 'client.home', kiosk: 'kiosk.lang', crew: 'crew.home', office: 'office.board', driver: 'driver.code' },
    strings: {},           // lang -> {key: text}, filled by kiosk.js (see App.t)
    clockOffset: 0
  };
  COLLS.forEach(function (c) { App.data[c] = {}; });

  /* ---------- small helpers ---------- */
  var esc = App.h = function (v) {
    if (v === null || v === undefined) return '';
    return String(v).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  };
  App.now = function () { return Date.now() + App.clockOffset; };
  App.iso = function (ms) { return new Date(ms === undefined ? App.now() : ms).toISOString(); };
  App.newId = function (prefix) {
    var s = (App.now().toString(36) + Math.random().toString(36).slice(2, 8));
    return (prefix || 'x') + '_' + s;
  };
  App.clone = function (o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); };
  App.list = function (coll, filter) {
    var m = App.data[coll] || {}, out = [];
    Object.keys(m).forEach(function (id) {
      var d = m[id];
      if (!d) return;
      var row = Object.assign({ id: id }, d);
      if (!filter || filter(row)) out.push(row);
    });
    return out;
  };
  App.get = function (coll, id) {
    var d = (App.data[coll] || {})[id];
    return d ? Object.assign({ id: id }, d) : null;
  };
  App.settings = function () {
    return Object.assign({
      promise: 'Unloaded within 2 hours of check-in',
      waitGoalMin: 30,
      docks: {
        reno: { name: 'Sparks, NV', doors: 8, address: '1095 Spice Islands Dr, Suites 105-106, Sparks, NV 89431' },
        sac: { name: 'North Highlands, CA', doors: 8, address: '3036 Orange Grove Ave, North Highlands, CA 95660' },
        pa: { name: 'Middletown, PA', doors: 50, address: '2811 Turnpike Industrial Dr, Middletown, PA 17057' }
      },
      hours: 'Docks open 6 AM to 10 PM Monday to Friday. Weekends by appointment.',
      crew: [],
      rates: { rewrap: 15, labor: 120, delivery: 300, afterHours: 100 },
      phone: '916-616-3481'
    }, App.data.settings.main || {});
  };

  /* ---------- formatting ---------- */
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  App.fmt = {
    time: function (iso) {
      if (!iso) return '';
      var d = new Date(iso), h = d.getHours(), m = d.getMinutes();
      return ((h % 12) || 12) + ':' + (m < 10 ? '0' : '') + m + ' ' + (h < 12 ? 'AM' : 'PM');
    },
    date: function (iso) {
      if (!iso) return '';
      var d = new Date(iso);
      return DAYS[d.getDay()] + ', ' + MONTHS[d.getMonth()] + ' ' + d.getDate();
    },
    dayTime: function (iso) {
      if (!iso) return '';
      var d = new Date(iso), today = new Date(App.now());
      var same = d.toDateString() === today.toDateString();
      var tmr = new Date(App.now() + 864e5).toDateString() === d.toDateString();
      return (same ? 'Today' : tmr ? 'Tomorrow' : App.fmt.date(iso)) + ' ' + App.fmt.time(iso);
    },
    dur: function (ms) {
      if (ms === null || ms === undefined || isNaN(ms)) return '';
      ms = Math.max(0, ms);
      var min = Math.round(ms / 60000);
      if (min < 60) return min + ' min';
      var h = Math.floor(min / 60), r = min % 60;
      return h + 'h' + (r ? ' ' + r + 'm' : '');
    },
    ago: function (iso) {
      if (!iso) return '';
      var ms = App.now() - new Date(iso).getTime();
      if (ms < 60000) return 'just now';
      return App.fmt.dur(ms) + ' ago';
    },
    num: function (n) { return (Number(n) || 0).toLocaleString('en-US'); },
    money: function (n) { return '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  };
  /* 'YYYY-MM-DD' + 'HH:MM' (local) -> ISO */
  App.toIso = function (dateStr, timeStr) {
    if (!dateStr) return null;
    var p = dateStr.split('-').map(Number), t = (timeStr || '00:00').split(':').map(Number);
    return new Date(p[0], p[1] - 1, p[2], t[0] || 0, t[1] || 0).toISOString();
  };
  App.localDate = function (ms) {
    var d = new Date(ms === undefined ? App.now() : ms);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  App.localTime = function (ms) {
    var d = new Date(ms === undefined ? App.now() : ms);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  };

  /* ---------- trucks: shared business logic ---------- */
  App.STATUS = {
    booked: { label: 'Booked', tone: 'info' },
    arrived: { label: 'Waiting in yard', tone: 'warn' },
    working: { label: 'At the door', tone: 'warn' },
    done: { label: 'Done', tone: 'good' },
    cancelled: { label: 'Cancelled', tone: 'neutral' }
  };
  App.truckPallets = function (t) {
    return (t.loads || []).reduce(function (s, l) { return s + (Number(l.pallets) || 0); }, 0);
  };
  App.truckWeight = function (t) {
    return (t.loads || []).reduce(function (s, l) { return s + (Number(l.weight) || 0); }, 0);
  };
  App.kindLabel = function (t) {
    return { drop: 'Drop-off', pick: 'Pickup', both: 'Drop + pick up' }[t.kind] || 'Truck';
  };
  /* wait = check-in until work started (or now); work = start until done (or now) */
  App.truckTimes = function (t) {
    var now = App.now(), ci = t.checkedInAt ? Date.parse(t.checkedInAt) : null,
      st = t.startedAt ? Date.parse(t.startedAt) : null, dn = t.doneAt ? Date.parse(t.doneAt) : null;
    return {
      waitMs: ci ? ((st || dn || now) - ci) : null,
      workMs: st ? ((dn || now) - st) : null,
      totalMs: ci ? ((dn || now) - ci) : null
    };
  };
  App.truckEta = function (t) {
    return (t.eta && t.eta.at) || t.apptAt || null;
  };
  App.trucksFor = function (customerId) {
    return App.list('trucks', function (t) { return t.customerId === customerId; });
  };
  App.sortByTime = function (rows, field, dir) {
    return rows.sort(function (a, b) {
      var x = a[field] ? Date.parse(a[field]) : Infinity, y = b[field] ? Date.parse(b[field]) : Infinity;
      return dir === 'desc' ? y - x : x - y;
    });
  };
  /* trucks waiting in the yard, longest wait first; position = place in line */
  App.queue = function (dock) {
    return App.sortByTime(App.list('trucks', function (t) {
      return t.status === 'arrived' && (!dock || (t.dock || 'reno') === dock);
    }), 'checkedInAt');
  };
  App.newCode = function () {
    var used = {};
    App.list('trucks', function (t) { return t.status !== 'done' && t.status !== 'cancelled'; })
      .forEach(function (t) { used[t.code] = true; });
    for (var i = 0; i < 200; i++) {
      var c = String(1000 + Math.floor(Math.random() * 9000));
      if (!used[c]) return c;
    }
    return String(App.now() % 10000).padStart(4, '0');
  };
  App.damageTotal = function (d) {
    return (d.fixLines || []).reduce(function (s, l) { return s + (Number(l.qty) || 0) * (Number(l.rate) || 0); }, 0);
  };
  App.dockName = function (key) { var d = App.settings().docks[key || 'reno']; return d ? d.name : (key || ''); };
  App.dockKeys = function () { return Object.keys(App.settings().docks); };
  App.isActive = function (t) { return t.status === 'booked' || t.status === 'arrived' || t.status === 'working'; };
  App.isToday = function (iso) { return !!iso && new Date(iso).toDateString() === new Date(App.now()).toDateString(); };
  /* place in line for a truck waiting in the yard (1 = next), or null */
  App.placeInLine = function (t) {
    if (!t || t.status !== 'arrived') return null;
    var q = App.queue(t.dock || 'reno');
    for (var i = 0; i < q.length; i++) if (q[i].id === t.id) return i + 1;
    return null;
  };
  /* rough minutes until a door opens for a waiting truck: trucks ahead x average door time / doors open */
  App.estWaitMin = function (t) {
    var pos = App.placeInLine(t);
    if (!pos) return null;
    var done = App.list('trucks', function (x) { return x.startedAt && x.doneAt && App.isToday(x.doneAt); });
    var avg = done.length ? done.reduce(function (s, x) { return s + (Date.parse(x.doneAt) - Date.parse(x.startedAt)); }, 0) / done.length / 60000 : 35;
    var dock = t.dock || 'reno', doors = (App.settings().docks[dock] || {}).doors || 4;
    var busy = App.list('trucks', function (x) { return x.status === 'working' && (x.dock || 'reno') === dock; }).length;
    var free = Math.max(0, doors - busy);
    if (pos <= free) return 5;
    return Math.max(5, Math.round((pos - free) * avg / Math.max(1, Math.min(doors, 3))));
  };
  /* 'good' under the wait goal, 'warn' near it (75%+), 'bad' over it */
  App.waitTone = function (ms) {
    var goal = (Number(App.settings().waitGoalMin) || 30) * 60000;
    if (ms === null || ms === undefined) return 'neutral';
    return ms >= goal ? 'bad' : ms >= goal * 0.75 ? 'warn' : 'good';
  };
  /* one write: append a line to the truck's load trail and merge other fields at the same time */
  App.logTruck = function (truckOrId, text, by, extra) {
    var t = typeof truckOrId === 'string' ? App.get('trucks', truckOrId) : App.get('trucks', truckOrId.id);
    if (!t) return Promise.reject(new Error('That truck is no longer on the list.'));
    var hist = (t.history || []).concat([{ at: App.iso(), by: by || '', text: text }]);
    return App.patch('trucks', t.id, Object.assign({}, extra || {}, { history: hist }));
  };
  /* tells the forklift crew (their phones show the queue live; this records the ping) */
  App.notifyCrew = function (truck, text) {
    var id = App.newId('msg');
    App.save('outbox', id, { customerId: truck && truck.customerId || null, truckId: truck && truck.id || null, event: 'crew', text: text,
      to: [{ name: 'Forklift crew', phone: '', email: '', channels: ['app'] }], at: App.iso() });
    return id;
  };
  /* progress steps for a truck: [{key, label, state:'done'|'now'|'todo'}] */
  App.truckSteps = function (t) {
    var pick = t.kind === 'pick';
    var keys = [['booked', 'Booked'], ['eta', 'On the way'], ['arrived', 'Checked in'], ['working', pick ? 'Loading' : 'Unloading'], ['done', 'Done']];
    var reached = { booked: true, eta: !!(t.eta && t.eta.at) || t.status !== 'booked', arrived: !!t.checkedInAt, working: !!t.startedAt, done: t.status === 'done' };
    var nowKey = t.status === 'done' ? null : t.status === 'working' ? 'working' : t.status === 'arrived' ? 'arrived' : reached.eta ? 'eta' : 'booked';
    return keys.map(function (k) {
      return { key: k[0], label: k[1], state: k[0] === nowKey ? 'now' : reached[k[0]] ? 'done' : 'todo' };
    });
  };
  App.stepsHtml = function (t) {
    return '<div class="steps" aria-label="Progress">' + App.truckSteps(t).map(function (s) {
      return '<div class="st ' + (s.state === 'todo' ? '' : s.state) + '"><i></i>' + esc(s.label) + '</div>';
    }).join('') + '</div>';
  };
  App.statusPill = function (t) {
    var s = App.STATUS[t.status] || { label: t.status || '', tone: 'neutral' };
    return '<span class="pill ' + s.tone + '">' + esc(s.label) + '</span>';
  };
  App.exampleTag = function (doc) { return doc && doc.example ? ' <span class="pill example" title="Made-up example data">Example</span>' : ''; };

  /* gear still out per customer: {plywood: n, bars: n, straps: n, airbags: n, tags: [...]} */
  App.gearOut = function (customerId) {
    var out = { plywood: 0, bars: 0, straps: 0, airbags: 0, tags: [] };
    App.sortByTime(App.list('gear', function (g) { return !customerId || g.customerId === customerId; }), 'at')
      .forEach(function (g) {
        var sign = g.dir === 'back' ? -1 : 1;
        out[g.type] = (out[g.type] || 0) + sign * (Number(g.qty) || 0);
        (g.tags || []).forEach(function (tag) {
          if (sign > 0) { if (out.tags.indexOf(tag) < 0) out.tags.push(tag); }
          else out.tags = out.tags.filter(function (x) { return x !== tag; });
        });
      });
    ['plywood', 'bars', 'straps', 'airbags'].forEach(function (k) { out[k] = Math.max(0, out[k]); });
    return out;
  };

  /* ---------- alerts (what would be texted / emailed) ---------- */
  App.EVENTS = [
    { key: 'booked', label: 'Booking confirmed' },
    { key: 'eta', label: 'ETA changed' },
    { key: 'arrived', label: 'Truck checked in' },
    { key: 'waiting', label: 'Waiting over 30 min' },
    { key: 'started', label: 'Unloading or loading started' },
    { key: 'damage', label: 'Damage found' },
    { key: 'done', label: 'Done, with photos' },
    { key: 'secured', label: 'Loaded and secured' },
    { key: 'friday', label: 'Friday summary' }
  ];
  /* Records the alert in the outbox. Texts and emails are not connected yet: the outbox shows
     exactly what would go out, to whom and how. Returns the outbox id. */
  App.notify = function (customerId, event, text, truckId) {
    var c = App.get('customers', customerId) || {}, to = [];
    (c.contacts || []).forEach(function (p) {
      var pref = (p.alerts || {})[event] || {};
      var ch = [];
      if (pref.text && p.phone) ch.push('text');
      if (pref.email && p.email) ch.push('email');
      if (ch.length) to.push({ name: p.name || '', phone: p.phone || '', email: p.email || '', channels: ch });
    });
    var id = App.newId('msg');
    App.save('outbox', id, { customerId: customerId || null, truckId: truckId || null, event: event, text: text, to: to, at: App.iso() });
    return id;
  };
  /* driver-only texts (door number, done): sent to the driver cell on the truck */
  App.notifyDriver = function (truck, text) {
    if (!truck || !truck.driverCell) return null;
    var id = App.newId('msg');
    App.save('outbox', id, { customerId: truck.customerId || null, truckId: truck.id, event: 'driver', text: text,
      to: [{ name: truck.driverName || 'Driver', phone: truck.driverCell, email: '', channels: ['text'] }], at: App.iso() });
    return id;
  };

  /* ---------- storage backends ---------- */
  var writeChains = {};
  function chain(key, fn) {
    var p = (writeChains[key] || Promise.resolve()).then(fn, fn);
    writeChains[key] = p.catch(function () {});
    return p;
  }
  function deepMerge(base, patch) {
    var out = App.clone(base) || {};
    Object.keys(patch).forEach(function (k) {
      var v = patch[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) {
        out[k] = deepMerge(out[k], v);
      } else {
        out[k] = App.clone(v);
      }
    });
    return out;
  }
  App.deepMerge = deepMerge;

  var backend = null;

  function DbBackend(db) {
    this.db = db;
    this.start = function () {
      COLLS.forEach(function (c) {
        db.collection(c).onSnapshot(function (snap) {
          var m = {};
          snap.docs.forEach(function (d) { if (d.exists) m[d.id] = d.data(); });
          App.data[c] = m;
          App.loaded[c] = true;
          App.render();
        }, function (e) {
          console.warn('db listener', c, e && e.code);
          if (e && (e.code === 'revoked' || e.code === 'not_granted')) { App.state.canWrite = false; App.render(); }
        });
      });
    };
    this.set = function (c, id, obj) {
      return chain(c + '/' + id, function () { return db.doc(c + '/' + id).set(obj); });
    };
    this.update = function (c, id, partial, full) {
      return chain(c + '/' + id, function () {
        return db.doc(c + '/' + id).update(partial).catch(function (e) {
          // the document was removed elsewhere: write the whole thing back
          if (e && e.code === 'invalid_argument') return db.doc(c + '/' + id).set(full);
          throw e;
        });
      });
    };
    this.remove = function (c, id) {
      return chain(c + '/' + id, function () { return db.doc(c + '/' + id).delete(); });
    };
  }

  function LocalBackend() {
    var KEY = 'dock24:v1';
    this.start = function () {
      try {
        var raw = localStorage.getItem(KEY);
        if (raw) { var saved = JSON.parse(raw); COLLS.forEach(function (c) { App.data[c] = saved[c] || {}; }); }
      } catch (e) { /* storage blocked: start empty */ }
      COLLS.forEach(function (c) { App.loaded[c] = true; });
      App.render();
    };
    function persist() {
      try { localStorage.setItem(KEY, JSON.stringify(App.data)); } catch (e) { /* ignore */ }
    }
    this.set = function () { persist(); return Promise.resolve(); };
    this.update = function () { persist(); return Promise.resolve(); };
    this.remove = function () { persist(); return Promise.resolve(); };
  }

  App.loaded = {};

  /* Write the whole document (cache updates first, so the screen changes at once). */
  function saveFailed(coll, id, e) {
    console.warn('save failed', coll, id, e && e.code);
    if (e && e.code === 'invalid_argument') { App.state.canWrite = false; App.toast('You can look but not change things on this page.'); }
    else if (e && e.code === 'quota_exceeded') App.toast('Storage is full. Ask the office to clear old records.');
    else App.toast('Could not save. Check your connection and try again.');
    throw e;
  }
  App.save = function (coll, id, obj) {
    var body = App.clone(obj);
    delete body.id;
    App.data[coll] = Object.assign({}, App.data[coll]);
    App.data[coll][id] = body;
    App.render();
    if (!backend) return Promise.resolve();
    return backend.set(coll, id, body).catch(function (e) { return saveFailed(coll, id, e); });
  };
  /* Merge fields into a document (objects merge, arrays replace). Creates it if missing.
     Only the changed fields are sent, so two people editing different parts don't overwrite each other. */
  App.patch = function (coll, id, partial) {
    var p = App.clone(partial);
    delete p.id;
    var cur = (App.data[coll] || {})[id];
    if (!cur) return App.save(coll, id, p);
    var full = deepMerge(cur, p);
    App.data[coll] = Object.assign({}, App.data[coll]);
    App.data[coll][id] = full;
    App.render();
    if (!backend) return Promise.resolve();
    return backend.update(coll, id, p, full).catch(function (e) { return saveFailed(coll, id, e); });
  };
  App.remove = function (coll, id) {
    App.data[coll] = Object.assign({}, App.data[coll]);
    delete App.data[coll][id];
    App.render();
    return backend ? backend.remove(coll, id) : Promise.resolve();
  };

  /* ---------- photos and paperwork ---------- */
  var assetsNs = null;
  function loadImage(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () { res({ img: img, url: url }); };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('not an image')); };
      img.src = url;
    });
  }
  function shrink(file, maxSide, quality) {
    return loadImage(file).then(function (r) {
      var w = r.img.naturalWidth, h = r.img.naturalHeight, s = Math.min(1, maxSide / Math.max(w, h));
      var cv = document.createElement('canvas');
      cv.width = Math.round(w * s); cv.height = Math.round(h * s);
      cv.getContext('2d').drawImage(r.img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(r.url);
      return cv;
    }).then(function (cv) {
      return { dataUrl: cv.toDataURL('image/jpeg', quality), blob: new Promise(function (res) { cv.toBlob(res, 'image/jpeg', quality); }) };
    });
  }
  /* Store a photo or scan. Resolves a reference string to keep in documents:
     'a:<assetId>' (stored as a file) or 'p:<photoId>' (small copy kept in the database). */
  App.upload = function (file) {
    if (!file) return Promise.reject(new Error('no file'));
    var isPdf = file.type === 'application/pdf';
    if (assetsNs) {
      var job = isPdf ? Promise.resolve(file) : shrink(file, 1600, 0.82).then(function (r) { return r.blob; });
      return job.then(function (blob) {
        return assetsNs.upload(blob, { type: isPdf ? 'application/pdf' : 'image/jpeg' });
      }).then(function (res) { return 'a:' + res.id; });
    }
    if (isPdf) return Promise.reject(new Error('Scan it as a photo instead. PDF files need file storage, which this view does not have.'));
    return shrink(file, 900, 0.6).then(function (r) {
      var id = App.newId('ph');
      return App.save('photos', id, { data: r.dataUrl, at: App.iso() }).then(function () { return 'p:' + id; });
    });
  };
  App.photoUrl = function (ref) {
    if (!ref) return '';
    if (ref.indexOf('a:') === 0) return '/_blob/' + ref.slice(2);
    if (ref.indexOf('p:') === 0) { var p = App.data.photos[ref.slice(2)]; return p ? p.data : ''; }
    return '';
  };
  /* <img> for a stored photo, or a labelled placeholder */
  App.photoTag = function (ref, alt) {
    var url = App.photoUrl(ref);
    if (!url) return '<span class="thumb empty">' + esc(alt || 'Photo') + '</span>';
    return '<img class="thumb" src="' + esc(url) + '" alt="' + esc(alt || 'Photo') + '" loading="lazy">';
  };

  /* ---------- forms ---------- */
  App.form = function (name, init) {
    if (!App.state.forms[name]) App.state.forms[name] = App.clone(init || {});
    return App.state.forms[name];
  };
  App.resetForm = function (name, init) { App.state.forms[name] = App.clone(init || {}); return App.state.forms[name]; };
  function setPath(obj, path, val) {
    var keys = path.split('.'), o = obj;
    for (var i = 0; i < keys.length - 1; i++) {
      if (typeof o[keys[i]] !== 'object' || o[keys[i]] === null) o[keys[i]] = /^\d+$/.test(keys[i + 1]) ? [] : {};
      o = o[keys[i]];
    }
    o[keys[keys.length - 1]] = val;
  }
  function getPath(obj, path) {
    return path.split('.').reduce(function (o, k) { return o === null || o === undefined ? undefined : o[k]; }, obj);
  }
  App.getPath = getPath; App.setPath = setPath;
  /* value="" attribute for an input bound to a form field */
  App.val = function (form, path) {
    var v = getPath(App.form(form), path);
    return v === undefined || v === null ? '' : esc(v);
  };

  /* ---------- UI: navigation, sheets, toasts ---------- */
  App.go = function (view, params) {
    App.state.confirm = null;
    App.state.view = view;
    App.state.params = params || {};
    App.state.sheet = null;
    App.render();
    try { window.scrollTo(0, 0); } catch (e) { /* ignore */ }
  };
  App.sheet = function (view, params) { App.state.sheet = { view: view, params: params || {} }; App.render(); };
  App.closeSheet = function () { App.state.sheet = null; App.render(); };
  var toastTimer = null;
  App.toast = function (text) {
    App.state.toast = text;
    App.render();
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { App.state.toast = null; App.render(); }, 3500);
  };
  App.setRole = function (role, keepView) {
    App.state.role = role;
    try { localStorage.setItem('dock24:role', role); } catch (e) { /* ignore */ }
    if (!keepView) App.go(App.homes[role] || 'client.home');
  };
  App.t = function (key, vars) {
    var dict = App.strings[App.state.lang] || {}, en = App.strings.en || {};
    var s = dict[key] || en[key] || key;
    if (vars) Object.keys(vars).forEach(function (k) { s = s.split('{' + k + '}').join(vars[k]); });
    return s;
  };

  /* ---------- shared pieces of screen ---------- */
  /* top bar: opts {back: 'view.name' | true (role home), sub: 'small line', right: '<html>'} */
  App.topbar = function (title, opts) {
    opts = opts || {};
    var back = '';
    if (opts.back) {
      back = opts.back === true
        ? '<button type="button" class="tb-back" data-act="core.home" aria-label="Back">&larr;</button>'
        : '<button type="button" class="tb-back" data-act="core.go" data-view="' + esc(opts.back) + '"' + paramAttrs(opts.backParams) + ' aria-label="Back">&larr;</button>';
    } else back = '<span class="brand">24</span>';
    return '<header class="topbar">' + back + '<div class="tb-title"><b>' + esc(title) + '</b>' + (opts.sub ? '<span>' + esc(opts.sub) + '</span>' : '') + '</div>' + (opts.right || '') + '</header>';
  };
  function paramAttrs(p) {
    return Object.keys(p || {}).map(function (k) { return ' data-p-' + esc(k) + '="' + esc(p[k]) + '"'; }).join('');
  }
  App.paramAttrs = paramAttrs;
  /* bottom tab bar: items [{view, label, icon, badge}] */
  App.tabbar = function (items, current) {
    return '<nav class="tabbar" aria-label="Main">' + items.map(function (it) {
      return '<button type="button" class="' + (it.view === current ? 'on' : '') + '" data-act="core.go" data-view="' + esc(it.view) + '">' +
        '<span class="ti" aria-hidden="true">' + (it.icon || '') + '</span>' + esc(it.label) +
        (it.badge ? '<span class="dot">' + esc(it.badge) + '</span>' : '') + '</button>';
    }).join('') + '</nav>';
  };
  /* photo box that uploads when a picture is taken or picked.
     o: {form, field, label, required, multi (field is an array; adds to it), id, accept} */
  App.photoSlot = function (o) {
    var f = App.form(o.form), cur = getPath(f, o.field), key = o.form + ':' + o.field;
    var busy = App.state.busy && App.state.busy[key];
    var id = o.id || ('ph-' + (o.form + '-' + o.field).replace(/[^a-z0-9]/gi, '-'));
    var input = '<input type="file" id="' + esc(id) + '" accept="' + esc(o.accept || 'image/*') + '" capture="environment"' + (o.multi ? ' multiple' : '') +
      ' data-on-change="core.photo" data-form="' + esc(o.form) + '" data-photo-field="' + esc(o.field) + '"' + (o.multi ? ' data-multi="1"' : '') + ' aria-label="' + esc(o.label || 'Add photo') + '">';
    if (!o.multi && cur) {
      return '<div class="photo-slot filled' + (busy ? ' busy' : '') + '"><img src="' + esc(App.photoUrl(cur)) + '" alt="' + esc(o.label || 'Photo') + '">' +
        '<button type="button" class="ps-x" data-act="core.photoClear" data-form="' + esc(o.form) + '" data-field="' + esc(o.field) + '" aria-label="Remove photo">&times;</button></div>';
    }
    return '<label class="photo-slot' + (o.required ? ' req' : '') + (busy ? ' busy' : '') + '" for="' + esc(id) + '"><span class="ps-i" aria-hidden="true">&#128247;</span>' +
      esc(o.label || 'Add photo') + (o.required ? '<span class="tiny">Required</span>' : '') + input + '</label>';
  };
  /* thumbnails of an array field with remove buttons, plus an add box */
  App.photoList = function (o) {
    var arr = getPath(App.form(o.form), o.field) || [];
    return '<div class="thumbs">' + arr.map(function (ref, i) {
      return '<div class="photo-slot filled"><img src="' + esc(App.photoUrl(ref)) + '" alt="' + esc((o.label || 'Photo') + ' ' + (i + 1)) + '">' +
        '<button type="button" class="ps-x" data-act="core.photoRemove" data-form="' + esc(o.form) + '" data-field="' + esc(o.field) + '" data-index="' + i + '" aria-label="Remove photo ' + (i + 1) + '">&times;</button></div>';
    }).join('') + App.photoSlot(Object.assign({}, o, { multi: true, required: o.required && !arr.length })) + '</div>';
  };
  /* two-tap confirm without dialogs. App.confirmBtn('cancel-t1', 'Cancel truck', 'client.cancel', {'data-id': 't1'}, 'danger') */
  App.confirmBtn = function (key, label, act, attrs, tone) {
    var a = Object.keys(attrs || {}).map(function (k) { return ' ' + esc(k) + '="' + esc(attrs[k]) + '"'; }).join('');
    if (App.state.confirm === key) {
      return '<span class="row"><span class="small bold">Are you sure?</span>' +
        '<button type="button" class="btn sm ' + (tone || 'danger') + '" data-act="' + esc(act) + '"' + a + '>Yes, ' + esc(label.toLowerCase()) + '</button>' +
        '<button type="button" class="btn sm secondary" data-act="core.confirmNo">No</button></span>';
    }
    return '<button type="button" class="btn ' + (tone === 'primary' ? 'primary' : 'secondary') + '" data-act="core.confirmAsk" data-key="' + esc(key) + '">' + esc(label) + '</button>';
  };

  /* ---------- rendering ---------- */
  var rafPending = false;
  App.render = function () {
    if (rafPending) return;
    rafPending = true;
    (window.requestAnimationFrame || setTimeout)(function () { rafPending = false; doRender(); });
  };
  App.renderNow = doRender;

  function roleBar() {
    var r = App.state.role;
    if (r === 'kiosk') return '';
    var roles = [['client', 'Client'], ['kiosk', 'Kiosk'], ['crew', 'Forklift'], ['office', 'Office'], ['driver', 'Driver']];
    return '<nav class="rolebar" aria-label="Switch view"><span class="rb-label">Prototype · view as</span>' +
      roles.map(function (x) {
        return '<button type="button" class="rb' + (r === x[0] ? ' on' : '') + '" data-act="core.role" data-role="' + x[0] + '">' + x[1] + '</button>';
      }).join('') +
      (App.state.mode === 'local' ? '<span class="rb-local">Saved on this device only</span>' : '') +
      '</nav>';
  }

  function doRender() {
    var root = document.getElementById('app');
    if (!root) return;
    var view = App.views[App.state.view], html;
    try {
      html = view ? view(App.state.params || {}) : '<div class="body"><p>Loading…</p></div>';
    } catch (e) {
      console.error(e);
      html = '<div class="body stack"><div class="card"><b>Something went wrong on this screen.</b><p class="muted small">' + esc(e.message) + '</p>' +
        '<button type="button" class="btn secondary" data-act="core.home">Back to start</button></div></div>';
    }
    var sheet = '';
    if (App.state.sheet && App.views[App.state.sheet.view]) {
      try { sheet = App.views[App.state.sheet.view](App.state.sheet.params || {}); } catch (e) { console.error(e); sheet = '<p>' + esc(e.message) + '</p>'; }
      sheet = '<div class="sheet-back" data-act="core.closeSheet"></div><div class="sheet" role="dialog" aria-modal="true">' + sheet + '</div>';
    }
    var toast = App.state.toast ? '<div class="toast" role="status">' + esc(App.state.toast) + '</div>' : '';

    // keep focus, caret and scroll where the person left them
    var a = document.activeElement, focusId = a && a.id ? a.id : null, selS = null, selE = null;
    try { if (focusId && a.selectionStart !== undefined) { selS = a.selectionStart; selE = a.selectionEnd; } } catch (e) { /* ignore */ }
    var sheetEl = root.querySelector('.sheet'), sheetScroll = sheetEl ? sheetEl.scrollTop : 0;

    root.className = 'role-' + (App.state.role || 'none');
    root.innerHTML = roleBar() + html + sheet + toast;

    if (focusId) {
      var el = document.getElementById(focusId);
      if (el && el !== document.activeElement) {
        try { el.focus({ preventScroll: true }); if (selS !== null && el.setSelectionRange) el.setSelectionRange(selS, selE); } catch (e) { /* ignore */ }
      }
    }
    var ns = root.querySelector('.sheet');
    if (ns && sheetScroll) ns.scrollTop = sheetScroll;
  }

  /* ---------- events ---------- */
  function onClick(ev) {
    var el = ev.target.closest('[data-act]');
    if (!el || el.disabled) return;
    var fn = App.actions[el.getAttribute('data-act')];
    if (!fn) { console.warn('no action', el.getAttribute('data-act')); return; }
    if (el.tagName === 'A' || el.tagName === 'BUTTON') ev.preventDefault();
    try { var r = fn(el, ev); if (r && r.catch) r.catch(function (e) { console.error(e); if (e && e.message && !e.code) App.toast(e.message); }); }
    catch (e) { console.error(e); App.toast(e.message || 'That did not work.'); }
  }
  function onInput(ev) {
    var el = ev.target;
    var form = el.getAttribute && el.getAttribute('data-form'), field = el.getAttribute && el.getAttribute('data-field');
    if (form && field) {
      var v = el.type === 'checkbox' ? el.checked : el.value;
      setPath(App.form(form), field, v);
      if (el.hasAttribute('data-rerender')) App.render();
    }
    if (ev.type === 'change' && el.getAttribute && el.getAttribute('data-on-change')) {
      var fn = App.actions[el.getAttribute('data-on-change')];
      if (fn) {
        try { var r = fn(el, ev); if (r && r.catch) r.catch(function (e) { console.error(e); App.toast(e.message || 'That did not work.'); }); }
        catch (e) { console.error(e); App.toast(e.message || 'That did not work.'); }
      }
    }
  }
  function onSubmit(ev) {
    ev.preventDefault();
    var f = ev.target, act = f.getAttribute('data-submit');
    if (act && App.actions[act]) App.actions[act](f, ev);
  }

  App.actions['core.role'] = function (el) { App.setRole(el.getAttribute('data-role')); };
  App.actions['core.home'] = function () { App.go(App.homes[App.state.role] || 'client.home'); };
  App.actions['core.go'] = function (el) {
    var p = {};
    Array.prototype.forEach.call(el.attributes, function (at) {
      if (at.name.indexOf('data-p-') === 0) p[at.name.slice(7)] = at.value;
    });
    App.go(el.getAttribute('data-view'), p);
  };
  App.actions['core.sheet'] = function (el) {
    var p = {};
    Array.prototype.forEach.call(el.attributes, function (at) {
      if (at.name.indexOf('data-p-') === 0) p[at.name.slice(7)] = at.value;
    });
    App.sheet(el.getAttribute('data-view'), p);
  };
  App.actions['core.closeSheet'] = function () { App.closeSheet(); };
  /* toggle or set a form field: data-form, data-field, data-value (omit to toggle a boolean) */
  App.actions['core.set'] = function (el) {
    var f = App.form(el.getAttribute('data-form')), path = el.getAttribute('data-field');
    if (el.hasAttribute('data-value')) {
      var v = el.getAttribute('data-value');
      if (v === 'true') v = true; else if (v === 'false') v = false;
      setPath(f, path, v);
    } else setPath(f, path, !getPath(f, path));
    App.render();
  };
  /* add n to a numeric form field: data-form, data-field, data-step (can be negative), data-min */
  App.actions['core.step'] = function (el) {
    var f = App.form(el.getAttribute('data-form')), path = el.getAttribute('data-field');
    var min = el.hasAttribute('data-min') ? Number(el.getAttribute('data-min')) : 0;
    var v = Number(getPath(f, path)) || 0;
    setPath(f, path, Math.max(min, v + Number(el.getAttribute('data-step') || 1)));
    App.render();
  };
  /* toggle a value in an array form field: data-form, data-field, data-value */
  App.actions['core.toggleIn'] = function (el) {
    var f = App.form(el.getAttribute('data-form')), path = el.getAttribute('data-field'), v = el.getAttribute('data-value');
    var arr = (getPath(f, path) || []).slice(), i = arr.indexOf(v);
    if (i < 0) arr.push(v); else arr.splice(i, 1);
    setPath(f, path, arr);
    App.render();
  };

  App.state.busy = {};
  App.actions['core.photo'] = function (el) {
    var files = Array.prototype.slice.call(el.files || []);
    if (!files.length) return;
    var form = el.getAttribute('data-form'), field = el.getAttribute('data-photo-field'), multi = el.hasAttribute('data-multi');
    var key = form + ':' + field;
    App.state.busy[key] = true; App.render();
    var jobs = files.map(function (file) { return App.upload(file); });
    return Promise.all(jobs.map(function (j) { return j.then(function (r) { return r; }, function (e) { App.toast(e.message || 'That photo did not save.'); return null; }); }))
      .then(function (refs) {
        refs = refs.filter(Boolean);
        var f = App.form(form);
        if (multi) setPath(f, field, (getPath(f, field) || []).concat(refs));
        else if (refs[0]) setPath(f, field, refs[0]);
        delete App.state.busy[key]; App.render();
      });
  };
  App.actions['core.photoClear'] = function (el) { setPath(App.form(el.getAttribute('data-form')), el.getAttribute('data-field'), null); App.render(); };
  App.actions['core.photoRemove'] = function (el) {
    var f = App.form(el.getAttribute('data-form')), path = el.getAttribute('data-field');
    var arr = (getPath(f, path) || []).slice(); arr.splice(Number(el.getAttribute('data-index')), 1);
    setPath(f, path, arr); App.render();
  };
  App.actions['core.confirmAsk'] = function (el) { App.state.confirm = el.getAttribute('data-key'); App.render(); };
  App.actions['core.confirmNo'] = function () { App.state.confirm = null; App.render(); };
  App.anyBusy = function () { return Object.keys(App.state.busy || {}).length > 0; };

  /* ---------- start ---------- */
  App.start = function () {
    document.addEventListener('click', onClick);
    document.addEventListener('input', onInput);
    document.addEventListener('change', onInput);
    document.addEventListener('submit', onSubmit);

    var role = null, hash = (location.hash || '').replace('#', ''), startParams = {};
    if (App.homes[hash]) role = hash;
    var dm = /^driver(\d{4})$/.exec(hash);   // driver link: #driver4821 opens that truck's ETA page
    if (dm) { role = 'driver'; startParams = { code: dm[1] }; }
    if (!role) { try { role = localStorage.getItem('dock24:role'); } catch (e) { /* ignore */ } }
    if (!App.homes[role]) role = 'client';
    App.state.role = role;
    try {
      App.state.customerId = localStorage.getItem('dock24:customer') || null;
      App.state.crewName = localStorage.getItem('dock24:crew') || null;
    } catch (e) { /* ignore */ }
    App.state.view = App.homes[role];
    App.state.params = startParams;
    App.render();

    // live clocks: wait timers and "ago" labels
    setInterval(function () { if (!document.hidden) App.render(); }, 20000);

    var claude = window.claude;
    var useCap = claude && typeof claude.use === 'function' ? function (n) { return claude.use(n).catch(function () { return null; }); } : function () { return Promise.resolve(null); };
    Promise.all([useCap('db'), useCap('user'), useCap('assets')]).then(function (caps) {
      var db = caps[0], user = caps[1];
      assetsNs = caps[2] || null;
      if (db) { backend = new DbBackend(db); App.state.mode = 'live'; }
      else { backend = new LocalBackend(); App.state.mode = 'local'; }
      backend.start();
      if (user) {
        Promise.resolve(user.id()).then(function (id) { App.state.uid = id; });
        Promise.resolve(user.can('data.write')).then(function (ok) { if (ok === false) { App.state.canWrite = false; App.render(); } });
      }
      App.render();
    });
  };

  App.register = function (views, actions) {
    Object.assign(App.views, views || {});
    Object.assign(App.actions, actions || {});
  };
})();
