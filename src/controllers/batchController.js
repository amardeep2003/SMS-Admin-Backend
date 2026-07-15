import mongoose from "mongoose";
import Batch from "../models/batch.js";
import Course from "../models/course.js";
import Student from "../models/student.js";
import Enrollment from "../models/enrollment.js";

const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* =========================================================
   GET ALL BATCHES
   ========================================================= */

export const getAllBatches = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      courseType = "",
      courseId = "",
    } = req.query;

    page = Math.max(parseInt(page, 10) || 1, 1);
    limit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

    const skip = (page - 1) * limit;

    const matchStage = {};

    if (courseType?.trim()) {
      const type = courseType.trim().toUpperCase();

      if (!["VT", "LT"].includes(type)) {
        return res.status(400).json({
          success: false,
          message: "Course type must be VT or LT.",
        });
      }

      matchStage.courseType = type;
    }

    if (courseId?.trim()) {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid course ID.",
        });
      }

      matchStage.course = new mongoose.Types.ObjectId(courseId);
    }

    const pipeline = [
      {
        $match: matchStage,
      },

      // Course details
      {
        $lookup: {
          from: "courses",
          localField: "course",
          foreignField: "_id",
          as: "courseDetails",
        },
      },
      {
        $unwind: {
          path: "$courseDetails",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Trainer details
      {
        $lookup: {
          from: "trainers",
          localField: "trainer",
          foreignField: "_id",
          as: "trainerDetails",
        },
      },
      {
        $unwind: {
          path: "$trainerDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    // Search only when search is provided
    if (typeof search === "string" && search.trim()) {
      const searchRegex = new RegExp(escapeRegex(search.trim()), "i");

      pipeline.push({
        $match: {
          $or: [
            { name: searchRegex },
            { "courseDetails.name": searchRegex },

            // Change "name" if your Trainer schema uses fullName
            { "trainerDetails.name": searchRegex },
            { "trainerDetails.fullName": searchRegex },
          ],
        },
      });
    }

    pipeline.push(
      {
        $sort: {
          createdAt: -1,
          _id: -1,
        },
      },

      {
        $project: {
          _id: 1,
          name: 1,
          courseType: 1,
          mode: 1,
          capacity: 1,
          enrolledStudents: {
            $size: {
              $ifNull: ["$students", []],
            },
          },
          status: 1,

          course: {
            _id: "$courseDetails._id",
            name: "$courseDetails.name",
          },

          trainer: {
            _id: "$trainerDetails._id",
            name: {
              $ifNull: ["$trainerDetails.name", "$trainerDetails.fullName"],
            },
          },

          createdAt: 1,
        },
      },

      {
        $facet: {
          batches: [{ $skip: skip }, { $limit: limit }],

          totalCount: [{ $count: "count" }],
        },
      },
    );

    const result = await Batch.aggregate(pipeline);

    const batches = result[0]?.batches || [];
    const totalBatches = result[0]?.totalCount?.[0]?.count || 0;

    const totalPages = Math.ceil(totalBatches / limit);

    return res.status(200).json({
      success: true,
      message: "Batches fetched successfully.",
      data: batches,
      pagination: {
        currentPage: page,
        totalPages,
        totalBatches,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Get all batches error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/* =========================================================
   GET SINGLE BATCH
   ========================================================= */

export const getBatchById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch ID.",
      });
    }

    const batch = await Batch.findById(id)
      .populate({
        path: "course",
        select:
          "name type durationMonths actualPrice discountedPrice status",
      })
      .populate({
        path: "students",
        select: "fullName mobileNumber instituteName address status",
      })
      .populate({
        path: "trainer",
        select: "name phone",
      })
      .lean();

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Batch fetched successfully.",
      data: {
        ...batch,
        enrolledStudents: batch.students?.length || 0,
      },
    });
  } catch (error) {
    console.error("Get batch by ID error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/* =========================================================
   UPDATE BATCH
   Basic fields + course validation + capacity handling
   ========================================================= */

// export const updateBatch = async (req, res) => {
//   const session = await mongoose.startSession();

//   try {
//     session.startTransaction();

//     const { id } = req.params;

//     const {
//       name,
//       // course,
//       // courseType,
//       mode,
//       capacity,
//       startDate,
//       endDate,
//       trainer,
//       status,
//     } = req.body;

//     if (!mongoose.Types.ObjectId.isValid(id)) {
//       await session.abortTransaction();

//       return res.status(400).json({
//         success: false,
//         message: "Invalid batch ID.",
//       });
//     }

//     const batch = await Batch.findById(id).session(session);

//     if (!batch) {
//       await session.abortTransaction();

//       return res.status(404).json({
//         success: false,
//         message: "Batch not found.",
//       });
//     }

//     /* -----------------------------
//        Course + Course Type validation
//        ----------------------------- */

//     const finalCourseId = course || batch.course;
//     const finalCourseType = (courseType || batch.courseType).toUpperCase();

//     if (!["VT", "LT"].includes(finalCourseType)) {
//       await session.abortTransaction();

//       return res.status(400).json({
//         success: false,
//         message: "Course type must be VT or LT.",
//       });
//     }

//     if (!mongoose.Types.ObjectId.isValid(finalCourseId)) {
//       await session.abortTransaction();

//       return res.status(400).json({
//         success: false,
//         message: "Invalid course ID.",
//       });
//     }

//     const selectedCourse =
//       await Course.findById(finalCourseId).session(session);

//     if (!selectedCourse) {
//       await session.abortTransaction();

//       return res.status(404).json({
//         success: false,
//         message: "Course not found.",
//       });
//     }

//     if (selectedCourse.type !== finalCourseType) {
//       await session.abortTransaction();

//       return res.status(400).json({
//         success: false,
//         message: `Selected course belongs to ${selectedCourse.type}, not ${finalCourseType}.`,
//       });
//     }

//     /* -----------------------------
//        Capacity validation
//        ----------------------------- */

//     const newCapacity =
//       capacity !== undefined ? Number(capacity) : batch.capacity;

//     if (!Number.isInteger(newCapacity) || newCapacity < 1) {
//       await session.abortTransaction();

//       return res.status(400).json({
//         success: false,
//         message: "Capacity must be a whole number greater than 0.",
//       });
//     }

//     const currentStudentCount = batch.students.length;

//     // Students who must be shifted
//     if (newCapacity < currentStudentCount) {
//       const overflowCount = currentStudentCount - newCapacity;

//       // Last added students are moved
//       const studentsToMove = batch.students.slice(-overflowCount);

//       batch.students = batch.students.slice(0, newCapacity);

//       // Find other batches of SAME course
//       for (const studentId of studentsToMove) {
//         let targetBatch = await Batch.findOne({
//           _id: { $ne: batch._id },
//           course: finalCourseId,
//           status: "ACTIVE",
//           $expr: {
//             $lt: [{ $size: { $ifNull: ["$students", []] } }, "$capacity"],
//           },
//         })
//           .sort({ createdAt: 1 })
//           .session(session);

//         // If no available batch, create new batch
//         if (!targetBatch) {
//           const batchCount = await Batch.countDocuments({
//             course: finalCourseId,
//           }).session(session);

//           const generatedName = `${selectedCourse.name} Batch ${batchCount + 1}`;

//           const createdBatches = await Batch.create(
//             [
//               {
//                 name: generatedName,
//                 course: finalCourseId,
//                 courseType: finalCourseType,
//                 mode: mode || batch.mode,
//                 capacity: batch.capacity,
//                 students: [],
//                 enrolledStudents: 0,
//                 status: "ACTIVE",
//               },
//             ],
//             { session },
//           );

//           targetBatch = createdBatches[0];
//         }

//         targetBatch.students.push(studentId);
//         targetBatch.enrolledStudents = targetBatch.students.length;

//         await targetBatch.save({ session });

//         // IMPORTANT:
//         // Enrollment batchId must also change
//         await Enrollment.findOneAndUpdate(
//           {
//             studentId,
//             courseId: finalCourseId,
//             status: "ACTIVE",
//           },
//           {
//             $set: {
//               batchId: targetBatch._id,
//             },
//           },
//           {
//             session,
//           },
//         );
//       }
//     }

//     /* -----------------------------
//        Update fields
//        ----------------------------- */

//     if (name !== undefined) batch.name = name;

//     batch.course = finalCourseId;
//     batch.courseType = finalCourseType;

//     if (mode !== undefined) batch.mode = mode;
//     if (startDate !== undefined) {
//       batch.startDate = startDate || null;
//     }

//     if (endDate !== undefined) {
//       batch.endDate = endDate || null;
//     }

//     if (trainer !== undefined) {
//       batch.trainer = trainer || null;
//     }

//     if (status !== undefined) {
//       batch.status = status;
//     }

//     batch.capacity = newCapacity;
//     batch.enrolledStudents = batch.students.length;

//     await batch.save({ session });

//     await session.commitTransaction();

//     return res.status(200).json({
//       success: true,
//       message: "Batch updated successfully.",
//       data: batch,
//     });
//   } catch (error) {
//     await session.abortTransaction();

//     console.error("Update batch error:", error);

//     if (error.code === 11000) {
//       return res.status(409).json({
//         success: false,
//         message: "Batch name already exists.",
//       });
//     }

//     return res.status(500).json({
//       success: false,
//       message: error.message || "Internal server error.",
//     });
//   } finally {
//     await session.endSession();
//   }
// };

export const updateBatch = async (req, res) => {
  try {
    const { id } = req.params;

    const { name, mode, capacity, startDate, endDate, trainer, status } =
      req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch ID.",
      });
    }

    const batch = await Batch.findById(id);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found.",
      });
    }

    // Capacity can only be increased
    if (capacity !== undefined) {
      const newCapacity = Number(capacity);

      if (!Number.isInteger(newCapacity) || newCapacity < 1) {
        return res.status(400).json({
          success: false,
          message: "Capacity must be a whole number greater than 0.",
        });
      }

      if (newCapacity < batch.capacity) {
        return res.status(400).json({
          success: false,
          message: `Capacity cannot be decreased. Current capacity is ${batch.capacity}.`,
        });
      }

      batch.capacity = newCapacity;
    }

    if (name !== undefined) {
      batch.name = name;
    }

    if (mode !== undefined) {
      batch.mode = mode;
    }

    if (startDate !== undefined) {
      batch.startDate = startDate || null;
    }

    if (endDate !== undefined) {
      batch.endDate = endDate || null;
    }

    if (trainer !== undefined) {
      batch.trainer = trainer || null;
    }

    if (status !== undefined) {
      batch.status = String(status).trim().toUpperCase();
    }

    await batch.save();

    return res.status(200).json({
      success: true,
      message: "Batch updated successfully.",
      data: batch,
    });
  } catch (error) {
    console.error("Update batch error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Batch name already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};

/* =========================================================
   ADD / MOVE STUDENT TO BATCH

   First request:
   forceMove = false

   If student already exists in another batch:
   API returns requiresConfirmation: true

   After UI confirmation:
   forceMove = true
   ========================================================= */

export const addStudentToBatch = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { id: batchId } = req.params;
    const { studentId, forceMove = false } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(batchId) ||
      !mongoose.Types.ObjectId.isValid(studentId)
    ) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Invalid batch or student ID.",
      });
    }

    const [batch, student] = await Promise.all([
      Batch.findById(batchId).session(session),
      Student.findById(studentId).session(session),
    ]);

    if (!batch) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Batch not found.",
      });
    }

    if (!student) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    // Student must actually be enrolled in this course
    const enrollment = await Enrollment.findOne({
      studentId,
      courseId: batch.course,
      status: "ACTIVE",
    }).session(session);

    if (!enrollment) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Student is not actively enrolled in this course.",
      });
    }

    // Already in current batch
    const alreadyInCurrentBatch = batch.students.some(
      (id) => id.toString() === studentId.toString(),
    );

    if (alreadyInCurrentBatch) {
      await session.abortTransaction();

      return res.status(409).json({
        success: false,
        message: "Student is already added to this batch.",
      });
    }

    // Check another batch of SAME course
    const existingBatch = await Batch.findOne({
      _id: { $ne: batch._id },
      course: batch.course,
      students: studentId,
    }).session(session);

    if (existingBatch && forceMove !== true) {
      await session.abortTransaction();

      return res.status(409).json({
        success: false,
        requiresConfirmation: true,
        message: `Student is already in batch "${existingBatch.name}". Do you want to move the student to "${batch.name}"?`,
        data: {
          currentBatchId: existingBatch._id,
          currentBatchName: existingBatch.name,
          targetBatchId: batch._id,
          targetBatchName: batch.name,
        },
      });
    }

    // Capacity check
    if (batch.students.length >= batch.capacity) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Target batch is already full.",
      });
    }

    // Remove from previous batch after confirmation
    if (existingBatch && forceMove === true) {
      existingBatch.students = existingBatch.students.filter(
        (id) => id.toString() !== studentId.toString(),
      );

      existingBatch.enrolledStudents = existingBatch.students.length;

      await existingBatch.save({ session });
    }

    // Add to target batch
    batch.students.push(studentId);
    batch.enrolledStudents = batch.students.length;

    await batch.save({ session });

    // Update enrollment batch reference
    enrollment.batchId = batch._id;
    await enrollment.save({ session });

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: existingBatch
        ? "Student moved to new batch successfully."
        : "Student added to batch successfully.",
      data: {
        studentId: student._id,
        batchId: batch._id,
      },
    });
  } catch (error) {
    await session.abortTransaction();

    console.error("Add student to batch error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  } finally {
    await session.endSession();
  }
};

/* =========================================================
   TOGGLE ACTIVE / INACTIVE
   ========================================================= */

export const toggleBatchStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch ID.",
      });
    }

    const batch = await Batch.findById(id);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found.",
      });
    }

    if (batch.status === "COMPLETED") {
      return res.status(400).json({
        success: false,
        message: "Completed batch cannot be toggled.",
      });
    }

    batch.status = batch.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    await batch.save();

    return res.status(200).json({
      success: true,
      message: `Batch status changed to ${batch.status}.`,
      data: {
        _id: batch._id,
        status: batch.status,
      },
    });
  } catch (error) {
    console.error("Toggle batch status error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};
