import { useState } from 'react';
import { MAX_INTEREST_LENGTH, MAX_INTERESTS } from '@campuslink/shared';

/**
 * Type-and-enter interest chips.
 *
 * Interests feed the suggestion scoring in Step 10, so duplicates are rejected case-insensitively
 * here as well as on the server — catching it in the UI means a student sees why nothing happened
 * instead of watching their tag silently vanish on save.
 *
 * The whole box is the glass well, so it takes the same focus and error rings as a single input;
 * the chips are accent-tinted capsules, like recipients in Mail.
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
      <label
        htmlFor="interest-draft"
        className="block pl-1 text-[13px] font-semibold text-label-secondary"
      >
        {label}
      </label>

      <div
        data-invalid={message ? 'true' : undefined}
        className="glass-field mt-1.5 rounded-2xl p-2"
      >
        {value.length > 0 && (
          <ul className="mb-2 flex flex-wrap gap-2">
            {value.map((interest) => (
              <li
                key={interest}
                className="inline-flex items-center gap-1.5 rounded-full bg-accent/12 py-1 pl-3 pr-1.5 text-sm font-medium text-link ring-1 ring-inset ring-accent/15"
              >
                {interest}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((i) => i !== interest))}
                  aria-label={`Remove ${interest}`}
                  className="rounded-full p-0.5 text-link/70 transition-colors hover:bg-accent/15 hover:text-link"
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
          className="w-full border-0 bg-transparent px-2 py-1.5 text-[15px] text-label focus:outline-none"
        />
      </div>

      {message ? (
        <p className="mt-1.5 pl-1 text-[13px] font-medium text-danger-text">{message}</p>
      ) : hint ? (
        <p className="mt-1.5 pl-1 text-[13px] text-label-secondary">{hint}</p>
      ) : null}
    </div>
  );
}
