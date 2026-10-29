/* End to end: one load's whole day across every role, in ONE build (the integration check).
     node website/portal/test/run.js e2e [--dist DIR]
   LOCAL MODE (part 1): every page opens in ONE browser context, so they share localStorage: one device that
   switches roles (customer, office, driver page, kiosk, crew, TV). Each role gets a new page (ZZSign reads the hash
   once when it mounts) and the sign-in session is cleared first. The context runs a fixed dock clock (page.clock):
   the next weekday 11:00 AM dock time (Pacific). The demo doc of today's live build is moved in time to that clock,
   so Nick's demo trucks sit at the doors and in the yard as he sees them. Altex is made a non-dispatch account here,
   so its booking needs the office's OK (dispatch bookings go straight on the schedule and never ring the bell).
   SHARED MODE (part 2): mock database, pages = devices (staff only), plus a customer page without db.
   Every step checks the saved data AND the screen. Screenshots: <shots>/e2e-*.png */
process.env.SHOT_PREFIX = process.env.SHOT_PREFIX || 'e2e';
const H = require('./harness');
const { PHONE, DESK, TABLET } = H;

const MIN = 6e4, HOUR = 36e5, DAY = 864e5;
const TZ = 'America/Los_Angeles';
const iso = ms => new Date(ms).toISOString();
const norm = s => String(s || '').replace(/[\u00a0\u202f\u2009]/g, ' ').replace(/\s+/g, ' ').trim();
const RGB = { red: 'rgb(192, 57, 43)', amber: 'rgb(183, 121, 31)', green: 'rgb(30, 138, 90)', orange: 'rgb(169, 90, 36)' };
const TALL = { width: 390, height: 3200 };

/* ---------- dock time in Node ---------- */
const dockParts = ms => Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' })
  .formatToParts(new Date(ms)).map(x => [x.type, x.value]));
const hm = ms => new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }).format(new Date(ms)).replace(/\u202f/g, ' ');
const dockYmd = ms => { const p = dockParts(ms); return `${p.year}-${p.month}-${p.day}`; };
const dockIso = (ymd, hm) => { const want = Date.parse(ymd + 'T' + hm + ':00Z'); let g = want;
  for (let k = 0; k < 3; k++) { const p = dockParts(g); const got = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute); if (got === want) break; g += want - got; } return g; };
/* the next weekday (Mon-Fri) 11:00 AM dock time that is still ahead */
function nextWeekday11() {
  for (let d = 0; d < 8; d++) {
    const ymd = dockYmd(Date.now() + d * DAY), ms = dockIso(ymd, '11:00');
    if (ms > Date.now() + 5 * MIN && !['Sat', 'Sun'].includes(dockParts(ms).weekday)) return ms;
  }
  throw new Error('no weekday 11:00');
}
/* move every ISO time in the demo doc by dt (keeps Nick's demo as it is, at the test clock) */
function shiftDoc(doc, dt) {
  const re = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
  const walk = v => Array.isArray(v) ? v.map(walk) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]))
    : typeof v === 'string' && re.test(v) ? iso(Date.parse(v) + dt) : v;
  return walk(doc);
}

/* ---------- page helpers ---------- */
async function ready(p) { await p.waitForFunction(() => window.__zz && window.__zz.actions && window.__zz.h, null, { timeout: 15000 }); }
async function act(p, name, ...args) {
  return p.evaluate(async ([name, args]) => {
    const f = window.__zz.actions[name];
    if (typeof f !== 'function') throw new Error('no action ' + name);
    let r = f(...args);
    if (r && typeof r.then === 'function') r = await r;
    await new Promise(z => setTimeout(z, 250));
    return r && typeof r === 'object' && Array.isArray(r.trailers) ? { __doc: true } : (r === undefined ? null : r);
  }, [name, args]);
}
async function calc(p, fn, a) {
  return p.evaluate(([src, a]) => { const f = (0, eval)('(' + src + ')'); const raw = localStorage.getItem('cdweb:cd6:doc'); return f(window.__zz.h, raw ? JSON.parse(raw) : null, a); },
    [fn.toString(), a === undefined ? null : a]);
}
const txt = async loc => norm(await loc.innerText());
const sheet = p => p.locator('.fixed.inset-0').last();
const wait = (p, ms) => p.waitForTimeout(ms || 350);
const T = (doc, id) => doc.trailers.find(x => x.id === id);
const S = (doc, id) => doc.shipments.find(x => x.id === id);
const fe2 = s => { const u = (s && s.units) || {}; return (+u.std || 0) + (+u.lg || 0) + (+u.crate || 0); };
/* the crew truck's step bar (titles), a step button, and waiting for a camera count */
const stepNames = p => p.$$eval('div[style*="sticky"] button[title]', bs => bs.map(b => b.title));
const step = async (p, label) => { await p.getByRole('button', { name: label, exact: true }).first().click(); await p.waitForTimeout(400); };
const countIs = (p, sel, n) => p.waitForFunction(([s, n]) => { const el = document.querySelector(s); return el && el.innerText.trim() === String(n); }, [sel, n], { timeout: 6000 });

H.main('e2e-day', async (h, t) => {
  const NOW = nextWeekday11();
  const TODAY = dockYmd(NOW);
  const base = await h.baseDoc();
  const seed = shiftDoc(base, NOW - Date.parse(base.touchedAt));
  seed.customers.find(c => c.id === 'cu_altex').dispatch = false;
  console.log('# test clock: ' + iso(NOW) + ' (' + TODAY + ' 11:00 dock time); demo moved by ' + Math.round((NOW - Date.parse(base.touchedAt)) / MIN) + ' min');

  const ctx = await h.newContext({ viewport: PHONE, seed, now: NOW, timezoneId: TZ });
  /* one device switching roles: forget the last sign-in, close the other pages, open the next role */
  async function fresh() {
    for (const pg of ctx.pages()) await pg.close();
    const q = await ctx.newPage();
    await q.goto(h.origin + '/blank');
    await q.evaluate(() => localStorage.removeItem('cd6:session'));
    await q.close();
  }
  async function as(role, viewport, o = {}) {
    await fresh();
    const p = await h.openAs(role, { context: ctx, viewport: viewport || PHONE, ...o });
    if (role === 'crew') { const got = p.getByRole('button', { name: /^(Got it|Entendido|Понятно)$/ }); if (await got.count()) await got.first().click(); }
    await ready(p);
    return p;
  }
  async function page(hash, viewport) {
    await fresh();
    const p = await h.open(hash, { context: ctx, viewport: viewport || PHONE });
    await ready(p);
    return p;
  }
  /* sheet screenshot with a tall phone viewport so the whole sheet shows */
  async function tallShot(p, name) {
    const vp = p.viewportSize();
    await p.setViewportSize(TALL);
    await p.evaluate(() => document.querySelectorAll('.overflow-y-auto').forEach(el => { el.scrollTop = 0; }));
    await wait(p, 250);
    await h.check(p, name);
    await p.setViewportSize(vp);
    await wait(p, 150);
  }

  let TID = null, CODE = null, L1 = null, L2 = null;

  /* ================= a) customer books a drop truck at 2:17 PM ================= */
  t.section('a) customer (Altex 7788) books a drop truck for today at 2:17 PM dock time');
  {
    const p = await as('customer');
    await p.getByRole('button', { name: 'Schedule a truck' }).first().click();
    await wait(p, 300);
    const f = sheet(p);
    await f.locator('input[type=date]').fill(TODAY);
    await f.locator('input[type=time]').first().fill('14:17');
    await f.getByRole('button', { name: /^Dropping off at your dock/ }).click();
    await f.locator('input[placeholder="e.g. 112045"]').first().fill('E2E-A');
    await f.locator('input[placeholder="0"]').first().fill('12');
    await f.locator('input[placeholder="e.g. 12000"]').first().fill('9000');
    await f.locator('input[placeholder="e.g. 40"]').first().fill('40');
    await f.getByRole('group', { name: 'Load 1 stackable' }).getByRole('button', { name: 'No', exact: true }).click();
    await f.getByRole('button', { name: '+ Add another load' }).click();
    await wait(p, 150);
    await f.locator('input[placeholder="e.g. 112045"]').nth(1).fill('E2E-B');
    await f.locator('input[placeholder="0"]').nth(1).fill('8');
    await f.locator('input[placeholder="e.g. 12000"]').nth(1).fill('4000');
    await f.locator('input[placeholder="e.g. 40"]').nth(1).fill('16');
    await f.getByRole('group', { name: 'Load 2 stackable' }).getByRole('button', { name: 'Yes', exact: true }).click();
    await f.getByLabel('Load 2 hazmat').check();
    await f.getByLabel('Unload in this order').check();
    await f.getByRole('button', { name: /^Send my driver a link/ }).click();
    await f.getByLabel("Driver's language").selectOption('ru');
    await f.locator('input[placeholder="e.g. 4521"]').fill('4417');
    await f.locator('input[placeholder="e.g. T880"]').fill('T417');
    const ft = await txt(f);
    t.ok(/2 loads on this trailer/.test(ft) && /20 pallets · 13,000 lb/.test(ft), 'form totals: 2 loads, 20 pallets, 13,000 lb');
    t.ok(!/after-hours fee/.test(ft), '2:17 PM on a weekday: no after-hours fee');
    await tallShot(p, 'a-form-390');
    await f.getByRole('button', { name: 'Send request' }).click();
    await wait(p, 700);

    const bs = p.locator('[data-zzb=booked]');
    t.ok(await bs.count() === 1, 'the booked sheet opens');
    CODE = (await bs.locator('[data-zzb=code]').innerText()).trim();
    const link = (await bs.locator('.zzb-link').innerText()).trim();
    const bst = await txt(bs);
    t.ok(/^\d{4}$/.test(CODE) && link === 'https://claude.ai/artifact/97haWKtJGFGXW8PjdM9XWv#eta' + CODE, `booked sheet: 4-digit code ${CODE} and the driver link ${link}`);
    t.ok(/Booked for .*2:17 PM \(dock time\)/.test(bst) && bst.includes('Waiting for our OK') && !bst.includes('7788'), 'booked sheet: "Booked for … 2:17 PM (dock time)", "Waiting for our OK", never the PIN');
    await bs.getByRole('button', { name: /^Copy link/ }).click();
    await wait(p, 400);
    const sel = await p.evaluate(() => String(window.getSelection() || ''));
    const cpt = await txt(bs);
    t.ok(/Copied/.test(cpt) || (/copy it by hand/.test(cpt) && sel.includes('#eta' + CODE)), 'Copy link: copied, or the link text is selected to copy by hand (' + (/Copied/.test(cpt) ? 'copied' : 'selected: ' + sel) + ')');
    await tallShot(p, 'a-booked-390');

    const d = await h.readDoc(p);
    const tr = d.trailers.find(x => x.truck === '4417');
    TID = tr && tr.id;
    t.ok(tr && tr.code === CODE && tr.bookedVia === 'client' && tr.bookedBy && tr.direction === 'inbound' && tr.customerId === 'cu_altex' && tr.stage === 'scheduled', 'saved: truck 4417, inbound, Altex, bookedVia client, the shown code');
    t.eq(tr.scheduledAt, iso(dockIso(TODAY, '14:17')), 'saved: scheduledAt is 2:17 PM dock time');
    t.ok(tr.tracking === 'link' && tr.trackUrl === '' && tr.driverLang === 'ru' && tr.loadOrder === true && !tr.confirmedAt && /Requested by customer/.test(tr.notes) && tr.createdAt === iso(Date.parse(tr.createdAt)), 'saved: tracking = driver link, driver language Russian, load order on, not confirmed yet');
    const ls = d.shipments.filter(s => s.trailerInId === TID).sort((a, b) => a.seq - b.seq);
    L1 = ls[0] && ls[0].id; L2 = ls[1] && ls[1].id;
    t.ok(ls.length === 2 && ls[0].ref === 'E2E-A' && ls[0].seq === 0 && ls[1].ref === 'E2E-B' && ls[1].seq === 1, 'saved: 2 loads in order (E2E-A seq 0, E2E-B seq 1)');
    t.ok(ls[0].units.std === 12 && ls[0].weight === 9000 && ls[0].pieces === 40 && ls[0].stackable === false && ls[0].hazmat === false
      && ls[1].units.std === 8 && ls[1].weight === 4000 && ls[1].pieces === 16 && ls[1].stackable === true && ls[1].hazmat === true, 'saved: pallets, weight, pieces, no-stack (E2E-A) and hazmat (E2E-B) on the loads');
    await bs.getByRole('button', { name: 'See this truck' }).click();
    await wait(p, 400);
    // the customer moves the time once (2:17 -> 2:47 PM): the trail must keep the ORIGINAL booked time
    const ts = p.locator('[data-zzb=truck]');
    await ts.locator('[data-zzb=time] input[type=time]').fill('14:47');
    await ts.getByRole('button', { name: /^Save new time/ }).click();
    await wait(p, 600);
    const d2 = await h.readDoc(p), t2 = T(d2, TID);
    t.ok(t2.scheduledAt === iso(dockIso(TODAY, '14:47')) && t2.bookedFor === iso(dockIso(TODAY, '14:17')), 'the customer moves it to 2:47 PM; bookedFor keeps the original 2:17 PM');
    const lt = await txt(ts.locator('[data-zzb=loads] .zz-narrow'));
    t.ok(/E2E-A[\s\S]*E2E-B/.test(lt) && /No stack/.test(lt) && /Hazmat/.test(lt), 'truck sheet loads: E2E-A then E2E-B, No stack and Hazmat pills');
    await tallShot(p, 'a-truck-390');
    await p.setViewportSize(DESK);
    await h.check(p, 'a-truck-1400');
  }

  /* ================= b) office sees the booking, confirms the time, the bell clears ================= */
  t.section('b) office (Nick 2468) sees the booking and confirms the time; the bell clears');
  {
    const p = await as('office', DESK);
    const bell = async () => { await p.locator('button[aria-label^="Notifications"]').first().click(); await wait(p, 300); const s = await txt(p.locator('.fixed.inset-0').last()); await p.keyboard.press('Escape'); await wait(p, 200); return s; };
    let b = await bell();
    t.ok(/Altex Transportation requested a slot .*2:47 PM/.test(b), 'office bell: "Altex Transportation requested a slot … 2:47 PM"');
    await p.locator('div.fixed.bottom-0 button', { hasText: /^Yard$/ }).first().click();
    await wait(p);
    const card = p.locator(`[data-truck="${TID}"]`);
    const ct = await txt(card);
    t.ok(/2:47 PM/.test(ct) && /Altex Transportation/.test(ct) && /Needs your OK/.test(ct) && /20 plt/.test(ct), 'Yard "Coming today": 2:47 PM, Altex, 20 plt, Needs your OK');
    await card.click();
    await wait(p, 400);
    const sh = sheet(p);
    const st = await txt(sh);
    t.ok(st.includes('Code ' + CODE) && /Driver link/i.test(st) && /Русский/.test(st), 'truck sheet: the check-in code, the driver link and the driver language (Русский)');
    t.eq(await sh.locator('input[aria-label^="Driver page"]').inputValue(), 'https://claude.ai/artifact/97haWKtJGFGXW8PjdM9XWv#eta' + CODE, 'office driver link ends in #eta' + CODE);
    await h.check(p, 'b-office-truck-1400');
    await sh.getByRole('button', { name: 'Confirm time' }).click();
    await wait(p, 500);
    const d = await h.readDoc(p), tr = T(d, TID);
    t.ok(tr.confirmedAt && tr.confirmedBy === 'Nick' && (tr.history || []).some(x => x.text === 'Time confirmed' && x.by === 'Nick'), 'saved: confirmedAt, confirmedBy Nick, history "Time confirmed"');
    t.ok(/Time confirmed by Nick/.test(await txt(sh)) && await sh.getByText('Needs your OK').count() === 0, 'the sheet says the time is confirmed');
    await p.keyboard.press('Escape');
    await wait(p, 250);
    b = await bell();
    t.ok(!/Altex Transportation requested a slot/.test(b), 'the bell no longer lists the request');
    await p.setViewportSize(PHONE);
    await h.check(p, 'b-office-yard-390');
  }

  /* ================= c) driver page in Russian, ETA +30 min; the customer sees it ================= */
  t.section('c) driver page #eta<code> opens in Russian, sets ETA +30 min; the customer sees it');
  {
    const p = await page('#eta' + CODE);
    t.ok(await p.locator('[data-zz=eta]').count() === 1, '#eta' + CODE + ' opens the driver page');
    const s0 = norm(await h.text(p));
    t.ok(s0.includes('Обновить время прибытия') && s0.includes('4417'), 'the driver page is in Russian (driverLang ru) and shows truck 4417');
    await h.check(p, 'c-eta-390', { full: true });
    const before = await p.evaluate(() => Date.now());
    await p.getByRole('button', { name: '30 мин' }).click();
    await wait(p, 500);
    const tr = T(await h.readDoc(p), TID);
    t.ok(tr.eta && tr.eta.source === 'driver' && Math.abs(Date.parse(tr.eta.at) - (before + 30 * MIN)) < 2 * MIN, 'saved: eta.source driver, about 30 min from now');
    t.ok(norm(await h.text(p)).includes('Сохранено.'), 'the driver page says it is saved (Сохранено.)');
    await h.check(p, 'c-eta-saved-390', { full: true });

    const q = await as('customer');
    await q.locator('nav.zz-tabs button', { hasText: 'Trucks' }).first().click();
    await wait(q, 300);
    const etaHm = hm(Date.parse(tr.eta.at));
    const row = await txt(q.locator('.zz-row', { hasText: 'Truck 4417' }).first());
    t.ok(row.includes('On the way, ETA ' + etaHm), `customer Trucks tab: "On the way, ETA ${etaHm}" (${row})`);
    await q.locator('.zz-row', { hasText: 'Truck 4417' }).first().click();
    await wait(q, 400);
    const ts = await txt(q.locator('[data-zzb=truck]'));
    t.ok(new RegExp('ETA [^·]*' + etaHm + ' from the driver').test(ts), `customer truck sheet: "ETA … ${etaHm} from the driver"`);
    const prog = await q.locator('[data-zzb=truck] .zzb-card .zzb-st').getAttribute('aria-label');
    const steps = await q.locator('[data-zzb=truck] .zzb-card .zzb-st > div').evaluateAll(xs => xs.map(x => x.className + ':' + x.textContent));
    t.ok(prog === 'Progress: On the way' && steps[1] === 'now:On the way' && steps[0] === 'done:Booked', 'the live card step bar: Booked done, "On the way" now (' + steps.join(' / ') + ')');
    await tallShot(q, 'c-customer-eta-390');
  }

  /* ================= d) kiosk: Español first, code, details, paperwork photo, done, back in 30 s ================= */
  t.section('d) kiosk: Español first, 4-digit code, details with a cell, 1 paperwork photo, done, back to language in 30 s');
  let PLACE = null;
  {
    const p = await page('#stations', TABLET);
    await p.getByText('Open driver check-in').click();
    await p.waitForSelector('[data-zz=kiosk]');
    const step = () => p.getAttribute('[data-zz=kiosk]', 'data-step');
    t.eq(await step(), 'lang', 'Stations -> Driver check-in opens the language screen first');
    await p.click('button[data-lang="es"]');
    await p.getByText('Tengo un código de 4 dígitos').click();
    for (const d of CODE) { await p.click(`.zzk-keys button[data-k="${d}"]`); await p.waitForTimeout(40); }
    await wait(p, 200);
    t.eq(await step(), 'details', 'the 4-digit code finds the truck and opens the details (in Spanish)');
    const s1 = norm(await h.text(p));
    t.ok(s1.includes('Le mandaremos su número de puerta por texto a este teléfono.') && s1.includes('Altex Transportation') && s1.includes('2:47 p.m.') && s1.includes('20 tarimas'), 'details in Spanish: Altex, 2:47 p.m., 20 tarimas');
    const ins = p.locator('[data-zz=kiosk] main input');
    const vals = await ins.evaluateAll(xs => xs.map(x => x.value));
    t.ok(vals.includes('4417') && vals.includes('T417'), 'truck and trailer filled in from the booking (' + vals.join(' / ') + ')');
    await ins.nth(0).fill('Ivan Petrov');
    await ins.nth(1).fill('775-555-0142');
    await h.check(p, 'd-kiosk-details-1024');
    await p.getByRole('button', { name: /Siguiente/ }).click();
    t.eq(await step(), 'scan', 'paperwork step');
    t.ok(!T(await h.readDoc(p), TID).arrivedAt, 'nothing saved before the driver finishes');
    await p.locator('[data-zz=kiosk] input[type=file]').setInputFiles(h.UPLOAD_PNG);
    await p.waitForFunction(() => document.querySelectorAll('[data-zz=kiosk] main img').length === 1);
    await h.check(p, 'd-kiosk-scan-1024');
    await p.getByRole('button', { name: /Listo — registrarme/ }).click();
    await p.waitForSelector('[data-zz=kiosk-done]');
    await wait(p, 300);
    const s = norm(await h.text(p));
    const d = await h.readDoc(p), tr = T(d, TID);
    t.ok(tr.arrivedAt && tr.checkedInBy === 'kiosk' && tr.driverLang === 'es' && tr.driver === 'Ivan Petrov' && tr.phone === '775-555-0142' && tr.paperCount === 1 && tr.paperBy === 'Driver at kiosk',
      'saved: checked in by the kiosk, driver Ivan Petrov, cell 775-555-0142, driverLang es (chosen at the kiosk), 1 paperwork page');
    const ph = JSON.parse(await p.evaluate(id => localStorage.getItem('cdweb:cd6:photos:paper:' + id), TID) || '[]');
    t.ok(ph.length === 1, 'the paperwork photo is stored under paper:<tid>');
    PLACE = await calc(p, (hh, dd, id) => hh.ZZplace(dd, id), TID);
    if (tr.dock && tr.dock !== 'YD') t.ok(s.includes('Vaya a la puerta ' + tr.dock), 'done screen: go to door ' + tr.dock);
    else t.ok(tr.dock === 'YD' && PLACE >= 1 && (await p.locator('[data-zz=place]').innerText()) === '#' + PLACE && s.includes('775-555-0142'), `every door is busy: done screen shows #${PLACE} in line and "we'll text 775-555-0142"`);
    await h.check(p, 'd-kiosk-done-1024');
    await p.clock.runFor(31000);
    t.eq(await step(), 'lang', '30 s after done the kiosk is back on the language screen');
    await p.setViewportSize(PHONE);
    await h.check(p, 'd-kiosk-lang-390');
  }

  /* ================= e) crew: wait clock, door picker, start, count (one short), damage report ================= */
  t.section('e) crew (Roman 1111): wait clock, free door, start, UNLOAD with nonstop photos, a damage snap finished at Sort-count-verify, one warehouse photo per load');
  let XID = null;
  {
    await ctx.clock.fastForward(25 * MIN);   // the driver waits in the yard
    // a door frees up: truck 85 (Silver State, D6) leaves
    let p = await as('crew');
    const z5 = T(await h.readDoc(p), 'zzt5');
    t.ok(z5.dock === 'D6', '(truck 85 is at D6 and leaves now, so one door is free)');
    await act(p, 'patchTrailer', 'zzt5', { stage: 'departed', dock: null, departedAt: iso(await p.evaluate(() => Date.now())) });
    p = await as('crew');
    await p.getByRole('button', { name: /All trucks/ }).first().click();
    await wait(p, 400);
    const card = p.locator(':text("Truck 4417 · Trailer T417")').locator('xpath=ancestor::*[.//button[contains(@class,"rounded-lg")]][1]');
    const wp = card.locator('[data-zz=waitpill]'), pp = card.locator('[data-zz=placepill]');
    const tone = await calc(p, (hh, d, id) => hh.ZZtone(hh.ZZwaitMs(d.trailers.find(x => x.id === id), Date.now()), d), TID);
    t.ok(/^Waiting 2[56]m · goal 30$/.test(norm(await wp.innerText())) && norm(await pp.innerText()) === '#' + PLACE + ' in line', `the truck card: "#${PLACE} in line", "${norm(await wp.innerText())}" (25 min after check-in)`);
    t.eq(await wp.evaluate(el => getComputedStyle(el).color), tone === 'warn' ? RGB.amber : tone === 'bad' ? RGB.red : RGB.green, `the wait clock colour follows the goal (${tone}: 25 of 30 min)`);
    await card.scrollIntoViewIfNeeded();
    await h.check(p, 'e-crew-card-390');
    await card.getByRole('button', { name: 'Give it a door' }).click();
    await wait(p, 400);
    await p.getByRole('button', { name: 'Pick a door for this truck' }).click();
    await wait(p, 400);
    const doors = await p.$$eval('button[data-door]', bs => bs.filter(b => /^D\d$/.test(b.dataset.door)).map(b => [b.dataset.door, b.disabled, b.innerText.replace(/\s+/g, ' ')]));
    const busy = doors.filter(x => x[0] !== 'D6');
    t.ok(busy.length === 7 && busy.every(x => x[1] === true && !/Free/.test(x[2])) && doors.find(x => x[0] === 'D6')[1] === false && /Free/.test(doors.find(x => x[0] === 'D6')[2]),
      'door picker: the 7 busy doors are disabled and labelled, D6 is free (' + doors.map(x => x[0] + (x[1] ? ' busy' : ' free')).join(', ') + ')');
    await h.check(p, 'e-crew-doors-390');
    await p.locator('button[data-door="D6"]').click();
    await wait(p, 500);
    let tr = T(await h.readDoc(p), TID);
    t.ok(tr.dock === 'D6' && tr.dockedAt && !tr.workStartedAt, 'saved: truck 4417 at D6');
    await p.getByRole('button', { name: /^Start/ }).first().click();
    await wait(p, 500);
    tr = T(await h.readDoc(p), TID);
    t.ok(tr.stage === 'working' && tr.workStartedAt && tr.workStartedBy === 'Roman', 'saved: Start puts it to work (stage working, started by Roman)');
    t.ok(/Working 0m · 1h 3\dm left on the 2-hour promise/.test(norm(await h.text(p))), 'the truck screen shows the work clock against the 2-hour promise (25 min already used waiting)');
    // 1 paperwork: the kiosk photo is there
    const paperBox = p.locator(':text("Driver\'s paperwork")').locator('xpath=..');
    t.ok(await paperBox.locator('img').count() === 1, 'the crew sees the paperwork photo the driver took at the kiosk');
    await p.getByRole('button', { name: /Paperwork's here/ }).click();
    await wait(p, 500);
    // 2 photo before unloading
    await p.locator('input[type=file]').first().setInputFiles(h.UPLOAD_PNG);
    await wait(p, 800);
    tr = T(await h.readDoc(p), TID);
    t.ok(tr.paperworkAt && tr.beforePhotoCount === 1, 'saved: paperwork checked, 1 photo before unloading');
    // 3 unload and count: load order (seq) first
    const nextOff = async () => norm(await p.locator(':text("Next off the truck")').locator('xpath=following-sibling::*[1]').innerText());
    let no = await nextOff();
    t.ok(/E2E-A/.test(no) && /40 pieces/.test(no) && /9,000 lb/.test(no) && /Do not stack/.test(no), '"Next off the truck": E2E-A first (load order), with pieces, weight, Do not stack');
    await p.getByRole('button', { name: /it's off, count it next/ }).click();
    await wait(p, 500);
    no = await nextOff();
    t.ok(/E2E-B/.test(no) && /Hazmat/.test(no), 'then E2E-B, with the Hazmat pill');
    t.eq(await stepNames(p), ['Paperwork', 'Photo before', 'Unload', 'Sort, count, verify', 'Wrap up'], 'UNLOAD steps: Paperwork, Photo before, Unload, Sort-count-verify, Wrap up (no photo log)');
    t.ok(/^UNLOAD · Pickup trailer$/.test(norm(await p.locator('[data-zz=jobtitle]').innerText())) && /2 loads to count and put away · 20 pallets/.test(await p.locator('[data-zz=jobtask]').innerText()), 'the job in big words: "UNLOAD · Pickup trailer", "2 loads to count and put away · 20 pallets"');
    // nonstop unloading photos while the loads come off (no minimum): the step's camera and the floating one
    t.ok(await p.locator('[data-zz=floatbar] [data-zz=floatcam]').isVisible() && await p.locator('[data-zz=floatbar] [data-zz=floatsnap]').isVisible(), 'while unloading, the camera and Damage buttons float at the bottom');
    await p.locator('[data-zz=step-off] [data-zz=caminput]').first().setInputFiles(h.UPLOAD_PNG);
    await countIs(p, '[data-zz=step-off] [data-zz=camcount]', 1);
    await p.locator('[data-zz=floatcaminput]').setInputFiles(h.UPLOAD_PNG);
    await countIs(p, '[data-zz=step-off] [data-zz=camcount]', 2);
    tr = T(await h.readDoc(p), TID);
    t.ok(tr.unloadPhotoCount === 2, 'saved: 2 unloading photos (unload:<truck>)');
    // a damaged pallet on E2E-B: snap it before anyone touches it, tap the load's badge, keep unloading
    await p.locator('[data-zz=floatsnap]').click();
    await p.locator('[data-zz=snapinput]').setInputFiles(h.UPLOAD_PNG);
    await p.waitForFunction(() => !!document.querySelector('[data-zz=snappick]'), null, { timeout: 5000 });
    t.ok(await p.locator('[data-zz=snappick] [data-zz=snapload]').count() === 2, 'the damage photo asks which load: one button per load badge');
    await p.locator('[data-zz=snappick] [data-zz=snapnote]').fill('Forks caught the wrap on 2 pallets');
    await h.check(p, 'e-crew-snap-pick-390');
    await p.locator(`[data-zz=snappick] [data-zz=snapload][data-sid="${L2}"]`).click();
    await wait(p, 600);
    let d = await h.readDoc(p);
    const snap = (S(d, L2).exceptions || []).find(x => x.draft);
    XID = snap && snap.id;
    t.ok(snap && snap.kind === 'Damage' && snap.photoOwner === 'dmg:' + XID && snap.photoCount === 1 && !snap.est, 'saved: a damage snap on E2E-B (draft, 1 photo, no price yet)');
    t.ok(/saved on load 2 \(E2E-B\)/.test(await p.locator('[data-zz=snapmsg]').innerText()), 'the crew sees "Damage photo saved on load 2 (E2E-B)"');
    const cv = await calc(p, (hh, dd, sid) => { const v = hh.ZZcustView(dd, 'cu_altex'); return { drafts: v.shipments.some(s => (s.exceptions || []).some(x => x.draft)), needs: (hh.ZZneeds ? hh.ZZneeds(dd, 'cu_altex', Date.now()) : []).filter(n => /damage/i.test(JSON.stringify(n))).length, msgs: hh.ZZmsgs(dd, Date.now()).filter(m => m.event === 'damage' && /E2E-B/.test(JSON.stringify(m))).length }; }, L2);
    t.ok(!cv.drafts && cv.needs === 0 && cv.msgs === 0, 'the customer cannot see the snap yet: not on its screens, no bell, no damage alert in the Outbox (' + JSON.stringify(cv) + ')');
    await p.getByRole('button', { name: /it's off, count it next/ }).click();
    await wait(p, 500);
    t.ok(await p.locator('[data-zz=step-verify]').count() === 1, 'with both loads off the truck, Sort-count-verify opens by itself');
    t.ok(/1 damage to finish/.test(await h.text(p)), 'its header says 1 damage to finish');
    // E2E-A: 11 of 12, Short, lane 21, the one warehouse photo
    const cardA = p.locator('div.rounded-lg').filter({ has: p.locator('span.font-black', { hasText: 'E2E-A' }) }).last();
    if (await cardA.locator('input[type=number]').count() === 0) { await cardA.locator('button').first().click(); await wait(p); }
    t.ok(await cardA.locator('[data-zz=badge]').count() >= 1, 'the count card shows the load badge');
    await cardA.locator('input[type=number]').fill('11');
    await cardA.getByRole('button', { name: 'Short', exact: true }).click();
    await cardA.getByRole('button', { name: '21', exact: true }).click();
    const saveA = cardA.getByRole('button', { name: 'Save', exact: true });
    t.ok(await saveA.isDisabled() && /Why is it short 1\? \(required\)/.test(await cardA.locator('[data-zz=countnote]').innerText()), 'a short count (11 of 12) cannot be saved without a note');
    await cardA.locator('[data-zz=countnote] input').fill('One pallet stayed at the shipper');
    t.ok(!(await saveA.isDisabled()), 'with the note it can be saved');
    t.ok(/Photo of the load left in the warehouse/.test(await cardA.locator('[data-zz=whphoto]').innerText()) && !/on the dock, whole load|in the lane/.test(await cardA.innerText()), 'one photo per load: "Photo of the load left in the warehouse" (no dock or lane photo boxes)');
    await cardA.locator('[data-zz=whphoto] [data-zz=caminput]').setInputFiles(h.UPLOAD_PNG);
    await p.waitForFunction(() => [...document.querySelectorAll('[data-zz=whphoto] [data-zz=camcount]')].some(e => e.innerText.trim() === '1'), null, { timeout: 6000 });
    await cardA.locator('[data-zz=countnote]').scrollIntoViewIfNeeded();
    await h.check(p, 'e-crew-count-short-390');
    await saveA.click();
    await wait(p, 600);
    d = await h.readDoc(p);
    const la = S(d, L1);
    const shortX = (la.exceptions || []).filter(x => x.kind === 'Short');
    t.ok(la.receivedAt && la.qc.counted === 11 && la.qc.condition === 'Short' && la.qc.note === 'One pallet stayed at the shipper' && la.row === 'R21' && la.rowPhotoCount === 1, 'saved: E2E-A counted 11, Short, the note, lane R21, 1 warehouse photo');
    t.ok(shortX.length === 1 && /Counted 11 against 12 on the BOL: One pallet stayed at the shipper — Roman at the door/.test(shortX[0].note), 'one Short report that reads "Counted 11 against 12 on the BOL: One pallet stayed at the shipper — Roman at the door"');
    // E2E-B: Damaged + Save finishes the snap (the photo is already there), then the count saves
    const cardB = p.locator('div.rounded-lg').filter({ has: p.locator('span.font-black', { hasText: 'E2E-B' }) }).last();
    if (await cardB.locator('input[type=number]').count() === 0) { await cardB.locator('button').first().click(); await wait(p); }
    t.ok(await cardB.locator('[data-zz=snappill]').count() === 1, 'the E2E-B card has the red "Damage photo to finish" pill');
    await cardB.locator('input[type=number]').fill('8');
    await cardB.getByRole('button', { name: 'Damaged', exact: true }).click();
    await cardB.getByRole('button', { name: '22', exact: true }).click();
    await cardB.locator('[data-zz=whphoto] [data-zz=caminput]').setInputFiles(h.UPLOAD_PNG);
    await p.waitForFunction(() => [...document.querySelectorAll('[data-zz=whphoto] [data-zz=camcount]')].filter(e => e.innerText.trim() === '1').length >= 1, null, { timeout: 6000 });
    await wait(p, 300);
    await cardB.getByRole('button', { name: 'Save', exact: true }).click();
    await wait(p, 500);
    const dm = p.locator('[data-zz=dmg]');
    t.ok(await dm.count() === 1 && await dm.getAttribute('data-snap') === XID, 'Damaged + Save opens the damage report on the snap (no second report)');
    t.ok(/1 of 2/.test(await dm.locator('[data-zz=dmgcount]').innerText()) && (await dm.locator('textarea').inputValue()) === 'Forks caught the wrap on 2 pallets', 'the snap photo is already in (1 of 2) and the crew\'s words come along');
    const saveD = dm.getByRole('button', { name: 'Save damage report' });
    await dm.locator('[data-kind="Torn wrap"]').click();
    await dm.locator('button[aria-label="One more pallets"]').click();
    t.ok(await saveD.isDisabled() && /1 more photo/.test(await dm.locator('[data-zz=missing]').innerText()), 'with 1 photo Save stays disabled ("1 more photo")');
    await h.check(p, 'e-crew-dmg-1photo-390');
    await dm.locator('[data-shot-input=close]').setInputFiles(h.UPLOAD_PNG);
    await p.waitForFunction(() => /2 of 2/.test((document.querySelector('[data-zz=dmgcount]') || {}).innerText || ''), null, { timeout: 5000 });
    t.ok(/Customer will approve or decline/.test(await dm.locator('[data-zz=approve]').innerText()), 'auto-approve is off: "Customer will approve or decline"');
    const total = norm(await dm.locator('[data-zz=dmgtotal]').innerText());
    t.ok(/\$90\.00/.test(total), 'fix lines: rewrap 2 x $15 + labor 0.5 h x $120 = $90.00 (' + total + ')');
    t.ok(!(await saveD.isDisabled()), 'with a kind and 2 photos Save works');
    await h.check(p, 'e-crew-dmg-2photos-390');
    await saveD.click();
    await wait(p, 800);
    d = await h.readDoc(p);
    const lb = S(d, L2), dx = (lb.exceptions || []).filter(x => x.kind === 'Damage');
    t.ok(dx.length === 1 && dx[0].id === XID && dx[0].draft === false && dx[0].photoOwner === 'dmg:' + XID && dx[0].photoCount === 2 && dx[0].pallets === 2 && dx[0].kinds.join() === 'Torn wrap' && dx[0].what === 'Forks caught the wrap on 2 pallets', 'saved: the snap became the one Damage report on E2E-B (draft false, 2 photos, 2 pallets, Torn wrap, what happened)');
    t.ok(!dx[0].answer && dx[0].est && dx[0].est.lines.filter(l => l.on !== false).length === 2 && !dx[0].est.applied, 'auto-approve off: no answer, the estimate waits for the customer');
    t.ok(lb.qc.condition === 'Damaged' && lb.qc.counted === 8 && lb.receivedAt && lb.row === 'R22' && lb.rowPhotoCount === 1 && !(Number(lb.rewrapPallets) > 0), 'saved: E2E-B counted 8, Damaged, lane R22, 1 warehouse photo; rewrap is priced in the report, not on the load');
    t.eq(JSON.parse(await p.evaluate(k => localStorage.getItem(k), 'cdweb:cd6:photos:' + dx[0].photoOwner) || '[]').length, 2, 'the 2 damage photos are stored under dmg:<id>');
    t.ok(await calc(p, (hh, dd, sid) => hh.ZZcustView(dd, 'cu_altex').shipments.find(s => s.id === sid).exceptions.some(x => x.kind === 'Damage' && !x.draft), L2), 'only now does the customer view have the damage report');
    await p.setViewportSize(DESK);
    await h.check(p, 'e-crew-counted-1400');
  }

  /* ================= f) customer approves the damage; the charge is billed once ================= */
  t.section('f) customer: damage in the Damage tab (photos, fix lines, total), approves, billed exactly once');
  {
    const p = await as('customer');
    await p.locator('nav.zz-tabs button', { hasText: 'Damage' }).first().click();
    await wait(p, 600);
    const card = p.locator('[data-zzb=dmg-card]', { hasText: 'Damage on load E2E-B' }).first();
    t.ok(await card.count() === 1, 'the Damage tab has the report for E2E-B');
    await p.waitForFunction(() => [...document.querySelectorAll('[data-zzb=dmg-card]')].some(c => /E2E-B/.test(c.innerText) && c.querySelectorAll('img').length === 2), null, { timeout: 5000 });
    const ct = await txt(card);
    t.ok(ct.includes('Needs your answer') && ct.includes('2 pallets hurt') && ct.includes('Torn wrap') && ct.includes('Forks caught the wrap on 2 pallets') && /by Roman · truck 4417/.test(ct), 'the card: needs your answer, 2 pallets hurt, Torn wrap, what happened, by Roman, truck 4417');
    t.eq(await card.locator('img').count(), 2, 'the card shows the 2 damage photos');
    t.ok(/Rewrap pallet 2 × \$15\.00 \$30\.00/.test(ct.replace(/\s+/g, ' ')) || (ct.includes('Rewrap pallet') && ct.includes('$30.00')), 'fix line: Rewrap pallet, $30.00');
    t.ok(ct.includes('Labor hours') && ct.includes('$60.00') && ct.includes('$90.00') && !ct.includes('Replacement pallet'), 'fix line: Labor $60.00; total $90.00; the replacement pallet the crew left off is not charged');
    await card.scrollIntoViewIfNeeded();
    await h.check(p, 'f-damage-card-390');
    await card.getByRole('button', { name: 'Accept $90.00' }).click();
    await wait(p, 300);
    const md = sheet(p);
    await md.locator('input[placeholder="First and last name"]').fill('Pat Altex');
    const appr = md.getByRole('button', { name: 'Approve $90.00' });
    t.ok(await appr.isDisabled(), 'Approve waits for the "I approve" check box');
    await md.locator('input[type=checkbox]').check();
    await h.check(p, 'f-approve-390');
    await appr.click();
    await wait(p, 600);
    let d = await h.readDoc(p), lb = S(d, L2), x = lb.exceptions.find(q => q.id === XID);
    t.ok(x.answer && x.answer.status === 'accepted' && x.answer.by === 'Pat Altex' && x.answer.total === 90 && !x.answer.auto && x.est.applied === true, 'saved: answer accepted by Pat Altex, $90, estimate applied');
    const adj = (lb.adjustments || []).map(a => a.label + ' ' + a.amount);
    t.eq(adj, ['Damage: Rewrap pallet 30', 'Damage: Labor hours 60'], 'saved: the two damage charges on the load, once each');
    t.ok((d.accountChat.cu_altex || []).some(m => /APPROVED damage charges of \$90\.00 on #E2E-B/.test(m.text)), 'the office gets an account-chat note: APPROVED $90.00 on #E2E-B');
    t.ok(/Approved by Pat Altex/.test(await txt(p.locator('[data-zzb=dmg-card]', { hasText: 'E2E-B' }).first())), 'the card now says "Approved by Pat Altex"');
    await p.locator('nav.zz-tabs button', { hasText: 'Bills' }).first().click();
    await wait(p, 400);
    const sec = p.locator('section', { hasText: 'Charges so far, by load' });
    const blk = sec.getByRole('button', { name: 'Load E2E-B', exact: true }).locator('xpath=../..');
    const bt = await txt(blk);
    const rw = (bt.match(/rewrap/gi) || []).length;
    t.ok(rw === 1 && bt.includes('Damage: Rewrap pallet') && bt.includes('Damage: Labor hours') && !/Rewrap · \d+ plt/.test(bt), 'Bills: E2E-B shows the rewrap charge exactly once (Damage: Rewrap pallet; no extra "Rewrap · n plt" line)');
    const std = (await h.readDoc(p)).rates.std;
    t.ok(bt.includes('Damage: Rewrap pallet 1 × $30.00 $30.00') && bt.includes('Damage: Labor hours 1 × $60.00 $60.00') && bt.includes(`Standard in · 8 8 × $${std.toFixed(2)}`) && bt.includes(`Total so far $${(8 * std + 90).toFixed(2)}`),
      `Bills: E2E-B = 8 pallets in × $${std.toFixed(2)} + $30.00 rewrap + $60.00 labor = $${(8 * std + 90).toFixed(2)}`);
    await blk.scrollIntoViewIfNeeded();
    await h.check(p, 'f-bills-390');
  }

  /* ================= g) crew finishes the drop; the customer sees done against the promise ================= */
  t.section('g) crew finishes the drop (no photo log); customer sees done in Xm within the promise, counts vs BOL, the trail');
  {
    await ctx.clock.fastForward(30 * MIN);   // unloading and putting away
    const p = await as('crew');
    await p.getByRole('button', { name: /All trucks/ }).first().click();
    await wait(p, 400);
    const card0 = p.locator(':text("Truck 4417 · Trailer T417")').locator('xpath=ancestor::*[.//button[contains(@class,"rounded-lg")]][1]');
    t.ok(/Unloading now/.test(await txt(card0)), 'All trucks: truck 4417 is "Unloading now"');
    await card0.locator('button').last().click();
    await wait(p, 500);
    const gs = norm(await h.text(p));
    t.ok(/Step 5 of 5: Wrap up/.test(gs) && !/Photo log/.test(gs), 'the truck opens on the last step, Wrap up; there is no photo log any more (' + gs.slice(0, 200) + ')');
    t.ok(/Unloading photos\s*2/.test(gs) && /Warehouse photos\s*2 \/ 2/.test(gs), 'the wrap-up summary: 2 unloading photos, warehouse photos 2 / 2');
    let tr = T(await h.readDoc(p), TID);
    await p.getByRole('button', { name: /Wrap up & send/ }).click();
    await wait(p, 400);
    await h.check(p, 'g-crew-wrap-390');
    await p.getByRole('button', { name: 'Send to dispatch', exact: true }).click();
    await wait(p, 600);
    tr = T(await h.readDoc(p), TID);
    t.ok(tr.stage === 'done' && tr.workDoneAt && tr.workDoneBy === 'Roman', 'saved: Send to dispatch marks the truck done (by Roman)');
    const doneMin = Math.round((Date.parse(tr.workDoneAt) - Date.parse(tr.arrivedAt)) / MIN);
    const dur = Math.floor(doneMin / 60) ? `${Math.floor(doneMin / 60)}h ${doneMin % 60}m` : `${doneMin}m`;
    t.ok(doneMin > 50 && doneMin < 120, `done ${doneMin} min after check-in (inside the 2-hour promise)`);

    const q = await as('customer');
    const note = q.locator('[data-zzb=done-note]');
    const nt = await txt(note);
    const want = `Truck 4417 is done: 19 of 20 pallets, 5 photos, 1 damage report. ${dur}, within our 2-hour promise.`;
    t.ok(nt.includes(want), `Schedule: the done note "${want}"`);
    await h.check(q, 'g-customer-schedule-390', { full: true });
    await note.getByRole('button', { name: 'Open' }).click();
    await wait(q, 400);
    const ts = q.locator('[data-zzb=truck]');
    const card = await txt(ts.locator('.zzb-card').first());
    t.ok(card.includes(`Done in ${dur}, within our 2-hour promise`), `truck sheet: "Done in ${dur}, within our 2-hour promise"`);
    const ds = await txt(q.locator('[data-zzb=done]'));
    t.ok(ds.includes('Done in ' + dur + ', within our 2-hour promise') && /Load E2E-A 11 of 12 pallets on the BOL/.test(ds) && /Load E2E-B ✓ 8 of 8 pallets on the BOL/.test(ds), 'Done section: each load counted against the BOL (E2E-A 11 of 12, E2E-B ✓ 8 of 8)');
    await q.waitForFunction(() => document.querySelectorAll('[data-zzb=done] img').length >= 5, null, { timeout: 5000 }).catch(() => {});
    t.eq(await q.locator('[data-zzb=done] .zzb-ph img').count(), 3, 'Done section: the photo before unloading and the 2 unloading photos');
    t.eq(await q.locator('[data-zzb=done] img').count(), 5, 'plus one photo per load of where it sits in our warehouse (5 photos, as the done note says)');
    t.ok(/Damage on load E2E-B/.test(ds), 'Done section: links the damage on E2E-B');
    const tl = ts.locator('[data-zzb=trail]');
    const more = tl.getByRole('button', { name: /^Show all/ });
    if (await more.count()) { await more.click(); await wait(q, 250); }
    const lines = await tl.locator('.zzb-tl > div').evaluateAll(xs => xs.map(x => x.innerText.replace(/\s+/g, ' ')));
    const data = await calc(q, (hh, dd, id) => hh.ZZtrail(dd, id).map(r => r.text), TID);
    t.eq(lines.length, data.length, `the trail shows all ${data.length} lines`);
    const order = ['Booked for ', 'Time changed to', 'Time confirmed', 'ETA ', 'Checked in at the kiosk', 'At door D6', 'Unloading started', 'Received E2E-A: counted 11 of 12', 'Damage reported on E2E-B: 2 pallets (Torn wrap)', 'Damage fix approved ($90.00)', 'Done (unloaded in '];
    const at = order.map(k => lines.findIndex(l => l.includes(k)));
    t.ok(at.every(k => k >= 0) && at.every((k, j) => j === 0 || k > at[j - 1]), 'the trail is in order: booked, time changed, confirmed, ETA, checked in, door, started, received, damage, approved, done (' + at.join(',') + ')');
    const tr2 = T(await h.readDoc(q), TID), wm = Math.floor((Date.parse(tr2.workDoneAt) - Date.parse(tr2.workStartedAt)) / MIN), wdur = Math.floor(wm / 60) ? `${Math.floor(wm / 60)}h ${wm % 60}m` : `${wm}m`;
    t.ok(lines[at[10]].includes(`Done (unloaded in ${wdur})`) && !lines.some(l => l.includes('Done in')), `the trail says "Done (unloaded in ${wdur})" (time at the door), so it never reads like a second, different "Done in" next to the promise line`);
    t.ok(new RegExp('Booked for [A-Z][a-z]{2}, [A-Z][a-z]{2} \\d+, 2:17 PM').test(lines[at[0]]) && /\(was [^)]*2:17 PM\)/.test(lines[at[1]]), 'the first line keeps the ORIGINAL booked time (2:17 PM), the time change says "(was … 2:17 PM)"');
    t.ok(lines.every(l => !/Silver State|High Desert|Sierra|Truckee/.test(l)), 'the trail names no other company');
    await tallShot(q, 'g-customer-done-390');
    await q.setViewportSize(DESK);
    await h.check(q, 'g-customer-done-1400');
  }

  /* ================= h) a pickup for Altex: crew loads it, secures it, wrap-up waits for the securement ================= */
  t.section('h) Altex books a 2-stop pickup with the shipper photo; the office makes it a DELIVERY; crew: find, count, inspect + photo, load it up in plan order, strapped, bills');
  let PID = null;
  {
    // the office releases the finished drop truck (Nick's release), so door D6 is open again
    let p = await as('office', DESK);
    await p.locator('div.fixed.bottom-0 button', { hasText: /^Yard$/ }).first().click();
    await wait(p);
    await p.locator(`[data-truck="${TID}"]`).first().click();
    await wait(p, 400);
    await sheet(p).getByRole('button', { name: 'Release truck' }).click();
    await wait(p, 300);
    await p.getByRole('button', { name: 'Release', exact: true }).click();
    await wait(p, 500);
    let d = await h.readDoc(p);
    t.ok(T(d, TID).stage === 'departed' && T(d, TID).departedAt && !T(d, TID).dock && !S(d, L1).shippedAt && !S(d, L2).shippedAt, 'office releases truck 4417: it left, door D6 is open, the two loads stay on the floor');

    // the customer books a pickup of the two loads for 3:30 PM: 2 stops (E2E-A first stop, E2E-B second) and the shipper's photo
    p = await as('customer');
    await p.getByRole('button', { name: 'Schedule a truck' }).first().click();
    await wait(p, 300);
    const f = sheet(p);
    await f.getByRole('button', { name: /^Picking up from your dock/ }).click();
    await wait(p, 200);
    await f.locator('input[type=date]').fill(TODAY);
    await f.locator('input[type=time]').first().fill('15:30');
    for (const ref of ['E2E-A', 'E2E-B']) await f.locator('label.zz-pick', { hasText: 'Load ' + ref }).locator('input[type=checkbox]').check();
    await f.locator('input[placeholder="e.g. 4521"]').fill('4418');
    await f.locator('input[placeholder="e.g. T880"]').fill('T418');
    t.ok(/2 loads selected/.test(await txt(f)) && /20 pallets/.test(await txt(f)), 'pickup form: 2 loads selected, 20 pallets');
    const bp = f.locator('[data-zzb=book-plan]');
    await bp.getByRole('button', { name: 'Yes', exact: true }).click();
    await wait(p, 200);
    const rows = await bp.locator('[data-sid]').evaluateAll(xs => xs.map(x => [x.dataset.sid, x.querySelector('select').value, ((x.querySelector('button[aria-pressed=true]') || { dataset: {} }).dataset.pos) || '']));
    t.eq(rows, [[L1, '1', 'tail'], [L2, '2', 'nose']], 'more than one stop: E2E-A stop 1 by the doors (tail), E2E-B stop 2 in the nose (suggested)');
    await f.locator('[data-zzb=book-ship] input[type=file]').setInputFiles(h.UPLOAD_PNG);
    await p.waitForFunction(() => document.querySelectorAll('[data-zzb=book-ship] img').length === 1, null, { timeout: 5000 });
    await tallShot(p, 'h-pickup-form-390');
    await f.getByRole('button', { name: 'Send request' }).click();
    await wait(p, 900);
    d = await h.readDoc(p);
    const pu = d.trailers.find(x => x.truck === '4418');
    PID = pu && pu.id;
    t.ok(pu && pu.direction === 'outbound' && pu.customerId === 'cu_altex' && /^\d{4}$/.test(pu.code) && pu.scheduledAt === iso(dockIso(TODAY, '15:30')) && S(d, L1).trailerOutId === PID && S(d, L2).trailerOutId === PID,
      'saved: pickup truck 4418 (outbound, 3:30 PM, its own code), both loads planned onto it');
    t.ok(pu.multiStop === true && pu.shipperPhotoCount === 1 && S(d, L1).stop === 1 && S(d, L1).pos === 'tail' && S(d, L2).stop === 2 && S(d, L2).pos === 'nose', 'saved: the load plan (zzLoadPlan) and the shipper photo (ship:<truck>)');
    await p.locator('[data-zzb=booked]').getByRole('button', { name: 'Done', exact: true }).click();

    // the office confirms it, makes it a delivery (we drive it to the receivers) and checks the driver in
    p = await as('office', DESK);
    await p.locator('div.fixed.bottom-0 button', { hasText: /^Yard$/ }).first().click();
    await wait(p);
    await p.locator(`[data-truck="${PID}"]`).first().click();
    await wait(p, 400);
    const sh = sheet(p);
    await sh.getByRole('button', { name: 'Confirm time' }).click();
    await wait(p, 400);
    await sh.getByRole('group', { name: 'Loading job' }).getByRole('button', { name: 'Delivery', exact: true }).click();
    await wait(p, 500);
    d = await h.readDoc(p);
    t.ok(T(d, PID).loadJob === 'delivery', 'the office sets the loading job to Delivery on the truck sheet');
    await sh.getByRole('button', { name: 'Check in now (driver skipped the kiosk)' }).click();
    await sh.getByRole('button', { name: 'Yes, check in' }).click();
    await wait(p, 700);
    d = await h.readDoc(p);
    t.ok(T(d, PID).confirmedAt && T(d, PID).arrivedAt && T(d, PID).checkedInBy === 'office' && T(d, PID).dock === 'D6' && T(d, PID).stage === 'at-dock', 'office confirms and checks it in: first open door D6');
    t.ok(/Checked in\. Send the driver to door D6\./.test(await txt(sh)), 'the office sheet says: send the driver to door D6');
    await ctx.clock.fastForward(5 * MIN);

    // crew: DELIVERY - find (shipper photo + our unloading photos), count, inspect + photo, load it up in plan order, strapped, bills
    p = await as('crew');
    await p.getByRole('button', { name: /All trucks/ }).first().click();
    await wait(p, 400);
    const card = p.locator(':text("Truck 4418 · Trailer T418")').locator('xpath=ancestor::*[.//button[contains(@class,"rounded-lg")]][1]');
    t.ok(/^DELIVERY 2 stops/.test(await txt(card)) && /20 to load/.test(await txt(card)), 'crew card names the job: "DELIVERY 2 stops", 20 to load');
    await card.getByRole('button', { name: 'Start loading' }).click();
    await wait(p, 600);
    d = await h.readDoc(p);
    t.ok(T(d, PID).stage === 'working' && T(d, PID).workStartedBy === 'Roman', 'saved: loading started by Roman');
    t.ok(/^DELIVERY · 2 stops$/.test(norm(await p.locator('[data-zz=jobtitle]').innerText())), 'the job in big words: "DELIVERY · 2 stops"');
    t.eq(await stepNames(p), ['Find the load', 'Count it', 'Inspect + photo', 'Load it up', 'Strapped', 'Bills', 'Wrap up'], 'DELIVERY steps: Find, Count, Inspect + photo, Load it up, Strapped, Bills, Wrap up');
    const ref = p.locator('[data-zz=step-find] [data-zz=ref]');
    await p.waitForFunction(() => document.querySelectorAll('[data-zz=step-find] [data-zz=ref] img').length >= 3, null, { timeout: 6000 });
    t.ok(/Load it like the shipper did/.test(await ref.innerText()) && await ref.locator(`[data-owner="ship:${PID}"] img`).count() === 1 && await ref.locator(`[data-owner="unload:${TID}"] img`).count() === 2,
      '"Load it like the shipper did": the customer\'s shipper photo plus our 2 unloading photos from truck 4417');
    const fr = await p.$$eval('[data-zz=findrow]', rs => rs.map(r => [r.getAttribute('data-sid'), r.innerText.replace(/\s+/g, ' ')]));
    t.ok(fr.length === 2 && /R21/.test(fr.find(r => r[0] === L1)[1]) && /R22/.test(fr.find(r => r[0] === L2)[1]) && /Stop 2 · NOSE/.test(fr.find(r => r[0] === L2)[1]), 'Find: where each load sits (R21, R22) with its stop and place');
    await h.check(p, 'h-find-390');
    await p.getByRole('button', { name: 'Found them — count next' }).click();
    await wait(p, 600);
    // E2E-A: only 11 on the floor (it came in short) -> a note, then confirm 11
    const ra = p.locator(`[data-zz=countrow][data-sid="${L1}"]`), rb = p.locator(`[data-zz=countrow][data-sid="${L2}"]`);
    await ra.locator('input[aria-label="Pallets counted"]').fill('11');
    await wait(p, 200);
    t.ok(await ra.getByRole('button', { name: /^Confirm 11/ }).isDisabled(), 'count: 11 of 12 cannot be confirmed without a note');
    await ra.locator('[data-zz=countnote] input').fill('Came in 11, one short at receiving');
    await ra.getByRole('button', { name: /^Confirm 11/ }).click();
    await wait(p, 400);
    await rb.getByRole('button', { name: 'Count is correct' }).click();
    await wait(p, 400);
    d = await h.readDoc(p);
    t.ok(S(d, L1).pullCount === 11 && S(d, L2).pullCount === 8, 'saved: counts 11 and 8');
    const sh1 = S(d, L1).exceptions.filter(x => x.kind === 'Short');
    t.ok(sh1.length === 1 && /Counted 11 against 12 on the BOL: One pallet stayed at the shipper — Roman at the door · Counted 11 against 12 on the BOL while loading: Came in 11, one short at receiving$/.test(sh1[0].note),
      'the 11 of 12 at loading adds its count and note to the open Short report from receiving (one report, nothing lost)');
    await p.getByRole('button', { name: 'Counts done — inspect next' }).click();
    await wait(p, 500);
    for (const id of [L1, L2]) {
      await p.locator(`[data-zz=insprow][data-sid="${id}"] [data-zz=caminput]`).setInputFiles(h.UPLOAD_PNG);
      await countIs(p, `[data-zz=insprow][data-sid="${id}"] [data-zz=camcount]`, 1);
    }
    d = await h.readDoc(p);
    t.ok(S(d, L1).inspPhotoCount === 1 && S(d, L2).inspPhotoCount === 1, 'saved: one inspect photo per load (insp:<load>)');
    t.ok(/Damaged — report saved/.test(await p.locator(`[data-zz=insprow][data-sid="${L2}"]`).innerText()) && /Good — no damage reported/.test(await p.locator(`[data-zz=insprow][data-sid="${L1}"]`).innerText()), 'inspect: E2E-B shows its damage report, E2E-A is good');
    await p.getByRole('button', { name: 'All checked — load it up' }).click();
    await wait(p, 500);
    t.eq(await p.$$eval('[data-zz=step-load] [data-zz=planrow]', rs => rs.map(r => r.getAttribute('data-sid'))), [L2, L1], 'Load it up: the plan in loading order (E2E-B for stop 2 in the nose first, then E2E-A by the doors)');
    t.ok(await p.locator('[data-zz=step-load] [data-zz=ref]').count() === 1, 'the shipper reference shows again while loading');
    await p.locator('[data-zz=step-load] [data-zz=caminput]').first().setInputFiles(h.UPLOAD_PNG);
    await countIs(p, '[data-zz=step-load] [data-zz=camcount]', 1);
    await h.check(p, 'h-load-390');
    for (const id of [L2, L1]) { await p.locator(`[data-zz=loadrow][data-sid="${id}"]`).getByRole('button', { name: 'Load it' }).click(); await wait(p, 500); }
    d = await h.readDoc(p);
    t.ok(S(d, L1).loadedAt && S(d, L2).loadedAt && T(d, PID).afterPhotoCount === 1, 'saved: both loads on, 1 loadout photo (after:<truck>)');
    // wrap-up is blocked until it is strapped and the bills are photographed
    await p.getByRole('button', { name: /Wrap up & send/ }).click();
    await wait(p);
    t.ok(await p.locator('[data-zz=securefirst]').count() === 1 && await p.getByRole('button', { name: 'Send to dispatch', exact: true }).isDisabled(), 'Wrap up: "Send to dispatch" is blocked until the load is strapped');
    await h.check(p, 'h-wrap-blocked-390');
    await p.evaluate(() => window.scrollTo(0, document.scrollingElement.scrollHeight));
    await p.getByRole('button', { name: /^Go to (Secure the load|Strapped)$/ }).first().click();
    await wait(p, 800);
    const sf = p.locator('[data-zz=secureform]');
    t.ok(await sf.count() === 1 && /Photo of it strapped/.test(await p.locator('[data-zz=securestep]').innerText()), 'it opens the Strapped form (delivery words: "Photo of it strapped")');
    const save = sf.getByRole('button', { name: 'Save and sign' });
    const plus = async (k, n) => { for (let i = 0; i < n; i++) await sf.locator(`[data-gear=${k}] button[aria-label^="One more"]`).click(); };
    await plus('plywood', 6); await plus('bars', 2); await plus('straps', 4);
    await sf.locator('[data-gear=straps] [data-owner=driver]').click();
    for (const tg of ['b-301', 'B-302']) { await sf.locator('input[aria-label="Tag number"]').fill(tg); await sf.locator('[data-zz=tagadd]').click(); }
    await sf.locator('input[aria-label="Seal number"]').fill('sl-4418');
    t.ok(await save.isDisabled() && /a photo of it strapped/.test(await sf.locator('[data-zz=missing]').innerText()), 'without a photo of it strapped Save and sign is refused ("a photo of it strapped")');
    await sf.locator('[data-zz=secphotos] [data-zz=caminput]').setInputFiles(h.UPLOAD_PNG);
    await countIs(p, '[data-zz=secphotos] [data-zz=camcount]', 1);
    await sf.locator('[data-conf="3"]').click();
    t.ok(await save.isDisabled() && /what would make it safer/.test(await sf.locator('[data-zz=missing]').innerText()), 'confidence 3 needs a note');
    await sf.locator('textarea').fill('One more strap at the tail would help');
    t.ok(await save.isDisabled() && /check box/.test(await sf.locator('[data-zz=missing]').innerText()), 'still refused without the check box');
    await sf.locator('[data-zz=secchk]').check();
    t.ok(await save.isDisabled() && /signature/.test(await sf.locator('[data-zz=missing]').innerText()), 'still refused without a signature');
    await sf.locator('[data-zz=secsign]').fill('Roman');
    t.ok(!(await save.isDisabled()), 'Save and sign is ready');
    await sf.scrollIntoViewIfNeeded();
    await h.check(p, 'h-secure-form-390');
    await save.click();
    await wait(p, 700);
    d = await h.readDoc(p);
    const sc = T(d, PID).secure;
    t.ok(sc && sc.signedBy === 'Roman' && sc.signature === 'Roman' && sc.confidence === 3 && sc.note === 'One more strap at the tail would help' && sc.checkedRows === true && sc.seal === 'SL-4418' && T(d, PID).sealOut === 'SL-4418', 'saved: strapped report signed by Roman, 3/5 with the note, rows checked, seal SL-4418 (sealOut too)');
    t.eq(sc.gear, { plywood: { qty: 6, owner: 'ours' }, bars: { qty: 2, owner: 'ours' }, straps: { qty: 4, owner: 'driver' }, airbags: { qty: 0, owner: 'ours' } }, 'saved gear: plywood 6 ours, bars 2 ours, straps 4 driver\'s');
    t.eq(sc.tags, ['B-301', 'B-302'], 'saved tags B-301, B-302 (capitals)');
    t.ok(sc.photoOwner === 'strap:' + PID && sc.photoCount === 1 && sc.v === 2, 'saved: 1 strapped photo under strap:<truck> (no fixed photo slots)');
    const gr = (d.zzGear || []).filter(g => g.trailerId === PID);
    t.eq(gr.map(g => `${g.type}:${g.qty}:${g.dir}:${g.src}:${(g.tags || []).join('+')}`).sort(), ['bars:2:out:secure:B-301+B-302', 'plywood:6:out:secure:'], 'gear ledger: plywood 6 and bars 2 (with the tags) go out with Altex; the driver\'s straps do not');
    t.ok(await p.locator('[data-zz=step-bills]').count() === 1, 'then the Bills step');
    await p.locator('[data-zz=step-bills] [data-zz=caminput]').setInputFiles(h.UPLOAD_PNG);
    await p.waitForFunction(id => { const d = JSON.parse(localStorage.getItem('cdweb:cd6:doc')); return (d.trailers.find(x => x.id === id) || {}).bolPhotoCount === 1; }, PID, { timeout: 6000 });
    await wait(p, 400);
    if (await p.getByRole('button', { name: 'Bills done — wrap up' }).count()) await p.getByRole('button', { name: 'Bills done — wrap up' }).click();
    await wait(p, 500);
    t.ok(await p.locator('[data-zz=step-wrap]').count() + (/Step 7 of 7: Wrap up/.test(norm(await h.text(p))) ? 1 : 0) >= 1, 'with the bills photo in, the screen moves on to Wrap up');
    const ws = norm(await h.text(p));
    t.ok(/Loadout photos\s*1/.test(ws) && /Inspect photos\s*2 \/ 2/.test(ws) && /Strapped\s*3\/5/.test(ws) && /Bills\s*1 photo(?!s)/.test(ws) && /Loads on\s*2 \/ 2/.test(ws) && /Counted vs BOL\s*1 off/.test(ws) && !/Loads off/.test(ws), 'the wrap-up summary: loadout photos, inspect photos, Strapped 3/5, Bills 1 photo, "Loads on 2 / 2" (not "Loads off"), Counted vs BOL 1 off');
    await p.getByRole('button', { name: /Wrap up & send/ }).click();
    await wait(p);
    t.ok(await p.locator('[data-zz=securefirst]').count() === 0 && (await p.locator('input[placeholder="SL-00000"]').last().inputValue()) === 'SL-4418', 'Send to dispatch is open and the seal is filled in (SL-4418)');
    await p.getByRole('button', { name: 'Send to dispatch', exact: true }).click();
    await wait(p, 700);
    d = await h.readDoc(p);
    t.ok(T(d, PID).stage === 'done' && T(d, PID).workDoneAt && T(d, PID).bolPhotoCount === 1, 'saved: the delivery truck is done (bills photo taken)');
    await p.setViewportSize(DESK);
    await h.check(p, 'h-crew-done-1400');
  }

  /* ================= i) customer: securement report, our gear, securement plan ================= */
  t.section('i) customer: securement report on the truck sheet, "Our gear with you", securement plan interest');
  {
    const p = await as('customer');
    await p.locator('nav.zz-tabs button', { hasText: 'Trucks' }).first().click();
    await wait(p, 300);
    await p.locator('button.zzb-card, .zz-row', { hasText: 'Truck 4418' }).first().click();
    await wait(p, 500);
    const sec = p.locator('[data-zzb=secured]');
    await p.waitForFunction(() => { const s = document.querySelector('[data-zzb=secured]'); return s && s.querySelectorAll('img').length === 1; }, null, { timeout: 5000 });
    const st = await txt(sec);
    t.ok(st.includes('Loaded and secured') && st.includes('3 of 5') && st.includes('OK') && st.includes('Seal SL-4418') && st.includes('Signed by Roman') && st.includes('One more strap at the tail would help'),
      'secured section: 3 of 5 (OK) with the crew\'s note, seal SL-4418, signed by Roman');
    t.ok(/Plywood[^]*6[^]*Ours \(24 HR\)/.test(st) && /Load bars[^]*2[^]*Ours \(24 HR\)/.test(st) && /Straps[^]*4[^]*Driver's/.test(st) && st.includes('B-301') && st.includes('B-302'), 'gear table: plywood 6 and bars 2 ours, straps 4 the driver\'s; tags B-301, B-302');
    t.eq(await sec.locator('img').count(), 1, 'the strapped photo (strap:<truck>; no fixed nose / middle / tail slots)');
    t.ok(/How it's secured and what's used/i.test(st), 'the photo is labelled "How it\'s secured and what\'s used"');
    const lp = p.locator('[data-zzb=load-plan]');
    t.ok(/2 stops/.test(await txt(lp)), 'truck sheet: the load plan says 2 stops');
    t.eq(await lp.locator('li[data-sid]').evaluateAll(xs => xs.map(x => x.dataset.sid)), [L2, L1], 'the load plan in loading order: E2E-B (stop 2, nose) then E2E-A (stop 1, by the doors)');
    t.eq(await p.locator('[data-zzb=ship-photo] img').count(), 1, 'the shipper photo the customer gave is on the truck sheet');
    const dn = await txt(p.locator('[data-zzb=done]'));
    t.ok(/Load E2E-A 11 of 12 pallets on the BOL/.test(dn) && /Load E2E-B ✓ 8 of 8 pallets on the BOL/.test(dn), 'Done section: each load counted when loaded (E2E-A 11 of 12, E2E-B 8 of 8)');
    t.eq(await sec.locator('.zzb-bars i').count(), 5, 'confidence bars');
    await sec.scrollIntoViewIfNeeded();
    await h.check(p, 'i-secured-390');
    await tallShot(p, 'i-pickup-truck-390');
    await sheet(p).getByRole('button', { name: 'Close' }).click();
    await wait(p, 200);
    await p.locator('nav.zz-tabs button', { hasText: 'Inventory' }).first().click();
    await wait(p, 400);
    const g = await calc(p, (hh, d) => hh.ZZgearOut(d, 'cu_altex'));
    const tiles = await p.locator('[data-zzb=gear] .zzb-g4 > div').evaluateAll(xs => xs.map(x => x.querySelector('b').innerText.trim()));
    t.ok(g.plywood === 6 && g.bars === 2 && g.straps === 0 && g.airbags === 0 && g.tags.join() === 'B-301,B-302', 'ZZgearOut(Altex): 6 plywood, 2 bars, tags B-301, B-302');
    t.eq(tiles, ['6', '2', '0', '0'], '"Our gear with you": 6 plywood, 2 load bars, 0 straps, 0 airbags');
    const gt = await txt(p.locator('[data-zzb=gear]'));
    t.ok(gt.includes('B-301') && gt.includes('B-302'), '"Our gear with you" lists the tags B-301, B-302');
    const plan = p.locator('[data-zzb=plan]');
    t.ok((await txt(plan)).includes('$2,000 per 6 months'), 'securement plan card: $2,000 per 6 months');
    await plan.getByRole('button', { name: "I'm interested" }).click();
    await wait(p, 600);
    const d = await h.readDoc(p), al = d.customers.find(c => c.id === 'cu_altex');
    t.ok(al.securementInterest && al.securementInterestBy && al.rates === null && al.pin === '7788', 'saved: securementInterest (rates and PIN untouched)');
    t.eq((d.accountChat.cu_altex || []).filter(m => /securement plan/i.test(m.text)).length, 1, 'one account-chat note to the office');
    t.ok((await txt(plan)).includes("We'll call you") && await plan.getByRole('button', { name: "I'm interested" }).count() === 0, 'the card says "We\'ll call you" and the button is gone (it can only be sent once)');
    await plan.scrollIntoViewIfNeeded();
    await h.check(p, 'i-inventory-390');
    await p.setViewportSize(DESK);
    await h.check(p, 'i-inventory-1400', { full: true });
  }

  /* ================= j) alerts: a contact, the Outbox, Friday summaries ================= */
  t.section('j) customer alerts sheet; office Outbox rows, recipients and channels; Friday queue');
  {
    let p = await as('customer');
    await p.getByRole('button', { name: 'Alerts and settings' }).click();
    await wait(p, 300);
    const al = p.locator('[data-zzb=alerts]');
    t.ok(await al.locator('input[value="dispatch@altex.example"]').count() === 1 && await al.locator('input[value="775-555-0100"]').count() === 1, 'the sheet starts with a contact built from the account (email and cell)');
    await al.getByRole('button', { name: '+ Add a contact' }).click();
    await wait(p, 150);
    const c2 = al.locator('[data-zzb=contact]').nth(1);
    await c2.getByLabel('Name').fill('Dana Dispatch');
    await c2.getByLabel('Cell (for texts)').fill('775-555-0199');
    await c2.locator('input[type=email]').fill('dana@altex.example');
    await c2.getByRole('button', { name: 'Turn all off' }).click();
    for (const [ev, ch] of [['done', 'text'], ['damage', 'email'], ['eta', 'text'], ['started', 'text']]) await c2.locator(`input[data-ev=${ev}][data-ch=${ch}]`).check();
    await tallShot(p, 'j-alerts-390');
    await al.getByRole('button', { name: 'Save', exact: true }).click();
    await wait(p, 500);
    let d = await h.readDoc(p);
    const cs = d.customers.find(c => c.id === 'cu_altex').contacts;
    const on = c => Object.entries(c.alerts).flatMap(([k, v]) => ['text', 'email'].filter(x => v[x]).map(x => k + ':' + x)).sort();
    t.ok(cs.length === 2 && cs[0].email === 'dispatch@altex.example' && cs[0].phone === '775-555-0100' && cs[1].name === 'Dana Dispatch' && cs[1].id, 'saved: 2 contacts (the account one and Dana)');
    t.eq(on(cs[1]), ['damage:email', 'done:text', 'eta:text', 'started:text'], 'saved: Dana gets done by text, damage by email (plus ETA and started by text)');
    t.eq(on(cs[0]), ['arrived:text', 'booked:email', 'damage:email', 'damage:text', 'done:email', 'friday:email', 'secured:email', 'waiting:text'], 'saved: the account contact keeps the default choices');

    p = await as('office', DESK);
    await p.locator('div.fixed.bottom-0 button', { hasText: /^Outbox$/ }).first().click();
    await wait(p, 400);
    const ot0 = norm(await h.text(p));
    t.ok(ot0.includes('Not connected yet — this is exactly what would be sent. Send urgent ones by hand.') && !/\bTexted\b|\bwas sent\b/i.test(ot0), 'Outbox banner: not connected yet, nothing claims it was sent');
    await p.locator('select[aria-label="Company"]').selectOption('cu_altex');
    await wait(p, 300);
    d = await h.readDoc(p);
    const t1 = T(d, TID), t2 = T(d, PID);
    const A0 = 'dispatch@altex.example', A0P = '775-555-0100', DP = '775-555-0199', DE = 'dana@altex.example';
    const want = [
      [`booked:${TID}:0:email`, A0], [`eta:${TID}:${t1.eta.updatedAt}:1:sms`, DP], [`arrived:${TID}:0:sms`, A0P], [`started:${TID}:1:sms`, DP],
      [`damage:${XID}:0:sms`, A0P], [`damage:${XID}:0:email`, A0], [`damage:${XID}:1:email`, DE], [`done:${TID}:0:email`, A0], [`done:${TID}:1:sms`, DP],
      [`booked:${PID}:0:email`, A0], [`arrived:${PID}:0:sms`, A0P], [`started:${PID}:1:sms`, DP], [`done:${PID}:0:email`, A0], [`done:${PID}:1:sms`, DP], [`secured:${PID}:0:email`, A0]];
    const rows = await p.locator('[data-msg]').evaluateAll(xs => xs.map(x => [x.dataset.msg, x.innerText.replace(/\s+/g, ' ')]));
    const mine = rows.filter(([id]) => id.includes(TID) || id.includes(PID) || id.includes(XID));
    const miss = want.filter(([id, to]) => !mine.some(([i2, tx]) => i2 === id && tx.includes(to)));
    t.ok(!miss.length, `Outbox lists booked, ETA, checked in, started, damage, done and secured for the day's two trucks, each to the right person by the right channel (${want.length} rows)` + (miss.length ? ' MISSING ' + miss.map(x => x[0]).join(', ') + ' HAVE ' + mine.map(x => x[0]).join(', ') : ''));
    const extra = mine.filter(([id]) => !want.some(w => w[0] === id) && !/^sms:/.test(id));
    t.ok(!extra.length, 'no other customer messages for them: Dana gets no booking or checked-in alerts, the account contact no ETA or started ones' + (extra.length ? ' EXTRA ' + extra.map(x => x[0]).join(', ') : ''));
    t.ok(mine.every(([id, tx]) => /:sms$|^sms:/.test(id) ? /TEXT/.test(tx) : /EMAIL/.test(tx)), 'each row shows its channel (TEXT / EMAIL)');
    const drv = rows.filter(([id]) => id === `sms:released:${TID}:es`);
    t.ok(drv.length === 1 && drv[0][1].includes('775-555-0142'), 'the driver\'s "released" text, in Spanish (chosen at the kiosk), to 775-555-0142');
    await h.check(p, 'j-outbox-1400');
    await p.setViewportSize(PHONE);
    await p.evaluate(() => window.scrollTo(0, 0));
    await h.check(p, 'j-outbox-390');
    await p.setViewportSize(DESK);
    // Friday summaries: one entry per customer who had trucks this week, has it on and has an address
    await p.getByRole('button', { name: 'Clear filters' }).click().catch(() => {});
    await p.getByRole('button', { name: 'Friday summaries' }).click();
    await wait(p, 300);
    const elig = await calc(p, (hh, dd) => dd.customers.filter(c => c.fridaySummary !== false && hh.ZZweek(dd, c.id, Date.now()).trucks > 0
      && hh.ZZrecips(c, 'friday').some(r => r.channels.some(ch => String(ch === 'sms' ? r.phone : r.email).trim()))).map(c => c.id).sort());
    t.ok(elig.includes('cu_altex'), '(customers due a Friday summary: ' + elig.join(', ') + ')');
    await p.getByRole('button', { name: 'Queue Friday summaries' }).click();
    await wait(p, 700);
    d = await h.readDoc(p);
    let fr = (d.zzOutbox || []).filter(o => o.event === 'friday');
    t.eq([...new Set(fr.map(o => o.customerId))].sort(), elig, 'Queue Friday summaries: one entry for each customer due one');
    const wk = await calc(p, (hh, dd) => hh.ZZweek(dd, 'cu_altex', Date.now()));
    const ab = fr.find(o => o.customerId === 'cu_altex') || {};
    t.ok(fr.length === elig.length && ab.to === A0 && ab.channel === 'email' && wk.done >= 2 && ab.body.includes(`Trucks: ${wk.trucks} (${wk.done} done)`) && ab.body.includes('Our gear still with you: 6 plywood sheets, 2 load bars (tags B-301, B-302)'),
      `Altex's summary goes to the account email (Dana has Friday off): ${wk.trucks} trucks (${wk.done} done, ours included), our gear with them`);
    t.ok(norm(await h.text(p)).includes(`Queued ${elig.length} Friday summar`) && norm(await h.text(p)).includes('not sent'), 'toast: the count, not sent');
    await h.check(p, 'j-friday-1400');
    await p.getByRole('button', { name: 'Queue Friday summaries' }).click();
    await wait(p, 700);
    d = await h.readDoc(p);
    t.eq((d.zzOutbox || []).filter(o => o.event === 'friday').length, fr.length, 'a second click queues 0');
    t.ok(/Nothing new (to )?queue/.test(norm(await h.text(p))), 'toast: nothing new queued');
  }

  /* ================= k) office yard board, door map, TV ================= */
  t.section('k) office Yard board tiles match the data; door map colours; TV yard list in check-in order');
  {
    const p = await as('office', DESK);
    await p.locator('div.fixed.bottom-0 button', { hasText: /^Yard$/ }).first().click();
    await wait(p, 400);
    const d = await h.readDoc(p), ms = v => Date.parse(v);
    const DOORS = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8'], act2 = x => x.stage !== 'departed' && x.stage !== 'cancelled';
    const fmt = v => { const m = Math.floor(Math.max(0, v) / MIN), hh = Math.floor(m / 60); return hh ? `${hh}h ${m % 60}m` : `${m}m`; };
    const yard = d.trailers.filter(x => x.arrivedAt && (!x.dock || x.dock === 'YD') && x.stage === 'arrived').sort((a, b) => ms(a.arrivedAt) - ms(b.arrivedAt));
    const doors = d.trailers.filter(x => act2(x) && DOORS.includes(x.dock));
    /* the tiles worked out from the saved data, by the rules on the board (plan 3.E), at a given moment */
    const tilesAt = now => {
      const day = dockYmd(now);
      const done = d.trailers.filter(x => x.workDoneAt && x.stage !== 'cancelled' && dockYmd(ms(x.workDoneAt)) === day);
      const started = d.trailers.filter(x => x.stage !== 'cancelled' && x.arrivedAt && x.workStartedAt && dockYmd(ms(x.arrivedAt)) === day);
      const avg = started.length ? started.reduce((a, x) => a + Math.max(0, ms(x.workStartedAt) - ms(x.arrivedAt)), 0) / started.length : null;
      const waitingNow = d.trailers.filter(x => act2(x) && x.arrivedAt && !x.workStartedAt && !x.workDoneAt && x.stage !== 'done');
      const longest = waitingNow.reduce((a, x) => Math.max(a, now - ms(x.arrivedAt)), 0);
      const kept = done.filter(x => Math.round((ms(x.workDoneAt) - ms(x.arrivedAt)) / MIN) <= 120).length;
      return { done, want: { yard: String(yard.length), doors: String(doors.length), done: String(done.length), avg: avg == null ? '—' : fmt(avg), longest: waitingNow.length ? fmt(longest) : 'None', promise: done.length ? Math.round(100 * kept / done.length) + '%' : '—' } };
    };
    const nowA = await p.evaluate(() => Date.now());
    const got = {};
    for (const k of ['yard', 'doors', 'done', 'avg', 'longest', 'promise']) got[k] = (await p.locator(`[data-stat-value="${k}"]`).first().innerText()).trim();
    const nowB = await p.evaluate(() => Date.now());
    /* the board redraws on its own clock tick, so the number on screen can be up to a minute behind the moment we read it */
    const A = tilesAt(nowA), B = tilesAt(nowB), A0 = tilesAt(nowA - MIN), done = A.done;
    const want = [B, A, A0].map(x => x.want).find(w => JSON.stringify(got) === JSON.stringify(w)) || A.want;
    t.eq(got, want, `tiles match the data: ${want.yard} in yard, ${want.doors} at doors, ${want.done} done today, avg wait ${want.avg}, longest ${want.longest}, promise kept ${want.promise}`);
    t.ok(done.some(x => x.id === TID) && done.some(x => x.id === PID), '(the drop and the pickup are both in "done today")');
    await h.check(p, 'k-yard-1400', { full: true });
    await p.setViewportSize(PHONE);
    await h.check(p, 'k-yard-390');
    await p.setViewportSize(DESK);
    await p.locator('div.fixed.bottom-0 button', { hasText: /^Board$/ }).first().click();
    await wait(p, 400);
    const n1 = await p.evaluate(() => Date.now());
    const borders = await p.evaluate(ds => Object.fromEntries(ds.map(dd => { const b = [...document.querySelectorAll('button')].find(x => x.innerText.trim().startsWith(dd + '\n')); return [dd, b ? getComputedStyle(b).borderTopColor : null]; })), DOORS);
    const n2 = await p.evaluate(() => Date.now());
    /* past the promise: more than 120 whole minutes from check-in to done (or to now) */
    const lateAt = (x, now) => x.arrivedAt ? Math.floor(((x.workDoneAt ? ms(x.workDoneAt) : now) - ms(x.arrivedAt)) / MIN) > 120 : x.dockedAt ? now - ms(x.dockedAt) > 120 * MIN : false;
    const wantAt = now => Object.fromEntries(DOORS.map(dd => { const x = doors.find(y => y.dock === dd); return [dd, !x ? 'free' : lateAt(x, now) ? RGB.red : RGB.orange]; }));
    const okAt = w => DOORS.every(dd => w[dd] === 'free' ? borders[dd] !== RGB.red && borders[dd] !== RGB.orange : borders[dd] === w[dd]);
    const wantB = okAt(wantAt(n2)) ? wantAt(n2) : wantAt(n1), okB = okAt(wantB);
    t.ok(okB, 'door map: a door is red when its truck is past the 2-hour promise, orange when busy (' + DOORS.map(dd => dd + ':' + (wantB[dd] === RGB.red ? 'red' : wantB[dd] === RGB.orange ? 'orange' : 'free')).join(' ') + ')');
    await p.getByText('Doors', { exact: true }).first().scrollIntoViewIfNeeded().catch(() => {});
    await h.check(p, 'k-board-1400');

    for (const vp of [DESK, TABLET, PHONE]) {
      const tv = await page('#stations', vp);
      await tv.getByText('Open the dock board').click();
      await wait(tv, 500);
      const list = await tv.evaluate(() => [...document.querySelectorAll('div.rounded-lg.p-3.flex.items-center.gap-3')].map(e => e.innerText.replace(/\s+/g, ' ').trim()));
      const wantL = yard.map((x, k) => `#${k + 1} ${x.truck}`);
      t.ok(list.length === wantL.length && list.every((l, k) => l.startsWith(wantL[k])), `TV @${vp.width}: yard list in check-in order with # (${list.map(l => l.split(' ').slice(0, 2).join(' ')).join(', ')})`);
      const heads = await tv.evaluate(() => [...document.querySelectorAll('div.rounded-xl.p-4')].map(c => { const hd = c.firstElementChild, k = [...hd.children].map(x => x.getBoundingClientRect());
        return { t: hd.innerText.replace(/\s+/g, ' '), fits: hd.scrollWidth <= hd.clientWidth + 1, apart: k.length < 2 || k[1].left >= k[0].right + 4 || k[1].top >= k[0].bottom - 4 }; }));
      t.ok(heads.length === 8 && heads.every(x => x.fits && x.apart), `TV @${vp.width}: each door number and its clock stay apart and inside the card (` + heads.filter(x => !x.fits || !x.apart).map(x => x.t).join(', ') + ')');
      await h.check(tv, 'k-tv-' + vp.width);
    }
  }

  /* ================= l) crew logs 2 bars back with one tag; the customer's gear totals drop ================= */
  t.section('l) crew Gear tab: 2 load bars back with one tag; the customer\'s gear totals drop');
  {
    let p = await as('crew');
    await p.getByRole('button', { name: /^Gear/ }).first().click();
    await wait(p, 400);
    const out = p.locator('[data-zz=gearout]').filter({ hasText: 'Altex Transportation' });
    t.ok(await out.count() === 1 && /6 Plywood sheets · 2 Load bars/.test(await out.innerText()) && /B-301/.test(await out.innerText()) && /B-302/.test(await out.innerText()), 'crew Gear: "Out with customers now" lists Altex: 6 plywood, 2 load bars, tags B-301, B-302');
    await out.getByRole('button', { name: 'Log gear back' }).click();
    await wait(p, 300);
    const form = p.locator('#zz-gear-back');
    await p.locator('[data-type=bars]').click();
    await form.locator('button[aria-label^="One more"]').click();
    await form.getByRole('button', { name: 'B-301' }).click();
    await h.check(p, 'l-gear-form-390');
    await form.getByRole('button', { name: 'Log gear back' }).click();
    await wait(p, 600);
    const d = await h.readDoc(p);
    const back = (d.zzGear || []).filter(g => g.dir === 'back');
    t.ok(back.length === 1 && back[0].customerId === 'cu_altex' && back[0].type === 'bars' && back[0].qty === 2 && back[0].tags.join() === 'B-301' && back[0].src === 'return' && back[0].by === 'Roman', 'saved: a ledger row, 2 load bars back from Altex with tag B-301, by Roman');
    const g = await calc(p, (hh, dd) => hh.ZZgearOut(dd, 'cu_altex'));
    t.ok(g.plywood === 6 && g.bars === 0 && g.tags.join() === 'B-302', 'ZZgearOut(Altex): 6 plywood, 0 bars, only tag B-302 still out');
    await h.check(p, 'l-gear-390');
    p = await as('customer');
    await p.locator('nav.zz-tabs button', { hasText: 'Inventory' }).first().click();
    await wait(p, 400);
    const tiles = await p.locator('[data-zzb=gear] .zzb-g4 > div').evaluateAll(xs => xs.map(x => x.querySelector('b').innerText.trim()));
    const gt = await txt(p.locator('[data-zzb=gear]'));
    t.eq(tiles, ['6', '0', '0', '0'], 'customer "Our gear with you" drops to 6 plywood, 0 load bars');
    const tagPart = (gt.split('Tag numbers on our gear')[1] || '').split('Last moves')[0];
    t.ok(tagPart.includes('B-302') && !tagPart.includes('B-301') && /Back to us: 2 load bars/.test(gt), 'only tag B-302 is still out; "Back to us: 2 load bars" is in the last moves');
    await p.locator('[data-zzb=gear]').scrollIntoViewIfNeeded();
    await h.check(p, 'l-customer-gear-390');
  }

  /* ================= m) a consolidated PACK: packing photos, securing photos, a signed manifest; Altex sees only its lines ================= */
  t.section('m) crew PACKs a consolidated trailer (Altex + another company): packing photos, Secure with what\'s-used photos, signed manifest; the customer sees only its own lines');
  {
    let p = await as('office', DESK);
    // two loads on the floor: one of Altex and one of another company (Nick's demo), onto a new outbound trailer at a free door
    const pick = await calc(p, (hh, d) => {
      const T0 = new Set(d.trailers.filter(t => t.direction === 'outbound' && t.stage !== 'departed' && t.stage !== 'cancelled').map(t => t.id));
      const free = d.shipments.filter(s => s.receivedAt && !s.shippedAt && !s.loadedAt && (!s.trailerOutId || !T0.has(s.trailerOutId)));
      const a = free.find(s => s.customerId === 'cu_altex'), o = free.find(s => s.customerId && s.customerId !== 'cu_altex');
      const busy = new Set(d.trailers.filter(t => t.dock && /^D\d$/.test(t.dock) && !['departed', 'cancelled'].includes(t.stage)).map(t => t.dock));
      const door = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8'].find(x => !busy.has(x)) || null;
      return { a: a && a.id, ar: a && a.ref, o: o && o.id, or: o && o.ref, oc: o && o.customerId, door, d6: (d.trailers.find(t => t.dock === 'D6' && !['departed', 'cancelled'].includes(t.stage)) || {}).id || null };
    });
    t.ok(pick.a && pick.o, `(floor loads for the pack: Altex ${pick.ar}, ${pick.oc} ${pick.or})`);
    if (!pick.door && pick.d6) await act(p, 'patchTrailer', pick.d6, { stage: 'departed', dock: null, departedAt: iso(await p.evaluate(() => Date.now())) });
    const door = pick.door || 'D6';
    const now0 = await p.evaluate(() => Date.now());
    await act(p, 'addTrailer', { id: 'e2e_pk', bookedVia: 'office', truck: '4419', trailer: 'T419', carrier: 'Altex Transportation', direction: 'outbound', jobType: 'Consolidate & reload', customerId: 'cu_altex',
      scheduledAt: iso(now0), pickupIds: [pick.a, pick.o], notes: '' });
    await act(p, 'patchTrailer', 'e2e_pk', { arrivedAt: iso(now0), dockedAt: iso(now0), dock: door, stage: 'at-dock', confirmedAt: iso(now0) });
    let d = await h.readDoc(p);
    t.ok(T(d, 'e2e_pk') && S(d, pick.a).trailerOutId === 'e2e_pk' && S(d, pick.o).trailerOutId === 'e2e_pk', `saved: truck 4419 (outbound, ${door}) with both loads planned onto it`);

    p = await as('crew');
    await p.getByRole('button', { name: /All trucks/ }).first().click();
    await wait(p, 400);
    const card = p.locator(':text("Truck 4419 · Trailer T419")').locator('xpath=ancestor::*[.//button[contains(@class,"rounded-lg")]][1]');
    await card.getByRole('button', { name: /^Start/ }).first().click();
    await wait(p, 600);
    t.ok(/^PACK · Consolidated trailer$/.test(norm(await p.locator('[data-zz=jobtitle]').innerText())) && /2 loads to build/.test(await p.locator('[data-zz=jobtask]').innerText()), 'the job in big words: "PACK · Consolidated trailer", "2 loads to build"');
    t.eq(await stepNames(p), ['Pack', 'Secure the load', 'Manifest', 'Wrap up'], 'PACK steps: Pack, Secure the load, Manifest, Wrap up');
    const bdg = await p.$$eval('[data-zz=jobcard] [data-zz=badge]', bs => bs.map(b => b.innerText.replace(/\s+/g, ' ').trim()));
    t.ok(bdg.length === 2 && /^1 /.test(bdg[0]) && /^2 /.test(bdg[1]), 'each load has its number badge with its PRO (' + bdg.join(' / ') + ')');
    // packing photos the whole time (the step camera and the floating one)
    await p.locator('[data-zz=step-pack] [data-zz=caminput]').first().setInputFiles(h.UPLOAD_PNG);
    await countIs(p, '[data-zz=step-pack] [data-zz=camcount]', 1);
    await p.locator('[data-zz=floatcaminput]').setInputFiles(h.UPLOAD_PNG);
    await countIs(p, '[data-zz=step-pack] [data-zz=camcount]', 2);
    for (const r of [pick.ar, pick.or]) {
      const pc = p.locator('div.rounded-lg.p-3.space-y-3').filter({ hasText: r }).first();
      await pc.getByRole('button', { name: 'Count is correct' }).click();
      await wait(p, 300);
      await pc.getByRole('button', { name: /^3\. Load it/ }).click();
      await wait(p, 500);
    }
    d = await h.readDoc(p);
    t.ok(S(d, pick.a).loadedAt && S(d, pick.o).loadedAt && T(d, 'e2e_pk').afterPhotoCount === 2, 'saved: both loads on, 2 packing photos (after:<truck>)');
    await h.check(p, 'm-pack-390');
    // Secure: what's used, a photo of it, seal, confidence, sign
    await step(p, 'Secure the load');
    const sf = p.locator('[data-zz=secureform]');
    await sf.locator('[data-gear=bars] button[aria-label^="One more"]').click();
    await sf.locator('[data-gear=airbags] button[aria-label^="One more"]').click();
    await sf.locator('[data-zz=secphotos] [data-zz=caminput]').setInputFiles([h.UPLOAD_PNG, h.UPLOAD_PNG]);
    await countIs(p, '[data-zz=secphotos] [data-zz=camcount]', 2);
    await sf.locator('input[aria-label="Seal number"]').fill('SL-4419');
    await sf.locator('[data-conf="5"]').click();
    await sf.locator('[data-zz=secchk]').check();
    await sf.locator('[data-zz=secsign]').fill('Roman');
    await sf.getByRole('button', { name: 'Save and sign' }).click();
    await wait(p, 800);
    d = await h.readDoc(p);
    const pk = T(d, 'e2e_pk');
    t.ok(pk.secure && pk.secure.photoOwner === 'strap:e2e_pk' && pk.secure.photoCount === 2 && pk.secure.confidence === 5 && pk.sealOut === 'SL-4419', 'saved: secured with 2 photos of the securing and what is used, 5/5, seal SL-4419');
    // the manifest: one line per load, prefilled; sign it
    t.ok(await p.locator('[data-zz=mfform]').count() === 1, 'saving the securement moves on to the Manifest');
    t.eq((await p.$$eval('[data-zz=mfline]', ls => ls.map(l => l.getAttribute('data-sid')))).sort(), [pick.a, pick.o].sort(), 'the manifest has one line per load, prefilled');
    await p.locator('[data-zz=mfsign]').fill('Roman');
    await h.check(p, 'm-manifest-390');
    await p.getByRole('button', { name: 'Save and sign the manifest' }).click();
    await wait(p, 800);
    d = await h.readDoc(p);
    const mf = T(d, 'e2e_pk').manifest;
    t.ok(mf && mf.lines.length === 2 && mf.signedBy === 'Roman' && mf.total === fe2(S(d, pick.a)) + fe2(S(d, pick.o)), `saved: the manifest on the truck, 2 lines, ${mf && mf.total} pallets, signed by Roman`);
    await p.getByRole('button', { name: /Wrap up & send/ }).click();
    await wait(p);
    t.ok(!(await p.getByRole('button', { name: 'Send to dispatch', exact: true }).isDisabled()), 'packed, secured, manifest signed: Send to dispatch is open');
    await p.getByRole('button', { name: 'Send to dispatch', exact: true }).click();
    await wait(p, 700);
    t.ok(T(await h.readDoc(p), 'e2e_pk').stage === 'done', 'truck 4419 is done');

    // the customer sees only the line of its own load on the manifest; never the other company
    p = await as('customer');
    await p.locator('nav.zz-tabs button', { hasText: 'Trucks' }).first().click();
    await wait(p, 300);
    await p.locator('button.zzb-card, .zz-row', { hasText: 'Truck 4419' }).first().click();
    await wait(p, 500);
    const ts = p.locator('[data-zzb=truck]');
    const mfc = ts.locator('[data-zzb=manifest]');
    const mt = await txt(mfc);
    const all = await txt(ts);
    t.ok(await mfc.locator('[data-zzb=mf-line]').count() === 1 && mt.includes(pick.ar) && !all.includes(pick.or) && /Signed by Roman/.test(mt), `customer manifest: only its own line (${pick.ar}), never the other company's load (${pick.or})`);
    const oname = await calc(p, (hh, dd, id) => (dd.customers.find(c => c.id === id) || {}).name || '', pick.oc);
    t.ok(!oname || !all.includes(oname), 'the other company\'s name is not on the customer\'s truck sheet');
    await tallShot(p, 'm-customer-manifest-390');
  }

  await ctx.close();

  /* ================= SHARED MODE: staff devices on the shared data (mock db), a customer stays local ================= */
  t.section('shared mode: office books -> crew sees it; kiosk checks it in -> crew sees it; crew starts it -> office yard board; customer stays local');
  {
    const sctx = await h.newContext({ viewport: DESK, mode: 'shared', mock: {}, timezoneId: TZ });
    const state = p => p.evaluate(() => ({ mode: window.__zz.h.sync.mode, ...window.__zz.h.sync.stats() }));
    const screenDoc = p => p.evaluate(() => window.__zz.doc);
    const dump = p => p.evaluate(() => window.__mockdb.dump());
    const writes = p => p.evaluate(() => window.__mockdb.writes.map(w => ({ op: w.op, path: w.path, bytes: w.bytes })));
    const badge = p => p.evaluate(() => { const b = document.querySelector('[data-zz="mode"]'); return b ? b.innerText : ''; });
    async function staff(role, viewport, hash) {
      for (const pg of sctx.pages()) { try { await pg.evaluate(() => localStorage.removeItem('cd6:session')); break; } catch (e) {} }
      const p = await h.open(hash || '#' + role, { context: sctx, viewport });
      if (!hash) await h.signIn(p, role);
      await ready(p);
      if (role === 'crew' && await p.getByRole('button', { name: 'Got it' }).count()) await p.getByRole('button', { name: 'Got it' }).click();
      return p;
    }
    // device 1: Nick's office (the owner; the first visit sets up the shared data); device 2: a crew phone
    const office = await staff('office', DESK);
    const crew = await staff('crew', PHONE);
    t.ok((await state(office)).mode === 'db' && (await state(crew)).mode === 'db', 'office and crew phone are both on the shared data (mode db)');
    t.ok(/Live · shared/.test(await badge(office)) && /Live · shared/.test(await badge(crew)), 'both show "Live · shared"');

    // the office books a truck on its screen
    await office.locator('div.fixed.bottom-0 button', { hasText: /^Schedule$/ }).first().click();
    await wait(office, 300);
    await office.getByRole('button', { name: 'Book a truck' }).first().click();
    await wait(office, 300);
    await office.locator('input[placeholder="Start typing the company name"]').fill('Altex');
    await wait(office, 250);
    await office.locator('.fixed.inset-0 button', { hasText: 'Altex Transportation' }).first().click();
    const at = await office.evaluate(() => Date.now()) + 2 * HOUR, dp = dockParts(at);
    await office.locator('input[type="datetime-local"]').fill(`${dp.year}-${dp.month}-${dp.day}T${dp.hour}:${dp.minute}`);
    await office.locator('input[placeholder="221"]').fill('5501');
    const t0 = Date.now();
    await office.getByRole('button', { name: 'Save appointment' }).click();
    await crew.waitForFunction(() => window.__zz.doc.trailers.some(x => x.truck === '5501'), null, { timeout: 2000 });
    const ms1 = Date.now() - t0;
    t.ok(ms1 < 2000, `the crew phone has truck 5501 ${ms1} ms after the office saved it (limit 2 s)`);
    let od = await screenDoc(office);
    const tb = od.trailers.find(x => x.truck === '5501');
    t.ok(tb && tb.bookedVia === 'office' && tb.confirmedAt && /^\d{4}$/.test(tb.code), 'saved: an office booking, confirmed, with its check-in code ' + (tb && tb.code));
    await office.evaluate(() => window.__zz.h.sync.flush(5000));
    const srv = await dump(office);
    t.ok(srv['trailers/' + tb.id] && srv['trailers/' + tb.id].code === tb.code, 'the shared database has trailers/' + tb.id);
    await crew.getByRole('button', { name: /^All trucks/ }).first().click();
    await wait(crew, 300);
    await crew.getByText(/Booked, not here yet/).first().click().catch(() => {});
    await wait(crew, 300);
    t.ok((await h.text(crew)).includes('Truck 5501'), 'the crew screen lists truck 5501');
    await crew.getByText(/Truck 5501/).first().scrollIntoViewIfNeeded();
    await h.check(crew, 'shared-crew-booking-390');

    // device 3: the kiosk tablet (a staff device on the shared data): the driver checks in with the code
    const kiosk = await staff('driver', TABLET, '#kiosk');
    t.ok((await state(kiosk)).mode === 'db', 'the kiosk tablet is on the shared data too');
    await kiosk.click('button[data-lang="en"]');
    await kiosk.getByText('I have a 4‑digit code').click();
    for (const c of tb.code) { await kiosk.click(`.zzk-keys button[data-k="${c}"]`); await kiosk.waitForTimeout(40); }
    await wait(kiosk, 200);
    const kin = kiosk.locator('[data-zz=kiosk] main input');
    await kin.nth(0).fill('Sam Shared');
    await kin.nth(1).fill('775-555-0155');
    await kiosk.getByRole('button', { name: /^Next/ }).click();
    const t1 = Date.now();
    await kiosk.getByRole('button', { name: /Skip — give papers to the office/ }).click();
    await kiosk.waitForSelector('[data-zz=kiosk-done]');
    await crew.waitForFunction(id => { const x = window.__zz.doc.trailers.find(t => t.id === id); return x && x.arrivedAt; }, tb.id, { timeout: 3000 });
    const ms2 = Date.now() - t1;
    t.ok(ms2 < 2500, `the crew phone has the kiosk check-in ${ms2} ms after the driver finished`);
    const kt = (await screenDoc(crew)).trailers.find(x => x.id === tb.id);
    t.ok(kt.checkedInBy === 'kiosk' && kt.driver === 'Sam Shared' && kt.phone === '775-555-0155' && kt.dock === 'YD', 'crew sees it: checked in at the kiosk by Sam Shared, waiting in the yard');
    const ktext = norm(await h.text(kiosk));
    const place = await crew.evaluate(id => window.__zz.h.ZZplace(window.__zz.doc, id), tb.id);
    t.ok(ktext.includes("You're checked in!") && ktext.includes("We'll text your door number to 775-555-0155."), 'the kiosk says "You\'re checked in!" and that we will text the door number to 775-555-0155');
    t.eq((await kiosk.locator('[data-zz=place]').innerText()).trim(), '#' + place, `the kiosk shows #${place} in line`);
    await h.check(kiosk, 'shared-kiosk-done-1024');
    await crew.getByRole('button', { name: /^All trucks/ }).first().click().catch(() => {});
    await wait(crew, 400);
    const ccard = crew.locator(':text("Truck 5501 · Trailer")').locator('xpath=ancestor::*[.//button[contains(@class,"rounded-lg")]][1]');
    t.ok(norm(await ccard.locator('[data-zz=placepill]').innerText()) === `#${place} in line`, `the crew card shows "#${place} in line"`);

    // a door frees up (the office sends a truck home), the crew starts truck 5501 there; the office yard board follows
    await office.locator('div.fixed.bottom-0 button', { hasText: /^Yard$/ }).first().click();
    await wait(office, 300);
    od = await screenDoc(office);
    const gone = od.trailers.find(x => x.stage === 'at-dock' && x.dock && x.dock !== 'YD');
    await office.evaluate(([id, at]) => window.__zz.actions.patchTrailer(id, { stage: 'departed', dock: null, departedAt: at }), [gone.id, iso(Date.now())]);
    await crew.waitForFunction(id => window.__zz.doc.trailers.find(x => x.id === id).stage === 'departed', gone.id, { timeout: 2000 });
    await ccard.getByRole('button', { name: 'Give it a door' }).click();
    await wait(crew, 400);
    await crew.getByRole('button', { name: 'Pick a door for this truck' }).click();
    await wait(crew, 300);
    t.ok(!(await crew.locator(`button[data-door="${gone.dock}"]`).isDisabled()), `door ${gone.dock} shows free on the crew phone`);
    await crew.locator(`button[data-door="${gone.dock}"]`).click();
    await wait(crew, 400);
    const t2 = Date.now();
    await crew.getByRole('button', { name: /^Start/ }).first().click();
    await office.waitForFunction(id => { const x = window.__zz.doc.trailers.find(t => t.id === id); return x && x.stage === 'working'; }, tb.id, { timeout: 2000 });
    const ms3 = Date.now() - t2;
    t.ok(ms3 < 2000, `the office has "working" ${ms3} ms after the crew tapped Start`);
    await office.waitForFunction(id => { const c = [...document.querySelectorAll('[data-truck="' + id + '"]')]; return c.some(x => /Door D\d/.test(x.innerText) && /Unloading/.test(x.innerText)); }, tb.id, { timeout: 2000 });
    t.ok(true, `the office yard board shows truck 5501 at door ${gone.dock}, unloading`);
    const doorsTile = (await office.locator('[data-stat-value="doors"]').first().innerText()).trim();
    const wantDoors = String((await screenDoc(office)).trailers.filter(x => x.stage !== 'departed' && x.stage !== 'cancelled' && /^D\d$/.test(x.dock || '')).length);
    t.eq(doorsTile, wantDoors, 'the office "At doors" tile matches the shared data');
    await h.check(office, 'shared-office-yard-1400');
    await h.check(crew, 'shared-crew-started-390');
    const allW = [...await writes(office), ...await writes(crew), ...await writes(kiosk)];
    t.ok(allW.every(w => w.bytes <= 240000), 'no shared write over 240 KB (' + allW.length + ' writes)');
    t.eq((await office.evaluate(() => window.__mockdb.overlaps)).length + (await crew.evaluate(() => window.__mockdb.overlaps)).length + (await kiosk.evaluate(() => window.__mockdb.overlaps)).length, 0, 'never two writes at once to one document');

    // a customer on the public link (no db capability) in the same browser stays local and writes nothing shared
    for (const pg of sctx.pages()) { try { await pg.evaluate(() => localStorage.removeItem('cd6:session')); break; } catch (e) {} }
    const before = JSON.stringify(await dump(office));
    const cp = await sctx.newPage();
    await cp.addInitScript(() => { if (window.__mockdb) window.__mockdb.opts.caps = ['user']; else window.__MOCK = Object.assign({}, window.__MOCK || {}, { caps: ['user'] }); });
    cp.on('pageerror', e => h.errors.push('[shared customer] pageerror: ' + (e && e.message)));
    await cp.setViewportSize(PHONE);
    await cp.goto(h.origin + '/#customer');
    await h.waitLoaded(cp);
    await h.signIn(cp, 'customer');
    await ready(cp);
    t.ok(await cp.evaluate(() => window.__mockdb.opts.caps.join()) === 'user', '(the customer page has no db capability, like the public link)');
    t.eq((await state(cp)).mode, 'local', 'the customer page stays in local mode');
    const cdoc0 = await screenDoc(cp);
    t.ok(!cdoc0.trailers.some(x => x.truck === '5501') && !/Live · shared|Saved on this device only/.test(await h.text(cp)), 'it never sees the shared data (no truck 5501) and has no mode badge');
    await act(cp, 'addTrailer', { id: 'tCustLocal', truck: '6606', direction: 'inbound', customerId: 'cu_altex', scheduledAt: iso(Date.now() + 26 * HOUR), bookedVia: 'client', lines: [{ ref: 'LOC-1', units: { std: 4 } }] });
    const local = await h.readDoc(cp);
    t.ok(local.trailers.some(x => x.id === 'tCustLocal'), 'its booking is saved in this browser only');
    await wait(cp, 500);
    t.ok((await writes(cp)).length === 0 && JSON.stringify(await dump(office)) === before, 'nothing was written to the shared database (writes 0, the database is unchanged)');
    t.ok(!(await screenDoc(office)).trailers.some(x => x.id === 'tCustLocal'), 'the office never gets the customer\'s local booking');
    await h.check(cp, 'shared-customer-local-390');
    await sctx.close();
  }
});
