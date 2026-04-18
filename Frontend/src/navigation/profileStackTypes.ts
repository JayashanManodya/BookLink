import type { UserReviewsParams } from './sharedScreenTypes';

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
};
