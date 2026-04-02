import mongoose from "mongoose";
import { ENV } from "./env.js";
import { logger } from "./logger.js";

export const connectDB = async () => {
  if (ENV.NODE_ENV === "test") {
    if (!ENV.MONGO_URI_TEST) {
      throw new Error("MONGO_URI_TEST is not defined");
    }
    
    try {
      const conn = await mongoose.connect(ENV.MONGO_URI_TEST, {
        autoIndex: ENV.NODE_ENV !== "production",
        serverSelectionTimeoutMS: 10000,
      });

      logger.info("mongodb_for_testing_connected", { host: conn.connection.host });
    } catch (error) {
      logger.error("mongodb_for_testing_connected", { error: error.message });
      process.exit(1);
    }

  } else {
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
  }


};