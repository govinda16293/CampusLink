import { Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Brand } from './ui/Brand';
import { Button, ButtonLink } from './ui/Button';
import { ShieldIcon } from './ui/icons';
import { TabBar } from './TabBar';

/**
 * The shell around every signed-in page.
 *
 * Follows the iOS 26 layout: no opaque bars. The brand and sign-out float as glass capsules in a
 * transparent header, navigation is a floating glass tab bar at the foot of the screen, and
 * content scrolling beneath either edge is progressively blurred rather than cut off by a bar.
 * Introduced in Step 2 so the feed, goal detail and lobby pages inherit one shell rather than
 * each inventing its own.
 */
export function AppLayout() {
  const logout = useAuthStore((state) => state.logout);
  const isAdmin = useAuthStore((state) => state.user?.role) === 'ADMIN';

  return (
    <div className="relative min-h-full">
      {/* The scroll edge effect — see .scroll-edge in index.css. */}
      <div aria-hidden="true" className="scroll-edge scroll-edge-top" />
      <div aria-hidden="true" className="scroll-edge scroll-edge-bottom" />

      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-30 pt-[max(1rem,env(safe-area-inset-top))]">
          {/* Same width and side padding as <main>, so the brand lines up with the content. */}
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 sm:px-8">
            <Brand />
            <div className="flex items-center gap-2">
              {/* Moderators only, and only a shortcut — the API refuses everyone else whether or
                  not this link is on screen. Students never see that the area exists. */}
              {isAdmin && (
                <ButtonLink to="/admin" variant="secondary" size="sm">
                  <ShieldIcon className="size-4" />
                  Moderation
                </ButtonLink>
              )}
              <Button variant="secondary" size="sm" onClick={logout}>
                Sign out
              </Button>
            </div>
          </div>
        </header>

        {/* Bottom padding clears the floating tab bar so content never hides behind it. */}
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-40 pt-6 sm:px-8">
          <Outlet />
        </main>

        <TabBar />
      </div>
    </div>
  );
}
