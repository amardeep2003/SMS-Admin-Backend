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

    dob: {
      type: Date,
      required: [true, "Date of birth is required."],
      validate: {
        validator: function (value) {
          return value < new Date();
        },
        message: "Date of birth must be a valid past date.",
      },
    },

    gender: {
      type: String,
      required: [true, "Gender is required."],
      enum: {
        values: ["MALE", "FEMALE", "OTHER"],
        message: "Gender must be MALE, FEMALE, or OTHER.",
      },
    },

    branch: {
      type: String,
      required: false,
      trim: true,
      minlength: [2, "Branch name must be at least 2 characters."],
      maxlength: [100, "Branch name cannot exceed 100 characters."],
    },

    semester: {
      type: Number,
      required: false,
      min: [1, "Semester must be at least 1."],
      max: [12, "Semester cannot exceed 12."],
      validate: {
        validator: Number.isInteger,
        message: "Semester must be a whole number.",
      },
    },

    passingYear: {
      type: Number,
      required: false,
      min: [2000, "Passing year is not valid."],
      max: [
        new Date().getFullYear() + 10,
        `Passing year cannot be greater than ${new Date().getFullYear() + 10}.`,
      ],
      validate: {
        validator: Number.isInteger,
        message: "Passing year must be a valid year.",
      },
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
