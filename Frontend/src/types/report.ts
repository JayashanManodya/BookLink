/** Report shown to the lister in profile (reader filed against their swap). */
export type ListerReceivedReport = {
  _id: string;
  exchangeRequestId: string;
  reporterClerkUserId: string;
  reporterDisplayName: string;
  bookTitle: string;
  details: string;
  evidencePhoto: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

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
  /** Why the report is read-only in the UI. */
  readOnlyReason?: 'reporter_locked' | 'lister_view' | null;
  reporterDisplayName?: string;
  reporterAvatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
};
