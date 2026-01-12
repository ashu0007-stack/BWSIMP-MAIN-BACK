import express from "express";
import {
  getDistricts,
  getBlocks,
  getClusters,
  getPanchayats,
  getVillages,
  getSubDivisions,
  getZones,
  getCircles,
  getDivisions,
  getCirclesByZoneId,
  getDivisionsByCiricleId,
  getSubDivisionsByDivistionId,
  getSectionBySubDivisionsId,
  getDivisionByUserId, 
  getPanchayatsByBlockId
} from "../controllers/locationController.js";
import { auth } from "../middleware/authMiddleware.js";

const router = express.Router();

// Location routes

router.get("/zones", auth, getZones);
router.get("/circles", auth, getCircles);
router.get("/circles/:zoneId", auth, getCirclesByZoneId);
router.get("/divisions", auth, getDivisions);
router.get("/divisions/:cricleId", auth, getDivisionsByCiricleId);
router.get("/divisions-by-user/:divisionId", auth, getDivisionByUserId);
router.get("/subdivisions", auth, getSubDivisions);
router.get("/subdivisions/:divisionId", auth, getSubDivisionsByDivistionId);
router.get("/sections/:subDivisionId", auth, getSectionBySubDivisionsId);

router.get("/districts", auth, getDistricts);
router.get("/blocks/:districtId", auth, getBlocks);

router.get("/clusters", auth, getClusters);
router.get("/panchayats", auth, getPanchayats);
router.get("/panchayats/:blockId", auth, getPanchayatsByBlockId); 
router.get("/villages", auth, getVillages);

export default router;
