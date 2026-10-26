/* 24 HR Dock: office. The yard board for a wide office screen (also works on a phone).
   Registers every office.* view and action described in app/CONTRACT.md ("office").
   Views only read App data and form drafts. Every write happens inside an action.
   Views:  office.board, office.truck, office.book, office.booked, office.damage, office.gear,
           office.customers, office.customer, office.outbox, office.friday, office.settings
   Sheets: office.door, office.eta, office.note, office.scan, office.photo, office.damageItem,
           office.gearBack, office.fridayPreview */
(function () {
  'use strict';
  var App = window.App;
  var h = App.h;

  /* ================= constants ================= */
  var NAV = [
    ['office.board', 'Yard board'], ['office.book', 'Book'], ['office.damage', 'Damage'], ['office.gear', 'Gear'],
    ['office.customers', 'Customers'], ['office.outbox', 'Outbox'], ['office.friday', 'Friday'], ['office.settings', 'Settings']
  ];
  var SECTION = { 'office.truck': 'office.board', 'office.booked': 'office.book', 'office.customer': 'office.customers' };
  var GEAR = [['plywood', 'Plywood sheets', 'plywood sheet'], ['bars', 'Load bars', 'load bar'], ['straps', 'Straps', 'strap'], ['airbags', 'Airbags', 'airbag']];
  var SEC_PHOTOS = [['nose', 'Nose (front of trailer)'], ['middle', 'Middle'], ['tail', 'Tail (doors)'], ['closeup', 'Bars/straps close-up'], ['seal', 'Seal']];
  var CONF = ['', 'Not safe', 'Needs work', 'OK', 'Solid', 'Rock solid'];
  var LANG = { en: 'English', es: 'Spanish', ru: 'Russian', uk: 'Ukrainian', pa: 'Punjabi', hi: 'Hindi' };
  var TRACK = { link: 'Driver sends ETA from a link', samsara: 'Samsara live link', gps: 'GPS share link', self: 'Customer updates the ETA', none: 'No ETA updates' };
  var SRC = { driver: 'from the driver', client: 'from the customer', office: 'set by the office', samsara: 'from Samsara', gps: 'from GPS' };
  var DAM_ST = { waiting: ['Waiting for customer', 'warn'], approved: ['Approved', 'good'], declined: ['Declined', 'bad'], auto: ['Auto-approved', 'info'] };
  var RATES = [['rewrap', 'Rewrap a pallet', 'per pallet'], ['labor', 'Labor', 'per hour'], ['newPallet', 'New pallet', 'each'],
    ['delivery', 'Delivery', 'per trip'], ['afterHours', 'After-hours fee', 'per truck']];
  var COLLS = ['customers', 'trucks', 'damage', 'gear', 'outbox', 'photos', 'settings'];
  var TILE = 'clamp(1.5rem, 1rem + 1.25vw, 2.1rem)';  // big stat numbers: 24px on a phone, 34px on the office screen
  var PROMISE_MIN = 120;          // contract: promise kept = total time within 2 hours
  var DOCK_KEY = 'dock24:officeDock';

  var ui = { dock: null };        // remembered board filter (also in localStorage)

  /* ================= small helpers ================= */
  var TAP = 'min-height:44px';    // every tap target at least 44 px tall (gloves, phones)
  var TRACK_OPTS = [['link', 'Send the driver a link (they update the ETA)'], ['samsara', 'Samsara: paste the live share link'], ['gps', 'Other GPS app: paste the share link'],
    ['self', 'The customer updates the ETA'], ['none', 'No ETA updates']];
  function trim(v) { return v === undefined || v === null ? '' : String(v).trim(); }
  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }
  /* blank, or a number 0 or more (typed in a text box) */
  function numOk(v) { v = trim(v); return v === '' || (/^\d*\.?\d+$/.test(v) && Number(v) >= 0); }
  function langOpts() {
    var L = App.LANGS || [];
    return Object.keys(LANG).map(function (k) {
      var n = (L.filter(function (x) { return x.code === k; })[0] || {}).name;
      return [k, LANG[k] + (n && n !== LANG[k] ? ' (' + n + ')' : '')];
    });
  }
  /* "truck 118" or "your drop-off" (for texts to the customer) */
  function truckWords(t) { return t.truckNo ? 'truck ' + t.truckNo : 'your ' + App.kindLabel(t).toLowerCase(); }
  function sameName(a, b) { return trim(a).toLowerCase() === trim(b).toLowerCase(); }
  function plural(n, one, many) { return App.fmt.num(n) + ' ' + (Number(n) === 1 ? one : (many || one + 's')); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function dur(ms) { return App.fmt.dur(ms); }
  /* ticking clock text: "22m 05s", "1h 02m 13s" */
  function liveDur(ms) {
    var s = Math.max(0, Math.floor((ms || 0) / 1000)), hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
    return hh ? hh + 'h ' + pad2(mm) + 'm ' + pad2(ss) + 's' : mm + 'm ' + pad2(ss) + 's';
  }
  function avg(arr) { return arr.length ? arr.reduce(function (s, x) { return s + x; }, 0) / arr.length : null; }
  function goalMin() { return Number(App.settings().waitGoalMin) || 30; }
  function promiseTone(ms) {
    if (ms === null || ms === undefined) return 'neutral';
    var p = PROMISE_MIN * 60000;
    return ms > p ? 'bad' : ms >= p * 0.75 ? 'warn' : 'good';
  }
  function toneFor(kind, ms) { return kind === 'total' ? promiseTone(ms) : App.waitTone(ms); }
  function cardTone(tone) { return tone === 'bad' ? 'late' : tone === 'warn' ? 'soon' : 'ok'; }
  function toneT(tone) { return tone && tone !== 'neutral' ? tone + '-t' : ''; }
  /* attributes for a clock the 1-second ticker keeps running (see bottom of file) */
  function since(iso, kind, tone, fmt) {
    return ' data-of-since="' + h(iso) + '"' + (kind ? ' data-of-tk="' + h(kind) + '" data-of-tone="' + h(tone) + '"' : '') + (fmt ? ' data-of-fmt="' + h(fmt) + '"' : '');
  }
  function quiet(p) { return p && p.catch ? p.catch(function () { /* core already showed a toast */ }) : p; }
  function byName(a, b) { return String(a.name || '').localeCompare(String(b.name || '')); }
  function cust(id) { return id ? App.get('customers', id) : null; }
  function customers() { return App.list('customers').sort(byName); }
  function companyName(t) {
    var c = cust(t && t.customerId);
    return c ? (c.name || c.code || 'Customer') : (trim(t && t.walkInCompany) || 'Walk-in (no company)');
  }
  function companyHtml(t) { var c = cust(t.customerId); return h(companyName(t)) + App.exampleTag(c || t); }
  function dockOf(t) { return (t && t.dock) || 'reno'; }
  function dockShort(k) { return String(App.dockName(k)).split(',')[0]; }
  function doorsOf(k) { var d = App.settings().docks[k]; return Math.max(0, Math.round(num(d && d.doors))); }
  function truckLabel(t) { return t.truckNo ? 'Truck ' + t.truckNo : 'Truck # not given'; }
  function refs(t) {
    var r = (t.loads || []).map(function (l) { return trim(l.ref); }).filter(Boolean);
    return r.length > 2 ? r.slice(0, 2).join(', ') + ' +' + (r.length - 2) : r.join(', ');
  }
  function workVerb(t) { return t.kind === 'pick' ? 'Loading' : 'Unloading'; }
  /* App.EVENTS has no "cancelled" or "changed" event, so those go out under 'booked'; label them by their words */
  function eventLabel(ev, text) {
    if (ev === 'booked' && /^Booking cancelled/i.test(text || '')) return 'Booking cancelled';
    if (ev === 'booked' && /^Booking changed/i.test(text || '')) return 'Booking changed';
    for (var i = 0; i < App.EVENTS.length; i++) if (App.EVENTS[i].key === ev) return App.EVENTS[i].label;
    return { driver: 'Text to driver', crew: 'Forklift crew' }[ev] || ev || 'Message';
  }
  function damageFor(t) {
    var ids = t.damageIds || [];
    return App.sortByTime(App.list('damage', function (d) { return d.truckId === t.id || ids.indexOf(d.id) >= 0; }), 'at', 'desc');
  }
  function countedPallets(t) {
    var c = t.counts || {}, keys = Object.keys(c);
    if (!keys.length) return App.truckPallets(t);
    return keys.reduce(function (s, k) { return s + num(c[k]); }, 0);
  }
  function safeUrl(u) { u = trim(u); return /^https?:\/\/[^\s"'<>]+$/i.test(u) ? u : ''; }
  function baseUrl() { try { return String(window.location.href).split('#')[0]; } catch (e) { return ''; } }
  function driverLink(code) { return baseUrl() + '#driver' + code; }
  /* time for lists: "10:22 AM" today, otherwise "Sat, Oct 24 9:12 AM" */
  function when(iso) { return iso ? (App.isToday(iso) ? App.fmt.time(iso) : App.fmt.dayTime(iso)) : ''; }
  /* "20 min ago", "3h 6m ago"; older than a day shows the date */
  function ago(iso) { return iso && App.now() - Date.parse(iso) > 864e5 ? App.fmt.date(iso) : App.fmt.ago(iso); }
  function busyDoors(dk, exceptId) {
    var m = {};
    App.list('trucks', function (t) { return t.status === 'working' && dockOf(t) === dk && t.id !== exceptId; })
      .forEach(function (t) { m[String(t.door || '?')] = t; });
    return m;
  }
  function comingToday(t, now) {
    var e = App.truckEta(t);
    if (!e) return false;
    return App.isToday(e) || Date.parse(e) < now;
  }
  function byEta(a, b) { return (Date.parse(App.truckEta(a) || '') || Infinity) - (Date.parse(App.truckEta(b) || '') || Infinity); }
  function byDoor(a, b) { return (num(a.door) || 999) - (num(b.door) || 999); }
  function gearText(g) {
    var parts = GEAR.filter(function (x) { return g[x[0]] > 0; }).map(function (x) { return plural(g[x[0]], x[2]); });
    if (!parts.length) return '';
    return parts.join(', ') + (g.tags && g.tags.length ? ' (tags ' + g.tags.join(', ') + ')' : '');
  }
  function hasGear(g) { return g.plywood > 0 || g.bars > 0 || g.straps > 0 || g.airbags > 0 || (g.tags && g.tags.length > 0); }
  function defaultAlerts() {
    var o = {};
    App.EVENTS.forEach(function (e) {
      o[e.key] = { text: ['arrived', 'started', 'damage', 'done'].indexOf(e.key) >= 0, email: ['booked', 'damage', 'done', 'friday'].indexOf(e.key) >= 0 };
    });
    return o;
  }
  function exampleCount() {
    return COLLS.reduce(function (s, c) { return s + App.list(c, function (d) { return d.example === true; }).length; }, 0);
  }
  function curDock() {
    if (ui.dock === null) {
      var v = null;
      try { v = localStorage.getItem(DOCK_KEY); } catch (e) { v = null; }
      ui.dock = v || 'all';
    }
    return ui.dock !== 'all' && !App.settings().docks[ui.dock] ? 'all' : ui.dock;
  }

  /* ================= shared pieces of screen ================= */
  function nav(view, section) {
    var sec = section || SECTION[view] || view;
    var dmg = App.list('damage', function (d) { return d.status === 'waiting'; }).length;
    return '<nav class="chips" aria-label="Office menu" style="margin-bottom:18px">' + NAV.map(function (n) {
      var on = sec === n[0];
      var badge = n[0] === 'office.damage' && dmg ? ' <span class="pill warn" title="Waiting for the customer">' + h(dmg) + '</span>' : '';
      return '<button type="button" class="chip' + (on ? ' on' : '') + '" style="' + TAP + '" data-act="office.nav" data-view="' + h(n[0]) + '"' +
        (on ? ' aria-current="page"' : '') + '>' + h(n[1]) + badge + '</button>';
    }).join('') + '</nav>';
  }
  function screen(view, title, sub, body, opts) {
    opts = opts || {};
    var right = '<span class="clock" data-of-now aria-label="Time now" style="font-size:1.4rem;white-space:nowrap">' + h(App.fmt.time(App.iso())) + '</span>';
    return App.topbar(title, { sub: sub, right: right, back: opts.back, backParams: opts.backParams }) +
      '<main class="body wide">' + nav(view, opts.section) + body + '</main>';
  }
  function officeSub() { return '24 HR Crossdock office · ' + App.fmt.date(App.iso()); }
  function notFound(view, text) {
    return screen(view, 'Not found', officeSub(), '<div class="empty-state stack" style="align-items:center"><b>' + h(text) + '</b>' +
      '<button type="button" class="btn secondary" data-act="office.nav" data-view="office.board">Back to the yard board</button></div>', { back: 'office.board' });
  }
  function sectionHead(title, right, sub) {
    return '<div class="row between" style="margin-bottom:6px"><div class="grow" style="min-width:min(100%,300px)"><h2>' + h(title) + '</h2>' +
      (sub ? '<p class="small muted" style="margin-top:2px">' + sub + '</p>' : '') + '</div>' + (right || '') + '</div>';
  }
  function cardHead(title, right) { return '<div class="card-head"><h3>' + h(title) + '</h3>' + (right || '') + '</div>'; }
  function grid(items, min, gap) {
    return '<div style="display:grid;gap:' + (gap || 10) + 'px;grid-template-columns:repeat(auto-fit,minmax(' + (min || 150) + 'px,1fr))">' + items.join('') + '</div>';
  }
  function twoCol(a, b, min) {
    return '<div style="display:grid;gap:16px;align-items:start;grid-template-columns:repeat(auto-fit,minmax(min(100%,' + (min || 460) + 'px),1fr))">' +
      '<div class="stack" style="min-width:0">' + a + '</div><div class="stack" style="min-width:0">' + b + '</div></div>';
  }
  function miniStat(value, label, o) {
    o = o || {};
    return '<div class="stat"' + (o.attrs || '') + '><b class="' + toneT(o.tone) + '" style="white-space:nowrap;font-size:' + (o.size || '1.5rem') + '"' + (o.clock || '') + '>' +
      h(value) + '</b><span' + (o.big ? ' style="font-size:.95rem;font-weight:600"' : '') + '>' + h(label) + '</span>' + (o.sub ? '<div class="tiny faint" style="margin-top:2px">' + o.sub + '</div>' : '') + '</div>';
  }
  function errMsg(t) { return t ? '<span class="errmsg" role="alert">' + h(t) + '</span>' : ''; }
  /* form controls bound to App.form drafts. o: {id, label, form, field, type, mode, placeholder, hint, err, attrs, textarea, options, change, rerender} */
  function control(o) {
    var bind = ' id="' + h(o.id) + '" data-form="' + h(o.form) + '" data-field="' + h(o.field) + '"' +
      (o.change ? ' data-on-change="' + h(o.change) + '"' : '') + (o.rerender ? ' data-rerender' : '') + (o.err ? ' aria-invalid="true"' : '') + (o.attrs || '');
    if (o.options) {
      var cur = App.getPath(App.form(o.form), o.field);
      cur = cur === undefined || cur === null ? '' : String(cur);
      return '<select' + bind + '>' + o.options.map(function (op) {
        return '<option value="' + h(op[0]) + '"' + (String(op[0]) === cur ? ' selected' : '') + '>' + h(op[1]) + '</option>';
      }).join('') + '</select>';
    }
    if (o.textarea) return '<textarea' + bind + (o.placeholder ? ' placeholder="' + h(o.placeholder) + '"' : '') + '>' + App.val(o.form, o.field) + '</textarea>';
    /* type=number loses the caret when the screen redraws (live data, clocks), so typed digits come out backwards.
       Use a text box with the number keypad instead; the save checks the value. Email boxes have the same problem. */
    var type = o.type === 'number' || o.type === 'email' ? 'text' : (o.type || 'text'), mode = o.mode || (o.type === 'number' ? 'decimal' : o.type === 'email' ? 'email' : '');
    return '<input' + bind + ' type="' + h(type) + '"' + (mode ? ' inputmode="' + h(mode) + '"' : '') + (o.type === 'number' ? ' autocomplete="off"' : '') +
      ' value="' + App.val(o.form, o.field) + '"' + (o.placeholder ? ' placeholder="' + h(o.placeholder) + '"' : '') + '>';
  }
  function field(o) {
    return '<div class="field' + (o.err ? ' err' : '') + '"><label for="' + h(o.id) + '">' + h(o.label) + '</label>' + control(o) +
      errMsg(o.err) + (o.hint ? '<span class="hint">' + h(o.hint) + '</span>' : '') + '</div>';
  }
  function seg(form, fieldName, opts, label) {
    var cur = String(App.getPath(App.form(form), fieldName) || '');
    return '<div class="seg" role="group" aria-label="' + h(label) + '">' + opts.map(function (o) {
      var on = cur === String(o[0]);
      return '<button type="button" class="' + (on ? 'on' : '') + '" style="' + TAP + '" aria-pressed="' + on + '" data-act="core.set" data-form="' + h(form) +
        '" data-field="' + h(fieldName) + '" data-value="' + h(o[0]) + '">' + h(o[1]) + '</button>';
    }).join('') + '</div>';
  }
  function chanPills(r) {
    var names = { text: ['Text', 'info'], email: ['Email', 'accent'], app: ['App', ''] };
    return (r.channels || []).map(function (ch) {
      var n = names[ch] || [ch, ''];
      return '<span class="pill ' + n[1] + '">' + h(n[0]) + '</span>';
    }).join(' ');
  }
  function recipients(m) {
    var to = m.to || [];
    if (!to.length) return '<span class="small warn-t">No one gets this one: no contact has this alert turned on.</span>';
    return '<div class="stack tight">' + to.map(function (r) {
      var addr = [];
      if ((r.channels || []).indexOf('text') >= 0 && r.phone) addr.push(r.phone);
      if ((r.channels || []).indexOf('email') >= 0 && r.email) addr.push(r.email);
      return '<div class="row" style="gap:6px"><b class="small">' + h(r.name || 'Contact') + '</b>' + chanPills(r) +
        (addr.length ? '<span class="small muted" style="overflow-wrap:anywhere">' + h(addr.join(' · ')) + '</span>' : '') + '</div>';
    }).join('') + '</div>';
  }
  /* a web address as plain text (wraps, never cut off) with a Copy button */
  function linkRow(id, url, label) {
    return '<div class="row nowrap" style="align-items:center"><div class="grow mono small card soft tight" id="' + h(id) + '" aria-label="' + h(label) + '" style="overflow-wrap:anywhere;user-select:all">' + h(url) + '</div>' +
      '<button type="button" class="btn secondary" data-act="office.copy" data-text="' + h(url) + '" data-target="' + h(id) + '">Copy</button></div>';
  }
  function photoBtn(ref, label) {
    return '<button type="button" data-act="core.sheet" data-view="office.photo" data-p-ref="' + h(ref) + '" data-p-label="' + h(label) + '" ' +
      'style="padding:0;border:0;background:none;cursor:zoom-in;min-width:0" aria-label="' + h('Open ' + label) + '">' + App.photoTag(ref, label) + '</button>';
  }
  function bigPill(t) {
    var st = App.STATUS[t.status] || { label: t.status || '', tone: '' };
    return '<span class="pill ' + h(st.tone === 'neutral' ? '' : st.tone) + '" style="font-size:1rem;padding:6px 16px">' + h(st.label) + '</span>';
  }
  var FILL = ' style="grid-template-columns:repeat(auto-fill,minmax(min(100%,330px),1fr))"';   // cards keep their width when there are few
  var LI_WRAP = ' style="flex-wrap:wrap"', GROW_MIN = ' style="min-width:min(100%,230px)"', RIGHT = ' style="align-items:flex-end;margin-left:auto"';
  function nameRow(inner, cls) { return '<div class="row' + (cls ? ' ' + cls : '') + '" style="gap:6px;row-gap:2px">' + inner + '</div>'; }
  function damPill(d) { var s = DAM_ST[d.status] || [d.status || 'Unknown', '']; return '<span class="pill ' + s[1] + '">' + h(s[0]) + '</span>'; }

  /* ================= office.board ================= */
  function boardView() {
    var dk = curDock(), all = dk === 'all', now = App.now(), goal = goalMin() * 60000;
    var trucks = App.list('trucks', function (t) { return all || dockOf(t) === dk; });
    var coming = trucks.filter(function (t) { return t.status === 'booked' && comingToday(t, now); }).sort(byEta);
    var later = trucks.filter(function (t) { return t.status === 'booked' && !comingToday(t, now); }).sort(byEta);
    var waiting = App.queue(all ? null : dk);
    var atDoors = trucks.filter(function (t) { return t.status === 'working'; }).sort(byDoor);
    var done = App.sortByTime(trucks.filter(function (t) { return t.status === 'done' && App.isToday(t.doneAt); }), 'doneAt', 'desc');

    /* stat tiles */
    var todayIn = trucks.filter(function (t) { return t.status !== 'cancelled' && App.isToday(t.checkedInAt); });
    var waits = todayIn.map(function (t) { return App.truckTimes(t).waitMs; }).filter(function (x) { return x !== null; });
    var avgWait = avg(waits);
    var longest = waiting[0] || null, longMs = longest ? App.truckTimes(longest).waitMs : null, longTone = App.waitTone(longMs);
    var kept = done.filter(function (t) { var x = App.truckTimes(t).totalMs; return x !== null && x <= PROMISE_MIN * 60000; }).length;
    var keptPct = done.length ? Math.round(kept * 100 / done.length) : null;
    var keptTone = keptPct === null ? 'neutral' : keptPct >= 90 ? 'good' : keptPct >= 75 ? 'warn' : 'bad';
    var stillWaiting = todayIn.filter(function (t) { return t.status === 'arrived'; }).length;

    var tiles = [
      miniStat(String(waiting.length), 'In yard', { attrs: ' data-stat="yard"', big: true, size: TILE, sub: waiting.length ? 'waiting for a door' : 'nobody waiting' }),
      miniStat(String(atDoors.length), 'At doors', { attrs: ' data-stat="doors"', big: true, size: TILE, sub: atDoors.length ? 'being worked now' : 'all doors open' }),
      miniStat(String(done.length), 'Done today', { attrs: ' data-stat="done"', big: true, size: TILE, sub: done.length ? plural(done.reduce(function (s, t) { return s + countedPallets(t); }, 0), 'pallet') : 'none yet' }),
      miniStat(avgWait === null ? '–' : dur(avgWait), 'Avg wait today', { attrs: ' data-stat="avg"', big: true, size: TILE, tone: avgWait === null ? '' : App.waitTone(avgWait),
        sub: waits.length ? h(plural(waits.length, 'truck') + (stillWaiting ? ', ' + stillWaiting + ' still waiting' : '')) : 'no check-ins yet' }),
      longest
        ? '<button type="button" class="stat card flat ' + (longTone === 'bad' ? 'bad' : longTone === 'warn' ? 'warn' : 'good') + '" style="text-align:left;cursor:pointer" ' +
          'data-act="core.go" data-view="office.truck" data-p-id="' + h(longest.id) + '" data-stat="longest" data-truck="' + h(longest.id) + '" data-tone="' + h(longTone) + '">' +
          '<b class="' + toneT(longTone) + '" style="white-space:nowrap;font-size:' + TILE + '"' + since(longest.checkedInAt, 'wait', longTone, 'min') + '>' + h(dur(longMs)) + '</b>' +
          '<span style="font-size:.95rem;font-weight:600">Longest wait now</span><div class="tiny" style="margin-top:2px"><span class="bold">' + h(companyName(longest)) + '</span>' +
          '<span class="' + (longTone === 'bad' ? 'bad-t bold' : 'faint') + '">' + (longTone === 'bad' ? ' · over the ' + h(goalMin()) + ' min goal' : ' · goal ' + h(goalMin()) + ' min') + '</span></div></button>'
        : miniStat('None', 'Longest wait now', { attrs: ' data-stat="longest"', big: true, size: TILE, sub: 'yard is empty' }),
      '<div class="stat' + (keptPct === null ? '' : ' card flat ' + keptTone) + '" data-stat="promise"><b class="' + toneT(keptTone) + '" style="white-space:nowrap;font-size:' + TILE + '">' +
        h(keptPct === null ? '–' : keptPct + '%') + '</b><span style="font-size:.95rem;font-weight:600">Promise kept today</span><div class="tiny faint" style="margin-top:2px">' +
        h(done.length ? kept + ' of ' + done.length + ' done within 2 hours' : 'done within 2 hours of check-in') + '</div></div>'
    ];

    var dockChips = '<div class="chips" role="group" aria-label="Which dock">' + [['all', 'All docks']].concat(App.dockKeys().map(function (k) { return [k, dockShort(k)]; }))
      .map(function (d) {
        var on = d[0] === dk;
        return '<button type="button" class="chip' + (on ? ' on' : '') + '" style="' + TAP + '" aria-pressed="' + on + '" data-act="office.dock" data-dock="' + h(d[0]) + '">' + h(d[1]) + '</button>';
      }).join('') + '</div>';

    var laterNote = later.length
      ? '<p class="tiny muted" style="padding:2px 4px">Later: ' + h(plural(later.length, 'more truck')) + ' booked. Next ' + h(App.fmt.dayTime(App.truckEta(later[0]))) + ', ' + h(companyName(later[0])) + '.</p>' : '';

    var lanes = '<div class="board" style="margin-top:16px">' +
      lane('coming', 'Coming today', 'Booked trucks, soonest first', coming, comingCard(all, now), waiting.length || atDoors.length || done.length ? 'No more trucks booked for today.' : 'No trucks booked for today.', laterNote) +
      lane('waiting', 'Waiting in yard', 'Longest wait first · goal ' + goalMin() + ' min', waiting, waitingCard(all), 'Nobody is waiting. Nice.') +
      lane('doors', 'At doors', 'Being unloaded or loaded', atDoors, doorCard(all), 'No trucks at the doors.') +
      lane('done', 'Done today', 'Newest first · promise is 2 hours', done, doneCard(all), 'Nothing finished yet today.') +
      '</div>';

    var maps = (all ? App.dockKeys() : [dk]).map(function (k) { return doorMap(k, all); });
    var doorsHtml = '<section style="margin-top:22px" aria-label="Door map">' + sectionHead('Doors', '', all ? 'Busy doors at every dock. Pick one dock above to see its full door map.' : h(App.dockName(dk) + ': every door')) +
      (all ? '<div class="cols">' + maps.join('') + '</div>' : maps.join('')) + '</section>';

    var body = '<div class="row between" style="margin-bottom:14px">' + dockChips +
      '<button type="button" class="btn primary" data-act="office.nav" data-view="office.book">+ Book a truck</button></div>' +
      grid(tiles, 150) + lanes + doorsHtml;
    return screen('office.board', 'Yard board', (all ? 'All docks' : App.dockName(dk)) + ' · ' + App.fmt.date(App.iso()), body);
  }

  function lane(key, title, sub, rows, cardFn, empty, foot) {
    return '<section class="lane" data-lane="' + h(key) + '" aria-label="' + h(title) + '">' +
      '<div class="lane-head"><h3 style="font-size:1.3rem">' + h(title) + '</h3><span class="pill' + (rows.length ? ' info' : '') + '" style="font-size:.95rem">' + h(rows.length) + '</span></div>' +
      '<p class="tiny muted" style="margin-top:-6px">' + h(sub) + '</p>' +
      (rows.length ? rows.map(cardFn).join('') : '<div class="empty-state small" style="padding:18px 12px">' + h(empty) + '</div>') + (foot || '') + '</section>';
  }
  /* open a truck; from/fromId make its back button return to the screen it was opened from */
  function openAttrs(t, from, fromId) {
    return ' data-act="core.go" data-view="office.truck" data-p-id="' + h(t.id) + '" data-truck="' + h(t.id) + '"' +
      (from ? ' data-p-from="' + h(from) + '"' : '') + (fromId ? ' data-p-fromid="' + h(fromId) + '"' : '');
  }
  function needsSecure(t) { return t.kind === 'pick' || t.kind === 'both'; }
  /* accountability for pickups: confidence the crew signed for, or a red flag when there is no report */
  function securePill(t) {
    if (!needsSecure(t)) return '';
    var s = t.secure, c = s ? num(s.confidence) : 0;
    if (!s) return '<span class="pill ' + (t.status === 'done' ? 'bad' : 'warn') + '">' + (t.status === 'done' ? 'No securement report' : 'Not secured yet') + '</span>';
    return '<span class="pill ' + (c >= 4 ? 'good' : c === 3 ? 'warn' : 'bad') + '">' + h('Secured ' + c + ' of 5' + (s.signedBy ? ', ' + s.signedBy : '')) + '</span>';
  }
  function tcard(t, tone, inner) {
    return '<button type="button" class="tcard ' + tone + '" style="text-align:left"' + openAttrs(t) + '>' + inner + '</button>';
  }
  function comingCard(all, now) {
    return function (t) {
      var appt = t.apptAt ? Date.parse(t.apptAt) : null, eta = t.eta && t.eta.at ? Date.parse(t.eta.at) : null, at = eta || appt;
      var tone = 'ok', line;
      if (at && at < now) { tone = 'late'; line = '<span class="small bad-t bold">Late: ' + h(dur(now - at)) + ' past the ' + (eta ? 'ETA' : 'appointment') + '</span>'; }
      else if (eta && appt && eta - appt > 15 * 60000) { tone = 'soon'; line = '<span class="small warn-t bold">Running ' + h(dur(eta - appt)) + ' behind (appt ' + h(App.fmt.time(t.apptAt)) + ')</span>'; }
      else if (eta) line = '<span class="small muted">ETA ' + h(SRC[t.eta.source] || '') + (t.eta.updatedAt ? ', ' + h(App.fmt.ago(t.eta.updatedAt)) : '') + (appt ? ' · appt ' + h(App.fmt.time(t.apptAt)) : '') + '</span>';
      else line = '<span class="small muted">Appointment. No ETA update yet.</span>';
      return tcard(t, tone,
        '<span class="row between nowrap"><b class="clock" style="font-size:1.5rem">' + h(at ? App.fmt.time(App.iso(at)) : 'No time') + '</b>' +
        '<span class="pill">' + h(App.kindLabel(t)) + '</span></span>' +
        '<span class="bold" style="font-size:1.05rem">' + companyHtml(t) + '</span>' +
        '<span class="small muted">' + h([plural(App.truckPallets(t), 'pallet'), truckLabel(t), all ? dockShort(dockOf(t)) : '', !App.isToday(App.truckEta(t)) ? App.fmt.date(App.truckEta(t)) : ''].filter(Boolean).join(' · ')) + '</span>' + line);
    };
  }
  function waitingCard(all) {
    return function (t, i) {
      var ms = App.truckTimes(t).waitMs, tone = App.waitTone(ms), pages = (t.paperwork || []).length;
      var pos = App.placeInLine(t) || (i + 1);   // place in line is per dock, even when the lane shows every dock
      return tcard(t, cardTone(tone),
        '<span class="row between nowrap"><span class="bold">#' + h(pos) + ' in line' + (all ? ' at ' + h(dockShort(dockOf(t))) : '') + '</span><span class="pill">' + h(App.kindLabel(t)) + '</span></span>' +
        '<span class="bold" style="font-size:1.05rem">' + companyHtml(t) + '</span>' +
        '<span class="row between nowrap" style="align-items:flex-end"><b class="clock ' + toneT(tone) + '" style="font-size:2.1rem;line-height:1"' + since(t.checkedInAt, 'wait', tone) + '>' + h(liveDur(ms)) + '</b>' +
        '<span class="tiny muted right">waiting<br>since ' + h(App.fmt.time(t.checkedInAt)) + '</span></span>' +
        (tone === 'bad' ? '<span class="small bad-t bold">Over the ' + h(goalMin()) + ' min goal. Give them a door.</span>' : '') +
        '<span class="small muted">' + h([plural(App.truckPallets(t), 'pallet'), truckLabel(t)].join(' · ')) + '</span>' +
        '<span class="small ' + (pages ? 'muted' : 'warn-t') + '">' + h(pages ? plural(pages, 'paperwork page') : 'No paperwork scanned') + (t.checkedInBy === 'office' ? ' · checked in by office' : '') + '</span>');
    };
  }
  function doorCard(all) {
    return function (t) {
      var tm = App.truckTimes(t), tone = promiseTone(tm.totalMs);
      return tcard(t, cardTone(tone),
        '<span class="row between nowrap"><b class="clock" style="font-size:1.6rem">Door ' + h(t.door || '?') + '</b><span class="pill warn">' + h(workVerb(t)) + '</span></span>' +
        '<span class="bold" style="font-size:1.05rem">' + companyHtml(t) + '</span>' +
        '<span class="row between nowrap" style="align-items:flex-end"><b class="clock" style="font-size:1.7rem;line-height:1"' + since(t.startedAt) + '>' + h(liveDur(tm.workMs)) + '</b>' +
        '<span class="tiny muted right">at the door<br>' + h(t.crewName ? 'with ' + t.crewName : 'no crew name') + '</span></span>' +
        '<span class="small muted">' + h([plural(App.truckPallets(t), 'pallet'), all ? dockShort(dockOf(t)) : ''].filter(Boolean).join(' · ')) + '</span>' +
        '<span class="small ' + toneT(tone) + '">Since check-in: <b' + since(t.checkedInAt, 'total', tone) + '>' + h(liveDur(tm.totalMs)) + '</b> of 2h</span>' +
        (needsSecure(t) ? '<span>' + securePill(t) + '</span>' : ''));
    };
  }
  function doneCard(all) {
    return function (t) {
      var tm = App.truckTimes(t), ok = tm.totalMs !== null && tm.totalMs <= PROMISE_MIN * 60000, dm = damageFor(t).length;
      return tcard(t, ok ? 'ok' : 'late',
        '<span class="row between nowrap"><span class="bold" style="font-size:1.05rem">' + companyHtml(t) + '</span>' +
        (tm.totalMs === null ? '' : '<span class="pill ' + (ok ? 'good' : 'bad') + '">' + (ok ? 'Within 2 h' : 'Over 2 h') + '</span>') + '</span>' +
        '<span class="small">Total <b>' + h(dur(tm.totalMs) || '–') + '</b>' + (tm.waitMs !== null ? ' · waited ' + h(dur(tm.waitMs)) : '') + '</span>' +
        '<span class="small muted">' + h(['Done ' + App.fmt.time(t.doneAt), t.door ? 'door ' + t.door : '', t.crewName, all ? dockShort(dockOf(t)) : ''].filter(Boolean).join(' · ')) + '</span>' +
        (dm || needsSecure(t) ? '<span class="row" style="gap:6px">' + (dm ? '<span class="pill warn">' + h(plural(dm, 'damage report')) + '</span>' : '') + securePill(t) + '</span>' : ''));
    };
  }
  /* "1, 2, 4–8" from ['1','2','4',...] */
  function ranges(keys) {
    var nums = keys.map(Number).filter(function (n) { return isFinite(n); }).sort(function (a, b) { return a - b; }), out = [], i = 0;
    while (i < nums.length) {
      var j = i;
      while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++;
      if (j - i >= 2) { out.push(nums[i] + '–' + nums[j]); i = j + 1; }
      else { out.push(String(nums[i])); i++; }
    }
    return out.join(', ');
  }
  function busyDoorTile(k, t) {
    return '<button type="button" class="door busy" style="text-align:left;cursor:pointer" data-door="' + h(k) + '"' + openAttrs(t) + '>' +
      '<b>Door ' + h(k) + '</b><span class="bold" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + h(companyName(t)) + '</span>' +
      '<span class="clock" style="font-size:1rem"' + since(t.startedAt) + '>' + h(liveDur(App.truckTimes(t).workMs)) + '</span>' +
      '<span class="muted">' + h(t.crewName || workVerb(t)) + '</span></button>';
  }
  /* compact = "All docks" overview: busy doors, then one tile listing the open ones */
  function doorMap(dk, compact) {
    var n = doorsOf(dk), busy = busyDoors(dk), keys = [], i;
    for (i = 1; i <= n; i++) keys.push(String(i));
    Object.keys(busy).forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); });
    var busyN = Object.keys(busy).length, waitN = App.queue(dk).length, free = keys.filter(function (k) { return !busy[k]; });
    var tiles;
    if (compact) {
      tiles = keys.filter(function (k) { return busy[k]; }).map(function (k) { return busyDoorTile(k, busy[k]); });
      if (free.length) {
        tiles.push('<button type="button" class="door" style="text-align:left;cursor:pointer;grid-column:span 2" data-act="office.dock" data-dock="' + h(dk) + '" data-door-open="' + h(dk) + '">' +
          '<b class="good-t">' + h(plural(free.length, 'door') + ' open') + '</b><span class="muted" style="overflow-wrap:anywhere">' + h((free.length === keys.length ? 'All doors: ' : 'Doors ') + ranges(free)) + '</span>' +
          '<span class="info-t">See the door map</span></button>');
      }
    } else {
      tiles = keys.map(function (k) {
        return busy[k] ? busyDoorTile(k, busy[k]) : '<div class="door" data-door="' + h(k) + '"><b>Door ' + h(k) + '</b><span class="good-t bold">Open</span></div>';
      });
    }
    return '<div class="card" data-doors="' + h(dk) + '">' + cardHead(App.dockName(dk),
      '<span class="small muted">' + h(busyN + ' busy · ' + Math.max(0, n - busyN) + ' open · ' + waitN + ' waiting') + '</span>') +
      (n || busyN ? '<div class="doors">' + tiles.join('') + '</div>' : '<p class="small muted">No doors set for this dock. Add them in Settings.</p>') + '</div>';
  }

  /* ================= office.truck ================= */
  function truckView(p) {
    var t = p.id ? App.get('trucks', p.id) : null;
    if (!t) return notFound('office.truck', 'That truck is no longer on the list.');
    var head = '<div class="row between top" style="margin-bottom:14px"><div class="grow" style="min-width:min(100%,300px)"><h1>' + companyHtml(t) + '</h1>' +
      '<p class="muted" style="margin-top:4px">' + h([App.kindLabel(t), App.dockName(dockOf(t)), truckLabel(t), 'Check-in code ' + (t.code || '–')].join(' · ')) + '</p></div>' +
      bigPill(t) + '</div>';
    var left = liveCard(t) + actionsCard(t) + loadsCard(t) + damageCard(t) + doneCard2(t) + secureCard(t) + paperworkCard(t);
    var right = driverCard(t) + noteCard(t) + trailCard(t) + messagesCard(t);
    var from = BACK_FROM[p.from] ? p.from : 'office.board';
    return screen('office.truck', companyName(t), App.kindLabel(t) + ' · code ' + (t.code || '–'), head + twoCol(left, right, 480),
      { back: from, backParams: p.fromid ? { id: p.fromid } : null, section: SECTION[from] || from });
  }
  var BACK_FROM = { 'office.board': 1, 'office.customer': 1, 'office.damage': 1, 'office.outbox': 1, 'office.booked': 1 };
  function dayWord(iso) {
    if (!iso) return '';
    if (App.isToday(iso)) return 'today';
    if (new Date(iso).toDateString() === new Date(App.now() + 864e5).toDateString()) return 'tomorrow';
    return App.fmt.date(iso);
  }
  function liveCard(t) {
    var tm = App.truckTimes(t), now = App.now(), stats = [], banner = '', big = '1.8rem', nw = ' white-space:nowrap';
    function tile(value, label, o) { o = o || {}; o.size = o.size || big; o.attrs = (o.attrs || ''); return miniStat(value, label, o); }
    if (t.status === 'booked') {
      var eta = t.eta && t.eta.at, at = App.truckEta(t), late = at && Date.parse(at) < now;
      stats.push(tile(App.fmt.time(t.apptAt) || '–', 'Appointment', { sub: h(dayWord(t.apptAt)) }));
      stats.push(tile(eta ? App.fmt.time(eta) : 'None yet', 'ETA', { sub: eta ? h(dayWord(eta) + ', ' + (SRC[t.eta.source] || '') + (t.eta.updatedAt ? ', ' + App.fmt.ago(t.eta.updatedAt) : '')) : 'going by the appointment' }));
      stats.push(tile(late ? 'Late' : 'On time', 'Status', { tone: late ? 'bad' : 'good', sub: late ? h(dur(now - Date.parse(at)) + ' past the ' + (eta ? 'ETA' : 'appointment')) : h('arrives in ' + dur(Date.parse(at) - now)) }));
    } else if (t.status === 'arrived') {
      var wt = App.waitTone(tm.waitMs), pos = App.placeInLine(t), q = App.queue(dockOf(t)).length, est = App.estWaitMin(t);
      stats.push(tile(liveDur(tm.waitMs), 'Waiting', { tone: wt, clock: since(t.checkedInAt, 'wait', wt), sub: h('since ' + App.fmt.time(t.checkedInAt) + ' · goal ' + goalMin() + ' min') }));
      stats.push(tile(pos ? '#' + pos : '–', 'Place in line', { sub: h('of ' + q + ' in the yard' + (est ? ' · about ' + dur(est * 60000) : '')) }));
      stats.push(tile(t.checkedInBy === 'office' ? 'Office' : 'Kiosk', 'Checked in at', { sub: h(plural((t.paperwork || []).length, 'paperwork page')) }));
    } else if (t.status === 'working') {
      var pt = promiseTone(tm.totalMs);
      stats.push(tile('Door ' + (t.door || '?'), workVerb(t), { sub: h(t.crewName ? 'with ' + t.crewName : 'no crew name') }));
      stats.push(tile(liveDur(tm.workMs), 'At the door', { clock: since(t.startedAt), sub: h('since ' + App.fmt.time(t.startedAt)) }));
      stats.push(tile(liveDur(tm.totalMs), 'Since check-in', { tone: pt, clock: since(t.checkedInAt, 'total', pt), sub: 'our promise is 2 hours' }));
    } else if (t.status === 'done') {
      var ok = tm.totalMs !== null && tm.totalMs <= PROMISE_MIN * 60000;
      stats.push(tile(dur(tm.totalMs) || '–', 'Total time', { tone: tm.totalMs === null ? '' : ok ? 'good' : 'bad', sub: h('done ' + dayWord(t.doneAt) + ' ' + App.fmt.time(t.doneAt)) }));
      stats.push(tile(dur(tm.waitMs) || '–', 'Waited in yard'));
      stats.push(tile(dur(tm.workMs) || '–', 'At the door', { sub: h(t.door ? 'door ' + t.door + (t.crewName ? ', ' + t.crewName : '') : '') }));
      if (tm.totalMs !== null) banner = '<div class="banner ' + (ok ? 'good' : 'warn') + '" style="margin-top:12px"><b>' + h('Done in ' + dur(tm.totalMs) + (ok ? ', within our 2-hour promise.' : ', over our 2-hour promise.')) + '</b></div>';
    } else if (t.status === 'cancelled') {
      banner = '<div class="banner warn"><b>This truck was cancelled.</b></div>';
    }
    return '<div class="card">' + (t.status === 'cancelled' ? '' : App.stepsHtml(t)) +
      (stats.length ? '<div style="margin-top:14px">' + grid(stats, 150) + '</div>' : '') + banner + '</div>';
  }
  function actionsCard(t) {
    var id = t.id, main = '', help = '', more = [];
    if (t.status === 'booked') {
      main = '<button type="button" class="btn primary lg" id="of-checkin" data-act="office.openDriver" data-mode="checkin" data-id="' + h(id) + '">Check in now</button>';
      help = 'For drivers who come to the window instead of using the kiosk. Check the driver’s cell so we can text the door number. We queue the "checked in" alert for the customer.';
    } else if (t.status === 'arrived') {
      main = '<button type="button" class="btn primary lg" id="of-door" data-act="core.sheet" data-view="office.door" data-p-id="' + h(id) + '">Assign door and start</button>';
      help = 'Pick an open door. We queue a text telling the driver which door to go to.';
    } else if (t.status === 'working') {
      main = App.confirmBtn('of-done-' + id, 'Mark done', 'office.done', { 'data-id': id }, 'primary');
      help = 'The crew usually finishes from their phone with counts and photos. Use this if they can’t.' +
        (needsSecure(t) && !t.secure ? ' Careful: this load has no securement report yet.' : '');
    } else {
      help = t.status === 'done' ? 'This truck is done. Nothing left to do.' : 'This truck was cancelled.';
    }
    if (t.status === 'booked') more.push('<button type="button" class="btn secondary" data-act="office.openEta" data-id="' + h(id) + '">Set ETA</button>');
    if (t.status !== 'cancelled' && t.status !== 'done') more.push('<button type="button" class="btn secondary" id="of-edit-driver" data-act="office.openDriver" data-mode="edit" data-id="' + h(id) + '">Driver and truck info</button>');
    more.push('<button type="button" class="btn secondary" data-act="office.openNote" data-id="' + h(id) + '">' + (trim(t.notes) ? 'Edit note' : 'Add note') + '</button>');
    if (t.status !== 'cancelled') more.push('<button type="button" class="btn secondary" data-act="office.openScan" data-id="' + h(id) + '">Scan paperwork</button>');
    if (t.status === 'booked' || t.status === 'arrived') more.push(App.confirmBtn('of-cancel-' + id, 'Cancel truck', 'office.cancel', { 'data-id': id }, 'danger'));
    return '<div class="card accent">' + cardHead('Office actions') + '<div class="stack">' +
      (main ? '<div>' + main + '</div>' : '') + '<p class="small muted">' + h(help) + '</p>' +
      '<div class="btn-row">' + more.join('') + '</div></div></div>';
  }
  function loadsCard(t) {
    var loads = t.loads || [], counts = t.counts || {};
    var rows = loads.map(function (l, i) {
      var c = counts[l.id], hasC = c !== undefined && c !== null && c !== '';
      return '<div class="li"><div class="grow"><b>' + (t.loadOrder && loads.length > 1 ? h((i + 1) + '. ') : '') + h(l.ref || 'No ref') + '</b>' +
        '<span>' + h([plural(num(l.pallets), 'pallet'), num(l.weight) ? App.fmt.num(l.weight) + ' lbs' : '', num(l.pieces) ? plural(num(l.pieces), 'piece') : '', trim(l.destination)].filter(Boolean).join(' · ')) + '</span>' +
        (trim(l.notes) ? '<span>' + h(l.notes) + '</span>' : '') + '</div>' +
        '<div class="stack tight" style="align-items:flex-end">' + (l.hazmat ? '<span class="pill bad">Hazmat</span>' : '') + (l.stackable ? '<span class="pill info">Stackable</span>' : '<span class="pill">Do not stack</span>') +
        (hasC ? '<span class="pill ' + (num(c) === num(l.pallets) ? 'good' : 'warn') + '">' + h(num(c) + ' of ' + num(l.pallets) + ' counted') + '</span>' : '') + '</div></div>';
    });
    return '<div class="card">' + cardHead('Loads', '<span class="small muted">' + h(plural(App.truckPallets(t), 'pallet') + ' · ' + App.fmt.num(App.truckWeight(t)) + ' lbs') + '</span>') +
      (t.loadOrder && loads.length > 1 ? '<p class="small bold" style="margin-bottom:8px">Unload / load in this order.</p>' : '') +
      (rows.length ? '<div class="list">' + rows.join('') + '</div>' : '<p class="small muted">No loads listed.</p>') +
      (trim(t.countNote) ? '<p class="small" style="margin-top:8px"><b>Count note:</b> ' + h(t.countNote) + '</p>' : '') + '</div>';
  }
  function damageRows(list) {
    return '<div class="list">' + list.map(function (d) {
      return '<div class="li link" data-act="core.sheet" data-view="office.damageItem" data-p-id="' + h(d.id) + '" data-damage="' + h(d.id) + '">' +
        '<div style="width:60px;flex:none">' + App.photoTag((d.photos || [])[0], 'No photo') + '</div>' +
        '<div class="grow"><b>' + h(d.ref || 'Load') + ' · ' + h(plural(num(d.pallets), 'pallet')) + '</b><span>' + h((d.kinds || []).join(', ') || 'Damage') + ' · ' + h(ago(d.at)) + '</span></div>' +
        '<div class="stack tight" style="align-items:flex-end"><b class="num">' + h(App.fmt.money(App.damageTotal(d))) + '</b>' + damPill(d) + '</div></div>';
    }).join('') + '</div>';
  }
  function damageCard(t) {
    var list = damageFor(t);
    if (!list.length) return '';
    return '<div class="card warn">' + cardHead('Damage reports', '<span class="small muted">Only the customer can approve fixes</span>') + damageRows(list) + '</div>';
  }
  function doneCard2(t) {
    var ph = t.photos || [];
    if (!ph.length) return '';
    return '<div class="card">' + cardHead('Done photos', '<span class="small muted">' + h(plural(ph.length, 'photo')) + '</span>') +
      '<div class="thumbs">' + ph.map(function (r, i) { return photoBtn(r, 'Done photo ' + (i + 1)); }).join('') + '</div></div>';
  }
  function secureCard(t) {
    var s = t.secure;
    if (!s) {
      if (!needsSecure(t) || (t.status !== 'working' && t.status !== 'done')) return '';
      return '<div class="card ' + (t.status === 'done' ? 'bad' : 'warn') + '" data-secure-missing>' + cardHead('Securement report', securePill(t)) +
        '<p class="small">' + (t.status === 'done' ? 'This pickup left without a securement report: no gear count, no photos, no signed confidence. Ask the crew what happened.'
          : 'The crew fills this in from their phone before the truck leaves: gear used, tag numbers, seal, 5 photos and how sure they are it can’t shift.') + '</p></div>';
    }
    var g = s.gear || {}, conf = num(s.confidence);
    var rows = GEAR.map(function (x) {
      var r = g[x[0]] || {};
      return '<tr><td>' + h(x[1]) + '</td><td class="num">' + h(num(r.qty)) + '</td><td>' + (num(r.qty) ? h(r.owner === 'driver' ? 'Driver’s' : 'Ours') : '–') + '</td></tr>';
    }).join('');
    var bars = '';
    for (var i = 1; i <= 5; i++) bars += '<span class="pill ' + (i <= conf ? (conf >= 4 ? 'good' : conf === 3 ? 'warn' : 'bad') : '') + '" style="min-width:26px;justify-content:center">' + i + '</span>';
    var ph = s.photos || {};
    return '<div class="card">' + cardHead('Securement report', '<span class="small muted">' + h(s.signedBy ? 'Signed by ' + s.signedBy + (s.signedAt ? ', ' + when(s.signedAt) : '') : 'Not signed') + '</span>') +
      '<div class="stack">' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Gear</th><th>Qty</th><th>Whose</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<dl class="kv"><dt>Tags</dt><dd>' + h((s.tags || []).join(', ') || 'None') + '</dd><dt>Seal</dt><dd class="mono">' + h(s.seal || '–') + '</dd>' +
      '<dt>Confidence</dt><dd><span class="row" style="gap:4px">' + bars + '<span class="small">' + h(conf ? conf + ' of 5, ' + (CONF[conf] || '') : '–') + '</span></span></dd>' +
      (trim(s.note) ? '<dt>Note</dt><dd>' + h(s.note) + '</dd>' : '') + '</dl>' +
      '<div class="thumbs">' + SEC_PHOTOS.map(function (x) {
        return '<div class="stack tight">' + (ph[x[0]] ? photoBtn(ph[x[0]], x[1]) : App.photoTag('', 'No photo')) + '<span class="tiny muted center">' + h(x[1]) + '</span></div>';
      }).join('') + '</div></div></div>';
  }
  function paperworkCard(t) {
    var pw = t.paperwork || [];
    return '<div class="card">' + cardHead('Paperwork scans', '<span class="small muted">' + h(pw.length ? plural(pw.length, 'page') : 'none yet') + '</span>') +
      (pw.length ? '<div class="thumbs">' + pw.map(function (r, i) { return photoBtn(r, 'Paperwork page ' + (i + 1)); }).join('') + '</div>'
        : '<p class="small muted">No paperwork scanned yet. If the driver hands papers to the window, use “Scan paperwork”.</p>') + '</div>';
  }
  function driverCard(t) {
    var c = cust(t.customerId), link = safeUrl(t.trackUrl);
    var rows = [
      ['Driver', t.driverName || 'Not given'], ['Driver cell', t.driverCell || 'Not given'], ['Language', LANG[t.driverLang] || t.driverLang || 'English'],
      ['Carrier', t.carrier || '–'], ['Truck #', t.truckNo || '–'], ['Trailer #', t.trailerNo || '–'],
      ['ETA updates', TRACK[t.tracking] || 'No ETA updates']
    ];
    if (!c && trim(t.walkInCompany)) rows.unshift(['Company (walk-in)', t.walkInCompany]);
    var html = rows.map(function (r) { return '<dt>' + h(r[0]) + '</dt><dd>' + h(r[1]) + '</dd>'; }).join('');
    if (!link && (t.tracking === 'samsara' || t.tracking === 'gps')) html += '<dt>Live link</dt><dd class="warn-t">Not pasted yet</dd>';
    html += '<dt>Booked</dt><dd>' + h((t.createdBy === 'office' ? 'By the office' : t.createdBy === 'kiosk' ? 'Walk-in at the kiosk' : 'By the customer') + (t.createdAt ? ', ' + App.fmt.dayTime(t.createdAt) : '')) + '</dd>';
    if (c) {
      var p = (c.contacts || [])[0];
      if (p) html += '<dt>Customer contact</dt><dd>' + [p.name, p.phone, p.email].filter(Boolean).map(h).join('<br>') + '</dd>';
    }
    var links = '';
    if (link) links += '<div class="stack tight"><div class="label">' + h(t.tracking === 'samsara' ? 'Samsara live link' : 'Live location link') + '</div>' + linkRow('tr-live', link, 'Live location link') + '</div>';
    if (t.status !== 'cancelled' && t.status !== 'done' && t.code) links += '<div class="stack tight"><div class="label">Driver page (ETA and door number)</div>' + linkRow('tr-driver', driverLink(t.code), 'Driver link') + '</div>';
    var edit = t.status !== 'cancelled' && t.status !== 'done' ? '<button type="button" class="btn secondary" data-act="office.openDriver" data-mode="edit" data-id="' + h(t.id) + '">Edit</button>' : '';
    return '<div class="card">' + cardHead('Driver and truck', edit) + '<dl class="kv">' + html + '</dl>' + (links ? '<div class="stack" style="margin-top:12px">' + links + '</div>' : '') + '</div>';
  }
  function noteCard(t) {
    return '<div class="card">' + cardHead('Office note', '<button type="button" class="btn secondary" data-act="office.openNote" data-id="' + h(t.id) + '">' + (trim(t.notes) ? 'Edit' : 'Add note') + '</button>') +
      (trim(t.notes) ? '<p style="white-space:pre-line">' + h(t.notes) + '</p>' : '<p class="small muted">No note yet.</p>') + '</div>';
  }
  function trailCard(t) {
    var hist = t.history || [];
    if (!hist.length) return '<div class="card">' + cardHead('Load trail') + '<p class="small muted">Nothing recorded yet.</p></div>';
    return '<div class="card">' + cardHead('Load trail', '<span class="small muted">every step, oldest first</span>') + '<div class="timeline">' + hist.map(function (x, i) {
      var tone = /damage|cancel/i.test(x.text) ? 'bad' : /^done|secured/i.test(x.text) ? 'good' : i === hist.length - 1 ? 'accent' : '';
      var tt = App.isToday(x.at) ? h(App.fmt.time(x.at)) : h(App.fmt.date(x.at).replace(/^\w+, /, '')) + '<br>' + h(App.fmt.time(x.at));
      return '<div class="tl ' + tone + '"><div class="tt">' + tt + '</div><div class="td"></div><div style="min-width:0"><div>' + h(x.text) + '</div>' +
        (x.by ? '<div class="tiny muted">' + h(x.by) + '</div>' : '') + '</div></div>';
    }).join('') + '</div></div>';
  }
  function messagesCard(t) {
    var rows = App.sortByTime(App.list('outbox', function (m) { return m.truckId === t.id; }), 'at', 'desc');
    return '<div class="card">' + cardHead('Messages for this truck', '<span class="small muted">' + h(rows.length ? plural(rows.length, 'message') : 'none yet') + '</span>') +
      (rows.length ? '<div class="list">' + rows.map(function (m) {
        return '<div class="li" style="align-items:flex-start"><div class="grow stack tight"><div class="row between"><span class="pill info">' + h(eventLabel(m.event, m.text)) + '</span>' +
          '<span class="tiny muted">' + h(when(m.at)) + '</span></div><div class="small">' + h(m.text) + '</div>' + recipients(m) + '</div></div>';
      }).join('') + '</div><p class="tiny muted" style="margin-top:8px">Not sent for real yet. See the Outbox.</p>'
        : '<p class="small muted">No texts or emails for this truck yet.</p>') + '</div>';
  }

  /* ================= truck sheets ================= */
  function sheetMissing() {
    return '<div class="stack"><h2>Not found</h2><p class="muted">That record is no longer on the list.</p><button type="button" class="btn secondary" data-act="core.closeSheet">Close</button></div>';
  }
  function sheetHead(title, sub) {
    return '<div class="row between top"><div class="grow"><h2>' + h(title) + '</h2>' + (sub ? '<p class="small muted" style="margin-top:2px">' + sub + '</p>' : '') + '</div>' +
      '<button type="button" class="btn ghost" data-act="core.closeSheet" aria-label="Close">Close</button></div>';
  }
  function doorSheet(p) {
    var t = App.get('trucks', p.id);
    if (!t) return sheetMissing();
    var fn = 'ofDoor:' + t.id, f = App.form(fn, { door: '', crew: '' }), dk = dockOf(t), n = doorsOf(dk), busy = busyDoors(dk, t.id);
    if (t.status !== 'arrived') {   // the crew may have started it from their phone while this was open
      return '<div class="stack">' + sheetHead('Assign a door', h(companyName(t))) +
        '<div class="banner ' + (t.status === 'working' ? 'good' : 'warn') + '"><b>' + h(t.status === 'working' ? 'Already started at door ' + (t.door || '?') + (t.crewName ? ' by ' + t.crewName : '') + '.'
          : 'This truck is not waiting in the yard any more.') + '</b></div>' +
        '<button type="button" class="btn secondary lg block" data-act="core.closeSheet">Close</button></div>';
    }
    var picked = f.door && !busy[String(f.door)] && num(f.door) >= 1 && num(f.door) <= n ? String(f.door) : '';
    var tiles = [];
    for (var i = 1; i <= n; i++) {
      var k = String(i), b = busy[k];
      if (b) tiles.push('<div class="door busy"><b>Door ' + h(k) + '</b><span class="bold" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + h(companyName(b)) + '</span><span class="muted">Busy</span></div>');
      else {
        var on = picked === k;
        tiles.push('<button type="button" class="choice' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="core.set" data-form="' + h(fn) + '" data-field="door" data-value="' + h(k) + '" data-door="' + h(k) + '">' +
          '<span class="ct"><b>Door ' + h(k) + '</b><span>' + (on ? 'Picked' : 'Open') + '</span></span></button>');
      }
    }
    var crew = App.settings().crew || [];
    var crewHtml = crew.length ? '<div class="chips" role="group" aria-label="Forklift driver">' + crew.map(function (c) {
      var on = f.crew === c;
      return '<button type="button" class="chip' + (on ? ' on' : '') + '" style="' + TAP + '" aria-pressed="' + on + '" data-act="core.set" data-form="' + h(fn) + '" data-field="crew" data-value="' + h(c) + '">' + h(c) + '</button>';
    }).join('') + '</div>' : '<p class="small muted">No crew names yet. Add them in Settings.</p>';
    var verb = workVerb(t);
    return '<div class="stack">' + sheetHead('Assign a door', h(companyName(t) + ' · ' + App.kindLabel(t) + ' · ' + App.dockName(dk))) +
      '<div class="label">Pick an open door</div>' + (n ? '<div class="doors">' + tiles.join('') + '</div>' : '<p class="small muted">No doors set for this dock. Add them in Settings.</p>') +
      '<div class="label">Who is on the forklift? <span class="faint" style="text-transform:none;letter-spacing:0">(optional)</span></div>' + crewHtml +
      '<button type="button" class="btn primary lg block" id="of-start" data-act="office.start" data-id="' + h(t.id) + '"' + (picked ? '' : ' disabled') + '>' +
      h(picked ? verb + ' starts at door ' + picked : 'Pick a door first') + '</button>' +
      '<p class="small muted center">' + h(t.driverCell ? (picked ? 'We’ll text the driver: “Go to door ' + picked + '.”' : 'We’ll text the driver which door to go to.') : 'No driver cell on file, so tell the driver in person.') + '</p></div>';
  }
  function etaSheet(p) {
    var t = App.get('trucks', p.id);
    if (!t) return sheetMissing();
    var fn = 'ofEta:' + t.id, f = App.form(fn, {});
    var quick = [[15, 'In 15 min'], [30, 'In 30 min'], [60, 'In 1 hour'], [120, 'In 2 hours']].map(function (q) {
      return '<button type="button" class="chip" style="' + TAP + '" data-act="office.etaQuick" data-id="' + h(t.id) + '" data-min="' + q[0] + '">' + h(q[1]) + '</button>';
    }).join('');
    return '<form class="stack" data-submit="office.etaSave" data-id="' + h(t.id) + '" novalidate>' + sheetHead('Set the ETA', h(companyName(t) + ' · ' + truckLabel(t))) +
      '<div class="chips">' + quick + '</div>' +
      '<div class="grid2 collapse">' + field({ id: 'eta-date', label: 'Date', form: fn, field: 'date', type: 'date', err: f.tried && !f.date ? 'Pick a date.' : '' }) +
      field({ id: 'eta-time', label: 'Time', form: fn, field: 'time', type: 'time', err: f.tried && !f.time ? 'Pick a time.' : '' }) + '</div>' +
      field({ id: 'eta-note', label: 'Note (optional)', form: fn, field: 'note', placeholder: 'e.g. Driver called, stuck in traffic' }) +
      '<button type="submit" class="btn primary lg block">Save ETA</button>' +
      '<p class="small muted center">We’ll queue an “ETA changed” alert for the customer.</p></form>';
  }
  /* check in at the window (mode 'checkin') or fix the driver and truck details (mode 'edit') */
  function driverInit(t) {
    return { driverName: t.driverName || '', driverCell: t.driverCell || '', driverLang: t.driverLang || 'en', carrier: t.carrier || '', truckNo: t.truckNo || '',
      trailerNo: t.trailerNo || '', tracking: t.tracking || 'none', trackUrl: t.trackUrl || '' };
  }
  function driverErrors(f) {
    var e = {};
    if ((f.tracking === 'samsara' || f.tracking === 'gps') && trim(f.trackUrl) && !safeUrl(f.trackUrl)) e.trackUrl = 'Paste the whole link. It starts with https://';
    return e;
  }
  function trackFields(fn, f, e, idPre) {
    return field({ id: idPre + '-track', label: 'How will we know when the truck is close?', form: fn, field: 'tracking', options: TRACK_OPTS, rerender: true }) +
      (f.tracking === 'samsara' || f.tracking === 'gps'
        ? field({ id: idPre + '-trackurl', label: (f.tracking === 'samsara' ? 'Samsara' : 'GPS') + ' share link', form: fn, field: 'trackUrl', type: 'url', placeholder: 'https://…', err: e.trackUrl,
          hint: 'The customer or driver can send it later too. We show it to the office and the crew.' })
        : f.tracking === 'link' ? '<p class="small muted">The driver gets a link to their own page: they send their ETA and see their door number.</p>' : '');
  }
  function driverSheet(p) {
    var t = App.get('trucks', p.id);
    if (!t) return sheetMissing();
    var checkin = p.mode === 'checkin', fn = 'ofDrv:' + t.id, f = App.form(fn, driverInit(t)), e = f.tried ? driverErrors(f) : {};
    if (checkin && t.status !== 'booked') {
      return '<div class="stack">' + sheetHead('Check in', h(companyName(t))) + '<div class="banner good"><b>This truck is already checked in.</b></div>' +
        '<button type="button" class="btn secondary lg block" data-act="core.closeSheet">Close</button></div>';
    }
    var fields = '<div style="display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))">' +
      field({ id: 'dr-name', label: 'Driver name', form: fn, field: 'driverName' }) +
      field({ id: 'dr-cell', label: 'Driver cell', form: fn, field: 'driverCell', type: 'tel', hint: 'We text the door number here.' }) +
      field({ id: 'dr-lang', label: 'Driver’s language', form: fn, field: 'driverLang', options: langOpts() }) +
      (checkin ? '' : field({ id: 'dr-carrier', label: 'Carrier', form: fn, field: 'carrier' })) +
      field({ id: 'dr-truck', label: 'Truck #', form: fn, field: 'truckNo' }) +
      field({ id: 'dr-trailer', label: 'Trailer #', form: fn, field: 'trailerNo' }) + '</div>';
    var place = App.queue(dockOf(t)).length + 1;
    return '<form class="stack" data-submit="office.driverSave" data-id="' + h(t.id) + '" data-mode="' + (checkin ? 'checkin' : 'edit') + '" novalidate>' +
      sheetHead(checkin ? 'Check in at the window' : 'Driver and truck info', h(companyName(t) + ' · ' + App.kindLabel(t) + ' · code ' + (t.code || '–'))) +
      (checkin ? '<p class="small muted">Check what the driver tells you. Change anything that’s wrong.</p>' : '') + fields +
      (checkin ? '' : trackFields(fn, f, e, 'dr')) +
      '<button type="submit" class="btn primary lg block" id="' + (checkin ? 'ci-go' : 'dr-save') + '">' + (checkin ? 'Check in now' : 'Save') + '</button>' +
      (checkin ? '<p class="small muted center">' + h('They will be #' + place + ' in line at ' + App.dockName(dockOf(t)) + '. We queue a “checked in” alert for the customer and tell the forklift crew.') + '</p>' : '') +
      '</form>';
  }
  function noteSheet(p) {
    var t = App.get('trucks', p.id);
    if (!t) return sheetMissing();
    var fn = 'ofNote:' + t.id;
    App.form(fn, { notes: t.notes || '' });
    return '<form class="stack" data-submit="office.noteSave" data-id="' + h(t.id) + '" novalidate>' + sheetHead('Office note', h(companyName(t))) +
      field({ id: 'note-text', label: 'Note for the office and crew', form: fn, field: 'notes', textarea: true, placeholder: 'e.g. Driver needs a lumper receipt' }) +
      '<button type="submit" class="btn primary lg block">Save note</button></form>';
  }
  function scanSheet(p) {
    var t = App.get('trucks', p.id);
    if (!t) return sheetMissing();
    var fn = 'ofScan:' + t.id, f = App.form(fn, { pages: [] }), n = (f.pages || []).length, busy = App.anyBusy();
    return '<div class="stack">' + sheetHead('Scan paperwork', h(companyName(t) + ' · ' + plural((t.paperwork || []).length, 'page') + ' on file')) +
      '<p class="small muted">Lay the paper flat. Fill the screen. One photo per page.</p>' +
      App.photoList({ form: fn, field: 'pages', label: 'Take a photo of a page', accept: 'image/*,application/pdf', id: 'scan-file' }) +
      '<button type="button" class="btn primary lg block" id="scan-save" data-act="office.scanSave" data-id="' + h(t.id) + '"' + (n && !busy ? '' : ' disabled') + '>' +
      h(busy ? 'Saving photo…' : n ? 'Save ' + plural(n, 'page') + ' to this truck' : 'Take a photo first') + '</button></div>';
  }
  function photoSheet(p) {
    var url = App.photoUrl(p.ref);
    return '<div class="stack">' + sheetHead(p.label || 'Photo') +
      (url ? '<img src="' + h(url) + '" alt="' + h(p.label || 'Photo') + '" style="width:100%;border-radius:8px;display:block">' : '<p class="muted">This photo is not available.</p>') + '</div>';
  }

  /* ================= office.book / office.booked ================= */
  function bookInit() {
    var ms = App.now() + 3600000, d = new Date(ms);
    d.setMinutes(0, 0, 0);
    return { customerId: '', dock: 'reno', kind: 'drop', date: App.localDate(d.getTime()), time: App.localTime(d.getTime()),
      carrier: '', truckNo: '', trailerNo: '', driverName: '', driverCell: '', driverLang: 'en', tracking: 'link', trackUrl: '',
      loads: [{ ref: '', pallets: '', weight: '' }], notes: '' };
  }
  function bookErrors(f) {
    var e = {}, bad = false;
    if (!cust(f.customerId)) e.customerId = 'Pick the customer.';
    if (!f.date || !f.time) e.when = 'Pick a date and a time.';
    (f.loads || []).forEach(function (l, i) {
      if (!numOk(l.pallets) || !numOk(l.weight)) { e['load' + i] = 'Pallets and weight are numbers, like 18 and 21600.'; bad = true; }
    });
    if (!bad && !(f.loads || []).some(function (l) { return num(l.pallets) > 0; })) e.loads = 'Add at least one load with pallets.';
    var d = driverErrors(f);
    if (d.trackUrl) e.trackUrl = d.trackUrl;
    return e;
  }
  function bookView() {
    var fn = 'ofBook', f = App.form(fn, bookInit()), e = f.tried ? bookErrors(f) : {};
    var custOpts = [['', 'Pick a customer…']].concat(customers().map(function (c) { return [c.id, c.name + (c.code ? ' (' + c.code + ')' : '') + (c.example ? ' · example' : '')]; }));
    var loads = (f.loads || []).map(function (l, i) {
      return '<div><div style="display:grid;gap:8px;grid-template-columns:minmax(0,2fr) minmax(0,1fr) minmax(0,1.2fr) auto;align-items:end"' + (e['load' + i] ? ' class="field err"' : '') + '>' +
        field({ id: 'bk-ref-' + i, label: i ? 'Load ' + (i + 1) + ' ref' : 'PO / BOL / ref', form: fn, field: 'loads.' + i + '.ref', placeholder: 'PO-12345' }) +
        field({ id: 'bk-pal-' + i, label: 'Pallets', form: fn, field: 'loads.' + i + '.pallets', type: 'number', mode: 'numeric', rerender: true }) +
        field({ id: 'bk-wt-' + i, label: 'Weight', placeholder: 'lbs', form: fn, field: 'loads.' + i + '.weight', type: 'number', mode: 'numeric', rerender: true }) +
        '<button type="button" class="btn ghost" style="min-width:44px;padding:0 8px" data-act="office.bookLoadRemove" data-i="' + i + '" aria-label="Remove load ' + (i + 1) + '"' +
        ((f.loads || []).length < 2 ? ' disabled' : '') + '>&times;</button></div>' + (e['load' + i] ? '<div class="field">' + errMsg(e['load' + i]) + '</div>' : '') + '</div>';
    }).join('');
    var appt = f.date && f.time ? Date.parse(App.toIso(f.date, f.time)) : NaN;
    var past = isFinite(appt) && appt < App.now() - 10 * 60000;
    var noCust = !customers().length;
    var totP = (f.loads || []).reduce(function (s, l) { return s + num(l.pallets); }, 0), totW = (f.loads || []).reduce(function (s, l) { return s + num(l.weight); }, 0);
    var errList = Object.keys(e).length ? '<div class="banner bad" role="alert"><div><b>Almost there.</b><div class="small">' + h(Object.keys(e).map(function (k) { return e[k]; }).join(' ')) + '</div></div></div>' : '';
    var left = (noCust ? '<div class="banner info"><div><b>No customers yet.</b><div class="small">Add the company first, then book their truck here.</div>' +
        '<button type="button" class="btn primary" style="margin-top:8px" data-act="office.openCust" data-id="new">+ Add a customer</button></div></div>' : '') +
      '<div class="card">' + cardHead('1. Customer') + field({ id: 'bk-cust', label: 'Which customer is this truck for?', form: fn, field: 'customerId', options: custOpts, change: 'office.bookCust', err: e.customerId }) +
      '<p class="small muted" style="margin-top:8px">New customer? <button type="button" class="linkbtn" style="min-height:44px;display:inline-flex;align-items:center" data-act="office.openCust" data-id="new">Add them first</button>.</p></div>' +
      '<div class="card">' + cardHead('2. Where and what') + '<div class="stack"><div class="field"><span class="flabel">Dock</span>' +
      seg(fn, 'dock', App.dockKeys().map(function (k) { return [k, dockShort(k)]; }), 'Dock') + '<span class="hint">' + h((App.settings().docks[f.dock] || {}).address || '') + '</span></div>' +
      '<div class="field"><span class="flabel">Drop-off or pickup</span>' + seg(fn, 'kind', [['drop', 'Drop-off'], ['pick', 'Pickup'], ['both', 'Both']], 'Kind') + '</div></div></div>' +
      '<div class="card">' + cardHead('3. When') + '<div class="grid2 collapse">' +
      field({ id: 'bk-date', label: 'Date', form: fn, field: 'date', type: 'date', err: e.when && !f.date ? e.when : '' }) +
      field({ id: 'bk-time', label: 'Time (any time)', form: fn, field: 'time', type: 'time', err: e.when && !f.time ? e.when : '' }) + '</div>' +
      (past ? '<p class="small warn-t" style="margin-top:8px" id="bk-past">That time has already passed. That’s fine if the truck is here now.</p>' : '') + '</div>';
    var right =
      '<div class="card">' + cardHead('4. Truck and driver', '<span class="small muted">fill in what you know</span>') + '<div class="stack">' +
      '<div style="display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr))">' +
      field({ id: 'bk-carrier', label: 'Carrier', form: fn, field: 'carrier' }) + field({ id: 'bk-truck', label: 'Truck #', form: fn, field: 'truckNo' }) +
      field({ id: 'bk-trailer', label: 'Trailer #', form: fn, field: 'trailerNo' }) +
      field({ id: 'bk-driver', label: 'Driver name', form: fn, field: 'driverName' }) + field({ id: 'bk-cell', label: 'Driver cell', form: fn, field: 'driverCell', type: 'tel', hint: 'We text the door number here.' }) +
      field({ id: 'bk-lang', label: 'Driver’s language', form: fn, field: 'driverLang', options: langOpts() }) + '</div>' +
      trackFields(fn, f, e, 'bk') + '</div></div>' +
      '<div class="card' + (e.loads ? ' bad' : '') + '">' + cardHead('5. Loads', '<span class="small muted">' + h(plural(totP, 'pallet') + ' · ' + App.fmt.num(totW) + ' lbs') + '</span>') +
      '<div class="stack">' + loads + (e.loads ? '<div class="field">' + errMsg(e.loads) + '</div>' : '') +
      '<div><button type="button" class="btn secondary" data-act="office.bookLoadAdd">+ Add another load</button></div></div></div>' +
      '<div class="card">' + field({ id: 'bk-notes', label: '6. Notes (optional)', form: fn, field: 'notes', textarea: true, placeholder: 'Anything the crew should know' }) + '</div>';
    var body = '<form class="stack" data-submit="office.bookSave" novalidate>' + sectionHead('Book a truck for a customer', '', 'For customers who call or email. They get the same booking alert as if they booked it themselves.') +
      errList + twoCol(left, right, 440) +
      '<div class="row" style="justify-content:flex-end"><button type="button" class="btn ghost" data-act="office.bookClear">Clear form</button>' +
      '<button type="submit" class="btn primary lg" id="bk-save">Book this truck</button></div></form>';
    return screen('office.book', 'Book a truck', officeSub(), body);
  }
  function bookedView(p) {
    var t = p.id ? App.get('trucks', p.id) : null;
    if (!t) return notFound('office.booked', 'That booking is no longer on the list.');
    var link = driverLink(t.code), live = safeUrl(t.trackUrl);
    var body = '<div class="stack loose" style="max-width:720px;margin:0 auto">' +
      '<div class="card good stack center" style="align-items:center"><div class="good-t" style="font-size:3rem;line-height:1" aria-hidden="true">&#10003;</div>' +
      '<h1>Booked for ' + h(companyName(t)) + '</h1><p class="big">' + h(App.kindLabel(t) + ' at ' + App.dockName(dockOf(t)) + ', ' + App.fmt.dayTime(t.apptAt)) + '</p>' +
      '<p class="muted">' + h(plural(App.truckPallets(t), 'pallet') + (refs(t) ? ' · ' + refs(t) : '')) + '</p>' +
      '<div class="label" style="margin-top:6px">Check-in code</div><div class="mono bold" id="bk-code" style="font-size:3rem;line-height:1">' + h(t.code) + '</div>' +
      '<p class="small muted">The driver types this code at the kiosk.</p></div>' +
      '<div class="card stack">' + cardHead('Driver link') + '<p class="small muted">' + h(t.tracking === 'link' ? 'Send this to the driver so they can send their ETA and see their door number.'
        : 'The driver can open this to see their door number. ETA updates: ' + (TRACK[t.tracking] || 'none').toLowerCase() + (live ? ' (link saved)' : '') + '.') + '</p>' +
      linkRow('bk-link', link, 'Driver link') + '</div>' +
      '<div class="btn-row"><button type="button" class="btn primary lg" data-act="core.go" data-view="office.truck" data-p-id="' + h(t.id) + '" data-p-from="office.booked" data-p-fromid="' + h(t.id) + '">Open this truck</button>' +
      '<button type="button" class="btn secondary lg" data-act="office.nav" data-view="office.book">Book another</button>' +
      '<button type="button" class="btn secondary lg" data-act="office.nav" data-view="office.board">Yard board</button></div></div>';
    return screen('office.booked', 'Booked', officeSub(), body);
  }

  /* ================= office.damage ================= */
  function damageView() {
    var f = App.form('ofDam', { status: 'all' }), all = App.sortByTime(App.list('damage'), 'at', 'desc');
    var count = function (s) { return all.filter(function (d) { return d.status === s; }).length; };
    var opts = [['all', 'All', all.length], ['waiting', 'Waiting', count('waiting')], ['approved', 'Approved', count('approved')], ['declined', 'Declined', count('declined')], ['auto', 'Auto-approved', count('auto')]];
    var chips = '<div class="chips" role="group" aria-label="Show">' + opts.map(function (o) {
      var on = f.status === o[0];
      return '<button type="button" class="chip' + (on ? ' on' : '') + '" style="' + TAP + '" aria-pressed="' + on + '" data-act="core.set" data-form="ofDam" data-field="status" data-value="' + h(o[0]) + '">' + h(o[1]) + ' <span class="pill">' + h(o[2]) + '</span></button>';
    }).join('') + '</div>';
    var rows = all.filter(function (d) { return f.status === 'all' || d.status === f.status; });
    var waiting = all.filter(function (d) { return d.status === 'waiting'; });
    var list = rows.length ? '<div class="list">' + rows.map(function (d) {
      var c = cust(d.customerId), tr = App.get('trucks', d.truckId);
      return '<div class="li link"' + LI_WRAP + ' data-act="core.sheet" data-view="office.damageItem" data-p-id="' + h(d.id) + '" data-damage="' + h(d.id) + '">' +
        '<div style="width:72px;flex:none">' + App.photoTag((d.photos || [])[0], 'No photo') + '</div>' +
        '<div class="grow"' + GROW_MIN + '>' + nameRow('<b>' + h(c ? c.name : 'Unknown company') + '</b>' + App.exampleTag(c || d)) +
        '<span>' + h([d.ref || 'Load', plural(num(d.pallets), 'pallet') + ' hurt', (d.kinds || []).join(', ')].filter(Boolean).join(' · ')) + '</span>' +
        '<span>' + h(['Reported ' + ago(d.at), d.by ? 'by ' + d.by : '', tr ? App.dockName(dockOf(tr)) : ''].filter(Boolean).join(' · ')) + '</span></div>' +
        '<div class="stack tight"' + RIGHT + '><b class="num big">' + h(App.fmt.money(App.damageTotal(d))) + '</b>' + damPill(d) + '</div></div>';
    }).join('') + '</div>' : '<div class="empty-state">' + h(all.length ? 'No damage reports with this status.' : 'No damage reports yet. When the crew reports damage, it shows up here with photos.') + '</div>';
    var body = sectionHead('Damage reports', '', 'Customers approve or decline fixes in their portal. The office can add notes.') +
      (waiting.length ? '<div class="banner warn" style="margin:8px 0 12px"><div><b>' + h(plural(waiting.length, 'report') + ' waiting for the customer') + '</b>' +
        '<div class="small">' + h(App.fmt.money(waiting.reduce(function (s, d) { return s + App.damageTotal(d); }, 0)) + ' in fixes waiting for a yes or no.') + '</div></div></div>' : '') +
      '<div style="margin:10px 0 14px">' + chips + '</div>' + list;
    return screen('office.damage', 'Damage', officeSub(), body);
  }
  function damageSheet(p) {
    var d = App.get('damage', p.id);
    if (!d) return sheetMissing();
    var c = cust(d.customerId), tr = App.get('trucks', d.truckId), fn = 'ofDmNote:' + d.id;
    App.form(fn, { text: '' });
    var lines = (d.fixLines || []).map(function (l) {
      return '<tr><td>' + h(l.label) + '</td><td class="num right">' + h(num(l.qty)) + '</td><td class="num right">' + h(App.fmt.money(l.rate)) + '</td><td class="num right">' + h(App.fmt.money(num(l.qty) * num(l.rate))) + '</td></tr>';
    }).join('');
    var st = d.status === 'waiting' ? '<div class="banner warn"><div><b>Waiting for ' + h(c ? c.name : 'the customer') + '.</b><div class="small">They approve or decline in their portal. The office can’t approve for them.</div></div></div>'
      : '<div class="banner ' + (d.status === 'declined' ? 'bad' : 'good') + '"><div><b>' + h((DAM_ST[d.status] || [d.status])[0]) + '</b>' +
        '<div class="small">' + h([d.decidedBy ? 'by ' + d.decidedBy : '', d.decidedAt ? App.fmt.dayTime(d.decidedAt) : '', d.status === 'auto' ? 'by the customer’s auto-approve setting' : ''].filter(Boolean).join(', ')) + '</div>' +
        (trim(d.customerNote) ? '<div class="small">Customer note: ' + h(d.customerNote) + '</div>' : '') + '</div></div>';
    var notes = d.officeNotes || [];
    return '<div class="stack">' + sheetHead('Damage on ' + (d.ref || 'a load'), h([c ? c.name : '', tr ? truckLabel(tr) : '', 'reported by ' + (d.by || 'crew') + ', ' + App.fmt.dayTime(d.at)].filter(Boolean).join(' · '))) + st +
      ((d.photos || []).length ? '<div style="display:grid;gap:8px;grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">' + d.photos.map(function (r, i) { return App.photoTag(r, 'Damage photo ' + (i + 1)); }).join('') + '</div>'
        : '<p class="small warn-t">No photos on this report.</p>') +
      '<dl class="kv"><dt>Pallets hurt</dt><dd>' + h(num(d.pallets)) + '</dd><dt>What happened</dt><dd>' + h((d.kinds || []).join(', ') || '–') + '</dd>' +
      (trim(d.what) ? '<dt>Crew words</dt><dd>' + h(d.what) + '</dd>' : '') + '</dl>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fix</th><th class="right">Qty</th><th class="right">Rate</th><th class="right">Line</th></tr></thead><tbody>' + lines +
      '<tr><td colspan="3" class="bold">Total</td><td class="num right bold">' + h(App.fmt.money(App.damageTotal(d))) + '</td></tr></tbody></table></div>' +
      '<div class="stack tight"><div class="label">Office notes</div>' + (notes.length ? '<div class="list">' + notes.map(function (n) {
        return '<div class="li"><div class="grow"><b class="small">' + h(n.text) + '</b><span>' + h((n.by || 'Office') + ' · ' + when(n.at)) + '</span></div></div>';
      }).join('') + '</div>' : '<p class="small muted">No office notes yet.</p>') + '</div>' +
      '<form class="stack tight" data-submit="office.damageNote" data-id="' + h(d.id) + '" novalidate>' + field({ id: 'dm-note', label: 'Add a note (the customer does not see this)', form: fn, field: 'text', textarea: true, placeholder: 'e.g. Called Priya, she will approve after lunch' }) +
      '<div class="btn-row"><button type="submit" class="btn primary">Add note</button>' +
      (tr && !(App.state.view === 'office.truck' && (App.state.params || {}).id === tr.id) ? '<button type="button" class="btn secondary" data-act="core.go" data-view="office.truck" data-p-id="' + h(tr.id) + '" data-p-from="office.damage">Open the truck</button>' : '') + '</div></form></div>';
  }

  /* ================= office.gear ================= */
  function gearView() {
    var rows = customers().map(function (c) { return { c: c, g: App.gearOut(c.id) }; }).filter(function (r) { return hasGear(r.g); });
    var tot = { plywood: 0, bars: 0, straps: 0, airbags: 0, tags: 0 };
    rows.forEach(function (r) { GEAR.forEach(function (x) { tot[x[0]] += r.g[x[0]]; }); tot.tags += r.g.tags.length; });
    var table = rows.length ? '<div class="cols"' + FILL + '>' + rows.map(function (r) {
      return '<div class="card" data-gear-row="' + h(r.c.id) + '"><div class="card-head">' + nameRow('<h3>' + h(r.c.name) + '</h3>' + App.exampleTag(r.c)) +
        '<button type="button" class="btn secondary" data-act="office.gearOpen" data-cust="' + h(r.c.id) + '">Log return</button></div>' +
        '<div class="grid2">' + GEAR.map(function (x) {
          return '<div class="stat"><b class="' + (r.g[x[0]] ? '' : 'faint') + '">' + h(r.g[x[0]]) + '</b><span>' + h(x[1]) + '</span></div>';
        }).join('') + '</div>' +
        '<p class="small" style="margin-top:10px"><b>Tags out:</b> <span class="mono">' + h(r.g.tags.join(', ') || 'none') + '</span></p></div>';
    }).join('') + '</div><p class="small muted" style="margin-top:10px">' + h('Total out: ' + (gearText({ plywood: tot.plywood, bars: tot.bars, straps: tot.straps, airbags: tot.airbags, tags: [] }) || 'nothing') +
      (tot.tags ? ', ' + plural(tot.tags, 'tagged item') : '') + '.') + '</p>'
      : '<div class="empty-state">All of our gear is home. Nothing is out with a customer.</div>';
    var ledger = App.sortByTime(App.list('gear'), 'at', 'desc').slice(0, 30);
    var names = {};
    GEAR.forEach(function (x) { names[x[0]] = x; });
    var led = ledger.length ? '<div class="list">' + ledger.map(function (g) {
      var c = cust(g.customerId), tr = g.truckId ? App.get('trucks', g.truckId) : null, nm = names[g.type] || [g.type, g.type, g.type];
      return '<div class="li"><span class="pill ' + (g.dir === 'back' ? 'good' : 'warn') + '" style="min-width:52px;justify-content:center">' + (g.dir === 'back' ? 'Back' : 'Out') + '</span>' +
        '<div class="grow"><b>' + h(plural(num(g.qty), nm[2])) + (g.tags && g.tags.length ? ' · ' + h(g.tags.join(', ')) : '') + '</b>' +
        nameRow('<span>' + h(c ? c.name : 'Unknown customer') + '</span>' + App.exampleTag(c || g) +
          '<span>' + h([tr ? 'truck code ' + tr.code : '', trim(g.note), when(g.at), g.by ? 'by ' + g.by : ''].filter(Boolean).join(' · ')) + '</span>') + '</div></div>';
    }).join('') + '</div>' : '<div class="empty-state">No gear has gone out yet.</div>';
    var body = sectionHead('Our securement gear', rows.length ? '<button type="button" class="btn primary" data-act="office.gearOpen" data-cust="">Log gear coming back</button>' : '',
      'Plywood, load bars, straps and airbags that left with a customer’s truck and are not back yet.') +
      '<div style="margin:12px 0 22px">' + table + '</div>' + sectionHead('Recent gear moves', '', 'Newest first') + '<div style="margin-top:8px">' + led + '</div>';
    return screen('office.gear', 'Gear', officeSub(), body);
  }
  function gearSheet() {
    var fn = 'ofGear', f = App.form(fn, { customerId: '', type: 'plywood', qty: 1, tags: [], note: '' });
    var withGear = customers().filter(function (c) { return hasGear(App.gearOut(c.id)) || c.id === f.customerId; });
    if (!withGear.length) {
      return '<div class="stack">' + sheetHead('Gear coming back') + '<div class="empty-state">Our records show no gear out with any customer, so there is nothing to bring back.</div>' +
        '<button type="button" class="btn secondary lg block" data-act="core.closeSheet">Close</button></div>';
    }
    var opts = [['', 'Pick a customer…']].concat(withGear.map(function (c) { return [c.id, c.name]; }));
    var c = cust(f.customerId), out = c ? App.gearOut(c.id) : null, nm = GEAR.filter(function (x) { return x[0] === f.type; })[0] || GEAR[0];
    var have = out ? num(out[nm[0]]) : 0, qty = num(f.qty) || 1, over = !!out && qty > have;
    var tagChips = out && out.tags.length ? '<div class="field"><span class="flabel">Tags coming back</span><div class="chips">' + out.tags.map(function (tg) {
      var on = (f.tags || []).indexOf(tg) >= 0;
      return '<button type="button" class="chip' + (on ? ' on' : '') + '" style="' + TAP + '" aria-pressed="' + on + '" data-act="core.toggleIn" data-form="' + fn + '" data-field="tags" data-value="' + h(tg) + '">' + h(tg) + '</button>';
    }).join('') + '</div></div>' : '';
    var qtyMsg = !out ? '' : over
      ? errMsg(have ? 'Our records show only ' + plural(have, nm[2]) + ' out with ' + c.name + '.' : 'Our records show no ' + nm[1].toLowerCase() + ' out with ' + c.name + '.')
      : '<span class="hint">' + h(plural(have, nm[2]) + ' out with them') + '</span>';
    return '<form class="stack" data-submit="office.gearSave" novalidate>' + sheetHead('Gear coming back', 'We add it back to the shelf and take it off the customer’s count.') +
      field({ id: 'gr-cust', label: 'From which customer?', form: fn, field: 'customerId', options: opts, rerender: true, err: f.tried && !c ? 'Pick the customer.' : '' }) +
      (out ? '<p class="small muted">Still out with them: ' + h(gearText(out) || 'nothing') + '</p>' : '') +
      '<div class="field"><span class="flabel">What</span>' + seg(fn, 'type', GEAR.map(function (x) { return [x[0], x[1]]; }), 'Gear type') + '</div>' +
      '<div class="field' + (over ? ' err' : '') + '"><span class="flabel">How many</span><div class="stepper" style="align-self:flex-start"><button type="button" data-act="core.step" data-form="' + fn + '" data-field="qty" data-step="-1" data-min="1" aria-label="One less">&minus;</button>' +
      '<output id="gr-qty" aria-live="polite">' + h(qty) + '</output><button type="button" data-act="core.step" data-form="' + fn + '" data-field="qty" data-step="1" data-min="1" aria-label="One more">+</button></div>' + qtyMsg + '</div>' +
      tagChips + field({ id: 'gr-note', label: 'Note (optional)', form: fn, field: 'note', placeholder: 'e.g. Driver dropped them at the gate' }) +
      '<button type="submit" class="btn primary lg block" id="gr-save"' + (over ? ' disabled' : '') + '>' + h(c && !over ? 'Log ' + plural(qty, nm[2]) + ' back' : 'Log it') + '</button></form>';
  }

  /* ================= office.customers / office.customer ================= */
  function customersView() {
    var q = trim(App.form('ofCustQ', { q: '' }).q).toLowerCase();
    var all = customers(), rows = all.filter(function (c) { return !q || String(c.name || '').toLowerCase().indexOf(q) >= 0 || String(c.code || '').toLowerCase().indexOf(q) >= 0; });
    var list = rows.length ? '<div class="list">' + rows.map(function (c) {
      var act = App.trucksFor(c.id).filter(App.isActive).length, dmg = App.list('damage', function (d) { return d.customerId === c.id && d.status === 'waiting'; }).length;
      return '<div class="li link"' + LI_WRAP + ' data-act="office.openCust" data-id="' + h(c.id) + '" data-cust-row="' + h(c.id) + '">' +
        '<div class="grow"' + GROW_MIN + '>' + nameRow('<b class="big">' + h(c.name || 'No name') + '</b>' + App.exampleTag(c)) +
        '<span>' + h([c.code, App.dockName(c.dock || 'reno'), plural((c.contacts || []).length, 'contact')].filter(Boolean).join(' · ')) + '</span></div>' +
        '<div class="stack tight"' + RIGHT + '><span class="pill ' + (act ? 'info' : '') + '">' + h(act ? plural(act, 'active truck') : 'No active trucks') + '</span>' +
        (dmg ? '<span class="pill warn">' + h(plural(dmg, 'damage report') + ' waiting') + '</span>' : '') + '</div></div>';
    }).join('') + '</div>' : '<div class="empty-state">' + h(all.length ? 'No customer matches “' + q + '”.' : 'No customers yet. Add your first one.') + '</div>';
    var body = sectionHead('Customers', '<button type="button" class="btn primary" data-act="office.openCust" data-id="new">+ New customer</button>', h(plural(all.length, 'customer'))) +
      '<div class="field" style="margin:10px 0 14px;max-width:420px"><label for="cu-q">Search by name or code</label>' +
      '<input id="cu-q" type="search" data-form="ofCustQ" data-field="q" data-rerender value="' + App.val('ofCustQ', 'q') + '" placeholder="e.g. Sierra"></div>' + list;
    return screen('office.customers', 'Customers', officeSub(), body);
  }
  /* form draft for a customer. base = what the form started from, so a save sends only what the office changed
     (the customer may change their own alerts in the portal at the same time). _k = the contact's place in base. */
  function custInit(c) {
    var isNew = !c;
    if (!c) c = { contacts: [{ name: '', role: '', phone: '', email: '', alerts: defaultAlerts() }] };
    var f = { name: c.name || '', code: c.code || '', dock: c.dock || 'reno', notes: c.notes || '',
      autoApproveUnder: c.autoApproveUnder === null || c.autoApproveUnder === undefined ? '' : String(c.autoApproveUnder),
      fridaySummary: c.fridaySummary !== false, contacts: App.clone(c.contacts || []) };
    if (!isNew) f.contacts.forEach(function (ct, i) { ct._k = i; });
    f.base = App.clone(f);
    return f;
  }
  function who(p) { return [p && p.name, p && p.phone, p && p.email].map(function (x) { return trim(x).toLowerCase(); }).join('|'); }
  /* contacts to save: the office's edits, with each contact's alert choices taken from the live record (the customer owns those),
     plus any contact the customer added in the portal while this form was open */
  function mergeContacts(f, live) {
    var base = (f.base && f.base.contacts) || [], liveC = (live && live.contacts) || [], out = [];
    (f.contacts || []).forEach(function (p) {
      var ct = cleanContact(p);
      if (!ct.name && !ct.phone && !ct.email) return;
      var b = p._k !== undefined ? base[p._k] : null, src = null;
      if (b) src = liveC[p._k] && who(liveC[p._k]) === who(b) ? liveC[p._k] : liveC.filter(function (x) { return who(x) === who(b); })[0];
      if (src && src.alerts) ct.alerts = App.clone(src.alerts);
      out.push(ct);
    });
    liveC.forEach(function (x) {
      var known = base.some(function (b) { return who(b) === who(x); }) || out.some(function (o) { return who(o) === who(x); });
      if (!known) out.push(App.clone(x));
    });
    return out;
  }
  /* -> {e: {field: message}, body: cleaned customer fields} */
  function custCheck(f, id) {
    var e = {}, name = trim(f.name), code = trim(f.code).toUpperCase().replace(/\s+/g, '');
    if (!name) e.name = 'Type the company name.';
    if (!/^[A-Z0-9-]{2,12}$/.test(code)) e.code = 'Use 2 to 12 letters or numbers, like SIERRA.';
    else if (App.list('customers', function (x) { return x.id !== id && String(x.code || '').toUpperCase() === code; }).length) e.code = 'Another customer already uses ' + code + '.';
    var aa = trim(f.autoApproveUnder).replace(/[$,]/g, ''), aaN = null;
    if (aa !== '') { aaN = Number(aa); if (!isFinite(aaN) || aaN < 0) e.autoApproveUnder = 'A dollar amount, or leave it blank for never.'; }
    var contacts = [];
    (f.contacts || []).forEach(function (p, i) {
      var ct = cleanContact(p);
      if (!ct.name && !ct.phone && !ct.email) return;
      if (!ct.name) e['c' + i] = 'Add a name for this contact.';
      else if (!ct.phone && !ct.email) e['c' + i] = 'Add a cell or an email so they can get alerts.';
      contacts.push(ct);
    });
    return { e: e, body: { name: name, code: code, dock: App.settings().docks[f.dock] ? f.dock : 'reno', notes: trim(f.notes), autoApproveUnder: aaN, fridaySummary: !!f.fridaySummary, contacts: contacts } };
  }
  function alertSummary(p) {
    var a = p.alerts || {}, tx = 0, em = 0;
    Object.keys(a).forEach(function (k) { if (a[k] && a[k].text && trim(p.phone)) tx++; if (a[k] && a[k].email && trim(p.email)) em++; });
    if (!tx && !em) return 'Gets no alerts yet (add a cell or email)';
    return 'Gets ' + [tx ? plural(tx, 'text alert') : '', em ? plural(em, 'email alert') : ''].filter(Boolean).join(' and ');
  }
  function customerView(p) {
    var id = p.id && p.id !== 'new' ? p.id : '', c = id ? cust(id) : null;
    if (id && !c) return notFound('office.customer', 'That customer is no longer on the list.');
    var fn = 'ofCust:' + (id || 'new'), f = App.form(fn, custInit(c)), e = f.tried ? custCheck(f, id).e : {};
    var contacts = (f.contacts || []).map(function (ct, i) {
      var pre = 'cu-c' + i;
      return '<div class="card soft tight' + (e['c' + i] ? ' bad' : '') + '" data-contact="' + i + '"><div class="row between" style="margin-bottom:8px"><b>' + h(trim(ct.name) || 'New contact') + '</b>' +
        '<button type="button" class="btn ghost" data-act="office.contactRemove" data-form="' + h(fn) + '" data-i="' + i + '">Remove</button></div>' +
        '<div style="display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr))">' + field({ id: pre + '-name', label: 'Name', form: fn, field: 'contacts.' + i + '.name' }) + field({ id: pre + '-role', label: 'Role', form: fn, field: 'contacts.' + i + '.role', placeholder: 'Dispatcher' }) +
        field({ id: pre + '-phone', label: 'Cell (for texts)', form: fn, field: 'contacts.' + i + '.phone', type: 'tel' }) + field({ id: pre + '-email', label: 'Email', form: fn, field: 'contacts.' + i + '.email', type: 'email' }) + '</div>' +
        (e['c' + i] ? '<div class="field" style="margin-top:6px">' + errMsg(e['c' + i]) + '</div>' : '') +
        '<p class="tiny muted" style="margin-top:6px">' + h(alertSummary(ct)) + '. They choose their alerts in their portal.</p></div>';
    }).join('');
    var left = '<div class="card">' + cardHead('Company') + '<div class="stack">' +
      field({ id: 'cu-name', label: 'Company name', form: fn, field: 'name', err: e.name }) +
      field({ id: 'cu-code', label: 'Short code', form: fn, field: 'code', err: e.code, hint: 'Customers type this to sign in to their portal. Letters and numbers, like SIERRA.', attrs: ' autocapitalize="characters" style="text-transform:uppercase"' }) +
      '<div class="field"><span class="flabel">Usual dock</span>' + seg(fn, 'dock', App.dockKeys().map(function (k) { return [k, dockShort(k)]; }), 'Usual dock') + '</div>' +
      field({ id: 'cu-notes', label: 'Notes', form: fn, field: 'notes', textarea: true, placeholder: 'e.g. Always needs load bars on pickups' }) + '</div></div>' +
      '<div class="card">' + cardHead('Damage and summaries') + '<div class="stack">' +
      field({ id: 'cu-auto', label: 'Auto-approve damage fixes under $', form: fn, field: 'autoApproveUnder', type: 'number', mode: 'decimal', err: e.autoApproveUnder, placeholder: 'Blank = never',
        hint: 'Blank means never: the customer approves every fix. We always send photos first.' }) +
      '<label class="check"><input type="checkbox" id="cu-friday" data-form="' + h(fn) + '" data-field="fridaySummary"' + (f.fridaySummary ? ' checked' : '') + '> Send the Friday summary email</label></div></div>';
    var side = '';
    if (c) {
      var act = App.sortByTime(App.trucksFor(c.id).filter(App.isActive), 'apptAt'), g = App.gearOut(c.id);
      side = '<div class="card">' + cardHead('Right now') + '<div class="stack tight">' +
        (act.length ? '<div class="list">' + act.map(function (t) {
          return '<div class="li link"' + openAttrs(t, 'office.customer', c.id) + '><div class="grow"><b>' + h(App.kindLabel(t) + ' · ' + truckLabel(t)) + '</b><span>' + h(App.dockName(dockOf(t)) + ' · ' + (t.status === 'booked' ? App.fmt.dayTime(App.truckEta(t)) : 'code ' + t.code)) + '</span></div>' + App.statusPill(t) + '</div>';
        }).join('') + '</div>' : '<p class="small muted">No active trucks.</p>') +
        '<p class="small"><b>Our gear with them:</b> ' + h(gearText(g) || 'none') + '</p></div></div>';
    }
    var right = '<div class="card">' + cardHead('Contacts', '<span class="small muted">' + h(plural((f.contacts || []).length, 'contact')) + '</span>') + '<div class="stack">' +
      (contacts || '<p class="small muted">No contacts yet. Add the dispatcher so they get alerts.</p>') +
      '<div><button type="button" class="btn secondary" data-act="office.contactAdd" data-form="' + h(fn) + '">+ Add contact</button></div></div></div>' + side;
    var errs = Object.keys(e).length ? '<div class="banner bad" role="alert"><b>Check the boxes marked in red.</b></div>' : '';
    var body = '<form class="stack" data-submit="office.custSave" data-id="' + h(id) + '" novalidate>' +
      sectionHead(c ? c.name : 'New customer', '', c ? h('Code ' + (c.code || '–')) + App.exampleTag(c) : 'Add a company that sends trucks to us.') + errs + twoCol(left, right, 440) +
      '<div class="row" style="justify-content:flex-end"><button type="button" class="btn secondary" data-act="office.nav" data-view="office.customers">Back to list</button>' +
      '<button type="submit" class="btn primary lg" id="cu-save">' + (c ? 'Save changes' : 'Add customer') + '</button></div></form>';
    return screen('office.customer', c ? c.name : 'New customer', officeSub(), body, { back: 'office.customers' });
  }

  /* ================= office.outbox ================= */
  function outboxView() {
    var f = App.form('ofOb', { event: '', cust: '' });
    var all = App.sortByTime(App.list('outbox'), 'at', 'desc');
    var today = all.filter(function (m) { return App.isToday(m.at); });
    var texts = 0, emails = 0;
    today.forEach(function (m) { (m.to || []).forEach(function (r) { if ((r.channels || []).indexOf('text') >= 0) texts++; if ((r.channels || []).indexOf('email') >= 0) emails++; }); });
    var rows = all.filter(function (m) { return (!f.event || m.event === f.event) && (!f.cust || m.customerId === f.cust); });
    var shown = rows.slice(0, 150);
    var evOpts = [['', 'All messages']].concat(App.EVENTS.map(function (e) { return [e.key, e.label]; }), [['driver', 'Text to driver'], ['crew', 'Forklift crew']]);
    var cOpts = [['', 'All companies']].concat(customers().map(function (c) { return [c.id, c.name]; }));
    var list = shown.length ? '<div class="list">' + shown.map(function (m) {
      var c = cust(m.customerId), tr = m.truckId ? App.get('trucks', m.truckId) : null;
      return '<div class="li" style="align-items:flex-start;flex-wrap:wrap;row-gap:6px" data-msg="' + h(m.id) + '" data-event="' + h(m.event) + '">' +
        '<div style="width:92px;flex:none" class="small"><b class="num">' + h(App.fmt.time(m.at)) + '</b> <span class="muted">' + h(App.isToday(m.at) ? 'Today' : App.fmt.date(m.at)) + '</span></div>' +
        '<div class="grow stack tight" style="min-width:min(100%,260px)"><div class="row" style="gap:8px"><span class="pill info">' + h(eventLabel(m.event, m.text)) + '</span><b>' + h(c ? c.name : (tr ? companyName(tr) : 'No company')) + '</b>' + App.exampleTag(c || m) +
        (tr ? '<button type="button" class="linkbtn small" style="min-height:44px;display:inline-flex;align-items:center" data-act="core.go" data-view="office.truck" data-p-id="' + h(tr.id) + '" data-p-from="office.outbox">Open truck (code ' + h(tr.code) + ')</button>' : '') + '</div>' +
        '<div style="white-space:pre-line">' + h(m.text) + '</div>' + recipients(m) + '</div></div>';
    }).join('') + '</div>' + (rows.length > shown.length ? '<p class="small muted center" style="margin-top:8px">Showing the newest 150 of ' + h(rows.length) + '.</p>' : '')
      : '<div class="empty-state">' + h(all.length ? 'No messages match these filters.' : 'Nothing yet. Alerts show up here as trucks are booked, checked in and finished.') + '</div>';
    var body = '<div class="banner info" style="margin-bottom:14px"><div><b>Texts and emails are not connected yet. This is exactly what would be sent.</b>' +
      '<div class="small">Each alert goes to the customer contacts who turned that alert on.</div></div></div>' +
      grid([miniStat(String(today.length), 'Messages today', { attrs: ' data-stat="today"' }), miniStat(String(texts), 'Texts today'), miniStat(String(emails), 'Emails today'), miniStat(String(all.length), 'All time')], 150) +
      '<div class="grid2 collapse" style="margin:16px 0 14px;max-width:720px">' +
      field({ id: 'ob-event', label: 'Kind of message', form: 'ofOb', field: 'event', options: evOpts, rerender: true }) +
      field({ id: 'ob-cust', label: 'Company', form: 'ofOb', field: 'cust', options: cOpts, rerender: true }) + '</div>' + list;
    return screen('office.outbox', 'Outbox', officeSub(), body);
  }

  /* ================= office.friday ================= */
  function weekStart() {
    var d = new Date(App.now());
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d.getTime();
  }
  function weekLabel() {
    var ws = weekStart(), now = App.now();
    return new Date(ws).toDateString() === new Date(now).toDateString() ? App.fmt.date(App.iso(ws)) + ' (so far)' : App.fmt.date(App.iso(ws)) + ' to ' + App.fmt.date(App.iso(now));
  }
  function weekStats(cid) {
    var ws = weekStart(), now = App.now();
    function inWk(iso) { var x = iso ? Date.parse(iso) : NaN; return x >= ws && x <= now; }
    var trucks = App.list('trucks', function (t) { return t.customerId === cid && t.status !== 'cancelled' && (inWk(t.checkedInAt) || inWk(t.doneAt)); });
    var done = trucks.filter(function (t) { return t.status === 'done'; });
    var waits = trucks.map(function (t) { return App.truckTimes(t).waitMs; }).filter(function (x) { return x !== null; });
    var works = done.map(function (t) { return App.truckTimes(t).workMs; }).filter(function (x) { return x !== null; });
    var kept = done.filter(function (t) { var x = App.truckTimes(t).totalMs; return x !== null && x <= PROMISE_MIN * 60000; }).length;
    var dmg = App.list('damage', function (d) { return d.customerId === cid && inWk(d.at); });
    return { trucks: trucks.length, done: done.length, pallets: done.reduce(function (s, t) { return s + countedPallets(t); }, 0),
      avgWait: avg(waits), avgDoor: avg(works), kept: kept, keptPct: done.length ? Math.round(kept * 100 / done.length) : null,
      damage: dmg.length, waitingDmg: dmg.filter(function (d) { return d.status === 'waiting'; }).length, approved: dmg.filter(function (d) { return d.status === 'approved' || d.status === 'auto'; }).reduce(function (s, d) { return s + App.damageTotal(d); }, 0),
      gear: App.gearOut(cid) };
  }
  function fridayText(c) {
    var w = weekStats(c.id), s = App.settings(), L = [];
    L.push('Your week with 24 HR Crossdock: ' + weekLabel());
    L.push('');
    L.push('Hi ' + c.name + ' team,');
    L.push('');
    if (w.trucks) {
      L.push('Trucks: ' + w.trucks + ' (' + w.done + ' done)');
      L.push('Pallets handled: ' + App.fmt.num(w.pallets));
      L.push('Average wait in the yard: ' + (w.avgWait === null ? 'none' : dur(w.avgWait)));
      L.push('Average time at the door: ' + (w.avgDoor === null ? 'none yet' : dur(w.avgDoor)));
      L.push('Done within our 2-hour promise: ' + (w.keptPct === null ? 'none finished yet' : w.keptPct + '% (' + w.kept + ' of ' + w.done + ')'));
    } else {
      L.push('No trucks with us this week.');
    }
    var dm = [];
    if (w.approved > 0) dm.push(App.fmt.money(w.approved) + ' in fixes approved');
    if (w.waitingDmg) dm.push(w.waitingDmg + ' waiting for your OK in the portal');
    L.push('Damage reports: ' + w.damage + (dm.length ? ' (' + dm.join(', ') + ')' : ''));
    L.push('Our gear still with you: ' + (gearText(w.gear) || 'none'));
    L.push('');
    L.push('Questions? Call or text the dock: ' + (s.phone || ''));
    L.push('Thank you for trucking with us.');
    L.push('24 HR Crossdock');
    return L.join('\n');
  }
  function fridayTo(c) {
    var out = [];
    (c.contacts || []).forEach(function (p) {
      var a = (p.alerts || {}).friday || {}, ch = [];
      if (a.text && p.phone) ch.push('text');
      if (a.email && p.email) ch.push('email');
      if (ch.length) out.push({ name: p.name, phone: p.phone, email: p.email, channels: ch });
    });
    return out;
  }
  function queuedThisWeek() {
    var ws = weekStart();
    return App.sortByTime(App.list('outbox', function (m) { return m.event === 'friday' && Date.parse(m.at) >= ws; }), 'at', 'desc');
  }
  function fridayView() {
    var all = customers(), on = all.filter(function (c) { return c.fridaySummary !== false; });
    var ws = weekStart();
    var queued = queuedThisWeek();
    var cards = all.map(function (c) {
      var w = weekStats(c.id), off = c.fridaySummary === false, to = fridayTo(c);
      var kv = [['Trucks', w.trucks ? w.trucks + ' (' + w.done + ' done)' : 'None'], ['Pallets', App.fmt.num(w.pallets)], ['Avg wait', w.avgWait === null ? '–' : dur(w.avgWait)],
        ['Avg at door', w.avgDoor === null ? '–' : dur(w.avgDoor)], ['Promise kept', w.keptPct === null ? '–' : w.keptPct + '%'],
        ['Damage', w.damage ? [plural(w.damage, 'report'), w.approved > 0 ? App.fmt.money(w.approved) + ' approved' : '', w.waitingDmg ? w.waitingDmg + ' waiting' : ''].filter(Boolean).join(' · ') : 'None'], ['Gear out', gearText(w.gear) || 'None']];
      return '<div class="card' + (off ? ' soft' : '') + '" data-friday="' + h(c.id) + '">' + cardHead(c.name, off ? '<span class="pill">Off</span>' : '<span class="pill good">On</span>') +
        (c.example ? '<div style="margin:-6px 0 8px">' + App.exampleTag(c) + '</div>' : '') +
        '<dl class="kv">' + kv.map(function (r) { return '<dt>' + h(r[0]) + '</dt><dd>' + h(r[1]) + '</dd>'; }).join('') + '</dl>' +
        '<p class="small" style="margin-top:10px">' + (off ? '<span class="muted">Friday summary is turned off for this customer.</span>'
          : to.length ? '<span class="muted">Goes to:</span> ' + h(to.map(function (r) { return r.name + ' (' + r.channels.join(' + ') + ')'; }).join(', '))
            : '<span class="warn-t">No contact has the Friday summary alert on. It will be queued with no one to send to.</span>') + '</p>' +
        '<div style="margin-top:10px"><button type="button" class="btn secondary" data-act="core.sheet" data-view="office.fridayPreview" data-p-id="' + h(c.id) + '">Preview email</button></div></div>';
    }).join('');
    /* once this week's summaries are queued, queuing again asks first (no double copies from a double click) */
    var qBtn = !on.length ? '<button type="button" class="btn primary lg" id="fr-queue" disabled>No summaries to queue</button>'
      : queued.length ? App.confirmBtn('of-fr-again', 'Queue them again', 'office.fridayQueue', { id: 'fr-queue-again' }, 'primary')
        : '<button type="button" class="btn primary lg" id="fr-queue" data-act="office.fridayQueue">' + h('Queue ' + plural(on.length, 'Friday summary', 'Friday summaries')) + '</button>';
    var body = sectionHead('Friday summaries', qBtn,
      h('This week: ' + weekLabel() + '. One email per customer, built from their trucks this week.')) +
      (queued.length ? '<div class="banner info" style="margin:8px 0"><div><b>' + h('Already queued this week: ' + plural(queued.length, 'summary', 'summaries')) + '</b><div class="small">' +
        h('Last at ' + App.fmt.dayTime(queued[0].at) + '. Queuing again adds new copies to the Outbox.') + '</div></div></div>' : '') +
      '<div class="cols" style="margin-top:14px;grid-template-columns:repeat(auto-fill,minmax(min(100%,330px),1fr))">' + (cards || '<div class="empty-state">No customers yet.</div>') + '</div>';
    return screen('office.friday', 'Friday summaries', officeSub(), body);
  }
  function fridaySheet(p) {
    var c = cust(p.id);
    if (!c) return sheetMissing();
    var to = fridayTo(c);
    return '<div class="stack">' + sheetHead('Friday email preview', h(c.name)) +
      '<div class="small"><b>To:</b> ' + h(to.length ? to.map(function (r) { return r.name + ' (' + [r.channels.indexOf('email') >= 0 ? r.email : '', r.channels.indexOf('text') >= 0 ? r.phone : ''].filter(Boolean).join(', ') + ')'; }).join('; ') : 'No contact has this alert on') + '</div>' +
      '<div class="card soft" style="white-space:pre-line" id="fr-preview">' + h(fridayText(c)) + '</div>' +
      (c.fridaySummary === false ? '<p class="small warn-t">Friday summary is off for this customer, so it will not be queued.</p>' : '') + '</div>';
  }

  /* ================= office.settings ================= */
  /* settings form. base = what the form started from: a save sends only what the office changed, and the crew list
     is always the live list with the office's adds and removes applied (forklift drivers add their own names). */
  function setInit() {
    var s = App.settings(), r = s.rates || {};
    var f = { promise: s.promise || '', waitGoalMin: String(s.waitGoalMin || 30), phone: s.phone || '', hours: s.hours || '', crewAdd: [], crewDel: [], newCrew: '', doors: {}, rates: {} };
    App.dockKeys().forEach(function (k) { f.doors[k] = String(doorsOf(k)); });
    RATES.forEach(function (x) { var v = r[x[0]]; f.rates[x[0]] = v === undefined || v === null ? (x[0] === 'newPallet' ? '25' : '') : String(v); });
    f.base = App.clone({ promise: f.promise, waitGoalMin: f.waitGoalMin, phone: f.phone, hours: f.hours, doors: f.doors, rates: f.rates });
    return f;
  }
  function crewList(f) {
    var out = (App.settings().crew || []).filter(function (n) { return !(f.crewDel || []).some(function (d) { return sameName(d, n); }); });
    (f.crewAdd || []).forEach(function (a) { if (!out.some(function (n) { return sameName(n, a); })) out.push(a); });
    return out;
  }
  /* -> {e: {field: message}, patch: fields to save} */
  function setCheck(f) {
    var e = {}, s = App.settings(), b = f.base || setInit().base, wait = Number(f.waitGoalMin), docks = {}, rates = Object.assign({}, s.rates);
    var patch = { example: false };   // saving makes these real settings, so "Clear example data" keeps them
    if (!trim(f.promise)) e.promise = 'Write the promise customers see.';
    if (!/^\d+$/.test(trim(f.waitGoalMin)) || wait < 5 || wait > 600) e.waitGoalMin = 'Use whole minutes, like 30 (5 to 600).';
    ['promise', 'phone', 'hours'].forEach(function (k) { if (trim(f[k]) !== trim(b[k])) patch[k] = trim(f[k]); });
    if (trim(f.waitGoalMin) !== trim(b.waitGoalMin)) patch.waitGoalMin = wait;
    if ((f.crewAdd || []).length || (f.crewDel || []).length) patch.crew = crewList(f);
    App.dockKeys().forEach(function (k) {
      var v = trim((f.doors || {})[k]), n = Number(v), changed = v !== trim((b.doors || {})[k]);
      if (!/^\d+$/.test(v) || n < 1 || n > 200) e['door_' + k] = '1 to 200';
      docks[k] = Object.assign({}, s.docks[k], { doors: changed ? n : doorsOf(k) });
    });
    patch.docks = docks;
    RATES.forEach(function (x) {
      var v = trim((f.rates || {})[x[0]]);
      if (!numOk(v) || v === '') e['rate_' + x[0]] = 'A dollar amount, like 15.';
      else if (v !== trim((b.rates || {})[x[0]]) || rates[x[0]] === undefined) rates[x[0]] = Number(v);
    });
    patch.rates = rates;
    return { e: e, patch: patch };
  }
  function setDirty(f) {
    var b = f.base || {};
    if ((f.crewAdd || []).length || (f.crewDel || []).length) return true;
    return ['promise', 'waitGoalMin', 'phone', 'hours', 'doors', 'rates'].some(function (k) { return JSON.stringify(b[k]) !== JSON.stringify(f[k]); });
  }
  function settingsView() {
    var fn = 'ofSet', f = App.form(fn, setInit()), e = f.tried ? setCheck(f).e : {}, s = App.settings(), dirty = setDirty(f);
    var names = crewList(f);
    var crew = names.map(function (c) {
      return '<span class="chip" style="cursor:default;padding-right:0;' + TAP + '">' + h(c) + '<button type="button" class="linkbtn" style="text-decoration:none;color:inherit;min-width:44px;min-height:44px;font-size:1.25rem" ' +
        'data-act="office.crewRemove" data-name="' + h(c) + '" aria-label="' + h('Remove ' + c) + '">&times;</button></span>';
    }).join('');
    var docks = App.dockKeys().map(function (k) {
      return '<div class="row nowrap" style="align-items:flex-end"><div class="grow"><b>' + h(App.dockName(k)) + '</b><div class="tiny muted">' + h((s.docks[k] || {}).address || '') + '</div></div>' +
        '<div style="width:110px;flex:none">' + field({ id: 'set-doors-' + k, label: 'Doors', form: fn, field: 'doors.' + k, type: 'number', mode: 'numeric', err: e['door_' + k] }) + '</div></div>';
    }).join('<hr>');
    var rates = RATES.map(function (x) {
      return field({ id: 'set-rate-' + x[0], label: x[1] + ' ($ ' + x[2] + ')', form: fn, field: 'rates.' + x[0], type: 'number', mode: 'decimal', err: e['rate_' + x[0]] });
    }).join('');
    var base = baseUrl();
    var links = [['client', 'Customer portal', 'Customers sign in with their company code.'], ['kiosk', 'Check-in kiosk', 'Open this on the computer at the dock door.'],
      ['crew', 'Forklift phones', 'Each forklift driver picks their name.'], ['office', 'Office yard board', 'This screen.'],
      ['driver', 'Driver page', 'Drivers get their own link with the truck code, like #driver4821.']].map(function (x) {
      var url = base + '#' + x[0];
      return '<div class="stack tight"><div><b>' + h(x[1]) + '</b> <span class="small muted">' + h(x[2]) + '</span></div>' +
        linkRow('lk-' + x[0], url, x[1] + ' link') + '</div>';
    }).join('');
    var exN = exampleCount();
    var saveBtn = function (id) { return '<button type="button" class="btn primary lg" id="' + id + '" data-act="office.setSave">Save settings</button>'; };
    var left =
      '<div class="card">' + cardHead('Promise and wait goal') + '<div class="stack">' +
      field({ id: 'set-promise', label: 'Our promise (customers see this)', form: fn, field: 'promise', err: e.promise }) +
      field({ id: 'set-wait', label: 'Wait goal (minutes)', form: fn, field: 'waitGoalMin', type: 'number', mode: 'numeric', err: e.waitGoalMin,
        hint: 'Wait clocks turn amber at 75% of this and red when they pass it.' }) + '</div></div>' +
      '<div class="card">' + cardHead('Forklift crew', '<span class="small muted">' + h(plural(names.length, 'name')) + '</span>') +
      '<div class="stack">' + (crew ? '<div class="chips">' + crew + '</div>' : '<p class="small muted">No names yet.</p>') +
      '<form class="row nowrap" data-submit="office.crewAdd" style="align-items:flex-end" novalidate><div class="grow">' + field({ id: 'set-newcrew', label: 'Add a name', form: fn, field: 'newCrew', placeholder: 'e.g. Maria' }) + '</div>' +
      '<button type="submit" class="btn secondary">Add</button></form></div></div>' +
      '<div class="card">' + cardHead('Docks and doors') + '<div class="stack">' + docks + '</div></div>';
    var right =
      '<div class="card">' + cardHead('Damage fix rates') + '<p class="small muted" style="margin:-4px 0 10px">The crew’s damage form starts with these prices.</p><div class="grid2 collapse">' + rates + '</div></div>' +
      '<div class="card">' + cardHead('Dock phone and hours') + '<div class="stack">' +
      field({ id: 'set-phone', label: 'Dock phone', form: fn, field: 'phone', type: 'tel' }) +
      field({ id: 'set-hours', label: 'Hours', form: fn, field: 'hours', textarea: true }) + '</div></div>' +
      '<div class="card">' + cardHead('Save') + '<div class="stack">' +
      (Object.keys(e).length ? '<div class="banner bad" role="alert"><b>Check the boxes marked in red.</b></div>' : dirty ? '<div class="banner warn"><b>You have changes that are not saved yet.</b></div>' : '<p class="small muted">Everything is saved.</p>') +
      saveBtn('set-save') + '</div></div>';
    var body = sectionHead('Settings', saveBtn('set-save-top'), 'Changes reach every screen as soon as you save.') +
      '<div style="margin-top:12px">' + twoCol(left, right, 440) + '</div>' +
      '<div style="margin-top:16px">' + twoCol(
        '<div class="card">' + cardHead('Links for each screen') + '<p class="small muted" style="margin:-4px 0 12px">Open these on the right device. Same data everywhere, live.</p><div class="stack">' + links + '</div></div>',
        '<div class="card' + (exN ? ' warn' : '') + '">' + cardHead('Example data') + '<div class="stack">' +
        '<p>' + (exN ? h('There are ' + plural(exN, 'made-up example record') + ' (companies, trucks, photos, messages) marked “Example”.') : 'No example data left. Everything here is real.') + '</p>' +
        (exN ? '<p class="small muted">Clear them before you start using the app for real. Records you added yourself are kept.</p><div>' +
          App.confirmBtn('of-clear', 'Clear example data', 'office.clearExample', { id: 'set-clear-yes' }, 'danger') + '</div>' : '') + '</div></div>', 440) + '</div>';
    return screen('office.settings', 'Settings', officeSub(), body);
  }

  /* ================= actions ================= */
  function getTruck(el) { var t = App.get('trucks', el.getAttribute('data-id')); if (!t) App.toast('That truck is no longer on the list.'); return t; }
  function cleanLoad(l, i) { return { id: 'l' + (i + 1), ref: trim(l.ref), pallets: num(l.pallets), weight: num(l.weight), pieces: 0, destination: '', stackable: false, hazmat: false, notes: '' }; }
  function cleanContact(p) { return { name: trim(p.name), role: trim(p.role), phone: trim(p.phone), email: trim(p.email), alerts: p.alerts || defaultAlerts() }; }
  function focusLater(id) { setTimeout(function () { var el = document.getElementById(id); if (el) { try { el.focus(); if (el.scrollIntoView) el.scrollIntoView({ block: 'center' }); } catch (e) { /* ignore */ } } }, 60); }

  /* check in at the window: called from office.driverSave with any details the driver corrected */
  function checkIn(t, details) {
    if (!t || !t.id) return;
    t = App.get('trucks', t.id);
    if (!t) { App.toast('That truck is no longer on the list.'); return; }
    if (t.status !== 'booked') { App.closeSheet(); App.toast('This truck is already checked in.'); return; }
    var p = App.logTruck(t, 'Checked in by the office', 'Office', Object.assign({}, details || {}, { status: 'arrived', checkedInAt: App.iso(), checkedInBy: 'office' }));
    var nt = App.get('trucks', t.id), place = App.placeInLine(nt) || 1;
    t = nt;
    App.closeSheet();
    App.notify(t.customerId, 'arrived', 'Your truck ' + (t.truckNo ? t.truckNo + ' ' : '') + (refs(t) ? '(' + refs(t) + ') ' : '') + 'checked in at ' + App.dockName(dockOf(t)) + '. Place in line: ' + place + '.', t.id);
    App.notifyCrew(nt, 'New truck in the yard: ' + companyName(t) + ', ' + plural(App.truckPallets(t), 'pallet') + '. Checked in by the office.');
    App.toast('Checked in. #' + place + ' in line. Alert queued for the customer.');
    return quiet(p);
  }

  var actions = {
    'office.nav': function (el) {
      var v = el.getAttribute('data-view');
      if (v === 'office.settings') App.resetForm('ofSet', setInit());
      App.go(v, {});
    },
    'office.dock': function (el) {
      ui.dock = el.getAttribute('data-dock') || 'all';
      try { localStorage.setItem(DOCK_KEY, ui.dock); } catch (e) { /* ignore */ }
      if (App.state.view !== 'office.board') App.go('office.board'); else App.render();
    },
    'office.openDriver': function (el) {
      var t = getTruck(el);
      if (!t) return;
      App.resetForm('ofDrv:' + t.id, driverInit(t));
      App.sheet('office.driver', { id: t.id, mode: el.getAttribute('data-mode') === 'checkin' ? 'checkin' : 'edit' });
    },
    /* check in at the window, or save changed driver and truck details (only the fields that changed) */
    'office.driverSave': function (el) {
      var t = getTruck(el);
      if (!t) return;
      var checkin = el.getAttribute('data-mode') === 'checkin', f = App.form('ofDrv:' + t.id, driverInit(t)), e = driverErrors(f);
      if (Object.keys(e).length) { f.tried = true; App.render(); return; }
      var base = driverInit(t), changed = {}, names = { driverName: 'driver name', driverCell: 'driver cell', driverLang: 'language', carrier: 'carrier', truckNo: 'truck #', trailerNo: 'trailer #', tracking: 'ETA updates', trackUrl: 'live link' };
      var keys = checkin ? ['driverName', 'driverCell', 'driverLang', 'truckNo', 'trailerNo'] : Object.keys(names);
      keys.forEach(function (k) { var v = trim(f[k]); if (v !== trim(base[k])) changed[k] = v; });
      if (!checkin && changed.tracking && changed.tracking !== 'samsara' && changed.tracking !== 'gps') changed.trackUrl = '';
      if (changed.trackUrl) changed.trackUrl = safeUrl(changed.trackUrl);
      if (checkin) return checkIn(t, changed);
      App.closeSheet();
      if (!Object.keys(changed).length) { App.toast('Nothing changed.'); return; }
      var what = Object.keys(changed).filter(function (k) { return k !== 'trackUrl' || !changed.tracking; }).map(function (k) { return names[k]; });
      var p = App.logTruck(t, 'Office updated ' + what.join(', '), 'Office', changed);
      App.toast('Saved.');
      return quiet(p);
    },
    'office.start': function (el) {
      var t = getTruck(el);
      if (!t) return;
      var fn = 'ofDoor:' + t.id, f = App.form(fn, { door: '', crew: '' });
      if (t.status !== 'arrived') { App.closeSheet(); App.toast(t.status === 'working' ? 'Already at door ' + t.door + '.' : 'This truck is not waiting in the yard.'); return; }
      var door = String(f.door || '');
      if (!door) { App.toast('Pick a door first.'); return; }
      if (busyDoors(dockOf(t), t.id)[door]) { f.door = ''; App.render(); App.toast('Door ' + door + ' just got busy. Pick another.'); return; }
      if (num(door) < 1 || num(door) > doorsOf(dockOf(t))) { f.door = ''; App.render(); App.toast('Pick one of the doors on the map.'); return; }
      var crew = trim(f.crew), verb = workVerb(t), wait = App.truckTimes(t).waitMs;
      var p = App.logTruck(t, verb + ' started at door ' + door, crew || 'Office', { status: 'working', startedAt: App.iso(), door: door, crewName: crew });
      App.notify(t.customerId, 'started', verb + ' started at door ' + door + ' at ' + App.dockName(dockOf(t)) + (wait !== null && wait >= 60000 ? '. Waited ' + dur(wait) : '') + '.', t.id);
      var drv = App.notifyDriver(t, 'Go to door ' + door + '.');
      App.resetForm(fn, { door: '', crew: '' });
      App.closeSheet();
      App.toast(verb + ' started at door ' + door + '.' + (drv ? ' Text to the driver queued.' : ''));
      return quiet(p);
    },
    'office.done': function (el) {
      App.state.confirm = null;
      var t = getTruck(el);
      if (!t) return;
      if (t.status !== 'working') { App.toast('Only a truck at a door can be marked done.'); App.render(); return; }
      var at = App.iso(), tm = App.truckTimes(Object.assign({}, t, { doneAt: at }));
      var pallets = countedPallets(t), photos = (t.photos || []).length, dm = damageFor(t).length;
      var p = App.logTruck(t, 'Done (marked by the office): ' + plural(pallets, 'pallet'), 'Office', { status: 'done', doneAt: at });
      App.notify(t.customerId, 'done', 'Done at ' + App.dockName(dockOf(t)) + ': ' + plural(pallets, 'pallet') + ', ' + plural(photos, 'photo') + ', ' + plural(dm, 'damage report') + '. Total time ' + dur(tm.totalMs) + '.', t.id);
      App.notifyDriver(t, 'All done. You can pull out.');
      App.toast('Marked done. Alerts queued.');
      return quiet(p);
    },
    'office.cancel': function (el) {
      App.state.confirm = null;
      var t = getTruck(el);
      if (!t) return;
      if (t.status !== 'booked' && t.status !== 'arrived') { App.toast('Only trucks that have not started can be cancelled.'); App.render(); return; }
      var wasIn = t.status === 'arrived';
      var p = App.logTruck(t, 'Cancelled by the office', 'Office', { status: 'cancelled', cancelledAt: App.iso() });
      App.notify(t.customerId, 'booked', 'Booking cancelled by 24 HR Crossdock: ' + (t.truckNo ? 'truck ' + t.truckNo + ', ' : '') + App.kindLabel(t).toLowerCase() + ' ' +
        App.fmt.dayTime(t.apptAt) + ' at ' + App.dockName(dockOf(t)) + ' (code ' + t.code + ').', t.id);
      if (wasIn) App.notifyCrew(t, 'Cancelled: ' + companyName(t) + ' truck left the yard (code ' + t.code + ').');
      var drv = App.notifyDriver(t, wasIn ? '24 HR Crossdock: your check-in was cancelled. Please come to the office window.'
        : '24 HR Crossdock: your ' + App.kindLabel(t).toLowerCase() + ' for ' + App.fmt.dayTime(t.apptAt) + ' at ' + App.dockName(dockOf(t)) + ' is cancelled. Please don’t come in for it.');
      App.toast('Truck cancelled. Alert queued for the customer' + (drv ? ' and a text for the driver.' : '.'));
      return quiet(p);
    },
    'office.openEta': function (el) {
      var t = getTruck(el);
      if (!t) return;
      var e = App.truckEta(t), ms = e ? Date.parse(e) : App.now() + 3600000;
      App.resetForm('ofEta:' + t.id, { date: App.localDate(ms), time: App.localTime(ms), note: '' });
      App.sheet('office.eta', { id: t.id });
    },
    'office.etaQuick': function (el) {
      var id = el.getAttribute('data-id'), f = App.form('ofEta:' + id, {}), ms = App.now() + Number(el.getAttribute('data-min')) * 60000;
      f.date = App.localDate(ms); f.time = App.localTime(ms);
      App.render();
    },
    'office.etaSave': function (el) {
      var t = getTruck(el);
      if (!t) return;
      var f = App.form('ofEta:' + t.id, {});
      if (!f.date || !f.time) { f.tried = true; App.render(); return; }
      var at = App.toIso(f.date, f.time), note = trim(f.note);
      var p = App.logTruck(t, 'ETA set to ' + App.fmt.dayTime(at) + ' by the office' + (note ? ': ' + note : ''), 'Office',
        { eta: { at: at, source: 'office', updatedAt: App.iso(), note: note } });
      App.notify(t.customerId, 'eta', 'New ETA for ' + truckWords(t) + ' (code ' + t.code + '): ' + App.fmt.dayTime(at) + '.' + (note ? ' ' + note : ''), t.id);
      App.closeSheet();
      App.toast('ETA saved. Alert queued.');
      return quiet(p);
    },
    'office.openNote': function (el) {
      var t = getTruck(el);
      if (!t) return;
      App.resetForm('ofNote:' + t.id, { notes: t.notes || '' });
      App.sheet('office.note', { id: t.id });
    },
    'office.noteSave': function (el) {
      var t = getTruck(el);
      if (!t) return;
      var notes = trim(App.form('ofNote:' + t.id, {}).notes);
      if (notes === trim(t.notes)) { App.closeSheet(); return; }
      var p = App.logTruck(t, notes ? 'Office note: ' + notes : 'Office note removed', 'Office', { notes: notes });
      App.closeSheet();
      App.toast('Note saved.');
      return quiet(p);
    },
    'office.openScan': function (el) {
      var t = getTruck(el);
      if (!t) return;
      App.resetForm('ofScan:' + t.id, { pages: [] });
      App.sheet('office.scan', { id: t.id });
    },
    'office.scanSave': function (el) {
      var t = getTruck(el);
      if (!t) return;
      if (App.anyBusy()) { App.toast('Wait for the photo to finish saving.'); return; }
      var pages = (App.form('ofScan:' + t.id, { pages: [] }).pages || []).slice();
      if (!pages.length) { App.toast('Take a photo of the paperwork first.'); return; }
      var p = App.logTruck(t, 'Paperwork scanned by the office (' + plural(pages.length, 'page') + ')', 'Office', { paperwork: (t.paperwork || []).concat(pages) });
      App.resetForm('ofScan:' + t.id, { pages: [] });
      App.closeSheet();
      App.toast(plural(pages.length, 'page') + ' saved to this truck.');
      return quiet(p);
    },
    'office.bookCust': function () {
      var f = App.form('ofBook', bookInit()), c = cust(f.customerId);
      if (c && c.dock && App.settings().docks[c.dock]) f.dock = c.dock;
      App.render();
    },
    'office.bookLoadAdd': function () {
      var f = App.form('ofBook', bookInit());
      f.loads = (f.loads || []).concat([{ ref: '', pallets: '', weight: '' }]);
      App.render();
      focusLater('bk-ref-' + (f.loads.length - 1));
    },
    'office.bookLoadRemove': function (el) {
      var f = App.form('ofBook', bookInit()), i = Number(el.getAttribute('data-i'));
      if ((f.loads || []).length < 2) return;
      f.loads = f.loads.slice(0, i).concat(f.loads.slice(i + 1));
      App.render();
    },
    'office.bookClear': function () { App.resetForm('ofBook', bookInit()); App.render(); },
    'office.bookSave': function () {
      var f = App.form('ofBook', bookInit()), e = bookErrors(f), c = cust(f.customerId);
      if (Object.keys(e).length) { f.tried = true; App.render(); try { window.scrollTo(0, 0); } catch (x) { /* ignore */ } return; }
      var loads = (f.loads || []).filter(function (l) { return trim(l.ref) || num(l.pallets) || num(l.weight); }).map(cleanLoad);
      var id = App.newId('t'), code = App.newCode(), appt = App.toIso(f.date, f.time), dk = App.settings().docks[f.dock] ? f.dock : 'reno';
      var doc = { customerId: c.id, code: code, dock: dk, kind: f.kind || 'drop', apptAt: appt, status: 'booked',
        carrier: trim(f.carrier), truckNo: trim(f.truckNo), trailerNo: trim(f.trailerNo), driverName: trim(f.driverName), driverCell: trim(f.driverCell),
        driverLang: LANG[f.driverLang] ? f.driverLang : 'en', tracking: TRACK[f.tracking] ? f.tracking : 'link',
        trackUrl: f.tracking === 'samsara' || f.tracking === 'gps' ? safeUrl(f.trackUrl) : '', loads: loads, loadOrder: false, paperwork: [], notes: trim(f.notes),
        history: [{ at: App.iso(), by: 'Office', text: 'Booked by the office for ' + c.name }], createdAt: App.iso(), createdBy: 'office' };
      var p = App.save('trucks', id, doc);
      var pal = loads.reduce(function (s, l) { return s + l.pallets; }, 0);
      App.notify(c.id, 'booked', 'Booked by 24 HR Crossdock: ' + App.kindLabel(doc).toLowerCase() + ' at ' + App.dockName(dk) + ', ' + App.fmt.dayTime(appt) +
        '. Check-in code ' + code + '. ' + plural(pal, 'pallet') + '.', id);
      App.resetForm('ofBook', bookInit());
      App.go('office.booked', { id: id });
      App.toast('Booked. Alert queued for ' + c.name + '.');
      return quiet(p);
    },
    'office.copy': function (el) {
      var text = el.getAttribute('data-text') || '', target = el.getAttribute('data-target');
      function fallback() {
        var el2 = target && document.getElementById(target);
        try {
          if (el2 && el2.select) { el2.focus(); el2.select(); }
          else if (el2 && window.getSelection) { window.getSelection().selectAllChildren(el2); }
        } catch (e) { /* ignore */ }
        App.toast('Link selected. Press Ctrl+C to copy it.');
      }
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function () { App.toast('Copied.'); }, fallback);
      } catch (e) { /* fall through */ }
      fallback();
    },
    'office.damageNote': function (el) {
      var id = el.getAttribute('data-id'), d = App.get('damage', id);
      if (!d) { App.toast('That damage report is no longer on the list.'); return; }
      var f = App.form('ofDmNote:' + id, { text: '' }), text = trim(f.text);
      if (!text) { App.toast('Type a note first.'); return; }
      var p = App.patch('damage', id, { officeNotes: (d.officeNotes || []).concat([{ at: App.iso(), by: 'Office', text: text }]) });
      f.text = '';
      App.toast('Note added.');
      return quiet(p);
    },
    'office.gearOpen': function (el) {
      App.resetForm('ofGear', { customerId: el.getAttribute('data-cust') || '', type: 'plywood', qty: 1, tags: [], note: '' });
      App.sheet('office.gearBack', {});
    },
    'office.gearSave': function () {
      var f = App.form('ofGear', {}), c = cust(f.customerId), qty = Math.max(1, Math.round(num(f.qty)));
      if (!c) { f.tried = true; App.render(); return; }
      var type = f.type || 'plywood', nm = GEAR.filter(function (x) { return x[0] === type; })[0] || GEAR[0];
      var have = num(App.gearOut(c.id)[type]);
      if (qty > have) { App.render(); App.toast('Our records show only ' + plural(have, nm[2]) + ' out with ' + c.name + '.'); return; }
      var tags = (f.tags || []).filter(function (tg) { return App.gearOut(c.id).tags.indexOf(tg) >= 0; });
      var p = App.save('gear', App.newId('g'), { customerId: c.id, truckId: null, type: type, qty: qty, dir: 'back', tags: tags, at: App.iso(), by: 'Office', note: trim(f.note) });
      App.closeSheet();
      App.toast('Logged: ' + plural(qty, nm[2]) + ' back from ' + c.name + '.');
      return quiet(p);
    },
    'office.openCust': function (el) {
      var id = el.getAttribute('data-id') || 'new', c = id === 'new' ? null : cust(id);
      App.resetForm('ofCust:' + (c ? c.id : 'new'), custInit(c));
      App.go('office.customer', { id: c ? c.id : 'new' });
    },
    'office.contactAdd': function (el) {
      var fn = el.getAttribute('data-form'), f = App.form(fn, {});
      f.contacts = (f.contacts || []).concat([{ name: '', role: '', phone: '', email: '', alerts: defaultAlerts() }]);
      App.render();
      focusLater('cu-c' + (f.contacts.length - 1) + '-name');
    },
    'office.contactRemove': function (el) {
      var fn = el.getAttribute('data-form'), f = App.form(fn, {}), i = Number(el.getAttribute('data-i'));
      f.contacts = (f.contacts || []).slice(0, i).concat((f.contacts || []).slice(i + 1));
      App.render();
    },
    'office.custSave': function (el) {
      var id = el.getAttribute('data-id') || '', c = id ? cust(id) : null, fn = 'ofCust:' + (id || 'new');
      if (id && !c) { App.toast('That customer is no longer on the list.'); return; }
      var f = App.form(fn, custInit(c)), chk = custCheck(f, id), e = chk.e, body = chk.body, name = body.name, code = body.code;
      if (Object.keys(e).length) { f.tried = true; App.render(); App.toast('Check the boxes marked in red.'); return; }
      var p;
      if (c) {
        /* send only what the office changed, so a change the customer made in their portal meanwhile is kept */
        var baseBody = custCheck(f.base || custInit(c), id).body, patch = {};
        Object.keys(body).forEach(function (k) { if (JSON.stringify(body[k]) !== JSON.stringify(baseBody[k])) patch[k] = body[k]; });
        if (patch.contacts) patch.contacts = mergeContacts(f, c);
        if (!Object.keys(patch).length) { App.toast('No changes to save.'); return; }
        p = App.patch('customers', c.id, patch);
        App.resetForm(fn, custInit(App.get('customers', c.id)));
        App.toast('Saved ' + name + '.');
        App.render();
      } else {
        var nid = App.newId('c');
        body.createdAt = App.iso();
        p = App.save('customers', nid, body);
        App.resetForm('ofCust:new', custInit(null));
        App.resetForm('ofCust:' + nid, custInit(App.get('customers', nid)));
        App.go('office.customer', { id: nid });
        App.toast('Added ' + name + '. Their portal code is ' + code + '.');
      }
      return quiet(p);
    },
    'office.fridayQueue': function (el) {
      App.state.confirm = null;
      /* the first-time button is stale once this week's are queued (second click of a double click): only "Yes, queue them again" adds copies */
      if (el && el.id === 'fr-queue' && queuedThisWeek().length) return;
      var list = customers().filter(function (c) { return c.fridaySummary !== false; });
      if (!list.length) { App.toast('No customers have the Friday summary turned on.'); return; }
      list.forEach(function (c) { App.notify(c.id, 'friday', fridayText(c)); });
      App.toast(plural(list.length, 'Friday summary', 'Friday summaries') + ' queued. See them in the Outbox.');
    },
    'office.crewAdd': function () {
      var f = App.form('ofSet', setInit()), name = trim(f.newCrew).replace(/\s+/g, ' ');
      if (!name) { App.toast('Type a name first.'); return; }
      if (crewList(f).some(function (c) { return sameName(c, name); })) { App.toast(name + ' is already on the crew.'); return; }
      var wasDel = (f.crewDel || []).some(function (d) { return sameName(d, name); });
      f.crewDel = (f.crewDel || []).filter(function (d) { return !sameName(d, name); });
      if (!wasDel || !(App.settings().crew || []).some(function (c) { return sameName(c, name); })) f.crewAdd = (f.crewAdd || []).concat([name]);
      f.newCrew = '';
      App.render();
    },
    'office.crewRemove': function (el) {
      var f = App.form('ofSet', setInit()), name = el.getAttribute('data-name') || '';
      var added = (f.crewAdd || []).some(function (a) { return sameName(a, name); });
      f.crewAdd = (f.crewAdd || []).filter(function (a) { return !sameName(a, name); });
      if (!added || (App.settings().crew || []).some(function (c) { return sameName(c, name); })) f.crewDel = (f.crewDel || []).concat([name]);
      App.render();
    },
    'office.setSave': function () {
      var f = App.form('ofSet', setInit()), chk = setCheck(f);
      if (Object.keys(chk.e).length) { f.tried = true; App.render(); App.toast('Check the boxes marked in red.'); return; }
      if (!setDirty(f)) { App.toast('Nothing changed, so nothing to save.'); return; }
      var p = App.patch('settings', 'main', chk.patch);
      App.resetForm('ofSet', setInit());
      App.toast('Settings saved.');
      return quiet(p);
    },
    'office.clearExample': function () {
      App.state.confirm = null;
      var jobs = [], n = 0;
      COLLS.forEach(function (c) {
        App.list(c, function (d) { return d.example === true; }).forEach(function (d) { jobs.push(quiet(App.remove(c, d.id))); n++; });
      });
      App.resetForm('ofSet', setInit());
      App.toast(n ? 'Removed ' + plural(n, 'example record') + '. Your own records were kept.' : 'There was no example data left.');
      return Promise.all(jobs);
    }
  };

  App.register({
    'office.board': boardView,
    'office.truck': truckView,
    'office.door': doorSheet,
    'office.eta': etaSheet,
    'office.driver': driverSheet,
    'office.note': noteSheet,
    'office.scan': scanSheet,
    'office.photo': photoSheet,
    'office.book': bookView,
    'office.booked': bookedView,
    'office.damage': damageView,
    'office.damageItem': damageSheet,
    'office.gear': gearView,
    'office.gearBack': gearSheet,
    'office.customers': customersView,
    'office.customer': customerView,
    'office.outbox': outboxView,
    'office.friday': fridayView,
    'office.fridayPreview': fridaySheet,
    'office.settings': settingsView
  }, actions);

  /* live clocks: every second tick the wait / door clocks and the wall clock without redrawing.
     When a clock crosses the amber or red line, redraw so cards and tiles change color right away. */
  setInterval(function () {
    if (App.state.role !== 'office' || document.hidden) return;
    var now = App.now(), again = false, els = document.querySelectorAll('[data-of-since]'), i;
    for (i = 0; i < els.length; i++) {
      var el = els[i], s = Date.parse(el.getAttribute('data-of-since'));
      if (isNaN(s)) continue;
      el.textContent = el.getAttribute('data-of-fmt') === 'min' ? dur(now - s) : liveDur(now - s);
      var tk = el.getAttribute('data-of-tk');
      if (tk && toneFor(tk, now - s) !== el.getAttribute('data-of-tone')) again = true;
    }
    var clocks = document.querySelectorAll('[data-of-now]');
    for (i = 0; i < clocks.length; i++) clocks[i].textContent = App.fmt.time(App.iso(now));
    if (again) App.render();
  }, 1000);
})();
