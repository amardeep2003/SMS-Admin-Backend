import express from "express";

import {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  toggleCourseStatus,
  deleteCourse,
  getActiveCoursesDropdown
} from "../controllers/courseController.js";

import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// All course routes require authenticated admin
router.use(protect);

router.post("/", createCourse);

router.get("/", getAllCourses);

router.get("/dropdown", getActiveCoursesDropdown);

router.patch("/:id/status", toggleCourseStatus);

router.get("/:id", getCourseById);

router.patch("/:id", updateCourse);

router.delete("/:id", deleteCourse);

export default router;