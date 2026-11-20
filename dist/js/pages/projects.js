/* Notable Projects: the topic chips show only the articles on that topic. */
(function () {
  'use strict';
  var cards = Array.prototype.slice.call(document.querySelectorAll('[data-blog] .bcard'));
  var chips = Array.prototype.slice.call(document.querySelectorAll('.bl-filter [data-topic]'));
  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      chips.forEach(function (o) { o.setAttribute('aria-pressed', String(o === c)); });
      cards.forEach(function (k) { k.hidden = c.dataset.topic !== 'all' && k.dataset.topic !== c.dataset.topic; });
    });
  });
})();
