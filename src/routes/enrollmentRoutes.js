import express from "express";
import {
  getAllEnrollments,
  updateEnrollmentAffiliatePartner,
} from "../controllers/enrollmentController.js";

const router = express.Router();

// GET /api/enrollments
router.get("/", getAllEnrollments);

router.patch("/:id/affiliate", updateEnrollmentAffiliatePartner);

export default router;
