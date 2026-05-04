/** Digits-only, max length for normalization before save. */
export function normalizeCollectionPointContact(raw) {
  return String(raw ?? '')
    .replace(/\D/g, '')
    .slice(0, 10);
}

export function validatePointNameTrimmed(nameTrim) {
  if (!nameTrim || typeof nameTrim !== 'string') return 'Name is required';
  if (nameTrim.length < 2) return 'Name must be at least 2 characters';
  if (nameTrim.length > 200) return 'Name must be at most 200 characters';
  return null;
}

export function validatePointAddressTrimmed(addrTrim) {
  if (!addrTrim || typeof addrTrim !== 'string') return 'Address is required';
  if (addrTrim.length < 5) return 'Address must be at least 5 characters';
  if (addrTrim.length > 500) return 'Address must be at most 500 characters';
  return null;
}

/** Expect already-normalized digits (no separators). */
export function validatePointContactDigits(digits) {
  if (!digits || typeof digits !== 'string') return 'Contact number is required';
  if (digits.length !== 10) return 'Contact number must be exactly 10 digits';
  return null;
}
