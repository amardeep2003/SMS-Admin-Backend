import Enrollment from "../models/enrollment.js";
import mongoose from "mongoose";
import AffiliatePartner from "../models/affiliate.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getAllEnrollments = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      courseType,
      courseId,
      sortOrder = "desc",
    } = req.query;

    // -----------------------------
    // Pagination
    // -----------------------------
    page = Math.max(parseInt(page, 10) || 1, 1);
    limit = Math.max(parseInt(limit, 10) || 10, 1);
    limit = Math.min(limit, 100);

    const skip = (page - 1) * limit;

    // -----------------------------
    // Course type validation
    // -----------------------------
    // let normalizedCourseType = null;

    // if (courseType) {
    //   normalizedCourseType = courseType.trim().toUpperCase();

    //   if (!["VT", "LT"].includes(normalizedCourseType)) {
    //     return res.status(400).json({
    //       success: false,
    //       message: "Course type must be either VT or LT.",
    //     });
    //   }
    // }

    let normalizedCourseType = null;

    if (req.query.courseType?.trim()) {
      const value = req.query.courseType.trim().toUpperCase();

      if (["VT", "LT"].includes(value)) {
        normalizedCourseType = value;
      }
    }

    // -----------------------------
    // Course ID validation
    // -----------------------------
    if (courseId && !mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID.",
      });
    }

    // -----------------------------
    // Remaining amount sorting
    // asc  = lowest remaining first
    // desc = highest remaining first
    // -----------------------------
    const normalizedSortOrder = sortOrder.toLowerCase() === "asc" ? 1 : -1;

    // -----------------------------
    // Aggregation pipeline
    // -----------------------------
    const pipeline = [
      // Student lookup
      {
        $lookup: {
          from: "students",
          localField: "studentId",
          foreignField: "_id",
          as: "student",
        },
      },

      {
        $unwind: "$student",
      },

      // Course lookup
      {
        $lookup: {
          from: "courses",
          localField: "courseId",
          foreignField: "_id",
          as: "course",
        },
      },

      {
        $unwind: "$course",
      },
    ];

    // -----------------------------
    // Filters
    // -----------------------------
    const matchStage = {};

    if (normalizedCourseType) {
      matchStage["course.type"] = normalizedCourseType;
    }

    if (courseId) {
      matchStage.courseId = new mongoose.Types.ObjectId(courseId);
    }

    // -----------------------------
    // Search
    // -----------------------------
    if (typeof search === "string" && search.trim()) {
      const searchRegex = new RegExp(escapeRegex(search.trim()), "i");

      matchStage.$or = [
        {
          "student.fullName": searchRegex,
        },
        {
          "student.mobileNumber": searchRegex,
        },
        {
          "course.name": searchRegex,
        },
      ];
    }

    // Add filters after lookup
    if (Object.keys(matchStage).length > 0) {
      pipeline.push({
        $match: matchStage,
      });
    }

    // -----------------------------
    // Select required fields
    // -----------------------------
    pipeline.push({
      $project: {
        _id: 1,

        // Needed later but may remain hidden in UI
        studentId: "$student._id",
        courseId: "$course._id",

        studentName: "$student.fullName",
        mobileNumber: "$student.mobileNumber",

        courseName: "$course.name",
        courseType: "$course.type",

        totalFee: "$courseTotalFee",
        totalPaid: "$totalPaidAmount",
        remainingAmount: 1,

        paymentStatus: 1,
        status: 1,

        enrollmentDate: 1,
        createdAt: 1,
      },
    });

    // -----------------------------
    // Sorting + Pagination + Count
    // -----------------------------
    pipeline.push({
      $facet: {
        enrollments: [
          {
            $sort: {
              remainingAmount: normalizedSortOrder,
              _id: -1,
            },
          },
          {
            $skip: skip,
          },
          {
            $limit: limit,
          },
        ],

        totalCount: [
          {
            $count: "count",
          },
        ],
      },
    });

    const result = await Enrollment.aggregate(pipeline);

    const enrollments = result[0]?.enrollments || [];

    const totalEnrollments = result[0]?.totalCount?.[0]?.count || 0;

    const totalPages = Math.ceil(totalEnrollments / limit);

    return res.status(200).json({
      success: true,
      message: "Enrollments fetched successfully.",
      data: enrollments,

      pagination: {
        currentPage: page,
        totalPages,
        totalEnrollments,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Get all enrollments error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const updateEnrollmentAffiliatePartner = async (req, res) => {
  try {
    const { id } = req.params;
    const { affiliatePartner } = req.body;

    // Enrollment ID validation
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid enrollment ID.",
      });
    }

    // Affiliate validation (allow null also)
    if (
      affiliatePartner !== null &&
      affiliatePartner !== undefined &&
      !mongoose.Types.ObjectId.isValid(affiliatePartner)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid affiliate partner ID.",
      });
    }

    const enrollment = await Enrollment.findById(id);

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found.",
      });
    }

    // If affiliate is provided then verify it exists and is ACTIVE
    if (affiliatePartner) {
      const affiliate = await AffiliatePartner.findOne({
        _id: affiliatePartner,
        status: "ACTIVE",
      });

      if (!affiliate) {
        return res.status(404).json({
          success: false,
          message: "Active affiliate partner not found.",
        });
      }
    }

    enrollment.affiliatePartner = affiliatePartner || null;

    await enrollment.save();

    return res.status(200).json({
      success: true,
      message: affiliatePartner
        ? "Affiliate partner updated successfully."
        : "Affiliate partner removed successfully.",
      data: {
        enrollmentId: enrollment._id,
        affiliatePartner: enrollment.affiliatePartner,
      },
    });
  } catch (error) {
    console.error("Update enrollment affiliate error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const addEnrollmentPayment = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const { amount, paymentMode, transactionId, note } = req.body;

    // ----------------------------
    // Validate Enrollment ID
    // ----------------------------
    if (!mongoose.Types.ObjectId.isValid(enrollmentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid enrollment ID.",
      });
    }

    // ----------------------------
    // Amount Validation
    // ----------------------------
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0.",
      });
    }

    // ----------------------------
    // Payment Mode Validation
    // ----------------------------
    if (typeof paymentMode !== "string") {
      return res.status(400).json({
        success: false,
        message: "Payment mode is required.",
      });
    }

    const normalizedPaymentMode = paymentMode.trim().toUpperCase();

    if (!["CASH", "ONLINE"].includes(normalizedPaymentMode)) {
      return res.status(400).json({
        success: false,
        message: "Payment mode must be CASH or ONLINE.",
      });
    }

    // ----------------------------
    // Transaction Id Validation
    // ----------------------------
    let normalizedTransactionId = null;

    if (
      transactionId !== undefined &&
      transactionId !== null &&
      transactionId !== ""
    ) {
      if (typeof transactionId !== "string") {
        return res.status(400).json({
          success: false,
          message: "Transaction ID must be a string.",
        });
      }

      normalizedTransactionId = transactionId.trim();

      if (normalizedTransactionId.length > 200) {
        return res.status(400).json({
          success: false,
          message: "Transaction ID cannot exceed 200 characters.",
        });
      }
    }

    // ----------------------------
    // Note Validation
    // ----------------------------
    let normalizedNote = "";

    if (note !== undefined && note !== null) {
      if (typeof note !== "string") {
        return res.status(400).json({
          success: false,
          message: "Note must be a string.",
        });
      }

      normalizedNote = note.trim();

      if (normalizedNote.length > 500) {
        return res.status(400).json({
          success: false,
          message: "Note cannot exceed 500 characters.",
        });
      }
    }

    // ----------------------------
    // Find Enrollment
    // ----------------------------
    const enrollment = await Enrollment.findById(enrollmentId);

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found.",
      });
    }

    if (enrollment.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Enrollment is not active.",
      });
    }

    if (enrollment.remainingAmount === 0) {
      return res.status(400).json({
        success: false,
        message: "Course fee is already fully paid.",
      });
    }

    // ----------------------------
    // Overpayment Check
    // ----------------------------
    if (amount > enrollment.remainingAmount) {
      return res.status(400).json({
        success: false,
        message: `Maximum payable amount is ₹${enrollment.remainingAmount}.`,
      });
    }

    // ----------------------------
    // Update Payment
    // ----------------------------
    enrollment.totalPaidAmount += amount;
    enrollment.remainingAmount -= amount;

    enrollment.paymentStatus =
      enrollment.remainingAmount === 0 ? "PAID" : "PARTIALLY_PAID";

    enrollment.payments.push({
      amount,
      paymentType: "COURSE_FEE",
      paymentMode: normalizedPaymentMode,
      transactionId: normalizedTransactionId,
      paymentDate: new Date(),
      note: normalizedNote,
    });

    await enrollment.save();

    return res.status(200).json({
      success: true,
      message: "Payment added successfully.",
      data: {
        enrollmentId: enrollment._id,
        courseTotalFee: enrollment.courseTotalFee,
        totalPaidAmount: enrollment.totalPaidAmount,
        remainingAmount: enrollment.remainingAmount,
        paymentStatus: enrollment.paymentStatus,
        lastPayment: enrollment.payments.at(-1),
      },
    });
  } catch (error) {
    console.error("Add payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};
