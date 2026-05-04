import { Router } from 'express';
import { registerDevicePushToken, unregisterDevicePushToken } from '../controllers/pushController.js';
import { requireClerkAuth } from '../middleware/requireClerkAuth.js';

const router = Router();

router.post('/register', requireClerkAuth, registerDevicePushToken);
router.post('/unregister', requireClerkAuth, unregisterDevicePushToken);

export default router;
