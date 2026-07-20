import jwt from "jsonwebtoken";

const verifyResetPasswordToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required.",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.FORGOT_PASSWORD_SECRET,
    );

    req.resetPassword = decoded;

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Reset password token has expired.",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid reset password token.",
    });
  }
};

export default verifyResetPasswordToken;