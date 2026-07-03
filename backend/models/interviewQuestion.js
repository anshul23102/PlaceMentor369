import mongoose from "mongoose";

const interviewQuestionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true
    },

    category: {
      type: String,
      enum: ["behavioral", "technical", "hr", "case-study", "system-design"],
      required: true
    },

    // Optional company/role scoping so questions can be targeted
    company: { type: String, default: "" },
    role: { type: String, default: "" },

    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium"
    },

    // Suggested guidance for answering (e.g. STAR method pointers)
    preparationTips: { type: String, default: "" },

    tags: [{ type: String, trim: true }]
  },
  { timestamps: true }
);

interviewQuestionSchema.index({ category: 1, company: 1, role: 1 });

export default mongoose.models.InterviewQuestion || mongoose.model("InterviewQuestion", interviewQuestionSchema);
