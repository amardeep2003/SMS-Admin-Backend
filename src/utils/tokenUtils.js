import jwt from "jsonwebtoken";
import crypto from "crypto";

/**
 * Generate an access token for an admin.
 * @param {Object} payload - { id }
 * @returns {string} Signed JWT access token
 */
export const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "3d",
  });
};

/**
 * Generate a refresh token for an admin.
 * @param {Object} payload - { id }
 * @returns {string} Signed JWT refresh token
 */
export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
  });
};

/**
 * Verify an access token.
 * @param {string} token
 * @returns {Object} Decoded payload
 * @throws {jwt.JsonWebTokenError | jwt.TokenExpiredError}
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
};

/**
 * Verify a refresh token.
 * @param {string} token
 * @returns {Object} Decoded payload
 * @throws {jwt.JsonWebTokenError | jwt.TokenExpiredError}
 */
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
};

/**
 * Hash a token using SHA-256 for secure storage.
 * @param {string} token - Raw token string
 * @returns {string} Hex-encoded SHA-256 hash
 */
export const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};
