"""Builds the multi-location 24 HR Crossdock website into ../site (deployed by Netlify).

Run:  python3 site-src/build.py
Each page is a real URL (/reno/, /reno/cross-dock/, /sacramento/ ...) so Google can list it,
and each Google Maps listing can point at its own location home page.
"""
import json, os, re, shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(ROOT), 'site')
DOMAIN = 'https://24hrcrossdock.com'
PORTAL = 'https://claude.ai/artifact/97haWKtJGFGXW8PjdM9XWv'
PHONE, TEL, EMAIL = '916-616-3481', 'tel:+19166163481', '24hrcrossdock@gmail.com'

HOURS = '6am–10pm'
AFTER = '10pm–6am by appointment, $100 after-hours fee'
LOC = {
    'reno': dict(key='reno', city='Sparks', region='NV', short='Reno–Sparks, NV', label='Reno, NV', q='Sparks, NV',
                 street='1095 Spice Islands Dr, Suites 105-106', zip='89431', home='/reno/', sqft='40,000', doors='8',
                 bar='1095 Spice Islands Dr, Sparks, NV · Open 6am–10pm'),
    'sac': dict(key='sac', city='North Highlands', region='CA', short='Sacramento area, CA', label='Sacramento, CA', q='North Highlands, CA',
                street='3036 Orange Grove Ave', zip='95660', home='/sacramento/', sqft='40,000', doors='8',
                bar='3036 Orange Grove Ave, North Highlands, CA · Open 6am–10pm'),
    'pa': dict(key='pa', city='Middletown', region='PA', short='Harrisburg area, PA', label='Harrisburg, PA', q='Middletown, PA',
               street='2811 Turnpike Industrial Dr', zip='17057', home='/middletown/', sqft='25,000', doors='50',
               bar='2811 Turnpike Industrial Dr, Middletown, PA · Open 6am–10pm'),
}
# Site managers: fill in name, title, phone, email and a photo path (e.g. /assets/team/reno.jpg) when ready.
MANAGERS = {
    'reno': dict(name='', title='Site manager, Sparks', phone=PHONE, email=EMAIL, photo=''),
    'sac': dict(name='', title='Site manager, North Highlands', phone=PHONE, email=EMAIL, photo=''),
    'pa': dict(name='', title='Site manager, Middletown', phone=PHONE, email=EMAIL, photo=''),
}

NAV_MAIN = [('/reno/', 'Reno, NV'), ('/sacramento/', 'Sacramento, CA'), ('/middletown/', 'Harrisburg, PA'),
            ('/technology/', 'Technology'), ('/about/', 'About'), ('/get-started/', 'Get Started')]
NAV_RENO = [('/reno/pallet-storage/', 'Storage'), ('/reno/cross-dock/', 'Cross-Dock'), ('/reno/fulfillment/', 'Fulfillment'),
            ('/reno/transload/', 'Transload'), ('/reno/delivery/', 'Delivery'), ('/reno/trailers/', 'Trailers'),
            ('/locations/', 'Locations')]

# old single-page hash links -> real URLs
HASH = {'#/': '/reno/', '#/fulfillment': '/reno/fulfillment/', '#/cross-dock': '/reno/cross-dock/',
        '#/technology': '/technology/', '#/get-started': '/get-started/', '#/company': '/about/',
        '#/quote': '/quote/', '#/locations': '/locations/', '#/sacramento': '/sacramento/',
        '#/middletown': '/middletown/', '#/pallet-storage-reno': '/reno/pallet-storage/', '#/fba-prep-reno': '/reno/fba-prep/'}


def frag(name):
    return open(os.path.join(ROOT, 'pages', name)).read()


def fix(html, loc=None):
    """Rewrite old hash links, point quote buttons at the right location, drop the old mailto note."""
    html = re.sub(r'\sdata-go="[^"]*"', '', html)
    html = re.sub(r'href="#/quote\?loc=([^"]*)"', r'href="/quote/?loc=\1"', html)
    html = re.sub(r'href="(#/[a-z-]*)"', lambda m: 'href="%s"' % HASH[m.group(1)], html)
    if loc:
        html = html.replace('href="/quote/"', 'href="/quote/?loc=%s"' % LOC[loc]['q'].replace(' ', '%20').replace(',', '%2C'))
    html = html.replace('<small>Opens your email with the details filled in.</small>', '')
    return html


def locsel(default):
    opts = ''.join('<option%s>%s</option>' % (' selected' if v == default else '', v)
                   for v in ['Sparks, NV', 'North Highlands, CA', 'Middletown, PA', 'Not sure'])
    return '<label>Location<select name="Location">%s</select></label>' % opts


def forms(html, page, default_loc):
    """Make every quote form a Netlify form that emails the office, with a location field."""
    def one(m):
        attrs, body = m.group(1), m.group(2)
        src = re.search(r'data-src="([^"]*)"', attrs)
        name = 'quote-' + re.sub(r'[^a-z0-9]+', '-', (src.group(1) if src else page).lower()).strip('-')
        attrs = re.sub(r'\s(id|data-src)="[^"]*"', '', attrs)
        body = re.sub(r'<label>Location<select name="Location">.*?</select></label>\s*', '', body, flags=re.S)
        hidden = ('<input type="hidden" name="form-name" value="%s"><input type="hidden" name="Page" value="%s">'
                  '<p class="hp"><label>Leave this empty<input name="bot-field"></label></p>' % (name, page))
        body = body.replace('<button', locsel(default_loc) + '\n      <button', 1)
        return '<form%s name="%s" method="POST" action="/thanks/" data-netlify="true" netlify-honeypot="bot-field">%s%s</form>' % (attrs, name, hidden, body)
    return re.sub(r'<form([^>]*)>(.*?)</form>', one, html, flags=re.S)


def biz(loc, url):
    L = LOC[loc]
    addr = {'@type': 'PostalAddress', 'addressLocality': L['city'], 'addressRegion': L['region'], 'addressCountry': 'US'}
    if L['street']:
        addr.update(streetAddress=L['street'], postalCode=L['zip'])
    d = {'@context': 'https://schema.org', '@type': 'LocalBusiness', 'additionalType': 'https://schema.org/Warehouse',
         'name': '24 HR Crossdock – ' + L['short'], 'url': DOMAIN + url, 'telephone': '+1-916-616-3481', 'email': EMAIL,
         'address': addr, 'parentOrganization': {'@type': 'Organization', 'name': '24 HR Crossdock', 'url': DOMAIN + '/'}}
    if loc == 'reno':
        d['areaServed'] = ['Reno', 'Sparks', 'Northern Nevada', 'Northern California']
    return d


ORG = {'@context': 'https://schema.org', '@type': 'Organization', 'name': '24 HR Crossdock', 'url': DOMAIN + '/',
       'telephone': '+1-916-616-3481', 'email': EMAIL,
       'department': [{'@type': 'LocalBusiness', 'name': '24 HR Crossdock – ' + LOC[k]['short'], 'url': DOMAIN + LOC[k]['home']} for k in LOC]}


def crumbs(trail):
    return {'@context': 'https://schema.org', '@type': 'BreadcrumbList',
            'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': DOMAIN + u} for i, (u, n) in enumerate(trail)]}


ICON = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='8' fill='%230F3B44'/%3E"
        "%3Crect x='8' y='8' width='48' height='48' rx='6' fill='%23A95A24'/%3E%3Ctext x='32' y='43' text-anchor='middle' font-family='Arial Narrow,Arial' "
        "font-weight='800' font-size='30' fill='white'%3E24%3C/text%3E%3C/svg%3E")


# Hero videos: put short, silent, looping MP4s (about 10-20 s, under 5 MB, 1920x1080) in assets/video/
# with a matching .jpg still, named after the section: main.mp4, reno.mp4, sac.mp4, pa.mp4.
def hero_video(body, section):
    for name in (section, 'main'):
        mp4 = os.path.join(ROOT, 'assets', 'video', name + '.mp4')
        if os.path.exists(mp4):
            poster = '/assets/video/%s.jpg' % name if os.path.exists(mp4[:-4] + '.jpg') else ''
            v = '<video class="hv" autoplay muted loop playsinline preload="metadata"%s aria-hidden="true"><source src="/assets/video/%s.mp4" type="video/mp4"></video>' % (' poster="%s"' % poster if poster else '', name)
            return re.sub(r'<section class="hero([^"]*)">', lambda m: '<section class="hero%s hasv">\n  %s' % (m.group(1), v), body, count=1)
    return body


def page(url, title, desc, body, section='main', schema=(), trail=None, cta=None):
    body = hero_video(body, section)
    loc = section if section in LOC else None
    nav = NAV_RENO if section == 'reno' else NAV_MAIN
    logo = LOC['reno']['home'] if section == 'reno' else '/'
    navh = '\n'.join('      <a href="%s"%s>%s</a>' % (u, ' aria-current="page"' if url == u or (len(u) > 1 and url.startswith(u)) else '', n) for u, n in nav)
    if section == 'reno':
        bar = '<b>Reno–Sparks, NV</b><span>%s</span>' % LOC['reno']['bar']
    elif loc:
        bar = '<b>%s</b><span>%s</span>' % (LOC[loc]['short'], LOC[loc]['bar'])
    else:
        bar = '<b>Three docks</b><span>Sparks, NV · North Highlands, CA · Middletown, PA</span>'
    mbl = {'reno': 'Reno–Sparks dock', 'sac': 'Sacramento dock', 'pa': 'Harrisburg dock'}.get(section, 'Three docks: NV · CA · PA') + ', open 6am–10pm'
    qurl = '/quote/' + ('?loc=' + LOC[loc]['q'].replace(' ', '%20').replace(',', '%2C') if loc else '')
    cta = cta or ({'reno': 'Need space in Reno?', 'sac': 'Need a dock in Sacramento?', 'pa': 'Need a dock in Pennsylvania?'}.get(section, 'Need a dock?'))
    ld = ''.join('<script type="application/ld+json">%s</script>\n' % json.dumps(s, ensure_ascii=False) for s in list(schema) + ([crumbs(trail)] if trail else []))
    ctah = '' if url.startswith('/quote/') or url.startswith('/thanks/') else '''<section class="cta">
  <div class="w">
    <div><h2>%s</h2><p>Tell us what you've got. Quote within one business day.</p></div>
    <div class="btns"><a class="btn wht" href="%s">Get a quote</a><a class="btn o" href="%s">%s</a></div>
  </div>
</section>''' % (cta, qurl, TEL, PHONE)
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{DOMAIN}{url}">
<link rel="icon" href="{ICON}">
<meta property="og:type" content="website"><meta property="og:site_name" content="24 HR Crossdock">
<meta property="og:title" content="{title}"><meta property="og:description" content="{desc}"><meta property="og:url" content="{DOMAIN}{url}">
<meta name="theme-color" content="#0F3B44">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Barlow:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css">
{ld}</head>
<body>
<a class="skip" href="#content">Skip to content</a>
<div class="locbar"><div class="w">{bar}<a href="/locations/">{'Other locations' if loc else 'All locations'}</a></div></div>
<header>
  <div class="w bar">
    <a class="logo" href="{logo}"><i>24</i>HR Crossdock</a>
    <nav class="main{' n6' if len(nav) == 6 else ''}" id="nav" aria-label="Main">
{navh}
    </nav>
    <a class="signin" href="{PORTAL}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg><span><span class="sl">Customer </span>Sign In</span></a>
    <a class="btn r" href="{qurl}">Get a quote</a>
  </div>
</header>
<main id="content">
{body}
{ctah}
</main>
<div class="mbar" aria-label="Quick contact"><span class="mb-l">{mbl}</span><a href="{TEL}" class="c">Call {PHONE}</a><a href="{PORTAL}" class="s">Sign in</a><a href="{qurl}" class="q">Get a quote</a></div>
{FOOTER}
<script src="/assets/site.js" defer></script>
</body>
</html>
'''


FOOTER = f'''<footer>
  <div class="w">
    <div class="cols">
      <div><a class="logo" href="/"><i>24</i>HR Crossdock</a><p style="margin-top:14px">Cross-dock and warehousing in Reno–Sparks, NV, Sacramento, CA and Harrisburg, PA.</p></div>
      <div><h4>Reno–Sparks, NV</h4><p><a href="/reno/">Reno home</a></p><p><a href="/reno/pallet-storage/">Pallet storage</a></p><p><a href="/reno/cross-dock/">Cross-dock</a></p><p><a href="/reno/fulfillment/">Fulfillment</a></p><p><a href="/reno/fba-prep/">FBA prep</a></p><p><a href="/reno/transload/">Transload</a></p><p><a href="/reno/delivery/">Delivery</a></p><p><a href="/reno/trailers/">Trailers</a></p></div>
      <div><h4>Our docks</h4><p><a href="/reno/">1095 Spice Islands Dr, Sparks, NV 89431</a></p><p><a href="/sacramento/">3036 Orange Grove Ave, North Highlands, CA 95660</a></p><p><a href="/middletown/">2811 Turnpike Industrial Dr, Middletown, PA 17057</a></p></div>
      <div><h4>Customers</h4><p><a href="{PORTAL}">Customer sign-in</a></p><p><a href="{PORTAL}">Book a truck</a></p><p><a href="{PORTAL}">See your inventory</a></p><p><a href="/get-started/">Get started</a></p></div>
      <div><h4>Company</h4><p><a href="/about/">About us</a></p><p><a href="/technology/">Technology</a></p><p><a href="/quote/">Get a quote</a></p></div>
      <div><h4>Contact</h4><p><a href="{TEL}">{PHONE}</a></p><p><a href="mailto:{EMAIL}">{EMAIL}</a></p><p>Open 6am–10pm</p><p>After-hours by appointment</p></div>
    </div>
    <p class="copy">© 2026 24 HR Crossdock. Fully insured. Sparks, NV · North Highlands, CA · Middletown, PA.</p>
  </div>
  <div class="wordmark" aria-hidden="true">24 HR CROSSDOCK</div>
</footer>'''


def reno_home():
    b = frag('_old_warehousing.html')
    # the home hero form becomes a real form; the network strip links to the other docks
    b = re.sub(r'<div class="network">.*?</div>', '''<div class="network">
      <span class="nl">Our network</span>
      <a href="/reno/"><b>Sparks, NV</b> 3PL warehousing and cross-dock</a>
      <a href="/sacramento/"><b>North Highlands, CA</b> Sacramento-area cross-dock</a>
      <a href="/middletown/"><b>Middletown, PA</b> East Coast cross-dock</a>
    </div>''', b, flags=re.S)
    b = re.sub(r'<section class="stats">.*?</section>', facts('reno'), b, count=1, flags=re.S)
    b += '''
<section class="s a">
  <div class="w split">
    <div class="l">
      <h2>Talk to the Sparks dock</h2>
      <p>One person who knows your freight. Tap the card for a direct line, email, directions and hours.</p>
    </div>
    ''' + manager('reno') + '''
  </div>
</section>'''
    b = b.replace('href="#hq"', 'href="#quote"').replace('<form id="hq"', '<form id="quote"')
    b = b.replace('Already a customer?</b>\n  <ul><li>Book a pickup</li><li>Track your loads</li>', 'Already a customer?</b>\n  <ul><li>Book a truck</li><li>See your inventory</li>')
    return b


def technology():
    b = frag('_old_technology.html')
    # the customer portal is what customers actually use today; say so plainly
    b = b.replace('upload a spreadsheet through your WMS login.', 'upload a spreadsheet through the customer portal.')
    b += f'''
<section class="s a">
  <div class="w split">
    <div class="l">
      <h2>The customer portal</h2>
      <p>Every customer gets a login to our portal. It's where you book trucks, see what's in our warehouse and on the way, approve damage charges, make requests and message the dock.</p>
      <p style="margin-top:24px"><a class="btn r" href="{PORTAL}">Customer sign in</a></p>
    </div>
    <ul class="rows">
      <li><b>Schedule</b><span>A week view of every drop-off and pickup, with live status</span></li>
      <li><b>Inventory</b><span>Pallets and weight on our floor, for pickup and for delivery</span></li>
      <li><b>Requests</b><span>Photos, dimensions, delivery and trailer requests</span></li>
      <li><b>Damage</b><span>Photos and a cost to fix. Accept, decline or call us</span></li>
      <li><b>Bills</b><span>Charges by load and every invoice</span></li>
    </ul>
  </div>
</section>'''
    return b


def cross_dock():
    b = frag('_old_cross-dock.html')
    b = b.replace('<p>For cross-dock accounts only. Warehousing customers use their WMS login.</p>', '<p>For all customers: cross-dock, storage and fulfillment.</p>')
    b = b.replace('href="#portal-xd"', 'href="#portal"').replace('id="portal-xd"', 'id="portal"')
    return b


def maps(loc):
    L = LOC[loc]
    return 'https://www.google.com/maps/search/?api=1&query=' + ('%s, %s, %s %s' % (L['street'], L['city'], L['region'], L['zip'])).replace(' ', '+').replace(',', '%2C')


def addr(loc, sep='<br>'):
    L = LOC[loc]
    return '%s%s%s, %s %s' % (L['street'].replace('Suites 105-106', 'Suites 105–106'), sep, L['city'], L['region'], L['zip'])


def facts(loc):
    L = LOC[loc]
    return f"""<section class="facts"><div class="w"><dl>
  <div><dt>{L['sqft']}</dt><dd>square feet</dd></div>
  <div><dt>{L['doors']}</dt><dd>dock doors</dd></div>
  <div><dt>{HOURS}</dt><dd>{AFTER}</dd></div>
  <div><dt class="ad">{addr(loc)}</dt><dd><a href="{maps(loc)}" rel="noopener">Get directions</a></dd></div>
</dl></div></section>"""


def manager(loc):
    L, M = LOC[loc], MANAGERS[loc]
    name = M['name'] or 'Name and photo coming soon'
    digits = re.sub(r'\D', '', M['phone'])[-10:]
    pic = '<img src="%s" alt="%s" loading="lazy">' % (M['photo'], M['name']) if M['photo'] else '<span aria-hidden="true">%s</span>' % (''.join(w[0] for w in M['name'].split()[:2]) if M['name'] else '24')
    return f"""<details class="mgr">
  <summary>{pic}<div><small>Your {L['city']} contact</small><b>{name}</b><em>{M['title']}</em></div><i aria-hidden="true">+</i></summary>
  <dl>
    <dt>Call</dt><dd><a href="tel:+1{digits}">{M['phone']}</a></dd>
    <dt>Email</dt><dd><a href="mailto:{M['email']}">{M['email']}</a></dd>
    <dt>Dock</dt><dd>{addr(loc)}<br><a href="{maps(loc)}" rel="noopener">Get directions</a></dd>
    <dt>Hours</dt><dd>{HOURS}<br>{AFTER}</dd>
  </dl>
</details>"""


GROW = {'sac': 'Growing to about 100,000 sq ft over the next two years.',
        'pa': 'Growing to 50,000–60,000 sq ft over the next two years.',
        'reno': ''}

SERVICES = {
    'reno': [('Pallet storage', 'Short and long term, floor and racked, billed weekly', '/reno/pallet-storage/'),
             ('Cross-dock', 'Unload, split and reload, with photos at the door', '/reno/cross-dock/'),
             ('Transload and container unloading', 'Floor-loaded containers and trailers palletized and wrapped', '/reno/transload/'),
             ('Fulfillment and FBA prep', 'Pick, pack and ship, Amazon and Walmart prep', '/reno/fulfillment/'),
             ('Reno-area delivery', 'Reno, Sparks, Fernley and Carson City', '/reno/delivery/'),
             ('Trailers', 'Trailer parking, reefer storage and rental per drop', '/reno/trailers/')],
    'sac': [('Cross-dock', 'Unload, split by destination and reload', ''),
            ('Transload and container unloading', 'Floor-loaded freight palletized, wrapped and reloaded', ''),
            ('Pallet storage', 'Short and long term, for Sacramento and Northern California', ''),
            ('Consolidation', 'Multiple shippers built into one outbound load', ''),
            ('Restack and rewrap', 'Leaning or damaged pallets fixed, with photos and your approval', '')],
    'pa': [('Cross-dock', 'Unload, split by destination and reload, with 50 dock doors', ''),
           ('Transload and container unloading', 'Floor-loaded freight palletized, wrapped and reloaded', ''),
           ('Pallet storage', 'Short and long term on the East Coast', ''),
           ('Order staging', 'Orders held and released to your delivery partner on schedule', ''),
           ('Westbound consolidation', 'Loads built for our Nevada and California docks', '')],
}

REACH = {
    'sac': [('~15 min', 'to downtown Sacramento'), ('~2 hrs', 'to the Bay Area'), ('~2 hrs', 'to our Sparks dock'), ('I-80', 'and Business 80 nearby')],
    'pa': [('~2 hrs', 'to Philadelphia and Baltimore'), ('~3 hrs', 'to New York and New Jersey'), ('~2 hrs', 'to Washington, DC'), ('I-76', 'I-283, I-83 and I-81 nearby')],
}


def rows(loc):
    return '\n'.join('      <li><b>%s</b><span>%s</span></li>' % ('<a href="%s">%s</a>' % (u, t) if u else t, d) for t, d, u in SERVICES[loc])


def location_page(loc):
    L = LOC[loc]
    head = {'sac': ('Cross-dock and pallet storage in Sacramento, <span>North Highlands.</span>',
                    'A 40,000 sq ft dock with 8 doors for freight moving into Sacramento and Northern California. Cross-dock, transload and pallet storage, short or long term, with every load counted and photographed.'),
            'pa': ('Cross-dock and pallet storage in Harrisburg, <span>Middletown, PA.</span>',
                   'A 25,000 sq ft dock with 50 doors, built for fast turns on the East Coast. Cross-dock, transload, order staging and pallet storage, a day\'s drive from most of the Northeast.')}[loc]
    reach = ''.join('<div><b>%s</b><span>%s</span></div>' % r for r in REACH[loc])
    grow = '<p class="grow"><b>Built to grow.</b> %s</p>' % GROW[loc] if GROW[loc] else ''
    return f"""<section class="hero sm">
  <div class="w grid"><div>
    <span class="crumb"><a href="/locations/">Locations</a> / {L['city']}, {L['region']}</span>
    <h1>{head[0]}</h1>
    <p class="sub">{head[1]}</p>
    <div class="ctas"><a class="btn r" href="/quote/">Get a quote</a><a class="btn o" href="{TEL}">Call {PHONE}</a></div>
  </div></div>
</section>
{facts(loc)}
<section class="s">
  <div class="w split">
    <div class="l">
      <h2>What we do in {L['city']}</h2>
      <p>The same receiving standard as every 24 HR Crossdock dock: seal checked, counted against the BOL, photographed at the door, and in your customer portal the same day.</p>
      {grow}
      <div class="facts3">{reach}</div>
      <p class="fine">Drive times are approximate and depend on traffic.</p>
    </div>
    <ul class="rows">
{rows(loc)}
    </ul>
  </div>
</section>
<section class="s a">
  <div class="w split">
    <div class="l">
      <h2>Talk to the {L['city']} dock</h2>
      <p>One person who knows your freight. Tap the card for a direct line, email, directions and hours.</p>
    </div>
    {manager(loc)}
  </div>
</section>"""


def locations():
    cards = ''
    for k, L in LOC.items():
        lst = ''.join('<li>%s</li>' % t for t, d, u in SERVICES[k][:5])
        grow = '<p class="lgrow">%s</p>' % GROW[k] if GROW[k] else '<p class="lgrow">Our most flexible 3PL warehouse.</p>'
        cards += f"""
      <article>
        <span class="tag">{L['short']}</span>
        <h3>{L['city']}, {L['region']}</h3>
        <p class="lsub">{L['sqft']} sq ft · {L['doors']} dock doors</p>
        <ul>{lst}</ul>
        {grow}
        <p class="laddr">{addr(k)}<br><a href="{maps(k)}" rel="noopener">Get directions</a></p>
        <div class="lbtns"><a class="btn r" href="{L['home']}">{L['label']} page</a></div>
      </article>"""
    return f"""<section class="hero sm">
  <div class="w grid"><div>
    <span class="crumb">Locations</span>
    <h1>Three docks. <span>One standard.</span></h1>
    <p class="sub">30,000+ pallets a month through 105,000 square feet and 66 dock doors in Sparks, Nevada; North Highlands, California; and Middletown, Pennsylvania. Cross-dock, transload and pallet storage at every one, open {HOURS}.</p>
    <div class="ctas"><a class="btn r" href="/quote/">Get a quote</a><a class="btn o" href="{TEL}">Call {PHONE}</a></div>
  </div></div>
</section>
<section class="s"><div class="w"><div class="loccards rv">{cards}
</div></div></section>
<section class="s a">
  <div class="w split">
    <div class="l">
      <h2>Room to grow with you</h2>
      <p>We're growing into more space as our customers grow. North Highlands is set to reach about 100,000 sq ft and Middletown 50,000–60,000 sq ft over the next two years. Sparks stays our flexible 3PL warehouse for storage, fulfillment and FBA prep.</p>
    </div>
    <ul class="rows">
      <li><b>Same receiving</b><span>Seal checked, counted against the BOL, photographed at the door</span></li>
      <li><b>Same damage process</b><span>Photos and a cost to fix, and nothing is charged until you approve it</span></li>
      <li><b>Same portal</b><span>Book trucks, see inventory and approve charges for every location</span></li>
      <li><b>Same hours</b><span>{HOURS} at every dock, {AFTER}</span></li>
      <li><b>One number</b><span>{PHONE} reaches the people running the docks</span></li>
    </ul>
  </div>
</section>"""


THANKS = '''<section class="hero sm"><div class="w grid"><div>
  <span class="crumb">Thank you</span>
  <h1>Got it. <span>We'll be in touch.</span></h1>
  <p class="sub">Your request is in. We usually reply the same business day. Need us sooner? Call 916-616-3481.</p>
  <div class="ctas"><a class="btn r" href="/">Back to the home page</a><a class="btn o" href="tel:+19166163481">Call 916-616-3481</a></div>
</div></div></section>'''

NOTFOUND = '''<section class="hero sm"><div class="w grid"><div>
  <span class="crumb">Page not found</span>
  <h1>That page <span>moved.</span></h1>
  <p class="sub">Pick your location to keep going.</p>
  <div class="ctas"><a class="btn r" href="/reno/">Reno–Sparks, NV</a><a class="btn o" href="/sacramento/">Sacramento, CA</a><a class="btn o" href="/middletown/">Harrisburg, PA</a></div>
</div></div></section>'''


def build():
    if os.path.isdir(OUT):
        for f in os.listdir(OUT):
            p = os.path.join(OUT, f)
            shutil.rmtree(p) if os.path.isdir(p) else os.remove(p)
    else:
        os.makedirs(OUT)
    shutil.copytree(os.path.join(ROOT, 'assets'), os.path.join(OUT, 'assets'))
    R = 'reno'
    pages = [
        ('/', '24 HR Crossdock | Cross-Dock & Warehousing in Reno, Sacramento and Harrisburg',
         '30,000+ pallets a month through three docks: Reno–Sparks NV, North Highlands CA and Middletown PA. Cross-dock, pallet storage, transload and fulfillment. Call 916-616-3481.',
         frag('hub.html'), 'main', [ORG], None),
        ('/reno/', '3PL Warehousing & Cross-Dock in Reno–Sparks, NV | 24 HR Crossdock',
         'Pallet storage, cross-dock, container unloading, fulfillment and FBA prep in Sparks, NV. 40,000 sq ft, 8 dock doors on I-80. Call 916-616-3481.',
         reno_home(), R, [biz(R, '/reno/')], [('/', 'Home'), ('/reno/', 'Reno–Sparks, NV')]),
        ('/reno/pallet-storage/', 'Pallet Storage in Reno–Sparks, NV | 24 HR Crossdock',
         'Short or long-term pallet storage in Sparks, NV. Counted and photographed on arrival, billed weekly, no long contract.',
         frag('_old_pallet-storage-reno.html'), R, [biz(R, '/reno/')], [('/', 'Home'), ('/reno/', 'Reno–Sparks, NV'), ('/reno/pallet-storage/', 'Pallet storage')]),
        ('/reno/cross-dock/', 'Cross-Dock in Reno–Sparks on I-80 | 24 HR Crossdock',
         'Cross-dock in Sparks, NV: unload, split and reload, with seal checks, BOL counts and photos at the door. Call 916-616-3481.',
         cross_dock(), R, [biz(R, '/reno/')], [('/', 'Home'), ('/reno/', 'Reno–Sparks, NV'), ('/reno/cross-dock/', 'Cross-dock')]),
        ('/reno/fulfillment/', 'Order Fulfillment & Amazon FBA Prep in Reno, NV | 24 HR Crossdock',
         'Pick, pack and ship plus Amazon FBA and Walmart WFS prep from our Sparks, NV warehouse.',
         frag('_old_fulfillment.html'), R, [biz(R, '/reno/')], [('/', 'Home'), ('/reno/', 'Reno–Sparks, NV'), ('/reno/fulfillment/', 'Fulfillment')]),
        ('/reno/fba-prep/', 'Amazon FBA Prep in Reno, NV | 24 HR Crossdock',
         'Amazon FBA prep in Sparks, NV: FNSKU labels, poly bags, bundles and case packs to Amazon rules.',
         frag('_old_fba-prep-reno.html'), R, [biz(R, '/reno/')], [('/', 'Home'), ('/reno/', 'Reno–Sparks, NV'), ('/reno/fba-prep/', 'FBA prep')]),
        ('/reno/transload/', 'Container Unloading & Transload in Reno–Sparks, NV | 24 HR Crossdock',
         'Floor-loaded containers and trailers unloaded, palletized and wrapped in Sparks, NV. Stored or reloaded the same day.',
         frag('transload.html'), R, [biz(R, '/reno/')], [('/', 'Home'), ('/reno/', 'Reno–Sparks, NV'), ('/reno/transload/', 'Transload')]),
        ('/reno/delivery/', 'Pallet Delivery in Reno, Sparks & Carson City | 24 HR Crossdock',
         'Final-mile pallet delivery from Sparks to Reno, Fernley and Carson City with signed proof of delivery.',
         frag('delivery.html'), R, [biz(R, '/reno/')], [('/', 'Home'), ('/reno/', 'Reno–Sparks, NV'), ('/reno/delivery/', 'Delivery')]),
        ('/reno/trailers/', 'Trailer Parking & Reefer Trailer Storage in Sparks, NV | 24 HR Crossdock',
         'Trailer parking, locked refrigerated trailer storage and trailer rental per drop in Sparks, NV, right off I-80.',
         frag('trailers.html'), R, [biz(R, '/reno/')], [('/', 'Home'), ('/reno/', 'Reno–Sparks, NV'), ('/reno/trailers/', 'Trailers')]),
        ('/sacramento/', 'Cross-Dock in Sacramento – North Highlands, CA | 24 HR Crossdock',
         'Cross-dock, transload and short-term staging in North Highlands, CA for Sacramento and Northern California. Call 916-616-3481.',
         location_page('sac'), 'sac', [biz('sac', '/sacramento/')], [('/', 'Home'), ('/sacramento/', 'Sacramento, CA')]),
        ('/middletown/', 'Cross-Dock in Harrisburg – Middletown, PA | 24 HR Crossdock',
         'East Coast cross-dock and order staging in Middletown, PA, near Harrisburg on I-76, I-283, I-83 and I-81. Call 916-616-3481.',
         location_page('pa'), 'pa', [biz('pa', '/middletown/')], [('/', 'Home'), ('/middletown/', 'Harrisburg, PA')]),
        ('/locations/', 'Locations: Reno NV, Sacramento CA, Harrisburg PA | 24 HR Crossdock',
         'Three docks, one standard: Sparks NV, North Highlands CA and Middletown PA.',
         locations(), 'main', [ORG], [('/', 'Home'), ('/locations/', 'Locations')]),
        ('/technology/', 'Customer Portal, WMS & Integrations | 24 HR Crossdock',
         'Our customer portal, warehouse system and integrations: e-commerce, EDI, API and spreadsheet upload.',
         technology(), 'main', [ORG], [('/', 'Home'), ('/technology/', 'Technology')]),
        ('/about/', 'About Us, Our Standards and Team | 24 HR Crossdock',
         'Built on the dock floor. Our operating standards for receiving, storage, shipping and damage, at all three docks.',
         frag('_old_company.html'), 'main', [ORG], [('/', 'Home'), ('/about/', 'About')]),
        ('/get-started/', 'How to Get Started | 24 HR Crossdock',
         'Onboarding step by step: quote, account setup, first inbound and go-live.',
         frag('_old_get-started.html'), 'main', [ORG], [('/', 'Home'), ('/get-started/', 'Get started')]),
        ('/quote/', 'Get a Quote | 24 HR Crossdock',
         'Request a quote for cross-dock, storage, transload, fulfillment or delivery. Reply within one business day.',
         frag('_old_quote.html'), 'main', [ORG], [('/', 'Home'), ('/quote/', 'Get a quote')]),
        ('/thanks/', 'Thank You | 24 HR Crossdock', 'Your request was received.', THANKS, 'main', [], None),
    ]
    for url, title, desc, body, section, schema, trail in pages:
        loc = section if section in LOC else None
        body = fix(body, loc)
        body = forms(body, url, LOC[loc]['q'] if loc else 'Not sure')
        html = page(url, title.replace('&', '&amp;'), desc.replace('&', '&amp;'), body, section, schema, trail)
        d = os.path.join(OUT, url.strip('/'))
        os.makedirs(d, exist_ok=True)
        open(os.path.join(d, 'index.html'), 'w').write(html)
    open(os.path.join(OUT, '404.html'), 'w').write(page('/404/', 'Page Not Found | 24 HR Crossdock', 'Page not found.', NOTFOUND))
    sm = ''.join('  <url><loc>%s%s</loc></url>\n' % (DOMAIN, p[0]) for p in pages if p[0] != '/thanks/')
    open(os.path.join(OUT, 'sitemap.xml'), 'w').write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n%s</urlset>\n' % sm)
    open(os.path.join(OUT, 'robots.txt'), 'w').write('User-agent: *\nAllow: /\nDisallow: /thanks/\nSitemap: %s/sitemap.xml\n' % DOMAIN)
    leftover = [u for u, *_ in pages if '#/' in open(os.path.join(OUT, u.strip('/'), 'index.html')).read()]
    print('built', len(pages), 'pages', 'LEFTOVER HASH LINKS:' if leftover else '', leftover or '')


if __name__ == '__main__':
    build()
