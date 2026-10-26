# Website decisions (Nick, Oct 22 2026)

## Big picture
- #1 customer: freight brokers. Big and small accounts both. No minimums. No freight refused (dry only, no temp control).
- Main action: CALL. Nick answers 916-616-3481, 24/7. Promise: quote reply within 1 hour.
- Feel: big national operator. Headline pushes size and reach (3 docks, 66 doors, 30,000+ pallets/mo).
- Why us: speed, flexibility, price. Prices: "call for quote".
- Hours: Mon–Fri 6am–10pm; nights and weekends by appointment ($100 fee 10pm–6am). Phone line 24/7.
- In business since 2015. "Fully insured" (no amount). Certifications: none yet; Claude picks the order.

## Docks
- Reno: main earner cross-dock. Flexible 3PL. Fulfillment/FBA stays Reno-only for now.
- Sacramento: main earner cross-dock.
- Middletown (menu: "Harrisburg PA"): main earner restacking / rework.
- Long-term pallet storage: push hard at all three.
- Growth plans (sq ft): PRIVATE, remove from site.
- Managers: name + photo on each location page (still need names/photos).
- One phone/email for all docks for now; split later.

## Services
- Reno pages: keep storage, cross-dock, fulfillment, FBA, transload, delivery. DROP trailers.
- Delivery: our own trucks, anywhere.
- Containers: floor-loaded and palletized. Storage: floor and racked.
- Extras: shrink wrap, labeling, restack/rework.

## Layout
- Menu: both locations and services. Names: Reno NV, Sacramento CA, Harrisburg PA.
- Bottom bar: just a Call button. Sign in stays in header.
- About: company story + facts, no owner name/photo. Technology page renamed "Client portal", short.
- Quote form: combo (4 quick fields, then optional details). Leads to Gmail + text to Nick's phone.
- Add: text-us button, book-a-call link.

## Proof and look
- Google reviews: 10–50 across 3 docks; show them now. Nick can get 3 customer quotes. Customer logos: yes, with permission.
- Style: bold modern, professional. New colors. Logo: show options.
- Photos/video: clean 5-star warehouse stock now (not labeled as our docks), swap in our own later.

## Going live
- Domain at Google/Squarespace. Old site builder unknown. Google Business Profiles: unknown.
- Go-live target: Nov 1, 2026. Google Ads: $2,500/mo in Reno. Analytics + call tracking: yes.
- Directories: Thomasnet and Warehousing Exchange already signed up.
- Business email on 24hrcrossdock.com: yes (Google Workspace).

## Portal features on the website (Oct 26 2026)
- The site describes the new dock features (2-hour promise, kiosk check-in, damage photos, securement check, alerts, Friday report, driver ETA link). Pages: `/client-portal/` (rebuilt), new `/drivers/` (6 languages), home, cross-dock, get-started, about, locations and a driver box on each dock page.
- Rule: the site never promises what customers can't use yet. Each feature has a switch in `LIVE` in `build.py`: `'live'` (shown as working), `'soon'` (shown with a "Coming soon" badge) or `'off'` (hidden). Flip it and rebuild when the portal feature really works.
- Starting switches:
  - live: 2-hour unload promise (Nick approved), booking any day and time, load details, damage photos and approvals, securement check with photos, kiosk check-in in 6 languages.
  - soon: anything that needs real texts or emails (customer alerts, the door-number text to drivers, the Friday email), customers watching their trucks live in the portal, the driver ETA link, auto-approve under $X, "our gear with you" in the portal.
  - The build fails if a page says texts or emails go out while `alerts` is not live, or if a "soon" feature is shown without its badge.
- The "live" switches assume the new portal release (kiosk, damage photos, securement check) is live for customers. If the website goes up before that release, set `kiosk` and `securement` to `'soon'` first.
- 2-hour promise wording: "Unloaded within 2 hours of check-in", always with the fine print "During dock hours, Mon–Fri 6am–10pm." (`PROMISE`, `PROMISE_FINE`). Still open for Nick: any exceptions (floor-loaded containers, after-hours trucks)? If yes, add them to `PROMISE_FINE`.
- Securement plan price stays off the website: "Call for a quote." (The $2,000 per 6 months price is only in the customer portal.)
- "Open an account" goes to the portal's sign-up screen (`PORTAL#signup`). Check on the staging link that `#signup` survives inside claude.ai; if it doesn't, set `PORTAL_SIGNUP = PORTAL`.
- Every portal link opens in a new tab (`target="_blank" rel="noopener"`), so the website stays open behind it.
- Mockups (truck card, Friday report) are labelled "Example" and use made-up trucks and numbers. No invented reviews or quotes.
- Driver page words: the kiosk lines are copied from the dock app prototype so drivers see the same words on the website and on the kiosk. A few lines were written new for the website (`NEW` in `drivers_text.py`). **Ukrainian, Punjabi and Hindi need a native speaker to check them** (and the new lines in Spanish and Russian too) before Nick relies on them.
- Kiosk at each dock: `KIOSK_DOCKS` lists the docks with a check-in tablet (all three for now). Take a dock out if it has no tablet; its page then says "check in at the office".
- Honesty fixes on older text: the Reno page no longer says reports are "sent automatically" or that the portal updates "in real time", and the cross-dock page now says "OS&D and damage reports the same day" instead of "in real time" (nothing is emailed automatically yet, and customers don't see live dock updates yet).
- Nick asked for a short client portal page. It is longer now because it carries the new features, but every section is a few lines and the FAQ is collapsed.
