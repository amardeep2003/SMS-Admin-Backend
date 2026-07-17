import express from "express";

import {
  addAffiliatePartner,
  getAffiliatePartnerForEdit,
  updateAffiliatePartner,
  deleteAffiliatePartner,
  getAllAffiliatePartners,
  getAffiliatePartnerById,
  getActiveAffiliatePartnersDropdown
} from "../controllers/affiliateController.js";

import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/", addAffiliatePartner);

router.get("/:id/edit", getAffiliatePartnerForEdit);

router.put("/:id", updateAffiliatePartner);

router.delete("/:id", deleteAffiliatePartner);

router.get("/get/all", getAllAffiliatePartners);

router.get("/:id/single", getAffiliatePartnerById);

router.get("/dropdown", getActiveAffiliatePartnersDropdown);

export default router;
