#!/usr/bin/env node
/* Test runner: runs test/*.test.js one after another, each as its own node process.
     node website/portal/test/run.js                    # every test file, against website/portal/dist
     node website/portal/test/run.js c                  # only files starting with c- (c-kiosk.test.js, ...)
     node website/portal/test/run.js regression a       # several prefixes / names
     node website/portal/test/run.js a --dist /tmp/dist-a   # test another build folder (build2.py --out)
   Exit status 0 only when every selected file passes. */
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const args = process.argv.slice(2);
let dist = path.join(__dirname, '..', 'dist');
const picks = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--dist') { dist = path.resolve(args[++i] || ''); continue; }
  if (args[i].startsWith('--dist=')) { dist = path.resolve(args[i].slice(7)); continue; }
  picks.push(args[i].toLowerCase());
}
if (!fs.existsSync(path.join(dist, 'portal.html'))) {
  console.error('run.js: no build at ' + path.join(dist, 'portal.html') + ' (run python3 website/portal/build2.py first)');
  process.exit(2);
}
const all = fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js')).sort((a, b) =>
  (a === 'regression.test.js' ? -1 : b === 'regression.test.js' ? 1 : a.localeCompare(b)));
const files = picks.length ? all.filter(f => picks.some(p => f.toLowerCase().startsWith(p + '-') || f.toLowerCase() === p + '.test.js' || f.toLowerCase() === p)) : all;
if (!files.length) { console.error('run.js: no test files match ' + picks.join(', ') + ' (have: ' + all.join(', ') + ')'); process.exit(2); }

console.log('run.js: ' + files.length + ' file(s) against ' + dist + '\n');
const results = [];
for (const f of files) {
  const t0 = Date.now();
  console.log('=== ' + f);
  const r = spawnSync(process.execPath, [path.join(__dirname, f), '--dist', dist], {
    stdio: 'inherit', env: { ...process.env, PORTAL_DIST: dist }, timeout: 15 * 60 * 1000
  });
  results.push({ f, ok: r.status === 0, s: Math.round((Date.now() - t0) / 1000), status: r.status, signal: r.signal });
  console.log('');
}
console.log('=== summary');
for (const r of results) console.log((r.ok ? 'PASS ' : 'FAIL ') + r.f + ' (' + r.s + ' s' + (r.ok ? '' : ', exit ' + r.status + (r.signal ? ' ' + r.signal : '')) + ')');
const bad = results.filter(r => !r.ok).length;
console.log(bad ? bad + ' of ' + results.length + ' file(s) FAILED' : 'all ' + results.length + ' file(s) passed');
process.exit(bad ? 1 : 0);
