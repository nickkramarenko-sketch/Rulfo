# Reno Cold Email: Setup Guide (do in order)

Goal: 1,000 new people a day. No website in emails for now. Google Ads paused.
Do one step, tell Claude it's done, then the next.

| # | Where | What | Time | Cost |
|---|---|---|---|---|
| 1 | dash.cloudflare.com | Buy ~45 domains | 30 min | ~$500/yr |
| 2 | zapmail.ai | ~130 Google inboxes on those domains | 30 min | ~$400–450/mo |
| 3 | instantly.ai | Connect inboxes, turn on warm-up | 20 min | ~$97/mo now, ~$360 at week 4 |
| 4 | callrail.com | 1 toll-free number for cold email | 15 min | ~$65/mo |
| 5 | app.hubspot.com | Pipeline + 4 lead fields | 15 min | $0 |
| 6 | apollo.io | Build lists A–E | 1–2 hrs | ~$100+/mo |
| 7 | millionverifier.com | Check every email | 10 min | pay per use |
| 8 | importyeti.com | Find container importers | 1 hr | free |
| 9 | instantly.ai | Load the 3 campaigns (Claude gives you the text) | 1 hr | – |
| 10 | – | Test, then launch at 300/day (week 4) | 30 min | – |

---

## 1. Cloudflare: buy the domains
1. Go to **dash.cloudflare.com** → Sign up with your Gmail → verify the email.
2. Left menu → **Domain Registration** → **Register Domains**.
3. Search each name from `cold-email-domains.md`. If it says available → **Purchase** (add to cart). If taken → skip.
4. Stop at **45**. Pay with your card (~$10–11 each per year).
5. Auto-renew: **On**. Contact info: business address 1095 Spice Islands Dr, Ste 105, Sparks, NV 89431.
6. Send Claude the list of domains you got.

## 2. Zapmail: the inboxes
1. **zapmail.ai** → Sign up → choose **Google Workspace** inboxes, quantity **~130**.
2. **Connect domains** → pick Cloudflare → log in → select all 45. Zapmail sets SPF, DKIM, DMARC.
3. Create **3 inboxes per domain**: `nick@`, `nkramarenko@`, `n.kramarenko@`. Name: **Nick Kramarenko**.
4. Upload the same profile photo for all (a real photo of you).
5. Domain forwarding: **skip** for now.
6. Wait until every domain shows green (can take a few hours).

## 3. Instantly: warm-up
1. **instantly.ai** → Sign up → **Hypergrowth** (~$97). Upgrade to **Light Speed** in week 4 when sending starts.
2. In Zapmail → **Export to Instantly** (one click) → all inboxes show up in Instantly → Email Accounts.
3. Select all → **Enable warm-up**. Leave it 14–21 days. Don't send anything else.
4. Settings → Notifications → turn on alerts for **Interested** replies to your phone.

## 4. CallRail: tracking number
1. **callrail.com** → Sign up → **Call Tracking**.
2. Create **1 toll-free number**, name it **Cold email**, forward to **916-616-3481**.
3. Call recording: **Off**. Text alert for first-time callers: **On**.
4. Send Claude the number (it goes in the email signature).

## 5. HubSpot: pipeline
1. Gear icon → **Objects → Deals → Pipelines** → stages: **New lead → Quote sent → Closed won / Closed lost**.
2. Gear → **Properties → Contact → Create property** (4 times): Pallets per month (number), Service needed (dropdown), Lead source (dropdown), Start date (date).
3. Instantly → Integrations → **HubSpot** → connect, so Interested replies become contacts.
4. Phone: install the HubSpot app, turn on notifications.

## 6. Apollo: lists
1. **apollo.io** → Sign up → paid plan with enough export credits (start small during warm-up, upgrade at week 4).
2. Build the saved searches from `reno-outbound-playbook.md` section 4 (Lists A–E, plus List I: drayage carriers).
3. Export verified emails only → CSV.

## 7. MillionVerifier
1. **millionverifier.com** → buy credits.
2. Upload each Apollo CSV → download only **"ok"** emails.

## 8. ImportYeti (importers)
1. **importyeti.com** → search companies receiving containers at Oakland and Long Beach that ship to Nevada / inland California.
2. Put the company names in Apollo → find Import / Logistics Managers → export.

## 9. Instantly: campaigns
1. Claude gives you the 4 campaigns ready to paste (from `cold-email-sequences.md`). Campaign 4 (drayage) is small: run it once, then phone the openers.
2. Upload the checked CSVs. One company = one campaign only.
3. Settings from `cold-email-sequences.md` (Mon–Fri 7am–2pm, 30/inbox/day, open tracking off, stop on reply).

## 10. Launch (week 4)
1. Send a test from each campaign to your Gmail. Must land in **Primary**.
2. Start at **300 new people a day**. Add 200 a day each week if replies look good.
3. Monday check-in with Claude: send the numbers, get changes.
