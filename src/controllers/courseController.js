import mongoose from "mongoose";
import Course from "../models/course.js";

const ALLOWED_COURSE_TYPES = ["VT", "LT"];
const ALLOWED_COURSE_STATUSES = ["ACTIVE", "INACTIVE"];

const ALLOWED_UPDATE_FIELDS = [
  "name",
  "type",
  "description",
  "durationMonths",
  "syllabus",
  //   "practicalWorkshopDetails",
  "actualPrice",
  "discountedPrice",
  "status",
];

const isPlainObject = (value) => {
  return value !== null && typeof value === "object" && !Array.isArray(value);
};

const formatMongooseValidationErrors = (error) => {
  return Object.values(error.errors).map((err) => ({
    field: err.path,
    message: err.message,
  }));
};

/**
 * POST /api/courses
 * Create a new course.
 */
export const createCourse = async (req, res) => {
  try {
    if (!isPlainObject(req.body)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request body.",
      });
    }

    const {
      name,
      type,
      description = "",
      durationMonths,
      syllabus = "",
      //   practicalWorkshopDetails = "",
      actualPrice,
      discountedPrice = null,
      status = "ACTIVE",
    } = req.body;

    // Validate string field types
    if (typeof name !== "string") {
      return res.status(400).json({
        success: false,
        message: "Course name must be a string.",
      });
    }

    if (typeof type !== "string") {
      return res.status(400).json({
        success: false,
        message: "Course type must be a string.",
      });
    }

    if (typeof description !== "string") {
      return res.status(400).json({
        success: false,
        message: "Description must be a string.",
      });
    }

    if (typeof syllabus !== "string") {
      return res.status(400).json({
        success: false,
        message: "Syllabus must be a string.",
      });
    }

    // if (typeof practicalWorkshopDetails !== "string") {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Practical workshop details must be a string.",
    //   });
    // }

    if (typeof status !== "string") {
      return res.status(400).json({
        success: false,
        message: "Status must be a string.",
      });
    }

    const trimmedName = name.trim();
    const normalizedType = type.trim().toUpperCase();
    const normalizedStatus = status.trim().toUpperCase();

    if (!trimmedName) {
      return res.status(400).json({
        success: false,
        message: "Course name is required.",
      });
    }

    if (trimmedName.length < 2 || trimmedName.length > 150) {
      return res.status(400).json({
        success: false,
        message: "Course name must be between 2 and 150 characters.",
      });
    }

    if (!ALLOWED_COURSE_TYPES.includes(normalizedType)) {
      return res.status(400).json({
        success: false,
        message: "Course type must be either VT or LT.",
      });
    }

    if (
      typeof durationMonths !== "number" ||
      !Number.isFinite(durationMonths) ||
      !Number.isInteger(durationMonths) ||
      durationMonths < 1 ||
      durationMonths > 12
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Course duration must be a whole number between 1 and 12 months.",
      });
    }

    if (
      typeof actualPrice !== "number" ||
      !Number.isFinite(actualPrice) ||
      actualPrice < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Actual price must be a valid non-negative number.",
      });
    }

    if (
      discountedPrice !== null &&
      (typeof discountedPrice !== "number" ||
        !Number.isFinite(discountedPrice) ||
        discountedPrice < 0)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Discounted price must be null or a valid non-negative number.",
      });
    }

    if (discountedPrice !== null && discountedPrice > actualPrice) {
      return res.status(400).json({
        success: false,
        message: "Discounted price cannot be greater than actual price.",
      });
    }

    if (!ALLOWED_COURSE_STATUSES.includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: "Status must be either ACTIVE or INACTIVE.",
      });
    }

    if (description.trim().length > 5000) {
      return res.status(400).json({
        success: false,
        message: "Description cannot exceed 5000 characters.",
      });
    }

    if (syllabus.trim().length > 10000) {
      return res.status(400).json({
        success: false,
        message: "Syllabus cannot exceed 10000 characters.",
      });
    }

    // if (practicalWorkshopDetails.trim().length > 5000) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Practical workshop details cannot exceed 5000 characters.",
    //   });
    // }

    const course = await Course.create({
      name: trimmedName,
      type: normalizedType,
      description: description.trim(),
      durationMonths,
      syllabus: syllabus.trim(),
      //   practicalWorkshopDetails: practicalWorkshopDetails.trim(),
      actualPrice,
      discountedPrice,
      status: normalizedStatus,
    });

    return res.status(201).json({
      success: true,
      message: "Course created successfully.",
      course,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Course validation failed.",
        errors: formatMongooseValidationErrors(error),
      });
    }

    console.error("Create course error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * GET /api/courses
 * Get courses with pagination, search, filters and sorting.
 * 
 * sortBy options
name , type , durationMonths , actualPrice , discountedPrice , status , createdAt , updatedAt


sortOrder options
asc   → Ascending
desc  → Descending
 * 
 */
export const getAllCourses = async (req, res) => {
  try {
    const { page, limit, search, type, status, sortBy, sortOrder } = req.query;

    // -----------------------------
    // Pagination
    // -----------------------------
    const parsedPage =
      page === undefined || String(page).trim() === "" ? 1 : Number(page);

    const parsedLimit =
      limit === undefined || String(limit).trim() === "" ? 10 : Number(limit);

    if (!Number.isInteger(parsedPage) || parsedPage < 1) {
      return res.status(400).json({
        success: false,
        message: "Page must be a positive integer.",
      });
    }

    if (
      !Number.isInteger(parsedLimit) ||
      parsedLimit < 1 ||
      parsedLimit > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Limit must be between 1 and 100.",
      });
    }

    // -----------------------------
    // Dynamic filters
    // Empty filters will be ignored
    // -----------------------------
    const filter = {};

    // Course type filter
    if (type !== undefined && String(type).trim() !== "") {
      const normalizedType = String(type).trim().toUpperCase();

      if (!ALLOWED_COURSE_TYPES.includes(normalizedType)) {
        return res.status(400).json({
          success: false,
          message: "Course type must be either VT or LT.",
        });
      }

      filter.type = normalizedType;
    }

    // Course status filter
    if (status !== undefined && String(status).trim() !== "") {
      const normalizedStatus = String(status).trim().toUpperCase();

      if (!ALLOWED_COURSE_STATUSES.includes(normalizedStatus)) {
        return res.status(400).json({
          success: false,
          message: "Status must be either ACTIVE or INACTIVE.",
        });
      }

      filter.status = normalizedStatus;
    }

    // -----------------------------
    // Search
    // Search by course name and description
    // -----------------------------
    if (search !== undefined && String(search).trim() !== "") {
      const trimmedSearch = String(search).trim();

      if (trimmedSearch.length > 100) {
        return res.status(400).json({
          success: false,
          message: "Search cannot exceed 100 characters.",
        });
      }

      // Escape regex special characters
      const escapedSearch = trimmedSearch.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      );

      filter.$or = [
        {
          name: {
            $regex: escapedSearch,
            $options: "i",
          },
        },
        {
          description: {
            $regex: escapedSearch,
            $options: "i",
          },
        },
      ];
    }

    // -----------------------------
    // Sorting
    // -----------------------------
    const allowedSortFields = [
      "name",
      "type",
      "durationMonths",
      "actualPrice",
      "discountedPrice",
      "status",
      "createdAt",
      "updatedAt",
    ];

    const finalSortBy =
      sortBy === undefined || String(sortBy).trim() === ""
        ? "createdAt"
        : String(sortBy).trim();

    if (!allowedSortFields.includes(finalSortBy)) {
      return res.status(400).json({
        success: false,
        message: `Invalid sort field. Allowed fields: ${allowedSortFields.join(
          ", ",
        )}.`,
      });
    }

    const finalSortOrder =
      sortOrder === undefined || String(sortOrder).trim() === ""
        ? "desc"
        : String(sortOrder).trim().toLowerCase();

    if (!["asc", "desc"].includes(finalSortOrder)) {
      return res.status(400).json({
        success: false,
        message: "Sort order must be either asc or desc.",
      });
    }

    const sortDirection = finalSortOrder === "asc" ? 1 : -1;

    // -----------------------------
    // Pagination calculation
    // -----------------------------
    const skip = (parsedPage - 1) * parsedLimit;

    // -----------------------------
    // Database queries
    // -----------------------------
    const [courses, totalCourses] = await Promise.all([
      Course.find(filter)
        .sort({
          [finalSortBy]: sortDirection,
          _id: -1,
        })
        .skip(skip)
        .limit(parsedLimit)
        .lean(),

      Course.countDocuments(filter),
    ]);

    const totalPages =
      totalCourses === 0 ? 0 : Math.ceil(totalCourses / parsedLimit);

    // -----------------------------
    // Response
    // -----------------------------
    return res.status(200).json({
      success: true,
      message: "Courses fetched successfully.",
      courses,
      pagination: {
        totalItems: totalCourses,
        totalPages,
        currentPage: parsedPage,
        pageSize: parsedLimit,
        hasNextPage: parsedPage < totalPages,
        hasPreviousPage: parsedPage > 1,
      },
    });
  } catch (error) {
    console.error("Get all courses error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * GET /api/courses/:id
 * Get a single course.
 */
export const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID.",
      });
    }

    const course = await Course.findById(id).lean();

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Course fetched successfully.",
      course,
    });
  } catch (error) {
    console.error("Get course error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * PATCH /api/courses/:id
 * Update a course.
 */
export const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID.",
      });
    }

    if (!isPlainObject(req.body)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request body.",
      });
    }

    const receivedFields = Object.keys(req.body);

    if (receivedFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one field is required for update.",
      });
    }

    const unknownFields = receivedFields.filter(
      (field) => !ALLOWED_UPDATE_FIELDS.includes(field),
    );

    if (unknownFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Unknown fields: ${unknownFields.join(", ")}.`,
      });
    }

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    const updates = {};

    if (req.body.name !== undefined) {
      if (typeof req.body.name !== "string") {
        return res.status(400).json({
          success: false,
          message: "Course name must be a string.",
        });
      }

      const name = req.body.name.trim();

      if (name.length < 2 || name.length > 150) {
        return res.status(400).json({
          success: false,
          message: "Course name must be between 2 and 150 characters.",
        });
      }

      updates.name = name;
    }

    if (req.body.type !== undefined) {
      if (typeof req.body.type !== "string") {
        return res.status(400).json({
          success: false,
          message: "Course type must be a string.",
        });
      }

      const type = req.body.type.trim().toUpperCase();

      if (!ALLOWED_COURSE_TYPES.includes(type)) {
        return res.status(400).json({
          success: false,
          message: "Course type must be either VT or LT.",
        });
      }

      updates.type = type;
    }

    const optionalStringFields = [
      ["description", 5000],
      ["syllabus", 10000],
      //   ["practicalWorkshopDetails", 5000],
    ];

    for (const [field, maxLength] of optionalStringFields) {
      if (req.body[field] !== undefined) {
        if (typeof req.body[field] !== "string") {
          return res.status(400).json({
            success: false,
            message: `${field} must be a string.`,
          });
        }

        const value = req.body[field].trim();

        if (value.length > maxLength) {
          return res.status(400).json({
            success: false,
            message: `${field} cannot exceed ${maxLength} characters.`,
          });
        }

        updates[field] = value;
      }
    }

    if (req.body.durationMonths !== undefined) {
      const duration = req.body.durationMonths;

      if (
        typeof duration !== "number" ||
        !Number.isFinite(duration) ||
        !Number.isInteger(duration) ||
        duration < 1 ||
        duration > 120
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Course duration must be a whole number between 1 and 120 months.",
        });
      }

      updates.durationMonths = duration;
    }

    if (req.body.actualPrice !== undefined) {
      const price = req.body.actualPrice;

      if (typeof price !== "number" || !Number.isFinite(price) || price < 0) {
        return res.status(400).json({
          success: false,
          message: "Actual price must be a valid non-negative number.",
        });
      }

      updates.actualPrice = price;
    }

    if (req.body.discountedPrice !== undefined) {
      const price = req.body.discountedPrice;

      if (
        price !== null &&
        (typeof price !== "number" || !Number.isFinite(price) || price < 0)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Discounted price must be null or a valid non-negative number.",
        });
      }

      updates.discountedPrice = price;
    }

    if (req.body.status !== undefined) {
      if (typeof req.body.status !== "string") {
        return res.status(400).json({
          success: false,
          message: "Status must be a string.",
        });
      }

      const status = req.body.status.trim().toUpperCase();

      if (!ALLOWED_COURSE_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be either ACTIVE or INACTIVE.",
        });
      }

      updates.status = status;
    }

    const finalActualPrice =
      updates.actualPrice !== undefined
        ? updates.actualPrice
        : course.actualPrice;

    const finalDiscountedPrice =
      updates.discountedPrice !== undefined
        ? updates.discountedPrice
        : course.discountedPrice;

    if (
      finalDiscountedPrice !== null &&
      finalDiscountedPrice > finalActualPrice
    ) {
      return res.status(400).json({
        success: false,
        message: "Discounted price cannot be greater than actual price.",
      });
    }

    Object.assign(course, updates);

    await course.save();

    return res.status(200).json({
      success: true,
      message: "Course updated successfully.",
      course,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Course validation failed.",
        errors: formatMongooseValidationErrors(error),
      });
    }

    console.error("Update course error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * PATCH /api/courses/:id/status
 * Change course status.
 */
export const toggleCourseStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate course ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID.",
      });
    }

    // Find course
    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    // Toggle status
    course.status = course.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    await course.save();

    return res.status(200).json({
      success: true,
      message: `Course status changed to ${course.status} successfully.`,
      course,
    });
  } catch (error) {
    console.error("Toggle course status error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * DELETE /api/courses/:id
 * Soft delete a course.
 */
export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID.",
      });
    }

    const course = await Course.findByIdAndDelete(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Course deleted successfully.",
    });
  } catch (error) {
    console.error("Delete course error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};
