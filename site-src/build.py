"""Builds the multi-location 24 HR Crossdock website into ../site (deployed by Netlify).

Run:  python3 site-src/build.py
Each page is a real URL (/reno/, /reno/cross-docking/, /sacramento/ ...) so Google can list it,
and each Google Maps listing can point at its own location home page.
Page bodies are fragments in pages/. Their first lines carry <!--title: ...--> and <!--desc: ...-->, and they can use
the {PLACEHOLDERS}, the feature blocks and the <!--markers--> described in README.md (and PLAN-premium.md §5).
"""
import html as html_lib, json, os, re, shutil, struct, sys
from urllib.parse import quote, parse_qsl

sys.dont_write_bytecode = True   # no __pycache__ folder in site-src
ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)
import drivers_text as DT   # the /drivers/ page words in six languages
PAGES = os.path.join(ROOT, 'pages')
OUT = os.path.join(os.path.dirname(ROOT), 'site')
MEDIA_MD = os.path.join(ROOT, 'MEDIA.md')
DOMAIN = 'https://24hrcrossdock.com'
PORTAL = 'https://claude.ai/artifact/97haWKtJGFGXW8PjdM9XWv'
# "Open an account" opens the portal's sign-up screen. Check on the staging link that #signup still works inside claude.ai.
PORTAL_SIGNUP = PORTAL + '#signup'
PHONE, TEL, EMAIL = '916-616-3481', 'tel:+19166163481', '24hrcrossdock@gmail.com'

# The unload promise (Nick approved it). Same words as the portal's promise text. Keep the fine print next to it everywhere.
PROMISE = 'Unloaded within 2 hours of check-in'
PROMISE_FINE = 'During dock hours, Mon–Fri 6am–10pm.'
WAIT_GOAL = 30   # minutes; the "waiting" alert fires after this (same as the portal's wait goal)
# Kiosk languages: (code, name in that language, name in English)
LANGS = [('en', 'English', 'English'), ('es', 'Español', 'Spanish'), ('ru', 'Русский', 'Russian'),
         ('uk', 'Українська', 'Ukrainian'), ('pa', 'ਪੰਜਾਬੀ', 'Punjabi'), ('hi', 'हिन्दी', 'Hindi')]
# Docks that have the check-in kiosk tablet. Take a dock out of this list if it has no tablet yet.
KIOSK_DOCKS = ('reno', 'sac', 'pa')

# What the website may promise. Never say a feature works before customers can really use it.
#   'live' = shown as working today
#   'soon' = shown with a "Coming soon" badge
#   'off'  = not shown at all
# Flip a switch here and rebuild when the portal feature ships.
LIVE = {
    'promise': 'live',      # unloaded within 2 hours of check-in, during dock hours (Nick approved)
    'booking': 'live',      # book a truck for any day and time, not a preset slot
    'loads': 'live',        # load details: PO, BOL, pallets, pieces, weight, stackable, hazmat, unload order
    'damage': 'live',       # damage photos and a price to fix; nothing is charged until the customer approves
    'securement': 'live',   # securement check on outbound loads: gear, tags, seal, 5 photos, rating, signature
    'kiosk': 'live',        # driver check-in at the kiosk in 6 languages
    'alerts': 'soon',       # real texts and emails: customer alerts and the door-number text to drivers (no texting service yet)
    'friday': 'soon',       # Friday summary email
    'livecard': 'soon',     # customers watching their trucks live in the portal (steps, wait clock, place in line)
    'eta': 'soon',          # driver ETA link: drivers or customers update the ETA from their own phone
    'autoapprove': 'soon',  # customer setting: damage fixes under $X go through on their own
    'gear': 'soon',         # customers see our load bars and straps that are out with their trucks
}
SOON = '<span class="soon">Coming soon</span>'


def feat(key, html, soon=None, off=''):
    """Show a feature only as far as it really works (see LIVE).
    'live': html.  'soon': `soon` if given, else html, with <!--badge--> turned into a "Coming soon" badge.  'off': `off`.
    An unknown key fails the build on purpose, and so does a 'soon' feature shown without its badge."""
    state = LIVE[key]
    if state == 'live':
        return html.replace('<!--badge-->', '')
    if state == 'soon':
        out = (html if soon is None else soon).replace('<!--badge-->', SOON)
        if out.strip() and SOON not in out:
            raise SystemExit('feat(%r): a "soon" feature is shown without its Coming soon badge: %s' % (key, out[:120]))
        return out
    if state == 'off':
        return off
    raise SystemExit('LIVE[%r] must be live, soon or off' % key)


# ---------------------------------------------------------------------------------------------------------------
# FACTS (PLAN-premium.md §3 is the source; every number on the site comes from here)
# ---------------------------------------------------------------------------------------------------------------
HOURS = 'Mon–Fri 6am–10pm'
AFTER = 'nights and weekends by appointment; after-hours work carries a $100 fee'   # D6 (weekend fee: Nick to confirm)
SINCE = '2015'
SMS = 'sms:+19166163481'
BOOK = ''   # Google Calendar booking-page link. The "Book a call" buttons appear once this is filled in.
GA_ID = ''  # Google Analytics 4 ID (G-XXXXXXXXXX). Visit tracking turns on once this is filled in.
# Real customer quotes for the home page: ('Quote text', 'Name, title', 'Company'). Only with the customer's OK.
TESTIMONIALS = []
# name = what the site calls the dock; city = the town on the address; label = menu name; full = name with the town;
# q = the option text in the quote form's Location list; geo = approximate (schema only; verify on Google Maps).
LOC = {
    'reno': dict(key='reno', name='Reno–Sparks', city='Sparks', region='NV', state='Nevada',
                 label='Reno–Sparks, NV', full='Reno–Sparks, NV', q='Reno–Sparks, NV',
                 street='1095 Spice Islands Dr, Suites 105–106', zip='89431', home='/reno/',
                 sqft='40,000', doors='8', pallets='1,000–3,000', lift='4,500 lb', radius=100, geo=(39.523, -119.724)),
    'sac': dict(key='sac', name='Sacramento', city='North Highlands', region='CA', state='California',
                label='Sacramento, CA', full='Sacramento, CA (North Highlands)', q='Sacramento (North Highlands), CA',
                street='3036 Orange Grove Ave', zip='95660', home='/sacramento/',
                sqft='40,000', doors='8', pallets='500–1,000', lift='4,500 lb', radius=150, geo=(38.684, -121.370)),
    'pa': dict(key='pa', name='Harrisburg', city='Middletown', region='PA', state='Pennsylvania',
               label='Harrisburg, PA', full='Harrisburg, PA (Middletown)', q='Harrisburg (Middletown), PA',
               street='2811 Turnpike Industrial Dr', zip='17057', home='/harrisburg/',
               sqft='25,000', doors='30', pallets='about 500', lift='4,500 lb', radius=150, geo=(40.213, -76.713)),
}
for _L in LOC.values():
    _L['bar'] = '%s, %s, %s · Docks %s · Phone 24/7' % (_L['street'].split(',')[0], _L['city'], _L['region'], HOURS)
# Totals (D1). Never total pallet capacity; never state monthly pallet volume (D2).
TOTAL_DOORS = sum(int(L['doors']) for L in LOC.values())
TOTAL_SQFT = '{:,}'.format(sum(int(L['sqft'].replace(',', '')) for L in LOC.values()))
assert TOTAL_DOORS == 46 and TOTAL_SQFT == '105,000', 'dock door or square foot totals changed: update PLAN §3 first'

# Site managers: fill in name, title, phone, email and a photo path (e.g. /assets/team/reno.jpg) when ready.
# While a name is empty, location pages show a one-line contact strip instead of a manager card.
MANAGERS = {
    'reno': dict(name='', title='Site manager, Reno–Sparks', phone=PHONE, email=EMAIL, photo=''),
    'sac': dict(name='', title='Site manager, Sacramento', phone=PHONE, email=EMAIL, photo=''),
    'pa': dict(name='', title='Site manager, Harrisburg', phone=PHONE, email=EMAIL, photo=''),
}

# Services (§3.1). slug -> name, short (for "X in City" links), noun (for "Get a X quote"), opt (quote form option),
# url (company-wide page), line (one-line definition used in tables).
SVCS = {
    'cross-docking': dict(name='Cross-docking', short='Cross-docking', noun='cross-docking', opt='Cross-docking',
                          url='/cross-docking/', line='Trailer in, sorted by destination, reloaded the same day'),
    'transloading': dict(name='Transloading', short='Transloading', noun='transloading', opt='Transloading / container unloading',
                         url='/transloading/', line="Containers and 53' trailers unloaded, palletized, wrapped, reloaded or stored"),
    'freight-consolidation': dict(name='Freight consolidation', short='Freight consolidation', noun='freight consolidation',
                                  opt='Freight consolidation', url='/freight-consolidation/',
                                  line='Freight from several shippers built into one outbound load'),
    'freight-rework': dict(name='Freight rework', short='Freight rework', noun='freight rework', opt='Freight rework / restack',
                           url='/freight-rework/', line='Leaning, crushed or mixed pallets rebuilt, relabeled and wrapped'),
    'warehousing': dict(name='Warehousing & pallet storage', short='Pallet storage', noun='pallet storage',
                        opt='Pallet storage / warehousing', url='/warehousing/',
                        line='Daily, weekly, monthly or long-term; floor and racked'),
    'pickups-deliveries': dict(name='Pickups & deliveries', short='Pickups & deliveries', noun='pickup or delivery',
                               opt='Third-party pickup or delivery', url='/pickups-deliveries/',
                               line='Our own trucks and drivers, one-time or recurring, within each dock’s radius'),
    'fulfillment': dict(name='Fulfillment & FBA prep', short='Fulfillment', noun='fulfillment', opt='Fulfillment / FBA prep (Reno)',
                        url='/reno/fulfillment/', line='Reno only: pick, pack and ship; Amazon FBA and Walmart WFS prep'),
}
CORE = ['cross-docking', 'transloading', 'freight-consolidation', 'freight-rework', 'warehousing', 'pickups-deliveries']
# Quote form Service list (§5). Old ?svc= values and the slugs map to these (SVC_ALIAS; site.js does the same for outside links).
SVC = [SVCS[s]['opt'] for s in CORE] + [SVCS['fulfillment']['opt'], 'Not sure yet']
LOCOPTS = [L['q'] for L in LOC.values()] + ['Not sure']

# Specialties per dock, in Nick's order: (service slug, card title, one line). 'contract' links to /warehousing/.
SPEC = {
    'sac': [('cross-docking', 'Cross-docking', 'Inbound trailers checked, counted against the BOL, sorted by destination and reloaded the same day at our 8 North Highlands doors.'),
            ('freight-consolidation', 'Freight consolidation', 'LTL pieces and POs from several shippers held on our floor and built into one outbound load, sorted by stop.'),
            ('transloading', 'Transloading', "20' and 40' containers and 53' trailers unloaded, palletized and wrapped, then reloaded or stored. The Port of Stockton is about an hour away."),
            ('freight-rework', 'Freight rework', 'Leaning or mixed pallets rebuilt, relabeled and wrapped, with photos before and after.')],
    'reno': [('cross-docking', 'Cross-docking', 'Trailers unloaded, sorted by destination and reloaded the same day, on I-80 in Sparks.'),
             ('warehousing', '3PL warehousing & pallet storage', 'Room for 1,000–3,000 pallets, floor and racked, by the day, week, month or year.'),
             ('pickups-deliveries', 'Third-party pickups & deliveries', 'Our own trucks and drivers within 100 miles of Sparks, one-time or on a recurring schedule.'),
             ('contract', 'Contract warehousing', 'Long-term space with scheduled inbound, outbound and local deliveries for recurring freight.')],
    'pa': [('cross-docking', 'Cross-docking', '30 dock doors in Middletown for trailer-to-trailer turns, close to I-76, I-283, I-83 and I-81.'),
           ('freight-rework', 'Freight rework', 'Leaning, crushed or mixed pallets rebuilt, sorted, relabeled and wrapped, photographed before and after.'),
           ('freight-consolidation', 'Freight consolidation', 'Freight from several shippers held until the load is complete, then built, wrapped and released to your carrier.')],
}
MORE = {'freight-rework': 'How freight rework works →', 'contract': 'Warehousing and 3PL options →',
        'transloading': 'How transloading works →', 'freight-consolidation': 'How consolidation works →',
        'warehousing': 'Warehousing options →', 'pickups-deliveries': 'How pickups and deliveries work →',
        'cross-docking': 'How cross-docking works →'}


def specs_of(loc):
    return {('warehousing' if s == 'contract' else s) for s, n, l in SPEC[loc]}


# One line per dock and service for <!--loclinks SVC--> (facts from §3 only; drive times always "about")
LL = {
    'cross-docking': {'reno': 'On I-80 in Sparks, in the Northern Nevada distribution corridor. Trailers turned the same day.',
                      'sac': 'North Highlands, next to McClellan Park, with I-80, Business 80 and I-5 close by.',
                      'pa': 'Our most doors: 30 in Middletown, close to the PA Turnpike (I-76), I-283, I-83 and I-81.'},
    'transloading': {'reno': 'Containers and trailers unloaded in Sparks, then stored with us or reloaded.',
                     'sac': 'About an hour from the Port of Stockton and about 2 hours from the Port of Oakland.',
                     'pa': 'The ports of Baltimore and Philadelphia are about 2 hours away; NY/NJ about 3 hours.'},
    'freight-consolidation': {'reno': 'Freight from several shippers built into one load before it heads out on I-80.',
                              'sac': 'A Sacramento specialty: LTL pieces and POs built into one load, sorted by stop.',
                              'pa': 'A Harrisburg specialty: freight held until the load is complete, then released to your carrier.'},
    'freight-rework': {'reno': 'Pallets rebuilt and rewrapped before they ship out or go into storage.',
                       'sac': 'Leaning or mixed pallets rebuilt and relabeled, a Sacramento specialty.',
                       'pa': 'A Harrisburg specialty: crushed, leaning or mixed pallets rebuilt, with photos before and after.'},
    'warehousing': {'reno': 'The most pallet space of our three docks: 1,000–3,000 pallets, floor and racked.',
                    'sac': 'Room for 500–1,000 pallets, by the day, week, month or year.',
                    'pa': 'Room for about 500 pallets, next to 30 doors for cross-dock and storage combined.'},
    'pickups-deliveries': {'reno': 'Our own trucks within 100 miles of Sparks, including Reno and Carson City (about an hour away).',
                           'sac': 'Our own trucks within 150 miles of North Highlands.',
                           'pa': 'Our own trucks within 150 miles of Middletown.'},
}

# Drive times for <!--reach LOC--> (approximate, always "about")
REACH = {
    'sac': [('About 15 min', 'to downtown Sacramento'), ('About 1 hr', 'to the Port of Stockton'),
            ('About 2 hrs', 'to the Bay Area and the Port of Oakland'), ('About 2 hrs', 'to our Sparks dock over I-80')],
    'reno': [('About 1 hr', 'to Carson City'), ('About 2 hrs', 'to Sacramento'), ('About 4 hrs', 'to the Bay Area'),
             ('About a day', 'to most of California, Oregon, Utah and Arizona')],
    'pa': [('About 2 hrs', 'to Philadelphia and Baltimore'), ('About 2 hrs', 'to Washington, DC'),
           ('About 3 hrs', 'to New York and North Jersey'), ('I-76', 'I-283, I-83 and I-81 nearby')],
}

FREIGHT = [('Standard pallets', 'Wrapped or loose, single or stacked, counted against the BOL and photographed at the door.'),
           ('Drums', 'Drums on pallets or loose, banded and strapped for the next leg. Regulated contents: call first.'),
           ('Crates', 'Wooden crates and boxed machinery, moved by forklift and photographed on arrival.'),
           ('Oversized freight', 'Long, wide or awkward pieces. Forklifts rated to 4,500 lb; heavier pieces, call first.'),
           ('Loose cargo', 'Floor-loaded cartons unloaded by hand, palletized, wrapped and labeled.'),
           ('Mixed freight', 'Mixed SKUs and pallet sizes sorted by PO, destination or stop.')]

# ---------------------------------------------------------------------------------------------------------------
# MEDIA: every photo and video slot (D8). Files go in assets/img/<key>.jpg (+ optional .webp) and assets/video/<key>.mp4 (+ .jpg).
# A slot renders nothing until its file exists. ours=True: only Nick's own photo of that dock may fill it.
# Alt text never names a location unless ours=True (checked below). MEDIA.md (the plan for Nick) is written from this.
# ---------------------------------------------------------------------------------------------------------------
MEDIA = {
    'home-hero': dict(alt='', ours=False, size='2400×1350', for_='Home page hero, behind the headline (when there is no video, and on phones)',
                      shot='Wide, low shot down a clean, bright loading dock: trailers backed into a row of dock doors, a forklift carrying a wrapped pallet. No readable company names.'),
    'home-crossdock': dict(alt='Forklift carrying a wrapped pallet between trailers on a cross-dock floor', ours=False, for_='Home page, cross-docking section',
                           shot='A forklift moving a wrapped pallet from one trailer toward another across a clean dock floor, open dock doors behind.'),
    'home-freight': dict(alt='Drums, crates and wrapped pallets staged on a warehouse floor', ours=False, for_='Home page, freight types',
                         shot='Mixed freight staged neatly on a clean concrete floor: drums, wooden crates and wrapped pallets side by side.'),
    'home-warehouse': dict(alt='Pallet racking in a bright, organized warehouse aisle', ours=False, for_='Home page, warehousing and 3PL',
                           shot='Tall pallet racking down a bright, organized aisle with a clean concrete floor.'),
    'home-pickups': dict(alt='Truck backed into a dock door for loading', ours=False, for_='Home page, pickups and deliveries',
                         shot='A clean box truck or tractor-trailer backed into a dock door, being loaded. No visible third-party logos.'),
    'svc-cross-docking': dict(alt='Pallets sorted into outbound lanes on a cross-dock floor', ours=False, for_='Cross-docking pages',
                              shot='Pallets sorted into destination lanes on a dock floor between open dock doors.'),
    'svc-transloading': dict(alt='Cartons being unloaded from a shipping container onto pallets', ours=False, for_='Transloading pages',
                             shot='Workers in safety vests unloading floor-loaded cartons from a shipping container onto pallets.'),
    'svc-consolidation': dict(alt='Labeled pallets from several shippers lined up for one outbound trailer', ours=False, for_='Freight consolidation pages',
                              shot='Several different shipments built into one load: labeled pallets lined up at an open trailer.'),
    'svc-rework': dict(alt='Worker restacking and stretch-wrapping a pallet', ours=False, for_='Freight rework pages',
                       shot='A worker restacking a pallet and stretch-wrapping it, corner boards visible.'),
    'svc-warehousing': dict(alt='Wrapped pallets stored in pallet racking', ours=False, for_='Warehousing and pallet storage pages',
                            shot='A long aisle of pallet racking full of wrapped pallets, a forklift in the distance.'),
    'svc-pickups': dict(alt='Delivery truck at a receiving dock door', ours=False, for_='Pickups and deliveries pages',
                        shot='A delivery truck at a customer receiving door or on the road. No visible third-party logos.'),
    'svc-freight': dict(alt='Forklift moving a large wooden crate', ours=False, for_='"Built to handle more than standard pallets" section',
                        shot='Oversized or odd freight: a large wooden crate or a long piece being moved by forklift.'),
}
for _k, _L in LOC.items():
    _t = '%s, %s' % (_L['city'], _L['region'])
    MEDIA['loc-%s-hero' % _k] = dict(alt='', ours=True, size='2400×1350', for_='%s page hero, behind the headline' % _L['label'],
                                     shot='Your %s dock from the yard: building and dock doors with trailers backed in. No customer names on trailers.' % _L['city'])
    MEDIA['loc-%s-dock' % _k] = dict(alt='Unloading a trailer at our %s dock' % _t, ours=True, for_='%s pages, dock section' % _L['label'],
                                     shot='Inside the %s dock: open doors, a trailer being unloaded, crew in safety vests.' % _L['city'])
    MEDIA['loc-%s-floor' % _k] = dict(alt='Pallets stored on the floor of our %s warehouse' % _t, ours=True, for_='%s pages, storage section' % _L['label'],
                                      shot='The %s warehouse floor: racking or floor-stacked pallets, clean and well lit.' % _L['city'])
# Hero videos (assets/video/<key>.mp4 + <key>.jpg poster). Only the pages that carry <!--video KEY--> show them.
VIDEO = {'main': dict(ours=False, for_='Home page hero video',
                      shot='10–20 s, real footage: forklifts moving pallets, trucks at dock doors, freight moving between trailers, pallets going into racking, a wide shot of a clean facility. Seamless loop, no music.')}
for _k, _L in LOC.items():
    VIDEO[_k] = dict(ours=True, for_='%s page hero video (optional)' % _L['label'],
                     shot='10–20 s at your %s dock: a trailer at a door, a forklift unloading, the floor. Seamless loop, no music.' % _L['city'])
VALIAS = {'home': 'main', 'home-hero': 'main', 'sacramento': 'sac', 'harrisburg': 'pa'}
_PLACES = re.compile(r'reno|sparks|sacramento|north highlands|harrisburg|middletown|nevada|california|pennsylvania|\bNV\b|\bCA\b|\bPA\b', re.I)
for _k, _M in MEDIA.items():
    assert _M['ours'] or not _PLACES.search(_M['alt']), 'MEDIA[%s]: alt text names a location but the slot is not ours' % _k
USED = {}   # media key -> pages that carry its marker (for MEDIA.md)

NAV_MAIN = [('/reno/', 'Reno, NV'), ('/sacramento/', 'Sacramento, CA'), ('/harrisburg/', 'Harrisburg, PA'),
            ('/services/', 'Services'), ('/client-portal/', 'Client Portal'), ('/about/', 'About')]
NAV_RENO = [('/reno/pallet-storage/', 'Storage'), ('/reno/cross-docking/', 'Cross-Docking'), ('/reno/pickups-deliveries/', 'Pickups &amp; Deliveries'),
            ('/reno/transloading/', 'Transloading'), ('/reno/fulfillment/', 'Fulfillment'), ('/locations/', 'Locations')]

# old single-page hash links -> real URLs
HASH = {'#/': '/reno/', '#/fulfillment': '/reno/fulfillment/', '#/cross-dock': '/reno/cross-docking/',
        '#/technology': '/client-portal/', '#/get-started': '/get-started/', '#/company': '/about/',
        '#/quote': '/quote/', '#/locations': '/locations/', '#/sacramento': '/sacramento/',
        '#/middletown': '/harrisburg/', '#/pallet-storage-reno': '/reno/pallet-storage/', '#/fba-prep-reno': '/reno/fba-prep/'}
# renamed URLs (D3, D4): old links inside fragments are rewritten; netlify.toml redirects visitors
RENAMED = {'/middletown/': '/harrisburg/', '/reno/cross-dock/': '/reno/cross-docking/', '/reno/transload/': '/reno/transloading/',
           '/reno/delivery/': '/reno/pickups-deliveries/', '/technology/': '/client-portal/'}
# old ?loc= / ?svc= values (and short forms) -> the quote form's option texts (lower-case keys)
LOC_ALIAS = {}
for _k, _words in (('reno', ['reno', 'sparks', 'reno, nv', 'sparks, nv', 'reno-sparks', 'reno–sparks', 'reno-sparks, nv', 'reno–sparks, nv', 'nv']),
                   ('sac', ['sac', 'sacramento', 'north highlands', 'sacramento, ca', 'north highlands, ca', 'sacramento area, ca', 'ca']),
                   ('pa', ['pa', 'harrisburg', 'middletown', 'harrisburg, pa', 'middletown, pa', 'harrisburg area, pa'])):
    for _w in _words + [LOC[_k]['q'].lower()]:
        LOC_ALIAS[_w] = LOC[_k]['q']
LOC_ALIAS['not sure'] = 'Not sure'
SVC_ALIAS = {}
for _s, _words in (('cross-docking', ['cross-dock', 'cross dock', 'crossdock', 'cross-docking', 'cross docking']),
                   ('transloading', ['transload', 'transloading', 'container unloading', 'transload / container unloading', 'container unloading / transload']),
                   ('freight-consolidation', ['consolidation', 'freight consolidation', 'freight-consolidation']),
                   ('freight-rework', ['rework', 'restack', 'restack / rework', 'restack and rework', 'freight rework', 'freight-rework']),
                   ('warehousing', ['storage', 'pallet storage', 'warehousing', '3pl', 'long-term pallet storage', 'short-term pallet storage', 'pallet-storage']),
                   ('pickups-deliveries', ['delivery', 'deliveries', 'pickup', 'pickups', 'pickups-deliveries', 'pickup or delivery', 'pickups & deliveries']),
                   ('fulfillment', ['fulfillment', 'order fulfillment', 'fba', 'fba prep', 'fba-prep', 'amazon fba / walmart prep'])):
    for _w in _words + [SVCS[_s]['opt'].lower()]:
        SVC_ALIAS[_w] = SVCS[_s]['opt']
SVC_ALIAS.update({'not sure': 'Not sure yet', 'not sure yet': 'Not sure yet'})


def tpl(html):
    """Fill in the page fragments:
    {PHONE} {TEL} {SMS} {EMAIL} {PORTAL} {PORTAL_SIGNUP} {PROMISE} {PROMISE_FINE} {HOURS} {AFTER} {WAIT_GOAL}
    and feature blocks:  <!--feat KEY-->shown when live<!--if-soon-->shown when soon<!--if-off-->shown when off<!--/feat-->
    (the if-soon and if-off parts are optional; without if-soon the live part is shown with its badge),
    and plain switches:  <!--if KEY-->shown when live or soon<!--else-->shown when off<!--/if-->  (no badge; for step numbers)."""
    for k, v in (('{PHONE}', PHONE), ('{TEL}', TEL), ('{SMS}', SMS), ('{EMAIL}', EMAIL), ('{PORTAL_SIGNUP}', PORTAL_SIGNUP),
                 ('{PORTAL}', PORTAL), ('{PROMISE_FINE}', PROMISE_FINE), ('{PROMISE}', PROMISE), ('{HOURS}', HOURS),
                 ('{AFTER}', AFTER), ('{WAIT_GOAL}', str(WAIT_GOAL))):
        html = html.replace(k, v)

    def one(m):
        body, soon, off = m.group(2), None, ''
        if '<!--if-off-->' in body:
            body, off = body.split('<!--if-off-->', 1)
        if '<!--if-soon-->' in body:
            body, soon = body.split('<!--if-soon-->', 1)
        return feat(m.group(1), body, soon, off)
    block = re.compile(r'<!--feat (\w+)-->((?:(?!<!--feat ).)*?)<!--/feat-->', re.S)   # innermost first, so blocks can nest
    while block.search(html):
        html = block.sub(one, html)
    # plain switch for small bits such as a step number:  <!--if KEY-->shown when live or soon<!--else-->shown when off<!--/if-->
    def plain(m):
        if LIVE[m.group(1)] not in ('live', 'soon', 'off'):
            raise SystemExit('LIVE[%r] must be live, soon or off' % m.group(1))
        return (m.group(3) or '') if LIVE[m.group(1)] == 'off' else m.group(2)
    html = re.sub(r'<!--if (\w+)-->(.*?)(?:<!--else-->(.*?))?<!--/if-->', plain, html, flags=re.S)
    if re.search(r'<!--(feat |/feat|if-soon|if-off|if |else|/if)', html) or re.search(r'\{[A-Z_]+\}', html):
        raise SystemExit('Unmatched feature block or unknown {PLACEHOLDER} in a page fragment')
    return html


def load(name):
    """Read a fragment. Returns (body, meta) with the <!--title: ...--> and <!--desc: ...--> lines read and stripped,
    or (None, {}) when the file does not exist yet."""
    p = os.path.join(PAGES, name)
    if not os.path.exists(p):
        return None, {}
    src, meta = open(p, encoding='utf-8').read(), {}
    while True:
        m = re.match(r'\s*<!--\s*(title|desc)\s*:\s*(.*?)\s*-->[ \t]*\n?', src, re.S)
        if not m:
            break
        meta[m.group(1)], src = m.group(2), src[m.end():]
    return tpl(src), meta


def esc(s):
    return html_lib.escape(s, quote=False)


def attr(s):
    return html_lib.escape(html_lib.unescape(s), quote=True)


def cap(s):
    return s[0].upper() + s[1:]


def qurl(loc=None, svc=None):
    """Quote page link pre-filled with a location and a service (as an HTML attribute value)."""
    ps = (['loc=' + quote(LOC[loc]['q'], safe='')] if loc else []) + (['svc=' + quote(SVCS[svc]['opt'], safe='')] if svc else [])
    return '/quote/' + ('?' + '&amp;'.join(ps) if ps else '')


def fix(html, loc=None, svc=None):
    """Rewrite old hash links and renamed URLs, map old ?loc=/?svc= values to the form's options,
    point plain quote buttons at the page's location and service, drop the old mailto note."""
    html = re.sub(r'\sdata-go="[^"]*"', '', html)
    html = re.sub(r'href="#/quote\?loc=([^"]*)"', r'href="/quote/?loc=\1"', html)
    html = re.sub(r'href="(#/[a-z-]*)"', lambda m: 'href="%s"' % HASH.get(m.group(1), m.group(1)), html)
    html = re.sub(r'href="(%s)' % '|'.join(re.escape(u) for u in RENAMED), lambda m: 'href="' + RENAMED[m.group(1)], html)

    def q(m):
        out = []
        for k, v in parse_qsl(html_lib.unescape(m.group(1)), keep_blank_values=True):
            if k == 'loc':
                v = LOC_ALIAS.get(v.strip().lower(), v)
            elif k == 'svc':
                v = SVC_ALIAS.get(v.strip().lower(), v)
            out.append('%s=%s' % (k, quote(v, safe='')))
        return 'href="/quote/?%s%s"' % ('&amp;'.join(out), m.group(2) or '')
    html = re.sub(r'href="/quote/\?([^"#]*)(#[^"]*)?"', q, html)
    if loc or svc:
        html = html.replace('href="/quote/"', 'href="%s"' % qurl(loc, svc))
    html = html.replace('<small>Opens your email with the details filled in.</small>', '')
    return html


def locsel(default):
    opts = ''.join('<option%s>%s</option>' % (' selected' if v == default else '', v) for v in LOCOPTS)
    return '<label>Location<select name="Location">%s</select></label>' % opts


NEXT = ('<div class="next"><b>What happens next</b><ol><li>We call you back within one hour, day or night.</li>'
        '<li>We confirm the details. About 10 minutes.</li><li>You get your rates in writing.</li></ol></div>')


def forms(html, page, default_loc, page_svc=None):
    """Every quote form is the same two-step Netlify form: four quick fields, then optional details.
    Netlify emails each submission to the office (set the notification up in Netlify > Forms)."""
    def one(m):
        attrs, body = m.group(1), m.group(2)
        src = re.search(r'data-src="([^"]*)"', attrs)
        src = src.group(1) if src else page
        name = 'quote-' + re.sub(r'[^a-z0-9]+', '-', src.lower()).strip('-')
        attrs = re.sub(r'\sdata-src="[^"]*"', '', attrs)   # keep id: buttons may link to #quote
        head = '\n      '.join(re.findall(r'<h2>.*?</h2>|<p class="fs">.*?</p>', body))
        svc = (SVCS[page_svc]['opt'] if page_svc else SVCS['warehousing']['opt'] if 'storage' in src.lower()
               else SVCS['fulfillment']['opt'] if 'FBA' in src else SVCS['cross-docking']['opt'])
        svcs = ''.join('<option%s>%s</option>' % (' selected' if v == svc else '', v) for v in SVC)
        fba = ('\n        <label>Units per month<input name="Units per month" inputmode="numeric" placeholder="5,000"></label>'
               '\n        <label>SKUs<input name="SKUs" inputmode="numeric" placeholder="25"></label>') if 'FBA' in src else ''
        return f'''<form{attrs} name="{name}" method="POST" action="/thanks/" data-netlify="true" netlify-honeypot="bot-field">
      <input type="hidden" name="form-name" value="{name}"><input type="hidden" name="Page" value="{page}">
      <p class="hp"><label>Leave this empty<input name="bot-field"></label></p>
      {head}
      <label>Your name<input name="Name" required autocomplete="name"></label>
      <label>Phone<input name="Phone" type="tel" required autocomplete="tel"></label>
      {locsel(default_loc)}
      <label>Service<select name="Service">{svcs}</select></label>
      <details class="more"><summary>Add details <span>(optional)</span></summary><div class="mgrid">
        <label>Company<input name="Company" autocomplete="organization"></label>
        <label>Email<input name="Email" type="email" autocomplete="email"></label>
        <label>Pallets<input name="Pallets" inputmode="numeric" placeholder="e.g. 26"></label>
        <label>How long to store<select name="How long"><option>Not sure</option><option>Not storing</option><option>Under 1 month</option><option>1 to 3 months</option><option>3 to 12 months</option><option>Over a year</option></select></label>
        <label>Inbound<select name="Inbound type"><option>Palletized trailer</option><option>Floor-loaded container</option><option>Floor-loaded trailer</option><option>Mixed / not sure</option></select></label>{fba}
        <label class="f">Anything else<textarea name="Details" placeholder="Commodity, pallet size and weight, pickup and delivery cities, dates"></textarea></label>
      </div></details>
      <button class="btn r" type="submit">Get my quote</button>
      <p class="fnote">We call you back within one hour, 24/7. Or call <a href="{TEL}">{PHONE}</a>.</p>
      {NEXT if '<div class="next">' in body else ''}
    </form>'''
    return re.sub(r'<form([^>]*)>(.*?)</form>', one, html, flags=re.S)


# ---------------------------------------------------------------------------------------------------------------
# Schema (§8)
# ---------------------------------------------------------------------------------------------------------------
def meters(miles):
    return round(miles * 1609.344)


def circle(loc):
    L = LOC[loc]
    return {'@type': 'GeoCircle', 'geoMidpoint': {'@type': 'GeoCoordinates', 'latitude': L['geo'][0], 'longitude': L['geo'][1]},
            'geoRadius': meters(L['radius'])}


def biz(loc):
    L = LOC[loc]
    return {'@context': 'https://schema.org', '@type': 'LocalBusiness', 'additionalType': 'https://schema.org/Warehouse',
            '@id': DOMAIN + L['home'] + '#dock', 'name': '24 HR Crossdock – ' + L['full'], 'url': DOMAIN + L['home'],
            'telephone': '+1-916-616-3481', 'email': EMAIL,
            'address': {'@type': 'PostalAddress', 'streetAddress': L['street'], 'addressLocality': L['city'],
                        'addressRegion': L['region'], 'postalCode': L['zip'], 'addressCountry': 'US'},
            'geo': {'@type': 'GeoCoordinates', 'latitude': L['geo'][0], 'longitude': L['geo'][1]},
            'areaServed': circle(loc),
            'openingHoursSpecification': [{'@type': 'OpeningHoursSpecification', 'dayOfWeek': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                                           'opens': '06:00', 'closes': '22:00'}],
            'parentOrganization': {'@type': 'Organization', 'name': '24 HR Crossdock', 'url': DOMAIN + '/'}}


def service_ld(svc, url, name, loc=None):
    if loc:
        L = LOC[loc]
        provider = {'@type': 'LocalBusiness', '@id': DOMAIN + L['home'] + '#dock', 'name': '24 HR Crossdock – ' + L['full'], 'url': DOMAIN + L['home']}
        area = circle(loc)
    else:
        provider = {'@type': 'Organization', 'name': '24 HR Crossdock', 'url': DOMAIN + '/'}
        area = [circle(k) for k in LOC if svc != 'fulfillment' or k == 'reno']
    return {'@context': 'https://schema.org', '@type': 'Service', 'name': name, 'serviceType': SVCS[svc]['name'],
            'url': DOMAIN + url, 'provider': provider, 'areaServed': area}


ORG = {'@context': 'https://schema.org', '@type': 'Organization', 'name': '24 HR Crossdock', 'url': DOMAIN + '/',
       'telephone': '+1-916-616-3481', 'email': EMAIL, 'foundingDate': SINCE,
       'department': [{'@type': 'LocalBusiness', '@id': DOMAIN + LOC[k]['home'] + '#dock', 'name': '24 HR Crossdock – ' + LOC[k]['full'],
                       'url': DOMAIN + LOC[k]['home']} for k in LOC]}


def crumbs(trail):
    return {'@context': 'https://schema.org', '@type': 'BreadcrumbList',
            'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': DOMAIN + u} for i, (u, n) in enumerate(trail)]}


def faq_ld(body):
    """FAQPage schema built from the page's own visible questions, so the two always match. Badges are left out."""
    i = body.find('<div class="faq">')
    if i < 0:
        return None
    region = body[i:]
    end = region.find('</section>')
    region = region if end < 0 else region[:end]
    def txt(s):
        s = s.replace(SOON, '')
        return html_lib.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', s))).strip()
    qa = re.findall(r'<details><summary>(.*?)</summary>(.*?)</details>', region, re.S)
    if not qa:
        return None
    return {'@context': 'https://schema.org', '@type': 'FAQPage',
            'mainEntity': [{'@type': 'Question', 'name': txt(q), 'acceptedAnswer': {'@type': 'Answer', 'text': txt(a)}} for q, a in qa]}


ICON = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='8' fill='%230B1B30'/%3E"
        "%3Crect x='8' y='8' width='48' height='48' rx='6' fill='%23C2410C'/%3E%3Ctext x='32' y='43' text-anchor='middle' font-family='Arial Narrow,Arial' "
        "font-weight='800' font-size='30' fill='white'%3E24%3C/text%3E%3C/svg%3E")


# ---------------------------------------------------------------------------------------------------------------
# Media markers
# ---------------------------------------------------------------------------------------------------------------
def imgsize(path):
    """(width, height) read from a JPEG or PNG header, or None."""
    try:
        d = open(path, 'rb').read()
        if d[:8] == b'\x89PNG\r\n\x1a\n':
            return struct.unpack('>II', d[16:24])
        if d[:2] == b'\xff\xd8':
            i = 2
            while i + 9 < len(d):
                if d[i] != 0xFF:
                    i += 1
                    continue
                mk = d[i + 1]
                if mk == 0xFF:
                    i += 1
                    continue
                if mk in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                    h, w = struct.unpack('>HH', d[i + 5:i + 9])
                    return w, h
                if mk in (0xD8, 0x01) or 0xD0 <= mk <= 0xD7:
                    i += 2
                    continue
                i += 2 + struct.unpack('>H', d[i + 2:i + 4])[0]
    except (OSError, struct.error):
        pass
    return None


def asset(*p):
    return os.path.join(ROOT, 'assets', *p)


def img(key, opt, url):
    """<!--img KEY [r32|r169|r45|hero]--> -> a photo, or nothing while the file is missing."""
    M = MEDIA[key]
    USED.setdefault(key, set()).add(url)
    jpg = asset('img', key + '.jpg')
    if not os.path.exists(jpg):
        return ''
    if opt == 'hero':
        return '<img class="hv" src="/assets/img/%s.jpg" alt="" aria-hidden="true" fetchpriority="high">' % key
    w, h = imgsize(jpg) or {'r169': (2400, 1350), 'r45': (1600, 2000)}.get(opt, (2400, 1600))
    webp = '<source type="image/webp" srcset="/assets/img/%s.webp">' % key if os.path.exists(asset('img', key + '.webp')) else ''
    cap_ = '<figcaption>%s</figcaption>' % esc(M['caption']) if M.get('caption') else ''
    return ('<figure class="ph %s"><picture>%s<img src="/assets/img/%s.jpg" alt="%s" width="%d" height="%d" loading="lazy" decoding="async">'
            '</picture>%s</figure>' % (opt or 'r32', webp, key, attr(M['alt']), w, h, cap_))


def video(key, url):
    """<!--video KEY--> inside a hero -> the hero video (site.js loads it), its poster as a still, or nothing."""
    USED.setdefault('video:' + key, set()).add(url)
    mp4, jpg = asset('video', key + '.mp4'), asset('video', key + '.jpg')
    if os.path.exists(mp4):
        poster = ' poster="/assets/video/%s.jpg"' % key if os.path.exists(jpg) else ''
        return '<video class="hv" muted loop playsinline preload="none"%s data-src="/assets/video/%s.mp4" aria-hidden="true"></video>' % (poster, key)
    if os.path.exists(jpg):
        return '<img class="hv" src="/assets/video/%s.jpg" alt="" aria-hidden="true" fetchpriority="high">' % key
    return ''


HV = r'<video class="hv"[^>]*></video>|<img class="hv"[^>]*>'


def hero_media(html):
    """Move the hero's first video/photo to the top of its <section class="hero ..."> and add class hasv (the dark overlay).
    A video (or its poster) placed before a hero photo wins; later ones are dropped."""
    def one(m):
        cls, body = m.group(1), m.group(2)
        hv = re.findall(HV, body)
        if not hv:
            return m.group(0)
        return '<section class="hero%s hasv">\n  %s%s</section>' % (cls, hv[0], re.sub(HV, '', body))
    return re.sub(r'<section class="hero([^"]*)">(.*?)</section>', one, html, flags=re.S)


# ---------------------------------------------------------------------------------------------------------------
# Block markers (§5.2)
# ---------------------------------------------------------------------------------------------------------------
def maps(loc):
    L = LOC[loc]
    return 'https://www.google.com/maps/search/?api=1&amp;query=' + ('%s, %s, %s %s' % (L['street'], L['city'], L['region'], L['zip'])).replace(' ', '+').replace(',', '%2C')


def addr(loc, sep='<br>'):
    L = LOC[loc]
    return '%s%s%s, %s %s' % (L['street'], sep, L['city'], L['region'], L['zip'])


def facts(loc):
    L = LOC[loc]
    return f"""<section class="facts f7"><div class="w"><dl>
  <div><dt>{L['doors']}</dt><dd>dock doors</dd></div>
  <div><dt>{L['sqft']}</dt><dd>square feet</dd></div>
  <div><dt>{cap(L['pallets'])}</dt><dd>pallet storage capacity</dd></div>
  <div><dt>{L['lift']}</dt><dd>forklift capacity</dd></div>
  <div><dt>{L['radius']} miles</dt><dd>pickups and deliveries on our own trucks</dd></div>
  <div><dt>{HOURS}</dt><dd>{cap(AFTER)}. Phone answered 24/7.</dd></div>
  <div><dt class="ad">{addr(loc)}</dt><dd><a href="{maps(loc)}" rel="noopener">Get directions</a></dd></div>
</dl></div></section>"""


def svc_url(loc, svc):
    """The page for a service at a dock: its own location page when there is one, else the company-wide page."""
    if svc == 'contract':
        return SVCS['warehousing']['url']
    return LOCSVC.get((loc, svc)) or SVCS[svc]['url']


def specialties(loc):
    L = LOC[loc]
    arts = ''
    for i, (svc, title, line) in enumerate(SPEC[loc], 1):
        u = svc_url(loc, svc)
        more = '%s in %s →' % (SVCS[svc]['short'], L['name']) if (loc, svc) in LOCSVC else MORE[svc]
        arts += f'\n      <article><span class="num">{i}</span><h3><a href="{u}">{title}</a></h3><p>{line}</p><p class="more"><a href="{u}">{more}</a></p></article>'
    return f"""<section class="s spec">
  <div class="w">
    <div class="intro rv"><h2>What {L['name']} does best</h2><p>Every core service runs at all three docks. These {len(SPEC[loc])} are what our {L['city']} dock leads with.</p></div>
    <div class="cards three rv">{arts}
    </div>
  </div>
</section>"""


ALSO = {'transloading': "Containers and 53' trailers unloaded, palletized, wrapped, reloaded or stored",
        'freight-consolidation': 'Freight from several shippers built into one outbound load',
        'freight-rework': 'Pallets rebuilt, relabeled and wrapped; nothing extra is charged until you approve it',
        'warehousing': 'Room for {pallets} pallets: daily, weekly, monthly or long-term',
        'pickups-deliveries': 'Our own trucks within {radius} miles, one-time or recurring'}


def also(loc):
    L = LOC[loc]
    rows = ''
    for s in [s for s in CORE if s not in specs_of(loc)]:
        rows += '\n      <li><b><a href="%s">%s</a></b><span>%s</span></li>' % (svc_url(loc, s), SVCS[s]['name'], ALSO[s].format(**L))
    if loc == 'reno':
        rows += ('\n      <li><b><a href="/reno/fulfillment/">Fulfillment</a></b><span>Pick, pack and ship from our Sparks warehouse</span></li>'
                 '\n      <li><b><a href="/reno/fba-prep/">FBA prep</a></b><span>Amazon FBA and Walmart WFS prep, Reno only</span></li>')
    return f"""<section class="s a also">
  <div class="w split">
    <div class="l">
      <h2>Everything else we do in {L['name']}</h2>
      <p>Not a specialty here doesn't mean not offered. Every job gets the same receiving standard: seal checked, counted against the BOL and photographed at the door.</p>
    </div>
    <ul class="rows">{rows}
    </ul>
  </div>
</section>"""


def freight(url):
    cards = ''.join('\n      <article><h3>%s</h3><p>%s</p></article>' % c for c in FREIGHT)
    pic = img('svc-freight', '', url)
    return f"""<section class="s freight">
  <div class="w">
    <div class="intro rv"><h2>Built to handle more than standard pallets</h2><p>Brokers, carriers, manufacturers, distributors and shippers send us whatever the load holds. One dock that handles all of it means fewer handoffs and fewer calls.</p></div>
    {pic}<div class="cards three rv">{cards}
    </div>
    <p class="fine">Dry freight only, no temperature control. Forklifts rated to 4,500 lb; heavier pieces, call first. Hazmat or other regulated freight: call first.</p>
  </div>
</section>"""


def storage(loc):
    L = LOC[loc]
    if loc == 'reno':
        h2, more = '3PL warehousing and pallet storage in Reno–Sparks', ('/reno/pallet-storage/', 'Warehousing in Reno–Sparks')
        lead = ('The most pallet space of our three docks. Overflow by the day or week, monthly storage, or long-term contract warehousing '
                'with scheduled inbound, outbound and local deliveries. Counted and photographed on arrival.')
    else:
        h2, more = 'Pallet storage in %s' % L['name'], ('/warehousing/', 'Warehousing options')
        lead = ('Overflow for a few days or steady stock for a year. Dry freight, floor and racked, counted and photographed on arrival, '
                'and combined with cross-docking when you need both.')
    return f"""<section class="s store">
  <div class="w split">
    <div class="l">
      <span class="tag">Warehousing &amp; storage</span>
      <h2>{h2}</h2>
      <p>{lead}</p>
      <p class="ctas2"><a class="btn r" href="{qurl(loc, 'warehousing')}">Get a storage quote</a><a class="btn o" href="{more[0]}">{more[1]}</a></p>
    </div>
    <ul class="rows">
      <li><b>Capacity</b><span>Room for {L['pallets']} pallets</span></li>
      <li><b>Any term</b><span>Daily, weekly, monthly or long-term</span></li>
      <li><b>Floor and racked</b><span>Block-stacked or in pallet racking</span></li>
      <li><b>Billed weekly</b><span>No minimums, no long contract required</span></li>
      <li><b>Releases</b><span>To any carrier, or our own trucks within {L['radius']} miles</span></li>
      <li><b>Fully insured</b><span>Certificate of insurance on request</span></li>
    </ul>
  </div>
</section>"""


def pickups(loc):
    L = LOC[loc]
    how = LOCSVC.get((loc, 'pickups-deliveries')) or SVCS['pickups-deliveries']['url']
    return f"""<section class="s pk">
  <div class="w split">
    <div class="l">
      <span class="tag">Pickups &amp; deliveries</span>
      <h2>Pickups and deliveries within {L['radius']} miles of {L['name']}</h2>
      <p>Our own trucks and drivers move freight between our {L['city']} dock and shippers, receivers and warehouses within {L['radius']} miles, one time or on a schedule.</p>
      <p class="ctas2"><a class="btn r" href="{qurl(loc, 'pickups-deliveries')}">Get a pickup or delivery quote</a><a class="btn o" href="{how}">How it works</a></p>
    </div>
    <ul class="rows">
      <li><b>One-time</b><span>A single pickup or delivery, quoted before we go</span></li>
      <li><b>Recurring</b><span>Scheduled runs on the days you set</span></li>
      <li><b>Windows confirmed first</b><span>We confirm the pickup or delivery window with you</span></li>
      <li><b>Signed proof of delivery</b><span>Every delivery signed for</span></li>
      <li><b>Tied to the dock</b><span>Cross-dock, storage, consolidation and rework in one move</span></li>
    </ul>
  </div>
</section>"""


def loclinks(svc):
    S = SVCS[svc]
    arts = ''
    for k, L in LOC.items():
        own = LOCSVC.get((k, svc))
        tag = 'Specialty' if svc in specs_of(k) else 'Offered here'
        btn = '%s in %s' % (S['short'], L['name']) if own else 'See the %s dock' % L['name']
        arts += f"""
      <article><span class="tag">{tag}</span><h3>{L['label']}</h3><p class="lsub">{L['doors']} dock doors · {L['sqft']} sq ft</p><p>{LL[svc][k]}</p><div class="lbtns"><a class="btn r" href="{own or L['home']}">{btn}</a></div></article>"""
    return f"""<section class="s a loclinks">
  <div class="w">
    <div class="intro rv"><h2>{S['name']} at each dock</h2><p>All three docks offer {S['name'].lower().replace('&', 'and')}, with the same receiving standard. Pick the one closest to your freight.</p></div>
    <div class="loccards rv">{arts}
    </div>
  </div>
</section>"""


def cta(svc, loc=None):
    return '<a class="btn r" href="%s">Get a %s quote</a>' % (qurl(loc, svc), SVCS[svc]['noun'])


def reach(loc):
    return ('<div class="facts3">%s</div><p class="fine">Drive times are approximate and depend on traffic.</p>'
            % ''.join('<div><b>%s</b><span>%s</span></div>' % r for r in REACH[loc]))


def svctable():
    """Services by dock (★ specialty, ✓ offered) plus the fixed facts, one table. Phones see it stacked (CSS)."""
    heads = ''.join('<th scope="col"><a href="%s">%s</a></th>' % (L['home'], L['label']) for L in LOC.values())
    rows = ''
    for s in CORE + ['fulfillment']:
        S, cells = SVCS[s], ''
        for k, L in LOC.items():
            if s == 'fulfillment' and k != 'reno':
                cells += '<td class="n" data-l="%s">–<span class="vh"> not offered</span></td>' % L['name']
                continue
            star = s in specs_of(k)
            mark, word = ('★', 'specialty') if star else ('✓', 'offered')
            own = LOCSVC.get((k, s))
            inner = ('<a href="%s">%s<span class="vh"> %s in %s</span></a>' % (own, mark, word, L['name']) if own
                     else '%s<span class="vh"> %s</span>' % (mark, word))
            cells += '<td class="%s" data-l="%s">%s</td>' % ('s' if star else 'y', L['name'], inner)
        rows += '<tr><th scope="row"><a href="%s">%s</a><span>%s</span></th>%s</tr>' % (S['url'], S['name'], S['line'], cells)
    fx = [('Dock doors', lambda L: L['doors']), ('Square feet', lambda L: L['sqft']), ('Pallet storage', lambda L: cap(L['pallets'])),
          ('Forklifts', lambda L: 'Rated to ' + L['lift']), ('Pickups &amp; deliveries', lambda L: 'Within %d miles' % L['radius']),
          ('Dock hours', lambda L: HOURS)]
    frows = ''.join('<tr><th scope="row">%s</th>%s</tr>' % (n, ''.join('<td data-l="%s">%s</td>' % (L['name'], f(L)) for L in LOC.values())) for n, f in fx)
    return f"""<div class="tbl"><table class="svct dk">
      <caption class="vh">Services and facility facts at each 24 HR Crossdock dock</caption>
      <thead><tr><th scope="col">Service</th>{heads}</tr></thead>
      <tbody>{rows}</tbody>
      <tbody class="fx"><tr class="sub"><th scope="rowgroup" colspan="4">The docks</th></tr>{frows}</tbody>
    </table></div>
    <p class="fine">★ specialty at that dock · ✓ offered · – not offered. Every core service runs at every dock. Docks open {HOURS}; {AFTER}. Phone answered 24/7.</p>"""


def mgr_intro(loc):
    """Line next to the manager card. "One person" only once a manager's name is filled in."""
    who = 'One person who knows your freight.' if MANAGERS[loc]['name'] else 'The people who run this dock.'
    return who + ' Tap the card for a direct line, email, directions and hours.'


def manager(loc):
    L, M = LOC[loc], MANAGERS[loc]
    name = M['name'] or 'The %s dock team' % L['name']
    digits = re.sub(r'\D', '', M['phone'])[-10:]
    pic = '<img src="%s" alt="%s" loading="lazy">' % (M['photo'], M['name']) if M['photo'] else '<span class="mi" aria-hidden="true">%s</span>' % (''.join(w[0] for w in M['name'].split()[:2]) if M['name'] else '24')
    return f"""<details class="mgr">
  <summary>{pic}<span class="mt"><small>Your {L['name']} contact</small><b>{name}</b><em>{M['title'] if M['name'] else 'Direct line, email and directions'}</em></span><i aria-hidden="true">+</i></summary>
  <dl>
    <dt>Call</dt><dd><a href="tel:+1{digits}">{M['phone']}</a></dd>
    <dt>Email</dt><dd><a href="mailto:{M['email']}">{M['email']}</a></dd>
    <dt>Dock</dt><dd>{addr(loc)}<br><a href="{maps(loc)}" rel="noopener">Get directions</a></dd>
    <dt>Hours</dt><dd>{HOURS}<br>{cap(AFTER)}</dd>
  </dl>
</details>"""


def manager_block(loc):
    """<!--manager LOC-->: the manager card once MANAGERS has a name; until then one compact contact line."""
    L, M = LOC[loc], MANAGERS[loc]
    if not M['name']:
        digits = re.sub(r'\D', '', M['phone'])[-10:]
        return f"""<section class="mline"><div class="w"><p><b>Talk to the {L['name']} dock</b><a href="tel:+1{digits}">Call {M['phone']}</a><span>answered 24/7</span><a href="mailto:{M['email']}">Email us</a><a href="{maps(loc)}" rel="noopener">Get directions</a></p></div></section>"""
    return f"""<section class="s a">
  <div class="w split">
    <div class="l">
      <h2>Talk to the {L['name']} dock</h2>
      <p>{mgr_intro(loc)}</p>
    </div>
    {manager(loc)}
  </div>
</section>"""


def nested(html, pos):
    return html[:pos].count('<section') > html[:pos].count('</section>')


def markers(html, url, loc=None):
    """Expand the <!--markers--> of PLAN §5.2. A marker with a bad name or argument is left in place, and check() fails on it."""
    def one(m):
        name, args = m.group(1), (m.group(2) or '').split()
        try:
            if name == 'img' and len(args) in (1, 2) and args[0] in MEDIA and (len(args) == 1 or args[1] in ('r32', 'r169', 'r45', 'hero')):
                return img(args[0], args[1] if len(args) == 2 else '', url)
            if name == 'video' and len(args) == 1 and VALIAS.get(args[0], args[0]) in VIDEO:
                return video(VALIAS.get(args[0], args[0]), url)
            if name in ('facts', 'specialties', 'also', 'storage', 'pickups', 'reach', 'drivers', 'manager') and len(args) == 1 and args[0] in LOC:
                return {'facts': facts, 'specialties': specialties, 'also': also, 'storage': storage, 'pickups': pickups,
                        'reach': reach, 'drivers': driver_box, 'manager': manager_block}[name](args[0])
            if name == 'freight' and not args:
                return freight(url)
            if name == 'loclinks' and len(args) == 1 and args[0] in CORE:
                return loclinks(args[0])
            if name == 'cta' and len(args) in (1, 2) and args[0] in SVCS and (len(args) == 1 or args[1] in LOC):
                return cta(args[0], args[1] if len(args) == 2 else loc)
            if name == 'svctable' and not args:
                t = svctable()
                return t if nested(html, m.start()) else '<section class="s"><div class="w">%s</div></section>' % t
        except KeyError:
            pass
        return m.group(0)
    html = re.sub(r'<!--(img|video|facts|specialties|also|freight|storage|pickups|loclinks|cta|reach|drivers|manager|svctable)(?:\s+([^>]*?))?\s*-->', one, html)
    return hero_media(html)


GA = ('''<script async src="https://www.googletagmanager.com/gtag/js?id=%s"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','%s');</script>
''' % (GA_ID, GA_ID)) if GA_ID else ''

CTA_Q = {'cross-docking': 'Need cross-docking%s?', 'transloading': 'Containers to unload%s?', 'freight-consolidation': 'Freight to consolidate%s?',
         'freight-rework': 'Pallets that need rework%s?', 'warehousing': 'Need pallet storage%s?', 'pickups-deliveries': 'Need a pickup or delivery%s?',
         'fulfillment': 'Need fulfillment or FBA prep%s?'}


def page(url, title, desc, body, section='main', schema=(), trail=None, cta=None, svc=None, noindex=False):
    loc = section if section in LOC else None
    nav = NAV_RENO if section == 'reno' else NAV_MAIN
    logo = LOC['reno']['home'] if section == 'reno' else '/'
    parent = LOC[loc]['home'] if loc else '/services/' if svc else None

    def cur(u):
        if url == u:
            return ' aria-current="page"'
        return ' aria-current="true"' if (len(u) > 1 and url.startswith(u)) or u == parent else ''
    navh = '\n'.join('      <a href="%s"%s>%s</a>' % (u, cur(u), n) for u, n in nav)
    if loc:
        bar = '<b>%s</b><span>%s</span>' % (LOC[loc]['full'], LOC[loc]['bar'])
    else:
        bar = '<b>Three docks</b><span>%s</span>' % ' · '.join(L['label'] for L in LOC.values())
    cta = cta or (CTA_Q[svc] % (' in ' + LOC[loc]['name'] if loc else '') if svc else
                  {'reno': 'Need space in Reno?', 'sac': 'Need a dock in Sacramento?', 'pa': 'Need a dock in Harrisburg?'}.get(section, 'Need a dock?'))
    ld = ''.join('<script type="application/ld+json">%s</script>\n' % json.dumps(s, ensure_ascii=False) for s in list(schema) + ([crumbs(trail)] if trail else []))
    # Punjabi and Hindi need their own fonts (Barlow has no Gurmukhi or Devanagari); only loaded on pages that use them
    indic = '&family=Noto+Sans+Gurmukhi:wght@400;700&family=Noto+Sans+Devanagari:wght@400;700' if re.search(r'[ऀ-ॿ਀-੿]', body) else ''
    pic = re.search(r'(?:src|poster)="(/assets/(?:img|video)/[^"]+\.jpg)"', body)
    pic = pic.group(1) if pic else '/assets/img/home-hero.jpg' if os.path.exists(asset('img', 'home-hero.jpg')) else ''
    og = ('<meta property="og:image" content="%s%s"><meta name="twitter:card" content="summary_large_image">\n' % (DOMAIN, pic)) if pic else ''
    canon = '<meta name="robots" content="noindex">' if noindex else '<link rel="canonical" href="%s%s">' % (DOMAIN, url)
    ctah = '' if url.startswith(('/quote/', '/thanks/', '/drivers/')) else '''<section class="cta">
  <div class="w">
    <div><h2>%s</h2><p>Call 24/7, or send four quick fields and we call you back within one hour.</p></div>
    <div class="btns"><a class="btn wht" href="%s">Call %s</a><a class="btn o" href="%s">Get a quote</a><a class="btn o" href="%s">Text us</a>%s</div>
  </div>
</section>''' % (cta, TEL, PHONE, qurl(loc, svc), SMS, '<a class="btn o" href="%s" rel="noopener">Book a call</a>' % BOOK if BOOK else '')
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
{canon}
<link rel="icon" href="{ICON}">
<meta property="og:type" content="website"><meta property="og:site_name" content="24 HR Crossdock">
<meta property="og:title" content="{title}"><meta property="og:description" content="{desc}"><meta property="og:url" content="{DOMAIN}{url}">
{og}<meta name="theme-color" content="#0B1B30">
<script>(function(d){{d.classList.add('js');setTimeout(function(){{if(!window.siteJS)d.classList.remove('js')}},4000)}})(document.documentElement)</script>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Barlow:wght@400;500;600;700{indic}&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css">
{ld}{GA}</head>
<body>
<a class="skip" href="#content">Skip to content</a>
<div class="locbar"><div class="w">{bar}<p class="ll"><a href="/drivers/">Drivers</a><a href="/locations/">{'Other locations' if loc else 'All locations'}</a></p></div></div>
<header>
  <div class="w bar">
    <a class="logo" href="{logo}"><i>24</i>HR Crossdock</a>
    <nav class="main{' n6' if len(nav) == 6 else ''}" id="nav" aria-label="Main">
{navh}
    </nav>
    <a class="signin" href="{PORTAL}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg><span><span class="sl">Client </span>Sign In</span></a>
    <a class="btn r hcall" href="{TEL}"><span>Call 24/7</span> {PHONE}</a>
  </div>
</header>
<main id="content">
{body}
{ctah}
</main>
<div class="mbar"><a href="{TEL}" class="c"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>Call 24/7: {PHONE}</a></div>
{footer()}
<script src="/assets/site.js" defer></script>
</body>
</html>
'''


_FOOTER = []


def footer():
    if _FOOTER:
        return _FOOTER[0]
    def col(k):
        L = LOC[k]
        links = [(svc_url(k, s), SVCS[s]['short'] if s != 'warehousing' else '3PL warehousing &amp; storage' if k == 'reno' else 'Pallet storage')
                 for s in [s for s, n, l in SPEC[k] if s != 'contract']]
        links += [(u, n) for (kk, s), u in LOCSVC.items() if kk == k and u not in [x for x, y in links]
                  for n in [{'transloading': 'Transloading', 'fulfillment': 'Fulfillment', 'warehousing': 'Pallet storage'}.get(s, SVCS[s]['short'])]]
        if k == 'reno':
            links.append(('/reno/fba-prep/', 'FBA prep'))
        lis = ''.join('<p><a href="%s">%s</a></p>' % (u, n) for u, n in links)
        return '<div><h4><a href="%s">%s</a></h4><p class="fad"><a href="%s">%s</a></p>%s</div>' % (L['home'], L['label'], L['home'], addr(k, ', '), lis)
    svcs = ''.join('<p><a href="%s">%s</a></p>' % (SVCS[s]['url'], SVCS[s]['name'].replace('&', '&amp;')) for s in CORE)
    _FOOTER.append(f'''<footer>
  <div class="w">
    <div class="cols">
      <div class="fb"><a class="logo" href="/"><i>24</i>HR Crossdock</a><p class="ft">Cross-docking first, plus transloading, consolidation, rework, pallet storage and pickups and deliveries at three docks. Since {SINCE}. Fully insured.</p><p><a href="{TEL}">{PHONE}</a> (24/7)</p><p><a href="{SMS}">Text us</a></p><p><a href="mailto:{EMAIL}">{EMAIL}</a></p><p class="fh">Docks {HOURS}; {AFTER}.</p></div>
      <div><h4><a href="/services/">Services</a></h4>{svcs}</div>
      {col('reno')}
      {col('sac')}
      {col('pa')}
      <div><h4>Company</h4><p><a href="/about/">About us</a></p><p><a href="/locations/">Locations</a></p><p><a href="/get-started/">Get started</a></p><p><a href="/quote/">Get a quote</a></p><p><a href="/client-portal/">Client portal</a></p><p><a href="{PORTAL}">Client sign-in</a></p><p><a href="{PORTAL_SIGNUP}">Open an account</a></p><p><a href="/drivers/">Driver check-in</a></p></div>
    </div>
    <p class="copy">© 2026 24 HR Crossdock. Since {SINCE}. Fully insured. {' · '.join(L['label'] for L in LOC.values())}.</p>
  </div>
  <div class="wordmark" aria-hidden="true">24 HR CROSSDOCK</div>
</footer>''')
    return _FOOTER[0]


def truck_card():
    """Phone mockup of a truck card in the client portal. Always labelled Example (made-up truck, no real customer)."""
    steps = [('Booked', 'done'), ('On the way', 'done'), ('Checked in', 'done'), ('Waited 18m', 'done'), ('At door D3', 'now'), ('Done', 'todo')]
    dots = ''.join('<li class="%s"><i></i><span>%s</span></li>' % (s, n) for n, s in steps)
    note = feat('livecard', '', soon='Live truck updates in your portal: <!--badge-->')
    return f'''<figure class="mock tc">
      <div class="phone" role="img" aria-label="Example of a truck card in the client portal. Not a real truck.">
        <div class="ph-top"><i>24</i>Your trucks today<em class="ex">Example</em></div>
        <div class="ph-card">
          <div class="ph-row"><b>Truck 4521</b><span class="pill">Unloading</span></div>
          <div class="ph-sub">Drop-off · 22 pallets · Sparks, NV</div>
          <ol class="tsteps">{dots}</ol>
          <div class="ph-row"><span>Checked in 9:42 AM</span><span class="ok">At door D3</span></div>
          <div class="pbar" aria-hidden="true"><i style="width:47%"></i></div>
          <div class="ph-sub">1h 04m left on our 2-hour promise</div>
        </div>
        <div class="ph-card">
          <div class="ph-row"><b>Counted so far</b><span>14 of 22 pallets</span></div>
          <div class="ph-photos"><span></span><span></span><span></span><em>6 photos</em></div>
        </div>
        <div class="ph-card">
          <div class="ph-row"><b>Truck 4530</b><span class="warn">#2 in line</span></div>
          <div class="ph-sub">Pickup · 18 pallets · checked in 10:05 AM</div>
        </div>
      </div>
      <figcaption class="mock-cap"><b>Example</b><span>Not a real truck or customer. {note}</span></figcaption>
    </figure>'''


def lang_tiles(light=False, link=False):
    """The six kiosk languages as tiles, each in its own script (link=True: each opens /drivers/ in that language)."""
    tiles = ''.join(('<a href="/drivers/#{c}" lang="{c}">{n}<small lang="en">{e}</small></a>' if link else
                     '<span lang="{c}">{n}<small lang="en">{e}</small></span>').format(c=c, n=n, e=e) for c, n, e in LANGS)
    return '<div class="langs%s">%s</div>' % (' lt' if light else '', tiles)


# Alert events and the starting choices for a new contact (same as the portal's defaults): (event, text, email)
ALERT_EVENTS = [('Booking confirmed', 0, 1), ('ETA changed', 0, 0), ('Truck checked in', 1, 0),
                ('Waiting over %d minutes' % WAIT_GOAL, 1, 0), ('Unloading or loading started', 0, 0), ('Damage found', 1, 1),
                ('Done, with photos and counts', 0, 1), ('Loaded and secured', 0, 1), ('Friday summary', 0, 1)]


def alerts_table():
    yes, no = '<td class="y">✓<span class="vh"> on</span></td>', '<td class="n">–<span class="vh"> off</span></td>'
    trs = ''.join('<tr><th scope="row">%s</th>%s%s</tr>' % (e, yes if t else no, yes if m else no) for e, t, m in ALERT_EVENTS)
    return f'''<div class="tbl"><table class="svct al">
      <caption>{'Starting choices for each new person. Change any of them.' if on('alerts') else 'The starting choices we plan for each new person. You will be able to change any of them.'}</caption>
      <thead><tr><th scope="col">When</th><th scope="col">Text</th><th scope="col">Email</th></tr></thead>
      <tbody>{trs}</tbody>
    </table></div>'''


def client_portal(b):
    """The client portal page (fragment pages/_old_technology.html; the old file name is kept)."""
    b = b.replace('<!--TRUCKCARD-->', feat('livecard', truck_card(), off=''))
    b = b.replace('<!--LANGS-->', lang_tiles(link=True))
    return b.replace('<!--ALERTS-->', alerts_table())


def on(key):
    """True when a feature is live (for wording that changes, rather than a feature shown with a badge)."""
    return LIVE[key] == 'live'


def lang_names(sep=', ', last=' or '):
    names = ['<span lang="%s">%s</span>' % (c, n) for c, n, e in LANGS]
    return sep.join(names[:-1]) + last + names[-1]


def driver_box(loc):
    """Check-in facts for drivers on each location page (English; /drivers/ has all six languages)."""
    L = LOC[loc]
    kiosk = loc in KIOSK_DOCKS and on('kiosk')
    if kiosk:
        how = '<p>Drivers check in at our kiosk in %s. Have the 4-digit code from dispatch, or just find the company name.</p>' % lang_names()
        check = '<dt>Check in</dt><dd>At the kiosk: the 4-digit code or the company name, then your name and cell, then a photo of the paperwork. The screen shows your door or your place in line.</dd>'
        walk = '<dt>No booking?</dt><dd>Tap Walk-in at the kiosk. First time here? Have the carrier name, invoice email and MC number ready.</dd>'
    else:
        how = '<p>Drivers check in at the office with the paperwork.</p>'
        if loc in KIOSK_DOCKS:
            how += feat('kiosk', '', soon='<p>Kiosk check-in in %s. <!--badge--></p>' % lang_names())
        check = '<dt>Check in</dt><dd>At the office, with your paperwork. We give you a door or your place in line.</dd>'
        walk = '<dt>No booking?</dt><dd>Come to the office. First time here? Have the carrier name, invoice email and MC number ready.</dd>'
    door = feat('alerts', '<dt>Door number</dt><dd>We text it to your cell after check-in.</dd>', soon='')
    late = ('<dt>Running late?</dt><dd>Tap your new ETA on the link from your dispatcher, or call <a href="%s">%s</a>.</dd>' if on('eta') else
            '<dt>Running late?</dt><dd>Call <a href="%s">%s</a>, 24/7.</dd>') % (TEL, PHONE)
    return f"""<section class="s dbx">
  <div class="w split">
    <div class="l">
      <span class="tag">For drivers</span>
      <h2>Checking in at {L['city']}, {L['region']}</h2>
      {how}
      {lang_tiles(light=True, link=True) if kiosk else ''}
      <p class="dbtn"><a class="btn r" href="/drivers/">Driver check-in steps</a></p>
    </div>
    <dl class="dbox">
      <dt>Address</dt><dd>{addr(loc)}<br><a href="{maps(loc)}" rel="noopener">Get directions</a></dd>
      <dt>Dock hours</dt><dd>{HOURS}<br>Nights and weekends by appointment</dd>
      {check}
      {walk}
      {door}
      {late}
      <dt>Questions</dt><dd><a href="{TEL}">{PHONE}</a>, answered 24/7</dd>
    </dl>
  </div>
</section>"""


def driver_lang(c):
    """One language section of /drivers/. Kiosk words come from the prototype (drivers_text.FROM_KIOSK)."""
    K = {k: esc(v) for k, v in DT.FROM_KIOSK[c].items()}
    N = {k: esc(v[c]) for k, v in DT.NEW.items()}
    name = dict((x, n) for x, n, e in LANGS)[c]
    steps = [(K['langTitle'], ' · '.join('<span lang="%s">%s</span>' % (x, n) for x, n, e in LANGS)),
             (K['codeQ'], K['codeSub'] + '<br>' + K['noCode']),
             (K['truckQ'], ' · '.join([K['kindDrop'], K['kindPick'], K['kindBoth']])),
             (K['detailsQ'], ' · '.join([K['yourName'], K['yourCell'], K['truckNo'], K['trailerNo']]) + ('<br>' + K['cellHint'] if on('alerts') else '')),
             (K['scanBtn'], ' '.join([K['tip1'], K['tip2'], K['tip3']]) + '<br>' + K['scanSkip']),
             (K['doneTitle'], K['stayTruck'] if on('alerts') else K['stayOnly'])]
    ol = '<ol class="steps six">%s</ol>' % ''.join('<li><b>%d</b><h3>%s</h3><p>%s</p></li>' % (i + 1, t, p) for i, (t, p) in enumerate(steps))
    kiosk = feat('kiosk', '<p class="dlead">%s</p>%s' % (N['intro'], ol),
                 soon='<p class="dlead">%s</p><p class="dlead">%s <!--badge--></p>%s' % (N['office'], N['intro'], ol),
                 off='<p class="dlead">%s</p>' % N['office'])
    call = K['callDock'].replace('{phone}', '<a href="%s">%s</a>' % (TEL, PHONE))
    eta = feat('eta', '<div class="dcard"><h3>%s</h3><p>%s %s · %s · %s · %s</p><p>%s %s</p></div>' % (
        K['updateEta'], K['etaQ'], K['eta15'], K['eta30'], K['eta60'], K['eta120'], K['shareQ'] + ':', K['shareSub']), soon='')
    docks = ''.join('<div><b lang="en">%s</b><p lang="en">%s</p>%s<p><a href="%s" rel="noopener">%s</a></p></div>' % (
        LOC[k]['full'], addr(k), '' if k in KIOSK_DOCKS or not on('kiosk') else '<p>%s</p>' % N['office'], maps(k), N['directions']) for k in LOC)
    return f"""<section class="s dl" id="{c}" data-l="{c}" lang="{c}">
  <div class="w">
    <span class="tag">{name}</span>
    <h2>{K['kioskTitle']}</h2>
    {kiosk}
    <div class="dgrid">
      <div class="dcard"><h3>{K['notBooked']}</h3><p>{K['walkSub']}</p><p>{N['firstTime']}</p></div>
      <div class="dcard"><h3>{K['lateQ']}</h3><p>{call}</p><p>{K['help']}</p></div>
      {eta}
    </div>
    <h3 class="dh">{K['where']}</h3>
    <div class="ddocks">{docks}</div>
    <p class="dhours"><b>{K['hours']}:</b> {N['hoursLine']}{'। ' if c in ('pa', 'hi') else '. '}{N['after']}</p>
  </div>
</section>"""


def drivers():
    picks = ''.join('<a href="#%s" lang="%s" data-l="%s">%s</a>' % (c, c, c, n) for c, n, e in LANGS)
    return f"""<section class="hero sm drv">
  <div class="w grid"><div>
    <span class="crumb">For drivers</span>
    <h1>Truck check-in. <span>In your language.</span></h1>
    <p class="sub">Dispatchers: send your drivers this page. Drivers: tap your language.</p>
    <nav class="langpick" aria-label="Language">{picks}</nav>
  </div></div>
</section>
{''.join(driver_lang(c) for c, n, e in LANGS)}"""


def portal_teaser():
    """Home page: a short pitch for the client portal."""
    ticks = ''.join([feat('booking', '<li>Book trucks any day and time<!--badge--></li>'),
                     feat('loads', '<li>PO, BOL, pallets and weight for every load<!--badge--></li>'),
                     feat('damage', '<li>Damage photos and a price to fix. Nothing is charged until you approve it<!--badge--></li>'),
                     feat('securement', '<li>Outbound loads secured, photographed and signed<!--badge--></li>'),
                     '<li>Inventory, bills and messages for all three docks</li>',
                     feat('livecard', '<li>Every truck live: wait clock and place in line<!--badge--></li>')])
    return f"""<section class="s pt">
  <div class="w portal">
    <div>
      <span class="tag">Client portal</span>
      <h2>Your freight, one login</h2>
      <p class="lead">Every customer gets a login to our client portal, for all three docks.</p>
      <ul class="ticks">{ticks}</ul>
      <div class="ctas2"><a class="btn r" href="/client-portal/">See how it works</a><a class="btn o" href="{PORTAL}">Client sign in</a></div>
    </div>
    {feat('livecard', truck_card(), off='')}
  </div>
</section>"""


def hub(b):
    b = b.replace('<!--PORTAL-->', portal_teaser())
    d = asset('logos')
    logos = sorted(f for f in os.listdir(d) if f.lower().endswith(('.png', '.svg', '.jpg', '.webp'))) if os.path.isdir(d) else []
    if logos:
        imgs = ''.join('<img src="/assets/logos/%s" alt="%s" loading="lazy">' % (f, os.path.splitext(f)[0].replace('-', ' ').title()) for f in logos)
        b = b.replace('<!--LOGOS-->', '<section class="logos"><div class="w"><p>Trusted by</p><div class="lg">%s</div></div></section>' % imgs)
    b = b.replace('<!--LOGOS-->', '')
    quotes = ''.join('<figure><blockquote>“%s”</blockquote><figcaption><b>%s</b>%s</figcaption></figure>' % (q, n, c) for q, n, c in TESTIMONIALS)
    links = ''.join('<a href="https://www.google.com/maps/search/?api=1&amp;query=%s" rel="noopener"><b>%s dock</b><span>Read our Google reviews →</span></a>' % (
        ('24 HR Crossdock ' + L['street'].split(',')[0] + ' ' + L['city'] + ' ' + L['region']).replace(' ', '+').replace(',', ''), L['name']) for L in LOC.values())
    return b.replace('<!--REVIEWS-->', f"""<section class="s a reviews">
  <div class="w">
    <div class="intro rv"><h2>What customers say</h2><p>Real reviews from the brokers, carriers and shippers we move freight for.</p></div>
    {'<div class="quotes">%s</div>' % quotes if quotes else ''}
    <div class="revlinks">{links}</div>
  </div>
</section>""")


# One line per dock on the locations page
LINE = {'reno': 'Cross-docking, plus the most pallet space of our three docks for 3PL and contract warehousing.',
        'sac': 'Cross-docking, consolidation and transloading for Sacramento and Northern California.',
        'pa': 'Cross-docking at 30 doors, plus freight rework and consolidation on the East Coast.'}


def locations():
    cards = ''
    for k, L in LOC.items():
        spec = ''.join('<li><a href="%s">%s</a></li>' % (svc_url(k, s), n) for s, n, l in SPEC[k])
        rest = [SVCS[s]['name'].lower().replace('&', 'and') + (' within %d miles' % L['radius'] if s == 'pickups-deliveries' else '')
                for s in CORE if s not in specs_of(k)] + (['fulfillment and FBA prep'] if k == 'reno' else [])
        restl = ', '.join(rest[:-1]) + (' and ' if len(rest) > 1 else '') + rest[-1]
        cards += f"""
      <article>
        <span class="tag">{L['full']}</span>
        <h3>{L['label']}</h3>
        <p class="lsub">{L['sqft']} sq ft · {L['doors']} dock doors · {L['pallets']} pallets</p>
        <p class="lgrow">{LINE[k]}</p>
        <ul>{spec}</ul>
        <p class="lalso">Also here: {restl}.</p>
        <p class="laddr">{addr(k)}<br><a href="{maps(k)}" rel="noopener">Get directions</a></p>
        <div class="lbtns"><a class="btn r" href="{L['home']}">{L['name']} dock</a></div>
      </article>"""
    return f"""<section class="hero sm">
  <div class="w grid"><div>
    <span class="crumb">Locations</span>
    <h1>Three docks. <span>One standard.</span></h1>
    <p class="sub">{TOTAL_DOORS} dock doors and {TOTAL_SQFT} square feet in Reno–Sparks, Nevada; Sacramento, California; and Harrisburg, Pennsylvania. Cross-docking leads at every dock, and every dock offers every core service.</p>
    <div class="ctas"><a class="btn r" href="{TEL}">Call 24/7: {PHONE}</a><a class="btn o" href="/quote/">Get a quote</a></div>
  </div></div>
</section>
<section class="s"><div class="w"><div class="loccards rv">{cards}
</div></div></section>
<section class="s a">
  <div class="w">
    <div class="intro rv"><h2>Every service, every dock</h2><p>Specialties differ; the receiving standard doesn't. Seal checked, counted against the BOL and photographed at the door, at all three.</p></div>
    {svctable()}
  </div>
</section>"""


THANKS = f'''<section class="hero sm"><div class="w grid"><div>
  <span class="crumb">Thank you</span>
  <h1>Got it. <span>We'll be in touch.</span></h1>
  <p class="sub">Your request is in. We'll call you back within one hour, day or night. Need us right now? Call {PHONE}.</p>
  <div class="ctas"><a class="btn r" href="/">Back to the home page</a><a class="btn o" href="{TEL}">Call {PHONE}</a></div>
</div></div></section>'''

NOTFOUND = '''<section class="hero sm"><div class="w grid"><div>
  <span class="crumb">Page not found</span>
  <h1>That page <span>moved.</span></h1>
  <p class="sub">Pick your dock or a service to keep going.</p>
  <div class="ctas"><a class="btn r" href="/reno/">Reno–Sparks, NV</a><a class="btn o" href="/sacramento/">Sacramento, CA</a><a class="btn o" href="/harrisburg/">Harrisburg, PA</a><a class="btn o" href="/services/">All services</a></div>
</div></div></section>'''


def stub(p):
    return f'''<section class="hero sm"><div class="w grid"><div>
  <span class="crumb">{p['crumb']}</span>
  <h1>{p['h1']}</h1>
  <p class="sub">Call {PHONE}, answered 24/7.</p>
  <div class="ctas"><a class="btn r" href="{TEL}">Call 24/7: {PHONE}</a><a class="btn o" href="/quote/">Get a quote</a></div>
</div></div></section>'''


def newtab(html):
    """Every link to the portal (claude.ai) opens in a new tab, so the website stays open behind it."""
    def one(m):
        tag = m.group(0)
        if 'target=' not in tag:
            tag = tag[:-1] + ' target="_blank">'
        if 'rel=' not in tag:
            tag = tag[:-1] + ' rel="noopener">'
        elif 'noopener' not in tag:
            tag = re.sub(r'rel="([^"]*)"', r'rel="\1 noopener"', tag)
        return tag
    return re.sub(r'<a\s[^>]*href="https://claude\.ai/[^"]*"[^>]*>', one, html)


# ---------------------------------------------------------------------------------------------------------------
# Page registry (PLAN §4 / §5.1). title/desc here are fallbacks: a fragment's own <!--title:--> and <!--desc:--> win.
# ---------------------------------------------------------------------------------------------------------------
def P(url, frag, crumb, title, desc, sec='main', svc=None, h1=None, gen=None, post=None, noindex=False):
    return dict(url=url, frag=frag, crumb=crumb, title=title, desc=desc, sec=sec, svc=svc, h1=h1 or title.split(' | ')[0],
                gen=gen, post=post, noindex=noindex)


B = ' | 24 HR Crossdock'
REG = [
    P('/', 'hub.html', 'Home', 'Cross-Docking in Reno, Sacramento & Harrisburg' + B,
      'Cross-docking first at three docks: Reno–Sparks NV, Sacramento CA and Harrisburg PA. 46 dock doors, storage, transloading. Call 24/7: 916-616-3481.', post=hub),
    P('/services/', 'services.html', 'Services', 'Cross-Docking, Storage & Freight Services' + B,
      'Cross-docking, transloading, consolidation, freight rework, pallet storage and pickups and deliveries at our Reno, Sacramento and Harrisburg docks.'),
    P('/cross-docking/', 'cross-docking.html', 'Cross-docking', 'Cross-Docking at Three Docks' + B,
      'Cross-docking in Reno–Sparks, Sacramento and Harrisburg: seal checked, counted against the BOL, photographed, reloaded the same day. Call 24/7.', svc='cross-docking'),
    P('/transloading/', 'transloading.html', 'Transloading', 'Freight Transloading & Container Unloading' + B,
      "Containers and 53' trailers unloaded, palletized, wrapped, then reloaded or stored at our Sacramento, Reno–Sparks and Harrisburg docks.", svc='transloading'),
    P('/freight-consolidation/', 'freight-consolidation.html', 'Freight consolidation', 'Freight Consolidation' + B,
      'Freight from several shippers built into one outbound load, sorted by stop, wrapped, counted and photographed. Sacramento, Harrisburg and Reno.', svc='freight-consolidation'),
    P('/freight-rework/', 'freight-rework.html', 'Freight rework', 'Freight Rework & Restacking' + B,
      'Leaning, crushed or mixed pallets rebuilt, relabeled and wrapped, with photos before and after. Nothing extra charged until you approve it.', svc='freight-rework'),
    P('/warehousing/', 'warehousing.html', 'Warehousing & 3PL', 'Flexible Warehousing & 3PL Solutions' + B,
      'Pallet storage by the day, week, month or year, plus contract warehousing and overflow space. Floor and racked, billed weekly, no minimums.', svc='warehousing'),
    P('/pickups-deliveries/', 'pickups-deliveries.html', 'Pickups & deliveries', 'Third-Party Freight Pickups & Deliveries' + B,
      'Our own trucks and drivers: one-time or recurring pickups and deliveries within 150 miles of Sacramento and Harrisburg and 100 miles of Reno.', svc='pickups-deliveries'),
    P('/reno/', 'loc-reno.html', 'Reno–Sparks, NV', 'Cross-Docking & 3PL Warehousing in Reno, NV' + B,
      'Cross-docking, 3PL warehousing and pallet storage for 1,000–3,000 pallets, and pickups and deliveries within 100 miles, on I-80 in Sparks, NV.', sec='reno'),
    P('/reno/cross-docking/', 'reno-cross-docking.html', 'Cross-docking', 'Cross-Docking in Reno–Sparks, NV' + B,
      'Cross-docking on I-80 in Sparks, NV: trailers checked, counted against the BOL, photographed and reloaded the same day. 8 dock doors. Call 24/7.', sec='reno', svc='cross-docking'),
    P('/reno/pallet-storage/', 'reno-pallet-storage.html', '3PL warehousing & pallet storage', 'Pallet Storage & 3PL Warehousing in Reno' + B,
      'Pallet storage and 3PL warehousing in Sparks, NV: room for 1,000–3,000 pallets, daily to long-term, floor and racked, billed weekly, no minimums.', sec='reno', svc='warehousing'),
    P('/reno/pickups-deliveries/', 'reno-pickups-deliveries.html', 'Pickups & deliveries', 'Freight Pickups & Deliveries in Reno, NV' + B,
      'Third-party freight pickups and deliveries on our own trucks within 100 miles of Sparks, NV: one-time or recurring, with signed proof of delivery.', sec='reno', svc='pickups-deliveries'),
    P('/reno/transloading/', 'reno-transloading.html', 'Transloading', 'Transloading & Container Unloading in Reno' + B,
      'Floor-loaded and palletized containers and trailers unloaded, palletized and wrapped in Sparks, NV, then stored with us or reloaded.', sec='reno', svc='transloading'),
    P('/reno/fulfillment/', '_old_fulfillment.html', 'Fulfillment', 'Order Fulfillment & FBA Prep in Reno, NV' + B,
      'Pick, pack and ship from our Sparks, NV warehouse, plus Amazon FBA and Walmart WFS prep. A secondary service at our Reno–Sparks dock.', sec='reno', svc='fulfillment'),
    P('/reno/fba-prep/', '_old_fba-prep-reno.html', 'FBA prep', 'Amazon FBA Prep in Reno, NV' + B,
      'Amazon FBA prep in Sparks, NV: FNSKU labels, poly bags, bundles and case packs to Amazon rules, plus bulk storage and Walmart WFS prep.', sec='reno', svc='fulfillment'),
    P('/sacramento/', 'loc-sac.html', 'Sacramento, CA', 'Cross-Docking in Sacramento, CA' + B,
      'Cross-docking, freight consolidation, transloading and rework in North Highlands, CA. 8 dock doors, 40,000 sq ft, pickups within 150 miles.', sec='sac'),
    P('/sacramento/cross-docking/', 'sac-cross-docking.html', 'Cross-docking', 'Cross-Docking in Sacramento, CA' + B,
      'Cross-docking in North Highlands near Sacramento: trailers checked, counted, photographed and reloaded the same day at 8 dock doors. Call 24/7.', sec='sac', svc='cross-docking'),
    P('/sacramento/transloading/', 'sac-transloading.html', 'Transloading', 'Transloading in Sacramento, CA' + B,
      'Container and trailer transloading in North Highlands near Sacramento: unloaded, palletized, wrapped, then reloaded or stored. Call 24/7.', sec='sac', svc='transloading'),
    P('/sacramento/freight-consolidation/', 'sac-freight-consolidation.html', 'Freight consolidation', 'Freight Consolidation in Sacramento, CA' + B,
      'Freight consolidation in North Highlands near Sacramento: LTL pieces and POs from several shippers built into one outbound load, sorted by stop.', sec='sac', svc='freight-consolidation'),
    P('/harrisburg/', 'loc-pa.html', 'Harrisburg, PA', 'Cross-Docking & Freight Rework in Harrisburg, PA' + B,
      'Cross-docking at 30 dock doors, freight rework and consolidation in Middletown, PA, near Harrisburg. Pickups and deliveries within 150 miles.', sec='pa'),
    P('/harrisburg/cross-docking/', 'pa-cross-docking.html', 'Cross-docking', 'Cross-Docking in Harrisburg, PA' + B,
      'Cross-docking at 30 dock doors in Middletown, PA, near Harrisburg: trailers checked, counted, photographed and reloaded the same day. Call 24/7.', sec='pa', svc='cross-docking'),
    P('/harrisburg/freight-rework/', 'pa-freight-rework.html', 'Freight rework', 'Freight Rework in Harrisburg, PA' + B,
      'Freight rework in Middletown, PA, near Harrisburg: leaning, crushed or mixed pallets rebuilt, relabeled and wrapped, with photos before and after.', sec='pa', svc='freight-rework'),
    P('/harrisburg/freight-consolidation/', 'pa-freight-consolidation.html', 'Freight consolidation', 'Freight Consolidation in Harrisburg, PA' + B,
      'Freight consolidation in Middletown, PA, near Harrisburg: freight from several shippers held until the load is complete, then released to your carrier.', sec='pa', svc='freight-consolidation'),
    P('/locations/', None, 'Locations', 'Locations: Reno, Sacramento & Harrisburg' + B,
      'Three docks, one standard: Reno–Sparks NV, Sacramento CA and Harrisburg PA. 46 dock doors and 105,000 sq ft, with every core service at every dock.', gen=locations),
    P('/about/', '_old_company.html', 'About', 'About Us and Our Operating Standards' + B,
      'Moving freight since 2015: cross-docking, storage and freight handling at three docks, with the same receiving, storage and damage standards at each.'),
    P('/get-started/', '_old_get-started.html', 'Get started', 'How to Get Started' + B,
      'Getting started with 24 HR Crossdock: a quote within one hour, account setup, your first inbound and your client portal login, step by step.'),
    P('/client-portal/', '_old_technology.html', 'Client portal', 'Client Portal: Book Trucks, See Every Load' + B,
      'Book trucks%s, add every load, see your inventory and approve damage fixes with photos, for all three docks in one login.' % (' any day and time' if on('booking') else ''),
      post=client_portal),
    P('/drivers/', None, 'Drivers', 'Driver Check-In: %s' % ('Kiosk in 6 Languages' if on('kiosk') else 'Steps, Addresses and Hours') + B,
      'Truck check-in at 24 HR Crossdock in English, Español, Русский, Українська, ਪੰਜਾਬੀ and हिन्दी. %s, dock addresses and hours.' % ('Kiosk steps' if on('kiosk') else 'Check-in steps'),
      gen=drivers),
    P('/quote/', '_old_quote.html', 'Get a quote', 'Get a Quote' + B,
      'Request a quote for cross-docking, transloading, consolidation, rework, pallet storage or pickups and deliveries. We call you back within one hour.'),
    P('/thanks/', None, 'Thank you', 'Thank You' + B, 'Your request was received. We call you back within one hour.', gen=lambda: THANKS, noindex=True),
]
LOCSVC = {}   # (dock, service slug) -> that dock's own page for the service
for _p in REG:
    if _p['sec'] in LOC and _p['svc']:
        LOCSVC.setdefault((_p['sec'], _p['svc']), _p['url'])


def trail_for(url):
    names = {p['url']: p['crumb'] for p in REG}
    parts = [u for u in ['/'] + ['/' + '/'.join(url.strip('/').split('/')[:i + 1]) + '/' for i in range(url.strip('/').count('/') + 1)] if u in names]
    return [(u, names[u]) for u in dict.fromkeys(parts)] if url != '/' else None


def schema_for(p, title):
    name = html_lib.unescape(title).split(' | ')[0]
    sec, svc, url = p['sec'], p['svc'], p['url']
    if sec in LOC:
        return [biz(sec)] + ([service_ld(svc, url, name, sec)] if svc else [])
    if svc:
        return [service_ld(svc, url, name)]
    return [ORG] if url != '/thanks/' else []


# ---------------------------------------------------------------------------------------------------------------
# Checks
# ---------------------------------------------------------------------------------------------------------------
# Words that say texts or emails really go out. Not allowed while LIVE['alerts'] is not 'live',
# unless the same line or card carries the Coming soon badge.
CLAIMS = re.compile(r"\b(we(?:'ll| will)? (?:text|e-?mail) (?:you|it|the|your|drivers?)|we text|texts? (?:you|your|the) (?:driver|door)|"
                    r"texted|sent automatically|(?:sent|goes out|delivered) by (?:text|e-?mail)|alerts? (?:are|is|get) sent)|"
                    # the kiosk lines on /drivers/ in the other five languages ("we send a text / SMS / message")
                    r"\btexto\b|\bSMS\b|ਮੈਸੇਜ|मैसेज", re.I)
# §3.2 banned on the site (visible text, title and description)
BANNED = [(re.compile(r'\breal[- ]?time\b', re.I), 'real-time'),
          (re.compile(r'\bguarantee[ds]?\b', re.I), 'guaranteed'),
          (re.compile(r'\blargest\b', re.I), 'largest'),
          (re.compile(r'#\s?1\b|\bnumber one\b', re.I), '#1'),
          (re.compile(r'\b30,000\b|\b30k\b', re.I), '30,000 (monthly pallet volume, D2)'),
          (re.compile(r'\b66[- ](?:dock[- ])?doors?\b', re.I), '66 doors (D1: 46)'),
          (re.compile(r'\b50[- ](?:dock[- ])?doors?\b', re.I), '50 doors (D1: 30)'),
          (re.compile(r'\blorem\b|\bipsum\b', re.I), 'lorem ipsum'),
          (re.compile(r'\bdeliver\w*\b[^.]{0,40}\banywhere\b|\banywhere\b[^.]{0,40}\bdeliver', re.I), '"anywhere" delivery (D5: radius)')]
BLOCKS = r'</(?:li|p|tr|dd|dt|article|details|h[1-6]|figure|div|summary|td|th|caption|span)>'


def visible_blocks(html):
    vis = re.sub(r'<head>.*?</head>|<script\b.*?</script>|<style\b.*?</style>|<!--.*?-->', ' ', html, flags=re.S)
    for blk in re.split(BLOCKS, vis):
        yield blk, html_lib.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', blk)))


def check(out, sitemap, notes):
    """Checks every built page. Returns a list of problems (the build fails if there are any)."""
    problems = list(notes)
    ids = {u: set(re.findall(r'\sid="([^"]+)"', h)) for u, h in out.items()}
    for url, html in out.items():
        for a in re.findall(r'<a\s[^>]*href="https://claude\.ai/[^"]*"[^>]*>', html):
            if 'target="_blank"' not in a or 'noopener' not in a:
                problems.append('%s: portal link without target=_blank rel=noopener: %s' % (url, a))
        for m in re.findall(r'<!--\s*([a-zA-Z/][^>]{0,60}?)\s*-->', html):
            problems.append('%s: unexpanded or unknown marker <!--%s--> (see README "Markers")' % (url, m))
        if '<!--title:' in html or '<!--desc:' in html:
            problems.append('%s: a <!--title:--> or <!--desc:--> line was left in the page (it must be the first lines of the fragment)' % url)
        h1 = len(re.findall(r'<h1[\s>]', html))
        if h1 != 1:
            problems.append('%s: %d <h1> tags (must be exactly one)' % (url, h1))
        if html.count('class="hv"') != html.count(' hasv"'):
            problems.append('%s: a hero photo or video marker sits outside a <section class="hero ...">' % url)
        for ld in re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, flags=re.S):
            try:
                json.loads(ld)
            except ValueError as e:
                problems.append('%s: JSON-LD does not parse: %s' % (url, e))
        for href in re.findall(r'(?:href|src|poster|data-src|srcset)="(/[^"/][^"]*|/)"', html):
            path = href.split('#')[0].split('?')[0]
            f = os.path.join(OUT, path.lstrip('/'))
            if not os.path.exists(os.path.join(f, 'index.html') if path.endswith('/') else f):
                problems.append('%s: broken internal link %s' % (url, href))
        for frag in re.findall(r'href="#([^"/][^"]*)"', html):
            if frag not in ids[url]:
                problems.append('%s: in-page link #%s has no matching id' % (url, frag))
        for qs in re.findall(r'href="/quote/\?([^"#]*)', html):
            for k, v in parse_qsl(html_lib.unescape(qs)):
                if (k == 'loc' and v not in LOCOPTS) or (k == 'svc' and v not in SVC):
                    problems.append('%s: quote link %s=%r matches no form option' % (url, k, v))
        title = re.search(r'<title>(.*?)</title>', html, re.S).group(1)
        desc = re.search(r'<meta name="description" content="([^"]*)"', html).group(1)
        blocks = list(visible_blocks(html)) + [(title, html_lib.unescape(title)), (desc, html_lib.unescape(desc))]
        for blk, text in blocks:
            for rx, word in BANNED:
                m = rx.search(text)
                if m and not (word == 'guaranteed' and PROMISE in text):
                    problems.append('%s: banned (PLAN §3.2) %s: "%s"' % (url, word, text[max(0, m.start() - 40):m.end() + 40].strip()))
            if not on('alerts'):
                m = CLAIMS.search(text)
                if m and SOON not in blk:
                    problems.append('%s: says texts or emails are sent, but alerts are not live: "%s"' % (url, m.group(0)))
        if not on('alerts'):
            for ld in re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, flags=re.S):
                m = CLAIMS.search(ld)
                if m:
                    problems.append('%s: schema says texts or emails are sent, but alerts are not live: "%s"' % (url, m.group(0)))
    for p in REG:
        if p['url'] != '/thanks/' and '%s%s</loc>' % (DOMAIN, p['url']) not in sitemap:
            problems.append('%s is missing from the sitemap' % p['url'])
    return problems


# ---------------------------------------------------------------------------------------------------------------
# MEDIA.md: the photo and video plan for Nick (written on every build)
# ---------------------------------------------------------------------------------------------------------------
SHOTS = ['From the yard: the building and the row of dock doors, trailers backed in (wide, horizontal).',
         'One open dock door from inside, a trailer at it, daylight behind.',
         'A forklift carrying a wrapped pallet across the floor (crew in safety vests).',
         'A trailer being unloaded: pallets coming off at the door.',
         'Pallets sorted into outbound lanes on the floor.',
         'Racking or floor-stacked pallets, a long view down an aisle.',
         'A pallet being stretch-wrapped or rebuilt.',
         'Odd freight you handle: drums, a crate or a long piece (no customer labels readable).',
         'One of our trucks being loaded at a door, or on the road.',
         'The office or kiosk entrance drivers use (helps drivers find it).']


def media_plan():
    rows, have, missing = [], 0, []
    used = lambda k: ', '.join(sorted(USED.get(k, []))) or '(not placed on a page yet)'
    for k, M in MEDIA.items():
        f = 'assets/img/%s.jpg' % k
        ok = os.path.exists(asset('img', k + '.jpg'))
        have += ok
        if not ok:
            missing.append(f)
        rows.append('| %s<br>%s | %s | %s | `site-src/%s`%s |' % (M['for_'], used(k), M['shot'], '**Your own photo only**' if M['ours'] else 'Stock OK',
                                                              f, ' ✓ added' if ok else ''))
    for k, V in VIDEO.items():
        ok = os.path.exists(asset('video', k + '.mp4')) and os.path.exists(asset('video', k + '.jpg'))
        have += ok
        if not ok:
            missing += ['assets/video/%s.%s' % (k, e) for e in ('mp4', 'jpg') if not os.path.exists(asset('video', '%s.%s' % (k, e)))]
        rows.append('| %s<br>%s | %s | %s | `site-src/assets/video/%s.mp4` + `%s.jpg` (poster)%s |' % (
            V['for_'], used('video:' + k), V['shot'], '**Your own video only**' if V['ours'] else 'Stock OK', k, k, ' ✓ added' if ok else ''))
    total = len(MEDIA) + len(VIDEO)
    docks = ''
    for k, L in LOC.items():
        docks += '\n### %s (%s)\n' % (L['label'], addr(k, ', ')) + ''.join('%d. %s\n' % (i + 1, s) for i, s in enumerate(SHOTS))
        docks += 'Name the best three `loc-%s-hero.jpg`, `loc-%s-dock.jpg` and `loc-%s-floor.jpg`.\n' % (k, k, k)
    md = f"""# Photos and video for the website (media plan)

Written by `site-src/build.py` on every build. Don't edit this file by hand: the slots live in `MEDIA` and `VIDEO` in build.py.

**Status: {have} of {total} slots have files.** Until a file is added, its slot shows nothing, so no page ever shows a placeholder or a fake photo.

## The rule
- Slots marked **Your own photo only** are on a location page and look like *that dock*. Only a photo you took at that dock may go there.
  Never put a stock photo, or a photo of another company's building, in those slots.
- Slots marked **Stock OK** are on the company-wide service sections. A licensed stock photo is fine there. The alt text never names one of
  our locations, so a stock photo is never presented as our dock.
- No cartoons, no illustrations, no AI-made images, no low-resolution photos.

## Every slot
| Page / section | The shot we want | Who can supply it | File name |
|---|---|---|---|
{chr(10).join(rows)}

## File specs
- Photos: JPG, 2400×1600 (3:2) or 2400×1350 (16:9) for heroes; portraits 1600×2000. Under 400 KB each (export at about 75% quality).
  Optional: a `.webp` copy with the same name next to the `.jpg` (smaller download; the site uses it automatically).
- Hero video: MP4 (H.264), 1920×1080, 10–20 seconds, no audio, under 5 MB, a seamless loop. Add a `.jpg` still with the same name (the poster).
  Phones, slow connections and visitors who turn off motion get the still only.
- Horizontal (landscape) photos, well lit, level, sharp. No readable customer names, plates or faces you don't have permission to show.

## Shot list for your phone (10 shots per dock)
Shoot on a bright day with the dock tidy. Hold the phone sideways. Take each shot a few times.
{docks}
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
3. Run `python3 site-src/build.py`. The build prints `MEDIA: n of {total} slots have files` and lists what is still missing.
"""
    open(MEDIA_MD, 'w', encoding='utf-8').write(md)
    return have, total, missing


def build():
    if os.path.isdir(OUT):
        for f in os.listdir(OUT):
            p = os.path.join(OUT, f)
            shutil.rmtree(p) if os.path.isdir(p) else os.remove(p)
    else:
        os.makedirs(OUT)
    shutil.copytree(asset(), os.path.join(OUT, 'assets'))
    out, stubs, notes, info = {}, [], [], []
    for p in REG:
        url, sec, svc = p['url'], p['sec'], p['svc']
        loc = sec if sec in LOC else None
        title, desc = p['title'], p['desc']
        if p['frag']:
            body, meta = load(p['frag'])
            if body is None:
                stubs.append(p['frag'])
                body = stub(p)
            else:
                if not p['frag'].startswith('_old_') and 'title' not in meta:
                    notes.append('%s: pages/%s has no <!--title: ...--> line at the top' % (url, p['frag']))
                title, desc = meta.get('title', title), meta.get('desc', desc)
                if p['post']:
                    body = p['post'](body)
        else:
            body = p['gen']()
        body = markers(body, url, loc)
        body = fix(body, loc, svc)
        body = forms(body, url, LOC[loc]['q'] if loc else 'Not sure', svc)
        t = html_lib.unescape(title)
        d_ = html_lib.unescape(desc)
        if len(t) > 65:
            info.append('%s: title is %d characters (aim for 60 or fewer)' % (url, len(t)))
        if not 110 <= len(d_) <= 165:
            info.append('%s: description is %d characters (aim for 120-160)' % (url, len(d_)))
        faq = faq_ld(body)
        schema = schema_for(p, title) + ([faq] if faq else [])
        html = newtab(page(url, attr(title), attr(desc), body, sec, schema, trail_for(url), svc=svc, noindex=p['noindex']))
        html = re.sub(r'<!-- .*? -->\n?', '', html, flags=re.S)   # plain comments (with a space after <!--) are notes for editors
        d = os.path.join(OUT, url.strip('/'))
        os.makedirs(d, exist_ok=True)
        open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(html)
        out[url] = html
    out['/404.html'] = newtab(page('/404.html', 'Page Not Found | 24 HR Crossdock', 'That page moved. Pick a dock or a service.', NOTFOUND, noindex=True))
    open(os.path.join(OUT, '404.html'), 'w', encoding='utf-8').write(out['/404.html'])
    sm = ''.join('  <url><loc>%s%s</loc></url>\n' % (DOMAIN, p['url']) for p in REG if not p['noindex'])
    open(os.path.join(OUT, 'sitemap.xml'), 'w').write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n%s</urlset>\n' % sm)
    open(os.path.join(OUT, 'robots.txt'), 'w').write('User-agent: *\nAllow: /\nDisallow: /thanks/\nSitemap: %s/sitemap.xml\n' % DOMAIN)
    js = os.path.join(OUT, 'assets', 'site.js')
    alias = json.dumps({'loc': LOC_ALIAS, 'svc': SVC_ALIAS}, ensure_ascii=False, separators=(',', ':'))
    open(js, 'w', encoding='utf-8').write(open(js, encoding='utf-8').read().replace('{EMAIL}', EMAIL).replace('/*ALIAS*/{}', alias))
    have, total, missing = media_plan()
    leftover = [u for u in out if '#/' in out[u]]
    print('built', len(REG), 'pages + 404', 'LEFTOVER HASH LINKS:' if leftover else '', leftover or '')
    for s in stubs:
        print('STUB:', s)
    print('MEDIA: %d of %d slots have files%s' % (have, total, ('; missing: ' + ', '.join(missing)) if missing else ''))
    for i in info:
        print('NOTE:', i)
    problems = check(out, sm, notes)
    for p in problems:
        print('PROBLEM:', p)
    print('switches:', ', '.join('%s=%s' % kv for kv in LIVE.items()))
    if leftover or problems:
        raise SystemExit(1)


if __name__ == '__main__':
    build()
