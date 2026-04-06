import cloudinary from "../lib/cloudinary.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import { AppError } from "../lib/errors.js";
import { analyzeMessageRisk } from "../lib/chatSafety.js";

export const getAllContacts = async (req, res, next) => {
  try {
    const filteredUsers = await User.find({ _id: { $ne: req.user._id } })
      .select("-password")
      .sort({ fullName: 1 });

    res.status(200).json(filteredUsers);
  } catch (error) {
    next(error);
  }
};

export const getMessagesByUserId = async (req, res, next) => {
  try {
    const myId = req.user._id;
    const userToChatId = req.params.id;

    const receiverExists = await User.exists({ _id: userToChatId });
    if (!receiverExists) {
      throw new AppError(404, "User not found");
    }

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const { text, image } = req.body;
    const receiverId = req.params.id;
    const senderId = req.user._id;

    const receiverExists = await User.exists({ _id: receiverId });
    if (!receiverExists) {
      throw new AppError(404, "Receiver not found");
    }

    let imageUrl = "";

    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image, {
        folder: "chatify/messages",
        resource_type: "image",
      });
      imageUrl = uploadResponse.secure_url;
    }

    const shouldAnalyzeText = typeof text === "string" && text.trim().length > 0;

    let riskAnalysis = {
      risk_score: 0,
      risk_level: "low",
      flags: [],
      explanations: [],
    };

    if (shouldAnalyzeText) {
      riskAnalysis = await analyzeMessageRisk({
        messageId: null,
        senderId: senderId.toString(),
        text: text.trim(),
      });
      const blockedFlags = ["spam_detected", "phishing_suspected", "abusive_language"];
      const shouldBlockMessage =
        riskAnalysis.risk_level === "high" ||
        riskAnalysis.flags.some((flag) => blockedFlags.includes(flag));

      if (shouldBlockMessage) {
        return res.status(400).json({
          message: "Message blocked due to safety risk",
          riskAnalysis: {
            risk_score: riskAnalysis.risk_score,
            risk_level: riskAnalysis.risk_level,
            flags: riskAnalysis.flags,
            explanations: riskAnalysis.explanations,
          },
        });
      }
    }

    const newMessage = await Message.create({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      riskAnalysis: {
        risk_score: riskAnalysis.risk_score,
        risk_level: riskAnalysis.risk_level,
        flags: riskAnalysis.flags,
        explanations: riskAnalysis.explanations,
      },
    });

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json({ message: "Message sent successfully", data: newMessage });
  } catch (error) {
    next(error);
  }
};

export const getChatPartners = async (req, res, next) => {
  try {
    const myId = req.user._id.toString();

    const messages = await Message.find({
      $or: [{ senderId: myId }, { receiverId: myId }],
    }).sort({ updatedAt: -1 });

    const chatPartnerIds = [
      ...new Set(
        messages.map((message) =>
          message.senderId.toString() === myId ? message.receiverId.toString() : message.senderId.toString()
        )
      ),
    ];

    const chatPartners = await User.find({ _id: { $in: chatPartnerIds } })
      .select("-password")
      .sort({ fullName: 1 });

    res.status(200).json(chatPartners);
  } catch (error) {
    next(error);
  }
};