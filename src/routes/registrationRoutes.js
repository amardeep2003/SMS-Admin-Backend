import express from "express";
import protect from "../middleware/authMiddleware.js";

import {
  registerStudent,
  getCourseFeeStructure
} from "../controllers/registrationController.js";

const router = express.Router();

// router.use(protect);

router.post("/enroll", registerStudent);

router.get("/:id/fee-structure", getCourseFeeStructure);

export default router;