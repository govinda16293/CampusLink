import { Link } from 'react-router-dom';
import { LogoMark } from './icons';

/**
 * The CampusLink wordmark: the logo on an app-icon tile, the name beside it, both on a glass
 * capsule. Shared by the signed-out and signed-in headers so the brand reads the same on both.
 */
export function Brand() {
  return (
    <Link
      to="/"
      className="glass-control inline-flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-4 transition duration-300 ease-spring active:scale-[1.04] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <span className="app-icon flex size-8 items-center justify-center rounded-[10px] text-white">
        <LogoMark className="size-5" />
      </span>
      <span className="text-[17px] font-semibold tracking-[-0.02em] text-label">CampusLink</span>
    </Link>
  );
}
