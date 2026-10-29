/* Kiosk + driver page test. Drives the real UI through the harness.
   Run: cd app/test && NODE_PATH=$(npm root -g) node kiosk.test.js
   Screens go to the scratchpad shots folder (set SHOTS to change it). */
const H = require('./harness');
const fs = require('fs');
const path = require('path');

const SHOTS = process.env.SHOTS || '/tmp/claude-0/-home-user-Rulfo/928f61b7-5bf4-59e6-9ccf-0daf06c385c6/scratchpad/shots';
fs.mkdirSync(SHOTS, { recursive: true });
const KIOSK = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };

const failures = [];
function ok(cond, msg) {
  if (cond) console.log('ok   ' + msg);
  else { failures.push(msg); console.log('FAIL ' + msg); }
}
const view = page => page.evaluate(() => App.state.view);
const frames = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
/* wait until the app is on that view AND the screen has been drawn */
const waitView = async (page, v) => { await page.waitForFunction(name => App.state.view === name, v, { timeout: 8000 }); await frames(page); };
const text = page => page.evaluate(() => document.getElementById('app').innerText);

async function noHScroll(page, label) {
  const w = await page.evaluate(() => document.documentElement.scrollWidth);
  ok(w <= 390, label + ': no sideways scroll at 390 px (scrollWidth ' + w + ')');
}
/* screenshot at the kiosk size and phone size; checks sideways scroll on the phone */
async function snap(page, name, theme, sizes) {
  sizes = sizes || [KIOSK, PHONE];
  const back = page.viewportSize();
  for (const vp of sizes) {
    await page.setViewportSize(vp);
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(SHOTS, name + '-' + vp.width + '-' + theme + '.png'), fullPage: true });
    if (vp.width <= 390) await noHScroll(page, name + ' (' + theme + ')');
    if (vp.width === KIOSK.width) {
      const hgt = await page.evaluate(() => document.documentElement.scrollHeight);
      if (hgt > KIOSK.height + 2) console.log('note ' + name + ' (' + theme + ') is ' + hgt + ' px tall on the kiosk screen');
    }
  }
  await page.setViewportSize(back);
}
async function keypad(page, digits) {
  for (const d of digits) await page.click('button[data-act="kiosk.key"][data-k="' + d + '"]');
}
async function bumpClock(page, ms) {
  await page.evaluate(n => { App.clockOffset += n; }, ms);
}

/* the full booked check-in in Spanish: company search -> truck -> details -> 2 paperwork photos -> done */
async function spanishCheckIn(h, context, theme, check) {
  const page = await h.open('kiosk', { context, viewport: KIOSK });
  await page.waitForSelector('[data-kiosk-view="kiosk.lang"]');
  await snap(page, 'kiosk-01-lang', theme);
  await page.click('button[data-act="kiosk.setLang"][data-lang="es"]');
  await waitView(page, 'kiosk.company');
  if (check) ok((await text(page)).includes('¿Para qué compañía es esta carga?'), 'company question is in Spanish');
  await snap(page, 'kiosk-02-company', theme);
  await page.fill('#k-company', 'sierra');
  await page.waitForSelector('button[data-act="kiosk.pickCompany"][data-id="c_sierra"]');
  if (check) ok(await page.evaluate(() => document.activeElement && document.activeElement.id === 'k-company'), 'search box keeps focus while typing');
  await snap(page, 'kiosk-03-company-search', theme);
  await page.click('button[data-act="kiosk.pickCompany"][data-id="c_sierra"]');
  await waitView(page, 'kiosk.truck');
  await page.waitForSelector('button[data-act="kiosk.pickTruck"][data-id="t_ex1"]');
  await snap(page, 'kiosk-04-truck', theme);
  await page.click('button[data-act="kiosk.pickTruck"][data-id="t_ex1"]');
  await waitView(page, 'kiosk.details');
  if (check) {
    ok(await page.inputValue('#k-name') === 'Miguel Santos', 'driver name prefilled from booking');
    ok(await page.inputValue('#k-cell') === '775-555-0142', 'driver cell prefilled from booking');
    ok(await page.inputValue('#k-truck') === '118', 'truck # prefilled');
  }
  await snap(page, 'kiosk-05-details', theme);
  await page.fill('#k-trailer', '53-2207B');
  await page.click('button[data-act="kiosk.detailsNext"]');
  await waitView(page, 'kiosk.scan');
  await snap(page, 'kiosk-06-scan', theme);
  await page.setInputFiles('#k-paper', h.UPLOAD_PNG);
  await page.waitForFunction(() => (App.form('kiosk').paperwork || []).length === 1 && !App.anyBusy());
  await page.setInputFiles('#k-paper', h.UPLOAD_PNG);
  await page.waitForFunction(() => (App.form('kiosk').paperwork || []).length === 2 && !App.anyBusy());
  await page.waitForSelector('button[data-act="kiosk.checkin"]:not([disabled])');
  if (check) ok((await page.$$('.thumbs .photo-slot.filled img')).length === 2, 'two paperwork thumbnails shown');
  await snap(page, 'kiosk-07-scan-2pages', theme);
  await page.click('button[data-act="kiosk.checkin"]');
  await waitView(page, 'kiosk.done');
  await snap(page, 'kiosk-08-done', theme);
  return page;
}

(async () => {
  /* ---------------- 1. Spanish booked check-in (light) ---------------- */
  const h = await H.start();
  const page = await spanishCheckIn(h, null, 'light', true);
  const done = await text(page);
  ok(done.includes('¡Ya está registrado!'), 'done screen in Spanish');
  ok(/#3\b/.test(done), 'done screen shows place in line #3');
  ok(done.includes('775-555-0142'), 'done screen promises a text to the driver cell');
  ok(/Empezamos de nuevo en (30|29|28|27) s/.test(done), 'done screen shows the 30 s countdown');
  let db = await h.dump(page);
  let t = db.trucks.t_ex1;
  ok(t.status === 'arrived', 'truck t_ex1 status arrived');
  ok(!!t.checkedInAt && Math.abs(Date.parse(t.checkedInAt) - Date.now()) < 120000, 'checkedInAt saved');
  ok(t.checkedInBy === 'kiosk', 'checkedInBy kiosk');
  ok(Array.isArray(t.paperwork) && t.paperwork.length === 2 && t.paperwork.every(r => /^(a|p):/.test(r)), 'paperwork has 2 photo refs');
  ok(t.driverLang === 'es', 'driverLang es');
  ok(t.trailerNo === '53-2207B', 'edited trailer # saved');
  const last = (t.history || [])[t.history.length - 1] || {};
  ok(/Checked in at the kiosk/.test(last.text) && last.by === 'Kiosk', 'history line "Checked in at the kiosk" by Kiosk');
  let rows = Object.values(db.outbox);
  const arrived = rows.find(r => r.event === 'arrived' && r.truckId === 't_ex1');
  ok(arrived && arrived.customerId === 'c_sierra' && /checked in at Sparks, NV\. Place in line: 3\./.test(arrived.text), 'outbox: arrived alert for the customer');
  ok(arrived && arrived.to.some(p => p.name === 'Dana Ortiz' && p.channels.includes('text')), 'arrived alert goes to the dispatcher by text');
  const crew = rows.find(r => r.event === 'crew' && r.truckId === 't_ex1');
  ok(crew && /New truck in the yard: Sierra Freight Lines, 18 pallets/.test(crew.text), 'outbox: crew ping');
  const drv = rows.find(r => r.event === 'driver' && r.truckId === 't_ex1');
  ok(drv && /en la fila/.test(drv.text), 'driver confirmation text queued in Spanish');

  // 30 s countdown returns to the language screen
  await bumpClock(page, 31000);
  await waitView(page, 'kiosk.lang');
  ok(await page.evaluate(() => App.state.lang === 'en' && !App.form('kiosk').customerId), 'after 30 s the kiosk resets to the language screen');

  // every driver-facing string exists in all six languages, with the same {placeholders}
  const gaps = await page.evaluate(() => {
    const out = [], en = App.strings.en;
    if (App.LANGS.map(l => l.code).join() !== 'en,es,ru,uk,pa,hi') out.push('LANGS order/codes wrong');
    App.LANGS.forEach(l => {
      const d = App.strings[l.code] || {};
      Object.keys(en).forEach(k => {
        if (!d[k] || !String(d[k]).trim()) { out.push(l.code + ' missing ' + k); return; }
        const a = (en[k].match(/\{\w+\}/g) || []).sort().join(), b = (d[k].match(/\{\w+\}/g) || []).sort().join();
        if (a !== b) out.push(l.code + ' ' + k + ' placeholders ' + a + ' vs ' + b);
      });
    });
    return out;
  });
  ok(gaps.length === 0, 'every key in App.strings.en exists in all 6 languages' + (gaps.length ? ': ' + gaps.slice(0, 12).join('; ') : ''));

  // idle: warning at 75 s, reset at 90 s
  await page.click('button[data-act="kiosk.setLang"][data-lang="ru"]');
  await waitView(page, 'kiosk.company');
  await page.fill('#k-company', 'bay');
  await bumpClock(page, 76000);
  await page.waitForFunction(() => /Вы здесь\?/.test(document.getElementById('app').innerText), null, { timeout: 4000 });
  ok(true, 'idle warning shows after 75 s (Russian)');
  await snap(page, 'kiosk-09-idle-warning', 'light');
  await bumpClock(page, 15000);
  await waitView(page, 'kiosk.lang');
  ok(await page.evaluate(() => !App.form('kiosk').search), 'idle 90 s: back to language screen and form cleared');

  // staff panel: pick the dock, leave the kiosk
  await page.click('button[data-act="kiosk.staff"]');
  await waitView(page, 'kiosk.staff');
  await snap(page, 'kiosk-10-staff', 'light');
  await page.click('button[data-act="kiosk.setDock"][data-dock="sac"]');
  ok(await page.evaluate(() => localStorage.getItem('dock24:kioskDock')) === 'sac', 'staff panel saves kiosk dock');
  ok((await text(page)).includes('North Highlands, CA'), 'top bar shows the new dock');
  await page.click('button[data-act="kiosk.setDock"][data-dock="reno"]');
  await page.click('button[data-act="kiosk.staffBack"]');
  await waitView(page, 'kiosk.lang');
  await page.click('button[data-act="kiosk.staff"]');
  await page.click('button[data-act="kiosk.leave"]');
  ok(await page.evaluate(() => App.state.role === 'office'), 'Leave kiosk switches to the office view');
  await h.close();

  /* ---------------- 2. fresh data: driver page, code pad, already-in, walk-ins ---------------- */
  const h2 = await H.start();
  const dp = await h2.open('driver', { hash: 'driver4821', viewport: PHONE });
  await waitView(dp, 'driver.code');
  await dp.waitForSelector('button[data-act="driver.setEta"][data-min="30"]');
  ok((await text(dp)).includes('Actualizar mi llegada'), 'driver page opens in the truck language (Spanish)');
  await snap(dp, 'driver-01-eta-es', 'light', [PHONE]);
  const before = Date.now();
  await dp.click('button[data-act="driver.setEta"][data-min="30"]');
  await dp.waitForFunction(() => { const t = App.get('trucks', 't_ex1'); return t.eta && t.eta.source === 'driver' && Date.parse(t.eta.updatedAt) > Date.now() - 60000; });
  await dp.waitForTimeout(100);
  db = await h2.dump(dp);
  t = db.trucks.t_ex1;
  const etaMs = Date.parse(t.eta.at) - before;
  ok(t.eta.source === 'driver' && etaMs > 29 * 60000 && etaMs < 32 * 60000, 'driver ETA +30 min saved with source driver');
  ok(/Driver ETA/.test(t.history[t.history.length - 1].text), 'ETA added to the load trail');
  rows = Object.values(db.outbox);
  ok(rows.some(r => r.event === 'eta' && r.truckId === 't_ex1' && /Driver ETA now/.test(r.text)), 'outbox: eta alert');
  ok(await dp.isVisible('.toast'), 'toast confirms the ETA');
  // running late + bad and good location links
  await dp.click('button[data-act="driver.late"][data-reason="lateTraffic"]');
  await dp.waitForFunction(() => (App.get('trucks', 't_ex1').eta || {}).note === 'Traffic');
  ok(true, 'running late reason saved in English for the office');
  await dp.fill('#drv-link', 'not a link');
  await dp.click('button[data-act="driver.saveLink"]');
  await frames(dp);
  ok(await dp.isVisible('.field.err .errmsg'), 'bad location link shows a message');
  await dp.fill('#drv-link', 'https://maps.app.goo.gl/example123');
  await dp.click('button[data-act="driver.saveLink"]');
  await dp.waitForFunction(() => App.get('trucks', 't_ex1').trackUrl === 'https://maps.app.goo.gl/example123');
  ok(await dp.evaluate(() => App.get('trucks', 't_ex1').tracking === 'gps'), 'location link saved, tracking gps');
  await dp.click('button[data-act="driver.setLang"][data-lang="pa"]');
  await dp.waitForTimeout(150);
  ok(/[਀-੿]/.test(await text(dp)), 'driver page switches to Punjabi (Gurmukhi)');
  await snap(dp, 'driver-02-pa', 'light', [PHONE]);
  await dp.click('button[data-act="driver.setLang"][data-lang="hi"]');
  await dp.waitForTimeout(150);
  ok(/[ऀ-ॿ]/.test(await text(dp)), 'driver page switches to Hindi (Devanagari)');
  await snap(dp, 'driver-03-hi', 'light', [PHONE]);
  // pick a time
  await dp.click('button[data-act="core.set"][data-field="pick"]');
  await dp.fill('#drv-time', '23:45');
  await dp.click('button[data-act="driver.saveTime"]');
  await dp.waitForFunction(() => new Date(App.get('trucks', 't_ex1').eta.at).getMinutes() === 45);
  ok(true, 'picked time saved as ETA');
  // code entry page
  await dp.click('button[data-act="driver.otherCode"]');
  await dp.fill('#drv-code', '9999');
  await dp.click('form[data-submit="driver.findCode"] button[type=submit]');
  await dp.waitForSelector('.banner.bad');
  ok(true, 'driver code page: unknown code shows a message');
  await snap(dp, 'driver-04-code', 'light', [PHONE]);
  await dp.fill('#drv-code', '3307');
  await dp.click('form[data-submit="driver.findCode"] button[type=submit]');
  await waitView(dp, 'driver.eta');
  ok(/[ऀ-ॿ]/.test(await text(dp)) && /#/.test(await text(dp)), 'driver page for a truck in the yard shows place in line');
  await snap(dp, 'driver-05-arrived-hi', 'light', [PHONE]);

  // kiosk: code pad (wrong code, then 4821)
  const kp = await h2.open('kiosk', { viewport: KIOSK });
  await kp.click('button[data-act="kiosk.setLang"][data-lang="en"]');
  await kp.click('button[data-act="kiosk.toCode"]');
  await waitView(kp, 'kiosk.code');
  await keypad(kp, '9999');
  await kp.waitForSelector('[role=alert]');
  ok((await text(kp)).includes("We can't find that code"), 'wrong code shows a friendly message');
  ok(await view(kp) === 'kiosk.code', 'wrong code stays on the number pad');
  await snap(kp, 'kiosk-11-code-wrong', 'light');
  await keypad(kp, '48');
  await snap(kp, 'kiosk-12-code-typing', 'light');
  await keypad(kp, '21');
  await waitView(kp, 'kiosk.details');
  ok(await kp.inputValue('#k-name') === 'Miguel Santos', 'code 4821 goes to the details of truck t_ex1');
  await kp.click('button[data-act="kiosk.detailsNext"]');
  await waitView(kp, 'kiosk.scan');
  await kp.click('button[data-act="kiosk.checkin"][data-skip]');
  await waitView(kp, 'kiosk.done');
  db = await h2.dump(kp);
  t = db.trucks.t_ex1;
  ok(t.status === 'arrived' && t.checkedInBy === 'kiosk' && t.driverLang === 'en' && t.paperwork.length === 0, 'code path checks in t_ex1 (skip paperwork)');
  // the driver page for that truck now shows it is checked in (fresh page, so this really looks at t_ex1)
  const dp2 = await h2.open('driver', { hash: 'driver4821', viewport: PHONE });
  await dp2.waitForFunction(() => App.state.params.code === '4821' && document.querySelector('.hero'));
  ok(!(await dp2.$('button[data-act="driver.setEta"]')) && /#\d+ in line/.test(await text(dp2)), 'driver page hides ETA buttons once checked in and shows place in line');
  await dp2.close();

  // already checked in: arrived truck and truck at a door
  await kp.click('button[data-act="kiosk.finish"]');
  await waitView(kp, 'kiosk.lang');
  await kp.click('button[data-act="kiosk.setLang"][data-lang="uk"]');
  await kp.click('button[data-act="kiosk.toCode"]');
  await keypad(kp, '3307');
  await waitView(kp, 'kiosk.already');
  ok((await text(kp)).includes('Вас уже зареєстровано'), 'already-checked-in screen (Ukrainian)');
  db = await h2.dump(kp);
  ok(db.trucks.t_ex2.history.length === 2, 'already checked in: no second check-in written');
  await snap(kp, 'kiosk-13-already', 'light');
  await kp.click('button[data-act="kiosk.back"]');
  await waitView(kp, 'kiosk.code');
  await kp.keyboard.type('6614');   // a real keyboard works on the number pad too
  await waitView(kp, 'kiosk.already');
  ok((await text(kp)).includes('Під’їжджайте до воріт 3'), 'truck at a door: "go to door 3"');
  await snap(kp, 'kiosk-14-already-door', 'light');

  // walk-in, unknown company
  await kp.click('button[data-act="kiosk.finish"]');
  await kp.click('button[data-act="kiosk.setLang"][data-lang="en"]');
  await kp.fill('#k-company', 'Desert Rose Produce');
  await kp.waitForSelector('button[data-act="kiosk.walkIn"].go');
  await snap(kp, 'kiosk-15-company-nomatch', 'light');
  await kp.click('button[data-act="kiosk.walkIn"][data-from="company"]');
  await waitView(kp, 'kiosk.walkin');
  ok(await kp.inputValue('#k-walk-company') === 'Desert Rose Produce', 'walk-in company carried over from the search');
  await snap(kp, 'kiosk-16-walkin', 'light');
  await kp.click('button[data-act="kiosk.walkCompany"]');
  await waitView(kp, 'kiosk.walkkind');
  await snap(kp, 'kiosk-17-walkkind', 'light');
  await kp.click('button[data-act="kiosk.walkKind"][data-kind="pick"]');
  await waitView(kp, 'kiosk.walkpallets');
  ok(await kp.isDisabled('button[data-act="kiosk.walkPallets"]:not([data-unsure])'), 'pallets Next waits for a number');
  await kp.click('button[data-act="core.set"][data-value="12"]');
  await kp.click('button[data-act="core.step"][data-step="1"]');
  await snap(kp, 'kiosk-18-walkpallets', 'light');
  await kp.click('button[data-act="kiosk.walkPallets"]:not([data-unsure])');
  await waitView(kp, 'kiosk.details');
  await kp.click('button[data-act="kiosk.detailsNext"]');
  await kp.waitForSelector('[role=alert]');
  ok((await text(kp)).includes('Please type your name.'), 'details: name is required (inline message)');
  await snap(kp, 'kiosk-19-details-error', 'light');
  await kp.fill('#k-name', 'Ana Ruiz');
  await kp.fill('#k-truck', 'DR-7');
  // change language mid-flow: the answers stay
  await kp.click('button[data-act="kiosk.changeLang"]');
  await waitView(kp, 'kiosk.lang');
  await kp.click('button[data-act="kiosk.setLang"][data-lang="ru"]');
  await waitView(kp, 'kiosk.details');
  ok((await text(kp)).includes('Проверьте данные') && await kp.inputValue('#k-name') === 'Ana Ruiz', 'language change mid-flow keeps the typed answers');
  await kp.click('button[data-act="kiosk.detailsNext"]');
  await waitView(kp, 'kiosk.scan');
  await kp.click('button[data-act="kiosk.checkin"][data-skip]');
  await waitView(kp, 'kiosk.done');
  await snap(kp, 'kiosk-20-done-walkin', 'light');
  db = await h2.dump(kp);
  const walk = Object.entries(db.trucks).map(([id, x]) => Object.assign({ id }, x)).find(x => x.walkInCompany === 'Desert Rose Produce');
  ok(!!walk, 'walk-in creates a truck');
  ok(walk && walk.status === 'arrived' && walk.createdBy === 'kiosk' && walk.checkedInBy === 'kiosk' && walk.customerId === null, 'walk-in truck: arrived, createdBy kiosk, no customer');
  ok(walk && /^\d{4}$/.test(walk.code) && walk.kind === 'pick' && walk.loads[0].pallets === 13 && walk.driverName === 'Ana Ruiz' && walk.dock === 'reno', 'walk-in truck: code, kind, pallets, driver, dock');
  ok(walk && walk.history.length === 1 && walk.history[0].text === 'Walk-in checked in at the kiosk', 'walk-in history line');
  rows = Object.values(db.outbox);
  ok(rows.some(r => r.event === 'crew' && r.truckId === walk.id && /walk-in/.test(r.text)), 'walk-in crew ping');

  // walk-in for a known company from the truck list ("My truck isn't listed")
  await kp.click('button[data-act="kiosk.finish"]');
  await kp.click('button[data-act="kiosk.setLang"][data-lang="hi"]');
  await kp.fill('#k-company', 'truckee');
  await kp.click('button[data-act="kiosk.pickCompany"][data-id="c_truckee"]');
  await waitView(kp, 'kiosk.truck');
  await snap(kp, 'kiosk-21-truck-none-hi', 'light');
  await kp.click('button[data-act="kiosk.walkIn"][data-from="truck"]');
  await waitView(kp, 'kiosk.walkkind');
  await kp.click('button[data-act="kiosk.walkKind"][data-kind="drop"]');
  await kp.click('button[data-act="kiosk.walkPallets"][data-unsure]');
  await waitView(kp, 'kiosk.details');
  await kp.fill('#k-name', 'Raj Singh');
  await kp.click('button[data-act="kiosk.detailsNext"]');
  await kp.click('button[data-act="kiosk.checkin"][data-skip]');
  await waitView(kp, 'kiosk.done');
  db = await h2.dump(kp);
  const walk2 = Object.values(db.trucks).find(x => x.walkIn && x.customerId === 'c_truckee');
  ok(walk2 && walk2.driverLang === 'hi' && walk2.loads[0].pallets === 0, 'known-company walk-in keeps the customer, language and "not sure" pallets');
  ok(Object.values(db.outbox).some(r => r.event === 'arrived' && r.customerId === 'c_truckee'), 'known-company walk-in alerts the customer');
  await h2.close();

  /* ---------------- 3. dark mode screens ---------------- */
  const h3 = await H.start();
  const dark = await h3.newContext({ colorScheme: 'dark' });
  const dpage = await spanishCheckIn(h3, dark, 'dark', false);
  await dpage.close();
  const dd = await h3.open('driver', { context: dark, hash: 'driver6614', viewport: PHONE });
  await dd.waitForTimeout(150);
  await snap(dd, 'driver-06-door-dark', 'dark', [PHONE]);
  const dd2 = await h3.open('driver', { context: dark, hash: 'driver7702', viewport: PHONE });
  await dd2.click('button[data-act="driver.setLang"][data-lang="pa"]');
  await dd2.waitForTimeout(150);
  await snap(dd2, 'driver-07-booked-pa-dark', 'dark', [PHONE]);
  await h3.close();

  /* ---------------- 4. review fixes ---------------- */
  // 4a. a driver already in the yard finds the truck from the company list (no second walk-in truck);
  //     a booking at another dock is listed with a warning
  const h4 = await H.start();
  const k4 = await h4.open('kiosk', { viewport: KIOSK });
  await k4.click('button[data-act="kiosk.setLang"][data-lang="en"]');
  await k4.fill('#k-company', 'bay');
  await k4.click('button[data-act="kiosk.pickCompany"][data-id="c_bay"]');
  await waitView(k4, 'kiosk.truck');
  let tx4 = await text(k4);
  ok(await k4.isVisible('button[data-act="kiosk.showAlready"][data-id="t_ex2"]') && tx4.includes('Already checked in'), 'truck list shows the company\'s truck already in the yard');
  ok(!tx4.includes("We don't see a booked truck"), 'no "no booked truck" message when the truck is already here');
  ok(await k4.isVisible('button[data-act="kiosk.pickTruck"][data-id="t_ex8"]') && tx4.includes('Booked for North Highlands, CA'), 'booking at another dock is listed with "Booked for <dock>"');
  ok(tx4.includes('BOL-77830'), 'truck cards show the PO/BOL numbers');
  await snap(k4, 'kiosk-22-truck-already-here', 'light');
  const truckCount = Object.keys((await h4.dump(k4)).trucks).length;
  await k4.click('button[data-act="kiosk.showAlready"][data-id="t_ex2"]');
  await waitView(k4, 'kiosk.already');
  ok((await text(k4)).includes("You're already checked in"), 'tapping it shows the place in line');
  await k4.click('button[data-act="kiosk.back"]');
  await waitView(k4, 'kiosk.truck');
  ok(true, 'Back from there returns to the truck list');
  ok(Object.keys((await h4.dump(k4)).trucks).length === truckCount, 'no truck written by looking');

  // 4b. code path: the details screen says which load this is; a bad phone number is stopped
  await k4.click('button[data-act="kiosk.reset"]');
  await k4.click('button[data-act="kiosk.setLang"][data-lang="en"]');
  await k4.click('button[data-act="kiosk.toCode"]');
  await keypad(k4, '4821');
  await waitView(k4, 'kiosk.details');
  tx4 = await text(k4);
  ok(tx4.includes('Your truck') && tx4.includes('Sierra Freight Lines') && tx4.includes('PO-55120'), 'details screen shows company and PO numbers of the truck');
  await k4.fill('#k-cell', 'abc');
  await k4.click('button[data-act="kiosk.detailsNext"]');
  await k4.waitForSelector('[role=alert]');
  ok((await text(k4)).includes('Check the phone number') && await view(k4) === 'kiosk.details', 'bad phone number is stopped with an inline message');
  await snap(k4, 'kiosk-23-details-badcell', 'light');
  await k4.fill('#k-cell', '(775) 555-0199');
  await k4.click('button[data-act="kiosk.detailsNext"]');
  await waitView(k4, 'kiosk.scan');
  ok(true, 'a real phone number goes on to the paperwork step');

  // 4c. uploading a page keeps the screen awake past 90 s
  await k4.evaluate(() => { App.state.busy['kiosk:paperwork'] = true; });
  await bumpClock(k4, 100000);
  await k4.waitForTimeout(1300);
  ok(await view(k4) === 'kiosk.scan', 'no idle reset while a photo is still uploading');
  await k4.evaluate(() => { delete App.state.busy['kiosk:paperwork']; App.render(); });

  // 4c2. the screen redraws while the camera is open (clock tick, another truck changes): the page is not lost
  const [chooser] = await Promise.all([k4.waitForEvent('filechooser'), k4.click('label[for="k-paper"]')]);
  await k4.evaluate(() => App.renderNow());
  await chooser.setFiles(h4.UPLOAD_PNG);
  await k4.waitForFunction(() => (App.form('kiosk').paperwork || []).length === 1 && !App.anyBusy(), null, { timeout: 5000 }).catch(() => {});
  ok(await k4.evaluate(() => (App.form('kiosk').paperwork || []).length) === 1, 'paperwork photo kept when the screen redraws while the camera is open');
  await k4.click('button[data-act="core.photoRemove"][data-index="0"]');
  await k4.waitForFunction(() => (App.form('kiosk').paperwork || []).length === 0);

  // 4d. the office checks the truck in while the driver is scanning: the pages are kept, no double check-in
  const other = await h4.open('driver', { hash: 'driver4821', viewport: PHONE });
  await other.evaluate(() => App.logTruck('t_ex1', 'Checked in by the office', 'Office', { status: 'arrived', checkedInAt: App.iso(), checkedInBy: 'office' }));
  await k4.waitForFunction(() => App.get('trucks', 't_ex1').status === 'arrived');
  await frames(k4); await k4.waitForTimeout(150);   // let that redraw land before using the file input
  await k4.setInputFiles('#k-paper', h4.UPLOAD_PNG);
  await k4.waitForFunction(() => (App.form('kiosk').paperwork || []).length === 1 && !App.anyBusy());
  await k4.click('button[data-act="kiosk.checkin"]:not([data-skip])');
  await waitView(k4, 'kiosk.already');
  await k4.waitForTimeout(100);
  db = await h4.dump(k4);
  t = db.trucks.t_ex1;
  ok(t.checkedInBy === 'office' && t.paperwork.length === 1 && /paperwork photo at the kiosk/.test(t.history[t.history.length - 1].text), 'pages taken at the kiosk are added to the truck the office checked in');
  ok(!t.history.some(x => x.text.indexOf('Checked in at the kiosk') === 0), 'no second check-in line');

  // 4e. a booking cancelled while the driver is at the kiosk says "cancelled", not "done, drive safe"
  // (t_ex6 is booked for tomorrow 9 AM, so the driver uses the code)
  await k4.click('button[data-act="kiosk.finish"]');
  await k4.click('button[data-act="kiosk.setLang"][data-lang="es"]');
  await k4.click('button[data-act="kiosk.toCode"]');
  await keypad(k4, '7702');
  await waitView(k4, 'kiosk.details');
  await k4.fill('#k-name', 'Pat Doe');
  await k4.click('button[data-act="kiosk.detailsNext"]');
  await waitView(k4, 'kiosk.scan');
  await other.evaluate(() => App.logTruck('t_ex6', 'Cancelled by client', 'Client', { status: 'cancelled' }));
  await k4.waitForFunction(() => App.get('trucks', 't_ex6').status === 'cancelled');
  await k4.click('button[data-act="kiosk.checkin"][data-skip]');
  await waitView(k4, 'kiosk.already');
  tx4 = await text(k4);
  ok(tx4.includes('Esta cita fue cancelada') && !tx4.includes('Maneje con cuidado') && !tx4.includes('Ya está registrado'), 'cancelled booking says it was cancelled, not "already checked in" (Spanish)');
  ok((await h4.dump(k4)).trucks.t_ex6.status === 'cancelled', 'cancelled truck is not checked in');
  await snap(k4, 'kiosk-24-cancelled', 'light');

  // 4f. driver page: every tap target at least 44 px tall at phone width
  await other.goto(h4.base + '#driver8145');
  await other.waitForFunction(() => App.loaded && App.loaded.trucks && document.querySelector('[data-act="driver.setEta"]'), null, { timeout: 5000 });
  ok((await text(other)).includes('Truck 9') && (await text(other)).includes('8145'), 'a second driver link in the same tab (#hash change) opens that truck');
  const tiny = await other.evaluate(() => Array.from(document.querySelectorAll('#app button, #app input')).filter(e => e.offsetParent !== null && !e.closest('.rolebar'))
    .filter(e => e.getBoundingClientRect().height < 44).map(e => (e.innerText || e.id).trim()));
  ok(tiny.length === 0, 'driver page tap targets are 44 px or more' + (tiny.length ? ': ' + tiny.join(', ') : ''));
  await snap(other, 'driver-08-booked-en', 'light', [PHONE]);
  // a quick double tap queues one ETA alert, not two
  await other.dblclick('button[data-act="driver.setEta"][data-min="60"]');
  await other.dblclick('button[data-act="driver.late"][data-reason="lateWeather"]');
  await other.waitForTimeout(400);
  db = await h4.dump(other);
  const etaRows = Object.values(db.outbox).filter(r => r.truckId === 't_ex8' && r.event === 'eta');
  const etaHist = db.trucks.t_ex8.history.filter(x => /^Driver (ETA|running late)/.test(x.text));
  ok(etaRows.length === 2 && etaHist.length === 2, 'double taps on the driver page save once each (' + etaRows.length + ' alerts, ' + etaHist.length + ' trail lines)');
  await h4.close();

  // 4g. a viewer who cannot save is never told "You're checked in", and no alerts are queued
  const h5 = await H.start();
  const ro = await h5.newContext({ canWrite: false, viewport: KIOSK });
  const k5 = await h5.open('kiosk', { context: ro });
  await k5.click('button[data-act="kiosk.setLang"][data-lang="en"]');
  await k5.click('button[data-act="kiosk.toCode"]');
  await keypad(k5, '4821');
  await waitView(k5, 'kiosk.details');
  await k5.click('button[data-act="kiosk.detailsNext"]');
  await waitView(k5, 'kiosk.scan');
  await k5.click('button[data-act="kiosk.checkin"][data-skip]');
  await k5.waitForSelector('[role=alert]');
  ok(await view(k5) === 'kiosk.scan' && (await text(k5)).includes('Please go to the office') && (await text(k5)).includes('We could not save your check-in') && !(await text(k5)).includes('Scan your paperwork'), 'failed save: driver is sent to the office, not told they are checked in');
  db = await h5.dump(k5);
  ok(db.trucks.t_ex1.status === 'booked' && !Object.values(db.outbox).some(r => r.truckId === 't_ex1'), 'failed save: truck unchanged and no alerts queued');
  await snap(k5, 'kiosk-25-save-failed', 'light');

  // 4h. names with HTML in them show as plain text
  const seed = H.makeSeed(Date.now());
  const EVIL = '<b>x</b>"\'&<img src=x onerror="window.__pwn=1">';
  seed.customers.c_sierra.name = EVIL + ' Sierra';
  Object.assign(seed.trucks.t_ex1, { driverName: EVIL, carrier: EVIL, truckNo: EVIL, driverCell: '775-555-0142' });
  seed.trucks.t_ex1.loads[0].ref = EVIL;
  seed.trucks.t_ex4.door = EVIL;
  const h6 = await H.start({ seed });
  const k6 = await h6.open('kiosk', { viewport: KIOSK });
  await k6.click('button[data-act="kiosk.setLang"][data-lang="en"]');
  await k6.fill('#k-company', 'sierra');
  await k6.click('button[data-act="kiosk.pickCompany"][data-id="c_sierra"]');
  await waitView(k6, 'kiosk.truck');
  ok((await text(k6)).includes('<b>x</b>'), 'HTML in a company name shows as text');
  await k6.setViewportSize(PHONE);
  await noHScroll(k6, 'truck list with very long names');
  await k6.setViewportSize(KIOSK);
  await k6.click('button[data-act="kiosk.pickTruck"][data-id="t_ex1"]');
  await waitView(k6, 'kiosk.details');
  ok(await k6.inputValue('#k-name') === EVIL, 'HTML in a driver name stays exact in the input');
  await snap(k6, 'kiosk-27-long-names-details', 'light');
  await k6.click('button[data-act="kiosk.detailsNext"]');
  await k6.click('button[data-act="kiosk.checkin"][data-skip]');
  await waitView(k6, 'kiosk.done');
  const d6 = await h6.open('driver', { hash: 'driver6614', viewport: PHONE });
  await d6.waitForTimeout(150);
  const pwn = await k6.evaluate(() => !!window.__pwn || !!document.querySelector('#app img[src="x"]')) || await d6.evaluate(() => !!window.__pwn || !!document.querySelector('#app img[src="x"]'));
  ok(!pwn, 'no HTML from data is run on the kiosk or driver page');
  await noHScroll(d6, 'driver page with a very long door name');

  // 4i. brand-new empty database: kiosk still works end to end (walk-in)
  const h7 = await H.start({ seed: false });
  const k7 = await h7.open('kiosk', { viewport: PHONE });
  await k7.click('button[data-act="kiosk.setLang"][data-lang="en"]');
  await waitView(k7, 'kiosk.company');
  await k7.fill('#k-company', 'Acme Foods');
  await k7.waitForSelector('button[data-act="kiosk.walkIn"].go');
  await k7.click('button[data-act="kiosk.walkIn"][data-from="company"]');
  await k7.click('button[data-act="kiosk.walkCompany"]');
  await k7.click('button[data-act="kiosk.walkKind"][data-kind="drop"]');
  await k7.click('button[data-act="kiosk.walkPallets"][data-unsure]');
  await waitView(k7, 'kiosk.details');
  ok((await text(k7)).includes('Acme Foods') && (await text(k7)).includes('Not sure'), 'walk-in details show the company and "Not sure" pallets');
  await k7.fill('#k-name', 'Lee');
  await k7.click('button[data-act="kiosk.detailsNext"]');
  await k7.click('button[data-act="kiosk.checkin"][data-skip]');
  await waitView(k7, 'kiosk.done');
  ok((await text(k7)).includes('#1'), 'empty database: walk-in is #1 in line');
  ok(!(await text(k7)).includes('Watch for our text'), 'no phone given: the screen does not promise a text');
  await snap(k7, 'kiosk-26-empty-db-done', 'light', [PHONE]);

  const errs = [].concat(h.errors, h2.errors, h3.errors, h4.errors, h5.errors, h6.errors, h7.errors);
  await h5.close(); await h6.close(); await h7.close();
  ok(errs.length === 0, 'no page errors' + (errs.length ? ':\n  ' + errs.join('\n  ') : ''));
  if (failures.length) {
    console.log('\n' + failures.length + ' FAILED:\n- ' + failures.join('\n- '));
    process.exit(1);
  }
  console.log('\nAll kiosk tests passed. Screens in ' + SHOTS);
})().catch(e => { console.error(e); process.exit(1); });
