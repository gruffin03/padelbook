const { Resend } = require('resend');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { to, subject, html } = JSON.parse(event.body || '{}');
  if (!to || !subject || !html) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing fields' }) };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    await resend.emails.send({
      from: 'PadelBook <onboarding@resend.dev>',
      to,
      subject,
      html,
    });
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
