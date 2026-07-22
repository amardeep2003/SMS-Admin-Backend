import express from "express";

import {
  getAllBatches,
  getBatchById,
  updateBatch,
  addStudentToBatch,
  toggleBatchStatus,
  addBatch,
  removeStudentFromBatch
} from "../controllers/batchController.js";

import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/", addBatch);

router.get("/", getAllBatches);

router.get("/:id", getBatchById);

router.put("/:id", updateBatch);

router.post("/:id/students", addStudentToBatch);

router.patch("/:id/toggle-status", toggleBatchStatus);

router.patch("/:batchId/remove-student/:studentId", removeStudentFromBatch);

export default router;
