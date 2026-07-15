import express from "express";
import { getAllEnrollments } from "../controllers/enrollmentController.js";

const router = express.Router();

// GET /api/enrollments
router.get("/", getAllEnrollments);

export default router;