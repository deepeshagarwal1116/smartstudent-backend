const express = require('express');
const router = express.Router();
const { 
  upload,
  requireTeacher,
  uploadAssignment,
  getAssignmentsForStudent,
  submitAssignment,
  getTeacherSubmissions,
  gradeSubmission,
  getAssignmentsByTeacher   // ✅ Add this missing import
} = require('../controllers/assignmentController');

// POST /api/assignments/upload (file or link)
router.post('/upload', upload.single('file'), requireTeacher, uploadAssignment);

// GET /api/assignments/student/:studentId
router.get('/student/:studentId', getAssignmentsForStudent);

// POST /api/assignments/submit (student submits answer/file)
router.post('/submit', upload.single('file'), submitAssignment);

// GET /api/assignments/teacher/:teacherId/submissions
router.get('/teacher/:teacherId/submissions', getTeacherSubmissions);

// POST /api/assignments/grade (teacher grades a submission)
router.post('/grade', gradeSubmission);

router.get('/teacher/:teacherId/assignments', getAssignmentsByTeacher);


module.exports = router; 