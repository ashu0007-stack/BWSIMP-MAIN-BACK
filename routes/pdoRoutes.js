import express from 'express';
import {
  getAllPDOIndicators,
  getPDOIndicatorById,
  createPDOIndicator,
  updatePDOIndicator,
  deletePDOIndicator,
  getAllPDOProgress,
  getPDOProgressByWorkId,
  getPDOProgressByIndicatorId,
  createPDOProgress,
  updatePDOProgress,
  deletePDOProgress,
  getPDOSummary,
  getPDOIndicatorsByWorkType,
  mapWorkToPDO,
  getPDOWorks,
  getWorkPDOMappings
} from '../controllers/wrd/pdoController.js';

const router = express.Router();

// PDO Indicators routes
router.get('/allworks', getPDOWorks);
router.get('/indicators', getAllPDOIndicators);
router.get('/indicators/:id', getPDOIndicatorById);
router.post('/indicators', createPDOIndicator);
router.put('/indicators/:id', updatePDOIndicator);
router.delete('/indicators/:id', deletePDOIndicator);

// PDO Progress routes
router.get('/progress', getAllPDOProgress);
router.get('/progress/work/:workId', getPDOProgressByWorkId);
router.get('/progress/indicator/:indicatorId', getPDOProgressByIndicatorId);
router.post('/progress', createPDOProgress);
router.put('/progress/:id', updatePDOProgress);
router.delete('/progress/:id', deletePDOProgress);

// Summary and Dashboard routes
router.get('/summary', getPDOSummary);
router.get('/work-indicators/:workId', getPDOIndicatorsByWorkType);

// Work-PDO Mapping routes
router.post('/map-work', mapWorkToPDO);
router.get('/work-mappings/:workId', getWorkPDOMappings);

export default router;