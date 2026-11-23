#!/usr/bin/env python3
"""Builds the inner pages of the site.

Each page's content lives in pages/<slug>.html (with a small header block of
title / description / group). This script wraps it in pages/_layout.html with
the shared header (menu) and footer, and writes <slug>.html next to index.html.
It also refreshes the header and footer inside index.html, between the
<!-- site-header --> and <!-- site-footer --> markers, so every page matches.

Run it after editing anything in pages/:   python3 build-pages.py
(--no-index builds the inner pages only and leaves index.html untouched)
"""
import html, json, os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
V = '55'   # cache-busting version for css/js

# the site menu: (label, [(title, href, hint), ...]) or (label, href)
NAV = [
    ('Company', 'company', [
        ('About Us', 'about.html', 'Since 1992, in Ankleshwar'),
        ('Clients', 'clients.html', 'Who we build for'),
        ('Notable Projects', 'projects.html', 'Notes from the works'),
        ('Careers', 'careers.html', 'Be a part of our story'),
    ]),
    ('Products', 'products', [
        ('All Products', 'products.html', 'Tanks, scrubbers, vessels and more'),
        ('Sewage Treatment', 'water-treatment.html', 'Chemical-free electro-coagulation'),
        ('Materials', 'materials.html', 'PP, HDPE, PVDF, FRP and more'),
    ]),
    ('Fabrication', 'fabrication', 'fabrication.html'),
    ('Contact', 'contact', [
        ('Contact Us', 'contact.html', 'Works, phone and hours'),
        ('Get a Quote', 'quote.html', 'Tell us about your project'),
        ('Downloads', 'downloads.html', 'Brochures and plant credentials'),
    ]),
]

CHEVRON = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'


def header(current='', home=False):
    logo_href = '#top' if home else 'index.html'
    items, mitems = [], []
    for label, key, sub in NAV:
        cur = ' is-current' if key == current else ''
        if isinstance(sub, str):
            ac = ' aria-current="page"' if key == current else ''
            items.append(f'<li class="nav__item{cur}"><a class="nav__top" href="{sub}"{ac}>{label}</a></li>')
            mitems.append(f'<a class="mnav__solo" href="{sub}">{label}</a>')
            continue
        here = ' aria-current="page"'
        links = ''.join(
            f'<a href="{h}"{here if h == current_href else ""}><b>{html.escape(t)}</b><span>{html.escape(hint)}</span></a>'
            for t, h, hint in sub)
        items.append(
            f'<li class="nav__item has-menu{cur}"><button class="nav__top" type="button" aria-expanded="false" aria-controls="menu-{key}">{label}{CHEVRON}</button>'
            f'<div class="nav__panel" id="menu-{key}">{links}</div></li>')
        mlinks = ''.join(f'<a href="{h}">{html.escape(t)}</a>' for t, h, _ in sub)
        mitems.append(f'<details class="mnav__group"{" open" if key == current else ""}><summary>{label}{CHEVRON}</summary><div>{mlinks}</div></details>')
    cta = '#contact' if home else 'quote.html'
    return f'''<!-- site-header -->
<header class="site-header">
  <div class="wrap">
    <a class="logo" href="{logo_href}" aria-label="Plasto-Fab, home"><img src="assets/brand/logo-300.webp" alt="Plasto-Fab" width="137" height="32"></a>
    <nav class="nav" aria-label="Main"><ul class="nav__list">{''.join(items)}</ul></nav>
    <a class="btn btn--primary nav__cta" href="{cta}">Get a quote</a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="mnav" aria-label="Open menu"><span></span><span></span></button>
  </div>
  <div class="mnav" id="mnav" hidden>
    <nav class="mnav__inner" aria-label="Menu">{''.join(mitems)}<a class="btn btn--primary" href="{cta}">Get a quote</a></nav>
  </div>
</header>
<!-- /site-header -->'''


def footer(home=False):
    groups = {key: sub for _, key, sub in NAV}
    col = lambda title, links: (f'<nav aria-label="{title}"><h4>{title}</h4>'
                                + ''.join(f'<a href="{h}">{html.escape(t)}</a>' for t, h, *_ in links) + '</nav>')
    cols = [col('Company', groups['company'] + [('Fabrication', 'fabrication.html')]),
            col('Products', groups['products']),
            col('Work with us', groups['contact'])]
    return f'''<!-- site-footer -->
<footer class="site-footer">
  <div class="wrap">
    <div class="footer__top">
      <img class="footer__logo" src="assets/brand/logo-800.webp" srcset="assets/brand/logo-800.webp 800w, assets/brand/logo-1600.webp 1600w" sizes="min(420px, 76vw)" alt="Plasto-Fab" width="1600" height="374" loading="lazy">
      <p class="footer__tag">Creating shapes that matter · since 1992</p>
    </div>
    <div class="footer__cols footer__cols--site">
      {''.join(cols)}
      <div>
        <h4>Get in touch</h4>
        <a href="tel:+919824110409">+91 98241 10409</a>
        <a href="mailto:info@plasto-fab.com">info@plasto-fab.com</a>
        <span>Plot No. 7510, Near Karmatur Char Rasta, GIDC, Ankleshwar 393 002, Gujarat, India</span>
      </div>
    </div>
    <div class="footer__base">
      <span>© <span data-year>2026</span> Plasto-Fab</span>
      <span>Mon–Sat, 8 am – 6 pm</span>
      <a href="#top">Back to top ↑</a>
    </div>
  </div>
</footer>
<!-- /site-footer -->'''


current_href = ''


def parse(src):
    m = re.match(r'\s*<!--(.*?)-->', src, re.S)
    meta = {}
    if m:
        for line in m.group(1).strip().splitlines():
            if ':' in line:
                k, v = line.split(':', 1)
                meta[k.strip()] = v.strip()
        src = src[m.end():]
    return meta, src.strip()


def blocks():
    """Generated chunks a page can pull in with {{name}}."""
    import pagedata
    return pagedata.blocks(ROOT)


def build():
    global current_href
    layout = open(os.path.join(ROOT, 'pages', '_layout.html')).read()
    gen = blocks()
    built = []
    for name in sorted(os.listdir(os.path.join(ROOT, 'pages'))):
        if name.startswith('_') or not name.endswith('.html'):
            continue
        slug = name[:-5]
        meta, content = parse(open(os.path.join(ROOT, 'pages', name)).read())
        current_href = slug + '.html'
        for key, val in gen.items():
            content = content.replace('{{' + key + '}}', val)
        css = f'<link rel="stylesheet" href="css/pages/{slug}.css?v={V}">' if os.path.exists(os.path.join(ROOT, 'css', 'pages', slug + '.css')) else ''
        js = f'<script src="js/pages/{slug}.js?v={V}"></script>' if os.path.exists(os.path.join(ROOT, 'js', 'pages', slug + '.js')) else ''
        body_attrs = ' data-hero="dark"' if meta.get('header') == 'dark' else ''
        # base: / keeps a page's links working at any URL (the 404 page is served wherever a link is broken)
        base = f'\n<base href="{meta["base"]}">\n<meta name="robots" content="noindex">' if meta.get('base') else ''
        out = (layout.replace('<meta charset="utf-8">', '<meta charset="utf-8">' + base)
               .replace('{{title}}', html.escape(meta.get('title', slug)))
               .replace('{{description}}', html.escape(meta.get('description', '')))
               .replace('{{slug}}', slug).replace('{{body_attrs}}', body_attrs)
               .replace('{{css}}', css).replace('{{js}}', js)
               .replace('{{header}}', header(meta.get('group', '')))
               .replace('{{footer}}', footer())
               .replace('{{content}}', content).replace('{{v}}', V))
        left = re.findall(r'\{\{[a-z_:]+\}\}', out)
        if left:
            raise SystemExit(f'{name}: unfilled {left}')
        open(os.path.join(ROOT, slug + '.html'), 'w').write(out)
        built.append(slug)

    # the homepage keeps its own content; only its header and footer are refreshed
    if '--no-index' in sys.argv:
        print('built', len(built), 'pages:', ', '.join(built), '(index.html left alone)')
        return
    current_href = 'index.html'
    p = os.path.join(ROOT, 'index.html')
    s = open(p).read()
    s = re.sub(r'<!-- site-header -->.*?<!-- /site-header -->', lambda m: header(home=True), s, flags=re.S)
    s = re.sub(r'<!-- site-footer -->.*?<!-- /site-footer -->', lambda m: footer(home=True), s, flags=re.S)
    open(p, 'w').write(s)
    print('built', len(built), 'pages:', ', '.join(built))


if __name__ == '__main__':
    import sys
    sys.path.insert(0, os.path.join(ROOT, 'pages'))
    build()
