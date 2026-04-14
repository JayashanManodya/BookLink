import type { UserReviewsParams } from './sharedScreenTypes';

export type ProfileStackParamList = {
  ProfileHome: undefined;
  EditProfile: undefined;
  MyListings: undefined;
  EditListing: { bookId: string };
  BrowsePoints: undefined;
  SubmitPoint: undefined;
  MyPoints: undefined;
  UserReviews: UserReviewsParams;
  MyReviews: undefined;
  FileReport: {
    reportedUserClerkId?: string;
    reportedBookId?: string;
    reportedLabel?: string;
  };
  MyReports: undefined;
  ReportDetail: { reportId: string };
};
