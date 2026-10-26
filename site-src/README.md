# 24 HR Crossdock website (multi-location)

The live site is built from this folder into `../site/`, and Netlify publishes `site/` (see `netlify.toml`).

    python3 site-src/build.py        # rebuild site/ (fails if a page breaks a rule below)
    python3 site-src/make_preview.py site /tmp/preview   # copy with relative links, for a claude.ai preview
                                                         # (also writes /tmp/preview_files.json, the file list for publishing)

## Pages (real URLs)
- `/` is the main page: built for freight brokers, call-first, with a location picker.
- `/reno/` is the Reno–Sparks home. **Put this URL on the Reno Google Maps listing.** Its service pages are `/reno/pallet-storage/`, `/reno/cross-dock/`, `/reno/fulfillment/`, `/reno/fba-prep/`, `/reno/transload/`, `/reno/delivery/`. (Trailers page dropped; `/reno/trailers/` redirects to `/reno/`.)
- `/sacramento/` is North Highlands, CA. **Use it on that Google Maps listing.**
- `/middletown/` is Middletown, PA. **Use it on that Google Maps listing.**
- `/services/` (which dock does what), `/client-portal/` (was `/technology/`, which redirects), `/locations/`, `/about/`, `/get-started/`, `/quote/` (`?loc=` and `?svc=` pre-fill it), `/thanks/` and `404.html`.
- `/drivers/` is the driver check-in page in six languages (English, Español, Русский, Українська, ਪੰਜਾਬੀ, हिन्दी). `/drivers/#es` opens it in Spanish (codes: en, es, ru, uk, pa, hi). Each dock page also has a driver box with the address, hours and check-in steps.

Reno pages use the Reno menu and a Reno bar at the top. Every page has its own title, description, canonical link and LocalBusiness or Organization schema. `sitemap.xml` and `robots.txt` are generated.

## Quote forms
Every form is the same two-step form: name, phone, location and service, then an optional "Add details" step. They are Netlify Forms (`data-netlify`). In Netlify, go to Forms, then Notifications, and add the office email, plus a text-to-phone address for Nick (his carrier's email-to-text address, for example number@vtext.com). Spam is caught by a honeypot field. Outside the live domain (for example a preview), the form opens an email instead and shows a note saying so. When `GA_ID` is set, calls, texts, portal clicks and quote requests are counted as events.

## Switches in build.py
- `LIVE`: one switch per portal feature: `'live'` (shown as working), `'soon'` (shown with a "Coming soon" badge) or `'off'` (hidden). The site never promises what customers can't use yet; flip a switch when the portal feature really works. See `DECISIONS.md` for the starting values.
- `PROMISE` and `PROMISE_FINE`: the 2-hour unload promise and its fine print ("During dock hours, Mon–Fri 6am–10pm."). `WAIT_GOAL` is the minutes before the "waiting" alert.
- `PORTAL` and `PORTAL_SIGNUP`: the client portal link, and the "Open an account" link (`#signup`). Every portal link opens in a new tab.
- `KIOSK_DOCKS`: the docks with a check-in kiosk tablet.
- `BOOK`: Google Calendar booking-page link. "Book a call" buttons appear once it's filled in.
- `GA_ID`: Google Analytics 4 ID. Tracking turns on once it's filled in.
- `TESTIMONIALS`: real customer quotes (with their OK) for the home page.
- `MANAGERS`: site manager name, title, phone, email and photo.
- Customer logos: drop PNG or SVG files in `assets/logos/` (with each customer's OK). A "Trusted by" row appears on the home page.

## Page content
- `pages/_old_*.html` are the sections from the earlier single-page site. The client portal page is `_old_technology.html` (old file name kept).
- `hub.html` (main page), `transload.html` and `delivery.html` are newer. `trailers.html` is no longer used (the trailers page was dropped).
- `drivers_text.py` holds the `/drivers/` words in six languages (kiosk lines copied from the dock app prototype, plus a few new lines).
- In the page files you can write `{PHONE}`, `{TEL}`, `{SMS}`, `{EMAIL}`, `{PORTAL}`, `{PORTAL_SIGNUP}`, `{PROMISE}`, `{PROMISE_FINE}`, `{HOURS}`, `{AFTER}` and `{WAIT_GOAL}`; the build fills them in.
- Feature blocks follow the `LIVE` switches: `<!--feat alerts-->shown when live<!--if-soon-->shown when soon<!--if-off-->shown when off<!--/feat-->`. Put `<!--badge-->` where the "Coming soon" badge goes. A plain `<!--if securement-->6<!--else-->5<!--/if-->` is for small bits like a step number.
- Edit these, then rebuild.

## Checks the build runs
The build stops with `PROBLEM:` lines if a portal link lacks `target="_blank" rel="noopener"`, a template marker is left in a page, `/drivers/` is missing from the sitemap, or a page says texts or emails are sent while `alerts` is not live (this also checks the other five languages on `/drivers/`). It also prints `LEFTOVER HASH LINKS` if an old `#/` link survives.

## Facts used (from Nick)
- **Sparks, NV:** 1095 Spice Islands Dr, Suites 105–106, 89431. 40,000 sq ft, 8 doors. Main business cross-dock. Our most flexible 3PL: storage, cross-dock, transload, fulfillment, FBA prep and delivery on our own trucks (anywhere).
- **North Highlands, CA:** 3036 Orange Grove Ave, 95660. 40,000 sq ft, 8 doors. Main business cross-dock. Also long-term pallet storage, transload, restack and rework. (Growth plans stay off the site.)
- **Middletown, PA:** 2811 Turnpike Industrial Dr, 17057. 25,000 sq ft, 50 doors. Main business restacking and rework. Also cross-dock, long-term storage, transload and order staging. (Growth plans stay off the site.)
- **Hours:** Mon–Fri 6am–10pm at every dock. Saturday, Sunday and 10pm–6am by appointment ($100 fee for 10pm–6am). The phone is answered 24/7. Confirmed by Nick.
- **Since 2015. Fully insured. No minimums. Dry freight only. Quote call-back within 1 hour.** See `DECISIONS.md` for all of Nick's audit answers.
- **Totals:** 105,000 sq ft and 66 doors.
- **Site managers:** fill in `MANAGERS` in `build.py` (name, title, phone, email and photo in `assets/team/`).

## To confirm
- Pallet volume: Nick says about 30–35k a month across all docks, NVK included. The site says "30,000+".

## Phone header
On screens up to 900px wide, scrolling down slides the logo and Sign In row away and keeps the menu row. Scrolling up brings it back.

## Hero videos
Put silent, looping MP4s in `assets/video/`: `main.mp4` (main page), `reno.mp4`, `sac.mp4`, `pa.mp4`. Add a matching `.jpg` still for each. Then rebuild. Keep each one 10–20 seconds, 1920x1080, under 5 MB, with no audio. Pages with no video of their own use `main.mp4`.
