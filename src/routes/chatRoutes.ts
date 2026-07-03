import { Router } from 'express';
import {
  getOrCreateRoomController,
  getUserChatListController,
  sendMessageController,
  getChatMessagesController,
  readAllMessagesController,
} from '../controllers/chatController';

const router = Router();

router.post('/chat/room', getOrCreateRoomController);
router.get('/list/user/:user_id', getUserChatListController);
router.post('/message', sendMessageController);
router.get('/messages/:room_id', getChatMessagesController);
router.post('/read-messages', readAllMessagesController);

export default router;
