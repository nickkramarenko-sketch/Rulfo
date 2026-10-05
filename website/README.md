# 24 HR Crossdock – website and customer portal

Both are live as Claude artifacts. The files here are copies.

| What | Live link | File |
|---|---|---|
| Website | https://claude.ai/artifact/Y2gD2gSWixv1kKesiwvp3n | `index.html` |
| Portal (customers, office, crew, dock screens) | https://claude.ai/artifact/97haWKtJGFGXW8PjdM9XWv | `portal/portal.html` |

## Website
- The menu is always across the top, with no dropdown, on phones too.
- A "Customer Sign In" button is in the header, in the phone's bottom bar, and on the home page ("Already a customer?"). There's also a Customers column in the footer.

## Customer portal (rebuilt)
The tabs across the top are: Home, Book a truck, My freight, Damage, Bills, Messages.
- **Home**: a "Needs your answer" box, big buttons, and what's at the dock and coming up.
- **Book a truck**: 4 steps. 1) Send a truck in, or pick up freight we hold. 2) Pallets, or pick the loads. 3) Day and time. 4) Truck info (optional). The full work order is still there for big multi-load bookings.
- **Damage**: photos, what it costs to fix, and three choices: **Accept**, **Decline** (with a reason), or **Call / message us**. Every answer is saved on the load and sent to the office chat, tagged with the load number. Accepted extra charges go onto the load as adjustments.
- **Office/crew side**: open the load, go to Exceptions, then "Charge estimate for the customer". Add rewrap, labor, a replacement pallet, disposal or a custom charge. The customer sees it right away. Rewrap pallets recorded at the door show up automatically.

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
- The portal artifact is private until it's shared from its Share menu. Customers can't open it before that.
