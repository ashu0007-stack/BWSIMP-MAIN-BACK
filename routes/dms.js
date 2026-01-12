import express from 'express';
import {
  uploadDocument,
  getDocuments,
  getDocumentById,
  deleteDocument,
  searchDocuments,
  getMasterData,
  createShareLink,
  validateShareToken,
  downloadSharedDocument,
  viewSharedDocument,
  getDocumentPermissions,
  revokePermission,testSharedRoute
} from '../controllers/dmsController.js';

import multer from 'multer';

const router = express.Router();
const upload = multer({ dest: 'uploads/temp/' });

// Regular DMS routes
router.get('/', getDocuments);
router.get('/masters', getMasterData);
router.get('/search', searchDocuments);
router.get('/:id', getDocumentById);
router.delete('/:id', deleteDocument);
router.post('/upload', upload.single('file'), uploadDocument);
router.post('/documents/:documentId/share', createShareLink);
router.get('/shared/:token', validateShareToken);
router.get('/shared/:token/download', downloadSharedDocument);
router.get('/shared/:token/view', viewSharedDocument);
router.get('/documents/:documentId/permissions', getDocumentPermissions);
router.delete('/permissions/:permissionId', revokePermission);
router.get('/test/:token', testSharedRoute);

export default router;