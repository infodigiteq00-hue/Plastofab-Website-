/* Quote form: no server needed. Checks the required fields, then opens
   the visitor's email app with the request written out (drawings can be attached there). */
(function () {
  'use strict';
  var form = document.querySelector('[data-callback]');
  if (!form) return;
  var TO = 'info@plasto-fab.com';
  var note = form.querySelector('[data-callback-note]');
  var picked = function (name) {
    return Array.prototype.slice.call(form.querySelectorAll('input[name="' + name + '"]:checked')).map(function (c) { return c.value; }).join(', ');
  };

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var missing = [];
    ['name', 'phone'].forEach(function (key) {
      var input = form.elements[key];
      var bad = !input.value.trim();
      input.closest('.field').classList.toggle('is-invalid', bad);
      input.setAttribute('aria-invalid', String(bad));
      if (bad) missing.push(input);
    });
    if (missing.length) {
      note.textContent = 'Please add your name and phone number so we can reach you.';
      missing[0].focus();
      return;
    }
    var v = function (k) { return form.elements[k].value.trim(); };
    var body = [
      'Please send a quote.',
      '',
      'Name: ' + v('name'),
      'Company: ' + (v('company') || '-'),
      'Phone: ' + v('phone'),
      'Industry: ' + (picked('industry') || '-'),
      'Project type: ' + (picked('product') || '-'),
      'Material preference: ' + (picked('material') || '-'),
      '',
      v('message')
    ].join('\n');
    var subject = 'Quote request' + (v('company') ? ' – ' + v('company') : '');
    window.location.href = 'mailto:' + TO + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    note.textContent = 'Your email app should open with the request ready. Attach any drawings before sending.';
  });
})();
