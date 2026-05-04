const MIN_PUBLICATION_YEAR = 1900;

/** Max allowed publication/edition year: current calendar year (not future). */
export function maxPastPublicationYear() {
  return new Date().getFullYear();
}

/** Undefined = omit field; null = explicit invalid sent */
export function normalizePastPublicationYear(yearRaw) {
  if (yearRaw === null || yearRaw === undefined || yearRaw === '') return undefined;
  const n =
    typeof yearRaw === 'number'
      ? yearRaw
      : typeof yearRaw === 'string'
        ? Number(yearRaw.trim())
        : NaN;
  if (!Number.isFinite(n)) return null;
  const maxY = maxPastPublicationYear();
  if (n < MIN_PUBLICATION_YEAR || n > maxY) return null;
  return n;
}

export function titleBeginsWithDigit(title) {
  return /^\d/.test(String(title).trim());
}

export function isLettersOnlyNameText(s) {
  if (s == null || String(s).length === 0) return true;
  return /^[\p{L}\s'.-]+$/u.test(String(s));
}
