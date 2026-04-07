import express from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { syncUser, getMyProfile, updateProfile } from './user.controller.js';

const router = express.Router();

router.post('/sync', requireAuth, syncUser);
router.get('/me', requireAuth, getMyProfile);
router.put('/me', requireAuth, updateProfile);

export default router;
