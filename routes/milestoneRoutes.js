import express from "express";
 
import { auth } from "../middleware/authMiddleware.js";
import {
  getAllMilestones,
  getMilestoneProgress,
  addMilestoneProgress,
  getPackageProgress,
  getPackageComponents,
  savePackageProgress,
  getworkbyMilestone,
 getPackageComponentsDetailed,
 getPackageMilestones,
  saveMilestoneProgress,
 
} from "../controllers/wrd/milestoneController.js";
 
 
const router = express.Router();
router.get("/miles", auth ,getworkbyMilestone);
router.get("/", auth ,getAllMilestones);
router.get("/:id/progress",auth , getMilestoneProgress);
router.post("/:id/progress",auth , addMilestoneProgress);
router.get("/package/:pkg/progress", auth ,getPackageProgress);
router.get("/package/:pkg/components", auth ,getPackageComponents);
router.post("/progress", auth ,savePackageProgress);
 
router.get('/package/:pkg/milestones', auth, getPackageMilestones); // Excel format milestones
router.get('/package/:pkg/components-detailed', auth,  getPackageComponentsDetailed); // Detailed components
router.post('/milestone-progress',auth,  saveMilestoneProgress); // Save milestone progress
 
export default router;
 