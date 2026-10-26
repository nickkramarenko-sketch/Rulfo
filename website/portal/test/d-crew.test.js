/* Stream D acceptance (PLAN.md 3.D): the forklift crew. Sign in as Roman 1111.
     node website/portal/test/run.js d [--dist DIR]
   Covers: wait clocks against the goal (Next job, Then rows, cards, door map, bell with its red edge), door picker
   labels and columns, count notes, unload order, load pills, the damage report with photos (count card and outbound
   pull card, one Short report per count), auto-approve, Secure the load (refusals, gear rows, seal, wrap-up block,
   scroll to the step, half-filled form kept, inbound reload order, "not safe" blocks wrap-up, ZZFLAGS.secureStep off),
   the Gear tab, the office crew phone / shift / rank fields (edit form on screen at 390, no rank:null), Spanish,
   Russian (5 tabs fit), and the hi-vis theme. Data is always read back from localStorage (the truth). */
const H = require('./harness');
const { PHONE, DESK } = H;

const MIN = 6e4;
const iso = ms => new Date(ms).toISOString();
const clone = o => JSON.parse(JSON.stringify(o));
const RED = 'rgb(192, 57, 43)', GREEN = 'rgb(30, 138, 90)', AMBER = 'rgb(183, 121, 31)';

/* the demo doc plus: D6 and D8 free, nobody's own truck working, a truck at D8 that checked in 40 min ago
   (3 loads in the array order A, B, C but seq 2, 0, 1), truck 118 (outbound, yard) checked in 5 min ago */
function fixture(base, t0) {
  const d = clone(base);
  const T = id => d.trailers.find(t => t.id === id);
  for (const id of ['zzt5', 'zzt6']) Object.assign(T(id), { stage: 'departed', dock: null, departedAt: iso(t0 - 5 * MIN) });
  d.trailers.forEach(t => { if (t.stage === 'working') t.workStartedBy = 'Sergio'; });
  Object.assign(T('zzt8'), { arrivedAt: iso(t0 - 5 * MIN) });
  const tw = Object.assign(clone(T('zzt2')), { id: 'zzd_w', truck: '9040', trailer: 'TW40', carrier: 'Altex Transportation', driver: 'Dana', customerId: 'cu_altex',
    dock: 'D8', stage: 'at-dock', scheduledAt: iso(t0 - 60 * MIN), arrivedAt: iso(t0 - 40 * MIN), dockedAt: iso(t0 - 38 * MIN), instructions: 'Unload 3 loads.' });
  d.trailers.push(tw);
  const s0 = d.shipments.find(s => s.id === 'zzs2_1');
  const load = (id, ref, seq, std, extra) => Object.assign(clone(s0), { id, ref, customerId: 'cu_altex', trailerInId: 'zzd_w', units: { std, lg: 0, crate: 0 }, seq,
    receivedAt: null, status: 'expected', qc: { condition: '', counted: null, note: '' }, exceptions: [], touches: [], photoCount: 0, row: '', rewrapPallets: 0 }, extra || {});
  d.shipments.push(load('zzd_a', 'DA-100', 2, 5), load('zzd_b', 'DB-200', 0, 6, { hazmat: true, stackable: false, pieces: 24, weight: 5400 }), load('zzd_c', 'DC-300', 1, 4));
  return d;
}

async function ready(page) { await page.waitForFunction(() => window.__zz && window.__zz.actions && window.__zz.h, null, { timeout: 10000 }); }
async function act(page, name, ...args) {
  return page.evaluate(async ([name, args]) => { let r = window.__zz.actions[name](...args); if (r && r.then) r = await r; await new Promise(z => setTimeout(z, 250)); return r && r.trailers ? true : r ?? null; }, [name, args]);
}
async function calc(page, fn, a) {
  return page.evaluate(([src, a]) => { const f = (0, eval)('(' + src + ')'); return f(window.__zz.h, JSON.parse(localStorage.getItem('cdweb:cd6:doc')), a); }, [fn.toString(), a === undefined ? null : a]);
}
async function crew(h, o) {
  const p = await h.openAs('crew', o);
  const got = p.getByRole('button', { name: /^(Got it|Entendido|Понятно)$/ });
  if (await got.count()) await got.first().click();
  await ready(p);
  return p;
}
const into = async (loc) => { await loc.evaluate(el => el.scrollIntoView({ block: 'center' })); await loc.page().waitForTimeout(250); };
const color = (loc) => loc.evaluate(el => getComputedStyle(el).color);
const wait = (p, ms) => p.waitForTimeout(ms || 350);
/* the card (xj) for a truck on All trucks */
const card = (p, truck, trailer) => p.locator(`:text("Truck ${truck} · Trailer ${trailer}")`).locator('xpath=ancestor::*[.//button[contains(@class,"rounded-lg")]][1]');

/* how many door buttons sit on the first row of the door picker */
const doorCols = p => p.$$eval('button[data-door]', bs => { const y = Math.round(bs[0].getBoundingClientRect().top); return bs.filter(b => Math.abs(Math.round(b.getBoundingClientRect().top) - y) < 4).length; });

/* long screens: viewport-sized screenshots down the page (or down a modal), name-1, name-2, ... */
async function segs(h, p, name, o = {}) {
  const max = o.max || 6;
  const sc = o.in ? await p.locator(o.in).evaluateHandle(el => { let n = el; while (n && n !== document.body) { const s = getComputedStyle(n); if (/(auto|scroll)/.test(s.overflowY) && n.scrollHeight > n.clientHeight) return n; n = n.parentElement; } return document.scrollingElement; }) : null;
  const total = sc ? await sc.evaluate(n => n.scrollHeight) : await p.evaluate(() => document.scrollingElement.scrollHeight);
  const step = (sc ? await sc.evaluate(n => n.clientHeight) : p.viewportSize().height) - 140;
  for (let k = 0, y = 0; k < max && (k === 0 || y < total - 140); k++, y += step) {
    if (sc) await sc.evaluate((n, y) => { n.scrollTop = y; }, y); else await p.evaluate(y => window.scrollTo(0, y), y);
    await h.check(p, name + '-' + (k + 1), { settle: 200 });
  }
  if (sc) await sc.evaluate(n => { n.scrollTop = 0; }); else await p.evaluate(() => window.scrollTo(0, 0));
}

H.main('d-crew', async (h, t) => {
  const base = await h.baseDoc();
  const t0 = Date.now();
  const seed = fixture(base, t0);

  /* ================= wait clocks, doors, bell ================= */
  t.section('wait clocks against the goal');
  let p = await crew(h, { viewport: PHONE, seed });
  let s = await h.text(p);
  t.ok(s.includes('Altex Transportation') && s.includes('Truck 9040'), 'Next job is the truck that has waited longest at a door (9040 at D8)');
  const jobClock = p.locator('section [data-zz=clock]').first();
  t.ok(/Waiting 4[01]m · goal 30/.test(await jobClock.innerText()), 'Next job shows "Waiting 40m · goal 30" (' + (await jobClock.innerText()) + ')');
  t.eq(await color(jobClock), RED, 'the Next job clock is red (over the goal)');
  t.ok(await p.locator('[data-zz=clock]').count() >= 2, 'the Then rows carry clocks too');
  await h.check(p, 'nextjob-390');

  await p.getByRole('button', { name: /All trucks/ }).first().click();
  await wait(p);
  const pill = card(p, '9040', 'TW40').locator('[data-zz=waitpill]');
  t.ok(/Waiting 4[01]m · goal 30/.test(await pill.innerText()), 'its truck card shows the same red pill: ' + (await pill.innerText()));
  t.eq(await color(pill), RED, 'the card pill is red');
  const yardPill = card(p, '63', 'T420').locator('[data-zz=waitpill]'), yardPlace = card(p, '63', 'T420').locator('[data-zz=placepill]');
  t.ok(/^#\d in line$/.test((await yardPlace.innerText()).trim()) && /^Waiting \d+m · goal 30$/.test((await yardPill.innerText()).trim()), 'a yard truck card shows its place in line and its wait: ' + (await yardPlace.innerText()) + ' / ' + (await yardPill.innerText()));
  const doors = p.locator('[data-zz=doors]');
  t.ok(await doors.count() === 1, 'All trucks has a Doors map');
  const d8 = doors.locator('button[aria-label^="D8 "]');
  t.ok(/Truck 9040/.test(await d8.innerText()) && /Altex/.test(await d8.innerText()) && /Waiting 4[01]m/.test(await d8.innerText()), 'D8 tile: truck, short company and clock');
  t.ok(/Free/.test(await doors.locator('[aria-label="D6 Free"]').innerText()), 'a free door shows Free (green)');
  await segs(h, p, 'alltrucks-390');

  await p.locator('button[aria-label^="Notifications"]').click();
  await wait(p);
  s = await h.text(p);
  t.ok(/Truck 9040 has waited 4[01]m at D8\. The goal is 30 min\. Start it\./.test(s), 'crew bell lists a waitover alert for truck 9040');
  const wo = p.getByRole('button', { name: /Truck 9040 has waited/ }).first();
  t.eq(await wo.evaluate(el => getComputedStyle(el).borderLeftColor), RED, 'the waitover alert has the red edge (urgent)');
  t.ok(await wo.evaluate(el => getComputedStyle(el).color) !== 'rgb(255, 255, 255)', 'and its text is readable (not white on white)');
  await h.check(p, 'bell-390', { settle: 900 });
  await p.keyboard.press('Escape');

  await act(p, 'zzSettings', { waitGoalMin: 60 });
  await wait(p, 600);
  const pill60 = card(p, '9040', 'TW40').locator('[data-zz=waitpill]');
  t.ok(/goal 60/.test(await pill60.innerText()), 'with the goal at 60 the pill reads goal 60');
  t.ok([GREEN, AMBER].includes(await color(pill60)), 'and it turns green or amber (' + (await color(pill60)) + ')');
  await act(p, 'zzSettings', { waitGoalMin: 30 });
  await wait(p, 400);

  /* ================= door picker ================= */
  t.section('door picker labels busy doors');
  await card(p, '118', 'T970').getByRole('button', { name: 'Give it a door' }).click();
  await wait(p);
  await p.getByRole('button', { name: 'Pick a door for this truck' }).click();
  await wait(p);
  const dD1 = p.locator('button[data-door="D1"]'), dD6 = p.locator('button[data-door="D6"]');
  t.ok(await dD1.isDisabled() && /Altex/.test(await dD1.innerText()), 'busy D1 is disabled and labelled with the company (' + (await dD1.innerText()).replace(/\n/g, ' / ') + ')');
  t.ok(await p.locator('button[data-door="D8"]').isDisabled() && /waiting 4[01]m/.test(await p.locator('button[data-door="D8"]').innerText()), 'busy D8 shows its clock');
  t.ok(!(await dD6.isDisabled()) && /Free/.test(await dD6.innerText()), 'free D6 can be picked');
  t.ok(+(await dD1.evaluate(el => getComputedStyle(el).opacity)) === 0.5, 'dimmed doors use opacity 50');
  t.eq(await doorCols(p), 3, 'door picker: 3 doors per row on a phone, so the labels fit');
  t.ok(await p.$$eval('button[data-door]', bs => bs.every(b => b.getBoundingClientRect().height >= 48)), 'door buttons are at least 48 px tall (gloves)');
  await h.check(p, 'doorpicker-390');
  await dD6.click();
  await wait(p, 500);
  let doc = await h.readDoc(p);
  t.ok(doc.trailers.find(x => x.id === 'zzt8').dock === 'D6', 'truck 118 is now at D6');

  /* ================= outbound: pull card count note, Short report, damage via ZZDmg ================= */
  t.section('outbound pull card: count note, Short report, damage report');
  await p.getByRole('button', { name: /^Start/ }).first().click();
  await wait(p, 500);
  const pull = p.locator('div.rounded-lg.p-3.space-y-3').filter({ hasText: 'PL-3301' }).first();
  await pull.locator('input[aria-label="Pallets counted"]').fill('7');
  await wait(p, 200);
  const conf = pull.getByRole('button', { name: /^Confirm 7/ });
  t.ok(await conf.isDisabled(), 'a count that does not match (7 of 8) cannot be confirmed without a note');
  t.ok(await pull.locator('[data-zz=countnote]').count() === 1 && /Why is it short 1\? \(required\)/.test(await pull.locator('[data-zz=countnote]').innerText()), 'the note box asks why it is short 1');
  await into(pull);
  await h.check(p, 'pull-note-390');
  await pull.locator('[data-zz=countnote] input').fill('Only 7 in lane R20');
  await conf.click();
  await wait(p, 500);
  doc = await h.readDoc(p);
  let pl1 = doc.shipments.find(x => x.ref === 'PL-3301');
  t.ok(pl1.pullCount === 7 && (pl1.exceptions || []).filter(x => x.kind === 'Short' && !x.resolved && /Only 7 in lane R20/.test(x.note)).length === 1, 'confirming opens one Short report with the note');
  await pull.getByRole('button', { name: /^Count confirmed/ }).click();
  await wait(p, 500);
  doc = await h.readDoc(p);
  t.eq((doc.shipments.find(x => x.ref === 'PL-3301').exceptions || []).filter(x => x.kind === 'Short').length, 1, 'a second tap on "Count confirmed" does not open a second Short report');

  await pull.locator('[data-zz=dmgadd]').click();
  await wait(p);
  let dm = p.locator('[data-zz=dmg]');
  t.ok(await dm.count() === 1, 'the pull card "Damage? Report it" opens the damage report (ZZDmg)');
  await dm.locator('[data-kind="Torn wrap"]').click();
  await dm.locator('[data-shot-input=wide]').setInputFiles(h.UPLOAD_PNG);
  await dm.locator('[data-shot-input=close]').setInputFiles(h.UPLOAD_PNG);
  await p.waitForFunction(() => /2 of 2/.test((document.querySelector('[data-zz=dmgcount]') || {}).innerText || ''), null, { timeout: 5000 });
  await dm.getByRole('button', { name: 'Save damage report' }).click();
  await wait(p, 600);
  doc = await h.readDoc(p);
  pl1 = doc.shipments.find(x => x.ref === 'PL-3301');
  let dx = (pl1.exceptions || []).filter(x => x.kind === 'Damage');
  t.ok(dx.length === 1 && dx[0].photoOwner === 'dmg:' + dx[0].id && dx[0].photoCount >= 2 && dx[0].kinds.includes('Torn wrap') && dx[0].est.lines.length >= 2, 'the pull card damage report saved with photos, kinds and fix lines');
  t.ok(await pull.locator('[data-zz=dmgreport]').count() === 1, 'the pull card lists the report');
  await into(pull.locator('[data-zz=dmgreport]'));
  await h.check(p, 'pull-reported-390');

  /* ================= secure the load ================= */
  t.section('secure the load');
  t.ok(await p.getByRole('button', { name: 'Secure the load', exact: true }).count() === 1, 'the outbound truck has a "Secure the load" step in the step bar');
  t.ok((await h.text(p)).includes('Secure the load'), 'and a "Secure the load" section');
  // wrap-up is blocked until secured
  await p.getByRole('button', { name: /Wrap up & send/ }).click();
  await wait(p);
  t.ok(await p.locator('[data-zz=securefirst]').count() === 1 && await p.getByRole('button', { name: 'Send to dispatch', exact: true }).isDisabled(), '"Send to dispatch" is blocked until the load is secured');
  await h.check(p, 'wrap-blocked-390');
  await p.keyboard.press('Escape');
  await wait(p);
  await p.getByRole('button', { name: 'Wrap up', exact: true }).click();
  await wait(p);
  t.ok(/Secured\s*not yet/.test(await h.text(p)), 'the Wrap up summary has a Secured row (not yet)');
  await p.getByRole('button', { name: /Wrap up & send/ }).click();
  await wait(p);
  await p.evaluate(() => window.scrollTo(0, document.scrollingElement.scrollHeight));
  await p.getByRole('button', { name: 'Go to Secure the load' }).click();
  await wait(p, 900);
  const stTop = await p.locator('[data-zz=securestep]').evaluate(el => el.getBoundingClientRect().top);
  t.ok(stTop >= 0 && stTop < 844 * 0.6, '"Go to Secure the load" scrolls the step into view (top at ' + Math.round(stTop) + ' px)');
  const sf = p.locator('[data-zz=secureform]');
  t.ok(await sf.count() === 1, '"Go to Secure the load" opens the secure form');
  const saveSec = sf.getByRole('button', { name: 'Save and sign' });
  t.ok(await saveSec.isDisabled(), 'Save and sign starts disabled');
  const plus = (k, n) => (async () => { for (let i = 0; i < n; i++) await sf.locator(`[data-gear=${k}] button[aria-label^="One more"]`).click(); })();
  await plus('plywood', 6); await plus('bars', 2); await plus('straps', 4);
  await sf.locator('[data-gear=straps] [data-owner=driver]').click();
  for (const tg of ['b-104', 'B-105']) { await sf.locator('input[aria-label="Tag number"]').fill(tg); await sf.locator('[data-zz=tagadd]').click(); }
  t.ok(/Usually 5 to 6/.test(await sf.locator('[data-gear=plywood]').innerText()) && /6/.test(await sf.locator('[data-gear=plywood] output').innerText()), 'gear rows have big steppers and hints');
  const seal = sf.locator('input[aria-label="Seal number"]');
  t.ok((await seal.inputValue()) === '', 'seal box starts empty (no outbound seal yet)');
  await seal.fill('sl-778899');
  for (const k of ['nose', 'middle', 'tail', 'closeup']) { await sf.locator(`[data-slot=${k}] input[type=file]`).setInputFiles(h.UPLOAD_PNG); await wait(p, 300); }
  await wait(p, 400);
  t.ok(/1 more|the seal photo/i.test(await sf.locator('[data-zz=missing]').innerText()) && await saveSec.isDisabled(), 'with 4 of 5 photos Save is refused (' + (await sf.locator('[data-zz=missing]').innerText()) + ')');
  await sf.locator('[data-slot=seal] input[type=file]').setInputFiles(h.UPLOAD_PNG);
  await p.waitForFunction(() => /5 of 5/.test((document.querySelector('[data-zz=seccount]') || {}).innerText || ''), null, { timeout: 5000 });
  doc = await h.readDoc(p);
  t.eq(doc.trailers.find(x => x.id === 'zzt8').secPhotos, { nose: 1, middle: 1, tail: 1, closeup: 1, seal: 1 }, 'photo counts are saved live in secPhotos');
  t.ok(await saveSec.isDisabled() && /how solid/.test(await sf.locator('[data-zz=missing]').innerText()), 'still refused without a confidence level');
  await sf.locator('[data-conf="1"]').click();
  t.ok(await sf.locator('[data-zz=notsafe]').count() === 1, 'confidence 1 shows the red "Do not let it leave like this" warning');
  await sf.locator('[data-conf="3"]').click();
  t.ok(await saveSec.isDisabled() && /what would make it safer/.test(await sf.locator('[data-zz=missing]').innerText()), 'confidence 3 needs a note');
  await sf.locator('textarea').fill('One more strap at the tail would help');
  t.ok(await saveSec.isDisabled() && /check box/.test(await sf.locator('[data-zz=missing]').innerText()), 'still refused without the check box');
  await sf.locator('[data-zz=secchk]').check();
  t.ok(await saveSec.isDisabled() && /signature/.test(await sf.locator('[data-zz=missing]').innerText()), 'still refused without a signature');
  await sf.locator('[data-zz=secsign]').fill('Roman');
  t.ok(!(await saveSec.isDisabled()), 'Save and sign is ready');
  await segs(h, p, 'secure-form-390', { max: 8 });
  await saveSec.click();
  await wait(p, 700);
  doc = await h.readDoc(p);
  let tr8 = doc.trailers.find(x => x.id === 'zzt8');
  t.ok(tr8.secure && tr8.secure.signedBy === 'Roman' && tr8.secure.confidence === 3 && tr8.secure.checkedRows === true && tr8.secure.signature === 'Roman', 'the truck has the secure report');
  t.ok(tr8.sealOut === 'SL-778899' && tr8.secure.seal === 'SL-778899', 'sealOut is the seal in capitals');
  t.eq(tr8.secure.tags, ['B-104', 'B-105'], 'tags saved in capitals');
  const outRows = (doc.zzGear || []).filter(g => g.trailerId === 'zzt8' && g.dir === 'out' && g.src === 'secure');
  t.eq(outRows.map(g => g.type + ':' + g.qty).sort(), ['bars:2', 'plywood:6'], 'zzGear has one "out" row per type marked ours (straps were the driver\'s)');
  t.eq(outRows.find(g => g.type === 'bars').tags, ['B-104', 'B-105'], 'tags ride on the bars row');
  t.ok(await calc(p, (hh, d) => hh.ZZtrail(d, 'zzt8').some(x => /Secured the load: PL-/.test(x.text))), 'the load trail shows "Secured the load" (fQ label)');
  await p.getByRole('button', { name: 'Secure the load', exact: true }).click();
  await wait(p);
  t.ok(await p.locator('[data-zz=securedone]').count() === 1 && /Secured 3\/5 · OK/.test(await p.locator('[data-zz=securedone]').innerText()), 'the step shows the saved report');
  await into(p.locator('[data-zz=securedone]'));
  await h.check(p, 'secure-done-390');
  await p.getByRole('button', { name: /Wrap up & send/ }).click();
  await wait(p);
  t.ok(await p.locator('[data-zz=securefirst]').count() === 0 && !(await p.getByRole('button', { name: 'Send to dispatch', exact: true }).isDisabled()), 'after securing, Send to dispatch is open');
  t.ok((await p.locator('input[placeholder="SL-00000"]').last().inputValue()) === 'SL-778899', 'the wrap-up seal is filled in from the secure report');
  await h.check(p, 'wrap-open-390');
  await p.keyboard.press('Escape');
  await wait(p);
  await p.getByRole('button', { name: 'Wrap up', exact: true }).click();
  await wait(p);
  t.ok(/Secured\s*3\/5/.test(await h.text(p)), 'the Wrap up summary shows "Secured 3/5"');

  /* leaderboard: +5 for the securement */
  const p2 = await crew(h, { viewport: PHONE, seed: doc });
  await p2.getByRole('button', { name: /Leaderboard/ }).first().click();
  await wait(p2);
  s = await h.text(p2);
  t.ok(/1 load secured/.test(s) && s.includes('5 per load secured'), 'leaderboard counts the securement and explains +5');
  await h.check(p2, 'leaderboard-390');

  /* ================= Gear tab ================= */
  t.section('gear tab');
  await p2.getByRole('button', { name: /^Gear/ }).first().click();
  await wait(p2);
  const outCard = p2.locator('[data-zz=gearout]').filter({ hasText: 'Pyramid Lake Hauling' });
  t.ok(await outCard.count() === 1 && /6 Plywood sheets · 2 Load bars/.test(await outCard.innerText()) && /B-104/.test(await outCard.innerText()), 'Out with customers now lists the gear and tags');
  await outCard.getByRole('button', { name: 'Log gear back' }).click();
  await wait(p2);
  await p2.locator('[data-type=bars]').click();
  await p2.locator('#zz-gear-back button[aria-label^="One more"]').click();
  await p2.locator('#zz-gear-back').getByRole('button', { name: 'B-104' }).click();
  await p2.locator('#zz-gear-back').getByRole('button', { name: 'B-105' }).click();
  await segs(h, p2, 'gear-form-390');
  await p2.locator('#zz-gear-back').getByRole('button', { name: 'Log gear back' }).click();
  await wait(p2, 600);
  const go = await calc(p2, (hh, d) => hh.ZZgearOut(d, 'zzc8'));
  t.ok(go.bars === 0 && go.plywood === 6 && go.tags.length === 0, 'logging 2 bars back lowers ZZgearOut and the returned tags disappear (' + JSON.stringify(go) + ')');
  doc = await h.readDoc(p2);
  t.ok((doc.zzGear || []).some(g => g.dir === 'back' && g.type === 'bars' && g.qty === 2 && g.src === 'return' && g.by === 'Roman'), 'the return is a ledger row (dir back, src return, by Roman)');
  t.ok(/Logged: 2 Load bars back from Pyramid Lake Hauling/.test(await h.text(p2)) && await p2.locator('[data-zz=gearmove]').count() >= 3, 'confirmation line and the last moves list');
  await segs(h, p2, 'gear-390');
  await p2.context().close();
  await p.context().close();

  /* ================= counting: unload order, note, damage from the count card ================= */
  t.section('count card: unload order, count note, damage report');
  p = await crew(h, { viewport: PHONE, seed });
  await p.getByRole('button', { name: /^Start unloading/ }).first().click();
  await wait(p, 500);
  doc = await h.readDoc(p);
  t.ok(doc.trailers.find(x => x.id === 'zzd_w').stage === 'working', 'truck 9040 started');
  await p.getByRole('button', { name: /^\d Unload, count/ }).click();
  await wait(p);
  const nextOff = async () => p.locator(':text("Next off the truck")').locator('xpath=following-sibling::*[1]').innerText();
  let no = await nextOff();
  t.ok(/DB-200/.test(no), '"Next off the truck" follows seq: DB-200 (seq 0) first, not DA-100 (array first)');
  t.ok(/Hazmat/.test(no) && /Do not stack/.test(no) && /24 pieces/.test(no) && /5,400 lb/.test(no), 'the load row shows Hazmat, Do not stack, pieces and weight');
  await into(p.locator(':text("Next off the truck")'));
  await h.check(p, 'nextoff-390');
  await p.getByRole('button', { name: /it's off, count it next/ }).click();
  await wait(p, 500);
  no = await nextOff();
  t.ok(/DC-300/.test(no), 'then DC-300 (seq 1)');
  // DB-200: Damaged -> Save opens ZZDmg
  const cardB = p.locator('div.rounded-lg').filter({ has: p.locator('span.font-black', { hasText: 'DB-200' }) }).last();
  await cardB.getByRole('button', { name: 'Damaged', exact: true }).click();
  await cardB.getByRole('button', { name: '05', exact: true }).click().catch(() => {});
  await cardB.getByRole('button', { name: 'Save', exact: true }).click();
  await wait(p);
  dm = p.locator('[data-zz=dmg]');
  t.ok(await dm.count() === 1, 'choosing Damaged and saving opens ZZDmg first');
  const saveD = dm.getByRole('button', { name: 'Save damage report' });
  t.ok(await saveD.isDisabled() && /the kind of damage/.test(await dm.locator('[data-zz=missing]').innerText()), 'Save is disabled with "Still missing: ..."');
  await dm.locator('[data-kind=Crushed]').click();
  await dm.locator('[data-shot-input=wide]').setInputFiles(h.UPLOAD_PNG);
  await p.waitForFunction(() => /1 of 2/.test((document.querySelector('[data-zz=dmgcount]') || {}).innerText || ''), null, { timeout: 5000 });
  t.ok(await saveD.isDisabled() && /1 more photo/.test(await dm.locator('[data-zz=missing]').innerText()), 'with 1 photo Save stays disabled');
  await dm.locator('button[aria-label="One more pallets"]').click();
  t.ok(/2/.test(await dm.locator('[data-line=rewrap] output').innerText()), 'the pallets stepper moves the rewrap line with it');
  await dm.locator('[data-line=pallet] button[aria-pressed]').click();
  t.ok(/\$110\.00/.test(await dm.locator('[data-zz=dmgtotal]').innerText()), 'fix lines toggle and total (2 rewrap $30 + labor $60 + pallet $20 = $110)');
  t.ok(/Customer will approve or decline/.test(await dm.locator('[data-zz=approve]').innerText()), 'with no auto-approve limit: "Customer will approve or decline"');
  await dm.locator('[data-shot-input=close]').setInputFiles(h.UPLOAD_PNG);
  await p.waitForFunction(() => /2 of 2/.test((document.querySelector('[data-zz=dmgcount]') || {}).innerText || ''), null, { timeout: 5000 });
  await dm.locator('textarea').fill('Forks went through the wrap');
  t.ok(!(await saveD.isDisabled()), 'with a kind and 2 photos Save works');
  await segs(h, p, 'dmg-modal-390', { in: '[data-zz=dmg]' });
  await saveD.click();
  await wait(p, 800);
  doc = await h.readDoc(p);
  let lb = doc.shipments.find(x => x.id === 'zzd_b');
  dx = (lb.exceptions || []).filter(x => x.kind === 'Damage');
  t.ok(dx.length === 1, 'the load has exactly one Damage exception (got ' + dx.length + ')');
  t.ok(dx[0].photoOwner === 'dmg:' + dx[0].id && dx[0].photoCount >= 2 && dx[0].est.lines.length === 3 && dx[0].pallets === 2 && dx[0].what === 'Forks went through the wrap', 'it has photoOwner, photoCount >= 2, est.lines, pallets and what happened');
  t.ok(!dx[0].answer, 'no auto-approve limit: the answer waits for the customer');
  t.ok(lb.qc.condition === 'Damaged' && lb.qc.counted === 6 && lb.receivedAt, 'the count was saved after the report (Damaged, 6)');
  t.ok(ieq(lb.rewrapPallets, 0), 'rewrap priced in the report is not billed again through rewrapPallets');
  await cardB.locator('button').first().click();
  await wait(p);
  t.ok(await cardB.locator('[data-zz=dmgreport]').count() === 1 && /Crushed/.test(await cardB.locator('[data-zz=dmgreport]').innerText()), 'opened again, the count card lists the photo report');
  t.ok(await cardB.locator('[data-zz=rwhint]').count() === 1, 'and says rewrap is already priced in the report (the old rewrap stepper is not charged again)');
  t.ok(await p.evaluate(async id => { const r = await window.__zz.h.photos.ls(id); return r.length; }, dx[0].photoOwner) >= 2, 'the photos are stored under dmg:<id>');
  await into(cardB.locator('[data-zz=dmgreport]'));
  await h.check(p, 'count-reported-390');

  // DC-300: count off -> note required
  await p.getByRole('button', { name: /it's off, count it next/ }).click();
  await wait(p, 500);
  const cardC = p.locator('div.rounded-lg').filter({ has: p.locator('span.font-black', { hasText: 'DC-300' }) }).last();
  await cardC.locator('input[type=number]').fill('3');
  await cardC.getByRole('button', { name: 'Good', exact: true }).click();
  await cardC.getByRole('button', { name: '06', exact: true }).click().catch(() => {});
  const saveC = cardC.getByRole('button', { name: 'Save', exact: true });
  t.ok(await saveC.isDisabled() && /Why is it short 1\? \(required\)/.test(await cardC.locator('[data-zz=countnote]').innerText()), 'a count that does not match needs a note before Save');
  await into(cardC.locator('[data-zz=countnote]'));
  await h.check(p, 'count-note-390');
  await cardC.locator('[data-zz=countnote] input').fill('Driver says 1 pallet stayed in Fresno');
  t.ok(!(await saveC.isDisabled()), 'with the note Save works');
  await saveC.click();
  await wait(p, 600);
  doc = await h.readDoc(p);
  const lc = doc.shipments.find(x => x.id === 'zzd_c');
  t.ok(lc.qc.counted === 3 && lc.qc.note === 'Driver says 1 pallet stayed in Fresno', 'the note is saved with the count (qc.note)');

  // auto-approve: set the customer's limit, report damage on DA-100
  await act(p, 'zzCustomer', 'cu_altex', { autoApproveUnder: 500 });
  await p.getByRole('button', { name: /it's off, count it next/ }).click();
  await wait(p, 500);
  const cardA = p.locator('div.rounded-lg').filter({ has: p.locator('span.font-black', { hasText: 'DA-100' }) }).last();
  await cardA.getByRole('button', { name: 'Damaged', exact: true }).click();
  await cardA.getByRole('button', { name: '07', exact: true }).click().catch(() => {});
  await cardA.getByRole('button', { name: 'Save', exact: true }).click();
  await wait(p);
  dm = p.locator('[data-zz=dmg]');
  t.ok(/Customer auto-approves under \$500\.00: this one goes through\./.test(await dm.locator('[data-zz=approve]').innerText()), 'with a limit the modal says the fix goes through');
  await dm.locator('[data-kind=Leaning]').click();
  await dm.locator('[data-shot-input=wide]').setInputFiles(h.UPLOAD_PNG);
  await dm.locator('[data-shot-input=more]').setInputFiles([h.UPLOAD_PNG, h.UPLOAD_PNG]);
  await p.waitForFunction(() => /2 of 2/.test((document.querySelector('[data-zz=dmgcount]') || {}).innerText || ''), null, { timeout: 5000 });
  await dm.getByRole('button', { name: 'Save damage report' }).click();
  await wait(p, 800);
  doc = await h.readDoc(p);
  const la = doc.shipments.find(x => x.id === 'zzd_a');
  dx = (la.exceptions || []).filter(x => x.kind === 'Damage');
  t.ok(dx.length === 1 && dx[0].answer && dx[0].answer.auto === true && dx[0].answer.status === 'accepted' && dx[0].photoCount === 3, 'with the customer\'s auto-approve set, answer.auto is true (3 photos: more photos allowed)');
  t.ok(doc.customers.find(c => c.id === 'cu_altex').rates === null, 'customer rates unchanged');
  await p.context().close();

  /* ================= Spanish ================= */
  t.section('crew language es');
  const es = clone(seed);
  es.settings.crewMembers.find(c => c.name === 'Roman').lang = 'es';
  p = await crew(h, { viewport: PHONE, seed: es });
  s = await h.text(p);
  t.ok(s.includes('Sujeción') && /Esperando 4[01]m · meta 30/.test(s), 'new labels are in Spanish (Gear tab "Sujeción", "Esperando 40m · meta 30")');
  await h.check(p, 'es-nextjob-390');
  await p.getByRole('button', { name: /Camiones/ }).first().click();
  await wait(p);
  s = await h.text(p);
  t.ok(s.includes('Puertas') && s.includes('Libre'), 'the door map is in Spanish');
  await p.getByRole('button', { name: /Sujeción/ }).first().click();
  await wait(p);
  s = await h.text(p);
  t.ok(s.includes('Registrar equipo que regresa') && s.includes('Barras de carga'), 'the Gear tab is in Spanish');
  await h.check(p, 'es-gear-390');
  await p.context().close();

  /* ================= inbound with a reload: reload, secure; a "not safe" rating blocks wrap-up ================= */
  t.section('inbound truck with a reload; not safe; switch off');
  p = await crew(h, { viewport: PHONE, seed });
  await p.getByRole('button', { name: /All trucks/ }).first().click();
  await wait(p);
  await card(p, '151', '050').getByRole('button', { name: 'Start unloading' }).click();
  await wait(p, 500);
  const stepNames = async () => p.$$eval('div[style*="sticky"] button[title]', bs => bs.map(b => b.title));
  let sn = await stepNames();
  t.ok(sn.join('|').includes('Reload|Secure the load|Photo log|Wrap up'), 'inbound truck with a reload: steps go Reload, Secure the load, Photo log (' + sn.join(' / ') + ')');
  const tid151 = (await h.readDoc(p)).trailers.find(x => x.truck === '151').id;
  await act(p, 'zzSecure', tid151, { gear: { bars: { qty: 2, owner: 'ours' } }, tags: [], seal: '', photos: { nose: 1, middle: 1, tail: 1, closeup: 1, seal: 1 }, confidence: 1, note: 'Load is leaning at the tail', checkedRows: true, signature: 'Roman' });
  await wait(p, 400);
  await p.getByRole('button', { name: 'Secure the load', exact: true }).click();
  await wait(p);
  const nsTxt = await p.locator('[data-zz=securedone]').innerText();
  t.ok(/Do not let it leave like this/.test(nsTxt) && await p.getByRole('button', { name: 'Secure it again', exact: true }).count() === 1, 'rated 1 (not safe): the step shows the red warning and "Secure it again" (' + nsTxt.slice(0, 120).replace(/\n/g, ' / ') + ')');
  await into(p.locator('[data-zz=securedone]'));
  await h.check(p, 'notsafe-390');
  await p.getByRole('button', { name: /Wrap up & send/ }).click();
  await wait(p);
  t.ok(/rated not safe/.test(await p.locator('[data-zz=securefirst]').innerText()) && await p.getByRole('button', { name: 'Send to dispatch', exact: true }).isDisabled(), 'a "not safe" truck cannot be sent to dispatch');
  await p.keyboard.press('Escape');
  await p.context().close();
  // the switch: with ZZFLAGS.secureStep off the old steps and wrap-up come back
  p = await crew(h, { viewport: PHONE, seed, flags: { secureStep: false } });
  await p.getByRole('button', { name: /All trucks/ }).first().click();
  await wait(p);
  await card(p, '118', 'T970').getByRole('button', { name: 'Give it a door' }).click();
  await wait(p, 500);
  sn = await stepNames();
  t.ok(!sn.includes('Secure the load') && await p.locator('[data-zz=securestep]').count() === 0, 'with ZZFLAGS.secureStep off there is no Secure step (' + sn.join(' / ') + ')');
  await p.context().close();

  /* ================= Russian: 5 tabs fit, pull card words ================= */
  t.section('crew language ru');
  const ru = clone(seed);
  ru.settings.crewMembers.find(c => c.name === 'Roman').lang = 'ru';
  p = await crew(h, { viewport: PHONE, seed: ru });
  const tabFit = await p.$$eval('nav[aria-label=Crew] button span', ss => ss.filter(x => /clamp/.test(x.style.fontSize)).map(x => [x.innerText, x.scrollWidth <= x.clientWidth + 1, x.getBoundingClientRect().height]));
  t.ok(tabFit.length === 5 && tabFit.every(([, fit, hgt]) => fit && hgt < 24), 'Russian: the 5 crew tabs fit on one line at 390 px (' + tabFit.map(x => x[0]).join(' / ') + ')');
  s = await h.text(p);
  t.ok(/Ждёт 4[01]m · цель 30/.test(s) && s.includes('Крепёж'), 'Russian: wait clock and Gear tab in Russian');
  await h.check(p, 'ru-nextjob-390');
  await p.getByRole('button', { name: /Фуры/ }).first().click();
  await wait(p);
  await card(p, '118', 'T970').locator('button').last().click();
  await wait(p, 500);
  s = await h.text(p);
  t.ok(s.includes('Закрепить груз') && s.includes('1. Пересчёт') && s.includes('2. Фото') && /Счёт верный/.test(s), 'Russian: Secure the load step and the pull card words are in Russian');
  await h.check(p, 'ru-truck-390');
  await p.context().close();

  /* ================= hi-vis theme (dark): text on filled colours stays readable ================= */
  t.section('hi-vis theme');
  p = await crew(h, { viewport: PHONE, seed });
  await p.evaluate(() => localStorage.setItem('cd6:theme', 'hivis'));
  await p.reload(); await h.waitLoaded(p); await ready(p);
  await p.getByRole('button', { name: /All trucks/ }).first().click();
  await wait(p);
  await h.check(p, 'hivis-doors-390');
  await card(p, '118', 'T970').locator('button').last().click();
  await wait(p, 500);
  await p.getByRole('button', { name: 'Secure the load', exact: true }).click();
  await wait(p);
  await p.locator('[data-zz=secureform] [data-gear=bars] button[aria-label^="One more"]').click();
  await p.locator('[data-zz=secureform] [data-conf="4"]').click();
  const oursCol = await p.locator('[data-zz=secureform] [data-gear=bars] [data-owner=ours]').evaluate(el => getComputedStyle(el).color);
  t.eq(oursCol, 'rgb(10, 10, 10)', 'hi-vis: a picked toggle has dark text on the bright orange (white would be too faint)');
  await into(p.locator('[data-zz=secureform] [data-gear=bars]'));
  await h.check(p, 'hivis-secure-390');
  await into(p.locator('[data-zz=secureform] [data-conf="4"]'));
  await h.check(p, 'hivis-confidence-390');
  await p.context().close();

  /* ================= office crew tab: phone, shift, rank ================= */
  t.section('office crew logins: phone, shift, rank');
  for (const [vw, viewport] of [['1400', DESK], ['390', PHONE]]) {
    const q = await h.openAs('office', { viewport, seed });
    await q.getByRole('button', { name: 'Crew', exact: true }).first().click();
    await wait(q);
    const row = q.locator('tr').filter({ hasText: 'Roman' }).filter({ has: q.getByRole('button', { name: 'Edit' }) }).first();
    await row.getByRole('button', { name: 'Edit' }).click();
    await wait(q);
    const ed = q.locator('[data-zz=crewedit]');
    const eb = await ed.boundingBox();
    t.ok(eb && eb.x >= 0 && eb.x + eb.width <= viewport.width + 1, `@${vw}: the edit form is fully on screen (x ${Math.round(eb.x)}, width ${Math.round(eb.width)})`);
    await ed.locator('input[type=tel]').fill('775-555-0142');
    await ed.locator('input[type=time]').nth(0).fill('06:00');
    await ed.locator('input[type=time]').nth(1).fill('14:30');
    await ed.locator('input[placeholder="1"]').fill('1');
    await ed.getByRole('button', { name: 'Sat' }).click();
    await segs(h, q, `office-crewedit-${vw}`, { max: 3 });
    await ed.getByRole('button', { name: 'Save', exact: true }).click();
    await wait(q, 500);
    doc = await h.readDoc(q);
    const rm = doc.settings.crewMembers.find(c => c.name === 'Roman');
    t.ok(rm.phone === '775-555-0142' && rm.rank === 1 && rm.pin === '1111' && rm.shift && rm.shift.start === '06:00' && rm.shift.end === '14:30' && JSON.stringify(rm.shift.days) === '[1,2,3,4,5,6]', `@${vw}: zzUpdateCrew saved phone, shift (Mon-Sat) and rank; PIN kept`);
    t.ok(/6:00 AM–2:30 PM · Mon–Sat/.test(await h.text(q)) && /Loads secured/i.test(await h.text(q)), `@${vw}: the logins table shows the shift (Mon–Sat); stats have a Loads secured column`);
    if (vw === '390') {
      const rowS = q.locator('tr').filter({ hasText: 'Sergio' }).filter({ has: q.getByRole('button', { name: 'Edit' }) }).first();
      await rowS.getByRole('button', { name: 'Edit' }).click();
      await wait(q);
      await q.locator('[data-zz=crewedit] input[type=tel]').fill('775-555-0177');
      await q.locator('[data-zz=crewedit]').getByRole('button', { name: 'Save', exact: true }).click();
      await wait(q, 500);
      const sg = (await h.readDoc(q)).settings.crewMembers.find(c => c.name === 'Sergio');
      t.ok(sg.phone === '775-555-0177' && !('rank' in sg), 'saving someone who has no rank does not write rank:null (ZZlead would read it as rank 0)');
    }
    await segs(h, q, `office-crew-${vw}`, { max: 3 });
    if (vw === '1400') {
      const on = await calc(q, (hh, d) => hh.ZZcrewOnShift(d, Date.parse(hh.ZZzonedIso(hh.ZZdockParts(Date.now()).ymd, '10:00'))).map(c => c.name));
      t.ok(Array.isArray(on), 'ZZcrewOnShift reads the new shift (' + JSON.stringify(on) + ')');
    }
    await q.context().close();
  }

  /* ================= desktop screens ================= */
  t.section('desktop (1400) screens');
  p = await crew(h, { viewport: DESK, seed });
  await h.check(p, 'nextjob-1400');
  await p.getByRole('button', { name: /All trucks/ }).first().click();
  await wait(p);
  await segs(h, p, 'alltrucks-1400', { max: 3 });
  await card(p, '118', 'T970').getByRole('button', { name: 'Give it a door' }).click();
  await wait(p);
  await p.getByRole('button', { name: 'Pick a door for this truck' }).click();
  t.eq(await doorCols(p), 5, 'door picker: 5 doors per row on a wide screen, as before');
  await h.check(p, 'doorpicker-1400');
  await p.locator('button[data-door="D6"]').click();
  await wait(p);
  await p.getByRole('button', { name: /^Start/ }).first().click();
  await wait(p, 500);
  await p.getByRole('button', { name: 'Secure the load', exact: true }).click();
  await wait(p);
  await p.locator('[data-zz=secureform] [data-gear=plywood] button[aria-label^="One more"]').click();
  await p.locator('[data-zz=secureform] [data-gear=plywood] button[aria-label^="One more"]').click();
  await p.locator('[data-zz=secureform] input[aria-label="Tag number"]').fill('P-7');
  await p.locator('[data-zz=secureform] [data-zz=tagadd]').click();
  await p.getByRole('button', { name: 'Back' }).first().click();
  await wait(p);
  await p.getByRole('button', { name: /All trucks/ }).first().click();
  await wait(p);
  await card(p, '118', 'T970').locator('button').last().click();
  await wait(p, 500);
  await p.getByRole('button', { name: 'Secure the load', exact: true }).click();
  await wait(p);
  t.ok((await p.locator('[data-zz=secureform] [data-gear=plywood] output').innerText()).trim() === '2' && /P-7/.test(await p.locator('[data-zz=secureform]').innerText()), 'leaving the truck and coming back keeps the half-filled secure form (gear and tags)');
  await segs(h, p, 'secure-form-1400', { max: 5 });
  const pull2 = p.locator('div.rounded-lg.p-3.space-y-3').filter({ hasText: 'PL-3302' }).first();
  await p.getByRole('button', { name: 'Load', exact: true }).click().catch(() => {});
  await wait(p);
  await pull2.locator('[data-zz=dmgadd]').click();
  await wait(p);
  await p.locator('[data-zz=dmg] [data-kind=Wet]').click();
  await segs(h, p, 'dmg-modal-1400', { in: '[data-zz=dmg]' });
  await p.keyboard.press('Escape');
  await wait(p);
  await p.locator('div.rounded-lg.p-3.space-y-3').filter({ hasText: 'PL-3302' }).first().locator('[data-zz=dmgadd]').click();
  await wait(p);
  t.ok(await p.locator('[data-zz=dmg] [data-kind=Wet][aria-pressed=true]').count() === 1, 'closing the damage report by mistake keeps the draft (kind still picked)');
  await p.keyboard.press('Escape');
  await p.context().close();

  p = await crew(h, { viewport: DESK, seed });
  await p.getByRole('button', { name: /^Gear/ }).first().click();
  await wait(p);
  await segs(h, p, 'gear-1400', { max: 3 });
  await p.context().close();
});

function ieq(a, b) { return (Number(a) || 0) === (Number(b) || 0); }
