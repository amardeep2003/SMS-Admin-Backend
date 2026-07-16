import Enrollment from "../models/enrollment.js";

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

module.exports={
    getTopPopularCourses
}