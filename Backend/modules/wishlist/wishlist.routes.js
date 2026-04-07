import express from 'express';
import { ClerkExpressRequireAuth } from '../../middleware/auth.js';
import upload from '../../middleware/upload.js';
import { 
    postWishlistItem, 
    getAllOpenWishlists, 
    getMyWishlist, 
    getMatches, 
    updateItem, 
    deleteItem 
} from './wishlist.controller.js';

const router = express.Router();

router.post('/', upload.single('wantedBookPhoto'), ClerkExpressRequireAuth(), postWishlistItem);
router.get('/', getAllOpenWishlists);
router.get('/mine', ClerkExpressRequireAuth(), getMyWishlist);
router.get('/matches', ClerkExpressRequireAuth(), getMatches);
router.put('/:id', ClerkExpressRequireAuth(), updateItem);
router.delete('/:id', ClerkExpressRequireAuth(), deleteItem);

export default router;
