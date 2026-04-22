const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async (to, subject, html, options = {}) => {
  if (!to) return;
  const mailOptions = {
    from: `"Animal Rescue" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
    attachments: options.attachments || [],
  };
  await transporter.sendMail(mailOptions);
};

module.exports = { sendEmail };


