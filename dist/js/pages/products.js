/* Products: the category row follows the scroll; each category's photos settle in as it arrives. */
(function () {
  'use strict';
  var cats = Array.prototype.slice.call(document.querySelectorAll('.cat'));
  var links = Array.prototype.slice.call(document.querySelectorAll('[data-catnav] a[href^="#"]'));
  if (!cats.length) return;
  if ('IntersectionObserver' in window && !SP.reduced) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { threshold: 0.2 });
    cats.forEach(function (c) { io.observe(c); });
  } else cats.forEach(function (c) { c.classList.add('is-in'); });

  var on = '';
  var ticking = false;
  function update() {
    ticking = false;
    var cur = '';
    cats.forEach(function (c) { if (c.getBoundingClientRect().top < window.innerHeight * 0.45) cur = c.id; });
    if (cur === on) return;
    on = cur;
    links.forEach(function (a) {
      var hit = a.getAttribute('href') === '#' + cur;
      a.classList.toggle('is-on', hit);
      if (hit && a.parentNode.scrollWidth > a.parentNode.clientWidth) a.parentNode.scrollTo({ left: a.offsetLeft - 20, behavior: SP.reduced ? 'auto' : 'smooth' });
    });
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
})();
