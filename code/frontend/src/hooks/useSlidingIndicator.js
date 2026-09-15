import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Places a selection thumb under whichever child of a container is marked `data-active="true"`,
 * sliding it there on a spring and stretching it mid-flight — the liquid movement of the iOS 26
 * tab bar and segmented controls.
 *
 * Measured from the DOM rather than computed from an index, because the options have different
 * widths ("Gym" sits beside "Travel / cab share").
 *
 * The container must be positioned (it is the thumb's containing block and the options'
 * offsetParent), and each option must be positioned too so it paints above the thumb.
 */
export function useSlidingIndicator(activeKey) {
  const containerRef = useRef(null);
  const thumbRef = useRef(null);
  const [box, setBox] = useState(null);
  const [placed, setPlaced] = useState(false);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const measure = () => {
      const active = container.querySelector('[data-active="true"]');
      // With nothing selected the thumb fades out where it is, so it can glide from there when
      // something is selected again rather than sweeping in from the left edge.
      setBox((current) =>
        active
          ? { x: active.offsetLeft, width: active.offsetWidth, visible: true }
          : current && { ...current, visible: false },
      );
    };
    measure();

    // Re-measure when the row resizes or an option's label changes width.
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    container.querySelectorAll('[data-active]').forEach((option) => observer.observe(option));
    return () => observer.disconnect();
  }, [activeKey]);

  // Switch the slide on only after the first placement, so on page load the thumb is simply
  // there instead of gliding in from the edge.
  useEffect(() => {
    if (!box || placed) return undefined;
    const frame = requestAnimationFrame(() => setPlaced(true));
    return () => cancelAnimationFrame(frame);
  }, [box, placed]);

  // The stretch: a quick squash-and-widen while the thumb travels, settling back to round.
  // Animated on `scale`, which composes with the `translate` that moves it.
  const previousKey = useRef(activeKey);
  useEffect(() => {
    if (previousKey.current === activeKey) return;
    previousKey.current = activeKey;

    const thumb = thumbRef.current;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!thumb?.animate || reducedMotion) return;

    thumb.animate([{ scale: '1 1' }, { scale: '1.14 0.86', offset: 0.3 }, { scale: '1 1' }], {
      duration: 550,
      easing: 'ease-out',
    });
  }, [activeKey]);

  const thumbStyle = box
    ? {
        width: box.width,
        translate: `${box.x}px 0`,
        opacity: box.visible ? 1 : 0,
        transition: placed ? undefined : 'none',
      }
    : { opacity: 0 };

  return { containerRef, thumbRef, thumbStyle };
}
