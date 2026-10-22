/* Fabrication: the step nearest the middle of the screen picks the photo, and the weld bead grows with the scroll. */
(function () {
  'use strict';
  var story = document.querySelector('[data-story]');
  if (!story) return;
  var steps = Array.prototype.slice.call(story.querySelectorAll('.st'));
  var imgs = Array.prototype.slice.call(story.querySelectorAll('.frame2 img'));
  var cap = story.querySelector('[data-story-cap]'), wrap = story.querySelector('.fb-story__steps');
  var on = -1, ticking = false;
  function update() {
    ticking = false;
    var vh = window.innerHeight, best = 0;
    steps.forEach(function (s, i) { if (s.getBoundingClientRect().top < vh * 0.55) best = i; });
    if (best !== on) {
      on = best;
      steps.forEach(function (s, i) { s.classList.toggle('is-on', i === best); });
      imgs.forEach(function (im, i) { im.classList.toggle('is-on', i === best); });
      cap.textContent = '0' + (best + 1) + ' / 0' + steps.length;
    }
    var r = wrap.getBoundingClientRect();
    wrap.style.setProperty('--bp', SP.clamp((vh * 0.55 - r.top) / r.height, 0, 1).toFixed(3));
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
})();
