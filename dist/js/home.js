/* Home page extras: the client logo wall and the company film. */
(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // client logos, in two rows that drift in opposite directions
  var wall = document.querySelector('[data-logos]');
  if (wall) {
    var N = 28, half = Math.ceil(N / 2);
    var row = function (from, to, dir) {
      var items = '';
      for (var i = from; i <= to; i++) {
        var n = (i < 10 ? '0' : '') + i;
        items += '<li><img src="assets/clients/' + n + '.webp" alt="" loading="lazy" decoding="async"></li>';
      }
      // the list twice, so the loop is seamless
      return '<ul class="logos__row logos__row--' + dir + '" aria-hidden="true">' + items + items + '</ul>';
    };
    wall.innerHTML = row(1, half, 'l') + row(half + 1, N, 'r');
    wall.setAttribute('role', 'img');
    wall.setAttribute('aria-label', 'Clients include Thermax, Jubilant Life Sciences, Asian Paints, Glenmark, Anupam Rasayan, Merino, Hikal, Bayer, Sanofi, Lupin, ' +
      'Apothecon, Tatva Chintan, Aarti Industries, Alembic, Lewens Labs, PI Industries, Aditya Birla Group, Zydus Cadila, Gujarat Gas, Wockhardt, Filatex, Isagro, ' +
      'Kancor, Mahavir Synthesis, Modiguard, Kohler, Cadila Pharmaceuticals and GSK');
  }

  // the film: a click starts it with sound and the browser's own controls; it pauses when scrolled away
  var player = document.querySelector('[data-player]');
  if (player) {
    var video = player.querySelector('video'), play = player.querySelector('.player__play');
    play.addEventListener('click', function () {
      player.classList.add('is-playing');
      video.controls = true;
      var p = video.play(); if (p && p.catch) p.catch(function () {});
      video.focus();
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { if (!es[0].isIntersecting && !video.paused) video.pause(); }, { threshold: 0 }).observe(player);
    }
  }
})();
