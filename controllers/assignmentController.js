const Assignment = require("../models/Assignment");
const User = require("../models/User");
const path = require("path");
const fs = require("fs");

// File upload setup (multer)
const multer = require("multer");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// Middleware to check teacher role
const requireTeacher = async (req, res, next) => {
  const user = await User.findById(req.body.uploadedBy || req.user?._id);
  if (!user || user.role !== "teacher") {
    return res
      .status(403)
      .json({ message: "Only teachers can upload assignments." });
  }
  next();
};

// POST /api/assignments/upload (file or link)
const uploadAssignment = async (req, res) => {
  try {
    const { title, description, link, uploadedBy, assignedTo, deadline } =
      req.body;
    let fileUrl = null;
    if (req.file) {
      fileUrl = `/uploads/${req.file.filename}`;
    }
    if (!title || (!fileUrl && !link)) {
      return res
        .status(400)
        .json({ message: "Title and file or link required." });
    }
    let assignedToArr = [];
    if (assignedTo) {
      try {
        assignedToArr = Array.isArray(assignedTo)
          ? assignedTo
          : JSON.parse(assignedTo);
      } catch {
        assignedToArr = [];
      }
    }
    const assignment = new Assignment({
      title,
      description,
      fileUrl,
      link,
      uploadedBy,
      assignedTo: assignedToArr,
      deadline: deadline ? new Date(deadline) : undefined,
      status: "active",
    });
    await assignment.save();
    res
      .status(201)
      .json({ message: "Assignment uploaded successfully.", assignment });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error uploading assignment", error: err.message });
  }
};

// GET /api/assignments/student/:studentId
const getAssignmentsForStudent = async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const assignments = await Assignment.find({ assignedTo: studentId })
      .populate("uploadedBy", "name email")
      .sort({ assignedDate: -1 });
    res.status(200).json({ assignments });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch assignments for student" });
  }
};

// POST /api/assignments/submit
const submitAssignment = async (req, res) => {
  try {
    const { assignmentId, studentId, answer } = req.body;
    let fileUrl = null;
    if (req.file) {
      fileUrl = `/uploads/${req.file.filename}`;
    }
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment)
      return res.status(404).json({ message: "Assignment not found" });
    // Remove previous submission by this student if exists
    assignment.submissions = assignment.submissions.filter(
      (s) => s.student.toString() !== studentId
    );
    assignment.submissions.push({
      student: studentId,
      answer: answer || "",
      fileUrl,
      status: "submitted",
      marks: null,
    });
    // assignment.status = 'submitted';
    await assignment.save();
    res.status(200).json({ message: "Submission successful" });
  } catch (err) {
    res.status(500).json({ message: "Submission failed", error: err.message });
  }
};

// GET /api/assignments/teacher/:teacherId/submissions?status=pending|completed
const getTeacherSubmissions = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { status } = req.query;
    const assignments = await Assignment.find({
      uploadedBy: teacherId,
    }).populate(
      "submissions.student",
      "name rollNo email semester year branch"
    );

    let submissions = [];

    for (const a of assignments) {
      const isPastDeadline = a.deadline && new Date(a.deadline) <= new Date();

      // Auto-grade 0 marks for students who missed the deadline
      if (isPastDeadline) {
        for (const studentId of a.assignedTo) {
          const alreadySubmitted = a.submissions.some(
            (s) =>
              (s.student._id?.toString() || s.student.toString()) ===
              studentId.toString()
          );

          if (!alreadySubmitted) {
            a.submissions.push({
              student: studentId,
              answer: "",
              fileUrl: "",
              marks: 0,
              status: "reviewed",
            });
          }
        }
        await a.save();
      }

      // Go through each submission
      for (const s of a.submissions) {
        let show = false;

        if (status === "tobereviewed") {
          show = s.status === "submitted";
        } else if (status === "reviewed") {
          show = s.status === "reviewed";
        } else if (status === "active") {
          show = !isPastDeadline;
        } else if (status === "nonactive") {
          show = isPastDeadline;
        } else {
          show = true; // fallback - show all
        }

        if (show) {
          submissions.push({
            assignmentId: a._id,
            assignmentTitle: a.title,
            assignmentFileUrl: a.fileUrl, // 👈 ADD THIS LINE
            student: s.student,
            answer: s.answer,
            fileUrl: s.fileUrl,
            marks: s.marks,
            status: s.status,
            deadline: a.deadline,
          });
        }
      }
    }

    res.status(200).json({ submissions });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch submissions" });
  }
};

// POST /api/assignments/grade
const gradeSubmission = async (req, res) => {
  try {
    const { assignmentId, studentId, marks } = req.body;
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment)
      return res.status(404).json({ message: "Assignment not found" });
    const submission = assignment.submissions.find(
      (s) => s.student.toString() === studentId
    );
    if (!submission)
      return res.status(404).json({ message: "Submission not found" });
    submission.marks = marks;
    submission.status = "reviewed";
    // If all submissions are reviewed, set assignment status to reviewed
    if (assignment.submissions.every((s) => s.status === "reviewed")) {
      assignment.status = "reviewed";
    } else {
      assignment.status = "under_review";
    }
    await assignment.save();
    res.status(200).json({ message: "Graded successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to grade submission" });
  }
};

// GET /api/assignments/teacher/:teacherId/assignments
const getAssignmentsByTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const assignments = await Assignment.find({ uploadedBy: teacherId }).sort({
      assignedDate: -1,
    });

    // Normalize today's date to midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const active = assignments.filter((a) => {
      const deadline = new Date(a.deadline);
      deadline.setHours(0, 0, 0, 0);
      return deadline >= today;
    });

    const nonactive = assignments.filter((a) => {
      const deadline = new Date(a.deadline);
      deadline.setHours(0, 0, 0, 0);
      return deadline < today;
    });

    res.status(200).json({ active, nonactive });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch assignments", error: err.message });
  }
};

module.exports = {
  upload,
  requireTeacher,
  uploadAssignment,
  getAssignmentsForStudent,
  submitAssignment,
  getTeacherSubmissions,
  gradeSubmission,
  getAssignmentsByTeacher,
};
