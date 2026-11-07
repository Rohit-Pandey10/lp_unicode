import Auction, { calculateAuctionStatus } from "../models/Auction.js";
import { uploadMultipleToCloudinary } from "../config/cloudinary.js";
import logger from "../utils/logger.js";

/**
 * Helper to safely parse images from request body (if provided as JSON or array)
 */
function parseBodyImages(rawImages) {
  if (!rawImages) return [];
  if (Array.isArray(rawImages)) return rawImages;
  if (typeof rawImages === "string") {
    try {
      const parsed = JSON.parse(rawImages);
      if (Array.isArray(parsed)) return parsed;
      return [rawImages];
    } catch {
      return [rawImages];
    }
  }
  return [];
}

/**
 * Create a new auction
 * Access: Seller or Admin
 */
export async function createAuction(req, res, next) {
  try {
    const { title, description, category, startingPrice, startTime, endTime } =
      req.body || {};

    if (!title || typeof title !== "string" || title.trim().length < 3) {
      return res
        .status(400)
        .json({ message: "Title is required and must be at least 3 characters" });
    }

    if (
      !description ||
      typeof description !== "string" ||
      description.trim().length < 10
    ) {
      return res.status(400).json({
        message: "Description is required and must be at least 10 characters",
      });
    }

    if (!category || typeof category !== "string" || !category.trim()) {
      return res.status(400).json({ message: "Category is required" });
    }

    const parsedPrice = Number(startingPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return res
        .status(400)
        .json({ message: "Starting price must be a valid number greater than 0" });
    }

    if (!startTime || !endTime) {
      return res
        .status(400)
        .json({ message: "Start time and end time are required" });
    }

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res
        .status(400)
        .json({ message: "Start time and end time must be valid dates" });
    }

    if (endDate <= startDate) {
      return res
        .status(400)
        .json({ message: "End time must be after start time" });
    }

    // Process images: from Multer files or body URLs
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      logger.info(
        "Uploading %d auction images to Cloudinary for user %s",
        req.files.length,
        req.userId
      );
      imageUrls = await uploadMultipleToCloudinary(req.files, "auctions");
    }

    const bodyImages = parseBodyImages(req.body.images);
    imageUrls = [...imageUrls, ...bodyImages];

    if (imageUrls.length === 0) {
      return res.status(400).json({
        message:
          "At least one image is required. Upload images using the 'images' field.",
      });
    }

    // Always take seller ID from the authenticated user, NEVER from request body
    const sellerId = req.userId;

    const initialStatus = calculateAuctionStatus(startDate, endDate);

    const auction = await Auction.create({
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      startingPrice: parsedPrice,
      images: imageUrls,
      startTime: startDate,
      endTime: endDate,
      status: initialStatus,
      seller: sellerId,
    });

    await auction.populate("seller", "name email role");

    logger.info(
      "Auction created: id=%s title='%s' seller=%s status=%s",
      auction._id,
      auction.title,
      sellerId,
      auction.status
    );

    return res.status(201).json({
      message: "Auction created successfully",
      auction,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get all auctions (with filtering, pagination, and status auto-sync)
 * Access: Public / All Roles
 */
export async function getAuctions(req, res, next) {
  try {
    const {
      status,
      category,
      seller,
      search,
      minPrice,
      maxPrice,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const filter = {};

    if (status) {
      const upperStatus = status.toUpperCase();
      if (!["UPCOMING", "ACTIVE", "ENDED"].includes(upperStatus)) {
        return res.status(400).json({
          message: "Invalid status. Allowed values: UPCOMING, ACTIVE, ENDED",
        });
      }
      const now = new Date();
      if (upperStatus === "UPCOMING") {
        filter.startTime = { $gt: now };
      } else if (upperStatus === "ACTIVE") {
        filter.startTime = { $lte: now };
        filter.endTime = { $gte: now };
      } else if (upperStatus === "ENDED") {
        filter.endTime = { $lt: now };
      }
    }

    if (category) {
      filter.category = { $regex: new RegExp(`^${category.trim()}$`, "i") };
    }

    if (seller) {
      filter.seller = seller;
    }

    if (search) {
      const searchRegex = { $regex: search.trim(), $options: "i" };
      filter.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    if (minPrice || maxPrice) {
      filter.startingPrice = {};
      if (minPrice) filter.startingPrice.$gte = Number(minPrice);
      if (maxPrice) filter.startingPrice.$lte = Number(maxPrice);
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;
    const sortOrder = order === "asc" ? 1 : -1;

    const [auctions, total] = await Promise.all([
      Auction.find(filter)
        .populate("seller", "name email role")
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limitNum),
      Auction.countDocuments(filter),
    ]);

    // Check & sync status for each auction in case timestamps passed
    for (const auction of auctions) {
      const calculated = calculateAuctionStatus(
        auction.startTime,
        auction.endTime
      );
      if (auction.status !== calculated) {
        auction.status = calculated;
        await Auction.updateOne(
          { _id: auction._id },
          { $set: { status: calculated } }
        );
      }
    }

    return res.status(200).json({
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      count: auctions.length,
      auctions,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get auction by ID
 * Access: Public / All Roles
 */
export async function getAuctionById(req, res, next) {
  try {
    const { id } = req.params;

    const auction = await Auction.findById(id).populate(
      "seller",
      "name email role"
    );

    if (!auction) {
      return res.status(404).json({ message: "Auction not found" });
    }

    // Auto-sync status based on current time
    const calculated = calculateAuctionStatus(
      auction.startTime,
      auction.endTime
    );
    if (auction.status !== calculated) {
      auction.status = calculated;
      await Auction.updateOne({ _id: auction._id }, { $set: { status: calculated } });
    }

    return res.status(200).json({ auction });
  } catch (error) {
    return next(error);
  }
}

/**
 * Update auction
 * Access: Seller (owner only) or Admin
 */
export async function updateAuction(req, res, next) {
  try {
    const { id } = req.params;

    const auction = await Auction.findById(id);
    if (!auction) {
      return res.status(404).json({ message: "Auction not found" });
    }

    // Role and ownership check
    const isOwner = auction.seller.toString() === req.userId;
    const isAdmin = req.user?.role === "Admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: "Forbidden: You are only allowed to manage your own auctions",
      });
    }

    const {
      title,
      description,
      category,
      startingPrice,
      startTime,
      endTime,
      replaceImages,
    } = req.body || {};

    if (title !== undefined) {
      if (typeof title !== "string" || title.trim().length < 3) {
        return res
          .status(400)
          .json({ message: "Title must be at least 3 characters" });
      }
      auction.title = title.trim();
    }

    if (description !== undefined) {
      if (typeof description !== "string" || description.trim().length < 10) {
        return res
          .status(400)
          .json({ message: "Description must be at least 10 characters" });
      }
      auction.description = description.trim();
    }

    if (category !== undefined) {
      if (typeof category !== "string" || !category.trim()) {
        return res.status(400).json({ message: "Category cannot be empty" });
      }
      auction.category = category.trim();
    }

    if (startingPrice !== undefined) {
      const parsedPrice = Number(startingPrice);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        return res
          .status(400)
          .json({ message: "Starting price must be a valid number greater than 0" });
      }
      auction.startingPrice = parsedPrice;
    }

    if (startTime !== undefined) {
      const newStart = new Date(startTime);
      if (isNaN(newStart.getTime())) {
        return res.status(400).json({ message: "Invalid start time date" });
      }
      auction.startTime = newStart;
    }

    if (endTime !== undefined) {
      const newEnd = new Date(endTime);
      if (isNaN(newEnd.getTime())) {
        return res.status(400).json({ message: "Invalid end time date" });
      }
      auction.endTime = newEnd;
    }

    if (new Date(auction.endTime) <= new Date(auction.startTime)) {
      return res
        .status(400)
        .json({ message: "End time must be after start time" });
    }

    // Handle uploaded images
    let newImageUrls = [];
    if (req.files && req.files.length > 0) {
      newImageUrls = await uploadMultipleToCloudinary(req.files, "auctions");
    }

    const bodyImages = parseBodyImages(req.body.images);
    newImageUrls = [...newImageUrls, ...bodyImages];

    if (newImageUrls.length > 0) {
      if (replaceImages === "true" || replaceImages === true) {
        auction.images = newImageUrls;
      } else {
        auction.images = [...auction.images, ...newImageUrls];
      }
    }

    // Recalculate status based on current time and updated timings
    auction.status = calculateAuctionStatus(
      auction.startTime,
      auction.endTime
    );

    await auction.save();
    await auction.populate("seller", "name email role");

    logger.info(
      "Auction updated: id=%s by user=%s (role=%s)",
      auction._id,
      req.userId,
      req.user?.role
    );

    return res.status(200).json({
      message: "Auction updated successfully",
      auction,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Delete auction
 * Access: Seller (owner only) or Admin
 */
export async function deleteAuction(req, res, next) {
  try {
    const { id } = req.params;

    const auction = await Auction.findById(id);
    if (!auction) {
      return res.status(404).json({ message: "Auction not found" });
    }

    // Role and ownership check
    const isOwner = auction.seller.toString() === req.userId;
    const isAdmin = req.user?.role === "Admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: "Forbidden: You are only allowed to delete your own auctions",
      });
    }

    await auction.deleteOne();

    logger.info(
      "Auction deleted: id=%s by user=%s (role=%s)",
      id,
      req.userId,
      req.user?.role
    );

    return res.status(200).json({
      message: "Auction deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
}

