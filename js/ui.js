/* Page interactions: the statement's word reveal, the product
   coverflow with flip cards, and the certificate viewer. */
(function () {
  'use strict';
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  /* ── statement: words rise in, one after another, with scroll ── */
  var statement = document.querySelector('.statement');
  var text = statement && statement.querySelector('[data-words]');
  if (text) (function () {   // own scope, so names never collide with other features
    var words = [];
    var wrap = function (str, em) {
      var frag = document.createDocumentFragment();
      str.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        var outer = document.createElement('span'), inner = document.createElement('span');
        outer.className = 'w'; inner.textContent = part;
        if (em) inner.className = 'is-em';
        outer.appendChild(inner); frag.appendChild(outer); words.push(inner);
      });
      return frag;
    };
    Array.prototype.slice.call(text.childNodes).forEach(function (node) {
      var frag = wrap(node.textContent, node.nodeType === 1);
      text.replaceChild(frag, node);
    });
    text.setAttribute('aria-label', text.textContent);
    var eyebrow = statement.querySelector('.eyebrow'), sub = statement.querySelector('.statement__sub');
    var intro = document.querySelector('.intro');
    var seg = function (v, a, b) { return clamp((v - a) / (b - a), 0, 1); };
    // timings match the welcome scene in pigment-globe.js: the words rise while the
    // Earth sits on the horizon (0.60 → 0.80), then lift away as it comes back up
    var reveal = function () {
      if (document.documentElement.classList.contains('no-webgl')) return;   // fallback CSS shows it plainly
      var travel = Math.max(1, intro.offsetHeight - window.innerHeight);
      var p = clamp(-intro.getBoundingClientRect().top / travel, 0, 1);
      words.forEach(function (w, i) {
        var start = 0.6 + (i / words.length) * 0.15;
        var r = seg(p, start, start + 0.05);
        r = r * r * (3 - 2 * r);
        w.style.transform = 'translateY(' + ((1 - r) * 105).toFixed(1) + '%)';
        w.style.opacity = r.toFixed(3);
      });
      eyebrow.style.opacity = seg(p, 0.58, 0.62).toFixed(3);
      sub.style.opacity = seg(p, 0.78, 0.83).toFixed(3);
      var out = seg(p, 0.88, 0.93);
      statement.style.opacity = (1 - out).toFixed(3);
      statement.style.transform = 'translateY(' + (-out * 60).toFixed(1) + 'px)';
    };
    window.addEventListener('scroll', reveal, { passive: true });
    window.addEventListener('resize', reveal);
    reveal();
  })();

  /* ── scroll-down marker: fades out as soon as the visitor starts scrolling ── */
  var hint = document.querySelector('.intro__hint');
  if (hint) (function () {   // own scope, so names never collide with other features
    var fadeHint = function () {
      var t = clamp(window.scrollY / (window.innerHeight * 0.2), 0, 1);
      hint.style.opacity = (1 - t).toFixed(3);
    };
    window.addEventListener('scroll', fadeHint, { passive: true });
    fadeHint();
  })();

  /* ── the range: coverflow + flip cards ─────────────────── */
  var range = document.querySelector('.range');
  if (range) (function () {   // own scope, so names never collide with other features
    var stage = range.querySelector('.range__stage');
    var cards = Array.prototype.slice.call(range.querySelectorAll('.pcard'));
    var count = range.querySelector('[data-count]');
    var n = cards.length;                                 // exactly 7 cards, no loop
    var active = Math.max(0, cards.findIndex(function (c) { return c.hasAttribute('data-start'); }));   // CPC in the middle: 3 each side
    var pad = function (v) { return (v < 10 ? '0' : '') + v; };

    var layout = function () {
      var w = cards[0].offsetWidth, narrow = window.innerWidth < 700;
      cards.forEach(function (card, i) {
        var o = i - active, a = Math.abs(o);
        var x = a === 0 ? 0 : Math.sign(o) * (w * (narrow ? 0.78 : 0.74) + (a - 1) * w * (narrow ? 0.36 : 0.38));
        var ry = a === 0 ? 0 : -Math.sign(o) * (10 + a * 6);
        var sc = 1 - a * 0.08;
        card.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,' + (-a * 130) + 'px) rotateY(' + ry + 'deg) scale(' + sc.toFixed(2) + ')';
        card.style.opacity = String(a > 3 ? 0 : a === 3 ? 0.5 : a === 2 ? 0.85 : 1);
        card.style.zIndex = String(20 - a);
        card.style.pointerEvents = a > 3 ? 'none' : '';
        card.setAttribute('aria-hidden', String(a > 3));
        card.classList.toggle('is-active', o === 0);
        if (o !== 0) card.classList.remove('is-flipped');
      });
      count.textContent = pad(active + 1) + ' / ' + pad(n);
    };
    var go = function (i) { active = clamp(i, 0, n - 1); layout(); };
    range.querySelector('[data-prev]').addEventListener('click', function () { go(active - 1); });
    range.querySelector('[data-next]').addEventListener('click', function () { go(active + 1); });

    // drag / swipe to browse
    var startX = null, moved = false;
    stage.addEventListener('pointerdown', function (e) { startX = e.clientX; moved = false; });
    window.addEventListener('pointermove', function (e) {
      if (startX === null) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 8) { moved = true; stage.classList.add('is-dragging'); }
      if (Math.abs(dx) > 70) { go(active + (dx < 0 ? 1 : -1)); startX = e.clientX; }
    });
    window.addEventListener('pointerup', function () { startX = null; stage.classList.remove('is-dragging'); });

    // click a side card to bring it forward; tap the front card to flip it (touch screens)
    cards.forEach(function (card, i) {
      card.tabIndex = 0;
      card.addEventListener('click', function (e) {
        if (moved || e.target.closest('a')) return;
        if (i !== active) { go(i); restart(); return; }
        card.classList.toggle('is-flipped');
      });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (i !== active) go(i); else card.classList.toggle('is-flipped'); }
      });
    });
    range.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { go(active + 1); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { go(active - 1); e.preventDefault(); }
    });

    // "Request a sample" ticks that product in the call-back form
    range.querySelectorAll('[data-sample]').forEach(function (a) {
      a.addEventListener('click', function () {
        var box = document.querySelector('.callback input[value="' + a.dataset.sample + '"]');
        if (box) box.checked = true;
      });
    });

    // advance on its own while on screen; wait while a card is hovered, flipped or dragged
    var onScreen = false, hoverCard = false, timer = 0, dir = 1;
    stage.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') hoverCard = true; });
    stage.addEventListener('pointerleave', function () { hoverCard = false; });
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // after a click, give the chosen card its full time before moving on
    var restart = function () { if (onScreen && !reducedMotion) { clearInterval(timer); timer = setInterval(advance, 3500); } };
    var advance = function () {
      if (!onScreen || hoverCard || startX !== null || range.querySelector('.pcard.is-flipped')) return;
      if (active + dir < 0 || active + dir > n - 1) dir = -dir;   // glide to one end, then back
      go(active + dir);
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        var was = onScreen;
        onScreen = es[0].isIntersecting;
        // restart the clock when it comes into view, so the first card always gets its full time
        if (onScreen && !was && !reducedMotion) { clearInterval(timer); timer = setInterval(advance, 3500); }
      }, { threshold: 0.35 }).observe(stage);
    }

    window.addEventListener('resize', layout);
    layout();
  })();

  /* ── certificate viewer ────────────────────────────────── */
  var viewer = document.querySelector('[data-viewer]');
  var openViewer = function () {};
  if (viewer && viewer.showModal) (function () {   // own scope, so names never collide with other features
    var vImg = viewer.querySelector('[data-viewer-img]');
    var vTitle = viewer.querySelector('[data-viewer-title]');
    var vMeta = viewer.querySelector('[data-viewer-meta]');
    openViewer = function (el) {
      vImg.src = el.dataset.src;
      vImg.alt = el.dataset.title;
      vTitle.textContent = el.dataset.title;
      vMeta.textContent = el.dataset.meta;
      viewer.showModal();
    };
    document.querySelectorAll('[data-cert]').forEach(function (btn) {
      btn.addEventListener('click', function () { openViewer(btn); });
    });
    viewer.querySelector('[data-close]').addEventListener('click', function () { viewer.close(); });
    viewer.addEventListener('click', function (e) { if (e.target === viewer) viewer.close(); });   // backdrop
  })();

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ease = function (t) { return t * t * (3 - 2 * t); };
  var seg2 = function (v, a, b) { return clamp((v - a) / (b - a), 0, 1); };

  /* ── certifications: a 3D deck, dealt by scroll ────────── */
  var certs = document.querySelector('.certs');
  if (certs) (function () {   // own scope, so names never collide with other features
    var stage = certs.querySelector('.certs__stage');
    var sheets = Array.prototype.slice.call(certs.querySelectorAll('.sheet'));
    var dets = Array.prototype.slice.call(certs.querySelectorAll('.cdet'));
    var steps = Array.prototype.slice.call(certs.querySelectorAll('[data-goto]'));
    var n = sheets.length, cur = 0, goal = 0, shown = -1, frame = 0;
    var tx = 0, ty = 0, gtx = 0, gty = 0;                    // pointer tilt, eased

    var travel = function () { return Math.max(1, certs.offsetHeight - window.innerHeight); };
    // each certificate holds still for a while, then the next one is dealt
    var fromScroll = function () {
      var p = clamp(-certs.getBoundingClientRect().top / travel(), 0, 1);
      var t = p * (n - 1), i = Math.floor(t);
      return Math.min(n - 1, i + ease(seg2(t - i, 0.25, 0.75)));
    };

    var render = function () {
      sheets.forEach(function (el, i) {
        var o = i - cur, tr, op = 1, z;
        var near = Math.max(0, 1 - Math.abs(o));              // how much this is the front card
        var tilt = 'rotateX(' + (-ty * 9 * near).toFixed(2) + 'deg) rotateY(' + (tx * 12 * near).toFixed(2) + 'deg) ';
        if (o >= 0) {                                         // waiting in the stack behind
          var b = Math.min(o, 3.2);
          tr = 'translate3d(' + (b * 9).toFixed(2) + '%,' + (-b * 4).toFixed(2) + '%,' + (-b * 150).toFixed(1) + 'px) ' +
               tilt + 'rotateY(' + (-12 - b * 3).toFixed(2) + 'deg) rotateZ(' + (b * 3).toFixed(2) + 'deg)';
          op = o > 3 ? Math.max(0, 1 - (o - 3) * 3) : 1;
          z = 100 - Math.round(o * 10);
        } else {                                              // lifted off the top of the deck and away, within its own column
          tr = 'translate3d(' + (-o * 14).toFixed(2) + '%,' + (o * 78).toFixed(2) + '%,' + (-o * 140).toFixed(1) + 'px) ' +
               tilt + 'rotateX(' + (-o * 28).toFixed(2) + 'deg) rotateY(' + (-12).toFixed(2) + 'deg) rotateZ(' + (-o * 9).toFixed(2) + 'deg)';
          op = Math.max(0, 1 + o * 1.3);
          z = 120;
        }
        el.style.transform = tr;
        el.style.opacity = op.toFixed(3);
        el.style.zIndex = String(z);
        el.style.visibility = op <= 0.01 ? 'hidden' : '';
        el.style.setProperty('--fx', (50 + o * 70 + tx * 35).toFixed(1) + '%');
        el.style.setProperty('--fy', (50 + ty * 35).toFixed(1) + '%');
        el.style.setProperty('--gx', (50 + tx * 45).toFixed(1) + '%');
        el.style.setProperty('--gy', (35 + ty * 45).toFixed(1) + '%');
        el.tabIndex = Math.round(cur) === i ? 0 : -1;
      });
      var active = Math.round(cur);
      if (active !== shown) {
        shown = active;
        dets.forEach(function (d, i) { d.classList.toggle('is-active', i === active); });
        steps.forEach(function (b, i) { b.classList.toggle('is-active', i === active); });
      }
      steps.forEach(function (b, i) { b.style.setProperty('--fill', clamp(cur - i + 1, 0, 1).toFixed(3)); });
    };

    var tick = function () {
      frame = 0;
      var k = reduced ? 1 : 0.14;
      cur += (goal - cur) * k; tx += (gtx - tx) * 0.12; ty += (gty - ty) * 0.12;
      if (Math.abs(goal - cur) < 0.0005) cur = goal;
      render();
      if (cur !== goal || Math.abs(gtx - tx) > 0.001 || Math.abs(gty - ty) > 0.001) frame = requestAnimationFrame(tick);
    };
    var kick = function () { if (!frame) frame = requestAnimationFrame(tick); };
    var onScroll = function () { goal = fromScroll(); kick(); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    stage.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var r = stage.getBoundingClientRect();
      gtx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      gty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      kick();
    });
    stage.addEventListener('pointerleave', function () { gtx = gty = 0; kick(); });

    var goTo = function (i) {
      var top = certs.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: top + travel() * (i / (n - 1)) + 1, behavior: reduced ? 'auto' : 'smooth' });
    };
    sheets.forEach(function (el, i) {
      el.addEventListener('click', function () { if (i === Math.round(cur)) openViewer(el); else goTo(i); });
    });
    steps.forEach(function (b) { b.addEventListener('click', function () { goTo(+b.dataset.goto); }); });
    var viewBtn = certs.querySelector('[data-view-active]');
    if (viewBtn) viewBtn.addEventListener('click', function () { openViewer(sheets[Math.round(goal)]); });

    onScroll();
    cur = goal; render();
  })();

  /* ── tilt + foil on the policy and award cards ─────────── */
  document.querySelectorAll('.tilt').forEach(function (card) {
    card.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.style.transform = 'perspective(700px) rotateX(' + ((0.5 - y) * 10).toFixed(2) + 'deg) rotateY(' + ((x - 0.5) * 12).toFixed(2) + 'deg) translateY(-3px)';
      card.style.setProperty('--fx', (x * 100).toFixed(1) + '%');
      card.style.setProperty('--fy', (y * 100).toFixed(1) + '%');
    });
    card.addEventListener('pointerleave', function () { card.style.transform = ''; });
  });

  /* ── figures count up when they come into view ─────────── */
  var counters = Array.prototype.slice.call(document.querySelectorAll('[data-countup]'));
  if (counters.length && 'IntersectionObserver' in window && !reduced) (function () {   // own scope, so names never collide with other features
    var show = function (el, v) { el.textContent = (el.dataset.prefix || '') + v + (el.dataset.suffix || ''); };
    var io2 = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io2.unobserve(e.target);
        var el = e.target, end = +el.dataset.countup, start = end > 1000 ? end - 40 : 0, t0 = performance.now();
        var step = function (now) {
          var t = clamp((now - t0) / 1400, 0, 1), k = 1 - Math.pow(1 - t, 3);
          show(el, Math.round(start + (end - start) * k));
          if (t < 1) requestAnimationFrame(step);
        };
        show(el, start);
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { io2.observe(el); });
  })();
  // the contact section's ink background lives in js/ink.js
})();
