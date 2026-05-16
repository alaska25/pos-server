const nodemailer = require('nodemailer');
const sendEmail = async (options) => {
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,   // App Password, NOT your Gmail login password
  },
});
transporter.verify(function(error, success) {
  if (error) {
    console.log("❌ Connection Error:", error);
  } else {
    console.log("✅ Server is ready to take our messages");
  }
});


  const mailOptions = {
    from: `"FlowPOS Support" <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;