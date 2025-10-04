const User = require('../models/User');
const { sendOTP } = require('../utils/mailer');
const otpStore = {}; // In-memory OTP store (can be replaced with Redis or DB for prod)

exports.sendOtp = async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: 'Email is required' });

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'User not found' });

  const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP
  otpStore[email] = { otp, expiresAt: Date.now() + 10 * 60 * 1000 }; // 10 mins

  try {
    await sendOTP(email, otp);
    res.status(200).json({ message: 'OTP sent to email' });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
};

exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  const stored = otpStore[email];

  if (!stored || stored.expiresAt < Date.now()) {
    return res.status(400).json({ message: 'OTP expired or not found' });
  }

  if (parseInt(otp) !== stored.otp) {
    return res.status(400).json({ message: 'Invalid OTP' });
  }

  delete otpStore[email]; // Clear OTP after verification
  res.status(200).json({ message: 'OTP verified. You can reset password now.' });
};
