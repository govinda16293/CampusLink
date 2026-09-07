import { useCallback, useState } from 'react';
import { ApiError } from '../api/client';

/**
 * Form state, validation and submission for the auth screens.
 *
 * Validation runs client-side against the very same Zod schema the API enforces
 * (`@campuslink/shared`), so the inline errors a user sees before submitting match the ones the
 * server would have produced. The client check is purely a convenience — the API re-validates
 * every payload regardless.
 *
 * On failure it distinguishes two things the UI must present differently: a VALIDATION_ERROR
 * carries per-field messages that belong next to the inputs, while everything else is a
 * form-level message.
 */
export function useForm({ schema, initialValues, onSubmit }) {
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const setValue = useCallback((name, value) => {
    setValues((current) => ({ ...current, [name]: value }));
    // Clear the field's error as soon as the user edits it — leaving a stale error under a field
    // someone is actively fixing reads as though their correction was rejected.
    setFieldErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  }, []);

  const handleChange = useCallback(
    (event) => setValue(event.target.name, event.target.value),
    [setValue],
  );

  const handleSubmit = useCallback(
    async (event) => {
      event?.preventDefault();
      setFormError(null);
      setFieldErrors({});

      const parsed = schema.safeParse(values);
      if (!parsed.success) {
        setFieldErrors(zodIssuesToFieldErrors(parsed.error.issues));
        return;
      }

      setSubmitting(true);
      try {
        await onSubmit(parsed.data);
      } catch (error) {
        if (error instanceof ApiError && error.code === 'VALIDATION_ERROR' && error.details) {
          setFieldErrors(error.details);
        } else if (error instanceof ApiError) {
          setFormError(error);
        } else {
          setFormError(new ApiError(0, 'UNKNOWN_ERROR', 'Something went wrong. Please try again.'));
        }
      } finally {
        setSubmitting(false);
      }
    },
    [schema, values, onSubmit],
  );

  return {
    values,
    setValue,
    fieldErrors,
    formError,
    setFormError,
    submitting,
    handleChange,
    handleSubmit,
  };
}

function zodIssuesToFieldErrors(issues) {
  return issues.reduce((acc, issue) => {
    const key = issue.path.join('.') || '_';
    // Keep the first message per field; showing three rules for one input is noise.
    if (!acc[key]) acc[key] = issue.message;
    return acc;
  }, {});
}
