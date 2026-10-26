"""Builds the multi-location 24 HR Crossdock website into ../site (deployed by Netlify).

Run:  python3 site-src/build.py
Each page is a real URL (/reno/, /reno/cross-dock/, /sacramento/ ...) so Google can list it,
and each Google Maps listing can point at its own location home page.
"""
import html as html_lib, json, os, re, shutil, sys

sys.dont_write_bytecode = True   # no __pycache__ folder in site-src
ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)
import drivers_text as DT   # the /drivers/ page words in six languages
OUT = os.path.join(os.path.dirname(ROOT), 'site')
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

HOURS = 'Mon–Fri 6am–10pm'
AFTER = 'nights and weekends by appointment, $100 fee for 10pm–6am'
SINCE = '2015'
SMS = 'sms:+19166163481'
BOOK = ''   # Google Calendar booking-page link. The "Book a call" buttons appear once this is filled in.
GA_ID = ''  # Google Analytics 4 ID (G-XXXXXXXXXX). Visit tracking turns on once this is filled in.
# Real customer quotes for the home page: ('Quote text', 'Name, title', 'Company'). Only with the customer's OK.
TESTIMONIALS = []
LOC = {
    'reno': dict(key='reno', city='Sparks', region='NV', short='Reno–Sparks, NV', label='Reno, NV', q='Sparks, NV',
                 street='1095 Spice Islands Dr, Suites 105-106', zip='89431', home='/reno/', sqft='40,000', doors='8',
                 bar='1095 Spice Islands Dr, Sparks, NV · Docks Mon–Fri 6am–10pm · Phone 24/7'),
    'sac': dict(key='sac', city='North Highlands', region='CA', short='Sacramento area, CA', label='Sacramento, CA', q='North Highlands, CA',
                street='3036 Orange Grove Ave', zip='95660', home='/sacramento/', sqft='40,000', doors='8',
                bar='3036 Orange Grove Ave, North Highlands, CA · Docks Mon–Fri 6am–10pm · Phone 24/7'),
    'pa': dict(key='pa', city='Middletown', region='PA', short='Harrisburg area, PA', label='Harrisburg, PA', q='Middletown, PA',
               street='2811 Turnpike Industrial Dr', zip='17057', home='/middletown/', sqft='25,000', doors='50',
               bar='2811 Turnpike Industrial Dr, Middletown, PA · Docks Mon–Fri 6am–10pm · Phone 24/7'),
}
# Site managers: fill in name, title, phone, email and a photo path (e.g. /assets/team/reno.jpg) when ready.
MANAGERS = {
    'reno': dict(name='', title='Site manager, Sparks', phone=PHONE, email=EMAIL, photo=''),
    'sac': dict(name='', title='Site manager, North Highlands', phone=PHONE, email=EMAIL, photo=''),
    'pa': dict(name='', title='Site manager, Middletown', phone=PHONE, email=EMAIL, photo=''),
}

NAV_MAIN = [('/reno/', 'Reno, NV'), ('/sacramento/', 'Sacramento, CA'), ('/middletown/', 'Harrisburg, PA'),
            ('/services/', 'Services'), ('/client-portal/', 'Client Portal'), ('/about/', 'About')]
NAV_RENO = [('/reno/pallet-storage/', 'Storage'), ('/reno/cross-dock/', 'Cross-Dock'), ('/reno/fulfillment/', 'Fulfillment'),
            ('/reno/transload/', 'Transload'), ('/reno/delivery/', 'Delivery'), ('/locations/', 'Locations')]

# old single-page hash links -> real URLs
HASH = {'#/': '/reno/', '#/fulfillment': '/reno/fulfillment/', '#/cross-dock': '/reno/cross-dock/',
        '#/technology': '/client-portal/', '#/get-started': '/get-started/', '#/company': '/about/',
        '#/quote': '/quote/', '#/locations': '/locations/', '#/sacramento': '/sacramento/',
        '#/middletown': '/middletown/', '#/pallet-storage-reno': '/reno/pallet-storage/', '#/fba-prep-reno': '/reno/fba-prep/'}


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


def frag(name):
    return tpl(open(os.path.join(ROOT, 'pages', name)).read())


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


SVC = ['Cross-dock', 'Long-term pallet storage', 'Short-term pallet storage', 'Transload / container unloading',
       'Restack / rework', 'Fulfillment / FBA prep (Reno)', 'Delivery', 'Not sure yet']
NEXT = ('<div class="next"><b>What happens next</b><ol><li>We call you back within one hour, day or night.</li>'
        '<li>We confirm the details. About 10 minutes.</li><li>You get your rates in writing.</li></ol></div>')


def forms(html, page, default_loc):
    """Every quote form is the same two-step Netlify form: four quick fields, then optional details.
    Netlify emails each submission to the office (set the notification up in Netlify > Forms)."""
    def one(m):
        attrs, body = m.group(1), m.group(2)
        src = re.search(r'data-src="([^"]*)"', attrs)
        src = src.group(1) if src else page
        name = 'quote-' + re.sub(r'[^a-z0-9]+', '-', src.lower()).strip('-')
        attrs = re.sub(r'\sdata-src="[^"]*"', '', attrs)   # keep id: /reno/'s "Request a quote" button links to #quote
        head = '\n      '.join(re.findall(r'<h2>.*?</h2>|<p class="fs">.*?</p>', body))
        svc = 'Long-term pallet storage' if 'storage' in src.lower() else 'Fulfillment / FBA prep (Reno)' if 'FBA' in src else 'Cross-dock'
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


def biz(loc, url):
    L = LOC[loc]
    addr = {'@type': 'PostalAddress', 'addressLocality': L['city'], 'addressRegion': L['region'], 'addressCountry': 'US'}
    if L['street']:
        addr.update(streetAddress=L['street'], postalCode=L['zip'])
    d = {'@context': 'https://schema.org', '@type': 'LocalBusiness', 'additionalType': 'https://schema.org/Warehouse',
         'name': '24 HR Crossdock – ' + L['short'], 'url': DOMAIN + url, 'telephone': '+1-916-616-3481', 'email': EMAIL,
         'address': addr, 'parentOrganization': {'@type': 'Organization', 'name': '24 HR Crossdock', 'url': DOMAIN + '/'}}
    d['openingHoursSpecification'] = [{'@type': 'OpeningHoursSpecification', 'dayOfWeek': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                                        'opens': '06:00', 'closes': '22:00'}]
    if loc == 'reno':
        d['areaServed'] = ['Reno', 'Sparks', 'Northern Nevada', 'Northern California']
    return d


ORG = {'@context': 'https://schema.org', '@type': 'Organization', 'name': '24 HR Crossdock', 'url': DOMAIN + '/',
       'telephone': '+1-916-616-3481', 'email': EMAIL,
       'department': [{'@type': 'LocalBusiness', 'name': '24 HR Crossdock – ' + LOC[k]['short'], 'url': DOMAIN + LOC[k]['home']} for k in LOC]}


def crumbs(trail):
    return {'@context': 'https://schema.org', '@type': 'BreadcrumbList',
            'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': DOMAIN + u} for i, (u, n) in enumerate(trail)]}


ICON = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='8' fill='%230B1B30'/%3E"
        "%3Crect x='8' y='8' width='48' height='48' rx='6' fill='%23C2410C'/%3E%3Ctext x='32' y='43' text-anchor='middle' font-family='Arial Narrow,Arial' "
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


GA = ('''<script async src="https://www.googletagmanager.com/gtag/js?id=%s"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','%s');</script>
''' % (GA_ID, GA_ID)) if GA_ID else ''


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
    qurl = '/quote/' + ('?loc=' + LOC[loc]['q'].replace(' ', '%20').replace(',', '%2C') if loc else '')
    cta = cta or ({'reno': 'Need space in Reno?', 'sac': 'Need a dock in Sacramento?', 'pa': 'Need a dock in Pennsylvania?'}.get(section, 'Need a dock?'))
    ld = ''.join('<script type="application/ld+json">%s</script>\n' % json.dumps(s, ensure_ascii=False) for s in list(schema) + ([crumbs(trail)] if trail else []))
    # Punjabi and Hindi need their own fonts (Barlow has no Gurmukhi or Devanagari); only loaded on pages that use them
    indic = '&family=Noto+Sans+Gurmukhi:wght@400;700&family=Noto+Sans+Devanagari:wght@400;700' if re.search(r'[\u0900-\u097f\u0a00-\u0a7f]', body) else ''
    ctah = '' if url.startswith(('/quote/', '/thanks/', '/drivers/')) else '''<section class="cta">
  <div class="w">
    <div><h2>%s</h2><p>Call 24/7, or send four quick fields and we call you back within one hour.</p></div>
    <div class="btns"><a class="btn wht" href="%s">Call %s</a><a class="btn o" href="%s">Get a quote</a><a class="btn o" href="%s">Text us</a>%s</div>
  </div>
</section>''' % (cta, TEL, PHONE, qurl, SMS, '<a class="btn o" href="%s" rel="noopener">Book a call</a>' % BOOK if BOOK else '')
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
<meta name="theme-color" content="#0B1B30">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Barlow:wght@400;500;600;700{indic}&display=swap" rel="stylesheet">
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
<div class="mbar" aria-label="Call us"><a href="{TEL}" class="c"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>Call 24/7: {PHONE}</a></div>
{FOOTER}
<script src="/assets/site.js" defer></script>
</body>
</html>
'''


FOOTER = f'''<footer>
  <div class="w">
    <div class="cols">
      <div><a class="logo" href="/"><i>24</i>HR Crossdock</a><p style="margin-top:14px">Cross-dock, transload and pallet storage in Reno–Sparks, NV, Sacramento, CA and Harrisburg, PA. Since 2015.</p></div>
      <div><h4>Reno–Sparks, NV</h4><p><a href="/reno/">Reno home</a></p><p><a href="/reno/pallet-storage/">Pallet storage</a></p><p><a href="/reno/cross-dock/">Cross-dock</a></p><p><a href="/reno/fulfillment/">Fulfillment</a></p><p><a href="/reno/fba-prep/">FBA prep</a></p><p><a href="/reno/transload/">Transload</a></p><p><a href="/reno/delivery/">Delivery</a></p></div>
      <div><h4>Our docks</h4><p><a href="/reno/">1095 Spice Islands Dr, Sparks, NV 89431</a></p><p><a href="/sacramento/">3036 Orange Grove Ave, North Highlands, CA 95660</a></p><p><a href="/middletown/">2811 Turnpike Industrial Dr, Middletown, PA 17057</a></p></div>
      <div><h4>Clients</h4><p><a href="{PORTAL}">Client sign-in</a></p><p><a href="{PORTAL_SIGNUP}">Open an account</a></p><p><a href="{PORTAL}">Book a truck</a></p><p><a href="/client-portal/">How the portal works</a></p><p><a href="/drivers/">Driver check-in</a></p><p><a href="/get-started/">Get started</a></p></div>
      <div><h4>Company</h4><p><a href="/about/">About us</a></p><p><a href="/services/">Services</a></p><p><a href="/locations/">Locations</a></p><p><a href="/quote/">Get a quote</a></p></div>
      <div><h4>Contact</h4><p><a href="{TEL}">{PHONE}</a> (24/7)</p><p><a href="{SMS}">Text us</a></p><p><a href="mailto:{EMAIL}">{EMAIL}</a></p><p>Docks Mon–Fri 6am–10pm</p><p>Nights and weekends by appointment</p></div>
    </div>
    <p class="copy">© 2026 24 HR Crossdock. Since 2015. Fully insured. Sparks, NV · North Highlands, CA · Middletown, PA.</p>
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
      <p>''' + mgr_intro('reno') + '''</p>
    </div>
    ''' + manager('reno') + '''
  </div>
</section>
''' + driver_box('reno')
    b = b.replace('<h1>Reno 3PL warehousing, <span>done right.</span></h1>', '<h1>Reno cross-dock and warehousing, <span>done right.</span></h1>')
    b = b.replace('<p class="sub">Pallet storage, container unloading, fulfillment and delivery on I-80 in Sparks, Nevada.',
                  '<p class="sub">Cross-dock, long-term pallet storage, container unloading, fulfillment and delivery on our own trucks, on I-80 in Sparks, Nevada.')
    b = b.replace('<section class="s a">\n  <div class="w split">\n    <div class="l">\n      <h2>Talk to the Sparks dock</h2>', storage('reno') + '\n<section class="s a">\n  <div class="w split">\n    <div class="l">\n      <h2>Talk to the Sparks dock</h2>')
    b = b.replace('href="#hq"', 'href="#quote"').replace('<form id="hq"', '<form id="quote"')
    b = b.replace('Already a customer?</b>\n  <ul><li>Book a pickup</li><li>Track your loads</li>', 'Already a customer?</b>\n  <ul><li>Book a truck</li><li>See your inventory</li>')
    return b


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


def faq_ld(body):
    """FAQPage schema built from the page's own visible questions, so the two always match. Badges are left out."""
    m = re.search(r'<div class="faq">(.*?)</div>', body, re.S)
    if not m:
        return None
    def txt(s):
        s = s.replace(SOON, '')
        return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', s)).replace('&amp;', '&').strip()
    qa = re.findall(r'<details><summary>(.*?)</summary>(.*?)</details>', m.group(1), re.S)
    return {'@context': 'https://schema.org', '@type': 'FAQPage',
            'mainEntity': [{'@type': 'Question', 'name': txt(q), 'acceptedAnswer': {'@type': 'Answer', 'text': txt(a)}} for q, a in qa]}


def client_portal():
    """The client portal page (fragment pages/_old_technology.html; the old file name is kept)."""
    b = frag('_old_technology.html')
    b = b.replace('<!--TRUCKCARD-->', feat('livecard', truck_card(), off=''))
    b = b.replace('<!--LANGS-->', lang_tiles(link=True))
    b = b.replace('<!--ALERTS-->', alerts_table())
    return b


def cross_dock():
    b = frag('_old_cross-dock.html')
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


def mgr_intro(loc):
    """Line next to the manager card. "One person" only once a manager's name is filled in."""
    who = 'One person who knows your freight.' if MANAGERS[loc]['name'] else 'The people who run this dock.'
    return who + ' Tap the card for a direct line, email, directions and hours.'


def manager(loc):
    L, M = LOC[loc], MANAGERS[loc]
    name = M['name'] or 'The %s dock team' % L['city']
    digits = re.sub(r'\D', '', M['phone'])[-10:]
    pic = '<img src="%s" alt="%s" loading="lazy">' % (M['photo'], M['name']) if M['photo'] else '<span aria-hidden="true">%s</span>' % (''.join(w[0] for w in M['name'].split()[:2]) if M['name'] else '24')
    return f"""<details class="mgr">
  <summary>{pic}<div><small>Your {L['city']} contact</small><b>{name}</b><em>{M['title'] if M['name'] else 'Direct line, email and directions'}</em></div><i aria-hidden="true">+</i></summary>
  <dl>
    <dt>Call</dt><dd><a href="tel:+1{digits}">{M['phone']}</a></dd>
    <dt>Email</dt><dd><a href="mailto:{M['email']}">{M['email']}</a></dd>
    <dt>Dock</dt><dd>{addr(loc)}<br><a href="{maps(loc)}" rel="noopener">Get directions</a></dd>
    <dt>Hours</dt><dd>{HOURS}<br>{AFTER}</dd>
  </dl>
</details>"""


# One line per dock on the locations page (growth plans stay private)
LINE = {'reno': 'Our most flexible dock: cross-dock, storage, fulfillment and delivery.',
        'sac': 'Cross-dock and long-term pallet storage for Northern California.',
        'pa': '50 doors for cross-dock, restack and rework on the East Coast.'}

SERVICES = {
    'reno': [('Cross-dock', 'Unload, split and reload the same day, with photos at the door', '/reno/cross-dock/'),
             ('Long-term pallet storage', 'Floor and racked, a week or a year, billed weekly', '/reno/pallet-storage/'),
             ('Transload and container unloading', 'Floor-loaded and palletized containers unloaded and wrapped', '/reno/transload/'),
             ('Fulfillment and FBA prep', 'Pick, pack and ship, Amazon and Walmart prep', '/reno/fulfillment/'),
             ('Delivery, our own trucks', 'Local or long distance, with signed proof of delivery', '/reno/delivery/'),
             ('Restack, shrink wrap and labeling', 'Pallets rebuilt, wrapped and labeled for the next carrier', '')],
    'sac': [('Cross-dock', 'Unload, split by destination and reload the same day', ''),
            ('Long-term pallet storage', 'Floor and racked, a week or a year, for Northern California', ''),
            ('Transload and container unloading', 'Floor-loaded and palletized freight unloaded, wrapped and reloaded', ''),
            ('Restack and rework', 'Leaning or damaged pallets rebuilt, with photos and your approval', ''),
            ('Shrink wrap and labeling', 'Pallets wrapped and labeled for the next carrier', ''),
            ('Consolidation', 'Multiple shippers built into one outbound load', '')],
    'pa': [('Restack and rework', 'Leaning, damaged or mixed pallets rebuilt, sorted and wrapped, with photos and your approval', ''),
           ('Cross-dock', 'Unload, split by destination and reload, with 50 dock doors', ''),
           ('Long-term pallet storage', 'Floor and racked, a week or a year, on the East Coast', ''),
           ('Transload and container unloading', 'Floor-loaded and palletized freight unloaded, wrapped and reloaded', ''),
           ('Shrink wrap and labeling', 'Pallets wrapped and labeled for the next carrier or the receiver', ''),
           ('Order staging', 'Orders held and released to your carrier on schedule', '')],
}

REACH = {
    'sac': [('~15 min', 'to downtown Sacramento'), ('~2 hrs', 'to the Bay Area'), ('~2 hrs', 'to our Sparks dock'), ('I-80', 'and Business 80 nearby')],
    'pa': [('~2 hrs', 'to Philadelphia and Baltimore'), ('~3 hrs', 'to New York and New Jersey'), ('~2 hrs', 'to Washington, DC'), ('I-76', 'I-283, I-83 and I-81 nearby')],
}


def rows(loc):
    return '\n'.join('      <li><b>%s</b><span>%s</span></li>' % ('<a href="%s">%s</a>' % (u, t) if u else t, d) for t, d, u in SERVICES[loc])


def storage(loc):
    L = LOC[loc]
    q = '/quote/?loc=%s&amp;svc=Long-term%%20pallet%%20storage' % L['q'].replace(' ', '%20').replace(',', '%2C')
    rel = 'Full or partial, any carrier or our own trucks' if loc == 'reno' else 'Full or partial, to any carrier'
    return f"""<section class="s store">
  <div class="w split">
    <div class="l">
      <span class="tag">Long-term storage</span>
      <h2>Long-term pallet storage in {L['label'].split(',')[0]}</h2>
      <p>Store one pallet for a week or a truckload for a year. Dry, floor and racked, counted and photographed on arrival, and visible in your client portal. Billed weekly, no minimums, no long contract.</p>
      <p style="margin-top:24px"><a class="btn r" href="{q}">Get a storage quote</a></p>
    </div>
    <ul class="rows">
      <li><b>Floor and racked</b><span>Block-stacked or in pallet racking</span></li>
      <li><b>Any length</b><span>A week, a month or a year</span></li>
      <li><b>No minimums</b><span>One pallet or a thousand</span></li>
      <li><b>Releases</b><span>{rel}</span></li>
      <li><b>Fully insured</b><span>Certificate of insurance on request</span></li>
    </ul>
  </div>
</section>"""


def location_page(loc):
    L = LOC[loc]
    head = {'sac': ('Cross-dock and long-term storage in <span>Sacramento.</span>',
                    'A 40,000 sq ft dock with 8 doors in North Highlands, 15 minutes from downtown Sacramento. Trailers cross-docked the same day and pallets stored for a week or a year, every load counted and photographed.'),
            'pa': ('Cross-dock, restack and rework in <span>Harrisburg.</span>',
                   'A 25,000 sq ft dock with 50 doors in Middletown, PA, built for fast turns and pallet rework on the East Coast. Leaning, damaged or mixed pallets rebuilt, sorted, labeled and wrapped, then cross-docked or stored.')}[loc]
    reach = ''.join('<div><b>%s</b><span>%s</span></div>' % r for r in REACH[loc])
    return f"""<section class="hero sm">
  <div class="w grid"><div>
    <span class="crumb"><a href="/locations/">Locations</a> / {L['city']}, {L['region']}</span>
    <h1>{head[0]}</h1>
    <p class="sub">{head[1]}</p>
    <div class="ctas"><a class="btn r" href="{TEL}">Call 24/7: {PHONE}</a><a class="btn o" href="/quote/">Get a quote</a></div>
  </div></div>
</section>
{facts(loc)}
<section class="s">
  <div class="w split">
    <div class="l">
      <h2>What we do in {L['city']}</h2>
      <p>The same receiving standard as every 24 HR Crossdock dock: seal checked, counted against the BOL, photographed at the door, and in your customer portal the same day.</p>
      <div class="facts3">{reach}</div>
      <p class="fine">Drive times are approximate and depend on traffic.</p>
    </div>
    <ul class="rows">
{rows(loc)}
    </ul>
  </div>
</section>
{storage(loc)}
{driver_box(loc)}
<section class="s a">
  <div class="w split">
    <div class="l">
      <h2>Talk to the {L['city']} dock</h2>
      <p>{mgr_intro(loc)}</p>
    </div>
    {manager(loc)}
  </div>
</section>"""


def on(key):
    """True when a feature is live (for wording that changes, rather than a feature shown with a badge)."""
    return LIVE[key] == 'live'


def esc(s):
    return html_lib.escape(s, quote=False)


def lang_names(sep=', ', last=' or '):
    names = ['<span lang="%s">%s</span>' % (c, n) for c, n, e in LANGS]
    return sep.join(names[:-1]) + last + names[-1]


def driver_box(loc):
    """Check-in facts for drivers on each location page (English; /drivers/ has all six languages)."""
    L = LOC[loc]
    kiosk = loc in KIOSK_DOCKS and on('kiosk')
    after = AFTER[0].upper() + AFTER[1:]
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
      <h2>Checking in at {L['city']}</h2>
      {how}
      {lang_tiles(light=True, link=True) if kiosk else ''}
      <p class="dbtn"><a class="btn r" href="/drivers/">Driver check-in steps</a></p>
    </div>
    <dl class="dbox">
      <dt>Address</dt><dd>{addr(loc)}<br><a href="{maps(loc)}" rel="noopener">Get directions</a></dd>
      <dt>Dock hours</dt><dd>{HOURS}<br>{after}</dd>
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
        LOC[k]['q'], addr(k), '' if k in KIOSK_DOCKS or not on('kiosk') else '<p>%s</p>' % N['office'], maps(k), N['directions']) for k in LOC)
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


def locations():
    cards = ''
    for k, L in LOC.items():
        lst = ''.join('<li>%s</li>' % t for t, d, u in SERVICES[k][:5])
        grow = '<p class="lgrow">%s</p>' % LINE[k]
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
    <p class="sub">30,000+ pallets a month through 105,000 square feet and 66 dock doors in Sparks, Nevada; North Highlands, California; and Middletown, Pennsylvania. Cross-dock, transload and long-term pallet storage at every one.</p>
    <div class="ctas"><a class="btn r" href="{TEL}">Call 24/7: {PHONE}</a><a class="btn o" href="/quote/">Get a quote</a></div>
  </div></div>
</section>
<section class="s"><div class="w"><div class="loccards rv">{cards}
</div></div></section>
<section class="s a">
  <div class="w split">
    <div class="l">
      <h2>One standard at every dock</h2>
      <p>Hand off in Harrisburg, split in Reno, finish in Sacramento. Same count, same photos and the same paperwork at every stop, and one client portal for all of it.</p>
    </div>
    <ul class="rows">
      <li><b>Same receiving</b><span>Seal checked, counted against the BOL, photographed at the door</span></li>
      <li><b>Same damage process</b><span>Photos and a cost to fix, and nothing is charged until you approve it</span></li>
      <li><b>Same portal</b><span>Book trucks{' any day and time' if on('booking') else ''}, see inventory and approve damage fixes for every location</span></li>
      {feat('promise', '<li><b>Same promise<!--badge--></b><span>%s, during dock hours</span></li>' % PROMISE)}
      {feat('kiosk', '<li><b>Same check-in<!--badge--></b><span>Drivers check in at our kiosk in 6 languages</span></li>')}
      <li><b>Same hours</b><span>{HOURS} at every dock; {AFTER}</span></li>
      <li><b>One number</b><span>{PHONE}, answered 24/7 by the people running the docks</span></li>
    </ul>
  </div>
</section>"""


SVCMAP = [('Cross-dock', 'Unload, split and reload the same day', 'all', '/reno/cross-dock/'),
          ('Long-term pallet storage', 'Floor and racked, a week or a year', 'all', '/reno/pallet-storage/'),
          ('Transload and container unloading', 'Floor-loaded and palletized', 'all', '/reno/transload/'),
          ('Restack and rework', 'Leaning, damaged or mixed pallets rebuilt', 'all', '/middletown/'),
          ('Shrink wrap and labeling', 'Ready for the next carrier or the receiver', 'all', ''),
          ('Fulfillment and FBA prep', 'Pick, pack and ship, Amazon and Walmart prep', 'reno', '/reno/fulfillment/'),
          ('Delivery, our own trucks', 'Local or long distance, signed proof of delivery', 'reno', '/reno/delivery/')]


def services():
    tick = '<td class="y">✓</td>'
    trs = ''.join('<tr><th scope="row">%s<span>%s</span></th>%s</tr>' % (
        '<a href="%s">%s</a>' % (u, t) if u else t, d,
        tick * 3 if w == 'all' else tick + '<td class="n">–</td>' * 2) for t, d, w, u in SVCMAP)
    return f"""<section class="hero sm">
  <div class="w grid"><div>
    <span class="crumb">Services</span>
    <h1>Cross-dock, storage and rework. <span>Three docks.</span></h1>
    <p class="sub">Dry freight of any kind, one pallet or a thousand. No minimums, no long contracts, billed weekly. Here's what each dock does.</p>
    <div class="ctas"><a class="btn r" href="{TEL}">Call 24/7: {PHONE}</a><a class="btn o" href="/quote/">Get a quote</a></div>
  </div></div>
</section>
<section class="s">
  <div class="w">
    <div class="tbl"><table class="svct">
      <thead><tr><th scope="col">Service</th><th scope="col"><a href="/reno/">Reno, NV</a></th><th scope="col"><a href="/sacramento/">Sacramento, CA</a></th><th scope="col"><a href="/middletown/">Harrisburg, PA</a></th></tr></thead>
      <tbody>{trs}</tbody>
    </table></div>
    <p class="fine" style="margin-top:14px">Docks open {HOURS}; {AFTER}. Phone answered 24/7.</p>
  </div>
</section>"""


THANKS = '''<section class="hero sm"><div class="w grid"><div>
  <span class="crumb">Thank you</span>
  <h1>Got it. <span>We'll be in touch.</span></h1>
  <p class="sub">Your request is in. We'll call you back within one hour, day or night. Need us right now? Call 916-616-3481.</p>
  <div class="ctas"><a class="btn r" href="/">Back to the home page</a><a class="btn o" href="tel:+19166163481">Call 916-616-3481</a></div>
</div></div></section>'''

NOTFOUND = '''<section class="hero sm"><div class="w grid"><div>
  <span class="crumb">Page not found</span>
  <h1>That page <span>moved.</span></h1>
  <p class="sub">Pick your location to keep going.</p>
  <div class="ctas"><a class="btn r" href="/reno/">Reno–Sparks, NV</a><a class="btn o" href="/sacramento/">Sacramento, CA</a><a class="btn o" href="/middletown/">Harrisburg, PA</a></div>
</div></div></section>'''


def hub():
    b = frag('hub.html')
    b = b.replace('<!--PORTAL-->', portal_teaser())
    d = os.path.join(ROOT, 'assets', 'logos')
    logos = sorted(f for f in os.listdir(d) if f.lower().endswith(('.png', '.svg', '.jpg', '.webp'))) if os.path.isdir(d) else []
    if logos:
        imgs = ''.join('<img src="/assets/logos/%s" alt="%s" loading="lazy">' % (f, os.path.splitext(f)[0].replace('-', ' ').title()) for f in logos)
        b = b.replace('<!--LOGOS-->', '<section class="logos"><div class="w"><p>Trusted by</p><div class="lg">%s</div></div></section>' % imgs)
    b = b.replace('<!--LOGOS-->', '')
    quotes = ''.join('<figure><blockquote>“%s”</blockquote><figcaption><b>%s</b>%s</figcaption></figure>' % (q, n, c) for q, n, c in TESTIMONIALS)
    links = ''.join('<a href="https://www.google.com/maps/search/?api=1&amp;query=%s" rel="noopener"><b>%s dock</b><span>Read our Google reviews →</span></a>' % (
        ('24 HR Crossdock ' + L['street'].split(',')[0] + ' ' + L['city'] + ' ' + L['region']).replace(' ', '+').replace(',', ''), L['label'].split(',')[0]) for L in LOC.values())
    b = b.replace('<!--REVIEWS-->', f"""<section class="s a reviews">
  <div class="w">
    <div class="intro rv"><h2>What customers say</h2><p>Real reviews from the brokers, carriers and shippers we move freight for.</p></div>
    {'<div class="quotes">%s</div>' % quotes if quotes else ''}
    <div class="revlinks">{links}</div>
  </div>
</section>""")
    return b


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


# Words that say texts or emails really go out. Not allowed while LIVE['alerts'] is not 'live',
# unless the same line or card carries the Coming soon badge.
CLAIMS = re.compile(r"\b(we(?:'ll| will)? (?:text|e-?mail) (?:you|it|the|your|drivers?)|we text|texts? (?:you|your|the) (?:driver|door)|"
                    r"texted|sent automatically|(?:sent|goes out|delivered) by (?:text|e-?mail)|alerts? (?:are|is|get) sent)|"
                    # the kiosk lines on /drivers/ in the other five languages ("we send a text / SMS / message")
                    r"\btexto\b|\bSMS\b|ਮੈਸੇਜ|मैसेज", re.I)


def check(out, sitemap):
    """Checks every built page. Returns a list of problems (the build fails if there are any)."""
    problems = []
    for url, html in out.items():
        for a in re.findall(r'<a\s[^>]*href="https://claude\.ai/[^"]*"[^>]*>', html):
            if 'target="_blank"' not in a or 'noopener' not in a:
                problems.append('%s: portal link without target=_blank rel=noopener: %s' % (url, a))
        if re.search(r'<!--(badge|feat |/feat|if-soon|if-off|TRUCKCARD|LANGS|ALERTS|PORTAL)', html):
            problems.append('%s: a template marker was left in the page' % url)
        if not on('alerts'):
            vis = re.sub(r'<script\b.*?</script>', '', html, flags=re.S)
            for blk in re.split(r'</(?:li|p|tr|dd|article|details|h[1-6]|figure|div)>', vis):
                m = CLAIMS.search(re.sub(r'<[^>]+>', ' ', blk))
                if m and SOON not in blk:
                    problems.append('%s: says texts or emails are sent, but alerts are not live: "%s"' % (url, m.group(0)))
            for ld in re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, flags=re.S):
                m = CLAIMS.search(ld)
                if m:
                    problems.append('%s: schema says texts or emails are sent, but alerts are not live: "%s"' % (url, m.group(0)))
    if '/drivers/</loc>' not in sitemap:
        problems.append('/drivers/ is missing from the sitemap')
    return problems


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
        ('/', '24 HR Crossdock | Cross-Dock, Transload & Pallet Storage in Reno, Sacramento and Harrisburg',
         '3 docks, 66 doors, 30,000+ pallets a month: Reno–Sparks NV, North Highlands CA and Middletown PA. Cross-dock, transload, rework and long-term pallet storage. Call 24/7: 916-616-3481.',
         hub(), 'main', [ORG], None),
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
        ('/reno/delivery/', 'Pallet Delivery from Reno–Sparks, Our Own Trucks | 24 HR Crossdock',
         'Pallet delivery on our own trucks from Sparks, NV: across Reno and Carson City, Northern California or long distance, with signed proof of delivery.',
         frag('delivery.html'), R, [biz(R, '/reno/')], [('/', 'Home'), ('/reno/', 'Reno–Sparks, NV'), ('/reno/delivery/', 'Delivery')]),
        ('/sacramento/', 'Cross-Dock in Sacramento – North Highlands, CA | 24 HR Crossdock',
         'Cross-dock and long-term pallet storage in North Highlands, CA for Sacramento and Northern California. Call 24/7: 916-616-3481.',
         location_page('sac'), 'sac', [biz('sac', '/sacramento/')], [('/', 'Home'), ('/sacramento/', 'Sacramento, CA')]),
        ('/middletown/', 'Cross-Dock, Restack & Rework in Harrisburg – Middletown, PA | 24 HR Crossdock',
         'Pallet restack and rework, cross-dock and long-term storage in Middletown, PA, near Harrisburg. 50 dock doors. Call 24/7: 916-616-3481.',
         location_page('pa'), 'pa', [biz('pa', '/middletown/')], [('/', 'Home'), ('/middletown/', 'Harrisburg, PA')]),
        ('/locations/', 'Locations: Reno NV, Sacramento CA, Harrisburg PA | 24 HR Crossdock',
         'Three docks, one standard: Sparks NV, North Highlands CA and Middletown PA.',
         locations(), 'main', [ORG], [('/', 'Home'), ('/locations/', 'Locations')]),
        ('/services/', 'Services: Cross-Dock, Pallet Storage, Transload & Rework | 24 HR Crossdock',
         'What each 24 HR Crossdock dock does: cross-dock, long-term pallet storage, transload, restack and rework, fulfillment and delivery.',
         services(), 'main', [ORG], [('/', 'Home'), ('/services/', 'Services')]),
        ('/client-portal/', 'Client Portal: Book Trucks, See Every Load | 24 HR Crossdock',
         'Book trucks%s, add every load, see your inventory and approve damage fixes with photos, for all three docks.' % (' any day and time' if on('booking') else '')
         + (' %s, during dock hours.' % PROMISE if on('promise') else ''),
         client_portal(), 'main', [ORG], [('/', 'Home'), ('/client-portal/', 'Client portal')]),
        ('/about/', 'About Us, Our Standards and Team | 24 HR Crossdock',
         'Moving freight since 2015. Our story and operating standards for receiving, storage, shipping and damage, at all three docks.',
         frag('_old_company.html'), 'main', [ORG], [('/', 'Home'), ('/about/', 'About')]),
        ('/get-started/', 'How to Get Started | 24 HR Crossdock',
         'Onboarding step by step: quote, account setup, first inbound and go-live.',
         frag('_old_get-started.html'), 'main', [ORG], [('/', 'Home'), ('/get-started/', 'Get started')]),
        ('/quote/', 'Get a Quote | 24 HR Crossdock',
         'Request a quote for cross-dock, storage, transload, rework, fulfillment or delivery. We call you back within one hour.',
         frag('_old_quote.html'), 'main', [ORG], [('/', 'Home'), ('/quote/', 'Get a quote')]),
        ('/drivers/', 'Driver Check-In: %s | 24 HR Crossdock' % ('Kiosk in 6 Languages' if on('kiosk') else 'Steps, Addresses and Hours'),
         'Truck check-in at 24 HR Crossdock in English, Español, Русский, Українська, ਪੰਜਾਬੀ and हिन्दी. %s, dock addresses and hours.' % ('Kiosk steps' if on('kiosk') else 'Check-in steps'),
         drivers(), 'main', [ORG], [('/', 'Home'), ('/drivers/', 'Drivers')]),
        ('/thanks/', 'Thank You | 24 HR Crossdock', 'Your request was received.', THANKS, 'main', [], None),
    ]
    out = {}
    for url, title, desc, body, section, schema, trail in pages:
        loc = section if section in LOC else None
        body = fix(body, loc)
        body = forms(body, url, LOC[loc]['q'] if loc else 'Not sure')
        faq = faq_ld(body)
        html = newtab(page(url, title.replace('&', '&amp;'), desc.replace('&', '&amp;'), body, section, list(schema) + ([faq] if faq else []), trail))
        d = os.path.join(OUT, url.strip('/'))
        os.makedirs(d, exist_ok=True)
        open(os.path.join(d, 'index.html'), 'w').write(html)
        out[url] = html
    out['/404.html'] = newtab(page('/404/', 'Page Not Found | 24 HR Crossdock', 'Page not found.', NOTFOUND))
    open(os.path.join(OUT, '404.html'), 'w').write(out['/404.html'])
    sm = ''.join('  <url><loc>%s%s</loc></url>\n' % (DOMAIN, p[0]) for p in pages if p[0] != '/thanks/')
    open(os.path.join(OUT, 'sitemap.xml'), 'w').write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n%s</urlset>\n' % sm)
    open(os.path.join(OUT, 'robots.txt'), 'w').write('User-agent: *\nAllow: /\nDisallow: /thanks/\nSitemap: %s/sitemap.xml\n' % DOMAIN)
    js = os.path.join(OUT, 'assets', 'site.js')
    src = open(js).read()
    open(js, 'w').write(src.replace('{EMAIL}', EMAIL))
    leftover = [u for u, *_ in pages if '#/' in out[u]]
    print('built', len(pages), 'pages', 'LEFTOVER HASH LINKS:' if leftover else '', leftover or '')
    problems = check(out, sm)
    for p in problems:
        print('PROBLEM:', p)
    print('switches:', ', '.join('%s=%s' % kv for kv in LIVE.items()))
    if leftover or problems:
        raise SystemExit(1)


if __name__ == '__main__':
    build()
