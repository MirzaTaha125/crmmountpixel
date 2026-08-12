import express from 'express';
import {
  getClientHostingDomains,
  getMyHostingDomains,
  createHostingDomain,
  updateHostingDomain,
  deleteHostingDomain
} from '../controllers/HostingDomainController.js';
import { authMiddleware, clientAuthMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Route for clients to get their own hosting/domain records
router.get('/my-services', clientAuthMiddleware, getMyHostingDomains);
// Route for getting hosting/domain by client ID (for users/admins)
router.get('/client/:clientId', authMiddleware, getClientHostingDomains);
router.post('/', authMiddleware, createHostingDomain);
router.put('/:id', authMiddleware, updateHostingDomain);
router.delete('/:id', authMiddleware, deleteHostingDomain);

export default router;

