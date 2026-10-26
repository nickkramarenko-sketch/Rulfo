/* Stream A1, edge cases found in review (PLAN.md 1.6, 2.8, 3.A "Shared mode"):
     node website/portal/test/run.js a-sync [--dist DIR]      (runs a-sync.test.js and this file)
   - a refused save tells the kiosk "not saved" (cd6:sync kind "doc"), so a driver is never told "checked in" for nothing
   - a photo read that fails never lets the next save delete photos the screen could not show
   - a refused part of an action keeps its banner even when the action's activity line was saved
   - listeners keep trying for the whole visit; startup timing; look-only and "NOT saved" survive an offline spell
   - a doors lease left behind by a dead device does not block check-in; revoked while waiting; the demo warning on the card
   Shared-mode pages load test/mock-db.js; pages in one browser context share the mock database (two pages = two devices). */
const H = require('./harness');
const { PHONE, DESK, TABLET } = H;
const LIMIT = 240000;
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function ready(p) { await p.waitForFunction(() => window.__zz && window.__zz.actions && window.__zz.h, null, { timeout: 15000 }); }
const dump = p => p.evaluate(() => window.__mockdb.dump());
const writes = p => p.evaluate(() => window.__mockdb.writes.map(w => ({ op: w.op, path: w.path, bytes: w.bytes })));
const mode = p => p.evaluate(() => window.__zz.h.sync.mode);
const badge = p => p.evaluate(() => { const b = document.querySelector('[data-zz="mode"]'); return b ? b.innerText : ''; });
const top = p => p.evaluate(() => document.getElementById('root').innerText.split('\n').slice(0, 4).join(' | '));
const has = (s, x) => s.includes(x);
async function shared(h, mock, o = {}) {
  const ctx = await h.newContext({ viewport: o.viewport || DESK, mode: 'shared', mock: mock || {}, ...(o.seed ? { seed: o.seed } : {}) });
  const knobs = [];
  if (o.offlineMs) knobs.push('window.__ZZSYNC_OFFLINE_MS = ' + o.offlineMs + ';');
  if (o.retryMs) knobs.push('window.__ZZSYNC_RETRY_MS = ' + o.retryMs + ';');
  if (knobs.length) await ctx.addInitScript(knobs.join(' '));
  return ctx;
}
async function staff(h, ctx, role, viewport) {
  for (const pg of ctx.pages()) { try { await pg.evaluate(() => localStorage.removeItem('cd6:session')); break; } catch (e) {} }
  const p = await h.open('#' + role, { context: ctx, viewport: viewport || DESK });
  await h.signIn(p, role);
  await ready(p);
  if (role === 'crew' && await p.getByRole('button', { name: 'Got it' }).count()) await p.getByRole('button', { name: 'Got it' }).click();
  return p;
}
/* collect cd6:sync events on the page */
const listen = p => p.evaluate(() => { window.__ev = []; window.addEventListener('cd6:sync', e => window.__ev.push({ kind: e.detail && e.detail.kind, text: (e.detail && e.detail.text) || '' })); });
const events = p => p.evaluate(() => window.__ev.slice());
async function keypad(p, digits) { for (const d of digits) { await p.click(`.zzk-keys button[data-k="${d}"]`); await p.waitForTimeout(40); } await p.waitForTimeout(150); }

H.main('a-sync-edge', async (h, t) => {
  /* one shared database after the owner's first visit, reused as the server copy */
  let DUMP;
  {
    const ctx = await shared(h, {});
    const a = await staff(h, ctx, 'office');
    await a.evaluate(() => window.__zz.h.sync.flush(15000));
    DUMP = await dump(a);
    await ctx.close();
  }
  const someScheduled = Object.keys(DUMP).find(k => k.startsWith('trailers/') && DUMP[k].stage === 'scheduled' && !DUMP[k].arrivedAt);
  DUMP[someScheduled] = { ...DUMP[someScheduled], code: '4821', scheduledAt: new Date(Date.now() - 20 * 6e4).toISOString() };
  const SCHED = DUMP[someScheduled].id;

  /* ================= 1. a refused save is reported as a failed save ================= */
  t.section('a refused save raises cd6:sync kind "doc" (the kiosk then says "go to the office", never "checked in")');
  {
    const ctx = await shared(h, { seed: DUMP }, { offlineMs: 800 });
    const p = await staff(h, ctx, 'office');
    await listen(p);
    await p.evaluate(() => window.__mockdb.setOffline(true));
    await p.waitForFunction(() => window.__zz.h.sync.mode === 'db-offline', null, { timeout: 5000 });
    let ev = await events(p);
    t.ok(ev.length && ev.every(e => e.kind !== 'doc') && ev.some(e => e.kind === 'net'), 'going offline alone is a connection notice (kind "net"), not a failed save');
    const r = await p.evaluate(async id => { const r = await window.__zz.actions.zzKioskIn(id, { driver: 'Offline' }); await new Promise(z => setTimeout(z, 100)); return r; }, SCHED);
    ev = await events(p);
    t.ok(ev.some(e => e.kind === 'doc' && /offline/.test(e.text)), 'a check-in refused while offline raises kind "doc" with the offline text (' + JSON.stringify(ev[ev.length - 1]) + ')');
    t.ok(!(await dump(p))['trailers/' + SCHED].arrivedAt, 'nothing was saved');
    void r;
    await p.evaluate(() => window.__mockdb.setOffline(false));
    await ctx.close();
  }
  {
    const ctx = await shared(h, { seed: DUMP, isOwner: false, canEdit: false, can: true, canWrite: false });
    const p = await staff(h, ctx, 'office');
    await listen(p);
    await p.evaluate(async id => { await window.__zz.actions.zzKioskIn(id, { driver: 'Refused' }); await window.__zz.h.sync.flush(3000); await new Promise(z => setTimeout(z, 200)); }, SCHED);
    let ev = await events(p);
    t.ok(ev.some(e => e.kind === 'doc' && has(e.text, 'You can look but not change shared data.')), 'a check-in the database refuses (look-only login) raises kind "doc"');
    await p.evaluate(async id => { await window.__zz.actions.patchTrailer(id, { driver: 'Again' }); await new Promise(z => setTimeout(z, 200)); }, SCHED);
    ev = await events(p);
    t.ok(ev.filter(e => e.kind === 'doc').length >= 2, 'and every later refused change does too');
    await ctx.close();
  }
  {
    // the real kiosk screen, when the build has the new kiosk (stream C)
    const ctx = await shared(h, { seed: DUMP }, { offlineMs: 800, viewport: TABLET });
    const p = await h.open('#stations', { context: ctx, viewport: TABLET });
    await p.getByText('Open driver check-in').click();
    await p.waitForTimeout(300);
    if (await p.$('[data-zz=kiosk] button[data-lang="en"]')) {
      await p.click('button[data-lang="en"]');
      await p.getByText('I have a 4‑digit code').click();
      await keypad(p, '4821');
      await p.getByRole('button', { name: /^Next/ }).click();
      await p.evaluate(() => window.__mockdb.setOffline(true));
      await p.waitForFunction(() => window.__zz.h.sync.mode === 'db-offline', null, { timeout: 5000 });
      await p.getByRole('button', { name: /Skip — give papers to the office/ }).click();
      await p.waitForTimeout(1200);
      const s = await p.evaluate(() => document.querySelector('[data-zz=kiosk]').innerText);
      t.ok(!(await p.$('[data-zz=kiosk-done]')) && has(s, 'We could not save your check-in') && !has(s, "You're checked in"), 'kiosk while shared data is offline: "We could not save your check-in. Please go to the office." (never "You\'re checked in!")');
      await h.check(p, 'sync-edge-kiosk-offline-1024');
      await p.setViewportSize(PHONE);
      await h.check(p, 'sync-edge-kiosk-offline-390');
    } else t.ok(true, '(this build has the old kiosk only; the event checks above cover it)');
    await ctx.close();
  }

  /* ================= 2. photos: a failed read never leads to deleting photos ================= */
  t.section('a photo read that fails, then a new photo: the photos the screen could not show stay');
  {
    const ctx = await shared(h, { seed: DUMP });
    const p = await staff(h, ctx, 'office');
    const r = await p.evaluate(async src => {
      const P = window.__zz.h.photos, M = window.__mockdb, now = new Date().toISOString();
      await P.ex('row:keep', [{ id: 'k1', src, at: now }, { id: 'k2', src, at: now }]);
      const first = await P.ls('row:keep');             // the screen shows k1, k2
      M.failNext('unavailable', 2, 'get');               // the next read fails (and its one retry)
      const failed = await P.ls('row:keep');            // -> no photos on screen
      await P.ex('row:keep', [...failed, { id: 'k3', src, at: now }]);   // someone adds a photo there
      const left = Object.keys(await M.dump()).filter(k => k.startsWith('photos/row:keep/items/')).sort();
      M.failNext('unavailable', 1, 'get');               // one failed read is retried quietly
      const again = await P.ls('row:keep');
      return { first: first.length, failed: failed.length, left, again: again.length };
    }, PNG);
    t.ok(r.first === 2 && r.failed === 0, '(the read failed: the screen showed no photos)');
    t.eq(r.left, ['photos/row:keep/items/k1', 'photos/row:keep/items/k2', 'photos/row:keep/items/k3'], 'adding a photo after a failed read keeps the two photos the screen could not show');
    t.eq(r.again, 3, 'one failed read is retried quietly and shows all three photos');
    const r2 = await p.evaluate(async src => {
      const P = window.__zz.h.photos, M = window.__mockdb;
      const list = await P.ls('row:keep');
      await P.ex('row:keep', list.filter(x => x.id !== 'k2'));   // delete one the screen did show
      return Object.keys(await M.dump()).filter(k => k.startsWith('photos/row:keep/items/')).sort();
    }, PNG);
    t.eq(r2, ['photos/row:keep/items/k1', 'photos/row:keep/items/k3'], 'deleting a photo the screen showed still removes it');
    await ctx.close();
  }

  /* ================= 3. the banner of a refused part stays ================= */
  t.section('a refused part of an action keeps its banner, even when the activity line of the same action is saved');
  {
    const ctx = await shared(h, { seed: DUMP });
    const p = await staff(h, ctx, 'office');
    const before = (await dump(p))['portal/meta'].settings.promiseText;
    const w0 = (await writes(p)).length;
    await p.evaluate(async () => { await window.__zz.actions.zzSettings({ promiseText: 'y'.repeat(250000) }); await window.__zz.h.sync.flush(5000); await new Promise(z => setTimeout(z, 300)); });
    const w = (await writes(p)).slice(w0);
    t.ok(w.some(x => x.path === 'portal/activity') && !w.some(x => x.path === 'portal/meta'), '(the activity line was saved, the 250 KB setting was not)');
    t.ok(has(await top(p), 'too big for the shared data') && has(await top(p), 'NOT saved'), 'the banner still says the change was too big and NOT saved');
    t.ok((await dump(p))['portal/meta'].settings.promiseText === before && ((await p.evaluate(() => window.__zz.doc.settings.promiseText)) || '').length < 1000, 'the shared data and the screen keep the old setting');
    await h.check(p, 'sync-edge-too-big-setting-1400');
    await p.setViewportSize(PHONE);
    await h.check(p, 'sync-edge-too-big-setting-390');
    await p.evaluate(async () => { await window.__zz.actions.zzSettings({ promiseText: 'Unloaded within 2 hours of check-in' }); await window.__zz.h.sync.flush(5000); await new Promise(z => setTimeout(z, 300)); });
    t.ok(!has(await top(p), 'NOT saved'), 'the next good change clears the banner');
    t.ok((await writes(p)).every(x => x.bytes <= LIMIT), 'no write over 240 KB');
    await ctx.close();
  }

  /* ================= 4. listeners keep trying; startup timing ================= */
  t.section('the connection bridge stops for a long time: the page keeps trying and comes back by itself');
  {
    const ctx = await shared(h, { seed: DUMP }, { offlineMs: 800, retryMs: 40 });
    const p = await staff(h, ctx, 'office');
    await p.evaluate(() => { window.__mockdb.failNext('unavailable', 120, 'listen'); window.__mockdb.killListeners('unavailable'); });
    await p.waitForFunction(() => window.__zz.h.sync.mode === 'db-offline', null, { timeout: 5000 });
    t.ok(has(await badge(p), 'Shared data offline'), 'every listener ended and 120 fresh ones failed: look only meanwhile');
    await p.waitForFunction(() => window.__zz.h.sync.mode === 'db' && window.__mockdb.listeners() === 8, null, { timeout: 30000 });
    t.ok(has(await badge(p), 'Live · shared') && !has(await top(p), 'offline'), 'after more than 15 failed tries per listener it still came back: "Live · shared", 8 listeners, no banner');
    await ctx.close();
  }
  {
    // the 20 s without a server answer count from when the listeners start, not from when the page asked for db / user
    const ctx = await shared(h, { seed: DUMP, useDelay: 3000, serverDelay: 600 }, { offlineMs: 1500 });
    await ctx.addInitScript('window.__modes = []; window.addEventListener("cd6:mode", e => window.__modes.push(e.detail && e.detail.mode));');
    const t0 = Date.now();
    const p = await staff(h, ctx, 'office');
    const ms = Date.now() - t0;
    t.ok(await mode(p) === 'db' && !(await p.evaluate(() => window.__modes)).includes('db-offline'),
      'slow answers from claude.use() (3 s) do not use up the offline wait: the page goes straight to live, never look-only (' + (await p.evaluate(() => window.__modes)).join(' > ') + ')');
    t.ok(ms < 5800, 'db and user are asked for at the same time: the page opened ' + ms + ' ms after load (asking one after the other takes more than 6.6 s)');
    await ctx.close();
  }

  /* ================= 5. offline spells: what was not saved, and look-only, stay visible ================= */
  t.section('after an offline spell: a change lost on the way says NOT saved again; look-only stays');
  {
    const ctx = await shared(h, { seed: DUMP, writeDelay: 400 }, { offlineMs: 1000 });
    const p = await staff(h, ctx, 'office');
    const tid = await p.evaluate(() => window.__zz.doc.trailers[0].id);
    const was = (await dump(p))['trailers/' + tid].driver;
    await p.evaluate(id => { window.__zz.actions.patchTrailer(id, { driver: 'On The Way' }); }, tid);
    await p.waitForTimeout(80);
    await p.evaluate(() => window.__mockdb.setOffline(true));
    await p.waitForFunction(() => window.__zz.h.sync.mode === 'db-offline', null, { timeout: 5000 });
    await p.waitForTimeout(1500);
    t.ok(has(await badge(p), 'Shared data offline · look only'), 'offline: "Shared data offline · look only"');
    await p.evaluate(() => window.__mockdb.setOffline(false));
    await p.waitForFunction(() => window.__zz.h.sync.mode === 'db', null, { timeout: 6000 });
    await p.waitForTimeout(300);
    t.ok(has(await top(p), 'Your last change was NOT saved to the shared data'), 'back online: "Your last change was NOT saved to the shared data. Please try again." (the change that was on its way)');
    t.ok((await p.evaluate(id => window.__zz.doc.trailers.find(x => x.id === id).driver, tid)) === was && (await dump(p))['trailers/' + tid].driver === was, 'the screen shows what is really saved');
    await h.check(p, 'sync-edge-not-saved-after-offline-1400');
    await p.evaluate(async id => { await window.__zz.actions.patchTrailer(id, { driver: 'Saved Now' }); await window.__zz.h.sync.flush(5000); await new Promise(z => setTimeout(z, 200)); }, tid);
    t.ok(!has(await top(p), 'NOT saved') && (await dump(p))['trailers/' + tid].driver === 'Saved Now', 'trying again saves it and clears the banner');
    await ctx.close();
  }
  {
    const ctx = await shared(h, { seed: DUMP }, { offlineMs: 800, viewport: PHONE });
    const p = await staff(h, ctx, 'crew', PHONE);
    const tid = await p.evaluate(() => window.__zz.doc.trailers[0].id);
    await p.evaluate(() => window.__mockdb.failNext('invalid_argument', 1));
    await p.evaluate(async id => { await window.__zz.actions.patchTrailer(id, { notes: 'x' }); await window.__zz.h.sync.flush(3000); await new Promise(z => setTimeout(z, 200)); }, tid);
    t.ok(has(await badge(p), 'look only') && has(await top(p), 'You can look but not change shared data.'), '(look only after invalid_argument)');
    await p.evaluate(() => window.__mockdb.setOffline(true));
    await p.waitForFunction(() => window.__zz.h.sync.mode === 'db-offline', null, { timeout: 5000 });
    await p.evaluate(() => window.__mockdb.setOffline(false));
    await p.waitForFunction(() => window.__zz.h.sync.mode === 'db', null, { timeout: 6000 });
    await p.waitForTimeout(200);
    t.ok(has(await badge(p), 'Live · shared · look only') && has(await top(p), 'You can look but not change shared data.'), 'back online, still look only: the badge and the banner say so again');
    await h.check(p, 'sync-edge-look-only-after-offline-390');
    await ctx.close();
  }

  /* ================= 6. a doors lease left behind ================= */
  t.section('a device that died holding the doors lease does not block check-in');
  {
    const ctx = await shared(h, { seed: DUMP });
    const p = await staff(h, ctx, 'office');
    const d = await p.evaluate(() => window.__zz.doc);
    const leaving = d.trailers.find(x => x.stage === 'at-dock' && x.dock && x.dock !== 'YD');
    await p.evaluate(async id => { await window.__zz.actions.patchTrailer(id, { stage: 'departed', dock: null, departedAt: new Date().toISOString() }); await window.__zz.h.sync.flush(3000); }, leaving.id);
    await p.evaluate(() => window.claude.use('db').then(db => db.doc('locks/doors').acquire({ holder: 'dead-tablet', ttlMs: 60000 })));
    const t0 = Date.now();
    const r = await p.evaluate(id => window.__zz.actions.zzKioskIn(id, { driver: 'After The Dead Tablet' }), SCHED);
    const ms = Date.now() - t0;
    t.ok(r && r.dock === leaving.dock && ms < 12000, 'the check-in waits a few seconds (' + Math.round(ms / 100) / 10 + ' s), then goes ahead and gets the free door ' + leaving.dock);
    t.eq((await dump(p))['trailers/' + SCHED].dock, leaving.dock, 'and it is saved');
    await ctx.close();
  }

  /* ================= 6b. the same field on two devices: last save wins, and both screens show it ================= */
  t.section('the same field changed on two devices at once: the last save wins, and every screen shows what is saved');
  {
    // each write is answered 700 ms after the server stored it, so the other device's newer change arrives first
    const ctx = await shared(h, { seed: DUMP, ackDelay: 700 });
    const a = await staff(h, ctx, 'office', DESK);
    const b = await staff(h, ctx, 'office', PHONE);
    const tid = await a.evaluate(() => window.__zz.doc.trailers[0].id);
    await a.evaluate(id => { window.__zz.actions.patchTrailer(id, { driver: 'Typed On A' }); }, tid);
    await a.waitForTimeout(150);
    await b.evaluate(id => { window.__zz.actions.patchTrailer(id, { driver: 'Typed On B' }); }, tid);
    for (const p of [a, b]) await p.evaluate(() => window.__zz.h.sync.flush(6000));
    await a.waitForTimeout(600);
    const saved = (await dump(a))['trailers/' + tid].driver;
    const onA = await a.evaluate(id => window.__zz.doc.trailers.find(x => x.id === id).driver, tid);
    const onB = await b.evaluate(id => window.__zz.doc.trailers.find(x => x.id === id).driver, tid);
    t.ok(saved === 'Typed On B' && onA === saved && onB === saved, 'the later save wins ("' + saved + '") and both screens show it (A: "' + onA + '", B: "' + onB + '")');
    await ctx.close();
  }

  /* ================= 7. access withdrawn while waiting for the owner ================= */
  t.section('access withdrawn while the page waits for the office to set up shared data');
  {
    const ctx = await shared(h, { isOwner: false, canEdit: false, can: true }, { viewport: PHONE });
    const p = await ctx.newPage();
    await p.setViewportSize(PHONE);
    p.on('pageerror', e => h.errors.push('[revoked-wait] pageerror: ' + (e && e.message)));
    await p.goto(h.origin + '/#crew');
    await p.waitForFunction(() => { const n = document.querySelector('[data-zz="sync-wait"]'); return n && /Waiting for the office/.test(n.innerText); }, null, { timeout: 8000 });
    await p.evaluate(() => window.__mockdb.killListeners('revoked'));
    await p.waitForFunction(() => { const n = document.querySelector('[data-zz="sync-wait"]'); return n && /can't open the shared data/.test(n.innerText); }, null, { timeout: 8000 });
    const n = await p.evaluate(() => document.querySelector('[data-zz="sync-wait"]').innerText);
    t.ok(has(n, "This login can't open the shared data right now") && has(n, 'Ask the owner'), 'the note says this login can\'t open the shared data, and to ask the owner (not "check the internet")');
    t.ok((await writes(p)).length === 0, 'nothing was written');
    await h.check(p, 'sync-edge-revoked-wait-390');
    await ctx.close();
  }

  /* ================= 8. the card warns when this computer only has the demo ================= */
  t.section('Setup card: moving this computer\'s data warns when that copy is only the demo');
  {
    const BASE = await h.baseDoc();
    const ctx = await shared(h, { seed: DUMP }, { seed: BASE, viewport: PHONE });
    const p = await staff(h, ctx, 'office', PHONE);
    if (!(await p.evaluate(() => !!document.querySelector('[data-zz="sync-card"]')))) {
      await p.evaluate(() => {
        const host = document.createElement('div'), pg = document.querySelector('#root > div');
        host.style.cssText = 'max-width:768px;margin:0 auto;padding:16px 16px 140px;box-sizing:border-box';
        document.body.style.background = pg ? getComputedStyle(pg).backgroundColor : '';
        document.body.appendChild(host);
        window.__zzsync.mount(host);
      });
    }
    await p.waitForSelector('[data-zz="sync-card"]');
    let card = await p.locator('[data-zz="sync-card"]').innerText();
    t.ok(has(card, "This computer's copy is the demo (sample trucks and accounts), not real dock data.") && has(card, BASE.customers.length + ' accounts'), 'the card says this computer\'s copy is the demo (' + BASE.customers.length + ' sample accounts)');
    t.ok(has(card, 'Each photo is one record too.'), 'the record count explains how photos are counted');
    await p.getByRole('button', { name: "Move this computer's data…" }).click();
    card = await p.locator('[data-zz="sync-card"]').innerText();
    t.ok(has(card, "This computer's copy is the demo") && has(card, "Replace the shared data with this computer's copy?"), 'the warning stays in view while it asks before replacing anything');
    await p.locator('[data-zz="sync-card"]').scrollIntoViewIfNeeded();
    await h.check(p, 'sync-edge-card-demo-390', { full: true });
    await p.locator('[data-zz="sync-card"]').locator('xpath=..').screenshot({ path: require('path').join(h.SHOTS, h.prefix + '-sync-edge-card-demo-crop-390.png') });
    await p.getByRole('button', { name: 'Cancel' }).click();
    t.eq((await writes(p)).length, 0, 'Cancel: nothing was written');
    await p.setViewportSize(DESK);
    await p.locator('[data-zz="sync-card"]').scrollIntoViewIfNeeded();
    await p.locator('[data-zz="sync-card"]').locator('xpath=..').screenshot({ path: require('path').join(h.SHOTS, h.prefix + '-sync-edge-card-demo-crop-1400.png') });
    await h.check(p, 'sync-edge-card-demo-1400');
    await ctx.close();
  }
});
