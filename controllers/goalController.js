const Goal = require("../models/Goal");
const User = require("../models/User");
const mongoose = require("mongoose");

// GET /api/goals/student/:studentId - Get all goals for a user (student or teacher)
const getStudentGoals = async (req, res) => {
  try {
    const { studentId } = req.params; // This is actually userId (works for both students and teachers)
    const { status, category, priority } = req.query;

    // Build filter object
    let filter = { student: studentId };
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;

    const goals = await Goal.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ goals });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch goals", error: err.message });
  }
};

// POST /api/goals - Create a new goal
const createGoal = async (req, res) => {
  try {
    const { title, description, student, priority, category, dueDate, tags } =
      req.body;

    if (!title || !student) {
      return res
        .status(400)
        .json({ message: "Title and student are required" });
    }

    // Validate due date - should not be in the past
    if (dueDate) {
      const dueDateObj = new Date(dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to start of today to allow today as valid due date

      if (dueDateObj < today) {
        return res
          .status(400)
          .json({ message: "Due date cannot be in the past" });
      }
    }

    const goal = new Goal({
      title,
      description,
      student,
      priority: priority || "medium",
      category: category || "academic",
      dueDate: dueDate ? new Date(dueDate) : undefined,
      tags: tags || [],
    });

    await goal.save();
    res.status(201).json({ message: "Goal created successfully", goal });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to create goal", error: err.message });
  }
};

// PUT /api/goals/:goalId - Update a goal
const updateGoal = async (req, res) => {
  try {
    const { goalId } = req.params;
    const { title, description, priority, category, status, dueDate, tags } =
      req.body;

    const goal = await Goal.findById(goalId);
    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    // Store previous status to check for completion
    const previousStatus = goal.status;

    // Update fields
    if (title) goal.title = title;
    if (description !== undefined) goal.description = description;
    if (priority) goal.priority = priority;
    if (category) goal.category = category;
    if (status) {
      goal.status = status;
      // Set completedAt when status changes to completed
      if (status === "completed" && previousStatus !== "completed") {
        goal.completedAt = new Date();
      } else if (status !== "completed") {
        goal.completedAt = undefined;
      }
    }
    if (dueDate !== undefined)
      goal.dueDate = dueDate ? new Date(dueDate) : undefined;
    if (tags !== undefined) goal.tags = tags;

    await goal.save();
    res.status(200).json({ message: "Goal updated successfully", goal });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to update goal", error: err.message });
  }
};

// DELETE /api/goals/:goalId - Delete a goal
const deleteGoal = async (req, res) => {
  try {
    const { goalId } = req.params;

    const goal = await Goal.findByIdAndDelete(goalId);
    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    res.status(200).json({ message: "Goal deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to delete goal", error: err.message });
  }
};

// GET /api/goals/analytics/:studentId - Get analytics data for a user (student or teacher)
const getGoalAnalytics = async (req, res) => {
  try {
    const { studentId } = req.params; // This is actually userId (works for both students and teachers)
    const { timeframe = "30" } = req.query; // default to 30 days

    const daysAgo = parseInt(timeframe);
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - daysAgo);

    // Get goal statistics
    const totalGoals = await Goal.countDocuments({ student: studentId });
    const completedGoals = await Goal.countDocuments({
      student: studentId,
      status: "completed",
    });
    const pendingGoals = await Goal.countDocuments({
      student: studentId,
      status: "pending",
    });
    const inProgressGoals = await Goal.countDocuments({
      student: studentId,
      status: "in-progress",
    });

    // Get goals completed in timeframe
    const completedInTimeframe = await Goal.countDocuments({
      student: studentId,
      status: "completed",
      completedAt: { $gte: fromDate },
    });

    // Get daily completion data for the last 7 days (simpler approach)
    const dailyCompletions = await Goal.aggregate([
      {
        $match: {
          student: new mongoose.Types.ObjectId(studentId),
          status: "completed",
          completedAt: { $gte: fromDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$completedAt",
              timezone: "Asia/Kolkata", // Adjust timezone as needed
            },
          },
          completions: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
      {
        $limit: 7,
      },
    ]);

    // Get category-wise statistics (simplified)
    const categoryStats = await Goal.aggregate([
      {
        $match: { student: new mongoose.Types.ObjectId(studentId) },
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    // Get priority-wise statistics (simplified)
    const priorityStats = await Goal.aggregate([
      {
        $match: { student: new mongoose.Types.ObjectId(studentId) },
      },
      {
        $group: {
          _id: "$priority",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    // Calculate completion rate
    const completionRate =
      totalGoals > 0 ? ((completedGoals / totalGoals) * 100).toFixed(1) : 0;

    res.status(200).json({
      totalGoals,
      completedGoals,
      pendingGoals,
      inProgressGoals,
      completionRate: parseFloat(completionRate),
      completedInTimeframe,
      dailyCompletions,
      categoryStats,
      priorityStats,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch analytics", error: err.message });
  }
};

module.exports = {
  getStudentGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  getGoalAnalytics,
};
