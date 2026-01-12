import express from "express";
import { auth } from "../middleware/authMiddleware.js";
import {
    getAllComponents,
    getSubcomponentsByComponentId,
    getSubworkcomponentsByworkComponentId,
    getAllSubcomponents
} from "../controllers/wrd/componentController.js";

const router = express.Router();

// Component routes
router.get("/components", auth, getAllComponents);
router.get("/subcomponents/:componentId", auth, getSubcomponentsByComponentId);
router.get("/subworkcomponents/:workcomponentId", auth, getSubworkcomponentsByworkComponentId);
router.get("/allsubcomponents", auth, getAllSubcomponents);

export default router;