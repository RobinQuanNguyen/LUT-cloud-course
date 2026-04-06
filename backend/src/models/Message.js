import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    text: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    image: {
      type: String,
      trim: true,
      default: "",
    },
    riskAnalysis: {
      risk_score: {
        type: Number,
        default: 0,
      },
      risk_level: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "low",
      },
      flags: {
        type: [String],
        default: [],
      },
      explanations: {
        type: [String],
        default: [],
      },
    },
  },
  {
    timestamps: true,
    strict: "throw",
  }
);

messageSchema.index({ senderId: 1, receiverId: 1, createdAt: 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;