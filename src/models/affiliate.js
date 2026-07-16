import mongoose from "mongoose";

const affiliatePartnerSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Affiliate partner name is required."],
      trim: true,
      minlength: [2, "Name must be at least 2 characters."],
      maxlength: [150, "Name cannot exceed 150 characters."],
    },

    mobileNumber: {
      type: String,
      required: [true, "Mobile number is required."],
      unique: true,
      trim: true,
      match: [/^[6-9]\d{9}$/, "Enter a valid 10 digit mobile number."],
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
      unique: true,
      sparse: true,
    },

    address: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "Address cannot exceed 500 characters."],
    },

    status: {
      type: String,
      enum: {
        values: ["ACTIVE", "INACTIVE"],
        message: "Status must be ACTIVE or INACTIVE.",
      },
      default: "ACTIVE",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

affiliatePartnerSchema.index({
  fullName: "text",
  mobileNumber: "text",
  email: "text",
});

const AffiliatePartner = mongoose.model(
  "AffiliatePartner",
  affiliatePartnerSchema,
);

export default AffiliatePartner;
