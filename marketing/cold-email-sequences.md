# Cold Email Sequences (paste into Instantly)

Short style. 4 emails over 14 days. Plain text, no images, no links in email 1.
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

## Campaign 1: Freight forwarders + brokers

**Email 1 (Day 1). Subject: Reno cross-dock**
```
Hi {{firstName}},

We cross-dock, store and transload freight in Sparks, NV on I-80. Photos of every pallet same day, billed weekly, no contract.

Any loads going through Reno?
```

**Email 2 (Day 3). Subject: re: Reno cross-dock**
```
{{firstName}}, send me the load details and you'll have a rate within the hour.

Most brokers start with one load to test us.
```
> Only promise "within the hour" during sending hours (7am–2pm). Reply fast.

**Email 3 (Day 7). Subject: containers landing early?**
```
{{firstName}}, when a container or trailer lands before the receiver is ready, we unload it, hold it and reload it when they are.

Who at {{companyName}} handles that?
```

**Email 4 (Day 14). Subject: last one**
```
{{firstName}}, I'll stop here. If a load ever needs a dock in Reno, call or text me at {{CallRail cold-email 800 number}}.
```

---

## Campaign 2: California manufacturers + brands (contract storage)

**Email 1 (Day 1). Subject: overflow storage near Sacramento**
```
Hi {{firstName}},

We store pallets in Sparks, NV, 2 hours from Sacramento. California companies use us when their warehouse is full or rent is too high.

Short on space this year?
```

**Email 2 (Day 3). Subject: re: overflow storage**
```
{{firstName}}, you pay only for the pallets you store, billed weekly. Every pallet is photographed and tracked from the day it lands.

Nevada also has no corporate income tax, and its Freeport law can exempt inventory that ships out of state.
```

**Email 3 (Day 7). Subject: quick question**
```
{{firstName}}, roughly how many pallets does {{companyName}} keep in storage?

I can send written rates in one business day.
```

**Email 4 (Day 14). Subject: last one**
```
{{firstName}}, I'll leave it here. If space gets tight, we're on I-80 in Sparks: {{CallRail cold-email 800 number}}.
```

---

## Campaign 3: Importers (container unloading + storage)

**Email 1 (Day 1). Subject: your containers after the port**
```
Hi {{firstName}},

We unload containers in Reno, palletize and store them, then ship to your customers or Amazon FBA.

Do your containers ever land before the receiver is ready?
```

**Email 2 (Day 3). Subject: re: your containers**
```
{{firstName}}, seal, count and condition are photographed the day we unload. Damage is reported right away, not at ship-out.
```

**Email 3 (Day 7). Subject: Reno warehouse rates**
```
{{firstName}}, Reno is about 4 hours from Oakland on I-80, and Nevada has no corporate income tax.

Want a written rate for your next few containers?
```

**Email 4 (Day 14). Subject: last one**
```
{{firstName}}, if you ever need a place to unload and hold containers in Nevada, call or text {{CallRail cold-email 800 number}}.
```

---

## Instantly settings

| Setting | Value |
|---|---|
| Sending days | Mon–Fri |
| Sending window | 7am–2pm Pacific (match your callback hours) |
| Daily limit per inbox | 30 max (after 3 weeks warm-up) |
| New people per day (all campaigns) | Start 300, +200 a week, up to 1,000 |
| Inboxes | ~130 on ~45 domains (see cold-email-domains.md) |
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
