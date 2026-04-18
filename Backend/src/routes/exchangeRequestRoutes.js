import { Router } from 'express';
import {
  confirmExchangeRequestReceipt,
  createExchangeMessage,
  createExchangeRequest,
  deleteExchangeRequest,
  getExchangeRequestById,
  listExchangeMessages,
  listExchangeRequests,
  setExchangeRequestMeetup,
  updateExchangeRequest,
  updateExchangeRequestStatus,
} from '../controllers/exchangeRequestController.js';
import { requireClerkAuth } from '../middleware/requireClerkAuth.js';

const router = Router();

router.get('/', requireClerkAuth, listExchangeRequests);
router.get('/:id/messages', requireClerkAuth, listExchangeMessages);
router.get('/:id', requireClerkAuth, getExchangeRequestById);
router.post('/', requireClerkAuth, createExchangeRequest);
router.patch('/:id/meetup', requireClerkAuth, setExchangeRequestMeetup);
router.post('/:id/confirm-receipt', requireClerkAuth, confirmExchangeRequestReceipt);
router.patch('/:id/edit', requireClerkAuth, updateExchangeRequest);
router.patch('/:id', requireClerkAuth, updateExchangeRequestStatus);
router.delete('/:id', requireClerkAuth, deleteExchangeRequest);
router.post('/:id/messages', requireClerkAuth, createExchangeMessage);

export default router;
