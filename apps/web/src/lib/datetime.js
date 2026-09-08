/**
 * Conversion between the goal form's date/time inputs and the ISO instant the API stores.
 *
 * WHY THIS IS NOT ONE `datetime-local` INPUT
 *
 * It used to be, and goals posted with a time were reaching the database with no time at all —
 * the feed showed "Anytime" — for one team member and not the other. Two things were wrong with
 * that input, and either alone is enough to lose the value silently:
 *
 *   1. A `datetime-local` input yields `YYYY-MM-DDTHH:mm` — no seconds, no timezone. Safari's
 *      Date parser rejects that shape and returns Invalid Date, so `new Date(v).toISOString()`
 *      threw inside a React change handler, where nothing catches it.
 *   2. As a *controlled* React input it is unreliable on iOS: the component re-renders between
 *      the segments of a picker, so a partly-entered value gets reset before it is complete and
 *      the field is left empty with no error anywhere.
 *
 * `type="date"` and `type="time"` have neither problem. They are supported everywhere, each holds
 * one simple string, and on a phone each opens its own native picker. Parsing the parts by hand
 * and handing numbers to the Date constructor behaves identically in every browser, and returning
 * null rather than throwing lets the form say something instead of quietly dropping the time.
 */

/**
 * `YYYY-MM-DD` + `HH:mm`, both in the viewer's own timezone, to an ISO instant.
 * Returns null if either part is missing or unusable — the caller decides what that means.
 */
export function dateAndTimeToIso(dateValue, timeValue) {
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateValue ?? '').trim());
  // Some browsers append seconds to a time input's value; anything after the minutes is ignored.
  const time = /^(\d{1,2}):(\d{2})/.exec(String(timeValue ?? '').trim());
  if (!date || !time) return null;

  const [year, month, day] = date.slice(1).map(Number);
  const [hour, minute] = time.slice(1).map(Number);
  if (hour > 23 || minute > 59) return null;

  // Numeric arguments are read as local wall-clock time, which is what the student picked.
  const result = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (Number.isNaN(result.getTime())) return null;

  // Rejects impossible dates the constructor silently rolls over, e.g. 31 February -> 3 March.
  if (
    result.getFullYear() !== year ||
    result.getMonth() !== month - 1 ||
    result.getDate() !== day
  ) {
    return null;
  }

  return result.toISOString();
}

/** The inverse: an ISO instant back to the two input values, in the viewer's timezone. */
export function isoToDateAndTime(iso) {
  if (!iso) return { date: '', time: '' };
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return { date: '', time: '' };

  const pad = (n) => String(n).padStart(2, '0');
  return {
    date: `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`,
    time: `${pad(value.getHours())}:${pad(value.getMinutes())}`,
  };
}
