import axios from "axios";

// Use relative path - Nginx/Reverse proxy handles routing
// Production: /api -> backend
// Development: Vite proxy handles /api -> backend
const baseURL = import.meta.env.VITE_API_BASE_URL || "/api";

export const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 10000,
  headers: {
    "X-Requested-With": "XMLHttpRequest",
  },
});