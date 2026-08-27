/* useRiver.js — the water, now that it is going somewhere.
 *
 * The motion model is still SpaPhysics.swift, ported through
 * dillydallywebsite/main.js: exponential damping toward a decaying drift
 * target, equal-mass pair collisions, a hard speed cap, and an idle bob that is
 * render-only and never fed back into the simulation. A swipe still sets only a
 * DIRECTION, never a speed — that is the app's rule and it is what keeps the
 * water calm rather than skittish.
 *
 * Four things are the river's rather than the pond's.
 *
 *   · CONTAINMENT. The pond reflected off an ellipse gradient. A river has no
 *     ends, so there are no side walls at all — only the two bank curves out of
 *     river.js, which the duck reflects off vertically and wraps around
 *     horizontally.
 *
 *   · A CURRENT. `step` adds a constant downstream term, so a released duck's
 *     fling decays back INTO the flow instead of decaying to a stop. Every
 *     speed in the file is quoted as a multiple of that current, so the wide
 *     river and the phone river feel identical even though their art spaces are
 *     nothing alike.
 *
 *   · A LANE. Each duck steers toward the channel's centre plus a personal
 *     offset and a slow weave. That is what makes them ride the meander instead
 *     of cutting straight lines across it, and it keeps them off the stone
 *     without the bank ever having to catch them.
 *
 *   · A DOM DROP TARGET. The stall is real HTML now, not a rect in the art, so
 *     the drop zone and the perch are measured off the page rather than mapped
 *     out of the viewBox.
 *
 * Drag is still hand-rolled on pointer events rather than handed to Motion's
 * `drag`: Motion recomputes a dragged element's position from origin+delta every
 * frame, which fights any position we write back for our own clamping. Owning
 * the pointer outright means the physics loop and the drag write to the same
 * motion values without arguing. Motion still does what it is best at — springs.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { animate, motionValue, spring } from 'motion/react';

const DAMP = 1.6;      // e^(-DAMP·dt) — a fling's decay
const RAMP = 7;        // 1-e^(-RAMP·dt) — how fast velocity chases the target
const WAVE_MAX = 0.16; // the app's wake ceiling, unmodified
// The wake's opacity is CHASED, not assigned — see render(). Rise is quick,
// because a wake belongs to the stroke that made it and arriving late reads as
// lag. The fall is the slow one, and it is the whole point: docking, grabbing
// or simply slowing used to write 0 straight into a bound opacity, which cuts
// three arcs off in a single frame however gently their own keyframes fade.
// e^(-3.4·t): four fifths gone by half a second, which is the card spring's
// 0.45s — the same dissolve the rest of the scene already uses.
const WAKE_IN = 9;
const WAKE_OUT = 3.4;
const TAP_SLOP = 8;    // px — under this, a press is a tap, not a drag
const TAP_TIME = 600;  // ms

// How long a duck takes to cross the frame, at any width. Everything else in
// the file is a multiple of the current this implies, so the feel is identical
// on a phone and on a 27" monitor.
const CROSS_SECONDS = 34;
const DRIFT_X = 2.2;   // × current — the burst a release imparts
const CAP_X = 3.4;     // × current — hard ceiling
const WAVE_LO_X = 0.10;
const WAVE_HI_X = 1.60;   // puts the resting current at ~60% of WAVE_MAX
const STEER_X = 0.55;  // × current — how fast a duck may cross its lane
const PADS = 7;        // lilypads riding the river as scenery

const SPRING = { type: spring, visualDuration: 0.45, bounce: 0.28 };
const POP = { type: spring, visualDuration: 0.22, bounce: 0.4 };

const hyp = Math.hypot;
const clamp = (lo, v, hi) => (v < lo ? lo : v > hi ? hi : v);

export function useRiver({ scene, count, reduce, dropRef, perchRef }) {
  const { artW, topEdge, botEdge, duckR, spriteW, duckScale, padW, viewBox, layout } = scene;

  const sceneRef = useRef(null);       // the positioning box: river band + stall
  const bandRef = useRef(null);        // the band alone — the thing we measure
  const rippleRef = useRef(null);
  const els = useRef([]);
  const shadowEls = useRef([]);        // the cast shadows, down in the band
  const scaleRef = useRef(1);          // px per art unit
  const dropPx = useRef(null);
  const perchPx = useRef(null);
  const perchProbe = useRef(null);   // set by the layout effect; read per frame

  const [docked, setDocked] = useState(-1);
  const [drag, setDrag] = useState({ i: -1, over: false });
  const [landTick, setLandTick] = useState(0);
  const dragRef = useRef(drag);
  dragRef.current = drag;

  // Everything speed-shaped is a multiple of the current, so the ratios survive
  // any art space. The bob is the exception: it belongs to the duck, not to the
  // river, so it scales with the duck.
  const current = artW / CROSS_SECONDS;
  const drift = DRIFT_X * current;
  const cap = CAP_X * current;
  const waveLo = WAVE_LO_X * current, waveHi = WAVE_HI_X * current;
  const steerMax = STEER_X * current;
  const idleX = duckR * 0.14, idleY = duckR * 0.10;

  // Far enough off-frame that the jump is never on screen: half a sprite plus
  // a margin, on both sides.
  const wrap = spriteW * 0.6 + 24;
  const track = artW + wrap * 2;

  /* --------------------------------------------------- motion values ---- */
  const mvs = useRef(null);
  if (!mvs.current || mvs.current.length !== count) {
    mvs.current = Array.from({ length: count }, () => ({
      x: motionValue(0), y: motionValue(0),
      scale: motionValue(1), wake: motionValue(0), rot: motionValue(0),
      // The wake is drawn INSIDE the band, under the stone, so it needs the
      // band-local position while the duck itself keeps the scene-local one.
      wx: motionValue(0), wy: motionValue(0),
      // A docked duck is positioned as PERCH + this offset, and the offset is
      // what the dock spring animates down to zero. Springing straight to the
      // beam's coordinates cannot work here: the card grows when its project
      // swaps in, so the beam is a moving target and an absolute spring lands
      // where the beam used to be. An offset spring is target-independent — the
      // duck is glued to the rail for the whole flight and after it.
      dx: motionValue(0), dy: motionValue(0),
    }));
  }

  const refCbs = useRef(null);
  if (!refCbs.current || refCbs.current.length !== count) {
    refCbs.current = Array.from({ length: count }, (_, i) => (el) => { els.current[i] = el; });
  }

  const shadowRefCbs = useRef(null);
  if (!shadowRefCbs.current || shadowRefCbs.current.length !== count) {
    shadowRefCbs.current = Array.from({ length: count }, (_, i) => (el) => { shadowEls.current[i] = el; });
  }

  const lane = useCallback((b, x) => (topEdge(x) + botEdge(x)) / 2 + b.laneOff, [topEdge, botEdge]);

  const bodies = useRef(null);
  if (!bodies.current || bodies.current.length !== count) {
    bodies.current = Array.from({ length: count }, (_, i) => {
      const x = -wrap + ((i + 0.5) / count) * track;
      const span = botEdge(x) - topEdge(x) - duckR * 2;
      const b = {
        x, y: 0, vx: 0, vy: 0, tvx: 0, tvy: 0,
        r: duckR, phase: i * 2.1,
        laneOff: (i % 2 ? 1 : -1) * span * (0.14 + (i / count) * 0.16),
        weave: span * 0.14,
        laneSpeed: 0.92 + (i * 0.055),
        dragging: false, docked: false, animating: false,
        stop: null,
        // The eased wake opacity. It lives on the body rather than in the motion
        // value because the fade needs somewhere to remember itself between
        // frames, and the motion value is the thing being written TO.
        wakeO: 0,
      };
      b.y = (topEdge(x) + botEdge(x)) / 2 + b.laneOff;
      return b;
    });
  }

  /* ------------------------------------------------------------- drifters */
  // Lilypads. They ride the river exactly as the ducks do — same current, same
  // lanes, same wrap — but they are scenery: no collisions, no hitbox, no drag,
  // and they sit UNDER the ducks in the overlay. A leaf on a river does not
  // hold station, so nothing here holds them in place.
  const padMvs = useRef(null);
  if (!padMvs.current) {
    padMvs.current = Array.from({ length: PADS }, () => ({
      x: motionValue(0), y: motionValue(0), rot: motionValue(0),
    }));
  }

  const padBodies = useRef(null);
  if (!padBodies.current) {
    padBodies.current = Array.from({ length: PADS }, (_, i) => {
      const x = -wrap + ((i + 0.5) / PADS) * track + (Math.random() - 0.5) * 90;
      const span = botEdge(x) - topEdge(x);
      return {
        x,
        y: (topEdge(x) + botEdge(x)) / 2,
        // Biased outward: a pad drifting down the middle of the channel is in
        // the ducks' lane, and the app's pads sit in slack water anyway.
        laneOff: (i % 2 ? 1 : -1) * span * (0.22 + Math.random() * 0.12),
        // A shade slower than the ducks, so a duck overtakes one now and then.
        speed: 0.80 + Math.random() * 0.14,
        phase: Math.random() * 6.28,
        bob: span * 0.012,
        tilt: Math.random() * 24 - 12,
        sway: 2.4 + Math.random() * 2.6,
        k: 0.78 + Math.random() * 0.46,
        big: Math.random() < 0.42,
        flip: Math.random() < 0.5,
      };
    });
  }

  const reseedPad = useCallback((p) => {
    const span = botEdge(p.x) - topEdge(p.x);
    p.laneOff = (Math.random() < 0.5 ? 1 : -1) * span * (0.2 + Math.random() * 0.14);
    p.speed = 0.80 + Math.random() * 0.14;
    p.tilt = Math.random() * 24 - 12;
    p.y = (topEdge(p.x) + botEdge(p.x)) / 2 + p.laneOff;
  }, [topEdge, botEdge]);

  // A wrapped duck comes back as a slightly different duck: new lane, new pace.
  // Without this the four of them settle into a fixed convoy within a minute.
  const reseed = useCallback((b) => {
    const span = botEdge(b.x) - topEdge(b.x) - b.r * 2;
    b.laneOff = (Math.random() * 2 - 1) * span * 0.3;
    b.weave = span * (0.10 + Math.random() * 0.09);
    b.laneSpeed = 0.88 + Math.random() * 0.26;
    b.y = lane(b, b.x);
    b.vy = 0; b.tvy = 0;
  }, [topEdge, botEdge, lane]);

  /* ------------------------------------------------ coordinate plumbing */
  // The band bleeds past the content column while the ducks are positioned in
  // it, so band space and scene space differ by a constant offset. Measuring it
  // once means the stall can sit in the 1080px column, perfectly aligned with
  // every other `.wrap` on the page, and the ducks still land on the water.
  const originRef = useRef({ x: 0, y: 0 });

  // Band-local, for anything parented to the band itself rather than to the
  // scene — the lilypad layer sits between the water and the stone.
  const toBandX = useCallback((x) => (x - viewBox.x) * scaleRef.current, [viewBox]);
  const toBandY = useCallback((y) => (y - viewBox.y) * scaleRef.current, [viewBox]);

  const toPxX = useCallback((x) => originRef.current.x + (x - viewBox.x) * scaleRef.current, [viewBox]);
  const toPxY = useCallback((y) => originRef.current.y + (y - viewBox.y) * scaleRef.current, [viewBox]);
  const toArtX = useCallback((px) => (px - originRef.current.x) / scaleRef.current + viewBox.x, [viewBox]);
  const toArtY = useCallback((py) => (py - originRef.current.y) / scaleRef.current + viewBox.y, [viewBox]);

  // Wet/dry is read off the motion value rather than the body, so it stays
  // correct mid-drag and mid-spring, when b.x/b.y hold the start or the target
  // rather than where the duck actually is. Uses the FULL channel — the
  // waterline should survive right up to the stone, not vanish at the inset the
  // lane clamp uses.
  const syncWet = useCallback((i) => {
    const el = els.current[i], b = bodies.current[i], m = mvs.current[i];
    if (!el || !b) return;
    const x = toArtX(m.x.get()), y = toArtY(m.y.get());
    const wet = !b.docked && y >= topEdge(x) && y <= botEdge(x);
    if (b.wet === wet) return;
    b.wet = wet;
    el.toggleAttribute('data-dry', !wet);
    // The cast shadow is a sibling down in the band now rather than a group
    // inside the sprite, so the same flag has to reach it on its own element.
    // It is still the same duck leaving the same water.
    shadowEls.current[i]?.toggleAttribute('data-dry', !wet);
  }, [topEdge, botEdge, toArtX, toArtY]);

  /* ------------------------------------------------------------ physics */
  const clampToChannel = useCallback((b) => {
    const lo = topEdge(b.x) + b.r, hi = botEdge(b.x) - b.r;
    b.y = lo > hi ? (lo + hi) / 2 : clamp(lo, b.y, hi);
  }, [topEdge, botEdge]);

  // The banks are horizontal, so the normal is (0, ±1) and the reflection is a
  // sign flip rather than the pond's ellipse-gradient projection.
  const bankBounce = useCallback((b) => {
    const lo = topEdge(b.x) + b.r, hi = botEdge(b.x) - b.r;
    if (lo > hi) { b.y = (lo + hi) / 2; return; }
    if (b.y < lo) {
      b.y = lo;
      if (b.vy < 0) b.vy = -b.vy;
      if (b.tvy < 0) b.tvy = -b.tvy;
    } else if (b.y > hi) {
      b.y = hi;
      if (b.vy > 0) b.vy = -b.vy;
      if (b.tvy > 0) b.tvy = -b.tvy;
    }
  }, [topEdge, botEdge]);

  const step = useCallback((dt, t) => {
    const bs = bodies.current;
    // Under reduced motion the river does not run. Ducks hold station in their
    // lanes; everything you can do to one by hand still works.
    if (!reduce) {
      const damp = Math.exp(-DAMP * dt), ramp = 1 - Math.exp(-RAMP * dt);
      for (const b of bs) {
        if (b.dragging || b.docked || b.animating) continue;
        b.tvx *= damp; b.tvy *= damp;
        const target = lane(b, b.x) + Math.sin(t * 0.23 + b.phase) * b.weave;
        const wantX = current * b.laneSpeed + b.tvx;
        const wantY = clamp(-steerMax, (target - b.y) * 1.2, steerMax) + b.tvy;
        b.vx += (wantX - b.vx) * ramp;
        b.vy += (wantY - b.vy) * ramp;
        b.x += b.vx * dt; b.y += b.vy * dt;
        bankBounce(b);
        // Off the right edge and back in from the left. This only ever happens
        // out of frame, so no special casing is needed in render() — it writes
        // the motion value from b.x every frame anyway.
        if (b.x > artW + wrap) { b.x -= track; reseed(b); }
        else if (b.x < -wrap) { b.x += track; }
      }

      // The pads, on the same current and the same wrap. They ease toward their
      // lane rather than steering into it — nothing about a leaf is deliberate.
      const ease = Math.min(1, dt * 1.3);
      for (const p of padBodies.current) {
        p.x += current * p.speed * dt;
        p.y += ((topEdge(p.x) + botEdge(p.x)) / 2 + p.laneOff - p.y) * ease;
        if (p.x > artW + wrap) { p.x -= track; reseedPad(p); }
      }
    }

    // Pair separation, equal-mass elastic — the app's, unchanged.
    //
    // A duck you are holding has NO hitbox. Treating it as an immovable body
    // that shoves the others aside sounds right and plays horribly: you could
    // pin a duck against the bank and hold it there, grinding along the edge
    // against two constraints at once. A hand moving through water displaces
    // nothing here. Same for one springing home: it is following an animation,
    // not swimming.
    for (let i = 0; i < bs.length; i++) {
      const a = bs[i];
      if (a.docked || a.dragging || a.animating) continue;
      for (let j = i + 1; j < bs.length; j++) {
        const c = bs[j];
        if (c.docked || c.dragging || c.animating) continue;
        const dx = c.x - a.x, dy = c.y - a.y, dist = hyp(dx, dy), minD = a.r + c.r;
        if (dist <= 0 || dist >= minD) continue;
        const nx = dx / dist, ny = dy / dist, half = (minD - dist) / 2;
        a.x -= nx * half; a.y -= ny * half; c.x += nx * half; c.y += ny * half;
        const dv = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
        a.vx += dv * nx; a.vy += dv * ny; c.vx -= dv * nx; c.vy -= dv * ny;
        const dtt = (c.tvx - a.tvx) * nx + (c.tvy - a.tvy) * ny;
        a.tvx += dtt * nx; a.tvy += dtt * ny; c.tvx -= dtt * nx; c.tvy -= dtt * ny;
      }
    }

    for (const b of bs) {
      if (b.dragging || b.docked) continue;
      const s = hyp(b.vx, b.vy);
      if (s > cap) { const f = cap / s; b.vx *= f; b.vy *= f; }
    }
  }, [reduce, cap, current, steerMax, artW, wrap, track, lane, bankBounce, reseed,
    reseedPad, topEdge, botEdge]);

  /* ------------------------------------------------------------- render */
  // `dt` is here for the wake fade alone — everything else render() writes is a
  // pure function of the clock. It is the loop's own clamped delta, so a tab
  // that comes back after a minute resumes the fade instead of finishing it.
  //
  // It DEFAULTS TO ZERO because the one-shot paint after a resize passes no
  // delta: no time has passed there, so the fade must not advance. Letting it
  // arrive undefined would put NaN through the exponential and into the bound
  // opacity, which blanks every wake on the page until the next real frame.
  const render = useCallback((t, dt = 0) => {
    const bs = bodies.current, ms = mvs.current;
    // The beam moves without resizing whenever the card's height animates, and a
    // ResizeObserver cannot see that. While anything is perched, read it fresh
    // each frame — two rects, and only for as long as a duck is up there.
    if (perchProbe.current && bs.some((b) => b.docked)) perchProbe.current();
    for (let i = 0; i < bs.length; i++) {
      const b = bs[i], m = ms[i];
      if (b.docked && perchPx.current) {
        const p = perchPx.current;
        m.x.set(p.x + m.dx.get());
        m.y.set(p.y + m.dy.get());
      } else if (!b.dragging && !b.docked && !b.animating) {
        const dx = reduce ? 0 : Math.sin(t * 0.9 + b.phase) * idleX;
        const dy = reduce ? 0 : Math.sin(t * 0.7 + b.phase * 1.7) * idleY;
        m.x.set(toPxX(b.x + dx));
        m.y.set(toPxY(b.y + dy));
      }
      // Band-local position, DERIVED from the duck's rendered position rather
      // than recomputed from b.x/b.y — and derived every frame, in every state.
      //
      // It used to be written only in the drifting branch, which left it stale
      // whenever the duck was being dragged, docked or sprung home. That was
      // survivable while the wake was the only thing parented to it, because a
      // wake fades out in all three of those states anyway. The cast shadow does
      // not: drag a duck across open water and it stays wet, so a frozen wx/wy
      // would strand its shadow where the duck used to be.
      //
      // toBandX(v) is exactly toPxX(v) minus the band origin, so this is the
      // same number the old call produced, for the price of a subtraction — and
      // it is right during a spring, where b.x still holds the target.
      m.wx.set(m.x.get() - originRef.current.x);
      m.wy.set(m.y.get() - originRef.current.y);
      syncWet(i);
      // Reduced motion is the ONE case that may still cut. The loop shuts down
      // as soon as the last spring settles under `reduce`, so there would be no
      // frames left to fade in — and a fade is motion, which is the thing being
      // asked for less of. The CSS zeroes .dd-wk there anyway.
      if (reduce) { b.wakeO = 0; m.wake.set(0); continue; }

      // Speed sets the wake the duck WANTS; the opacity chases it. A wake
      // belongs to a duck that is swimming, so the three states that are not
      // swimming ask for nothing and the chase carries them down.
      //
      // This is the fix: every way a wake can end — docked on the rail, picked
      // up, springing home, or just slowing to the current — arrives here as the
      // target falling to zero, so all of them dissolve over the same half
      // second. Before, three of those wrote 0 into the bound opacity directly
      // and the arcs went out like a switch while their own keyframes were still
      // mid-fade.
      const swimming = !b.docked && !b.dragging && !b.animating;
      const sp = hyp(b.vx, b.vy);
      const o = swimming
        ? clamp(0, (sp - waveLo) / (waveHi - waveLo), 1) * WAVE_MAX
        : 0;
      // Steer only while there is a heading worth reading. atan2(0,0) is 0°, so
      // a wake that kept steering as it died would swing round to face east on
      // its way out; frozen at its last heading, it just fades where it lies.
      if (o > 0.005) m.rot.set((Math.atan2(b.vy, b.vx) * 180) / Math.PI);
      b.wakeO += (o - b.wakeO) * (1 - Math.exp(-(o > b.wakeO ? WAKE_IN : WAKE_OUT) * dt));
      m.wake.set(b.wakeO < 0.0006 ? 0 : b.wakeO);   // a wake is a hint, not a splash
    }

    const ps = padBodies.current, pm = padMvs.current;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i], m = pm[i];
      m.x.set(toBandX(p.x));
      m.y.set(toBandY(p.y + (reduce ? 0 : Math.sin(t * 0.55 + p.phase) * p.bob)));
      m.rot.set(p.tilt + (reduce ? 0 : Math.sin(t * 0.31 + p.phase * 1.4) * p.sway));
    }
  }, [reduce, idleX, idleY, toPxX, toPxY, toBandX, toBandY, waveLo, waveHi, syncWet]);

  /* ---------------------------------------------------------- the loop */
  const loopState = useRef({ running: false, lastT: null, onScreen: false });

  // "Busy" is an interaction in flight, NOT motion: with a current, something
  // is always moving, so the IntersectionObserver has to be the real off-switch
  // or the river would burn frames at the bottom of the page forever.
  const busy = useCallback(
    () => bodies.current.some((b) => b.dragging || b.animating),
    []
  );

  const ensureRunning = useCallback(() => {
    const L = loopState.current;
    if (L.dead || L.running || document.hidden) return;
    if (!L.onScreen && !busy()) return;
    L.running = true; L.lastT = null;
    requestAnimationFrame(function loop() {
      const S = loopState.current;
      // `dead` is the unmount latch. Without it, crossing the phone breakpoint
      // remounts the scene and leaves the old loop running forever, writing
      // frames into motion values nothing is bound to any more.
      if (S.dead || (!S.onScreen && !busy()) || document.hidden) { S.running = false; S.lastT = null; return; }
      const t = performance.now() / 1000;
      const dt = S.lastT == null ? 0 : Math.min(0.05, t - S.lastT);
      S.lastT = t;
      if (dt > 0) step(dt, t);
      render(t, dt);
      // Under reduced motion nothing drifts and there is no bob, so once the
      // last spring settles there is nothing left to draw.
      if (!reduce || busy()) requestAnimationFrame(loop);
      else { S.running = false; S.lastT = null; }
    });
  }, [busy, step, render, reduce]);

  /* -------------------------------------------------------- size + gate */
  const builtW = useRef(artW);

  useEffect(() => {
    const band = bandRef.current, host = sceneRef.current;
    if (!band || !host) return undefined;
    loopState.current.dead = false;

    // A rebuild at a new width lays out a new art space. Carry the ducks across
    // proportionally rather than letting them snap to the old coordinates.
    if (builtW.current !== artW) {
      const f = artW / builtW.current;
      for (const b of bodies.current) { b.x *= f; b.r = duckR; }
      for (const p of padBodies.current) p.x *= f;
      builtW.current = artW;
    }

    const measure = () => {
      const w = band.clientWidth;
      if (!w) return;
      scaleRef.current = w / viewBox.w;

      // The stall is HTML, so the drop zone and the perch are read off the page
      // and expressed in the same scene-local pixels the ducks live in.
      const hr = host.getBoundingClientRect();
      const br = band.getBoundingClientRect();
      originRef.current = { x: br.left - hr.left, y: br.top - hr.top };

      // The duck's drawn size is exact px off the same scale, handed to CSS —
      // percentages would resolve against the overlay's width rather than the
      // band's, and the two are not the same box.
      const px = scaleRef.current;
      // The stall reads its overlap off this, so it tucks the same distance
      // into the near bank whatever the band's height works out to be.
      host.style.setProperty('--band-h', `${br.height.toFixed(2)}px`);
      host.style.setProperty('--duck-w', `${(spriteW * px).toFixed(2)}px`);
      host.style.setProperty('--duck-mt', `${(16.5 * duckScale * px).toFixed(2)}px`);
      host.style.setProperty('--wake-w', `${(48 * duckScale * px).toFixed(2)}px`);
      host.style.setProperty('--pad-w', `${(padW * px).toFixed(2)}px`);

      readTargets(hr);

      const bs = bodies.current, ms = mvs.current;
      for (let i = 0; i < bs.length; i++) {
        const b = bs[i];
        if (b.dragging || b.animating || b.docked) continue;
        ms[i].x.set(toPxX(b.x));
        ms[i].y.set(toPxY(b.y));
      }
    };

    // Just the two rects, no style writes and no body loop — cheap enough to
    // run every frame while a duck is perched.
    const readTargets = (hostRect) => {
      const hr = hostRect || host.getBoundingClientRect();
      const dr = dropRef?.current?.getBoundingClientRect();
      const pr = perchRef?.current?.getBoundingClientRect();
      // The posts carry on below the beam and down into the bank, and that
      // overhang must NOT be a landing zone — it hangs over the water, where a
      // duck released near the top of the channel would be inside it.
      const dropBottom = pr ? Math.min(dr ? dr.bottom : pr.bottom, pr.bottom + 8) : dr?.bottom;
      dropPx.current = dr
        ? { x: dr.left - hr.left, y: dr.top - hr.top, w: dr.width, h: dropBottom - dr.top }
        : null;
      // A phone stacks the card, so its buttons are centred directly above the
      // beam and a duck perched mid-beam sits on top of "put it back in the
      // river". It perches near the left end there instead.
      const perchAt = layout === 'phone' ? 0.22 : 0.5;
      perchPx.current = pr
        ? {
          x: pr.left - hr.left + pr.width * perchAt,
          // Astride the rail rather than clear above it — a few units of
          // overlap, the way the duck sat on the old board's roof.
          y: pr.top - hr.top - 33 * duckScale * scaleRef.current * 0.28,
        }
        : null;
    };
    perchProbe.current = () => readTargets(null);
    measure();
    render(0);

    const ro = new ResizeObserver(measure);
    ro.observe(band);
    ro.observe(host);
    // The stall's own box: swapping a project in changes the card's height, and
    // on a stacked phone layout that moves the beam by a couple of hundred
    // pixels. Without watching it directly the perched duck is left floating
    // wherever the beam used to be — which is what it was doing, in the middle
    // of the card.
    if (dropRef?.current) ro.observe(dropRef.current);
    if (perchRef?.current) ro.observe(perchRef.current);

    const io = new IntersectionObserver((entries) => {
      loopState.current.onScreen = entries[0].isIntersecting;
      ensureRunning();
    }, { threshold: 0.02 });
    io.observe(band);
    const r = band.getBoundingClientRect();
    loopState.current.onScreen = r.top < window.innerHeight && r.bottom > 0;
    ensureRunning();

    const onVis = () => { if (!document.hidden) ensureRunning(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      ro.disconnect(); io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      loopState.current.onScreen = false;
      loopState.current.dead = true;
      perchProbe.current = null;
      for (const b of bodies.current) b.stop?.();
    };
  }, [artW, duckR, duckScale, spriteW, padW, viewBox, layout, dropRef, perchRef, toPxX, toPxY, render, ensureRunning]);

  /* --------------------------------------------------------- movement */
  const springToPx = useCallback((i, px, py, done) => {
    const b = bodies.current[i], m = mvs.current[i];
    b.stop?.();
    b.animating = true;
    b.vx = b.vy = b.tvx = b.tvy = 0;
    const a1 = animate(m.x, px, SPRING);
    const a2 = animate(m.y, py, SPRING);
    b.stop = () => { a1.stop(); a2.stop(); };
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      b.animating = false; b.stop = null;
      b.x = toArtX(px); b.y = toArtY(py);
      syncWet(i);          // a duck that just landed back in the river is wet again
      done?.();
      ensureRunning();
    };
    Promise.all([a1.finished, a2.finished]).then(finish).catch(() => { b.animating = false; });
    ensureRunning();
  }, [toArtX, toArtY, ensureRunning, syncWet]);

  const springTo = useCallback(
    (i, ax, ay, done) => springToPx(i, toPxX(ax), toPxY(ay), done),
    [springToPx, toPxX, toPxY]
  );

  const ripple = useCallback((ax, ay) => {
    if (reduce) return;
    const host = rippleRef.current;
    if (!host) return;
    // The app's water answers a beat late — three rings, 0.18s apart, 1.7s each.
    for (let n = 0; n < 3; n++) {
      const e = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      e.setAttribute('cx', ax); e.setAttribute('cy', ay);
      e.setAttribute('rx', '5'); e.setAttribute('ry', String(5 * 0.36));
      e.setAttribute('fill', 'none');
      e.setAttribute('stroke', '#D2DCDB');
      e.setAttribute('stroke-width', '1.4');
      e.setAttribute('class', 'dd-ripple');
      e.style.animationDelay = `${n * 0.18}s`;
      host.appendChild(e);
      setTimeout(() => e.remove(), 1900 + n * 180);
    }
  }, [reduce]);

  // Back into the water directly above the beam, rather than to a home slot:
  // you put it back where you took it from, and the river carries it off.
  const homeFor = useCallback((b) => {
    const px = perchPx.current;
    const x = px ? clamp(0, toArtX(px.x), artW) : b.x;
    return { x, y: (topEdge(x) + botEdge(x)) / 2 + b.laneOff * 0.5 };
  }, [toArtX, artW, topEdge, botEdge]);

  const undock = useCallback((i) => {
    const b = bodies.current[i];
    if (!b?.docked) return;
    b.docked = false;
    b.stop?.(); b.stop = null;
    mvs.current[i].dx.set(0); mvs.current[i].dy.set(0);
    setDocked((d) => (d === i ? -1 : d));
    syncWet(i);
    const h = homeFor(b);
    springTo(i, h.x, h.y, () => { b.tvx = 0; b.tvy = 0; });
  }, [springTo, syncWet, homeFor]);

  // The dock flight, as an offset that decays to nothing. render() then places
  // the duck at perch + offset every frame, so wherever the beam has got to by
  // the time the spring lands, the duck is already sitting on it.
  const dockSpring = useCallback((i) => {
    const b = bodies.current[i], m = mvs.current[i];
    const p = perchPx.current;
    if (!p) return;
    b.stop?.();
    b.animating = true;
    b.vx = b.vy = b.tvx = b.tvy = 0;
    m.dx.set(m.x.get() - p.x);
    m.dy.set(m.y.get() - p.y);
    if (reduce) { m.dx.set(0); m.dy.set(0); b.animating = false; b.stop = null; return; }
    const a1 = animate(m.dx, 0, SPRING);
    const a2 = animate(m.dy, 0, SPRING);
    b.stop = () => { a1.stop(); a2.stop(); };
    const finish = () => { b.animating = false; b.stop = null; m.dx.set(0); m.dy.set(0); };
    Promise.all([a1.finished, a2.finished]).then(finish).catch(() => { b.animating = false; });
  }, [reduce]);

  const dock = useCallback((i) => {
    const bs = bodies.current;
    bs.forEach((b, j) => {
      if (j !== i && b.docked) {
        b.docked = false;
        b.stop?.(); b.stop = null;
        mvs.current[j].dx.set(0); mvs.current[j].dy.set(0);
        const h = homeFor(b);
        springTo(j, h.x, h.y);
      }
    });
    const b = bs[i];
    // A splash where it left the water, not where it landed.
    if (!b.docked) {
      const x = clamp(0, b.x, artW);
      ripple(x, clamp(topEdge(x), b.y, botEdge(x)));
    }
    b.docked = true;
    b.vx = b.vy = b.tvx = b.tvy = 0;
    // The wake is NOT zeroed here. `docked` already drops its target to zero and
    // render() carries it down over half a second, so the arcs dissolve behind
    // the duck as it lifts out of the water rather than blinking off with it.
    setDocked(i);
    setLandTick((n) => n + 1);
    syncWet(i);
    dockSpring(i);
  }, [springTo, dockSpring, syncWet, homeFor, ripple, artW, topEdge, botEdge]);

  /* ------------------------------------------------------ pointer drag */
  const overDrop = useCallback((px, py) => {
    const d = dropPx.current;
    return !!d && px > d.x && px < d.x + d.w && py > d.y && py < d.y + d.h;
  }, []);

  const bind = useCallback((i) => ({
    onPointerDown(e) {
      if (e.button != null && e.button !== 0 && e.pointerType === 'mouse') return;
      const el = sceneRef.current;
      if (!el) return;
      const b = bodies.current[i], m = mvs.current[i];
      b.stop?.(); b.stop = null;
      b.animating = false;
      b.dragging = true;
      b.vx = b.vy = b.tvx = b.tvy = 0;
      // Same as dock(): `dragging` drops the target, render() does the fade. The
      // wake you made a moment ago washes out under your finger instead of
      // vanishing the instant you touch the duck.

      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left, py = e.clientY - rect.top;
      // grab offset — the duck must not jump to sit under the cursor
      b.grabDX = m.x.get() - px;
      b.grabDY = m.y.get() - py;
      b.sx = e.clientX; b.sy = e.clientY; b.st = performance.now();
      b.moved = 0;
      b.lpx = px; b.lpy = py; b.lpt = b.st;
      b.pvx = 0; b.pvy = 0;
      b.wasDocked = b.docked;

      // Throws NotFoundError if the pointer isn't active (synthetic events, some
      // stylus drivers). Losing capture is survivable; losing the rest of this
      // handler is not.
      try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* no capture */ }
      e.preventDefault();
      animate(m.scale, 1.14, POP);
      setDrag({ i, over: false });
      ensureRunning();
    },

    onPointerMove(e) {
      const b = bodies.current[i];
      if (!b.dragging) return;
      const el = sceneRef.current;
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left, py = e.clientY - rect.top;
      b.moved = Math.max(b.moved, hyp(e.clientX - b.sx, e.clientY - b.sy));

      // Dragging a docked duck off its perch closes the stall.
      if (b.docked && b.moved > TAP_SLOP) {
        b.docked = false;
        setDocked((d) => (d === i ? -1 : d));
      }

      const m = mvs.current[i];
      const nx = clamp(0, px + b.grabDX, rect.width);
      const ny = clamp(0, py + b.grabDY, rect.height);
      m.x.set(nx); m.y.set(ny);
      b.x = toArtX(nx); b.y = toArtY(ny);
      syncWet(i);

      const over = overDrop(nx, ny);
      if (over !== dragRef.current.over) setDrag({ i, over });

      const now = performance.now(), dt = (now - b.lpt) / 1000;
      if (dt > 0.004) {
        b.pvx = 0.55 * b.pvx + 0.45 * ((px - b.lpx) / dt);
        b.pvy = 0.55 * b.pvy + 0.45 * ((py - b.lpy) / dt);
        b.lpx = px; b.lpy = py; b.lpt = now;
      }
    },

    onPointerUp(e) {
      const b = bodies.current[i], m = mvs.current[i];
      if (!b.dragging) return;
      b.dragging = false;
      setDrag({ i: -1, over: false });
      animate(m.scale, 1, POP);
      try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch { /* already released */ }

      const tap = b.moved < TAP_SLOP && performance.now() - b.st < TAP_TIME;
      if (tap) {
        if (b.wasDocked) undock(i); else dock(i);
        return;
      }

      // Dropped on the stall? The whole card is the target, not just the beam —
      // a drop this deliberate shouldn't be judged on a few pixels.
      if (overDrop(m.x.get(), m.y.get())) { dock(i); return; }

      // Otherwise: back to the water. The app's rule is that a gesture sets a
      // DIRECTION, not a speed — so the release takes its heading from the
      // pointer and always the same calm drift. Handing the raw fling velocity
      // through instead is what made the old pond feel skittish.
      const sp0 = hyp(b.pvx, b.pvy);
      let vx = 0, vy = 0;
      if (sp0 > 0) { vx = (drift * b.pvx) / sp0; vy = (drift * b.pvy) / sp0; }

      const lo = topEdge(b.x) + b.r, hi = botEdge(b.x) - b.r;
      const inside = b.y >= lo && b.y <= hi;

      if (inside && !reduce) {
        b.tvx = vx; b.tvy = vy;
        ensureRunning();
      } else {
        const t = { x: b.x, y: b.y, r: b.r };
        clampToChannel(t);
        ripple(t.x, t.y + b.r * 0.5);
        springTo(i, t.x, t.y, () => {
          if (!reduce) { b.tvx = vx * 0.35; b.tvy = vy * 0.35; }
        });
      }
    },

    onPointerCancel(e) {
      const b = bodies.current[i], m = mvs.current[i];
      if (!b.dragging) return;
      b.dragging = false;
      setDrag({ i: -1, over: false });
      animate(m.scale, 1, POP);
      try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch { /* already released */ }
      const t = { x: b.x, y: b.y, r: b.r };
      clampToChannel(t);
      springTo(i, t.x, t.y);
    },

    onKeyDown(e) {
      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
      e.preventDefault();
      const b = bodies.current[i];
      if (b.docked) undock(i); else dock(i);
    },
  }), [drift, reduce, topEdge, botEdge, clampToChannel, overDrop, dock, undock, ripple,
    springTo, ensureRunning, toArtX, toArtY, syncWet]);

  return {
    sceneRef, bandRef, rippleRef,
    mvs: mvs.current, refs: refCbs.current, shadowRefs: shadowRefCbs.current, bodies,
    pads: padBodies.current, padMvs: padMvs.current,
    bind, docked, dock, undock,
    drag, landTick,
    onScreen: loopState,
  };
}
