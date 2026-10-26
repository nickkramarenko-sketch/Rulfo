/* Stream E acceptance (PLAN.md 3.E): office yard board, settings, outbox, Friday summaries, gear, truck sheet extras,
   TV board, tab bar, office bell, office bookings. Signs in as Nick 2468; screens at 1400x900 and 390x844.
     node website/portal/test/run.js e [--dist DIR]
   Every page runs with a fixed dock clock (14:00 Pacific, today or tomorrow) and a fixture built on the base demo doc:
   the demo trucks are moved 20 days back (departed) and these trucks are added:
     yard   Y10 (Truckee River, checked in 10 min ago), Y40 (Pine Ridge, 40 min ago)
     doors  W1 D1 (Altex, waited 5), W2 D2 (Washoe, outbound, secured, waited 15), W3 D3 (Carson, waited 30, 2.5 h since check-in)
     done   F1 (Altex, 60 min), F2 (Great Basin, 70), F3 (Silver State, 90), F4 (Tahoe, 150: over the 2 h promise)
     booked C1 (Comstock, customer booking not confirmed, code 4821, Samsara link, ETA), C2 (Altex dispatch, code 5932),
            C3 (Pyramid Lake, old-style "Requested by customer" note)
   Average wait today = (5+15+30+10+20+10+36)/7 = 18 min. Data is always read back from localStorage.
   Contacts: Altex (Pat: friday email, Lee), Truckee River (Dana: friday by text); Pine Ridge has an account email; the other
   demo accounts have no email, so their Friday summary waits until the office adds one. */
const H = require('./harness');
const { PHONE, DESK } = H;
const MIN = 6e4, HOUR = 36e5, DAY = 864e5;
const iso = ms => new Date(ms).toISOString();
const clone = o => JSON.parse(JSON.stringify(o));
const TZ = 'America/Los_Angeles';
const RGB = { red: 'rgb(192, 57, 43)', amber: 'rgb(183, 121, 31)', green: 'rgb(30, 138, 90)', orange: 'rgb(169, 90, 36)' };

/* the next 14:00 dock time (Pacific) after now: the whole fixture day sits between 08:00 and 14:00 that day */
function dock14() {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', hourCycle: 'h23' });
  const start = Math.ceil(Date.now() / HOUR) * HOUR;
  for (let k = 0; k < 50; k++) { const t = start + k * HOUR; if (+f.format(new Date(t)) === 14) return t; }
  throw new Error('no 14:00');
}

async function fixture(h, NOW, o = {}) {
  const d = await h.baseDoc();
  const tpl = clone(d.trailers[0]);
  const old = NOW - 20 * DAY;   // past the 14-day outbox window and last week
  d.trailers.forEach(t => Object.assign(t, { stage: 'departed', dock: null, scheduledAt: iso(old - 3 * HOUR), arrivedAt: iso(old - 2 * HOUR), dockedAt: iso(old - 2 * HOUR),
    workStartedAt: iso(old - 90 * MIN), workDoneAt: iso(old - HOUR), departedAt: iso(old) }));
  const T = x => Object.assign(clone(tpl), { carrier: '', driver: 'Driver ' + x.truck, phone: '', direction: 'inbound', dock: null, scheduledAt: null, arrivedAt: null, dockedAt: null,
    workStartedAt: null, workStartedBy: null, workDoneAt: null, workDoneBy: null, departedAt: null, notes: '', chat: [], sealIn: '', instructions: '', jobType: '' }, x, { trailer: 'T' + x.truck });
  const ago = m => iso(NOW - m * MIN);
  const add = [
    T({ id: 'zzeY10', truck: 'Y10', customerId: 'zzc1', stage: 'arrived', dock: 'YD', arrivedAt: ago(10), scheduledAt: ago(30), checkedInBy: 'kiosk', paperCount: 1, paperBy: 'Driver at kiosk' }),
    T({ id: 'zzeY40', truck: 'Y40', customerId: 'cu_pine', stage: 'arrived', dock: 'YD', arrivedAt: ago(40), scheduledAt: ago(50) }),
    T({ id: 'zzeW1', truck: 'W1', customerId: 'cu_altex', stage: 'working', dock: 'D1', arrivedAt: ago(50), dockedAt: ago(45), workStartedAt: ago(45), workStartedBy: 'Roman' }),
    T({ id: 'zzeW2', truck: 'W2', customerId: 'zzc2', direction: 'outbound', stage: 'working', dock: 'D2', arrivedAt: ago(60), dockedAt: ago(45), workStartedAt: ago(45), workStartedBy: 'Sergio',
      secure: { gear: { plywood: { qty: 6, owner: 'ours' }, bars: { qty: 2, owner: 'ours' }, straps: { qty: 0, owner: 'ours' }, airbags: { qty: 1, owner: 'driver' } }, tags: ['B-17'], seal: 'SL-555',
        photos: { nose: 1, middle: 1, tail: 1, closeup: 1, seal: 1 }, confidence: 4, note: '', checkedRows: true, signature: 'Sergio', signedBy: 'Sergio', signedAt: ago(5) } }),
    T({ id: 'zzeW3', truck: 'W3', customerId: 'zzc3', stage: 'working', dock: 'D3', arrivedAt: ago(150), dockedAt: ago(120), workStartedAt: ago(120), workStartedBy: 'Vlad' }),
    T({ id: 'zzeF1', truck: 'F1', customerId: 'cu_altex', stage: 'departed', arrivedAt: ago(300), dockedAt: ago(290), workStartedAt: ago(290), workDoneAt: ago(240), departedAt: ago(235), workDoneBy: 'Roman' }),
    T({ id: 'zzeF2', truck: 'F2', customerId: 'zzc4', stage: 'departed', arrivedAt: ago(240), workStartedAt: ago(220), workDoneAt: ago(170), departedAt: ago(165), workDoneBy: 'Sergio' }),
    T({ id: 'zzeF3', truck: 'F3', customerId: 'zzc5', stage: 'departed', arrivedAt: ago(210), workStartedAt: ago(200), workDoneAt: ago(120), departedAt: ago(115), workDoneBy: 'Vlad' }),
    T({ id: 'zzeF4', truck: 'F4', customerId: 'zzc6', stage: 'departed', arrivedAt: ago(360), workStartedAt: ago(324), workDoneAt: ago(210), departedAt: ago(205), workDoneBy: 'Roman' }),
    T({ id: 'zzeC1', truck: 'C1', customerId: 'zzc7', stage: 'scheduled', scheduledAt: iso(NOW + 2 * HOUR), code: '4821', createdAt: ago(24 * 60), bookedVia: 'client', bookedBy: 'Sam Comstock',
      tracking: 'samsara', trackUrl: 'https://cloud.samsara.com/o/123/fleet/viz/share/abc', driverLang: 'es', eta: { at: iso(NOW + 140 * MIN), source: 'client', updatedAt: ago(12), by: 'Sam Comstock', note: '' } }),
    T({ id: 'zzeC2', truck: 'C2', customerId: 'cu_altex', stage: 'scheduled', scheduledAt: iso(NOW + 3 * HOUR), code: '5932', createdAt: ago(600), bookedVia: 'client', bookedBy: 'Altex dispatch' }),
    T({ id: 'zzeC3', truck: 'C3', customerId: 'zzc8', stage: 'scheduled', scheduledAt: iso(NOW + 4 * HOUR), notes: 'Requested by customer' }),
    ...(o.extraTrailers || [])
  ];
  d.trailers.push(...add);
  const cu = id => d.customers.find(c => c.id === id);
  cu('cu_altex').contacts = [
    { id: 'ct1', name: 'Pat', role: 'Dispatch', phone: '775-555-0101', email: 'pat@altex.example',
      alerts: { arrived: { text: true, email: false }, done: { text: false, email: true }, friday: { text: false, email: true } } },
    { id: 'ct2', name: 'Lee', role: 'Billing', phone: '775-555-0102', email: 'lee@altex.example',
      alerts: { arrived: { text: false, email: true }, done: { text: false, email: false } } }];
  cu('zzc1').contacts = [{ id: 'ct3', name: 'Dana', role: 'Dispatch', phone: '775-555-0210', email: '', alerts: { friday: { text: true, email: false } } }];
  cu('zzc6').fridaySummary = false;
  cu('zzc7').securementInterest = ago(24 * 60);
  cu('zzc7').securementInterestBy = 'Sam Comstock';
  d.zzGear = [
    { id: 'g1', customerId: 'cu_altex', trailerId: 'zzeF1', type: 'plywood', qty: 6, dir: 'out', tags: [], at: ago(240), by: 'Roman', note: '', src: 'secure' },
    { id: 'g2', customerId: 'cu_altex', trailerId: 'zzeF1', type: 'bars', qty: 2, dir: 'out', tags: ['B-17', 'B-18'], at: ago(240), by: 'Roman', note: '', src: 'secure' },
    { id: 'g3', customerId: 'cu_pine', trailerId: null, type: 'straps', qty: 4, dir: 'out', tags: [], at: ago(2 * 24 * 60), by: 'Nick', note: '', src: 'manual' }];
  return d;
}

/* ---------- page helpers ---------- */
async function ready(page) { await page.waitForFunction(() => window.__zz && window.__zz.actions && window.__zz.h, null, { timeout: 10000 }); }
async function act(page, name, ...args) {
  return page.evaluate(async ([name, args]) => {
    let r = window.__zz.actions[name](...args);
    if (r && typeof r.then === 'function') r = await r;
    await new Promise(z => setTimeout(z, 250));
    return r && typeof r === 'object' && Array.isArray(r.trailers) ? { __doc: true } : (r === undefined ? null : r);
  }, [name, args]);
}
const tab = async (p, label) => { await p.locator('div.fixed.bottom-0 button', { hasText: new RegExp('^' + label + '$') }).first().click(); await p.waitForTimeout(350); };
const statV = (p, k) => p.locator(`[data-stat-value="${k}"]`).first();
const color = loc => loc.evaluate(el => getComputedStyle(el).color);
const truckT = (doc, id) => doc.trailers.find(x => x.id === id);
async function office(h, seed, NOW, viewport = DESK) {
  const p = await h.openAs('office', { viewport, seed, now: NOW, timezoneId: TZ });
  await ready(p);
  return p;
}
async function closeSheet(p) { await p.keyboard.press('Escape'); await p.waitForTimeout(250); }
async function bellTexts(p) {
  await p.locator('button[aria-label^="Notifications"]').first().click();
  await p.waitForTimeout(300);
  const s = await p.locator('.fixed.inset-0').last().innerText();
  await p.keyboard.press('Escape');
  await p.waitForTimeout(200);
  return s;
}

H.main('e-office', async (h, t) => {
  const NOW = dock14();
  const seed = await fixture(h, NOW);
  console.log('# fixture clock: ' + new Date(NOW).toISOString() + ' (14:00 dock time)');

  /* ================= yard board ================= */
  t.section('yard board: tiles, lanes, taps');
  {
    const p = await office(h, seed, NOW);
    await tab(p, 'Yard');
    t.ok(await p.locator('[data-zz="yard"]').count() === 1, 'Yard tab opens the yard board');
    t.eq(await statV(p, 'yard').innerText(), '2', 'tile: 2 in the yard');
    t.eq(await statV(p, 'doors').innerText(), '3', 'tile: 3 at doors');
    t.eq(await statV(p, 'done').innerText(), '4', 'tile: 4 done today');
    t.eq(await statV(p, 'avg').innerText(), '18m', 'tile: average wait today 18m ((5+15+30+10+20+10+36)/7)');
    t.eq(await color(statV(p, 'avg')), RGB.green, 'average wait 18m is green against the 30 min goal');
    t.eq(await statV(p, 'longest').innerText(), '40m', 'tile: longest wait now 40m');
    t.eq(await color(statV(p, 'longest')), RGB.red, 'longest wait is red (over the goal)');
    const longSub = await p.locator('[data-stat-value="longest"]').locator('xpath=..').innerText();
    t.ok(/Pine Ridge Freight/.test(longSub) && /over the 30 min goal/.test(longSub), 'longest wait names the company and says it is over the goal');
    t.eq(await statV(p, 'promise').innerText(), '75%', 'tile: promise kept today 75% (3 of 4)');
    const lane = k => p.locator(`[data-lane="${k}"]`).locator('xpath=..');
    const waitTxt = await lane('waiting').innerText();
    t.ok(waitTxt.indexOf('#1 in line') < waitTxt.indexOf('Pine Ridge') && waitTxt.indexOf('Pine Ridge') < waitTxt.indexOf('#2 in line') && /Truckee River/.test(waitTxt.slice(waitTxt.indexOf('#2 in line'))), 'waiting lane in check-in order: #1 Pine Ridge (40m), #2 Truckee River (10m)');
    t.ok(/Over the 30 min goal\. Give them a door\./.test(waitTxt) && /1 paperwork photo/.test(waitTxt) && /No paperwork scanned/.test(waitTxt), 'waiting cards: over-the-goal line and paperwork counts');
    t.eq(await p.locator('[data-lane="waiting"]').locator('xpath=..').locator('[data-clock="wait"]').evaluateAll(els => els.map(e => e.dataset.tone)), ['bad', 'good'], 'wait clocks coloured by the goal (40m red, 10m green)');
    const doorTxt = await lane('doors').innerText();
    t.ok(/Door D1[\s\S]*Door D2[\s\S]*Door D3/.test(doorTxt) && /past the promise/.test(doorTxt) && /Secured 4\/5/.test(doorTxt), 'at doors: D1-D3 in door order, D3 past the promise, D2 secured 4/5');
    const doneTxt = await lane('done').innerText();
    t.ok((doneTxt.match(/✓ Within 2 h/g) || []).length === 3 && (doneTxt.match(/✗ Over 2 h/g) || []).length === 1, 'done today: 3 within the 2 h promise, 1 over');
    const comTxt = await lane("coming").innerText();
    t.ok(/Comstock Carriers/.test(comTxt) && /Needs your OK/.test(comTxt) && /Live map: https:\/\/cloud\.samsara\.com/.test(comTxt) && /ETA from the customer, 12m ago/.test(comTxt), 'coming today: ETA with source and age, the tracking link as text, needs-OK pill');
    t.ok(/Altex Transportation/.test(comTxt) && /Pyramid Lake Hauling/.test(comTxt), 'coming today lists the other bookings');
    await h.check(p, 'yard-1400', { full: true });
    // taps open the existing truck sheet
    await statV(p, 'longest').click();
    await p.waitForTimeout(300);
    t.ok(await p.getByText('Y40 / TY40').count() > 0 && await p.getByRole('button', { name: 'Edit booking' }).count() > 0, 'tapping the longest-wait tile opens the existing truck sheet for Y40');
    await closeSheet(p);
    await p.locator('[data-truck="zzeW3"]').click();
    await p.waitForTimeout(300);
    t.ok(await p.getByText('W3 / TW3').count() > 0, 'tapping a door card opens that truck');
    await closeSheet(p);
    await p.setViewportSize(PHONE);
    await p.waitForTimeout(300);
    await h.check(p, 'yard-390');
    await h.check(p, 'yard-390-full', { full: true });
    await p.context().close();
  }

  t.section('yard board: two trucks at one door are flagged');
  {
    const s2 = clone(seed);
    s2.trailers.push({ ...clone(s2.trailers.find(x => x.id === 'zzeW1')), id: 'zzeW1b', truck: 'W1B', trailer: 'TW1B', customerId: 'zzc9', stage: 'at-dock', workStartedAt: null, workStartedBy: null });
    // a truck that just checked in (NEW for 5 minutes) and a booking 30 min past its appointment that never came
    s2.trailers.push({ ...clone(s2.trailers.find(x => x.id === 'zzeY10')), id: 'zzeY02', truck: 'Y02', trailer: 'TY02', customerId: 'zzc8', arrivedAt: new Date(NOW - 2 * MIN).toISOString(), paperCount: 0 });
    s2.trailers.push({ ...clone(s2.trailers.find(x => x.id === 'zzeC3')), id: 'zzeC0', truck: 'C0', trailer: 'TC0', customerId: 'zzc9', scheduledAt: new Date(NOW - 30 * MIN).toISOString(), notes: '' });
    const p = await office(h, s2, NOW);
    await tab(p, 'Yard');
    const s = await h.text(p);
    t.ok(/Two trucks are marked at door D1: truck W1 and truck W1B\./.test(s) && (s.match(/Same door twice/g) || []).length === 2, 'double door: red banner and both cards flagged');
    t.ok(/NEW/.test(await p.locator('[data-truck="zzeY02"]').innerText()) && !/NEW/.test(await p.locator('[data-truck="zzeY10"]').innerText()), 'NEW pill on a truck checked in 2 min ago, not on the one from 10 min ago');
    t.ok(/Late: 30m past the appointment/.test(await p.locator('[data-truck="zzeC0"]').innerText()), 'coming today: a no-show 30 min past its appointment is flagged late');
    await p.context().close();
  }

  /* ================= settings ================= */
  t.section('settings: wait goal recolours the clocks; promise, prices saved with zzSettings');
  {
    const p = await office(h, seed, NOW);
    await tab(p, 'Setup');
    const card = p.locator('[data-zz="dockset"]');
    t.ok(await card.count() === 1, 'Setup shows the dock promise card');
    const order = await p.evaluate(() => { const s = document.getElementById('root').innerText; return [s.indexOf('Dock promise and wait goal'), s.indexOf('Crew on the floor')]; });
    t.ok(order[0] > 0 && order[0] < order[1], 'the card sits before "Crew on the floor"');
    t.ok(await p.getByText('Outbox · ').count() > 0 && await p.getByText('Rate card').count() > 0, 'Setup keeps the rate card and the old outbox');
    await h.check(p, 'setup-1400');
    await card.locator('input[aria-label^="Wait goal"]').fill('20');
    await card.locator('input[aria-label^="Replacement pallet"]').fill('25');
    await card.getByRole('button', { name: 'Save dock settings' }).click();
    await p.waitForTimeout(500);
    let doc = await h.readDoc(p);
    t.ok(doc.settings.waitGoalMin === 20 && doc.rates.newPallet === 25 && doc.rates.std === seed.rates.std && doc.settings.crewMembers.length === 3 && doc.settings.admins.length === 2,
      'saved: wait goal 20, new pallet $25; rates, crew and admins untouched');
    t.ok(await p.getByText('Dock settings saved.').count() > 0, 'toast: Dock settings saved.');
    await tab(p, 'Yard');
    t.eq(await color(statV(p, 'avg')), RGB.amber, 'average wait 18m turns amber against the 20 min goal');
    t.ok(/over the 20 min goal/.test(await p.locator('[data-stat-value="longest"]').locator('xpath=..').innerText()) && /goal 20 min/.test(await h.text(p)), 'yard texts follow the new goal');
    {
      // the crew clocks (stream D) read the same setting: check them when this build has D's crew screen
      // a crew phone with the saved doc (a fresh browser: this one remembers Nick's sign-in)
      const cp = await h.openAs('crew', { viewport: PHONE, seed: await h.readDocRaw(p), now: NOW, timezoneId: TZ });
      const ct = await h.text(cp);
      if (/· goal \d+/.test(ct)) t.ok(/· goal 20/.test(ct) && !/· goal 30/.test(ct), 'crew wait clocks follow the new 20 min goal (stream D screen)');
      else console.log('  note - this build has no crew wait clocks (they come from stream D); skipped the crew-clock check');
      await cp.context().close();
    }
    await tab(p, 'Setup');
    await card.locator('input[aria-label^="Wait goal"]').fill('12');
    await card.getByRole('button', { name: 'Save dock settings' }).click();
    await p.waitForTimeout(500);
    await tab(p, 'Yard');
    t.eq(await p.locator('[data-lane="waiting"]').locator('xpath=..').locator('[data-clock="wait"]').evaluateAll(els => els.map(e => e.dataset.tone)), ['bad', 'warn'], 'goal 12: the 10m clock turns amber (75% of the goal)');
    await tab(p, 'Board');
    const chips = await p.evaluate(() => [...document.querySelectorAll('button')].filter(b => /^Y(10|40) · /.test(b.innerText)).map(b => [b.innerText.slice(0, 3), getComputedStyle(b).color]));
    t.eq(chips, [['Y40', RGB.red], ['Y10', RGB.amber]], 'door map yard chips: check-in order, coloured by the goal');
    await tab(p, 'Setup');
    await card.locator('input[aria-label^="Our promise"]').fill('5');
    await card.getByRole('button', { name: 'Save dock settings' }).click();
    await p.waitForTimeout(300);
    t.ok(await p.getByText('The promise must be between 15 and 1440 minutes.').count() > 0 && (await h.readDoc(p)).settings.promiseMin === 120, 'a bad promise is refused with a plain message and nothing is saved');
    await card.locator('input[aria-label^="Our promise"]').fill('90');
    t.ok(/1h 30m from check-in to done/.test(await card.innerText()), 'the promise hint spells out 90 minutes as 1h 30m');
    await card.locator('input[aria-label^="Replacement pallet"]').fill('');
    await card.getByRole('button', { name: 'Save dock settings' }).click();
    await p.waitForTimeout(300);
    t.ok(await p.getByText('Type the replacement pallet price (a number, 0 or more).').count() > 0 && (await h.readDoc(p)).rates.newPallet === 25 && (await h.readDoc(p)).settings.promiseMin === 120, 'a blank price is refused (it is not saved as $0)');
    await p.setViewportSize(PHONE);
    await card.scrollIntoViewIfNeeded();
    await h.check(p, 'setup-390');
    await p.context().close();
  }

  /* ================= board: door map, KPI label, tab bar ================= */
  t.section('board: door map red past the promise, "Arrived on time", tab bar');
  {
    const p = await office(h, seed, NOW);
    t.ok(await p.getByText('Arrived on time').count() === 1 && await p.getByText('Trucks on time').count() === 0, 'KPI reads "Arrived on time"');
    const border = d => p.evaluate(d => { const b = [...document.querySelectorAll('button')].find(x => x.innerText.trim().startsWith(d + '\n')); return b ? getComputedStyle(b).borderTopColor : null; }, d);
    t.eq([await border('D1'), await border('D3')], [RGB.orange, RGB.red], 'door map: D3 (2.5 h since check-in) is red, D1 is not');
    const tabsTxt = await p.locator('div.fixed.bottom-0').innerText();
    t.ok(/Chat[\s\S]*Yard[\s\S]*Outbox[\s\S]*Gear[\s\S]*Crew[\s\S]*Setup/.test(tabsTxt) && /^Board/.test(tabsTxt.trim()), 'tabs: Board first (default) ... Chat, Yard, Outbox, Gear, Crew, Setup');
    await p.setViewportSize(PHONE);
    await p.waitForTimeout(300);
    const bar = await p.evaluate(() => { const el = document.querySelector('div.fixed.bottom-0 > div'); return { sw: el.scrollWidth, cw: el.clientWidth, page: document.scrollingElement.scrollWidth, n: el.querySelectorAll('button').length }; });
    t.ok(bar.n === 11 && bar.sw > bar.cw && bar.cw <= 390 && bar.page <= 390, `tab bar at 390: 11 tabs scroll inside the bar (${bar.sw} > ${bar.cw}), the page does not (${bar.page})`);
    const peek = await p.evaluate(() => { const el = document.querySelector('div.fixed.bottom-0 > div'), b = [...el.querySelectorAll('button')], r = b.map(x => x.getBoundingClientRect());
      const cut = r.find(x => x.left < innerWidth && x.right > innerWidth); return { cut: cut ? Math.round(innerWidth - cut.left) : 0, minH: Math.min(...r.map(x => x.height)), shade: /radial-gradient/.test(getComputedStyle(el).backgroundImage) }; });
    t.ok(peek.cut >= 15 && peek.shade && peek.minH >= 44, `a part of the next tab peeks in (${peek.cut}px) with an edge shadow, so Nick can see the bar scrolls; tabs ${peek.minH}px tall`);
    await tab(p, 'Gear');
    t.ok(await p.locator('[data-zz="gear"]').count() === 1, 'a tab past the edge (Gear) is reachable at 390');
    await h.check(p, 'tabbar-390');
    await tab(p, 'Board');
    await p.getByText('Doors', { exact: true }).first().scrollIntoViewIfNeeded();
    await h.check(p, 'board-doors-390');
    await p.setViewportSize(DESK);
    await tab(p, 'Board');
    await h.check(p, 'board-1400');
    await p.context().close();
  }

  /* ================= outbox ================= */
  t.section('outbox: banner, messages by contact choices, filters');
  {
    const p = await office(h, seed, NOW);
    await tab(p, 'Outbox');
    const s = await h.text(p);
    t.ok(s.includes('Not connected yet — this is exactly what would be sent. Send urgent ones by hand.'), 'banner: not connected yet');
    t.ok(!/\bTexted\b|\bwas sent\b|\bsent to\b/i.test(s), 'no screen text claims a message was sent');
    const n = async sel => p.locator(sel).count();
    t.ok(await n('[data-msg="done:zzeF1:0:email"]') === 1 && await n('[data-msg^="done:zzeF1:1:"]') === 0, 'done: an email for Pat (chose done by email), nothing for Lee (did not)');
    t.ok(await n('[data-msg="arrived:zzeF1:0:sms"]') === 1 && await n('[data-msg="arrived:zzeF1:1:email"]') === 1 && await n('[data-msg="arrived:zzeF1:0:email"]') === 0 && await n('[data-msg="arrived:zzeF1:1:sms"]') === 0,
      'checked in: a text for Pat and an email for Lee, by their choices');
    t.ok(Number(await statV(p, 'today').innerText()) > 0, 'today count shown');
    const kinds = () => p.locator('[data-msg]').evaluateAll(els => [...new Set(els.map(e => e.dataset.event))]);
    await p.locator('select[aria-label="Kind of message"]').selectOption('done');
    await p.waitForTimeout(200);
    t.eq(await kinds(), ['done'], 'filter kind = Done: only done messages');
    await p.locator('select[aria-label="Company"]').selectOption('cu_altex');
    await p.waitForTimeout(200);
    const rows = await p.locator('[data-msg]').evaluateAll(els => els.map(e => e.innerText));
    t.ok(rows.length === 1 && /Altex Transportation/.test(rows[0]) && /pat@altex\.example/.test(rows[0]), 'filter company = Altex: one done email, to Pat');
    await p.getByRole('button', { name: 'Clear filters' }).click();
    await p.locator('[role="group"][aria-label="Text or email"] button', { hasText: 'Texts' }).click();
    await p.waitForTimeout(200);
    const chs = await p.locator('[data-msg]').evaluateAll(els => [...new Set(els.map(e => e.querySelector('span').innerText.trim()))]);
    t.eq(chs, ['TEXT'], 'filter channel = Texts: only texts');
    await p.getByRole('button', { name: 'Clear filters' }).click();
    await p.locator('[data-msg="done:zzeF1:0:email"] > button').click();
    await p.waitForTimeout(200);
    const body = await p.locator('[data-msg="done:zzeF1:0:email"] pre').innerText();
    t.ok(/Subject: Done: truck F1/.test(body) && /Truck F1 is done/.test(body), 'a message opens to show the full text');
    await p.locator('[data-msg="done:zzeF1:0:email"]').getByRole('button', { name: /Open truck F1/ }).click();
    await p.waitForTimeout(300);
    t.ok(await p.getByText('F1 / TF1').count() > 0, '"Open truck" opens the truck sheet');
    await closeSheet(p);
    await h.check(p, 'outbox-1400');
    await p.evaluate(() => window.scrollTo(0, 0));
    await h.check(p, 'outbox-1400-top');
    await p.setViewportSize(PHONE);
    await p.waitForTimeout(300);
    await h.check(p, 'outbox-390');
    await p.evaluate(() => window.scrollTo(0, 0));
    await h.check(p, 'outbox-390-top');
    await p.context().close();
  }

  /* ================= Friday ================= */
  t.section('Friday summaries: one per reachable customer, a second click adds 0, unreachable ones wait for a contact');
  {
    const p = await office(h, seed, NOW);
    await tab(p, 'Outbox');
    await p.getByRole('button', { name: 'Friday summaries' }).click();
    await p.waitForTimeout(300);
    const cards = await p.locator('[data-friday]').evaluateAll(els => els.map(e => e.dataset.friday).sort());
    const want = ['cu_altex', 'cu_pine', 'zzc1', 'zzc2', 'zzc3', 'zzc4', 'zzc5'].sort();
    t.eq(cards, want, 'previews for the 7 customers with trucks this week and Friday summaries on');
    t.ok(/Turned off by the customer: Tahoe Freightways\./.test(await h.text(p)), 'a customer who switched it off is listed as off');
    t.ok(/Left out until they have an email or cell on file: Carson Line Trucking, Great Basin Transport, Silver State Express, Washoe Valley Freight\./.test(await h.text(p)),
      'customers with nobody to send to are named (not silently queued to nobody)');
    const alt = p.locator('[data-friday="cu_altex"]').locator('xpath=../..');
    await alt.getByRole('button', { name: 'Preview email' }).click();
    const pv = await alt.locator('pre').innerText();
    t.ok(/Hi Pat,/.test(pv) && /Trucks: 2 \(1 done\)/.test(pv) && /Done within our 2-hour promise: 100%/.test(pv) && /plywood sheets/.test(pv) && /Goes to: Pat \(pat@altex\.example\)/.test(await alt.innerText()), 'Altex preview built from ZZweek, addressed to the contact who chose it');
    t.ok(/No address/.test(await p.locator('[data-friday="zzc3"]').locator('xpath=..').innerText()), 'a customer without an address is marked "No address"');
    await h.check(p, 'friday-1400');
    await p.getByRole('button', { name: 'Queue Friday summaries' }).click();
    await p.waitForTimeout(700);
    let doc = await h.readDoc(p);
    let fr = (doc.zzOutbox || []).filter(o => o.event === 'friday');
    t.ok(fr.length === 3 && new Set(fr.map(o => o.customerId)).size === 3 && fr.every(o => ['cu_altex', 'cu_pine', 'zzc1'].includes(o.customerId) && o.to), 'queued one entry per reachable customer (3), each with an address');
    t.ok(fr.find(o => o.customerId === 'cu_altex').to === 'pat@altex.example' && fr.find(o => o.customerId === 'cu_pine').to === 'ops@pineridge.example', 'Altex goes to Pat, Pine Ridge to the account email');
    const dana = fr.find(o => o.customerId === 'zzc1');
    t.ok(dana.channel === 'sms' && dana.to === '775-555-0210' && /your week so far/.test(dana.body) && !dana.subject, 'Truckee River gets the short text version (Dana chose text)');
    t.ok(await p.getByText("Queued 3 Friday summaries. They're in the Outbox, not sent. 4 customers still have no email or cell on file.").count() > 0, 'toast shows the count, says not sent, and says who is left out');
    await p.getByRole('button', { name: 'Queue Friday summaries' }).click();
    await p.waitForTimeout(700);
    doc = await h.readDoc(p);
    t.eq((doc.zzOutbox || []).filter(o => o.event === 'friday').length, 3, 'second click queues 0');
    t.ok(await p.getByText('Nothing new queued. 4 customers still have no email or cell on file.').count() > 0, 'toast: nothing new queued');
    await act(p, 'zzCustomer', 'zzc2', { contact: 'ops@washoe.example' });
    await p.getByRole('button', { name: 'Queue Friday summaries' }).click();
    await p.waitForTimeout(700);
    doc = await h.readDoc(p);
    fr = (doc.zzOutbox || []).filter(o => o.event === 'friday');
    t.ok(fr.length === 4 && fr.filter(o => o.customerId === 'zzc2').length === 1 && fr.find(o => o.customerId === 'zzc2').to === 'ops@washoe.example', 'after the office adds an email, queuing again adds only that customer');
    await p.getByRole('button', { name: 'Messages' }).click();
    await p.locator('select[aria-label="Kind of message"]').selectOption('friday');
    await p.waitForTimeout(200);
    t.eq(await p.locator('[data-msg^="obx:"]').count(), 4, 'the queued summaries show in the Outbox list (ZZobx)');
    await tab(p, 'Setup');
    t.ok(/Your week at 24HR Crossdock/.test(await h.text(p)), 'the old Setup outbox lists them too (E10)');
    await tab(p, 'Outbox');
    await p.getByRole('button', { name: 'Friday summaries' }).click();
    await p.setViewportSize(PHONE);
    await p.waitForTimeout(300);
    await h.check(p, 'friday-390');
    await p.context().close();
  }

  /* ================= gear ================= */
  t.section('gear: totals per customer, log a return, interest list');
  {
    const p = await office(h, seed, NOW);
    await tab(p, 'Gear');
    t.eq(await statV(p, 'gear-plywood').innerText(), '6', 'plywood out: 6');
    const row = p.locator('[data-gear-row="cu_altex"]');
    const val = k => row.locator(`[data-gear="${k}"] div`).nth(1).innerText();
    t.eq([await val('plywood'), await val('bars')], ['6', '2'], 'Altex: 6 plywood, 2 load bars');
    t.ok(/Tags out:[\s\S]*B-17[\s\S]*B-18/.test(await row.innerText()), 'Altex tags out B-17, B-18');
    await h.check(p, 'gear-1400');
    await row.getByRole('button', { name: 'Log gear back' }).click();
    await p.waitForTimeout(300);
    await h.check(p, 'gear-log-1400');
    await p.locator('input[aria-label="How many"]').fill('2');
    await p.getByRole('button', { name: 'B-18' }).click();
    // two quick taps on Save (a double tap) must log the return once
    await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.innerText.trim() === 'Log gear back' && x.closest('.fixed.inset-0')); b.click(); b.click(); });
    await p.waitForTimeout(700);
    const doc = await h.readDoc(p);
    const back = doc.zzGear.filter(g => g.dir === 'back');
    t.ok(back.length === 1 && back[0].customerId === 'cu_altex' && back[0].type === 'plywood' && back[0].qty === 2 && back[0].src === 'return' && back[0].by === 'Nick', 'zzGear row: 2 plywood back from Altex, by Nick (a double tap saves once)');
    t.eq(await val('plywood'), '4', 'Altex plywood total drops to 4');
    t.eq(await statV(p, 'gear-plywood').innerText(), '4', 'plywood out tile drops to 4');
    t.ok(await p.getByText('Logged: 2 plywood sheets back from Altex Transportation.').count() > 0, 'toast confirms the return');
    t.ok(/−2 plywood sheets back from Altex Transportation/.test(await h.text(p)), 'recent gear moves lists the return');
    const intr = p.locator('[data-interest="zzc7"]');
    t.ok(/Comstock Carriers/.test(await intr.innerText()) && /\$2,000 per 6 months/.test(await h.text(p)), 'securement plan interest list (price from settings)');
    await intr.getByRole('button', { name: 'Mark called' }).click();
    await p.waitForTimeout(500);
    const d2 = await h.readDoc(p);
    const c7 = d2.customers.find(c => c.id === 'zzc7');
    t.ok(!!c7.securementCalledAt && c7.securementCalledBy === 'Nick' && c7.securementInterest === seed.customers.find(c => c.id === 'zzc7').securementInterest && c7.pin === seed.customers.find(c => c.id === 'zzc7').pin, '"Mark called" records the call and leaves the rest of the account alone');
    await p.setViewportSize(PHONE);
    await p.waitForTimeout(300);
    await h.check(p, 'gear-390');
    await p.context().close();
  }

  /* ================= truck sheet ================= */
  t.section('truck sheet: code, driver link, confirm time, set ETA, check in now, paperwork, secure, messages');
  {
    const p = await office(h, seed, NOW);
    // a paperwork photo for Y10 (as the kiosk saves it)
    await p.evaluate(at => window.__zz.h.photos.ex('paper:zzeY10', [{ id: 'pp1', src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEklEQVR42mP8z8AARMQBxlGFAD7XAQEZW5rUAAAAAElFTkSuQmCC', at, by: 'Driver at kiosk' }]), iso(NOW - 9 * MIN));
    let bell = await bellTexts(p);
    t.ok(/Comstock Carriers requested a slot/.test(bell) && /Pyramid Lake Hauling requested a slot/.test(bell) && !/Altex Transportation requested a slot/.test(bell), 'office bell: unconfirmed customer bookings (new and old style), not the dispatch account');
    await tab(p, 'Yard');
    await p.locator('[data-truck="zzeC1"]').click();
    await p.waitForTimeout(400);
    const sheet = p.locator('.fixed.inset-0').last();
    t.ok(await sheet.getByText('Code 4821').count() === 1 && await sheet.locator('[data-code="4821"]').count() === 1, 'shows the check-in code (pill and big)');
    const link = await sheet.locator('input[aria-label^="Driver page"]').inputValue();
    t.ok(link === 'https://claude.ai/artifact/97haWKtJGFGXW8PjdM9XWv#eta4821', 'driver link ends in #eta4821 (' + link + ')');
    const st = await sheet.innerText();
    t.ok(/ETA updates\s*Samsara/.test(st) && /Español/.test(st) && /Booked by the customer \(Sam Comstock\)/.test(st), 'tracking choice, driver language and who booked');
    t.ok(await sheet.locator('input[aria-label="Samsara live map link"]').inputValue() === 'https://cloud.samsara.com/o/123/fleet/viz/share/abc', 'tracking URL as text');
    const openA = await sheet.locator('a', { hasText: 'Open' }).evaluateAll(els => els.map(a => [a.getAttribute('href'), a.getAttribute('target'), a.getAttribute('rel')]));
    t.eq(openA, [['https://cloud.samsara.com/o/123/fleet/viz/share/abc', '_blank', 'noopener noreferrer']], 'the live map link also opens (https only, new tab, noopener noreferrer)');
    const ord = s0 => ['Check-in code and driver link', 'Loads on this trailer', 'Chat about this truck', 'Messages for this truck'].map(k => s0.indexOf(k));
    const o1 = ord(st);
    t.ok(o1.every(x => x >= 0) && o1[0] < o1[1] && o1[1] < o1[2] && o1[2] < o1[3], 'sheet order: the new code / ETA / booking boxes, then Nick\'s loads and truck chat, then this truck\'s messages at the end (' + o1 + ')');
    t.ok(/ETA \d{1,2}:\d{2} PM/.test(st) && /from the customer \(Sam Comstock\), 12m ago/.test(st), 'ETA with its source');
    await sheet.getByRole('button', { name: 'Copy' }).first().click();
    await p.waitForTimeout(200);
    t.ok(await sheet.getByText(/^(Copied|Copy is blocked here.*)$/).count() > 0 || await sheet.getByRole('button', { name: 'Copied' }).count() > 0, 'Copy gives feedback (copied, or the link is selected)');
    await h.check(p, 'truck-c1-1400');
    await sheet.getByRole('button', { name: 'Confirm time' }).click();
    await p.waitForTimeout(500);
    let doc = await h.readDoc(p);
    t.ok(!!truckT(doc, 'zzeC1').confirmedAt && truckT(doc, 'zzeC1').confirmedBy === 'Nick', 'Confirm time: confirmedAt and confirmedBy saved');
    t.ok(await sheet.getByText('Needs your OK').count() === 0 && /Time confirmed by Nick/.test(await sheet.innerText()), 'the sheet now says confirmed');
    await sheet.getByRole('button', { name: 'Set ETA' }).click();
    await sheet.getByRole('button', { name: 'In 30 min' }).click();
    await p.waitForTimeout(500);
    doc = await h.readDoc(p);
    const eta = truckT(doc, 'zzeC1').eta;
    t.ok(eta.source === 'office' && eta.by === 'Nick' && Math.abs(Date.parse(eta.at) - (Date.parse(eta.updatedAt) + 30 * MIN)) < 5000, 'Set ETA: zzEta with source office, 30 min out');
    await closeSheet(p);
    bell = await bellTexts(p);
    t.ok(!/Comstock Carriers requested a slot/.test(bell) && /Pyramid Lake Hauling requested a slot/.test(bell), 'confirming clears it from the bell');

    await p.locator('[data-truck="zzeC2"]').click();
    await p.waitForTimeout(400);
    t.ok(/Booked straight onto the schedule/.test(await sheet.innerText()), 'dispatch booking: nothing to confirm');
    // a check-in whose save is refused (storage full): a toast says it did NOT save, the truck stays not checked in
    await p.evaluate(() => { const o = Storage.prototype.setItem; window.__zzSet = o; Storage.prototype.setItem = function (k, v) { if (k === 'cdweb:cd6:doc') throw new Error('blocked for the test'); return o.call(this, k, v); }; });
    await sheet.getByRole('button', { name: 'Check in now (driver skipped the kiosk)' }).click();
    await sheet.getByRole('button', { name: 'Yes, check in' }).click();
    await p.waitForTimeout(800);
    await p.evaluate(() => { Storage.prototype.setItem = window.__zzSet; });
    const failTxt = await h.text(p);
    t.ok(/The check-in did NOT save\. The truck is not checked in\. Try again\./.test(failTxt) && /That did not save\. Try again\./.test(await sheet.innerText()), 'Check in now that does not save: a toast and the sheet say so');
    t.ok(!truckT(await h.readDoc(p), 'zzeC2').arrivedAt && await sheet.getByRole('button', { name: /Check in now/ }).count() === 1, 'nothing saved, and the screen does not show the truck as checked in (the button is still there)');
    await h.check(p, 'truck-checkin-failed-1400');
    await sheet.getByRole('button', { name: 'Check in now (driver skipped the kiosk)' }).click();
    await sheet.getByRole('button', { name: 'Yes, check in' }).click();
    await p.waitForTimeout(800);
    doc = await h.readDoc(p);
    const c2 = truckT(doc, 'zzeC2');
    t.ok(c2.arrivedAt && c2.checkedInBy === 'office' && c2.dock === 'D4' && c2.stage === 'at-dock', 'Check in now: checked in by the office, first open door D4');
    t.ok(/Checked in\. Send the driver to door D4\./.test(await sheet.innerText()) && await sheet.getByRole('button', { name: /Check in now/ }).count() === 0, 'the sheet says where to send the driver; the button is gone');
    const again = await act(p, 'zzKioskIn', 'zzeC2', { by: 'office' });
    doc = await h.readDoc(p);
    t.ok(again && again.already === true && truckT(doc, 'zzeC2').arrivedAt === c2.arrivedAt, 'a second check-in returns already and arrivedAt does not change');
    t.ok(/Messages for this truck · [1-9]/.test(await sheet.innerText()), 'the sheet lists this truck\'s queued messages');
    await closeSheet(p);

    await p.locator('[data-truck="zzeY10"]').click();
    await p.waitForTimeout(500);
    t.ok(await sheet.locator('img[src^="data:image/png"]').count() >= 1 && /Paperwork · 1 photo/.test(await sheet.innerText()), 'paperwork photos from paper:<tid>');
    const y10 = await sheet.innerText();
    t.ok(/Waiting 10m · goal 30 min/.test(y10) && /Check-in code and driver link[\s\S]*No check-in code yet/.test(y10), 'clock section: waiting against the goal; the code box stays until the crew starts (this older truck can get a code)');
    t.ok(y10.indexOf('Check-in and promise') < y10.indexOf('Loads on this trailer') && y10.indexOf('Chat about this truck') < y10.indexOf('Paperwork'), 'checked-in truck: one clock box on top, paperwork after the chat');
    t.ok(!/Set ETA|Confirm time|Check in now/.test(y10), 'after check-in: no Set ETA / Confirm time / Check in now buttons');
    await closeSheet(p);
    await p.locator('[data-truck="zzeW2"]').click();
    await p.waitForTimeout(400);
    const w2 = await sheet.innerText();
    t.ok(/Secured 4\/5 · seal SL-555/.test(w2) && /6 plywood sheets \(ours\), 2 load bars \(ours\), 1 airbag \(driver's\)/.test(w2) && /Tags: B-17/.test(w2), 'securement summary (gear ours / driver\'s, tags, seal)');
    await h.check(p, 'truck-w2-1400');
    await closeSheet(p);
    await tab(p, 'Yard');
    await p.locator('[data-truck="zzeF1"]').click();
    await p.waitForTimeout(400);
    t.ok(/Done in 1h 0m, within our 2-hour promise/.test(await sheet.innerText()) && await sheet.locator('[data-msg="done:zzeF1:0:email"]').count() === 1, 'done truck: promise result and its outbox lines');
    await closeSheet(p);
    await p.setViewportSize(PHONE);
    await p.waitForTimeout(300);
    await p.locator('[data-truck="zzeC1"]').click();
    await p.waitForTimeout(400);
    await h.check(p, 'truck-c1-390');
    await sheet.locator('[data-zz="truck-extra"]').scrollIntoViewIfNeeded();
    await h.check(p, 'truck-c1-390-extra');
    await closeSheet(p);
    await p.context().close();
  }

  /* ================= office booking ================= */
  t.section('office "Book a truck" records bookedVia office and is confirmed');
  {
    const p = await office(h, seed, NOW);
    await tab(p, 'Schedule');
    await p.getByRole('button', { name: 'Book a truck' }).first().click();
    await p.waitForTimeout(300);
    await p.locator('input[placeholder="Start typing the company name"]').fill('Pine Ridge');
    await p.waitForTimeout(250);
    await p.locator('.fixed.inset-0 button', { hasText: 'Pine Ridge Freight' }).first().click();
    const when = new Date(NOW + DAY); // the next day 14:00 (browser zone is dock time)
    const pad = n => String(n).padStart(2, '0');
    const local = `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}T09:30`;
    await p.locator('input[type="datetime-local"]').fill(local);
    await p.locator('input[placeholder="221"]').fill('777');
    await p.getByRole('button', { name: 'Save appointment' }).click();
    await p.waitForTimeout(600);
    const doc = await h.readDoc(p);
    const b = doc.trailers.find(x => x.truck === '777');
    t.ok(b && b.bookedVia === 'office' && b.bookedBy === 'Nick' && !!b.confirmedAt && b.confirmedBy === 'Nick' && /^\d{4}$/.test(b.code), 'saved with bookedVia office, bookedBy Nick, confirmed, and a check-in code');
    t.ok(!/Pine Ridge Freight requested a slot/.test(await bellTexts(p)), 'an office booking never shows as "requested a slot"');
    await p.context().close();
  }

  /* ================= TV ================= */
  t.section('TV: yard in check-in order with #, door red past the promise, PIN exit');
  for (const vp of [DESK, PHONE]) {
    const p = await h.open('#stations', { viewport: vp, seed, now: NOW, timezoneId: TZ });
    await p.getByText('Open the dock board').click();
    await p.waitForTimeout(400);
    const yard = await p.evaluate(() => [...document.querySelectorAll('div.rounded-lg.p-3.flex.items-center.gap-3')].map(e => e.innerText.replace(/\s+/g, ' ').trim()));
    t.ok(yard.length === 2 && /^#1 Y40/.test(yard[0]) && /^#2 Y10/.test(yard[1]), `TV yard list in check-in order with # @${vp.width} (${yard.join(' | ')})`);
    const doors = await p.evaluate(() => [...document.querySelectorAll('div.rounded-xl.p-4')].map(e => [e.innerText.trim().slice(0, 2), getComputedStyle(e).borderTopColor]));
    t.ok(doors.find(d => d[0] === 'D3')[1] === RGB.red && doors.find(d => d[0] === 'D1')[1] === RGB.orange, `TV doors: D3 red past the promise, D1 orange @${vp.width}`);
    const cut = await p.evaluate(() => [...document.querySelectorAll('div.rounded-xl.p-4 .text-2xl.font-bold')].filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.innerText));
    t.eq(cut, [], `TV doors: no truck number is cut off @${vp.width}`);
    await h.check(p, 'tv-' + vp.width);   // no knownScroll: the board fits a phone now
    if (vp === DESK) {
      await p.evaluate(() => history.replaceState(null, '', location.pathname + '#tv'));
      await p.locator('text=Double-click anywhere to exit').dblclick();
      await p.waitForTimeout(300);
      t.ok(await p.getByText('Leave the dock board').count() === 1, 'double-click asks for an office PIN');
      await p.locator('input[aria-label="Office PIN"]').fill('7788');
      await p.getByRole('button', { name: 'Exit', exact: true }).click();
      await p.waitForTimeout(200);
      t.ok(await p.getByText("That PIN doesn't match an office login.").count() === 1 && await p.getByText('Leave the dock board').count() === 1, 'a customer PIN does not exit');
      await h.check(p, 'tv-pin-1400');
      await p.locator('input[aria-label="Office PIN"]').fill('2468');
      await p.getByRole('button', { name: 'Exit', exact: true }).click();
      await p.waitForTimeout(400);
      const left = await p.evaluate(() => ({ hash: location.hash, tv: !!document.querySelector('div.rounded-xl.p-4') }));
      t.ok(!left.tv && left.hash === '', 'office PIN exits the board and clears #tv');
    }
    await p.context().close();
  }

  /* ================= old data: nothing written by the new screens ================= */
  t.section('old data: opening the new office screens writes nothing');
  {
    const base = JSON.stringify(await h.baseDoc());
    const ctx = await h.newContext({ viewport: PHONE, seed: base, timezoneId: TZ });
    const p = await h.openAs('office', { context: ctx });
    for (const k of ['Yard', 'Outbox', 'Gear', 'Setup', 'Board']) await tab(p, k);
    await p.locator('button:has-text("27N")').first().click();
    await p.waitForTimeout(500);
    await closeSheet(p);
    await p.waitForTimeout(5300);
    t.ok(await h.readDocRaw(p) === base, 'base doc unchanged after visiting Yard, Outbox, Gear, Setup and a truck sheet (rev ' + JSON.parse(base).rev + ')');
    await ctx.close();
  }
});
