import jwt from "jsonwebtoken";

export default function authMiddleware(req, res, next) {
  const header = req.get("authorization");
  const match = header?.match(/^Bearer\s+(.+)$/i);
  const token = match ? match[1].trim() : null;

  if (!token)
    return res.status(401).json({ message: "Authorization token is required" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    if (!decoded?.id)
      return res.status(401).json({ message: "Invalid access token" });
    req.userId = decoded.id;
    return next();
  } catch (error) {
    const message =
      error.name === "TokenExpiredError"
        ? "Access token has expired"
        : "Invalid access token";
    return res.status(401).json({ message });
  }
}
