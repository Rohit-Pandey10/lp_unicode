import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import auctionRoutes from "./routes/auctionRoutes.js";
import logger from "./utils/logger.js";

const app = express();

// HTTP Request logging with Morgan into Pino
const morganFormat = process.env.NODE_ENV === "production" ? "combined" : "dev";
app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

app.use(cors({ origin: process.env.CLIENT_URL || true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Base endpoints
app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/auctions", auctionRoutes);

// 404 handler
app.use((_req, res) => res.status(404).json({ message: "Route not found" }));

// Centralized error handler
app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({ message: "Invalid JSON payload" });
  }
  if (error.name === "ValidationError") {
    return res.status(400).json({
      message: Object.values(error.errors)
        .map((item) => item.message)
        .join(", "),
    });
  }
  if (error.code === 11000) {
    return res.status(400).json({ message: "Email or duplicate key conflict" });
  }
  if (error.name === "CastError") {
    return res.status(400).json({ message: "Invalid ID format" });
  }
  if (error.status && error.status < 500) {
    return res.status(error.status).json({ message: error.message });
  }

  logger.error("Unhandled error: %s", error.stack || error.message);
  return res.status(500).json({ message: "Internal server error" });
});

const port = process.env.PORT || 5000;
if (process.env.NODE_ENV !== "test") {
  connectDB()
    .then(() =>
      app.listen(port, () =>
        logger.info(`Server listening at http://localhost:${port}`)
      )
    )
    .catch((error) => {
      logger.error(`Unable to start server: ${error.message}`);
      process.exitCode = 1;
    });
}

export default app;
