import express from "express";
import { getAllMEIndicators, getMESummary } from "../controllers/wrd/meController.js";

const router = express.Router();

// Only two routes needed - one for indicators, one for summary
router.get("/indicators", getAllMEIndicators);
router.get("/summary", getMESummary);

export default router;