/* Contact: whether the works are open right now, in Ankleshwar time (IST), whatever the visitor's own time zone. */
(function () {
  'use strict';
  var box = document.querySelector('[data-open]');
  if (!box) return;
  var state = box.querySelector('[data-open-state]'), time = box.querySelector('[data-open-time]');
  function update() {
    var now = new Date();
    var parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(now);
    var get = function (t) { return (parts.filter(function (p) { return p.type === t; })[0] || {}).value; };
    var day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    var h = +get('hour') % 24, m = +get('minute');
    var open = day !== 0 && h >= 8 && h < 18;
    box.classList.toggle('is-closed', !open);
    state.textContent = open ? 'Open now' : 'Closed now';
    var nice = (h % 12 || 12) + ':' + (m < 10 ? '0' : '') + m + (h < 12 ? ' am' : ' pm');
    time.textContent = "It's " + nice + ' in Ankleshwar' + (open ? ', until 6 pm' : day === 6 && h >= 18 || day === 0 ? ', open Monday 8 am' : ', opens at 8 am');
    Array.prototype.forEach.call(box.querySelectorAll('[data-d]'), function (li) { li.classList.toggle('is-today', +li.dataset.d === day); });
  }
  update();
  setInterval(update, 30000);
})();
