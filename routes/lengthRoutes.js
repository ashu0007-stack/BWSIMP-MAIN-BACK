// routes/lengthProgressRoutes.js
import express from "express";
import {
  getWorks,
  getComponentsByPackage,
  getProgressByPackage,
  addProgressEntry,
 
} from "../controllers/wrd/lengthController.js" // ✅ keep this correct
import { addSpurProgressEntry, getAllSpursProgress, } from "../controllers/wrd/spurProgressController.js";  
import { auth } from "../middleware/authMiddleware.js";

const router = express.Router();

// ✅ Routes
router.get("/works", auth, getWorks);
router.get("/package/:packageNumber/components", auth, getComponentsByPackage);
router.get("/package/:packageNumber/progress", auth, getProgressByPackage);
router.post("/add", auth, addProgressEntry);
router.post("/spurs/add", auth, addSpurProgressEntry);
router.get('/spurs/work/:workId', getAllSpursProgress);
// router.get("/spurs", auth, getSpursByPackage);
export default router;
