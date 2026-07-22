import express from "express";
import {
  getAllEnrollments,
  updateEnrollmentAffiliatePartner,
  addEnrollmentPayment,
  getEnrollmentById
} from "../controllers/enrollmentController.js";

import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

// GET /api/enrollments
router.get("/", getAllEnrollments);

router.patch("/:id/affiliate", updateEnrollmentAffiliatePartner);

router.post("/:enrollmentId/payment", addEnrollmentPayment);

router.get("/:id", getEnrollmentById);



export default router;
