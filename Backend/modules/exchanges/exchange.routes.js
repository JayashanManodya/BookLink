import express from 'express';
import { ClerkExpressRequireAuth } from '../../middleware/auth.js';
import upload from '../../middleware/upload.js';
import { 
    createRequest, 
    getMySentRequests, 
    getMyReceivedRequests, 
    updateStatus 
} from './exchange.controller.js';

const router = express.Router();

router.post('/', upload.single('offeredBookPhoto'), ClerkExpressRequireAuth(), createRequest);
router.get('/sent', ClerkExpressRequireAuth(), getMySentRequests);
router.get('/received', ClerkExpressRequireAuth(), getMyReceivedRequests);
router.patch('/:id/status', ClerkExpressRequireAuth(), updateStatus);

export default router;
