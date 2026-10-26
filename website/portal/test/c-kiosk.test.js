/* Stream C acceptance checks (PLAN.md 3.C): the new kiosk (ZZKiosk), the driver ETA page (ZZEta), the
   #kiosk / #tv / #eta links, ZZdriverText. Runs the kiosk at 1024x768 and 390x844 (plus 1400x900 screenshots).
     node website/portal/test/run.js c --dist <build folder>
   Screenshots: <scratchpad>/shots/<prefix>-c-*.png */
const H = require('./harness');
const { PHONE, DESK, TABLET } = H;

const MIN = 6e4, HR = 36e5;
const iso = ms => new Date(ms).toISOString();
const norm = s => String(s || '').replace(/[  ]/g, ' ');

/* the base demo doc plus kiosk fixtures; every truck gets a real code so codes never collide by chance */
async function seedDoc(h, o = {}) {
  const d = await h.baseDoc();
  const now = Date.now();
  d.trailers.forEach((t, k) => { if (!t.code) t.code = String(3100 + k); });
  const base = { carrier: 'Altex Transportation', customerId: 'cu_altex', needsMatch: false, direction: 'inbound', dock: null, arrivedAt: null, dockedAt: null,
    workStartedAt: null, workDoneAt: null, departedAt: null, sealIn: '', sealOut: '', sealVerified: null, notes: '', chat: [], instructions: '', workStartedBy: null, workDoneBy: null };
  d.trailers.push(
    { ...base, id: 'zzk_today', code: '4821', driver: 'Sam Driver', phone: '775-555-0199', truck: '4521', trailer: 'T77', scheduledAt: iso(now - 20 * MIN), stage: 'scheduled' },
    { ...base, id: 'zzk_tomorrow', code: '4822', driver: 'Tom Morrow', phone: '', truck: '9911', trailer: 'T99', scheduledAt: iso(now + 30 * HR), stage: 'scheduled' },
    { ...base, id: 'zzk_here', code: '5150', driver: 'Hana Here', phone: '775-555-0150', truck: '5150', trailer: 'T50', scheduledAt: iso(now - 60 * MIN), stage: 'arrived',
      dock: 'YD', arrivedAt: iso(now - 10 * MIN), checkedInBy: 'kiosk', driverLang: 'en' },
    { ...base, id: 'zzk_eta', code: '6262', driver: 'Ivan Petrov', phone: '775-555-0162', truck: '6262', trailer: 'T62', scheduledAt: iso(now + 3 * HR), stage: 'scheduled', driverLang: 'ru' },
    { ...base, id: 'zzk_cx', code: '7070', driver: 'Cory Cancel', phone: '775-555-0170', truck: '7070', trailer: 'T70', scheduledAt: iso(now + 2 * HR), stage: 'cancelled', cancelledAt: iso(now - 60 * MIN), cancelledBy: 'Customer' }
  );
  d.shipments.push({ id: 'zzk_s1', ref: 'ALX-77', customerId: 'cu_altex', trailerInId: 'zzk_today', trailerOutId: null, origin: '', dest: 'Reno, NV', lane: 'reno',
    units: { std: 14, lg: 0, crate: 0 }, weight: 0, commodity: 'Dry goods', status: 'expected', receivedAt: null, shippedAt: null, afterHours: false, rewrapPallets: 0, labor: [],
    row: '', deliverBy: null, service: null, bol: '', qc: { condition: '', counted: null, note: '' }, exceptions: [], adjustments: [], photoCount: 0, invoiceId: null, chat: [], po: '', loadNotes: '', touches: [] });
  if (o.freeDoor) { const t = d.trailers.find(x => x.dock === 'D4'); Object.assign(t, { stage: 'departed', dock: null, departedAt: iso(now - 5 * MIN) }); }
  return d;
}

const kioskStep = p => p.getAttribute('[data-zz=kiosk]', 'data-step');
async function openKiosk(h, viewport, seed, extra = {}) {
  const p = await h.open('#stations', { viewport, seed, ...extra });
  await p.getByText('Open driver check-in').click();
  await p.waitForSelector('[data-zz=kiosk]');
  return p;
}
async function keypad(p, digits) {
  for (const d of digits) { await p.click(`.zzk-keys button[data-k="${d}"]`); await p.waitForTimeout(40); }
  await p.waitForTimeout(150);
}
const trailer = (doc, id) => doc.trailers.find(t => t.id === id);

H.main('c-kiosk', async (h, t) => {
  /* ---------------- language first ---------------- */
  t.section('language first, six languages, kiosk language stays in the kiosk');
  for (const [vw, viewport] of [['1024', TABLET], ['390', PHONE], ['1400', DESK]]) {
    const p = await openKiosk(h, viewport, await seedDoc(h));
    t.eq(await kioskStep(p), 'lang', `#stations -> Driver check-in opens the language screen @${vw}`);
    t.eq(await p.locator('[data-zz=kiosk] button[data-lang]').count(), 6, `six language buttons @${vw}`);
    const s = norm(await h.text(p));
    t.ok(['Choose your language', 'Elija su idioma', 'Выберите язык', 'Оберіть мову', 'ਆਪਣੀ ਭਾਸ਼ਾ ਚੁਣੋ', 'अपनी भाषा चुनें'].every(x => s.includes(x)), `heading in all six languages @${vw}`);
    t.ok(['English', 'Español', 'Русский', 'Українська', 'ਪੰਜਾਬੀ', 'हिन्दी'].every(x => s.includes(x)), `native names on the buttons @${vw}`);
    await h.check(p, `lang-${vw}`);
    await p.click('button[data-lang="es"]');
    await p.waitForTimeout(150);
    const s2 = norm(await h.text(p));
    t.ok(s2.includes('¿Cómo quiere registrarse?') && s2.includes('Tengo un código de 4 dígitos') && s2.includes('Sin cita'), `after Español the next screen is in Spanish @${vw}`);
    t.ok(await p.evaluate(() => localStorage.getItem('cd6:lang')) === null, `the crew language (cd6:lang) is not changed @${vw}`);
    await h.check(p, `start-${vw}`);
    await p.context().close();
  }

  /* ---------------- code path, start to finish ---------------- */
  t.section('code path: code, details, paperwork photo, check-in, done');
  for (const [vw, viewport, freeDoor] of [['1024', TABLET, false], ['390', PHONE, true], ['1400', DESK, false]]) {
    const p = await openKiosk(h, viewport, await seedDoc(h, { freeDoor }));
    await p.click('button[data-lang="es"]');
    await p.getByText('Tengo un código de 4 dígitos').click();
    t.eq(await kioskStep(p), 'code', `code keypad @${vw}`);
    await keypad(p, '48');
    await h.check(p, `code-${vw}`);
    await keypad(p, '21');
    t.eq(await kioskStep(p), 'details', `4 digits continue by themselves to the details @${vw}`);
    const vals = await p.$$eval('[data-zz=kiosk] main input', xs => xs.map(x => x.value));
    t.ok(vals.includes('Sam Driver') && vals.includes('775-555-0199') && vals.includes('4521') && vals.includes('T77'), `details filled in from the booking @${vw}`);
    t.ok(norm(await h.text(p)).includes('Le mandaremos su número de puerta por texto a este teléfono.'), `cell hint says we will text the door number @${vw}`);
    await h.check(p, `details-${vw}`);
    await p.getByRole('button', { name: /Siguiente/ }).click();
    t.eq(await kioskStep(p), 'scan', `paperwork step @${vw}`);
    const fi = p.locator('[data-zz=kiosk] input[type=file]');
    t.ok(await fi.getAttribute('accept') === 'image/*' && await fi.getAttribute('capture') === 'environment' && await fi.evaluate(x => x.multiple), `camera file input (image/*, environment, multiple) @${vw}`);
    t.ok(norm(await h.text(p)).includes('Saltar — dar los papeles a la oficina'), `skip button before any photo @${vw}`);
    await fi.setInputFiles(h.UPLOAD_PNG);
    await p.waitForFunction(() => document.querySelectorAll('[data-zz=kiosk] main img').length === 1);
    t.ok(norm(await h.text(p)).includes('1 página'), `thumbnail and page count after the photo @${vw}`);
    await h.check(p, `scan-${vw}`);
    const before = await h.readDoc(p);
    t.ok(!trailer(before, 'zzk_today').arrivedAt, 'nothing written before the check-in');
    await p.getByRole('button', { name: /Listo — registrarme/ }).click();
    await p.waitForSelector('[data-zz=kiosk-done]');
    await p.waitForTimeout(300);
    const s = norm(await h.text(p));
    t.ok(s.includes('¡Ya está registrado!'), `done screen @${vw}`);
    const doc = await h.readDoc(p), tr = trailer(doc, 'zzk_today');
    t.ok(tr.arrivedAt && tr.driverLang === 'es' && tr.checkedInBy === 'kiosk' && tr.paperCount === 1 && tr.paperBy === 'Driver at kiosk', `truck saved: driverLang es, checkedInBy kiosk, paperCount 1 @${vw}`);
    const photos = JSON.parse(await p.evaluate(() => localStorage.getItem('cdweb:cd6:photos:paper:zzk_today')) || '[]');
    t.ok(photos.length === 1 && /^data:image\/jpeg/.test(photos[0].src), `paperwork photo stored under paper:<tid> @${vw}`);
    if (freeDoor) {
      t.ok(tr.dock === 'D4' && s.includes('Vaya a la puerta D4') && await p.locator('[data-zz=door]').innerText() === 'D4', `free door: "go to door D4" @${vw}`);
    } else {
      const place = await p.evaluate(() => window.__zz.h.ZZplace(window.__zz.doc, 'zzk_today'));
      t.ok(tr.dock === 'YD' && place >= 1 && (await p.locator('[data-zz=place]').innerText()) === '#' + place, `doors full: place in line #${place} @${vw}`);
      t.ok(s.includes('Le mandaremos su número de puerta por texto al 775-555-0199.') && s.includes('Quédese con su camión'), `"we'll text <cell> your door number" and stay with the truck @${vw}`);
      t.ok(/Unos \d+ (min|h)/.test(s), `estimated wait shown @${vw}`);
    }
    t.ok(/Empezamos de nuevo en \d+ s/.test(s) && s.includes('Terminar'), `30 s countdown and Finish @${vw}`);
    await h.check(p, `done-${vw}`);
    if (!freeDoor) {
      await p.getByRole('button', { name: /Imprimir orden de trabajo/ }).click();
      await p.waitForTimeout(200);
      t.ok(norm(await p.evaluate(() => document.body.innerText)).includes('Work order · truck 4521'), 'Print work order opens the work order (no automatic printing)');
      await p.getByRole('button', { name: 'Close', exact: true }).click();
      await p.waitForTimeout(150);
    }
    await p.getByRole('button', { name: 'Terminar' }).click();
    await p.waitForTimeout(150);
    t.eq(await kioskStep(p), 'lang', `Finish goes back to the language screen @${vw}`);
    await p.context().close();
  }

  /* ---------------- codes ---------------- */
  t.section('codes: already checked in, wrong code, customer PIN');
  for (const [vw, viewport] of [['1024', TABLET], ['390', PHONE]]) {
    const p = await openKiosk(h, viewport, await seedDoc(h));
    const doc0 = await h.readDoc(p);
    await p.click('button[data-lang="en"]');
    await p.getByText('I have a 4‑digit code').click();
    await keypad(p, '5150');
    t.eq(await kioskStep(p), 'status', `already checked in: straight to its status @${vw}`);
    const s = norm(await h.text(p));
    t.ok(s.includes("You're already checked in") && /#\d+/.test(await p.locator('[data-zz=place]').innerText()), `status shows the place in line @${vw}`);
    await h.check(p, `already-${vw}`);
    t.eq(trailer(await h.readDoc(p), 'zzk_here').arrivedAt, trailer(doc0, 'zzk_here').arrivedAt, `arrivedAt unchanged @${vw}`);
    await p.getByRole('button', { name: 'Finish' }).click();
    await p.click('button[data-lang="en"]');
    await p.getByText('I have a 4‑digit code').click();
    await keypad(p, '0000');
    t.ok(norm(await h.text(p)).includes("We can't find that code. Check it and try again.") && await kioskStep(p) === 'code', `wrong code: friendly retry @${vw}`);
    await h.check(p, `code-wrong-${vw}`);
    t.ok(await p.evaluate(() => window.__zz.doc.customers.some(c => c.pin === '7788') && window.__zz.h.ZZbyCode(window.__zz.doc, '7788') === null), 'Altex PIN 7788 is no truck code');
    await keypad(p, '7788');
    t.ok(norm(await h.text(p)).includes("We can't find that code.") && await kioskStep(p) === 'code', `customer PIN 7788 does not find a truck @${vw}`);
    t.eq(JSON.stringify((await h.readDoc(p)).trailers), JSON.stringify(doc0.trailers), `codes wrote nothing @${vw}`);
    await p.context().close();
  }

  /* ---------------- company path: today's trucks only ---------------- */
  t.section('company path: search, today and late trucks only');
  for (const [vw, viewport] of [['1024', TABLET], ['390', PHONE]]) {
    const p = await openKiosk(h, viewport, await seedDoc(h));
    await p.click('button[data-lang="en"]');
    await p.getByText('Company name', { exact: true }).click();
    t.eq(await kioskStep(p), 'company', `company search @${vw}`);
    await p.fill('[data-zz=kiosk] main input', 'altecks');
    await p.waitForTimeout(150);
    await h.check(p, `company-${vw}`);
    await p.getByText('Altex Transportation').first().click();
    await p.waitForTimeout(150);
    t.eq(await kioskStep(p), 'truck', `tapping the company shows its trucks @${vw}`);
    const s = norm(await h.text(p));
    t.ok(s.includes('Truck 4521') && s.includes('14 pallets') && s.includes('Late'), `today's late truck listed with time, pallets and Late @${vw}`);
    t.ok(!s.includes('Truck 9911') && !s.includes('Truck 23N') && !s.includes('Truck 30N'), `tomorrow's trucks are not listed @${vw}`);
    t.ok(s.includes('Already checked in') && s.includes('Truck 5150') && /Checked in, #\d+ in line/.test(s) && s.includes('Unloading at D1'), `trucks already checked in are shown apart, with their status @${vw}`);
    t.ok(!s.includes('Truck 4521 · Altex') && !s.includes('0 pallets'), `no repeated company name and no "0 pallets" on the cards @${vw}`);
    t.ok(!s.includes('Pine Ridge') && !s.includes('Truckee River'), `no other company on the truck list @${vw}`);
    t.ok(s.includes("My truck isn't listed"), `"My truck isn't listed" leads to the walk-in @${vw}`);
    await h.check(p, `trucks-${vw}`);
    await p.getByText('Truck 4521').click();
    t.eq(await kioskStep(p), 'details', `picking the truck opens the details @${vw}`);
    // change the language in the middle: same screen, nothing lost, still not the crew language
    await p.locator('[data-zz=kiosk] header button[aria-label="Language"]').click();
    t.eq(await kioskStep(p), 'lang', `the language button opens the language screen @${vw}`);
    await p.click('button[data-lang="ru"]');
    t.eq(await kioskStep(p), 'details', `back on the same step after choosing @${vw}`);
    t.ok(norm(await h.text(p)).includes('Проверьте данные') && (await p.$$eval('[data-zz=kiosk] main input', xs => xs.map(x => x.value))).includes('Sam Driver'), `now in Russian, details kept @${vw}`);
    t.ok(await p.evaluate(() => localStorage.getItem('cd6:lang')) === null, `crew language still untouched @${vw}`);
    await p.getByRole('button', { name: /Назад/ }).click();
    t.eq(await kioskStep(p), 'truck', `Back goes to the truck list @${vw}`);
    await p.context().close();
  }

  /* ---------------- walk-in ---------------- */
  t.section('walk-in: opens an account (source kiosk) and checks in');
  for (const [vw, viewport] of [['1024', TABLET], ['390', PHONE]]) {
    const p = await openKiosk(h, viewport, await seedDoc(h));
    await p.click('button[data-lang="en"]');
    await p.getByText('Walk-in (no appointment)').click();
    t.eq(await kioskStep(p), 'wco', `walk-in asks for the company @${vw}`);
    await p.fill('[data-zz=kiosk] main input', 'Zebra Freight Test');
    await p.waitForTimeout(150);
    await p.getByRole('button', { name: "My company isn't listed" }).click();
    t.eq(await kioskStep(p), 'acct', `unknown company opens an account @${vw}`);
    const ins = p.locator('[data-zz=kiosk] main input');
    t.eq(await ins.nth(0).inputValue(), 'Zebra Freight Test', `company name carried over @${vw}`);
    const next = p.getByRole('button', { name: /^Next/ });
    t.ok(await next.isDisabled(), `no account without email and MC (no account, no door) @${vw}`);
    await ins.nth(1).fill('billing@zebra.example');
    await ins.nth(2).fill('mc-123456');
    await h.check(p, `walk-acct-${vw}`);
    t.ok(!(await next.isDisabled()), `account form complete @${vw}`);
    await next.click();
    t.eq(await kioskStep(p), 'kind', `drop-off or pickup @${vw}`);
    await h.check(p, `walk-kind-${vw}`);
    await p.getByText('I brought freight to unload').click();
    t.eq(await kioskStep(p), 'pallets', `how many pallets @${vw}`);
    await p.locator('[data-zz=kiosk] main button', { hasText: /^8$/ }).click();
    await h.check(p, `walk-pallets-${vw}`);
    await p.getByRole('button', { name: /^Next/ }).click();
    t.eq(await kioskStep(p), 'details', `walk-in details @${vw}`);
    const d = p.locator('[data-zz=kiosk] main input');
    await p.getByRole('button', { name: /^Next/ }).click();
    t.ok(norm(await h.text(p)).includes('Please type your name.'), `name is required @${vw}`);
    await d.nth(0).fill('Dana Driver');
    await d.nth(1).fill('775555');
    await p.getByRole('button', { name: /^Next/ }).click();
    t.ok(norm(await h.text(p)).includes('Please type your truck number.'), `walk-in needs a truck number @${vw}`);
    await d.nth(2).fill('9001');
    await p.getByRole('button', { name: /^Next/ }).click();
    t.ok(norm(await h.text(p)).includes('It needs 10 digits'), `a short cell number is caught @${vw}`);
    await d.nth(1).fill('775-555-0188');
    await d.nth(3).fill('T9001');
    await h.check(p, `walk-details-${vw}`);
    await p.getByRole('button', { name: /^Next/ }).click();
    t.eq(await kioskStep(p), 'scan', `walk-in paperwork step @${vw}`);
    await p.getByRole('button', { name: /Skip — give papers to the office/ }).click();
    await p.waitForSelector('[data-zz=kiosk-done]');
    await p.waitForTimeout(250);
    const doc = await h.readDoc(p);
    const cu = doc.customers.find(c => c.name === 'Zebra Freight Test');
    const tr = doc.trailers.find(x => cu && x.customerId === cu.id);
    t.ok(cu && cu.source === 'kiosk' && cu.contact === 'billing@zebra.example' && cu.mc === 'MC-123456', `walk-in opened an account (source kiosk) @${vw}`);
    t.ok(tr && tr.arrivedAt && tr.driver === 'Dana Driver' && tr.truck === '9001' && tr.phone === '775-555-0188' && tr.driverLang === 'en' && tr.checkedInBy === 'kiosk' && /^\d{4}$/.test(tr.code || ''), `walk-in truck checked in with code, language and checkedInBy @${vw}`);
    const ld = doc.shipments.find(s => s.trailerInId === tr.id);
    t.ok(ld && ld.units.std === 8, `walk-in load of 8 pallets @${vw}`);
    const s = norm(await h.text(p));
    t.ok(s.includes('Account opened: Zebra Freight Test') && s.includes('Invoices go to billing@zebra.example'), `done screen says the account was opened @${vw}`);
    t.ok(s.includes('Every door is full and you don\'t have a booking'), `doors full: walk-in sees the office first (Nick's rule) @${vw}`);
    await h.check(p, `walk-done-${vw}`);
    await p.context().close();
  }

  {
    // a walk-in for a company we know skips the account form; if that company has a truck booked today, the driver
    // sees it first (tapping "walk-in" by mistake must not make a second truck)
    const p = await openKiosk(h, TABLET, await seedDoc(h));
    await p.click('button[data-lang="en"]');
    await p.getByText('Walk-in (no appointment)').click();
    await p.fill('[data-zz=kiosk] main input', 'altex');
    await p.waitForTimeout(150);
    await p.getByText('Altex Transportation').first().click();
    t.eq(await kioskStep(p), 'truck', 'walk-in for a company with a truck booked today: its trucks come first');
    t.ok(norm(await h.text(p)).includes('Truck 4521'), 'the booked truck is offered');
    await h.check(p, 'walk-known-trucks-1024');
    await p.getByRole('button', { name: "My truck isn't listed" }).click();
    t.eq(await kioskStep(p), 'kind', '"My truck isn\'t listed" goes on to the walk-in (no account form)');
    await p.getByText('I am here to load freight').click();
    t.eq(await kioskStep(p), 'details', 'a pickup skips the pallet question');
    // a known company with nothing booked today goes straight to drop-off / pickup
    const free = await p.evaluate(() => { const d = window.__zz.doc; return (d.customers.find(c => /^cu_\d+$/.test(c.id) && !d.trailers.some(t => t.customerId === c.id && t.stage !== 'departed' && t.stage !== 'cancelled')) || {}).name; });
    await p.getByRole('button', { name: /Start over/ }).click();
    await p.click('button[data-lang="en"]');
    await p.getByText('Walk-in (no appointment)').click();
    await p.fill('[data-zz=kiosk] main input', free);
    await p.waitForTimeout(150);
    await p.locator('[data-zz=kiosk] main').getByText(free, { exact: true }).first().click();
    t.eq(await kioskStep(p), 'kind', `walk-in for a known company with nothing booked (${free}) goes straight to drop-off / pickup`);
    await p.context().close();
  }

  /* ---------------- timers ---------------- */
  t.section('timers: 30 s after done, 90 s idle (warning at 75 s)');
  for (const [vw, viewport] of [['1024', TABLET], ['390', PHONE]]) {
    let p = await openKiosk(h, viewport, await seedDoc(h), { now: Date.now() });
    await p.click('button[data-lang="en"]');
    await p.getByText('I have a 4‑digit code').click();
    await keypad(p, '4821');
    await p.getByRole('button', { name: /^Next/ }).click();
    await p.getByRole('button', { name: /Skip — give papers to the office/ }).click();
    await p.waitForSelector('[data-zz=kiosk-done]');
    await p.clock.runFor(20000);
    t.eq(await kioskStep(p), 'done', `still on done after 20 s @${vw}`);
    t.ok(/Starting over in 1\d s/.test(norm(await h.text(p))), `countdown ticks @${vw}`);
    await p.clock.runFor(11000);
    t.eq(await kioskStep(p), 'lang', `30 s after done the kiosk is back on the language screen @${vw}`);
    await p.context().close();

    p = await openKiosk(h, viewport, await seedDoc(h), { now: Date.now() });
    await p.click('button[data-lang="es"]');
    await p.getByText('Sin cita (llegada directa)').click();
    await p.fill('[data-zz=kiosk] main input', 'Idle Freight');
    await p.getByRole('button', { name: 'Mi compañía no aparece' }).click();
    const ins = p.locator('[data-zz=kiosk] main input');
    await ins.nth(1).fill('secret@idle.example');
    await ins.nth(2).fill('MC-777777');
    await p.clock.runFor(60000);
    t.ok(!norm(await h.text(p)).includes('¿Sigue ahí?'), `no warning at 60 s @${vw}`);
    await p.clock.runFor(16000);
    t.ok(norm(await h.text(p)).includes('¿Sigue ahí? Toque la pantalla para continuar.'), `warning at 75 s @${vw}`);
    await h.check(p, `idle-warn-${vw}`);
    await p.clock.runFor(15000);
    t.eq(await kioskStep(p), 'lang', `90 s idle: back to the language screen @${vw}`);
    t.ok(!(await p.locator('[data-zz=kiosk] button[aria-pressed=true]').count()), `language cleared too @${vw}`);
    await p.click('button[data-lang="en"]');
    await p.getByText('Walk-in (no appointment)').click();
    t.eq(await p.locator('[data-zz=kiosk] main input').first().inputValue(), '', `walk-in company cleared @${vw}`);
    await p.fill('[data-zz=kiosk] main input', 'Again Freight');
    await p.getByRole('button', { name: "My company isn't listed" }).click();
    const again = await p.$$eval('[data-zz=kiosk] main input', xs => xs.map(x => x.value));
    t.ok(again[0] === 'Again Freight' && again[1] === '' && again[2] === '', `walk-in email and MC cleared @${vw}`);
    t.ok(!norm(await p.content()).includes('secret@idle.example'), `nothing of the last driver left on the page @${vw}`);
    // activity keeps it alive
    await p.clock.runFor(70000);
    await p.locator('[data-zz=kiosk] main input').nth(1).fill('a');
    await p.clock.runFor(70000);
    t.eq(await kioskStep(p), 'acct', `typing resets the idle timer @${vw}`);
    await p.context().close();
  }

  /* ---------------- links and exit ---------------- */
  t.section('links: #kiosk, #tv, stations remembered, staff exit with office PIN');
  {
    // opening the kiosk or the driver page writes nothing to the doc, and neither do the kiosk's timers
    const json = JSON.stringify(await seedDoc(h));
    let p = await h.open('#kiosk', { viewport: TABLET, seed: json, now: Date.now() });
    await p.clock.runFor(130000);
    t.ok(await h.readDocRaw(p) === json, '#kiosk: nothing written on load or by its timers (130 s)');
    await p.context().close();
    p = await h.open('#eta6262', { viewport: PHONE, seed: json, now: Date.now() });
    await p.clock.runFor(12000);
    t.ok(await h.readDocRaw(p) === json, '#eta6262: nothing written on load');
    await p.context().close();
  }
  {
    let p = await h.open('#kiosk', { viewport: TABLET, seed: await seedDoc(h) });
    t.ok(await p.locator('[data-zz=kiosk]').count() === 1, '#kiosk opens the kiosk');
    await p.reload(); await h.waitLoaded(p);
    t.ok(await p.locator('[data-zz=kiosk]').count() === 1, '#kiosk: a reload stays on the kiosk');
    await p.getByRole('button', { name: 'Staff', exact: true }).click();
    await p.waitForTimeout(150);
    t.ok(norm(await h.text(p)).includes('Staff only: leave the kiosk'), 'Exit asks for the office name and PIN');
    await h.check(p, 'staff-1024');
    const box = p.locator('.fixed input');
    await box.nth(0).fill('Nick');
    await box.nth(1).fill('7788');
    await p.getByRole('button', { name: 'Exit kiosk' }).click();
    await p.waitForTimeout(150);
    t.ok(norm(await h.text(p)).includes("That name and PIN don't match.") && await p.locator('[data-zz=kiosk]').count() === 1, 'a wrong PIN (even a customer PIN) keeps the kiosk');
    await box.nth(1).fill('2468');
    await p.getByRole('button', { name: 'Exit kiosk' }).click();
    await p.waitForTimeout(300);
    t.ok(await p.locator('[data-zz=kiosk]').count() === 0 && await p.evaluate(() => location.hash) === '', 'office PIN exits the kiosk and clears #kiosk');
    t.ok(await p.evaluate(() => localStorage.getItem('cd6:session')) === null, 'the kiosk is forgotten (no session)');
    await p.reload(); await h.waitLoaded(p);
    t.ok(await p.locator('[data-zz=kiosk]').count() === 0, 'after exit a reload does not reopen the kiosk');
    await p.context().close();

    p = await openKiosk(h, TABLET, await seedDoc(h));
    await p.reload(); await h.waitLoaded(p);
    t.ok(await p.locator('[data-zz=kiosk]').count() === 1, 'stations -> Driver check-in: a tablet reload stays on the kiosk');
    await p.context().close();

    p = await h.open('#tv', { viewport: DESK, seed: await seedDoc(h) });
    let s = await h.text(p);
    t.ok(s.includes('Doors') && s.includes('D1') && s.includes('D8'), '#tv opens the TV board');
    await p.reload(); await h.waitLoaded(p);
    t.ok((await h.text(p)).includes('D8'), '#tv: a reload stays on the TV');
    await h.check(p, 'tv-1400');
    await p.context().close();

    p = await h.open('#stations', { viewport: DESK, seed: await seedDoc(h) });
    await p.getByText('Open the dock board').click();
    await p.waitForTimeout(200);
    await p.reload(); await h.waitLoaded(p);
    t.ok((await h.text(p)).includes('D8'), 'stations -> Dock TV board: a reload stays on the TV');
    await p.context().close();

    // the old kiosk is still there behind ZZFLAGS.kiosk2
    p = await h.open('#stations', { viewport: TABLET, flags: { kiosk2: false } });
    await p.getByText('Open driver check-in').click();
    await p.waitForTimeout(200);
    t.ok((await h.text(p)).includes("Who's the freight for?") && await p.locator('[data-zz=kiosk]').count() === 0, 'ZZFLAGS.kiosk2 off: the old kiosk XQ opens');
    await p.context().close();
  }

  /* ---------------- driver ETA page ---------------- */
  t.section('driver page #eta<code>');
  for (const [vw, viewport] of [['390', PHONE], ['1400', DESK]]) {
    let p = await h.open('#eta6262', { viewport, seed: await seedDoc(h) });
    t.ok(await p.locator('[data-zz=eta]').count() === 1, `#eta6262 opens the driver page @${vw}`);
    let s = norm(await h.text(p));
    t.ok(s.includes('Страница водителя') && s.includes('Запись:') && s.includes('Обновить время прибытия'), `language follows driverLang (ru) @${vw}`);
    t.ok(s.includes('Altex Transportation') && s.includes('6262') && s.includes('1095 Spice Islands Dr') && s.includes('916-616-3481'), `company, code, dock address and phone @${vw}`);
    t.ok(!s.includes('7788') && !s.includes('Pine Ridge'), `no PIN and no other company on the driver page @${vw}`);
    await h.check(p, `eta-${vw}`, { full: true });
    const t0 = Date.now();
    await p.getByRole('button', { name: '30 мин' }).click();
    await p.waitForTimeout(400);
    let tr = trailer(await h.readDoc(p), 'zzk_eta');
    t.ok(tr.eta && tr.eta.source === 'driver' && Math.abs(Date.parse(tr.eta.at) - (t0 + 30 * MIN)) < 2 * MIN, `30 min button sets eta.source driver @${vw}`);
    s = norm(await h.text(p));
    t.ok(s.includes('Ваше прибытие:') && s.includes('Сохранено.'), `status shows the new ETA @${vw}`);
    t.ok(await p.locator('[data-zz=eta-text]').count() === 1, `local data: the page also offers the text for the dock @${vw}`);
    await p.getByRole('button', { name: 'Пробки' }).click();
    await p.waitForTimeout(300);
    tr = trailer(await h.readDoc(p), 'zzk_eta');
    t.ok(/^Running late: /.test(tr.eta.note || ''), `a running-late reason is saved with the ETA (${tr.eta.note}) @${vw}`);
    await p.getByRole('button', { name: /English/ }).click();
    await p.waitForTimeout(150);
    s = norm(await h.text(p));
    t.ok(s.includes('Driver page') && s.includes('Update my ETA'), `the language picker switches to English @${vw}`);
    // pick a time
    await p.getByRole('button', { name: /Pick a time/ }).click();
    await p.fill('[data-zz=eta] input[type=time]', '23:58');
    await p.getByRole('button', { name: 'Save time' }).click();
    await p.waitForTimeout(400);
    tr = trailer(await h.readDoc(p), 'zzk_eta');
    t.ok(await p.evaluate(at => window.__zz.h.ZZdockParts(at).hhmm === '23:58', tr.eta.at), `pick a time saves it in dock time @${vw}`);
    // live location
    const link = p.locator('[data-zz=eta] input[type=url]');
    await link.fill('http://maps.example.com/x');
    await p.getByRole('button', { name: 'Save link' }).click();
    await p.waitForTimeout(200);
    t.ok(norm(await h.text(p)).includes('That link must start with https://') && !trailer(await h.readDoc(p), 'zzk_eta').trackUrl, `an http link is refused @${vw}`);
    await link.fill('https://maps.app.goo.gl/abc123');
    await p.getByRole('button', { name: 'Save link' }).click();
    await p.waitForTimeout(300);
    tr = trailer(await h.readDoc(p), 'zzk_eta');
    t.ok(tr.trackUrl === 'https://maps.app.goo.gl/abc123' && tr.tracking === 'gps', `an https link is saved through zzTrack @${vw}`);
    await h.check(p, `eta-saved-${vw}`, { full: true });
    // a save that is refused shows the copy text
    await p.evaluate(() => { const o = Storage.prototype.setItem; window.__zzSet = o; Storage.prototype.setItem = function (k, v) { if (k === 'cdweb:cd6:doc') throw new Error('blocked for the test'); return o.call(this, k, v); }; });
    await p.getByRole('button', { name: '1 hour' }).click();
    await p.waitForTimeout(400);
    s = norm(await h.text(p));
    t.ok(s.includes("We couldn't save it here. Send this text to the dock instead.") && (await p.locator('[data-zz=eta-text]').inputValue()).startsWith('Truck 6262 (check-in code 6262): ETA'), `refused save: ready text for the dock @${vw}`);
    await p.evaluate(() => { Storage.prototype.setItem = window.__zzSet; });
    await h.check(p, `eta-refused-${vw}`);
    // exit clears the hash
    await p.getByRole('button', { name: 'Exit', exact: true }).click();
    await p.waitForTimeout(300);
    t.ok(await p.locator('[data-zz=eta]').count() === 0 && await p.evaluate(() => location.hash) === '', `Exit clears the hash @${vw}`);
    await p.context().close();

    // unknown code: copy-text fallback
    p = await h.open('#eta0001', { viewport, seed: await seedDoc(h) });
    s = norm(await h.text(p));
    t.ok(await p.locator('[data-zz=eta-notfound]').count() === 1 && s.includes("We can't find code 0001 on this phone"), `unknown code shows the fallback @${vw}`);
    await p.getByRole('button', { name: '15 min' }).click();
    await p.waitForTimeout(200);
    const txt = await p.locator('[data-zz=eta-text]').inputValue();
    t.ok(/^Check-in code 0001: ETA \d{1,2}:\d{2}\s?(AM|PM) dock time$/.test(norm(txt)), `ready text "${norm(txt)}" @${vw}`);
    s = norm(await h.text(p));
    t.ok(s.includes('Dock phone: 916-616-3481') && s.includes('Copy text'), `dock phone as text and a Copy button @${vw}`);
    await p.getByRole('button', { name: 'Copy text' }).click();
    await p.waitForTimeout(150);
    s = norm(await h.text(p));
    t.ok(s.includes('Copied') || s.includes('Press and hold the text to copy it.'), `copy works or says how @${vw}`);
    await h.check(p, `eta-notfound-${vw}`, { full: true });
    t.ok(trailer(await h.readDoc(p), 'zzk_eta').eta === undefined, `the fallback writes nothing @${vw}`);
    // a different code from the fallback
    await p.fill('[data-zz=eta] input[inputmode=numeric]', '6262');
    await p.getByRole('button', { name: 'Find', exact: true }).click();
    await p.waitForTimeout(200);
    t.ok(norm(await h.text(p)).includes('Обновить время прибытия') && await p.evaluate(() => location.hash) === '#eta6262', `"Different code?" finds the truck @${vw}`);
    await p.context().close();
  }
  {
    // a demo truck in a fresh browser never matches by a worked-out code; the kiosk-checked-in truck shows its place
    const doc = await seedDoc(h);
    const p = await h.open('#eta5150', { viewport: PHONE, seed: doc });
    t.ok(/^Checked in, #\d+ in line$/.test(norm(await p.locator('[data-zz=eta-status]').innerText())) && !(await p.getByRole('button', { name: '15 min' }).count()), 'checked-in truck: place in line, no ETA buttons');
    await p.context().close();
    const d2 = await seedDoc(h); const old = d2.trailers.find(x => x.id === 'zzk_eta'); const derived = await (async () => { const q = await h.open('#stations', { seed: d2 }); const c = await q.evaluate(() => { const t = window.__zz.doc.trailers.find(x => x.id === 'zzk_eta'); delete t.code; return window.__zz.h.ZZcode(t); }); await q.context().close(); return c; })();
    delete old.code;
    const p2 = await h.open('#eta' + derived, { viewport: PHONE, seed: d2 });
    t.ok(await p2.locator('[data-zz=eta-notfound]').count() === 1, 'a worked-out code (no real code) is not matched on the driver page');
    await p2.context().close();
    // an office device keeps its sign-in after leaving a driver link
    const q = await h.openAs('office', { viewport: PHONE, seed: await seedDoc(h) });
    await q.evaluate(() => { location.hash = 'eta6262'; });
    await q.reload(); await h.waitLoaded(q);
    t.ok(await q.locator('[data-zz=eta]').count() === 1, 'an #eta link opens the driver page on a signed-in device');
    await q.getByRole('button', { name: 'Выйти', exact: true }).click();
    await q.waitForTimeout(300);
    t.ok(norm(await h.text(q)).includes('Office · Nick'), 'Exit returns to the office board (sign-in kept)');
    await q.context().close();
  }

  /* ---------------- review fixes: failures told honestly, cancelled codes, staff exit, themes ---------------- */
  t.section('save failures, cancelled booking, details card, staff exit to stations, dark themes');
  {
    // a check-in whose save fails must not say "checked in"
    let p = await openKiosk(h, TABLET, await seedDoc(h));
    await p.click('button[data-lang="en"]');
    await p.getByText('I have a 4‑digit code').click();
    await keypad(p, '4821');
    await p.getByRole('button', { name: /^Next/ }).click();
    await p.evaluate(() => { const o = Storage.prototype.setItem; window.__zzSet = o; Storage.prototype.setItem = function (k, v) { if (k === 'cdweb:cd6:doc') throw new Error('blocked for the test'); return o.call(this, k, v); }; });
    await p.getByRole('button', { name: /Skip — give papers to the office/ }).click();
    await p.waitForTimeout(400);
    let s = norm(await h.text(p));
    t.ok(await kioskStep(p) === 'scan' && s.includes('Please go to the office') && s.includes('We could not save your check-in') && !(await p.locator('[data-zz=kiosk-done]').count()), 'a refused save sends the driver to the office (never "checked in")');
    await p.evaluate(() => { Storage.prototype.setItem = window.__zzSet; });
    t.ok(!trailer(await h.readDoc(p), 'zzk_today').arrivedAt, 'the refused check-in is not stored');
    await h.check(p, 'savefail-1024');
    await p.context().close();

    // paperwork photos that cannot be saved: checked in, and told to hand the papers to the office
    p = await openKiosk(h, PHONE, await seedDoc(h));
    await p.click('button[data-lang="en"]');
    await p.getByText('I have a 4‑digit code').click();
    await keypad(p, '4821');
    await p.getByRole('button', { name: /^Next/ }).click();
    await p.locator('[data-zz=kiosk] input[type=file]').setInputFiles(h.UPLOAD_PNG);
    await p.waitForFunction(() => document.querySelectorAll('[data-zz=kiosk] main img').length === 1);
    await p.evaluate(() => { const o = Storage.prototype.setItem; window.__zzSet = o; Storage.prototype.setItem = function (k, v) { if (String(k).startsWith('cdweb:cd6:photos:paper:')) throw new Error('blocked for the test'); return o.call(this, k, v); }; });
    await p.getByRole('button', { name: /Done — check me in/ }).click();
    await p.waitForSelector('[data-zz=kiosk-done]');
    await p.waitForTimeout(300);
    await p.evaluate(() => { Storage.prototype.setItem = window.__zzSet; });
    s = norm(await h.text(p));
    const tr = trailer(await h.readDoc(p), 'zzk_today');
    t.ok(tr.arrivedAt && !tr.paperCount && s.includes('Your paperwork photos did not save. Please give your papers to the office.'), 'photos not saved: checked in, no paperCount, driver told to give the papers to the office');
    await h.check(p, 'paperfail-390');
    await p.context().close();

    // a cancelled booking's code says so instead of "wrong code"
    for (const [vw, viewport] of [['1024', TABLET], ['390', PHONE]]) {
      p = await openKiosk(h, viewport, await seedDoc(h));
      const before = JSON.stringify((await h.readDoc(p)).trailers);
      await p.click('button[data-lang="es"]');
      await p.getByText('Tengo un código de 4 dígitos').click();
      await keypad(p, '7070');
      s = norm(await h.text(p));
      t.ok(await kioskStep(p) === 'status' && s.includes('Esta cita fue cancelada.') && s.includes('Por favor vaya a la oficina') && !(await p.locator('[data-zz=place]').count()) && !s.includes('Imprimir orden'), `cancelled booking: "cancelled, go to the office", no place in line @${vw}`);
      t.ok(JSON.stringify((await h.readDoc(p)).trailers) === before, `cancelled code writes nothing @${vw}`);
      await h.check(p, `cancelled-${vw}`);
      await p.context().close();
    }

    // the details card never says "0 pallets" for a truck without loads
    p = await openKiosk(h, PHONE, await seedDoc(h));
    await p.click('button[data-lang="en"]');
    await p.getByText('I have a 4‑digit code').click();
    await keypad(p, '6262');
    t.ok(await kioskStep(p) === 'details' && !norm(await h.text(p)).includes('0 pallets'), 'details card without loads: no "0 pallets"');
    await p.context().close();

    // staff exit from a kiosk opened at Dock stations goes back to Dock stations (as the old kiosk did)
    p = await openKiosk(h, TABLET, await seedDoc(h));
    await p.getByRole('button', { name: 'Staff', exact: true }).click();
    const box = p.locator('.fixed input');
    await box.nth(0).fill('nick');
    await box.nth(1).fill('2468');
    await p.getByRole('button', { name: 'Exit kiosk' }).click();
    await p.waitForTimeout(300);
    t.ok(await p.locator('[data-zz=kiosk]').count() === 0 && (await h.text(p)).includes('Dock stations') && await p.evaluate(() => localStorage.getItem('cd6:session')) === null, 'staff exit from Dock stations returns to Dock stations and forgets the kiosk');
    await p.context().close();

    // Nick's dark themes (Clean, Hi-vis): kiosk done screen and driver page stay readable
    for (const theme of ['hivis', 'clean']) {
      for (const [vw, viewport] of [['390', PHONE], ['1400', DESK]]) {
        const ctx = await h.newContext({ viewport, seed: await seedDoc(h) });
        await ctx.addInitScript(th => { try { localStorage.setItem('cd6:theme', th); } catch (e) {} }, theme);
        p = await h.open('#kiosk', { context: ctx });
        await p.click('button[data-lang="en"]');
        await p.getByText('I have a 4‑digit code').click();
        await keypad(p, '4821');
        await p.getByRole('button', { name: /^Next/ }).click();
        await p.getByRole('button', { name: /Skip — give papers to the office/ }).click();
        await p.waitForSelector('[data-zz=kiosk-done]');
        const bg = await p.evaluate(() => getComputedStyle(document.querySelector('[data-zz=kiosk]')).backgroundColor);
        t.ok(bg !== 'rgb(241, 245, 245)', `${theme}: the kiosk follows the theme (${bg}) @${vw}`);
        await h.check(p, `theme-${theme}-done-${vw}`);
        await p.close();
        p = await h.open('#eta6262', { context: ctx });
        await h.check(p, `theme-${theme}-eta-${vw}`, { full: true });
        await ctx.close();
      }
    }
  }
  {
    // the text for the dock names the day when the ETA is not today (dock time); fixed clock: Mon Oct 26 2026, 11:00 AM PDT
    const p = await h.open('#eta0001', { viewport: PHONE, seed: await seedDoc(h), now: Date.parse('2026-10-26T18:00:00Z') });
    await p.getByRole('button', { name: /Pick a time/ }).click();
    await p.fill('[data-zz=eta] input[type=time]', '09:00');
    await p.getByRole('button', { name: 'Save time' }).click();
    await p.waitForTimeout(200);
    const txt = norm(await p.locator('[data-zz=eta-text]').inputValue());
    t.ok(/^Check-in code 0001: ETA Tue, Oct 27, 9:00 AM dock time$/.test(txt), `a time already past means tomorrow, and the text says so ("${txt}")`);
    const p2 = await h.open('#eta6262', { viewport: PHONE, seed: await seedDoc(h) });
    await p2.getByRole('button', { name: /English/ }).click();
    t.ok(norm(await h.text(p2)).includes('Dock time (Pacific)'), 'booked times on the driver page say they are dock time (Pacific)');
    t.eq(await p2.locator('[data-zz=eta] button.zzk-b').filter({ hasText: /^(15 min|30 min|1 hour|2 hours)$/ }).evaluateAll(bs => [...new Set(bs.map(b => getComputedStyle(b).backgroundColor))].length), 1, 'the four ETA buttons look the same (none looks already chosen)');
    await p.context().close(); await p2.context().close();
  }

  /* ---------------- driver texts ---------------- */
  t.section('ZZdriverText: door / yard / released / reminder in six languages (through ZZmsgs)');
  {
    const p = await h.open('#stations', { viewport: PHONE, seed: await seedDoc(h) });
    const out = await p.evaluate(() => {
      const z = window.__zz, now = Date.now(), I = ms => new Date(ms).toISOString(), res = {};
      for (const lang of ['es', 'ru', 'uk', 'pa', 'hi']) {
        const mk = (id, o) => ({ id, customerId: 'cu_altex', driver: 'Luis', phone: '775-555-0100', truck: '41', driverLang: lang, direction: 'inbound', ...o });
        const doc = { ...z.doc, trailers: [
          mk('d1', { stage: 'at-dock', dock: 'D3', arrivedAt: I(now - 6e5), dockedAt: I(now - 6e5) }),
          mk('d2', { stage: 'arrived', dock: 'YD', arrivedAt: I(now - 6e5) }),
          mk('d3', { stage: 'departed', dock: null, arrivedAt: I(now - 3e6), departedAt: I(now - 6e5) }),
          mk('d4', { stage: 'scheduled', scheduledAt: I(now + 36e5) })], shipments: [] };
        const ms = z.h.ZZmsgs(doc, now).filter(m => m.event === 'driver');
        res[lang] = ['d1', 'd2', 'd3', 'd4'].map(id => (ms.find(m => m.trailerId === id) || {}).body || null);
      }
      res.hhmm = z.h.ZZdockParts(I(now + 36e5)).hhmm;
      return res;
    });
    const want = { es: ['puerta D3', 'patio', 'liberado', 'recordatorio'], ru: ['воротам D3', 'площадке', 'свободен', 'напоминание'], uk: ['воріт D3', 'майданчику', 'відпущено', 'нагадування'],
      pa: ['ਡੋਰ D3', 'ਯਾਰਡ', 'ਰਿਲੀਜ਼', 'ਯਾਦ ਰਹੇ'], hi: ['डोर D3', 'यार्ड', 'रिलीज़', 'याद रहे'] };
    t.ok(out.ru[3].includes(out.hhmm) && out.uk[3].includes(out.hhmm) && !/[AP]M/.test(out.ru[3] + out.uk[3]), `ru / uk reminders read the time the 24-hour way (${out.hhmm})`);
    t.ok(/\d:\d\d\s?[AP]M/.test(out.es[3].replace(/[\u202f\xa0]/g, ' ')), 'es reminder keeps 12-hour time');
    for (const lang of Object.keys(want)) {
      t.ok(out[lang].every((b, k) => b && b.startsWith('24HR Crossdock: Luis, ') && b.includes(want[lang][k]) && b.includes('41')), `driver texts in ${lang}: ${out[lang].map(b => (b || 'MISSING').slice(0, 40)).join(' | ')}`);
    }
    await p.context().close();
  }
});
