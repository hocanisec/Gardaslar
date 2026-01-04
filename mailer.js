const nodemailer = require("nodemailer");

function transporter() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465, // 587 takıldığı için 465'e (SSL) dönüyoruz. En sağlamı budur.
    secure: true, // 465 portu için burası KESİNLİKLE true olmalı.
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    }
  });
}

async function sendCode(email, code) {
  const t = transporter();
  try {
    console.log(`📨 Mail gönderiliyor: ${process.env.MAIL_USER} -> ${email}`);
    
    await t.sendMail({
      from: `"HocanıSeç" <${process.env.MAIL_USER}>`,
      to: email,
      subject: "HocanıSeç Doğrulama Kodu",
      html: `<h3>Doğrulama Kodunuz: ${code}</h3>`
    });
    
    console.log(`✅ Mail başarıyla gönderildi: ${email}`);
    return true;
  } catch (err) {
    console.error("❌ GMAIL HATASI:", err.message); // Hata mesajını sadeleştirdim
    throw err;
  }
}

module.exports = sendCode;