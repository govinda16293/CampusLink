import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BRANCHES,
  BRANCH_LABEL,
  GENDERS,
  STUDY_YEARS,
  updateProfileSchema,
} from '@campuslink/shared';
import { usersApi } from '../api/users';
import { useAuthStore } from '../store/authStore';
import { useForm } from '../hooks/useForm';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { Select } from '../components/ui/Select';
import { InterestsInput } from '../components/ui/InterestsInput';

const GENDER_LABEL = {
  MALE: 'Male',
  FEMALE: 'Female',
  OTHER: 'Other',
  UNDISCLOSED: 'Prefer not to say',
};

export function EditProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const [saved, setSaved] = useState(false);

  const form = useForm({
    schema: updateProfileSchema,
    initialValues: {
      name: user?.name ?? '',
      branch: user?.branch ?? '',
      year: user?.year ?? '',
      gender: user?.gender ?? 'UNDISCLOSED',
      interests: user?.interests ?? [],
    },
    onSubmit: async (payload) => {
      const { user: updated } = await usersApi.updateMe(payload);
      updateUser(updated);
      setSaved(true);
      navigate('/profile', { replace: true });
    },
  });

  // The form holds '' for "nothing selected" because that is what a <select> gives us, but the
  // API distinguishes null (clear the field) from undefined (leave it alone). Convert on write.
  function setNullable(name, raw) {
    form.setValue(name, raw === '' ? null : raw);
    setSaved(false);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight text-white">Edit your profile</h1>
      <p className="mt-2 text-sm text-white/60">
        Branch and interests are what we use to suggest goals worth joining.
      </p>

      <form
        onSubmit={form.handleSubmit}
        className="frost-panel mt-8 space-y-6 rounded-3xl p-7 sm:p-8"
        noValidate
      >
        <Alert variant="dark" tone="error">
          {form.formError?.message}
        </Alert>
        <Alert variant="dark" tone="success">
          {saved ? 'Profile saved.' : null}
        </Alert>

        <Field
          variant="dark"
          label="Full name"
          name="name"
          type="text"
          autoComplete="name"
          value={form.values.name}
          onChange={form.handleChange}
          error={form.fieldErrors.name}
        />

        <Select
          variant="dark"
          label="Branch"
          name="branch"
          placeholder="Select your programme"
          value={form.values.branch ?? ''}
          onChange={(event) => setNullable('branch', event.target.value)}
          error={form.fieldErrors.branch}
          options={BRANCHES.map((branch) => ({ value: branch, label: BRANCH_LABEL[branch] }))}
        />

        <Select
          variant="dark"
          label="Year of study"
          name="year"
          placeholder="Select your year"
          value={form.values.year ?? ''}
          onChange={(event) =>
            setNullable('year', event.target.value === '' ? '' : Number(event.target.value))
          }
          error={form.fieldErrors.year}
          options={STUDY_YEARS.map((year) => ({ value: year, label: `Year ${year}` }))}
        />

        <Select
          variant="dark"
          label="Gender"
          name="gender"
          hint="Used only for the gender filter on goals, where a poster restricts who can join."
          value={form.values.gender}
          onChange={form.handleChange}
          error={form.fieldErrors.gender}
          options={GENDERS.map((gender) => ({ value: gender, label: GENDER_LABEL[gender] }))}
        />

        <InterestsInput
          variant="dark"
          label="Interests"
          value={form.values.interests}
          onChange={(interests) => {
            form.setValue('interests', interests);
            setSaved(false);
          }}
          error={form.fieldErrors.interests}
          hint="Press Enter after each one. These drive your goal suggestions."
        />

        <div className="flex gap-3 pt-2">
          <Button variant="amber" type="submit" loading={form.submitting}>
            {form.submitting ? 'Saving…' : 'Save profile'}
          </Button>
          <Button variant="darkGhost" onClick={() => navigate('/profile')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
