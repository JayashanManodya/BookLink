import { Router } from 'express';
import {
  createBook,
  deleteBook,
  getBookById,
  getMyBooks,
  listBooks,
  updateBook,
} from '../controllers/bookController.js';
import { requireClerkAuth } from '../middleware/requireClerkAuth.js';

const router = Router();

router.get('/mine', requireClerkAuth, getMyBooks);
router.get('/', listBooks);
router.get('/:id', getBookById);
router.post('/', requireClerkAuth, createBook);
router.put('/:id', requireClerkAuth, updateBook);
router.delete('/:id', requireClerkAuth, deleteBook);

export default router;
