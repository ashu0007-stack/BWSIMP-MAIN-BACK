// routes/dashboardRoutes.js
import express from 'express';
import { dashboardController } from '../controllers/wrd/dashboardController.js';

const router = express.Router();

console.log('🔍 Loading Dashboard Routes...');

/* -------------------------------
   DASHBOARD ROUTES
--------------------------------*/
router.get('/', dashboardController.getDashboardData);
router.get('/kpis', dashboardController.getDashboardKPIs);
router.get('/distribution', dashboardController.getCompletionDistribution);
router.get('/activities', dashboardController.getRecentActivities);
router.get('/performance', dashboardController.getPerformanceMetrics);

console.log('✅ Dashboard Routes loaded successfully');
export default router;