"""Writes Notable Projects (the blog): pages/projects.html (the index) and pages/blog-<slug>.html (one page per article),
from the POSTS below. Run from the project root, then python3 build-pages.py:
    python3 pages/make_blog.py && python3 build-pages.py
Facts come from the company's own pages and brochures; no dates or invented figures."""
import html, json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
man = json.load(open(os.path.join(ROOT, 'assets', 'pages', 'manifest.json')))
esc = html.escape

# slug, topic, title, dek, cover (key in manifest, or a path with w/h), cover alt, body (html)
POSTS = [
 ('fewer-joints', 'Fabrication', 'Why fewer joints make a longer-lasting tank',
  'Every weld is a seam where a tank can fail. The surest way to make equipment last is to design out the joints it does not need.',
  'wix/home/06', 'A large black HDPE tank shell in the Plasto-Fab works', '''
<h2>Where tanks fail</h2>
<p>A thermoplastic sheet arrives from the mill with the same properties all the way through. A weld is different. It is made in the shop, by a person and a machine, and its strength depends on preparation, temperature, pressure and time. That is why, when a tank or vessel starts to leak after years in service, the leak is usually found at a joint, and rarely in the middle of a sheet.</p>
<p>Joints also gather stress. Nozzles, corners and seams are where the loads from the liquid, the supports and changes in temperature come together.</p>
<h2>Designing joints out</h2>
<p>It has been a working rule at Plasto-Fab since 1992: design out every joint you can, and weld the rest to the standard. In practice, that means:</p>
<ul>
<li>Using the largest sheets the design allows, so a shell is rolled from fewer panels.</li>
<li>Placing the seams that remain away from nozzles, supports and other high-stress points.</li>
<li>Assembling large sections in our works, so fewer joints are made in the field, where conditions are harder to control.</li>
</ul>
<aside class="post__note"><b>In short</b>Each joint avoided is one less place for a leak to start, and one less weld to inspect.</aside>
<h2>Welding the joints that remain</h2>
<p>Every joint we do make is welded to DVS 2207–2208, the German Welding Society's guidelines for welding thermoplastics and for the machines that do it, on German Wegener &amp; Widos equipment.</p>
<h2>What it means for you</h2>
<p>Fewer joints mean fewer places for a leak to start, fewer welds to inspect, and equipment that stays in service longer between repairs. It is the same tank on your drawing, built to last.</p>
'''),
 ('choosing-a-thermoplastic', 'Materials', 'PP, HDPE, PVC or PVDF? Choosing a thermoplastic for your chemical',
  'The material decides how long equipment survives the chemical inside it. Here is how we think about the choice.',
  ('assets/materials/sheets.webp', 1536, 1024), 'Stacks of thermoplastic sheet in several materials (illustration)', '''
<p>No single plastic is right for every duty. The choice depends on what the equipment will hold, how hot it gets, and the loads it has to carry. These are the materials we weld most often, and where each one fits.</p>
<h2>PP-H: polypropylene</h2>
<p>Resistant to a wide range of acids, alkalis and salt solutions, and rigid enough for tanks and vessels. It is our most common choice for storage and process tanks, scrubbers and ducting.</p>
<h2>HDPE: high-density polyethylene</h2>
<p>Tough, impact-resistant and chemically inert. A natural choice for effluent treatment and large storage tanks.</p>
<h2>PVC-U and CPVC</h2>
<p>PVC-U is rigid, with high mechanical strength, for structural tanks and pipes. CPVC keeps its strength at higher temperatures than PVC-U, for hot process liquids.</p>
<h2>PVDF and ECTFE</h2>
<p>Fluoropolymers for the hardest duties: strong acids, halogens, chlorine and higher temperatures, where the standard plastics are not enough.</p>
<h2>When one material is not enough</h2>
<p>When the chemical calls for a thermoplastic but the equipment is large, or carries high loads, we put a thermoplastic liner inside a glass-fibre reinforced shell. That is a dual laminate: <a href="blog-dual-laminate.html">how it works</a>.</p>
<aside class="post__note"><b>What we need to know</b>The chemical and its concentration, and anything else in the stream; the operating temperature and its peaks; any pressure or vacuum; the size, and whether it stands indoors or outdoors.</aside>
<p>Send us those, and we will recommend the material, and the construction, that will last. You can also <a href="materials.html">compare the materials</a> we build with.</p>
'''),
 ('dual-laminate', 'Materials', 'Dual laminate: a thermoplastic liner with an FRP backbone',
  'Chemical resistance on the inside, strength on the outside. Why large equipment is often built from two materials in one wall.',
  ('assets/materials/frp.webp', 1254, 1254), 'A dual-laminate wall in cross-section, beside glass-fibre roving (illustration)', '''
<p>Thermoplastics such as PP, PVC and PVDF stand up to aggressive chemicals, but on their own they are not always strong or stiff enough for large tanks, tall scrubbers or equipment under load. Glass-fibre reinforced plastic (FRP) is strong and light, but its resin is not the best barrier against every chemical. A dual laminate puts each material where it works best.</p>
<h2>How the wall is built</h2>
<ol>
<li><b>The thermoplastic liner.</b> The only part that touches the chemical, welded into a leak-tight shell.</li>
<li><b>A bonding layer</b> that ties the liner to the laminate.</li>
<li><b>The glass-fibre laminate.</b> Glass fibre in polyester or vinyl ester resin, wound or laid over the liner, carries the load.</li>
<li><b>An outer, resin-rich surface</b> that protects the laminate.</li>
</ol>
<h2>The common pairings</h2>
<ul>
<li><b>PP-FRP:</b> a polypropylene liner with an FRP shell.</li>
<li><b>PVC-FRP:</b> PVC's chemical resistance on the inside, FRP's strength outside.</li>
<li><b>PVDF-FRP:</b> a PVDF liner for extreme chemical service.</li>
</ul>
<aside class="post__note"><b>In short</b>The liner resists the chemical; the FRP carries the load. Together they are light, strong and corrosion-proof.</aside>
<h2>Where it pays off</h2>
<p>Large storage and process tanks, scrubbers and ducting, anywhere the chemical needs a thermoplastic and the size or the loads need more strength than the thermoplastic alone can give. The equipment is easier to move, lift and install than metal equipment for the same duty. See all the <a href="materials.html">materials we build with</a>.</p>
'''),
 ('how-a-wet-scrubber-works', 'Scrubbing systems', 'How a wet scrubber cleans acid fumes',
  'Inside a packed-bed scrubber: what happens to the fumes between the inlet and the clean air at the top.',
  'wix/scrubbing-system/01', 'PP scrubber columns with their blowers', '''
<p>Plants that handle acids, solvents and other aggressive chemicals give off fumes that have to be cleaned before they reach the air. A wet scrubber does it by bringing the gas into close contact with a liquid that absorbs or neutralises it.</p>
<h2>The journey of the gas</h2>
<ol>
<li>A centrifugal blower moves the fumes from the plant, through ducting, into the scrubber.</li>
<li>The gas enters low on the column and rises through a packed bed: a deep layer of plastic packing with a very large surface.</li>
<li>Spray nozzles at the top wet the packing with scrubbing liquid, which runs down as the gas rises, so the two meet across the whole bed.</li>
<li>Above the sprays, a mist eliminator catches the fine droplets the gas would otherwise carry out.</li>
<li>The cleaned gas leaves through the outlet at the top.</li>
</ol>
<h2>The liquid side</h2>
<p>The scrubbing liquid collects in the sump at the bottom of the column, and a recirculation pump sends it back up to the spray header. Part of it is bled off and replaced as it becomes loaded with what it has absorbed.</p>
<aside class="post__note"><b>In short</b>Gas up, liquid down, across a large wet surface: the fumes are absorbed or neutralised on the way through.</aside>
<h2>Why plastic and FRP</h2>
<p>Every part of a scrubber is in contact with corrosive gas or liquid. That is why we build them in PP, PVC and FRP rather than metal, with the blower, ducting and pumps in matching materials.</p>
<h2>Supplied as a system</h2>
<p>We make scrubbers both ways round, vertical and horizontal, and supply them as turnkey units with the blower, pumps, mist eliminators and ducting they need. See our <a href="products.html#scrubbers">scrubbing systems</a>.</p>
'''),
 ('sewage-treatment-without-chemicals', 'Sewage treatment', 'Sewage treatment without chemicals or bacteria',
  'How electro-coagulation and ozone treat sewage in a compact, skid-mounted plant.',
  'wix/sewage-plant/02', 'An electro-coagulation sewage treatment plant with its filter vessels', '''
<p>Most sewage plants rely on chemicals, or on bacteria that need time, space and care. Our plants use electricity and ozone instead: a chemical-free, non-biological process in a skid-mounted plant with a small footprint.</p>
<h2>Step by step</h2>
<ol>
<li><b>Lifting.</b> Raw sewage is pumped from the equalisation or collection tank to the reaction chamber.</li>
<li><b>Electro-coagulation.</b> An aluminium-cell reactor applies a controlled electric field. Suspended matter comes together into larger particles, and gas bubbles formed in the cell float it to the surface.</li>
<li><b>Ozonation.</b> Ozone disinfects the water. It is more effective than chlorine against viruses and bacteria, leaves no harmful residue, and raises dissolved oxygen.</li>
<li><b>Sludge separation.</b> A tube settler separates the sludge, which is removed through a sludge or bag filter.</li>
<li><b>Polishing.</b> The water is pumped through a carbon filter for final polishing.</li>
<li><b>Reuse.</b> Treated water collects in a tank, ready for its next use.</li>
</ol>
<aside class="post__note"><b>From our brochure</b>Colour removal up to 95%, BOD removal more than 85%, COD removal more than 80%, and less sludge than chemical processes.</aside>
<h2>Why plants choose it</h2>
<ul>
<li>No chemicals to buy and store, and no bacteria to keep alive.</li>
<li>Skid-mounted and modular, so it is easy to expand.</li>
<li>Start and stop it when you like.</li>
<li>A small footprint, less civil construction and a very low operating cost.</li>
<li>It can retrofit existing facilities.</li>
</ul>
<p>We have installed these plants from Gujarat to Egypt. Read about the process in detail on our <a href="water-treatment.html">sewage treatment page</a>, or see <a href="water-treatment.html#plants">the plants we have installed</a>.</p>
'''),
 ('dvs-welding-standards', 'Quality', 'DVS 2207 and 2208: what the welding guidelines mean for your equipment',
  'The German standards behind every thermoplastic weld we make, and why they matter to the people who buy the equipment.',
  'wix/home/09', 'A rolled thermoplastic shell being welded in the works', '''
<p>DVS, the German Welding Society, publishes the guidelines that thermoplastic fabricators around the world work to. Two series matter most for tanks, scrubbers and ducting.</p>
<h2>DVS 2207: how the weld is made</h2>
<p>DVS 2207 covers the welding of thermoplastics: processes such as heated-tool butt welding and extrusion welding, for materials including PE, PP and PVDF. It sets out how the joint is prepared, and the temperatures, pressures and times each material needs.</p>
<h2>DVS 2208: the machines that make it</h2>
<p>DVS 2208 covers the machines and devices used to weld thermoplastics, so the equipment itself delivers the conditions the welding guidelines call for. Ours is German-made Wegener &amp; Widos equipment.</p>
<aside class="post__note"><b>In short</b>2207 is how to weld; 2208 is what to weld with. Together they make a good weld repeatable.</aside>
<h2>Why it matters to you</h2>
<ul>
<li><b>Repeatable welds:</b> the same parameters, joint after joint.</li>
<li><b>Joints made for a long life,</b> which is what the guidelines exist for.</li>
<li><b>A common language:</b> you can name DVS on your enquiry and know what you are getting.</li>
</ul>
<h2>Where it started</h2>
<p>Plasto-Fab was founded in 1992 by Mr. Mehul Pandya, a DVS-certified plastic welder. Welding to the standard has been part of how we work from the first day. See how we build on our <a href="fabrication.html">fabrication page</a>.</p>
'''),
]

def cover(c, cls, lazy=True):
    if isinstance(c, tuple):
        src, w, h = c; thumb = src.replace('.webp', '-t.webp'); tw = 720; th = round(720 * h / w)
    else:
        d = man[c]; src, w, h = f'assets/pages/{c}.webp', d['w'], d['h']; thumb, tw, th = f'assets/pages/{c}-t.webp', d['tw'], d['th']
    return src, w, h, thumb, tw, th

def minutes(body):
    words = len(re.sub(r'<[^>]+>', ' ', body).split())
    return max(2, round(words / 200))

def card(p, big=False):
    slug, topic, title, dek, c, alt, body = p
    src, w, h, thumb, tw, th = cover(c, '')
    img = (src, w, h) if big else (thumb, tw, th)
    return (f'<li class="bcard{" bcard--big" if big else ""}" data-topic="{esc(topic)}"><a href="blog-{slug}.html">'
            f'<figure class="bcard__ph"><img src="{img[0]}" alt="{esc(alt)}" width="{img[1]}" height="{img[2]}" loading="lazy" decoding="async"></figure>'
            f'<span class="bcard__meta"><span class="bcard__topic">{esc(topic)}</span><span>{minutes(body)} min read</span></span>'
            f'<b class="bcard__t">{esc(title)}</b><span class="bcard__dek">{esc(dek)}</span><span class="bcard__go">Read the article →</span></a></li>')

def write(name, text):
    open(os.path.join(ROOT, 'pages', name), 'w').write(text)

# the articles
for i, p in enumerate(POSTS):
    slug, topic, title, dek, c, alt, body = p
    src, w, h, *_ = cover(c, '')
    more = [POSTS[(i + 1) % len(POSTS)], POSTS[(i + 2) % len(POSTS)]]
    write(f'blog-{slug}.html', f'''<!--
title: {title}
description: {dek}
group: company
-->
<article class="post">
  <header class="wrap post__head">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="index.html">Home</a><span aria-hidden="true">/</span><a href="projects.html">Notable Projects</a><span aria-hidden="true">/</span><span aria-current="page">{esc(topic)}</span></nav>
    <span class="post__topic">{esc(topic)}</span>
    <h1>{esc(title)}</h1>
    <p class="post__dek">{esc(dek)}</p>
    <p class="post__by">Plasto-Fab team · {minutes(body)} min read</p>
  </header>
  <figure class="wrap post__cover"><img src="{src}" alt="{esc(alt)}" width="{w}" height="{h}" fetchpriority="high"></figure>
  <div class="wrap post__wrap">
    <div class="post__body">{body}</div>
    <aside class="post__side">
      <p>Have a question about your own equipment?</p>
      <a class="btn btn--primary" href="quote.html">Get a quote</a>
      <a class="post__side-link" href="contact.html">Talk to the works →</a>
    </aside>
  </div>
</article>

<section class="sec sec--soft post-more" aria-labelledby="more-title">
  <div class="wrap">
    <header class="post-more__head"><h2 id="more-title">More notable projects</h2><a href="projects.html">All articles →</a></header>
    <ul class="bgrid">{''.join(card(m) for m in more)}</ul>
  </div>
</section>
''')

# the index
topics = []
for p in POSTS:
    if p[1] not in topics: topics.append(p[1])
chips = '<button type="button" class="chip" data-topic="all" aria-pressed="true">All</button>' + ''.join(
    f'<button type="button" class="chip" data-topic="{esc(t)}" aria-pressed="false">{esc(t)}</button>' for t in topics)
write('projects.html', f'''<!--
title: Notable Projects
description: Notable projects and notes from the Plasto-Fab works: fabrication, materials, scrubbing systems, sewage treatment and the welding standards behind corrosion-resistant equipment.
group: company
-->
<section class="bl-hero">
  <div class="wrap bl-hero__grid">
    <div>
      <nav class="crumbs" aria-label="Breadcrumb"><a href="index.html">Home</a><span aria-hidden="true">/</span><span>Company</span><span aria-hidden="true">/</span><span aria-current="page">Notable Projects</span></nav>
      <h1 class="h-xl">Notable <span class="grad">projects.</span></h1>
    </div>
    <p class="lede">Notes from the works: what three decades of building corrosion-resistant equipment have taught us about materials, fabrication, scrubbing and treatment.</p>
  </div>
</section>

<section class="bl-list" aria-label="Articles">
  <div class="wrap">
    <div class="bl-filter" role="group" aria-label="Show">{chips}</div>
    <ul class="bgrid bgrid--index" data-blog>{card(POSTS[0], big=True)}{''.join(card(p) for p in POSTS[1:])}</ul>
  </div>
</section>

<a class="next-page" href="careers.html"><div class="wrap"><div><small>Next</small><strong>Careers</strong></div><span class="round" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></span></div></a>
''')
print('wrote projects.html and', len(POSTS), 'articles')
