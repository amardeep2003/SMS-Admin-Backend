import mongoose from "mongoose";

const adminOtpSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [
        /^[6-9]\d{9}$/,
        "Please provide a valid 10-digit Indian mobile number.",
      ],
      index: true,
    },

    otp: {
      type: String,
      required: true,
      minlength: 6,
      maxlength: 6,
    },

    sessionId: {
      type: String,
      required: true,
    },

    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

adminOtpSchema.index(
  {
    expiresAt: 1,
  },
  {
    expireAfterSeconds: 0,
  },
);

const AdminOtp = mongoose.model("AdminOtp", adminOtpSchema);

export default AdminOtp;
