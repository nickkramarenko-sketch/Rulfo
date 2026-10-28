# Website premium upgrade — plan and single source of truth (Oct 28 2026)

Nick's brief (summarized faithfully below) + the decisions made from it + the facts every page must use.
Everything built for this upgrade follows this file. If a page and this file disagree, this file wins.

Site = static HTML built by `site-src/build.py` into `site/` (Netlify publishes `site/`). Sources: `site-src/pages/*.html` fragments,
`site-src/assets/site.css`, `site-src/assets/site.js`, `site-src/drivers_text.py`. Read `site-src/README.md` and `site-src/DECISIONS.md` first.
Nothing goes live until Nick says "go live": work lands in the repo and in the private preview artifact only.

---------------------------------------------------------------------------------------------------
## 1. Nick's brief (what he asked for)

Role: senior website designer, frontend dev, B2B logistics marketing, SEO, conversion. Improve the EXISTING site, don't rebuild it.
**He likes the current design.** Preserve: branding and visual identity, color scheme, typography and style, layout structure wherever possible,
navigation style, working functionality. Goal: look more premium, more professional, more informative; convert better; feel like a highly capable,
professionally operated logistics company.

### 1.1 Visual
- Real, high-resolution photography of modern, exceptionally clean, professionally operated warehouses (Class A distribution feel): big organized
  warehouses, clean concrete floors, pallet racking, forklifts handling freight, cross-dock operations, big loading docks, palletized freight,
  trucks backed into dock doors, workers handling freight safely, modern well-lit facilities, organized drums/crates/oversized freight.
- No cartoon illustrations, no fake-looking AI images, no generic logistics graphics, no low-res photos. Licensed authentic photography or approved
  company photos only. **Never imply that a photo of a third-party facility is one of our locations.**
- Homepage hero: premium cinematic warehouse video (forklifts moving pallets, trucks at dock doors, cross-docking, freight between trailers,
  pallets into racking, wide shots of clean facilities). Real footage, muted autoplay, seamless loop, no visible controls, dark overlay for readable
  headlines, fast loading, mobile poster or lightweight alternative, respects reduced-motion, no music, properly licensed.
- Subtle premium motion: smooth section transitions, gentle image zoom, refined hover, subtle scroll reveals, animated service cards, smooth nav.
  Restrained and professional; nothing that hurts usability or loading.
- **If genuine footage/licensed photos are unavailable: provide a media placement plan and exact asset requirements instead of misleading images.**

### 1.2 Positioning
- **Cross-docking is the core business and must stay the most recognizable service everywhere.**
- Also: freight transloading, freight consolidation, freight rework, warehousing, 3PL services, pallet storage, third-party pickups and deliveries.
- All three locations offer all core services; each has specialties. Never suggest a service is unavailable at a location just because it isn't a specialty there.

### 1.3 Locations and location-specific service pages
Keep the main company-wide service pages. Create or improve three location landing pages. Add detailed location-specific service pages for the
strongest local specialties (genuinely useful, not the same text with a different city name; no duplicated local landing pages).
- **Sacramento, CA** — specialties: 1 Cross-docking, 2 Freight consolidation, 3 Transloading, 4 Freight rework. Pages: Cross-Docking Sacramento,
  Transloading Sacramento, Freight Consolidation Sacramento. Specs: 8 dock doors; 500–1,000 pallet storage capacity; 4,500 lb forklift capacity;
  Mon–Fri 6 AM–10 PM; after-hours for an additional $100 fee; third-party pickups and deliveries within 150 miles; one-time and recurring
  transportation; daily, weekly, monthly and long-term storage.
- **Reno / Sparks, NV** — specialties: 1 Cross-docking, 2 3PL warehousing and pallet storage, 3 Third-party pickups and deliveries, 4 Contract
  warehousing. Pages: Cross-Docking Reno, 3PL Warehousing and Pallet Storage Reno, Third-Party Freight Pickups and Deliveries Reno. Specs: 8 dock
  doors; 1,000–3,000 pallet capacity; 4,500 lb forklifts; same hours and after-hours fee; pickups/deliveries within 100 miles; one-time and recurring;
  flexible storage terms. Reno is the growth location for warehousing, 3PL contracts and recurring local freight.
- **Harrisburg, PA** — specialties: 1 Cross-docking, 2 Freight rework, 3 Freight consolidation. Pages: Cross-Docking Harrisburg, Freight Rework
  Harrisburg, Freight Consolidation Harrisburg. Specs: **30 dock doors**; about 500 pallet capacity; 4,500 lb forklifts; same hours and fee;
  pickups/deliveries within 150 miles; one-time and recurring; flexible storage terms.

### 1.4 Sections to add
- "**Built to Handle More Than Standard Pallets**": standard pallets, drums, crates, oversized freight, loose cargo, mixed freight; why that
  flexibility helps brokers, carriers, manufacturers, distributors and shippers. Real photos where possible. No unlimited-weight claims, no claim to
  accept every regulated freight type.
- "**Flexible Warehousing & 3PL Solutions Built Around Your Freight**": short-term pallet storage; daily and weekly; monthly; long-term contract
  warehousing; overflow space; inbound/outbound pallet handling; recurring freight movements; cross-docking combined with storage; scheduled
  pickups and deliveries. Reno's warehousing and 3PL made especially prominent. No real-time inventory or advanced fulfillment promises unless verified.
- "**Third-Party Freight Pickups & Deliveries**" page: one-time pickups and deliveries; recurring scheduled pickups and deliveries;
  warehouse-connected moves; local transportation supporting cross-dock, storage, consolidation and rework. Service areas: Sacramento 150 miles,
  Reno 100 miles, Harrisburg 150 miles. Strong quote CTAs.

### 1.5 Location page structure (keep it visually organized, not long or repetitive)
1 Location headline · 2 premium image or video · 3 short facility intro · 4 top three specialties · 5 all other services · 6 facility specs ·
7 freight types handled · 8 storage capabilities · 9 pickup and delivery coverage · 10 local service information · 11 request-a-quote CTA.

### 1.6 Homepage
Preserve the current design. Cross-docking is the main focus. Add or refine: video hero; clear cross-docking positioning; three-location overview;
core services; freight handling capabilities; warehousing and 3PL; pickups and deliveries; operational strengths; quote CTA. Use **46 dock doors**
across the three facilities where appropriate. No exaggerated size, staff counts, guarantees, certifications or customer statistics.

### 1.7 Remove the unnecessary
Audit for repetitive text, generic marketing statements, unnecessary sections, confusing service descriptions, poorly prioritized services, redundant
buttons, excessive information, weak wording, missing operational details. Don't remove useful information or working functionality without saying why.

### 1.8 SEO targets
Cross-Docking Sacramento · Cross-Docking Reno · Cross-Docking Harrisburg · Transloading Sacramento · Freight Rework Harrisburg · Pallet Storage Reno ·
3PL Warehousing Reno · Freight Consolidation Sacramento · Third-Party Freight Pickups and Deliveries. Proper internal linking, titles, meta
descriptions, heading structure, image alt text, location structured data. No keyword stuffing, no duplicated local landing pages.

### 1.9 Technical
Frontend only. Don't touch the operations portal. Preserve integrations (Netlify forms, portal links, GA hook). Responsive desktop and mobile.
Optimized photos, compressed video, lazy-load below-the-fold media, accessible controls, readable contrast, fast navigation, no unnecessary
dependencies, no broken buttons or links, no fake reviews, no fabricated facility photos, no fake statistics or certifications.

### 1.10 Workflow
Phase 1 audit (keep / missing / unnecessary / pages needing content / photo spots / video spots / which location-service pages are worth building /
what to shorten or reorganize) → Phase 2 targeted improvements → Phase 3 quality check (desktop, mobile, navigation, video loading and fallback,
image quality, accessibility, quote buttons and links).

---------------------------------------------------------------------------------------------------
## 2. Decisions made from the brief (Nick can veto any; each is flagged in the audit)

D1. **Dock doors: 46 total** (Sacramento 8, Reno 8, Harrisburg 30). Harrisburg goes from 50 to 30 (Nick's new number). Square footage stays as
    Nick gave it before: 40,000 / 40,000 / 25,000 = 105,000 sq ft.
D2. **"30,000+ pallets a month" comes off the site** until Nick confirms it is 24 HR Crossdock's own volume (the earlier note said "NVK included").
    The hero and stats use facts we are sure of: 3 locations, 46 dock doors, since 2015, 24/7 phone, 1-hour quote reply.
D3. **Harrisburg URL: `/harrisburg/`** (was `/middletown/`). The dock is in Middletown, PA, 10 minutes from Harrisburg; pages say "Harrisburg, PA
    (Middletown)". `/middletown/*` redirects to `/harrisburg/*`. Nothing is live yet, so no SEO is lost.
D4. **Reno service URLs renamed for consistency**: `/reno/cross-dock/` → `/reno/cross-docking/`, `/reno/transload/` → `/reno/transloading/`,
    `/reno/delivery/` → `/reno/pickups-deliveries/`. `/reno/pallet-storage/` stays (good keyword). Old URLs redirect (netlify.toml + HASH map).
D5. **Pickups and deliveries use the radius** Nick gave (150 / 100 / 150 miles) instead of "anywhere". Still our own trucks and drivers.
D6. **After-hours wording**: "Docks open Mon–Fri 6 AM–10 PM. Nights and weekends by appointment; after-hours work carries a $100 fee." Phone 24/7.
    (Old text charged the $100 only for 10pm–6am. Nick's brief says after-hours = $100. Confirm whether weekends also carry the fee.)
D7. **Fulfillment and FBA prep pages stay** (`/reno/fulfillment/`, `/reno/fba-prep/`) as secondary Reno services; they are not in Nick's new
    specialty lists, so they move out of the spotlight (not in the hero, not on the home services grid as a top card). Nick can drop them.
D8. **Photos and video**: no company photos exist (checked Drive) and stock sites are unreachable from this build environment, so the site ships
    with media slots + a media plan (`site-src/MEDIA.md`). Slots render nothing until a file is dropped in; the build lists the missing files.
    Stock imagery, when added, goes only in generic service sections; "our facility" slots take Nick's own photos only (`ours` flag).
D9. **Navigation stays flat** (Reno NV · Sacramento CA · Harrisburg PA · Services · Client Portal · About). `/services/` is the hub for the six
    company-wide service pages; each location page links its specialty pages; the footer lists them all.
D10. **Portal promises stay exactly as the `LIVE` switches allow.** No new portal claims, no "real-time", no "we text you" while alerts are 'soon'.
D11. **Certifications: none claimed.** Reviews: links to the Google listings only, no quotes until Nick supplies real ones (TESTIMONIALS).
D12. Six company-wide service pages are added (the brief says keep the company-wide pages; today only `/services/` exists, the detail pages are
     Reno-only): `/cross-docking/`, `/transloading/`, `/freight-consolidation/`, `/freight-rework/`, `/warehousing/`, `/pickups-deliveries/`.

---------------------------------------------------------------------------------------------------
## 3. Facts (single source of truth — every number on the site comes from here)

Company: **24 HR Crossdock** (logo spelling; Nick also writes "24 Hour Crossdock"). Since 2015. Fully insured, certificate of insurance on request.
No minimums. Dry freight only, no temperature control. No certifications. Phone **916-616-3481**, answered 24/7. Text: same number.
Email 24hrcrossdock@gmail.com. Quote call-back within 1 hour. Client portal: `PORTAL` in build.py (opens in a new tab).
Totals: **3 locations · 46 dock doors · 105,000 sq ft**. Do not total pallet capacity. Do not state monthly pallet volume (D2).

| | Sacramento, CA | Reno–Sparks, NV | Harrisburg, PA |
|---|---|---|---|
| Address | 3036 Orange Grove Ave, North Highlands, CA 95660 | 1095 Spice Islands Dr, Suites 105–106, Sparks, NV 89431 | 2811 Turnpike Industrial Dr, Middletown, PA 17057 |
| Size | 40,000 sq ft | 40,000 sq ft | 25,000 sq ft |
| Dock doors | 8 | 8 | 30 |
| Pallet storage capacity | 500–1,000 pallets | 1,000–3,000 pallets | about 500 pallets |
| Forklifts | rated to 4,500 lb | rated to 4,500 lb | rated to 4,500 lb |
| Hours | Mon–Fri 6 AM–10 PM | same | same |
| After hours | by appointment, +$100 | same | same |
| Pickups & deliveries | within 150 miles | within 100 miles | within 150 miles |
| Transportation | one-time and recurring | one-time and recurring | one-time and recurring |
| Storage terms | daily, weekly, monthly, long-term | same | same |
| Specialties (in order) | Cross-docking · Freight consolidation · Transloading · Freight rework | Cross-docking · 3PL warehousing & pallet storage · Third-party pickups & deliveries · Contract warehousing | Cross-docking · Freight rework · Freight consolidation |
| Also offered | everything in §3.1 | everything in §3.1 + fulfillment and FBA prep (secondary) | everything in §3.1 |
| Approx. coordinates (schema only; verify on Google Maps) | 38.684, -121.370 | 39.523, -119.724 | 40.213, -76.713 |

Local context writers may use (always "approximate", "about"): Sacramento — North Highlands next to McClellan Park, I-80 / Business 80 / I-5,
~15 min to downtown Sacramento, ~2 h to the Bay Area and the Port of Oakland, ~1 h to the Port of Stockton, ~2 h to our Sparks dock over I-80.
Reno–Sparks — on I-80 east of Reno, the Northern Nevada distribution corridor (Sparks, USA Parkway / Tahoe-Reno Industrial Center), ~2 h to
Sacramento, ~4 h to the Bay Area, ~1 h to Carson City, about a day's drive to most of California, Oregon, Utah and Arizona.
Harrisburg — Middletown, PA, next to Harrisburg International Airport, I-76 (PA Turnpike) / I-283 / I-83 / I-81, ~2 h to Philadelphia and
Baltimore, ~2 h to Washington DC, ~3 h to New York and North Jersey, ports of Baltimore (~2 h), Philadelphia (~2 h), NY/NJ (~3 h).
No other statistics (population reached, savings %, customer counts, staff counts) unless they are in this file.

### 3.1 Service definitions (same words everywhere)
- **Cross-docking** (core): trailer in → seal checked, counted against the BOL, photographed at the door → sorted by destination → reloaded on
  outbound trucks the same day. Partial loads can wait on the floor. OS&D and damage reported the same day with photos. Unload promise per `LIVE`.
- **Transloading**: floor-loaded or palletized 20'/40' containers and 53' trailers unloaded, palletized, stretch-wrapped, then reloaded or stored.
- **Freight consolidation**: freight from several shippers, POs or LTL pieces held and built into one outbound load, sorted by stop, wrapped,
  labeled, counted and photographed. Held until the load is complete, then released to the carrier.
- **Freight rework**: leaning, crushed or mixed pallets rebuilt; re-palletizing; sorting mixed SKUs; relabeling; shrink wrap, corner boards and
  banding; photos before and after; nothing extra is charged until the customer approves it.
- **Warehousing / 3PL / pallet storage**: short-term (daily, weekly), monthly, long-term contract warehousing, overflow space; floor and racked;
  inbound and outbound pallet handling; recurring freight; cross-dock + storage combined; scheduled pickups and deliveries; billed weekly, no
  minimums, no long contract required. Inventory wording follows the existing `LIVE['loads']` phrasing only; never "real-time".
- **Third-party pickups & deliveries**: our own trucks and drivers; one-time or recurring, scheduled windows; within each dock's radius; tied to
  cross-dock, storage, consolidation and rework; signed proof of delivery.
- **Freight types**: standard pallets, drums, crates, oversized freight, loose cargo, mixed freight. Dry freight only. Forklifts rated to 4,500 lb
  (heavier pieces: call first). Hazmat or other regulated freight: call first; the site makes no claim to accept it.
- **Reno extras** (secondary): fulfillment, Amazon FBA / Walmart WFS prep (existing pages, existing wording).

### 3.2 Banned on the site
Fake or invented reviews, quotes, logos, statistics, awards, certifications · "real-time" · "guaranteed" (except the 2-hour promise with its fine
print) · "largest / #1 / best" · monthly pallet volume · totals of pallet capacity · drive times without "about" · texts/emails going out while
`alerts` is 'soon' (the build fails on these) · any stock photo captioned or alt-texted as one of our docks · lorem ipsum or placeholder copy.

---------------------------------------------------------------------------------------------------
## 4. Page map (final URLs). ★ = new page. Titles ≤ 60 chars, descriptions 120–160 chars, one H1 per page.

Company-wide
- `/` Home. Hero (video slot), cross-docking lead, three-location overview, core services (cross-docking first), freight capabilities,
  warehousing & 3PL (Reno prominent), pickups & deliveries, operational strengths, client portal teaser (existing), reviews links, CTA.
- `/services/` Services hub: six company-wide services with one-line descriptions and links; the dock-by-dock table (fixed facts); specialties by location.
- ★ `/cross-docking/` Cross-Docking (company-wide core page) → links to the three location cross-docking pages.
- ★ `/transloading/` Freight Transloading & Container Unloading → Sacramento and Reno transloading pages.
- ★ `/freight-consolidation/` Freight Consolidation → Sacramento and Harrisburg pages.
- ★ `/freight-rework/` Freight Rework & Restacking → Harrisburg page (+ Sacramento mention).
- ★ `/warehousing/` Flexible Warehousing & 3PL Solutions Built Around Your Freight (pallet storage, contract warehousing; Reno prominent).
- ★ `/pickups-deliveries/` Third-Party Freight Pickups & Deliveries (radius per location).
- `/locations/`, `/about/`, `/get-started/`, `/client-portal/`, `/drivers/`, `/quote/`, `/thanks/`, `404.html` — kept; content tightened per the audit.

Locations (structure per §1.5)
- `/sacramento/` Sacramento, CA (North Highlands)
  - ★ `/sacramento/cross-docking/` · ★ `/sacramento/transloading/` · ★ `/sacramento/freight-consolidation/`
- `/reno/` Reno–Sparks, NV (keeps the Reno menu bar)
  - `/reno/cross-docking/` (was /reno/cross-dock/) · `/reno/pallet-storage/` = 3PL Warehousing & Pallet Storage Reno · `/reno/pickups-deliveries/` (was /reno/delivery/)
  - secondary, kept: `/reno/transloading/` (was /reno/transload/), `/reno/fulfillment/`, `/reno/fba-prep/`
- `/harrisburg/` Harrisburg, PA (Middletown) (was /middletown/)
  - ★ `/harrisburg/cross-docking/` · ★ `/harrisburg/freight-rework/` · ★ `/harrisburg/freight-consolidation/`

Redirects (netlify.toml, 301): /middletown/* → /harrisburg/*, /reno/cross-dock/* → /reno/cross-docking/, /reno/transload/* → /reno/transloading/,
/reno/delivery/* → /reno/pickups-deliveries/, plus the existing ones (/harrisburg/* → /middletown/ must be REMOVED, it would loop).
Also update `HASH` in build.py, `NAV_RENO`, the footer, `/locations/`, `/services/`, 404 and every internal link.

---------------------------------------------------------------------------------------------------
## 5. Fragment contract (so several people can write pages at once without touching build.py)

Each new page is a fragment in `site-src/pages/<name>.html` registered in build.py's page list. Fragments use the existing CSS classes
(`hero sm`, `s`, `s a`, `s nb`, `w`, `split`, `l`, `rows`, `cards`, `steps`, `reqs`, `facts3`, `intro`, `tag`, `crumb`, `ctas`, `btn r/o`,
`faq` with `<details><summary>`, `fine`) and the placeholders `{PHONE} {TEL} {SMS} {EMAIL} {PORTAL} {PORTAL_SIGNUP} {PROMISE} {PROMISE_FINE}
{HOURS} {AFTER} {WAIT_GOAL}` plus the feature blocks (`<!--feat KEY-->…<!--/feat-->`). New markers build.py expands (implemented by the framework work):

- `<!--img KEY-->` → a `<figure class="ph">` with `<picture>` (webp + jpg), width/height, lazy loading, alt from `MEDIA[KEY]`; renders nothing
  when the file is missing. `MEDIA` in build.py lists every slot: key → file, alt, ours (True = only Nick's own photo may fill it), where it is used.
  Hero slots use `<!--img KEY hero-->` (not lazy, fetchpriority high).
- `<!--facts LOC-->` → the facility facts strip for `sac` / `reno` / `pa` (doors, sq ft, pallet capacity, forklifts, hours, radius, address + directions).
- `<!--freight-->` → the "Built to Handle More Than Standard Pallets" section (one implementation, used on home, location pages and service pages).
- `<!--storage LOC-->` → the warehousing & storage block for a location (terms, floor/racked, capacity, billed weekly, quote button).
- `<!--pickups LOC-->` → the pickups & deliveries block for a location (radius, one-time/recurring, POD, quote button).
- `<!--specialties LOC-->` → the location's top specialties as cards with links to its specialty pages; `<!--also LOC-->` → the "everything else we do here" list.
- `<!--loclinks SVC-->` → "Cross-docking at each location" links (SVC = cross-docking | transloading | freight-consolidation | freight-rework | warehousing | pickups-deliveries).
- `<!--cta SVC LOC-->` → a quote button pre-filled with the service and location (`/quote/?loc=…&svc=…`), LOC optional.
- `<!--video KEY-->` inside a hero → the hero video (poster, muted, loop, playsinline, reduced-motion fallback, lazy src) when `assets/video/KEY.mp4` exists.

Service names in the quote form (`SVC` list in build.py) become: Cross-docking · Transloading / container unloading · Freight consolidation ·
Freight rework / restack · Pallet storage / warehousing · Third-party pickup or delivery · Fulfillment / FBA prep (Reno) · Not sure yet.
Old `?svc=` values map to the new names.

### 5.1 Fragment files and who writes them
Every page body is a fragment in `site-src/pages/`. The first two lines of a fragment carry its title and description:
`<!--title: Cross-Docking in Sacramento, CA | 24 HR Crossdock-->` and `<!--desc: 120-160 characters-->` (build.py reads and strips them).

| URL | fragment | written by |
|---|---|---|
| `/` | `hub.html` (rewrite in place) | content: home |
| `/services/` | `services.html` (new; the dock table comes from `<!--svctable-->`) | content: home |
| `/about/`, `/get-started/` | `_old_company.html`, `_old_get-started.html` (tighten in place) | content: home |
| `/cross-docking/` `/transloading/` `/freight-consolidation/` | `cross-docking.html` `transloading.html` `freight-consolidation.html` | content: company A |
| `/freight-rework/` `/warehousing/` `/pickups-deliveries/` | `freight-rework.html` `warehousing.html` `pickups-deliveries.html` | content: company B |
| `/sacramento/` + 3 | `loc-sac.html`, `sac-cross-docking.html`, `sac-transloading.html`, `sac-freight-consolidation.html` | content: Sacramento |
| `/harrisburg/` + 3 | `loc-pa.html`, `pa-cross-docking.html`, `pa-freight-rework.html`, `pa-freight-consolidation.html` | content: Harrisburg |
| `/reno/` + 4 | `loc-reno.html` (new, replaces reno_home() over `_old_warehousing.html`), `reno-cross-docking.html` (from `_old_cross-dock.html`), `reno-pallet-storage.html` (from `_old_pallet-storage-reno.html`), `reno-pickups-deliveries.html` (from `delivery.html`), `reno-transloading.html` (from `transload.html`) | content: Reno |
| `/reno/fulfillment/` `/reno/fba-prep/` | `_old_fulfillment.html`, `_old_fba-prep-reno.html` (links fixed only) | framework |
| `/client-portal/` `/drivers/` `/quote/` `/locations/` `/thanks/` 404 | as today (generated or `_old_*`), facts and links updated | framework |

build.py must not crash when a fragment is missing: it builds a stub page (H1 from the registry, one line) and prints `STUB: <file>`. The finish
step fails if any STUB remains. The old fragments that are replaced (`_old_warehousing.html`, `_old_cross-dock.html`, `_old_pallet-storage-reno.html`,
`delivery.html`, `transload.html`, `trailers.html`, `_old_sacramento.html`, `_old_middletown.html`, `_old_locations.html`) are deleted by the finish step once nothing uses them.

### 5.2 Markup the markers produce (the framework builds exactly this; the CSS styles exactly this)
- `<!--img KEY-->` → `<figure class="ph r32"><picture><source type="image/webp" srcset="/assets/img/KEY.webp"><img src="/assets/img/KEY.jpg" alt="…" width="2400" height="1600" loading="lazy" decoding="async"></picture></figure>`
  (`r32` 3:2 default; `<!--img KEY r169-->` 16:9, `r45` 4:5; the webp source only when the file exists; a `<figcaption>` when `MEDIA[KEY]['caption']` is set).
  Inside `<section class="hero …">`, `<!--img KEY hero-->` → `<img class="hv" src="/assets/img/KEY.jpg" alt="" aria-hidden="true" fetchpriority="high">` and the section gets class `hasv` (same overlay as the video).
- `<!--video KEY-->` (inside a hero) → `<video class="hv" muted loop playsinline preload="none" poster="/assets/video/KEY.jpg" data-src="/assets/video/KEY.mp4" aria-hidden="true"></video>` + class `hasv`; site.js attaches `src` and plays only when motion is allowed, the viewport is ≥ 700 px and `saveData` is off. When the mp4 is missing but the poster exists, the poster is used as a hero image; when neither exists, nothing.
- `<!--facts LOC-->` → `<section class="facts f7"><div class="w"><dl>` with seven `<div><dt>…</dt><dd>…</dd></div>`: doors · sq ft · pallet storage · forklifts (4,500 lb) · pickups & deliveries radius · hours (dd = after-hours line) · address (`<dt class="ad">`, dd = Get directions link) `</dl></div></section>`
- `<!--specialties LOC-->` → `<section class="s spec"><div class="w"><div class="intro rv"><h2>What {City} does best</h2><p>…</p></div><div class="cards three rv">` one `<article><span class="num">1</span><h3><a href="…">Cross-docking</a></h3><p>one line</p><p class="more"><a href="…">Cross-docking in {City} →</a></p></article>` per specialty (3 or 4) `</div></div></section>`
- `<!--also LOC-->` → `<section class="s a also"><div class="w split"><div class="l"><h2>Everything else we do in {City}</h2><p>…</p></div><ul class="rows">…</ul></div></section>` (every service in §3.1 that is not a specialty there, with its company page linked)
- `<!--freight-->` → `<section class="s freight"><div class="w"><div class="intro rv"><h2>Built to handle more than standard pallets</h2><p>…</p></div><div class="cards three rv">` six `<article><h3>Drums</h3><p>…</p></article>` `</div><p class="fine">Dry freight only…4,500 lb…call first…</p></div></section>` (+ `<!--img svc-freight-->` inside when present)
- `<!--storage LOC-->` → the existing `<section class="s store">` block (navy), with the capacity, the terms (daily, weekly, monthly, long-term), floor and racked, billed weekly, no minimums, a storage quote button and a link to `/warehousing/` (Reno: to `/reno/pallet-storage/`).
- `<!--pickups LOC-->` → `<section class="s pk"><div class="w split"><div class="l"><span class="tag">Pickups &amp; deliveries</span><h2>Pickups and deliveries within {radius} miles of {City}</h2><p>…</p><p class="ctas2"><a class="btn r" href="/quote/?…">Get a pickup or delivery quote</a><a class="btn o" href="/pickups-deliveries/">How it works</a></p></div><ul class="rows">One-time · Recurring · Windows confirmed first · Signed proof of delivery · Tied to cross-dock, storage, consolidation, rework</ul></div></section>`
- `<!--loclinks SVC-->` → `<section class="s a loclinks"><div class="w"><div class="intro rv"><h2>{Service} at each dock</h2><p>…</p></div><div class="loccards rv">` one `<article><span class="tag">{short}</span><h3>{City}, {ST}</h3><p class="lsub">{doors} dock doors · {sq ft}</p><p>{one specific line}</p><div class="lbtns"><a class="btn r" href="…">{Service} in {City}</a></div></article>` per location (links to the location's page for that service when it exists, else to the location home) `</div></div></section>`
- `<!--cta SVC LOC-->` → `<a class="btn r" href="/quote/?loc=…&amp;svc=…">Get a {service} quote</a>` (LOC optional); `<!--reach LOC-->` → the `facts3` drive-time block; `<!--drivers LOC-->` → driver_box(loc); `<!--manager LOC-->` → the "Talk to the {City} dock" section; `<!--svctable-->` → the services-by-dock table (all services at all docks; a ★ marks a specialty).
- Unknown or unexpanded markers fail the build (check()).

### 5.3 Fragment skeletons (keep pages short: 350–650 words of body copy; no two sibling pages may share more than a few sentences)
Location home (`loc-*.html`, §1.5 order): hero (`hero sm` is too small: use `<section class="hero">` with the two-column grid like the home page;
crumb, H1 with a `<span>` accent, 2-sentence sub, `<!--video LOC-->` + `<!--img loc-LOC-hero hero-->`, ctas) → `<!--facts LOC-->` → `<!--specialties LOC-->` →
`<!--also LOC-->` → `<!--freight-->` → `<!--storage LOC-->` → `<!--pickups LOC-->` → local section (`split`: "Why {City}" lanes, ports, who uses this dock + `<!--reach LOC-->`)
→ `<!--drivers LOC-->` → `<!--manager LOC-->`. The CTA band is added by page().
Location service page (`sac-*.html`, `pa-*.html`, `reno-*.html`): `hero sm` (crumb "{City} / {Service}", H1, sub with one local hook, ctas incl. `<!--cta SVC LOC-->`,
optional `<!--img KEY hero-->`) → `<!--facts LOC-->` → "How {service} works in {City}" (`split` + `rows` or `steps`, specific to the dock: doors, floor space,
what arrives there, typical turn) → "Why {City} for {service}" (`split`: lanes, ports, drive times with "about", who uses it) → FAQ (`<div class="faq">` with 3–5
`<details><summary>Q</summary><p>A</p></details>`, specific to this page) → related (`<!--loclinks SVC-->` + links to the location's other specialties).
Company-wide service page: `hero sm` (H1 = service, sub = at three docks) → "What it is / how it works" (`steps` 4–5) → who it is for (`who` grid) →
`<!--loclinks SVC-->` → `<!--freight-->` (cross-docking, warehousing and transloading pages only) → FAQ → quote CTA with `<!--cta SVC-->`.
Allowed classes: the existing ones listed in §5 plus `cards three`, `num`, `more`, `ctas2`, `ph`, `faq`. No inline styles beyond `style="margin-top:24px"` on a button paragraph.
Self-check before finishing a fragment: balanced tags (html.parser), exactly one `<h1>`, the title and desc comments present and within length, no words from §3.2,
links only to URLs in §4 (or `{TEL}`, `{SMS}`, `{PORTAL}`), every number traceable to §3.

---------------------------------------------------------------------------------------------------
## 6. Media (photos and video)

`site-src/assets/img/<key>.jpg` (+ optional `.webp`), 2400×1600 or 2400×1350, under 400 KB; portraits 1600×2000. Alt text is set in `MEDIA`, never
names a location unless `ours` is True. `site-src/assets/video/main.mp4` (+ `main.jpg` poster): 1920×1080, 10–20 s, H.264, no audio, under 5 MB,
seamless loop; optional per-location `reno.mp4`, `sac.mp4`, `pa.mp4`. Phones (< 700 px) and reduced-motion viewers get the poster only.
`site-src/MEDIA.md` is the media plan for Nick: every slot, the exact shot wanted, specs, and where to get it (his own phone at each dock, shot list;
or licensed stock: Pexels/Unsplash free commercial licenses with a check that the item is not AI-generated; Artgrid, Storyblocks, Adobe Stock for video).
The build prints `MEDIA: missing <n> files` with the list.

---------------------------------------------------------------------------------------------------
## 7. Motion (restrained)

Only under `@media (prefers-reduced-motion: no-preference)`: scroll reveal (`.rv`, exists) with a small stagger for cards; hero text fade-up on load;
images in `.ph` zoom 1.00→1.04 on hover (600 ms); cards lift 2 px with a soft shadow on hover; nav link underline slides in; buttons ease;
`scroll-behavior: smooth` for in-page anchors. No parallax, no libraries, no animation over 700 ms, nothing that moves text while someone reads.

---------------------------------------------------------------------------------------------------
## 8. SEO

Per page: unique title and description, one H1, logical H2/H3, canonical, OG tags (exist), BreadcrumbList (exists), FAQPage from `.faq` (exists).
Location pages: LocalBusiness + Warehouse with address, geo (approx.), openingHours, areaServed (GeoCircle with the radius). Service pages: `Service`
schema (serviceType, provider = Organization, areaServed = the locations). Internal links: every company service page ↔ its location pages; each
location page ↔ its specialty pages and the other two locations; `/services/` links everything. Image alt text from `MEDIA`. Sitemap and robots
regenerate. No keyword stuffing: each target phrase appears naturally in the title, H1 or first paragraph, not repeated.

---------------------------------------------------------------------------------------------------
## 9. Quality bar before the preview is updated

`python3 site-src/build.py` passes · every internal link resolves to a built file (link checker) · no `#/` links · every page screenshot at 390 and
1400 px with no horizontal overflow · reduced-motion renders without the video · JSON-LD parses · sitemap lists every page · redirects cover every
renamed URL · quote forms still `data-netlify` with the honeypot · portal links open in a new tab · contrast ≥ 4.5:1 for text · tap targets ≥ 44 px
on phones · the site reads correctly in light and dark themes.
