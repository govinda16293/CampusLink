import { Link, useNavigate } from 'react-router-dom';
import { loginSchema } from '@campuslink/shared';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { useForm } from '../hooks/useForm';
import { AuthLayout } from '../components/ui/AuthLayout';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { LockIcon, MailIcon } from '../components/ui/icons';

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);

  const form = useForm({
    schema: loginSchema,
    initialValues: { email: '', password: '' },
    onSubmit: async (payload) => {
      const session = await authApi.login(payload);
      setSession(session);
      navigate('/', { replace: true });
    },
  });

  // An unverified account is a dead end on this screen, so it gets a route out rather than just
  // an error message.
  const needsVerification = form.formError?.code === 'EMAIL_NOT_VERIFIED';

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue to CampusLink"
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link
            to="/signup"
            className="font-semibold text-link underline underline-offset-4 hover:text-label"
          >
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={form.handleSubmit} className="space-y-4" noValidate>
        <Alert tone="error">
          {form.formError?.message}
          {needsVerification && (
            <Link
              to="/verify"
              state={{ email: form.values.email }}
              className="mt-2 block font-semibold underline underline-offset-4"
            >
              Verify your email now
            </Link>
          )}
        </Alert>

        <Field
          hideLabel
          icon={MailIcon}
          label="College email"
          placeholder="Email address"
          name="email"
          type="email"
          autoComplete="email"
          value={form.values.email}
          onChange={form.handleChange}
          error={form.fieldErrors.email}
        />

        <Field
          hideLabel
          icon={LockIcon}
          label="Password"
          placeholder="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={form.values.password}
          onChange={form.handleChange}
          error={form.fieldErrors.password}
        />

        {/* No "Forgot password?" link: there is no password reset yet. It used to point at
            /verify, a page that announces "we sent you a code" without anything having sent one —
            and with an empty email field it bounced the user to /signup instead. A link that
            promises recovery and delivers neither is worse than no link. */}

        <Button type="submit" loading={form.submitting} withArrow className="mt-2 w-full">
          {form.submitting ? 'Signing in…' : 'Sign In'}
        </Button>
      </form>
    </AuthLayout>
  );
}
