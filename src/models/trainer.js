import mongoose from "mongoose";

const trainerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Trainer name is required."],
      trim: true,
      minlength: [2, "Trainer name must be at least 2 characters."],
      maxlength: [100, "Trainer name cannot exceed 100 characters."],
    },

    email: {
      type: String,
      required: [true, "Trainer email is required."],
      trim: true,
      lowercase: true,
      maxlength: [150, "Email cannot exceed 150 characters."],
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address.",
      ],
    },

    phone: {
      type: String,
      required: [true, "Trainer phone number is required."],
      trim: true,
      match: [
        /^[6-9]\d{9}$/,
        "Please provide a valid 10-digit Indian mobile number.",
      ],
    },

    qualification: {
      type: String,
      required: [true, "Qualification is required."],
      trim: true,
      minlength: [2, "Qualification must be at least 2 characters."],
      maxlength: [250, "Qualification cannot exceed 250 characters."],
    },

    specialization: {
      type: [String],
      required: [true, "At least one specialization is required."],
      validate: {
        validator(value) {
          return (
            Array.isArray(value) &&
            value.length >= 1 &&
            value.length <= 20 &&
            value.every(
              (item) =>
                typeof item === "string" &&
                item.trim().length >= 2 &&
                item.trim().length <= 100,
            )
          );
        },
        message: "Specialization must contain between 1 and 20 valid values.",
      },
      set(value) {
        if (!Array.isArray(value)) return value;

        return [
          ...new Map(
            value
              .filter((item) => typeof item === "string")
              .map((item) => {
                const trimmedItem = item.trim();
                return [trimmedItem.toLowerCase(), trimmedItem];
              }),
          ).values(),
        ];
      },
    },

    monthlySalary: {
      type: Number,
      required: [true, "Monthly salary is required."],
      min: [0, "Monthly salary cannot be negative."],
      validate: {
        validator: Number.isFinite,
        message: "Monthly salary must be a valid number.",
      },
    },

    joiningDate: {
      type: Date,
      required: [true, "Joining date is required."],
    },

    status: {
      type: String,
      enum: {
        values: ["ACTIVE", "INACTIVE"],
        message: "Status must be either ACTIVE or INACTIVE.",
      },
      default: "ACTIVE",
      uppercase: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

trainerSchema.index({ email: 1 }, { unique: true });
trainerSchema.index({ phone: 1 }, { unique: true });
trainerSchema.index({ status: 1, createdAt: -1 });

const Trainer = mongoose.model("Trainer", trainerSchema);

export default Trainer;
