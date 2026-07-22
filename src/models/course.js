import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Course name is required."],
      trim: true,
      minlength: [2, "Course name must be at least 2 characters."],
      maxlength: [150, "Course name cannot exceed 150 characters."],
    },

    type: {
      type: String,
      required: [true, "Course type is required."],
      enum: {
        values: ["VT", "LT"],
        message: "Course type must be either VT or LT.",
      },
      uppercase: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: [5000, "Description cannot exceed 5000 characters."],
      default: "",
    },

    durationMonths: {
      type: Number,
      required: [true, "Course duration is required."],
      min: [1, "Course duration must be at least 1 month."],
      max: [120, "Course duration cannot exceed 120 months."],
      validate: {
        validator: Number.isInteger,
        message: "Course duration must be a whole number.",
      },
    },

    syllabus: {
      type: String,
      trim: true,
      maxlength: [10000, "Syllabus cannot exceed 10000 characters."],
      default: "",
    },

    // practicalWorkshopDetails: {
    //   type: String,
    //   trim: true,
    //   maxlength: [
    //     5000,
    //     "Practical workshop details cannot exceed 5000 characters.",
    //   ],
    //   default: "",
    // },

    actualPrice: {
      type: Number,
      required: [true, "Actual price is required."],
      min: [0, "Actual price cannot be negative."],
    },

    discountedPrice: {
      type: Number,
      min: [0, "Discounted price cannot be negative."],
      default: null,
    },

    registrationFee: {
      type: Number,
      required: [true, "Registration fee is required."],
      min: [0, "Registration fee cannot be negative."],
      default: 500,
    },

    status: {
      type: String,
      enum: {
        values: ["ACTIVE", "INACTIVE"],
        message: "Status must be either ACTIVE or INACTIVE.",
      },
      default: "ACTIVE",
    },

    // isDeleted: {
    //   type: Boolean,
    //   default: false,
    //   select: false,
    // },

    deletedAt: {
      type: Date,
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Useful indexes for filtering and sorting
courseSchema.index({ type: 1, status: 1 });
courseSchema.index({ createdAt: -1 });

// Cross-field validation
courseSchema.pre("validate", function () {
  if (
    this.discountedPrice !== null &&
    this.discountedPrice !== undefined &&
    this.discountedPrice > this.actualPrice
  ) {
    throw new Error("Discounted price cannot be greater than actual price.");
  }
});

const Course = mongoose.model("Course", courseSchema);

export default Course;
