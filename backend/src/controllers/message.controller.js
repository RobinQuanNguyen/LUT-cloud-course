import cloudinary from "../lib/cloudinary.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import { AppError } from "../lib/errors.js";
import { moderateText } from "../lib/moderation.js";
import { analyzeSafety } from "../utils/analyzeSafety.js";

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

    // Check content - toxic words replace, spam/phishing block
    let finalText = text;
    if (text && text.trim()) {
      try {

        // Get receiver to check their content filter setting
        const receiver = await User.findById(receiverId).select("contentFilter");

        // Call both services in parallel
        const [modResult, safetyResult] = await Promise.all([
          receiver?.contentFilter ? moderateText(text) : Promise.resolve(null),
          analyzeSafety(text, null, senderId.toString()),
        ]);

        // Toxic words → replace with asterisks (only if receiver has filter on)
        if (receiver?.contentFilter && modResult?.flagged) {
          finalText = "********";
          console.log("Message moderated (toxic words replaced)");
        }

        // Spam/Phishing detected → block the message
        const hasSpam = safetyResult?.flags?.includes("spam_detected");
        const hasPhishing = safetyResult?.flags?.includes("phishing_suspected");

        if (hasSpam || hasPhishing) {
          console.log("Message blocked (spam/phishing detected):", {
            riskLevel: safetyResult.risk_level,
            flags: safetyResult.flags,
            explanations: safetyResult.explanations,
          });
          throw new AppError(400, "Message blocked due to suspicious content");
        }
      } catch (err) {
        if (err instanceof AppError) throw err;
        console.error("Content filter check failed:", err.message);
      }
    }

    let imageUrl = "";

    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image, {
        folder: "chatify/messages",
        resource_type: "image",
      });
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = await Message.create({
      senderId,
      receiverId,
      text: finalText,  // censored text if flagged
      image: imageUrl,
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