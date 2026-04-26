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
    })
      .populate("senderId", "fullName profilePic")
      .sort({ createdAt: 1 });

    // Get filter settings for both current user and chat partner
    const currentUser = await User.findById(myId).select("contentFilter");
    const chatPartner = await User.findById(userToChatId).select("contentFilter");

    // Helper to censor text if toxic
    const censorIfToxic = async (textToCheck) => {
      if (!textToCheck || !textToCheck.trim()) return textToCheck;
      try {
        const modResult = await moderateText(textToCheck);
        return modResult?.flagged ? "********" : textToCheck;
      } catch {
        return textToCheck;
      }
    };

    // For each message, check if it should be censored based on sender/receiver filter
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const senderId = msg.senderId._id?.toString() || msg.senderId.toString();
      const receiverId = msg.receiverId._id ? msg.receiverId._id.toString() : msg.receiverId.toString();
      const isSentByMe = senderId === myId.toString();

      // Get sender's filter setting
      let senderHasFilter = false;
      if (isSentByMe) {
        senderHasFilter = currentUser?.contentFilter || false;
      } else {
        senderHasFilter = chatPartner?.contentFilter || false;
      }

      // If SENDER has filter ON → censor for everyone
      // If RECEIVER (current user) has filter ON and SENDER doesn't → only current user sees ***
      if (msg.text && msg.text.trim()) {
        if (senderHasFilter) {
          msg.text = await censorIfToxic(msg.text);
        } else if (receiverId === myId.toString() && currentUser?.contentFilter) {
          // Receiver has filter but sender doesn't → only receiver sees censored
          msg.text = await censorIfToxic(msg.text);
        }
      }
    }

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

    let finalText = text;

    // Spam/Phishing check - ALWAYS block regardless of filter setting
    if (text && text.trim()) {
      try {
        const safetyResult = await analyzeSafety(text, null, senderId.toString());

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
        console.error("Safety check failed:", err.message);
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

    // Always store original text in DB
    const newMessage = await Message.create({
      senderId,
      receiverId,
      text: finalText,
      image: imageUrl,
    });

    await newMessage.populate("senderId", "fullName profilePic");

    // Get both users' content filter settings
    const [sender, receiver] = await Promise.all([
      User.findById(senderId).select("contentFilter"),
      User.findById(receiverId).select("contentFilter"),
    ]);

    // Helper to censor text if toxic
    const censorIfToxic = async (textToCheck) => {
      if (!textToCheck || !textToCheck.trim()) return textToCheck;
      try {
        const modResult = await moderateText(textToCheck);
        return modResult?.flagged ? "********" : textToCheck;
      } catch {
        return textToCheck;
      }
    };

    let senderResponse = newMessage.toObject();
    let receiverMessage = newMessage.toObject();

    // If SENDER has filter ON → both sides see ***
    if (sender?.contentFilter) {
      const censoredText = await censorIfToxic(text);
      senderResponse.text = censoredText;
      receiverMessage.text = censoredText;
      console.log("Message censored (sender has filter ON) - both sides see ***");
    }
    // If only RECEIVER has filter ON → only receiver sees ***
    else if (receiver?.contentFilter) {
      const censoredText = await censorIfToxic(text);
      senderResponse.text = text; // Sender sees original
      receiverMessage.text = censoredText;
      console.log("Message censored (receiver has filter ON) - only receiver sees ***");
    }

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", receiverMessage);
    }

    // Return text to sender
    res.status(201).json({ message: "Message sent successfully", data: senderResponse });
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