const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY  // bypasse RLS
  );
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { coachId, validated, adminNote } = JSON.parse(event.body);

  const { data: coach, error } = await supabase
    .from('coaches')
    .update({ validated, admin_notes: adminNote || '' })
    .eq('id', coachId)
    .select('*, profiles(*)')
    .single();

  if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };

  // Email au coach selon décision
  const email = coach.profiles?.email;
  if (email) {
    await resend.emails.send({
      from: 'PadelBook <noreply@padelbook.fr>',
      to: email,
      subject: validated ? '✅ Profil validé — PadelBook' : '❌ Profil refusé — PadelBook',
      html: validated
        ? `<h2>Félicitations ${coach.nom} !</h2><p>Votre profil coach a été validé. Vous êtes maintenant visible par les joueurs sur PadelBook.</p>`
        : `<h2>Profil non validé</h2><p>Votre profil coach n'a pas pu être validé.${adminNote ? `<br>Raison : ${adminNote}` : ''}</p><p>Contactez-nous pour plus d'informations.</p>`
    });
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
