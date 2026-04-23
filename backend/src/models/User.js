import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    profilePic: {
      type: String,
      default: "",
      trim: true,
    },
    contentFilter: {
      type: Boolean,
      default: false,  // off by default — users opt in
    },
  },
  {
    timestamps: true,
    strict: "throw",
  }
);

const User = mongoose.model("User", userSchema);

export default User;