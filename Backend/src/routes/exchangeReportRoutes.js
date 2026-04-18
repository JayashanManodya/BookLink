import { Router } from 'express';
import {
  createExchangeReport,
  deleteExchangeReport,
  getExchangeReportById,
  listMyExchangeReports,
  listReportsReceivedAsLister,
  updateExchangeReport,
} from '../controllers/exchangeReportController.js';
import { requireClerkAuth } from '../middleware/requireClerkAuth.js';

const router = Router();

router.get('/', requireClerkAuth, listMyExchangeReports);
router.get('/received', requireClerkAuth, listReportsReceivedAsLister);
router.post('/', requireClerkAuth, createExchangeReport);
router.get('/:id', requireClerkAuth, getExchangeReportById);
router.patch('/:id', requireClerkAuth, updateExchangeReport);
router.delete('/:id', requireClerkAuth, deleteExchangeReport);

export default router;
