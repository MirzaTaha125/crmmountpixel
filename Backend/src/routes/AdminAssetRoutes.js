import express from 'express';
import { getAdminAssets, createAdminAsset, deleteAdminAsset, updateAdminAsset } from '../controllers/AdminAssetController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authMiddleware, getAdminAssets);
router.post('/', authMiddleware, createAdminAsset);
router.put('/:id', authMiddleware, updateAdminAsset);
router.delete('/:id', authMiddleware, deleteAdminAsset);

export default router;
