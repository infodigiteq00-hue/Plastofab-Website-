/* About: the panorama drifts, and the highway draws itself from Ahmedabad to Mumbai with the scroll. */
(function () {
  'use strict';
  var pano = document.querySelector('[data-pano]'), route = document.querySelector('[data-route]');
  var ticking = false;
  function update() {
    ticking = false;
    var vh = window.innerHeight;
    if (pano && !SP.reduced) {
      var r = pano.getBoundingClientRect();
      pano.style.setProperty('--py', ((r.top + r.height / 2 - vh / 2) * -0.15).toFixed(1) + 'px');
    }
    if (route) {
      var q = route.getBoundingClientRect(), p;
      if (SP.reduced) p = 1;
      else if (window.innerWidth < 1000) p = SP.clamp((vh * 0.9 - q.top) / (q.height * 0.8), 0, 1);
      else p = SP.clamp(-q.top / Math.max(1, q.height - vh) * 1.25, 0, 1);
      route.style.setProperty('--rp', p.toFixed(3));
    }
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
