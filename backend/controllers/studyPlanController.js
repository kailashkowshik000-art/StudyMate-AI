import mongoose from "mongoose";
import StudyPlan from "../models/StudyPlan.js";
import LearningProfile from "../models/LearningProfile.js";
import { generateStudyPlan } from "../services/geminiService.js";
import { recordActivity } from "../services/learningAnalyticsService.js";

const getPlanQuery = (id) => {
  return mongoose.Types.ObjectId.isValid(id)
    ? { $or: [{ planId: id }, { _id: id }] }
    : { planId: id };
};

// @desc    Create a new custom study plan
// @route   POST /api/study-plans
// @access  Private
export const createStudyPlan = async (req, res, next) => {
  try {
    const { title, startDate, endDate, dailyTarget, tasks } = req.body;

    if (!title || !endDate) {
      return res.status(400).json({
        success: false,
        message: "title and endDate are required",
      });
    }

    const plan = await StudyPlan.create({
      userId: req.user.userId,
      title: title.trim(),
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: new Date(endDate),
      dailyTarget: Number(dailyTarget) || 60,
      tasks: Array.isArray(tasks) ? tasks : [],
      status: "active",
    });

    res.status(201).json({
      success: true,
      message: "Study plan created successfully",
      data: {
        plan,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all study plans for user
// @route   GET /api/study-plans
// @access  Private
export const getStudyPlans = async (req, res, next) => {
  try {
    const plans = await StudyPlan.find({ userId: req.user.userId }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      data: plans,
      plans,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single study plan by ID
// @route   GET /api/study-plans/:id
// @access  Private
export const getStudyPlanById = async (req, res, next) => {
  try {
    const plan = await StudyPlan.findOne(getPlanQuery(req.params.id));

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Study plan not found",
      });
    }

    if (plan.userId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You cannot access another user's study plan",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        plan,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update study plan
// @route   PUT /api/study-plans/:id
// @access  Private
export const updateStudyPlan = async (req, res, next) => {
  try {
    const plan = await StudyPlan.findOne(getPlanQuery(req.params.id));

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Study plan not found",
      });
    }

    if (plan.userId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You cannot update another user's study plan",
      });
    }

    const { title, dailyTarget, status, tasks, endDate } = req.body;
    if (title) plan.title = title.trim();
    if (dailyTarget) plan.dailyTarget = Number(dailyTarget);
    if (status) plan.status = status;
    if (endDate) plan.endDate = new Date(endDate);
    if (Array.isArray(tasks)) plan.tasks = tasks;

    await plan.save();

    res.status(200).json({
      success: true,
      message: "Study plan updated successfully",
      data: {
        plan,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle completion of a task in study plan
// @route   PATCH /api/study-plans/:id/tasks/:taskId
// @access  Private
export const toggleTaskCompleted = async (req, res, next) => {
  try {
    const plan = await StudyPlan.findOne(getPlanQuery(req.params.id));

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Study plan not found",
      });
    }

    if (plan.userId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You cannot update another user's study plan",
      });
    }

    const task = plan.tasks.find((t) => t.taskId === req.params.taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found in study plan",
      });
    }

    const isNowCompleted = req.body.completed !== undefined ? !!req.body.completed : !task.completed;
    task.completed = isNowCompleted;
    task.completedAt = isNowCompleted ? new Date() : null;

    await plan.save();

    if (isNowCompleted) {
      // Record study activity
      await recordActivity({
        userId: req.user.userId,
        activityType: "study_session",
        topic: task.topic,
        duration: task.estimatedMinutes || 25,
        metadata: {
          taskId: task.taskId,
          planId: plan.planId,
          subject: task.subject,
        },
      });
    }

    const planObj = plan.toObject();
    res.status(200).json({
      success: true,
      message: `Task marked as ${task.completed ? "completed" : "incomplete"}`,
      data: {
        ...planObj,
        task,
        plan: planObj,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete study plan
// @route   DELETE /api/study-plans/:id
// @access  Private
export const deleteStudyPlan = async (req, res, next) => {
  try {
    const plan = await StudyPlan.findOne(getPlanQuery(req.params.id));

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Study plan not found",
      });
    }

    if (plan.userId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You cannot delete another user's study plan",
      });
    }

    await StudyPlan.deleteOne({ _id: plan._id });

    res.status(200).json({
      success: true,
      message: "Study plan deleted successfully",
      data: {
        planId: plan.planId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate personalized AI study plan
// @route   POST /api/study-plans/generate
// @access  Private
export const generateAiStudyPlan = async (req, res, next) => {
  try {
    const { subjects, examDate, dailyMinutes, priorityTopics } = req.body;

    // Fetch user learning profile to integrate identified weak topics
    const profile = await LearningProfile.findOne({ userId: req.user.userId }).lean();

    const subjectList =
      Array.isArray(subjects) && subjects.length > 0
        ? subjects
        : profile?.currentSubjects && profile.currentSubjects.length > 0
        ? profile.currentSubjects
        : ["Computer Science"];

    const targetDate = examDate ? new Date(examDate) : new Date(Date.now() + 14 * 86400000);
    const targetMinutes = Number(dailyMinutes) || profile?.dailyStudyTarget || 60;
    const weakTopics = profile?.weakTopics || [];

    // Generate through Gemini AI (with validation & fallback)
    const generated = await generateStudyPlan({
      subjects: subjectList,
      examDate: targetDate,
      dailyMinutes: targetMinutes,
      priorityTopics: Array.isArray(priorityTopics) ? priorityTopics : [],
      weakTopics,
    });

    // Archive previous active plans if requested or replace
    await StudyPlan.updateMany(
      { userId: req.user.userId, status: "active" },
      { $set: { status: "archived" } }
    );

    // Save newly generated plan
    const newPlan = await StudyPlan.create({
      userId: req.user.userId,
      title: generated.title || "Personalized Exam Preparation Plan",
      startDate: new Date(),
      endDate: targetDate,
      dailyTarget: targetMinutes,
      tasks: generated.tasks,
      status: "active",
    });

    const planObj = newPlan.toObject();
    res.status(201).json({
      success: true,
      message: "AI Study plan generated and saved successfully",
      data: {
        ...planObj,
        plan: planObj,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createStudyPlan,
  getStudyPlans,
  getStudyPlanById,
  updateStudyPlan,
  toggleTaskCompleted,
  deleteStudyPlan,
  generateAiStudyPlan,
};
