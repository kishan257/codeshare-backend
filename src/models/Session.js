import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    language: {
      type: String,
      default: "javascript"
    },
    code: {
      type: String,
      default: "// Start coding here"
    },
    buffers: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({})
    }
  },
  {
    timestamps: true
  }
);

export const Session = mongoose.models.Session || mongoose.model("Session", sessionSchema);
