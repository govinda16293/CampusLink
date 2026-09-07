import { useState } from 'react';
import { MAX_INTEREST_LENGTH, MAX_INTERESTS } from '@campuslink/shared';

/**
 * Type-and-enter interest chips.
 *
 * Interests feed the suggestion scoring in Step 10, so duplicates are rejected case-insensitively
 * here as well as on the server — catching it in the UI means a student sees why nothing happened
 * instead of watching their tag silently vanish on save.
 */
export function InterestsInput({ label, value = [], onChange, error, hint }) {
  const [draft, setDraft] = useState('');
  const [localError, setLocalError] = useState(null);

  function addInterest() {
    const interest = draft.trim();
    if (!interest) return;

    if (value.length >= MAX_INTERESTS) {
      setLocalError(`You can add up to ${MAX_INTERESTS} interests`);
      return;
    }
    if (interest.length > MAX_INTEREST_LENGTH) {
      setLocalError(`Keep each interest under ${MAX_INTEREST_LENGTH} characters`);
      return;
    }
    if (interest.includes(',')) {
      setLocalError('An interest cannot contain a comma');
      return;
    }
    if (value.some((existing) => existing.toLowerCase() === interest.toLowerCase())) {
      setLocalError(`"${interest}" is already in your list`);
      return;
    }

    onChange([...value, interest]);
    setDraft('');
    setLocalError(null);
  }

  function handleKeyDown(event) {
    // Enter must not submit the surrounding form while the draft box has content.
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addInterest();
    } else if (event.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  const message = localError ?? error;

  return (
    <div>
      <label htmlFor="interest-draft" className="block text-sm font-medium text-slate-700">
        {label}
      </label>

      <div className="mt-1.5 rounded-xl bg-white p-2 shadow-sm ring-1 ring-inset ring-slate-300 focus-within:ring-2 focus-within:ring-brand-600">
        {value.length > 0 && (
          <ul className="mb-2 flex flex-wrap gap-2">
            {value.map((interest) => (
              <li
                key={interest}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 py-1 pl-3 pr-1.5 text-sm font-medium text-brand-700"
              >
                {interest}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((i) => i !== interest))}
                  aria-label={`Remove ${interest}`}
                  className="rounded-full p-0.5 text-brand-500 transition-colors hover:bg-brand-100 hover:text-brand-800"
                >
                  <svg
                    viewBox="0 0 20 20"
                    className="size-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    aria-hidden="true"
                  >
                    <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}

        <input
          id="interest-draft"
          type="text"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setLocalError(null);
          }}
          onKeyDown={handleKeyDown}
          onBlur={addInterest}
          maxLength={MAX_INTEREST_LENGTH}
          placeholder={value.length ? 'Add another…' : 'gym, chess, badminton…'}
          className="w-full border-0 bg-transparent px-2 py-1.5 text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
      </div>

      {message ? (
        <p className="mt-1.5 text-sm text-red-600">{message}</p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}
