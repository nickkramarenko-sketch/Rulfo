/* Portal test harness (PLAN.md 1.7). Serves a build folder and opens pages with Playwright.

   const H = require('./harness');
   const h = await H.start({ dist: '/path/to/dist' });          // default: website/portal/dist (or env PORTAL_DIST)
   const page = await h.open('#customer', { viewport: H.PHONE, seed: doc, mode: 'local' });
   await h.signIn(page, 'customer');                             // Altex 7788 / Nick 2468 / Roman 1111
   ...
   h.errors        // every pageerror (tests must end with h.assertClean())
   await h.close();

   Every open() is a NEW page (ZZSign reads the hash once when it mounts). By default every open() also gets a
   fresh browser context (its own localStorage); pass {context} to share one (two pages = two devices).
   Options for open()/newContext():
     viewport  {width,height}                default PHONE 390x844
     mode      'local' (inject nothing) | 'shared' (inject test/mock-db.js before load; A1)
     seed      doc object or JSON string written to cdweb:cd6:doc before the first load of the context
     now       ms: page.clock.install({time: now}) on the context
     mock      options for mock-db.js in shared mode ({isOwner, canEdit, can, cachedFirst, caps, ...})
     probe     true (default): sets window.__ZZTEST so builds with stream A expose window.__zz
     flags     e.g. {kiosk2:false}: overrides ZZFLAGS for this context (needs probe; tests only), so a test can
               drive the old fallback screens (old kiosk XQ, old wrap-up) in a build where the new ones are on
     timezoneId the browser's own time zone, e.g. 'America/New_York' (dock time stays America/Los_Angeles)
     path      '/' (dist/portal.html, default) or '/base.html' (base/portal.base.html, today's live copy) */
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const { execSync } = require('child_process');
let playwright;
try { playwright = require('playwright'); } catch (e) { playwright = require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); }

const PORTAL = path.join(__dirname, '..');
const DEFAULT_DIST = process.env.PORTAL_DIST || path.join(PORTAL, 'dist');
const SCRATCH_SHOTS = '/tmp/claude-0/-home-user-Rulfo/928f61b7-5bf4-59e6-9ccf-0daf06c385c6/scratchpad/shots';
const SHOTS = process.env.SHOTS || (fs.existsSync(path.dirname(SCRATCH_SHOTS)) ? SCRATCH_SHOTS : path.join(os.tmpdir(), 'portal-shots'));
fs.mkdirSync(SHOTS, { recursive: true });
const PHONE = { width: 390, height: 844 }, DESK = { width: 1400, height: 900 }, TABLET = { width: 1024, height: 768 };
const LOGINS = { customer: ['Altex', '7788'], office: ['Nick', '2468'], crew: ['Roman', '1111'] };
const DOC_KEY = 'cdweb:cd6:doc';
// a small real PNG (8x8, orange) for file inputs
const UPLOAD_PNG = path.join(os.tmpdir(), 'portal-test-upload.png');
if (!fs.existsSync(UPLOAD_PNG)) fs.writeFileSync(UPLOAD_PNG, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEklEQVR42mP8z8AARMQBxlGFAD7XAQEZW5rUAAAAAElFTkSuQmCC', 'base64'));

async function start(o = {}) {
  const dist = path.resolve(o.dist || DEFAULT_DIST);
  const distHtml = path.join(dist, 'portal.html');
  if (!fs.existsSync(distHtml)) throw new Error('No build at ' + distHtml + ' (run build2.py first)');
  const baseHtml = path.join(PORTAL, 'base', 'portal.base.html');
  // screenshot names: <prefix>-<name>.png; prefix from env SHOT_PREFIX, else the build folder (dist -> a0, dist-c -> c)
  const prefix = process.env.SHOT_PREFIX || (path.basename(dist) === 'dist' ? 'a0' : (path.basename(dist).replace(/^dist[-_]?/, '') || 'a0'));
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
    const send = (type, body) => { res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' }); res.end(body); };
    if (u === '/' || u === '/portal.html') return send('text/html; charset=utf-8', fs.readFileSync(distHtml));
    if (u === '/base.html') return send('text/html; charset=utf-8', fs.readFileSync(baseHtml));
    if (u === '/blank') return send('text/html; charset=utf-8', '<!doctype html><title>blank</title>');
    if (u === '/favicon.ico') { res.writeHead(204); return res.end(); }
    res.writeHead(404); res.end('not found');
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await playwright.chromium.launch();
  const errors = [];          // pageerror: always a test failure
  const consoleErrors = [];   // console.error lines: reported, tests decide
  const contexts = [];
  const mockSrc = fs.existsSync(path.join(__dirname, 'mock-db.js')) ? fs.readFileSync(path.join(__dirname, 'mock-db.js'), 'utf8') : '';

  async function newContext(co = {}) {
    const context = await browser.newContext({ viewport: co.viewport || PHONE, colorScheme: co.colorScheme || 'light', acceptDownloads: false,
      ...(co.timezoneId ? { timezoneId: co.timezoneId } : {}) });
    await context.route('**/*', route => {
      const url = route.request().url();
      if (url.startsWith(origin)) return route.continue();
      if (/fonts\.(googleapis|gstatic)\.com/.test(url)) return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
      return route.abort();
    });
    if (co.probe !== false) await context.addInitScript('window.__ZZTEST = true;');
    if (co.flags) await context.addInitScript('window.__ZZFLAGS = ' + JSON.stringify(co.flags) + ';');
    if (co.seed !== undefined && co.seed !== null) {
      const json = typeof co.seed === 'string' ? co.seed : JSON.stringify(co.seed);
      await context.addInitScript(([key, doc]) => {
        try { if (!localStorage.getItem('__zzseeded')) { localStorage.setItem(key, doc); localStorage.setItem('__zzseeded', '1'); } } catch (e) {}
      }, [DOC_KEY, json]);
    }
    if (co.mode === 'shared') {
      if (!mockSrc) throw new Error('mode shared needs test/mock-db.js');
      await context.addInitScript('window.__MOCK = ' + JSON.stringify(co.mock || {}) + ';');
      await context.addInitScript(mockSrc);
    }
    if (co.now) await context.clock.install({ time: co.now });
    context.__opts = co;
    contexts.push(context);
    return context;
  }

  function watch(page, label) {
    page.on('pageerror', e => errors.push('[' + label + '] pageerror: ' + (e && e.message)));
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push('[' + label + '] ' + m.text()); });
  }

  /* open(hash, opts) -> page, after the dock data has loaded */
  async function open(hash = '', po = {}) {
    const context = po.context || await newContext(po);
    const page = await context.newPage();
    if (po.viewport) await page.setViewportSize(po.viewport);
    watch(page, (hash || '/') + '@' + (po.viewport || context.__opts.viewport || PHONE).width);
    const h = String(hash || '').replace(/^#/, '');
    await page.goto(origin + (po.path || '/') + (h ? '#' + h : ''));
    await waitLoaded(page);
    return page;
  }

  async function waitLoaded(page) {
    await page.waitForFunction(() => {
      const r = document.getElementById('root');
      return r && r.children.length > 0 && !/Opening the dock/.test(r.innerText);
    }, null, { timeout: 15000 });
    await page.waitForTimeout(120);
  }

  /* sign in through the sign-in page (page opened at #customer / #office / #crew) */
  async function signIn(page, role, name, pin) {
    const [n0, p0] = LOGINS[role];
    name = name || n0; pin = pin || p0;
    const h = await page.evaluate(() => location.hash.replace('#', ''));
    if (h !== role) throw new Error('signIn(' + role + '): open the page at #' + role + ' first (it is at #' + h + ')');
    const nameBox = page.locator(role === 'customer' ? 'input[placeholder="Your company name"]' : 'input[placeholder="First name"]').first();
    await nameBox.fill(name);
    await page.locator('input[placeholder="4 digits"]').first().fill(pin);
    await page.getByRole('button', { name: 'Sign in', exact: true }).first().click();
    await page.waitForFunction(() => !document.querySelector('input[placeholder="4 digits"]'), null, { timeout: 10000 });
    await page.waitForTimeout(250);
    return page;
  }

  /* open + sign in. role: customer | office | crew */
  async function openAs(role, po = {}) {
    const page = await open('#' + role, po);
    await signIn(page, role, po.name, po.pin);
    return page;
  }

  const readDocRaw = page => page.evaluate(k => localStorage.getItem(k), DOC_KEY);
  const readDoc = async page => { const s = await readDocRaw(page); return s ? JSON.parse(s) : null; };
  const text = page => page.evaluate(() => document.getElementById('root').innerText);

  /* checks every test runs: no sideways scroll at phone width (and a screenshot) */
  async function check(page, name, o = {}) {
    await page.waitForTimeout(o.settle || 150);
    const vw = page.viewportSize().width;
    const sw = await page.evaluate(() => document.scrollingElement.scrollWidth);
    if (vw <= 400 && sw > vw) {
      // o.knownScroll: a sideways scroll that today's live portal already has (reported, not failed)
      if (o.knownScroll) console.log('  note - ' + name + ': sideways scroll at ' + vw + ' px (scrollWidth ' + sw + ') - known in the base build: ' + o.knownScroll);
      else throw new Error(name + ': sideways scroll at ' + vw + ' px (scrollWidth ' + sw + ')');
    }
    if (o.shot !== false) await page.screenshot({ path: path.join(SHOTS, prefix + '-' + name + '.png'), fullPage: !!o.full });
    return { vw, sw };
  }

  /* the doc the BASE build writes on a fresh device (today's live behavior), cached */
  let baseDocCache = null;
  async function baseDoc() {
    if (baseDocCache) return JSON.parse(baseDocCache);
    const page = await open('', { path: '/base.html', probe: false });
    baseDocCache = await readDocRaw(page);
    await page.context().close();
    return JSON.parse(baseDocCache);
  }

  function assertClean(label) {
    if (errors.length) throw new Error((label || '') + ' page errors:\n  ' + errors.join('\n  '));
  }

  async function close() {
    for (const c of contexts) await c.close().catch(() => {});
    await browser.close().catch(() => {});
    server.close();
  }
  return { origin, dist, prefix, browser, newContext, open, waitLoaded, signIn, openAs, readDoc, readDocRaw, text, check, baseDoc,
    errors, consoleErrors, assertClean, close, SHOTS, UPLOAD_PNG };
}

/* tiny test runner used by every *.test.js: t.ok(cond, msg), t.eq(a, b, msg); run(name, fn) */
function suite(name) {
  let passed = 0, failed = 0;
  const t = {
    ok(cond, msg) { if (!cond) { failed++; throw new Error('FAILED: ' + msg); } passed++; console.log('  ok - ' + msg); },
    eq(a, b, msg) { const A = JSON.stringify(a), B = JSON.stringify(b); t.ok(A === B, msg + (A === B ? '' : ' (got ' + A + ', want ' + B + ')')); },
    section(s) { console.log('\n# ' + s); },
    get passed() { return passed; }
  };
  return t;
}

/* parse argv for --dist DIR (run.js passes it through as env PORTAL_DIST too) */
function distFromArgv() {
  const k = process.argv.indexOf('--dist');
  return k > 0 ? path.resolve(process.argv[k + 1]) : DEFAULT_DIST;
}

/* main(name, async (h, t) => {...}): start the harness on --dist, run, fail on any page error, exit 0/1 */
async function main(name, fn, o = {}) {
  const t = suite(name);
  let h = null, code = 0;
  const t0 = Date.now();
  try {
    h = await start({ dist: distFromArgv(), ...o });
    console.log('# ' + name + ' on ' + h.dist);
    await fn(h, t);
    h.assertClean(name);
    console.log('\n# ' + name + ': ' + t.passed + ' checks passed, 0 page errors (' + Math.round((Date.now() - t0) / 1000) + ' s)');
  } catch (e) {
    code = 1;
    console.error('\n# ' + name + ' FAILED after ' + t.passed + ' checks: ' + ((e && e.stack) || e));
    if (h && h.errors.length) console.error('page errors:\n  ' + h.errors.join('\n  '));
  } finally {
    if (h) {
      if (h.consoleErrors.length) console.log('# console errors seen (' + h.consoleErrors.length + '), first ones:\n  ' + h.consoleErrors.slice(0, 12).join('\n  '));
      await h.close();
    }
  }
  process.exit(code);
}

module.exports = { start, main, suite, distFromArgv, PHONE, DESK, TABLET, LOGINS, DOC_KEY, PORTAL, SHOTS };
