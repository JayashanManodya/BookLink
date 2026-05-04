import type { UserReviewsParams } from './sharedScreenTypes';

/** Pass when opening Browse All so filters match Home / carousel state */
export type BrowseAllBooksFilters = {
  initialSearch?: string;
  initialBookType?: string;
  initialCondition?: string;
  initialLanguage?: string;
  initialYearMin?: string;
  initialYearMax?: string;
};

export function browseAllBooksParamsFromUi(snapshot: {
  searchInput: string;
  bookTypeChip: string | null;
  advCondition: string | null;
  advLanguage: string;
  advYearMin: string;
  advYearMax: string;
}): BrowseAllBooksFilters {
  return {
    initialSearch: snapshot.searchInput.trim() || undefined,
    initialBookType: snapshot.bookTypeChip ?? undefined,
    initialCondition: snapshot.advCondition ?? undefined,
    initialLanguage: snapshot.advLanguage.trim() || undefined,
    initialYearMin: snapshot.advYearMin.trim() || undefined,
    initialYearMax: snapshot.advYearMax.trim() || undefined,
  };
}

export type BrowseStackParamList = {
  BrowseList: undefined;
  BrowseAllBooks: BrowseAllBooksFilters | undefined;
  BookDetail: { bookId: string };
  AddBook: undefined;
  RequestExchange: { bookId: string; title: string };
  UserReviews: UserReviewsParams;
};
