/* usePond.js — the water.
 *
 * The motion model is SpaPhysics.swift, ported through dillydallywebsite/main.js
 * and kept honest: exponential damping toward a decaying drift target, elliptical
 * bank reflection using the ellipse gradient, equal-mass pair collisions, a hard
 * speed cap, and an idle bob that is render-only and never fed back into the
 * simulation.
 *
 * One thing is deliberately NOT the app's. SpaPhysics.swift opens with "a swipe
 * sets only a DIRECTION … there is NO drag-to-move — the pad never follows the
 * finger." Here the duck must follow the finger, because dropping a duck on the
 * board is the whole interaction. So drag is hand-rolled on pointer events
 * rather than handed to Motion's `drag`: Motion recomputes a dragged element's
 * position from origin+delta every frame, which fights any position we write
 * back for our own clamping. Owning the pointer outright means the physics loop
 * and the drag write to the same motion values without arguing. Motion still
 * does what it is best at — the springs.
 *
 * Speeds scale with pond size (k = rx / 134, the app's own pond) so the wide
 * laptop pond and the phone pond feel the same rather than the big one feeling
 * sluggish.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { animate, motionValue, spring } from 'motion/react';

const DAMP = 1.6;      // e^(-DAMP·dt) — drift decay
const RAMP = 7;        // 1-e^(-RAMP·dt) — how fast velocity chases the target
const STOP = 3;        // below this, snap to rest
const DRIFT = 70;      // units/s a release can impart
const CAP = 80;        // hard speed cap
const WAVE_LO = 10;
const WAVE_HI = 50;
const WAVE_MAX = 0.16;
const TAP_SLOP = 8;    // px — under this, a press is a tap, not a drag
const TAP_TIME = 600;  // ms

const SPRING = { type: spring, visualDuration: 0.45, bounce: 0.28 };
const POP = { type: spring, visualDuration: 0.22, bounce: 0.4 };

const hyp = Math.hypot;

export function usePond({ scene, count, reduce }) {
  const { pond, duckR, homes, viewBox, board } = scene;

  const sceneRef = useRef(null);
  const rippleRef = useRef(null);
  const els = useRef([]);              // duck elements, for imperative state
  const scaleRef = useRef(1);          // px per scene unit
  const [docked, setDocked] = useState(-1);

  // Everything distance-shaped scales with the pond (k = 1 at the app's own
  // rx 134), so a wide laptop pond behaves like the app's rather than feeling
  // sluggish — the RATIOS stay the app's, only the units grow. The idle bob is
  // the app's 2 / 1.4 at k = 1, which is what makes the float read right.
  const k = pond.rx / 134;
  const drift = DRIFT * k, cap = CAP * k, stop = STOP * k;
  const waveLo = WAVE_LO * k, waveHi = WAVE_HI * k;
  const idleX = 2 * k, idleY = 1.4 * k;

  // Motion values live for the life of the hook; the layout swap remounts.
  const mvs = useRef(null);
  if (!mvs.current || mvs.current.length !== count) {
    mvs.current = Array.from({ length: count }, () => ({
      x: motionValue(0), y: motionValue(0),
      scale: motionValue(1), wake: motionValue(0), rot: motionValue(0),
    }));
  }

  const refCbs = useRef(null);
  if (!refCbs.current || refCbs.current.length !== count) {
    refCbs.current = Array.from({ length: count }, (_, i) => (el) => { els.current[i] = el; });
  }

  const bodies = useRef(null);
  if (!bodies.current || bodies.current.length !== count) {
    bodies.current = Array.from({ length: count }, (_, i) => {
      const h = homes[i % homes.length];
      return {
        x: h.x, y: h.y, vx: 0, vy: 0, tvx: 0, tvy: 0,
        r: duckR, phase: i * 2.1, home: { x: h.x, y: h.y },
        dragging: false, docked: false, animating: false,
        stop: null,
      };
    });
  }

  /* ------------------------------------------------ coordinate plumbing */
  const toPxX = useCallback((x) => (x - viewBox.x) * scaleRef.current, [viewBox]);
  const toPxY = useCallback((y) => (y - viewBox.y) * scaleRef.current, [viewBox]);
  const toArtX = useCallback((px) => px / scaleRef.current + viewBox.x, [viewBox]);
  const toArtY = useCallback((py) => py / scaleRef.current + viewBox.y, [viewBox]);

  // Wet/dry is read off the motion value rather than the body, so it stays
  // correct mid-drag and mid-spring, when b.x/b.y hold the start or the target
  // rather than where the duck actually is. Uses the FULL pond ellipse — the
  // waterline should survive right up to the bank, not vanish at the inset the
  // collision clamp uses.
  const syncWet = useCallback((i) => {
    const el = els.current[i], b = bodies.current[i], m = mvs.current[i];
    if (!el || !b) return;
    const x = toArtX(m.x.get()), y = toArtY(m.y.get());
    const nx = (x - pond.cx) / pond.rx, ny = (y - pond.cy) / pond.ry;
    const wet = !b.docked && nx * nx + ny * ny <= 1;
    if (b.wet === wet) return;
    b.wet = wet;
    el.toggleAttribute('data-dry', !wet);
  }, [pond, toArtX, toArtY]);

  /* ------------------------------------------------------------ physics */
  const clampToPond = useCallback((b) => {
    const ax = pond.rx - b.r, ay = pond.ry - b.r;
    const nx = (b.x - pond.cx) / ax, ny = (b.y - pond.cy) / ay;
    const d2 = nx * nx + ny * ny;
    if (d2 > 1) {
      const f = 1 / Math.sqrt(d2);
      b.x = pond.cx + (b.x - pond.cx) * f;
      b.y = pond.cy + (b.y - pond.cy) * f;
    }
  }, [pond]);

  const wallBounce = useCallback((b) => {
    const ax = pond.rx - b.r, ay = pond.ry - b.r;
    const nx = (b.x - pond.cx) / ax, ny = (b.y - pond.cy) / ay;
    if (nx * nx + ny * ny <= 1) return;
    // reflect about the ellipse gradient, then sit back on the wall
    let gx = (b.x - pond.cx) / (ax * ax), gy = (b.y - pond.cy) / (ay * ay);
    const gl = hyp(gx, gy) || 1; gx /= gl; gy /= gl;
    const vn = b.vx * gx + b.vy * gy;
    if (vn > 0) { b.vx -= 2 * vn * gx; b.vy -= 2 * vn * gy; }
    const tn = b.tvx * gx + b.tvy * gy;
    if (tn > 0) { b.tvx -= 2 * tn * gx; b.tvy -= 2 * tn * gy; }
    clampToPond(b);
  }, [pond, clampToPond]);

  const step = useCallback((dt) => {
    const bs = bodies.current;
    const damp = Math.exp(-DAMP * dt), ramp = 1 - Math.exp(-RAMP * dt);
    for (const b of bs) {
      if (b.dragging || b.docked || b.animating) continue;
      b.tvx *= damp; b.tvy *= damp;
      b.vx += (b.tvx - b.vx) * ramp; b.vy += (b.tvy - b.vy) * ramp;
      if (hyp(b.vx, b.vy) < stop && hyp(b.tvx, b.tvy) < stop) { b.vx = b.vy = b.tvx = b.tvy = 0; }
      b.x += b.vx * dt; b.y += b.vy * dt;
      wallBounce(b);
    }
    // Pair separation, equal-mass elastic — the app's, unchanged.
    //
    // A duck you are holding has NO hitbox. It was previously treated as an
    // immovable body that shoved the others aside, which sounds right and plays
    // horribly: you could pin a duck against the bank and hold it there, and
    // since the bank also clamps, the pinned duck would grind along the edge
    // fighting two constraints at once. A hand moving through water displaces
    // nothing here — the held duck passes over the others and they carry on.
    // Same for one springing home: it is following an animation, not swimming.
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
  }, [stop, cap, wallBounce]);

  /* ------------------------------------------------------------- render */
  const render = useCallback((t) => {
    const bs = bodies.current, ms = mvs.current;
    for (let i = 0; i < bs.length; i++) {
      const b = bs[i], m = ms[i];
      if (!b.dragging && !b.docked && !b.animating) {
        const dx = reduce ? 0 : Math.sin(t * 0.9 + b.phase) * idleX;
        const dy = reduce ? 0 : Math.sin(t * 0.7 + b.phase * 1.7) * idleY;
        m.x.set(toPxX(b.x + dx));
        m.y.set(toPxY(b.y + dy));
      }
      syncWet(i);
      if (b.docked || reduce) { m.wake.set(0); continue; }
      const sp = hyp(b.vx, b.vy);
      const o = Math.max(0, Math.min(1, (sp - waveLo) / (waveHi - waveLo))) * WAVE_MAX;
      if (o > 0.005) {
        m.rot.set((Math.atan2(b.vy, b.vx) * 180) / Math.PI);
        m.wake.set(o);       // the app's ceiling, unmodified — a wake is a hint, not a splash
      } else m.wake.set(0);
    }
  }, [reduce, idleX, idleY, toPxX, toPxY, waveLo, waveHi, syncWet]);

  /* ---------------------------------------------------------- the loop */
  const loopState = useRef({ running: false, lastT: null, onScreen: false });

  const anyMoving = useCallback(
    () => bodies.current.some((b) => b.vx || b.vy || b.tvx || b.tvy || b.dragging || b.animating),
    []
  );

  const ensureRunning = useCallback(() => {
    const L = loopState.current;
    if (L.running || document.hidden) return;
    if (!L.onScreen && !anyMoving()) return;
    L.running = true; L.lastT = null;
    requestAnimationFrame(function loop() {
      const S = loopState.current;
      if ((!S.onScreen && !anyMoving()) || document.hidden) { S.running = false; S.lastT = null; return; }
      const t = performance.now() / 1000;
      const dt = S.lastT == null ? 0 : Math.min(0.05, t - S.lastT);
      S.lastT = t;
      if (dt > 0) step(dt);
      render(t);
      // Under reduced motion there is no idle bob, so once the water settles
      // there is nothing left to draw — stop rather than burn a frame forever.
      if (!reduce || anyMoving()) requestAnimationFrame(loop);
      else { S.running = false; S.lastT = null; }
    });
  }, [anyMoving, step, render, reduce]);

  /* -------------------------------------------------------- size + gate */
  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (!w) return;
      scaleRef.current = w / viewBox.w;
      // Re-place everything that isn't being simulated this instant.
      const bs = bodies.current, ms = mvs.current;
      for (let i = 0; i < bs.length; i++) {
        const b = bs[i];
        if (b.dragging || b.animating) continue;
        const target = b.docked ? board.perch : b;
        ms[i].x.set(toPxX(target.x));
        ms[i].y.set(toPxY(target.y));
      }
    };
    measure();
    render(0);
    const ro = new ResizeObserver(measure);
    ro.observe(el);

    const io = new IntersectionObserver((entries) => {
      loopState.current.onScreen = entries[0].isIntersecting;
      ensureRunning();
    }, { threshold: 0.04 });
    io.observe(el);
    // Seed from the viewport so the pond can start before the observer fires.
    const r = el.getBoundingClientRect();
    loopState.current.onScreen = r.top < window.innerHeight && r.bottom > 0;
    ensureRunning();

    const onVis = () => { if (!document.hidden) ensureRunning(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', onVis); };
  }, [viewBox, board, toPxX, toPxY, render, ensureRunning]);

  /* --------------------------------------------------------- movement */
  const springTo = useCallback((i, ax, ay, done) => {
    const b = bodies.current[i], m = mvs.current[i];
    b.stop?.();
    b.animating = true;
    b.vx = b.vy = b.tvx = b.tvy = 0;
    const a1 = animate(m.x, toPxX(ax), SPRING);
    const a2 = animate(m.y, toPxY(ay), SPRING);
    b.stop = () => { a1.stop(); a2.stop(); };
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      b.animating = false; b.stop = null;
      b.x = ax; b.y = ay;
      syncWet(i);          // a duck that just landed back in the pond is wet again
      done?.();
      ensureRunning();
    };
    Promise.all([a1.finished, a2.finished]).then(finish).catch(() => { b.animating = false; });
    ensureRunning();
  }, [toPxX, toPxY, ensureRunning, syncWet]);

  const undock = useCallback((i) => {
    const b = bodies.current[i];
    if (!b?.docked) return;
    b.docked = false;
    setDocked((d) => (d === i ? -1 : d));
    syncWet(i);
    springTo(i, b.home.x, b.home.y);
  }, [springTo, syncWet]);

  const dock = useCallback((i) => {
    const bs = bodies.current;
    bs.forEach((b, j) => {
      if (j !== i && b.docked) { b.docked = false; springTo(j, b.home.x, b.home.y); }
    });
    const b = bs[i];
    b.docked = true;
    b.vx = b.vy = b.tvx = b.tvy = 0;
    mvs.current[i].wake.set(0);
    setDocked(i);
    syncWet(i);
    springTo(i, board.perch.x, board.perch.y);
  }, [board, springTo, syncWet]);

  /* --------------------------------------------------- ripples on tap */
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

  /* ------------------------------------------------------ pointer drag */
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
      m.wake.set(0);

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
      ensureRunning();
    },

    onPointerMove(e) {
      const b = bodies.current[i];
      if (!b.dragging) return;
      const el = sceneRef.current;
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left, py = e.clientY - rect.top;
      b.moved = Math.max(b.moved, hyp(e.clientX - b.sx, e.clientY - b.sy));

      // Dragging a docked duck off its perch closes the station.
      if (b.docked && b.moved > TAP_SLOP) {
        b.docked = false;
        setDocked((d) => (d === i ? -1 : d));
      }

      const m = mvs.current[i];
      const nx = Math.max(0, Math.min(rect.width, px + b.grabDX));
      const ny = Math.max(0, Math.min(rect.height, py + b.grabDY));
      m.x.set(nx); m.y.set(ny);
      b.x = toArtX(nx); b.y = toArtY(ny);
      syncWet(i);

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
      animate(m.scale, 1, POP);
      try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch { /* already released */ }

      const tap = b.moved < TAP_SLOP && performance.now() - b.st < TAP_TIME;

      if (tap) {
        if (b.wasDocked) { undock(i); return; }
        ripple(b.x, b.y + b.r * 0.5);
        dock(i);
        return;
      }

      // Dropped on the board? The whole board is the target, not just the perch —
      // a drop this deliberate shouldn't be judged on a few pixels.
      const d = board.drop;
      if (b.x > d.x && b.x < d.x + d.w && b.y > d.y && b.y < d.y + d.h) {
        dock(i);
        return;
      }

      // Otherwise: back to the water. The app's rule is that a gesture sets a
      // DIRECTION, not a speed — "a swipe sets only a DIRECTION" — so the
      // release takes its heading from the pointer and always the same calm
      // driftSpeed. Handing the raw fling velocity through instead is what made
      // the pond feel skittish rather than like the app's.
      const sp0 = hyp(b.pvx, b.pvy);
      let vx = 0, vy = 0;
      if (sp0 > 0) { vx = (drift * b.pvx) / sp0; vy = (drift * b.pvy) / sp0; }

      const inside = (() => {
        const ax = pond.rx - b.r, ay = pond.ry - b.r;
        const nx = (b.x - pond.cx) / ax, ny = (b.y - pond.cy) / ay;
        return nx * nx + ny * ny <= 1;
      })();

      if (inside) {
        b.tvx = vx; b.tvy = vy;
        ensureRunning();
      } else {
        const t = { x: b.x, y: b.y, r: b.r };
        clampToPond(t);
        ripple(t.x, t.y + b.r * 0.5);
        springTo(i, t.x, t.y, () => { b.tvx = vx * 0.35; b.tvy = vy * 0.35; });
      }
    },

    onPointerCancel(e) {
      const b = bodies.current[i], m = mvs.current[i];
      if (!b.dragging) return;
      b.dragging = false;
      animate(m.scale, 1, POP);
      try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch { /* already released */ }
      const t = { x: b.x, y: b.y, r: b.r };
      clampToPond(t);
      springTo(i, t.x, t.y);
    },

    onKeyDown(e) {
      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
      e.preventDefault();
      const b = bodies.current[i];
      if (b.docked) undock(i); else dock(i);
    },
  }), [board, drift, pond, clampToPond, dock, undock, ripple, springTo, ensureRunning, toArtX, toArtY, syncWet]);

  return { sceneRef, rippleRef, mvs: mvs.current, refs: refCbs.current, bind, docked, dock, undock };
}
