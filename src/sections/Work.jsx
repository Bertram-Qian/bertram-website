/* Work.jsx — the whole "selected work" section.
 *
 * Three layers stacked in one positioning box:
 *
 *   .river-band    the scene, bleeding past the content column on both sides
 *   .wrap > Stall  the notice stall, in the 1080px column like everything else
 *   .river-ducks   the ducks themselves, laid over BOTH. Their wakes and their
 *                  cast shadows are NOT here — both belong to the water, so
 *                  they live inside the band where the bank stone covers them.
 *
 * The band and the box are different widths on purpose — the river runs off the
 * page, the stall lines up with the section label above it — and useRiver
 * measures the offset between them once so the ducks land on the water anyway.
 *
 * The scene is rebuilt only when the measured width has moved more than 24px.
 * A river is not a photograph: the px-per-art-unit scale is held constant, so a
 * wider window gets MORE river rather than a bigger one, and that means the art
 * space itself has to change with the viewport.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { buildRiver, PHONE_QUERY } from '../art/river.js';
import { duckSprite, WAKE_SVG, SHADOW_SVG } from '../art/duck.js';
import { lilypadSprite } from '../art/ddkit.js';
import { PROJECTS } from '../data/projects.js';
import { useRiver } from '../scene/useRiver.js';
import { useChatter } from '../scene/useChatter.js';
import DuckSpeech from '../scene/DuckSpeech.jsx';
import Stall from '../scene/Stall.jsx';

const REBUILD_SLOP = 24;   // px — under this, the band just scales by <2%

function useLayout() {
  const [layout, setLayout] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(PHONE_QUERY).matches ? 'phone' : 'wide'
  );
  useEffect(() => {
    const mq = window.matchMedia(PHONE_QUERY);
    const on = () => setLayout(mq.matches ? 'phone' : 'wide');
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return layout;
}

function RiverScene({ layout }) {
  const reduce = useReducedMotion();

  const [width, setWidth] = useState(() =>
    typeof document !== 'undefined' ? document.documentElement.clientWidth : 1280
  );
  const scene = useMemo(() => buildRiver(width, layout), [width, layout]);

  const dropRef = useRef(null);
  const perchRef = useRef(null);

  const {
    sceneRef, bandRef, rippleRef, mvs, refs, shadowRefs, bodies, pads, padMvs,
    bind, docked, undock, drag, landTick, onScreen,
  } = useRiver({ scene, count: PROJECTS.length, reduce, dropRef, perchRef });

  const { speaker, say } = useChatter({
    bodies, mvs, count: PROJECTS.length, reduce, bandRef, onScreen,
  });

  // The band's width is not derived from anything the band draws, so measuring
  // it here is not circular — it is the page telling the art how long to be.
  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return undefined;
    const read = () => {
      const w = el.clientWidth;
      if (w) setWidth((prev) => (Math.abs(w - prev) > REBUILD_SLOP ? w : prev));
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [sceneRef]);

  const vb = scene.viewBox;
  const active = docked >= 0 ? PROJECTS[docked] : null;

  return (
    <div className="river-scene" ref={sceneRef} data-lit={active ? 'true' : undefined}>
      {/* The stall comes FIRST and the river runs in front of it, so the board
          reads as standing on the far bank. Its posts hang down into the band
          and the stone covers their feet. */}
      <div className="stall-wrap">
        <Stall
          project={active}
          reduce={reduce}
          dropRef={dropRef}
          perchRef={perchRef}
          drag={drag}
          landTick={landTick}
          onPutBack={() => undock(docked)}
        />
      </div>

      <div
        className="river-band"
        ref={bandRef}
        style={{ aspectRatio: `${vb.w} / ${vb.h}` }}
      >
        {/* water → ripples → wakes → lilypads → cast shadows → stone.
            Everything that happens ON the surface is a layer inside the band, so
            it passes UNDER the bank it drifts past instead of over it. Only the
            ducks themselves sit above the stone — they are the thing you pick
            up — but their shadows are not on the duck, they are on the river,
            so they stay down here and the bank covers them. */}
        <div className="river-art" dangerouslySetInnerHTML={{ __html: scene.svgWater }} />
        <svg
          className="river-ripples"
          ref={rippleRef}
          viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
          focusable="false"
        />
        <div className="river-wakes" aria-hidden="true">
          {PROJECTS.map((p, i) => (
            <motion.div
              key={`wake-${p.id}`}
              className="river-wake"
              style={{ x: mvs[i].wx, y: mvs[i].wy, rotate: mvs[i].rot, opacity: mvs[i].wake }}
              dangerouslySetInnerHTML={{ __html: WAKE_SVG }}
            />
          ))}
        </div>
        <div className="river-pads" aria-hidden="true">
          {pads.map((p, i) => (
            <motion.div
              key={`pad-${i}`}
              className="river-pad"
              style={{ x: padMvs[i].x, y: padMvs[i].y, rotate: padMvs[i].rot, '--k': p.k }}
              dangerouslySetInnerHTML={{ __html: lilypadSprite(p.big ? 'large' : 'small', p.flip) }}
            />
          ))}
        </div>
        {/* The ducks' cast shadows. LAST thing in the band and therefore the
            first thing the stone covers: a shadow falls on everything floating
            on the water — pads included, which is what a shadow does — but a
            boulder is not on the water, so the bank drawn after this buries it.
            The ducks themselves still sit above the stone; only their shadows
            stay down here with the river. */}
        <div className="river-shadows" aria-hidden="true">
          {PROJECTS.map((p, i) => (
            <motion.div
              key={`shadow-${p.id}`}
              ref={shadowRefs[i]}
              className="river-shadow"
              style={{ x: mvs[i].wx, y: mvs[i].wy, scale: mvs[i].scale }}
              dangerouslySetInnerHTML={{ __html: SHADOW_SVG }}
            />
          ))}
        </div>
        <div className="river-art" dangerouslySetInnerHTML={{ __html: scene.svgBank }} />
      </div>

      <div className="river-ducks">
        {/* A duck speaks on PRESS and on keyboard focus, never on hover: the
            ducks drift, so a cursor left anywhere over the water collects a line
            from every one that passes under it, and the page starts shouting. */}
        {PROJECTS.map((p, i) => {
          const handlers = bind(i);
          return (
            <motion.div
              key={p.id}
              ref={refs[i]}
              className="river-duck"
              style={{ x: mvs[i].x, y: mvs[i].y }}
              role="button"
              tabIndex={0}
              aria-label={`${p.name}. ${docked === i ? 'showing on the stall, press to put it back in the river' : 'press to show it on the stall'}`}
              aria-pressed={docked === i}
              {...handlers}
              onPointerDown={(e) => { handlers.onPointerDown(e); say(i); }}
              onFocus={() => say(i)}
            >
              {/* The sprite is its own element so the press squeeze can scale it
                  without scaling the line above it — and so `data-dry` on the
                  duck still finds `.dd-wet` inside. */}
              <motion.div
                className="river-duck-art"
                style={{ scale: mvs[i].scale }}
                dangerouslySetInnerHTML={{ __html: duckSprite(p.colour, p.accessory) }}
              />
              {speaker.i === i && (
                <DuckSpeech
                  key={speaker.n}
                  line={speaker.line}
                  visible={speaker.visible}
                  reduce={reduce}
                />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default function Work() {
  const layout = useLayout();
  return (
    <section id="work" className="work">
      {/* Pinned for one viewport of scroll, so the whole scene — board, river,
          ducks — is on screen at once and the demo can be sized to fill it.
          Un-pinned below the phone breakpoint and on short viewports, where a
          stacked card is taller than the screen it would be pinned to. */}
      <div className="work-pin">
        <div className="wrap">
          <p className="section-label">selected work</p>
        </div>
        {/* Keyed: the duck sizes, the lanes and the whole art space belong to
            the composition, so a breakpoint change is a fresh river rather than
            a reflow of the old one. */}
        <RiverScene key={layout} layout={layout} />
      </div>

      {/* In the DOM at every render so the projects are crawlable and the links
          survive a broken scene. Hidden from assistive tech because the ducks
          themselves are the labelled controls — this would only be an echo. */}
      <ul className="visually-hidden" aria-hidden="true">
        {PROJECTS.map((p) => (
          <li key={p.id}>
            {p.name}: {p.blurb}
            {p.links.map((l) => (
              <a key={l.href} href={l.href}>{l.label}</a>
            ))}
          </li>
        ))}
      </ul>
    </section>
  );
}
