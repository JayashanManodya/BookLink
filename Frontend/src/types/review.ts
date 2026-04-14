export type Review = {
  _id: string;
  reviewerClerkUserId: string;
  revieweeClerkUserId: string;
  reviewerDisplayName?: string;
  exchangeRequestId: string;
  rating: number;
  comment: string;
  evidencePhoto?: string;
  flagged?: boolean;
  createdAt?: string;
};
