/* Shared page behaviour: header state, cards that pop in and headings that rise as they come into view,
   reveal-on-view, footer year. */
(function () {
  'use strict';
  var header = document.querySelector('.site-header');
  function onScroll() { if (header) header.classList.toggle('is-solid', window.scrollY > 40); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // cards pop in, a few at a time and a beat apart; section headings rise; eyebrow lines draw.
  // Everything here is a one-off CSS animation, so each card keeps its own hover and transitions.
  var CARDS = '.wcard, .ind, .pillar, .bcard, .pj-card, .ccard, .std__card, .mach li, .bento__t, .fsw, .mv, .founder, .plant, .doc, .cat__facts > div, .el, .scope__card, .gauge, .tile';
  var reducedPop = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reducedPop && 'IntersectionObserver' in window) {
    var skip = function (el) { return el.closest('.mat, .intro, dialog, [hidden], .pdet, .stepper__panel'); };
    var pops = [];
    Array.prototype.forEach.call(document.querySelectorAll(CARDS), function (el) { if (!skip(el)) { el.classList.remove('reveal'); el.classList.add('pop'); pops.push(el); } });
    Array.prototype.forEach.call(document.querySelectorAll('h2, .eyebrow'), function (el) { if (!skip(el) && !el.closest('.pop')) { el.classList.remove('reveal'); el.classList.add('pop', el.matches('h2') ? 'pop--rise' : 'pop--line'); pops.push(el); } });
    var po = new IntersectionObserver(function (entries) {
      var hits = entries.filter(function (e) { return e.isIntersecting; }).map(function (e) { return e.target; });
      hits.sort(function (a, b) { return a.compareDocumentPosition(b) & 4 ? -1 : 1; });   // in reading order
      hits.forEach(function (el, i) { el.style.setProperty('--pop-d', Math.min(i, 6) * 80 + 'ms'); el.classList.add('is-popped'); po.unobserve(el); });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    pops.forEach(function (el) { po.observe(el); });
  }

  var targets = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    targets.forEach(function (el, i) { el.style.transitionDelay = (i % 4) * 70 + 'ms'; io.observe(el); });
  } else {
    targets.forEach(function (el) { el.classList.add('is-in'); });
  }

  var year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
})();
