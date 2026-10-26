/* Client portal test: drives the real UI with Playwright through the harness.
   Run: cd app/test && NODE_PATH=$(npm root -g) node client.test.js   (exits non-zero on failure) */
const fs = require('fs');
const H = require('./harness');
const SHOTS = process.env.SHOTS || '/tmp/claude-0/-home-user-Rulfo/928f61b7-5bf4-59e6-9ccf-0daf06c385c6/scratchpad/shots/';
fs.mkdirSync(SHOTS, { recursive: true });

let passed = 0;
function ok(cond, msg) {
  if (!cond) throw new Error('FAILED: ' + msg);
  passed++;
  console.log('  ok - ' + msg);
}
const settle = (page, ms) => page.waitForTimeout(ms || 160);
/* screenshot + no sideways scroll at phone width */
async function shot(page, name) {
  await settle(page, 120);
  const vw = page.viewportSize().width;
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  ok(sw <= vw, name + ': no horizontal scroll (' + sw + ' <= ' + vw + ')');
  await page.screenshot({ path: SHOTS + 'client-' + name + '.png', fullPage: true });
}
const text = (page) => page.evaluate(() => document.getElementById('app').innerText);
function ymd(ms) { const d = new Date(ms); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
/* book on the next weekday, so the "no after-hours fee at 3:17 PM" check works whatever day the test runs */
let bookMs = Date.now() + 864e5;
while ([0, 6].includes(new Date(bookMs).getDay())) bookMs += 864e5;
const BOOK_DAY = ymd(bookMs), BOOK_DATE = new Date(bookMs);
/* every visible button / link / input on the client screen is at least 44 px (core's top-bar back button,
   role bar, tab bar and the two-tap confirm buttons are core pieces and are reported separately) */
async function tapTargets(page, name) {
  const bad = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('#app button, #app a, #app input, #app select, #app textarea, #app label.check, #app [data-act]').forEach(el => {
      if (el.closest('.rolebar') || el.closest('.tabbar') || el.classList.contains('tb-back') || el.matches('[data-act="core.confirmNo"]') || (el.closest('span.row') && el.closest('span.row').textContent.indexOf('Are you sure?') === 0)) return;
      if (el.tagName === 'INPUT' && (el.type === 'file' || (el.type === 'checkbox' && el.closest('label.check')))) return;
      const b = el.getBoundingClientRect();
      if (!b.width || !b.height) return;
      if (b.height < 43.5 || b.width < 43.5) out.push((el.innerText || el.value || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 30) + ' ' + Math.round(b.width) + 'x' + Math.round(b.height));
    });
    return out;
  });
  ok(bad.length === 0, name + ': tap targets at least 44 px' + (bad.length ? ' — too small: ' + bad.join(' | ') : ''));
}

(async () => {
  const h = await H.start();
  try {
    /* ---------- 1. sign in through the sign-in screen ---------- */
    console.log('sign in');
    const page = await h.open('client', { customerId: null });
    ok(/Which company are you\?/.test(await text(page)), 'sign-in screen asks which company');
    ok(/Prototype: real sign-in comes later/.test(await text(page)), 'prototype note shown');
    await shot(page, 'signin-light');
    await page.fill('#signin-code', 'NOPE');
    await page.click('button[type=submit]:has-text("Sign in")');
    await page.waitForSelector('.errmsg');
    ok(/don.t know that code/.test(await text(page)), 'wrong company code shows an inline message');
    await page.click('button.choice:has-text("Sierra Freight Lines")');
    await page.waitForSelector('text=Live trucks');
    ok(await page.evaluate(() => localStorage.getItem('dock24:customer')) === 'c_sierra', 'company saved to dock24:customer');

    /* ---------- 2. home: promise, live trucks, live clock ---------- */
    console.log('home');
    let t = await text(page);
    ok(/Unloaded within 2 hours of check-in/.test(t), 'promise banner shown');
    ok(/Truck 121/.test(t) && /Door 3/.test(t), 'working truck shows its door');
    ok(/Truck 118/.test(t) && /PO-55120/.test(t), 'booked truck shows refs');
    ok(await page.locator('.card.link').count() === 3, 'three live trucks for Sierra');
    ok(/916-616-3481/.test(t), 'dock phone in the footer');
    const clock1 = await page.locator('[data-cl-since]').first().textContent();
    await page.waitForTimeout(1300);
    const clock2 = await page.locator('[data-cl-since]').first().textContent();
    ok(clock1 !== clock2 && /\d+m \d\ds/.test(clock2), 'live clock ticks every second (' + clock1 + ' -> ' + clock2 + ')');
    await shot(page, 'home-light');

    /* ---------- 3. book a new truck: 2 loads, 3:17 PM tomorrow ---------- */
    console.log('book');
    await page.click('.btn.primary.lg:has-text("Book a truck")');
    await page.waitForSelector('#bk-time');
    await page.click('button[type=submit]:has-text("Book this truck")');
    await page.waitForSelector('.banner.bad');
    t = await text(page);
    ok(/Pick a date and a time/.test(t), 'inline error: date and time');
    ok(/Add the carrier or the driver.s name/.test(t), 'inline error: carrier or driver');
    ok(/Add at least one load with pallets/.test(t), 'inline error: loads');
    ok(await page.locator('.field.err').count() >= 3, 'fields marked red');
    await shot(page, 'book-errors-light');

    await page.click('button.chip:has-text("Tomorrow")');
    await settle(page);
    ok(await page.inputValue('#bk-date') === ymd(Date.now() + 864e5), 'Tomorrow chip fills in the date');
    await page.fill('#bk-date', BOOK_DAY);
    await page.fill('#bk-time', '15:17');
    await page.waitForSelector('text=Your time, 3:17 PM');
    ok(/Busy times (tomorrow|on )/.test(await text(page)), 'busy-day chart shows for the picked day');
    ok(/forklift drivers on the crew/.test(await text(page)), 'crew count shown');
    ok(!/Sierra Freight|Bay Area|Truckee/.test(await page.locator('[aria-live=polite]').innerText()), 'busy chart names no companies');
    await page.fill('#bk-time', '23:30');
    await page.waitForSelector('text=After-hours fee may apply');
    ok(true, 'after-hours warning for 11:30 PM');
    await page.fill('#bk-time', '15:17');
    await page.waitForSelector('text=Your time, 3:17 PM');
    ok(!(await page.isVisible('text=After-hours fee may apply')), 'no after-hours warning at 3:17 PM');

    await page.fill('#bk-carrier', 'Test Carrier Inc');
    await page.fill('#bk-driver', 'Pat Driver');
    await page.fill('#bk-truck', '501');
    await page.fill('#bk-cell', '775-555-0199');
    await page.click('button.chip:has-text("Spanish")');
    await page.click('button.choice:has-text("Samsara")');
    await page.fill('#bk-trackurl', 'https://cloud.samsara.com/share/abc');

    await page.click('button:has-text("Add load")');
    await page.waitForSelector('#ld-ref');
    await page.click('.sheet button[type=submit]');
    await page.waitForSelector('.sheet .errmsg');
    ok(/Add the PO, BOL or reference number/.test(await page.locator('.sheet').innerText()), 'load sheet validates ref and pallets');
    await page.fill('#ld-ref', 'PO-90001');
    await page.fill('#ld-pallets', '10');
    await page.fill('#ld-weight', '12000');
    await page.fill('#ld-dest', 'Reno DC');
    await shot(page, 'load-sheet-light');
    await page.click('.sheet button[type=submit]');
    await page.waitForSelector('.sheet', { state: 'detached' });
    await page.click('button:has-text("Add load")');
    await page.fill('#ld-ref', 'PO-90002');
    await page.fill('#ld-pallets', '8');
    await page.fill('#ld-weight', '9000');
    await page.locator('.sheet .seg').nth(1).locator('button:has-text("Yes")').click();
    await page.click('.sheet button[type=submit]');
    await page.waitForSelector('.sheet', { state: 'detached' });
    ok(/2 loads · 18 pallets · 21,000 lbs/.test(await text(page)), 'totals add up (2 loads, 18 pallets)');
    await page.check('#bk-order');
    await page.locator('button:has-text("Down")').first().click();
    await settle(page);
    await page.fill('#bk-notes', 'Call before arrival');
    await shot(page, 'book-filled-light');
    await page.click('button[type=submit]:has-text("Book this truck")');
    await page.waitForSelector('text=You’re booked');
    const shownCode = (await page.locator('.mono.bold').first().textContent()).trim();
    await settle(page);

    let db = await h.dump(page);
    const newId = Object.keys(db.trucks).find(id => (db.trucks[id].loads || []).some(l => l.ref === 'PO-90002'));
    const nt = db.trucks[newId];
    ok(!!nt, 'truck document saved');
    ok(nt.status === 'booked', 'status booked');
    ok(/^\d{4}$/.test(nt.code) && nt.code === shownCode, '4-digit check-in code ' + nt.code + ' matches the screen');
    ok(nt.customerId === 'c_sierra' && nt.dock === 'reno' && nt.kind === 'drop' && nt.createdBy === 'client', 'customer, dock, kind, createdBy');
    const appt = new Date(nt.apptAt);
    ok(appt.getHours() === 15 && appt.getMinutes() === 17 && appt.toDateString() === BOOK_DATE.toDateString(), 'apptAt is ' + BOOK_DAY + ' 3:17 PM (' + nt.apptAt + ')');
    ok(nt.loads.length === 2 && nt.loads[0].ref === 'PO-90002' && nt.loads[1].ref === 'PO-90001', 'two loads in the chosen order');
    ok(nt.loads[0].pallets === 8 && nt.loads[0].weight === 9000 && nt.loads[0].hazmat === true && nt.loads[1].pallets === 10, 'load pallets, weight and hazmat saved as numbers/flags');
    ok(nt.loadOrder === true, 'loadOrder saved');
    ok(nt.carrier === 'Test Carrier Inc' && nt.driverName === 'Pat Driver' && nt.truckNo === '501' && nt.driverLang === 'es', 'truck and driver details saved');
    ok(nt.tracking === 'samsara' && nt.trackUrl === 'https://cloud.samsara.com/share/abc', 'Samsara tracking and share link saved');
    ok(nt.history.length === 1 && /^Booked by /.test(nt.history[0].text), 'history: ' + nt.history[0].text);
    ok(Object.values(db.outbox).some(m => m.event === 'booked' && m.truckId === newId && m.customerId === 'c_sierra'), 'outbox has a booked row');
    ok(/Booked for/.test(await text(page)) && (await page.inputValue('#dl-' + newId)).endsWith('#driver' + nt.code), 'booked screen shows when, where and the driver link');
    await shot(page, 'booked-light');
    await page.click('button:has-text("Copy link")');
    await page.waitForSelector('.toast');
    ok(/Link (copied|selected)/.test(await page.locator('.toast').innerText()), 'copy link gives feedback');
    await page.click('button:has-text("Text the link to Pat Driver")');
    await settle(page);
    db = await h.dump(page);
    ok(Object.values(db.outbox).some(m => m.event === 'driver' && m.truckId === newId && /#driver/.test(m.text)), 'driver link text queued through notifyDriver');
    const trail = db.trucks[newId].history.map(x => x.text).join(' | ');
    ok(/text queued/.test(trail) && !/texted/.test(trail), 'load trail says the text is queued, never "texted": ' + trail);

    /* ---------- 4. edit the booking ---------- */
    console.log('edit');
    await page.click('button:has-text("See this truck")');
    await page.waitForSelector('text=Edit booking');
    ok(/Booked/.test(await text(page)) && /Tracking with Samsara/.test(await text(page)), 'truck page shows booked status and tracking');
    await shot(page, 'truck-booked-light');
    await page.click('button:has-text("Edit booking")');
    await page.waitForSelector('#bk-time');
    ok(await page.inputValue('#bk-time') === '15:17', 'edit form is prefilled');
    await page.fill('#bk-time', '16:45');
    await page.locator('.card.flat:has-text("PO-90001") button:has-text("Edit")').click();
    await page.waitForSelector('#ld-ref');
    ok(await page.inputValue('#ld-pallets') === '10', 'load sheet prefilled for editing');
    await page.fill('#ld-pallets', '12');
    await page.click('.sheet button[type=submit]');
    await page.waitForSelector('.sheet', { state: 'detached' });
    await page.click('button[type=submit]:has-text("Save changes")');
    await page.waitForSelector('text=Need to change something?');
    await settle(page);
    db = await h.dump(page);
    const et = db.trucks[newId];
    ok(new Date(et.apptAt).getHours() === 16 && new Date(et.apptAt).getMinutes() === 45, 'edited time saved (4:45 PM)');
    ok(et.loads.find(l => l.ref === 'PO-90001').pallets === 12, 'edited load pallets saved');
    ok(et.code === nt.code && et.status === 'booked', 'code and status unchanged');
    ok(/^Booking changed by .*time now/.test(et.history[et.history.length - 1].text), 'history: ' + et.history[et.history.length - 1].text);
    ok(Object.values(db.outbox).filter(m => m.event === 'booked' && m.truckId === newId).length === 2, 'change alert queued');
    ok(Object.values(db.outbox).some(m => m.event === 'driver' && m.truckId === newId && /is now .*4:45 PM/.test(m.text)), 'new time texted to the driver (queued through notifyDriver)');

    /* ---------- 5. update ETA from the truck page ---------- */
    console.log('eta');
    await page.click('button:has-text("Update ETA")');
    await page.waitForSelector('#eta-time');
    await page.click('button.chip:has-text("In 1 hour")');
    await page.fill('#eta-note', 'Leaving the yard now');
    await shot(page, 'eta-sheet-light');
    await page.dblclick('.sheet button[type=submit]');
    await page.waitForSelector('.sheet', { state: 'detached' });
    await settle(page);
    db = await h.dump(page);
    ok(db.trucks[newId].eta && db.trucks[newId].eta.source === 'client' && db.trucks[newId].eta.note === 'Leaving the yard now', 'ETA saved with source client');
    ok(Object.values(db.outbox).some(m => m.event === 'eta' && m.truckId === newId), 'ETA alert queued');
    ok(db.trucks[newId].history.filter(x => /^ETA updated/.test(x.text)).length === 1 && Object.values(db.outbox).filter(m => m.event === 'eta' && m.truckId === newId).length === 1, 'double tap on Save ETA saves once');
    ok(/set by you/.test(await text(page)), 'truck page shows the ETA source');

    /* ---------- 6. cancel with the two-tap confirm ---------- */
    console.log('cancel');
    await page.click('button:has-text("Cancel truck")');
    await page.waitForSelector('text=Are you sure?');
    db = await h.dump(page);
    ok(db.trucks[newId].status === 'booked', 'first tap does not cancel');
    await page.click('button:has-text("Yes, cancel truck")');
    await page.waitForSelector('text=This booking was cancelled.');
    await settle(page);
    db = await h.dump(page);
    ok(db.trucks[newId].status === 'cancelled', 'second tap cancels');
    ok(/^Cancelled by /.test(db.trucks[newId].history.slice(-1)[0].text), 'cancel line in the load trail');
    ok(Object.values(db.outbox).some(m => m.event === 'driver' && m.truckId === newId && /cancelled/.test(m.text)), 'driver told about the cancel (queued)');
    ok(!(await page.isVisible('text=Edit booking')), 'no edit button on a cancelled truck');

    /* ---------- 7. loads tab: per load, search ---------- */
    console.log('loads');
    await page.click('.tabbar button:has-text("Loads")');
    await page.waitForSelector('#hist-q');
    const refs = await page.locator('.list .li b').allTextContents();
    ok(refs.length === 7, 'one row per load (7 rows): ' + refs.join(', '));
    ok(refs.includes('PO-55120') && refs.includes('PO-55121'), 'two loads of the same truck are separate rows');
    ok(await page.locator('.li:has-text("PU-55077") .pill.bad').count() === 1, 'damage flag on PU-55077');
    await shot(page, 'history-light');
    await page.fill('#hist-q', '55121');
    await settle(page);
    let rows = await page.locator('.list .li b').allTextContents();
    ok(rows.length === 1 && rows[0] === 'PO-55121', 'search by ref finds one load');
    ok(await page.evaluate(() => document.activeElement && document.activeElement.id) === 'hist-q', 'search box keeps focus while typing');
    await page.fill('#hist-q', 'zzz');
    await settle(page);
    ok(/No loads match/.test(await text(page)), 'empty search result explained');
    await page.fill('#hist-q', '');
    await settle(page);
    await page.click('.li:has-text("PO-55098")');
    await page.waitForSelector('text=Unloading now');
    ok(await page.locator('.tabbar button.on:has-text("Loads")').count() === 1, 'truck opened from Loads keeps the Loads tab lit');
    await page.click('.tb-back');
    await page.waitForSelector('#hist-q');
    ok(true, 'back from that truck returns to the Loads list');
    await page.click('.li:has-text("PO-55098")');
    await page.waitForSelector('text=Unloading now');
    t = await text(page);
    ok(/Door 3/.test(t) && /At the door so far/.test(t) && /On track: done by/.test(t), 'working truck page: door, live clock, promise');
    await shot(page, 'truck-working-light');
    await page.evaluate(() => App.go('client.truck', { id: 't_ex7' }));
    await page.waitForSelector('text=Securement report');
    t = await text(page);
    ok(/within our 2-hour promise/.test(t), 'done truck: time vs promise');
    ok(/5 of 5 · Rock solid/.test(t) && /Seal 448120/.test(t) && /B-104/.test(t), 'securement report: confidence, seal, tags');
    ok(/24 of 24 pallets/.test(t), 'counts per load');
    await shot(page, 'truck-done-light');

    /* ---------- 8. damage history ---------- */
    await page.click('.tabbar button:has-text("Loads")');
    await page.click('button:has-text("Damage history")');
    await page.waitForSelector('text=pallets hurt');
    ok(/PU-55077/.test(await text(page)) && /not an insurance claim/.test(await text(page)), 'monthly damage history lists the report');
    await shot(page, 'damagelog-light');

    /* ---------- 9. gear ---------- */
    console.log('gear');
    await page.click('.tabbar button:has-text("Gear")');
    await page.waitForSelector('text=Our gear with you now');
    t = await text(page);
    ok(/12\s*Plywood sheets/.test(t) && /2\s*Load bars/.test(t) && /B-117/.test(t), 'gear out: 12 plywood, 2 bars, tags');
    await page.click('button:has-text("I’m interested")');
    await page.waitForSelector('text=We’ll call you');
    await settle(page);
    db = await h.dump(page);
    ok(!!db.customers.c_sierra.securementInterest, 'securement interest recorded on the customer');
    await shot(page, 'gear-light');

    /* ---------- 10. alerts ---------- */
    console.log('alerts');
    await page.click('.tabbar button:has-text("Alerts")');
    await page.waitForSelector('#al-0-booked-text');
    ok(!(await page.isChecked('#al-0-booked-text')), 'Dana: booking text starts off');
    await page.check('#al-0-booked-text');
    await page.waitForSelector('text=Not saved yet');
    await page.click('button.choice:has-text("Auto-approve small fixes")');
    await page.fill('#al-auto', '40');
    await page.click('button:has-text("Add contact")');
    await page.fill('#al-2-name', 'Robin Test');
    await page.fill('#al-2-phone', '775-555-0177');
    await page.fill('#al-2-email', 'robin@example.com');
    await shot(page, 'alerts-light');
    ok(/Booking cancelled/.test(await page.locator('.li b').allTextContents().then(a => a.join('|'))), 'recent alerts title a cancel as "Booking cancelled", not "Booking confirmed"');
    await page.click('button:has-text("Save changes")');
    await page.waitForSelector('text=All changes saved');
    await settle(page);
    db = await h.dump(page);
    const cs = db.customers.c_sierra;
    ok(cs.contacts[0].alerts.booked.text === true, 'checkbox saved on the customer doc');
    ok(cs.contacts[0].alerts.damage.email === true && cs.contacts[0].name === 'Dana Ortiz', 'other alerts and contact fields kept');
    ok(cs.autoApproveUnder === 40, 'auto-approve under $40 saved');
    ok(cs.contacts.length === 3 && cs.contacts[2].name === 'Robin Test' && cs.contacts[2].alerts.damage.text === true, 'new contact saved with default alerts');
    await page.click('button.choice:has-text("Always ask me first")');
    await page.locator('section:has-text("Robin Test") button:has-text("Remove")').first().click();
    await page.click('button:has-text("Yes, remove")');
    await page.click('button:has-text("Save changes")');
    await page.waitForSelector('text=All changes saved');
    await settle(page);
    db = await h.dump(page);
    ok(db.customers.c_sierra.contacts.length === 2 && db.customers.c_sierra.autoApproveUnder === null, 'remove contact + back to never auto-approve');

    /* ---------- 11. damage approval as Bay Area Logistics ---------- */
    console.log('damage');
    // a second waiting report so the decline path is tested too (setup only)
    await page.evaluate(() => App.save('damage', 'd_t2', { truckId: 't_ex5', customerId: 'c_bay', loadId: 'l1', ref: 'BOL-77790', at: App.iso(App.now() - 3600e3), by: 'Jordan',
      pallets: 1, kinds: ['Leaning'], what: 'One pallet leaning.', photos: ['p:ph_ex1', 'p:ph_ex2'], fixLines: [{ label: 'Restack', qty: 1, rate: 25 }], status: 'waiting' }));
    await page.click('.tabbar button:has-text("Home")');
    await page.click('button:has-text("Switch company")');
    await page.waitForSelector('text=Which company are you?');
    await page.click('button.choice:has-text("Bay Area Logistics")');
    await page.waitForSelector('text=Needs you');
    t = await text(page);
    ok(/Damage on BOL-77790/.test(t) && /Approve \$90\.00/.test(t), 'home shows waiting damage with its price');
    ok(/Rewrap pallet/.test(t) && /Restack boxes/.test(t) && /2 photos/.test(t), 'damage card shows the fix lines and photo count');
    ok((await page.locator('.tabbar .dot').innerText()).trim() === '2', 'Home tab badge counts waiting damage');
    ok(/Place in line/.test(t) && /#2/.test(t) && /Waited so far/.test(t), 'waiting truck shows place in line and waited clock');
    await shot(page, 'home-bay-light');

    await page.click('button.linkbtn[data-p-id="d_t2"]:has-text("See big photos and details")');
    await page.waitForSelector('text=Should we fix it?');
    await page.fill('#dmg-note-d_t2', 'Leave it, we will restack');
    await shot(page, 'damage-light');
    await page.click('button:has-text("Decline")');
    await page.waitForSelector('text=Yes, decline');
    ok(await page.inputValue('#dmg-note-d_t2') === 'Leave it, we will restack', 'note kept when asking to decline');
    await page.click('button:has-text("Yes, decline")');
    await page.waitForSelector('text=Declined');
    await settle(page);
    db = await h.dump(page);
    ok(db.damage.d_t2.status === 'declined' && db.damage.d_t2.customerNote === 'Leave it, we will restack' && db.damage.d_t2.decidedBy === 'Priya Shah', 'decline saved with note');

    await page.click('.tabbar button:has-text("Home")');
    await page.click('button:has-text("Approve $90.00")');
    await page.waitForSelector('.toast');
    await settle(page);
    db = await h.dump(page);
    const d1 = db.damage.d_ex1;
    ok(d1.status === 'approved' && d1.decidedBy === 'Priya Shah' && !!d1.decidedAt, 'd_ex1 approved, decidedBy and decidedAt set');
    const hist = db.trucks.t_ex5.history.map(x => x.text);
    ok(hist.some(x => /Damage fix approved by Priya Shah: \$90\.00/.test(x)) && hist.some(x => /declined/.test(x)), 'truck history has the approve and decline lines');
    ok(Object.values(db.outbox).some(m => m.event === 'crew' && /approved the damage fix/.test(m.text)), 'crew told about the approval');
    ok(!(await page.isVisible('text=Needs you')), 'Needs you section clears');
    ok(await page.locator('.tabbar .dot').count() === 0, 'badge clears');
    await page.evaluate(() => App.go('client.truck', { id: 't_ex5' }));
    await page.waitForSelector('text=Damage on BOL-77790');
    ok(/Approved/.test(await text(page)) && /Pallets staged/.test(await page.innerHTML('#app')), 'truck page shows the decided damage and done photos');

    /* ---------- 11b. review fixes: two people, one truck; alerts follow live data; old bookings ---------- */
    console.log('two people editing');
    const office = await h.open('office');
    await page.evaluate(() => App.actions['client.signout']());
    await page.click('button.choice:has-text("Sierra Freight Lines")');
    await page.waitForSelector('text=Live trucks');
    await page.evaluate(() => App.go('client.truck', { id: 't_ex1' }));
    await page.click('button:has-text("Edit booking")');
    await page.waitForSelector('#bk-time');
    // the office changes the note and the driver cell while the client has the form open
    await office.evaluate(() => App.patch('trucks', 't_ex1', { notes: 'Office: lumper receipt needed', driverCell: '775-555-0999' }));
    await page.waitForSelector('text=Someone else just changed this booking');
    ok(true, 'client sees that someone else changed the booking while editing');
    await page.fill('#bk-time', '11:11');
    await page.click('button[type=submit]:has-text("Save changes")');
    await page.waitForSelector('text=Need to change something?');
    await settle(page, 300);
    db = await h.dump(page);
    ok(db.trucks.t_ex1.notes === 'Office: lumper receipt needed' && db.trucks.t_ex1.driverCell === '775-555-0999', 'client save keeps the office\'s note and driver cell');
    ok(new Date(db.trucks.t_ex1.apptAt).getHours() === 11 && new Date(db.trucks.t_ex1.apptAt).getMinutes() === 11, 'client\'s own change (time) saved');
    const lastLine = db.trucks.t_ex1.history.slice(-1)[0].text;
    ok(/time now/.test(lastLine) && !/notes updated|driver details/.test(lastLine), 'load trail lists only what the client changed: ' + lastLine);

    console.log('alerts follow live data');
    await page.click('.tabbar button:has-text("Alerts")');
    await page.waitForSelector('#al-0-name');
    await office.evaluate(() => { const c = App.get('customers', 'c_sierra'); App.patch('customers', 'c_sierra', { contacts: c.contacts.concat([{ name: 'Office Added', role: 'Night lead', phone: '775-555-0300', email: '', alerts: {} }]) }); });
    await page.waitForSelector('#al-2-name');
    ok(await page.inputValue('#al-2-name') === 'Office Added' && /All changes saved/.test(await text(page)), 'untouched alerts screen shows the office\'s new contact, not "unsaved"');
    await page.check('#al-0-eta-text');
    await page.waitForSelector('text=Not saved yet');
    await office.evaluate(() => App.patch('customers', 'c_sierra', { autoApproveUnder: 75 }));
    await page.waitForSelector('text=Someone at the dock just changed these settings');
    await page.click('button:has-text("Save changes")');
    await page.waitForSelector('text=All changes saved');
    await settle(page, 300);
    db = await h.dump(page);
    ok(db.customers.c_sierra.autoApproveUnder === 75 && db.customers.c_sierra.contacts[0].alerts.eta.text === true && db.customers.c_sierra.contacts.length === 3,
      'save sends only what the client changed (office\'s auto-approve $75 kept, new contact kept)');
    await tapTargets(page, 'alerts');

    console.log('old bookings');
    await page.evaluate(() => App.save('trucks', 't_old', { customerId: 'c_sierra', code: '1111', dock: 'reno', kind: 'drop', apptAt: App.iso(App.now() - 3 * 864e5), status: 'booked',
      loads: [{ id: 'l1', ref: 'OLD-1', pallets: 3 }], history: [], createdBy: 'client' }));
    await page.click('.tabbar button:has-text("Home")');
    await page.waitForSelector('text=Never checked in');
    ok(await page.locator('.card.link:has-text("OLD-1")').count() === 0 && await page.locator('.li:has-text("OLD-1")').count() === 1, 'a booking from 3 days ago is under "Never checked in", not "Live trucks"');
    await tapTargets(page, 'home');

    console.log('hostile text and double tap');
    await page.click('.btn.primary.lg:has-text("Book a truck")');
    await page.waitForSelector('#bk-time');
    await tapTargets(page, 'book');
    await page.fill('#bk-date', BOOK_DAY);
    await page.fill('#bk-time', '10:05');
    const EVIL = '<u class="evil">x</u>"\'&<img src=x onerror="window.__evil=1">';
    await page.fill('#bk-driver', 'Drv ' + EVIL);
    await page.click('button:has-text("Add load")');
    await page.fill('#ld-ref', 'XSS ' + EVIL);
    await page.fill('#ld-pallets', '2.5');
    await page.click('.sheet button[type=submit]');
    await page.waitForSelector('text=Whole pallets only');
    ok(true, 'load sheet rejects 2.5 pallets');
    await page.fill('#ld-pallets', '3');
    await tapTargets(page, 'load sheet');
    await page.dblclick('.sheet button[type=submit]');
    await page.waitForSelector('.sheet', { state: 'detached' });
    await settle(page);
    ok(/1 load · 3 pallets/.test(await text(page)), 'double tap on "Add this load" adds it once');
    await tapTargets(page, 'book with a load');
    const before = Object.keys((await h.dump(page)).trucks).length;
    await page.dblclick('button[type=submit]:has-text("Book this truck")');
    await page.waitForSelector('text=You’re booked');
    await settle(page, 400);
    db = await h.dump(page);
    ok(Object.keys(db.trucks).length === before + 1, 'double tap on "Book this truck" books one truck');
    const evilId = Object.keys(db.trucks).find(id => /^Drv </.test(db.trucks[id].driverName || ''));
    ok(db.trucks[evilId].driverName === 'Drv ' + EVIL, 'hostile driver name saved as typed');
    await page.click('button:has-text("See this truck")');
    await page.waitForSelector('text=Truck and driver');
    t = await text(page);
    ok(t.includes('Drv <u class="evil">x</u>') && t.includes('XSS <u class="evil">'), 'hostile names show as plain text on the truck page');
    ok(await page.evaluate(() => document.querySelectorAll('.evil').length === 0 && !window.__evil), 'no HTML from the data ran or rendered');
    await page.click('.tabbar button:has-text("Book")');
    await page.waitForSelector('#bk-time');
    ok(await page.locator('.banner.bad').count() === 0 && await page.locator('.field.err').count() === 0, 'fresh Book form has no leftover errors after a double tap');

    console.log('long data');
    await page.evaluate(() => App.patch('trucks', 't_ex7', { secure: { seal: 'SEAL-' + 'X'.repeat(60), tags: ['TAG-' + 'Y'.repeat(50)] } }));
    await page.evaluate(() => App.go('client.truck', { id: 't_ex7' }));
    await page.waitForSelector('text=Securement report');
    await shot(page, 'truck-longdata-light');
    await tapTargets(page, 'truck page');

    console.log('empty states');
    await page.evaluate(() => App.save('customers', 'c_fresh', { name: 'Fresh Co', code: 'FRESH', dock: 'pa', contacts: [], createdAt: App.iso() }));
    await page.evaluate(() => App.actions['client.signout']());
    await page.waitForSelector('#signin-code');
    await page.fill('#signin-code', 'fresh');
    await page.click('button[type=submit]:has-text("Sign in")');
    await page.waitForSelector('text=No trucks on the way');
    t = await text(page);
    ok(/Nobody gets our texts yet/.test(t) && /after your first truck/.test(t), 'new company (code typed in lower case): empty home explains itself and asks for an alert contact');
    await shot(page, 'empty-home-light');
    await page.click('.tabbar button:has-text("Loads")');
    await page.waitForSelector('text=No loads yet');
    await page.click('button:has-text("Damage history")');
    await page.waitForSelector('text=No damage reports');
    await page.click('.tabbar button:has-text("Gear")');
    await page.waitForSelector('text=None of our gear is out with you');
    await page.click('.tabbar button:has-text("Home")');
    await page.click('button:has-text("Set up alerts")');
    await page.waitForSelector('text=No contacts yet');
    ok(true, 'empty Loads, Damage history, Gear and Alerts screens each explain themselves');
    await page.click('button:has-text("Add contact")');
    await page.fill('#al-0-name', 'Fresh Dispatcher');
    await page.fill('#al-0-phone', '717-555-0100');
    await page.click('button:has-text("Save changes")');
    await page.waitForSelector('text=All changes saved');
    await page.click('.tabbar button:has-text("Home")');
    await page.waitForSelector('text=No trucks on the way');
    ok(!/Nobody gets our texts yet/.test(await text(page)), 'after adding a contact the "nobody gets texts" warning goes away');

    /* ---------- 12. dark mode + desktop screenshots ---------- */
    console.log('dark mode');
    const dark = await h.newContext({ colorScheme: 'dark' });
    const dp = await h.open('client', { context: dark, customerId: 'c_bay' });
    await dp.waitForSelector('text=Needs you');
    await shot(dp, 'home-bay-dark');
    await tapTargets(dp, 'home with damage waiting');
    await dp.click('button:has-text("Decline")');
    await dp.waitForSelector('text=Yes, decline');
    await tapTargets(dp, 'home, decline open');
    await dp.click('button:has-text("Go back")');
    await dp.evaluate(() => App.go('client.truck', { id: 't_ex2' }));
    await dp.waitForSelector('text=Waiting in our yard');
    await shot(dp, 'truck-waiting-dark');
    await dp.evaluate(() => App.go('client.damage', { id: 'd_ex1' }));
    await dp.waitForSelector('text=Should we fix it?');
    await shot(dp, 'damage-dark');
    await tapTargets(dp, 'damage page');
    await dp.evaluate(() => App.go('client.book', {}));
    await dp.waitForSelector('#bk-time');
    await dp.fill('#bk-time', '09:40');
    await dp.waitForSelector('text=Your time, 9:40 AM');
    await shot(dp, 'book-dark');
    await dp.evaluate(() => App.go('client.booked', { id: 't_ex8' }));
    await dp.waitForSelector('text=You’re booked');
    await shot(dp, 'booked-dark');
    await dp.evaluate(() => App.go('client.alerts', {}));
    await shot(dp, 'alerts-dark');
    await dp.evaluate(() => App.go('client.history', {}));
    await shot(dp, 'history-dark');
    await tapTargets(dp, 'loads');
    await dp.evaluate(() => App.go('client.gear', {}));
    await shot(dp, 'gear-dark');
    await tapTargets(dp, 'gear');
    await dp.evaluate(() => { App.state.customerId = 'c_sierra'; App.go('client.truck', { id: 't_ex7' }); });
    await dp.waitForSelector('text=Securement report');
    await shot(dp, 'truck-done-dark');
    await dp.evaluate(() => App.actions['client.signout']());
    await dp.waitForSelector('text=Which company are you?');
    await shot(dp, 'signin-dark');
    await tapTargets(dp, 'sign in');

    const wide = await h.open('client', { context: dark, customerId: 'c_sierra', viewport: { width: 1400, height: 900 } });
    await wide.waitForSelector('text=Live trucks');
    await shot(wide, 'home-desktop-dark');

    ok(h.errors.length === 0, 'no page errors' + (h.errors.length ? ':\n' + h.errors.join('\n') : ''));
  } finally {
    await h.close();
  }

  /* ---------- 13. a brand-new, empty database ---------- */
  console.log('empty database');
  const h2 = await H.start({ seed: false });
  try {
    const p2 = await h2.open('client', { customerId: null });
    await p2.waitForSelector('text=No companies yet');
    await shot(p2, 'emptydb-signin-light');
    await p2.fill('#signin-code', 'SIERRA');
    await p2.click('button[type=submit]:has-text("Sign in")');
    await p2.waitForSelector('text=We don’t know that code');
    ok(h2.errors.length === 0, 'empty database: sign-in screen works, no page errors' + (h2.errors.length ? ':\n' + h2.errors.join('\n') : ''));
  } finally {
    await h2.close();
  }
  console.log('\nPASS: ' + passed + ' checks');
})().catch(e => { console.error(e); process.exit(1); });
