import { create } from "zustand";
import { toast } from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js";
import { useAuthStore } from "./useAuthStore.js";

const notificationSound = new Audio("/sounds/notification.mp3");

export const useChatStore = create((set, get) => ({
  allContact: [],
  chats: [],
  messages: [],
  activeTab: "chats",
  selectedUser: null,
  isUserLoading: false,
  isMessageLoading: false,
  isSoundEnabled: localStorage.getItem("isSoundEnabled") === "true" || false,

  toggleSound: () => {
    localStorage.setItem("isSoundEnabled", !get().isSoundEnabled);
    set({ isSoundEnabled: !get().isSoundEnabled });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedUser: (selectedUser) => set({ selectedUser }),

  getAllContacts: async () => {
    set({ isUserLoading: true });
    try {
      const res = await axiosInstance.get("/message/contacts");
      set({ allContact: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Error fetching contacts");
    } finally {
      set({ isUserLoading: false });
    }
  },

  getMyChatPartners: async () => {
    set({ isUserLoading: true });
    try {
      const res = await axiosInstance.get("/message/chats");
      set({ chats: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Error fetching chats");
    } finally {
      set({ isUserLoading: false });
    }
  },

  getMessagesByUserId: async (userId) => {
    set({ isMessageLoading: true });
    try {
      const res = await axiosInstance.get(`/message/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Error fetching messages");
    } finally {
      set({ isMessageLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser } = get();
    const { authUser } = useAuthStore.getState();

    if (!selectedUser || !authUser) {
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      _id: tempId,
      senderId: authUser._id,
      receiverId: selectedUser._id,
      text: messageData.text,
      image: messageData.image,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };

    set((state) => ({ messages: [...state.messages, optimisticMessage] }));

    try {
      const res = await axiosInstance.post(`/message/send/${selectedUser._id}`, messageData);
      const savedMessage = res.data.data ?? res.data;
      
      // Backend returns message with populated senderId
      // Ensure senderId is properly formatted for comparison
      const normalizedMessage = {
        ...savedMessage,
        senderId: savedMessage.senderId?._id || savedMessage.senderId,
        receiverId: savedMessage.receiverId?._id || savedMessage.receiverId,
      };
      
      set((state) => ({
        messages: state.messages.map((message) => 
          message._id === tempId ? normalizedMessage : message
        ),
      }));
    } catch (error) {
      set((state) => ({
        messages: state.messages.filter((message) => message._id !== tempId),
      }));
      toast.error(error.response?.data?.message || "Error sending message");
    }
  },

  subscribeToMessages: async () => {
    const { selectedUser, isSoundEnabled, allContact, getAllContacts } = get();

    if (!selectedUser) {
      return;
    }

    if (!allContact || allContact.length === 0) {
      await getAllContacts();
    }

    const socket = useAuthStore.getState().socket;

    if (!socket) {
      return;
    }

    socket.off("newMessage");

    socket.on("newMessage", (newMessage) => {
      const contacts = get().allContact || [];
      
      // Handle both populated (object) and non-populated (string) senderId
      const senderId = newMessage.senderId?._id || newMessage.senderId;
      const isMessageSentFromSelectedUser = senderId === selectedUser._id;

      if (!isMessageSentFromSelectedUser) {
        const sender = contacts.find((user) => user._id === senderId);
        const senderName = sender?.fullName || "Someone";
        toast(`New message from ${senderName}`);
        return;
      }

      set((state) => ({ messages: [...state.messages, newMessage] }));

      if (isSoundEnabled) {
        notificationSound.currentTime = 0;
        notificationSound.play().catch(() => null);
      }
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off("newMessage");
    }
  },
}));