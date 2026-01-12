// routes/rddRoutes.js
import express from "express";
import multer from "multer";
import path from "path";
import {
  getDataEntries,
  getDataEntryById,
  createDataEntry,
  updateDataEntry,
  deleteDataEntry,
  getUniqueFilterValues,
  getStatsSummary,
  getWorkCategories,
  getSubCategoriesByCategory,
  updateDataEntryStatus
} from "../controllers/Rdd/dataentryController.js";

import {
  getProjectExpenses,
  getUsersCount,
  getMGReportCount,
} from "../controllers/Rdd/rddController.js";

// Import work log RDD controllers
import {
  getWorkLogByDataEntryId,
  getLatestWorkLogByDataEntryId,
  createWorkLog,
  createOrUpdateWorkLog,
  updateWorkLog,
  deleteWorkLog,
  deleteAllWorkLogsForEntry,
  getAllWorkLogs,
  getWorkLogStats,
  debugWorkLogs,
  getUploadedImage,
  validateImageUpload
} from "../controllers/Rdd/workLogRddController.js";

import { auth } from "../middleware/authMiddleware.js";

const router = express.Router();

// -------------------- File Upload Config for Data Entries --------------------
const dataEntryStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/rdd"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`);
  },
});
const dataEntryUpload = multer({ storage: dataEntryStorage });

// -------------------- File Upload Config for Work Logs (Images Only) --------------------
const workLogStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/work-logs");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Multer configuration for work log image uploads
const workLogUpload = multer({
  storage: workLogStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, JPG, PNG, GIF, WEBP) are allowed'));
    }
  }
});

// Custom error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB.'
      });
    }
  } else if (error.message) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  next(error);
};

// -------------------- RDD Stats Routes --------------------
router.get("/project-expenses", auth, getProjectExpenses);
router.get("/userscount", auth, getUsersCount);
router.get("/mgreportcount", auth, getMGReportCount);

// -------------------- Work Categories Routes --------------------
router.get("/work-categories", auth, getWorkCategories);
router.get("/work-categories/:categoryId/sub-categories", auth, getSubCategoriesByCategory);

// -------------------- Work Log RDD Routes --------------------
// Get all work logs for a data entry
router.get("/work-log-rdd/data-entry/:dataEntryId/all", auth, getWorkLogByDataEntryId);

// Get latest work log for a data entry
router.get("/work-log-rdd/data-entry/:dataEntryId/latest", auth, getLatestWorkLogByDataEntryId);

// Create new work log with image uploads
router.post("/work-log-rdd/create", 
  auth, 
  workLogUpload.fields([
    { name: 'initial_upload', maxCount: 1 },
    { name: 'final_upload', maxCount: 1 }
  ]),
  handleMulterError,
  createWorkLog
);

// Create or update work log with image uploads
router.post("/work-log-rdd", 
  auth, 
  workLogUpload.fields([
    { name: 'initial_upload', maxCount: 1 },
    { name: 'final_upload', maxCount: 1 }
  ]),
  handleMulterError,
  createOrUpdateWorkLog
);

// Update work log (if you still want separate update endpoint)
router.put("/work-log-rdd/:dataEntryId", 
  auth, 
  workLogUpload.fields([
    { name: 'initial_upload', maxCount: 1 },
    { name: 'final_upload', maxCount: 1 }
  ]),
  handleMulterError,
  updateWorkLog
);

// Delete specific work log by ID
router.delete("/work-log-rdd/:workLogId", auth, deleteWorkLog);

// Delete all work logs for a data entry
router.delete("/work-log-rdd/data-entry/:dataEntryId/all", auth, deleteAllWorkLogsForEntry);

// Get all work logs with pagination and filters
router.get("/work-log-rdd", auth, getAllWorkLogs);

// Get work log statistics
router.get("/work-log-rdd/stats", auth, getWorkLogStats);

// Debug endpoint to check work logs
router.get("/work-log-rdd/debug/:dataEntryId", auth, debugWorkLogs);

// Get uploaded work log image
router.get("/work-log-rdd/images/:filename",  getUploadedImage);

// -------------------- Data Entry Routes --------------------
router.get("/", auth, getDataEntries);
router.post("/", auth, dataEntryUpload.single("asUpload"), createDataEntry);
router.get("/filters/unique-values", auth, getUniqueFilterValues);
router.get("/stats/summary", auth, getStatsSummary);
router.get("/:id", auth, getDataEntryById);
router.put("/:id", auth, dataEntryUpload.single("asUpload"), updateDataEntry);
router.delete("/:id", auth, deleteDataEntry);
router.patch("/:id/status", auth, updateDataEntryStatus);

export default router;