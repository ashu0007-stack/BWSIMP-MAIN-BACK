// routes/superAdminRoutes.js
import express from 'express';
import superAdminController from '../controllers/superAdminController.js';
import exportController from '../controllers/exportController.js';

const router = express.Router();

// =============================
// DASHBOARD ROUTES (Existing)
// =============================
router.get('/dashboard/stats', superAdminController.getDashboardStats);
router.get('/dashboard/department-progress', superAdminController.getDepartmentProgress);
router.get('/dashboard/milestones', superAdminController.getMilestoneTracker);
router.get('/dashboard/pdo', superAdminController.getPDOData);
router.get('/dashboard/financial', superAdminController.getFinancialData);
router.get('/dashboard/risk-alerts', superAdminController.getRiskAlerts);
router.get('/dashboard/scheme-performance', superAdminController.getSchemePerformance);
router.get('/dashboard/department/:deptId', superAdminController.getDepartmentDetails);

// =============================
// REPORT EXPORT ROUTES (New)
// =============================
router.get('/reports/department', exportController.exportDepartmentReport);
router.get('/reports/scheme', exportController.exportSchemeReport);
router.get('/reports/financial', exportController.exportFinancialReport);
router.get('/reports/pdo', exportController.exportPDOReport);
router.get('/reports/comprehensive', exportController.exportComprehensiveReport);

export default router;