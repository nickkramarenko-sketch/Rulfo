# 24 HR Crossdock portal: plan to add the new dock features

Date: 2026-10-26. This plan comes from a read-only review of the live portal, the prototype at `/home/user/Rulfo/app`, and the website source. No project file was changed.

Live portal: https://claude.ai/artifact/97haWKtJGFGXW8PjdM9XWv (copy in `website/portal/portal.html`). It is public and every publish reaches everyone at once.
Website preview: https://claude.ai/artifact/Y2gD2gSWixv1kKesiwvp3n (built from `site-src/`).

## 0. Summary

- **Goal.** Add the client, kiosk, driver ETA, forklift crew, office and shared-data features to the live portal. Everything Nick has today keeps working. The website then describes the new features.
- **Build.** A new script, `website/portal/build2.py`, rebuilds the portal from three things: a frozen copy of today's live `portal.html`, readable source files, and small patch lists. It checks that every anchor occurs exactly once and that no two patches touch the same text. Nobody edits `portal.html` by hand again.
- **Streams.** Six work streams. Each one owns its own source file and its own anchors:
  - A: engine and shared data
  - B: customer portal
  - C: kiosk and driver ETA page
  - D: forklift crew
  - E: office
  - F: website
- **Shared contract.** One small shared file, `engine-source.js`, defines every new field, helper and action (section 2). Stream A delivers it first. B to E write their code against section 2 from day one.
- **Safety.** Changes go to a private staging artifact first. The public link never gets the shared database, so customers keep their data in their own browser. Staff share data in a separate private "staff" artifact.

Two facts limit what can be built today:

1. **Only staff can share data.** Only the owner, and Editors invited by email to an artifact that is not shared by link, can write the shared database. People on the public link (customers, drivers) can neither read nor write it. So a customer's booking, a driver's ETA from their own phone, and anything typed on the public link stay in that browser. Shared data is for the office, crew, kiosk tablet and TV.
2. **Nothing is actually texted or emailed yet.** The Outbox shows what would be sent. Screens say "Alert queued" or "We'll text you…" and never "Texted". Until a texting service is added, the office sends anything urgent by hand from the Outbox.

---

## 1. Ground rules

### 1.1 Files and who owns them

| Path (under `/home/user/Rulfo/website/portal/`) | Owner | What it is |
|---|---|---|
| `base/portal.base.html` | A creates once, then frozen | Exact copy of today's live `portal.html` (1,136,581 bytes). Every build starts here. |
| `base/customer-portal-source.base.js`, `base/crew-source.base.js` | A creates once, then frozen | Exact copies of today's two source files. Their text sits verbatim in the base, once, so build2 can swap it. |
| `build2.py` | A | The build (1.2). |
| `patches/A_engine.py` … `patches/F_website.py` | one file per stream | Each file has `PATCHES = [(id, old, new, why), ...]`. Use raw strings `r'...'`. |
| `engine-source.js` | A | Shared helpers and actions (section 2). |
| `sync-source.js` | A | Storage layer: local or shared, the mode badge, the shared-data card. |
| `customer-portal-source.js` | B | Existing file (ZZCP and friends). B edits it in place. |
| `kiosk-source.js` | C (new) | ZZKiosk, ZZEta, ZZKT, ZZdriverText. |
| `crew-source.js` | D | Existing file (ZZCrew, ZZSteps, ZZCrewOffice). D edits it in place. |
| `office-source.js` | E (new) | ZZYard, ZZOutbox, ZZFriday, ZZGearOffice, ZZDockSet, ZZTruckExtra, ZZobx. |
| `test/harness.js`, `test/mock-db.js`, `test/run.js`, `test/regression.test.js` | A | Shared test tools. |
| `test/<stream>-*.test.js` | each stream | One or more test files per stream. `run.js` picks them up by glob. |
| `dist/portal.html`, `dist/app.js` | build output | Review copy plus the extracted JS. |
| `portal.html` | release step only | Replaced with `dist/portal.html` when a release is approved. |
| `/home/user/Rulfo/site-src/**` | F | Website source. F never touches `site/` by hand; `site-src/build.py` writes it. |

Engineers never edit another stream's files. If a stream needs a bundle anchor that belongs to someone else, it asks that owner to add a hook. The build refuses overlapping patches, so a clash shows up at once instead of breaking the portal later.

### 1.2 How build2.py works

1. **Read the frozen base.** Read `base/portal.base.html`. Treat it as text; never parse it.
2. **Swap the source span.** The base contains `customer-portal-source.base.js + crew-source.base.js` exactly once, ending just before `KQ=({doc:e,now:t,actions:a,onExit:r,openShipment:n`. Replace that whole span with, in this order: `engine-source.js`, `customer-portal-source.js`, `crew-source.js`, `kiosk-source.js`, `office-source.js`. This span is owned by build2, not by any stream.
3. **Insert the sync source.** Put `sync-source.js`, which is a normal statement such as `var ZZsync=…;`, right before `var Xj=e=>"cdweb:"+e;` (anchor A01).
4. **Load every patch list.** Load `patches/*.py`. For each `(id, old, new)`:
   - `old` must occur exactly once in the base.
   - Record its span.
   - Fail if any two spans overlap, or if a patch span falls inside the source span.
   - Patch ids must be unique.
5. **Apply.** Apply all spans from the end of the file backwards. Nothing is searched again after a replacement, so new code can never create a second copy of someone's anchor.
6. **Check names.** Collect every top-level `ZZ…=` name defined in the five injected sources and the sync source. Fail on a duplicate, or on a name the base already defines. The base already defines ZZCP, ZZCSS, ZZCrew, ZZCrewOffice, ZZEst, ZZPHONE, ZZPull, ZZREQ, ZZSign, ZZSteps, ZZTEL, ZZTRL, ZZUp, ZZanswer, ZZbadges, ZZcrewStats, ZZestOf, ZZfit, ZZgroup, ZZh, ZZiso, ZZkind, ZZkinds, ZZlane, ZZlb, ZZlead, ZZmeter, ZZn, ZZneeds, ZZphoneI, ZZpill, ZZplt, ZZreqSt, ZZsame, ZZsince, ZZsow, ZZstatus, ZZt10, ZZtStatus, ZZtable, ZZtimes, ZZtr, ZZtr2, ZZtrDone, ZZtr2Done, ZZwhen and ZZwt. Those names are only redefined when the owning stream edits its own file.
7. **Write and syntax-check.** Write `dist/portal.html`. Extract the main script, which runs from `<script>\n(()=>{` to the next `</script>`, into `dist/app.js`. Run `node --check dist/app.js`; this works here, and the current bundle passes it.
8. **Report.** Print every patch id applied and the output size. Append `<!-- build2 <git short sha> -->` after `</html>`.

Notes:

- Write `old` strings exactly as they appear in the file. The minified code has backslash escapes as literal text, for example `\xB7` and `—`. Use raw strings in Python, as the anchors in section 3 do.
- If you need a new anchor, check it first: `python3 -c "import sys;s=open('website/portal/base/portal.base.html').read();print(s.count(sys.argv[1]))" '<anchor>'` must print 1. Then add it to your own patch file.
- The old `build.py` cannot run again. It needs the original pre-patch bundle, which is gone; its anchors such as `a==="client"?ae((0,i.jsx)(KQ,{` occur 0 times in the live file. Leave it as history.
- For reading the minified code, pretty-print `dist/app.js` with js-beautify. It is installed in the session scratchpad under `portal/tools`; elsewhere run `npx js-beautify`. Line numbers in this plan refer to the pretty-printed copy of today's bundle, `pretty.js`.

### 1.3 How to write a source file

- The five chain files (`engine-source.js`, `customer-portal-source.js`, `crew-source.js`, `kiosk-source.js`, `office-source.js`) are spliced into a long `var a=…,b=…` chain inside the bundle. So each file is a list of `Name=value,` entries:
  - no `const`, `let` or `function` at the top level, and no statements;
  - the file starts with a name and ends with `},` or `,`.
  - `sync-source.js` is the exception: it is a normal statement block.
- In scope:
  - React `H`, JSX `(0,i.jsx)` / `(0,i.jsxs)` and the helper `ZZh(tag, props, ...children)`.
  - Theme `m` (`m.bg, m.panel, m.raised, m.line, m.text, m.mut, m.dim, m.orange, m.amber, m.red, m.green, m.blue, m.violet, m.teal`).
  - Translation `R(text)`.
  - Ids and times: `Ce()` id, `ye(ms)` ISO, `ie(x, def)` number, `je` money, `at` / `ge` / `Dt` / `ot` formatting.
  - Doors `Gi` (D1–D8) and `Ee` ("YD", the yard).
  - Truck math: `sa`, `qo`, `fe`, `$e`, `ir`, `Kn`, `An`, `vm`, `Ln`, `Pj`.
  - Photos: `Bj`, `ls`, `ex`, `dt`, `Xn`, `lr`.
  - UI parts: `Gt` (modal), `de` (card), `Z` (button), `ve` (pill), `se` (input), `xe` (field), `MA` (bell).
  - Icons: `cu` timer, `un` send, `Sa` package, `bi` shield-check, `uu` settings, `Ca` truck, `sn` calendar, `Fd` clock, `zd` bell, `su` camera, `$d` tv, `wr` triangle-alert, `Ct` file-text, `gl` dollar-sign, `cn` warehouse, `Ze` circle-check, `Bd` arrow-up, `_d` arrow-down.
- **Never run code at load time that uses a name defined later in the bundle.** The chain uses `var`, so such a name is `undefined` at that moment; `Sj`, the translation table, is one of them. Do one-time setup lazily on first render, as `ZZtr` does.
- **Private helper names carry the stream's prefix** (`ZZb_`, `ZZk_`, `ZZd_`, `ZZo_`). Public names are exactly the ones in section 2.
- **Shared actions use one new name prefix.** Their names start with `zz` and must not repeat one of the 67 existing names. The existing `zz` actions are zzReq, zzReqPatch, zzAddLoad, zzRemoveLoad, zzAddCrew and zzUpdateCrew.

### 1.4 Keep Nick's screens and behavior

- **Add; don't take away.** Every current tab, sheet, step, button and flow stays.
- **Old components stay as a fallback.** The old kiosk `XQ`, the old portal `KQ`, the outbox `qQ` and the rest stay in the bundle. `ZZFLAGS` in `engine-source.js` (for example `{kiosk2:true, secureStep:true}`) switches back to the old screen with a one-line rebuild.
- **Existing saved data is never migrated on load.** Customers and staff have v8 docs in their browsers (`cdweb:cd6:doc`).
  - Read every new field with a default (`t.history||[]`, `x.zzGear||[]`, `ZZS(doc).promiseMin`).
  - Do not raise `bA` (8). The `CQ` migration would then rewrite every doc.
  - Opening the new build must not write anything until someone does something.
- **Existing actions keep their names and behavior.** Stream A makes only the small, guarded changes listed in 2.6.
- **Never call `updateCustomer` for partial edits.** It sets `rates` to null whenever `rates` is not passed. Use `zzCustomer`.
- **Keep current wording, PINs, prices and rules unless the feature says otherwise.** Examples: the $20 replacement pallet in ZZEst, "no account, no door" at the kiosk, and dispatch accounts booking straight onto the schedule.

### 1.5 Rules that make code work with local and shared data

- Change the doc only through actions (`props.actions.*`). Never read or write `cd6:doc` yourself, and never write from inside a render.
- Photos go only through `Xn` / `lr` / `ls` / `ex` with an owner key. Stream A sends them to the shared database in shared mode.
- The only new top-level doc keys are `zzGear` and `zzOutbox`. Shared mode maps keys one by one, so any other new top-level key needs Stream A to add it.
- Every record in an array has an `id`.
- Never delete a key inside an object; set it to `null`. Shared updates merge nested objects, so a deleted key would come back.
- Keep growing lists short:
  - `trailer.history`: last 100
  - `zzOutbox`: 300
  - `zzGear`: no cap (it is a ledger)
  - existing chat caps stay
- Per-device settings go in plain `localStorage` under `cd6:…` keys, for example `cd6:zzdone:<cid>`, inside try/catch.
- Customer screens never show:
  - `doc.activity`;
  - other customers' names or trucks (busy-day counts only; place in line is a number);
  - any PIN.

### 1.6 The window.storage shim

- **Today.** At the bottom of the bundle, `window.storage.get/set` maps to `localStorage` with the prefix `cdweb:` (`Xj`). The whole doc lives in `cdweb:cd6:doc`, and photos in `cdweb:cd6:photos:<owner>` (at most 12 per owner, removed after 30 days). `?reset` in the URL deletes every `cdweb:` key; it only works on the raw file, not inside the viewer. When the browser runs out of space, saves fail silently: `bQ` logs "commit failed" and the change exists only on screen.
- **After A0 (always).** The original object becomes `window.ZZlocal`. `window.storage` becomes a small router:
  - photo keys (`cd6:photos:`) go to `ZZsync.photoGet/photoSet` in shared mode;
  - everything else goes to `ZZlocal`;
  - a storage-full error or a failed commit raises a `cd6:sync` event, which shows in the existing red banner.
- **After A1 (shared mode).** `ZZsync.start()` turns shared mode on only when all of these hold:
  - `claude.use("db")` and `claude.use("user")` both answer;
  - the viewer is the owner, can edit, or `can("data.write") === true`;
  - every listener has sent a server answer (`metadata.fromCache === false`).
  Everyone else stays in local mode, which is exactly today's behavior. The portal's first load waits for `window.ZZready`. In shared mode `ZZt10`, the demo injection, never runs.

### 1.7 Build and test

```bash
cd /home/user/Rulfo
python3 website/portal/build2.py            # writes website/portal/dist/portal.html and dist/app.js
node website/portal/test/run.js             # every test file
node website/portal/test/run.js c           # only files starting with c-
python3 site-src/build.py                   # website (stream F)
```

**Playwright.** Playwright 1.56 is installed globally. Chromium is in `/opt/pw-browsers` (`PLAYWRIGHT_BROWSERS_PATH` is set). The harness loads it the same way `app/test/harness.js` does: `require(path.join(execSync('npm root -g')+'', 'playwright'))`. I checked that it launches and that today's `portal.html` opens with no page errors.

**What `test/harness.js` (A) does:**

- **Serving.**
  - Serves `dist/portal.html` as is (it already has the page skeleton) on `127.0.0.1:<free port>`.
  - Answers fonts.googleapis.com and fonts.gstatic.com with empty CSS.
- **Opening routes.**
  - `open(hash, {viewport, mode, seed, now})` opens a **new page for every route**. ZZSign reads the hash once when it mounts, and a `goto` that only changes the hash does not reload. Today's routes are `#customer #office #crew #stations #signup #staff`; new ones are `#kiosk #tv #eta1234`.
- **Data modes.**
  - `mode:'local'` injects nothing, so the page uses localStorage.
  - `mode:'shared'` injects `test/mock-db.js` before load. That file is a copy of `app/test/mock-claude.js` extended with:
    - snapshot `metadata` (`fromCache`, `hasPendingWrites`) and `docChanges()`;
    - document `onSnapshot`;
    - nested paths (`photos/<owner>/items/<id>`);
    - `where` / `orderBy` / `limit` and `acquire`;
    - switches for `isOwner` / `canEdit` / `can`;
    - an option to send a first cached, empty snapshot.
  - Pages in one browser context share the mock database, so two pages act like two devices.
  - `seed` writes a fixture doc to `cdweb:cd6:doc` before load (set `v:8` and `zzT10:true` so the demo is not injected again).
- **Sign-in helpers** use seed logins:
  - customer: Altex Transportation, PIN 7788 (also Pine Ridge 1357, High Desert 4410, Sierra Summit 7731)
  - office: Nick, 2468
  - crew: Roman, 1111
- **Timers.** Use `page.clock.install({time})` for the kiosk 30 s / 90 s timers and for wait clocks.
- **Checks in every test:**
  - no `pageerror`;
  - at 390 px wide, `document.scrollingElement.scrollWidth <= 390`.
  - Layout checks run at 390×844 (phone) and 1400×900 (office). The kiosk also runs at 1024×768.

**Regression (`test/regression.test.js`, A; everyone runs it before merging):**

- Every role opens and shows its main screen at 390 and 1400:
  - customer Schedule tab
  - office Board
  - crew Next job
  - kiosk from `#stations`
  - TV
- The old screens and flows still work:
  - customer: book a truck, cancel a booking, answer a damage estimate;
  - crew: start a truck, count a load, wrap up;
  - office: assign a door, release a truck;
  - kiosk: walk-in.
- **Old data still loads.** A doc saved by the base build is loaded into the new build. It renders, and `rev` stays the same until the first action.

### 1.8 Publishing (portal)

1. **Build and test.** Run the build and all tests on the release candidate.
2. **Staging (local mode).** Publish `dist/portal.html` as a **new private artifact**, titled for example "24 HR Portal staging", with no capabilities, so it runs in local mode. Nick checks it on his phone and on a desktop.
3. **Staff staging (shared mode).** Publish the same file as a second private artifact with `capabilities: {db:{rules:[{path:"",read:"interact",write:"interact"}]}, user:{}}`. Add `assets:{}` only if photos should be stored as files.
   - Test on two devices signed in as Nick.
   - Check that `https://claude.ai/artifact/<id>#eta1234` and `#kiosk` actually reach the page. If the hash is stripped, use the in-app route through `#stations` instead.
4. **Live public link.**
   - Copy `dist/portal.html` over `website/portal/portal.html`.
   - Read the live artifact first (Artifact `read`, url `97haWKtJGFGXW8PjdM9XWv`) and confirm it declares no `db` capability.
   - Publish with that url and **without** a `capabilities` field; leaving it out keeps what is stored.
   - Customers stay on local data.
5. **Staff artifact (once).** Create a private artifact with the `db` capability.
   - Nick invites staff by email as Editors. **Never share it by link**: an Editor invited from outside the organization loses write access while a link share exists.
   - The kiosk tablet and the TV are signed in to claude.ai with a staff account.
6. **Rollback.** Republish `base/portal.base.html`, or pick the previous version in the artifact's history.

---

## 2. The shared contract (defined once; every stream uses these names)

### 2.1 Conventions

- **Field names.**
  - `trailer.dock` is the **door**: `"D1".."D8"`, `"YD"` (yard) or `null`. The location (Sparks NV / North Highlands CA / Middletown PA) will be `trailer.site`, which is reserved for later. Never call it `dock`.
  - The driver's cell number stays in the existing `trailer.phone` and the driver's name in `trailer.driver`. Do not add `driverCell` or `driverName`.
- **Times and money.**
  - Times are ISO strings. Clocks are worked out from them in milliseconds. Money is in dollars.
  - Dock time is `America/Los_Angeles`, as in `lQ` and `vm`. Appointment times are entered and shown in dock time; use `ZZzonedIso` / `ZZdockParts`.
- **The 4-digit code.** `trailer.code` is the **check-in code** for that truck. It is never `customer.pin`, which is the portal login and must never go to drivers.
- **Photo owner keys.**
  - Existing: `<sid>`, `row:`, `load:`, `docs:`, `pull:`, `paper:<tid>`, `before:<tid>`, `after:<tid>`.
  - New: `dmg:<exceptionId>` and `sec:<trailerId>:<nose|middle|tail|closeup|seal>`.
  - The kiosk saves paperwork to the existing `paper:<tid>`.

### 2.2 New data fields

| Where | Field | Type / values | Written by | Read by |
|---|---|---|---|---|
| trailer | `code` | `"4821"`, unique among active trucks | addTrailer, checkInWalkup, zzEnsureCode | B C D E |
| trailer | `bookedVia`, `bookedBy` | `'client'\|'office'\|'kiosk'`, person name | B and E through addTrailer `...D` | E, ZZmsgs |
| trailer | `createdAt` | ISO, set by addTrailer when missing | A | ZZmsgs `booked` |
| trailer | `confirmedAt`, `confirmedBy` | ISO, office name | zzConfirm | B (pending / confirmed), E bell |
| trailer | `eta` | `{at, source:'driver'\|'client'\|'office'\|'samsara'\|'gps', updatedAt, by, note}` | zzEta | B C D E, ZZtruckSteps |
| trailer | `tracking`, `trackUrl` | `'link'\|'samsara'\|'gps'\|'self'\|'none'`, https URL | B via addTrailer, zzTrack | B C E |
| trailer | `driverLang` | `'en'\|'es'\|'ru'\|'uk'\|'pa'\|'hi'` | B (booking), C (kiosk) | C, D, E, ZZmsgs |
| trailer | `loadOrder` | bool (loads follow `seq`) | B via addTrailer | D (unload order), B |
| trailer | `history` | `[{at, by, text}]`, last 100 | zzLog and every new action | ZZtrail |
| trailer | `secure` | `{gear:{plywood\|bars\|straps\|airbags:{qty, owner:'ours'\|'driver'}}, tags:[], seal, photos:{nose,middle,tail,closeup,seal}` (counts)`, confidence:1-5, note, checkedRows:true, signature, signedBy, signedAt}` | zzSecure | B D E, ZZmsgs |
| trailer | `secPhotos` | `{nose:n,…}` live counts while taking photos | D via patchTrailer | D |
| trailer | `checkedInBy` | `'kiosk'\|'office'` | zzKioskIn, checkInWalkup | E |
| trailer | `site` | reserved: `'reno'\|'sac'\|'pa'` (later) | (none yet) | (none yet) |
| shipment | `pieces` | number | addTrailer / zzAddLoad mapping | B D |
| shipment | `stackable` | `true\|false\|null` | same | B D |
| shipment | `hazmat` | bool | same | B D |
| shipment | `weight`, `dest`, `po`, `bol`, `loadNotes`, `seq` | already exist; now filled from the booking (`seq` = row order) | same | everyone |
| exception | `pallets`, `kinds[]`, `what`, `photoOwner` (`'dmg:'+id`), `photoCount` | crew damage report | zzReportDamage | B D E |
| exception | `answer.auto` | `true` when the customer's limit approved it; `answer.status` stays `'accepted'` | zzEstLines / zzReportDamage | B E |
| customer | `contacts` | `[{id, name, role, phone, email, alerts:{<event>:{text:bool, email:bool}}}]` | zzCustomer (B UI) | ZZrecips |
| customer | `autoApproveUnder` | number or `null` (default `null` = never) | zzCustomer | ZZautoLimit |
| customer | `fridaySummary` | bool, default true | zzCustomer | E, ZZweek |
| customer | `securementInterest`, `securementInterestBy` | ISO, name | zzCustomer | E |
| settings | `promiseMin` 120, `promiseText` "Unloaded within 2 hours of check-in", `waitGoalMin` 30, `gearPlan` `{price:2000, months:6}` | read only through `ZZS(doc)` | zzSettings (E UI) | B C D E |
| settings | `sites` | reserved for later | (none yet) | (none yet) |
| settings.crewMembers[] | `phone`, `shift:{start:'06:00', end:'14:30', days:[1..5]}`, `rank` | already read by ZZlead; now editable | zzUpdateCrew (D UI) | ZZcrewOnShift, ZZlead |
| rates | `newPallet` 20 (default added to `nx`) | number | saveRates / zzSettings | ZZdmgLines |
| doc | `zzGear` | `[{id, customerId, trailerId\|null, type:'plywood'\|'bars'\|'straps'\|'airbags', qty, dir:'out'\|'back', tags:[], at, by, note, src:'secure'\|'return'\|'manual'}]` | zzSecure, zzGear | B D E, ZZgearOut |
| doc | `zzOutbox` | `[{id, at, event:'friday'\|'manual', week?, customerId, trailerId\|null, channel:'sms'\|'email', to, toName, subject, body}]`, newest first, max 300 | zzQueueFriday | E |

### 2.3 Settings defaults

`ZZS(doc)` returns `{promiseMin:120, promiseText:"Unloaded within 2 hours of check-in", waitGoalMin:30, gearPlan:{price:2000, months:6}, ...doc.settings}`. Always read the promise, wait goal and plan price through it.

### 2.4 Helpers in `engine-source.js` (pure; they never write)

**Constants**

| Name | Value |
|---|---|
| `ZZFLAGS` | `{kiosk2:true, secureStep:true}` |
| `ZZPUBLIC_URL` | `"https://claude.ai/artifact/97haWKtJGFGXW8PjdM9XWv"`. Never `location.href`: inside the viewer that is a sandbox frame. |
| `ZZLANGS` | `[{k:'en',name:'English'},{k:'es',name:'Español'},{k:'ru',name:'Русский'},{k:'uk',name:'Українська'},{k:'pa',name:'ਪੰਜਾਬੀ'},{k:'hi',name:'हिन्दी'}]` |
| `ZZEVENTS` | `[booked 'Booking confirmed', eta 'ETA changed', arrived 'Truck checked in', waiting 'Waiting over the goal', started 'Unloading or loading started', damage 'Damage found', done 'Done, with photos', secured 'Loaded and secured', friday 'Friday summary']`, as `{k,label}` |
| `ZZALERTS` | Default choices for a new contact: `{booked:{email}, arrived:{text}, waiting:{text}, damage:{text,email}, done:{email}, secured:{email}, friday:{email}}`, all others off. |
| `ZZGEAR` | `[{k:'plywood',label:'Plywood sheets',hint:'Usually 5 to 6'},{k:'bars',label:'Load bars',hint:'Usually 2'},{k:'straps',label:'Straps',hint:'Usually 4'},{k:'airbags',label:'Airbags',hint:'Only for gaps'}]` |
| `ZZSECSLOTS` | `nose` (front of trailer), `middle`, `tail` (at the doors), `closeup` (bars or straps), `seal` (number showing) |
| `ZZDMGKINDS` | `['Crushed','Torn wrap','Leaning','Wet','Broken pallet','Missing boxes','Other']` |

**Settings, codes and links**

| Helper | Returns |
|---|---|
| `ZZS(doc)` | Settings with the defaults above. |
| `ZZactive(t)` | true unless the stage is `departed` or `cancelled`. |
| `ZZcode(t)` | `t.code`, or a stable 4-digit code worked out from `t.id` (no write; for old trucks). |
| `ZZnewCode(doc)` | A random 4-digit code not used by any active truck. |
| `ZZokCode(doc, c)` | `c` if it has 4 digits and is free, else `ZZnewCode(doc)`. |
| `ZZbyCode(doc, code)` | The active truck with that code, or `null`. |
| `ZZetaLink(t)` | `ZZPUBLIC_URL + "#eta" + ZZcode(t)`. |
| `ZZsafeUrl(u)` | The trimmed https URL (at most 500 characters), else `""`. |
| `ZZzonedIso(ymd, hhmm)` | The ISO time for that wall-clock time in dock time. |
| `ZZdockParts(iso)` | `{ymd, hhmm}` in dock time. |

**Yard, clocks and promise**

| Helper | Returns |
|---|---|
| `ZZyardQ(doc)` | Trucks checked in and waiting, oldest first: `arrivedAt` set, dock `null` or `Ee`, stage `arrived`, sorted by `arrivedAt`. |
| `ZZplace(doc, tid)` | Place in line (1 = next), or `null`. |
| `ZZwaitMs(t, now)` | `arrivedAt ? max(0, (workStartedAt \|\| now) − arrivedAt) : null`. It counts from check-in even when the kiosk gave a door right away. |
| `ZZtone(ms, doc)` | `'good'`, `'warn'` (75% of the goal or more), `'bad'` (goal or more) or `'neutral'`. |
| `ZZtoneColor(tone)` | `m.green` / `m.amber` / `m.red` / `m.mut`. |
| `ZZestWait(doc, tid, now)` | Estimated minutes until a door opens (at least 5), or `null`. Same method as the prototype's `estWaitMin`: average door time for trucks done today (default 35), divided across up to 3 free doors. |
| `ZZpromise(doc, t, now)` | `{limitMin, deadline, elapsedMin, leftMin, doneMin, kept}`. `doneMin = (workDoneAt − arrivedAt)/60000`; `kept` is null until the truck is done. |
| `ZZtruckSteps(t, now)` | `[{k, label, state:'done'\|'now'\|'todo', at}]` for booked, eta ("On the way"), arrived ("Checked in"), waiting (with the clock), door ("At door D3"), working ("Unloading"/"Loading"), done. |

**Day load and crew**

| Helper | Returns |
|---|---|
| `ZZdayLoad(doc, ymd, excludeTid)` | `{blocks:[{from, label:'8–10 AM', trucks}], total, level:'Light'\|'Steady'\|'Busy', crew, doors}`. Counts trucks that are not cancelled, in 2-hour blocks from 6 AM to 10 PM. Counts only: no names and no ids. |
| `ZZcrewOnShift(doc, ms)` | Crew members whose shift covers that moment; if nobody has a shift, `settings.crew` (default 3). |

**Gear and damage**

| Helper | Returns |
|---|---|
| `ZZgearOut(doc, cid\|null)` | `{plywood, bars, straps, airbags, tags:[]}`: gear out minus gear back, never below 0. |
| `ZZdmgLines(doc, s, pallets)` | Suggested fix lines: `[{label:'Rewrap pallet', qty:pallets, unit:rates.rewrap, on:true}, {label:'Labor, 1 hour', qty:0.5, unit:rates.laborHour, on:true}, {label:'Replacement pallet', qty:1, unit:rates.newPallet\|\|20, on:false}]`, from `Ln(doc, s.customerId)`. The labels match the ZZEst quick lines. |
| `ZZestTotal(lines)` | The sum of qty × unit. |
| `ZZautoLimit(customer)` | `autoApproveUnder` as a number, or `null`. |
| `ZZdmgMonths(doc, cid)` | `[{month:'2026-10', reports, pallets, approved, declined, open, items:[{s,x}]}]`, newest first, Damage only. |

**Week, trail and messages**

| Helper | Returns |
|---|---|
| `ZZweekKey(now)` | The Monday (dock time) as `'YYYY-MM-DD'`. |
| `ZZweek(doc, cid\|null, now)` | `{from, trucks, done, palletsIn, palletsOut, avgWaitMin, avgDoorMin, promiseKeptPct, damageReports, damageApproved, gearOut}` from Monday 00:00 to now. |
| `ZZtrail(doc, tid, sid?)` | `[{at, by, text, sid?}]` sorted by time, built from: booked, eta updated, checked in, door, started, done, released, cancelled, `trailer.history`, and per load (received with count, touches, corrections, damage and answers, loaded, shipped, invoiced). Safe to show customers: it never reads `doc.activity`. |
| `ZZrecips(customer, event)` | `[{name, phone, email, channels:['sms'\|'email']}]` from `contacts`. With no contacts: email to `customer.contact` for booked, damage, done, secured and friday. |
| `ZZmsgs(doc, now)` | The worked-out messages for the new events, in the outbox shape (2.7). |

### 2.5 New actions (inside the actions object; each change is saved in one write)

`engine-source.js` defines `ZZacts=({S,C,M,N,L,B,w})=>({...})`. Patch A09 spreads it into the actions object. `S` saves, `C` adds an activity line, `M`/`N` patch a load/truck, `B()` is the person's name, `L()` is the role label, `w` shows a toast. Actions return nothing unless noted.

1. **`zzLog(tid, text, patch?)`**
   - Merges `patch` into the truck and adds `{at, by:B(), text}` to `history` (last 100).
   - Activity line: kind `'trailer'`.
   - The one path for small truck changes: time change, confirmation, driver link.
2. **`zzEta(tid, {at, source, note, by?})`**
   - Sets `eta = {at, source, updatedAt:now, by, note}` and adds history "ETA now 2:40 PM (customer)".
   - Does nothing if the truck has already checked in, departed or been cancelled.
3. **`zzTrack(tid, {tracking, trackUrl})`**
   - Cleans `trackUrl` with `ZZsafeUrl` and adds a history line.
4. **`zzEnsureCode(tid)`**
   - Sets `code` if it is missing, using `ZZnewCode` on the latest doc.
5. **`zzConfirm(tid)`**
   - Sets `confirmedAt` and `confirmedBy`; history "Time confirmed".
6. **`zzCustomer(cid, fields)`**
   - Merges `fields` into the customer after dropping `id`, `name`, `rates`, `pin` and `dispatch`.
   - Used for contacts, autoApproveUnder, fridaySummary and securementInterest.
7. **`zzEstLines(sid, xid, lines)`**
   - Replaces what `ZZEst.save` does today: saves `est.lines` and `est.sentAt`, and clears any answer that is not `'call'`.
   - Auto-approves when all of these hold:
     - it is not already applied;
     - `ZZautoLimit(customer)` is a number;
     - `0 < total < limit`.
   - Auto-approving sets `answer = {status:'accepted', auto:true, by:'Auto-approved (your setting: under $X)', at, total}` and `est.applied = true`.
   - It then adds `Damage: <label>` adjustments exactly as `ZZanswer('accepted')` does: lines from `ZZestOf`, skipping its automatic rewrap line. It also adds an account-chat note.
   - It never auto-approves when the limit is `null`, which is the default.
8. **`zzReportDamage(sid, {id, pallets, kinds, what, photoCount, lines})`**
   - Refuses if `photoCount < 2`.
   - Adds a Damage exception `{id, kind:'Damage', note, at, openedBy:B(), resolved:false, pallets, kinds, what, photoOwner:'dmg:'+id, photoCount, est:{lines, sentAt}, answer:null}`.
   - Removes the plain Damage exception that `crewSaveReceiving` opened on the same load, if it has no photos, no estimate and no answer, so there is no duplicate.
   - Adds a `'damage'` touch and applies the same auto-approve rule as `zzEstLines`.
9. **`zzSecure(tid, secure)`**
   - Refuses unless all of these are true:
     - 5 photo counts;
     - confidence 1–5;
     - a note when confidence is 1–3;
     - `checkedRows`;
     - a signature.
   - Saves `secure` plus `signedBy` / `signedAt`, and sets `sealOut` to the seal in capitals.
   - Rewrites this truck's `src:'secure'` gear rows: one `'out'` row per type marked `owner:'ours'` with `qty > 0`. Tags go on the bars row, or on the first "ours" row.
   - History line "Load secured: 4/5, seal 123456".
10. **`zzGear({customerId, trailerId?, type, qty, dir, tags?, note?})`**
    - Adds a ledger row with `id`, `at`, `by:B()`, and `src` `'return'` or `'manual'`.
11. **`zzKioskIn(tid, {driver, phone, truck, trailer, lang, by})`** (async)
    - Returns `{dock, place, estMin, trailerId, truck, trailer, afterHours}`, or `{already:true, dock, place, trailerId}`, or `null`.
    - In one write:
      - Refuses if the truck already checked in, departed or was cancelled.
      - Saves the confirmed details plus `driverLang` and `checkedInBy`.
      - Picks a door exactly as `checkIn` does (first free door, else the yard) and sets stage, `arrivedAt` and `dockedAt` the same way.
      - Adds history and activity lines (actor `'Kiosk'`, kind `'checkin'`).
    - In shared mode it holds `ZZsync.lease('doors')` around the write.
12. **`zzReorder(sid, tid, dir)`**
    - Swaps `seq` inside `ir(trailer)` for **that** truck. Use it for pickups: `reorderLoad` reorders against the inbound truck.
13. **`zzSettings(patch)`**
    - Merges into `settings` (never `admins` or `crewMembers`); `patch.rates` merges into `rates`.
14. **`zzQueueFriday(week, entries)`** (async; returns how many were queued)
    - `entries` = `[{customerId, channel, to, toName, subject, body}]`.
    - Skips customers that already have a `friday` entry for that week, then adds the rest to `zzOutbox` (max 300).

### 2.6 Changes to existing actions and engine code (Stream A only; anchors in 3.A)

- **addTrailer**
  - Uses `D.id||Ce()` as the truck id, so the booking form can choose the id.
  - Sets `code:ZZokCode(T,D.code)` and `createdAt`.
  - Copies `weight`, `pieces`, `stackable`, `hazmat` and `seq` (row order) onto each load.
- **zzAddLoad:** copies the same load fields, plus `po`, `bol`, `loadNotes` and `seq`.
- **checkIn:** never checks in twice. If the truck already has `arrivedAt`, or has departed or been cancelled, it returns `{already:true}` and writes nothing.
- **checkInWalkup:** sets `code`, `driverLang` (from `P.driverLang`) and `checkedInBy:'kiosk'`.
- **crewSaveReceiving:** no longer auto-closes a damage report that has photos (`photoOwner`) or a customer answer.
- **ZZt10:** does not put the demo back when `demoCleared` is set.
- **nx:** adds `newPallet:20`.
- **pQ:** adds `ZZmsgs(doc, now)`, so the existing outbox shows the new events.
- **Photo purge:** `dmg:` and `sec:` photos are kept past 30 days. Photo save failures and commit failures show in the banner.
- **Sign-in:** the test-mode "open an account without a PIN" list (which today includes office logins) shows only when `settings.showLogins === true`. Nick can switch it on in Setup.
- **Storage:** the patches A01–A08 in 1.6 and 3.A.

### 2.7 Messages (Outbox)

- **Messages worked out from the data** (`ZZmsgs`; never stored, so no extra writes). Each event takes its timestamp from data that does not change afterwards:
  - booked: `confirmedAt`, or `createdAt` for dispatch accounts
  - eta: `eta.updatedAt`
  - arrived: `arrivedAt`
  - waiting: `arrivedAt + goal`, if the truck had not started by then
  - started: `workStartedAt`
  - damage: `exception.at`
  - done: `workDoneAt`. The text lists pallets counted against the BOL, the number of photos, damage reports, and the total time against the promise.
  - secured: `secure.signedAt`
- **Message details.**
  - Ids are stable: `<event>:<id>:<contact index>`.
  - Each message: `{id, channel:'sms'\|'email', to, toName, subject, body, ts, about, deliverable, event, customerId, trailerId, lang}`.
  - Only the last 14 days are listed.
- **Driver texts.** `pQ` already writes the English driver texts: door, yard, released, 2-hour reminder. When `driverLang` is not English and `ZZdriverText(lang, key, vars)` exists (from C), `ZZmsgs` adds a translated copy.
- **Stored messages** (`zzOutbox`): only messages sent on purpose (Friday summaries).
- **The existing five customer emails** (received, closing, storage, shipped, invoice) keep going to `customer.contact`. That is unchanged.

### 2.8 Shared database layout (Stream A, phase A1)

| Doc key | Database path | How it is stored |
|---|---|---|
| `customers`, `trailers`, `shipments`, `invoices` | `customers/<id>` etc. | One document per record, with a hidden `_o` sort field. A save writes only the records it changed, and only their changed top-level fields. |
| `zzRequests` | `requests/<id>` | Same. |
| `zzGear` | `gear/<id>` | Same. |
| `v, rates, settings, dayClosed, zzT10, demoCleared` and any other plain key | `portal/meta` | One document, updated field by field. `rev` and `touchedAt` are never written. |
| `chat` | `portal/chat` `{items}` (last 300) | Joined by id with the live copy before each write. |
| `activity` | `portal/activity` `{items}` (last 200) | Best effort; the last write wins. |
| `zzOutbox` | `portal/outbox` `{items}` (last 300) | Joined by id. |
| `accountChat[cid]` | `accountChat/<cid>` `{items}` (last 500) | Joined by id. |
| photos | `photos/<ownerKey>/items/<photoId>` `{src\|assetId, at, by}` | One document per photo. Photos over 200 KB are re-encoded at 700 px. |
| locks | `locks/bootstrap`, `locks/doors` | `acquire` leases. |
| (later) | `archive/<yyyy-mm>/chunks/<n>` | Old trucks and loads, to stay under 25,000 documents. |

Listeners: one each on `portal`, `customers`, `trailers`, `shipments`, `invoices`, `requests`, `gear` and `accountChat`. That is 8 of the 64 allowed.

---

## 3. Work streams

### 3.0 Order and dependencies

```
Day 0 ── A0: base copies, build2.py, engine-source.js (all of 2.3–2.7), local-only sync stub,
          patches A01–A20 + A32–A34, test harness + regression   ──► merged first (small)
Day 0+ ── B, C, D, E, F start at once against section 2 (names and shapes are fixed here)
          A1: shared mode in sync-source.js (no screen code), ZZSyncCard, ZZModeBadge
Then  ── integration build (build2 catches overlaps), full test run, staging, Nick review, live
Later ── A2: archive of old records, multi-site doors and time zones (trailer.site, settings.sites)
```

| Stream | Needs from others |
|---|---|
| B | A0 helpers and actions. The `#eta` route from C, for the driver link to open something. Crew shift fields from D, for "crew on shift" (it falls back to the crew count). |
| C | A0 (zzKioskIn, the checkInWalkup patch, codes, ZZplace, ZZestWait). |
| D | A0 (zzReportDamage, zzSecure, zzGear, ZZwaitMs). B's ZZEst change, so crew fix lines and office estimates do not double-charge rewrap. |
| E | A0 (ZZmsgs, ZZweek, zzQueueFriday, zzSettings, zzConfirm, ZZgearOut). A1's ZZSyncCard; render it only if it exists. |
| F | Nothing for the copy. The `LIVE` switches flip when the portal features actually ship. |
| A1 | Nothing from B–E. Every stream must follow 1.5. |

### 3.A Stream A: engine and shared data

- **Files:**
  - `build2.py`, `base/*`, `patches/A_engine.py`
  - `engine-source.js`, `sync-source.js`
  - `test/harness.js`, `test/mock-db.js`, `test/run.js`, `test/regression.test.js`, `test/a-*.test.js`
- **Features:**
  - shared realtime data for staff, with privacy gating;
  - every new field, helper and action in section 2;
  - codes;
  - load-detail mapping;
  - auto-approve rule;
  - worked-out alert messages;
  - settings defaults;
  - test-mode login fix;
  - the double check-in guard;
  - storage-full warning.
- **Screens touched:** only a small mode badge, "Live · shared" or "Saved on this device only", on staff screens (A08). `ZZSyncCard` is rendered by E in Setup. It shows the mode, the owner's "Move this computer's data into the shared database" button (throttled to 4 writes at a time, with progress) and the document count.
- **ZZsync** (in `sync-source.js`): `{mode:'local'|'db'|'db-offline', start, read, write, seed, fresh, failed, lease, photoGet, photoSet, importLocal}`.
  - **Startup:**
    - `start()` waits for `claude.use("db")` and `claude.use("user")`.
    - It checks the viewer is staff: `isOwner() || canEdit() || can("data.write") === true`.
    - It subscribes (2.8) and builds a live copy (one Map per collection).
    - It is ready only when every listener has sent a server answer (`fromCache === false`).
    - After 20 s without that, it switches to read-only `db-offline` and never seeds.
  - **Reading:**
    - `read()` returns the live copy.
    - Incoming changes come from `docChanges()`. Our own echoes are skipped by comparing JSON. After a change it rebuilds about 50 ms later and fires `cd6:remote`.
  - **Writing:**
    - `write(next)` compares the live copy with `next`, updates the copy at once, and queues writes: one at a time per document, at most 4 at once.
    - Errors:
      - `unavailable`: retry once after a random delay;
      - `resource_exhausted`: back off 1–3 s, at most 3 tries;
      - `invalid_argument`: read-only for the rest of the visit, with the banner "You can look but not change shared data.";
      - `quota_exceeded`: show the message.
    - Refuses any document over 240,000 bytes.
  - **First run:**
    - `seed()`: only the **owner** seeds, while holding the `locks/bootstrap` lease, and only if `portal/meta` is still missing.
      - Staging gets a trimmed demo without the 400 filler customers `cu_004..cu_399`.
      - Production gets an empty skeleton with the settings and rates.
      - Anyone else sees "Waiting for the office to set up shared data".
    - `fresh()`: `tx()` in local mode. In shared mode it throws, so `bQ` can never write a demo over shared data.
- **Anchors** (each checked: 1 in bundle.js, 1 in portal.html, no overlaps, none inside the source span):

```text
A01  [patch]  Insert sync-source.js (a statement block) right before this text.
     var Xj=e=>"cdweb:"+e;
A02  [patch]  Shim: keep this object as window.ZZlocal; window.storage becomes a router (photo keys go to ZZsync in shared mode); storage-full errors raise the cd6:sync event; then window.ZZready=ZZsync.start();
     window.storage={get:async e=>{let t=null;try{t=localStorage.getItem(Xj(e))}catch{}if(t===null)throw new Error("absent");return{value:t}},set:async(e,t)=>{localStorage.setItem(Xj(e),t)}};
A03  [patch]  gA read: becomes var gA=async()=>{if(ZZsync.mode==="db")return ZZsync.read();try{ (shared mode skips the ZZt10 demo).
     var gA=async()=>{try{
A04  [patch]  yA write: ZZsync.mode==="db"?ZZsync.write(e):await window.storage.set(...)
     yA=async e=>(await window.storage.set(Rj,JSON.stringify(e),!0),e)
A05  [patch]  bQ: never seed over shared data. Becomes let t=await gA()||ZZsync.fresh()
     let t=await gA()||tx()
A34  [patch]  bQ failure: also call ZZsync.failed(t), which shows the banner (today a failed save is silent).
     .catch(t=>(console.error("commit failed",t),null)),uA)
A06  [patch]  RA first load: await window.ZZready;let E=await gA();if(!E)E=await ZZsync.seed(),await yA(E);
     let E=await gA();if(!E)E=tx(),await yA(E);
A07  [patch]  RA refresh: keep the 5 s poll; also re-read on the cd6:remote event and show cd6:sync text in the existing banner (y).
     (0,H.useEffect)(()=>{let P=setInterval(async()=>{let E=await gA();E&&t(x=>x&&E.rev===x.rev?x:E)},5e3);return()=>clearInterval(P)},[]);
A08  [patch]  Page wrapper: add (0,i.jsx)(ZZModeBadge,{role:a}) as the first child (staff roles only).
     ae=P=>(0,i.jsxs)("div",{style:{background:m.bg,minHeight:"100vh",color:m.text},children:[A&&
A09  [patch]  Actions object: insert ...ZZacts({S,C,M,N,L,B,w}), right before this text (existing actions after it keep their names).
     zzReq:P=>S(x=>(x.zzRequests=[...(x.zzRequests||[]),P]
A10  [patch]  addTrailer: let k=D.id||Ce() so the booking form can choose the truck id.
     S(T=>{let k=Ce();if(D.direction==="outbound"&&b.length)
A11  [patch]  addTrailer: append ,code:ZZokCode(T,D.code),createdAt:D.createdAt||ye(Date.now()) before }]
     ...D,carrier:q,customerId:_,needsMatch:!1}]
A12  [patch]  addTrailer load mapping: append ,weight:ie($.weight),pieces:ie($.pieces),stackable:$.stackable??null,hazmat:!!$.hazmat,seq:X before })  (X is the row index).
     po:$.po||"",loadNotes:$.loadNotes||"",bol:$.bol||""})
A13  [patch]  zzAddLoad: add weight, pieces, stackable, hazmat, po, bol, loadNotes (from E.notes) and seq = loads already on the truck.
     dest:E.lane==="reno"?"Reno, NV":E.lane==="sac"?"Sacramento, CA":""});x.shipments=[...x.shipments,T];
A14  [patch]  checkIn guard: after finding b, if(!b||b.arrivedAt||b.stage==="departed"||b.stage==="cancelled"){E={already:!0,dock:b?.dock||null,trailerId:P};return null} then let D=...
     checkIn:async P=>{let E=null;return await S(x=>{let b=x.trailers.find(k=>k.id===P),D=x.trailers.filter(k=>k.id!==P&&k.dock
A15  [patch]  checkInWalkup new truck: prepend code:ZZnewCode(x),driverLang:P.driverLang||"en",checkedInBy:"kiosk",
     id:k,carrier:Y,driver:P.driver,phone:P.phone||P.newAccount?.phone||"",
A16  [patch]  crewSaveReceiving: do not auto-close photo reports or answered ones: V.openedBy!=="Office"&&!V.photoOwner&&!V.answer?{...
     V.openedBy!=="Office"?{...V,resolved:!0
A17  [patch]  Test-mode login list (lists office logins today): quick=xs=>xs.length&&e.settings?.showLogins===!0?J("details"
     quick=xs=>xs.length?J("details"
A18  [patch]  ZZt10: also return early when e.demoCleared (cleared demo must not come back).
     ZZt10=e=>{if(!e||e.zzT10||!Array.isArray(e.shipments))return e;
A19  [patch]  Rate defaults: add ,newPallet:20
     nx={std:3,lg:6,crate:7.5,storageIn:8,storageOut:8,storageMonthly:24,afterHours:100,rewrap:15,laborHour:120}
A20  [patch]  Outbox builder pQ: ZZmsgs(e,t).forEach(x2=>a.push(x2)),a.sort((c,d)=>d.ts-c.ts)},hQ=
     a.sort((c,d)=>d.ts-c.ts)},hQ=
A32  [patch]  Photo purge: keep dmg: and sec: photos. r=/^(dmg|sec):/.test(e)?a:a.filter(...)
     r=a.filter(n=>!n.at||Date.now()-new Date(n.at).getTime()<SQ)
A33  [patch]  Photo save failure: also ZZsync.failed(a) (banner instead of a silent console line).
     console.error("photo save failed",a)
A21  [landmark]  pQ customer-email loop (existing five emails keep going to customer.contact).
     r.forEach(c=>{let d=s(c.customerId),f=d?.contact;if(!d)return;
A22  [landmark]  ls: photo read (routed by the shim; no patch).
     ls=async e=>{try{let t=await window.storage.get(_j(e),!0);
A23  [landmark]  ex: photo write (routed by the shim; no patch).
     ex=async(e,t)=>{try{await window.storage.set(_j(e),JSON.stringify(t.slice(-xA)),!0)}
A25  [landmark]  CQ migration, v8. Do NOT raise bA.
     bA=8,CQ=e=>{if(e.v===bA)return e;
A26  [landmark]  updateCustomer wipes rates when rates is missing. Never call it for partial edits (use zzCustomer).
     updateCustomer:(P,E)=>{S(x=>(x.customers=x.customers.map(b=>b.id===P?{...b,...E,rates:E.rates&&Object.keys(E.rates).length?E.rates:null}:b)
A27  [landmark]  C: activity helper (last 200).
     C=(P,E,x,b)=>(P.activity=[{id:Ce(),ts:ye(Date.now()),actor:E,kind:x,text:b},...P.activity].slice(0,200),P)
A28  [landmark]  Doors (one site) and yard.
     Gi=["D1","D2","D3","D4","D5","D6","D7","D8"],Ee="YD"
A29  [landmark]  Dock time zone.
     lQ="America/Los_Angeles"
A30  [landmark]  Seed.
     tx=()=>ZZt10(txO()),txO=()=>{
A31  [landmark]  Load factory gm (extra fields pass through ...e).
     gm=(e={})=>({id:Ce(),ref:"",customerId:null,
A35  [landmark]  Root render (sync-source runs before this).
     (0,Zj.createRoot)(document.getElementById("root")).render(Yj.default.createElement(RA));
```

- **Acceptance checks** (`test/a-engine.test.js`, `test/a-sync.test.js`, regression):
  - **Build:**
    - build2 refuses a duplicate anchor, an overlapping patch and a duplicate ZZ name. `node --check dist/app.js` passes.
  - **Regression and old data:**
    - Regression (1.7) passes in local mode.
    - A v8 doc from the base build loads, and nothing is written until the first action.
  - **Bookings and loads:**
    - `addTrailer` with `id`, lines (weight, pieces, stackable, hazmat) and `code` creates a truck with that id, a unique 4-digit code, `createdAt`, and loads that carry those fields plus `seq` 0..n-1.
  - **Check-in:**
    - `checkIn` on a truck that is already checked in returns `{already:true}`, and `arrivedAt` does not change.
    - `zzKioskIn` called twice: the second call returns `already`.
    - `zzKioskIn` returns a place in line when every door is full.
  - **Damage and auto-approve** (with the limit at 100):
    - A $45 estimate is auto-approved, adds adjustments, and the customer's rates stay the same.
    - A $150 estimate waits for the customer.
    - With the limit `null`, nothing is ever auto-approved.
    - `zzReportDamage` with 1 photo is refused. With 2 photos it replaces the plain crew Damage exception, so there is exactly one.
  - **Securement:**
    - `zzSecure` refuses without 5 photos, without a signature, or with confidence 2 and no note.
    - When accepted, it writes gear "out" rows only for gear marked ours.
  - **Settings, sign-in and messages:**
    - `zzCustomer(cid, {rates:{}, pin:'0000', contacts:[…]})` changes only `contacts`.
    - The test-mode login list is hidden unless `settings.showLogins === true`.
    - The Outbox lists a 'done' message for each contact who chose done by email, and none for contacts who did not.
  - **Shared mode** (mock-db):
    - Two pages in one context: the office books a truck and the crew page shows it within 2 s.
    - A customer page with no `db` stays local and writes nothing to the mock database.
    - A viewer with `can → false` stays local.
    - A first cached, empty snapshot never seeds.
    - Two owner tabs starting on an empty database seed once.
    - A photo taken in shared mode appears on the other page after it reopens.
    - No write is larger than 240 KB.
  - **Storage full:** when localStorage is full, the banner says so.

### 3.B Stream B: customer portal

- **Files:**
  - `customer-portal-source.js` (whole file)
  - `patches/B_client.py` (one bundle anchor)
  - `test/b-client.test.js`
  - Reference: `app/js/client.js`
- **Features:**
  - booking at any time
  - busy day and crew on shift
  - driver ETA link
  - Samsara / GPS link
  - customer updates the ETA
  - load details and optional load order
  - live truck card: steps, place in line, promise, done against the promise
  - instant "done" message with photos and damage
  - damage photos and auto-approve setting
  - monthly damage history
  - securement report
  - our gear on loan and interest in the securement plan
  - alerts per contact per event
  - Friday summary (this-week panel)
  - load trail
  - booking confirmation, pending or confirmed
- **Booking form** (`formSheet`, `newForm`, `submit`):
  - **When:**
    - `<input type="time" step="60">` instead of the `ZZtimes` select. Times are converted with `ZZzonedIso`.
    - The after-hours hint is worked out in dock time.
  - **Busy day:** under "When", a panel from `ZZdayLoad`: blocks, Light / Steady / Busy, your block highlighted, "N forklift drivers on shift · 8 doors", "Other companies stay private". In local mode it is labelled "estimate".
  - **Loads:** each row gets weight, pieces, destination, stackable and hazmat. Add these to all three places a row is made: newForm, "+ Add another load" and "Book this again".
  - **Load order:** "Unload in this order" with up/down buttons sets `loadOrder` and the row order.
  - **Tracking:** "How will we know when the truck is close?" with the options link / samsara / gps / self / none. A share link accepts https only.
  - **Driver language:** a select.
  - **Submit** sends `id:Ce()`, `bookedVia:'client'`, `bookedBy`, `tracking`, `trackUrl` and `driverLang` through `addTrailer`. Pickups stop pre-ticking every floor load.
- **New sheet `bookedSheet`:**
  - a big check and "Booked for <day time>";
  - the check-in code (`ZZcode`);
  - the driver link `ZZetaLink(t)` as text, with a Copy button (clipboard inside try/catch; if that fails, select the text);
  - "Waiting for our OK" until `confirmedAt` is set (accounts that are not dispatch);
  - three "what happens next" lines.
- **Truck sheet:**
  - **Header:** a live card replaces the date and status header: `ZZtruckSteps` bar, wait clock coloured by `ZZtone`, place in line and `ZZestWait`, promise bar from `ZZpromise`, and on completion "Done in 1h 12m, within our 2-hour promise".
  - **ETA box** (booked trucks only): chips 15/30/60/120 min, a time input and a note, calling `zzEta`.
  - **Tracking:** an "Open live map" link plus the URL as text, and an edit option through `zzTrack`.
  - **Driver link block:** older trucks get "Make a driver link" (`zzEnsureCode`).
  - **Time change:** keeps the time when only the day changes, uses any minute, and is saved with `zzLog` plus a dock chat line.
  - **Done section:** `lr` photos from `after:<tid>` and `before:<tid>`, counted against the BOL per load, damage links.
  - **Secured section:** gear table (ours / driver's), tag chips, seal, the 5 `sec:` photos, confidence bars, "Signed by".
  - **Load trail:** from `ZZtrail`, with a per-load "Trail" link.
  - **Loads table:** a Weight column, No-stack and Hazmat pills, and #1..n when `loadOrder` is set (up/down through `reorderLoad`, or `zzReorder` for pickups).
- **Schedule tab:**
  - **"Live now" panel:** today's active trucks as live cards.
  - **Done note:** shown per truck finished in the last 24 h that this browser has not seen (`cd6:zzdone:<cid>`), for example "Truck 4521 is done: 22 of 22 pallets, 6 photos, 1 damage report. 1h 12m, within our 2-hour promise."
  - **"This week so far" panel:** from `ZZweek`.
- **Trucks tab:** "At our dock now" uses the live cards.
- **Inventory tab:**
  - "Our gear with you" from `ZZgearOut`, with the last 10 ledger lines.
  - Securement plan card: "$2,000 per 6 months", taken from `ZZS().gearPlan`, and an "I'm interested" button (`zzCustomer` plus an account-chat note), then "We'll call you".
- **Damage tab:**
  - **Card photos:** use `lr` on `x.photoOwner`, falling back to `dt.off(s.id)` and `pull:<sid>`.
  - **Card details:** shows pallets and kinds.
  - **History:** "Damage history by month" from `ZZdmgMonths` replaces the "Closed" list, which was capped at 10. A "This month" summary sits at the top. Photos older than 30 days are deleted (damage photos are now kept; older ones may be gone).
- **Alerts and settings sheet:** opened from a header settings icon (`uu`) before the bell, and from the top of Messages. It is not an 8th tab; the tab bar is full at 390 px. It holds:
  - contacts (name, role, phone, email); if none are saved yet, the list starts with one built from the account's person, contact and phone;
  - an events × Text/Email grid using `ZZEVENTS` and `ZZALERTS`;
  - "Auto-approve damage fixes under $__" (blank = never);
  - Friday summary on/off.
  - Saved with `zzCustomer`.
- **ZZEst, ZZestOf, ZZtStatus, Bills:**
  - `ZZEst.save` calls `a.zzEstLines(...)`.
  - `ZZestOf` skips its automatic rewrap line when `est.lines` already has a rewrap line (`/rewrap/i`), so nothing is charged twice.
  - `ZZtStatus` shows "On the way, ETA 2:40" while `eta.at` is still ahead, and "Late" only after both the appointment and the ETA have passed.
  - The Bills text "Damage charges are only added after you approve them" mentions the auto-approve setting.
- **Privacy:** busy-day counts only, place in line as a number, never `doc.activity`, never another company's name.
- **Anchors in the bundle:**

```text
B01  [patch]  Load screen MQ "Who touched it": show date and time, at(b.at) -> ge(b.at).
     [...e.touches||[]].reverse().map(b=>(0,i.jsxs)("div",{className:"flex items-baseline gap-2 text-sm",children:[(0,i.jsx)("span",{className:"tabular-nums text-xs w-16 shrink-0",style:{color:m.dim},children:at(b.at)})
```

  Everything else lives in B's own file. Landmarks there, by function: `ZZtStatus`, `ZZEst` / `ZZestOf` / `ZZanswer`, `ZZCSS`, `newForm`, `formSheet`, `truckSheet`, `truckRow`, `schedule`, `trucks`, `floorTab`, `damage`, `dmgCard`, `bills`, `chat`, `reqSheet`, `callSheet`, and the header with `MA`.
- **Acceptance checks** (`test/b-client.test.js`; sign in as Altex 7788):
  - **Booking and time:**
    - Booking at 08:15 shows 8:15 AM.
    - Changing only the day keeps 8:15.
    - The time change shows in the load trail.
  - **Busy day:** the panel shows block counts, and none of the other seed customers' names appear in it.
  - **Booked sheet:**
    - After booking it shows a 4-digit code and a link ending in `#eta<code>`.
    - The truck has `bookedVia:'client'` and the chosen `id`.
  - **ETA and tracking:**
    - An ETA chip sets `eta.source:'client'`. The truck row reads "ETA …", and a truck past its appointment but with a future ETA is not "Late".
    - A tracking link with `http://` is refused, and one with `https://` is saved.
  - **Loads and order:**
    - Weight, pieces, stackable and hazmat are saved on the loads. The Inventory weight tile is no longer 0.
    - Reordering loads in the form gives `seq` 0..n-1 in the new order.
  - **Live card and done:**
    - A seeded truck checked in 20 minutes ago, waiting in the yard, shows "Waiting 20m" and "#1 in line".
    - A done truck shows the time against the promise.
    - The done note appears once and does not come back after it is opened.
  - **Damage:**
    - A damage card shows `dmg:` photos.
    - Setting auto-approve keeps `customer.rates` unchanged.
    - Monthly history groups reports by month.
  - **Securement and gear:**
    - The secured section shows when `trailer.secure` is set.
    - The gear panel totals match `ZZgearOut`.
    - "I'm interested" sets `securementInterest`.
  - **Alerts:** a contact added with "done: text" leads to an Outbox text for that contact (checked from the office).
  - **Screen size:** 390 px wide with no sideways scroll, on every tab and sheet.

### 3.C Stream C: kiosk and driver ETA page

- **Files:**
  - `kiosk-source.js` (new): `ZZKiosk`, `ZZEta`, `ZZKT` (6-language strings), `ZZdriverText(lang, key, vars)`, private `ZZk_*`
  - `patches/C_kiosk.py`
  - `test/c-kiosk.test.js`
  - Reference: `app/js/kiosk.js`. Port its strings in `App.LANGS` (lines 9–948) as data.
- **Features:**
  - kiosk: language first (6 languages); company name search or 4-digit code; today's truck; confirm driver name and cell; scan paperwork; done screen with place in line and estimated wait; reset 30 s after done and after 90 s idle; walk-in;
  - driver ETA page from a link, with big ETA buttons, a GPS / Samsara link, status, and the driver's language;
  - kiosk and TV open from a link and stay open after a reload.
- **ZZKiosk** (props `{doc, now, actions, onExit}`): the language steps
  1. **lang:** six big buttons with native names, and the heading in all six languages.
  2. **start:** "Company name", "I have a 4-digit code", "Walk-in (no appointment)".
  3. **company:** big search with `Pj` on name and aliases. Use a new list, because `cs` has English text inside.
  4. **code:** on-screen keypad. It continues by itself after 4 digits and finds the truck with `ZZbyCode`. A truck that is already checked in goes straight to its status ("Go to door D3" or "#2 in line"). A wrong code gets a friendly retry. `customer.pin` is never accepted.
  5. **truck:** only today's trucks and late ones (from 36 h ago to the end of today), as big cards: time, truck #, carrier, Drop/Pickup, pallets. A "My truck isn't listed" button leads to the walk-in.
  6. **details:** driver name, cell ("We'll text your door number to this phone"), truck #, trailer #, filled in from the booking.
  7. **scan:** "Take a photo of your paperwork" using `<input type=file accept="image/*" capture="environment" multiple>`, with tips, thumbnails, Done, and "Skip — give papers to the office". Photos are shrunk with `Bj` and kept in memory.
  8. **check in:** `actions.zzKioskIn(tid, {...details, lang})`. Then save the photos with `ex(dt.paper(tid), photos)` and `actions.patchTrailer(tid, {paperCount, paperBy:'Driver at kiosk'})`. The crew and office already show `paper:<tid>`.
  9. **done:** either "Go to door D3" or "You are #2 in line, about 25 min" (`ZZplace` / `ZZestWait`), then "We'll text <cell> your door number" and "Stay with your truck". A 30 s countdown (its own 1 s timer) and a Finish button.
  - **Walk-in:** the existing account rules (name, email and MC required), then `checkInWalkup({...h, driverLang})`, then scan and done.
  - **Idle:** pointer, key or typing activity resets a 90 s timer on every step except lang. A warning shows at 75 s. On reset everything is cleared, including the walk-in email and MC, the photos and the language.
  - **Staff exit:** office name and PIN (`settings.admins`), then `history.replaceState(null,'',location.pathname)` before `onExit`. Otherwise ZZSign reads `#kiosk` again and reopens the kiosk.
  - **Do not change the global language** (`bj` / `lx` / `cd6:lang`): it drives the crew screen on the same device. Kiosk language lives in the component's state.
  - **No automatic printing.** Offer a "Print work order" button (`sx`) only. Printing may be blocked inside the viewer.
- **ZZEta** (props `{doc, now, actions, code, onExit}`), route `#eta<4 digits>`:
  - **Finding the truck:** `ZZbyCode`. The language comes from `driverLang`, with a 6-language picker at the top.
  - **What it shows:** company, truck #, appointment, dock address and hours, and the status in big words:
    - Booked for 2:30
    - ETA 2:45
    - Checked in, #2 in line, about 25 min
    - Go to door D3
    - Unloading at D3
    - Done, drive safe
    - Cancelled
  - **Update my ETA:** buttons for 15 min, 30 min, 1 hour and 2 hours, plus "Pick a time". A "Running late" reason is optional. These call `zzEta(..., source:'driver')`.
  - **Share live location:** paste a Samsara or Google Maps https link, then `zzTrack`.
  - **When the truck is not found or the save is refused** (the normal case on a driver's own phone, see section 0), show:
    - the code;
    - a ready text such as "Truck 4821 ETA 2:45 PM" with a Copy button;
    - the dock number 916-616-3481 as text (`tel:` links are unreliable in the viewer).
  - **Exit** clears the hash first.
- **`ZZdriverText(lang, key, vars)`:** keys `door`, `yard`, `released`, `reminder` in all six languages. `ZZmsgs` uses it.
- **Anchors:**

```text
C01  [patch]  Route chain: a==="driver" -> ZZFLAGS.kiosk2?ZZKiosk:XQ, and add a==="eta"?ae((0,i.jsx)(ZZEta,{doc:e,now:p,actions:z,code:n,onExit:G})): before the tv branch.
     a==="driver"?ae((0,i.jsx)(XQ,{doc:e,now:p,actions:z,onExit:G})):a==="tv"?ae((0,i.jsx)(lJ,{doc:e,now:p,onExit:G})):null
C02  [patch]  ZZSign mount effect: first read the hash (/^eta(\d{4})$/i -> t("eta",code); "kiosk" -> save({role:"driver"}),t("driver"); "tv" -> save({role:"tv"}),t("tv")), then restore {role:"driver"|"tv"} sessions, then the existing restore.
     (0,H.useEffect)(()=>{try{let o=JSON.parse(localStorage.getItem("cd6:session")||"null");if(o&&o.role){if(o.role==="office"&&admins.some(x=>x.name===o.office))return go(o);
C03  [patch]  Stations: Driver check-in -> ()=>{save({role:"driver"});t("driver")} so a tablet reload stays on the kiosk.
     ()=>t("driver")
C04  [patch]  Stations: Dock TV -> ()=>{save({role:"tv"});t("tv")}
     ()=>t("tv")
C05  [landmark]  Old kiosk XQ (kept as the fallback behind ZZFLAGS.kiosk2).
     ,XQ=({doc:e,now:t,actions:a,onExit:r})=>{
```

- **Acceptance checks** (`test/c-kiosk.test.js`; run at 1024×768 and 390×844):
  - **Language:** `#stations` → Driver check-in shows the language screen with 6 buttons. After choosing Español, the next screens are in Spanish.
  - **Code path, start to finish:**
    - Enter a seeded truck's code, confirm the details, upload the test image, and finish.
    - The done screen shows a door or "#N in line".
    - The truck now has `driverLang:'es'`, `checkedInBy:'kiosk'` and `paperCount:1`, and the photo is stored under `paper:<tid>`.
  - **Codes:**
    - A truck that is already checked in, opened by its code, shows its status, and `arrivedAt` does not change.
    - A wrong code shows a retry. Typing a customer PIN (7788) does not find a truck.
  - **Truck list:** the company path does not list tomorrow's trucks.
  - **Timers:** with `page.clock`:
    - 30 s after done, the kiosk is back on the language screen;
    - 90 s idle in the middle of the walk-in form clears the form.
  - **Walk-in:** still opens an account (`source:'kiosk'`) and checks in.
  - **Links and exit:**
    - `#kiosk` opens the kiosk and a reload stays there.
    - Exit asks for an office PIN.
    - `#tv` opens the TV.
  - **Driver page:**
    - `#eta<code>` in a page whose data has the truck: the ETA buttons set `eta.source:'driver'`, and the language follows `driverLang`.
    - An unknown code shows the copy-text fallback.
    - Exit clears the hash.

### 3.D Stream D: forklift crew

- **Files:**
  - `crew-source.js` (whole file)
  - `patches/D_crew.py`
  - `test/d-crew.test.js`
  - Reference: `app/js/crew.js`
- **Features:**
  - queue with live wait clocks against the wait goal
  - start at a door with busy doors disabled, now labelled with who is there
  - pallet count per load, with a required note when it does not match, and outbound mismatches opening a Short/Over report
  - damage report with 2 or more required photos and suggested fix lines
  - done photos (kept)
  - secure the load
  - logging gear returned
  - crew shift, phone and rank editing (needed for "crew on shift" and Call dock)
  - new crew strings in es/ru
- **Wait clocks:**
  - **Where:** ZZCrew Next job card ("Waiting 34m · goal 30", coloured by `ZZtone`), "Then" rows, the All trucks sections (with "#1 in line"), a new "Doors" map section (busy door: truck, short company name, clock; free door green), the `xj` card pill and rail (D01–D03), the `nJ` title card (D04), and a crew bell alert `waitover:<tid>` (D05).
  - **While working:** "Working 22m · 1h 04m left on the 2-hour promise".
- **Door picker:** busy doors show the company and clock through `ZZDoorLbl` (D06). The dimmed style changes from opacity 25 to 50.
- **Counting and loads:**
  - **Required note on a mismatch:** when the count is off, a note is required and passed as `crewSaveReceiving(..., {note})` (D08).
  - **Outbound mismatch:** `addException(Short/Over)` (D09).
  - **Unload order:** "Next off the truck" follows `seq` / `ir` order (D10).
  - **Load row:** shows pieces, weight, Hazmat (red pill) and "Do not stack" (amber pill) (D11).
- **ZZDmg modal:**
  - **Opens from:**
    - the count card `tJ` when the condition is Damaged (D12–D15): saving opens ZZDmg first unless the load already has a photo report;
    - the outbound pull card `ZZPull` (D16–D20), in place of the text-only box.
  - **Setup:** the id is made when the modal opens (`Ce()`), so photos can be taken before saving.
  - **Fields:** pallets stepper, kind chips (`ZZDMGKINDS`), "What happened?", and two photo boxes (wide shot, close-up), both `Xn` on owner `dmg:<id>`.
  - **Fix lines:** from `ZZdmgLines`, each with a toggle and a qty stepper, plus a total. Below them, either "Customer auto-approves under $X: this one goes through" or "Customer will approve or decline".
  - **Saving:** disabled, with a "Still missing: …" line, until there is a kind and 2 or more photos. Then `zzReportDamage(...)`.
  - **Afterwards:** the count card lists this load's damage reports with `lr` photos.
- **Secure the load** (step key `secure`, with `ZZFLAGS.secureStep`):
  - **Which trucks:** outbound trucks, and inbound trucks with a reload.
  - **Step flags and order** (D23–D25):
    - `zs` = secured, meaning signed and confidence above 1.
    - `zn` = this truck needs the step.
    - Outbound order is `load, secure, photos`; inbound reload is `reload, secure`.
  - **Where it shows:** a section before Photo log (D21). The ZZSteps label is "Secure the load".
  - **ZZSecure screen:**
    - four gear rows (`ZZGEAR`) with big steppers and an "Ours (24 HR) / Driver's" toggle;
    - tag numbers as chips;
    - seal number, filled in from `sealOut`;
    - five photo boxes, `Xn` owner `sec:<tid>:<slot>`, with counts saved to `secPhotos` through `patchTrailer`;
    - confidence 1 Not safe / 2 Needs work / 3 OK / 4 Solid / 5 Rock solid; 1–3 require "What would make it safer?"; 1 shows a red "Do not let it leave like this — tell the office" and the step stays not done;
    - the checkbox "I checked every row is tight and nothing can shift";
    - a typed signature;
    - then `zzSecure(...)`.
  - **Wrap-up** (D26–D30): "Send to dispatch" waits until the truck is secured. The seal is taken from the secure report and filled in for you, and the summary gets a "Secured 4/5" row. The leaderboard gives +5 points per securement (update the "How points work" text).
- **Gear tab** (5th ZZCrew tab, `{k:'gear', label:R('Gear'), icon:uu}`):
  - "Out with customers now" (`ZZgearOut` per customer, with tag chips);
  - "Log gear coming back": customer, type, qty, tag toggles, typed tag and note, saved with `zzGear({dir:'back'})`;
  - the last 10 moves.
- **Other changes in D's own file:**
  - **ZZCrewOffice logins:** phone, shift (start, end, days) and rank fields, saved with `zzUpdateCrew`.
  - **ZZcrewStats:** turns `openedBy` "Crew · Roman" into "Roman" (`.replace(/^Crew · /,'')`) so reports from ZZPull count, and counts secures.
  - **Translations:** new strings in es/ru through a lazy `ZZtr3`. Existing untranslated nJ section titles and ZZPull text get wrapped in `R()` while they are being patched.
  - **Touch labels:** `fQ` gets labels for `damage` and `secure` (D31).
- **Anchors:**

```text
D01  [patch]  xj truck card: add a wait clock zw=ZZwaitMs(...) and the goal zg (check the prop names in xj).
     A=Kn(e,r),y=km(`truck:${e.id}`
D02  [patch]  xj: after the "just arrived" pill add the pill "waiting 34m" coloured by ZZtone.
     v&&(0,i.jsx)(ve,{label:R("just arrived"),color:m.orange})
D03  [patch]  xj rail: red when the wait is at or over the goal.
     rail:v?m.orange:e.stage==="working"?m.green:A>An?m.red:Ki[e.stage]
D04  [patch]  nJ title card: wait clock, or "left on the 2-hour promise" while working.
     l.workStartedBy?`${R("Started by")} ${l.workStartedBy}`
D05  [patch]  Crew bell (mQ): prepend a waitover:<tid> alert (sev bad) for trucks not started past the goal.
     if(e==="crew"&&(f.filter(h=>h.arrivedAt&&h.stage!=="done").forEach(h=>o(`arrived:${h.id}`
D06  [patch]  Door picker: busy doors show ZZDoorLbl (door, company, clock); disabled style opacity-25 -> opacity-50 in the same button.
     children:U},U)})}),(0,i.jsx)("div",{className:"text-xs mt-2",style:{color:m.dim},children:R("Dimmed doors
D07  [landmark]  Busy doors list X (done trucks hold their door until released).
     X=t.trailers.filter(U=>U.id!==l.id&&U.dock&&U.stage!=="departed"&&U.stage!=="cancelled").map(U=>U.dock)
D08  [patch]  tJ count mismatch: add a required note input; pass note to crewSaveReceiving.
     C!==0&&l!==""&&(0,i.jsxs)("div",{className:"text-sm font-bold",style:{color:m.amber},children:[C<0?R("Short"):R("Over")," ",Math.abs(C)]})
D09  [patch]  ZZPull: when the confirmed count differs, also r.addException(U.id, Short|Over, note).
     r.patchShipment(U.id,{pullCount:ie(c),pullCountAt:ye(Date.now())}),so(!0)
D10  [patch]  nJ "Next off the truck": follow seq order (ir) instead of raw array order.
     T=t.shipments.filter(U=>U.trailerInId===l.id),k=T.filter(U=>!U.receivedAt)
D11  [patch]  Load row header: add pieces, weight, Hazmat (red pill), Do not stack (amber pill).
     children:[t.ref,t.po?` \xB7 ${t.po}`:"",t.commodity?` \xB7 ${t.commodity}`:""," \xB7 ",$e(t)]
D12  [patch]  tJ: add state let[zd,zdS]=(0,H.useState)(!1); at the start.
     tJ=({s:e,doc:t,actions:a,now:r,openShipment:n,startOpen:o})=>{
D13  [patch]  tJ save: when the condition is Damaged and there is no open photo report, open ZZDmg (zdS(!0)) instead of saving.
     B=()=>{let O=u||(C===0?"Good":C<0?"Short":"Over");
D14  [patch]  tJ render: mount zd&&ZZDmg (onSaved -> crewSaveReceiving) before ZQ.
     A&&(0,i.jsx)(ZQ,{s:e,doc:t,onClose:()=>y(!1)
D15  [patch]  tJ Damaged block: list this load's damage reports with lr photos (x.photoOwner).
     u==="Damaged"&&(0,i.jsxs)("div",{className:"flex items-center gap-3 pt-1"
D16  [patch]  ZZPull signature: add doc:zdoc.
     ZZPull=({s:U,r,tid,hot})=>{
D17  [patch]  ZZPull inline damage box -> ZZDmg modal.
     dm?(0,i.jsxs)("div",{className:"space-y-2",children:[(0,i.jsx)(se,{value:nt,onChange:e=>sn(e.target.value),placeholder:"What's damaged? e.g. 2 pallets crushed on the corner"})
D18  [patch]  ZZPull old text-only damage call (keep only as a fallback when doc is missing).
     r.addException(U.id,"Damage",nt.trim()||"Damage found while loading"),st(!0)
D19  [patch]  ZZPull call site 1: pass doc:t.
     (0,i.jsx)(ZZPull,{s:U,r,tid:l.id,hot:!0},U.id)
D20  [patch]  ZZPull call site 2: pass doc:t.
     (0,i.jsx)(ZZPull,{s:U,r,tid:l.id,hot:!1},U.id)
D21  [patch]  Insert the "Secure the load" section (ZZSecure) before Photo log when zn.
     (0,i.jsxs)(hm,{n:Xe("photos"),title:"Photo log"
D22  [patch]  (optional) Photo log counts as done when the load is secured.
     ph=ie(l.afterPhotoCount)>0||!!l.photosNA
D23  [patch]  Step flags: add zs=!!l.secure?.signedAt&&ie(l.secure?.confidence)>1, zn=!b||q.length>0||x.reload>0 (check the names in nJ).
     He=!b&&Y.length>0,
D24  [patch]  Outbound steps: add {k:"secure",done:zs} between load and photos (when ZZFLAGS.secureStep).
     {k:"load",done:He},{k:"photos",done:ph}
D25  [patch]  Inbound reload steps: add {k:"secure",done:zs} after reload.
     [{k:"reload",done:oe}]:[]
D26  [landmark]  Wrap-up section.
     (0,i.jsxs)(hm,{n:Xe("wrap"),title:R("Wrap up")
D27  [patch]  Send to dispatch: also disabled while zn&&!zs, with the line "Secure the load first".
     disabled:Tc&&!g.trim(),onClick:Qj,children:"Send to dispatch"
D28  [patch]  Seal on wrap-up: use h.trim()||l.secure?.seal.
     ux&&h.trim()&&(Ye.sealOut=h.trim().toUpperCase())
D29  [patch]  Opening wrap-up: also fill in the seal v(l.secure?.seal||l.sealOut||"").
     onClick:()=>{A(""),d(!0)}
D30  [patch]  Wrap-up summary: add a ["Secured", ...] row when zn.
     ["BOL",nb?l.billsNA?"N/A"
D31  [patch]  Touch labels fQ: add damage:"Reported damage", secure:"Secured the load".
     fQ={receive:"Received"
D32  [landmark]  All-steps-done flag (picks up the new step by itself).
     Tt=Wt.filter(U=>U.k!=="wrap").every(U=>U.done)
```

- **Acceptance checks** (`test/d-crew.test.js`; sign in as Roman 1111):
  - **Wait clocks and doors:**
    - A seeded truck checked in 40 minutes ago shows a red "Waiting 40m · goal 30" on Next job and on its card. With the goal set to 60 it turns amber or green.
    - The door picker disables busy doors and labels them with the company.
  - **Damage:**
    - Choosing Damaged opens ZZDmg. Save stays disabled with 1 photo and works with 2.
    - The load then has exactly one Damage exception, with `photoOwner`, `photoCount ≥ 2` and `est.lines`.
    - With the customer's auto-approve set, `answer.auto` is true.
    - The ZZPull damage report uses ZZDmg.
  - **Securement:**
    - An outbound truck shows "Secure the load". Save is refused until there are 5 photos, a confidence level, a note at 3 or less, the checkbox and a signature.
    - Afterwards the truck has `secure` and `sealOut`, and `zzGear` has an "out" row for each type marked ours.
    - "Send to dispatch" is blocked until the truck is secured.
  - **Gear:** logging 2 bars back lowers `ZZgearOut`, and the returned tags disappear.
  - **Counting:** "Next off the truck" follows `seq`.
  - **Languages:** with the crew language set to es, the new labels are in Spanish.

### 3.E Stream E: office

- **Files:**
  - `office-source.js` (new): `ZZYard`, `ZZOutbox`, `ZZFriday`, `ZZGearOffice`, `ZZDockSet`, `ZZTruckExtra`, `ZZobx`, private `ZZo_*`
  - `patches/E_office.py`
  - `test/e-office.test.js`
  - Reference: `app/js/office.js`
- **Features:**
  - yard board with wait clocks against the goal;
  - stats: in yard, at doors, done today, average wait, longest wait, promise kept %;
  - door map coloured by goal and promise;
  - Outbox of every text and email that would be sent;
  - Friday summaries;
  - gear out per customer and the securement-plan interest list;
  - settings for promise, wait goal and rates;
  - truck sheet extras;
  - TV board improvements;
  - office bell for customer bookings not yet confirmed.
- **Tabs:**
  - New: Yard (`cu`), Outbox (`un`), Gear (`Sa`), added before Crew (E01/E02).
  - The bottom tab bar `PA` scrolls sideways with a minimum tab width (E03).
  - Yard may become the first tab (E14, optional, Nick's choice).
- **ZZYard** (`{doc, now, actions, openShipment, openTrailer}`):
  - **Stat tiles:**
    - in yard
    - at doors
    - done today
    - average wait today (`workStartedAt − arrivedAt`)
    - longest wait now (red when over the goal, with the company)
    - promise kept today (`ZZpromise.kept`)
  - **Lanes:**
    - **Coming today:** ETA with source and age, the tracking link as text, a late flag.
    - **Waiting:** place #, company, pallets, wait clock, a NEW pill for the first 5 minutes, paperwork count.
    - **At doors:** door, who started, work clock against `qo`.
    - **Done today:** total time against the promise, ✓ or ✗.
  - **Taps:** tapping a truck opens the existing truck sheet `_Q`.
  - **Double door:** two trucks at the same door are flagged, because of the shared-mode race.
- **ZZOutbox:**
  - **Content:** a merged list from E10, which feeds the existing outbox `qQ` with `[...pQ(doc), ...ZZobx(doc)]`. ZZobx maps `zzOutbox` into pQ's shape.
  - **Filters:** event, company and channel, plus a "today" count.
  - **Banner:** "Not connected yet — this is exactly what would be sent. Send urgent ones by hand."
  - **Setup:** the old outbox there can stay, or be replaced with a pointer to the new tab (E11).
- **ZZFriday** (a chip inside Outbox):
  - **Preview:** for each customer with `fridaySummary !== false` and trucks this week, a preview built from `ZZweek`.
  - **Queue button:** "Queue Friday summaries" runs `zzQueueFriday(ZZweekKey(now), entries)` and shows the count in a toast. A second click queues 0.
- **ZZGearOffice:**
  - a table per customer: plywood, bars, straps, airbags, tags out;
  - "Log return" through `zzGear`;
  - the recent ledger;
  - "Interested in the securement plan" (customers with `securementInterest`).
- **ZZDockSet card in Setup** (E12), placed before "Crew on the floor":
  - promise minutes and text, wait goal minutes;
  - new-pallet price and plan price;
  - saved with `zzSettings`;
  - also renders `ZZSyncCard` if A1 defines it.
- **ZZTruckExtra in the truck sheet `_Q`** (E13):
  - the check-in code and the copyable driver link;
  - ETA with its source and an office "Set ETA" (`zzEta`, source office);
  - the tracking URL as text and the driver language;
  - the paperwork photos (`lr` `paper:<tid>`);
  - this truck's Outbox lines;
  - a secure summary;
  - "Confirm time" (`zzConfirm`);
  - "Check in now (driver skipped the kiosk)" (`zzKioskIn` with `by:'office'`).
- **Door map, TV and KPIs** (E05–E09):
  - **Door map (OQ) and TV (lJ):** a door turns red when its truck is past the promise, replacing the fixed 2 h. Yard chips are coloured by `ZZtone`.
  - **TV yard list:** sorted by check-in time and numbered #1, #2…
  - **TV exit:** needs an office PIN and clears `#tv`.
  - **KPI label:** "Trucks on time" becomes "Arrived on time", so it is not mistaken for the promise.
- **Office bell** (E15): "Customer requested a slot" now uses `!confirmedAt`, keeping the old notes check for older bookings. Confirming clears it.
- **Anchors:**

```text
E01  [patch]  Office tabs: insert {k:"yard",label:"Yard",icon:cu},{k:"outbox",label:"Outbox",icon:un},{k:"gear",label:"Gear",icon:Sa}, before crew.
     {k:"crew",label:"Crew",icon:bi},{k:"settings",label:"Setup",icon:uu}]
E02  [patch]  Office content: prepend l==="yard"&&ZZYard, l==="outbox"&&ZZOutbox, l==="gear"&&ZZGearOffice (props doc:e, now:t, actions:a, openShipment:n, openTrailer:v).
     children:[l==="crew"&&(0,i.jsx)(ZZCrewOffice,{doc:e,now:t,actions:a,openShipment:n}),
E03  [patch]  Bottom tab bar PA: overflow-x-auto, min width per tab, no flex-1 squeeze.
     className:"max-w-7xl mx-auto flex",children:e.map(r=>(0,i.jsxs)("button",{onClick:()=>a(r.k),className:"flex-1 py-2.5 flex flex-col items-center gap-1 transition"
E04  [landmark]  Board tiles (new stats live in ZZYard; appending here is optional).
     {label:"Open exceptions",value:B.length,sub:"need a decision",color:B.length?m.red:m.mut}]
E05  [patch]  KPI label "Trucks on time" -> "Arrived on time".
     ["Trucks on time",le.length?
E06  [patch]  Door map OQ: red when the truck is past the promise (ZZpromise) instead of 2 h; yard chips coloured by ZZtone.
     d=c>2*Nt;return(0,i.jsxs)("button",{onClick:()=>u&&a?.(u)
E07  [patch]  TV board: same door rule.
     y=A>2*Nt
E08  [patch]  TV board: sort the yard list n by arrivedAt and show #1, #2.
     let r=e.trailers.filter(v=>v.dock&&v.stage!=="departed"&&v.stage!=="cancelled"),n=e.trailers.filter(v=>v.dock===Ee&&v.stage!=="departed"&&v.stage!=="c
E09  [patch]  TV exit: double-click asks for an office PIN, then clears #tv.
     onDoubleClick:a,
E10  [patch]  Outbox list: [...pQ(e,Date.now()),...ZZobx(e)].sort((c,d)=>d.ts-c.ts)
     o=(0,H.useMemo)(()=>pQ(e,Date.now()),[e])
E11  [landmark]  Outbox inside Setup (keep, or swap for a pointer to the new tab).
     (0,i.jsx)(qQ,{doc:e})
E12  [patch]  Setup VQ: insert ZZDockSet (and ZZSyncCard if defined) before "Crew on the floor".
     (0,i.jsxs)(de,{className:"p-4",children:[(0,i.jsx)("div",{className:"font-bold",children:"Crew on the floor"})
E13  [patch]  Truck sheet _Q: add ZZTruckExtra (code, driver link, ETA, tracking, language, paperwork, outbox, secure summary, Confirm time, Check in now) next to the status pills.
     children:[(0,i.jsx)(ve,{label:ds[y.stage],color:Ki[y.stage]}),(0,i.jsx)(ve,{label:y.direction,color:m.mut,dot:!1})
E14  [patch]  (optional) Default office tab "yard".
     let[l,s]=(0,H.useState)("board"),[u,c]=(0,H.useState)(""),d=o
E15  [patch]  Office bell: "customer requested a slot" -> !h.confirmedAt&&(h.bookedVia==="client"||notes check).
     f.filter(h=>h.stage==="scheduled"&&(h.notes||"").includes("Requested by customer"))
E16  [landmark]  Door map OQ.
     ,OQ=({trailers:e,now:t,onTap:a,big:r})=>{
E18  [landmark]  saveRates (replaces rates; zzSettings merges instead).
     saveRates:(P,E)=>{
```

- **Acceptance checks** (`test/e-office.test.js`; sign in as Nick 2468; 1400×900 and 390×844):
  - **Yard board:**
    - With a fixture (2 in the yard checked in 10 and 40 minutes ago, 3 at doors, 4 done today, 3 of them within the promise), the tiles read 2 / 3 / 4, average wait as calculated, longest 40m in red, and promise kept 75%.
  - **Settings:** changing the wait goal to 20 in Setup recolours the yard clocks and the crew clocks.
  - **Outbox:**
    - It lists the new events for contacts by their choices.
    - Filters work.
    - The banner is shown.
  - **Friday:** queueing adds one entry per eligible customer; a second click adds 0.
  - **Gear:** a logged return lowers the customer's totals.
  - **Truck sheet:**
    - Shows the code and the link ending in `#eta<code>`.
    - "Check in now" checks the truck in once.
  - **TV:** the yard list is in check-in order with #; exit asks for a PIN.
  - **Tab bar:** at 390 px it scrolls inside itself; the page does not scroll sideways.

### 3.F Stream F: website

- **Files:**
  - `/home/user/Rulfo/site-src/**`: `build.py`, `pages/*.html`, `assets/site.css`, `assets/site.js`
  - optionally `website/portal/patches/F_website.py`: portal sign-in page links and colours; only with Nick's OK
- **Features:**
  - **Client portal page:** a rebuilt `/client-portal/`: live truck card mockup, the six-step bar, the 2-hour promise with fine print, 9 feature cards, "For your drivers" (6 languages), "Secured before it leaves", an alerts table, a sample Friday report, an FAQ with FAQPage JSON-LD.
  - **Home page:** the promise in the hero and a portal teaser.
  - **Other pages:** updated cross-dock steps, the get-started FAQ, about standards, location rows and a driver box per location.
  - **Drivers page:** a new `/drivers/` page in 6 languages.
  - **Links:** portal links open in a new tab (`target=_blank rel=noopener`); "Open an account" goes to `PORTAL#signup`.
  - **Footer:** the Clients column is updated.
  - **Feature switches:** a `LIVE` switch per feature (`'live' | 'soon' | 'off'`) through `feat(key, html)`, so the site never promises what the portal does not do yet. Texting stays `'soon'` until real texts exist.
  - **CSS:** `.steps.six` and `.mock-cap`.
  - **Small fixes:**
    - the manager card fallback text;
    - the delivery page meta text;
    - an `{EMAIL}` placeholder in `_old_quote.html`;
    - stale README lines.
- **Rules:**
  - Update only the preview artifact `Y2gD2gSWixv1kKesiwvp3n`:
    - first run `python3 site-src/build.py`, then `python3 site-src/make_preview.py site <scratchpad>/preview`;
    - Artifact `read` the preview first;
    - then publish with `files` = the generated `_files.json` map.
  - Do not touch Netlify, DNS or 24hrcrossdock.com until Nick says go.
  - Mockups are labelled "Example", with no invented reviews. The securement-plan price stays off the public site ("call for quote" per DECISIONS) unless Nick says otherwise.
  - Punjabi and Hindi text gets a native-speaker review.
- **Website anchors** (each checked, count 1 in that file):

```text
site-src/build.py  Rewrite the client portal page (fragment pages/_old_technology.html).
     def client_portal():
site-src/build.py  New title and description.
     ('/client-portal/', 'Client Portal | 24 HR Crossdock',
site-src/build.py  Add PORTAL_SIGNUP, PROMISE, LANGS, LIVE, feat() next to it.
     PORTAL = 'https://claude.ai/artifact/97haWKtJGFGXW8PjdM9XWv'
site-src/build.py  Header sign-in (target _blank pass in build()).
     <a class="signin" href="{PORTAL}">
site-src/build.py  Footer Clients column.
     <div><h4>Clients</h4><p><a href="{PORTAL}">Client sign-in</a></p>
site-src/build.py  Insert the /drivers/ page entry before this.
     ('/thanks/', 'Thank You | 24 HR Crossdock'
site-src/build.py  Insert driver_box(loc) after this in location_page().
     {storage(loc)}
site-src/build.py  Reno home: driver box near here.
     + manager('reno') +
site-src/build.py  Locations rows.
     <li><b>Same portal</b><span>Book trucks, see inventory and approve charges for every location</span></li>
site-src/build.py  Fallback 'The <city> dock team'.
     name = M['name'] or 'Name and photo coming soon'
site-src/build.py  Reviews block (real Google reviews only, no review schema).
     b = b.replace('<!--REVIEWS-->'
site-src/pages/hub.html  Hero proof item -> 2-hour promise.
     <li><b>Own trucks</b><span>delivery anywhere</span></li>
site-src/pages/hub.html  -> "2-hour unload promise".
     <div><h3>Fast turns</h3>
site-src/pages/hub.html  Add same-day photos / damage photos.
     <div><h3>Proof at the door</h3>
site-src/pages/hub.html  Add Unload promise, Check-in, Securement rows before it.
     <li><b>Insurance</b><span>Fully insured. Certificate of insurance on request</span></li>
site-src/pages/_old_cross-dock.html  Kiosk in the driver's language; we text the door number.
     <li><b>2</b><h3>Check in</h3><p>Driver checks in at our kiosk and gets a door.</p></li>
site-src/pages/_old_cross-dock.html  -> {PORTAL}#signup.
     <a class="btn o" href="https://claude.ai/artifact/97haWKtJGFGXW8PjdM9XWv">Open a cross-dock account</a>
site-src/pages/_old_cross-dock.html  Add live truck card, promise, securement, alerts, Friday report.
     <li>OS&amp;D and damage reports in real time</li>
site-src/pages/_old_get-started.html  Book any time, send the driver the ETA link.
     <li><b>4</b><h3>First inbound</h3>
site-src/pages/_old_company.html  Add kiosk check-in and the promise.
     <div><h3>Receiving</h3><ul>
site-src/assets/site.css  Add .steps.six and .mock-cap.
     .steps.four{grid-template-columns:repeat(4,1fr)}
site-src/assets/site.js  Preview-only form note; gtag events when GA_ID is set.
     location.href='mailto:24hrcrossdock@gmail.com?subject='
```

- **Portal-side anchors** (optional, website-facing):

```text
F01  [patch]  (optional) Portal "Website" link target; point at 24hrcrossdock.com only when Nick says go.
     WEB="https://claude.ai/artifact/Y2gD2gSWixv1kKesiwvp3n"
F02  [patch]  (optional) Sign-in page nav: new labels (Reno NV, Sacramento CA, Harrisburg PA, Services, About), target _blank rel noopener.
     [["Warehousing",""],["Fulfillment & FBA Prep","fulfillment"],["Cross-Dock","cross-dock"],["Company","company"]].map(([l,k])=>J("a",{key:l,href:WEB,style:{
F03  [patch]  (optional) Sign-in page colours -> site navy/orange (#0B1B30, #172C4D, #FB923C, #C2410C, ink #0B1B30, mut #4A5568, line #DCE1E9).
     T={teal:"#0F3B44",teal2:"#16505B",cop:"#E09A63",copD:"#A95A24",bg:"#F1F5F5",ink:"#0F2F36",mut:"#4B6166",line:"#D6E0E1",err:"#B42318"}
```

- **Acceptance checks:**
  - **Build:** `site-src/build.py` builds with no LEFTOVER HASH LINKS. `/drivers/` is in the sitemap.
  - **Links:** every claude.ai artifact link has `target="_blank" rel="noopener"`.
  - **Feature switches:**
    - Features marked `'soon'` show "Coming soon".
    - No page says texts are sent while `alerts` is not `'live'`.
  - **Layout:** pages pass at 390 and 1400 px, light and dark, with no sideways scroll.
  - **Publishing:** the preview is published only after an Artifact read.

---

## 4. Feature checklist

| # | New feature | Today | Stream (lead, others) | Where |
|---|---|---|---|---|
| 1 | Book a truck at any date and time (no preset slots) | partial (30-min select) | B, A | formSheet time input, ZZzonedIso; truck sheet time change through zzLog |
| 2 | How busy that day is (anonymous counts per time block) | missing | B, A | ZZdayLoad panel under "When" |
| 3 | Forklift crew on shift | missing | B, A, D | ZZcrewOnShift; D adds shift fields in ZZCrewOffice |
| 4 | Driver ETA link to send the driver | missing | B, C, A | bookedSheet and truck sheet (`ZZetaLink`), `#eta<code>` route (C01/C02), `code` (A10/A11) |
| 5 | Samsara / GPS share link | missing | B, C, A | form tracking section, zzTrack, ZZEta link paste |
| 6 | Customer can update the ETA | missing | B, A | truck sheet ETA box, zzEta, ZZtStatus |
| 7 | Load details: several loads; ref/PO/BOL, pallets, weight, pieces, destination, stackable, hazmat, notes | partial | B, A, D | form load rows; A12/A13 mapping; D11 crew pills |
| 8 | Optional unload/load order | partial (seq exists) | B, A, D | form order, `loadOrder`, `seq`, zzReorder; D10 |
| 9 | Live truck card: booked → on the way → checked in → waiting clock → at door # → done | partial (one-line status) | B, A | liveCard with ZZtruckSteps / ZZwaitMs |
| 10 | Place in line | missing | B C E, A | ZZplace (customer card, kiosk done, driver page, yard board) |
| 11 | Promise "unloaded within 2 hours of check-in" and done against the promise | missing | B E, A | ZZpromise, `settings.promiseMin`, ZZDockSet |
| 12 | Instant "done" message with photos and damage | partial (data exists; customer never saw it) | B, A | Schedule done note, truck sheet Done section, ZZmsgs `done` |
| 13 | Damage photos, fix price, approve / decline | exists (photos were the load's, not the damage's) | B, D, A | dmgCard `photoOwner`; ZZDmg; zzEstLines |
| 14 | No auto-approve unless the customer opts in (under $X) | missing | A, B | zzEstLines / zzReportDamage rule; alerts sheet setting |
| 15 | Monthly damage history instead of claims | missing | B, A | Damage tab using ZZdmgMonths |
| 16 | Securement report (gear ours vs driver's, tags, seal, 5 photos, confidence 1–5, signature) | missing | D, B, A | ZZSecure step (D21–D30), truck sheet secured section, zzSecure |
| 17 | Our gear on loan | missing | B, A | Inventory "Our gear with you", ZZgearOut |
| 18 | "Securement plan $2,000 per 6 months" interest | missing | B, E, A | Inventory plan card (zzCustomer), office interest list |
| 19 | Alert settings per contact per event (text / email / both) | missing | B, A, E | alerts sheet, `customer.contacts`, ZZrecips / ZZmsgs, Outbox |
| 20 | Friday summary | missing | E, B, A | ZZFriday + zzQueueFriday; client "This week so far" (ZZweek) |
| 21 | Load trail (history per load) | partial (touches, time only) | B, A | ZZtrail in truck sheet; B01 date fix |
| 22 | Kiosk: language first (6 languages) | missing (en/es/ru later in the flow) | C | ZZKiosk lang step, ZZKT |
| 23 | Kiosk: company search or 4-digit code | partial (company only) | C, A | code keypad, ZZbyCode, `trailer.code` |
| 24 | Kiosk: pick today's truck | partial (any date) | C | truck step filter |
| 25 | Kiosk: confirm driver name and cell ("we text the door number") | partial (walk-in only) | C, A | details step, zzKioskIn |
| 26 | Kiosk: scan paperwork with the camera | missing | C | scan step, `paper:<tid>` |
| 27 | Kiosk: done screen with place in line and estimated wait | partial | C, A | done step, ZZplace / ZZestWait |
| 28 | Kiosk: auto reset 30 s after done and after 90 s idle | partial (90 s after done only) | C | timers in ZZKiosk |
| 29 | Kiosk: walk-in path | exists | C, A | checkInWalkup (+driverLang, code) |
| 30 | Driver ETA page opened from a link | missing | C | `#eta<code>` → ZZEta (C01/C02) |
| 31 | ETA buttons 15/30/60/120 min or pick a time | missing | C, A | ZZEta, zzEta |
| 32 | Paste a GPS / Samsara link | missing | C, A | ZZEta, zzTrack |
| 33 | Driver sees status (in line #, go to door #) | missing | C, A | ZZEta status |
| 34 | In the driver's language | missing | C | `driverLang` + picker |
| 35 | Crew: queue with live wait clocks against the goal | missing | D, A | ZZCrew cards, xj (D01–D03), nJ (D04), bell (D05) |
| 36 | Crew: start at a door, busy doors disabled | exists | D | labels via D06 |
| 37 | Crew: count pallets per load | exists (inbound), partial (outbound) | D | D08/D09 |
| 38 | Crew: damage report with 2+ required photos and suggested fix lines | partial (no photos required, no fix lines) | D, A | ZZDmg (D12–D20), zzReportDamage |
| 39 | Crew: done photos | exists | D | Photo log step kept |
| 40 | Crew: secure the load | missing | D, A | ZZSecure (D21–D30), zzSecure |
| 41 | Crew: log gear returned | missing | D, A | Gear tab, zzGear |
| 42 | Office: yard board with wait clocks against the goal | partial (door map without goal) | E, A | ZZYard |
| 43 | Office: stats (in yard, at doors, done today, avg wait, longest wait, promise kept %) | partial (other KPIs) | E, A | ZZYard tiles |
| 44 | Office: door map | exists | E | OQ colour by promise and goal (E06) |
| 45 | Office: Outbox of every text and email | partial (in Setup, 9 kinds) | E, A | Outbox tab, ZZmsgs (A20), ZZobx (E10) |
| 46 | Office: Friday summaries | missing | E, A | ZZFriday |
| 47 | Office: gear out per customer | missing | E, A | ZZGearOffice |
| 48 | Office: settings (promise, wait goal, rates) | partial (rates only) | E, A | ZZDockSet, zzSettings |
| 49 | Shared realtime data for people with edit access | missing | A | sync-source.js, A01–A08 |
| 50 | Customers on the public link keep per-browser data and never see other customers' data | partial (all local; screens hide others) | A, B | no db on the public artifact; privacy rules 1.5 |
| 51 | Website describes the new features | missing | F | site-src (3.F) |

---

## 5. Risks and how to avoid breaking the live portal

1. **Every publish reaches every customer at once.**
   - Never publish an untested build to `97haWKtJGFGXW8PjdM9XWv`.
   - Order: build2, then all tests, then the private staging artifact, then Nick's OK, then live.
   - Keep `base/portal.base.html` and the artifact's version history for a one-step rollback.
   - Publish outside customer hours (dock hours are Mon–Fri 6am–10pm Pacific).
2. **Hand edits and drift.**
   - `portal.html` only ever comes out of build2.
   - The readable sources and patch files are the truth.
   - build2 fails on a duplicate anchor, an overlap or a name clash.
   - `node --check` and the regression run catch syntax errors before anyone sees them.
3. **Breaking saved data in people's browsers.**
   - Open existing data without migrating it: no `bA` bump, defaults on read, nothing written on load.
   - Test with a doc saved by the base build.
4. **Shared mode overwriting real data.**
   - Wait for server answers (`fromCache === false`) before reading the data as real.
   - Only the owner seeds, while holding a lease.
   - `fresh()` throws in shared mode.
   - Go read-only after `invalid_argument`.
   - Refuse documents over 240 KB.
   - Keep log arrays short.
   - The last write wins inside one record, so two people editing the same load at the same second can lose a change. Writes are field-level, which keeps this rare.
5. **Privacy.**
   - The public artifact never declares `db`.
   - The staff artifact uses `read:"interact"` rules and is never shared by link.
   - Customer screens show counts only, never `doc.activity`, never PINs.
   - Today any visitor's browser holds the full demo doc, including demo PINs. That is demo data only, and it must never be connected to the shared database.
   - Turn off the always-on test-mode login list (A17) in the first release. Today it lets anyone open Office as Nick without a PIN.
6. **Promising what is not real.**
   - No real texts or emails yet. Copy says "We'll text…" / "Alert queued".
   - The Outbox banner says it is not connected.
   - The driver ETA page cannot reach the office from a driver's own phone: it shows the copy-text fallback.
   - The website's `LIVE` switches stay at `'soon'` for alerts, the ETA link and the 6-language kiosk until they really work.
7. **Two devices giving out the same door** in shared mode.
   - `zzKioskIn` holds the `locks/doors` lease.
   - The office board flags doubles.
   - `checkIn` and `assignDock` from other screens are not locked; the flag covers them.
8. **Hash links inside the viewer.**
   - `#eta1234`, `#kiosk` and `#signup` through `claude.ai/artifact/<id>#…` are not verified yet. Test them on staging before printing or sending any link.
   - Links are built from `ZZPUBLIC_URL`, never `location.href`.
9. **Browser storage full in local mode.**
   - New photos (damage, securement, paperwork) fill the roughly 5 MB browser limit sooner.
   - A0 shows a banner instead of losing saves silently.
   - Keep photos at 900 px and 0.62 quality (700 px in shared mode).
10. **Time zones.**
    - Middletown PA is on Eastern time, and dispatchers can be anywhere. Appointment entry and display use dock time (Pacific) for now, labelled "dock time".
    - A2 adds `settings.sites[*].tz`. The Outbox texts that say "Reno" stay until A2.
11. **25,000-document and 256 KiB limits.**
    - One document per record keeps each one small.
    - At roughly 120 new documents a day, archiving (A2) is needed within about 6 months. `ZZSyncCard` shows the count.
12. **Kiosk and TV are public-facing.**
    - Exiting needs an office PIN.
    - The 90 s idle reset clears walk-in details (email, MC, phone).
    - No automatic printing, because `window.print` may be blocked in the viewer.
13. **Translation quality.**
    - Kiosk and driver strings in uk, pa and hi come from the prototype. Nick should have native speakers check them before relying on them.
14. **Customers mixing up the two codes.**
    - The truck code is never the account PIN.
    - The kiosk never accepts PINs.
    - The office truck sheet shows the code clearly.
15. **Too many tabs on phones.**
    - Office goes from 8 to 11 tabs (E03 makes the bar scroll).
    - Crew gets a 5th tab; check that Russian labels do not wrap.
    - The customer portal gets no new tab: settings open from the header.

## 6. Questions for Nick before go-live

1. **The 2-hour promise.** Exact wording and exceptions: dock hours only? floor-loaded containers? after hours? Should it be on the public website?
2. **Securement plan price.** Show "$2,000 per 6 months" in the customer portal only, or also on the website? DECISIONS says "call for quote".
3. **Kiosk tablet.** Where it sits at each dock, and which staff account it stays signed in with.
4. **Staff artifact.** Who gets Editor access (office, crew phones, kiosk, TV)?
5. **Starting data.** Should the shared staff data start empty or with the demo trucks?
6. **Texting.** Is a texting or email service planned? Until then the office sends urgent messages by hand from the Outbox.
7. **Multi-site.** Door counts and street addresses for North Highlands and Middletown. The prototype lists 8 and 50 doors.
