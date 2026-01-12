import express from "express";
import { ffsDetails, addFfsDetails } from "../controllers/doa/ffsControllers/ffsController.js";
import { farmersDetails, addFarmerDetails } from "../controllers/doa/ffsControllers/farmerController.js";
import { ffsSessionDetails, addFfsSession } from "../controllers/doa/ffsControllers/sessionController.js";
import { getFarmerAttendanceRecords, addFarmerAttendanceRecords } from "../controllers/doa/ffsControllers/farmerAttendanceController.js";
import { auth } from "../middleware/authMiddleware.js";

const router = express.Router();

// FFS routes
router.get("/ffsDetails", auth, ffsDetails);
router.post("/addFfsDetails", auth, addFfsDetails);

// Farmer routes
router.get("/farmerDetails", auth, farmersDetails);
router.post("/addFarmerDetails", auth, addFarmerDetails);

// Session routes
router.get("/sessionDetails", auth, ffsSessionDetails); 
router.post("/addSessionDetails", auth, addFfsSession); 

// Farmer Attendance routes
router.get("/farmerAttendanceRecords", auth, getFarmerAttendanceRecords); 
router.post("/addFarmerAttendanceRecords", auth, addFarmerAttendanceRecords); 

export default router;
