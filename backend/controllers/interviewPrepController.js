import MockInterview from "../models/mockInterview.js";
import InterviewQuestion from "../models/interviewQuestion.js";

/**
 * Static preparation guidance content: technique guides that don't need
 * to live in the database since they rarely change.
 */
const PREPARATION_GUIDES = {
  "star-method": {
    title: "The STAR Method",
    summary: "Structure behavioral answers around Situation, Task, Action, Result.",
    steps: [
      "Situation: Briefly set the context — where and when this happened.",
      "Task: Describe your specific responsibility or goal in that situation.",
      "Action: Explain the concrete steps you took, focusing on your contribution.",
      "Result: Share the outcome, ideally with a measurable impact, and what you learned."
    ]
  },
  "elevator-pitch": {
    title: "Crafting Your Elevator Pitch",
    summary: "A 30-60 second introduction that highlights who you are and your value.",
    steps: [
      "Open with your name, degree, and current focus area.",
      "Highlight one or two achievements relevant to the role you're targeting.",
      "Mention what you're looking for and why this company/role interests you.",
      "Keep it under 90 seconds and practice out loud, not just in your head."
    ]
  },
  "body-language": {
    title: "Body Language & Presence",
    summary: "Non-verbal cues that reinforce confidence during interviews.",
    steps: [
      "Maintain steady eye contact with the camera or interviewer, not the screen.",
      "Sit upright with shoulders relaxed — avoid crossing arms.",
      "Use natural hand gestures to emphasize points, but avoid fidgeting.",
      "Pause briefly before answering instead of filling silence with filler words."
    ]
  },
  "technical-prep": {
    title: "Technical Interview Preparation",
    summary: "How to approach technical and system-design rounds methodically.",
    steps: [
      "Clarify the problem and constraints out loud before writing any code.",
      "Talk through your approach and trade-offs before implementing.",
      "Test your solution with edge cases once done, narrating your reasoning.",
      "For system design, start with requirements, then high-level architecture, then drill into components."
    ]
  }
};

/**
 * GET /api/interview-prep/guides
 * Returns all preparation technique guides.
 */
export const getPreparationGuides = (req, res) => {
  res.status(200).json({ guides: PREPARATION_GUIDES });
};

/**
 * GET /api/interview-prep/guides/:guideKey
 * Returns a single preparation guide by key.
 */
export const getPreparationGuideByKey = (req, res) => {
  const { guideKey } = req.params;
  const guide = PREPARATION_GUIDES[guideKey];

  if (!guide) {
    return res.status(404).json({ message: "Preparation guide not found" });
  }

  res.status(200).json({ guideKey, ...guide });
};

/**
 * POST /api/interview-prep/schedule
 * Student books a mock interview slot.
 */
export const scheduleMockInterview = async (req, res) => {
  try {
    const studentId = req.user._id;
    const { scheduledAt, durationMinutes, targetCompany, targetRole, mentorId } = req.body;

    if (!scheduledAt) {
      return res.status(400).json({ message: "scheduledAt is required" });
    }

    const slotTime = new Date(scheduledAt);
    if (slotTime <= new Date()) {
      return res.status(400).json({ message: "Scheduled time must be in the future" });
    }

    // Prevent double-booking the exact same slot for the same student
    const existing = await MockInterview.findOne({
      student: studentId,
      scheduledAt: slotTime,
      status: "scheduled"
    });
    if (existing) {
      return res.status(409).json({ message: "You already have a mock interview scheduled at this time" });
    }

    const mockInterview = await MockInterview.create({
      student: studentId,
      mentor: mentorId || null,
      targetCompany: targetCompany || "",
      targetRole: targetRole || "",
      scheduledAt: slotTime,
      durationMinutes: durationMinutes || 30,
      status: "scheduled"
    });

    res.status(201).json({
      success: true,
      message: "Mock interview scheduled successfully",
      mockInterview
    });
  } catch (err) {
    console.error("Schedule mock interview error:", err);
    res.status(500).json({ message: "Failed to schedule mock interview" });
  }
};

/**
 * GET /api/interview-prep/my-sessions
 * Student views their own scheduled/completed mock interviews.
 */
export const getMySessions = async (req, res) => {
  try {
    const studentId = req.user._id;
    const sessions = await MockInterview.find({ student: studentId })
      .populate("mentor", "name email")
      .populate("questionsAsked")
      .sort({ scheduledAt: -1 });

    res.status(200).json(sessions);
  } catch (err) {
    console.error("Get sessions error:", err);
    res.status(500).json({ message: "Failed to fetch mock interview sessions" });
  }
};

/**
 * PATCH /api/interview-prep/:id/cancel
 * Student cancels a scheduled mock interview.
 */
export const cancelMockInterview = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user._id;

    const session = await MockInterview.findOne({ _id: id, student: studentId });
    if (!session) return res.status(404).json({ message: "Mock interview session not found" });

    if (session.status !== "scheduled") {
      return res.status(400).json({ message: "Only scheduled sessions can be cancelled" });
    }

    session.status = "cancelled";
    await session.save();

    res.status(200).json({ success: true, message: "Mock interview cancelled", session });
  } catch (err) {
    console.error("Cancel mock interview error:", err);
    res.status(500).json({ message: "Failed to cancel mock interview" });
  }
};

/**
 * PATCH /api/interview-prep/:id/feedback
 * Mentor (or self-assessment) submits structured feedback after a session,
 * marking it completed.
 */
export const submitInterviewFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { clarity, confidence, technicalAccuracy, overallRating, comments } = req.body;

    const ratings = [clarity, confidence, technicalAccuracy, overallRating];
    for (const rating of ratings) {
      if (rating !== undefined && (rating < 1 || rating > 5)) {
        return res.status(400).json({ message: "Ratings must be between 1 and 5" });
      }
    }

    const session = await MockInterview.findById(id);
    if (!session) return res.status(404).json({ message: "Mock interview session not found" });

    session.feedback = {
      clarity: clarity ?? session.feedback.clarity,
      confidence: confidence ?? session.feedback.confidence,
      technicalAccuracy: technicalAccuracy ?? session.feedback.technicalAccuracy,
      overallRating: overallRating ?? session.feedback.overallRating,
      comments: comments || session.feedback.comments,
      submittedAt: new Date()
    };
    session.status = "completed";

    await session.save();

    res.status(200).json({ success: true, message: "Feedback submitted", session });
  } catch (err) {
    console.error("Submit feedback error:", err);
    res.status(500).json({ message: "Failed to submit feedback" });
  }
};

/**
 * GET /api/interview-prep/performance
 * Tracks a student's improvement across multiple mock interview attempts.
 */
export const getPerformanceMetrics = async (req, res) => {
  try {
    const studentId = req.user._id;
    const completedSessions = await MockInterview.find({
      student: studentId,
      status: "completed",
      "feedback.overallRating": { $ne: null }
    }).sort({ scheduledAt: 1 });

    if (completedSessions.length === 0) {
      return res.status(200).json({
        totalCompleted: 0,
        averageOverallRating: null,
        trend: []
      });
    }

    const trend = completedSessions.map(s => ({
      date: s.scheduledAt,
      overallRating: s.feedback.overallRating,
      clarity: s.feedback.clarity,
      confidence: s.feedback.confidence,
      technicalAccuracy: s.feedback.technicalAccuracy
    }));

    const averageOverallRating =
      completedSessions.reduce((sum, s) => sum + (s.feedback.overallRating || 0), 0) / completedSessions.length;

    res.status(200).json({
      totalCompleted: completedSessions.length,
      averageOverallRating: Number(averageOverallRating.toFixed(2)),
      trend
    });
  } catch (err) {
    console.error("Performance metrics error:", err);
    res.status(500).json({ message: "Failed to compute performance metrics" });
  }
};

/**
 * GET /api/interview-prep/questions
 * Returns interview questions, optionally filtered by company/role/category.
 */
export const getQuestionBank = async (req, res) => {
  try {
    const { company, role, category, difficulty } = req.query;
    const filter = {};

    if (company) filter.company = company;
    if (role) filter.role = role;
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;

    const questions = await InterviewQuestion.find(filter).limit(50);
    res.status(200).json(questions);
  } catch (err) {
    console.error("Get question bank error:", err);
    res.status(500).json({ message: "Failed to fetch question bank" });
  }
};

/**
 * POST /api/interview-prep/questions
 * Admin/mentor adds a new question to the bank.
 */
export const addQuestion = async (req, res) => {
  try {
    const { question, category, company, role, difficulty, preparationTips, tags } = req.body;

    if (!question || !category) {
      return res.status(400).json({ message: "question and category are required" });
    }

    const newQuestion = await InterviewQuestion.create({
      question,
      category,
      company: company || "",
      role: role || "",
      difficulty: difficulty || "medium",
      preparationTips: preparationTips || "",
      tags: tags || []
    });

    res.status(201).json({ success: true, question: newQuestion });
  } catch (err) {
    console.error("Add question error:", err);
    res.status(500).json({ message: "Failed to add question" });
  }
};
