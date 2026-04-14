import { Router } from 'express';
import {
  deleteReview,
  flagReview,
  getMyGivenReviews,
  getReviewsForUser,
  submitReview,
} from '../controllers/reviewController.js';
import { requireClerkAuth } from '../middleware/requireClerkAuth.js';

const router = Router();

router.post('/', requireClerkAuth, submitReview);
router.get('/mine', requireClerkAuth, getMyGivenReviews);
router.get('/user/:clerkUserId', requireClerkAuth, getReviewsForUser);
router.patch('/:id/flag', requireClerkAuth, flagReview);
router.delete('/:id', requireClerkAuth, deleteReview);

export default router;
