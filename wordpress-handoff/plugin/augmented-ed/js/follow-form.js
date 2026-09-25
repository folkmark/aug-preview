/* The Follow form, sent in place.
 *
 * Without this script the form still works: it posts to admin-post.php and the plugin
 * answers with a redirect back and a message (includes/follow.php). With it, the same POST
 * goes by fetch, the answer appears in the form's live region, and nothing reloads.
 * Validation is the browser's own, from the required attributes the plugin restored.
 */
(function () {
  'use strict';
  var form = document.querySelector('[data-aug-follow]');
  if (!form) return;
  var status = form.querySelector('[data-aug-follow-status]');
  var elapsed = form.querySelector('input[name="aug_elapsed"]');
  var submit = form.querySelector('button[type="submit"]');

  // How long since the visitor first touched the form: the relay treats a form sent faster
  // than a person could fill it as a bot's. Sent as a duration, both ends read from this
  // clock, never as a time for the server to compare with its own — a visitor whose clock
  // runs ahead of the server's would read as having sent the form before opening it.
  var touched = 0;
  form.addEventListener('focusin', function () { touched = Date.now(); }, { once: true });

  function say(text) { if (status) status.textContent = text; }

  form.addEventListener('submit', function (e) {
    if (!window.fetch || !window.FormData) return;
    e.preventDefault();
    if (!form.reportValidity()) return;
    if (elapsed) elapsed.value = touched ? String(Date.now() - touched) : '';
    form.querySelectorAll('[aria-invalid]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
    if (submit) submit.disabled = true;
    say('Sending…');
    // getAttribute, not form.action: the form carries an input NAMED "action" (WordPress's
    // admin-post routing), and a named control shadows the property — form.action is that
    // input, and fetch() would post to "[object HTMLInputElement]".
    fetch(form.getAttribute('action'), {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' },
      credentials: 'same-origin'
    }).then(function (res) {
      return res.json().catch(function () { return { ok: false, message: '' }; });
    }).then(function (r) {
      if (r.ok) {
        form.reset();
        (window.dataLayer = window.dataLayer || []).push({ event: 'augmented_follow_submit' });
      }
      (r.fields || []).forEach(function (name) {
        var el = form.querySelector('[name="' + name + '"]');
        if (el) el.setAttribute('aria-invalid', 'true');
      });
      var first = form.querySelector('[aria-invalid="true"]');
      if (first) first.focus();
      say(r.message || (r.ok ? 'Thank you.' : 'Sorry — that did not go through. Please try again in a moment.'));
    }).catch(function () {
      say('Sorry — that did not go through. Please try again in a moment.');
    }).then(function () {
      if (submit) submit.disabled = false;
    });
  });
})();
