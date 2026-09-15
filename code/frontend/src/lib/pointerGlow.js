/**
 * Feeds the cursor position to interactive glass, so the highlight drawn by
 * `.glass-interactive::after` follows the pointer across a card — light moving over the surface.
 *
 * One delegated listener for the whole document rather than one per card, throttled to a frame.
 * Skipped entirely on touch screens, where there is no hover for the highlight to answer.
 */
export function installPointerGlow() {
  if (!window.matchMedia?.('(hover: hover)').matches) return;

  let latest = null;
  let scheduled = false;

  document.addEventListener(
    'pointermove',
    (event) => {
      latest = event;
      if (scheduled) return;
      scheduled = true;

      requestAnimationFrame(() => {
        scheduled = false;
        const target =
          latest.target instanceof Element ? latest.target.closest('.glass-interactive') : null;
        if (!target) return;

        const rect = target.getBoundingClientRect();
        target.style.setProperty('--pointer-x', `${latest.clientX - rect.left}px`);
        target.style.setProperty('--pointer-y', `${latest.clientY - rect.top}px`);
      });
    },
    { passive: true },
  );
}
