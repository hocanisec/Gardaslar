const { Resend } = require('resend');

// Render'daki API anahtarını çekiyoruz
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendCode(email, code) {
  try {
    console.log(`📨 Mail gönderiliyor: ${email}`);

    const { data, error } = await resend.emails.send({
      // ARTIK BURASI ÇOK ÖNEMLİ:
      // Gönderen kısmına kendi domainini yazıyoruz.
      // 'noreply' olması şart değil, 'bilgi', 'iletisim' de yazabilirsin.
      // Ama domain 'hocanisec.com.tr' olmak ZORUNDA.
      from: 'HocanıSeç <noreply@hocanisec.com.tr>', 
      
      to: [email], // Artık buraya hangi mail gelirse gelsin (Hotmail, Yahoo, Gmail) hepsine gider.
      subject: 'HocanıSeç Doğrulama Kodu',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2>HocanıSeç'e Hoş Geldin!</h2>
          <p>Kayıt olmak için doğrulama kodun aşağıdadır:</p>
          <h1 style="color: #4F46E5; font-size: 32px; letter-spacing: 5px;">${code}</h1>
          <p>Bu kodu kimseyle paylaşma. Kod 5 dakika geçerlidir.</p>
        </div>
      `
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