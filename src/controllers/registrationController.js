import mongoose from "mongoose";
import Student from "../models/student.js";
import Course from "../models/course.js";
import Batch from "../models/batch.js";
import BatchCounter from "../models/batchCounter.js";
import Enrollment from "../models/enrollment.js";

const REGISTRATION_FEE = 500;
const ALLOWED_COURSE_TYPES = ["VT", "LT"];
// const ALLOWED_PAYMENT_MODES = ["CASH", "ONLINE"];

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

// const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getCourseCode = (courseName) => {
  return courseName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const getYearMonth = () => {
  const now = new Date();

  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const handleRegistrationError = (res, error) => {
  if (error?.code === 11000) {
    // console.log("DUPLICATE ERROR:", error);
    // console.log("KEY PATTERN:", error.keyPattern);
    // console.log("KEY VALUE:", error.keyValue);
    return res.status(409).json({
      success: false,
      message: "Duplicate record detected. Please try again.",
    });
  }

  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors: Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
      })),
    });
  }

  console.error("Student registration error:", error);

  return res.status(500).json({
    success: false,
    message: "Internal server error.",
  });
};

/**
 * POST /api/students/register
 *
 * Single API:
 * 1. Validate student details
 * 2. Find/create student by mobile number
 * 3. Validate active course and course type
 * 4. Prevent duplicate active enrollment
 * 5. Find earliest available active batch
 * 6. Create batch automatically if required
 * 7. Create enrollment with ₹500 registration payment
 * 8. Add student ID to batch
 */
export const registerStudent = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    if (!isPlainObject(req.body)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request body.",
      });
    }

    const {
      fullName,
      mobileNumber,
      courseType,
      courseId,
      instituteName,
      address,
      registrationFeePaid,
      transactionId = null,
    } = req.body;

    // -----------------------------
    // Basic validation
    // -----------------------------
    if (typeof fullName !== "string") {
      return res.status(400).json({
        success: false,
        message: "Full name must be a string.",
      });
    }

    const normalizedFullName = fullName.trim();

    if (normalizedFullName.length < 2 || normalizedFullName.length > 150) {
      return res.status(400).json({
        success: false,
        message: "Full name must be between 2 and 150 characters.",
      });
    }

    if (typeof mobileNumber !== "string") {
      return res.status(400).json({
        success: false,
        message: "Mobile number must be a string.",
      });
    }

    const normalizedMobileNumber = mobileNumber.trim();

    if (!/^[6-9]\d{9}$/.test(normalizedMobileNumber)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid 10-digit Indian mobile number.",
      });
    }

    if (typeof courseType !== "string") {
      return res.status(400).json({
        success: false,
        message: "Course type must be a string.",
      });
    }

    const normalizedCourseType = courseType.trim().toUpperCase();

    if (!ALLOWED_COURSE_TYPES.includes(normalizedCourseType)) {
      return res.status(400).json({
        success: false,
        message: "Course type must be either VT or LT.",
      });
    }

    if (
      typeof courseId !== "string" ||
      !mongoose.Types.ObjectId.isValid(courseId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID.",
      });
    }

    if (typeof instituteName !== "string") {
      return res.status(400).json({
        success: false,
        message: "Institute name must be a string.",
      });
    }

    const normalizedInstituteName = instituteName.trim();

    if (
      normalizedInstituteName.length < 2 ||
      normalizedInstituteName.length > 250
    ) {
      return res.status(400).json({
        success: false,
        message: "Institute name must be between 2 and 250 characters.",
      });
    }

    if (typeof address !== "string") {
      return res.status(400).json({
        success: false,
        message: "Address must be a string.",
      });
    }

    const normalizedAddress = address.trim();

    if (normalizedAddress.length < 5 || normalizedAddress.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Address must be between 5 and 1000 characters.",
      });
    }

    // Current dummy payment flow:
    // enrollment only happens when registration fee is paid.
    if (registrationFeePaid !== true) {
      return res.status(400).json({
        success: false,
        message:
          "Registration fee payment is required before course enrollment.",
      });
    }

    // if (typeof paymentMode !== "string") {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Payment mode must be a string.",
    //   });
    // }

    // const normalizedPaymentMode = paymentMode.trim().toUpperCase();

    // if (!ALLOWED_PAYMENT_MODES.includes(normalizedPaymentMode)) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Payment mode must be CASH or ONLINE.",
    //   });
    // }

    // let normalizedTransactionId = null;

    // if (transactionId !== null && transactionId !== undefined) {
    //   if (typeof transactionId !== "string") {
    //     return res.status(400).json({
    //       success: false,
    //       message: "Transaction ID must be a string.",
    //     });
    //   }

    //   normalizedTransactionId = transactionId.trim() || null;

    //   if (normalizedTransactionId && normalizedTransactionId.length > 200) {
    //     return res.status(400).json({
    //       success: false,
    //       message: "Transaction ID cannot exceed 200 characters.",
    //     });
    //   }
    // }

    if (typeof transactionId !== "string" || transactionId.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Transaction ID is required for registration payment.",
      });
    }

    const normalizedTransactionId = transactionId.trim();

    if (normalizedTransactionId.length > 200) {
      return res.status(400).json({
        success: false,
        message: "Transaction ID cannot exceed 200 characters.",
      });
    }

    // if (normalizedPaymentMode === "ONLINE" && !normalizedTransactionId) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Transaction ID is required for online payment.",
    //   });
    // }

    // -----------------------------
    // Validate course before transaction
    // -----------------------------
    const course = await Course.findById(courseId).lean();

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    if (course.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Selected course is currently inactive.",
      });
    }

    if (course.type !== normalizedCourseType) {
      return res.status(400).json({
        success: false,
        message: "Selected course does not belong to the selected course type.",
      });
    }

    const courseTotalFee =
      course.discountedPrice !== null && course.discountedPrice !== undefined
        ? course.discountedPrice
        : course.actualPrice;

    if (
      typeof courseTotalFee !== "number" ||
      !Number.isFinite(courseTotalFee) ||
      courseTotalFee < REGISTRATION_FEE
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Course fee must be at least ₹500 to accept the registration fee.",
      });
    }

    // -----------------------------
    // Transaction
    // -----------------------------
    let responseData;

    await session.withTransaction(async () => {
      // Find existing student by mobile number
      let student = await Student.findOne({
        mobileNumber: normalizedMobileNumber,
      }).session(session);

      let isNewStudent = false;

      if (!student) {
        const createdStudents = await Student.create(
          [
            {
              fullName: normalizedFullName,
              mobileNumber: normalizedMobileNumber,
              instituteName: normalizedInstituteName,
              address: normalizedAddress,
            },
          ],
          { session },
        );

        student = createdStudents[0];
        isNewStudent = true;
      }

      // Prevent duplicate active enrollment
      const existingEnrollment = await Enrollment.findOne({
        studentId: student._id,
        courseId: course._id,
        status: "ACTIVE",
      })
        .session(session)
        .lean();

      if (existingEnrollment) {
        const error = new Error(
          "Student is already actively enrolled in this course.",
        );
        error.statusCode = 409;
        throw error;
      }

      // -----------------------------
      // Find earliest suitable batch
      // -----------------------------
      let batch = await Batch.findOne({
        course: course._id,
        status: "ACTIVE",
        $expr: {
          $lt: [
            {
              $size: {
                $ifNull: ["$students", []],
              },
            },
            "$capacity",
          ],
        },
      })
        .sort({
          createdAt: 1,
          _id: 1,
        })
        .session(session);

      // -----------------------------
      // Create batch if none available
      // -----------------------------
      if (!batch) {
        const yearMonth = getYearMonth();
        const courseCode = getCourseCode(course.name);

        const counter = await BatchCounter.findOneAndUpdate(
          {
            courseId: course._id,
            yearMonth,
          },
          {
            $inc: {
              sequence: 1,
            },
          },
          {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
            session,
          },
        );

        const sequence = String(counter.sequence).padStart(3, "0");

        const batchName = `${course.type}-${courseCode}-BATCH-${yearMonth}-${sequence}`;

        const createdBatches = await Batch.create(
          [
            {
              name: batchName,
              course: course._id,
              courseType: course.type,
              students: [],
              status: "ACTIVE",

              // Admin can decide this later.
              mode: null,
            },
          ],
          { session },
        );

        batch = createdBatches[0];
      }

      // Defensive capacity check
      if (batch.students.length >= batch.capacity) {
        const error = new Error(
          "Selected batch has reached its maximum capacity.",
        );
        error.statusCode = 409;
        throw error;
      }

      // -----------------------------
      // Enrollment payment calculation
      // -----------------------------
      const totalPaidAmount = REGISTRATION_FEE;
      const remainingAmount = courseTotalFee - totalPaidAmount;

      const paymentStatus = remainingAmount === 0 ? "PAID" : "PARTIALLY_PAID";

      // -----------------------------
      // Create enrollment
      // -----------------------------
      const createdEnrollments = await Enrollment.create(
        [
          {
            studentId: student._id,
            courseId: course._id,
            batchId: batch._id,

            courseTotalFee,
            registrationFeeAmount: REGISTRATION_FEE,

            totalPaidAmount,
            remainingAmount,
            paymentStatus,

            payments: [
              {
                amount: REGISTRATION_FEE,
                paymentType: "REGISTRATION_FEE",
                paymentMode: "ONLINE",
                transactionId: normalizedTransactionId,
                paymentDate: new Date(),
                note: "Initial registration payment.",
              },
            ],

            status: "ACTIVE",
          },
        ],
        { session },
      );

      const enrollment = createdEnrollments[0];

      // -----------------------------
      // Add student to batch
      // -----------------------------

      // console.log("BATCH BEFORE ASSIGNMENT:", batch);
      // console.log("BATCH CAPACITY:", batch.capacity);
      // console.log("BATCH STUDENTS:", batch.students);
      // console.log("STUDENT ID:", student._id);

      // const updatedBatch = await Batch.findOneAndUpdate(
      //   {
      //     _id: batch._id,

      //     // Prevent duplicate student ID
      //     students: {
      //       $ne: student._id,
      //     },

      //     // Atomic capacity check
      //     $expr: {
      //       $lt: [
      //         {
      //           $size: {
      //             $ifNull: ["$students", []],
      //           },
      //         },
      //         "$capacity",
      //       ],
      //     },
      //   },
      //   {
      //     $addToSet: {
      //       students: student._id,
      //     },
      //   },
      //   {
      //     new: true,
      //     session,
      //   },
      // );

      const updatedBatch = await Batch.findOneAndUpdate(
        {
          _id: batch._id,
          students: {
            $ne: student._id,
          },
          $expr: {
            $lt: [
              {
                $size: {
                  $ifNull: ["$students", []],
                },
              },
              "$capacity",
            ],
          },
        },
        {
          $addToSet: {
            students: student._id,
          },
          $inc: {
            enrolledStudents: 1,
          },
        },
        {
          returnDocument: "after",
          session,
        },
      );

      if (!updatedBatch) {
        const error = new Error(
          "Batch assignment failed because the batch is full or the student is already assigned.",
        );
        error.statusCode = 409;
        throw error;
      }

      responseData = {
        student,
        enrollment,
        batch: updatedBatch,
        course: {
          _id: course._id,
          name: course.name,
          type: course.type,
        },
        isNewStudent,
      };
    });

    return res.status(201).json({
      success: true,
      message: responseData.isNewStudent
        ? "Student registered, enrolled, and assigned to a batch successfully."
        : "Existing student enrolled and assigned to a batch successfully.",
      data: responseData,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return handleRegistrationError(res, error);
  } finally {
    await session.endSession();
  }
};
