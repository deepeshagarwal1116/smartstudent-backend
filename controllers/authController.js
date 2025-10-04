// GET /api/students/filter?semester=...&year=...&branch=...
exports.getFilteredStudents = async (req, res) => {
  const { semester, year, branch } = req.query;
  let filter = { role: 'student' };
  if (semester) filter = { ...filter, semester };
  if (year) filter = { ...filter, year };
  if (branch) filter = { ...filter, branch };
  try {
    const students = await User.find(filter);
    res.status(200).json({ students });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch filtered students' });
  }
};
const User = require('../models/User');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'smartstudent761@gmail.com',
    pass: 'dzfv lqkd lqfn jepk'
  }
});

// Utility function to generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// ✅ Send OTP
exports.sendOtp = async (req, res) => {
  const { email, purpose } = req.body;

  try {
    let user = await User.findOne({ email });

      if (purpose === 'register') {
    if (user) {
      // ✅ Block if already registered
      if (user.name && user.password) {
        return res.status(409).json({ message: 'User already exists' });
      }
      // ✅ Allow resend if not yet registered
    } else {
      // ✅ First time registration
      user = new User({ email });
    }
  }
 else if (purpose === 'forgot-password') {
      if (!user) return res.status(404).json({ message: 'User not found' });
    } else {
      return res.status(400).json({ message: 'Invalid OTP purpose' });
    }

    const otp = generateOTP();
    const expiry = Date.now() + 5 * 60 * 1000;

    user.otp = otp;
    user.otpExpiry = expiry;
    await user.save();

    await transporter.sendMail({
      from: '"SmartStudent" <smartstudent761@gmail.com>',
      to: email,
      subject: 'Your OTP Code',
      html: `<p>Your OTP code is <b>${otp}</b>. It is valid for 5 minutes.</p>`
    });

    res.status(200).json({ success: true, message: 'OTP sent to email' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error sending OTP' });
  }
};

// ✅ Verify OTP
exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user || user.otp !== otp || user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Don't clear OTP here; registration/reset will clear it on success

    res.status(200).json({ success: true, message: 'OTP verified' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to verify OTP' });
  }
};

// ✅ Register User
// Register User — verify OTP again and then clear OTP fields
exports.registerUser = async (req, res) => {
  const { name, email, password, otp, role, semester, year, branch, rollNo } = req.body;
  // Require semester, year, branch, rollNo only for students
  if (role === 'student' || !role) {
    if (!semester || !year || !branch || !rollNo) {
      return res.status(400).json({ message: 'Semester, year, branch, and roll number are required for students.' });
    }
  }
  if (role === 'teacher') {
    // Ignore rollNo for teachers
    req.body.rollNo = undefined;
  }

  try {
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: 'Email not found. Please send OTP first.' });
    if (user.name) return res.status(409).json({ message: 'User already registered.' });

    if (user.otp !== otp || user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.name = name;
    user.password = await bcrypt.hash(password, 10);
    user.role = role || 'student';
    if (user.role === 'student') {
      user.semester = semester;
      user.year = year;
      user.branch = branch;
      user.rollNo = rollNo ? rollNo.toUpperCase() : undefined;
    } else {
      user.semester = undefined;
      user.year = undefined;
      user.branch = undefined;
      user.rollNo = undefined;
    }

    // Clear OTP after successful registration
    user.otp = null;
    user.otpExpiry = null;

    await user.save();

    res.status(201).json({ success: true, message: 'User registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Registration failed' });
  }
};


const jwt = require("jsonwebtoken");

// ✅ Login User
exports.loginUser = async (req, res) => {
  const { email, password, role } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !user.password) return res.status(400).json({ message: 'User not found' });

    if (role && user.role !== role) {
      return res.status(403).json({ message: `You are not registered as a ${role}.` });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    // ✅ Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role , name: user.name},
      process.env.JWT_SECRET || "smartstudentsecret",  // Use env in production
      { expiresIn: "1d" }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token, // ✅ Send token
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        semester: user.semester,
        year: user.year,
        branch: user.branch
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: 'Login failed' });
  }
};

// ✅ Reset Password
// Reset Password — verify OTP again and clear OTP fields on success
exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user || user.otp !== otp || user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.password = await bcrypt.hash(newPassword, 10);

    // Clear OTP after successful password reset
    user.otp = null;
    user.otpExpiry = null;

    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ message: 'Password reset failed' });
  }
};

exports.getAllStudents = async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }, 'name email _id semester year branch rollNo');
    res.status(200).json({ students });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch students' });
  }
};

