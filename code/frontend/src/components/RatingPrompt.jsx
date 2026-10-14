import { useEffect, useState } from 'react';
import { ratingsApi } from '../api/ratings';
import { Avatar } from './ui/Avatar';
import { Alert } from './ui/Alert';
import { Button } from './ui/Button';
import { CheckCircleIcon, ClockIcon } from './ui/icons';

/**
 * "Did everyone turn up?", asked once a goal is done.
 *
 * One question per person, with two answers and no middle option. A five-point scale between
 * students who will see each other tomorrow collects politeness rather than information —
 * everybody gives four. Whether somebody came is a fact, and it is the only thing the reliability
 * score is actually claiming.
 *
 * An answer cannot be changed once sent, so the button says so before it is pressed rather than
 * after. What one person says is not decisive either: the server takes the majority of the group,
 * which is what stops one annoyed student marking somebody down on their own.
 */
export function RatingPrompt({ goalId }) {
  const [people, setPeople] = useState([]);
  const [state, setState] = useState({ status: 'loading', error: null });
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    ratingsApi
      .summary(goalId)
      .then(({ people: list }) => {
        if (cancelled) return;
        setPeople(list);
        setState({ status: 'ready', error: null });
      })
      .catch((error) => !cancelled && setState({ status: 'error', error }));
    return () => {
      cancelled = true;
    };
  }, [goalId]);

  const unanswered = people.filter((person) => person.attended === null);
  const chosen = Object.entries(answers).filter(([, value]) => value !== undefined);

  async function handleSubmit() {
    if (chosen.length === 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      const { people: updated } = await ratingsApi.submit(
        goalId,
        chosen.map(([subjectId, attended]) => ({ subjectId, attended })),
      );
      setPeople(updated);
      setAnswers({});
    } catch (error) {
      setSaveError(error);
    } finally {
      setSaving(false);
    }
  }

  if (state.status === 'loading') {
    return <p className="text-[15px] text-label-secondary">Loading…</p>;
  }
  if (state.status === 'error') {
    return <Alert tone="error">{state.error.message}</Alert>;
  }
  // A goal somebody did on their own has nobody to answer about.
  if (people.length === 0) return null;

  return (
    <div>
      {unanswered.length === 0 ? (
        <p className="text-[15px] text-label-secondary">
          Thanks — you have answered for everyone. It feeds into their reliability score.
        </p>
      ) : (
        <p className="text-[15px] text-label-secondary">
          This is what reliability scores are built from. You can only answer once.
        </p>
      )}

      <ul className="mt-4 space-y-3">
        {people.map((person) => {
          const settled = person.attended !== null;
          const choice = answers[person.id];
          return (
            <li key={person.id} className="glass-control rounded-[1.25rem] p-4">
              <div className="flex items-center gap-3">
                <Avatar name={person.name} id={person.id} photoUrl={person.photoUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-label">{person.name}</p>
                  <p className="truncate text-[13px] text-label-secondary">
                    {person.branch ?? 'Branch not set'}
                    {person.year ? ` · Year ${person.year}` : ''}
                  </p>
                </div>

                {settled ? (
                  <span
                    className={`inline-flex items-center gap-1.5 text-[13px] font-semibold ${
                      person.attended ? 'text-positive-text' : 'text-label-secondary'
                    }`}
                  >
                    {person.attended ? (
                      <CheckCircleIcon className="size-4" />
                    ) : (
                      <ClockIcon className="size-4" />
                    )}
                    {person.attended ? 'You said they came' : 'You said they missed it'}
                  </span>
                ) : (
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant={choice === true ? 'primary' : 'secondary'}
                      onClick={() => setAnswers((a) => ({ ...a, [person.id]: true }))}
                    >
                      Came
                    </Button>
                    <Button
                      size="sm"
                      variant={choice === false ? 'primary' : 'secondary'}
                      onClick={() => setAnswers((a) => ({ ...a, [person.id]: false }))}
                    >
                      No show
                    </Button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <Alert tone="error" className="mt-4">
        {saveError?.message}
      </Alert>

      {unanswered.length > 0 && (
        <>
          <Button
            loading={saving}
            disabled={chosen.length === 0}
            onClick={handleSubmit}
            className="mt-4"
          >
            {chosen.length === 0
              ? 'Pick an answer first'
              : `Send ${chosen.length === 1 ? 'answer' : `${chosen.length} answers`}`}
          </Button>
          <p className="mt-2 text-[13px] text-label-secondary">
            One person’s answer does not decide it — the group’s majority does.
          </p>
        </>
      )}
    </div>
  );
}
