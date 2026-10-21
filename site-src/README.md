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

## To confirm
- Street addresses for North Highlands and Middletown.
- Services at each dock.
- Hours, given the "24 HR" name.
- Figures: "400+ accounts", "3,000+ pallets/month", Extensiv WMS, EDI.
