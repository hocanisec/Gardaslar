const nodemailer = require("nodemailer");

function transporter() {
  console.log("Postacı (SMTP) hazırlanıyor...");
  return nodemailer.createTransport({
    // 'mail.' yerine 'smtp.' denemek bazen işe yarar
    host: "mail.hocanisec.com.tr", 
    port: 465, // SSL portu
    secure: true, // Port 465 için mutlaka TRUE olmalı
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    },
    tls: {
      // Sertifika doğrulama hatasını kesin olarak geçer
      rejectUnauthorized: false,
      minVersion: "TLSv1.2"
    },
    connectionTimeout: 10000 // 10 saniye boyunca bağlanmayı dener
  });
}

async function sendCode(email, code) {
  const t = transporter();
  console.log(`📡 Bağlantı kuruluyor: ${email}`);
  
  try {
    const info = await t.sendMail({
      from: `"HocanıSeç" <${process.env.MAIL_USER}>`,
      to: email,
      subject: "HocanıSeç Doğrulama Kodu",
      html: `
        <div style="font-family:sans-serif; text-align:center;">
          <h2>HocanıSeç Doğrulama</h2>
          <p>Kodunuz aşağıdadır:</p>
          <h1 style="background:#eee; padding:10px; border-radius:5px;">${code}</h1>
        </div>`
    });
    console.log("✅ Mail uçtu! ID:", info.messageId);
    return true;
  } catch (err) {
    console.error("❌ MAİL GÖNDERİLEMEDİ! Hata detayınız:");
    console.error(err.message);
    throw err;
  }
}

module.exports = sendCode;