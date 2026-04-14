import { Router } from 'express';
import { listChatsInbox } from '../controllers/chatInboxController.js';
import { requireClerkAuth } from '../middleware/requireClerkAuth.js';

const router = Router();

router.get('/inbox', requireClerkAuth, listChatsInbox);

export default router;
