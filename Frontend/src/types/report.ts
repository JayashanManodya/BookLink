export type ExchangeReport = {
  _id: string;
  exchangeRequestId: string;
  reporterClerkUserId: string;
  details: string;
  evidencePhoto: string;
  status: 'open' | 'reviewed' | 'dismissed';
  bookTitle: string;
  /** False after you confirm receipt; report stays visible but is read-only. */
  canEdit?: boolean;
  createdAt?: string;
  updatedAt?: string;
};
