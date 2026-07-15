import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required."],
      trim: true,
      minlength: [2, "Full name must be at least 2 characters."],
      maxlength: [150, "Full name cannot exceed 150 characters."],
    },

    mobileNumber: {
      type: String,
      required: [true, "Mobile number is required."],
      unique: true,
      trim: true,
      match: [
        /^[6-9]\d{9}$/,
        "Please provide a valid 10-digit Indian mobile number.",
      ],
    },

    instituteName: {
      type: String,
      required: false,
      trim: true,
      minlength: [2, "Institute name must be at least 2 characters."],
      maxlength: [250, "Institute name cannot exceed 250 characters."],
    },

    address: {
      type: String,
      required: false,
      trim: true,
      minlength: [5, "Address must be at least 5 characters."],
      maxlength: [1000, "Address cannot exceed 1000 characters."],
    },

    status: {
      type: String,
      enum: {
        values: ["ACTIVE", "INACTIVE"],
        message: "Status must be either ACTIVE or INACTIVE.",
      },
      default: "ACTIVE",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

studentSchema.index({ status: 1, createdAt: -1 });

const Student = mongoose.model("Student", studentSchema);

export default Student;
