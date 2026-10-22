/* Clients: tiles turn in, row by row, as the wall comes into view. */
(function () {
  'use strict';
  var tiles = Array.prototype.slice.call(document.querySelectorAll('.cl'));
  tiles.forEach(function (t) { t.classList.remove('reveal'); });
  if (SP.reduced || !('IntersectionObserver' in window)) return tiles.forEach(function (t) { t.classList.add('is-in'); });
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      var i = tiles.indexOf(e.target);
      e.target.style.transitionDelay = (i % 7) * 60 + Math.floor(i / 7) * 40 + 'ms';
      e.target.classList.add('is-in'); io.unobserve(e.target);
    });
  }, { threshold: 0.3 });
  tiles.forEach(function (t) { io.observe(t); });
})();
