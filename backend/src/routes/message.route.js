import express from "express";
import { getAllContacts, getChatPartners, getMessagesByUserId, sendMessage } from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";
import { validateMessagePayload, validateObjectIdParam } from "../middleware/validation.middleware.js";

const router = express.Router();

router.use(protectRoute);
router.use(arcjetProtection);

router.get("/contacts", getAllContacts);
router.get("/chats", getChatPartners);
router.get("/:id", validateObjectIdParam("id"), getMessagesByUserId);
router.post("/send/:id", validateObjectIdParam("id"), validateMessagePayload, sendMessage);

export default router;