import mongoose from "mongoose";

const batchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Batch name is required."],
      trim: true,
      maxlength: [200, "Batch name cannot exceed 200 characters."],
      unique: true,
    },

    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course is required."],
      index: true,
    },

    courseType: {
      type: String,
      required: [true, "Course type is required."],
      enum: {
        values: ["VT", "LT"],
        message: "Course type must be either VT or LT.",
      },
      uppercase: true,
      trim: true,
    },

    mode: {
      type: String,
      enum: {
        values: ["ONLINE", "OFFLINE"],
        message: "Batch mode must be either ONLINE or OFFLINE.",
      },
      default: null,
      uppercase: true,
      trim: true,
    },

    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
      },
    ],

    enrolledStudents: {
      type: Number,
      default: 0,
      min: [0, "Enrolled students cannot be negative."],
      validate: {
        validator: Number.isInteger,
        message: "Enrolled students must be a whole number.",
      },
    },

    capacity: {
      type: Number,
      default: 15,
      min: [1, "Maximum students must be at least 1."],
      validate: {
        validator: Number.isInteger,
        message: "Maximum students must be a whole number.",
      },
    },

    startDate: {
      type: Date,
      default: null,
    },

    endDate: {
      type: Date,
      default: null,
    },

    trainer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trainer",
      default: null,
    },

    status: {
      type: String,
      enum: {
        values: ["ACTIVE", "INACTIVE", "COMPLETED","RUNNING"],
        message: "Invalid batch status.",
      },
      default: "ACTIVE",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

batchSchema.index({
  course: 1,
  status: 1,
  createdAt: 1,
});

batchSchema.index({
  courseType: 1,
  status: 1,
});

const Batch = mongoose.model("Batch", batchSchema);

export default Batch;
