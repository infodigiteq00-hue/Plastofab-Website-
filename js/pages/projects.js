/* Notable Projects: filter the case notes by type, and read each case in a full-page reader.
   Each case has its own link (projects.html#<case>), so the back button closes the reader.
   Without JS the cases are simply printed down the page. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ── filter ─────────────────────────────────────────── */
  var buttons = $$('.pj-filter button'), items = $$('.pj-feature, .pj-card'), heading = $('#board-title');
  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      var f = b.dataset.filter, n = 0;
      buttons.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      items.forEach(function (el) {
        var on = f === 'all' || el.dataset.type.split(' ').indexOf(f) > -1;
        el.classList.remove('is-shown');
        if (on) { n++; if (el.hidden) { el.hidden = false; void el.offsetWidth; el.classList.add('is-shown'); } el.classList.add('is-in'); }
        else el.hidden = true;
      });
      if (heading) heading.textContent = n + ' case note' + (n === 1 ? '' : 's');
    });
  });

  /* ── reader ─────────────────────────────────────────── */
  var holder = $('[data-cases]');
  if (!holder) return;
  var cases = $$('.pj-case', holder), bySlug = {}, order = [];
  if (!cases.length) return;
  var ARROW = function (d) { return '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="' + d + '" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'; };
  var rd = document.createElement('div');
  rd.className = 'pj-reader'; rd.hidden = true;
  rd.setAttribute('role', 'dialog'); rd.setAttribute('aria-modal', 'true');
  rd.innerHTML = '<div class="pj-reader__bar"><div class="wrap"><p class="pj-reader__where"><span>Notable projects</span><b></b></p>' +
    '<div class="pj-reader__nav"><button type="button" class="round" data-step="-1" aria-label="Previous case">' + ARROW('M10 3L5 8l5 5') + '</button>' +
    '<button type="button" class="round" data-step="1" aria-label="Next case">' + ARROW('M6 3l5 5-5 5') + '</button>' +
    '<button type="button" class="round" data-close aria-label="Close case study">' + ARROW('M4 4l8 8M12 4l-8 8') + '</button></div></div></div>' +
    '<div class="pj-reader__body wrap"></div>' +
    '<a class="pj-reader__next" href="#"><div class="wrap"><div><small>Next case</small><strong></strong></div><span class="round" aria-hidden="true">' + ARROW('M3 8h10M9 4l4 4-4 4') + '</span></div></a>';
  var body = $('.pj-reader__body', rd), where = $('.pj-reader__where b', rd), next = $('.pj-reader__next', rd);
  cases.forEach(function (c) {
    var slug = c.id;
    c.removeAttribute('id');   // the hash names the case, but must not scroll the page to it
    c.dataset.slug = slug; c.hidden = true;
    bySlug[slug] = c; order.push(slug);
    body.appendChild(c);
  });
  holder.parentNode.removeChild(holder);
  document.body.appendChild(rd);

  var current = null, lastFocus = null, baseTitle = document.title, closeTimer;
  function show(slug) {
    var c = bySlug[slug];
    if (!c) return hide();
    clearTimeout(closeTimer);
    if (!current) lastFocus = document.activeElement;
    cases.forEach(function (x) { x.hidden = x !== c; });
    current = slug;
    var kick = $('.pj-kicker', c), h = $('h2', c);
    where.textContent = kick ? kick.textContent.replace(/^(No\. \d+)/, '$1 · ') : '';
    rd.setAttribute('aria-labelledby', h.id);
    var i = order.indexOf(slug), n = order[(i + 1) % order.length];
    next.setAttribute('href', '#' + n); next.dataset.open = n;
    $('strong', next).textContent = $('h2', bySlug[n]).textContent;
    document.title = h.textContent + ' · Plasto-Fab';
    var wasOpen = !rd.hidden;
    rd.hidden = false; document.body.classList.add('pj-open');
    rd.scrollTop = 0;
    if (!wasOpen) { void rd.offsetWidth; rd.classList.add('is-open'); }
    h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true });
  }
  function hide() {
    if (!current) return;
    current = null;
    document.title = baseTitle;
    rd.classList.remove('is-open'); document.body.classList.remove('pj-open');
    closeTimer = setTimeout(function () { rd.hidden = true; }, SP.reduced ? 0 : 320);
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }
  function fromHash() { var s = decodeURIComponent(location.hash.slice(1)); return bySlug[s] ? s : null; }
  function sync() { var s = fromHash(); if (s) show(s); else hide(); }
  function open(slug) {
    if (slug === current) return;
    if (current) history.replaceState(history.state, '', '#' + slug);   // moving between cases: one history entry
    else history.pushState({ pj: 1 }, '', '#' + slug);
    show(slug);
  }
  function close() {
    if (history.state && history.state.pj) history.back();   // popstate then hides it
    else { history.replaceState(null, '', location.pathname + location.search); hide(); }
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-open]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
    if (!bySlug[a.dataset.open]) return;
    e.preventDefault(); open(a.dataset.open);
  });
  $('[data-close]', rd).addEventListener('click', close);
  $$('[data-step]', rd).forEach(function (b) {
    b.addEventListener('click', function () {
      var i = order.indexOf(current) + +b.dataset.step;
      open(order[(i + order.length) % order.length]);
    });
  });
  window.addEventListener('popstate', sync);
  window.addEventListener('hashchange', sync);
  // capture phase, so the photo viewer (opened over the reader) gets Escape first
  window.addEventListener('keydown', function (e) {
    if (!current || document.body.classList.contains('lb-open')) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    if (e.key === 'Tab') {   // keep focus inside the reader
      var f = $$('a[href], button:not([hidden])', rd).filter(function (x) { return x.offsetParent !== null; });
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || !rd.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, true);

  if (fromHash()) { show(fromHash()); }
})();
