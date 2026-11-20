/* Fabrication: the hero photos change slowly while the hero is on screen; the joint lines draw themselves
   when the fewer-joints drawing comes into view. (The step bar is the shared stepper in pages.js.) */
(function () {
  'use strict';
  var hero = document.querySelector('[data-hero]');
  if (hero && !SP.reduced) {
    var slides = Array.prototype.slice.call(hero.querySelectorAll('.fb-hero__slide')), at = 0, timer = 0;
    var next = function () {
      slides[at].classList.remove('is-on');
      at = (at + 1) % slides.length;
      slides[at].classList.add('is-on');
    };
    if (slides.length > 1 && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        clearInterval(timer);
        if (es[0].isIntersecting) timer = setInterval(next, 6000);
      }).observe(hero);
    }
  }

  var joints = document.querySelector('.joints');
  if (joints) {
    if (SP.reduced || !('IntersectionObserver' in window)) joints.classList.add('is-on');
    else new IntersectionObserver(function (es, io) {
      if (es[0].isIntersecting) { joints.classList.add('is-on'); io.disconnect(); }
    }, { threshold: 0.5 }).observe(joints);
  }
})();
