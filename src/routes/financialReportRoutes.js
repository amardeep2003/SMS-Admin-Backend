import express from "express";
import {
  getFinancialReport,
  getStudentFinancialDetails,
  exportFinancialReportToExcel
} from "../controllers/financialReportController.js"; 

import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

// Financial Section APIs
router.get("/financial/summary", getFinancialReport);
router.get("/financial/student/:studentId", getStudentFinancialDetails);
router.get("/financial/export-excel", exportFinancialReportToExcel);

export default router;