/** Publication year range: 1900 through the current calendar year (no future years). */
export const MIN_PUBLICATION_YEAR = 1900;

export function maxPastPublicationYear(d = new Date()): number {
  return d.getFullYear();
}

/** Year picker options: "Not specified" plus descending years from current year down to min. */
export function publicationYearPastOptions(minY = MIN_PUBLICATION_YEAR, d = new Date()): (number | null)[] {
  const maxY = maxPastPublicationYear(d);
  const list: (number | null)[] = [null];
  if (maxY < minY) return list;
  for (let yr = maxY; yr >= minY; yr -= 1) list.push(yr);
  return list;
}

export function trimmedTitleBeginsWithDigit(title: string): boolean {
  return /^\d/.test(title.trim());
}

/** Optional or required text: letters (any script), spaces, apostrophe, hyphen, period — no digits. */
const LETTERS_ONLY = /^[\p{L}\s'.-]*$/u;

export function isLettersOnlyNameText(s: string): boolean {
  return LETTERS_ONLY.test(s);
}

export function filterToLettersOnlyNameText(s: string): string {
  return s.replace(/[^\p{L}\s'.-]/gu, '');
}
