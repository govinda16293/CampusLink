import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

/**
 * Gate for routes that require a signed-in student.
 *
 * This is a convenience for the user, not a security control — every protected endpoint checks
 * the token server-side. Hiding a route in the client only stops someone stumbling into a page
 * that would fail anyway.
 */
export function ProtectedRoute() {
  const status = useAuthStore((state) => state.status);
  const location = useLocation();

  // Still checking a stored token. Rendering the login page here would flash it in front of
  // users who turn out to be signed in.
  if (status === 'loading') {
    return (
      <div className="flex min-h-full items-center justify-center p-8 text-sm text-slate-500">
        Loading…
      </div>
    );
  }

  if (status !== 'authenticated') {
    // Remember where they were headed so login can send them back there.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

/** The mirror image: keeps signed-in users off the signup and login screens. */
export function PublicOnlyRoute() {
  const status = useAuthStore((state) => state.status);

  if (status === 'loading') return null;
  if (status === 'authenticated') return <Navigate to="/" replace />;

  return <Outlet />;
}
