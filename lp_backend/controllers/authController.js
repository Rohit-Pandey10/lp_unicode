import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { sendLoginNotification, sendWelcomeEmail } from "../utils/sendEmail.js";

const signTokens = (user) => {
  const id = user.id || user._id;
  const role = user.role || "Buyer";
  return {
    accessToken: jwt.sign({ id, role }, process.env.JWT_ACCESS_SECRET, {
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    }),
    refreshToken: jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    }),
  };
};

const setRefreshCookie = (res, token) =>
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validRoles = ["Buyer", "Seller", "Admin"];

export async function register(req, res, next) {
  try {
    const { name, email, password, role } = req.body || {};
    if (
      !name ||
      !email ||
      !password ||
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required" });
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedName.length < 2) {
      return res
        .status(400)
        .json({ message: "Name must be at least 2 characters" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    if (!emailPattern.test(trimmedEmail)) {
      return res
        .status(400)
        .json({ message: "Please provide a valid email address" });
    }

    let assignedRole = "Buyer";
    if (role !== undefined) {
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          message: "Role must be one of: Buyer, Seller, Admin",
        });
      }
      assignedRole = role;
    }

    if (await User.findOne({ email: trimmedEmail })) {
      return res.status(400).json({ message: "Email is already registered" });
    }

    const user = await User.create({
      name: trimmedName,
      email: trimmedEmail,
      password,
      role: assignedRole,
    });
    const tokens = signTokens(user);
    setRefreshCookie(res, tokens.refreshToken);
    void sendWelcomeEmail(user);
    return res.status(201).json({ ...tokens, user: user.toSafeObject() });
  } catch (error) {
    return next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password, role } = req.body || {};
    if (
      !email ||
      !password ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const user = await User.findOne({
      email: trimmedEmail,
    }).select("+password");

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Role check / selection during login
    if (role !== undefined) {
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          message: "Role must be one of: Buyer, Seller, Admin",
        });
      }

      // If user already has an assigned role, enforce mutual exclusivity
      if (user.role && user.role !== role && user.role !== "Admin") {
        return res.status(403).json({
          message: `Role mismatch: This account is assigned as '${user.role}' and cannot log in as '${role}'. A Buyer cannot be a Seller, and a Seller cannot be a Buyer.`,
        });
      }

      // If legacy user had no role set, assign the chosen role
      if (!user.role) {
        user.role = role;
        await user.save();
      }
    }

    const tokens = signTokens(user);
    setRefreshCookie(res, tokens.refreshToken);

    void sendLoginNotification(user);
    return res.status(200).json({ ...tokens, user: user.toSafeObject() });
  } catch (error) {
    return next(error);
  }
}

export async function refreshToken(req, res, next) {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token || typeof token !== "string") {
      return res.status(401).json({ message: "Refresh token is required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      return res.status(401).json({
        message:
          error.name === "TokenExpiredError"
            ? "Refresh token has expired"
            : "Invalid refresh token",
      });
    }

    if (!decoded || !decoded.id) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const accessToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m" },
    );
    return res.status(200).json({ accessToken });
  } catch (error) {
    return next(error);
  }
}

export async function profile(req, res, next) {
  try {
    const user = req.user || (await User.findById(req.userId));
    if (!user) return res.status(404).json({ message: "User not found" });
    return res
      .status(200)
      .json({ user: typeof user.toSafeObject === "function" ? user.toSafeObject() : user });
  } catch (error) {
    return next(error);
  }
}
