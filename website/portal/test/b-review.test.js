/* Stream B review checks (PLAN.md 3.B, plus fixes found in review). Signs in as Altex 7788 (Pine Ridge 1357 for a
   non-dispatch account) and as Nick 2468 for the office side of ZZEst.
     node website/portal/test/run.js b [--dist DIR]
   Covers: B01 (load screen "Who touched it" shows date and time), ZZEst quick lines tapped twice before the first save
   lands, tracking edits that change nothing write nothing, "I'm interested" sends one note, the done note without
   loads, the phone header, 44 px tap targets, the dark themes (damage total readable) and the honest driver-link text. */
const H = require('./harness');
const { PHONE, DESK } = H;

const iso = ms => new Date(ms).toISOString();
const MIN = 6e4, HOUR = 36e5, DAY = 864e5;
const clone = o => JSON.parse(JSON.stringify(o));
const sheet = p => p.locator('.fixed.inset-0').last();
const txt = async loc => (await loc.innerText()).replace(/\s+/g, ' ');
async function ready(page) { await page.waitForFunction(() => window.__zz && window.__zz.actions && window.__zz.h, null, { timeout: 10000 }); }
async function tab(page, label) { await page.locator('nav.zz-tabs button', { hasText: label }).first().click(); await page.waitForTimeout(250); }
async function noSide(t, page, label) {
  const r = await page.evaluate(() => ({ vw: window.innerWidth, sw: document.scrollingElement.scrollWidth,
    inner: [...document.querySelectorAll('.overflow-y-auto')].filter(el => el.scrollWidth > el.clientWidth + 1).length }));
  t.ok(r.sw <= r.vw && !r.inner, `${label}: no sideways scroll at ${r.vw} px (page ${r.sw}${r.inner ? ', a sheet scrolls sideways' : ''})`);
}
const truckDoc = (o) => ({ carrier: 'Altex Transportation', driver: '', phone: '', trailer: '', direction: 'inbound', customerId: 'cu_altex', needsMatch: false, dock: null, stage: 'scheduled',
  arrivedAt: null, dockedAt: null, workStartedAt: null, workDoneAt: null, departedAt: null, sealIn: '', sealOut: '', sealVerified: null, notes: '', chat: [], instructions: '', workStartedBy: null, workDoneBy: null, ...o });
const loadDoc = (o) => ({ customerId: 'cu_altex', trailerOutId: null, units: { std: 8, lg: 0, crate: 0 }, exceptions: [], adjustments: [], chat: [], touches: [], corrections: [], lane: 'reno', status: 'staged', ...o });

H.main('b-review', async (h, t) => {
  const base = await h.baseDoc();
  const NOW = Date.now();

  /* ---------- B01: the load screen shows when each touch happened (date and time) ---------- */
  t.section('B01: load screen "Who touched it" shows the date and time');
  {
    const seed = clone(base);
    const ld = seed.shipments.find(s => s.ref === '111927');
    ld.touches = [...(ld.touches || []), { id: 'tb1', who: 'Roman', what: 'move', at: iso(NOW - 3 * DAY) }, { id: 'tb2', who: 'Alex', what: 'receive', at: iso(NOW - 2 * HOUR) }];
    ld.corrections = [...(ld.corrections || []), { id: 'cb1', field: 'pallets', from: 15, to: 14, by: 'Nick', at: iso(NOW - HOUR) }];
    for (const [vw, viewport] of [['390', PHONE], ['1400', DESK]]) {
      const p = await h.openAs('customer', { viewport, seed });
      await tab(p, 'Inventory');
      await p.locator(vw === '390' ? '.zz-narrow .zz-row' : '.zz-wide tr', { hasText: '111927' }).first().click();
      await p.waitForTimeout(350);
      const cells = await p.locator('span.tabular-nums.text-xs.w-28').evaluateAll(xs => xs.map(x => x.innerText.trim()));
      t.ok(cells.length >= 2 && cells.every(c => /^[A-Z][a-z]{2} \d{1,2}, \d{1,2}:\d{2}\s?[AP]M$/.test(c)), `@${vw}: every touch shows a date and time (${cells.slice(0, 3).join(' | ')})`);
      const wide = await p.locator('span.tabular-nums.text-xs.w-28').first().evaluate(el => el.scrollWidth <= el.clientWidth + 1);
      t.ok(wide, `@${vw}: the date and time fit their column`);
      if (vw === '390') await noSide(t, p, 'load screen');
      await h.check(p, `client-b01-${vw}`);
      await p.context().close();
    }
  }

  /* ---------- ZZEst: two taps before the first save lands both count ---------- */
  t.section('office estimate: quick lines tapped twice in a row');
  {
    const p = await h.openAs('office', { viewport: DESK });
    await ready(p);
    await p.getByRole('button', { name: 'Inventory', exact: true }).click();
    await p.waitForTimeout(300);
    await p.getByText('111927', { exact: false }).first().click();
    await p.waitForTimeout(400);
    const before = await h.readDoc(p);
    const ex0 = before.shipments.find(s => s.ref === '111927').exceptions.find(x => x.kind === 'Damage');
    const q0 = ((ex0.est && ex0.est.lines) || []).filter(l => l.label === 'Rewrap pallet').reduce((a, l) => a + l.qty, 0);
    const btn = p.getByRole('button', { name: /^Rewrap pallet \$15/ }).first();
    t.ok(await btn.count() === 1, 'the office load screen shows the estimate quick lines');
    // two clicks in the same moment: the second must build on the first (zzEstLines takes the whole list)
    await btn.evaluate(el => { el.click(); el.click(); });
    await p.waitForTimeout(700);
    const after = await h.readDoc(p);
    const ex1 = after.shipments.find(s => s.ref === '111927').exceptions.find(x => x.kind === 'Damage');
    const q1 = ex1.est.lines.filter(l => l.label === 'Rewrap pallet').reduce((a, l) => a + l.qty, 0);
    t.ok(q1 === q0 + 2 && ex1.est.lines.filter(l => l.label === 'Rewrap pallet').length === 1, `two quick taps add 2 rewraps on one line (${q0} -> ${q1})`);
    const tot = await txt(p.locator('text=Estimated total').locator('xpath=..'));
    t.ok(/\$\d/.test(tot), 'the office estimate shows its total');
    await h.check(p, 'client-est-office-1400');
    await p.context().close();
  }

  /* ---------- tracking edits that change nothing write nothing; removing a link says so once ---------- */
  t.section('tracking edit writes only what changed');
  {
    const seed = clone(base);
    seed.trailers.push(truckDoc({ id: 'tT', truck: '7301', code: '7311', scheduledAt: iso(NOW + 5 * HOUR), createdAt: iso(NOW - DAY), tracking: 'samsara', trackUrl: 'https://cloud.samsara.com/o/1/x' }));
    seed.trailers.push(truckDoc({ id: 'tL', truck: '7302', code: '7312', scheduledAt: iso(NOW + 6 * HOUR), createdAt: iso(NOW - DAY), tracking: 'link', trackUrl: '' }));
    const p = await h.openAs('customer', { viewport: PHONE, seed });
    await ready(p);
    await tab(p, 'Trucks');
    await p.locator('.zz-row', { hasText: 'Truck 7301' }).first().click();
    await p.waitForTimeout(300);
    const eta = p.locator('[data-zzb=eta]');
    let d0 = await h.readDoc(p);
    await eta.getByRole('button', { name: 'Change', exact: true }).click();
    await eta.getByRole('button', { name: 'Save', exact: true }).click();
    await p.waitForTimeout(500);
    let d1 = await h.readDoc(p);
    t.ok(d1.rev === d0.rev, `Save with nothing changed writes nothing (rev ${d0.rev} -> ${d1.rev})`);
    await sheet(p).getByRole('button', { name: 'Close' }).first().click();
    await p.waitForTimeout(200);
    await p.locator('.zz-row', { hasText: 'Truck 7302' }).first().click();
    await p.waitForTimeout(300);
    await eta.getByRole('button', { name: 'Change', exact: true }).click();
    await eta.locator('select').selectOption('samsara');
    await eta.getByRole('button', { name: 'Save', exact: true }).click();
    await p.waitForTimeout(500);
    d1 = await h.readDoc(p);
    const tl = d1.trailers.find(x => x.id === 'tL');
    t.ok(tl.tracking === 'samsara' && !(tl.history || []).some(x => /removed/i.test(x.text)) && (tl.history || []).some(x => /Tracking: Samsara/.test(x.text)), 'switching to Samsara without a link logs "Tracking: Samsara", not "link removed"');
    await p.context().close();
  }

  /* ---------- "I'm interested": one note even on a double tap; done note without loads ---------- */
  t.section('securement plan interest and the done note');
  {
    const seed = clone(base);
    seed.trailers.push(truckDoc({ id: 'tN', truck: '7401', code: '7411', direction: 'outbound', stage: 'done', scheduledAt: iso(NOW - 3 * HOUR), arrivedAt: iso(NOW - 2 * HOUR), dockedAt: iso(NOW - 110 * MIN),
      dock: 'D6', workStartedAt: iso(NOW - 100 * MIN), workDoneAt: iso(NOW - 40 * MIN), afterPhotoCount: 2 }));
    const p = await h.openAs('customer', { viewport: PHONE, seed });
    await ready(p);
    const note = await txt(p.locator('[data-zzb=done-note]', { hasText: 'Truck 7401' }));
    t.ok(note.includes('Truck 7401 is done: 2 photos, 0 damage reports.') && !/0 of 0/.test(note), 'a done truck with no loads listed leaves out "0 of 0 pallets" (' + note + ')');
    await tab(p, 'Inventory');
    const b = p.locator('[data-zzb=plan]').getByRole('button', { name: "I'm interested" });
    await b.evaluate(el => { el.click(); el.click(); });
    await p.waitForTimeout(700);
    const d = await h.readDoc(p);
    const notes = (d.accountChat.cu_altex || []).filter(m => /securement plan/.test(m.text));
    t.ok(notes.length === 1 && !!d.customers.find(c => c.id === 'cu_altex').securementInterest, `a double tap on "I'm interested" sends one note (${notes.length})`);
    t.ok((await txt(p.locator('[data-zzb=plan]'))).includes("We'll call you"), 'the card says "We\'ll call you"');
    await p.context().close();
  }

  /* ---------- header on a phone, tap targets, honest driver-link text ---------- */
  t.section('phone header, tap targets, driver link wording');
  {
    const seed = clone(base);
    seed.trailers.push(truckDoc({ id: 'tO', truck: '7501', code: '7511', scheduledAt: iso(NOW + 4 * HOUR), createdAt: iso(NOW - DAY), loadOrder: true }));
    seed.shipments.push(loadDoc({ id: 'sO1', ref: 'O-1', trailerInId: 'tO', status: 'expected', seq: 0, weight: 9000, pieces: 30, hazmat: true, stackable: false }));
    seed.shipments.push(loadDoc({ id: 'sO2', ref: 'O-2', trailerInId: 'tO', status: 'expected', seq: 1 }));
    const p = await h.openAs('customer', { viewport: PHONE, seed });
    await ready(p);
    const hd = await p.evaluate(() => {
      const so = [...document.querySelectorAll('.zz-top button')].find(b => b.getAttribute('aria-label') === 'Sign out');
      const nm = document.querySelector('.zz-top .zz-in > div > div');
      return { soText: so ? so.innerText.trim() : null, nameW: nm ? nm.clientWidth : 0, settings: !!document.querySelector('.zz-top button[aria-label="Alerts and settings"]') };
    });
    t.ok(hd.soText === '' && hd.settings && hd.nameW >= 120, `phone header: Sign out shows its icon only, the settings icon is there, the company name gets ${hd.nameW} px`);
    await h.check(p, 'client-header-390');
    await tab(p, 'Trucks');
    await p.locator('.zz-row', { hasText: 'Truck 7501' }).first().click();
    await p.waitForTimeout(300);
    const chipH = await p.locator('[data-zzb=eta] .zzb-chips button').evaluateAll(xs => xs.map(x => Math.round(x.getBoundingClientRect().height)));
    const arwH = await p.locator('[data-zzb=loads] .zz-narrow button[aria-label^="Move load"]').evaluateAll(xs => xs.map(x => Math.round(Math.min(x.getBoundingClientRect().height, x.getBoundingClientRect().width))));
    const trailH = await p.locator('[data-zzb=loads] .zz-narrow').getByRole('button', { name: 'Trail', exact: true }).first().evaluate(x => Math.round(x.getBoundingClientRect().height));
    t.ok(chipH.length === 4 && chipH.every(v => v >= 44), `ETA chips are at least 44 px tall (${chipH.join(', ')})`);
    t.ok(arwH.length === 4 && arwH.every(v => v >= 44), `load order arrows are at least 44 px (${arwH.join(', ')})`);
    t.ok(trailH >= 44, `the "Trail" link is a 44 px target (${trailH})`);
    const dl = await txt(p.locator('[data-zzb=driver-link]'));
    t.ok(dl.includes('send us the update') && !/door number after check-in/.test(dl), 'driver link text promises only what the driver page does on the driver\'s own phone');
    // ETA from the time box
    await p.locator('[data-zzb=eta] input[type=time]').fill('23:55');
    await p.waitForTimeout(150);
    await p.locator('[data-zzb=eta]').getByRole('button', { name: /^Set ETA/ }).click();
    await p.waitForTimeout(500);
    const tr = (await h.readDoc(p)).trailers.find(x => x.id === 'tO');
    const hm = await p.evaluate(at => window.__zz.h.ZZdockParts(at).hhmm, tr.eta && tr.eta.at);
    t.ok(tr.eta && tr.eta.source === 'client' && hm === '23:55', 'an ETA typed as a time is saved in dock time (23:55)');
    // "Book this again next week": the same loads with their details, the same order, a week later at the same time
    await sheet(p).getByRole('button', { name: 'Book this again next week' }).click();
    await p.waitForTimeout(300);
    const f = sheet(p);
    const refs = await f.locator('input[placeholder="e.g. 112045"]').evaluateAll(xs => xs.length);
    const wts = await f.locator('input[placeholder="e.g. 12000"]').evaluateAll(xs => xs.map(x => x.value));
    const pcs = await f.locator('input[placeholder="e.g. 40"]').evaluateAll(xs => xs.map(x => x.value));
    const hz = await f.getByLabel('Load 1 hazmat').isChecked();
    const ns = await f.getByRole('group', { name: 'Load 1 stackable' }).getByRole('button', { name: 'No', exact: true }).getAttribute('aria-pressed');
    const ord = await f.getByLabel('Unload in this order').isChecked();
    const when = await f.locator('input[type=date]').first().inputValue();
    const want = await p.evaluate(at => { const h = window.__zz.h, d = h.ZZdockParts(at); const x = new Date(d.ymd + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + 7); return x.toISOString().slice(0, 10); }, seed.trailers.find(x => x.id === 'tO').scheduledAt);
    t.ok(refs === 2 && wts[0] === '9000' && pcs[0] === '30' && hz && ns === 'true' && ord && when === want, `"Book this again" copies the loads (weight ${wts.join('/')}, pieces ${pcs.join('/')}, hazmat, no stack), the order, and the day a week later (${when})`);
    await p.context().close();
    const q = await h.openAs('customer', { viewport: DESK, seed });
    t.ok(await q.locator('.zz-top button[aria-label="Sign out"]').innerText() === 'Sign out', 'desktop header still says "Sign out"');
    await h.check(q, 'client-header-1400');
    await q.context().close();
  }

  /* ---------- a dispatcher on Eastern time still books in dock time (Pacific) ---------- */
  t.section('booking from a browser on Eastern time');
  {
    const ctx = await h.newContext({ viewport: PHONE, seed: clone(base), timezoneId: 'America/New_York' });
    const p = await h.openAs('customer', { context: ctx });
    await ready(p);
    // the next Saturday (dock time): after hours all day
    const sat = await p.evaluate(() => { const h = window.__zz.h; let ms = Date.now() + 864e5; for (let k = 0; k < 8; k++, ms += 864e5) { const d = h.ZZdockParts(ms).ymd; if (new Date(d + 'T12:00:00Z').getUTCDay() === 6) return d; } return null; });
    await p.getByRole('button', { name: 'Schedule a truck' }).first().click();
    await p.waitForTimeout(250);
    await p.fill('input[type=date]', sat);
    await sheet(p).locator('input[type=time]').first().fill('08:15');
    await p.waitForTimeout(150);
    t.ok((await txt(sheet(p))).includes('after-hours fee applies'), 'a Saturday booking shows the after-hours fee hint (worked out in dock time)');
    await sheet(p).locator('input[type=date]').fill(await p.evaluate(s => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 2); return d.toISOString().slice(0, 10); }, sat));
    await sheet(p).locator('input[type=time]').first().fill('21:50');
    await p.waitForTimeout(150);
    t.ok(!(await txt(sheet(p))).includes('after-hours fee applies'), 'Monday 9:50 PM dock time is inside hours (it is 12:50 AM in New York)');
    await p.fill('input[placeholder="e.g. 112045"]', 'ET-1');
    await p.fill('input[placeholder="0"]', '4');
    await p.fill('input[placeholder="e.g. 4521"]', '6121');
    await sheet(p).getByRole('button', { name: 'Add to schedule' }).click();
    await p.waitForTimeout(700);
    const tr = (await h.readDoc(p)).trailers.find(x => x.truck === '6121');
    const d = await p.evaluate(at => window.__zz.h.ZZdockParts(at), tr.scheduledAt);
    t.ok(d.hhmm === '21:50' && (await txt(p.locator('[data-zzb=booked]'))).includes('9:50 PM'), `stored and shown as 9:50 PM dock time (${tr.scheduledAt})`);
    await sheet(p).getByRole('button', { name: 'See this truck' }).click();
    await p.waitForTimeout(300);
    t.ok(await p.locator('[data-zzb=time] input[type=time]').inputValue() === '21:50', 'the truck sheet\'s time box shows 21:50 (dock time), not the New York time');
    await ctx.close();
  }

  /* ---------- a request (not a dispatch account) is titled as a request ---------- */
  t.section('booked sheet title for a request');
  {
    const p = await h.openAs('customer', { viewport: PHONE, seed: clone(base), name: 'Pine Ridge', pin: '1357' });
    await ready(p);
    await p.getByRole('button', { name: 'Schedule a truck' }).first().click();
    await p.waitForTimeout(250);
    const day = await p.evaluate(() => { const h = window.__zz.h; const d = new Date(Date.now() + 2 * 864e5); return h.ZZdockParts(d.getTime()).ymd; });
    await p.fill('input[type=date]', day);
    await sheet(p).locator('input[type=time]').first().fill('13:05');
    await p.fill('input[placeholder="e.g. 112045"]', 'PR-T1');
    await p.fill('input[placeholder="0"]', '3');
    await p.fill('input[placeholder="e.g. 4521"]', '9911');
    await sheet(p).getByRole('button', { name: 'Send request' }).click();
    await p.waitForTimeout(700);
    const title = await txt(sheet(p).locator('h2, [class*="font-bold"]').first());
    const body = await txt(p.locator('[data-zzb=booked]'));
    t.ok(/Request sent: Truck 9911/.test(await txt(sheet(p))) && body.includes('1:05 PM'), 'a request is titled "Request sent: Truck 9911" and shows 1:05 PM (' + title + ')');
    await noSide(t, p, 'booked sheet (request)');
    await p.context().close();
  }

  /* ---------- dark themes: the damage total stays readable; light theme: plain checkboxes ---------- */
  t.section('themes');
  for (const theme of ['hivis', 'clean', 'brand']) {
    const ctx = await h.newContext({ viewport: PHONE, seed: clone(base) });
    await ctx.addInitScript(th => { try { localStorage.setItem('cd6:theme', th); } catch (e) {} }, theme);
    const p = await h.openAs('customer', { context: ctx });
    await tab(p, 'Damage');
    const r = await p.evaluate(() => {
      const row = [...document.querySelectorAll('div')].find(d => d.children.length === 2 && /^Estimated total/.test(d.innerText));
      const lum = c => { const m = /rgba?\((\d+), (\d+), (\d+)/.exec(c); if (!m) return 1; const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(+m[1]) + .7152 * f(+m[2]) + .0722 * f(+m[3]); };
      if (!row) return null;
      const bg = getComputedStyle(row).backgroundColor, fg = getComputedStyle(row).color, a = lum(bg), b = lum(fg);
      return { bg, fg, ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
    });
    t.ok(r && r.ratio >= 4.5, `${theme}: the damage "Estimated total" row is readable (contrast ${r && r.ratio.toFixed(1)}:1, ${r && r.bg} on ${r && r.fg})`);
    await h.check(p, `client-damage-${theme}-390`);
    if (theme === 'brand') {
      await p.getByRole('button', { name: 'Alerts and settings' }).click();
      await p.waitForTimeout(250);
      const cs = await p.locator('[data-zzb=alerts] input[type=checkbox]').first().evaluate(el => getComputedStyle(el).colorScheme);
      t.ok(cs === 'light', 'light theme: the alert checkboxes are light (unchecked boxes do not look filled)');
      await h.check(p, 'client-alerts-brand-390');
    }
    await ctx.close();
  }
});
