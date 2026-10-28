# Website decisions (Nick, Oct 22 2026)

## Big picture
- #1 customer: freight brokers. Big and small accounts both. No minimums. No freight refused (dry only, no temp control).
- Main action: CALL. Nick answers 916-616-3481, 24/7. Promise: quote reply within 1 hour.
- Feel: big national operator. Headline pushes reach and facts we are sure of (3 docks, 46 dock doors, 105,000 sq ft, since 2015). (Was 66 doors and 30,000+ pallets/mo; changed Oct 28 2026, see D1, D2.)
- Why us: speed, flexibility, price. Prices: "call for quote".
- Hours: Mon–Fri 6am–10pm; nights and weekends by appointment; after-hours work carries a $100 fee (D6; weekend fee to confirm). Phone line 24/7.
- In business since 2015. "Fully insured" (no amount). Certifications: none yet; Claude picks the order.

## Docks
- Reno–Sparks: cross-docking first; 3PL warehousing and pallet storage (1,000–3,000 pallets), pickups and deliveries within 100 miles, contract warehousing. 8 doors, 40,000 sq ft. Fulfillment/FBA stays Reno-only, secondary (D7).
- Sacramento (North Highlands): cross-docking, freight consolidation, transloading, freight rework. 8 doors, 40,000 sq ft, 500–1,000 pallets, within 150 miles.
- Harrisburg (Middletown; URL /harrisburg/): cross-docking, freight rework, freight consolidation. 30 doors, 25,000 sq ft, about 500 pallets, within 150 miles.
- Long-term pallet storage: push hard at all three.
- Growth plans (sq ft): PRIVATE, remove from site.
- Managers: name + photo on each location page (still need names/photos).
- One phone/email for all docks for now; split later.

## Services
- Reno pages: storage (/reno/pallet-storage/), cross-docking, pickups & deliveries, transloading, fulfillment, FBA prep. Trailers dropped.
- Pickups and deliveries: our own trucks, at all three docks, within 150 / 100 / 150 miles (Sacramento / Reno / Harrisburg) (D5).
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

## Premium upgrade (Oct 28 2026)
Full plan, facts and page map: `PLAN-premium.md`. Nick can veto any of these.
- D1. Dock doors: 46 total (Sacramento 8, Reno 8, Harrisburg 30; Harrisburg was 50). Square feet stay 40,000 / 40,000 / 25,000 = 105,000.
- D2. "30,000+ pallets a month" is off the site until Nick confirms it is 24 HR Crossdock's own volume (the earlier note said NVK included).
- D3. Harrisburg URL is `/harrisburg/` (was `/middletown/`, which now redirects). Pages say "Harrisburg, PA (Middletown)".
- D4. Reno service URLs renamed: `/reno/cross-docking/`, `/reno/transloading/`, `/reno/pickups-deliveries/` (old ones redirect). `/reno/pallet-storage/` stays.
- D5. Pickups and deliveries use Nick's radius (150 / 100 / 150 miles) instead of "anywhere". Still our own trucks and drivers.
- D6. After hours: "Nights and weekends by appointment; after-hours work carries a $100 fee." Phone 24/7. (Confirm whether weekends carry the fee.)
- D7. Fulfillment and FBA prep pages stay as secondary Reno services, out of the spotlight.
- D8. No company photos or licensed stock yet: the site ships with empty media slots and a media plan (`MEDIA.md`); slots render nothing until a file is added. Location slots take Nick's own photos only.
- D9. Navigation stays flat (Reno NV · Sacramento CA · Harrisburg PA · Services · Client Portal · About); `/services/` is the hub; the footer lists every service and dock page.
- D10. Portal promises stay exactly as the `LIVE` switches allow: no new portal claims, no "real-time", no texts or emails while alerts are 'soon'.
- D11. No certifications claimed. Reviews: links to the Google listings only, no quotes until Nick supplies real ones.
- D12. Six company-wide service pages added: `/cross-docking/`, `/transloading/`, `/freight-consolidation/`, `/freight-rework/`, `/warehousing/`, `/pickups-deliveries/`.
