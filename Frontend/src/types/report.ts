export type ExchangeReport = {
  _id: string;
  exchangeRequestId: string;
  reporterClerkUserId: string;
  details: string;
  evidencePhoto: string;
  status: 'open' | 'reviewed' | 'dismissed';
  bookTitle: string;
  createdAt?: string;
  updatedAt?: string;
};
