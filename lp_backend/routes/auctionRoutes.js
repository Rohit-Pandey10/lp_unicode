import express from "express";
import authMiddleware, { authorizeRoles } from "../middleware/authMiddleware.js";
import handleAuctionImagesUpload from "../middleware/uploadMiddleware.js";
import {
  createAuction,
  getAuctions,
  getAuctionById,
  updateAuction,
  deleteAuction,
} from "../controllers/auctionController.js";

const router = express.Router();

// Public / Buyer browsing
router.get("/", getAuctions);
router.get("/:id", getAuctionById);

// Seller & Admin auction management
router.post(
  "/",
  authMiddleware,
  authorizeRoles("Seller", "Admin"),
  handleAuctionImagesUpload,
  createAuction
);

router.put(
  "/:id",
  authMiddleware,
  authorizeRoles("Seller", "Admin"),
  handleAuctionImagesUpload,
  updateAuction
);

router.patch(
  "/:id",
  authMiddleware,
  authorizeRoles("Seller", "Admin"),
  handleAuctionImagesUpload,
  updateAuction
);

router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("Seller", "Admin"),
  deleteAuction
);

export default router;

