import express from "express";

import {
  getTopPopularCourses,
  getRevenueReport,
  getMonthlyRevenueReport,
  getDashboardOverview
} from "../controllers/dashboardController.js";

import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getTopPopularCourses);

router.get("/revenue/report",getRevenueReport);

router.get("/monthly/revenue/graph",getMonthlyRevenueReport);

router.get("/stu-cour/count",getDashboardOverview)



export default router;
