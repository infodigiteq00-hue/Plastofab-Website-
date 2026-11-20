/* Materials: choose a tile (or a photo swatch) to see it in the card (arrow keys move between tiles);
   the filter dims the others; the laminate layers come apart as the section scrolls. */
(function () {
  'use strict';
  var table = document.querySelector('[data-ptable]'), card = document.querySelector('[data-card]');
  if (table && card) {
    var els = Array.prototype.slice.call(table.querySelectorAll('.el'));
    var KIND = { thermo: 'Thermoplastic', fluoro: 'Fluoropolymer', comp: 'Composite' };
    var COL = { thermo: '#2e4b8f', fluoro: '#1f8f8a', comp: '#6e8f00' };
    var PHOTO = { pp: 'Polypropylene sheet', hdpe: 'HDPE sheet and pipe', pvc: 'PVC-U and CPVC sheet', pvdf: 'PVDF sheet with a weld', frp: 'A dual-laminate wall and glass-fibre roving' };
    var img = card.querySelector('[data-c-img]'), cap = card.querySelector('[data-c-cap]');
    var pick = function (el, focus) {
      els.forEach(function (e) { e.setAttribute('aria-selected', String(e === el)); e.tabIndex = e === el ? 0 : -1; });
      card.querySelector('[data-c-sym]').textContent = el.querySelector('b').textContent;
      card.querySelector('[data-c-kind]').textContent = KIND[el.dataset.kind];
      card.querySelector('[data-c-name]').textContent = el.dataset.name;
      card.querySelector('[data-c-text]').textContent = el.dataset.text;
      card.querySelector('[data-c-use]').textContent = el.dataset.use;
      img.src = 'assets/materials/' + el.dataset.photo + '-t.webp';
      cap.textContent = el.dataset.kind === 'fluoro' && el.querySelector('b').textContent !== 'PVDF' ? 'Fluoropolymer sheet (PVDF shown)' : PHOTO[el.dataset.photo];
      card.style.setProperty('--c', COL[el.dataset.kind]);
      card.classList.remove('is-swap'); void card.offsetWidth; card.classList.add('is-swap');
      if (focus) el.focus();
    };
    els.forEach(function (el, i) {
      el.addEventListener('click', function () { pick(el); });
      el.addEventListener('keydown', function (e) {
        var d = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 4, ArrowUp: -4 }[e.key];
        if (!d) return;
        e.preventDefault();
        pick(els[(i + d + els.length) % els.length], true);
      });
    });
    pick(els[0]);
    Array.prototype.forEach.call(document.querySelectorAll('[data-pick]'), function (b) {
      b.addEventListener('click', function () {
        var el = els.filter(function (e) { return e.querySelector('b').textContent === b.dataset.pick; })[0];
        if (!el) return;
        document.querySelector('.mt-filter [data-kind="all"]').click();
        pick(el);
        (window.innerWidth < 1000 ? card : document.querySelector('.mt-table-sec')).scrollIntoView({ behavior: SP.reduced ? 'auto' : 'smooth', block: 'start' });
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('.mt-filter [data-kind]'), function (c, _, all) {
      c.addEventListener('click', function () {
        Array.prototype.forEach.call(all, function (o) { o.setAttribute('aria-pressed', String(o === c)); });
        els.forEach(function (e) { e.classList.toggle('is-dim', c.dataset.kind !== 'all' && e.dataset.kind !== c.dataset.kind); });
        var first = els.filter(function (e) { return c.dataset.kind === 'all' || e.dataset.kind === c.dataset.kind; })[0];
        if (first) pick(first);
      });
    });
  }

  var ex = document.querySelector('[data-explode]');
  if (!ex) return;
  var layers = ex.querySelectorAll('.layer');
  var ticking = false;
  function update() {
    ticking = false;
    var r = ex.getBoundingClientRect();
    var p = SP.reduced || window.innerWidth < 1000 ? 0.7 : SP.clamp(-r.top / Math.max(1, r.height - window.innerHeight), 0, 1);
    var e = Math.sin(Math.min(1, p * 1.4) * Math.PI / 2);
    Array.prototype.forEach.call(layers, function (l) { l.style.setProperty('--e', e.toFixed(3)); });
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
