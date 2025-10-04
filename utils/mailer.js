const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "smartstudent761@gmail.com",
    pass: "dzfv lqkd lqfn jepk"
  }
});

exports.sendOTP = async (email, otp) => {
  const mailOptions = {
    from: "smartstudent761@gmail.com",
    to: email,
    subject: "Your OTP for Password Reset",
    html: `<p>Your OTP is: <strong>${otp}</strong>. It is valid for 10 minutes.</p>`
  };

  await transporter.sendMail(mailOptions);
};
