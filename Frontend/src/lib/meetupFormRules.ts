export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function defaultMeetupDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function defaultMeetupTimeStr(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Combine local date (YYYY-MM-DD) and time (HH:mm) into ISO for the API. */
export function combineLocalDateTimeToISO(dateStr: string, timeStr: string): string | null {
  const dPart = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  const tPart = /^(\d{1,2}):(\d{2})$/.exec(timeStr.trim());
  if (!dPart || !tPart) return null;
  const y = Number(dPart[1]);
  const mo = Number(dPart[2]);
  const day = Number(dPart[3]);
  const hh = Number(tPart[1]);
  const mm = Number(tPart[2]);
  if (![y, mo, day, hh, mm].every((n) => Number.isFinite(n))) return null;
  if (hh > 23 || hh < 0 || mm > 59 || mm < 0) return null;
  const dt = new Date(y, mo - 1, day, hh, mm, 0, 0);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

/** Allow only digits in the UI; max 10. */
export function sanitizeMeetupPhoneDigits(input: string): string {
  return input.replace(/\D/g, '').slice(0, 10);
}

export function meetupContactValidationError(digits: string): string | null {
  const d = digits.replace(/\D/g, '');
  if (d.length !== 10) return 'Enter exactly 10 digits for your contact number.';
  return null;
}

/** Calendar day must be today or later (device local timezone). */
export function meetupCalendarDateErrorYMD(dateStr: string): string | null {
  const dPart = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!dPart) return 'Use date as YYYY-MM-DD.';
  const y = Number(dPart[1]);
  const mo = Number(dPart[2]);
  const day = Number(dPart[3]);
  if (![y, mo, day].every((n) => Number.isFinite(n))) return 'Use date as YYYY-MM-DD.';
  const pickedStart = new Date(y, mo - 1, day);
  if (Number.isNaN(pickedStart.getTime())) return 'That date is not valid.';
  pickedStart.setHours(0, 0, 0, 0);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  if (pickedStart.getTime() < todayStart.getTime()) return 'Pick today or a future date.';
  return null;
}

const FUTURE_MS_SLACK = 30_000;

/** Start of “today” in the device local calendar (00:00:00). */
export function startOfLocalToday(): Date {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

export function isSameLocalCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Snap to minute resolution; always >= now + slack. Minute-level precision matches native pickers.
 */
export function clampMeetupWhenNotInPast(d: Date, slackMs = FUTURE_MS_SLACK): Date {
  const minTs = Date.now() + slackMs;
  let out = new Date(Math.max(d.getTime(), minTs));
  out.setMilliseconds(0);
  out.setSeconds(0);
  let guard = 0;
  while (out.getTime() < minTs && guard++ < 1440 * 372) {
    out.setMinutes(out.getMinutes() + 1, 0, 0);
  }
  return out;
}

/** Default meet-up suggestion: next full hour aligned with legacy text defaults, ensured not in the past. */
export function defaultMeetupWhenDate(): Date {
  const d = new Date();
  d.setMilliseconds(0);
  d.setSeconds(0);
  d.setMinutes(0);
  d.setHours(d.getHours() + 1);
  return clampMeetupWhenNotInPast(d);
}

export function localDateToMeetupStrings(d: Date): { dateStr: string; timeStr: string } {
  return {
    dateStr: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    timeStr: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
  };
}

export function mergeLocalCalendarPreserveTime(base: Date, pickedCalendar: Date): Date {
  const out = new Date(base);
  out.setFullYear(pickedCalendar.getFullYear(), pickedCalendar.getMonth(), pickedCalendar.getDate());
  out.setMilliseconds(0);
  out.setSeconds(0);
  return clampMeetupWhenNotInPast(out);
}

export function mergeLocalTimePreserveCalendar(base: Date, pickedTime: Date): Date {
  const out = new Date(base);
  out.setHours(pickedTime.getHours(), pickedTime.getMinutes(), 0, 0);
  return clampMeetupWhenNotInPast(out);
}

/**
 * Validates YYYY-MM-DD is not before today locally, parses time, and ensures combined instant is not in the past.
 */
export function meetupDateTimeFutureError(dateStr: string, timeStr: string): string | null {
  const cal = meetupCalendarDateErrorYMD(dateStr);
  if (cal) return cal;
  const iso = combineLocalDateTimeToISO(dateStr, timeStr);
  if (!iso) return 'Use time as HH:mm in 24-hour format, e.g. 14:30.';
  if (new Date(iso).getTime() < Date.now() - FUTURE_MS_SLACK) {
    return 'Choose a later time today, or pick a future date.';
  }
  return null;
}
