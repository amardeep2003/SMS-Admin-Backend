import express from "express";

import {
  getTopPopularCourses
} from "../controllers/dashboardController.js";

import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getTopPopularCourses);



export default router;
