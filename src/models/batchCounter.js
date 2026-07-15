import mongoose from "mongoose";

const batchCounterSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    yearMonth: {
      type: String,
      required: true,
    },

    sequence: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

batchCounterSchema.index(
  {
    courseId: 1,
    yearMonth: 1,
  },
  {
    unique: true,
  },
);

const BatchCounter = mongoose.model("BatchCounter", batchCounterSchema);

export default BatchCounter;