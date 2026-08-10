/* Hero.jsx — the intro screen.
 *
 * Same sticky device the old site used (a 200vh wrapper with a pinned 100vh
 * panel that the page then scrolls over), reskinned down to three things: one
 * big butter duck, "Hello", "I'm Bertram". Nothing else — no flock, no
 * sparkles, no scroll label.
 */

import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { duckBody, BUTTER } from '../art/ddkit.js';

// The bare duck at its own tight framing — no washtub, no accessory, no
// headroom for one. Stroke is scaled up a touch because the art is being shown
// an order of magnitude larger than the shop ever shows it.
const BIG_DUCK =
  '<svg viewBox="33 21 29 27" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
  duckBody(BUTTER, 1.35) +
  '</svg>';

export default function Hero() {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  // 0 → 1 across exactly one viewport of scroll, which is the pin distance.
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const opacity = useTransform(scrollYProgress, [0, 0.82], [1, 0]);
  const y = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.94]);

  return (
    <div className="hero-wrapper" id="top">
      <motion.section className="hero" ref={ref} style={reduce ? undefined : { opacity }}>
        <motion.div className="hero-inner" style={reduce ? undefined : { y, scale }}>
          <div className="hero-duck" aria-hidden="true" dangerouslySetInnerHTML={{ __html: BIG_DUCK }} />
          <h1>Hello</h1>
          <p className="hero-sub">I&rsquo;m Bertram</p>
        </motion.div>
      </motion.section>
    </div>
  );
}
