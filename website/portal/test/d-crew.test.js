/* Stream D acceptance (PLAN.md 3.D, plus Nick's truck-flow review of Oct 28): the forklift crew. Sign in as Roman 1111.
     node website/portal/test/run.js d [--dist DIR]
   Covers: wait clocks against the goal (Next job, Then rows, cards, door map, bell with its red edge), door picker
   labels and columns, the five truck jobs (UNPACK / UNLOAD inbound, PACK / DELIVERY / PICKUP outbound) named in big words
   with the task in plain words and a colour + number badge per load, UNPACK with nonstop unloading photos, damage snaps
   ("photo now, details later": not sure which load, assigned later, finished at Sort-count-verify, thrown away, wrap-up
   blocked while one waits), the one warehouse photo per load, count notes, unload order, load pills, the damage report
   with photos (count card and pull card), auto-approve, PACK on a multi-stop truck (plan in loading order, packing photos,
   Nick's pull / confirm, Secure with securing photos, the signed manifest with an extra line), DELIVERY (the shipper's
   reference photo and our unloading photos, count with a note, inspect photo per load, load it up, strapped, bills),
   old 5-photo secure reports still displaying, Secure refusals and the wrap-up block, inbound reload steps, "not safe",
   ZZFLAGS.secureStep off, the Gear tab, the office crew phone / shift / rank fields, Spanish, Russian, the three looks
   (brand, clean, hi-vis) at 390 px and the 1400 px screens. Data is always read back from localStorage (the truth). */
const H = require('./harness');
const { PHONE, DESK } = H;

const MIN = 6e4;
const iso = ms => new Date(ms).toISOString();
const clone = o => JSON.parse(JSON.stringify(o));
const RED = 'rgb(192, 57, 43)', GREEN = 'rgb(30, 138, 90)', AMBER = 'rgb(183, 121, 31)';
const PNG1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEklEQVR42mP8z8AARMQBxlGFAD7XAQEZW5rUAAAAAElFTkSuQmCC';

/* the demo doc plus: D6 and D8 free, nobody's own truck working, a truck at D8 that checked in 40 min ago
   (3 loads in the array order A, B, C but seq 2, 0, 1), truck 118 (outbound, yard) checked in 5 min ago and set to the
   PACK job (so it shows Nick's pull cards) */
function fixture(base, t0) {
  const d = clone(base);
  const T = id => d.trailers.find(t => t.id === id);
  for (const id of ['zzt5', 'zzt6']) Object.assign(T(id), { stage: 'departed', dock: null, departedAt: iso(t0 - 5 * MIN) });
  d.trailers.forEach(t => { if (t.stage === 'working') t.workStartedBy = 'Sergio'; });
  Object.assign(T('zzt8'), { arrivedAt: iso(t0 - 5 * MIN), loadJob: 'pack' });
  const tw = Object.assign(clone(T('zzt2')), { id: 'zzd_w', truck: '9040', trailer: 'TW40', carrier: 'Altex Transportation', driver: 'Dana', customerId: 'cu_altex',
    dock: 'D8', stage: 'at-dock', scheduledAt: iso(t0 - 60 * MIN), arrivedAt: iso(t0 - 40 * MIN), dockedAt: iso(t0 - 38 * MIN), instructions: 'Unload 3 loads.' });
  d.trailers.push(tw);
  const s0 = d.shipments.find(s => s.id === 'zzs2_1');
  const load = (id, ref, seq, std, extra) => Object.assign(clone(s0), { id, ref, customerId: 'cu_altex', trailerInId: 'zzd_w', units: { std, lg: 0, crate: 0 }, seq,
    receivedAt: null, status: 'expected', qc: { condition: '', counted: null, note: '' }, exceptions: [], touches: [], photoCount: 0, row: '', rewrapPallets: 0 }, extra || {});
  d.shipments.push(load('zzd_a', 'DA-100', 2, 5), load('zzd_b', 'DB-200', 0, 6, { hazmat: true, stackable: false, pieces: 24, weight: 5400 }), load('zzd_c', 'DC-300', 1, 4));
  return d;
}

/* one more truck on top of the fixture, working at D6 (truck 118 stays in the yard) */
function addTruck(d, t0, o) {
  const tw = Object.assign(clone(d.trailers.find(t => t.id === 'zzt2')), { carrier: 'Altex Transportation', driver: 'Dana', customerId: 'cu_altex', dock: 'D6', stage: 'working',
    scheduledAt: iso(t0 - 70 * MIN), arrivedAt: iso(t0 - 50 * MIN), dockedAt: iso(t0 - 48 * MIN), workStartedAt: iso(t0 - 20 * MIN), workStartedBy: 'Roman', instructions: '',
    paperworkAt: null, sealVerified: null, beforePhotoCount: 0, afterPhotoCount: 0 }, o);
  d.trailers.push(tw);
  return tw;
}
function addLoad(d, o) {
  const s0 = d.shipments.find(s => s.id === 'zzs2_1');
  const s = Object.assign(clone(s0), { customerId: 'cu_altex', trailerOutId: null, seq: 0, receivedAt: null, status: 'expected', qc: { condition: '', counted: null, note: '' },
    exceptions: [], touches: [], photoCount: 0, row: '', rewrapPallets: 0, loadNotes: '', units: { std: 5, lg: 0, crate: 0 }, stop: null, pos: null }, o);
  d.shipments.push(s);
  return s;
}

async function ready(page) { await page.waitForFunction(() => window.__zz && window.__zz.actions && window.__zz.h, null, { timeout: 10000 }); }
async function act(page, name, ...args) {
  return page.evaluate(async ([name, args]) => { let r = window.__zz.actions[name](...args); if (r && r.then) r = await r; await new Promise(z => setTimeout(z, 250)); return r && r.trailers ? true : r ?? null; }, [name, args]);
}
async function calc(page, fn, a) {
  return page.evaluate(([src, a]) => { const f = (0, eval)('(' + src + ')'); return f(window.__zz.h, JSON.parse(localStorage.getItem('cdweb:cd6:doc')), a); }, [fn.toString(), a === undefined ? null : a]);
}
async function crew(h, o) {
  const p = await h.openAs('crew', o);
  const got = p.getByRole('button', { name: /^(Got it|Entendido|Понятно)$/ });
  if (await got.count()) await got.first().click();
  await ready(p);
  return p;
}
/* a crew page on a context that has photos (owner -> count) and a look (theme) set before the page loads */
async function crewWith(h, { seed, viewport, photos, theme }) {
  const ctx = await h.newContext({ viewport: viewport || PHONE, seed });
  await ctx.addInitScript(([ph, th, png]) => {
    try {
      if (th) localStorage.setItem('cd6:theme', th);
      if (localStorage.getItem('__zzphotos')) return;
      localStorage.setItem('__zzphotos', '1');
      for (const [owner, n] of Object.entries(ph || {})) localStorage.setItem('cdweb:cd6:photos:' + owner, JSON.stringify(Array.from({ length: n }, (_, k) => ({ id: owner + k, src: png, at: new Date().toISOString(), by: 'Office' }))));
    } catch (e) {}
  }, [photos || {}, theme || null, PNG1]);
  return crew(h, { context: ctx });
}
const into = async (loc) => { await loc.evaluate(el => el.scrollIntoView({ block: 'center' })); await loc.page().waitForTimeout(250); };
const color = (loc) => loc.evaluate(el => getComputedStyle(el).color);
const wait = (p, ms) => p.waitForTimeout(ms || 350);
/* the card (xj) for a truck on All trucks */
const card = (p, truck, trailer) => p.locator(`:text("Truck ${truck} · Trailer ${trailer}")`).locator('xpath=ancestor::*[.//button[contains(@class,"rounded-lg")]][1]');
async function openTruck(p, truck, trailer) {
  await p.getByRole('button', { name: /^(All trucks|Camiones|Фуры)/ }).first().click();
  await wait(p, 300);
  await card(p, truck, trailer).locator('button').last().click();
  await wait(p, 600);
}
/* a step of the truck: the button in the step bar always opens it */
const step = async (p, label) => { await p.getByRole('button', { name: label, exact: true }).first().click(); await wait(p, 400); };
const stepNames = p => p.$$eval('div[style*="sticky"] button[title]', bs => bs.map(b => b.title));
let UP = null;
const files = n => Array.from({ length: n }, () => UP);
const photosOf = (p, owner) => p.evaluate(async o => (await window.__zz.h.photos.ls(o)).length, owner);
const until = (p, fn, arg) => p.waitForFunction(fn, arg, { timeout: 6000 });
const countIs = (p, sel, n) => until(p, ([s, n]) => { const el = document.querySelector(s); return el && el.innerText.trim() === String(n); }, [sel, n]);

/* how many door buttons sit on the first row of the door picker */
const doorCols = p => p.$$eval('button[data-door]', bs => { const y = Math.round(bs[0].getBoundingClientRect().top); return bs.filter(b => Math.abs(Math.round(b.getBoundingClientRect().top) - y) < 4).length; });

/* long screens: viewport-sized screenshots down the page (or down a modal), name-1, name-2, ... */
async function segs(h, p, name, o = {}) {
  const max = o.max || 6;
  const sc = o.in ? await p.locator(o.in).evaluateHandle(el => { let n = el; while (n && n !== document.body) { const s = getComputedStyle(n); if (/(auto|scroll)/.test(s.overflowY) && n.scrollHeight > n.clientHeight) return n; n = n.parentElement; } return document.scrollingElement; }) : null;
  const total = sc ? await sc.evaluate(n => n.scrollHeight) : await p.evaluate(() => document.scrollingElement.scrollHeight);
  const step = (sc ? await sc.evaluate(n => n.clientHeight) : p.viewportSize().height) - 140;
  for (let k = 0, y = 0; k < max && (k === 0 || y < total - 140); k++, y += step) {
    if (sc) await sc.evaluate((n, y) => { n.scrollTop = y; }, y); else await p.evaluate(y => window.scrollTo(0, y), y);
    await h.check(p, name + '-' + (k + 1), { settle: 200 });
  }
  if (sc) await sc.evaluate(n => { n.scrollTop = 0; }); else await p.evaluate(() => window.scrollTo(0, 0));
}
/* every button the crew taps on these parts is at least 44 px tall (gloves); the sheet's close X is Nick's 40 px (A42) */
const smallTargets = p => p.$$eval('[data-zz=phototools] button, [data-zz=snapcard] button, [data-zz=countrow] button, [data-zz=loadrow] button, [data-zz=mfform] button, [data-zz=snappick] button, [data-zz=floatbar] button',
  bs => bs.filter(b => b.offsetParent && b.getAttribute('aria-label') !== 'Close' && b.getBoundingClientRect().height < 44).map(b => (b.innerText || b.getAttribute('aria-label') || '').slice(0, 30) + ' ' + Math.round(b.getBoundingClientRect().height)));

/* UNPACK seed: truck 7070 from Newark (East Coast), working at D6, 3 loads that stay */
function unpackSeed(seed, t0) {
  const d = clone(seed);
  addTruck(d, t0, { id: 'zzd_u', truck: '7070', trailer: 'TU70', jobType: '' });
  addLoad(d, { id: 'zzd_u1', ref: '118882', trailerInId: 'zzd_u', seq: 0, origin: 'Newark, NJ', lane: 'reno', units: { std: 5, lg: 0, crate: 0 } });
  addLoad(d, { id: 'zzd_u2', ref: '118901', trailerInId: 'zzd_u', seq: 1, origin: 'Newark, NJ', lane: 'reno', units: { std: 6, lg: 0, crate: 0 } });
  addLoad(d, { id: 'zzd_u3', ref: '118950', trailerInId: 'zzd_u', seq: 2, origin: 'Columbus, OH', lane: 'reno', units: { std: 4, lg: 0, crate: 0 } });
  return d;
}
/* PACK seed: truck 8080 (outbound) with loads of Altex and Pine Ridge for two stops; multi-stop plan set by the customer */
function packSeed(seed, t0) {
  const d = clone(seed);
  addTruck(d, t0, { id: 'zzd_p', truck: '8080', trailer: 'TP80', direction: 'outbound', jobType: 'Consolidate & reload', multiStop: true });
  const rcv = { receivedAt: iso(t0 - 300 * MIN), status: 'staged', qc: { condition: 'Good', counted: 5, note: '' } };
  addLoad(d, { id: 'zzd_p1', ref: '120001', trailerInId: 'zzt1', trailerOutId: 'zzd_p', seq: 0, row: 'R31', stop: 2, pos: 'nose', ...rcv });
  addLoad(d, { id: 'zzd_p2', ref: '120002', customerId: 'cu_pine', trailerInId: 'zzt3', trailerOutId: 'zzd_p', seq: 1, row: 'R32', stop: 1, pos: 'tail', units: { std: 4, lg: 0, crate: 0 }, ...rcv });
  addLoad(d, { id: 'zzd_p3', ref: '120003', trailerInId: 'zzt1', trailerOutId: 'zzd_p', seq: 2, row: 'R33', stop: 2, pos: 'middle', units: { std: 3, lg: 0, crate: 0 }, ...rcv });
  return d;
}
/* DELIVERY seed: truck 9090 (outbound, office set it to delivery) with 2 loads that came in on truck 5150 */
function deliverySeed(seed, t0, multi) {
  const d = clone(seed);
  addTruck(d, t0, { id: 'zzd_vin', truck: '5150', trailer: 'T515', stage: 'departed', dock: null, departedAt: iso(t0 - 600 * MIN), workStartedBy: 'Sergio' });
  addTruck(d, t0, { id: 'zzd_v', truck: '9090', trailer: 'TV90', direction: 'outbound', loadJob: 'delivery', jobType: '', multiStop: !!multi, shipperPhotoCount: 1 });
  const rcv = { receivedAt: iso(t0 - 600 * MIN), status: 'staged', qc: { condition: 'Good', counted: 5, note: '' } };
  addLoad(d, { id: 'zzd_v1', ref: '130001', trailerInId: 'zzd_vin', trailerOutId: 'zzd_v', seq: 0, row: 'R40', dest: 'Walmart DC, Reno', ...(multi ? { stop: 1, pos: 'tail' } : {}), ...rcv });
  addLoad(d, { id: 'zzd_v2', ref: '130002', trailerInId: 'zzd_vin', trailerOutId: 'zzd_v', seq: 1, row: 'R41', dest: 'Walmart DC, Reno', units: { std: 4, lg: 0, crate: 0 }, ...(multi ? { stop: 2, pos: 'nose', dest: 'Target, Sparks' } : {}), ...rcv });
  return d;
}

H.main('d-crew', async (h, t) => {
  UP = h.UPLOAD_PNG;
  const base = await h.baseDoc();
  const t0 = Date.now();
  const seed = fixture(base, t0);

  /* ================= wait clocks, doors, bell ================= */
  t.section('wait clocks against the goal');
  let p = await crew(h, { viewport: PHONE, seed });
  let s = await h.text(p);
  t.ok(s.includes('Altex Transportation') && s.includes('Truck 9040'), 'Next job is the truck that has waited longest at a door (9040 at D8)');
  const jobClock = p.locator('section [data-zz=clock]').first();
  t.ok(/Waiting 4[01]m · goal 30/.test(await jobClock.innerText()), 'Next job shows "Waiting 40m · goal 30" (' + (await jobClock.innerText()) + ')');
  t.eq(await color(jobClock), RED, 'the Next job clock is red (over the goal)');
  t.ok(await p.locator('[data-zz=clock]').count() >= 2, 'the Then rows carry clocks too');
  await h.check(p, 'nextjob-390');

  await p.getByRole('button', { name: /All trucks/ }).first().click();
  await wait(p);
  const pill = card(p, '9040', 'TW40').locator('[data-zz=waitpill]');
  t.ok(/Waiting 4[01]m · goal 30/.test(await pill.innerText()), 'its truck card shows the same red pill: ' + (await pill.innerText()));
  t.eq(await color(pill), RED, 'the card pill is red');
  const yardPill = card(p, '63', 'T420').locator('[data-zz=waitpill]'), yardPlace = card(p, '63', 'T420').locator('[data-zz=placepill]');
  t.ok(/^#\d in line$/.test((await yardPlace.innerText()).trim()) && /^Waiting \d+m · goal 30$/.test((await yardPill.innerText()).trim()), 'a yard truck card shows its place in line and its wait: ' + (await yardPlace.innerText()) + ' / ' + (await yardPill.innerText()));
  const doors = p.locator('[data-zz=doors]');
  t.ok(await doors.count() === 1, 'All trucks has a Doors map');
  const d8 = doors.locator('button[aria-label^="D8 "]');
  t.ok(/Truck 9040/.test(await d8.innerText()) && /Altex/.test(await d8.innerText()) && /Waiting 4[01]m/.test(await d8.innerText()), 'D8 tile: truck, short company and clock');
  t.ok(/Free/.test(await doors.locator('[aria-label="D6 Free"]').innerText()), 'a free door shows Free (green)');
  await segs(h, p, 'alltrucks-390');

  await p.locator('button[aria-label^="Notifications"]').click();
  await wait(p);
  s = await h.text(p);
  t.ok(/Truck 9040 has waited 4[01]m at D8\. The goal is 30 min\. Start it\./.test(s), 'crew bell lists a waitover alert for truck 9040');
  const wo = p.getByRole('button', { name: /Truck 9040 has waited/ }).first();
  t.eq(await wo.evaluate(el => getComputedStyle(el).borderLeftColor), RED, 'the waitover alert has the red edge (urgent)');
  t.ok(await wo.evaluate(el => getComputedStyle(el).color) !== 'rgb(255, 255, 255)', 'and its text is readable (not white on white)');
  await h.check(p, 'bell-390', { settle: 900 });
  await p.keyboard.press('Escape');

  await act(p, 'zzSettings', { waitGoalMin: 60 });
  await wait(p, 600);
  const pill60 = card(p, '9040', 'TW40').locator('[data-zz=waitpill]');
  t.ok(/goal 60/.test(await pill60.innerText()), 'with the goal at 60 the pill reads goal 60');
  t.ok([GREEN, AMBER].includes(await color(pill60)), 'and it turns green or amber (' + (await color(pill60)) + ')');
  await act(p, 'zzSettings', { waitGoalMin: 30 });
  await wait(p, 400);

  /* ================= door picker ================= */
  t.section('door picker labels busy doors');
  await card(p, '118', 'T970').getByRole('button', { name: 'Give it a door' }).click();
  await wait(p);
  await p.getByRole('button', { name: 'Pick a door for this truck' }).click();
  await wait(p);
  const dD1 = p.locator('button[data-door="D1"]'), dD6 = p.locator('button[data-door="D6"]');
  t.ok(await dD1.isDisabled() && /Altex/.test(await dD1.innerText()), 'busy D1 is disabled and labelled with the company (' + (await dD1.innerText()).replace(/\n/g, ' / ') + ')');
  t.ok(await p.locator('button[data-door="D8"]').isDisabled() && /waiting 4[01]m/.test(await p.locator('button[data-door="D8"]').innerText()), 'busy D8 shows its clock');
  t.ok(!(await dD6.isDisabled()) && /Free/.test(await dD6.innerText()), 'free D6 can be picked');
  t.ok(+(await dD1.evaluate(el => getComputedStyle(el).opacity)) === 0.5, 'dimmed doors use opacity 50');
  t.eq(await doorCols(p), 3, 'door picker: 3 doors per row on a phone, so the labels fit');
  t.ok(await p.$$eval('button[data-door]', bs => bs.every(b => b.getBoundingClientRect().height >= 48)), 'door buttons are at least 48 px tall (gloves)');
  await h.check(p, 'doorpicker-390');
  await dD6.click();
  await wait(p, 500);
  let doc = await h.readDoc(p);
  t.ok(doc.trailers.find(x => x.id === 'zzt8').dock === 'D6', 'truck 118 is now at D6');

  /* ================= PACK (truck 118): job words, pull card count note, Short report, damage report ================= */
  t.section('PACK job: top summary, pull card count note, Short report, damage report');
  t.ok(/^PACK · Consolidated trailer$/.test((await p.locator('[data-zz=jobtitle]').innerText()).replace(/\s+/g, ' ').trim()), 'the truck is named in big words at the top: "PACK · Consolidated trailer"');
  t.ok(/3 loads to build · 24 pallets/.test(await p.locator('[data-zz=jobtask]').innerText()), 'the job card says the task in plain words: "3 loads to build · 24 pallets"');
  t.eq(await stepNames(p), ['Pack', 'Secure the load', 'Manifest', 'Wrap up'], 'PACK steps: Pack, Secure the load, Manifest, Wrap up (no photo log)');
  await p.getByRole('button', { name: /^Start/ }).first().click();
  await wait(p, 500);
  const pull = p.locator('div.rounded-lg.p-3.space-y-3').filter({ hasText: 'PL-3301' }).first();
  t.ok(await pull.locator('[data-zz=badge]').count() === 1, 'the pull card shows the load badge');
  await pull.locator('input[aria-label="Pallets counted"]').fill('7');
  await wait(p, 200);
  const conf = pull.getByRole('button', { name: /^Confirm 7/ });
  t.ok(await conf.isDisabled(), 'a count that does not match (7 of 8) cannot be confirmed without a note');
  t.ok(await pull.locator('[data-zz=countnote]').count() === 1 && /Why is it short 1\? \(required\)/.test(await pull.locator('[data-zz=countnote]').innerText()), 'the note box asks why it is short 1');
  await into(pull);
  await h.check(p, 'pull-note-390');
  await pull.locator('[data-zz=countnote] input').fill('Only 7 in lane R20');
  await conf.click();
  await wait(p, 500);
  doc = await h.readDoc(p);
  let pl1 = doc.shipments.find(x => x.ref === 'PL-3301');
  t.ok(pl1.pullCount === 7 && (pl1.exceptions || []).filter(x => x.kind === 'Short' && !x.resolved && /Only 7 in lane R20/.test(x.note)).length === 1, 'confirming opens one Short report with the note');
  await pull.getByRole('button', { name: /^Count confirmed/ }).click();
  await wait(p, 500);
  doc = await h.readDoc(p);
  t.eq((doc.shipments.find(x => x.ref === 'PL-3301').exceptions || []).filter(x => x.kind === 'Short').length, 1, 'a second tap on "Count confirmed" does not open a second Short report');

  await pull.locator('[data-zz=dmgadd]').click();
  await wait(p);
  let dm = p.locator('[data-zz=dmg]');
  t.ok(await dm.count() === 1, 'the pull card "Damage? Report it" opens the damage report (ZZDmg)');
  await dm.locator('[data-kind="Torn wrap"]').click();
  await dm.locator('[data-shot-input=wide]').setInputFiles(h.UPLOAD_PNG);
  await dm.locator('[data-shot-input=close]').setInputFiles(h.UPLOAD_PNG);
  await p.waitForFunction(() => /2 of 2/.test((document.querySelector('[data-zz=dmgcount]') || {}).innerText || ''), null, { timeout: 5000 });
  await dm.getByRole('button', { name: 'Save damage report' }).click();
  await wait(p, 600);
  doc = await h.readDoc(p);
  pl1 = doc.shipments.find(x => x.ref === 'PL-3301');
  let dx = (pl1.exceptions || []).filter(x => x.kind === 'Damage');
  t.ok(dx.length === 1 && dx[0].photoOwner === 'dmg:' + dx[0].id && dx[0].photoCount >= 2 && dx[0].kinds.includes('Torn wrap') && dx[0].est.lines.length >= 2 && !dx[0].draft, 'the pull card damage report saved with photos, kinds and fix lines (a real report, not a draft)');
  t.ok(await pull.locator('[data-zz=dmgreport]').count() === 1, 'the pull card lists the report');
  await into(pull.locator('[data-zz=dmgreport]'));
  await h.check(p, 'pull-reported-390');

  /* ================= secure the load: securing photos instead of 5 fixed slots ================= */
  t.section('secure the load (securing photos, any number)');
  t.ok(await p.getByRole('button', { name: 'Secure the load', exact: true }).count() === 1, 'the outbound truck has a "Secure the load" step in the step bar');
  await p.getByRole('button', { name: /Wrap up & send/ }).click();
  await wait(p);
  t.ok(await p.locator('[data-zz=securefirst]').count() === 1 && await p.getByRole('button', { name: 'Send to dispatch', exact: true }).isDisabled(), '"Send to dispatch" is blocked until the load is secured');
  t.ok(await p.locator('[data-zz=wrapstop-manifest]').count() === 1 && await p.locator('[data-zz=wrapstop-photos]').count() === 1, 'and until the manifest is signed and there is a packing photo (each with its own box)');
  await h.check(p, 'wrap-blocked-390');
  await p.keyboard.press('Escape');
  await wait(p);
  await step(p, 'Wrap up');
  t.ok(/Secured\s*not yet/.test(await h.text(p)) && /Manifest\s*not yet/.test(await h.text(p)) && /Packing photos\s*none yet/.test(await h.text(p)), 'the Wrap up summary has Secured, Manifest and Packing photos rows (not yet)');
  t.ok(!/Photo log/.test(await h.text(p)), 'there is no photo log any more');
  await p.getByRole('button', { name: /Wrap up & send/ }).click();
  await wait(p);
  await p.evaluate(() => window.scrollTo(0, document.scrollingElement.scrollHeight));
  await p.getByRole('button', { name: 'Go to Secure the load' }).click();
  await wait(p, 900);
  const stTop = await p.locator('[data-zz=securestep]').evaluate(el => el.getBoundingClientRect().top);
  t.ok(stTop >= 0 && stTop < 844 * 0.6, '"Go to Secure the load" scrolls the step into view (top at ' + Math.round(stTop) + ' px)');
  const sf = p.locator('[data-zz=secureform]');
  t.ok(await sf.count() === 1, '"Go to Secure the load" opens the secure form');
  t.ok(await sf.locator('[data-slot]').count() === 0, 'no fixed nose / middle / tail photo slots ("it\'s Tetris")');
  const saveSec = sf.getByRole('button', { name: 'Save and sign' });
  t.ok(await saveSec.isDisabled(), 'Save and sign starts disabled');
  const plus = (k, n) => (async () => { for (let i = 0; i < n; i++) await sf.locator(`[data-gear=${k}] button[aria-label^="One more"]`).click(); })();
  await plus('plywood', 6); await plus('bars', 2); await plus('straps', 4);
  await sf.locator('[data-gear=straps] [data-owner=driver]').click();
  for (const tg of ['b-104', 'B-105']) { await sf.locator('input[aria-label="Tag number"]').fill(tg); await sf.locator('[data-zz=tagadd]').click(); }
  t.ok(/Usually 5 to 6/.test(await sf.locator('[data-gear=plywood]').innerText()) && /6/.test(await sf.locator('[data-gear=plywood] output').innerText()), 'gear rows have big steppers and hints');
  const seal = sf.locator('input[aria-label="Seal number"]');
  t.ok((await seal.inputValue()) === '', 'seal box starts empty (no outbound seal yet)');
  await seal.fill('sl-778899');
  t.ok(/a photo of how it's secured/.test(await sf.locator('[data-zz=missing]').innerText()) && await saveSec.isDisabled(), 'without a securing photo Save is refused (' + (await sf.locator('[data-zz=missing]').innerText()) + ')');
  await sf.locator('[data-zz=secphotos] [data-zz=caminput]').setInputFiles(files(2));
  await countIs(p, '[data-zz=secphotos] [data-zz=camcount]', 2);
  doc = await h.readDoc(p);
  t.eq(doc.trailers.find(x => x.id === 'zzt8').strapPhotoCount, 2, 'the securing photo count is saved live (strapPhotoCount)');
  t.eq(await photosOf(p, 'strap:zzt8'), 2, 'the photos are stored under strap:<truck>');
  t.ok(await saveSec.isDisabled() && /how solid/.test(await sf.locator('[data-zz=missing]').innerText()), 'still refused without a confidence level');
  await sf.locator('[data-conf="1"]').click();
  t.ok(await sf.locator('[data-zz=notsafe]').count() === 1, 'confidence 1 shows the red "Do not let it leave like this" warning');
  await sf.locator('[data-conf="3"]').click();
  t.ok(await saveSec.isDisabled() && /what would make it safer/.test(await sf.locator('[data-zz=missing]').innerText()), 'confidence 3 needs a note');
  await sf.locator('textarea').fill('One more strap at the tail would help');
  t.ok(await saveSec.isDisabled() && /check box/.test(await sf.locator('[data-zz=missing]').innerText()), 'still refused without the check box');
  await sf.locator('[data-zz=secchk]').check();
  t.ok(await saveSec.isDisabled() && /signature/.test(await sf.locator('[data-zz=missing]').innerText()), 'still refused without a signature');
  await sf.locator('[data-zz=secsign]').fill('Roman');
  t.ok(!(await saveSec.isDisabled()), 'Save and sign is ready');
  await segs(h, p, 'secure-form-390', { max: 8 });
  await saveSec.click();
  await wait(p, 700);
  doc = await h.readDoc(p);
  let tr8 = doc.trailers.find(x => x.id === 'zzt8');
  t.ok(tr8.secure && tr8.secure.signedBy === 'Roman' && tr8.secure.confidence === 3 && tr8.secure.checkedRows === true && tr8.secure.signature === 'Roman', 'the truck has the secure report');
  t.ok(tr8.secure.photoOwner === 'strap:zzt8' && tr8.secure.photoCount === 2 && tr8.secure.v === 2 && tr8.secure.photos === null, 'the new report shape: photoOwner strap:<truck>, photoCount 2, v 2 (no named slots)');
  t.ok(tr8.sealOut === 'SL-778899' && tr8.secure.seal === 'SL-778899', 'sealOut is the seal in capitals');
  t.eq(tr8.secure.tags, ['B-104', 'B-105'], 'tags saved in capitals');
  const outRows = (doc.zzGear || []).filter(g => g.trailerId === 'zzt8' && g.dir === 'out' && g.src === 'secure');
  t.eq(outRows.map(g => g.type + ':' + g.qty).sort(), ['bars:2', 'plywood:6'], 'zzGear has one "out" row per type marked ours (straps were the driver\'s)');
  t.eq(outRows.find(g => g.type === 'bars').tags, ['B-104', 'B-105'], 'tags ride on the bars row');
  t.ok(await calc(p, (hh, d) => hh.ZZtrail(d, 'zzt8').some(x => /Secured the load: PL-/.test(x.text))), 'the load trail shows "Secured the load" (fQ label)');
  await step(p, 'Secure the load');
  t.ok(await p.locator('[data-zz=securedone]').count() === 1 && /Secured 3\/5 · OK/.test(await p.locator('[data-zz=securedone]').innerText()), 'the step shows the saved report');
  t.ok(await p.locator('[data-zz=securedone] img').count() >= 2, 'with its securing photos');
  await into(p.locator('[data-zz=securedone]'));
  await h.check(p, 'secure-done-390');
  await p.getByRole('button', { name: /Wrap up & send/ }).click();
  await wait(p);
  t.ok(await p.locator('[data-zz=securefirst]').count() === 0 && await p.locator('[data-zz=wrapstop-manifest]').count() === 1, 'after securing, the secure block is gone (the manifest block stays)');
  t.ok((await p.locator('input[placeholder="SL-00000"]').last().inputValue()) === 'SL-778899', 'the wrap-up seal is filled in from the secure report');
  await p.keyboard.press('Escape');
  await wait(p);
  await step(p, 'Wrap up');
  t.ok(/Secured\s*3\/5/.test(await h.text(p)), 'the Wrap up summary shows "Secured 3/5"');

  /* leaderboard: +5 for the securement */
  const p2 = await crew(h, { viewport: PHONE, seed: doc });
  await p2.getByRole('button', { name: /Leaderboard/ }).first().click();
  await wait(p2);
  s = await h.text(p2);
  t.ok(/1 load secured/.test(s) && s.includes('5 per load secured') && s.includes('unloading and loading photos too'), 'leaderboard counts the securement and explains the points (photos on the truck count too)');
  await h.check(p2, 'leaderboard-390');

  /* ================= Gear tab ================= */
  t.section('gear tab');
  await p2.getByRole('button', { name: /^Gear/ }).first().click();
  await wait(p2);
  const outCard = p2.locator('[data-zz=gearout]').filter({ hasText: 'Pyramid Lake Hauling' });
  t.ok(await outCard.count() === 1 && /6 Plywood sheets · 2 Load bars/.test(await outCard.innerText()) && /B-104/.test(await outCard.innerText()), 'Out with customers now lists the gear and tags');
  await outCard.getByRole('button', { name: 'Log gear back' }).click();
  await wait(p2);
  await p2.locator('[data-type=bars]').click();
  await p2.locator('#zz-gear-back button[aria-label^="One more"]').click();
  await p2.locator('#zz-gear-back').getByRole('button', { name: 'B-104' }).click();
  await p2.locator('#zz-gear-back').getByRole('button', { name: 'B-105' }).click();
  await segs(h, p2, 'gear-form-390');
  await p2.locator('#zz-gear-back').getByRole('button', { name: 'Log gear back' }).click();
  await wait(p2, 600);
  const go = await calc(p2, (hh, d) => hh.ZZgearOut(d, 'zzc8'));
  t.ok(go.bars === 0 && go.plywood === 6 && go.tags.length === 0, 'logging 2 bars back lowers ZZgearOut and the returned tags disappear (' + JSON.stringify(go) + ')');
  doc = await h.readDoc(p2);
  t.ok((doc.zzGear || []).some(g => g.dir === 'back' && g.type === 'bars' && g.qty === 2 && g.src === 'return' && g.by === 'Roman'), 'the return is a ledger row (dir back, src return, by Roman)');
  t.ok(/Logged: 2 Load bars back from Pyramid Lake Hauling/.test(await h.text(p2)) && await p2.locator('[data-zz=gearmove]').count() >= 3, 'confirmation line and the last moves list');
  await segs(h, p2, 'gear-390');
  await p2.context().close();
  await p.context().close();

  /* ================= UNLOAD (truck 9040): unload order, count note, damage from the count card ================= */
  t.section('UNLOAD job: unload order, count note, damage report from the count card');
  p = await crew(h, { viewport: PHONE, seed });
  await p.getByRole('button', { name: /^Start unloading/ }).first().click();
  await wait(p, 500);
  doc = await h.readDoc(p);
  t.ok(doc.trailers.find(x => x.id === 'zzd_w').stage === 'working', 'truck 9040 started');
  t.ok(/^UNLOAD · Pickup trailer$/.test((await p.locator('[data-zz=jobtitle]').innerText()).replace(/\s+/g, ' ').trim()) && /3 loads to count and put away · 15 pallets/.test(await p.locator('[data-zz=jobtask]').innerText()), 'a pickup trailer: "UNLOAD · Pickup trailer", "3 loads to count and put away · 15 pallets"');
  t.eq(await stepNames(p), ['Paperwork', 'Photo before', 'Unload', 'Sort, count, verify', 'Wrap up'], 'UNLOAD steps: Paperwork, Photo before, Unload, Sort-count-verify, Wrap up');
  await step(p, 'Unload');
  const nextOff = async () => p.locator(':text("Next off the truck")').locator('xpath=following-sibling::*[1]').innerText();
  let no = await nextOff();
  t.ok(/DB-200/.test(no), '"Next off the truck" follows seq: DB-200 (seq 0) first, not DA-100 (array first)');
  t.ok(/Hazmat/.test(no) && /Do not stack/.test(no) && /24 pieces/.test(no) && /5,400 lb/.test(no), 'the load row shows Hazmat, Do not stack, pieces and weight');
  await into(p.locator(':text("Next off the truck")'));
  await h.check(p, 'nextoff-390');
  await p.getByRole('button', { name: /it's off, count it next/ }).click();
  await wait(p, 500);
  no = await nextOff();
  t.ok(/DC-300/.test(no), 'then DC-300 (seq 1)');
  await p.getByRole('button', { name: /it's off, count it next/ }).click();
  await wait(p, 500);
  await p.getByRole('button', { name: /it's off, count it next/ }).click();
  await wait(p, 500);
  t.ok(/Everything is off the truck/.test(await h.text(p)), 'all three off: "Everything is off the truck."');
  await p.getByRole('button', { name: 'Next: sort, count, verify' }).click();
  await wait(p, 600);
  t.eq(await p.locator('[data-zz=step-verify]').count(), 1, '"Next: sort, count, verify" opens the counting step');
  // DB-200: Damaged -> Save opens ZZDmg
  const cardB = p.locator('div.rounded-lg').filter({ has: p.locator('span.font-black', { hasText: 'DB-200' }) }).last();
  t.ok(await cardB.locator('[data-zz=badge]').count() >= 1, 'the count card shows the load badge');
  t.ok(!/on the dock, whole load/.test(await h.text(p)) && !/Photo · off the truck/.test(await h.text(p)), 'no "photo off the truck / on the dock, whole load" box any more');
  await cardB.locator('button').first().click().catch(() => {});
  await wait(p);
  if (await cardB.getByRole('button', { name: 'Damaged', exact: true }).count() === 0) { await cardB.locator('button').first().click(); await wait(p); }
  await cardB.getByRole('button', { name: 'Damaged', exact: true }).click();
  await cardB.getByRole('button', { name: '05', exact: true }).click().catch(() => {});
  t.ok(await cardB.locator('[data-zz=whphoto]').count() === 1 && /Photo of the load left in the warehouse/.test(await cardB.locator('[data-zz=whphoto]').innerText()), 'step 4 of the count card: the one photo per load, "Photo of the load left in the warehouse"');
  await cardB.getByRole('button', { name: 'Save', exact: true }).click();
  await wait(p);
  dm = p.locator('[data-zz=dmg]');
  t.ok(await dm.count() === 1, 'choosing Damaged and saving opens ZZDmg first');
  const saveD = dm.getByRole('button', { name: 'Save damage report' });
  t.ok(await saveD.isDisabled() && /the kind of damage/.test(await dm.locator('[data-zz=missing]').innerText()), 'Save is disabled with "Still missing: ..."');
  await dm.locator('[data-kind=Crushed]').click();
  await dm.locator('[data-shot-input=wide]').setInputFiles(h.UPLOAD_PNG);
  await p.waitForFunction(() => /1 of 2/.test((document.querySelector('[data-zz=dmgcount]') || {}).innerText || ''), null, { timeout: 5000 });
  t.ok(await saveD.isDisabled() && /1 more photo/.test(await dm.locator('[data-zz=missing]').innerText()), 'with 1 photo Save stays disabled');
  await dm.locator('button[aria-label="One more pallets"]').click();
  t.ok(/2/.test(await dm.locator('[data-line=rewrap] output').innerText()), 'the pallets stepper moves the rewrap line with it');
  await dm.locator('[data-line=pallet] button[aria-pressed]').click();
  t.ok(/\$110\.00/.test(await dm.locator('[data-zz=dmgtotal]').innerText()), 'fix lines toggle and total (2 rewrap $30 + labor $60 + pallet $20 = $110)');
  t.ok(/Customer will approve or decline/.test(await dm.locator('[data-zz=approve]').innerText()), 'with no auto-approve limit: "Customer will approve or decline"');
  await dm.locator('[data-shot-input=close]').setInputFiles(h.UPLOAD_PNG);
  await p.waitForFunction(() => /2 of 2/.test((document.querySelector('[data-zz=dmgcount]') || {}).innerText || ''), null, { timeout: 5000 });
  await dm.locator('textarea').fill('Forks went through the wrap');
  t.ok(!(await saveD.isDisabled()), 'with a kind and 2 photos Save works');
  await segs(h, p, 'dmg-modal-390', { in: '[data-zz=dmg]' });
  await saveD.click();
  await wait(p, 800);
  doc = await h.readDoc(p);
  let lb = doc.shipments.find(x => x.id === 'zzd_b');
  dx = (lb.exceptions || []).filter(x => x.kind === 'Damage');
  t.ok(dx.length === 1, 'the load has exactly one Damage exception (got ' + dx.length + ')');
  t.ok(dx[0].photoOwner === 'dmg:' + dx[0].id && dx[0].photoCount >= 2 && dx[0].est.lines.length === 3 && dx[0].pallets === 2 && dx[0].what === 'Forks went through the wrap', 'it has photoOwner, photoCount >= 2, est.lines, pallets and what happened');
  t.ok(!dx[0].answer, 'no auto-approve limit: the answer waits for the customer');
  t.ok(lb.qc.condition === 'Damaged' && lb.qc.counted === 6 && lb.receivedAt, 'the count was saved after the report (Damaged, 6)');
  t.ok(ieq(lb.rewrapPallets, 0), 'rewrap priced in the report is not billed again through rewrapPallets');
  await cardB.locator('button').first().click();
  await wait(p);
  if (await cardB.locator('[data-zz=dmgreport]').count() === 0) { await cardB.locator('button').first().click(); await wait(p); }
  t.ok(await cardB.locator('[data-zz=dmgreport]').count() === 1 && /Crushed/.test(await cardB.locator('[data-zz=dmgreport]').innerText()), 'opened again, the count card lists the photo report');
  t.ok(await cardB.locator('[data-zz=rwhint]').count() === 1, 'and says rewrap is already priced in the report (the old rewrap stepper is not charged again)');
  t.ok(await p.evaluate(async id => { const r = await window.__zz.h.photos.ls(id); return r.length; }, dx[0].photoOwner) >= 2, 'the photos are stored under dmg:<id>');
  await into(cardB.locator('[data-zz=dmgreport]'));
  await h.check(p, 'count-reported-390');

  // DC-300: count off -> note required
  const cardC = p.locator('div.rounded-lg').filter({ has: p.locator('span.font-black', { hasText: 'DC-300' }) }).last();
  if (await cardC.locator('input[type=number]').count() === 0) { await cardC.locator('button').first().click(); await wait(p); }
  await cardC.locator('input[type=number]').fill('3');
  await cardC.getByRole('button', { name: 'Good', exact: true }).click();
  await cardC.getByRole('button', { name: '06', exact: true }).click().catch(() => {});
  const saveC = cardC.getByRole('button', { name: 'Save', exact: true });
  t.ok(await saveC.isDisabled() && /Why is it short 1\? \(required\)/.test(await cardC.locator('[data-zz=countnote]').innerText()), 'a count that does not match needs a note before Save');
  await into(cardC.locator('[data-zz=countnote]'));
  await h.check(p, 'count-note-390');
  await cardC.locator('[data-zz=countnote] input').fill('Driver says 1 pallet stayed in Fresno');
  t.ok(!(await saveC.isDisabled()), 'with the note Save works');
  await saveC.click();
  await wait(p, 600);
  doc = await h.readDoc(p);
  const lc = doc.shipments.find(x => x.id === 'zzd_c');
  t.ok(lc.qc.counted === 3 && lc.qc.note === 'Driver says 1 pallet stayed in Fresno', 'the note is saved with the count (qc.note)');

  // auto-approve: set the customer's limit, report damage on DA-100
  await act(p, 'zzCustomer', 'cu_altex', { autoApproveUnder: 500 });
  const cardA = p.locator('div.rounded-lg').filter({ has: p.locator('span.font-black', { hasText: 'DA-100' }) }).last();
  if (await cardA.getByRole('button', { name: 'Damaged', exact: true }).count() === 0) { await cardA.locator('button').first().click(); await wait(p); }
  await cardA.getByRole('button', { name: 'Damaged', exact: true }).click();
  await cardA.getByRole('button', { name: '07', exact: true }).click().catch(() => {});
  await cardA.getByRole('button', { name: 'Save', exact: true }).click();
  await wait(p);
  dm = p.locator('[data-zz=dmg]');
  t.ok(/Customer auto-approves under \$500\.00: this one goes through\./.test(await dm.locator('[data-zz=approve]').innerText()), 'with a limit the modal says the fix goes through');
  await dm.locator('[data-kind=Leaning]').click();
  await dm.locator('[data-shot-input=wide]').setInputFiles(h.UPLOAD_PNG);
  await dm.locator('[data-shot-input=more]').setInputFiles([h.UPLOAD_PNG, h.UPLOAD_PNG]);
  await p.waitForFunction(() => /2 of 2/.test((document.querySelector('[data-zz=dmgcount]') || {}).innerText || ''), null, { timeout: 5000 });
  await dm.getByRole('button', { name: 'Save damage report' }).click();
  await wait(p, 800);
  doc = await h.readDoc(p);
  const la = doc.shipments.find(x => x.id === 'zzd_a');
  dx = (la.exceptions || []).filter(x => x.kind === 'Damage');
  t.ok(dx.length === 1 && dx[0].answer && dx[0].answer.auto === true && dx[0].answer.status === 'accepted' && dx[0].photoCount === 3, 'with the customer\'s auto-approve set, answer.auto is true (3 photos: more photos allowed)');
  t.ok(doc.customers.find(c => c.id === 'cu_altex').rates === null, 'customer rates unchanged');
  await p.context().close();

  /* ================= UNPACK (truck 7070): nonstop unloading photos, damage snaps, finish at verify ================= */
  t.section('UNPACK job: nonstop unloading photos, damage snaps (not sure / pick the load), finished at verify, wrap-up blocked');
  {
    const su = unpackSeed(seed, t0);
    p = await crew(h, { viewport: PHONE, seed: su });
    await openTruck(p, '7070', 'TU70');
    t.ok(/^UNPACK · Consolidated trailer \(inbound\)$/.test((await p.locator('[data-zz=jobtitle]').innerText()).replace(/\s+/g, ' ').trim()), 'an East Coast trailer: "UNPACK · Consolidated trailer (inbound)" in big words at the top');
    t.ok(/3 loads to break down — sort each load to its own lane · 15 pallets total/.test(await p.locator('[data-zz=jobtask]').innerText()), 'the task in plain words (not "15 pallets off")');
    t.ok(!/pallets off/.test(await h.text(p)), 'the confusing "N loads · X pallets off" line is gone');
    const bdg = await p.$$eval('[data-zz=jobcard] [data-zz=badge]', bs => bs.map(b => [b.getAttribute('data-badge'), b.innerText.replace(/\s+/g, ' ').trim(), getComputedStyle(b.firstChild).backgroundColor]));
    t.ok(bdg.length === 3 && bdg.map(b => b[0]).join() === '1,2,3' && /^1 118882$/.test(bdg[0][1]) && /^2 118901$/.test(bdg[1][1]), 'the job card shows a numbered badge with the PRO for every load (' + bdg.map(b => b[1]).join(' / ') + ')');
    t.ok(new Set(bdg.map(b => b[2])).size === 3, 'each load has its own colour (' + bdg.map(b => b[2]).join(', ') + ')');
    t.eq(await stepNames(p), ['Photo before', 'Unload', 'Sort, count, verify', 'Wrap up'], 'UNPACK steps: Photo before, Unload, Sort-count-verify, Wrap up');
    await h.check(p, 'unpack-top-390');
    await p.getByRole('button', { name: 'No photos — N/A' }).click();
    await wait(p, 500);
    t.eq(await p.locator('[data-zz=step-off]').count(), 1, 'the Unload step opens next');
    t.ok(await p.locator('[data-zz=floatbar]').count() === 1 && await p.locator('[data-zz=floatbar] [data-zz=floatcam]').isVisible() && await p.locator('[data-zz=floatbar] [data-zz=floatsnap]').isVisible(), 'while unloading, a camera button and a Damage button float at the bottom (always in reach)');
    // nonstop unloading photos, no minimum
    await p.locator('[data-zz=step-off] [data-zz=caminput]').first().setInputFiles(files(2));
    await countIs(p, '[data-zz=step-off] [data-zz=camcount]', 2);
    await p.locator('[data-zz=floatcaminput]').setInputFiles(files(1));
    await countIs(p, '[data-zz=step-off] [data-zz=camcount]', 3);
    doc = await h.readDoc(p);
    let tu = doc.trailers.find(x => x.id === 'zzd_u');
    t.ok(tu.unloadPhotoCount === 3 && (tu.zzPhotoBy || []).some(x => x.who === 'Roman' && x.n === 3), 'unloading photos count on the truck (unloadPhotoCount 3) and on Roman (leaderboard)');
    t.eq(await photosOf(p, 'unload:zzd_u'), 3, 'stored under unload:<truck>');
    t.ok(/Photo · 3/.test(await p.locator('[data-zz=floatcam]').innerText()), 'the floating camera shows the count (' + (await p.locator('[data-zz=floatcam]').innerText()) + ')');
    await h.check(p, 'unpack-unload-390');
    // damage snap 1: not sure which load
    await p.locator('[data-zz=snapinput]').setInputFiles(h.UPLOAD_PNG);
    await until(p, () => !!document.querySelector('[data-zz=snappick]'));
    t.ok(await p.locator('[data-zz=snappick] [data-zz=snapload]').count() === 3, 'the damage photo asks which load, with a button per load badge');
    t.eq(await smallTargets(p), [], 'every button in the damage picker is at least 44 px tall');
    await h.check(p, 'unpack-snap-pick-390');
    await p.locator('[data-zz=snappick] [data-zz=snapnote]').fill('Corner crushed');
    await p.locator('[data-zz=snapunsure]').click();
    await wait(p, 600);
    doc = await h.readDoc(p);
    tu = doc.trailers.find(x => x.id === 'zzd_u');
    t.ok((tu.dmgDrafts || []).length === 1 && tu.dmgDrafts[0].photoCount === 1 && tu.dmgDrafts[0].note === 'Corner crushed', '"Not sure which load": the snap waits on the truck (dmgDrafts) with its photo and words');
    const snap1 = tu.dmgDrafts[0].id;
    t.eq(await photosOf(p, 'dmg:' + snap1), 1, 'its photo is under dmg:<id>');
    t.ok(/Damage photo saved\. Pick the load later/.test(await p.locator('[data-zz=snapmsg]').innerText()), 'the crew sees it saved and keeps unloading');
    // damage snap 2: on load 2, straight away
    await p.locator('[data-zz=floatsnap]').click();
    await p.locator('[data-zz=snapinput]').setInputFiles(h.UPLOAD_PNG);
    await until(p, () => !!document.querySelector('[data-zz=snappick]'));
    await p.locator('[data-zz=snappick] [data-zz=snapload][data-sid=zzd_u2]').click();
    await wait(p, 600);
    doc = await h.readDoc(p);
    let u2 = doc.shipments.find(x => x.id === 'zzd_u2');
    const sx = (u2.exceptions || []).find(x => x.draft);
    t.ok(sx && sx.kind === 'Damage' && sx.photoOwner === 'dmg:' + sx.id && sx.trailerId === 'zzd_u' && !sx.est, 'tapping load 2\'s badge saves a damage snap (draft) on that load');
    t.ok(/saved on load 2 \(118901\)/.test(await p.locator('[data-zz=snapmsg]').innerText()), '"Damage photo saved on load 2 (118901)"');
    // drafts stay off customer screens and messages
    const cv = await calc(p, (hh, d) => { const v = hh.ZZcustView(d, 'cu_altex'); return { drafts: v.shipments.some(s => (s.exceptions || []).some(x => x.draft)), truck: v.trailers.some(t => (t.dmgDrafts || []).length), msgs: hh.ZZmsgs(d, Date.now()).filter(m => m.event === 'damage' && /118901|118882/.test(m.body || '')).length }; });
    t.ok(!cv.drafts && !cv.truck && cv.msgs === 0, 'the customer view hides both snaps and no damage alert is worked out yet (' + JSON.stringify(cv) + ')');
    // receive all three
    for (let k = 0; k < 3; k++) { await p.getByRole('button', { name: /it's off, count it next/ }).click(); await wait(p, 450); }
    t.ok(await p.locator('[data-zz=step-verify]').count() === 1, 'with everything off the truck, Sort-count-verify opens by itself');
    await step(p, 'Unload');
    t.ok(/2 damage photos waiting for details\. Finish them at Sort, count, verify\./.test(await h.text(p)), 'the Unload step says 2 damage photos wait for details');
    await p.getByRole('button', { name: 'Next: sort, count, verify' }).click();
    await wait(p, 600);
    // the truck snap: pick its load now
    const tsn = p.locator('[data-zz=snaps-truck] [data-zz=snapcard]');
    t.ok(await tsn.count() === 1 && /Load not picked yet/.test(await tsn.innerText()) && /Corner crushed/.test(await tsn.innerText()), 'Sort-count-verify lists the snap that has no load yet, at the top');
    await into(tsn);
    await h.check(p, 'unpack-verify-assign-390');
    await tsn.locator('[data-zz=assign][data-sid=zzd_u1]').click();
    await wait(p, 600);
    doc = await h.readDoc(p);
    t.ok(!(doc.trailers.find(x => x.id === 'zzd_u').dmgDrafts || []).length && (doc.shipments.find(x => x.id === 'zzd_u1').exceptions || []).some(x => x.id === snap1 && x.draft), 'tapping load 1 moves the snap onto that load (still a draft)');
    // wrap-up is blocked while snaps wait
    await p.getByRole('button', { name: /Wrap up & send/ }).click();
    await wait(p);
    t.ok(await p.locator('[data-zz=wrapstop-dmg]').count() === 1 && /Finish or throw away 2 damage photos/.test(await p.locator('[data-zz=wrapstop-dmg]').innerText()) && await p.getByRole('button', { name: 'Send to dispatch', exact: true }).isDisabled(), 'wrap-up is blocked while damage photos wait for details');
    await h.check(p, 'unpack-wrap-blocked-390');
    await p.keyboard.press('Escape');
    await wait(p);
    await step(p, 'Sort, count, verify');
    // finish snap 1 on load 1
    const c1 = p.locator('div.rounded-lg').filter({ has: p.locator('span.font-black', { hasText: '118882' }) }).last();
    if (await c1.locator('[data-zz=loadsnaps]').count() === 0) { await c1.locator('button').first().click(); await wait(p); }
    t.ok(await c1.locator('[data-zz=snappill]').count() === 1, 'the count card header has a red "Damage photo to finish" pill');
    await c1.locator('[data-zz=loadsnaps]').getByRole('button', { name: 'Finish this damage report' }).click();
    await wait(p);
    dm = p.locator('[data-zz=dmg]');
    t.ok(await dm.count() === 1 && await dm.getAttribute('data-snap') === snap1, 'Finish opens the damage report on that snap');
    t.ok(/1 of 2/.test(await dm.locator('[data-zz=dmgcount]').innerText()) && /Only then does the customer see it/.test(await dm.locator('[data-zz=dmgsnap]').innerText()), 'the snap photo is already there (1 of 2) and it says the customer sees it only now');
    t.ok((await dm.locator('textarea').inputValue()) === 'Corner crushed', 'the crew\'s words come along as "What happened?"');
    await dm.locator('[data-kind=Crushed]').click();
    await dm.locator('[data-shot-input=close]').setInputFiles(h.UPLOAD_PNG);
    await p.waitForFunction(() => /2 of 2/.test((document.querySelector('[data-zz=dmgcount]') || {}).innerText || ''), null, { timeout: 5000 });
    await segs(h, p, 'unpack-finish-390', { in: '[data-zz=dmg]', max: 3 });
    await dm.getByRole('button', { name: 'Save damage report' }).click();
    await wait(p, 800);
    doc = await h.readDoc(p);
    const f1 = doc.shipments.find(x => x.id === 'zzd_u1').exceptions.find(x => x.id === snap1);
    t.ok(f1 && f1.draft === false && f1.photoCount === 2 && f1.kinds.includes('Crushed') && f1.est && f1.est.lines.length >= 2 && f1.finishedBy === 'Roman' && f1.what === 'Corner crushed', 'finished: draft false, 2 photos, kinds, fix lines, finished by Roman (zzDamageFinish)');
    t.ok(await calc(p, (hh, d) => hh.ZZcustView(d, 'cu_altex').shipments.find(s => s.id === 'zzd_u1').exceptions.some(x => x.kind === 'Damage' && !x.draft)), 'only now does the customer view show the damage report');
    // throw away snap 2 (not damage after all)
    const c2 = p.locator('div.rounded-lg').filter({ has: p.locator('span.font-black', { hasText: '118901' }) }).last();
    if (await c2.locator('[data-zz=loadsnaps]').count() === 0) { await c2.locator('button').first().click(); await wait(p); }
    await c2.locator('[data-zz=snapdiscard]').click();
    await c2.getByRole('button', { name: 'Yes, throw it away' }).click();
    await wait(p, 700);
    doc = await h.readDoc(p);
    t.ok(!(doc.shipments.find(x => x.id === 'zzd_u2').exceptions || []).some(x => x.draft), '"Not damage? Throw it away" removes the snap (zzDamageDiscard)');
    t.eq(await photosOf(p, 'dmg:' + sx.id), 0, 'and its photos');
    // count each load: Good, a lane, the one warehouse photo
    let lane = 23;
    for (const ref of ['118882', '118901', '118950']) {
      const c = p.locator('div.rounded-lg').filter({ has: p.locator('span.font-black', { hasText: ref }) }).last();
      if (await c.getByRole('button', { name: 'Good', exact: true }).count() === 0) { await c.locator('button').first().click(); await wait(p); }
      await c.getByRole('button', { name: 'Good', exact: true }).click();
      await c.getByRole('button', { name: String(lane++), exact: true }).click();
      if (ref === '118882') {
        await c.locator('[data-zz=whphoto] [data-zz=caminput]').setInputFiles(h.UPLOAD_PNG);
        await countIs(p, '[data-zz=whphoto] [data-zz=camcount]', 1);
        await into(c.locator('[data-zz=whphoto]'));
        await h.check(p, 'unpack-whphoto-390');
      }
      await c.getByRole('button', { name: 'Save', exact: true }).click();
      await wait(p, 500);
    }
    doc = await h.readDoc(p);
    const u1 = doc.shipments.find(x => x.id === 'zzd_u1');
    t.ok(u1.rowPhotoCount === 1 && u1.row === 'R23' && u1.qc.condition === 'Good', 'the warehouse photo is the load\'s row photo (rowPhotoCount 1), lane R23');
    t.eq(await photosOf(p, 'row:zzd_u1'), 1, 'stored under row:<load>');
    await step(p, 'Wrap up');
    s = await h.text(p);
    t.ok(/Unloading photos\s*3/.test(s) && /Warehouse photos\s*1 \/ 3/.test(s), 'the wrap-up summary shows unloading photos (3) and warehouse photos (1 / 3)');
    await p.getByRole('button', { name: /Wrap up & send/ }).click();
    await wait(p);
    t.ok(await p.locator('[data-zz=wrapblock]').count() === 0 && !(await p.getByRole('button', { name: 'Send to dispatch', exact: true }).isDisabled()), 'with every snap finished or thrown away, Send to dispatch is open');
    await p.getByRole('button', { name: 'Send to dispatch', exact: true }).click();
    await wait(p, 700);
    doc = await h.readDoc(p);
    t.ok(doc.trailers.find(x => x.id === 'zzd_u').stage === 'done', 'truck 7070 is done');
    await p.context().close();
    // leaderboard: the 3 unloading photos and the warehouse photo count like photos; the finished snap is a report
    const pb = await crew(h, { viewport: PHONE, seed: doc });
    await pb.getByRole('button', { name: /Leaderboard/ }).first().click();
    await wait(pb);
    s = await h.text(pb);
    t.ok(/Roman[\s\S]{0,200}?(\d+) photos/.test(s) && +s.match(/Roman[\s\S]{0,200}?(\d+) photos/)[1] >= 4 && /Roman[\s\S]{0,250}?1 damage report/.test(s), 'leaderboard: Roman has the unloading + warehouse photos (4+) and 1 damage report (the finished snap)');
    await pb.context().close();
  }

  /* ================= PACK on a multi-stop truck: plan order, packing photos, secure, manifest ================= */
  t.section('PACK job on a multi-stop truck: plan in loading order, packing photos, Secure, the manifest');
  {
    const sp = packSeed(seed, t0);
    p = await crew(h, { viewport: PHONE, seed: sp });
    await openTruck(p, '8080', 'TP80');
    t.ok(/^PACK · Consolidated trailer$/.test((await p.locator('[data-zz=jobtitle]').innerText()).replace(/\s+/g, ' ').trim()), '"PACK · Consolidated trailer" (loads of 2 customers)');
    t.eq(await stepNames(p), ['Pack', 'Secure the load', 'Manifest', 'Wrap up'], 'PACK steps: Pack, Secure the load, Manifest, Wrap up');
    const plan = await p.$$eval('[data-zz=step-pack] [data-zz=planrow]', rs => rs.map(r => [r.getAttribute('data-sid'), r.innerText.replace(/\s+/g, ' ').trim()]));
    t.eq(plan.map(r => r[0]), ['zzd_p1', 'zzd_p3', 'zzd_p2'], 'the load plan is in loading order: nose first, then middle, then tail');
    t.ok(/Stop 2 · NOSE — Front of the trailer, loads first/.test(plan[0][1]) && /Stop 1 · TAIL — By the doors, loads last/.test(plan[2][1]), 'each row says the stop and the place: "' + plan[2][1] + '"');
    t.ok(/^1\. 1 120001/.test(plan[0][1]), 'with the load badge and PRO (' + plan[0][1] + ')');
    t.ok(await p.locator('[data-zz=step-pack] [data-zz=floatbar]').count() === 1, 'packing photos and Damage float at the bottom while packing');
    await segs(h, p, 'pack-plan-390', { max: 4 });
    // packing photos the whole time
    await p.locator('[data-zz=step-pack] [data-zz=caminput]').first().setInputFiles(files(2));
    await countIs(p, '[data-zz=step-pack] [data-zz=camcount]', 2);
    doc = await h.readDoc(p);
    t.eq(doc.trailers.find(x => x.id === 'zzd_p').afterPhotoCount, 2, 'packing photos are saved on the truck (after:<truck>, afterPhotoCount)');
    // Nick's pull / confirm / load per load, in plan order
    for (const ref of ['120001', '120003', '120002']) {
      const pc = p.locator('div.rounded-lg.p-3.space-y-3').filter({ hasText: ref }).first();
      await pc.getByRole('button', { name: 'Count is correct' }).click();
      await wait(p, 300);
      await pc.getByRole('button', { name: /^3\. Load it/ }).click();
      await wait(p, 500);
    }
    doc = await h.readDoc(p);
    t.ok(['zzd_p1', 'zzd_p2', 'zzd_p3'].every(id => doc.shipments.find(x => x.id === id).loadedAt), 'all three loads are on the truck (Nick\'s count + load buttons)');
    t.eq((await stepNames(p)).length, 4, '(steps unchanged)');
    t.ok(await p.locator('div[style*="sticky"] button[title="Pack"]').innerText() === '✓', 'the Pack step is done (loads on, a photo, no damage waiting)');
    // secure: one securing photo
    await step(p, 'Secure the load');
    const sf2 = p.locator('[data-zz=secureform]');
    await sf2.locator('[data-gear=bars] button[aria-label^="One more"]').click();
    await sf2.locator('[data-zz=secphotos] [data-zz=caminput]').setInputFiles(h.UPLOAD_PNG);
    await countIs(p, '[data-zz=secphotos] [data-zz=camcount]', 1);
    t.ok(await sf2.locator('[data-zz=secphotos] [data-zz=thumbs][data-owner="after:zzd_p"] img').count() === 2, 'the secure step shows the packing photos taken so far');
    await sf2.locator('input[aria-label="Seal number"]').fill('SL-8080');
    await sf2.locator('[data-conf="4"]').click();
    await sf2.locator('[data-zz=secchk]').check();
    await sf2.locator('[data-zz=secsign]').fill('Roman');
    await sf2.getByRole('button', { name: 'Save and sign' }).click();
    await wait(p, 800);
    doc = await h.readDoc(p);
    const tp = doc.trailers.find(x => x.id === 'zzd_p');
    t.ok(tp.secure && tp.secure.photoOwner === 'strap:zzd_p' && tp.secure.photoCount === 1 && tp.sealOut === 'SL-8080', 'secured with 1 securing photo (zzSecure accepts the new shape)');
    // the manifest
    t.ok(await p.locator('[data-zz=mfform]').count() === 1, 'saving the securement moves on to the Manifest');
    const lines = await p.$$eval('[data-zz=mfline]', ls => ls.map(l => l.getAttribute('data-sid')));
    t.eq(lines, ['zzd_p1', 'zzd_p3', 'zzd_p2'], 'the manifest has one line per load, prefilled in loading order');
    const l2 = p.locator('[data-zz=mfline][data-sid=zzd_p2]');
    t.ok(/Planned 4/.test(await l2.innerText()) && /Pine Ridge/.test(await l2.innerText()), 'a line shows the badge, PRO, customer and the planned pallets');
    await l2.locator('button[aria-label^="One less"]').first().click();
    t.ok(/1 short of the plan/.test(await l2.innerText()), 'loading one less than planned says "1 short of the plan"');
    await p.locator('[data-zz=mfadd]').click();
    const ex = p.locator('[data-zz=mfline][data-sid=""]');
    t.ok(await ex.count() === 1, '"Add a line" adds an extra line (loose freight)');
    const saveMf = p.getByRole('button', { name: 'Save and sign the manifest' });
    await p.locator('[data-zz=mfsign]').fill('Roman');
    t.ok(await saveMf.isDisabled() && /what the extra line is/.test(await p.locator('[data-zz=mfform] [data-zz=missing]').innerText()), 'an empty extra line must say what it is');
    await ex.locator('[data-zz=mfref]').fill('Loose freight, 2 boxes');
    await ex.getByRole('button', { name: 'Altex', exact: true }).click().catch(() => {});
    t.ok(/Total loaded\s*12 plt/.test(await p.locator('[data-zz=mftotal]').innerText()) && /Planned on the loads: 12/.test(await p.locator('[data-zz=mftotal]').innerText()), 'the total updates (' + (await p.locator('[data-zz=mftotal]').innerText()).replace(/\s+/g, ' ') + ')');
    t.eq(await smallTargets(p), [], 'manifest buttons are at least 44 px tall');
    await segs(h, p, 'pack-manifest-390', { max: 6 });
    t.ok(!(await saveMf.isDisabled()), 'with the extra line named and a signature, Save works');
    await saveMf.click();
    await wait(p, 800);
    doc = await h.readDoc(p);
    const mf = doc.trailers.find(x => x.id === 'zzd_p').manifest;
    t.ok(mf && mf.lines.length === 4 && mf.signedBy === 'Roman' && mf.signature === 'Roman' && mf.total === 12, 'the manifest is saved on the truck: 4 lines, 12 pallets, signed by Roman');
    t.ok(mf.lines.find(x => x.sid === 'zzd_p2').loaded === 3 && mf.lines.find(x => x.sid === 'zzd_p2').customerId === 'cu_pine' && mf.lines.find(x => x.sid === 'zzd_p1').stop === 2 && mf.lines.find(x => x.sid === 'zzd_p1').pos === 'nose', 'each line keeps the pallets loaded, the customer and the stop / place');
    t.ok(mf.lines.some(x => !x.sid && x.ref === 'Loose freight, 2 boxes' && x.loaded === 1), 'the extra line is saved with its words');
    const mfc = await calc(p, (hh, d) => { const a = hh.ZZmanifestFor(d, 'zzd_p', 'cu_pine'); return a && a.lines.map(l => l.sid); });
    t.eq(mfc, ['zzd_p2'], 'a customer only ever gets the lines of its own loads (ZZmanifestFor)');
    t.ok(await p.locator('[data-zz=step-wrap], [data-zz=mfform]').count() === 0, 'signing moves on (the manifest form closes)');
    await step(p, 'Manifest');
    t.ok(await p.locator('[data-zz=mfdone]').count() === 1 && /Manifest signed · 12 pallets/.test(await p.locator('[data-zz=mfdone]').innerText()), 'the Manifest step shows the signed manifest');
    await into(p.locator('[data-zz=mfdone]'));
    await h.check(p, 'pack-manifest-done-390');
    await p.getByRole('button', { name: /Wrap up & send/ }).click();
    await wait(p);
    t.ok(await p.locator('[data-zz=wrapblock]').count() === 0 && !(await p.getByRole('button', { name: 'Send to dispatch', exact: true }).isDisabled()), 'packed, secured, manifest signed: Send to dispatch is open');
    await h.check(p, 'pack-wrap-390');
    await p.getByRole('button', { name: 'Send to dispatch', exact: true }).click();
    await wait(p, 700);
    t.ok((await h.readDoc(p)).trailers.find(x => x.id === 'zzd_p').stage === 'done', 'truck 8080 is done');
    await p.context().close();
  }

  /* ================= DELIVERY: load it like the shipper did ================= */
  t.section('DELIVERY job: the shipper reference photo, find, count, inspect + photo, load it up, strapped, bills');
  {
    const sd = deliverySeed(seed, t0, false);
    p = await crewWith(h, { seed: sd, photos: { 'ship:zzd_v': 1, 'unload:zzd_vin': 2 } });
    await openTruck(p, '9090', 'TV90');
    t.ok(/^DELIVERY · to Walmart DC, Reno$/.test((await p.locator('[data-zz=jobtitle]').innerText()).replace(/\s+/g, ' ').trim()), '"DELIVERY · to Walmart DC, Reno" in big words');
    t.eq(await stepNames(p), ['Find the load', 'Count it', 'Inspect + photo', 'Load it up', 'Strapped', 'Bills', 'Wrap up'], 'DELIVERY steps: Find, Count, Inspect + photo, Load it up, Strapped, Bills, Wrap up');
    const ref = p.locator('[data-zz=step-find] [data-zz=ref]');
    await until(p, () => document.querySelectorAll('[data-zz=step-find] [data-zz=ref] img').length >= 3);
    t.ok(/Load it like the shipper did/.test(await ref.innerText()) && await ref.locator('[data-owner="ship:zzd_v"] img').count() === 1 && await ref.locator('[data-owner="unload:zzd_vin"] img').count() === 2, '"Load it like the shipper did": the dispatcher\'s shipper photo plus our unloading photos from truck 5150');
    const imgW = await ref.locator('[data-owner="ship:zzd_v"] button').first().evaluate(b => b.getBoundingClientRect().width);
    t.ok(imgW >= 240, 'the reference photos are big (' + Math.round(imgW) + ' px wide on a phone)');
    t.ok(/R40/.test(await p.locator('[data-zz=findrow][data-sid=zzd_v1]').innerText()), 'Find shows where each load is (lane R40)');
    await segs(h, p, 'delivery-find-390', { max: 4 });
    await p.getByRole('button', { name: 'Found them — count next' }).click();
    await wait(p, 600);
    doc = await h.readDoc(p);
    t.ok(!!doc.trailers.find(x => x.id === 'zzd_v').foundAt, 'Found them is noted on the truck');
    const r1 = p.locator('[data-zz=countrow][data-sid=zzd_v1]'), r2 = p.locator('[data-zz=countrow][data-sid=zzd_v2]');
    await r1.getByRole('button', { name: 'Count is correct' }).click();
    await wait(p, 400);
    t.ok(await r1.locator('[data-zz=countok]').count() === 1, 'a confirmed count turns into a green "Count confirmed" line');
    await r2.locator('input[aria-label="Pallets counted"]').fill('3');
    t.ok(await r2.getByRole('button', { name: /^Confirm 3/ }).isDisabled() && /Why is it short 1/.test(await r2.locator('[data-zz=countnote]').innerText()), 'a short count needs a note');
    await r2.locator('[data-zz=countnote] input').fill('1 pallet is still at the shipper');
    await r2.getByRole('button', { name: /^Confirm 3/ }).click();
    await wait(p, 600);
    doc = await h.readDoc(p);
    const v2 = doc.shipments.find(x => x.id === 'zzd_v2');
    t.ok(v2.pullCount === 3 && v2.exceptions.some(x => x.kind === 'Short' && /1 pallet is still at the shipper/.test(x.note)), 'the count and one Short report with the note');
    await h.check(p, 'delivery-count-390');
    await p.getByRole('button', { name: 'Counts done — inspect next' }).click();
    await wait(p, 500);
    for (const id of ['zzd_v1', 'zzd_v2']) {
      await p.locator(`[data-zz=insprow][data-sid=${id}] [data-zz=caminput]`).setInputFiles(h.UPLOAD_PNG);
      await countIs(p, `[data-zz=insprow][data-sid=${id}] [data-zz=camcount]`, 1);
    }
    doc = await h.readDoc(p);
    t.ok(doc.shipments.find(x => x.id === 'zzd_v1').inspPhotoCount === 1 && doc.shipments.find(x => x.id === 'zzd_v2').inspPhotoCount === 1, 'one inspect photo per load (insp:<load>, inspPhotoCount)');
    t.ok(/Good — no damage reported/.test(await p.locator('[data-zz=insprow][data-sid=zzd_v1]').innerText()), 'the condition reads "Good — no damage reported"');
    await h.check(p, 'delivery-inspect-390');
    await p.getByRole('button', { name: 'All checked — load it up' }).click();
    await wait(p, 500);
    t.ok(await p.locator('[data-zz=step-load] [data-zz=ref]').count() === 1, 'Load it up shows the shipper reference again (small)');
    await p.locator('[data-zz=step-load] [data-zz=caminput]').first().setInputFiles(h.UPLOAD_PNG);
    await countIs(p, '[data-zz=step-load] [data-zz=camcount]', 1);
    for (const id of ['zzd_v1', 'zzd_v2']) { await p.locator(`[data-zz=loadrow][data-sid=${id}]`).getByRole('button', { name: 'Load it' }).click(); await wait(p, 500); }
    doc = await h.readDoc(p);
    t.ok(['zzd_v1', 'zzd_v2'].every(id => doc.shipments.find(x => x.id === id).loadedAt) && doc.trailers.find(x => x.id === 'zzd_v').afterPhotoCount === 1, 'both loads are on, with a loadout photo');
    await step(p, 'Strapped');
    t.ok(/Strapped/.test(await p.locator('[data-zz=securestep]').innerText()) && /Photo of it strapped/.test(await p.locator('[data-zz=securestep]').innerText()), 'the Secure screen in its delivery words: "Strapped", "Photo of it strapped"');
    const sf3 = p.locator('[data-zz=secureform]');
    await sf3.locator('[data-gear=straps] button[aria-label^="One more"]').click();
    await sf3.locator('[data-gear=straps] [data-owner=driver]').click();
    await sf3.locator('[data-zz=secphotos] [data-zz=caminput]').setInputFiles(h.UPLOAD_PNG);
    await countIs(p, '[data-zz=secphotos] [data-zz=camcount]', 1);
    await sf3.locator('[data-conf="5"]').click();
    await sf3.locator('[data-zz=secchk]').check();
    await sf3.locator('[data-zz=secsign]').fill('Roman');
    await sf3.getByRole('button', { name: 'Save and sign' }).click();
    await wait(p, 800);
    t.ok(await p.locator('[data-zz=step-bills]').count() === 1, 'then the Bills step');
    await p.getByRole('button', { name: /Wrap up & send/ }).click();
    await wait(p);
    t.ok(await p.locator('[data-zz=wrapstop-bills]').count() === 1 && await p.getByRole('button', { name: 'Send to dispatch', exact: true }).isDisabled(), 'Send to dispatch waits for the photo of the bills');
    await p.keyboard.press('Escape');
    await wait(p);
    await step(p, 'Bills');
    await p.locator('[data-zz=step-bills] [data-zz=caminput]').setInputFiles(h.UPLOAD_PNG);
    await countIs(p, '[data-zz=step-bills] [data-zz=camcount]', 1);
    doc = await h.readDoc(p);
    t.eq(doc.trailers.find(x => x.id === 'zzd_v').bolPhotoCount, 1, 'the bills photo is saved (bol:<truck>, bolPhotoCount)');
    await p.getByRole('button', { name: 'Bills done — wrap up' }).click();
    await wait(p, 500);
    s = await h.text(p);
    t.ok(/Loadout photos\s*1/.test(s) && /Inspect photos\s*2 \/ 2/.test(s) && /Strapped\s*5\/5/.test(s) && /Bills\s*1 photo(?!s)/.test(s) && /Loads on\s*2 \/ 2/.test(s) && /Counted vs BOL\s*1 off/.test(s), 'the wrap-up summary: loadout photos, inspect photos, Strapped 5/5, Bills 1 photo, Loads on 2 / 2, Counted vs BOL 1 off (the short count while loading)');
    await p.getByRole('button', { name: /Wrap up & send/ }).click();
    await wait(p);
    t.ok(!(await p.getByRole('button', { name: 'Send to dispatch', exact: true }).isDisabled()), 'Send to dispatch is open');
    await p.getByRole('button', { name: 'Send to dispatch', exact: true }).click();
    await wait(p, 700);
    t.ok((await h.readDoc(p)).trailers.find(x => x.id === 'zzd_v').stage === 'done', 'truck 9090 is done');
    await p.context().close();

    // a delivery with two stops: "DELIVERY · 2 stops", plan with stops; a pickup without a shipper photo shows none
    const sm = deliverySeed(seed, t0, true);
    sm.trailers.find(x => x.id === 'zzd_v').shipperPhotoCount = 0;
    p = await crew(h, { viewport: PHONE, seed: sm });
    await openTruck(p, '9090', 'TV90');
    t.ok(/^DELIVERY · 2 stops$/.test((await p.locator('[data-zz=jobtitle]').innerText()).replace(/\s+/g, ' ').trim()), 'a multi-stop delivery: "DELIVERY · 2 stops"');
    t.ok(/No photo from the dispatcher yet/.test(await p.locator('[data-zz=step-find] [data-zz=ref]').innerText()), 'with no shipper photo the delivery says so (ask the office)');
    t.ok(/Stop 2 · NOSE/.test(await p.locator('[data-zz=findrow][data-sid=zzd_v2]').innerText()), 'Find shows each load\'s stop and place');
    await step(p, 'Load it up');
    t.eq(await p.$$eval('[data-zz=step-load] [data-zz=planrow]', rs => rs.map(r => r.getAttribute('data-sid'))), ['zzd_v2', 'zzd_v1'], 'Load it up lists the loads in loading order (stop 2 at the nose first)');
    await segs(h, p, 'delivery-multistop-390', { max: 3 });
    await act(p, 'zzLoadJob', 'zzd_v', 'pickup');
    await wait(p, 500);
    t.ok(/^PICKUP · customer's carrier$/.test((await p.locator('[data-zz=jobtitle]').innerText()).replace(/\s+/g, ' ').trim()) && await p.locator('[data-zz=ref]').count() === 0, 'the office can switch it to PICKUP; with no shipper photo the pickup shows no reference box');
    await p.context().close();
  }

  /* ================= old secure reports (5 named photos) still display ================= */
  t.section('old secure reports with the 5 named photos still display');
  {
    const so = clone(seed);
    Object.assign(so.trailers.find(x => x.id === 'zzt8'), { secure: { gear: { bars: { qty: 2, owner: 'ours' } }, tags: ['B-9'], seal: 'SL-OLD1', photos: { nose: 1, middle: 1, tail: 1, closeup: 1, seal: 1 }, confidence: 4, note: '', checkedRows: true, signature: 'Sergio', signedBy: 'Sergio', signedAt: iso(t0 - 30 * MIN) } });
    p = await crewWith(h, { seed: so, photos: { 'sec:zzt8:nose': 1, 'sec:zzt8:middle': 1, 'sec:zzt8:tail': 1, 'sec:zzt8:closeup': 1, 'sec:zzt8:seal': 1 } });
    await openTruck(p, '118', 'T970');
    await step(p, 'Secure the load');
    const sd2 = p.locator('[data-zz=securedone]');
    await until(p, () => document.querySelectorAll('[data-zz=securedone] img').length >= 5);
    t.ok(/Secured 4\/5 · Solid/.test(await sd2.innerText()) && /Seal SL-OLD1/.test(await sd2.innerText()) && await sd2.locator('img').count() === 5, 'an old report shows its 5 named photos, the rating and the seal');
    t.ok(/NOSE|Nose/.test(await sd2.innerText()) && /CLOSE-UP|Close-up/.test(await sd2.innerText()), 'with the old photo names');
    await into(sd2);
    await h.check(p, 'secure-old-390');
    await p.context().close();
  }

  /* ================= Spanish ================= */
  t.section('crew language es');
  const es = clone(seed);
  es.settings.crewMembers.find(c => c.name === 'Roman').lang = 'es';
  p = await crew(h, { viewport: PHONE, seed: es });
  s = await h.text(p);
  t.ok(s.includes('Sujeción') && /Esperando 4[01]m · meta 30/.test(s), 'new labels are in Spanish (Gear tab "Sujeción", "Esperando 40m · meta 30")');
  await h.check(p, 'es-nextjob-390');
  await p.getByRole('button', { name: /Camiones/ }).first().click();
  await wait(p);
  s = await h.text(p);
  t.ok(s.includes('Puertas') && s.includes('Libre'), 'the door map is in Spanish');
  await card(p, '9040', 'TW40').locator('button').last().click();
  await wait(p, 600);
  s = await h.text(p);
  t.ok(/DESCARGAR/.test(s) && /3 cargas para contar y acomodar · 15 tarimas/.test(s) && s.includes('Separar, contar, revisar'), 'the job, the task and the new steps are in Spanish');
  await h.check(p, 'es-truck-390');
  await p.getByRole('button', { name: /Back|Atrás|Volver/ }).first().click().catch(() => {});
  await wait(p);
  await p.getByRole('button', { name: /Sujeción/ }).first().click();
  await wait(p);
  s = await h.text(p);
  t.ok(s.includes('Registrar equipo que regresa') && s.includes('Barras de carga'), 'the Gear tab is in Spanish');
  await h.check(p, 'es-gear-390');
  await p.context().close();

  /* ================= inbound with a reload: reload (packed), secure, manifest; a "not safe" rating blocks wrap-up ================= */
  t.section('inbound truck with a reload; not safe; switch off');
  p = await crew(h, { viewport: PHONE, seed });
  await p.getByRole('button', { name: /All trucks/ }).first().click();
  await wait(p);
  await card(p, '151', '050').getByRole('button', { name: 'Start unloading' }).click();
  await wait(p, 500);
  let sn = await stepNames(p);
  t.ok(sn.join('|') === 'Photo before|Unload|Sort, count, verify|Reload|Secure the load|Manifest|Wrap up', 'inbound truck with a reload: the reload part is packed (Reload, Secure the load, Manifest) (' + sn.join(' / ') + ')');
  t.ok(/Then PACK 1 load back out → California · 9 pallets/.test(await p.locator('[data-zz=jobreload]').innerText()), 'the job card names the reload part: "Then PACK 1 load back out → California · 9 pallets"');
  const tid151 = (await h.readDoc(p)).trailers.find(x => x.truck === '151').id;
  await act(p, 'zzSecure', tid151, { gear: { bars: { qty: 2, owner: 'ours' } }, tags: [], seal: '', photos: { nose: 1, middle: 1, tail: 1, closeup: 1, seal: 1 }, confidence: 1, note: 'Load is leaning at the tail', checkedRows: true, signature: 'Roman' });
  await wait(p, 400);
  await step(p, 'Secure the load');
  const nsTxt = await p.locator('[data-zz=securedone]').innerText();
  t.ok(/Do not let it leave like this/.test(nsTxt) && await p.getByRole('button', { name: 'Secure it again', exact: true }).count() === 1, 'rated 1 (not safe): the step shows the red warning and "Secure it again" (' + nsTxt.slice(0, 120).replace(/\n/g, ' / ') + ')');
  await into(p.locator('[data-zz=securedone]'));
  await h.check(p, 'notsafe-390');
  await p.getByRole('button', { name: /Wrap up & send/ }).click();
  await wait(p);
  t.ok(/rated not safe/.test(await p.locator('[data-zz=securefirst]').innerText()) && await p.getByRole('button', { name: 'Send to dispatch', exact: true }).isDisabled(), 'a "not safe" truck cannot be sent to dispatch');
  await p.keyboard.press('Escape');
  await p.context().close();
  // the switch: with ZZFLAGS.secureStep off there is no Secure step
  p = await crew(h, { viewport: PHONE, seed, flags: { secureStep: false } });
  await p.getByRole('button', { name: /All trucks/ }).first().click();
  await wait(p);
  await card(p, '118', 'T970').getByRole('button', { name: 'Give it a door' }).click();
  await wait(p, 500);
  sn = await stepNames(p);
  t.ok(!sn.includes('Secure the load') && await p.locator('[data-zz=securestep]').count() === 0, 'with ZZFLAGS.secureStep off there is no Secure step (' + sn.join(' / ') + ')');
  await p.context().close();

  /* ================= Russian: 5 tabs fit, pull card words ================= */
  t.section('crew language ru');
  const ru = clone(seed);
  ru.settings.crewMembers.find(c => c.name === 'Roman').lang = 'ru';
  p = await crew(h, { viewport: PHONE, seed: ru });
  const tabFit = await p.$$eval('nav[aria-label=Crew] button span', ss => ss.filter(x => /clamp/.test(x.style.fontSize)).map(x => [x.innerText, x.scrollWidth <= x.clientWidth + 1, x.getBoundingClientRect().height]));
  t.ok(tabFit.length === 5 && tabFit.every(([, fit, hgt]) => fit && hgt < 24), 'Russian: the 5 crew tabs fit on one line at 390 px (' + tabFit.map(x => x[0]).join(' / ') + ')');
  s = await h.text(p);
  t.ok(/Ждёт 4[01]m · цель 30/.test(s) && s.includes('Крепёж'), 'Russian: wait clock and Gear tab in Russian');
  await h.check(p, 'ru-nextjob-390');
  await p.getByRole('button', { name: /Фуры/ }).first().click();
  await wait(p);
  await card(p, '118', 'T970').locator('button').last().click();
  await wait(p, 500);
  s = await h.text(p);
  t.ok(s.includes('Закрепить груз') && s.includes('1. Пересчёт') && s.includes('2. Фото') && /Счёт верный/.test(s), 'Russian: Secure the load step and the pull card words are in Russian');
  t.ok(s.includes('СБОРКА') && s.includes('Сборная фура') && s.includes('Манифест') && s.includes('Фото сборки'), 'Russian: the job (СБОРКА · Сборная фура), the Manifest step and packing photos');
  await h.check(p, 'ru-truck-390');
  await p.context().close();

  /* ================= hi-vis theme (dark): text on filled colours stays readable ================= */
  t.section('hi-vis theme');
  p = await crew(h, { viewport: PHONE, seed });
  await p.evaluate(() => localStorage.setItem('cd6:theme', 'hivis'));
  await p.reload(); await h.waitLoaded(p); await ready(p);
  await p.getByRole('button', { name: /All trucks/ }).first().click();
  await wait(p);
  await h.check(p, 'hivis-doors-390');
  await card(p, '118', 'T970').locator('button').last().click();
  await wait(p, 500);
  await step(p, 'Secure the load');
  await p.locator('[data-zz=secureform] [data-gear=bars] button[aria-label^="One more"]').click();
  await p.locator('[data-zz=secureform] [data-conf="4"]').click();
  const oursCol = await p.locator('[data-zz=secureform] [data-gear=bars] [data-owner=ours]').evaluate(el => getComputedStyle(el).color);
  t.eq(oursCol, 'rgb(10, 10, 10)', 'hi-vis: a picked toggle has dark text on the bright orange (white would be too faint)');
  await into(p.locator('[data-zz=secureform] [data-gear=bars]'));
  await h.check(p, 'hivis-secure-390');
  await into(p.locator('[data-zz=secureform] [data-conf="4"]'));
  await h.check(p, 'hivis-confidence-390');
  await p.context().close();

  /* ================= the three looks at 390: job card, badges, unload, plan, manifest, reference ================= */
  t.section('the three looks (brand, clean, hi-vis) at 390 px');
  for (const theme of ['brand', 'clean', 'hivis']) {
    const su = unpackSeed(seed, t0);
    su.shipments.find(x => x.id === 'zzd_u1').receivedAt = iso(t0 - 5 * MIN);
    su.trailers.find(x => x.id === 'zzd_u').dmgDrafts = [{ id: 'lookSnap', photoOwner: 'dmg:lookSnap', photoCount: 1, at: iso(t0 - 3 * MIN), by: 'Roman', note: 'Torn wrap' }];
    p = await crewWith(h, { seed: su, theme, photos: { 'unload:zzd_u': 4, 'dmg:lookSnap': 1 } });
    await openTruck(p, '7070', 'TU70');
    const ok = await p.$$eval('[data-zz=badge] > span:first-child', bs => bs.every(b => b.innerText.trim().length > 0));
    t.ok(ok, `${theme}: every badge shows its number`);
    await segs(h, p, `look-${theme}-unpack`, { max: 2 });
    await step(p, 'Unload');
    await segs(h, p, `look-${theme}-unload`, { max: 3 });
    await step(p, 'Sort, count, verify');
    await segs(h, p, `look-${theme}-verify`, { max: 2 });
    await p.context().close();
    const sp = packSeed(seed, t0);
    p = await crewWith(h, { seed: sp, theme, photos: { 'after:zzd_p': 3 } });
    await openTruck(p, '8080', 'TP80');
    await segs(h, p, `look-${theme}-pack`, { max: 4 });
    await step(p, 'Manifest');
    await segs(h, p, `look-${theme}-manifest`, { max: 4 });
    await p.context().close();
    const sd = deliverySeed(seed, t0, true);
    p = await crewWith(h, { seed: sd, theme, photos: { 'ship:zzd_v': 2, 'unload:zzd_vin': 2 } });
    await openTruck(p, '9090', 'TV90');
    await until(p, () => document.querySelectorAll('[data-zz=ref] img').length >= 4);
    await segs(h, p, `look-${theme}-delivery`, { max: 4 });
    await p.context().close();
  }

  /* ================= office crew tab: phone, shift, rank ================= */
  t.section('office crew logins: phone, shift, rank');
  for (const [vw, viewport] of [['1400', DESK], ['390', PHONE]]) {
    const q = await h.openAs('office', { viewport, seed });
    await q.getByRole('button', { name: 'Crew', exact: true }).first().click();
    await wait(q);
    const row = q.locator('tr').filter({ hasText: 'Roman' }).filter({ has: q.getByRole('button', { name: 'Edit' }) }).first();
    await row.getByRole('button', { name: 'Edit' }).click();
    await wait(q);
    const ed = q.locator('[data-zz=crewedit]');
    const eb = await ed.boundingBox();
    t.ok(eb && eb.x >= 0 && eb.x + eb.width <= viewport.width + 1, `@${vw}: the edit form is fully on screen (x ${Math.round(eb.x)}, width ${Math.round(eb.width)})`);
    await ed.locator('input[type=tel]').fill('775-555-0142');
    await ed.locator('input[type=time]').nth(0).fill('06:00');
    await ed.locator('input[type=time]').nth(1).fill('14:30');
    await ed.locator('input[placeholder="1"]').fill('1');
    await ed.getByRole('button', { name: 'Sat' }).click();
    await segs(h, q, `office-crewedit-${vw}`, { max: 3 });
    await ed.getByRole('button', { name: 'Save', exact: true }).click();
    await wait(q, 500);
    doc = await h.readDoc(q);
    const rm = doc.settings.crewMembers.find(c => c.name === 'Roman');
    t.ok(rm.phone === '775-555-0142' && rm.rank === 1 && rm.pin === '1111' && rm.shift && rm.shift.start === '06:00' && rm.shift.end === '14:30' && JSON.stringify(rm.shift.days) === '[1,2,3,4,5,6]', `@${vw}: zzUpdateCrew saved phone, shift (Mon-Sat) and rank; PIN kept`);
    t.ok(/6:00 AM–2:30 PM · Mon–Sat/.test(await h.text(q)) && /Loads secured/i.test(await h.text(q)), `@${vw}: the logins table shows the shift (Mon–Sat); stats have a Loads secured column`);
    if (vw === '390') {
      const rowS = q.locator('tr').filter({ hasText: 'Sergio' }).filter({ has: q.getByRole('button', { name: 'Edit' }) }).first();
      await rowS.getByRole('button', { name: 'Edit' }).click();
      await wait(q);
      await q.locator('[data-zz=crewedit] input[type=tel]').fill('775-555-0177');
      await q.locator('[data-zz=crewedit]').getByRole('button', { name: 'Save', exact: true }).click();
      await wait(q, 500);
      const sg = (await h.readDoc(q)).settings.crewMembers.find(c => c.name === 'Sergio');
      t.ok(sg.phone === '775-555-0177' && !('rank' in sg), 'saving someone who has no rank does not write rank:null (ZZlead would read it as rank 0)');
    }
    await segs(h, q, `office-crew-${vw}`, { max: 3 });
    if (vw === '1400') {
      const on = await calc(q, (hh, d) => hh.ZZcrewOnShift(d, Date.parse(hh.ZZzonedIso(hh.ZZdockParts(Date.now()).ymd, '10:00'))).map(c => c.name));
      t.ok(Array.isArray(on), 'ZZcrewOnShift reads the new shift (' + JSON.stringify(on) + ')');
    }
    await q.context().close();
  }

  /* ================= desktop screens ================= */
  t.section('desktop (1400) screens');
  p = await crew(h, { viewport: DESK, seed });
  await h.check(p, 'nextjob-1400');
  await p.getByRole('button', { name: /All trucks/ }).first().click();
  await wait(p);
  await segs(h, p, 'alltrucks-1400', { max: 3 });
  await card(p, '118', 'T970').getByRole('button', { name: 'Give it a door' }).click();
  await wait(p);
  await p.getByRole('button', { name: 'Pick a door for this truck' }).click();
  t.eq(await doorCols(p), 5, 'door picker: 5 doors per row on a wide screen, as before');
  await h.check(p, 'doorpicker-1400');
  await p.locator('button[data-door="D6"]').click();
  await wait(p);
  await p.getByRole('button', { name: /^Start/ }).first().click();
  await wait(p, 500);
  await segs(h, p, 'pack-1400', { max: 3 });
  await step(p, 'Secure the load');
  await p.locator('[data-zz=secureform] [data-gear=plywood] button[aria-label^="One more"]').click();
  await p.locator('[data-zz=secureform] [data-gear=plywood] button[aria-label^="One more"]').click();
  await p.locator('[data-zz=secureform] input[aria-label="Tag number"]').fill('P-7');
  await p.locator('[data-zz=secureform] [data-zz=tagadd]').click();
  await p.getByRole('button', { name: 'Back' }).first().click();
  await wait(p);
  await openTruck(p, '118', 'T970');
  await step(p, 'Secure the load');
  t.ok((await p.locator('[data-zz=secureform] [data-gear=plywood] output').innerText()).trim() === '2' && /P-7/.test(await p.locator('[data-zz=secureform]').innerText()), 'leaving the truck and coming back keeps the half-filled secure form (gear and tags)');
  await segs(h, p, 'secure-form-1400', { max: 5 });
  await step(p, 'Pack');
  const pull2 = p.locator('div.rounded-lg.p-3.space-y-3').filter({ hasText: 'PL-3302' }).first();
  await pull2.locator('[data-zz=dmgadd]').click();
  await wait(p);
  await p.locator('[data-zz=dmg] [data-kind=Wet]').click();
  await segs(h, p, 'dmg-modal-1400', { in: '[data-zz=dmg]' });
  await p.keyboard.press('Escape');
  await wait(p);
  await p.locator('div.rounded-lg.p-3.space-y-3').filter({ hasText: 'PL-3302' }).first().locator('[data-zz=dmgadd]').click();
  await wait(p);
  t.ok(await p.locator('[data-zz=dmg] [data-kind=Wet][aria-pressed=true]').count() === 1, 'closing the damage report by mistake keeps the draft (kind still picked)');
  await p.keyboard.press('Escape');
  await p.context().close();
  {
    const sp = packSeed(seed, t0);
    p = await crewWith(h, { seed: sp, viewport: DESK, photos: { 'after:zzd_p': 3 } });
    await openTruck(p, '8080', 'TP80');
    await segs(h, p, 'pack-plan-1400', { max: 3 });
    await step(p, 'Manifest');
    await segs(h, p, 'pack-manifest-1400', { max: 3 });
    await p.context().close();
    const sd = deliverySeed(seed, t0, true);
    p = await crewWith(h, { seed: sd, viewport: DESK, photos: { 'ship:zzd_v': 2, 'unload:zzd_vin': 2 } });
    await openTruck(p, '9090', 'TV90');
    await until(p, () => document.querySelectorAll('[data-zz=ref] img').length >= 4);
    await segs(h, p, 'delivery-1400', { max: 3 });
    await p.context().close();
  }

  p = await crew(h, { viewport: DESK, seed });
  await p.getByRole('button', { name: /^Gear/ }).first().click();
  await wait(p);
  await segs(h, p, 'gear-1400', { max: 3 });
  await p.context().close();

  /* ================= photos left by a damage report that was never saved ================= */
  t.section('damage photos of a report that was never saved are cleared when a damage report opens (local mode)');
  {
    const seed2 = clone(seed);
    seed2.shipments.find(x => x.id === 'zzd_a').exceptions = [{ id: 'usedOld', kind: 'Damage', note: 'kept', at: iso(t0 - 3 * 1440 * MIN), openedBy: 'Roman', resolved: false,
      pallets: 1, kinds: ['Wet'], photoOwner: 'dmg:usedOld', photoCount: 2, est: { lines: [] }, answer: null }];
    seed2.trailers.find(x => x.id === 'zzd_w').dmgDrafts = [{ id: 'truckOld', photoOwner: 'dmg:truckOld', photoCount: 2, at: iso(t0 - 3 * 1440 * MIN), by: 'Roman', note: '' }];
    const ctx = await h.newContext({ viewport: PHONE, seed: seed2 });
    await ctx.addInitScript(([o, n]) => {
      try {
        if (localStorage.getItem('__zzorph')) return;
        localStorage.setItem('__zzorph', '1');
        const ph = at => JSON.stringify([{ id: 'p1', src: 'data:image/png;base64,AAAA', at }, { id: 'p2', src: 'data:image/png;base64,AAAA', at }]);
        localStorage.setItem('cdweb:cd6:photos:dmg:orphanOld', ph(o));
        localStorage.setItem('cdweb:cd6:photos:dmg:orphanNew', ph(n));
        localStorage.setItem('cdweb:cd6:photos:dmg:usedOld', ph(o));
        localStorage.setItem('cdweb:cd6:photos:dmg:truckOld', ph(o));
      } catch (e) {}
    }, [iso(Date.now() - 3 * 1440 * MIN), iso(Date.now() - 60 * MIN)]);
    const q = await crew(h, { context: ctx });
    const keys = () => q.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('cdweb:cd6:photos:dmg:')).sort());
    const all4 = ['cdweb:cd6:photos:dmg:orphanNew', 'cdweb:cd6:photos:dmg:orphanOld', 'cdweb:cd6:photos:dmg:truckOld', 'cdweb:cd6:photos:dmg:usedOld'];
    await wait(q, 600);
    t.eq(await keys(), all4, 'nothing is removed when the page loads');
    await q.getByRole('button', { name: /^Start unloading/ }).first().click();
    await wait(q, 500);
    await step(q, 'Unload');
    await q.getByRole('button', { name: /it's off, count it next/ }).click();
    await wait(q, 500);
    await step(q, 'Sort, count, verify');
    const cb = q.locator('div.rounded-lg').filter({ has: q.locator('span.font-black', { hasText: 'DB-200' }) }).last();
    if (await cb.getByRole('button', { name: 'Damaged', exact: true }).count() === 0) { await cb.locator('button').first().click(); await wait(q); }
    await cb.getByRole('button', { name: 'Damaged', exact: true }).click();
    await cb.getByRole('button', { name: '05', exact: true }).click().catch(() => {});
    await cb.getByRole('button', { name: 'Save', exact: true }).click();
    await wait(q, 1000);
    t.ok(await q.locator('[data-zz=dmg]').count() === 1, 'Damaged + Save opens the damage report');
    t.eq(await keys(), ['cdweb:cd6:photos:dmg:orphanNew', 'cdweb:cd6:photos:dmg:truckOld', 'cdweb:cd6:photos:dmg:usedOld'],
      'opening it removes only the day-old photos nothing uses; a report\'s photos, a snap waiting on the truck and a recent unsaved draft stay');
    await q.keyboard.press('Escape');
    await ctx.close();
  }
});

function ieq(a, b) { return (Number(a) || 0) === (Number(b) || 0); }
