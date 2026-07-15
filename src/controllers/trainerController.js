import mongoose from "mongoose";
import Trainer from "../models/trainer.js";

const ALLOWED_TRAINER_STATUSES = ["ACTIVE", "INACTIVE"];

const ALLOWED_CREATE_FIELDS = [
  "name",
  "email",
  "phone",
  "qualification",
  "specialization",
  "monthlySalary",
  "joiningDate",
  "status",
];

const ALLOWED_UPDATE_FIELDS = [
  "name",
  "email",
  "phone",
  "qualification",
  "specialization",
  "monthlySalary",
  "joiningDate",
  "status",
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;

const isPlainObject = (value) => {
  return value !== null && typeof value === "object" && !Array.isArray(value);
};

const formatMongooseValidationErrors = (error) => {
  return Object.values(error.errors || {}).map((err) => ({
    field: err.path,
    message: err.message,
  }));
};

const normalizeSpecializations = (specializations) => {
  return [
    ...new Map(
      specializations.map((item) => {
        const trimmedItem = item.trim();
        return [trimmedItem.toLowerCase(), trimmedItem];
      }),
    ).values(),
  ];
};

const validateSpecialization = (specialization) => {
  if (!Array.isArray(specialization)) {
    return "Specialization must be an array.";
  }

  if (specialization.length < 1 || specialization.length > 20) {
    return "Specialization must contain between 1 and 20 items.";
  }

  for (const item of specialization) {
    if (typeof item !== "string") {
      return "Each specialization must be a string.";
    }

    const trimmedItem = item.trim();

    if (trimmedItem.length < 2 || trimmedItem.length > 100) {
      return "Each specialization must be between 2 and 100 characters.";
    }
  }

  return null;
};

const handleTrainerError = (res, error, action) => {
  if (error?.code === 11000) {
    const field = Object.keys(error.keyPattern || error.keyValue || {})[0];

    return res.status(409).json({
      success: false,
      message: field
        ? `A trainer with this ${field} already exists.`
        : "Trainer already exists.",
    });
  }

  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Trainer validation failed.",
      errors: formatMongooseValidationErrors(error),
    });
  }

  console.error(`${action} error:`, error);

  return res.status(500).json({
    success: false,
    message: "Internal server error.",
  });
};

/**
 * POST /api/trainers
 * Create a new trainer.
 */
export const createTrainer = async (req, res) => {
  try {
    if (!isPlainObject(req.body)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request body.",
      });
    }

    const receivedFields = Object.keys(req.body);

    const unknownFields = receivedFields.filter(
      (field) => !ALLOWED_CREATE_FIELDS.includes(field),
    );

    if (unknownFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Unknown fields: ${unknownFields.join(", ")}.`,
      });
    }

    const {
      name,
      email,
      phone,
      qualification,
      specialization,
      monthlySalary,
      joiningDate,
      status = "ACTIVE",
    } = req.body;

    // Name validation
    if (typeof name !== "string") {
      return res.status(400).json({
        success: false,
        message: "Trainer name must be a string.",
      });
    }

    const normalizedName = name.trim();

    if (normalizedName.length < 2 || normalizedName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Trainer name must be between 2 and 100 characters.",
      });
    }

    // Email validation
    if (typeof email !== "string") {
      return res.status(400).json({
        success: false,
        message: "Email must be a string.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (
      normalizedEmail.length === 0 ||
      normalizedEmail.length > 150 ||
      !EMAIL_REGEX.test(normalizedEmail)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    // Phone validation
    if (typeof phone !== "string") {
      return res.status(400).json({
        success: false,
        message: "Phone must be a string.",
      });
    }

    const normalizedPhone = phone.trim();

    if (!PHONE_REGEX.test(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid 10-digit Indian mobile number.",
      });
    }

    // Qualification validation
    if (typeof qualification !== "string") {
      return res.status(400).json({
        success: false,
        message: "Qualification must be a string.",
      });
    }

    const normalizedQualification = qualification.trim();

    if (
      normalizedQualification.length < 2 ||
      normalizedQualification.length > 250
    ) {
      return res.status(400).json({
        success: false,
        message: "Qualification must be between 2 and 250 characters.",
      });
    }

    // Specialization validation
    const specializationError = validateSpecialization(specialization);

    if (specializationError) {
      return res.status(400).json({
        success: false,
        message: specializationError,
      });
    }

    const normalizedSpecialization = normalizeSpecializations(specialization);

    // Salary validation
    if (
      typeof monthlySalary !== "number" ||
      !Number.isFinite(monthlySalary) ||
      monthlySalary < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Monthly salary must be a valid non-negative number.",
      });
    }

    // Joining date validation
    if (
      joiningDate === undefined ||
      joiningDate === null ||
      joiningDate === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Joining date is required.",
      });
    }

    const parsedJoiningDate = new Date(joiningDate);

    if (Number.isNaN(parsedJoiningDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Joining date must be a valid date.",
      });
    }

    // Status validation
    if (typeof status !== "string") {
      return res.status(400).json({
        success: false,
        message: "Status must be a string.",
      });
    }

    const normalizedStatus = status.trim().toUpperCase();

    if (!ALLOWED_TRAINER_STATUSES.includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: "Status must be either ACTIVE or INACTIVE.",
      });
    }

    const trainer = await Trainer.create({
      name: normalizedName,
      email: normalizedEmail,
      phone: normalizedPhone,
      qualification: normalizedQualification,
      specialization: normalizedSpecialization,
      monthlySalary,
      joiningDate: parsedJoiningDate,
      status: normalizedStatus,
    });

    return res.status(201).json({
      success: true,
      message: "Trainer created successfully.",
      trainer,
    });
  } catch (error) {
    return handleTrainerError(res, error, "Create trainer");
  }
};

/**
 * GET /api/trainers
 * Pagination, search, status filter and sorting.
 */
export const getAllTrainers = async (req, res) => {
  try {
    const { page, limit, search, status, sortBy, sortOrder } = req.query;

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

    // Status filter
    if (status !== undefined && String(status).trim() !== "") {
      const normalizedStatus = String(status).trim().toUpperCase();

      if (!ALLOWED_TRAINER_STATUSES.includes(normalizedStatus)) {
        return res.status(400).json({
          success: false,
          message: "Status must be either ACTIVE or INACTIVE.",
        });
      }

      filter.status = normalizedStatus;
    }

    // // -----------------------------
    // // Search
    // // Search by name, email, phone,
    // // qualification and specialization
    // // -----------------------------
    // if (search !== undefined && String(search).trim() !== "") {
    //   const trimmedSearch = String(search).trim();

    //   if (trimmedSearch.length > 100) {
    //     return res.status(400).json({
    //       success: false,
    //       message: "Search cannot exceed 100 characters.",
    //     });
    //   }

    //   // Escape regex special characters
    //   const escapedSearch = trimmedSearch.replace(
    //     /[.*+?^${}()|[\]\\]/g,
    //     "\\$&",
    //   );

    //   filter.$or = [
    //     {
    //       name: {
    //         $regex: escapedSearch,
    //         $options: "i",
    //       },
    //     },
    //     {
    //       email: {
    //         $regex: escapedSearch,
    //         $options: "i",
    //       },
    //     },
    //     {
    //       phone: {
    //         $regex: escapedSearch,
    //         $options: "i",
    //       },
    //     },
    //     {
    //       qualification: {
    //         $regex: escapedSearch,
    //         $options: "i",
    //       },
    //     },
    //     {
    //       specialization: {
    //         $regex: escapedSearch,
    //         $options: "i",
    //       },
    //     },
    //   ];
    // }

    // -----------------------------
    // Search
    // Search across:
    // name, email, phone,
    // qualification, specialization
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

      const searchRegex = new RegExp(escapedSearch, "i");

      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { qualification: searchRegex },
        { specialization: searchRegex },
      ];
    }

    // -----------------------------
    // Sorting
    // -----------------------------
    const allowedSortFields = [
      "name",
      "email",
      "phone",
      "qualification",
      "monthlySalary",
      "joiningDate",
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
    const [trainers, totalTrainers] = await Promise.all([
      Trainer.find(filter)
        .sort({
          [finalSortBy]: sortDirection,
          _id: -1,
        })
        .skip(skip)
        .limit(parsedLimit)
        .lean(),

      Trainer.countDocuments(filter),
    ]);

    const totalPages =
      totalTrainers === 0 ? 0 : Math.ceil(totalTrainers / parsedLimit);

    // -----------------------------
    // Response
    // -----------------------------
    return res.status(200).json({
      success: true,
      message: "Trainers fetched successfully.",
      trainers,
      pagination: {
        totalItems: totalTrainers,
        totalPages,
        currentPage: parsedPage,
        pageSize: parsedLimit,
        hasNextPage: parsedPage < totalPages,
        hasPreviousPage: parsedPage > 1,
      },
    });
  } catch (error) {
    console.error("Get all trainers error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * GET /api/trainers/:id
 */
export const getTrainerById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid trainer ID.",
      });
    }

    const trainer = await Trainer.findById(id).lean();

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: "Trainer not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Trainer fetched successfully.",
      trainer,
    });
  } catch (error) {
    return handleTrainerError(res, error, "Get trainer");
  }
};

/**
 * PATCH /api/trainers/:id
 */
export const updateTrainer = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid trainer ID.",
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

    const trainer = await Trainer.findById(id);

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: "Trainer not found.",
      });
    }

    const updates = {};

    if (req.body.name !== undefined) {
      if (typeof req.body.name !== "string") {
        return res.status(400).json({
          success: false,
          message: "Trainer name must be a string.",
        });
      }

      const value = req.body.name.trim();

      if (value.length < 2 || value.length > 100) {
        return res.status(400).json({
          success: false,
          message: "Trainer name must be between 2 and 100 characters.",
        });
      }

      updates.name = value;
    }

    if (req.body.email !== undefined) {
      if (typeof req.body.email !== "string") {
        return res.status(400).json({
          success: false,
          message: "Email must be a string.",
        });
      }

      const value = req.body.email.trim().toLowerCase();

      if (
        value.length === 0 ||
        value.length > 150 ||
        !EMAIL_REGEX.test(value)
      ) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid email address.",
        });
      }

      updates.email = value;
    }

    if (req.body.phone !== undefined) {
      if (typeof req.body.phone !== "string") {
        return res.status(400).json({
          success: false,
          message: "Phone must be a string.",
        });
      }

      const value = req.body.phone.trim();

      if (!PHONE_REGEX.test(value)) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid 10-digit Indian mobile number.",
        });
      }

      updates.phone = value;
    }

    if (req.body.qualification !== undefined) {
      if (typeof req.body.qualification !== "string") {
        return res.status(400).json({
          success: false,
          message: "Qualification must be a string.",
        });
      }

      const value = req.body.qualification.trim();

      if (value.length < 2 || value.length > 250) {
        return res.status(400).json({
          success: false,
          message: "Qualification must be between 2 and 250 characters.",
        });
      }

      updates.qualification = value;
    }

    if (req.body.specialization !== undefined) {
      const specializationError = validateSpecialization(
        req.body.specialization,
      );

      if (specializationError) {
        return res.status(400).json({
          success: false,
          message: specializationError,
        });
      }

      updates.specialization = normalizeSpecializations(
        req.body.specialization,
      );
    }

    if (req.body.monthlySalary !== undefined) {
      const value = req.body.monthlySalary;

      if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        return res.status(400).json({
          success: false,
          message: "Monthly salary must be a valid non-negative number.",
        });
      }

      updates.monthlySalary = value;
    }

    if (req.body.joiningDate !== undefined) {
      if (req.body.joiningDate === null || req.body.joiningDate === "") {
        return res.status(400).json({
          success: false,
          message: "Joining date cannot be empty.",
        });
      }

      const parsedDate = new Date(req.body.joiningDate);

      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Joining date must be a valid date.",
        });
      }

      updates.joiningDate = parsedDate;
    }

    if (req.body.status !== undefined) {
      if (typeof req.body.status !== "string") {
        return res.status(400).json({
          success: false,
          message: "Status must be a string.",
        });
      }

      const value = req.body.status.trim().toUpperCase();

      if (!ALLOWED_TRAINER_STATUSES.includes(value)) {
        return res.status(400).json({
          success: false,
          message: "Status must be either ACTIVE or INACTIVE.",
        });
      }

      updates.status = value;
    }

    Object.assign(trainer, updates);

    await trainer.save();

    return res.status(200).json({
      success: true,
      message: "Trainer updated successfully.",
      trainer,
    });
  } catch (error) {
    return handleTrainerError(res, error, "Update trainer");
  }
};

/**
 * PATCH /api/trainers/:id/status
 * Toggle trainer status:
 * ACTIVE -> INACTIVE
 * INACTIVE -> ACTIVE
 */
export const toggleTrainerStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid trainer ID.",
      });
    }

    const trainer = await Trainer.findById(id);

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: "Trainer not found.",
      });
    }

    trainer.status = trainer.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    await trainer.save();

    return res.status(200).json({
      success: true,
      message: `Trainer status changed to ${trainer.status} successfully.`,
      trainer,
    });
  } catch (error) {
    console.error("Toggle trainer status error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

/**
 * DELETE /api/trainers/:id
 * Currently performs a hard delete.
 */
export const deleteTrainer = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid trainer ID.",
      });
    }

    const trainer = await Trainer.findByIdAndDelete(id);

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: "Trainer not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Trainer deleted successfully.",
    });
  } catch (error) {
    return handleTrainerError(res, error, "Delete trainer");
  }
};

/**
 * GET /api/trainers/dropdown
 * Get all active trainers for dropdown.
 * Returns only trainer ID and name.
 */
export const getActiveTrainersDropdown = async (req, res) => {
  try {
    const trainers = await Trainer.find({
      status: "ACTIVE",
    })
      .select("_id name")
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Active trainers fetched successfully.",
      trainers,
    });
  } catch (error) {
    console.error("Get active trainers dropdown error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};
