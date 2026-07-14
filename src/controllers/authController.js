import Admin from "../models/admin.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
} from "../utils/tokenUtils.js";

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Helper to set the refresh token as an httpOnly cookie.
 */
const setRefreshTokenCookie = (res, token) => {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: "/",
  });
};

/**
 * Helper to clear the refresh token cookie.
 */
const clearRefreshTokenCookie = (res) => {
  res.cookie("refreshToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    maxAge: 0,
    path: "/",
  });
};

/**
 * POST /api/auth/register
 * Register a new admin account.
 */
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    // Validate request body types
    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid request. Name, email, and password must be strings.",
      });
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    // Validate required fields
    if (!trimmedName) {
      return res.status(400).json({
        success: false,
        message: "Name is required.",
      });
    }

    if (!trimmedEmail) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    if (!trimmedPassword) {
      return res.status(400).json({
        success: false,
        message: "Password is required.",
      });
    }

    // Validate email format
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    // Validate password length
    if (trimmedPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: trimmedEmail });

    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    // Create admin
    const admin = await Admin.create({
      name: trimmedName,
      email: trimmedEmail,
      password: trimmedPassword,
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful.",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
      },
    });
  } catch (error) {
    // Handle Mongoose validation errors
    if (error.name === "ValidationError") {
      const message = Object.values(error.errors)
        .map((err) => err.message)
        .join(". ");
      return res.status(400).json({
        success: false,
        message,
      });
    }

    // Handle duplicate key error (race condition)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    console.error("Register error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * POST /api/auth/login
 * Authenticate admin and issue tokens.
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    // Validate request body types
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid request. Email and password must be strings.",
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    // Validate required fields
    if (!trimmedEmail) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    if (!trimmedPassword) {
      return res.status(400).json({
        success: false,
        message: "Password is required.",
      });
    }

    // Validate email format
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    // Find admin with password field included
    const admin = await Admin.findOne({ email: trimmedEmail }).select(
      "+password +refreshTokenHash"
    );

    // Generic error for wrong email or wrong password
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Check if admin is active
    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated. Please contact support.",
      });
    }

    // Verify password
    const isPasswordValid = await admin.comparePassword(trimmedPassword);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Generate tokens (using adminId for stable administration identifier)
    const accessToken = generateAccessToken({ adminId: admin._id });
    const refreshToken = generateRefreshToken({ adminId: admin._id });

    // Store hashed refresh token in database
    admin.refreshTokenHash = hashToken(refreshToken);
    await admin.save({ validateBeforeSave: false });

    // Set refresh token as httpOnly cookie
    setRefreshTokenCookie(res, refreshToken);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      accessToken,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * POST /api/auth/refresh
 * Issue a new access token using the refresh token cookie.
 */
export const refresh = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;

    // Check if refresh token exists in cookie
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No refresh token provided.",
      });
    }

    // Verify refresh token JWT
    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (error) {
      // Clear the invalid cookie
      clearRefreshTokenCookie(res);

      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Refresh token has expired. Please login again.",
        });
      }

      return res.status(401).json({
        success: false,
        message: "Invalid refresh token.",
      });
    }

    const adminId = decoded.adminId || decoded.id;

    // Find admin and verify stored token hash
    const admin = await Admin.findById(adminId).select("+refreshTokenHash");

    if (!admin) {
      clearRefreshTokenCookie(res);
      return res.status(401).json({
        success: false,
        message: "Admin no longer exists.",
      });
    }

    if (!admin.isActive) {
      clearRefreshTokenCookie(res);
      return res.status(403).json({
        success: false,
        message: "Account is deactivated. Please contact support.",
      });
    }

    // Verify that the token matches the stored hash (revocation check)
    const tokenHash = hashToken(token);

    if (!admin.refreshTokenHash || admin.refreshTokenHash !== tokenHash) {
      // Token has been revoked or rotated — clear cookie
      clearRefreshTokenCookie(res);
      return res.status(401).json({
        success: false,
        message: "Refresh token has been revoked. Please login again.",
      });
    }

    // Issue new access token
    const accessToken = generateAccessToken({ adminId: admin._id });

    return res.status(200).json({
      success: true,
      accessToken,
    });
  } catch (error) {
    console.error("Refresh error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * POST /api/auth/logout
 * Revoke refresh token and clear cookie. Idempotent — succeeds even if already logged out.
 */
export const logout = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;

    if (token) {
      // Attempt to verify and revoke the token
      try {
        const decoded = verifyRefreshToken(token);
        const adminId = decoded.adminId || decoded.id;
        await Admin.findByIdAndUpdate(adminId, {
          refreshTokenHash: null,
        });
      } catch {
        // Token is invalid/expired — that's fine, we still clear the cookie
      }
    }

    // Always clear the cookie
    clearRefreshTokenCookie(res);

    return res.status(200).json({
      success: true,
      message: "Logout successful.",
    });
  } catch (error) {
    console.error("Logout error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * GET /api/auth/me
 * Get current authenticated admin's profile.
 * Protected by auth middleware — req.admin is guaranteed.
 */
export const getMe = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      admin: {
        id: req.admin._id,
        name: req.admin.name,
        email: req.admin.email,
      },
    });
  } catch (error) {
    console.error("GetMe error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};
