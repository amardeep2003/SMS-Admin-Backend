import express from "express";

import {
  getAllBatches,
  getBatchById,
  updateBatch,
  addStudentToBatch,
  toggleBatchStatus,
} from "../controllers/batchController.js";

import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getAllBatches);

router.get("/:id", getBatchById);

router.put("/:id", updateBatch);

router.post("/:id/students", addStudentToBatch);

router.patch("/:id/toggle-status", toggleBatchStatus);

export default router;
