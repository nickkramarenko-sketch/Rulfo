# 24 HR Dock app: build contract

Working prototype of the 24 HR Crossdock dock app. One page (`index.html`) with five views that share one live database:

| Role | Who | File |
|---|---|---|
| `client` | Customer dispatcher (phone or desktop) | `js/client.js` |
| `kiosk` | Check-in computer at the dock (big touch screen, no keyboard skills needed) | `js/kiosk.js` |
| `driver` | Truck driver's ETA page, opened from a link (`#driver4821`) | `js/kiosk.js` (shares the language strings) |
| `crew` | Forklift driver's phone | `js/crew.js` |
| `office` | Office yard board (wide desktop screen) | `js/office.js` |

The owner (Nick) is not technical. Every screen must be obvious, big, and plain English. Short words. No jargon.

## Hard rules

1. Plain ES5-style JavaScript in an IIFE, like `js/core.js`. No build step, no frameworks, no libraries, no `import`.
2. Register with `App.register({ 'role.view': fn }, { 'role.action': fn })`. A view is `function(params) -> HTML string`. Prefix every view and action name with your role (`client.`, `kiosk.`, `driver.`, `crew.`, `office.`).
3. **Escape every piece of data** you put in HTML with `App.h(value)`, including attribute values. Data comes from other people.
4. Inputs need a stable `id` (core keeps focus and caret across re-renders by id). Bind them with `data-form="formName" data-field="path.in.form"`; core writes the value into `App.form(formName)` on every keystroke. Add `data-rerender` only when the screen must change as they type (e.g. a search list).
5. Never use `alert`, `confirm`, `prompt`, `window.open`, `<a download>`, `window.print`. Use `App.toast(text)` and `App.confirmBtn(...)`.
6. Phone numbers and emails are shown as text. `tel:` / `sms:` / `mailto:` links may not work inside the artifact viewer, so never rely on one.
7. All texts and emails go through `App.notify(customerId, event, text, truckId)`, `App.notifyDriver(truck, text)` or `App.notifyCrew(truck, text)`. Nothing is really sent yet: the office "Outbox" screen shows what would go out. Never claim a text was sent; say "We'll text…" or "Alert queued".
8. Writes: `App.patch(coll, id, partialFields)` to change some fields (objects merge, arrays replace whole). `App.save(coll, id, wholeDoc)` to create. `App.logTruck(truck, 'what happened', byName, {other: fields})` to change a truck and add a line to its load trail in ONE write. Don't write from inside a view function (views must be pure); write only in actions.
9. Use only the CSS classes listed below plus small inline `style` for one-off spacing. Don't add a `<style>` block. Colors only through the existing classes (they handle dark mode). If you truly need a new class, list it in your final report instead.
10. Example data has `example: true`. Show `App.exampleTag(doc)` next to company names in lists so people know it's made up.
11. Everything must work at 390px wide (phone). Office board must also look good at 1400px.
12. No emojis as the only label. Small icons next to words are fine (HTML entities or emoji), words always present.

## Data model (collections → documents)

Times are ISO strings. Money in dollars. Weights in pounds.

### `customers/{id}`
```
name, code (short uppercase, e.g. 'SIERRA'), dock ('reno'|'sac'|'pa'), notes,
autoApproveUnder: number|null   // auto-approve damage fixes under $X; null = never (default: never)
fridaySummary: bool (default true)
contacts: [{ name, role, phone, email,
             alerts: { <event>: { text: bool, email: bool } } }]   // events: see App.EVENTS
createdAt, example
```

### `trucks/{id}`  (one truck visit; may carry several loads)
```
customerId, code ('4821', 4-digit check-in code from App.newCode()), dock ('reno'|'sac'|'pa'),
kind ('drop'|'pick'|'both'), apptAt (ISO, ANY time the client picks — no preset slots),
status ('booked'|'arrived'|'working'|'done'|'cancelled'),
carrier, truckNo, trailerNo, driverName, driverCell, driverLang ('en'|'es'|'ru'|'uk'|'pa'|'hi'),
tracking ('link' = driver updates ETA from a link | 'samsara' | 'gps' (paste share link) | 'self' = client updates | 'none'),
trackUrl,                      // Samsara / GPS share link
eta: { at, source ('driver'|'client'|'office'|'samsara'|'gps'), updatedAt, note },
loads: [{ id, ref (PO/BOL #), pallets, weight, pieces, destination, stackable, hazmat, notes }],
loadOrder: bool,               // true = loads array order is the order to unload/load
paperwork: [photoRef],         // scans from kiosk/office
checkedInAt, checkedInBy ('kiosk'|'office'), door, startedAt, doneAt, crewName,
counts: { <loadId>: countedPallets }, countNote,
photos: [photoRef],            // done photos (staged pallets / loaded trailer)
damageIds: [damageId],
secure: { gear: { plywood|bars|straps|airbags: { qty, owner ('ours'|'driver') } },
          tags: ['B-104'], seal, photos: { nose, middle, tail, closeup, seal } (photoRefs),
          confidence (1-5), note, signedBy, signature, checkedRows (bool), signedAt },
history: [{ at, by, text }],   // the load trail. Append with App.logTruck.
notes, createdAt, createdBy ('client'|'office'|'kiosk'), example
```

### `damage/{id}`
```
truckId, customerId, loadId, ref, at, by (crew name), pallets (how many hurt),
kinds: ['Torn wrap', ...], what (words), photos: [photoRef] (REQUIRED, at least 2: wide + close-up),
fixLines: [{ label, qty, rate }]  // App.damageTotal(d) = sum qty*rate
status ('waiting'|'approved'|'declined'|'auto'), decidedAt, decidedBy, customerNote, example
```

### `gear/{id}`  (ledger of OUR securement gear going out with a customer's truck, and coming back)
```
customerId, truckId, type ('plywood'|'bars'|'straps'|'airbags'), qty, dir ('out'|'back'), tags: [], at, by, note
```
`App.gearOut(customerId)` → `{plywood, bars, straps, airbags, tags}` still out.

### `settings/main`
`promise`, `waitGoalMin`, `crew: [names]`, `docks: {reno|sac|pa: {name, doors, address}}`, `hours`, `rates: {rewrap, labor, delivery, afterHours, newPallet}`, `phone`. Read with `App.settings()` (has defaults).

### `outbox/{id}`
`customerId, truckId, event, text, to: [{name, phone, email, channels: ['text'|'email'|'app']}], at`. Written only by the notify helpers.

### `photos/{id}`
Small photo copies (used when file storage is unavailable). Never write directly; use the photo helpers.

## Core API (js/core.js)

State: `App.state.role, customerId, crewName, view, params, sheet, lang, mode ('live'|'local'), canWrite, uid, confirm, busy`.
Persist per-device choices in localStorage keys `dock24:customer`, `dock24:crew`, `dock24:kioskDock`, `dock24:crewDock` (wrap in try/catch).

- Data: `App.list(coll, filterFn)` → array of docs with `id`; `App.get(coll, id)`; `App.save`, `App.patch`, `App.remove`, `App.logTruck`; `App.loaded[coll]` true after first data.
- Ids/time: `App.newId('t')`, `App.newCode()`, `App.now()`, `App.iso(ms?)`, `App.toIso('YYYY-MM-DD','HH:MM')`, `App.localDate(ms?)`, `App.localTime(ms?)`, `App.isToday(iso)`.
- Format: `App.fmt.time(iso)`, `.date(iso)`, `.dayTime(iso)` ("Today 2:30 PM"), `.dur(ms)` ("1h 5m"), `.ago(iso)`, `.num(n)`, `.money(n)`.
- Trucks: `App.STATUS`, `App.statusPill(t)`, `App.truckSteps(t)`, `App.stepsHtml(t)`, `App.truckPallets(t)`, `App.truckWeight(t)`, `App.kindLabel(t)`, `App.truckTimes(t)` → `{waitMs, workMs, totalMs}`, `App.truckEta(t)`, `App.trucksFor(customerId)`, `App.sortByTime(rows, field, 'asc'|'desc')`, `App.queue(dock)` (waiting trucks, longest first), `App.placeInLine(t)`, `App.estWaitMin(t)`, `App.waitTone(ms)` → 'good'|'warn'|'bad', `App.isActive(t)`, `App.dockName(key)`, `App.dockKeys()`, `App.damageTotal(d)`, `App.gearOut(customerId)`.
- Alerts: `App.EVENTS` ([{key,label}]), `App.notify`, `App.notifyDriver`, `App.notifyCrew`.
- Photos: `App.photoSlot({form, field, label, required})` single photo box (field holds one ref); `App.photoList({form, field, label, required})` many photos (field holds an array); `App.photoTag(ref, alt)` shows a stored photo; `App.photoUrl(ref)`; `App.anyBusy()` true while uploading (disable Save). Photo inputs open the camera on phones.
- Navigation: `App.go(view, params)`, `App.sheet(view, params)` / `App.closeSheet()` (bottom sheet), `App.setRole(role)`, `App.homes`.
- Forms: `App.form(name, init)` (draft object, created once), `App.resetForm(name, init)`, `App.val(form, path)` (escaped value for `value="..."`), `App.getPath/setPath`.
- Screen pieces: `App.topbar(title, {back: 'view'|true, backParams, sub, right})`, `App.tabbar([{view,label,icon,badge}], currentView)`, `App.confirmBtn(key, label, action, {attrs}, tone)`, `App.exampleTag(doc)`, `App.paramAttrs(obj)`.
- i18n: `App.strings[lang] = {key: text}`, `App.t(key, {vars})`, `App.state.lang`.

Built-in actions you can use in markup:
- `data-act="core.go" data-view="client.truck" data-p-id="t1"` → `App.go('client.truck', {id:'t1'})`
- `data-act="core.sheet" data-view="..." data-p-*` → open a sheet
- `data-act="core.closeSheet"`, `data-act="core.home"`
- `data-act="core.set" data-form="f" data-field="kind" data-value="drop"` (omit data-value to toggle a boolean)
- `data-act="core.step" data-form="f" data-field="gear.bars.qty" data-step="1" data-min="0"` (stepper)
- `data-act="core.toggleIn" data-form="f" data-field="kinds" data-value="Torn wrap"` (multi-select chips)
- Forms: `<form data-submit="role.action">` calls your action with the form element (submit default is prevented).
- `data-on-change="role.action"` on an input/select runs your action on change.

Your actions receive `(el, event)`. Read attributes from `el`. Return a promise if async (errors get a toast).

## CSS classes (index.html)

Frame: `.topbar` (use App.topbar), `.body` (main column; add `.wide` for office, `.narrow` for small forms), `.tabbar` (use App.tabbar; add bottom padding is built in), `.rolebar` (core renders it).
Layout: `.stack` (`.tight`, `.loose`), `.row` (`.between`, `.nowrap`, `.top`; child `.grow`), `.grid2/.grid3/.grid4`, `.cols` (auto columns), `hr`.
Cards: `.card` (`.flat .tight .soft .link` and left-edge tones `.accent .good .warn .bad .info`), `.card-head`, `.banner` (`.info .warn .bad .good .accent`), `.hero` (navy block), `.stat` (`<b>` number + `<span>` label).
Buttons: `.btn` + `.primary .secondary .ghost .danger .good .navy` + `.block .lg .sm`; `.btn-row`; `.linkbtn`; `.filebtn`.
Chips: `.pill` (`.info .warn .good .bad .accent .example`), `.chip` (`.on`) in `.chips`, `.seg` with buttons (`.on`), `.choice` (`.on`; children `.ci` icon, `.ct` with `<b>` + `<span>`).
Forms: `.field` (label + input/select/textarea, `.hint`, `.err` + `.errmsg`), `.check`, `.stepper` (button, output/input, button).
Progress: `.steps` (use App.stepsHtml), `.progress` (`> i` with width%; `.good .warn .bad`), `.clock` (big tabular numbers).
Lists: `.list` > `.li` (`.link`; child `.grow` with `<b>` + `<span>`), `.kv` (`<dl class="kv"><dt><dd>`), `.tbl-wrap` > `table.tbl`, `.timeline` > `.tl` (`.good .warn .bad .accent`; children `.tt` time, `.td` dot, `<div>` text).
Photos: `.thumbs` grid, `.thumb`, `.photo-slot` (use helpers).
Overlays: `.sheet` (use App.sheet), `.toast`, `.empty-state`.
Text: `.muted .faint .small .tiny .big .num .bold .mono .label .center .right .good-t .warn-t .bad-t .info-t .sr`.
Kiosk only (inside `<div class="kiosk">`): `.k-top .k-main .k-foot .k-btn (.on .go .quiet) .k-grid .k-input .k-card .k-big .k-keys .k-dots (i.f) .k-steps (i.on)`.
Office board: `.board > .lane > .lane-head`, `.tcard (.late .soon .ok)`, `.doors > .door (.busy)`.

## What each role must do

Nick's goals for the client: get unloaded quick, KNOW they're getting unloaded quick, be told right away about damage, have the load stacked and secured very safely, hear from us through the whole process, and have forms that are easy to fill out and easy to read.

### client (js/client.js) — phone first, works on desktop
- `client.signin` (when `App.state.customerId` is empty or unknown): "Which company are you?" Prototype sign-in: list of customers as big buttons + a company-code box. Save to `dock24:customer`. Note: "Prototype: real sign-in comes later."
- Tab bar on main screens: Home, Book, Loads, Gear, Alerts. Badge on Home for damage waiting approval.
- `client.home`: company name, the promise banner (`settings.promise`), big "Book a truck" button. **Needs you** section first: damage waiting approval (photo, $ total, Approve / Decline buttons inline). **Live trucks** (active: booked today/upcoming, arrived, working): each card shows steps, ETA or appointment, time waited (live clock since check-in, colored with `App.waitTone`), place in line when waiting, door # when at door, pallets, "Driver link" shortcut. Tap → `client.truck`. Then recent done trucks (last 3). Footer: dock phone (text).
- `client.book` (and editing a booked truck: params `{id}`): sections, top to bottom:
  1. Where: dock (Sparks NV / North Highlands CA / Middletown PA — `.choice` cards with address).
  2. What: Drop-off / Pickup / Both (`.seg` or `.choice`).
  3. When: date input + time input (any time, no preset slots). Under it, **how busy that day is** at that dock: count of other trucks per 2-hour block (no other company names, just "3 trucks 8–10 AM"), and how many forklift crew are on (`settings.crew.length`). Warn softly if outside dock hours (`settings.hours`): "After-hours fee may apply".
  4. Truck & driver: carrier, truck #, trailer #, driver name, driver cell, driver language (6 choices). All optional except one of carrier/driver name.
  5. ETA updates (how will we know when the truck is close?) — `.choice` list: "Send my driver a link" (`tracking:'link'`; after booking shows the link `#driver<code>` with a Copy button and plain text "Send this to your driver"), "Samsara" / "Other GPS app" (paste share link, `trackUrl`), "I'll update it myself" (`self`), "No updates" (`none`).
  6. Loads: list of loads (ref, pallets, weight); "+ Add load" opens a sheet `client.load` (ref/PO/BOL, pallets, weight lbs, pieces, destination/notes, stackable yes/no, hazmat yes/no). Edit/remove each. Checkbox "Unload/load in this order" with up/down buttons when 2+ loads. Totals: pallets and weight.
  7. Notes.
  Validation (inline `.field.err` messages, not toasts): date+time required, at least one load with pallets > 0. Submit → `App.save('trucks', id, ...)` status booked, new code, history "Booked by <contact or company>", `App.notify(customerId,'booked',...)`, then `client.booked`.
- `client.booked`: big check mark, "Booked for <dayTime> at <dock>", **check-in code** big (mono), driver link + Copy button (navigator.clipboard in the click handler, catch errors, fall back to selecting the text), what happens next (3 short lines: driver checks in at the kiosk with this code → we text you when unloading starts → you get photos when done).
- `client.truck` (params `{id}`) — the load details page / live truck card:
  - Header: kind, status pill, steps.
  - Live box: ETA (with source: "from driver 10 min ago" / Samsara link) + "Update ETA" (sheet with date/time, saves `eta` with source 'client', history, notify 'eta'); after check-in: waited X (live), place in line, est. wait; at door: door #, working X (live); done: total time vs promise ("Done in 1h 12m — within our 2-hour promise").
  - Damage cards (photos, what, pallets, fix lines + total, status; Approve / Decline with optional note when waiting).
  - Done photos; counts per load ("18 of 18 pallets").
  - Securement report when present: gear table (type, qty, ours/driver's), tags, seal, 5 photos with labels, confidence (e.g. 5/5 shown as 5 bars), signed by + time.
  - Loads list, paperwork scans, driver info.
  - Load trail: `history` as `.timeline`.
  - If still booked: Edit (→ `client.book` with id) and Cancel (`App.confirmBtn`, sets status cancelled + history).
- `client.damage` (params `{id}`): full damage detail with large photos and approve/decline. Approve → status approved, decidedAt, decidedBy (contact name or "Client"); decline → declined + note. Both add a line to the truck history and a toast.
- `client.damagelog`: monthly damage history (not claims): per month: number of reports, pallets hurt, approved $ total; list rows link to `client.damage`. Link from Loads tab.
- `client.history` (Loads tab): past and current loads listed **per load** (each load ref is a row, not per truck): ref, date, pallets, dock, status, damage flag. Search box by ref. Tap → `client.truck`.
- `client.gear`: our gear on loan to them now (plywood sheets, load bars, straps, airbags + tag numbers), ledger list (out/back with dates and truck), and a card "Securement plan — coming soon: our gear on every load for $2,000 per 6 months" with a "I'm interested" button that records a note (patch customer `securementInterest: iso`) and toasts.
- `client.alerts`: contacts list; each contact: name, role, phone, email (editable) and a grid of every `App.EVENTS` row × Text / Email checkboxes. Add contact, remove contact. "Auto-approve damage fixes under $__" (blank = never, default never; explain "We always send photos first"). Friday summary on/off. Save button → `App.patch('customers', id, {...})`, toast "Saved".

### kiosk + driver (js/kiosk.js)
- Defines `App.LANGS = [{code:'en', name:'English'}, {code:'es', name:'Español'}, {code:'ru', name:'Русский'}, {code:'uk', name:'Українська'}, {code:'pa', name:'ਪੰਜਾਬੀ'}, {code:'hi', name:'हिन्दी'}]` and fills `App.strings` for all six with every driver-facing string (good, natural translations, short). English text must be complete; others too.
- Kiosk views render inside `<div class="kiosk">` with `.k-top` (logo + dock name + small "Staff" button + language name), `.k-main`, `.k-foot` (step dots, Back / Start over). No role bar (core hides it for kiosk). The staff button opens a small panel: choose which dock this kiosk is at (`dock24:kioskDock`), and "Leave kiosk" (→ `App.setRole('office')`).
- Flow (language first, then company — Nick's order):
  1. `kiosk.lang`: "Choose your language" in all languages, six big buttons (native names). Sets `App.state.lang`, resets the check-in form.
  2. `kiosk.company`: "What company is this load for?" Big text box with live matches (customers by name or code, case-insensitive) as big buttons. Also big button "I have a 4-digit code" → `kiosk.code`. And "Not booked / I don't see my company" → walk-in.
  3. `kiosk.code`: on-screen number pad (`.k-keys`, `.k-dots`), auto-continues at 4 digits to that truck if it's booked/arrived at any dock; wrong code → friendly message, try again.
  4. `kiosk.truck`: today's (and overdue) booked trucks for that company at this kiosk's dock, as big cards: time, truck #, carrier, Drop/Pickup, pallets. Pick one. "My truck isn't listed" → walk-in.
  5. `kiosk.details`: confirm/enter driver name, cell ("We text you your door number"), truck #, trailer #. Big inputs. Prefilled from booking.
  6. `kiosk.scan`: "Scan your paperwork": one huge button "Take a photo of your paperwork" (uses App.photoList so many pages are allowed; accept images and PDF: `accept: 'image/*,application/pdf'`), tips ("Lay the paper flat. Fill the screen. One photo per page."), thumbnails of pages taken, "Done" and "Skip — give papers to the office".
  7. `kiosk.done`: "You're checked in!" Place in line (big number), estimated wait, door text promise if cell given, "Stay with your truck. Watch for our text." Auto-returns to `kiosk.lang` after 30 s (show countdown) and a "Finish" button.
  On check-in (step 6 → 7): `App.logTruck(truck, 'Checked in at the kiosk', 'Kiosk', {status:'arrived', checkedInAt, checkedInBy:'kiosk', driverName, driverCell, driverLang, truckNo, trailerNo, paperwork: [...]})`, `App.notify(customerId,'arrived', 'Your truck <truckNo> checked in at <dock>. Place in line: N.', id)`, `App.notifyCrew(truck, 'New truck in the yard: <company>, <pallets> pallets')`.
  Walk-in: company typed (match an existing customer if the name matches, else customerId null and store `walkInCompany`), kind, pallets estimate, then details → scan → done; creates a truck with status 'arrived', createdBy 'kiosk', code from App.newCode(), history "Walk-in checked in at the kiosk". Office sees it.
  - Idle reset: if nothing is touched for 90 s on any step after the first, go back to `kiosk.lang` and clear the form.
  - Already checked in (code for an arrived/working truck): show its place in line / door instead of checking in twice.
- Driver page (driver-facing, translated, phone): `driver.code` (enter 4-digit code; params.code skips this) → `driver.eta` (params `{code}` or `{id}`): truck/company/dock address/hours, status in big words ("Booked for 2:30 PM" / "Checked in — #2 in line" / "Go to door 4" / "Done. Drive safe."), **Update my ETA** big buttons: "I'm 15 min away", "30 min", "1 hour", "2 hours", "Pick a time" (time input), "Running late" note; each saves `eta: {at, source:'driver', updatedAt}` with `App.logTruck` and `App.notify(customerId,'eta','Driver ETA now <time>')`. "Share live location": paste a Samsara/Google Maps/GPS share link (saves `trackUrl`, tracking 'gps'). Language picker at top (six choices). If the truck is done/cancelled, say so. The role bar is visible (prototype), that's fine.

### crew (js/crew.js) — forklift driver's phone, gloves-friendly (big buttons)
- `crew.signin`: "Who's driving the forklift?" crew names from settings as big buttons + add your name (adds to `settings.crew` via patch). Pick dock. Save `dock24:crew`, `dock24:crewDock`. Topbar shows "<name> · <dock>" with a switch button.
- `crew.home` (queue for my dock): **Waiting in yard** first (from `App.queue`), each: place #, company, kind, pallets, waited clock big (tone by `App.waitTone`), "NEW" pill if checked in < 5 min ago, paperwork count. Then **At the doors** (door #, crew name, work clock), then **Coming today** (booked, ETA). Empty states. Tab bar: Queue, Done today, Gear.
- `crew.truck` (params `{id}`): company, loads (ref, pallets, weight, stackable/hazmat flags, destination, notes, order numbers if loadOrder), paperwork photos (tap to enlarge in a sheet), driver name/language/cell. Primary action by status:
  - arrived → "Start at door…": door picker of this dock's doors (`settings.docks[dock].doors`), busy doors disabled and labelled with the company there. Start → `logTruck(... 'Unloading started at door N' / 'Loading started at door N', crewName, {status:'working', startedAt, door, crewName})`, `App.notify(customerId,'started',...)`, `App.notifyDriver(truck, 'Go to door N')`.
  - working → `crew.work` (the work screen).
- `crew.work` (params `{id}`): sections:
  1. Count (for drop/both): per load a stepper with counted pallets vs expected ("18 of 18"); mismatch shows a required note field.
  2. Damage: list of damage already reported on this truck + big "Report damage" button → `crew.damage`.
  3. Done photos: `App.photoList` — at least 1 required ("Photo of the pallets staged" / for pickups "Photo of the loaded trailer").
  4. For pickup/both: "Secure the load" button → `crew.secure`; shows ✓ when `secure` saved. Required before finishing a pickup.
  5. "Finish" (disabled until requirements met, with a line saying what's missing) → saves counts, photos, `doneAt`, status done, history "Done: X of Y pallets counted", `App.notify(customerId,'done', 'Done at <dock>: X pallets, N photos, M damage reports. Total time ...')`, `App.notifyDriver(truck, 'All done. You can pull out.')`, back to `crew.home` with toast.
- `crew.damage` (params `{id}` truck): which load (choice), how many pallets (stepper), what happened (chips multi: Crushed, Torn wrap, Leaning, Wet, Broken pallet, Missing boxes, Other), words (textarea), **photos required: at least 2** ("Wide shot" and "Close-up" slots + more), suggested fix lines prefilled from settings.rates (Rewrap $15 × pallets, Labor $120/hr × 0.5, New pallet $25) with qty editable and a line toggle. Save disabled until 2 photos + a kind. On save: create `damage` doc. If customer.autoApproveUnder is a number and total < it → status 'auto' (say "Auto-approved by customer setting"), else 'waiting'. Push id to truck.damageIds + history via logTruck. `App.notify(customerId,'damage', 'Damage found on <ref>: N pallets, <kinds>. Photos and fix price are in your portal.')`.
- `crew.secure` (params `{id}`): Nick's securement line, each a row with a stepper and an Ours / Driver's toggle: Plywood sheets (typical 5–6), Load bars (typical 2), Straps (typical 4), Airbags. Tag numbers for OUR gear (text input + add, chips with remove). Seal number. **5 required photos**: Nose (front of trailer), Middle, Tail (doors), Bars/straps close-up, Seal. Confidence 1–5 (five big buttons: 1 "Not safe" … 5 "Rock solid"); 1–3 require a note "What would make it safer?". Sign: checkbox "I checked every row is tight and nothing can shift", typed signature (name). Save → `logTruck(truck, 'Secured: confidence N of 5, seal S', crewName, {secure:{...}})`, one `gear` doc per type with qty>0 and owner 'ours' (dir 'out', tags on the bars row), `App.notify(customerId,'secured', ...)`. Back to `crew.work`.
- `crew.done`: today's finished trucks at my dock with times and confidence. 
- `crew.gear`: log gear coming back (customer choice, type, qty, tags) → `gear` doc dir 'back'; and show gear out by customer.

### office (js/office.js) — wide screen
- Tab/top navigation (not a phone tab bar; use a row of `.chip` buttons under the topbar): Yard board, Book, Damage, Gear, Customers, Outbox, Friday, Settings.
- `office.board`: dock filter chips (All, Sparks, North Highlands, Middletown; remember in localStorage `dock24:officeDock`). Stat tiles: In yard, At doors, Done today, Avg wait today, Longest wait now (red when over goal), Promise kept today (% of done trucks with total time ≤ 2 h; parse hours from nothing — use 120 min). Lanes (`.board`): Coming today (booked, sorted by ETA/appt; late if past time and not checked in → `.late`), Waiting in yard (wait clocks, `.late` over goal, `.soon` at 75%), At doors (door, crew, work clock), Done today. Under lanes: door map per selected dock (`.doors`), busy doors show company + clock. Click any truck → `office.truck`. Auto-updates live (data + 20 s clock).
- `office.truck` (params `{id}`): everything about the truck (like the client page but office actions): Check in now (for drivers who skip the kiosk; status arrived, checkedInBy 'office'), Assign door / start, Mark done, Set ETA, Edit note, Scan paperwork for the driver (`App.photoList` then save to `paperwork`), Cancel (confirmBtn), and links to damage. Load trail timeline. Outbox messages for this truck.
- `office.book`: book a truck for any customer (customer select + the essentials: dock, kind, date, time, carrier, driver, cell, one or more loads ref/pallets/weight). Creates booked truck with createdBy 'office', notify 'booked'. Shows the code + driver link after.
- `office.damage`: all damage reports, filter waiting/approved/declined/auto; each row photo thumb, company, ref, pallets, $ total, status, age; click → sheet with detail (office can't approve for the client, but can add a note).
- `office.gear`: gear out per customer (table: plywood, bars, straps, airbags, tags), log return (sheet), recent ledger.
- `office.customers` / `office.customer` (params `{id}` or new): list with active trucks count; edit name, code, dock, notes, auto-approve, contacts (name, role, phone, email). New customer button.
- `office.outbox`: banner "Texts and emails are not connected yet. This is exactly what would be sent." List newest first: time, event label, company, message text, recipients with channels (Text / Email / App pills). Filter by event and company. Count today.
- `office.friday`: per customer, this week (Mon to now): trucks, pallets, average wait, average door time, promise kept %, damage reports + $ approved, gear still out. Preview the email text. "Queue Friday summaries" → one `App.notify(customerId,'friday', text)` per customer with `fridaySummary !== false`, then toast with count.
- `office.settings`: promise text, wait goal minutes, crew names (add/remove), doors per dock, rates, phone, hours. Save → `App.patch('settings','main', ...)`. "Clear example data" (confirmBtn) removes every doc with `example: true` in all collections (except nothing else). Also show the per-role links (the artifact link + `#client`, `#kiosk`, `#crew`, `#office`, `#driver`) as text.

## Testing

`app/test/harness.js` serves the app with a mock runtime (`test/mock-claude.js`) and example data (`test/fixtures.js`). Write your test as a plain Node script (no test framework) that exits non-zero on failure:

```js
const H = require('./harness');
(async () => {
  const h = await H.start();                         // fresh example data
  const page = await h.open('crew', { crewName: 'Alex' });   // or 'client' with {customerId:'c_sierra'}, 'kiosk', 'office' (viewport 1400x900), 'driver' with {hash:'driver4821'}
  await page.click('text=Waiting in yard');           // drive the real UI
  await page.setInputFiles('input[type=file]', h.UPLOAD_PNG);   // photo uploads
  const db = await h.dump(page);                       // read what was saved
  if (h.errors.length) throw new Error(h.errors.join('\n'));
  await h.close();
})().catch(e => { console.error(e); process.exit(1); });
```
Run: `cd /home/user/Rulfo/app/test && NODE_PATH=$(npm root -g) node <role>.test.js`. Take screenshots to `/tmp/claude-0/-home-user-Rulfo/928f61b7-5bf4-59e6-9ccf-0daf06c385c6/scratchpad/shots/` and LOOK at them (Read tool) at 390 px wide (and 1400 px for office). Pages opened by one harness share one live database, so you can open two roles and watch one update the other. Never use `pkill`; `h.close()` stops everything.
