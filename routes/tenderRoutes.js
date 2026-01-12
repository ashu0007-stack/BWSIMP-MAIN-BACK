import express from "express";
import {
  saveTender,
  getTenderByWorkId,
  getAllTenders,
  getTenderLogs,
} from "../controllers/wrd/tenderController.js";

import upload from "../middleware/upload.js";
import { auth } from "../middleware/authMiddleware.js";

const router = express.Router();

// ================================
// TENDER ROUTES
// ================================

// Create / Update Tender (with file uploads)
router.post(
  "/",
  auth,
  upload.fields([
    { name: "newspaper_file", maxCount: 1 },
    { name: "nit_file", maxCount: 1 },
    { name: "sale_file", maxCount: 1 },
    { name: "pre_bid_file", maxCount: 1 },
    { name: "corrigendum_file", maxCount: 1 },
    { name: "bids_file", maxCount: 1 },
    { name: "tech_open_file", maxCount: 1 },
    { name: "tech_eval_file", maxCount: 1 },
    { name: "financial_eval_file", maxCount: 1 },
    { name: "loa_file", maxCount: 1 },
    { name: "contract_file", maxCount: 1 },
  ]),
  saveTender
);

// Get all tenders
router.get("/", auth, getAllTenders);

// Get tender by Work ID
router.get("/work/:work_id", auth, getTenderByWorkId);

// Get tender logs
router.get("/logs/:tenderId", auth, getTenderLogs);

export default router;
