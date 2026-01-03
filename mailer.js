const nodemailer = require("nodemailer");

function transporter() {
  return nodemailer.createTransport({
    host: "mail.hocanisec.com.tr", // Eğer bu çalışmazsa 'smtp.hocanisec.com.tr' yap
    port: 465, // SSL bağlantı portu
    secure: true, // 465 için true olmalı
    auth: {
      user: process.env.MAIL_USER, // iletisim@hocanisec.com.tr
      pass: process.env.MAIL_PASS  // Şifren
    },
    tls: {
      // Sunucu sertifikası hatalarını (self-signed cert vb.) görmezden gel
      rejectUnauthorized: false 
    }
  });
}

async function sendCode(email, code) {
  const t = transporter();
  try {
    await t.sendMail({
      from: `"HocanıSeç" <${process.env.MAIL_USER}>`,
      to: email,
      subject: "HocanıSeç Doğrulama Kodu",
      html: `
        <div style="font-family:sans-serif; text-align:center; padding:20px; border:1px solid #eee; border-radius:10px;">
          <h2 style="color:#2563eb;">Doğrulama Kodun</h2>
          <p>Sisteme giriş yapmak için kodun aşağıdadır:</p>
          <h1 style="background:#f1f5f9; padding:10px; border-radius:8px; letter-spacing:5px;">${code}</h1>
          <p style="color:#64748b; font-size:12px;">Bu kod 5 dakika geçerlidir.</p>
        </div>`
    });
    console.log("✅ Mail başarıyla gönderildi: ", email);
  } catch (err) {
    console.error("❌ Mail Gönderim Hatası:", err);
    throw err; // Hatayı server.js'ye fırlat ki ön yüzde görebilelim
  }
}

module.exports = sendCode;