/** Allowed book categories (keep in sync with Backend `src/constants/bookTypes.js`). */
export const BOOK_TYPES = [
  'Fiction',
  'Non-Fiction',
  'Mystery',
  'Thriller',
  'Romance',
  'Fantasy',
  'Science Fiction',
  'Horror',
  'Historical Fiction',
  'Biography',
  'Autobiography',
  'Self-Help',
  'Educational',
  'Reference',
  "Children's",
  'Poetry',
  'Drama',
  'Comics',
  'Travel',
  'Religious',
] as const;

export type BookType = (typeof BOOK_TYPES)[number];
