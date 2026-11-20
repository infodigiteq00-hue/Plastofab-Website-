/* About: the panorama drifts with the scroll; the highway draws itself out of Ankleshwar, north and south, when the map comes into view. */
(function () {
  'use strict';
  var pano = document.querySelector('[data-pano]'), route = document.querySelector('[data-route] .rt');
  var ticking = false;
  function update() {
    ticking = false;
    var vh = window.innerHeight;
    if (pano && !SP.reduced) {
      var r = pano.getBoundingClientRect();
      pano.style.setProperty('--py', ((r.top + r.height / 2 - vh / 2) * -0.15).toFixed(1) + 'px');
    }
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  window.addEventListener('resize', update);
  update();

  if (route) {
    var draw = function () {
      if (SP.reduced) { route.style.setProperty('--rp', 1); return; }
      var t0 = performance.now(), dur = 2600;
      (function step(now) {
        var t = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - t, 3);
        route.style.setProperty('--rp', e.toFixed(3));
        if (t < 1) requestAnimationFrame(step);
      })(t0);
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es, io) { if (es[0].isIntersecting) { io.disconnect(); draw(); } }, { threshold: 0.35 }).observe(route);
    } else draw();
  }
})();
