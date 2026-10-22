/* Helpers shared by the inner pages:
     [data-count-to]   numbers that count up when they come into view
     [data-lightbox]   photo albums that open in a full-screen viewer
     form[data-mailto] forms that open the visitor's email app, filled in
   Exposes window.SP for page scripts (lightbox, clamp, reduced-motion flag). */
(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SP = window.SP = { reduced: reduced, clamp: function (v, a, b) { return Math.min(b, Math.max(a, v)); } };

  /* ── count-up figures ───────────────────────────────── */
  var counters = document.querySelectorAll('[data-count-to]');
  var fmt = function (el, v) {
    var dec = +(el.dataset.decimals || 0), n = v.toFixed(dec);
    if (el.dataset.group !== 'no') n = Number(n).toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    el.textContent = (el.dataset.prefix || '') + n + (el.dataset.suffix || '');
  };
  if (counters.length && 'IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        cio.unobserve(e.target);
        var el = e.target, to = +el.dataset.countTo, from = +(el.dataset.countFrom || 0), t0 = null, dur = 1600;
        if (reduced) return fmt(el, to);
        var step = function (now) {
          if (t0 === null) t0 = now;
          var t = Math.min(1, (now - t0) / dur), k = 1 - Math.pow(1 - t, 4);
          fmt(el, from + (to - from) * k);
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.5 });
    Array.prototype.forEach.call(counters, function (el) { fmt(el, +(el.dataset.countFrom || 0)); cio.observe(el); });
  }

  /* ── photo viewer ───────────────────────────────────── */
  var ICON = {
    prev: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
  };
  var lb, lbImg, lbTitle, lbCount, lbStrip, album = [], at = 0, lastFocus;
  function buildLightbox() {
    lb = document.createElement('div');
    lb.className = 'lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Photo viewer');
    lb.innerHTML = '<div class="lb__bar"><p><span class="lb__title"></span><span class="lb__count"></span></p>' +
      '<button class="lb__btn lb__close" type="button" aria-label="Close">' + ICON.close + '</button></div>' +
      '<div class="lb__stage"><img alt=""><button class="lb__btn lb__prev" type="button" aria-label="Previous photo">' + ICON.prev + '</button>' +
      '<button class="lb__btn lb__next" type="button" aria-label="Next photo">' + ICON.next + '</button></div><div class="lb__strip"></div>';
    document.body.appendChild(lb);
    lbImg = lb.querySelector('.lb__stage img'); lbTitle = lb.querySelector('.lb__title'); lbCount = lb.querySelector('.lb__count'); lbStrip = lb.querySelector('.lb__strip');
    lb.querySelector('.lb__close').addEventListener('click', closeLightbox);
    lb.querySelector('.lb__prev').addEventListener('click', function () { show(at - 1); });
    lb.querySelector('.lb__next').addEventListener('click', function () { show(at + 1); });
    lb.querySelector('.lb__stage').addEventListener('click', function (e) { if (e.target === e.currentTarget) closeLightbox(); });
    lbImg.addEventListener('load', function () { lbImg.classList.remove('is-loading'); });
    var sx = null;
    lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) { if (sx === null) return; var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) show(at + (dx < 0 ? 1 : -1)); sx = null; });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') show(at + 1);
      if (e.key === 'ArrowLeft') show(at - 1);
      if (e.key === 'Tab') {   // keep focus inside the viewer
        var f = lb.querySelectorAll('button'), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }
  function show(i) {
    at = (i + album.length) % album.length;
    var p = album[at];
    lbImg.classList.add('is-loading');
    lbImg.src = p.src; lbImg.alt = p.alt || '';
    lbCount.textContent = album.length > 1 ? (at + 1) + ' / ' + album.length : '';
    Array.prototype.forEach.call(lbStrip.children, function (b, j) { b.classList.toggle('is-on', j === at); if (j === at) b.scrollIntoView({ block: 'nearest', inline: 'center' }); });
    lb.querySelector('.lb__prev').hidden = lb.querySelector('.lb__next').hidden = album.length < 2;
  }
  function closeLightbox() {
    lb.classList.remove('is-open'); document.body.classList.remove('lb-open');
    if (lastFocus) lastFocus.focus();
  }
  // photos: [{src, thumb, alt}], title: album name, start: index
  SP.lightbox = function (photos, title, start) {
    if (!lb) buildLightbox();
    lastFocus = document.activeElement;
    album = photos; lbTitle.textContent = title || '';
    lbStrip.innerHTML = '';
    lbStrip.hidden = photos.length < 2;
    photos.forEach(function (p, j) {
      var b = document.createElement('button');
      b.type = 'button'; b.setAttribute('aria-label', 'Photo ' + (j + 1));
      b.innerHTML = '<img src="' + (p.thumb || p.src) + '" alt="" loading="lazy">';
      b.addEventListener('click', function () { show(j); });
      lbStrip.appendChild(b);
    });
    lb.classList.add('is-open'); document.body.classList.add('lb-open');
    show(start || 0);
    lb.querySelector('.lb__close').focus();
  };
  // any element with data-lightbox='[...]' (JSON) opens its album
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-lightbox]');
    if (!el) return;
    e.preventDefault();
    SP.lightbox(JSON.parse(el.dataset.lightbox), el.dataset.lightboxTitle, +(el.dataset.lightboxStart || 0));
  });

  /* ── forms that open the visitor's email app ───────── */
  Array.prototype.forEach.call(document.querySelectorAll('form[data-mailto]'), function (form) {
    var note = form.querySelector('[data-form-note]'), noteText = note ? note.textContent : '';
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true, lines = [];
      Array.prototype.forEach.call(form.querySelectorAll('.field'), function (f) { f.classList.remove('is-invalid'); });
      Array.prototype.forEach.call(form.querySelectorAll('[required]'), function (input) {
        var empty = input.type === 'email' ? !/^\S+@\S+\.\S+$/.test(input.value.trim()) : !input.value.trim();
        if (empty) { ok = false; var f = input.closest('.field'); if (f) f.classList.add('is-invalid'); }
      });
      var groups = form.querySelectorAll('[data-required-group]');
      Array.prototype.forEach.call(groups, function (g) {
        if (!g.querySelector('input:checked')) { ok = false; g.classList.add('is-invalid'); }
      });
      if (!ok) {
        if (note) note.textContent = 'Please fill in the fields marked in red.';
        var bad = form.querySelector('.is-invalid input, .is-invalid select, .is-invalid textarea');
        if (bad) bad.focus();
        return;
      }
      // one line per labelled field, in form order; ticked boxes are joined
      var seen = {};
      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || seen[el.name] || el.type === 'submit') return;
        var label = el.dataset.label || el.name, val;
        if (el.type === 'checkbox' || el.type === 'radio') {
          seen[el.name] = true;
          val = Array.prototype.map.call(form.querySelectorAll('[name="' + el.name + '"]:checked'), function (c) { return c.value; }).join(', ');
        } else val = el.value.trim();
        if (val) lines.push(label + ': ' + val);
      });
      var subject = (form.dataset.subject || 'Enquiry') + (form.elements.organisation && form.elements.organisation.value ? ' · ' + form.elements.organisation.value.trim() : '');
      window.location.href = 'mailto:' + form.dataset.mailto + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
      if (note) note.textContent = form.dataset.sent || 'Your email app should open with this filled in. If it does not, write to us at ' + form.dataset.mailto + '.';
    });
    form.addEventListener('input', function (e) {
      var f = e.target.closest('.field, [data-required-group]');
      if (f) f.classList.remove('is-invalid');
      if (note && noteText) note.textContent = noteText;
    });
  });
})();
