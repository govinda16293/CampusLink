import { useMemo, useState } from 'react';
import {
  GENDER_PREFERENCES,
  GOAL_CATEGORIES,
  GOAL_CATEGORY_LABEL,
  createGoalSchema,
} from '@campuslink/shared';
import { dateAndTimeToIso, isoToDateAndTime } from '../lib/datetime';
import { formatGoalWhen } from '../lib/formatGoal';
import { useForm } from '../hooks/useForm';
import { Alert } from './ui/Alert';
import { Button } from './ui/Button';
import { Field } from './ui/Field';
import { Select } from './ui/Select';
import { Toggle } from './ui/Toggle';

const GENDER_PREFERENCE_LABEL = {
  ANY: 'Anyone can request',
  FEMALE_ONLY: 'Women only',
  MALE_ONLY: 'Men only',
};

export const EMPTY_GOAL = {
  category: 'GYM',
  title: '',
  description: '',
  dateTime: null,
  headcount: 1,
  anonymous: false,
  genderPreference: 'ANY',
  autoAccept: false,
};

/**
 * The goal form, shared by posting and editing.
 *
 * One component rather than two, specifically because of the date and time handling below: that
 * logic was wrong twice, in ways that silently dropped a student's time, and a second copy of it
 * is a second place for it to go wrong again without anybody noticing.
 *
 * `schema` is passed in because posting and editing validate differently — every field is
 * required to post, and any subset may be sent when editing — but both schemas are the shared
 * ones the API enforces, so the inline errors cannot drift from the server's.
 */
export function GoalForm({
  schema = createGoalSchema,
  initialValues = EMPTY_GOAL,
  submitLabel,
  submittingLabel,
  onSubmit,
  onCancel,
  // Rules that only apply once people have joined; null while posting.
  lockedReason = null,
  minHeadcount = 1,
}) {
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
  const existing = useMemo(
    () => (initialValues.dateTime ? isoToDateAndTime(initialValues.dateTime) : null),
    [initialValues.dateTime],
  );
  const [whenDate, setWhenDate] = useState(existing?.date ?? today);
  const [whenTime, setWhenTime] = useState(existing?.time ?? '');

  const form = useForm({ schema, initialValues, onSubmit });

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
  // do that is caught here and blocks the submit instead.
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
    <form
      onSubmit={handleSubmit}
      className="glass mt-8 space-y-6 rounded-4xl p-6 sm:p-8"
      noValidate
    >
      <Alert tone="error">{form.formError?.message}</Alert>

      <Select
        label="Category"
        name="category"
        value={form.values.category}
        onChange={form.handleChange}
        error={form.fieldErrors.category}
        options={GOAL_CATEGORIES.map((c) => ({ value: c, label: GOAL_CATEGORY_LABEL[c] }))}
      />

      <Field
        label="Title"
        name="title"
        type="text"
        placeholder="Gym partner for 6am"
        value={form.values.title}
        onChange={form.handleChange}
        error={form.fieldErrors.title}
      />

      <div>
        <label
          htmlFor="goal-description"
          className="block pl-1 text-[13px] font-semibold text-label-secondary"
        >
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
          className="glass-field mt-1.5 block w-full resize-y rounded-2xl border-0 px-4 py-3.5 text-[15px]"
        />
        {form.fieldErrors.description && (
          <p className="mt-1.5 pl-1 text-[13px] font-medium text-danger-text">
            {form.fieldErrors.description}
          </p>
        )}
      </div>

      <div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Date"
            name="whenDate"
            type="date"
            min={today}
            value={whenDate}
            onChange={(event) => setWhen(event.target.value, whenTime)}
          />
          <Field
            label="Time"
            name="whenTime"
            type="time"
            value={whenTime}
            onChange={(event) => setWhen(whenDate, event.target.value)}
          />
        </div>

        {/* Echoing the parsed result back is what makes a dropped time obvious before submitting
            rather than after, which is how the original bug went unnoticed for two days. */}
        {form.fieldErrors.dateTime || whenError ? (
          <p className="mt-1.5 pl-1 text-[13px] font-medium text-danger-text">
            {form.fieldErrors.dateTime ?? whenError}
          </p>
        ) : form.values.dateTime ? (
          <p className="mt-1.5 pl-1 text-[13px] font-medium text-link">
            Set for {formatGoalWhen(form.values.dateTime)}.
          </p>
        ) : (
          <p className="mt-1.5 pl-1 text-[13px] text-label-secondary">
            Leave the time empty for a whenever goal — it stays on the feed for 48 hours.
          </p>
        )}
      </div>

      <Field
        label="People needed"
        name="headcount"
        type="number"
        min={minHeadcount}
        max={20}
        hint={
          minHeadcount > 1
            ? `Not counting you. Cannot go below ${minHeadcount} — that many have already joined.`
            : 'Not counting you. A gym partner is 1.'
        }
        value={form.values.headcount}
        onChange={(event) => form.setValue('headcount', Number(event.target.value))}
        error={form.fieldErrors.headcount}
      />

      <Select
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
        description={
          lockedReason ??
          'Your name and photo stay hidden on the feed. Your reliability score still shows, and whoever you accept sees who you are.'
        }
        checked={form.values.anonymous}
        disabled={Boolean(lockedReason) && !form.values.anonymous}
        onChange={(checked) => form.setValue('anonymous', checked)}
      />

      <Toggle
        label="Accept requests automatically"
        description="People join instantly until the spots run out, instead of waiting for you to approve."
        checked={form.values.autoAccept}
        onChange={(checked) => form.setValue('autoAccept', checked)}
      />

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={form.submitting}>
          {form.submitting ? submittingLabel : submitLabel}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
