# Setup Checklist: Cold Email, Tracking, Google Profile, Google Ads

Reno only. $5,000 a month. Everything below was decided by Nick on 2026-10-05.

## Decisions

| Area | Decision |
|---|---|
| Brand | 24 HR Crossdock (keep the name, reviews and look) |
| New website | **24hrwarehousing.com**, bought on Cloudflare, hosted free on Netlify. Main 24hrcrossdock.com / 24HourCrossdock.com sites stay untouched |
| Website content | The artifact site, Reno-focused, plus 3 ad pages: pallet storage, transload/container unloading, FBA prep. Footer: "Also in Sacramento and Pennsylvania" |
| Cold email inboxes | Zapmail, 10 Google inboxes (~$39/mo) on 3 new look-alike domains |
| Sending | Instantly Growth (~$47/mo), replies handled in Instantly |
| Lead finding | Apollo Basic, 1 seat |
| Sender | Nick Kramarenko |
| Lists | All 3 at once: forwarders + brokers, CA manufacturers, importers |
| Volume | Warm up 2–3 weeks, then 100/day, +50 a week, up to 300/day |
| Sequences | 4 emails over 14 days, short style (Claude writes them) |
| Interested reply | Text alert to Nick, then Nick calls (no booking link) |
| CRM | HubSpot (free). Pipeline: New lead → Quote sent → Won/Lost |
| Lead fields | Pallets per month, Service needed, Lead source, Start date |
| Report | HubSpot dashboard |
| Call tracking | CallRail, 800 toll-free numbers for Google Ads, website, cold email, Google Business Profile. All forward to 916-616-3481 → Callzilla AI → transfer. No call recording |
| Quote form goes to | HubSpot + Nick's Gmail + text alert |
| Google Business Profile | Request ownership from Google. Categories: Warehouse (main), Logistics service |
| Reviews | QR sign at the dock + review link in email signature and invoices |
| Google Ads | $3,500/mo, Mon–Fri 6am–2pm, Reno + Northern California + Bay Area |
| Ad services | Pallet storage, container unloading/transload, FBA prep (not cross-dock) |
| Ads conversion | Quote form sent |
| Bidding | Maximize clicks with a cap for ~30 days, then Maximize conversions |
| Russian carrier ads | Facebook/Instagram, $500/mo |

## Monthly cost

| Item | $/mo |
|---|---|
| Google Ads | 3,500 |
| Russian Facebook/Instagram ads | 500 |
| Zapmail (10 inboxes) | ~39 |
| Instantly Growth | ~47 |
| Apollo Basic | ~50–60 |
| CallRail + 4 numbers | ~50–65 |
| 3 cold-email domains + 24hrwarehousing.com | ~4 (≈$45/yr) |
| HubSpot, Netlify | 0 |
| **Total** | **~$4,200** (leaves ~$800 buffer) |

Prices are approximate (2026). Check at checkout.

---

## Still missing

- [ ] Dock address for the cold email footer (required by law before any email goes out)
- [ ] Google Business Profile ownership (requested from Google, see step 6)
- [ ] Do Sacramento and Pennsylvania have Google profiles? (check later)

---

## Step-by-step (Nick does these, in this order)

### 1. Buy the domains (Cloudflare, 15 min)
1. Go to dash.cloudflare.com → sign up with your Gmail.
2. Domain Registration → Register Domains → search `24hrwarehousing.com` → buy.
3. Buy 3 cold-email domains (if taken, ask Claude for others):
   - `get24hrwarehousing.com`
   - `24hrwarehousinghq.com`
   - `try24hrwarehousing.com`
4. Never send cold email from 24hrwarehousing.com or 24hrcrossdock.com.

### 2. Cold email inboxes (Zapmail, 20 min)
1. Sign up at zapmail.ai → plan with 10 Google inboxes.
2. Connect the 3 cold-email domains (Zapmail walks you through Cloudflare).
3. Create 10 inboxes as Nick Kramarenko, 3–4 per domain: `nick@`, `nkramarenko@`, `n.kramarenko@`, `nickk@`.
4. Zapmail sets SPF, DKIM, DMARC for you. Confirm all show green.
5. No forwarding needed. Replies show up in Instantly.

### 3. Instantly (15 min)
1. Sign up at instantly.ai → Growth plan.
2. Email Accounts → add all 10 Zapmail inboxes (Zapmail has a one-click export to Instantly).
3. Turn ON warm-up for every inbox. Wait 14–21 days before sending.
4. Settings → notifications → text/SMS or Slack alert for "Interested" replies (or use HubSpot alert, step 5).
5. Connect HubSpot (Integrations → HubSpot) so interested leads become contacts.

### 4. Apollo (10 min)
1. Sign up at apollo.io → Basic, 1 seat.
2. Build the 3 saved searches from `reno-outbound-playbook.md` section 4 (Lists A, B, C, D).
3. Export contacts (verified emails only) → import into Instantly campaigns.

### 5. HubSpot (10 min, Claude can't do this part from here)
1. Settings (gear) → Objects → Deals → Pipelines → edit "Sales Pipeline".
2. Delete the extra stages. Keep 3 + closed: **New lead**, **Quote sent**, **Closed won**, **Closed lost**.
3. Settings → Properties → Contact properties → Create property, 4 times:
   - **Pallets per month** (number)
   - **Service needed** (dropdown: Pallet storage, Transload / container unloading, FBA prep, Cross-dock, Other)
   - **Lead source** (dropdown: Google Ads, Cold email, Google Maps, Website, Referral, Russian ads, Phone)
   - **Start date** (date)
4. Install the HubSpot app on your phone → turn on notifications for new deals.
5. HubSpot says the account hasn't finished onboarding. Finish the short setup when you log in.

### 6. Google Business Profile access (5 min, then wait)
1. On your phone, search Google Maps for 24 HR Crossdock Reno → open the listing.
2. Tap "Own this business?" or "Claim this business" → Request access.
3. Fill in your name and role (owner/manager).
4. The current owner gets an email. If he doesn't answer in 7 days, Google may let you claim it yourself.
5. Once in: set primary category **Warehouse**, add **Logistics service**, set hours Mon–Fri 6am–10pm, add the CallRail 800 number for Google Maps, add website 24hrwarehousing.com, upload 10+ dock photos.

### 7. CallRail (15 min)
1. Sign up at callrail.com (Call Tracking plan).
2. Create 4 toll-free tracking numbers, all forwarding to **916-616-3481**:
   - Google Ads
   - Website (24hrwarehousing.com)
   - Cold email signature
   - Google Business Profile
3. Turn call recording **OFF**.
4. Connect HubSpot and Google Ads (Integrations tab).
5. Text alert for every new first-time caller → your phone.

### 8. Website (ready in the `site/` folder, Nick deploys, 20 min)
The site is your artifact website, prepped for 24hrwarehousing.com: quote forms now really send (no more "opens your email"), a thank-you page for ad tracking, a new transload ad page, other locations moved to the footer. Ad pages:
- `24hrwarehousing.com/#/pallet-storage-reno`
- `24hrwarehousing.com/#/transloading-reno`
- `24hrwarehousing.com/#/fba-prep-reno`

Steps:
1. Go to netlify.com → Sign up with GitHub.
2. Add new site → Import from GitHub → pick the `rulfo` repo → branch `claude/admiring-bell-62bf5m` (or `main` after it's merged). Netlify reads `netlify.toml` and publishes the `site/` folder. Click Deploy.
3. Site settings → Domain management → Add domain → `24hrwarehousing.com`. Follow Netlify's steps to point Cloudflare at it (Netlify adds free HTTPS).
4. Forms → enable form detection → redeploy. Then Forms → Notifications → Email notification → 24hrcrossdock@gmail.com (or your Gmail).
5. Test: fill the quote form on your phone. You should get the email, and the lead should show in HubSpot Contacts within a few minutes.
6. If the lead does not show in HubSpot: HubSpot → Marketing → Forms → Non-HubSpot forms → turn on collection.
7. Text alert: turn on push notifications for new contacts in the HubSpot phone app.

Note: the artifact website and `site/` are now two copies. Make future website changes in `site/` (ask Claude).

### 9. Google Ads (Claude writes, Nick creates the account)
1. Go to ads.google.com → sign up with your Gmail → **switch to Expert mode** (skip the "Smart campaign" setup; it wastes money).
2. Billing: your card. Budget: ~$160/day, Mon–Fri only (≈$3,500/mo).
3. Claude gives you the exact campaign to paste: keywords, ads, negatives, schedule, locations.

---

## Google Ads plan (draft)

**Campaign:** Reno Warehousing (Search only, no Display, no Search Partners)
**Locations:** Reno–Sparks, Sacramento metro, Bay Area, Central Valley ("people in" these locations, not "interested in")
**Schedule:** Mon–Fri 6am–2pm Pacific
**Bidding:** Maximize clicks, max CPC $20, for 30 days → then Maximize conversions
**Conversion:** quote form sent (thank-you page)

### Ad group 1: Pallet storage
Keywords (phrase match): "pallet storage reno", "pallet storage sparks", "warehouse space reno", "warehouse storage reno nv", "3pl reno", "3pl warehouse nevada", "short term warehouse storage", "overflow warehouse storage", "contract warehousing reno"
Page: 24hrwarehousing.com/pallet-storage-reno

### Ad group 2: Container unloading / transload
Keywords: "container unloading reno", "transloading reno", "transload warehouse nevada", "container devanning reno", "drayage warehouse reno", "container storage reno"
Page: 24hrwarehousing.com/transloading-reno

### Ad group 3: FBA prep
Keywords: "amazon fba prep nevada", "fba prep center reno", "fba prep warehouse", "amazon prep service reno"
Page: 24hrwarehousing.com/fba-prep-reno

### Negative keywords (whole campaign)
self storage, storage unit, storage units, mini storage, rv storage, boat storage, jobs, job, hiring, careers, employment, forklift jobs, warehouse jobs, amazon jobs, amazon warehouse jobs, salary, free, cheap, diy, how to, training, certification course

### Sample ad (pallet storage)
- Headlines: Pallet Storage in Reno, NV | 3PL Warehousing on I-80 | Written Rates in 1 Business Day | No Long-Term Contract | Every Pallet Photographed | 100–5,000 Pallet Projects
- Descriptions: Short or long-term pallet storage in Reno–Sparks. Billed weekly, fully insured. Get a quote today. | Counted, photographed and tracked the day it arrives. 2 hours to Sacramento.
- Call extension: CallRail Google Ads 800 number
- Final URL: https://24hrwarehousing.com/#/pallet-storage-reno

### Sample ad (container unloading / transload)
- Headlines: Container Unloading in Reno | Transload on I-80 in Sparks | Unload, Store or Reload | Same-Day Reload Available | Photos of Every Container | Written Rates in 1 Business Day
- Descriptions: Floor-loaded containers unloaded, palletized and wrapped. Store with us or reload same day. | Seal, count and condition photographed. Damage reported right away. Billed weekly.
- Final URL: https://24hrwarehousing.com/#/transloading-reno

### Sample ad (FBA prep)
- Headlines: Amazon FBA Prep in Reno, NV | FNSKU Labels & Poly Bagging | Prepped to Amazon's Rules | Store Bulk, Ship to Amazon | Walmart WFS Prep Too | Get a Prep Quote Today
- Descriptions: Amazon no longer preps FBA inventory. We label, bag, bundle and ship to Amazon from Reno. | Keep bulk stock in Reno and skip Amazon's long-term storage fees. Reply in one business day.
- Final URL: https://24hrwarehousing.com/#/fba-prep-reno

### Conversion tracking
1. Google Ads → Goals → Conversions → New → Website → `24hrwarehousing.com`.
2. Goal: "Submit lead form". Count: One. Trigger: page URL contains `/thanks.html`.
3. Google gives a tag. Send it to Claude to paste into `site/thanks.html` (the spot is marked), or install it with Google Tag Manager.
