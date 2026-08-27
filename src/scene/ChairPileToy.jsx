/* ChairPileToy.jsx — the app, inside the board.
 *
 * Dilly&Dally has no demo reel, so its station shows the thing itself: the pile
 * tab. Three folded garments rest on the dining chair, get flung one at a time,
 * tumble under gravity, bounce off the walls, land back on the seat if they
 * happen to be over it — and once the pile has been thrown about enough, they
 * tidy themselves home and it starts again.
 *
 * Physics ported from dillydallywebsite/main.js:96-220, which is itself the
 * app's pile tab. Constants unchanged EXCEPT that everything measured in pixels
 * per frame is scaled by the stage height: the reference stage is 440px tall
 * and the board's well is roughly half that, so unscaled gravity would fling a
 * garment clean out of frame. Scaling gravity and the throw impulse by the same
 * factor keeps the trajectories identical, just smaller.
 *
 * Positions are written to the `translate` property rather than `transform`, so
 * the CSS `.settle` wobble can own `rotate` without the two fighting — that is
 * the reference's trick and the reason a landing can wobble at all.
 */

import { useEffect, useRef } from 'react';
import { chair, garment } from '../art/ddkit.js';

// App clothing colours (Theme.swift), three that stay distinct at this size.
const CLOTHES = ['#1D9E75', '#185FA5', '#EF9F27'];   // sage · navy · mustard

const GRAV = 0.48, AIR = 0.99, GBOUNCE = 0.34, WBOUNCE = 0.45;
const GFRIC = 0.82, SLEEP = 1.0, VMAX = 40;
const REF_H = 440;            // the stage the constants were tuned against

// A fixed rotation of throws rather than random ones: every cycle reads
// differently, but none is ever a dud, and none is ever a fluke that jams a
// garment into a corner.
//
// These are NOT the reference's fling velocities. Those come from a hand
// flicking across a 440px-tall stage and go up to VMAX; replayed in a well half
// that tall, every single throw hit a wall and ended up wedged in a corner, and
// one bounced off the ceiling. Simulated across both the desktop and phone well
// sizes, this set keeps every garment clear of the walls and the ceiling, drops
// about four in ten back onto the seat, and leaves the rest on the floor beside
// the chair — which is what a pile actually looks like.
const THROWS = [
  { vx: 0.6, vy: -11 }, { vx: -3.2, vy: -9.5 }, { vx: 1.4, vy: -12 },
  { vx: 3.4, vy: -9 }, { vx: -0.9, vy: -11.5 }, { vx: -2.2, vy: -10 },
];
const THROWS_PER_CYCLE = 6;
const TICK_MS = 1250;

export default function ChairPileToy({ reduce }) {
  const hostRef = useRef(null);

  useEffect(() => {
    const stage = hostRef.current;
    if (!stage) return undefined;

    stage.innerHTML =
      `<div class="dd-pile-chair">${chair('#5F4A38', '#F0997B')}</div>` +
      CLOTHES.map((c) => `<div class="dd-garment">${garment(c)}</div>`).join('');

    const chairEl = stage.querySelector('.dd-pile-chair');
    const gs = [].slice.call(stage.querySelectorAll('.dd-garment'));
    if (!chairEl || !gs.length) return undefined;

    let G = null;
    const apply = (g) => { g.style.translate = `${g._x}px ${g._y}px`; };

    function computeGeom() {
      const W = stage.clientWidth, H = stage.clientHeight;
      if (!W || !H) return false;
      const cw = chairEl.offsetWidth, chh = chairEl.offsetHeight;
      const chairBottom = parseFloat(getComputedStyle(chairEl).bottom) || 0;
      const chairLeft = (W - cw) / 2, chairTop = H - chairBottom - chh;
      G = {
        W, H,
        s: H / REF_H,                        // per-frame units scale with the stage
        seatY: chairTop + 0.545 * chh + 4,   // where a garment's bottom rests on the seat
        seatX1: chairLeft + 0.22 * cw,
        seatX2: chairLeft + 0.78 * cw,
        groundY: H - Math.max(5, H * 0.05),
        chairLeft, cw,
      };
      return true;
    }

    // Home is a small stack on the seat — that is the pile the tab is named for.
    function homeXY(g, i) {
      const gw = g.offsetWidth, gh = g.offsetHeight;
      return {
        x: G.chairLeft + G.cw * [0.47, 0.53, 0.5][i] - gw / 2,
        y: G.seatY - gh - i * gh * 0.5,
      };
    }
    const sleepAt = (g, x, y) => { g._x = x; g._y = y; g._vx = 0; g._vy = 0; g._asleep = true; apply(g); };
    const wobble = (g) => { g.classList.remove('settle'); void g.offsetWidth; g.classList.add('settle'); };

    // FIXED TIMESTEP. Every constant below is per-FRAME, tuned against 60Hz, so
    // on a 120Hz display the pile fell twice as fast and on a 144Hz one it flung
    // garments off the top of the well. Scaling by dt is not the fix here: the
    // damping is multiplicative (AIR, GFRIC) and the thresholds are magnitudes
    // (SLEEP, the 0.2 homing lerp), so a dt factor changes their meaning and
    // every hand-tuned number in THROWS would need retuning. Stepping a fixed
    // 1/60 the right number of times leaves all of them exactly as authored.
    const STEP = 1000 / 60;
    let acc = 0;
    let prevT = null;

    // NOTE: distinct name from `demoTick` below. Both were called `tick`, and
    // since function declarations hoist, the demo scheduler silently replaced
    // this integrator — `frame` then called the scheduler, got `undefined` back,
    // read that as "nothing active" and stopped the loop on its first frame. The
    // pile never fell. Two functions in one scope may not share a name.
    function stepPhysics() {
      let anyActive = false;
      gs.forEach((g) => {
        const gw = g.offsetWidth, gh = g.offsetHeight;
        if (g._held) { anyActive = true; apply(g); return; }
        if (g._homing) {
          const h = homeXY(g, g._i);
          g._x += (h.x - g._x) * 0.2; g._y += (h.y - g._y) * 0.2;
          if (Math.abs(g._x - h.x) < 0.5 && Math.abs(g._y - h.y) < 0.5) {
            g._homing = false; sleepAt(g, h.x, h.y); wobble(g);
          } else { anyActive = true; apply(g); }
          return;
        }
        if (g._asleep) return;
        anyActive = true;
        g._vy = Math.min(g._vy + GRAV * G.s, VMAX * G.s);
        g._vx *= AIR;
        const prevBottom = g._y + gh;
        g._x += g._vx; g._y += g._vy;
        if (g._y < 0) { g._y = 0; if (g._vy < 0) g._vy = -g._vy * WBOUNCE; }
        if (g._x < 0) { g._x = 0; g._vx = -g._vx * WBOUNCE; }
        else if (g._x > G.W - gw) { g._x = G.W - gw; g._vx = -g._vx * WBOUNCE; }

        const centerX = g._x + gw / 2, newBottom = g._y + gh;
        let landY = null;
        if (g._vy >= 0 && centerX >= G.seatX1 && centerX <= G.seatX2
            && prevBottom <= G.seatY + 1 && newBottom >= G.seatY) {
          landY = G.seatY - gh;                 // caught by the seat
        } else if (newBottom >= G.groundY) {
          landY = G.groundY - gh;               // hit the floor
        }
        if (landY != null) {
          g._y = landY;
          if (Math.abs(g._vy) < SLEEP * G.s) {
            g._vy = 0; g._vx *= GFRIC;
            if (Math.abs(g._vx) < 0.4 * G.s) { g._vx = 0; g._asleep = true; wobble(g); }
          } else { g._vy = -g._vy * GBOUNCE; g._vx *= GFRIC; }
        }
        apply(g);
      });
      return anyActive;
    }

    function frame(t) {
      // The well can be laid out at zero size for a beat (the swap mounts before
      // the board has measured), and a frame without geometry would integrate
      // NaN into every position and never recover.
      if (!G) { running = false; prevT = null; return; }
      if (prevT == null) prevT = t;
      // Clamped: a backgrounded tab hands back a gap of seconds, and without a
      // ceiling the accumulator would replay every one of those steps at once.
      acc += Math.min(100, t - prevT);
      prevT = t;
      let anyActive = false;
      let n = 0;
      while (acc >= STEP && n < 6) { anyActive = stepPhysics() || anyActive; acc -= STEP; n += 1; }
      if (n === 0) anyActive = gs.some((g) => g._held || g._homing || !g._asleep);
      if (anyActive && alive) requestAnimationFrame(frame);
      else { running = false; prevT = null; acc = 0; }
    }

    let running = false, alive = true;
    const ensureRunning = () => {
      if (!running && alive && !document.hidden) {
        running = true; prevT = null; acc = 0;
        requestAnimationFrame(frame);
      }
    };

    /* ---- the demo: throw, throw, throw, tidy, repeat ---- */
    let throwIdx = 0, thrown = 0, tidying = false;
    let topZ = 1;

    function fling(g) {
      const t = THROWS[throwIdx % THROWS.length];
      throwIdx += 1;
      g._asleep = false; g._homing = false;
      g._vx = t.vx * G.s; g._vy = t.vy * G.s;
      g.style.zIndex = ++topZ;
      g.classList.remove('settle');
      ensureRunning();
    }
    function goHome() {
      gs.forEach((g) => { g._homing = true; g._asleep = false; g.style.zIndex = ''; });
      ensureRunning();
    }
    function demoTick() {
      if (!G || document.hidden || !onScreen) return;
      if (gs.some((g) => g._held)) return;     // hands off while someone is playing
      if (tidying) {
        if (gs.every((g) => g._asleep)) { goHome(); tidying = false; thrown = 0; }
        return;
      }
      const g = gs[thrown % gs.length];
      if (!g._asleep) return;                  // let the last throw finish first
      fling(g);
      thrown += 1;
      if (thrown >= THROWS_PER_CYCLE) tidying = true;
    }

    /* ---- optional: it is still a toy, so it answers a finger ---- */
    const offs = [];
    gs.forEach((g, i) => {
      g._i = i;
      let sx = 0, sy = 0, bx = 0, by = 0;
      const down = (e) => {
        g._held = true; g._homing = false; g._asleep = false; g._vx = 0; g._vy = 0;
        g.classList.add('dragging'); g.classList.remove('settle');
        g.style.zIndex = ++topZ;
        sx = e.clientX; sy = e.clientY; bx = g._x; by = g._y;
        try { g.setPointerCapture(e.pointerId); } catch { /* no capture */ }
        e.preventDefault(); e.stopPropagation();
        ensureRunning();
      };
      const move = (e) => {
        if (!g._held) return;
        let x = bx + (e.clientX - sx), y = by + (e.clientY - sy);
        x = Math.max(0, Math.min(x, G.W - g.offsetWidth));
        y = Math.max(0, Math.min(y, G.H - g.offsetHeight));
        g._vx = 0.5 * g._vx + 0.5 * (x - g._x);
        g._vy = 0.5 * g._vy + 0.5 * (y - g._y);
        g._x = x; g._y = y; apply(g);
      };
      const up = (e) => {
        if (!g._held) return;
        g._held = false;
        g.classList.remove('dragging');
        g._vx = Math.max(-VMAX * G.s, Math.min(VMAX * G.s, g._vx));
        g._vy = Math.max(-VMAX * G.s, Math.min(VMAX * G.s, g._vy));
        e.stopPropagation();
        ensureRunning();
      };
      g.addEventListener('pointerdown', down);
      g.addEventListener('pointermove', move);
      g.addEventListener('pointerup', up);
      g.addEventListener('pointercancel', up);
      offs.push(() => {
        g.removeEventListener('pointerdown', down);
        g.removeEventListener('pointermove', move);
        g.removeEventListener('pointerup', up);
        g.removeEventListener('pointercancel', up);
      });
    });

    /* ---- start ---- */
    let onScreen = true;
    // Asleep at the origin until geometry exists, so nothing is ever simulated
    // from an undefined position.
    gs.forEach((g) => { g._x = 0; g._y = 0; g._vx = 0; g._vy = 0; g._asleep = true; });
    const place = () => {
      if (!computeGeom()) return;
      gs.forEach((g, i) => { const h = homeXY(g, i); sleepAt(g, h.x, h.y); });
    };
    place();

    const ro = new ResizeObserver(() => {
      if (!computeGeom()) return;
      gs.forEach((g, i) => {
        if (g._asleep && !g._held) { const h = homeXY(g, i); sleepAt(g, h.x, h.y); }
      });
    });
    ro.observe(stage);

    const io = new IntersectionObserver((es) => { onScreen = es[0].isIntersecting; }, { threshold: 0.05 });
    io.observe(stage);

    // Under reduced motion the pile simply sits on the chair. Nothing is thrown,
    // nothing loops, and dragging still works if you want to move one yourself.
    const timer = reduce ? null : setInterval(demoTick, TICK_MS);
    const onVis = () => { if (!document.hidden) ensureRunning(); };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      alive = false;
      if (timer) clearInterval(timer);
      ro.disconnect(); io.disconnect();
      offs.forEach((f) => f());
      document.removeEventListener('visibilitychange', onVis);
      stage.innerHTML = '';
    };
  }, [reduce]);

  return <div className="dd-pile" ref={hostRef} aria-hidden="true" />;
}
