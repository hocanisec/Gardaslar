const { Resend } = require('resend');

// Render'a eklediğin anahtarı buradan çekiyoruz
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendCode(email, code) {
  try {
    console.log(`📨 Mail gönderiliyor (Resend): ${email}`);

    const { data, error } = await resend.emails.send({
      // Resend'in test için verdiği hazır gönderici adresi
      from: 'onboarding@resend.dev', 
      // Test modunda olduğun için buraya sadece KENDİ ÜYELİK MAILİNİ yazabilirsin.
      // Canlıya geçince herkese atabileceksin.
      to: [email], 
      subject: 'HocanıSeç Doğrulama Kodu',
      html: `<h3>Doğrulama Kodunuz: <strong>${code}</strong></h3><p>HocanıSeç'e hoş geldin!</p>`
    });

    if (error) {
      console.error("❌ Resend Hatası:", error);
      throw new Error(error.message);
    }

    console.log(`✅ Mail başarıyla gönderildi! ID: ${data.id}`);
    return true;
  } catch (err) {
    console.error("❌ MAIL GÖNDERİLEMEDİ:", err.message);
    throw err;
  }
}

module.exports = sendCode;