import mongoose from "mongoose";
import Enrollment from "../models/enrollment.js";
import Student from "../models/student.js";
import Course from "../models/course.js";
import Batch from "../models/batch.js";
import ExcelJS from "exceljs";

// Helper function to check if a value is actually present and valid (not empty/null/undefined)
const isValidValue = (value) => {
  if (value === undefined || value === null) return false;

  const str = String(value).trim();
  if (
    str === "" ||
    str.toLowerCase() === "null" ||
    str.toLowerCase() === "undefined"
  ) {
    return false;
  }
  return true;
};

// Robust Aggregate Query Pipeline Builder
const buildReportPipeline = (query) => {
  const {
    search,
    batchId,
    courseId,
    batchMode,
    courseType,
    batchStatus,
    year,
  } = query;

  const matchStage = {};

  // Note: Yahan hum safe check laga rahe hain kyunki db validation hum controller functions me pehle hi kar chuke hain
  if (isValidValue(courseId) && mongoose.Types.ObjectId.isValid(courseId)) {
    matchStage.courseId = new mongoose.Types.ObjectId(courseId);
  }

  if (isValidValue(batchId) && mongoose.Types.ObjectId.isValid(batchId)) {
    matchStage.batchId = new mongoose.Types.ObjectId(batchId);
  }

  if (isValidValue(year)) {
    const parsedYear = parseInt(year);
    if (!isNaN(parsedYear)) {
      matchStage.$expr = { $eq: [{ $year: "$enrollmentDate" }, parsedYear] };
    }
  }

  const pipeline = [];

  if (Object.keys(matchStage).length > 0) {
    pipeline.push({ $match: matchStage });
  }

  // Lookup Student
  pipeline.push(
    {
      $lookup: {
        from: "students",
        localField: "studentId",
        foreignField: "_id",
        as: "student",
      },
    },
    { $unwind: "$student" },
  );

  // Lookup Batch
  pipeline.push(
    {
      $lookup: {
        from: "batches",
        localField: "batchId",
        foreignField: "_id",
        as: "batch",
      },
    },
    { $unwind: "$batch" },
  );

  // Lookup Course
  pipeline.push(
    {
      $lookup: {
        from: "courses",
        localField: "courseId",
        foreignField: "_id",
        as: "course",
      },
    },
    { $unwind: "$course" },
  );

  // Post-Join filters (Student Search, Batch Details & Course Details)
  const postMatchStage = {};

  if (isValidValue(search)) {
    postMatchStage.$or = [
      { "student.fullName": { $regex: search, $options: "i" } },
      { "student.mobileNumber": { $regex: search, $options: "i" } },
    ];
  }

  if (isValidValue(batchMode)) {
    const modeUpper = batchMode.toUpperCase();
    if (["ONLINE", "OFFLINE"].includes(modeUpper)) {
      postMatchStage["batch.mode"] = modeUpper;
    }
  }

  if (isValidValue(courseType)) {
    const typeUpper = courseType.toUpperCase();
    if (["VT", "LT"].includes(typeUpper)) {
      postMatchStage["course.type"] = typeUpper;
    }
  }

  if (isValidValue(batchStatus)) {
    const statusUpper = batchStatus.toUpperCase();
    if (["ACTIVE", "INACTIVE", "COMPLETED", "RUNNING"].includes(statusUpper)) {
      postMatchStage["batch.status"] = statusUpper;
    }
  }

  if (Object.keys(postMatchStage).length > 0) {
    pipeline.push({ $match: postMatchStage });
  }

  return pipeline;
};

// ==========================================
// 1. Get All Students (Financial Summary List with Filters & Pagination)
// ==========================================
export const getFinancialReport = async (req, res) => {
  try {
    const {
      page,
      limit,
      sortByRemaining = "desc",
      courseId,
      batchId,
    } = req.query;

    // --- DATABASE EXISTENCE VALIDATION ---
    // 1. Agar courseId bheja hai toh check karo database me exist karta hai ya nahi
    if (isValidValue(courseId)) {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return res
          .status(400)
          .json({ success: false, message: "Course ID format is invalid." });
      }
      const courseExists = await Course.exists({ _id: courseId });
      if (!courseExists) {
        return res.status(404).json({
          success: false,
          message: "The selected Course does not exist in our records.",
        });
      }
    }

    // 2. Agar batchId bheja hai toh check karo database me exist karta hai ya nahi
    if (isValidValue(batchId)) {
      if (!mongoose.Types.ObjectId.isValid(batchId)) {
        return res
          .status(400)
          .json({ success: false, message: "Batch ID format is invalid." });
      }
      const batchExists = await Batch.exists({ _id: batchId });
      if (!batchExists) {
        return res.status(404).json({
          success: false,
          message: "The selected Batch does not exist in our records.",
        });
      }
    }
    // -------------------------------------

    // Safe parsing for page and limit
    let pageNum = parseInt(page);
    let limitNum = parseInt(limit);

    if (isNaN(pageNum) || pageNum < 1) pageNum = 1;
    if (isNaN(limitNum) || limitNum < 1) limitNum = 10;

    const skip = (pageNum - 1) * limitNum;
    const parsedLimit = limitNum;

    const pipeline = buildReportPipeline(req.query);

    // Grouping by studentId
    pipeline.push({
      $group: {
        _id: "$studentId",
        studentName: { $first: "$student.fullName" },
        contact: { $first: "$student.mobileNumber" },
        enrolledCoursesCount: { $sum: 1 },
        totalFee: { $sum: "$courseTotalFee" },
        totalPaid: { $sum: "$totalPaidAmount" },
        totalRemaining: { $sum: "$remainingAmount" },
        courses: {
          $push: {
            courseName: "$course.name",
            courseFee: "$courseTotalFee",
            paid: "$totalPaidAmount",
            remaining: "$remainingAmount",
            paymentStatus: "$paymentStatus",
          },
        },
      },
    });

    // Payment Status Calculation
    pipeline.push({
      $addFields: {
        paymentStatus: {
          $cond: {
            if: { $eq: ["$totalRemaining", 0] },
            then: "PAID",
            else: {
              $cond: {
                if: { $eq: ["$totalPaid", 0] },
                then: "UNPAID",
                else: "PARTIALLY_PAID",
              },
            },
          },
        },
      },
    });

    const sortOrder = String(sortByRemaining).toLowerCase() === "asc" ? 1 : -1;
    pipeline.push({ $sort: { totalRemaining: sortOrder } });

    pipeline.push({
      $facet: {
        metadata: [{ $count: "total" }],
        data: [{ $skip: skip }, { $limit: parsedLimit }],
      },
    });

    const result = await Enrollment.aggregate(pipeline);
    const totalRecords = result[0]?.metadata[0]?.total || 0;
    const studentsReport = result[0]?.data || [];

    return res.status(200).json({
      success: true,
      message: "Financial report fetched successfully",
      pagination: {
        totalRecords,
        currentPage: pageNum,
        totalPages: Math.ceil(totalRecords / parsedLimit),
        limit: parsedLimit,
      },
      data: studentsReport,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// ==========================================
// 2. Get Single Student Financial details
// ==========================================
export const getStudentFinancialDetails = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res
        .status(400)
        .json({ success: false, message: "A valid Student ID is required." });
    }

    const studentInfo = await Student.findById(studentId);
    if (!studentInfo) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found in our records." });
    }

    const enrollments = await Enrollment.find({ studentId })
      .populate("courseId", "name type description durationMonths")
      .populate("batchId", "name mode status startDate");

    const formattedData = enrollments.map((item) => ({
      enrollmentId: item._id,
      course: {
        id: item.courseId?._id,
        name: item.courseId?.name,
        type: item.courseId?.type,
      },
      batch: {
        id: item.batchId?._id,
        name: item.batchId?.name,
        mode: item.batchId?.mode,
        status: item.batchId?.status,
      },
      financialBreakdown: {
        courseTotalFee: item.courseTotalFee,
        registrationFeeAmount: item.registrationFeeAmount,
        totalPaidAmount: item.totalPaidAmount,
        remainingAmount: item.remainingAmount,
        paymentStatus: item.paymentStatus,
      },
      paymentHistory: item.payments,
      enrollmentDate: item.enrollmentDate,
      status: item.status,
    }));

    return res.status(200).json({
      success: true,
      data: {
        student: {
          id: studentInfo._id,
          fullName: studentInfo.fullName,
          mobileNumber: studentInfo.mobileNumber,
          instituteName: studentInfo.instituteName,
          status: studentInfo.status,
        },
        enrollments: formattedData,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// ==========================================
// 3. Export Financial Report to Excel
// ==========================================
export const exportFinancialReportToExcel = async (req, res) => {
  try {
    const { courseId, batchId } = req.query;

    // --- DATABASE EXISTENCE VALIDATION (EXCEL) ---
    if (isValidValue(courseId)) {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return res
          .status(400)
          .json({ success: false, message: "Course ID format is invalid." });
      }
      const courseExists = await Course.exists({ _id: courseId });
      if (!courseExists) {
        return res.status(404).json({
          success: false,
          message: "The selected Course does not exist.",
        });
      }
    }

    if (isValidValue(batchId)) {
      if (!mongoose.Types.ObjectId.isValid(batchId)) {
        return res
          .status(400)
          .json({ success: false, message: "Batch ID format is invalid." });
      }
      const batchExists = await Batch.exists({ _id: batchId });
      if (!batchExists) {
        return res.status(404).json({
          success: false,
          message: "The selected Batch does not exist.",
        });
      }
    }
    // --------------------------------------------

    const pipeline = buildReportPipeline(req.query);

    pipeline.push({
      $group: {
        _id: "$studentId",
        studentName: { $first: "$student.fullName" },
        contact: { $first: "$student.mobileNumber" },
        enrolledCoursesCount: { $sum: 1 },
        totalFee: { $sum: "$courseTotalFee" },
        totalPaid: { $sum: "$totalPaidAmount" },
        totalRemaining: { $sum: "$remainingAmount" },
        courses: {
          $push: {
            courseName: "$course.name",
            courseFee: "$courseTotalFee",
            paid: "$totalPaidAmount",
            remaining: "$remainingAmount",
          },
        },
      },
    });

    pipeline.push({
      $addFields: {
        paymentStatus: {
          $cond: {
            if: { $eq: ["$totalRemaining", 0] },
            then: "PAID",
            else: {
              $cond: {
                if: { $eq: ["$totalPaid", 0] },
                then: "UNPAID",
                else: "PARTIALLY_PAID",
              },
            },
          },
        },
      },
    });

    const reportData = await Enrollment.aggregate(pipeline);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Financial Report");

    worksheet.columns = [
      { header: "Student Name", key: "studentName", width: 25 },
      { header: "Contact Number", key: "contact", width: 18 },
      {
        header: "No. of Enrolled Courses",
        key: "enrolledCoursesCount",
        width: 22,
      },
      {
        header: "Enrolled Courses Details Breakdown",
        key: "coursesBreakdown",
        width: 60,
      },
      { header: "Total Fee (All Courses)", key: "totalFee", width: 20 },
      { header: "Total Paid (All Courses)", key: "totalPaid", width: 20 },
      {
        header: "Total Remaining (All Courses)",
        key: "totalRemaining",
        width: 20,
      },
      { header: "Overall Status", key: "paymentStatus", width: 18 },
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFF" } };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "1F4E78" },
    };

    reportData.forEach((student) => {
      const coursesBreakdownString = student.courses
        .map(
          (c) =>
            `${c.courseName} (Fee: ${c.courseFee}, Paid: ${c.paid}, Rem: ${c.remaining})`,
        )
        .join(" | ");

      worksheet.addRow({
        studentName: student.studentName,
        contact: student.contact,
        enrolledCoursesCount: student.enrolledCoursesCount,
        coursesBreakdown: coursesBreakdownString,
        totalFee: student.totalFee,
        totalPaid: student.totalPaid,
        totalRemaining: student.totalRemaining,
        paymentStatus: student.paymentStatus,
      });
    });

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.getCell("studentName").alignment = {
          vertical: "middle",
          horizontal: "left",
        };
        row.getCell("contact").alignment = {
          vertical: "middle",
          horizontal: "center",
        };
        row.getCell("enrolledCoursesCount").alignment = {
          vertical: "middle",
          horizontal: "center",
        };
        row.getCell("coursesBreakdown").alignment = {
          vertical: "middle",
          horizontal: "left",
          wrapText: true,
        };
        row.getCell("totalFee").alignment = {
          vertical: "middle",
          horizontal: "right",
        };
        row.getCell("totalPaid").alignment = {
          vertical: "middle",
          horizontal: "right",
        };
        row.getCell("totalRemaining").alignment = {
          vertical: "middle",
          horizontal: "right",
        };
        row.getCell("paymentStatus").alignment = {
          vertical: "middle",
          horizontal: "center",
        };
      }
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=" + `Financial_Report_${Date.now()}.xlsx`,
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to export Excel file",
    });
  }
};
