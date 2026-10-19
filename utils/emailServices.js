
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
  }
});

async function sendEmail({ to, subject, text }) {
  if (!to) {
    throw new Error("Recipient email is missing");
  }

  return transporter.sendMail({
    from: `"SmartRecover" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text
  });
}

async function sendClaimEmail(message) {
  return sendEmail(message);
}

module.exports = { sendEmail, sendClaimEmail };
