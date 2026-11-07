import mongoose from "mongoose";
import logger from "../utils/logger.js";

let listenersConfigured = false;

export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not configured");
  }

  if (!listenersConfigured) {
    mongoose.connection.on("connected", () => logger.info("MongoDB connected"));
    mongoose.connection.on("error", (error) =>
      logger.error(`MongoDB error: ${error.message}`)
    );
    listenersConfigured = true;
  }

  return await mongoose.connect(process.env.MONGO_URI);
}
