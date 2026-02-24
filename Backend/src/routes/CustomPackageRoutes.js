import express from 'express';
import { createCustomPackage, getAllCustomPackages, getCustomPackageById, updateCustomPackage, deleteCustomPackage } from '../controllers/CustomPackageController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', authMiddleware, createCustomPackage);
router.get('/', getAllCustomPackages);
router.get('/:id', getCustomPackageById);
router.put('/:id', authMiddleware, updateCustomPackage);
router.delete('/:id', authMiddleware, deleteCustomPackage);

export default router; 