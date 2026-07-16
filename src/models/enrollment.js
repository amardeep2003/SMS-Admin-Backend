import mongoose from "mongoose";

const paymentHistorySchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: [true, "Payment amount is required."],
      min: [1, "Payment amount must be greater than 0."],
    },

    paymentType: {
      type: String,
      required: [true, "Payment type is required."],
      enum: {
        values: ["REGISTRATION_FEE", "COURSE_FEE"],
        message: "Payment type must be REGISTRATION_FEE or COURSE_FEE.",
      },
      uppercase: true,
      trim: true,
    },

    paymentMode: {
      type: String,
      required: [true, "Payment mode is required."],
      enum: {
        values: ["CASH", "ONLINE"],
        message: "Payment mode must be CASH or ONLINE.",
      },
      uppercase: true,
      trim: true,
    },

    transactionId: {
      type: String,
      trim: true,
      maxlength: [200, "Transaction ID cannot exceed 200 characters."],
      default: null,
    },

    paymentDate: {
      type: Date,
      default: Date.now,
    },

    note: {
      type: String,
      trim: true,
      maxlength: [500, "Payment note cannot exceed 500 characters."],
      default: "",
    },
  },
  {
    _id: true,
    timestamps: true,
  },
);

const enrollmentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student is required."],
      index: true,
    },

    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course is required."],
      index: true,
    },

    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: [true, "Batch is required."],
      index: true,
    },

    // Course price is locked when the student enrolls.
    courseTotalFee: {
      type: Number,
      required: [true, "Course total fee is required."],
      min: [0, "Course total fee cannot be negative."],
      immutable: true,
    },

    // Registration fee is part of the course total fee.
    registrationFeeAmount: {
      type: Number,
      required: [true, "Registration fee amount is required."],
      min: [0, "Registration fee amount cannot be negative."],
      default: 500,
      immutable: true,
    },

    totalPaidAmount: {
      type: Number,
      required: [true, "Total paid amount is required."],
      min: [0, "Total paid amount cannot be negative."],
      default: 0,
    },

    remainingAmount: {
      type: Number,
      required: [true, "Remaining amount is required."],
      min: [0, "Remaining amount cannot be negative."],
    },

    paymentStatus: {
      type: String,
      required: [true, "Payment status is required."],
      enum: {
        values: ["UNPAID", "PARTIALLY_PAID", "PAID"],
        message: "Payment status must be UNPAID, PARTIALLY_PAID, or PAID.",
      },
      default: "UNPAID",
    },

    // Complete payment history.
    payments: {
      type: [paymentHistorySchema],
      default: [],
    },

    affiliatePartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AffiliatePartner",
      default: null,
      index: true,
    },

    enrollmentDate: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: {
        values: ["ACTIVE", "COMPLETED", "DROPPED"],
        message: "Enrollment status must be ACTIVE, COMPLETED, or DROPPED.",
      },
      default: "ACTIVE",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Same student cannot have two ACTIVE enrollments
// in the same course.
enrollmentSchema.index(
  {
    studentId: 1,
    courseId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      status: "ACTIVE",
    },
  },
);

// Useful indexes
enrollmentSchema.index({
  batchId: 1,
  status: 1,
});

enrollmentSchema.index({
  studentId: 1,
  status: 1,
});

enrollmentSchema.index({
  paymentStatus: 1,
  status: 1,
});

// Financial consistency validation
enrollmentSchema.pre("validate", function () {
  if (this.registrationFeeAmount > this.courseTotalFee) {
    throw new Error(
      "Registration fee cannot be greater than the course total fee.",
    );
  }

  if (this.totalPaidAmount > this.courseTotalFee) {
    throw new Error(
      "Total paid amount cannot be greater than the course total fee.",
    );
  }

  const expectedRemainingAmount = this.courseTotalFee - this.totalPaidAmount;

  if (this.remainingAmount !== expectedRemainingAmount) {
    throw new Error(
      "Remaining amount must equal course total fee minus total paid amount.",
    );
  }

  const expectedPaymentStatus =
    this.totalPaidAmount === 0
      ? "UNPAID"
      : this.totalPaidAmount >= this.courseTotalFee
        ? "PAID"
        : "PARTIALLY_PAID";

  if (this.paymentStatus !== expectedPaymentStatus) {
    throw new Error(
      `Payment status must be ${expectedPaymentStatus} based on the paid amount.`,
    );
  }
});

const Enrollment = mongoose.model("Enrollment", enrollmentSchema);

export default Enrollment;
