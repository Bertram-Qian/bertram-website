/* Pond.jsx — the whole "selected work" section.
 *
 * The scene SVG renders with preserveAspectRatio="xMidYMid meet" into a stage
 * whose aspect-ratio is locked to the viewBox, which makes viewBox → stage a
 * pure linear map. Everything HTML — the ducks, their wakes, the media well —
 * is positioned off that one map, so the video really does sit inside the
 * wooden frame at every width, with no measuring.
 *
 * Two compositions: a wide pond with the board standing on the far bank, and a
 * phone pond with the board below the water. Swapping remounts (keyed on
 * layout), because the ducks' home slots and sizes belong to the composition.
 */

import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { buildOnsen } from '../art/onsen.js';
import { duckSprite, WAKE_SVG } from '../art/duck.js';
import { PROJECTS } from '../data/projects.js';
import { usePond } from '../scene/usePond.js';
import Station from '../scene/Station.jsx';
import { useSwap } from '../components/useSwap.js';

function useLayout() {
  const [layout, setLayout] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches ? 'phone' : 'wide'
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 760px)');
    const on = () => setLayout(mq.matches ? 'phone' : 'wide');
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return layout;
}

function PondScene({ layout }) {
  const reduce = useReducedMotion();
  const scene = useMemo(() => buildOnsen(layout), [layout]);
  const { sceneRef, rippleRef, mvs, refs, bind, docked, undock } =
    usePond({ scene, count: PROJECTS.length, reduce });

  const vb = scene.viewBox;
  const active = docked >= 0 ? PROJECTS[docked] : null;
  // Sequenced swap, the dilly&dally banner rule: out, then in — never both.
  const [caption, captionVisible] = useSwap(active?.id ?? 'idle', active, reduce ? 0 : 200);

  // One map, used for every HTML element laid over the art.
  const pct = (v, axis) => (axis === 'x' ? ((v - vb.x) / vb.w) * 100 : ((v - vb.y) / vb.h) * 100);
  const m = scene.board.media;
  const well = {
    left: `${pct(m.x, 'x')}%`, top: `${pct(m.y, 'y')}%`,
    width: `${(m.w / vb.w) * 100}%`, height: `${(m.h / vb.h) * 100}%`,
  };

  // Percentage sizing keeps the ducks correct at every width with no JS. A
  // percentage margin resolves against the container's WIDTH on both axes,
  // which is exactly what we want when the box has a fixed aspect ratio.
  const s = scene.duckScale;
  const duckW = (32 * s / vb.w) * 100;
  const duckMT = (16.5 * s / vb.w) * 100;
  const wakeW = (48 * s / vb.w) * 100;

  return (
    <>
      <div
        className="pond-stage"
        ref={sceneRef}
        style={{ aspectRatio: `${vb.w} / ${vb.h}` }}
      >
        <div className="pond-art" dangerouslySetInnerHTML={{ __html: scene.svg }} />

        <svg
          className="pond-ripples"
          ref={rippleRef}
          viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
          focusable="false"
        />

        <div className="pond-well" style={well}>
          <Station project={active} reduce={reduce} />
        </div>

        {PROJECTS.map((p, i) => (
          <motion.div
            key={`wake-${p.id}`}
            className="pond-wake"
            aria-hidden="true"
            style={{
              x: mvs[i].x, y: mvs[i].y, rotate: mvs[i].rot, opacity: mvs[i].wake,
              width: `${wakeW}%`, marginLeft: `${-wakeW / 2}%`, marginTop: `${-wakeW / 2}%`,
            }}
            dangerouslySetInnerHTML={{ __html: WAKE_SVG }}
          />
        ))}

        {PROJECTS.map((p, i) => (
          <motion.div
            key={p.id}
            ref={refs[i]}
            className="pond-duck"
            style={{
              x: mvs[i].x, y: mvs[i].y, scale: mvs[i].scale,
              width: `${duckW}%`, marginLeft: `${-duckW / 2}%`, marginTop: `${-duckMT}%`,
            }}
            role="button"
            tabIndex={0}
            aria-label={`${p.name} — ${docked === i ? 'showing on the board, press to put back' : 'press to show on the board'}`}
            aria-pressed={docked === i}
            {...bind(i)}
            dangerouslySetInnerHTML={{ __html: duckSprite(p.colour, p.accessory) }}
          />
        ))}
      </div>

      <div className="pond-caption" aria-live="polite">
        <div className="dd-swap" data-hidden={!captionVisible}>
          {caption ? (
            <>
              <p className="eyebrow">{caption.eyebrow}</p>
              <h3 className="pond-title">{caption.name}</h3>
              <p className="pond-blurb">{caption.blurb}</p>
              <div className="pond-links">
                {caption.links.map((l) => (
                  <a
                    key={l.href}
                    className={l.primary ? 'pill pill-sage' : 'pill pill-ghost'}
                    href={l.href}
                    {...(l.href.startsWith('http') ? { target: '_blank', rel: 'noopener' } : {})}
                  >
                    {l.label} <span aria-hidden="true">&rarr;</span>
                  </a>
                ))}
                <button type="button" className="pill pill-quiet" onClick={() => undock(docked)}>
                  put the duck back
                </button>
              </div>
            </>
          ) : (
            <p className="pond-blurb pond-blurb-idle">
              more ducks coming soon.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

export default function Pond() {
  const layout = useLayout();
  return (
    <section id="work" className="pond">
      <div className="wrap">
        <p className="section-label">selected work</p>
      </div>
      {/* Keyed: home slots, duck size and the board's place all belong to the
          composition, so a breakpoint change is a fresh pond rather than a
          reflow of the old one. */}
      <PondScene key={layout} layout={layout} />

      {/* In the DOM at every render so the projects are crawlable and the links
          survive a broken scene. Hidden from assistive tech because the ducks
          themselves are the labelled controls — this would only be an echo. */}
      <ul className="visually-hidden" aria-hidden="true">
        {PROJECTS.map((p) => (
          <li key={p.id}>
            {p.name} — {p.blurb}
            {p.links.map((l) => (
              <a key={l.href} href={l.href}>{l.label}</a>
            ))}
          </li>
        ))}
      </ul>
    </section>
  );
}
