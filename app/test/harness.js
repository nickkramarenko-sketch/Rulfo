/* Test harness: serves app/ on a free port, opens pages with the mock runtime and example data.
   const H = require('./harness'); const h = await H.start(); const page = await h.open('client', {viewport:{width:390,height:844}});
   ... await h.close();   Errors on the page are collected in h.errors (tests should assert it is empty). */
const path = require('path');
const fs = require('fs');
const http = require('http');
let playwright;
try { playwright = require('playwright'); } catch (e) { playwright = require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'playwright')); }
const makeSeed = require('./fixtures');

const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };
// a tiny gray PNG for /_blob/* (uploaded files in the real runtime)
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8+P9/PQAI8wNPvd7POQAAAABJRU5ErkJggg==', 'base64');
// a real small JPEG-ish image for upload tests: a 2x2 PNG works with <input type=file> and canvas
const UPLOAD_PNG = path.join(__dirname, 'upload.png');
if (!fs.existsSync(UPLOAD_PNG)) fs.writeFileSync(UPLOAD_PNG, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR42mP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==', 'base64'));

function wrapPage(html) {
  // same skeleton the artifact host adds at publish time
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
    '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style></head><body>' + html + '</body></html>';
}

async function start(o = {}) {
  const server = http.createServer((req, res) => {
    let u = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
    if (u === '/' || u === '/index.html') {
      res.writeHead(200, { 'content-type': 'text/html' });
      return res.end(wrapPage(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')));
    }
    if (u.startsWith('/_blob/')) { res.writeHead(200, { 'content-type': 'image/png' }); return res.end(PNG); }
    const f = path.join(ROOT, u);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await playwright.chromium.launch();
  const errors = [];
  const seed = o.seed === false ? null : (o.seed || makeSeed(o.now || Date.now()));
  const mockSrc = fs.readFileSync(path.join(__dirname, 'mock-claude.js'), 'utf8');
  const contexts = [];
  async function newContext(co = {}) {
    const context = await browser.newContext({ viewport: co.viewport || { width: 390, height: 844 }, colorScheme: co.colorScheme || 'light' });
    await context.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    const mock = { caps: co.caps || ['db', 'user', 'assets'], canWrite: co.canWrite !== false, seed };
    await context.addInitScript('window.__MOCK = ' + JSON.stringify(mock) + ';');
    if (co.caps === undefined || co.caps.length) await context.addInitScript(mockSrc);
    contexts.push(context);
    return context;
  }
  let shared = null;
  /* open(role, {viewport, context, hash, customerId, crewName}) -> page. Pages share one browser context (and the live mock db) unless o.context is given. */
  async function open(role, po = {}) {
    const context = po.context || shared || (shared = await newContext(po));
    const page = await context.newPage();
    if (po.viewport) await page.setViewportSize(po.viewport);
    page.on('pageerror', e => errors.push('[' + role + '] pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/favicon|fonts\.g/.test(m.text())) errors.push('[' + role + '] console: ' + m.text()); });
    const pre = {};
    if (po.customerId !== undefined) pre['dock24:customer'] = po.customerId;
    if (po.crewName !== undefined) pre['dock24:crew'] = po.crewName;
    if (Object.keys(pre).length) await page.addInitScript(p => { for (const k in p) { if (p[k] === null) localStorage.removeItem(k); else localStorage.setItem(k, p[k]); } }, pre);
    await page.goto(base + '#' + (po.hash || role));
    await page.waitForFunction(() => window.App && App.state.mode !== 'starting' && App.loaded && App.loaded.trucks);
    await page.waitForTimeout(80);
    return page;
  }
  async function close() { for (const c of contexts) await c.close().catch(() => {}); await browser.close(); server.close(); }
  /* read the shared mock database from any page */
  async function dump(page) { return page.evaluate(() => window.__mockdb.dump()); }
  return { base, browser, open, newContext, close, dump, errors, seed, UPLOAD_PNG };
}
module.exports = { start, makeSeed };
