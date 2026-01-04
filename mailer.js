const nodemailer = require("nodemailer");

function transporter() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587, // 465 yerine 587 (TLS) kullanıyoruz, daha garantidir.
    secure: false, // 587 portu için false olmalı
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
}

async function sendCode(email, code) {
  const t = transporter();
  try {
    console.log(`📨 Mail gönderiliyor: ${process.env.MAIL_USER} -> ${email}`); // Log ekledik
    await t.sendMail({
      from: `"HocanıSeç" <${process.env.MAIL_USER}>`,
      to: email,
      subject: "HocanıSeç Doğrulama Kodu",
      html: `<h3>Doğrulama Kodunuz: ${code}</h3>`
    });
    console.log(`✅ Mail başarıyla gönderildi: ${email}`);
    return true;
  } catch (err) {
    console.error("❌ GMAIL HATASI:", err); // Hatayı tüm detaylarıyla görelim
    throw err;
  }
}

module.exports = sendCode;