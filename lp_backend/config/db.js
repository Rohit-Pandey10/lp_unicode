import mongoose from "mongoose";

let listenersConfigured = false;

export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not configured");
  }

  if (!listenersConfigured) {
    mongoose.connection.on("connected", () => console.log("MongoDB connected"));
    mongoose.connection.on("error", (error) =>
      console.error("MongoDB error:", error.message),
    );
    listenersConfigured = true;
  }

  return await mongoose.connect(process.env.MONGO_URI);
}
