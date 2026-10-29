# Photos and video for the website (media plan)

Written by `site-src/build.py` on every build. Don't edit this file by hand: the slots live in `MEDIA` and `VIDEO` in build.py.

**Status: 0 of 24 slots have files.** Until a file is added, its slot shows nothing, so no page ever shows a placeholder or a fake photo.

## The rule
- Slots marked **Your own photo only** are on a location page and look like *that dock*. Only a photo you took at that dock may go there.
  Never put a stock photo, or a photo of another company's building, in those slots.
- Slots marked **Stock OK** are on the company-wide service sections. A licensed stock photo is fine there. The alt text never names one of
  our locations, so a stock photo is never presented as our dock.
- No cartoons, no illustrations, no AI-made images, no low-resolution photos.

## Every slot
| Page / section | The shot we want | Who can supply it | File name |
|---|---|---|---|
| Home page hero, behind the headline (when there is no video, and on phones)<br>/ | Wide, low shot down a clean, bright loading dock: trailers backed into a row of dock doors, a forklift carrying a wrapped pallet. No readable company names. | Stock OK | `site-src/assets/img/home-hero.jpg` |
| Home page, cross-docking section<br>/ | A forklift moving a wrapped pallet from one trailer toward another across a clean dock floor, open dock doors behind. | Stock OK | `site-src/assets/img/home-crossdock.jpg` |
| Home page, warehousing and 3PL<br>/ | Tall pallet racking down a bright, organized aisle with a clean concrete floor. | Stock OK | `site-src/assets/img/home-warehouse.jpg` |
| Home page, pickups and deliveries<br>/ | A clean box truck or tractor-trailer backed into a dock door, being loaded. No visible third-party logos. | Stock OK | `site-src/assets/img/home-pickups.jpg` |
| Cross-docking pages<br>/cross-docking/ | Pallets sorted into destination lanes on a dock floor between open dock doors. | Stock OK | `site-src/assets/img/svc-cross-docking.jpg` |
| Transloading pages<br>/reno/transloading/, /transloading/ | Workers in safety vests unloading floor-loaded cartons from a shipping container onto pallets. | Stock OK | `site-src/assets/img/svc-transloading.jpg` |
| Freight consolidation pages<br>/freight-consolidation/ | Several different shipments built into one load: labeled pallets lined up at an open trailer. | Stock OK | `site-src/assets/img/svc-consolidation.jpg` |
| Freight rework pages<br>/freight-rework/ | A worker restacking a pallet and stretch-wrapping it, corner boards visible. | Stock OK | `site-src/assets/img/svc-rework.jpg` |
| Warehousing and pallet storage pages<br>/warehousing/ | A long aisle of pallet racking full of wrapped pallets, a forklift in the distance. | Stock OK | `site-src/assets/img/svc-warehousing.jpg` |
| Pickups and deliveries pages<br>/pickups-deliveries/ | A delivery truck at a customer receiving door or on the road. No visible third-party logos. | Stock OK | `site-src/assets/img/svc-pickups.jpg` |
| "Built to handle more than standard pallets" section<br>/, /cross-docking/, /harrisburg/, /reno/, /sacramento/, /transloading/, /warehousing/ | Oversized or odd freight: a large wooden crate or a long piece being moved by forklift. | Stock OK | `site-src/assets/img/svc-freight.jpg` |
| Reno–Sparks, NV page hero, behind the headline<br>/reno/ | Your Sparks dock from the yard: building and dock doors with trailers backed in. No customer names on trailers. | **Your own photo only** | `site-src/assets/img/loc-reno-hero.jpg` |
| Reno–Sparks, NV pages, dock section<br>/reno/cross-docking/ | Inside the Sparks dock: open doors, a trailer being unloaded, crew in safety vests. | **Your own photo only** | `site-src/assets/img/loc-reno-dock.jpg` |
| Reno–Sparks, NV pages, storage section<br>/reno/pallet-storage/ | The Sparks warehouse floor: racking or floor-stacked pallets, clean and well lit. | **Your own photo only** | `site-src/assets/img/loc-reno-floor.jpg` |
| Sacramento, CA page hero, behind the headline<br>/sacramento/ | Your North Highlands dock from the yard: building and dock doors with trailers backed in. No customer names on trailers. | **Your own photo only** | `site-src/assets/img/loc-sac-hero.jpg` |
| Sacramento, CA pages, dock section<br>/sacramento/, /sacramento/cross-docking/, /sacramento/transloading/ | Inside the North Highlands dock: open doors, a trailer being unloaded, crew in safety vests. | **Your own photo only** | `site-src/assets/img/loc-sac-dock.jpg` |
| Sacramento, CA pages, storage section<br>/sacramento/cross-docking/, /sacramento/freight-consolidation/, /sacramento/transloading/ | The North Highlands warehouse floor: racking or floor-stacked pallets, clean and well lit. | **Your own photo only** | `site-src/assets/img/loc-sac-floor.jpg` |
| Harrisburg, PA page hero, behind the headline<br>/harrisburg/ | Your Middletown dock from the yard: building and dock doors with trailers backed in. No customer names on trailers. | **Your own photo only** | `site-src/assets/img/loc-pa-hero.jpg` |
| Harrisburg, PA pages, dock section<br>/harrisburg/, /harrisburg/cross-docking/, /harrisburg/freight-consolidation/, /harrisburg/freight-rework/ | Inside the Middletown dock: open doors, a trailer being unloaded, crew in safety vests. | **Your own photo only** | `site-src/assets/img/loc-pa-dock.jpg` |
| Harrisburg, PA pages, storage section<br>/harrisburg/cross-docking/, /harrisburg/freight-consolidation/, /harrisburg/freight-rework/ | The Middletown warehouse floor: racking or floor-stacked pallets, clean and well lit. | **Your own photo only** | `site-src/assets/img/loc-pa-floor.jpg` |
| Home page hero video<br>/ | 10–20 s, real footage: forklifts moving pallets, trucks at dock doors, freight moving between trailers, pallets going into racking, a wide shot of a clean facility. Seamless loop, no music. | Stock OK | `site-src/assets/video/main.mp4` + `main.jpg` (poster) |
| Reno–Sparks, NV page hero video (optional)<br>/reno/ | 10–20 s at your Sparks dock: a trailer at a door, a forklift unloading, the floor. Seamless loop, no music. | **Your own video only** | `site-src/assets/video/reno.mp4` + `reno.jpg` (poster) |
| Sacramento, CA page hero video (optional)<br>/sacramento/ | 10–20 s at your North Highlands dock: a trailer at a door, a forklift unloading, the floor. Seamless loop, no music. | **Your own video only** | `site-src/assets/video/sac.mp4` + `sac.jpg` (poster) |
| Harrisburg, PA page hero video (optional)<br>/harrisburg/ | 10–20 s at your Middletown dock: a trailer at a door, a forklift unloading, the floor. Seamless loop, no music. | **Your own video only** | `site-src/assets/video/pa.mp4` + `pa.jpg` (poster) |

## File specs
- Photos: JPG, 2400×1600 (3:2) or 2400×1350 (16:9) for heroes; portraits 1600×2000. Under 400 KB each (export at about 75% quality).
  Optional: a `.webp` copy with the same name next to the `.jpg` (smaller download; the site uses it automatically).
- Hero video: MP4 (H.264), 1920×1080, 10–20 seconds, no audio, under 5 MB, a seamless loop. Add a `.jpg` still with the same name (the poster).
  Phones, slow connections and visitors who turn off motion get the still only.
- Horizontal (landscape) photos, well lit, level, sharp. No readable customer names, plates or faces you don't have permission to show.

## Shot list for your phone (10 shots per dock)
Shoot on a bright day with the dock tidy. Hold the phone sideways. Take each shot a few times.

### Reno–Sparks, NV (1095 Spice Islands Dr, Suites 105–106, Sparks, NV 89431)
1. From the yard: the building and the row of dock doors, trailers backed in (wide, horizontal).
2. One open dock door from inside, a trailer at it, daylight behind.
3. A forklift carrying a wrapped pallet across the floor (crew in safety vests).
4. A trailer being unloaded: pallets coming off at the door.
5. Pallets sorted into outbound lanes on the floor.
6. Racking or floor-stacked pallets, a long view down an aisle.
7. A pallet being stretch-wrapped or rebuilt.
8. Odd freight you handle: drums, a crate or a long piece (no customer labels readable).
9. One of our trucks being loaded at a door, or on the road.
10. The office or kiosk entrance drivers use (helps drivers find it).
Name the best three `loc-reno-hero.jpg`, `loc-reno-dock.jpg` and `loc-reno-floor.jpg`.

### Sacramento, CA (3036 Orange Grove Ave, North Highlands, CA 95660)
1. From the yard: the building and the row of dock doors, trailers backed in (wide, horizontal).
2. One open dock door from inside, a trailer at it, daylight behind.
3. A forklift carrying a wrapped pallet across the floor (crew in safety vests).
4. A trailer being unloaded: pallets coming off at the door.
5. Pallets sorted into outbound lanes on the floor.
6. Racking or floor-stacked pallets, a long view down an aisle.
7. A pallet being stretch-wrapped or rebuilt.
8. Odd freight you handle: drums, a crate or a long piece (no customer labels readable).
9. One of our trucks being loaded at a door, or on the road.
10. The office or kiosk entrance drivers use (helps drivers find it).
Name the best three `loc-sac-hero.jpg`, `loc-sac-dock.jpg` and `loc-sac-floor.jpg`.

### Harrisburg, PA (2811 Turnpike Industrial Dr, Middletown, PA 17057)
1. From the yard: the building and the row of dock doors, trailers backed in (wide, horizontal).
2. One open dock door from inside, a trailer at it, daylight behind.
3. A forklift carrying a wrapped pallet across the floor (crew in safety vests).
4. A trailer being unloaded: pallets coming off at the door.
5. Pallets sorted into outbound lanes on the floor.
6. Racking or floor-stacked pallets, a long view down an aisle.
7. A pallet being stretch-wrapped or rebuilt.
8. Odd freight you handle: drums, a crate or a long piece (no customer labels readable).
9. One of our trucks being loaded at a door, or on the road.
10. The office or kiosk entrance drivers use (helps drivers find it).
Name the best three `loc-pa-hero.jpg`, `loc-pa-dock.jpg` and `loc-pa-floor.jpg`.

## Licensed stock (only for the "Stock OK" slots)
- Free for commercial use: [Pexels](https://www.pexels.com/search/warehouse/), [Unsplash](https://unsplash.com/s/photos/warehouse).
- Paid, more choice and video: [Adobe Stock](https://stock.adobe.com/), [Storyblocks](https://www.storyblocks.com/), [Artgrid](https://artgrid.io/) (video).
- **Make sure it's a real photo, not AI.** Before you download: zoom in on hands, faces, forklift forks, pallet slats and any lettering
  (AI images get these wrong); check the listing doesn't say "AI generated" or "generative AI" (Adobe Stock labels them; filter them out);
  prefer photographers with a portfolio of similar real shoots. When unsure, skip it.
- Keep the license or download receipt in the shared Drive folder.

## How to add a file
1. Name it exactly as in the table (for example `home-crossdock.jpg`).
2. Put photos in `site-src/assets/img/` and videos (with their `.jpg` still) in `site-src/assets/video/`.
3. Run `python3 site-src/build.py`. The build prints `MEDIA: n of 24 slots have files` and lists what is still missing.
