/* 24 HR Dock: forklift crew (the phone in a gloved hand). Big buttons, few words, live clocks.
   Registers every crew.* view and action described in app/CONTRACT.md ("crew").
   Views only read App data and form drafts. Every write happens inside an action.
   Views: crew.signin, crew.home, crew.truck, crew.doors (sheet), crew.photo (sheet), crew.work,
          crew.damage, crew.secure, crew.done, crew.gear */
(function () {
  'use strict';
  var App = window.App;
  var h = App.h;

  /* ================= constants ================= */
  var DMG_KINDS = ['Crushed', 'Torn wrap', 'Leaning', 'Wet', 'Broken pallet', 'Missing boxes', 'Other'];
  var GEAR = [
    { key: 'plywood', label: 'Plywood sheets', one: 'plywood sheet', many: 'plywood sheets', typical: 'Usually 5 to 6' },
    { key: 'bars', label: 'Load bars', one: 'load bar', many: 'load bars', typical: 'Usually 2' },
    { key: 'straps', label: 'Straps', one: 'strap', many: 'straps', typical: 'Usually 4' },
    { key: 'airbags', label: 'Airbags', one: 'airbag', many: 'airbags', typical: 'Only when there is a gap' }
  ];
  var SEC_PHOTOS = [
    { key: 'nose', label: 'Nose', sub: 'Front of trailer' },
    { key: 'middle', label: 'Middle', sub: 'Middle of load' },
    { key: 'tail', label: 'Tail', sub: 'At the doors' },
    { key: 'closeup', label: 'Close-up', sub: 'Bars / straps' },
    { key: 'seal', label: 'Seal', sub: 'Number showing' }
  ];
  var CONF = ['', 'Not safe', 'Needs work', 'OK', 'Solid', 'Rock solid'];
  var CONF_SUB = ['', 'Do not let it leave like this', 'Something could still move', 'It holds, but could be better', 'Tight. Nothing moves', 'Could not be better'];
  var LANG_EN = { en: 'English', es: 'Spanish', ru: 'Russian', uk: 'Ukrainian', pa: 'Punjabi', hi: 'Hindi' };
  var NEW_MS = 5 * 60000;
  /* bigger touch targets for gloves (core stepper buttons are 46 px) */
  var STEP_BTN = ' style="width:56px;min-height:56px"';
  var TALL = ' style="min-height:52px"';

  /* ================= who and where ================= */
  var crewDock = null;
  try { crewDock = localStorage.getItem('dock24:crewDock') || null; } catch (e) { crewDock = null; }
  function myDock() {
    var keys = App.dockKeys();
    return keys.indexOf(crewDock) >= 0 ? crewDock : keys[0];
  }
  function me() { return App.state.crewName || ''; }
  function whoWhere() { return me() + ' · ' + App.dockName(myDock()); }
  /* "Alex · Middletown" for the narrow title line (full dock name goes in the line under it) */
  function whoCity() { return me() + ' · ' + String(App.dockName(myDock())).split(',')[0]; }

  /* ================= small helpers ================= */
  function trim(v) { return v === undefined || v === null ? '' : String(v).trim(); }
  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }
  function plural(n, one, many) { return App.fmt.num(n) + ' ' + (Number(n) === 1 ? one : (many || one + 's')); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function money(n) { return App.fmt.money(n); }
  function cap(s) { s = String(s || ''); return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function joinAnd(list) {
    if (list.length < 2) return list.join('');
    return list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
  }
  function idPart(s) { return String(s === undefined || s === null ? '' : s).replace(/[^A-Za-z0-9_-]/g, '-'); }

  /* ================= drafts that survive a reload =================
     Work, damage and securement drafts are kept in this phone's localStorage (a per-device convenience),
     so a reload (phones often reload the page after the camera opens) keeps counts and photos already taken.
     They are saved by the 1-second ticker below and dropped on save, cancel, or when the truck is no longer at a door. */
  var DRAFT_KEY = 'dock24:crewDrafts', DRAFT_RE = /^(work|dmg|sec):(.+)$/;
  var drafts = {}, draftsJson = '{}';
  try { drafts = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}') || {}; draftsJson = JSON.stringify(drafts); } catch (e) { drafts = {}; }
  function draftForm(name, init) {
    if (!App.state.forms[name] && drafts[name] && typeof drafts[name] === 'object') App.state.forms[name] = App.clone(drafts[name]);
    return App.form(name, init);
  }
  function writeDrafts(next) {
    var s = JSON.stringify(next);
    if (s === draftsJson) return;
    drafts = next; draftsJson = s;
    try { if (s === '{}') localStorage.removeItem(DRAFT_KEY); else localStorage.setItem(DRAFT_KEY, s); } catch (e) { /* storage blocked: memory only */ }
  }
  function saveDrafts() {
    if (!App.loaded.trucks) return;
    var next = {};
    function keep(k, v) {
      var m = DRAFT_RE.exec(k), t = m && App.get('trucks', m[2]);
      if (t && t.status === 'working' && v && typeof v === 'object') next[k] = v;
    }
    Object.keys(drafts).forEach(function (k) { keep(k, drafts[k]); });
    Object.keys(App.state.forms || {}).forEach(function (k) { if (DRAFT_RE.test(k)) keep(k, App.state.forms[k]); });
    writeDrafts(JSON.parse(JSON.stringify(next)));
  }
  function dropForm(name) {
    delete App.state.forms[name];
    if (drafts[name]) { var next = Object.assign({}, drafts); delete next[name]; writeDrafts(next); }
  }
  /* ticking clock text: "22m 05s", "1h 02m" */
  function clockText(ms) {
    var s = Math.max(0, Math.floor((ms || 0) / 1000)), hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
    return hh ? hh + 'h ' + pad2(mm) + 'm' : mm + 'm ' + pad2(ss) + 's';
  }
  /* a live clock counting up from iso (ticked every second below) */
  function liveClock(iso, cls, size) {
    if (!iso) return '<span class="clock">–</span>';
    return '<span class="clock num ' + (cls || '') + '" data-cr-since="' + h(iso) + '" style="font-size:' + (size || '1.2rem') + ';line-height:1.05;white-space:nowrap">' +
      h(clockText(App.now() - Date.parse(iso))) + '</span>';
  }
  function custOf(t) { return t && t.customerId ? App.get('customers', t.customerId) : null; }
  function company(t) { var c = custOf(t); return (c && c.name) || trim(t.walkInCompany) || 'Walk-in truck'; }
  function isWalkIn(t) { return !!(t && (t.walkIn || !custOf(t))); }
  function companyHtml(t) { var c = custOf(t); return h(company(t)) + App.exampleTag(c || t) + (isWalkIn(t) ? ' <span class="pill">Walk-in</span>' : ''); }
  function truckName(t) { return trim(t.truckNo) ? 'Truck ' + trim(t.truckNo) : 'No truck #'; }
  /* history / alert verb (contract: "Unloading started" / "Loading started") */
  function verbing(t) { return t.kind === 'pick' ? 'Loading' : 'Unloading'; }
  /* what the crew is doing, for screen labels */
  function doing(t) { return t.kind === 'pick' ? 'Loading' : t.kind === 'both' ? 'Unloading + loading' : 'Unloading'; }
  /* only real web links become links (never javascript: and friends) */
  function safeUrl(u) { u = trim(u); return /^https?:\/\/[^\s"'<>]+$/i.test(u) ? u : ''; }
  /* view-only viewers: say so instead of pretending to save */
  function readOnly() {
    if (App.state.canWrite !== false) return false;
    App.toast('This page is view-only. Changes can’t be saved here.');
    return true;
  }
  function dockOf(t) { return t.dock || 'reno'; }
  function refsOf(t) { return (t.loads || []).map(function (l) { return trim(l.ref); }).filter(Boolean); }
  function refsText(t) {
    var r = refsOf(t);
    return r.length > 2 ? r.slice(0, 2).join(', ') + ' +' + (r.length - 2) + ' more' : r.join(', ');
  }
  /* a name for the load in messages: "PO-55120", else "truck 42", else "the walk-in load" */
  function loadName(t) { return refsText(t) || (trim(t.truckNo) ? 'truck ' + trim(t.truckNo) : isWalkIn(t) ? 'the walk-in load' : 'the load'); }
  function doorsAt(dock) { var d = App.settings().docks[dock] || {}; return Math.max(1, Math.min(200, Math.round(Number(d.doors)) || 4)); }
  /* door -> truck working there now */
  function busyDoors(dock, exceptId) {
    var m = {};
    App.list('trucks', function (t) { return t.status === 'working' && dockOf(t) === dock && t.id !== exceptId && trim(t.door); })
      .forEach(function (t) { m[trim(t.door)] = t; });
    return m;
  }
  function atDoors(dock) {
    return App.list('trucks', function (t) { return t.status === 'working' && dockOf(t) === dock; })
      .sort(function (a, b) { return (parseFloat(a.door) || 999) - (parseFloat(b.door) || 999); });
  }
  /* booked trucks due today (or overdue within a day) at this dock, soonest first */
  function comingToday(dock) {
    var now = App.now();
    return App.list('trucks', function (t) {
      if (t.status !== 'booked' || dockOf(t) !== dock) return false;
      var e = App.truckEta(t);
      if (!e) return false;
      var ms = Date.parse(e);
      return App.isToday(e) || (ms < now && now - ms < 864e5);
    }).sort(function (a, b) { return Date.parse(App.truckEta(a)) - Date.parse(App.truckEta(b)); });
  }
  /* stable form key for a load (ids become form paths, so keep them simple) */
  function loadKey(l, i) { return l && l.id && /^[A-Za-z0-9_-]+$/.test(String(l.id)) ? String(l.id) : 'i' + i; }
  function langName(code) {
    var en = LANG_EN[code] || code || '';
    var nat = (App.LANGS || []).filter(function (l) { return l.code === code; })[0];
    return nat && code !== 'en' && nat.name !== en ? en + ' (' + nat.name + ')' : en;
  }
  function stateAbbr(d) { var m = /,\s*([A-Z]{2})\b/.exec((d && d.name) || ''); return m ? m[1] : ((d && d.name) || '?').slice(0, 2).toUpperCase(); }
  /* driver texts: English, plus the driver's language when the kiosk strings have it */
  function driverText(t, key, vars, en) {
    var lang = t.driverLang, dict = lang && lang !== 'en' && App.strings ? App.strings[lang] : null, s = dict && dict[key];
    if (!s) return en;
    Object.keys(vars || {}).forEach(function (k) { s = s.split('{' + k + '}').join(vars[k]); });
    return en + ' / ' + s;
  }
  /* compact duration for stat tiles: "18m", "1h 05m" */
  function shortDur(ms) { var m = Math.round(Math.max(0, ms) / 60000); return m < 60 ? m + 'm' : Math.floor(m / 60) + 'h ' + pad2(m % 60) + 'm'; }
  var MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  /* "6:50 AM" today, else "Oct 25" */
  function shortWhen(iso) { if (!iso) return ''; if (App.isToday(iso)) return App.fmt.time(iso); var d = new Date(iso); return MON3[d.getMonth()] + ' ' + d.getDate(); }
  function confTone(c) { return c >= 4 ? 'good' : c === 3 ? 'warn' : 'bad'; }
  function countedPallets(t) {
    var c = t.counts || {}, keys = Object.keys(c);
    if (!keys.length) return null;
    return keys.reduce(function (s, k) { return s + num(c[k]); }, 0);
  }

  /* ================= screen pieces ================= */
  function screen(title, opts, body, tab) {
    return App.topbar(title, opts) + '<main class="body stack loose">' + body + '</main>' + (tab ? tabs(tab) : '');
  }
  function tabs(cur) {
    var waiting = App.loaded.trucks ? App.queue(myDock()).length : 0;
    return App.tabbar([
      { view: 'crew.home', label: 'Queue', icon: '&#128666;', badge: waiting || '' },
      { view: 'crew.done', label: 'Done today', icon: '&#10004;' },
      { view: 'crew.gear', label: 'Gear', icon: '&#128295;' }
    ], cur);
  }
  function switchBtn() { return '<button type="button" class="tb-btn" style="min-height:44px" data-act="crew.switch" aria-label="Switch person or dock">Switch</button>'; }
  function head(title, right, tag) {
    tag = tag || 'h2';
    return '<div class="row between"><' + tag + '>' + title + '</' + tag + '>' + (right || '') + '</div>';
  }
  function stat(value, label, tone) {
    return '<div class="stat" style="flex:1"><b class="' + (tone ? tone + '-t' : '') + '">' + h(value) + '</b><span>' + h(label) + '</span></div>';
  }
  function empty(title, sub) {
    return '<div class="empty-state"><b>' + h(title) + '</b>' + (sub ? '<div class="small">' + h(sub) + '</div>' : '') + '</div>';
  }
  function sheetHead(title) {
    return '<div class="row between nowrap"><h2>' + h(title) + '</h2><button type="button" class="btn ghost" data-act="core.closeSheet">Close</button></div>';
  }
  /* "Still missing" line + the checklist used on every save/finish button */
  function missingLine(missing, okText) {
    if (!missing.length) return '<p class="good-t bold" role="status">&#10003; ' + h(okText) + '</p>';
    return '<p class="bad-t bold" role="status">Still missing: ' + h(joinAnd(missing)) + '.</p>';
  }
  function notFound(what) {
    return screen(what + ' not found', { back: 'crew.home' },
      '<div class="empty-state"><b>We can’t find that ' + h(what.toLowerCase()) + '.</b><div class="small">It may have been removed by the office.</div></div>' +
      '<button type="button" class="btn secondary lg block" data-act="core.home">Back to the queue</button>');
  }
  function gate() {
    if (!App.loaded.trucks || !App.loaded.settings) return App.topbar('Forklift', {}) + '<main class="body"><div class="empty-state">Loading the queue…</div></main>';
    if (!me()) return signinView();
    return '';
  }
  function thumbButton(ref, label) {
    return '<button type="button" class="linkbtn" style="display:block;width:100%" data-act="core.sheet" data-view="crew.photo" data-p-ref="' + h(ref) +
      '" data-p-label="' + h(label) + '" aria-label="' + h('Open ' + label) + '">' + App.photoTag(ref, label) + '</button>';
  }
  function thumbs(refs, label) {
    return '<div class="thumbs">' + refs.map(function (r, i) { return thumbButton(r, label + (refs.length > 1 ? ' ' + (i + 1) : '')); }).join('') + '</div>';
  }
  function damageStatus(d) {
    var s = { waiting: ['Waiting for customer', 'warn'], approved: ['Approved', 'good'], declined: ['Declined', 'bad'], auto: ['Auto-approved', 'good'] }[d.status] || [d.status || '', ''];
    return '<span class="pill ' + s[1] + '">' + h(s[0]) + '</span>';
  }
  function damageList(t) {
    var list = App.sortByTime(App.list('damage', function (d) { return d.truckId === t.id; }), 'at', 'asc');
    if (!list.length) return '';
    return '<div class="stack tight">' + list.map(function (d) {
      var ph = (d.photos || [])[0];
      return '<div class="card tight flat bad"><div class="row nowrap top">' +
        (ph ? '<div style="width:64px;flex:none">' + thumbButton(ph, 'Damage photo') + '</div>' : '') +
        '<div class="grow" style="min-width:0"><div class="row between"><b>' + h(d.ref || 'Load') + '</b>' + damageStatus(d) + '</div>' +
        '<div class="small muted">' + h(plural(num(d.pallets), 'pallet') + ' · ' + (d.kinds || []).join(', ')) + '</div>' +
        '<div class="small muted">' + h('Fix ' + money(App.damageTotal(d)) + ' · ' + plural((d.photos || []).length, 'photo') + ' · ' + (d.by || '') + ' ' + shortWhen(d.at)) + '</div></div></div></div>';
    }).join('') + '</div>';
  }

  /* ================= sign in ================= */
  function signinView() {
    if (!App.loaded.settings) return App.topbar('Forklift', {}) + '<main class="body"><div class="empty-state">Loading…</div></main>';
    var s = App.settings(), crew = (s.crew || []).filter(function (n) { return trim(n); });
    var f = App.form('crewSignin', { name: me(), dock: crewDock || '', newName: '' });
    var names = crew.map(function (n) {
      var on = f.name === n;
      return '<button type="button" class="choice' + (on ? ' on' : '') + '" data-act="core.set" data-form="crewSignin" data-field="name" data-value="' + h(n) +
        '" aria-pressed="' + on + '"><span class="ci clock" aria-hidden="true">' + (on ? '&#10003;' : h(n.charAt(0).toUpperCase())) + '</span><span class="ct"><b>' + h(n) + '</b>' +
        (on ? '<span>That’s me</span>' : '') + '</span></button>';
    }).join('');
    var docks = App.dockKeys().map(function (k) {
      var d = s.docks[k] || {}, on = f.dock === k, w = App.queue(k).length;
      return '<button type="button" class="choice' + (on ? ' on' : '') + '" data-act="core.set" data-form="crewSignin" data-field="dock" data-value="' + h(k) +
        '" aria-pressed="' + on + '"><span class="ci clock" aria-hidden="true">' + h(stateAbbr(d)) + '</span><span class="ct"><b>' + h(d.name || k) + '</b><span>' +
        h(plural(doorsAt(k), 'door') + ' · ' + (w ? w + ' waiting now' : 'nobody waiting')) + '</span></span>' + (on ? '<span class="bold" aria-hidden="true">&#10003;</span>' : '') + '</button>';
    }).join('');
    var missing = [];
    if (!f.name) missing.push('tap your name');
    if (!f.dock) missing.push('pick your dock');
    var body =
      '<section class="stack"><h1>Who’s driving the forklift?</h1>' +
      (names ? '<div class="grid2">' + names + '</div>' : empty('No crew names yet.', 'Add your name below.')) +
      '<form class="row nowrap" style="align-items:flex-end" data-submit="crew.addName" autocomplete="off">' +
      '<div class="field grow"><label for="cr-newname">Not on the list? Add your name</label>' +
      '<input id="cr-newname" type="text" maxlength="30" autocomplete="off" autocapitalize="words" placeholder="Your first name" data-form="crewSignin" data-field="newName" value="' + App.val('crewSignin', 'newName') + '"></div>' +
      '<button type="submit" class="btn secondary lg">Add</button></form></section>' +
      '<section class="stack"><h2>Which dock are you at?</h2><div class="stack tight">' + docks + '</div></section>' +
      '<section class="stack">' + (missing.length ? '<p class="muted bold">To start: ' + h(joinAnd(missing)) + '.</p>' : '') +
      '<button type="button" class="btn primary lg block" data-act="crew.signin"' + (missing.length ? ' disabled' : '') + '>' +
      (f.name && f.dock ? 'Start: ' + h(f.name) + ' at ' + h(App.dockName(f.dock)) : 'Go to the queue') + '</button>' +
      '<p class="small muted center">Prototype: real sign-in comes later. This phone remembers you.</p></section>';
    return screen('Forklift sign-in', me() ? { back: 'crew.home', sub: 'Pick your name and dock' } : { sub: 'Pick your name and dock' }, body);
  }

  /* ================= queue (home) ================= */
  function waitCard(t, pos) {
    var ms = App.truckTimes(t).waitMs || 0, tone = App.waitTone(ms);
    var isNew = t.checkedInAt && App.now() - Date.parse(t.checkedInAt) < NEW_MS, pages = (t.paperwork || []).length;
    return '<div class="card link stack tight ' + tone + '" role="button" tabindex="0" data-act="core.go" data-view="crew.truck" data-p-id="' + h(t.id) + '" data-truck="' + h(t.id) + '">' +
      '<div class="row between nowrap"><div class="row" style="gap:6px"><span class="pill accent">#' + pos + (pos === 1 ? ' · next up' : ' in line') + '</span>' +
      (isNew ? '<span class="pill info">NEW</span>' : '') + '</div>' +
      '<div class="right" style="flex:none">' + liveClock(t.checkedInAt, tone + '-t', '1.7rem') + '<div class="tiny muted">waiting</div></div></div>' +
      '<div><b class="big">' + companyHtml(t) + '</b></div>' +
      '<div class="small muted">' + h(App.kindLabel(t) + ' · ' + plural(App.truckPallets(t), 'pallet') + ' · ' + truckName(t)) + '</div>' +
      '<div class="small ' + (pages ? 'muted' : 'warn-t') + '">' + (pages ? '&#128196; ' + h(plural(pages, 'paperwork page')) : 'No paperwork scanned yet') + '</div></div>';
  }
  function doorCard(t) {
    return '<div class="card link accent" role="button" tabindex="0" data-act="core.go" data-view="crew.work" data-p-id="' + h(t.id) + '" data-truck="' + h(t.id) + '">' +
      '<div class="row nowrap top" style="gap:14px">' +
      '<div class="center" style="flex:none;min-width:52px"><div class="tiny muted bold">DOOR</div><div class="clock" style="font-size:2.4rem;line-height:1">' + h(t.door || '?') + '</div></div>' +
      '<div class="grow stack tight" style="min-width:0"><b class="big">' + companyHtml(t) + '</b>' +
      '<div class="small muted">' + h(doing(t) + ' · ' + (t.crewName || 'crew') + ' · ' + plural(App.truckPallets(t), 'pallet')) + '</div>' +
      '<div class="row" style="gap:8px">' + liveClock(t.startedAt, '', '1.35rem') + '<span class="small muted">at the door</span></div></div></div></div>';
  }
  function comingCard(t) {
    var e = App.truckEta(t), late = Date.parse(e) < App.now(), src = t.eta && t.eta.at ? 'ETA' : 'Booked time';
    return '<div class="card tight link" role="button" tabindex="0" data-act="core.go" data-view="crew.truck" data-p-id="' + h(t.id) + '">' +
      '<div class="row nowrap top"><div style="flex:none;min-width:76px"><b class="num">' + h(App.fmt.time(e)) + '</b><div class="tiny muted">' + h(src) + '</div></div>' +
      '<div class="grow" style="min-width:0"><b>' + companyHtml(t) + '</b><div class="small muted">' + h(App.kindLabel(t) + ' · ' + plural(App.truckPallets(t), 'pallet') + ' · ' + truckName(t)) + '</div></div>' +
      (late ? '<span class="pill warn">Late ' + h(App.fmt.dur(App.now() - Date.parse(e))) + '</span>' : '') + '</div></div>';
  }
  function homeView() {
    var g = gate(); if (g) return g;
    var dock = myDock(), q = App.queue(dock), work = atDoors(dock), coming = comingToday(dock), doors = doorsAt(dock);
    var free = 0, busy = busyDoors(dock), i;
    for (i = 1; i <= doors; i++) if (!busy[String(i)]) free++;
    var body =
      '<div class="row nowrap">' + stat(q.length, 'Waiting', q.length ? 'warn' : '') + stat(work.length, 'At doors') + stat(free, 'Doors free', free ? 'good' : 'bad') + '</div>' +
      '<section class="stack" aria-label="Waiting in yard">' + head('Waiting in yard', q.length ? '<span class="small muted">Longest wait first</span>' : '') +
      (q.length ? q.map(function (t, k) { return waitCard(t, k + 1); }).join('') : empty('No trucks waiting.', 'New check-ins show up here by themselves.')) + '</section>' +
      '<section class="stack" aria-label="At the doors">' + head('At the doors', work.length ? '<span class="small muted">Tap to keep working</span>' : '') +
      (work.length ? work.map(doorCard).join('') : empty('All doors are free.', 'Start a truck from the list above.')) + '</section>' +
      '<section class="stack" aria-label="Coming today">' + head('Coming today') +
      (coming.length ? coming.map(comingCard).join('') : empty('No more bookings today.', 'Walk-ins still check in at the kiosk.')) + '</section>';
    return screen(whoCity(), { sub: App.dockName(dock) + ' · live queue', right: switchBtn() }, body, 'crew.home');
  }

  /* ================= truck detail ================= */
  function heroFor(t) {
    var top = '<div class="small muted">' + h([App.kindLabel(t), App.truckPallets(t) ? plural(App.truckPallets(t), 'pallet') : 'pallets not listed', App.truckWeight(t) ? App.fmt.num(App.truckWeight(t)) + ' lbs' : ''].filter(Boolean).join(' · ')) + '</div>';
    var tt = App.truckTimes(t);
    if (t.status === 'arrived') {
      var pos = App.placeInLine(t), tone = App.waitTone(tt.waitMs);
      return '<div class="hero stack">' + top + '<div class="row between nowrap top"><div><div class="muted small">Waiting in yard</div>' +
        '<div class="row nowrap" style="gap:8px;align-items:baseline"><span class="clock" style="font-size:2.6rem;line-height:1">' + (pos ? '#' + pos : '–') + '</span><span class="muted">in line</span></div></div>' +
        '<div class="right"><div class="muted small">Waited</div>' + liveClock(t.checkedInAt, '', '1.7rem') + '</div></div>' +
        (tone === 'bad' ? '<div><span class="pill bad">Over the ' + h(App.settings().waitGoalMin || 30) + ' min wait goal</span></div>' : '') + '</div>';
    }
    if (t.status === 'working') {
      return '<div class="hero stack">' + top + '<div class="row between nowrap top"><div><div class="muted small">' + h(doing(t) + ' · ' + (t.crewName || 'crew')) + '</div>' +
        '<div class="clock" style="font-size:2.4rem;line-height:1;white-space:nowrap">Door ' + h(t.door || '?') + '</div></div>' +
        '<div class="right"><div class="muted small">At the door</div>' + liveClock(t.startedAt, '', '1.7rem') + '</div></div></div>';
    }
    if (t.status === 'done') {
      return '<div class="hero stack">' + top + '<div class="clock" style="font-size:2.2rem;line-height:1">Done ' + h(App.fmt.time(t.doneAt)) + '</div>' +
        '<div class="muted small">' + h(['Waited ' + App.fmt.dur(tt.waitMs), 'at the door ' + App.fmt.dur(tt.workMs), 'total ' + App.fmt.dur(tt.totalMs)].join(' · ')) + '</div></div>';
    }
    if (t.status === 'booked') {
      var e = App.truckEta(t), eta = t.eta && t.eta.at ? t.eta : null;
      return '<div class="hero stack">' + top + '<div class="muted small">Not checked in yet</div>' +
        '<div class="clock" style="font-size:2.2rem;line-height:1">' + h(e ? (eta ? 'ETA ' : 'Due ') + App.fmt.dayTime(e) : 'No time set') + '</div>' +
        (eta ? '<div class="muted small">' + h(etaSource(eta)) + '</div>' : '') + '</div>';
    }
    return '<div class="hero stack">' + top + '<div class="clock" style="font-size:2.2rem;line-height:1">Cancelled</div></div>';
  }
  /* "From the driver, updated 20 min ago" */
  function etaSource(eta) {
    var src = { driver: 'From the driver', client: 'From the customer', office: 'From the office', samsara: 'From Samsara', gps: 'From GPS' }[eta.source] || 'ETA';
    return src + (eta.updatedAt ? ', updated ' + App.fmt.ago(eta.updatedAt) : '') + (trim(eta.note) ? '. Note: ' + trim(eta.note) : '');
  }
  function primaryFor(t) {
    if (t.status === 'arrived') {
      return '<div class="stack tight"><button type="button" class="btn primary lg block" data-act="core.sheet" data-view="crew.doors" data-p-id="' + h(t.id) + '">' +
        (t.kind === 'pick' ? 'Start loading at door…' : 'Start at door…') + '</button>' +
        '<p class="small muted center">' + (trim(t.driverCell) ? 'Pick a free door. We’ll text the driver the door number.' : 'Pick a free door. No driver cell on file, so wave the driver in.') + '</p></div>';
    }
    if (t.status === 'working') {
      return '<button type="button" class="btn primary lg block" data-act="core.go" data-view="crew.work" data-p-id="' + h(t.id) + '">Open work screen</button>';
    }
    if (t.status === 'booked') {
      return '<div class="banner info"><div><b>Not here yet.</b> The driver checks in at the kiosk. Then this truck moves to <b>Waiting in yard</b>.</div></div>';
    }
    if (t.status === 'done') {
      var c = countedPallets(t), s = t.secure;
      return '<div class="banner good"><div><b>Finished by ' + h(t.crewName || 'crew') + '.</b> ' +
        h((c !== null ? c + ' of ' + App.truckPallets(t) + ' pallets counted · ' : '') + plural((t.photos || []).length, 'photo') +
          (s && s.confidence ? ' · secured ' + s.confidence + ' of 5' : '')) + '</div></div>';
    }
    return '';
  }
  function loadsCard(t) {
    var loads = t.loads || [];
    if (!loads.length) return '<section class="card stack"><h3>Loads</h3><p class="muted">No loads listed. Check the paperwork.</p></section>';
    return '<section class="card stack"><div class="row between"><h3>Loads</h3><span class="small muted">' + h(plural(loads.length, 'load') + ' · ' + plural(App.truckPallets(t), 'pallet')) + '</span></div>' +
      loads.map(function (l, i) {
        var line = [plural(num(l.pallets), 'pallet'), num(l.weight) ? App.fmt.num(l.weight) + ' lbs' : '', num(l.pieces) ? plural(num(l.pieces), 'piece') : '', trim(l.destination)].filter(Boolean).join(' · ');
        return (i ? '<hr>' : '') + '<div class="row nowrap top">' + (t.loadOrder && loads.length > 1 ? '<span class="pill accent" title="Work order">' + (i + 1) + '</span>' : '') +
          '<div class="grow stack tight" style="min-width:0"><b class="big">' + h(l.ref || 'No reference') + '</b><div class="small muted">' + h(line) + '</div>' +
          (trim(l.notes) ? '<div class="small"><b>Note:</b> ' + h(l.notes) + '</div>' : '') +
          '<div class="row" style="gap:6px">' + (l.hazmat ? '<span class="pill bad">Hazmat</span>' : '') +
          (l.stackable ? '<span class="pill info">Stackable</span>' : '<span class="pill warn">Do not stack</span>') + '</div></div></div>';
      }).join('') +
      (t.loadOrder && loads.length > 1 ? '<p class="small muted">Work the loads in this order.</p>' : '') + '</section>';
  }
  function driverCard(t) {
    var rows = [['Driver', t.driverName], ['Speaks', langName(t.driverLang)], ['Driver cell', t.driverCell], ['Carrier', t.carrier],
      ['Truck #', t.truckNo], ['Trailer #', t.trailerNo], ['Check-in code', t.code]];
    if (t.checkedInAt) rows.push(['Checked in', App.fmt.time(t.checkedInAt) + (t.checkedInBy === 'office' ? ' (office)' : ' (kiosk)')]);
    var trk = { link: 'Driver ETA link', samsara: 'Samsara', gps: 'GPS share link', self: 'Customer updates it', none: '' }[t.tracking || 'none'];
    if (trk && t.status === 'booked') rows.push(['ETA updates', trk]);
    var url = safeUrl(t.trackUrl);
    return '<section class="card stack"><h3>Driver and truck</h3><dl class="kv">' + rows.filter(function (r) { return trim(r[1]); }).map(function (r) {
      return '<dt>' + h(r[0]) + '</dt><dd>' + h(r[1]) + '</dd>';
    }).join('') + '</dl>' +
      (url && t.status === 'booked' ? '<a class="btn secondary block" href="' + h(url) + '" target="_blank" rel="noopener noreferrer">Open the live map</a>' : '') + '</section>';
  }
  /* securement report (read only) once someone has signed it */
  function secureCard(t) {
    var s = t.secure;
    if (!s || !s.signedAt) return '';
    var gear = GEAR.filter(function (g) { return num(((s.gear || {})[g.key] || {}).qty) > 0; }).map(function (g) {
      var x = s.gear[g.key];
      return '<div class="row between nowrap"><span>' + h(plural(num(x.qty), g.one, g.many)) + '</span><span class="pill ' + (x.owner === 'driver' ? '' : 'info') + '">' + (x.owner === 'driver' ? 'Driver’s' : 'Ours') + '</span></div>';
    }).join('');
    var c = num(s.confidence);
    return '<section class="card stack ' + (c ? confTone(c) : '') + '"><div class="row between"><h3>Securement</h3>' +
      (c ? '<span class="pill ' + confTone(c) + '">' + h(c + ' of 5 · ' + (CONF[c] || '')) + '</span>' : '') + '</div>' +
      (gear ? '<div class="stack tight">' + gear + '</div>' : '') +
      '<dl class="kv"><dt>Seal</dt><dd class="mono">' + h(s.seal || '–') + '</dd>' +
      ((s.tags || []).length ? '<dt>Tags</dt><dd class="mono">' + h(s.tags.join(', ')) + '</dd>' : '') +
      (trim(s.note) ? '<dt>Note</dt><dd>' + h(s.note) + '</dd>' : '') +
      '<dt>Signed</dt><dd>' + h((s.signature || s.signedBy || '') + ' · ' + App.fmt.dayTime(s.signedAt)) + '</dd></dl>' +
      '<div class="thumbs">' + SEC_PHOTOS.map(function (x) {
        var ref = (s.photos || {})[x.key];
        return '<div class="stack tight">' + (ref ? thumbButton(ref, x.label + ' photo') : App.photoTag('', 'No photo')) + '<span class="tiny center bold">' + h(x.label) + '</span></div>';
      }).join('') + '</div></section>';
  }
  function trailCard(t) {
    var hist = App.sortByTime((t.history || []).slice(), 'at', 'asc');
    if (!hist.length) return '';
    return '<section class="card stack"><h3>Load trail</h3><div class="timeline">' + hist.map(function (x) {
      var s = String(x.text || '');
      var tone = /approved|done|secured/i.test(s) ? 'good' : /damage|declin/i.test(s) ? 'bad' : /started|checked in/i.test(s) ? 'accent' : '';
      return '<div class="tl ' + tone + '"><div class="tt">' + (App.isToday(x.at) ? h(App.fmt.time(x.at)) : h(shortWhen(x.at)) + '<br>' + h(App.fmt.time(x.at))) + '</div><div class="td"></div><div><div>' + h(s) + '</div>' +
        (x.by && s.indexOf(x.by) < 0 ? '<div class="tiny muted">' + h(x.by) + '</div>' : '') + '</div></div>';
    }).join('') + '</div></section>';
  }
  function truckView(p) {
    var g = gate(); if (g) return g;
    var t = App.get('trucks', p.id); if (!t) return notFound('Truck');
    var parts = [heroFor(t), primaryFor(t)];
    var dmg = damageList(t);
    if (dmg) parts.push('<section class="stack">' + head('Damage', '', 'h3') + dmg + '</section>');
    if ((t.photos || []).length) parts.push('<section class="card stack"><div class="row between"><h3>Done photos</h3><span class="small muted">' + h(plural(t.photos.length, 'photo')) + '</span></div>' +
      thumbs(t.photos, t.kind === 'pick' ? 'Loaded trailer' : 'Pallets staged') + '</section>');
    parts.push(secureCard(t));
    parts.push(loadsCard(t));
    parts.push('<section class="card stack"><div class="row between"><h3>Paperwork</h3><span class="small muted">' + h(plural((t.paperwork || []).length, 'page')) + '</span></div>' +
      ((t.paperwork || []).length ? thumbs(t.paperwork, 'Paperwork page') + '<p class="small muted">Tap a page to make it big.</p>'
        : '<p class="muted">No paperwork scanned. Get the papers from the driver or the office.</p>') + '</section>');
    parts.push(driverCard(t));
    if (trim(t.notes)) parts.push('<section class="card stack tight"><h3>Notes</h3><p>' + h(t.notes) + '</p></section>');
    parts.push(trailCard(t));
    /* back goes where they came from: the work screen for a truck at a door, Done today for a finished one */
    var back = t.status === 'working' ? { back: 'crew.work', backParams: { id: t.id } } : t.status === 'done' && App.isToday(t.doneAt) ? { back: 'crew.done' } : { back: 'crew.home' };
    return screen(company(t), Object.assign(back, { sub: truckName(t) + ' · ' + App.kindLabel(t) + (refsText(t) ? ' · ' + refsText(t) : '') }), parts.join(''));
  }

  /* ================= door picker (sheet) ================= */
  function doorsSheet(p) {
    var t = App.get('trucks', p.id);
    if (!t) return '<div class="stack">' + sheetHead('Pick a door') + '<p class="muted">We can’t find that truck.</p></div>';
    if (t.status !== 'arrived') {
      return '<div class="stack">' + sheetHead('Pick a door') + '<p>' + h(t.status === 'working' ? 'This truck already started at door ' + (t.door || '?') + '.' : 'This truck is not waiting in the yard.') + '</p></div>';
    }
    var dock = dockOf(t), n = doorsAt(dock), busy = busyDoors(dock, t.id), fn = 'door:' + t.id, f = App.form(fn, { door: '' });
    var sel = f.door && !busy[f.door] && Number(f.door) <= n ? String(f.door) : '';
    var free = 0, btns = [], busyList = [], compact = n > 12, i;
    for (i = 1; i <= n; i++) {
      var d = String(i), b = busy[d], on = sel === d;
      if (!b) free++; else busyList.push('Door ' + i + ': ' + company(b));
      var common = ' id="cr-door-' + i + '" data-door="' + i + '" data-act="core.set" data-form="' + h(fn) + '" data-field="door" data-value="' + i + '"' +
        (b ? ' disabled aria-disabled="true" title="' + h('Busy: ' + company(b)) + '"' : '') + ' aria-pressed="' + on + '"';
      if (compact) {
        btns.push('<button type="button" class="chip' + (on ? ' on' : '') + '"' + common + ' style="min-height:52px;padding:0 4px;justify-content:center' + (b ? ';opacity:.4;cursor:not-allowed;text-decoration:line-through' : '') + '"' +
          ' aria-label="' + h('Door ' + i + (b ? ', busy' : ', free')) + '">' + i + '</button>');
      } else {
        btns.push('<button type="button" class="choice' + (on ? ' on' : '') + '"' + common + (b ? ' style="opacity:.55;cursor:not-allowed"' : '') + '>' +
          '<span class="ci clock" aria-hidden="true">' + i + '</span><span class="ct"><b>Door ' + i + '</b><span>' + (b ? 'Busy: ' + h(company(b)) : on ? 'Picked' : 'Free') + '</span></span></button>');
      }
    }
    var v = t.kind === 'pick' ? 'loading' : 'unloading';
    return '<div class="stack">' + sheetHead('Which door?') +
      '<p class="small muted">' + h(company(t) + ' · ' + App.kindLabel(t) + ' · ' + plural(App.truckPallets(t), 'pallet')) + ' · <b>' + h(plural(free, 'door') + ' free') + '</b></p>' +
      (free ? '' : '<div class="banner warn"><div>Every door is busy. Finish a truck first.</div></div>') +
      (compact ? '<div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px">' + btns.join('') + '</div>' + (busyList.length ? '<p class="small muted">Busy now: ' + h(busyList.join(' · ')) + '</p>' : '') : '<div class="grid2">' + btns.join('') + '</div>') +
      '<div class="card flat tight stack tight" style="position:sticky;bottom:0;z-index:2">' +
      '<button type="button" class="btn primary lg block" data-act="crew.start" data-id="' + h(t.id) + '"' + (sel ? '' : ' disabled') + '>' +
      (sel ? 'Start ' + v + ' at door ' + h(sel) : 'Tap a free door first') + '</button>' +
      '<p class="small muted center">' + (trim(t.driverCell) ? 'We’ll text ' + h(t.driverName || 'the driver') + ' the door number.' : 'No driver cell on file. Wave the driver to the door.') + '</p></div></div>';
  }
  function photoSheet(p) {
    var url = App.photoUrl(p.ref);
    return '<div class="stack">' + sheetHead(p.label || 'Photo') +
      (url ? '<img src="' + h(url) + '" alt="' + h(p.label || 'Photo') + '" style="width:100%;height:auto;border-radius:8px;display:block">' : '<div class="empty-state">This photo is not available.</div>') + '</div>';
  }

  /* ================= work screen ================= */
  function workInit(t) {
    var counts = {};
    (t.loads || []).forEach(function (l, i) {
      var v = t.counts ? t.counts[l.id] : undefined;
      if (v !== undefined && v !== null) counts[loadKey(l, i)] = String(v);
    });
    if (!(t.loads || []).length && t.counts && t.counts.all !== undefined) counts.all = String(t.counts.all);
    return { counts: counts, countNote: t.countNote || '', photos: (t.photos || []).slice() };
  }
  function workForm(t) { return draftForm('work:' + t.id, workInit(t)); }
  function workState(t, f) {
    var loads = t.loads || [], walk = isWalkIn(t);
    /* expected = pallets on the booking. Unknown (0 / blank) or a walk-in driver's guess is not held against the count. */
    var rows = loads.length ? loads.map(function (l, i) {
      var p = num(l.pallets), known = p > 0 && !walk;
      return { l: l, key: loadKey(l, i), id: l.id || loadKey(l, i), exp: known ? p : null, guess: !known && p > 0 ? p : null, ref: trim(l.ref) };
    }) : [{ l: {}, key: 'all', id: 'all', exp: null, guess: null, ref: '' }];
    rows.forEach(function (r) {
      var raw = f.counts ? f.counts[r.key] : undefined, s = trim(raw);
      r.has = s !== '' && /^\d+$/.test(s);
      r.val = r.has ? Number(s) : null;
      r.ok = r.has && (r.exp === null || r.val === r.exp);
    });
    var uncounted = rows.filter(function (r) { return !r.has; });
    var off = rows.filter(function (r) { return r.has && !r.ok; });
    var counted = rows.reduce(function (s, r) { return s + (r.val || 0); }, 0);
    var allKnown = rows.every(function (r) { return r.exp !== null; });
    var expected = allKnown ? rows.reduce(function (s, r) { return s + r.exp; }, 0) : 0;
    var photos = (f.photos || []).length, needSecure = t.kind === 'pick' || t.kind === 'both', secured = !!(t.secure && t.secure.signedAt);
    var unsafe = needSecure && secured && num(t.secure.confidence) === 1;
    var missing = [];
    if (uncounted.length === 1) missing.push('count ' + (uncounted[0].ref || 'the pallets'));
    else if (uncounted.length > 1) missing.push('count ' + uncounted.length + ' loads');
    if (off.length && !trim(f.countNote)) missing.push('a note on why the count is off');
    if (!photos) missing.push('a done photo');
    if (needSecure && !secured) missing.push('secure the load');
    if (unsafe) missing.push('a safer load (it is rated 1 of 5, not safe)');
    if (App.anyBusy()) missing.push('photos still saving');
    return { rows: rows, uncounted: uncounted, off: off, counted: counted, expected: expected, allKnown: allKnown, photos: photos, needSecure: needSecure, secured: secured, unsafe: unsafe, missing: missing };
  }
  function countBlock(t, fn, r, idx, total) {
    var fid = 'cr-count-' + idPart(t.id) + '-' + idPart(r.key), field = 'counts.' + r.key, label = r.ref || (r.exp === null ? 'Pallets' : 'Load ' + (idx + 1));
    var status;
    if (!r.has) status = '<span class="muted">Not counted yet</span>';
    else if (r.exp === null) status = '<span class="good-t bold">&#10003; ' + h(plural(r.val, 'pallet') + ' counted' + (r.guess !== null ? ' (driver guessed ' + r.guess + ')' : '')) + '</span>';
    else if (r.ok) status = '<span class="good-t bold">&#10003; ' + h(r.val + ' of ' + r.exp + ' pallets') + '</span>';
    else status = '<span class="warn-t bold">' + h(r.val + ' of ' + r.exp + ' pallets · ' + Math.abs(r.val - r.exp) + (r.val < r.exp ? ' short' : ' extra')) + '</span>';
    return (idx ? '<hr>' : '') + '<div class="stack tight" data-count="' + h(r.key) + '">' +
      '<div class="row between nowrap top"><div class="grow" style="min-width:0"><b class="big">' + (t.loadOrder && total > 1 ? h((idx + 1) + '. ') : '') + h(label) + '</b>' +
      '<div class="small muted">' + h((r.exp !== null ? 'Expected ' + plural(r.exp, 'pallet') : r.guess !== null ? 'Driver guessed ' + plural(r.guess, 'pallet') + '. Count them.' : 'No pallet count on file. Count them.') + (trim(r.l.destination) ? ' · ' + trim(r.l.destination) : '')) + '</div></div></div>' +
      '<div class="row nowrap" style="gap:8px"><div class="stepper">' +
      '<button type="button"' + STEP_BTN + ' data-act="core.step" data-form="' + h(fn) + '" data-field="' + h(field) + '" data-step="-1" data-min="0" aria-label="' + h('One less for ' + label) + '">&minus;</button>' +
      '<input type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" id="' + h(fid) + '" placeholder="–" data-form="' + h(fn) + '" data-field="' + h(field) + '" data-rerender value="' + App.val(fn, field) + '" aria-label="' + h('Pallets counted for ' + label) + '">' +
      '<button type="button"' + STEP_BTN + ' data-act="core.step" data-form="' + h(fn) + '" data-field="' + h(field) + '" data-step="1" data-min="0" aria-label="' + h('One more for ' + label) + '">+</button></div>' +
      (r.exp !== null && r.exp > 0 && !r.ok ? '<button type="button" class="btn secondary lg grow" data-act="crew.countAll" data-id="' + h(t.id) + '" data-key="' + h(r.key) + '" data-n="' + r.exp + '">&#10003; All ' + r.exp + '</button>' : '') +
      '</div><div class="small">' + status + '</div></div>';
  }
  function workView(p) {
    var g = gate(); if (g) return g;
    var t = App.get('trucks', p.id); if (!t) return notFound('Truck');
    if (t.status !== 'working') {
      var msg = t.status === 'arrived' ? 'This truck is still waiting. Start it at a door first.' : t.status === 'done' ? 'This truck is done.' : 'This truck is not at a door.';
      return screen(company(t), { back: 'crew.home', sub: truckName(t) }, heroFor(t) + '<div class="banner info"><div>' + h(msg) + '</div></div>' +
        '<button type="button" class="btn primary lg block" data-act="core.go" data-view="crew.truck" data-p-id="' + h(t.id) + '">Truck details</button>');
    }
    var fn = 'work:' + t.id, f = workForm(t), st = workState(t, f), pick = t.kind === 'pick', step = 0;
    var parts = [];
    parts.push('<div class="hero stack tight"><div class="row between nowrap top"><div><div class="muted small">' + h(doing(t)) + ' at</div>' +
      '<div class="clock" style="font-size:2.6rem;line-height:1;white-space:nowrap">Door ' + h(t.door || '?') + '</div></div>' +
      '<div class="right"><div class="muted small">At the door</div>' + liveClock(t.startedAt, '', '1.7rem') + '</div></div>' +
      '<div class="small muted">' + h([company(t), truckName(t), App.kindLabel(t), st.expected ? plural(st.expected, 'pallet') : ''].filter(Boolean).join(' · ')) + '</div></div>');

    /* 1. count */
    var allOk = !st.uncounted.length && !st.off.length;
    var noLoads = !st.allKnown;
    var pillTxt = noLoads ? (st.uncounted.length ? 'Not counted' : plural(st.counted, 'pallet')) : st.counted + ' of ' + st.expected;
    var countPill = '<span class="pill' + (st.uncounted.length ? '' : allOk ? ' good' : ' warn') + '">' + h(pillTxt) + '</span>';
    parts.push('<section class="card stack' + (allOk ? ' good' : '') + '" aria-label="Count">' + head(h((++step) + '. ' + (pick ? 'Count pallets loaded' : 'Count the pallets')), countPill, 'h3') +
      st.rows.map(function (r, i) { return countBlock(t, fn, r, i, st.rows.length); }).join('') +
      (st.off.length ? '<div class="field' + (trim(f.countNote) ? '' : ' err') + '"><label for="cr-countnote">Why is the count different? (required)</label>' +
        '<textarea id="cr-countnote" rows="2" data-form="' + h(fn) + '" data-field="countNote" data-rerender placeholder="Example: 2 pallets missing from the trailer, driver knows.">' + App.val(fn, 'countNote') + '</textarea>' +
        (trim(f.countNote) ? '' : '<span class="errmsg">The customer will see this note.</span>') + '</div>' : '') + '</section>');

    /* 2. damage */
    var dmg = damageList(t);
    parts.push('<section class="card stack" aria-label="Damage">' + head(h((++step) + '. Damage'), dmg ? '' : '<span class="pill good">None so far</span>', 'h3') + dmg +
      '<button type="button" class="btn secondary lg block" data-act="crew.openDamage" data-id="' + h(t.id) + '">&#9888; Report damage</button>' +
      '<p class="small muted">Crushed, wet, torn or leaning? Report it before you finish. The customer gets the photos in their portal.</p></section>');

    /* 3. done photos */
    var photoLabel = pick ? 'Photo of the loaded trailer' : t.kind === 'both' ? 'Photo of the pallets staged and the loaded trailer' : 'Photo of the pallets staged';
    parts.push('<section class="card stack' + (st.photos ? ' good' : '') + '" aria-label="Done photos">' + head(h((++step) + '. Done photos'),
      '<span class="pill ' + (st.photos ? 'good' : '') + '">' + h(st.photos ? plural(st.photos, 'photo') : 'Need 1') + '</span>', 'h3') +
      '<p class="small muted">' + h(photoLabel) + '. At least 1.</p>' +
      App.photoList({ form: fn, field: 'photos', label: pick ? 'Loaded trailer' : 'Pallets staged', required: true }) + '</section>');

    /* 4. secure (pickups) */
    if (st.needSecure) {
      var s = t.secure;
      parts.push('<section class="card stack' + (st.unsafe ? ' bad' : st.secured ? ' good' : ' warn') + '" aria-label="Secure the load">' + head(h((++step) + '. Secure the load'),
        st.unsafe ? '<span class="pill bad">Not safe</span>' : st.secured ? '<span class="pill good">&#10003; Secured</span>' : '<span class="pill warn">Required</span>', 'h3') +
        (st.secured ? '<p class="bold ' + (st.unsafe ? 'bad-t' : 'good-t') + '">' + (st.unsafe ? '' : '&#10003; ') + h('Confidence ' + s.confidence + ' of 5 (' + (CONF[s.confidence] || '') + ') · seal ' + (s.seal || '–') + ' · signed by ' + (s.signedBy || '')) + '</p>' +
          (st.unsafe ? '<div class="banner bad"><div><b>Rated not safe.</b> Fix the load, then secure it again. This truck can’t finish until then. Tell the office.</div></div>' : '') +
          '<button type="button" class="btn ' + (st.unsafe ? 'primary lg' : 'secondary') + ' block" data-act="core.go" data-view="crew.secure" data-p-id="' + h(t.id) + '">' + (st.unsafe ? 'Secure it again' : 'Change securement') + '</button>'
          : '<p class="small muted">Gear, seal, 5 photos and your sign-off. Needed before this pickup can leave.</p>' +
          '<button type="button" class="btn primary lg block" data-act="core.go" data-view="crew.secure" data-p-id="' + h(t.id) + '">Secure the load</button>') + '</section>');
    }

    /* 5. finish */
    var checks = [
      [!st.uncounted.length && (!st.off.length || trim(f.countNote)), 'Count', st.uncounted.length ? (st.rows.length > 1 ? (st.rows.length - st.uncounted.length) + ' of ' + st.rows.length + ' loads counted' : 'not counted yet')
        : noLoads ? plural(st.counted, 'pallet') : st.counted + ' of ' + st.expected + ' pallets'],
      [!!st.photos, 'Done photo', st.photos ? plural(st.photos, 'photo') : 'none yet']
    ];
    if (st.needSecure) checks.push([st.secured && !st.unsafe, 'Secure the load', st.unsafe ? 'rated not safe' : st.secured ? 'done' : 'not yet']);
    parts.push('<section class="card stack" aria-label="Finish"><h3>' + h((++step) + '. Finish') + '</h3>' +
      '<div class="stack tight">' + checks.map(function (c) {
        return '<div class="row nowrap"><span class="bold ' + (c[0] ? 'good-t' : 'bad-t') + '" style="width:1.4em;text-align:center" aria-hidden="true">' + (c[0] ? '&#10003;' : '&#10007;') + '</span>' +
          '<span class="grow">' + h(c[1]) + '</span><span class="small muted">' + h(c[2]) + '</span></div>';
      }).join('') + '</div>' +
      missingLine(st.missing, 'All set. When you finish, we’ll let the customer know' + (trim(t.driverCell) ? ' and text the driver.' : '. No driver cell, so tell the driver.')) +
      '<button type="button" class="btn primary lg block" data-act="crew.finish" data-id="' + h(t.id) + '"' + (st.missing.length ? ' disabled' : '') + '>' +
      (st.missing.length ? 'Finish (' + plural(st.missing.length, 'thing') + ' left)' : 'Finish truck') + '</button></section>');
    parts.push('<button type="button" class="btn ghost block" data-act="core.go" data-view="crew.truck" data-p-id="' + h(t.id) + '">Truck details, paperwork and driver</button>');
    return screen(company(t), { back: 'crew.home', sub: 'Door ' + (t.door || '?') + ' · ' + truckName(t) + (refsText(t) ? ' · ' + refsText(t) : '') }, parts.join(''));
  }

  /* ================= damage report ================= */
  function dmgInit(t) {
    var loads = t.loads || [];
    return { loadKey: loads.length === 1 ? loadKey(loads[0], 0) : '', pallets: 1, kinds: [], what: '', wide: null, close: null, more: [],
      fix: { rewrap: { on: true, qty: null }, labor: { on: true, qty: 0.5 }, pallet: { on: false, qty: 1 } } };
  }
  function fixDefs() {
    var r = App.settings().rates || {};
    return [
      { key: 'rewrap', label: 'Rewrap pallet', rate: num(r.rewrap) || 15, unit: 'each', step: 1, min: 1 },
      { key: 'labor', label: 'Restack boxes (labor, hours)', rate: num(r.labor) || 120, unit: 'per hour', step: 0.5, min: 0.5 },
      { key: 'pallet', label: 'New pallet', rate: num(r.newPallet) || 25, unit: 'each', step: 1, min: 1 }
    ];
  }
  function fixQty(f, def) {
    var line = (f.fix || {})[def.key] || {};
    if (def.key === 'rewrap' && (line.qty === null || line.qty === undefined)) return Math.max(1, num(f.pallets) || 1);
    return Math.max(def.min, num(line.qty) || def.min);
  }
  function dmgState(t, f) {
    var loads = t.loads || [], load = null, i;
    for (i = 0; i < loads.length; i++) if (loadKey(loads[i], i) === f.loadKey) load = loads[i];
    var photos = [f.wide, f.close].filter(Boolean).concat((f.more || []).filter(Boolean));
    var lines = fixDefs().filter(function (d) { return f.fix && f.fix[d.key] && f.fix[d.key].on; })
      .map(function (d) { return { label: d.label, qty: fixQty(f, d), rate: d.rate }; });
    var total = lines.reduce(function (s, l) { return s + l.qty * l.rate; }, 0);
    var c = custOf(t), lim = c && c.autoApproveUnder !== null && c.autoApproveUnder !== undefined && c.autoApproveUnder !== '' && isFinite(Number(c.autoApproveUnder)) ? Number(c.autoApproveUnder) : null;
    var missing = [];
    if (loads.length && !load) missing.push('which load');
    if (!(f.kinds || []).length) missing.push('what happened');
    if (photos.length < 2) missing.push(photos.length ? '1 more photo' : '2 photos (wide shot and close-up)');
    if (App.anyBusy()) missing.push('photos still saving');
    return { load: load, photos: photos, lines: lines, total: total, limit: lim, auto: lim !== null && total < lim, missing: missing, pallets: Math.max(1, Math.round(num(f.pallets)) || 1) };
  }
  function damageView(p) {
    var g = gate(); if (g) return g;
    var t = App.get('trucks', p.id); if (!t) return notFound('Truck');
    var fn = 'dmg:' + t.id, f = draftForm(fn, dmgInit(t)), st = dmgState(t, f), loads = t.loads || [], c = custOf(t);
    var parts = [];
    /* which load */
    if (loads.length) {
      parts.push('<section class="stack">' + head('Which load?', '', 'h3') + '<div class="stack tight">' + loads.map(function (l, i) {
        var k = loadKey(l, i), on = f.loadKey === k;
        return '<button type="button" class="choice' + (on ? ' on' : '') + '" data-act="core.set" data-form="' + h(fn) + '" data-field="loadKey" data-value="' + h(k) + '" aria-pressed="' + on + '">' +
          '<span class="ci" aria-hidden="true">' + (on ? '&#10003;' : '&#9675;') + '</span><span class="ct"><b>' + h(l.ref || 'Load ' + (i + 1)) + '</b><span>' +
          h(plural(num(l.pallets), 'pallet') + (trim(l.destination) ? ' · ' + trim(l.destination) : '')) + '</span></span></button>';
      }).join('') + '</div></section>');
    }
    /* how many pallets */
    parts.push('<section class="row between nowrap"><div><h3>How many pallets hurt?</h3><div class="small muted">Count only the damaged ones.</div></div>' +
      '<div class="stepper"><button type="button"' + STEP_BTN + ' data-act="core.step" data-form="' + h(fn) + '" data-field="pallets" data-step="-1" data-min="1" aria-label="One less pallet">&minus;</button>' +
      '<output id="cr-dmg-pallets" aria-live="polite">' + h(st.pallets) + '</output>' +
      '<button type="button"' + STEP_BTN + ' data-act="core.step" data-form="' + h(fn) + '" data-field="pallets" data-step="1" data-min="1" aria-label="One more pallet">+</button></div></section>');
    /* what happened */
    parts.push('<section class="stack">' + head('What happened?', '<span class="small muted">Tap all that fit</span>', 'h3') + '<div class="grid2">' + DMG_KINDS.map(function (k) {
      var on = (f.kinds || []).indexOf(k) >= 0;
      return '<button type="button" class="choice' + (on ? ' on' : '') + '" data-act="core.toggleIn" data-form="' + h(fn) + '" data-field="kinds" data-value="' + h(k) + '" aria-pressed="' + on + '">' +
        '<span class="ci" aria-hidden="true">' + (on ? '&#9745;' : '&#9744;') + '</span><span class="ct"><b>' + h(k) + '</b></span></button>';
    }).join('') + '</div></section>');
    /* photos */
    parts.push('<section class="stack">' + head('Photos', '<span class="pill ' + (st.photos.length >= 2 ? 'good' : 'bad') + '">' + h(st.photos.length + ' of 2 needed') + '</span>', 'h3') +
      '<p class="small muted">Take a <b>wide shot</b> of the pallet and a <b>close-up</b> of the damage.</p>' +
      '<div class="grid2">' +
      '<div class="stack tight">' + App.photoSlot({ form: fn, field: 'wide', label: 'Wide shot', required: true }) + '<span class="tiny muted center">Wide shot</span></div>' +
      '<div class="stack tight">' + App.photoSlot({ form: fn, field: 'close', label: 'Close-up', required: true }) + '<span class="tiny muted center">Close-up</span></div></div>' +
      '<div class="small muted bold">More photos (optional)</div>' + App.photoList({ form: fn, field: 'more', label: 'More photos' }) + '</section>');
    /* words */
    parts.push('<section class="field"><label for="cr-dmg-what">What did you see? (optional)</label>' +
      '<textarea id="cr-dmg-what" rows="2" data-form="' + h(fn) + '" data-field="what" placeholder="Example: wrap torn on top, 3 boxes crushed.">' + App.val(fn, 'what') + '</textarea></section>');
    /* suggested fix */
    var fixes = fixDefs().map(function (d) {
      var line = (f.fix || {})[d.key] || {}, on = !!line.on, q = fixQty(f, d), cid = 'cr-dmg-fix-' + d.key;
      return '<div class="card tight flat' + (on ? '' : ' soft') + ' stack tight" data-fix="' + h(d.key) + '"><div class="row between nowrap">' +
        '<label class="check grow" for="' + cid + '"><input type="checkbox" id="' + cid + '" data-form="' + h(fn) + '" data-field="fix.' + d.key + '.on" data-rerender' + (on ? ' checked' : '') + '>' +
        '<span><b>' + h(d.label) + '</b><br><span class="small muted">' + h(money(d.rate) + ' ' + d.unit) + '</span></span></label>' +
        '<b class="num' + (on ? '' : ' faint') + '">' + h(money(on ? q * d.rate : 0)) + '</b></div>' +
        (on ? '<div class="row between nowrap"><span class="small muted">' + (d.key === 'labor' ? 'Hours' : 'How many') + '</span><div class="stepper">' +
          '<button type="button"' + STEP_BTN + ' data-act="crew.fixStep" data-form="' + h(fn) + '" data-line="' + d.key + '" data-step="' + (-d.step) + '" aria-label="' + h('Less ' + d.label) + '">&minus;</button>' +
          '<output>' + h(q) + '</output>' +
          '<button type="button"' + STEP_BTN + ' data-act="crew.fixStep" data-form="' + h(fn) + '" data-line="' + d.key + '" data-step="' + d.step + '" aria-label="' + h('More ' + d.label) + '">+</button></div></div>' : '') +
        '</div>';
    }).join('');
    var approveNote;
    if (st.limit !== null && st.auto) approveNote = '<div class="banner good"><div><b>Auto-approved by customer setting.</b> ' + h(company(t)) + ' okays fixes under ' + h(money(st.limit)) + '. They still get the photos.</div></div>';
    else if (st.limit !== null) approveNote = '<div class="banner info"><div>' + h(money(st.total)) + ' is over their ' + h(money(st.limit)) + ' auto-approve limit, so the customer approves or declines it.</div></div>';
    else if (!c) approveNote = '<div class="banner warn"><div><b>Walk-in, no customer account.</b> The office sees this report and follows up with the company.</div></div>';
    else approveNote = '<div class="banner info"><div>The customer approves or declines this price in their portal.</div></div>';
    parts.push('<section class="stack">' + head('Suggested fix', '<span class="small muted">Tap to turn a line on or off</span>', 'h3') + fixes +
      '<div class="row between"><b class="big">Fix price</b><b class="big num" id="cr-dmg-total">' + h(money(st.total)) + '</b></div>' + approveNote + '</section>');
    /* save */
    parts.push('<section class="stack">' + missingLine(st.missing, 'Ready to save.') +
      '<button type="button" class="btn primary lg block" data-act="crew.saveDamage" data-id="' + h(t.id) + '"' + (st.missing.length ? ' disabled' : '') + '>Save damage report</button>' +
      '<button type="button" class="btn ghost block" data-act="crew.cancelDamage" data-id="' + h(t.id) + '">Cancel and throw away this report</button>' +
      '<p class="small muted center">The back arrow keeps what you entered on this phone.</p></section>');
    return screen('Report damage', { back: 'crew.work', backParams: { id: t.id }, sub: company(t) + ' · ' + truckName(t) }, parts.join(''));
  }

  /* ================= secure the load ================= */
  function secInit(t) {
    var s = t.secure || {}, gear = {};
    GEAR.forEach(function (g) {
      var x = (s.gear || {})[g.key] || {};
      gear[g.key] = { qty: num(x.qty), owner: x.owner === 'driver' ? 'driver' : 'ours' };
    });
    var ph = {};
    SEC_PHOTOS.forEach(function (x) { ph[x.key] = (s.photos || {})[x.key] || null; });
    return { gear: gear, tags: (s.tags || []).slice(), tagDraft: '', seal: s.seal || '', photos: ph, confidence: num(s.confidence), note: s.note || '', checkedRows: false, signature: '' };
  }
  function secState(t, f) {
    var gearTotal = GEAR.reduce(function (s, g) { return s + Math.max(0, Math.round(num(((f.gear || {})[g.key] || {}).qty))); }, 0);
    var missingPhotos = SEC_PHOTOS.filter(function (x) { return !(f.photos || {})[x.key]; });
    var conf = num(f.confidence), missing = [];
    if (!gearTotal) missing.push('the gear you used');
    if (!trim(f.seal)) missing.push('the seal number');
    if (missingPhotos.length) missing.push(missingPhotos.length === SEC_PHOTOS.length ? 'all 5 photos' : missingPhotos.length === 1 ? 'the ' + missingPhotos[0].label.toLowerCase() + ' photo' : missingPhotos.length + ' photos (' + missingPhotos.map(function (x) { return x.label.toLowerCase(); }).join(', ') + ')');
    if (!conf) missing.push('how safe it is (1 to 5)');
    if (conf && conf <= 3 && !trim(f.note)) missing.push('what would make it safer');
    if (!f.checkedRows) missing.push('the check box');
    if (!trim(f.signature)) missing.push('your signature');
    if (App.anyBusy()) missing.push('photos still saving');
    return { gearTotal: gearTotal, conf: conf, missing: missing };
  }
  function gearRow(fn, f, g) {
    var x = (f.gear || {})[g.key] || {}, q = Math.max(0, Math.round(num(x.qty))), owner = x.owner === 'driver' ? 'driver' : 'ours', fid = 'cr-sec-' + g.key + '-qty';
    return '<div class="card tight flat stack tight" data-gear="' + g.key + '"><div class="row between nowrap">' +
      '<div class="grow" style="min-width:0"><b>' + h(g.label) + '</b><div class="small muted">' + h(g.typical) + '</div></div>' +
      '<div class="stepper"><button type="button"' + STEP_BTN + ' data-act="core.step" data-form="' + h(fn) + '" data-field="gear.' + g.key + '.qty" data-step="-1" data-min="0" aria-label="' + h('One less ' + g.one) + '">&minus;</button>' +
      '<input type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" id="' + fid + '" data-form="' + h(fn) + '" data-field="gear.' + g.key + '.qty" data-rerender value="' + h(q || '') + '" placeholder="0" aria-label="' + h(g.label + ' count') + '">' +
      '<button type="button"' + STEP_BTN + ' data-act="core.step" data-form="' + h(fn) + '" data-field="gear.' + g.key + '.qty" data-step="1" data-min="0" aria-label="' + h('One more ' + g.one) + '">+</button></div></div>' +
      (q ? '<div class="seg" role="group" aria-label="' + h('Whose ' + g.many + '?') + '">' +
        '<button type="button"' + TALL + ' class="' + (owner === 'ours' ? 'on' : '') + '" data-act="core.set" data-form="' + h(fn) + '" data-field="gear.' + g.key + '.owner" data-value="ours" aria-pressed="' + (owner === 'ours') + '">' + (owner === 'ours' ? '&#10003; ' : '') + 'Ours (24 HR)</button>' +
        '<button type="button"' + TALL + ' class="' + (owner === 'driver' ? 'on' : '') + '" data-act="core.set" data-form="' + h(fn) + '" data-field="gear.' + g.key + '.owner" data-value="driver" aria-pressed="' + (owner === 'driver') + '">' + (owner === 'driver' ? '&#10003; ' : '') + 'Driver’s</button></div>' : '') +
      '</div>';
  }
  function secureView(p) {
    var g = gate(); if (g) return g;
    var t = App.get('trucks', p.id); if (!t) return notFound('Truck');
    if (t.status !== 'working') {
      return screen('Secure the load', { back: 'crew.truck', backParams: { id: t.id }, sub: company(t) },
        '<div class="banner info"><div>' + h(t.status === 'done' ? 'This truck is done. The securement report is on the truck page.' : 'Start this truck at a door first.') + '</div></div>' +
        '<button type="button" class="btn primary lg block" data-act="core.go" data-view="crew.truck" data-p-id="' + h(t.id) + '">Truck details</button>');
    }
    var fn = 'sec:' + t.id, f = draftForm(fn, secInit(t)), st = secState(t, f), parts = [];
    var oursAny = GEAR.some(function (x) { var r = f.gear[x.key] || {}; return num(r.qty) > 0 && r.owner !== 'driver'; });
    var barsOurs = num((f.gear.bars || {}).qty) > 0 && (f.gear.bars || {}).owner !== 'driver';
    if (t.secure) parts.push('<div class="banner info"><div>Already secured by ' + h(t.secure.signedBy || 'crew') + ' at ' + h(App.fmt.time(t.secure.signedAt)) + '. Saving again replaces it. Sign again below.</div></div>');
    /* gear */
    parts.push('<section class="stack">' + head('1. Gear used', '<span class="small muted">Tap + for each piece</span>', 'h3') +
      GEAR.map(function (x) { return gearRow(fn, f, x); }).join('') + '</section>');
    /* tags */
    parts.push('<section class="stack">' + head('2. Tags on our gear', (f.tags || []).length ? '<span class="pill info">' + h(plural(f.tags.length, 'tag')) + '</span>' : '', 'h3') +
      '<form class="row nowrap" style="align-items:flex-end" data-submit="crew.tagAdd" data-form-name="' + h(fn) + '" autocomplete="off">' +
      '<div class="field grow"><label for="cr-sec-tag">Tag number</label><input id="cr-sec-tag" type="text" autocomplete="off" autocapitalize="characters" placeholder="B-104" data-form="' + h(fn) + '" data-field="tagDraft" value="' + App.val(fn, 'tagDraft') + '"></div>' +
      '<button type="submit" class="btn secondary lg">Add</button></form>' +
      ((f.tags || []).length ? '<div class="chips">' + f.tags.map(function (tag, i) {
        return '<button type="button" class="chip on"' + TALL + ' data-act="crew.tagRemove" data-form-name="' + h(fn) + '" data-index="' + i + '" aria-label="' + h('Remove tag ' + tag) + '"><span class="mono">' + h(tag) + '</span> &times;</button>';
      }).join('') + '</div>' : '<p class="small muted">' + (oursAny ? 'Our gear is going out. Add the tag on each load bar so we get it back.' : 'Only for our gear. Skip if the gear is all the driver’s.') + '</p>') +
      (barsOurs && (f.tags || []).length < Math.round(num(f.gear.bars.qty)) ? '<p class="small warn-t bold">' + h(plural(Math.round(num(f.gear.bars.qty)), 'load bar') + ' of ours, ' + plural((f.tags || []).length, 'tag') + ' added.') + '</p>' : '') + '</section>');
    /* seal */
    parts.push('<section class="stack">' + head('<label for="cr-sec-seal">3. Seal number</label>', trim(f.seal) ? '<span class="pill good">&#10003; Added</span>' : '<span class="pill">Required</span>', 'h3') +
      '<input id="cr-sec-seal" type="text" autocomplete="off" autocapitalize="characters" class="in mono" placeholder="Example: 448120" data-form="' + h(fn) + '" data-field="seal" data-rerender value="' + App.val(fn, 'seal') + '"></section>');
    /* photos */
    var have = SEC_PHOTOS.filter(function (x) { return f.photos[x.key]; }).length;
    parts.push('<section class="stack">' + head('4. Photos', '<span class="pill ' + (have === 5 ? 'good' : 'bad') + '">' + h(have + ' of 5') + '</span>', 'h3') +
      '<div class="thumbs">' + SEC_PHOTOS.map(function (x) {
        return '<div class="stack tight">' + App.photoSlot({ form: fn, field: 'photos.' + x.key, label: x.label, required: true }) +
          '<span class="tiny center"><b>' + h(x.label) + '</b><br><span class="muted">' + h(x.sub) + '</span></span></div>';
      }).join('') + '</div></section>');
    /* confidence */
    var conf = st.conf;
    parts.push('<section class="stack">' + head('5. How safe is it?', conf ? '<span class="pill ' + confTone(conf) + '">' + h(conf + ' of 5') + '</span>' : '', 'h3') +
      '<div class="stack tight" role="group" aria-label="Confidence 1 to 5">' + [1, 2, 3, 4, 5].map(function (n) {
        var on = conf === n;
        return '<button type="button" class="choice' + (on ? ' on' : '') + '" id="cr-sec-conf-' + n + '" data-act="core.set" data-form="' + h(fn) + '" data-field="confidence" data-value="' + n + '" aria-pressed="' + on + '">' +
          '<span class="ci clock" aria-hidden="true">' + n + '</span><span class="ct"><b>' + h(CONF[n]) + '</b><span>' + h(CONF_SUB[n]) + '</span></span>' + (on ? '<span class="bold" aria-hidden="true">&#10003;</span>' : '') + '</button>';
      }).join('') + '</div>' +
      (conf && conf <= 3 ? '<div class="field' + (trim(f.note) ? '' : ' err') + '"><label for="cr-sec-note">What would make it safer? (required)</label>' +
        '<textarea id="cr-sec-note" rows="2" data-form="' + h(fn) + '" data-field="note" data-rerender placeholder="Example: needs one more load bar at the tail.">' + App.val(fn, 'note') + '</textarea>' +
        (trim(f.note) ? '' : '<span class="errmsg">Required when it is 3 or less.</span>') + '</div>' : '') +
      (conf === 1 ? '<div class="banner bad"><div><b>Not safe:</b> tell the office before this truck pulls out.</div></div>' : '') + '</section>');
    /* sign */
    parts.push('<section class="stack">' + head('6. Sign', '', 'h3') +
      '<label class="check card tight flat" for="cr-sec-check"><input type="checkbox" id="cr-sec-check" data-form="' + h(fn) + '" data-field="checkedRows" data-rerender' + (f.checkedRows ? ' checked' : '') + '>' +
      '<span class="bold">I checked every row is tight and nothing can shift</span></label>' +
      '<div class="field"><label for="cr-sec-sign">Type your name to sign</label><input id="cr-sec-sign" type="text" autocomplete="off" autocapitalize="words" placeholder="Your name" data-form="' + h(fn) + '" data-field="signature" data-rerender value="' + App.val(fn, 'signature') + '"></div></section>');
    /* save */
    parts.push('<section class="stack">' + missingLine(st.missing, 'Ready. Saving puts the report and photos in the customer’s portal and lets them know.') +
      '<button type="button" class="btn primary lg block" data-act="crew.saveSecure" data-id="' + h(t.id) + '"' + (st.missing.length ? ' disabled' : '') + '>Save and sign</button>' +
      '<button type="button" class="btn ghost block" data-act="core.go" data-view="crew.work" data-p-id="' + h(t.id) + '">Back to the work screen</button></section>');
    return screen('Secure the load', { back: 'crew.work', backParams: { id: t.id }, sub: company(t) + ' · door ' + (t.door || '?') }, parts.join(''));
  }

  /* ================= done today ================= */
  function doneView() {
    var g = gate(); if (g) return g;
    var dock = myDock();
    var rows = App.sortByTime(App.list('trucks', function (t) { return t.status === 'done' && dockOf(t) === dock && App.isToday(t.doneAt); }), 'doneAt', 'desc');
    var pallets = rows.reduce(function (s, t) { var c = countedPallets(t); return s + (c === null ? App.truckPallets(t) : c); }, 0);
    var works = rows.map(function (t) { return App.truckTimes(t).workMs; }).filter(function (x) { return x !== null && !isNaN(x); });
    var avg = works.length ? works.reduce(function (s, x) { return s + x; }, 0) / works.length : null;
    var list = rows.map(function (t) {
      var tt = App.truckTimes(t), c = countedPallets(t), exp = App.truckPallets(t), s = t.secure, dm = (t.damageIds || []).length, ph = (t.photos || []).length;
      var pills = [];
      if (c !== null) pills.push('<span class="pill ' + (c === exp ? 'good' : 'warn') + '">' + h(c + ' of ' + exp + ' pallets') + '</span>');
      pills.push('<span class="pill">' + h(plural(ph, 'photo')) + '</span>');
      if (dm) pills.push('<span class="pill bad">' + h(plural(dm, 'damage report')) + '</span>');
      if (s && s.confidence) pills.push('<span class="pill ' + confTone(num(s.confidence)) + '">' + h('Secured ' + s.confidence + ' of 5') + '</span>');
      return '<div class="card tight good link stack tight" role="button" tabindex="0" data-act="core.go" data-view="crew.truck" data-p-id="' + h(t.id) + '" data-truck="' + h(t.id) + '">' +
        '<div class="row between nowrap top"><div class="grow" style="min-width:0"><b>' + companyHtml(t) + '</b>' +
        '<div class="small muted">' + h([truckName(t), App.kindLabel(t), t.door ? 'Door ' + t.door : '', t.crewName].filter(Boolean).join(' · ')) + '</div></div>' +
        '<div class="right" style="flex:none"><b class="num">' + h(App.fmt.time(t.doneAt)) + '</b><div class="tiny muted">done</div></div></div>' +
        '<div class="row" style="gap:6px">' + pills.join('') + '</div>' +
        '<div class="small muted">' + h([tt.waitMs !== null ? 'Waited ' + App.fmt.dur(tt.waitMs) : '', tt.workMs !== null ? 'at the door ' + App.fmt.dur(tt.workMs) : '', tt.totalMs !== null ? 'total ' + App.fmt.dur(tt.totalMs) : ''].filter(Boolean).join(' · ')) + '</div></div>';
    }).join('');
    var body = '<div class="row nowrap">' + stat(rows.length, 'Trucks done', rows.length ? 'good' : '') + stat(App.fmt.num(pallets), 'Pallets') + stat(avg === null ? '–' : shortDur(avg), 'Avg at door') + '</div>' +
      '<section class="stack">' + head('Finished today', '<span class="small muted">' + h(App.dockName(dock)) + '</span>') +
      (list || empty('Nothing finished yet today.', 'Trucks show up here when you tap Finish.')) + '</section>';
    return screen('Done today', { sub: whoWhere(), right: switchBtn() }, body, 'crew.done');
  }

  /* ================= gear coming back ================= */
  function gearLine(o) {
    return GEAR.filter(function (g) { return o[g.key] > 0; }).map(function (g) { return plural(o[g.key], g.one, g.many); }).join(' · ');
  }
  function gearView() {
    var g = gate(); if (g) return g;
    var f = App.form('gearBack', { customerId: '', type: '', qty: 1, tags: [], tagDraft: '', note: '' });
    var custs = App.list('customers').sort(function (a, b) { return String(a.name || '').localeCompare(String(b.name || '')); });
    var withOut = [], others = [];
    custs.forEach(function (c) {
      var o = App.gearOut(c.id), any = GEAR.some(function (x) { return o[x.key] > 0; }) || o.tags.length;
      if (any) withOut.push({ c: c, o: o }); else others.push(c);
    });
    var sel = f.customerId ? App.get('customers', f.customerId) : null, out = sel ? App.gearOut(sel.id) : null;
    var parts = [];
    /* 1. company */
    var choices = withOut.map(function (x) {
      var on = f.customerId === x.c.id;
      return '<button type="button" class="choice' + (on ? ' on' : '') + '" data-act="crew.gearCust" data-id="' + h(x.c.id) + '" aria-pressed="' + on + '">' +
        '<span class="ci" aria-hidden="true">' + (on ? '&#10003;' : '&#9675;') + '</span><span class="ct"><b>' + h(x.c.name) + '</b><span>' + h(gearLine(x.o) || 'Tags out') + '</span></span>' + App.exampleTag(x.c) + '</button>';
    }).join('');
    var otherSel = others.length ? '<div class="field"><label for="cr-gear-other">' + (withOut.length ? 'Another company' : 'Company') + '</label>' +
      '<select id="cr-gear-other" data-on-change="crew.gearCustSel"><option value="">Pick a company…</option>' + others.map(function (c) {
        return '<option value="' + h(c.id) + '"' + (f.customerId === c.id ? ' selected' : '') + '>' + h(c.name + (c.example ? ' (example)' : '')) + '</option>';
      }).join('') + '</select></div>' : '';
    parts.push('<section class="stack">' + head('1. Whose gear came back?', '', 'h3') + (choices ? '<div class="stack tight">' + choices + '</div>' : '') + otherSel +
      (custs.length ? '' : empty('No companies yet.', 'The office adds companies. Then you can log gear coming back here.')) + '</section>');
    /* 2. type */
    parts.push('<section class="stack">' + head('2. What came back?', '', 'h3') + '<div class="grid2">' + GEAR.map(function (x) {
      var on = f.type === x.key, n = out ? out[x.key] : 0;
      return '<button type="button" class="choice' + (on ? ' on' : '') + '" data-act="core.set" data-form="gearBack" data-field="type" data-value="' + x.key + '" aria-pressed="' + on + '">' +
        '<span class="ct"><b>' + h(x.label) + '</b><span>' + h(out ? (n ? n + ' out' : 'none out') : ' ') + '</span></span>' + (on ? '<span class="bold" aria-hidden="true">&#10003;</span>' : '') + '</button>';
    }).join('') + '</div></section>');
    /* 3. how many + tags */
    var q = Math.max(1, Math.round(num(f.qty)) || 1), outN = out && f.type ? out[f.type] : null;
    parts.push('<section class="stack"><div class="row between nowrap"><h3>3. How many?</h3><div class="stepper">' +
      '<button type="button"' + STEP_BTN + ' data-act="core.step" data-form="gearBack" data-field="qty" data-step="-1" data-min="1" aria-label="One less">&minus;</button>' +
      '<input type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" id="cr-gear-qty" data-form="gearBack" data-field="qty" data-rerender value="' + App.val('gearBack', 'qty') + '" aria-label="How many came back">' +
      '<button type="button"' + STEP_BTN + ' data-act="core.step" data-form="gearBack" data-field="qty" data-step="1" data-min="1" aria-label="One more">+</button></div></div>' +
      (outN !== null && q > outN ? '<p class="small warn-t bold">' + h('Our records show ' + outN + ' out. That’s OK, save it anyway if that is what came back.') + '</p>' : '') + '</section>');
    var outTags = out ? out.tags : [], extra = (f.tags || []).filter(function (x) { return outTags.indexOf(x) < 0; });
    parts.push('<section class="stack">' + head('4. Tag numbers', '<span class="small muted">If the gear has tags</span>', 'h3') +
      (outTags.length || extra.length ? '<div class="chips">' + outTags.concat(extra).map(function (tag) {
        var on = (f.tags || []).indexOf(tag) >= 0;
        return '<button type="button" class="chip' + (on ? ' on' : '') + '"' + TALL + ' data-act="crew.gearTag" data-tag="' + h(tag) + '" aria-pressed="' + on + '">' + (on ? '&#10003; ' : '') + '<span class="mono">' + h(tag) + '</span></button>';
      }).join('') + '</div>' + (outTags.length ? '<p class="small muted">Tap the tags that came back.</p>' : '') : '') +
      '<form class="row nowrap" style="align-items:flex-end" data-submit="crew.gearTagAdd" autocomplete="off"><div class="field grow"><label for="cr-gear-tag">Tag not listed?</label>' +
      '<input id="cr-gear-tag" type="text" autocomplete="off" autocapitalize="characters" placeholder="B-104" data-form="gearBack" data-field="tagDraft" value="' + App.val('gearBack', 'tagDraft') + '"></div>' +
      '<button type="submit" class="btn secondary lg">Add</button></form></section>');
    var missing = [];
    if (!sel) missing.push('the company');
    if (!f.type) missing.push('what came back');
    if (!(Math.round(num(f.qty)) >= 1)) missing.push('how many (1 or more)');
    parts.push('<section class="stack">' + missingLine(missing, sel && f.type ? 'Ready: ' + plural(q, gearDef(f.type).one, gearDef(f.type).many) + ' back from ' + sel.name + '.' : '') +
      '<button type="button" class="btn primary lg block" data-act="crew.saveGear"' + (missing.length ? ' disabled' : '') + '>Log gear back</button></section>');
    /* out now */
    var outList = withOut.map(function (x) {
      return '<div class="card tight stack tight"><b>' + h(x.c.name) + App.exampleTag(x.c) + '</b>' +
        '<div class="row" style="gap:6px">' + GEAR.filter(function (g2) { return x.o[g2.key] > 0; }).map(function (g2) { return '<span class="pill">' + h(plural(x.o[g2.key], g2.one, g2.many)) + '</span>'; }).join('') +
        x.o.tags.map(function (tag) { return '<span class="pill info mono">' + h(tag) + '</span>'; }).join('') + '</div></div>';
    }).join('');
    var recent = App.sortByTime(App.list('gear'), 'at', 'desc').slice(0, 6).map(function (x) {
      var c = App.get('customers', x.customerId), d = gearDef(x.type);
      return '<div class="row nowrap top" style="gap:10px"><span class="pill ' + (x.dir === 'back' ? 'good' : 'warn') + '" style="flex:none;min-width:46px;justify-content:center">' + (x.dir === 'back' ? 'Back' : 'Out') + '</span>' +
        '<div class="grow" style="min-width:0"><div class="bold">' + h(plural(num(x.qty), d.one, d.many)) + '</div><div class="small muted">' + h((c ? c.name : 'Unknown company') + (x.by ? ' · ' + x.by : '')) + '</div></div>' +
        '<span class="small muted right" style="flex:none">' + h(shortWhen(x.at)) + '</span></div>';
    }).join('');
    parts.push('<section class="stack">' + head('Out with customers now') + (outList || empty('No gear out right now.', '')) + '</section>');
    if (recent) parts.push('<section class="card stack"><h3>Recent gear moves</h3>' + recent + '</section>');
    return screen('Gear', { sub: whoWhere(), right: switchBtn() }, parts.join(''), 'crew.gear');
  }
  function gearDef(key) { for (var i = 0; i < GEAR.length; i++) if (GEAR[i].key === key) return GEAR[i]; return { key: key, label: key, one: key, many: key }; }
  function cleanTag(s) { return trim(s).toUpperCase().replace(/\s+/g, '').slice(0, 20); }
  function splitTags(s) { return String(s || '').split(/[,;\s]+/).map(cleanTag).filter(Boolean); }

  /* ================= actions ================= */
  var actions = {
    /* sign in */
    'crew.addName': function () {
      var f = App.form('crewSignin'), name = trim(f.newName).replace(/\s+/g, ' ').slice(0, 30);
      if (!name) { App.toast('Type your name first.'); return; }
      if (readOnly()) return;
      var crew = (App.settings().crew || []).slice();
      var hit = crew.filter(function (n) { return String(n).toLowerCase() === name.toLowerCase(); })[0];
      f.newName = '';
      f.name = hit || name;
      if (hit) { App.render(); App.toast(hit + ' is already on the list. Picked.'); return; }
      crew.push(name);
      App.toast('Added ' + name + '. Now pick your dock.');
      return App.patch('settings', 'main', { crew: crew });
    },
    'crew.signin': function () {
      var f = App.form('crewSignin');
      if (!f.name || !f.dock) { App.toast('Tap your name and your dock.'); return; }
      App.state.crewName = f.name;
      crewDock = f.dock;
      try { localStorage.setItem('dock24:crew', f.name); localStorage.setItem('dock24:crewDock', f.dock); } catch (e) { /* ignore */ }
      App.go('crew.home');
    },
    'crew.switch': function () {
      App.resetForm('crewSignin', { name: me(), dock: myDock(), newName: '' });
      App.go('crew.signin');
    },

    /* start at a door */
    'crew.start': function (el) {
      var t = App.get('trucks', el.getAttribute('data-id'));
      if (!t) { App.closeSheet(); App.toast('That truck is no longer on the list.'); return; }
      if (t.status !== 'arrived') { App.closeSheet(); App.toast('This truck already started.'); return; }
      var fn = 'door:' + t.id, door = trim(App.form(fn).door);
      if (!door) { App.toast('Tap a free door first.'); return; }
      if (readOnly()) return;
      var busy = busyDoors(dockOf(t), t.id)[door];
      if (busy) { App.form(fn).door = ''; App.render(); App.toast('Door ' + door + ' just got taken by ' + company(busy) + '. Pick another.'); return; }
      var who = me(), v = verbing(t), waited = App.truckTimes(t).waitMs;
      var p = App.logTruck(t, v + ' started at door ' + door, who, { status: 'working', startedAt: App.iso(), door: door, crewName: who });
      App.notify(t.customerId, 'started', v + ' started on ' + (trim(t.truckNo) ? 'truck ' + trim(t.truckNo) : 'your truck') + (refsText(t) ? ' (' + refsText(t) + ')' : '') +
        ' at ' + App.dockName(dockOf(t)) + ', door ' + door + '.' + (waited !== null ? ' Waited ' + App.fmt.dur(waited) + '.' : ''), t.id);
      var drv = App.notifyDriver(t, driverText(t, 'goDoor', { door: door }, 'Go to door ' + door + '.'));
      dropForm(fn);
      App.go('crew.work', { id: t.id });
      App.toast(drv ? 'Started at door ' + door + '. Driver text queued.' : 'Started at door ' + door + '. No driver cell: wave them in.');
      return p;
    },

    /* work screen */
    'crew.countAll': function (el) {
      var f = App.form('work:' + el.getAttribute('data-id'));
      f.counts = f.counts || {};
      f.counts[el.getAttribute('data-key')] = String(el.getAttribute('data-n'));
      App.render();
    },
    /* keeps an unsaved report (back arrow) so photos already taken are not lost; save or cancel clears it */
    'crew.openDamage': function (el) {
      var t = App.get('trucks', el.getAttribute('data-id'));
      if (!t) return;
      App.go('crew.damage', { id: t.id });
    },
    'crew.cancelDamage': function (el) {
      var id = el.getAttribute('data-id');
      dropForm('dmg:' + id);
      App.go('crew.work', { id: id });
    },
    'crew.finish': function (el) {
      var t = App.get('trucks', el.getAttribute('data-id'));
      if (!t) { App.toast('That truck is no longer on the list.'); return; }
      if (t.status !== 'working') { App.go('crew.home'); return; }
      var fn = 'work:' + t.id, f = workForm(t), st = workState(t, f);
      if (st.missing.length) { App.toast('Still missing: ' + joinAnd(st.missing) + '.'); return; }
      if (readOnly()) return;
      var counts = {};
      st.rows.forEach(function (r) { counts[r.id] = r.val; });
      var now = App.iso(), who = me(), pick = t.kind === 'pick';
      var dmgN = App.list('damage', function (d) { return d.truckId === t.id; }).length;
      var total = t.checkedInAt ? App.fmt.dur(Date.parse(now) - Date.parse(t.checkedInAt)) : '';
      var line = 'Done: ' + (st.allKnown && st.expected ? st.counted + ' of ' + st.expected : st.counted) + ' pallets ' + (pick ? 'loaded' : 'counted');
      var p = App.logTruck(t, line, who, { status: 'done', doneAt: now, counts: counts, countNote: trim(f.countNote), photos: (f.photos || []).slice(), crewName: t.crewName || who });
      App.notify(t.customerId, 'done', 'Done at ' + App.dockName(dockOf(t)) + ': ' + plural(st.counted, 'pallet') + (st.allKnown && st.expected && st.counted !== st.expected ? ' (expected ' + st.expected + ')' : '') + ', ' +
        plural(st.photos, 'photo') + ', ' + (dmgN ? plural(dmgN, 'damage report') : 'no damage') + '.' + (total ? ' Total time ' + total + '.' : '') +
        (trim(f.countNote) ? ' Crew note: ' + trim(f.countNote) : ''), t.id);
      App.notifyDriver(t, driverText(t, 'stDone', {}, 'All done. You can pull out.'));
      dropForm(fn);
      App.go('crew.home');
      App.toast(company(t) + ' is done. Customer alert queued.');
      return p;
    },

    /* damage */
    'crew.fixStep': function (el) {
      var f = App.form(el.getAttribute('data-form')), key = el.getAttribute('data-line'), step = Number(el.getAttribute('data-step')) || 0;
      var def = fixDefs().filter(function (d) { return d.key === key; })[0];
      if (!def) return;
      f.fix = f.fix || {};
      f.fix[key] = f.fix[key] || { on: true };
      f.fix[key].qty = Math.max(def.min, Math.round((fixQty(f, def) + step) * 2) / 2);
      App.render();
    },
    'crew.saveDamage': function (el) {
      var t = App.get('trucks', el.getAttribute('data-id'));
      if (!t) { App.toast('That truck is no longer on the list.'); return; }
      var fn = 'dmg:' + t.id;
      if (!App.state.forms[fn]) return;   // already saved (double tap)
      if (readOnly()) return;
      var f = draftForm(fn, dmgInit(t)), st = dmgState(t, f);
      if (st.missing.length) { App.toast('Still missing: ' + joinAnd(st.missing) + '.'); return; }
      var id = App.newId('d'), now = App.iso(), who = me(), kinds = (f.kinds || []).slice(), ref = (st.load && trim(st.load.ref)) || loadName(t);
      var doc = { truckId: t.id, customerId: t.customerId || null, loadId: st.load ? (st.load.id || null) : null, ref: ref, at: now, by: who,
        pallets: st.pallets, kinds: kinds, what: trim(f.what), photos: st.photos.slice(), fixLines: st.lines, status: st.auto ? 'auto' : 'waiting' };
      if (st.auto) { doc.decidedAt = now; doc.decidedBy = 'Auto-approved by customer setting'; }
      var kindsTxt = kinds.map(function (k) { return k.toLowerCase(); }).join(', ');
      var p1 = App.save('damage', id, doc);
      var p2 = App.logTruck(t, 'Damage reported: ' + plural(st.pallets, 'pallet') + ', ' + kindsTxt + (st.auto ? ' (auto-approved by customer setting)' : ''), who,
        { damageIds: (t.damageIds || []).concat([id]) });
      App.notify(t.customerId, 'damage', 'Damage found on ' + ref + ': ' + plural(st.pallets, 'pallet') + ', ' + kindsTxt + '. Photos and fix price are in your portal.' +
        (st.auto ? ' Auto-approved by your setting (under ' + money(st.limit) + '): ' + money(st.total) + '.' : ' Approve or decline there.'), t.id);
      dropForm(fn);
      App.go('crew.work', { id: t.id });
      App.toast(st.auto ? 'Damage saved. Auto-approved by customer setting.' : 'Damage saved. Customer alert queued.');
      return Promise.all([p1, p2]);
    },

    /* secure */
    'crew.tagAdd': function (form) {
      var fn = form.getAttribute('data-form-name'), f = App.form(fn), add = splitTags(f.tagDraft);
      if (!add.length) { App.toast('Type the tag number first.'); return; }
      f.tags = (f.tags || []).slice();
      add.forEach(function (x) { if (f.tags.indexOf(x) < 0) f.tags.push(x); });
      f.tagDraft = '';
      App.render();
    },
    'crew.tagRemove': function (el) {
      var f = App.form(el.getAttribute('data-form-name')), i = Number(el.getAttribute('data-index'));
      f.tags = (f.tags || []).slice();
      f.tags.splice(i, 1);
      App.render();
    },
    'crew.saveSecure': function (el) {
      var t = App.get('trucks', el.getAttribute('data-id'));
      if (!t) { App.toast('That truck is no longer on the list.'); return; }
      var fn = 'sec:' + t.id;
      if (!App.state.forms[fn]) return;   // already saved (double tap)
      if (readOnly()) return;
      var f = draftForm(fn, secInit(t)), st = secState(t, f);
      if (st.missing.length) { App.toast('Still missing: ' + joinAnd(st.missing) + '.'); return; }
      var now = App.iso(), who = me(), gear = {}, photos = {};
      GEAR.forEach(function (g) { var x = f.gear[g.key] || {}; gear[g.key] = { qty: Math.max(0, Math.round(num(x.qty))), owner: x.owner === 'driver' ? 'driver' : 'ours' }; });
      SEC_PHOTOS.forEach(function (x) { photos[x.key] = f.photos[x.key]; });
      var tags = (f.tags || []).slice(), seal = trim(f.seal), conf = st.conf;
      var secure = { gear: gear, tags: tags, seal: seal, photos: photos, confidence: conf, note: trim(f.note), signedBy: who, signature: trim(f.signature), checkedRows: true, signedAt: now };
      /* saving again replaces the gear this screen sent out before */
      var jobs = App.list('gear', function (x) { return x.truckId === t.id && x.dir === 'out' && x.src === 'secure'; }).map(function (x) { return App.remove('gear', x.id); });
      jobs.push(App.logTruck(t, 'Secured: confidence ' + conf + ' of 5, seal ' + seal, who, { secure: secure }));
      var ours = GEAR.filter(function (g) { return gear[g.key].qty > 0 && gear[g.key].owner === 'ours'; });
      var tagType = gear.bars.qty > 0 && gear.bars.owner === 'ours' ? 'bars' : (ours[0] ? ours[0].key : null);
      ours.forEach(function (g) {
        jobs.push(App.save('gear', App.newId('g'), { customerId: t.customerId || null, truckId: t.id, type: g.key, qty: gear[g.key].qty, dir: 'out',
          tags: g.key === tagType ? tags : [], at: now, by: who, note: 'Secured ' + loadName(t), src: 'secure' }));
      });
      var gearTxt = GEAR.filter(function (g) { return gear[g.key].qty > 0; }).map(function (g) {
        return plural(gear[g.key].qty, g.one, g.many) + (gear[g.key].owner === 'driver' ? ' (driver’s)' : '');
      }).join(', ');
      App.notify(t.customerId, 'secured', 'Your load' + (refsText(t) ? ' ' + refsText(t) : trim(t.truckNo) ? ' on truck ' + trim(t.truckNo) : '') + ' is loaded and secured at ' + App.dockName(dockOf(t)) + ': ' + gearTxt + '. Seal ' + seal +
        '. Crew rates it ' + conf + ' of 5 (' + CONF[conf] + ').' + (trim(f.note) ? ' Note: ' + trim(f.note) : '') + ' Photos are in your portal.', t.id);
      dropForm(fn);
      App.go('crew.work', { id: t.id });
      App.toast('Load secured. Customer alert queued.');
      return Promise.all(jobs);
    },

    /* gear coming back */
    'crew.gearCust': function (el) {
      var f = App.form('gearBack');
      f.customerId = el.getAttribute('data-id');
      f.tags = [];
      App.render();
    },
    'crew.gearCustSel': function (el) {
      var f = App.form('gearBack');
      f.customerId = el.value || '';
      f.tags = [];
      App.render();
    },
    'crew.gearTag': function (el) {
      var f = App.form('gearBack'), tag = el.getAttribute('data-tag'), tags = (f.tags || []).slice(), i = tags.indexOf(tag);
      if (i < 0) tags.push(tag); else tags.splice(i, 1);
      f.tags = tags;
      if (i < 0 && (Math.round(num(f.qty)) || 0) < tags.length) f.qty = tags.length;
      App.render();
    },
    'crew.gearTagAdd': function () {
      var f = App.form('gearBack'), add = splitTags(f.tagDraft);
      if (!add.length) { App.toast('Type the tag number first.'); return; }
      f.tags = (f.tags || []).slice();
      add.forEach(function (x) { if (f.tags.indexOf(x) < 0) f.tags.push(x); });
      if ((Math.round(num(f.qty)) || 0) < f.tags.length) f.qty = f.tags.length;
      f.tagDraft = '';
      App.render();
    },
    'crew.saveGear': function () {
      var f = App.form('gearBack'), c = f.customerId ? App.get('customers', f.customerId) : null, d = gearDef(f.type), q = Math.max(1, Math.round(num(f.qty)) || 1);
      if (!c || !f.type) { App.toast('Pick the company and what came back.'); return; }
      if (!(Math.round(num(f.qty)) >= 1)) { App.toast('How many came back? 1 or more.'); return; }
      if (readOnly()) return;
      var p = App.save('gear', App.newId('g'), { customerId: c.id, truckId: null, type: f.type, qty: q, dir: 'back', tags: (f.tags || []).slice(), at: App.iso(), by: me(),
        note: 'Returned at ' + App.dockName(myDock()) });
      App.resetForm('gearBack', { customerId: '', type: '', qty: 1, tags: [], tagDraft: '', note: '' });
      App.toast('Logged: ' + plural(q, d.one, d.many) + ' back from ' + c.name + '.');
      return p;
    }
  };

  App.register({
    'crew.signin': signinView,
    'crew.home': homeView,
    'crew.truck': truckView,
    'crew.doors': doorsSheet,
    'crew.photo': photoSheet,
    'crew.work': workView,
    'crew.damage': damageView,
    'crew.secure': secureView,
    'crew.done': doneView,
    'crew.gear': gearView
  }, actions);

  /* Photo guard: if the page redraws while the camera is open (live data arrives), the old file input is
     detached and its change event never reaches core's document listener, so the photo would be lost.
     Listen on the input itself and hand a detached input's files to core.photo. */
  document.addEventListener('click', function (ev) {
    var el = ev.target;
    if (App.state.role !== 'crew' || !el || el.tagName !== 'INPUT' || el.type !== 'file' || el.getAttribute('data-cr-guard')) return;
    el.setAttribute('data-cr-guard', '1');
    el.addEventListener('change', function () {
      if (document.documentElement.contains(el) || !App.actions['core.photo']) return;   // still on the page: core handles it
      try {
        var r = App.actions['core.photo'](el);
        if (r && r.catch) r.catch(function (e) { App.toast((e && e.message) || 'That photo did not save.'); });
      } catch (e) { App.toast('That photo did not save.'); }
    });
  }, true);

  /* a truck just checked in at my dock: tell whoever holds this phone, whatever screen they are on.
     The yard is watched even while the screen is off; the message waits until the phone is looked at. */
  var seenQueue = null, seenDock = null, pendingNew = [];
  function watchQueue() {
    if (!App.loaded.trucks || !me()) return;
    var dock = myDock(), q = App.queue(dock), ids = {};
    q.forEach(function (t) { ids[t.id] = true; });
    if (seenQueue === null || seenDock !== dock) { seenQueue = ids; seenDock = dock; pendingNew = []; return; }
    q.forEach(function (t) {
      if (!seenQueue[t.id] && t.checkedInAt && App.now() - Date.parse(t.checkedInAt) < 10 * 60000 && pendingNew.indexOf(t.id) < 0) pendingNew.push(t.id);
    });
    seenQueue = ids;
    if (document.hidden || !pendingNew.length) return;
    var fresh = pendingNew.filter(function (id) { return ids[id]; }).map(function (id) { return App.get('trucks', id); });
    pendingNew = [];
    if (!fresh.length) return;
    var t = fresh[fresh.length - 1], n = App.truckPallets(t);
    App.toast(fresh.length > 1 ? fresh.length + ' new trucks in the yard.' : 'New truck in the yard: ' + company(t) + (n ? ', ' + plural(n, 'pallet') : '') + '.');
  }

  /* every second: keep drafts, watch the yard, tick the wait and door clocks without redrawing the page */
  setInterval(function () {
    if (App.state.role !== 'crew') return;
    try { saveDrafts(); } catch (e) { /* storage blocked */ }
    try { watchQueue(); } catch (e) { /* never break the clocks */ }
    if (document.hidden) return;
    var els = document.querySelectorAll('[data-cr-since]'), now = App.now();
    for (var i = 0; i < els.length; i++) {
      var s = Date.parse(els[i].getAttribute('data-cr-since'));
      if (!isNaN(s)) els[i].textContent = clockText(now - s);
    }
  }, 1000);
})();
