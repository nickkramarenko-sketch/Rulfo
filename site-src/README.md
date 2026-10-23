# 24 HR Crossdock website (multi-location)

The live site is built from this folder into `../site/`, and Netlify publishes `site/` (see `netlify.toml`).

    python3 site-src/build.py        # rebuild site/
    python3 site-src/make_preview.py site /tmp/preview   # copy with relative links, for a claude.ai preview

## Pages (real URLs)
- `/` is the main page: built for freight brokers, call-first, with a location picker.
- `/reno/` is the Reno–Sparks home. **Put this URL on the Reno Google Maps listing.** Its service pages are `/reno/pallet-storage/`, `/reno/cross-dock/`, `/reno/fulfillment/`, `/reno/fba-prep/`, `/reno/transload/`, `/reno/delivery/`. (Trailers page dropped; `/reno/trailers/` redirects to `/reno/`.)
- `/sacramento/` is North Highlands, CA. **Use it on that Google Maps listing.**
- `/middletown/` is Middletown, PA. **Use it on that Google Maps listing.**
- `/services/` (which dock does what), `/client-portal/` (was `/technology/`, which redirects), `/locations/`, `/about/`, `/get-started/`, `/quote/` (`?loc=` and `?svc=` pre-fill it), `/thanks/` and `404.html`.

Reno pages use the Reno menu and a Reno bar at the top. Every page has its own title, description, canonical link and LocalBusiness or Organization schema. `sitemap.xml` and `robots.txt` are generated.

## Quote forms
Every form is the same two-step form: name, phone, location and service, then an optional "Add details" step. They are Netlify Forms (`data-netlify`). In Netlify, go to Forms, then Notifications, and add the office email, plus a text-to-phone address for Nick (his carrier's email-to-text address, for example number@vtext.com). Spam is caught by a honeypot field. Outside the live domain (for example a preview), the form opens an email instead.

## Switches in build.py
- `BOOK`: Google Calendar booking-page link. "Book a call" buttons appear once it's filled in.
- `GA_ID`: Google Analytics 4 ID. Tracking turns on once it's filled in.
- `TESTIMONIALS`: real customer quotes (with their OK) for the home page.
- `MANAGERS`: site manager name, title, phone, email and photo.
- Customer logos: drop PNG or SVG files in `assets/logos/` (with each customer's OK). A "Trusted by" row appears on the home page.

## Page content
- `pages/_old_*.html` are the sections from the earlier single-page site.
- `hub.html`, `transload.html`, `delivery.html` and `trailers.html` are new.
- Edit these, then rebuild.

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
