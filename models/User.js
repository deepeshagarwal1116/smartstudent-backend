const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true
  },
  semester: {
    type: String,
    trim: true
  },
  year: {
    type: String,
    trim: true
  },
  branch: {
    type: String,
    trim: true
  },
  rollNo: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: function () {
      return this.otp === undefined;
    }
  },
  role: {
    type: String,
    enum: ['student', 'teacher'],
    default: 'student'
  },
  otp: String,
  otpExpiry: Date
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
