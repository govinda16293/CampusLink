import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { OTP_LENGTH, OTP_TTL_MINUTES, verifyOtpSchema } from '@campuslink/shared';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { useForm } from '../hooks/useForm';
import { AuthLayout } from '../components/ui/AuthLayout';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';

const RESEND_COOLDOWN_SECONDS = 30;

export function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((state) => state.setSession);

  const email = location.state?.email ?? '';
  const [resendState, setResendState] = useState({ message: null, cooldown: 0 });

  const form = useForm({
    schema: verifyOtpSchema,
    initialValues: { email, code: '' },
    onSubmit: async (payload) => {
      const session = await authApi.verifyOtp(payload);
      setSession(session);
      navigate('/', { replace: true });
    },
  });

  // Tick the resend cooldown down. Without a cooldown, an impatient user can spend their whole
  // rate-limit budget on resends and then be unable to submit the code they already have.
  useEffect(() => {
    if (resendState.cooldown <= 0) return undefined;
    const timer = setTimeout(
      () => setResendState((s) => ({ ...s, cooldown: s.cooldown - 1 })),
      1000,
    );
    return () => clearTimeout(timer);
  }, [resendState.cooldown]);

  // Reached directly, with no address to verify — start over rather than showing a dead form.
  if (!email) return <Navigate to="/signup" replace />;

  async function handleResend() {
    setResendState({ message: null, cooldown: RESEND_COOLDOWN_SECONDS });
    try {
      const { message } = await authApi.resendOtp(email);
      setResendState({ message, cooldown: RESEND_COOLDOWN_SECONDS });
    } catch (error) {
      setResendState({ message: error.message, cooldown: 0 });
    }
  }

  return (
    <AuthLayout
      title="Check your email"
      subtitle={`We sent a ${OTP_LENGTH}-digit code to ${email}. It expires in ${OTP_TTL_MINUTES} minutes.`}
    >
      <form onSubmit={form.handleSubmit} className="space-y-5" noValidate>
        <Alert tone="error">{form.formError?.message}</Alert>
        <Alert tone="info">{resendState.message}</Alert>

        <Field
          label="Verification code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={OTP_LENGTH}
          placeholder={'0'.repeat(OTP_LENGTH)}
          autoFocus
          className="[&_input]:text-center [&_input]:text-lg [&_input]:tracking-[0.4em]"
          value={form.values.code}
          // Strip anything non-numeric as it is typed, so pasting "123 456" still works.
          onChange={(event) =>
            form.setValue('code', event.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))
          }
          error={form.fieldErrors.code}
        />

        <Button type="submit" loading={form.submitting} className="w-full">
          {form.submitting ? 'Verifying…' : 'Verify and continue'}
        </Button>

        <div className="text-center">
          <Button variant="ghost" onClick={handleResend} disabled={resendState.cooldown > 0}>
            {resendState.cooldown > 0
              ? `Resend code in ${resendState.cooldown}s`
              : "Didn't get it? Resend code"}
          </Button>
        </div>
      </form>

      <p className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-500">
        Developing locally? The code is printed in the terminal running{' '}
        <code className="font-mono">npm run dev</code> — no real email is sent.
      </p>
    </AuthLayout>
  );
}
