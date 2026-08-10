/* useSwap — sequenced content changes.
 *
 * dillydallywebsite's banner swaps its headline by fading OUT for 0.2s and only
 * then fading the next one IN over 0.3s: "sequenced, never cross-faded — two
 * headlines are never legible at once." This reproduces that rule with a plain
 * timer and CSS transitions.
 *
 * It is used instead of AnimatePresence because a two-state swap does not need a
 * presence engine, and because this version cannot stall: the content change is
 * a timer, so it lands even if the animation frames behind it never arrive (a
 * backgrounded tab, say). AnimatePresence holds the incoming child until the
 * outgoing one reports its exit finished, and that report is frame-driven.
 *
 * @param key   identity of the current content; a change starts a swap
 * @param value the content to show once the fade-out completes
 * @returns [shownValue, visible]
 */

import { useEffect, useState } from 'react';

export function useSwap(key, value, outMs = 200) {
  const [shown, setShown] = useState({ key, value });
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (key === shown.key) return undefined;
    setVisible(false);
    const t = setTimeout(() => {
      setShown({ key, value });
      setVisible(true);
    }, outMs);
    return () => clearTimeout(t);
  }, [key, value, outMs, shown.key]);

  return [shown.value, visible];
}
