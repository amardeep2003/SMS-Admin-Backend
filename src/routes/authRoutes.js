import express from "express";
import {
  register,
  login,
  refresh,
  logout,
  // getMe,
  getProfile,
  updateProfile,
  changePassword,
  forgotPasswordSendOtp,
  verifyForgotPasswordOtp,
  resetPassword,
} from "../controllers/authController.js";
import protect from "../middleware/authMiddleware.js";
import verifyResetPasswordToken from "../middleware/resetPasswordMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);
// router.get("/me", protect, getMe);

router.get("/profile", protect, getProfile);

router.put("/profile", protect, updateProfile);

router.put("/change-password", protect, changePassword);

router.post("/forgot-password/send-otp", forgotPasswordSendOtp);

router.post("/forgot-password/verify-otp",verifyResetPasswordToken, verifyForgotPasswordOtp);

router.put("/reset-password",verifyResetPasswordToken, resetPassword);

export default router;
