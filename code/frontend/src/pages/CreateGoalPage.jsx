import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GENDER_PREFERENCES,
  GOAL_CATEGORIES,
  GOAL_CATEGORY_LABEL,
  createGoalSchema,
} from '@campuslink/shared';
import { goalsApi } from '../api/goals';
import { dateAndTimeToIso, isoToDateAndTime } from '../lib/datetime';
import { formatGoalWhen } from '../lib/formatGoal';
import { useForm } from '../hooks/useForm';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { Select } from '../components/ui/Select';
import { Toggle } from '../components/ui/Toggle';

const GENDER_PREFERENCE_LABEL = {
  ANY: 'Anyone can request',
  FEMALE_ONLY: 'Women only',
  MALE_ONLY: 'Men only',
};

export function CreateGoalPage() {
  const navigate = useNavigate();

  // The date defaults to today and the TIME is what decides whether a goal is scheduled at all.
  //
  // That split is deliberate. With the date starting empty, a same-day goal was silently losing
  // its time: on iOS the native date picker opens with today already highlighted, so confirming
  // it fires no change event — nothing changed as far as the browser is concerned — and the field
  // stayed empty. Picking tomorrow means scrolling the wheel, which does fire, which is why
  // same-day goals broke and later ones did not. Pre-filling today makes that path unreachable,
  // and it matches how these goals are actually written: "gym at 6" almost always means today.
  //
  // The values are held as plain strings and never derived back out of the ISO value on each
  // render — that round-trip previously made a value the parser could not read vanish from the
  // field as it was typed. See lib/datetime.js for the rest of that history.
  const today = useMemo(() => isoToDateAndTime(new Date().toISOString()).date, []);
  const [whenDate, setWhenDate] = useState(today);
  const [whenTime, setWhenTime] = useState('');

  const form = useForm({
    schema: createGoalSchema,
    initialValues: {
      category: 'GYM',
      title: '',
      description: '',
      dateTime: null,
      headcount: 1,
      anonymous: false,
      genderPreference: 'ANY',
      autoAccept: false,
    },
    onSubmit: async (payload) => {
      const { goal } = await goalsApi.create(payload);
      navigate(`/goals/${goal.id}`, { replace: true });
    },
  });

  const setWhen = (date, time) => {
    setWhenDate(date);
    setWhenTime(time);
    // No time means a whenever goal, whatever the date box happens to say. dateAndTimeToIso
    // returns null rather than throwing, so a value it cannot read becomes a visible message
    // below instead of a goal that silently loses its time.
    form.setValue('dateTime', time ? dateAndTimeToIso(date, time) : null);
  };

  // A time the student set must never turn into a "whenever" goal by accident — the feed would
  // show "Anytime" with nothing anywhere saying the time had been dropped. Anything that would
  // do that is caught here and blocks the post instead.
  //
  // The past-time rule is checked against the shared schema rather than re-implemented, so the
  // message shown while typing cannot drift from the one the API would return on submit.
  const whenInPast =
    form.values.dateTime !== null &&
    !createGoalSchema.shape.dateTime.safeParse(form.values.dateTime).success;

  const whenError = !whenTime
    ? undefined
    : !whenDate
      ? 'Pick a date as well, or clear the time for a whenever goal.'
      : form.values.dateTime === null
        ? 'That date and time did not come through — please pick them again.'
        : whenInPast
          ? 'That time has already passed. Pick a later time, or a different date.'
          : undefined;

  const handleSubmit = (event) => {
    if (whenError) {
      event.preventDefault();
      return;
    }
    form.handleSubmit(event);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight text-white">Post a goal</h1>
      <p className="mt-2 text-sm text-white/60">
        Say what you want to do and how many people you need. It goes on the campus feed straight
        away.
      </p>

      <form
        onSubmit={handleSubmit}
        className="frost-panel mt-8 space-y-6 rounded-3xl p-7 sm:p-8"
        noValidate
      >
        <Alert variant="dark" tone="error">
          {form.formError?.message}
        </Alert>

        <Select
          variant="dark"
          label="Category"
          name="category"
          value={form.values.category}
          onChange={form.handleChange}
          error={form.fieldErrors.category}
          options={GOAL_CATEGORIES.map((c) => ({ value: c, label: GOAL_CATEGORY_LABEL[c] }))}
        />

        <Field
          variant="dark"
          label="Title"
          name="title"
          type="text"
          placeholder="Gym partner for 6am"
          value={form.values.title}
          onChange={form.handleChange}
          error={form.fieldErrors.title}
        />

        <div>
          <label htmlFor="goal-description" className="block text-sm font-medium text-white/70">
            Description
          </label>
          <textarea
            id="goal-description"
            name="description"
            rows={4}
            placeholder="What are you planning? Anything someone should know before joining?"
            value={form.values.description}
            onChange={form.handleChange}
            aria-invalid={form.fieldErrors.description ? 'true' : undefined}
            className={[
              'mt-2 block w-full rounded-xl border-0 bg-white/6 px-4 py-3.5 text-white',
              'placeholder:text-white/40 ring-1 ring-inset focus:ring-2 focus:outline-none',
              form.fieldErrors.description
                ? 'ring-red-400/60 focus:ring-red-400'
                : 'ring-white/12 focus:ring-amber-400/70',
            ].join(' ')}
          />
          {form.fieldErrors.description && (
            <p className="mt-2 text-sm text-red-300">{form.fieldErrors.description}</p>
          )}
        </div>

        <div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              variant="dark"
              label="Date"
              name="whenDate"
              type="date"
              min={today}
              value={whenDate}
              onChange={(event) => setWhen(event.target.value, whenTime)}
            />
            <Field
              variant="dark"
              label="Time"
              name="whenTime"
              type="time"
              value={whenTime}
              onChange={(event) => setWhen(whenDate, event.target.value)}
            />
          </div>

          {/* Echoing the parsed result back is what makes a dropped time obvious before posting
              rather than after, which is how the original bug went unnoticed for two days. */}
          {form.fieldErrors.dateTime || whenError ? (
            <p className="mt-2 text-sm text-red-300">{form.fieldErrors.dateTime ?? whenError}</p>
          ) : form.values.dateTime ? (
            <p className="mt-2 text-sm text-amber-200/80">
              Posting for {formatGoalWhen(form.values.dateTime)}.
            </p>
          ) : (
            <p className="mt-2 text-sm text-white/35">
              Leave the time empty for a whenever goal — it stays on the feed for 48 hours.
            </p>
          )}
        </div>

        <Field
          variant="dark"
          label="People needed"
          name="headcount"
          type="number"
          min={1}
          max={20}
          hint="Not counting you. A gym partner is 1."
          value={form.values.headcount}
          onChange={(event) => form.setValue('headcount', Number(event.target.value))}
          error={form.fieldErrors.headcount}
        />

        <Select
          variant="dark"
          label="Who can request to join"
          name="genderPreference"
          hint="Useful for things like a late-night ride home."
          value={form.values.genderPreference}
          onChange={form.handleChange}
          error={form.fieldErrors.genderPreference}
          options={GENDER_PREFERENCES.map((g) => ({ value: g, label: GENDER_PREFERENCE_LABEL[g] }))}
        />

        <Toggle
          label="Post anonymously"
          description="Your name and photo stay hidden on the feed. Your reliability score still shows, and whoever you accept sees who you are."
          checked={form.values.anonymous}
          onChange={(checked) => form.setValue('anonymous', checked)}
        />

        <Toggle
          label="Accept requests automatically"
          description="People join instantly until the spots run out, instead of waiting for you to approve."
          checked={form.values.autoAccept}
          onChange={(checked) => form.setValue('autoAccept', checked)}
        />

        <div className="flex gap-3 pt-2">
          <Button variant="amber" type="submit" loading={form.submitting}>
            {form.submitting ? 'Posting…' : 'Post goal'}
          </Button>
          <Button variant="darkGhost" onClick={() => navigate('/')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
