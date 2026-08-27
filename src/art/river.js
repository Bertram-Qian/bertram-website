/* river.js — the river Bertram's ducks live in.
 *
 * The app's onsen is a round pond authored in a 380×600 portrait art space. A
 * river is the same stones and the same water, re-laid as a band that runs off
 * both edges of the page. Nothing here is new art: every boulder is a verbatim
 * `rock3()` triple out of ddkit.js, every tuft is `mossTuft()`, the lantern and
 * the bucket are the kit's.
 *
 * Three ideas carry the whole file.
 *
 * 1. THE ART SPACE SCALES LIKE A RIVER, NOT LIKE A PHOTO. The old pond locked
 *    aspect-ratio to a fixed viewBox, so a wider window made the whole scene
 *    bigger. Here the px-per-art-unit scale is pinned to the band's HEIGHT and
 *    the art width falls out of the measured width — so a wider window gets
 *    MORE RIVER at the same stone size, which is what a river does.
 *
 * 2. THE TWO BANK CURVES ARE THE ONLY SOURCE OF TRUTH. `topEdge` and `botEdge`
 *    are plain functions of x. The water path is sampled from them, every
 *    boulder is anchored to them, and useRiver clamps the ducks against them,
 *    so the water, the stone and the swimming can never disagree.
 *
 * 3. THE BANK IS PLACED PER BOULDER, NOT PER RUN. The pond emitted the whole
 *    authored set three times at fixed offsets (its BACK_RUNS matrices). That
 *    works for a straight bank and reads as a repeat on a curved one. Here each
 *    boulder is re-anchored onto the curve individually, from a seeded shuffle,
 *    so the bank follows the meander with no readable period — and because the
 *    steps are far shorter than the silhouettes, the boulders overlap into
 *    continuous rubble rather than a row of beads.
 *
 * Mirroring stays safe for the same reason it was safe in the pond: rock3()
 * stacks its planes vertically, so the lit plane is the top face and a
 * horizontal flip never inverts the light.
 */

import { SPA_DAY, BACK_ROCKS, rock3, mossTuft, lantern, bucket } from './ddkit.js';

/* ------------------------------------------------------------- profiles -- */

// Band height in art units. Fixed for both layouts — only the px height (and
// therefore the scale, and therefore the river's LENGTH) changes.
export const H_ART = 300;

// hPx: [min, fraction of width, max] — how tall the band renders.
// The max is what makes a 2560px monitor get a longer river rather than a
// taller one; the min stops a 780px laptop from getting a letterbox slot.
//
// The phone keeps a proportionally WIDER channel and thinner banks: the duck
// has to stay a thumb-sized target in a much smaller frame, so the water gets
// the room and the stone gives it up.
const PROFILES = {
  wide: {
    hPx: [268, 0.28, 392],
    // The water sits low in the band on purpose. Everything above topEdge has
    // to hold a bank of stone AND a lantern standing on it, and a lantern is
    // 61 units tall before it is scaled.
    top: 106, bot: 236, amp: 14, per: 195, dTop: 3.0, dBot: 3.5,
    duckScale: 1.55,
    seed: 0x5eed17,
    rock: {
      far: { w: [110, 240], h: [42, 70] },
      near: { w: [115, 250], h: [46, 78] },
      loose: { w: [60, 130], h: [30, 50] },
    },
    scatterEvery: [340, 560],
    padBase: 67,
    lanternEvery: 760, lanternScale: 0.95,
    bucketEvery: 900, bucketScale: 0.82,
  },
  phone: {
    hPx: [200, 0.56, 284],
    top: 84, bot: 242, amp: 11, per: 150, dTop: 2.6, dBot: 3.0,
    duckScale: 2.05,
    seed: 0x0d0cc5,
    rock: {
      far: { w: [80, 175], h: [32, 54] },
      near: { w: [84, 182], h: [36, 60] },
      loose: { w: [46, 100], h: [24, 40] },
    },
    scatterEvery: [260, 420],
    padBase: 88,
    lanternEvery: 500, lanternScale: 0.70,
    bucketEvery: 560, bucketScale: 0.60,
  },
};

// A lantern is 61 units from its foot to its finial. Nothing in the scene may
// stick out of the top of the frame, so its foot is pushed down whenever the
// bank it stands on is too high to hold it. Higher up the bank reads as further
// away, so the clamp costs nothing.
const LANTERN_H = 61;
const SKY_MARGIN = 14;

// How far along a boulder the next one starts, as a fraction of the width just
// drawn. This is the spacing the bank WANTS; bankRun clamps it against what the
// pair can actually bridge, so a wide stone followed by a narrow one still
// meets it — which is what lets the spacing be this loose without ever opening
// a hole. Near 0.9 the stones sit shoulder to shoulder rather than piled two or
// three deep, and the bank needs a third as many of them.
const LAP = [0.80, 0.92];

// Roughly a quarter of the bank is anchor boulders, the rest is smaller stuff
// filling in around them. A uniform draw over the same range gives every
// silhouette the same size and the bank reads as a braided rope; this is what
// makes it read as rubble.
const BIG_CHANCE = 0.24;
const pickSize = (rnd) => (rnd() < BIG_CHANCE ? 0.72 + rnd() * 0.28 : rnd() * 0.55);

/**
 * The two bank lines, for a layout.
 *
 * Both edges share the SLOW term, so the channel meanders at a near-constant
 * width instead of bulging and pinching — a pinching channel reads as a lake
 * with a neck, not as a river. The small detail terms differ, so the two banks
 * are never quite parallel either.
 */
function edgesFor(layout) {
  const P = PROFILES[layout] || PROFILES.wide;
  const topEdge = (x) => P.top + P.amp * Math.sin(x / P.per + 0.6) + P.dTop * Math.sin(x / 63 + 2.1);
  const botEdge = (x) => P.bot + P.amp * Math.sin(x / P.per + 0.95) + P.dBot * Math.sin(x / 58 - 1.2);
  return { topEdge, botEdge };
}

/* ------------------------------------------------------------- plumbing -- */

const clamp = (lo, v, hi) => Math.max(lo, Math.min(hi, v));
const f1 = (n) => n.toFixed(1);

// mulberry32 — a seeded PRNG, so a rebuild at a new width lays the SAME bank.
// Without this, every resize would reshuffle every stone on the page.
function mulberry32(a) {
  return function rnd() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------- the boulders -- */

/**
 * THREE of the kit's rocks, used verbatim.
 *
 * Every rock array in the kit was authored as the rim of a pond, and five of
 * its eight bank stones are sliced flat by the pond's own edge — BACK_ROCKS[0]
 * opens on `M 0,340`, BACK_ROCKS[4] runs dead vertical down x=380, FRONT_ROCKS
 * 0 and 2 do the same at each end. Scattered along a river those cuts read as
 * exactly what they are.
 *
 * The other three are whole boulders with no cut edge anywhere, and they are
 * the onsen's own silhouettes: nothing generated from a profile function has
 * come as close, across several attempts, as simply using them. Variation comes
 * from where they are put and how they are scaled, which is what the pond did
 * too — three runs at uneven offsets, one of them flipped.
 */
const POOL = [BACK_ROCKS[1], BACK_ROCKS[2], BACK_ROCKS[3]].map((t) => ({
  paths: t,
  box: pathBox(t[0]),          // [0] is the full dark silhouette
}));

// Every path in the kit is M/C/L/Q with ABSOLUTE coordinates, so its numbers
// are exactly alternating x,y pairs and a pair scan is an exact bounding box.
function pathBox(d) {
  const n = d.match(/-?\d*\.?\d+/g).map(Number);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i + 1 < n.length; i += 2) {
    const x = n[i], y = n[i + 1];
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1 };
}

/** Re-anchor and re-proportion a boulder so its base (or top) lands on (x, y). */
function rockTf(box, x, y, sx, sy, flip, anchor) {
  const cx = (box.x0 + box.x1) / 2;
  const ay = anchor === 'top' ? box.y0 : box.y1;
  return `translate(${f1(x)},${f1(y)}) scale(${(flip ? -sx : sx).toFixed(3)},${sy.toFixed(3)}) ` +
    `translate(${f1(-cx)},${f1(-ay)})`;
}

/**
 * A run of boulders walked along one bank line.
 *
 * Each boulder starts part-way along the last one, so the run always overlaps
 * itself. That overlap IS the bank — it is what turns eight authored shapes
 * into a shoreline with no visible period and no holes.
 *
 * The scale is NON-UNIFORM, and deliberately so: normalising every silhouette
 * to a target width AND height is what lets one cast of stones make a bank of
 * any proportion. The pond already stretched its runs this way
 * (`matrix(1,0,0,1.08,…)`), and it is safe for the same reason mirroring is —
 * rock3 stacks its planes vertically and fills them, so nothing about the light
 * or a stroke width can distort.
 */
function bankRun(rnd, edge, { x0, x1, dy, anchor, size }) {
  const draw = () => {
    const st = POOL[(rnd() * POOL.length) | 0];
    const b = st.box;
    // Height is drawn INDEPENDENTLY of width. The kit lets width carry nearly
    // all its variation (CV 48%) while height stays near constant (CV 18%);
    // tying the two together forced every stone to the same proportions and
    // made a narrow stone short as well, so no chunky upright stone could ever
    // come out of the shuffle at all.
    const u = pickSize(rnd);
    const w = size.w[0] + u * (size.w[1] - size.w[0]);
    const h = size.h[0] + rnd() * (size.h[1] - size.h[0]);
    return {
      w, h, flip: rnd() < 0.5, slop: rnd(),
      paths: st.paths,
      box: b,
      sx: w / (b.x1 - b.x0),
      sy: h / (b.y1 - b.y0),
    };
  };

  const out = [];
  let cur = draw();
  let x = x0;
  for (let guard = 0; x < x1 && guard < 3000; guard++) {
    const next = draw();
    out.push({
      paths: cur.paths, box: cur.box, x, anchor,
      sx: cur.sx, sy: cur.sy, flip: cur.flip,
      // A few units of slop on the bank line, so some stones sit deeper than
      // others rather than every base landing on one seam. Strictly ONE-SIDED:
      // a base pushed further into the water only ever adds cover, where one
      // lifted out of it opens a notch the water shows through. The near bank
      // gets twice the amplitude, because its anchor IS its silhouette — with a
      // tight band there the waterline comes out a dead-straight line.
      y: edge(x) + dy + cur.slop * (anchor === 'top' ? -14 : 7),
    });
    // LAP is the spacing we WANT; the bridge is the spacing the pair can still
    // reach across. Taking the smaller means a wide stone followed by a narrow
    // one can never open a hole, whatever the shuffle hands back — which in
    // turn lets LAP be loose enough that the bank reads as separate stones
    // rather than as one continuous mass.
    const bridge = (cur.w + next.w) * 0.47;
    x += Math.min(bridge, cur.w * (LAP[0] + rnd() * (LAP[1] - LAP[0])));
    cur = next;
  }
  return out;
}

const drawRun = (run) =>
  run.map((r) => `<g transform="${rockTf(r.box, r.x, r.y, r.sx, r.sy, r.flip, r.anchor)}">${rock3(r.paths)}</g>`).join('');

// Shadows are derived from the rocks rather than drawn by hand — the pond's own
// rule, kept. Take each boulder's dark silhouette, nudge it toward
// the water, and draw the lot UNDER the rocks: only the part that pokes out is
// ever visible, which is what a cast shadow is, and it can never drift out of
// register with the thing casting it.
const drawShadows = (run, dy, op) =>
  `<g fill="#1E2830" fill-opacity="${op}">` +
  run.map((r) => `<path transform="${rockTf(r.box, r.x, r.y + dy, r.sx, r.sy, r.flip, r.anchor)}" d="${r.paths[0]}"/>`).join('') +
  '</g>';

/* ---------------------------------------------------------------- water -- */

// Catmull-Rom through every point, emitted as cubics. Two reasons it is worth
// the extra six lines over midpoint smoothing: the curve passes through the
// sample points exactly, so the water's edge and the boulders anchored to it
// agree to the pixel; and there is no straight final segment, which on a
// boulder's own outline would read as a stone with a flat cut in it.
// `closed` wraps the neighbour indices instead of clamping them, which makes the
// join at the start point tangent-continuous. On a boulder that is the whole
// difference between an outline that turns smoothly around its end and one that
// meets itself in a corner.
function smooth(pts, closed) {
  const n = pts.length;
  let d = `M ${f1(pts[0][0])},${f1(pts[0][1])}`;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = pts[closed ? (i - 1 + n) % n : (i > 0 ? i - 1 : 0)];
    const p1 = pts[i];
    const p2 = pts[closed ? (i + 1) % n : i + 1];
    const p3 = pts[closed ? (i + 2) % n : (i + 2 < n ? i + 2 : n - 1)];
    d += ` C ${f1(p1[0] + (p2[0] - p0[0]) / 6)},${f1(p1[1] + (p2[1] - p0[1]) / 6)}` +
      ` ${f1(p2[0] - (p3[0] - p1[0]) / 6)},${f1(p2[1] - (p3[1] - p1[1]) / 6)}` +
      ` ${f1(p2[0])},${f1(p2[1])}`;
  }
  return closed ? `${d} Z` : d;
}

/** A filled band between two curves, sampled and closed. */
function band(topFn, botFn, x0, x1, fill) {
  const a = [], b = [];
  for (let x = x0; x <= x1 + 0.001; x += 16) {
    a.push([x, topFn(x)]);
    b.push([x, botFn(x)]);
  }
  b.reverse();
  return `<path d="${smooth(a)} ${smooth(b).replace(/^M/, 'L')} Z" fill="${fill}"/>`;
}

const waterPath = (topEdge, botEdge, x0, x1) =>
  band(topEdge, botEdge, x0, x1, SPA_DAY.water);


/* ------------------------------------------------------------- dressing -- */

// The pond's glints, re-scattered along a channel that moves. Kept exactly as
// authored — a flat arc bowing up three units in the wave ink.
//
// Both of these are drawn straight after the water and BEFORE the stone, so a
// mark that drifts far enough downstream to reach a bank passes behind it
// rather than skating across it.
// Every surface mark gets its own DURATION as well as its own delay. Sharing a
// duration is what makes a scattered field still read as one pulse: the delays
// span exactly one period, so the whole surface repeats itself on that period
// and the eye finds the beat. Detuning the durations means there is no shared
// period left to find.
const beat = (rnd, lo, hi) =>
  `animation-delay:${(rnd() * hi).toFixed(1)}s;animation-duration:${(lo + rnd() * (hi - lo)).toFixed(1)}s`;

function glints(rnd, topEdge, botEdge, x0, x1) {
  let s = '';
  for (let x = x0 + 40; x < x1; x += 66 + rnd() * 56) {
    const y = topEdge(x) + 30 + rnd() * (botEdge(x) - topEdge(x) - 60);
    const w = 22 + rnd() * 16;
    s += `<path class="dd-glint" style="${beat(rnd, 7, 13)}" ` +
      `d="M ${f1(x)},${f1(y)} q ${f1(w / 2)},-3 ${f1(w)},0" fill="none" stroke="#D2DCDB" ` +
      'stroke-width="1.2" stroke-linecap="round" opacity="0"/>';
  }
  return s;
}

// The one thing that says RIVER rather than pond: the same glint arc, but
// carried a long way downstream instead of shimmering in place. Held to a 0.3
// ceiling — dilly&dally never lets water motion be louder than a hint (its own
// ceilings are 0.16 for a wake and 0.15 for steam).
function flow(rnd, topEdge, botEdge, x0, x1) {
  let s = '';
  for (let x = x0; x < x1; x += 92 + rnd() * 82) {
    const y = topEdge(x) + 28 + rnd() * (botEdge(x) - topEdge(x) - 56);
    const w = 26 + rnd() * 22;
    s += `<path class="dd-flow" style="${beat(rnd, 11, 19)}" ` +
      `d="M ${f1(x)},${f1(y)} q ${f1(w / 2)},-2.6 ${f1(w)},0" fill="none" stroke="#D2DCDB" ` +
      'stroke-width="1.1" stroke-linecap="round" opacity="0"/>';
  }
  return s;
}

// The washtub's wave, the brand's own water glyph, scattered across the
// channel: a multi-crest stroke rather than the glints' single flat arc. Two or
// three crests each, and the slowest of the three surface layers, so the water
// reads as running rather than as a sheet with a few sparkles on it. Still
// under the house ceiling — the loudest crest never passes 0.24.
function waves(rnd, topEdge, botEdge, x0, x1) {
  let s = '';
  for (let x = x0; x < x1; x += 74 + rnd() * 66) {
    const span = botEdge(x) - topEdge(x);
    const n = 2 + ((rnd() * 3) | 0);              // crests along one line
    const w = 11 + rnd() * 6;                     // half a crest
    const a = 1.8 + rnd() * 1.4;                  // crest height
    // Two or three lines per batch, stacked a few units apart and offset along
    // the flow, so a disturbance reads as a set of waves rather than a stray
    // scratch. Each line keeps its own beat, so the batch never blinks as one.
    const lines = 2 + ((rnd() * 2) | 0);
    const top = topEdge(x) + 24 + rnd() * (span - 48 - lines * 7);
    for (let l = 0; l < lines; l++) {
      const lx = x + (rnd() * 2 - 1) * 9;
      const ly = top + l * (6 + rnd() * 3);
      const la = a * (1 - l * 0.16);
      let d = `M ${f1(lx)},${f1(ly)}`;
      for (let i = 0; i < n; i++) {
        d += ` c ${f1(w * 0.34)},${f1(-la)} ${f1(w * 0.66)},${f1(-la)} ${f1(w)},0` +
          ` c ${f1(w * 0.34)},${f1(la)} ${f1(w * 0.66)},${f1(la)} ${f1(w)},0`;
      }
      s += `<path class="dd-wave" style="${beat(rnd, 14, 24)}" ` +
        `d="${d}" fill="none" stroke="#D2DCDB" stroke-width="${(1 - l * 0.12).toFixed(2)}" ` +
        'stroke-linecap="round" opacity="0"/>';
    }
  }
  return s;
}

// Where the crown of a placed stone is. Everything that stands on the bank —
// moss, a lantern, a bucket — is positioned off THIS rather than off the bank
// curve, and that is the whole fix for the dressing. A tuft at a fixed offset
// from the water line lands wherever the curve happens to be, which with stones
// this large meant tufts sitting in the notches BETWEEN boulders, floating on
// nothing. Read off the stone instead and moss can only ever grow on rock.
function crown(r) {
  const h = (r.box.y1 - r.box.y0) * r.sy;
  return { x: r.x, y: r.anchor === 'top' ? r.y : r.y - h, w: (r.box.x1 - r.box.x0) * r.sx, h };
}

// Tufts on the stones of a run. `u` walks out from the centre and the tuft
// sinks as it goes, following the dome down, so a tuft near the shoulder still
// sits on the stone rather than hovering off its edge.
function mossOn(rnd, run, chance, sMin, sMax) {
  let s = '';
  for (const r of run) {
    if (rnd() > chance) continue;
    const c = crown(r);
    for (let i = 0, n = rnd() < 0.34 ? 2 : 1; i < n; i++) {
      const u = (rnd() - 0.5) * 0.62;
      s += mossTuft([
        +f1(c.x + u * c.w),
        +f1(c.y + c.h * (0.06 + 1.7 * u * u)),
        +(sMin + rnd() * (sMax - sMin)).toFixed(2),
      ]);
    }
  }
  return s;
}

// Loose stones lying on the bank behind the waterline row, far enough apart to
// read as scatter rather than as a second course of masonry. Returns placements
// in the same shape a bankRun does, so the dressing can stand on these too.
function looseRun(rnd, edge, { x0, x1, dy, step, size }) {
  const out = [];
  for (let x = x0; x < x1; x += step[0] + rnd() * (step[1] - step[0])) {
    const sh = POOL[(rnd() * POOL.length) | 0];
    const b = sh.box;
    const w = size.w[0] + rnd() * (size.w[1] - size.w[0]);
    const h = size.h[0] + rnd() * (size.h[1] - size.h[0]);
    out.push({
      paths: sh.paths, box: b, x, anchor: 'bottom', flip: rnd() < 0.5,
      sx: w / (b.x1 - b.x0), sy: h / (b.y1 - b.y0),
      y: edge(x) + dy[0] + rnd() * (dy[1] - dy[0]),
    });
  }
  return out;
}

// Pick stones along a run to stand something on, spaced by distance rather than
// by count so the spacing holds at any river length.
function seats(rnd, run, everyX, start) {
  const out = [];
  let nextX = start;
  for (const r of run) {
    if (r.x < nextX) continue;
    out.push(crown(r));
    nextX = r.x + everyX * (0.8 + rnd() * 0.6);
  }
  return out;
}

/* -------------------------------------------------------------- builder -- */

/**
 * Build the river for a measured stage width.
 *
 * @param {number} width   the stage's width in CSS px
 * @param {'wide'|'phone'} layout
 * @returns everything the overlay and the physics need, already in final scene
 *          coordinates. The scene renders preserveAspectRatio="xMidYMid meet"
 *          into a container whose aspect-ratio is `artW / H_ART`, which keeps
 *          viewBox → container a pure linear map:  left% = x / artW * 100.
 */
export function buildRiver(width, layout = 'wide') {
  const P = PROFILES[layout] || PROFILES.wide;
  const W = Math.max(320, width || 1200);

  const hPx = clamp(P.hPx[0], W * P.hPx[1], P.hPx[2]);
  const scale = hPx / H_ART;                 // px per art unit — held constant
  const artW = W / scale;                    // …so the river only gets LONGER

  const { topEdge, botEdge } = edgesFor(layout);
  const rnd = mulberry32(P.seed);

  // Everything is laid past both edges, so a boulder overhanging the frame is
  // cropped by it rather than stopping short of it.
  const M = 130;
  const x0 = -M, x1 = artW + M;

  // Each bank is GROUND with stones lying along its water's edge, not a curtain
  // of stones with nothing behind them. That is the change that lets the stone
  // itself be sparse: a gap between two boulders shows more bank, where before
  // it showed a wedge of sky poking down into the shoreline.
  //
  // The two ground edges get their own lumps, on wavelengths that share no
  // factor with the channel's, so the horizon never traces the waterline.
  // ONE RUN PER BANK, the way the pond had it. Four runs was the real reason the
  // bank read as too much stone: no stone size makes a scene calm if it is drawn
  // four deep. A single course of big boulders per shore is a quarter of the
  // count, and the gaps between crests become the horizon rather than something
  // that has to be filled in behind.
  //
  // The far run sits 14 units into the water. A bottom-anchored stone touches
  // its anchor line at its NARROWEST — the kit's own boulders are 58% of their
  // width down there — so at this spacing the waterline would open a wedge
  // between every pair. Sinking it means the water crosses each stone near its
  // widest, where the step still overlaps. The near run needs none of that: it
  // is top-anchored, so its stones spread downward from their crests and the
  // only gap they can open is the shallow notch that IS the silhouette.
  const far = bankRun(rnd, topEdge, { x0, x1, dy: 14, anchor: 'bottom', size: P.rock.far });
  const near = bankRun(rnd, botEdge, { x0, x1, dy: -12, anchor: 'top', size: P.rock.near });

  // The scene is emitted as TWO layers, so the drifting lilypads can be slotted
  // between them: water at the bottom, then the pads, then every piece of stone.
  // A pad is a leaf on the surface — it belongs under the bank it floats past,
  // and as one overlay above everything it sat on top of the rocks instead.
  let water = '';
  let s = '';

  // Draw order is the kit's, and it is the whole trick:
  // water → surface → far shadows → far stone → lanterns → moss →
  // near lip → near stone → loose stone → moss → buckets.
  //
  // Everything that STANDS on the bank now comes after all of the stone, and is
  // seated on a specific boulder rather than at an offset from the water line.
  // Drawn any earlier and the run buries it — which is exactly what had happened
  // to the bucket, sitting at the same depth as the loose stones drawn over it.
  //
  // There is no sky rect. SPA_DAY.sky is #FAFAF8, which is --offwhite, which is
  // already the page — painting it would look identical and would hide the
  // stall's posts where the band is pulled up over them.
  water += waterPath(topEdge, botEdge, x0, x1);
  water += waves(rnd, topEdge, botEdge, x0, x1);
  water += glints(rnd, topEdge, botEdge, x0, x1);
  water += flow(rnd, topEdge, botEdge, x0, x1);

  // The front run's own silhouettes, nudged down onto the bank behind them. This
  // is the only separation the house rules allow between two stones of the same
  // three tones, and it costs no new colour.
  s += drawShadows(far, 6, 0.17);
  s += drawRun(far);

  // A lantern stands ON a boulder of the far run, and is drawn after it — with
  // one course per bank there is nothing left to bury its foot, so drawing it
  // first only meant the stone it stands on covered it. Its own cast ellipse
  // does the seating. The floor keeps the whole 61-unit lantern inside the frame
  // wherever the bank happens to run high.
  const lFloor = SKY_MARGIN + LANTERN_H * P.lanternScale;
  for (const c of seats(rnd, far, P.lanternEvery, 140 + rnd() * 200)) {
    s += lantern(+f1(c.x), +f1(Math.max(c.y + 3, lFloor)), P.lanternScale);
  }
  s += mossOn(rnd, far, 0.5, 0.75, 1.15);

  // The near bank throws its shadow AWAY from you, so it gets a soft dark lip
  // on the water side instead of a cast shadow — the water really is deeper
  // where it meets the stone, and the lip buries the seams between the runs.
  s += drawShadows(near, -7, 0.13);
  s += drawRun(near);

  const loose = looseRun(rnd, botEdge, {
    x0, x1, dy: [26, 50], step: P.scatterEvery, size: P.rock.loose,
  });
  s += drawRun(loose);
  s += mossOn(rnd, near, 0.5, 0.75, 1.15);
  s += mossOn(rnd, loose, 0.42, 0.7, 1.05);

  // Last of everything, standing on a loose stone rather than sunk into the bank
  // at a fixed depth. A bucket left out on the rocks is a thing; a bucket with a
  // boulder drawn through it is a bug.
  for (const c of seats(rnd, loose, P.bucketEvery, 220 + rnd() * 260)) {
    s += bucket(+f1(c.x), +f1(c.y + 2 - 12 * P.bucketScale), P.bucketScale);
  }

  const layer = (inner) =>
    `<svg class="dd-scene" viewBox="0 0 ${f1(artW)} ${H_ART}" preserveAspectRatio="xMidYMid meet" ` +
    `xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${inner}</svg>`;

  const spriteW = 32 * P.duckScale;

  return {
    svgWater: layer(water),
    svgBank: layer(s),
    layout,
    hPx,
    scale,
    artW,
    viewBox: { x: 0, y: 0, w: artW, h: H_ART },
    topEdge,
    botEdge,
    duckScale: P.duckScale,
    // The pond's ratio, kept: a collision radius of 0.54 × the sprite's width.
    // It doubles as the bank inset, and at this sprite size that puts the top
    // of the duck a unit shy of the stone at the very edge of its lane.
    duckR: spriteW * 0.54,
    spriteW,
    padW: P.padBase,
  };
}

/** Which composition a viewport gets. Kept here so the breakpoint has one home. */
export const PHONE_QUERY = '(max-width: 760px)';
