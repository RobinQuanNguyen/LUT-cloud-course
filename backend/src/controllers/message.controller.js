import cloudinary from "../lib/cloudinary.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import { AppError } from "../lib/errors.js";
import { moderateText } from "../lib/moderation.js";

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

    // Moderate text before saving
    let finalText = text;
    if (text && text.trim()) {
      try {
        const receiver = await User.findById(receiverId).select("contentFilter");
        if (receiver?.contentFilter === true) {
          const modResult = await moderateText(text);
          if (modResult.flagged) {
            finalText = "********";
          }
        }
      } catch (err) {
        console.error("Content filter check failed:", err.message);
        // save message as-is if check fails
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