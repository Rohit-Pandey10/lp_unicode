import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function authMiddleware(req, res, next) {
  const header = req.get("authorization");
  const match = header?.match(/^Bearer\s+(.+)$/i);
  const token = match ? match[1].trim() : null;

  if (!token) {
    return res.status(401).json({ message: "Authorization token is required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    if (!decoded?.id) {
      return res.status(401).json({ message: "Invalid access token" });
    }

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User not found or token invalid" });
    }

    req.user = user;
    req.userId = user.id;
    return next();
  } catch (error) {
    const message =
      error.name === "TokenExpiredError"
        ? "Access token has expired"
        : "Invalid access token";
    return res.status(401).json({ message });
  }
}

export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden: User role '${req.user.role}' is not authorized to perform this action`,
      });
    }

    return next();
  };
}

export default authMiddleware;
