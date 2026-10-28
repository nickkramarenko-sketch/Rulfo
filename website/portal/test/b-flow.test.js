/* Stream B: the crew truck flow rework (Nick's review, Oct 28), customer side. Signs in as Altex 7788.
     node website/portal/test/run.js b [--dist DIR]
   Covers: the pickup booking form ("More than one stop?", stop and nose / middle / tail per load, suggested from the stops,
   saved with zzLoadPlan; the photo of how it came from the shipper in ship:<truck id>, a cancelled form leaves no photo
   behind), the truck sheet (load badges numbered for this customer only, the load plan in loading order and its edit
   while booked, the shipper photo on the truck, the signed manifest with only this customer's lines, the Done section's
   unloading / warehouse photos, the new securing report with its photos), and damage snaps (draft:true) that never show
   on the Damage tab, in its count or in the bell. Data is read back from localStorage (the stored doc is the truth). */
const H = require('./harness');
const { PHONE, DESK } = H;

const iso = ms => new Date(ms).toISOString();
const MIN = 6e4, HOUR = 36e5, DAY = 864e5;
const clone = o => JSON.parse(JSON.stringify(o));
const TALL = { width: 390, height: 3600 };
const dockYmd = ms => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEklEQVR42mP8z8AARMQBxlGFAD7XAQEZW5rUAAAAAElFTkSuQmCC';

async function ready(page) { await page.waitForFunction(() => window.__zz && window.__zz.actions && window.__zz.h, null, { timeout: 10000 }); }
const sheet = p => p.locator('.fixed.inset-0').last();
const txt = async loc => (await loc.innerText()).replace(/\s+/g, ' ');
async function tab(page, label) { await page.locator('nav.zz-tabs button', { hasText: label }).first().click(); await page.waitForTimeout(250); }
async function noSide(t, page, label) {
  const r = await page.evaluate(() => {
    const vw = window.innerWidth, bad = [];
    const clipped = el => { for (let q = el.parentElement; q && q !== document.body; q = q.parentElement) { const s = getComputedStyle(q); if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) return true; } return false; };
    document.querySelectorAll('#root *').forEach(el => { const b = el.getBoundingClientRect(); if (!b.width || !b.height) return;
      if ((b.right > vw + 1 || b.left < -1) && !clipped(el)) bad.push(el.tagName.toLowerCase() + ' "' + (el.innerText || '').slice(0, 40).replace(/\s+/g, ' ') + '"'); });
    const inner = [...document.querySelectorAll('.overflow-y-auto')].filter(el => el.scrollWidth > el.clientWidth + 1).map(el => el.scrollWidth + '>' + el.clientWidth);
    return { vw, sw: document.scrollingElement.scrollWidth, bad: bad.slice(0, 6), inner };
  });
  t.ok(r.sw <= r.vw && !r.bad.length && !r.inner.length, `${label}: no sideways scroll at ${r.vw} px` + (r.bad.length || r.inner.length || r.sw > r.vw ? ` (page ${r.sw}, sticking out: ${r.bad.join(' | ')}, sheet: ${r.inner.join(',')})` : ''));
}
async function tallShot(h, page, name) {
  const vp = page.viewportSize();
  await page.setViewportSize(TALL);
  await page.evaluate(() => document.querySelectorAll('.overflow-y-auto').forEach(el => { el.scrollTop = 0; }));
  await page.waitForTimeout(250);
  await h.check(page, name);
  await page.setViewportSize(vp);
  await page.waitForTimeout(150);
}
/* photos saved on this device (local mode): cdweb:cd6:photos:<owner> */
async function putPhotos(page, owner, n) {
  await page.evaluate(async ([owner, n, src]) => { await window.__zz.h.photos.ex(owner, [...Array(n)].map((_, k) => ({ id: owner + ':' + k, src, at: new Date().toISOString(), by: 'Roman' }))); }, [owner, n, PNG]);
}
const photoKeys = page => page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('cdweb:cd6:photos:ship:')).map(k => [k.slice('cdweb:cd6:photos:'.length), JSON.parse(localStorage.getItem(k) || '[]').length]));
const truckDoc = (o) => ({ carrier: 'Altex Transportation', driver: '', phone: '', trailer: '', direction: 'inbound', customerId: 'cu_altex', needsMatch: false, dock: null, stage: 'scheduled',
  arrivedAt: null, dockedAt: null, workStartedAt: null, workDoneAt: null, departedAt: null, sealIn: '', sealOut: '', sealVerified: null, notes: '', chat: [], instructions: '', workStartedBy: null, workDoneBy: null, ...o });
const loadDoc = (o) => ({ customerId: 'cu_altex', trailerOutId: null, units: { std: 8, lg: 0, crate: 0 }, exceptions: [], adjustments: [], chat: [], touches: [], corrections: [], lane: 'reno', status: 'staged', ...o });

H.main('b-flow', async (h, t) => {
  const base = await h.baseDoc();
  const NOW = Date.now();
  const seed = clone(base);
  const recv = iso(NOW - 3 * DAY + HOUR);
  /* the inbound truck our floor loads came in on (departed) */
  seed.trailers.push(truckDoc({ id: 'tIn0', truck: '6100', stage: 'departed', scheduledAt: iso(NOW - 3 * DAY), arrivedAt: iso(NOW - 3 * DAY), dockedAt: iso(NOW - 3 * DAY),
    workStartedAt: iso(NOW - 3 * DAY), workDoneAt: iso(NOW - 3 * DAY + HOUR), departedAt: iso(NOW - 3 * DAY + 2 * HOUR) }));
  /* three free loads on the floor for the pickup form */
  ['FL-1', 'FL-2', 'FL-3'].forEach((ref, k) => seed.shipments.push(loadDoc({ id: 'sF' + (k + 1), ref, trailerInId: 'tIn0', receivedAt: recv, receivedBy: 'Roman', seq: k, units: { std: 6 + k, lg: 0, crate: 0 } })));
  /* a booked multi-stop pickup: 3 Altex loads and 1 Pine Ridge load (another company: never shown, never numbered) */
  seed.trailers.push(truckDoc({ id: 'tOut', truck: '6200', direction: 'outbound', stage: 'scheduled', scheduledAt: iso(NOW + DAY), code: '6201', createdAt: iso(NOW - HOUR), multiStop: true, jobType: 'Reno pickup' }));
  seed.shipments.push(loadDoc({ id: 'sO1', ref: 'OUT-A', trailerInId: 'tIn0', trailerOutId: 'tOut', receivedAt: recv, seq: 0, stop: 1, pos: 'tail' }));
  seed.shipments.push(loadDoc({ id: 'sOP', ref: 'PINE-9', customerId: 'cu_pine', trailerInId: 'tIn0', trailerOutId: 'tOut', receivedAt: recv, seq: 1, stop: 3, pos: 'nose' }));
  seed.shipments.push(loadDoc({ id: 'sO2', ref: 'OUT-B', trailerInId: 'tIn0', trailerOutId: 'tOut', receivedAt: recv, seq: 2, stop: 2, pos: 'middle' }));
  seed.shipments.push(loadDoc({ id: 'sO3', ref: 'OUT-C', trailerInId: 'tIn0', trailerOutId: 'tOut', receivedAt: recv, seq: 3, stop: 3, pos: 'nose' }));
  /* a packed truck that left: new securing report (strap: photos) and a signed manifest with lines of two customers + an extra line */
  const signed = iso(NOW - 2 * HOUR);
  seed.trailers.push(truckDoc({ id: 'tMan', truck: '6300', direction: 'outbound', stage: 'departed', scheduledAt: iso(NOW - 5 * HOUR), arrivedAt: iso(NOW - 4 * HOUR), dockedAt: iso(NOW - 4 * HOUR),
    workStartedAt: iso(NOW - 230 * MIN), workDoneAt: iso(NOW - 2 * HOUR), departedAt: iso(NOW - 100 * MIN), afterPhotoCount: 3, strapPhotoCount: 2, bolPhotoCount: 1, sealOut: 'SL-6300',
    secure: { gear: { plywood: { qty: 5, owner: 'ours' }, bars: { qty: 2, owner: 'driver' }, straps: { qty: 4, owner: 'ours' }, airbags: { qty: 0, owner: 'ours' } }, tags: ['B-401'], seal: 'SL-6300',
      photos: null, photoOwner: 'strap:tMan', photoCount: 2, v: 2, confidence: 5, note: '', checkedRows: true, signature: 'Roman', signedBy: 'Roman', signedAt: iso(NOW - 125 * MIN) },
    manifest: { lines: [
      { id: 'm1', sid: 'sM1', ref: 'MAN-A', customerId: 'cu_altex', planned: 8, loaded: 8, stop: null, pos: null, note: '' },
      { id: 'm2', sid: 'sMP', ref: 'PINE-7', customerId: 'cu_pine', planned: 4, loaded: 4, stop: null, pos: null, note: '' },
      { id: 'm3', sid: 'sM2', ref: 'MAN-B', customerId: 'cu_altex', planned: 6, loaded: 5, stop: null, pos: null, note: 'one pallet stayed, broken' },
      { id: 'm4', sid: null, ref: 'Loose freight', customerId: null, planned: 0, loaded: 2, stop: null, pos: null, note: 'staff only' }],
      total: 19, signature: 'Roman', signedBy: 'Roman', signedAt: signed } }));
  seed.shipments.push(loadDoc({ id: 'sM1', ref: 'MAN-A', trailerInId: 'tIn0', trailerOutId: 'tMan', receivedAt: recv, loadedAt: signed, shippedAt: iso(NOW - 100 * MIN), seq: 0 }));
  seed.shipments.push(loadDoc({ id: 'sMP', ref: 'PINE-7', customerId: 'cu_pine', trailerInId: 'tIn0', trailerOutId: 'tMan', receivedAt: recv, loadedAt: signed, shippedAt: iso(NOW - 100 * MIN), seq: 1, units: { std: 4, lg: 0, crate: 0 } }));
  seed.shipments.push(loadDoc({ id: 'sM2', ref: 'MAN-B', trailerInId: 'tIn0', trailerOutId: 'tMan', receivedAt: recv, loadedAt: signed, shippedAt: iso(NOW - 100 * MIN), seq: 2, units: { std: 6, lg: 0, crate: 0 }, pullCount: 5 }));
  /* an unloaded truck: unloading photos, a warehouse photo for its load, one damage snap on the load (draft), one on the truck, and one finished report */
  seed.trailers.push(truckDoc({ id: 'tUn', truck: '6400', stage: 'done', scheduledAt: iso(NOW - 3 * HOUR), arrivedAt: iso(NOW - 150 * MIN), dockedAt: iso(NOW - 140 * MIN), workStartedAt: iso(NOW - 135 * MIN),
    workDoneAt: iso(NOW - 80 * MIN), workStartedBy: 'Roman', workDoneBy: 'Roman', beforePhotoCount: 1, unloadPhotoCount: 2,
    dmgDrafts: [{ id: 'xTruck', photoOwner: 'dmg:xTruck', photoCount: 1, at: iso(NOW - 120 * MIN), by: 'Roman', note: '' }] }));
  seed.shipments.push(loadDoc({ id: 'sU1', ref: 'UN-1', trailerInId: 'tUn', receivedAt: iso(NOW - 100 * MIN), receivedBy: 'Roman', qc: { condition: 'Good', counted: 8, note: '' }, row: 'R07', rowPhotoCount: 1,
    exceptions: [
      { id: 'xDraft', kind: 'Damage', draft: true, photoOwner: 'dmg:xDraft', photoCount: 1, at: iso(NOW - 125 * MIN), openedBy: 'Roman', note: 'Damage photo, details to come', snapNote: 'SNAP-SECRET', resolved: false, trailerId: 'tUn' },
      { id: 'xDone', kind: 'Damage', draft: false, photoOwner: 'dmg:xDone', photoCount: 2, at: iso(NOW - 124 * MIN), openedBy: 'Roman', note: '1 pallet · Crushed', pallets: 1, kinds: ['Crushed'], what: 'corner crushed',
        resolved: false, est: { lines: [{ id: 'l1', label: 'Rewrap pallet', qty: 1, unit: 15 }], sentAt: iso(NOW - 90 * MIN) }, answer: null, finishedAt: iso(NOW - 90 * MIN), finishedBy: 'Roman' }] }));

  /* ================= 1. pickup booking: more than one stop, shipper photo ================= */
  t.section('pickup booking: stops, place in the trailer, shipper photo');
  {
    const p = await h.openAs('customer', { viewport: PHONE, seed });
    await ready(p);
    const day = dockYmd(NOW + 2 * DAY);
    /* a form that is cancelled leaves no shipper photo behind */
    await tab(p, 'Inventory');
    await p.getByRole('button', { name: 'Book a pickup' }).first().click();
    await p.waitForTimeout(300);
    await sheet(p).locator('[data-zzb=book-ship] input[type=file]').setInputFiles(h.UPLOAD_PNG);
    await p.waitForFunction(() => document.querySelectorAll('[data-zzb=book-ship] img').length === 1, null, { timeout: 5000 });
    let keys = await photoKeys(p);
    t.ok(keys.length === 1 && keys[0][1] === 1, 'the shipper photo is saved under ship:<the form\'s truck id> (' + JSON.stringify(keys) + ')');
    await sheet(p).getByRole('button', { name: 'Cancel', exact: true }).click();
    await p.waitForTimeout(400);
    keys = await photoKeys(p);
    t.ok(keys.every(k => k[1] === 0), 'Cancel clears the photo of a booking that was never sent (' + JSON.stringify(keys) + ')');

    await p.getByRole('button', { name: 'Book a pickup' }).first().click();
    await p.waitForTimeout(300);
    const fs = sheet(p);
    t.ok(await fs.locator('[data-zzb=book-plan]').count() === 0, 'no stop question with fewer than 2 loads ticked');
    for (const ref of ['FL-1', 'FL-2', 'FL-3']) await fs.locator('.zz-pick', { hasText: 'Load ' + ref }).locator('input[type=checkbox]').check();
    await p.waitForTimeout(200);
    const bp = fs.locator('[data-zzb=book-plan]');
    t.ok(await bp.count() === 1 && /More than one stop\?/.test(await txt(bp)) && await bp.locator('[data-sid]').count() === 0, '2+ loads ticked: "More than one stop?" (one stop by default)');
    await bp.getByRole('button', { name: 'Yes' }).click();
    await p.waitForTimeout(200);
    const rowState = () => bp.locator('[data-sid]').evaluateAll(xs => xs.map(x => [x.dataset.sid, x.querySelector('select').value, (x.querySelector('button[aria-pressed=true]') || {}).dataset ? (x.querySelector('button[aria-pressed=true]') || { dataset: {} }).dataset.pos || '' : '']));
    let rs = await rowState();
    t.eq(rs, [['sF1', '1', 'tail'], ['sF2', '2', 'middle'], ['sF3', '3', 'nose']], 'Yes: each load gets a stop (1, 2, 3) and the suggested place: first stop tail, last stop nose');
    t.ok(/Last stop goes in the nose, first stop by the doors/.test(await txt(bp)), 'plain words: "Last stop goes in the nose, first stop by the doors"');
    const hts = await bp.locator('[data-sid="sF1"] button, [data-sid="sF1"] select').evaluateAll(xs => xs.map(x => Math.round(x.getBoundingClientRect().height)));
    t.ok(hts.length === 4 && hts.every(v => v >= 48), `stop and place controls are at least 48 px tall (${hts.join(', ')})`);
    /* every load to stop 1: refused with a plain message */
    for (const sid of ['sF2', 'sF3']) await bp.locator(`[data-sid="${sid}"] select`).selectOption('1');
    await p.fill('input[type=date]', day);
    await fs.locator('input[type=time]').first().fill('10:20');
    await fs.getByRole('button', { name: 'Add to schedule' }).click();
    await p.waitForTimeout(300);
    t.ok(/Give at least one load a different stop/.test(await txt(fs.locator('[role=alert]'))), 'all loads on stop 1 is refused: "Give at least one load a different stop ..."');
    /* FL-2 and FL-3 to stop 2: both suggested nose (the last stop); then the customer moves FL-2 to the middle */
    for (const sid of ['sF2', 'sF3']) await bp.locator(`[data-sid="${sid}"] select`).selectOption('2');
    rs = await rowState();
    t.eq(rs.map(r => r[2]), ['tail', 'nose', 'nose'], 'changing a stop re-suggests the places (stop 1 tail, stop 2 nose)');
    await bp.locator('[data-sid="sF2"] button[data-pos=middle]').click();
    await bp.locator('[data-sid="sF1"] select').selectOption('1');
    rs = await rowState();
    t.eq(rs.map(r => r[2]), ['tail', 'middle', 'nose'], 'a place the customer picked stays when the stops change');
    /* the shipper photo */
    await fs.locator('[data-zzb=book-ship] input[type=file]').setInputFiles(h.UPLOAD_PNG);
    await p.waitForFunction(() => document.querySelectorAll('[data-zzb=book-ship] img').length === 1, null, { timeout: 5000 });
    await tallShot(h, p, 'flow-book-stops-390');
    await noSide(t, p, 'pickup form with stops and the shipper photo');
    await fs.getByRole('button', { name: 'Add to schedule' }).click();
    await p.waitForTimeout(900);
    const doc = await h.readDoc(p);
    const tr = doc.trailers.find(x => x.direction === 'outbound' && doc.shipments.some(s => s.id === 'sF1' && s.trailerOutId === x.id));
    const S = id => doc.shipments.find(s => s.id === id);
    t.ok(tr && tr.multiStop === true && tr.shipperPhotoCount === 1 && tr.bookedVia === 'client', 'the pickup is saved with multiStop and shipperPhotoCount 1');
    t.ok(tr && [['sF1', 1, 'tail'], ['sF2', 2, 'middle'], ['sF3', 2, 'nose']].every(([id, st, ps]) => S(id).stop === st && S(id).pos === ps && S(id).trailerOutId === tr.id), 'each load saved with its stop and place (zzLoadPlan)');
    t.ok(tr && (tr.history || []).some(x => x.text === 'Load plan: more than one stop'), 'the truck history says "Load plan: more than one stop"');
    keys = await photoKeys(p);
    t.ok(tr && keys.some(k => k[0] === 'ship:' + tr.id && k[1] === 1), 'the photo stays under ship:<the new truck id>');
    await p.close();
  }

  /* ================= 2. truck sheet: badges, load plan, shipper photo ================= */
  t.section('truck sheet: badges for my loads only, load plan, shipper photo');
  {
    const p = await h.openAs('customer', { viewport: PHONE, seed });
    await ready(p);
    await tab(p, 'Trucks');
    await p.locator('.zz-row', { hasText: 'Truck 6200' }).first().click();
    await p.waitForTimeout(400);
    const ts = p.locator('[data-zzb=truck]');
    const all = await txt(ts);
    t.ok(!all.includes('PINE-9') && !all.includes('Pine Ridge'), 'another company\'s load on the truck is never shown');
    const nums = await ts.locator('[data-zzb=loads] .zz-narrow [data-badge]').evaluateAll(xs => xs.map(x => x.dataset.badge));
    t.eq(nums, ['1', '2', '3'], 'my loads get badges 1, 2, 3 (numbered for me only, so the count of other loads stays private)');
    const colors = await ts.locator('[data-zzb=loads] .zz-narrow [data-badge] i').evaluateAll(xs => xs.map(x => getComputedStyle(x).backgroundColor));
    t.ok(new Set(colors).size === 3, 'each badge has its own colour, and the number is always inside it (' + colors.join(', ') + ')');
    const plan = ts.locator('[data-zzb=load-plan]');
    const li = await plan.locator('li').evaluateAll(xs => xs.map(x => x.innerText.replace(/\s+/g, ' ').trim()));
    t.eq(li, ['3 OUT-C Stop 3 · NOSE — front of the trailer', '2 OUT-B Stop 2 · MIDDLE — middle of the trailer', '1 OUT-A Stop 1 · TAIL — by the doors'], 'load plan in loading order (nose first), with badges, stop and place');
    t.ok(/3 stops · in loading order, nose first/.test(await txt(plan)), 'the plan says how many stops');
    await tallShot(h, p, 'flow-truck-plan-390');
    await noSide(t, p, 'truck sheet with the load plan');
    /* change the plan while booked */
    await plan.getByRole('button', { name: 'Change the stops' }).click();
    await p.waitForTimeout(200);
    await plan.locator('[data-sid="sO2"] select').selectOption('3');
    await plan.locator('[data-sid="sO1"] button[data-pos=middle]').click();
    await noSide(t, p, 'load plan editor in the truck sheet');
    await plan.getByRole('button', { name: 'Save load plan' }).click();
    await p.waitForTimeout(500);
    let doc = await h.readDoc(p);
    const S = id => doc.shipments.find(s => s.id === id);
    t.ok(S('sO2').stop === 3 && S('sO2').pos === 'nose' && S('sO1').pos === 'middle' && S('sO1').stop === 1, 'saved: OUT-B to stop 3 (nose, suggested), OUT-A placed in the middle by hand');
    t.ok(S('sOP').stop === 3 && S('sOP').pos === 'nose', 'the other company\'s load is not touched');
    t.ok((doc.trailers.find(x => x.id === 'tOut').history || []).some(x => x.text === 'Load plan updated'), 'history: "Load plan updated"');
    /* the shipper photo on the truck sheet */
    const sp = ts.locator('[data-zzb=ship-photo]');
    t.ok(/How it came from the shipper/.test(await txt(sp)) && /loads it the same way/.test(await txt(sp)), 'outbound truck: "How it came from the shipper" box');
    await sp.locator('input[type=file]').setInputFiles(h.UPLOAD_PNG);
    await p.waitForTimeout(700);
    doc = await h.readDoc(p);
    t.ok(doc.trailers.find(x => x.id === 'tOut').shipperPhotoCount === 1 && /1 photo on file/.test(await txt(sp)), 'adding a photo saves shipperPhotoCount 1 (ship:<truck id>)');
    await p.setViewportSize(DESK);
    await p.waitForTimeout(200);
    await h.check(p, 'flow-truck-plan-1400');
    await p.close();
  }

  /* ================= 3. manifest (my lines only) and the new securing report ================= */
  t.section('manifest: only my lines; securing report with its photos');
  {
    const p = await h.openAs('customer', { viewport: PHONE, seed });
    await ready(p);
    await putPhotos(p, 'strap:tMan', 2);
    await tab(p, 'Trucks');
    await p.getByRole('button', { name: /Past trucks/ }).click();
    await p.waitForTimeout(200);
    await p.locator('.zz-row', { hasText: 'Truck 6300' }).first().click();
    await p.waitForTimeout(500);
    const ts = p.locator('[data-zzb=truck]');
    const mf = ts.locator('[data-zzb=manifest]');
    const mt = await txt(mf);
    t.ok(await mf.locator('[data-zzb=mf-line]').count() === 2 && mt.includes('MAN-A') && mt.includes('MAN-B') && !mt.includes('PINE-7') && !mt.includes('Loose freight') && !(await txt(ts)).includes('PINE-7'),
      'manifest: only my 2 lines (no other company\'s line, no staff-only extra line)');
    t.ok(mt.includes('13 pallets loaded') && mt.includes('✓ 8 of 8') && mt.includes('5 of 6') && mt.includes('one pallet stayed, broken') && /Signed by Roman/.test(mt), 'manifest: my total (13), loaded against planned, the crew note, signed by Roman');
    const sec = ts.locator('[data-zzb=secured]');
    await p.waitForFunction(() => { const s = document.querySelector('[data-zzb=secured]'); return s && s.querySelectorAll('img').length === 2; }, null, { timeout: 5000 });
    const st = await txt(sec);
    t.ok(/How it's secured and what's used/i.test(st) && !/Nose \(front/i.test(st) && st.includes('5 of 5') && st.includes('Seal SL-6300') && st.includes('B-401'), 'new securing report: its photos (strap:<truck id>), no fixed nose / middle / tail slots; seal, tags, 5 of 5');
    t.eq(await sec.locator('img').count(), 2, 'the 2 securing photos show');
    const done = await txt(ts.locator('[data-zzb=done]'));
    t.ok(/6 photos taken by our crew/.test(done), 'Done section counts the loading, securing and bills photos (3 + 2 + 1 = 6)');
    await tallShot(h, p, 'flow-manifest-390');
    await noSide(t, p, 'truck sheet with the manifest and securing report');
    await p.close();
  }

  /* ================= 4. Done section photos; damage snaps never show ================= */
  t.section('unloading and warehouse photos; damage snaps stay hidden');
  {
    const p = await h.openAs('customer', { viewport: PHONE, seed });
    await ready(p);
    await putPhotos(p, 'unload:tUn', 2);
    await putPhotos(p, 'row:sU1', 1);
    await putPhotos(p, 'dmg:xDraft', 1);
    /* the Damage tab: the finished report only */
    const dmgN = await p.locator('nav.zz-tabs button', { hasText: 'Damage' }).locator('i').count() ? (await p.locator('nav.zz-tabs button', { hasText: 'Damage' }).locator('i').innerText()).trim() : '0';
    await tab(p, 'Damage');
    const cards = await p.locator('[data-zzb=dmg-card]').evaluateAll(xs => xs.map(x => x.innerText.replace(/\s+/g, ' ')));
    const un1 = cards.filter(c => c.includes('UN-1'));
    t.ok(un1.length === 1 && un1[0].includes('corner crushed') && !cards.some(c => c.includes('details to come') || c.includes('SNAP-SECRET')), 'Damage tab: load UN-1 shows only its finished report, never the snap (' + un1.length + ' card)');
    const needCards = cards.filter(c => /Needs your answer|\bNew\b/.test(c.split('See photos')[0].slice(0, 200))).length;
    const main = await txt(p.locator('main'));
    t.ok(!main.includes('SNAP-SECRET') && !main.includes('details to come'), 'no snap words anywhere on the Damage tab');
    t.ok(+dmgN === needCards && needCards >= 1, `the Damage tab count (${dmgN}) counts only reports that need an answer (${needCards}), not the snap`);
    /* the bell (patch A46): the snap is not listed */
    await p.locator('button[aria-label^="Notifications"]').first().click();
    await p.waitForTimeout(300);
    const bell = await txt(p.locator('body'));
    t.ok(!bell.includes('SNAP-SECRET') && !/details to come/.test(bell), 'the bell does not list the snap');
    await p.keyboard.press('Escape');
    await p.waitForTimeout(200);
    /* the truck sheet: unloading photos and the warehouse photo, counted like the done text */
    await tab(p, 'Trucks');
    await p.locator('button.zzb-card', { hasText: 'Truck 6400' }).first().click();
    await p.waitForTimeout(600);
    const ds = p.locator('[data-zzb=done]');
    await p.waitForFunction(() => { const s = document.querySelector('[data-zzb=done]'); return s && s.querySelectorAll('img').length === 3; }, null, { timeout: 5000 });
    const dt = await txt(ds);
    t.ok(/Unloading/i.test(dt) && /In our warehouse · R07/i.test(dt) && /4 photos taken by our crew/.test(dt), 'Done: the unloading photos, the warehouse photo of the load (row R07) and the count (1 + 2 + 1 = 4)');
    t.eq(await ds.locator('img').count(), 3, 'the 2 unloading photos and the 1 warehouse photo show');
    t.ok(/1 damage report|Damage on load UN-1/.test(dt), 'the finished damage report is linked');
    const ts = await txt(p.locator('[data-zzb=truck]'));
    t.ok(!ts.includes('SNAP-SECRET') && !/details to come|load not picked yet/i.test(ts), 'the truck sheet and its trail never show the snaps (only the finished report)');
    await tallShot(h, p, 'flow-done-photos-390');
    await noSide(t, p, 'done truck with unloading photos');
    await p.close();
  }

  /* ================= 5. the three looks: badges and the load plan stay readable ================= */
  t.section('brand, clean and hi-vis looks');
  for (const theme of ['brand', 'clean', 'hivis']) {
    const ctx = await h.newContext({ viewport: PHONE, seed });
    await ctx.addInitScript(th => { try { localStorage.setItem('cd6:theme', th); } catch (e) {} }, theme);
    const p = await h.openAs('customer', { context: ctx });
    await ready(p);
    await tab(p, 'Trucks');
    await p.locator('.zz-row', { hasText: 'Truck 6200' }).first().click();
    await p.waitForTimeout(400);
    const plan = p.locator('[data-zzb=load-plan]');
    await plan.scrollIntoViewIfNeeded();
    const r = await plan.locator('[data-badge] i').evaluateAll(xs => xs.map(x => { const c = getComputedStyle(x);
      const lum = s => { const v = s.match(/\d+(\.\d+)?/g).slice(0, 3).map(n => +n / 255).map(u => u <= 0.03928 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
      const a = lum(c.backgroundColor), b = lum(c.color); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); }));
    t.ok(r.length === 3 && r.every(v => v >= 3), `${theme}: the number on each badge is readable (${r.map(v => v.toFixed(1)).join(', ')}:1)`);
    await plan.screenshot({ path: require('path').join(h.SHOTS, h.prefix + '-flow-plan-' + theme + '-390.png') });
    await ctx.close();
  }
});
