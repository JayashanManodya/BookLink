import express from 'express';
import { ClerkExpressRequireAuth } from '../../middleware/auth.js';
import upload from '../../middleware/upload.js';
import { 
    submitReview, 
    getReviewsForUser, 
    getMyGivenReviews, 
    deleteReview, 
    flagReview 
} from './review.controller.js';

const router = express.Router();

router.post('/', upload.single('evidencePhoto'), ClerkExpressRequireAuth(), submitReview);
router.get('/user/:userId', ClerkExpressRequireAuth(), getReviewsForUser);
router.get('/mine', ClerkExpressRequireAuth(), getMyGivenReviews);
router.delete('/:id', ClerkExpressRequireAuth(), deleteReview);
router.patch('/:id/flag', ClerkExpressRequireAuth(), flagReview);

export default router;
