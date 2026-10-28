# 24 HR Crossdock website (multi-location)

The live site is built from this folder into `../site/`, and Netlify publishes `site/` (see `netlify.toml`).
The plan and the facts for the Oct 28 2026 premium upgrade are in `PLAN-premium.md`; `DECISIONS.md` has Nick's answers.

    python3 site-src/build.py        # rebuild site/ (fails if a page breaks a rule below)
    python3 site-src/make_preview.py site /tmp/preview   # copy with relative links, for a claude.ai preview
                                                         # (also writes /tmp/preview_files.json, the file list for publishing)

## Pages (real URLs)
- `/` is the main page: cross-docking first, built for freight brokers, call-first, with a dock picker.
- `/services/` is the hub for the six company-wide service pages: `/cross-docking/`, `/transloading/`, `/freight-consolidation/`,
  `/freight-rework/`, `/warehousing/`, `/pickups-deliveries/`. It also has the services-by-dock table (★ specialty, ✓ offered).
- `/reno/` is the Reno–Sparks home. **Put this URL on the Reno Google Maps listing.** Its pages: `/reno/cross-docking/`, `/reno/pallet-storage/`
  (3PL warehousing and pallet storage), `/reno/pickups-deliveries/`, `/reno/transloading/`, and the secondary `/reno/fulfillment/`, `/reno/fba-prep/`.
- `/sacramento/` is Sacramento, CA (North Highlands). **Use it on that Google Maps listing.** Pages: `/sacramento/cross-docking/`,
  `/sacramento/transloading/`, `/sacramento/freight-consolidation/`.
- `/harrisburg/` is Harrisburg, PA (Middletown). **Use it on that Google Maps listing.** Pages: `/harrisburg/cross-docking/`,
  `/harrisburg/freight-rework/`, `/harrisburg/freight-consolidation/`.
- `/locations/`, `/about/`, `/get-started/`, `/client-portal/` (was `/technology/`), `/quote/` (`?loc=` and `?svc=` pre-fill it), `/thanks/` and `404.html`.
- `/drivers/` is the driver check-in page in six languages (English, Español, Русский, Українська, ਪੰਜਾਬੀ, हिन्दी). `/drivers/#es` opens it in Spanish (codes: en, es, ru, uk, pa, hi). Each dock page also has a driver box with the address, hours and check-in steps.
- Renamed URLs redirect (301, `netlify.toml`): `/middletown/*` → `/harrisburg/*`, `/reno/cross-dock/` → `/reno/cross-docking/`,
  `/reno/transload/` → `/reno/transloading/`, `/reno/delivery/` → `/reno/pickups-deliveries/`, plus `/technology/`, `/sparks/`, `/north-highlands/`, `/reno/trailers/`.
  Old links inside page files are rewritten by the build too.

Reno pages use the Reno menu (Storage · Cross-Docking · Pickups & Deliveries · Transloading · Fulfillment · Locations) and a Reno bar at the top.
Every page has its own title, description, canonical link, Open Graph tags and schema: LocalBusiness + Warehouse with geo and a service-area circle
(150 / 100 / 150 miles) on dock pages, a Service schema on every service page, BreadcrumbList everywhere, FAQPage from the page's own FAQ.
`/thanks/` and the 404 page are `noindex`. `sitemap.xml` and `robots.txt` are generated.

## Quote forms
Every form is the same two-step form: name, phone, location and service, then an optional "Add details" step. They are Netlify Forms (`data-netlify`). In Netlify, go to Forms, then Notifications, and add the office email, plus a text-to-phone address for Nick (his carrier's email-to-text address, for example number@vtext.com). Spam is caught by a honeypot field. Outside the live domain (for example a preview), the form opens an email instead and shows a note saying so. When `GA_ID` is set, calls, texts, portal clicks and quote requests are counted as events.
- Location options: Reno–Sparks, NV · Sacramento (North Highlands), CA · Harrisburg (Middletown), PA · Not sure.
- Service options (`SVC`): Cross-docking · Transloading / container unloading · Freight consolidation · Freight rework / restack ·
  Pallet storage / warehousing · Third-party pickup or delivery · Fulfillment / FBA prep (Reno) · Not sure yet.
- Old `?loc=` / `?svc=` values (Sparks, NV · Middletown, PA · Cross-dock · Long-term pallet storage · Delivery …) still pre-select the right option:
  the build rewrites them in page links (`LOC_ALIAS`, `SVC_ALIAS`), and `site.js` maps them for links from outside the site.

## Switches in build.py
- `LIVE`: one switch per portal feature: `'live'` (shown as working), `'soon'` (shown with a "Coming soon" badge) or `'off'` (hidden). The site never promises what customers can't use yet; flip a switch when the portal feature really works. See `DECISIONS.md` for the starting values.
- `PROMISE` and `PROMISE_FINE`: the 2-hour unload promise and its fine print ("During dock hours, Mon–Fri 6am–10pm."). `WAIT_GOAL` is the minutes before the "waiting" alert.
- `HOURS` and `AFTER`: "Mon–Fri 6am–10pm" and "nights and weekends by appointment; after-hours work carries a $100 fee" (D6).
- `LOC`: the facts for each dock (address, doors, square feet, pallet capacity, forklifts, pickup radius, approximate coordinates). `SPEC`: each dock's specialties in order.
- `PORTAL` and `PORTAL_SIGNUP`: the client portal link, and the "Open an account" link (`#signup`). Every portal link opens in a new tab.
- `KIOSK_DOCKS`: the docks with a check-in kiosk tablet.
- `BOOK`: Google Calendar booking-page link. "Book a call" buttons appear once it's filled in.
- `GA_ID`: Google Analytics 4 ID. Tracking turns on once it's filled in.
- `TESTIMONIALS`: real customer quotes (with their OK) for the home page.
- `MANAGERS`: site manager name, title, phone, email and photo. While a name is empty, dock pages show a one-line "Talk to the … dock" contact strip instead of a card.
- `MEDIA` and `VIDEO`: every photo and video slot (see "Photos and video").
- Customer logos: drop PNG or SVG files in `assets/logos/` (with each customer's OK). A "Trusted by" row appears on the home page.

## Page content
- Every page body is a fragment in `pages/` (the table in `PLAN-premium.md` §5.1 says which). The first two lines carry the title and description:
  `<!--title: Cross-Docking in Sacramento, CA | 24 HR Crossdock-->` and `<!--desc: 120–160 characters-->`. The build reads and strips them;
  without them it uses the fallback title in the page list (`REG` in build.py). A missing fragment builds a stub page and prints `STUB: <file>`.
- `pages/_old_*.html` are older sections still in use (`_old_company`, `_old_get-started`, `_old_technology` for the client portal page,
  `_old_quote`, `_old_fulfillment`, `_old_fba-prep-reno`). `/locations/`, `/drivers/` and `/thanks/` are generated in build.py.
  No longer used (can be deleted): `_old_warehousing`, `_old_cross-dock`, `_old_pallet-storage-reno`, `_old_sacramento`, `_old_middletown`,
  `_old_locations`, `_old_footer`, `delivery.html`, `transload.html`, `trailers.html`.
- `drivers_text.py` holds the `/drivers/` words in six languages (kiosk lines copied from the dock app prototype, plus a few new lines).
- In the page files you can write `{PHONE}`, `{TEL}`, `{SMS}`, `{EMAIL}`, `{PORTAL}`, `{PORTAL_SIGNUP}`, `{PROMISE}`, `{PROMISE_FINE}`, `{HOURS}`, `{AFTER}` and `{WAIT_GOAL}`; the build fills them in.
- Feature blocks follow the `LIVE` switches: `<!--feat alerts-->shown when live<!--if-soon-->shown when soon<!--if-off-->shown when off<!--/feat-->`. Put `<!--badge-->` where the "Coming soon" badge goes. A plain `<!--if securement-->6<!--else-->5<!--/if-->` is for small bits like a step number.
- A note for editors in a page file needs a space after `<!--` (`<!-- like this -->`); the build removes it. `<!--word…-->` without a space is a marker.

## Markers (shared blocks, so each fact lives in one place)
LOC is `reno`, `sac` or `pa`. SVC is `cross-docking`, `transloading`, `freight-consolidation`, `freight-rework`, `warehousing` or `pickups-deliveries`.
- `<!--img KEY-->` a photo from `MEDIA` (`<figure class="ph r32">`, lazy, width/height from the file); add `r169` (16:9) or `r45` (4:5).
  Inside a `<section class="hero …">`, `<!--img KEY hero-->` puts the photo behind the headline. Nothing shows until the file exists.
- `<!--video KEY-->` inside a hero: the hero video (`main`, `reno`, `sac`, `pa`); its poster still when there is no mp4; nothing when neither exists.
  When a hero has both a video and a photo marker, the first one that has a file wins.
- `<!--facts LOC-->` the facility facts strip: doors, square feet, pallet capacity, forklifts, pickup radius, hours and after-hours line, address.
- `<!--specialties LOC-->` the dock's specialties as numbered cards linking to its specialty pages. `<!--also LOC-->` everything else offered there.
- `<!--freight-->` "Built to handle more than standard pallets" (six freight types and the dry-freight, 4,500 lb, call-first line).
- `<!--storage LOC-->` the navy pallet storage band. `<!--pickups LOC-->` pickups and deliveries within the dock's radius.
- `<!--loclinks SVC-->` the service at each dock, with a button to that dock's page for it (or the dock home).
- `<!--cta SVC LOC-->` a "Get a … quote" button pre-filled with service and location (LOC optional; on a dock page it defaults to that dock).
- `<!--reach LOC-->` the drive-time tiles (the page adds its own "approximate" line). `<!--drivers LOC-->` the driver box.
  `<!--manager LOC-->` the dock contact (card or one line, see `MANAGERS`). `<!--svctable-->` the services-by-dock table (table only; wrap it in a section).
- The markup each marker produces is in `PLAN-premium.md` §5.2; `assets/site.css` styles exactly that.

## Photos and video
`MEDIA.md` is the media plan for Nick, written on every build: each slot, the exact shot, "your own photo only" or "stock OK", the file name,
the specs, a 10-shot phone list per dock and where to get licensed stock. Photos go in `assets/img/<key>.jpg` (+ optional `.webp`);
hero videos in `assets/video/<key>.mp4` with a `<key>.jpg` poster. The build prints `MEDIA: n of m slots have files` and the missing names.
Slots marked ours (location pages) take Nick's own photos only; alt text never names a location on a stock slot (the build checks).
The hero video loads only after the page has loaded, on screens 700 px and wider, with motion allowed and Data Saver off; everyone else sees the poster.

## Checks the build runs
The build stops with `PROBLEM:` lines if: a portal link lacks `target="_blank" rel="noopener"`; a marker or `<!--title:` line is left in a page;
a new fragment has no title line; a page doesn't have exactly one `<h1>`; JSON-LD doesn't parse; an internal link, image or in-page `#anchor`
doesn't resolve; a quote link's `loc`/`svc` matches no form option; a page from the list is missing from the sitemap; a page says texts or emails
are sent while `alerts` is not live (this also checks the other five languages on `/drivers/`); or visible text, a title or a description uses a
banned word from `PLAN-premium.md` §3.2 (real-time, guaranteed outside the promise line, largest, #1, 30,000, 66 or 50 doors, lorem, "anywhere"
next to delivery). It prints `LEFTOVER HASH LINKS` if an old `#/` link survives, `STUB:` for missing fragments, and `NOTE:` for titles over
65 characters or descriptions outside 120–160.

## Facts used (from Nick; `PLAN-premium.md` §3 is the source)
- **Reno–Sparks, NV:** 1095 Spice Islands Dr, Suites 105–106, Sparks 89431. 40,000 sq ft, 8 dock doors, 1,000–3,000 pallets, forklifts rated to 4,500 lb,
  pickups and deliveries within 100 miles. Specialties: cross-docking · 3PL warehousing & pallet storage · third-party pickups & deliveries · contract warehousing.
  Also fulfillment and FBA prep (secondary, Reno only).
- **Sacramento, CA (North Highlands):** 3036 Orange Grove Ave, 95660. 40,000 sq ft, 8 dock doors, 500–1,000 pallets, 4,500 lb forklifts, within 150 miles.
  Specialties: cross-docking · freight consolidation · transloading · freight rework.
- **Harrisburg, PA (Middletown):** 2811 Turnpike Industrial Dr, 17057. 25,000 sq ft, 30 dock doors, about 500 pallets, 4,500 lb forklifts, within 150 miles.
  Specialties: cross-docking · freight rework · freight consolidation.
- Every core service at every dock: cross-docking, transloading, consolidation, rework, warehousing / pallet storage, pickups & deliveries.
- **Hours:** docks Mon–Fri 6am–10pm. Nights and weekends by appointment; after-hours work carries a $100 fee. The phone is answered 24/7.
- **Since 2015. Fully insured. No minimums. Dry freight only (no temperature control). Quote call-back within 1 hour.** No certifications claimed.
- **Totals:** 3 locations, 46 dock doors, 105,000 sq ft. Pallet capacity is never totalled; monthly pallet volume is not stated (D2).
- **Site managers:** fill in `MANAGERS` in `build.py` (name, title, phone, email and photo in `assets/team/`).

## To confirm with Nick
- Does the $100 after-hours fee also apply to weekend appointments (D6)?
- Monthly pallet volume: only if it is 24 HR Crossdock's own volume (D2). Until then it stays off the site.
- Approximate coordinates in `LOC` (schema only): check them on Google Maps.

## Phone header
On screens up to 900px wide, scrolling down slides the logo and Sign In row away and keeps the menu row. Scrolling up brings it back.
The bottom "Call 24/7" bar shows on phones (up to 700px); wider screens have the call button in the header.
