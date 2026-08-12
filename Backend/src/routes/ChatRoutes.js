import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  getOrCreateChat,
  getUserChats,
  getChatMessages,
  sendMessage,
  getChatContacts,
  createGroup,
  editMessage,
  deleteMessage,
  uploadAttachment,
  getOnlineUsers
} from '../controllers/ChatController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'chat');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}-${safe}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

router.post('/create', getOrCreateChat);
router.get('/user/chats', getUserChats);
router.get('/contacts', getChatContacts);
router.get('/online', getOnlineUsers);
router.post('/groups', createGroup);
router.post('/upload', upload.single('file'), uploadAttachment);
router.post('/send', sendMessage);
router.put('/messages/:messageId', editMessage);
router.delete('/messages/:messageId', deleteMessage);
router.get('/:chatId/messages', getChatMessages);

export default router;
