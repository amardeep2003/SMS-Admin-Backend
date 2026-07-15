import mongoose from "mongoose";
import Student from "../models/student.js";
import Enrollment from "../models/enrollment.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * GET /api/students
 *
 * Returns:
 * - Student name
 * - Mobile number
 * - Institute name
 * - Number of enrolled courses
 */
export const getAllStudents = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "" } = req.query;

    // -----------------------------
    // Pagination
    // -----------------------------
    page = Math.max(parseInt(page, 10) || 1, 1);
    limit = Math.max(parseInt(limit, 10) || 10, 1);

    // Maximum 100 records per page
    limit = Math.min(limit, 100);

    const skip = (page - 1) * limit;

    // -----------------------------
    // Search filter
    // -----------------------------
    const matchStage = {};

    if (typeof search === "string" && search.trim()) {
      const searchRegex = new RegExp(escapeRegex(search.trim()), "i");

      matchStage.$or = [
        { fullName: searchRegex },
        { mobileNumber: searchRegex },
        { instituteName: searchRegex },
        { address: searchRegex },
      ];
    }

    // -----------------------------
    // Get students
    // -----------------------------
    const result = await Student.aggregate([
      // Search
      {
        $match: matchStage,
      },

      // Latest student first
      {
        $sort: {
          createdAt: -1,
          _id: -1,
        },
      },

      // Get ACTIVE enrollment count
      //   {
      //     $lookup: {
      //       from: "enrollments",

      //       let: {
      //         studentId: "$_id",
      //       },

      //       pipeline: [
      //         {
      //           $match: {
      //             $expr: {
      //               $and: [
      //                 {
      //                   $eq: ["$studentId", "$$studentId"],
      //                 },
      //                 {
      //                   $eq: ["$status", "ACTIVE"],
      //                 },
      //               ],
      //             },
      //           },
      //         },

      //         {
      //           $count: "count",
      //         },
      //       ],

      //       as: "activeEnrollmentCount",
      //     },
      //   },

      //   // Return required fields
      //   {
      //     $project: {
      //       _id: 1,
      //       fullName: 1,
      //       mobileNumber: 1,
      //       instituteName: 1,
      //       address: 1,
      //       status: 1,
      //       createdAt: 1,

      //       enrolledCoursesCount: {
      //         $ifNull: [
      //           {
      //             $arrayElemAt: ["$activeEnrollmentCount.count", 0],
      //           },
      //           0,
      //         ],
      //       },
      //     },
      //   },

      {
        $lookup: {
          from: Enrollment.collection.name,
          let: {
            studentId: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$studentId", "$$studentId"],
                    },
                    {
                      $eq: ["$status", "ACTIVE"],
                    },
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                enrolledCoursesCount: {
                  $sum: 1,
                },
                remainingFees: {
                  $sum: {
                    $ifNull: ["$remainingAmount", 0],
                  },
                },
              },
            },
          ],
          as: "enrollmentSummary",
        },
      },
      {
        $project: {
          _id: 1,
          fullName: 1,
          mobileNumber: 1,
          instituteName: 1,
          address: 1,
          status: 1,
          createdAt: 1,

          enrolledCoursesCount: {
            $ifNull: [
              {
                $arrayElemAt: ["$enrollmentSummary.enrolledCoursesCount", 0],
              },
              0,
            ],
          },

          remainingFees: {
            $ifNull: [
              {
                $arrayElemAt: ["$enrollmentSummary.remainingFees", 0],
              },
              0,
            ],
          },
        },
      },

      // Pagination data + total count
      {
        $facet: {
          students: [
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
      },
    ]);

    // -----------------------------
    // Extract result
    // -----------------------------
    const students = result[0]?.students || [];

    const totalStudents = result[0]?.totalCount?.[0]?.count || 0;

    const totalPages = Math.ceil(totalStudents / limit);

    // -----------------------------
    // Response
    // -----------------------------
    return res.status(200).json({
      success: true,
      message: "Students fetched successfully.",

      data: students,

      pagination: {
        currentPage: page,
        totalPages,
        totalStudents,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Get all students error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * GET /api/students/:id
 *
 * Returns:
 * - Complete student details
 * - All enrolled courses
 * - Batch details of every enrollment
 * - Payment information
 */
// export const getStudentById = async (req, res) => {
//   try {
//     const { id } = req.params;

//     // Validate MongoDB ObjectId
//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid student ID.",
//       });
//     }

//     // Find student
//     const student = await Student.findById(id).lean();

//     if (!student) {
//       return res.status(404).json({
//         success: false,
//         message: "Student not found.",
//       });
//     }

//     // Find all enrollments of this student
//     const enrollments = await Enrollment.find({
//       studentId: student._id,
//     })
//       .populate({
//         path: "courseId",
//         select:
//           "name type description durationMonths syllabus actualPrice discountedPrice status",
//       })
//       .populate({
//         path: "batchId",
//         select:
//           "name courseType mode startDate endDate trainer status",
//         populate: {
//           path: "trainer",
//           select: "name",
//         },
//       })
//       .sort({
//         enrollmentDate: -1,
//       })
//       .lean();

//     return res.status(200).json({
//       success: true,
//       message: "Student details fetched successfully.",
//       data: {
//         ...student,

//         enrolledCoursesCount: enrollments.length,

//         enrollments,
//       },
//     });
//   } catch (error) {
//     console.error("Get student by ID error:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Internal server error.",
//     });
//   }
// };

export const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID.",
      });
    }

    const student = await Student.findById(id).lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    const enrollments = await Enrollment.find({
      studentId: student._id,
    })
      .populate({
        path: "courseId",
        select:
          "name type description durationMonths syllabus actualPrice discountedPrice status",
      })
      .populate({
        path: "batchId",
        select: "name courseType mode startDate endDate trainer status",
        populate: {
          path: "trainer",
          select: "name",
        },
      })
      .sort({
        enrollmentDate: -1,
      })
      .lean();

    const enrolledCourses = enrollments.map((enrollment) => ({
      enrollmentId: enrollment._id,

      course: enrollment.courseId,

      batch: enrollment.batchId,

      courseTotalFee: enrollment.courseTotalFee,
      totalPaidAmount: enrollment.totalPaidAmount,

      // Particular course ka remaining amount
      remainingAmount: enrollment.remainingAmount,

      paymentStatus: enrollment.paymentStatus,
      registrationFeeAmount: enrollment.registrationFeeAmount,
      payments: enrollment.payments,

      enrollmentDate: enrollment.enrollmentDate,
      enrollmentStatus: enrollment.status,
    }));

    return res.status(200).json({
      success: true,
      message: "Student details fetched successfully.",
      data: {
        ...student,
        enrolledCoursesCount: enrolledCourses.length,
        enrollments: enrolledCourses,
      },
    });
  } catch (error) {
    console.error("Get student by ID error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};
