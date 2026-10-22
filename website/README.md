# 24 HR Crossdock – website and customer portal

Both are live as Claude artifacts. The files here are copies.

| What | Live link | File |
|---|---|---|
| Website | https://claude.ai/artifact/Y2gD2gSWixv1kKesiwvp3n | `index.html` |
| Portal (customers, office, crew, dock screens) | https://claude.ai/artifact/97haWKtJGFGXW8PjdM9XWv | `portal/portal.html` |

## Website
- The menu is always across the top, with no dropdown, on phones too.
- A "Customer Sign In" button is in the header, in the phone's bottom bar, and on the home page ("Already a customer?"). There's also a Customers column in the footer.

## Customer portal (rebuilt, schedule first)
The tabs across the top are: Schedule, Trucks, Inventory, Requests, Damage, Bills, Messages. A **Call dock** button sits in the header.
- **Schedule (first page)**: a week calendar (Mon to Sun, with previous and next week) showing every drop-off and pickup with time, pallets and live status. Tap a day to add a truck. Below it: what's on the floor now, and what's coming in. Alerts like damage waiting or loads near the end of free time are one slim line each.
- **Schedule a truck**: one form. Day and time, then dropping off or picking up. For a drop-off, add one row per load on the trailer (load or PO number, pallets, and what happens after unload: stays in Reno, reloads to California, or storage), plus optional BOL, PO, deliver-by date and notes. The pallet total adds up as you type. For a pickup, tick the loads on the floor. Truck and driver details are optional.
- **Truck screen** (tap any truck): its loads and pallet total, add or remove loads while it's still booked, change the time, message the dock about it, the work order, book it again next week, and cancel (confirmed on the page).
- **Trucks**: at our dock now, booked, and past trucks, each with a plain status like "Unloading now at door D1, 2 of 3 loads off".
- **Inventory**: totals at the top (pallets and weight on our floor, for pickup, for delivery). "Trailer space" shows how much of a 53' trailer (26 pallet spots, 44,000 lb) the pickup freight fills and how much room is left. It shows numbers only and never suggests what to load. Loads are split into **For pickup** (reloads and storage) and **For delivery** (stays in Reno), with pallets, weight, pallet type, spot, date in, and free time, plus totals. Below that: loads on trucks coming in, and shipped loads. Search by load, PO or BOL. The same trailer-space meter shows when booking a pickup.
- **Requests**: photos, dimensions or weight for a load; **third-party delivery** ($300, availability is checked first, and nothing is booked until the office says it's available and the customer confirms); **trailer rental** per drop (goes out and comes back, usually under 2 hours); or anything else. Delivery and trailer requests can repeat weekly. Every request also goes to Messages so the office sees it. Each request has "Same again" and "Cancel". Request statuses are: Waiting on us, Available (confirm it), Not available, Booked, Done, Cancelled. The office side for answering requests is not built yet.
- **Call dock**: shows the most senior crew member on shift who has a phone and shift set (the fields phone, shift {start, end, days} and rank on a crew login). Otherwise it shows the main line.
- **Damage**: photos, what it costs to fix, and three choices: **Accept**, **Decline** (with a reason), or **Call / message us**. Every answer is saved on the load and sent to the office chat. Accepted extra charges go onto the load.
- **Office/crew side**: open the load, go to Exceptions, then "Charge estimate for the customer".
- Bug fixed: "Cancel booking" never worked for customers, because the viewer always answers "no" to browser pop-ups.

## Forklift crew screen (guided, with leaderboard)
The tabs across the top are **Next job**, **All trucks**, **Leaderboard** and **Chat**.
- **Next job** (opens first): one big card for the truck the driver should work now, with the door, customer, pallet moves, time estimate and the job instructions, plus one big button: Continue / Start unloading / Start loading / Pick a door. It picks the job in this order: your own truck in progress, then trucks ready at a door, then trucks someone else started, then trucks in the yard. "Then" shows the next 3 jobs. "Your day" shows your pallets, trucks, photos and your rank today.
- **Inside a truck**: a step bar at the top ("Step 2 of 5: Unload & count") stays visible while scrolling. Done steps show a check, and tapping a step jumps to it. All the original steps, photos, counts and wrap-up are unchanged.
- **All trucks**: everything on site, grouped as working now, ready at a door, in the yard, and finished, plus booked trucks and late trucks.
- **Leaderboard**: today, this week or this month. Points are 1 per pallet moved, 10 per truck finished, 2 per load counted, 1 per photo, and 5 per damage report. There are badges for 100+ pallets, 5+ trucks, Sharp eye (reported damage), Photo pro and Counter.
- The new labels are in English, Spanish and Russian. Bug fixes from before are kept: the briefing box no longer covers steps, trucks open at the top, the door button opens the picker, and the wrap-up button isn't cramped.

## Office: Crew tab (new)
In the office, between Chat and Setup:
- **Driver stats** for today, the last 7 days or the last 30 days: points, pallets moved, trucks finished, average truck time, loads counted, photos, put in rows, reports, and last active.
- **What they reported**: every damage or problem report by a driver, with the customer's answer. Tap one to open the load.
- **Crew logins**: add a driver (name, 4 to 6 digit PIN or "Make one", language), edit the name, PIN or language, show or hide the PIN, and remove a driver (confirmed on the page). Drivers sign in at Staff, then Forklift crew.
- Stats come from what the app already stamps on every load: who received, counted, photographed, put away and loaded it, who finished each truck, and who reported damage.

## Editing the portal
The readable sources are `portal/customer-portal-source.js` (customer screens) and `portal/crew-source.js` (crew home). `python3 portal/build.py <original-portal.html> <out.html>` injects them into the original app bundle.

## Known limits
- Portal data is saved in each browser. A customer's booking on their phone does not reach the office's computer yet. Shared data is the next step.

## Locations (three docks)
- New top menu item **Locations** (#/locations): cards for Sparks NV, North Highlands CA and Middletown PA, plus "Coast to coast, one process".
- Location pages: #/sacramento (North Highlands, CA) and #/middletown (Middletown, PA), each with services, drive times and quote buttons.
- Quote forms have a **Location** field. Links like #/quote?loc=Middletown%2C%20PA pre-fill it.
- The footer lists all three locations. The bottom banner text changes per location page.
- **To confirm:** the CA and PA street addresses (the site says "sent with your dock appointment" for now) and the services offered at each.
