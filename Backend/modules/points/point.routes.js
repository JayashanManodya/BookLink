import express from 'express';
import { ClerkExpressRequireAuth } from '../../middleware/auth.js';
import upload from '../../middleware/upload.js';
import { 
    submitPoint, 
    getAllPoints, 
    getPointById, 
    updatePoint, 
    deletePoint 
} from './point.controller.js';

const router = express.Router();

router.post('/', upload.single('locationPhoto'), ClerkExpressRequireAuth(), submitPoint);
router.get('/', getAllPoints);
router.get('/:id', getPointById);
router.put('/:id', upload.single('locationPhoto'), ClerkExpressRequireAuth(), updatePoint);
router.delete('/:id', ClerkExpressRequireAuth(), deletePoint);

export default router;
