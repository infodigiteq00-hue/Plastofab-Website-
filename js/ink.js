/* ═══════════════════════════════════════════════════════════
   Contact background: brand-coloured liquid billowing through water.

   A small fluid simulation on the GPU (stable fluids: advect, add
   vorticity, project). Navy is let in from the top-left corner,
   then lime from the top. Ink is heavier than water,
   so it sinks, curls and mushrooms as it spreads. The picture is
   light passing through the two inks, shaded so the billows have depth.

   It starts as the section arrives and runs only while the section is
   on screen. With reduced motion, or without WebGL 2, a still frame is
   shown instead (assets/ink-still.webp).
   ═══════════════════════════════════════════════════════════ */
(function () {
  const sec = document.querySelector('.contact');
  const canvas = sec && sec.querySelector('.contact__ink');
  if (!canvas) return;
  const still = () => sec.classList.add('ink-still');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return still();

  const DT = 1 / 60;
  // ink colours at full strength; thinner ink lets more light through
  const BLUE = [34, 58, 128], GREEN = [150, 196, 16];   // brand navy and lime
  const absorb = c => c.map(v => -Math.log(v / 255));

  let gl, P, quad, sim, dye, vel, prs, div, curl, ready = false, failed = false;
  let t = 0, acc = 0, last = 0, raf = 0, running = false, aspect = 1, rng;

  /* ── GPU plumbing ─────────────────────────────────────── */
  const VS = `#version 300 es
    in vec2 aPos; uniform vec2 uTexel;
    out vec2 vUv, vL, vR, vT, vB;
    void main() {
      vUv = aPos * 0.5 + 0.5;
      vL = vUv - vec2(uTexel.x, 0.0); vR = vUv + vec2(uTexel.x, 0.0);
      vT = vUv + vec2(0.0, uTexel.y); vB = vUv - vec2(0.0, uTexel.y);
      gl_Position = vec4(aPos, 0.0, 1.0);
    }`;
  const FS = body => `#version 300 es
    precision highp float; precision highp sampler2D;
    in vec2 vUv, vL, vR, vT, vB; out vec4 o;
    ${body}`;
  const SHADERS = {
    // move a field along the flow; uKeep < 1 lets it fade
    advect: FS(`uniform sampler2D uVel, uSrc; uniform vec2 uVelTexel; uniform float uDt, uKeep, uFloor;
      void main() {
        vec2 c = vUv - uDt * texture(uVel, vUv).xy * uVelTexel;
        // ink that reaches the bottom drifts out of view instead of pooling there
        o = textureLod(uSrc, c, 0.0) * uKeep * mix(uFloor, 1.0, smoothstep(0.0, 0.18, vUv.y));
      }`),
    curl: FS(`uniform sampler2D uVel;
      void main() {
        o = vec4(0.5 * (texture(uVel, vR).y - texture(uVel, vL).y - texture(uVel, vT).x + texture(uVel, vB).x), 0.0, 0.0, 1.0);
      }`),
    // vorticity confinement keeps the small curls alive; ink weight pulls it down
    force: FS(`uniform sampler2D uVel, uCurl, uDye; uniform float uDt, uCurlK, uGrav;
      void main() {
        float L = texture(uCurl, vL).x, R = texture(uCurl, vR).x, T = texture(uCurl, vT).x, B = texture(uCurl, vB).x, C = texture(uCurl, vUv).x;
        vec2 f = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
        f = f / (length(f) + 1e-4) * uCurlK * C; f.y = -f.y;
        vec2 v = texture(uVel, vUv).xy + f * uDt;
        vec4 d = textureLod(uDye, vUv, 2.0);   // the ink's weight, averaged over this cell
        v.y -= uGrav * (d.r + d.g) * uDt;
        o = vec4(clamp(v, -900.0, 900.0), 0.0, 1.0);
      }`),
    divergence: FS(`uniform sampler2D uVel;
      void main() {
        vec2 C = texture(uVel, vUv).xy;
        float L = vL.x < 0.0 ? -C.x : texture(uVel, vL).x, R = vR.x > 1.0 ? -C.x : texture(uVel, vR).x;
        float T = vT.y > 1.0 ? -C.y : texture(uVel, vT).y, B = vB.y < 0.0 ? -C.y : texture(uVel, vB).y;
        o = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
      }`),
    scale: FS(`uniform sampler2D uSrc; uniform float uK; void main() { o = texture(uSrc, vUv) * uK; }`),
    pressure: FS(`uniform sampler2D uP, uDiv;
      void main() {
        o = vec4(0.25 * (texture(uP, vL).x + texture(uP, vR).x + texture(uP, vT).x + texture(uP, vB).x - texture(uDiv, vUv).x), 0.0, 0.0, 1.0);
      }`),
    project: FS(`uniform sampler2D uP, uVel;
      void main() {
        vec2 g = 0.5 * vec2(texture(uP, vR).x - texture(uP, vL).x, texture(uP, vT).x - texture(uP, vB).x);
        o = vec4(texture(uVel, vUv).xy - g, 0.0, 1.0);
      }`),
    // ink goes in lumpy, never as a smooth blob: the flow stretches the lumps into billows
    splat: FS(`uniform sampler2D uSrc; uniform vec2 uPoint; uniform vec3 uVal; uniform float uRadius, uAspect, uLumps, uSeed;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vnoise(vec2 p) {
        vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      void main() {
        vec2 p = vUv - uPoint; p.x *= uAspect;
        vec2 q = vUv * vec2(uAspect, 1.0) * 55.0 + uSeed;
        float lumps = 0.6 * vnoise(q) + 0.4 * vnoise(q * 2.3 + 17.0);
        float k = mix(1.0, smoothstep(0.25, 0.85, lumps) * 1.8, uLumps);
        o = vec4(textureLod(uSrc, vUv, 0.0).xyz + exp(-dot(p, p) / uRadius) * uVal * k, 1.0);
      }`),
    // light through the inks, on a pale tank; billows lit from the top-left
    display: FS(`uniform sampler2D uDye; uniform vec3 uKB, uKG; uniform vec2 uDyeTexel;
      // thickness, softened (a blurred mip level), for the relief of the billows
      float thick(vec2 uv) { vec2 d = textureLod(uDye, uv, 2.5).xy; return d.x + d.y; }
      void main() {
        // dense ink saturates instead of going black, so Green 36 stays bright
        vec2 d = max(textureLod(uDye, vUv, 0.0).xy, 0.0);
        d = vec2(2.0, 1.6) * (1.0 - exp(-d / vec2(2.0, 1.6)));
        vec3 ink = exp(-(uKB * d.x + uKG * d.y));
        vec2 e = uDyeTexel * 5.0;
        vec3 n = normalize(vec3(thick(vUv - vec2(e.x, 0.0)) - thick(vUv + vec2(e.x, 0.0)),
                                thick(vUv - vec2(0.0, e.y)) - thick(vUv + vec2(0.0, e.y)), 0.5));
        vec3 L = normalize(vec3(-0.5, 0.6, 0.62));
        float shade = clamp(1.0 + 0.5 * dot(n.xy, L.xy), 0.84, 1.2);   // flat water stays at 1
        vec2 q = vUv - 0.5;
        vec3 tank = mix(vec3(0.972, 0.980, 0.988), vec3(0.905, 0.928, 0.942), smoothstep(0.75, 0.05, length(q * vec2(1.1, 1.3))));
        vec3 col = tank * ink;
        col = mix(col, clamp(col * shade, 0.0, 1.0), smoothstep(0.02, 0.4, d.x + d.y));
        o = vec4(col, 1.0);
      }`),
  };

  function program(fs) {
    const make = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, make(gl.VERTEX_SHADER, VS)); gl.attachShader(p, make(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'aPos'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {};
    for (let i = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i--;) {
      const name = gl.getActiveUniform(p, i).name;
      u[name] = gl.getUniformLocation(p, name);
    }
    return { p, u };
  }

  function target(w, h) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('no float targets');
    gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex, fb, w, h, texel: [1 / w, 1 / h] };
  }
  const pair = (w, h) => {
    const a = target(w, h), b = target(w, h);
    return { get read() { return a.cur ? b : a; }, get write() { return a.cur ? a : b; }, swap() { a.cur = !a.cur; }, w, h, texel: a.texel };
  };

  let unit = 0;
  const bind = tex => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); return unit++; };
  function pass(prog, out, uniforms, texel) {
    gl.useProgram(prog.p);
    unit = 0;
    gl.uniform2fv(prog.u.uTexel, texel || out.texel);
    for (const k in uniforms) {
      const v = uniforms[k], loc = prog.u[k];
      if (loc == null) continue;
      if (v && v.tex) gl.uniform1i(loc, bind(v.tex));
      else if (typeof v === 'number') gl.uniform1f(loc, v);
      else if (v.length === 2) gl.uniform2fv(loc, v);
      else gl.uniform3fv(loc, v);
    }
    if (out.fb !== undefined) { gl.bindFramebuffer(gl.FRAMEBUFFER, out.fb); gl.viewport(0, 0, out.w, out.h); }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  const into = (pr, prog, uniforms) => { pass(prog, pr.write, uniforms, pr.texel); pr.swap(); };

  /* ── set-up ───────────────────────────────────────────── */
  function init() {
    gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false });
    if (!gl || !gl.getExtension('EXT_color_buffer_float')) throw new Error('webgl2 float targets unavailable');
    P = {};
    for (const k in SHADERS) P[k] = program(SHADERS[k]);
    quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.disable(gl.BLEND);
    build();
    ready = true;
  }

  // the simulation grid follows the section's shape: 256 cells (ink 768) along its long side
  function build() {
    const r = sec.getBoundingClientRect();
    aspect = Math.max(0.2, r.width / Math.max(1, r.height));
    const size = long => aspect >= 1 ? [long, Math.round(long / aspect)] : [Math.round(long * aspect), long];
    const [sw, sh] = size(256), [dw, dh] = size(768);
    sim = { w: sw, h: sh, texel: [1 / sw, 1 / sh] };
    vel = pair(sw, sh); prs = pair(sw, sh);
    div = target(sw, sh); curl = target(sw, sh);
    dye = pair(dw, dh);
    for (const tx of [dye.read, dye.write]) {
      gl.bindTexture(gl.TEXTURE_2D, tx.tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);
    }
    t = 0; acc = 0;
    let seed = 7;
    rng = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    size_();
  }
  function size_() {
    const r = sec.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 1);
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
  }

  /* ── ink sources ──────────────────────────────────────── */
  // ink amounts are added per step; velocities are in grid cells per second
  function splat(x, y, vx, vy, blue, green, radius) {
    const rad = radius / 100;
    into(vel, P.splat, { uSrc: vel.read, uPoint: [x, y], uVal: [vx, vy, 0], uRadius: rad, uAspect: aspect, uLumps: 0 });
    into(dye, P.splat, { uSrc: dye.read, uPoint: [x, y], uVal: [blue, green, 0], uRadius: rad, uAspect: aspect, uLumps: 1, uSeed: rng() * 500 });
  }
  let nextPuff = 3.4, puffBlue = true;
  function sources() {
    const tall = aspect < 0.9, s = Math.min(sim.w, sim.h) / 110;
    const jet = (x, y, a, speed, blue, green) => splat(x, y, Math.cos(a) * speed * s, Math.sin(a) * speed * s, blue, green, 0.22);
    const env = (from, to) => Math.min(1, (t - from) * 4) * Math.min(1, (to - t) * 4);   // ease each pour in and out
    // blue pours in from the top-left corner, wavering as it comes
    if (t < 1.9) jet(0.03, 0.97, -0.45 + 0.25 * Math.sin(t * 3.7), 150, 0.24 * env(0, 1.9), 0);
    // then Green 36 from the top-right, folding down into the blue
    if (t > 0.9 && t < 2.9) jet(0.97, 0.97, Math.PI + 0.45 + 0.25 * Math.sin(t * 3.1 + 1), 150, 0, 0.24 * env(0.9, 2.9));
    // afterwards a fresh plume drops in now and then, so the water never goes still
    if (t > nextPuff) {
      puffBlue = !puffBlue;
      const x = 0.06 + rng() * 0.88, y = tall ? 0.3 + rng() * 0.68 : 0.97;
      const a = -Math.PI / 2 + (rng() - 0.5) * 0.9;
      splat(x, y, Math.cos(a) * 110 * s, Math.sin(a) * 110 * s, puffBlue ? 2.1 : 0, puffBlue ? 0 : 2.1, 0.2);
      nextPuff = t + 2.2 + rng() * 1.8;
    }
  }

  /* ── one step of the water ────────────────────────────── */
  function step() {
    sources();
    pass(P.curl, curl, { uVel: vel.read }, sim.texel);
    into(vel, P.force, { uVel: vel.read, uCurl: curl, uDye: dye.read, uDt: DT, uCurlK: 10, uGrav: 34 });
    pass(P.divergence, div, { uVel: vel.read }, sim.texel);
    into(prs, P.scale, { uSrc: prs.read, uK: 0.8 });
    for (let i = 0; i < 18; i++) into(prs, P.pressure, { uP: prs.read, uDiv: div });
    into(vel, P.project, { uP: prs.read, uVel: vel.read });
    into(vel, P.advect, { uVel: vel.read, uSrc: vel.read, uVelTexel: sim.texel, uDt: DT, uKeep: Math.exp(-0.7 * DT), uFloor: 1 });
    into(dye, P.advect, { uVel: vel.read, uSrc: dye.read, uVelTexel: sim.texel, uDt: DT, uKeep: Math.exp(-0.035 * DT), uFloor: 0.985 });
    t += DT;
  }
  function draw() {
    gl.bindTexture(gl.TEXTURE_2D, dye.read.tex);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    pass(P.display, { w: canvas.width, h: canvas.height }, { uDye: dye.read, uKB: absorb(BLUE), uKG: absorb(GREEN), uDyeTexel: dye.texel }, dye.texel);
  }

  /* ── run while on screen ──────────────────────────────── */
  function frame(now) {
    raf = requestAnimationFrame(frame);
    acc += last ? Math.min(0.05, (now - last) / 1000) : DT;
    last = now;
    let n = 0;
    while (acc >= DT && n < 2) { step(); acc -= DT; n++; }   // a slow machine slows the water down, it never jumps
    if (acc > DT) acc = 0;
    if (n) draw();
  }
  function start() {
    if (running || failed) return;
    if (!ready) {
      try { init(); draw(); } catch (e) { failed = true; return still(); }
      sec.classList.add('ink-live');
    }
    running = true; last = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() { running = false; cancelAnimationFrame(raf); }

  new IntersectionObserver(es => { es[0].isIntersecting ? start() : stop(); }, { rootMargin: '120px 0px' }).observe(sec);
  let rt;
  addEventListener('resize', () => {
    if (!ready) return;
    clearTimeout(rt);
    rt = setTimeout(() => {
      const r = sec.getBoundingClientRect(), a = r.width / Math.max(1, r.height);
      if (Math.abs(a / aspect - 1) > 0.25) build(); else size_();   // a new shape needs a new grid
      draw();
    }, 150);
  });

  // headless tests step the water directly: ?inkdebug
  if (/[?&]inkdebug\b/.test(location.search)) window.__ink = { run: s => { start(); stop(); for (let i = 0; i < s * 60; i++) step(); draw(); return t; } };
})();
