const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.registerUser); // ✅ NEW
router.post('/send-otp', authController.sendOtp);
router.post('/verify-otp', authController.verifyOtp);
router.post('/reset-password', authController.resetPassword);
router.post('/login', authController.loginUser);
router.get('/students', authController.getAllStudents);
router.get('/students/filter', authController.getFilteredStudents);

module.exports = router;
