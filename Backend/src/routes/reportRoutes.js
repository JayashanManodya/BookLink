import { Router } from 'express';
import {
  deleteReport,
  getMyReports,
  getReportById,
  submitReport,
  updateReportStatus,
} from '../controllers/reportController.js';
import { requireClerkAuth } from '../middleware/requireClerkAuth.js';

const router = Router();

router.post('/', requireClerkAuth, submitReport);
router.get('/mine', requireClerkAuth, getMyReports);
router.get('/:id', requireClerkAuth, getReportById);
router.patch('/:id/status', requireClerkAuth, updateReportStatus);
router.delete('/:id', requireClerkAuth, deleteReport);

export default router;
