# Plasto-Fab: scroll-driven site

A static site built in the style of the Subhasri Pigments site. You can serve it from any web server:

```bash
python3 -m http.server 5191 --directory plastofab-site
```

## The story (`js/tank-story.js`, one WebGL scene)

| Section | What happens |
|---|---|
| Welcome (`.intro`, one pinned scene) | "Welcome to" and the real logo. As you scroll, a flat plastic sheet with the logo printed on it slides in. It **rolls into a cylinder**, the seam is **welded** (a hot bead runs up it), a **domed top and flat gusseted base** grow on, and it becomes an upright **FRP storage tank** in the client's blue-grey that **spins once**. It then sinks to the horizon with its top showing at the bottom centre while **"Creating shapes that matter."** rises in word by word (`js/ui.js`). Finally it comes back up to the centre. |
| Thermoplastics (`.mat--thermo`) | The tank moves beside the list and changes material as each line comes into view: PP-H, HDPE, PVC-U, CPVC, PVDF and ECTFE, each with its own colour and gloss. A weld ring glows on each change. |
| Composites (`.mat--frp`) | Glass-fibre roving **winds helically** over the liner (the FRP wrap of a dual-laminate tank, in the same blue-grey), with a lime band at the winding head. |

The tank is modelled on a client's FRP tank (their photo showed it lying down with a yellow lifting beam; here it stands upright with no beam): a domed top with a manway, two nozzles and lifting lugs, two raised stiffener bands (none across the logo), a side manhole, a low outlet nozzle, a flat base plate with twelve gusset lugs, and a nameplate. Until 2026-11 it was a wet scrubber system with stack, blower, pump and ladder (see git history). It is lit by a studio light setup (softboxes, ceiling and floor bounce) with ACES tone mapping.

- The tank follows the `.mat__tank` boxes, so CSS controls where it sits at every width.
- Browsers without WebGL get the static logo (`.no-webgl`).
- **To change the scene, edit `js/tank-story.js`, then run `./build.sh`.** The page loads `js/tank-story.min.js`, which is that file bundled with only the parts of Three.js it uses. After rebuilding, bump its `?v=` in `index.html` (both the `modulepreload` and the `script` tag).
- To stay fast, the canvas:
  - draws only when something moves
  - switches off below the composites section
  - lowers its resolution on machines that can't hold the frame rate

## The rest of the home page

- **Scroll gauge** (every page, desktop only, `site.js` + `.gauge` in `site.css`): a hairline down the right edge that fills in the brand gradient as you scroll, with the percentage riding its tip.

- **Product portfolio** (`.port`): eight equipment families on a 3D ring (ducting left out on purpose) you turn by dragging or swiping (or the arrows, arrow keys or the list); only the front item is sharp, the rest are blurred so they don't pull the eye. It turns on its own while on screen until someone takes over; the page scrolls normally past it. The pictures are 3D studio renders made in ChatGPT from Plasto-Fab's own job photos (paint colours kept), saved in `ref/renders-from-photos/`; the photo references sent are in `ref/photo-refs/`. Each render had its background cut out (rembg `isnet-general-use`) and was fitted into a 900×900 transparent WebP. Source photos: scrubber ← `wix/scrubbing-system/01`, FRP tanks ← `storage-tanks/21`, thermoplastic tank ← `storage-tanks/12`, pickling tank ← `storage-tanks/00`, reaction vessel ← `reaction-vessels/00`, vacuum receiver ← `vacuum-receiver/04`, blower ← `centrifugal-blower/00`, STP ← `sewage-plant/02` (the whole plant: filters, treatment tank, control panel, pumps; its background was keyed out from the edges, because the AI cut-out dropped the beige tank). The first Codex renders are still in `ref/renders/`.
- **Work gallery** (`#range`): 10 cards of real work photos in a strip that scrolls sideways (arrows, drag, swipe or arrow keys), including FRP/GRP, thermoplastic and pickling tanks. Each photo is shown whole, over a soft blur of itself. Each card's "Get a quote" ticks the matching project type in the form at the bottom.
- **Industries:** chemical, pharma, water, electroplating and the others they serve.
- **Why choose Plasto-Fab:** four points as cards with big gradient numbers.
- **Process:** five steps (material, design, manufacturing, inspect, dispatch) as a deck of shop photos (the design step is a general-arrangement drawing, `assets/pages/design/scrubber-drawing.svg`), with a step bar. "View photo" opens the current one full size.
- **Clients:** a moving strip of 28 client logos.
- **Film:** their company video in a framed player, with sound and a poster. It plays only on click and pauses when it scrolls away.
- **Contact:**
  - The background is navy and lime ink billowing through water. It is a small real-time fluid simulation (`js/ink.js`), not a video. With reduced motion or without WebGL 2, a still frame (`assets/ink-still.webp`) is shown instead.
  - The quote form opens the visitor's email app pre-filled (`js/callback.js`).

## The inner pages

Every topic on plasto-fab.com and the Wix site has its own page, each with its own look. They share the header (dropdown menu, full-screen menu on phones) and the footer.

| Page | File | What makes it different |
|---|---|---|
| All Products | `products.html` | The full catalogue by family, with a sticky chip index; with a mouse, the photo you point at grows to show itself whole while the others slide smaller; photos open a full-screen viewer |
| Sewage Treatment | `water-treatment.html` | A dark underwater page: light rays and bubbles, three glasses of water clearing (raw → EC → settled), the six-step treatment path traced by a droplet, gauges, a 20 KLD example table, the 12 installed plants with their capacities, and a photo strip |
| Materials | `materials.html` | A fanned deck of material samples; a table of 12 tiles that look like the real sheet (PP satin, HDPE gloss, PVC matte, glass-fibre twill for FRP, dual laminates with the liner over the FRP), CSS textures only (`.tex-*` in `css/pages.css`: each sets `--c1`/`--c2` and `--gloss`); a dual-laminate wall that explodes into its layers |
| Fabrication | `fabrication.html` | The main page: a hero of slowly changing shop photos; turnkey systems as a photo bento; the job step by step (the stepper); fewer joints drawn out; the works, machines and a photo strip; DVS, Wegener & Widos, ISO and testing; the materials as swatches; field service |
| About Us | `about.html` | A giant 1992; a scroll panorama of the works; the founder and Jhannu Pandya; a night map of NH 48 that draws itself out of Ankleshwar; what we do as a stepper (material, design, manufacturing, inspect, dispatch); mission, vision and values; figures that count up |
| Clients | `clients.html` | Big counters; a wall of 28 logos that turn in tile by tile, in colour on hover |
| Careers | `careers.html` | Drifting values words, team photos and a CV form |
| Contact Us | `contact.html` | A live "Open now / Closed" panel in India time; works address with a map link; phone numbers and emails; a form |
| Get a Quote | `quote.html` | A five-step wizard (industry, project, material, size, you) |
| Downloads | `downloads.html` | Their four PDFs as cards with fanned page previews |
| Notable Projects | `projects.html`, `blog-*.html` | The blog: six articles from the works, each on its own page, with a topic filter. Written from `pages/make_blog.py` (run it, then `build-pages.py`) |
| Not found | `404.html` | Shown by Cloudflare for any broken link: an outlined 404 and quick links to the main pages |

**Forms:**
- Contact and quote forms open the visitor's email app, filled in and addressed to info@plasto-fab.com. Careers goes to career@plasto-fab.com.
- There is no server behind the forms.

### Editing the pages

The pages are built from parts. **After editing the files in `pages/`, run:**

```bash
python3 build-pages.py
```

- `pages/<page>.html` holds each page's content, with its title, description and menu group at the top.
- `pages/_layout.html` is the frame around every page.
- Shared pieces any page can use: the stepper (`[data-stepper]`, numbered steps with progress lines, in `css/pages.css` and `js/pages.js`), material textures (`.tex-pp`, `.tex-frp`...), and the pop-in: cards rise into view and section headings fade up (`js/site.js` + the end of `css/site.css`; it lists which card classes pop).
- A `base: /` line makes a page work at any URL (used by the 404 page).
- The menu and footer are defined in `build-pages.py` (the `NAV` list). The build also refreshes the header and footer inside `index.html`. Bump `V` in `build-pages.py` to make browsers fetch changed CSS/JS.
- Photos the client turned down are listed in `BANNED` in `pages/pagedata.py` (sheet bending, shell rolling and welding, the site inspection). Don't use them anywhere.
- `pages/pagedata.py` generates the parts that come from data: the catalogue, client wall, STP plant list and gallery, and downloads.
- Each page's own style and behaviour live in `css/pages/<page>.css` and `js/pages/<page>.js`. Shared pieces:
  - `css/pages.css`
  - `js/nav.js` (menu)
  - `js/pages.js` (count-ups, photo viewer, email forms)

**Sources.** `ref/` holds what was copied from the two sites:
- `src/`: page HTML, product data and the PDFs
- `media/`: the original photos, logos and film

`python3 process.py`, run inside `ref/`, turns them into the web copies in `assets/`. `ref/tools/` has the headless-browser test scripts. **`ref/` is for editing only (about 490 MB), so don't upload it with the site.**

## Putting it on Cloudflare Pages

**Caching (so an old version never sticks):** `make-dist.sh` runs `stamp.py`, which adds `?v=<hash of the file>` to every css, js and image link in the copied HTML and CSS. A file whose contents change gets a new address and is fetched fresh; unchanged files keep theirs. `_headers` makes browsers re-check every page on each visit (`no-cache`, a quick 304 when nothing changed), keeps css/js for a year and images for a week. The hand-typed `?v=` numbers in the sources no longer matter for the live site. Images that JavaScript builds links to (client logos) aren't stamped, so they still rely on the one-week limit.

**Every time something changes, run:**

```bash
./make-dist.sh
```

It copies only the website into `dist/` and zips it as `plasto-fab-site.zip`. That comes to about 385 files and 44 MB. It leaves out:
- `ref/` and `pages/`
- the build scripts and this README
- the unbundled Three.js

Then upload it in one of two ways.

- **Dashboard:**
  1. In the Cloudflare dashboard, go to **Workers & Pages → Create → Pages → Upload assets**.
  2. Name the project (for example `plasto-fab`).
  3. Drag in the `dist` folder or `plasto-fab-site.zip`, then press **Deploy**.
  4. For later updates, open the project and choose **Create deployment**, then upload the new `dist/`.
- **Command line,** after `npx wrangler login`:

  ```bash
  npx wrangler pages deploy dist --project-name plasto-fab
  ```

- **From GitHub:** `dist/` is committed, so in Cloudflare choose **Connect to Git**, pick the repo, leave the build command empty and set the build output directory to `dist`. Every push then redeploys. Run `./make-dist.sh` before committing.

The site gets a `plasto-fab.pages.dev` address. You can attach a real domain under the project's **Custom domains** tab.

- `_headers` lets browsers keep the photos, logos, film and PDFs for a week, and adds basic security headers. If you replace an image, give it a new file name so visitors see the change straight away.
- Cloudflare serves `about.html` at `/about` too, and redirects the long form to the short one, so all links keep working.
- `404.html` uses `<base href="/">` (the `base: /` line in `pages/404.html`). This keeps its styles working at any broken URL.

## Sources and things to review

Photos, client logos, the film, the PDFs, product text, contact details and the works address come from plasto-fab.com and infodigiteq00.wixsite.com/plasto-fab. Some things to know:
- The Wix site's template leftovers were not used. Those are the Mumbai address, the placeholder phone numbers and the stock photos.
- "PVDF" and "ECTFE" are spelled correctly here, though the source pages misspell them.
- The tagline is tidied to "Creating shapes that matter."
- The about text says NH 8. That road is now NH 48, so the site says "NH 8 (now NH 48)" on the About page and NH 48 elsewhere.

Some copy was written for this site and should be reviewed before going live:
- the industry tiles, the four Why-choose-us points on the home page, the process steps and the materials descriptions
- the 20 KLD sewage plant example table, which is an illustration built from their STP brochure
- the short headings on the inner pages
