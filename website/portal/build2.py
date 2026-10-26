#!/usr/bin/env python3
"""build2.py: rebuild the 24 HR Crossdock portal from the frozen base + readable sources + patch lists.

Usage (from anywhere):
  python3 website/portal/build2.py                       # all streams -> website/portal/dist/
  python3 website/portal/build2.py --streams A,C         # only stream A and C files; B, D, E, F use the base copies / are skipped
  python3 website/portal/build2.py --streams ""          # base only (must behave exactly like today's portal)
  python3 website/portal/build2.py --streams A --out /tmp/mydist

Streams:  A engine-source.js + sync-source.js + patches/A_*.py
          B customer-portal-source.js + patches/B_*.py
          C kiosk-source.js + patches/C_*.py
          D crew-source.js + patches/D_*.py
          E office-source.js + patches/E_*.py
          F patches/F_*.py

What it does (plan section 1.2):
  1. reads base/portal.base.html as text;
  2. swaps the source span (customer-portal-source.base.js + crew-source.base.js, which sits in the base once)
     for engine, customer portal, crew, kiosk and office sources, in that order;
  3. sync-source.js goes in through patch A01 (its `new` text holds the marker @@SYNC_SOURCE@@);
  4. loads every patch list; each `old` must occur exactly once in the base, spans may not overlap each other or
     the source span, ids must be unique;
  5. applies every span from the end of the file backwards (nothing is searched again after a replacement);
  6. checks top-level names: chain files and the sync source may only define ZZ... names, no name twice,
     no name the base already defines (customer-portal / crew may redefine the names of their own base file);
  7. writes DIST/portal.html, extracts the main script to DIST/app.js and runs `node --check` on it;
  8. prints every patch id and the output size; appends <!-- build2 <sha> streams=... --> after </html>.
Any failed check prints FAIL and exits with status 1. Nothing outside the --out folder is written.
"""
import argparse
import glob
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
BASE_HTML = os.path.join(HERE, 'base', 'portal.base.html')
BASE_CP = os.path.join(HERE, 'base', 'customer-portal-source.base.js')
BASE_CREW = os.path.join(HERE, 'base', 'crew-source.base.js')
NEXT_AFTER_SPAN = 'KQ=({doc:e,now:t,actions:a,onExit:r,openShipment:n'
SCRIPT_START = '<script>\n(()=>{'
SYNC_MARKER = '@@SYNC_SOURCE@@'
STREAMS = 'ABCDEF'
# chain files in splice order: (stream, file, base copy used when the stream is not built)
CHAIN = [
    ('A', 'engine-source.js', None),
    ('B', 'customer-portal-source.js', BASE_CP),
    ('D', 'crew-source.js', BASE_CREW),
    ('C', 'kiosk-source.js', None),
    ('E', 'office-source.js', None),
]
SYNC_FILE = ('A', 'sync-source.js')


class BuildError(Exception):
    pass


def fail(msg):
    raise BuildError(msg)


def read(path):
    with open(path, 'r', encoding='utf-8', newline='') as f:
        return f.read()


# ---------------------------------------------------------------------------------------------
# A small JavaScript scanner: masks strings, template text, comments and regex bodies with spaces
# (same length as the input) and records the bracket depth at every position. Enough to find
# top-level `Name=` entries in a chain file and `var Name` statements in the sync source.
# ---------------------------------------------------------------------------------------------
_KW_BEFORE_REGEX = {'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw',
                    'case', 'do', 'else', 'yield', 'await'}
_PUNCT_BEFORE_REGEX = set('(,=:[!&|?{};+-*%<>~^')


def js_mask(src):
    n = len(src)
    out = list(src)
    depth = [0] * n
    d = 0
    i = 0
    stack = []  # 'tpl' or ('expr', depth_at_open)
    last_sig = ''  # last significant code char
    last_word = ''

    def blank(a, b):
        for k in range(a, b):
            if out[k] != '\n':
                out[k] = ' '

    def in_template():
        return stack and stack[-1] == 'tpl'

    while i < n:
        depth[i] = d
        c = src[i]
        if in_template():
            if c == '\\':
                blank(i, min(n, i + 2))
                for k in range(i, min(n, i + 2)):
                    depth[k] = d
                i += 2
                continue
            if c == '`':
                stack.pop()
                last_sig = '`'
                last_word = ''
                i += 1
                continue
            if c == '$' and i + 1 < n and src[i + 1] == '{':
                stack.append(('expr', d))
                d += 1
                depth[i + 1] = d
                i += 2
                last_sig = '{'
                last_word = ''
                continue
            blank(i, i + 1)
            i += 1
            continue
        # code mode
        if c in ' \t\r\n':
            i += 1
            continue
        if c == '/' and i + 1 < n and src[i + 1] == '/':
            j = src.find('\n', i)
            j = n if j < 0 else j
            blank(i, j)
            for k in range(i, j):
                depth[k] = d
            i = j
            continue
        if c == '/' and i + 1 < n and src[i + 1] == '*':
            j = src.find('*/', i + 2)
            if j < 0:
                fail('unterminated /* comment */')
            j += 2
            blank(i, j)
            for k in range(i, j):
                depth[k] = d
            i = j
            continue
        if c in '\'"':
            j = i + 1
            while j < n and src[j] != c:
                if src[j] == '\\':
                    j += 1
                elif src[j] == '\n':
                    fail('unterminated string near: ' + src[i:i + 40])
                j += 1
            if j >= n:
                fail('unterminated string near: ' + src[i:i + 40])
            blank(i + 1, j)
            for k in range(i, j + 1):
                depth[k] = d
            i = j + 1
            last_sig = c
            last_word = ''
            continue
        if c == '`':
            stack.append('tpl')
            i += 1
            continue
        if c == '/':
            is_regex = (last_sig == '' or last_sig in _PUNCT_BEFORE_REGEX or
                        (last_word in _KW_BEFORE_REGEX and (last_sig.isalnum() or last_sig in '_$')))
            if is_regex:
                j = i + 1
                in_class = False
                while j < n:
                    ch = src[j]
                    if ch == '\\':
                        j += 2
                        continue
                    if ch == '\n':
                        fail('unterminated regex near: ' + src[i:i + 40])
                    if in_class:
                        if ch == ']':
                            in_class = False
                    elif ch == '[':
                        in_class = True
                    elif ch == '/':
                        break
                    j += 1
                if j >= n:
                    fail('unterminated regex near: ' + src[i:i + 40])
                j += 1
                while j < n and (src[j].isalnum() or src[j] == '_'):
                    j += 1
                blank(i + 1, j)
                for k in range(i, j):
                    depth[k] = d
                i = j
                last_sig = ')'  # a regex is a value
                last_word = ''
                continue
        if c in '([{':
            d += 1
        elif c in ')]}':
            if c == '}' and stack and isinstance(stack[-1], tuple) and stack[-1][1] == d - 1:
                stack.pop()
                d -= 1
                depth[i] = d
                i += 1
                continue  # back in the template
            d -= 1
            if d < 0:
                fail('unbalanced ' + c + ' near: ' + src[max(0, i - 40):i + 1])
            depth[i] = d
        if c.isalnum() or c in '_$':
            j = i
            while j < n and (src[j].isalnum() or src[j] in '_$'):
                depth[j] = d
                j += 1
            last_word = src[i:j]
            last_sig = src[j - 1]
            i = j
            continue
        last_sig = c
        last_word = ''
        i += 1
    if stack:
        fail('unterminated template literal')
    if d != 0:
        fail('brackets do not balance (depth %d at the end)' % d)
    return ''.join(out), depth


_NAME = r'[A-Za-z_$][\w$]*'


def chain_names(src, label):
    """Top-level names of a chain file (Name=value, Name=value, ...)."""
    masked, depth = js_mask(src)
    body = masked.strip()
    if not body:
        return []
    if not body.endswith(','):
        fail('%s: a chain file must end with "," (it ends with %r)' % (label, body[-20:]))
    if not re.match(_NAME + r'\s*=', body):
        fail('%s: a chain file must start with a Name= entry (it starts with %r)' % (label, body[:30]))
    names = []
    for mt in re.finditer(r'(?:^|,)(\s*)(' + _NAME + r')\s*=(?![=>])', masked):
        p = mt.start(2)
        if depth[p] == 0:
            names.append(mt.group(2))
    for mt in re.finditer(r'(?<![\w$.])(const|let|function|class)\s', masked):
        if depth[mt.start()] == 0:
            fail('%s: "%s" at the top level; chain files are Name=value, entries only' % (label, mt.group(1)))
    for mt in re.finditer(r';', masked):
        if depth[mt.start()] == 0:
            line = src.count('\n', 0, mt.start()) + 1
            fail('%s: ";" at the top level (line %d); chain files are Name=value, entries only' % (label, line))
    return names


def stmt_names(src, label):
    """Top-level declared names of a statement file (var/let/const/function/class)."""
    masked, depth = js_mask(src)
    names = []
    for mt in re.finditer(r'(?<![\w$.])(function|class)\s+(' + _NAME + ')', masked):
        if depth[mt.start()] == 0:
            names.append(mt.group(2))
    for mt in re.finditer(r'(?<![\w$.])(var|let|const)\s+(' + _NAME + ')', masked):
        if depth[mt.start()] != 0:
            continue
        names.append(mt.group(2))
        j = mt.end()
        while j < len(masked):
            ch = masked[j]
            if depth[j] == 0 and ch == ';':
                break
            if depth[j] == 0 and ch == ',':
                m2 = re.match(r',\s*(' + _NAME + r')\s*=?', masked[j:])
                if m2:
                    names.append(m2.group(1))
            if depth[j] == 0 and re.match(r'\n\s*(var|let|const|function|class|window|if|try)\b', masked[j:]):
                break
            j += 1
    return names


def outside_zz_names(text):
    """ZZ names assigned anywhere in a piece of the base bundle (outside the source span)."""
    return set(re.findall(r'(?<![\w$.])(ZZ[\w$]*)\s*=(?![=>])', text))


# ---------------------------------------------------------------------------------------------
def git_sha():
    try:
        return subprocess.check_output(['git', 'rev-parse', '--short', 'HEAD'], cwd=HERE,
                                       stderr=subprocess.DEVNULL).decode().strip() or 'nogit'
    except Exception:
        return 'nogit'


def load_patch_file(path, stream):
    ns = {'__file__': path, '__name__': 'patch_' + os.path.basename(path)[:-3]}
    try:
        code = compile(read(path), path, 'exec')
        exec(code, ns)
    except Exception as e:
        fail('%s: could not load (%s: %s)' % (os.path.relpath(path, HERE), type(e).__name__, e))
    pl = ns.get('PATCHES')
    if not isinstance(pl, (list, tuple)):
        fail('%s: needs PATCHES = [(id, old, new, why), ...]' % os.path.relpath(path, HERE))
    out = []
    for k, p in enumerate(pl):
        if not isinstance(p, (list, tuple)) or len(p) != 4:
            fail('%s: entry %d must be (id, old, new, why)' % (os.path.relpath(path, HERE), k))
        pid, old, new, why = p
        if not all(isinstance(x, str) for x in (pid, old, new, why)):
            fail('%s: entry %d: id, old, new and why must all be strings' % (os.path.relpath(path, HERE), k))
        if not re.match(r'^[A-F]\d{2,3}[a-z]?$', pid):
            fail('%s: bad patch id %r (use the stream letter and a number, e.g. %s07)' % (os.path.relpath(path, HERE), pid, stream))
        if pid[0] != stream:
            fail('%s: patch id %s does not belong to stream %s' % (os.path.relpath(path, HERE), pid, stream))
        if not old:
            fail('%s: patch %s has an empty old text' % (os.path.relpath(path, HERE), pid))
        if not why.strip():
            fail('%s: patch %s needs a reason (why)' % (os.path.relpath(path, HERE), pid))
        out.append({'id': pid, 'old': old, 'new': new, 'why': why, 'file': os.path.relpath(path, HERE), 'stream': stream})
    return out


def build(streams, out_dir, quiet=False):
    log = (lambda *a: None) if quiet else (lambda *a: print(*a))
    for s in streams:
        if s not in STREAMS:
            fail('unknown stream %r (streams are %s)' % (s, ','.join(STREAMS)))
    base = read(BASE_HTML)
    base_cp = read(BASE_CP).strip()
    base_crew = read(BASE_CREW).strip()
    span_text = base_cp + base_crew
    if base.count(span_text) != 1:
        fail('base: the source span (customer-portal-source.base.js + crew-source.base.js) occurs %d times, expected 1'
             % base.count(span_text))
    s0 = base.index(span_text)
    s1 = s0 + len(span_text)
    if not base.startswith(NEXT_AFTER_SPAN, s1):
        fail('base: the source span must end right before ' + NEXT_AFTER_SPAN)
    if base.count(SCRIPT_START) != 1:
        fail('base: main script start occurs %d times' % base.count(SCRIPT_START))

    # ---- sources
    if 'A' not in streams and streams:
        log('warning: building without stream A: engine helpers (ZZS, ZZacts, ...) are missing, '
            'so code from other streams that calls them will fail when it runs.')
    chain_parts = []  # (label, text, may_redefine_base_span_names)
    used_files = []
    for stream, fname, base_copy in CHAIN:
        path = os.path.join(HERE, fname)
        if stream in streams and os.path.exists(path):
            txt = read(path).strip()
            chain_parts.append((fname, txt, base_copy is not None))
            used_files.append(fname)
        elif base_copy is not None:
            chain_parts.append((os.path.relpath(base_copy, HERE), read(base_copy).strip(), True))
            used_files.append(os.path.relpath(base_copy, HERE) + ' (base copy)')
        elif stream in streams:
            log('note: %s not found (stream %s not started yet) - skipped' % (fname, stream))
    sync_text = None
    sync_path = os.path.join(HERE, SYNC_FILE[1])
    if SYNC_FILE[0] in streams:
        if os.path.exists(sync_path):
            sync_text = read(sync_path).strip()
            used_files.append(SYNC_FILE[1])
        else:
            log('note: sync-source.js not found - skipped')

    for label, txt, _ in chain_parts:
        if re.search(r'</script', txt, re.I):
            fail('%s contains "</script" which would end the page script early' % label)
        if '<!--' in txt:
            log('warning: %s contains "<!--"; avoid it inside a script' % label)
    if sync_text is not None and re.search(r'</script', sync_text, re.I):
        fail('sync-source.js contains "</script"')

    # ---- patches
    patches = []
    files = sorted(glob.glob(os.path.join(HERE, 'patches', '*.py')))
    for path in files:
        bn = os.path.basename(path)
        if bn.startswith('_') or bn.startswith('.'):
            continue
        mt = re.match(r'^([A-F])_[\w-]+\.py$', bn)
        if not mt:
            fail('patches/%s: patch files are named <stream letter>_<name>.py, e.g. B_client.py' % bn)
        if mt.group(1) not in streams:
            continue
        patches.extend(load_patch_file(path, mt.group(1)))
    seen = {}
    for p in patches:
        if p['id'] in seen:
            fail('duplicate patch id %s (%s and %s)' % (p['id'], seen[p['id']], p['file']))
        seen[p['id']] = p['file']
        cnt = base.count(p['old'])
        if cnt != 1:
            fail('%s %s: anchor occurs %d times in the base, expected exactly 1: %r'
                 % (p['file'], p['id'], cnt, p['old'][:90]))
        a = base.index(p['old'])
        p['span'] = (a, a + len(p['old']))
        if a < s1 and s0 < a + len(p['old']):
            fail('%s %s: anchor falls inside the source span (customer-portal / crew source). '
                 'Edit the source file instead.' % (p['file'], p['id']))
        if re.search(r'</script', p['new'], re.I):
            fail('%s %s: new text contains "</script"' % (p['file'], p['id']))
        if SYNC_MARKER in p['new']:
            if p['id'] != 'A01':
                fail('%s %s: only A01 may carry %s' % (p['file'], p['id'], SYNC_MARKER))
            if sync_text is None:
                fail('A01 needs sync-source.js, which is missing')
            p['new'] = p['new'].replace(SYNC_MARKER, sync_text)
    ordered = sorted(patches, key=lambda p: p['span'])
    for x, y in zip(ordered, ordered[1:]):
        if y['span'][0] < x['span'][1]:
            fail('patches overlap: %s (%s) and %s (%s) touch the same text' % (x['id'], x['file'], y['id'], y['file']))
    if sync_text is not None and not any(SYNC_MARKER in read(p_) for p_ in files if os.path.basename(p_).startswith('A_')):
        fail('sync-source.js exists but no A patch inserts it (A01 with %s)' % SYNC_MARKER)

    # ---- names
    outside = outside_zz_names(base[:s0]) | outside_zz_names(base[s1:])
    base_span_names = set(chain_names(base_cp, 'base customer-portal-source')) | set(chain_names(base_crew, 'base crew-source'))
    owner = {}
    all_named = []
    for label, txt, own_base in chain_parts:
        for nm in chain_names(txt, label):
            all_named.append((nm, label, own_base))
    if sync_text is not None:
        for nm in stmt_names(sync_text, 'sync-source.js'):
            all_named.append((nm, 'sync-source.js', False))
    for nm, label, own_base in all_named:
        if not nm.startswith('ZZ'):
            fail('%s: top-level name %r must start with ZZ (it would clash with the minified bundle)' % (label, nm))
        if nm in outside:
            fail('%s: %s is already defined by the base bundle (outside the source span)' % (label, nm))
        if nm in base_span_names and not own_base:
            fail('%s: %s is already defined by the base customer-portal / crew source' % (label, nm))
        if nm in owner:
            fail('duplicate top-level name %s (defined in %s and %s)' % (nm, owner[nm], label))
        owner[nm] = label

    # ---- assemble: every replacement is a span of the base, applied from the end backwards
    reps = [(s0, s1, ''.join(t for _, t, _ in chain_parts), 'SRC')] + [(p['span'][0], p['span'][1], p['new'], p['id']) for p in patches]
    reps.sort(key=lambda r: r[0], reverse=True)
    outp = base
    for a, b, new, _ in reps:
        outp = outp[:a] + new + outp[b:]
    if outp.count('</html>') < 1:
        fail('output has no </html>')
    k = outp.rindex('</html>') + len('</html>')
    tag = '<!-- build2 %s streams=%s -->' % (git_sha(), ''.join(streams) or 'base')
    outp = outp[:k] + tag + outp[k:]

    # ---- write + syntax check
    os.makedirs(out_dir, exist_ok=True)
    html_path = os.path.join(out_dir, 'portal.html')
    js_path = os.path.join(out_dir, 'app.js')
    a = outp.index(SCRIPT_START)
    b = outp.index('</script>', a)
    with open(html_path, 'w', encoding='utf-8', newline='') as f:
        f.write(outp)
    with open(js_path, 'w', encoding='utf-8', newline='') as f:
        f.write(outp[a + len('<script>'):b])
    r = subprocess.run(['node', '--check', js_path], capture_output=True, text=True)
    if r.returncode != 0:
        fail('node --check %s failed:\n%s' % (js_path, (r.stderr or r.stdout)[-3000:]))

    same_as_base = outp[:k] + outp[k + len(tag):] == base
    log('build2: streams %s' % (','.join(streams) or '(base only)'))
    log('  sources: ' + ', '.join(used_files))
    for p in sorted(patches, key=lambda p: (p['stream'], p['id'])):
        log('  applied %-5s %s' % (p['id'], p['why'][:100]))
    log('  %d patches, %d top-level ZZ names from the injected sources' % (len(patches), len(all_named)))
    log('  node --check app.js: ok')
    if same_as_base:
        log('  output is byte-identical to base/portal.base.html (apart from the build2 comment)')
    log('  wrote %s (%s bytes) and %s' % (html_path, format(len(outp.encode('utf-8')), ','), js_path))
    return {'html': html_path, 'js': js_path, 'patches': [p['id'] for p in patches], 'same_as_base': same_as_base}


def main(argv=None):
    ap = argparse.ArgumentParser(description='Build the portal from base + sources + patches.')
    ap.add_argument('--streams', default=None,
                    help='comma-separated stream letters (default all: A,B,C,D,E,F); "" = base only')
    ap.add_argument('--out', default=os.path.join(HERE, 'dist'), help='output folder (default website/portal/dist)')
    ap.add_argument('--quiet', action='store_true')
    a = ap.parse_args(argv)
    if a.streams is None:
        streams = list(STREAMS)
    else:
        streams = [s.strip().upper() for s in a.streams.replace(' ', ',').split(',') if s.strip()]
        streams = sorted(set(streams), key=STREAMS.index if all(s in STREAMS for s in streams) else None)
    try:
        build(streams, os.path.abspath(a.out), a.quiet)
    except BuildError as e:
        print('build2 FAIL: ' + str(e), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
