import express from "express";
import {
  getAllWorks,
  createWork,
  addBeneficiaries,
  addVillages,
  addComponentsAndMilestones,
  getWorksByDivision,
   getWorkById,
  updateWork,
  deleteWork,
  updateBeneficiaries,
  updateVillages,
  updateComponents,
  getAssignedWorks
} from "../controllers/wrd/workController.js";

import {
  getAllMilestones,
  getMilestoneProgress,
  addMilestoneProgress,
  getPackageProgress,
  getPackageComponents,
  savePackageProgress,
} from "../controllers/wrd/milestoneController.js";

import { auth } from "../middleware/authMiddleware.js";

const router = express.Router();

// =============================
// WORK ROUTES
// =============================
router.get("/", auth, getAllWorks);
router.get("/:id", auth, getWorkById); // NEW
router.post("/", auth, createWork);
router.put("/:id", auth, updateWork); // NEW
router.delete("/:id", auth, deleteWork); // NEW
router.post("/:workId/beneficiaries", auth, addBeneficiaries);
router.put("/:workId/beneficiaries", auth, updateBeneficiaries); // NEW
router.post("/:workId/villages", auth, addVillages);
router.put("/:workId/villages", auth, updateVillages); // NEW
router.post("/:workId/components", auth, addComponentsAndMilestones);
router.put("/:workId/components", auth, updateComponents); // NEW
router.get("/by-division/:divisionId", auth, getWorksByDivision);

// =============================
// MILESTONE ROUTES
// =============================
router.get("/milestones", auth, getAllMilestones);
router.get("/milestones/:id/progress", auth, getMilestoneProgress);
router.post("/milestones/:id/progress", auth, addMilestoneProgress);
router.get("/package/:pkg/progress", auth, getPackageProgress);
router.get("/package/:pkg/components", auth, getPackageComponents);
router.post("/progress", auth, savePackageProgress);
router.get("/assigned/:userId", auth, getAssignedWorks);
 
export default router;