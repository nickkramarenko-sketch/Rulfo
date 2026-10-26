/* Stream B acceptance (PLAN.md 3.B): the customer portal. Signs in as Altex 7788 (and Pine Ridge 1357 where a
   non-dispatch account or saved custom rates matter).
     node website/portal/test/run.js b [--dist DIR]
   Data is always read back from localStorage (the stored doc is the truth). Helpers are reached through
   window.__zz (the harness sets window.__ZZTEST). Every screen and sheet is checked at 390 px for sideways scroll,
   including inside the sheets (the modal body must not scroll sideways). */
const H = require('./harness');
const { PHONE, DESK } = H;

const iso = ms => new Date(ms).toISOString();
const MIN = 6e4, HOUR = 36e5, DAY = 864e5;
const clone = o => JSON.parse(JSON.stringify(o));
const addDays = (ymd, n) => { const d = new Date(ymd + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const TALL = { width: 390, height: 3600 };
/* dock time (America/Los_Angeles) in Node, for building fixtures */
const dockYmd = ms => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
const dockIso = (ymd, hm) => { const want = Date.parse(ymd + 'T' + hm + ':00Z'); let g = want;
  for (let k = 0; k < 3; k++) { const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(g)).map(x => [x.type, x.value]));
    const got = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute); if (got === want) break; g += want - got; } return new Date(g).toISOString(); };
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEklEQVR42mP8z8AARMQBxlGFAD7XAQEZW5rUAAAAAElFTkSuQmCC';

async function ready(page) { await page.waitForFunction(() => window.__zz && window.__zz.actions && window.__zz.h, null, { timeout: 10000 }); }
async function calc(page, fn, a) {
  return page.evaluate(([src, a]) => {
    const f = (0, eval)('(' + src + ')');
    const raw = localStorage.getItem('cdweb:cd6:doc');
    return f(window.__zz.h, raw ? JSON.parse(raw) : null, a);
  }, [fn.toString(), a === undefined ? null : a]);
}
async function act(page, name, ...args) {
  return page.evaluate(async ([name, args]) => {
    let r = window.__zz.actions[name](...args);
    if (r && typeof r.then === 'function') r = await r;
    await new Promise(z => setTimeout(z, 250));
    return null;
  }, [name, args]);
}
const sheet = p => p.locator('.fixed.inset-0').last();
const txt = async loc => (await loc.innerText()).replace(/\s+/g, ' ');

/* no sideways scroll at phone width: the page, the open sheet's body, and no element sticking out of the screen */
async function noSide(t, page, label) {
  const r = await page.evaluate(() => {
    const vw = window.innerWidth, bad = [];
    const clipped = el => { for (let q = el.parentElement; q && q !== document.body; q = q.parentElement) { const s = getComputedStyle(q); if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) return true; } return false; };
    document.querySelectorAll('#root *').forEach(el => {
      const b = el.getBoundingClientRect(); if (!b.width || !b.height) return;
      if ((b.right > vw + 1 || b.left < -1) && !clipped(el)) {
        const c = typeof el.className === 'string' ? el.className : '';
        bad.push(el.tagName.toLowerCase() + '.' + c.slice(0, 40) + ' "' + (el.innerText || '').slice(0, 40).replace(/\s+/g, ' ') + '" ' + Math.round(b.left) + '..' + Math.round(b.right));
      }
    });
    const inner = [...document.querySelectorAll('.overflow-y-auto')].filter(el => el.scrollWidth > el.clientWidth + 1).map(el => el.scrollWidth + '>' + el.clientWidth);
    return { vw, sw: document.scrollingElement.scrollWidth, bad: bad.slice(0, 6), inner };
  });
  t.ok(r.sw <= r.vw && !r.bad.length && !r.inner.length, `${label}: no sideways scroll at ${r.vw} px` + (r.bad.length || r.inner.length || r.sw > r.vw ? ` (page ${r.sw}, sticking out: ${r.bad.join(' | ')}, sheet: ${r.inner.join(',')})` : ''));
}
/* screenshot a sheet with a tall phone viewport so the whole sheet shows */
async function tallShot(h, page, name) {
  const vp = page.viewportSize();
  await page.setViewportSize(TALL);
  await page.evaluate(() => document.querySelectorAll('.overflow-y-auto').forEach(el => { el.scrollTop = 0; }));
  await page.waitForTimeout(200);
  await h.check(page, name);
  await page.setViewportSize(vp);
  await page.waitForTimeout(150);
}
async function tab(page, label) {
  await page.locator('nav.zz-tabs button', { hasText: label }).first().click();
  await page.waitForTimeout(250);
}
const truckDoc = (o) => ({ carrier: 'Altex Transportation', driver: '', phone: '', trailer: '', direction: 'inbound', customerId: 'cu_altex', needsMatch: false, dock: null, stage: 'scheduled',
  arrivedAt: null, dockedAt: null, workStartedAt: null, workDoneAt: null, departedAt: null, sealIn: '', sealOut: '', sealVerified: null, notes: '', chat: [], instructions: '', workStartedBy: null, workDoneBy: null, ...o });
const loadDoc = (o) => ({ customerId: 'cu_altex', trailerOutId: null, units: { std: 8, lg: 0, crate: 0 }, exceptions: [], adjustments: [], chat: [], touches: [], corrections: [], lane: 'reno', status: 'staged', ...o });

H.main('b-client', async (h, t) => {
  const base = await h.baseDoc();
  const others = base.customers.filter(c => c.id !== 'cu_altex').map(c => c.name);

  /* ================= 1. booking: any time, busy day, load details, order, tracking, booked sheet ================= */
  t.section('booking at any time, busy day, loads, order, tracking, booked sheet');
  let bookedId = null, day = null;
  {
    day = addDays(dockYmd(Date.now()), 2);
    // other companies' trucks that day (8:30, 9:10 and 2:00 PM): the panel counts them and never names them
    const seed1 = clone(base);
    [['cu_pine', '08:30', 'zzb1'], ['cu_hdc', '09:10', 'zzb2'], ['zzc1', '14:00', 'zzb3']].forEach(([cid, hm, id]) =>
      seed1.trailers.push(truckDoc({ id, truck: id.toUpperCase(), customerId: cid, carrier: (base.customers.find(c => c.id === cid) || {}).name, scheduledAt: dockIso(day, hm) })));
    const p = await h.openAs('customer', { viewport: PHONE, seed: seed1 });
    await ready(p);
    t.ok(await calc(p, (hh, d, a) => hh.ZZdockParts(Date.now()).ymd === a, dockYmd(Date.now())), 'test fixture: dock day in Node matches the page');

    // pickups no longer pre-tick every floor load
    await p.getByRole('button', { name: 'Schedule a truck' }).first().click();
    await p.waitForTimeout(250);
    await sheet(p).getByRole('button', { name: /^Picking up from your dock/ }).click();
    await p.waitForTimeout(200);
    const ticks = await sheet(p).locator('.zz-pick input[type=checkbox]').evaluateAll(xs => [xs.length, xs.filter(x => x.checked).length]);
    t.ok(ticks[0] > 0 && ticks[1] === 0, `pickup form lists ${ticks[0]} floor loads and ticks none of them`);
    await sheet(p).getByRole('button', { name: /^Dropping off at your dock/ }).click();

    await p.fill('input[type=date]', day);
    await sheet(p).locator('input[type=time]').first().fill('08:15');
    await p.waitForTimeout(250);
    const busy = sheet(p).locator('[data-zzb=busy]');
    const bt = await txt(busy);
    const dl = await calc(p, (hh, d, a) => hh.ZZdayLoad(d, a), day);
    const rows = await busy.locator('.zzb-bk').evaluateAll(xs => xs.map(x => [x.classList.contains('me'), x.innerText.replace(/\s+/g, ' ')]));
    t.ok(rows.length === 8 && rows.every((r, k) => r[1].includes(dl.blocks[k].label) && r[1].includes(r[0] ? `${dl.blocks[k].trucks} + you` : `${dl.blocks[k].trucks} truck`)), 'busy-day panel shows a count for every 2-hour block (' + rows.map(r => r[1]).join(' / ') + ')');
    t.ok(rows.filter(r => r[0]).length === 1 && rows.find(r => r[0])[1].startsWith('8–10 AM') && rows[1][1].includes('2 + you') && rows[4][1].includes('1 truck'), 'the 8:15 booking highlights the 8–10 AM block (2 other trucks + you; 1 truck 2–4 PM)');
    t.ok(/forklift drivers? on shift · 8 doors · Other companies stay private/.test(bt) && /Estimate/.test(bt) && /(Light|Steady|Busy)/.test(bt), 'busy-day panel: crew on shift, doors, privacy line, "Estimate" in local mode');
    t.ok(!others.some(n => bt.includes(n)), 'busy-day panel shows no other company names (checked all ' + others.length + ')');

    // two loads with details, then put load 2 first
    await p.fill('input[placeholder="e.g. 112045"]', 'B-1');
    await p.fill('input[placeholder="0"]', '10');
    await p.fill('input[placeholder="e.g. 12000"]', '9000');
    await p.fill('input[placeholder="e.g. 40"]', '40');
    await sheet(p).getByRole('group', { name: 'Load 1 stackable' }).getByRole('button', { name: 'No', exact: true }).click();
    await sheet(p).getByLabel('Load 1 hazmat').check();
    await sheet(p).getByRole('button', { name: '+ Add another load' }).click();
    await p.waitForTimeout(150);
    await sheet(p).locator('input[placeholder="e.g. 112045"]').nth(1).fill('B-2');
    await sheet(p).locator('input[placeholder="0"]').nth(1).fill('6');
    await sheet(p).locator('input[placeholder="e.g. 12000"]').nth(1).fill('4000');
    await sheet(p).getByRole('group', { name: 'Load 2 stackable' }).getByRole('button', { name: 'Yes', exact: true }).click();
    await sheet(p).getByLabel('Unload in this order').check();
    await p.waitForTimeout(150);
    await sheet(p).getByRole('button', { name: 'Move load 2 up' }).click();
    await p.waitForTimeout(150);
    const order = await sheet(p).locator('input[placeholder="e.g. 112045"]').evaluateAll(xs => xs.map(x => x.value));
    t.eq(order, ['B-2', 'B-1'], 'the arrows reorder the load rows in the form');
    await sheet(p).getByLabel("Driver's language").selectOption('es');
    await p.fill('input[placeholder="e.g. 4521"]', '8815');

    // tracking: Samsara with an http:// link is refused
    await sheet(p).getByRole('button', { name: /^Samsara/ }).click();
    await sheet(p).locator('input[type=url]').fill('http://cloud.samsara.com/o/1/fleet/viewer/x');
    await p.waitForTimeout(150);
    t.ok((await txt(sheet(p))).includes('That link must start with https://'), 'an http:// share link is flagged in the form');
    await tallShot(h, p, 'client-form-390');
    await noSide(t, p, 'booking form');
    await sheet(p).getByRole('button', { name: 'Add to schedule' }).click();
    await p.waitForTimeout(400);
    let doc = await h.readDoc(p);
    t.ok(!doc.trailers.some(x => x.truck === '8815') && /https:\/\//.test(await txt(sheet(p).locator('[role=alert]'))), 'the booking is refused while the share link is http://');
    await sheet(p).locator('input[type=url]').fill('https://cloud.samsara.com/o/1/fleet/viewer/abc');
    await sheet(p).getByRole('button', { name: 'Add to schedule' }).click();
    await p.waitForTimeout(700);

    // booked sheet
    const bs = p.locator('[data-zzb=booked]');
    t.ok(await bs.count() === 1, 'the booked sheet opens after booking');
    const code = (await bs.locator('[data-zzb=code]').innerText()).trim();
    const link = (await bs.locator('.zzb-link').innerText()).trim();
    const bst = await txt(bs);
    t.ok(/^\d{4}$/.test(code) && link.endsWith('#eta' + code) && link.startsWith('https://claude.ai/artifact/'), `booked sheet: check-in code ${code} and a driver link ending in #eta${code}`);
    t.ok(bst.includes('Booked for') && bst.includes('8:15 AM') && bst.includes('dock time') && bst.includes("It's on our schedule") && /What happens next/.test(bst), 'booked sheet: "Booked for … 8:15 AM (dock time)", on the schedule (dispatch account), what happens next');
    t.ok(!/7788/.test(bst), 'booked sheet never shows the portal PIN');
    doc = await h.readDoc(p);
    const tr = doc.trailers.find(x => x.truck === '8815');
    bookedId = tr && tr.id;
    const want = await calc(p, (hh, d, a) => hh.ZZzonedIso(a[0], a[1]), [day, '08:15']);
    t.ok(tr && tr.bookedVia === 'client' && tr.bookedBy === 'Altex Transportation' && tr.code === code && tr.scheduledAt === want, 'truck saved with bookedVia client, bookedBy, the shown code, and 8:15 dock time');
    t.ok(tr.tracking === 'samsara' && tr.trackUrl === 'https://cloud.samsara.com/o/1/fleet/viewer/abc' && tr.driverLang === 'es' && tr.loadOrder === true, 'truck saved tracking samsara + https link, driver language es, loadOrder');
    const ls = doc.shipments.filter(x => x.trailerInId === tr.id).sort((a, b) => a.seq - b.seq);
    t.ok(ls.length === 2 && ls[0].ref === 'B-2' && ls[0].seq === 0 && ls[1].ref === 'B-1' && ls[1].seq === 1, 'load order saved: B-2 seq 0, B-1 seq 1');
    const b1 = ls[1], b2 = ls[0];
    t.ok(b1.weight === 9000 && b1.pieces === 40 && b1.stackable === false && b1.hazmat === true && b2.weight === 4000 && b2.stackable === true && b2.hazmat === false && b2.pieces === 0, 'weight, pieces, stackable and hazmat saved on the loads');
    // the sheet found the truck by the id the form chose (addTrailer used D.id): it shows the code, not "Saving…"
    t.ok(!bst.includes('Saving your booking'), 'the booked sheet found the truck by the id the form chose');

    await bs.getByRole('button', { name: /^Copy link/ }).click();
    await p.waitForTimeout(400);
    const cpt = await txt(bs);
    t.ok(/Copied|copy it by hand/.test(cpt), 'Copy link: copied, or the link is selected for copying by hand');
    await tallShot(h, p, 'client-booked-390');
    await noSide(t, p, 'booked sheet');
    await bs.getByRole('button', { name: 'Done', exact: true }).click();
    await p.waitForTimeout(250);
    t.ok((await txt(p.locator('.zz-week'))).includes('8:15 AM'), 'the schedule shows the truck at 8:15 AM');

    // truck sheet: live card, change only the day, trail
    await p.locator('.zz-ev', { hasText: '8:15 AM' }).first().click();
    await p.waitForTimeout(300);
    const ts = p.locator('[data-zzb=truck]');
    t.ok((await txt(ts)).includes('Appointment') && (await txt(ts)).includes('8:15 AM'), 'truck sheet shows the 8:15 AM appointment');
    t.ok(await ts.locator('.zzb-card .zzb-st > div').count() === 7, 'truck sheet: live card with the 7-step progress bar');
    await ts.locator('[data-zzb=time] input[type=date]').fill(addDays(day, 1));
    await p.waitForTimeout(200);
    await ts.getByRole('button', { name: /^Save new time/ }).click();
    await p.waitForTimeout(600);
    doc = await h.readDoc(p);
    const t2 = doc.trailers.find(x => x.id === bookedId);
    const want2 = await calc(p, (hh, d, a) => hh.ZZzonedIso(a[0], a[1]), [addDays(day, 1), '08:15']);
    t.ok(t2.scheduledAt === want2, 'changing only the day keeps 8:15 (dock time)');
    t.ok((t2.history || []).some(x => /^Time changed to .*8:15 AM/.test(x.text)) && (t2.chat || []).some(c => /^New time:/.test(c.text)), 'the time change is saved with zzLog (history) and a dock chat line');
    t.ok((await txt(ts.locator('[data-zzb=trail]'))).includes('Time changed to'), 'the time change shows in the load trail');

    // ETA chip
    await ts.locator('[data-zzb=eta]').getByRole('button', { name: '30 min', exact: true }).click();
    await p.waitForTimeout(500);
    doc = await h.readDoc(p);
    const t3 = doc.trailers.find(x => x.id === bookedId);
    t.ok(t3.eta && t3.eta.source === 'client' && Math.abs(Date.parse(t3.eta.at) - Date.now() - 30 * MIN) < 2 * MIN, 'an ETA chip sets eta.source client, about 30 min from now');

    // tracking edit: http:// refused, https:// saved
    await ts.locator('[data-zzb=eta]').getByRole('button', { name: 'Change', exact: true }).click();
    await p.waitForTimeout(200);
    await ts.locator('[data-zzb=eta] input[type=url]').fill('http://maps.example/abc');
    await ts.locator('[data-zzb=eta]').getByRole('button', { name: 'Save', exact: true }).click();
    await p.waitForTimeout(400);
    doc = await h.readDoc(p);
    t.ok(doc.trailers.find(x => x.id === bookedId).trackUrl === 'https://cloud.samsara.com/o/1/fleet/viewer/abc' && (await txt(ts.locator('[data-zzb=eta]'))).includes('That link must start with https://'), 'tracking edit: an http:// link is refused');
    await ts.locator('[data-zzb=eta] input[type=url]').fill('https://maps.app.goo.gl/abc123');
    await ts.locator('[data-zzb=eta]').getByRole('button', { name: 'Save', exact: true }).click();
    await p.waitForTimeout(500);
    doc = await h.readDoc(p);
    t.ok(doc.trailers.find(x => x.id === bookedId).trackUrl === 'https://maps.app.goo.gl/abc123' && (await ts.getByRole('link', { name: 'Open live map' }).count()) === 1, 'tracking edit: an https:// link is saved and "Open live map" shows');

    // loads table: weight, pills, order numbers; one load's trail
    await p.setViewportSize(DESK);
    await p.waitForTimeout(250);
    const lt = await txt(ts.locator('[data-zzb=loads] .zz-wide'));
    t.ok(/weight/i.test(lt) && lt.includes('9,000 lb') && lt.includes('Hazmat') && lt.includes('No stack') && /1\s*B-2/.test(lt) && /2\s*B-1/.test(lt), 'loads table: weight column, Hazmat and No stack pills, #1 B-2 then #2 B-1');
    await h.check(p, 'client-truck-1400');
    await p.setViewportSize(PHONE);
    await p.waitForTimeout(250);
    await tallShot(h, p, 'client-truck-390');
    await noSide(t, p, 'truck sheet');
    await ts.locator('[data-zzb=loads] .zz-narrow').getByRole('button', { name: 'Trail', exact: true }).first().click();
    await p.waitForTimeout(300);
    t.ok(await p.locator('[data-zzb=load-trail]').count() === 1, 'a load\'s "Trail" link opens that load\'s trail');
    await noSide(t, p, 'load trail sheet');
    await sheet(p).getByRole('button', { name: 'Close' }).click();
    await p.waitForTimeout(200);
    await sheet(p).getByRole('button', { name: 'Close' }).click();
    await p.waitForTimeout(200);
    await tab(p, 'Trucks');
    const row = await txt(p.locator('.zz-row', { hasText: 'Truck 8815' }).first());
    t.ok(/On the way, ETA \d/.test(row), 'the truck row reads "On the way, ETA …" (' + row + ')');
    await p.context().close();
  }

  /* ================= 2. late vs ETA ================= */
  t.section('ETA-aware status');
  {
    const now = Date.now(), seed = clone(base);
    seed.trailers.push(truckDoc({ id: 'tLate', truck: '7001', scheduledAt: iso(now - 2 * HOUR), code: '7101' }));
    seed.trailers.push(truckDoc({ id: 'tEta', truck: '7002', scheduledAt: iso(now - 2 * HOUR), code: '7102', eta: { at: iso(now + 40 * MIN), source: 'driver', updatedAt: iso(now - 5 * MIN), by: 'Driver', note: '' } }));
    const p = await h.openAs('customer', { viewport: PHONE, seed });
    await tab(p, 'Trucks');
    const rLate = await txt(p.locator('.zz-row', { hasText: 'Truck 7001' }).first()), rEta = await txt(p.locator('.zz-row', { hasText: 'Truck 7002' }).first());
    t.ok(/Late, hasn't checked in/.test(rLate), 'past the appointment with no ETA: "Late"');
    t.ok(/On the way, ETA/.test(rEta) && !/Late/.test(rEta), 'past the appointment but the ETA is still ahead: "On the way, ETA …", not "Late"');
    await p.context().close();
  }

  /* ================= 3. live card, place in line, done against the promise, done note ================= */
  t.section('live card, done note, this week');
  {
    const NOW = Date.now(), seed = clone(base);
    seed.trailers.forEach(x => { if (x.stage === 'arrived' && (!x.dock || x.dock === 'YD')) x.arrivedAt = iso(NOW - 5 * MIN); });
    seed.trailers.push(truckDoc({ id: 'tWait', truck: '7003', code: '7103', stage: 'arrived', dock: 'YD', scheduledAt: iso(NOW - 30 * MIN), arrivedAt: iso(NOW - 20 * MIN - 10e3), createdAt: iso(NOW - DAY) }));
    seed.trailers.push(truckDoc({ id: 'tDone', truck: '7004', code: '7104', stage: 'done', scheduledAt: iso(NOW - 2 * HOUR - 10 * MIN), arrivedAt: iso(NOW - 2 * HOUR), dockedAt: iso(NOW - 110 * MIN),
      workStartedAt: iso(NOW - 100 * MIN), workDoneAt: iso(NOW - 50 * MIN), workStartedBy: 'Roman', workDoneBy: 'Roman', afterPhotoCount: 2, beforePhotoCount: 1 }));
    seed.shipments.push(loadDoc({ id: 'sD1', ref: 'D-1', trailerInId: 'tDone', receivedAt: iso(NOW - 70 * MIN), receivedBy: 'Roman', qc: { condition: 'Good', counted: 8, note: '' } }));
    seed.shipments.push(loadDoc({ id: 'sW1', ref: 'W-1', trailerInId: 'tWait', status: 'expected' }));
    const ctx = await h.newContext({ viewport: PHONE, seed, now: NOW });
    const p = await h.openAs('customer', { context: ctx });
    await ready(p);
    const lv = await txt(p.locator('[data-zzb=live-now]'));
    t.ok(lv.includes('Waiting 20m') && lv.includes('#1 in line'), 'a truck checked in 20 minutes ago, waiting in the yard: "Waiting 20m" and "#1 in line"');
    t.ok(/about \d+ min until a door opens/.test(lv), 'the waiting truck shows the estimated wait');
    t.ok(lv.includes('Done in 1h 10m, within our 2-hour promise'), 'a done truck shows its time against the promise');
    t.ok(lv.includes('Unloading at door D1') && /left on our 2-hour promise/.test(lv), 'a working truck shows its door, clock and time left on the promise');
    const expect = 'Truck 7004 is done: 8 of 8 pallets, 3 photos, 0 damage reports. 1h 10m, within our 2-hour promise.';
    const note = p.locator('[data-zzb=done-note]');
    t.ok(await note.count() === 1 && (await txt(note)).includes(expect), 'done note: "' + expect + '"');
    const wk = await txt(p.locator('[data-zzb=week]'));
    const ws = await calc(p, (hh, d) => hh.ZZweek(d, 'cu_altex', Date.now()));
    t.ok(wk.includes('This week so far') && wk.includes(`${ws.done} done`) && wk.includes(`${ws.palletsIn} / ${ws.palletsOut}`) && wk.includes("We'll email this summary on Friday"), `"This week so far" matches ZZweek (${ws.trucks} trucks, ${ws.done} done, ${ws.palletsIn}/${ws.palletsOut} pallets)`);
    await h.check(p, 'client-schedule-390', { full: true });
    await noSide(t, p, 'Schedule tab with live cards');
    await note.getByRole('button', { name: 'Open' }).click();
    await p.waitForTimeout(300);
    const ds = await txt(p.locator('[data-zzb=done]'));
    t.ok(ds.includes('Unloaded: count and photos') && ds.includes('8 of 8 pallets on the BOL') && ds.includes('3 photos taken'), 'truck sheet Done section: counted against the BOL and the photo count');
    await tallShot(h, p, 'client-done-truck-390');
    await sheet(p).getByRole('button', { name: 'Close' }).click();
    await p.waitForTimeout(200);
    t.ok(await p.locator('[data-zzb=done-note]').count() === 0, 'the done note is gone once opened');
    const seen = await p.evaluate(() => localStorage.getItem('cd6:zzdone:cu_altex'));
    t.ok(seen && JSON.parse(seen).includes('tDone'), 'seen done notes are remembered on this device (cd6:zzdone:<cid>)');
    await p.reload();
    await h.waitLoaded(p);
    t.ok(await p.locator('[data-zzb=done-note]').count() === 0, 'the done note does not come back after a reload');
    await tab(p, 'Trucks');
    t.ok((await p.locator('.zz-panel', { hasText: 'At our dock now' }).locator('.zzb-card').count()) >= 2, 'Trucks tab: "At our dock now" uses the live cards');
    await h.check(p, 'client-trucks-390', { full: true });
    await noSide(t, p, 'Trucks tab');
    // the same screens on the office-size screen
    const q = await h.openAs('customer', { viewport: DESK, seed, now: NOW });
    await h.check(q, 'client-schedule-1400', { full: true });
    await tab(q, 'Trucks');
    await h.check(q, 'client-trucks-1400');
    await q.context().close();
    await ctx.close();
  }

  /* ================= 4. damage: photos, pallets and kinds, no double rewrap, monthly history ================= */
  t.section('damage tab');
  {
    const NOW = Date.now(), seed = clone(base);
    const L = ref => seed.shipments.find(s => s.ref === ref), t221 = seed.trailers.find(x => x.truck === '221').id;
    L('111927').exceptions.push({ id: 'x1', kind: 'Damage', note: '2 pallets · Crushed, Torn wrap · forks hit the corner', at: iso(NOW - HOUR), openedBy: 'Roman', resolved: false, pallets: 2, kinds: ['Crushed', 'Torn wrap'],
      what: 'forks hit the corner', photoOwner: 'dmg:x1', photoCount: 2, est: { lines: [{ id: 'l1', label: 'Rewrap pallet', qty: 2, unit: 15 }, { id: 'l2', label: 'Labor, 1 hour', qty: 0.5, unit: 120 }], sentAt: iso(NOW - HOUR) }, answer: null });
    // a load whose first damage report already charges the rewrap: the automatic rewrap line must not be added again
    seed.shipments.push(loadDoc({ id: 'sR', ref: 'RW-1', trailerInId: t221, receivedAt: iso(NOW - 2 * HOUR), rewrapPallets: 2,
      exceptions: [{ id: 'xr', kind: 'Damage', note: 'rewrap test', at: iso(NOW - 90 * MIN), openedBy: 'Roman', resolved: false, est: { lines: [{ id: 'r1', label: 'Rewrap pallet', qty: 2, unit: 15 }], sentAt: iso(NOW - 90 * MIN) }, answer: null }] }));
    L('111882').exceptions.push({ id: 'xm1', kind: 'Damage', note: 'older one', at: iso(NOW - 40 * DAY), openedBy: 'Dock', resolved: true, pallets: 1, kinds: ['Wet'], answer: { status: 'accepted', by: 'Pat', at: iso(NOW - 40 * DAY), total: 15 } });
    L('111950').exceptions.push({ id: 'xm2', kind: 'Damage', note: 'oldest one', at: iso(NOW - 75 * DAY), openedBy: 'Dock', resolved: true, pallets: 3, kinds: ['Leaning'], answer: { status: 'declined', by: 'Pat', at: iso(NOW - 75 * DAY), total: 45, note: 'came that way' } });
    L('111950').exceptions.push({ id: 'xs', kind: 'Short', note: 'short one pallet', at: iso(NOW - 3 * DAY), openedBy: 'Dock', resolved: true });
    const p = await h.openAs('customer', { viewport: PHONE, seed });
    await ready(p);
    await p.evaluate(src => window.__zz.h.photos.ex('dmg:x1', [{ id: 'p1', src, at: new Date().toISOString(), by: 'Roman' }, { id: 'p2', src, at: new Date().toISOString(), by: 'Roman' }]), PNG);
    await tab(p, 'Damage');
    await p.waitForTimeout(400);
    const card = p.locator('[data-zzb=dmg-card]', { hasText: 'forks hit the corner' }).first();
    t.ok(await card.locator('img').count() === 2, 'a damage card shows the dmg: photos (2)');
    const ct = await txt(card);
    t.ok(ct.includes('2 pallets hurt') && ct.includes('Crushed') && ct.includes('Torn wrap') && /damage photos/i.test(ct), 'a damage card shows pallets and kinds');
    const rc = await txt(p.locator('[data-zzb=dmg-card]', { hasText: 'rewrap test' }).first());
    t.ok(rc.includes('$30.00') && !rc.includes('$60.00'), 'the automatic rewrap line is not added when the fix lines already charge a rewrap ($30, not $60)');
    const months = await calc(p, (hh, d) => hh.ZZdmgMonths(d, 'cu_altex').map(g => ({ month: g.month, reports: g.reports, pallets: g.pallets })));
    const shown = await p.locator('[data-zzb=month] > summary').evaluateAll(xs => xs.map(x => x.innerText.replace(/\s+/g, ' ')));
    t.ok(months.length >= 3 && shown.length === months.length && months.every((g, k) => shown[k].includes(`${g.reports} report`) && shown[k].includes(`${g.pallets} pallet`)), 'damage history groups reports by month (' + shown.join(' | ') + ')');
    t.ok(!(await txt(p.locator('main'))).includes('short one pallet') || (await txt(p.locator('main'))).includes('Other closed reports'), 'closed reports that are not damage stay listed under "Other closed reports"');
    const tm = await txt(p.locator('[data-zzb=dmg-month]'));
    t.ok(tm.startsWith('This month') && tm.includes(String(months[0].reports)), '"This month" summary at the top');
    await p.locator('[data-zzb=month]').nth(1).locator('summary').click();
    await p.waitForTimeout(200);
    await p.locator('[data-zzb=month]').nth(1).locator('.zzb-mr').first().click();
    await p.waitForTimeout(250);
    t.ok(await p.locator('[data-zzb=month]').nth(1).locator('[data-zzb=dmg-card]').count() === 1, 'a history row opens the full report');
    await h.check(p, 'client-damage-390', { full: true });
    await noSide(t, p, 'Damage tab');
    await p.context().close();
  }

  /* ================= 5. Pine Ridge: auto-approve keeps rates, request pending, weight flows to inventory ================= */
  t.section('auto-approve setting, pending request, weights');
  {
    const seed = clone(base);
    const p = await h.openAs('customer', { viewport: PHONE, seed, name: 'Pine Ridge', pin: '1357' });
    await ready(p);
    await p.getByRole('button', { name: 'Alerts and settings' }).click();
    await p.waitForTimeout(250);
    const al = p.locator('[data-zzb=alerts]');
    t.ok(await al.locator('input[value="ops@pineridge.example"]').count() === 1, 'alerts sheet starts with a contact built from the account (email)');
    await al.getByLabel('Auto-approve damage fixes under this many dollars').fill('100');
    await al.getByRole('button', { name: 'Save', exact: true }).click();
    await p.waitForTimeout(500);
    let doc = await h.readDoc(p);
    const pine = doc.customers.find(c => c.id === 'cu_pine');
    t.ok(pine.autoApproveUnder === 100 && JSON.stringify(pine.rates) === JSON.stringify({ storageMonthly: 20 }) && pine.pin === '1357' && pine.name === 'Pine Ridge Freight', 'auto-approve under $100 saved; customer.rates, PIN and name unchanged');
    t.ok(pine.fridaySummary === true && pine.contacts.length === 1 && pine.contacts[0].id && pine.contacts[0].email === 'ops@pineridge.example', 'Friday summary on and the contact saved with an id');
    await sheet(p).getByRole('button', { name: 'Close', exact: true }).last().click();
    await p.waitForTimeout(200);
    await tab(p, 'Bills');
    await p.getByText('How billing works').click();
    await p.waitForTimeout(150);
    t.ok((await txt(p.locator('main'))).includes('under $100 (your auto-approve setting)'), 'Bills: the damage note mentions the auto-approve setting');
    await tab(p, 'Inventory');
    const tile0 = await txt(p.locator('.zz-stat', { hasText: 'Weight on our floor' }));
    t.ok(/weight on our floor\s*0\b/i.test(tile0), 'Pine Ridge starts with 0 lb on our floor');
    await p.getByRole('button', { name: 'Schedule a truck' }).first().click().catch(async () => { await tab(p, 'Schedule'); await p.getByRole('button', { name: 'Schedule a truck' }).first().click(); });
    await p.waitForTimeout(250);
    await p.fill('input[type=date]', addDays(await calc(p, hh => hh.ZZdockParts(Date.now()).ymd), 1));
    await sheet(p).locator('input[type=time]').first().fill('09:30');
    await p.fill('input[placeholder="e.g. 112045"]', 'PR-B1');
    await p.fill('input[placeholder="0"]', '5');
    await p.fill('input[placeholder="e.g. 12000"]', '7000');
    await sheet(p).getByRole('button', { name: 'Send request' }).click();
    await p.waitForTimeout(700);
    const bt = await txt(p.locator('[data-zzb=booked]'));
    t.ok(bt.includes('Request sent') && bt.includes('Waiting for our OK') && bt.includes('9:30 AM'), 'a non-dispatch account sees "Request sent" and "Waiting for our OK"');
    await sheet(p).getByRole('button', { name: 'Done', exact: true }).click();
    await tab(p, 'Inventory');
    t.ok((await txt(p.locator('main'))).includes('7,000 lb'), 'the booked weight shows in "On trucks coming to us"');
    doc = await h.readDoc(p);
    const sid = doc.shipments.find(s => s.ref === 'PR-B1').id;
    await act(p, 'patchShipment', sid, { receivedAt: new Date().toISOString(), status: 'staged' });   // the crew receives it
    await p.waitForTimeout(300);
    const tile1 = await txt(p.locator('.zz-stat', { hasText: 'Weight on our floor' }));
    t.ok(/7,000/.test(tile1), 'after the load is received the Inventory weight tile is no longer 0 (7,000)');
    await tab(p, 'Trucks');
    t.ok(/Requested, waiting for our OK/.test(await txt(p.locator('main'))), 'the truck row says the request waits for our OK');
    await p.context().close();
  }

  /* ================= 6. securement, our gear, plan interest, driver link for an old truck ================= */
  t.section('secured section, gear, securement plan, driver link');
  {
    const NOW = Date.now(), seed = clone(base);
    seed.trailers.push(truckDoc({ id: 'tSec', truck: '7005', code: '7105', direction: 'outbound', stage: 'departed', scheduledAt: iso(NOW - 4 * HOUR), arrivedAt: iso(NOW - 3 * HOUR), dockedAt: iso(NOW - 175 * MIN),
      workStartedAt: iso(NOW - 170 * MIN), workDoneAt: iso(NOW - 2 * HOUR), departedAt: iso(NOW - 100 * MIN), sealOut: 'SL-555', afterPhotoCount: 2,
      secure: { gear: { plywood: { qty: 6, owner: 'ours' }, bars: { qty: 2, owner: 'ours' }, straps: { qty: 4, owner: 'driver' }, airbags: { qty: 0, owner: 'ours' } }, tags: ['B-104', 'B-105'], seal: 'SL-555',
        photos: { nose: 1, middle: 1, tail: 1, closeup: 1, seal: 1 }, confidence: 4, note: '', checkedRows: true, signature: 'Roman', signedBy: 'Roman', signedAt: iso(NOW - 2 * HOUR - 5 * MIN) } }));
    seed.zzGear = [
      { id: 'g1', customerId: 'cu_altex', trailerId: 'tSec', type: 'plywood', qty: 6, dir: 'out', tags: [], at: iso(NOW - 2 * HOUR), by: 'Roman', note: '', src: 'secure' },
      { id: 'g2', customerId: 'cu_altex', trailerId: 'tSec', type: 'bars', qty: 2, dir: 'out', tags: ['B-104', 'B-105'], at: iso(NOW - 2 * HOUR), by: 'Roman', note: '', src: 'secure' },
      { id: 'g3', customerId: 'cu_altex', trailerId: null, type: 'plywood', qty: 2, dir: 'back', tags: [], at: iso(NOW - HOUR), by: 'Roman', note: 'came back on 23N', src: 'return' },
      { id: 'g4', customerId: 'cu_pine', trailerId: null, type: 'straps', qty: 9, dir: 'out', tags: ['P-1'], at: iso(NOW - HOUR), by: 'Roman', note: '', src: 'manual' }];
    const p = await h.openAs('customer', { viewport: PHONE, seed });
    await ready(p);
    await tab(p, 'Inventory');
    const g = await calc(p, (hh, d) => hh.ZZgearOut(d, 'cu_altex'));
    const tiles = await p.locator('[data-zzb=gear] .zzb-g4 > div').evaluateAll(xs => xs.map(x => x.querySelector('b').innerText.trim()));
    const gt = await txt(p.locator('[data-zzb=gear]'));
    t.eq(tiles, [g.plywood, g.bars, g.straps, g.airbags].map(String), `"Our gear with you" totals match ZZgearOut (${tiles.join('/')})`);
    t.ok(gt.includes('B-104') && gt.includes('B-105') && !gt.includes('P-1') && (await p.locator('[data-zzb=gear] .zz-row').count()) === 3, 'gear panel: tag chips and the last moves (only this customer\'s)');
    const pc = p.locator('[data-zzb=plan]');
    t.ok((await txt(pc)).includes('$2,000 per 6 months'), 'securement plan card shows $2,000 per 6 months (from ZZS().gearPlan)');
    await h.check(p, 'client-inventory-390', { full: true });
    await noSide(t, p, 'Inventory tab');
    await pc.getByRole('button', { name: "I'm interested" }).click();
    await p.waitForTimeout(500);
    let doc = await h.readDoc(p);
    const al = doc.customers.find(c => c.id === 'cu_altex');
    t.ok(al.securementInterest && !isNaN(Date.parse(al.securementInterest)) && al.securementInterestBy && al.rates === null, '"I\'m interested" sets securementInterest (rates untouched)');
    t.ok((doc.accountChat.cu_altex || []).some(m => /securement plan/.test(m.text)) && (await txt(pc)).includes("We'll call you"), 'an account-chat note goes to the office and the card says "We\'ll call you"');

    await tab(p, 'Trucks');
    await p.getByRole('button', { name: /Past trucks/ }).click();
    await p.waitForTimeout(200);
    await p.locator('.zz-row', { hasText: 'Truck 7005' }).first().click();
    await p.waitForTimeout(300);
    const sec = await txt(p.locator('[data-zzb=secured]'));
    t.ok(sec.includes('Loaded and secured') && sec.includes('4 of 5') && sec.includes('Solid') && sec.includes('Seal SL-555') && sec.includes('Ours (24 HR)') && sec.includes("Driver's") && sec.includes('B-104') && sec.includes('Signed by Roman'), 'the secured section shows when trailer.secure is set (gear ours/driver\'s, tags, seal, confidence, signed by)');
    t.ok(await p.locator('[data-zzb=secured] .zzb-bars i').count() === 5 && await p.locator('[data-zzb=eta]').count() === 0 && await p.locator('[data-zzb=driver-link]').count() === 0, 'confidence bars; a truck that left has no ETA box or driver link');
    await tallShot(h, p, 'client-secured-390');
    await noSide(t, p, 'secured truck sheet');
    await sheet(p).getByRole('button', { name: 'Close' }).click();
    await p.waitForTimeout(200);

    // an older truck has no code yet: "Make a driver link"
    await tab(p, 'Schedule');
    await p.getByText('Truck 30N').first().click();
    await p.waitForTimeout(300);
    const dlk = p.locator('[data-zzb=driver-link]');
    t.ok((await txt(dlk)).includes('Make a driver link'), 'an older truck offers "Make a driver link"');
    await dlk.getByRole('button', { name: 'Make a driver link' }).click();
    await p.waitForTimeout(500);
    doc = await h.readDoc(p);
    const c30 = doc.trailers.find(x => x.truck === '30N').code;
    t.ok(/^\d{4}$/.test(c30) && (await txt(dlk)).includes('#eta' + c30), `zzEnsureCode gave truck 30N code ${c30} and its driver link shows`);
    await p.context().close();
  }

  /* ================= 7. alerts: a contact with "done: text" gets an Outbox text (checked from the office) ================= */
  t.section('alerts and settings -> office Outbox');
  {
    const NOW = Date.now(), seed = clone(base);
    seed.trailers.push(truckDoc({ id: 'tM', truck: '4521', code: '6006', stage: 'done', scheduledAt: iso(NOW - 2 * HOUR), arrivedAt: iso(NOW - 80 * MIN), dockedAt: iso(NOW - 75 * MIN),
      workStartedAt: iso(NOW - 70 * MIN), workDoneAt: iso(NOW - 10 * MIN), afterPhotoCount: 3, createdAt: iso(NOW - DAY) }));
    seed.shipments.push(loadDoc({ id: 'sM', ref: 'M-1', trailerInId: 'tM', units: { std: 22, lg: 0, crate: 0 }, receivedAt: iso(NOW - 60 * MIN), qc: { condition: 'Good', counted: 22, note: '' }, photoCount: 3 }));
    const ctx = await h.newContext({ viewport: PHONE, seed });
    const p = await h.openAs('customer', { context: ctx });
    await ready(p);
    await p.getByRole('button', { name: 'Alerts and settings' }).click();
    await p.waitForTimeout(250);
    const al = p.locator('[data-zzb=alerts]');
    t.ok(await al.locator('input[value="dispatch@altex.example"]').count() === 1 && await al.locator('input[value="775-555-0100"]').count() === 1, 'no contacts yet: the list starts with one built from the account (email and phone)');
    t.ok(await al.locator('table.zzb-alt tbody tr').first().locator('input[type=checkbox]').count() === 2 && await al.locator('table.zzb-alt tbody tr').count() === 9, 'events x Text/Email grid (9 events, 2 boxes each)');
    await al.getByRole('button', { name: '+ Add a contact' }).click();
    await p.waitForTimeout(150);
    const c2 = al.locator('[data-zzb=contact]').nth(1);
    await c2.getByLabel('Name').fill('Dana Dispatch');
    await c2.getByLabel('Cell (for texts)').fill('775-555-0199');
    await c2.getByLabel('Text Dana Dispatch: Done, with photos').check();
    await p.waitForTimeout(150);
    t.ok((await txt(c2)).includes('Add an email so emails can reach Dana Dispatch'), 'a contact with email alerts but no email gets a plain warning');
    await tallShot(h, p, 'client-alerts-390');
    await noSide(t, p, 'alerts sheet');
    await al.getByRole('button', { name: 'Save', exact: true }).click();
    await p.waitForTimeout(500);
    let doc = await h.readDoc(p);
    const alx = doc.customers.find(c => c.id === 'cu_altex');
    const dana = (alx.contacts || []).find(c => c.name === 'Dana Dispatch');
    t.ok(alx.contacts.length === 2 && dana && dana.id && dana.phone === '775-555-0199' && dana.alerts.done.text === true && alx.rates === null && alx.autoApproveUnder === null, 'contacts saved with zzCustomer (Dana: done by text); rates untouched; auto-approve blank = never');
    t.ok((await txt(al)).includes('Saved'), 'the sheet says Saved');
    await sheet(p).getByRole('button', { name: 'Close', exact: true }).last().click();
    await tab(p, 'Messages');
    t.ok(await p.getByRole('button', { name: 'Alerts & settings' }).count() === 1, 'Messages has an "Alerts & settings" button too');
    // the office, on the same device (same stored data): sign the customer out first
    await p.getByRole('button', { name: 'Sign out' }).click();
    await p.waitForTimeout(300);
    const q = await h.openAs('office', { context: ctx, viewport: DESK });
    await ready(q);
    const ob = await calc(q, (hh, d) => hh.pQ(d, Date.now()).filter(m => m.event === 'done' && m.channel === 'sms' && m.to === '775-555-0199').map(m => m.body));
    t.ok(ob.length === 1 && /Truck 4521 is done/.test(ob[0]), 'the office Outbox lists a done text to Dana (775-555-0199)');
    await q.getByRole('button', { name: 'Setup' }).click();
    await q.waitForTimeout(400);
    t.ok((await h.text(q)).includes('775-555-0199'), 'office Setup → Outbox shows the text to 775-555-0199');
    await ctx.close();
  }

  /* ================= 8. every tab at 390 and 1400 ================= */
  t.section('every tab: no sideways scroll at 390, screenshots');
  {
    const p = await h.openAs('customer', { viewport: PHONE, seed: clone(base) });
    for (const [k, label] of [['schedule', 'Schedule'], ['trucks', 'Trucks'], ['floor', 'Inventory'], ['requests', 'Requests'], ['damage', 'Damage'], ['bills', 'Bills'], ['chat', 'Messages']]) {
      await tab(p, label);
      await noSide(t, p, `${label} tab`);
      await h.check(p, `client-tab-${k}-390`, { full: true });
    }
    await p.getByRole('button', { name: 'Alerts and settings' }).click();
    await p.waitForTimeout(200);
    await noSide(t, p, 'alerts sheet (from the header)');
    await p.context().close();
    const q = await h.openAs('customer', { viewport: DESK, seed: clone(base) });
    for (const [k, label] of [['floor', 'Inventory'], ['damage', 'Damage']]) { await tab(q, label); await h.check(q, `client-tab-${k}-1400`, { full: true }); }
    await q.getByRole('button', { name: 'Schedule a truck' }).first().click().catch(async () => { await tab(q, 'Schedule'); await q.getByRole('button', { name: 'Schedule a truck' }).first().click(); });
    await q.waitForTimeout(250);
    await h.check(q, 'client-form-1400');
    await q.context().close();
  }
});
