import type { UserReviewsParams } from './sharedScreenTypes';

export type BrowseStackParamList = {
  BrowseList: undefined;
  BookDetail: { bookId: string };
  AddBook: undefined;
  RequestExchange: { bookId: string; title: string };
  UserReviews: UserReviewsParams;
};
