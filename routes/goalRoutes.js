const express = require("express");
const router = express.Router();
const {
  getStudentGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  getGoalAnalytics,
} = require("../controllers/goalController");

// GET /api/goals/student/:studentId - Get all goals for a student
router.get("/student/:studentId", getStudentGoals);

// POST /api/goals - Create a new goal
router.post("/", createGoal);

// PUT /api/goals/:goalId - Update a goal
router.put("/:goalId", updateGoal);

// DELETE /api/goals/:goalId - Delete a goal
router.delete("/:goalId", deleteGoal);

// GET /api/goals/analytics/:studentId - Get analytics data for a student
router.get("/analytics/:studentId", getGoalAnalytics);

module.exports = router;
