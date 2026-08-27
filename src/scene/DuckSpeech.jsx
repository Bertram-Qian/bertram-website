/* DuckSpeech.jsx — a duck saying something.
 *
 * THERE IS NO BUBBLE. DillyDallySwift's SpeechBubble.swift opens with "Per
 * request this is now JUST THE TEXT: no pill, no border, no tail." No
 * background, no padding, no corner radius, no drop shadow. A rounded rect with
 * a little tail pointing down would be a different product's speech bubble.
 *
 * It ships two legibility modes and the app picks the second one specifically
 * for water: SpaScene.swift passes `halo: false, outline: true`, because "the
 * glow read as a white smudge over the onsen water (owner call, 2026-07-15)".
 * A river is the same problem, so this is the outline variant — eight white
 * copies offset 0.9pt at 45° steps, which is a hairline stroke rather than a
 * blur. It also happens to be the only treatment that survives all three things
 * a drifting line crosses here: dark water, mid-tone stone, and the pale page
 * above the bank.
 *
 * The pop is the app's too: scale 0.9 → 1 anchored at the BOTTOM edge, which is
 * the only thing standing in for a tail — the line sprouts upward out of the
 * duck.
 */

import { motion, spring } from 'motion/react';

// .spring(response: 0.32, dampingFraction: 0.7)
const IN = { type: spring, visualDuration: 0.32, bounce: 0.3 };
// withAnimation(.easeOut(duration: 0.2))
const OUT = { duration: 0.2, ease: 'easeOut' };

export default function DuckSpeech({ line, visible, reduce }) {
  return (
    <motion.span
      className="duck-line"
      aria-hidden="true"
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
      animate={visible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: reduce ? 1 : 0.94 }}
      transition={visible && !reduce ? IN : OUT}
    >
      {line}
    </motion.span>
  );
}
