import { Link, useNavigate } from 'react-router-dom';
import { loginSchema } from '@campuslink/shared';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { useForm } from '../hooks/useForm';
import { AuthLayout } from '../components/ui/AuthLayout';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';

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
      title="Sign in"
      footer={
        <>
          New here?{' '}
          <Link to="/signup" className="font-semibold text-brand-700 hover:text-brand-600">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={form.handleSubmit} className="space-y-5" noValidate>
        <Alert tone="error">
          {form.formError?.message}
          {needsVerification && (
            <Link
              to="/verify"
              state={{ email: form.values.email }}
              className="mt-2 block font-semibold underline"
            >
              Verify your email now
            </Link>
          )}
        </Alert>

        <Field
          label="College email"
          name="email"
          type="email"
          autoComplete="email"
          value={form.values.email}
          onChange={form.handleChange}
          error={form.fieldErrors.email}
        />

        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={form.values.password}
          onChange={form.handleChange}
          error={form.fieldErrors.password}
        />

        <Button type="submit" loading={form.submitting} className="w-full">
          {form.submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  );
}
