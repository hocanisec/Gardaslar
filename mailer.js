const nodemailer = require("nodemailer");

function transporter() {
  return nodemailer.createTransport({
    service: "gmail",
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
    subject: "Doğrulama Kodu",
    html: `<h3>Kodunuz: ${code}</h3>`
  });
}
module.exports = sendCode;
