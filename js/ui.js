/* Page interactions: the statement's word reveal, the product portfolio ring,
   the work gallery strip, and the process deck viewer. */
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

  /* ── product portfolio: rendered equipment on a ring that turns with the scroll ── */
  var port = document.querySelector('.port');
  if (port) (function () {
    var items = Array.prototype.slice.call(port.querySelectorAll('[data-port-item]'));
    var dets = Array.prototype.slice.call(port.querySelectorAll('.pdet'));
    var gos = Array.prototype.slice.call(port.querySelectorAll('[data-port-go]'));
    var stage = port.querySelector('.port__stage');
    var n = items.length, step = 360 / n, cur = 0, goal = 0, on = -1, raf = 0;
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // 0 → 1 through the pinned section; the ring settles on each item for a moment
    var progress = function () {
      var r = port.getBoundingClientRect(), span = port.offsetHeight - window.innerHeight;
      return clamp(-r.top / Math.max(1, span), 0, 1);
    };
    var target = function () {
      var t = progress() * (n - 1), i = Math.floor(t), f = t - i;
      f = f < 0.3 ? 0 : f > 0.7 ? 1 : (f - 0.3) / 0.4;   // hold, then turn
      return i + f * f * (3 - 2 * f);
    };
    var draw = function () {
      var w = stage.offsetWidth, rad = Math.min(w * 0.62, 560), lift = Math.min(w * 0.08, 70);
      items.forEach(function (it, i) {
        var d = i - cur;
        d -= n * Math.round(d / n);                                   // shortest way round
        var a = d * step * Math.PI / 180, z = (Math.cos(a) - 1) * rad;
        var x = Math.sin(a) * rad, y = (1 - Math.cos(a)) * -lift;
        var front = Math.max(0, Math.cos(a));
        it.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,' + z.toFixed(1) + 'px) scale(' + (0.42 + 0.58 * Math.pow(front, 3)).toFixed(3) + ')';
        it.style.opacity = String(Math.cos(a) < 0 ? 0 : Math.min(1, 0.15 + Math.pow(front, 4)).toFixed(3));
        it.style.zIndex = String(Math.round(100 + z));
        it.style.filter = 'saturate(' + (0.4 + 0.6 * front).toFixed(2) + ') brightness(' + (0.9 + 0.1 * front).toFixed(2) + ')';
      });
      var a2 = Math.round(cur);
      if (a2 !== on) {
        on = a2;
        dets.forEach(function (d, i) { d.classList.toggle('is-active', i === on); });
        gos.forEach(function (g, i) { g.classList.toggle('is-on', i === on); g.setAttribute('aria-current', i === on ? 'true' : 'false'); });
      }
    };
    var tick = function () {
      raf = 0;
      cur += (goal - cur) * (reducedMotion ? 1 : 0.14);
      if (Math.abs(goal - cur) < 0.001) cur = goal;
      draw();
      if (cur !== goal) raf = requestAnimationFrame(tick);
    };
    var update = function () { goal = target(); if (!raf) raf = requestAnimationFrame(tick); };
    // the index scrolls the page to where that item faces you
    gos.forEach(function (g, i) {
      g.addEventListener('click', function () {
        var span = port.offsetHeight - window.innerHeight;
        var y = port.getBoundingClientRect().top + window.scrollY + span * (i / (n - 1));
        window.scrollTo({ top: y, behavior: reducedMotion ? 'auto' : 'smooth' });
      });
    });
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', function () { draw(); });
    goal = cur = target(); draw();
  })();

  /* ── work gallery: a sideways-scrolling strip of real work ── */
  var gal = document.querySelector('[data-gal]');
  if (gal) (function () {
    var range = gal.closest('.range');
    var cards = Array.prototype.slice.call(gal.querySelectorAll('.wcard'));
    var count = range.querySelector('[data-count]'), bar = range.querySelector('[data-gal-bar]');
    var pad = function (v) { return (v < 10 ? '0' : '') + v; };
    var stepW = function () { return cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : gal.clientWidth; };
    var at = function () { return clamp(Math.round(gal.scrollLeft / stepW()), 0, cards.length - 1); };
    var sync = function () {
      var max = gal.scrollWidth - gal.clientWidth;
      var i = gal.scrollLeft >= max - 4 ? cards.length - 1 : at();
      count.textContent = pad(i + 1) + ' / ' + pad(cards.length);
      if (bar) {
        var vis = gal.clientWidth / gal.scrollWidth;
        bar.style.width = (vis * 100).toFixed(2) + '%';
        bar.style.transform = 'translateX(' + (max > 0 ? gal.scrollLeft / max * (1 / vis - 1) * 100 : 0).toFixed(2) + '%)';
      }
    };
    var go = function (dir) { gal.scrollBy({ left: dir * stepW(), behavior: 'smooth' }); };
    range.querySelector('[data-prev]').addEventListener('click', function () { go(-1); });
    range.querySelector('[data-next]').addEventListener('click', function () { go(1); });
    gal.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { go(1); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { go(-1); e.preventDefault(); }
    });
    gal.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);

    // drag with the mouse (touch scrolls natively)
    var sx = null, sl = 0, dragged = false;
    gal.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('a')) return;
      sx = e.clientX; sl = gal.scrollLeft; dragged = false;
    });
    window.addEventListener('pointermove', function (e) {
      if (sx === null) return;
      var dx = e.clientX - sx;
      if (!dragged && Math.abs(dx) > 6) { dragged = true; gal.classList.add('is-dragging'); }
      if (dragged) gal.scrollLeft = sl - dx;
    });
    window.addEventListener('pointerup', function () {
      if (sx === null) return;
      sx = null;
      if (dragged) {
        gal.classList.remove('is-dragging');
        gal.scrollTo({ left: at() * stepW(), behavior: 'smooth' });   // settle on a card
      }
    });
    gal.addEventListener('click', function (e) { if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; } }, true);

    // "Get a quote" ticks that project type in the form at the bottom
    gal.querySelectorAll('[data-sample]').forEach(function (a) {
      a.addEventListener('click', function () {
        var box = document.querySelector('.callback input[value="' + a.dataset.sample + '"]');
        if (box) box.checked = true;
      });
    });
    sync();
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
