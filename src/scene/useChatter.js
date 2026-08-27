/* useChatter.js — who is talking, and for how long.
 *
 * Ported from the way DillyDally's spa runs its ambient chatter
 * (SpaScreen.swift:417-435) and the way the pile says a line on tap
 * (PileScreen.swift:245-255). Two rules come straight across:
 *
 *   · ONE LINE AT A TIME. The spa loop opens with `guard bubbleId == nil else
 *     { continue }` — a timer never talks over a live line. It is the same rule
 *     the banner swap encodes ("two headlines are never legible at once"), and
 *     four ducks all piping up together would be noise rather than character.
 *
 *   · THE APP'S DWELL. 2.8s when you touch one, 3.2s for an ambient line.
 *
 * Presence is a two-phase timer rather than AnimatePresence, for the reason
 * useSwap.js gives: a timer lands even in a backgrounded tab, where a
 * frame-driven exit report may never arrive and the line would stick forever.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { pickLine } from '../data/voicelines.js';

const DWELL_TOUCH = 2800;
const DWELL_AMBIENT = 3200;
const OUT_MS = 200;          // matches the app's easeOut(0.2) dismissal

const GAP_MIN = 6000;
const GAP_MAX = 11000;
const FIRST_MS = 3500;       // let the river settle before anyone says anything

// A line is centred on its duck and runs up to 180px wide, so a duck this close
// to a frame edge would have half its line clipped away. It keeps quiet until
// it has drifted somewhere it can be read.
const EDGE_PAD = 108;

export function useChatter({ bodies, mvs, count, reduce, bandRef, onScreen }) {
  const [speaker, setSpeaker] = useState({ i: -1, line: '', n: 0, visible: false });
  const timers = useRef([]);
  const stateRef = useRef(speaker);
  stateRef.current = speaker;

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const show = useCallback((i, dwell) => {
    clearTimers();
    setSpeaker((s) => ({
      i,
      line: pickLine(),
      // `n` keys the line element, so bumping it remounts and replays the pop.
      // Poking a duck that is ALREADY talking must not do that — the app's
      // say() only swaps the words and restarts the idle timer.
      n: s.i === i && s.visible ? s.n : s.n + 1,
      visible: true,
    }));
    timers.current.push(setTimeout(() => {
      setSpeaker((s) => (s.i === i ? { ...s, visible: false } : s));
      timers.current.push(setTimeout(() => {
        setSpeaker((s) => (s.i === i && !s.visible ? { ...s, i: -1 } : s));
      }, OUT_MS));
    }, dwell));
  }, []);

  /** Speak now — a hover, a focus, or a finger. Pre-empts an ambient line. */
  const say = useCallback((i, dwell = DWELL_TOUCH) => {
    const cur = stateRef.current;
    // Same duck: swap the words and restart the clock, no second pop.
    // Different duck: put the live line away first, so two are never readable
    // at the same moment.
    if (cur.i >= 0 && cur.i !== i && cur.visible) {
      clearTimers();
      setSpeaker((s) => ({ ...s, visible: false }));
      timers.current.push(setTimeout(() => show(i, dwell), OUT_MS));
      return;
    }
    show(i, dwell);
  }, [show]);

  /* ------------------------------------------------------------ ambient */
  useEffect(() => {
    if (count <= 0) return undefined;
    let alive = true;
    let t = null;

    const eligible = () => {
      const w = bandRef.current?.clientWidth || 0;
      const bs = bodies.current || [];
      const out = [];
      for (let i = 0; i < bs.length; i++) {
        const b = bs[i];
        if (!b || b.dragging || b.docked || b.animating) continue;
        const px = mvs[i]?.x.get() ?? -1;
        if (px < EDGE_PAD || px > w - EDGE_PAD) continue;
        out.push(i);
      }
      return out;
    };

    const tick = () => {
      if (!alive) return;
      const quiet = !stateRef.current.visible;
      const seen = onScreen?.current?.onScreen !== false;
      if (quiet && seen && !document.hidden) {
        const pool = eligible();
        if (pool.length) show(pool[Math.floor(Math.random() * pool.length)], DWELL_AMBIENT);
      }
      t = setTimeout(tick, GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN));
    };

    t = setTimeout(tick, FIRST_MS);
    return () => { alive = false; clearTimeout(t); };
  }, [bodies, mvs, count, bandRef, onScreen, show]);

  return { speaker, say };
}
