import express from 'express';
import { ClerkExpressRequireAuth } from '../../middleware/auth.js';
import upload from '../../middleware/upload.js';
import { 
    submitReport, 
    getMyReports, 
    getReportById, 
    updateStatus, 
    deleteReport 
} from './report.controller.js';

const router = express.Router();

router.post('/', upload.single('evidencePhoto'), ClerkExpressRequireAuth(), submitReport);
router.get('/mine', ClerkExpressRequireAuth(), getMyReports);
router.get('/:id', ClerkExpressRequireAuth(), getReportById);
router.patch('/:id/status', ClerkExpressRequireAuth(), updateStatus);
router.delete('/:id', ClerkExpressRequireAuth(), deleteReport);

export default router;
