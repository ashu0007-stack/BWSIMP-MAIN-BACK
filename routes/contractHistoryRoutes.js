import { Router } from 'express';
const router = Router();

import {
    getContractHistory,
    getRevisionById,
    compareRevisions,
    getLatestRevision,
    getHistorySummary
} from '../controllers/wrd/contractorHistory.js';

// ✅ Route: Get contract history
router.get('/:contractId/history', getContractHistory);

// ✅ Route: Get specific revision
router.get('/:contractId/history/:revisionId', getRevisionById);

// ✅ Route: Compare two revisions
router.get('/:contractId/history/compare', compareRevisions);

// ✅ Route: Get latest revision
router.get('/:contractId/history/latest', getLatestRevision);

// ✅ Route: Get history summary
router.get('/:contractId/history/summary', getHistorySummary);

export default router;