import express from 'express';
import {
  createPackage,
  getPackages,
  getPackageById,
  updatePackage,
  deletePackage
} from '../controllers/PackageController.js';

import { authMiddleware, staffOnly } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';

const router = express.Router();
// Reading the catalogue needs a session; changing prices is staff-only.
router.use(authMiddleware);

router.post('/', staffOnly, requirePermission('add_packages'), createPackage);
router.get('/', getPackages);
router.get('/:id', getPackageById);
router.put('/:id', staffOnly, requirePermission('edit_packages'), updatePackage);
router.delete('/:id', staffOnly, requirePermission('delete_packages'), deletePackage);

export default router;