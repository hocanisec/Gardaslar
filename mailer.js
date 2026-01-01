const nodemailer = require("nodemailer");

function transporter() {
  return nodemailer.createTransport({
    host: "mail.hocanisec.com.tr", // Kendi hosting SMTP adresini yazmalısın
    port: 465, // Genelde 465 (SSL) veya 587'dir
    secure: true,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    }
  });
}

async function sendCode(email, code) {
  const t = transporter();
  await t.sendMail({
    from: `"HocanıSeç" <${process.env.MAIL_USER}>`,
    to: email,
    subject: "HocanıSeç Doğrulama Kodu",
    html: `<h3>Doğrulama Kodunuz: ${code}</h3>`
  });
}

module.exports = sendCode;