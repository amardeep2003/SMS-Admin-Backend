import express from "express";
import protect from "../middleware/authMiddleware.js";

import {
  createTrainer,
  getAllTrainers,
  getTrainerById,
  updateTrainer,
  toggleTrainerStatus,
  deleteTrainer,
  getActiveTrainersDropdown
} from "../controllers/trainerController.js";

const router = express.Router();

router.use(protect);

router.route("/").post(createTrainer).get(getAllTrainers);

router.get("/dropdown", getActiveTrainersDropdown);

router.patch("/:id/status", toggleTrainerStatus);

router
  .route("/:id")
  .get(getTrainerById)
  .patch(updateTrainer)
  .delete(deleteTrainer);

export default router;
