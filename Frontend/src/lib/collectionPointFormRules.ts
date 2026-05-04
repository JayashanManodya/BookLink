import { COLLECTION_POINT_CITIES } from '../constants/collectionPointCities';
import { meetupContactValidationError, sanitizeMeetupPhoneDigits } from './meetupFormRules';

/** Client-side validation for collection point submit (mirrors Backend collectionPointValidation rules). */
export function computeCollectionPointFieldErrors(fields: {
  name: string;
  city: string;
  address: string;
  contactNumber: string;
}): Record<string, string> {
  const e: Record<string, string> = {};
  const nt = fields.name.trim();
  if (!nt) e.name = 'Enter a place name.';
  else if (nt.length < 2) e.name = 'Name must be at least 2 characters.';
  else if (nt.length > 200) e.name = 'Name must be at most 200 characters.';

  const cityTrim = fields.city.trim();
  if (!cityTrim) e.city = 'Choose a city.';
  else if (!(COLLECTION_POINT_CITIES as readonly string[]).includes(cityTrim)) e.city = 'Pick a supported city from the list.';

  const at = fields.address.trim();
  if (!at) e.address = 'Address is required.';
  else if (at.length < 5) e.address = 'Enter a fuller address (at least 5 characters).';
  else if (at.length > 500) e.address = 'Address must be at most 500 characters.';

  const digits = sanitizeMeetupPhoneDigits(fields.contactNumber);
  const ce = meetupContactValidationError(digits);
  if (ce) e.contactNumber = ce;

  return e;
}
