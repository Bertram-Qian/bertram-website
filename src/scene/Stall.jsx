/* Stall.jsx — the riverside notice stall.
 *
 * The old board was a wooden frame drawn inside the scene SVG with the video
 * laid over its well by the viewBox map. That was the right answer for a scene
 * that fit in one box. The river bleeds past the content column, so the stall
 * comes out of the art and becomes real HTML in the column — which also lets
 * the project's copy sit BESIDE its demo instead of two hundred pixels below it.
 *
 * The construction is dilly&dally's two surfaces put together: onsen joinery in
 * front (a beam and two posts, each member built the way woodPanel() built
 * them — a flat body with one shade block and one light block, never a
 * gradient) holding the landing page's own paper card.
 *
 * The stall stands ABOVE the water, which in a scene laid out this way means it
 * stands on the FAR bank with the river running in front of it. So the beam is
 * the board's bottom rail rather than its top one: it is the ledge a duck
 * climbs out of the river onto, and the posts carry on past it down into the
 * bank, where the stone covers their feet.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import Station from './Station.jsx';
import { useSwap } from '../components/useSwap.js';
import { GHOST_DUCK } from '../art/duck.js';

// Borrowed from the old board's bottom-rail stave lines. Seven of
// them, faint, so the beam reads as a plank rather than a bar of colour.
const GRAIN = [0.13, 0.26, 0.38, 0.5, 0.63, 0.76, 0.88];

/**
 * Animate a block between two auto heights.
 *
 * On a phone the card stacks, so swapping a project in or out changes the copy
 * column's height by a couple of hundred pixels — and that lands as one instant
 * jump, which drags the beam and everything below it down a step. Measure the
 * content, drive the height, and the card grows DOWNWARD over the same beat the
 * project fades in on. The perched duck is glued to the beam by useRiver, so it
 * rides the growth instead of being left behind by it.
 *
 * `null` until the first measurement so the very first paint is plain `auto` —
 * server-rendered or not, nothing animates in from zero on load.
 */
function useAutoHeight(deps) {
  const ref = useRef(null);
  const [h, setH] = useState(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const read = () => setH(el.offsetHeight);
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, deps);
  return [ref, h];
}

function EmptyWell() {
  return (
    <div className="stall-empty">
      {/* No viewBox: the SVG's user units are its own CSS pixels, so the dashes
          stay even and the corners stay round at any card width, with nothing
          to measure. */}
      <svg className="stall-target" width="100%" height="100%" aria-hidden="true" focusable="false">
        <rect
          x="0" y="0" width="100%" height="100%" rx="10"
          fill="none" stroke="currentColor" strokeWidth="1.25" strokeDasharray="6 5"
        />
      </svg>
      <div className="stall-ghost" aria-hidden="true" dangerouslySetInnerHTML={{ __html: GHOST_DUCK }} />
      <p className="stall-empty-label" aria-hidden="true">catch a duck from the river</p>
    </div>
  );
}

export default function Stall({ project, reduce, dropRef, perchRef, drag, landTick, onPutBack }) {
  const [shown, visible] = useSwap(project?.id ?? 'empty', project, reduce ? 0 : 200);
  const [copyRef, copyH] = useAutoHeight([]);

  // The beam takes the landing. `ddSettle`'s restart trick from ChairPileToy:
  // remove, force a reflow, re-add — a class you re-apply without that never
  // replays.
  useEffect(() => {
    const el = perchRef?.current;
    if (!el || !landTick || reduce) return;
    el.classList.remove('settle');
    void el.offsetWidth;
    el.classList.add('settle');
  }, [landTick, reduce, perchRef]);

  return (
    <div
      className="stall"
      ref={dropRef}
      data-drag={drag.i >= 0 ? 'on' : undefined}
      data-over={drag.i >= 0 && drag.over ? 'true' : undefined}
      data-filled={shown ? 'true' : undefined}
    >
      <div className="stall-post stall-post-l" aria-hidden="true" />
      <div className="stall-post stall-post-r" aria-hidden="true" />

      <div className="stall-card">
        <div className="stall-well">
          <div className="dd-swap" data-hidden={!visible}>
            {shown ? <Station project={shown} reduce={reduce} /> : <EmptyWell />}
          </div>
        </div>

        <motion.div
          className="stall-copy"
          aria-live="polite"
          animate={{ height: copyH == null ? 'auto' : copyH }}
          /* A spring, not the house ease. cubic-bezier(.22,1,.36,1) is
             front-loaded — over a 130px height change more than half the move
             lands in the first 60ms, which reads as a snap with a tail rather
             than as growth. A gently damped spring spends its time in the
             middle of the move, where the eye actually tracks it. */
          transition={reduce ? { duration: 0 } : { type: 'spring', visualDuration: 0.5, bounce: 0.1 }}
        >
          <div className="stall-copy-in" ref={copyRef}>
          <div className="dd-swap" data-hidden={!visible}>
            {shown ? (
              <>
                <p className="eyebrow">{shown.eyebrow}</p>
                <h3 className="stall-title">{shown.name}</h3>
                <p className="stall-blurb">{shown.blurb}</p>
                <div className="stall-links">
                  {shown.links.map((l) => (
                    <a
                      key={l.href}
                      className={l.primary ? 'pill pill-sage' : 'pill pill-ghost'}
                      href={l.href}
                      {...(l.href.startsWith('http') ? { target: '_blank', rel: 'noopener' } : {})}
                    >
                      {l.label} <span aria-hidden="true">&rarr;</span>
                    </a>
                  ))}
                  <button type="button" className="pill pill-quiet" onClick={onPutBack}>
                    put it back in the river
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="eyebrow">four ducks, four projects</p>
                <h3 className="stall-title">pick one out of the river</h3>
                <p className="stall-blurb">
                  tap a duck as it drifts past, or drag it up onto the beam.
                </p>
              </>
            )}
          </div>
          </div>
        </motion.div>
      </div>

      {/* The bottom rail, and the ledge a duck climbs out of the river onto.
          useRiver measures it off the page, so the duck lands astride it at any
          width with no coordinate maths at all. */}
      <div className="stall-beam" ref={perchRef} aria-hidden="true">
        {GRAIN.map((g) => <i key={g} style={{ left: `${g * 100}%` }} />)}
      </div>
    </div>
  );
}
