// Vercel Serverless Function — POST /api/contact
// Skickar kontaktformulär via Resend. Kräver env-var RESEND_API_KEY.
// Noll npm-beroenden: använder global fetch (Node 18+).

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Vercel parsar JSON-body automatiskt, men var defensiv.
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  const message = String(body.message || '').trim();
  const honeypot = String(body.company || '').trim();

  // Bot fyllde i det dolda fältet — låtsas lyckas, skicka inget.
  if (honeypot) return res.status(200).json({ ok: true });

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Fyll i namn, e-post och meddelande.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Ogiltig e-postadress.' });
  }
  if (message.length > 5000) {
    return res.status(400).json({ error: 'Meddelandet är för långt.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY saknas i miljövariabler');
    return res.status(500).json({ error: 'Serverkonfiguration saknas.' });
  }

  const esc = (s) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Växjö Doula <noreply@contact.vaxjodoula.se>',
        to: ['cassandra@vaxjodoula.se'],
        reply_to: email, // Cassandra kan svara direkt till besökaren
        subject: `Ny kontaktförfrågan från ${name}`,
        text: `Namn: ${name}\nE-post: ${email}\n\n${message}`,
        html:
          `<h2 style="margin:0 0 .5rem">Ny kontaktförfrågan</h2>` +
          `<p><strong>Namn:</strong> ${esc(name)}</p>` +
          `<p><strong>E-post:</strong> <a href="mailto:${esc(email)}">${esc(email)}</a></p>` +
          `<p style="white-space:pre-wrap;margin-top:1rem">${esc(message)}</p>`,
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      console.error('Resend-fel', r.status, detail);
      return res.status(502).json({ error: 'Kunde inte skicka meddelandet.', upstreamStatus: r.status, upstreamDetail: detail });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Nätverksfel mot Resend', err);
    return res.status(500).json({ error: 'Kunde inte skicka meddelandet.' });
  }
};
