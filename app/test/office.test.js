/* Office test: drives the real office UI with Playwright through the harness.
   Run: cd app/test && NODE_PATH=$(npm root -g) node office.test.js   (exits non-zero on failure)
   The clock is pinned to 11:00 AM today (App.clockOffset) so "today" counts never depend on when the test runs. */
const fs = require('fs');
const H = require('./harness');
const SHOTS = process.env.SHOTS || '/tmp/claude-0/-home-user-Rulfo/928f61b7-5bf4-59e6-9ccf-0daf06c385c6/scratchpad/shots/';
fs.mkdirSync(SHOTS, { recursive: true });

const NOW = (() => { const d = new Date(); d.setHours(11, 0, 0, 0); return d.getTime(); })();
const OFFSET = NOW - Date.now();
const WIDE = { width: 1400, height: 900 };
const PHONE = { width: 390, height: 844 };

let passed = 0;
function ok(cond, msg) {
  if (!cond) throw new Error('FAILED: ' + msg);
  passed++;
  console.log('  ok - ' + msg);
}
const settle = (page, ms) => page.waitForTimeout(ms || 180);
async function pinClock(page) {
  await page.evaluate(off => { App.clockOffset = off; App.renderNow(); }, OFFSET);
  await settle(page, 120);
}
async function openOffice(h, o) {
  const page = await h.open('office', o);
  await pinClock(page);
  return page;
}
/* screenshot + no sideways scroll */
async function shot(page, name) {
  await page.evaluate(() => { window.scrollTo(0, 0); App.state.toast = null; App.renderNow(); });
  await settle(page, 150);
  const vw = page.viewportSize().width;
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  ok(sw <= vw, name + ': no horizontal scroll (' + sw + ' <= ' + vw + ')');
  await page.screenshot({ path: SHOTS + 'office-' + name + '.png', fullPage: true });
}
const text = (page) => page.evaluate(() => document.getElementById('app').innerText);
const laneIds = (page, lane) => page.$$eval('[data-lane="' + lane + '"] [data-truck]', els => els.map(e => e.getAttribute('data-truck')));
const statVal = (page, k) => page.$eval('[data-stat="' + k + '"] b', e => e.textContent.trim());
async function nav(page, label) {
  await page.click('nav[aria-label="Office menu"] button:has-text("' + label + '")');
  await settle(page);
}
const vals = (o) => Object.keys(o || {}).map(k => Object.assign({ id: k }, o[k]));
/* buttons, fields and links on the office screen smaller than 44 px (core's 40 px back arrow is left to core) */
const page3Text = (page, sel) => page.textContent(sel);
const smallTargets = (page) => page.evaluate(() => [...document.querySelectorAll('#app main button, #app main input:not([type=checkbox]), #app main select, #app main [data-act], #app .sheet button, #app .sheet input, #app .sheet select')]
  .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.height < 43.5 || r.width < 43.5); })
  .map(e => (e.innerText || e.id || e.tagName).trim().slice(0, 20) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height)));

(async () => {
  const h = await H.start({ now: NOW });
  try {
    /* ---------- 1. yard board at 1400 px ---------- */
    console.log('yard board');
    const page = await openOffice(h, { viewport: WIDE });
    ok(await statVal(page, 'yard') === '2', 'stat: in yard 2');
    ok(await statVal(page, 'doors') === '1', 'stat: at doors 1');
    ok(await statVal(page, 'done') === '1', 'stat: done today 1');
    ok(await statVal(page, 'promise') === '100%', 'stat: promise kept today 100%');
    ok(JSON.stringify(await laneIds(page, 'coming')) === '["t_ex1","t_ex8"]', 'Coming today lane: t_ex1 then t_ex8 (by ETA)');
    ok(JSON.stringify(await laneIds(page, 'waiting')) === '["t_ex3","t_ex2"]', 'Waiting lane: longest wait first');
    ok(JSON.stringify(await laneIds(page, 'doors')) === '["t_ex4"]', 'At doors lane: t_ex4');
    ok(JSON.stringify(await laneIds(page, 'done')) === '["t_ex5"]', 'Done today lane: t_ex5 (yesterday’s t_ex7 left out)');
    const longest = await page.$eval('[data-stat="longest"]', e => ({ id: e.getAttribute('data-truck'), tone: e.getAttribute('data-tone'), cls: e.className, b: e.querySelector('b').className, text: e.innerText }));
    ok(longest.id === 't_ex3', 'longest wait now is t_ex3');
    ok(longest.tone === 'bad' && /\bbad\b/.test(longest.cls) && /bad-t/.test(longest.b), 'longest wait tile is red (over goal)');
    ok(/Truckee Supply Co/.test(longest.text) && /over the 30 min goal/.test(longest.text), 'longest wait names the company and says over the goal');
    ok(await page.$eval('[data-lane="waiting"] [data-truck="t_ex3"]', e => e.classList.contains('late')), 't_ex3 card marked late (over goal)');
    ok(await page.$eval('[data-lane="coming"] [data-truck="t_ex1"]', e => e.classList.contains('ok')), 't_ex1 coming card on time');
    ok(await page.$eval('[data-doors="reno"] [data-door="3"]', e => e.classList.contains('busy') && /Sierra Freight/.test(e.textContent)), 'door map: door 3 busy with Sierra');
    ok(/7 doors open/.test(await page.textContent('[data-door-open="reno"]')) && /1, 2, 4–8/.test(await page.textContent('[data-door-open="reno"]')), 'all docks: open doors listed as ranges (1, 2, 4–8)');
    ok(/All doors: 1–50/.test(await page.textContent('[data-door-open="pa"]')), 'all docks: Middletown shows all 50 doors open');
    const c1 = (await page.textContent('[data-lane="waiting"] [data-truck="t_ex3"] [data-of-since]')).trim();
    await page.waitForTimeout(1300);
    const c2 = (await page.textContent('[data-lane="waiting"] [data-truck="t_ex3"] [data-of-since]')).trim();
    ok(c1 !== c2 && /^\d+m \d\ds$/.test(c2), 'wait clock ticks every second (' + c1 + ' -> ' + c2 + ')');
    await shot(page, 'board-1400-light');

    /* ---------- 2. dock filter ---------- */
    console.log('dock filter');
    await page.click('button[data-dock="sac"]');
    await settle(page);
    ok(JSON.stringify(await laneIds(page, 'coming')) === '["t_ex8"]', 'North Highlands: only t_ex8 in Coming');
    ok((await laneIds(page, 'waiting')).length === 0 && (await laneIds(page, 'doors')).length === 0 && (await laneIds(page, 'done')).length === 0, 'North Highlands: other lanes empty');
    ok(await statVal(page, 'yard') === '0', 'North Highlands: in yard 0');
    ok(/Nobody is waiting/.test(await text(page)), 'empty lane says so in plain words');
    ok(await page.evaluate(() => localStorage.getItem('dock24:officeDock')) === 'sac', 'dock filter saved to dock24:officeDock');
    ok(await page.locator('[data-doors]').count() === 1, 'one door map for the chosen dock');
    ok(await page.locator('[data-doors="sac"] .door').count() === 8, 'full door map: all 8 North Highlands doors');
    await shot(page, 'board-1400-sac-light');
    await page.reload();
    await page.waitForFunction(() => window.App && App.state.mode !== 'starting' && App.loaded && App.loaded.trucks);
    await pinClock(page);
    ok(await page.$eval('button[data-dock="sac"]', e => e.classList.contains('on')), 'dock filter remembered after reload');
    await page.click('button[data-dock="all"]');
    await settle(page);
    ok((await laneIds(page, 'coming')).length === 2, 'back to all docks');

    /* ---------- 3. truck detail: manual check-in, door, done ---------- */
    console.log('truck: check in, door, done');
    await page.click('[data-lane="coming"] [data-truck="t_ex1"]');
    await page.waitForSelector('#of-checkin');
    let t = await text(page);
    ok(/Sierra Freight Lines/.test(t) && /PO-55120/.test(t) && /Miguel Santos/.test(t), 'truck page: company, loads, driver');
    ok(/Load trail/.test(t) && /Booked by Dana Ortiz/.test(t), 'truck page: load trail');
    ok(/#driver4821/.test(t), 'truck page: driver link shown as text');
    await shot(page, 'truck-booked-1400-light');
    await page.click('#of-checkin');
    await page.waitForSelector('.sheet #ci-go');
    ok(await page.inputValue('#dr-cell') === '775-555-0142' && await page.inputValue('#dr-name') === 'Miguel Santos', 'check-in sheet: driver details prefilled from the booking');
    ok(await page.$eval('#dr-lang', e => e.value) === 'es', 'check-in sheet: driver language prefilled (Spanish)');
    ok(/#3 in line/.test(await page.textContent('.sheet')), 'check-in sheet: says where they will be in line');
    await page.fill('#dr-truck', '119');
    await shot(page, 'checkin-sheet-1400-light');
    await page.click('#ci-go');
    await page.waitForSelector('#of-door');
    await settle(page);
    let db = await h.dump(page);
    ok(db.trucks.t_ex1.status === 'arrived' && db.trucks.t_ex1.checkedInBy === 'office' && !!db.trucks.t_ex1.checkedInAt, 'check in: status arrived, checkedInBy office');
    ok(db.trucks.t_ex1.truckNo === '119' && db.trucks.t_ex1.driverCell === '775-555-0142', 'check in: corrected truck # saved, driver cell kept');
    ok(db.trucks.t_ex1.history.slice(-1)[0].text === 'Checked in by the office', 'check in: load trail line');
    ok(!(await page.$('.sheet')), 'check in: sheet closed');
    const arrived = vals(db.outbox).find(m => m.event === 'arrived' && m.truckId === 't_ex1');
    ok(arrived && /Place in line: 3/.test(arrived.text) && /Your truck 119/.test(arrived.text), 'outbox: arrived alert with the truck # and place in line 3');
    ok(arrived.to.some(r => r.name === 'Dana Ortiz' && r.channels.indexOf('text') >= 0), 'outbox: arrived alert goes to Dana by text');
    ok(vals(db.outbox).some(m => m.event === 'crew' && m.truckId === 't_ex1'), 'outbox: forklift crew pinged');
    ok(/Place in line/.test(await text(page)) && /#3/.test(await text(page)), 'truck page now shows place in line #3');

    await page.click('#of-door');
    await page.waitForSelector('.sheet #of-start');
    ok(await page.$eval('.sheet .door.busy', e => /Door 3/.test(e.textContent) && /Sierra Freight/.test(e.textContent)), 'door picker: door 3 busy and labelled with the company');
    ok(await page.$eval('#of-start', e => e.disabled), 'door picker: start disabled until a door is picked');
    await shot(page, 'door-sheet-1400-light');
    await page.click('.sheet button[data-door="4"]');
    await page.click('.sheet button.chip:has-text("Alex")');
    ok(/Unloading starts at door 4/.test(await page.textContent('#of-start')), 'start button names the door');
    await page.click('#of-start');
    await page.waitForSelector('.sheet', { state: 'detached' });
    await settle(page);
    db = await h.dump(page);
    ok(db.trucks.t_ex1.status === 'working' && db.trucks.t_ex1.door === '4' && db.trucks.t_ex1.crewName === 'Alex' && !!db.trucks.t_ex1.startedAt, 'start: working at door 4 with Alex');
    ok(vals(db.outbox).some(m => m.event === 'started' && m.truckId === 't_ex1' && /door 4/.test(m.text)), 'outbox: started alert');
    ok(vals(db.outbox).some(m => m.event === 'driver' && m.truckId === 't_ex1' && m.text === 'Go to door 4.' && m.to[0].phone === '775-555-0142'), 'outbox: driver text "Go to door 4."');
    await shot(page, 'truck-working-1400-light');

    await page.click('button:has-text("Mark done")');
    await page.click('button:has-text("Yes, mark done")');
    await settle(page);
    db = await h.dump(page);
    ok(db.trucks.t_ex1.status === 'done' && !!db.trucks.t_ex1.doneAt, 'mark done: status done');
    const doneMsg = vals(db.outbox).find(m => m.event === 'done' && m.truckId === 't_ex1');
    ok(doneMsg && /Done at Sparks, NV: 18 pallets/.test(doneMsg.text), 'outbox: done alert');
    ok(vals(db.outbox).some(m => m.event === 'driver' && m.truckId === 't_ex1' && /pull out/.test(m.text)), 'outbox: driver told to pull out');
    ok(/within our 2-hour promise/.test(await text(page)), 'truck page: done within promise');
    await shot(page, 'truck-done-1400-light');

    /* ---------- 3b. ETA, note, paperwork scan, photo, cancel ---------- */
    console.log('truck: ETA, note, scan, cancel');
    await page.evaluate(() => App.go('office.truck', { id: 't_ex6' }));
    await settle(page);
    await page.click('button:has-text("Set ETA")');
    await page.waitForSelector('#eta-time');
    await page.click('.sheet button.chip:has-text("In 30 min")');
    await page.fill('#eta-note', 'Driver called from Truckee');
    await shot(page, 'eta-sheet-1400-light');
    const pageNow = await page.evaluate(() => App.now());
    await page.click('.sheet button[type=submit]');
    await page.waitForSelector('.sheet', { state: 'detached' });
    await settle(page);
    db = await h.dump(page);
    ok(db.trucks.t_ex6.eta && db.trucks.t_ex6.eta.source === 'office' && Math.abs(Date.parse(db.trucks.t_ex6.eta.at) - (pageNow + 30 * 60000)) < 2 * 60000, 'ETA saved: set by the office, 30 min from now');
    ok(vals(db.outbox).some(m => m.event === 'eta' && m.truckId === 't_ex6'), 'outbox: ETA changed alert');
    await page.locator('button:has-text("Add note")').first().click();
    await page.waitForSelector('#note-text');
    await page.fill('#note-text', 'Bring the pallet jack to door 2');
    await shot(page, 'note-sheet-1400-light');
    await page.click('.sheet button[type=submit]');
    await page.waitForSelector('.sheet', { state: 'detached' });
    await settle(page);
    db = await h.dump(page);
    ok(db.trucks.t_ex6.notes === 'Bring the pallet jack to door 2' && /Office note/.test(db.trucks.t_ex6.history.slice(-1)[0].text), 'note saved with a load trail line');
    ok(/Bring the pallet jack/.test(await text(page)), 'note shown on the truck page');

    await page.evaluate(() => App.go('office.truck', { id: 't_ex2' }));
    await settle(page);
    ok(await page.locator('button:has-text("Set ETA")').count() === 0, 'no Set ETA once the truck is in the yard');
    await page.click('button:has-text("Scan paperwork")');
    await page.waitForSelector('#scan-save');
    ok(await page.$eval('#scan-save', e => e.disabled), 'scan: save waits for a photo');
    await page.setInputFiles('#scan-file', h.UPLOAD_PNG);
    await page.waitForFunction(() => { const b = document.querySelector('#scan-save'); return b && !b.disabled; });
    await shot(page, 'scan-sheet-1400-light');
    await page.click('#scan-save');
    await page.waitForSelector('.sheet', { state: 'detached' });
    await settle(page);
    db = await h.dump(page);
    ok(db.trucks.t_ex2.paperwork.length === 2 && /Paperwork scanned by the office/.test(db.trucks.t_ex2.history.slice(-1)[0].text), 'scan: page added to the truck paperwork');
    await page.click('button[aria-label="Open Paperwork page 1"]');
    await page.waitForSelector('.sheet img');
    await shot(page, 'photo-sheet-1400-light');
    await page.click('.sheet button:has-text("Close")');
    await shot(page, 'truck-waiting-1400-light');

    /* driver and truck info: add a cell and a GPS share link from the office */
    await page.evaluate(() => App.go('office.truck', { id: 't_ex8' }));
    await settle(page);
    await page.click('#of-edit-driver');
    await page.waitForSelector('.sheet #dr-save');
    await page.fill('#dr-cell', '916-555-0199');
    await page.selectOption('#dr-track', 'gps');
    await page.waitForSelector('#dr-trackurl');
    await page.fill('#dr-trackurl', 'not a link');
    await page.click('#dr-save');
    await settle(page);
    ok(/Paste the whole link/.test(await page.textContent('.sheet')), 'driver info: a bad share link is caught');
    await page.fill('#dr-trackurl', 'https://maps.example.com/share/abc');
    await shot(page, 'driver-sheet-1400-light');
    await page.click('#dr-save');
    await page.waitForSelector('.sheet', { state: 'detached' });
    await settle(page);
    db = await h.dump(page);
    ok(db.trucks.t_ex8.driverCell === '916-555-0199' && db.trucks.t_ex8.tracking === 'gps' && db.trucks.t_ex8.trackUrl === 'https://maps.example.com/share/abc', 'driver info: cell, GPS tracking and link saved');
    ok(/Office updated driver cell, ETA updates/.test(db.trucks.t_ex8.history.slice(-1)[0].text), 'driver info: load trail says what changed');
    ok((await page.textContent('#tr-live')).trim() === 'https://maps.example.com/share/abc' && await page.locator('button[data-target="tr-live"]').count() === 1, 'truck page: live link shown as text with a Copy button');
    ok(/#driver8145$/.test((await page.textContent('#tr-driver')).trim()), 'truck page: driver link with a Copy button');

    await page.click('button:has-text("Cancel truck")');
    await page.click('button:has-text("Yes, cancel truck")');
    await settle(page);
    db = await h.dump(page);
    ok(db.trucks.t_ex8.status === 'cancelled' && vals(db.outbox).some(m => m.truckId === 't_ex8' && m.event === 'booked' && /^Booking cancelled/.test(m.text)), 'cancel: status cancelled and the customer is told');
    ok(vals(db.outbox).some(m => m.truckId === 't_ex8' && m.event === 'driver' && /don’t come in/.test(m.text) && m.to[0].phone === '916-555-0199'), 'cancel: the driver gets a text not to come in');
    ok(/This truck was cancelled/.test(await text(page)), 'cancel: truck page says so');
    ok(await page.locator('.pill:has-text("Booking cancelled")').count() >= 1 && await page.locator('#app .pill:has-text("Booking confirmed")').count() === 0, 'cancel: message labelled "Booking cancelled", not "Booking confirmed"');

    await nav(page, 'Yard board');
    ok(await statVal(page, 'done') === '2' && await statVal(page, 'yard') === '2', 'board updates: done today 2, in yard 2');

    /* ---------- 4. book a truck for a customer ---------- */
    console.log('book');
    await nav(page, 'Book');
    await page.waitForSelector('#bk-cust');
    await page.fill('#bk-time', '');
    await page.click('#bk-save');
    await page.waitForSelector('.banner.bad');
    t = await text(page);
    ok(/Pick the customer/.test(t) && /Pick a date and a time/.test(t) && /Add at least one load with pallets/.test(t), 'book: inline errors for customer, time, loads');
    ok(await page.locator('.field.err').count() >= 2, 'book: fields marked red');
    await shot(page, 'book-errors-1400-light');
    await page.selectOption('#bk-cust', 'c_truckee');
    await settle(page);
    ok(await page.$eval('.seg button.on[data-field="dock"]', e => e.textContent === 'Sparks'), 'book: dock follows the customer');
    await page.click('.seg button[data-field="kind"][data-value="both"]');
    await page.fill('#bk-time', '06:00');
    await page.fill('#bk-carrier', 'Truckee Supply Co');
    await page.fill('#bk-driver', 'Ana Ruiz');
    await page.fill('#bk-cell', '530-555-0188');
    await page.selectOption('#bk-lang', 'pa');
    await page.fill('#bk-ref-0', 'SO-2001');
    /* typed one key at a time: the screen redraws on every key (live totals), digits must not come out backwards */
    await page.click('#bk-pal-0'); await page.keyboard.type('12', { delay: 40 });
    await page.click('#bk-wt-0'); await page.keyboard.type('8100', { delay: 40 });
    await settle(page);
    ok(await page.inputValue('#bk-pal-0') === '12' && await page.inputValue('#bk-wt-0') === '8100', 'book: typing 12 and 8100 key by key keeps the digits in order');
    ok(await page.locator('#bk-past').count() === 1, 'book: says when the time has already passed (6:00 AM, now 11:00 AM)');
    await page.fill('#bk-time', '15:30');
    await page.click('button:has-text("Add another load")');
    await page.fill('#bk-ref-1', 'PU-2002');
    await page.fill('#bk-pal-1', '-4');
    await page.click('#bk-save');
    await settle(page);
    ok(/Pallets and weight are numbers/.test(await text(page)) && await page.locator('#bk-code').count() === 0, 'book: a negative pallet count is caught, nothing booked');
    ok(await page.locator('#bk-past').count() === 0, 'book: past-time note gone after picking 3:30 PM');
    await page.fill('#bk-pal-1', '4');
    await page.selectOption('#bk-track', 'samsara');
    await page.waitForSelector('#bk-trackurl');
    await page.fill('#bk-trackurl', 'https://cloud.samsara.com/o/1/fleet/viewer/test');
    await settle(page);
    ok(/16 pallets · 8,100 lbs/.test(await text(page)), 'book: totals add up while typing');
    await shot(page, 'book-filled-1400-light');
    await page.click('#bk-save');
    await page.waitForSelector('#bk-code');
    await settle(page);
    const code = (await page.textContent('#bk-code')).trim();
    db = await h.dump(page);
    const booked = vals(db.trucks).find(x => x.customerId === 'c_truckee' && x.createdBy === 'office');
    ok(booked && booked.status === 'booked' && booked.code === code && /^\d{4}$/.test(code), 'book: booked truck saved with the code shown (' + code + ')');
    ok(booked.kind === 'both' && booked.dock === 'reno' && booked.loads.length === 2 && booked.loads[0].pallets === 12 && booked.loads[0].weight === 8100 && booked.loads[1].pallets === 4 && booked.driverCell === '530-555-0188', 'book: kind, dock, loads, driver saved');
    ok(booked.driverLang === 'pa' && booked.tracking === 'samsara' && booked.trackUrl === 'https://cloud.samsara.com/o/1/fleet/viewer/test', 'book: driver language and Samsara link saved');
    ok(new Date(booked.apptAt).getHours() === 15 && new Date(booked.apptAt).getMinutes() === 30, 'book: appointment 3:30 PM');
    ok(vals(db.outbox).some(m => m.event === 'booked' && m.truckId === booked.id && m.text.indexOf(code) >= 0), 'outbox: booked alert with the code');
    ok((await page.textContent('#bk-link')).trim().endsWith('#driver' + code), 'booked: driver link shown as text');
    await shot(page, 'booked-1400-light');

    /* ---------- 5. outbox ---------- */
    console.log('outbox');
    await nav(page, 'Outbox');
    t = await text(page);
    ok(/Texts and emails are not connected yet. This is exactly what would be sent./.test(t), 'outbox: not-connected banner');
    db = await h.dump(page);
    ok(await page.locator('[data-msg]').count() === Object.keys(db.outbox).length, 'outbox: one row per message');
    const doneRow = page.locator('[data-msg="' + doneMsg.id + '"]');
    const doneRowText = await doneRow.innerText();
    ok(/Dana Ortiz/.test(doneRowText) && /775-555-0101/.test(doneRowText) && /dispatch@example.com/.test(doneRowText), 'outbox: recipients with phone and email');
    ok(await doneRow.locator('.pill:has-text("Text")').count() >= 1 && await doneRow.locator('.pill:has-text("Email")').count() >= 1, 'outbox: Text and Email pills');
    const firstEvent = await page.$eval('[data-msg]', e => e.getAttribute('data-event'));
    ok(firstEvent === 'booked', 'outbox: newest first');
    ok(/No one gets this one/.test(await page.locator('[data-msg]').first().innerText()), 'outbox: says when no contact gets an alert');
    await page.selectOption('#ob-event', 'arrived');
    await settle(page);
    const evs = await page.$$eval('[data-msg]', els => els.map(e => e.getAttribute('data-event')));
    ok(evs.length === 2 && evs.every(e => e === 'arrived'), 'outbox: filter by kind');
    await page.selectOption('#ob-cust', 'c_bay');
    await settle(page);
    ok(await page.locator('[data-msg]').count() === 1, 'outbox: filter by company');
    await page.selectOption('#ob-event', '');
    await page.selectOption('#ob-cust', '');
    await settle(page);
    await shot(page, 'outbox-1400-light');

    /* ---------- 6. Friday summaries ---------- */
    console.log('friday');
    await nav(page, 'Friday');
    ok(await page.locator('[data-friday]').count() === 3, 'friday: a card per customer');
    await page.click('[data-friday="c_sierra"] button:has-text("Preview email")');
    await page.waitForSelector('#fr-preview');
    const preview = await page.textContent('#fr-preview');
    ok(/Hi Sierra Freight Lines team/.test(preview) && /Our gear still with you: 12 plywood sheets, 2 load bars/.test(preview), 'friday: preview text with gear out');
    ok(/Trucks: 2 \(1 done\)/.test(preview), 'friday: counts this week’s trucks');
    await shot(page, 'friday-preview-1400-light');
    await page.click('.sheet button:has-text("Close")');
    await settle(page);
    await page.dblclick('#fr-queue');   // a double click must not queue two copies
    await settle(page, 300);
    db = await h.dump(page);
    const fr = vals(db.outbox).filter(m => m.event === 'friday');
    ok(fr.length === 3 && new Set(fr.map(m => m.customerId)).size === 3, 'friday: one friday outbox row per customer');
    ok(fr.every(m => /24 HR Crossdock/.test(m.text)), 'friday: text has the email body');
    ok(/Already queued this week/.test(await text(page)), 'friday: says it was queued');
    ok(vals((await h.dump(page)).outbox).filter(m => m.event === 'friday').length === 3, 'friday: a double click does not queue copies');
    await page.click('button:has-text("Queue them again")');
    await settle(page);
    ok(/Are you sure\?/.test(await text(page)), 'friday: queuing again asks first');
    await page.click('#fr-queue-again');
    await settle(page);
    ok(vals((await h.dump(page)).outbox).filter(m => m.event === 'friday').length === 6, 'friday: "Yes, queue them again" queues a new copy each');
    await shot(page, 'friday-1400-light');

    /* ---------- 7. damage ---------- */
    console.log('damage');
    await nav(page, 'Damage');
    ok(await page.locator('[data-damage]').count() === 2, 'damage: two reports');
    await page.click('button.chip:has-text("Waiting")');
    await settle(page);
    ok(await page.locator('[data-damage]').count() === 1, 'damage: filter waiting');
    await shot(page, 'damage-1400-light');
    await page.click('[data-damage="d_ex1"]');
    await page.waitForSelector('#dm-note');
    ok(/can’t approve for them/.test(await page.textContent('.sheet')), 'damage sheet: office cannot approve');
    ok(/\$90\.00/.test(await page.textContent(".sheet")), "damage sheet: total $90.00 (2 x $15 + 0.5 h x $120)");
    await page.fill('#dm-note', 'Called Priya, she will look after lunch');
    await page.click('.sheet button:has-text("Add note")');
    await settle(page);
    db = await h.dump(page);
    ok((db.damage.d_ex1.officeNotes || []).length === 1 && /Called Priya/.test(db.damage.d_ex1.officeNotes[0].text), 'damage: office note saved');
    ok(db.damage.d_ex1.status === 'waiting', 'damage: status unchanged by the office');
    await shot(page, 'damage-sheet-1400-light');
    await page.click('.sheet button:has-text("Close")');

    /* ---------- 8. gear ---------- */
    console.log('gear');
    await nav(page, 'Gear');
    const sierraRow = await page.innerText('[data-gear-row="c_sierra"]');
    ok(/12/.test(sierraRow) && /B-104/.test(sierraRow), 'gear: Sierra has 12 plywood and tag B-104 out');
    await page.click('[data-gear-row="c_sierra"] button:has-text("Log return")');
    await page.waitForSelector('#gr-save');
    await page.click('.sheet .seg button[data-value="bars"]');
    await page.click('.sheet .stepper button[aria-label="One more"]');
    await page.click('.sheet button.chip:has-text("B-104")');
    await page.click('.sheet button.chip:has-text("B-117")');
    await shot(page, 'gear-sheet-1400-light');
    await page.click('#gr-save');
    await page.waitForSelector('.sheet', { state: 'detached' });
    await settle(page);
    db = await h.dump(page);
    const back = vals(db.gear).find(g => g.dir === 'back' && g.type === 'bars');
    ok(back && back.qty === 2 && back.customerId === 'c_sierra' && back.tags.join() === 'B-104,B-117', 'gear: return logged (2 load bars, both tags)');
    await page.click('[data-gear-row="c_sierra"] button:has-text("Log return")');
    await page.waitForSelector('#gr-save');
    ok(await page.$$eval('#gr-cust option', os => os.map(o => o.value).join()) === ',c_sierra', 'gear sheet: only customers with gear out are listed');
    await page.click('.sheet .seg button[data-value="bars"]');
    await settle(page);
    ok(/no load bars out with Sierra/.test(await page.textContent('.sheet')) && await page.$eval('#gr-save', e => e.disabled), 'gear sheet: cannot log load bars back when none are out');
    await page.click('.sheet .seg button[data-value="plywood"]');
    for (let i = 0; i < 12; i++) await page.click('.sheet .stepper button[aria-label="One more"]');
    await settle(page);
    ok(/only 12 plywood sheets out/.test(await page.textContent('.sheet')) && await page.$eval('#gr-save', e => e.disabled), 'gear sheet: cannot log 13 plywood sheets back when 12 are out');
    await page.click('.sheet button:has-text("Close")');
    await settle(page);
    ok(!/B-104/.test(await page.innerText('[data-gear-row="c_sierra"]')), 'gear: tags no longer shown as out');
    await shot(page, 'gear-1400-light');

    /* ---------- 9. customers ---------- */
    console.log('customers');
    await nav(page, 'Customers');
    ok(await page.locator('[data-cust-row]').count() === 3, 'customers: three listed');
    await page.fill('#cu-q', 'truck');
    await settle(page);
    ok(await page.locator('[data-cust-row]').count() === 1, 'customers: search');
    await page.fill('#cu-q', '');
    await settle(page);
    await shot(page, 'customers-1400-light');
    await page.click('[data-cust-row="c_truckee"]');
    await page.waitForSelector('#cu-name');
    const origAlerts = (await h.dump(page)).customers.c_truckee.contacts[0].alerts;
    /* meanwhile the customer turns on ETA texts in their portal: the office save must not undo that */
    const cl = await h.open('client', { customerId: 'c_truckee' });
    await cl.evaluate(() => { const cs = App.clone(App.get('customers', 'c_truckee').contacts); cs[0].alerts.eta = { text: true, email: true }; return App.patch('customers', 'c_truckee', { contacts: cs }); });
    await cl.close();
    await settle(page, 250);
    const wantAlerts = JSON.parse(JSON.stringify(origAlerts)); wantAlerts.eta = { text: true, email: true };
    await page.fill('#cu-notes', 'Gate code 4411');
    await page.fill('#cu-auto', '40');
    await page.click('button:has-text("+ Add contact")');
    await page.waitForSelector('#cu-c1-name');
    await page.fill('#cu-c1-name', 'Lee Wong');
    await page.click('#cu-save');
    await page.waitForSelector('.banner.bad');
    ok(/Add a cell or an email/.test(await text(page)), 'customer: contact needs a cell or email');
    await page.fill('#cu-c1-phone', '530-555-0111');
    await page.click('#cu-save');
    await settle(page);
    db = await h.dump(page);
    ok(db.customers.c_truckee.notes === 'Gate code 4411' && db.customers.c_truckee.autoApproveUnder === 40, 'customer: notes and auto-approve saved');
    ok(db.customers.c_truckee.contacts.length === 2 && db.customers.c_truckee.contacts[1].name === 'Lee Wong' && !!db.customers.c_truckee.contacts[1].alerts, 'customer: new contact saved with alerts');
    ok(JSON.stringify(db.customers.c_truckee.contacts[0].alerts) === JSON.stringify(wantAlerts), 'customer: alert choices the customer changed meanwhile are kept');
    await page.click('#cu-save');
    await settle(page);
    ok(/No changes to save/.test(await text(page)), 'customer: saving again with no changes writes nothing');
    await shot(page, 'customer-1400-light');
    await nav(page, 'Customers');
    await page.click('button:has-text("+ New customer")');
    await page.waitForSelector('#cu-name');
    await page.fill('#cu-name', 'Reno Test Foods');
    await page.fill('#cu-code', 'sierra');
    await page.click('#cu-save');
    await page.waitForSelector('.banner.bad');
    ok(/Another customer already uses SIERRA/.test(await text(page)), 'new customer: duplicate code caught');
    await page.fill('#cu-code', 'rtf');
    await page.click('#cu-save');
    await settle(page);
    db = await h.dump(page);
    const nc = vals(db.customers).find(c => c.name === 'Reno Test Foods');
    ok(nc && nc.code === 'RTF' && nc.dock === 'reno' && nc.autoApproveUnder === null && nc.fridaySummary === true, 'new customer: saved with code RTF, never auto-approve');

    /* ---------- 10. settings ---------- */
    console.log('settings');
    await nav(page, 'Settings');
    /* a forklift driver adds their name from their phone while the office has Settings open */
    const fk = await h.open('crew', { crewName: 'Alex' });
    await fk.evaluate(() => App.patch('settings', 'main', { crew: App.settings().crew.concat(['Pat']) }));
    await fk.close();
    await settle(page, 250);
    ok(/Everything is saved/.test(await text(page)) && /Pat/.test(await page.innerText('#app')), 'settings: a name added on a forklift phone shows up live, no false "not saved" warning');
    await page.click('#set-wait');
    await page.keyboard.press('Control+A');
    await page.keyboard.type('45', { delay: 40 });
    await page.fill('#set-newcrew', 'Maria');
    await page.click('form[data-submit="office.crewAdd"] button[type=submit]');
    await settle(page);
    ok(/not saved yet/.test(await text(page)), 'settings: unsaved changes are flagged');
    t = await text(page);
    const links = await page.$$eval('[id^="lk-"]', els => els.map(e => e.textContent.trim()));
    ok(['client', 'kiosk', 'crew', 'office', 'driver'].every(r => links.some(v => v.endsWith('#' + r))), 'settings: per-role links shown as text');
    await shot(page, 'settings-1400-light');
    await page.click('#set-save');
    await settle(page);
    db = await h.dump(page);
    ok(db.settings.main.waitGoalMin === 45, 'settings: wait goal saved (45)');
    ok(db.settings.main.crew.join() === 'Alex,Jordan,Sam,Pat,Maria' && db.settings.main.docks.reno.name === 'Sparks, NV', 'settings: crew saved with Pat kept, dock names kept');
    await page.click('button[aria-label="Remove Pat"]');
    await settle(page);
    ok(!/\bPat\b/.test(await page.innerText('.chips:has(button[aria-label^="Remove"])')) && /not saved yet/.test(await text(page)), 'settings: removing a name waits for Save');
    await page.click('#set-save');
    await settle(page);
    ok((await h.dump(page)).settings.main.crew.join() === 'Alex,Jordan,Sam,Maria', 'settings: name removed after Save');
    ok(/Everything is saved/.test(await text(page)), 'settings: saved state shown');
    await nav(page, 'Yard board');
    ok(/goal 45 min/.test(await text(page)), 'board uses the new wait goal');

    /* ---------- 11. phone width 390: every view, no sideways scroll ---------- */
    console.log('phone width');
    const ph = await openOffice(h, { viewport: PHONE });
    await shot(ph, 'board-390-light');
    let small = await smallTargets(ph);
    ok(small.length === 0, 'board-390: every tap target is at least 44 px' + (small.length ? ' (' + small.join(', ') + ')' : ''));
    for (const [label, name] of [['Book', 'book'], ['Damage', 'damage'], ['Gear', 'gear'], ['Customers', 'customers'], ['Outbox', 'outbox'], ['Friday', 'friday'], ['Settings', 'settings']]) {
      await nav(ph, label);
      await shot(ph, name + '-390-light');
      small = await smallTargets(ph);
      ok(small.length === 0, name + '-390: every tap target is at least 44 px' + (small.length ? ' (' + small.join(', ') + ')' : ''));
    }
    await ph.evaluate(() => App.go('office.truck', { id: 't_ex3' }));
    await shot(ph, 'truck-390-light');
    small = await smallTargets(ph);
    ok(small.length === 0, 'truck-390: every tap target is at least 44 px' + (small.length ? ' (' + small.join(', ') + ')' : ''));
    await ph.click('#of-door');
    await ph.waitForSelector('.sheet #of-start');
    await shot(ph, 'door-sheet-390-light');
    await ph.click('.sheet button:has-text("Close")');
    await ph.click('#of-edit-driver');
    await ph.waitForSelector('.sheet #dr-save');
    await shot(ph, 'driver-sheet-390-light');
    small = await smallTargets(ph);
    ok(small.length === 0, 'driver sheet 390: every tap target is at least 44 px' + (small.length ? ' (' + small.join(', ') + ')' : ''));
    await ph.click('.sheet button:has-text("Close")');
    await ph.evaluate(() => App.go('office.customer', { id: 'c_sierra' }));
    await shot(ph, 'customer-390-light');
    small = await smallTargets(ph);
    ok(small.length === 0, 'customer-390: every tap target is at least 44 px' + (small.length ? ' (' + small.join(', ') + ')' : ''));
    await ph.evaluate(() => App.go('office.gear'));
    await settle(ph);
    await ph.click('[data-gear-row="c_sierra"] button:has-text("Log return")');
    await ph.waitForSelector('#gr-save');
    await shot(ph, 'gear-sheet-390-light');
    await ph.close();

    /* ---------- 12. dark mode ---------- */
    console.log('dark mode');
    const darkWide = await h.newContext({ colorScheme: 'dark', viewport: WIDE });
    const dw = await openOffice(h, { context: darkWide });
    await shot(dw, 'board-1400-dark');
    await dw.evaluate(() => App.go('office.truck', { id: 't_ex4' }));
    await shot(dw, 'truck-1400-dark');
    await dw.evaluate(() => App.go('office.settings'));
    await shot(dw, 'settings-1400-dark');
    const darkPhone = await h.newContext({ colorScheme: 'dark', viewport: PHONE });
    const dp = await openOffice(h, { context: darkPhone });
    await shot(dp, 'board-390-dark');
    await dp.evaluate(() => App.go('office.truck', { id: 't_ex7' }));
    await shot(dp, 'truck-done-pickup-390-dark');
    await dp.evaluate(() => App.go('office.book'));
    await shot(dp, 'book-390-dark');
    await dp.evaluate(() => App.go('office.damage'));
    await settle(dp);
    await dp.click('[data-damage="d_ex1"]');
    await dp.waitForSelector('#dm-note');
    await shot(dp, 'damage-sheet-390-dark');

    ok(h.errors.length === 0, 'no page errors' + (h.errors.length ? ':\n' + h.errors.join('\n') : ''));
  } finally {
    await h.close();
  }

  /* ---------- 13. clear example data (own harness, fresh data) ---------- */
  console.log('clear example data');
  const h2 = await H.start({ now: NOW });
  try {
    const p2 = await openOffice(h2, { viewport: WIDE });
    await nav(p2, 'Settings');
    ok(/made-up example record/.test(await text(p2)), 'settings: example data count shown');
    await p2.click('button:has-text("Clear example data")');
    await p2.waitForSelector('#set-clear-yes');
    ok(/Are you sure\?/.test(await text(p2)), 'clear: asks first (two taps)');
    await p2.click('#set-clear-yes');
    await settle(p2, 500);
    const db2 = await h2.dump(p2);
    const left = Object.keys(db2).reduce((n, c) => n + vals(db2[c]).filter(d => d.example === true).length, 0);
    ok(left === 0, 'clear: no example docs left in any collection');
    ok(Object.keys(db2.trucks || {}).length === 0 && Object.keys(db2.customers || {}).length === 0, 'clear: trucks and customers gone');
    ok(/No example data left/.test(await text(p2)), 'clear: settings says no example data left');
    await nav(p2, 'Yard board');
    ok(await statVal(p2, 'yard') === '0' && /No trucks booked for today/.test(await text(p2)), 'board after clear: empty states');
    await shot(p2, 'board-empty-1400-light');
    ok(h2.errors.length === 0, 'no page errors after clear' + (h2.errors.length ? ':\n' + h2.errors.join('\n') : ''));
  } finally {
    await h2.close();
  }
  /* ---------- 14. hostile data, several docks, unsecured pickup, door taken while picking, back buttons ---------- */
  console.log('hostile data and edge cases');
  const seed = H.makeSeed(NOW);
  const BAD = '<b>x</b>"\'&<img src=x onerror="window.__pwn=1">';
  seed.customers.c_sierra.name = BAD + ' Sierra';
  seed.customers.c_sierra.contacts[0].name = BAD;
  Object.assign(seed.trucks.t_ex2, { driverName: BAD, carrier: BAD, notes: BAD, trackUrl: 'javascript:alert(1)', tracking: 'gps' });
  seed.trucks.t_ex2.loads[0].ref = BAD;
  seed.trucks.t_ex2.history.push({ at: new Date(NOW).toISOString(), by: BAD, text: BAD });
  seed.damage.d_ex1.what = BAD; seed.damage.d_ex1.kinds = [BAD];
  seed.outbox.msg_ex1.text = BAD;
  seed.gear.g_ex2.tags = [BAD];
  seed.settings.main.crew.push(BAD);
  const iso = (ms) => new Date(ms).toISOString();
  seed.trucks.t_walk = { customerId: null, walkInCompany: BAD, code: '9911', dock: 'pa', kind: 'drop', status: 'arrived', loads: [{ id: 'l1', ref: 'W-1', pallets: 4, weight: 0 }],
    checkedInAt: iso(NOW - 60 * 60000), checkedInBy: 'kiosk', paperwork: [], history: [{ at: iso(NOW - 60 * 60000), by: 'Kiosk', text: 'Walk-in checked in at the kiosk' }], createdBy: 'kiosk', createdAt: iso(NOW - 60 * 60000), example: true };
  seed.trucks.t_pick = { customerId: 'c_bay', code: '4402', dock: 'reno', kind: 'pick', status: 'done', apptAt: iso(NOW - 3 * 3600000), loads: [{ id: 'l1', ref: 'PU-1', pallets: 10, weight: 0 }],
    checkedInAt: iso(NOW - 3 * 3600000), startedAt: iso(NOW - 2.5 * 3600000), doneAt: iso(NOW - 2 * 3600000), door: '6', crewName: 'Sam', paperwork: [], history: [], createdBy: 'client', example: true };
  const h3 = await H.start({ seed });
  try {
    const p3 = await openOffice(h3, { viewport: WIDE });
    const xss = async (where) => {
      const r = await p3.evaluate(() => ({ el: [...document.querySelectorAll('#app b')].filter(b => b.textContent === 'x').length + document.querySelectorAll('#app img[src="x"]').length, pwn: !!window.__pwn, txt: document.getElementById('app').innerText.indexOf('<b>x</b>') >= 0 }));
      ok(r.el === 0 && !r.pwn && r.txt, where + ': names with <b>, quotes and & show as plain text');
    };
    await xss('board');
    ok(JSON.stringify(await p3.$$eval('[data-lane="waiting"] .tcard > span:first-child > span:first-child', els => els.map(e => e.textContent))) === '["#1 in line at Middletown","#1 in line at Sparks","#2 in line at Sparks"]',
      'all docks: place in line is counted per dock');
    ok(/No securement report/.test(await page3Text(p3, '[data-lane="done"] [data-truck="t_pick"]')), 'done lane: a pickup with no securement report is flagged');
    for (const [v, prm, label] of [['office.truck', { id: 't_ex2' }, 'truck page'], ['office.truck', { id: 't_walk' }, 'walk-in truck page'], ['office.damage', {}, 'damage list'], ['office.gear', {}, 'gear'],
      ['office.customers', {}, 'customers'], ['office.customer', { id: 'c_sierra' }, 'customer page'], ['office.outbox', {}, 'outbox'], ['office.friday', {}, 'friday'], ['office.settings', {}, 'settings'], ['office.book', {}, 'book']]) {
      await p3.evaluate(([v, prm]) => App.go(v, prm), [v, prm]);
      await settle(p3, 120);
      await xss(label);
    }
    await p3.evaluate(() => App.go('office.truck', { id: 't_ex2' }));
    await settle(p3);
    ok(await p3.locator('#tr-live').count() === 0 && /Not pasted yet/.test(await text(p3)), 'truck page: a javascript: link is never shown as a live link');
    await p3.evaluate(() => App.sheet('office.damageItem', { id: 'd_ex1' }));
    await settle(p3, 120);
    await xss('damage sheet');
    await p3.evaluate(() => App.sheet('office.fridayPreview', { id: 'c_sierra' }));
    await settle(p3, 120);
    await xss('friday preview');

    await p3.evaluate(() => App.go('office.truck', { id: 't_pick' }));
    await settle(p3);
    ok(await p3.locator('[data-secure-missing]').count() === 1 && /left without a securement report/.test(await text(p3)), 'truck page: unsecured pickup says so plainly');
    await p3.evaluate(() => App.go('office.truck', { id: 't_ex7' }));
    await settle(p3);
    ok(/5 of 5, Rock solid/.test(await text(p3)) && /Signed by Alex/.test(await text(p3)), 'truck page: securement confidence and who signed');

    /* door picker: someone else takes the door while the office is choosing */
    await p3.evaluate(() => App.go('office.truck', { id: 't_ex3' }));
    await settle(p3);
    await p3.click('#of-door');
    await p3.waitForSelector('.sheet #of-start');
    await p3.click('.sheet button[data-door="4"]');
    ok(!(await p3.$eval('#of-start', e => e.disabled)), 'door picker: door 4 picked');
    const other = await h3.open('crew', { crewName: 'Jordan' });
    await other.evaluate(() => App.logTruck('t_ex2', 'Unloading started at door 4', 'Jordan', { status: 'working', startedAt: App.iso(), door: '4', crewName: 'Jordan' }));
    await settle(p3, 300);
    ok(await p3.$eval('#of-start', e => e.disabled) && await p3.locator('.sheet .door.busy:has-text("Door 4")').count() === 1 && /Pick a door first/.test(await p3.textContent('#of-start')),
      'door picker: door 4 taken by the crew meanwhile, Start waits for a new pick');
    await other.evaluate(() => App.logTruck('t_ex3', 'Unloading started at door 5', 'Jordan', { status: 'working', startedAt: App.iso(), door: '5', crewName: 'Jordan' }));
    await settle(p3, 300);
    ok(/Already started at door 5 by Jordan/.test(await p3.textContent('.sheet')), 'door picker: says when the crew already started this truck');
    await other.close();
    await p3.click('.sheet button:has-text("Close")');
    await settle(p3);

    /* back buttons return to where the truck was opened from */
    await p3.evaluate(() => App.go('office.customer', { id: 'c_sierra' }));
    await settle(p3);
    await p3.click('.li.link[data-truck="t_ex4"]');
    await settle(p3);
    ok(await p3.evaluate(() => App.state.view) === 'office.truck', 'customer page: tap an active truck opens it');
    await p3.click('.topbar .tb-back');
    await settle(p3);
    ok(await p3.evaluate(() => App.state.view + ' ' + App.state.params.id) === 'office.customer c_sierra', 'truck back button returns to the customer page');
    await p3.evaluate(() => App.go('office.outbox'));
    await settle(p3);
    await p3.locator('button:has-text("Open truck (code 2286)")').first().click();
    await settle(p3);
    await p3.click('.topbar .tb-back');
    await settle(p3);
    ok(await p3.evaluate(() => App.state.view) === 'office.outbox', 'truck back button returns to the outbox');
    ok(h3.errors.length === 0, 'no page errors with hostile data' + (h3.errors.length ? ':\n' + h3.errors.join('\n') : ''));
  } finally {
    await h3.close();
  }

  /* ---------- 15. brand-new empty database ---------- */
  console.log('empty database');
  const h4 = await H.start({ seed: false });
  try {
    const p4 = await openOffice(h4, { viewport: PHONE });
    ok(await statVal(p4, 'yard') === '0' && /No trucks booked for today/.test(await text(p4)) && /Nobody is waiting/.test(await text(p4)), 'empty: board explains every empty lane');
    await nav(p4, 'Book');
    ok(/No customers yet/.test(await text(p4)), 'empty: Book says to add a customer first');
    await shot(p4, 'book-empty-390-light');
    await nav(p4, 'Gear');
    ok(/All of our gear is home/.test(await text(p4)) && await p4.locator('button:has-text("Log gear coming back")').count() === 0, 'empty: gear says everything is home, no return button');
    await nav(p4, 'Customers');
    await p4.click('button:has-text("+ New customer")');
    await p4.waitForSelector('#cu-name');
    await p4.fill('#cu-name', 'First Real Co');
    await p4.fill('#cu-code', 'frc');
    await p4.fill('#cu-c0-name', 'Ann');
    await p4.fill('#cu-c0-email', 'ann@example.com');
    await p4.click('#cu-save');
    await settle(p4);
    await nav(p4, 'Book');
    const cid = await p4.$eval('#bk-cust option:nth-child(2)', o => o.value);
    await p4.selectOption('#bk-cust', cid);
    await p4.fill('#bk-pal-0', '5');
    await p4.click('#bk-save');
    await p4.waitForSelector('#bk-code');
    const db4 = await h4.dump(p4);
    ok(vals(db4.trucks).length === 1 && vals(db4.outbox).some(m => m.event === 'booked' && m.to.some(r => r.email === 'ann@example.com')), 'empty: first customer and first booking work, booking email queued for Ann');
    await nav(p4, 'Settings');
    await p4.fill('#set-newcrew', 'Rosa');
    await p4.click('form[data-submit="office.crewAdd"] button[type=submit]');
    await p4.click('#set-save');
    await settle(p4);
    const st = (await h4.dump(p4)).settings.main;
    ok(st.crew.join() === 'Rosa' && st.docks.pa.doors === 50 && st.docks.pa.name === 'Middletown, PA' && st.example === false, 'empty: first settings save keeps the dock names and doors');
    ok(h4.errors.length === 0, 'no page errors on an empty database' + (h4.errors.length ? ':\n' + h4.errors.join('\n') : ''));
  } finally {
    await h4.close();
  }
  console.log('\n' + passed + ' checks passed');
})().catch(e => { console.error(e); process.exit(1); });
