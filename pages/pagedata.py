"""Generated chunks for the inner pages: the product catalogue, client wall,
STP plant credentials and downloads. Photos live in assets/pages/ with their
sizes in assets/pages/manifest.json (made by ref/process.py)."""
import html, json, os

esc = html.escape

CLIENTS = ['Thermax', 'Jubilant Life Sciences', 'Asian Paints', 'Glenmark', 'Anupam Rasayan India', 'Merino', 'Hikal',
           'Bayer', 'Sanofi', 'Lupin', 'Apothecon Pharmaceuticals', 'Tatva Chintan', 'Aarti Industries', 'Alembic Pharmaceuticals',
           'Lewens Labs', 'PI Industries', 'Aditya Birla Group', 'Zydus Cadila', 'Gujarat Gas', 'Wockhardt', 'Filatex', 'Isagro',
           'Kancor', 'Mahavir Synthesis', 'Modiguard', 'Kohler', 'Cadila Pharmaceuticals', 'GSK']

# the catalogue: (anchor, name, tone, kicker, text, facts, items, photo folders or single photos)
CATALOGUE = [
    ('storage', 'Storage Tanks', '#d8a400', 'Tanks for liquids and gases',
     ['Storage tanks and process vessels serve many industrial uses, so each has to meet different requirements. We make a wide range for storing liquids and gases, entirely in FRP or in thermoplastic, as the client needs.',
      'Pickling tanks process metal surface treatment: the metal is immersed in pickling acid to take the scale and rust off.'],
     [('Made to measure', 'for liquids and gases'), ('Double wall', 'with leakage monitoring'), ('FRP or thermoplastic', 'to suit the chemical')],
     ['Pickling tanks', 'PP / HDPE tanks', 'PP / FRP tanks', 'PP & HDPE spiral tanks'], ['wix/storage-tanks']),
    ('scrubbers', 'Scrubbing Systems', '#2f6db5', 'Pollution control',
     ['Scrubbers and columns are pollution-control equipment: they remove particles and gases from industrial exhaust streams.',
      'We supply them as turnkey units, with the fans, mist eliminators and ducting they need.'],
     [('Turnkey', 'complete units'), ('Gases & particles', 'removed from exhaust'), ('Any MOC', 'matched to the fumes')],
     ['Wet scrubbers', 'Columns', 'Mist eliminators'], ['wix/scrubbing-system']),
    ('vessels', 'Reaction Vessels', '#1f9e78', 'Process vessels',
     ['Reaction vessels process chemical reactions, so each is designed for the dynamic and hydrostatic loads of its own process.'],
     [('Special designs', 'for each process'), ('Corrosive media', 'process tanks for the harshest'), ('Chemical treatment', 'processes')],
     ['Reaction vessels', 'Process tanks'], ['wix/reaction-vessels']),
    ('vacuum', 'Vacuum Receivers & Pressure Tanks', '#e2a400', 'Vacuum and pressure',
     ['Vacuum traps made in the material that suits each chemical, designed to sustain full vacuum.',
      'Receivers and tanks of robust construction in different polymers, able to withstand both pressure and full vacuum.'],
     [('Pressure-rated', 'robust construction'), ('Full vacuum', 'sustained'), ('Different MOC', 'for chemical compatibility')],
     ['Vacuum receivers', 'Vacuum traps', 'Pressure tanks'], ['wix/vacuum-receiver']),
    ('blowers', 'Centrifugal Blowers', '#e0b000', 'Three decades of blowers',
     ['Plasto-Fab has three decades of experience making custom centrifugal blowers, built to handle corrosive fumes and moist gases.'],
     [('30 years', 'of custom blowers'), ('Corrosive fumes', 'and moist gases')],
     ['Centrifugal blowers', 'Impellers'], ['wix/centrifugal-blower']),
    ('ducting', 'Ducting', '#d23b2f', 'Pipes, ducts and bends',
     ['We make pipes and ducting in non-metallic materials to each client\'s requirement, and we take on piping work at site.',
      'Ducts and piping are assembled in our shop to cut installation time in the field.'],
     [('Non-metallic', 'pipes and ducts to order'), ('In-house assembly', 'less time on site'), ('Site piping', 'we install too')],
     ['Ducting', 'Piping', 'Bends'], ['wix/ducting']),
    ('turnkey', 'Turnkey Solutions', '#6b5bd6', 'Designed, built, erected, commissioned',
     ['We design, engineer, build, erect and commission complete systems, not only single pieces of equipment: one supplier from the first drawing to the plant running on site.',
      'A scrubber system arrives with its blower, pumps and ducting; a sewage treatment plant arrives skid-mounted. We take on piping work at site, FRP lining of existing equipment as part of the job, and return for field service, repair and installation.'],
     [('One supplier', 'design to commissioning'), ('Site work', 'erection and piping'), ('Field service', 'repair and installation')],
     ['Scrubber systems', 'Sewage treatment plants', 'Tank farms', 'Site piping', 'FRP lining'],
     ['site/misc/PVC-Horizontal-scrubber-and-fan-combo', 'wix/sewage-plant/02', 'wix/home/05', 'wix/scrubbing-system/06', 'site/products/frp-lining--20150310_092654',
      'wix/storage-tanks/02', 'wix/sewage-plant/00']),
]


# the photo each category leads with (its most typical piece), then the rest
LEAD = {'wix/storage-tanks': ['21', '18', '12', '19', '00'], 'wix/scrubbing-system': ['01', '00', '02'], 'wix/reaction-vessels': ['01', '04', '03'],
        'wix/vacuum-receiver': ['04', '05', '00'], 'wix/centrifugal-blower': ['00', '01', '03'], 'wix/ducting': ['05', '01', '04']}


def photos(man, folder):
    if folder in man:  # a single photo rather than a folder
        keys = [folder]
    else:
        keys = sorted(k for k in man if k.startswith(folder + '/') and not k.endswith('-t'))
        lead = [f'{folder}/{n}' for n in LEAD.get(folder, []) if f'{folder}/{n}' in man]
        keys = lead + [k for k in keys if k not in lead]
    return [{'src': f'assets/pages/{k}.webp', 'thumb': f'assets/pages/{k}-t.webp', 'w': man[k]['w'], 'h': man[k]['h'], 'tw': man[k]['tw'], 'th': man[k]['th']} for k in keys]


def blocks(root):
    man = json.load(open(os.path.join(root, 'assets', 'pages', 'manifest.json')))
    b = {}

    # ── product catalogue ──
    secs, chips = [], []
    for i, (key, name, tone, kicker, text, facts, items, folders) in enumerate(CATALOGUE):
        ph = [p for f in folders for p in photos(man, f)]
        album = esc(json.dumps([{'src': p['src'], 'thumb': p['thumb'], 'alt': name} for p in ph]))
        shown = ph[:5]
        tiles = ''.join(
            f'<button type="button" class="cat__ph{" cat__ph--big" if j == 0 else ""}" style="--ph:url(/{p["thumb"]})" data-lightbox="{album}" data-lightbox-title="{esc(name)}" data-lightbox-start="{j}" aria-label="{esc(name)}: photo {j + 1} of {len(ph)}">'
            f'<img src="{p["thumb"]}" alt="" width="{p["tw"]}" height="{p["th"]}" loading="lazy" decoding="async">'
            + (f'<span>+{len(ph) - 5} photos</span>' if j == 4 and len(ph) > 5 else '') + '</button>'
            for j, p in enumerate(shown))
        fact_html = ''.join(f'<div><dt>{esc(a)}</dt><dd>{esc(c)}</dd></div>' for a, c in facts)
        secs.append(
            f'<section class="cat" id="{key}" style="--tone:{tone}" aria-labelledby="cat-{key}">'
            f'<div class="cat__text"><span class="cat__n">{i + 1:02d}</span><p class="cat__kicker">{esc(kicker)}</p>'
            f'<h2 id="cat-{key}">{esc(name)}</h2>' + ''.join(f'<p>{esc(t)}</p>' for t in text)
            + f'<dl class="cat__facts">{fact_html}</dl>'
            + '<ul class="cat__items">' + ''.join(f'<li>{esc(t)}</li>' for t in items) + '</ul>'
            + f'<a class="btn btn--primary" href="quote.html">Get a quote</a></div>'
            f'<div class="cat__photos">{tiles}</div></section>')
        chips.append(f'<a href="#{key}" style="--tone:{tone}"><i></i>{esc(name.split(" &")[0].replace(" Systems", "").replace(" Vessels", " vessels"))}</a>')
    b['catalogue'] = '\n'.join(secs)
    b['catalogue_nav'] = ''.join(chips)
    b['photo_total'] = str(sum(len(photos(man, f)) for c in CATALOGUE for f in c[7]))

    # ── clients ──
    b['client_grid'] = ''.join(
        f'<li class="cl reveal"><img src="assets/clients/{i + 1:02d}.webp" alt="{esc(n)}" loading="lazy" decoding="async"><span>{esc(n)}</span></li>'
        for i, n in enumerate(CLIENTS))
    b['client_names'] = esc(', '.join(CLIENTS))
    b['client_count'] = str(len(CLIENTS))

    # ── STP credentials (from the installed-plants brochure) ──
    plants = [('Standard Pesticide Pvt Ltd', 'Moxi, Dist. Vadodara', 60), ('Merino Industries Ltd', 'Dahej, Dist. Bharuch', 60),
              ('Eva Mall', 'Vadodara', 100), ('Sud Chemie India Pvt Ltd', 'Nandesari, Dist. Vadodara', 10),
              ('Aarti Industries Ltd, Spack Division', 'Tarapur MIDC, Maharashtra', 10), ('Aarti Industries Ltd, Unit 4', 'Tarapur MIDC, Maharashtra', 10),
              ('Merino Industries', 'Hapur, Uttar Pradesh', 10), ('Hyline Enviro', 'Egypt', 100), ('Enmedia', 'Hyderabad', 30),
              ('Camlin Life Science Ltd', 'Dahej SEZ, Dist. Bharuch', 40), ('Global Gourmet Pvt Ltd', 'Dist. Vadodara', 100),
              ('Modern Insulator Ltd', 'Abu Road, Rajasthan', 100)]
    top = max(p[2] for p in plants)
    b['stp_plants'] = ''.join(
        f'<li class="plant reveal" style="--fill:{c / top:.2f}"><b>{c}<small> KLD</small></b><span class="plant__bar"><i></i></span>'
        f'<h3>{esc(n)}</h3><p>{esc(l)}</p></li>' for n, l, c in plants)
    b['stp_plants_n'] = str(len(plants))
    b['stp_capacity'] = str(sum(p[2] for p in plants))
    ph = photos(man, 'stp') + photos(man, 'wix/sewage-plant')
    album = esc(json.dumps([{'src': p['src'], 'thumb': p['thumb'], 'alt': 'An installed sewage treatment plant'} for p in ph]))
    b['stp_gallery'] = ''.join(
        f'<button type="button" class="sg__ph" data-lightbox="{album}" data-lightbox-title="Installed plants" data-lightbox-start="{j}" aria-label="Installed plant photo {j + 1}">'
        f'<img src="{p["thumb"]}" alt="" width="{p["tw"]}" height="{p["th"]}" loading="lazy" decoding="async"></button>' for j, p in enumerate(ph))

    # ── downloads ──
    docs = [('plasto-fab-brochure-2022', 'Company Brochure', 'Who we are, the full product range, materials, machinery and clients.', 8),
            ('stp-ozon-brochure', 'STP Ozon Brochure', 'Electro-coagulation and ozonation sewage treatment, explained.', 10),
            ('stp-installed-plants', 'STP Installed Plants', 'Our installed sewage treatment plants, with capacities.', 3),
            ('stp-plant-introduction', 'STP Plant Introduction', 'Technical details: design basis, process flow and power use.', 6)]
    cards = []
    for slug, title, text, pages in docs:
        pdf = os.path.join(root, 'assets', 'downloads', slug + '.pdf')
        mb = os.path.getsize(pdf) / 1048576
        prev = sorted(f for f in os.listdir(os.path.join(root, 'assets', 'downloads')) if f.startswith(slug + '-') and f.endswith('.webp'))
        sheets = ''.join(f'<img src="assets/downloads/{f}" alt="" loading="lazy" style="--i:{k}">' for k, f in enumerate(prev[:3]))
        cards.append(f'<li class="doc"><a href="assets/downloads/{slug}.pdf" download aria-label="Download {esc(title)}, PDF, {mb:.1f} MB">'
                     f'<span class="doc__fan">{sheets}</span><span class="doc__meta"><b>{esc(title)}</b><span>{esc(text)}</span>'
                     f'<small>PDF · {pages} pages · {mb:.1f} MB</small></span><span class="doc__dl" aria-hidden="true">↓</span></a></li>')
    b['downloads'] = ''.join(cards)
    return b
