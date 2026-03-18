import mongoose from "mongoose";
import { ENV } from "./env.js";
import { logger } from "./logger.js";

export const connectDB = async () => {
  if (!ENV.MONGO_URI) {
    throw new Error("MONGO_URI is not defined");
  }

  try {
    const conn = await mongoose.connect(ENV.MONGO_URI, {
      autoIndex: ENV.NODE_ENV !== "production",
      serverSelectionTimeoutMS: 10000,
    });

    logger.info("mongodb_connected", { host: conn.connection.host });
  } catch (error) {
    logger.error("mongodb_connection_failed", { error: error.message });
    process.exit(1);
  }
};