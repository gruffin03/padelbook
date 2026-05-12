exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { to, subject, html } = JSON.parse(event.body || '{}');
  console.log('sendEmail called — to:', to, 'subject:', subject);
  console.log('API key present:', !!process.env.BREVO_API_KEY);

  if (!to || !subject || !html) {
    console.log('Missing fields');
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing fields' }) };
  }

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { name: 'PadelBook', email: 'gruffin.gr@gmail.com' },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });
    const data = await res.json();
    console.log('Brevo response:', res.status, JSON.stringify(data));
    if (!res.ok) throw new Error(JSON.stringify(data));
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    console.error('Brevo error:', e.message);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
