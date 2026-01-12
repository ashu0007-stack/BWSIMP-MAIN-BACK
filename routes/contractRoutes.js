import express from "express";
import {
  getAllContracts, 
  createContract, 
  updateContract,
  getContractById,
  getContractKeyPersonnel,
  getContractEquipment,
  getContractSocialData,
  getContractEnvironmentalData,
  getContractWorkMethodology,
  uploadFile,
  getFile,
  getWorkstender
} from "../controllers/wrd/contractController.js";
import { auth } from "../middleware/authMiddleware.js";
import { uploadSingleFile } from '../middleware/uploadContractor.js';
const router = express.Router();

// GET all contracts
router.get("/", auth, getAllContracts);

// POST new contract
router.post("/", auth, createContract);
router.put("/:id", auth, updateContract);
router.get("/getTender", auth, getWorkstender);
// GET contract by ID
router.get('/:id', getContractById);

router.get('/:contractorId/key-personnel', getContractKeyPersonnel);
router.get('/:contractorId/equipment', getContractEquipment);
router.get('/:contractorId/social-data', getContractSocialData);
router.get('/:contractorId/environmental-data', getContractEnvironmentalData);
router.get('/:contractorId/work-methodology', getContractWorkMethodology);

router.post('/contracts/upload-file', uploadSingleFile('file'), uploadFile);
router.get('/uploads/contractors/:type/:filename', getFile);
export default router;

