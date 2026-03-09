import {create} from 'zustand'
import { axiosInstance } from '../lib/axios.js';
import { toast } from 'react-hot-toast';
import { io } from 'socket.io-client';

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:3001" : "/";

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

            get().connectSocket(); // Connect to socket if authentication is successful
        } catch (error) {
            console.log("Error checking auth:", error);
            set({ authUser: null })
        } finally {
            set({isCheckingAuth: false})
        }
    },

    signUp: async (data) => {
        set({isSigningUp: true});

        try {
            const res = await axiosInstance.post("/auth/signup", data);
            set({authUser: res.data.user ?? res.data})

            // use react-hot-toast to show success message
            toast.success("Account created successfully!")

            // Connect to socket after successful signup
            get().connectSocket();

        } catch (error) {
            toast.error(error.response?.data?.message || "Error signing up")
        } finally {
            set({isSigningUp: false})
        }
    },

    logIn: async (data) => {
        set({isLoggingIn: true});

        try {
            const res = await axiosInstance.post("/auth/login", data);
            
            const user = res.data?.user ?? res.data;   // Handle cases where backend might return user object directly or wrapped in a "user" field
            set({ authUser: user });


            // use react-hot-toast to show success message
            toast.success("Logged in successfully!")

            // Connect to socket after successful login
            get().connectSocket();

        } catch (error) {
            toast.error(error.response?.data?.message || "Error logging in")
        } finally {
            set({isLoggingIn: false})
        }
    },

    logout: async () => {
        try {
            await axiosInstance.post("/auth/logout");

            set({authUser: null})

            toast.success("Logged out successfully!")

            // Disconnect from socket after logout
            get().disconnectSocket();

        } catch (error) {
            console.error("Error logging out:", error);
            toast.error(error.response?.data?.message || "Error logging out")
        }
    },

    updateProfile: async (data) => {
        set({isUpdatingProfile: true});
        try {
            const res = await axiosInstance.put("/auth/update-profile", data);
            set({authUser: res.data})
            toast.success("Profile updated successfully!")
        } catch (error) {
            toast.error(error.response?.data?.message || "Error updating profile")
        } finally {
            set({isUpdatingProfile: false})
        }
    },

    connectSocket: () => {
        const { authUser, socket } = get();
        if (!authUser) return;
        if (socket?.connected) return; // Don't connect if not authenticated or already connected{

        const newSocket = io(BASE_URL, {
            withCredentials: true, // this ensure is sent with the connection request       
        })

        newSocket.connect();

        set({ socket: newSocket })

        // Listen to the events comming from the backend
        newSocket.on("getOnlineUsers", (userIds) => {
            set({ onlineUsers : userIds })
        })
    },

    disconnectSocket: () => {
        console.log("Disconnecting socket...")
        if (get().socket?.connected) {
            get().socket.disconnect();
        }
        
  },
}))