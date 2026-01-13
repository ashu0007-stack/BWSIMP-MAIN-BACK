import express from 'express';
import { getREPWorks, getREPMilestonesByWorkId,getREPTenderByWorkId ,getREPContractById, getREPLengthById, getREPPim } from '../controllers/wrd/reports/reportController.js';

const router = express.Router();

// Get all works with basic details
router.get('/repworks', getREPWorks);
router.get('/reppims', getREPPim);
router.get('/repmilstone/work/:workId', getREPMilestonesByWorkId);
router.get('/reptender/:workId',getREPTenderByWorkId);
router.get('/repcontract/:workId', getREPContractById);
router.get('/replength/:workId', getREPLengthById);
// Get comprehensive report for a specific work
// router.get('/work/:id/comprehensive', getWorkCompositeReport);

// // Export report to Excel
// router.get('/work/:id/export', exportWorkReportToExcel);

export default router;