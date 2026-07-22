import express from "express";
import {
  getAllEnrollments,
  updateEnrollmentAffiliatePartner,
  addEnrollmentPayment
} from "../controllers/enrollmentController.js";

import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

// GET /api/enrollments
router.get("/", getAllEnrollments);

router.patch("/:id/affiliate", updateEnrollmentAffiliatePartner);

router.post("/:enrollmentId/payment", addEnrollmentPayment);



export default router;
