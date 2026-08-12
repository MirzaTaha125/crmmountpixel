import express from 'express';
import {
  getClientAssets,
  getMyAssets,
  createClientAsset,
  updateClientAsset,
  deleteClientAsset
} from '../controllers/ClientAssetController.js';
import { authMiddleware, clientAuthMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Client-specific route (for client panel)
router.get('/my-assets', clientAuthMiddleware, getMyAssets);

// All other routes require admin/user authentication
router.use(authMiddleware);

// Get all assets for a client
router.get('/client/:clientId', getClientAssets);

// Create new asset
router.post('/', createClientAsset);

// Update asset
router.put('/:id', updateClientAsset);

// Delete asset
router.delete('/:id', deleteClientAsset);

export default router;

