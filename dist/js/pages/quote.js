/* Get a Quote: one step at a time. A step with a required choice must be answered
   before moving on; the last step sends through pages.js (it opens the email app). */
(function () {
  'use strict';
  var form = document.querySelector('[data-wizard]');
  if (!form) return;
  var panels = Array.prototype.slice.call(form.querySelectorAll('.wiz__panel'));
  var labels = Array.prototype.slice.call(form.querySelectorAll('.wiz__steps li'));
  var back = form.querySelector('[data-back]'), next = form.querySelector('[data-next]'), send = form.querySelector('[data-send]');
  var note = form.querySelector('[data-form-note]');
  var at = 0;
  function show(i, focus) {
    at = i;
    panels.forEach(function (p, j) { p.classList.toggle('is-on', j === i); });
    labels.forEach(function (l, j) { l.classList.toggle('is-on', j === i); l.classList.toggle('is-done', j < i); });
    form.style.setProperty('--wp', ((i + 1) / panels.length).toFixed(2));
    back.hidden = i === 0; next.hidden = i === panels.length - 1; send.hidden = i !== panels.length - 1;
    note.textContent = '';
    if (focus) { var f = panels[i].querySelector('input, textarea'); if (f) f.focus(); }
  }
  next.addEventListener('click', function () {
    var p = panels[at];
    if (p.hasAttribute('data-required-group') && !p.querySelector('input:checked')) {
      p.classList.add('is-invalid'); note.textContent = 'Please choose at least one.'; return;
    }
    p.classList.remove('is-invalid');
    show(at + 1, true);
  });
  back.addEventListener('click', function () { show(at - 1, true); });
  form.addEventListener('change', function (e) { var p = e.target.closest('.wiz__panel'); if (p) p.classList.remove('is-invalid'); note.textContent = ''; });
  // the earlier steps' required choices are checked by pages.js on submit too; show the step if one is missing
  form.addEventListener('submit', function () {
    for (var i = 0; i < panels.length - 1; i++) {
      if (panels[i].hasAttribute('data-required-group') && !panels[i].querySelector('input:checked')) { show(i); panels[i].classList.add('is-invalid'); return; }
    }
  }, true);
  show(0);
})();
