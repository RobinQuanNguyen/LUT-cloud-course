import { Server } from "socket.io";
import http from "http";
import express from "express";
import { ENV } from "./env.js";
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";

const allowedOrigins = ENV.ALLOWED_ORIGINS;

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  serveClient: false,
  cors: {
    origin: allowedOrigins,
    credentials: true,
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