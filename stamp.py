#!/usr/bin/env python3
"""Cache-busting for dist/: every local css/js/asset link in the HTML and CSS gets ?v=<hash of that file>.

A file whose contents change gets a new address, so browsers fetch it fresh; unchanged files keep
their address and stay cached. Run by make-dist.sh on the copied dist/ folder (sources are untouched).
"""
import hashlib, os, re, sys

DIST = sys.argv[1] if len(sys.argv) > 1 else 'dist'
REF = re.compile(r'(?<![\w/.-])((?:\.\./|/)*)((?:css|js|assets)/[\w./-]+?\.(?:css|js|webp|png|jpe?g|svg|gif|ico|mp4|webm|pdf|woff2?|json))(?:\?v=[\w.]+)?')
hashes = {}

def stamp(path):
    if path not in hashes:
        with open(path, 'rb') as f:
            hashes[path] = hashlib.sha256(f.read()).hexdigest()[:10]
    return hashes[path]

changed = 0
for root, _, files in os.walk(DIST):
    for name in files:
        if not name.endswith(('.html', '.css')):
            continue
        fp = os.path.join(root, name)
        text = open(fp, encoding='utf-8').read()

        def fix(m):
            lead, rel = m.group(1), m.group(2)
            # "/x" is from the site root; "x" and "../x" are from this file's folder
            target = os.path.normpath(os.path.join(DIST, rel) if lead.startswith('/') else os.path.join(root, lead, rel))
            return f'{lead}{rel}?v={stamp(target)}' if os.path.isfile(target) else m.group(0)

        new = REF.sub(fix, text)
        if new != text:
            open(fp, 'w', encoding='utf-8').write(new)
            changed += 1
print(f'stamped {len(hashes)} files across {changed} pages/stylesheets')
