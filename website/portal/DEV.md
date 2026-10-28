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
can never create a second copy of someone's anchor. Patch files are `exec()`ed, never imported, and build2 sets
`sys.dont_write_bytecode`, so no `__pycache__` appears (it is in `.gitignore` too).

## Source files (chain files)

`engine-source.js`, `customer-portal-source.js`, `crew-source.js`, `kiosk-source.js`, `office-source.js` are spliced
into the bundle's `var a=...,b=...` chain: only `ZZName=value,` entries, the file ends with `,`. Private helpers
use your prefix (`ZZb_`, `ZZk_`, `ZZd_`, `ZZo_`). Never run code at load time that uses a later bundle name (do
one-time setup lazily, like `ZZtr`). Change data only through `props.actions.*`; never write from a render.

## Engine notes (stream A, `engine-source.js`) - details section 2 leaves open

- Actions return the save promise (await it if you need the write done); `zzKioskIn` resolves the result object,
  `zzQueueFriday` the count. Refused input returns `null` and shows a toast (zzReportDamage < 2 photos, zzSecure,
  zzTrack with a non-https link, zzGear with a bad type).
- A save that fails or is refused (storage full, shared data offline or look-only) makes the bundle's `S()` resolve
  `null` (bQ catches it, and A34 raises the red banner). `zzKioskIn` then resolves **`null`** too, never the door / place
  it worked out: the kiosk shows "Please go to the office", the office "Check in now" shows a toast ("The check-in did
  NOT save ...") and "That did not save. Try again." Only the first run of the check-in change is real: after a failed
  save the bundle's `S` re-runs a change on the screen's copy, and for a check-in that would show a truck at a door that
  was never saved (and the kiosk would answer "already checked in"), so `zzKioskIn` ignores that second run.
- `zzEstLines` saves and auto-approves at once when the customer's limit allows; it refuses to change an estimate
  that is already applied. Call it with the whole line list. `ZZdmgLines` lines carry `k` and `on`; actions drop
  lines with `on:false`, and `ZZestTotal` skips them.
- `zzKioskIn(tid, {..., by:'office'})` is the office "Check in now" (checkedInBy office, actor the office user).
- `ZZpromise(...).deadline` is in ms; `leftMin` goes negative when over.
- `ZZcrewOnShift` returns an array (use `.length`) of crew members **without their `pin`**; with no shifts set it
  returns `settings.crew` placeholder entries (`placeholder:true`, no phone).
- `ZZdayLoad` blocks are `{from, to}` hours (6..22), `label`, `trucks`, `level`; plus `outside` (after-hours count).
- `ZZmsgs` ids are `<event>:<record id>:<contact index>:<channel>`; driver-text copies have `event:'driver'`.
  "Booking confirmed" carries the check-in code and the driver link **only when `t.code` is a real saved 4-digit code**
  (older trucks have none until the office taps "Make a code and driver link"), the same rule the customer (B) and
  office (E) screens use; a worked-out code is never sent.
  A damage report is listed once (even when its load sits on an inbound and a pickup truck) and goes to the load's
  customer; the `done` text counts only the truck customer's own loads. "Booking confirmed" is sent for
  `confirmedAt`, or `createdAt` for dispatch accounts **and for bookings the office made** (`bookedVia:'office'`).
  Stream C: `ZZdriverText(lang, key, {driver, truck, dock, time})` returns a string (or null) for keys
  `door`, `yard`, `released`, `reminder`.
- `ZZtrail(doc, tid)` lists only the truck customer's own loads (another company's load on the same truck stays
  private); `ZZtrail(doc, tid, sid)` shows that one load. Its "Booked for ..." line is the **original** booked time:
  `t.bookedFor` (zzLog keeps the old `scheduledAt` there at the first time change; callers cannot set it), else the
  "(was ...)" of the oldest "Time changed to ..." history line, else `scheduledAt`. Its done line reads
  "Done (unloaded in 30m)" / "Done (loaded in 30m)": the time at the door, from start to done. It never says "Done in",
  because the live card next to it says "Done in 56m, within our 2-hour promise" (check-in to done).
- `zzReorder(sid, tid, dir, cid)`: with `cid` (the customer portal's truck sheet, for inbound and pickups) the load must be
  that customer's and it swaps with the next load of the same customer, so other companies' loads keep their places;
  without `cid` (office, crew) it swaps with the next load as before. Nick's `reorderLoad` is unchanged.
- Rewrap is billed once: `ZZrewrapBilled(s)` is true when an approved damage estimate already put a
  "Damage: ...rewrap..." adjustment on the load; then `Im` (patch **A38**) leaves out the REWRAP line from
  `rewrapPallets`. `ZZestOf` shows the door rewrap (auto line) only when no damage estimate on the load prices rewrap.
  `ZZanswer` saves the answer and the charges in one write worked out on the saved load: an estimate already applied
  (auto-approve, or a second phone that had not caught up) adds nothing.
- **A39**: a Short / Over exception from `crewSaveReceiving` carries the crew's reason:
  "Counted 3 against 4 on the BOL: <reason> — Roman at the door".
- Outbound count off on the crew pull card (`ZZd_pullExc`): one Short / Over report per load. When the load already has
  an open report of that kind (for example the Short from receiving), the loading count and its required note are added
  to that report's note ("... · Counted 11 against 12 on the BOL while loading: <note>") instead of being dropped.
- On the kiosk (role `driver`) the red save banner ends with "Please see the office." instead of a staff instruction
  ("Please try again.", "Delete old photos ...", "Tell the owner ..."); `ZZa_kioskBanner`, patch A08.
- Damage-report photos (`dmg:<id>`) taken in a report that was never saved: when a damage report opens, the crew page
  removes, in local mode only, `dmg:` photo keys that no report on this device uses, that are not an open draft and
  whose newest photo is over a day old (`ZZd_sweep`). Shared-mode photos are not touched (orphans there stay).
- `ZZzonedIso` returns `null` for a day or time that does not exist (Feb 30, 24:00, 9:75); a time skipped by the
  spring DST change moves forward an hour.
- Trailer `history` entries also carry an `id`.
- `ZZsync` (sync-source.js) runs **shared mode (A1) for real**, behind the same interface (mode, start, read, write,
  seed, fresh, failed, ok, lease, photoGet, photoSet, importLocal, flush, stats). A page goes shared (`mode 'db'`) only
  when `claude.use("db")` and `claude.use("user")` answer, the viewer is the owner, can edit or `can("data.write")`, and
  every listener has had a server answer; no server answer within 20 s gives `'db-offline'` (look only, never seeds).
  Everyone else (the public link, customers, drivers) stays `'local'`, today's behavior byte for byte. The layout
  (one document per record, portal/meta, lists, photos, locks) is in the header of sync-source.js.
- Events: `cd6:sync {text, kind, slot}` (red banner; `text ""` clears it). `kind` is `'doc'` or `'photo'` only when a
  save of the dock data or of a photo failed just now (the kiosk listens for that, so a driver is never told "checked
  in" when nothing was saved); otherwise `'net'` (connection notice), `'ro'` (look-only notice) or `'again'` (an earlier
  failure shown again). `slot` is the banner's own bookkeeping. Also `cd6:remote` (data changed elsewhere, RA re-reads),
  `cd6:mode` (mode or look-only changed), `cd6:queue {pending}`.
- `ZZSYNC_SEED` (top of sync-source.js) picks what the owner's first visit writes into an EMPTY shared database:
  `"demo"` (staging: today's demo without the 396 filler accounts) or `"empty"` (production: settings, rates and
  logins only, like Setup > Clear demo data). It is `"demo"` now; switch it to `"empty"` before real use.
- Render A1's card only if it exists: `typeof ZZSyncCard!=="undefined"&&...`.
- `ZZFLAGS` (`kiosk2`, `secureStep`): read them **at render time** (`ZZFLAGS.kiosk2?ZZKiosk:XQ`), never copy them at
  load. Tests can switch them per page with the harness option `flags` (only when the test flag is set; the real page
  always uses the values in `engine-source.js`). Regression uses `{kiosk2:false}` to keep checking the old kiosk walk-in.
- **Polish (A40-A43 and wording).** Nick's head CSS forces white text inside `.zzhd` headers, so the bell list (it opens
  inside the header) was white on white on the light theme for office and customers. `ZZhdCSS()` (engine) gives an open
  list inside a `.zzhd` header the theme colours and lifts its header above the office tab bar; the staff header `ps`
  renders it (**A40**), the customer `ZZCSS` appends it, the crew screen keeps its own copy. **A41**: the customer bell
  footnote says what the list is ("Worked out from the trucks and loads in your portal ...") instead of "live from the
  dock"; staff keep Nick's text. **A42**: the sheet close X is a 40 px target (same header size). **A43**: the staff page
  "Test mode is on" warning shows only while `settings.showLogins` is on (A17 rule).
- Check-in codes (`ZZnewCode` / `ZZokCode`) are never a customer, office or crew PIN (`ZZa_usedCodes` adds them).
- Honest words (customers on the public link never see dock data, and nothing is texted or emailed yet): the customer
  schedule panel is "Your trucks today" (only trucks on the way with an ETA today, at the dock or done; plain bookings
  stay in Nick's week calendar), no "We'll email this summary on Friday", the alerts sheet says texts and emails are not
  switched on yet, no "We watch the truck come in", alert emails end with the phone number instead of "You can see it
  live in your portal", the damage text no longer says "Photos and the fix price are in your portal", the crew secure
  step says "Saving keeps the report and photos with this truck" (es / ru too), the kiosk done screen adds "Need help?
  Ask in the office." under "Watch for our text", the office Outbox / Friday / Gear notes no longer claim the
  customers' portal choices reach the office.
- Same names everywhere: "Check-in code" (driver page, was "Kiosk code"), "Log gear back" (office Gear, was "Log
  return"), event "Waiting too long for a door" (was "Waiting over the goal"), Friday week shown as "Mon, Oct 26".
- The crew's suggested labor fix line (`ZZdmgLines`) is "Labor hours" (qty 0.5 = half an hour). It was "Labor, 1 hour" at
  0.5, so the customer read "Labor, 1 hour ... $60" and the bill "Damage: Labor, 1 hour $60". Nick's own office quick
  line "Labor, 1 hour" (qty 1) is unchanged. Crew door tiles show "High Desert" / "Great Basin" instead of "High" /
  "Great" (`ZZd_short`: two words when they fit and the second is not "Freight", "Logistics" ...).
- Two A patches beyond the plan list: **A36** (Setup "Logins card" button follows the new showLogins rule) and
  **A37** (addTrailer renumbers `seq` after empty rows are dropped). Their anchors belong to A.

## Crew truck flow rework (Nick's review, Oct 28): the engine contract

Nick split the forklift truck screen into five jobs and wants the crew to photograph everything. Every part (crew D,
customer B, office E) uses exactly these names. All actions save in **one write**; a refused call writes nothing
(input checks before the save return `null` with a toast; a refusal inside the save resolves the unchanged doc).

**Jobs.** `ZZloadJob(doc, t|tid)` -> `'unpack'` (inbound consolidated: an East Coast origin, a consolidate / reload job
type, or loads that reload) | `'unload'` (inbound pickup trailer) | `'pack'` | `'delivery'` | `'pickup'` (outbound).
Outbound order: `trailer.loadJob` (the office's choice) wins; else `'pack'` when its loads came in on 2+ trucks or belong to
2+ customers, or the job type matches consolidate / reload; else `'delivery'` when a delivery request (`zzRequests`,
type `delivery`, not cancelled) covers one of its loads or the job type says delivery ("Reno delivery"); else `'pickup'`.
The reload part of an inbound truck is always packed (Pack -> Secure -> Manifest). `ZZJOBS[job]` = `{word:'UNPACK', label}`
for headers. `zzLoadJob(tid, 'pack'|'delivery'|'pickup'|null)`: outbound trucks only; `null` (or `'auto'`) = worked out
again (`loadJob:null`); history "Loading job: Delivery". A bad job: toast, `null`.

**Load badges.** `ZZloadBadges(doc, t|tid, cid?)` -> `{[sid]: {n, color, fg, label:'① 118882', mark:'①', name:'Blue', ref,
sid, dir:'in'|'out'}}`. Numbered in seq order: the loads that came in on the truck, then the loads going out on it (the
same load keeps its badge on every staff screen; reordering loads renumbers). `ZZBADGE` is the fixed palette (Blue, Green,
Orange, Purple, Gold, Pink, Teal, Brown, Gray, Olive; load 11 starts again): solid fill + its own text colour, about 3:1 or
better against every page / panel / raised colour of the brand, clean and hi-vis looks. Always show the number (and the
PRO) with the colour. With `cid` (customer screens) only that customer's loads are numbered 1..k.

**Multi-stop.** Fields: `shipment.stop` (integer or null), `shipment.pos` (`'nose'|'middle'|'tail'|null`, for the truck the
load goes out on), `trailer.multiStop` (bool). `ZZPOS` = the three places in loading order with labels and hints.
`ZZposSuggest([1,3,2,3])` -> `['tail','nose','middle','nose']` (one per load, null without a stop or with one stop);
`ZZposSuggest(3)` -> `{1:'tail',2:'middle',3:'nose'}`. `ZZloadOrder(doc, t|tid)` -> `[{s, sid, badge, stop, pos}]` in
LOADING order: nose, then middle (and no position), then tail; inside a place the later stop first, then badge order. It
lists the loads going out on the truck (an inbound truck: its reload loads and any load set to go out on it).
`zzLoadPlan(tid, {multiStop?, loads:[{sid, stop?, pos?}]}, cid?)`: only loads on that truck; a missing stop / pos keeps the
saved one; a bad value saves null; with `cid` (customer portal) only that customer's loads, and `multiStop` only on its
own truck. Nothing changed: no write. History "Load plan: more than one stop" / "one stop" / "updated".

**Damage snaps ("quick snap now, details later").** The crew makes the id (`Ce()`), takes the photos into `'dmg:'+id`
(Xn / ls / ex), then:
- `zzDamageSnap(tid, sid|null, {id, photoCount (1+), note})`. With a load (it must be on that truck): a Damage exception
  `{id, kind:'Damage', draft:true, photoOwner:'dmg:'+id, photoCount, at, openedBy, note, snapNote, resolved:false,
  trailerId:tid}` (`note` is the crew's words or "Damage photo, details to come"; `snapNote` the crew's words only). With
  `null` ("Not sure which load"): `trailer.dmgDrafts:[{id, photoOwner, photoCount, at, by, note}]`. A used id: no write.
  No touch, no auto-approve, no truck history line (the trail goes to customers); activity line only.
- `zzDamageAssign(tid, id, sid|null)`: moves a truck snap onto a load of that truck, a load snap to another load of that
  truck (picked wrong), or (sid null) a load snap back to the truck. Stays a draft, same photos.
- `zzDamageFinish(sid, id, {pallets, kinds, what, lines, photoCount})`: refused under 2 photos (toast). `draft:false` plus
  pallets, kinds, what (empty -> the snap words), photoCount, `est:{lines, sentAt}`, `answer:null`, `finishedAt`,
  `finishedBy`; replaces the plain crew Damage exception, adds the damage touch and applies the auto-approve rule, exactly
  like zzReportDamage. `at` stays the snap time. Only now is it a report: the customer sees it and the Outbox alert is
  queued (timed at `finishedAt`).
- `zzDamageDiscard(tid, sid|null, id)`: removes a snap (never a finished report). The screen may clear its photos:
  `ex('dmg:'+id, [])`.
- `ZZdmgDrafts(doc, tid|null)` -> `[{id, sid|null, ref|null, customerId|null, tid, photoOwner, photoCount, at, by, note,
  where:'load'|'truck'}]`, oldest first: the snaps still waiting on one truck (wrap-up is blocked while any) or on every
  truck (office "damage snaps waiting for details"). A load snap belongs to `x.trailerId`, else to the load's trucks.
- Drafts are invisible to customers: `ZZdmgMonths`, `ZZweek`, `ZZmsgs` (damage alerts and the done text) skip them;
  `ZZtrail(doc, tid, sid?, {staff:true})` shows "Damage photo taken on 118882 (details to come)" and truck snaps to staff
  only; after finishing the trail shows "Damage photo taken on ..." (snap time) and "Damage reported on ..." (finishedAt).
  `ZZnoDrafts(s)` (a load without its drafts; the same object when it has none) and `ZZcustView(doc, cid)` (no drafts, no
  truck snaps, only that customer's manifest lines; the same doc when nothing is hidden, cached per doc) are used by
  **A44** (Nick's shipment sheet for anyone but office / crew, and the public "track a shipment" page), **A45** (the customer
  portal gets `ZZcustView(doc, customerId)`), **A46** (customer bell), **A47** (printed receiving report), **A48** (printed
  truck sheet exception count). Customer code should still skip `x.draft` in its own lists (ZZneeds, ZZestOf's first
  Damage). Office lists in Nick's code (shipment sheet, office bell, open-exception counts) show snaps to staff.
- A crew photo sweep that removes unused `dmg:` photos must count `trailer.dmgDrafts[].photoOwner` as used.

**Photos.** New owners: unloading photos `unload:<tid>` (`trailer.unloadPhotoCount`), packing / loadout photos stay
`after:<tid>` (`afterPhotoCount`), shipper reference photo from the dispatcher `ship:<tid>` (`shipperPhotoCount`,
customer or office), securing / what's used / strapped `strap:<tid>` (`strapPhotoCount`), bills `bol:<tid>`
(`bolPhotoCount`), per-load inspect photo at load-out `insp:<sid>` (`shipment.inspPhotoCount`), the one warehouse photo
per load stays Nick's `row:<sid>` (`rowPhotoCount`, `notePhotos(sid, n, 'row')`). Counts are set with `patchTrailer` /
`patchShipment` like today. `ZZphotoCap(owner)` = 30 for `unload:` and `after:` (nonstop photos), else Nick's 12 (`xA`);
**A33** (ex keeps the last ZZphotoCap photos) and **A49** (Xn's "N photos max here") use it, and so must any other
photo grid. In local mode a list over 12 saves only while the browser keeps about 400k characters free for the dock data
afterwards (a test write; `ZZa_photoRoom`), else "Photo NOT saved: this device is almost full ..." in the red banner;
deleting always saves. **A32**: `dmg: sec: unload: after: strap: bol: ship: insp:` photos are kept past 30 days
(`ZZa_KEEP`). Shared mode stores one document per photo under any owner key (nothing to change in sync-source.js).

**Securing.** `zzSecure(tid, {gear, tags, seal, photoCount, confidence, note, checkedRows, signature})`: at least 1
securing photo (`strap:<tid>`). Saved `secure = {gear, tags, seal, photos:null, photoOwner:'strap:'+tid, photoCount, v:2,
confidence, note, checkedRows, signature, signedBy, signedAt}` and `trailer.strapPhotoCount`. The old 5-photo shape
(`photos:{nose, middle, tail, closeup, seal}`) is still accepted, and old saved reports keep displaying: readers check
`secure.photoOwner` (new) before `secure.photos` (old). Gear rows, seal, history and the "secured" message are unchanged.

**Manifest.** `zzManifest(tid, {lines:[{id?, sid|null, ref?, customerId?, planned?, loaded, stop?, pos?, note?}], signature})`.
Refused (toast, no write): no lines, a line without pallets loaded (a number 0 or more), no signature. A line with a load
takes its PRO and customer from the load (never from the screen); `planned` defaults to the BOL pallets; an extra line
(sid null, e.g. loose freight) keeps its own ref and customer (null = staff only). Saved
`trailer.manifest = {lines:[{id, sid, ref, customerId, planned, loaded, stop, pos, note}], total, signature, signedBy,
signedAt}`; signing again replaces it; history "Manifest signed" (no totals). `ZZmanifestFor(doc, t|tid, cid|null)` ->
`{lines, total, planned, signature, signedBy, signedAt, all}`: staff every line, a customer only its own lines (null when
it has none or there is no manifest).

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
- `mode:'shared'` loads `test/mock-db.js` (db / user / assets per runtime contract 0.2.91) for A1. Options go in
  `mock` (`window.__MOCK`): `caps` (default `['db','user']`; add `'assets'` for asset photos), `isOwner`, `canEdit`, `can`
  (all default true, so a mock page goes shared; pass `{isOwner:false, canEdit:false, can:false}` to stay local),
  `canWrite`, `cachedFirst`, `serverDelay`, `neverServer`, `writeDelay`, `ackDelay`, `useDelay`, `useNever`, `seed`.
  Hooks on `window.__mockdb`: `dump()` and `leases()` return **Promises** (await them), `writes`, `overlaps`, `stats()`,
  `reset(seed)`, `failNext(code, n, op?)`, `listeners()`, `setOffline(bool)`, `killListeners(code)`, `opts`. Two pages
  in one context share the "server" (IndexedDB, mirrored to localStorage `__mockdb`). Test-only knobs before load:
  `window.__ZZSYNC_OFFLINE_MS`, `window.__ZZSYNC_RETRY_MS` (see `a-sync*.test.js`).
- Regression fails on any sideways scroll at 390 px for every role (customer, office, crew, kiosk, TV); stream E fixed
  the TV board on a phone. Only a build without stream E still reports today's TV scroll as a note. TV door cards
  (E29/E30): the door number and its clock never touch or leave the card; a long clock ("1h 19m") moves under the
  door number, at the right (1024 px tablet and phones).
- `e2e-day.test.js` (integration): one load's whole day in ONE build, every role. Local mode: one browser context (one
  device switching roles, `fresh()` clears `cd6:session` and closes the other pages), fixed dock clock (the next weekday
  11:00 AM Pacific, `page.clock`, moved on with `ctx.clock.fastForward`), the base demo moved in time to that clock,
  Altex made a non-dispatch account so its booking rings the office bell. Customer books a drop (2:17 PM, moved to
  2:47 PM), office confirms, driver page (Russian) sets the ETA, kiosk check-in (Español), crew door / start / count /
  damage, customer approves, crew finishes, office releases, pickup with Secure the load, gear, alerts, Outbox, Friday,
  yard board, door map, TV, gear back. Shared mode: office, crew and kiosk pages on one mock database, plus a customer
  page without `db`. Screenshots `<shots>/e2e-*.png` (it sets `SHOT_PREFIX=e2e`). About 2 minutes.
