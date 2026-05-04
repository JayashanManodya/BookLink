import { Router } from 'express';
import { listChatsInbox } from '../controllers/chatInboxController.js';
import {
  getUnreadChatTotal,
  listUnreadChatNotifications,
  markExchangeChatRead,
  markWishlistChatRead,
} from '../controllers/chatNotificationsController.js';
import { requireClerkAuth } from '../middleware/requireClerkAuth.js';

const router = Router();

router.get('/inbox', requireClerkAuth, listChatsInbox);
router.get('/unread-count', requireClerkAuth, getUnreadChatTotal);
router.get('/notifications', requireClerkAuth, listUnreadChatNotifications);
router.post('/exchange/:requestId/read', requireClerkAuth, markExchangeChatRead);
router.post('/wishlist-thread/:threadId/read', requireClerkAuth, markWishlistChatRead);

export default router;
