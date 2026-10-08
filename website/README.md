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
The tabs across the top are: Schedule, Trucks, On the floor, Damage, Bills, Messages.
- **Schedule (first page)**: a week calendar (Mon to Sun, with previous and next week) showing every drop-off and pickup with time, pallets and live status. Tap a day to add a truck. Below it: what's on the floor now, and what's coming in. Alerts like damage waiting or loads near the end of free time are one slim line each.
- **Schedule a truck**: one form. Day and time, then dropping off or picking up. For a drop-off, add one row per load on the trailer (load or PO number, pallets, and what happens after unload: stays in Reno, reloads to California, or storage), plus optional BOL, PO, deliver-by date and notes. The pallet total adds up as you type. For a pickup, tick the loads on the floor. Truck and driver details are optional.
- **Truck screen** (tap any truck): its loads and pallet total, add or remove loads while it's still booked, change the time, message the dock about it, the work order, book it again next week, and cancel (confirmed on the page).
- **Trucks**: at our dock now, booked, and past trucks, each with a plain status like "Unloading now at door D1, 2 of 3 loads off".
- **On the floor**: every load with pallets, when it came in, where it goes, and its storage clock. Loads on trucks coming in, and a list of shipped loads.
- **Damage**: photos, what it costs to fix, and three choices: **Accept**, **Decline** (with a reason), or **Call / message us**. Every answer is saved on the load and sent to the office chat. Accepted extra charges go onto the load.
- **Office/crew side**: open the load, go to Exceptions, then "Charge estimate for the customer".
- Bug fixed: "Cancel booking" never worked for customers, because the viewer always answers "no" to browser pop-ups.

## Forklift crew screen (rebuilt)
- The big tabs across the top are **Now**, **Coming** and **Chat**, each with a count. A stat row shows trucks on site, moves, and time left.
- **Now** is grouped by what to do next: **Working now**, then **Ready at a door**, then **In the yard (needs a door)**, then **Finished (waiting on the office)**. The truck cards and buttons are the same as before.
- New labels are in English, Spanish and Russian. Each crew member's language is set in the office.
- Bugs fixed:
  - The job briefing box stuck to the top of the truck screen and covered step 1, including the BOL photo and seal buttons.
  - A truck opened halfway down the page.
  - "Give it a door first" was a dead button. It now opens the door picker.
  - The "Wrap up & send" button text was cramped.

## Editing the portal
The readable sources are `portal/customer-portal-source.js` (customer screens) and `portal/crew-source.js` (crew home). `python3 portal/build.py <original-portal.html> <out.html>` injects them into the original app bundle.

## Known limits
- Portal data is saved in each browser. A customer's booking on their phone does not reach the office's computer yet. Shared data is the next step.
