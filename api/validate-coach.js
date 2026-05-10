const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { coachId, validated, adminNote } = req.body;

  const { data: coach, error } = await supabase
    .from('coaches')
    .update({ validated, admin_notes: adminNote || '' })
    .eq('id', coachId)
    .select('*, profiles(*)')
    .single();

  if (error) return res.status(500).json({ error: error.message });

  const email = coach.profiles?.email;
  if (email) {
    await resend.emails.send({
      from: 'PadelBook <onboarding@resend.dev>',
      to: email,
      subject: validated ? '✅ Profil validé — PadelBook' : '❌ Profil refusé — PadelBook',
      html: validated
        ? `<h2>Félicitations ${coach.nom} !</h2><p>Votre profil coach a été validé. Vous êtes maintenant visible par les joueurs sur PadelBook.</p>`
        : `<h2>Profil non validé</h2><p>Votre profil coach n'a pas pu être validé.${adminNote ? `<br>Raison : ${adminNote}` : ''}</p>`
    });
  }

  res.status(200).json({ ok: true });
};
