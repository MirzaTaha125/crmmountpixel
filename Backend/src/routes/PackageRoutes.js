import express from 'express';
import {
  createPackage,
  getPackages,
  getPackageById,
  updatePackage,
  deletePackage
} from '../controllers/PackageController.js';

const router = express.Router();

router.post('/', createPackage);
router.get('/', getPackages);
router.get('/:id', getPackageById);
router.put('/:id', updatePackage);
router.delete('/:id', deletePackage);

export default router;