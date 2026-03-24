import { create } from "zustand";
import { io } from "socket.io-client";
import { toast } from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js";

const socketUrl = import.meta.env.VITE_SOCKET_URL || (import.meta.env.MODE === "development" ? "http://localhost:3001" : "/");

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isCheckingAuth: true,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  socket: null,
  onlineUsers: [],

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data.user ?? res.data });
      get().connectSocket();
    } catch {
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signUp: async (data) => {
    set({ isSigningUp: true });

    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data.user ?? res.data });
      toast.success("Account created successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Error signing up");
    } finally {
      set({ isSigningUp: false });
    }
  },

  logIn: async (data) => {
    set({ isLoggingIn: true });

    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data.user ?? res.data });
      toast.success("Logged in successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Error logging in");
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      get().disconnectSocket();
      set({ authUser: null, onlineUsers: [] });
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Error logging out");
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });

    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Error updating profile");
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  updateContentFilter: async (value) => {
    try {
      const res = await axiosInstance.patch("/auth/content-filter", { contentFilter: value });
      set({ authUser: res.data });
      toast.success(value ? "Parent mode enabled" : "Parent mode disabled");
    } catch (error) {
      toast.error(error.response?.data?.message || "Error updating content filter");
    }
  },

  connectSocket: () => {
    const { authUser, socket } = get();

    if (!authUser || socket?.connected) {
      return;
    }

    const newSocket = io(socketUrl, {
      autoConnect: false,
      withCredentials: true,
      transports: ["websocket", "polling"],
      path: "/socket.io",
      reconnection: true,
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    newSocket.on("connect_error", () => {
      set({ socket: null });
    });

    newSocket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });

    newSocket.connect();
    set({ socket: newSocket });
  },

  disconnectSocket: () => {
    const socket = get().socket;

    if (socket) {
      socket.off("getOnlineUsers");
      socket.disconnect();
    }

    set({ socket: null, onlineUsers: [] });
  },
}));