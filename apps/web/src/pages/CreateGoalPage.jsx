import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GENDER_PREFERENCES,
  GOAL_CATEGORIES,
  GOAL_CATEGORY_LABEL,
  createGoalSchema,
} from '@campuslink/shared';
import { goalsApi } from '../api/goals';
import { dateAndTimeToIso } from '../lib/datetime';
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

  // Date and time are held as their own plain strings and combined only when both are present.
  // They are deliberately not derived back out of the ISO value on each render: that round-trip
  // meant a value the parser could not read vanished from the field as it was being typed, which
  // is a large part of why the missing-time bug was invisible. See lib/datetime.js.
  const [whenDate, setWhenDate] = useState('');
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
    // Returns null rather than throwing, so an incomplete pair becomes a visible message below
    // instead of a goal that silently loses its time.
    form.setValue('dateTime', dateAndTimeToIso(date, time));
  };

  // Half-filled must never post as a "whenever" goal by accident. The student meant to set a
  // time, and the feed would show "Anytime" with nothing anywhere saying the time was dropped.
  const whenError =
    form.values.dateTime !== null
      ? undefined
      : whenDate && !whenTime
        ? 'Pick a time as well, or clear the date for a whenever goal.'
        : whenTime && !whenDate
          ? 'Pick a date as well, or clear the time for a whenever goal.'
          : whenDate && whenTime
            ? 'That date and time did not come through — please pick them again.'
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
              Leave both empty for a whenever goal — it stays on the feed for 48 hours.
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
