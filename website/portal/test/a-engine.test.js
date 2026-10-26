/* Stream A0 acceptance (PLAN.md 3.A, everything except the shared-mode checks, which are A1's a-sync.test.js).
     node website/portal/test/run.js a [--dist DIR]
   Part 1 runs build2.py on throw-away copies and checks every refusal. Parts 2+ drive the built page:
   helpers and actions are reached through window.__zz, which the build exposes only when the harness
   sets window.__ZZTEST (patch A08 + ZZa_probe). Data is always read back from localStorage. */
const H = require('./harness');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawnSync } = require('child_process');
const { PHONE, DESK } = H;

const iso = ms => new Date(ms).toISOString();
const MIN = 6e4, HOUR = 36e5, DAY = 864e5;
const clone = o => JSON.parse(JSON.stringify(o));

/* ---------- page helpers ---------- */
async function ready(page) { await page.waitForFunction(() => window.__zz && window.__zz.actions && window.__zz.h, null, { timeout: 10000 }); }
/* run an action in the page; waits for the write; a returned doc comes back as {__doc, rev} */
async function act(page, name, ...args) {
  return page.evaluate(async ([name, args]) => {
    const f = window.__zz.actions[name];
    if (typeof f !== 'function') throw new Error('no action ' + name);
    let r = f(...args);
    if (r && typeof r.then === 'function') r = await r;
    await new Promise(z => setTimeout(z, 250));
    if (r && typeof r === 'object' && Array.isArray(r.trailers)) return { __doc: true, rev: r.rev };
    return r === undefined ? null : r;
  }, [name, args]);
}
/* calc(page, (h, doc, a) => ..., a): run a pure helper against the stored doc */
async function calc(page, fn, a) {
  return page.evaluate(([src, a]) => {
    const f = (0, eval)('(' + src + ')');
    const raw = localStorage.getItem('cdweb:cd6:doc');
    return f(window.__zz.h, raw ? JSON.parse(raw) : null, a);
  }, [fn.toString(), a === undefined ? null : a]);
}

/* ---------- build2 refusals (Node only) ---------- */
function makeCopy() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'build2-check-'));
  const src = H.PORTAL;
  fs.mkdirSync(path.join(dir, 'base'));
  fs.mkdirSync(path.join(dir, 'patches'));
  for (const f of fs.readdirSync(path.join(src, 'base'))) fs.copyFileSync(path.join(src, 'base', f), path.join(dir, 'base', f));
  for (const f of ['build2.py', 'engine-source.js', 'sync-source.js', 'customer-portal-source.js', 'crew-source.js'])
    if (fs.existsSync(path.join(src, f))) fs.copyFileSync(path.join(src, f), path.join(dir, f));
  fs.copyFileSync(path.join(src, 'patches', 'A_engine.py'), path.join(dir, 'patches', 'A_engine.py'));
  return dir;
}
function build(dir, streams, extra = []) {
  const args = [path.join(dir, 'build2.py'), '--out', path.join(dir, 'dist')].concat(streams === null ? [] : ['--streams', streams]).concat(extra);
  const r = spawnSync('python3', args, { encoding: 'utf8' });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

H.main('a-engine', async (h, t) => {
  /* ================= 1. build2 ================= */
  t.section('build2 checks');
  const dir = makeCopy();
  try {
    let r = build(dir, 'A');
    t.ok(r.code === 0 && /node --check app\.js: ok/.test(r.out), 'clean copy builds with --streams A and node --check passes');
    t.ok(/applied A01/.test(r.out) && /applied A20/.test(r.out) && /applied A34/.test(r.out), 'build lists the applied patch ids');
    const js = fs.readFileSync(path.join(dir, 'dist', 'app.js'), 'utf8');
    t.ok(js.includes('var ZZsync') && js.includes('ZZacts=') && js.includes('...ZZacts({S,C,M,N,L,B,w})'), 'dist/app.js holds the engine, the sync source and the A09 spread');
    t.ok(js.includes('bA=8,CQ=') && !/bA=(?!8,)\d/.test(js), 'the doc version bA stays 8 (no migration rewrites saved docs)');
    const html = fs.readFileSync(path.join(dir, 'dist', 'portal.html'), 'utf8');
    t.ok(/<!-- build2 \S+ streams=A -->/.test(html.slice(-200)), 'build2 comment appended after </html>');

    r = build(dir, '');
    t.ok(r.code === 0 && /byte-identical to base\/portal\.base\.html/.test(r.out), 'base-only build (--streams "") is byte-identical to the base');
    r = build(dir, 'A,C,E');
    t.ok(r.code === 0 && /kiosk-source\.js not found/.test(r.out) && /office-source\.js not found/.test(r.out), 'missing optional files (streams not started) are fine');
    r = build(dir, 'B');
    t.ok(r.code === 0 && /warning: building without stream A/.test(r.out), 'a build without A warns that the engine is missing');

    const bad = (file, body) => { fs.writeFileSync(path.join(dir, file), body); };
    const clean = () => { for (const f of ['patches/A_zztest.py', 'patches/C_zztest.py', 'kiosk-source.js', 'office-source.js', 'patches/zz.py']) { try { fs.unlinkSync(path.join(dir, f)); } catch (e) {} } };

    bad('patches/A_zztest.py', "PATCHES=[('A90', r'(0,i.jsx)(', r'(0,i.jsx)(', 'dup anchor')]");
    r = build(dir, 'A');
    t.ok(r.code === 1 && /A90: anchor occurs \d+ times/.test(r.out), 'refuses an anchor that occurs more than once');
    clean();
    bad('patches/A_zztest.py', "PATCHES=[('A90', r'nothing like this anywhere 123', r'x', 'missing anchor')]");
    r = build(dir, 'A');
    t.ok(r.code === 1 && /A90: anchor occurs 0 times/.test(r.out), 'refuses an anchor that is missing');
    clean();
    bad('patches/A_zztest.py', "PATCHES=[('A90', r'storageMonthly:24,afterHours:100', r'storageMonthly:24,afterHours:100', 'overlap')]");
    r = build(dir, 'A');
    t.ok(r.code === 1 && /patches overlap: A19 .* and A90|patches overlap: A90 .* and A19/.test(r.out), 'refuses two patches that touch the same text');
    clean();
    bad('patches/A_zztest.py', "PATCHES=[('A90', r'ZZPHONE=\"916-616-3481\"', r'ZZPHONE=\"1\"', 'inside span')]");
    r = build(dir, 'A');
    t.ok(r.code === 1 && /inside the source span/.test(r.out), 'refuses an anchor inside the customer-portal / crew source span');
    clean();
    bad('patches/A_zztest.py', "PATCHES=[('A19', r'lQ=\"America/Los_Angeles\"', r'lQ=\"America/Los_Angeles\"', 'dup id')]");
    r = build(dir, 'A');
    t.ok(r.code === 1 && /duplicate patch id A19/.test(r.out), 'refuses a duplicate patch id');
    clean();
    bad('patches/C_zztest.py', "PATCHES=[('A91', r'lQ=\"America/Los_Angeles\"', r'lQ=\"America/Los_Angeles\"', 'wrong stream')]");
    r = build(dir, 'A,C');
    t.ok(r.code === 1 && /does not belong to stream C/.test(r.out), 'refuses a patch id from another stream');
    clean();
    bad('kiosk-source.js', 'ZZS=d=>d,\n');
    r = build(dir, 'A,C');
    t.ok(r.code === 1 && /duplicate top-level name ZZS/.test(r.out), 'refuses a duplicate ZZ name (kiosk defines ZZS again)');
    clean();
    bad('office-source.js', 'ZZCP=()=>null,\n');
    r = build(dir, 'A,E');
    t.ok(r.code === 1 && /ZZCP is already defined by the base customer-portal/.test(r.out), 'refuses a name the base already defines (ZZCP)');
    clean();
    bad('office-source.js', 'ZZt10=()=>null,\n');
    r = build(dir, 'A,E');
    t.ok(r.code === 1 && /ZZt10 is already defined by the base bundle/.test(r.out), 'refuses a name defined outside the source span (ZZt10)');
    clean();
    bad('kiosk-source.js', 'ZZk_ok=1,\nfoo=2,\n');
    r = build(dir, 'A,C');
    t.ok(r.code === 1 && /top-level name 'foo' must start with ZZ/.test(r.out), 'refuses a top-level name without the ZZ prefix');
    clean();
    bad('kiosk-source.js', 'const ZZk_x=1;\n');
    r = build(dir, 'A,C');
    t.ok(r.code === 1 && /chain file|const/.test(r.out), 'refuses statements in a chain file');
    clean();
    bad('kiosk-source.js', 'ZZk_x=1+,\n');
    r = build(dir, 'A,C');
    t.ok(r.code === 1 && /node --check/.test(r.out), 'refuses code that node --check rejects');
    clean();
    bad('patches/zz.py', 'PATCHES=[]');
    r = build(dir, 'A');
    t.ok(r.code === 1 && /patch files are named/.test(r.out), 'refuses a patch file that does not name its stream');
    clean();
    bad('kiosk-source.js', 'ZZk_ok=()=>"fine",\n');
    r = build(dir, 'A,C');
    t.ok(r.code === 0 && /sources: .*kiosk-source\.js/.test(r.out), 'a valid new stream file builds');
    clean();
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }

  /* ================= 2. storage layer, probe, badge ================= */
  t.section('storage layer, mode badge, probe');
  {
    const p = await h.openAs('office', { viewport: DESK });
    await ready(p);
    const info = await p.evaluate(() => {
      const s = window.__zz.h.sync;
      return { mode: s.mode, fns: ['start', 'read', 'write', 'seed', 'fresh', 'failed', 'lease', 'photoGet', 'photoSet', 'importLocal'].filter(k => typeof s[k] === 'function'),
        local: !!(window.ZZlocal && window.ZZlocal.get && window.ZZlocal.set), ready: !!window.ZZready };
    });
    t.eq(info.mode, 'local', 'ZZsync.mode is local');
    t.eq(info.fns.length, 10, 'ZZsync has start, read, write, seed, fresh, failed, lease, photoGet, photoSet, importLocal');
    t.ok(info.local && info.ready, 'window.ZZlocal keeps the original storage; window.ZZready is set');
    const more = await p.evaluate(async () => {
      const s = window.__zz.h.sync;
      const fr = s.fresh(), sd = await s.seed(), ls = await s.lease('doors', () => 42), imp = await s.importLocal(), rd = await s.read();
      return { fresh: fr && fr.v, seed: sd && sd.v, lease: ls, imp: imp.ok, read: rd };
    });
    t.ok(more.fresh === 8 && more.seed === 8, 'local fresh() and seed() give the v8 demo doc (tx), as today');
    t.ok(more.lease === 42 && more.imp === false && more.read === null, 'local lease runs the function; importLocal and read are shared-mode only');
    t.ok((await h.text(p)).includes('Saved on this device only'), 'office shows the "Saved on this device only" badge');
    await h.check(p, 'a-engine-office-badge');
    await p.context().close();

    const c = await h.openAs('customer', { viewport: PHONE });
    t.ok(!(await h.text(c)).includes('Saved on this device only'), 'customer screen has no mode badge');
    await c.context().close();
    const cr = await h.openAs('crew', { viewport: PHONE });
    t.ok((await h.text(cr)).includes('Saved on this device only'), 'crew shows the badge');
    await cr.context().close();

    const np = await h.openAs('office', { viewport: PHONE, probe: false });
    t.ok(await np.evaluate(() => window.__zz === undefined), 'without the test flag the probe exposes nothing');
    await np.context().close();
  }

  const base = await h.baseDoc();

  /* ================= 3. helpers ================= */
  t.section('helpers (pure)');
  {
    const p = await h.openAs('office', { viewport: DESK });
    await ready(p);
    const r = await calc(p, (h) => {
      const now = Date.now(), M = 6e4;
      const S0 = h.ZZS({}), S1 = h.ZZS({ settings: { promiseMin: 90, waitGoalMin: '', gearPlan: { price: 2500 } } });
      const code = h.ZZcode({ id: 'abc123' }), code2 = h.ZZcode({ id: 'abc123' }), code3 = h.ZZcode({ id: 'x', code: '0421' });
      // every code but 4242 taken by an active truck; departed / cancelled trucks do not count
      const many = { trailers: [] };
      for (let k = 1000; k < 10000; k++) if (k !== 4242) many.trailers.push({ id: 't' + k, code: String(k), stage: 'scheduled' });
      many.trailers.push({ id: 'gone', code: '4242', stage: 'departed' });
      const free = h.ZZnewCode(many);
      const dz = { trailers: [{ id: 'a', code: '1234', stage: 'scheduled' }, { id: 'b', code: '5678', stage: 'cancelled' }] };
      return {
        S0, S1: [S1.promiseMin, S1.waitGoalMin, S1.gearPlan.price, S1.gearPlan.months],
        active: [h.ZZactive({ stage: 'arrived' }), h.ZZactive({ stage: 'departed' }), h.ZZactive({ stage: 'cancelled' })],
        code: [code, code2, /^\d{4}$/.test(code), code3], free,
        ok: [h.ZZokCode(dz, '1234') !== '1234', h.ZZokCode(dz, '5678'), h.ZZokCode(dz, '12a4') !== '12a4', /^\d{4}$/.test(h.ZZokCode(dz, '12a4'))],
        by: [h.ZZbyCode(dz, '1234') && h.ZZbyCode(dz, '1234').id, h.ZZbyCode(dz, '5678'), h.ZZbyCode(dz, '7788')],
        link: h.ZZetaLink({ id: 'a', code: '4821' }),
        url: [h.ZZsafeUrl(' https://maps.example.com/x?y=1 '), h.ZZsafeUrl('http://maps.example.com'), h.ZZsafeUrl('javascript:alert(1)'), h.ZZsafeUrl('https://a b.com'), h.ZZsafeUrl('https://x.com/' + 'a'.repeat(600))],
        zone: [h.ZZzonedIso('2026-07-01', '08:15'), h.ZZzonedIso('2026-12-01', '08:15'), h.ZZzonedIso('2026-12-01', '23:30'), h.ZZzonedIso('bad', '08:15')],
        parts: [h.ZZdockParts('2026-07-01T15:15:00.000Z'), h.ZZdockParts('2026-12-02T07:30:00.000Z'), h.ZZdockParts(null)],
        week: [h.ZZweekKey(Date.parse('2026-10-28T19:00:00Z')), h.ZZweekKey(Date.parse('2026-11-01T19:00:00Z')), h.ZZweekKey(Date.parse('2026-10-26T08:00:00Z'))],
        tone: [h.ZZtone(10 * M, {}), h.ZZtone(25 * M, {}), h.ZZtone(30 * M, {}), h.ZZtone(null, {}), h.ZZtone(40 * M, { settings: { waitGoalMin: 60 } }), h.ZZtone(50 * M, { settings: { waitGoalMin: 60 } })],
        auto: [h.ZZautoLimit(null), h.ZZautoLimit({}), h.ZZautoLimit({ autoApproveUnder: '' }), h.ZZautoLimit({ autoApproveUnder: 0 }), h.ZZautoLimit({ autoApproveUnder: 'abc' }), h.ZZautoLimit({ autoApproveUnder: '100' })],
        total: [h.ZZestTotal([{ qty: 3, unit: 15 }, { qty: .5, unit: 120 }, { qty: 1, unit: 20, on: false }]), h.ZZestTotal([])],
        consts: [h.ZZFLAGS, h.ZZPUBLIC_URL, h.ZZLANGS.map(l => l.k), h.ZZEVENTS.map(e => e.k), h.ZZGEAR.map(g => g.k), h.ZZSECSLOTS.map(s => s.k), h.ZZDMGKINDS.length, h.ZZALERTS.done, h.ZZALERTS.started]
      };
    });
    t.eq(r.S0, { promiseMin: 120, promiseText: 'Unloaded within 2 hours of check-in', waitGoalMin: 30, gearPlan: { price: 2000, months: 6 } }, 'ZZS defaults');
    t.eq(r.S1, [90, 30, 2500, 6], 'ZZS takes settings, ignores a blank wait goal, merges gearPlan');
    t.eq(r.active, [true, false, false], 'ZZactive');
    t.ok(r.code[0] === r.code[1] && r.code[2] && r.code[3] === '0421', 'ZZcode: t.code, or a stable 4-digit code from the id');
    t.eq(r.free, '4242', 'ZZnewCode finds the only code no active truck uses');
    t.eq(r.ok, [true, '5678', true, true], 'ZZokCode keeps a free 4-digit code, replaces a used or bad one');
    t.eq(r.by, ['a', null, null], 'ZZbyCode finds the active truck only (cancelled trucks and PINs do not match)');
    t.eq(r.link, 'https://claude.ai/artifact/97haWKtJGFGXW8PjdM9XWv#eta4821', 'ZZetaLink uses ZZPUBLIC_URL + #eta<code>');
    t.eq(r.url, ['https://maps.example.com/x?y=1', '', '', '', ''], 'ZZsafeUrl: https only, trimmed, no spaces, at most 500 characters');
    t.eq(r.zone, ['2026-07-01T15:15:00.000Z', '2026-12-01T16:15:00.000Z', '2026-12-02T07:30:00.000Z', null], 'ZZzonedIso: dock time (PDT / PST)');
    t.eq(r.parts, [{ ymd: '2026-07-01', hhmm: '08:15' }, { ymd: '2026-12-01', hhmm: '23:30' }, { ymd: '', hhmm: '' }], 'ZZdockParts');
    t.eq(r.week, ['2026-10-26', '2026-10-26', '2026-10-26'], 'ZZweekKey: Monday in dock time (Sunday evening and Monday 1 AM included)');
    t.eq(r.tone, ['good', 'warn', 'bad', 'neutral', 'good', 'warn'], 'ZZtone against the wait goal (30, then 60)');
    t.eq(r.auto, [null, null, null, null, null, 100], 'ZZautoLimit: a positive number or null');
    t.eq(r.total, [105, 0], 'ZZestTotal skips lines switched off');
    t.eq(r.consts[0], { kiosk2: true, secureStep: true }, 'ZZFLAGS');
    t.eq(r.consts[2], ['en', 'es', 'ru', 'uk', 'pa', 'hi'], 'ZZLANGS');
    t.eq(r.consts[3], ['booked', 'eta', 'arrived', 'waiting', 'started', 'damage', 'done', 'secured', 'friday'], 'ZZEVENTS');
    t.ok(r.consts[4].join() === 'plywood,bars,straps,airbags' && r.consts[5].join() === 'nose,middle,tail,closeup,seal' && r.consts[6] === 7, 'ZZGEAR, ZZSECSLOTS, ZZDMGKINDS');
    t.ok(r.consts[7].email === true && r.consts[7].text === false && r.consts[8].text === false && r.consts[8].email === false, 'ZZALERTS defaults (done by email, started off)');

    // yard, clocks, promise, steps, day load, crew, gear, damage months, week, trail on a crafted doc
    const r2 = await calc(p, (h) => {
      const now = Date.now(), M = 6e4, I = ms => new Date(ms).toISOString(), D = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8'];
      const doc = { settings: { crew: 3 }, rates: {}, customers: [{ id: 'c1', name: 'Secret Co' }, { id: 'c2', name: 'Hidden LLC' }], shipments: [], trailers: [] };
      D.forEach((d, k) => doc.trailers.push({ id: 'door' + k, customerId: 'c2', stage: 'working', dock: d, arrivedAt: I(now - 90 * M), workStartedAt: I(now - 60 * M) }));
      doc.trailers.push({ id: 'y2', customerId: 'c1', stage: 'arrived', dock: 'YD', arrivedAt: I(now - 10 * M) });
      doc.trailers.push({ id: 'y1', customerId: 'c1', stage: 'arrived', dock: null, arrivedAt: I(now - 40 * M) });
      doc.trailers.push({ id: 'done1', customerId: 'c1', stage: 'done', dock: null, arrivedAt: I(now - 80 * M), workStartedAt: I(now - 70 * M), workDoneAt: I(now - 10 * M) });
      const q = h.ZZyardQ(doc).map(x => x.id);
      const steps = st => st.map(s => s.k + ':' + s.state).join(' ');
      const booked = { id: 'b', stage: 'scheduled', createdAt: I(now - M) }, eta = { ...booked, eta: { at: I(now + 30 * M) } };
      const wait = { id: 'w', stage: 'arrived', dock: 'YD', arrivedAt: I(now - 20 * M) }, door = { ...wait, stage: 'at-dock', dock: 'D3', dockedAt: I(now - 5 * M) };
      const work = { ...door, stage: 'working', workStartedAt: I(now - 2 * M), direction: 'outbound' }, fin = { ...work, stage: 'done', workDoneAt: I(now) };
      const pr1 = h.ZZpromise(doc, doc.trailers.find(x => x.id === 'done1'), now), pr2 = h.ZZpromise(doc, { arrivedAt: I(now - 70 * M) }, now);
      return {
        q, place: [h.ZZplace(doc, 'y1'), h.ZZplace(doc, 'y2'), h.ZZplace(doc, 'door0')],
        wait: [Math.round(h.ZZwaitMs(doc.trailers.find(x => x.id === 'y1'), now) / M), Math.round(h.ZZwaitMs(doc.trailers.find(x => x.id === 'done1'), now) / M), h.ZZwaitMs({}, now)],
        est: [h.ZZestWait(doc, 'y1', now), h.ZZestWait(doc, 'y2', now), h.ZZestWait(doc, 'door0', now)],
        pr1: [pr1.doneMin, pr1.kept, pr1.limitMin], pr2: [pr2.elapsedMin, pr2.leftMin, pr2.kept, pr2.deadline === Date.parse(I(now - 70 * M)) + 120 * M],
        steps: [steps(h.ZZtruckSteps(booked, now)), steps(h.ZZtruckSteps(eta, now)), steps(h.ZZtruckSteps(wait, now)), h.ZZtruckSteps(wait, now)[3].label,
          steps(h.ZZtruckSteps(door, now)), h.ZZtruckSteps(door, now)[4].label, steps(h.ZZtruckSteps(work, now)), h.ZZtruckSteps(work, now)[5].label, steps(h.ZZtruckSteps(fin, now)),
          steps(h.ZZtruckSteps({ ...booked, stage: 'cancelled' }, now))]
      };
    });
    t.eq(r2.q, ['y1', 'y2'], 'ZZyardQ: checked in and waiting, oldest first');
    t.eq(r2.place, [1, 2, null], 'ZZplace');
    t.eq(r2.wait, [40, 10, null], 'ZZwaitMs: from check-in to start (or now)');
    t.eq(r2.est, [20, 40, null], 'ZZestWait: no free door, done-today average 60 min over up to 3 doors (#1 about 20, #2 about 40)');
    t.eq(r2.pr1, [70, true, 120], 'ZZpromise: done in 70 min, within 120');
    t.eq(r2.pr2, [70, 50, null, true], 'ZZpromise while working: elapsed, left, kept null, deadline');
    t.eq(r2.steps, [
      'booked:now eta:todo arrived:todo waiting:todo door:todo working:todo done:todo',
      'booked:done eta:now arrived:todo waiting:todo door:todo working:todo done:todo',
      'booked:done eta:done arrived:done waiting:now door:todo working:todo done:todo', 'Waiting 20m',
      'booked:done eta:done arrived:done waiting:done door:now working:todo done:todo', 'At door D3',
      'booked:done eta:done arrived:done waiting:done door:done working:now done:todo', 'Loading',
      'booked:done eta:done arrived:done waiting:done door:done working:done done:done',
      'booked:done eta:todo arrived:todo waiting:todo door:todo working:todo done:todo'], 'ZZtruckSteps for every stage');

    const r3 = await calc(p, (h) => {
      const doc = { settings: { crew: 4 }, customers: [{ id: 'c1', name: 'Secret Co' }], trailers: [
        { id: 'a', customerId: 'c1', carrier: 'Secret Co', stage: 'scheduled', scheduledAt: h.ZZzonedIso('2026-11-03', '08:15') },
        { id: 'b', customerId: 'c1', carrier: 'Secret Co', stage: 'scheduled', scheduledAt: h.ZZzonedIso('2026-11-03', '09:45') },
        { id: 'c', customerId: 'c1', stage: 'cancelled', scheduledAt: h.ZZzonedIso('2026-11-03', '08:30') },
        { id: 'd', customerId: 'c1', stage: 'scheduled', scheduledAt: h.ZZzonedIso('2026-11-03', '23:00') },
        { id: 'e', customerId: 'c1', stage: 'scheduled', scheduledAt: h.ZZzonedIso('2026-11-04', '08:00') }] };
      const L = h.ZZdayLoad(doc, '2026-11-03'), L2 = h.ZZdayLoad(doc, '2026-11-03', 'a');
      const shiftDoc = { settings: { crew: 3, crewMembers: [
        { id: 'm1', name: 'Roman', shift: { start: '06:00', end: '14:30', days: [1, 2, 3, 4, 5] } },
        { id: 'm2', name: 'Night', shift: { start: '22:00', end: '06:00', days: [1] } },
        { id: 'm3', name: 'NoShift' }] } };
      const on = ms => h.ZZcrewOnShift(shiftDoc, Date.parse(ms)).map(c => c.name).join(',');
      return { L, L2: L2.blocks[1].trucks, json: JSON.stringify(L),
        crew: [h.ZZcrewOnShift({ settings: {} }, Date.now()).length, h.ZZcrewOnShift({ settings: { crew: 5 } }, Date.now()).length,
          on(h.ZZzonedIso('2026-10-26', '10:00')), on(h.ZZzonedIso('2026-10-26', '15:00')), on(h.ZZzonedIso('2026-10-31', '10:00')), on(h.ZZzonedIso('2026-10-27', '03:00'))] };
    });
    t.ok(r3.L.total === 3 && r3.L.blocks.length === 8 && r3.L.blocks[1].label === '8–10 AM' && r3.L.blocks[1].trucks === 2 && r3.L.outside === 1, 'ZZdayLoad: 2-hour blocks 6 AM to 10 PM, cancelled trucks left out');
    t.ok(r3.L.blocks[2].label === '10 AM–12 PM' && r3.L.crew === 4 && r3.L.doors === 8 && ['Light', 'Steady', 'Busy'].includes(r3.L.level), 'ZZdayLoad labels, crew and doors');
    t.eq(r3.L2, 1, 'ZZdayLoad leaves out the truck being edited');
    t.ok(!/Secret Co|"c1"|"a"|"b"/.test(r3.json), 'ZZdayLoad has counts only: no company names and no ids');
    t.eq(r3.crew, [3, 5, 'Roman', '', '', 'Night'], 'ZZcrewOnShift: crew count when no shifts are set, then shift windows and days (overnight too)');

    const r4 = await calc(p, (h) => {
      const doc = { zzGear: [
        { id: 'g1', customerId: 'c1', type: 'bars', qty: 2, dir: 'out', tags: ['B-1', 'B-2'], at: '2026-10-01T10:00:00Z' },
        { id: 'g2', customerId: 'c1', type: 'plywood', qty: 6, dir: 'out', tags: [], at: '2026-10-01T10:00:00Z' },
        { id: 'g3', customerId: 'c1', type: 'bars', qty: 1, dir: 'back', tags: ['B-1'], at: '2026-10-05T10:00:00Z' },
        { id: 'g4', customerId: 'c1', type: 'straps', qty: 3, dir: 'back', tags: [], at: '2026-10-06T10:00:00Z' },
        { id: 'g5', customerId: 'c2', type: 'airbags', qty: 4, dir: 'out', tags: [], at: '2026-10-06T10:00:00Z' }] };
      const ship = { id: 's1', customerId: 'c1', exceptions: [
        { id: 'x1', kind: 'Damage', at: '2026-10-03T18:00:00Z', pallets: 2, answer: { status: 'accepted' } },
        { id: 'x2', kind: 'Damage', at: '2026-10-20T18:00:00Z', pallets: 1 },
        { id: 'x3', kind: 'Damage', at: '2026-09-10T18:00:00Z', pallets: 3, answer: { status: 'declined' } },
        { id: 'x4', kind: 'Short', at: '2026-10-10T18:00:00Z' }] };
      const months = h.ZZdmgMonths({ shipments: [ship, { id: 's2', customerId: 'c2', exceptions: [{ id: 'y', kind: 'Damage', at: '2026-10-04T18:00:00Z' }] }] }, 'c1');
      return { g1: h.ZZgearOut(doc, 'c1'), all: h.ZZgearOut(doc, null), months: months.map(m => [m.month, m.reports, m.pallets, m.approved, m.declined, m.open, m.items.map(i => i.x.id).join()]),
        lines: h.ZZdmgLines({ rates: {}, customers: [], shipments: [] }, { customerId: null }, 3) };
    });
    t.eq(r4.g1, { plywood: 6, bars: 1, straps: 0, airbags: 0, tags: ['B-2'] }, 'ZZgearOut per customer: out minus back, never below 0, returned tags removed');
    t.eq(r4.all.airbags, 4, 'ZZgearOut for all customers');
    t.eq(r4.months, [['2026-10', 2, 3, 1, 0, 1, 'x2,x1'], ['2026-09', 1, 3, 0, 1, 0, 'x3']], 'ZZdmgMonths: Damage only, by month, newest first');
    t.eq(r4.lines.map(l => [l.label, l.qty, l.unit, l.on]), [['Rewrap pallet', 3, 15, true], ['Labor, 1 hour', 0.5, 120, true], ['Replacement pallet', 1, 20, false]], 'ZZdmgLines match the ZZEst quick lines (newPallet default 20)');
    await p.context().close();
  }

  /* ================= 4. bookings, loads, codes ================= */
  t.section('bookings and loads');
  {
    const p = await h.openAs('office', { viewport: DESK, seed: base });
    await ready(p);
    const code = await calc(p, (h, doc) => h.ZZnewCode(doc));
    await act(p, 'addTrailer', { id: 'tA1', code, truck: '4521', trailer: 'T1', direction: 'inbound', customerId: 'cu_altex', scheduledAt: iso(Date.now() + DAY),
      bookedVia: 'office', bookedBy: 'Nick', lines: [
        { ref: 'L1', units: { std: 5 }, weight: 1200, pieces: 40, stackable: false, hazmat: true, lane: 'reno' },
        { ref: 'L2', units: { std: 3 }, weight: '800', pieces: '10', stackable: true, lane: 'sac' },
        { ref: '', units: { std: 0 } },
        { ref: 'L3', units: { std: 2 }, lane: 'reno' }] });
    let doc = await h.readDoc(p);
    let tr = doc.trailers.filter(x => x.id === 'tA1');
    t.ok(tr.length === 1 && tr[0].code === code && /^\d{4}$/.test(code), 'addTrailer keeps the chosen id and the free code ' + code);
    t.ok(tr[0].createdAt && Math.abs(Date.parse(tr[0].createdAt) - Date.now()) < 60000 && tr[0].bookedVia === 'office' && tr[0].bookedBy === 'Nick', 'addTrailer sets createdAt; bookedVia / bookedBy pass through');
    let loads = doc.shipments.filter(s => s.trailerInId === 'tA1').sort((a, b) => a.seq - b.seq);
    t.eq(loads.map(s => [s.ref, s.seq, s.weight, s.pieces, s.stackable, s.hazmat]), [['L1', 0, 1200, 40, false, true], ['L2', 1, 800, 10, true, false], ['L3', 2, 0, 0, null, false]],
      'loads carry weight, pieces, stackable, hazmat and seq 0..n-1 (empty row dropped)');
    await act(p, 'addTrailer', { id: 'tA1', truck: 'DUP', direction: 'inbound', customerId: 'cu_altex', scheduledAt: iso(Date.now() + DAY), lines: [{ ref: 'D1', units: { std: 1 } }] });
    doc = await h.readDoc(p);
    t.ok(doc.trailers.filter(x => x.id === 'tA1').length === 1 && !doc.shipments.some(s => s.ref === 'D1'), 'a second submit with the same id adds nothing');
    await act(p, 'addTrailer', { id: 'tA2', code, truck: '4522', direction: 'inbound', customerId: 'cu_altex', scheduledAt: iso(Date.now() + DAY), lines: [] });
    doc = await h.readDoc(p);
    const c2 = doc.trailers.find(x => x.id === 'tA2').code;
    t.ok(/^\d{4}$/.test(c2) && c2 !== code, 'a code already used by an active truck is replaced by a unique one (' + c2 + ')');
    const codes = doc.trailers.filter(x => x.stage !== 'departed' && x.stage !== 'cancelled' && x.code).map(x => x.code);
    t.ok(new Set(codes).size === codes.length, 'active trucks have unique codes');

    await act(p, 'zzAddLoad', 'tA1', { ref: 'L4', lane: 'reno', units: { std: 4 }, weight: 2000, pieces: 12, stackable: false, hazmat: true, po: ' PO9 ', bol: 'B9', notes: ' top only ', dest: 'Sparks, NV' });
    doc = await h.readDoc(p);
    const l4 = doc.shipments.find(s => s.ref === 'L4');
    t.eq([l4.weight, l4.pieces, l4.stackable, l4.hazmat, l4.po, l4.bol, l4.loadNotes, l4.seq, l4.dest], [2000, 12, false, true, 'PO9', 'B9', 'top only', 3, 'Sparks, NV'], 'zzAddLoad copies the load fields, notes and seq (loads already on the truck)');

    await act(p, 'zzReorder', l4.id, 'tA1', -1);
    doc = await h.readDoc(p);
    loads = doc.shipments.filter(s => s.trailerInId === 'tA1').sort((a, b) => a.seq - b.seq);
    t.eq(loads.map(s => s.ref), ['L1', 'L2', 'L4', 'L3'], 'zzReorder swaps seq inside that truck');

    // walk-in through the old action: code, driver language, checkedInBy
    await act(p, 'checkInWalkup', { driver: 'Walt', phone: '', truck: 'W1', trailer: '', direction: 'inbound', units: { std: 2, lg: 0, crate: 0 }, customerId: 'cu_pine', carrier: 'Pine Ridge Freight', driverLang: 'es' });
    doc = await h.readDoc(p);
    const w = doc.trailers.find(x => x.truck === 'W1');
    t.ok(w && /^\d{4}$/.test(w.code) && w.driverLang === 'es' && w.checkedInBy === 'kiosk' && w.arrivedAt, 'checkInWalkup sets a code, driverLang and checkedInBy kiosk');
    await p.context().close();
  }

  /* ================= 5. check-in ================= */
  t.section('check-in');
  {
    const p = await h.openAs('office', { viewport: DESK, seed: base });
    await ready(p);
    let doc = await h.readDoc(p);
    const busy = doc.trailers.filter(x => x.dock && x.dock !== 'YD' && x.stage !== 'departed' && x.stage !== 'cancelled').length;
    const inYard = doc.trailers.filter(x => x.stage === 'arrived' && x.arrivedAt && (!x.dock || x.dock === 'YD')).length;
    t.ok(busy === 8 && inYard >= 1, 'seed: all 8 doors busy, ' + inYard + ' trucks waiting');
    const t44 = doc.trailers.find(x => x.truck === '44');
    let res = await act(p, 'zzKioskIn', t44.id, { driver: 'Ana', phone: '775-555-0199', truck: '44', trailer: 'T44', lang: 'es' });
    t.ok(res && res.dock === 'YD' && res.place === inYard + 1 && res.estMin >= 5 && res.trailerId === t44.id && res.truck === '44', 'zzKioskIn with every door full: yard, #' + res.place + ' in line, about ' + res.estMin + ' min');
    doc = await h.readDoc(p);
    let x44 = doc.trailers.find(x => x.id === t44.id);
    t.ok(x44.stage === 'arrived' && x44.arrivedAt && x44.driverLang === 'es' && x44.checkedInBy === 'kiosk' && x44.driver === 'Ana' && x44.phone === '775-555-0199', 'zzKioskIn saved the details, driverLang and checkedInBy');
    t.ok((x44.history || []).some(e => /Checked in at the kiosk/.test(e.text)) && doc.activity[0].actor === 'Kiosk' && doc.activity[0].kind === 'checkin', 'zzKioskIn adds history and a Kiosk activity line');
    const rev1 = doc.rev, arr1 = x44.arrivedAt;
    res = await act(p, 'zzKioskIn', t44.id, { driver: 'Ana' });
    doc = await h.readDoc(p);
    t.ok(res && res.already === true && res.dock === 'YD' && res.place === inYard + 1, 'zzKioskIn a second time returns already');
    t.ok(doc.trailers.find(x => x.id === t44.id).arrivedAt === arr1 && doc.rev === rev1, 'second zzKioskIn wrote nothing');

    // free a door, then the kiosk gives it right away
    const d3 = doc.trailers.find(x => x.dock === 'D3');
    await act(p, 'patchTrailer', d3.id, { stage: 'departed', dock: null, departedAt: iso(Date.now()) });
    const t74 = doc.trailers.find(x => x.truck === '74');
    res = await act(p, 'zzKioskIn', t74.id, { lang: 'ru' });
    t.ok(res && res.dock === 'D3' && res.place === null && res.estMin === null, 'zzKioskIn gives the first free door (D3)');

    // the old checkIn never checks in twice
    const t129 = doc.trailers.find(x => x.truck === '129');
    res = await act(p, 'checkIn', t129.id);
    doc = await h.readDoc(p);
    const x129 = doc.trailers.find(x => x.id === t129.id);
    t.ok(res && res.dock && !res.already && x129.arrivedAt, 'checkIn checks a booked truck in (' + res.dock + ')');
    const rev2 = doc.rev;
    res = await act(p, 'checkIn', t129.id);
    doc = await h.readDoc(p);
    t.ok(res && res.already === true && doc.trailers.find(x => x.id === t129.id).arrivedAt === x129.arrivedAt && doc.rev === rev2, 'checkIn on a truck already checked in returns {already:true}; arrivedAt and rev unchanged');

    // trail: kiosk check-in shows once, no office activity text
    const trail = await calc(p, (h, doc, id) => h.ZZtrail(doc, id), t44.id);
    t.ok(trail.filter(e => /Checked in/.test(e.text)).length === 1 && !trail.some(e => / checked in to /.test(e.text)), 'ZZtrail shows the check-in once and never reads doc.activity');
    await p.context().close();
  }

  /* ================= 6. damage and auto-approve ================= */
  t.section('damage and auto-approve');
  {
    const seed = clone(base);
    const at = iso(Date.now() - 2 * HOUR);
    const mk = (id, cid, xid) => ({ id, ref: id.toUpperCase(), customerId: cid, trailerInId: null, trailerOutId: null, origin: '', dest: 'Reno, NV', lane: 'reno', units: { std: 5, lg: 0, crate: 0 }, weight: 0, commodity: '',
      status: 'staged', receivedAt: at, shippedAt: null, afterHours: false, rewrapPallets: 0, labor: [], row: 'R01', deliverBy: null, service: null, bol: '', qc: { condition: '', counted: null, note: '' },
      exceptions: xid ? [{ id: xid, kind: 'Damage', note: 'test damage', at, openedBy: 'Roman', resolved: false }] : [], adjustments: [], photoCount: 0, invoiceId: null, chat: [], po: '', loadNotes: '', touches: [] });
    seed.shipments.push(mk('sa1', 'cu_altex', 'xa1'), mk('sa2', 'cu_altex', 'xa2'), mk('sp1', 'cu_pine', 'xp1'), mk('sa3', 'cu_altex', null));
    const p = await h.openAs('office', { viewport: DESK, seed });
    await ready(p);
    const before = await h.readDoc(p);
    const pineRates = JSON.stringify(before.customers.find(c => c.id === 'cu_pine').rates);
    await act(p, 'zzCustomer', 'cu_altex', { autoApproveUnder: 100, rates: {}, pin: '0000', name: 'Hacked', dispatch: false, id: 'zz' });
    let doc = await h.readDoc(p);
    let alt = doc.customers.find(c => c.id === 'cu_altex');
    t.ok(alt.autoApproveUnder === 100 && alt.pin === '7788' && alt.rates === null && alt.name === 'Altex Transportation' && alt.dispatch === true && alt.id === 'cu_altex', 'zzCustomer sets autoApproveUnder; id, name, rates, pin and dispatch are untouched');

    await act(p, 'zzEstLines', 'sa1', 'xa1', [{ id: 'l1', label: 'Rewrap pallet', qty: 3, unit: 15 }]);
    doc = await h.readDoc(p);
    let s = doc.shipments.find(x => x.id === 'sa1'), x = s.exceptions[0];
    t.ok(x.answer && x.answer.status === 'accepted' && x.answer.auto === true && x.answer.total === 45 && /Auto-approved \(your setting: under \$100\)/.test(x.answer.by) && x.est.applied === true, '$45 estimate under a $100 limit is auto-approved');
    t.eq(s.adjustments.map(a => [a.label, a.amount]), [['Damage: Rewrap pallet', 45]], 'auto-approve adds the Damage adjustment, exactly like an accepted answer');
    t.ok((doc.accountChat.cu_altex || []).some(m => /AUTO-APPROVED damage charges of \$45\.00 on #SA1/.test(m.text)), 'auto-approve adds an account-chat note');
    alt = doc.customers.find(c => c.id === 'cu_altex');
    t.ok(alt.rates === null && JSON.stringify(doc.customers.find(c => c.id === 'cu_pine').rates) === pineRates, "customers' rates are unchanged");
    const rev = doc.rev;
    await act(p, 'zzEstLines', 'sa1', 'xa1', [{ label: 'Extra', qty: 1, unit: 10 }]);
    doc = await h.readDoc(p);
    t.ok(doc.rev === rev && doc.shipments.find(q => q.id === 'sa1').exceptions[0].est.lines.length === 1, 'an applied estimate cannot be changed (no write)');

    await act(p, 'zzEstLines', 'sa2', 'xa2', [{ label: 'Rewrap pallet', qty: 10, unit: 15 }]);
    doc = await h.readDoc(p);
    x = doc.shipments.find(q => q.id === 'sa2').exceptions[0];
    t.ok(x.answer === null && !x.est.applied && x.est.lines[0].qty === 10 && x.est.sentAt, '$150 estimate waits for the customer');
    t.ok(doc.shipments.find(q => q.id === 'sa2').adjustments.length === 0, 'nothing is billed while waiting');

    await act(p, 'zzEstLines', 'sp1', 'xp1', [{ label: 'Rewrap pallet', qty: 3, unit: 15 }]);
    doc = await h.readDoc(p);
    x = doc.shipments.find(q => q.id === 'sp1').exceptions[0];
    t.ok(x.answer === null && !x.est.applied, 'with no limit (null, the default) nothing is auto-approved');

    // a customer "call me" answer survives a new estimate; other answers are cleared
    await act(p, 'patchShipment', 'sp1', { exceptions: [{ ...x, answer: { status: 'call', by: 'Pine', at: iso(Date.now()), note: '' } }] });
    await act(p, 'zzEstLines', 'sp1', 'xp1', [{ label: 'Rewrap pallet', qty: 4, unit: 15 }]);
    doc = await h.readDoc(p);
    t.ok(doc.shipments.find(q => q.id === 'sp1').exceptions[0].answer.status === 'call', 'a "call me" answer is kept when the estimate changes');

    // crew damage report: the plain exception from a Damaged count is replaced; 1 photo is refused
    await act(p, 'crewSaveReceiving', 'sa3', { counted: 5, condition: 'Damaged', rewrap: 0 });
    doc = await h.readDoc(p);
    t.ok(doc.shipments.find(q => q.id === 'sa3').exceptions.filter(e => e.kind === 'Damage').length === 1, 'a Damaged count opens the plain Damage exception (today\'s behavior)');
    const rev3 = doc.rev;
    const lines = await calc(p, (h, doc) => h.ZZdmgLines(doc, doc.shipments.find(s => s.id === 'sa3'), 2));
    const refused = await act(p, 'zzReportDamage', 'sa3', { id: 'dmgT1', pallets: 2, kinds: ['Crushed'], what: 'corner', photoCount: 1, lines });
    doc = await h.readDoc(p);
    t.ok(refused === null && doc.rev === rev3, 'zzReportDamage with 1 photo is refused (nothing written)');
    await act(p, 'zzReportDamage', 'sa3', { id: 'dmgT1', pallets: 2, kinds: ['Crushed', 'Torn wrap'], what: 'forks hit the corner', photoCount: 2, lines });
    doc = await h.readDoc(p);
    s = doc.shipments.find(q => q.id === 'sa3');
    const dm = s.exceptions.filter(e => e.kind === 'Damage');
    t.ok(dm.length === 1 && dm[0].id === 'dmgT1' && dm[0].photoOwner === 'dmg:dmgT1' && dm[0].photoCount === 2 && dm[0].pallets === 2 && dm[0].kinds.join() === 'Crushed,Torn wrap', 'with 2 photos it replaces the plain crew exception: exactly one Damage report');
    t.ok(dm[0].est.lines.length === 2 && dm[0].est.lines.every(l => l.id && l.label && l.unit) && s.touches.some(tc => tc.what === 'damage'), 'report keeps the switched-on fix lines and adds a damage touch');
    t.ok(dm[0].answer && dm[0].answer.auto === true && dm[0].answer.total === 90, 'the same auto-approve rule applies to the crew report ($90 under $100)');
    await act(p, 'crewSaveReceiving', 'sa3', { counted: 5, condition: 'Good' });
    doc = await h.readDoc(p);
    t.ok(doc.shipments.find(q => q.id === 'sa3').exceptions.find(e => e.id === 'dmgT1').resolved === false, 'a recount no longer auto-closes a photo report');
    await p.context().close();
  }

  /* ================= 7. securement and gear ================= */
  t.section('securement and gear');
  {
    const p = await h.openAs('crew', { viewport: PHONE, seed: base });
    await ready(p);
    let doc = await h.readDoc(p);
    const out = doc.trailers.find(x => x.truck === '111');   // Sierra Summit pickup, loading at D2
    const good = { gear: { plywood: { qty: 6, owner: 'ours' }, bars: { qty: 2, owner: 'ours' }, straps: { qty: 4, owner: 'driver' }, airbags: { qty: 0, owner: 'ours' } },
      tags: ['B-1', 'B-2'], seal: 'ab123456', photos: { nose: 1, middle: 1, tail: 2, closeup: 1, seal: 1 }, confidence: 4, note: '', checkedRows: true, signature: 'Roman K' };
    const rev = doc.rev;
    const r1 = await act(p, 'zzSecure', out.id, { ...good, photos: { ...good.photos, seal: 0 } });
    const r2 = await act(p, 'zzSecure', out.id, { ...good, signature: ' ' });
    const r3 = await act(p, 'zzSecure', out.id, { ...good, confidence: 2, note: '' });
    const r4 = await act(p, 'zzSecure', out.id, { ...good, checkedRows: false });
    doc = await h.readDoc(p);
    t.ok(r1 === null && r2 === null && r3 === null && r4 === null && doc.rev === rev && !doc.trailers.find(x => x.id === out.id).secure, 'zzSecure refuses without 5 photos, without a signature, at confidence 2 with no note, or rows unchecked');
    await act(p, 'zzSecure', out.id, good);
    doc = await h.readDoc(p);
    const tr = doc.trailers.find(x => x.id === out.id);
    t.ok(tr.secure && tr.secure.signedBy === 'Roman' && tr.secure.signedAt && tr.secure.confidence === 4 && tr.sealOut === 'AB123456' && tr.secure.photos.tail === 2, 'zzSecure saves the report, signedBy / signedAt and sealOut in capitals');
    t.ok(tr.history.some(e => e.text === 'Load secured: 4/5, seal AB123456'), 'history line "Load secured: 4/5, seal ..."');
    let rows = (doc.zzGear || []).filter(g => g.trailerId === out.id);
    t.eq(rows.map(g => [g.type, g.qty, g.dir, g.src, g.customerId, g.tags.join()]).sort(), [['bars', 2, 'out', 'secure', out.customerId, 'B-1,B-2'], ['plywood', 6, 'out', 'secure', out.customerId, '']], 'gear "out" rows only for gear marked ours (tags on the bars row)');
    await act(p, 'zzSecure', out.id, { ...good, gear: { ...good.gear, bars: { qty: 2, owner: 'driver' } }, confidence: 3, note: 'one more strap' });
    doc = await h.readDoc(p);
    rows = (doc.zzGear || []).filter(g => g.trailerId === out.id);
    t.eq(rows.map(g => [g.type, g.tags.join()]), [['plywood', 'B-1,B-2']], 'securing again rewrites this truck\'s secure rows (tags move to the first "ours" row)');
    const before = await calc(p, (h, doc, cid) => h.ZZgearOut(doc, cid), out.customerId);
    await act(p, 'zzGear', { customerId: out.customerId, type: 'plywood', qty: 2, dir: 'back', tags: ['B-1'], note: 'returned' });
    const after = await calc(p, (h, doc, cid) => h.ZZgearOut(doc, cid), out.customerId);
    doc = await h.readDoc(p);
    const last = doc.zzGear[doc.zzGear.length - 1];
    t.ok(before.plywood === 6 && after.plywood === 4 && after.tags.join() === 'B-2' && last.src === 'return' && last.by === 'Roman' && last.id, 'zzGear logs a return (src return): totals drop and the returned tag is gone');
    const bad = await act(p, 'zzGear', { customerId: out.customerId, type: 'pallets', qty: 1, dir: 'back' });
    t.ok(bad === null, 'zzGear refuses an unknown gear type');
    await p.context().close();
  }

  /* ================= 8. settings, small actions, sign-in, outbox ================= */
  t.section('settings, small actions, sign-in, messages');
  {
    const seed = clone(base);
    const altex = seed.customers.find(c => c.id === 'cu_altex');
    altex.contacts = [
      { id: 'k1', name: 'Dee Dispatch', role: 'Dispatch', phone: '', email: 'dee@altex.example', alerts: { done: { text: false, email: true }, booked: { text: false, email: true } } },
      { id: 'k2', name: 'Sam Owner', role: 'Owner', phone: '775-555-0123', email: 'sam@altex.example', alerts: { done: { text: false, email: false }, arrived: { text: true, email: false } } }];
    const now = Date.now();
    seed.trailers.push({ id: 'tM1', carrier: 'Altex Transportation', driver: 'Al', phone: '', truck: '4521', trailer: 'T9', direction: 'inbound', customerId: 'cu_altex', needsMatch: false,
      scheduledAt: iso(now - 2 * HOUR), dock: null, stage: 'done', arrivedAt: iso(now - 80 * MIN), dockedAt: iso(now - 75 * MIN), workStartedAt: iso(now - 70 * MIN), workDoneAt: iso(now - 10 * MIN),
      departedAt: null, sealIn: '', sealOut: '', sealVerified: null, notes: '', chat: [], instructions: '', workStartedBy: 'Roman', workDoneBy: 'Roman', afterPhotoCount: 3, code: '6006', createdAt: iso(now - DAY) });
    seed.trailers.push({ id: 'tOld', carrier: 'Altex Transportation', truck: '9999', direction: 'inbound', customerId: 'cu_altex', stage: 'departed', arrivedAt: iso(now - 21 * DAY), workStartedAt: iso(now - 21 * DAY + 10 * MIN),
      workDoneAt: iso(now - 20 * DAY), departedAt: iso(now - 20 * DAY), chat: [] });
    seed.shipments.push({ id: 'sM1', ref: 'M-1', customerId: 'cu_altex', trailerInId: 'tM1', trailerOutId: null, units: { std: 22, lg: 0, crate: 0 }, receivedAt: iso(now - 60 * MIN), qc: { condition: 'Good', counted: 22, note: '' },
      exceptions: [], adjustments: [], photoCount: 3, chat: [], touches: [], lane: 'reno', status: 'staged' });
    seed.settings.showLogins = false;
    const p = await h.openAs('office', { viewport: DESK, seed });
    await ready(p);

    const msgs = await calc(p, (h, doc) => h.ZZmsgs(doc, Date.now()).map(m => ({ id: m.id, ev: m.event, ch: m.channel, to: m.to, toName: m.toName, subject: m.subject, body: m.body, trailerId: m.trailerId, deliverable: m.deliverable })));
    const done = msgs.filter(m => m.ev === 'done' && m.trailerId === 'tM1');
    t.ok(done.length === 1 && done[0].id === 'done:tM1:0:email' && done[0].to === 'dee@altex.example' && done[0].ch === 'email' && done[0].deliverable, "a 'done' email for the contact who chose done by email");
    t.ok(!msgs.some(m => m.ev === 'done' && /sam@|775-555-0123/.test(m.to)), "no 'done' message for the contact who did not choose it");
    t.ok(/22 of 22 pallets counted against the BOL, 6 photos, 0 damage reports\. 1h 10m, within our 2-hour promise\./.test(done[0].body) && done[0].subject === 'Done: truck 4521', 'done text: pallets against the BOL, photos, damage reports, time against the promise');
    t.ok(msgs.some(m => m.id === 'arrived:tM1:1:sms' && m.to === '775-555-0123'), "contact's own choice (arrived by text) is honored");
    t.ok(!msgs.some(m => m.trailerId === 'tOld'), 'only the last 14 days are listed');
    const drv = await p.evaluate(() => {
      // stream C's real ZZdriverText when the build has it (the probe passes it on); a stand-in only when there is none
      const real = typeof window.__zz.h.ZZdriverText === 'function';
      if (!real) window.ZZdriverText = (l, k, v) => `[${l}] ${k} ${v.truck} ${v.dock}`;
      const d = JSON.parse(localStorage.getItem('cdweb:cd6:doc'));
      const t52 = d.trailers.find(x => x.truck === '52');
      t52.driverLang = 'es';
      const m = window.__zz.h.ZZmsgs(d, Date.now()).filter(x => x.event === 'driver');
      const want = real ? window.__zz.h.ZZdriverText('es', 'door', { driver: t52.driver || '', truck: '52', dock: 'D5', time: '' }) : '[es] door 52 D5';
      // and none without it: no ZZdriverText (stand-in removed), or the driver's language is English
      if (!real) delete window.ZZdriverText; else t52.driverLang = 'en';
      return { real, want, got: m.map(x => [x.id, x.body, x.lang, x.channel]), none: window.__zz.h.ZZmsgs(d, Date.now()).filter(x => x.event === 'driver').length };
    });
    t.ok(typeof drv.want === 'string' && drv.want.includes('52') && drv.want.includes('D5'), 'driver text for the door (' + (drv.real ? "stream C's ZZdriverText" : 'stand-in') + '): ' + drv.want);
    t.eq([drv.got, drv.none], [[['sms:door:zzt2:D5:es', drv.want, 'es', 'sms']], 0], 'a translated driver text is added when driverLang is not English and ZZdriverText exists (none in English or without it)');
    const outbox = await calc(p, (h, doc) => h.pQ(doc, Date.now()).map(m => m.id));
    t.ok(outbox.includes('done:tM1:0:email') && outbox.some(id => id.startsWith('sms:')), 'the existing outbox (pQ) lists the new messages next to the old ones');
    await p.getByRole('button', { name: 'Setup' }).click();
    await p.waitForTimeout(400);
    const setupText = await h.text(p);
    t.ok(setupText.includes('Done: truck 4521'), 'Setup -> Outbox shows the done email');
    await p.getByText('Done: truck 4521').first().scrollIntoViewIfNeeded();
    await h.check(p, 'a-engine-setup-outbox');

    // test-mode login list: Setup button, then the sign-in page
    t.ok(/Logins card on the sign-in page[\s\S]{0,200}Show it/.test(setupText), 'Setup shows "Show it" while the test-mode login list is off');
    await p.getByRole('button', { name: 'Show it' }).click();
    await p.waitForTimeout(400);
    let doc = await h.readDoc(p);
    t.ok(doc.settings.showLogins === true && (await h.text(p)).includes('Hide it'), 'one tap in Setup switches it on');

    // small actions
    await act(p, 'zzSettings', { waitGoalMin: 45, promiseMin: 90, admins: [], crewMembers: [], rates: { newPallet: 25 } });
    doc = await h.readDoc(p);
    t.ok(doc.settings.waitGoalMin === 45 && doc.settings.promiseMin === 90 && doc.settings.admins.length === 2 && doc.settings.crewMembers.length === 3 && doc.rates.newPallet === 25 && doc.rates.rewrap === 15, 'zzSettings merges settings and rates, never admins or crewMembers');
    const t23 = doc.trailers.find(x => x.truck === '23N');
    await act(p, 'zzConfirm', t23.id);
    await act(p, 'zzConfirm', t23.id);
    await act(p, 'zzEta', t23.id, { at: Date.now() + 40 * MIN, source: 'client', note: 'traffic' });
    await act(p, 'zzTrack', t23.id, { tracking: 'samsara', trackUrl: 'http://bad.example.com' });
    await act(p, 'zzTrack', t23.id, { tracking: 'samsara', trackUrl: 'https://cloud.samsara.com/o/1/fleet/viewer/abc' });
    await act(p, 'zzLog', t23.id, 'Time changed to 9:15 AM', { scheduledAt: iso(Date.now() + DAY), id: 'evil' });
    doc = await h.readDoc(p);
    let x = doc.trailers.find(q => q.id === t23.id);
    t.ok(x.confirmedAt && x.confirmedBy === 'Nick' && x.history.filter(e => e.text === 'Time confirmed').length === 1, 'zzConfirm sets confirmedAt / confirmedBy once');
    t.ok(x.eta && x.eta.source === 'client' && x.eta.note === 'traffic' && x.eta.updatedAt && x.history.some(e => /^ETA now .* \(customer\) · traffic$/.test(e.text)), 'zzEta sets eta {at, source, updatedAt, by, note} and a history line');
    t.ok(x.tracking === 'samsara' && x.trackUrl === 'https://cloud.samsara.com/o/1/fleet/viewer/abc', 'zzTrack refuses http:// and saves https://');
    t.ok(x.id === t23.id && x.history.some(e => e.text === 'Time changed to 9:15 AM') && x.history.every(e => e.id && e.at), 'zzLog merges the patch (never the id) and adds a history line');
    const tM1 = doc.trailers.find(q => q.id === 'tM1');
    const revE = doc.rev;
    await act(p, 'zzEta', 'tM1', { at: Date.now() + 5 * MIN, source: 'driver' });
    doc = await h.readDoc(p);
    t.ok(doc.rev === revE && !doc.trailers.find(q => q.id === 'tM1').eta, 'zzEta does nothing once the truck checked in');
    const noCode = doc.trailers.find(q => !q.code && q.stage === 'scheduled');
    await act(p, 'zzEnsureCode', noCode.id);
    doc = await h.readDoc(p);
    t.ok(/^\d{4}$/.test(doc.trailers.find(q => q.id === noCode.id).code), 'zzEnsureCode gives an older truck a code');

    const wk = await calc(p, h => h.ZZweekKey(Date.now()));
    const entries = [{ customerId: 'cu_altex', channel: 'email', to: 'dee@altex.example', toName: 'Dee', subject: 'Your week', body: 'x' },
      { customerId: 'cu_altex', channel: 'email', to: 'sam@altex.example', toName: 'Sam', subject: 'Your week', body: 'x' },
      { customerId: 'cu_pine', channel: 'email', to: 'ops@pineridge.example', toName: 'Ops', subject: 'Your week', body: 'y' }];
    const n1 = await act(p, 'zzQueueFriday', wk, entries);
    const n2 = await act(p, 'zzQueueFriday', wk, entries);
    doc = await h.readDoc(p);
    t.ok(n1 === 3 && n2 === 0 && doc.zzOutbox.length === 3 && doc.zzOutbox.every(o => o.event === 'friday' && o.week === wk && o.id && o.trailerId === null), 'zzQueueFriday queues once per customer per week (second click queues 0)');
    const wkStats = await calc(p, (h, doc) => h.ZZweek(doc, 'cu_altex', Date.now()));
    t.ok(typeof wkStats.trucks === 'number' && wkStats.done >= 1 && typeof wkStats.promiseKeptPct === 'number' && wkStats.gearOut && wkStats.from, 'ZZweek gives the week so far');
    const trail = await calc(p, (h, doc) => h.ZZtrail(doc, 'tM1'));
    t.ok(trail.some(e => /^Received M-1: counted 22 of 22/.test(e.text) && e.sid === 'sM1') && trail.some(e => /^Done \(unloaded in 1h 0m\)$/.test(e.text)) && trail.every((e, k) => !k || Date.parse(trail[k - 1].at) <= Date.parse(e.at)), 'ZZtrail lists truck and load events in time order');
    const rc = await calc(p, (h, doc) => [h.ZZrecips(doc.customers.find(c => c.id === 'cu_altex'), 'done').map(r => r.email + ':' + r.channels.join('+')),
      h.ZZrecips(doc.customers.find(c => c.id === 'cu_pine'), 'done').map(r => r.email + ':' + r.channels.join('+')), h.ZZrecips(doc.customers.find(c => c.id === 'cu_pine'), 'arrived').length]);
    t.eq(rc, [['dee@altex.example:email'], ['ops@pineridge.example:email'], 0], 'ZZrecips: contacts by their choices; with no contacts, email to customer.contact for done (not for arrived)');
    await p.context().close();

    // sign-in page: list hidden by default, shown with showLogins === true
    let c = await h.open('#customer', { viewport: PHONE, seed: base });
    t.ok(!(await h.text(c)).includes('Test mode: open an account without a PIN'), 'test-mode login list is hidden by default');
    await h.check(c, 'a-engine-signin-hidden');
    await c.context().close();
    const on = clone(base); on.settings.showLogins = true;
    c = await h.open('#office', { viewport: PHONE, seed: on });
    t.ok((await h.text(c)).includes('Test mode: open an account without a PIN'), 'test-mode login list shows when settings.showLogins === true');
    await c.context().close();
  }

  /* ================= 9. demo, rates, photos, storage full ================= */
  t.section('demo, rates, photos, storage full');
  {
    const cleared = clone(base);
    Object.assign(cleared, { customers: [], trailers: [], shipments: [], invoices: [], chat: [], accountChat: {}, demoCleared: true });
    delete cleared.zzT10;
    let p = await h.openAs('office', { viewport: DESK, seed: cleared });
    await ready(p);
    const raw0 = JSON.stringify(cleared);
    const shown = await p.evaluate(() => window.__zz.doc.trailers.length);
    t.ok(shown === 0 && (await h.readDocRaw(p)) === raw0, 'a cleared demo does not come back (and nothing is written)');
    await p.context().close();
    const notCleared = clone(cleared); delete notCleared.demoCleared;
    p = await h.openAs('office', { viewport: DESK, seed: notCleared });
    await ready(p);
    t.ok(await p.evaluate(() => window.__zz.doc.trailers.length) > 0, '(control: without demoCleared the demo trucks are injected, as today)');
    await p.context().close();

    p = await h.openAs('office', { viewport: DESK, seed: base });
    await ready(p);
    const rate = await calc(p, (h, doc) => h.Ln(doc, 'cu_altex').newPallet);
    t.eq(rate, 20, 'rate defaults include newPallet 20');

    // photo purge keeps dmg: and sec: photos past 30 days
    const old = new Date(Date.now() - 40 * DAY).toISOString(), fresh = new Date().toISOString();
    const kept = await p.evaluate(async ([old, fresh]) => {
      const put = (k, v) => localStorage.setItem('cdweb:cd6:photos:' + k, JSON.stringify(v));
      const ph = at => ({ id: Math.random().toString(36).slice(2), src: 'data:image/png;base64,iVBORw0KGgo=', at });
      put('dmg:x1', [ph(old), ph(fresh)]); put('sec:t1:nose', [ph(old)]); put('row:s1', [ph(old), ph(fresh)]);
      const L = window.__zz.h.photos.ls;
      return [(await L('dmg:x1')).length, (await L('sec:t1:nose')).length, (await L('row:s1')).length];
    }, [old, fresh]);
    t.eq(kept, [2, 1, 1], 'photo purge keeps dmg: and sec: photos; other photos still expire after 30 days');

    // storage full: the banner says so; a later good save clears it
    await p.evaluate(() => {
      window.__realSet = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        if (String(k).startsWith('cdweb:cd6:')) throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
        return window.__realSet.call(this, k, v);
      };
    });
    let doc = await h.readDoc(p);
    const t23 = doc.trailers.find(x => x.truck === '23N');
    await act(p, 'zzConfirm', t23.id);
    await p.waitForTimeout(300);
    let s = await h.text(p);
    t.ok(/Storage on this device is full: your last change was NOT saved/.test(s), 'storage full: the red banner says the change was not saved');
    await h.check(p, 'a-engine-storage-full');
    doc = await h.readDoc(p);
    t.ok(!doc.trailers.find(x => x.id === t23.id).confirmedAt, '(the change really was not stored)');
    await p.evaluate(() => window.__zz.h.photos.ex('dmg:full', [{ id: 'p1', src: 'data:image/png;base64,AA', at: new Date().toISOString() }]));
    await p.waitForTimeout(200);
    t.ok(/Photo NOT saved: storage on this device is full/.test(await h.text(p)), 'a photo that cannot be saved shows in the banner too');
    await p.evaluate(() => { Storage.prototype.setItem = window.__realSet; });
    await act(p, 'zzConfirm', t23.id);
    await p.waitForTimeout(300);
    s = await h.text(p);
    doc = await h.readDoc(p);
    t.ok(doc.trailers.find(x => x.id === t23.id).confirmedAt && !/Storage on this device is full/.test(s), 'the next good save clears the storage banner');
    t.ok(h.consoleErrors.some(e => /commit failed/.test(e)), '(the failed commit was also logged to the console, as before)');
    await p.context().close();
  }

  /* ================= 9b. one write per action, privacy, time zones, flags ================= */
  t.section('one write per action, privacy, time zones, flags');
  {
    const seed = clone(base);
    const at = iso(Date.now() - 2 * HOUR);
    const ld = (id, cid, tin, tout, xs) => ({ id, ref: id.toUpperCase(), customerId: cid, trailerInId: tin, trailerOutId: tout, dest: 'Reno, NV', lane: 'reno', units: { std: 4, lg: 0, crate: 0 },
      status: 'staged', receivedAt: at, shippedAt: null, rewrapPallets: 0, row: 'R02', qc: { condition: '', counted: null, note: '' }, exceptions: xs || [], adjustments: [], photoCount: 0, chat: [], touches: [] });
    seed.trailers.push({ id: 'tIn', truck: 'IN1', direction: 'inbound', customerId: 'cu_altex', stage: 'done', arrivedAt: iso(Date.now() - 3 * HOUR), workStartedAt: at, workDoneAt: iso(Date.now() - HOUR), chat: [] },
      { id: 'tOut', truck: 'OUT1', direction: 'outbound', customerId: 'cu_altex', stage: 'scheduled', scheduledAt: iso(Date.now() + DAY), chat: [] },
      { id: 'tGap', truck: 'GAP', direction: 'inbound', customerId: 'cu_altex', stage: 'scheduled', scheduledAt: iso(Date.now() + DAY), chat: [] });
    seed.shipments.push(ld('both', 'cu_altex', 'tIn', 'tOut', [{ id: 'xBoth', kind: 'Damage', note: 'crushed', at, openedBy: 'Roman', resolved: false }]),
      ld('other', 'cu_pine', 'tIn', null, []), ld('gap0', 'cu_altex', 'tGap', null, []), Object.assign(ld('gap2', 'cu_altex', 'tGap', null, []), { seq: 2 }),
      Object.assign(ld('ord0', 'cu_altex', 'tOut2', null, []), { seq: 0 }), Object.assign(ld('ord1', 'cu_altex', 'tOut2', null, []), { seq: 1 }));
    seed.trailers.push({ id: 'tOut2', truck: 'ORD', direction: 'inbound', customerId: 'cu_altex', stage: 'scheduled', scheduledAt: iso(Date.now() + DAY), chat: [] });
    seed.shipments.find(x => x.id === 'gap0').seq = 0;
    seed.activity.unshift({ id: 'secret', ts: iso(Date.now()), actor: 'Office', kind: 'note', text: 'SECRET-ACTIVITY-TEXT' });
    const p = await h.openAs('office', { viewport: DESK, seed });
    await ready(p);
    await p.evaluate(() => {
      window.__w = 0; const real = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) { if (k === 'cdweb:cd6:doc') window.__w++; return real.call(this, k, v); };
    });
    const writes = async (name, ...args) => { const b = await p.evaluate(() => window.__w); await act(p, name, ...args); return (await p.evaluate(() => window.__w)) - b; };
    let doc = await h.readDoc(p);
    const t23 = doc.trailers.find(x => x.truck === '23N'), t44 = doc.trailers.find(x => x.truck === '44');
    const plan = [
      ['zzLog', [t23.id, 'Time changed', { notes: 'x' }], 1], ['zzLog', ['nope', 'x'], 0],
      ['zzEta', [t23.id, { at: Date.now() + HOUR, source: 'driver' }], 1], ['zzEta', [t23.id, { at: 'not a time' }], 0],
      ['zzTrack', [t23.id, { tracking: 'gps', trackUrl: 'https://gps.example.com/a' }], 1], ['zzTrack', [t23.id, { trackUrl: 'ftp://x' }], 0], ['zzTrack', [t23.id, {}], 0],
      ['zzConfirm', [t23.id], 1], ['zzConfirm', [t23.id], 0],
      ['zzCustomer', ['cu_pine', { fridaySummary: false }], 1], ['zzCustomer', ['cu_pine', { rates: {}, pin: '1' }], 0],
      ['zzSettings', [{ promiseMin: 100 }], 1], ['zzSettings', [{ admins: [], rates: {} }], 0],
      ['zzEstLines', ['both', 'xBoth', [{ label: 'Rewrap pallet', qty: 2, unit: 15 }]], 1], ['zzEstLines', ['both', 'nope', []], 0],
      ['zzReportDamage', ['other', { id: 'rdX', photoCount: 2, pallets: 1, kinds: ['Wet'] }], 1], ['zzReportDamage', ['other', { id: 'rdX', photoCount: 2 }], 0],
      ['zzGear', [{ customerId: 'cu_altex', type: 'bars', qty: 1, dir: 'out' }], 1], ['zzGear', [{ customerId: 'cu_altex', type: 'bars', qty: 0, dir: 'out' }], 0],
      ['zzKioskIn', [t44.id, { driver: 'Z' }], 1], ['zzKioskIn', [t44.id, { driver: 'Z' }], 0], ['zzKioskIn', ['nope', {}], 0],
      ['zzQueueFriday', ['2026-10-26', [{ customerId: 'cu_altex', to: 'a@b.c', subject: 's', body: 'b' }]], 1], ['zzQueueFriday', ['2026-10-26', [{ customerId: 'cu_altex', to: 'a@b.c' }]], 0],
      ['zzReorder', ['ord0', 'tOut2', 'up'], 0], ['zzReorder', ['ord0', 'tOut2', 'down'], 1]];
    const got = [];
    for (const [name, args, want] of plan) { const n = await writes(name, ...args); got.push(n === want ? 'ok' : name + '(' + JSON.stringify(args).slice(0, 40) + ') wrote ' + n + ', want ' + want); }
    t.eq(got.filter(x => x !== 'ok'), [], 'every accepted action saves in exactly one write; refused calls write nothing (' + plan.length + ' calls)');

    // zzAddLoad: seq goes after the loads already on the truck, even with a gap (0, 2 -> 3)
    await act(p, 'zzAddLoad', 'tGap', { ref: 'GAP3', lane: 'reno', units: { std: 1 } });
    doc = await h.readDoc(p);
    t.eq(doc.shipments.find(x => x.ref === 'GAP3').seq, 3, 'zzAddLoad seq follows the highest seq on the truck (no duplicate order numbers)');
    // addTrailer with a blank id still gets an id
    await act(p, 'addTrailer', { id: null, truck: 'NOID', direction: 'inbound', customerId: 'cu_altex', scheduledAt: iso(Date.now() + DAY), lines: [] });
    doc = await h.readDoc(p);
    const noid = doc.trailers.find(x => x.truck === 'NOID');
    t.ok(noid && typeof noid.id === 'string' && noid.id.length > 3, 'addTrailer with id:null still gives the truck an id');

    const r = await calc(p, (h, doc) => {
      const m = h.ZZmsgs(doc, Date.now()), dmg = m.filter(x => x.event === 'damage' && /xBoth/.test(x.id));
      const trail = JSON.stringify(doc.trailers.map(t => h.ZZtrail(doc, t.id)));
      const inTrail = h.ZZtrail(doc, 'tIn').map(e => e.text).join(' | ');
      const d = JSON.parse(JSON.stringify(doc)); d.settings.crewMembers[0].shift = { start: '00:00', end: '23:59', days: [0, 1, 2, 3, 4, 5, 6] };
      return { dmg: dmg.map(x => x.id), ids: m.length - new Set(m.map(x => x.id)).size, secret: /SECRET-ACTIVITY-TEXT/.test(trail), other: /OTHER/.test(inTrail), crew: JSON.stringify(h.ZZcrewOnShift(d, Date.now())),
        zone: [h.ZZzonedIso('2026-02-30', '10:00'), h.ZZzonedIso('2026-10-26', '24:00'), h.ZZzonedIso('2026-10-26', '9:75'), h.ZZzonedIso('2026-10-26', '9:05')] };
    });
    t.eq(r.dmg, ['damage:xBoth:0:email'], 'a damage report on a load that sits on an inbound and a pickup truck is listed once');
    t.ok(r.ids === 0, 'ZZmsgs ids are unique');
    t.ok(!r.secret, 'ZZtrail never shows doc.activity text');
    t.ok(!r.other, "a truck's trail leaves out another company's load on the same truck");
    t.ok(/Roman/.test(r.crew) && !/"pin"/.test(r.crew), 'ZZcrewOnShift hands out crew members without their PIN');
    t.eq(r.zone, [null, null, null, '2026-10-26T16:05:00.000Z'], 'ZZzonedIso refuses a day or time that does not exist');
    await p.context().close();

    // dock time does not depend on the browser's own time zone; round trip every 15 minutes across both DST days
    for (const tz of ['America/New_York', 'Asia/Kolkata']) {
      const q = await h.openAs('office', { viewport: DESK, timezoneId: tz });
      await ready(q);
      const z = await calc(q, h => {
        const bad = [];
        for (const d of ['2026-03-08', '2026-11-01', '2026-10-26']) for (let mm = 0; mm < 1440; mm += 15) {
          const hhmm = String(mm / 60 | 0).padStart(2, '0') + ':' + String(mm % 60).padStart(2, '0'), gap = d === '2026-03-08' && hhmm >= '02:00' && hhmm < '03:00';
          const iso = h.ZZzonedIso(d, hhmm), back = h.ZZdockParts(iso);
          if (!iso || (!gap && (back.ymd !== d || back.hhmm !== hhmm))) bad.push(d + ' ' + hhmm);
        }
        return { bad, tz: Intl.DateTimeFormat().resolvedOptions().timeZone, a: h.ZZzonedIso('2026-11-01', '01:30'), wk: h.ZZweekKey(Date.parse('2026-11-02T07:30:00Z')) };
      });
      t.ok(z.bad.length === 0 && z.a === '2026-11-01T08:30:00.000Z' && z.wk === '2026-10-26', `dock-time helpers round-trip across DST with the browser in ${z.tz} (${z.bad.slice(0, 3).join(', ')})`);
      await q.context().close();
    }

    // the test-only flag override reaches ZZFLAGS (regression uses it for the old kiosk)
    const f = await h.openAs('office', { viewport: DESK, flags: { kiosk2: false, nonsense: 1 } });
    await ready(f);
    t.eq(await f.evaluate(() => window.__zz.h.ZZFLAGS), { kiosk2: false, secureStep: true }, 'harness flags override ZZFLAGS in tests (only known switches)');
    await f.context().close();
  }

  /* ================= 11. integration fixes (cross-stream requests) ================= */
  t.section('integration: check-in that does not save, booked text, original booked time, customer reorder, short/over reason, rewrap billed once, kiosk banner');
  {
    const seed = clone(base);
    const now = Date.now();
    const tr = o => ({ carrier: 'Altex Transportation', driver: '', phone: '', trailer: '', direction: 'inbound', customerId: 'cu_altex', needsMatch: false, stage: 'scheduled', dock: null,
      arrivedAt: null, dockedAt: null, workStartedAt: null, workDoneAt: null, departedAt: null, chat: [], history: [], ...o });
    seed.trailers.push(tr({ id: 'tNC', truck: '8801', scheduledAt: iso(now + 5 * HOUR), confirmedAt: iso(now - HOUR), createdAt: iso(now - 2 * HOUR) }));
    seed.trailers.push(tr({ id: 'tYC', truck: '8802', code: '4455', scheduledAt: iso(now + 5 * HOUR), confirmedAt: iso(now - HOUR), createdAt: iso(now - 2 * HOUR) }));
    seed.trailers.push(tr({ id: 'tH', truck: '8804', createdAt: iso(now - 3 * HOUR), scheduledAt: iso(now + 8 * HOUR),
      history: [{ id: 'h1', at: iso(now - 2 * HOUR), by: 'Altex', text: 'Time changed to Tue, Oct 28, 2:00 PM (was Mon, Oct 27, 10:00 AM)' },
        { id: 'h2', at: iso(now - HOUR), by: 'Altex', text: 'Time changed to Wed, Oct 29, 9:00 AM (was Tue, Oct 28, 2:00 PM)' }] }));
    seed.trailers.push(tr({ id: 'tH0', truck: '8805', createdAt: iso(now - 3 * HOUR), scheduledAt: iso(now + 8 * HOUR),
      history: [{ id: 'h3', at: iso(now - 2 * HOUR), by: 'Office', text: 'Time changed to Tue, Oct 28, 2:00 PM (was no time)' }] }));
    seed.trailers.push(tr({ id: 'tMix', truck: '8803', scheduledAt: iso(now + 6 * HOUR), createdAt: iso(now - HOUR), loadOrder: true }));
    for (const [id, cu, seq] of [['mA1', 'cu_altex', 0], ['mX1', 'cu_pine', 1], ['mA2', 'cu_altex', 2], ['mX2', 'cu_pine', 3]])
      seed.shipments.push({ id, ref: id.toUpperCase(), customerId: cu, trailerInId: 'tMix', trailerOutId: null, units: { std: 4, lg: 0, crate: 0 }, exceptions: [], adjustments: [], chat: [], touches: [], lane: 'reno', status: 'expected', seq });
    const p = await h.openAs('office', { viewport: DESK, seed });
    await ready(p);
    let doc = await h.readDoc(p);

    // 1. zzKioskIn resolves null when its save fails (storage refused), and nothing is checked in
    const t129 = doc.trailers.find(x => x.truck === '129');
    const blocked = await p.evaluate(async id => {
      const o = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) { if (k === 'cdweb:cd6:doc') throw new Error('blocked for the test'); return o.call(this, k, v); };
      let r = 'unset';
      try { r = await window.__zz.actions.zzKioskIn(id, { driver: 'Blocked' }); } finally { Storage.prototype.setItem = o; }
      return r;
    }, t129.id);
    doc = await h.readDoc(p);
    t.ok(blocked === null && !doc.trailers.find(x => x.id === t129.id).arrivedAt, 'zzKioskIn resolves null when the save is refused (got ' + JSON.stringify(blocked) + '), and the truck is not checked in');
    const okIn = await act(p, 'zzKioskIn', t129.id, { driver: 'Saved' });
    t.ok(okIn && okIn.trailerId === t129.id && !okIn.already && (await h.readDoc(p)).trailers.find(x => x.id === t129.id).arrivedAt, 'the same check-in saves once storage works again');

    // 2. "Booking confirmed": check-in code and driver link only for a real saved code
    const bk = await calc(p, (h, doc) => h.ZZmsgs(doc, Date.now()).filter(m => m.event === 'booked' && (m.trailerId === 'tNC' || m.trailerId === 'tYC')).map(m => [m.trailerId, m.channel, m.body]));
    const nc = bk.filter(m => m[0] === 'tNC'), yc = bk.filter(m => m[0] === 'tYC');
    t.ok(nc.length >= 1 && nc.every(m => !/Check-in code|Driver link|#eta/.test(m[2]) && /is booked/.test(m[2])), 'booked message for a truck with no saved code leaves out the code and the driver link');
    t.ok(yc.length >= 1 && yc.every(m => m[2].includes('4455')) && yc.some(m => m[2].includes('Driver link for ETA updates: ') && m[2].includes('#eta4455')), 'booked message for a real code 4455 carries the code and the driver link');

    // 7. the trail's "Booked for" line keeps the original time after a time change
    // "Mon, Oct 27, 10:00 AM" in dock time, formatted by the browser (its ICU may use a narrow space before AM / PM)
    const W = {};
    const orig = doc.trailers.find(x => x.id === 'tYC').scheduledAt, n1 = iso(now + 9 * HOUR), n2 = iso(now + 11 * HOUR);
    Object.assign(W, await p.evaluate(list => Object.fromEntries(list.map(v => { const d = new Date(v), z = 'America/Los_Angeles';
      return [v, new Intl.DateTimeFormat('en-US', { timeZone: z, weekday: 'short', month: 'short', day: 'numeric' }).format(d) + ', ' + new Intl.DateTimeFormat('en-US', { timeZone: z, hour: 'numeric', minute: '2-digit' }).format(d)]; })),
      [orig, n1, n2, doc.trailers.find(x => x.id === 'tMix').scheduledAt]));
    const when = ms => W[iso(ms)];
    await act(p, 'zzLog', 'tYC', `Time changed to ${when(Date.parse(n1))} (was ${when(Date.parse(orig))})`, { scheduledAt: n1 });
    await act(p, 'zzLog', 'tYC', `Time changed to ${when(Date.parse(n2))} (was ${when(Date.parse(n1))})`, { scheduledAt: n2, bookedFor: iso(now) });
    doc = await h.readDoc(p);
    const yt = doc.trailers.find(x => x.id === 'tYC');
    t.ok(yt.scheduledAt === n2 && yt.bookedFor === orig, 'zzLog keeps the original booked time (bookedFor) at the first time change only, and a caller cannot set it');
    const booked = id => calc(p, (h, doc, id) => (h.ZZtrail(doc, id).find(x => /^Booked/.test(x.text)) || {}).text, id);
    const by = await booked('tYC');
    t.ok(by === 'Booked for ' + when(Date.parse(orig)), 'trail: "' + by + '" is the original time, not the current ' + when(Date.parse(n2)));
    t.eq(await booked('tH'), 'Booked for Mon, Oct 27, 10:00 AM', 'older trucks: the "(was ...)" of the first time change in the history');
    t.eq(await booked('tH0'), 'Booked', 'booked with no time first: just "Booked"');
    t.eq(await booked('tMix'), 'Booked for ' + when(Date.parse(doc.trailers.find(x => x.id === 'tMix').scheduledAt)), 'never changed: the booked time');

    // 8. customer reorder: swaps only with the same customer's loads; the office's swap is unchanged
    const order = async () => (await h.readDoc(p)).shipments.filter(s => s.trailerInId === 'tMix').map((s, i) => [s.seq ?? i, s.id]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    await act(p, 'zzReorder', 'mA2', 'tMix', 'up', 'cu_altex');
    t.eq(await order(), ['mA2', 'mX1', 'mA1', 'mX2'], 'customer moves A2 up: it swaps with A1, the other company\'s loads keep their places');
    const rv = (await h.readDoc(p)).rev;
    await act(p, 'zzReorder', 'mX1', 'tMix', 'down', 'cu_altex');
    await act(p, 'zzReorder', 'mA2', 'tMix', 'up', 'cu_altex');
    t.ok((await h.readDoc(p)).rev === rv, 'a customer cannot move another company\'s load, nor past its own first load (nothing written)');
    await act(p, 'zzReorder', 'mA1', 'tMix', 'down', 'cu_altex');
    t.eq(await order(), ['mA2', 'mX1', 'mA1', 'mX2'], 'customer moves its last load down: nothing below it of its own, no change');
    await act(p, 'zzReorder', 'mA2', 'tMix', 'down');
    t.eq(await order(), ['mX1', 'mA2', 'mA1', 'mX2'], 'office / crew reorder (no customer) still swaps with the next load, as before');

    // 9. Short / Over: the exception note carries the crew's reason
    await act(p, 'crewSaveReceiving', 'mA1', { counted: 3, condition: 'Short', rewrap: 0, row: '', note: 'driver signed for 3, one pallet left at the shipper' });
    doc = await h.readDoc(p);
    let ex = (doc.shipments.find(s => s.id === 'mA1').exceptions || []).find(e => e.kind === 'Short');
    t.ok(ex && ex.note === 'Counted 3 against 4 on the BOL: driver signed for 3, one pallet left at the shipper — Nick at the door', 'Short exception note: count, the crew\'s reason, who (' + (ex && ex.note) + ')');
    await act(p, 'crewSaveReceiving', 'mX1', { counted: 5, condition: 'Over', rewrap: 0, row: '' });
    doc = await h.readDoc(p);
    ex = (doc.shipments.find(s => s.id === 'mX1').exceptions || []).find(e => e.kind === 'Over');
    t.ok(ex && ex.note === 'Counted 5 against 4 on the BOL — Nick at the door', 'no reason given: the note is as before');

    // 10. rewrap billed once: an approved estimate line "Rewrap pallet" replaces rewrapPallets on the bill
    const bill = await calc(p, (h, doc) => {
      const s = doc.shipments.find(x => x.ref === '111927'), rates = h.Ln(doc, s.customerId), rw = l => l.filter(x => x.code === 'REWRAP').length;
      const s2 = { ...s, adjustments: [...(s.adjustments || []), { id: 'zx', label: 'Damage: Rewrap pallet', amount: 45 }] };
      const s3 = { ...s, adjustments: [...(s.adjustments || []), { id: 'zy', label: 'Damage: Labor, 1 hour', amount: 120 }] };
      return { door: s.rewrapPallets, a: rw(h.Im(s, rates)), b: rw(h.Im(s2, rates)), c: rw(h.Im(s3, rates)), adj: h.Im(s2, rates).filter(x => x.code === 'ADJ' && /Rewrap/.test(x.label)).length };
    });
    t.eq(bill, { door: 3, a: 1, b: 0, c: 1, adj: 1 }, 'Im bills rewrapPallets (3) only while no approved damage estimate already bills rewrap');

    // 12. kiosk banner wording
    const kb = await p.evaluate(() => ['Your last change was NOT saved on this device. Please try again.', 'Photo NOT saved to the shared data. Please try again.',
      'Storage on this device is full: your last change was NOT saved. Delete old photos or use another device, and tell the office.',
      'You can look but not change shared data.'].map(window.__zz.h.ZZa_kioskBanner));
    t.eq(kb, ['Your last change was NOT saved on this device. Please see the office.', 'Photo NOT saved to the shared data. Please see the office.',
      'Storage on this device is full: your last change was NOT saved. Please see the office.', 'You can look but not change shared data.'], 'kiosk banner: the staff instruction becomes "Please see the office."; notices stay as they are');
    await p.context().close();
  }

  /* ================= 10. harness shared mode + mock-db (groundwork for A1) ================= */
  t.section('mock-db sanity (A1 builds shared mode on it)');
  {
    const ctx = await h.newContext({ viewport: PHONE, mode: 'shared', mock: { cachedFirst: true, isOwner: false, canEdit: false, can: false } });
    const a = await h.openAs('office', { context: ctx });
    await ready(a);
    t.ok((await a.evaluate(() => window.__zz.h.sync.mode)) === 'local' && (await a.evaluate(() => window.__mockdb.writes.length)) === 0, 'a viewer the platform says cannot write stays in local mode even when db is available, and writes nothing to the database (A1: staff go shared, see a-sync)');
    const b = await ctx.newPage();
    await b.goto(h.origin + '/blank');
    const r = await a.evaluate(async () => {
      const db = await window.claude.use('db'), user = await window.claude.use('user');
      const seen = [];
      const un = db.collection('trailers').where('stage', '==', 'arrived').orderBy('at').onSnapshot(s => seen.push({ n: s.size, cache: s.metadata.fromCache, ch: s.docChanges().map(c => c.type).join() }));
      await new Promise(z => setTimeout(z, 40));
      await db.doc('trailers/t1').set({ stage: 'arrived', at: 2, nest: { a: 1, b: 1 } });
      await db.doc('trailers/t2').set({ stage: 'arrived', at: 1 });
      await db.doc('trailers/t1').update({ nest: { b: 2 } });
      let upd = null; try { await db.doc('trailers/zz').update({ x: 1 }); } catch (e) { upd = e.code; }
      let big = null; try { await db.doc('trailers/big').set({ s: 'x'.repeat(300000) }); } catch (e) { big = e.code; }
      let bad = null; try { db.doc('trailers'); } catch (e) { bad = e instanceof TypeError; }
      await db.doc('photos/dmg:x1/items/p1').set({ src: 'data:', at: 1 });
      const nested = (await db.collection('photos/dmg:x1/items').get()).size;
      const l1 = await db.doc('locks/doors').acquire({ holder: 'tabA', ttlMs: 5000 });
      await new Promise(z => setTimeout(z, 60));
      un();
      return { seen, upd, big, bad, nested, l1: l1.acquired, t1: (await db.doc('trailers/t1').get()).data(), can: await user.can('data.write'), owner: await user.isOwner() };
    });
    t.ok(r.seen[0].cache === true && r.seen[0].n === 0 && r.seen.some(s => !s.cache && s.n === 2), 'listener gets a cached empty snapshot first, then server snapshots');
    t.ok(r.seen.some(s => /added/.test(s.ch)) && r.seen.some(s => /modified/.test(s.ch)), 'docChanges reports added / modified');
    t.eq(r.t1.nest, { a: 1, b: 2 }, 'update merges nested objects');
    t.ok(r.upd === 'invalid_argument' && r.big === 'invalid_argument' && r.bad === true, 'update on a missing doc and a 256 KiB+ body reject invalid_argument; a bad path throws TypeError');
    t.ok(r.nested === 1 && r.l1 && r.can === false && r.owner === false, 'nested photo paths, acquire, user switches');
    const other = await b.evaluate(async () => {
      return JSON.parse(localStorage.getItem('__mockdb') || '{}')['trailers/t1'];
    });
    t.ok(other && other.stage === 'arrived', 'a second page in the same context sees the same database');
    await ctx.close();
  }
});
