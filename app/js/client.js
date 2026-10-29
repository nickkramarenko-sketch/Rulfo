/* 24 HR Dock: client portal (the customer's dispatcher). Phone first, works on desktop.
   Registers every client.* view and action described in app/CONTRACT.md ("client").
   Views only read App data and form drafts. Every write happens inside an action.
   Views: client.signin, client.home, client.book (new + edit with {id}), client.load (sheet),
          client.booked, client.truck, client.eta (sheet), client.driverlink (sheet), client.photo (sheet),
          client.damage, client.damagelog, client.history, client.gear, client.alerts */
(function () {
  'use strict';
  var App = window.App;
  var h = App.h;

  /* ================= small helpers ================= */
  var LANG_EN = { en: 'English', es: 'Spanish', ru: 'Russian', uk: 'Ukrainian', pa: 'Punjabi', hi: 'Hindi' };
  var LANG_ORDER = ['en', 'es', 'ru', 'uk', 'pa', 'hi'];
  var TRACK = [
    { key: 'link', icon: '&#128241;', title: 'Send my driver a link', sub: 'Your driver taps one button to tell us when they are close. No app needed.' },
    { key: 'samsara', icon: '&#128225;', title: 'Samsara', sub: 'Paste your Samsara live share link. We watch the truck come in.' },
    { key: 'gps', icon: '&#128205;', title: 'Other GPS app', sub: 'Paste a live location link (Google Maps, Motive or any tracker).' },
    { key: 'self', icon: '&#9999;&#65039;', title: 'I’ll update it myself', sub: 'You change the ETA here in the portal when plans change.' },
    { key: 'none', icon: '&#128339;', title: 'No updates', sub: 'We go by the appointment time.' }
  ];
  var KINDS = [['drop', 'Drop-off'], ['pick', 'Pickup'], ['both', 'Both']];
  var KIND_HINT = {
    drop: 'We unload your truck and count every pallet.',
    pick: 'We load your truck, then secure the load and send photos.',
    both: 'We unload first, then load your pickup.'
  };
  var GEAR = [['plywood', 'Plywood sheets', 'plywood sheet'], ['bars', 'Load bars', 'load bar'], ['straps', 'Straps', 'strap'], ['airbags', 'Airbags', 'airbag']];
  var SEC_PHOTOS = [['nose', 'Nose (front of trailer)'], ['middle', 'Middle'], ['tail', 'Tail (doors)'], ['closeup', 'Bars/straps close-up'], ['seal', 'Seal']];
  var CONF = ['', 'Not safe', 'Needs work', 'OK', 'Solid', 'Rock solid'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function cid() { return App.state.customerId; }
  function cust() { var id = cid(); return id ? App.get('customers', id) : null; }
  /* who is using the portal: first contact on file, else the company */
  function me() {
    var c = cust(), p = c && (c.contacts || [])[0];
    return (p && trim(p.name)) || (c && c.name) || 'Client';
  }
  function trim(v) { return v === undefined || v === null ? '' : String(v).trim(); }
  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }
  function plural(n, one, many) { return App.fmt.num(n) + ' ' + (Number(n) === 1 ? one : (many || one + 's')); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function money(n) { return App.fmt.money(n); }
  /* ticking clock text: "22m 05s", "1h 02m 13s" */
  function liveDur(ms) {
    var s = Math.max(0, Math.floor((ms || 0) / 1000)), hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
    return hh ? hh + 'h ' + pad2(mm) + 'm ' + pad2(ss) + 's' : mm + 'm ' + pad2(ss) + 's';
  }
  /* tap targets: every button a thumb can hit is at least 44 px tall (core .chip / .seg / .linkbtn / .btn.sm are smaller) */
  var TAP = 'min-height:44px';
  var LINK = ' style="min-height:44px;display:inline-flex;align-items:center"';
  /* a pill that holds data (seal, tag numbers, kinds): long values wrap instead of pushing the page sideways */
  function dpill(cls, text) { return '<span class="pill ' + cls + '" style="white-space:normal;overflow-wrap:anywhere;max-width:100%">' + h(text) + '</span>'; }
  var WRAP = 'overflow-wrap:anywhere';
  function startOfToday() { var d = new Date(App.now()); d.setHours(0, 0, 0, 0); return d.getTime(); }
  /* live = on the yard now, or booked for today or later. Old bookings that never came are listed separately. */
  function isLive(t) {
    if (t.status === 'arrived' || t.status === 'working') return true;
    if (t.status !== 'booked') return false;
    var s = startOfToday(), a = Date.parse(t.apptAt || '') || 0, e = Date.parse((t.eta && t.eta.at) || '') || 0;
    return Math.max(a, e) >= s || (!a && !e);
  }
  function isStale(t) { return t.status === 'booked' && !isLive(t); }
  function myTruck(id) { var t = id ? App.get('trucks', id) : null; return t && t.customerId === cid() ? t : null; }
  function myDamage(id) { var d = id ? App.get('damage', id) : null; return d && d.customerId === cid() ? d : null; }
  function waitingDamage() {
    var id = cid();
    return App.sortByTime(App.list('damage', function (d) { return d.customerId === id && d.status === 'waiting'; }), 'at', 'desc');
  }
  function truckTitle(t) { return t.truckNo ? 'Truck ' + t.truckNo : App.kindLabel(t); }
  function refsLine(t) {
    var r = (t.loads || []).map(function (l) { return trim(l.ref); }).filter(Boolean);
    return r.length > 2 ? r.slice(0, 2).join(', ') + ' +' + (r.length - 2) + ' more' : r.join(', ');
  }
  function dayOnly(iso) {
    if (!iso) return '';
    var d = new Date(iso).toDateString(), n = App.now();
    if (d === new Date(n).toDateString()) return 'Today';
    if (d === new Date(n + 864e5).toDateString()) return 'Tomorrow';
    if (d === new Date(n - 864e5).toDateString()) return 'Yesterday';
    return App.fmt.date(iso);
  }
  function nbTime(iso) { return App.fmt.time(iso).replace(' ', '\u00a0'); }
  function shortDate(iso) { var d = new Date(iso); return MON3[d.getMonth()] + ' ' + d.getDate(); }
  /* promise length in minutes, read from the promise text ("within 2 hours"); 120 if none */
  function promiseMin() {
    var s = String(App.settings().promise || ''), m = /(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?)\b/i.exec(s);
    if (!m) return 120;
    return /^m/i.test(m[2]) ? Number(m[1]) : Number(m[1]) * 60;
  }
  function promiseShort() { var m = promiseMin(); return m % 60 === 0 ? (m / 60) + '-hour' : m + '-minute'; }
  /* dock hours from the settings text, e.g. "Docks open 6 AM to 10 PM Monday to Friday" */
  function dockHours() {
    var txt = String(App.settings().hours || ''), open = 6, close = 22;
    var m = /(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?\s*(?:to|-|–|until|till)\s*(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?/i.exec(txt);
    if (m) {
      open = (Number(m[1]) % 12) + (/p/i.test(m[3]) ? 12 : 0) + (Number(m[2]) || 0) / 60;
      close = (Number(m[4]) % 12) + (/p/i.test(m[6]) ? 12 : 0) + (Number(m[5]) || 0) / 60;
      if (close <= open) close = 24;
    }
    if (/24\s*\/\s*7|24 hours|around the clock/i.test(txt)) { open = 0; close = 24; }
    return { open: open, close: Math.min(close, 24), weekdaysOnly: /mon\w*\s*(?:to|-|–|through|thru)\s*fri/i.test(txt), text: txt };
  }
  function afterHours(iso) {
    var d = new Date(iso), x = d.getHours() + d.getMinutes() / 60, hrs = dockHours();
    if (hrs.weekdaysOnly && (d.getDay() === 0 || d.getDay() === 6)) return true;
    return x < hrs.open || x >= hrs.close;
  }
  /* only plain web links are shown as links (never javascript: or data:) */
  function safeUrl(u) { u = trim(u); return /^https?:\/\/[^\s"'<>]+$/i.test(u) ? u : ''; }
  function driverLink(code) {
    var base = '';
    try { base = String(window.location.href).split('#')[0]; } catch (e) { base = ''; }
    return base + '#driver' + code;
  }
  function langName(code) { return LANG_EN[code] || code || ''; }
  function langCodes() {
    var list = (App.LANGS || []).map(function (l) { return l.code; }).filter(function (c) { return LANG_EN[c]; });
    return list.length ? list : LANG_ORDER;
  }
  function trackInfo(k) {
    for (var i = 0; i < TRACK.length; i++) if (TRACK[i].key === k) return TRACK[i];
    return TRACK[TRACK.length - 1];
  }
  function stateAbbr(d) { var m = /,\s*([A-Z]{2})\b/.exec((d && d.name) || ''); return m ? m[1] : ((d && d.name) || '?').slice(0, 2).toUpperCase(); }
  function loadLine(l) {
    return [plural(num(l.pallets), 'pallet'), num(l.weight) ? App.fmt.num(l.weight) + ' lbs' : '', num(l.pieces) ? plural(num(l.pieces), 'piece') : '', trim(l.destination)]
      .filter(Boolean).join(' · ');
  }
  function flagPills(l) {
    return (l.hazmat ? '<span class="pill bad">Hazmat</span>' : '') +
      (l.stackable ? '<span class="pill info">Stackable</span>' : '<span class="pill">Do not stack</span>');
  }
  function sortActive(a, b) {
    var r = { working: 0, arrived: 1, booked: 2 };
    if (r[a.status] !== r[b.status]) return r[a.status] - r[b.status];
    var x = Date.parse(App.truckEta(a) || '') || Infinity, y = Date.parse(App.truckEta(b) || '') || Infinity;
    return x - y;
  }

  /* ================= shared pieces of screen ================= */
  function tabs(current) {
    var n = cust() ? waitingDamage().length : 0;
    return App.tabbar([
      { view: 'client.home', label: 'Home', icon: '&#127968;', badge: n || '' },
      { view: 'client.book', label: 'Book', icon: '&#128197;' },
      { view: 'client.history', label: 'Loads', icon: '&#128230;' },
      { view: 'client.gear', label: 'Gear', icon: '&#129520;' },
      { view: 'client.alerts', label: 'Alerts', icon: '&#128276;' }
    ], current);
  }
  function screen(title, opts, body, tab, cls) {
    return App.topbar(title, opts) + '<main class="body' + (cls ? ' ' + cls : '') + '">' + body + '</main>' + (tab ? tabs(tab) : '');
  }
  /* signed-in check for every client view (null = go ahead) */
  function gate() {
    if (!App.loaded.customers) return '<div class="body"><p class="muted">Loading your company…</p></div>';
    if (!cust()) return signinView();
    return null;
  }
  function notFound(title) {
    return screen(title, { back: true }, '<div class="card stack"><b>We can’t find that.</b>' +
      '<p class="muted">It may have been removed, or it belongs to another company.</p>' +
      '<button type="button" class="btn secondary" data-act="core.home">Back home</button></div>', 'client.home');
  }
  function sectionHead(title, right, tag) {
    tag = tag || 'h2';
    return '<div class="row between"><' + tag + '>' + h(title) + '</' + tag + '>' + (right || '') + '</div>';
  }
  function stat(value, label, tone, attrs, size) {
    return '<div class="stat"><b class="' + (tone && tone !== 'neutral' ? tone + '-t' : '') + '" style="font-size:' + (size || '1.6rem') + ';' + WRAP + '"' + (attrs || '') + '>' +
      h(value) + '</b><span>' + h(label) + '</span></div>';
  }
  /* a stat whose number ticks every second (see the clock at the bottom of this file) */
  function liveStat(sinceIso, label, tone) {
    var s = Date.parse(sinceIso || '');
    if (isNaN(s)) return stat('—', label, '');
    return stat(liveDur(App.now() - s), label, tone, ' data-cl-since="' + h(sinceIso) + '"');
  }
  function errMsg(text) { return trim(text) ? '<span class="errmsg" role="alert">' + h(text) + '</span>' : ''; }
  /* an error line outside a single field (the .errmsg style only applies inside .field) */
  function errLine(text) { return trim(text) ? '<div class="field">' + errMsg(text) + '</div>' : ''; }
  /* text input bound to a form field. o: {form, field, id, label, type, mode, placeholder, hint, err, change, rerender, attrs} */
  function input(o) {
    return '<div class="field' + (o.err ? ' err' : '') + '"' + (o.wrap ? ' style="' + o.wrap + '"' : '') + '><label for="' + h(o.id) + '">' + h(o.label) + '</label>' +
      '<input id="' + h(o.id) + '" type="' + h(o.type || 'text') + '"' + (o.mode ? ' inputmode="' + h(o.mode) + '"' : '') +
      ' data-form="' + h(o.form) + '" data-field="' + h(o.field) + '" value="' + App.val(o.form, o.field) + '"' +
      (o.placeholder ? ' placeholder="' + h(o.placeholder) + '"' : '') + (o.rerender ? ' data-rerender' : '') +
      (o.change ? ' data-on-change="client.rerender"' : '') + (o.attrs || '') + '>' +
      errMsg(o.err) + (o.hint ? '<span class="hint">' + h(o.hint) + '</span>' : '') + '</div>';
  }
  function textarea(o) {
    return '<div class="field"><label for="' + h(o.id) + '">' + h(o.label) + '</label>' +
      '<textarea id="' + h(o.id) + '" rows="' + (o.rows || 3) + '" data-form="' + h(o.form) + '" data-field="' + h(o.field) + '"' +
      (o.placeholder ? ' placeholder="' + h(o.placeholder) + '"' : '') + '>' + App.val(o.form, o.field) + '</textarea>' +
      (o.hint ? '<span class="hint">' + h(o.hint) + '</span>' : '') + '</div>';
  }
  function sheetHead(title) {
    return '<div class="row between nowrap"><h2 style="min-width:0;' + WRAP + '">' + h(title) + '</h2><button type="button" class="btn ghost" data-act="core.closeSheet">Close</button></div>';
  }
  /* photo thumbnails that open big in a sheet */
  function thumbs(refs, label) {
    return '<div class="thumbs">' + refs.map(function (r, i) {
      var lab = label + (refs.length > 1 ? ' ' + (i + 1) : '');
      return '<button type="button" class="linkbtn" style="display:block;width:100%" data-act="core.sheet" data-view="client.photo" data-p-ref="' + h(r) + '" data-p-label="' + h(lab) + '" aria-label="Open ' + h(lab) + '">' +
        App.photoTag(r, lab) + '</button>';
    }).join('') + '</div>';
  }

  /* ================= live truck status ================= */
  function etaSourceText(t) {
    if (!t.eta || !t.eta.at) return '';
    var src = { driver: 'from your driver', client: 'set by you', office: 'from our office', samsara: 'from Samsara', gps: 'from GPS' }[t.eta.source] || '';
    return [src, t.eta.updatedAt ? App.fmt.ago(t.eta.updatedAt) : ''].filter(Boolean).join(', ');
  }
  function trackingLine(t) {
    var k = t.tracking || 'none', url = safeUrl(t.trackUrl), html;
    if (k === 'link') html = 'Your driver updates the ETA from a link.';
    else if (k === 'samsara' || k === 'gps') {
      html = 'Tracking with ' + (k === 'samsara' ? 'Samsara' : 'a GPS app') + '. ' +
        (url ? '<a href="' + h(url) + '" target="_blank" rel="noopener noreferrer">Open the live map</a>' : 'No share link yet.');
    } else if (k === 'self') html = 'You update the ETA here.';
    else html = 'No ETA updates. We go by the appointment time.';
    return '<p class="small muted">' + html + '</p>';
  }
  /* time since check-in against the promise: progress bar + "done by" time */
  function promiseBar(t) {
    if (!t.checkedInAt) return '';
    var tm = App.truckTimes(t), lim = promiseMin() * 60000, used = tm.totalMs || 0;
    var pct = Math.min(100, Math.round(used / lim * 100));
    var tone = used > lim ? 'bad' : used > lim * 0.75 ? 'warn' : 'good';
    var by = App.fmt.time(App.iso(Date.parse(t.checkedInAt) + lim));
    var text = tone === 'good' ? 'On track: done by ' + by + ' or sooner' : tone === 'warn' ? 'Close to our promise time: ' + by : 'Past our promise time (' + by + ')';
    return '<div class="stack tight"><div class="progress ' + tone + '" role="img" aria-label="' + h(pct + '% of our promise time used') + '"><i style="width:' + Math.max(3, pct) + '%"></i></div>' +
      '<div class="row between small"><span class="muted">Checked in ' + h(App.fmt.time(t.checkedInAt)) + '</span><span class="bold ' + tone + '-t">' + h(text) + '</span></div></div>';
  }
  function doneBanner(t) {
    var tm = App.truckTimes(t), lim = promiseMin() * 60000;
    if (tm.totalMs === null) return '<div class="banner good"><div><b>Done ' + h(App.fmt.dayTime(t.doneAt)) + '</b></div></div>';
    var ok = tm.totalMs <= lim;
    var head = 'Done in ' + App.fmt.dur(tm.totalMs) + ' — ' + (ok ? 'within our ' + promiseShort() + ' promise' : App.fmt.dur(tm.totalMs - lim) + ' past our ' + promiseShort() + ' promise');
    return '<div class="banner ' + (ok ? 'good' : 'warn') + '"><div><b>' + h(head) + '</b><div class="small">Checked in ' + h(App.fmt.dayTime(t.checkedInAt)) +
      ', done ' + h(App.fmt.time(t.doneAt)) + '.' + (ok ? '' : ' Sorry about the wait.') + '</div></div></div>';
  }
  /* the numbers that make the client feel the speed: appointment/ETA, place in line, live clocks, promise */
  function liveInner(t, full) {
    var tm = App.truckTimes(t), pick = t.kind === 'pick', out = '';
    if (t.status === 'booked') {
      var eta = t.eta && t.eta.at, ref = eta || t.apptAt;
      /* "10:16 AM" stays on one line (no-break space, a bit smaller) */
      out += '<div class="grid2">' + stat(nbTime(t.apptAt) || '—', 'Appointment · ' + dayOnly(t.apptAt), '', '', '1.45rem') +
        stat(eta ? nbTime(eta) : 'Not yet', eta ? (dayOnly(eta) === 'Today' ? 'ETA' : 'ETA ' + dayOnly(eta)) + ' · ' + etaSourceText(t) : 'ETA · no update yet', '', '', '1.45rem') + '</div>';
      if (ref && Date.parse(ref) < App.now() - 10 * 60000) {
        out += '<div class="banner warn small"><div><b>Not checked in yet.</b> Running late? Update the ETA so we can plan your door.</div></div>';
      }
      if (full) out += trackingLine(t);
    } else if (t.status === 'arrived') {
      var pos = App.placeInLine(t), est = App.estWaitMin(t);
      out += '<div class="grid2">' + stat(pos ? '#' + pos : '—', 'Place in line') + liveStat(t.checkedInAt, 'Waited so far', App.waitTone(tm.waitMs)) + '</div>';
      out += '<p class="small">' + (pos === 1 ? '<b>You’re next.</b> ' : '') + (est ? 'About ' + h(est) + ' min until a door opens.' : '') + '</p>';
      out += promiseBar(t);
    } else if (t.status === 'working') {
      out += '<div class="grid2">' + stat(t.door ? 'Door ' + t.door : 'At a door', (pick ? 'Loading' : 'Unloading') + ' now') +
        liveStat(t.startedAt || t.checkedInAt, 'At the door so far', '') + '</div>';
      out += '<p class="small muted">Waited ' + h(App.fmt.dur(tm.waitMs) || '0 min') + ' for a door' + (full && t.crewName ? ' · ' + h(t.crewName) + ' is on it' : '') + '</p>';
      out += promiseBar(t);
    } else if (t.status === 'done') {
      out += doneBanner(t);
      if (full && tm.waitMs !== null) out += '<div class="grid2">' + stat(App.fmt.dur(tm.waitMs), 'Waited for a door', App.waitTone(tm.waitMs)) + stat(App.fmt.dur(tm.workMs) || '—', pick ? 'Loading time' : 'Unloading time') + '</div>';
    } else if (t.status === 'cancelled') {
      out += '<div class="banner"><div><b>This booking was cancelled.</b> Book again any time.</div></div>';
    }
    return out;
  }
  function liveCard(t) {
    var titles = { booked: (t.eta && t.eta.at) ? 'On the way' : 'Booked', arrived: 'Waiting in our yard', working: t.kind === 'pick' ? 'Loading now' : 'Unloading now', done: 'Done', cancelled: 'Cancelled' };
    var tone = { booked: 'info', arrived: 'warn', working: 'accent', done: 'good' }[t.status] || '';
    var live = t.status === 'arrived' || t.status === 'working';
    var actions = t.status === 'booked' ? '<div class="btn-row"><button type="button" class="btn primary" data-act="client.openEta" data-id="' + h(t.id) + '">Update ETA</button>' +
      '<button type="button" class="btn secondary" data-act="core.sheet" data-view="client.driverlink" data-p-id="' + h(t.id) + '">Driver link</button></div>' : '';
    return '<section class="card stack ' + tone + '"><div class="row between"><h3>' + h(titles[t.status] || 'Status') + '</h3>' +
      (live ? '<span class="pill good">&#9679; Live</span>' : '') + '</div>' + liveInner(t, true) + actions + '</section>';
  }
  function homeTruckCard(t) {
    var tone = { working: 'accent', arrived: 'warn', booked: 'info' }[t.status] || '';
    return '<div class="card link stack ' + tone + '" data-act="core.go" data-view="client.truck" data-p-id="' + h(t.id) + '">' +
      '<div class="row between nowrap"><div style="min-width:0;' + WRAP + '"><b class="big">' + h(truckTitle(t)) + '</b>' +
      (t.truckNo ? ' <span class="small muted">' + h(App.kindLabel(t)) + '</span>' : '') + '</div>' + App.statusPill(t) + '</div>' +
      '<div class="small muted" style="margin-top:-6px;' + WRAP + '">' + h([refsLine(t), plural(App.truckPallets(t), 'pallet'), App.dockName(t.dock)].filter(Boolean).join(' · ')) + '</div>' +
      App.stepsHtml(t) + liveInner(t, false) +
      '<div class="row between"><button type="button" class="btn secondary" data-act="core.sheet" data-view="client.driverlink" data-p-id="' + h(t.id) + '">Driver link</button>' +
      '<span class="small bold info-t">See details &rarr;</span></div></div>';
  }

  /* ================= damage pieces ================= */
  function dmgPill(d) {
    var m = { waiting: ['bad', 'Needs your OK'], approved: ['good', 'Approved'], declined: ['', 'Declined'], auto: ['good', 'Auto-approved'] }[d.status] || ['', d.status || ''];
    return '<span class="pill ' + m[0] + '">' + h(m[1]) + '</span>';
  }
  function decidedLine(d) {
    var note = d.customerNote ? '<div>Your note: “' + h(d.customerNote) + '”</div>' : '';
    var fresh = d.decidedAt && App.now() - Date.parse(d.decidedAt) < 864e5;
    if (d.status === 'approved') return '<div class="banner good small"><div><b>Approved</b> by ' + h(d.decidedBy || 'you') + (d.decidedAt ? ' · ' + h(App.fmt.dayTime(d.decidedAt)) : '') + '.' + (fresh ? ' We’ll fix it and send you photos.' : '') + note + '</div></div>';
    if (d.status === 'declined') return '<div class="banner warn small"><div><b>Declined</b> by ' + h(d.decidedBy || 'you') + (d.decidedAt ? ' · ' + h(App.fmt.dayTime(d.decidedAt)) : '') + '.' + (fresh ? ' We’ll leave it as it is and note it on the load.' : '') + note + '</div></div>';
    if (d.status === 'auto') {
      var c = cust(), lim = c && num(c.autoApproveUnder) > 0 ? ' (fixes under ' + money(c.autoApproveUnder) + ')' : '';
      return '<div class="banner good small"><div><b>Auto-approved by your setting' + h(lim) + '.</b> You can change this on the Alerts tab.</div></div>';
    }
    return '';
  }
  /* Approve / Decline buttons. Decline asks for an optional note first (no dialogs). */
  function decideBlock(d, full) {
    if (d.status !== 'waiting') return decidedLine(d);
    var fn = 'dmg:' + d.id, f = App.form(fn), total = money(App.damageTotal(d));
    var note = textarea({ form: fn, field: 'note', id: 'dmg-note-' + d.id, rows: 2, label: f.declining ? 'Tell the dock why (optional)' : 'Note for the dock (optional)', placeholder: f.declining ? 'e.g. Leave it, we will restack it ourselves' : 'e.g. Call me before you rewrap' });
    if (f.declining) {
      return '<div class="stack tight">' + note + '<div class="btn-row"><button type="button" class="btn danger" data-act="client.decline" data-id="' + h(d.id) + '">Yes, decline</button>' +
        '<button type="button" class="btn secondary" data-act="client.declineNo" data-id="' + h(d.id) + '">Go back</button></div></div>';
    }
    return (full ? note : '') + '<div class="btn-row"><button type="button" class="btn primary lg" style="flex:2 1 170px" data-act="client.approve" data-id="' + h(d.id) + '">Approve ' + h(total) + '</button>' +
      '<button type="button" class="btn secondary lg" style="flex:1 1 100px" data-act="client.declineAsk" data-id="' + h(d.id) + '">Decline</button></div>';
  }
  function qtyRate(l) { return num(l.qty) === 1 ? money(l.rate) : num(l.qty) + ' × ' + money(l.rate); }
  /* the fix lines in small type: "Rewrap pallet  2 × $15.00   $30.00" */
  function fixLinesHtml(d) {
    var ls = d.fixLines || [];
    if (!ls.length) return '<div class="small muted">No fix needed. We are letting you know.</div>';
    return '<div class="stack tight small">' + ls.map(function (l) {
      return '<div class="row between nowrap top" style="gap:8px"><span style="min-width:0;' + WRAP + '">' + h(l.label || 'Fix') + ' <span class="muted num">' + h(qtyRate(l)) + '</span></span>' +
        '<span class="num" style="flex:none">' + h(money(num(l.qty) * num(l.rate))) + '</span></div>';
    }).join('') + '</div>';
  }
  /* from: where the "See photos" page should go back to ('home' or 'truck') */
  function damageCard(d, from) {
    var photos = d.photos || [], photo = photos[0];
    var meta = [plural(num(d.pallets), 'pallet') + ' hurt', (d.kinds || []).join(', '), App.fmt.dayTime(d.at)].filter(Boolean).join(' · ');
    var go = ' data-act="core.go" data-view="client.damage" data-p-id="' + h(d.id) + '"' + (from ? ' data-p-from="' + h(from) + '"' : '');
    return '<div class="card stack' + (d.status === 'waiting' ? ' bad' : '') + '">' +
      '<div class="row nowrap top">' +
      (photo ? '<button type="button" class="linkbtn" style="width:88px;flex:none;display:block;text-decoration:none"' + go + ' aria-label="See the damage photos">' + App.photoTag(photo, 'Damage photo') +
        '<span class="tiny" style="display:block;text-align:center">' + h(plural(photos.length, 'photo')) + '</span></button>' : '') +
      '<div class="stack tight" style="flex:1;min-width:0;' + WRAP + '"><div class="row between"><b>Damage on ' + h(d.ref || 'a load') + '</b>' + dmgPill(d) + '</div>' +
      '<div class="small muted">' + h(meta) + '</div>' + (d.what ? '<div class="small">' + h(d.what) + '</div>' : '') + '</div></div>' +
      '<div class="card soft tight stack tight">' + fixLinesHtml(d) + '<hr><div class="row between"><span class="bold">Fix price</span><b class="big num">' + h(money(App.damageTotal(d))) + '</b></div></div>' +
      decideBlock(d, false) +
      '<button type="button" class="linkbtn small" style="align-self:flex-start;min-height:44px"' + go + '>' + (photos.length ? 'See big photos and details' : 'See details') + ' &rarr;</button></div>';
  }

  /* ================= sign in ================= */
  function signinView() {
    var cs = App.list('customers').sort(function (a, b) { return String(a.name || '').localeCompare(String(b.name || '')); });
    var f = App.form('signin', { code: '' });
    var list = cs.length ? '<div class="stack">' + cs.map(function (c) {
      return '<button type="button" class="choice" data-act="client.signin" data-id="' + h(c.id) + '"><span class="ci" aria-hidden="true">&#127970;</span>' +
        '<span class="ct"><b>' + h(c.name || 'Company') + '</b><span>' + h(App.dockName(c.dock)) + '</span></span>' + App.exampleTag(c) + '</button>';
    }).join('') + '</div>' : '<div class="empty-state">No companies yet. The office adds companies on the Customers screen.</div>';
    var body = '<div class="stack loose">' +
      '<div class="stack tight"><h1>Which company are you?</h1><p class="muted">Tap your company to see your trucks, book a dock time and get alerts.</p></div>' +
      list +
      '<form class="card stack" data-submit="client.signinCode" novalidate>' +
      input({ form: 'signin', field: 'code', id: 'signin-code', label: 'Or type your company code', placeholder: 'e.g. SIERRA', err: f._err, hint: 'The office gives you this code.', attrs: ' autocomplete="off" autocapitalize="characters"' }) +
      '<button type="submit" class="btn primary block">Sign in</button></form>' +
      '<div class="banner info small"><div><b>Prototype:</b> real sign-in comes later.</div></div></div>';
    return screen('24 HR Crossdock', { sub: 'Client portal' }, body, null, 'narrow');
  }

  /* ================= home ================= */
  function heroHtml(mine) {
    var st = App.settings(), cut = App.now() - 30 * 864e5, lim = promiseMin() * 60000;
    var recent = mine.filter(function (t) { return t.status === 'done' && t.checkedInAt && t.doneAt && Date.parse(t.doneAt) >= cut; });
    var stats = '';
    if (recent.length) {
      var waits = recent.map(function (t) { return App.truckTimes(t).waitMs || 0; });
      var avg = waits.reduce(function (s, x) { return s + x; }, 0) / waits.length;
      var kept = recent.filter(function (t) { return App.truckTimes(t).totalMs <= lim; }).length;
      var cell = function (v, l) { return '<div><div class="clock" style="font-size:1.6rem;line-height:1.1">' + h(v) + '</div><div class="tiny muted">' + h(l) + '</div></div>'; };
      stats = '<div class="grid3" style="grid-template-columns:repeat(3,minmax(0,1fr));margin-top:6px">' +
        cell(String(recent.length), recent.length === 1 ? 'truck (30 days)' : 'trucks (30 days)') + cell(App.fmt.dur(avg), 'average wait') +
        cell(Math.round(kept / recent.length * 100) + '%', 'on promise') + '</div>';
    } else {
      stats = '<div class="small muted">Your wait times and promise record show here after your first truck.</div>';
    }
    return '<div class="hero stack tight"><div class="tiny muted" style="letter-spacing:.08em;text-transform:uppercase">Our promise to you</div>' +
      '<h2>' + h(st.promise) + '</h2>' + stats + '</div>';
  }
  function doneRow(t) {
    var tm = App.truckTimes(t), ok = tm.totalMs !== null && tm.totalMs <= promiseMin() * 60000;
    return '<div class="li link" data-act="core.go" data-view="client.truck" data-p-id="' + h(t.id) + '"><div class="grow"><b>' + h(truckTitle(t) + (t.truckNo ? ' · ' + App.kindLabel(t) : '')) + '</b>' +
      '<span>' + h([App.fmt.dayTime(t.doneAt), plural(App.truckPallets(t), 'pallet'), tm.totalMs !== null ? 'done in ' + App.fmt.dur(tm.totalMs) : ''].filter(Boolean).join(' · ')) + '</span></div>' +
      (tm.totalMs !== null ? '<span class="pill ' + (ok ? 'good' : 'warn') + '">' + (ok ? 'On promise' : 'Over promise') + '</span>' : '') + '</div>';
  }
  function homeView() {
    var g = gate(); if (g) return g;
    var c = cust(), st = App.settings(), mine = App.trucksFor(c.id);
    var active = mine.filter(isLive).sort(sortActive);
    var stale = App.sortByTime(mine.filter(isStale), 'apptAt', 'desc');
    var done = App.sortByTime(mine.filter(function (t) { return t.status === 'done'; }), 'doneAt', 'desc').slice(0, 3);
    var waiting = waitingDamage();
    /* nobody gets texts or emails yet: say so, because hearing from us is the point */
    var anyAlerts = (c.contacts || []).some(function (p) {
      var a = p.alerts || {};
      return Object.keys(a).some(function (k) { return (a[k] && a[k].text && trim(p.phone)) || (a[k] && a[k].email && trim(p.email)); });
    });
    var html = '<div class="stack loose">' +
      '<div class="row between small"><span class="muted" style="min-width:0;' + WRAP + '">Signed in as <b>' + h(c.name) + '</b>' + App.exampleTag(c) + '</span>' +
      '<button type="button" class="linkbtn"' + LINK + ' data-act="client.signout">Switch company</button></div>' +
      heroHtml(mine) +
      (anyAlerts ? '' : '<div class="banner warn"><div class="stack tight"><b>Nobody gets our texts yet.</b><span class="small">Add a contact so we can tell you when your truck checks in, starts, and is done.</span>' +
        '<button type="button" class="btn secondary" style="align-self:flex-start" data-act="core.go" data-view="client.alerts">Set up alerts</button></div></div>') +
      '<button type="button" class="btn primary lg block" data-act="core.go" data-view="client.book">&#65291; Book a truck</button>' +
      (waiting.length ? '<section class="stack">' + sectionHead('Needs you', '<span class="pill bad">' + waiting.length + ' waiting</span>') +
        '<p class="small muted" style="margin-top:-6px">We found damage. Look at the photos and tell us if we should fix it.</p>' + waiting.map(function (d) { return damageCard(d, 'home'); }).join('') + '</section>' : '') +
      '<section class="stack">' + sectionHead('Live trucks', active.length ? '<span class="pill info">' + active.length + '</span>' : '') +
      (active.length ? active.map(homeTruckCard).join('') :
        '<div class="empty-state stack" style="align-items:center"><b>No trucks on the way.</b><span>Book one and we’ll have a door ready.</span>' +
        '<button type="button" class="btn secondary" data-act="core.go" data-view="client.book">Book a truck</button></div>') + '</section>' +
      (stale.length ? '<section class="stack tight">' + sectionHead('Never checked in', '<span class="pill warn">' + stale.length + '</span>', 'h3') +
        '<p class="small muted" style="margin-top:-6px">These bookings are in the past. Tap one to change the time or cancel it.</p><div class="list">' + stale.map(function (t) {
          return '<div class="li link" data-act="core.go" data-view="client.truck" data-p-id="' + h(t.id) + '"><div class="grow" style="' + WRAP + '"><b>' + h(truckTitle(t) + (t.truckNo ? ' · ' + App.kindLabel(t) : '')) + '</b>' +
            '<span>' + h(['Was booked for ' + App.fmt.dayTime(t.apptAt), refsLine(t), plural(App.truckPallets(t), 'pallet')].filter(Boolean).join(' · ')) + '</span></div><span class="pill warn">Late</span></div>';
        }).join('') + '</div></section>' : '') +
      (done.length ? '<section class="stack tight">' + sectionHead('Recently done', '<button type="button" class="linkbtn small"' + LINK + ' data-act="core.go" data-view="client.history">All loads</button>') +
        '<div class="list">' + done.map(doneRow).join('') + '</div></section>' : '') +
      '<p class="center small muted">Questions? Call the dock: <b class="num">' + h(st.phone) + '</b></p></div>';
    return screen(c.name, { sub: '24 HR Crossdock · Home' }, html, 'client.home');
  }

  /* ================= book (new and edit) ================= */
  function bookFormName(id) { return id ? 'book:' + id : 'book:new:' + cid(); }
  function blankBook(c) {
    return { dock: (c && c.dock) || 'reno', kind: 'drop', date: App.localDate(), time: '', carrier: '', truckNo: '', trailerNo: '', driverName: '', driverCell: '',
      driverLang: 'en', tracking: 'link', trackUrl: '', loads: [], loadOrder: false, notes: '', bookedBy: me() };
  }
  /* edit form from a truck. _orig remembers what the booking looked like when the form opened, so saving
     only writes the boxes this person changed (and never undoes what the office or driver changed meanwhile). */
  function formFromTruck(t) {
    var ms = t.apptAt ? Date.parse(t.apptAt) : App.now();
    var f = { dock: t.dock || 'reno', kind: t.kind || 'drop', date: App.localDate(ms), time: t.apptAt ? App.localTime(ms) : '',
      carrier: t.carrier || '', truckNo: t.truckNo || '', trailerNo: t.trailerNo || '', driverName: t.driverName || '', driverCell: t.driverCell || '',
      driverLang: t.driverLang || 'en', tracking: t.tracking || 'none', trackUrl: t.trackUrl || '',
      loads: (t.loads || []).map(function (l, i) { return Object.assign({}, l, { id: l.id || 'lx' + (i + 1) }); }),
      loadOrder: !!t.loadOrder, notes: t.notes || '', bookedBy: me() };
    f._orig = bookFields(f);
    return f;
  }
  /* the truck fields a booking form produces (same shape for new bookings and edits) */
  function bookFields(f) {
    var loads = (f.loads || []).filter(function (l) { return num(l.pallets) > 0 || trim(l.ref); }).map(cleanLoad);
    var tracking = f.tracking || 'none';
    return { dock: f.dock || 'reno', kind: f.kind || 'drop', apptAt: f.date && f.time ? App.toIso(f.date, f.time) : null, carrier: trim(f.carrier), truckNo: trim(f.truckNo), trailerNo: trim(f.trailerNo),
      driverName: trim(f.driverName), driverCell: trim(f.driverCell), driverLang: f.driverLang || 'en', tracking: tracking,
      trackUrl: tracking === 'samsara' || tracking === 'gps' ? trim(f.trackUrl) : '', loads: loads, loadOrder: !!(f.loadOrder && loads.length > 1), notes: trim(f.notes) };
  }
  function sameVal(a, b) { return JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b); }
  function validateBook(f) {
    var e = {};
    if (!f.date || !f.time) e.when = 'Pick a date and a time.';
    if (!trim(f.carrier) && !trim(f.driverName)) e.who = 'Add the carrier or the driver’s name.';
    if (!(f.loads || []).some(function (l) { return num(l.pallets) > 0; })) e.loads = 'Add at least one load with pallets.';
    if ((f.tracking === 'samsara' || f.tracking === 'gps') && trim(f.trackUrl) && !safeUrl(f.trackUrl)) e.trackUrl = 'Paste the whole link. It starts with https://';
    return e;
  }
  function sec(n, title, inner, hint) {
    return '<section class="card stack"><div class="row nowrap"><span class="pill accent">' + n + '</span><h3>' + h(title) + '</h3></div>' +
      (hint ? '<p class="small muted" style="margin-top:-6px">' + h(hint) + '</p>' : '') + inner + '</section>';
  }
  function hr12(x) { x = ((x % 24) + 24) % 24; return { n: (x % 12) || 12, ap: x < 12 ? 'AM' : 'PM' }; }
  function blockLabel(b) {
    var a = hr12(2 * b), z = hr12(2 * b + 2);
    return a.ap === z.ap ? a.n + '–' + z.n + ' ' + z.ap : a.n + ' ' + a.ap + '–' + z.n + ' ' + z.ap;
  }
  /* how busy the picked day is at the picked dock: other trucks per 2-hour block, no company names */
  function busyHtml(f, editingId) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date || '')) return '';
    var st = App.settings(), dock = f.dock || 'reno', dk = st.docks[dock] || {}, doors = Number(dk.doors) || 4, hrs = dockHours();
    var counts = {}, total = 0;
    App.list('trucks', function (t) {
      return t.id !== editingId && t.status !== 'cancelled' && (t.dock || 'reno') === dock && t.apptAt && App.localDate(Date.parse(t.apptAt)) === f.date;
    }).forEach(function (t) { var b = Math.floor(new Date(t.apptAt).getHours() / 2); counts[b] = (counts[b] || 0) + 1; total++; });
    var first = Math.floor(hrs.open / 2), last = Math.ceil(hrs.close / 2) - 1, rows = [], b;
    for (b = first; b <= last; b++) rows.push(b);
    var mine = /^\d{1,2}:\d{2}/.test(f.time || '') ? Math.floor(Number(f.time.split(':')[0]) / 2) : null;
    Object.keys(counts).forEach(function (k) { if (rows.indexOf(Number(k)) < 0) rows.push(Number(k)); });
    if (mine !== null && rows.indexOf(mine) < 0) rows.push(mine);
    rows.sort(function (x, y) { return x - y; });
    var cap = Math.max(2, doors * 2), max = 0;
    rows.forEach(function (r) { max = Math.max(max, counts[r] || 0); });
    var scale = Math.max(cap, max), word = !total ? 'Wide open' : max / cap >= 0.85 ? 'Busy day' : max / cap >= 0.5 ? 'Steady day' : 'Light day';
    var crew = (st.crew || []).length, dayIso = App.toIso(f.date, '12:00'), dw = dayOnly(dayIso);
    var list = rows.map(function (r) {
      var n = counts[r] || 0, pct = n ? Math.max(6, Math.round(n / scale * 100)) : 0, ratio = n / cap, isMine = r === mine;
      var tone = ratio >= 0.85 ? 'bad' : ratio >= 0.5 ? 'warn' : 'good';
      return '<div class="row nowrap' + (isMine ? ' bold' : '') + '" style="gap:8px"><span class="small' + (isMine ? ' info-t' : '') + '" style="width:96px;flex:none">' +
        h(blockLabel(r)) + (isMine ? ' &#9664;' : '') + '</span><div class="progress ' + tone + '" style="flex:1;min-width:0"><i style="width:' + pct + '%"></i></div>' +
        '<span class="small right' + (n ? '' : ' faint') + '" style="width:62px;flex:none">' + h(n ? plural(n, 'truck') : 'None') + '</span></div>';
    }).join('');
    var mineLine = mine !== null ? '<div class="small"><b class="info-t">Your time, ' + h(App.fmt.time(App.toIso(f.date, f.time))) + ':</b> ' +
      h((counts[mine] ? plural(counts[mine], 'other truck') : 'no other trucks') + ' between ' + blockLabel(mine) + '.') + '</div>' : '';
    return '<div class="card soft stack tight" aria-live="polite"><div class="row between"><b>Busy times ' + h(dw === 'Today' || dw === 'Tomorrow' ? dw.toLowerCase() : 'on ' + dw) + '</b>' +
      '<span class="small muted">' + h(dk.name || App.dockName(dock)) + '</span></div>' +
      '<div class="small muted">' + h([word, plural(total, 'other truck') + ' booked', crew ? plural(crew, 'forklift driver') + ' on the crew' : '', plural(doors, 'door')].filter(Boolean).join(' · ')) + '</div>' +
      list + mineLine + '<div class="tiny faint">Other companies stay private. You only see how many trucks.</div></div>';
  }
  function loadsEditor(f, fn, err) {
    var loads = f.loads || [], ordered = !!f.loadOrder && loads.length > 1, n = loads.length;
    var cards = n ? loads.map(function (l, i) {
      var move = ordered ? '<button type="button" class="btn secondary" data-act="client.moveLoad" data-bf="' + h(fn) + '" data-i="' + i + '" data-dir="-1"' + (i === 0 ? ' disabled' : '') + ' aria-label="Move ' + h(l.ref || 'load') + ' up">&#9650; Up</button>' +
        '<button type="button" class="btn secondary" data-act="client.moveLoad" data-bf="' + h(fn) + '" data-i="' + i + '" data-dir="1"' + (i === n - 1 ? ' disabled' : '') + ' aria-label="Move ' + h(l.ref || 'load') + ' down">&#9660; Down</button>' : '';
      return '<div class="card flat tight stack tight"><div class="row between nowrap"><div class="row nowrap" style="min-width:0;gap:8px">' +
        (ordered ? '<span class="pill accent">' + (i + 1) + '</span>' : '') + '<b style="overflow-wrap:anywhere">' + h(l.ref || 'No reference') + '</b></div>' +
        '<button type="button" class="btn secondary" data-act="client.openLoad" data-bf="' + h(fn) + '" data-i="' + i + '" aria-label="Edit ' + h(l.ref || 'load') + '">Edit</button></div>' +
        '<div class="small muted">' + h(loadLine(l)) + '</div>' + (l.notes ? '<div class="small">' + h(l.notes) + '</div>' : '') +
        '<div class="row" style="gap:6px">' + flagPills(l) + '</div>' +
        '<div class="row between"><div class="row" style="gap:6px">' + move + '</div>' +
        '<button type="button" class="btn ghost" data-act="client.removeLoad" data-bf="' + h(fn) + '" data-i="' + i + '" aria-label="Remove ' + h(l.ref || 'load') + '">Remove</button></div></div>';
    }).join('') : '<div class="empty-state small">No loads yet. Add each PO or BOL so we can count and check every pallet.</div>';
    var pallets = loads.reduce(function (s, l) { return s + num(l.pallets); }, 0), weight = loads.reduce(function (s, l) { return s + num(l.weight); }, 0);
    return cards + errLine(err.loads) +
      '<button type="button" class="btn secondary block" data-act="client.openLoad" data-bf="' + h(fn) + '">&#65291; Add load</button>' +
      (n > 1 ? '<label class="check" style="min-height:44px"><input type="checkbox" id="bk-order" data-form="' + h(fn) + '" data-field="loadOrder" data-rerender' + (f.loadOrder ? ' checked' : '') + '> Unload/load in this order</label>' +
        (ordered ? '<p class="small muted" style="margin-top:-6px">Use Up and Down to set the order. The crew follows it.</p>' : '') : '') +
      (n ? '<div class="row between"><span class="muted">Total</span><b class="num">' + h(plural(n, 'load') + ' · ' + plural(pallets, 'pallet') + (weight ? ' · ' + App.fmt.num(weight) + ' lbs' : '')) + '</b></div>' : '');
  }
  function bookView(p) {
    var g = gate(); if (g) return g;
    var c = cust(), id = p.id || '', t = id ? myTruck(id) : null;
    if (id && !t) return notFound('Edit booking');
    if (t && t.status !== 'booked') {
      return screen('Edit booking', { back: 'client.truck', backParams: { id: id }, sub: c.name },
        '<div class="card stack"><b>' + (t.status === 'cancelled' ? 'This booking was cancelled.' : 'This truck already checked in.') + '</b>' +
        '<p class="muted">To change it now, call the dock: ' + h(App.settings().phone) + '.</p>' +
        '<button type="button" class="btn secondary" data-act="core.go" data-view="client.truck" data-p-id="' + h(id) + '">Back to the truck</button></div>', 'client.book');
    }
    var fn = bookFormName(id), f = App.form(fn, t ? formFromTruck(t) : blankBook(c));
    var err = f._tried ? validateBook(f) : {}, nErr = Object.keys(err).length, st = App.settings();
    /* the office or the driver changed this booking while the form was open */
    var others = t && f._orig ? describeChanges(f._orig, bookFields(formFromTruck(t))) : [];
    var iso = f.date && f.time ? App.toIso(f.date, f.time) : null;
    var today = App.localDate(), tmr = App.localDate(App.now() + 864e5);

    var where = '<div class="stack tight">' + App.dockKeys().map(function (k) {
      var d = st.docks[k] || {};
      return '<button type="button" class="choice' + (f.dock === k ? ' on' : '') + '" data-act="core.set" data-form="' + h(fn) + '" data-field="dock" data-value="' + h(k) + '" aria-pressed="' + (f.dock === k) + '">' +
        '<span class="ci bold" aria-hidden="true">' + h(stateAbbr(d)) + '</span><span class="ct"><b>' + h(d.name || k) + '</b><span>' + h(d.address || '') + '</span></span></button>';
    }).join('') + '</div>';

    var what = '<div class="seg" role="group" aria-label="Drop-off or pickup">' + KINDS.map(function (k) {
      return '<button type="button" class="' + (f.kind === k[0] ? 'on' : '') + '" style="' + TAP + '" data-act="core.set" data-form="' + h(fn) + '" data-field="kind" data-value="' + k[0] + '" aria-pressed="' + (f.kind === k[0]) + '">' + k[1] + '</button>';
    }).join('') + '</div><p class="small muted">' + h(KIND_HINT[f.kind] || '') + '</p>';

    var when = '<div class="chips">' +
      '<button type="button" class="chip' + (f.date === today ? ' on' : '') + '" style="' + TAP + '" data-act="core.set" data-form="' + h(fn) + '" data-field="date" data-value="' + today + '">Today</button>' +
      '<button type="button" class="chip' + (f.date === tmr ? ' on' : '') + '" style="' + TAP + '" data-act="core.set" data-form="' + h(fn) + '" data-field="date" data-value="' + tmr + '">Tomorrow</button></div>' +
      '<div class="grid2">' +
      input({ form: fn, field: 'date', id: 'bk-date', label: 'Date', type: 'date', change: true, err: err.when && !f.date ? ' ' : '' }) +
      input({ form: fn, field: 'time', id: 'bk-time', label: 'Time (any time)', type: 'time', change: true, err: err.when && !f.time ? ' ' : '' }) + '</div>' +
      errLine(err.when) +
      (iso ? '<div class="small">Arriving <b>' + h(App.fmt.dayTime(iso)) + '</b></div>' : '<div class="small muted">Type any time, like 3:17 PM. No time slots to pick from.</div>') +
      (iso && afterHours(iso) ? '<div class="banner warn small"><div><b>After-hours fee may apply.</b> ' + h(st.hours) + '</div></div>' : '') +
      (iso && Date.parse(iso) < App.now() - 5 * 60000 ? '<div class="banner warn small"><div><b>That time has already passed.</b> Check the date.</div></div>' : '') +
      busyHtml(f, id);

    var who = '<div class="grid2 collapse">' +
      input({ form: fn, field: 'carrier', id: 'bk-carrier', label: 'Carrier', placeholder: 'Trucking company', err: err.who ? ' ' : '', change: !!f._tried }) +
      input({ form: fn, field: 'driverName', id: 'bk-driver', label: 'Driver name', err: err.who ? ' ' : '', change: !!f._tried }) +
      input({ form: fn, field: 'truckNo', id: 'bk-truck', label: 'Truck #' }) +
      input({ form: fn, field: 'trailerNo', id: 'bk-trailer', label: 'Trailer #' }) +
      input({ form: fn, field: 'driverCell', id: 'bk-cell', label: 'Driver cell', type: 'tel', placeholder: '775-555-0100', hint: 'We text the driver their door number.' }) +
      '</div>' + errLine(err.who) +
      '<div class="field"><span class="flabel">Driver’s language</span><div class="chips" role="group" aria-label="Driver language">' + langCodes().map(function (code) {
        return '<button type="button" class="chip' + (f.driverLang === code ? ' on' : '') + '" style="' + TAP + '" data-act="core.set" data-form="' + h(fn) + '" data-field="driverLang" data-value="' + h(code) + '" aria-pressed="' + (f.driverLang === code) + '">' + h(langName(code)) + '</button>';
      }).join('') + '</div><span class="hint">Our check-in screen and the driver’s texts use this language.</span></div>';

    var eta = '<div class="stack tight">' + TRACK.map(function (o) {
      return '<button type="button" class="choice' + (f.tracking === o.key ? ' on' : '') + '" data-act="core.set" data-form="' + h(fn) + '" data-field="tracking" data-value="' + o.key + '" aria-pressed="' + (f.tracking === o.key) + '">' +
        '<span class="ci" aria-hidden="true">' + o.icon + '</span><span class="ct"><b>' + h(o.title) + '</b><span>' + h(o.sub) + '</span></span></button>';
    }).join('') + '</div>' +
      (f.tracking === 'samsara' || f.tracking === 'gps' ? input({ form: fn, field: 'trackUrl', id: 'bk-trackurl', type: 'url', label: (f.tracking === 'samsara' ? 'Samsara' : 'GPS') + ' share link', placeholder: 'https://…', err: err.trackUrl, hint: 'You can add it later too.', change: true }) : '') +
      (f.tracking === 'link' ? '<p class="small muted">After you book, we show the link and a Copy button.</p>' : '');

    var notes = textarea({ form: fn, field: 'notes', id: 'bk-notes', label: 'Notes for the dock (optional)', placeholder: 'Anything the crew should know', rows: 3 }) +
      input({ form: fn, field: 'bookedBy', id: 'bk-by', label: 'Your name', hint: 'Shows on the load trail.' });

    var summary = [iso ? App.fmt.dayTime(iso) : 'No time yet', App.dockName(f.dock), (KINDS.filter(function (k) { return k[0] === f.kind; })[0] || ['', ''])[1],
      plural((f.loads || []).length, 'load') + ', ' + plural((f.loads || []).reduce(function (s, l) { return s + num(l.pallets); }, 0), 'pallet')].join(' · ');

    var html = '<form class="stack loose" data-submit="client.book" data-id="' + h(id) + '" novalidate>' +
      (t ? '<div class="banner info small"><div>Changing the booking for <b>' + h(truckTitle(t)) + '</b>, check-in code <b class="mono">' + h(t.code) + '</b>. The code stays the same.</div></div>' : '') +
      (others.length ? '<div class="banner warn small" role="status"><div class="stack tight"><span><b>Someone else just changed this booking:</b> ' + h(others.join('; ')) + '.</span>' +
        '<span>When you save, we only save the boxes you changed, so their changes stay.</span>' +
        '<button type="button" class="btn secondary" style="align-self:flex-start" data-act="client.edit" data-id="' + h(id) + '">Start over with the latest</button></div></div>' : '') +
      sec(1, 'Where', where) + sec(2, 'What', what) + sec(3, 'When', when) +
      sec(4, 'Truck and driver', who, 'Fill in what you know. We need at least the carrier or the driver’s name.') +
      sec(5, 'ETA updates', eta, 'How will we know when the truck is close?') +
      sec(6, 'Loads', loadsEditor(f, fn, err), 'One line per PO or BOL.') +
      sec(7, 'Notes', notes) +
      (nErr ? '<div class="banner bad" role="alert"><div><b>Almost there.</b> Fix the ' + plural(nErr, 'item') + ' marked in red.</div></div>' : '') +
      '<div class="card soft stack tight"><span class="label">Summary</span><b>' + h(summary) + '</b></div>' +
      '<button type="submit" class="btn primary lg block">' + (t ? 'Save changes' : 'Book this truck') + '</button>' +
      (t ? '<button type="button" class="btn ghost block" data-act="core.go" data-view="client.truck" data-p-id="' + h(id) + '">Back without saving</button>' : '') +
      '</form>';
    return screen(t ? 'Edit booking' : 'Book a truck', t ? { back: 'client.truck', backParams: { id: id }, sub: c.name } : { sub: c.name }, html, 'client.book');
  }
  /* sheet: add or edit one load */
  function validateLoad(f) {
    var e = {};
    if (!trim(f.ref)) e.ref = 'Add the PO, BOL or reference number.';
    var pal = num(f.pallets);
    if (!(pal > 0)) e.pallets = 'How many pallets? 1 or more.';
    else if (Math.round(pal) !== pal) e.pallets = 'Whole pallets only, like 12.';
    if (num(f.weight) < 0) e.weight = 'Weight can’t be below zero.';
    if (num(f.pieces) < 0 || Math.round(num(f.pieces)) !== num(f.pieces)) e.pieces = 'Pieces: a whole number, or leave it blank.';
    return e;
  }
  function loadSheet(p) {
    var f = App.form('load'), err = f._tried ? validateLoad(f) : {}, editing = p.i !== '' && p.i !== undefined && p.i !== null;
    var seg = function (field, opts) {
      return '<div class="seg" role="group">' + opts.map(function (o) {
        var on = !!f[field] === o[0];
        return '<button type="button" class="' + (on ? 'on' : '') + '" style="' + TAP + '" data-act="core.set" data-form="load" data-field="' + field + '" data-value="' + o[0] + '" aria-pressed="' + on + '">' + o[1] + '</button>';
      }).join('') + '</div>';
    };
    return '<form class="stack" data-submit="client.saveLoad" data-bf="' + h(p.bf) + '" data-i="' + h(editing ? p.i : '') + '" novalidate>' +
      sheetHead(editing ? 'Edit load' : 'Add a load') +
      input({ form: 'load', field: 'ref', id: 'ld-ref', label: 'PO, BOL or reference #', placeholder: 'e.g. PO-55120', err: err.ref, change: !!f._tried }) +
      '<div class="grid2">' +
      input({ form: 'load', field: 'pallets', id: 'ld-pallets', label: 'Pallets', type: 'number', mode: 'numeric', err: err.pallets, change: !!f._tried, attrs: ' min="0" step="1"' }) +
      input({ form: 'load', field: 'weight', id: 'ld-weight', label: 'Weight (lbs)', type: 'number', mode: 'numeric', err: err.weight, change: !!f._tried, attrs: ' min="0" step="1"' }) +
      input({ form: 'load', field: 'pieces', id: 'ld-pieces', label: 'Pieces (optional)', type: 'number', mode: 'numeric', err: err.pieces, change: !!f._tried, attrs: ' min="0" step="1"' }) +
      input({ form: 'load', field: 'destination', id: 'ld-dest', label: 'Destination', placeholder: 'Where it goes' }) + '</div>' +
      '<div class="grid2"><div class="field"><span class="flabel">Can it stack?</span>' + seg('stackable', [[true, 'Yes'], [false, 'No']]) + '</div>' +
      '<div class="field"><span class="flabel">Hazmat?</span>' + seg('hazmat', [[false, 'No'], [true, 'Yes']]) + '</div></div>' +
      textarea({ form: 'load', field: 'notes', id: 'ld-notes', label: 'Notes (optional)', rows: 2, placeholder: 'e.g. Floor load these first' }) +
      '<div class="btn-row"><button type="submit" class="btn primary lg" style="flex:2 1 160px">' + (editing ? 'Save load' : 'Add this load') + '</button>' +
      '<button type="button" class="btn secondary lg" style="flex:1 1 100px" data-act="core.closeSheet">Cancel</button></div></form>';
  }

  /* ================= booked confirmation ================= */
  function driverLinkBlock(t, big) {
    var link = driverLink(t.code), inputId = 'dl-' + t.id;
    return '<div class="stack tight"><textarea class="in mono small" id="' + h(inputId) + '" readonly rows="2" style="min-height:0;resize:none" aria-label="Driver link">' + h(link) + '</textarea>' +
      '<button type="button" class="btn ' + (big ? 'primary' : 'secondary') + ' block" data-act="client.copy" data-target="' + h(inputId) + '" data-text="' + h(link) + '">Copy link</button>' +
      (t.driverCell ? '<button type="button" class="btn secondary block" data-act="client.textDriver" data-id="' + h(t.id) + '">Text the link to ' + h(t.driverName || 'the driver') + '</button>' : '') + '</div>';
  }
  function bookedView(p) {
    var g = gate(); if (g) return g;
    var t = myTruck(p.id); if (!t) return notFound('Booked');
    var d = App.settings().docks[t.dock] || {}, pick = t.kind === 'pick';
    var body = '<div class="stack loose">' +
      '<div class="stack tight center" style="align-items:center">' +
      '<span class="pill good" style="width:84px;height:84px;justify-content:center;font-size:2.6rem;padding:0" aria-hidden="true">&#10003;</span>' +
      '<h1>You’re booked</h1><p class="big">Booked for <b>' + h(App.fmt.dayTime(t.apptAt)) + '</b> at <b>' + h(App.dockName(t.dock)) + '</b></p>' +
      '<p class="small muted">' + h(d.address || '') + '</p></div>' +
      '<div class="card stack tight center"><span class="label">Check-in code</span><div class="mono bold" style="font-size:3.2rem;line-height:1.1">' + h(t.code) + '</div>' +
      '<p class="small muted">Your driver types this code at our check-in screen.</p></div>' +
      '<div class="card stack"><h3>Driver ETA link</h3><p class="small">Send this to your driver. They tap it to tell us when they are close, and it shows their door number. No app needed.</p>' +
      driverLinkBlock(t, t.tracking === 'link') + '</div>' +
      '<div class="card stack"><h3>What happens next</h3><ol class="stack tight" style="margin:0;padding-left:22px">' +
      '<li>Your driver checks in at our kiosk with code <b class="mono">' + h(t.code) + '</b>.</li>' +
      '<li>We’ll text you when ' + (pick ? 'loading' : 'unloading') + ' starts.</li>' +
      '<li>You get ' + (pick ? 'photos of the loaded, secured trailer' : 'photos and pallet counts') + ' when it’s done.</li></ol></div>' +
      '<div class="stack tight"><button type="button" class="btn primary lg block" data-act="core.go" data-view="client.truck" data-p-id="' + h(t.id) + '">See this truck</button>' +
      '<button type="button" class="btn secondary lg block" data-act="core.go" data-view="client.book">Book another truck</button></div></div>';
    return screen('Booked', { back: 'client.home', sub: cust().name }, body, 'client.book');
  }
  function driverLinkSheet(p) {
    var t = myTruck(p.id); if (!t) return sheetHead('Driver link') + '<p class="muted">We can’t find that truck.</p>';
    return '<div class="stack">' + sheetHead('Driver link') +
      '<p>Send this to <b>' + h(t.driverName || 'your driver') + '</b>. One tap tells us when they’re close, and it shows their door number once they check in.</p>' +
      driverLinkBlock(t, true) +
      '<p class="small muted">Check-in code: <b class="mono">' + h(t.code) + '</b></p></div>';
  }

  /* ================= truck detail (live truck card) ================= */
  function damageSection(t) {
    var dm = App.sortByTime(App.list('damage', function (d) { return d.truckId === t.id && d.customerId === cid(); }), 'at', 'desc');
    if (!dm.length) return '';
    return '<section class="stack">' + sectionHead('Damage', '<span class="pill ' + (dm.some(function (d) { return d.status === 'waiting'; }) ? 'bad' : '') + '">' + plural(dm.length, 'report') + '</span>', 'h3') + dm.map(function (d) { return damageCard(d, 'truck'); }).join('') + '</section>';
  }
  function doneCard(t) {
    var photos = t.photos || [], counts = t.counts || {}, loads = t.loads || [], pick = t.kind === 'pick';
    var counted = loads.filter(function (l) { return counts[l.id] !== undefined && counts[l.id] !== null && counts[l.id] !== ''; });
    if (!photos.length && !counted.length && t.status !== 'done') return '';
    var rows = counted.map(function (l) {
      var c = num(counts[l.id]), e = num(l.pallets), ok = c === e;
      return '<div class="row between"><span>' + h(l.ref || 'Load') + '</span><b class="' + (ok ? 'good-t' : 'warn-t') + '">' + (ok ? '&#10003; ' : '') + h(c + ' of ' + e + ' pallets') + '</b></div>';
    }).join('');
    return '<section class="card stack"><h3>' + (pick ? 'Loaded: count and photos' : 'Unloaded: count and photos') + '</h3>' + rows +
      (t.countNote ? '<p class="small"><b>Crew note:</b> ' + h(t.countNote) + '</p>' : '') +
      (photos.length ? thumbs(photos, pick ? 'Loaded trailer' : 'Pallets staged') : '<p class="small muted">No photos yet.</p>') + '</section>';
  }
  function secureCard(t) {
    var s = t.secure; if (!s) return '';
    var g = s.gear || {}, conf = Math.max(0, Math.min(5, Number(s.confidence) || 0)), tone = conf >= 4 ? 'good' : conf === 3 ? 'warn' : 'bad', bars = '', i;
    for (i = 1; i <= 5; i++) bars += '<div class="progress ' + (i <= conf ? tone : '') + '" style="flex:1;height:12px"><i style="width:' + (i <= conf ? 100 : 0) + '%"></i></div>';
    var rows = GEAR.filter(function (x) { return g[x[0]] && num(g[x[0]].qty) > 0; }).map(function (x) {
      return '<tr><td>' + h(x[1]) + '</td><td class="num">' + h(g[x[0]].qty) + '</td><td>' + (g[x[0]].owner === 'driver' ? 'Driver’s' : 'Ours (24 HR)') + '</td></tr>';
    }).join('');
    var pics = '<div class="thumbs">' + SEC_PHOTOS.map(function (x) {
      var ref = s.photos && s.photos[x[0]];
      return '<div class="stack tight">' + (ref ? '<button type="button" class="linkbtn" style="display:block;width:100%" data-act="core.sheet" data-view="client.photo" data-p-ref="' + h(ref) + '" data-p-label="' + h(x[1]) + '" aria-label="Open ' + h(x[1]) + '">' + App.photoTag(ref, x[1]) + '</button>' : '<span class="thumb empty">No photo</span>') +
        '<span class="tiny muted center">' + h(x[1]) + '</span></div>';
    }).join('') + '</div>';
    return '<section class="card stack good"><div class="row between"><h3>Securement report</h3>' + (s.seal ? dpill('info mono', 'Seal ' + s.seal) : '') + '</div>' +
      '<div class="stack tight"><div class="row between"><span class="label">How safe is it?</span><b class="' + tone + '-t">' + h(conf + ' of 5 · ' + (CONF[conf] || '')) + '</b></div>' +
      '<div class="row nowrap" style="gap:4px" role="img" aria-label="' + h('Confidence ' + conf + ' of 5') + '">' + bars + '</div></div>' +
      (rows ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Gear</th><th>Qty</th><th>Whose</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '') +
      ((s.tags || []).length ? '<div class="stack tight"><span class="label">Tag numbers on our gear</span><div class="chips">' + s.tags.map(function (x) { return dpill('info mono', x); }).join('') + '</div></div>' : '') +
      pics + (s.note ? '<p class="small"><b>Crew note:</b> ' + h(s.note) + '</p>' : '') +
      '<p class="small muted">Signed by <b>' + h(s.signedBy || 'crew') + '</b>' + (s.signature ? ' (“' + h(s.signature) + '”)' : '') +
      (s.signedAt ? ' · ' + h(App.fmt.dayTime(s.signedAt)) : '') + (s.checkedRows ? ' · checked every row is tight' : '') + '</p></section>';
  }
  function loadsCard(t) {
    var loads = t.loads || [];
    if (!loads.length) return '';
    return '<section class="stack tight">' + sectionHead('Loads', '<span class="small muted">' + h(plural(loads.length, 'load') + ' · ' + plural(App.truckPallets(t), 'pallet') + (App.truckWeight(t) ? ' · ' + App.fmt.num(App.truckWeight(t)) + ' lbs' : '')) + '</span>', 'h3') +
      '<div class="list">' + loads.map(function (l, i) {
        return '<div class="li">' + (t.loadOrder ? '<span class="pill accent">' + (i + 1) + '</span>' : '') +
          '<div class="grow"><b>' + h(l.ref || 'No reference') + '</b><span>' + h(loadLine(l)) + '</span>' + (l.notes ? '<span>' + h(l.notes) + '</span>' : '') + '</div>' +
          '<div class="stack tight" style="align-items:flex-end">' + flagPills(l) + '</div></div>';
      }).join('') + '</div>' + (t.loadOrder && loads.length > 1 ? '<p class="small muted">The crew works these in this order.</p>' : '') + '</section>';
  }
  function driverCard(t) {
    var rows = [['Carrier', t.carrier], ['Truck #', t.truckNo], ['Trailer #', t.trailerNo], ['Driver', t.driverName], ['Driver cell', t.driverCell],
      ['Language', langName(t.driverLang)], ['ETA updates', trackInfo(t.tracking).title], ['Check-in code', t.code]];
    if (t.checkedInAt) rows.push(['Checked in', App.fmt.dayTime(t.checkedInAt) + (t.checkedInBy === 'office' ? ' (by our office)' : ' (at the kiosk)')]);
    if (t.walkInCompany) rows.push(['Company (walk-in)', t.walkInCompany]);
    return '<section class="card stack"><h3>Truck and driver</h3><dl class="kv">' + rows.filter(function (r) { return trim(r[1]); }).map(function (r) {
      return '<dt>' + h(r[0]) + '</dt><dd>' + h(r[1]) + '</dd>';
    }).join('') + '</dl>' + (safeUrl(t.trackUrl) ? '<a class="small" href="' + h(safeUrl(t.trackUrl)) + '" target="_blank" rel="noopener noreferrer">Open the live map</a>' : '') + '</section>';
  }
  function trailCard(t) {
    var hist = App.sortByTime((t.history || []).slice(), 'at', 'asc');
    if (!hist.length) return '';
    return '<section class="card stack"><h3>Load trail</h3><div class="timeline">' + hist.map(function (x) {
      var s = String(x.text || '');
      var tone = /approved|done|secured/i.test(s) ? 'good' : /damage|declin/i.test(s) ? 'bad' : /started|checked in/i.test(s) ? 'accent' : /cancel|late/i.test(s) ? 'warn' : '';
      return '<div class="tl ' + tone + '"><div class="tt">' + h(App.fmt.time(x.at)) + (App.isToday(x.at) ? '' : '<br><span class="tiny">' + h(shortDate(x.at)) + '</span>') + '</div>' +
        '<div class="td"></div><div><div>' + h(s) + '</div>' + (x.by && s.indexOf(x.by) < 0 ? '<div class="tiny muted">' + h(x.by) + '</div>' : '') + '</div></div>';
    }).join('') + '</div></section>';
  }
  function truckView(p) {
    var g = gate(); if (g) return g;
    var t = myTruck(p.id); if (!t) return notFound('Truck');
    var parts = [];
    parts.push('<div class="card stack"><div class="row between nowrap"><div style="min-width:0"><h2>' + h(App.kindLabel(t)) + '</h2>' +
      '<div class="small muted" style="' + WRAP + '">' + h([refsLine(t), t.apptAt ? 'booked for ' + App.fmt.dayTime(t.apptAt) : (t.walkIn || t.createdBy === 'kiosk' ? 'walk-in, no booking' : '')].filter(Boolean).join(' · ')) + '</div></div>' + App.statusPill(t) + '</div>' +
      (t.status === 'cancelled' ? '' : App.stepsHtml(t)) + '</div>');
    parts.push(liveCard(t));
    parts.push(damageSection(t));
    parts.push(doneCard(t));
    parts.push(secureCard(t));
    parts.push(loadsCard(t));
    if ((t.paperwork || []).length) parts.push('<section class="card stack"><h3>Paperwork scans</h3>' + thumbs(t.paperwork, 'Paperwork page') + '</section>');
    parts.push(driverCard(t));
    if (trim(t.notes)) parts.push('<section class="card stack tight"><h3>Notes</h3><p>' + h(t.notes) + '</p></section>');
    parts.push(trailCard(t));
    if (t.status === 'booked') {
      parts.push('<section class="card soft stack"><h3>Need to change something?</h3><p class="small muted">You can change or cancel until the truck checks in.</p>' +
        '<div class="btn-row"><button type="button" class="btn secondary" data-act="client.edit" data-id="' + h(t.id) + '">Edit booking</button>' +
        App.confirmBtn('cancel-' + t.id, 'Cancel truck', 'client.cancel', { 'data-id': t.id }, 'danger') + '</div></section>');
    }
    var fromLoads = p.from === 'history';
    return screen(truckTitle(t), { back: fromLoads ? 'client.history' : true, sub: App.dockName(t.dock) + ' · code ' + t.code }, '<div class="stack loose">' + parts.join('') + '</div>', fromLoads ? 'client.history' : 'client.home');
  }
  function etaSheet(p) {
    var t = myTruck(p.id); if (!t) return sheetHead('Update ETA') + '<p class="muted">We can’t find that truck.</p>';
    var fn = 'eta:' + t.id, f = App.form(fn), bad = f._tried && (!f.date || !f.time);
    var quick = [[30, 'In 30 min'], [60, 'In 1 hour'], [120, 'In 2 hours'], [240, 'In 4 hours']];
    return '<form class="stack" data-submit="client.saveEta" data-id="' + h(t.id) + '" novalidate>' + sheetHead('Update ETA') +
      '<p class="small muted">When will ' + h(truckTitle(t).toLowerCase() === App.kindLabel(t).toLowerCase() ? 'the truck' : truckTitle(t)) + ' get to ' + h(App.dockName(t.dock)) + '?' + (t.apptAt ? ' Appointment: ' + h(App.fmt.dayTime(t.apptAt)) + '.' : '') + '</p>' +
      '<div class="chips">' + quick.map(function (q) { return '<button type="button" class="chip" style="' + TAP + '" data-act="client.etaQuick" data-id="' + h(t.id) + '" data-min="' + q[0] + '">' + q[1] + '</button>'; }).join('') + '</div>' +
      '<div class="grid2">' + input({ form: fn, field: 'date', id: 'eta-date', label: 'Date', type: 'date', err: bad && !f.date ? ' ' : '' }) +
      input({ form: fn, field: 'time', id: 'eta-time', label: 'Time', type: 'time', err: bad && !f.time ? ' ' : '' }) + '</div>' + errLine(bad ? 'Pick a date and a time.' : '') +
      input({ form: fn, field: 'note', id: 'eta-note', label: 'Note (optional)', placeholder: 'e.g. Traffic on I-80' }) +
      '<div class="btn-row"><button type="submit" class="btn primary lg">Save ETA</button><button type="button" class="btn secondary lg" data-act="core.closeSheet">Cancel</button></div></form>';
  }
  function photoSheet(p) {
    var url = App.photoUrl(p.ref);
    return '<div class="stack">' + sheetHead(p.label || 'Photo') +
      (url ? '<img src="' + h(url) + '" alt="' + h(p.label || 'Photo') + '" style="width:100%;height:auto;border-radius:8px;display:block">' : '<div class="empty-state">This photo is not available.</div>') + '</div>';
  }

  /* ================= damage detail ================= */
  function damageView(p) {
    var g = gate(); if (g) return g;
    var d = myDamage(p.id); if (!d) return notFound('Damage');
    var t = App.get('trucks', d.truckId), total = App.damageTotal(d);
    var back = p.from === 'log' ? { back: 'client.damagelog' } : p.from !== 'home' && t ? { back: 'client.truck', backParams: { id: t.id } } : { back: true };
    back.sub = (d.ref || 'Damage report') + (t ? ' · ' + truckTitle(t) : '');
    var photos = d.photos || [];
    var lines = (d.fixLines || []).map(function (l) {
      return '<tr><td style="' + WRAP + '">' + h(l.label) + '</td><td class="right num">' + h(l.qty + ' × ' + money(l.rate)) + '</td><td class="right num">' + h(money(num(l.qty) * num(l.rate))) + '</td></tr>';
    }).join('');
    var body = '<div class="stack loose">' +
      '<div class="card stack' + (d.status === 'waiting' ? ' bad' : '') + '"><div class="row between"><h2 style="min-width:0;' + WRAP + '">Damage on ' + h(d.ref || 'a load') + '</h2>' + dmgPill(d) + '</div>' +
      '<div class="small muted">Found by ' + h(d.by || 'our crew') + ' · ' + h(App.fmt.dayTime(d.at)) + '</div>' +
      ((d.kinds || []).length ? '<div class="chips">' + d.kinds.map(function (k) { return dpill('warn', k); }).join('') + '</div>' : '') +
      (d.what ? '<p>' + h(d.what) + '</p>' : '') +
      '<dl class="kv"><dt>Pallets hurt</dt><dd>' + h(num(d.pallets)) + '</dd><dt>Load</dt><dd>' + h(d.ref || '') + '</dd>' +
      (t ? '<dt>Truck</dt><dd>' + h(truckTitle(t) + ' · ' + App.dockName(t.dock)) + '</dd>' : '') + '</dl></div>' +
      '<section class="stack tight">' + sectionHead('Photos', '<span class="small muted">' + plural(photos.length, 'photo') + '</span>', 'h3') +
      (photos.length ? '<div class="stack">' + photos.map(function (r, i) {
        var lab = i === 0 ? 'Wide shot' : i === 1 ? 'Close-up' : 'Photo ' + (i + 1);
        return '<button type="button" class="linkbtn" style="display:block;width:100%" data-act="core.sheet" data-view="client.photo" data-p-ref="' + h(r) + '" data-p-label="' + h(lab) + '" aria-label="Open ' + h(lab) + '">' +
          (App.photoUrl(r) ? '<img src="' + h(App.photoUrl(r)) + '" alt="' + h(lab) + '" style="width:100%;height:auto;border-radius:8px;display:block">' : App.photoTag(r, lab)) + '</button>';
      }).join('') + '</div>' : '<div class="empty-state small">No photos on file for this report.</div>') + '</section>' +
      '<section class="stack tight">' + sectionHead('Fix price', '', 'h3') +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fix</th><th class="right">Qty × rate</th><th class="right">Amount</th></tr></thead><tbody>' +
      (lines || '<tr><td colspan="3" class="muted">No fix needed.</td></tr>') +
      '<tr><td colspan="2"><b>Total</b></td><td class="right"><b class="num">' + h(money(total)) + '</b></td></tr></tbody></table></div></section>' +
      '<section class="card stack">' + (d.status === 'waiting' ? '<h3>Should we fix it?</h3><p class="small muted">Approve and we fix it right away, then send you photos. Decline and we leave it as it is and note it on the load.</p>' : '<h3>Your answer</h3>') +
      decideBlock(d, true) + '</section>' +
      (t ? '<button type="button" class="btn secondary block" data-act="core.go" data-view="client.truck" data-p-id="' + h(t.id) + '">See the whole truck</button>' : '') + '</div>';
    return screen('Damage report', back, body, p.from === 'log' ? 'client.history' : 'client.home');
  }

  /* ================= damage history (monthly, not claims) ================= */
  function damageLogView() {
    var g = gate(); if (g) return g;
    var list = App.sortByTime(App.list('damage', function (d) { return d.customerId === cid(); }), 'at', 'desc');
    var months = {}, order = [];
    list.forEach(function (d) {
      var dt = new Date(d.at || App.now()), k = dt.getFullYear() + '-' + pad2(dt.getMonth() + 1);
      if (!months[k]) { months[k] = []; order.push(k); }
      months[k].push(d);
    });
    var cards = order.map(function (k) {
      var ds = months[k], y = Number(k.slice(0, 4)), m = Number(k.slice(5)) - 1;
      var pallets = ds.reduce(function (s, d) { return s + num(d.pallets); }, 0);
      var approved = ds.filter(function (d) { return d.status === 'approved' || d.status === 'auto'; }).reduce(function (s, d) { return s + App.damageTotal(d); }, 0);
      var waitingN = ds.filter(function (d) { return d.status === 'waiting'; }).length;
      return '<section class="card stack"><div class="row between"><h3>' + h(MONTHS[m] + ' ' + y) + '</h3>' + (waitingN ? '<span class="pill bad">' + waitingN + ' waiting</span>' : '') + '</div>' +
        '<div class="grid3" style="grid-template-columns:repeat(3,minmax(0,1fr))">' + stat(String(ds.length), ds.length === 1 ? 'report' : 'reports', '', '', '1.4rem') +
        stat(String(pallets), 'pallets hurt', '', '', '1.4rem') + stat('$' + Math.round(approved).toLocaleString('en-US'), 'approved', '', '', '1.4rem') + '</div>' +
        '<div class="list">' + ds.map(function (d) {
          return '<div class="li link" data-act="core.go" data-view="client.damage" data-p-id="' + h(d.id) + '" data-p-from="log"><div class="grow"><b>' + h(d.ref || 'Load') + '</b>' +
            '<span>' + h([App.fmt.date(d.at), plural(num(d.pallets), 'pallet'), (d.kinds || []).join(', ')].filter(Boolean).join(' · ')) + '</span></div>' +
            '<div class="stack tight" style="align-items:flex-end">' + dmgPill(d) + '<span class="small bold num">' + h(money(App.damageTotal(d))) + '</span></div></div>';
        }).join('') + '</div></section>';
    }).join('');
    var body = '<div class="stack loose"><p class="muted">Every damage report we made on your loads, by month. This is our record of what we found and fixed. It is not an insurance claim.</p>' +
      (cards || '<div class="empty-state">No damage reports. Every load came in and went out in good shape.</div>') + '</div>';
    return screen('Damage history', { back: 'client.history', sub: cust().name }, body, 'client.history');
  }

  /* ================= loads (history per load) ================= */
  function historyView() {
    var g = gate(); if (g) return g;
    var fn = 'hist:' + cid(), f = App.form(fn, { q: '' }), q = trim(f.q).toLowerCase();
    var dmg = App.list('damage', function (d) { return d.customerId === cid(); });
    var rows = [];
    App.trucksFor(cid()).forEach(function (t) {
      (t.loads || []).forEach(function (l) {
        rows.push({ t: t, l: l, at: t.doneAt || t.apptAt || t.createdAt,
          dmg: dmg.some(function (d) { return d.truckId === t.id && ((l.id && d.loadId === l.id) || (l.ref && d.ref === l.ref)); }) });
      });
    });
    rows.sort(function (a, b) { return (Date.parse(b.at || '') || 0) - (Date.parse(a.at || '') || 0); });
    var shown = q ? rows.filter(function (r) { return [r.l.ref, r.l.destination, r.t.truckNo, r.t.code].join(' ').toLowerCase().indexOf(q) >= 0; }) : rows;
    var list = shown.length ? '<div class="list">' + shown.map(function (r) {
      return '<div class="li link" data-act="core.go" data-view="client.truck" data-p-id="' + h(r.t.id) + '" data-p-from="history"><div class="grow" style="' + WRAP + '"><b>' + h(r.l.ref || 'No reference') + '</b>' +
        '<span>' + h([dayOnly(r.at), plural(num(r.l.pallets), 'pallet'), App.dockName(r.t.dock), App.kindLabel(r.t)].join(' · ')) + '</span></div>' +
        '<div class="stack tight" style="align-items:flex-end">' + App.statusPill(r.t) + (r.dmg ? '<span class="pill bad">Damage</span>' : '') + '</div></div>';
    }).join('') + '</div>' : (q ? '<div class="empty-state">No loads match “' + h(f.q) + '”. Check the number and try again.</div>' :
      '<div class="empty-state stack" style="align-items:center"><b>No loads yet.</b><span>Your loads show here, one line per PO or BOL.</span><button type="button" class="btn secondary" data-act="core.go" data-view="client.book">Book a truck</button></div>');
    var body = '<div class="stack">' +
      '<div class="field"><label for="hist-q">Search by PO, BOL or reference #</label><input type="search" id="hist-q" data-form="' + h(fn) + '" data-field="q" data-rerender value="' + App.val(fn, 'q') + '" placeholder="e.g. PO-55120" autocomplete="off"></div>' +
      '<div class="row between"><span class="small muted">' + h(q ? plural(shown.length, 'match', 'matches') + ' of ' + plural(rows.length, 'load') : plural(rows.length, 'load') + ', newest first') + '</span>' +
      '<button type="button" class="btn secondary" data-act="core.go" data-view="client.damagelog">Damage history &rarr;</button></div>' +
      list + '</div>';
    return screen('Loads', { sub: cust().name }, body, 'client.history');
  }

  /* ================= gear on loan ================= */
  function gearView() {
    var g = gate(); if (g) return g;
    var c = cust(), out = App.gearOut(c.id), totalOut = out.plywood + out.bars + out.straps + out.airbags;
    var ledger = App.sortByTime(App.list('gear', function (x) { return x.customerId === c.id; }), 'at', 'desc');
    var stats = '<div class="grid4">' + GEAR.map(function (x) { return stat(String(out[x[0]] || 0), x[1], out[x[0]] ? 'warn' : '', '', '1.8rem'); }).join('') + '</div>';
    var rows = ledger.length ? '<div class="list">' + ledger.map(function (x) {
      var t = x.truckId ? myTruck(x.truckId) : null, info = GEAR.filter(function (y) { return y[0] === x.type; })[0] || [x.type, x.type, x.type];
      var attrs = t ? ' link" data-act="core.go" data-view="client.truck" data-p-id="' + h(t.id) + '"' : '"';
      return '<div class="li' + attrs + '><span class="pill ' + (x.dir === 'back' ? 'good' : 'warn') + '">' + (x.dir === 'back' ? 'Back' : 'Out') + '</span>' +
        '<div class="grow"><b>' + h(plural(num(x.qty), info[2]) + (x.dir === 'back' ? ' came back' : ' went out')) + '</b>' +
        '<span>' + h([App.fmt.date(x.at), t ? (t.truckNo ? 'with truck ' + t.truckNo : 'with code ' + t.code) : '', (x.tags || []).join(', '), x.note].filter(Boolean).join(' · ')) + '</span></div></div>';
    }).join('') + '</div>' : '<div class="empty-state small">No gear has gone out with your trucks yet.</div>';
    var plan = '<section class="card accent stack"><div class="row between"><h3>Securement plan</h3><span class="pill accent">Coming soon</span></div>' +
      '<p>Our gear on every load for <b>$2,000 per 6 months</b>. Plywood, load bars, straps and airbags, put in by our crew, photographed and signed off on every truck.</p>' +
      (c.securementInterest ? '<div class="banner good small"><div><b>Thanks!</b> You told us you’re interested (' + h(App.fmt.date(c.securementInterest)) + '). We’ll call you.</div></div>' :
        '<button type="button" class="btn primary" data-act="client.interested">I’m interested</button>') + '</section>';
    var body = '<div class="stack loose"><div class="stack tight"><h2>Our gear with you now</h2>' +
      '<p class="small muted">Securement gear from 24 HR Crossdock that went out on your trucks. Please send it back with your next truck.</p></div>' +
      (totalOut ? stats : '<div class="banner good"><div><b>None of our gear is out with you.</b> Thanks for sending it back!</div></div>') +
      (out.tags.length ? '<div class="stack tight"><span class="label">Tag numbers still out</span><div class="chips">' + out.tags.map(function (x) { return dpill('info mono', x); }).join('') + '</div></div>' : '') +
      '<section class="stack tight">' + sectionHead('Gear history', '', 'h3') + rows + '</section>' + plan + '</div>';
    return screen('Gear', { sub: c.name }, body, 'client.gear');
  }

  /* ================= alerts ================= */
  function normContact(p) {
    var a = {}, src = (p && p.alerts) || {};
    App.EVENTS.forEach(function (e) { var x = src[e.key] || {}; a[e.key] = { text: !!x.text, email: !!x.email }; });
    return Object.assign({}, p || {}, { name: trim(p && p.name), role: trim(p && p.role), phone: trim(p && p.phone), email: trim(p && p.email), alerts: a });
  }
  function newContact() {
    var on = { booked: [0, 1], arrived: [1, 0], started: [1, 0], damage: [1, 1], done: [1, 1], friday: [0, 1] }, a = {};
    App.EVENTS.forEach(function (e) { var x = on[e.key] || [0, 0]; a[e.key] = { text: !!x[0], email: !!x[1] }; });
    return { name: '', role: '', phone: '', email: '', alerts: a };
  }
  /* _base = what the customer record said when this draft started; Save only sends the parts that differ from it */
  function alertsInit(c) {
    var amt = num(c.autoApproveUnder);
    var f = { contacts: (c.contacts || []).map(normContact), autoMode: c.autoApproveUnder !== null && c.autoApproveUnder !== undefined && amt > 0 ? 'under' : 'never',
      autoAmt: amt > 0 ? String(c.autoApproveUnder) : '', fridaySummary: c.fridaySummary !== false };
    f._base = alertsOut(f);
    return f;
  }
  function alertsOut(f) {
    return { contacts: (f.contacts || []).map(normContact), autoApproveUnder: f.autoMode === 'under' && num(f.autoAmt) > 0 ? num(f.autoAmt) : null, fridaySummary: !!f.fridaySummary };
  }
  function alertsDirty(f) { return !sameVal(alertsOut(f), f._base || alertsOut({})); }
  function contactCard(fn, p, i) {
    var a = p.alerts || {};
    var anyText = App.EVENTS.some(function (e) { return a[e.key] && a[e.key].text; }), anyEmail = App.EVENTS.some(function (e) { return a[e.key] && a[e.key].email; });
    var cb = function (ev, ch) {
      var on = !!(a[ev.key] && a[ev.key][ch]);
      return '<label class="check" style="justify-content:center;min-height:44px;width:100%"><input type="checkbox" id="al-' + i + '-' + h(ev.key) + '-' + ch + '" data-form="' + h(fn) + '" data-field="contacts.' + i + '.alerts.' + h(ev.key) + '.' + ch + '" data-rerender' +
        (on ? ' checked' : '') + ' aria-label="' + h((ch === 'text' ? 'Text' : 'Email') + ' ' + (p.name || 'this contact') + ': ' + ev.label) + '"></label>';
    };
    var inp = function (label, key, type, ph, mode, full) {
      return input({ form: fn, field: 'contacts.' + i + '.' + key, id: 'al-' + i + '-' + key, label: label, type: type, placeholder: ph, mode: mode, change: true, wrap: full ? 'grid-column:1/-1' : '' });
    };
    return '<section class="card stack"><div class="row between"><h3>' + h(trim(p.name) || 'New contact') + '</h3>' +
      App.confirmBtn('rmc-' + i, 'Remove', 'client.removeContact', { 'data-i': i }, 'danger') + '</div>' +
      '<div class="grid2 collapse">' + inp('Name', 'name', 'text', 'Full name', '', true) + inp('Role', 'role', 'text', 'e.g. Dispatcher') +
      inp('Cell (for texts)', 'phone', 'tel', '775-555-0100') + inp('Email', 'email', 'text', 'name@company.com', 'email', true) + '</div>' +
      (anyText && !trim(p.phone) ? errLine('Add a cell number so texts can reach ' + (trim(p.name) || 'this contact') + '.') : '') +
      (anyEmail && !trim(p.email) ? errLine('Add an email so emails can reach ' + (trim(p.name) || 'this contact') + '.') : '') +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>When this happens</th><th class="center" style="width:64px">Text</th><th class="center" style="width:64px">Email</th></tr></thead><tbody>' +
      App.EVENTS.map(function (ev) { return '<tr><td>' + h(ev.label) + '</td><td class="center" style="padding:0 4px">' + cb(ev, 'text') + '</td><td class="center" style="padding:0 4px">' + cb(ev, 'email') + '</td></tr>'; }).join('') +
      '</tbody></table></div>' +
      '<div class="row" style="gap:16px"><button type="button" class="linkbtn small"' + LINK + ' data-act="client.allAlerts" data-i="' + i + '" data-on="1">Turn all on</button>' +
      '<button type="button" class="linkbtn small"' + LINK + ' data-act="client.allAlerts" data-i="' + i + '" data-on="0">Turn all off</button></div></section>';
  }
  function recentAlerts(c) {
    var labels = {};
    App.EVENTS.forEach(function (e) { labels[e.key] = e.label; });
    var rows = App.sortByTime(App.list('outbox', function (m) { return m.customerId === c.id && labels[m.event]; }), 'at', 'desc').slice(0, 5);
    if (!rows.length) return '';
    return '<section class="stack tight">' + sectionHead('Recent alerts', '', 'h3') +
      '<p class="small muted">Not sent yet: texts and emails are not connected in this prototype. This is what would go out.</p><div class="list">' + rows.map(function (m) {
        var to = (m.to || []).map(function (r) { return (r.name || 'Contact') + ' (' + (r.channels || []).join(' + ') + ')'; }).join(', ');
        var title = m.event === 'booked' && /^Booking cancelled/i.test(m.text || '') ? 'Booking cancelled' : m.event === 'booked' && /^Booking changed/i.test(m.text || '') ? 'Booking changed' : labels[m.event];
        return '<div class="li"><div class="grow" style="' + WRAP + '"><b>' + h(title) + '</b><span>' + h(m.text) + '</span><span>' + h((to || 'Nobody picked for this alert') + ' · ' + App.fmt.ago(m.at)) + '</span></div></div>';
      }).join('') + '</div></section>';
  }
  function alertsView() {
    var g = gate(); if (g) return g;
    var c = cust(), fn = 'alerts:' + c.id, f = App.form(fn, alertsInit(c)), live = alertsOut(alertsInit(c)), dirty = alertsDirty(f);
    /* Nothing typed yet and the office changed this company's settings: show the latest.
       (This only refreshes the unsaved draft on this screen. It never writes to the database.) */
    if (!dirty && !sameVal(live, f._base)) f = App.resetForm(fn, alertsInit(c));
    var elsewhere = dirty && !sameVal(live, f._base), contacts = f.contacts || [];
    var amtBad = f.autoMode === 'under' && !(num(f.autoAmt) > 0);
    var choice = function (val, title, sub) {
      return '<button type="button" class="choice' + (f.autoMode === val ? ' on' : '') + '" data-act="core.set" data-form="' + h(fn) + '" data-field="autoMode" data-value="' + val + '" aria-pressed="' + (f.autoMode === val) + '">' +
        '<span class="ct"><b>' + h(title) + '</b><span>' + h(sub) + '</span></span></button>';
    };
    var auto = '<section class="card stack"><h3>Damage fixes</h3><p class="small muted">If we find damage, we always send photos and a fix price first.</p>' +
      choice('never', 'Always ask me first', 'Nothing gets fixed until you tap Approve. (Default)') +
      choice('under', 'Auto-approve small fixes', 'Fixes under the amount you set go ahead right away. You still get the photos.') +
      (f.autoMode === 'under' ? '<div class="field' + (amtBad ? ' err' : '') + '"><label for="al-auto">Auto-approve fixes under</label><div class="row nowrap"><b class="big">$</b>' +
        '<input id="al-auto" type="number" inputmode="decimal" min="0" step="1" data-form="' + h(fn) + '" data-field="autoAmt" data-rerender value=""' + App.val(fn, 'autoAmt') + '" placeholder="50" style="max-width:160px"></div>' +
        errMsg(amtBad ? 'Type an amount, like 50. Or pick “Always ask me first”.' : '') + '</div>' : '') + '</section>';
    var friday = '<section class="card stack tight"><h3>Friday summary</h3><label class="check" style="min-height:44px"><input type="checkbox" id="al-friday" data-form="' + h(fn) + '" data-field="fridaySummary" data-rerender' + (f.fridaySummary ? ' checked' : '') + '> Email a summary every Friday</label>' +
      '<p class="small muted">Trucks, wait times, damage and gear for the week. Goes to contacts with “Friday summary” checked.</p></section>';
    /* the Save button is always there (same place, same size), so a tap never lands on a moving target */
    var save = '<div class="card tight stack tight' + (dirty ? ' accent' : '') + '" style="' + (dirty ? 'position:sticky;bottom:72px;z-index:5' : '') + '">' +
      '<div class="row between nowrap"><div style="min-width:0">' + (dirty ? '<b>Not saved yet</b><br><button type="button" class="linkbtn small"' + LINK + ' data-act="client.resetAlerts">Undo changes</button>' :
        '<span class="muted">&#10003; All changes saved</span>') + '</div>' +
      '<button type="button" class="btn primary lg" style="flex:none" data-act="client.saveAlerts">Save changes</button></div>' +
      (elsewhere ? '<p class="small warn-t bold">Someone at the dock just changed these settings too. Save keeps your version of what you changed. Undo changes shows theirs.</p>' : '') + '</div>';
    var body = '<div class="stack loose"><p class="muted">Pick who hears from us about what, by text or email.</p>' +
      contacts.map(function (p, i) { return contactCard(fn, p, i); }).join('') +
      (contacts.length ? '' : '<div class="empty-state">No contacts yet. Add the people who should hear from us.</div>') +
      '<button type="button" class="btn secondary block" data-act="client.addContact">&#65291; Add contact</button>' +
      auto + friday + save + recentAlerts(c) + '</div>';
    return screen('Alerts', { sub: c.name }, body, 'client.alerts');
  }

  /* ================= actions ================= */
  function signIn(id) {
    App.state.customerId = id;
    try { localStorage.setItem('dock24:customer', id); } catch (e) { /* storage blocked: this visit only */ }
    App.resetForm('signin', { code: '' });
    App.go('client.home');
  }
  function scrollToError() {
    setTimeout(function () {
      var el = document.querySelector('.field.err, .errmsg');
      if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center' });
    }, 80);
  }
  function quiet(p) { return p && p.catch ? p.catch(function () { /* core already showed a toast */ }) : p; }
  function cleanLoad(l) {
    return { id: l.id || App.newId('l'), ref: trim(l.ref), pallets: Math.max(0, Math.round(num(l.pallets))), weight: Math.max(0, num(l.weight)), pieces: Math.max(0, Math.round(num(l.pieces))),
      destination: trim(l.destination), stackable: !!l.stackable, hazmat: !!l.hazmat, notes: trim(l.notes) };
  }
  function describeChanges(t, n) {
    var out = [];
    if (t.apptAt !== n.apptAt) out.push('time now ' + App.fmt.dayTime(n.apptAt));
    if ((t.dock || 'reno') !== n.dock) out.push('dock now ' + App.dockName(n.dock));
    if (t.kind !== n.kind) out.push('now a ' + App.kindLabel(n).toLowerCase());
    if (JSON.stringify(t.loads || []) !== JSON.stringify(n.loads) || !!t.loadOrder !== n.loadOrder) out.push('loads updated (' + plural(n.loads.length, 'load') + ', ' + plural(App.truckPallets(n), 'pallet') + ')');
    if (['carrier', 'truckNo', 'trailerNo', 'driverName', 'driverCell', 'driverLang'].some(function (k) { return trim(t[k]) !== trim(n[k]); })) out.push('truck and driver details updated');
    if ((t.tracking || 'none') !== n.tracking || trim(t.trackUrl) !== n.trackUrl) out.push('ETA updates: ' + trackInfo(n.tracking).title.toLowerCase());
    if (trim(t.notes) !== n.notes) out.push('notes updated');
    return out;
  }
  function decide(id, approve) {
    var d = myDamage(id);
    if (!d) { App.toast('We can’t find that damage report.'); return null; }
    if (d.status !== 'waiting') { App.toast('This one is already answered.'); return null; }
    var f = App.form('dmg:' + id), note = trim(f.note), who = me(), total = money(App.damageTotal(d)), c = cust();
    var fields = { status: approve ? 'approved' : 'declined', decidedAt: App.iso(), decidedBy: who };
    if (note) fields.customerNote = note;
    var jobs = [App.patch('damage', id, fields)];
    var t = App.get('trucks', d.truckId);
    if (t) {
      jobs.push(App.logTruck(t, 'Damage fix ' + (approve ? 'approved' : 'declined') + ' by ' + who + ': ' + total + ' (' + (d.ref || 'load') + ')' + (note ? ' — “' + note + '”' : ''), who));
      App.notifyCrew(t, (c ? c.name : 'Client') + (approve ? ' approved' : ' declined') + ' the damage fix on ' + (d.ref || 'a load') + ' (' + total + ').' + (note ? ' Note: ' + note : ''));
    }
    App.resetForm('dmg:' + id, {});
    App.toast(approve ? 'Approved. We’ll fix it and send you photos.' : 'Declined. We’ll leave it and note it on the load.');
    return quiet(Promise.all(jobs));
  }

  var lastBookedAt = 0, textedAt = {};
  var actions = {
    'client.rerender': function () { App.render(); },
    'client.signin': function (el) { var id = el.getAttribute('data-id'); if (App.get('customers', id)) signIn(id); },
    'client.signinCode': function () {
      var f = App.form('signin', { code: '' }), q = trim(f.code).toUpperCase();
      var c = q ? App.list('customers', function (x) { return trim(x.code).toUpperCase() === q || trim(x.name).toUpperCase() === q; })[0] : null;
      if (!c) { f._err = q ? 'We don’t know that code. Check it with the office.' : 'Type your company code.'; App.render(); return; }
      signIn(c.id);
    },
    'client.signout': function () {
      App.state.customerId = null;
      try { localStorage.removeItem('dock24:customer'); } catch (e) { /* ignore */ }
      App.go('client.signin');
    },
    /* loads inside the booking form (form drafts only; saved with the booking) */
    'client.openLoad': function (el) {
      var bf = el.getAttribute('data-bf'), i = el.getAttribute('data-i'), b = App.form(bf), l = i !== null && i !== '' ? (b.loads || [])[Number(i)] : null;
      App.resetForm('load', l ? { id: l.id, ref: l.ref || '', pallets: l.pallets ? String(l.pallets) : '', weight: l.weight ? String(l.weight) : '', pieces: l.pieces ? String(l.pieces) : '',
        destination: l.destination || '', stackable: !!l.stackable, hazmat: !!l.hazmat, notes: l.notes || '' } : { stackable: false, hazmat: false });
      App.sheet('client.load', { bf: bf, i: l ? i : '' });
    },
    'client.saveLoad': function (el) {
      if (!App.state.sheet) return;   // second tap of a double tap: the sheet already closed
      var bf = el.getAttribute('data-bf'), i = el.getAttribute('data-i'), f = App.form('load');
      if (Object.keys(validateLoad(f)).length) { f._tried = true; App.render(); return; }
      var b = App.form(bf), loads = (b.loads || []).slice(), l = cleanLoad(f);
      if (i !== null && i !== '' && loads[Number(i)]) loads[Number(i)] = l; else loads.push(l);
      b.loads = loads;
      App.closeSheet();
    },
    'client.removeLoad': function (el) {
      var b = App.form(el.getAttribute('data-bf')), loads = (b.loads || []).slice(), i = Number(el.getAttribute('data-i'));
      var gone = loads.splice(i, 1)[0];
      b.loads = loads;
      App.toast('Removed ' + ((gone && gone.ref) || 'the load'));
    },
    'client.moveLoad': function (el) {
      var b = App.form(el.getAttribute('data-bf')), loads = (b.loads || []).slice(), i = Number(el.getAttribute('data-i')), j = i + Number(el.getAttribute('data-dir'));
      if (j < 0 || j >= loads.length) return;
      var x = loads[i]; loads[i] = loads[j]; loads[j] = x;
      b.loads = loads;
      App.render();
    },
    'client.book': function (el) {
      try {
        var id = el.getAttribute('data-id') || '', fn = bookFormName(id), f = App.form(fn), c = cust();
        if (!c) return;
        if (!id && App.now() - lastBookedAt < 2000) return;   // a double tap on "Book this truck" books once
        if (Object.keys(validateBook(f)).length) { f._tried = true; App.render(); scrollToError(); return; }
        var name = trim(f.bookedBy) || me();
        var fields = bookFields(f), loads = fields.loads;
        var pallets = App.truckPallets(fields);
        if (!id) {
          lastBookedAt = App.now();
          var tid = App.newId('t'), code = App.newCode(), now = App.iso();
          var doc = Object.assign({ customerId: c.id, code: code, status: 'booked', paperwork: [], history: [{ at: now, by: name, text: 'Booked by ' + name }], createdAt: now, createdBy: 'client' }, fields);
          var p = App.save('trucks', tid, doc);
          App.notify(c.id, 'booked', 'Booked: ' + App.kindLabel(fields).toLowerCase() + ' at ' + App.dockName(fields.dock) + ', ' + App.fmt.dayTime(fields.apptAt) + '. Check-in code ' + code + '. ' +
            plural(loads.length, 'load') + ', ' + plural(pallets, 'pallet') + '.', tid);
          App.resetForm(fn, blankBook(c));
          App.go('client.booked', { id: tid });
          return quiet(p);
        }
        var t = myTruck(id);
        if (!t || t.status !== 'booked') { App.toast(t && t.status === 'cancelled' ? 'This booking was cancelled. Book a new truck instead.' : 'This truck already checked in. Call the dock to change it.'); return; }
        /* only the boxes this person changed, and only where the truck doesn't already say the same */
        var cur = bookFields(formFromTruck(t)), orig = f._orig || cur, patch = {};
        Object.keys(fields).forEach(function (k) { if (!sameVal(fields[k], orig[k]) && !sameVal(fields[k], cur[k])) patch[k] = fields[k]; });
        var changes = describeChanges(cur, Object.assign({}, cur, patch));
        if (!Object.keys(patch).length || !changes.length) { delete App.state.forms[fn]; App.toast('Nothing changed.'); App.go('client.truck', { id: id }); return; }
        var p2 = App.logTruck(t, 'Booking changed by ' + name + ': ' + changes.join('; '), name, patch);
        App.notify(c.id, 'booked', 'Booking changed for ' + truckTitle(t) + ' (code ' + t.code + '): ' + changes.join('; ') + '.', id);
        /* new time or new dock: the driver needs to know too */
        var nt = Object.assign({}, t, patch), told = false;
        if ((patch.apptAt || patch.dock) && nt.driverCell) {
          var dk = App.settings().docks[nt.dock] || {};
          told = !!App.notifyDriver(nt, '24 HR Crossdock: your ' + App.kindLabel(nt).toLowerCase() + ' is now ' + App.fmt.dayTime(nt.apptAt) + ' at ' + App.dockName(nt.dock) +
            (dk.address ? ', ' + dk.address : '') + '. Check-in code ' + nt.code + '.');
        }
        delete App.state.forms[fn];
        App.go('client.truck', { id: id });
        App.toast(told ? 'Changes saved. Text to the driver queued.' : 'Changes saved');
        return quiet(p2);
      } catch (e) { console.warn(e); App.toast('That did not save. Try again.'); }
    },
    'client.edit': function (el) {
      var t = myTruck(el.getAttribute('data-id'));
      if (!t) return;
      App.resetForm(bookFormName(t.id), formFromTruck(t));
      App.go('client.book', { id: t.id });
    },
    'client.cancel': function (el) {
      var t = myTruck(el.getAttribute('data-id')), c = cust();
      App.state.confirm = null;
      if (!t) return;
      if (t.status === 'cancelled') { App.toast('This booking is already cancelled.'); return; }
      if (t.status !== 'booked') { App.toast('This truck already checked in. Call the dock.'); return; }
      var who = me();
      var p = App.logTruck(t, 'Cancelled by ' + who, who, { status: 'cancelled', cancelledAt: App.iso() });
      App.notify(t.customerId, 'booked', 'Booking cancelled: ' + truckTitle(t) + ', ' + App.fmt.dayTime(t.apptAt) + ' at ' + App.dockName(t.dock) + ' (code ' + t.code + ').', t.id);
      App.notifyCrew(t, 'Cancelled: ' + (c ? c.name : 'client') + ' truck for ' + App.fmt.dayTime(t.apptAt) + ' (code ' + t.code + ').');
      var told = !!App.notifyDriver(t, '24 HR Crossdock: your ' + App.kindLabel(t).toLowerCase() + ' for ' + App.fmt.dayTime(t.apptAt) + ' at ' + App.dockName(t.dock) + ' is cancelled. Please don’t come in for it.');
      App.toast(told ? 'Truck cancelled. Text to the driver queued.' : 'Truck cancelled');
      return quiet(p);
    },
    'client.copy': function (el) {
      var text = el.getAttribute('data-text') || '', target = el.getAttribute('data-target');
      function fallback() {
        var inp = target && document.getElementById(target);
        if (inp) { try { inp.focus(); inp.select(); } catch (e) { /* ignore */ } }
        App.toast('Link selected. Press Copy (or Ctrl+C) to copy it.');
      }
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          return navigator.clipboard.writeText(text).then(function () { App.toast('Link copied. Paste it in a text to your driver.'); }, fallback);
        }
      } catch (e) { /* fall through */ }
      fallback();
    },
    'client.textDriver': function (el) {
      var t = myTruck(el.getAttribute('data-id'));
      if (!t) return;
      if (!t.driverCell) { App.toast('Add the driver’s cell first.'); return; }
      if (App.now() - (textedAt[t.id] || 0) < 5000) return;   // double tap: queue the text once
      textedAt[t.id] = App.now();
      App.notifyDriver(t, '24 HR Crossdock: tap this link to send us your ETA and see your door number: ' + driverLink(t.code) + ' Your check-in code is ' + t.code + '.');
      App.toast('Text queued for ' + (t.driverName || 'the driver') + '.');
      return quiet(App.logTruck(t, 'Driver link text queued for ' + (t.driverName || 'the driver') + ' (' + t.driverCell + ')', me()));
    },
    'client.openEta': function (el) {
      var t = myTruck(el.getAttribute('data-id'));
      if (!t) return;
      var ref = App.truckEta(t), ms = ref ? Date.parse(ref) : App.now();
      App.resetForm('eta:' + t.id, { date: App.localDate(ms), time: App.localTime(ms), note: '' });
      App.sheet('client.eta', { id: t.id });
    },
    'client.etaQuick': function (el) {
      var f = App.form('eta:' + el.getAttribute('data-id')), ms = App.now() + Number(el.getAttribute('data-min')) * 60000;
      f.date = App.localDate(ms); f.time = App.localTime(ms);
      App.render();
    },
    'client.saveEta': function (el) {
      if (!App.state.sheet) return;   // second tap of a double tap: already saved
      var t = myTruck(el.getAttribute('data-id'));
      if (!t) return;
      var f = App.form('eta:' + t.id);
      if (!f.date || !f.time) { f._tried = true; App.render(); return; }
      var at = App.toIso(f.date, f.time), who = me(), note = trim(f.note);
      var p = App.logTruck(t, 'ETA updated to ' + App.fmt.dayTime(at) + ' by ' + who + (note ? ' (' + note + ')' : ''), who, { eta: { at: at, source: 'client', updatedAt: App.iso(), note: note } });
      App.notify(t.customerId, 'eta', 'ETA for ' + truckTitle(t) + ' (code ' + t.code + ') is now ' + App.fmt.dayTime(at) + '. Set by ' + who + '.' + (note ? ' Note: ' + note : ''), t.id);
      App.closeSheet();
      App.toast('ETA updated. The dock sees it now.');
      quiet(p);
    },
    'client.approve': function (el) { return decide(el.getAttribute('data-id'), true); },
    'client.decline': function (el) { return decide(el.getAttribute('data-id'), false); },
    'client.declineAsk': function (el) { App.form('dmg:' + el.getAttribute('data-id')).declining = true; App.render(); },
    'client.declineNo': function (el) { App.form('dmg:' + el.getAttribute('data-id')).declining = false; App.render(); },
    'client.addContact': function () {
      var c = cust(); if (!c) return;
      var f = App.form('alerts:' + c.id, alertsInit(c));
      f.contacts = (f.contacts || []).concat([newContact()]);
      App.render();
      setTimeout(function () { var el = document.getElementById('al-' + (f.contacts.length - 1) + '-name'); if (el) { el.focus(); if (el.scrollIntoView) el.scrollIntoView({ block: 'center' }); } }, 60);
    },
    'client.removeContact': function (el) {
      var c = cust(); if (!c) return;
      var f = App.form('alerts:' + c.id, alertsInit(c)), list = (f.contacts || []).slice();
      list.splice(Number(el.getAttribute('data-i')), 1);
      f.contacts = list;
      App.state.confirm = null;
      App.toast('Contact removed. Tap Save changes to keep it that way.');
    },
    'client.allAlerts': function (el) {
      var c = cust(); if (!c) return;
      var f = App.form('alerts:' + c.id, alertsInit(c)), p = (f.contacts || [])[Number(el.getAttribute('data-i'))], on = el.getAttribute('data-on') === '1';
      if (!p) return;
      p.alerts = p.alerts || {};
      App.EVENTS.forEach(function (e) { p.alerts[e.key] = { text: on, email: on }; });
      App.render();
    },
    'client.resetAlerts': function () {
      var c = cust(); if (!c) return;
      App.resetForm('alerts:' + c.id, alertsInit(c));
      App.render();
    },
    'client.saveAlerts': function () {
      var c = cust(); if (!c) return;
      var fn = 'alerts:' + c.id, f = App.form(fn, alertsInit(c));
      if (f.autoMode === 'under' && !(num(f.autoAmt) > 0)) { App.toast('Type an amount for auto-approve, or pick “Always ask me first”.'); return; }
      var out = alertsOut(f), base = f._base || {}, patch = {};
      out.contacts = out.contacts.filter(function (p) { return p.name || p.phone || p.email; });
      /* only what this person changed, so a change the office made to another part is kept */
      Object.keys(out).forEach(function (k) { if (!sameVal(out[k], base[k])) patch[k] = out[k]; });
      var p = Object.keys(patch).length ? App.patch('customers', c.id, patch) : null;
      App.resetForm(fn, alertsInit(App.get('customers', c.id)));
      App.toast('Saved');
      return quiet(p);
    },
    'client.interested': function () {
      var c = cust(); if (!c) return;
      var p = App.patch('customers', c.id, { securementInterest: App.iso() });
      App.toast('Thanks! We’ll call you about the securement plan.');
      return quiet(p);
    }
  };

  App.register({
    'client.signin': signinView,
    'client.home': homeView,
    'client.book': bookView,
    'client.load': loadSheet,
    'client.booked': bookedView,
    'client.truck': truckView,
    'client.eta': etaSheet,
    'client.driverlink': driverLinkSheet,
    'client.photo': photoSheet,
    'client.damage': damageView,
    'client.damagelog': damageLogView,
    'client.history': historyView,
    'client.gear': gearView,
    'client.alerts': alertsView
  }, actions);

  /* live clocks: every second, tick the "waited" / "at the door" numbers without redrawing the page */
  setInterval(function () {
    if (App.state.role !== 'client' || document.hidden) return;
    var els = document.querySelectorAll('[data-cl-since]'), now = App.now();
    for (var i = 0; i < els.length; i++) {
      var s = Date.parse(els[i].getAttribute('data-cl-since'));
      if (!isNaN(s)) els[i].textContent = liveDur(now - s);
    }
  }, 1000);
})();
