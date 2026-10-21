# 24 HR Crossdock website (multi-location)

The live site is built from this folder into `../site/`, and Netlify publishes `site/` (see `netlify.toml`).

    python3 site-src/build.py        # rebuild site/
    python3 site-src/make_preview.py site /tmp/preview   # copy with relative links, for a claude.ai preview

## Pages (real URLs)
- `/` is the main page with a location picker.
- `/reno/` is the Reno–Sparks home. **Put this URL on the Reno Google Maps listing.** Its service pages are `/reno/pallet-storage/`, `/reno/cross-dock/`, `/reno/fulfillment/`, `/reno/fba-prep/`, `/reno/transload/`, `/reno/delivery/` and `/reno/trailers/`.
- `/sacramento/` is North Highlands, CA. **Use it on that Google Maps listing.**
- `/middletown/` is Middletown, PA. **Use it on that Google Maps listing.**
- `/locations/`, `/technology/`, `/about/`, `/get-started/`, `/quote/` (`?loc=` and `?svc=` pre-fill it), `/thanks/` and `404.html`.

Reno pages use the Reno menu and a Reno bar at the top. Every page has its own title, description, canonical link and LocalBusiness or Organization schema. `sitemap.xml` and `robots.txt` are generated.

## Quote forms
These are Netlify Forms (`data-netlify`). In Netlify, go to Forms, then Notifications, and add the office email. Spam is caught by a honeypot field. Outside the live domain (for example a preview), the form opens an email instead.

## Page content
- `pages/_old_*.html` are the sections from the earlier single-page site.
- `hub.html`, `transload.html`, `delivery.html` and `trailers.html` are new.
- Edit these, then rebuild.

## Facts used (from Nick)
- **Sparks, NV:** 1095 Spice Islands Dr, Suites 105–106, 89431. 40,000 sq ft, 8 doors. Our most flexible 3PL: storage, cross-dock, transload, fulfillment, FBA prep, delivery and trailers.
- **North Highlands, CA:** 3036 Orange Grove Ave, 95660. 40,000 sq ft, 8 doors. Cross-dock, transload and pallet storage (short and long term). Growing to about 100,000 sq ft in about 2 years.
- **Middletown, PA:** 2811 Turnpike Industrial Dr, 17057. 25,000 sq ft, 50 doors. Cross-dock, transload, pallet storage and order staging. Growing to 50,000–60,000 sq ft in about 2 years.
- **Hours:** 6am–10pm at every dock. 10pm–6am is by appointment with a $100 after-hours fee.
- **Totals:** 105,000 sq ft and 66 doors.
- **Site managers:** fill in `MANAGERS` in `build.py` (name, title, phone, email and photo in `assets/team/`).

## To confirm
- Street suffix and zip: "Orange Grove **Ave**, 95660" and "Turnpike Industrial **Dr**, 17057".
- Hours: every day, or Mon–Fri? There are no opening hours in the schema until this is confirmed.
- Pallet volume: Nick says about 30–35k a month across all docks, NVK included. The site says "30,000+".

## Phone header
On screens up to 900px wide, scrolling down slides the logo and Sign In row away and keeps the menu row. Scrolling up brings it back.

## Hero videos
Put silent, looping MP4s in `assets/video/`: `main.mp4` (main page), `reno.mp4`, `sac.mp4`, `pa.mp4`. Add a matching `.jpg` still for each. Then rebuild. Keep each one 10–20 seconds, 1920x1080, under 5 MB, with no audio. Pages with no video of their own use `main.mp4`.
