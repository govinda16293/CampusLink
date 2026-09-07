import { Link, useNavigate } from 'react-router-dom';
import { ALLOWED_EMAIL_DOMAIN, signupSchema } from '@campuslink/shared';
import { authApi } from '../api/auth';
import { useForm } from '../hooks/useForm';
import { AuthLayout } from '../components/ui/AuthLayout';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';

export function SignupPage() {
  const navigate = useNavigate();

  const form = useForm({
    schema: signupSchema,
    initialValues: { name: '', email: '', password: '' },
    onSubmit: async (payload) => {
      await authApi.signup(payload);
      // The passcode is tied to the address, so it travels to the next screen in router state
      // rather than in the URL — an email address in a shareable link is needless exposure.
      navigate('/verify', { state: { email: payload.email }, replace: true });
    },
  });

  return (
    <AuthLayout
      title="Create your account"
      subtitle={`CampusLink is open to students with an @${ALLOWED_EMAIL_DOMAIN} email.`}
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-700 hover:text-brand-600">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={form.handleSubmit} className="space-y-5" noValidate>
        <Alert tone="error">{form.formError?.message}</Alert>

        <Field
          label="Full name"
          name="name"
          type="text"
          autoComplete="name"
          value={form.values.name}
          onChange={form.handleChange}
          error={form.fieldErrors.name}
        />

        <Field
          label="College email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder={`yourname@${ALLOWED_EMAIL_DOMAIN}`}
          value={form.values.email}
          onChange={form.handleChange}
          error={form.fieldErrors.email}
        />

        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          value={form.values.password}
          onChange={form.handleChange}
          error={form.fieldErrors.password}
        />

        <Button type="submit" loading={form.submitting} className="w-full">
          {form.submitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  );
}
