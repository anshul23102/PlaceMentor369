import mongoose from "mongoose";

const mockInterviewSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true
    },

    // Alumni/mentor conducting the mock interview (optional — can be self-practice)
    mentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    // Target company/role this mock interview is preparing for
    targetCompany: { type: String, default: "" },
    targetRole: { type: String, default: "" },

    scheduledAt: {
      type: Date,
      required: true
    },

    durationMinutes: {
      type: Number,
      default: 30,
      min: 15,
      max: 120
    },

    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled", "no-show"],
      default: "scheduled"
    },

    // Questions asked during this session, drawn from the question bank
    questionsAsked: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "InterviewQuestion"
      }
    ],

    // Structured feedback after the session
    feedback: {
      clarity: { type: Number, min: 1, max: 5, default: null },
      confidence: { type: Number, min: 1, max: 5, default: null },
      technicalAccuracy: { type: Number, min: 1, max: 5, default: null },
      overallRating: { type: Number, min: 1, max: 5, default: null },
      comments: { type: String, default: "" },
      submittedAt: { type: Date, default: null }
    },

    recordingUrl: { type: String, default: "" }
  },
  { timestamps: true }
);

// A student cannot double-book overlapping mock interview slots at the exact same time
mockInterviewSchema.index({ student: 1, scheduledAt: 1 });

export default mongoose.models.MockInterview || mongoose.model("MockInterview", mockInterviewSchema);
