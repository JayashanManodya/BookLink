import { Router } from 'express';
import {
  createWishlistItem,
  createWishlistThreadMessage,
  deleteWishlistItem,
  getWishlistItemById,
  getWishlistMatches,
  getWishlistThread,
  listMyWishlistItems,
  listWishlistItems,
  listThreadsForWishlistItem,
  listMyWishlistChats,
  listWishlistThreadMessages,
  setWishlistThreadMeetup,
  startWishlistThread,
  updateWishlistItem,
} from '../controllers/wishlistController.js';
import { requireClerkAuth } from '../middleware/requireClerkAuth.js';

const router = Router();

router.get('/matches', requireClerkAuth, getWishlistMatches);
router.get('/mine', requireClerkAuth, listMyWishlistItems);
router.get('/my-chats', requireClerkAuth, listMyWishlistChats);
router.get('/threads/:threadId', requireClerkAuth, getWishlistThread);
router.patch('/threads/:threadId/meetup', requireClerkAuth, setWishlistThreadMeetup);
router.get('/threads/:threadId/messages', requireClerkAuth, listWishlistThreadMessages);
router.post('/threads/:threadId/messages', requireClerkAuth, createWishlistThreadMessage);
router.get('/:id/threads', requireClerkAuth, listThreadsForWishlistItem);
router.get('/:id', requireClerkAuth, getWishlistItemById);
router.post('/:id/chat', requireClerkAuth, startWishlistThread);
router.get('/', listWishlistItems);
router.post('/', requireClerkAuth, createWishlistItem);
router.put('/:id', requireClerkAuth, updateWishlistItem);
router.delete('/:id', requireClerkAuth, deleteWishlistItem);

export default router;
