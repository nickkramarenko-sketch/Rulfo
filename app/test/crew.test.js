/* Forklift crew test: drives the real crew UI with Playwright through the harness.
   Run: cd app/test && NODE_PATH=$(npm root -g) node crew.test.js   (exits non-zero on failure) */
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
const text = (page) => page.evaluate(() => document.getElementById('app').innerText);
/* screenshot + no sideways scroll */
async function shot(page, name, full) {
  await settle(page, 140);
  // clean picture: top of the page, no passing toast
  await page.evaluate(() => { window.scrollTo(0, 0); if (App.state.toast) { App.state.toast = null; App.renderNow(); } });
  await settle(page, 60);
  const vw = page.viewportSize().width;
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  ok(sw <= vw, name + ': no horizontal scroll (' + sw + ' <= ' + vw + ')');
  await page.screenshot({ path: SHOTS + 'crew-' + name + '.png', fullPage: full !== false });
}
/* take a photo into a photo box and wait until it is stored */
async function upload(page, sel, h) {
  await settle(page, 80);   // let any pending redraw finish so the input is the live one
  await page.setInputFiles(sel, h.UPLOAD_PNG);
  await page.waitForFunction(() => !App.anyBusy());
  await settle(page, 120);
}
/* every visible tappable thing in the main column is at least 48 px tall */
async function bigTargets(page, label) {
  const small = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('main .btn.lg, main .choice, main .stepper button, main .chip').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width && r.height < 48) out.push((el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30) + ' ' + Math.round(r.height));
    });
    return out;
  });
  ok(!small.length, label + ': touch targets are 48 px or taller' + (small.length ? ' (' + small.join(', ') + ')' : ''));
}
const outboxFor = (db, truckId, event) => Object.values(db.outbox || {}).filter((m) => m.truckId === truckId && m.event === event);

(async () => {
  const h = await H.start();
  try {
    /* ---------- 1. sign in ---------- */
    console.log('sign in');
    const page = await h.open('crew', { crewName: null });
    let t = await text(page);
    ok(/Who.s driving the forklift\?/.test(t), 'sign-in asks who is driving the forklift');
    ok(/Alex/.test(t) && /Jordan/.test(t) && /Sam/.test(t), 'crew names from settings shown as buttons');
    ok(await page.isDisabled('button[data-act="crew.signin"]'), 'start button disabled until name and dock are picked');
    await shot(page, 'signin-light');
    await page.fill('#cr-newname', 'Maria');
    await page.click('form[data-submit="crew.addName"] button[type=submit]');
    await settle(page, 200);
    let db = await h.dump(page);
    ok(db.settings.main.crew.indexOf('Maria') >= 0, 'add your name saves it to settings.crew');
    ok(await page.locator('button.choice.on:has-text("Maria")').count() === 1, 'new name is picked');
    await page.click('button.choice:has-text("Alex")');
    await page.click('button.choice:has-text("Sparks, NV")');
    await settle(page);
    ok(/Start: Alex at Sparks, NV/.test(await text(page)), 'start button names who and where');
    await page.click('button[data-act="crew.signin"]');
    await page.waitForSelector('text=Waiting in yard');
    ok(await page.evaluate(() => localStorage.getItem('dock24:crew')) === 'Alex', 'name saved to dock24:crew');
    ok(await page.evaluate(() => localStorage.getItem('dock24:crewDock')) === 'reno', 'dock saved to dock24:crewDock');
    ok((await page.textContent('.topbar .tb-title b')).trim() === 'Alex · Sparks' && /Sparks, NV/.test(await page.textContent('.topbar .tb-title span')), 'topbar shows "Alex · Sparks" with "Sparks, NV" under it');
    ok(await page.locator('.topbar [data-act="crew.switch"]').count() === 1, 'topbar has a Switch button');

    /* ---------- 2. queue ---------- */
    console.log('queue');
    const waitOrder = await page.$$eval('section[aria-label="Waiting in yard"] [data-truck]', (els) => els.map((e) => e.getAttribute('data-truck')));
    ok(JSON.stringify(waitOrder) === '["t_ex3","t_ex2"]', 'waiting in yard: t_ex3 then t_ex2 (longest wait first) ' + JSON.stringify(waitOrder));
    t = await text(page);
    ok(/#1 · next up/.test(t) && /#2 in line/.test(t), 'place numbers shown');
    ok(await page.locator('section[aria-label="Waiting in yard"] [data-truck="t_ex3"].bad').count() === 1, '48-minute wait is colored red (over goal)');
    ok(/1 paperwork page/.test(t) && /No paperwork scanned/.test(t), 'paperwork count shown');
    const doorsTxt = await page.textContent('section[aria-label="At the doors"]');
    ok(/Sierra Freight Lines/.test(doorsTxt) && /3/.test(doorsTxt) && /Alex/.test(doorsTxt), 'at the doors: door 3, crew name');
    const c1 = await page.locator('section[aria-label="Waiting in yard"] [data-cr-since]').first().textContent();
    await page.waitForTimeout(1300);
    const c2 = await page.locator('section[aria-label="Waiting in yard"] [data-cr-since]').first().textContent();
    ok(c1 !== c2 && /^\d+m \d\ds$/.test(c2), 'wait clock ticks every second (' + c1 + ' -> ' + c2 + ')');
    ok(await page.locator('.tabbar button').count() === 3 && /Queue/.test(await page.textContent('.tabbar')) && /Done today/.test(await page.textContent('.tabbar')), 'tab bar: Queue, Done today, Gear');
    await shot(page, 'home-light');
    await bigTargets(page, 'home');

    /* ---------- 3. start t_ex2 at a free door ---------- */
    console.log('start at door');
    await page.click('section[aria-label="Waiting in yard"] [data-truck="t_ex2"]');
    await page.waitForSelector('button:has-text("Start at door")');
    t = await text(page);
    ok(/BOL-77812/.test(t) && /Ravi Kumar/.test(t) && /Punjabi/.test(t) && /510-555-0190/.test(t), 'truck page: loads and driver name, language, cell');
    ok(await page.locator('button[data-view="crew.photo"]').count() === 1, 'paperwork photo shown');
    await page.click('button[data-view="crew.photo"]');
    await page.waitForSelector('.sheet img');
    ok(true, 'paperwork opens big in a sheet');
    await page.click('.sheet [data-act="core.closeSheet"]');
    await shot(page, 'truck-light');
    await page.click('button:has-text("Start at door")');
    await page.waitForSelector('#cr-door-3');
    ok(await page.isDisabled('#cr-door-3'), 'door 3 is disabled (t_ex4 is there)');
    ok(/Busy: Sierra Freight Lines/.test(await page.textContent('#cr-door-3')), 'busy door is labelled with the company there');
    ok(await page.isDisabled('button[data-act="crew.start"]'), 'start disabled until a door is picked');
    await page.click('#cr-door-4');
    await settle(page);
    ok(/Start unloading at door 4/.test(await page.textContent('button[data-act="crew.start"]')), 'start button names the door');
    await shot(page, 'doors-light', false);
    await page.click('button[data-act="crew.start"]');
    await page.waitForSelector('text=Count the pallets');
    db = await h.dump(page);
    let tr = db.trucks.t_ex2;
    ok(tr.status === 'working' && tr.door === '4' && tr.crewName === 'Alex' && !!tr.startedAt, 't_ex2 working at door 4 by Alex with startedAt');
    ok(tr.history[tr.history.length - 1].text === 'Unloading started at door 4', 'load trail: "Unloading started at door 4"');
    ok(outboxFor(db, 't_ex2', 'started').length === 1, 'outbox: started alert for the customer');
    const drv = outboxFor(db, 't_ex2', 'driver');
    ok(drv.length === 1 && /door 4/.test(drv[0].text) && drv[0].to[0].phone === '510-555-0190', 'outbox: driver text "Go to door 4" to the driver cell');

    /* ---------- 4. count ---------- */
    console.log('count');
    await page.fill('#cr-count-t_ex2-l1', '25');
    await settle(page);
    t = await text(page);
    ok(/25 of 26 pallets · 1 short/.test(t), 'mismatch shows "25 of 26 · 1 short"');
    ok(await page.locator('#cr-countnote').count() === 1, 'mismatch asks for a note');
    ok(/Still missing: .*a note on why the count is off/.test(t), 'finish says the note is missing');
    await page.click('button[data-act="crew.countAll"]');
    await settle(page);
    t = await text(page);
    ok(/26 of 26 pallets/.test(t) && await page.locator('#cr-countnote').count() === 0, '"All 26" sets the count; note goes away');
    ok(/Still missing: a done photo\./.test(t), 'finish says exactly what is missing: a done photo');
    ok(await page.isDisabled('button[data-act="crew.finish"]'), 'finish disabled');
    await bigTargets(page, 'work');

    /* ---------- 5. damage: needs 2 photos, waiting ---------- */
    console.log('damage');
    await page.click('button[data-act="crew.openDamage"]');
    await page.waitForSelector('text=What happened?');
    ok(await page.isDisabled('button[data-act="crew.saveDamage"]'), 'save damage disabled at first');
    await page.click('button.choice:has-text("Torn wrap")');
    await upload(page, '#ph-dmg-t-ex2-wide', h);
    t = await text(page);
    ok(await page.isDisabled('button[data-act="crew.saveDamage"]'), 'cannot save with 1 photo');
    ok(/Still missing: 1 more photo/.test(t), 'save says 1 more photo is needed');
    await upload(page, '#ph-dmg-t-ex2-close', h);
    ok(!(await page.isDisabled('button[data-act="crew.saveDamage"]')), 'can save with 2 photos and a kind');
    t = await text(page);
    ok(/Rewrap pallet/.test(t) && /Restack boxes/.test(t) && /New pallet/.test(t), 'suggested fix lines prefilled from rates');
    ok((await page.textContent('#cr-dmg-total')).trim() === '$75.00', 'fix price $75.00 (1 rewrap + half hour labor)');
    ok(/over their \$50\.00 auto-approve limit/.test(t), 'explains it is over the auto-approve limit');
    await shot(page, 'damage-light');
    await bigTargets(page, 'damage');
    await page.click('button[data-act="crew.saveDamage"]');
    await page.waitForSelector('text=Count the pallets');
    db = await h.dump(page);
    let dmg = Object.entries(db.damage).filter(([, d]) => d.truckId === 't_ex2');
    ok(dmg.length === 1, 'damage doc created');
    let [d1id, d1] = dmg[0];
    ok(d1.status === 'waiting' && d1.photos.length === 2 && d1.kinds[0] === 'Torn wrap' && d1.pallets === 1 && d1.by === 'Alex' && d1.ref === 'BOL-77812' && d1.loadId === 'l1', 'damage: waiting, 2 photos, torn wrap, 1 pallet, by Alex, ref + load');
    ok(d1.fixLines.reduce((s, l) => s + l.qty * l.rate, 0) === 75, 'damage fix lines total $75');
    ok(db.trucks.t_ex2.damageIds.indexOf(d1id) >= 0, 'truck.damageIds has the report');
    ok(/Damage reported/.test(db.trucks.t_ex2.history[db.trucks.t_ex2.history.length - 1].text), 'load trail: damage reported');
    ok(outboxFor(db, 't_ex2', 'damage').length === 1 && /Damage found on BOL-77812/.test(outboxFor(db, 't_ex2', 'damage')[0].text), 'outbox: damage alert');
    ok(/26 of 26 pallets/.test(await text(page)), 'count is kept after reporting damage');

    /* ---------- 6. small damage auto-approved (Bay Area: under $50) ---------- */
    await page.click('button[data-act="crew.openDamage"]');
    await page.waitForSelector('text=What happened?');
    await page.click('button.choice:has-text("Wet")');
    await page.click('#cr-dmg-fix-labor');
    await upload(page, '#ph-dmg-t-ex2-wide', h);
    await upload(page, '#ph-dmg-t-ex2-close', h);
    ok((await page.textContent('#cr-dmg-total')).trim() === '$15.00', 'labor off: fix price $15.00');
    ok(/Auto-approved by customer setting/.test(await text(page)), 'says "Auto-approved by customer setting"');
    await page.click('button[data-act="crew.saveDamage"]');
    await page.waitForSelector('text=Count the pallets');
    db = await h.dump(page);
    dmg = Object.values(db.damage).filter((d) => d.truckId === 't_ex2' && d.kinds[0] === 'Wet');
    ok(dmg.length === 1 && dmg[0].status === 'auto' && !!dmg[0].decidedAt, 'small damage saved as auto-approved');
    ok(db.trucks.t_ex2.damageIds.length === 2, 'truck has 2 damage reports');

    /* ---------- 7. done photo + finish ---------- */
    console.log('finish');
    await upload(page, '#ph-work-t-ex2-photos', h);
    t = await text(page);
    ok(!(await page.isDisabled('button[data-act="crew.finish"]')) && /All set/.test(t), 'finish enabled once counted + photo');
    await shot(page, 'work-light');
    await page.click('button[data-act="crew.finish"]');
    await page.waitForSelector('text=Waiting in yard');
    db = await h.dump(page);
    tr = db.trucks.t_ex2;
    ok(tr.status === 'done' && !!tr.doneAt && tr.counts.l1 === 26 && tr.photos.length === 1, 't_ex2 done: doneAt, counts {l1: 26}, 1 photo');
    ok(tr.history[tr.history.length - 1].text === 'Done: 26 of 26 pallets counted', 'load trail: "Done: 26 of 26 pallets counted"');
    const doneMsg = outboxFor(db, 't_ex2', 'done');
    ok(doneMsg.length === 1 && /Done at Sparks, NV: 26 pallets, 1 photo, 2 damage reports\. Total time/.test(doneMsg[0].text), 'outbox: done alert with pallets, photos, damage, total time');
    ok(outboxFor(db, 't_ex2', 'driver').some((m) => /All done\. You can pull out\./.test(m.text)), 'outbox: driver told to pull out');
    ok(await page.locator('section[aria-label="Waiting in yard"] [data-truck]').count() === 1, 'queue now has one truck waiting');

    /* ---------- 8. t_ex3 (both): finish blocked until secure ---------- */
    console.log('secure the load');
    await page.click('section[aria-label="Waiting in yard"] [data-truck="t_ex3"]');
    await page.click('button:has-text("Start at door")');
    await page.waitForSelector('#cr-door-5');
    ok(await page.isDisabled('#cr-door-3') && !(await page.isDisabled('#cr-door-4')), 'door 3 still busy, door 4 free again');
    await page.click('#cr-door-5');
    await page.click('button[data-act="crew.start"]');
    await page.waitForSelector('text=Count the pallets');
    await page.click('button[data-act="crew.countAll"][data-key="l1"]');
    await page.click('button[data-act="crew.countAll"][data-key="l2"]');
    await upload(page, '#ph-work-t-ex3-photos', h);
    t = await text(page);
    ok(await page.isDisabled('button[data-act="crew.finish"]'), 'finish blocked for a pickup until secured');
    ok(/Still missing: secure the load\./.test(t), 'finish says "Still missing: secure the load."');
    await page.click('button.btn[data-view="crew.secure"]');
    await page.waitForSelector('#cr-sec-seal');
    ok(await page.isDisabled('button[data-act="crew.saveSecure"]'), 'save securement disabled at first');
    for (let i = 0; i < 6; i++) await page.click('[data-gear="plywood"] button[data-step="1"]');
    for (let i = 0; i < 2; i++) await page.click('[data-gear="bars"] button[data-step="1"]');
    for (let i = 0; i < 4; i++) await page.click('[data-gear="straps"] button[data-step="1"]');
    await settle(page);
    await page.click('[data-gear="straps"] button[data-value="driver"]');
    await page.fill('#cr-sec-tag', 'b-201');
    await page.press('#cr-sec-tag', 'Enter');
    await settle(page);
    await page.fill('#cr-sec-tag', 'B-202');
    await page.click('form[data-submit="crew.tagAdd"] button[type=submit]');
    await settle(page);
    ok(await page.locator('button[data-act="crew.tagRemove"]').count() === 2, 'two tag chips added (B-201, B-202)');
    await page.fill('#cr-sec-seal', 'SL-55901');
    for (const k of ['nose', 'middle', 'tail', 'closeup', 'seal']) await upload(page, '#ph-sec-t-ex3-photos-' + k, h);
    await page.click('#cr-sec-conf-2');
    await settle(page);
    t = await text(page);
    ok(await page.locator('#cr-sec-note').count() === 1, 'confidence 2 asks "What would make it safer?"');
    ok(/Still missing: what would make it safer, the check box and your signature\./.test(t), 'save says exactly what is missing (note, check box, signature)');
    await page.fill('#cr-sec-note', 'Add one more load bar at the tail.');
    await page.check('#cr-sec-check');
    await page.fill('#cr-sec-sign', 'Alex M');
    await settle(page);
    ok(!(await page.isDisabled('button[data-act="crew.saveSecure"]')), 'save enabled when everything is in');
    await shot(page, 'secure-light');
    await bigTargets(page, 'secure');
    await page.click('button[data-act="crew.saveSecure"]');
    await page.waitForSelector('.pill.good:has-text("Secured")');
    db = await h.dump(page);
    const s = db.trucks.t_ex3.secure;
    ok(s && s.gear.plywood.qty === 6 && s.gear.plywood.owner === 'ours', 'secure: plywood 6 ours');
    ok(s.gear.bars.qty === 2 && s.gear.bars.owner === 'ours', 'secure: bars 2 ours');
    ok(s.gear.straps.qty === 4 && s.gear.straps.owner === 'driver', 'secure: straps 4 driver\'s');
    ok(JSON.stringify(s.tags) === '["B-201","B-202"]' && s.seal === 'SL-55901', 'secure: tags B-201, B-202 and seal');
    ok(['nose', 'middle', 'tail', 'closeup', 'seal'].every((k) => !!s.photos[k]), 'secure: 5 photos');
    ok(s.confidence === 2 && /load bar/.test(s.note) && s.checkedRows === true && s.signature === 'Alex M' && s.signedBy === 'Alex' && !!s.signedAt, 'secure: confidence 2 with note, checkbox, signature');
    ok(db.trucks.t_ex3.history.some((x) => x.text === 'Secured: confidence 2 of 5, seal SL-55901'), 'load trail: secured line');
    const gearOut = Object.values(db.gear).filter((g) => g.truckId === 't_ex3');
    ok(gearOut.length === 2, 'gear docs only for our gear (plywood + bars, not driver straps)');
    const ply = gearOut.find((g) => g.type === 'plywood'), bars = gearOut.find((g) => g.type === 'bars');
    ok(ply && ply.qty === 6 && ply.dir === 'out' && ply.customerId === 'c_truckee', 'gear: 6 plywood out to Truckee');
    ok(bars && bars.qty === 2 && bars.dir === 'out' && JSON.stringify(bars.tags) === '["B-201","B-202"]', 'gear: 2 load bars out with their tags');
    ok(outboxFor(db, 't_ex3', 'secured').length === 1 && /2 of 5/.test(outboxFor(db, 't_ex3', 'secured')[0].text), 'outbox: secured alert');
    ok(!(await page.isDisabled('button[data-act="crew.finish"]')), 'finish enabled after securing');
    await page.click('button[data-act="crew.finish"]');
    await page.waitForSelector('text=Waiting in yard');
    db = await h.dump(page);
    ok(db.trucks.t_ex3.status === 'done' && db.trucks.t_ex3.counts.l1 === 8 && db.trucks.t_ex3.counts.l2 === 10, 't_ex3 done with counts 8 + 10');
    ok(/No trucks waiting/.test(await text(page)), 'empty queue shows a friendly empty state');

    /* ---------- 9. done today ---------- */
    console.log('done today');
    await page.click('.tabbar button:has-text("Done today")');
    await page.waitForSelector('text=Finished today');
    t = await text(page);
    ok(/Truckee Supply Co/.test(t) && /Bay Area Logistics/.test(t), 'done today lists both finished trucks');
    ok(/Secured 2 of 5/.test(t) && /2 damage reports/.test(t) && /26 of 26 pallets/.test(t), 'done today shows confidence, damage and counts');
    await shot(page, 'done-light');

    /* ---------- 10. gear return ---------- */
    console.log('gear');
    await page.click('.tabbar button:has-text("Gear")');
    await page.waitForSelector('text=Whose gear came back?');
    ok(/6 plywood sheets · 2 load bars/.test(await text(page)), 'Truckee shows gear out');
    ok(await page.isDisabled('button[data-act="crew.saveGear"]'), 'log button disabled until company + type');
    await page.click('button.choice[data-act="crew.gearCust"]:has-text("Truckee Supply Co")');
    await page.click('button.choice[data-value="bars"]');
    await page.click('button[data-tag="B-201"]');
    await page.click('button[data-tag="B-202"]');
    await settle(page);
    ok(await page.inputValue('#cr-gear-qty') === '2', 'tapping 2 tags sets how many to 2');
    await shot(page, 'gear-light');
    await bigTargets(page, 'gear');
    await page.click('button[data-act="crew.saveGear"]');
    await settle(page, 200);
    db = await h.dump(page);
    const back = Object.values(db.gear).filter((g) => g.dir === 'back' && g.customerId === 'c_truckee');
    ok(back.length === 1 && back[0].type === 'bars' && back[0].qty === 2 && back[0].by === 'Alex' && JSON.stringify(back[0].tags) === '["B-201","B-202"]', 'gear doc dir back: 2 load bars with tags, by Alex');
    const left = await page.evaluate(() => App.gearOut('c_truckee'));
    ok(left.bars === 0 && left.tags.length === 0 && left.plywood === 6, 'App.gearOut drops: bars 0, no tags, plywood still 6');

    /* ---------- 11. dark mode screenshots of every screen ---------- */
    console.log('dark mode');
    const dctx = await h.newContext({ colorScheme: 'dark' });
    const dp = await h.open('crew', { context: dctx, crewName: 'Alex' });
    await dp.waitForSelector('text=Waiting in yard');
    await shot(dp, 'home-dark');
    await dp.click('section[aria-label="Waiting in yard"] [data-truck="t_ex3"]');
    await dp.waitForSelector('button:has-text("Start at door")');
    await shot(dp, 'truck-dark');
    await dp.click('button:has-text("Start at door")');
    await dp.click('#cr-door-6');
    await shot(dp, 'doors-dark', false);
    await dp.click('button[data-act="crew.start"]');
    await dp.waitForSelector('text=Count the pallets');
    await dp.fill('#cr-count-t_ex3-l1', '7');
    await shot(dp, 'work-dark');
    await dp.click('button.btn[data-view="crew.secure"]');
    await dp.waitForSelector('#cr-sec-seal');
    await dp.click('[data-gear="bars"] button[data-step="1"]');
    await dp.click('#cr-sec-conf-3');
    await upload(dp, '#ph-sec-t-ex3-photos-nose', h);
    await shot(dp, 'secure-dark');
    await dp.click('button:has-text("Back to the work screen")');
    await dp.click('button[data-act="crew.openDamage"]');
    await dp.click('button.choice:has-text("Crushed")');
    await upload(dp, '#ph-dmg-t-ex3-wide', h);
    await shot(dp, 'damage-dark');
    await dp.click('.topbar .tb-back');
    await dp.click('.topbar .tb-back');
    await dp.click('.tabbar button:has-text("Done today")');
    await shot(dp, 'done-dark');
    await dp.click('.tabbar button:has-text("Gear")');
    await shot(dp, 'gear-dark');
    await dp.evaluate(() => App.go('crew.truck', { id: 't_ex7' }));
    await dp.waitForSelector('text=Securement');
    await shot(dp, 'truck-secured-dark');
    await dp.evaluate(() => App.go('crew.gear'));
    await dp.click('.topbar [data-act="crew.switch"]');
    await dp.waitForSelector('text=Which dock are you at?');
    ok(await dp.locator('button.choice.on:has-text("Alex")').count() === 1, 'switch opens sign-in with the current name picked');
    await shot(dp, 'signin-dark');

    /* desktop width sanity check */
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.click('.tabbar button:has-text("Queue")');
    await shot(page, 'home-1400', false);

    ok(h.errors.length === 0, 'no page errors' + (h.errors.length ? ':\n' + h.errors.join('\n') : ''));
  } finally {
    await h.close();
  }
  await edgeCases();
  await emptyAndReadOnly();
  console.log('\n' + passed + ' checks passed');
})().catch((e) => { console.error(e); process.exit(1); });

/* ---------- 12. edge cases: unsafe data, walk-ins, drafts, back buttons, big docks ---------- */
const BAD = '<b class="xss">x</b><img src=x onerror="window.__xss=1">"\'&';
async function noXss(page, label) {
  const r = await page.evaluate(() => ({ el: !!document.querySelector('.xss'), ran: !!window.__xss, txt: document.getElementById('app').innerText }));
  ok(!r.el && !r.ran && r.txt.indexOf('<b class="xss">') >= 0, label + ': data with HTML shows as plain text');
}
async function edgeCases() {
  console.log('edge cases');
  const now = Date.now(), MIN = 60000;
  const seed = H.makeSeed(now);
  seed.customers.c_bay.name = 'Bay ' + BAD;
  Object.assign(seed.trucks.t_ex2, { driverName: 'Ravi ' + BAD, truckNo: '42' + BAD, notes: 'Note ' + BAD });
  Object.assign(seed.trucks.t_ex2.loads[0], { ref: 'REF' + BAD, notes: 'N' + BAD, destination: 'D' + BAD });
  seed.trucks.t_ex2.history.push({ at: new Date(now).toISOString(), by: 'By ' + BAD, text: 'Line ' + BAD });
  seed.trucks.t_ex3.trackUrl = 'javascript:window.__xss=1';
  seed.trucks.t_ex1.trackUrl = 'https://cloud.samsara.com/o/0000/fleet/viewer/example';
  seed.trucks.t_ex1.tracking = 'samsara';
  seed.settings.main.crew.push('Kim ' + BAD);
  seed.gear.g_ex2.tags.push('T' + BAD);
  /* a kiosk walk-in: no company account, driver not sure how many pallets, no cell */
  seed.trucks.t_walk = { walkIn: true, customerId: null, walkInCompany: 'Desert Haulers', code: '9001', dock: 'reno', kind: 'drop', status: 'arrived', carrier: '', tracking: 'none',
    loads: [{ id: 'l1', ref: '', pallets: 0, weight: 0, pieces: 0, destination: '', stackable: false, hazmat: false, notes: 'Driver was not sure how many pallets' }],
    paperwork: [], checkedInAt: new Date(now - 2 * MIN).toISOString(), checkedInBy: 'kiosk', driverName: 'Lee', driverCell: '', driverLang: 'en',
    history: [{ at: new Date(now - 2 * MIN).toISOString(), by: 'Kiosk', text: 'Walk-in checked in at the kiosk' }], createdBy: 'kiosk' };
  /* a Middletown pickup waiting, and door 12 busy there */
  seed.trucks.t_pa = { customerId: 'c_truckee', code: '9002', dock: 'pa', kind: 'pick', status: 'arrived', loads: [{ id: 'l1', ref: 'PA-1', pallets: 4, weight: 4000 }],
    paperwork: [], checkedInAt: new Date(now - 10 * MIN).toISOString(), driverName: 'Pat', driverCell: '717-555-0100', history: [] };
  seed.trucks.t_pa2 = { customerId: 'c_sierra', code: '9003', dock: 'pa', kind: 'drop', status: 'working', door: '12', crewName: 'Sam', loads: [{ id: 'l1', ref: 'PA-2', pallets: 4 }],
    paperwork: [], checkedInAt: new Date(now - 30 * MIN).toISOString(), startedAt: new Date(now - 15 * MIN).toISOString(), history: [] };
  const h = await H.start({ seed });
  try {
    const page = await h.open('crew', { crewName: 'Alex' });
    await page.waitForSelector('text=Waiting in yard');
    await noXss(page, 'queue');
    ok(await page.locator('[data-truck="t_walk"] .pill:has-text("Walk-in")').count() === 1, 'walk-in truck is labelled "Walk-in"');
    ok(await page.locator('[data-truck="t_walk"] .pill:has-text("NEW")').count() === 1, 'truck checked in 2 minutes ago has a NEW pill');

    /* new check-in while the crew is on another screen: toast */
    await page.click('.tabbar button:has-text("Done today")');
    await settle(page, 1200);   // the phone has looked at the yard once
    const office = await h.open('office');
    await office.evaluate(() => App.save('trucks', 't_new', { customerId: 'c_sierra', code: '9010', dock: 'reno', kind: 'drop', status: 'arrived',
      loads: [{ id: 'l1', ref: 'PO-1', pallets: 9 }], paperwork: [], checkedInAt: App.iso(), history: [] }));
    await page.waitForFunction(() => /New truck in the yard: Sierra Freight Lines, 9 pallets/.test(App.state.toast || ''), null, { timeout: 4000 });
    ok(true, 'crew phone pops "New truck in the yard" when a truck checks in');
    await office.close();
    await page.click('.tabbar button:has-text("Queue")');

    /* unsafe data on the truck page, its door sheet, the work and damage screens */
    await page.click('[data-truck="t_ex2"]');
    await page.waitForSelector('button:has-text("Start at door")');
    await noXss(page, 'truck page');
    await page.click('button:has-text("Start at door")');
    await page.waitForSelector('#cr-door-1');
    await noXss(page, 'door sheet');
    await page.click('#cr-door-1');
    await page.click('button[data-act="crew.start"]');
    await page.waitForSelector('text=Count the pallets');
    await noXss(page, 'work screen');

    /* truck details from the work screen: back returns to the work screen */
    await page.click('button:has-text("Truck details, paperwork and driver")');
    await page.waitForSelector('text=Driver and truck');
    await page.click('.topbar .tb-back');
    await page.waitForSelector('text=Count the pallets');
    ok(await page.evaluate(() => App.state.view) === 'crew.work', 'back from truck details goes to the work screen, not the queue');

    /* damage draft: back keeps it, cancel throws it away, double tap saves once */
    await page.click('button[data-act="crew.openDamage"]');
    await page.waitForSelector('text=What happened?');
    await noXss(page, 'damage screen');
    await page.click('button.choice:has-text("Leaning")');
    await upload(page, '#ph-dmg-t-ex2-wide', h);
    await page.click('.topbar .tb-back');
    await page.click('button[data-act="crew.openDamage"]');
    await page.waitForSelector('text=What happened?');
    ok(await page.locator('button.choice.on:has-text("Leaning")').count() === 1 && await page.locator('#ph-dmg-t-ex2-wide').count() === 0, 'back arrow keeps the unsaved damage report (kind + photo)');
    await page.click('button[data-act="crew.cancelDamage"]');
    await page.click('button[data-act="crew.openDamage"]');
    await page.waitForSelector('text=What happened?');
    ok(await page.locator('button.choice.on').count() === 1 && await page.locator('#ph-dmg-t-ex2-wide').count() === 1, '"Cancel" throws the report away (only the load is picked, no photo)');
    await page.click('button.choice:has-text("Crushed")');
    await upload(page, '#ph-dmg-t-ex2-wide', h);
    await upload(page, '#ph-dmg-t-ex2-close', h);
    await page.dblclick('button[data-act="crew.saveDamage"]');
    await page.waitForSelector('text=Count the pallets');
    await settle(page, 200);
    let db = await h.dump(page);
    ok(Object.values(db.damage).filter((d) => d.truckId === 't_ex2').length === 1, 'double tap on Save damage report saves one report');
    ok(/Damage saved/.test(await page.evaluate(() => App.state.toast || '')), 'double tap still shows "Damage saved" (no confusing "missing" toast)');

    /* drafts survive a page reload */
    await page.fill('#cr-count-t_ex2-l1', '24');
    await page.fill('#cr-countnote', 'Two pallets stayed on the trailer.');
    await upload(page, '#ph-work-t-ex2-photos', h);
    await settle(page, 1300);   // the 1 s ticker keeps the draft
    await page.reload();
    await page.waitForFunction(() => window.App && App.loaded && App.loaded.trucks);
    await page.waitForSelector('text=At the doors');
    await page.click('section[aria-label="At the doors"] [data-truck="t_ex2"]');
    await page.waitForSelector('text=Count the pallets');
    ok(await page.inputValue('#cr-count-t_ex2-l1') === '24' && /stayed on the trailer/.test(await page.inputValue('#cr-countnote')) &&
      await page.locator('section[aria-label="Done photos"] .photo-slot.filled').count() === 1, 'after a reload the count, the note and the done photo are still there');
    await page.click('button[data-act="crew.finish"]');
    await page.waitForSelector('text=Waiting in yard');
    db = await h.dump(page);
    ok(db.trucks.t_ex2.counts.l1 === 24 && db.trucks.t_ex2.countNote === 'Two pallets stayed on the trailer.', 'finished with the restored count and note');
    await settle(page, 1200);
    ok(!/t_ex2/.test(await page.evaluate(() => localStorage.getItem('dock24:crewDrafts') || '')), 'draft is cleared from the phone after Finish');

    /* walk-in: no pallet count on file, no driver cell, no customer account */
    await page.click('[data-truck="t_walk"]');
    await page.waitForSelector('button:has-text("Start at door")');
    let t = await text(page);
    ok(/No driver cell on file/.test(t) && !/We.ll text the driver/.test(t), 'walk-in without a cell: no promise to text the driver');
    await page.click('button:has-text("Start at door")');
    await page.click('#cr-door-2');
    await page.click('button[data-act="crew.start"]');
    await page.waitForSelector('text=Count the pallets');
    await page.fill('#cr-count-t_walk-l1', '20');
    await settle(page);
    t = await text(page);
    ok(await page.locator('#cr-countnote').count() === 0 && /20 pallets counted/.test(t), 'walk-in with no pallet count: counting 20 needs no "why different" note');
    ok(/Still missing: a done photo\./.test(t), 'walk-in: only the done photo is missing');
    await page.click('button[data-act="crew.openDamage"]');
    await page.waitForSelector('text=What happened?');
    ok(/Walk-in, no customer account/.test(await text(page)), 'damage on a walk-in explains there is no customer portal');
    await page.click('button[data-act="crew.cancelDamage"]');
    await upload(page, '#ph-work-t-walk-photos', h);
    await page.click('button[data-act="crew.finish"]');
    await page.waitForSelector('text=Waiting in yard');
    db = await h.dump(page);
    ok(db.trucks.t_walk.status === 'done' && db.trucks.t_walk.counts.l1 === 20 && /Done: 20 pallets counted/.test(db.trucks.t_walk.history.slice(-1)[0].text), 'walk-in finished: 20 pallets counted');

    /* a load rated "Not safe" cannot finish */
    await page.click('[data-truck="t_ex3"]');
    await page.click('button:has-text("Start at door")');
    await page.click('#cr-door-4');
    await page.click('button[data-act="crew.start"]');
    await page.waitForSelector('text=Count the pallets');
    await page.click('button[data-act="crew.countAll"][data-key="l1"]');
    await page.click('button[data-act="crew.countAll"][data-key="l2"]');
    await upload(page, '#ph-work-t-ex3-photos', h);
    await page.click('button.btn[data-view="crew.secure"]');
    await page.waitForSelector('#cr-sec-seal');
    await page.click('[data-gear="straps"] button[data-step="1"]');
    await page.fill('#cr-sec-seal', '7788');
    for (const k of ['nose', 'middle', 'tail', 'closeup', 'seal']) await upload(page, '#ph-sec-t-ex3-photos-' + k, h);
    await page.click('#cr-sec-conf-1');
    await page.fill('#cr-sec-note', 'Load is shifting at the tail.');
    await page.check('#cr-sec-check');
    await page.fill('#cr-sec-sign', 'Alex');
    await settle(page);
    await page.click('button[data-act="crew.saveSecure"]');
    await page.waitForSelector('text=Rated not safe');
    t = await text(page);
    ok(await page.isDisabled('button[data-act="crew.finish"]') && /rated 1 of 5, not safe/.test(t), 'secured at 1 of 5 ("Not safe"): Finish stays locked');
    await shot(page, 'work-unsafe');
    await page.click('button:has-text("Truck details, paperwork and driver")');
    await page.waitForSelector('text=Securement');
    t = await text(page);
    ok(/1 of 5 · Not safe/.test(t) && /7788/.test(t) && await page.locator('section:has(h3:text("Securement")) button[data-view="crew.photo"]').count() === 5, 'truck page shows the securement report: rating, seal, 5 photos');
    ok(await page.locator('a[href^="javascript"]').count() === 0, 'a javascript: tracking link is never made into a link');

    /* a done truck opened from Done today: back returns to Done today; finished pickup shows its securement */
    await page.evaluate(() => App.go('crew.done'));
    await page.click('[data-truck="t_walk"]');
    await page.waitForSelector('text=Load trail');
    await page.click('.topbar .tb-back');
    ok(await page.evaluate(() => App.state.view) === 'crew.done', 'back from a finished truck goes to Done today');
    await page.evaluate(() => App.go('crew.truck', { id: 't_ex7' }));
    await page.waitForSelector('text=Securement');
    ok(/5 of 5 · Rock solid/.test(await text(page)) && /B-104, B-117/.test(await text(page)), 'yesterday’s pickup shows securement 5 of 5 with our tags');
    await shot(page, 'truck-secured');

    /* booked truck with a Samsara link: source of the ETA and a live map button */
    await page.evaluate(() => App.go('crew.truck', { id: 't_ex1' }));
    await page.waitForSelector('text=Not checked in yet');
    t = await text(page);
    ok(/From the driver, updated \d+ min ago/.test(t), 'booked truck says where the ETA came from and when');
    ok(await page.locator('a[href^="https://cloud.samsara.com"][target="_blank"]').count() === 1, 'Samsara share link opens as "Open the live map"');

    /* photo taken while the screen redraws (camera open, live data arrives) is not lost */
    await page.evaluate(() => App.go('crew.work', { id: 't_ex4' }));
    await page.waitForSelector('label[for="ph-work-t-ex4-photos"]');
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('label[for="ph-work-t-ex4-photos"]')]);
    await page.evaluate(() => App.renderNow());   // the page redraws while the camera is open
    await chooser.setFiles(h.UPLOAD_PNG);
    await page.waitForFunction(() => (App.form('work:t_ex4').photos || []).length === 1, null, { timeout: 4000 });
    ok(true, 'photo still lands when the page redrew while the camera was open');

    /* Middletown: 50 doors in a tidy grid, busy door 12 crossed out */
    await page.click('.topbar .tb-back');
    await page.click('.topbar [data-act="crew.switch"]');
    await page.click('button.choice:has-text("Middletown, PA")');
    await page.click('button[data-act="crew.signin"]');
    await page.waitForSelector('[data-truck="t_pa"]');
    await page.click('[data-truck="t_pa"]');
    await page.click('button:has-text("Start loading at door")');
    await page.waitForSelector('#cr-door-50');
    ok(await page.isDisabled('#cr-door-12') && /Busy now: Door 12: Sierra Freight Lines/.test(await page.textContent('.sheet')), 'big dock: busy door 12 is locked and named');
    await page.click('#cr-door-49');
    await shot(page, 'doors-50', false);
    const smallDoors = await page.$$eval('.sheet button', (els) => els.filter((e) => e.getBoundingClientRect().height < 44).map((e) => e.textContent.trim()));
    ok(!smallDoors.length, 'big dock door picker: every button is 44 px or taller ' + JSON.stringify(smallDoors));
    await page.click('button[data-act="crew.start"]');
    await page.waitForSelector('text=Count pallets loaded');
    db = await h.dump(page);
    ok(db.trucks.t_pa.door === '49' && db.trucks.t_pa.history.slice(-1)[0].text === 'Loading started at door 49', 'pickup started: "Loading started at door 49"');

    /* gear screen and sign-in with unsafe names/tags */
    await page.evaluate(() => App.go('crew.gear'));
    await page.click('button.choice[data-act="crew.gearCust"]:has-text("Sierra")');
    await noXss(page, 'gear screen');
    await page.click('.topbar [data-act="crew.switch"]');
    await noXss(page, 'sign-in');
    ok(h.errors.length === 0, 'edge cases: no page errors' + (h.errors.length ? ':\n' + h.errors.join('\n') : ''));
  } finally {
    await h.close();
  }
}

/* ---------- 13. a brand-new empty database, and a view-only viewer ---------- */
async function emptyAndReadOnly() {
  console.log('empty database');
  const h = await H.start({ seed: false });
  try {
    const page = await h.open('crew', { crewName: null });
    ok(/No crew names yet/.test(await text(page)), 'empty: sign-in explains there are no crew names yet');
    await page.fill('#cr-newname', 'Maria');
    await page.press('#cr-newname', 'Enter');
    await page.click('button.choice:has-text("Middletown, PA")');
    await page.click('button[data-act="crew.signin"]');
    await page.waitForSelector('text=Waiting in yard');
    const t = await text(page);
    ok(/No trucks waiting/.test(t) && /All doors are free/.test(t) && /No more bookings today/.test(t), 'empty: queue shows three friendly empty states');
    ok(/Maria/.test(await page.textContent('.topbar')), 'empty: topbar shows the new name');
    await page.click('.tabbar button:has-text("Done today")');
    await page.waitForSelector('text=Finished today');
    ok(/Nothing finished yet today/.test(await text(page)), 'empty: Done today has an empty state');
    await page.click('.tabbar button:has-text("Gear")');
    await page.waitForSelector('text=Whose gear came back?');
    ok(/No companies yet/.test(await text(page)) && /No gear out right now/.test(await text(page)), 'empty: Gear explains there are no companies yet');
    await shot(page, 'gear-empty');
    ok(h.errors.length === 0, 'empty database: no page errors' + (h.errors.length ? ':\n' + h.errors.join('\n') : ''));
  } finally {
    await h.close();
  }
  console.log('view-only');
  const h2 = await H.start();
  try {
    const ctx = await h2.newContext({ canWrite: false });
    const page = await h2.open('crew', { context: ctx, crewName: 'Alex' });
    await page.waitForFunction(() => App.state.canWrite === false);
    await page.click('[data-truck="t_ex2"]');
    await page.click('button:has-text("Start at door")');
    await page.click('#cr-door-1');
    await page.click('button[data-act="crew.start"]');
    await settle(page);
    ok(/view-only/.test(await page.evaluate(() => App.state.toast || '')) && await page.evaluate(() => App.get('trucks', 't_ex2').status) === 'arrived', 'view-only viewer: Start says it can’t save and the truck stays in the yard');
    ok(h2.errors.length === 0, 'view-only: no page errors' + (h2.errors.length ? ':\n' + h2.errors.join('\n') : ''));
  } finally {
    await h2.close();
  }
}
