/* Sewage treatment: bubbles in the hero, the glasses clear and the gauges fill when seen,
   and a droplet runs down the treatment path with the scroll. */
(function () {
  'use strict';
  var bub = document.querySelector('.wt-bubbles');
  if (bub && !SP.reduced) {
    var html = '';
    for (var i = 0; i < 26; i++) {
      var s = 4 + Math.random() * 14;
      html += '<span style="--x:' + (Math.random() * 100).toFixed(1) + '%;--s:' + s.toFixed(1) + 'px;--t:' + (7 + Math.random() * 9).toFixed(1) + 's;--d:-' + (Math.random() * 12).toFixed(1) + 's;--w:' + ((Math.random() - .5) * 80).toFixed(0) + 'px"></span>';
    }
    bub.innerHTML = html;
  }
  var once = function (sel, cls, th) {
    var el = document.querySelector(sel); if (!el) return;
    if (SP.reduced || !('IntersectionObserver' in window)) return el.classList.add(cls);
    var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { setTimeout(function () { el.classList.add(cls); }, 300); io.disconnect(); } }, { threshold: th || 0.4 });
    io.observe(el);
  };
  once('[data-glasses]', 'is-on', 0.6);
  once('[data-gauges]', 'is-on', 0.4);
  if ('IntersectionObserver' in window) {
    var pio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); pio.unobserve(e.target); } }); }, { threshold: 0.4 });
    Array.prototype.forEach.call(document.querySelectorAll('.plant'), function (p) { pio.observe(p); });
  }

  var path = document.querySelector('[data-path] .path'), steps = path ? Array.prototype.slice.call(path.querySelectorAll('li')) : [];
  if (!path) return;
  var ticking = false;
  function update() {
    ticking = false;
    var r = path.getBoundingClientRect(), vh = window.innerHeight;
    var p = SP.clamp((vh * 0.55 - r.top) / r.height, 0, 1);
    path.style.setProperty('--pp', p.toFixed(3));
    steps.forEach(function (li) { li.classList.toggle('is-on', li.getBoundingClientRect().top < vh * 0.62); });
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
})();
