/* Stream A1 acceptance: shared data for staff (PLAN.md 1.6, 2.8, 3.A "Shared mode").
     node website/portal/test/run.js a-sync [--dist DIR]
   Every shared-mode page loads test/mock-db.js (runtime contract 0.2.91: db / user / assets). Pages in ONE browser
   context share the mock database, so two pages = two devices. They also share localStorage, so the sign-in
   session is cleared before a second page signs in (see staff()).
   Data is read from the page (window.__zz.doc = what the screen shows) and from the mock (window.__mockdb). */
const H = require('./harness');
const { PHONE, DESK } = H;
const MIN = 6e4, HOUR = 36e5;
const iso = ms => new Date(ms).toISOString();
const LIMIT = 240000;

/* ---------- page helpers ---------- */
async function ready(p) { await p.waitForFunction(() => window.__zz && window.__zz.actions && window.__zz.h, null, { timeout: 15000 }); }
const state = p => p.evaluate(() => ({ mode: window.__zz.h.sync.mode, ...window.__zz.h.sync.stats() }));
const dump = p => p.evaluate(() => window.__mockdb.dump());
const writes = p => p.evaluate(() => window.__mockdb.writes.map(w => ({ op: w.op, path: w.path, bytes: w.bytes, keys: w.sent ? Object.keys(w.sent) : [] })));
const screenDoc = p => p.evaluate(() => window.__zz.doc);
const text = p => p.evaluate(() => document.getElementById('root').innerText);
/* run an action; wait until every queued shared write is saved */
async function act(p, name, ...args) {
  return p.evaluate(async ([name, args]) => {
    const f = window.__zz.actions[name];
    if (typeof f !== 'function') throw new Error('no action ' + name);
    let r = f(...args);
    if (r && typeof r.then === 'function') r = await r;
    await window.__zz.h.sync.flush(8000);
    await new Promise(z => setTimeout(z, 120));
    if (r && typeof r === 'object' && Array.isArray(r.trailers)) return { rev: r.rev };
    return r === undefined ? null : r;
  }, [name, args]);
}
async function shared(h, mock, o = {}) {
  const ctx = await h.newContext({ viewport: o.viewport || DESK, mode: 'shared', mock: mock || {}, ...(o.seed ? { seed: o.seed } : {}) });
  if (o.offlineMs) await ctx.addInitScript('window.__ZZSYNC_OFFLINE_MS = ' + o.offlineMs + ';');
  return ctx;
}
/* open a staff screen in a context (a second page = a second device); the shared sign-in session is cleared first */
async function staff(h, ctx, role, viewport) {
  for (const pg of ctx.pages()) { try { await pg.evaluate(() => localStorage.removeItem('cd6:session')); break; } catch (e) {} }
  const p = await h.open('#' + role, { context: ctx, viewport: viewport || DESK });
  await h.signIn(p, role);
  await ready(p);
  if (role === 'crew' && await p.getByRole('button', { name: 'Got it' }).count()) await p.getByRole('button', { name: 'Got it' }).click();
  return p;
}
/* a page that is still waiting for shared data (h.open would wait for the board) */
async function rawPage(h, ctx, hash, viewport) {
  const p = await ctx.newPage();
  await p.setViewportSize(viewport || PHONE);
  p.on('pageerror', e => h.errors.push('[raw ' + hash + '] pageerror: ' + (e && e.message)));
  await p.goto(h.origin + '/' + (hash ? '#' + hash : ''));
  return p;
}
const noteText = p => p.evaluate(() => { const n = document.querySelector('[data-zz="sync-wait"]'); return n ? n.innerText : ''; });
const badge = p => p.evaluate(() => { const b = document.querySelector('[data-zz="mode"]'); return b ? b.innerText : ''; });
/* the red banner (today's banner element, first child of the page wrapper after the badge) */
const has = (s, x) => x instanceof RegExp ? x.test(s) : s.includes(x);
/* the Setup card: stream E renders it in Setup; builds without E mount it on its own below the board (tests only) */
async function mountCard(page) {
  if (await page.evaluate(() => !!document.querySelector('[data-zz="sync-card"]'))) return;
  await page.evaluate(() => {
    const host = document.createElement('div'), pg = document.querySelector('#root > div');
    host.id = 'zz-card-host';
    host.style.cssText = 'max-width:768px;margin:0 auto;padding:16px 16px 140px;box-sizing:border-box';
    document.body.style.background = pg ? getComputedStyle(pg).backgroundColor : '';
    document.body.appendChild(host);
    window.__zzsync.mount(host);
  });
  await page.waitForSelector('[data-zz="sync-card"]');
}

H.main('a-sync', async (h, t) => {
  let DUMP = null;       // a shared database after the owner's first visit (reused as the server copy)
  const BASE = await h.baseDoc();

  /* ================= 1. first visit: only the owner seeds, once ================= */
  t.section('first visit: two owner tabs on an empty database seed once');
  {
    const ctx = await shared(h, {});
    const [a, b] = await Promise.all([h.open('#office', { context: ctx, viewport: DESK }), h.open('#office', { context: ctx, viewport: PHONE })]);
    await ready(a); await ready(b);
    const sa = await state(a), sb = await state(b);
    t.ok(sa.mode === 'db' && sb.mode === 'db', 'both owner tabs are in shared mode');
    const all = (await writes(a)).concat(await writes(b));
    const meta = all.filter(w => w.path === 'portal/meta' && w.op === 'set');
    t.eq(meta.length, 1, 'portal/meta was written once (one tab seeded, the other waited)');
    DUMP = await dump(a);
    const paths = Object.keys(DUMP);
    const cust = paths.filter(p => p.startsWith('customers/'));
    t.ok(cust.length === 17 && !cust.some(p => /^customers\/cu_(0\d\d|[1-3]\d\d)$/.test(p) && !/cu_00[0-3]/.test(p)), 'staging seed is the trimmed demo: 17 accounts (14 + the 3 demo-day accounts zzc11..zzc13), none of the 396 filler accounts cu_004..cu_399');
    // the demo day (ZZdemoMore) adds 4 trucks (zzt11..zzt14) and 12 loads to Nick's base demo
    t.ok(paths.filter(p => p.startsWith('trailers/')).length === BASE.trailers.length + 4 && paths.filter(p => p.startsWith('shipments/')).length === BASE.shipments.length + 12 && paths.includes('trailers/zzt11'),
      'the demo trucks and loads are all there (' + (BASE.trailers.length + 4) + ' trucks, ' + (BASE.shipments.length + 12) + ' loads)');
    t.ok(['portal/meta', 'portal/chat', 'portal/activity'].every(p => DUMP[p]) && paths.some(p => p.startsWith('accountChat/')), 'portal/meta, portal/chat, portal/activity and accountChat/<cid> exist');
    t.ok(DUMP['portal/meta'].v === 8 && !('rev' in DUMP['portal/meta']) && !('touchedAt' in DUMP['portal/meta']) && !('customers' in DUMP['portal/meta']),
      'portal/meta holds the plain keys (v 8, rates, settings, ...) and never rev, touchedAt or the record lists');
    t.ok(paths.filter(p => p.startsWith('trailers/')).every(p => typeof DUMP[p]._o === 'number' && DUMP[p].id), 'one document per record, each with its id and the hidden _o sort field');
    const leases = await a.evaluate(() => window.__mockdb.leases());
    t.ok(!!leases['locks/bootstrap'], 'the seeding tab held the locks/bootstrap lease');
    const da = await screenDoc(a), db = await screenDoc(b);
    t.ok(JSON.stringify(da.trailers.map(x => x.id)) === JSON.stringify(db.trailers.map(x => x.id)) && da.customers.length === 17,
      'both tabs show the same trucks, in the same order');
    t.ok(!da.customers.some(c => '_o' in c) && !da.trailers.some(x => '_o' in x), 'the screens never see the hidden _o field');
    t.ok(all.every(w => w.bytes <= LIMIT), 'no write is larger than 240 KB');
    await h.signIn(a, 'office');
    await ready(a);
    t.ok(has(await badge(a), 'Live · shared'), 'office shows "Live · shared"');
    await h.check(a, 'sync-office-live-1400');
    await h.signIn(b, 'office');
    await ready(b);
    t.ok(has(await badge(b), 'Live · shared'), 'the phone tab shows "Live · shared" too');
    await h.check(b, 'sync-office-live-390');
    await ctx.close();
  }

  /* ================= 2. who stays local ================= */
  t.section('who stays local: customers, viewers, anyone the platform does not call staff');
  {
    // the public link: no db capability (a customer on their phone)
    const ctx = await shared(h, { caps: ['user'] }, { viewport: PHONE });
    const c = await h.open('#customer', { context: ctx, viewport: PHONE });
    await h.signIn(c, 'customer');
    await ready(c);
    t.eq((await state(c)).mode, 'local', 'customer page without the db capability stays in local mode');
    const local0 = await h.readDoc(c);
    t.ok(local0 && local0.v === 8 && local0.customers.length === BASE.customers.length + 3, 'it keeps the full doc in this browser, exactly as today');
    await act(c, 'addTrailer', { id: 'tCust1', truck: '6006', direction: 'inbound', customerId: 'cu_altex', scheduledAt: iso(Date.now() + 26 * HOUR), lines: [{ ref: 'C-1', units: { std: 4 } }] });
    const local1 = await h.readDoc(c);
    t.ok(local1.trailers.some(x => x.id === 'tCust1') && local1.rev === local0.rev + 1, 'a booking is saved in this browser (rev +1), as today');
    t.ok((await writes(c)).length === 0 && Object.keys(await dump(c)).length === 0, 'nothing is written to the shared database');
    const s = await text(c);
    t.ok(!has(s, 'Live · shared') && !has(s, 'Saved on this device only'), 'the customer screen has no mode badge');
    await h.check(c, 'sync-customer-local-390');
    await ctx.close();
  }
  for (const [label, mock] of [
    ['a viewer the platform says cannot write (can → false)', { isOwner: false, canEdit: false, can: false }],
    ['a viewer the platform says nothing about (can → null, not owner, not editor)', { isOwner: false, canEdit: false, can: null }],
    ['no user capability', { caps: ['db'] }]]) {
    const ctx = await shared(h, { ...mock, seed: DUMP });
    const p = await staff(h, ctx, 'office');
    t.ok((await state(p)).mode === 'local' && (await writes(p)).length === 0, label + ': local mode, writes nothing');
    t.ok(has(await badge(p), 'Saved on this device only'), label + ': the badge says "Saved on this device only"');
    const d = await screenDoc(p);
    t.ok(d.customers.length === BASE.customers.length + 3, label + ': shows this device\'s own data, not the shared data');
    await ctx.close();
  }
  {
    // a Contributor: not owner, not editor, but can("data.write") === true -> shared
    const ctx = await shared(h, { isOwner: false, canEdit: false, can: true, seed: DUMP });
    const p = await staff(h, ctx, 'crew', PHONE);
    t.ok((await state(p)).mode === 'db' && (await screenDoc(p)).customers.length === 17, 'can("data.write") === true is enough: crew phone is in shared mode with the shared data');
    t.ok(has(await badge(p), 'Live · shared'), 'crew screen shows "Live · shared"');
    t.ok((await writes(p)).length === 0, 'opening the page writes nothing');
    await h.check(p, 'sync-crew-live-390');
    await ctx.close();
  }

  /* ================= 3. cached first snapshot, offline start, waiting for the owner ================= */
  t.section('a cached first snapshot never seeds; offline start is look-only; others wait for the owner');
  {
    const ctx = await shared(h, { cachedFirst: true, serverDelay: 600, seed: DUMP });
    const p = await staff(h, ctx, 'office');
    const st = await state(p), w = await writes(p);
    t.ok(st.mode === 'db' && (await screenDoc(p)).customers.length === 17, 'with a cached EMPTY first snapshot the page waits for the server and shows the shared data');
    t.ok(w.length === 0, 'it never seeds over existing data (no writes at all)');
    await ctx.close();
  }
  {
    // never a server answer: db-offline after the (test-shortened) 20 s, never seeds, writes nothing
    const ctx = await shared(h, { cachedFirst: true, neverServer: true }, { viewport: PHONE, offlineMs: 1500 });
    const p = await rawPage(h, ctx, 'office', PHONE);
    await p.waitForFunction(() => { const n = document.querySelector('[data-zz="sync-wait"]'); return n && /Can't reach the shared data/.test(n.innerText); }, null, { timeout: 8000 });
    t.ok(has(await noteText(p), "Can't reach the shared data right now") && has(await noteText(p), 'keeps trying'), 'no server answer: "Can\'t reach the shared data right now", and it keeps trying');
    t.ok((await writes(p)).length === 0 && Object.keys(await dump(p)).length === 0, 'offline start never seeds and writes nothing');
    await h.check(p, 'sync-offline-start-390');
    await ctx.close();
  }
  {
    // a non-owner on an empty database waits; the owner's first visit lets it open by itself
    const ctx = await shared(h, { isOwner: false, canEdit: false, can: true }, { viewport: PHONE });
    const w = await rawPage(h, ctx, 'crew', PHONE);
    await w.waitForFunction(() => !!document.querySelector('[data-zz="sync-wait"]'), null, { timeout: 8000 });
    t.ok(has(await noteText(w), 'Waiting for the office to set up shared data'), 'non-owner on an empty database: "Waiting for the office to set up shared data"');
    await w.waitForTimeout(400);
    t.ok((await writes(w)).length === 0 && Object.keys(await dump(w)).length === 0, 'it writes nothing while waiting');
    await h.check(w, 'sync-waiting-390');
    const ownerPage = await (async () => {
      const ctx2 = ctx;   // same database
      const op = await ctx2.newPage();
      // this page is the owner: switch the mock before the app asks (the mock reads its switches when asked)
      await op.addInitScript('(function f(){ if (window.__mockdb) { window.__mockdb.opts.isOwner = true; window.__mockdb.opts.canEdit = true; } else setTimeout(f, 0); })();');
      await op.goto(h.origin + '/#office');
      await h.waitLoaded(op);
      return op;
    })();
    await w.waitForFunction(() => !document.querySelector('[data-zz="sync-wait"]') && window.__zz && window.__zz.doc && window.__zz.doc.customers.length === 17, null, { timeout: 10000 });
    t.ok(true, 'after the owner opens the page once, the waiting phone opens by itself with the shared data');
    t.ok((await writes(w)).length === 0, 'the waiting phone still wrote nothing (only the owner seeds)');
    await ownerPage.close();
    await ctx.close();
  }

  /* ================= 4. two devices ================= */
  t.section('two devices: the office books, the crew sees it within 2 s');
  {
    const ctx = await shared(h, { seed: DUMP });
    const office = await staff(h, ctx, 'office', DESK);
    const crew = await staff(h, ctx, 'crew', PHONE);
    t.ok((await state(office)).mode === 'db' && (await state(crew)).mode === 'db', 'office and crew are both live');
    const w0 = (await writes(office)).length;
    await office.evaluate(() => { window.__remotes = 0; window.addEventListener('cd6:remote', () => window.__remotes++); });
    const t0 = Date.now();
    await office.evaluate(() => window.__zz.actions.addTrailer({ id: 'tShared1', truck: '9071', trailer: 'T9', driver: 'Dana', direction: 'inbound', customerId: 'cu_altex',
      scheduledAt: new Date(Date.now() + 2 * 36e5).toISOString(), bookedVia: 'office', bookedBy: 'Nick', lines: [{ ref: 'SH-1', units: { std: 6 }, weight: 900 }] }));
    await crew.waitForFunction(() => window.__zz.doc.trailers.some(x => x.id === 'tShared1'), null, { timeout: 2000 });
    const ms = Date.now() - t0;
    t.ok(ms < 2000, 'the crew phone has the new truck ' + ms + ' ms after the office booked it (limit 2 s)');
    const cd = await screenDoc(crew);
    t.ok(cd.shipments.some(s => s.ref === 'SH-1' && s.trailerInId === 'tShared1'), 'its load came along');
    await crew.getByRole('button', { name: /^All trucks/ }).first().click().catch(() => {});
    await crew.waitForTimeout(300);
    await crew.getByText(/Booked, not here yet/).first().click();
    await crew.waitForTimeout(300);
    t.ok(has(await text(crew), 'Truck 9071'), 'the crew screen lists truck 9071 under "Booked, not here yet"');
    await crew.getByText(/Truck 9071/).first().scrollIntoViewIfNeeded();
    await h.check(crew, 'sync-crew-sees-booking-390');
    await office.evaluate(() => window.__zz.h.sync.flush(5000));
    const w1 = (await writes(office)).slice(w0);
    t.ok(w1.some(w => w.op === 'set' && w.path === 'trailers/tShared1') && w1.some(w => w.op === 'set' && w.path.startsWith('shipments/')) && !w1.some(w => w.path === 'portal/meta'),
      'a booking writes the new truck and its load as their own documents (portal/meta untouched)');
    t.eq(await office.evaluate(() => window.__remotes), 0, 'the office ignores the echo of its own write (no "changed elsewhere" event)');

    // field-level: confirming a time writes only the changed fields of that truck
    const w2 = (await writes(office)).length;
    await act(office, 'zzConfirm', 'tShared1');
    const w3 = (await writes(office)).slice(w2);
    const up = w3.find(w => w.path === 'trailers/tShared1');
    t.ok(up && up.op === 'update' && up.keys.every(k => ['confirmedAt', 'confirmedBy', 'history'].includes(k)) && up.keys.includes('confirmedAt'),
      'confirming the time sends only the changed fields of that truck (' + (up ? up.keys.join(', ') : 'none') + ')');
    t.ok(w3.every(w => w.path === 'trailers/tShared1' || w.path === 'portal/activity'), 'and nothing else but the activity line');
    await crew.waitForFunction(() => { const x = window.__zz.doc.trailers.find(t => t.id === 'tShared1'); return x && x.confirmedAt; }, null, { timeout: 2000 });
    t.ok(true, 'the crew phone gets the confirmation');

    // crew -> office: the crew starts a truck at a door, the office board shows it
    const cdoc = await screenDoc(crew);
    const atDoor = cdoc.trailers.find(x => x.stage === 'at-dock' && x.dock && x.dock !== 'YD');
    if (atDoor) {
      await crew.evaluate(id => window.__zz.actions.patchTrailer(id, { notes: 'Crew note from the floor' }), atDoor.id);
      await office.waitForFunction(id => { const x = window.__zz.doc.trailers.find(t => t.id === id); return x && x.notes === 'Crew note from the floor'; }, atDoor.id, { timeout: 2000 });
      t.ok(true, 'a change on the crew phone reaches the office within 2 s');
    }

    // same truck, different fields, same moment: both changes stay (field-level writes)
    await Promise.all([
      office.evaluate(() => window.__zz.actions.patchTrailer('tShared1', { driver: 'Alpha Office' })),
      crew.evaluate(() => window.__zz.actions.patchTrailer('tShared1', { phone: '775-555-0199' }))]);
    for (const p of [office, crew]) await p.waitForFunction(() => { const x = window.__zz.doc.trailers.find(t => t.id === 'tShared1'); return x && x.driver === 'Alpha Office' && x.phone === '775-555-0199'; }, null, { timeout: 4000 });
    const both = (await dump(office))['trailers/tShared1'];
    t.ok(both.driver === 'Alpha Office' && both.phone === '775-555-0199', 'two devices changing different fields of one truck at the same moment: both changes are kept');

    // dock chat from both devices at the same moment: both messages stay (lists are joined by id)
    await Promise.all([
      office.evaluate(() => window.__zz.actions.sendDockChat('office', 'From the office ' + 1)),
      crew.evaluate(() => window.__zz.actions.sendDockChat('crew', 'From the crew ' + 2))]);
    for (const p of [office, crew]) await p.waitForFunction(() => { const c = window.__zz.doc.chat.map(x => x.text); return c.includes('From the office 1') && c.includes('From the crew 2'); }, null, { timeout: 6000 });
    await office.waitForTimeout(300);
    const chat = (await dump(office))['portal/chat'].items.map(x => x.text);
    t.ok(chat.includes('From the office 1') && chat.includes('From the crew 2'), 'two devices sending a dock chat message at the same moment: both messages are kept');

    // the UI path: the office gives the yard truck a door on the board, the crew sees it
    // (every door is busy in the demo, so one truck leaves first)
    const gone = (await screenDoc(office)).trailers.find(x => x.stage === 'at-dock' && x.dock && x.dock !== 'YD');
    await act(office, 'patchTrailer', gone.id, { stage: 'departed', dock: null, departedAt: new Date().toISOString() });
    const od = await screenDoc(office);
    const busy = od.trailers.filter(x => x.dock && x.dock !== 'YD' && x.stage !== 'departed' && x.stage !== 'cancelled').map(x => x.dock);
    const free = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8'].find(d => !busy.includes(d));
    const yard = od.trailers.find(x => x.truck === '27N');
    t.ok(!!free && yard && yard.dock === 'YD', '(door ' + free + ' is free and truck 27N waits in the yard)');
    {
      await office.locator('button:has-text("27N")').first().click();
      await office.waitForTimeout(300);
      await office.getByRole('button', { name: free, exact: true }).click();
      await crew.waitForFunction(([id, d]) => { const x = window.__zz.doc.trailers.find(t => t.id === id); return x && x.dock === d; }, [yard.id, free], { timeout: 2000 });
      t.ok(true, 'office assigns door ' + free + ' to truck 27N on the board; the crew phone has it within 2 s');
      await h.check(office, 'sync-office-assigned-1400');
    }
    const allW = (await writes(office)).concat(await writes(crew));
    t.ok(allW.every(w => w.bytes <= LIMIT), 'no write is larger than 240 KB');
    t.eq((await office.evaluate(() => window.__mockdb.overlaps)).length + (await crew.evaluate(() => window.__mockdb.overlaps)).length, 0, 'never two writes at once to one document');
    t.ok((await office.evaluate(() => window.__mockdb.stats().maxInflight)) <= 4, 'at most 4 writes in flight at once');
    await ctx.close();
  }

  /* ================= 5. kiosk check-ins on two devices hold the doors lease ================= */
  t.section('two check-ins at the same moment never get the same door (locks/doors)');
  {
    const ctx = await shared(h, { seed: DUMP });
    const a = await staff(h, ctx, 'office', DESK);
    const b = await staff(h, ctx, 'office', DESK);
    let d = await screenDoc(a);
    // every door is busy in the demo: send one truck home so exactly one door is free
    const leaving = d.trailers.find(x => x.stage === 'at-dock' && x.dock && x.dock !== 'YD');
    await act(a, 'patchTrailer', leaving.id, { stage: 'departed', dock: null, departedAt: new Date().toISOString() });
    await b.waitForFunction(id => window.__zz.doc.trailers.find(x => x.id === id).stage === 'departed', leaving.id, { timeout: 2000 });
    d = await screenDoc(a);
    const busy = d.trailers.filter(x => x.dock && x.dock !== 'YD' && x.stage !== 'departed' && x.stage !== 'cancelled').map(x => x.dock);
    const free = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8'].filter(x => !busy.includes(x));
    t.eq(free, [leaving.dock], '(one door is free: ' + leaving.dock + ')');
    const sched = d.trailers.filter(x => x.stage === 'scheduled' && !x.arrivedAt).slice(0, 2);
    t.ok(sched.length === 2, '(two booked trucks to check in)');
    const [ra, rb] = await Promise.all([
      a.evaluate(id => window.__zz.actions.zzKioskIn(id, { driver: 'Kiosk A' }), sched[0].id),
      b.evaluate(id => window.__zz.actions.zzKioskIn(id, { driver: 'Kiosk B' }), sched[1].id)]);
    t.ok(ra && rb && ra.dock && rb.dock, 'both check-ins went through');
    t.ok([ra.dock, rb.dock].sort().join() === [leaving.dock, 'YD'].sort().join(), 'two devices checking in at the same moment: one truck gets the free door ' + leaving.dock + ', the other waits in the yard (' + ra.dock + ', ' + rb.dock + ')');
    const yardOne = ra.dock === 'YD' ? ra : rb;
    t.ok(yardOne.place >= 1, 'the yard truck gets its place in line (#' + yardOne.place + ')');
    await a.waitForTimeout(400);
    const srv = await dump(a);
    t.ok(srv['trailers/' + sched[0].id].dock === ra.dock && srv['trailers/' + sched[1].id].dock === rb.dock, 'the shared database agrees');
    await ctx.close();
  }

  /* ================= 6. size limit, errors and the read-only banner ================= */
  t.section('no write over 240 KB; errors per code; read-only after invalid_argument');
  {
    const ctx = await shared(h, { seed: DUMP });
    const p = await staff(h, ctx, 'office', DESK);
    const tid = (await screenDoc(p)).trailers.find(x => x.truck === '23N').id;
    // a change that would make a document too big is refused, shown, and taken back on screen
    const w0 = (await writes(p)).length;
    await act(p, 'patchTrailer', tid, { notes: 'x'.repeat(250000) });
    await p.waitForTimeout(300);
    let s = await text(p);
    t.ok(has(s, 'too big for the shared data') && has(s, 'NOT saved'), 'a 250 KB note is refused with a plain message');
    t.ok((await writes(p)).slice(w0).every(w => w.bytes <= LIMIT) && (await dump(p))['trailers/' + tid].notes !== 'x'.repeat(250000), 'nothing over 240 KB reaches the database');
    t.ok((await screenDoc(p)).trailers.find(x => x.id === tid).notes.length < 1000, 'the screen goes back to what is really saved');
    await h.check(p, 'sync-too-big-1400');
    // a list that grows too big keeps its newest items
    for (let k = 0; k < 6; k++) await p.evaluate(k => window.__zz.actions.sendDockChat('office', 'Long note ' + k + ' ' + 'y'.repeat(45000)), k);
    await p.evaluate(() => window.__zz.h.sync.flush(8000));
    await p.waitForTimeout(400);
    const chat = (await dump(p))['portal/chat'];
    const cb = Buffer.byteLength(JSON.stringify(chat));
    t.ok(cb <= LIMIT && chat.items.some(x => /^Long note 5 /.test(x.text)), 'a chat list over 240 KB drops its oldest messages and keeps the newest (' + cb + ' bytes)');
    // unavailable: one quiet retry
    await p.evaluate(() => window.__mockdb.failNext('unavailable', 1));
    await act(p, 'zzConfirm', tid);
    t.ok(!!(await dump(p))['trailers/' + tid].confirmedAt && !has(await text(p), 'NOT saved to the shared data'), 'unavailable: retried once, saved, no banner');
    // resource_exhausted: backs off and tries again (3 tries at most)
    await p.evaluate(() => window.__mockdb.failNext('resource_exhausted', 2));
    await act(p, 'patchTrailer', tid, { driver: 'Backoff Test' });
    t.eq((await dump(p))['trailers/' + tid].driver, 'Backoff Test', 'resource_exhausted twice: backed off, third try saved');
    await p.evaluate(() => window.__mockdb.failNext('resource_exhausted', 3));
    await act(p, 'patchTrailer', tid, { driver: 'Never Saved' });
    await p.waitForTimeout(300);
    t.ok((await dump(p))['trailers/' + tid].driver === 'Backoff Test' && has(await text(p), 'NOT saved to the shared data') && (await screenDoc(p)).trailers.find(x => x.id === tid).driver === 'Backoff Test',
      'resource_exhausted three times: not saved, the banner says so, the screen goes back');
    // quota_exceeded: the message
    await p.evaluate(() => window.__mockdb.failNext('quota_exceeded', 1));
    await act(p, 'patchTrailer', tid, { driver: 'Quota Test' });
    await p.waitForTimeout(300);
    s = await text(p);
    t.ok(has(s, 'The shared data is full') && (await dump(p))['trailers/' + tid].driver === 'Backoff Test', 'quota_exceeded: "The shared data is full ... NOT saved"');
    await h.check(p, 'sync-quota-1400');
    // a good save clears the banner
    await act(p, 'patchTrailer', tid, { driver: 'Good Again' });
    t.ok(!has(await text(p), 'The shared data is full') && (await dump(p))['trailers/' + tid].driver === 'Good Again', 'the next good save clears the banner');
    // invalid_argument: read-only for the rest of the visit
    await p.evaluate(() => window.__mockdb.failNext('invalid_argument', 1));
    await act(p, 'patchTrailer', tid, { driver: 'Refused' });
    await p.waitForTimeout(300);
    s = await text(p);
    t.ok(has(s, 'You can look but not change shared data.'), 'invalid_argument: banner "You can look but not change shared data."');
    t.ok(has(await badge(p), 'look only'), 'the badge says look only');
    const n0 = (await writes(p)).length;
    await act(p, 'patchTrailer', tid, { driver: 'Refused Again' });
    await p.waitForTimeout(300);
    t.ok((await writes(p)).length === n0 && (await screenDoc(p)).trailers.find(x => x.id === tid).driver === 'Good Again', 'later changes are refused at once, nothing is written, the screen keeps the saved value');
    t.ok(has(await text(p), 'You can look but not change shared data.'), 'and the banner stays');
    await h.check(p, 'sync-read-only-1400');
    await p.setViewportSize(PHONE);
    await h.check(p, 'sync-read-only-390');
    t.ok((await p.evaluate(() => window.__mockdb.writes)).every(w => w.bytes <= LIMIT), 'no write over 240 KB in this whole section');
    await ctx.close();
  }
  {
    // a viewer the server refuses (staff by can(), but every write rejects invalid_argument)
    const ctx = await shared(h, { isOwner: false, canEdit: false, can: true, canWrite: false, seed: DUMP });
    const p = await staff(h, ctx, 'crew', PHONE);
    const tid = (await screenDoc(p)).trailers[0].id;
    await act(p, 'patchTrailer', tid, { notes: 'Should not stick' });
    await p.waitForTimeout(300);
    t.ok(has(await text(p), 'You can look but not change shared data.') && (await writes(p)).length === 0, 'a login the database refuses: read-only banner, nothing written');
    t.ok((await screenDoc(p)).trailers[0].notes !== 'Should not stick', 'the crew screen goes back to the shared value');
    await h.check(p, 'sync-crew-read-only-390');
    await ctx.close();
  }

  /* ================= 7. offline while working, and access withdrawn ================= */
  t.section('connection drops: look-only after 20 s (test: 1.5 s), back when it reconnects; access withdrawn');
  {
    const ctx = await shared(h, { seed: DUMP }, { offlineMs: 1500 });
    const p = await staff(h, ctx, 'office', DESK);
    const tid = (await screenDoc(p)).trailers.find(x => x.truck === '23N').id;
    await p.evaluate(() => window.__mockdb.setOffline(true));
    await p.waitForFunction(() => window.__zz.h.sync.mode === 'db-offline', null, { timeout: 6000 });
    t.ok(has(await badge(p), 'Shared data offline · look only') && has(await text(p), 'Shared data is offline right now'), 'offline: badge "Shared data offline · look only" and the banner');
    const n0 = (await writes(p)).length;
    await act(p, 'patchTrailer', tid, { driver: 'Offline Edit' });
    await p.waitForTimeout(300);
    t.ok((await writes(p)).length === n0 && (await screenDoc(p)).trailers.find(x => x.id === tid).driver !== 'Offline Edit', 'a change while offline is refused and taken back (nothing is saved on this device either)');
    t.ok(!(await h.readDoc(p)), 'nothing was written to this device\'s own storage');
    await h.check(p, 'sync-offline-1400');
    await p.evaluate(() => window.__mockdb.setOffline(false));
    await p.waitForFunction(() => window.__zz.h.sync.mode === 'db', null, { timeout: 6000 });
    await p.waitForTimeout(250);
    t.ok(has(await badge(p), 'Live · shared') && !has(await text(p), 'Shared data is offline right now'), 'reconnected: "Live · shared" again and the banner is gone');
    await act(p, 'patchTrailer', tid, { driver: 'Back Online' });
    t.eq((await dump(p))['trailers/' + tid].driver, 'Back Online', 'changes save again');
    await p.evaluate(() => window.__mockdb.killListeners('revoked'));
    await p.waitForFunction(() => window.__zz.h.sync.mode === 'db-offline', null, { timeout: 4000 });
    await p.waitForTimeout(200);
    t.ok(has(await text(p), 'Shared data was switched off for this login'), 'access withdrawn (revoked): look-only with a plain message');
    await ctx.close();
  }

  /* ================= 8. photos ================= */
  t.section('photos in shared mode');
  {
    const ctx = await shared(h, { seed: DUMP });
    const a = await staff(h, ctx, 'office', DESK);
    const sid = (await screenDoc(a)).shipments.find(s => s.ref === 'PL-3301').id;
    await a.getByText('PL-3301').first().click();
    await a.waitForTimeout(300);
    await a.getByRole('button', { name: /^Photos/ }).first().click();
    await a.waitForTimeout(200);
    await a.locator('input[type=file]').first().setInputFiles(h.UPLOAD_PNG);
    await a.waitForFunction(() => document.querySelectorAll('img[src^="data:image"]').length > 0, null, { timeout: 5000 });
    await a.waitForTimeout(400);
    let srv = await dump(a);
    const pdocs = Object.keys(srv).filter(k => k.startsWith('photos/' + sid + '/items/'));
    t.ok(pdocs.length === 1 && /^data:image\//.test(srv[pdocs[0]].src) && srv[pdocs[0]].at, 'a photo taken in shared mode is one document: photos/<owner>/items/<id> {src, at}');
    t.ok(!Object.keys(srv).some(k => k.startsWith('cdweb')) && !(await a.evaluate(() => Object.keys(localStorage).some(k => k.startsWith('cdweb:cd6:photos:')))), 'it is not kept in this device\'s storage');
    await h.check(a, 'sync-photo-taken-1400');
    // the other device opens the same load afterwards
    const b = await staff(h, ctx, 'office', PHONE);
    await b.getByText('PL-3301').first().click();
    await b.waitForTimeout(300);
    await b.getByRole('button', { name: /^Photos/ }).first().click();
    await b.waitForFunction(() => document.querySelectorAll('img[src^="data:image"]').length > 0, null, { timeout: 5000 });
    t.ok(true, 'the photo appears on the other device when it opens the load');
    await h.check(b, 'sync-photo-other-device-390');
    // two devices adding a photo to the same load at the same moment: neither removes the other's
    const race = await (async () => {
      const src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
      const seenByA = await a.evaluate(() => window.__zz.h.photos.ls('row:race'));
      await b.evaluate(src => window.__zz.h.photos.ex('row:race', [{ id: 'pb', src, at: new Date().toISOString() }]), src);
      await a.evaluate(([list, src]) => window.__zz.h.photos.ex('row:race', [...list, { id: 'pa', src, at: new Date().toISOString() }]), [seenByA, src]);
      return Object.keys(await dump(a)).filter(k => k.startsWith('photos/row:race/items/')).sort();
    })();
    t.eq(race, ['photos/row:race/items/pa', 'photos/row:race/items/pb'], 'two devices adding photos to one load at the same moment: both photos are kept');
    // owner keys with odd characters still make a valid path; deleting removes the document
    const r = await a.evaluate(async () => {
      const P = window.__zz.h.photos, src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
      await P.ex('sec:t 1/x#y:nose', [{ id: 'p1', src, at: new Date().toISOString() }, { id: 'p2', src, at: new Date(Date.now() + 1000).toISOString() }]);
      const back = await P.ls('sec:t 1/x#y:nose');
      const keys = Object.keys(await window.__mockdb.dump()).filter(k => k.startsWith('photos/sec:t'));
      await P.ex('sec:t 1/x#y:nose', [{ id: 'p2', src, at: back[1].at }]);
      const after = Object.keys(await window.__mockdb.dump()).filter(k => k.startsWith('photos/sec:t'));
      return { n: back.length, keys, after };
    });
    t.ok(r.n === 2 && r.keys.length === 2 && r.keys.every(k => /^photos\/[A-Za-z0-9_.:@+~-]+\/items\/p[12]$/.test(k)), 'an owner key with spaces, "/" and "#" is encoded into one safe path segment (' + (r.keys[0] || '') + ')');
    t.ok(r.after.length === 1 && /\/p2$/.test(r.after[0]), 'removing a photo deletes its document');
    // a big photo is re-encoded at 700 px before it is stored
    const big = await a.evaluate(async () => {
      const c = document.createElement('canvas'); c.width = 1800; c.height = 1350;
      const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 1800, 1350); gr.addColorStop(0, '#d97706'); gr.addColorStop(1, '#0f172a'); g.fillStyle = gr; g.fillRect(0, 0, 1800, 1350);
      const img = g.getImageData(0, 0, 1800, 1350); for (let k = 0; k < img.data.length; k += 4) { const n = (Math.random() * 60) | 0; img.data[k] += n; img.data[k + 1] += n; img.data[k + 2] += n; } g.putImageData(img, 0, 0);
      const src = c.toDataURL('image/jpeg', 0.95);
      await window.__zz.h.photos.ex('dmg:bigtest', [{ id: 'b1', src, at: new Date().toISOString() }]);
      const doc = (await window.__mockdb.dump())['photos/dmg:bigtest/items/b1'];
      const w = await new Promise(r => { const im = new Image(); im.onload = () => r(Math.max(im.width, im.height)); im.onerror = () => r(-1); im.src = doc.src; });
      return { before: src.length, after: doc.src.length, w };
    });
    t.ok(big.before > 200000 && big.after <= 200000 && big.w === 700, 'a ' + Math.round(big.before / 1000) + ' KB photo is re-encoded at 700 px (' + Math.round(big.after / 1000) + ' KB) before it is stored');
    t.ok((await writes(a)).concat(await writes(b)).every(w => w.bytes <= LIMIT), 'no photo write over 240 KB');
    await ctx.close();
  }
  {
    // with the assets capability, photos are stored as files and the document keeps the asset id
    const ctx = await shared(h, { caps: ['db', 'user', 'assets'], seed: DUMP });
    const a = await staff(h, ctx, 'office', DESK);
    const r = await a.evaluate(async () => {
      const src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
      await window.__zz.h.photos.ex('row:assettest', [{ id: 'a1', src, at: new Date().toISOString() }]);
      const d = (await window.__mockdb.dump())['photos/row:assettest/items/a1'];
      const back = await window.__zz.h.photos.ls('row:assettest');
      return { d, back, n: window.__mockdb.stats().assets };
    });
    t.ok(r.d && /^[0-9a-f]{32}$/.test(r.d.assetId) && !r.d.src && r.n === 1, 'with assets: the photo is uploaded as a file and the document stores only its asset id');
    t.ok(r.back.length === 1 && r.back[0].src === '/_blob/' + r.d.assetId, 'reading it back gives the /_blob/<id> address to show');
    await ctx.close();
  }

  /* ================= 9. the interface promises ================= */
  t.section('fresh() throws, read() is a copy, seed() returns the shared data');
  {
    const ctx = await shared(h, { seed: DUMP });
    const p = await staff(h, ctx, 'office', DESK);
    const r = await p.evaluate(async () => {
      const s = window.__zz.h.sync;
      let threw = false; try { s.fresh(); } catch (e) { threw = true; }
      const d1 = s.read(); d1.trailers.length = 0; d1.customers[0].name = 'Changed In A Copy';
      const d2 = s.read(), sd = await s.seed();
      return { threw, n: d2.trailers.length, name: d2.customers[0].name, seed: sd && sd.customers.length, lease: await s.lease('doors', () => 7) };
    });
    t.ok(r.threw, 'fresh() throws in shared mode (bQ can never write a demo over shared data)');
    t.ok(r.n > 0 && r.name !== 'Changed In A Copy', 'read() hands out a copy: changing it changes nothing');
    t.ok(r.seed === 17 && r.lease === 7, 'seed() returns the shared data; lease() runs the function');
    t.eq((await writes(p)).length, 0, 'none of that wrote anything');
    await ctx.close();
  }

  /* ================= 9b. Nick's "Clear demo data" on shared data ================= */
  t.section('Setup > Clear demo data works on shared data and reaches the other device');
  {
    const ctx = await shared(h, { seed: DUMP });
    const a = await staff(h, ctx, 'office', DESK);
    const b = await staff(h, ctx, 'crew', PHONE);
    await act(a, 'clearDemoData');
    await a.evaluate(() => window.__zz.h.sync.flush(15000));
    const srv = await dump(a);
    const left = Object.keys(srv).filter(k => /^(customers|trailers|shipments|invoices|accountChat)\//.test(k));
    t.ok(left.length === 0 && srv['portal/meta'].demoCleared === true && srv['portal/chat'].items.length === 0, 'every demo truck, load, account and chat is removed from the shared data; portal/meta says demoCleared');
    t.ok(srv['portal/meta'].settings && srv['portal/meta'].settings.admins.length && srv['portal/meta'].rates.std === 3, 'rate card, logins and settings stay');
    await b.waitForFunction(() => window.__zz.doc.trailers.length === 0 && window.__zz.doc.customers.length === 0, null, { timeout: 4000 });
    t.ok(true, 'the crew phone shows the empty dock');
    t.ok((await writes(a)).every(w => w.bytes <= LIMIT) && (await a.evaluate(() => window.__mockdb.overlaps.length)) === 0, 'no write over 240 KB, never two at once to one document');
    await h.check(b, 'sync-cleared-crew-390');
    await ctx.close();
  }

  /* ================= 10. the Setup card and the owner's import ================= */
  t.section('shared-data card and "Move this computer\'s data into the shared database"');
  {
    const local = JSON.parse(JSON.stringify(BASE));
    local.customers = local.customers.filter(c => !/^cu_\d{3}$/.test(c.id)).slice(0, 12);
    local.trailers.push({ ...local.trailers[0], id: 'tImport1', truck: 'IMP-1', trailer: 'IMP', stage: 'scheduled', dock: null, arrivedAt: null, dockedAt: null, workStartedAt: null, scheduledAt: iso(Date.now() + 5 * HOUR), customerId: 'cu_altex' });
    local.chat.push({ id: 'chImport', from: 'office', who: 'Office', text: 'Imported chat line', at: iso(Date.now()) });
    const ctx = await shared(h, { seed: DUMP }, { seed: local });
    const p = await staff(h, ctx, 'office', DESK);
    // A-only builds have no Setup card host (stream E renders it), so mount it on its own under the board
    await mountCard(p);
    let card = await p.locator('[data-zz="sync-card"]').innerText();
    t.ok(has(card, 'Shared data') && has(card, 'Live · shared') && has(card, 'Records in the shared data') && has(card, 'of 25,000 allowed') && has(card, 'All saved'),
      'card: mode, record count of 25,000, "All saved"');
    t.ok(has(card, "Move this computer's data into the shared database") && has(card, 'This computer has ' + local.trailers.length + ' trucks'), 'the owner sees the move button and what this computer has');
    await p.locator('[data-zz="sync-card"]').scrollIntoViewIfNeeded();
    await p.locator('[data-zz="sync-card"]').locator('xpath=..').screenshot({ path: require('path').join(h.SHOTS, h.prefix + '-sync-card-1400.png') });
    await p.getByRole('button', { name: "Move this computer's data…" }).click();
    card = await p.locator('[data-zz="sync-card"]').innerText();
    t.ok(has(card, "Replace the shared data with this computer's copy?"), 'it asks before replacing anything');
    await p.locator('[data-zz="sync-card"]').locator('xpath=..').screenshot({ path: require('path').join(h.SHOTS, h.prefix + '-sync-card-confirm-1400.png') });
    await p.getByRole('button', { name: 'Yes, replace the shared data' }).click();
    await p.waitForFunction(() => /Done\. The shared data now has/.test(document.querySelector('[data-zz="sync-card"]').innerText), null, { timeout: 20000 });
    card = await p.locator('[data-zz="sync-card"]').innerText();
    t.ok(has(card, "Done. The shared data now has this computer's " + local.trailers.length + ' trucks, ' + local.shipments.length + ' loads and ' + local.customers.length + ' accounts.'),
      'progress ends with what the shared data now has, in plain words ("Done. The shared data now has this computer\'s N trucks, N loads and N accounts.")');
    t.ok(!has(card, 'is the demo'), 'a real copy (no numbered sample accounts) gets no demo warning');
    const srv = await dump(p);
    t.ok(Object.keys(srv).filter(k => k.startsWith('customers/')).length === local.customers.length && srv['trailers/tImport1'] && srv['portal/chat'].items.some(x => x.id === 'chImport'),
      'the shared data now matches this computer (accounts, the extra truck, the chat line)');
    await p.waitForFunction(() => window.__zz.doc.trailers.some(x => x.id === 'tImport1'), null, { timeout: 3000 });
    t.ok(true, 'the board shows the moved data');
    t.ok((await p.evaluate(() => window.__mockdb.stats().maxInflight)) <= 4 && (await p.evaluate(() => window.__mockdb.overlaps.length)) === 0, 'the move was throttled: at most 4 writes at once, one at a time per document');
    t.ok((await writes(p)).every(w => w.bytes <= LIMIT), 'no write over 240 KB');
    await p.locator('[data-zz="sync-card"]').locator('xpath=..').screenshot({ path: require('path').join(h.SHOTS, h.prefix + '-sync-card-done-1400.png') });
    await p.setViewportSize(PHONE);
    await h.check(p, 'sync-card-390', { full: true });
    await p.locator('[data-zz="sync-card"]').locator('xpath=..').screenshot({ path: require('path').join(h.SHOTS, h.prefix + '-sync-card-done-390.png') });
    await ctx.close();
  }
  {
    // a non-owner sees the card without the button; local mode explains what shared data is
    const ctx = await shared(h, { isOwner: false, canEdit: true, seed: DUMP });
    const p = await staff(h, ctx, 'office', PHONE);
    await mountCard(p);
    const card = await p.locator('[data-zz="sync-card"]').innerText();
    t.ok(!has(card, "Move this computer's data…") && has(card, 'Only the owner can move'), 'an editor who is not the owner sees no move button');
    await ctx.close();
    const lp = await h.openAs('office', { viewport: PHONE });
    await ready(lp);
    await mountCard(lp);
    const lc = await lp.locator('[data-zz="sync-card"]').innerText();
    t.ok(has(lc, 'This device only') && has(lc, 'keeps its data on this device only') && !has(lc, 'Records in the shared data'), 'local mode: "This device only" and a plain explanation');
    await h.check(lp, 'sync-card-local-390', { full: true });
    await lp.locator('[data-zz="sync-card"]').locator('xpath=..').screenshot({ path: require('path').join(h.SHOTS, h.prefix + '-sync-card-local-390.png') });
    await lp.context().close();
  }
});
