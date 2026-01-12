import express from 'express';
import { slcController } from '../controllers/wrd/slcController.js';

const router = express.Router();

console.log('🔍 Loading SLC Routes...');

/* -------------------------------
   SLC ROUTES
--------------------------------*/
// CRUD Operations
router.post('/', slcController.createSLC);
router.get('/', slcController.getAllSLCs);
router.get('/wua/:wuaId', slcController.getSLCsByWUA);
router.get('/:id', slcController.getSLCById);

// ✅ NEW ROUTES FOR EDIT/DELETE
router.put('/:id', slcController.updateSLC);
router.patch('/:id/status', slcController.updateSLCStatus);
router.delete('/:id', slcController.deleteSLC);

console.log('✅ SLC Routes loaded successfully');
export default router;