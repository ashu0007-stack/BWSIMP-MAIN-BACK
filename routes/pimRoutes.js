import express from "express";
import { auth } from "../middleware/authMiddleware.js";
import multer from "multer";

// ===================================
// 🔹 PIM Controllers Import
// ===================================
import {
  
   reportsController,
  // farmersController,
  meetingsController,
  pimComparativeController
} from "../controllers/wrd/pimController.js";

const router = express.Router();
const storage = multer.memoryStorage(); // or diskStorage if you want to save files
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// ===================================
// 🔸 Meetings/Trainings Routes
// ===================================
router.post('/meetings', upload.array('documents'), meetingsController.createMeeting);
router.get("/meetings", auth, meetingsController.getAllMeetings);
router.get("/meetings/wua/:wua_id", auth, meetingsController.getMeetingsByWUA);
router.get("/meetings/:id", auth, meetingsController.getMeetingById);
router.put("/meetings/:id", auth, meetingsController.updateMeeting);
router.delete("/meetings/:id", auth, meetingsController.deleteMeeting);
router.patch("/meetings/:id/status", auth, meetingsController.updateMeetingStatus);

// Meeting Documents Routes
router.delete("/meetings/documents/:id", auth, meetingsController.deleteDocument);
router.get("/meetings/documents/download/:id", auth, meetingsController.downloadDocument);

// ===================================
// 🔸 Reports Routes
// ===================================
router.get("/reports/summary", auth, reportsController.getSummary);
router.get("/reports/generate-stats", auth, reportsController.generateStats);
router.get("/reports/wua-detailed", auth, reportsController.getWUADetailed);
router.get("/reports/vlc-detailed", auth, reportsController.getVLCDetailed);
router.get("/reports/slc-detailed", auth, reportsController.getSLCDetailed);
router.get("/reports/water-tax", auth, reportsController.getWaterTaxReport);
router.get("/reports/meetings-detailed", auth, reportsController.getMeetingsDetailed);
router.get("/reports/dashboard-stats", auth, reportsController.getDashboardStats);
router.get("/reports/export", auth, reportsController.exportReport);

// PIM Impact Assessment Routes
router.get("/reports/pim-impact-detailed", auth, reportsController.getPIMImpactDetailed);
router.post("/reports/pim-impact", auth, reportsController.savePIMImpactData);

// ===================================
// 🔸 PIM Comparative Study Routes
// ===================================
router.get("/comparative-study", auth, pimComparativeController.getAllComparativeStudies);
router.get("/comparative-study/:id", auth, pimComparativeController.getComparativeStudyById);
router.post("/comparative-study", auth, pimComparativeController.createComparativeStudy);
router.put("/comparative-study/:id", auth, pimComparativeController.updateComparativeStudy);
router.delete("/comparative-study/:id", auth, pimComparativeController.deleteComparativeStudy);
router.get("/impact-areas", auth, pimComparativeController.getImpactAreas);
router.get("/comparative-stats", auth, pimComparativeController.getComparativeStats);
router.post("/comparative-study/bulk", auth, pimComparativeController.bulkCreateComparativeStudy);
router.post("/comparative-study/import-from-impact", auth, pimComparativeController.importFromImpactData)

export default router;