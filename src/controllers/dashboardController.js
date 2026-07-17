import Enrollment from "../models/enrollment.js";
import Course from "../models/course.js";
import Student from "../models/student.js";
import Batch from "../models/batch.js";

export const getTopPopularCourses = async (req, res) => {
  try {
    const courses = await Enrollment.aggregate([
      // Only active enrollments
      {
        $match: {
          status: "ACTIVE",
        },
      },

      // Count students per course
      {
        $group: {
          _id: "$courseId",
          totalStudents: {
            $sum: 1,
          },
        },
      },

      // Highest enrolled first
      {
        $sort: {
          totalStudents: -1,
        },
      },

      // Top 5
      {
        $limit: 5,
      },

      // Course Details
      {
        $lookup: {
          from: "courses",
          localField: "_id",
          foreignField: "_id",
          as: "course",
        },
      },

      {
        $unwind: "$course",
      },

      // Active batches of this course
      {
        $lookup: {
          from: "batches",
          let: {
            courseId: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$course", "$$courseId"],
                },
                status: "ACTIVE",
              },
            },
            {
              $count: "count",
            },
          ],
          as: "batchCount",
        },
      },

      {
        $project: {
          _id: "$course._id",
          name: "$course.name",
          type: "$course.type",
          actualPrice: "$course.actualPrice",
          discountedPrice: "$course.discountedPrice",
          status: "$course.status",

          totalStudents: 1,

          totalBatches: {
            $ifNull: [
              {
                $arrayElemAt: ["$batchCount.count", 0],
              },
              0,
            ],
          },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Top 5 popular courses fetched successfully.",
      data: courses,
    });
  } catch (error) {
    console.error("Top popular courses error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const getRevenueReport = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();

    const startDate = new Date(`${currentYear}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${currentYear}-12-31T23:59:59.999Z`);

    const revenueData = await Enrollment.aggregate([
      {
        $match: {
          enrollmentDate: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },

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

      {
        $group: {
          _id: "$course.type",

          totalRevenue: {
            $sum: "$courseTotalFee",
          },

          totalEnrollments: {
            $sum: 1,
          },
        },
      },
    ]);

    const response = {
      year: currentYear,

      vt: {
        totalRevenue: 0,
        totalEnrollments: 0,
      },

      lt: {
        totalRevenue: 0,
        totalEnrollments: 0,
      },

      grandTotalRevenue: 0,
      grandTotalEnrollments: 0,
    };

    revenueData.forEach((item) => {
      if (item._id === "VT") {
        response.vt.totalRevenue = item.totalRevenue;
        response.vt.totalEnrollments = item.totalEnrollments;
      }

      if (item._id === "LT") {
        response.lt.totalRevenue = item.totalRevenue;
        response.lt.totalEnrollments = item.totalEnrollments;
      }

      response.grandTotalRevenue += item.totalRevenue;
      response.grandTotalEnrollments += item.totalEnrollments;
    });

    return res.status(200).json({
      success: true,
      message: "Revenue report fetched successfully.",
      data: response,
    });
  } catch (error) {
    console.error("Get revenue report error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const getMonthlyRevenueReport = async (req, res) => {
  try {
    let year = Number(req.query.year);

    if (!year) {
      year = new Date().getFullYear();
    }

    const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

    const revenueData = await Enrollment.aggregate([
      {
        $match: {
          enrollmentDate: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },

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

      {
        $group: {
          _id: {
            month: {
              $month: "$enrollmentDate",
            },
            type: "$course.type",
          },

          revenue: {
            $sum: "$courseTotalFee",
          },
        },
      },

      {
        $sort: {
          "_id.month": 1,
        },
      },
    ]);

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const months = monthNames.map((month) => ({
      month,
      vtRevenue: 0,
      ltRevenue: 0,
    }));

    revenueData.forEach((item) => {
      const monthIndex = item._id.month - 1;

      if (item._id.type === "VT") {
        months[monthIndex].vtRevenue = item.revenue;
      }

      if (item._id.type === "LT") {
        months[monthIndex].ltRevenue = item.revenue;
      }
    });

    return res.status(200).json({
      success: true,
      message: "Monthly revenue report fetched successfully.",
      data: {
        year,
        months,
      },
    });
  } catch (error) {
    console.error("Get monthly revenue report error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const getDashboardOverview = async (req, res) => {
  try {
    // ==========================
    // ACTIVE STUDENTS
    // ==========================
    const studentData = await Enrollment.aggregate([
      {
        $match: {
          status: "ACTIVE",
        },
      },

      {
        $lookup: {
          from: "batches",
          localField: "batchId",
          foreignField: "_id",
          as: "batch",
        },
      },

      {
        $unwind: "$batch",
      },

      {
        $match: {
          "batch.status": "ACTIVE",
        },
      },

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

      {
        $group: {
          _id: "$course.type",

          students: {
            $addToSet: "$studentId",
          },
        },
      },
    ]);

    let vtStudents = [];
    let ltStudents = [];

    studentData.forEach((item) => {
      if (item._id === "VT") {
        vtStudents = item.students;
      }

      if (item._id === "LT") {
        ltStudents = item.students;
      }
    });

    const totalStudents = new Set([
      ...vtStudents.map(String),
      ...ltStudents.map(String),
    ]);

    // ==========================
    // ACTIVE COURSES
    // ==========================
    const courseData = await Batch.aggregate([
      {
        $match: {
          status: "ACTIVE",
        },
      },

      {
        $lookup: {
          from: "courses",
          localField: "course",
          foreignField: "_id",
          as: "course",
        },
      },

      {
        $unwind: "$course",
      },

      {
        $match: {
          "course.status": "ACTIVE",
        },
      },

      {
        $group: {
          _id: "$course.type",

          courses: {
            $addToSet: "$course._id",
          },
        },
      },
    ]);

    let vtCourses = [];
    let ltCourses = [];

    courseData.forEach((item) => {
      if (item._id === "VT") {
        vtCourses = item.courses;
      }

      if (item._id === "LT") {
        ltCourses = item.courses;
      }
    });

    const totalCourses = new Set([
      ...vtCourses.map(String),
      ...ltCourses.map(String),
    ]);

    return res.status(200).json({
      success: true,
      message: "Dashboard overview fetched successfully.",

      data: {
        students: {
          vt: vtStudents.length,
          lt: ltStudents.length,
          total: totalStudents.size,
        },

        activeCourses: {
          vt: vtCourses.length,
          lt: ltCourses.length,
          total: totalCourses.size,
        },
      },
    });
  } catch (error) {
    console.error("Dashboard overview error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};
