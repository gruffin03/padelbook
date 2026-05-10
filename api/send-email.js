const { Resend } = require('resend');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { to, subject, html } = req.body;

  if (!to || !subject || !html) return res.status(400).json({ error: 'Missing fields' });

  try {
    await resend.emails.send({
      from: 'PadelBook <onboarding@resend.dev>',
      to,
      subject,
      html
    });
    res.status(200).json({ ok: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
};
