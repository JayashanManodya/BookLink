import express from 'express';
import { ClerkExpressRequireAuth } from '../../middleware/auth.js';
import upload from '../../middleware/upload.js';
import { 
    createBook, 
    getAllBooks, 
    getSingleBook, 
    deleteBook 
} from './book.controller.js';

const router = express.Router();

router.post('/', upload.single('coverImage'), ClerkExpressRequireAuth(), createBook);
router.get('/', getAllBooks);
router.get('/:id', getSingleBook);
router.delete('/:id', ClerkExpressRequireAuth(), deleteBook);

export default router;
