const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    answer: String,
    fileUrl: String,
    marks: Number,
    status: {
      type: String,
      enum: ["submitted", "under_review", "reviewed"],
      default: "submitted",
    },
  },
  { _id: false }
);

const assignmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: String,
    fileUrl: String, // For uploaded file
    link: String, // For external link
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedTo: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    deadline: {
      type: Date,
      required: false,
    },
    assignedDate: {
      type: Date,
      default: Date.now,
    },
    submissions: [submissionSchema],
    status: {
      type: String,
      enum: ["active", "submitted", "under_review", "reviewed"],
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Assignment", assignmentSchema);
