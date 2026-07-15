import Enrollment from "../models/enrollment.js";
import mongoose from "mongoose";

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
    let normalizedCourseType = null;

    if (courseType) {
      normalizedCourseType = courseType.trim().toUpperCase();

      if (!["VT", "LT"].includes(normalizedCourseType)) {
        return res.status(400).json({
          success: false,
          message: "Course type must be either VT or LT.",
        });
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
