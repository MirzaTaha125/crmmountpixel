import express from 'express';
import {
  getOrCreateChat,
  getUserChats,
  getChatMessages,
  sendMessage,
  getChatContacts,
  createGroup
} from '../controllers/ChatController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

router.post('/create', getOrCreateChat);
router.get('/user/chats', getUserChats);
router.get('/:chatId/messages', getChatMessages);
router.post('/send', sendMessage);
router.get('/contacts', getChatContacts);
router.post('/groups', createGroup);

export default router;

