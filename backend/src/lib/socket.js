import { Server } from "socket.io";
import http from "http";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { ENV } from "./env.js";
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";

const allowedOrigins = new Set(ENV.ALLOWED_ORIGINS);

const app = express();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const server = http.createServer(app);

const io = new Server(server, {
  serveClient: false,
  cors: {
    origin: Array.from(allowedOrigins),
    credentials: true,
  },
  allowRequest: (req, callback) => {
    const origin = req.headers.origin;

    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    return callback("Origin not allowed", false);
  },
});

io.use(socketAuthMiddleware);

const userSocketMap = new Map();

export function getReceiverSocketId(userId) {
  return userSocketMap.get(userId.toString());
}

io.on("connection", (socket) => {
  const userId = socket.userId;
  userSocketMap.set(userId, socket.id);
  io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));

  socket.on("disconnect", () => {
    userSocketMap.delete(userId);
    io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));
  });
});

export { io, app, server };