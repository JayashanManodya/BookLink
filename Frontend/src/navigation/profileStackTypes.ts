import type { ReportExchangeParams, UserReviewsParams } from './sharedScreenTypes';

export type ProfileStackParamList = {
  ProfileHome: undefined;
  EditProfile: undefined;
  MyListings: undefined;
  EditListing: { bookId: string };
  BrowsePoints: undefined;
  SubmitPoint: { pointId?: string } | undefined;
  MyPoints: undefined;
  UserReviews: UserReviewsParams;
  MyReviews: undefined;
  MyReports: undefined;
  /** Reports readers filed on your accepted swaps (like a second inbox). */
  ListerReportsReceived: undefined;
  ReportExchange: ReportExchangeParams;
};
