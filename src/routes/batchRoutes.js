import express from "express";

import {
  getAllBatches,
  getBatchById,
  updateBatch,
  addStudentToBatch,
  toggleBatchStatus,
} from "../controllers/batchController.js";

const router = express.Router();

router.get("/", getAllBatches);

router.get("/:id", getBatchById);

router.put("/:id", updateBatch);

router.post("/:id/students", addStudentToBatch);

router.patch("/:id/toggle-status", toggleBatchStatus);

export default router;
