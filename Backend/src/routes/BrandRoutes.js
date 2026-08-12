import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  createBrand,
  getAllBrands,
  getBrandById,
  updateBrand,
  deleteBrand,
  rotatePublicCode,
} from '../controllers/BrandController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'brands');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    // Only accept images for the logo; ignore anything else silently.
    cb(null, /^image\//.test(file.mimetype));
  },
});

const router = express.Router();
router.use(authMiddleware);

router.post('/', upload.single('logo'), createBrand);
router.get('/', getAllBrands);
router.get('/:id', getBrandById);
router.put('/:id', upload.single('logo'), updateBrand);
router.post('/:id/rotate-public-code', rotatePublicCode);
router.delete('/:id', deleteBrand);

export default router;
