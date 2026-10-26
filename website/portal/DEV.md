# Portal build: how to work on it (streams A to F)

The live portal is `website/portal/portal.html`. **Nobody edits it.** Every build starts from the frozen copy
`base/portal.base.html` and writes to a `dist` folder. The plan is `PLAN.md` (section 2 is the shared contract).

## Rules

- Edit only the files your stream owns (PLAN 1.1). Need an anchor someone else owns? Ask them for a hook.
- Never publish anything, never touch Netlify / DNS / 24hrcrossdock.com, never push.
- Build into your own folder (`--out`) so parallel builds never overwrite each other.
- Run `regression` and your own tests on your build before you hand anything over. Zero page errors.
- Keep Nick's behavior (PLAN 1.4): add, don't take away; read new fields with defaults; nothing written on load.

## Build

```bash
cd /home/user/Rulfo
python3 website/portal/build2.py                                   # all streams -> website/portal/dist
python3 website/portal/build2.py --streams A,C --out website/portal/dist-c   # engine + your stream only
python3 website/portal/build2.py --streams ""                      # base only = today's portal, byte for byte
```

Streams: **A** `engine-source.js`, `sync-source.js`, `patches/A_*.py` · **B** `customer-portal-source.js`, `patches/B_*.py` ·
**C** `kiosk-source.js`, `patches/C_*.py` · **D** `crew-source.js`, `patches/D_*.py` · **E** `office-source.js`, `patches/E_*.py` · **F** `patches/F_*.py`.
A stream that is not listed uses the base copy of its source (B, D) or is left out (C, E, F). Always include **A**:
it holds every helper and action in PLAN section 2 (build2 warns when it is missing). A missing file is fine
(stream not started yet). The build prints every patch id and ends with `node --check app.js: ok`.

build2 stops with `build2 FAIL: ...` when: an anchor occurs 0 or 2+ times in the base, two patches touch the same
text, an anchor sits inside the customer-portal / crew source span, a patch id repeats or carries another stream's
letter, a top-level name repeats, lacks the `ZZ` prefix or is already defined by the base, a chain file has a
statement (`const`, `let`, `function`, `;`) at the top level, or `node --check` fails.

## Patches

`patches/<letter>_<name>.py` holds `PATCHES = [(id, old, new, why), ...]`, ids like `C01` (your letter), raw strings
`r'...'` (the minified code keeps escapes such as `\xB7` and `\u2014` as literal text). Check a new anchor first; it must print 1:

```bash
python3 -c "import sys;s=open('website/portal/base/portal.base.html').read();print(s.count(sys.argv[1]))" '<anchor>'
```

Anchors are found in the base only, and replacements run from the end of the file backwards, so your `new` text
can never create a second copy of someone's anchor.

## Source files (chain files)

`engine-source.js`, `customer-portal-source.js`, `crew-source.js`, `kiosk-source.js`, `office-source.js` are spliced
into the bundle's `var a=...,b=...` chain: only `ZZName=value,` entries, the file ends with `,`. Private helpers
use your prefix (`ZZb_`, `ZZk_`, `ZZd_`, `ZZo_`). Never run code at load time that uses a later bundle name (do
one-time setup lazily, like `ZZtr`). Change data only through `props.actions.*`; never write from a render.

## Engine notes (stream A, `engine-source.js`) - details section 2 leaves open

- Actions return the save promise (await it if you need the write done); `zzKioskIn` resolves the result object,
  `zzQueueFriday` the count. Refused input returns `null` and shows a toast (zzReportDamage < 2 photos, zzSecure,
  zzTrack with a non-https link, zzGear with a bad type).
- `zzEstLines` saves and auto-approves at once when the customer's limit allows; it refuses to change an estimate
  that is already applied. Call it with the whole line list. `ZZdmgLines` lines carry `k` and `on`; actions drop
  lines with `on:false`, and `ZZestTotal` skips them.
- `zzKioskIn(tid, {..., by:'office'})` is the office "Check in now" (checkedInBy office, actor the office user).
- `ZZpromise(...).deadline` is in ms; `leftMin` goes negative when over.
- `ZZcrewOnShift` returns an array (use `.length`) of crew members **without their `pin`**; with no shifts set it
  returns `settings.crew` placeholder entries (`placeholder:true`, no phone).
- `ZZdayLoad` blocks are `{from, to}` hours (6..22), `label`, `trucks`, `level`; plus `outside` (after-hours count).
- `ZZmsgs` ids are `<event>:<record id>:<contact index>:<channel>`; driver-text copies have `event:'driver'`.
  A damage report is listed once (even when its load sits on an inbound and a pickup truck) and goes to the load's
  customer; the `done` text counts only the truck customer's own loads. "Booking confirmed" is sent for
  `confirmedAt`, or `createdAt` for dispatch accounts **and for bookings the office made** (`bookedVia:'office'`).
  Stream C: `ZZdriverText(lang, key, {driver, truck, dock, time})` returns a string (or null) for keys
  `door`, `yard`, `released`, `reminder`.
- `ZZtrail(doc, tid)` lists only the truck customer's own loads (another company's load on the same truck stays
  private); `ZZtrail(doc, tid, sid)` shows that one load.
- `ZZzonedIso` returns `null` for a day or time that does not exist (Feb 30, 24:00, 9:75); a time skipped by the
  spring DST change moves forward an hour.
- Trailer `history` entries also carry an `id`.
- `ZZsync` (sync-source.js) is local-only in A0 with the full interface (mode, start, read, write, seed, fresh, failed,
  lease, photoGet, photoSet, importLocal). Events: `cd6:sync {text}` (red banner), `cd6:remote`, `cd6:mode`.
  Render A1's card only if it exists: `typeof ZZSyncCard!=="undefined"&&...`.
- `ZZFLAGS` (`kiosk2`, `secureStep`): read them **at render time** (`ZZFLAGS.kiosk2?ZZKiosk:XQ`), never copy them at
  load. Tests can switch them per page with the harness option `flags` (only when the test flag is set; the real page
  always uses the values in `engine-source.js`). Regression uses `{kiosk2:false}` to keep checking the old kiosk walk-in.
- Two A patches beyond the plan list: **A36** (Setup "Logins card" button follows the new showLogins rule) and
  **A37** (addTrailer renumbers `seq` after empty rows are dropped). Their anchors belong to A.

## Test

```bash
node website/portal/test/run.js                                     # every test file against website/portal/dist
node website/portal/test/run.js regression c --dist website/portal/dist-c   # regression + c-*.test.js on your build
```

Screenshots go to `/tmp/claude-0/-home-user-Rulfo/928f61b7-5bf4-59e6-9ccf-0daf06c385c6/scratchpad/shots/<prefix>-<name>.png`;
the prefix is your build folder (`dist-c` -> `c`) or `SHOT_PREFIX`. Look at them.

Write `test/<letter>-<name>.test.js` with the shared harness (copy the shape of `a-engine.test.js`):

```js
const H = require('./harness');
H.main('c-kiosk', async (h, t) => {
  const p = await h.open('#stations', { viewport: H.TABLET, seed: doc });   // new page + fresh context each time
  const q = await h.openAs('office', { viewport: H.DESK });                  // signs in as Nick 2468 (Altex 7788, Roman 1111)
  t.ok(cond, 'what it proves');  await h.check(p, 'c-kiosk-done');          // no sideways scroll at 390 + screenshot
  const doc = await h.readDoc(p);                                           // the stored doc (truth)
});
```

- Other `open()` / `newContext()` options: `flags` (ZZFLAGS override, see above), `timezoneId` (the browser's own zone;
  dock time stays Pacific), `now` (clock), `mode:'shared'` + `mock` (A1).
- Regression and your screens: the booking time is filled whether it is the old select or B's `<input type="time">`;
  after booking the page is reloaded (B's "booked" sheet may be open); the kiosk check accepts C's new kiosk when
  `ZZFLAGS.kiosk2` is on. If your stream changes another old screen on purpose, ask A to adjust regression; do not
  edit `regression.test.js` yourself.
- `h.baseDoc()` is the doc today's live build writes on a fresh device (v8, demo data); clone it, add fixtures,
  pass it as `seed`. `{context}` shares a browser context (two pages = two devices). `{now}` installs `page.clock`.
- Builds with stream A expose `window.__zz = {doc, actions, h}` when the harness sets `window.__ZZTEST` (it does
  by default): call actions and helpers from `page.evaluate` (see `act()` / `calc()` in `a-engine.test.js`).
- `mode:'shared'` loads `test/mock-db.js` (db / user / assets per runtime contract 0.2.91) for A1.
- Known in today's portal: the TV board scrolls sideways at 390 px (stream E owns the TV); regression notes it.
