import { Link } from 'react-router-dom';

/**
 * The shared frame around signup, verification and login.
 *
 * Deliberately plain: the real visual design for these screens is still coming, and everything
 * here is layout and structure, not brand. Swapping in the design should mean editing this file
 * and the `ui/` components, not the pages, which hold only logic and copy.
 */
export function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-full flex-col justify-center px-4 py-12">
      <div className="mx-auto w-full max-w-md">
        <div className="text-center">
          <Link to="/" className="text-2xl font-bold tracking-tight text-slate-900">
            CampusLink
          </Link>
          <h1 className="mt-6 text-xl font-semibold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-slate-600">{subtitle}</p>}
        </div>

        <div className="mt-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          {children}
        </div>

        {footer && <div className="mt-6 text-center text-sm text-slate-600">{footer}</div>}
      </div>
    </div>
  );
}
