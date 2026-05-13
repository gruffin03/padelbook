const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function sendEmail(to, subject, html) {
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
  if (!res.ok) {
    const err = await res.json();
    throw new Error(JSON.stringify(err));
  }
}

function emailHtml(title, body) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f3f4f6;font-family:sans-serif">
    <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
      <div style="background:linear-gradient(135deg,#0d2a22,#1a3d30);padding:28px 32px;text-align:center">
        <div style="font-size:22px;font-weight:800;color:#2cc4a8">🎾 PadelBook</div>
        <div style="color:rgba(255,255,255,0.6);font-size:12px;margin-top:4px">La plateforme des coachs padel</div>
      </div>
      <div style="padding:32px">
        <h2 style="margin:0 0 16px;color:#0d2a22;font-size:20px">${title}</h2>
        <div style="color:#374151;font-size:14px;line-height:1.7">${body}</div>
      </div>
      <div style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb">
        <p style="margin:0;font-size:12px;color:#9ca3af">PadelBook · La plateforme 100% française des coachs padel</p>
      </div>
    </div>
  </body></html>`;
}

exports.handler = async () => {
  // Calculer la date de demain
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  console.log('Rappels pour le', tomorrowStr);

  // Récupérer les réservations confirmées pour demain
  const { data: bookings, error } = await sb
    .from('bookings')
    .select('*')
    .eq('date', tomorrowStr)
    .eq('statut', 'confirme');

  if (error) {
    console.error('Supabase error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }

  if (!bookings || bookings.length === 0) {
    console.log('Aucune réservation demain');
    return { statusCode: 200, body: JSON.stringify({ sent: 0 }) };
  }

  let sent = 0;
  for (const b of bookings) {
    const date = new Date(b.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    const details = `📅 <strong>${date}</strong> à <strong>${b.heure}</strong><br>🎯 ${b.service_label || b.service}`;

    // Email au joueur
    if (b.user_email) {
      try {
        await sendEmail(
          b.user_email,
          '⏰ Rappel — Votre cours de padel est demain !',
          emailHtml('Votre cours est demain !',
            `N'oubliez pas votre cours de padel demain.<br><br>${details}<br><br>Bonne séance ! 🎾`)
        );
        sent++;
      } catch (e) {
        console.error('Erreur email joueur', b.user_email, e.message);
      }
    }

    // Email au coach
    const { data: coach } = await sb.from('coaches').select('email, nom').eq('id', b.coach_id).single();
    if (coach?.email) {
      try {
        await sendEmail(
          coach.email,
          '⏰ Rappel — Vous avez un cours demain',
          emailHtml('Cours prévu demain',
            `Bonjour ${coach.nom},<br><br>Vous avez un cours de padel demain.<br><br>${details}<br><br>Bonne séance ! 🏆`)
        );
        sent++;
      } catch (e) {
        console.error('Erreur email coach', coach.email, e.message);
      }
    }
  }

  console.log(`${sent} emails envoyés pour ${bookings.length} réservations`);
  return { statusCode: 200, body: JSON.stringify({ sent, bookings: bookings.length }) };
};
