// backend/routes/farmersRoutes.js
import express from 'express';
import farmersController from '../controllers/wrd/farmersController.js';

const router = express.Router();

// ✅ TEST ROUTE - Pehle isse check karein
router.get('/test', (req, res) => {
  console.log('✅ Farmers Test Route Hit!');
  res.json({
    success: true,
    message: 'Farmers API is working!',
    timestamp: new Date().toISOString()
  });
});

// Farmers data routes
router.get('/', farmersController.getAllFarmers);
router.get('/statistics', farmersController.getFarmersStatistics);
router.get('/:id', farmersController.getFarmerById);
router.get('/coverage/stats',farmersController.getWUACoverageStats);

export default router;