import { Link, useNavigate } from 'react-router-dom';
import { ALLOWED_EMAIL_DOMAIN, signupSchema } from '@campuslink/shared';
import { authApi } from '../api/auth';
import { useForm } from '../hooks/useForm';
import { AuthLayout } from '../components/ui/AuthLayout';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { LockIcon, MailIcon, UserIcon } from '../components/ui/icons';

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
      subtitle={`Open to students with an @${ALLOWED_EMAIL_DOMAIN} email`}
      footer={
        <>
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-brand-300 underline underline-offset-4 hover:text-brand-200"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={form.handleSubmit} className="space-y-4" noValidate>
        <Alert tone="error">{form.formError?.message}</Alert>

        <Field
          variant="glass"
          icon={UserIcon}
          label="Full name"
          placeholder="Full name"
          name="name"
          type="text"
          autoComplete="name"
          value={form.values.name}
          onChange={form.handleChange}
          error={form.fieldErrors.name}
        />

        <Field
          variant="glass"
          icon={MailIcon}
          label="College email"
          placeholder={`yourname@${ALLOWED_EMAIL_DOMAIN}`}
          name="email"
          type="email"
          autoComplete="email"
          value={form.values.email}
          onChange={form.handleChange}
          error={form.fieldErrors.email}
        />

        <Field
          variant="glass"
          icon={LockIcon}
          label="Password"
          placeholder="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          hint={form.fieldErrors.password ? undefined : 'At least 8 characters.'}
          value={form.values.password}
          onChange={form.handleChange}
          error={form.fieldErrors.password}
        />

        <Button type="submit" loading={form.submitting} withArrow className="mt-2 w-full">
          {form.submitting ? 'Creating account…' : 'Create Account'}
        </Button>
      </form>
    </AuthLayout>
  );
}
