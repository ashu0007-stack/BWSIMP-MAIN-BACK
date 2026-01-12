import express from "express";
import multer from "multer";
import path from "path"
import { auth } from "../middleware/authMiddleware.js";


import { getAllprograme, addPrograme ,  deletePrograme,updateProgram } from "../controllers/ProgramActivities/programeController.js";
import { getActivities } from "../controllers/ProgramActivities/activitiesController.js";
import { getComponents } from "../controllers/ProgramActivities/componetesController.js";
import { getTopicsByComponetes } from "../controllers/ProgramActivities/componetesController.js";
import { addReportsDocumentation } from "../controllers/ProgramActivities/reportsController.js"

import {getAllConductprograme,addProgramConduct}from "../controllers/ProgramActivities/programConductController.js"

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/programAttendanceSheets"); // folder where file will be stored
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

// ------------------ REPORTS DOCUMENTATION UPLOAD ------------------
// const reportsStorage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, "uploads/reportsDocuments"),
//   filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
// });



const upload = multer({ storage });
router.get("/programe", auth, getAllprograme);
router.post("/addPrograme", auth, addPrograme);
router.post("/updatePrograme", auth, updateProgram);
router.post("/deletedPrograme", auth, deletePrograme);
router.get("/activities", auth, getActivities);
router.get("/components", auth, getComponents);
router.get("/programeTopics/:componentId", auth, getTopicsByComponetes);
router.get("/programconduct", auth,   getAllConductprograme);
router.post("/addProgramConduct", auth, addProgramConduct);
router.post(
  "/addReportsDocumentation",
  auth,
  upload.fields([
    { name: "geoPhotos", maxCount: 4 },  // exactly 4 photos
    { name: "videos", maxCount: 1 },
    { name: "reportFiles", maxCount: 1 },
    { name: "feedbackPdf", maxCount: 1 },
    { name: "billsPdf", maxCount: 1 }
  ]),
  addReportsDocumentation
);


export default router;