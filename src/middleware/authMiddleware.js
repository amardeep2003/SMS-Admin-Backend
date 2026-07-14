import Admin from "../models/admin.js";
import { verifyAccessToken } from "../utils/tokenUtils.js";

/**
 * Middleware to protect routes requiring authentication.
 * Validates the Authorization header, verifies the access token,
 * and attaches the admin to req.admin.
 */
const protect = async (req, res, next) => {
  try {
    // Check for Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No authorization header provided.",
      });
    }

    // Validate Bearer format
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Invalid authorization format. Use: Bearer <token>",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token || token.trim() === "") {
      return res.status(401).json({
        success: false,
        message: "Access denied. Token not provided.",
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Access denied. Token has expired.",
        });
      }

      return res.status(401).json({
        success: false,
        message: "Access denied. Invalid token.",
      });
    }

    // Fetch admin from database
    const admin = await Admin.findById(decoded.id || decoded.adminId);

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Admin no longer exists.",
      });
    }

    // Check if admin is active
    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated. Please contact support.",
      });
    }

    // Attach admin to request
    req.admin = admin;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export default protect;
