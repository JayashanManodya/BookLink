/** Allowed clock skew — client clocks slightly behind server. */
const MEETUP_PAST_SLACK_MS = 60_000;

/**
 * Parses ISO meetup instant and rejects moments clearly in the past.
 * @param {unknown} raw
 * @returns {{ ok: true, date: Date } | { ok: false, error: string }}
 */
export function parseMeetupAtRequiredFuture(raw) {
  if (raw == null) return { ok: false, error: 'meetupAt is required (ISO date-time)' };
  const d = new Date(typeof raw === 'string' ? raw.trim() : raw);
  if (Number.isNaN(d.getTime())) {
    return { ok: false, error: 'meetupAt must be a valid date and time' };
  }
  if (d.getTime() < Date.now() - MEETUP_PAST_SLACK_MS) {
    return {
      ok: false,
      error: 'meetupAt must be today or in the future (not in the past)',
    };
  }
  return { ok: true, date: d };
}

/**
 * Strip non-digits; require exactly 10 digits (e.g. local mobile).
 * @param {unknown} raw
 * @returns {{ ok: true, value: string } | { ok: false, error: string }}
 */
export function normalizeMeetupContactNumber(raw) {
  if (typeof raw !== 'string') return { ok: false, error: 'meetupContactNumber is required' };
  const digits = raw.replace(/\D/g, '');
  if (digits.length !== 10) {
    return { ok: false, error: 'meetupContactNumber must be exactly 10 digits' };
  }
  return { ok: true, value: digits };
}
