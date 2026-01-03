const nodemailer = require("nodemailer");

function transporter() {
  console.log("Transporter ayarlanıyor...");
  return nodemailer.createTransport({
    host: "mail.hocanisec.com.tr", // Eğer hata verirse burayı 'smtp.hocanisec.com.tr' yapmayı dene
    port: 587, // Port 465 hata veriyorsa 587 en garantisidir
    secure: false, // Port 587 için bu false olmalı
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    },
    tls: {
      rejectUnauthorized: false // Sertifika hatalarını geçmek için şart
    }
  });
}

async function sendCode(email, code) {
  const t = transporter();
  
  console.log(`📧 Mail gönderimi başlatıldı: ${email}`);
  
  try {
    const info = await t.sendMail({
      from: `"HocanıSeç" <${process.env.MAIL_USER}>`,
      to: email,
      subject: "HocanıSeç Doğrulama Kodu",
      html: `<h3>Doğrulama Kodunuz: ${code}</h3>`
    });
    console.log("✅ Mail başarıyla gönderildi! Mesaj ID:", info.messageId);
    return true;
  } catch (err) {
    console.error("❌ NODEMAILER HATASI DETAYI:", err); // Hatayı Render loglarına basar
    throw err;
  }
}

module.exports = sendCode;