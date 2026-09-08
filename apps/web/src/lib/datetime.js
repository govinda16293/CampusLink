/**
 * Conversions between a `datetime-local` input value and an ISO instant.
 *
 * These exist because `new Date(string)` cannot be trusted for this job. A `datetime-local` input
 * yields `YYYY-MM-DDTHH:mm` — no seconds, no timezone — and Safari's Date parser has historically
 * rejected that exact shape and returned `Invalid Date`. `.toISOString()` on it then throws inside
 * the change handler; React does not catch errors thrown in event handlers, so the failure is
 * completely silent and the goal quietly posts with no time on it. That was a real bug: goals
 * posted from Safari showed "Anytime" while the same form on Chrome worked.
 *
 * Parsing the parts by hand and handing numbers to the Date constructor behaves identically in
 * every browser, and returning null (rather than throwing) lets the form show a message.
 */

/** `YYYY-MM-DDTHH:mm` in the viewer's own timezone -> ISO instant, or null if unusable. */
export function localInputToIso(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(value ?? '').trim());
  if (!match) return null;

  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  // Numeric arguments are interpreted as local wall-clock time, which is what the input means.
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (Number.isNaN(date.getTime())) return null;

  // Rejects impossible dates that the constructor silently rolls over, e.g. 31 February.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date.toISOString();
}

/** ISO instant -> the `YYYY-MM-DDTHH:mm` local string a `datetime-local` input expects. */
export function isoToLocalInput(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
