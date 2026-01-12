// routes/wuaRoutes.js
import express from 'express';
import { wuaMasterController } from '../controllers/wrd/wuaMasterController.js';

const router = express.Router();

// Debug: Check if controller functions are available
console.log('🔍 Loading WUA Routes...');
console.log('Available functions in controller:', Object.keys(wuaMasterController));

/* -------------------------------
   WUA MASTER ROUTES
--------------------------------*/
router.get('/', wuaMasterController.getAllWUAMaster);
router.get('/stats', wuaMasterController.getWUAMasterStats);
router.get('/search', wuaMasterController.searchWUAMaster);
router.get('/with-status', wuaMasterController.getWUAMasterWithStatus);
router.get('/with-vlcs', wuaMasterController.getWUAsWithVLCs);
router.get('/with-both-vlc-slc', wuaMasterController.getWUAsWithBothVLCandSLC);
router.post('/create', wuaMasterController.createWUA)
router.get('/all', wuaMasterController.getAllWUAs)

/* -------------------------------
   VLC ROUTES
--------------------------------*/
// ✅ NEW: VLC List and Statistics Routes
router.get('/vlc', wuaMasterController.getAllVLCs);
router.get('/vlc/paginated', wuaMasterController.getAllVLCsWithPagination);
router.get('/vlc/stats', wuaMasterController.getVLCStats);

// ✅ EXISTING VLC Routes
router.post('/vlc', wuaMasterController.createVLC);
router.get('/vlc/wua/:wuaId', wuaMasterController.getVLCsByWUA);
router.get('/vlc/:id', wuaMasterController.getVLCById);
router.patch('/vlc/:id/status', wuaMasterController.updateVLCStatus);

/* -------------------------------
   DYNAMIC ROUTES (MUST BE LAST)
--------------------------------*/
router.get('/:id', wuaMasterController.getWUAMasterById);
router.put('/:id', wuaMasterController.updateWUAMaster);
router.delete('/:id', wuaMasterController.deleteWUAMaster);
router.get('/wuaslc/:id', wuaMasterController.getWUAMasterforSLcById);


console.log('✅ WUA Routes loaded successfully');
export default router;