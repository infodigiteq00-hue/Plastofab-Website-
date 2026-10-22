/* The site menu: dropdowns open on hover (mouse) or tap/click/keyboard,
   and below 1080px a full-screen menu opens from the button. */
(function () {
  'use strict';
  var header = document.querySelector('.site-header');
  if (!header) return;
  var items = Array.prototype.slice.call(header.querySelectorAll('.nav__item.has-menu'));
  var hoverable = window.matchMedia('(hover: hover)').matches;

  function close(except) {
    items.forEach(function (it) {
      if (it === except) return;
      it.classList.remove('is-open');
      it.querySelector('.nav__top').setAttribute('aria-expanded', 'false');
    });
  }
  function open(it) {
    close(it);
    it.classList.add('is-open');
    it.querySelector('.nav__top').setAttribute('aria-expanded', 'true');
  }

  items.forEach(function (it) {
    var btn = it.querySelector('.nav__top'), timer;
    btn.addEventListener('click', function () { it.classList.contains('is-open') ? close() : open(it); });
    if (hoverable) {
      it.addEventListener('mouseenter', function () { clearTimeout(timer); open(it); });
      it.addEventListener('mouseleave', function () { timer = setTimeout(function () { if (!it.contains(document.activeElement)) close(); }, 160); });
    }
    it.addEventListener('focusout', function (e) { if (!it.contains(e.relatedTarget)) { it.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); } });
    it.addEventListener('keydown', function (e) {
      var links = Array.prototype.slice.call(it.querySelectorAll('.nav__panel a'));
      var at = links.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); open(it); (links[at + 1] || links[0]).focus(); }
      if (e.key === 'ArrowUp' && at > -1) { e.preventDefault(); (links[at - 1] || btn).focus(); }
    });
  });
  document.addEventListener('click', function (e) { if (!header.contains(e.target)) close(); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var openItem = items.filter(function (it) { return it.classList.contains('is-open'); })[0];
    close();
    if (openItem) openItem.querySelector('.nav__top').focus();
    if (toggle && toggle.getAttribute('aria-expanded') === 'true') setMenu(false), toggle.focus();
  });

  // full-screen menu on small screens
  var toggle = header.querySelector('.nav-toggle'), sheet = header.querySelector('.mnav');
  function setMenu(on) {
    toggle.setAttribute('aria-expanded', String(on));
    toggle.setAttribute('aria-label', on ? 'Close menu' : 'Open menu');
    sheet.hidden = !on;
    header.classList.toggle('menu-on', on);
    document.body.classList.toggle('menu-open', on);
  }
  if (toggle && sheet) {
    toggle.addEventListener('click', function () { setMenu(toggle.getAttribute('aria-expanded') !== 'true'); });
    sheet.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    window.addEventListener('resize', function () { if (window.innerWidth > 1080 && !sheet.hidden) setMenu(false); });
  }
})();
