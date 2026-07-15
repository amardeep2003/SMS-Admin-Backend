import express from "express";

import {
  getAllStudents,
  getStudentById,
} from "../controllers/studentController.js";

const router = express.Router();

// GET /api/students
router.get("/", getAllStudents);

// GET /api/students/:id
router.get("/:id", getStudentById);

export default router;
