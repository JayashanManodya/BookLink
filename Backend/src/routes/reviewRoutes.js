import { Router } from 'express';
import {
  deleteReview,
  flagReview,
  getMyGivenReviews,
  getReviewById,
  getReviewsForUser,
  submitReview,
  updateReview,
} from '../controllers/reviewController.js';
import { requireClerkAuth } from '../middleware/requireClerkAuth.js';

const router = Router();

router.post('/', requireClerkAuth, submitReview);
router.get('/mine', requireClerkAuth, getMyGivenReviews);
router.get('/user/:clerkUserId', requireClerkAuth, getReviewsForUser);
/** POST avoids some proxies/CDNs mishandling PATCH on serverless deployments */
router.post('/:id/update', requireClerkAuth, updateReview);
router.get('/:id', requireClerkAuth, getReviewById);
router.patch('/:id/flag', requireClerkAuth, flagReview);
router.patch('/:id', requireClerkAuth, updateReview);
router.put('/:id', requireClerkAuth, updateReview);
router.delete('/:id', requireClerkAuth, deleteReview);

export default router;
