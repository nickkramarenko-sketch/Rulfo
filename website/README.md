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

## Editing the portal
`portal/customer-portal-source.js` is the readable source for the new customer screens. `portal/rebuild.sh <original-portal.html>` injects it into the app bundle.

## Known limits
- Portal data is saved in each browser. A customer's booking on their phone does not reach the office's computer yet. Shared data is the next step.
- The portal artifact is private until it's shared from its Share menu. Customers can't open it before that.
