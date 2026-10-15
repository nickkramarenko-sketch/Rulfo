# Cold Email Sequences (paste into Instantly)

Short style. **3 emails over 10 days (Day 1, Day 4, Day 10).** Email 1 = their pain, email 2 = a free useful offer, email 3 = short breakup. Plain text, no images, no links in email 1.
Sender: Nick Kramarenko. Variables: `{{firstName}}`, `{{companyName}}`.
Turn on "Stop on reply" and "Stop for the whole company on reply" in Instantly.
Turn OFF open tracking (it hurts inbox placement). Keep reply tracking on.

**Signature (all emails):** no website for now. Add 24hrwarehousing.com once the new site is live.
```
Nick Kramarenko
24 HR Crossdock | Sparks, NV
{{CallRail cold-email 800 number}}

1095 Spice Islands Dr, Ste 105, Sparks, NV 89431
Not the right person or not interested? Reply "no" and I won't email again.
```

---

## Campaign 1: Freight forwarders + brokers (Lists A + B)

**Email 1 (Day 1). Subject: Reno dock for {{companyName}}**
```
Hi {{firstName}},

When a load or container hits Reno before the receiver is ready, we unload it, hold it and reload it on your schedule. Sparks, NV, on I-80, open 24/7, every pallet photographed.

Do you move freight through Reno?
```

**Email 2 (Day 4). Subject: Reno receiving guide**
```
{{firstName}}, I put together a one-page Reno receiving guide: dock hours, appointment rules, and what to do when Donner closes.

Want me to send it over?
```
> Build the guide before launch. Reply with it as plain text or a PDF only after they say yes.

**Email 3 (Day 10). Subject: last one**
```
{{firstName}}, I'll stop here. Next time something needs a dock in Reno, call or text {{CallRail cold-email 800 number}}. We answer 24/7.
```

---

## Campaign 2: California manufacturers + brands (List C)

**Email 1 (Day 1). Subject: overflow space near Sacramento**
```
Hi {{firstName}},

California companies keep overflow and slow-moving stock with us in Sparks, NV, 2 hours from Sacramento. Space here rents for far less than the Bay Area, and Nevada has no inventory tax.

Is {{companyName}} short on warehouse space this year?
```

**Email 2 (Day 4). Subject: storage cost check**
```
{{firstName}}, if you tell me roughly how many pallets you store, I'll send a side-by-side of what that space costs in the Bay Area vs Reno, using public market rents.

No call needed. Want one?
```

**Email 3 (Day 10). Subject: last one**
```
{{firstName}}, I'll leave it here. If space gets tight, we're on I-80 in Sparks: {{CallRail cold-email 800 number}}.
```

---

## Campaign 3: Importers (List D)

**Email 1 (Day 1). Subject: your containers after Oakland**
```
Hi {{firstName}},

We unload containers in Sparks, NV the day they arrive, so the empty goes back fast and detention stops running. Then we store the pallets and ship to your customers, retailers or Amazon.

Do your containers ever sit waiting for a dock?
```

**Email 2 (Day 4). Subject: your container count**
```
{{firstName}}, from public shipping records I can put together a quick snapshot of how many containers {{companyName}} landed on the West Coast last year and roughly how many pallets that is.

Want me to send it?
```
> Build the snapshot from ImportYeti only after they say yes.

**Email 3 (Day 10). Subject: last one**
```
{{firstName}}, I'll stop here. If you ever need containers unloaded and stored in Nevada, call or text {{CallRail cold-email 800 number}}.
```

---

## Campaign 4: Drayage carriers, Oakland + LA/LB (List I)

Small list (~600–900 companies): run it as its own campaign and call the ones who reply. Dispatchers start early: send 6am–1pm.

**Email 1 (Day 1). Subject: Reno transload for your containers**
```
Hi {{firstName}},

We unload containers in Sparks, NV, 4 hours from Oakland on I-80. Dock is open 24 hours and the box is empty within 2 hours of arrival, so your driver turns right around.

Do you pull any boxes headed to Reno or Nevada?
```

**Email 2 (Day 4). Subject: re: Reno transload**
```
{{firstName}}, when a receiver in Reno can't take a container on time, we take it, unload it and hold it. Your driver doesn't wait and you keep the customer.

Want our rate sheet?
```
> Optional: add a referral fee per container once Nick sets the number.

**Email 3 (Day 10). Subject: last one**
```
{{firstName}}, I'll stop here. Next time a container needs a dock in Reno, call or text {{CallRail cold-email 800 number}}. Open 24/7.
```

---

## Instantly settings

| Setting | Value |
|---|---|
| Sending days | Mon–Fri |
| Sending window | 7am–2pm Pacific (match your callback hours) |
| Daily limit per inbox | 30 max (after 3 weeks warm-up) |
| New people per day (all campaigns) | Start 300, +200 a week, up to 1,000 |
| Inboxes | ~100 on ~34 domains (see cold-email-domains.md) |
| Emails per person | 3 (Day 1, 4, 10) → ~3,000 sends/day at 1,000 new people |
| Stop for whole company on reply | On |
| Stop on reply | On |
| Open tracking | Off |
| Link tracking | Off |
| Text only | On |
| Interested replies | Label "Interested" → push to HubSpot → alert Nick |

## Before the first send
- [ ] Inboxes warmed 14–21 days
- [ ] CallRail cold-email number added to the signature
- [ ] Test email to your Gmail from each campaign. Check it lands in Primary, not Spam
- [ ] Lists exported from Apollo and checked in MillionVerifier (bounces under 2%)
- [ ] Each company in only one campaign
- [ ] Reno receiving guide written (Campaign 1, email 2)
