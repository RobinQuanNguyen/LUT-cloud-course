import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.MODE === "development" ? "http://localhost:3001/api" : "/api");

export const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 10000,
  headers: {
    "X-Requested-With": "XMLHttpRequest",
  },
});