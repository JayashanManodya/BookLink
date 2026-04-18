import { Router } from 'express';
import {
  deletePoint,
  getAllPoints,
  getMyPoints,
  getPointById,
  submitPoint,
  updatePoint,
} from '../controllers/pointController.js';
import { requireClerkAuth } from '../middleware/requireClerkAuth.js';

const router = Router();

router.post('/', requireClerkAuth, submitPoint);
router.get('/mine', requireClerkAuth, getMyPoints);
router.get('/', requireClerkAuth, getAllPoints);
router.get('/:id', requireClerkAuth, getPointById);
router.put('/:id', requireClerkAuth, updatePoint);
router.delete('/:id', requireClerkAuth, deletePoint);

export default router;
