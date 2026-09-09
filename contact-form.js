// Hanterar kontaktformuläret på alla sidor. Postar till /api/contact.
(function () {
  var f = document.getElementById('contact-form');
  if (!f) return;
  var status = f.querySelector('.form-status');
  var btn = f.querySelector('button[type=submit]');

  f.addEventListener('submit', async function (e) {
    e.preventDefault();
    var data = Object.fromEntries(new FormData(f).entries());

    btn.disabled = true;
    status.textContent = 'Skickar…';
    status.className = 'form-status';

    try {
      var r = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error('bad status');
      f.reset();
      var success = document.getElementById('form-success');
      if (success) {
        f.hidden = true;
        success.hidden = false;
        success.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        status.textContent = 'Tack! Ditt meddelande är skickat. Jag hör av mig snart.';
        status.className = 'form-status ok';
      }
    } catch (err) {
      status.textContent =
        'Något gick fel. Mejla mig gärna direkt på cassandra@vaxjodoula.se.';
      status.className = 'form-status err';
    } finally {
      btn.disabled = false;
    }
  });
})();
