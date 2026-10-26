/* Regression (PLAN.md 1.7). Everyone runs this before merging:
     node website/portal/test/run.js regression [--dist DIR]
   1. every role opens and shows its main screen at 390 and 1400 (kiosk also 1024);
   2. the old screens and flows still work (customer book / cancel / answer damage, crew start / count / wrap up,
      office assign a door / release a truck, kiosk walk-in);
   3. old data still loads: a doc saved by the base build renders in this build and nothing is written
      (rev and the stored text stay the same) until the first action.
   Nothing here depends on stream A features, so it also passes on a base-only build (--streams "").
   Screens that streams replace on purpose: the booking time (B: <input type=time> instead of the select) is filled
   either way; the kiosk (C, ZZFLAGS.kiosk2) is opened as built, and the old walk-in flow runs with the test-only
   flag override {kiosk2:false}, because the old kiosk XQ stays in the bundle as the fallback (PLAN 1.4). */
const H = require('./harness');
const { PHONE, DESK, TABLET } = H;

const VIEWS = [['390', PHONE], ['1400', DESK]];
const has = (s, re) => re instanceof RegExp ? re.test(s) : s.includes(re);

H.main('regression', async (h, t) => {
  /* ---------------- 1. every role opens ---------------- */
  t.section('every role opens and shows its main screen');
  for (const [vw, viewport] of VIEWS) {
    let p = await h.openAs('customer', { viewport });
    let s = await h.text(p);
    t.ok(has(s, 'Altex Transportation') && has(s, 'Schedule a truck') && has(s, 'This week'), `customer Schedule tab @${vw}`);
    await h.check(p, `regression-customer-${vw}`);
    await p.context().close();

    p = await h.openAs('office', { viewport });
    s = await h.text(p);
    t.ok(has(s, 'Office · Nick') && has(s, 'On the floor') && has(s, 'Doors'), `office Board @${vw}`);
    await h.check(p, `regression-office-${vw}`);
    await p.context().close();

    p = await h.openAs('crew', { viewport });
    if (await p.getByRole('button', { name: 'Got it' }).count()) await p.getByRole('button', { name: 'Got it' }).click();
    s = await h.text(p);
    t.ok(has(s, 'Forklift crew') && has(s, /your next job/i) && has(s, 'Next job'), `crew Next job @${vw}`);
    await h.check(p, `regression-crew-${vw}`);
    await p.context().close();

    for (const [kv, kvp] of vw === '390' ? [['390', PHONE], ['1024', TABLET]] : [['1400', DESK]]) {
      p = await h.open('#stations', { viewport: kvp });
      t.ok(has(await h.text(p), 'Dock stations'), `#stations opens @${kv}`);
      await p.getByText('Open driver check-in').click();
      await p.waitForTimeout(250);
      s = await h.text(p);
      if (has(s, 'Driver check-in') && has(s, "Who's the freight for?")) t.ok(true, `kiosk from #stations @${kv} (old kiosk)`);
      else {
        // stream C's kiosk (ZZFLAGS.kiosk2): it must open and show something; its own tests check the screens
        const k2 = await p.evaluate(() => !!(window.__zz && window.__zz.h && window.__zz.h.ZZFLAGS && window.__zz.h.ZZFLAGS.kiosk2));
        t.ok(k2 && !has(s, 'Dock stations') && s.trim().length > 10, `kiosk from #stations @${kv} (new kiosk, ZZFLAGS.kiosk2)`);
      }
      await h.check(p, `regression-kiosk-${kv}`);
      await p.context().close();
    }

    p = await h.open('#stations', { viewport });
    await p.getByText('Open the dock board').click();
    await p.waitForTimeout(250);
    s = await h.text(p);
    t.ok(has(s, 'Doors') && has(s, 'D1') && has(s, 'D8'), `TV board @${vw}`);
    // the wall board is built for a big screen; today's live portal already scrolls sideways on a phone (stream E owns the TV)
    await h.check(p, `regression-tv-${vw}`, { knownScroll: 'TV board is a wall-screen layout' });
    await p.context().close();
  }

  /* ---------------- 2. old flows ---------------- */
  t.section('customer: book a truck, cancel a booking, answer a damage estimate');
  {
    const p = await h.openAs('customer', { viewport: PHONE });
    await p.getByRole('button', { name: 'Schedule a truck' }).first().click();
    const day = new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10);
    await p.fill('input[type=date]', day);
    // today: a 30-minute select; stream B: <input type="time"> (either way, 10:00 dock time)
    const timeBox = p.locator('input[type=time]');
    if (await timeBox.count()) await timeBox.first().fill('10:00');
    else await p.locator('select.zz-inp').first().selectOption('10:00');
    await p.fill('input[placeholder="e.g. 112045"]', 'REG-1');
    await p.fill('input[placeholder="0"]', '12');
    await p.fill('input[placeholder="e.g. 4521"]', '7777');
    await h.check(p, 'regression-customer-book-form');
    await p.getByRole('button', { name: 'Add to schedule' }).click();
    await p.waitForTimeout(500);
    let doc = await h.readDoc(p);
    const tr = doc.trailers.find(x => x.truck === '7777');
    t.ok(tr && tr.stage === 'scheduled' && tr.customerId === 'cu_altex' && tr.direction === 'inbound', 'booking saved as a scheduled truck for Altex');
    const loads = doc.shipments.filter(x => x.trailerInId === tr.id);
    t.ok(loads.length === 1 && loads[0].ref === 'REG-1' && loads[0].units.std === 12, 'booking saved its load (REG-1, 12 pallets)');
    t.ok(has(await h.text(p), 'Truck 7777'), 'new truck shows on the schedule');
    // start the next flow from a fresh screen (stream B may open a "booked" sheet after submitting)
    await p.reload();
    await h.waitLoaded(p);

    const before = doc.trailers.find(x => x.truck === '23N');
    t.ok(before && before.stage === 'scheduled', 'seed pickup 23N is booked');
    await p.getByText('Truck 23N').first().click();
    await p.waitForTimeout(300);
    await p.getByRole('button', { name: 'Cancel booking' }).click();
    await p.getByRole('button', { name: 'Yes, cancel it' }).click();
    await p.waitForTimeout(500);
    doc = await h.readDoc(p);
    t.ok(doc.trailers.find(x => x.id === before.id).stage === 'cancelled', 'cancel booking: truck 23N is cancelled');
    await p.keyboard.press('Escape').catch(() => {});

    await p.reload();
    await h.waitLoaded(p);
    await p.getByRole('button', { name: 'Review' }).first().click();
    await p.waitForTimeout(300);
    await p.getByRole('button', { name: /^Accept \$/ }).first().click();
    await p.waitForTimeout(250);
    await p.fill('input[placeholder="First and last name"]', 'Pat Tester');
    const box = p.locator('input[type=checkbox]').last();
    if (!(await box.isChecked())) await box.check();
    await h.check(p, 'regression-customer-approve');
    await p.getByRole('button', { name: /^Approve \$/ }).click();
    await p.waitForTimeout(500);
    doc = await h.readDoc(p);
    const ld = doc.shipments.find(x => x.ref === '111927');
    const ex = (ld.exceptions || []).find(x => x.kind === 'Damage');
    t.ok(ex && ex.answer && ex.answer.status === 'accepted' && ex.answer.by === 'Pat Tester', 'damage estimate answered: accepted by Pat Tester');
    t.ok(doc.customers.find(c => c.id === 'cu_altex').rates === null, 'customer rates unchanged by the answer');
    await p.context().close();
  }

  t.section('crew: start a truck, count a load, wrap up');
  {
    const p = await h.openAs('crew', { viewport: PHONE });
    if (await p.getByRole('button', { name: 'Got it' }).count()) await p.getByRole('button', { name: 'Got it' }).click();
    await p.getByRole('button', { name: /^All trucks/ }).first().click();
    await p.waitForTimeout(250);
    await p.locator(':text("Truck 52 · Trailer T318")').locator('xpath=ancestor::*[.//button[contains(.,"Start unloading")]][1]')
      .getByRole('button', { name: 'Start unloading' }).click();
    await p.waitForTimeout(500);
    let doc = await h.readDoc(p);
    let tr = doc.trailers.find(x => x.truck === '52');
    t.ok(tr.stage === 'working' && !!tr.workStartedAt && tr.workStartedBy === 'Roman', 'start: truck 52 is working, started by Roman');
    await p.getByRole('button', { name: /^3 Unload, count/ }).click();
    await p.waitForTimeout(250);
    await p.getByRole('button', { name: /^Receive/ }).first().click();
    await p.waitForTimeout(400);
    await p.fill('input[type=number]', '7');
    await p.getByRole('button', { name: 'Good', exact: true }).click();
    await p.getByRole('button', { name: '05', exact: true }).click();
    await h.check(p, 'regression-crew-count');
    await p.getByRole('button', { name: 'Save', exact: true }).click();
    await p.waitForTimeout(500);
    doc = await h.readDoc(p);
    const ld = doc.shipments.find(x => x.ref === 'WV-6101');
    t.ok(ld.receivedAt && ld.qc.counted === 7 && ld.qc.condition === 'Good' && ld.row === 'R05', 'count: WV-6101 received, counted 7, Good, row R05');
    await p.getByRole('button', { name: /^Wrap up & send/ }).click();
    await p.waitForTimeout(300);
    await p.getByRole('button', { name: 'Send to dispatch', exact: true }).click();
    await p.waitForTimeout(500);
    doc = await h.readDoc(p);
    tr = doc.trailers.find(x => x.truck === '52');
    t.ok(tr.stage === 'done' && !!tr.workDoneAt && tr.workDoneBy === 'Roman', 'wrap up: truck 52 is done');
    await h.check(p, 'regression-crew-done');
    await p.context().close();
  }

  t.section('office: release a truck, assign a door');
  {
    const seed = await h.baseDoc();
    const t1 = seed.trailers.find(x => x.id === 'zzt1');
    Object.assign(t1, { stage: 'done', workStartedAt: new Date(Date.now() - 50 * 6e4).toISOString(), workDoneAt: new Date(Date.now() - 5 * 6e4).toISOString(), workDoneBy: 'Roman' });
    const p = await h.openAs('office', { viewport: DESK, seed });
    await p.locator('button:has-text("D3")').first().click();
    await p.waitForTimeout(300);
    await p.getByRole('button', { name: 'Release truck' }).click();
    await p.waitForTimeout(200);
    if (await p.getByRole('button', { name: 'Release anyway' }).count()) await p.getByRole('button', { name: 'Release anyway' }).click();
    await p.waitForTimeout(500);
    let doc = await h.readDoc(p);
    let x1 = doc.trailers.find(x => x.id === 'zzt1');
    t.ok(x1.stage === 'departed' && !x1.dock && !!x1.departedAt, 'release: truck 41 left, door D3 is free');
    await p.getByRole('button', { name: 'Close' }).first().click().catch(() => {});
    await p.waitForTimeout(200);
    const yard = doc.trailers.find(x => x.truck === '27N');
    t.ok(yard && yard.dock === 'YD', 'truck 27N waits in the yard');
    await p.locator('button:has-text("27N")').first().click();
    await p.waitForTimeout(300);
    await p.getByRole('button', { name: 'D3', exact: true }).click();
    await p.waitForTimeout(500);
    doc = await h.readDoc(p);
    x1 = doc.trailers.find(x => x.truck === '27N');
    t.ok(x1.dock === 'D3' && x1.stage === 'at-dock', 'assign: truck 27N is at door D3');
    await h.check(p, 'regression-office-assigned');
    await p.context().close();
  }

  t.section('kiosk: walk-in');
  {
    // the old kiosk (XQ) walk-in; kept as the fallback behind ZZFLAGS.kiosk2 (a base build ignores the flag)
    const p = await h.open('#stations', { viewport: TABLET, flags: { kiosk2: false } });
    await p.getByText('Open driver check-in').click();
    await p.fill('input[placeholder^="Company name"]', 'Zebra Freight Test');
    await p.waitForTimeout(250);
    await p.getByRole('button', { name: /^Not listed/ }).click();
    await p.getByRole('button', { name: 'Continue' }).click();
    await p.waitForTimeout(250);
    await p.fill('input[placeholder="billing@company.com"]', 'billing@zebra.example');
    await p.fill('input[placeholder="MC-000000"]', 'MC-123456');
    const texts = p.locator('input:is([type=text], :not([type])):is([placeholder=""], :not([placeholder]))');
    await texts.nth(0).fill('Dana Driver');
    await texts.nth(1).fill('9001');
    await texts.nth(2).fill('T9001');
    await p.locator('input[type=number]').first().fill('6');
    await h.check(p, 'regression-kiosk-walkin-form');
    await p.getByRole('button', { name: 'Open account and check in' }).click();
    await p.waitForTimeout(600);
    const doc = await h.readDoc(p);
    const cu = doc.customers.find(c => c.name === 'Zebra Freight Test');
    const tr = doc.trailers.find(x => x.customerId === (cu && cu.id));
    t.ok(cu && cu.source === 'kiosk' && cu.contact === 'billing@zebra.example', 'walk-in opened an account (source kiosk)');
    t.ok(tr && tr.arrivedAt && tr.driver === 'Dana Driver' && tr.truck === '9001' && (tr.dock === 'YD' || /^D[1-8]$/.test(tr.dock)), 'walk-in truck checked in (door or yard)');
    await h.check(p, 'regression-kiosk-walkin-done');
    await p.context().close();
  }

  /* ---------------- 3. old data still loads ---------------- */
  t.section('old data loads without writes');
  {
    // a doc saved by the BASE build (today's live portal), after one real action there
    const bp = await h.openAs('customer', { path: '/base.html', viewport: PHONE, probe: false });
    await bp.getByText('Truck 30N').first().click();
    await bp.waitForTimeout(300);
    await bp.getByRole('button', { name: 'Cancel booking' }).click();
    await bp.getByRole('button', { name: 'Yes, cancel it' }).click();
    await bp.waitForTimeout(500);
    const saved = await h.readDocRaw(bp);
    await bp.context().close();
    const old = JSON.parse(saved);
    t.ok(old.v === 8 && old.rev >= 1 && old.zzT10 === true, 'base build saved a v8 doc (rev ' + old.rev + ')');

    for (const role of ['office', 'crew', 'customer']) {
      const ctx = await h.newContext({ viewport: PHONE, seed: saved });
      const p = await h.openAs(role, { context: ctx });
      if (await p.getByRole('button', { name: 'Got it' }).count()) await p.getByRole('button', { name: 'Got it' }).click();
      const s = await h.text(p);
      t.ok(s.length > 200 && !/Working offline/.test(s), `old doc renders for ${role}`);
      await p.waitForTimeout(5600);   // across one 5 s refresh poll
      const now = await h.readDocRaw(p);
      t.ok(now === saved, `${role}: nothing written on load (rev ${JSON.parse(now).rev}, stored text unchanged)`);
      if (role === 'office') {
        // first action writes and bumps rev by one
        await p.locator('button:has-text("27N")').first().click();
        await p.waitForTimeout(300);
        await p.fill('input[placeholder="SL-00000"]', 'SL-12345');
        await p.getByRole('button', { name: 'Save seal' }).click();
        await p.waitForTimeout(500);
        const after = JSON.parse(await h.readDocRaw(p));
        t.ok(after.rev === old.rev + 1, `first action writes once (rev ${old.rev} -> ${after.rev})`);
      }
      await ctx.close();
    }
  }
});
