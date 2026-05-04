/** Keep `REVIEW_COMMENT_*` aligned with Backend `reviewController.submitReview`. */

export const REVIEW_COMMENT_MIN_LENGTH = 10;
export const REVIEW_COMMENT_MAX_LENGTH = 4000;

const MONGO_ID_RE = /^[a-f\d]{24}$/i;

/** Allow serialized `{ $oid }` blobs from navigation/state. */
export function normalizeMongoId(raw: unknown): string {
  if (raw == null) return '';
  if (typeof raw === 'string') return raw.trim();
  if (typeof raw === 'object' && raw !== null && '$oid' in raw && typeof (raw as { $oid: string }).$oid === 'string') {
    return (raw as { $oid: string }).$oid.trim();
  }
  return String(raw).trim();
}

export function isValidMongoIdHex(id: string): boolean {
  return MONGO_ID_RE.test(id);
}

export function validateReviewRating(value: unknown): string | null {
  const r = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(r) || !Number.isInteger(r) || r < 1 || r > 5) {
    return 'Choose a rating from 1 to 5.';
  }
  return null;
}

/** Any visible text counts, including strings that begin with digits. */
export function validateReviewComment(value: unknown): string | null {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (trimmed.length < REVIEW_COMMENT_MIN_LENGTH) {
    return `Add a comment of at least ${REVIEW_COMMENT_MIN_LENGTH} characters.`;
  }
  if (trimmed.length > REVIEW_COMMENT_MAX_LENGTH) {
    return `Comment must be ${REVIEW_COMMENT_MAX_LENGTH} characters or fewer.`;
  }
  return null;
}
