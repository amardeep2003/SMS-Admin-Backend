import express from "express";
import protect from "../middleware/authMiddleware.js";

import {
  registerStudent,
} from "../controllers/registrationController.js";

const router = express.Router();

// router.use(protect);

router.post("/enroll", registerStudent);

export default router;