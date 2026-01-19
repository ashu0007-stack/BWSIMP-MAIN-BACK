// routes/esRoutes.js
import express from 'express';
import {
  // Project Controllers
  getAllWork,
  getWorkById,
  getWorkByPackage,
  
  // Environmental Controllers
  getAllEnvironmentalIndicators,
  getEnvironmentalIndicatorById,
  createEnvironmentalIndicator,
  getEnvironmentalDataByProject,
  submitEnvironmentalData,
  updateEnvironmentalData,
  deleteEnvironmentalData,
  
  // Social Controllers
  getAllSocialIndicators,
  createSocialIndicator,
  getSocialDataByProject,
  submitSocialData,
  
  // Grievance Controllers
  getGrievancesByProject,
  registerGrievance,
  updateGrievance,
  
  // Labour Camp Controllers
  getLabourCampByProject,
  addLabourCampFacility,
  updateLabourCampFacility,
  
  // Attendance Controllers
  getAttendanceByProject,
  submitAttendance,
  
  // Report Controllers
  getESReportsByProject,
  submitESReport,
  
  // Dashboard Controllers
  getDashboardStats
} from '../controllers/wrd/ES/esReportCOntroller.js';

import { auth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(auth);

// ============================================
// PROJECT ROUTES
// ============================================
router.get('/projects', getAllWork);
router.get('/projects/:id', getWorkById);
router.get('/projects/package/:packageNumber', getWorkByPackage);

// ============================================
// ENVIRONMENTAL ROUTES
// ============================================
router.get('/environmental/indicators', getAllEnvironmentalIndicators);
router.get('/environmental/indicators/:id', getEnvironmentalIndicatorById);
router.post('/environmental/indicators', createEnvironmentalIndicator);
router.get('/environmental/data/:projectId', getEnvironmentalDataByProject);
router.post('/environmental/data', submitEnvironmentalData);
router.put('/environmental/data/:id', updateEnvironmentalData);
router.delete('/environmental/data/:id', deleteEnvironmentalData);

// ============================================
// SOCIAL ROUTES
// ============================================
router.get('/social/indicators', getAllSocialIndicators);
router.post('/social/indicators', createSocialIndicator);
router.get('/social/data/:projectId', getSocialDataByProject);
router.post('/social/data', submitSocialData);

// ============================================
// GRIEVANCE ROUTES
// ============================================
router.get('/grievances/:projectId', getGrievancesByProject);
router.post('/grievances', registerGrievance);
router.put('/grievances/:id', updateGrievance);

// ============================================
// LABOUR CAMP ROUTES
// ============================================
router.get('/labour-camp/:projectId', getLabourCampByProject);
router.post('/labour-camp', addLabourCampFacility);
router.put('/labour-camp/:id', updateLabourCampFacility);

// ============================================
// ATTENDANCE ROUTES
// ============================================
router.get('/attendance/:projectId', getAttendanceByProject);
router.post('/attendance', submitAttendance);

// ============================================
// E&S REPORTS ROUTES
// ============================================
router.get('/es-reports/:projectId', getESReportsByProject);
router.post('/es-reports', submitESReport);

// ============================================
// DASHBOARD ROUTES
// ============================================
router.get('/dashboard/stats/:projectId', getDashboardStats);

export default router;