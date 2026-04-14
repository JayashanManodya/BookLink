import { Router } from 'express';
import { getMe, getUserStats, patchMe, syncUser, updateMePut } from '../controllers/userController.js';
import { requireClerkAuth } from '../middleware/requireClerkAuth.js';

const router = Router();

router.post('/sync', requireClerkAuth, syncUser);
router.get('/me', requireClerkAuth, getMe);
router.patch('/me', requireClerkAuth, patchMe);
router.put('/me', requireClerkAuth, updateMePut);
router.get('/stats', requireClerkAuth, getUserStats);

export default router;
