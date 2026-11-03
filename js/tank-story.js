/* ═══════════════════════════════════════════════════════════
   Plasto-Fab: the scroll story, in one WebGL scene.

     1. the real logo turns into a printed thermoplastic sheet
     2. the sheet rolls into a cylinder, and the seam is extrusion-welded
        (a hot bead runs up the joint)
     3. dished heads form and the column becomes a wet scrubber system:
        exhaust stack, centrifugal blower on the inlet, recirculation pump
        and piping, ladder and platform. It turns once, then sets low
        like a horizon for the statement
     4. Thermoplastics: the scrubber takes on each material in turn
        (PP-H, HDPE, PVC-U, CPVC, PVDF, ECTFE) and its ring seams weld
     5. Composites: glass fibre winds round the column, turning it into a
        dual-laminate FRP scrubber

   Everything follows the scroll and plays backwards too.
   ═══════════════════════════════════════════════════════════ */
import * as THREE from 'three';

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (v, a, b) => clamp((v - a) / (b - a));
const ease = t => t * t * (3 - 2 * t);
const mix = (a, b, t) => a + (b - a) * t;

const canvas = document.getElementById('stage');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// the scrubber column, in logo widths: the logo covers 40% of the sheet it is printed on
const SHEET_W = 2.5;
const R = SHEET_W / TAU;          // radius once rolled
const SHELL_H = 3.8 * R;          // straight shell: sump, packed bed, spray zone, mist eliminator
const HEAD = 0.42 * R;            // depth of each dished head
const SKIRT = 0.34 * R;           // support skirt under the bottom head
const GROUND = -(SHELL_H / 2 + 0.55 * HEAD + SKIRT);
const STACK = 1.0 * R;            // exhaust stack above the outlet nozzle
const STACK_TOP = SHELL_H / 2 + HEAD + 0.1 * R + 0.18 * R + STACK;
// the whole system's box: stack top to ground, pump on the left to blower on the right (as the sections show it)
const BOX_TOP = STACK_TOP + 0.04 * R;
const BOX_BOT = GROUND;
const TOTAL_H = BOX_TOP - BOX_BOT;
const BOX_MID = (BOX_TOP + BOX_BOT) / 2;
const BOX_W = 3.9 * R;
const BOX_MIDX = 0.42 * R;
const SEAM_TURN = 0.62 - Math.PI; // turns the seam (at the back) to the front-right while it is welded

// thermoplastics, in the order the section lists them: [name, colour]
const MATERIALS = [
  [0.80, 0.78, 0.71, 0.42],   // PP-H: pebble grey-beige, satin
  [0.10, 0.10, 0.11, 0.30],   // HDPE: black, a little glossier
  [0.34, 0.38, 0.41, 0.36],   // PVC-U: dark grey
  [0.80, 0.81, 0.80, 0.38],   // CPVC: light grey
  [0.93, 0.91, 0.86, 0.30],   // PVDF: natural ivory
  [0.90, 0.90, 0.86, 0.32],   // ECTFE: off-white
];
const FRP = [0.12, 0.2, 0.36];     // the wound laminate: deep navy
const LIME = [0.66, 0.78, 0.02];   // brand lime, for the winding front

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: devicePixelRatio < 1.5, alpha: true, powerPreference: 'high-performance' });
} catch (e) {
  document.documentElement.classList.add('no-webgl');
}

/* ── shaders ───────────────────────────────────────────── */
const NOISE = `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }`;

// studio lighting shared by every surface: a photographic environment (two tall softboxes,
// a bright ceiling, a darker floor and the line where they meet) reflected with fresnel,
// a key light, soft ambient, and a filmic tone curve
const LIGHT = `
  vec3 envMap(vec3 r, float rough) {
    float y = r.y, az = atan(r.x, r.z), w = mix(0.025, 0.42, rough);
    vec3 c = mix(vec3(0.34, 0.35, 0.38), vec3(0.96, 0.97, 1.0), smoothstep(-0.35, 0.5, y));
    c *= 1.0 - 0.25 * exp(-pow((y + 0.03) / (0.06 + rough * 0.2), 2.0));
    float b1 = (1.0 - smoothstep(0.0, w, abs(az + 0.92) - 0.15)) * smoothstep(-0.32, -0.12, y) * (1.0 - smoothstep(0.52, 0.72, y));
    float b2 = (1.0 - smoothstep(0.0, w, abs(az - 1.25) - 0.06)) * smoothstep(-0.22, -0.02, y) * (1.0 - smoothstep(0.48, 0.66, y));
    float top = smoothstep(0.72, 0.95, y);
    return c + vec3(1.0, 0.99, 0.97) * (b1 * 1.9 + b2 * 1.1 + top * 0.5);
  }
  vec3 shade(vec3 base, vec3 n, vec3 v, float rough, float metal, float ao) {
    vec3 L = normalize(vec3(-0.55, 0.65, 0.75));
    float ndl = max(dot(n, L), 0.0);
    vec3 amb = mix(vec3(0.52, 0.5, 0.48), vec3(0.95, 0.97, 1.0), n.y * 0.5 + 0.5);
    vec3 diff = base * (amb * 0.55 + vec3(1.0, 0.98, 0.94) * ndl * 0.7) * ao;
    float nv = max(dot(n, v), 0.0);
    float F = 0.045 + 0.955 * pow(1.0 - nv, 5.0);
    vec3 env = envMap(reflect(-v, n), rough);
    vec3 spec = env * mix(vec3(F * (1.5 - rough)), base, metal) * mix(1.0, 0.95, metal);
    vec3 h = normalize(L + v);
    spec += vec3(pow(max(dot(n, h), 0.0), mix(220.0, 12.0, rough)) * (1.0 - rough) * mix(0.55, 1.2, metal));
    return diff * (1.0 - metal) + spec * mix(ao, 1.0, 0.35);
  }
  vec3 tone(vec3 x) { x *= 1.22; return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }`;

const tankVert = `
  attribute float aU; attribute vec3 aProf;    // aProf: shell fraction (y), head param (0 rim → 1 pole), side (-1 bottom, 0 shell, 1 top)
  uniform float uBend, uGrow, uHeads;
  uniform float uSheetW, uSheetH, uR, uShellH, uHead;
  varying vec3 vLocal; varying vec3 vN; varying vec2 vSheet; varying float vTheta; varying vec3 vWorld;
  void main() {
    // the sheet grows from the logo's own rectangle to the full panel
    float w = mix(1.0, uSheetW, uGrow), hS = mix(uSheetH, uShellH, uGrow);
    float s = (aU - 0.5) * w;                       // across the sheet
    float y, r = 1.0; vec2 np = vec2(1.0, 0.0);     // profile normal (radial, up)
    if (aProf.z == 0.0) y = aProf.x * hS;
    else {
      float phi = aProf.y * 1.5707963 * uHeads;
      r = cos(phi);
      y = aProf.z * (hS * 0.5 + sin(phi) * uHead);
      np = normalize(vec2(cos(phi) * uHead, sin(phi) * uR + 1e-4) * vec2(1.0, aProf.z));
    }
    vec3 p, n;
    if (uBend < 1e-3) { p = vec3(s, y, 0.0); n = vec3(0.0, 0.0, 1.0); }
    else {
      float k = uBend / uR, a = s * k;
      p = vec3(r * sin(a) / k, y, -1.0 / k + r * cos(a) / k + uBend * uR);
      n = normalize(vec3(sin(a) * np.x, np.y, cos(a) * np.x));
    }
    vLocal = p; vN = normalize(normalMatrix * n);
    vSheet = vec2(s, y); vTheta = s / uR;          // angle round the tank once rolled (seam at ±pi)
    vec4 wp = modelMatrix * vec4(p, 1.0); vWorld = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;

const tankFrag = `
  uniform sampler2D uLogo; uniform float uLogoA, uSheet, uWeld, uRing, uWind, uR, uShellH, uHeads, uFade, uBend, uRough, uRingY;
  uniform vec3 uShell, uFrp, uLime;
  varying vec3 vLocal; varying vec3 vN; varying vec2 vSheet; varying float vTheta; varying vec3 vWorld;
  ${NOISE} ${LIGHT}
  void main() {
    vec3 n = normalize(gl_FrontFacing ? vN : -vN);
    vec3 v = normalize(cameraPosition - vWorld);
    float y = vLocal.y, hs = uShellH * 0.5, roll = smoothstep(0.85, 1.0, uBend);
    vec3 up = vec3(0.0, 1.0, 0.0), T = normalize(cross(up, n) + vec3(1e-4, 0.0, 0.0));

    // the printed logo: its own rectangle, centred on the sheet
    vec2 luv = vec2(vSheet.x + 0.5, vSheet.y / uLogoA + 0.5);
    vec4 logo = (luv.x > 0.0 && luv.x < 1.0 && luv.y > 0.0 && luv.y < 1.0) ? texture2D(uLogo, luv) : vec4(0.0);

    // a real sheet: faint mottling, slightly darker toward the foot, and gentle waviness in the reflections
    vec3 base = uShell * (0.965 + 0.05 * vnoise(vec2(vTheta * 1.6, y * 1.8)) + 0.025 * vnoise(vSheet * vec2(60.0, 140.0)));
    base *= mix(0.9, 1.0, smoothstep(-hs, -hs + 0.35, y));
    float rough = uRough, ao = 1.0;
    n = normalize(n + (T * (vnoise(vec2(vTheta * 2.4, y * 3.2)) - 0.5) * 0.07 + up * (vnoise(vec2(vTheta * 2.4 + 7.0, y * 3.2 + 3.0)) - 0.5) * 0.05) * roll);

    // weld beads: round in section, so their crown catches the softboxes
    float seamD = (3.14159265 - abs(vTheta)) * uR, side = vTheta > 0.0 ? -1.0 : 1.0;
    float bw = 0.011;
    float vBead = (1.0 - smoothstep(bw * 0.8, bw, seamD)) * step(y, mix(-hs, hs, uWeld)) * step(abs(y), hs) * step(0.001, uWeld);
    float ringA = y - uShellH / 6.0, ringB = y + uShellH / 6.0, rs = abs(ringA) < abs(ringB) ? ringA : ringB;
    float around = (vTheta + 3.14159265) / 6.2831853;
    float hBead = (1.0 - smoothstep(bw * 0.8, bw, abs(rs))) * step(around, uRing);
    n = normalize(n + T * side * (seamD / bw) * 1.1 * vBead + up * (rs / bw) * 1.1 * hBead);
    float bead = max(vBead, hBead);
    base = mix(base, base * 0.96, bead); rough = mix(rough, 0.22, bead);

    // stiffener rings throw a soft shadow on the shell just above and below them
    float dr = min(abs(y - uRingY), abs(y + uRingY));
    ao *= 1.0 - 0.32 * exp(-max(dr - 0.012, 0.0) / 0.02) * step(0.012, dr) * uHeads;
    // and the gas outlet shades the top of the head round its foot
    float rAx = length(vLocal.xz);
    ao *= 1.0 - 0.3 * exp(-max(rAx - 0.3 * uR, 0.0) / 0.025) * step(hs, y) * uHeads;

    // the fresh weld is still hot: a glow just behind the head of the bead
    float headY = mix(-hs, hs, uWeld), hot = 0.0;
    hot = (1.0 - smoothstep(0.0, 0.05, seamD)) * exp(-max(headY - y, 0.0) / 0.06) * step(y, headY) * step(0.001, uWeld) * step(uWeld, 0.999);
    float ringHead = uRing * 6.2831853 - 3.14159265;
    hot = max(hot, (1.0 - smoothstep(0.0, 0.05, abs(rs))) * exp(-max(ringHead - vTheta, 0.0) * 1.6) * step(vTheta, ringHead) * step(0.001, uRing) * step(uRing, 0.999));

    // glass fibre wound on, bottom to top: a glossy resin laminate with the winding pattern beneath
    float yN = (y + hs + 0.42 * uR * uHeads) / (uShellH + 0.84 * uR * uHeads);
    float front = uWind * 1.08 - 0.04;
    float wound = (1.0 - smoothstep(front - 0.02, front, yN)) * step(0.001, uWind);
    if (wound > 0.0) {
      float hx = vTheta / 6.2831853 * 14.0;
      float f1 = abs(fract(hx + y * 9.0) - 0.5), f2 = abs(fract(hx - y * 9.0) - 0.5);
      float fibre = smoothstep(0.4, 0.5, max(f1, f2)) * 0.6 + vnoise(vec2(vTheta * 90.0, y * 420.0)) * 0.18;
      base = mix(base, uFrp * (0.85 + fibre * 0.45), wound);
      rough = mix(rough, 0.14, wound);
      n = normalize(n + up * (vnoise(vec2(vTheta * 30.0, y * 60.0)) - 0.5) * 0.04 * wound);   // resin orange-peel
    }
    float band = (1.0 - smoothstep(0.0, 0.025, abs(yN - front))) * step(0.001, uWind) * step(uWind, 0.999);

    // the logo is printed under the same gloss as the sheet
    base = mix(base, logo.rgb, logo.a * (1.0 - wound) * uSheet);
    vec3 col = tone(shade(base, n, v, rough, 0.0, ao));
    col = mix(col, vec3(1.0, 0.55, 0.15), hot * 0.9);
    col = mix(col, uLime, band * 0.85);
    if (!gl_FrontFacing) col *= 0.55;                          // inside of the tank

    // before there is a sheet, the logo is exactly the page's logo
    col = mix(logo.rgb, col, uSheet);
    float a = mix(logo.a, 1.0, uSheet);
    if (a * uFade < 0.01) discard;
    gl_FragColor = vec4(col, a * uFade);
  }`;

// fittings share one lit material: plastic that follows the shell (and is wound in FRP), or stainless steel
const partVert = `
  varying vec3 vN; varying vec3 vWorld; varying vec3 vObj;
  void main() { vN = normalize(normalMatrix * normal); vObj = position; vec4 wp = modelMatrix * vec4(position, 1.0); vWorld = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`;
const partFrag = `
  uniform vec3 uColor, uFrp; uniform float uWind, uFade, uRough, uMetal, uFrpMix, uDark;
  varying vec3 vN; varying vec3 vWorld; varying vec3 vObj; ${NOISE} ${LIGHT}
  void main() {
    vec3 n = normalize(gl_FrontFacing ? vN : -vN), v = normalize(cameraPosition - vWorld);
    float w = uWind * uFrpMix;
    vec3 base = mix(uColor, uFrp, w) * (0.97 + 0.05 * vnoise(vObj.xz * 40.0 + vObj.y * 30.0));
    float rough = mix(uRough, 0.14, w);
    if (uMetal > 0.5) rough += (vnoise(vObj.xy * 300.0) - 0.5) * 0.08;   // brushed steel
    vec3 c = tone(shade(base, n, v, rough, uMetal, gl_FrontFacing ? 1.0 : 0.35));
    gl_FragColor = vec4(c * (1.0 - uDark), uFade);
  }`;
// the sight glass: a clear tube, bright at its edges, with liquid inside
const glassFrag = `
  uniform vec3 uTint; uniform float uFill;
  varying vec3 vN; varying vec3 vWorld; varying vec3 vObj; ${LIGHT}
  void main() {
    vec3 n = normalize(gl_FrontFacing ? vN : -vN), v = normalize(cameraPosition - vWorld);
    float edge = pow(1.0 - max(dot(n, v), 0.0), 2.0);
    vec3 env = envMap(reflect(-v, n), 0.05);
    vec3 c = mix(uTint, env, 0.55) ;
    gl_FragColor = vec4(tone(c), mix(uFill, 0.95, edge));
  }`;

// heat haze rising off the fresh weld
const hazeVert = `
  attribute vec4 aR; uniform vec3 uHead; uniform float uTime, uOn, uPx;
  varying float vA;
  void main() {
    float t = fract(aR.x + uTime * (0.6 + aR.y * 0.5));
    vec3 p = uHead + vec3((aR.z - 0.5) * 0.04 + sin(t * 9.0 + aR.w * 6.0) * 0.01 * t, t * 0.16, (aR.w - 0.5) * 0.03);
    vA = (1.0 - t) * t * 4.0 * uOn;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (2.0 + aR.y * 4.0) * uPx * (1.0 + t);
  }`;
const hazeFrag = `
  varying float vA;
  void main() { vec2 c = gl_PointCoord - 0.5; float d = dot(c, c); if (d > 0.25) discard;
    gl_FragColor = vec4(1.0, 0.62, 0.25, vA * (0.25 - d) * 1.6); }`;

/* ── geometry ──────────────────────────────────────────── */
// a sheet/tank grid: u runs round (0 → 1, seam at both ends), rows run bottom head → shell → top head
function tankGeometry(nu, nShell, nHead) {
  const rows = [];
  for (let i = nHead; i >= 1; i--) rows.push([-0.5, i / nHead, -1]);      // bottom head, pole → rim
  for (let i = 0; i <= nShell; i++) rows.push([i / nShell - 0.5, 0, 0]);   // shell
  for (let i = 1; i <= nHead; i++) rows.push([0.5, i / nHead, 1]);          // top head, rim → pole
  const nv = rows.length, count = (nu + 1) * nv;
  const pos = new Float32Array(count * 3), aU = new Float32Array(count), prof = new Float32Array(count * 3), idx = [];
  for (let j = 0; j < nv; j++) for (let i = 0; i <= nu; i++) {
    const k = j * (nu + 1) + i;
    aU[k] = i / nu;
    prof.set(rows[j], k * 3);
  }
  for (let j = 0; j < nv - 1; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + nu + 1;
    idx.push(a, a + 1, b, a + 1, b + 1, b);   // counter-clockwise seen from outside
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aU', new THREE.BufferAttribute(aU, 1));
  g.setAttribute('aProf', new THREE.BufferAttribute(prof, 3));
  g.setIndex(idx);
  return g;
}

/* ── scene ─────────────────────────────────────────────── */
async function init() {
  const scene = new THREE.Scene();
  const group = new THREE.Group();     // the tank and its fittings move, turn and scale together
  scene.add(group);

  const logoImg = document.querySelector('.welcome__name img');
  const logoTex = await new THREE.TextureLoader().loadAsync(logoImg.currentSrc || 'assets/brand/logo-1600.webp');
  logoTex.colorSpace = THREE.NoColorSpace;
  logoTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const logoA = logoTex.image.height / logoTex.image.width;

  const shell = new THREE.Vector3(...MATERIALS[0].slice(0, 3));
  const TU = {
    uLogo: { value: logoTex }, uLogoA: { value: logoA }, uSheet: { value: 0 }, uGrow: { value: 0 }, uBend: { value: 0 }, uHeads: { value: 0 },
    uWeld: { value: 0 }, uRing: { value: 0 }, uWind: { value: 0 }, uFade: { value: 1 },
    uSheetW: { value: SHEET_W }, uSheetH: { value: logoA }, uR: { value: R }, uShellH: { value: SHELL_H }, uHead: { value: HEAD },
    uShell: { value: shell }, uFrp: { value: new THREE.Vector3(...FRP) }, uLime: { value: new THREE.Vector3(...LIME) },
    uRough: { value: MATERIALS[0][3] }, uRingY: { value: 0 },
  };
  const tank = new THREE.Mesh(tankGeometry(220, 60, 18), new THREE.ShaderMaterial({
    uniforms: TU, vertexShader: tankVert, fragmentShader: tankFrag, side: THREE.DoubleSide, transparent: true,
  }));
  tank.frustumCulled = false;
  group.add(tank);

  // fittings, as on a real process tank. Each set grows in with the heads.
  const mat = (o = {}) => new THREE.ShaderMaterial({
    uniforms: { uColor: { value: o.color || shell }, uFrp: TU.uFrp, uWind: TU.uWind, uFade: TU.uFade,
      uRough: o.rough || TU.uRough, uMetal: { value: o.metal || 0 }, uFrpMix: { value: o.frp === false ? 0 : 1 }, uDark: { value: o.dark || 0 } },
    vertexShader: partVert, fragmentShader: partFrag, transparent: true,
  });
  const partMat = mat();
  const steelMat = mat({ color: new THREE.Vector3(0.8, 0.81, 0.82), rough: { value: 0.3 }, metal: 1, frp: false });
  const holeMat = mat({ dark: 0.86, frp: false });
  const cylG = (r, h, seg = 40, open = false) => new THREE.CylinderGeometry(r, r, h, seg, 1, open);
  const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); return o; };
  // a flanged nozzle growing along +y from its foot: pipe, flange, studs and nuts, then a blind cover or an open bore
  const nozzle = (r, len, blind) => {
    const g = new THREE.Group(), ft = r * 0.34, fr = r * 1.95;
    g.add(mesh(cylG(r, len, 40), partMat, 0, len / 2, 0));
    g.add(mesh(cylG(fr, ft, 56), partMat, 0, len - ft / 2, 0));
    const nb = r > 0.15 * R ? 20 : 8, nutG = new THREE.CylinderGeometry(r * 0.085, r * 0.085, ft * 0.5, 6), studG = cylG(r * 0.045, ft * 1.5, 8);
    for (let i = 0; i < nb; i++) {
      const a = (i + 0.5) / nb * TAU, x = Math.cos(a) * r * 1.58, z = Math.sin(a) * r * 1.58;
      g.add(mesh(studG, steelMat, x, len + (blind ? ft * 0.45 : -0.1 * ft), z));
      g.add(mesh(nutG, steelMat, x, len + (blind ? ft * 0.95 : ft * 0.25), z));
    }
    if (blind) g.add(mesh(cylG(fr, ft * 0.7, 56), partMat, 0, len + ft * 0.35, 0));
    else g.add(mesh(cylG(r * 0.8, 0.002, 32), holeMat, 0, len + 0.001, 0));
    return g;
  };
  const domeY = d => HEAD * Math.sqrt(Math.max(0, 1 - (d / R) ** 2));   // height of the top head at a distance from the axis

  // top head: the gas outlet, a reducer and the exhaust stack; two small nozzles and two lifting lugs
  const top = new THREE.Group();
  const outlet = nozzle(0.3 * R, 0.1 * R, false); outlet.position.y = domeY(0) - 0.04 * R; top.add(outlet);
  const oTop = outlet.position.y + 0.1 * R;
  top.add(mesh(new THREE.CylinderGeometry(0.22 * R, 0.3 * R, 0.18 * R, 48, 1, true), partMat, 0, oTop + 0.09 * R, 0));   // reducer
  top.add(mesh(cylG(0.36 * R, 0.04 * R, 48), partMat, 0, oTop + 0.2 * R, 0));                                          // stack flange
  top.add(mesh(cylG(0.22 * R, STACK, 48, true), partMat, 0, oTop + 0.18 * R + STACK / 2, 0));                            // stack
  top.add(mesh(cylG(0.29 * R, 0.035 * R, 48), partMat, 0, oTop + 0.18 * R + STACK, 0));                                 // lip
  top.add(mesh(cylG(0.2 * R, 0.002, 32), holeMat, 0, oTop + 0.18 * R + STACK + 0.02 * R, 0));
  const port = nozzle(0.035 * R, 0.08 * R, true); port.rotation.z = -Math.PI / 2; port.position.set(0.21 * R, oTop + 0.18 * R + STACK * 0.55, 0); top.add(port);   // sampling port
  [[0.6, 0.22, 0.07, 0.18, true], [-0.5, -0.42, 0.06, 0.15, true]].forEach(([x, z, r, l, blind]) => {
    const n = nozzle(r * R, l * R, blind); n.position.set(x * R, domeY(Math.hypot(x, z) * R) - 0.02 * R, z * R); top.add(n);
  });
  [-1, 1].forEach(sd => top.add(mesh(new THREE.BoxGeometry(0.03 * R, 0.14 * R, 0.13 * R), partMat, sd * 0.8 * R, domeY(0.8 * R) + 0.03 * R, 0.05 * R)));

  // bottom: the support skirt with an access opening, on a base ring
  const bottom = new THREE.Group();
  const skirt = mesh(cylG(R * 0.94, SKIRT, 120, true), partMat, 0, -HEAD * 0.55 - SKIRT / 2 + 0.02, 0);
  bottom.add(skirt);
  const ringProfile = (r0, r1, h) => [new THREE.Vector2(r0, -h / 2), new THREE.Vector2(r1, -h / 2), new THREE.Vector2(r1, h / 2), new THREE.Vector2(r0, h / 2), new THREE.Vector2(r0, -h / 2)];
  bottom.add(mesh(new THREE.LatheGeometry(ringProfile(0.9 * R, 1.0 * R, 0.045 * R), 120), partMat, 0, -HEAD * 0.55 - SKIRT + 0.02 + 0.0225 * R, 0));
  const opening = mesh(new THREE.PlaneGeometry(0.26 * R, 0.17 * R), holeMat, 0, -HEAD * 0.55 - SKIRT * 0.45, 0);
  const oa = 0.35; opening.position.x = Math.sin(oa) * R * 0.945; opening.position.z = Math.cos(oa) * R * 0.945; opening.rotation.y = oa;
  bottom.add(opening);

  // the shell: two body flanges, packing manholes, a sump level gauge, a nameplate
  const body = new THREE.Group();
  const RING_Y = SHELL_H * 0.3;
  TU.uRingY.value = RING_Y;
  const rings = [RING_Y, -RING_Y].map(y => { const m = mesh(new THREE.LatheGeometry(ringProfile(R * 0.995, R * 1.045, 0.05 * R), 160), partMat, 0, y, 0); body.add(m); return m; });
  const onShell = (theta, y, child, out = 0) => {   // stands a part on the shell, pointing outward
    const h = new THREE.Group(); h.position.set(Math.sin(theta) * (R + out), y, Math.cos(theta) * (R + out)); h.rotation.y = theta;
    child.rotation.x = Math.PI / 2; h.add(child); body.add(h); return h;
  };
  // packing access manholes, with bolted covers and handles
  const manhole = () => {
    const g = nozzle(0.15 * R, 0.1 * R, true);
    const hd = new THREE.Mesh(new THREE.TorusGeometry(0.06 * R, 0.009 * R, 8, 20, Math.PI), steelMat);
    hd.rotation.y = Math.PI / 2; hd.position.y = 0.1 * R + 0.15 * R * 0.34 * 1.05; g.add(hd); return g;
  };
  const sideNozzles = [onShell(0.95, -SHELL_H * 0.27, manhole(), -0.02 * R), onShell(0.95, SHELL_H * 0.22, manhole(), -0.02 * R)];
  // level gauge on the sump: a clear tube stood off the shell on two connections, with liquid in it
  const gauge = new THREE.Group(), gx = -2.25, off = 0.2 * R, gTop = -SHELL_H * 0.1, gBot = -SHELL_H * 0.44;
  const gl = (h, y) => { const c = new THREE.Group(); c.position.set(Math.sin(gx) * (R + off), y, Math.cos(gx) * (R + off)); c.rotation.y = gx; return c; };
  const tube = gl(0, 0);
  const glassMat = new THREE.ShaderMaterial({ uniforms: { uTint: { value: new THREE.Vector3(0.9, 0.95, 1.0) }, uFill: { value: 0.12 } }, vertexShader: partVert, fragmentShader: glassFrag, transparent: true, depthWrite: false });
  const liquidMat = new THREE.ShaderMaterial({ uniforms: { uTint: { value: new THREE.Vector3(0.38, 0.62, 0.78) }, uFill: { value: 0.82 } }, vertexShader: partVert, fragmentShader: glassFrag, transparent: true });
  const level = gBot + (gTop - gBot) * 0.55;
  tube.add(mesh(cylG(0.026 * R, level - gBot, 20), liquidMat, 0, (level + gBot) / 2, 0));
  tube.add(mesh(cylG(0.036 * R, gTop - gBot, 24), glassMat, 0, (gTop + gBot) / 2, 0));
  [gTop, gBot].forEach(y => {
    tube.add(mesh(cylG(0.05 * R, 0.05 * R, 20), steelMat, 0, y + (y > gBot ? 0.03 : -0.03) * R, 0));                // caps
    const arm = mesh(cylG(0.026 * R, off, 16), partMat, 0, y, -off / 2); arm.rotation.x = Math.PI / 2; tube.add(arm);   // connection to the shell
    tube.add(mesh(new THREE.BoxGeometry(0.07 * R, 0.07 * R, 0.07 * R), steelMat, 0, y, -off * 0.45));                 // isolating valve
    tube.add(mesh(new THREE.BoxGeometry(0.11 * R, 0.014 * R, 0.02 * R), steelMat, 0.05 * R, y + 0.045 * R, -off * 0.45));
  });
  body.add(tube);
  tube.traverse(o => { if (o.material === glassMat) o.renderOrder = 3; else if (o.material === liquidMat) o.renderOrder = 2; });
  // nameplate, riveted stainless
  const plateTex = (() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 320; const g = c.getContext('2d');
    g.fillStyle = '#c9ccd0'; g.fillRect(0, 0, 512, 320);
    g.strokeStyle = '#8d9298'; g.lineWidth = 8; g.strokeRect(14, 14, 484, 292);
    g.fillStyle = '#2b3140'; g.font = '600 64px Poppins, Arial, sans-serif'; g.textAlign = 'center'; g.fillText('PLASTO-FAB', 256, 120);
    g.font = '400 34px Poppins, Arial, sans-serif'; g.fillText('WET SCRUBBER · ANKLESHWAR', 256, 180);
    g.fillRect(70, 215, 372, 3); g.fillRect(70, 250, 372, 3);
    [[36, 36], [476, 36], [36, 284], [476, 284]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 10, 0, TAU); g.fillStyle = '#9aa0a7'; g.fill(); });
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.anisotropy = 4; return t;
  })();
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.2 * R, 0.125 * R), new THREE.ShaderMaterial({
    uniforms: { uMap: { value: plateTex } },
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vWorld; void main(){ vUv = uv; vN = normalize(normalMatrix * normal); vec4 wp = modelMatrix * vec4(position, 1.0); vWorld = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }',
    fragmentShader: `uniform sampler2D uMap; varying vec2 vUv; varying vec3 vN; varying vec3 vWorld; ${LIGHT}
      void main(){ vec3 b = texture2D(uMap, vUv).rgb; vec3 n = normalize(vN), v = normalize(cameraPosition - vWorld);
        gl_FragColor = vec4(tone(shade(b, n, v, 0.32, 0.65, 1.0)), 1.0); }`,
  }));
  const pa = 0.3; plate.position.set(Math.sin(pa) * (R + 0.004), -SHELL_H * 0.13, Math.cos(pa) * (R + 0.004)); plate.rotation.y = pa;
  body.add(plate);

  // the plant round the column. Each rig is built in a frame turned to its angle: +z points out from the axis
  const motorMat = mat({ color: new THREE.Vector3(0.14, 0.26, 0.46), rough: { value: 0.36 }, metal: 0.15, frp: false });
  const yellowMat = mat({ color: new THREE.Vector3(0.86, 0.64, 0.07), rough: { value: 0.42 }, frp: false });
  const galvMat = mat({ color: new THREE.Vector3(0.6, 0.62, 0.64), rough: { value: 0.55 }, metal: 0.55, frp: false });
  const concMat = mat({ color: new THREE.Vector3(0.66, 0.65, 0.62), rough: { value: 0.9 }, frp: false });
  const rig = theta => { const g = new THREE.Group(); g.rotation.y = theta; body.add(g); return g; };
  const box = (w, h, d, m, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z);
  const pipe = (r, len, m, x, y, z, axis) => { const o = mesh(cylG(r, len, 20), m, x, y, z); if (axis === 'z') o.rotation.x = Math.PI / 2; if (axis === 'x') o.rotation.z = Math.PI / 2; return o; };
  // a centrifugal casing: the spiral volute with its tangential outlet (+u), extruded along z
  const volute = (r0, r1, L, depth) => {
    const sh = new THREE.Shape(), n = 64;
    for (let i = 0; i <= n; i++) {
      const a = 0.04 + (TAU - 0.04) * i / n, th = Math.PI / 2 - a, r = r0 + (r1 - r0) * a / TAU;
      i ? sh.lineTo(r * Math.cos(th), r * Math.sin(th)) : sh.moveTo(r * Math.cos(th), r * Math.sin(th));
    }
    sh.lineTo(L, r1); sh.lineTo(L, r0); sh.closePath();
    const bev = depth * 0.08;
    const g = new THREE.ExtrudeGeometry(sh, { depth: depth - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev * 0.8, bevelSegments: 3, curveSegments: 4 });
    g.translate(0, 0, -(depth - 2 * bev) / 2);
    return g;
  };

  // centrifugal blower, pushing the fumes into the column's inlet low on the right
  const blower = rig(2.2), yIn = -SHELL_H * 0.3;
  const VR0 = 0.26 * R, VR1 = 0.5 * R, VL = 0.5 * R, VD = 0.3 * R, vy = yIn - (VR0 + VR1) / 2, vz = R + 0.14 * R + 0.3 * R + VL;
  const inlet = nozzle(0.13 * R, 0.14 * R, false); inlet.rotation.x = Math.PI / 2; inlet.position.set(0, yIn, R - 0.02 * R); blower.add(inlet);
  blower.add(pipe(0.12 * R, vz - VL - (R + 0.14 * R), partMat, 0, yIn, (vz - VL + R + 0.14 * R) / 2, 'z'));                // duct
  blower.add(box(VD + 0.08 * R, VR1 - VR0 + 0.08 * R, 0.035 * R, partMat, 0, yIn, vz - VL));                                // outlet flange
  const casing = mesh(volute(VR0, VR1, VL, VD), partMat, 0, vy, vz); casing.rotation.y = Math.PI / 2; blower.add(casing);
  const eye = nozzle(0.16 * R, 0.1 * R, false); eye.rotation.z = Math.PI / 2; eye.position.set(-VD / 2, vy, vz); blower.add(eye);
  blower.add(pipe(0.055 * R, 0.12 * R, steelMat, VD / 2 + 0.06 * R, vy, vz, 'x'));                                           // coupling guard
  blower.add(pipe(0.17 * R, 0.42 * R, motorMat, VD / 2 + 0.12 * R + 0.21 * R, vy, vz, 'x'));                                 // motor
  blower.add(pipe(0.15 * R, 0.07 * R, motorMat, VD / 2 + 0.12 * R + 0.455 * R, vy, vz, 'x'));                               // fan cowl
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; const f = box(0.36 * R, 0.012 * R, 0.03 * R, motorMat, VD / 2 + 0.33 * R, vy + Math.sin(a) * 0.17 * R, vz + Math.cos(a) * 0.17 * R); f.rotation.x = -a; blower.add(f); }   // cooling fins
  blower.add(box(0.12 * R, 0.08 * R, 0.12 * R, motorMat, VD / 2 + 0.3 * R, vy + 0.2 * R, vz));                               // terminal box
  blower.add(box(VD * 0.9, vy - 0.42 * R - GROUND, 0.5 * R, galvMat, 0, (vy - 0.42 * R + GROUND) / 2, vz));                  // casing stool
  blower.add(box(0.38 * R, vy - 0.17 * R - GROUND, 0.3 * R, galvMat, VD / 2 + 0.33 * R, (vy - 0.17 * R + GROUND) / 2, vz)); // motor stool
  blower.add(box(1.2 * R, 0.05 * R, 0.8 * R, concMat, 0.25 * R, GROUND + 0.025 * R, vz));                                   // plinth

  // recirculation pump on its plinth: draws from the sump, sends the liquor up to the spray header
  const pump = rig(-1.55), yS = -SHELL_H / 2 + 0.12 * R, yTop = SHELL_H * 0.4, pz = 1.5 * R, px = -0.11 * R;
  pump.add(box(0.5 * R, yS - 0.17 * R - GROUND, 0.75 * R, concMat, 0, (yS - 0.17 * R + GROUND) / 2, pz + 0.18 * R));         // plinth
  const pc = mesh(volute(0.08 * R, 0.14 * R, 0.13 * R, 0.1 * R), partMat, 0, yS, pz); pc.rotation.z = Math.PI / 2; pump.add(pc);
  pump.add(pipe(0.085 * R, 0.3 * R, motorMat, 0, yS, pz + 0.28 * R, 'z'));                                                   // motor
  pump.add(box(0.2 * R, 0.035 * R, 0.55 * R, galvMat, 0, yS - 0.12 * R, pz + 0.15 * R));                                    // base frame
  const suct = nozzle(0.05 * R, 0.1 * R, false); suct.rotation.x = Math.PI / 2; suct.position.set(0, yS, R - 0.02 * R); pump.add(suct);
  pump.add(pipe(0.045 * R, pz - 0.05 * R - (R + 0.1 * R), partMat, 0, yS, (pz - 0.05 * R + R + 0.1 * R) / 2, 'z'));          // suction line
  pump.add(pipe(0.045 * R, yTop - 0.12 * R - (yS + 0.13 * R), partMat, px, (yTop - 0.12 * R + yS + 0.13 * R) / 2, pz));      // riser
  const elbow = mesh(new THREE.TorusGeometry(0.12 * R, 0.045 * R, 12, 18, Math.PI / 2), partMat, px, yTop - 0.12 * R, pz - 0.12 * R); elbow.rotation.y = -Math.PI / 2; pump.add(elbow);
  pump.add(pipe(0.045 * R, pz - 0.12 * R - (R + 0.1 * R), partMat, px, yTop, (pz - 0.12 * R + R + 0.1 * R) / 2, 'z'));      // into the spray header
  const spray = nozzle(0.05 * R, 0.1 * R, false); spray.rotation.x = Math.PI / 2; spray.position.set(px, yTop, Math.sqrt(R * R - px * px) - 0.02 * R); pump.add(spray);
  const vY = yS + 0.55 * R;                                                                                                  // discharge valve with its handwheel
  pump.add(box(0.13 * R, 0.1 * R, 0.13 * R, partMat, px, vY, pz));
  pump.add(pipe(0.01 * R, 0.12 * R, steelMat, px, vY, pz - 0.12 * R, 'z'));
  const wheel = mesh(new THREE.TorusGeometry(0.07 * R, 0.01 * R, 8, 24), steelMat, px, vY, pz - 0.18 * R); pump.add(wheel);
  [-0.05, 0.4, 0.85].forEach(f => pump.add(box(0.03 * R, 0.03 * R, pz - R, galvMat, px, mix(yS + 0.6 * R, yTop - 0.3 * R, f), (pz + R) / 2)));   // pipe supports

  // access platform round the back of the column, with a caged ladder up to it
  const yP = SHELL_H / 2 - 0.02 * R, pr = 1.55 * R, a0 = 1.7, aL = TAU - 3.4;
  const deck = new THREE.Group(); body.add(deck);
  deck.add(mesh(new THREE.CylinderGeometry(pr, pr, 0.035 * R, 72, 1, false, a0, aL), galvMat, 0, yP, 0));
  const band = (r, h, y, m) => mesh(new THREE.CylinderGeometry(r, r, h, 72, 1, true, a0, aL), m, 0, y, 0);
  deck.add(band(pr, 0.06 * R, yP + 0.045 * R, yellowMat), band(pr, 0.022 * R, yP + 0.24 * R, yellowMat), band(pr, 0.026 * R, yP + 0.44 * R, yellowMat));
  for (let i = 0; i <= 9; i++) {
    const a = a0 + aL * i / 9;
    deck.add(mesh(cylG(0.016 * R, 0.44 * R, 8), yellowMat, Math.sin(a) * pr, yP + 0.22 * R, Math.cos(a) * pr));          // posts
    const k = box(0.025 * R, 0.025 * R, pr - R, galvMat, Math.sin(a) * (pr + R) / 2, yP - 0.06 * R, Math.cos(a) * (pr + R) / 2); k.rotation.y = a; deck.add(k);   // brackets
  }
  const ladder = rig(-2.75), lz = R + 0.16 * R, lTop = yP + 0.45 * R;
  [-0.09, 0.09].forEach(x => ladder.add(mesh(cylG(0.014 * R, lTop - GROUND, 8), yellowMat, x * R, (lTop + GROUND) / 2, lz)));
  for (let y = GROUND + 0.12 * R; y < yP; y += 0.12 * R) ladder.add(pipe(0.009 * R, 0.18 * R, yellowMat, 0, y, lz, 'x'));
  for (let y = GROUND + 0.9 * R; y < lTop; y += 0.38 * R) ladder.add(mesh(new THREE.CylinderGeometry(0.2 * R, 0.2 * R, 0.016 * R, 24, 1, true, -Math.PI / 2, Math.PI), yellowMat, 0, y, lz));   // cage hoops
  [-1.2, 0, 1.2].forEach(a => ladder.add(mesh(cylG(0.008 * R, lTop - GROUND - 0.9 * R, 6), yellowMat, Math.sin(a) * 0.2 * R, (lTop + GROUND + 0.9 * R) / 2, lz + Math.cos(a) * 0.2 * R)));
  const rigs = [blower, pump, deck, ladder];

  top.position.y = SHELL_H / 2; bottom.position.y = -SHELL_H / 2;
  top.visible = bottom.visible = body.visible = false;
  group.add(top, bottom, body);

  // a soft contact shadow on the ground
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
    uniforms: { uA: { value: 0 } }, transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float uA; varying vec2 vUv; void main(){ float d = length((vUv - 0.5) * 2.0); gl_FragColor = vec4(0.06, 0.09, 0.18, pow(max(0.0, 1.0 - d), 1.8) * uA); }',
  }));
  shadow.renderOrder = -1;   // a flat ellipse facing the camera, just behind the foot of the tank
  scene.add(shadow);

  // heat haze over the weld head
  const HN = 90, hr = new Float32Array(HN * 4);
  for (let i = 0; i < HN * 4; i++) hr[i] = Math.random();
  const hg = new THREE.BufferGeometry();
  hg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(HN * 3), 3));
  hg.setAttribute('aR', new THREE.BufferAttribute(hr, 4));
  const HU = { uHead: { value: new THREE.Vector3() }, uTime: { value: 0 }, uOn: { value: 0 }, uPx: { value: 1 } };
  const haze = new THREE.Points(hg, new THREE.ShaderMaterial({ uniforms: HU, vertexShader: hazeVert, fragmentShader: hazeFrag, transparent: true, depthWrite: false }));
  haze.frustumCulled = false;
  group.add(haze);

  const D = 10;
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.z = D;
  let vw = 1, vh = 1, unit = 1;
  let quality = 1, lastKey = '', slow = 0, hidden = false;
  function resize() {
    vw = innerWidth; vh = innerHeight;
    const dpr = Math.max(0.6, Math.min(devicePixelRatio, 1.5) * quality);
    renderer.setPixelRatio(dpr);
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh; camera.updateProjectionMatrix();
    unit = (2 * D * Math.tan(THREE.MathUtils.degToRad(17.5))) / vh;
    HU.uPx.value = dpr;
    lastKey = '';
  }
  addEventListener('resize', resize);
  resize();
  const toWorld = (x, y, out = new THREE.Vector3()) => out.set((x - vw / 2) * unit, (vh / 2 - y) * unit, 0);

  /* ── scroll → story ──────────────────────────────────── */
  // Welcome scene (intro progress p):
  //   0.03–0.12 the logo becomes a printed sheet · 0.11–0.24 it rolls into a cylinder
  //   0.22–0.32 the seam is welded · 0.30–0.37 heads and fittings form · 0.36–0.50 one turn
  //   0.52–0.60 sets low like a horizon · 0.60–0.88 statement (ui.js) · 0.90–1.00 back to the centre
  const intro = document.querySelector('.intro');
  const thermo = document.querySelector('.mat--thermo');
  const frp = document.querySelector('.mat--frp');
  const thermoBox = thermo.querySelector('.mat__tank'), frpBox = frp.querySelector('.mat__tank');
  const matItems = Array.prototype.slice.call(thermo.querySelectorAll('[data-mat]'));
  const welcomePre = document.querySelector('.welcome__pre');

  const pinned = el => clamp(-el.getBoundingClientRect().top / Math.max(1, el.offsetHeight - vh));
  const arriving = el => clamp(1 - el.getBoundingClientRect().top / vh);
  const raw = () => ({ intro: pinned(intro), thermoIn: arriving(thermo), thermo: pinned(thermo), frpIn: arriving(frp), frp: pinned(frp) });
  let sm = raw(), last = 0, time = 0, matOn = -1;

  const styled = new WeakMap();
  const setStyle = (el, prop, v) => {
    let had = styled.get(el);
    if (!had) styled.set(el, had = {});
    if (had[prop] === v) return;
    had[prop] = v;
    el.style[prop] = v;
  };

  // where the tank stands in a section, and how big: from the CSS box it should fill
  function spot(box, out) {
    const r = box.getBoundingClientRect(), pin = box.closest('.mat__pin').getBoundingClientRect();
    toWorld(r.left + r.width / 2, r.top - pin.top + r.height / 2, out);
    const s = Math.min(r.height / TOTAL_H, r.width / BOX_W) * unit;   // world units per tank unit
    out.y -= BOX_MID * s;                                              // centre the whole system, not the shell
    out.x -= BOX_MIDX * s;
    return s;
  }
  const P = new THREE.Vector3(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), tmp3 = new THREE.Vector3();
  const colA = new THREE.Vector3(), colB = new THREE.Vector3();

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now; time += dt;
    const target = raw(), k = reduced ? 1 : 1 - Math.exp(-dt / 0.09);
    for (const key in sm) sm[key] = mix(sm[key], target[key], k);
    const p = sm.intro;

    // the HTML logo hands over to the identical WebGL one as soon as scrolling starts
    setStyle(welcomePre, 'opacity', (1 - seg(p, 0, 0.03)).toFixed(3));
    setStyle(welcomePre, 'transform', `translateY(${(-seg(p, 0, 0.03) * 30).toFixed(1)}px)`);
    setStyle(logoImg, 'opacity', (1 - seg(p, 0.01, 0.025)).toFixed(3));

    const narrow = vw <= 760, cx = document.documentElement.clientWidth / 2;
    const grow = ease(seg(p, 0.03, 0.12)), bend = ease(seg(p, 0.11, 0.24));
    const weld = seg(p, 0.22, 0.32), heads = ease(seg(p, 0.3, 0.37));
    TU.uSheet.value = ease(seg(p, 0.03, 0.07));
    TU.uGrow.value = grow; TU.uBend.value = bend; TU.uHeads.value = heads; TU.uWeld.value = weld;

    // size: the logo's own width, then the sheet fitting the screen, then the tank fitting it
    const logoW = Math.min(vw * (narrow ? 0.9 : 0.78), 1000) * unit;
    const sheetS = Math.min(vw * (narrow ? 0.92 : 0.8), 1150) * unit / SHEET_W;
    const tankS = Math.min(vh * (narrow ? 0.56 : 0.7) / TOTAL_H, vw * 0.8 / BOX_W) * unit;
    let S = mix(logoW, sheetS, grow);
    const asTank = ease(seg(p, 0.13, 0.36));
    S = mix(S, tankS, asTank);
    toWorld(cx, vh * 0.5, P);
    P.y -= BOX_MID * S * asTank;                       // centre the whole system, stack to ground

    // turn: the seam comes round to the front-right while it is welded, then one full turn
    let turn = SEAM_TURN * ease(seg(p, 0.12, 0.24)) - TAU * ease(seg(p, 0.36, 0.5));

    // set low like a horizon (the top head showing), then back up
    const atH = ease(seg(p, 0.52, 0.6)) * (1 - ease(seg(p, 0.9, 1)));
    // the head spans much of the width, low enough that the stack stays below the statement
    const hS = (narrow ? Math.min(vw * 0.3, vh * 0.17) : Math.min(vw * 0.13, vh * 0.22)) / R * unit;
    S = mix(S, hS, atH);
    toWorld(cx, vh * (narrow ? 0.62 : 0.56), tmp).y -= STACK_TOP * hS;
    P.lerp(tmp, atH);
    turn += atH * 0.25;

    // glide into the thermoplastics section, then across to composites
    const tIn = ease(sm.thermoIn), fIn = ease(sm.frpIn);
    if (tIn > 0) { const s1 = spot(thermoBox, tmp2); P.lerp(tmp2, tIn); S = mix(S, s1, tIn); turn += tIn * (Math.PI - 0.92); }   // the printed logo comes round to face you
    if (fIn > 0) { const s2 = spot(frpBox, tmp3); P.lerp(tmp3, fIn); S = mix(S, s2, fIn); turn -= fIn * 0.7; }

    // thermoplastics: the shell takes on each material in turn, and the ring seams weld
    const mt = clamp(sm.thermo * 1.15) * (MATERIALS.length - 1);
    const i0 = Math.min(MATERIALS.length - 2, Math.floor(mt)), f = ease(clamp((mt - i0 - 0.35) / 0.3));
    colA.set(...MATERIALS[i0].slice(0, 3)); colB.set(...MATERIALS[i0 + 1].slice(0, 3));
    const ff = tIn > 0.5 ? f : 0;
    shell.copy(colA).lerp(colB, ff);
    TU.uRough.value = mix(MATERIALS[i0][3], MATERIALS[i0 + 1][3], ff);
    if (tIn <= 0.5) { shell.set(...MATERIALS[0].slice(0, 3)); TU.uRough.value = MATERIALS[0][3]; }
    const on = tIn > 0.5 && fIn < 0.5 ? Math.round(mt) : -1;
    if (on !== matOn) { matOn = on; matItems.forEach((li, i) => li.classList.toggle('is-on', i === on)); }
    TU.uRing.value = ease(seg(sm.thermoIn, 0.55, 1));
    // composites: glass fibre winds on as the section scrolls
    TU.uWind.value = ease(seg(sm.frp, 0.05, 0.7));

    group.position.copy(P);
    group.scale.setScalar(S);
    group.rotation.y = turn;
    group.rotation.x = atH * 0.12;
    const hv = Math.max(heads, 1e-3);
    top.visible = bottom.visible = body.visible = heads > 0.02;
    top.scale.setScalar(hv); bottom.scale.setScalar(hv);
    rings.forEach(m => m.scale.set(1, hv, 1));
    sideNozzles.forEach(h => h.scale.setScalar(hv));
    tube.scale.setScalar(hv); plate.scale.setScalar(hv);
    rigs.forEach(g => g.scale.setScalar(hv));

    // the weld head and its haze
    HU.uOn.value = weld > 0 && weld < 1 ? Math.sin(Math.PI * weld) : 0;
    HU.uHead.value.set(0, mix(-SHELL_H / 2, SHELL_H / 2, weld), -R * 1.01);
    HU.uTime.value = time;
    haze.visible = HU.uOn.value > 0.01;

    // shadow under the skirt, only once it stands
    const stand = heads * (1 - atH);
    shadow.position.set(P.x + BOX_MIDX * S * (1 - atH), P.y + GROUND * S, P.z - R * S);
    shadow.scale.set(BOX_W * 1.25 * S, R * 0.6 * S, 1);
    shadow.material.uniforms.uA.value = 0.32 * stand;
    shadow.visible = stand > 0.01;

    // draw only when something changed; past the composites section there is nothing left to draw
    let settled = true;
    for (const key in sm) if (Math.abs(sm[key] - target[key]) > 5e-4) settled = false;
    const gone = settled && frp.getBoundingClientRect().bottom < 1;
    if (gone !== hidden) { hidden = gone; canvas.style.visibility = gone ? 'hidden' : ''; }
    if (gone) { lastKey = ''; return; }
    const key = [vw, vh, P.x, P.y, S, turn, shell.x, shell.y].map(v => v.toFixed(4)).join();
    if (settled && !haze.visible && key === lastKey) return;
    lastKey = key;
    renderer.render(scene, camera);

    if (!reduced && quality > 0.55 && dt > 0) {
      slow = dt > 1 / 38 ? slow + dt : Math.max(0, slow - dt * 0.5);
      if (slow > 1.2) { slow = 0; quality *= 0.8; resize(); }
    }
  }
  document.documentElement.classList.add('webgl-ready');
  requestAnimationFrame(frame);
}

// start last, once every constant above is defined
if (renderer) init().catch(err => { console.error(err); document.documentElement.classList.add('no-webgl'); });
